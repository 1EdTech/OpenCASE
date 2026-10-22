import type { Association, Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'

/**
 * The editor graph only has nodes for this framework's own items and its
 * CFDocument, so an association whose origin or destination is anything else
 * — a CASE 1.1 non-CASE target (`targetType: 'ext:…'`, GitHub #49) or an item
 * in another framework — has no edge on the canvas and never comes back out of
 * `fromEditorGraph`. Saving would silently delete it.
 *
 * This carries such associations over from the framework as loaded into the
 * framework rebuilt from the graph, unless the local item they hang off was
 * deleted in this session. Editor-authored remote links are excluded: they
 * already round-trip through `remoteEditorData`.
 */
export function withOffCanvasAssociations(loaded: Framework, saved: Framework): Framework {
  const isLoadedNode = (id: ItemId) => loaded.items.has(id) || (id as unknown as string) === (loaded.id as unknown as string)
  const isSavedNode = (id: ItemId) => saved.items.has(id) || (id as unknown as string) === (saved.id as unknown as string)

  let associations: Map<Association['id'], Association> | undefined
  for (const a of loaded.associations.values()) {
    if (saved.associations.has(a.id)) continue
    if (isRemoteLink(a)) continue
    const endpoints = [a.fromItemId, a.toItemId]
    // Both ends on the canvas: if it's missing from `saved`, the user deleted it.
    if (endpoints.every(isLoadedNode)) continue
    if (!endpoints.filter(isLoadedNode).every(isSavedNode)) continue
    associations ??= new Map(saved.associations)
    associations.set(a.id, a)
  }

  return associations ? { ...saved, associations } : saved
}

function isRemoteLink(a: Association): boolean {
  const ext = (a.metadata?.extensions as Record<string, unknown> | undefined)?.['ext:opencase']
  return (ext as { remoteLink?: unknown } | undefined)?.remoteLink === true
}
