import { DeleteCFAssociation } from '../DeleteCFAssociation'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'

describe('DeleteCFAssociation', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let deleteCFAssociation: DeleteCFAssociation

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockStore = {
      getDocumentIdForAssociation: jest.fn(),
      removeAssociationFromIndex: jest.fn()
    } as any

    deleteCFAssociation = new DeleteCFAssociation(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const assocId = 'assoc-123'

    it('should delete association successfully', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(docId)

      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const assocToDelete = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: assocId,
        uri: `/ims/case/v1p1/CFAssociations/${assocId}`,
        originNodeURI: {
          title: 'CFItem',
          identifier: 'item-1',
          uri: `/ims/case/v1p1/CFItems/item-1`
        },
        destinationNodeURI: {
          title: 'CFItem',
          identifier: 'item-2',
          uri: `/ims/case/v1p1/CFItems/item-2`
        },
        associationType: 'isChildOf',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const assocToKeep = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'assoc-other',
        uri: `/ims/case/v1p1/CFAssociations/assoc-other`,
        originNodeURI: {
          title: 'CFItem',
          identifier: 'item-3',
          uri: `/ims/case/v1p1/CFItems/item-3`
        },
        destinationNodeURI: {
          title: 'CFItem',
          identifier: 'item-4',
          uri: `/ims/case/v1p1/CFItems/item-4`
        },
        associationType: 'isChildOf',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [assocToDelete, assocToKeep],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await deleteCFAssociation.execute({
        tenantId,
        caseVersion,
        sourcedId: assocId
      })

      expect(mockStore.getDocumentIdForAssociation).toHaveBeenCalledWith(tenantId, caseVersion, assocId)
      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockStore.removeAssociationFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, assocId)
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.associations).toHaveLength(1)
      expect(savedPkg.associations[0].sourcedId).toBe('assoc-other')
    })

    it('should throw error when association not found in index', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(null)

      await expect(
        deleteCFAssociation.execute({
          tenantId,
          caseVersion,
          sourcedId: assocId
        })
      ).rejects.toThrow(`CFAssociation with sourcedId ${assocId} not found`)
    })

    it('should throw error when association not found in package', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(docId)

      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await expect(
        deleteCFAssociation.execute({
          tenantId,
          caseVersion,
          sourcedId: assocId
        })
      ).rejects.toThrow(`CFAssociation with sourcedId ${assocId} not found`)
    })
  })
})

