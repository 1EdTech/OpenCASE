import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactFlowInstance, Connection, Edge } from '@xyflow/react'
import type { OnBeforeDelete } from '@xyflow/react'
import type { OnSelectionChangeFunc } from '@xyflow/react'
import { Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import { nodeTypes } from '@/ui/editor/reactflow/nodeTypes'
import { edgeTypes } from '@/ui/editor/reactflow/edgeTypes'
import CanvasHeader from '@/ui/editor/components/CanvasHeader'
import NodePropertiesPanel from '@/ui/editor/components/NodePropertiesPanel'
import EdgePropertiesPanel from '@/ui/editor/components/EdgePropertiesPanel'
import AddItemDialog from '@/ui/editor/components/AddItemDialog'
import ConfirmDeleteDialog from '@/ui/editor/components/ConfirmDeleteDialog'
import ConfirmLeaveDialog from '@/ui/editor/components/ConfirmLeaveDialog'
import SettingsModal from '@/ui/editor/components/SettingsModal'
import FloatingAddButton from '@/ui/editor/components/FloatingAddButton'
import AddExternalFrameworkDialog from '@/ui/editor/components/AddExternalFrameworkDialog'
import ViewCFPackageDialog from '@/ui/editor/components/ViewCFPackageDialog'
import { useEditor } from '@/ui/editor/state/EditorContext'
import type { CaseEditorNodeType, CaseEditorEdge } from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem, CFLicense, CFPackage } from '@/domain/case/types'
import { useAuth } from '@/app/providers/AuthProvider'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import { frameworkToCfPackage, toOpenCaseFormat } from '@/application/framework/mappers/case/toCasePackage'
import { getAppConfig } from '@/app/config'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'

type EditorCanvasProps = {
  onBack?: () => void
  onSaveToServer?: (cfPackage: ReturnType<typeof toOpenCaseFormat>) => Promise<void>
  /** Whether the current framework has been published to OpenCASE (loaded from or saved to server) */
  isPublishedToOpenCase?: boolean
}

