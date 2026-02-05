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
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [
          {
            sourcedId: 'item-1',
            fullStatement: 'Statement 1'
          },
          {
            sourcedId: 'item-2',
            fullStatement: 'Statement 2'
          }
        ],
        associations: [
          {
            sourcedId: 'assoc-1',
            originNode: 'item-1',
            destinationNode: 'item-2',
            associationType: 'isChildOf'
          }
        ],
        rubrics: [{ id: 'rubric-1', type: 'test' }]
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
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
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
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [],
        associations: [],
        rubrics: []
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
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [{ sourcedId: 'item-1', fullStatement: 'Statement 1' }],
        associations: [],
        rubrics: [{ id: 'rubric-1', lastChangeDateTime: '2024-01-01T00:00:00Z' }]
      }

      // Create the existing package exactly as CreateFramework would create it
      // This simulates what CreateFramework does internally
      const doc = CFDocument.fromRaw(tenantId, caseVersion as any, payload.document)
      const docId = doc.sourcedId
      const docJSON = doc.toJSON()
      const docURI = docJSON.uri
      const items = payload.items.map(i => CFItem.fromRaw(tenantId, caseVersion as any, i, docId, docURI))
      const associations = payload.associations.map(a => CFAssociation.fromRaw(tenantId, caseVersion as any, a))
      // CreateFramework calls CFRubric.fromRaw(tenantId, caseVersion, r) where r is the raw rubric
      // The raw rubric has { id: 'rubric-1', type: 'test' }, but CFRubric.fromRaw handles 'id' and ignores 'type'
      const rubrics = (payload.rubrics ?? []).map(r => CFRubric.fromRaw(tenantId, caseVersion as any, r))
      const existingPkg = new CFPackage({ document: doc, items, associations, rubrics, definitions: null })
      mockRepository.load.mockResolvedValueOnce(existingPkg as any)

      const result = await createFramework.execute({ tenantId, caseVersion: caseVersion as any, payload })

      expect(result).toEqual({ status: 'unchanged', docId: 'doc-123' })
      expect(mockRepository.saveNewVersion).not.toHaveBeenCalled()
    })

    it('should propagate errors from repository', async () => {
      const payload = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
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
        document: {
          sourcedId: '', // Invalid: empty sourcedId
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      }

      await expect(
        createFramework.execute({ tenantId, caseVersion, payload })
      ).rejects.toThrow('CFDocument.sourcedId is required')
    })
  })
})

