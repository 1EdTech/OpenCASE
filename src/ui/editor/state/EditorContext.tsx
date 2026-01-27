import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Connection, Edge, EdgeChange, NodeChange, OnSelectionChangeFunc } from '@xyflow/react'
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type {
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseFrameworkNodeType,
  CaseItemNodeData,
  CaseItemNodeType,
} from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem } from '@/domain/case/types'
import type { AddItemDraft } from '@/ui/editor/components/AddItemDialog'

const DEFAULT_NODE_WIDTH = 360
const DEFAULT_NODE_HEIGHT = 220
const NODE_GAP_X = 36
const NODE_GAP_Y = 28
// Layout tuning: keep edges readable without large "wasted" whitespace.
const TREE_GAP_X = 40
const TREE_GAP_Y = 28
const HEADER_SAFE_Y = 96

const nowIso = () => new Date().toISOString()

const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'
const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'

const makeCfItem = (id: string, fullStatement: string, extras?: Partial<CFItem>): CFItem => ({
  identifier: id,
  uri: `urn:case:item:${id}`,
  fullStatement,
  lastChangeDateTime: nowIso(),
  ...extras,
})

const makeCfDocument = (id: string, title: string, extras?: Partial<CFDocument>): CFDocument => ({
  identifier: id,
  uri: `urn:case:document:${id}`,
  creator: 'District Curriculum Team',
  title,
  lastChangeDateTime: nowIso(),
  CFPackageURI: { uri: `urn:case:package:${id}` },
  caseVersion: '1.1',
  ...extras,
})

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

const initialNodes: CaseEditorNodeType[] = [
  {
    id: 'fw1',
    type: 'caseFrameworkNode',
    // Start below the floating header so it is visible on first load.
    position: { x: 0, y: HEADER_SAFE_Y },
    style: { width: 520, height: 210 },
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
    // Leave enough room between nodes so edges are visible (node height ~220).
    position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 },
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
      parentId: 'fw1',
    },
    className: wrapperNodeClassName,
  },
  {
    id: 'n2',
    type: 'caseItemNode',
    position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 + 320 },
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
    position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 + 320 + 320 },
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

const initialEdges: Edge[] = [
  { id: 'fw1-n1', source: 'fw1', target: 'n1' },
  { id: 'n1-n2', source: 'n1', target: 'n2' },
  { id: 'n2-n3', source: 'n2', target: 'n3' },
]

type EditorState = {
  nodes: CaseEditorNodeType[]
  edges: Edge[]
  selectedNodeId: string | null
  layoutVersion: number
}

type Action =
  | { type: 'selection/set'; nodeId: string | null }
  | { type: 'selection/clear' }
  | { type: 'nodes/applyChanges'; changes: NodeChange<CaseEditorNodeType>[] }
  | { type: 'edges/applyChanges'; changes: EdgeChange[] }
  | { type: 'edges/connect'; connection: Connection }
  | { type: 'node/updateData'; nodeId: string; patch: CaseEditorNodeDataPatch }
  | { type: 'node/addChild'; parentId: string; childId: string; cfItem: CFItem }
  | { type: 'graph/delete'; nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }
  | { type: 'layout/apply'; positions: Record<string, { x: number; y: number }> }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'selection/set':
      return { ...state, selectedNodeId: action.nodeId }
    case 'selection/clear':
      return {
        ...state,
        selectedNodeId: null,
        nodes: state.nodes.map((n) => ({ ...n, selected: false })),
        edges: state.edges.map((e) => ({ ...e, selected: false })),
      }
    case 'nodes/applyChanges':
      return { ...state, nodes: applyNodeChanges<CaseEditorNodeType>(action.changes, state.nodes) }
    case 'edges/applyChanges':
      return { ...state, edges: applyEdgeChanges(action.changes, state.edges) }
    case 'edges/connect':
      return { ...state, edges: addEdge(action.connection, state.edges) }
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
        return n
      })
      return { ...state, nodes }
    }
    case 'node/addChild': {
      const parent = state.nodes.find((n) => n.id === action.parentId)
      if (!parent) return state
      const childId = action.childId

      const children = state.nodes.filter((n) => isItemNode(n) && n.data.parentId === action.parentId)

      const parentSize = getNodeSize(parent)
      const childRowY = parent.position.y + parentSize.h + 40
      const childGapX = DEFAULT_NODE_WIDTH + 60

      const rightMostChildX = children.length ? Math.max(...children.map((c) => c.position.x)) : parent.position.x - childGapX

      const desiredPosition = { x: rightMostChildX + childGapX, y: childRowY }
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
      const nextEdges: Edge[] = [
        ...state.edges.map((e) => ({ ...e, selected: false })),
        { id: `e_${action.parentId}_${childId}`, source: action.parentId, target: childId },
      ]

      return { ...state, nodes: nextNodes, edges: nextEdges, selectedNodeId: childId }
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
              remainingEdges = [...remainingEdges, { id: newEdgeId, source: parentId, target: childId }]
              existingEdgeIds.add(newEdgeId)
            }
          }
        }
      }

      const selectedNodeId = state.selectedNodeId && deleteNodeIds.has(state.selectedNodeId) ? null : state.selectedNodeId
      return {
        ...state,
        selectedNodeId,
        nodes: remainingNodes.map((n) => ({ ...n, selected: selectedNodeId ? n.id === selectedNodeId : false })),
        edges: remainingEdges.map((e) => ({ ...e, selected: false })),
      }
    }
    case 'layout/apply': {
      const nextNodes = state.nodes.map((n) => {
        const p = action.positions[n.id]
        return p ? { ...n, position: { x: p.x, y: p.y } } : n
      })
      return { ...state, nodes: nextNodes, layoutVersion: state.layoutVersion + 1 }
    }
    default:
      return state
  }
}

