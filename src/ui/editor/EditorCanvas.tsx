import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import type { OnBeforeDelete } from '@xyflow/react'
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import { nodeTypes } from '@/ui/editor/reactflow/nodeTypes'
import CanvasHeader from '@/ui/editor/components/CanvasHeader'
import NodePropertiesPanel from '@/ui/editor/components/NodePropertiesPanel'
import AddItemDialog from '@/ui/editor/components/AddItemDialog'
import ConfirmDeleteDialog from '@/ui/editor/components/ConfirmDeleteDialog'
import { useEditor } from '@/ui/editor/state/EditorContext'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'
import type { CFDocument, CFItem } from '@/domain/case/types'

export default function EditorCanvas() {
  const {
    nodesWithCallbacks,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    selectedNode,
    frameworkInfo,
    clearSelection,
    updateNodeData,
    layoutVersion,
    addItemDialog,
    setAddItemDraft,
    cancelAddItem,
    confirmAddItem,
    deleteElements,
  } = useEditor()

  const reactFlowWrapRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<CaseEditorNodeType> | null>(null)
  const [rfReady, setRfReady] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<null | {
    nodeIds: string[]
    edgeIds: string[]
    nodeCount: number
    itemCount: number
    childItemCount: number
    reattachChildren: boolean
    resolve: (allowDelete: boolean) => void
  }>(null)

  const onBeforeDelete: OnBeforeDelete<CaseEditorNodeType> = useCallback(
    async ({ nodes, edges }) => {
      const nodeIds = nodes.map((n) => n.id)
      const edgeIds = edges.map((e) => e.id)

      const nodeIdSet = new Set(nodeIds)
      const deletedItemIdSet = new Set(nodes.filter((n) => n.type === 'caseItemNode').map((n) => n.id))

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
          reattachChildren: true,
          resolve,
        })
      })
    },
    [nodesWithCallbacks],
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
      deleteElements({
        nodeIds: pendingDelete.nodeIds,
        edgeIds: pendingDelete.edgeIds,
        reattachChildren: options.reattachChildren,
      })
      pendingDelete.resolve(false) // we perform the deletion ourselves
      setPendingDelete(null)
    },
    [pendingDelete, deleteElements],
  )

  const fitToContents = useCallback(() => {
    const instance = reactFlowRef.current
    const wrap = reactFlowWrapRef.current
    if (!instance || !wrap) return

    const HEADER_OVERLAY_PX = 72 // header height + breathing room

    const fit = () => {
      const h = wrap.getBoundingClientRect().height || 800
      const padding = Math.max(0.12, (HEADER_OVERLAY_PX + 12) / h)
      instance.fitView({ padding, duration: 200 })
    }

    // Two rAFs to let React Flow apply any pending node measurements/positions.
    const id = globalThis.requestAnimationFrame(() => fit())
    const id2 = globalThis.requestAnimationFrame(() => fit())
    return () => {
      globalThis.cancelAnimationFrame(id)
      globalThis.cancelAnimationFrame(id2)
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
        userName="Taylor Couper"
        reserveRightForPanel={Boolean(selectedNode)}
      />

      <div ref={reactFlowWrapRef} className="h-full w-full">
        <ReactFlow<CaseEditorNodeType>
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onBeforeDelete={onBeforeDelete}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => {
            reactFlowRef.current = instance as unknown as ReactFlowInstance<CaseEditorNodeType>
            setRfReady(true)
            // Run a fit immediately on init so we don't start off-screen.
            fitToContents()
          }}
        >
          <Background color="#ccc" variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} />
        </ReactFlow>
      </div>

      <NodePropertiesPanel node={selectedNode} onClose={clearSelection} onChangeNode={updateNodeData} />

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
        onReattachChildrenChange={(value) =>
          setPendingDelete((pd) => (pd ? { ...pd, reattachChildren: value } : pd))
        }
        onCancel={closeDeleteDialog}
        onConfirm={(options) => confirmDelete({ reattachChildren: options.reattachChildren })}
      />
    </div>
  )
}

