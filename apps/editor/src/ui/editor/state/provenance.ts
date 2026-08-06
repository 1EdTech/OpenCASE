/**
 * Helpers for reasoning about a framework's registry provenance and for the
 * "fork" transform that turns a faithfully-imported framework into a derivative.
 *
 * Imported registry frameworks are read-only by default. When the user chooses to
 * edit one, it becomes *derived* from the source: each item's and the document's
 * `ext:opencase.source` (an identity assertion — "this IS registry resource X") is
 * converted to `derivedFrom` (a lineage assertion — "this was derived from X"), and
 * the document is flagged `isModifiedFromSource`.
 */

export const OPENCASE_EXT_KEY = 'ext:opencase'

type ExtRecord = Record<string, unknown>

function opencaseExt(extensions: unknown): ExtRecord | undefined {
  const ext = (extensions as ExtRecord | undefined)?.[OPENCASE_EXT_KEY]
  return ext && typeof ext === 'object' ? (ext as ExtRecord) : undefined
}

/**
 * Classify a CFDocument's registry provenance:
 * - `imported` — came from a CTDL registry (has a source/derivedFrom/import marker)
 * - `modified` — has been forked (edited) away from that source
 * The editor treats `imported && !modified` as read-only.
 */
export function readDocProvenance(
  cfDocument: { extensions?: unknown } | undefined,
): { imported: boolean; modified: boolean } {
  const ext = opencaseExt(cfDocument?.extensions)
  const imported = Boolean(ext && (ext.source || ext.derivedFrom || ext.importedFrom))
  const modified = ext?.isModifiedFromSource === true
  return { imported, modified }
}

/**
 * Return a new extensions object with the registry `source` block renamed to
 * `derivedFrom` (identity → lineage). Optionally set the document-level
 * `isModifiedFromSource` flag. Returns the input reference unchanged when there is
 * nothing to transform, so callers can skip no-op node updates.
 */
export function forkExtensions(
  extensions: unknown,
  opts: { markModified?: boolean } = {},
): Record<string, unknown> | undefined {
  const base = extensions as ExtRecord | undefined
  const ext = opencaseExt(base)
  const hasSource = Boolean(ext?.source)
  if (!hasSource && !opts.markModified) return base
  const nextExt: ExtRecord = { ...(ext ?? {}) }
  if (hasSource) {
    nextExt.derivedFrom = nextExt.source
    delete nextExt.source
  }
  if (opts.markModified) nextExt.isModifiedFromSource = true
  return { ...(base ?? {}), [OPENCASE_EXT_KEY]: nextExt }
}
