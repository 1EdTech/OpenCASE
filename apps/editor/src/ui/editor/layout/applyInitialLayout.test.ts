import { describe, it, expect } from 'vitest'
import { applyInitialLayout } from './applyInitialLayout'
import { makeFlatHierarchyGraph, makeStarGraph, makeDeepTreeGraph } from '@/__tests__/fixtures'

describe('applyInitialLayout', () => {
  it('applies hierarchy layout and returns smoothstep edge type', () => {
    const graph = makeFlatHierarchyGraph(3)
    const result = applyInitialLayout(graph, 'hierarchy')

    expect(result.edgeType).toBe('smoothstep')
    // All nodes should have updated positions (not all at fallback)
    const positions = result.graph.nodes.map((n) => n.position)
    const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`))
    expect(uniquePositions.size).toBeGreaterThan(1) // Not all stacked at same position
  })

  it('applies star layout and returns default edge type', () => {
    const graph = makeStarGraph()
    const result = applyInitialLayout(graph, 'star')

    expect(result.edgeType).toBe('default')
    // All nodes should be positioned
    for (const node of result.graph.nodes) {
      expect(node.position).toBeDefined()
    }
  })

  it('applies tree layout and returns default edge type', () => {
    const graph = makeDeepTreeGraph(3)
    const result = applyInitialLayout(graph, 'tree')

    expect(result.edgeType).toBe('default')
    // Positions should vary
    const ys = result.graph.nodes.map((n) => n.position.y)
    const uniqueYs = new Set(ys)
    expect(uniqueYs.size).toBeGreaterThan(1)
  })

  it('updates edge sourceHandle/targetHandle in the graph', () => {
    const graph = makeFlatHierarchyGraph(2)
    const result = applyInitialLayout(graph, 'hierarchy')

    // Hierarchy sets bottom→left on framework-to-item edges
    const fwEdge = result.graph.edges.find((e) => e.source === 'fw-1')
    expect(fwEdge?.sourceHandle).toBe('bottom')
    expect(fwEdge?.targetHandle).toBe('left')
  })

  it('preserves node count and edge count', () => {
    const graph = makeStarGraph()
    const result = applyInitialLayout(graph, 'star')

    expect(result.graph.nodes).toHaveLength(graph.nodes.length)
    expect(result.graph.edges).toHaveLength(graph.edges.length)
  })
})
