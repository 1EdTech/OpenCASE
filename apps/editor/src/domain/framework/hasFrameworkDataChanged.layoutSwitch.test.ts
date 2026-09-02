import { describe, it, expect } from 'vitest'
import { hasFrameworkDataChanged } from './hasFrameworkDataChanged'
import { toReactFlowGraph } from '@/ui/editor/reactflow/mapping/toReactFlow'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import { computeStarLayout } from '@/ui/editor/layout/starLayout'
import { computeHierarchyLayout } from '@/ui/editor/layout/hierarchyLayout'
import type { Framework, Item, Association } from './model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'
import type { CaseEditorEdge } from '@/ui/editor/reactflow/types'

function makeItem(id: string, statement: string): Item {
  return {
    id: id as unknown as ItemId,
    statement,
    type: 'Competency',
    metadata: { CFItemType: 'Competency', caseUri: `urn:case:item:${id}` },
  }
}

function makeFramework(): Framework {
  const fwId = 'fw-1'
  const itemA = makeItem('item-a', 'Item A')
  const itemB = makeItem('item-b', 'Item B')
  const assocA: Association = {
    id: 'assoc-a' as unknown as AssociationId,
    fromItemId: itemA.id,
    toItemId: fwId as unknown as ItemId,
    associationType: 'isChildOf',
    metadata: { caseUri: 'urn:case:association:assoc-a' },
  }
  const assocB: Association = {
    id: 'assoc-b' as unknown as AssociationId,
    fromItemId: itemB.id,
    toItemId: fwId as unknown as ItemId,
    associationType: 'isChildOf',
    metadata: { caseUri: 'urn:case:association:assoc-b' },
  }
  return {
    id: fwId as unknown as FrameworkId,
    metadata: { title: 'Test Framework', creator: 'Test', caseUri: `urn:case:document:${fwId}` },
    items: new Map([[itemA.id, itemA], [itemB.id, itemB]]),
    associations: new Map([[assocA.id, assocA], [assocB.id, assocB]]),
    status: 'Draft',
  }
}

// Mirrors editorReducer.ts's 'layout/applyHierarchy' case exactly.
function applyLayout(nodes: ReturnType<typeof toReactFlowGraph>['nodes'], edges: CaseEditorEdge[], result: ReturnType<typeof computeStarLayout>) {
  const nextNodes = nodes.map((n) => {
    const p = result.positions[n.id]
    return p ? { ...n, position: { x: p.x, y: p.y } } : n
  })
  const nextEdges = edges.map((e) => {
    const h = result.edgeHandles[e.id]
    if (!h) return e
    return { ...e, sourceHandle: h.sourceHandle, targetHandle: h.targetHandle, data: { ...e.data, edgeType: h.edgeType, labelPosition: h.labelPosition } }
  })
  return { nodes: nextNodes, edges: nextEdges }
}

describe('hasFrameworkDataChanged — switching layout algorithms', () => {
  it('does not register as a data (forking) change when switching from star to hierarchical layout', () => {
    const framework = makeFramework()
    const graph = toReactFlowGraph({ framework })

    // Baseline captured on mount, as EditorCanvas.tsx does.
    const baseline = fromEditorGraph({ graph }).framework

    // User clicks "Star layout".
    const starResult = computeStarLayout(graph.nodes, graph.edges)
    const afterStar = applyLayout(graph.nodes, graph.edges, starResult)

    // User then clicks "Hierarchical layout" — recomputes positions AND edge handles.
    const hierarchyResult = computeHierarchyLayout(afterStar.nodes, afterStar.edges)
    const afterHierarchy = applyLayout(afterStar.nodes, afterStar.edges, hierarchyResult)

    const current = fromEditorGraph({ graph: { nodes: afterHierarchy.nodes, edges: afterHierarchy.edges } }).framework

    expect(hasFrameworkDataChanged(baseline, current)).toBe(false)
  })
})
