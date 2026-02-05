import { GetCFAssociationGrouping } from '../GetCFAssociationGrouping'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetCFAssociationGrouping', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFAssociationGrouping: GetCFAssociationGrouping

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDefinitionById: jest.fn()
    } as any

    getCFAssociationGrouping = new GetCFAssociationGrouping(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const groupingId = 'grouping-123'

    it('should return null when grouping is not found', async () => {
      mockStore.getDefinitionById.mockReturnValue(null as any)

      const result = await getCFAssociationGrouping.execute({ tenantId, caseVersion, sourcedId: groupingId })

      expect(result).toBeNull()
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFAssociationGroupings', groupingId)
    })

    it('should return CFAssociationGrouping when found', async () => {
      const grouping = {
        identifier: groupingId,
        title: 'Test Grouping',
        uri: '/ims/case/v1p1/CFAssociationGroupings/grouping-123'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: grouping
      } as any)

      const result = await getCFAssociationGrouping.execute({ tenantId, caseVersion, sourcedId: groupingId })

      expect(result).toEqual({
        CFAssociationGrouping: grouping
      })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFAssociationGroupings', groupingId)
    })
  })
})













