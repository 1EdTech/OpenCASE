import { Request, Response } from 'express'
import { CFAssociationsManagementController } from '../CFAssociationsManagementController'
import { UpdateCFAssociation } from '../../../../../application/case/endpoints/UpdateCFAssociation'
import { DeleteCFAssociation } from '../../../../../application/case/endpoints/DeleteCFAssociation'

describe('CFAssociationsManagementController', () => {
  let controller: CFAssociationsManagementController
  let mockUpdateCFAssociation: jest.Mocked<UpdateCFAssociation>
  let mockDeleteCFAssociation: jest.Mocked<DeleteCFAssociation>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockUpdateCFAssociation = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    mockDeleteCFAssociation = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new CFAssociationsManagementController(
      mockUpdateCFAssociation,
      mockDeleteCFAssociation
    )

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      params: { tenantId: 'test-tenant', id: 'assoc-123' },
      query: { caseVersion: '1.1' },
      body: {
        sourcedId: 'assoc-123',
        originNodeURI: {
          identifier: 'item-1',
          uri: '/ims/case/v1p1/CFItems/item-1'
        },
        destinationNodeURI: {
          identifier: 'item-2',
          uri: '/ims/case/v1p1/CFItems/item-2'
        },
        associationType: 'isChildOf',
        lastChangeDateTime: '2024-02-01T00:00:00Z'
      }
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('update', () => {
    it('should update association successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(mockUpdateCFAssociation.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'assoc-123',
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
      expect(mockUpdateCFAssociation.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when association not found', async () => {
      const error = new Error('CFAssociation with sourcedId assoc-123 not found')
      mockUpdateCFAssociation.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.update(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFAssociation with sourcedId assoc-123 not found'
      })
    })
  })

  describe('delete', () => {
    it('should delete association successfully', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFAssociation.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'assoc-123'
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
      expect(mockDeleteCFAssociation.execute).not.toHaveBeenCalled()
    })

    it('should return 404 when association not found', async () => {
      const error = new Error('CFAssociation with sourcedId assoc-123 not found')
      mockDeleteCFAssociation.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'CFAssociation with sourcedId assoc-123 not found'
      })
    })
  })
})

