import type { CasePackageSnapshot, CaseVersion } from './CasePackageSnapshot'

/**
 * CASE v1p0 vs v1p1 Key Differences Handled:
 *
 * 1. Identifier fields:
 *    - v1p0: Often uses `sourcedId` as the primary identifier
 *    - v1p1: Uses `identifier` consistently
 *    - Resolution: Check both, prefer `identifier`
 *
 * 2. Association node references:
 *    - v1p0: `originNodeURI` / `destinationNodeURI` may be plain URI strings
 *    - v1p1: Always LinkGenURI objects { identifier, uri, targetType? }
 *    - Resolution: Handle both formats in extractLinkIdentifier()
 *
 * 3. Item type specification:
 *    - v1p0: May use `CFItemTypeURI` (LinkURI) instead of/with `CFItemType` (string)
 *    - v1p1: Both are supported, `CFItemType` preferred
 *    - Resolution: Read from both, extract type from URI if needed
 *
 * 4. Package structure:
 *    - v1p0: Sometimes wraps arrays in set containers (CFItemSet, CFAssociationSet)
 *    - v1p1: Usually direct arrays (CFItems, CFAssociations)
 *    - Resolution: readArrayFromSet() handles both
 *
 * 5. Ordering fields:
 *    - v1p0: Uses `listEnumeration` on items
 *    - v1p1: Uses `sequenceNumber` on associations (preferred)
 *    - Resolution: Extract both for compatibility
 */

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null)

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

const asNumber = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

const asStringArray = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined)

/** Extract a single LinkURI ({title, identifier, uri}) from a raw value */
const extractLinkURISingle = (v: unknown): { title?: string; identifier: string; uri: string } | undefined => {
  const obj = asRecord(v)
  if (!obj) return undefined
  const identifier = asString(obj.identifier) ?? asString(obj.sourcedId)
  const uri = asString(obj.uri)
  if (!identifier || !uri) return undefined
  return { title: asString(obj.title), identifier, uri }
}

/** Extract an array of LinkURI objects from a raw value */
const extractLinkURIArray = (v: unknown): Array<{ title?: string; identifier: string; uri: string }> | undefined => {
  if (!Array.isArray(v)) return undefined
  const result = v
    .map((item) => extractLinkURISingle(item))
    .filter((x): x is NonNullable<typeof x> => x !== undefined)
  return result.length > 0 ? result : undefined
}

/**
 * Detect the CASE version from the document metadata.
 *
 * Heuristics:
 * 1. Explicit `caseVersion` field (v1.1 spec)
 * 2. If no caseVersion and `sourcedId` is used, likely v1.0
 */
function guessCaseVersion(doc: Record<string, unknown> | null, pkg: Record<string, unknown> | null): CaseVersion {
  // Check explicit caseVersion field
  const raw = doc ? asString(doc.caseVersion) : undefined
  if (raw) {
    if (raw.startsWith('1.0')) return '1.0'
    if (raw.startsWith('1.1')) return '1.1'
  }

  // Heuristic: v1.0 packages often use sourcedId instead of identifier
  const usesSourcedId = doc && !doc.identifier && doc.sourcedId

  // Heuristic: v1.0 packages sometimes use CFItemSet wrapper
  const usesCfItemSet = pkg && (pkg.CFItemSet || pkg.CFAssociationSet)

  if (usesSourcedId || usesCfItemSet) {
    return '1.0'
  }

  return 'unknown'
}

/**
 * Extract identifier from a URI (last path segment).
 *
 * Examples:
 * - "https://api.example.com/CFItems/abc-123" → "abc-123"
 * - "urn:case:item:abc-123" → "abc-123"
 */
function extractIdFromUri(uri?: string): string | undefined {
  if (!uri) return undefined
  // Try the last path segment first; otherwise fall back to the full URI.
  const parts = uri.split('/').filter(Boolean)
  const last = parts.at(-1)
  return last || uri
}

/**
 * Extract identifier and URI from a link reference.
 *
 * Handles both v1p0 (plain URI string) and v1p1 (LinkGenURI object) formats.
 *
 * v1p0 format: "https://example.com/CFItems/123" (string)
 * v1p1 format: { identifier: "123", uri: "https://...", title?: "...", targetType?: "..." }
 */
