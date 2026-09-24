import type { Association, Framework, Item } from '@/domain/framework/model/types'

/**
 * Canvas-only concerns (node position, per-node color band, edge handle
 * anchors, edge render style) show up in TWO different metadata shapes
 * depending on where the Framework snapshot came from:
 *  - Freshly loaded from CASE data (`caseToDomainFramework.ts`'s
 *    `...it.extensions`/`...a.extensions` spread): nested one level, under
 *    a literal `metadata['ext:opencase']` key.
 *  - Re-derived from the live canvas during an editing session
 *    (`fromEditorGraph.ts`, called on every save and to capture the
 *    fork-detection baseline): `colorBand` (items) and `originHandle`/
 *    `destinationHandle` (associations) are written directly as TOP-LEVEL
 *    metadata keys, not nested under `ext:opencase` — e.g. switching layout
 *    algorithms (star ↔ hierarchical) recomputes every edge's handle
 *    anchors, which land here.
 * Both shapes must be excluded here so neither a pure layout edit nor
 * switching layout algorithms ever reads as a "framework data" change.
 */
function stripLayoutMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}
  const { 'ext:opencase': _omit, colorBand: _colorBand, originHandle: _originHandle, destinationHandle: _destinationHandle, ...rest } = metadata
  return rest
}

function normalizeItem(item: Item) {
  return { statement: item.statement, type: item.type, metadata: stripLayoutMetadata(item.metadata) }
}

function normalizeAssociation(assoc: Association) {
  return {
    fromItemId: assoc.fromItemId,
    toItemId: assoc.toItemId,
    associationType: assoc.associationType,
    metadata: stripLayoutMetadata(assoc.metadata),
  }
}

function sortedNormalizedEntries<K extends string, V>(map: Map<K, V>, normalize: (v: V) => unknown): Array<[K, unknown]> {
  return Array.from(map.entries())
    .map(([id, v]) => [id, normalize(v)] as [K, unknown])
    .sort(([a], [b]) => a.localeCompare(b))
}

/**
 * True if two Framework snapshots differ in actual framework data —
 * metadata, item statements/types/CASE fields, hierarchy, or associations.
 * Deliberately blind to canvas-only concerns (position, color band, edge
 * handle anchors), since those don't affect a mirrored framework's CASE-spec
 * content and shouldn't be treated as a forking change.
 */
export function hasFrameworkDataChanged(baseline: Framework, current: Framework): boolean {
  if (JSON.stringify(baseline.metadata) !== JSON.stringify(current.metadata)) return true

  if (JSON.stringify(sortedNormalizedEntries(baseline.items, normalizeItem)) !==
      JSON.stringify(sortedNormalizedEntries(current.items, normalizeItem))) {
    return true
  }

  if (JSON.stringify(sortedNormalizedEntries(baseline.associations, normalizeAssociation)) !==
      JSON.stringify(sortedNormalizedEntries(current.associations, normalizeAssociation))) {
    return true
  }

  return false
}
