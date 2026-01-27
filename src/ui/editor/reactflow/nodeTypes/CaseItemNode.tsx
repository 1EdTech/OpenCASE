import { Handle, Position, type NodeProps, NodeResizer, useReactFlow } from '@xyflow/react'
import { ArrowUpCircleIcon, ArrowDownCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import type { CaseItemNodeType } from '../types'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'

export default function CaseItemNode({ id, data, selected }: NodeProps<CaseItemNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()

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
        'group relative rounded-lg border bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md',
        selected ? 'border-violet-500 shadow-md ring-2 ring-violet-500/15' : 'border-slate-300',
      ].join(' ')}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={160}
        maxWidth={720}
        maxHeight={520}
        lineStyle={{ borderColor: 'rgba(15, 23, 42, 0.18)' }}
        handleStyle={{ width: 5, height: 5, borderRadius: 10, borderColor: 'rgba(109, 40, 217, 0.7)' }}
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
          aria-label="Delete item"
          title="Delete item"
        >
          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {code ? (
              <div className="rounded-md bg-slate-900/5 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800">
                {code}
              </div>
            ) : null}
            {itemType ? (
              <div className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                {itemType}
              </div>
            ) : null}
            {subject ? (
              <div className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {subject}
              </div>
            ) : null}
            {educationLevel.length ? (
              <div className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {educationLevel.join(' • ')}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="text-[12px] leading-snug text-slate-900">
        {statement ? (
          <div className="line-clamp-5">{statement}</div>
        ) : (
          <div className="text-slate-500">No statement yet</div>
        )}
      </div>

      {altLabel ? (
        <div className="mt-1 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">Label:</span> <span className="line-clamp-1">{altLabel}</span>
        </div>
      ) : null}

      {keywords.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {keywords.map((k) => (
            <div
              key={k}
              className="rounded-full border border-slate-200 bg-slate-900/2 px-2 py-0.5 text-[10px] font-medium text-slate-700"
              title={k}
            >
              {k}
            </div>
          ))}
        </div>
      ) : null}

      <Handle
        position={Position.Top}
        type="target"
        style={{
          background: 'none',
          border: 'none',
          width: '0.9em',
          height: '0.9em',
        }}
      >
        <ArrowUpCircleIcon
          style={{
            pointerEvents: 'none',
            fontSize: '1em',
            left: 0,
            position: 'absolute',
          }}
        />
      </Handle>

      <Handle
        position={Position.Bottom}
        type="source"
        style={{
          background: 'none',
          border: 'none',
          width: '1em',
          height: '1em',
        }}
      >
        <ArrowDownCircleIcon
          style={{
            pointerEvents: 'none',
            fontSize: '1em',
            left: 0,
            position: 'absolute',
          }}
        />
      </Handle>

      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        Select to edit
      </div>
    </div>
  )
}

