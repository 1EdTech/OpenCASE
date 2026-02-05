import { Request, Response } from 'express'
import { CFAssociationsControllerV1p1 } from '../CFAssociationsController'
import { GetCFAssociation } from '../../../../../../application/case/endpoints/GetCFAssociation'
import { absolutizeCaseUris } from '../../utils/httpUtils'

describe('CFAssociationsControllerV1p1', () => {
  let controller: CFAssociationsControllerV1p1
  let mockGetCFAssociation: jest.Mocked<GetCFAssociation>
  let mockStore: any
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockGetCFAssociation = {
      execute: jest.fn()
    } as any

    mockStore = {
      associationExists: jest.fn().mockReturnValue(false)
    }
    controller = new CFAssociationsControllerV1p1(mockGetCFAssociation, mockStore)

    responseJson = jest.fn()
    mockResponse = {
      setHeader: jest.fn(),
      end: jest.fn()
    } as any
    responseStatus = jest.fn().mockReturnValue(mockResponse as any)
    ;(mockResponse as any).status = responseStatus
    ;(mockResponse as any).json = responseJson

    mockRequest = {
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      query: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost'),
      header: jest.fn().mockReturnValue(undefined)
    }
  })

  describe('getById', () => {
    it('should return CFAssociation when found', async () => {
      const result = {
        CFAssociation: {
          identifier: 'assoc-123',
          uri: '/ims/case/v1p1/CFAssociations/assoc-123',
          associationType: 'isChildOf',
          originNodeURI: {
            title: 'Origin',
            identifier: 'item-1',
            uri: '/ims/case/v1p1/CFItems/item-1'
          },
          destinationNodeURI: {
            title: 'Destination',
            identifier: 'item-2',
            uri: '/ims/case/v1p1/CFItems/item-2'
          },
          lastChangeDateTime: '2024-01-01T00:00:00.000Z'
        }
      }

      mockGetCFAssociation.execute.mockResolvedValue(result)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(mockGetCFAssociation.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith(absolutizeCaseUris(result as any, 'http://localhost'))
    })

    it('should return 404 when association is not found', async () => {
      mockGetCFAssociation.execute.mockResolvedValue(null)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      )
    })

    it('should return 404 for invalid UUID', async () => {
      mockRequest.params = { id: 'invalid-uuid' }
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockGetCFAssociation.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(500)
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      )
    })
  })
})













