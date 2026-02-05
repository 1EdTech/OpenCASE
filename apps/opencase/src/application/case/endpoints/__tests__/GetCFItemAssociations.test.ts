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
      getDocumentIdForItem: jest.fn(),
      getAllDocuments: jest.fn()
    } as any

    getCFItemAssociations = new GetCFItemAssociations(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const docId = 'doc-123'
    const itemId = 'item-123'

    it('should return null when item is not found in index', async () => {
      mockStore.getDocumentIdForItem.mockReturnValue(null)

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

      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toBeNull()
    })

    it('should return CFAssociationSet with associations for the item', async () => {
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

      mockStore.getDocumentIdForItem.mockReturnValue(docId)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFItemAssociations.execute({ tenantId, caseVersion, sourcedId: itemId })

      expect(result).toEqual({
        CFAssociationSet: {
          CFAssociations: expect.arrayContaining([
            expect.objectContaining({
              identifier: 'assoc-123'
            })
          ])
        }
      })
    })
  })
})