function extractLinkIdentifier(link: unknown): { identifier?: string; uri?: string } {
  const obj = asRecord(link)

  // v1p0: Plain URI string
  if (!obj) {
    const uri = asString(link)
    return { uri, identifier: extractIdFromUri(uri) }
  }

  // v1p1: LinkGenURI object
  // Also check `sourcedId` for v1p0 compatibility
  const identifier = asString(obj.identifier) ?? asString(obj.sourcedId) ?? undefined
  const uri = asString(obj.uri) ?? undefined

  return { identifier: identifier ?? extractIdFromUri(uri), uri }
}

/**
 * Extract item type from CFItemType string or CFItemTypeURI object.
 *
 * v1p0: May only have CFItemTypeURI: { identifier, uri, title }
 * v1p1: Prefers CFItemType string, CFItemTypeURI optional
 */
function extractItemType(item: Record<string, unknown>): string | undefined {
  // Prefer explicit CFItemType string (v1.1 style)
  const cfItemType = asString(item.CFItemType)
  if (cfItemType) return cfItemType

  // Fall back to CFItemTypeURI.title (v1.0 style)
  const typeUri = asRecord(item.CFItemTypeURI)
  if (typeUri) {
    const title = asString(typeUri.title)
    if (title) return title

    // Try to extract from identifier
    const id = asString(typeUri.identifier)
    if (id) return id
  }

  return undefined
}

/**
 * Unwrap CFPackage from common API response formats.
 *
 * Handles:
 * - { CFPackage: { CFDocument: ..., CFItems: ... } } (wrapped)
 * - { CFDocument: ..., CFItems: ... } (direct)
 */
function unwrapCfPackage(res: unknown): Record<string, unknown> | null {
  const top = asRecord(res)
  if (!top) return null
  const direct = asRecord(top.CFPackage)
  return direct ?? top
}

/**
 * Read an array from the package, handling both direct and set-wrapped formats.
 *
 * v1p0 wrappers: CFItemSet: { CFItems: [...] }, CFAssociationSet: { CFAssociations: [...] }
 * v1p1 direct:   CFItems: [...], CFAssociations: [...]
 */
function readArrayFromSet(container: Record<string, unknown> | null, key: string): unknown[] | undefined {
  if (!container) return undefined

  // v1p1: Direct array
  const direct = container[key]
  if (Array.isArray(direct)) return direct

  // v1p0: Set wrapper
  // CFItems → CFItemSet, CFAssociations → CFAssociationSet
  const setKey = `${key.slice(0, -1)}Set`
  const set = asRecord(container[setKey])
  const nested = set ? set[key] : undefined
  if (Array.isArray(nested)) return nested

  return undefined
}

/**
 * Normalize an OpenCASE CFPackage response to a version-agnostic snapshot.
 *
 * This function handles the structural differences between CASE v1p0 and v1p1,
 * producing a consistent CasePackageSnapshot that downstream code can rely on.
 *
 * Accepts:
 * - `{ CFPackage: {...} }` (typical API response)
 * - `{ CFDocument, CFItems, CFAssociations, ... }` (package object directly)
 * - Both v1p0 and v1p1 field naming conventions
 */
