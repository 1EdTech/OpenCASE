import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore.assertNoEntityIdReuse', () => {
  it('should reject reusing an item id across different documents', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })

    // Seed indexes to indicate item-1 belongs to doc-A
    ;(store as any).itemsIndex.set('tenant', new Map([
      ['1.1', new Map([
        ['item-1', { docSourcedId: 'doc-A' }]
      ])]
    ]))
    ;(store as any).documents.set('tenant', new Map([
      ['1.1', new Map([
        ['doc-A', { sourcedId: 'doc-A', title: 'A', lastChangeDateTime: new Date(), currentFile: 'x' }]
      ])]
    ]))

    expect(() => {
      store.assertNoEntityIdReuse('tenant', '1.1', 'doc-B', {
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
        ['item-1', { docSourcedId: 'doc-A' }]
      ])]
    ]))
    ;(store as any).documents.set('tenant', new Map([
      ['1.1', new Map([
        ['doc-A', { sourcedId: 'doc-A', title: 'A', lastChangeDateTime: new Date(), currentFile: 'x' }]
      ])]
    ]))

    expect(() => {
      store.assertNoEntityIdReuse('tenant', '1.1', 'doc-A', {
        document: { sourcedId: 'doc-A', lastChangeDateTime: new Date().toISOString(), title: 'A' },
        items: [{ sourcedId: 'item-1' }],
        associations: [],
        rubrics: []
      })
    }).not.toThrow()
  })
})

