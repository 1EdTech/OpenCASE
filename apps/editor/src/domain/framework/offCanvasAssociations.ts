import type { Association, Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'

/**
 * The editor graph only has nodes for this framework's own items and its
 * CFDocument, so an association whose origin or destination is anything else
 * — a CASE 1.1 non-CASE target (`targetType: 'ext:…'`, GitHub #49), an item
 * in another framework, or a link the former canvas view drew to a CASE Global
 * framework (`ext:opencase.remoteLink`) — has no edge in the graph and never
 * comes back out of `fromEditorGraph`. Saving would silently delete it.
 *
 * This carries such associations over from the framework as loaded into the
 * framework rebuilt from the graph, unless the local item they hang off was
 * deleted in this session.
 */
export function withOffCanvasAssociations(loaded: Framework, saved: Framework): Framework {
  const isLoadedNode = (id: ItemId) => loaded.items.has(id) || (id as unknown as string) === (loaded.id as unknown as string)
  const isSavedNode = (id: ItemId) => saved.items.has(id) || (id as unknown as string) === (saved.id as unknown as string)

  let associations: Map<Association['id'], Association> | undefined
  for (const a of loaded.associations.values()) {
    if (saved.associations.has(a.id)) continue
    const endpoints = [a.fromItemId, a.toItemId]
    // Both ends on the canvas: if it's missing from `saved`, the user deleted it.
    if (endpoints.every(isLoadedNode)) continue
    if (!endpoints.filter(isLoadedNode).every(isSavedNode)) continue
    associations ??= new Map(saved.associations)
    associations.set(a.id, a)
  }

  return associations ? { ...saved, associations } : saved
}
