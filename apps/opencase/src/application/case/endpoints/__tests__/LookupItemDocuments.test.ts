import { LookupItemDocuments } from '../LookupItemDocuments'
import { FileFrameworkStore, type DocumentMetadata } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('LookupItemDocuments', () => {
  const tenantId = 'test-tenant'
  const caseVersion = '1.1'

  let mockStore: jest.Mocked<FileFrameworkStore>
  let lookup: LookupItemDocuments

  // storage key → document metadata; item id → storage key
  const docs: Record<string, Partial<DocumentMetadata>> = {
    'key-a': { sourcedId: 'doc-a', title: 'Framework A' },
    'key-b': { sourcedId: 'doc-b', title: 'Framework B' },
    'key-archived': { sourcedId: 'doc-archived', title: 'Archived', openCaseExtensions: { archived: true } }
  }
  const items: Record<string, string> = {
    'item-a1': 'key-a',
    'item-a2': 'key-a',
    'item-b1': 'key-b',
    'item-archived': 'key-archived',
    'item-orphan': 'key-missing'
  }

  beforeEach(() => {
    mockStore = {
      getStorageKeyForItem: jest.fn((_t: string, _v: string, id: string) => items[id] ?? null),
      getDocumentMetadata: jest.fn((_t: string, _v: string, key: string) => (docs[key] as DocumentMetadata) ?? null)
    } as any
    lookup = new LookupItemDocuments(mockStore)
  })

  it('maps each hosted item to the public identifier and title of its document', () => {
    const result = lookup.execute({ tenantId, caseVersion, identifiers: ['item-a1', 'item-a2', 'item-b1'] })

    expect(result).toEqual({
      'item-a1': { identifier: 'doc-a', title: 'Framework A' },
      'item-a2': { identifier: 'doc-a', title: 'Framework A' },
      'item-b1': { identifier: 'doc-b', title: 'Framework B' }
    })
  })

  it('omits identifiers that are not on this server', () => {
    const result = lookup.execute({ tenantId, caseVersion, identifiers: ['item-a1', 'goal-4.2.15', 'unknown'] })

    expect(Object.keys(result)).toEqual(['item-a1'])
  })

  it('omits items whose framework is archived', () => {
    const result = lookup.execute({ tenantId, caseVersion, identifiers: ['item-archived'] })

    expect(result).toEqual({})
  })

  it('omits items whose indexed document has no metadata', () => {
    const result = lookup.execute({ tenantId, caseVersion, identifiers: ['item-orphan'] })

    expect(result).toEqual({})
  })

  it('looks each identifier up once, scoped to the tenant and version', () => {
    lookup.execute({ tenantId, caseVersion, identifiers: ['item-a1', 'item-a1'] })

    expect(mockStore.getStorageKeyForItem).toHaveBeenCalledTimes(1)
    expect(mockStore.getStorageKeyForItem).toHaveBeenCalledWith(tenantId, caseVersion, 'item-a1')
    expect(mockStore.getDocumentMetadata).toHaveBeenCalledWith(tenantId, caseVersion, 'key-a')
  })
})
