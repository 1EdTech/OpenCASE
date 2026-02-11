import type { CSSProperties } from 'react'
import { MarkerType } from '@xyflow/react'
import type { CFDocument, CFItem } from '@/domain/case/types'
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/reactflow/types'

export type EditorGraph = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
}

/** Default arrow marker for edges - solid filled arrow */
export const DEFAULT_EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: '#94a3b8', // slate-400
}

/** Small outline arrow marker for isPartOf relationships */
export const PART_OF_EDGE_MARKER = {
  type: MarkerType.Arrow, // Open/outline arrow
  width: 12,
  height: 12,
  color: '#94a3b8', // slate-400
}

/** Marker for framework root connections (startsFrom) - points to destination */
export const FRAMEWORK_ROOT_EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color: '#94a3b8', // slate-400 (same as other edges)
}

/** Get edge markers based on association type
 * 
 * CASE association semantics:
 * - isChildOf: origin IS CHILD OF destination (arrow points to destination/parent)
 * - isPartOf: destination IS PART OF origin (arrow points to origin - reversed!)
 * - precedes: origin PRECEDES destination (arrow points to destination)
 * - isRelatedTo: bidirectional relationship (arrows both ways)
 * 
 * For isPartOf, the visual reads: "X is part of Y" where arrow points FROM X TO Y,
 * meaning markerStart shows the "part" pointing back to its "whole".
 * 
 * LOCAL-ONLY:
 * - __startsFrom: Framework root visualization - arrow points FROM framework TO item
 */
export function getEdgeMarkers(associationType: string) {
  // Framework root connection: arrow points from framework (source) to item (target)
  if (associationType === FRAMEWORK_ROOT_ASSOCIATION_TYPE) {
    return {
      markerStart: undefined,
      markerEnd: FRAMEWORK_ROOT_EDGE_MARKER, // Arrow at end, pointing to the item
    }
  }

  // isRelatedTo is bidirectional - arrows on both ends
  if (associationType === 'isRelatedTo') {
    return {
      markerStart: DEFAULT_EDGE_MARKER,
      markerEnd: DEFAULT_EDGE_MARKER,
    }
  }

  // exactMatchOf is bidirectional - arrows on both ends (A ↔ B)
  if (associationType === 'exactMatchOf') {
    return {
      markerStart: DEFAULT_EDGE_MARKER,
      markerEnd: DEFAULT_EDGE_MARKER,
    }
  }

  // isPartOf: arrow points to origin (the whole that the part belongs to)
  // Uses small outline arrow style
  if (associationType === 'isPartOf') {
    return {
      markerStart: PART_OF_EDGE_MARKER, // Arrow at start, pointing back to origin
      markerEnd: undefined,
    }
  }

  // All other directional types: arrow at END pointing to destination
  return {
    markerStart: undefined,
    markerEnd: DEFAULT_EDGE_MARKER,
  }
}

/** Get edge style based on association type */
export function getEdgeStyle(associationType: string): CSSProperties {
  // Framework root connection: dotted style, same grey color as others
  if (associationType === FRAMEWORK_ROOT_ASSOCIATION_TYPE) {
    return {
      strokeDasharray: '3,3',
      strokeWidth: 1.5,
    }
  }

  // exactMatchOf uses dotted line style (bidirectional equivalence)
  if (associationType === 'exactMatchOf') {
    return {
      strokeDasharray: '2,4',
      strokeWidth: 1.5,
    }
  }

  // isPartOf uses dashed line style
  if (associationType === 'isPartOf') {
    return {
      strokeDasharray: '5,5',
      strokeWidth: 1.5,
    }
  }
  
  // Default solid line
  return {
    strokeWidth: 1.5,
  }
}

/** Format association type for display as edge label */
export function formatAssociationType(associationType: string): string {
  // Convert camelCase to readable format
  switch (associationType) {
    case FRAMEWORK_ROOT_ASSOCIATION_TYPE: return 'starts'
    case 'isChildOf': return 'child of'
    case 'isPartOf': return 'part of'
    case 'isRelatedTo': return 'related to'
    case 'isPeerOf': return 'peer of'
    case 'precedes': return 'precedes'
    case 'exactMatchOf': return 'exact match'
    case 'isTranslationOf': return 'translation of'
    default: return associationType
  }
}

/** Create edge label string - with optional sequence number */
export function makeEdgeLabel(associationType: string, sequenceNumber?: number): string {
  const typeLabel = formatAssociationType(associationType)
  
  // If no sequence number, just return the simple string label
  if (sequenceNumber === undefined || sequenceNumber === null) {
    return typeLabel
  }
  
  // With sequence number, format as "# · type"
  return `${sequenceNumber} · ${typeLabel}`
}

const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 140
const HEADER_SAFE_Y = 96
const FRAMEWORK_HEIGHT = 160
const NODE_VERTICAL_GAP = 120

const nowIso = () => new Date().toISOString()

export const makeCfItem = (id: string, fullStatement: string, extras?: Partial<CFItem>): CFItem => ({
  identifier: id,
  uri: `urn:case:item:${id}`,
  fullStatement,
  lastChangeDateTime: nowIso(),
  ...extras,
})

