import { GetCFAssociation } from '../GetCFAssociation'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'

describe('GetCFAssociation', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFAssociation: GetCFAssociation

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDocumentIdForAssociation: jest.fn(),
      getAllDocuments: jest.fn()
    } as any

    getCFAssociation = new GetCFAssociation(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const assocId = 'assoc-123'

    it('should return null when association is not found in index', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(null)

      const result = await getCFAssociation.execute({ tenantId, caseVersion, sourcedId: assocId })

      expect(result).toBeNull()
      expect(mockRepository.load).not.toHaveBeenCalled()
    })

    it('should return null when package is not found', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(null)

      const result = await getCFAssociation.execute({ tenantId, caseVersion, sourcedId: assocId })

      expect(result).toBeNull()
    })

    it('should return null when association is not in package', async () => {
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

      mockStore.getDocumentIdForAssociation.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFAssociation.execute({ tenantId, caseVersion, sourcedId: assocId })

      expect(result).toBeNull()
    })

    it('should return CFAssociation when found', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const association = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: assocId,
        uri: `/ims/case/v1p1/CFAssociations/${assocId}`,
        associationType: 'isChildOf',
        originNodeURI: {
          title: 'Origin',
          identifier: 'item-1',
          uri: '/ims/case/v1p1/CFItems/item-1'
        },
        destinationNodeURI: {
          title: 'Destination',
          identifier: 'item-2',
          uri: '/ims/case/v1p1/CFItems/item-2'
        },
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const pkg = new CFPackage({
        document,
        items: [],
        associations: [association],
        rubrics: []
      })

      mockStore.getDocumentIdForAssociation.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFAssociation.execute({ tenantId, caseVersion, sourcedId: assocId })

      expect(result).toEqual({
        CFAssociation: expect.objectContaining({
          identifier: assocId,
          associationType: 'isChildOf'
        })
      })
    })
  })
})













