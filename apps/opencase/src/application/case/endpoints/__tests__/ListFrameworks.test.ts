import { ListFrameworks } from '../ListFrameworks'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { DocumentMetadata } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('ListFrameworks', () => {
  let mockStore: jest.Mocked<FileFrameworkStore>
  let listFrameworks: ListFrameworks

  beforeEach(() => {
    mockStore = {
      getAllDocuments: jest.fn()
    } as any

    listFrameworks = new ListFrameworks(mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'

    it('should list all frameworks for a tenant across all versions', async () => {
      const v1p1Docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-1',
          title: 'Framework 1',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/doc-1/doc-1_v0001.json',
          language: 'en',
          frameworkType: 'Competency',
          subject: 'Math',
          version: '1.0'
        },
        {
          sourcedId: 'doc-2',
          title: 'Framework 2',
          lastChangeDateTime: new Date('2024-02-01T00:00:00Z'),
          currentFile: 'frameworks/doc-2/doc-2_v0001.json'
        }
      ]

      const v1p0Docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-3',
          title: 'Framework 3',
          lastChangeDateTime: new Date('2024-03-01T00:00:00Z'),
          currentFile: 'frameworks/doc-3/doc-3_v0001.json'
        }
      ]

      mockStore.getAllDocuments
        .mockReturnValueOnce(v1p0Docs) // For 1.0 (processed first)
        .mockReturnValueOnce(v1p1Docs) // For 1.1 (processed second)

      const result = await listFrameworks.execute({
        tenantId
      })

      expect(mockStore.getAllDocuments).toHaveBeenCalledWith(tenantId, '1.0')
      expect(mockStore.getAllDocuments).toHaveBeenCalledWith(tenantId, '1.1')
      expect(result.frameworks).toHaveLength(3)
      expect(result.total).toBe(3)
      expect(result.tenantId).toBe(tenantId)
      expect(result.frameworks[0].sourcedId).toBe('doc-3')
      expect(result.frameworks[0].caseVersion).toBe('1.0')
      expect(result.frameworks[2].caseVersion).toBe('1.1')
    })

    it('should filter by caseVersion when provided', async () => {
      const v1p1Docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-1',
          title: 'Framework 1',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/doc-1/doc-1_v0001.json'
        }
      ]

      mockStore.getAllDocuments.mockReturnValue(v1p1Docs)

      const result = await listFrameworks.execute({
        tenantId,
        caseVersion: '1.1'
      })

      expect(mockStore.getAllDocuments).toHaveBeenCalledTimes(1)
      expect(mockStore.getAllDocuments).toHaveBeenCalledWith(tenantId, '1.1')
      expect(result.frameworks).toHaveLength(1)
      expect(result.frameworks[0].caseVersion).toBe('1.1')
    })

    it('should return empty array when no frameworks exist', async () => {
      mockStore.getAllDocuments
        .mockReturnValueOnce([]) // For 1.1
        .mockReturnValueOnce([]) // For 1.0

      const result = await listFrameworks.execute({
        tenantId
      })

      expect(result.frameworks).toEqual([])
      expect(result.total).toBe(0)
      expect(result.tenantId).toBe(tenantId)
    })

    it('should include all metadata fields', async () => {
      const docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-1',
          title: 'Framework 1',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/doc-1/doc-1_v0001.json',
          language: 'en',
          frameworkType: 'Competency',
          subject: 'Math',
          version: '2.0'
        }
      ]

      mockStore.getAllDocuments
        .mockReturnValueOnce([]) // For 1.0
        .mockReturnValueOnce(docs) // For 1.1

      const result = await listFrameworks.execute({
        tenantId
      })

      expect(result.frameworks[0]).toMatchObject({
        sourcedId: 'doc-1',
        title: 'Framework 1',
        caseVersion: '1.1',
        language: 'en',
        frameworkType: 'Competency',
        subject: 'Math',
        version: '2.0',
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      })
    })

    it('should filter out archived frameworks (Retired) by default', async () => {
      const docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-1',
          title: 'Active Framework',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/doc-1/doc-1_v0001.json',
          adoptionStatus: 'Implemented'
        },
        {
          sourcedId: 'doc-2',
          title: 'Retired Framework',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'frameworks/doc-2/doc-2_v0001.json',
          adoptionStatus: 'Retired'
        },
        {
          sourcedId: 'doc-3',
          title: 'Deprecated Framework',
          lastChangeDateTime: new Date('2024-01-03T00:00:00Z'),
          currentFile: 'frameworks/doc-3/doc-3_v0001.json',
          adoptionStatus: 'Deprecated'
        }
      ]

      mockStore.getAllDocuments
        .mockReturnValueOnce([]) // For 1.0
        .mockReturnValueOnce(docs) // For 1.1

      const result = await listFrameworks.execute({
        tenantId
      })

      expect(result.frameworks).toHaveLength(1)
      expect(result.frameworks[0].sourcedId).toBe('doc-1')
    })

    it('should include archived frameworks when includeArchived is true', async () => {
      const docs: DocumentMetadata[] = [
        {
          sourcedId: 'doc-1',
          title: 'Active Framework',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'frameworks/doc-1/doc-1_v0001.json',
          adoptionStatus: 'Implemented'
        },
        {
          sourcedId: 'doc-2',
          title: 'Retired Framework',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'frameworks/doc-2/doc-2_v0001.json',
          adoptionStatus: 'Retired'
        }
      ]

      mockStore.getAllDocuments
        .mockReturnValueOnce([]) // For 1.0
        .mockReturnValueOnce(docs) // For 1.1

      const result = await listFrameworks.execute({
        tenantId,
        includeArchived: true
      })

      expect(result.frameworks).toHaveLength(2)
    })
  })
})

