import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import type { CaseFrameworkNodeType } from '../types'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'

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
    <div className="h-full w-full">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={320}
        minHeight={170}
        maxWidth={820}
        maxHeight={560}
        lineStyle={{ borderColor: 'rgba(15, 23, 42, 0.18)' }}
        handleStyle={{ width: 5, height: 5, borderRadius: 10, borderColor: 'rgba(109, 40, 217, 0.7)' }}
      />

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
        primaryActionLabel="Add item"
        primaryActionIcon="plus"
        onPrimaryAction={() => typedData?.onAddChild?.(id)}
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

