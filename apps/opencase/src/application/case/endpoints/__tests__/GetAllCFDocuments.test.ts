import { GetAllCFDocuments } from '../GetAllCFDocuments'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetAllCFDocuments', () => {
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getAllCFDocuments: GetAllCFDocuments

  beforeEach(() => {
    mockStore = {
      getAllDocuments: jest.fn()
    } as any

    getAllCFDocuments = new GetAllCFDocuments(mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'

    it('should return empty CFDocumentSet when no documents found', async () => {
      mockStore.getAllDocuments.mockReturnValue([])

      const result = await getAllCFDocuments.execute({ tenantId, caseVersion })

      expect(result).toEqual({
        CFDocumentSet: {
          CFDocuments: []
        }
      })
    })

    it('should return CFDocumentSet with documents', async () => {
      const documentsV10 = [
        {
          sourcedId: 'doc-1',
          title: 'Document 1',
          language: 'en',
          frameworkType: 'curriculum',
          subject: 'Mathematics',
          version: '1.0',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json'
        }
      ]
      const documentsV11 = [
        {
          sourcedId: 'doc-2',
          title: 'Document 2',
          language: 'en',
          frameworkType: 'curriculum',
          subject: 'Science',
          version: '1.0',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => {
        if (v === '1.0') return documentsV10 as any
        if (v === '1.1') return documentsV11 as any
        return []
      })

      const result = await getAllCFDocuments.execute({ tenantId, caseVersion })

      expect(result).toEqual({
        CFDocumentSet: {
          CFDocuments: expect.arrayContaining([
            expect.objectContaining({
              identifier: 'doc-1',
              title: 'Document 1',
              caseVersion: '1.0',
              CFPackageURI: expect.objectContaining({
                identifier: 'doc-1'
              })
            }),
            expect.objectContaining({
              identifier: 'doc-2',
              title: 'Document 2',
              caseVersion: '1.1',
              CFPackageURI: expect.objectContaining({
                identifier: 'doc-2'
              })
            })
          ])
        }
      })
    })

    it('should apply pagination', async () => {
      const documents = Array.from({ length: 10 }, (_, i) => ({
        sourcedId: `doc-${i}`,
        title: `Document ${i}`,
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        currentFile: `file${i}.json`
      }))

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        limit: 5,
        offset: 2
      })

      expect(result).toEqual({
        CFDocumentSet: {
          CFDocuments: expect.arrayContaining([
            expect.objectContaining({ identifier: 'doc-2' }),
            expect.objectContaining({ identifier: 'doc-3' }),
            expect.objectContaining({ identifier: 'doc-4' }),
            expect.objectContaining({ identifier: 'doc-5' }),
            expect.objectContaining({ identifier: 'doc-6' })
          ])
        },
        total: 10,
        limit: 5,
        offset: 2
      })
      expect(result.CFDocumentSet.CFDocuments).toHaveLength(5)
    })

    it('should apply sorting', async () => {
      const documents = [
        {
          sourcedId: 'doc-2',
          title: 'B Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json'
        },
        {
          sourcedId: 'doc-1',
          title: 'A Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        sort: 'title',
        orderBy: 'asc'
      })

      expect(result.CFDocumentSet.CFDocuments[0].title).toBe('A Document')
      expect(result.CFDocumentSet.CFDocuments[1].title).toBe('B Document')
    })

    it('should apply filtering', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Mathematics Framework',
          subject: 'Mathematics',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json'
        },
        {
          sourcedId: 'doc-2',
          title: 'Science Framework',
          subject: 'Science',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        filter: 'mathematics'
      })

      expect(result.CFDocumentSet.CFDocuments).toHaveLength(1)
      expect(result.CFDocumentSet.CFDocuments[0].title).toBe('Mathematics Framework')
    })

    it('should apply field selection', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Test Document',
          language: 'en',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        fields: ['identifier', 'title']
      })

      expect(result.CFDocumentSet.CFDocuments[0]).toEqual({
        identifier: 'doc-1',
        title: 'Test Document'
      })
    })

    it('should filter out archived documents (Retired) by default', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Active Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json',
          adoptionStatus: 'Implemented'
        },
        {
          sourcedId: 'doc-2',
          title: 'Retired Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json',
          adoptionStatus: 'Retired'
        },
        {
          sourcedId: 'doc-3',
          title: 'Legacy Deprecated Document',
          lastChangeDateTime: new Date('2024-01-03T00:00:00Z'),
          currentFile: 'file3.json',
          adoptionStatus: 'Deprecated'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion
      })

      expect(result.CFDocumentSet.CFDocuments).toHaveLength(1)
      expect(result.CFDocumentSet.CFDocuments[0].identifier).toBe('doc-1')
    })

    it('should include archived documents when includeArchived is true', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Active Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json',
          adoptionStatus: 'Implemented'
        },
        {
          sourcedId: 'doc-2',
          title: 'Retired Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json',
          adoptionStatus: 'Retired'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        includeArchived: true
      })

      expect(result.CFDocumentSet.CFDocuments).toHaveLength(2)
    })
  })
})













