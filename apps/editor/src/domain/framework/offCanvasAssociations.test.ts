import { describe, it, expect } from 'vitest'
import { withOffCanvasAssociations } from './offCanvasAssociations'
import type { Association, Framework, Item } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

const item = (id: string): Item => ({ id: id as ItemId, statement: id })
const assoc = (id: string, from: string, to: string, metadata?: Association['metadata']): Association => ({
  id: id as AssociationId,
  fromItemId: from as ItemId,
  toItemId: to as ItemId,
  associationType: 'exactMatchOf',
  metadata,
})
const framework = (items: Item[], associations: Association[]): Framework => ({
  id: 'doc-1' as FrameworkId,
  metadata: { title: 'Doc' },
  items: new Map(items.map((i) => [i.id, i])),
  associations: new Map(associations.map((a) => [a.id, a])),
  status: 'Published',
})

const external = assoc('ext-1', 'item-1', 'KO|3.1.2', { destinationTargetType: 'ext:onderwijsdoelen' })
const local = assoc('local-1', 'item-1', 'item-2')
const toDocument = assoc('root-1', 'item-1', 'doc-1')
const loaded = framework([item('item-1'), item('item-2')], [external, local, toDocument])

describe('withOffCanvasAssociations', () => {
  it('carries over an association to a node outside the framework', () => {
    const saved = framework([item('item-1'), item('item-2')], [local, toDocument])
    expect(withOffCanvasAssociations(loaded, saved).associations.get(external.id)).toBe(external)
  })

  it('does not bring back canvas associations the user deleted', () => {
    const saved = framework([item('item-1'), item('item-2')], [])
    const result = withOffCanvasAssociations(loaded, saved)
    expect(result.associations.has(local.id)).toBe(false)
    expect(result.associations.has(toDocument.id)).toBe(false)
  })

  it('drops the association when its local item was deleted', () => {
    const saved = framework([item('item-2')], [])
    expect(withOffCanvasAssociations(loaded, saved).associations.has(external.id)).toBe(false)
  })

  it('leaves editor-authored remote links to remoteEditorData', () => {
    const remote = assoc('remote-1', 'item-1', 'remote-item', { extensions: { 'ext:opencase': { remoteLink: true } } })
    const saved = framework([item('item-1')], [])
    expect(withOffCanvasAssociations(framework([item('item-1')], [remote]), saved).associations.has(remote.id)).toBe(false)
  })

  it('returns the saved framework untouched when there is nothing to carry over', () => {
    const saved = framework([item('item-1'), item('item-2')], [local, toDocument])
    expect(withOffCanvasAssociations(framework([item('item-1'), item('item-2')], [local]), saved)).toBe(saved)
  })
})
