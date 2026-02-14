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
import type { CFAssociationGrouping, CFDocument, CFItem, CFItemType, CFSubject, CFConcept } from '@/domain/case/types'
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
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  selectedNode: CaseEditorNodeType | null
  selectedEdge: CaseEditorEdge | null
  nodesWithCallbacks: CaseEditorNodeType[]
  frameworkInfo: { title: string; subtitle?: string; creator?: string }
  layoutVersion: number
  isDirty: boolean
  clearDirty: () => void
  caseVersion: CaseVersion
  cfItemTypes: CFItemType[]
  addCfItemType: (_itemType: CFItemType) => void
  ensureCfItemType: (_title: string) => CFItemType | null
  cfSubjects: CFSubject[]
  addCfSubject: (_subject: CFSubject) => void
  ensureCfSubject: (_title: string) => CFSubject | null
  cfConcepts: CFConcept[]
  addCfConcept: (_concept: CFConcept) => void
  ensureCfConcept: (_title: string) => CFConcept | null
  cfAssociationGroupings: CFAssociationGrouping[]
  addCfAssociationGrouping: (_grouping: CFAssociationGrouping) => void
  ensureCfAssociationGrouping: (_title: string) => CFAssociationGrouping | null
  activeGroupingFilter: string | null
  setActiveGroupingFilter: (_id: string | null) => void
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
  initialCfItemTypes,
  initialCfSubjects,
  initialCfConcepts,
  initialCfAssociationGroupings,
}: Readonly<{
  children: ReactNode
  initialGraph?: EditorGraph
  graphKey?: string
  caseVersion?: CaseVersion
  /** Skip auto-layout when the graph already has saved positions (e.g., from CASE extensions) */
  skipAutoLayout?: boolean
  /** Edge type stored in the framework's CFDocument ext:opencase — overrides localStorage default */
  initialEdgeType?: string
  /** Seed CFItemType definitions loaded from the CFPackage / definitions index */
  initialCfItemTypes?: CFItemType[]
  /** Seed CFSubject definitions loaded from the definitions index */
  initialCfSubjects?: CFSubject[]
  /** Seed CFConcept definitions loaded from the definitions index */
  initialCfConcepts?: CFConcept[]
  /** Seed CFAssociationGrouping definitions */
  initialCfAssociationGroupings?: CFAssociationGrouping[]
}>) {
  // ── CASE version ─────────────────────────────────────────────────────
  const [caseVersion, setCaseVersion] = useState<CaseVersion>(initialCaseVersion)
  useEffect(() => { setCaseVersion(initialCaseVersion) }, [initialCaseVersion])

  // ── CFItemType definitions ──────────────────────────────────────────
  const [cfItemTypes, setCfItemTypes] = useState<CFItemType[]>(initialCfItemTypes ?? [])
  useEffect(() => { setCfItemTypes(initialCfItemTypes ?? []) }, [initialCfItemTypes])

  const addCfItemType = useCallback((itemType: CFItemType) => {
    setCfItemTypes((prev) => {
      if (prev.some((t) => t.identifier === itemType.identifier)) return prev
      return [...prev, itemType]
    })
  }, [])

  /**
   * Ensure a CFItemType definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFItemType (existing or newly created).
   */
  const ensureCfItemType = useCallback((title: string): CFItemType | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    // Check if a type with this title already exists
    const existing = cfItemTypes.find((t) => t.title === trimmed)
    if (existing) return existing
    // Auto-create a new definition with all fields required by the CASE v1.1 schema:
    // identifier, uri, title, description, hierarchyCode, lastChangeDateTime
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newType: CFItemType = {
      identifier: id,
      uri: `/ims/case/v1p1/CFItemTypes/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfItemType(newType)
    return newType
  }, [cfItemTypes, addCfItemType])

  // ── CFSubject definitions ──────────────────────────────────────────
  const [cfSubjects, setCfSubjects] = useState<CFSubject[]>(initialCfSubjects ?? [])
  useEffect(() => { setCfSubjects(initialCfSubjects ?? []) }, [initialCfSubjects])

  const addCfSubject = useCallback((subject: CFSubject) => {
    setCfSubjects((prev) => {
      if (prev.some((s) => s.identifier === subject.identifier)) return prev
      return [...prev, subject]
    })
  }, [])

  /**
   * Ensure a CFSubject definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFSubject (existing or newly created).
   */
  const ensureCfSubject = useCallback((title: string): CFSubject | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    const existing = cfSubjects.find((s) => s.title === trimmed)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newSubject: CFSubject = {
      identifier: id,
      uri: `/ims/case/v1p1/CFSubjects/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfSubject(newSubject)
    return newSubject
  }, [cfSubjects, addCfSubject])

  // ── CFConcept definitions ────────────────────────────────────────────
  const [cfConcepts, setCfConcepts] = useState<CFConcept[]>(initialCfConcepts ?? [])
  useEffect(() => { setCfConcepts(initialCfConcepts ?? []) }, [initialCfConcepts])

  const addCfConcept = useCallback((concept: CFConcept) => {
    setCfConcepts((prev) => {
      if (prev.some((c) => c.identifier === concept.identifier)) return prev
      return [...prev, concept]
    })
  }, [])

  /**
   * Ensure a CFConcept definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFConcept (existing or newly created).
   */
  const ensureCfConcept = useCallback((title: string): CFConcept | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    const existing = cfConcepts.find((c) => c.title === trimmed)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newConcept: CFConcept = {
      identifier: id,
      uri: `/ims/case/v1p1/CFConcepts/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfConcept(newConcept)
    return newConcept
  }, [cfConcepts, addCfConcept])

  // ── CFAssociationGrouping definitions ─────────────────────────────────
  const [cfAssociationGroupings, setCfAssociationGroupings] = useState<CFAssociationGrouping[]>(initialCfAssociationGroupings ?? [])
  useEffect(() => { setCfAssociationGroupings(initialCfAssociationGroupings ?? []) }, [initialCfAssociationGroupings])

  const addCfAssociationGrouping = useCallback((grouping: CFAssociationGrouping) => {
    setCfAssociationGroupings((prev) => {
      if (prev.some((g) => g.identifier === grouping.identifier)) return prev
      return [...prev, grouping]
    })
  }, [])

  const ensureCfAssociationGrouping = useCallback((title: string): CFAssociationGrouping | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    const existing = cfAssociationGroupings.find((g) => g.title === trimmed)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newGrouping: CFAssociationGrouping = {
      identifier: id,
      uri: `/ims/case/v1p1/CFAssociationGroupings/${id}`,
      title: trimmed,
      description: trimmed,
    }
    addCfAssociationGrouping(newGrouping)
    return newGrouping
  }, [cfAssociationGroupings, addCfAssociationGrouping])

  // ── Active grouping filter (UI-only, not persisted) ──────────────────
  const [activeGroupingFilter, setActiveGroupingFilter] = useState<string | null>(null)

  // ── Reducer state ────────────────────────────────────────────────────
  const seed = useMemo(() => initialGraph ?? DEFAULT_GRAPH, [initialGraph])
  const initialState: EditorState = useMemo(
    () => ({ nodes: seed.nodes, edges: seed.edges, selectedNodeId: null, selectedEdgeId: null, selectedNodeIds: [], selectedEdgeIds: [], layoutVersion: 0, dirty: false }),
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

  // Derive multi-selection IDs from React Flow's `selected` flags on nodes/edges.
  // This avoids a second reducer dispatch (and re-render) on every selection change.
  const selectedNodeIds = useMemo(
    () => state.nodes.filter((n) => n.selected).map((n) => n.id),
    [state.nodes],
  )
  const selectedEdgeIds = useMemo(
    () => state.edges.filter((e) => e.selected).map((e) => e.id),
    [state.edges],
  )

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

    // Auto-create CFItemType definition if it's a new value
    const typeName = addItemDialog.draft.CFItemType?.trim() || undefined
    const typeDefinition = typeName ? ensureCfItemType(typeName) : null

    // Auto-create CFSubject definitions for each subject and build subjectURI
    // Prefer the subjects array (from TagComboboxInput) over the legacy CSV string
    const subjectStrings = addItemDialog.draft.subjects?.length
      ? addItemDialog.draft.subjects
      : parseCsv(addItemDialog.draft.subjectCsv)
    const subjectURIs = subjectStrings
      .map((s) => ensureCfSubject(s))
      .filter((s): s is CFSubject => s !== null)
      .map((s) => ({ title: s.title ?? '', identifier: s.identifier, uri: s.uri }))

    const cfItemExtras: Partial<CFItem> = {
      abbreviatedStatement: addItemDialog.draft.abbreviatedStatement?.trim() || undefined,
      alternativeLabel: addItemDialog.draft.alternativeLabel?.trim() || undefined,
      humanCodingScheme: addItemDialog.draft.humanCodingScheme?.trim() || undefined,
      CFItemType: typeName,
      CFItemTypeURI: typeDefinition ? { title: typeDefinition.title ?? '', identifier: typeDefinition.identifier, uri: typeDefinition.uri } : undefined,
      subject: subjectStrings,
      subjectURI: subjectURIs.length > 0 ? subjectURIs : undefined,
      educationLevel: addItemDialog.draft.educationLevels?.length
        ? addItemDialog.draft.educationLevels
        : parseCsv(addItemDialog.draft.educationLevelCsv),
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
  }, [addItemDialog, ensureCfItemType, ensureCfSubject])

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

  // ── Stable callback wrappers for node data ──────────────────────────

  const updateItem = useCallback(
    (id: string, patch: Partial<CFItem>) => updateNodeData(id, { cfItem: patch }),
    [updateNodeData],
  )

  const updateDocument = useCallback(
    (id: string, patch: Partial<CFDocument>) => updateNodeData(id, { cfDocument: patch }),
    [updateNodeData],
  )

  // ── Nodes with callbacks ─────────────────────────────────────────────
  // Reuse node objects when callbacks are already attached (avoids creating
  // new objects on selection changes, which would cause React Flow to
  // re-render every node).

  const nodesWithCallbacks = useMemo(() => {
    return state.nodes.map((n) => {
      if (isItemNode(n)) {
        if (n.className === WRAPPER_NODE_CLASS && n.data.onAddChild === addChild && n.data.onUpdateItem === updateItem) {
          return n
        }
        return { ...n, className: WRAPPER_NODE_CLASS, data: { ...n.data, onAddChild: addChild, onUpdateItem: updateItem } }
      }

      if (isFrameworkNode(n)) {
        if (n.className === WRAPPER_NODE_CLASS && n.data.onAddChild === addChild && n.data.onUpdateDocument === updateDocument) {
          return n
        }
        return { ...n, className: WRAPPER_NODE_CLASS, data: { ...n.data, onAddChild: addChild, onUpdateDocument: updateDocument } }
      }

      return n
    })
  }, [state.nodes, addChild, updateItem, updateDocument])

  // ── React Flow event handlers ────────────────────────────────────────

  // Refs to avoid redundant dispatches from onSelectionChange
  const singleSelRef = useRef<{ nodeId: string | null; edgeId: string | null }>({ nodeId: null, edgeId: null })
  singleSelRef.current = { nodeId: state.selectedNodeId, edgeId: state.selectedEdgeId }

  // Refs for clearSelection (keeps the callback stable without state deps)
  const nodesRef = useRef(state.nodes)
  nodesRef.current = state.nodes
  const edgesRef = useRef(state.edges)
  edgesRef.current = state.edges

  const onSelectionChange: OnSelectionChangeFunc<CaseEditorNodeType> = useCallback(({ nodes, edges }) => {
    const nodeCount = nodes?.length ?? 0
    const edgeCount = edges?.length ?? 0
    const totalCount = nodeCount + edgeCount

    // Only track single-selection for the properties panel.
    // Multi-selection IDs are derived from node/edge `selected` flags (no extra dispatch).
    if (totalCount === 1 && nodeCount === 1) {
      if (singleSelRef.current.nodeId !== nodes[0].id) {
        dispatch({ type: 'selection/setNode', nodeId: nodes[0].id })
      }
    } else if (totalCount === 1 && edgeCount === 1) {
      if (singleSelRef.current.edgeId !== edges[0].id) {
        dispatch({ type: 'selection/setEdge', edgeId: edges[0].id })
      }
    } else if (singleSelRef.current.nodeId !== null || singleSelRef.current.edgeId !== null) {
      // Clear single-selection IDs (multi or empty) — only dispatch when needed
      dispatch({ type: 'selection/clear' })
    }
    // For multi → multi transitions, no dispatch needed — derived state handles it.
  }, [])

  const onEdgeSelectionChange = useCallback((edgeId: string | null) => {
    if (edgeId) {
      if (singleSelRef.current.edgeId !== edgeId) {
        dispatch({ type: 'selection/setEdge', edgeId })
      }
    } else if (singleSelRef.current.edgeId !== null) {
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

  const clearSelection = useCallback(() => {
    dispatch({ type: 'selection/clear' })
    // Programmatically deselect all nodes/edges through React Flow's change system
    const nodeDeselects: NodeChange<CaseEditorNodeType>[] = nodesRef.current
      .filter((n) => n.selected)
      .map((n) => ({ type: 'select' as const, id: n.id, selected: false }))
    if (nodeDeselects.length > 0) {
      dispatch({ type: 'nodes/applyChanges', changes: nodeDeselects })
    }
    const edgeDeselects: EdgeChange[] = edgesRef.current
      .filter((e) => e.selected)
      .map((e) => ({ type: 'select' as const, id: e.id, selected: false }))
    if (edgeDeselects.length > 0) {
      dispatch({ type: 'edges/applyChanges', changes: edgeDeselects })
    }
  }, [])
  const clearDirty = useCallback(() => dispatch({ type: 'dirty/clear' }), [])

  // ── Context value ────────────────────────────────────────────────────

  const value: EditorContextValue = useMemo(
    () => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId,
      selectedNodeIds,
      selectedEdgeIds,
      selectedNode,
      selectedEdge,
      nodesWithCallbacks,
      frameworkInfo,
      layoutVersion: state.layoutVersion,
      isDirty: state.dirty,
      clearDirty,
      caseVersion,
      cfItemTypes,
      addCfItemType,
      ensureCfItemType,
      cfSubjects,
      addCfSubject,
      ensureCfSubject,
      cfConcepts,
      addCfConcept,
      ensureCfConcept,
      cfAssociationGroupings,
      addCfAssociationGrouping,
      ensureCfAssociationGrouping,
      activeGroupingFilter,
      setActiveGroupingFilter,
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
      state.nodes, state.edges, state.selectedNodeId, state.selectedEdgeId, selectedNodeIds, selectedEdgeIds,
      selectedNode, selectedEdge, nodesWithCallbacks, frameworkInfo,
      state.layoutVersion, state.dirty, clearDirty,
      caseVersion, cfItemTypes, addCfItemType, ensureCfItemType,
      cfSubjects, addCfSubject, ensureCfSubject,
      cfConcepts, addCfConcept, ensureCfConcept,
      cfAssociationGroupings, addCfAssociationGrouping, ensureCfAssociationGrouping,
      activeGroupingFilter, setActiveGroupingFilter,
      settings, updateSettings,
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
