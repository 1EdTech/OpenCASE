import { Request, Response } from 'express'
import { CFItemsControllerV1p1 } from '../CFItemsController'
import { GetCFItem } from '../../../../../../application/case/endpoints/GetCFItem'
import { absolutizeCaseUris } from '../../utils/httpUtils'

describe('CFItemsControllerV1p1', () => {
  let controller: CFItemsControllerV1p1
  let mockGetCFItem: jest.Mocked<GetCFItem>
  let mockStore: any
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockGetCFItem = {
      execute: jest.fn()
    } as any

    mockStore = {
      resolveItemGlobal: jest.fn().mockReturnValue({ tenantId: 'test-tenant', version: '1.1', docSourcedId: 'doc-123' }),
      isDocumentPublic: jest.fn().mockReturnValue(true),
    }
    controller = new CFItemsControllerV1p1(mockGetCFItem, mockStore)

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
    it('should return CFItem when found', async () => {
      const result = {
        identifier: 'item-123',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: 'Test Statement',
        lastChangeDateTime: '2024-01-01T00:00:00.000Z',
        CFDocumentURI: {
          title: 'CFDocument',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        }
      }

      mockGetCFItem.execute.mockResolvedValue(result)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getById(mockRequest as Request, mockResponse as Response)

      expect(mockGetCFItem.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith(absolutizeCaseUris(result as any, 'http://localhost'))
    })

    it('should return 404 when item is not found', async () => {
      mockStore.resolveItemGlobal.mockReturnValue(null)
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
      mockGetCFItem.execute.mockRejectedValue(error)
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













