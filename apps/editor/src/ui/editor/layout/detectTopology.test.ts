import { describe, it, expect } from 'vitest'
import { detectTopology } from './detectTopology'
import {
  makeDeepTreeGraph,
  makeEmptyGraph,
  makeFlatHierarchyGraph,
  makeStarGraph,
} from '@/__tests__/fixtures'

describe('detectTopology', () => {
  it('returns "hierarchy" for a flat list of items under the framework', () => {
    const graph = makeFlatHierarchyGraph(5)
    expect(detectTopology(graph)).toBe('hierarchy')
  })

  it('returns "star" when multiple start nodes have children', () => {
    const graph = makeStarGraph()
    expect(detectTopology(graph)).toBe('star')
  })

  it('returns "tree" for a deep chain (single start node with children)', () => {
    const graph = makeDeepTreeGraph(4)
    // One start node (item-1) has children, but only 1 start node → not star
    // item-to-item edges exist → not hierarchy
    expect(detectTopology(graph)).toBe('tree')
  })

  it('returns "tree" for an empty graph (no framework node)', () => {
    const graph = { nodes: [], edges: [] }
    expect(detectTopology(graph)).toBe('tree')
  })

  it('returns "tree" for a graph with only a framework and no children', () => {
    const graph = makeEmptyGraph()
    expect(detectTopology(graph)).toBe('tree')
  })

  it('returns "hierarchy" for single item with no children', () => {
    const graph = makeFlatHierarchyGraph(1)
    expect(detectTopology(graph)).toBe('hierarchy')
  })
})
