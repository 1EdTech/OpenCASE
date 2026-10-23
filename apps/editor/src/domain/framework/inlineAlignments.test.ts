import { describe, it, expect } from 'vitest'
import { groupInlineAlignmentsByTarget, inlineAlignmentsOf } from './inlineAlignments'
import type { Association, Framework, Item } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

const item = (id: string): Item => ({ id: id as ItemId, statement: id })
const assoc = (id: string, from: string, to: string, associationType = 'isRelatedTo', metadata?: Association['metadata']): Association => ({
  id: id as AssociationId,
  fromItemId: from as ItemId,
  toItemId: to as ItemId,
  associationType,
  metadata,
})
const framework = (associations: Association[]): Framework => ({
  id: 'doc-1' as FrameworkId,
  metadata: { title: 'Doc' },
  items: new Map([item('item-1'), item('item-2')].map((i) => [i.id, i])),
  associations: new Map(associations.map((a) => [a.id, a])),
  status: 'Published',
})

describe('inlineAlignmentsOf', () => {
  it('keeps non-hierarchical associations from an item to a CASE item, here or elsewhere', () => {
    const fw = framework([
      assoc('a-1', 'item-1', 'item-2', 'ext:related'),
      assoc('a-2', 'item-1', 'other-item', 'precedes', { destinationUri: 'https://example.org/ims/case/v1p1/CFItems/other-item' }),
    ])
    const result = inlineAlignmentsOf(fw)
    expect(result.map((a) => a.id)).toEqual(['a-1', 'a-2'])
    expect(result[1]).toMatchObject({
      fromItemId: 'item-1',
      toItemId: 'other-item',
      associationType: 'precedes',
      destinationUri: 'https://example.org/ims/case/v1p1/CFItems/other-item',
    })
  })

  it('skips hierarchy, links to the document, non-CASE targets and incoming associations', () => {
    const fw = framework([
      assoc('child', 'item-2', 'item-1', 'isChildOf'),
      assoc('part', 'item-2', 'item-1', 'isPartOf'),
      assoc('root', 'item-1', 'doc-1', 'exactMatchOf'),
      assoc('non-case', 'item-1', 'KO|3.1.2', 'isRelatedTo', { destinationTargetType: 'ext:outcomes' }),
      assoc('incoming', 'other-item', 'item-1'),
    ])
    expect(inlineAlignmentsOf(fw)).toEqual([])
  })

  it('treats an explicit CASE targetType as a CASE item', () => {
    const fw = framework([assoc('a-1', 'item-1', 'other-item', 'isRelatedTo', { destinationTargetType: 'CASE' })])
    expect(inlineAlignmentsOf(fw)).toHaveLength(1)
  })
})

describe('groupInlineAlignmentsByTarget', () => {
  it('groups local destinations under the framework itself and others by their framework', () => {
    const fw = framework([
      assoc('local', 'item-1', 'item-2'),
      assoc('remote', 'item-1', 'other-item'),
      assoc('unknown', 'item-2', 'missing-item'),
    ])
    const { byTarget, unresolvedItemIds } = groupInlineAlignmentsByTarget(
      fw,
      inlineAlignmentsOf(fw),
      (id) => (id === 'other-item' ? 'doc-2' : undefined),
    )
    expect(byTarget.get('doc-1')?.map((a) => a.id)).toEqual(['local'])
    expect(byTarget.get('doc-2')?.map((a) => a.id)).toEqual(['remote'])
    expect(unresolvedItemIds).toEqual(['missing-item'])
  })
})
