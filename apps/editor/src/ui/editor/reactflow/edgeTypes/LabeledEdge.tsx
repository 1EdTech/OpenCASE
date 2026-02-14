import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath } from '@xyflow/react'
import type { Edge, EdgeProps } from '@xyflow/react'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '../types'

/** Format association type for display */
function formatAssociationType(associationType: string): string {
  switch (associationType) {
    case FRAMEWORK_ROOT_ASSOCIATION_TYPE: return 'starts'
    case 'isChildOf': return 'child of'
    case 'isPartOf': return 'part of'
    case 'isRelatedTo': return 'related to'
    case 'isPeerOf': return 'peer of'
    case 'precedes': return 'precedes'
    case 'exactMatchOf': return 'exact match'
    case 'isTranslationOf': return 'translation of'
    default: return associationType
  }
}

type LabeledEdgeData = {
  associationType?: string
  sequenceNumber?: number
  edgeType?: 'default' | 'straight' | 'step' | 'smoothstep'
  /** Where to position the label along the edge path */
  labelPosition?: 'center' | 'target'
  /** Visual offset index for parallel edges between the same node pair */
  parallelIndex?: number
  /** Total number of parallel edges between the same node pair */
  parallelCount?: number
}

export type LabeledEdge = Edge<LabeledEdgeData, 'labeled'>

/**
 * Custom edge that renders a rich label with sequence number prominently displayed
 */
function LabeledEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    markerStart,
    style,
    selected,
  } = props
  
  const edgeData = data as LabeledEdgeData | undefined
  const edgeType = edgeData?.edgeType ?? 'default'
  
  // Get the path based on edge type
  let edgePath: string
  let labelX: number
  let labelY: number
  
  if (edgeType === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    })
  } else if (edgeType === 'step' || edgeType === 'smoothstep') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })
  }

  // When label should sit near the target, place it on the final edge segment
  // entering the target handle — vertically centered on targetY, offset left of targetX.
  // The label uses translate(-50%, -50%) so its center lands on (labelX, labelY).
  if (edgeData?.labelPosition === 'target') {
    const LABEL_OFFSET = 60 // px to the left of the target handle
    labelX = targetX - LABEL_OFFSET
    labelY = targetY
  }

  const associationType = edgeData?.associationType ?? 'isChildOf'
  const sequenceNumber = edgeData?.sequenceNumber
  const hasSequence = sequenceNumber !== undefined && sequenceNumber !== null
  const typeLabel = formatAssociationType(associationType)
  const parallelIndex = edgeData?.parallelIndex ?? 0
  const parallelCount = edgeData?.parallelCount ?? 1
  const LABEL_PARALLEL_SPACING = 22
  const parallelOffsetY = parallelCount > 1 ? parallelIndex * LABEL_PARALLEL_SPACING : 0

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + parallelOffsetY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'white',
              borderRadius: '10px',
              padding: hasSequence ? '8px 14px 6px' : '5px 10px',
              boxShadow: selected 
                ? '0 0 0 2px rgba(124, 58, 237, 0.3), 0 2px 8px rgba(0,0,0,0.15)' 
                : '0 1px 4px rgba(0,0,0,0.1)',
              border: selected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
              transition: 'all 0.15s ease',
            }}
          >
            {hasSequence && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: selected ? '#7c3aed' : '#6366f1',
                  lineHeight: 1,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {sequenceNumber}
              </div>
            )}
            {hasSequence && (
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                  marginBottom: '4px',
                }}
              >
                sequence
              </div>
            )}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: selected ? '#7c3aed' : '#64748b',
                textTransform: 'lowercase',
                letterSpacing: '0.02em',
                borderTop: hasSequence ? '1px solid #e2e8f0' : 'none',
                paddingTop: hasSequence ? '4px' : '0',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {typeLabel}
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(LabeledEdge)
