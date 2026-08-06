import { Handle, Position, type NodeProps, useReactFlow, useConnection } from '@xyflow/react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import type { RegistryItemNodeType } from '../types'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'

export default function RegistryItemNode({ id, data, selected }: NodeProps<RegistryItemNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null

  const sourceNodeType = connection.fromNode?.type
  const isSourceRegistry = sourceNodeType === 'registryItemNode'

  // Registry nodes cannot be connection sources, and two registry nodes cannot be linked
  const isInvalidTarget = connectionInProgress && isSourceRegistry && connectionNodeId !== id

  const typedData = data as unknown as {
    ctdlUri?: string
    ctdlCtid?: string
    fullStatement?: string
    codedNotation?: string
    frameworkTitle?: string
  }

  const fullStatement = typedData?.fullStatement ?? ''
  const codedNotation = typedData?.codedNotation
  const frameworkTitle = typedData?.frameworkTitle

  return (
    <div className="group relative h-full w-full">
      {/* Remove button */}
      <div
        className={[
          'nodrag nopan absolute left-full top-2 ml-2 flex flex-col gap-2 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        ].join(' ')}
      >
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
          onClick={(e) => {
            e.stopPropagation()
            const node = rf.getNode(id)
            if (!node) return
            rf.deleteElements({ nodes: [node], edges: [] })
          }}
          aria-label="Remove registry reference"
          title="Remove registry reference"
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>

      {/* Card */}
      <div
        className={[
          'relative flex h-full w-full flex-col justify-center rounded-lg border bg-gradient-to-br from-teal-50 to-cyan-50 px-3 py-2 shadow-sm transition-all',
          selected ? 'border-teal-500 shadow-md ring-2 ring-teal-400/20' : 'border-teal-200',
          isInvalidTarget ? 'opacity-40 grayscale ring-2 ring-red-300' : '',
        ].join(' ')}
      >
        {/* Registry badge */}
        <div className="absolute right-2 top-1.5">
          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
            Registry
          </span>
        </div>

        {/* Content */}
        <div className="pr-14">
          {codedNotation && (
            <div className="mb-0.5 text-[10px] font-semibold text-teal-600">{codedNotation}</div>
          )}
          <div className="line-clamp-2 text-xs font-medium leading-tight text-slate-800">
            {fullStatement}
          </div>
          {frameworkTitle && (
            <div className="mt-1 truncate text-[10px] text-slate-500">{frameworkTitle}</div>
          )}
        </div>

        {/* Handles — target only (alignment edges point TO registry nodes) */}
        <Handle
          id="top"
          position={Position.Top}
          type="target"
          isConnectableStart={false}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2 !w-2 !rounded-full !border-2 transition-colors ${
            isInvalidTarget ? '!border-red-300 !bg-red-100' : '!border-teal-400 !bg-teal-200 hover:!border-teal-600 hover:!bg-teal-300'
          }`}
        />
        <Handle
          id="bottom"
          position={Position.Bottom}
          type="target"
          isConnectableStart={false}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2 !w-2 !rounded-full !border-2 transition-colors ${
            isInvalidTarget ? '!border-red-300 !bg-red-100' : '!border-teal-400 !bg-teal-200 hover:!border-teal-600 hover:!bg-teal-300'
          }`}
        />
        <Handle
          id="left"
          position={Position.Left}
          type="target"
          isConnectableStart={false}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2 !w-2 !rounded-full !border-2 transition-colors ${
            isInvalidTarget ? '!border-red-300 !bg-red-100' : '!border-teal-400 !bg-teal-200 hover:!border-teal-600 hover:!bg-teal-300'
          }`}
        />
        <Handle
          id="right"
          position={Position.Right}
          type="target"
          isConnectableStart={false}
          isConnectableEnd={!isInvalidTarget}
          className={`!h-2 !w-2 !rounded-full !border-2 transition-colors ${
            isInvalidTarget ? '!border-red-300 !bg-red-100' : '!border-teal-400 !bg-teal-200 hover:!border-teal-600 hover:!bg-teal-300'
          }`}
        />
      </div>
    </div>
  )
}
