import type { Association, Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { getEdgeMarkers, makeEdgeLabel } from '@/ui/editor/state/editorFactories'
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'
import type { CFAssociation, CFDocument, CFItem } from '@/domain/case/types'
import type { LayoutState } from './types'

const DEFAULT_NODE_WIDTH = 360
const DEFAULT_NODE_HEIGHT = 220
const HEADER_SAFE_Y = 96

/**
 * Calculate the best handles for connecting two nodes based on their positions.
 * Returns the handles that create the shortest/cleanest edge path.
 */
function getClosestHandles(
  sourcePos: { x: number; y: number },
  sourceSize: { w: number; h: number },
  targetPos: { x: number; y: number },
  targetSize: { w: number; h: number }
): { sourceHandle: string; targetHandle: string } {
  const sourceCenter = { x: sourcePos.x + sourceSize.w / 2, y: sourcePos.y + sourceSize.h / 2 }
  const targetCenter = { x: targetPos.x + targetSize.w / 2, y: targetPos.y + targetSize.h / 2 }
  
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  
  if (absX > absY) {
    if (dx > 0) {
      return { sourceHandle: 'right', targetHandle: 'left' }
    } else {
      return { sourceHandle: 'left', targetHandle: 'right' }
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom', targetHandle: 'top' }
    } else {
      return { sourceHandle: 'top', targetHandle: 'bottom' }
    }
  }
}

const nowIso = () => new Date().toISOString()

function mapDomainFrameworkToCfDocument(framework: Framework): CFDocument {
  const meta = framework.metadata ?? {}
  const id = framework.id as unknown as string
  return {
    identifier: id,
    uri: `urn:case:document:${id}`,
    creator: meta.creator ?? 'District Curriculum Team',
    title: meta.title ?? 'Untitled framework',
    description: meta.description,
    frameworkType: meta.frameworkType,
    adoptionStatus: meta.adoptionStatus,
    caseVersion: meta.caseVersion,
    lastChangeDateTime: meta.lastChangeDateTime ?? nowIso(),
    CFPackageURI: { uri: `urn:case:package:${id}` },
  }
}

function mapDomainItemToCfItem(framework: Framework, itemId: string): CFItem {
  const item = framework.items.get(itemId as unknown as ItemId)
  // Defensive: if the caller asks for a missing item, return a minimal stub.
  const statement = item?.statement ?? ''
  const md = (item?.metadata ?? {}) as Record<string, unknown>
  const s = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : undefined)
  const a = (k: string) => (Array.isArray(md[k]) ? (md[k] as unknown[]).filter((x): x is string => typeof x === 'string') : undefined)

  return {
    identifier: itemId,
    uri: s('caseUri') ?? `urn:case:item:${itemId}`,
    fullStatement: statement,
    abbreviatedStatement: s('abbreviatedStatement'),
    alternativeLabel: s('alternativeLabel'),
    humanCodingScheme: s('humanCodingScheme'),
    CFItemType: s('CFItemType') ?? item?.type,
    subject: a('subject'),
    educationLevel: a('educationLevel'),
    conceptKeywords: a('conceptKeywords'),
    notes: s('notes'),
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    extensions: (md.extensions as Record<string, unknown> | undefined) ?? undefined,
    CFDocumentURI: { uri: `urn:case:document:${framework.id as unknown as string}` },
  }
}

function mapDomainAssociationToCfAssociation(framework: Framework, association: Association): CFAssociation {
  const fwId = framework.id as unknown as string
  const assocId = association.id as unknown as string
  const fromId = association.fromItemId as unknown as string
  const toId = association.toItemId as unknown as string
  const md = (association.metadata ?? {}) as Record<string, unknown>
  
  const s = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : undefined)
  const n = (k: string) => (typeof md[k] === 'number' ? (md[k] as number) : undefined)

  return {
    identifier: assocId,
    uri: s('caseUri') ?? `urn:case:association:${assocId}`,
    associationType: association.associationType,
    originNodeURI: {
      identifier: fromId,
      uri: s('originUri') ?? `urn:case:item:${fromId}`,
    },
    destinationNodeURI: {
      identifier: toId,
      uri: s('destinationUri') ?? `urn:case:item:${toId}`,
    },
    sequenceNumber: n('sequenceNumber'),
    notes: s('notes'),
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    CFDocumentURI: { uri: `urn:case:document:${fwId}` },
    extensions: (md.extensions as Record<string, unknown> | undefined) ?? undefined,
  }
}

const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'

function getLayout(layout: LayoutState | undefined, nodeId: string, fallback: { x: number; y: number; w: number; h: number }) {
  const entry = layout?.byNodeId?.[nodeId]
  return {
    position: { x: entry?.x ?? fallback.x, y: entry?.y ?? fallback.y },
    style: { width: entry?.w ?? fallback.w, height: entry?.h ?? fallback.h },
  }
}

/**
 * Project the domain framework graph into React Flow nodes/edges.
 *
 * The returned nodes use the existing CASE-shaped `cfDocument` / `cfItem` payloads
 * so we can migrate incrementally without rewriting all node/panel UI at once.
 */
