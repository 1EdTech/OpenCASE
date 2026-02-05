import { Request, Response } from 'express'
import { CFItemsManagementController } from '../CFItemsManagementController'
import { UpdateCFItem } from '../../../../../application/case/endpoints/UpdateCFItem'
import { DeleteCFItem } from '../../../../../application/case/endpoints/DeleteCFItem'

describe('CFItemsManagementController', () => {
  let controller: CFItemsManagementController
  let mockUpdateCFItem: jest.Mocked<UpdateCFItem>
  let mockDeleteCFItem: jest.Mocked<DeleteCFItem>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockUpdateCFItem = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    mockDeleteCFItem = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new CFItemsManagementController(
      mockUpdateCFItem,
      mockDeleteCFItem
    )

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      params: { tenantId: 'test-tenant', id: 'item-123' },
      query: { caseVersion: '1.1' },
      body: {
        sourcedId: 'item-123',
        fullStatement: 'Updated Statement',
        lastChangeDateTime: '2024-02-01T00:00:00Z'
      }
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('update', () => {
    it('should update item successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(mockUpdateCFItem.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'item-123',
        payload: mockRequest.body
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'updated' })
    })

    it('should return 403 when tenant mismatch', async () => {
      ;(mockRequest as any).tenantId = 'different-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Tenant mismatch - authenticated tenant does not match URL parameter'
      })
      expect(mockUpdateCFItem.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when item not found', async () => {
      const error = new Error('CFItem with sourcedId item-123 not found')
      mockUpdateCFItem.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFItem with sourcedId item-123 not found'
      })
    })
  })

  describe('delete', () => {
    it('should delete item successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFItem.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'item-123'
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
      expect(mockDeleteCFItem.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when item not found', async () => {
      const error = new Error('CFItem with sourcedId item-123 not found')
      mockDeleteCFItem.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFItem with sourcedId item-123 not found'
      })
    })
  })
})

