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
      setDocumentArchived: jest.fn(),
      isDocumentArchived: jest.fn().mockReturnValue(false),
      // Identifier === storage key for these tests (no mirror/fork scenario).
      resolveStorageKey: jest.fn((_t: unknown, _v: unknown, identifier: string) => identifier),
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

    it('should archive document by setting archived flag (soft delete)', async () => {
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
      mockStore.isDocumentArchived.mockReturnValue(false)

      await deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId
      })

      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      // Should set the server-level archived flag, NOT mutate adoptionStatus
      expect(mockStore.setDocumentArchived).toHaveBeenCalledWith(tenantId, caseVersion, docId, true)
      expect(mockStore.writeIndexesToDisk).toHaveBeenCalledWith(tenantId, caseVersion)
      // Should NOT create a new version (no content change)
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
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
        adoptionStatus: 'Implemented'
      })

      const existingPkg = new CFPackage({
        document: existingDocument,
        items: [],
        associations: [],
        rubrics: []
      })

      mockRepository.load.mockResolvedValue(existingPkg)
      mockStore.isDocumentArchived.mockReturnValue(true)

      await deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId,
        hardDelete: false
      })

      expect(mockRepository.load).toHaveBeenCalledWith(tenantId, caseVersion, docId)
      expect(mockStore.setDocumentArchived).not.toHaveBeenCalled()
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

