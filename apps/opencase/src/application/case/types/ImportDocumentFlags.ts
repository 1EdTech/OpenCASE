/**
 * Optional flags applied when importing a CFPackage.
 * Defaults preserve existing editable-import behaviour (readOnly is false when omitted).
 */
export interface ImportDocumentFlags {
  /** When true, the document is a cached remote reference and cannot be mutated. */
  readOnly?: boolean
  /** CASE Global coalition registry identifier (when imported via CGE). */
  cgeFrameworkId?: string
  /** Local framework doc that triggered the cache import (editor hint). */
  linkedFromDocId?: string
  /** ISO timestamp when a read-only CGE cache was fetched. */
  cgeCachedAt?: string
}
