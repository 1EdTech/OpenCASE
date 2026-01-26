import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import { PlusIcon } from '@heroicons/react/24/solid'
import type { CaseFrameworkNodeType } from '../types'

export default function CaseFrameworkNode({ id, data, selected }: NodeProps<CaseFrameworkNodeType>) {
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
    <div
      className={[
        'group relative rounded-2xl border bg-gradient-to-b from-violet-50 to-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md',
        selected ? 'border-violet-500 shadow-md ring-2 ring-violet-500/15' : 'border-violet-200',
      ].join(' ')}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={320}
        minHeight={170}
        maxWidth={820}
        maxHeight={560}
        lineStyle={{ borderColor: 'rgba(15, 23, 42, 0.18)' }}
        handleStyle={{ width: 5, height: 5, borderRadius: 10, borderColor: 'rgba(109, 40, 217, 0.7)' }}
      />

      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              Framework
            </div>
            {frameworkType ? (
              <div className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {frameworkType}
              </div>
            ) : null}
            {adoptionStatus ? (
              <div className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {adoptionStatus}
              </div>
            ) : null}
          </div>
          <div className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">{title}</div>
          {creator ? <div className="mt-1 text-xs text-slate-600">Created by {creator}</div> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-[10px] font-medium text-slate-600">Select to edit</div>
          <button
            type="button"
            className="nodrag nopan inline-flex items-center gap-1 rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
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
        </div>
      </div>

      {typedData?.cfDocument?.description ? (
        <div className="text-sm leading-snug text-slate-700">
          <div className="line-clamp-3">{typedData.cfDocument.description}</div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">Add a description to help others understand this framework.</div>
      )}

      <Handle
        position={Position.Bottom}
        type="source"
        style={{
          background: 'none',
          border: 'none',
          width: '1em',
          height: '1em',
        }}
      />
    </div>
  )
}

