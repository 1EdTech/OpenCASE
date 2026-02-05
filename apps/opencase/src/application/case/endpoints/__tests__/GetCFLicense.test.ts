import { GetCFLicense } from '../GetCFLicense'
import { CFPackageRepository } from '../../ports/CFPackageRepository'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'

describe('GetCFLicense', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>
  let mockStore: jest.Mocked<FileFrameworkStore>
  let getCFLicense: GetCFLicense

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn()
    } as any

    mockStore = {
      getDefinitionById: jest.fn()
    } as any

    getCFLicense = new GetCFLicense(mockRepository, mockStore)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'
    const caseVersion = '1.1'
    const licenseId = 'license-123'

    it('should return null when license is not found', async () => {
      mockStore.getDefinitionById.mockReturnValue(null as any)

      const result = await getCFLicense.execute({ tenantId, caseVersion, sourcedId: licenseId })

      expect(result).toBeNull()
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFLicenses', licenseId)
    })

    it('should return CFLicense when found', async () => {
      const license = {
        identifier: licenseId,
        title: 'Test License',
        licenseText: 'License text here',
        uri: '/ims/case/v1p1/CFLicenses/license-123',
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      }

      mockStore.getDefinitionById.mockReturnValue({
        docSourcedId: 'doc-123',
        value: license,
        lastChangeDateTime: '2024-01-01T00:00:00.000Z'
      } as any)

      const result = await getCFLicense.execute({ tenantId, caseVersion, sourcedId: licenseId })

      expect(result).toEqual({
        CFLicense: license
      })
      expect(mockStore.getDefinitionById).toHaveBeenCalledWith(tenantId, caseVersion, 'CFLicenses', licenseId)
    })
  })
})













