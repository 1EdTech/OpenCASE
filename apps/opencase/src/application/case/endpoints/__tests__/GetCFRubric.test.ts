import { GetCFRubric } from '../GetCFRubric'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFPackage } from '../../../../domain/case/entities/CFPackage'
import { CFDocument } from '../../../../domain/case/entities/CFDocument'
import { CFRubric } from '../../../../domain/case/entities/CFRubric'

describe('GetCFRubric', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFRubric: GetCFRubric

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getAllDocuments: jest.fn()
    } as any

    getCFRubric = new GetCFRubric(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const rubricId = 'rubric-123'

    it('should return null when rubric is not found', async () => {
      mockStore.getAllDocuments.mockReturnValue([])

      const result = await getCFRubric.execute({ tenantId, caseVersion, sourcedId: rubricId })

      expect(result).toBeNull()
    })

    it('should return CFRubric when found', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      })

      const rubric = CFRubric.fromRaw(tenantId, caseVersion, {
        identifier: rubricId,
        uri: `/ims/case/v1p1/CFRubrics/${rubricId}`,
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        title: 'Test Rubric'
      })

      const pkg = new CFPackage({
        document,
        items: [],
        associations: [],
        rubrics: [rubric]
      })

      mockStore.getAllDocuments.mockReturnValue([
        {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
          currentFile: 'file.json'
        }
      ] as any)
      mockRepository.load.mockResolvedValue(pkg)

      const result = await getCFRubric.execute({ tenantId, caseVersion, sourcedId: rubricId })

      expect(result).toEqual({
        CFRubric: rubric.toJSON()
      })
    })
  })
})













