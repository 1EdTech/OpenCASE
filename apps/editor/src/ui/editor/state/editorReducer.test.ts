import { describe, it, expect } from 'vitest'
import { editorReducer, type EditorState } from './editorReducer'
import { makeFrameworkNode, makeItemNode, makeEdge, makeSeqEdge } from '@/__tests__/fixtures'

// ── Helpers ────────────────────────────────────────────────────────────

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    nodes: [makeFrameworkNode(), makeItemNode('item-1'), makeItemNode('item-2')],
    edges: [makeEdge('fw-1', 'item-1'), makeEdge('fw-1', 'item-2')],
    selectedNodeId: null,
    selectedEdgeId: null,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    layoutVersion: 0,
    dirty: false,
    ...overrides,
  }
}

// ── Selection ──────────────────────────────────────────────────────────

describe('selection actions', () => {
  it('selection/setNode sets selectedNodeId and clears selectedEdgeId', () => {
    const state = makeState({ selectedEdgeId: 'e_1' })
    const next = editorReducer(state, { type: 'selection/setNode', nodeId: 'item-1' })
    expect(next.selectedNodeId).toBe('item-1')
    expect(next.selectedEdgeId).toBeNull()
  })

  it('selection/setEdge sets selectedEdgeId and clears selectedNodeId', () => {
    const state = makeState({ selectedNodeId: 'item-1' })
    const next = editorReducer(state, { type: 'selection/setEdge', edgeId: 'e_fw-1_item-1' })
    expect(next.selectedEdgeId).toBe('e_fw-1_item-1')
    expect(next.selectedNodeId).toBeNull()
  })

  it('selection/clear clears both selections and deselects all nodes/edges', () => {
    const state = makeState({ selectedNodeId: 'item-1', selectedEdgeId: 'e_1' })
    const next = editorReducer(state, { type: 'selection/clear' })
    expect(next.selectedNodeId).toBeNull()
    expect(next.selectedEdgeId).toBeNull()
    expect(next.nodes.every((n) => !n.selected)).toBe(true)
    expect(next.edges.every((e) => !e.selected)).toBe(true)
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
  it('replaces the entire graph and resets selection/layout/dirty', () => {
    const state = makeState({ selectedNodeId: 'item-1', dirty: true, layoutVersion: 5 })
    const newNodes = [makeFrameworkNode(), makeItemNode('new-item')]
    const newEdges = [makeEdge('fw-1', 'new-item')]

    const next = editorReducer(state, {
      type: 'graph/load',
      graph: { nodes: newNodes, edges: newEdges },
    })

    expect(next.nodes).toEqual(newNodes)
    expect(next.edges).toEqual(newEdges)
    expect(next.selectedNodeId).toBeNull()
    expect(next.selectedEdgeId).toBeNull()
    expect(next.layoutVersion).toBe(0)
    expect(next.dirty).toBe(false)
  })
})

// ── Layout actions ─────────────────────────────────────────────────────

describe('layout actions', () => {
  it('layout/apply updates node positions and increments layoutVersion', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'layout/apply',
      positions: { 'item-1': { x: 100, y: 200 } },
    })

    const item = next.nodes.find((n) => n.id === 'item-1')
    expect(item?.position).toEqual({ x: 100, y: 200 })
    expect(next.layoutVersion).toBe(state.layoutVersion + 1)
    // layout/apply does NOT mark dirty (it's for auto-layout)
    expect(next.dirty).toBe(false)
  })

  it('layout/applyHierarchy updates positions, handles, and marks dirty', () => {
    const state = makeState()
    const edgeId = state.edges[0].id

    const next = editorReducer(state, {
      type: 'layout/applyHierarchy',
      positions: {
        'fw-1': { x: 0, y: 96 },
        'item-1': { x: 260, y: 280 },
      },
      edgeHandles: {
        [edgeId]: {
          sourceHandle: 'bottom',
          targetHandle: 'left',
          edgeType: 'smoothstep',
          labelPosition: 'target',
        },
      },
    })

    expect(next.nodes.find((n) => n.id === 'item-1')?.position).toEqual({ x: 260, y: 280 })
    const edge = next.edges.find((e) => e.id === edgeId)
    expect(edge?.sourceHandle).toBe('bottom')
    expect(edge?.targetHandle).toBe('left')
    expect(edge?.data?.edgeType).toBe('smoothstep')
    expect(next.dirty).toBe(true)
    expect(next.layoutVersion).toBe(state.layoutVersion + 1)
  })
})

// ── Edge connect ───────────────────────────────────────────────────────

