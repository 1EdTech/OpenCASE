/**
 * CASE 1.1 TypeScript DTOs (JSON shapes)
 * Mirrors `docs/editor-types.md`.
 *
 * Notes:
 * - Many fields are optional in the spec; required fields are marked where the binding indicates them.
 * - "extensions" is allowed on CFDocument/CFItem/CFAssociation in CASE 1.1.
 * - CFAssociation origin/destination Node URIs are LinkGenURI with optional targetType in 1.1.
 */
/** LinkURI shape appears throughout: { title, identifier, uri } */
export interface LinkURI {
  title?: string
  identifier?: string
  uri: string
}

/**
 * CASE 1.1: originNodeURI / destinationNodeURI allow "targetType" to indicate non-CASE targets.
 * Default is CASE; treated as open vocabulary.
 */
export interface LinkGenURI extends LinkURI {
  targetType?: string
}

/** Extensions are explicitly allowed in CASE 1.1 for multiple entities. */
export type CaseExtensions = Record<string, unknown>

/** ========== Core package container ========== */
export interface CFPackage {
  CFDocument: CFDocument
  CFItems?: CFItem[]
  CFAssociations?: CFAssociation[]
  CFDefinitions?: CFDefinition
  CFRubrics?: CFRubric[]
  extensions?: CaseExtensions
}

/** ========== CFDocument (framework) ========== */
export interface CFDocument {
  identifier: string
  uri: string
  creator: string
  title: string

  /** 1.1 additions */
  frameworkType?: string
  caseVersion?: string

  /** Common optional metadata */
  description?: string
  notes?: string
  language?: string
  version?: string
  adoptionStatus?: string

  /** lifecycle */
  statusStartDate?: string
  statusEndDate?: string

  /** licensing */
  licenseURI?: LinkURI

  lastChangeDateTime: string

  /** Link back to containing package */
  CFPackageURI: LinkURI

  extensions?: CaseExtensions
}

/** ========== CFItem (node) ========== */
export interface CFItem {
  identifier: string
  uri: string

  /** Required in package item container */
  fullStatement: string

  alternativeLabel?: string
  CFItemType?: string
  CFItemTypeURI?: LinkURI

  humanCodingScheme?: string
  listEnumeration?: string
  abbreviatedStatement?: string

  conceptKeywords?: string[]
  conceptKeywordsURI?: LinkURI

  notes?: string

  /** 1.1: subject / subjectURI can vary per item (not only per document). */
  subject?: string[]
  subjectURI?: LinkURI[]

  language?: string
  educationLevel?: string[]

  licenseURI?: LinkURI
  statusStartDate?: string
  statusEndDate?: string

  lastChangeDateTime: string

  /**
   * When CFItem is exchanged outside CFPackage, it includes CFDocumentURI.
   * Some APIs include it in package too; keep optional to be tolerant.
   */
  CFDocumentURI?: LinkURI

  /** Editor-only: visual color band hex color, persisted in ext:opencase */
  colorBand?: string

  extensions?: CaseExtensions
}

/** ========== CFAssociation (edge) ========== */
export interface CFAssociation {
  identifier: string
  associationType: string
  uri: string
  originNodeURI: LinkGenURI
  destinationNodeURI: LinkGenURI
  sequenceNumber?: number
  CFAssociationGroupingURI?: LinkURI
  lastChangeDateTime: string
  notes?: string
  CFDocumentURI?: LinkURI
  extensions?: CaseExtensions
}

/** ========== CFDefinitions (lookup sets) ========== */
export interface CFDefinition {
  CFConcepts?: CFConcept[]
  CFSubjects?: CFSubject[]
  CFLicenses?: CFLicense[]
  CFItemTypes?: CFItemType[]
  CFAssociationGroupings?: CFAssociationGrouping[]
  extensions?: CaseExtensions
}

export interface CFConcept {
  identifier: string
  uri: string
  title?: string
  description?: string
  hierarchyCode?: string
  lastChangeDateTime?: string
  keywords?: string[]
  extensions?: CaseExtensions
}

export interface CFSubject {
  identifier: string
  uri: string
  title?: string
  description?: string
  hierarchyCode?: string
  lastChangeDateTime?: string
  extensions?: CaseExtensions
}

export interface CFLicense {
  identifier: string
  uri: string
  title?: string
  description?: string
  licenseText?: string
  extensions?: CaseExtensions
}

export interface CFItemType {
  identifier: string
  uri: string
  title?: string
  description?: string
  hierarchyCode?: string
  /** A code used for type identification (CASE v1.1) */
  typeCode?: string
  lastChangeDateTime?: string
  extensions?: CaseExtensions
}

export interface CFAssociationGrouping {
  identifier: string
  uri: string
  title?: string
  description?: string
  extensions?: CaseExtensions
}

/** Rubrics exist in CFPackage; keep as placeholder until you decide to author them in-app. */
export interface CFRubric {
  identifier: string
  uri: string
  title?: string
  description?: string
  extensions?: CaseExtensions
}

