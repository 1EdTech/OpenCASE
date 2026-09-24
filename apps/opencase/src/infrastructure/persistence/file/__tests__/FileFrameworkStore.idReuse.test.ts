import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore.assertNoEntityIdReuse', () => {
  it('should reject reusing an item id across different documents', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })

    // Seed indexes to indicate item-1 belongs to doc-A
    ;(store as any).itemsIndex.set('tenant', new Map([
      ['1.1', new Map([
        ['item-1', { docStorageKey: 'doc-A' }]
      ])]
    ]))
    ;(store as any).documents.set('tenant', new Map([
      ['1.1', new Map([
        ['doc-A', { sourcedId: 'doc-A', title: 'A', lastChangeDateTime: new Date(), currentFile: 'x' }]
      ])]
    ]))

    expect(() => {
      store.assertNoEntityIdReuse('tenant', '1.1', 'doc-B', 'doc-B', {
        document: { sourcedId: 'doc-B', lastChangeDateTime: new Date().toISOString(), title: 'B' },
        items: [{ sourcedId: 'item-1' }],
        associations: [],
        rubrics: []
      })
    }).toThrow(/already used in a different framework/i)
  })

  it('should allow reusing ids within the same document (new version)', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    ;(store as any).itemsIndex.set('tenant', new Map([
      ['1.1', new Map([
        ['item-1', { docStorageKey: 'doc-A' }]
      ])]
    ]))
    ;(store as any).documents.set('tenant', new Map([
      ['1.1', new Map([
        ['doc-A', { sourcedId: 'doc-A', title: 'A', lastChangeDateTime: new Date(), currentFile: 'x' }]
      ])]
    ]))

    expect(() => {
      store.assertNoEntityIdReuse('tenant', '1.1', 'doc-A', 'doc-A', {
        document: { sourcedId: 'doc-A', lastChangeDateTime: new Date().toISOString(), title: 'A' },
        items: [{ sourcedId: 'item-1' }],
        associations: [],
        rubrics: []
      })
    }).not.toThrow()
  })

  it('allows an already-forked document (storage key differs from its current identifier) to keep reusing its own items', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    // item-1 belongs to the document physically stored at "storage-A",
    // which currently reports the (post-fork) identifier "forked-doc-1".
    ;(store as any).itemsIndex.set('tenant', new Map([
      ['1.1', new Map([
        ['item-1', { docStorageKey: 'storage-A' }]
      ])]
    ]))
    ;(store as any).documents.set('tenant', new Map([
      ['1.1', new Map([
        ['storage-A', { sourcedId: 'forked-doc-1', title: 'A', lastChangeDateTime: new Date(), currentFile: 'x' }]
      ])]
    ]))

    expect(() => {
      store.assertNoEntityIdReuse('tenant', '1.1', 'forked-doc-1', 'storage-A', {
        document: { sourcedId: 'forked-doc-1', lastChangeDateTime: new Date().toISOString(), title: 'A' },
        items: [{ sourcedId: 'item-1' }],
        associations: [],
        rubrics: []
      })
    }).not.toThrow()
  })
})

