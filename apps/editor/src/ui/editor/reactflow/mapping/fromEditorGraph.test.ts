import { describe, it, expect } from 'vitest'
import { toReactFlowGraph } from './toReactFlow'
import { fromEditorGraph } from './fromEditorGraph'
import type { Framework, Item, Association } from '@/domain/framework/model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'

function makeItem(id: string, statement: string, caseUri: string): Item {
  return {
    id: id as unknown as ItemId,
    statement,
    type: 'Competency',
    metadata: {
      CFItemType: 'Competency',
      caseUri,
      lastChangeDateTime: '2026-02-14T00:00:00.000Z',
    },
  }
}

describe('fromEditorGraph — association node-reference uri round-trip', () => {
  const fwId = 'fw-1'
  const foreignItemAUri = 'https://source.example.org/ims/case/v1p1/CFItems/item-a'
  const foreignItemBUri = 'https://source.example.org/ims/case/v1p1/CFItems/item-b'
  const foreignDocUri = 'https://source.example.org/ims/case/v1p1/CFDocuments/fw-1'

  it('preserves a real (foreign) originUri/destinationUri on an item-to-item association through a load/save cycle with no edits', () => {
    const itemA = makeItem('item-a', 'Item A', foreignItemAUri)
    const itemB = makeItem('item-b', 'Item B', foreignItemBUri)
    const assoc: Association = {
      id: 'assoc-1' as unknown as AssociationId,
      fromItemId: itemA.id,
      toItemId: itemB.id,
      associationType: 'isRelatedTo',
      metadata: {
        caseUri: 'https://source.example.org/ims/case/v1p1/CFAssociations/assoc-1',
        originUri: foreignItemAUri,
        destinationUri: foreignItemBUri,
      },
    }
    const framework: Framework = {
      id: fwId as unknown as FrameworkId,
      metadata: { title: 'Test Framework', creator: 'Test', caseUri: foreignDocUri },
      items: new Map([[itemA.id, itemA], [itemB.id, itemB]]),
      associations: new Map([[assoc.id, assoc]]),
      status: 'Draft',
    }

    // Simulate: load into canvas, then save immediately with no edits.
    const graph = toReactFlowGraph({ framework })
    const { framework: roundTripped } = fromEditorGraph({ graph })

    const roundTrippedAssoc = roundTripped.associations.get(assoc.id)
    expect(roundTrippedAssoc?.metadata?.originUri).toBe(foreignItemAUri)
    expect(roundTrippedAssoc?.metadata?.destinationUri).toBe(foreignItemBUri)
  })

  it('preserves a real (foreign) destinationUri on a document-as-node association through a load/save cycle with no edits', () => {
    const itemA = makeItem('item-a', 'Item A', foreignItemAUri)
    // A top-level competency's isChildOf edge pointing at the framework/document itself.
    const assoc: Association = {
      id: 'assoc-doc' as unknown as AssociationId,
      fromItemId: itemA.id,
      toItemId: fwId as unknown as ItemId,
      associationType: 'isChildOf',
      metadata: {
        caseUri: 'https://source.example.org/ims/case/v1p1/CFAssociations/assoc-doc',
        originUri: foreignItemAUri,
        destinationUri: foreignDocUri,
      },
    }
    const framework: Framework = {
      id: fwId as unknown as FrameworkId,
      metadata: { title: 'Test Framework', creator: 'Test', caseUri: foreignDocUri },
      items: new Map([[itemA.id, itemA]]),
      associations: new Map([[assoc.id, assoc]]),
      status: 'Draft',
    }

    const graph = toReactFlowGraph({ framework })
    const { framework: roundTripped } = fromEditorGraph({ graph })

    const roundTrippedAssoc = roundTripped.associations.get(assoc.id)
    expect(roundTrippedAssoc?.metadata?.destinationUri).toBe(foreignDocUri)
  })
})
