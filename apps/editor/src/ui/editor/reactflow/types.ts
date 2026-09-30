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
  /** Stable ref id for persistence (linkedFrameworks[].id) */
  refId: string
  /** Title of the external framework */
  title: string
  /** URI or identifier of the external framework */
  uri?: string
  /** Description or notes about this external reference */
  description?: string
  /** Source system or origin (e.g., publisher name) */
  source?: string
  /** CASE Global coalition registry ID */
  cgeFrameworkId?: string
  /** OpenCASE doc id of the read-only cached CFPackage */
  cacheDocId?: string
  /** Theme color for this framework (border, link bars) */
  color: string
  sourceUri?: string
  itemCount?: number
  cachedAt?: string
  /** When true, refresh/import fetches omit the CGE bearer token on the publisher host. */
  skipPublisherAuth?: boolean
  /** User-facing message when publisher cache download or refresh failed. */
  cacheError?: string | null
  /** Transient UI flag while a cache download/refresh is in progress. */
  cacheLoading?: boolean
  /** Injected by EditorContext — avoids useEditor() inside React Flow node components. */
  onRemoveRemoteFramework?: (_nodeId: string) => void
  onOpenExternalFrameworkSettings?: (_nodeId: string) => void
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

/**
 * Local-only association type for framework-to-item visualization.
 * This is NOT a real CASE association type - it's purely for UI purposes.
 * The framework node is a visualization construct, and this edge type
 * represents the "starting point" connection to top-level items.
 * 
 * The double underscore prefix indicates this is internal/local-only.
 */
export const FRAMEWORK_ROOT_ASSOCIATION_TYPE = '__startsFrom' as const

export type CaseAssociationType = (typeof CASE_ASSOCIATION_TYPES)[number] | typeof FRAMEWORK_ROOT_ASSOCIATION_TYPE | `ext:${string}` | string

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
  /** 
   * True if this is a framework root connection (visual-only, not a real CASE association).
   * These edges use the __startsFrom type and cannot have their type changed.
   */
  isFrameworkRootConnection?: boolean
  /**
   * The semantic origin node ID (for tracking actual CASE association direction).
   * May differ from visual source/target for better UX.
   */
  semanticOrigin?: string
  /**
   * The semantic destination node ID (for tracking actual CASE association direction).
   * May differ from visual source/target for better UX.
   */
  semanticDestination?: string
  /**
   * Hint for where to position the edge label along the path.
   * 'center' (default) = midpoint; 'target' = biased toward the target node.
   */
  labelPosition?: 'center' | 'target'
  /**
   * Per-edge path style override. When set, takes priority over the
   * framework-level edgeType in settings. Used by layout modes (e.g.
   * hierarchy sets 'smoothstep', star clears to undefined for bezier).
   */
  edgeType?: string
  /**
   * Visual offset index for parallel edges between the same node pair.
   * Used only for rendering (not persisted into CASE semantics).
   */
  parallelIndex?: number
  /**
   * Count of parallel edges between the same node pair.
   * Used only for rendering (not persisted into CASE semantics).
   */
  parallelCount?: number
  /** True when this edge is a derived projection of a remoteItemLink */
  isRemoteLink?: boolean
  /** Underlying remote link id (for delete / properties) */
  remoteLinkId?: string
}

export type CaseEditorEdge = Edge<CaseEdgeData>

export type CaseEdgeDataPatch = Partial<Omit<CaseEdgeData, 'cfAssociation'>> & {
  cfAssociation?: Partial<CFAssociation>
}
