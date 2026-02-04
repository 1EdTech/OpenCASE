import type { Edge, Node } from '@xyflow/react'
import type { CFAssociation, CFDocument, CFItem } from '@/domain/case/types'

export type CaseItemNodeData = {
  cfItem: CFItem
  parentId?: string
  onAddChild?: (_parentId: string) => void
  onUpdateItem?: (_nodeId: string, _patch: Partial<CFItem>) => void
}

export type CaseItemNodeType = Node<CaseItemNodeData, 'caseItemNode'>

export type CaseFrameworkNodeData = {
  cfDocument: CFDocument
  onAddChild?: (_frameworkNodeId: string) => void
  onUpdateDocument?: (_nodeId: string, _patch: Partial<CFDocument>) => void
}

export type CaseFrameworkNodeType = Node<CaseFrameworkNodeData, 'caseFrameworkNode'>

/** Data for external/remote framework reference nodes */
export type ExternalFrameworkNodeData = {
  /** Title of the external framework */
  title: string
  /** URI or identifier of the external framework */
  uri?: string
  /** Description or notes about this external reference */
  description?: string
  /** Source system or origin (e.g., "OpenCASE", "State Standards") */
  source?: string
}

export type ExternalFrameworkNodeType = Node<ExternalFrameworkNodeData, 'externalFrameworkNode'>

export type CaseEditorNodeData = CaseItemNodeData | CaseFrameworkNodeData | ExternalFrameworkNodeData
export type CaseEditorNodeType = CaseItemNodeType | CaseFrameworkNodeType | ExternalFrameworkNodeType

export type CaseItemNodeDataPatch = Partial<Omit<CaseItemNodeData, 'cfItem'>> & {
  cfItem?: Partial<CFItem>
}

export type CaseFrameworkNodeDataPatch = Partial<Omit<CaseFrameworkNodeData, 'cfDocument'>> & {
  cfDocument?: Partial<CFDocument>
}

export type ExternalFrameworkNodeDataPatch = Partial<ExternalFrameworkNodeData>

export type CaseEditorNodeDataPatch = CaseItemNodeDataPatch | CaseFrameworkNodeDataPatch | ExternalFrameworkNodeDataPatch

// ========== Edge Types ==========

/**
 * CASE association types from the CASE 1.1 specification.
 * These are the standard types plus an extension pattern for custom types.
 */
export const CASE_ASSOCIATION_TYPES = [
  'isChildOf',
  'isPeerOf',
  'isPartOf',
  'exactMatchOf',
  'precedes',
  'isRelatedTo',
  'isTranslationOf',
] as const

export type CaseAssociationType = (typeof CASE_ASSOCIATION_TYPES)[number] | `ext:${string}` | string

/**
 * Data attached to ReactFlow edges representing CASE associations.
 */
export type CaseEdgeData = {
  /** The full CFAssociation DTO when available */
  cfAssociation?: CFAssociation
  /** Whether this is a hierarchical relationship (isChildOf/isPartOf) used for layout */
  isHierarchical?: boolean
  /** Association type for quick access */
  associationType?: CaseAssociationType
  /** Sequence number for ordering */
  sequenceNumber?: number
}

export type CaseEditorEdge = Edge<CaseEdgeData>

export type CaseEdgeDataPatch = Partial<Omit<CaseEdgeData, 'cfAssociation'>> & {
  cfAssociation?: Partial<CFAssociation>
}
