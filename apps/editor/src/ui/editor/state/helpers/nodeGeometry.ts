/**
 * Pure geometry utilities for CASE editor nodes.
 *
 * No React dependency -- used by the reducer, layout algorithms,
 * and any code that needs to measure or position editor nodes.
 */
import type {
  CaseEditorEdge,
  CaseEditorNodeType,
  CaseFrameworkNodeType,
  CaseItemNodeType,
  ExternalFrameworkNodeType,
} from '@/ui/editor/reactflow/types'

// ── Layout constants ───────────────────────────────────────────────────

export const DEFAULT_NODE_WIDTH = 280
export const DEFAULT_NODE_HEIGHT = 140
export const NODE_GAP_X = 36
export const NODE_GAP_Y = 100 // Vertical gap for non-overlapping positioning

export const TREE_GAP_X = 40
export const TREE_GAP_Y = 100 // Vertical gap between parent/child for edge visibility
export const HEADER_SAFE_Y = 96

// Hierarchy-layout
export const HIERARCHY_INDENT = 120 // How far right item column is offset from framework center
export const HIERARCHY_GAP_Y = 40 // Vertical gap between items in hierarchy column

// Star-layout constants
export const STAR_SIBLING_GAP = 200
export const STAR_RADIAL_STEP = DEFAULT_NODE_HEIGHT + 220
export const STAR_ELLIPSE_ASPECT = 1.6
export const STAR_BASE_RADIUS_MIN = 500

// ── CSS class applied to wrapper nodes ─────────────────────────────────

export const WRAPPER_NODE_CLASS = 'bg-transparent border-0 p-0 shadow-none'

// ── Type guards ────────────────────────────────────────────────────────

export const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType =>
  n.type === 'caseFrameworkNode'

export const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType =>
  n.type === 'caseItemNode'

export const isExternalFrameworkNode = (n: CaseEditorNodeType): n is ExternalFrameworkNodeType =>
  n.type === 'externalFrameworkNode'

// ── Node size ──────────────────────────────────────────────────────────

export function getNodeSize(n: CaseEditorNodeType): { w: number; h: number } {
  const anyNode = n as unknown as {
    measured?: { width?: number; height?: number }
    width?: number
    height?: number
    style?: { width?: number | string; height?: number | string }
  }

  const measuredW = anyNode.measured?.width
  const measuredH = anyNode.measured?.height
  if (typeof measuredW === 'number' && typeof measuredH === 'number') return { w: measuredW, h: measuredH }

  const styleW = anyNode.style?.width
  const styleH = anyNode.style?.height
  const w =
    (typeof anyNode.width === 'number' ? anyNode.width : undefined) ??
    (typeof styleW === 'number' ? styleW : undefined) ??
    DEFAULT_NODE_WIDTH
  const h =
    (typeof anyNode.height === 'number' ? anyNode.height : undefined) ??
    (typeof styleH === 'number' ? styleH : undefined) ??
    DEFAULT_NODE_HEIGHT

  return { w, h }
}

// ── Handle routing ─────────────────────────────────────────────────────

/**
 * Calculate the best handles for connecting two nodes based on their positions.
 * Returns the handles that create the shortest/cleanest edge path.
 */
export function getClosestHandles(
  sourcePos: { x: number; y: number },
  sourceSize: { w: number; h: number },
  targetPos: { x: number; y: number },
  targetSize: { w: number; h: number },
): { sourceHandle: string; targetHandle: string } {
  const sourceCenter = { x: sourcePos.x + sourceSize.w / 2, y: sourcePos.y + sourceSize.h / 2 }
  const targetCenter = { x: targetPos.x + targetSize.w / 2, y: targetPos.y + targetSize.h / 2 }

  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (absX > absY) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy > 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' }
}

// ── Collision avoidance ────────────────────────────────────────────────

export const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function findNonOverlappingPosition(
  desired: { x: number; y: number },
  size: { w: number; h: number },
  nodes: CaseEditorNodeType[],
): { x: number; y: number } {
  const occupied = nodes.map((n) => {
    const s = getNodeSize(n)
    return { x: n.position.x, y: n.position.y, w: s.w, h: s.h }
  })

  const maxCols = 6
  for (let attempt = 0; attempt < 200; attempt++) {
    const col = attempt % maxCols
    const row = Math.floor(attempt / maxCols)
    const candidate = {
      x: desired.x + col * (size.w + NODE_GAP_X),
      y: desired.y + row * (size.h + NODE_GAP_Y),
    }
    const candRect = { x: candidate.x, y: candidate.y, w: size.w, h: size.h }
    if (!occupied.some((r) => rectsOverlap(candRect, r))) return candidate
  }

  return desired
}

// ── Graph adjacency ────────────────────────────────────────────────────

/** Build parent → children map and edge-lookup map from edges. */
export function buildAdjacency(edges: CaseEditorEdge[]) {
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

/** Sort children in-place by sequence number, recursively. */
export function sortChildrenRecursive(
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

// ── Shared layout result type ──────────────────────────────────────────

/** Return type of all pure layout functions. */
export type LayoutResult = {
  positions: Record<string, { x: number; y: number }>
  edgeHandles: Record<
    string,
    {
      sourceHandle: string
      targetHandle: string
      edgeType?: string
      labelPosition?: 'center' | 'target'
    }
  >
}
