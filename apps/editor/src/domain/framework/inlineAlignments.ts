import type { Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'

/** A non-hierarchical association stored in the framework itself, seen as an alignment from one of its items. */
export type InlineAlignment = {
  id: string
  fromItemId: string
  toItemId: string
  associationType: string
  originUri: string
  destinationUri: string
}

const HIERARCHICAL_TYPES = new Set(['isChildOf', 'isPartOf'])

/**
 * Associations that a framework stores in its own CFPackage and that read as
 * alignments: non-hierarchical, from one of its items to a CASE item (in this
 * framework or another one). Links to the framework's own CFDocument and to
 * non-CASE targets (`targetType` other than 'CASE') are not alignments.
 *
 * CASE 1.1 keeps an association in the document of its origin, so these are
 * the same relationships an alignment document would hold — just not in a
 * separate package.
 */
export function inlineAlignmentsOf(framework: Framework): InlineAlignment[] {
  const frameworkId = String(framework.id)
  const result: InlineAlignment[] = []
  for (const a of framework.associations.values()) {
    if (HIERARCHICAL_TYPES.has(a.associationType)) continue
    const fromItemId = String(a.fromItemId)
    const toItemId = String(a.toItemId)
    if (!framework.items.has(a.fromItemId)) continue
    if (toItemId === frameworkId || toItemId === fromItemId) continue
    const targetType = a.metadata?.destinationTargetType
    if (targetType && targetType !== 'CASE') continue

    const md = a.metadata ?? {}
    const itemUri = (framework.items.get(a.fromItemId)?.metadata as Record<string, unknown> | undefined)?.caseUri
    result.push({
      id: String(a.id),
      fromItemId,
      toItemId,
      associationType: a.associationType,
      originUri: md.originUri ?? (typeof itemUri === 'string' ? itemUri : `urn:case:item:${fromItemId}`),
      destinationUri: md.destinationUri ?? `urn:case:item:${toItemId}`,
    })
  }
  return result
}

/**
 * Groups inline alignments by the framework that holds their destination.
 * Destinations in the framework itself group under its own id (a self
 * alignment); others are looked up with `frameworkOfItem`. Destinations it
 * cannot place are returned in `unresolvedItemIds`.
 */
export function groupInlineAlignmentsByTarget(
  framework: Framework,
  alignments: InlineAlignment[],
  frameworkOfItem: (itemId: string) => string | undefined,
): { byTarget: Map<string, InlineAlignment[]>; unresolvedItemIds: string[] } {
  const frameworkId = String(framework.id)
  const byTarget = new Map<string, InlineAlignment[]>()
  const unresolved = new Set<string>()
  for (const alignment of alignments) {
    const isLocal = framework.items.has(alignment.toItemId as ItemId)
    const targetId = isLocal ? frameworkId : frameworkOfItem(alignment.toItemId)
    if (!targetId) {
      unresolved.add(alignment.toItemId)
      continue
    }
    const list = byTarget.get(targetId)
    if (list) list.push(alignment)
    else byTarget.set(targetId, [alignment])
  }
  return { byTarget, unresolvedItemIds: [...unresolved] }
}