type EditorContextValue = {
  nodes: CaseEditorNodeType[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedNode: CaseEditorNodeType | null
  nodesWithCallbacks: CaseEditorNodeType[]
  frameworkInfo: { title: string; subtitle?: string; creator?: string }
  layoutVersion: number
  onSelectionChange: OnSelectionChangeFunc
  onNodesChange: (_changes: NodeChange<CaseEditorNodeType>[]) => void
  onEdgesChange: (_changes: EdgeChange[]) => void
  onConnect: (_connection: Connection) => void
  clearSelection: () => void
  updateNodeData: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
  addChild: (_parentId: string) => void
  addItemDialog: {
    open: boolean
    parentId: string | null
    draft: AddItemDraft
  }
  setAddItemDraft: (_patch: Partial<AddItemDraft>) => void
  cancelAddItem: () => void
  confirmAddItem: () => void
  deleteElements: (_params: { nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }) => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, { nodes: initialNodes, edges: initialEdges, selectedNodeId: null, layoutVersion: 0 })
  const didInitialLayout = useRef(false)
  const [addItemDialog, setAddItemDialog] = useState<{ open: boolean; parentId: string | null; draft: AddItemDraft }>({
    open: false,
    parentId: null,
    draft: { fullStatement: '' },
  })

  const selectedNode = useMemo(
    () => (state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null),
    [state.nodes, state.selectedNodeId],
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

  const addChild = useCallback((parentId: string) => {
    setAddItemDialog({ open: true, parentId, draft: { fullStatement: '' } })
  }, [])

  const setAddItemDraft = useCallback((patch: Partial<AddItemDraft>) => {
    setAddItemDialog((s) => ({ ...s, draft: { ...s.draft, ...patch } }))
  }, [])

  const cancelAddItem = useCallback(() => {
    setAddItemDialog({ open: false, parentId: null, draft: { fullStatement: '' } })
  }, [])

  const confirmAddItem = useCallback(() => {
    if (!addItemDialog.parentId) return

    const fullStatement = addItemDialog.draft.fullStatement.trim()
    if (!fullStatement) return

    const uuid = globalThis.crypto?.randomUUID?.()
    const fallbackId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const childId = `tu_${uuid ?? fallbackId}`

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

    dispatch({
      type: 'node/addChild',
      parentId: addItemDialog.parentId,
      childId,
      cfItem: makeCfItem(childId, fullStatement, cfItemExtras),
    })

    setAddItemDialog({ open: false, parentId: null, draft: { fullStatement: '' } })
  }, [addItemDialog])

  const deleteElements = useCallback((params: { nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }) => {
    dispatch({ type: 'graph/delete', ...params })
  }, [])
  const updateNodeData = useCallback(
    (nodeId: string, patch: CaseEditorNodeDataPatch) => dispatch({ type: 'node/updateData', nodeId, patch }),
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

  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes }) => {
    dispatch({ type: 'selection/set', nodeId: nodes?.[0]?.id ?? null })
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

  const value: EditorContextValue = useMemo(
    () => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      selectedNode,
      nodesWithCallbacks,
      frameworkInfo,
      layoutVersion: state.layoutVersion,
      onSelectionChange,
      onNodesChange,
      onEdgesChange,
      onConnect,
      clearSelection,
      updateNodeData,
      addChild,
      addItemDialog,
      setAddItemDraft,
      cancelAddItem,
      confirmAddItem,
      deleteElements,
    }),
    [
      state.nodes,
      state.edges,
      state.selectedNodeId,
      selectedNode,
      nodesWithCallbacks,
      frameworkInfo,
      state.layoutVersion,
      onSelectionChange,
      onNodesChange,
      onEdgesChange,
      onConnect,
      clearSelection,
      updateNodeData,
      addChild,
      addItemDialog,
      setAddItemDraft,
      cancelAddItem,
      confirmAddItem,
      deleteElements,
    ],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within an EditorProvider')
  return ctx
}

