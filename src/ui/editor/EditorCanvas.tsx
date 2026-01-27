import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import { nodeTypes } from '@/ui/editor/reactflow/nodeTypes'
import CanvasHeader from '@/ui/editor/components/CanvasHeader'
import NodePropertiesPanel from '@/ui/editor/components/NodePropertiesPanel'
import AddItemDialog from '@/ui/editor/components/AddItemDialog'
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
  } = useEditor()

  const reactFlowWrapRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<CaseEditorNodeType> | null>(null)
  const [rfReady, setRfReady] = useState(false)

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
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => {
            reactFlowRef.current = instance as ReactFlowInstance<CaseEditorNodeType>
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
    </div>
  )
}

