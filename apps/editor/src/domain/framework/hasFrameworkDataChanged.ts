import type { Association, Framework, Item } from '@/domain/framework/model/types'

/**
 * Editor-only presentation data (per-item color band, and node positions and
 * edge handle anchors written by the former canvas view) shows up in TWO
 * metadata shapes depending on where the Framework snapshot came from:
 *  - Stored as CASE extensions: under `metadata.extensions['ext:opencase']`
 *    (or a top-level `metadata['ext:opencase']` key from older builds).
 *    Other keys in `metadata.extensions` are real framework data and ARE
 *    compared — editing a custom extension is a data change.
 *  - Re-derived from the editor graph (`fromEditorGraph.ts`, called on every
 *    save and to capture the fork-detection baseline): `colorBand` (items) is
 *    written as a TOP-LEVEL metadata key, as were `originHandle`/
 *    `destinationHandle` (associations) before the canvas view was removed.
 * Both shapes are excluded here so presentation data never reads as a
 * "framework data" change.
 */
function stripLayoutMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}
  const { 'ext:opencase': _omit, colorBand: _colorBand, originHandle: _originHandle, destinationHandle: _destinationHandle, extensions, ...rest } = metadata
  if (extensions && typeof extensions === 'object') {
    const { 'ext:opencase': _omitExt, ...customExtensions } = extensions as Record<string, unknown>
    if (Object.keys(customExtensions).length > 0) rest.extensions = customExtensions
  }
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
 * Deliberately blind to editor-only presentation data (position, color band, edge
 * handle anchors), since those don't affect a mirrored framework's CASE-spec
 * content and shouldn't be treated as a forking change.
 */
function comparableDocumentMetadata(metadata: Framework['metadata']): Framework['metadata'] {
  if (!metadata) return {}
  // Public read access and association storage are OpenCASE settings, not CASE
  // content. Changing them must not fork a mirrored framework. Nor does the
  // timestamp stamped on any edit to the document — the server ignores it too.
  const { publicAccess: _publicAccess, alignmentStorage: _alignmentStorage, lastChangeDateTime: _lastChangeDateTime, ...rest } = metadata
  return rest
}

export function hasFrameworkDataChanged(baseline: Framework, current: Framework): boolean {
  if (JSON.stringify(comparableDocumentMetadata(baseline.metadata)) !== JSON.stringify(comparableDocumentMetadata(current.metadata))) return true

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
