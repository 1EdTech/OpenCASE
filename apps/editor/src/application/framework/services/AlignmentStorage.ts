import type { CFAssociation } from '@/domain/case/types'
import type { Framework } from '@/domain/framework/model/types'
import {
  alignmentFrameworkSourceId,
  alignmentFrameworkTargetId,
  buildAlignmentFrameworkPackage,
  mergeAssociations,
  remapAlignmentFramework,
  type AlignmentFrameworkExtensions,
  type AlignmentFrameworkPackage,
} from '@/domain/framework/alignmentFrameworks'
import {
  externalAlignmentsOf,
  groupExternalAlignments,
  hostedLookupCandidates,
  type HostedDocumentRef,
} from '@/domain/framework/externalAlignments'

/** What saving a framework with its alignment storage needs from the server. */
export type AlignmentStoragePort = {
  listAlignmentFrameworks(participantId: string): Promise<Array<{ sourcedId: string; extensions?: Record<string, unknown> }>>
  getCfPackage(docId: string): Promise<{ CFDocument: { extensions?: Record<string, unknown> }; CFAssociations?: CFAssociation[] }>
  saveCfPackage(cfPackage: unknown): Promise<unknown>
  deleteCfPackage(docId: string): Promise<void>
  lookupItemDocuments(identifiers: string[]): Promise<Record<string, HostedDocumentRef>>
  newIdentifier(): string
  now(): string
}

type FrameworkPackage = { CFAssociations?: unknown[] }
type SaveResult = { docId: string; forkedIdentifiers?: Record<string, string> }
type StoredPackage = Awaited<ReturnType<AlignmentStoragePort['getCfPackage']>>

/**
 * What saving a framework will do to bring its associations to hosted
 * frameworks in line with its `alignmentStorage` setting — worked out without
 * changing anything, so the author can be told before it happens.
 */
export type AlignmentStoragePlan =
  | { kind: 'none' }
  | {
    kind: 'toAlignmentFrameworks'
    /** Inline associations leaving the framework. */
    movedIds: Set<string>
    /** The alignment frameworks they go into, as they'll be saved. */
    alignmentFrameworks: AlignmentFrameworkPackage[]
  }
  | {
    kind: 'toInline'
    /** The alignment frameworks the associations come from, as stored. */
    alignmentFrameworks: Array<{ docId: string; pkg: StoredPackage }>
  }

/** How many associations a plan moves. */
export function alignmentMoveCount(plan: AlignmentStoragePlan): number {
  switch (plan.kind) {
    case 'none': return 0
    case 'toAlignmentFrameworks': return plan.movedIds.size
    case 'toInline': return plan.alignmentFrameworks.reduce((n, { pkg }) => n + (pkg.CFAssociations?.length ?? 0), 0)
  }
}

/**
 * Which associations to hosted frameworks need to move for the framework's
 * storage setting: inline ones into the alignment frameworks it owns (one per
 * target framework), or the other way. Associations to remote frameworks
 * always stay inline — without the target framework on this server there's
 * no alignment framework to put them in. Self alignments aren't associations
 * to another framework, so they stay where they are.
 */
export async function planAlignmentStorage(params: {
  framework: Framework
  cfPackage: FrameworkPackage
  port: AlignmentStoragePort
}): Promise<AlignmentStoragePlan> {
  const { framework, cfPackage, port } = params
  const sourceId = String(framework.id)
  const owned = await ownedAlignmentFrameworks(port, sourceId)

  if ((framework.metadata.alignmentStorage ?? 'inline') === 'alignmentFramework') {
    const alignments = externalAlignmentsOf(framework)
    const candidates = hostedLookupCandidates(alignments)
    const hostedDocuments = candidates.length > 0 ? await port.lookupItemDocuments(candidates) : {}
    const hostedTargets = groupExternalAlignments(alignments, hostedDocuments).filter((t) => t.kind === 'hosted')
    if (hostedTargets.length === 0) return { kind: 'none' }

    const byId = new Map(((cfPackage.CFAssociations ?? []) as CFAssociation[]).map((a) => [a.identifier, a]))
    const alignmentFrameworks = await Promise.all(hostedTargets.map(async (target) => {
      const existing = owned.find((o) => o.targetId === target.id)
      const stored = existing ? (await port.getCfPackage(existing.docId)).CFAssociations ?? [] : []
      return buildAlignmentFrameworkPackage({
        identifier: existing?.docId ?? port.newIdentifier(),
        source: { identifier: sourceId, title: framework.metadata.title ?? sourceId },
        target: { identifier: target.id, title: target.title },
        creator: framework.metadata.creator ?? 'OpenCASE',
        associations: mergeAssociations(stored, target.alignments.flatMap((a) => byId.get(a.id) ?? [])),
        now: port.now(),
      })
    }))
    return {
      kind: 'toAlignmentFrameworks',
      movedIds: new Set(hostedTargets.flatMap((t) => t.alignments.map((a) => a.id))),
      alignmentFrameworks,
    }
  }

  const toOtherFrameworks = owned.filter((o) => o.targetId !== sourceId)
  if (toOtherFrameworks.length === 0) return { kind: 'none' }
  return {
    kind: 'toInline',
    alignmentFrameworks: await Promise.all(toOtherFrameworks.map(async ({ docId }) => ({ docId, pkg: await port.getCfPackage(docId) }))),
  }
}

