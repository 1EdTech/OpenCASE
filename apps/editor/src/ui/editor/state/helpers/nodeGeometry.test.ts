import { describe, it, expect } from 'vitest'
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  buildAdjacency,
  findNonOverlappingPosition,
  getClosestHandles,
  getNodeSize,
  isFrameworkNode,
  isItemNode,
  rectsOverlap,
  sortChildrenRecursive,
} from './nodeGeometry'
import { makeFrameworkNode, makeItemNode, makeEdge, makeSeqEdge } from '@/__tests__/fixtures'

// ── Type guards ────────────────────────────────────────────────────────

describe('isFrameworkNode', () => {
  it('returns true for caseFrameworkNode', () => {
    expect(isFrameworkNode(makeFrameworkNode())).toBe(true)
  })

  it('returns false for caseItemNode', () => {
    expect(isFrameworkNode(makeItemNode('item-1'))).toBe(false)
  })
})

describe('isItemNode', () => {
  it('returns true for caseItemNode', () => {
    expect(isItemNode(makeItemNode('item-1'))).toBe(true)
  })

  it('returns false for caseFrameworkNode', () => {
    expect(isItemNode(makeFrameworkNode())).toBe(false)
  })
})

// ── getNodeSize ────────────────────────────────────────────────────────

describe('getNodeSize', () => {
  it('returns defaults when no size info is available', () => {
    const node = makeFrameworkNode()
    const size = getNodeSize(node)
    expect(size.w).toBe(DEFAULT_NODE_WIDTH)
    expect(size.h).toBe(DEFAULT_NODE_HEIGHT)
  })

  it('reads from style when present', () => {
    const node = makeItemNode('x', { style: { width: 400, height: 200 } })
    const size = getNodeSize(node)
    expect(size.w).toBe(400)
    expect(size.h).toBe(200)
  })

  it('prefers measured over style', () => {
    const node = makeItemNode('x', { style: { width: 400, height: 200 } }) as unknown as Record<string, unknown>
    node.measured = { width: 350, height: 180 }
    const size = getNodeSize(node as ReturnType<typeof makeItemNode>)
    expect(size.w).toBe(350)
    expect(size.h).toBe(180)
  })
})

// ── getClosestHandles ──────────────────────────────────────────────────

describe('getClosestHandles', () => {
  const size = { w: 100, h: 50 }

  it('routes right→left when target is to the right', () => {
    const result = getClosestHandles({ x: 0, y: 0 }, size, { x: 300, y: 0 }, size)
    expect(result).toEqual({ sourceHandle: 'right', targetHandle: 'left' })
  })

  it('routes left→right when target is to the left', () => {
    const result = getClosestHandles({ x: 300, y: 0 }, size, { x: 0, y: 0 }, size)
    expect(result).toEqual({ sourceHandle: 'left', targetHandle: 'right' })
  })

  it('routes bottom→top when target is below', () => {
    const result = getClosestHandles({ x: 0, y: 0 }, size, { x: 0, y: 300 }, size)
    expect(result).toEqual({ sourceHandle: 'bottom', targetHandle: 'top' })
  })

  it('routes top→bottom when target is above', () => {
    const result = getClosestHandles({ x: 0, y: 300 }, size, { x: 0, y: 0 }, size)
    expect(result).toEqual({ sourceHandle: 'top', targetHandle: 'bottom' })
  })

  it('prefers horizontal when dx > dy', () => {
    const result = getClosestHandles({ x: 0, y: 0 }, size, { x: 200, y: 50 }, size)
    expect(result.sourceHandle).toBe('right')
  })

  it('prefers vertical when dy > dx', () => {
    const result = getClosestHandles({ x: 0, y: 0 }, size, { x: 50, y: 200 }, size)
    expect(result.sourceHandle).toBe('bottom')
  })
})

// ── rectsOverlap ───────────────────────────────────────────────────────

describe('rectsOverlap', () => {
  it('detects overlapping rectangles', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 50, y: 50, w: 100, h: 100 },
    )).toBe(true)
  })

  it('returns false for non-overlapping rectangles', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 200, y: 200, w: 100, h: 100 },
    )).toBe(false)
  })

  it('returns false for edge-touching rectangles', () => {
    expect(rectsOverlap(
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 100, y: 0, w: 100, h: 100 },
    )).toBe(false)
  })
})

// ── findNonOverlappingPosition ─────────────────────────────────────────

describe('findNonOverlappingPosition', () => {
  it('returns desired position when no nodes exist', () => {
    const pos = findNonOverlappingPosition({ x: 50, y: 50 }, { w: 100, h: 50 }, [])
    expect(pos).toEqual({ x: 50, y: 50 })
  })

  it('avoids collision with existing node', () => {
    const existing = makeItemNode('x', { position: { x: 50, y: 50 }, style: { width: 100, height: 50 } })
    const pos = findNonOverlappingPosition({ x: 50, y: 50 }, { w: 100, h: 50 }, [existing])
    // Should pick a different spot
    expect(pos.x !== 50 || pos.y !== 50).toBe(true)
  })
})

// ── buildAdjacency ─────────────────────────────────────────────────────

describe('buildAdjacency', () => {
  it('builds parent→children map from edges', () => {
    const edges = [
      makeEdge('fw-1', 'item-1'),
      makeEdge('fw-1', 'item-2'),
      makeEdge('item-1', 'item-3'),
    ]
    const { childrenOf } = buildAdjacency(edges)

    expect(childrenOf.get('fw-1')).toEqual(['item-1', 'item-2'])
    expect(childrenOf.get('item-1')).toEqual(['item-3'])
    expect(childrenOf.has('item-2')).toBe(false)
  })

  it('builds edge-by-source-target lookup', () => {
    const edges = [makeEdge('fw-1', 'item-1')]
    const { edgeBySourceTarget } = buildAdjacency(edges)
    expect(edgeBySourceTarget.get('fw-1->item-1')).toBeDefined()
    expect(edgeBySourceTarget.get('item-1->fw-1')).toBeUndefined()
  })

  it('handles empty edges', () => {
    const { childrenOf } = buildAdjacency([])
    expect(childrenOf.size).toBe(0)
  })
})

// ── sortChildrenRecursive ──────────────────────────────────────────────

describe('sortChildrenRecursive', () => {
  it('sorts children by sequence number', () => {
    const edges = [
      makeSeqEdge('fw-1', 'item-C', 3),
      makeSeqEdge('fw-1', 'item-A', 1),
      makeSeqEdge('fw-1', 'item-B', 2),
    ]
    const { childrenOf, edgeBySourceTarget } = buildAdjacency(edges)
    sortChildrenRecursive('fw-1', childrenOf, edgeBySourceTarget)

    expect(childrenOf.get('fw-1')).toEqual(['item-A', 'item-B', 'item-C'])
  })

  it('sorts recursively through nested children', () => {
    const edges = [
      makeSeqEdge('fw-1', 'A', 1),
      makeSeqEdge('A', 'A2', 2),
      makeSeqEdge('A', 'A1', 1),
    ]
    const { childrenOf, edgeBySourceTarget } = buildAdjacency(edges)
    sortChildrenRecursive('fw-1', childrenOf, edgeBySourceTarget)

    expect(childrenOf.get('A')).toEqual(['A1', 'A2'])
  })
})
