import { Request, Response } from 'express'
import { CFPackagesManagementController } from '../CFPackagesManagementController'
import { DeleteCFDocument } from '../../../../../application/case/endpoints/DeleteCFDocument'
import { ListFrameworks } from '../../../../../application/case/endpoints/ListFrameworks'
import { CreateFramework } from '../../../../../application/case/endpoints/CreateFramework'
import { ImportFrameworkFromEndpoint } from '../../../../../application/case/endpoints/ImportFrameworkFromEndpoint'

describe('CFPackagesManagementController', () => {
  let controller: CFPackagesManagementController
  let mockCreateFramework: jest.Mocked<CreateFramework>
  let mockImportFramework: jest.Mocked<ImportFrameworkFromEndpoint>
  let mockListFrameworks: jest.Mocked<ListFrameworks>
  let mockDeleteCFDocument: jest.Mocked<DeleteCFDocument>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock
  let next: jest.Mock

  beforeEach(() => {
    mockCreateFramework = { execute: jest.fn() } as any
    mockImportFramework = { execute: jest.fn() } as any
    mockListFrameworks = { execute: jest.fn() } as any
    mockDeleteCFDocument = { execute: jest.fn() } as any

    controller = new CFPackagesManagementController(
      mockCreateFramework,
      mockImportFramework,
      mockListFrameworks,
      mockDeleteCFDocument
    )

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      params: { tenantId: 'test-tenant' },
      query: {},
      body: {}
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }

    next = jest.fn()
  })

  it('lists CFPackages (frameworks) with optional caseVersion filter', async () => {
    ;(mockRequest as any).tenantId = 'test-tenant'
    mockRequest.query = { caseVersion: '1.0' }
    mockListFrameworks.execute.mockResolvedValueOnce({ frameworks: [], total: 0, tenantId: 'test-tenant' } as any)

    await (controller.list as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockListFrameworks.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.0',
      includeArchived: false
    })
    expect(responseStatus).toHaveBeenCalledWith(200)
  })

  it('archives a CFPackage by id (soft delete by default)', async () => {
    ;(mockRequest as any).tenantId = 'test-tenant'
    mockRequest.params = { tenantId: 'test-tenant', id: 'doc-1' } as any
    mockRequest.query = { caseVersion: '1.1' }
    mockDeleteCFDocument.execute.mockResolvedValueOnce(undefined as any)

    await (controller.delete as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.1',
      sourcedId: 'doc-1',
      hardDelete: false
    })
    expect(responseStatus).toHaveBeenCalledWith(200)
    expect(responseJson).toHaveBeenCalledWith({ status: 'archived', id: 'doc-1' })
  })

  it('performs hard delete when hardDelete=true', async () => {
    ;(mockRequest as any).tenantId = 'test-tenant'
    mockRequest.params = { tenantId: 'test-tenant', id: 'doc-1' } as any
    mockRequest.query = { caseVersion: '1.1', hardDelete: 'true' }
    mockDeleteCFDocument.execute.mockResolvedValueOnce(undefined as any)

    await (controller.delete as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.1',
      sourcedId: 'doc-1',
      hardDelete: true
    })
    expect(responseStatus).toHaveBeenCalledWith(200)
    expect(responseJson).toHaveBeenCalledWith({ status: 'deleted', id: 'doc-1' })
  })
})

