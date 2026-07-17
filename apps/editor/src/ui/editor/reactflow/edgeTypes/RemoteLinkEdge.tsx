import { memo, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react'
import { formatAssociationType } from '@/ui/editor/state/editorFactories'

const BAR_HEIGHT = 20

type RemoteLinkEdgeData = {
  associationType?: string
  remoteBarIndex?: number
  remoteBarCount?: number
  parallelIndex?: number
  parallelCount?: number
  edgeType?: 'default' | 'straight' | 'step' | 'smoothstep'
}

function nodeSize(node: {
  measured?: { width?: number; height?: number }
  width?: number
  height?: number
  style?: { width?: number; height?: number }
}) {
  const w = node.measured?.width ?? node.width ?? (typeof node.style?.width === 'number' ? node.style.width : 280)
  const h = node.measured?.height ?? node.height ?? (typeof node.style?.height === 'number' ? node.style.height : 160)
  return { w: Number(w), h: Number(h) }
}

function RemoteLinkEdge(props: EdgeProps) {
  const { id, source, target, data, style, markerEnd, markerStart, selected } = props
  const edgeData = data as RemoteLinkEdgeData | undefined
  const edgeType = edgeData?.edgeType ?? 'default'

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  const geometry = useMemo(() => {
    if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute) return null

    const src = nodeSize(sourceNode)
    const tgt = nodeSize(targetNode)
    const barCount = edgeData?.remoteBarCount ?? 1
    const barIndex = edgeData?.remoteBarIndex ?? 0

    const sourceX = sourceNode.internals.positionAbsolute.x + src.w
    const sourceY = sourceNode.internals.positionAbsolute.y + src.h - (barCount - barIndex) * BAR_HEIGHT + BAR_HEIGHT / 2
    const targetX = targetNode.internals.positionAbsolute.x
    const targetY = targetNode.internals.positionAbsolute.y + tgt.h / 2

    const pathArgs = {
      sourceX,
      sourceY,
      sourcePosition: Position.Right,
      targetX,
      targetY,
      targetPosition: Position.Left,
    }

    if (edgeType === 'straight') {
      const [path, labelX, labelY] = getStraightPath(pathArgs)
      return { path, labelX, labelY }
    }
    if (edgeType === 'step' || edgeType === 'smoothstep') {
      const [path, labelX, labelY] = getSmoothStepPath(pathArgs)
      return { path, labelX, labelY }
    }
    const [path, labelX, labelY] = getBezierPath(pathArgs)
    return { path, labelX, labelY }
  }, [sourceNode, targetNode, edgeData?.remoteBarCount, edgeData?.remoteBarIndex, edgeType])

  if (!geometry) return null

  const associationType = edgeData?.associationType ?? 'isRelatedTo'
  const typeLabel = formatAssociationType(associationType)
  const parallelIndex = edgeData?.parallelIndex ?? 0
  const parallelCount = edgeData?.parallelCount ?? 1
  const parallelOffsetY = parallelCount > 1 ? parallelIndex * 22 : 0
  const stroke = (style?.stroke as string | undefined) ?? '#662F90'

  return (
    <>
      <BaseEdge
        id={id}
        path={geometry.path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          stroke,
          strokeWidth: 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${geometry.labelX}px,${geometry.labelY + parallelOffsetY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              background: 'white',
              borderRadius: '10px',
              padding: '5px 10px',
              boxShadow: selected
                ? '0 0 0 2px rgba(124, 58, 237, 0.3), 0 2px 8px rgba(0,0,0,0.15)'
                : '0 1px 4px rgba(0,0,0,0.1)',
              border: selected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
              fontSize: '10px',
              fontWeight: 500,
              color: selected ? '#7c3aed' : '#64748b',
              textTransform: 'lowercase',
            }}
          >
            {typeLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(RemoteLinkEdge)
