import { UpdateCFItem } from '../UpdateCFItem'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'

describe('UpdateCFItem', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let updateCFItem: UpdateCFItem

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockStore = {
      getDocumentIdForItem: jest.fn()
    } as any

    updateCFItem = new UpdateCFItem(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const itemId = 'item-123'

    it('should update item successfully', async () => {
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

      const existingItem = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Original Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [existingItem],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      const updatedPayload = {
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Updated Statement',
        lastChangeDateTime: '2024-02-01T00:00:00Z',
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      }

      await updateCFItem.execute({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        payload: updatedPayload
      })

      expect(mockStore.getDocumentIdForItem).toHaveBeenCalledWith(tenantId, caseVersion, itemId)
      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.items).toHaveLength(1)
      expect(savedPkg.items[0].sourcedId).toBe(itemId)
    })

    it('should throw error when item not found in index', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(null)

      await expect(
        updateCFItem.execute({
          tenantId,
          caseVersion,
          sourcedId: itemId,
          payload: { sourcedId: itemId, fullStatement: 'Test' }
        })
      ).rejects.toThrow(`CFItem with sourcedId ${itemId} not found`)
    })

    it('should throw error when package not found', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(null)

      await expect(
        updateCFItem.execute({
          tenantId,
          caseVersion,
          sourcedId: itemId,
          payload: { sourcedId: itemId, fullStatement: 'Test' }
        })
      ).rejects.toThrow(`CFPackage for document ${docId} not found`)
    })

    it('should throw error when sourcedId mismatch', async () => {
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
        updateCFItem.execute({
          tenantId,
          caseVersion,
          sourcedId: itemId,
          payload: { sourcedId: 'different-id', fullStatement: 'Test' }
        })
      ).rejects.toThrow('sourcedId in payload must match the URL parameter')
    })

    it('should update only the specified item', async () => {
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

      const item1 = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: 'item-1',
        uri: `/ims/case/v1p1/CFItems/item-1`,
        fullStatement: 'Statement 1',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const item2 = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: 'item-2',
        uri: `/ims/case/v1p1/CFItems/item-2`,
        fullStatement: 'Statement 2',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [item1, item2],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await updateCFItem.execute({
        tenantId,
        caseVersion,
        sourcedId: 'item-1',
        payload: {
          sourcedId: 'item-1',
          uri: `/ims/case/v1p1/CFItems/item-1`,
          fullStatement: 'Updated Statement 1',
          lastChangeDateTime: '2024-02-01T00:00:00Z',
          CFDocumentURI: {
            title: 'CFDocument',
            identifier: docId,
            uri: `/ims/case/v1p1/CFDocuments/${docId}`
          }
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.items).toHaveLength(2)
      expect(savedPkg.items.find(i => i.sourcedId === 'item-1')?.toJSON().fullStatement).toBe('Updated Statement 1')
      expect(savedPkg.items.find(i => i.sourcedId === 'item-2')?.toJSON().fullStatement).toBe('Statement 2')
    })
  })
})













