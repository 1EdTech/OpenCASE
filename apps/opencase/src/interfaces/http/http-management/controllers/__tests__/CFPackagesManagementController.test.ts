import { Request, Response } from 'express'
import { CFPackagesManagementController } from '../CFPackagesManagementController'
import { DeleteCFDocument } from '../../../../../application/case/endpoints/DeleteCFDocument'
import { RestoreFramework } from '../../../../../application/case/endpoints/RestoreFramework'
import { ListFrameworks } from '../../../../../application/case/endpoints/ListFrameworks'
import { CreateFramework } from '../../../../../application/case/endpoints/CreateFramework'
import { ImportFramework } from '../../../../../application/case/endpoints/ImportFramework'

describe('CFPackagesManagementController', () => {
  let controller: CFPackagesManagementController
  let mockCreateFramework: jest.Mocked<CreateFramework>
  let mockImportFramework: jest.Mocked<ImportFramework>
  let mockListFrameworks: jest.Mocked<ListFrameworks>
  let mockDeleteCFDocument: jest.Mocked<DeleteCFDocument>
  let mockRestoreFramework: jest.Mocked<RestoreFramework>
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
    mockRestoreFramework = { execute: jest.fn() } as any

    controller = new CFPackagesManagementController(
      mockCreateFramework,
      mockImportFramework,
      mockListFrameworks,
      mockDeleteCFDocument,
      mockRestoreFramework
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

  it('restores an archived CFPackage', async () => {
    ;(mockRequest as any).tenantId = 'test-tenant'
    mockRequest.params = { tenantId: 'test-tenant', id: 'doc-1' } as any
    mockRequest.query = { caseVersion: '1.1' }
    mockRestoreFramework.execute.mockResolvedValueOnce(undefined as any)

    await (controller.restore as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockRestoreFramework.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.1',
      sourcedId: 'doc-1'
    })
    expect(responseStatus).toHaveBeenCalledWith(200)
    expect(responseJson).toHaveBeenCalledWith({ status: 'restored', id: 'doc-1' })
  })

  it('imports a framework from an endpointUrl', async () => {
    mockRequest.body = { endpointUrl: 'https://example.org/CFPackages/doc-1' }
    mockImportFramework.execute.mockResolvedValueOnce({ docId: 'doc-1', version: 1 })

    await (controller.import as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockImportFramework.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.1',
      endpointUrl: 'https://example.org/CFPackages/doc-1',
      accessToken: undefined,
      cfPackage: undefined,
      validateSchema: false,
      schemaName: undefined
    })
    expect(responseStatus).toHaveBeenCalledWith(201)
    expect(responseJson).toHaveBeenCalledWith({ status: 'imported', id: 'doc-1', version: 1 })
  })

  it('imports a framework from a pasted cfPackage payload', async () => {
    const cfPackage = { CFDocument: { identifier: 'doc-2' } }
    mockRequest.body = { cfPackage }
    mockImportFramework.execute.mockResolvedValueOnce({ docId: 'doc-2', version: 1 })

    await (controller.import as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockImportFramework.execute).toHaveBeenCalledWith({
      tenantId: 'test-tenant',
      caseVersion: '1.1',
      endpointUrl: undefined,
      accessToken: undefined,
      cfPackage,
      validateSchema: false,
      schemaName: undefined
    })
    expect(responseStatus).toHaveBeenCalledWith(201)
    expect(responseJson).toHaveBeenCalledWith({ status: 'imported', id: 'doc-2', version: 1 })
  })

  it('rejects import when neither endpointUrl nor cfPackage is provided', async () => {
    mockRequest.body = {}

    await (controller.import as any)(mockRequest as Request, mockResponse as Response, next)

    expect(mockImportFramework.execute).not.toHaveBeenCalled()
    expect(responseStatus).toHaveBeenCalledWith(400)
    expect(responseJson).toHaveBeenCalledWith({ error: 'Either endpointUrl or cfPackage is required' })
  })
})

