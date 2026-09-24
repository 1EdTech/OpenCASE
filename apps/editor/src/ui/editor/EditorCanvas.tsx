import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { ReactFlowInstance, Connection, Edge, NodeChange, EdgeChange } from '@xyflow/react'
import type { OnBeforeDelete } from '@xyflow/react'
import type { OnSelectionChangeFunc } from '@xyflow/react'
import { Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow, SelectionMode, useUpdateNodeInternals } from '@xyflow/react'
import { nodeTypes } from '@/ui/editor/reactflow/nodeTypes'
import { edgeTypes } from '@/ui/editor/reactflow/edgeTypes'
import CanvasHeader from '@/ui/editor/components/CanvasHeader'
import NodePropertiesPanel from '@/ui/editor/components/NodePropertiesPanel'
import EdgePropertiesPanel from '@/ui/editor/components/EdgePropertiesPanel'
import MultiSelectionPanel from '@/ui/editor/components/MultiSelectionPanel'
import AddItemDialog from '@/ui/editor/components/AddItemDialog'
import ConfirmActionDialog from '@/ui/editor/components/ConfirmActionDialog'
import ConfirmLeaveDialog from '@/ui/editor/components/ConfirmLeaveDialog'
import SettingsModal from '@/ui/editor/components/SettingsModal'
import FloatingAddButton from '@/ui/editor/components/FloatingAddButton'
import CgeFrameworkSearchPanel from '@/ui/editor/components/CgeFrameworkSearchPanel'
import RemoteFrameworkItemsPanel from '@/ui/editor/components/RemoteFrameworkItemsPanel'
import AssociationTypePickerDialog from '@/ui/editor/components/AssociationTypePickerDialog'
import ViewCFPackageDialog from '@/ui/editor/components/ViewCFPackageDialog'
import TreePanelView from '@/ui/editor/treePanel/TreePanelView'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient, formatApiErrorMessage } from '@/infrastructure/caseApi/http'
import { getAppConfig } from '@/app/config'
import type { CgeFrameworkSummary } from '@/infrastructure/caseApi/cgeTypes'
import { REMOTE_ITEM_MIME, parseRemoteItemDragPayload, type RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'
import {
  buildRemoteLinkEdges,
  remoteLinkIdFromEdgeId,
} from '@/ui/editor/remoteFramework/buildRemoteLinkGraph'
import { useEditor } from '@/ui/editor/state/EditorContext'
import { isFrameworkNode, getNodeSize } from '@/ui/editor/state/helpers/nodeGeometry'
import type { CaseEditorNodeType, CaseEditorEdge } from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem, CFPackage } from '@/domain/case/types'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import { useAuth } from '@/app/providers/AuthProvider'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import { absolutizeCaseUris, frameworkToCfPackage, toOpenCaseFormat } from '@/application/framework/mappers/case/toCasePackage'
import type { Framework } from '@/domain/framework/model/types'
import { hasFrameworkDataChanged } from '@/domain/framework/hasFrameworkDataChanged'

// ── Stable ReactFlow config (module scope — never recreated) ──────────────
//
// A fresh object/array/function literal passed as a prop to <ReactFlow> on
// every EditorCanvas render defeats any attempt to keep it from doing work
// while hidden behind Tree View: CPU profiling showed React Flow's internal
// store (setState/shallow-equality selectors) re-syncing on every keystroke
// even when node/edge DATA was unchanged, because other props (these) were
// still fresh references each render.
const REACT_FLOW_DEFAULT_EDGE_OPTIONS = {
  interactionWidth: 20,
  style: { strokeWidth: 1.5, stroke: '#94a3b8' },
  focusable: true,
  reconnectable: true,
}
const REACT_FLOW_PRO_OPTIONS = { hideAttribution: true }
const REACT_FLOW_BACKGROUND_STYLE = { backgroundColor: '#f0f0f2' }
const minimapNodeColor = (node: CaseEditorNodeType) => (node.selected ? '#8b5cf6' : '#e2e8f0') // violet-500 if selected, slate-200 otherwise
const minimapNodeStrokeColor = (node: CaseEditorNodeType) => (node.selected ? '#7c3aed' : '#cbd5e1') // violet-600 if selected, slate-300 otherwise

