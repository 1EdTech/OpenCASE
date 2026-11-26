import { describe, it, expect } from 'vitest'
import { editorReducer, type EditorState } from './editorReducer'
import { makeFrameworkNode, makeItemNode, makeEdge } from '@/__tests__/fixtures'
import { NO_INLINE_ALIGNMENT_EDITS } from '@/domain/framework/inlineAlignmentEdits'
import type { Association } from '@/domain/framework/model/types'

// ── Helpers ────────────────────────────────────────────────────────────

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    nodes: [makeFrameworkNode(), makeItemNode('item-1'), makeItemNode('item-2')],
    edges: [makeEdge('fw-1', 'item-1'), makeEdge('fw-1', 'item-2')],
    inlineAlignmentEdits: NO_INLINE_ALIGNMENT_EDITS,
    selectedNodeId: null,
    dirty: false,
    ...overrides,
  }
}

// ── Selection ──────────────────────────────────────────────────────────

describe('selection actions', () => {
  it('selection/setNode sets selectedNodeId', () => {
    const next = editorReducer(makeState(), { type: 'selection/setNode', nodeId: 'item-1' })
    expect(next.selectedNodeId).toBe('item-1')
  })

  it('selection/setNode returns the same state when the node is already selected', () => {
    const state = makeState({ selectedNodeId: 'item-1' })
    expect(editorReducer(state, { type: 'selection/setNode', nodeId: 'item-1' })).toBe(state)
  })

  it('selection/clear clears the selection', () => {
    const next = editorReducer(makeState({ selectedNodeId: 'item-1' }), { type: 'selection/clear' })
    expect(next.selectedNodeId).toBeNull()
  })
})

// ── Dirty flag ─────────────────────────────────────────────────────────

describe('dirty flag actions', () => {
  it('dirty/mark sets dirty to true', () => {
    const state = makeState({ dirty: false })
    const next = editorReducer(state, { type: 'dirty/mark' })
    expect(next.dirty).toBe(true)
  })

  it('dirty/mark returns same state when already dirty', () => {
    const state = makeState({ dirty: true })
    const next = editorReducer(state, { type: 'dirty/mark' })
    expect(next).toBe(state) // reference equality — no new object
  })

  it('dirty/clear resets dirty to false', () => {
    const state = makeState({ dirty: true })
    const next = editorReducer(state, { type: 'dirty/clear' })
    expect(next.dirty).toBe(false)
  })
})

// ── Graph load ─────────────────────────────────────────────────────────

describe('graph/load', () => {
  it('replaces the entire graph and resets selection/dirty', () => {
    const state = makeState({ selectedNodeId: 'item-1', dirty: true })
    const newNodes = [makeFrameworkNode(), makeItemNode('new-item')]
    const newEdges = [makeEdge('fw-1', 'new-item')]

    const next = editorReducer(state, {
      type: 'graph/load',
      graph: { nodes: newNodes, edges: newEdges },
    })

    expect(next.nodes).toEqual(newNodes)
    expect(next.edges).toEqual(newEdges)
    expect(next.selectedNodeId).toBeNull()
    expect(next.dirty).toBe(false)
  })
})

describe('node/addChild', () => {
  it('adds a child node and connecting edge', () => {
    const state = makeState()
    const cfItem = {
      identifier: 'child-1',
      uri: 'urn:case:child-1',
      fullStatement: 'Test child',
      lastChangeDateTime: new Date().toISOString(),
    }

    const next = editorReducer(state, {
      type: 'node/addChild',
      parentId: 'item-1',
      childId: 'child-1',
      cfItem,
    })

    expect(next.nodes.length).toBe(state.nodes.length + 1)
    const child = next.nodes.find((n) => n.id === 'child-1')
    expect(child).toBeDefined()
    expect(child?.type).toBe('caseItemNode')

    // Edge should connect parent to child
    const edge = next.edges.find((e) => e.source === 'item-1' && e.target === 'child-1')
    expect(edge).toBeDefined()
    expect(next.selectedNodeId).toBe('child-1')
    expect(next.dirty).toBe(true)
  })

  it('returns unchanged state when parent does not exist', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'node/addChild',
      parentId: 'nonexistent',
      childId: 'child-1',
      cfItem: { identifier: 'x', uri: '', fullStatement: 'x', lastChangeDateTime: '' },
    })
    expect(next).toBe(state)
  })
})

