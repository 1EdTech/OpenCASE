/**
 * Hierarchical layout: framework at top, items in a vertical column below.
 *
 * Pure function -- no React dependency. Used by both the interactive
 * "Reset hierarchy" button and the pre-render auto-layout.
 */
import type { CaseEditorEdge, CaseEditorNodeType } from '@/ui/editor/reactflow/types'
import type { LayoutResult } from '@/ui/editor/state/helpers/nodeGeometry'
import {
  HEADER_SAFE_Y,
  HIERARCHY_GAP_Y,
  HIERARCHY_INDENT,
  getNodeSize,
  isFrameworkNode,
  isItemNode,
} from '@/ui/editor/state/helpers/nodeGeometry'

/**
 * Compute positions and edge handles for a hierarchical layout.
 *
 * - Framework node at the top
 * - Items stacked vertically below, offset to the right
 * - Edges: framework bottom → item left, smoothstep, label near target
 */
export function computeHierarchyLayout(
  nodes: CaseEditorNodeType[],
  edges: CaseEditorEdge[],
): LayoutResult {
  const frameworkNode = nodes.find(isFrameworkNode)
  if (!frameworkNode) return { positions: {}, edgeHandles: {} }

  const frameworkSize = getNodeSize(frameworkNode)

  // Framework-to-item edges, sorted by sequence number
  const fwToItemEdges = edges.filter(
    (e) => e.source === frameworkNode.id && nodes.some((n) => n.id === e.target && isItemNode(n)),
  )
  const sortedEdges = [...fwToItemEdges].sort((a, b) => {
    const seqA = a.data?.cfAssociation?.sequenceNumber ?? a.data?.sequenceNumber ?? Number.MAX_SAFE_INTEGER
    const seqB = b.data?.cfAssociation?.sequenceNumber ?? b.data?.sequenceNumber ?? Number.MAX_SAFE_INTEGER
    return seqA - seqB
  })

  const positions: LayoutResult['positions'] = {}
  const edgeHandles: LayoutResult['edgeHandles'] = {}

  // Framework at top
  positions[frameworkNode.id] = { x: 0, y: HEADER_SAFE_Y }

  // Items stacked vertically, offset to the right
  const itemStartX = frameworkSize.w / 2 + HIERARCHY_INDENT
  let itemY = HEADER_SAFE_Y + frameworkSize.h + HIERARCHY_GAP_Y

  for (const edge of sortedEdges) {
    const itemNode = nodes.find((n) => n.id === edge.target)
    if (!itemNode) continue

    const itemSize = getNodeSize(itemNode)
    positions[edge.target] = { x: itemStartX, y: itemY }
    itemY += itemSize.h + HIERARCHY_GAP_Y

    edgeHandles[edge.id] = {
      sourceHandle: 'bottom',
      targetHandle: 'left',
      edgeType: 'smoothstep',
      labelPosition: 'target',
    }
  }

  return { positions, edgeHandles }
}
