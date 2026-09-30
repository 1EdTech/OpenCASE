import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore — public access is independent of license', () => {
  const tenantId = 'test-tenant'
  const version = '1.1' as const
  const publicLicenseId = 'c0c0c0c0-0000-4000-a000-000000000001'

  const doc = (identifier: string, extra: Record<string, unknown> = {}) => ({
    sourcedId: identifier,
    title: 'A framework',
    lastChangeDateTime: '2024-01-01T00:00:00Z',
    ...extra,
  })

  function index (store: FileFrameworkStore, storageKey: string, document: Record<string, unknown>) {
    const updateDocIndex = (store as unknown as {
      updateInMemoryDocumentIndex: (...args: unknown[]) => void
    }).updateInMemoryDocumentIndex.bind(store)
    updateDocIndex(tenantId, version, storageKey, document, `frameworks/${storageKey}/v1.json`)
  }

  it('requires authentication unless publicAccess is explicitly true', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })

    index(store, 'storage-licensed', doc('doc-licensed', {
      licenseURI: { identifier: publicLicenseId, uri: '/licenses/cc0', title: 'CC0' },
    }))
    index(store, 'storage-public', doc('doc-public', {
      licenseURI: { identifier: 'c0c0c0c0-0000-4000-a000-000000000005', uri: '/licenses/private', title: 'All rights reserved' },
      extensions: { 'ext:opencase': { publicAccess: true } },
    }))
    index(store, 'storage-private', doc('doc-private'))

    expect(store.isDocumentPublic(tenantId, version, 'storage-licensed')).toBe(false)
    expect(store.isDocumentPublic(tenantId, version, 'storage-public')).toBe(true)
    expect(store.isDocumentPublic(tenantId, version, 'storage-private')).toBe(false)
    expect(store.isDocumentPublicGlobal('doc-licensed')).toBe(false)
    expect(store.isDocumentPublicGlobal('doc-public')).toBe(true)
  })

  it('clears public access when a later save omits the flag', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    index(store, 'storage-a', doc('doc-a', {
      extensions: { 'ext:opencase': { publicAccess: true } },
    }))
    expect(store.isDocumentPublic(tenantId, version, 'storage-a')).toBe(true)

    index(store, 'storage-a', doc('doc-a', {
      extensions: { 'ext:opencase': { sourcePackageURI: 'https://example.test/pkg' } },
    }))
    expect(store.isDocumentPublic(tenantId, version, 'storage-a')).toBe(false)
  })
})
