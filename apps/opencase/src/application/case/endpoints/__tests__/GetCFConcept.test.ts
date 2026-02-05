import { GetCFConcept } from '../GetCFConcept'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetCFConcept', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFConcept: GetCFConcept

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDefinitionById: jest.fn()
    } as any

    getCFConcept = new GetCFConcept(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const conceptId = 'concept-123'

    it('should return null when concept is not found', async () => {
      mockStore.getDefinitionById.mockReturnValue(null as any)

      const result = await getCFConcept.execute({ tenantId, caseVersion, sourcedId: conceptId })

      expect(result).toBeNull()
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFConcepts', conceptId)
    })

    it('should return CFConcept when found', async () => {
      const concept = {
        identifier: conceptId,
        title: 'Test Concept',
        uri: '/ims/case/v1p1/CFConcepts/concept-123'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: concept
      } as any)

      const result = await getCFConcept.execute({ tenantId, caseVersion, sourcedId: conceptId })

      expect(result).toEqual({
        CFConcept: concept
      })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFConcepts', conceptId)
    })
  })
})













