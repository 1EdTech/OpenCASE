import { useCallback } from 'react'
import type { ChangeEvent } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { ArrowLeftCircleIcon, ArrowRightCircleIcon, PlusIcon } from '@heroicons/react/24/solid'

type NodeData = {
  label?: string
  parentId?: string
  onAddChild?: (_parentId: string) => void
}

type TextUpdaterNodeType = Node<NodeData, 'textUpdater'>

export default function TextUpdaterNode({ id, data }: NodeProps<TextUpdaterNodeType>) {
  const onChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    const nextValue = evt.target.value
    console.log(nextValue)
  }, [])

  return (
    <div className="group relative">
      <div className="nodrag nopan absolute right-1 top-1 flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          className="grid h-[22px] w-[22px] place-items-center rounded-full border border-violet-700/90 bg-white/90 text-violet-700 shadow-sm hover:bg-violet-700/10 focus-visible:outline-2 focus-visible:outline-violet-700/50 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            data?.onAddChild?.(id)
          }}
          aria-label="Add child node"
          title="Add child node"
        >
          <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-1">
        <label htmlFor="text" className="block text-[11px] font-semibold text-slate-700">
          Text
        </label>
        <input
          id="text"
          name="text"
          onChange={onChange}
          className="nodrag w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
        />
      </div>

      <Handle
        position={Position.Left}
        type="target"
        style={{
          background: 'none',
          border: 'none',
          width: '0.9em',
          height: '0.9em',
        }}
      >
        <ArrowLeftCircleIcon
          style={{
            pointerEvents: 'none',
            fontSize: '1em',
            left: 0,
            position: 'absolute',
          }}
        />
      </Handle>

      <Handle
        position={Position.Right}
        type="source"
        style={{
          background: 'none',
          border: 'none',
          width: '1em',
          height: '1em',
        }}
      >
        <ArrowRightCircleIcon
          style={{
            pointerEvents: 'none',
            fontSize: '1em',
            left: 0,
            position: 'absolute',
          }}
        />
      </Handle>
    </div>
  )
}

