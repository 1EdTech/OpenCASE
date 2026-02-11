import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Connection, EdgeChange, NodeChange, OnSelectionChangeFunc } from '@xyflow/react'
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type {
  CaseEdgeDataPatch,
  CaseEditorEdge,
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseFrameworkNodeType,
  CaseItemNodeData,
  CaseItemNodeType,
  ExternalFrameworkNodeType,
  ExternalFrameworkNodeData,
} from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem } from '@/domain/case/types'
import type { AddItemDraft } from '@/ui/editor/components/AddItemDialog'
import type { EditorSettings } from '@/ui/editor/components/SettingsModal'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { createSampleGraph, DEFAULT_EDGE_MARKER, getEdgeMarkers, getEdgeStyle, makeCfItem, makeEdgeLabel } from '@/ui/editor/state/editorFactories'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/reactflow/types'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'

const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 140
const NODE_GAP_X = 36
const NODE_GAP_Y = 100  // Vertical gap for non-overlapping positioning
// Layout tuning: keep edges readable without large "wasted" whitespace.
const TREE_GAP_X = 40
const TREE_GAP_Y = 100  // Vertical gap between parent/child for edge visibility
const HEADER_SAFE_Y = 96

// Hierarchy-layout specific constants
const HIERARCHY_INDENT = 120  // How far right item column is offset from framework center
const HIERARCHY_GAP_Y = 40   // Vertical gap between items in hierarchy column

const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'
const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'

/**
 * Calculate the best handles for connecting two nodes based on their positions.
 * Returns the handles that create the shortest/cleanest edge path.
 * 
 * For isChildOf edges: source=child, target=parent
 * The edge should exit the child from the side FACING the parent,
 * and enter the parent from the side FACING the child.
 */
function getClosestHandles(
  sourcePos: { x: number; y: number },
  sourceSize: { w: number; h: number },
  targetPos: { x: number; y: number },
  targetSize: { w: number; h: number }
): { sourceHandle: string; targetHandle: string } {
  // Calculate centers
  const sourceCenter = { x: sourcePos.x + sourceSize.w / 2, y: sourcePos.y + sourceSize.h / 2 }
  const targetCenter = { x: targetPos.x + targetSize.w / 2, y: targetPos.y + targetSize.h / 2 }
  
  // Calculate delta: how to get FROM source TO target
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  
  // Determine if horizontal or vertical connection is shorter
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  
  if (absX > absY) {
    // Horizontal connection is primary
    if (dx > 0) {
      // Target (parent) is to the RIGHT of source (child)
      // Child exits from RIGHT, parent receives on LEFT
      return { sourceHandle: 'right', targetHandle: 'left' }
    } else {
      // Target (parent) is to the LEFT of source (child)
      // Child exits from LEFT, parent receives on RIGHT
      return { sourceHandle: 'left', targetHandle: 'right' }
    }
  } else {
    // Vertical connection is primary
    if (dy > 0) {
      // Target (parent) is BELOW source (child)
      // Child exits from BOTTOM, parent receives on TOP
      return { sourceHandle: 'bottom', targetHandle: 'top' }
    } else {
      // Target (parent) is ABOVE source (child)
      // Child exits from TOP, parent receives on BOTTOM
      return { sourceHandle: 'top', targetHandle: 'bottom' }
    }
  }
}

const getNodeSize = (n: CaseEditorNodeType) => {
  const anyNode = n as unknown as {
    measured?: { width?: number; height?: number }
    width?: number
    height?: number
    style?: { width?: number | string; height?: number | string }
  }

  const measuredW = anyNode.measured?.width
  const measuredH = anyNode.measured?.height
  if (typeof measuredW === 'number' && typeof measuredH === 'number') return { w: measuredW, h: measuredH }

  const styleW = anyNode.style?.width
  const styleH = anyNode.style?.height
  const w = (typeof anyNode.width === 'number' ? anyNode.width : undefined) ?? (typeof styleW === 'number' ? styleW : undefined) ?? DEFAULT_NODE_WIDTH
  const h =
    (typeof anyNode.height === 'number' ? anyNode.height : undefined) ?? (typeof styleH === 'number' ? styleH : undefined) ?? DEFAULT_NODE_HEIGHT

  return { w, h }
}

const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const findNonOverlappingPosition = (
  desired: { x: number; y: number },
  size: { w: number; h: number },
  nodes: CaseEditorNodeType[],
) => {
  const occupied = nodes.map((n) => {
    const s = getNodeSize(n)
    return { x: n.position.x, y: n.position.y, w: s.w, h: s.h }
  })

  const maxCols = 6
  for (let attempt = 0; attempt < 200; attempt++) {
    const col = attempt % maxCols
    const row = Math.floor(attempt / maxCols)
    const candidate = {
      x: desired.x + col * (size.w + NODE_GAP_X),
      y: desired.y + row * (size.h + NODE_GAP_Y),
    }

    const candRect = { x: candidate.x, y: candidate.y, w: size.w, h: size.h }
    const collides = occupied.some((r) => rectsOverlap(candRect, r))
    if (!collides) return candidate
  }

  return desired
}

const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'
const DEFAULT_GRAPH = createSampleGraph()

type EditorState = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  layoutVersion: number
  dirty: boolean
}