export default function EditorCanvas({ onBack, onSaveToServer, isPublishedToOpenCase }: Readonly<EditorCanvasProps>) {
  const { status: authStatus, userName, tenantId, signOut, getAccessToken } = useAuth()
  const {
    nodes,
    nodesWithCallbacks,
    edges: editorEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    selectedNode,
    selectedEdge,
    frameworkInfo,
    clearSelection,
    updateNodeData,
    updateEdgeData,
    flipEdge,
    reconnectEdge: reconnectEdgeAction,
    layoutVersion,
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
    applyHierarchyLayout,
    applyStarLayout,
  } = useEditor()

  const reactFlowWrapRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<CaseEditorNodeType> | null>(null)
  const [rfReady, setRfReady] = useState(false)
  const didInitialViewportRef = useRef(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [externalFwDialogOpen, setExternalFwDialogOpen] = useState(false)
  const [externalFwViewportCenter, setExternalFwViewportCenter] = useState<{ x: number; y: number } | undefined>(undefined)
  const [cfPackageDialogOpen, setCfPackageDialogOpen] = useState(false)
  const [generatedCfPackage, setGeneratedCfPackage] = useState<CFPackage | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Available licenses fetched from OpenCASE
  const [availableLicenses, setAvailableLicenses] = useState<CFLicense[]>([])

  // Fetch available licenses when authenticated
  useEffect(() => {
    if (!tenantId) return
    const cfg = getAppConfig()
    const api = new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken }))
    api.listLicenses({ tenantId }).then(setAvailableLicenses).catch(() => {
      // best-effort; ignore failures
    })
  }, [tenantId, getAccessToken])
  
  // Track the edge being reconnected
  const edgeReconnectSuccessful = useRef(true)

  // Generate CFPackage from current editor state and open the viewer
  const handleViewCFPackage = useCallback(() => {
    // Convert editor graph to domain Framework + layout
    const { framework, layout } = fromEditorGraph({ graph: { nodes, edges: editorEdges } })
    
    // Convert domain Framework to CFPackage with layout in extensions (no version increment for view)
    const cfPackage = frameworkToCfPackage({
      framework,
      caseVersion,
      layout,
      incrementVersion: false,
      edgeType: settings.edgeType,
    })
    
    setGeneratedCfPackage(cfPackage)
    setCfPackageDialogOpen(true)
  }, [nodes, editorEdges, caseVersion, settings.edgeType])

  // Save: Generate CFPackage with version increment and POST to server
  const handleSave = useCallback(async () => {
    // Convert editor graph to domain Framework + layout
    const { framework, layout } = fromEditorGraph({ graph: { nodes, edges: editorEdges } })
    
    // Convert domain Framework to CFPackage with layout in extensions
    // Increment version on save
    const cfPackage = frameworkToCfPackage({
      framework,
      caseVersion,
      layout,
      incrementVersion: true,
      edgeType: settings.edgeType,
    })
    
    // Convert to OpenCASE REST API format
    const openCasePackage = toOpenCaseFormat(cfPackage)
    
    // Log to console for debugging
    console.log('[Save] Generated OpenCASE package:', openCasePackage)
    
    // Store for viewing
    setGeneratedCfPackage(cfPackage)
    
    // If server save callback is provided, save to server
    if (onSaveToServer) {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await onSaveToServer(openCasePackage)
        setSaveStatus('success')
        clearDirty()
        // Reset status after a brief delay
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('[Save] Failed to save to server:', err)
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
        // Show the generated CFPackage for manual copy/paste as fallback
        setCfPackageDialogOpen(true)
      }
    } else {
      // No server callback - just show the dialog for manual validation
      setCfPackageDialogOpen(true)
    }
  }, [nodes, editorEdges, caseVersion, onSaveToServer, clearDirty, settings.edgeType])

  // Apply the custom labeled edge type to all edges, passing the path style in data.
  // Per-edge edgeType (e.g. from hierarchy layout) takes priority over the framework-level setting.
  const edgesWithType = useMemo<CaseEditorEdge[]>(
    () => editorEdges.map((edge) => ({ 
      ...edge, 
      type: 'labeled',
      data: { ...edge.data, edgeType: edge.data?.edgeType ?? settings.edgeType }
    })),
    [editorEdges, settings.edgeType],
  )
  
  // Validate connections - prevent framework-to-framework connections
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodesWithCallbacks.find((n) => n.id === connection.source)
    const targetNode = nodesWithCallbacks.find((n) => n.id === connection.target)
    
    const isSourceFramework = 
      sourceNode?.type === 'caseFrameworkNode' || 
      sourceNode?.type === 'externalFrameworkNode'
    const isTargetFramework = 
      targetNode?.type === 'caseFrameworkNode' || 
      targetNode?.type === 'externalFrameworkNode'
    
    // Reject framework-to-framework connections
    if (isSourceFramework && isTargetFramework) {
      return false
    }
    
    return true
  }, [nodesWithCallbacks])
  
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
  
  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    // If reconnection wasn't successful (dropped in empty space), optionally remove the edge
    // For now, we'll keep the edge if reconnection fails (user just cancels)
    if (!edgeReconnectSuccessful.current) {
      // Edge stays as-is if dropped in empty space
    }
    edgeReconnectSuccessful.current = true
  }, [])

  const [pendingDelete, setPendingDelete] = useState<null | {
    nodeIds: string[]
    edgeIds: string[]
    nodeCount: number
    itemCount: number
    childItemCount: number
    reattachChildren: boolean
    isFrameworkDelete: boolean
    resolve: (allowDelete: boolean) => void
  }>(null)
  
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
  
  // Keyboard shortcuts for adding items and external frameworks
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
      
      // Cmd/Ctrl + F: Add external framework
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        const viewportCenter = getViewportCenter()
        setExternalFwViewportCenter(viewportCenter)
        setExternalFwDialogOpen(true)
        return
      }
    }
    
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [addDetachedItem, getViewportCenter])

  const onBeforeDelete: OnBeforeDelete<CaseEditorNodeType> = useCallback(
    async ({ nodes, edges: deletedEdges }) => {
      const includesFramework = nodes.some((n) => n.type === 'caseFrameworkNode')

      const nodeIds = includesFramework ? nodesWithCallbacks.map((n) => n.id) : nodes.map((n) => n.id)
      const edgeIds = includesFramework ? editorEdges.map((e) => e.id) : deletedEdges.map((e) => e.id)

      const nodeIdSet = new Set(nodeIds)
      const deletedItemIdSet = new Set(
        (includesFramework ? nodesWithCallbacks : nodes).filter((n) => n.type === 'caseItemNode').map((n) => n.id),
      )

      const childItemCount = nodesWithCallbacks.filter(
        (n) =>
          n.type === 'caseItemNode' &&
          !nodeIdSet.has(n.id) &&
          Boolean((n.data as { parentId?: string }).parentId) &&
          deletedItemIdSet.has((n.data as { parentId?: string }).parentId!),
      ).length

      const itemCount = deletedItemIdSet.size
      const nodeCount = nodeIds.length

      return new Promise<boolean>((resolve) => {
        setPendingDelete({
          nodeIds,
          edgeIds,
          nodeCount,
          itemCount,
          childItemCount,
          reattachChildren: !includesFramework,
          isFrameworkDelete: includesFramework,
          resolve,
        })
      })
    },
    [nodesWithCallbacks, editorEdges],
  )

  const closeDeleteDialog = useCallback(() => {
    setPendingDelete((pd) => {
      pd?.resolve(false)
      return null
    })
  }, [])

  const confirmDelete = useCallback(
    (options: { reattachChildren: boolean }) => {
      if (!pendingDelete) return
      const isFrameworkDelete = pendingDelete.isFrameworkDelete
      deleteElements({
        nodeIds: pendingDelete.nodeIds,
        edgeIds: pendingDelete.edgeIds,
        reattachChildren: isFrameworkDelete ? false : options.reattachChildren,
      })
      pendingDelete.resolve(false) // we perform the deletion ourselves
      setPendingDelete(null)
      if (isFrameworkDelete) onBack?.()
    },
    [pendingDelete, deleteElements, onBack],
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
      const panelWidth = (selectedNode || selectedEdge) ? Math.min(460, globalThis.innerWidth * 0.92) : 0

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
    [selectedNode],
  )

  const onSelectionChangeWithPan: OnSelectionChangeFunc<CaseEditorNodeType> = useCallback(
    (params) => {
      onSelectionChange(params)
      const selected = params.nodes?.[0]
      if (!selected) return

      // Two rAFs: selection state and node measurements may settle after the event.
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          ensureNodeVisible(selected)
        })
      })
    },
    [onSelectionChange, ensureNodeVisible],
  )

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

  // Make the initial viewport leave room for the floating header so the top-most node isn't hidden behind it.
  useEffect(() => {
    if (!rfReady) return
    const cleanup = fitToContents()
    const onResize = () => {
      fitToContents()
    }
    globalThis.addEventListener('resize', onResize)
    return () => {
      cleanup?.()
      globalThis.removeEventListener('resize', onResize)
    }
  }, [rfReady, nodesWithCallbacks.length, layoutVersion, fitToContents])

  return (
    <div className="relative h-screen w-screen">
      <CanvasHeader
        frameworkTitle={frameworkInfo.title}
        frameworkSubtitle={frameworkInfo.subtitle}
        userName={userName ?? undefined}
        tenantId={tenantId ?? undefined}
        reserveRightForPanel={Boolean(selectedNode || selectedEdge)}
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
        onResetHierarchy={applyHierarchyLayout}
        onResetStar={applyStarLayout}
      />

      <div ref={reactFlowWrapRef} className="h-full w-full">
        <ReactFlow<CaseEditorNodeType>
          nodes={nodesWithCallbacks}
          edges={edgesWithType}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onSelectionChange={onSelectionChangeWithPan}
          onBeforeDelete={onBeforeDelete}
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
          defaultEdgeOptions={{
            interactionWidth: 20,
            style: { strokeWidth: 1.5, stroke: '#94a3b8' },
            focusable: true,
            reconnectable: true,
          }}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => {
            reactFlowRef.current = instance as unknown as ReactFlowInstance<CaseEditorNodeType>
            setRfReady(true)
          }}
        >
          <Background color="#c8c8ca" gap={20} size={1.5} variant={BackgroundVariant.Dots} style={{ backgroundColor: '#f0f0f2' }} />
          <Controls />
          <MiniMap
            position="bottom-left"
            className="!bottom-1 !left-12"
            nodeStrokeWidth={2}
            nodeColor={(node) => (node.selected ? '#8b5cf6' : '#e2e8f0')} // violet-500 if selected, slate-200 otherwise
            nodeStrokeColor={(node) => (node.selected ? '#7c3aed' : '#cbd5e1')} // violet-600 if selected, slate-300 otherwise
            maskColor="rgba(240, 240, 245, 0.7)"
          />
        </ReactFlow>
      </div>

      <NodePropertiesPanel
        node={selectedNode}
        onClose={clearSelection}
        onChangeNode={updateNodeData}
        onViewCFPackage={handleViewCFPackage}
        isPublishedToOpenCase={isPublishedToOpenCase}
        availableLicenses={availableLicenses}
      />

      <EdgePropertiesPanel
        edge={selectedEdge}
        nodes={nodesWithCallbacks}
        onClose={clearSelection}
        onChangeEdge={updateEdgeData}
        onFlipEdge={flipEdge}
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
      />

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        nodeCount={pendingDelete?.nodeCount ?? 0}
        itemCount={pendingDelete?.itemCount ?? 0}
        childItemCount={pendingDelete?.childItemCount ?? 0}
        reattachChildren={pendingDelete?.reattachChildren ?? true}
        isFrameworkDelete={pendingDelete?.isFrameworkDelete ?? false}
        onReattachChildrenChange={(value) =>
          setPendingDelete((pd) => (pd ? { ...pd, reattachChildren: value } : pd))
        }
        onCancel={closeDeleteDialog}
        onConfirm={(options) => confirmDelete({ reattachChildren: options.reattachChildren })}
      />

      <ConfirmLeaveDialog
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        onLeave={() => {
          setLeaveOpen(false)
          onBack?.()
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />

      <FloatingAddButton
        onAddItem={() => {
          const viewportCenter = getViewportCenter()
          addDetachedItem(viewportCenter)
        }}
        onAddExternalFramework={() => {
          const viewportCenter = getViewportCenter()
          setExternalFwViewportCenter(viewportCenter)
          setExternalFwDialogOpen(true)
        }}
        sidePanelOpen={Boolean(selectedNode || selectedEdge)}
      />

      <AddExternalFrameworkDialog
        open={externalFwDialogOpen}
        onCancel={() => {
          setExternalFwDialogOpen(false)
          setExternalFwViewportCenter(undefined)
        }}
        onCreate={(draft) => {
          setExternalFwDialogOpen(false)
          addExternalFramework(draft, externalFwViewportCenter)
          setExternalFwViewportCenter(undefined)
        }}
      />

      <ViewCFPackageDialog
        open={cfPackageDialogOpen}
        onClose={() => {
          setCfPackageDialogOpen(false)
          setGeneratedCfPackage(null)
        }}
        cfPackage={generatedCfPackage}
        caseVersion={caseVersion}
      />
    </div>
  )
}

