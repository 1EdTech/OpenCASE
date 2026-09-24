import { describe, it, expect } from 'vitest'
import { hasFrameworkDataChanged } from './hasFrameworkDataChanged'
import type { Framework } from './model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

function baseFramework(): Framework {
  return {
    id: 'fw-1' as FrameworkId,
    metadata: { title: 'Framework', description: 'A framework' },
    items: new Map([
      ['item-1' as ItemId, {
        id: 'item-1' as ItemId,
        statement: 'Statement 1',
        type: 'Standard',
        metadata: { humanCodingScheme: 'A.1' },
      }],
      ['item-2' as ItemId, {
        id: 'item-2' as ItemId,
        statement: 'Statement 2',
        type: 'Standard',
      }],
    ]),
    associations: new Map([
      ['assoc-1' as AssociationId, {
        id: 'assoc-1' as AssociationId,
        fromItemId: 'item-1' as ItemId,
        toItemId: 'item-2' as ItemId,
        associationType: 'isChildOf',
      }],
    ]),
    status: 'Published',
  }
}

function clone(framework: Framework): Framework {
  return {
    ...framework,
    metadata: { ...framework.metadata },
    items: new Map(Array.from(framework.items, ([id, item]) => [id, { ...item, metadata: { ...item.metadata } }])),
    associations: new Map(Array.from(framework.associations, ([id, a]) => [id, { ...a, metadata: { ...a.metadata } }])),
  }
}

describe('hasFrameworkDataChanged', () => {
  it('returns false for two identical snapshots', () => {
    const a = baseFramework()
    const b = clone(a)
    expect(hasFrameworkDataChanged(a, b)).toBe(false)
  })

  it('ignores canvas-only changes nested under metadata["ext:opencase"]', () => {
    const a = baseFramework()
    const b = clone(a)
    const item = b.items.get('item-1' as ItemId)!
    item.metadata = { ...item.metadata, 'ext:opencase': { layout: { x: 500, y: 250 }, colorBand: '#ff0000' } }

    expect(hasFrameworkDataChanged(a, b)).toBe(false)
  })

  it('ignores canvas-only changes stored as TOP-LEVEL metadata keys (the shape fromEditorGraph.ts actually produces)', () => {
    // fromEditorGraph.ts (re-derives a Framework from the live canvas on every
    // save, and to capture the fork-detection baseline) writes colorBand/
    // originHandle/destinationHandle directly on metadata, NOT nested under
    // an 'ext:opencase' key — e.g. switching layout algorithms (star ↔
    // hierarchical) recomputes every edge's handle anchors this way.
    const a = baseFramework()
    const b = clone(a)
    const item = b.items.get('item-1' as ItemId)!
    item.metadata = { ...item.metadata, colorBand: '#ff0000' }
    const assoc = b.associations.get('assoc-1' as AssociationId)!
    assoc.metadata = { ...assoc.metadata, originHandle: 'bottom', destinationHandle: 'left' }

    expect(hasFrameworkDataChanged(a, b)).toBe(false)
  })

  it('detects a statement edit', () => {
    const a = baseFramework()
    const b = clone(a)
    b.items.get('item-1' as ItemId)!.statement = 'Edited statement'

    expect(hasFrameworkDataChanged(a, b)).toBe(true)
  })

  it('detects an item type change', () => {
    const a = baseFramework()
    const b = clone(a)
    b.items.get('item-1' as ItemId)!.type = 'Competency'

    expect(hasFrameworkDataChanged(a, b)).toBe(true)
  })

  it('detects a new association (hierarchy edit)', () => {
    const a = baseFramework()
    const b = clone(a)
    b.associations.set('assoc-2' as AssociationId, {
      id: 'assoc-2' as AssociationId,
      fromItemId: 'item-2' as ItemId,
      toItemId: 'item-1' as ItemId,
      associationType: 'isRelatedTo',
    })

    expect(hasFrameworkDataChanged(a, b)).toBe(true)
  })

  it('detects a removed item', () => {
    const a = baseFramework()
    const b = clone(a)
    b.items.delete('item-2' as ItemId)

    expect(hasFrameworkDataChanged(a, b)).toBe(true)
  })

  it('detects a framework metadata edit', () => {
    const a = baseFramework()
    const b = clone(a)
    b.metadata.description = 'Updated description'

    expect(hasFrameworkDataChanged(a, b)).toBe(true)
  })
})
