import { FileFrameworkStore } from '../FileFrameworkStore'

describe('FileFrameworkStore — seed definitions are a permanent baseline', () => {
  const tenantId = 'test-tenant'
  const version = '1.1'

  const seedLicense = (overrides: Record<string, unknown> = {}) => ({
    identifier: 'c0c0c0c0-0000-4000-a000-000000000001',
    title: 'Public Domain (CC0 1.0)',
    lastChangeDateTime: '2025-01-01T00:00:00.000Z',
    ...overrides,
  })

  const seedStore = (store: FileFrameworkStore) => {
    const tenantMap = new Map()
    const versionMap = new Map()
    const catMap = new Map()
    catMap.set('c0c0c0c0-0000-4000-a000-000000000001', {
      docStorageKey: '__seed__',
      value: seedLicense(),
    })
    versionMap.set('CFLicenses', catMap)
    tenantMap.set(version, versionMap)
    ;(store as any).definitionsIndex.set(tenantId, tenantMap)
  }

  it('does not let an imported document steal ownership of a seed definition, even with an equal or later timestamp', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    seedStore(store)

    const updateDefs = (store as any).updateInMemoryDefinitionsIndex.bind(store)
    // An imported framework from another OpenCASE instance seeded with the
    // same defaults embeds an identical CFLicense under the same identifier,
    // with the same (or later) lastChangeDateTime.
    updateDefs(tenantId, version, { CFLicenses: [seedLicense()] }, 'imported-storage-key', new Date('2025-01-01T00:00:00.000Z'))

    const entry = store.getDefinitionById(tenantId, version, 'CFLicenses' as any, 'c0c0c0c0-0000-4000-a000-000000000001')
    expect(entry?.docStorageKey).toBe('__seed__')
  })

  it('survives deletion of a document whose own definitions duplicated a seed identifier', () => {
    const store = new FileFrameworkStore({ baseDataDir: '/tmp' })
    seedStore(store)

    const updateDefs = (store as any).updateInMemoryDefinitionsIndex.bind(store)
    updateDefs(tenantId, version, { CFLicenses: [seedLicense()] }, 'imported-storage-key', new Date('2025-01-01T00:00:00.000Z'))

    store.removeDefinitionsFromIndexForDocument(tenantId, version, 'imported-storage-key')

    const entry = store.getDefinitionById(tenantId, version, 'CFLicenses' as any, 'c0c0c0c0-0000-4000-a000-000000000001')
    expect(entry).not.toBeNull()
    expect(entry?.docStorageKey).toBe('__seed__')
  })
})
