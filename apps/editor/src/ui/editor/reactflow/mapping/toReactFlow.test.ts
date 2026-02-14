import { describe, it, expect } from 'vitest'
import { toReactFlowGraph } from './toReactFlow'
import type { Framework, Item, Association } from '@/domain/framework/model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/reactflow/types'

function makeItem(id: string, statement: string): Item {
  return {
    id: id as unknown as ItemId,
    statement,
    type: 'Competency',
    metadata: {
      CFItemType: 'Competency',
      caseUri: `urn:case:item:${id}`,
      lastChangeDateTime: '2026-02-14T00:00:00.000Z',
    },
  }
}

describe('toReactFlowGraph', () => {
  it('does not recreate framework root starts edges for connected parentless items', () => {
    const fwId = 'fw-1'
    const itemA = makeItem('item-a', 'Item A')
    const itemB = makeItem('item-b', 'Item B')

    const assoc: Association = {
      id: 'assoc-1' as unknown as AssociationId,
      fromItemId: itemA.id,
      toItemId: itemB.id,
      // Non-hierarchical association (node is still "connected")
      associationType: 'isRelatedTo',
      metadata: {
        caseUri: 'urn:case:association:assoc-1',
        originUri: `urn:case:item:${String(itemA.id)}`,
        destinationUri: `urn:case:item:${String(itemB.id)}`,
      },
    }

    const framework: Framework = {
      id: fwId as unknown as FrameworkId,
      metadata: {
        title: 'Test Framework',
        creator: 'Test',
        caseUri: `urn:case:document:${fwId}`,
      },
      items: new Map([
        [itemA.id, itemA],
        [itemB.id, itemB],
      ]),
      associations: new Map([[assoc.id, assoc]]),
      status: 'Draft',
    }

    const graph = toReactFlowGraph({ framework })

    const startsEdges = graph.edges.filter((e) => e.data?.associationType === FRAMEWORK_ROOT_ASSOCIATION_TYPE)
    expect(startsEdges).toHaveLength(0)

    // The non-hierarchical edge should still be projected normally.
    expect(graph.edges.some((e) => e.id === String(assoc.id) && e.source === 'item-a' && e.target === 'item-b')).toBe(true)
  })
})

