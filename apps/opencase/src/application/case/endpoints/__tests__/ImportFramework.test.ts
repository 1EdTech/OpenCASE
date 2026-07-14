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

    it('does not inject source provenance when importing from pasted JSON', async () => {
      await importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage: { CFDocument: cfDocument }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedExtensions = savedPkg.document.toJSON().extensions
      expect(savedExtensions?.['ext:opencase']?.sourcePackageURI).toBeUndefined()
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
  })
})