/**
 * Saves a framework, carrying out `plan` (worked out here when not given).
 *
 * The server won't let an association be in two frameworks at once, so
 * associations leave where they are before they're written where they go:
 *  - Into alignment frameworks: the framework is saved without them first. If
 *    writing an alignment framework then fails, the caller still has them, so
 *    saving again finishes the move.
 *  - Into the framework: its alignment frameworks are deleted first, and put
 *    back if the framework then fails to save.
 *
 * When the save forks the framework, the alignment frameworks it owns follow
 * it to its new identifiers.
 *
 * `moved` is true when associations changed place, so the caller should
 * reload what it shows.
 */
export async function saveWithAlignmentStorage<P extends FrameworkPackage, R extends SaveResult>(params: {
  framework: Framework
  cfPackage: P
  saveFramework: (cfPackage: P) => Promise<R>
  port: AlignmentStoragePort
  plan?: AlignmentStoragePlan
}): Promise<{ result: R; moved: boolean }> {
  const { framework, cfPackage, saveFramework, port } = params
  const sourceId = String(framework.id)
  const plan = params.plan ?? await planAlignmentStorage({ framework, cfPackage, port })
  const inline = (cfPackage.CFAssociations ?? []) as CFAssociation[]

  if (plan.kind === 'toAlignmentFrameworks') {
    const result = await saveFramework({ ...cfPackage, CFAssociations: inline.filter((a) => !plan.movedIds.has(a.identifier)) })
    for (const pkg of plan.alignmentFrameworks) {
      await port.saveCfPackage(result.forkedIdentifiers ? remapAlignmentFramework(pkg, result.forkedIdentifiers) ?? pkg : pkg)
    }
    await followFork(port, sourceId, result)
    return { result, moved: true }
  }

  if (plan.kind === 'toInline') {
    for (const { docId } of plan.alignmentFrameworks) await port.deleteCfPackage(docId)
    let result: R
    try {
      result = await saveFramework({
        ...cfPackage,
        CFAssociations: mergeAssociations(inline, plan.alignmentFrameworks.flatMap(({ pkg }) => pkg.CFAssociations ?? [])),
      })
    } catch (err) {
      for (const { pkg } of plan.alignmentFrameworks) await port.saveCfPackage(pkg)
      throw err
    }
    await followFork(port, sourceId, result)
    return { result, moved: true }
  }

  const result = await saveFramework(cfPackage)
  await followFork(port, sourceId, result)
  return { result, moved: false }
}

/** After a fork, the alignment frameworks still pointing at the framework's old identifiers are updated to its new ones. */
async function followFork(port: AlignmentStoragePort, oldSourceId: string, result: SaveResult): Promise<void> {
  const { forkedIdentifiers } = result
  if (!forkedIdentifiers) return
  for (const { docId } of await ownedAlignmentFrameworks(port, oldSourceId)) {
    const remapped = remapAlignmentFramework(await port.getCfPackage(docId), forkedIdentifiers)
    if (remapped) await port.saveCfPackage(remapped)
  }
}

async function ownedAlignmentFrameworks(port: AlignmentStoragePort, sourceId: string): Promise<Array<{ docId: string; targetId: string }>> {
  const docs = await port.listAlignmentFrameworks(sourceId)
  return docs.flatMap((doc) => {
    const ext = doc.extensions?.['ext:opencase'] as AlignmentFrameworkExtensions | undefined
    const targetId = alignmentFrameworkTargetId(ext)
    return alignmentFrameworkSourceId(ext) === sourceId && targetId ? [{ docId: doc.sourcedId, targetId }] : []
  })
}
