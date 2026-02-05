import { DeleteCFItem } from '../DeleteCFItem'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'

describe('DeleteCFItem', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let deleteCFItem: DeleteCFItem

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockStore = {
      getDocumentIdForItem: jest.fn(),
      removeItemFromIndex: jest.fn(),
      removeAssociationFromIndex: jest.fn()
    } as any

    deleteCFItem = new DeleteCFItem(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const itemId = 'item-123'

    it('should delete item and related associations', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(docId)

      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const itemToDelete = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const otherItem = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: 'item-other',
        uri: `/ims/case/v1p1/CFItems/item-other`,
        fullStatement: 'Other Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const assocToDelete = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'assoc-1',
        uri: `/ims/case/v1p1/CFAssociations/assoc-1`,
        originNodeURI: {
          title: 'CFItem',
          identifier: itemId,
          uri: `/ims/case/v1p1/CFItems/${itemId}`
        },
        destinationNodeURI: {
          title: 'CFItem',
          identifier: 'item-other',
          uri: `/ims/case/v1p1/CFItems/item-other`
        },
        associationType: 'isChildOf',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const assocToKeep = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'assoc-2',
        uri: `/ims/case/v1p1/CFAssociations/assoc-2`,
        originNodeURI: {
          title: 'CFItem',
          identifier: 'item-other',
          uri: `/ims/case/v1p1/CFItems/item-other`
        },
        destinationNodeURI: {
          title: 'CFItem',
          identifier: 'item-another',
          uri: `/ims/case/v1p1/CFItems/item-another`
        },
        associationType: 'isChildOf',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [itemToDelete, otherItem],
        associations: [assocToDelete, assocToKeep],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await deleteCFItem.execute({
        tenantId,
        caseVersion,
        sourcedId: itemId
      })

      expect(mockStore.getDocumentIdForItem).toHaveBeenCalledWith(tenantId, caseVersion, itemId)
      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockStore.removeItemFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, itemId)
      expect(mockStore.removeAssociationFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, 'assoc-1')
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.items).toHaveLength(1)
      expect(savedPkg.items[0].sourcedId).toBe('item-other')
      expect(savedPkg.associations).toHaveLength(1)
      expect(savedPkg.associations[0].sourcedId).toBe('assoc-2')
    })

    it('should throw error when item not found in index', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(null)

      await expect(
        deleteCFItem.execute({
          tenantId,
          caseVersion,
          sourcedId: itemId
        })
      ).rejects.toThrow(`CFItem with sourcedId ${itemId} not found`)
    })

    it('should throw error when item not found in package', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(docId)

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
        deleteCFItem.execute({
          tenantId,
          caseVersion,
          sourcedId: itemId
        })
      ).rejects.toThrow(`CFItem with sourcedId ${itemId} not found`)
    })
  })
})