export const makeCfDocument = (id: string, title: string, extras?: Partial<CFDocument>): CFDocument => ({
  identifier: id,
  uri: `urn:case:document:${id}`,
  creator: 'District Curriculum Team',
  title,
  lastChangeDateTime: nowIso(),
  CFPackageURI: { uri: `urn:case:package:${id}` },
  caseVersion: '1.1',
  ...extras,
})

const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'

export function createEmptyFrameworkGraph(params: {
  id: string
  title: string
  frameworkType?: string
  adoptionStatus?: string
  description?: string
  creator?: string
}): EditorGraph {
  const cfDocument = makeCfDocument(params.id, params.title, {
    frameworkType: params.frameworkType,
    adoptionStatus: params.adoptionStatus,
    description: params.description,
    creator: params.creator,
  })

  const fwNode: CaseFrameworkNodeType = {
    id: params.id,
    type: 'caseFrameworkNode',
    position: { x: 0, y: HEADER_SAFE_Y },
    style: { width: 400, height: FRAMEWORK_HEIGHT },
    data: { cfDocument },
    className: wrapperNodeClassName,
  }

  return { nodes: [fwNode], edges: [] }
}

export function createSampleGraph(): EditorGraph {
  const fwId = 'fw1'

  // Calculate node Y positions with consistent spacing
  const node1Y = HEADER_SAFE_Y + FRAMEWORK_HEIGHT + NODE_VERTICAL_GAP
  const node2Y = node1Y + DEFAULT_NODE_HEIGHT + NODE_VERTICAL_GAP
  const node3Y = node2Y + DEFAULT_NODE_HEIGHT + NODE_VERTICAL_GAP

  const nodes: CaseEditorNodeType[] = [
    {
      id: fwId,
      type: 'caseFrameworkNode',
      // Start below the floating header so it is visible on first load.
      position: { x: 0, y: HEADER_SAFE_Y },
      style: { width: 400, height: FRAMEWORK_HEIGHT },
      data: {
        cfDocument: makeCfDocument('fw1', 'Grade 3–5 Mathematics (Draft)', {
          frameworkType: 'K-12',
          adoptionStatus: 'Draft',
          description: 'A draft set of math expectations focused on number and operations (grades 3–5).',
        }),
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n1',
      type: 'caseItemNode',
      // Leave enough room between nodes so edges are visible.
      position: { x: 0, y: node1Y },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n1', 'Understand and use place value to round whole numbers to any place.', {
          humanCodingScheme: '3.NBT.A.1',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 3'],
          conceptKeywords: ['place value', 'rounding'],
          alternativeLabel: 'Rounding whole numbers (place value)',
        }),
        parentId: fwId,
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n2',
      type: 'caseItemNode',
      position: { x: 0, y: node2Y },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n2', 'Explain patterns in the number of zeros of the product when multiplying by powers of 10.', {
          humanCodingScheme: '3.NBT.A.2',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 3'],
          conceptKeywords: ['powers of ten', 'patterns', 'multiplication'],
        }),
        parentId: 'n1',
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n3',
      type: 'caseItemNode',
      position: { x: 0, y: node3Y },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n3', 'Use place value understanding to round decimals to a specified place.', {
          humanCodingScheme: '5.NBT.A.4',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 5'],
          conceptKeywords: ['decimals', 'rounding', 'place value'],
        }),
        parentId: 'n2',
      },
      className: wrapperNodeClassName,
    },
  ]

  // Edge goes child → parent, arrow at parent shows "child is child OF parent"
  // No explicit handles - let React Flow route naturally
  const defaultLabelStyle = { fill: '#94a3b8', fontSize: 11, fontWeight: 500 }
  const edges: CaseEditorEdge[] = [
    { id: 'n1-fw1', source: 'n1', target: 'fw1', markerEnd: DEFAULT_EDGE_MARKER, label: makeEdgeLabel('isChildOf'), labelStyle: defaultLabelStyle, data: { isHierarchical: true, associationType: 'isChildOf' } },
    { id: 'n2-n1', source: 'n2', target: 'n1', markerEnd: DEFAULT_EDGE_MARKER, label: makeEdgeLabel('isChildOf'), labelStyle: defaultLabelStyle, data: { isHierarchical: true, associationType: 'isChildOf' } },
    { id: 'n3-n2', source: 'n3', target: 'n2', markerEnd: DEFAULT_EDGE_MARKER, label: makeEdgeLabel('isChildOf'), labelStyle: defaultLabelStyle, data: { isHierarchical: true, associationType: 'isChildOf' } },
  ]

  return { nodes, edges }
}

/**
 * @deprecated Use FrameworkLoader + toReactFlowGraph instead.
 *
 * This function was removed as part of the DDD refactor. The proper flow is now:
 * 1. Use FrameworkLoader.loadFromCfPackage() to get a domain Framework
 * 2. Use toReactFlowGraph({ framework }) to convert to EditorGraph
 *
 * This ensures the domain Framework is the source of truth and CASE version
 * differences are handled in the application layer, not the UI.
 */
// export function createGraphFromCfPackage - REMOVED