// ── Node/edge data updates ─────────────────────────────────────────────

describe('node/updateData', () => {
  it('updates cfItem data on an item node', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'node/updateData',
      nodeId: 'item-1',
      patch: { cfItem: { fullStatement: 'Updated statement' } },
    })

    const item = next.nodes.find((n) => n.id === 'item-1')
    expect((item?.data as { cfItem: { fullStatement: string } }).cfItem.fullStatement).toBe('Updated statement')
    expect(next.dirty).toBe(true)
  })
})

// ── Referential identity (perf regression guards) ──────────────────────
//
// These guard against re-introducing full-array reallocation for actions
// that should only touch a specific node/edge — see POR-736 phase 2.
// Downstream memoization (EditorContext's `cfItems`, Tree Panel's
// `cfItemsById`) relies on untouched entries keeping their exact object
// reference across a dispatch.

describe('referential identity', () => {
  it('node/updateData on one item leaves other nodes untouched', () => {
    const state = makeState()
    const otherNode = state.nodes.find((n) => n.id === 'item-2')
    const next = editorReducer(state, {
      type: 'node/updateData',
      nodeId: 'item-1',
      patch: { cfItem: { fullStatement: 'Updated' } },
    })
    expect(next.nodes.find((n) => n.id === 'item-2')).toBe(otherNode)
  })

  it('node/addChild leaves existing nodes and edges untouched', () => {
    const state = makeState({ selectedNodeId: 'item-2' })
    const untouchedItem = state.nodes.find((n) => n.id === 'item-1')
    const untouchedEdgeToItem1 = state.edges.find((e) => e.target === 'item-1')

    const next = editorReducer(state, {
      type: 'node/addChild',
      parentId: 'item-1',
      childId: 'child-1',
      cfItem: { identifier: 'child-1', uri: '', fullStatement: 'Child', lastChangeDateTime: '' },
    })

    expect(next.nodes.find((n) => n.id === 'item-1')).toBe(untouchedItem)
    expect(next.edges.find((e) => e.target === 'item-1')).toBe(untouchedEdgeToItem1)
  })
})

// ── Default / unknown action ───────────────────────────────────────────

describe('unknown action', () => {
  it('returns state unchanged for unknown action type', () => {
    const state = makeState()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = editorReducer(state, { type: 'unknown/action' } as any)
    expect(next).toBe(state)
  })
})

describe('inline alignment edits', () => {
  const association = {
    id: 'assoc-new' as Association['id'],
    fromItemId: 'item-1' as Association['fromItemId'],
    toItemId: 'other-item' as Association['toItemId'],
    associationType: 'isRelatedTo' as Association['associationType'],
  }

  it('records an added inline alignment and marks the framework dirty', () => {
    const next = editorReducer(makeState(), { type: 'inlineAlignment/add', association })
    expect(next.inlineAlignmentEdits.added).toEqual([association])
    expect(next.dirty).toBe(true)
  })

  it('records removals and type changes as dirty edits', () => {
    let next = editorReducer(makeState(), { type: 'inlineAlignment/updateType', associationId: 'a-1', associationType: 'exactMatchOf' })
    next = editorReducer(next, { type: 'inlineAlignment/remove', associationId: 'a-2' })
    expect(next.inlineAlignmentEdits).toEqual({ added: [], removedIds: ['a-2'], typeChanges: { 'a-1': 'exactMatchOf' } })
    expect(next.dirty).toBe(true)
  })

  it('clears the edits once they are saved, without touching the dirty flag', () => {
    const edited = editorReducer(makeState(), { type: 'inlineAlignment/add', association })
    const cleared = editorReducer({ ...edited, dirty: false }, { type: 'inlineAlignment/clearEdits' })
    expect(cleared.inlineAlignmentEdits).toEqual(NO_INLINE_ALIGNMENT_EDITS)
    expect(cleared.dirty).toBe(false)
  })

  it('drops pending edits when another graph is loaded', () => {
    const edited = editorReducer(makeState(), { type: 'inlineAlignment/add', association })
    const loaded = editorReducer(edited, { type: 'graph/load', graph: { nodes: [], edges: [] } })
    expect(loaded.inlineAlignmentEdits).toEqual(NO_INLINE_ALIGNMENT_EDITS)
  })
})