describe('edges/connect', () => {
  it('creates a new edge between two items', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'edges/connect',
      connection: { source: 'item-1', target: 'item-2', sourceHandle: null, targetHandle: null },
    })

    expect(next.edges.length).toBe(state.edges.length + 1)
    const newEdge = next.edges[next.edges.length - 1]
    expect(newEdge.source).toBe('item-1')
    expect(newEdge.target).toBe('item-2')
    expect(newEdge.data?.associationType).toBe('isChildOf')
    expect(next.dirty).toBe(true)
  })

  it('creates __startsFrom edge when connecting framework to item', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'edges/connect',
      connection: { source: 'fw-1', target: 'item-1', sourceHandle: null, targetHandle: null },
    })

    const newEdge = next.edges[next.edges.length - 1]
    expect(newEdge.data?.associationType).toBe('__startsFrom')
  })

  it('swaps source/target to keep framework as source', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'edges/connect',
      connection: { source: 'item-1', target: 'fw-1', sourceHandle: null, targetHandle: null },
    })

    const newEdge = next.edges[next.edges.length - 1]
    expect(newEdge.source).toBe('fw-1')
    expect(newEdge.target).toBe('item-1')
  })

  it('rejects connection with null source', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'edges/connect',
      connection: { source: null, target: 'item-1', sourceHandle: null, targetHandle: null },
    })
    expect(next).toBe(state)
  })
})

// ── Node CRUD ──────────────────────────────────────────────────────────

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

describe('node/addDetachedItem', () => {
  it('adds a detached item node (no edge)', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'node/addDetachedItem',
      nodeId: 'detached-1',
      cfItem: { identifier: 'detached-1', uri: '', fullStatement: 'Detached', lastChangeDateTime: '' },
    })

    expect(next.nodes.length).toBe(state.nodes.length + 1)
    expect(next.edges.length).toBe(state.edges.length) // no new edge
    const node = next.nodes.find((n) => n.id === 'detached-1')
    expect(node?.type).toBe('caseItemNode')
    expect(next.selectedNodeId).toBe('detached-1')
    expect(next.dirty).toBe(true)
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

describe('edge/updateData', () => {
  it('updates association type on an edge', () => {
    const state = makeState()
    const edgeId = state.edges[0].id
    const next = editorReducer(state, {
      type: 'edge/updateData',
      edgeId,
      patch: { associationType: 'isPeerOf' },
    })

    const edge = next.edges.find((e) => e.id === edgeId)
    expect(edge?.data?.associationType).toBe('isPeerOf')
    expect(next.dirty).toBe(true)
  })
})

// ── Edge flip ──────────────────────────────────────────────────────────

describe('edge/flip', () => {
  it('swaps source and target', () => {
    const state = makeState()
    const edgeId = state.edges[0].id
    const original = state.edges[0]

    const next = editorReducer(state, { type: 'edge/flip', edgeId })
    const flipped = next.edges.find((e) => e.id === edgeId)

    expect(flipped?.source).toBe(original.target)
    expect(flipped?.target).toBe(original.source)
    expect(next.dirty).toBe(true)
  })
})

// ── Graph delete ───────────────────────────────────────────────────────

describe('graph/delete', () => {
  it('removes specified nodes and their connected edges', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'graph/delete',
      nodeIds: ['item-1'],
      edgeIds: [],
      reattachChildren: false,
    })

    expect(next.nodes.find((n) => n.id === 'item-1')).toBeUndefined()
    // Edge from fw-1 to item-1 should be removed
    expect(next.edges.find((e) => e.target === 'item-1')).toBeUndefined()
    // Edge to item-2 should remain
    expect(next.edges.find((e) => e.target === 'item-2')).toBeDefined()
    expect(next.dirty).toBe(true)
  })

  it('removes specified edges without removing nodes', () => {
    const state = makeState()
    const edgeId = state.edges[0].id
    const next = editorReducer(state, {
      type: 'graph/delete',
      nodeIds: [],
      edgeIds: [edgeId],
      reattachChildren: false,
    })

    expect(next.nodes.length).toBe(state.nodes.length) // no nodes removed
    expect(next.edges.find((e) => e.id === edgeId)).toBeUndefined()
    expect(next.dirty).toBe(true)
  })

  it('clears selection if selected node is deleted', () => {
    const state = makeState({ selectedNodeId: 'item-1' })
    const next = editorReducer(state, {
      type: 'graph/delete',
      nodeIds: ['item-1'],
      edgeIds: [],
      reattachChildren: false,
    })

    expect(next.selectedNodeId).toBeNull()
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