export function normalizeCasePackageResponse(res: unknown): CasePackageSnapshot | null {
  const pkg = unwrapCfPackage(res)
  if (!pkg) return null

  const doc = asRecord(pkg.CFDocument)
  if (!doc) return null

  // v1p0 uses sourcedId, v1p1 uses identifier
  const identifier = asString(doc.identifier) ?? asString(doc.sourcedId)
  if (!identifier) return null

  const version = guessCaseVersion(doc, pkg)

  const itemsRaw = readArrayFromSet(pkg, 'CFItems') ?? []
  const associationsRaw = readArrayFromSet(pkg, 'CFAssociations') ?? []

  const items = itemsRaw
    .map((it): CasePackageSnapshot['items'][number] | null => {
      const r = asRecord(it)
      if (!r) return null

      // v1p0: sourcedId, v1p1: identifier
      const id = asString(r.identifier) ?? asString(r.sourcedId)
      const fullStatement = asString(r.fullStatement) ?? ''
      if (!id || !fullStatement) return null

      return {
        identifier: id,
        uri: asString(r.uri),
        fullStatement,
        abbreviatedStatement: asString(r.abbreviatedStatement),
        alternativeLabel: asString(r.alternativeLabel),
        humanCodingScheme: asString(r.humanCodingScheme),
        // Use enhanced item type extraction for v1p0/v1p1 compatibility
        CFItemType: extractItemType(r),
        // v1p0: listEnumeration is sometimes used for ordering
        listEnumeration: asString(r.listEnumeration),
        subject: asStringArray(r.subject),
        subjectURI: extractLinkURIArray(r.subjectURI),
        CFItemTypeURI: extractLinkURISingle(r.CFItemTypeURI),
        educationLevel: asStringArray(r.educationLevel),
        conceptKeywords: asStringArray(r.conceptKeywords),
        conceptKeywordsURI: extractLinkURISingle(r.conceptKeywordsURI),
        notes: asString(r.notes),
        language: asString(r.language),
        lastChangeDateTime: asString(r.lastChangeDateTime),
        extensions: asRecord(r.extensions) ?? undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  const associations = associationsRaw
    .map((a): CasePackageSnapshot['associations'][number] | null => {
      const r = asRecord(a)
      if (!r) return null

      // v1p0: sourcedId, v1p1: identifier
      const id = asString(r.identifier) ?? asString(r.sourcedId)
      if (!id) return null

      // Handle both v1p0 (plain URI) and v1p1 (LinkGenURI) formats
      const origin = extractLinkIdentifier(r.originNodeURI)
      const dest = extractLinkIdentifier(r.destinationNodeURI)

      // Extract CFAssociationGroupingURI if present
      const groupingLink = extractLinkIdentifier(r.CFAssociationGroupingURI)
      const groupingObj = asRecord(r.CFAssociationGroupingURI)

      return {
        identifier: id,
        associationType: asString(r.associationType),
        originIdentifier: origin.identifier,
        destinationIdentifier: dest.identifier,
        originUri: origin.uri,
        destinationUri: dest.uri,
        // v1p1: sequenceNumber for ordering within associations
        sequenceNumber: asNumber(r.sequenceNumber),
        CFAssociationGroupingIdentifier: groupingLink.identifier,
        CFAssociationGroupingTitle: groupingObj ? asString(groupingObj.title) : undefined,
        lastChangeDateTime: asString(r.lastChangeDateTime),
        extensions: asRecord(r.extensions) ?? undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  // Extract licenseURI (LinkURI object) if present
  const rawLicense = asRecord(doc.licenseURI)
  const licenseURI = rawLicense
    ? {
        title: asString(rawLicense.title),
        identifier: asString(rawLicense.identifier),
        uri: asString(rawLicense.uri) ?? '',
      }
    : undefined

  // Extract CFAssociationGroupings from CFDefinitions
  const defs = asRecord(pkg.CFDefinitions)
  const groupingsRaw = defs ? (Array.isArray(defs.CFAssociationGroupings) ? defs.CFAssociationGroupings : []) : []
  const associationGroupings = groupingsRaw
    .map((g) => {
      const r = asRecord(g)
      if (!r) return null
      const gId = asString(r.identifier) ?? asString(r.sourcedId)
      const gUri = asString(r.uri)
      if (!gId || !gUri) return null
      return {
        identifier: gId,
        uri: gUri,
        title: asString(r.title),
        description: asString(r.description),
        lastChangeDateTime: asString(r.lastChangeDateTime),
      }
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  return {
    version,
    document: {
      identifier,
      uri: asString(doc.uri),
      title: asString(doc.title),
      creator: asString(doc.creator),
      description: asString(doc.description),
      // v1p1 additions
      frameworkType: asString(doc.frameworkType),
      adoptionStatus: asString(doc.adoptionStatus),
      caseVersion: asString(doc.caseVersion),
      language: asString(doc.language),
      version: asString(doc.version),
      lastChangeDateTime: asString(doc.lastChangeDateTime),
      licenseURI,
    },
    items,
    associations,
    associationGroupings: associationGroupings.length > 0 ? associationGroupings : undefined,
  }
}
