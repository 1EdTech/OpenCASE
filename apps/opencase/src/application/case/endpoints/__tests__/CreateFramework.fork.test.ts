import { CreateFramework } from '../CreateFramework'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore, type DocumentMetadata } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'

describe('CreateFramework — mirror fork behavior', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let createFramework: CreateFramework

  const tenantId = 'test-tenant'
  const caseVersion = '1.1'
  const docId = 'doc-123'

  const buildExistingMirrorPkg = (opts: { isModifiedFromSource: boolean, fullStatement?: string, definitions?: any }) => {
    const preserveUris = { preserveUris: opts.isModifiedFromSource === false }
    const document = CFDocument.fromRaw(tenantId, caseVersion, {
      sourcedId: docId,
      uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-123',
      title: 'Source Framework',
      creator: 'Source Org',
      lastChangeDateTime: '2024-01-01T00:00:00Z',
      extensions: {
        'ext:opencase': {
          sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
          isModifiedFromSource: opts.isModifiedFromSource,
          importedAt: '2024-01-01T00:00:00Z'
        }
      }
    }, preserveUris)
    const docURI = document.toJSON().uri
    const item = CFItem.fromRaw(tenantId, caseVersion, {
      sourcedId: 'item-1',
      uri: 'https://source.example.org/ims/case/v1p1/CFItems/item-1',
      fullStatement: opts.fullStatement ?? 'Original statement',
      lastChangeDateTime: '2024-01-01T00:00:00Z'
    }, docId, docURI, preserveUris)
    return new CFPackage({ document, items: [item], associations: [], rubrics: [], definitions: opts.definitions ?? null })
  }

  const basePayload = (overrides: { fullStatement?: string, layoutOnly?: boolean } = {}) => ({
    CFDocument: {
      identifier: docId,
      uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-123',
      title: 'Source Framework',
      creator: 'Source Org',
      lastChangeDateTime: '2024-06-01T00:00:00Z',
      // The real frontend (toCasePackage.ts's frameworkToCfDocument) always
      // fabricates a fresh, local placeholder CFPackageURI on every export —
      // never the mirror's real (foreign) one. This must never by itself be
      // treated as a forking data change.
      CFPackageURI: { identifier: docId, uri: `urn:case:package:${docId}`, title: 'Source Framework' }
    },
    CFItems: [{
      identifier: 'item-1',
      uri: 'https://source.example.org/ims/case/v1p1/CFItems/item-1',
      fullStatement: overrides.fullStatement ?? 'Original statement',
      lastChangeDateTime: '2024-06-01T00:00:00Z',
      ...(overrides.layoutOnly ? { extensions: { 'ext:opencase': { layout: { x: 100, y: 200 } } } } : {})
    }],
    CFAssociations: [],
    CFRubrics: []
  })

  beforeEach(() => {
    mockRepository = {
      load: jest.fn().mockResolvedValue(null),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any
    mockStore = {
      getDocumentMetadata: jest.fn(),
      resolveStorageKey: jest.fn()
    } as any
  })

  it('does not fork a pristine mirror on a pure layout-only save', async () => {
    const existingMeta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Source Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: 'frameworks/doc-123/doc-123_v0001.json',
      sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
      isModifiedFromSource: false
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(existingMeta)
    mockRepository.load.mockResolvedValue(buildExistingMirrorPkg({ isModifiedFromSource: false }))

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId, caseVersion, payload: basePayload({ layoutOnly: true })
    })

    expect(result.status).toBe('published')
    expect((result as any).forked).toBeFalsy()
    expect(result.docId).toBe(docId)
    expect((result as any).isModifiedFromSource).toBe(false)

    // Not a fork — the document's own resolved storage key is reused as-is.
    expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    expect(mockRepository.saveNewVersion.mock.calls[0][3]).toBe(docId)
    const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2] as CFPackage
    // Pristine mirror: URIs still preserved (foreign shape), identifier unchanged.
    expect(savedPkg.document.sourcedId).toBe(docId)
    expect(savedPkg.document.toJSON().uri).toBe('https://source.example.org/ims/case/v1p1/CFDocuments/doc-123')
  })

  it('does not fork a pristine mirror when its persisted CFDefinitions include empty categories the frontend omits entirely', async () => {
    // Many CASE exporters (including a mirror's own source) always emit every
    // CFDefinitions category, even empty ones. The editor's own exporter
    // (frameworkToCfPackage) omits any category with nothing referenced in
    // it. These are the same "no concepts" fact in two different shapes and
    // must never look like a data change on their own.
    const existingMeta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Source Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: 'frameworks/doc-123/doc-123_v0001.json',
      sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
      isModifiedFromSource: false
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(existingMeta)
    mockRepository.load.mockResolvedValue(buildExistingMirrorPkg({
      isModifiedFromSource: false,
      definitions: {
        CFConcepts: [],
        CFSubjects: [],
        CFItemTypes: [],
        CFAssociationGroupings: [],
        CFLicenses: [{ identifier: 'lic-1', title: 'CC BY', uri: '/ims/case/v1p1/CFLicenses/lic-1' }]
      }
    }))

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId,
      caseVersion,
      payload: {
        ...basePayload({ layoutOnly: true }),
        CFDefinitions: {
          CFLicenses: [{ identifier: 'lic-1', title: 'CC BY', uri: '/ims/case/v1p1/CFLicenses/lic-1' }]
        }
      }
    })

    expect((result as any).forked).toBeFalsy()
    expect(result.docId).toBe(docId)
    expect((result as any).isModifiedFromSource).toBe(false)
  })

  it('does not fork a pristine mirror when a referenced definition\'s CFDefinitions rendering differs from what was originally imported', async () => {
    // Real-world case: the mirror's own persisted CFDefinitions preserves the
    // source's raw (foreign) license uri forever, but the license identifier
    // happens to collide with one of OpenCASE's own permanent seed defaults —
    // so the tenant's shared catalog (which the frontend rebuilds
    // CFDefinitions from on every save) permanently reports the seed's local
    // uri instead. Nothing about the framework's own content changed.
    const existingMeta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Source Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: 'frameworks/doc-123/doc-123_v0001.json',
      sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
      isModifiedFromSource: false
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(existingMeta)
    mockRepository.load.mockResolvedValue(buildExistingMirrorPkg({
      isModifiedFromSource: false,
      definitions: {
        CFLicenses: [{ identifier: 'c0c0c0c0-...-0001', title: 'CC0', uri: 'https://source.example.org/ims/case/v1p1/CFLicenses/c0c0c0c0-...-0001' }]
      }
    }))

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId,
      caseVersion,
      payload: {
        ...basePayload({ layoutOnly: true }),
        CFDefinitions: {
          // Same identifier, but the tenant's own (seed-protected) local uri —
          // this is what the real frontend actually sends on every save.
          CFLicenses: [{ identifier: 'c0c0c0c0-...-0001', title: 'CC0', uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-...-0001' }]
        }
      }
    })

    expect((result as any).forked).toBeFalsy()
    expect(result.docId).toBe(docId)
    expect((result as any).isModifiedFromSource).toBe(false)
  })

  it('forks a pristine mirror when the actual framework data changes, minting new identifiers', async () => {
    const existingMeta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Source Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: 'frameworks/doc-123/doc-123_v0001.json',
      sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
      isModifiedFromSource: false
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(existingMeta)
    mockRepository.load.mockResolvedValue(buildExistingMirrorPkg({ isModifiedFromSource: false }))

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId, caseVersion, payload: basePayload({ fullStatement: 'Edited statement' })
    })

    expect(result.status).toBe('published')
    expect((result as any).forked).toBe(true)
    expect((result as any).isModifiedFromSource).toBe(true)
    expect((result as any).sourcePackageURI).toBe('https://source.example.org/ims/case/v1p1/CFPackages/doc-123')
    expect(result.docId).not.toBe(docId)

    expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    // Storage key stays the pre-fork id, even though the document's own identifier changed.
    expect(mockRepository.saveNewVersion.mock.calls[0][3]).toBe(docId)

    const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2] as CFPackage
    expect(savedPkg.document.sourcedId).not.toBe(docId)
    expect(savedPkg.document.toJSON().uri).toBe(`/ims/case/v1p1/CFDocuments/${savedPkg.document.sourcedId}`)
    expect(savedPkg.items[0].sourcedId).not.toBe('item-1')
    const ext = savedPkg.document.toJSON().extensions as any
    expect(ext['ext:opencase'].isModifiedFromSource).toBe(true)
    expect(ext['ext:opencase'].sourcePackageURI).toBe('https://source.example.org/ims/case/v1p1/CFPackages/doc-123')
  })

  it('does not re-mint identifiers on an ordinary update to an already-forked document', async () => {
    const existingMeta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Source Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: 'frameworks/doc-123/doc-123_v0002.json',
      sourcePackageURI: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123',
      isModifiedFromSource: true
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(existingMeta)
    mockRepository.load.mockResolvedValue(buildExistingMirrorPkg({ isModifiedFromSource: true, fullStatement: 'Original statement' }))

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId, caseVersion, payload: basePayload({ fullStatement: 'Another edit' })
    })

    expect((result as any).forked).toBeFalsy()
    expect(result.docId).toBe(docId)
    expect((result as any).isModifiedFromSource).toBe(true)

    expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    expect(mockRepository.saveNewVersion.mock.calls[0][3]).toBe(docId)
    const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2] as CFPackage
    expect(savedPkg.document.sourcedId).toBe(docId)
    expect(savedPkg.items[0].sourcedId).toBe('item-1')
  })

  it('leaves a never-imported document entirely unaffected by fork logic', async () => {
    mockStore.resolveStorageKey.mockReturnValue(null)
    mockStore.getDocumentMetadata.mockReturnValue(null)

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
    const result = await createFramework.execute({
      tenantId, caseVersion, payload: basePayload()
    })

    expect(result.status).toBe('created')
    expect(result.docId).toBe(docId)
    expect((result as any).forked).toBeUndefined()
  })

  it('rejects a save submitted under a different CASE version than the document was created with', async () => {
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === '1.0' ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(null)

    createFramework = new CreateFramework(mockRepository, undefined, mockStore)

    await expect(
      createFramework.execute({ tenantId, caseVersion: '1.1', payload: basePayload() })
    ).rejects.toThrow(/exists under CASE version/)
  })
})
