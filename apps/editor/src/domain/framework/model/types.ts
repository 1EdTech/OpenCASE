import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

export type FrameworkStatus = 'Draft' | 'Published'

export type ItemType = 'Standard' | 'LearningOutcome' | 'Competency' | 'Skill'

export type AssociationType =
  | 'isChildOf'
  | 'isPartOf'
  | 'isRelatedTo'
  | 'isPeerOf'
  | 'exactMatchOf'
  | 'precedes'
  | 'isReplacedBy'

export type FrameworkMetadata = {
  title?: string
  description?: string
  creator?: string
  /** Original CASE document URI (preserved for round-trip fidelity) */
  caseUri?: string
  /** Entity that publishes / distributes the framework */
  publisher?: string
  frameworkType?: string
  adoptionStatus?: string
  caseVersion?: string
  version?: string
  /** Document language (e.g. "en") */
  language?: string
  /** Free-text notes about the framework */
  notes?: string
  /** URL to the official source document */
  officialSourceURL?: string
  /** Document-level subject */
  subject?: string[]
  subjectURI?: Array<{ title?: string; identifier?: string; uri: string }>
  /** Lifecycle dates */
  statusStartDate?: string
  statusEndDate?: string
  lastChangeDateTime?: string
  /** CASE licenseURI — link to the CFLicense governing this framework */
  licenseURI?: { title?: string; identifier?: string; uri: string }
}

export type ItemMetadata = Record<string, unknown>

export type AssociationMetadata = {
  /** Original CASE association URI — preserved for round-trip fidelity */
  caseUri?: string
  /** Canonical URI of the origin (from) item — must be preserved verbatim for cross-framework associations */
  originUri?: string
  /** Canonical URI of the destination (to) item — must be preserved verbatim for cross-framework associations */
  destinationUri?: string
  sequenceNumber?: number
  /** Edge handle position on the origin node — persists user-defined anchor points */
  originHandle?: string
  /** Edge handle position on the destination node — persists user-defined anchor points */
  destinationHandle?: string
  CFAssociationGroupingIdentifier?: string
  CFAssociationGroupingTitle?: string
  notes?: string
  lastChangeDateTime?: string
  extensions?: Record<string, unknown>
  [key: string]: unknown
}

export type Item = {
  id: ItemId
  statement: string
  type: ItemType
  metadata?: ItemMetadata
}

export type Association = {
  id: AssociationId
  fromItemId: ItemId
  toItemId: ItemId
  associationType: AssociationType
  metadata?: AssociationMetadata
}

export type Framework = {
  id: FrameworkId
  metadata: FrameworkMetadata
  items: Map<ItemId, Item>
  associations: Map<AssociationId, Association>
  status: FrameworkStatus
}

