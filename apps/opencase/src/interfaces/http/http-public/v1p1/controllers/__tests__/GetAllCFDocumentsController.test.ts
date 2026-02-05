import { Request, Response } from 'express'
import { GetAllCFDocumentsControllerV1p1 } from '../GetAllCFDocumentsController'
import { GetAllCFDocuments } from '../../../../../../application/case/endpoints/GetAllCFDocuments'
import { absolutizeCaseUris } from '../../utils/httpUtils'

describe('GetAllCFDocumentsControllerV1p1', () => {
  let controller: GetAllCFDocumentsControllerV1p1
  let mockGetAllCFDocuments: jest.Mocked<GetAllCFDocuments>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockGetAllCFDocuments = {
      execute: jest.fn()
    } as any

    controller = new GetAllCFDocumentsControllerV1p1(mockGetAllCFDocuments)

    responseJson = jest.fn()
    mockResponse = {
      setHeader: jest.fn(),
      end: jest.fn()
    } as any
    responseStatus = jest.fn().mockReturnValue(mockResponse as any)
    ;(mockResponse as any).status = responseStatus
    ;(mockResponse as any).json = responseJson

    mockRequest = {
      query: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost'),
      header: jest.fn().mockReturnValue(undefined)
    }
  })

  describe('getAll', () => {
    it('should return CFDocumentSet when found', async () => {
      const result = {
        CFDocumentSet: {
          CFDocuments: [
            {
              identifier: 'doc-123',
              uri: '/ims/case/v1p1/CFDocuments/doc-123',
              creator: 'Test Creator',
              title: 'Test Document',
              lastChangeDateTime: '2024-01-01T00:00:00.000Z'
            }
          ]
        }
      }

      mockGetAllCFDocuments.execute.mockResolvedValue(result)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(mockGetAllCFDocuments.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        limit: undefined,
        offset: undefined,
        sort: undefined,
        orderBy: undefined,
        filter: undefined,
        fields: undefined,
        includeArchived: false
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith(absolutizeCaseUris(result as any, 'http://localhost'))
    })

    it('should handle query parameters', async () => {
      const result = {
        CFDocumentSet: {
          CFDocuments: []
        },
        total: 10,
        limit: 5,
        offset: 0
      }

      mockGetAllCFDocuments.execute.mockResolvedValue(result)
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = {
        limit: '5',
        offset: '0',
        sort: 'title',
        orderBy: 'asc',
        filter: 'test',
        fields: 'title,identifier'
      }

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(mockGetAllCFDocuments.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        limit: 5,
        offset: 0,
        sort: 'title',
        orderBy: 'asc',
        filter: 'test',
        fields: ['title', 'identifier'],
        includeArchived: false
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
    })

    it('should return 400 for invalid limit', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = { limit: '-1' }

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      )
    })

    it('should return 400 for invalid orderBy', async () => {
      ;(mockRequest as any).tenantId = 'test-tenant'
      mockRequest.query = { orderBy: 'invalid' }

      await controller.getAll(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      )
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockGetAllCFDocuments.execute.mockRejectedValue(error)
      ;(mockRequest as any).tenantId = 'test-tenant'

      await controller.getAll(mockRequest as Request, mockResponse as Response)

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













