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
      getDefinitionById: jest.fn(),
      getTenantDefinitions: jest.fn()
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

    it('should return a CFConceptSet containing just the concept when it has no children', async () => {
      const concept = {
        identifier: conceptId,
        title: 'Test Concept',
        hierarchyCode: '1.01',
        uri: '/ims/case/v1p1/CFConcepts/concept-123'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: concept
      } as any)
      mockStore.getTenantDefinitions.mockReturnValue({ CFConcepts: [concept] } as any)

      const result = await getCFConcept.execute({ tenantId, caseVersion, sourcedId: conceptId })

      expect(result).toEqual({ CFConcepts: [concept] })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFConcepts', conceptId)
    })

    it('should include children determined by hierarchyCode, sorted, excluding unrelated siblings', async () => {
      const concept = { identifier: conceptId, title: 'Parent', hierarchyCode: '1.01' }
      const childB = { identifier: 'child-b', title: 'Child B', hierarchyCode: '1.01.02' }
      const childA = { identifier: 'child-a', title: 'Child A', hierarchyCode: '1.01.01' }
      const unrelated = { identifier: 'other', title: 'Unrelated', hierarchyCode: '1.02' }
      const falsePrefixMatch = { identifier: 'not-a-child', title: 'Not a child', hierarchyCode: '1.010' }

      mockStore.getDefinitionById.mockReturnValue({ docSourcedId: 'doc-123', value: concept } as any)
      mockStore.getTenantDefinitions.mockReturnValue({
        CFConcepts: [concept, childB, childA, unrelated, falsePrefixMatch]
      } as any)

      const result = await getCFConcept.execute({ tenantId, caseVersion, sourcedId: conceptId })

      expect(result).toEqual({ CFConcepts: [concept, childA, childB] })
    })
  })
})













