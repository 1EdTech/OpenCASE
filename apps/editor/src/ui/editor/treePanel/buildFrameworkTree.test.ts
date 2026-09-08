import { describe, it, expect } from 'vitest'
import { buildFrameworkTree } from '@/domain/framework/treeDerivation'
import type { CFItem } from '@/domain/case/types'
import type { FrameworkEdgeRecord } from '@/domain/framework/treeDerivation'

function makeItem(id: string, overrides: Partial<CFItem> = {}): CFItem {
  return {
    identifier: id,
    uri: `urn:case:item:${id}`,
    fullStatement: `Statement for ${id}`,
    lastChangeDateTime: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function edge(parentId: string, childId: string, seq?: number): FrameworkEdgeRecord {
  return { parentId, childId, sequenceNumber: seq }
}

describe('buildFrameworkTree', () => {
  it('returns empty array when cfItems is empty', () => {
    expect(buildFrameworkTree([], [], [])).toEqual([])
  })

  it('returns empty array when rootItemIds is empty', () => {
    const items = [makeItem('a')]
    expect(buildFrameworkTree(items, [], [])).toEqual([])
  })

  it('returns root items for a flat list', () => {
    const items = [makeItem('a'), makeItem('b'), makeItem('c')]
    const tree = buildFrameworkTree(items, [], ['a', 'b', 'c'])
    expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('root nodes have depth 0', () => {
    const items = [makeItem('a'), makeItem('b')]
    const tree = buildFrameworkTree(items, [], ['a', 'b'])
    for (const node of tree) expect(node.depth).toBe(0)
  })

  it('root nodes have no children when no edges', () => {
    const items = [makeItem('a'), makeItem('b')]
    const tree = buildFrameworkTree(items, [], ['a', 'b'])
    for (const node of tree) expect(node.children).toHaveLength(0)
  })

  it('builds nested children', () => {
    const items = [makeItem('a'), makeItem('b'), makeItem('c')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const tree = buildFrameworkTree(items, edges, ['a'])
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('a')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].id).toBe('b')
    expect(tree[0].children[0].depth).toBe(1)
    expect(tree[0].children[0].children[0].id).toBe('c')
    expect(tree[0].children[0].children[0].depth).toBe(2)
  })

  it('includes cfItem data on each node', () => {
    const items = [makeItem('a', { humanCodingScheme: 'A.1' })]
    const tree = buildFrameworkTree(items, [], ['a'])
    expect(tree[0].cfItem.humanCodingScheme).toBe('A.1')
    expect(tree[0].cfItem.fullStatement).toBe('Statement for a')
  })

  it('respects the order of rootItemIds', () => {
    const items = [makeItem('a'), makeItem('b'), makeItem('c')]
    const tree = buildFrameworkTree(items, [], ['c', 'a', 'b'])
    expect(tree.map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('sorts children by sequence number', () => {
    const items = [makeItem('parent'), makeItem('x'), makeItem('y'), makeItem('z')]
    const edges = [edge('parent', 'z', 1), edge('parent', 'x', 2), edge('parent', 'y', 3)]
    const tree = buildFrameworkTree(items, edges, ['parent'])
    expect(tree[0].children.map((n) => n.id)).toEqual(['z', 'x', 'y'])
  })

  it('places children without sequence number after sequenced ones', () => {
    const items = [makeItem('parent'), makeItem('a'), makeItem('b')]
    const edges = [edge('parent', 'b'), edge('parent', 'a', 1)]
    const tree = buildFrameworkTree(items, edges, ['parent'])
    expect(tree[0].children.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('skips unknown item IDs silently', () => {
    const items = [makeItem('a')]
    const tree = buildFrameworkTree(items, [], ['a', 'unknown'])
    expect(tree.map((n) => n.id)).toEqual(['a'])
  })
})
