import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore — storage key independent of identifier', () => {
  const tenantId = 'test-tenant'
  const version = '1.1'

  const doc = (identifier: string, extra: Record<string, unknown> = {}) => ({
    sourcedId: identifier,
    title: 'A framework',
    lastChangeDateTime: '2024-01-01T00:00:00Z',
    ...extra,
  })

  it('re-importing a source identifier freed by a fork does not collide with the forked document\'s storage', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    const updateDocIndex = (store as any).updateInMemoryDocumentIndex.bind(store)

    // 1. Original mirror import: storage key minted independently of the
    //    source's identifier (as ImportFramework.ts now does).
    updateDocIndex(tenantId, version, 'storage-A', doc('doc-1'), 'frameworks/storage-A/v1.json')

    // 2. Fork: identifier changes, storage key stays the same (as
    //    CreateFramework.ts's fork branch does).
    updateDocIndex(tenantId, version, 'storage-A', doc('forked-uuid-1'), 'frameworks/storage-A/v2.json')

    // "doc-1" is now free — resolving it should find nothing (not the old
    // forked document's storage key).
    expect(store.resolveStorageKey(tenantId, version, 'doc-1')).toBeNull()
    expect(store.getDocumentMetadata(tenantId, version, 'storage-A')?.sourcedId).toBe('forked-uuid-1')

    // 3. Re-import the SAME original source under the SAME identifier
    //    ("doc-1") — this must mint a fresh, independently-random storage
    //    key (as ImportFramework.ts now does), not reuse "storage-A".
    updateDocIndex(tenantId, version, 'storage-B', doc('doc-1'), 'frameworks/storage-B/v1.json')

    // Both documents must coexist untouched — no clobbering of the forked
    // document's index entry or storage location.
    expect(store.resolveStorageKey(tenantId, version, 'doc-1')).toBe('storage-B')
    expect(store.resolveStorageKey(tenantId, version, 'forked-uuid-1')).toBe('storage-A')
    expect(store.getDocumentMetadata(tenantId, version, 'storage-A')?.sourcedId).toBe('forked-uuid-1')
    expect(store.getDocumentMetadata(tenantId, version, 'storage-B')?.sourcedId).toBe('doc-1')
    expect(store.getAllDocuments(tenantId, version)).toHaveLength(2)
  })

  it('archives, checks, and un-archives a forked document by its storage key', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    const updateDocIndex = (store as any).updateInMemoryDocumentIndex.bind(store)

    // Mirror import, then fork: identifier changes, storage key doesn't.
    updateDocIndex(tenantId, version, 'storage-A', doc('doc-1'), 'frameworks/storage-A/v1.json')
    updateDocIndex(tenantId, version, 'storage-A', doc('forked-uuid-1'), 'frameworks/storage-A/v2.json')

    // Callers resolve the current identifier to a storage key ONCE (as every
    // endpoint now does) and use the storage key for everything after.
    const storageKey = store.resolveStorageKey(tenantId, version, 'forked-uuid-1')
    expect(storageKey).toBe('storage-A')

    expect(store.documentExists(tenantId, version, storageKey!)).toBe(true)
    expect(store.isDocumentArchived(tenantId, version, storageKey!)).toBe(false)

    store.setDocumentArchived(tenantId, version, storageKey!, true)
    expect(store.isDocumentArchived(tenantId, version, storageKey!)).toBe(true)

    store.setDocumentArchived(tenantId, version, storageKey!, false)
    expect(store.isDocumentArchived(tenantId, version, storageKey!)).toBe(false)
  })

  it('removeDocumentFromIndex clears the secondary index entry for the document\'s current identifier', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    const updateDocIndex = (store as any).updateInMemoryDocumentIndex.bind(store)

    updateDocIndex(tenantId, version, 'storage-A', doc('doc-1'), 'frameworks/storage-A/v1.json')
    updateDocIndex(tenantId, version, 'storage-A', doc('forked-uuid-1'), 'frameworks/storage-A/v2.json')

    store.removeDocumentFromIndex(tenantId, version, 'storage-A')

    expect(store.getDocumentMetadata(tenantId, version, 'storage-A')).toBeNull()
    expect(store.resolveStorageKey(tenantId, version, 'forked-uuid-1')).toBeNull()
    expect(store.getAllDocuments(tenantId, version)).toHaveLength(0)
  })

  it('resolveStorageKey returns null for an identifier no document currently reports — including a storage key itself', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    const updateDocIndex = (store as any).updateInMemoryDocumentIndex.bind(store)
    updateDocIndex(tenantId, version, 'storage-A', doc('doc-1'), 'frameworks/storage-A/v1.json')

    expect(store.resolveStorageKey(tenantId, version, 'doc-1')).toBe('storage-A')
    expect(store.resolveStorageKey(tenantId, version, 'does-not-exist')).toBeNull()
    // A storage key is never a valid input here, even though it happens to be
    // a real internal key — resolveStorageKey only ever recognizes identifiers.
    expect(store.resolveStorageKey(tenantId, version, 'storage-A')).toBeNull()
  })
})