type ReactFlowGraphProps = {
  wrapRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  /** Cross-framework links — drive handle-position resyncs via RemoteLinkInternalsSync */
  remoteLinks: RemoteItemLink[]
  onNodesChange: (changes: NodeChange<CaseEditorNodeType>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (event: ReactMouseEvent, node: CaseEditorNodeType) => void
  onNodeDoubleClick: (event: ReactMouseEvent, node: CaseEditorNodeType) => void
  onNodeDragStart: (event: ReactMouseEvent, node: CaseEditorNodeType) => void
  onNodeDragStop: () => void
  onEdgeClick: (event: ReactMouseEvent, edge: Edge) => void
  onPaneClick: (event: ReactMouseEvent) => void
  isValidConnection: (connection: Connection) => boolean
  onSelectionChange: OnSelectionChangeFunc<CaseEditorNodeType>
  onBeforeDelete: OnBeforeDelete<CaseEditorNodeType>
  nodesDraggable: boolean
  onReconnectStart: () => void
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void
  onReconnectEnd: (_: unknown, edge: Edge) => void
  onInit: (instance: ReactFlowInstance<CaseEditorNodeType>) => void
  onPointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
}

/**
 * Isolated in its own `React.memo`'d component (rather than inline JSX in
 * EditorCanvas) so that when every prop here is referentially stable —
 * which is the case while Tree View is active, since `nodes`/`edges` are
 * frozen and every handler is `useCallback`'d — React skips calling this
 * component's render function entirely, instead of merely receiving
 * unchanged props. That's what actually stops React Flow's internal effects
 * from re-running on every keystroke while the canvas is invisible.
 */
const ReactFlowGraph = memo(function ReactFlowGraph({
  wrapRef,
  visible,
  nodes,
  edges,
  remoteLinks,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDragStart,
  onNodeDragStop,
  onEdgeClick,
  onPaneClick,
  isValidConnection,
  onSelectionChange,
  onBeforeDelete,
  nodesDraggable,
  onReconnectStart,
  onReconnect,
  onReconnectEnd,
  onInit,
  onPointerDownCapture,
  onDragOver,
  onDrop,
}: ReactFlowGraphProps) {
  return (
    <div
      ref={wrapRef}
      className={visible ? 'h-full w-full' : 'hidden'}
      onPointerDownCapture={onPointerDownCapture}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow<CaseEditorNodeType>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        onSelectionChange={onSelectionChange}
        onBeforeDelete={onBeforeDelete}
        selectionMode={SelectionMode.Full}
        multiSelectionKeyCode="Meta"
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        panOnDrag
        nodesDraggable={nodesDraggable}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        edgesFocusable
        elevateEdgesOnSelect
        edgesReconnectable
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        connectOnClick={true}
        connectionMode={ConnectionMode.Loose}
        onlyRenderVisibleElements
        defaultEdgeOptions={REACT_FLOW_DEFAULT_EDGE_OPTIONS}
        proOptions={REACT_FLOW_PRO_OPTIONS}
        onInit={onInit}
      >
        <RemoteLinkInternalsSync remoteLinks={remoteLinks} nodes={nodes} />
        <Background color="#c8c8ca" gap={20} size={1.5} variant={BackgroundVariant.Dots} style={REACT_FLOW_BACKGROUND_STYLE} />
        <Controls />
        <MiniMap
          position="bottom-left"
          className="!bottom-1 !left-12"
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={minimapNodeColor}
          nodeStrokeColor={minimapNodeStrokeColor}
          maskColor="rgba(240, 240, 245, 0.7)"
        />
      </ReactFlow>
    </div>
  )
})

type MirrorStatus = { isModifiedFromSource?: boolean; sourcePackageURI?: string }

type EditorCanvasProps = {
  onBack?: () => void
  onSaveToServer?: (cfPackage: ReturnType<typeof toOpenCaseFormat>, framework: Framework) => Promise<void>
  /** Whether the current framework has been published to OpenCASE (loaded from or saved to server) */
  isPublishedToOpenCase?: boolean
  /** Archive the current framework on the server and navigate home */
  onArchiveFramework?: () => Promise<void>
  /** Fetch the published CFPackage from the server (returns CASE JSON with absolute URIs) */
  onFetchCfPackage?: () => Promise<CFPackage>
  /** All locally-available frameworks — used to populate the crosswalk target selector in tree view */
  availableFrameworks?: HomeFramework[]
  /** Server-side framework summaries not yet loaded locally — shown in crosswalk target selector for auto-load */
  serverFrameworks?: Array<{ id: string; title: string }>
  /** Load a framework from the server into the local session (called when a server-only crosswalk target is selected) */
  onLoadTargetFramework?: (id: string) => Promise<void>
  /** Save a serialized alignment CFPackage to the server */
  onSaveAlignments?: (cfPackage: unknown) => Promise<void>
  /** Load existing alignment associations for a target framework pairing */
  onLoadAlignmentsForTarget?: (targetId: string) => Promise<{
    docId: string
    associations: Array<{ id: string; fromItemId: string; toItemId: string; toFrameworkId: string; associationType: string; originUri: string; destinationUri: string }>
  }>
  /** Discover all frameworks that already have saved alignment docs with the given source framework */
  onDiscoverAlignedTargets?: (sourceId: string) => Promise<Array<{ targetId: string; alignmentDocId: string }>>
  /** Mirror/fork status of the open framework, if it was ever imported */
  mirrorStatus?: MirrorStatus
}

function RemoteLinkInternalsSync({
  remoteLinks,
  nodes,
}: {
  remoteLinks: RemoteItemLink[]
  nodes: CaseEditorNodeType[]
}) {
  const updateNodeInternals = useUpdateNodeInternals()

  useLayoutEffect(() => {
    const frameworkRefIds = new Set(remoteLinks.map((l) => l.remoteFrameworkRefId))
    const frameworkNodeIds = nodes
      .filter((n) => n.type === 'externalFrameworkNode' && frameworkRefIds.has((n.data as { refId?: string }).refId ?? ''))
      .map((n) => n.id)

    const raf = requestAnimationFrame(() => {
      for (const link of remoteLinks) {
        updateNodeInternals(link.localItemId)
      }
      for (const nodeId of frameworkNodeIds) {
        updateNodeInternals(nodeId)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [remoteLinks, nodes, updateNodeInternals])

  return null
}

export default function EditorCanvas({ onBack, onSaveToServer, isPublishedToOpenCase, onArchiveFramework, onFetchCfPackage, availableFrameworks, serverFrameworks, onLoadTargetFramework, onSaveAlignments, onLoadAlignmentsForTarget, onDiscoverAlignedTargets, mirrorStatus }: Readonly<EditorCanvasProps>) {
  const { status: authStatus, userName, tenantId, signOut, changePassword } = useAuth()
  const {
    nodes,
    nodesWithCallbacks,
    edges: editorEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNode,
    selectedEdge,
    selectedNodeIds,
    selectedEdgeIds,
    frameworkInfo,
    clearSelection,
    updateNodeData,
    updateEdgeData,
    flipEdge,
    reconnectEdge: reconnectEdgeAction,
    layoutVersion,
    cfItemTypes,
    ensureCfItemType,
    cfSubjects,
    ensureCfSubject,
    cfConcepts,
    ensureCfConcept,
    cfLicenses,
    cfAssociationGroupings,
    ensureCfAssociationGrouping,
    activeGroupingFilter,
    setActiveGroupingFilter,
    addItemDialog,
    setAddItemDraft,
    cancelAddItem,
    confirmAddItem,
    deleteElements,
    isDirty,
    clearDirty,
    caseVersion,
    settings,
    updateSettings,
    addDetachedItem,
    addExternalFramework,
    remoteLinks,
    addRemoteLink,
    removeRemoteLink,
    updateRemoteLinkType,
    removeRemoteFramework,
    openCgeSearchPanel,
    openRemoteItemsPanel,
    closeSidePanel,
    openExternalFrameworkSettings,
    sidePanelMode,
    setSidePanelMode,
    activeRemoteFrameworkNodeId,
    setActiveRemoteFrameworkNodeId,
    applyHierarchyLayout,
    applyStarLayout,
  } = useEditor()

  const cfg = getAppConfig()
  const { getAccessToken } = useAuth()
  const api = useMemo(
    () => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })),
    [cfg.opencaseBaseUrl, getAccessToken],
  )

  const reactFlowWrapRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<CaseEditorNodeType> | null>(null)
  const [rfReady, setRfReady] = useState(false)
  const didInitialViewportRef = useRef(false)
  const prevLayoutVersionRef = useRef<number | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingRemoteDrop, setPendingRemoteDrop] = useState<{ localItemId: string; payload: ReturnType<typeof parseRemoteItemDragPayload> } | null>(null)
  const [remoteFrameworkRefreshing, setRemoteFrameworkRefreshing] = useState(false)
  const [cfPackageDialogOpen, setCfPackageDialogOpen] = useState(false)
  const [generatedCfPackage, setGeneratedCfPackage] = useState<CFPackage | null>(null)
  const [viewCaseLoading, setViewCaseLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedRemoteEdgeIds, setSelectedRemoteEdgeIds] = useState<string[]>([])

  const remoteLinkEdges = useMemo(
    () => buildRemoteLinkEdges(nodesWithCallbacks, remoteLinks, selectedRemoteEdgeIds),
    [nodesWithCallbacks, remoteLinks, selectedRemoteEdgeIds],
  )

  const allEditorEdges = useMemo(
    () => [...editorEdges, ...remoteLinkEdges],
    [editorEdges, remoteLinkEdges],
  )

  const [activeView, setActiveView] = useState<'canvas' | 'tree'>('tree')
  const [forkWarningOpen, setForkWarningOpen] = useState(false)

  // Baseline Framework snapshot for fork-detection — captured once when this
  // session's graph first loads, and refreshed after every successful save.
  // Only ever needs to change mid-session for a fork itself, and once forked
  // mirrorStatus.isModifiedFromSource flips true, permanently disabling the
  // gate below — so a single per-mount baseline is sufficient.
  const baselineFrameworkRef = useRef<Framework | null>(null)
  if (baselineFrameworkRef.current === null) {
    baselineFrameworkRef.current = fromEditorGraph({ graph: { nodes, edges: editorEdges } }).framework
  }
  const pendingSaveRef = useRef<{ openCasePackage: ReturnType<typeof toOpenCaseFormat>; framework: Framework } | null>(null)

  // Available licenses from context (loaded via App.tsx definitions pipeline)
  const availableLicenses = cfLicenses

  // Track Shift key for selection cursor styling only (DOM class, no React state).
  const shiftHeldRef = useRef(false)
  const [shiftHeldForInteractions, setShiftHeldForInteractions] = useState(false)
  useEffect(() => {
    const el = reactFlowWrapRef.current
    if (!el) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeldRef.current = true
        setShiftHeldForInteractions(true)
        el.classList.add('shift-select-mode')
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeldRef.current = false
        setShiftHeldForInteractions(false)
        el.classList.remove('shift-select-mode')
      }
    }
    const onBlur = () => {
      shiftHeldRef.current = false
      setShiftHeldForInteractions(false)
      el.classList.remove('shift-select-mode')
    }
    globalThis.addEventListener('keydown', onDown)
    globalThis.addEventListener('keyup', onUp)
    globalThis.addEventListener('blur', onBlur)
    return () => {
      globalThis.removeEventListener('keydown', onDown)
      globalThis.removeEventListener('keyup', onUp)
      globalThis.removeEventListener('blur', onBlur)
    }
  }, [])

  // Track the edge being reconnected
  const edgeReconnectSuccessful = useRef(true)

  // ── Refs for save/export (keeps callbacks stable, avoids re-renders) ──
  const graphRef = useRef({ nodes, edges: editorEdges, remoteLinks })
  graphRef.current = { nodes, edges: editorEdges, remoteLinks }
  const saveCtxRef = useRef({ caseVersion, edgeType: settings.edgeType, cfItemTypes, cfSubjects, cfConcepts, cfLicenses, cfAssociationGroupings })
  saveCtxRef.current = { caseVersion, edgeType: settings.edgeType, cfItemTypes, cfSubjects, cfConcepts, cfLicenses, cfAssociationGroupings }

  // Open the CFPackage viewer. Fetches from the server when published (absolute URIs);
  // falls back to local generation for unsaved/draft frameworks.
  const handleViewCFPackage = useCallback(async () => {
    if (isPublishedToOpenCase && onFetchCfPackage) {
      setCfPackageDialogOpen(true)
      setViewCaseLoading(true)
      try {
        const pkg = await onFetchCfPackage()
        setGeneratedCfPackage(pkg)
      } finally {
        setViewCaseLoading(false)
      }
    } else {
      const { nodes: n, edges: e, remoteLinks: rl } = graphRef.current
      const ctx = saveCtxRef.current
      const { framework, layout, remoteEditorData } = fromEditorGraph({ graph: { nodes: n, edges: e, remoteLinks: rl } })
      const cfPackage = frameworkToCfPackage({
        framework, layout,
        caseVersion: ctx.caseVersion, edgeType: ctx.edgeType,
        cfItemTypes: ctx.cfItemTypes, cfSubjects: ctx.cfSubjects,
        cfConcepts: ctx.cfConcepts, cfLicenses: ctx.cfLicenses, cfAssociationGroupings: ctx.cfAssociationGroupings,
        remoteEditorData,
      })
      const caseJson = toOpenCaseFormat(cfPackage)
      setGeneratedCfPackage(absolutizeCaseUris(caseJson, window.location.origin))
      setCfPackageDialogOpen(true)
    }
  }, [isPublishedToOpenCase, onFetchCfPackage])

  // Actually perform the save (network call). Split out from `handleSave` so
  // the fork-warning dialog can defer this until the user confirms.
  const doSave = useCallback(async (openCasePackage: ReturnType<typeof toOpenCaseFormat>, framework: Framework) => {
    if (onSaveToServer) {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await onSaveToServer(openCasePackage, framework)
        baselineFrameworkRef.current = framework
        setSaveStatus('success')
        clearDirty()
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('[Save] Failed to save to server:', err)
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
        // Don't open the CFPackage viewer here — it has nothing to show for a
        // failed save and previously opened with stale/empty content, which
        // just displayed a misleading "No CFPackage data" placeholder instead
        // of the real error (shown via saveError, next to the Save button).
      }
    } else {
      setCfPackageDialogOpen(true)
    }
  }, [onSaveToServer, clearDirty])

  // Save: Generate CFPackage and POST to server — unless this framework is
  // still a pristine mirror and the pending edits touch actual framework
  // data (not just canvas layout), in which case warn first: saving will
  // fork it into an independent local copy.
  const handleSave = useCallback(async () => {
    const { nodes: n, edges: e, remoteLinks: rl } = graphRef.current
    const ctx = saveCtxRef.current
    const { framework, layout, remoteEditorData } = fromEditorGraph({ graph: { nodes: n, edges: e, remoteLinks: rl } })
    const cfPackage = frameworkToCfPackage({
      framework, layout,
      caseVersion: ctx.caseVersion, edgeType: ctx.edgeType,
      cfItemTypes: ctx.cfItemTypes, cfSubjects: ctx.cfSubjects,
      cfConcepts: ctx.cfConcepts, cfLicenses: ctx.cfLicenses, cfAssociationGroupings: ctx.cfAssociationGroupings,
      remoteEditorData,
    })
    const openCasePackage = toOpenCaseFormat(cfPackage)
    console.log('[Save] Generated OpenCASE package:', openCasePackage)

    const willFork = mirrorStatus?.isModifiedFromSource === false &&
      baselineFrameworkRef.current !== null &&
      hasFrameworkDataChanged(baselineFrameworkRef.current, framework)

    if (willFork) {
      pendingSaveRef.current = { openCasePackage, framework }
      setForkWarningOpen(true)
      return
    }

    await doSave(openCasePackage, framework)
  }, [mirrorStatus, doSave])

  // Compute in-use groupings from actual edges (for filter dropdown)
  const inUseGroupings = useMemo(() => {
    const seenIds = new Set<string>()
    for (const e of editorEdges) {
      const gId = e.data?.cfAssociation?.CFAssociationGroupingURI?.identifier
      if (gId) seenIds.add(gId)
    }
    return cfAssociationGroupings.filter((g) => seenIds.has(g.identifier))
  }, [editorEdges, cfAssociationGroupings])

  // Auto-clear filter if the active filter is no longer in use
  useEffect(() => {
    if (activeGroupingFilter && !inUseGroupings.some((g) => g.identifier === activeGroupingFilter)) {
      setActiveGroupingFilter(null)
    }
  }, [activeGroupingFilter, inUseGroupings, setActiveGroupingFilter])

  // Effective filter: only apply if the grouping is still in use (avoids stale fade on the
  // render before the useEffect auto-clear fires)
  const effectiveGroupingFilter = activeGroupingFilter && inUseGroupings.some((g) => g.identifier === activeGroupingFilter)
    ? activeGroupingFilter
    : null

  // Apply the custom labeled edge type to all edges, passing the path style in data.
  // Per-element cache: only create new objects for edges whose data actually changed.
  // Selection-only changes reuse the previous output so React Flow skips re-rendering.
  const edgesCacheRef = useRef(new Map<string, { input: CaseEditorEdge; edgeType: string; filter: string | null; parallelIndex: number; parallelCount: number; output: CaseEditorEdge }>())

  const edgesWithType = useMemo<CaseEditorEdge[]>(() => {
    const prev = edgesCacheRef.current
    const next = new Map<string, { input: CaseEditorEdge; edgeType: string; filter: string | null; parallelIndex: number; parallelCount: number; output: CaseEditorEdge }>()
    const globalEdgeType = settings.edgeType
    const parallelOffsetsByEdgeId = new Map<string, { parallelIndex: number; parallelCount: number }>()

    // Group edges by node pair (direction-agnostic) to fan out parallel labels.
    // This keeps multiple associations (e.g. precedes + exactMatchOf) readable.
    const byPair = new Map<string, CaseEditorEdge[]>()
    for (const edge of allEditorEdges) {
      const pairKey =
        edge.source < edge.target
          ? `${edge.source}__${edge.target}`
          : `${edge.target}__${edge.source}`
      const arr = byPair.get(pairKey)
      if (arr) arr.push(edge)
      else byPair.set(pairKey, [edge])
    }
    for (const arr of byPair.values()) {
      if (arr.length <= 1) continue
      const centeredStart = -(arr.length - 1) / 2
      arr
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .forEach((edge, index) => {
          parallelOffsetsByEdgeId.set(edge.id, {
            parallelIndex: centeredStart + index,
            parallelCount: arr.length,
          })
        })
    }

    const result = allEditorEdges.map((edge) => {
      const cached = prev.get(edge.id)
      const parallel = parallelOffsetsByEdgeId.get(edge.id)
      const parallelIndex = parallel?.parallelIndex ?? 0
      const parallelCount = parallel?.parallelCount ?? 1

      // Fast path: exact same input + same global params → reuse entire output
      if (
        cached &&
        cached.input === edge &&
        cached.edgeType === globalEdgeType &&
        cached.filter === effectiveGroupingFilter &&
        cached.parallelIndex === parallelIndex &&
        cached.parallelCount === parallelCount
      ) {
        next.set(edge.id, cached)
        return cached.output
      }

      // If only selected/position changed (data ref is same) and global params unchanged,
      // reuse the output's data/style but merge the new edge shell
      if (
        cached &&
        edge.data === cached.input.data &&
        cached.edgeType === globalEdgeType &&
        cached.filter === effectiveGroupingFilter &&
        cached.parallelIndex === parallelIndex &&
        cached.parallelCount === parallelCount
      ) {
        const resolvedType = edge.data?.isRemoteLink ? 'remoteLink' as const : 'labeled' as const
        const output: CaseEditorEdge = { ...edge, type: resolvedType, data: cached.output.data, style: cached.output.style }
        next.set(edge.id, { input: edge, edgeType: globalEdgeType, filter: effectiveGroupingFilter, parallelIndex, parallelCount, output })
        return output
      }

      // Full recompute
      const baseData = {
        ...edge.data,
        edgeType: edge.data?.edgeType ?? globalEdgeType,
        parallelIndex,
        parallelCount,
      }
      let style = edge.style

      if (effectiveGroupingFilter && !edge.data?.isRemoteLink) {
        const edgeGroupId = edge.data?.cfAssociation?.CFAssociationGroupingURI?.identifier
        const isRootEdge = edge.data?.isFrameworkRootConnection
        const matches = edgeGroupId === effectiveGroupingFilter

        if (matches) {
          style = { ...style, stroke: '#0d9488', strokeWidth: 3, opacity: 1, transition: 'all 0.2s ease' }
        } else if (isRootEdge) {
          style = { ...style, opacity: 0.35, transition: 'all 0.2s ease' }
        } else {
          style = { ...style, opacity: 0.1, transition: 'all 0.2s ease' }
        }
      }

      const resolvedType = edge.data?.isRemoteLink ? 'remoteLink' as const : 'labeled' as const
      const output: CaseEditorEdge = { ...edge, type: resolvedType, data: baseData, style }
      next.set(edge.id, { input: edge, edgeType: globalEdgeType, filter: effectiveGroupingFilter, parallelIndex, parallelCount, output })
      return output
    })

    edgesCacheRef.current = next
    return result
  }, [allEditorEdges, settings.edgeType, effectiveGroupingFilter])

  // React Flow stays MOUNTED (just CSS-hidden) while Tree View is active, so
  // that pan/zoom/selection state survives switching views. But feeding it a
  // fresh `nodes`/`edges` array reference on every keystroke — even while
  // invisible — makes it redo internal store diffing across the whole graph
  // for nothing (confirmed via CPU profile: React Flow's internal selectors/
  // shallow-equality checks dominate keystroke cost at ~7,500 nodes). Freeze
  // the props actually delivered to <ReactFlow> while hidden, and only catch
  // up to the latest data the moment the canvas becomes visible again.
  const frozenCanvasGraphRef = useRef<{ nodes: CaseEditorNodeType[]; edges: CaseEditorEdge[] }>({
    nodes: nodesWithCallbacks,
    edges: edgesWithType,
  })
  if (activeView !== 'tree') {
    frozenCanvasGraphRef.current = { nodes: nodesWithCallbacks, edges: edgesWithType }
  }
  const canvasNodes = activeView === 'tree' ? frozenCanvasGraphRef.current.nodes : nodesWithCallbacks
  const canvasEdges = activeView === 'tree' ? frozenCanvasGraphRef.current.edges : edgesWithType

  // Stable identity (see comment above) — an inline arrow function here would
  // itself defeat the freeze the same way defaultEdgeOptions/proOptions did.
  const onReactFlowInit = useCallback((instance: ReactFlowInstance<CaseEditorNodeType>) => {
    reactFlowRef.current = instance
    setRfReady(true)
  }, [])

  // Validate connections - prevent framework-to-framework connections
  const nodesWithCallbacksRef = useRef(nodesWithCallbacks)
  nodesWithCallbacksRef.current = nodesWithCallbacks

  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodesWithCallbacksRef.current.find((n) => n.id === connection.source)
    const targetNode = nodesWithCallbacksRef.current.find((n) => n.id === connection.target)

    const isSourceFramework =
      sourceNode?.type === 'caseFrameworkNode' ||
      sourceNode?.type === 'externalFrameworkNode'
    const isTargetFramework =
      targetNode?.type === 'caseFrameworkNode' ||
      targetNode?.type === 'externalFrameworkNode'

    if (isSourceFramework && isTargetFramework) {
      return false
    }

    return true
  }, [])

  // Handle edge reconnection - when user drags an edge endpoint to a new handle/node
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false
  }, [])

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true

    // Use our dedicated reconnect action to update the edge in place
    const newSource = newConnection.source ?? oldEdge.source
    const newTarget = newConnection.target ?? oldEdge.target
    const newSourceHandle = newConnection.sourceHandle ?? undefined
    const newTargetHandle = newConnection.targetHandle ?? undefined

    reconnectEdgeAction(
      oldEdge.id,
      newSource,
      newTarget,
      newSourceHandle,
      newTargetHandle
    )
  }, [reconnectEdgeAction])

  const onReconnectEnd = useCallback((_: unknown, _edge: Edge) => {
    // If reconnection wasn't successful (dropped in empty space), optionally remove the edge
    // For now, we'll keep the edge if reconnection fails (user just cancels)
    if (!edgeReconnectSuccessful.current) {
      // Edge stays as-is if dropped in empty space
    }
    edgeReconnectSuccessful.current = true
  }, [])

  // During Shift-click toggles we apply the intended node select change directly
  // and ignore conflicting select-change echoes from React Flow for a short window.
  const suppressSelectEchoRef = useRef<null | { until: number }>(null)
  const preserveSelectionDuringDragRef = useRef<null | { until: number }>(null)
  const lastNodeClickAtRef = useRef(0)
  const lastEdgeClickAtRef = useRef(0)
  const lastPointerDownRef = useRef<{
    clientX: number
    clientY: number
    shiftKey: boolean
    at: number
  } | null>(null)
  const selectionDebugEnabledRef = useRef(false)

  useEffect(() => {
    try {
      const fromStorage = globalThis.localStorage?.getItem('case.debugSelection') === '1'
      const fromQuery = new URLSearchParams(globalThis.location.search).get('debugSelection') === '1'
      selectionDebugEnabledRef.current = fromStorage || fromQuery
      if (selectionDebugEnabledRef.current) {
        console.log('[selection-debug] enabled')
      }
    } catch {
      // best-effort debug toggle
    }
  }, [])

  const logSelectionDebug = useCallback((event: string, details: Record<string, unknown> = {}) => {
    if (!selectionDebugEnabledRef.current) return
    console.log(`[selection-debug] ${event}`, {
      t: Number(globalThis.performance.now().toFixed(1)),
      selectedNodeIds: [...selectedNodeIds],
      selectedEdgeIds: [...selectedEdgeIds],
      ...details,
    })
  }, [selectedNodeIds, selectedEdgeIds])

  const onCanvasPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerDownRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
      at: Date.now(),
    }
  }, [])

  const onNodeClick = useCallback((event: ReactMouseEvent, node: CaseEditorNodeType) => {
    lastNodeClickAtRef.current = Date.now()
    logSelectionDebug('onNodeClick', {
      nodeId: node.id,
      shiftKey: event.shiftKey,
      button: event.button,
    })

    if (!event.shiftKey) {
      suppressSelectEchoRef.current = null
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const wasSelected = selectedNodeIds.includes(node.id)
    const intendedNodeIds = wasSelected
      ? selectedNodeIds.filter((id) => id !== node.id)
      : [...selectedNodeIds, node.id]
    const nodeChanges: NodeChange<CaseEditorNodeType>[] = [
      ...selectedNodeIds.map((id) => ({ type: 'select' as const, id, selected: id !== node.id })),
      ...(!selectedNodeIds.includes(node.id) ? [{ type: 'select' as const, id: node.id, selected: true }] : []),
    ]
    const edgeChanges: EdgeChange[] = selectedEdgeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
    onNodesChange(nodeChanges)
    if (edgeChanges.length > 0) onEdgesChange(edgeChanges)
    suppressSelectEchoRef.current = { until: Date.now() + 250 }
    logSelectionDebug('onNodeClick/manualToggle', {
      nodeId: node.id,
      wasSelected,
      nextSelected: !wasSelected,
      intendedSelectedNodeIds: intendedNodeIds,
      reassertedEdgeCount: edgeChanges.length,
      suppressEchoMs: 250,
    })
  }, [logSelectionDebug, onEdgesChange, onNodesChange, selectedEdgeIds, selectedNodeIds])

  const onNodeDragStart = useCallback((_: ReactMouseEvent, node: CaseEditorNodeType) => {
    const preserve = selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)
    if (!preserve) return
    preserveSelectionDuringDragRef.current = { until: Date.now() + 1200 }
    logSelectionDebug('onNodeDragStart/preserveMultiSelection', {
      nodeId: node.id,
      selectedCount: selectedNodeIds.length,
      preserveMs: 1200,
    })
  }, [logSelectionDebug, selectedNodeIds])

  const onNodeDragStop = useCallback(() => {
    preserveSelectionDuringDragRef.current = null
    logSelectionDebug('onNodeDragStop/clearPreserveWindow')
  }, [logSelectionDebug])

  const onEdgeClick = useCallback((event: ReactMouseEvent, edge: Edge) => {
    lastEdgeClickAtRef.current = Date.now()
    logSelectionDebug('onEdgeClick', {
      edgeId: edge.id,
      shiftKey: event.shiftKey,
      button: event.button,
    })

    if (!event.shiftKey) {
      suppressSelectEchoRef.current = null
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const wasSelected = selectedEdgeIds.includes(edge.id)
    const intendedEdgeIds = wasSelected
      ? selectedEdgeIds.filter((id) => id !== edge.id)
      : [...selectedEdgeIds, edge.id]
    const edgeChanges: EdgeChange[] = [
      ...selectedEdgeIds.map((id) => ({ type: 'select' as const, id, selected: id !== edge.id })),
      ...(!selectedEdgeIds.includes(edge.id) ? [{ type: 'select' as const, id: edge.id, selected: true }] : []),
    ]
    const nodeChanges: NodeChange<CaseEditorNodeType>[] = selectedNodeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
    onEdgesChange(edgeChanges)
    if (nodeChanges.length > 0) onNodesChange(nodeChanges)
    suppressSelectEchoRef.current = { until: Date.now() + 250 }
    logSelectionDebug('onEdgeClick/manualToggle', {
      edgeId: edge.id,
      wasSelected,
      nextSelected: !wasSelected,
      intendedSelectedEdgeIds: intendedEdgeIds,
      reassertedNodeCount: nodeChanges.length,
      suppressEchoMs: 250,
    })
  }, [logSelectionDebug, onEdgesChange, onNodesChange, selectedEdgeIds, selectedNodeIds])

  const onNodesChangeWithSelectionGuard = useCallback((changes: NodeChange<CaseEditorNodeType>[]) => {
    const suppressEcho = suppressSelectEchoRef.current
    const preserveDuringDrag = preserveSelectionDuringDragRef.current
    const hasSelectChanges = changes.some((c) => c.type === 'select')
    const selectChanges = changes.filter((c): c is Extract<NodeChange<CaseEditorNodeType>, { type: 'select' }> => c.type === 'select')
    logSelectionDebug('onNodesChange/received', {
      hasSelectChanges,
      suppressActive: Boolean(suppressEcho && Date.now() <= suppressEcho.until),
      preserveDuringDragActive: Boolean(preserveDuringDrag && Date.now() <= preserveDuringDrag.until),
      shiftHeld: shiftHeldRef.current,
      changes: changes.map((c) => c.type === 'select'
        ? { type: c.type, id: c.id, selected: c.selected }
        : { type: c.type, id: 'id' in c ? c.id : undefined }),
    })

    if (
      !shiftHeldRef.current &&
      preserveDuringDrag &&
      Date.now() <= preserveDuringDrag.until &&
      hasSelectChanges
    ) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      const reassertSelected = selectedNodeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
      logSelectionDebug('onNodesChange/preserveMultiSelectionDuringDrag', {
        selectCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        reassertCount: reassertSelected.length,
      })
      onNodesChange([...reassertSelected, ...nonSelectChanges])
      return
    }

    // Defensive guard for intermittent React Flow race:
    // while Shift is held, we sometimes receive a batch that deselects all
    // currently selected nodes (multi false) after marquee selection + rapid click.
    // Ignore only those suspicious select changes.
    if (
      shiftHeldRef.current &&
      selectChanges.length > 1 &&
      selectChanges.every((c) => c.selected === false)
    ) {
      // If this came from a Shift click on a selected node, convert the blocked
      // deselect-all batch into deselecting only the clicked node.
      const pointer = lastPointerDownRef.current
      if (pointer && pointer.shiftKey && Date.now() - pointer.at <= 500) {
        const instance = reactFlowRef.current
        const wrap = reactFlowWrapRef.current
        if (instance && wrap) {
          const viewport = instance.getViewport()
          const rect = wrap.getBoundingClientRect()
          const flowX = (pointer.clientX - rect.left - viewport.x) / viewport.zoom
          const flowY = (pointer.clientY - rect.top - viewport.y) / viewport.zoom
          const hitSelectedNodeId = selectedNodeIds.find((id) => {
            // Read via graphRef, not the closed-over `nodes`, so this callback's
            // identity doesn't change on every keystroke (nodes' reference
            // changes on every dispatch, even ones that don't touch positions).
            const node = graphRef.current.nodes.find((n) => n.id === id)
            if (!node) return false
            const anyNode = node as unknown as {
              measured?: { width?: number; height?: number }
              width?: number
              height?: number
              style?: { width?: number | string; height?: number | string }
            }
            const w =
              anyNode.measured?.width ??
              (typeof anyNode.width === 'number' ? anyNode.width : undefined) ??
              (typeof anyNode.style?.width === 'number' ? anyNode.style?.width : undefined) ??
              360
            const h =
              anyNode.measured?.height ??
              (typeof anyNode.height === 'number' ? anyNode.height : undefined) ??
              (typeof anyNode.style?.height === 'number' ? anyNode.style?.height : undefined) ??
              220
            return flowX >= node.position.x && flowX <= node.position.x + w && flowY >= node.position.y && flowY <= node.position.y + h
          })
          if (hitSelectedNodeId) {
            const targetChanges: NodeChange<CaseEditorNodeType>[] = selectedNodeIds.map((id) => ({
              type: 'select' as const,
              id,
              selected: id !== hitSelectedNodeId,
            }))
            suppressSelectEchoRef.current = { until: Date.now() + 300 }
            logSelectionDebug('onNodesChange/convertedBlockedBatchToSingleDeselect', {
              hitSelectedNodeId,
              selectedCount: selectedNodeIds.length,
              suppressEchoMs: 300,
            })
            onNodesChange(targetChanges)
            return
          }
        }
      }

      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      const reassertSelected = selectedNodeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
      suppressSelectEchoRef.current = { until: Date.now() + 300 }
      logSelectionDebug('onNodesChange/blockedShiftDeselectAllBatch', {
        blockedCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        reassertCount: reassertSelected.length,
        suppressEchoMs: 300,
      })
      if (reassertSelected.length > 0) onNodesChange(reassertSelected)
      if (nonSelectChanges.length > 0) onNodesChange(nonSelectChanges)
      return
    }

    // Another intermittent Shift race: React Flow may emit a "replace selection"
    // batch (one selected:true + many selected:false). Under Shift interactions we
    // normalize this into additive behavior by dropping only the false entries.
    if (
      shiftHeldRef.current &&
      selectChanges.some((c) => c.selected === true) &&
      selectChanges.some((c) => c.selected === false)
    ) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select') as NodeChange<CaseEditorNodeType>[]
      suppressSelectEchoRef.current = { until: Date.now() + 300 }
      logSelectionDebug('onNodesChange/ignoredShiftMixedBatch', {
        originalCount: changes.length,
        selectCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        suppressEchoMs: 300,
      })
      if (nonSelectChanges.length > 0) onNodesChange(nonSelectChanges)
      return
    }

    if (suppressEcho && Date.now() <= suppressEcho.until && hasSelectChanges) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      logSelectionDebug('onNodesChange/suppressedSelectEcho', { forwardedNonSelectCount: nonSelectChanges.length })
      if (nonSelectChanges.length > 0) onNodesChange(nonSelectChanges)
      return
    }

    onNodesChange(changes)
    logSelectionDebug('onNodesChange/forwarded', { changeCount: changes.length })
  }, [logSelectionDebug, onNodesChange, selectedNodeIds])

  const handleRemoteEdgeChanges = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (!('id' in change) || !change.id.startsWith('remote_link_')) continue

      if (change.type === 'remove') {
        const linkId = remoteLinkIdFromEdgeId(change.id)
        if (linkId) removeRemoteLink(linkId)
        setSelectedRemoteEdgeIds((prev) => prev.filter((id) => id !== change.id))
        continue
      }

      if (change.type === 'select') {
        if (change.selected) {
          setSelectedRemoteEdgeIds((prev) =>
            shiftHeldRef.current
              ? [...prev.filter((id) => id !== change.id), change.id]
              : [change.id],
          )
          const linkId = remoteLinkIdFromEdgeId(change.id)
          const link = remoteLinks.find((l) => l.id === linkId)
          if (link && !shiftHeldRef.current) {
            onNodesChange([
              ...nodesWithCallbacks
                .filter((n) => n.selected)
                .map((n) => ({ type: 'select' as const, id: n.id, selected: false })),
              { type: 'select', id: link.localItemId, selected: true },
            ])
          }
        } else {
          setSelectedRemoteEdgeIds((prev) => prev.filter((id) => id !== change.id))
        }
      }
    }
  }, [nodesWithCallbacks, onNodesChange, remoteLinks, removeRemoteLink])

  const onEdgesChangeWithSelectionGuard = useCallback((changes: EdgeChange[]) => {
    const remoteChanges = changes.filter((c) => 'id' in c && c.id.startsWith('remote_link_'))
    const normalChanges = changes.filter((c) => !('id' in c) || !c.id.startsWith('remote_link_'))

    if (remoteChanges.length > 0) {
      handleRemoteEdgeChanges(remoteChanges)
    }

    if (normalChanges.length === 0) return

    if (normalChanges.some((c) => c.type === 'select' && c.selected === true)) {
      setSelectedRemoteEdgeIds([])
    }

    const changesToProcess = normalChanges
    const suppressEcho = suppressSelectEchoRef.current
    const preserveDuringDrag = preserveSelectionDuringDragRef.current
    const selectChanges = changesToProcess.filter((c): c is Extract<EdgeChange, { type: 'select' }> => c.type === 'select')
    const hasSelectChanges = selectChanges.length > 0
    logSelectionDebug('onEdgesChange/received', {
      hasSelectChanges,
      shiftHeld: shiftHeldRef.current,
      suppressActive: Boolean(suppressEcho && Date.now() <= suppressEcho.until),
      preserveDuringDragActive: Boolean(preserveDuringDrag && Date.now() <= preserveDuringDrag.until),
      changes: changes.map((c) => c.type === 'select'
        ? { type: c.type, id: c.id, selected: c.selected }
        : { type: c.type, id: 'id' in c ? c.id : undefined }),
    })

    if (
      !shiftHeldRef.current &&
      preserveDuringDrag &&
      Date.now() <= preserveDuringDrag.until &&
      hasSelectChanges
    ) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      const reassertSelected = selectedEdgeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
      logSelectionDebug('onEdgesChange/preserveMultiSelectionDuringDrag', {
        selectCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        reassertCount: reassertSelected.length,
      })
      onEdgesChange([...reassertSelected, ...nonSelectChanges])
      return
    }

    // Mirror the node guard: while Shift is held, ignore suspicious edge
    // deselect-all batches that can arrive after marquee + rapid toggle.
    if (
      shiftHeldRef.current &&
      selectChanges.length > 1 &&
      selectChanges.every((c) => c.selected === false)
    ) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      const reassertSelected = selectedEdgeIds.map((id) => ({ type: 'select' as const, id, selected: true }))
      suppressSelectEchoRef.current = { until: Date.now() + 300 }
      logSelectionDebug('onEdgesChange/blockedShiftDeselectAllBatch', {
        blockedCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        reassertCount: reassertSelected.length,
        suppressEchoMs: 300,
      })
      if (reassertSelected.length > 0) onEdgesChange(reassertSelected)
      if (nonSelectChanges.length > 0) onEdgesChange(nonSelectChanges)
      return
    }

    if (
      shiftHeldRef.current &&
      selectChanges.some((c) => c.selected === true) &&
      selectChanges.some((c) => c.selected === false)
    ) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select') as EdgeChange[]
      suppressSelectEchoRef.current = { until: Date.now() + 300 }
      logSelectionDebug('onEdgesChange/ignoredShiftMixedBatch', {
        originalCount: changes.length,
        selectCount: selectChanges.length,
        forwardedNonSelectCount: nonSelectChanges.length,
        suppressEchoMs: 300,
      })
      if (nonSelectChanges.length > 0) onEdgesChange(nonSelectChanges)
      return
    }

    if (suppressEcho && Date.now() <= suppressEcho.until && hasSelectChanges) {
      const nonSelectChanges = changesToProcess.filter((c) => c.type !== 'select')
      logSelectionDebug('onEdgesChange/suppressedSelectEcho', { forwardedNonSelectCount: nonSelectChanges.length })
      if (nonSelectChanges.length > 0) onEdgesChange(nonSelectChanges)
      return
    }

    onEdgesChange(changesToProcess)
    logSelectionDebug('onEdgesChange/forwarded', { changeCount: changesToProcess.length })
  }, [handleRemoteEdgeChanges, logSelectionDebug, onEdgesChange, selectedEdgeIds])

  const onPaneClick = useCallback((event: ReactMouseEvent) => {
    // Ignore Shift-modified pane clicks (they may occur as part of add-to-selection gestures).
    if (event.shiftKey) {
      logSelectionDebug('onPaneClick/ignoredShift')
      return
    }
    // Ignore pane clicks that arrive right after a node click due to event sequencing.
    const now = Date.now()
    const sinceNodeClick = now - lastNodeClickAtRef.current
    const sinceEdgeClick = now - lastEdgeClickAtRef.current
    if (sinceNodeClick < 250 || sinceEdgeClick < 250) {
      logSelectionDebug('onPaneClick/ignoredRecentElementClick', {
        sinceNodeClickMs: sinceNodeClick,
        sinceEdgeClickMs: sinceEdgeClick,
      })
      return
    }
    suppressSelectEchoRef.current = null
    setSelectedRemoteEdgeIds([])
    if (selectedNodeIds.length + selectedEdgeIds.length > 0) {
      logSelectionDebug('onPaneClick/clearSelection')
      clearSelection()
      return
    }
    logSelectionDebug('onPaneClick/noop')
  }, [clearSelection, logSelectionDebug, selectedNodeIds, selectedEdgeIds])

  const [pendingAction, setPendingAction] = useState<null | {
    nodeIds: string[]
    edgeIds: string[]
    itemCount: number
    childItemCount: number
    reattachChildren: boolean
    isFrameworkArchive: boolean
    resolve: (allowDelete: boolean) => void
  }>(null)
  const [archiving, setArchiving] = useState(false)

  // Helper function to get the center of the current viewport in flow coordinates
  const getViewportCenter = useCallback(() => {
    const instance = reactFlowRef.current
    const wrap = reactFlowWrapRef.current
    if (!instance || !wrap) return undefined

    const viewport = instance.getViewport()
    const wrapRect = wrap.getBoundingClientRect()

    // Convert screen center to flow coordinates
    const centerX = (wrapRect.width / 2 - viewport.x) / viewport.zoom
    const centerY = (wrapRect.height / 2 - viewport.y) / viewport.zoom

    return { x: centerX, y: centerY }
  }, [])

  const linkedFrameworkNodes = useMemo(
    () => nodesWithCallbacks.filter((n) => n.type === 'externalFrameworkNode'),
    [nodesWithCallbacks],
  )

  const hasSelection = Boolean(selectedNode || selectedEdge || (selectedNodeIds.length + selectedEdgeIds.length > 1))
  const showBrowsePanel = sidePanelMode === 'cgeSearch' || sidePanelMode === 'remoteItems'
  const showPropertiesPanel = hasSelection && !showBrowsePanel
  const sidePanelOpen = showBrowsePanel || showPropertiesPanel

  const handleAddCgeFrameworkToCanvas = useCallback(async (fw: CgeFrameworkSummary) => {
    if (!tenantId) throw new Error('Sign in required')

    const existing = linkedFrameworkNodes.find((n) => n.data.cgeFrameworkId === fw.frameworkId)
    if (existing) {
      if (existing.data.cacheDocId && !existing.data.cacheError) {
        openRemoteItemsPanel(existing.id)
      } else {
        openExternalFrameworkSettings(existing.id)
      }
      return
    }

    const refId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
    const viewportCenter = getViewportCenter()
    const nodeId = addExternalFramework({
      refId,
      title: fw.title,
      cgeFrameworkId: fw.frameworkId,
      color: '',
      sourceUri: fw.sourceUri,
      uri: fw.sourceUri,
      source: fw.publisher,
      cacheLoading: true,
    }, viewportCenter)

    try {
      const result = await api.importCgeFramework({
        tenantId,
        frameworkId: fw.frameworkId,
        sourceUri: fw.sourceUri,
        registryId: fw.registryId,
        readOnly: true,
        subscribe: false,
      })
      updateNodeData(nodeId, {
        title: result.title ?? fw.title,
        cacheDocId: result.docId,
        itemCount: result.itemCount,
        cachedAt: result.cachedAt,
        sourceUri: result.sourceUri ?? fw.sourceUri,
        cacheError: null,
        cacheLoading: false,
      })
      setActiveRemoteFrameworkNodeId(nodeId)
      setSidePanelMode('remoteItems')
    } catch (e) {
      updateNodeData(nodeId, {
        cacheError: formatApiErrorMessage(e, 'Failed to download framework from publisher'),
        cacheLoading: false,
      })
      openExternalFrameworkSettings(nodeId)
    }
  }, [
    tenantId,
    linkedFrameworkNodes,
    getViewportCenter,
    addExternalFramework,
    api,
    updateNodeData,
    openRemoteItemsPanel,
    openExternalFrameworkSettings,
    setActiveRemoteFrameworkNodeId,
    setSidePanelMode,
  ])

  const handleRefreshActiveRemoteFramework = useCallback(async () => {
    const nodeId = activeRemoteFrameworkNodeId ?? selectedNode?.id
    const node = linkedFrameworkNodes.find((n) => n.id === nodeId) ?? selectedNode
    if (!tenantId || !node || node.type !== 'externalFrameworkNode') return
    const cgeFrameworkId = node.data.cgeFrameworkId
    if (!cgeFrameworkId) return
    setRemoteFrameworkRefreshing(true)
    updateNodeData(node.id, { cacheLoading: true, cacheError: null })
    try {
      const result = node.data.cacheDocId
        ? await api.refreshCgeCache({
            tenantId,
            frameworkId: cgeFrameworkId,
            skipPublisherAuth: node.data.skipPublisherAuth,
          })
        : await api.importCgeFramework({
            tenantId,
            frameworkId: cgeFrameworkId,
            sourceUri: node.data.sourceUri ?? node.data.uri,
            readOnly: true,
            subscribe: false,
            skipPublisherAuth: node.data.skipPublisherAuth,
          })
      updateNodeData(node.id, {
        title: result.title ?? node.data.title,
        itemCount: result.itemCount,
        cachedAt: result.cachedAt,
        cacheDocId: result.docId ?? node.data.cacheDocId,
        sourceUri: result.sourceUri ?? node.data.sourceUri,
        cacheError: null,
        cacheLoading: false,
      })
    } catch (e) {
      updateNodeData(node.id, {
        cacheError: formatApiErrorMessage(e, 'Failed to download framework from publisher'),
        cacheLoading: false,
      })
    } finally {
      setRemoteFrameworkRefreshing(false)
    }
  }, [tenantId, activeRemoteFrameworkNodeId, selectedNode, linkedFrameworkNodes, api, updateNodeData])

  const handleRemoveActiveRemoteFramework = useCallback(() => {
    const nodeId = activeRemoteFrameworkNodeId ?? selectedNode?.id
    if (nodeId) removeRemoteFramework(nodeId)
  }, [activeRemoteFrameworkNodeId, selectedNode?.id, removeRemoteFramework])

  // Double-clicking a linked CASE Global framework opens its item browser once
  // its cache has downloaded, or its settings panel when the download failed /
  // hasn't happened yet. `useCallback` keeps ReactFlowGraph's memo intact.
  const onNodeDoubleClick = useCallback((_: ReactMouseEvent, node: CaseEditorNodeType) => {
    if (node.type !== 'externalFrameworkNode') return
    const ext = node.data
    if (ext.cacheDocId && !ext.cacheError) {
      openRemoteItemsPanel(node.id)
    } else {
      openExternalFrameworkSettings(node.id)
    }
  }, [openRemoteItemsPanel, openExternalFrameworkSettings])

  const handleRemoteDrop = useCallback((localItemId: string, raw: string) => {
    const payload = parseRemoteItemDragPayload(raw)
    if (!payload) return
    setPendingRemoteDrop({ localItemId, payload })
  }, [])

  const confirmRemoteLink = useCallback((associationType: string) => {
    if (!pendingRemoteDrop?.payload) return
    const p = pendingRemoteDrop.payload
    const linkId = globalThis.crypto?.randomUUID?.() ?? `link_${Date.now()}`
    const link: RemoteItemLink = {
      id: linkId,
      localItemId: pendingRemoteDrop.localItemId,
      remoteItemUri: p.uri ?? p.identifier,
      remoteItemIdentifier: p.identifier,
      remoteFrameworkRefId: p.remoteFrameworkRefId,
      associationType,
      remoteLabel: p.label,
      remoteHumanCodingScheme: p.humanCodingScheme,
      remoteFrameworkTitle: p.remoteFrameworkTitle,
      remoteFrameworkColor: p.remoteFrameworkColor,
      cfAssociationId: linkId,
    }
    addRemoteLink(link)
    setPendingRemoteDrop(null)
  }, [pendingRemoteDrop, addRemoteLink])

  const onPaneDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(REMOTE_ITEM_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
    }
  }, [])

  const onPaneDrop = useCallback((e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(REMOTE_ITEM_MIME)
    if (!raw) return
    e.preventDefault()
    const instance = reactFlowRef.current
    if (!instance) return
    const position = instance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const targetNode = instance.getIntersectingNodes({ x: position.x, y: position.y, width: 1, height: 1 })
      .find((n) => n.type === 'caseItemNode')
    if (targetNode) {
      handleRemoteDrop(targetNode.id, raw)
    }
  }, [handleRemoteDrop])

  // Keyboard shortcuts for adding items and remote frameworks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Check for Cmd/Ctrl modifier
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      // Cmd/Ctrl + C: Add new item
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        const viewportCenter = getViewportCenter()
        addDetachedItem(viewportCenter)
        return
      }

      // Cmd/Ctrl + F: Search CASE Global frameworks
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openCgeSearchPanel()
        return
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [addDetachedItem, getViewportCenter, openCgeSearchPanel])

  const onBeforeDelete: OnBeforeDelete<CaseEditorNodeType> = useCallback(
    async ({ nodes, edges: deletedEdges }) => {
      // Read via refs, not the closed-over nodesWithCallbacks/editorEdges, so
      // this callback's identity doesn't change on every keystroke (both
      // change reference on every dispatch, even ones that don't affect
      // what's deletable) — see graphRef/nodesWithCallbacksRef above.
      const allNodes = nodesWithCallbacksRef.current
      const allEdges = graphRef.current.edges
      const includesFramework = nodes.some((n) => n.type === 'caseFrameworkNode')

      const nodeIds = includesFramework ? allNodes.map((n) => n.id) : nodes.map((n) => n.id)
      const edgeIds = includesFramework ? allEdges.map((e) => e.id) : deletedEdges.map((e) => e.id)

      const nodeIdSet = new Set(nodeIds)
      const deletedItemIdSet = new Set(
        (includesFramework ? allNodes : nodes).filter((n) => n.type === 'caseItemNode').map((n) => n.id),
      )

      const childItemCount = allNodes.filter(
        (n) =>
          n.type === 'caseItemNode' &&
          !nodeIdSet.has(n.id) &&
          Boolean((n.data as { parentId?: string }).parentId) &&
          deletedItemIdSet.has((n.data as { parentId?: string }).parentId!),
      ).length

      const itemCount = deletedItemIdSet.size

      return new Promise<boolean>((resolve) => {
        setPendingAction({
          nodeIds,
          edgeIds,
          itemCount,
          childItemCount,
          reattachChildren: !includesFramework,
          isFrameworkArchive: includesFramework,
          resolve,
        })
      })
    },
    [],
  )

  const closeActionDialog = useCallback(() => {
    setPendingAction((pd) => {
      pd?.resolve(false)
      return null
    })
  }, [])

  const confirmAction = useCallback(
    async (options: { reattachChildren: boolean }) => {
      if (!pendingAction) return
      const isArchive = pendingAction.isFrameworkArchive

      if (isArchive) {
        // Archive on the server first, then navigate home
        if (onArchiveFramework) {
          setArchiving(true)
          try {
            await onArchiveFramework()
          } catch (err) {
            console.error('[EditorCanvas] Failed to archive framework:', err)
            setArchiving(false)
            pendingAction.resolve(false)
            setPendingAction(null)
            return
          }
          setArchiving(false)
        }
        pendingAction.resolve(false)
        setPendingAction(null)
        // Navigation is handled by onArchiveFramework callback
      } else {
        // Local item removal
        deleteElements({
          nodeIds: pendingAction.nodeIds,
          edgeIds: pendingAction.edgeIds,
          reattachChildren: options.reattachChildren,
        })
        pendingAction.resolve(false)
        setPendingAction(null)
      }
    },
    [pendingAction, deleteElements, onArchiveFramework],
  )

  const ensureNodeVisible = useCallback(
    (node: CaseEditorNodeType) => {
      const instance = reactFlowRef.current
      const wrap = reactFlowWrapRef.current
      if (!instance || !wrap) return

      const viewport = instance.getViewport()
      const zoom = viewport.zoom

      // Node size heuristics: prefer measured/explicit sizes, fall back to style defaults.
      const anyNode = node as unknown as {
        measured?: { width?: number; height?: number }
        width?: number
        height?: number
        style?: { width?: number | string; height?: number | string }
      }
      const w =
        anyNode.measured?.width ??
        (typeof anyNode.width === 'number' ? anyNode.width : undefined) ??
        (typeof anyNode.style?.width === 'number' ? anyNode.style?.width : undefined) ??
        360
      const h =
        anyNode.measured?.height ??
        (typeof anyNode.height === 'number' ? anyNode.height : undefined) ??
        (typeof anyNode.style?.height === 'number' ? anyNode.style?.height : undefined) ??
        220

      const wrapRect = wrap.getBoundingClientRect()
      const isMultiSelect = selectedNodeIds.length + selectedEdgeIds.length > 1
      const panelWidth = (selectedNode || selectedEdge || isMultiSelect) ? Math.min(460, globalThis.innerWidth * 0.92) : 0

      const margin = 24
      const safeTop = 96 // leave room for the floating header
      const safeRight = wrapRect.width - panelWidth - margin
      const safeLeft = margin
      const safeBottom = wrapRect.height - margin

      const nodeX = node.position.x
      const nodeY = node.position.y

      const x1 = nodeX * zoom + viewport.x
      const x2 = (nodeX + w) * zoom + viewport.x
      const y1 = nodeY * zoom + viewport.y
      const y2 = (nodeY + h) * zoom + viewport.y

      let dx = 0
      let dy = 0

      if (x2 > safeRight) dx = x2 - safeRight
      if (x1 - dx < safeLeft) dx = x1 - safeLeft

      if (y2 > safeBottom) dy = y2 - safeBottom
      if (y1 - dy < safeTop) dy = y1 - safeTop

      if (dx === 0 && dy === 0) return

      instance.setViewport(
        {
          x: viewport.x - dx,
          y: viewport.y - dy,
          zoom,
        },
        { duration: 220 },
      )
    },
    [selectedNode, selectedEdge, selectedNodeIds, selectedEdgeIds],
  )

  // Auto-pan to keep the selected node visible. No state dispatches — selection
  // is derived from the `selected` flags managed by onNodesChange/onEdgesChange.
  const onSelectionChangeWithPan: OnSelectionChangeFunc<CaseEditorNodeType> = useCallback(
    (params) => {
      const selectedNodes = params.nodes ?? []
      const selectedEdges = params.edges ?? []
      const suppressEcho = suppressSelectEchoRef.current
      const suppressActive = Boolean(suppressEcho && Date.now() <= suppressEcho.until)
      const countMismatch =
        selectedNodes.length !== selectedNodeIds.length ||
        selectedEdges.length !== selectedEdgeIds.length
      logSelectionDebug('onSelectionChange', {
        nodeCount: selectedNodes.length,
        edgeCount: selectedEdges.length,
        nodeIds: selectedNodes.map((n) => n.id),
        edgeIds: selectedEdges.map((e) => e.id),
        shiftHeld: shiftHeldRef.current,
        suppressActive,
        countMismatch,
      })
      // React Flow can briefly emit stale selection snapshots during rapid Shift
      // interactions; ignore those to prevent side effects from transient states.
      if (shiftHeldRef.current || suppressActive || countMismatch) return
      if (selectedNodes.length !== 1 || selectedEdges.length !== 0) return
      const selected = selectedNodes[0]

      // Two rAFs: selection state and node measurements may settle after the event.
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          ensureNodeVisible(selected)
        })
      })
    },
    [ensureNodeVisible, logSelectionDebug, selectedNodeIds.length, selectedEdgeIds.length],
  )

  // Center on the framework's root node, at a fixed, comfortable zoom —
  // regardless of framework size — so the user lands oriented on the root
  // instead of a fit-to-everything view that can shrink the root to a speck
  // in a large framework. Runs on the very first paint AND whenever the user
  // switches layout mode (Hierarchy/Star "views"), since a layout switch
  // moves every node and should re-orient the same way a fresh load does.
  const centerOnRoot = useCallback(() => {
    const instance = reactFlowRef.current
    const wrap = reactFlowWrapRef.current
    if (!instance || !wrap) return

    const DEFAULT_ROOT_ZOOM = 1
    const animate = didInitialViewportRef.current
    const duration = animate ? 200 : 0

    const center = () => {
      const instance2 = reactFlowRef.current
      if (!instance2) return
      const root = instance2.getNodes().find(isFrameworkNode)
      if (!root) return
      const { w, h } = getNodeSize(root)
      instance2.setCenter(root.position.x + w / 2, root.position.y + h / 2, {
        zoom: DEFAULT_ROOT_ZOOM,
        duration,
      })
      didInitialViewportRef.current = true
    }

    // Switching back from Tree View unhides this container (display:none →
    // visible) in the same tick that triggers this effect, but the browser
    // doesn't recompute layout — and React Flow's own ResizeObserver doesn't
    // refresh its cached container size — until a later frame. Centering
    // immediately would compute pan/zoom against a stale 0x0 size, so poll
    // until the container actually has a measurable size (bounded, in case
    // it's genuinely hidden for some other reason).
    const MAX_ATTEMPTS = 30
    let attempts = 0
    let rafId: number

    const waitForSizeThenCenter = () => {
      const { width, height } = reactFlowWrapRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 }
      if ((width > 0 && height > 0) || attempts >= MAX_ATTEMPTS) {
        center()
        return
      }
      attempts += 1
      rafId = globalThis.requestAnimationFrame(waitForSizeThenCenter)
    }

    // One rAF to let React Flow apply any pending node measurements/positions
    // before the size-polling loop starts.
    const id = globalThis.requestAnimationFrame(() => {
      rafId = globalThis.requestAnimationFrame(waitForSizeThenCenter)
    })

    return () => {
      globalThis.cancelAnimationFrame(id)
      globalThis.cancelAnimationFrame(rafId)
    }
  }, [])

  const fitToContents = useCallback(() => {
    const instance = reactFlowRef.current
    const wrap = reactFlowWrapRef.current
    if (!instance || !wrap) return

    const HEADER_OVERLAY_PX = 72 // header height + breathing room
    const MAX_INITIAL_ZOOM = 1 // avoid over-zooming when the graph is small (e.g. new/empty framework)
    const SAFE_TOP_PX = 96 // keep the framework node just under the floating header
    const animate = didInitialViewportRef.current
    const fitDuration = animate ? 200 : 0
    const biasDuration = animate ? 160 : 0

    const fit = () => {
      const h = wrap.getBoundingClientRect().height || 800
      const padding = Math.max(0.12, (HEADER_OVERLAY_PX + 12) / h)
      instance.fitView({ padding, duration: fitDuration, maxZoom: MAX_INITIAL_ZOOM })
    }

    // Two rAFs to let React Flow apply any pending node measurements/positions.
    const id = globalThis.requestAnimationFrame(() => fit())
    const id2 = globalThis.requestAnimationFrame(() => fit())

    const biasToTop = () => {
      const instance2 = reactFlowRef.current
      const wrap2 = reactFlowWrapRef.current
      if (!instance2 || !wrap2) return

      const nodes = instance2.getNodes()
      if (!nodes.length) return

      const getSize = (n: (typeof nodes)[number]) => {
        const anyNode = n as unknown as {
          measured?: { width?: number; height?: number }
          width?: number
          height?: number
          style?: { width?: number | string; height?: number | string }
        }

        const w =
          anyNode.measured?.width ??
          (typeof anyNode.width === 'number' ? anyNode.width : undefined) ??
          (typeof anyNode.style?.width === 'number' ? anyNode.style?.width : undefined) ??
          360
        const h =
          anyNode.measured?.height ??
          (typeof anyNode.height === 'number' ? anyNode.height : undefined) ??
          (typeof anyNode.style?.height === 'number' ? anyNode.style?.height : undefined) ??
          220
        return { w, h }
      }

      let minY = Number.POSITIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY
      for (const n of nodes) {
        const { h } = getSize(n)
        minY = Math.min(minY, n.position.y)
        maxY = Math.max(maxY, n.position.y + h)
      }

      const viewport = instance2.getViewport()
      const zoom = viewport.zoom

      const wrapRect = wrap2.getBoundingClientRect()
      const availableH = wrapRect.height - SAFE_TOP_PX - 24
      const contentH = (maxY - minY) * zoom

      // Only apply top bias when the graph is small enough to fit without hiding content.
      if (contentH > availableH) return

      const desiredY = SAFE_TOP_PX - minY * zoom
      instance2.setViewport({ x: viewport.x, y: desiredY, zoom }, { duration: biasDuration })
      didInitialViewportRef.current = true
    }

    // Bias after fit has applied; keep it rAF-based to avoid a visible "jump".
    const id3 = globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        biasToTop()
      })
    })

    return () => {
      globalThis.cancelAnimationFrame(id)
      globalThis.cancelAnimationFrame(id2)
      globalThis.cancelAnimationFrame(id3)
    }
  }, [])

  // First paint, and any explicit layout-mode switch (Hierarchy/Star "reset"),
  // center on the root node. A layout switch moves every node, so it should
  // re-orient the same way a fresh load does. Node-count-only changes (items
  // added/removed without a layout switch) instead fall back to fitting the
  // whole graph, leaving room for the floating header so the top-most node
  // isn't hidden behind it.
  useEffect(() => {
    if (!rfReady) return
    const layoutChanged = prevLayoutVersionRef.current === null || prevLayoutVersionRef.current !== layoutVersion
    prevLayoutVersionRef.current = layoutVersion
    const cleanup = layoutChanged ? centerOnRoot() : fitToContents()
    const onResize = () => {
      fitToContents()
    }
    globalThis.addEventListener('resize', onResize)
    return () => {
      cleanup?.()
      globalThis.removeEventListener('resize', onResize)
    }
  }, [rfReady, nodesWithCallbacks.length, layoutVersion, fitToContents, centerOnRoot])

  return (
    <div className="relative h-screen w-screen">
      <CanvasHeader
        frameworkTitle={frameworkInfo.title}
        frameworkSubtitle={frameworkInfo.subtitle}
        userName={userName ?? undefined}
        tenantId={tenantId ?? undefined}
        onChangePassword={authStatus === 'authenticated' && changePassword ? () => void changePassword() : undefined}
        reserveRightForPanel={sidePanelOpen}
        showSettings
        isDirty={isDirty}
        saveStatus={saveStatus}
        saveError={saveError}
        onSave={handleSave}
        onSignIn={undefined}
        onSignOut={
          authStatus !== 'authenticated'
            ? undefined
            : () => {
                void signOut()
              }
        }
        onBack={
          onBack
            ? () => {
                if (isDirty) setLeaveOpen(true)
                else onBack()
              }
            : undefined
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onResetHierarchy={() => { setActiveView('canvas'); applyHierarchyLayout() }}
        onResetStar={() => { setActiveView('canvas'); applyStarLayout() }}
        onSwitchTreeView={() => setActiveView(activeView === 'tree' ? 'canvas' : 'tree')}
        activeView={activeView}
        cfAssociationGroupings={inUseGroupings}
        activeGroupingFilter={activeGroupingFilter}
        onSetGroupingFilter={setActiveGroupingFilter}
      />

      {activeView === 'tree' ? (
        <div className="h-full w-full pt-16">
          <TreePanelView
            availableFrameworks={availableFrameworks}
            serverFrameworks={serverFrameworks}
            onLoadTargetFramework={onLoadTargetFramework}
            isSourcePublished={isPublishedToOpenCase}
            onSaveAlignments={onSaveAlignments}
            onLoadAlignmentsForTarget={onLoadAlignmentsForTarget}
            onDiscoverAlignedTargets={onDiscoverAlignedTargets}
          />
        </div>
      ) : null}

      <ReactFlowGraph
        wrapRef={reactFlowWrapRef}
        visible={activeView !== 'tree'}
        nodes={canvasNodes}
        edges={canvasEdges}
        remoteLinks={remoteLinks}
        onNodesChange={onNodesChangeWithSelectionGuard}
        onEdgesChange={onEdgesChangeWithSelectionGuard}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        onSelectionChange={onSelectionChangeWithPan}
        onBeforeDelete={onBeforeDelete}
        nodesDraggable={!shiftHeldForInteractions}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onInit={onReactFlowInit}
        onPointerDownCapture={onCanvasPointerDownCapture}
        onDragOver={onPaneDragOver}
        onDrop={onPaneDrop}
      />

      <NodePropertiesPanel
        node={showPropertiesPanel ? selectedNode : null}
        onClose={() => { clearSelection(); closeSidePanel() }}
        onChangeNode={updateNodeData}
        hideColorBand={activeView === 'tree'}
        onViewCFPackage={handleViewCFPackage}
        isPublishedToOpenCase={isPublishedToOpenCase}
        availableLicenses={availableLicenses}
        cfItemTypes={cfItemTypes}
        ensureCfItemType={ensureCfItemType}
        cfSubjects={cfSubjects}
        ensureCfSubject={ensureCfSubject}
        cfConcepts={cfConcepts}
        ensureCfConcept={ensureCfConcept}
        remoteLinks={remoteLinks}
        onRemoveRemoteLink={removeRemoteLink}
        onUpdateRemoteLinkType={updateRemoteLinkType}
        onRemoveRemoteFramework={removeRemoteFramework}
        onBrowseRemoteItems={openRemoteItemsPanel}
        onRefreshRemoteFramework={selectedNode?.type === 'externalFrameworkNode' && selectedNode.data.cgeFrameworkId ? handleRefreshActiveRemoteFramework : undefined}
        remoteFrameworkRefreshing={remoteFrameworkRefreshing}
      />

      <EdgePropertiesPanel
        edge={showPropertiesPanel ? selectedEdge : null}
        nodes={nodesWithCallbacks}
        onClose={() => { clearSelection(); closeSidePanel() }}
        onChangeEdge={updateEdgeData}
        onFlipEdge={flipEdge}
        cfAssociationGroupings={cfAssociationGroupings}
        ensureCfAssociationGrouping={ensureCfAssociationGrouping}
      />

      <MultiSelectionPanel
        selectedNodeIds={showPropertiesPanel ? selectedNodeIds : []}
        selectedEdgeIds={showPropertiesPanel ? selectedEdgeIds : []}
        nodes={nodesWithCallbacks}
        edges={editorEdges}
        onClose={() => { clearSelection(); closeSidePanel() }}
        onDeleteSelected={() => {
          const selectedNodes = nodesWithCallbacks.filter((n) => selectedNodeIds.includes(n.id))
          const selectedEdgesForDelete = editorEdges.filter((e) => selectedEdgeIds.includes(e.id))
          void onBeforeDelete({ nodes: selectedNodes, edges: selectedEdgesForDelete })
        }}
        onChangeEdge={updateEdgeData}
        onChangeNode={updateNodeData}
        cfAssociationGroupings={cfAssociationGroupings}
        ensureCfAssociationGrouping={ensureCfAssociationGrouping}
      />

      <AddItemDialog
        open={addItemDialog.open}
        parentLabel={(() => {
          const parent = nodesWithCallbacks.find((n) => n.id === addItemDialog.parentId)
          if (!parent) return undefined
          if (parent.type === 'caseFrameworkNode') return (parent.data as { cfDocument?: CFDocument })?.cfDocument?.title ?? 'Framework'
          return (
            (parent.data as { cfItem?: CFItem })?.cfItem?.humanCodingScheme ??
            (parent.data as { cfItem?: CFItem })?.cfItem?.abbreviatedStatement ??
            (parent.data as { cfItem?: CFItem })?.cfItem?.fullStatement ??
            'Item'
          )
        })()}
        draft={addItemDialog.draft}
        onChange={setAddItemDraft}
        onCancel={cancelAddItem}
        onCreate={confirmAddItem}
        cfItemTypes={cfItemTypes}
        cfSubjects={cfSubjects}
      />

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.isFrameworkArchive
            ? 'Archive this framework?'
            : 'Remove selected items?'
        }
        description={
          pendingAction?.isFrameworkArchive
            ? 'This will archive the framework on the server. It can be restored later by an administrator.'
            : 'This will remove the selected items from the canvas.'
        }
        confirmLabel={
          archiving
            ? 'Archiving'
            : pendingAction?.isFrameworkArchive
              ? 'Archive framework'
              : 'Remove'
        }
        showReattach={!pendingAction?.isFrameworkArchive && (pendingAction?.itemCount ?? 0) > 0}
        reattachChildren={pendingAction?.reattachChildren ?? true}
        reattachLabel={
          (pendingAction?.childItemCount ?? 0) > 0
            ? `Keep the framework connected by attaching ${pendingAction?.childItemCount} child item${(pendingAction?.childItemCount ?? 0) === 1 ? '' : 's'} to the removed item\u2019s parent`
            : 'Keep the framework connected by attaching child items to the removed item\u2019s parent'
        }
        onReattachChildrenChange={(value) =>
          setPendingAction((pd) => (pd ? { ...pd, reattachChildren: value } : pd))
        }
        onCancel={closeActionDialog}
        onConfirm={(options) => void confirmAction({ reattachChildren: options.reattachChildren })}
      />

      <ConfirmLeaveDialog
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        onLeave={() => {
          setLeaveOpen(false)
          onBack?.()
        }}
      />

      <ConfirmActionDialog
        open={forkWarningOpen}
        title="Fork this mirrored framework?"
        description="You are making changes to a mirrored framework. Saving will turn this mirror into an independent local copy with new identifiers."
        confirmLabel="Save & fork"
        onCancel={() => {
          setForkWarningOpen(false)
          pendingSaveRef.current = null
        }}
        onConfirm={() => {
          setForkWarningOpen(false)
          const pending = pendingSaveRef.current
          pendingSaveRef.current = null
          if (pending) void doSave(pending.openCasePackage, pending.framework)
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />

      {showBrowsePanel ? (
        <div className="fixed right-0 top-0 z-20 h-screen w-[min(460px,92vw)] border-l border-black/10 bg-white shadow-xl">
          {sidePanelMode === 'cgeSearch' && tenantId ? (
            <CgeFrameworkSearchPanel
              tenantId={tenantId}
              api={api}
              onClose={closeSidePanel}
              onAddToCanvas={handleAddCgeFrameworkToCanvas}
            />
          ) : null}
          {sidePanelMode === 'remoteItems' && tenantId ? (
            <RemoteFrameworkItemsPanel
              tenantId={tenantId}
              api={api}
              linkedFrameworkNodes={linkedFrameworkNodes as import('@/ui/editor/reactflow/types').ExternalFrameworkNodeType[]}
              activeNodeId={activeRemoteFrameworkNodeId ?? linkedFrameworkNodes[0]?.id ?? null}
              onSelectFramework={setActiveRemoteFrameworkNodeId}
              onClose={closeSidePanel}
              onRefreshFramework={
                (linkedFrameworkNodes.find((n) => n.id === (activeRemoteFrameworkNodeId ?? linkedFrameworkNodes[0]?.id))?.data.cgeFrameworkId)
                  ? handleRefreshActiveRemoteFramework
                  : undefined
              }
              onRemoveFramework={handleRemoveActiveRemoteFramework}
              frameworkRefreshing={remoteFrameworkRefreshing}
              onOpenFrameworkSettings={() => {
                const nodeId = activeRemoteFrameworkNodeId ?? linkedFrameworkNodes[0]?.id
                if (nodeId) {
                  setSelectedRemoteEdgeIds([])
                  openExternalFrameworkSettings(nodeId)
                }
              }}
            />
          ) : null}
        </div>
      ) : null}

      <AssociationTypePickerDialog
        open={Boolean(pendingRemoteDrop)}
        remoteLabel={pendingRemoteDrop?.payload?.label ?? ''}
        onCancel={() => setPendingRemoteDrop(null)}
        onConfirm={confirmRemoteLink}
      />

      <FloatingAddButton
        onAddItem={() => {
          const viewportCenter = getViewportCenter()
          addDetachedItem(viewportCenter)
        }}
        onAddExternalFramework={() => {
          openCgeSearchPanel()
        }}
        sidePanelOpen={sidePanelOpen}
      />

      <ViewCFPackageDialog
        open={cfPackageDialogOpen}
        onClose={() => {
          setCfPackageDialogOpen(false)
          setGeneratedCfPackage(null)
        }}
        cfPackage={generatedCfPackage}
        caseVersion={caseVersion}
        loading={viewCaseLoading}
      />

    </div>
  )
}

