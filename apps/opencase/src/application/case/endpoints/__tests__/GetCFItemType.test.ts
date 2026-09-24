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
      getDefinitionById: jest.fn(),
      getTenantDefinitions: jest.fn()
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

    it('should return a CFItemTypeSet containing just the item type when it has no children', async () => {
      const itemType = {
        identifier: itemTypeId,
        title: 'Test Item Type',
        description: 'Test Description',
        hierarchyCode: '01',
        uri: '/ims/case/v1p1/CFItemTypes/itemtype-123',
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docStorageKey: 'doc-123',
        value: itemType,
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      } as any)
      mockStore.getTenantDefinitions.mockReturnValue({ CFItemTypes: [itemType] } as any)

      const result = await getCFItemType.execute({ tenantId, caseVersion, sourcedId: itemTypeId })

      expect(result).toEqual({ CFItemTypes: [itemType] })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFItemTypes', itemTypeId)
    })

    it('should include children determined by hierarchyCode, sorted', async () => {
      const itemType = { identifier: itemTypeId, title: 'Parent', hierarchyCode: '01' }
      const childB = { identifier: 'child-b', title: 'Child B', hierarchyCode: '01.02' }
      const childA = { identifier: 'child-a', title: 'Child A', hierarchyCode: '01.01' }
      const unrelated = { identifier: 'other', title: 'Unrelated', hierarchyCode: '02' }

      mockStore.getDefinitionById.mockReturnValue({ docStorageKey: 'doc-123', value: itemType } as any)
      mockStore.getTenantDefinitions.mockReturnValue({
        CFItemTypes: [itemType, childB, childA, unrelated]
      } as any)

      const result = await getCFItemType.execute({ tenantId, caseVersion, sourcedId: itemTypeId })

      expect(result).toEqual({ CFItemTypes: [itemType, childA, childB] })
    })
  })
})