type Action =
  | { type: 'selection/setNode'; nodeId: string | null }
  | { type: 'selection/setEdge'; edgeId: string | null }
  | { type: 'selection/clear' }
  | { type: 'nodes/applyChanges'; changes: NodeChange<CaseEditorNodeType>[] }
  | { type: 'edges/applyChanges'; changes: EdgeChange[] }
  | { type: 'edges/connect'; connection: Connection }
  | { type: 'node/updateData'; nodeId: string; patch: CaseEditorNodeDataPatch }
  | { type: 'edge/updateData'; edgeId: string; patch: CaseEdgeDataPatch }
  | { type: 'edge/flip'; edgeId: string }
  | { type: 'edge/reconnect'; edgeId: string; newSource: string; newTarget: string; newSourceHandle?: string; newTargetHandle?: string }
  | { type: 'node/addChild'; parentId: string; childId: string; cfItem: CFItem }
  | { type: 'node/addDetachedItem'; nodeId: string; cfItem: CFItem; viewportCenter?: { x: number; y: number } }
  | { type: 'node/addExternalFramework'; nodeId: string; data: ExternalFrameworkNodeData; viewportCenter?: { x: number; y: number } }
  | { type: 'graph/delete'; nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }
  | { type: 'layout/apply'; positions: Record<string, { x: number; y: number }> }
  | { type: 'layout/applyHierarchy'; positions: Record<string, { x: number; y: number }>; edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }> }
  | { type: 'graph/load'; graph: EditorGraph }
  | { type: 'dirty/mark' }
  | { type: 'dirty/clear' }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'selection/setNode':
      return { ...state, selectedNodeId: action.nodeId, selectedEdgeId: null }
    case 'selection/setEdge':
      return { ...state, selectedEdgeId: action.edgeId, selectedNodeId: null }
    case 'selection/clear':
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        nodes: state.nodes.map((n) => ({ ...n, selected: false })),
        edges: state.edges.map((e) => ({ ...e, selected: false })),
      }
    case 'nodes/applyChanges': {
      // Only mark dirty for user-initiated changes (position, remove, add)
      // Ignore dimension changes (React Flow measuring) and select changes
      const hasDirtyChanges = action.changes.some(
        (c) => c.type === 'position' || c.type === 'remove' || c.type === 'add'
      )
      return {
        ...state,
        nodes: applyNodeChanges<CaseEditorNodeType>(action.changes, state.nodes),
        dirty: state.dirty || hasDirtyChanges,
      }
    }
    case 'edges/applyChanges': {
      // Only mark dirty for user-initiated changes (remove, add)
      // Ignore select changes
      const hasDirtyChanges = action.changes.some(
        (c) => c.type === 'remove' || c.type === 'add'
      )
      return {
        ...state,
        edges: applyEdgeChanges(action.changes, state.edges) as CaseEditorEdge[],
        dirty: state.dirty || hasDirtyChanges,
      }
    }
    case 'edges/connect': {
      const { source, target, sourceHandle, targetHandle } = action.connection
      if (!source || !target) return state
      
      // Check node types
      const sourceNode = state.nodes.find((n) => n.id === source)
      const targetNode = state.nodes.find((n) => n.id === target)
      
      const isSourceMainFramework = sourceNode?.type === 'caseFrameworkNode'
      const isTargetMainFramework = targetNode?.type === 'caseFrameworkNode'
      const isSourceExternalFramework = sourceNode?.type === 'externalFrameworkNode'
      const isTargetExternalFramework = targetNode?.type === 'externalFrameworkNode'
      const isSourceAnyFramework = isSourceMainFramework || isSourceExternalFramework
      const isTargetAnyFramework = isTargetMainFramework || isTargetExternalFramework
      
      // Prevent framework-to-framework connections
      if (isSourceAnyFramework && isTargetAnyFramework) {
        // Silently reject - framework nodes can only connect to items
        return state
      }
      
      // Determine association type:
      // - Main framework (caseFrameworkNode) uses __startsFrom (visual-only)
      // - External framework uses isPartOf
      // - Item-to-item uses isChildOf
      const involvesMainFramework = isSourceMainFramework || isTargetMainFramework
      const involvesExternalFramework = isSourceExternalFramework || isTargetExternalFramework
      
      let defaultAssocType: string
      if (involvesMainFramework) {
        defaultAssocType = FRAMEWORK_ROOT_ASSOCIATION_TYPE
      } else if (involvesExternalFramework) {
        defaultAssocType = 'isPartOf'
      } else {
        defaultAssocType = 'isChildOf'
      }
      
      // For main framework connections, ensure framework is always the source (origin)
      // and item is always the target (destination), regardless of drag direction
      let finalSource = source
      let finalTarget = target
      let finalSourceHandle = sourceHandle ?? undefined
      let finalTargetHandle = targetHandle ?? undefined
      
      if (involvesMainFramework && isTargetMainFramework) {
        // User dragged from item to main framework - swap so framework is source
        finalSource = target
        finalTarget = source
        finalSourceHandle = targetHandle ?? undefined
        finalTargetHandle = sourceHandle ?? undefined
      }
      
      const newEdge: CaseEditorEdge = {
        id: `e_${finalSource}_${finalTarget}_${Date.now()}`,
        source: finalSource,
        target: finalTarget,
        sourceHandle: finalSourceHandle,
        targetHandle: finalTargetHandle,
        label: makeEdgeLabel(defaultAssocType),
        labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
        style: getEdgeStyle(defaultAssocType),
        data: {
          isHierarchical: true,
          associationType: defaultAssocType,
          isFrameworkRootConnection: involvesMainFramework,
        },
        ...getEdgeMarkers(defaultAssocType),
      }
      return { ...state, edges: [...state.edges, newEdge], dirty: true }
    }
    case 'node/updateData': {
      const { nodeId, patch } = action
      const nodes = state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        if (isItemNode(n) && 'cfItem' in patch && patch.cfItem) {
          return { ...n, data: { ...n.data, ...patch, cfItem: { ...n.data.cfItem, ...patch.cfItem } } }
        }
        if (isFrameworkNode(n) && 'cfDocument' in patch && patch.cfDocument) {
          return { ...n, data: { ...n.data, ...patch, cfDocument: { ...n.data.cfDocument, ...patch.cfDocument } } }
        }
        // Handle external framework nodes - patch contains direct properties (title, uri, etc.)
        if (n.type === 'externalFrameworkNode') {
          return { ...n, data: { ...n.data, ...patch } }
        }
        return n
      })
      return { ...state, nodes, dirty: true }
    }
    case 'edge/updateData': {
      const { edgeId, patch } = action
      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e
        const currentData = e.data ?? {}
        const newData = { ...currentData }
        
        // Merge top-level edge data fields
        if (patch.associationType !== undefined) newData.associationType = patch.associationType
        if (patch.sequenceNumber !== undefined) newData.sequenceNumber = patch.sequenceNumber
        if (patch.isHierarchical !== undefined) newData.isHierarchical = patch.isHierarchical
        
        // Merge cfAssociation if provided
        if (patch.cfAssociation) {
          newData.cfAssociation = {
            ...(currentData.cfAssociation ?? {
              identifier: edgeId,
              uri: `urn:case:association:${edgeId}`,
              associationType: currentData.associationType ?? 'isChildOf',
              originNodeURI: { uri: '', identifier: e.source },
              destinationNodeURI: { uri: '', identifier: e.target },
              lastChangeDateTime: new Date().toISOString(),
            }),
            ...patch.cfAssociation,
            lastChangeDateTime: new Date().toISOString(),
          }
        }
        
        // Update markers, style, and label if association type or sequence number changed
        const finalAssocType = newData.associationType ?? currentData.associationType ?? 'isChildOf'
        const finalSeqNum = newData.sequenceNumber
        const markers = getEdgeMarkers(finalAssocType)
        const style = getEdgeStyle(finalAssocType)
        
        return { 
          ...e, 
          ...markers, 
          style,
          label: makeEdgeLabel(finalAssocType, finalSeqNum),
          data: newData 
        }
      })
      return { ...state, edges, dirty: true }
    }
    case 'edge/flip': {
      const { edgeId } = action
      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e
        
        // Swap source and target
        const newSource = e.target
        const newTarget = e.source
        
        // Update cfAssociation origin/destination if present
        const currentData = e.data ?? {}
        const cfAssoc = currentData.cfAssociation
        const newCfAssociation = cfAssoc ? {
          ...cfAssoc,
          originNodeURI: cfAssoc.destinationNodeURI,
          destinationNodeURI: cfAssoc.originNodeURI,
          lastChangeDateTime: new Date().toISOString(),
        } : undefined
        
        return {
          ...e,
          source: newSource,
          target: newTarget,
          // Swap handles if they exist
          sourceHandle: e.targetHandle,
          targetHandle: e.sourceHandle,
          data: {
            ...currentData,
            cfAssociation: newCfAssociation,
          },
        }
      })
      return { ...state, edges, dirty: true }
    }
    case 'edge/reconnect': {
      const { edgeId, newSource, newTarget, newSourceHandle, newTargetHandle } = action
      
      // Check node types
      const newSourceNode = state.nodes.find((n) => n.id === newSource)
      const newTargetNode = state.nodes.find((n) => n.id === newTarget)
      const isSourceMainFramework = newSourceNode?.type === 'caseFrameworkNode'
      const isTargetMainFramework = newTargetNode?.type === 'caseFrameworkNode'
      const isSourceExternalFramework = newSourceNode?.type === 'externalFrameworkNode'
      const isTargetExternalFramework = newTargetNode?.type === 'externalFrameworkNode'
      const isSourceAnyFramework = isSourceMainFramework || isSourceExternalFramework
      const isTargetAnyFramework = isTargetMainFramework || isTargetExternalFramework
      
      // Prevent framework-to-framework connections
      if (isSourceAnyFramework && isTargetAnyFramework) {
        return state // Reject the reconnection
      }
      
      // Determine association type
      const involvesMainFramework = isSourceMainFramework || isTargetMainFramework
      const involvesExternalFramework = isSourceExternalFramework || isTargetExternalFramework
      
      // For main framework connections, ensure framework is always the source (origin)
      let finalSource = newSource
      let finalTarget = newTarget
      let finalSourceHandle = newSourceHandle
      let finalTargetHandle = newTargetHandle
      
      if (involvesMainFramework && isTargetMainFramework) {
        // Swap so main framework is source
        finalSource = newTarget
        finalTarget = newSource
        finalSourceHandle = newTargetHandle
        finalTargetHandle = newSourceHandle
      }
      
      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e
        
        // Update the edge with new source/target while preserving all other data
        const currentData = e.data ?? {}
        const cfAssoc = currentData.cfAssociation
        
        // Determine the new association type
        let newAssocType: string
        if (involvesMainFramework) {
          newAssocType = FRAMEWORK_ROOT_ASSOCIATION_TYPE
        } else if (involvesExternalFramework) {
          newAssocType = 'isPartOf'
        } else {
          newAssocType = currentData.associationType ?? 'isChildOf'
        }
        
        // Update cfAssociation URIs if present (only for non-main-framework connections)
        const newCfAssociation = (!involvesMainFramework && cfAssoc) ? {
          ...cfAssoc,
          originNodeURI: { 
            ...cfAssoc.originNodeURI,
            identifier: finalSource 
          },
          destinationNodeURI: { 
            ...cfAssoc.destinationNodeURI,
            identifier: finalTarget 
          },
          lastChangeDateTime: new Date().toISOString(),
        } : undefined
        
        return {
          ...e,
          source: finalSource,
          target: finalTarget,
          sourceHandle: finalSourceHandle,
          targetHandle: finalTargetHandle,
          label: makeEdgeLabel(newAssocType),
          style: getEdgeStyle(newAssocType),
          ...getEdgeMarkers(newAssocType),
          data: {
            ...currentData,
            associationType: newAssocType,
            isFrameworkRootConnection: involvesMainFramework,
            cfAssociation: newCfAssociation,
          },
        }
      })
      return { ...state, edges, dirty: true }
    }
    case 'node/addChild': {
      const parent = state.nodes.find((n) => n.id === action.parentId)
      if (!parent) return state
      const childId = action.childId

      // Find the framework node to determine flow direction
      const frameworkNode = state.nodes.find((n) => isFrameworkNode(n))
      const frameworkCenter = frameworkNode 
        ? { 
            x: frameworkNode.position.x + (getNodeSize(frameworkNode).w / 2),
            y: frameworkNode.position.y + (getNodeSize(frameworkNode).h / 2)
          }
        : { x: 0, y: 0 }
      
      const parentSize = getNodeSize(parent)
      const parentCenter = {
        x: parent.position.x + (parentSize.w / 2),
        y: parent.position.y + (parentSize.h / 2)
      }
      
      // Calculate direction from framework to parent
      const dx = parentCenter.x - frameworkCenter.x
      const dy = parentCenter.y - frameworkCenter.y
      
      // Determine primary flow direction (which axis has larger displacement)
      const isHorizontalFlow = Math.abs(dx) > Math.abs(dy)
      
      // Find existing children of this parent
      const children = state.nodes.filter((n) => isItemNode(n) && n.data.parentId === action.parentId)
      
      const gap = 40
      const childGap = DEFAULT_NODE_WIDTH + 60
      
      let desiredPosition: { x: number; y: number }
      
      if (isHorizontalFlow) {
        // Horizontal flow: place child in same horizontal direction as parent from framework
        const directionX = dx >= 0 ? 1 : -1
        const childX = directionX > 0 
          ? parent.position.x + parentSize.w + gap  // Right of parent
          : parent.position.x - DEFAULT_NODE_WIDTH - gap  // Left of parent
        
        // Stack children vertically when flowing horizontally
        const existingChildYs = children.map((c) => c.position.y)
        const bottomMostY = existingChildYs.length 
          ? Math.max(...existingChildYs) + DEFAULT_NODE_HEIGHT + gap
          : parent.position.y
        
        desiredPosition = { x: childX, y: bottomMostY }
      } else {
        // Vertical flow: place child in same vertical direction as parent from framework
        const directionY = dy >= 0 ? 1 : -1
        const childY = directionY > 0
          ? parent.position.y + parentSize.h + gap  // Below parent
          : parent.position.y - DEFAULT_NODE_HEIGHT - gap  // Above parent
        
        // Stack children horizontally when flowing vertically
        const existingChildXs = children.map((c) => c.position.x)
        const rightMostX = existingChildXs.length 
          ? Math.max(...existingChildXs) + childGap
          : parent.position.x
        
        desiredPosition = { x: rightMostX, y: childY }
      }
      
      const childSize = { w: DEFAULT_NODE_WIDTH, h: DEFAULT_NODE_HEIGHT }
      const nextPosition = findNonOverlappingPosition(desiredPosition, childSize, state.nodes)

      const childNode: CaseItemNodeType = {
        id: childId,
        type: 'caseItemNode',
        position: nextPosition,
        style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
        data: { cfItem: action.cfItem, parentId: action.parentId },
        className: wrapperNodeClassName,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...childNode, selected: true }]
      
      // Calculate the closest handles for the edge
      // Note: we swap the order because visually the edge flows parent → child,
      // but semantically "child isChildOf parent"
      const handles = getClosestHandles(
        parent.position,  // Visual source (parent)
        parentSize,
        nextPosition,     // Visual target (child)
        childSize
      )
      
      // Determine association type:
      // - Main framework (caseFrameworkNode) uses __startsFrom (visual-only)
      // - External framework uses isPartOf
      // - Item-to-item uses isChildOf
      const isParentMainFramework = isFrameworkNode(parent)
      const isParentExternalFramework = parent.type === 'externalFrameworkNode'
      
      let assocType: string
      if (isParentMainFramework) {
        assocType = FRAMEWORK_ROOT_ASSOCIATION_TYPE
      } else if (isParentExternalFramework) {
        assocType = 'isPartOf'
      } else {
        assocType = 'isChildOf'
      }
      
      // Edge visually flows parent → child (hierarchy flows down/out)
      // The cfAssociation origin/destination track the semantic relationship
      const nextEdges: CaseEditorEdge[] = [
        ...state.edges.map((e) => ({ ...e, selected: false })),
        {
          id: `e_${action.parentId}_${childId}`,
          source: action.parentId,  // Visual: edge starts at parent
          target: childId,          // Visual: edge ends at child (arrow points here)
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          label: makeEdgeLabel(assocType),
          labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
          style: getEdgeStyle(assocType),
          ...getEdgeMarkers(assocType),
          data: { 
            isHierarchical: true, 
            associationType: assocType,
            // Track semantic origin/destination separately
            semanticOrigin: childId,
            semanticDestination: action.parentId,
            // Flag for UI to lock this edge type (only main framework root connections are visual-only)
            isFrameworkRootConnection: isParentMainFramework,
          },
        },
      ]

      return { ...state, nodes: nextNodes, edges: nextEdges, selectedNodeId: childId, selectedEdgeId: null, dirty: true }
    }
    case 'node/addDetachedItem': {
      // Find a good position for the new detached item
      // If viewportCenter provided, use that; otherwise use bottom-right of existing nodes
      const existingNodes = state.nodes
      const nodeSize = { w: DEFAULT_NODE_WIDTH, h: DEFAULT_NODE_HEIGHT }
      
      let desiredPosition: { x: number; y: number }
      if (action.viewportCenter) {
        // Center the node on the viewport center
        desiredPosition = {
          x: action.viewportCenter.x - nodeSize.w / 2,
          y: action.viewportCenter.y - nodeSize.h / 2,
        }
      } else {
        const maxX = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.x)) : 0
        const maxY = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.y)) : HEADER_SAFE_Y
        desiredPosition = { x: maxX + DEFAULT_NODE_WIDTH + 60, y: maxY }
      }
      
      const nextPosition = findNonOverlappingPosition(desiredPosition, nodeSize, state.nodes)

      const newNode: CaseItemNodeType = {
        id: action.nodeId,
        type: 'caseItemNode',
        position: nextPosition,
        style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
        data: { cfItem: action.cfItem }, // No parentId - detached
        className: wrapperNodeClassName,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }]
      return { ...state, nodes: nextNodes, selectedNodeId: action.nodeId, selectedEdgeId: null, dirty: true }
    }
    case 'node/addExternalFramework': {
      // Find a good position for the external framework node
      // If viewportCenter provided, use that; otherwise use bottom-right of existing nodes
      const existingNodes = state.nodes
      const nodeSize = { w: 280, h: 120 }
      
      let desiredPosition: { x: number; y: number }
      if (action.viewportCenter) {
        // Center the node on the viewport center
        desiredPosition = {
          x: action.viewportCenter.x - nodeSize.w / 2,
          y: action.viewportCenter.y - nodeSize.h / 2,
        }
      } else {
        const maxX = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.x)) : 0
        const maxY = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.y)) : HEADER_SAFE_Y
        desiredPosition = { x: maxX + 280 + 60, y: maxY }
      }
      
      const nextPosition = findNonOverlappingPosition(desiredPosition, nodeSize, state.nodes)

      const newNode: ExternalFrameworkNodeType = {
        id: action.nodeId,
        type: 'externalFrameworkNode',
        position: nextPosition,
        style: { width: 280, height: 120 },
        data: action.data,
        className: wrapperNodeClassName,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }]
      return { ...state, nodes: nextNodes, selectedNodeId: action.nodeId, selectedEdgeId: null, dirty: true }
    }
    case 'graph/delete': {
      const deleteNodeIds = new Set(action.nodeIds)
      const deleteEdgeIds = new Set(action.edgeIds)

      const deletedNodes = state.nodes.filter((n) => deleteNodeIds.has(n.id))
      let remainingNodes = state.nodes.filter((n) => !deleteNodeIds.has(n.id))

      // Remove requested edges AND any edge connected to a deleted node.
      let remainingEdges = state.edges.filter(
        (e) => !deleteEdgeIds.has(e.id) && !deleteNodeIds.has(e.source) && !deleteNodeIds.has(e.target),
      )

      if (action.reattachChildren) {
        const parentExists = new Set(remainingNodes.map((n) => n.id))
        const reparentMap = new Map<string, string>() // childId -> newParentId

        for (const dn of deletedNodes) {
          if (!isItemNode(dn)) continue
          const parentId = dn.data.parentId
          if (!parentId) continue
          if (deleteNodeIds.has(parentId)) continue
          if (!parentExists.has(parentId)) continue

          for (const n of remainingNodes) {
            if (isItemNode(n) && n.data.parentId === dn.id) {
              reparentMap.set(n.id, parentId)
            }
          }
        }

        if (reparentMap.size) {
          remainingNodes = remainingNodes.map((n) => {
            const newParentId = reparentMap.get(n.id)
            if (!newParentId) return n
            if (!isItemNode(n)) return n
            return { ...n, data: { ...n.data, parentId: newParentId } }
          })

          const existingEdgeIds = new Set(remainingEdges.map((e) => e.id))
          for (const [childId, parentId] of reparentMap.entries()) {
            const newEdgeId = `e_${parentId}_${childId}`
            if (!existingEdgeIds.has(newEdgeId)) {
              remainingEdges = [
                ...remainingEdges,
                {
                  id: newEdgeId,
                  source: parentId,
                  target: childId,
                  markerEnd: DEFAULT_EDGE_MARKER,
                  data: { isHierarchical: true, associationType: 'isChildOf' },
                },
              ]
              existingEdgeIds.add(newEdgeId)
            }
          }
        }
      }

      const selectedNodeId = state.selectedNodeId && deleteNodeIds.has(state.selectedNodeId) ? null : state.selectedNodeId
      const selectedEdgeId = state.selectedEdgeId && deleteEdgeIds.has(state.selectedEdgeId) ? null : state.selectedEdgeId
      return {
        ...state,
        selectedNodeId,
        selectedEdgeId,
        nodes: remainingNodes.map((n) => ({ ...n, selected: selectedNodeId ? n.id === selectedNodeId : false })),
        edges: remainingEdges.map((e) => ({ ...e, selected: selectedEdgeId ? e.id === selectedEdgeId : false })) as CaseEditorEdge[],
        dirty: true,
      }
    }
    case 'layout/apply': {
      const nextNodes = state.nodes.map((n) => {
        const p = action.positions[n.id]
        return p ? { ...n, position: { x: p.x, y: p.y } } : n
      })
      return { ...state, nodes: nextNodes, layoutVersion: state.layoutVersion + 1 }
    }
    case 'layout/applyHierarchy': {
      const nextNodes = state.nodes.map((n) => {
        const p = action.positions[n.id]
        return p ? { ...n, position: { x: p.x, y: p.y } } : n
      })
      const nextEdges = state.edges.map((e) => {
        const h = action.edgeHandles[e.id]
        if (!h) return e
        return {
          ...e,
          sourceHandle: h.sourceHandle,
          targetHandle: h.targetHandle,
          data: { ...e.data, edgeType: h.edgeType ?? e.data?.edgeType, labelPosition: h.labelPosition },
        } as CaseEditorEdge
      })
      return { ...state, nodes: nextNodes, edges: nextEdges, layoutVersion: state.layoutVersion + 1, dirty: true }
    }
    case 'graph/load': {
      return {
        nodes: action.graph.nodes,
        edges: action.graph.edges,
        selectedNodeId: null,
        selectedEdgeId: null,
        layoutVersion: 0,
        dirty: false,
      }
    }
    case 'dirty/mark': {
      return state.dirty ? state : { ...state, dirty: true }
    }
    case 'dirty/clear': {
      return { ...state, dirty: false }
    }
    default:
      return state
  }
}

