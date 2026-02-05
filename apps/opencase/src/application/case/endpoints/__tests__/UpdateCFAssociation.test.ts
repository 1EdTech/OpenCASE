import { UpdateCFAssociation } from '../UpdateCFAssociation'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'

describe('UpdateCFAssociation', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let updateCFAssociation: UpdateCFAssociation

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockStore = {
      getDocumentIdForAssociation: jest.fn()
    } as any

    updateCFAssociation = new UpdateCFAssociation(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const assocId = 'assoc-123'

    it('should update association successfully', async () => {
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

      const existingAssoc = CFAssociation.create({
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

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [existingAssoc],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      const updatedPayload = {
        sourcedId: assocId,
        originNodeURI: {
          title: 'CFItem',
          identifier: 'item-1',
          uri: `/ims/case/v1p1/CFItems/item-1`
        },
        destinationNodeURI: {
          title: 'CFItem',
          identifier: 'item-3',
          uri: `/ims/case/v1p1/CFItems/item-3`
        },
        associationType: 'isRelatedTo',
        lastChangeDateTime: '2024-02-01T00:00:00Z'
      }

      await updateCFAssociation.execute({
        tenantId,
        caseVersion,
        sourcedId: assocId,
        payload: updatedPayload
      })

      expect(mockStore.getDocumentIdForAssociation).toHaveBeenCalledWith(tenantId, caseVersion, assocId)
      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.associations).toHaveLength(1)
      expect(savedPkg.associations[0].sourcedId).toBe(assocId)
    })

    it('should throw error when association not found in index', async () => {
      mockStore.getDocumentIdForAssociation.mockReturnValue(null)

      await expect(
        updateCFAssociation.execute({
          tenantId,
          caseVersion,
          sourcedId: assocId,
          payload: { sourcedId: assocId, associationType: 'isChildOf' }
        })
      ).rejects.toThrow(`CFAssociation with sourcedId ${assocId} not found`)
    })

    it('should throw error when sourcedId mismatch', async () => {
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
        updateCFAssociation.execute({
          tenantId,
          caseVersion,
          sourcedId: assocId,
          payload: { sourcedId: 'different-id', associationType: 'isChildOf' }
        })
      ).rejects.toThrow('sourcedId in payload must match the URL parameter')
    })
  })
})

