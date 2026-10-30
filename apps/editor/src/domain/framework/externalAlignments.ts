import type { Framework } from '@/domain/framework/model/types'

/**
 * A non-hierarchical association stored in this framework's own CFPackage
 * (inline) whose destination is outside the framework — in another framework
 * hosted on this server, or somewhere else entirely (remote).
 */
export type ExternalAlignment = {
  id: string
  fromItemId: string
  toItemId: string
  associationType: string
  originUri: string
  destinationUri: string
  destinationTitle?: string
  destinationTargetType?: string
}

/** The framework (hosted) or source (remote) an external alignment points into. */
export type ExternalAlignmentTarget =
  | { kind: 'hosted'; id: string; title: string; alignments: ExternalAlignment[] }
  | { kind: 'remote'; id: string; title: string; alignments: ExternalAlignment[] }

/** Hosted document that holds an item, as resolved by the server. */
export type HostedDocumentRef = { identifier: string; title: string }

const HIERARCHICAL_TYPES = new Set(['isChildOf', 'isPartOf'])

/** Prefix that marks a remote target id, so it can't collide with a hosted framework id. */
export const REMOTE_TARGET_PREFIX = 'remote:'

export function isRemoteTargetId(id: string): boolean {
  return id.startsWith(REMOTE_TARGET_PREFIX)
}

/**
 * The framework's inline external alignments: non-hierarchical associations
 * from one of its items to a node that isn't one of its items.
 *
 * Links to a CFDocument (this framework's own, or another's — e.g. an overview
 * framework's `exactMatchOf` to each subject framework) aren't item-to-item
 * alignments and are left out.
 */
export function externalAlignmentsOf(framework: Framework): ExternalAlignment[] {
  const frameworkId = String(framework.id)
  const result: ExternalAlignment[] = []
  for (const a of framework.associations.values()) {
    if (HIERARCHICAL_TYPES.has(a.associationType)) continue
    if (!framework.items.has(a.fromItemId)) continue
    if (framework.items.has(a.toItemId)) continue
    const toItemId = String(a.toItemId)
    if (toItemId === frameworkId) continue

    const md = a.metadata ?? {}
    const destinationUri = md.destinationUri ?? `urn:case:item:${toItemId}`
    if (/\/CFDocuments\//.test(destinationUri)) continue

    const fromItemId = String(a.fromItemId)
    const itemUri = (framework.items.get(a.fromItemId)?.metadata as Record<string, unknown> | undefined)?.caseUri
    result.push({
      id: String(a.id),
      fromItemId,
      toItemId,
      associationType: a.associationType,
      originUri: md.originUri ?? (typeof itemUri === 'string' ? itemUri : `urn:case:item:${fromItemId}`),
      destinationUri,
      destinationTitle: md.destinationTitle,
      destinationTargetType: md.destinationTargetType,
    })
  }
  return result
}

/** Destination identifiers worth asking the server about — non-CASE targets can never be hosted. */
export function hostedLookupCandidates(alignments: ExternalAlignment[]): string[] {
  return [...new Set(alignments.filter((a) => !isNonCaseTarget(a)).map((a) => a.toItemId))]
}

/**
 * Groups external alignments by where their destination lives: each hosted
 * framework becomes one target, and remote destinations are grouped by the
 * host of their URI (e.g. `goals.example.org`).
 *
 * `hostedDocuments` is the server's answer for which framework holds each
 * destination; anything it doesn't cover — and every non-CASE target — is
 * remote. Hosted targets come first, then remote ones, each sorted by title.
 */
export function groupExternalAlignments(
  alignments: ExternalAlignment[],
  hostedDocuments: Record<string, HostedDocumentRef>,
): ExternalAlignmentTarget[] {
  const hosted = new Map<string, ExternalAlignmentTarget>()
  const remote = new Map<string, ExternalAlignmentTarget>()

  for (const a of alignments) {
    const doc = isNonCaseTarget(a) ? undefined : hostedDocuments[a.toItemId]
    if (doc) {
      const target = hosted.get(doc.identifier) ?? { kind: 'hosted', id: doc.identifier, title: doc.title, alignments: [] }
      target.alignments.push(a)
      hosted.set(doc.identifier, target)
    } else {
      const source = remoteSourceOf(a.destinationUri)
      const id = `${REMOTE_TARGET_PREFIX}${source}`
      const target = remote.get(id) ?? { kind: 'remote', id, title: source, alignments: [] }
      target.alignments.push(a)
      remote.set(id, target)
    }
  }

  const byTitle = (x: ExternalAlignmentTarget, y: ExternalAlignmentTarget) => x.title.localeCompare(y.title)
  return [...[...hosted.values()].sort(byTitle), ...[...remote.values()].sort(byTitle)]
}

function isNonCaseTarget(a: ExternalAlignment): boolean {
  return a.destinationTargetType !== undefined && a.destinationTargetType !== 'CASE'
}

const UNKNOWN_SOURCE = 'Other sources'

function remoteSourceOf(uri: string): string {
  try {
    const { protocol, hostname } = new URL(uri)
    return (protocol === 'http:' || protocol === 'https:') && hostname ? hostname : UNKNOWN_SOURCE
  } catch {
    return UNKNOWN_SOURCE
  }
}
