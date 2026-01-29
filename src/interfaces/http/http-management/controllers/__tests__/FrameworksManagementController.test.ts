import { Request, Response } from 'express'
import { FrameworksManagementController } from '../FrameworksManagementController'
import { DeleteCFDocument } from '../../../../../application/case/endpoints/DeleteCFDocument'
import { ListFrameworks } from '../../../../../application/case/endpoints/ListFrameworks'

describe('FrameworksManagementController', () => {
  let controller: FrameworksManagementController
  let mockListFrameworks: jest.Mocked<ListFrameworks>
  let mockDeleteCFDocument: jest.Mocked<DeleteCFDocument>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockListFrameworks = {
      execute: jest.fn().mockResolvedValue({
        frameworks: [
          {
            sourcedId: 'doc-1',
            title: 'Framework 1',
            caseVersion: '1.1',
            lastChangeDateTime: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        tenantId: 'test-tenant'
      })
    } as any

    mockDeleteCFDocument = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new FrameworksManagementController(mockListFrameworks, mockDeleteCFDocument)

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      params: { tenantId: 'test-tenant' },
      query: {}
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('list', () => {
    it('should list frameworks successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(mockListFrameworks.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: undefined
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        frameworks: expect.any(Array),
        total: 1,
        tenantId: 'test-tenant'
      })
    })

    it('should filter by caseVersion when provided', async () => {
      mockRequest.query = { caseVersion: '1.0' }
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(mockListFrameworks.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.0'
      })
    })

    it('should return 403 when tenant mismatch', async () => {
      ;(mockRequest as any).tenantId = 'different-tenant'

      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Tenant mismatch - authenticated tenant does not match URL parameter'
      })
      expect(mockListFrameworks.execute).not.toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      const error = new Error('List failed')
      mockListFrameworks.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.list(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'List failed'
      })
    })
  })

  describe('delete', () => {
    it('should delete framework successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.params = { tenantId: 'test-tenant', docId: 'doc-1' } as any

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-1'
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'deleted', docId: 'doc-1' })
    })

    it('should return 403 when tenant mismatch', async () => {
      ;(mockRequest as any).tenantId = 'different-tenant'
      mockRequest.params = { tenantId: 'test-tenant', docId: 'doc-1' } as any

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(mockDeleteCFDocument.execute).not.toHaveBeenCalled()
    })
  })
})













