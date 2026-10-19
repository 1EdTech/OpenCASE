import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImportFramework } from '../ImportFramework'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { CaseApiClient } from '../../../../infrastructure/http/CaseApiClient'
import { JsonSchemaValidator } from '../../../../infrastructure/validation/JsonSchemaValidator'

describe('ImportFramework', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockApiClient: jest.Mocked<CaseApiClient>
  let mockValidator: jest.Mocked<JsonSchemaValidator>
  let importFramework: ImportFramework

  const tenantId = 'test-tenant'
  const caseVersion = '1.1'

  const cfDocument = {
    identifier: 'doc-123',
    uri: '/ims/case/v1p1/CFDocuments/doc-123',
    title: 'Test Document',
    creator: 'Test Creator',
    lastChangeDateTime: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    mockRepository = {
      load: jest.fn().mockResolvedValue(null),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockApiClient = {
      fetchCFPackage: jest.fn(),
      fetchCFDocuments: jest.fn()
    } as any

    mockValidator = {
      validate: jest.fn(),
      hasSchema: jest.fn().mockReturnValue(true),
      getRegisteredSchemas: jest.fn().mockReturnValue([])
    } as any

    importFramework = new ImportFramework(mockRepository, mockApiClient, mockValidator)
  })

  describe('execute', () => {
    it('imports from a remote endpoint and injects source provenance', async () => {
      mockApiClient.fetchCFPackage.mockResolvedValue({
        CFPackage: { CFDocument: cfDocument, CFItems: [], CFAssociations: [], CFRubrics: [] }
      })

      const result = await importFramework.execute({
        tenantId,
        caseVersion,
        endpointUrl: 'https://example.org/ims/case/v1p1/CFPackages/doc-123'
      })

      expect(result.docId).toBe('doc-123')
      expect(mockApiClient.fetchCFPackage).toHaveBeenCalledWith(
        'https://example.org/ims/case/v1p1/CFPackages/doc-123',
        undefined
      )
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedExtensions = savedPkg.document.toJSON().extensions
      expect(savedExtensions['ext:opencase'].sourcePackageURI).toBe(
        'https://example.org/ims/case/v1p1/CFPackages/doc-123'
      )
    })

    it('mints a storage key independent of the document identifier — never inferred from the (possibly reused-later) sourcedId', async () => {
      mockApiClient.fetchCFPackage.mockResolvedValue({
        CFPackage: { CFDocument: cfDocument, CFItems: [], CFAssociations: [], CFRubrics: [] }
      })

      await importFramework.execute({
        tenantId,
        caseVersion,
        endpointUrl: 'https://example.org/ims/case/v1p1/CFPackages/doc-123'
      })

      const storageKey = mockRepository.saveNewVersion.mock.calls[0][3]
      expect(storageKey).toBeDefined()
      expect(storageKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(storageKey).not.toBe('doc-123')
    })

    it('imports from a directly provided CFPackage payload (v1.1 wrapped shape)', async () => {
      const result = await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: {
          CFPackage: { CFDocument: cfDocument, CFItems: [], CFAssociations: [], CFRubrics: [] }
        }
      })

      expect(result.docId).toBe('doc-123')
      expect(mockApiClient.fetchCFPackage).not.toHaveBeenCalled()
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    })

    it('imports from a directly provided CFPackage payload (v1.0 flat shape)', async () => {
      const result = await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: { CFDocument: cfDocument, CFItems: [], CFAssociations: [], CFRubrics: [] }
      })

      expect(result.docId).toBe('doc-123')
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    })

    it('marks pasted JSON as a pristine mirror without a sourcePackageURI (no known source URL)', async () => {
      await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: { CFDocument: cfDocument }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedExtensions = savedPkg.document.toJSON().extensions
      expect(savedExtensions?.['ext:opencase']?.sourcePackageURI).toBeUndefined()
      expect(savedExtensions?.['ext:opencase']?.isModifiedFromSource).toBe(false)
    })

    it('preserves the source uri as-is (does not rewrite it onto this instance) when importing from a URL', async () => {
      const foreignDocument = {
        ...cfDocument,
        uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-123'
      }
      mockApiClient.fetchCFPackage.mockResolvedValue({
        CFPackage: { CFDocument: foreignDocument, CFItems: [], CFAssociations: [], CFRubrics: [] }
      })

      await importFramework.execute({
        tenantId,
        caseVersion,
        endpointUrl: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123'
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.document.toJSON().uri).toBe('https://source.example.org/ims/case/v1p1/CFDocuments/doc-123')
    })

    it('preserves the source uri as-is when importing from pasted JSON', async () => {
      const foreignDocument = {
        ...cfDocument,
        uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-123'
      }

      await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: { CFDocument: foreignDocument }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.document.toJSON().uri).toBe('https://source.example.org/ims/case/v1p1/CFDocuments/doc-123')
    })

    it('accepts a package with extra/unknown fields and does not save them (CGE-59)', async () => {
      await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: {
          CFPackage: {
            CFDocument: {
              ...cfDocument,
              CFPackageURI: { title: 'Pkg', identifier: 'doc-123', uri: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-123' },
              somethingBogus: 'x'
            },
            CFItems: [{
              identifier: 'item-1',
              uri: '/ims/case/v1p1/CFItems/item-1',
              fullStatement: 'Item',
              lastChangeDateTime: '2024-01-01T00:00:00Z',
              notInSpec: 42
            }],
            CFAssociations: [],
            CFDefinitions: {
              CFSubjects: [{ identifier: 's-1', uri: 'u', title: 'Math', hierarchyCode: '1', lastChangeDateTime: 'd', vendorJunk: true }],
              CFMadeUp: []
            },
            totallyUnknownRoot: { a: 1 }
          }
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const doc = savedPkg.document.toJSON()
      expect(doc).not.toHaveProperty('CFPackageURI')
      expect(doc).not.toHaveProperty('somethingBogus')
      expect(savedPkg.items[0].toJSON()).not.toHaveProperty('notInSpec')
      expect(savedPkg.definitions).toEqual({
        CFSubjects: [{ identifier: 's-1', uri: 'u', title: 'Math', hierarchyCode: '1', lastChangeDateTime: 'd' }]
      })
    })

    it('does not add a CFPackageURI when the source has none (CGE-59)', async () => {
      await importFramework.execute({ tenantId, caseVersion, cfPackage: { CFDocument: cfDocument } })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.document.toJSON()).not.toHaveProperty('CFPackageURI')
    })

    it('throws when neither endpointUrl nor cfPackage is provided', async () => {
      await expect(
        importFramework.execute({ tenantId, caseVersion })
      ).rejects.toThrow('Either endpointUrl or cfPackage must be provided')
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
    })

    it('collects schema validation failures as non-fatal warnings for pasted JSON', async () => {
      mockValidator.validate.mockImplementation(() => {
        const error: any = new Error('Schema validation failed')
        error.details = ['CFDocument.title is required']
        throw error
      })

      const result = await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: { CFDocument: cfDocument },
        validateSchema: true,
        schemaName: 'case-v1p1-cfpackage'
      })

      expect(result.validationWarnings).toEqual(['Schema validation failed'])
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
    })

    it('propagates errors from the repository', async () => {
      mockRepository.saveNewVersion.mockRejectedValue(new Error('Repository error'))

      await expect(
        importFramework.execute({ tenantId, caseVersion, cfPackage: { CFDocument: cfDocument } })
      ).rejects.toThrow('Repository error')
    })

    it('throws when the pasted JSON is missing CFDocument', async () => {
      await expect(
        importFramework.execute({ tenantId, caseVersion, cfPackage: { CFItems: [] } })
      ).rejects.toThrow('Invalid CFPackage data: missing CFDocument')
    })

    describe('mistyped string fields (CGE-183)', () => {
      // A real validator with the official schema — the same check every later save must pass.
      const realValidator = () => {
        const v = new JsonSchemaValidator()
        const schemaPath = join(__dirname, '../../../../../schemas/official/case-v1p1-cfpackage.json')
        v.addSchema('case-v1p1-cfpackage', JSON.parse(readFileSync(schemaPath, 'utf-8')))
        return v
      }

      const itemType = (n: number, hierarchyCode: unknown) => ({
        identifier: `00000000-0000-4000-8000-00000000000${n}`,
        uri: `https://example.org/ims/case/v1p1/CFItemTypes/${n}`,
        title: `Type ${n}`,
        description: `Type ${n}`,
        hierarchyCode,
        lastChangeDateTime: '2024-01-01T00:00:00+00:00'
      })

      it('saves numeric hierarchyCodes as strings and still treats the import as a pristine mirror', async () => {
        importFramework = new ImportFramework(mockRepository, mockApiClient, realValidator())

        await importFramework.execute({
          tenantId,
          caseVersion,
          cfPackage: {
            CFDocument: cfDocument,
            CFDefinitions: { CFItemTypes: [itemType(1, '1'), itemType(2, 2), itemType(3, 3)] }
          }
        })

        const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
        expect(savedPkg.definitions?.CFItemTypes?.map((t: any) => t.hierarchyCode)).toEqual(['1', '2', '3'])
        expect(savedPkg.document.toJSON().extensions['ext:opencase'].isModifiedFromSource).toBe(false)
      })

      it('no longer reports the coerced fields as validation warnings', async () => {
        importFramework = new ImportFramework(mockRepository, mockApiClient, realValidator())

        const result = await importFramework.execute({
          tenantId,
          caseVersion,
          cfPackage: { CFDocument: cfDocument, CFDefinitions: { CFItemTypes: [itemType(1, 1)] } },
          validateSchema: true,
          schemaName: 'case-v1p1-cfpackage'
        })

        expect((result.validationWarnings ?? []).join()).not.toMatch(/hierarchyCode/)
      })
    })

    describe('extensions', () => {
      const providerPackage = () => ({
        CFDocument: {
          ...cfDocument,
          extensions: { 'ext:opencase': { publicAccess: true, readOnly: true }, sourceSystem: 'smartschool' }
        },
        CFItems: [{
          identifier: 'item-1',
          uri: '/ims/case/v1p1/CFItems/item-1',
          fullStatement: 'Item 1',
          lastChangeDateTime: '2024-01-01T00:00:00Z',
          extensions: { 'ext:opencase': { colorBand: 'red' }, smartschoolId: 'ss-1' }
        }],
        CFAssociations: [{
          identifier: 'assoc-1',
          uri: '/ims/case/v1p1/CFAssociations/assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { identifier: 'item-1', uri: '/ims/case/v1p1/CFItems/item-1', title: 'Item 1' },
          destinationNodeURI: { identifier: 'doc-123', uri: '/ims/case/v1p1/CFDocuments/doc-123', title: 'Test Document' },
          lastChangeDateTime: '2024-01-01T00:00:00Z',
          extensions: { 'ext:opencase': { originHandle: 'top' } }
        }],
        CFRubrics: [],
        extensions: { syncRunId: 'run-42', 'ext:opencase': { anything: true } }
      })

      const expectProviderExtensionsKeptAndOpenCaseDiscarded = () => {
        const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
        const docOpencase = savedPkg.document.toJSON().extensions['ext:opencase']

        expect(savedPkg.document.toJSON().extensions.sourceSystem).toBe('smartschool')
        // Only server-injected provenance survives — nothing from the import file.
        expect(docOpencase.isModifiedFromSource).toBe(false)
        expect(docOpencase).not.toHaveProperty('publicAccess')
        expect(docOpencase).not.toHaveProperty('readOnly')

        expect(savedPkg.items[0].toJSON().extensions).toEqual({ smartschoolId: 'ss-1' })
        expect(savedPkg.associations[0].toJSON().extensions).toBeUndefined()
        expect(savedPkg.extensions).toEqual({ syncRunId: 'run-42' })
      }

      it('keeps provider extensions and discards ext:opencase when importing pasted JSON', async () => {
        await importFramework.execute({ tenantId, caseVersion, cfPackage: { CFPackage: providerPackage() } })
        expectProviderExtensionsKeptAndOpenCaseDiscarded()
      })

      it('keeps provider extensions and discards ext:opencase when importing from a URL', async () => {
        mockApiClient.fetchCFPackage.mockResolvedValue({ CFPackage: providerPackage() } as any)
        await importFramework.execute({ tenantId, caseVersion, endpointUrl: 'https://example.org/ims/case/v1p1/CFPackages/doc-123' })
        expectProviderExtensionsKeptAndOpenCaseDiscarded()
      })
    })
  })
})
