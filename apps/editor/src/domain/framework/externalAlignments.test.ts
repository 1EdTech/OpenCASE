import { describe, it, expect } from 'vitest'
import {
  externalAlignmentsOf,
  groupExternalAlignments,
  hostedLookupCandidates,
  isRemoteTargetId,
  type ExternalAlignment,
} from './externalAlignments'
import type { Association, Framework, Item } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

const item = (id: string): Item => ({ id: id as ItemId, statement: id, metadata: { caseUri: `https://case.example/CFItems/${id}` } })
const assoc = (id: string, from: string, to: string, associationType: Association['associationType'] = 'isRelatedTo', metadata?: Association['metadata']): Association => ({
  id: id as AssociationId,
  fromItemId: from as ItemId,
  toItemId: to as ItemId,
  associationType,
  metadata,
})
const framework = (items: Item[], associations: Association[]): Framework => ({
  id: 'doc-1' as FrameworkId,
  metadata: { title: 'Doc' },
  items: new Map(items.map((i) => [i.id, i])),
  associations: new Map(associations.map((a) => [a.id, a])),
  status: 'Published',
})

const alignment = (id: string, toItemId: string, extra: Partial<ExternalAlignment> = {}): ExternalAlignment => ({
  id,
  fromItemId: 'item-1',
  toItemId,
  associationType: 'isRelatedTo',
  originUri: 'https://case.example/CFItems/item-1',
  destinationUri: `https://case.example/CFItems/${toItemId}`,
  ...extra,
})

describe('externalAlignmentsOf', () => {
  const items = [item('item-1'), item('item-2')]

  it('returns non-hierarchical associations from an item to a node outside the framework', () => {
    const fw = framework(items, [
      assoc('a-1', 'item-1', 'other-item', 'ext:supports' as Association['associationType'], {
        destinationUri: 'https://case.example/CFItems/other-item',
        destinationTitle: 'Other item',
      }),
    ])

    expect(externalAlignmentsOf(fw)).toEqual([{
      id: 'a-1',
      fromItemId: 'item-1',
      toItemId: 'other-item',
      associationType: 'ext:supports',
      originUri: 'https://case.example/CFItems/item-1',
      destinationUri: 'https://case.example/CFItems/other-item',
      destinationTitle: 'Other item',
      destinationTargetType: undefined,
    }])
  })

  it('keeps non-CASE targets', () => {
    const fw = framework(items, [
      assoc('a-1', 'item-1', 'goal-4.2.15', 'isRelatedTo', {
        destinationUri: 'https://goals.example.org/goals/LO_V2_0?x=1',
        destinationTargetType: 'ext:curriculumGoals',
      }),
    ])

    expect(externalAlignmentsOf(fw).map((a) => a.toItemId)).toEqual(['goal-4.2.15'])
  })

  it('skips hierarchical associations, even to outside nodes', () => {
    const fw = framework(items, [
      assoc('child', 'item-2', 'item-1', 'isChildOf'),
      assoc('part', 'item-1', 'outside', 'isPartOf'),
    ])

    expect(externalAlignmentsOf(fw)).toEqual([])
  })

  it('skips associations within the framework', () => {
    const fw = framework(items, [assoc('a-1', 'item-1', 'item-2')])

    expect(externalAlignmentsOf(fw)).toEqual([])
  })

  it('skips associations whose origin is not one of the framework items', () => {
    const fw = framework(items, [assoc('a-1', 'outside', 'item-1')])

    expect(externalAlignmentsOf(fw)).toEqual([])
  })

  it('skips links to CFDocuments — its own or another framework\'s', () => {
    const fw = framework(items, [
      assoc('own', 'item-1', 'doc-1', 'exactMatchOf'),
      assoc('other', 'item-1', 'doc-2', 'exactMatchOf', { destinationUri: 'https://case.example/ims/case/v1p1/CFDocuments/doc-2' }),
    ])

    expect(externalAlignmentsOf(fw)).toEqual([])
  })

  it('falls back to the item URI and a URN when the association carries no URIs', () => {
    const fw = framework(items, [assoc('a-1', 'item-1', 'other-item')])

    const [a] = externalAlignmentsOf(fw)
    expect(a.originUri).toBe('https://case.example/CFItems/item-1')
    expect(a.destinationUri).toBe('urn:case:item:other-item')
  })
})

describe('hostedLookupCandidates', () => {
  it('returns each CASE destination once and leaves out non-CASE targets', () => {
    const alignments = [
      alignment('a-1', 'x'),
      alignment('a-2', 'x'),
      alignment('a-3', 'y', { destinationTargetType: 'CASE' }),
      alignment('a-4', 'goal-3', { destinationTargetType: 'ext:curriculumGoals' }),
    ]

    expect(hostedLookupCandidates(alignments)).toEqual(['x', 'y'])
  })
})

describe('groupExternalAlignments', () => {
  it('groups hosted destinations by the framework that holds them', () => {
    const targets = groupExternalAlignments(
      [alignment('a-1', 'x'), alignment('a-2', 'y'), alignment('a-3', 'z')],
      {
        x: { identifier: 'doc-b', title: 'Framework B' },
        y: { identifier: 'doc-b', title: 'Framework B' },
        z: { identifier: 'doc-a', title: 'Framework A' },
      },
    )

    expect(targets.map((t) => [t.kind, t.id, t.title, t.alignments.map((a) => a.id)])).toEqual([
      ['hosted', 'doc-a', 'Framework A', ['a-3']],
      ['hosted', 'doc-b', 'Framework B', ['a-1', 'a-2']],
    ])
  })

  it('groups unresolved destinations as remote, by URI host, after the hosted ones', () => {
    const targets = groupExternalAlignments(
      [
        alignment('a-1', 'goal-1', { destinationUri: 'https://goals.example.org/goals/LO_V2_0?a=1', destinationTargetType: 'ext:curriculumGoals' }),
        alignment('a-2', 'sibling', { destinationUri: 'https://case.example.org/ims/case/v1p1/CFItems/sibling' }),
        alignment('a-3', 'hosted'),
        alignment('a-4', 'goal-2', { destinationUri: 'https://goals.example.org/goals/KO_V2_0?b=2', destinationTargetType: 'ext:curriculumGoals' }),
      ],
      { hosted: { identifier: 'doc-b', title: 'Framework B' } },
    )

    expect(targets.map((t) => [t.kind, t.id, t.alignments.map((a) => a.id)])).toEqual([
      ['hosted', 'doc-b', ['a-3']],
      ['remote', 'remote:case.example.org', ['a-2']],
      ['remote', 'remote:goals.example.org', ['a-1', 'a-4']],
    ])
    expect(targets.slice(1).every((t) => isRemoteTargetId(t.id))).toBe(true)
  })

  it('treats a non-CASE target as remote even if the server knows its identifier', () => {
    const targets = groupExternalAlignments(
      [alignment('a-1', 'x', { destinationUri: 'https://elsewhere.example/x', destinationTargetType: 'ext:other' })],
      { x: { identifier: 'doc-b', title: 'Framework B' } },
    )

    expect(targets.map((t) => [t.kind, t.id])).toEqual([['remote', 'remote:elsewhere.example']])
  })

  it('puts destinations without a web URI under one catch-all source', () => {
    const targets = groupExternalAlignments([alignment('a-1', 'x', { destinationUri: 'urn:case:item:x' })], {})

    expect(targets.map((t) => [t.id, t.title])).toEqual([['remote:Other sources', 'Other sources']])
  })
})
