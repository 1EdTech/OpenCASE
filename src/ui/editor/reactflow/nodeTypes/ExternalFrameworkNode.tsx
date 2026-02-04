import { Handle, Position, type NodeProps, NodeResizer, useConnection } from '@xyflow/react'
import { TrashIcon, LinkIcon } from '@heroicons/react/24/solid'
import type { ExternalFrameworkNodeType } from '../types'

export default function ExternalFrameworkNode({ id, data, selected }: NodeProps<ExternalFrameworkNodeType>) {
  // Get connection state to show visual feedback during drag (React Flow v12+)
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null
  
  // Check if the node being dragged from is a framework
  const sourceNodeType = connection.fromNode?.type
  const isSourceFramework = sourceNodeType === 'caseFrameworkNode' || sourceNodeType === 'externalFrameworkNode'
  
  // This framework is an invalid target if dragging from another framework
  const isInvalidTarget = connectionInProgress && isSourceFramework && connectionNodeId !== id

  const typedData = data as unknown as {
    title?: string
    uri?: string
    description?: string
    source?: string
  }

  const title = typedData?.title ?? 'External Framework'
  const uri = typedData?.uri
  const description = typedData?.description
  const source = typedData?.source

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={120}
        maxWidth={600}
        maxHeight={400}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: 'rgb(100, 116, 139)',
          borderColor: 'white',
          borderWidth: 2,
        }}
      />

      {/* Action buttons */}
      <div
        className={[
          'nodrag nopan absolute left-full top-2 ml-2 flex flex-col gap-2 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        ].join(' ')}
      >
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            const node = rf.getNode(id)
            if (!node) return
            rf.deleteElements({ nodes: [node], edges: [] })
          }}
          aria-label="Delete external framework"
          title="Delete external framework"
        >
          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>

      {/* Card content - grey themed to indicate external */}
      <div
        className={[
          'relative flex h-full w-full flex-col rounded-xl border-2 border-dashed bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-sm transition-all',
          selected ? 'border-slate-500 shadow-md ring-2 ring-slate-400/20' : 'border-slate-300',
          isInvalidTarget ? 'opacity-40 grayscale ring-2 ring-red-300' : '',
        ].join(' ')}
      >
        {/* Invalid target indicator */}
        {isInvalidTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-red-50/50">
            <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
              Cannot link frameworks
            </div>
          </div>
        )}
        
        {/* Header with icon */}
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-600">
            <LinkIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-700">{title}</div>
            {source ? (
              <div className="truncate text-xs text-slate-500">{source}</div>
            ) : null}
          </div>
        </div>

        {/* Description */}
        {description ? (
          <p className="mb-2 line-clamp-2 text-xs text-slate-600">{description}</p>
        ) : null}

        {/* URI */}
        {uri ? (
          <div className="mt-auto truncate rounded bg-slate-200/50 px-2 py-1 font-mono text-xs text-slate-500">
            {uri}
          </div>
        ) : null}

        {/* Badge indicating external */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            External
          </span>
        </div>

        {/* Hint when not selected */}
        {!selected && !isInvalidTarget && (
          <div className="absolute bottom-2 right-3 text-xs text-slate-400">
            Select to edit
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
              : '!border-slate-400 !bg-slate-200 hover:!border-slate-600 hover:!bg-slate-300'
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
              : '!border-slate-400 !bg-slate-200 hover:!border-slate-600 hover:!bg-slate-300'
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
              : '!border-slate-400 !bg-slate-200 hover:!border-slate-600 hover:!bg-slate-300'
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
              : '!border-slate-400 !bg-slate-200 hover:!border-slate-600 hover:!bg-slate-300'
          }`}
        />
      </div>
    </div>
  )
}
