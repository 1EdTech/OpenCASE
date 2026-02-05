import { UpdateCFDocument } from '../UpdateCFDocument'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../../domain/case/entities/CFRubric'

describe('UpdateCFDocument', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let updateCFDocument: UpdateCFDocument

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    updateCFDocument = new UpdateCFDocument(mockRepository)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'

    it('should update document successfully', async () => {
      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Original Creator',
        title: 'Original Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const existingItem = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: 'item-1',
        uri: `/ims/case/v1p1/CFItems/item-1`,
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
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Updated Creator',
        title: 'Updated Title',
        lastChangeDateTime: '2024-02-01T00:00:00Z'
      }

      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: updatedPayload
      })

      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]

      expect(savedPkg.document.toJSON().title).toBe('Updated Title')
      expect(savedPkg.document.sourcedId).toBe(docId)
      expect(savedPkg.items).toHaveLength(1)
      expect(savedPkg.items[0].sourcedId).toBe('item-1')
    })

    it('should throw error when document not found', async () => {
      mockRepository.load.mockResolvedValue(null)

      await expect(
        updateCFDocument.execute({
          tenantId,
          caseVersion,
          sourcedId: docId,
          payload: { sourcedId: docId, title: 'Test' }
        })
      ).rejects.toThrow(`CFDocument with sourcedId ${docId} not found`)
    })

    it('should throw error when sourcedId mismatch', async () => {
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
        updateCFDocument.execute({
          tenantId,
          caseVersion,
          sourcedId: docId,
          payload: { sourcedId: 'different-id', title: 'Test' }
        })
      ).rejects.toThrow('sourcedId in payload must match the URL parameter')
    })

    it('should preserve existing items, associations, and rubrics', async () => {
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
        sourcedId: 'item-1',
        uri: `/ims/case/v1p1/CFItems/item-1`,
        fullStatement: 'Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`
        }
      })

      const existingAssoc = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'assoc-1',
        uri: `/ims/case/v1p1/CFAssociations/assoc-1`,
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
        items: [existingItem],
        associations: [existingAssoc],
        rubrics: [CFRubric.fromRaw(tenantId, caseVersion, { identifier: 'rubric-1', uri: `/ims/case/v1p1/CFRubrics/rubric-1`, lastChangeDateTime: '2024-01-01T00:00:00Z' })]
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: {
          sourcedId: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`,
          creator: 'Updated Creator',
          title: 'Updated Title',
          lastChangeDateTime: '2024-02-01T00:00:00Z'
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      expect(savedPkg.items).toHaveLength(1)
      expect(savedPkg.associations).toHaveLength(1)
      expect(savedPkg.rubrics).toHaveLength(1)
      expect(savedPkg.rubrics[0].identifier).toBe('rubric-1')
    })

    it('should automatically set statusEndDate when archiving (Retired)', async () => {
      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'Implemented'
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      const beforeDate = new Date().toISOString().split('T')[0]
      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: {
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`,
          creator: 'Creator',
          title: 'Title',
          lastChangeDateTime: new Date().toISOString(),
          adoptionStatus: 'Retired'
        }
      })
      const afterDate = new Date().toISOString().split('T')[0]

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedDoc = savedPkg.document.toJSON()
      expect(savedDoc.adoptionStatus).toBe('Retired')
      expect(savedDoc.statusEndDate).toBeDefined()
      expect(savedDoc.statusEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
      expect(savedDoc.statusEndDate >= beforeDate && savedDoc.statusEndDate <= afterDate).toBe(true)
    })

    it('should automatically set statusEndDate when archiving (legacy Deprecated)', async () => {
      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'Implemented'
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: {
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`,
          creator: 'Creator',
          title: 'Title',
          lastChangeDateTime: new Date().toISOString(),
          adoptionStatus: 'Deprecated'
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedDoc = savedPkg.document.toJSON()
      expect(savedDoc.adoptionStatus).toBe('Deprecated')
      expect(savedDoc.statusEndDate).toBeDefined()
      expect(savedDoc.statusEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
    })

    it('should not override existing statusEndDate when archiving', async () => {
      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'Implemented'
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      const existingEndDate = '2023-12-31'
      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: {
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`,
          creator: 'Creator',
          title: 'Title',
          lastChangeDateTime: new Date().toISOString(),
          adoptionStatus: 'Retired',
          statusEndDate: existingEndDate
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedDoc = savedPkg.document.toJSON()
      expect(savedDoc.statusEndDate).toBe(existingEndDate)
    })

    it('should clear statusEndDate when unarchiving', async () => {
      const existingDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Creator',
        title: 'Title',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'Retired',
        statusEndDate: '2024-01-15'
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        payload: {
          identifier: docId,
          uri: `/ims/case/v1p1/CFDocuments/${docId}`,
          creator: 'Creator',
          title: 'Title',
          lastChangeDateTime: new Date().toISOString(),
          adoptionStatus: 'Implemented'
        }
      })

      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]
      const savedDoc = savedPkg.document.toJSON()
      expect(savedDoc.adoptionStatus).toBe('Implemented')
      expect(savedDoc.statusEndDate).toBeUndefined()
    })
  })
})

