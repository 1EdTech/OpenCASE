import { Handle, Position, type NodeProps, NodeResizer, useReactFlow, useConnection } from '@xyflow/react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import type { CaseFrameworkNodeType } from '../types'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'

export default function CaseFrameworkNode({ id, data, selected }: NodeProps<CaseFrameworkNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()
  
  // Get connection state to show visual feedback during drag (React Flow v12+)
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null
  
  // Check if the node being dragged from is a framework
  const sourceNodeType = connection.fromNode?.type
  const isSourceFramework = sourceNodeType === 'caseFrameworkNode' || sourceNodeType === 'externalFrameworkNode'
  
  // This framework is an invalid target if dragging from another framework
  const isInvalidTarget = connectionInProgress && isSourceFramework && connectionNodeId !== id

  // Defensive typing: see CaseItemNode.tsx note.
  const typedData = data as unknown as {
    cfDocument?: {
      title?: string
      creator?: string
      description?: string
      frameworkType?: string
      adoptionStatus?: string
    }
    onAddChild?: (_frameworkNodeId: string) => void
  }

  const title = typedData?.cfDocument?.title ?? 'Untitled framework'
  const creator = typedData?.cfDocument?.creator
  const frameworkType = typedData?.cfDocument?.frameworkType
  const adoptionStatus = typedData?.cfDocument?.adoptionStatus

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={320}
        minHeight={170}
        maxWidth={820}
        maxHeight={560}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: 'rgb(139, 92, 246)',
          borderColor: 'white',
          borderWidth: 2,
        }}
      />

      <div
        className={[
          'nodrag nopan absolute left-full top-2 ml-2 flex flex-col gap-2 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        ].join(' ')}
      >
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            typedData?.onAddChild?.(id)
          }}
          aria-label="Add top-level item"
          title="Add top-level item"
        >
          <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Add item
        </button>

        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            const node = rf.getNode(id)
            if (!node) return
            rf.deleteElements({ nodes: [node], edges: [] })
          }}
          aria-label="Delete framework"
          title="Delete framework"
        >
          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>

      <FrameworkCard
        cfDocument={{
          title,
          creator,
          frameworkType,
          adoptionStatus,
          description: typedData?.cfDocument?.description,
        }}
        selected={selected}
        rightHint="Select to edit"
        className={isInvalidTarget ? 'pointer-events-none opacity-40 grayscale ring-2 ring-red-300' : ''}
      >
        {/* Invalid target indicator */}
        {isInvalidTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-red-50/50">
            <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
              Cannot link frameworks
            </div>
          </div>
        )}
        
        {/* Bidirectional handles on all four sides - graph style connections */}
        <Handle
          id="top"
          position={Position.Top}
          type="source"
          isConnectableStart={true}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2.5 !w-2.5 !rounded-full !border-2 transition-colors ${
            isInvalidTarget 
              ? '!border-red-300 !bg-red-100' 
              : '!border-violet-400 !bg-violet-100 hover:!border-violet-600 hover:!bg-violet-200'
          }`}
        />
        <Handle
          id="bottom"
          position={Position.Bottom}
          type="source"
          isConnectableStart={true}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2.5 !w-2.5 !rounded-full !border-2 transition-colors ${
            isInvalidTarget 
              ? '!border-red-300 !bg-red-100' 
              : '!border-violet-400 !bg-violet-100 hover:!border-violet-600 hover:!bg-violet-200'
          }`}
        />
        <Handle
          id="left"
          position={Position.Left}
          type="source"
          isConnectableStart={true}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2.5 !w-2.5 !rounded-full !border-2 transition-colors ${
            isInvalidTarget 
              ? '!border-red-300 !bg-red-100' 
              : '!border-violet-400 !bg-violet-100 hover:!border-violet-600 hover:!bg-violet-200'
          }`}
        />
        <Handle
          id="right"
          position={Position.Right}
          type="source"
          isConnectableStart={true}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2.5 !w-2.5 !rounded-full !border-2 transition-colors ${
            isInvalidTarget 
              ? '!border-red-300 !bg-red-100' 
              : '!border-violet-400 !bg-violet-100 hover:!border-violet-600 hover:!bg-violet-200'
          }`}
        />
      </FrameworkCard>
    </div>
  )
}

