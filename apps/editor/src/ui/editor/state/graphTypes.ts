import type { CFAssociation, CFDocument, CFItem } from '@/domain/case/types'

/**
 * The editor's in-memory graph: one node for the framework's CFDocument, one
 * per CFItem, and an edge per association between them. The Tree View,
 * properties panel, and save all read it. It has no layout: nodes carry no
 * position or size.
 */

type GraphNode<TData, TType extends string> = {
  id: string
  type: TType
  data: TData
}

export type CaseItemNodeData = {
  cfItem: CFItem
  parentId?: string
}

export type CaseItemNodeType = GraphNode<CaseItemNodeData, 'caseItemNode'>

export type CaseFrameworkNodeData = {
  cfDocument: CFDocument
}

export type CaseFrameworkNodeType = GraphNode<CaseFrameworkNodeData, 'caseFrameworkNode'>

export type CaseEditorNodeData = CaseItemNodeData | CaseFrameworkNodeData
export type CaseEditorNodeType = CaseItemNodeType | CaseFrameworkNodeType

export type CaseItemNodeDataPatch = Partial<Omit<CaseItemNodeData, 'cfItem'>> & {
  cfItem?: Partial<CFItem>
}

export type CaseFrameworkNodeDataPatch = Partial<Omit<CaseFrameworkNodeData, 'cfDocument'>> & {
  cfDocument?: Partial<CFDocument>
}

export type CaseEditorNodeDataPatch = CaseItemNodeDataPatch | CaseFrameworkNodeDataPatch

export const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'
export const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'

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
 * Editor-only association type for the edge from the framework to a top-level
 * item. It is not a CASE association type: such an item is saved as
 * `isChildOf` the CFDocument.
 *
 * The double underscore prefix indicates this is internal/local-only.
 */
export const FRAMEWORK_ROOT_ASSOCIATION_TYPE = '__startsFrom' as const

export type CaseAssociationType = (typeof CASE_ASSOCIATION_TYPES)[number] | typeof FRAMEWORK_ROOT_ASSOCIATION_TYPE | `ext:${string}` | string

/** Data attached to an edge, which represents a CASE association. */
export type CaseEdgeData = {
  /** The full CFAssociation DTO when available */
  cfAssociation?: CFAssociation
  /** Whether this is a hierarchical relationship (isChildOf/isPartOf) */
  isHierarchical?: boolean
  /** Association type for quick access */
  associationType?: CaseAssociationType
  /** Sequence number for ordering */
  sequenceNumber?: number
  /**
   * True for the edge from the framework to a top-level item. It uses the
   * __startsFrom type, which can't be changed.
   */
  isFrameworkRootConnection?: boolean
  /** The origin node of the CASE association (the child, for a hierarchical edge). */
  semanticOrigin?: string
  /** The destination node of the CASE association (the parent, for a hierarchical edge). */
  semanticDestination?: string
}

/**
 * An association between two nodes of the graph. A hierarchical edge runs
 * parent (source) to child (target); any other runs origin to destination.
 */
export type CaseEditorEdge = {
  id: string
  source: string
  target: string
  data?: CaseEdgeData
}

export type CaseEdgeDataPatch = Partial<Omit<CaseEdgeData, 'cfAssociation'>> & {
  cfAssociation?: Partial<CFAssociation>
}
