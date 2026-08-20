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

      expect(result).toEqual(expect.objectContaining({
        identifier: docId,
        title: 'Test Document',
        CFPackageURI: expect.objectContaining({
          identifier: docId
        })
      }))
    })

    it('should include caseVersion for a CASE 1.1 document', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: '1.1',
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const pkg = new CFPackage({ document, items: [], associations: [], rubrics: [] })
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFDocument.execute({ tenantId, caseVersion: '1.1', sourcedId: docId })

      expect(result.caseVersion).toBe('1.1')
    })

    it('should not include caseVersion for a CASE 1.0 document', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: '1.0',
        sourcedId: docId,
        uri: `/ims/case/v1p0/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const pkg = new CFPackage({ document, items: [], associations: [], rubrics: [] })
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFDocument.execute({ tenantId, caseVersion: '1.0', sourcedId: docId })

      expect(result.caseVersion).toBeUndefined()
    })

    it('should not include caseVersion when downconverting a stored 1.1 document to 1.0', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: '1.1',
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const pkg = new CFPackage({ document, items: [], associations: [], rubrics: [] })
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFDocument.execute({
        tenantId,
        caseVersion: '1.0',
        loadVersion: '1.1',
        sourcedId: docId
      })

      expect(result.caseVersion).toBeUndefined()
    })
  })
})













