import { GetCFItemAssociations } from '../GetCFItemAssociations'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'

describe('GetCFItemAssociations', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFItemAssociations: GetCFItemAssociations

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getStorageKeyForItem: jest.fn(),
      getAllDocuments: jest.fn().mockReturnValue([]),
      resolveStorageKey: jest.fn()
    } as any

    getCFItemAssociations = new GetCFItemAssociations(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const itemId = 'item-123'

    it('should return null when item is not found in index', async () => {
      mockStore.getStorageKeyForItem.mockReturnValue(null)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

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

      mockStore.getStorageKeyForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toBeNull()
    })

    it('should return CFItem with associations for the item', async () => {
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

      const association = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'assoc-123',
        uri: '/ims/case/v1p1/CFAssociations/assoc-123',
        associationType: 'isChildOf',
        originNodeURI: {
          title: 'Origin',
          identifier: itemId,
          uri: `/ims/case/v1p1/CFItems/${itemId}`
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
        items: [item],
        associations: [association],
        rubrics: []
      })

      mockStore.getStorageKeyForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toEqual({
        CFItem: expect.objectContaining({
          identifier: itemId,
          fullStatement: 'Test Statement'
        }),
        CFAssociations: expect.arrayContaining([
          expect.objectContaining({
            identifier: 'assoc-123'
          })
        ])
      })
    })

    it('should include cross-framework associations from alignment packages', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Source Framework',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const item = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Test Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: { title: 'Source Framework', identifier: docId, uri: document.toJSON().uri }
      })

      const pkg = new CFPackage({ document, items: [item], associations: [], rubrics: [] })

      // Alignment package linking this framework to a target framework
      const alignDocId = 'align-doc-1'
      const targetDocId = 'target-doc-1'
      const alignDocument = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: alignDocId,
        uri: `/ims/case/v1p1/CFDocuments/${alignDocId}`,
        creator: 'OpenCASE',
        title: 'Alignment: Source → Target',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const crossAssociation = CFAssociation.create({
        tenantId,
        caseVersion,
        sourcedId: 'cross-assoc-1',
        uri: '/ims/case/v1p1/CFAssociations/cross-assoc-1',
        associationType: 'exactMatchOf',
        originNodeURI: { title: 'Origin', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
        destinationNodeURI: { title: 'Target Item', identifier: 'target-item-1', uri: '/ims/case/v1p1/CFItems/target-item-1' },
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const alignPkg = new CFPackage({ document: alignDocument, items: [], associations: [crossAssociation], rubrics: [] })

      mockStore.getStorageKeyForItem.mockReturnValue(docId)
      mockStore.getAllDocuments.mockReturnValue([
        {
          sourcedId: alignDocId,
          title: 'Alignment: Source → Target',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/align-doc-1/align-doc-1_v0001.json',
          frameworkType: 'Alignment',
          archived: false,
          alignmentParticipants: [
            { identifier: docId, uri: `/ims/case/v1p1/CFDocuments/${docId}` },
            { identifier: targetDocId, uri: `/ims/case/v1p1/CFDocuments/${targetDocId}` }
          ]
        }
      ])
      mockStore.resolveStorageKey.mockReturnValue(alignDocId)
      mockRepository.load
        .mockResolvedValueOnce(pkg)        // item's own package
        .mockResolvedValueOnce(alignPkg)   // alignment package

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toEqual({
        CFItem: expect.objectContaining({ identifier: itemId }),
        CFAssociations: expect.arrayContaining([
          expect.objectContaining({ identifier: 'cross-assoc-1' })
        ])
      })
      expect(mockRepository.load).toHaveBeenCalledTimes(2)
      expect(mockRepository.load).toHaveBeenNthCalledWith(2, tenantId, caseVersion, alignDocId)
    })

    it('should not include alignment associations from archived alignment docs', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: docId,
        uri: `/ims/case/v1p1/CFDocuments/${docId}`,
        creator: 'Test Creator',
        title: 'Source Framework',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const item = CFItem.create({
        tenantId,
        caseVersion,
        sourcedId: itemId,
        uri: `/ims/case/v1p1/CFItems/${itemId}`,
        fullStatement: 'Test Statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: { title: 'Source Framework', identifier: docId, uri: document.toJSON().uri }
      })

      const pkg = new CFPackage({ document, items: [item], associations: [], rubrics: [] })

      mockStore.getStorageKeyForItem.mockReturnValue(docId)
      mockStore.getAllDocuments.mockReturnValue([
        {
          sourcedId: 'align-doc-archived',
          title: 'Alignment: Archived',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/align-doc-archived/align-doc-archived_v0001.json',
          frameworkType: 'Alignment',
          archived: true,
          alignmentParticipants: [{ identifier: docId, uri: `/ims/case/v1p1/CFDocuments/${docId}` }]
        }
      ])
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result?.CFAssociations).toHaveLength(0)
      expect(mockRepository.load).toHaveBeenCalledTimes(1) // only own package, not archived alignment
    })
  })
})













