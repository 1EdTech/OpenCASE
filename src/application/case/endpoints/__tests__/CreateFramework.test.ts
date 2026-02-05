import { CreateFramework } from '../CreateFramework'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'

describe('CreateFramework', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let createFramework: CreateFramework

  beforeEach(() => {
    mockRepository = {
      load: jest.fn().mockResolvedValue(null),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any

    createFramework = new CreateFramework(mockRepository)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'

    it('should create and save a framework with all components', async () => {
      const payload = {
        CFDocument: {
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        CFItems: [
          {
            identifier: 'item-1',
            uri: '/ims/case/v1p1/CFItems/item-1',
            fullStatement: 'Statement 1',
            lastChangeDateTime: '2024-01-01T00:00:00Z',
            CFDocumentURI: {
              title: 'Document',
              identifier: 'doc-123',
              uri: '/ims/case/v1p1/CFDocuments/doc-123'
            }
          },
          {
            identifier: 'item-2',
            uri: '/ims/case/v1p1/CFItems/item-2',
            fullStatement: 'Statement 2',
            lastChangeDateTime: '2024-01-01T00:00:00Z',
            CFDocumentURI: {
              title: 'Document',
              identifier: 'doc-123',
              uri: '/ims/case/v1p1/CFDocuments/doc-123'
            }
          }
        ],
        CFAssociations: [
          {
            identifier: 'assoc-1',
            uri: '/ims/case/v1p1/CFAssociations/assoc-1',
            associationType: 'isChildOf',
            originNodeURI: {
              title: 'Item 1',
              identifier: 'item-1',
              uri: '/ims/case/v1p1/CFItems/item-1'
            },
            destinationNodeURI: {
              title: 'Item 2',
              identifier: 'item-2',
              uri: '/ims/case/v1p1/CFItems/item-2'
            },
            lastChangeDateTime: '2024-01-01T00:00:00Z'
          }
        ],
        CFRubrics: [{
          identifier: 'rubric-1',
          uri: '/ims/case/v1p1/CFRubrics/rubric-1',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }]
      }

      const result = await createFramework.execute({ tenantId, caseVersion, payload })

      expect(result).toEqual({ status: 'created', docId: 'doc-123' })
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]

      expect(savedPkg.document.sourcedId).toBe('doc-123')
      expect(savedPkg.items).toHaveLength(2)
      expect(savedPkg.items[0].sourcedId).toBe('item-1')
      expect(savedPkg.items[1].sourcedId).toBe('item-2')
      expect(savedPkg.associations).toHaveLength(1)
      expect(savedPkg.associations[0].sourcedId).toBe('assoc-1')
      expect(savedPkg.rubrics).toHaveLength(1)
      expect(savedPkg.rubrics[0].identifier).toBe('rubric-1')
    })

    it('should handle missing optional arrays', async () => {
      const payload = {
        CFDocument: {
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      }

      const result = await createFramework.execute({ tenantId, caseVersion, payload })

      expect(result).toEqual({ status: 'created', docId: 'doc-123' })
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]

      expect(savedPkg.items).toEqual([])
      expect(savedPkg.associations).toEqual([])
      expect(savedPkg.rubrics).toEqual([])
    })

    it('should handle empty arrays', async () => {
      const payload = {
        CFDocument: {
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        CFItems: [],
        CFAssociations: [],
        CFRubrics: []
      }

      const result = await createFramework.execute({ tenantId, caseVersion, payload })

      expect(result).toEqual({ status: 'created', docId: 'doc-123' })
      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1)
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2]

      expect(savedPkg.items).toEqual([])
      expect(savedPkg.associations).toEqual([])
      expect(savedPkg.rubrics).toEqual([])
    })

    it('should not publish a new version when payload is unchanged', async () => {
      const payload = {
        CFDocument: {
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        CFItems: [{
          identifier: 'item-1',
          uri: '/ims/case/v1p1/CFItems/item-1',
          fullStatement: 'Statement 1',
          lastChangeDateTime: '2024-01-01T00:00:00Z',
          CFDocumentURI: {
            title: 'Document',
            identifier: 'doc-123',
            uri: '/ims/case/v1p1/CFDocuments/doc-123'
          }
        }],
        CFAssociations: [],
        CFRubrics: [{
          identifier: 'rubric-1',
          uri: '/ims/case/v1p1/CFRubrics/rubric-1',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }]
      }

      // Create the existing package exactly as CreateFramework would create it
      const doc = CFDocument.fromRaw(tenantId, caseVersion as any, payload.CFDocument)
      const docId = doc.sourcedId
      const docJSON = doc.toJSON()
      const docURI = docJSON.uri
      const items = payload.CFItems.map(i => CFItem.fromRaw(tenantId, caseVersion as any, i, docId, docURI))
      const associations = payload.CFAssociations.map(a => CFAssociation.fromRaw(tenantId, caseVersion as any, a))
      const rubrics = payload.CFRubrics.map(r => CFRubric.fromRaw(tenantId, caseVersion as any, r))
      const existingPkg = new CFPackage({ document: doc, items, associations, rubrics, definitions: null })
      mockRepository.load.mockResolvedValueOnce(existingPkg as any)

      const result = await createFramework.execute({ tenantId, caseVersion: caseVersion as any, payload })

      expect(result).toEqual({ status: 'unchanged', docId: 'doc-123' })
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
    })

    it('should propagate errors from repository', async () => {
      const payload = {
        CFDocument: {
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      }

      const error = new Error('Repository error')
      mockRepository.saveNewVersion.mockRejectedValue(error)

      await expect(
        createFramework.execute({ tenantId, caseVersion, payload })
      ).rejects.toThrow('Repository error')
    })

    it('should propagate validation errors from domain entities', async () => {
      const payload = {
        CFDocument: {
          identifier: '', // Invalid: empty identifier
          uri: '/ims/case/v1p1/CFDocuments/',
          title: 'Test Document',
          creator: 'Test Creator',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      }

      await expect(
        createFramework.execute({ tenantId, caseVersion, payload })
      ).rejects.toThrow('CFDocument.sourcedId is required')
    })
  })
})

