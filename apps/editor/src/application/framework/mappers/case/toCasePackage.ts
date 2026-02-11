import type { CFAssociation, CFDocument, CFItem, CFPackage, CaseExtensions } from '@/domain/case/types'
import type { Framework } from '@/domain/framework/model/types'
import type { CaseVersion } from './CasePackageSnapshot'
import type { LayoutState, NodeLayout } from '@/ui/editor/reactflow/mapping/types'

const nowIso = () => new Date().toISOString()

/** OpenCASE extension namespace for editor-specific data */
const OPENCASE_EXT_KEY = 'ext:opencase'

/** Default version format: major.minor.build */
const DEFAULT_VERSION = '1.0.0'

/** UUID v4 pattern */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Check if a string is a valid UUID.
 */
function isValidUuid(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/**
 * Generate a deterministic UUID v4-like ID from a string.
 * Uses a simple hash to generate consistent UUIDs for the same input.
 * This ensures that the same internal ID always maps to the same UUID.
 */
function generateDeterministicUuid(input: string): string {
  // Simple hash function
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.codePointAt(i) ?? 0
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Generate more bytes by hashing variations
  const hash2 = ((hash << 13) ^ hash) & 0xffffffff
  const hash3 = ((hash2 << 17) ^ hash2) & 0xffffffff
  const hash4 = ((hash3 << 5) ^ hash3) & 0xffffffff
  
  // Format as UUID (version 4 format with variant bits)
  const hex = (n: number, len: number) => Math.abs(n).toString(16).padStart(len, '0').slice(-len)
  
  return [
    hex(hash, 8),
    hex(hash2, 4),
    '4' + hex(hash3, 3), // Version 4
    ((hash4 & 0x3fff) | 0x8000).toString(16), // Variant bits
    hex(hash ^ hash2 ^ hash3 ^ hash4, 12),
  ].join('-')
}

/**
 * Ensure an ID is a valid UUID. If not, generate a deterministic UUID from it.
 */
function ensureUuid(id: string): string {
  if (isValidUuid(id)) {
    return id.toLowerCase()
  }
  return generateDeterministicUuid(id)
}

/**
 * URI format specification for CASE entities.
 * Uses the official CASE v1p1 REST endpoint format.
 */
function makeDocumentUri(uuid: string): string {
  return `/ims/case/v1p1/CFDocuments/${uuid}`
}

function makeItemUri(uuid: string): string {
  return `/ims/case/v1p1/CFItems/${uuid}`
}

function makeAssociationUri(uuid: string): string {
  return `/ims/case/v1p1/CFAssociations/${uuid}`
}

function makePackageUri(uuid: string): string {
  return `/ims/case/v1p1/CFPackages/${uuid}`
}

/**
 * Increment the build number of a version string (format: major.minor.build).
 * If the version doesn't match the expected format, returns the default version.
 */
function incrementVersion(currentVersion?: string): string {
  if (!currentVersion) return DEFAULT_VERSION
  
  const parts = currentVersion.split('.')
  if (parts.length !== 3) {
    // If current version exists but doesn't match format, try to preserve major.minor
    if (parts.length === 2) {
      return `${parts[0]}.${parts[1]}.0`
    }
    return DEFAULT_VERSION
  }
  
  const build = Number.parseInt(parts[2], 10)
  if (Number.isNaN(build)) {
    return `${parts[0]}.${parts[1]}.0`
  }
  
  return `${parts[0]}.${parts[1]}.${build + 1}`
}

type OpencaseExtension = {
  layout?: NodeLayout
  notes?: string
  /** Persisted handle ID on the origin (from) node — preserves user-defined edge anchors */
  originHandle?: string
  /** Persisted handle ID on the destination (to) node — preserves user-defined edge anchors */
  destinationHandle?: string
  /** Edge rendering style for this framework (e.g. 'default', 'smoothstep', 'straight') */
  edgeType?: string
}

/**
 * Merge OpenCASE extension data into existing extensions object.
 */
function mergeOpencaseExtension(
  existingExtensions: CaseExtensions | undefined,
  opencaseData: OpencaseExtension
): CaseExtensions {
  const base = existingExtensions ?? {}
  const extensions = { ...base }
  
  // Only add if there's data to store
  if (opencaseData.layout || opencaseData.notes || opencaseData.originHandle || opencaseData.destinationHandle || opencaseData.edgeType) {
    const existing = (extensions[OPENCASE_EXT_KEY] as OpencaseExtension | undefined) ?? {}
    extensions[OPENCASE_EXT_KEY] = {
      ...existing,
      ...opencaseData,
    }
  }
  
  return extensions
}

/**
 * Convert domain Framework metadata to CASE CFDocument.
 */
function frameworkToCfDocument(
  framework: Framework,
  caseVersion: CaseVersion,
  layout?: NodeLayout,
  options?: { incrementVersion?: boolean; edgeType?: string }
): CFDocument {
  const meta = framework.metadata
  const fwId = String(framework.id)
  const effectiveVersion = caseVersion === 'unknown' ? '1.1' : caseVersion
  
  // Handle version: either use current, increment, or set default
  const documentVersion = options?.incrementVersion 
    ? incrementVersion(meta.version)
    : (meta.version ?? DEFAULT_VERSION)

  const docTitle = meta.title ?? 'Untitled Framework'

  const document: CFDocument & { sourcedId: string } = {
    identifier: fwId,
    sourcedId: fwId, // OpenCASE requires sourcedId
    uri: `urn:case:document:${fwId}`,
    creator: meta.creator ?? 'OpenCASE',
    title: docTitle,
    description: meta.description,
    notes: undefined, // Will add if we have notes in metadata
    language: undefined,
    version: documentVersion,
    adoptionStatus: meta.adoptionStatus,
    frameworkType: meta.frameworkType,
    // v1p1: include caseVersion field
    caseVersion: effectiveVersion === '1.1' ? '1.1' : undefined,
    statusStartDate: undefined,
    statusEndDate: undefined,
    licenseURI: meta.licenseURI ?? undefined,
    lastChangeDateTime: nowIso(), // Always update timestamp on export
    CFPackageURI: { 
      uri: `urn:case:package:${fwId}`,
      title: docTitle,
      identifier: fwId,
    },
    extensions: (layout || options?.edgeType)
      ? mergeOpencaseExtension(undefined, { layout, edgeType: options?.edgeType })
      : undefined,
  }

  return document
}

/**
 * Convert domain Item to CASE CFItem.
 */
function itemToCfItem(
  framework: Framework,
  itemId: string,
  layout?: NodeLayout
): CFItem & { sourcedId: string } {
  // ItemId is a branded type, but we receive string from the caller
  const item = framework.items.get(itemId as Parameters<typeof framework.items.get>[0])
  if (!item) {
    throw new Error(`Item ${itemId} not found in framework`)
  }

  const fwId = String(framework.id)
  const fwTitle = framework.metadata.title ?? 'Untitled Framework'
  const md = (item.metadata ?? {}) as Record<string, unknown>
  
  // Helper to extract string values from metadata
  const s = (k: string): string | undefined => {
    const v = md[k]
    return typeof v === 'string' ? v : undefined
  }
  const a = (k: string): string[] | undefined => {
    const v = md[k]
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined
  }

  const existingExtensions = (md.extensions as CaseExtensions | undefined) ?? undefined

  const cfItem: CFItem & { sourcedId: string } = {
    identifier: itemId,
    sourcedId: itemId, // OpenCASE requires sourcedId
    uri: s('caseUri') ?? `urn:case:item:${itemId}`,
    fullStatement: item.statement,
    abbreviatedStatement: s('abbreviatedStatement'),
    alternativeLabel: s('alternativeLabel'),
    humanCodingScheme: s('humanCodingScheme'),
    CFItemType: s('CFItemType') ?? item.type,
    CFItemTypeURI: undefined,
    listEnumeration: s('listEnumeration'),
    conceptKeywords: a('conceptKeywords'),
    conceptKeywordsURI: undefined,
    notes: s('notes'),
    subject: a('subject'),
    subjectURI: undefined,
    language: s('language'),
    educationLevel: a('educationLevel'),
    licenseURI: undefined,
    statusStartDate: s('statusStartDate'),
    statusEndDate: s('statusEndDate'),
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    CFDocumentURI: { 
      uri: `urn:case:document:${fwId}`, 
      identifier: fwId,
      title: fwTitle,
    },
    extensions: layout ? mergeOpencaseExtension(existingExtensions, { layout }) : existingExtensions,
  }

  return cfItem
}

/**
 * Convert domain Association to CASE CFAssociation.
 */
function associationToCfAssociation(
  framework: Framework,
  assocId: string
): CFAssociation & { sourcedId: string } {
  // AssociationId is a branded type, but we receive string from the caller
  const assoc = framework.associations.get(assocId as Parameters<typeof framework.associations.get>[0])
  if (!assoc) {
    throw new Error(`Association ${assocId} not found in framework`)
  }

  const fwId = String(framework.id)
  const fwTitle = framework.metadata.title ?? 'Untitled Framework'
  const fromId = String(assoc.fromItemId)
  const toId = String(assoc.toItemId)
  const md = (assoc.metadata ?? {}) as Record<string, unknown>
  
  // Get item titles for the link URIs
  const fromItem = framework.items.get(assoc.fromItemId)
  const toItem = framework.items.get(assoc.toItemId)
  const fromTitle = fromItem?.statement ?? `Item ${fromId}`
  const toTitle = toItem?.statement ?? `Item ${toId}`
  
  const s = (k: string): string | undefined => {
    const v = md[k]
    return typeof v === 'string' ? v : undefined
  }
  const n = (k: string): number | undefined => {
    const v = md[k]
    return typeof v === 'number' ? v : undefined
  }

  const existingExtensions = (md.extensions as CaseExtensions | undefined) ?? undefined

  // Persist user-defined edge handle positions in ext:opencase
  const originHandle = s('originHandle')
  const destinationHandle = s('destinationHandle')
  const extensions = (originHandle || destinationHandle)
    ? mergeOpencaseExtension(existingExtensions, { originHandle, destinationHandle })
    : existingExtensions

  const cfAssociation: CFAssociation & { sourcedId: string } = {
    identifier: assocId,
    sourcedId: assocId, // OpenCASE requires sourcedId
    uri: s('caseUri') ?? `urn:case:association:${assocId}`,
    associationType: assoc.associationType,
    originNodeURI: {
      identifier: fromId,
      uri: s('originUri') ?? `urn:case:item:${fromId}`,
      title: fromTitle,
    },
    destinationNodeURI: {
      identifier: toId,
      uri: s('destinationUri') ?? `urn:case:item:${toId}`,
      title: toTitle,
    },
    sequenceNumber: n('sequenceNumber'),
    CFAssociationGroupingURI: undefined,
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    notes: s('notes'),
    CFDocumentURI: { 
      uri: `urn:case:document:${fwId}`, 
      identifier: fwId,
      title: fwTitle,
    },
    extensions,
  }

  return cfAssociation
}

/**
 * Convert domain Framework to CASE CFPackage format.
 * 
 * This is the authoritative conversion from the domain model to CASE format.
 * Layout data (positions, dimensions) can be optionally included in extensions.
 * 
 * @param framework - The domain Framework (source of truth)
 * @param caseVersion - Target CASE version for serialization ('1.0' or '1.1')
 * @param layout - Optional layout state to store in extensions
 * @param incrementVersion - If true, increment the build number of the version (for saves)
 */
export function frameworkToCfPackage(params: {
  framework: Framework
  caseVersion: CaseVersion
  layout?: LayoutState
  incrementVersion?: boolean
  /** Edge rendering style to persist with this framework */
  edgeType?: string
}): CFPackage {
  const { framework, caseVersion, layout, incrementVersion, edgeType } = params
  const fwId = String(framework.id)

  // Build CFDocument
  const documentLayout = layout?.byNodeId?.[fwId]
  const document = frameworkToCfDocument(framework, caseVersion, documentLayout, { incrementVersion, edgeType })

  // Build CFItems
  const itemIds = Array.from(framework.items.keys()).map(String)
  const items: CFItem[] = itemIds.map((itemId) => {
    const itemLayout = layout?.byNodeId?.[itemId]
    return itemToCfItem(framework, itemId, itemLayout)
  })

  // Build CFAssociations
  const assocIds = Array.from(framework.associations.keys()).map(String)
  const associations: CFAssociation[] = assocIds.map((assocId) => 
    associationToCfAssociation(framework, assocId)
  )

  const cfPackage: CFPackage = {
    CFDocument: document,
    CFItems: items.length > 0 ? items : undefined,
    CFAssociations: associations.length > 0 ? associations : undefined,
  }

  return cfPackage
}

/**
 * Link URI reference format (LinkGenURI) per CASE v1p1 spec.
 */
export type CaseLinkURI = {
  title: string
  identifier: string
  uri: string
}

/**
 * CASE v1p1 CFDocument format.
 * Uses identifier (not sourcedId) per the official CASE v1p1 spec.
 */
export type CaseV1p1Document = {
  identifier: string
  uri: string
  title: string
  creator: string
  lastChangeDateTime: string
  description?: string
  subject?: string | string[]
  language?: string
  frameworkType?: string
  version?: string
  caseVersion?: string
  adoptionStatus?: string
  notes?: string
  statusStartDate?: string
  statusEndDate?: string
  licenseURI?: CaseLinkURI
  CFPackageURI?: CaseLinkURI
  extensions?: Record<string, unknown>
}

/**
 * CASE v1p1 CFItem format.
 */
export type CaseV1p1Item = {
  identifier: string
  uri: string
  fullStatement: string
  lastChangeDateTime: string
  CFDocumentURI: CaseLinkURI
  humanCodingScheme?: string
  listEnumeration?: string
  alternativeLabel?: string
  abbreviatedStatement?: string
  CFItemType?: string
  CFItemTypeURI?: unknown
  conceptKeywords?: string[]
  notes?: string
  language?: string
  subject?: string | string[]
  educationLevel?: string[]
  statusStartDate?: string
  statusEndDate?: string
  extensions?: Record<string, unknown>
}

/**
 * CASE v1p1 CFAssociation format.
 */
export type CaseV1p1Association = {
  identifier: string
  uri: string
  associationType: string
  originNodeURI: CaseLinkURI
  destinationNodeURI: CaseLinkURI
  lastChangeDateTime: string
  sequenceNumber?: number
  CFDocumentURI?: CaseLinkURI
  extensions?: Record<string, unknown>
}

/**
 * Official CASE v1p1 CFPackage format for POST requests.
 * Uses CFDocument, CFItems, CFAssociations (not lowercase).
 */
export type CaseV1p1Package = {
  CFDocument: CaseV1p1Document
  CFItems?: CaseV1p1Item[]
  CFAssociations?: CaseV1p1Association[]
  CFDefinitions?: unknown
  CFRubrics?: unknown
}

// Legacy type aliases for backward compatibility
export type OpenCaseDocument = CaseV1p1Document
export type OpenCaseItem = CaseV1p1Item
export type OpenCaseAssociation = CaseV1p1Association
export type OpenCaseCFPackage = CaseV1p1Package

/**
 * Convert internal CFPackage to official CASE v1p1 format for POST requests.
 * Uses identifier (not sourcedId) and official property names (CFDocument, CFItems, CFAssociations).
 * All IDs are converted to valid UUIDs.
 */
export function toOpenCaseFormat(cfPackage: CFPackage): CaseV1p1Package {
  const doc = cfPackage.CFDocument as CFDocument & { sourcedId?: string }
  const docId = ensureUuid(doc.sourcedId ?? doc.identifier)
  const docTitle = doc.title
  
  // Build a mapping from internal item IDs to normalized UUIDs
  // This ensures consistent URIs across items and associations
  const itemIdMap = new Map<string, string>()
  for (const item of cfPackage.CFItems ?? []) {
    const it = item as CFItem & { sourcedId?: string }
    const internalId = it.sourcedId ?? it.identifier
    itemIdMap.set(internalId, ensureUuid(internalId))
  }
  
  const document: CaseV1p1Document = {
    identifier: docId,
    uri: makeDocumentUri(docId),
    title: docTitle,
    creator: doc.creator,
    lastChangeDateTime: doc.lastChangeDateTime,
    description: doc.description,
    language: doc.language,
    frameworkType: doc.frameworkType,
    version: doc.version,
    caseVersion: doc.caseVersion,
    adoptionStatus: doc.adoptionStatus,
    notes: doc.notes,
    statusStartDate: doc.statusStartDate,
    statusEndDate: doc.statusEndDate,
    licenseURI: doc.licenseURI ? {
      title: doc.licenseURI.title ?? '',
      identifier: doc.licenseURI.identifier ?? '',
      uri: doc.licenseURI.uri,
    } : undefined,
    CFPackageURI: {
      uri: makePackageUri(docId),
      title: docTitle,
      identifier: docId,
    },
    extensions: doc.extensions,
  }

  const items: CaseV1p1Item[] | undefined = cfPackage.CFItems?.map((item) => {
    const it = item as CFItem & { sourcedId?: string }
    const internalId = it.sourcedId ?? it.identifier
    const itemId = itemIdMap.get(internalId) ?? ensureUuid(internalId)
    return {
      identifier: itemId,
      uri: makeItemUri(itemId),
      fullStatement: it.fullStatement,
      lastChangeDateTime: it.lastChangeDateTime,
      CFDocumentURI: {
        title: docTitle,
        identifier: docId,
        uri: makeDocumentUri(docId),
      },
      humanCodingScheme: it.humanCodingScheme,
      listEnumeration: it.listEnumeration,
      alternativeLabel: it.alternativeLabel,
      abbreviatedStatement: it.abbreviatedStatement,
      CFItemType: it.CFItemType,
      CFItemTypeURI: it.CFItemTypeURI,
      conceptKeywords: it.conceptKeywords,
      notes: it.notes,
      language: it.language,
      subject: it.subject,
      educationLevel: it.educationLevel,
      statusStartDate: it.statusStartDate,
      statusEndDate: it.statusEndDate,
      extensions: it.extensions,
    }
  })

  const associations: CaseV1p1Association[] | undefined = cfPackage.CFAssociations?.map((assoc) => {
    const a = assoc as CFAssociation & { sourcedId?: string }
    const assocId = ensureUuid(a.sourcedId ?? a.identifier)
    
    // Get normalized UUIDs for origin and destination items
    const originInternalId = a.originNodeURI.identifier ?? ''
    const destInternalId = a.destinationNodeURI.identifier ?? ''
    const originId = itemIdMap.get(originInternalId) ?? ensureUuid(originInternalId)
    const destId = itemIdMap.get(destInternalId) ?? ensureUuid(destInternalId)
    
    return {
      identifier: assocId,
      uri: makeAssociationUri(assocId),
      associationType: a.associationType,
      originNodeURI: {
        title: a.originNodeURI.title ?? 'Origin',
        identifier: originId,
        uri: makeItemUri(originId),
      },
      destinationNodeURI: {
        title: a.destinationNodeURI.title ?? 'Destination',
        identifier: destId,
        uri: makeItemUri(destId),
      },
      lastChangeDateTime: a.lastChangeDateTime,
      sequenceNumber: a.sequenceNumber,
      CFDocumentURI: {
        title: docTitle,
        identifier: docId,
        uri: makeDocumentUri(docId),
      },
      extensions: a.extensions,
    }
  })

  return {
    CFDocument: document,
    CFItems: items?.length ? items : undefined,
    CFAssociations: associations?.length ? associations : undefined,
  }
}

/**
 * Convenience type for the export parameters.
 */
export type FrameworkExportParams = {
  framework: Framework
  caseVersion: CaseVersion
  layout?: LayoutState
  incrementVersion?: boolean
}
