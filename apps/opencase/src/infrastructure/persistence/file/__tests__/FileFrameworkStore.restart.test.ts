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

  it('preserves the full ext:opencase extension object verbatim across a restart, including unmodeled keys', async () => {
    const baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-store-restart-ext-'))
    const storageKey = 'doc-1'

    const store1 = new FileFrameworkStore({ baseDataDir })

    const extOpencase = {
      sourcePackageURI: 'https://standards.example.org/ims/case/v1p1/CFPackages/abc',
      isModifiedFromSource: true,
      importedAt: '2026-09-17T14:55:51.931Z',
      layout: { x: -200, y: -80, w: 400, h: 160 },
      edgeType: 'default'
    }
    const bundle = {
      document: {
        sourcedId: 'doc-1',
        title: 'A framework',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        extensions: { 'ext:opencase': extOpencase }
      },
      items: [],
      associations: [],
      rubrics: [],
    }
    const { relativePath } = await store1.writeBundleFile(tenantId, version, storageKey, bundle)
    await store1.updateIndexesForBundle(tenantId, version, storageKey, bundle, relativePath)

    expect(store1.getDocumentMetadata(tenantId, version, storageKey)?.openCaseExtensions).toEqual(extOpencase)

    const store2 = new FileFrameworkStore({ baseDataDir })
    await store2.loadAll()

    expect(store2.getDocumentMetadata(tenantId, version, storageKey)?.openCaseExtensions).toEqual(extOpencase)

    await fs.rm(baseDataDir, { recursive: true, force: true })
  })

  it('backfills openCaseExtensions on load for a documents.json entry written before that field existed', async () => {
    const baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-store-restart-backfill-'))
    const storageKey = 'doc-1'
    const versionDir = path.join(baseDataDir, 'tenants', tenantId, 'v1p1')
    const idxDir = path.join(versionDir, 'indexes')
    const frameworksDir = path.join(versionDir, 'frameworks', storageKey)
    await fs.mkdir(idxDir, { recursive: true })
    await fs.mkdir(frameworksDir, { recursive: true })

    const extOpencase = {
      sourcePackageURI: 'https://standards.example.org/ims/case/v1p1/CFPackages/abc',
      isModifiedFromSource: true,
      importedAt: '2026-07-28T16:37:03.784Z'
    }
    const relativePath = 'frameworks/doc-1/doc-1_v0001.json'
    await fs.writeFile(
      path.join(versionDir, relativePath),
      JSON.stringify({
        document: { sourcedId: storageKey, title: 'A framework', lastChangeDateTime: '2024-01-01T00:00:00Z', extensions: { 'ext:opencase': extOpencase } },
        items: [],
        associations: [],
        rubrics: [],
      }),
      'utf8'
    )

    // Simulates a documents.json entry persisted before openCaseExtensions was introduced —
    // no such field, and the older derived fields absent too.
    await fs.writeFile(
      path.join(idxDir, 'documents.json'),
      JSON.stringify([
        {
          storageKey,
          sourcedId: storageKey,
          title: 'A framework',
          lastChangeDateTime: '2024-01-01T00:00:00Z',
          currentFile: relativePath,
        },
      ]),
      'utf8'
    )

    const store = new FileFrameworkStore({ baseDataDir })
    await store.loadAll()

    const meta = store.getDocumentMetadata(tenantId, version, storageKey)
    expect(meta?.openCaseExtensions).toEqual(extOpencase)

    // The backfill should persist, so a subsequent restart doesn't need to re-read the bundle.
    const persisted = JSON.parse(await fs.readFile(path.join(idxDir, 'documents.json'), 'utf8'))
    expect(persisted[0].openCaseExtensions).toEqual(extOpencase)

    await fs.rm(baseDataDir, { recursive: true, force: true })
  })
})
