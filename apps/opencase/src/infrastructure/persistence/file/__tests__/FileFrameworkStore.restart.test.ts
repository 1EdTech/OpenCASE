import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore — index survives a server restart', () => {
  const tenantId = 'test-tenant'
  const version = '1.1'

  it('a forked document\'s items/associations remain resolvable to its true storage key after reload from disk', async () => {
    const baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-store-restart-'))
    const storageKey = 'storage-A' // minted once, independent of identifier, and never changes

    const store1 = new FileFrameworkStore({ baseDataDir })

    const writeBundleAndIndex = async (sourcedId: string) => {
      const bundle = {
        document: { sourcedId, title: 'A framework', lastChangeDateTime: '2024-01-01T00:00:00Z' },
        items: [{ sourcedId: 'item-1', fullStatement: 'x' }],
        associations: [],
        rubrics: [],
      }
      const { relativePath } = await store1.writeBundleFile(tenantId, version, storageKey, bundle)
      await store1.updateIndexesForBundle(tenantId, version, storageKey, bundle, relativePath)
    }

    // Mirror import (identifier === original source's id)...
    await writeBundleAndIndex('doc-1')
    // ...then fork: identifier changes, storage key does not.
    await writeBundleAndIndex('forked-uuid-1')

    // Fresh store instance reloading from the same disk state, as happens on
    // every server restart/redeploy.
    const store2 = new FileFrameworkStore({ baseDataDir })
    await store2.loadAll()

    expect(store2.resolveStorageKey(tenantId, version, 'forked-uuid-1')).toBe(storageKey)
    expect(store2.getDocumentMetadata(tenantId, version, storageKey)?.sourcedId).toBe('forked-uuid-1')

    const itemStorageKey = store2.getStorageKeyForItem(tenantId, version, 'item-1')
    expect(itemStorageKey).toBe(storageKey)
    await expect(store2.loadDocumentBundle(tenantId, version, itemStorageKey!)).resolves.not.toBeNull()

    await fs.rm(baseDataDir, { recursive: true, force: true })
  })

  it('still resolves a never-forked document by its (pre-fork-feature) documents.json entry lacking storageKey', async () => {
    const baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-store-restart-legacy-'))
    const idxDir = path.join(baseDataDir, 'tenants', tenantId, 'v1p1', 'indexes')
    await fs.mkdir(idxDir, { recursive: true })
    await fs.writeFile(
      path.join(idxDir, 'documents.json'),
      JSON.stringify([
        {
          sourcedId: 'legacy-doc-1',
          title: 'Legacy doc',
          lastChangeDateTime: '2024-01-01T00:00:00Z',
          currentFile: 'frameworks/legacy-doc-1/legacy-doc-1_v0001.json',
        },
      ]),
      'utf8'
    )

    const store = new FileFrameworkStore({ baseDataDir })
    await store.loadAll()

    expect(store.resolveStorageKey(tenantId, version, 'legacy-doc-1')).toBe('legacy-doc-1')
    expect(store.getDocumentMetadata(tenantId, version, 'legacy-doc-1')?.sourcedId).toBe('legacy-doc-1')

    await fs.rm(baseDataDir, { recursive: true, force: true })
  })
})
