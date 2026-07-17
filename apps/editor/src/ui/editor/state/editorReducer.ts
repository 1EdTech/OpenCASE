/**
 * Pure reducer for the CASE editor state.
 *
 * No React dependency -- easily unit-testable:
 *   expect(editorReducer(state, action)).toEqual(...)
 */
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react'
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type {
  CaseEdgeDataPatch,
  CaseEditorEdge,
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseItemNodeType,
  ExternalFrameworkNodeData,
  ExternalFrameworkNodeType,
} from '@/ui/editor/reactflow/types'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/reactflow/types'
import type { CFItem } from '@/domain/case/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { DEFAULT_EDGE_MARKER, getEdgeMarkers, getEdgeStyle, makeEdgeLabel } from '@/ui/editor/state/editorFactories'
import type { RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, HEADER_SAFE_Y, WRAPPER_NODE_CLASS, findNonOverlappingPosition, getClosestHandles, getNodeSize, isFrameworkNode, isItemNode } from '@/ui/editor/state/helpers/nodeGeometry'

// ── State ──────────────────────────────────────────────────────────────

export type EditorState = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  remoteLinks: RemoteItemLink[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  /** IDs of all selected nodes (for multi-selection) */
  selectedNodeIds: string[]
  /** IDs of all selected edges (for multi-selection) */
  selectedEdgeIds: string[]
  layoutVersion: number
  dirty: boolean
}

// ── Actions ────────────────────────────────────────────────────────────

export type Action =
  | { type: 'selection/setNode'; nodeId: string | null }
  | { type: 'selection/setEdge'; edgeId: string | null }
  | { type: 'selection/setMulti'; nodeIds: string[]; edgeIds: string[] }
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
  | { type: 'node/removeRemoteFramework'; nodeId: string }
  | { type: 'remoteLink/add'; link: RemoteItemLink }
  | { type: 'remoteLink/remove'; linkId: string }
  | { type: 'remoteLink/updateType'; linkId: string; associationType: string }
  | { type: 'graph/delete'; nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }
  | { type: 'layout/apply'; positions: Record<string, { x: number; y: number }> }
  | { type: 'layout/applyHierarchy'; positions: Record<string, { x: number; y: number }>; edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }> }
  | { type: 'graph/load'; graph: EditorGraph }
  | { type: 'dirty/mark' }
  | { type: 'dirty/clear' }

