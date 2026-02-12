import { describe, it, expect } from 'vitest'
import { computeStarLayout } from './starLayout'
import { makeEmptyGraph, makeFlatHierarchyGraph, makeStarGraph } from '@/__tests__/fixtures'
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from '@/ui/editor/state/helpers/nodeGeometry'

describe('computeStarLayout', () => {
  it('positions framework at the center', () => {
    const graph = makeStarGraph()
    const { positions } = computeStarLayout(graph.nodes, graph.edges)

    // Framework should be roughly centered at (0,0)
    const fw = positions['fw-1']
    expect(fw).toBeDefined()
    // Center of framework node should be near origin
    const fwCenterX = fw.x + DEFAULT_NODE_WIDTH / 2
    const fwCenterY = fw.y + DEFAULT_NODE_HEIGHT / 2
    expect(Math.abs(fwCenterX)).toBeLessThan(1)
    expect(Math.abs(fwCenterY)).toBeLessThan(1)
  })

  it('positions all nodes (no missing positions)', () => {
    const graph = makeStarGraph()
    const { positions } = computeStarLayout(graph.nodes, graph.edges)

    for (const node of graph.nodes) {
      expect(positions[node.id]).toBeDefined()
    }
  })

  it('places start nodes away from the center', () => {
    const graph = makeStarGraph()
    const { positions } = computeStarLayout(graph.nodes, graph.edges)

    const fw = positions['fw-1']
    const fwCenter = { x: fw.x + DEFAULT_NODE_WIDTH / 2, y: fw.y + DEFAULT_NODE_HEIGHT / 2 }

    for (const startId of ['branch-A', 'branch-B']) {
      const pos = positions[startId]
      const center = { x: pos.x + DEFAULT_NODE_WIDTH / 2, y: pos.y + DEFAULT_NODE_HEIGHT / 2 }
      const dist = Math.sqrt(
        (center.x - fwCenter.x) ** 2 + (center.y - fwCenter.y) ** 2,
      )
      expect(dist).toBeGreaterThan(100) // Significantly away from center
    }
  })

  it('places children further from center than their parents', () => {
    const graph = makeStarGraph()
    const { positions } = computeStarLayout(graph.nodes, graph.edges)

    const fw = positions['fw-1']
    const fwCenter = { x: fw.x + DEFAULT_NODE_WIDTH / 2, y: fw.y + DEFAULT_NODE_HEIGHT / 2 }

    const distFromCenter = (id: string) => {
      const pos = positions[id]
      const cx = pos.x + DEFAULT_NODE_WIDTH / 2
      const cy = pos.y + DEFAULT_NODE_HEIGHT / 2
      return Math.sqrt((cx - fwCenter.x) ** 2 + (cy - fwCenter.y) ** 2)
    }

    // Children should be further from center than their parent branch
    expect(distFromCenter('child-A1')).toBeGreaterThan(distFromCenter('branch-A'))
    expect(distFromCenter('child-B1')).toBeGreaterThan(distFromCenter('branch-B'))
  })

  it('computes edge handles for every edge', () => {
    const graph = makeStarGraph()
    const { edgeHandles } = computeStarLayout(graph.nodes, graph.edges)

    for (const e of graph.edges) {
      expect(edgeHandles[e.id]).toBeDefined()
      expect(edgeHandles[e.id].sourceHandle).toBeDefined()
      expect(edgeHandles[e.id].targetHandle).toBeDefined()
    }
  })

  it('clears per-edge type overrides (sets edgeType to undefined)', () => {
    const graph = makeStarGraph()
    const { edgeHandles } = computeStarLayout(graph.nodes, graph.edges)

    for (const e of graph.edges) {
      expect(edgeHandles[e.id].edgeType).toBeUndefined()
    }
  })

  it('falls back to tree layout when no start nodes exist', () => {
    const graph = makeEmptyGraph()
    const { positions } = computeStarLayout(graph.nodes, graph.edges)
    // Should still position the framework (tree fallback)
    expect(positions['fw-1']).toBeDefined()
  })

  it('falls back to tree layout for flat hierarchy (no start-node children)', () => {
    // A flat hierarchy has start nodes but computeStarLayout should handle it
    const graph = makeFlatHierarchyGraph(3)
    const { positions } = computeStarLayout(graph.nodes, graph.edges)

    // All nodes should be positioned
    for (const node of graph.nodes) {
      expect(positions[node.id]).toBeDefined()
    }
  })
})
