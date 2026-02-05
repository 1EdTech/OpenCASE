import { GetCFItemType } from '../GetCFItemType'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetCFItemType', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFItemType: GetCFItemType

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDefinitionById: jest.fn()
    } as any

    getCFItemType = new GetCFItemType(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const itemTypeId = 'itemtype-123'

    it('should return null when item type is not found', async () => {
      mockStore.getDefinitionById.mockReturnValue(null as any)

      const result = await getCFItemType.execute({ tenantId, caseVersion, sourcedId: itemTypeId })

      expect(result).toBeNull()
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFItemTypes', itemTypeId)
    })

    it('should return CFItemType when found', async () => {
      const itemType = {
        identifier: itemTypeId,
        title: 'Test Item Type',
        description: 'Test Description',
        hierarchyCode: '01',
        uri: '/ims/case/v1p1/CFItemTypes/itemtype-123',
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: itemType,
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      } as any)

      const result = await getCFItemType.execute({ tenantId, caseVersion, sourcedId: itemTypeId })

      expect(result).toEqual({
        CFItemType: itemType
      })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFItemTypes', itemTypeId)
    })
  })
})













