/**
 * Pure, pre-render layout functions.
 *
 * These run BEFORE React Flow mounts so that nodes appear at their final
 * positions on the first paint (no visible jump). They mirror the interactive
 * layout functions in EditorContext but operate on a plain EditorGraph instead
 * of React state.
 */
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import type { CaseEditorNodeType, CaseEditorEdge, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'
import type { Topology } from './detectTopology'

// ── Shared constants (must stay in sync with EditorContext) ────────────
const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 140
const HEADER_SAFE_Y = 96

// Hierarchy
const HIERARCHY_INDENT = 120
const HIERARCHY_GAP_Y = 40

// Tree
const TREE_GAP_X = 40
const TREE_GAP_Y = 100

// Star / radial
const STAR_SIBLING_GAP = 200
const STAR_RADIAL_STEP = DEFAULT_NODE_HEIGHT + 220
const STAR_ELLIPSE_ASPECT = 1.6
const STAR_BASE_RADIUS_MIN = 500

// ── Helpers ────────────────────────────────────────────────────────────

const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType =>
  n.type === 'caseFrameworkNode'

const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType =>
  n.type === 'caseItemNode'

function getNodeSize(n: CaseEditorNodeType): { w: number; h: number } {
  const anyNode = n as unknown as {
    measured?: { width?: number; height?: number }
    width?: number
    height?: number
    style?: { width?: number | string; height?: number | string }
  }
  const w =
    (typeof anyNode.width === 'number' ? anyNode.width : undefined) ??
    (typeof anyNode.style?.width === 'number' ? anyNode.style.width : undefined) ??
    DEFAULT_NODE_WIDTH
  const h =
    (typeof anyNode.height === 'number' ? anyNode.height : undefined) ??
    (typeof anyNode.style?.height === 'number' ? anyNode.style.height : undefined) ??
    DEFAULT_NODE_HEIGHT
  return { w, h }
}

function getClosestHandles(
  sourcePos: { x: number; y: number },
  sourceSize: { w: number; h: number },
  targetPos: { x: number; y: number },
  targetSize: { w: number; h: number },
): { sourceHandle: string; targetHandle: string } {
  const sx = sourcePos.x + sourceSize.w / 2
  const sy = sourcePos.y + sourceSize.h / 2
  const tx = targetPos.x + targetSize.w / 2
  const ty = targetPos.y + targetSize.h / 2
  const dx = tx - sx
  const dy = ty - sy
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy > 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' }
}

/** Build parent → children map and edge-lookup map from edges. */
function buildAdjacency(edges: CaseEditorEdge[]) {
  const childrenOf = new Map<string, string[]>()
  const edgeBySourceTarget = new Map<string, CaseEditorEdge>()
  for (const e of edges) {
    const kids = childrenOf.get(e.source) ?? []
    kids.push(e.target)
    childrenOf.set(e.source, kids)
    edgeBySourceTarget.set(`${e.source}->${e.target}`, e)
  }
  return { childrenOf, edgeBySourceTarget }
}

/** Sort children in-place by sequence number recursively. */
function sortChildrenRecursive(
  parentId: string,
  childrenOf: Map<string, string[]>,
  edgeBySourceTarget: Map<string, CaseEditorEdge>,
) {
  const kids = childrenOf.get(parentId)
  if (!kids) return
  kids.sort((a, b) => {
    const eA = edgeBySourceTarget.get(`${parentId}->${a}`)
    const eB = edgeBySourceTarget.get(`${parentId}->${b}`)
    const seqA = eA?.data?.cfAssociation?.sequenceNumber ?? eA?.data?.sequenceNumber ?? Infinity
    const seqB = eB?.data?.cfAssociation?.sequenceNumber ?? eB?.data?.sequenceNumber ?? Infinity
    return seqA - seqB
  })
  for (const kid of kids) sortChildrenRecursive(kid, childrenOf, edgeBySourceTarget)
}

// ── Apply positions + handles to graph ─────────────────────────────────

function applyPositionsAndHandles(
  graph: EditorGraph,
  positions: Record<string, { x: number; y: number }>,
  edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }>,
): EditorGraph {
  const nodes = graph.nodes.map((n) => {
    const p = positions[n.id]
    return p ? { ...n, position: { x: p.x, y: p.y } } : n
  })
  const edges = graph.edges.map((e) => {
    const h = edgeHandles[e.id]
    if (!h) return e
    return {
      ...e,
      sourceHandle: h.sourceHandle,
      targetHandle: h.targetHandle,
      data: { ...e.data, edgeType: h.edgeType, labelPosition: h.labelPosition },
    } as CaseEditorEdge
  })
  return { nodes, edges }
}

