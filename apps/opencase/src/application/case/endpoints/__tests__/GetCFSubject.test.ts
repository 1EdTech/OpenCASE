import { GetCFSubject } from '../GetCFSubject'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetCFSubject', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFSubject: GetCFSubject

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDefinitionById: jest.fn()
    } as any

    getCFSubject = new GetCFSubject(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const subjectId = 'subject-123'

    it('should return null when subject is not found', async () => {
      mockStore.getDefinitionById.mockReturnValue(null as any)

      const result = await getCFSubject.execute({ tenantId, caseVersion, sourcedId: subjectId })

      expect(result).toBeNull()
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFSubjects', subjectId)
    })

    it('should return CFSubject when found', async () => {
      const subject = {
        identifier: subjectId,
        title: 'Mathematics',
        uri: '/ims/case/v1p1/CFSubjects/subject-123'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: subject
      } as any)

      const result = await getCFSubject.execute({ tenantId, caseVersion, sourcedId: subjectId })

      expect(result).toEqual({
        CFSubject: subject
      })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFSubjects', subjectId)
    })
  })
})













