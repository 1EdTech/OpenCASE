/**
 * Star / radial layout: framework at center, start nodes on an elliptical
 * ring, children clustered around their parent extending outward.
 *
 * Pure function -- no React dependency. Used by both the interactive
 * "Star layout" button and the pre-render auto-layout.
 */
import type { CaseEditorEdge, CaseEditorNodeType } from '@/ui/editor/reactflow/types'
import type { LayoutResult } from '@/ui/editor/state/helpers/nodeGeometry'
import {
  DEFAULT_NODE_WIDTH,
  STAR_BASE_RADIUS_MIN,
  STAR_ELLIPSE_ASPECT,
  STAR_RADIAL_STEP,
  STAR_SIBLING_GAP,
  buildAdjacency,
  getClosestHandles,
  getNodeSize,
  isFrameworkNode,
  sortChildrenRecursive,
} from '@/ui/editor/state/helpers/nodeGeometry'
import { computeTreeLayout } from './treeLayout'

/**
 * Compute positions and edge handles for a star/radial layout.
 *
 * - Framework node at the center
 * - Start nodes distributed on an elliptical ring
 * - Children clustered around their parent, extending outward radially
 * - Siblings spread tangentially with recursive span allocation
 * - Edge handles computed for shortest path; per-edge overrides cleared
 */
