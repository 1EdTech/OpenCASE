import { describe, it, expect } from 'vitest'
import {
  NO_INLINE_ALIGNMENT_EDITS,
  addInlineAlignment,
  applyInlineAlignmentEdits,
  changeInlineAlignmentType,
  hasInlineAlignmentEdits,
  removeInlineAlignment,
} from './inlineAlignmentEdits'
import type { Association, Framework, Item } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

const item = (id: string): Item => ({ id: id as ItemId, statement: id })
const assoc = (id: string, to: string, associationType: Association['associationType'] = 'isRelatedTo'): Association => ({
  id: id as AssociationId,
  fromItemId: 'item-1' as ItemId,
  toItemId: to as ItemId,
  associationType,
})
const framework = (associations: Association[]): Framework => ({
  id: 'doc-1' as FrameworkId,
  metadata: { title: 'Doc' },
  items: new Map([item('item-1')].map((i) => [i.id, i])),
  associations: new Map(associations.map((a) => [a.id, a])),
  status: 'Published',
})

const existing = assoc('existing', 'other-item')

describe('inline alignment edits', () => {
  it('leaves the framework untouched when there are no edits', () => {
    const fw = framework([existing])
    expect(applyInlineAlignmentEdits(fw, NO_INLINE_ALIGNMENT_EDITS)).toBe(fw)
    expect(hasInlineAlignmentEdits(NO_INLINE_ALIGNMENT_EDITS)).toBe(false)
  })

  it('adds, removes and retypes associations', () => {
    let edits = addInlineAlignment(NO_INLINE_ALIGNMENT_EDITS, assoc('new', 'another-item'))
    edits = changeInlineAlignmentType(edits, 'existing', 'exactMatchOf')
    const fw = applyInlineAlignmentEdits(framework([existing, assoc('gone', 'x')]), removeInlineAlignment(edits, 'gone'))

    expect([...fw.associations.keys()].sort()).toEqual(['existing', 'new'])
    expect(fw.associations.get('existing' as AssociationId)?.associationType).toBe('exactMatchOf')
  })

  it('forgets an association added and then removed in the same session', () => {
    const edits = removeInlineAlignment(addInlineAlignment(NO_INLINE_ALIGNMENT_EDITS, assoc('new', 'x')), 'new')
    expect(hasInlineAlignmentEdits(edits)).toBe(false)
  })

  it('retypes an association added in this session in place', () => {
    const edits = changeInlineAlignmentType(addInlineAlignment(NO_INLINE_ALIGNMENT_EDITS, assoc('new', 'x')), 'new', 'isPeerOf')
    expect(edits.added[0].associationType).toBe('isPeerOf')
    expect(edits.typeChanges).toEqual({})
  })

  it('drops a pending type change when the association is removed', () => {
    const edits = removeInlineAlignment(changeInlineAlignmentType(NO_INLINE_ALIGNMENT_EDITS, 'existing', 'isPeerOf'), 'existing')
    expect(edits).toEqual({ added: [], removedIds: ['existing'], typeChanges: {} })
  })

  it('is idempotent: applying the edits to an already-edited framework changes nothing', () => {
    let edits = addInlineAlignment(NO_INLINE_ALIGNMENT_EDITS, assoc('new', 'x'))
    edits = changeInlineAlignmentType(edits, 'existing', 'exactMatchOf')
    edits = removeInlineAlignment(edits, 'gone')
    const once = applyInlineAlignmentEdits(framework([existing, assoc('gone', 'y')]), edits)
    const twice = applyInlineAlignmentEdits(once, edits)
    expect(twice.associations).toEqual(once.associations)
  })
})