// ── Reducer ────────────────────────────────────────────────────────────

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'selection/setNode':
      return { ...state, selectedNodeId: action.nodeId, selectedEdgeId: null, selectedNodeIds: action.nodeId ? [action.nodeId] : [], selectedEdgeIds: [] }
    case 'selection/setEdge':
      return { ...state, selectedEdgeId: action.edgeId, selectedNodeId: null, selectedNodeIds: [], selectedEdgeIds: action.edgeId ? [action.edgeId] : [] }
    case 'selection/setMulti':
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectedNodeIds: action.nodeIds,
        selectedEdgeIds: action.edgeIds,
      }
    case 'selection/clear':
      // Only clear ID tracking — DON'T map over nodes/edges.
      // React Flow manages `selected` flags via onNodesChange / onEdgesChange.
      // For programmatic deselect, EditorContext dispatches nodes/applyChanges separately.
      if (state.selectedNodeId === null && state.selectedEdgeId === null) return state
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectedNodeIds: [],
        selectedEdgeIds: [],
      }
    case 'nodes/applyChanges': {
      const hasDirtyChanges = action.changes.some(
        (c) => c.type === 'position' || c.type === 'remove' || c.type === 'add',
      )
      return {
        ...state,
        nodes: applyNodeChanges<CaseEditorNodeType>(action.changes, state.nodes),
        dirty: state.dirty || hasDirtyChanges,
      }
    }
    case 'edges/applyChanges': {
      const hasDirtyChanges = action.changes.some(
        (c) => c.type === 'remove' || c.type === 'add',
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

      const sourceNode = state.nodes.find((n) => n.id === source)
      const targetNode = state.nodes.find((n) => n.id === target)

      const isSourceMainFramework = sourceNode?.type === 'caseFrameworkNode'
      const isTargetMainFramework = targetNode?.type === 'caseFrameworkNode'
      const isSourceExternalFramework = sourceNode?.type === 'externalFrameworkNode'
      const isTargetExternalFramework = targetNode?.type === 'externalFrameworkNode'
      const isSourceAnyFramework = isSourceMainFramework || isSourceExternalFramework
      const isTargetAnyFramework = isTargetMainFramework || isTargetExternalFramework

      if (isSourceAnyFramework && isTargetAnyFramework) return state

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

      let finalSource = source
      let finalTarget = target
      let finalSourceHandle = sourceHandle ?? undefined
      let finalTargetHandle = targetHandle ?? undefined

      if (involvesMainFramework && isTargetMainFramework) {
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
      const targetNode = state.nodes.find((n) => n.id === nodeId)
      const nodes = state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        if (isItemNode(n) && 'cfItem' in patch && patch.cfItem) {
          return { ...n, data: { ...n.data, ...patch, cfItem: { ...n.data.cfItem, ...patch.cfItem } } }
        }
        if (isFrameworkNode(n) && 'cfDocument' in patch && patch.cfDocument) {
          return { ...n, data: { ...n.data, ...patch, cfDocument: { ...n.data.cfDocument, ...patch.cfDocument } } }
        }
        if (n.type === 'externalFrameworkNode') {
          return { ...n, data: { ...n.data, ...patch } }
        }
        return n
      })

      let remoteLinks = state.remoteLinks
      if (targetNode?.type === 'externalFrameworkNode' && (patch.color !== undefined || patch.title !== undefined)) {
        const refId = (targetNode.data as ExternalFrameworkNodeData).refId
        remoteLinks = state.remoteLinks.map((l) => {
          if (l.remoteFrameworkRefId !== refId) return l
          return {
            ...l,
            ...(patch.color !== undefined ? { remoteFrameworkColor: patch.color } : {}),
            ...(patch.title !== undefined ? { remoteFrameworkTitle: patch.title } : {}),
          }
        })
      }

      return { ...state, nodes, remoteLinks, dirty: true }
    }
    case 'edge/updateData': {
      const { edgeId, patch } = action
      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e
        const currentData = e.data ?? {}
        const newData = { ...currentData }

        if (patch.associationType !== undefined) newData.associationType = patch.associationType
        if (patch.sequenceNumber !== undefined) newData.sequenceNumber = patch.sequenceNumber
        if (patch.isHierarchical !== undefined) newData.isHierarchical = patch.isHierarchical

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

        const finalAssocType = newData.associationType ?? currentData.associationType ?? 'isChildOf'
        const finalSeqNum = newData.sequenceNumber
        const markers = getEdgeMarkers(finalAssocType)
        const style = getEdgeStyle(finalAssocType)

        return {
          ...e,
          ...markers,
          style,
          label: makeEdgeLabel(finalAssocType, finalSeqNum),
          data: newData,
        }
      })
      return { ...state, edges, dirty: true }
    }
    case 'edge/flip': {
      const { edgeId } = action
      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e

        const newSource = e.target
        const newTarget = e.source

        const currentData = e.data ?? {}
        const cfAssoc = currentData.cfAssociation
        const newCfAssociation = cfAssoc
          ? {
              ...cfAssoc,
              originNodeURI: cfAssoc.destinationNodeURI,
              destinationNodeURI: cfAssoc.originNodeURI,
              lastChangeDateTime: new Date().toISOString(),
            }
          : undefined

        return {
          ...e,
          source: newSource,
          target: newTarget,
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

      const newSourceNode = state.nodes.find((n) => n.id === newSource)
      const newTargetNode = state.nodes.find((n) => n.id === newTarget)
      const isSourceMainFramework = newSourceNode?.type === 'caseFrameworkNode'
      const isTargetMainFramework = newTargetNode?.type === 'caseFrameworkNode'
      const isSourceExternalFramework = newSourceNode?.type === 'externalFrameworkNode'
      const isTargetExternalFramework = newTargetNode?.type === 'externalFrameworkNode'
      const isSourceAnyFramework = isSourceMainFramework || isSourceExternalFramework
      const isTargetAnyFramework = isTargetMainFramework || isTargetExternalFramework

      if (isSourceAnyFramework && isTargetAnyFramework) return state

      const involvesMainFramework = isSourceMainFramework || isTargetMainFramework
      const involvesExternalFramework = isSourceExternalFramework || isTargetExternalFramework

      let finalSource = newSource
      let finalTarget = newTarget
      let finalSourceHandle = newSourceHandle
      let finalTargetHandle = newTargetHandle

      if (involvesMainFramework && isTargetMainFramework) {
        finalSource = newTarget
        finalTarget = newSource
        finalSourceHandle = newTargetHandle
        finalTargetHandle = newSourceHandle
      }

      const edges = state.edges.map((e) => {
        if (e.id !== edgeId) return e

        const currentData = e.data ?? {}
        const cfAssoc = currentData.cfAssociation

        let newAssocType: string
        if (involvesMainFramework) {
          newAssocType = FRAMEWORK_ROOT_ASSOCIATION_TYPE
        } else if (involvesExternalFramework) {
          newAssocType = 'isPartOf'
        } else {
          newAssocType = currentData.associationType ?? 'isChildOf'
        }

        const newCfAssociation =
          !involvesMainFramework && cfAssoc
            ? {
                ...cfAssoc,
                originNodeURI: { ...cfAssoc.originNodeURI, identifier: finalSource },
                destinationNodeURI: { ...cfAssoc.destinationNodeURI, identifier: finalTarget },
                lastChangeDateTime: new Date().toISOString(),
              }
            : undefined

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

      const frameworkNode = state.nodes.find((n) => isFrameworkNode(n))
      const frameworkCenter = frameworkNode
        ? {
            x: frameworkNode.position.x + getNodeSize(frameworkNode).w / 2,
            y: frameworkNode.position.y + getNodeSize(frameworkNode).h / 2,
          }
        : { x: 0, y: 0 }

      const parentSize = getNodeSize(parent)
      const parentCenter = {
        x: parent.position.x + parentSize.w / 2,
        y: parent.position.y + parentSize.h / 2,
      }

      const dx = parentCenter.x - frameworkCenter.x
      const dy = parentCenter.y - frameworkCenter.y
      const isHorizontalFlow = Math.abs(dx) > Math.abs(dy)

      const children = state.nodes.filter((n) => isItemNode(n) && n.data.parentId === action.parentId)

      const gap = 40
      const childGap = DEFAULT_NODE_WIDTH + 60

      let desiredPosition: { x: number; y: number }

      if (isHorizontalFlow) {
        const directionX = dx >= 0 ? 1 : -1
        const childX =
          directionX > 0
            ? parent.position.x + parentSize.w + gap
            : parent.position.x - DEFAULT_NODE_WIDTH - gap

        const existingChildYs = children.map((c) => c.position.y)
        const bottomMostY = existingChildYs.length
          ? Math.max(...existingChildYs) + DEFAULT_NODE_HEIGHT + gap
          : parent.position.y

        desiredPosition = { x: childX, y: bottomMostY }
      } else {
        const directionY = dy >= 0 ? 1 : -1
        const childY =
          directionY > 0
            ? parent.position.y + parentSize.h + gap
            : parent.position.y - DEFAULT_NODE_HEIGHT - gap

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
        className: WRAPPER_NODE_CLASS,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...childNode, selected: true }]

      const handles = getClosestHandles(parent.position, parentSize, nextPosition, childSize)

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

      const nextEdges: CaseEditorEdge[] = [
        ...state.edges.map((e) => ({ ...e, selected: false })),
        {
          id: `e_${action.parentId}_${childId}`,
          source: action.parentId,
          target: childId,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          label: makeEdgeLabel(assocType),
          labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
          style: getEdgeStyle(assocType),
          ...getEdgeMarkers(assocType),
          data: {
            isHierarchical: true,
            associationType: assocType,
            semanticOrigin: childId,
            semanticDestination: action.parentId,
            isFrameworkRootConnection: isParentMainFramework,
          },
        },
      ]

      return { ...state, nodes: nextNodes, edges: nextEdges, selectedNodeId: childId, selectedEdgeId: null, selectedNodeIds: [childId], selectedEdgeIds: [], dirty: true }
    }
    case 'node/addDetachedItem': {
      const existingNodes = state.nodes
      const nodeSize = { w: DEFAULT_NODE_WIDTH, h: DEFAULT_NODE_HEIGHT }

      let desiredPosition: { x: number; y: number }
      if (action.viewportCenter) {
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
        data: { cfItem: action.cfItem },
        className: WRAPPER_NODE_CLASS,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }]
      return { ...state, nodes: nextNodes, selectedNodeId: action.nodeId, selectedEdgeId: null, selectedNodeIds: [action.nodeId], selectedEdgeIds: [], dirty: true }
    }
    case 'node/removeRemoteFramework': {
      const refId = state.nodes.find((n) => n.id === action.nodeId && n.type === 'externalFrameworkNode')
        ? (state.nodes.find((n) => n.id === action.nodeId)?.data as ExternalFrameworkNodeData | undefined)?.refId
        : undefined
      const nextNodes = state.nodes.filter((n) => n.id !== action.nodeId)
      const nextLinks = refId
        ? state.remoteLinks.filter((l) => l.remoteFrameworkRefId !== refId)
        : state.remoteLinks
      const nextEdges = state.edges.filter((e) => e.source !== action.nodeId && e.target !== action.nodeId)
      return {
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        remoteLinks: nextLinks,
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((id) => id !== action.nodeId),
        dirty: true,
      }
    }
    case 'remoteLink/add': {
      const exists = state.remoteLinks.some(
        (l) => l.localItemId === action.link.localItemId &&
          l.remoteItemIdentifier === action.link.remoteItemIdentifier &&
          l.remoteFrameworkRefId === action.link.remoteFrameworkRefId
      )
      if (exists) return state
      return { ...state, remoteLinks: [...state.remoteLinks, action.link], dirty: true }
    }
    case 'remoteLink/remove': {
      return {
        ...state,
        remoteLinks: state.remoteLinks.filter((l) => l.id !== action.linkId),
        dirty: true,
      }
    }
    case 'remoteLink/updateType': {
      return {
        ...state,
        remoteLinks: state.remoteLinks.map((l) =>
          l.id === action.linkId ? { ...l, associationType: action.associationType } : l
        ),
        dirty: true,
      }
    }
    case 'node/addExternalFramework': {
      const existingNodes = state.nodes
      const nodeSize = { w: 280, h: 120 }

      let desiredPosition: { x: number; y: number }
      if (action.viewportCenter) {
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
        className: WRAPPER_NODE_CLASS,
      }

      const nextNodes = [...state.nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }]
      return { ...state, nodes: nextNodes, selectedNodeId: action.nodeId, selectedEdgeId: null, selectedNodeIds: [action.nodeId], selectedEdgeIds: [], dirty: true }
    }
    case 'graph/delete': {
      const deleteNodeIds = new Set(action.nodeIds)
      const deleteEdgeIds = new Set(action.edgeIds)

      const deletedNodes = state.nodes.filter((n) => deleteNodeIds.has(n.id))
      let remainingNodes = state.nodes.filter((n) => !deleteNodeIds.has(n.id))

      let remainingEdges = state.edges.filter(
        (e) => !deleteEdgeIds.has(e.id) && !deleteNodeIds.has(e.source) && !deleteNodeIds.has(e.target),
      )

      if (action.reattachChildren) {
        const parentExists = new Set(remainingNodes.map((n) => n.id))
        const reparentMap = new Map<string, string>()

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
      const selectedNodeIds = state.selectedNodeIds.filter((id) => !deleteNodeIds.has(id))
      const selectedEdgeIds = state.selectedEdgeIds.filter((id) => !deleteEdgeIds.has(id))
      const remainingRemoteLinks = state.remoteLinks.filter((l) => !deleteNodeIds.has(l.localItemId))
      return {
        ...state,
        selectedNodeId,
        selectedEdgeId,
        selectedNodeIds,
        selectedEdgeIds,
        nodes: remainingNodes.map((n) => ({ ...n, selected: selectedNodeId ? n.id === selectedNodeId : false })),
        edges: remainingEdges.map((e) => ({ ...e, selected: selectedEdgeId ? e.id === selectedEdgeId : false })) as CaseEditorEdge[],
        remoteLinks: remainingRemoteLinks,
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
          data: { ...e.data, edgeType: h.edgeType, labelPosition: h.labelPosition },
        } as CaseEditorEdge
      })
      return { ...state, nodes: nextNodes, edges: nextEdges, layoutVersion: state.layoutVersion + 1, dirty: true }
    }
    case 'graph/load': {
      return {
        nodes: action.graph.nodes,
        edges: action.graph.edges,
        remoteLinks: action.graph.remoteLinks ?? [],
        selectedNodeId: null,
        selectedEdgeId: null,
        selectedNodeIds: [],
        selectedEdgeIds: [],
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
