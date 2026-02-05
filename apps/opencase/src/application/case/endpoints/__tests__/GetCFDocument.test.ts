import { GetCFDocument } from '../GetCFDocument'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'

describe('GetCFDocument', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let getCFDocument: GetCFDocument

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    getCFDocument = new GetCFDocument(mockRepository)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'

    it('should return null when package is not found', async () => {
      mockRepository.load.mockResolvedValue(null)

      const result = await getCFDocument.execute({ tenantId, caseVersion, sourcedId: docId })

      expect(result).toBeNull()
      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
    })

    it('should return CFDocument when found', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const pkg = new CFPackage({
        document,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFDocument.execute({ tenantId, caseVersion, sourcedId: docId })

      expect(result).toEqual({
        CFDocument: expect.objectContaining({
          identifier: docId,
          title: 'Test Document',
          CFPackageURI: expect.objectContaining({
            identifier: docId
          })
        })
      })
    })
  })
})