type EditorContextValue = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedNode: CaseEditorNodeType | null
  selectedEdge: CaseEditorEdge | null
  nodesWithCallbacks: CaseEditorNodeType[]
  frameworkInfo: { title: string; subtitle?: string; creator?: string }
  layoutVersion: number
  isDirty: boolean
  /** Clear the dirty flag (e.g., after successful save) */
  clearDirty: () => void
  /** CASE version for serialization (1.0 or 1.1). Default is 1.1 for new frameworks. */
  caseVersion: CaseVersion
  settings: EditorSettings
  updateSettings: (_settings: EditorSettings) => void
  onSelectionChange: OnSelectionChangeFunc<CaseEditorNodeType>
  onEdgeSelectionChange: (_edgeId: string | null) => void
  onNodesChange: (_changes: NodeChange<CaseEditorNodeType>[]) => void
  onEdgesChange: (_changes: EdgeChange[]) => void
  onConnect: (_connection: Connection) => void
  clearSelection: () => void
  updateNodeData: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
  updateEdgeData: (_edgeId: string, _patch: CaseEdgeDataPatch) => void
  flipEdge: (_edgeId: string) => void
  reconnectEdge: (_edgeId: string, _newSource: string, _newTarget: string, _newSourceHandle?: string, _newTargetHandle?: string) => void
  addChild: (_parentId: string) => void
  addDetachedItem: (_viewportCenter?: { x: number; y: number }) => void
  addExternalFramework: (_data: ExternalFrameworkNodeData, _viewportCenter?: { x: number; y: number }) => void
  addItemDialog: {
    open: boolean
    parentId: string | null
    viewportCenter?: { x: number; y: number }
    draft: AddItemDraft
  }
  setAddItemDraft: (_patch: Partial<AddItemDraft>) => void
  cancelAddItem: () => void
  confirmAddItem: () => void
  deleteElements: (_params: { nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }) => void
  /** Re-layout the graph as a flat hierarchy: framework on top, items in a column below */
  applyHierarchyLayout: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({
  children,
  initialGraph,
  graphKey,
  caseVersion: initialCaseVersion = '1.1',
  skipAutoLayout = false,
  initialEdgeType,
}: Readonly<{ 
  children: ReactNode
  initialGraph?: EditorGraph
  graphKey?: string
  caseVersion?: CaseVersion
  /** Skip auto-layout when the graph already has saved positions (e.g., from CASE extensions) */
  skipAutoLayout?: boolean
  /** Edge type stored in the framework's CFDocument ext:opencase — overrides localStorage default */
  initialEdgeType?: string
}>) {
  // Track CASE version for serialization - default to 1.1 for new frameworks
  const [caseVersion, setCaseVersion] = useState<CaseVersion>(initialCaseVersion)
  
  // Update caseVersion when initialCaseVersion changes (e.g., loading a different framework)
  useEffect(() => {
    setCaseVersion(initialCaseVersion)
  }, [initialCaseVersion])
  const seed = useMemo(() => initialGraph ?? DEFAULT_GRAPH, [initialGraph])
  const [state, dispatch] = useReducer(reducer, { nodes: seed.nodes, edges: seed.edges, selectedNodeId: null, selectedEdgeId: null, layoutVersion: 0, dirty: false })
  const didInitialLayout = useRef(false)
  const [addItemDialog, setAddItemDialog] = useState<{ 
    open: boolean
    parentId: string | null
    viewportCenter?: { x: number; y: number }
    draft: AddItemDraft 
  }>({
    open: false,
    parentId: null,
    viewportCenter: undefined,
    draft: { fullStatement: '' },
  })

  // Editor settings: prefer framework-level edgeType, fall back to localStorage, then default
  const [settings, setSettings] = useState<EditorSettings>(() => {
    if (initialEdgeType) {
      return { edgeType: initialEdgeType as EditorSettings['edgeType'] }
    }
    try {
      const saved = globalThis.localStorage?.getItem('case-editor-settings')
      if (saved) return JSON.parse(saved) as EditorSettings
    } catch {
      // Ignore parse errors
    }
    return { edgeType: 'default' }
  })

  const updateSettings = useCallback((newSettings: EditorSettings) => {
    setSettings(newSettings)
    // Edge type is now persisted per-framework in ext:opencase (not localStorage).
    // Mark the editor as dirty so the user knows to save.
    dispatch({ type: 'dirty/mark' })
  }, [])

  useEffect(() => {
    if (!graphKey) return
    dispatch({ type: 'graph/load', graph: seed })
    // Skip auto-layout if the graph already has saved positions from CASE extensions
    didInitialLayout.current = skipAutoLayout
  }, [graphKey, seed, skipAutoLayout])

  // When switching frameworks, reset edge type to the framework's saved value (or localStorage default)
  useEffect(() => {
    if (!graphKey) return
    if (initialEdgeType) {
      setSettings((prev) => ({ ...prev, edgeType: initialEdgeType as EditorSettings['edgeType'] }))
    }
  }, [graphKey, initialEdgeType])

  const selectedNode = useMemo(
    () => (state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null),
    [state.nodes, state.selectedNodeId],
  )

  const selectedEdge = useMemo(
    () => (state.selectedEdgeId ? state.edges.find((e) => e.id === state.selectedEdgeId) ?? null : null),
    [state.edges, state.selectedEdgeId],
  )

  const frameworkInfo = useMemo(() => {
    const fw = state.nodes.find(isFrameworkNode)
    const doc = fw?.data.cfDocument
    return {
      title: doc?.title ?? 'Framework',
      subtitle: [doc?.adoptionStatus, doc?.frameworkType].filter(Boolean).join(' • ') || undefined,
      creator: doc?.creator,
    }
  }, [state.nodes])

  // One-time initial auto-layout after nodes have (at least) known sizes.
  useEffect(() => {
    if (didInitialLayout.current) return
    if (!state.nodes.length) return

    const hasSizes = state.nodes.every((n) => {
      const anyNode = n as unknown as { measured?: { width?: number; height?: number }; style?: { width?: number | string; height?: number | string } }
      return (
        (typeof anyNode.measured?.width === 'number' && typeof anyNode.measured?.height === 'number') ||
        (typeof anyNode.style?.width === 'number' && typeof anyNode.style?.height === 'number')
      )
    })
    if (!hasSizes) return

    const root = state.nodes.find(isFrameworkNode)
    if (!root) return

    const nodeById = new Map(state.nodes.map((n) => [n.id, n]))
    const childrenById = new Map<string, string[]>()
    for (const e of state.edges) {
      const kids = childrenById.get(e.source) ?? []
      kids.push(e.target)
      childrenById.set(e.source, kids)
    }

    const subtreeWidth = new Map<string, number>()
    const calcWidth = (id: string): number => {
      if (subtreeWidth.has(id)) return subtreeWidth.get(id)!
      const n = nodeById.get(id)
      if (!n) return 0
      const { w } = getNodeSize(n)
      const kids = childrenById.get(id) ?? []
      if (!kids.length) {
        subtreeWidth.set(id, w)
        return w
      }
      const widths = kids.map(calcWidth)
      const total = widths.reduce((a, b) => a + b, 0) + TREE_GAP_X * Math.max(0, kids.length - 1)
      const sw = Math.max(w, total)
      subtreeWidth.set(id, sw)
      return sw
    }

    calcWidth(root.id)

    const positions: Record<string, { x: number; y: number }> = {}
    const layout = (id: string, centerX: number, y: number) => {
      const n = nodeById.get(id)
      if (!n) return
      const { w, h } = getNodeSize(n)
      positions[id] = { x: Math.round(centerX - w / 2), y: Math.round(y) }

      const kids = childrenById.get(id) ?? []
      if (!kids.length) return

      const nextY = y + h + TREE_GAP_Y
      const total = kids.map((k) => subtreeWidth.get(k) ?? getNodeSize(nodeById.get(k)!).w).reduce((a, b) => a + b, 0) + TREE_GAP_X * Math.max(0, kids.length - 1)
      let cursor = centerX - total / 2
      for (const kid of kids) {
        const sw = subtreeWidth.get(kid) ?? getNodeSize(nodeById.get(kid)!).w
        layout(kid, cursor + sw / 2, nextY)
        cursor += sw + TREE_GAP_X
      }
    }

    // Anchor root below header.
    layout(root.id, 0, HEADER_SAFE_Y)
    dispatch({ type: 'layout/apply', positions })
    didInitialLayout.current = true
  }, [state.nodes, state.edges])

  /**
   * Apply a hierarchical layout: framework at top, items in a vertical column
   * below and to the right, connected by smooth-step edges from bottom→left.
   */
  const applyHierarchyLayout = useCallback(() => {
    const frameworkNode = state.nodes.find(isFrameworkNode)
    if (!frameworkNode) return

    const frameworkSize = getNodeSize(frameworkNode)

    // Find edges from framework to items (__startsFrom / isChildOf with framework as source)
    const frameworkToItemEdges = state.edges.filter(
      (e) => e.source === frameworkNode.id && state.nodes.some((n) => n.id === e.target && isItemNode(n)),
    )

    // Sort items by sequenceNumber from the edge data, then by index as fallback
    const sortedEdges = [...frameworkToItemEdges].sort((a, b) => {
      const seqA = a.data?.cfAssociation?.sequenceNumber ?? a.data?.sequenceNumber ?? Number.MAX_SAFE_INTEGER
      const seqB = b.data?.cfAssociation?.sequenceNumber ?? b.data?.sequenceNumber ?? Number.MAX_SAFE_INTEGER
      return seqA - seqB
    })

    // Compute positions
    const positions: Record<string, { x: number; y: number }> = {}
    const edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string }> = {}

    // Framework at top
    positions[frameworkNode.id] = { x: 0, y: HEADER_SAFE_Y }

    // Items stacked vertically, offset to the right
    const itemStartX = 0 + frameworkSize.w / 2 + HIERARCHY_INDENT
    let itemY = HEADER_SAFE_Y + frameworkSize.h + HIERARCHY_GAP_Y

    for (const edge of sortedEdges) {
      const itemNode = state.nodes.find((n) => n.id === edge.target)
      if (!itemNode) continue

      const itemSize = getNodeSize(itemNode)
      positions[edge.target] = { x: itemStartX, y: itemY }
      itemY += itemSize.h + HIERARCHY_GAP_Y

      // Set edge handles: framework bottom → item left, using smoothstep, label near item
      edgeHandles[edge.id] = {
        sourceHandle: 'bottom',
        targetHandle: 'left',
        edgeType: 'smoothstep',
        labelPosition: 'target',
      }
    }

    dispatch({ type: 'layout/applyHierarchy', positions, edgeHandles })

    // Switch the framework-level edge style to smoothstep (persisted on next save)
    updateSettings({ ...settings, edgeType: 'smoothstep' })
  }, [state.nodes, state.edges, settings, updateSettings])

  const addChild = useCallback((parentId: string) => {
    setAddItemDialog({ open: true, parentId, viewportCenter: undefined, draft: { fullStatement: '' } })
  }, [])

  const addDetachedItem = useCallback((viewportCenter?: { x: number; y: number }) => {
    // Open the dialog for adding a detached item (no parent)
    setAddItemDialog({ 
      open: true, 
      parentId: null, 
      viewportCenter,
      draft: { fullStatement: '' } 
    })
  }, [])

  const addExternalFramework = useCallback((data: ExternalFrameworkNodeData, viewportCenter?: { x: number; y: number }) => {
    const uuid = globalThis.crypto?.randomUUID?.()
    const fallbackId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const nodeId = `ext_${uuid ?? fallbackId}`
    
    dispatch({ type: 'node/addExternalFramework', nodeId, data, viewportCenter })
  }, [])

  const setAddItemDraft = useCallback((patch: Partial<AddItemDraft>) => {
    setAddItemDialog((s) => ({ ...s, draft: { ...s.draft, ...patch } }))
  }, [])

  const cancelAddItem = useCallback(() => {
    setAddItemDialog({ open: false, parentId: null, viewportCenter: undefined, draft: { fullStatement: '' } })
  }, [])

  const confirmAddItem = useCallback(() => {
    const fullStatement = addItemDialog.draft.fullStatement.trim()
    if (!fullStatement) return

    const uuid = globalThis.crypto?.randomUUID?.()
    const fallbackId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const nodeId = `tu_${uuid ?? fallbackId}`

    const parseCsv = (raw?: string) =>
      (raw ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)

    const cfItemExtras: Partial<CFItem> = {
      abbreviatedStatement: addItemDialog.draft.abbreviatedStatement?.trim() || undefined,
      alternativeLabel: addItemDialog.draft.alternativeLabel?.trim() || undefined,
      humanCodingScheme: addItemDialog.draft.humanCodingScheme?.trim() || undefined,
      CFItemType: addItemDialog.draft.CFItemType?.trim() || undefined,
      subject: parseCsv(addItemDialog.draft.subjectCsv),
      educationLevel: parseCsv(addItemDialog.draft.educationLevelCsv),
      conceptKeywords: parseCsv(addItemDialog.draft.conceptKeywordsCsv),
      notes: addItemDialog.draft.notes?.trim() || undefined,
    }

    const cfItem = makeCfItem(nodeId, fullStatement, cfItemExtras)

    if (addItemDialog.parentId) {
      // Adding as child of a parent node
      dispatch({
        type: 'node/addChild',
        parentId: addItemDialog.parentId,
        childId: nodeId,
        cfItem,
      })
    } else {
      // Adding as detached item (no parent)
      dispatch({
        type: 'node/addDetachedItem',
        nodeId,
        cfItem,
        viewportCenter: addItemDialog.viewportCenter,
      })
    }

    setAddItemDialog({ open: false, parentId: null, viewportCenter: undefined, draft: { fullStatement: '' } })
  }, [addItemDialog])

  const deleteElements = useCallback((params: { nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }) => {
    dispatch({ type: 'graph/delete', ...params })
  }, [])
  
  const updateNodeData = useCallback(
    (nodeId: string, patch: CaseEditorNodeDataPatch) => dispatch({ type: 'node/updateData', nodeId, patch }),
    [],
  )

  const updateEdgeData = useCallback(
    (edgeId: string, patch: CaseEdgeDataPatch) => dispatch({ type: 'edge/updateData', edgeId, patch }),
    [],
  )

  const flipEdge = useCallback(
    (edgeId: string) => dispatch({ type: 'edge/flip', edgeId }),
    [],
  )

  const reconnectEdge = useCallback(
    (edgeId: string, newSource: string, newTarget: string, newSourceHandle?: string, newTargetHandle?: string) => 
      dispatch({ type: 'edge/reconnect', edgeId, newSource, newTarget, newSourceHandle, newTargetHandle }),
    [],
  )

  const nodesWithCallbacks = useMemo(() => {
    return state.nodes.map((n) => {
      if (isItemNode(n)) {
        const data: CaseItemNodeData = {
          ...n.data,
          onAddChild: addChild,
          onUpdateItem: (id, patch) => updateNodeData(id, { cfItem: patch }),
        }
        return { ...n, className: wrapperNodeClassName, data }
      }

      if (isFrameworkNode(n)) {
        return {
          ...n,
          className: wrapperNodeClassName,
          data: {
            ...n.data,
            onAddChild: addChild,
            onUpdateDocument: (id: string, patch: Partial<CFDocument>) => updateNodeData(id, { cfDocument: patch }),
          },
        }
      }

      return n
    })
  }, [state.nodes, addChild, updateNodeData])

  const onSelectionChange: OnSelectionChangeFunc<CaseEditorNodeType> = useCallback(({ nodes, edges }) => {
    // Prioritize node selection over edge selection
    if (nodes?.[0]?.id) {
      dispatch({ type: 'selection/setNode', nodeId: nodes[0].id })
    } else if (edges?.[0]?.id) {
      dispatch({ type: 'selection/setEdge', edgeId: edges[0].id })
    } else {
      dispatch({ type: 'selection/clear' })
    }
  }, [])

  const onEdgeSelectionChange = useCallback((edgeId: string | null) => {
    if (edgeId) {
      dispatch({ type: 'selection/setEdge', edgeId })
    } else {
      dispatch({ type: 'selection/clear' })
    }
  }, [])

  const onNodesChange = useCallback((changes: NodeChange<CaseEditorNodeType>[]) => {
    dispatch({ type: 'nodes/applyChanges', changes })
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    dispatch({ type: 'edges/applyChanges', changes })
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    dispatch({ type: 'edges/connect', connection })
  }, [])

  const clearSelection = useCallback(() => dispatch({ type: 'selection/clear' }), [])
  const clearDirty = useCallback(() => dispatch({ type: 'dirty/clear' }), [])

  const value: EditorContextValue = useMemo(
    () => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId,
      selectedNode,
      selectedEdge,
      nodesWithCallbacks,
      frameworkInfo,
      layoutVersion: state.layoutVersion,
      isDirty: state.dirty,
      clearDirty,
      caseVersion,
      settings,
      updateSettings,
      onSelectionChange,
      onEdgeSelectionChange,
      onNodesChange,
      onEdgesChange,
      onConnect,
      clearSelection,
      updateNodeData,
      updateEdgeData,
      flipEdge,
      reconnectEdge,
      addChild,
      addDetachedItem,
      addExternalFramework,
      addItemDialog,
      setAddItemDraft,
      cancelAddItem,
      confirmAddItem,
      deleteElements,
      applyHierarchyLayout,
    }),
    [
      state.nodes,
      state.edges,
      state.selectedNodeId,
      state.selectedEdgeId,
      selectedNode,
      selectedEdge,
      nodesWithCallbacks,
      frameworkInfo,
      state.layoutVersion,
      state.dirty,
      clearDirty,
      caseVersion,
      settings,
      updateSettings,
      onSelectionChange,
      onEdgeSelectionChange,
      onNodesChange,
      onEdgesChange,
      onConnect,
      clearSelection,
      updateNodeData,
      updateEdgeData,
      flipEdge,
      reconnectEdge,
      addChild,
      addDetachedItem,
      addExternalFramework,
      addItemDialog,
      setAddItemDraft,
      cancelAddItem,
      confirmAddItem,
      deleteElements,
      applyHierarchyLayout,
    ],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within an EditorProvider')
  return ctx
}

