import { CreateFramework } from '../CreateFramework'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore, type DocumentMetadata } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFRubric } from '../../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'

// The editor can't author rubrics or CFPackage-level extensions and never sends them
// on save. Omitting them must keep what's stored rather than wiping it.
describe('CreateFramework — keeps stored rubrics and package extensions when omitted', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let createFramework: CreateFramework

  const tenantId = 'test-tenant'
  const caseVersion = '1.1'
  const docId = 'doc-123'
  const packageExtensions = { syncedFrom: 'smartschool', syncRunId: 'run-42' }

  const buildStoredPkg = (opts: { pristineMirror?: boolean } = {}) => {
    const preserveUris = { preserveUris: opts.pristineMirror === true }
    const document = CFDocument.fromRaw(tenantId, caseVersion, {
      sourcedId: docId,
      uri: `/ims/case/v1p1/CFDocuments/${docId}`,
      title: 'Framework',
      creator: 'Provider',
      lastChangeDateTime: '2024-01-01T00:00:00Z',
      ...(opts.pristineMirror
        ? { extensions: { 'ext:opencase': { isModifiedFromSource: false, importedAt: '2024-01-01T00:00:00Z' } } }
        : {})
    }, preserveUris)
    const item = CFItem.fromRaw(tenantId, caseVersion, {
      sourcedId: 'item-1',
      uri: '/ims/case/v1p1/CFItems/item-1',
      fullStatement: 'Original statement',
      lastChangeDateTime: '2024-01-01T00:00:00Z'
    }, docId, document.toJSON().uri, preserveUris)
    const rubric = CFRubric.fromRaw(tenantId, caseVersion, {
      identifier: 'rubric-1',
      uri: '/ims/case/v1p1/CFRubrics/rubric-1',
      title: 'Rubric',
      lastChangeDateTime: '2024-01-01T00:00:00Z',
      extensions: { rubricSourceId: 'rs-1' }
    }, preserveUris)
    return new CFPackage({ document, items: [item], associations: [], rubrics: [rubric], definitions: null, extensions: packageExtensions })
  }

  // Shaped like an editor save: no CFRubrics and no package-level extensions.
  const editorPayload = (fullStatement = 'Original statement') => ({
    CFDocument: {
      identifier: docId,
      uri: `/ims/case/v1p1/CFDocuments/${docId}`,
      title: 'Framework',
      creator: 'Provider',
      lastChangeDateTime: '2024-01-01T00:00:00Z'
    },
    CFItems: [{
      identifier: 'item-1',
      uri: '/ims/case/v1p1/CFItems/item-1',
      fullStatement,
      lastChangeDateTime: '2024-01-01T00:00:00Z'
    }],
    CFAssociations: []
  })

  const existingDocument = (opts: { pristineMirror?: boolean } = {}) => {
    const meta: DocumentMetadata = {
      sourcedId: docId,
      title: 'Framework',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      currentFile: `frameworks/${docId}/${docId}_v0001.json`,
      ...(opts.pristineMirror ? { openCaseExtensions: { isModifiedFromSource: false } } : {})
    }
    mockStore.resolveStorageKey.mockImplementation((_t, v) => (v === caseVersion ? docId : null))
    mockStore.getDocumentMetadata.mockReturnValue(meta)
    mockRepository.load.mockResolvedValue(buildStoredPkg(opts))
  }

  const savedPkg = () => mockRepository.saveNewVersion.mock.calls[0][2] as CFPackage

  beforeEach(() => {
    mockRepository = {
      load: jest.fn().mockResolvedValue(null),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any
    mockStore = {
      resolveStorageKey: jest.fn().mockReturnValue(null),
      getDocumentMetadata: jest.fn().mockReturnValue(null)
    } as any
    createFramework = new CreateFramework(mockRepository, undefined, mockStore)
  })

  it('keeps the stored rubrics and package extensions when a save omits them', async () => {
    existingDocument()

    const result = await createFramework.execute({ tenantId, caseVersion, payload: editorPayload('Edited statement') })

    expect(result.status).toBe('published')
    expect(savedPkg().rubrics.map(r => r.toJSON())).toEqual([
      expect.objectContaining({ identifier: 'rubric-1', extensions: { rubricSourceId: 'rs-1' } })
    ])
    expect(savedPkg().extensions).toEqual(packageExtensions)
  })

  it('reports unchanged when only omitted rubrics/extensions would differ', async () => {
    existingDocument()

    const result = await createFramework.execute({ tenantId, caseVersion, payload: editorPayload() })

    expect(result.status).toBe('unchanged')
    expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
  })

  it('replaces stored rubrics and package extensions when the payload provides them explicitly', async () => {
    existingDocument()

    await createFramework.execute({
      tenantId,
      caseVersion,
      payload: { ...editorPayload(), CFRubrics: [], extensions: { replaced: true } }
    })

    expect(savedPkg().rubrics).toEqual([])
    expect(savedPkg().extensions).toEqual({ replaced: true })
  })

  it('does not fork a pristine mirror just because the save omitted its rubrics', async () => {
    existingDocument({ pristineMirror: true })

    const result = await createFramework.execute({ tenantId, caseVersion, payload: editorPayload() })

    expect((result as any).forked).toBeFalsy()
  })
})