// ── Hierarchy layout ───────────────────────────────────────────────────

function layoutHierarchy(graph: EditorGraph): EditorGraph {
  const frameworkNode = graph.nodes.find(isFrameworkNode)
  if (!frameworkNode) return graph

  const frameworkSize = getNodeSize(frameworkNode)
  const { childrenOf, edgeBySourceTarget } = buildAdjacency(graph.edges)
  sortChildrenRecursive(frameworkNode.id, childrenOf, edgeBySourceTarget)

  const fwToItemEdges = graph.edges.filter(
    (e) => e.source === frameworkNode.id && graph.nodes.some((n) => n.id === e.target && isItemNode(n)),
  )
  const sortedEdges = [...fwToItemEdges].sort((a, b) => {
    const seqA = a.data?.cfAssociation?.sequenceNumber ?? a.data?.sequenceNumber ?? Infinity
    const seqB = b.data?.cfAssociation?.sequenceNumber ?? b.data?.sequenceNumber ?? Infinity
    return seqA - seqB
  })

  const positions: Record<string, { x: number; y: number }> = {}
  const edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }> = {}

  positions[frameworkNode.id] = { x: 0, y: HEADER_SAFE_Y }

  const itemStartX = frameworkSize.w / 2 + HIERARCHY_INDENT
  let itemY = HEADER_SAFE_Y + frameworkSize.h + HIERARCHY_GAP_Y

  for (const edge of sortedEdges) {
    const itemNode = graph.nodes.find((n) => n.id === edge.target)
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

  return applyPositionsAndHandles(graph, positions, edgeHandles)
}

// ── Tree layout (generic) ──────────────────────────────────────────────

function layoutTree(graph: EditorGraph): EditorGraph {
  const frameworkNode = graph.nodes.find(isFrameworkNode)
  if (!frameworkNode) return graph

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const { childrenOf } = buildAdjacency(graph.edges)

  // Recursive sub-tree width
  const subtreeWidth = new Map<string, number>()
  const calcWidth = (id: string): number => {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!
    const n = nodeById.get(id)
    if (!n) return 0
    const { w } = getNodeSize(n)
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) { subtreeWidth.set(id, w); return w }
    const total = kids.map(calcWidth).reduce((a, b) => a + b, 0) + TREE_GAP_X * Math.max(0, kids.length - 1)
    const sw = Math.max(w, total)
    subtreeWidth.set(id, sw)
    return sw
  }
  calcWidth(frameworkNode.id)

  // Recursive positioning
  const positions: Record<string, { x: number; y: number }> = {}
  const layoutNode = (id: string, centerX: number, y: number) => {
    const n = nodeById.get(id)
    if (!n) return
    const { w, h } = getNodeSize(n)
    positions[id] = { x: Math.round(centerX - w / 2), y: Math.round(y) }
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) return
    const nextY = y + h + TREE_GAP_Y
    const total = kids.map((k) => subtreeWidth.get(k) ?? getNodeSize(nodeById.get(k)!).w)
      .reduce((a, b) => a + b, 0) + TREE_GAP_X * Math.max(0, kids.length - 1)
    let cursor = centerX - total / 2
    for (const kid of kids) {
      const sw = subtreeWidth.get(kid) ?? getNodeSize(nodeById.get(kid)!).w
      layoutNode(kid, cursor + sw / 2, nextY)
      cursor += sw + TREE_GAP_X
    }
  }
  layoutNode(frameworkNode.id, 0, HEADER_SAFE_Y)

  // Compute handles
  const edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }> = {}
  for (const e of graph.edges) {
    const sn = nodeById.get(e.source)
    const tn = nodeById.get(e.target)
    if (!sn || !tn) continue
    const sp = positions[e.source] ?? sn.position
    const tp = positions[e.target] ?? tn.position
    const handles = getClosestHandles(sp, getNodeSize(sn), tp, getNodeSize(tn))
    edgeHandles[e.id] = { ...handles, edgeType: undefined, labelPosition: 'center' }
  }

  return applyPositionsAndHandles(graph, positions, edgeHandles)
}

