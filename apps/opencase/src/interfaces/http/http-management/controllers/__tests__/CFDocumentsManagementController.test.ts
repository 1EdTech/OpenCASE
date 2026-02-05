import { Request, Response } from 'express'
import { CFDocumentsManagementController } from '../CFDocumentsManagementController'
import { UpdateCFDocument } from '../../../../../application/case/endpoints/UpdateCFDocument'
import { DeleteCFDocument } from '../../../../../application/case/endpoints/DeleteCFDocument'

describe('CFDocumentsManagementController', () => {
  let controller: CFDocumentsManagementController
  let mockUpdateCFDocument: jest.Mocked<UpdateCFDocument>
  let mockDeleteCFDocument: jest.Mocked<DeleteCFDocument>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockUpdateCFDocument = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    mockDeleteCFDocument = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new CFDocumentsManagementController(
      mockUpdateCFDocument,
      mockDeleteCFDocument
    )

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      params: { tenantId: 'test-tenant', id: 'doc-123' },
      query: { caseVersion: '1.1' },
      body: {
        sourcedId: 'doc-123',
        title: 'Updated Title',
        creator: 'Updated Creator',
        lastChangeDateTime: '2024-02-01T00:00:00Z'
      }
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('update', () => {
    it('should update document successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(mockUpdateCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123',
        payload: mockRequest.body
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'updated' })
    })

    it('should default to caseVersion 1.1 when not provided', async () => {
      mockRequest.query = {}
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(mockUpdateCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123',
        payload: mockRequest.body
      })
    })

    it('should return 403 when tenant mismatch', async () => {
      ;(mockRequest as any).tenantId = 'different-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Tenant mismatch - authenticated tenant does not match URL parameter'
      })
      expect(mockUpdateCFDocument.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when document not found', async () => {
      const error = new Error('CFDocument with sourcedId doc-123 not found')
      mockUpdateCFDocument.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFDocument with sourcedId doc-123 not found'
      })
    })

    it('should return 400 for other errors', async () => {
      const error = new Error('Validation error')
      mockUpdateCFDocument.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Validation error'
      })
    })
  })

  describe('delete', () => {
    it('should archive document successfully (soft delete by default)', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = {}

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123',
        hardDelete: false
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'archived' })
    })

    it('should perform hard delete when hardDelete=true', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = { hardDelete: 'true' }

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123',
        hardDelete: true
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'deleted' })
    })

    it('should perform hard delete when hardDelete=true', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = { hardDelete: 'true' }

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123',
        hardDelete: true
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'deleted' })
    })

    it('should return 403 when tenant mismatch', async () => {
      ;(mockRequest as any).tenantId = 'different-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Tenant mismatch - authenticated tenant does not match URL parameter'
      })
      expect(mockDeleteCFDocument.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when document not found', async () => {
      const error = new Error('CFDocument with sourcedId doc-123 not found')
      mockDeleteCFDocument.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFDocument with sourcedId doc-123 not found'
      })
    })

    it('should return 400 for other errors', async () => {
      const error = new Error('Delete failed')
      mockDeleteCFDocument.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Delete failed'
      })
    })
  })
})

