import { Handle, Position, type NodeProps, NodeResizer, useReactFlow, useConnection } from '@xyflow/react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import type { CaseItemNodeType } from '../types'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'

export default function CaseItemNode({ id, data, selected }: NodeProps<CaseItemNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()
  
  // Get connection state to show visual feedback during drag (React Flow v12+)
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null
  
  // Check if the node being dragged from is a framework
  const sourceNodeType = connection.fromNode?.type
  const isSourceFramework = sourceNodeType === 'caseFrameworkNode' || sourceNodeType === 'externalFrameworkNode'
  
  // This item is a valid target when dragging from a framework (show positive feedback)
  const isValidTarget = connectionInProgress && isSourceFramework && connectionNodeId !== id

  // Defensive typing: React Flow's NodeProps typing can lag behind our node-data evolution.
  // Runtime `data` is shaped by `App.tsx` and always includes `cfItem` for CASE item nodes.
  const typedData = data as unknown as {
    cfItem?: {
      fullStatement?: string
      abbreviatedStatement?: string
      alternativeLabel?: string
      humanCodingScheme?: string
      CFItemType?: string
      subject?: string[]
      educationLevel?: string[]
      conceptKeywords?: string[]
    }
    onAddChild?: (_parentId: string) => void
  }

  const statement = typedData?.cfItem?.abbreviatedStatement ?? typedData?.cfItem?.fullStatement ?? ''
  const altLabel = typedData?.cfItem?.alternativeLabel
  const code = typedData?.cfItem?.humanCodingScheme
  const itemType = typedData?.cfItem?.CFItemType
  const subject = typedData?.cfItem?.subject?.[0]
  const educationLevel = typedData?.cfItem?.educationLevel?.slice(0, 2) ?? []
  const keywords = typedData?.cfItem?.conceptKeywords?.slice(0, 3) ?? []

  return (
    <div
      className={[
        'group relative h-full w-full rounded-lg border bg-white shadow-sm transition-all hover:shadow-md',
        selected ? 'border-[#662F90] shadow-md ring-2 ring-[#662F90]/15' : 'border-gray-200',
        isValidTarget ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-100' : '',
      ].join(' ')}
    >
      {/* Subtle gradient accent at top */}
      <div className="h-[3px] w-full rounded-t-lg bg-linear-to-r from-[#000072]/50 to-[#662F90]/50" />

      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={160}
        maxWidth={720}
        maxHeight={520}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: '#662F90',
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
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#662F90]/30 bg-white px-3 py-1 text-xs font-semibold text-[#662F90] shadow-sm hover:bg-[#662F90]/5 focus-visible:outline-2 focus-visible:outline-[#662F90]/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            typedData?.onAddChild?.(id)
          }}
          aria-label="Add child item"
          title="Add child item"
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
          aria-label="Remove item"
          title="Remove item"
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {code ? (
                <div className="rounded-md bg-[#000072]/8 px-1.5 py-0.5 text-[11px] font-semibold text-[#000072]">
                  {code}
                </div>
              ) : null}
              {itemType ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-[#2E2F2F]">
                  {itemType}
                </div>
              ) : null}
              {subject ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  {subject}
                </div>
              ) : null}
              {educationLevel.length ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  {educationLevel.join(' • ')}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-[12px] leading-snug text-[#2E2F2F]">
          {statement ? (
            <div className="line-clamp-5">{statement}</div>
          ) : (
            <div className="text-gray-400">No statement yet</div>
          )}
        </div>

        {altLabel ? (
          <div className="mt-1 text-[11px] text-gray-600">
            <span className="font-semibold text-[#2E2F2F]">Label:</span> <span className="line-clamp-1">{altLabel}</span>
          </div>
        ) : null}

        {keywords.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {keywords.map((k) => (
              <div
                key={k}
                className="rounded-full border border-[#662F90]/15 bg-[#662F90]/5 px-2 py-0.5 text-[10px] font-medium text-[#662F90]"
                title={k}
              >
                {k}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Bidirectional handles on all four sides - graph style connections */}
      <Handle
        id="top"
        position={Position.Top}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="bottom"
        position={Position.Bottom}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="left"
        position={Position.Left}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="right"
        position={Position.Right}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />

      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        Select to edit
      </div>
    </div>
  )
}

