import { GetCFItem } from '../GetCFItem'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'

describe('GetCFItem', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFItem: GetCFItem

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDocumentIdForItem: jest.fn(),
      getAllDocuments: jest.fn()
    } as any

    getCFItem = new GetCFItem(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const itemId = 'item-123'

    it('should return null when item is not found in index', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(null)

      const result = await getCFItem.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toBeNull()
      expect(mockRepository.load).not.toHaveBeenCalled()
    })

    it('should return null when package is not found', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(null)

      const result = await getCFItem.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toBeNull()
    })

    it('should return null when item is not in package', async () => {
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

      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItem.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toBeNull()
    })

    it('should return CFItem when found', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const docURI = document.toJSON().uri

      const item = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Test Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: docId,
          uri: docURI
        }
      })

      const pkg = new CFPackage({
        document,
        items: [item],
        associations: [],
        rubrics: []
      })

      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItem.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toEqual({
        CFItem: expect.objectContaining({
          identifier: itemId,
          fullStatement: 'Test Statement'
        })
      })
    })
  })
})













