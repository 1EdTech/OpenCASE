import { Request, Response } from 'express'
import { TenantsManagementController } from '../TenantsManagementController'
import { ListTenants } from '../../../../../application/case/endpoints/ListTenants'
import { CreateTenant } from '../../../../../application/case/endpoints/CreateTenant'

describe('TenantsManagementController', () => {
  let controller: TenantsManagementController
  let mockListTenants: jest.Mocked<ListTenants>
  let mockCreateTenant: jest.Mocked<CreateTenant>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockListTenants = {
      execute: jest.fn().mockResolvedValue({
        tenants: [
          { tenantId: 'tenant1', hasFrameworks: true },
          { tenantId: 'tenant2', hasFrameworks: false }
        ],
        total: 2
      })
    } as any

    mockCreateTenant = {
      execute: jest.fn().mockResolvedValue({
        tenantId: 'new-tenant',
        adminAccount: {
          email: 'admin@new-tenant.local',
          password: 'generated-password-123'
        }
      })
    } as any

    controller = new TenantsManagementController(
      mockListTenants,
      mockCreateTenant,
      '/test/data'
    )

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      body: {},
      query: {}
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('list', () => {
    it('should list tenants successfully', async () => {
      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(mockListTenants.execute).toHaveBeenCalledWith({
        baseDataDir: '/test/data'
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        tenants: expect.any(Array),
        total: 2
      })
    })

    it('should handle errors', async () => {
      const error = new Error('List failed')
      mockListTenants.execute.mockRejectedValue(error)

      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(500)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'List failed'
      })
    })
  })

  describe('create', () => {
    it('should create tenant successfully', async () => {
      mockRequest.body = { tenantId: 'new-tenant' }
      mockCreateTenant.execute.mockResolvedValue({
        tenantId: 'new-tenant',
        adminAccount: {
          email: 'admin@new-tenant.local',
          password: 'generated-password-123'
        }
      })

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockCreateTenant.execute).toHaveBeenCalledWith({
        baseDataDir: '/test/data',
        tenantId: 'new-tenant'
      })
      expect(responseStatus).toHaveBeenCalledWith(201)
      expect(responseJson).toHaveBeenCalledWith({
        status: 'created',
        tenantId: 'new-tenant',
        adminAccount: {
          email: 'admin@new-tenant.local',
          password: 'generated-password-123'
        }
      })
    })

    it('should return 400 when tenantId is missing', async () => {
      mockRequest.body = {}

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'tenantId is required in request body'
      })
      expect(mockCreateTenant.execute).not.toHaveBeenCalled()
    })

    it('should return 400 when tenantId has invalid format', async () => {
      mockRequest.body = { tenantId: 'invalid tenant id!' }

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'tenantId must contain only alphanumeric characters, hyphens, and underscores'
      })
      expect(mockCreateTenant.execute).not.toHaveBeenCalled()
    })

    it('should accept valid tenantId formats', async () => {
      const validIds = ['tenant-1', 'tenant_1', 'tenant123', 'Tenant-123_Test']
      
      for (const tenantId of validIds) {
        mockRequest.body = { tenantId }
        mockCreateTenant.execute.mockResolvedValue({
          tenantId,
          adminAccount: {
            email: `admin@${tenantId}.local`,
            password: 'generated-password-123'
          }
        })
        responseStatus.mockClear()
        responseJson.mockClear()

        await controller.create(mockRequest as Request, mockResponse as Response)

        expect(mockCreateTenant.execute).toHaveBeenCalledWith({
          baseDataDir: '/test/data',
          tenantId
        })
        expect(responseStatus).toHaveBeenCalledWith(201)
      }
    })

    it('should return 409 when tenant already exists', async () => {
      mockRequest.body = { tenantId: 'existing-tenant' }
      const error = new Error("Tenant 'existing-tenant' already exists")
      mockCreateTenant.execute.mockRejectedValue(error)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(409)
      expect(responseJson).toHaveBeenCalledWith({
        error: "Tenant 'existing-tenant' already exists"
      })
    })

    it('should return 400 for other errors', async () => {
      mockRequest.body = { tenantId: 'new-tenant' }
      const error = new Error('Creation failed')
      mockCreateTenant.execute.mockRejectedValue(error)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Creation failed'
      })
    })
  })
})

