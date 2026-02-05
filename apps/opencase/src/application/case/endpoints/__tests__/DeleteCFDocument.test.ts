import { DeleteCFDocument } from '../DeleteCFDocument'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'
import fs from 'node:fs/promises'

jest.mock('node:fs/promises')

describe('DeleteCFDocument', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let deleteCFDocument: DeleteCFDocument

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    mockStore = {
      removeDocumentFromIndex: jest.fn(),
      removeItemFromIndex: jest.fn(),
      removeAssociationFromIndex: jest.fn(),
      removeRubricFromIndex: jest.fn(),
      removeDefinitionsFromIndexForDocument: jest.fn(),
      writeIndexesToDisk: jest.fn().mockResolvedValue(undefined),
      getTenantVersionRootDir: jest.fn().mockReturnValue('/data/tenants/test-tenant/v1p1')
    } as any

    deleteCFDocument = new DeleteCFDocument(mockRepository, mockStore)
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'

    it('should archive document by default (soft delete)', async () => {
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

      const assoc = CFAssociation.create({
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
        items: [item1, item2],
        associations: [assoc],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)

      await deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId
      })

      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
      
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2] as CFPackage
      const savedDoc = savedPkg.document.toJSON()
      expect(savedDoc.adoptionStatus).toBe('Retired')
      expect(savedDoc.statusEndDate).toBeDefined()
      expect(savedDoc.statusEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
      
      // Verify all related data is preserved
      expect(savedPkg.items).toHaveLength(2)
      expect(savedPkg.associations).toHaveLength(1)
    })

    it('should throw error when document not found', async () => {
      mockRepository.load.mockResolvedValue(null)

      await expect(
        deleteCFDocument.execute({
          tenantId,
          caseVersion,
          sourcedId: docId
        })
      ).rejects.toThrow(`CFDocument with sourcedId ${docId} not found`)
    })

    it('should not archive if already archived', async () => {
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

      await deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        hardDelete: false
      })

      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
    })

    it('should perform hard delete when hardDelete=true', async () => {
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

      const assoc = CFAssociation.create({
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
        items: [item1],
        associations: [assoc],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)
      ;(fs.rm as jest.Mock).mockResolvedValue(undefined)

      await deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        hardDelete: true
      })

      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockStore.removeDocumentFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockStore.removeItemFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, 'item-1')
      expect(mockStore.removeAssociationFromIndex).toHaveBeenCalledWith(tenantId, caseVersion, 'assoc-1')
      expect(mockStore.writeIndexesToDisk).toHaveBeenCalledWith(tenantId, caseVersion)
      expect(fs.rm).toHaveBeenCalled()
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
    })
  })
})

