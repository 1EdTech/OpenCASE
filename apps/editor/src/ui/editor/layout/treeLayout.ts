/**
 * Generic tree-spread layout: framework at top, children fanning out below.
 *
 * Pure function -- no React dependency. Used by both the auto-layout
 * `useEffect` in EditorProvider and the pre-render auto-layout.
 */
import type { CaseEditorEdge, CaseEditorNodeType } from '@/ui/editor/reactflow/types'
import type { LayoutResult } from '@/ui/editor/state/helpers/nodeGeometry'
import {
  HEADER_SAFE_Y,
  TREE_GAP_X,
  TREE_GAP_Y,
  buildAdjacency,
  getClosestHandles,
  getNodeSize,
  isFrameworkNode,
} from '@/ui/editor/state/helpers/nodeGeometry'

/**
 * Compute positions and edge handles for a generic tree layout.
 *
 * - Framework node at the top center
 * - Children recursively spread horizontally below their parent
 * - Edge handles computed for shortest path
 */
export function computeTreeLayout(
  nodes: CaseEditorNodeType[],
  edges: CaseEditorEdge[],
): LayoutResult {
  const frameworkNode = nodes.find(isFrameworkNode)
  if (!frameworkNode) return { positions: {}, edgeHandles: {} }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const { childrenOf } = buildAdjacency(edges)

  // Recursive sub-tree width
  const subtreeWidth = new Map<string, number>()
  const calcWidth = (id: string): number => {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!
    const n = nodeById.get(id)
    if (!n) return 0
    const { w } = getNodeSize(n)
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) {
      subtreeWidth.set(id, w)
      return w
    }
    const total = kids.map(calcWidth).reduce((a, b) => a + b, 0) + TREE_GAP_X * Math.max(0, kids.length - 1)
    const sw = Math.max(w, total)
    subtreeWidth.set(id, sw)
    return sw
  }
  calcWidth(frameworkNode.id)

  // Recursive positioning
  const positions: LayoutResult['positions'] = {}
  const layoutNode = (id: string, centerX: number, y: number) => {
    const n = nodeById.get(id)
    if (!n) return
    const { w, h } = getNodeSize(n)
    positions[id] = { x: Math.round(centerX - w / 2), y: Math.round(y) }
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) return
    const nextY = y + h + TREE_GAP_Y
    const total =
      kids.map((k) => subtreeWidth.get(k) ?? getNodeSize(nodeById.get(k)!).w).reduce((a, b) => a + b, 0) +
      TREE_GAP_X * Math.max(0, kids.length - 1)
    let cursor = centerX - total / 2
    for (const kid of kids) {
      const sw = subtreeWidth.get(kid) ?? getNodeSize(nodeById.get(kid)!).w
      layoutNode(kid, cursor + sw / 2, nextY)
      cursor += sw + TREE_GAP_X
    }
  }
  layoutNode(frameworkNode.id, 0, HEADER_SAFE_Y)

  // Compute handles for every edge
  const edgeHandles: LayoutResult['edgeHandles'] = {}
  for (const e of edges) {
    const sn = nodeById.get(e.source)
    const tn = nodeById.get(e.target)
    if (!sn || !tn) continue
    const sp = positions[e.source] ?? sn.position
    const tp = positions[e.target] ?? tn.position
    const handles = getClosestHandles(sp, getNodeSize(sn), tp, getNodeSize(tn))
    edgeHandles[e.id] = { ...handles, edgeType: undefined, labelPosition: 'center' }
  }

  return { positions, edgeHandles }
}
