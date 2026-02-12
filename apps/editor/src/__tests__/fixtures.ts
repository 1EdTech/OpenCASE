/**
 * Shared test fixtures for the CASE editor.
 *
 * Provides factory helpers to build mock nodes, edges, and graphs
 * representing common framework structures (flat hierarchy, star, tree).
 */
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'

// ── Node factories ─────────────────────────────────────────────────────

export function makeFrameworkNode(overrides: Partial<CaseFrameworkNodeType> = {}): CaseFrameworkNodeType {
  return {
    id: 'fw-1',
    type: 'caseFrameworkNode',
    position: { x: 0, y: 0 },
    data: {
      cfDocument: {
        identifier: 'fw-1',
        uri: 'urn:case:fw-1',
        title: 'Test Framework',
        lastChangeDateTime: '2025-01-01T00:00:00Z',
      },
    },
    ...overrides,
  } as CaseFrameworkNodeType
}

export function makeItemNode(id: string, overrides: Partial<CaseItemNodeType> = {}): CaseItemNodeType {
  return {
    id,
    type: 'caseItemNode',
    position: { x: 100, y: 100 },
    style: { width: 280, height: 140 },
    data: {
      cfItem: {
        identifier: id,
        uri: `urn:case:item:${id}`,
        fullStatement: `Statement for ${id}`,
        lastChangeDateTime: '2025-01-01T00:00:00Z',
      },
    },
    ...overrides,
  } as CaseItemNodeType
}

// ── Edge factory ───────────────────────────────────────────────────────

export function makeEdge(
  source: string,
  target: string,
  overrides: Partial<CaseEditorEdge> = {},
): CaseEditorEdge {
  return {
    id: `e_${source}_${target}`,
    source,
    target,
    data: {
      isHierarchical: true,
      associationType: source.startsWith('fw') ? '__startsFrom' : 'isChildOf',
    },
    ...overrides,
  }
}

/** Make an edge with a sequence number. */
export function makeSeqEdge(
  source: string,
  target: string,
  seq: number,
  overrides: Partial<CaseEditorEdge> = {},
): CaseEditorEdge {
  return makeEdge(source, target, {
    data: {
      isHierarchical: true,
      associationType: source.startsWith('fw') ? '__startsFrom' : 'isChildOf',
      sequenceNumber: seq,
    },
    ...overrides,
  })
}

// ── Graph factories ────────────────────────────────────────────────────

/**
 * Flat hierarchy: framework → N items, no item-to-item edges.
 *
 *   fw-1
 *    ├─ item-1
 *    ├─ item-2
 *    └─ item-3
 */
export function makeFlatHierarchyGraph(itemCount = 3): EditorGraph {
  const fw = makeFrameworkNode()
  const items = Array.from({ length: itemCount }, (_, i) => makeItemNode(`item-${i + 1}`))
  const edges = items.map((item, i) => makeSeqEdge('fw-1', item.id, i + 1))
  return { nodes: [fw, ...items], edges }
}

/**
 * Star/multi-branch: framework → start nodes, each with children.
 *
 *   fw-1
 *    ├─ branch-A
 *    │   ├─ child-A1
 *    │   └─ child-A2
 *    └─ branch-B
 *        └─ child-B1
 */
export function makeStarGraph(): EditorGraph {
  const fw = makeFrameworkNode()
  const branchA = makeItemNode('branch-A')
  const branchB = makeItemNode('branch-B')
  const childA1 = makeItemNode('child-A1')
  const childA2 = makeItemNode('child-A2')
  const childB1 = makeItemNode('child-B1')

  const edges: CaseEditorEdge[] = [
    makeSeqEdge('fw-1', 'branch-A', 1),
    makeSeqEdge('fw-1', 'branch-B', 2),
    makeEdge('branch-A', 'child-A1'),
    makeEdge('branch-A', 'child-A2'),
    makeEdge('branch-B', 'child-B1'),
  ]

  return { nodes: [fw, branchA, branchB, childA1, childA2, childB1], edges }
}

/**
 * Deep tree: framework → single chain of depth N.
 *
 *   fw-1 → item-1 → item-2 → item-3
 */
export function makeDeepTreeGraph(depth = 3): EditorGraph {
  const fw = makeFrameworkNode()
  const items: CaseItemNodeType[] = []
  const edges: CaseEditorEdge[] = []

  let parentId = 'fw-1'
  for (let i = 1; i <= depth; i++) {
    const id = `item-${i}`
    items.push(makeItemNode(id))
    edges.push(makeEdge(parentId, id))
    parentId = id
  }

  return { nodes: [fw, ...items], edges }
}

/**
 * Empty graph: just a framework node, no items.
 */
export function makeEmptyGraph(): EditorGraph {
  return { nodes: [makeFrameworkNode()], edges: [] }
}
