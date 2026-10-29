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
        CFDocuments: [],
        total: 0
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
        ]),
        total: 2
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
        CFDocuments: expect.arrayContaining([
          expect.objectContaining({ identifier: 'doc-2' }),
          expect.objectContaining({ identifier: 'doc-3' }),
          expect.objectContaining({ identifier: 'doc-4' }),
          expect.objectContaining({ identifier: 'doc-5' }),
          expect.objectContaining({ identifier: 'doc-6' })
        ]),
        total: 10
      })
      expect(result).not.toHaveProperty('limit')
      expect(result).not.toHaveProperty('offset')
      expect(result.CFDocuments).toHaveLength(5)
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

      expect(result.CFDocuments[0].title).toBe('A Document')
      expect(result.CFDocuments[1].title).toBe('B Document')
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

      expect(result.CFDocuments).toHaveLength(1)
      expect(result.CFDocuments[0].title).toBe('Mathematics Framework')
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

      expect(result.CFDocuments[0]).toEqual({
        identifier: 'doc-1',
        title: 'Test Document'
      })
    })

    it('should filter out archived documents by default (using server-level archived flag)', async () => {
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
          title: 'Archived Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json',
          adoptionStatus: 'Implemented',
          openCaseExtensions: { archived: true }
        },
        {
          sourcedId: 'doc-3',
          title: 'Retired but not archived Document',
          lastChangeDateTime: new Date('2024-01-03T00:00:00Z'),
          currentFile: 'file3.json',
          adoptionStatus: 'Retired'
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion
      })

      // Only the server-level archived document should be filtered out.
      // Retired documents without archived flag should still appear.
      expect(result.CFDocuments).toHaveLength(2)
      expect(result.CFDocuments.map((d: any) => d.identifier)).toEqual(['doc-1', 'doc-3'])
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
          title: 'Archived Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file2.json',
          adoptionStatus: 'Implemented',
          openCaseExtensions: { archived: true }
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({
        tenantId,
        caseVersion,
        includeArchived: true
      })

      expect(result.CFDocuments).toHaveLength(2)
    })

    it('should serve archived only inside ext:opencase, never as a top-level CFDocument field', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Archived Document',
          lastChangeDateTime: new Date('2024-01-02T00:00:00Z'),
          currentFile: 'file1.json',
          openCaseExtensions: { archived: true }
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.1' ? documents as any : []))

      const v1p1 = await getAllCFDocuments.execute({ tenantId, caseVersion: '1.1', includeArchived: true })
      expect(v1p1.CFDocuments[0]).not.toHaveProperty('archived')
      expect(v1p1.CFDocuments[0].extensions['ext:opencase'].archived).toBe(true)

      const v1p0 = await getAllCFDocuments.execute({ tenantId, caseVersion: '1.0', includeArchived: true })
      expect(v1p0.CFDocuments[0]).not.toHaveProperty('archived')
      expect(v1p0.CFDocuments[0]).not.toHaveProperty('extensions')
    })

    it('should nest the complete, untransformed ext:opencase object under extensions for CASE 1.1', async () => {
      // Includes fields (importedAt, layout, edgeType) that are NOT modeled as their own
      // DocumentMetadata properties — they must still be served verbatim, unmodified.
      const openCaseExtensions = {
        sourcePackageURI: 'https://standards.example.org/ims/case/v1p1/CFPackages/abc',
        isModifiedFromSource: true,
        importedAt: '2026-09-17T14:55:51.931Z',
        layout: { x: -200, y: -80, w: 400, h: 160 },
        edgeType: 'default'
      }
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Mirrored Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json',
          openCaseExtensions
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({ tenantId, caseVersion })

      expect(result.CFDocuments[0].extensions).toEqual({ 'ext:opencase': openCaseExtensions })
    })

    it('should derive CFPackageURI from mirror/fork state (CGE-59)', async () => {
      const source = 'https://standards.example.org/ims/case/v1p1/CFPackages/mirror'
      const documents = [
        { sourcedId: 'mirror', title: 'Mirror', lastChangeDateTime: new Date('2024-01-01T00:00:00Z'), currentFile: 'a.json',
          openCaseExtensions: { isModifiedFromSource: false, sourcePackageURI: source } },
        { sourcedId: 'fork', title: 'Fork', lastChangeDateTime: new Date('2024-01-01T00:00:00Z'), currentFile: 'b.json',
          openCaseExtensions: { isModifiedFromSource: true, sourcePackageURI: source } }
      ]
      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.1' ? documents as any : []))

      const result = await getAllCFDocuments.execute({ tenantId, caseVersion })
      const byId = Object.fromEntries(result.CFDocuments.map((d: any) => [d.identifier, d]))

      expect(byId.mirror.CFPackageURI.uri).toBe(source)
      expect(byId.fork.CFPackageURI.uri).toBe('/ims/case/v1p1/CFPackages/fork')
    })

    it('should omit the extensions block entirely for CASE 1.0', async () => {
      const documents = [
        {
          sourcedId: 'doc-1',
          title: 'Mirrored Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file1.json',
          openCaseExtensions: { sourcePackageURI: 'https://standards.example.org/ims/case/v1p1/CFPackages/abc' }
        }
      ]

      mockStore.getAllDocuments.mockImplementation((_: any, v: any) => (v === '1.0' ? documents as any : []))

      const result = await getAllCFDocuments.execute({ tenantId, caseVersion: '1.0' })

      expect(result.CFDocuments[0]).not.toHaveProperty('extensions')
    })
  })
})