export function computeStarLayout(
  nodes: CaseEditorNodeType[],
  edges: CaseEditorEdge[],
): LayoutResult {
  const frameworkNode = nodes.find(isFrameworkNode)
  if (!frameworkNode) return { positions: {}, edgeHandles: {} }

  const frameworkSize = getNodeSize(frameworkNode)
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const { childrenOf, edgeBySourceTarget } = buildAdjacency(edges)
  sortChildrenRecursive(frameworkNode.id, childrenOf, edgeBySourceTarget)

  const startNodeIds = childrenOf.get(frameworkNode.id) ?? []
  if (!startNodeIds.length) return computeTreeLayout(nodes, edges) // fallback

  // ── Count leaves for proportional angular allocation ─────────────────
  const leafCount = new Map<string, number>()
  const countLeaves = (id: string): number => {
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) {
      leafCount.set(id, 1)
      return 1
    }
    const count = kids.reduce((sum, kid) => sum + countLeaves(kid), 0)
    leafCount.set(id, count)
    return count
  }
  for (const id of startNodeIds) countLeaves(id)
  const totalLeaves = startNodeIds.reduce((sum, id) => sum + (leafCount.get(id) ?? 1), 0)

  // ── Recursive tangential span ────────────────────────────────────────
  const tangentialSpan = new Map<string, number>()
  const calcSpan = (id: string): number => {
    if (tangentialSpan.has(id)) return tangentialSpan.get(id)!
    const n = nodeById.get(id)
    if (!n) return DEFAULT_NODE_WIDTH
    const { w } = getNodeSize(n)
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) {
      tangentialSpan.set(id, w)
      return w
    }
    const kidsSpan =
      kids.reduce((sum, kid) => sum + calcSpan(kid), 0) + Math.max(0, kids.length - 1) * STAR_SIBLING_GAP
    const span = Math.max(w, kidsSpan)
    tangentialSpan.set(id, span)
    return span
  }
  for (const id of startNodeIds) calcSpan(id)

  // ── Blended sector allocation ────────────────────────────────────────
  const N = startNodeIds.length
  const minFraction = 0.5 / N
  const propPool = 0.5
  const getSectorAngle = (id: string) =>
    (minFraction + ((leafCount.get(id) ?? 1) / totalLeaves) * propPool) * 2 * Math.PI

  // ── Ellipse radii ────────────────────────────────────────────────────
  let baseRadius = STAR_BASE_RADIUS_MIN
  if (N > 1) {
    const minSectorAngle = Math.min(...startNodeIds.map(getSectorAngle))
    const halfAngle = minSectorAngle / 2
    if (halfAngle > 0 && halfAngle < Math.PI) {
      baseRadius = Math.max(baseRadius, (DEFAULT_NODE_WIDTH + 80) / (2 * Math.sin(halfAngle)))
    }
  }
  const radiusX = baseRadius * STAR_ELLIPSE_ASPECT
  const radiusY = baseRadius
  const ellipseRadius = (angle: number) => {
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    return (radiusX * radiusY) / Math.sqrt(radiusY * radiusY * cosA * cosA + radiusX * radiusX * sinA * sinA)
  }

  // ── Position framework at center ─────────────────────────────────────
  const positions: LayoutResult['positions'] = {}
  const cx = 0
  const cy = 0
  positions[frameworkNode.id] = { x: cx - frameworkSize.w / 2, y: cy - frameworkSize.h / 2 }

  // ── Recursive radial sub-tree positioning ────────────────────────────
  const positionRadialChildren = (
    parentId: string,
    parentCX: number,
    parentCY: number,
    sectorStart: number,
    sectorEnd: number,
  ) => {
    const kids = childrenOf.get(parentId) ?? []
    if (!kids.length) return

    const sectorMid = (sectorStart + sectorEnd) / 2
    const outX = Math.cos(sectorMid)
    const outY = Math.sin(sectorMid)
    const tanX = -Math.sin(sectorMid)
    const tanY = Math.cos(sectorMid)

    const kidBaseCX = parentCX + outX * STAR_RADIAL_STEP
    const kidBaseCY = parentCY + outY * STAR_RADIAL_STEP

    const totalExtent =
      kids.reduce((sum, kid) => sum + (tangentialSpan.get(kid) ?? DEFAULT_NODE_WIDTH), 0) +
      Math.max(0, kids.length - 1) * STAR_SIBLING_GAP

    const parentLeaves = leafCount.get(parentId) ?? 1
    let cursor = -totalExtent / 2
    let kidAngleOffset = sectorStart

    for (const kid of kids) {
      const kidNode = nodeById.get(kid)
      if (!kidNode) continue
      const kidSize = getNodeSize(kidNode)
      const span = tangentialSpan.get(kid) ?? DEFAULT_NODE_WIDTH
      const kidTangentialOffset = cursor + span / 2

      const kidCX = kidBaseCX + tanX * kidTangentialOffset
      const kidCY = kidBaseCY + tanY * kidTangentialOffset

      positions[kid] = {
        x: Math.round(kidCX - kidSize.w / 2),
        y: Math.round(kidCY - kidSize.h / 2),
      }

      const kidLeaves = leafCount.get(kid) ?? 1
      const kidSectorAngle = (kidLeaves / parentLeaves) * (sectorEnd - sectorStart)

      positionRadialChildren(kid, kidCX, kidCY, kidAngleOffset, kidAngleOffset + kidSectorAngle)
      kidAngleOffset += kidSectorAngle
      cursor += span + STAR_SIBLING_GAP
    }
  }

  // ── Place start nodes and their sub-trees ────────────────────────────
  let angleOffset = -Math.PI / 2
  for (const startId of startNodeIds) {
    const sectorAngle = getSectorAngle(startId)
    const midAngle = angleOffset + sectorAngle / 2

    const startNode = nodeById.get(startId)
    if (!startNode) continue
    const startSize = getNodeSize(startNode)

    const r = ellipseRadius(midAngle)
    const startCX = cx + r * Math.cos(midAngle)
    const startCY = cy + r * Math.sin(midAngle)
    positions[startId] = {
      x: Math.round(startCX - startSize.w / 2),
      y: Math.round(startCY - startSize.h / 2),
    }

    positionRadialChildren(startId, startCX, startCY, angleOffset, angleOffset + sectorAngle)
    angleOffset += sectorAngle
  }

  // ── Compute closest handles for ALL edges ────────────────────────────
  const edgeHandles: LayoutResult['edgeHandles'] = {}
  for (const e of edges) {
    const sourceNode = nodeById.get(e.source)
    const targetNode = nodeById.get(e.target)

    if (!sourceNode || !targetNode) {
      edgeHandles[e.id] = {
        sourceHandle: e.sourceHandle ?? 'bottom',
        targetHandle: e.targetHandle ?? 'top',
        edgeType: undefined,
        labelPosition: 'center',
      }
      continue
    }

    const sourcePos = positions[e.source] ?? sourceNode.position
    const targetPos = positions[e.target] ?? targetNode.position
    const handles = getClosestHandles(sourcePos, getNodeSize(sourceNode), targetPos, getNodeSize(targetNode))
    edgeHandles[e.id] = {
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      edgeType: undefined,
      labelPosition: 'center',
    }
  }

  return { positions, edgeHandles }
}
