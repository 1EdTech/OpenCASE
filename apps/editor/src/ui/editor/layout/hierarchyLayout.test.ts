import { describe, it, expect } from 'vitest'
import { computeHierarchyLayout } from './hierarchyLayout'
import { makeFlatHierarchyGraph, makeEmptyGraph } from '@/__tests__/fixtures'
import { HEADER_SAFE_Y, HIERARCHY_INDENT } from '@/ui/editor/state/helpers/nodeGeometry'

describe('computeHierarchyLayout', () => {
  it('places framework at top-left, items below and to the right', () => {
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeHierarchyLayout(graph.nodes, graph.edges)

    // Framework at top
    expect(positions['fw-1']).toBeDefined()
    expect(positions['fw-1'].y).toBe(HEADER_SAFE_Y)

    // Items exist and are below the framework
    expect(positions['item-1']).toBeDefined()
    expect(positions['item-1'].y).toBeGreaterThan(HEADER_SAFE_Y)

    // Items are indented to the right
    expect(positions['item-1'].x).toBeGreaterThan(0)
  })

  it('stacks items in sequence order vertically', () => {
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeHierarchyLayout(graph.nodes, graph.edges)

    expect(positions['item-1'].y).toBeLessThan(positions['item-2'].y)
    expect(positions['item-2'].y).toBeLessThan(positions['item-3'].y)
    // All items same X
    expect(positions['item-1'].x).toBe(positions['item-2'].x)
    expect(positions['item-2'].x).toBe(positions['item-3'].x)
  })

  it('sets edge handles to bottom→left with smoothstep', () => {
    const graph = makeFlatHierarchyGraph(2)
    const { edgeHandles } = computeHierarchyLayout(graph.nodes, graph.edges)

    const firstEdge = graph.edges[0]
    expect(edgeHandles[firstEdge.id]).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'left',
      edgeType: 'smoothstep',
      labelPosition: 'target',
    })
  })

  it('returns empty result for a graph with no framework node', () => {
    const { positions, edgeHandles } = computeHierarchyLayout([], [])
    expect(Object.keys(positions)).toHaveLength(0)
    expect(Object.keys(edgeHandles)).toHaveLength(0)
  })

  it('handles framework with no items', () => {
    const graph = makeEmptyGraph()
    const { positions } = computeHierarchyLayout(graph.nodes, graph.edges)
    expect(positions['fw-1']).toBeDefined()
    expect(Object.keys(positions)).toHaveLength(1) // only framework
  })
})