// ── Star / radial layout ───────────────────────────────────────────────

function layoutStar(graph: EditorGraph): EditorGraph {
  const frameworkNode = graph.nodes.find(isFrameworkNode)
  if (!frameworkNode) return graph

  const frameworkSize = getNodeSize(frameworkNode)
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const { childrenOf, edgeBySourceTarget } = buildAdjacency(graph.edges)
  sortChildrenRecursive(frameworkNode.id, childrenOf, edgeBySourceTarget)

  const startNodeIds = childrenOf.get(frameworkNode.id) ?? []
  if (!startNodeIds.length) return layoutTree(graph) // fallback

  // Leaf count for proportional sectors
  const leafCount = new Map<string, number>()
  const countLeaves = (id: string): number => {
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) { leafCount.set(id, 1); return 1 }
    const count = kids.reduce((sum, kid) => sum + countLeaves(kid), 0)
    leafCount.set(id, count)
    return count
  }
  for (const id of startNodeIds) countLeaves(id)
  const totalLeaves = startNodeIds.reduce((sum, id) => sum + (leafCount.get(id) ?? 1), 0)

  // Tangential span (recursive)
  const tangentialSpan = new Map<string, number>()
  const calcSpan = (id: string): number => {
    if (tangentialSpan.has(id)) return tangentialSpan.get(id)!
    const n = nodeById.get(id)
    if (!n) return DEFAULT_NODE_WIDTH
    const { w } = getNodeSize(n)
    const kids = childrenOf.get(id) ?? []
    if (!kids.length) { tangentialSpan.set(id, w); return w }
    const kidsSpan = kids.reduce((sum, kid) => sum + calcSpan(kid), 0)
      + Math.max(0, kids.length - 1) * STAR_SIBLING_GAP
    const span = Math.max(w, kidsSpan)
    tangentialSpan.set(id, span)
    return span
  }
  for (const id of startNodeIds) calcSpan(id)

  // Blended sector allocation
  const N = startNodeIds.length
  const minFraction = 0.5 / N
  const propPool = 0.5
  const getSectorAngle = (id: string) =>
    (minFraction + ((leafCount.get(id) ?? 1) / totalLeaves) * propPool) * 2 * Math.PI

  // Ellipse radii
  let baseRadius = STAR_BASE_RADIUS_MIN
  if (N > 1) {
    const minSectorAngle = Math.min(...startNodeIds.map(getSectorAngle))
    const halfAngle = minSectorAngle / 2
    if (halfAngle > 0 && halfAngle < Math.PI) {
      baseRadius = Math.max(baseRadius, (DEFAULT_NODE_WIDTH + 80) / (2 * Math.sin(halfAngle)))
    }
  }
  const rX = baseRadius * STAR_ELLIPSE_ASPECT
  const rY = baseRadius
  const ellipseR = (angle: number) => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return (rX * rY) / Math.sqrt(rY * rY * c * c + rX * rX * s * s)
  }

  // Positions
  const positions: Record<string, { x: number; y: number }> = {}
  const cx = 0
  const cy = 0
  positions[frameworkNode.id] = { x: cx - frameworkSize.w / 2, y: cy - frameworkSize.h / 2 }

  // Recursive radial children positioning
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
    const totalExtent = kids.reduce(
      (sum, kid) => sum + (tangentialSpan.get(kid) ?? DEFAULT_NODE_WIDTH), 0,
    ) + Math.max(0, kids.length - 1) * STAR_SIBLING_GAP
    const parentLeaves = leafCount.get(parentId) ?? 1
    let cursor = -totalExtent / 2
    let kidAngleOffset = sectorStart
    for (const kid of kids) {
      const kidNode = nodeById.get(kid)
      if (!kidNode) continue
      const kidSize = getNodeSize(kidNode)
      const span = tangentialSpan.get(kid) ?? DEFAULT_NODE_WIDTH
      const kidOff = cursor + span / 2
      const kidCX = kidBaseCX + tanX * kidOff
      const kidCY = kidBaseCY + tanY * kidOff
      positions[kid] = { x: Math.round(kidCX - kidSize.w / 2), y: Math.round(kidCY - kidSize.h / 2) }
      const kidLeaves = leafCount.get(kid) ?? 1
      const kidSA = (kidLeaves / parentLeaves) * (sectorEnd - sectorStart)
      positionRadialChildren(kid, kidCX, kidCY, kidAngleOffset, kidAngleOffset + kidSA)
      kidAngleOffset += kidSA
      cursor += span + STAR_SIBLING_GAP
    }
  }

  let angleOffset = -Math.PI / 2
  for (const startId of startNodeIds) {
    const sectorAngle = getSectorAngle(startId)
    const midAngle = angleOffset + sectorAngle / 2
    const startNode = nodeById.get(startId)
    if (!startNode) continue
    const startSize = getNodeSize(startNode)
    const r = ellipseR(midAngle)
    const startCX = cx + r * Math.cos(midAngle)
    const startCY = cy + r * Math.sin(midAngle)
    positions[startId] = { x: Math.round(startCX - startSize.w / 2), y: Math.round(startCY - startSize.h / 2) }
    positionRadialChildren(startId, startCX, startCY, angleOffset, angleOffset + sectorAngle)
    angleOffset += sectorAngle
  }

  // Compute handles for every edge
  const edgeHandles: Record<string, { sourceHandle: string; targetHandle: string; edgeType?: string; labelPosition?: 'center' | 'target' }> = {}
  for (const e of graph.edges) {
    const sn = nodeById.get(e.source)
    const tn = nodeById.get(e.target)
    if (!sn || !tn) {
      edgeHandles[e.id] = { sourceHandle: e.sourceHandle ?? 'bottom', targetHandle: e.targetHandle ?? 'top', edgeType: undefined, labelPosition: 'center' }
      continue
    }
    const sp = positions[e.source] ?? sn.position
    const tp = positions[e.target] ?? tn.position
    const handles = getClosestHandles(sp, getNodeSize(sn), tp, getNodeSize(tn))
    edgeHandles[e.id] = { ...handles, edgeType: undefined, labelPosition: 'center' }
  }

  return applyPositionsAndHandles(graph, positions, edgeHandles)
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Apply the appropriate auto-layout to a graph that has no saved positions.
 * Returns a new graph with updated node positions and edge handles, plus
 * the edge type to use as the framework-level default.
 */
export function applyInitialLayout(
  graph: EditorGraph,
  topology: Topology,
): { graph: EditorGraph; edgeType: string } {
  switch (topology) {
    case 'hierarchy':
      return { graph: layoutHierarchy(graph), edgeType: 'smoothstep' }
    case 'star':
      return { graph: layoutStar(graph), edgeType: 'default' }
    case 'tree':
    default:
      return { graph: layoutTree(graph), edgeType: 'default' }
  }
}
