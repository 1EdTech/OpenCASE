/**
 * React context provider for the CASE editor.
 *
 * Orchestrates state (via editorReducer), layout callbacks (delegating
 * to pure layout functions), and the public hook consumed by EditorCanvas.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Connection, EdgeChange, NodeChange, OnSelectionChangeFunc } from '@xyflow/react'
import type {
  CaseEdgeDataPatch,
  CaseEditorEdge,
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseItemNodeData,
  ExternalFrameworkNodeData,
} from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem } from '@/domain/case/types'
import type { AddItemDraft } from '@/ui/editor/components/AddItemDialog'
import type { EditorSettings } from '@/ui/editor/components/SettingsModal'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { createSampleGraph, makeCfItem } from '@/ui/editor/state/editorFactories'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'

// ── Extracted domain modules ───────────────────────────────────────────
import { editorReducer } from '@/ui/editor/state/editorReducer'
import type { EditorState } from '@/ui/editor/state/editorReducer'
import { isFrameworkNode, isItemNode, WRAPPER_NODE_CLASS } from '@/ui/editor/state/helpers/nodeGeometry'
import { computeHierarchyLayout } from '@/ui/editor/layout/hierarchyLayout'
import { computeStarLayout } from '@/ui/editor/layout/starLayout'
import { computeTreeLayout } from '@/ui/editor/layout/treeLayout'

// ── Default graph ──────────────────────────────────────────────────────

const DEFAULT_GRAPH = createSampleGraph()

// ── Context value type ─────────────────────────────────────────────────

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
  clearDirty: () => void
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
  applyHierarchyLayout: () => void
  applyStarLayout: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────

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
  // ── CASE version ─────────────────────────────────────────────────────
  const [caseVersion, setCaseVersion] = useState<CaseVersion>(initialCaseVersion)
  useEffect(() => { setCaseVersion(initialCaseVersion) }, [initialCaseVersion])

  // ── Reducer state ────────────────────────────────────────────────────
  const seed = useMemo(() => initialGraph ?? DEFAULT_GRAPH, [initialGraph])
  const initialState: EditorState = useMemo(
    () => ({ nodes: seed.nodes, edges: seed.edges, selectedNodeId: null, selectedEdgeId: null, layoutVersion: 0, dirty: false }),
    [seed],
  )
  const [state, dispatch] = useReducer(editorReducer, initialState)
  const didInitialLayout = useRef(false)

  // ── Add-item dialog state ────────────────────────────────────────────
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

  // ── Editor settings ──────────────────────────────────────────────────
  const [settings, setSettings] = useState<EditorSettings>(() => {
    if (initialEdgeType) {
      return { edgeType: initialEdgeType as EditorSettings['edgeType'] }
    }
    try {
      const saved = globalThis.localStorage?.getItem('case-editor-settings')
      if (saved) return JSON.parse(saved) as EditorSettings
    } catch { /* ignore */ }
    return { edgeType: 'default' }
  })

  const updateSettings = useCallback((newSettings: EditorSettings) => {
    setSettings(newSettings)
    dispatch({ type: 'dirty/mark' })
  }, [])

  // ── Graph / framework loading ────────────────────────────────────────
  useEffect(() => {
    if (!graphKey) return
    dispatch({ type: 'graph/load', graph: seed })
    didInitialLayout.current = skipAutoLayout
  }, [graphKey, seed, skipAutoLayout])

  useEffect(() => {
    if (!graphKey) return
    if (initialEdgeType) {
      setSettings((prev) => ({ ...prev, edgeType: initialEdgeType as EditorSettings['edgeType'] }))
    }
  }, [graphKey, initialEdgeType])

  // ── Computed values ──────────────────────────────────────────────────
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

  // ── One-time initial auto-layout ─────────────────────────────────────
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

    const { positions } = computeTreeLayout(state.nodes, state.edges)
    dispatch({ type: 'layout/apply', positions })
    didInitialLayout.current = true
  }, [state.nodes, state.edges])

  // ── Layout callbacks (thin wrappers around pure functions) ───────────

  const applyHierarchyLayout = useCallback(() => {
    const { positions, edgeHandles } = computeHierarchyLayout(state.nodes, state.edges)
    dispatch({ type: 'layout/applyHierarchy', positions, edgeHandles })
    updateSettings({ ...settings, edgeType: 'smoothstep' })
  }, [state.nodes, state.edges, settings, updateSettings])

  const applyStarLayout = useCallback(() => {
    const { positions, edgeHandles } = computeStarLayout(state.nodes, state.edges)
    dispatch({ type: 'layout/applyHierarchy', positions, edgeHandles })
    updateSettings({ ...settings, edgeType: 'default' })
  }, [state.nodes, state.edges, settings, updateSettings])

  // ── CRUD callbacks ───────────────────────────────────────────────────

  const addChild = useCallback((parentId: string) => {
    setAddItemDialog({ open: true, parentId, viewportCenter: undefined, draft: { fullStatement: '' } })
  }, [])

  const addDetachedItem = useCallback((viewportCenter?: { x: number; y: number }) => {
    setAddItemDialog({ open: true, parentId: null, viewportCenter, draft: { fullStatement: '' } })
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
      (raw ?? '').split(',').map((x) => x.trim()).filter(Boolean)

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
      dispatch({ type: 'node/addChild', parentId: addItemDialog.parentId, childId: nodeId, cfItem })
    } else {
      dispatch({ type: 'node/addDetachedItem', nodeId, cfItem, viewportCenter: addItemDialog.viewportCenter })
    }

    setAddItemDialog({ open: false, parentId: null, viewportCenter: undefined, draft: { fullStatement: '' } })
  }, [addItemDialog])

  const deleteElements = useCallback(
    (params: { nodeIds: string[]; edgeIds: string[]; reattachChildren: boolean }) => dispatch({ type: 'graph/delete', ...params }),
    [],
  )

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

  // ── Nodes with callbacks ─────────────────────────────────────────────

  const nodesWithCallbacks = useMemo(() => {
    return state.nodes.map((n) => {
      if (isItemNode(n)) {
        const data: CaseItemNodeData = {
          ...n.data,
          onAddChild: addChild,
          onUpdateItem: (id, patch) => updateNodeData(id, { cfItem: patch }),
        }
        return { ...n, className: WRAPPER_NODE_CLASS, data }
      }

      if (isFrameworkNode(n)) {
        return {
          ...n,
          className: WRAPPER_NODE_CLASS,
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

  // ── React Flow event handlers ────────────────────────────────────────

  const onSelectionChange: OnSelectionChangeFunc<CaseEditorNodeType> = useCallback(({ nodes, edges }) => {
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

  const onNodesChange = useCallback(
    (changes: NodeChange<CaseEditorNodeType>[]) => dispatch({ type: 'nodes/applyChanges', changes }),
    [],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => dispatch({ type: 'edges/applyChanges', changes }),
    [],
  )

  const onConnect = useCallback(
    (connection: Connection) => dispatch({ type: 'edges/connect', connection }),
    [],
  )

  const clearSelection = useCallback(() => dispatch({ type: 'selection/clear' }), [])
  const clearDirty = useCallback(() => dispatch({ type: 'dirty/clear' }), [])

  // ── Context value ────────────────────────────────────────────────────

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
      applyStarLayout,
    }),
    [
      state.nodes, state.edges, state.selectedNodeId, state.selectedEdgeId,
      selectedNode, selectedEdge, nodesWithCallbacks, frameworkInfo,
      state.layoutVersion, state.dirty, clearDirty,
      caseVersion, settings, updateSettings,
      onSelectionChange, onEdgeSelectionChange, onNodesChange, onEdgesChange, onConnect,
      clearSelection, updateNodeData, updateEdgeData, flipEdge, reconnectEdge,
      addChild, addDetachedItem, addExternalFramework,
      addItemDialog, setAddItemDraft, cancelAddItem, confirmAddItem,
      deleteElements, applyHierarchyLayout, applyStarLayout,
    ],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within an EditorProvider')
  return ctx
}
