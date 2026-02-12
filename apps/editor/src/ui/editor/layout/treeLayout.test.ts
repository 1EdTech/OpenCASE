import { describe, it, expect } from 'vitest'
import { computeTreeLayout } from './treeLayout'
import { makeDeepTreeGraph, makeEmptyGraph, makeFlatHierarchyGraph, makeStarGraph } from '@/__tests__/fixtures'
import { HEADER_SAFE_Y } from '@/ui/editor/state/helpers/nodeGeometry'

describe('computeTreeLayout', () => {
  it('positions framework at top center', () => {
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeTreeLayout(graph.nodes, graph.edges)

    expect(positions['fw-1']).toBeDefined()
    expect(positions['fw-1'].y).toBe(HEADER_SAFE_Y)
  })

  it('positions all items below the framework', () => {
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeTreeLayout(graph.nodes, graph.edges)

    for (const id of ['item-1', 'item-2', 'item-3']) {
      expect(positions[id]).toBeDefined()
      expect(positions[id].y).toBeGreaterThan(positions['fw-1'].y)
    }
  })

  it('spreads sibling items horizontally', () => {
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeTreeLayout(graph.nodes, graph.edges)

    const xs = ['item-1', 'item-2', 'item-3'].map((id) => positions[id].x)
    // Each sibling should be at a different X
    expect(new Set(xs).size).toBe(3)
    // Sorted left to right
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('places children below their parent in a deep tree', () => {
    const graph = makeDeepTreeGraph(3)
    const { positions } = computeTreeLayout(graph.nodes, graph.edges)

    expect(positions['item-1'].y).toBeGreaterThan(positions['fw-1'].y)
    expect(positions['item-2'].y).toBeGreaterThan(positions['item-1'].y)
    expect(positions['item-3'].y).toBeGreaterThan(positions['item-2'].y)
  })

  it('computes edge handles for every edge', () => {
    const graph = makeStarGraph()
    const { edgeHandles } = computeTreeLayout(graph.nodes, graph.edges)

    for (const e of graph.edges) {
      expect(edgeHandles[e.id]).toBeDefined()
      expect(edgeHandles[e.id].sourceHandle).toBeDefined()
      expect(edgeHandles[e.id].targetHandle).toBeDefined()
    }
  })

  it('returns empty result when no framework node', () => {
    const { positions } = computeTreeLayout([], [])
    expect(Object.keys(positions)).toHaveLength(0)
  })

  it('handles framework with no items', () => {
    const graph = makeEmptyGraph()
    const { positions } = computeTreeLayout(graph.nodes, graph.edges)
    expect(positions['fw-1']).toBeDefined()
    expect(Object.keys(positions)).toHaveLength(1)
  })
})
