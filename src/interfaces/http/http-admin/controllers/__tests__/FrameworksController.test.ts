import { Request, Response } from 'express'
import { FrameworksController } from '../FrameworksController'
import { CreateFramework } from '../../../../../application/case/endpoints/CreateFramework'
import { DeleteCFDocument } from '../../../../../application/case/endpoints/DeleteCFDocument'
import { ImportFrameworkFromEndpoint } from '../../../../../application/case/endpoints/ImportFrameworkFromEndpoint'

describe('FrameworksController', () => {
  let controller: FrameworksController
  let mockCreateFramework: jest.Mocked<CreateFramework>
  let mockDeleteCFDocument: jest.Mocked<DeleteCFDocument>
  let mockImportFramework: jest.Mocked<ImportFrameworkFromEndpoint>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockCreateFramework = {
      execute: jest.fn().mockResolvedValue({ status: 'created', docId: 'doc-123' })
    } as any

    mockImportFramework = {
      execute: jest.fn().mockResolvedValue({ docId: 'doc-123', version: 1 })
    } as any

    mockDeleteCFDocument = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new FrameworksController(mockCreateFramework, mockImportFramework, mockDeleteCFDocument)

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      params: { tenantId: 'test-tenant' },
      query: { caseVersion: '1.1' },
      body: {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      }
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }
  })

  describe('create', () => {
    it('should create framework successfully', async () => {
      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      })
      expect(responseStatus).toHaveBeenCalledWith(201)
      expect(responseJson).toHaveBeenCalledWith({ status: 'created', docId: 'doc-123' })
    })

    it('should default to caseVersion 1.1 when not provided', async () => {
      mockRequest.query = {}

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      })
    })

    it('should use caseVersion from query', async () => {
      mockRequest.query = { caseVersion: '1.0' }

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.0',
        payload: mockRequest.body
      })
    })

    it('should handle framework with items and associations', async () => {
      mockRequest.body = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [
          { sourcedId: 'item-1', fullStatement: 'Statement 1' }
        ],
        associations: [
          {
            sourcedId: 'assoc-1',
            originNode: 'item-1',
            destinationNode: 'item-2',
            associationType: 'isChildOf'
          }
        ],
        rubrics: [{ id: 'rubric-1' }]
      }

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      })
      expect(responseStatus).toHaveBeenCalledWith(201)
    })

    it('should return 200 when payload is unchanged', async () => {
      mockCreateFramework.execute.mockResolvedValueOnce({ status: 'unchanged', docId: 'doc-123' } as any)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'unchanged', docId: 'doc-123' })
    })

    it('should handle errors from command', async () => {
      const error = new Error('Validation error')
      mockCreateFramework.execute.mockRejectedValue(error)

      await controller.create(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'creation_failed',
        message: 'Validation error'
      })
    })
  })

  describe('delete', () => {
    it('should delete framework successfully', async () => {
      mockRequest.params = { tenantId: 'test-tenant', docId: 'doc-123' } as any

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(mockDeleteCFDocument.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        sourcedId: 'doc-123'
      })
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({ status: 'deleted', docId: 'doc-123' })
    })

    it('should return 404 when framework not found', async () => {
      mockRequest.params = { tenantId: 'test-tenant', docId: 'missing-doc' } as any
      mockDeleteCFDocument.execute.mockRejectedValueOnce(new Error('CFDocument with sourcedId missing-doc not found'))

      await controller.delete(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(404)
    })
  })
})

