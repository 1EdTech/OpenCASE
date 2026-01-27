import { Handle, Position, type NodeProps, NodeResizer, useReactFlow } from '@xyflow/react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import type { CaseFrameworkNodeType } from '../types'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'

export default function CaseFrameworkNode({ id, data, selected }: NodeProps<CaseFrameworkNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()

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
      >
        <Handle
          position={Position.Bottom}
          type="source"
          // Anchor to the visible card, not the (potentially larger) node bounds.
          style={{
            background: 'none',
            border: 'none',
            width: '1em',
            height: '1em',
          }}
        />
      </FrameworkCard>
    </div>
  )
}