export function toReactFlowGraph(params: { framework: Framework; layout?: LayoutState }): EditorGraph {
  const { framework, layout } = params
  const fwId = framework.id as unknown as string

  const cfDocument = mapDomainFrameworkToCfDocument(framework)

  const rootLayout = getLayout(layout, fwId, { x: 0, y: HEADER_SAFE_Y, w: 520, h: 210 })
  const fwNode: CaseFrameworkNodeType = {
    id: fwId,
    type: 'caseFrameworkNode',
    position: rootLayout.position,
    style: rootLayout.style,
    data: { cfDocument },
    className: wrapperNodeClassName,
  }

  const nodes: CaseEditorNodeType[] = [fwNode]
  const edges: CaseEditorEdge[] = []

  // Map child -> parent and track associations by their origin/destination for edge data
  const parentByChild = new Map<string, string>()
  const associationByEdgeKey = new Map<string, Association>()
  
  for (const a of framework.associations.values()) {
    const fromId = a.fromItemId as unknown as string
    const toId = a.toItemId as unknown as string
    if (!fromId || !toId) continue
    
    if (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') {
      parentByChild.set(fromId, toId)
    }
    // Store association by edge key (source_target) for lookup when creating edges
    associationByEdgeKey.set(`${toId}_${fromId}`, a) // For hierarchical: parent -> child
    associationByEdgeKey.set(`${fromId}_${toId}`, a) // For non-hierarchical: from -> to
  }

  const itemIds = Array.from(framework.items.keys()).map((x) => x as unknown as string).sort((a, b) => a.localeCompare(b))
  let y = HEADER_SAFE_Y + 210 + 140

  for (const itemId of itemIds) {
    const parentId = parentByChild.get(itemId) ?? fwId
    const cfItem = mapDomainItemToCfItem(framework, itemId)

    const itemLayout = getLayout(layout, itemId, { x: 0, y, w: DEFAULT_NODE_WIDTH, h: DEFAULT_NODE_HEIGHT })
    const node: CaseItemNodeType = {
      id: itemId,
      type: 'caseItemNode',
      position: itemLayout.position,
      style: itemLayout.style,
      data: { cfItem, parentId },
      className: wrapperNodeClassName,
    }
    nodes.push(node)
    y += DEFAULT_NODE_HEIGHT + 100
  }

  const defaultLabelStyle = { fill: '#94a3b8', fontSize: 11, fontWeight: 500 }
  
  // Build a position map for calculating closest handles
  const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const node of nodes) {
    nodePositions.set(node.id, { 
      x: node.position.x, 
      y: node.position.y,
      w: DEFAULT_NODE_WIDTH,
      h: DEFAULT_NODE_HEIGHT
    })
  }

  // Hierarchy edges: visually flow parent → child
  // Semantic relationship: child isChildOf parent
  // Arrow points to child (markerEnd on target)
  for (const itemId of itemIds) {
    const parentId = parentByChild.get(itemId) ?? fwId
    const association = associationByEdgeKey.get(`${parentId}_${itemId}`) ?? associationByEdgeKey.get(`${itemId}_${parentId}`)
    const cfAssociation = association ? mapDomainAssociationToCfAssociation(framework, association) : undefined
    const md = (association?.metadata ?? {}) as Record<string, unknown>
    const assocType = association?.associationType ?? 'isChildOf'
    const seqNum = typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined
    const markers = getEdgeMarkers(assocType)
    
    // Calculate closest handles based on node positions
    const parentPos = nodePositions.get(parentId)
    const childPos = nodePositions.get(itemId)
    const handles = parentPos && childPos
      ? getClosestHandles(
          { x: parentPos.x, y: parentPos.y },
          { w: parentPos.w, h: parentPos.h },
          { x: childPos.x, y: childPos.y },
          { w: childPos.w, h: childPos.h }
        )
      : { sourceHandle: 'bottom', targetHandle: 'top' } // Default fallback
    
    edges.push({
      id: `e_${parentId}_${itemId}`,
      source: parentId,      // Visual: edge starts at parent
      target: itemId,        // Visual: edge ends at child (arrow points here)
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: makeEdgeLabel(assocType, seqNum),
      labelStyle: defaultLabelStyle,
      ...markers,
      data: {
        cfAssociation,
        isHierarchical: true,
        associationType: assocType,
        sequenceNumber: seqNum,
        // Track semantic origin/destination
        semanticOrigin: itemId,
        semanticDestination: parentId,
      },
    })
  }

  // Non-hierarchical associations as edges (source=from, target=to).
  for (const a of framework.associations.values()) {
    if (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') continue
    const fromId = a.fromItemId as unknown as string
    const toId = a.toItemId as unknown as string
    if (!fromId || !toId) continue
    
    const cfAssociation = mapDomainAssociationToCfAssociation(framework, a)
    const md = (a.metadata ?? {}) as Record<string, unknown>
    const seqNum = typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined
    const markers = getEdgeMarkers(a.associationType)
    
    // Calculate closest handles based on node positions
    const fromPos = nodePositions.get(fromId)
    const toPos = nodePositions.get(toId)
    const handles = fromPos && toPos
      ? getClosestHandles(
          { x: fromPos.x, y: fromPos.y },
          { w: fromPos.w, h: fromPos.h },
          { x: toPos.x, y: toPos.y },
          { w: toPos.w, h: toPos.h }
        )
      : { sourceHandle: 'right', targetHandle: 'left' } // Default fallback
    
    edges.push({
      id: a.id as unknown as string,
      source: fromId,
      target: toId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: makeEdgeLabel(a.associationType, seqNum),
      labelStyle: defaultLabelStyle,
      ...markers,
      data: {
        cfAssociation,
        isHierarchical: false,
        associationType: a.associationType,
        sequenceNumber: seqNum,
      },
    })
  }

  // Ensure all edges reference existing nodes.
  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const safeEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))

  return { nodes: nodes as CaseEditorNodeType[], edges: safeEdges }
}

