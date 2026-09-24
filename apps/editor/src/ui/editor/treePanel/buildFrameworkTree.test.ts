import { describe, it, expect } from 'vitest'
import { buildFrameworkTree } from '@/domain/framework/treeDerivation'
import type { FrameworkEdgeRecord } from '@/domain/framework/treeDerivation'

function edge(parentId: string, childId: string, seq?: number): FrameworkEdgeRecord {
  return { parentId, childId, sequenceNumber: seq }
}

describe('buildFrameworkTree', () => {
  it('returns empty array when rootItemIds is empty', () => {
    expect(buildFrameworkTree([], [])).toEqual([])
  })

  it('returns root items for a flat list', () => {
    const tree = buildFrameworkTree([], ['a', 'b', 'c'])
    expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('root nodes have depth 0', () => {
    const tree = buildFrameworkTree([], ['a', 'b'])
    for (const node of tree) expect(node.depth).toBe(0)
  })

  it('root nodes have no children when no edges', () => {
    const tree = buildFrameworkTree([], ['a', 'b'])
    for (const node of tree) expect(node.children).toHaveLength(0)
  })

  it('builds nested children', () => {
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const tree = buildFrameworkTree(edges, ['a'])
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('a')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].id).toBe('b')
    expect(tree[0].children[0].depth).toBe(1)
    expect(tree[0].children[0].children[0].id).toBe('c')
    expect(tree[0].children[0].children[0].depth).toBe(2)
  })

  it('respects the order of rootItemIds', () => {
    const tree = buildFrameworkTree([], ['c', 'a', 'b'])
    expect(tree.map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('sorts children by sequence number', () => {
    const edges = [edge('parent', 'z', 1), edge('parent', 'x', 2), edge('parent', 'y', 3)]
    const tree = buildFrameworkTree(edges, ['parent'])
    expect(tree[0].children.map((n) => n.id)).toEqual(['z', 'x', 'y'])
  })

  it('places children without sequence number after sequenced ones', () => {
    const edges = [edge('parent', 'b'), edge('parent', 'a', 1)]
    const tree = buildFrameworkTree(edges, ['parent'])
    expect(tree[0].children.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('does not include ids not present in rootItemIds/edges, but does not require a separate item list either', () => {
    // Shape is derived purely from edges/rootItemIds now — content existence
    // is validated separately by callers (via cfItemsById lookups), not here.
    const tree = buildFrameworkTree([], ['a'])
    expect(tree.map((n) => n.id)).toEqual(['a'])
  })

  it('guards against cyclic edges instead of recursing forever', () => {
    // Malformed/cyclic hierarchical data (e.g. a <-> b) must not cause
    // unbounded recursion ("Maximum Call Stack Size Exceeded").
    const edges = [edge('a', 'b'), edge('b', 'a')]
    const tree = buildFrameworkTree(edges, ['a'])
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('a')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].id).toBe('b')
    // b's cyclic edge back to a is dropped, not followed.
    expect(tree[0].children[0].children).toHaveLength(0)
  })
})
