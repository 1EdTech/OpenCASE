import { Request, Response } from 'express';
import { CFPackagesControllerV1p1 } from '../CFPackagesController';
import { GetCFPackage } from '../../../../../../application/case/endpoints/GetCFPackage';
import { absolutizeCaseUris } from '../../utils/httpUtils'

describe('CFPackagesControllerV1p1', () => {
  let controller: CFPackagesControllerV1p1;
  let mockGetCFPackage: jest.Mocked<GetCFPackage>;
  let mockStore: any
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    mockGetCFPackage = {
      execute: jest.fn()
    } as any;

    mockStore = {
      documentExists: jest.fn().mockReturnValue(false)
    }
    controller = new CFPackagesControllerV1p1(mockGetCFPackage, mockStore);

    responseJson = jest.fn();
    mockResponse = {
      setHeader: jest.fn(),
      end: jest.fn()
    } as any
    responseStatus = jest.fn().mockReturnValue(mockResponse as any);
    ;(mockResponse as any).status = responseStatus
    ;(mockResponse as any).json = responseJson

    mockRequest = {
      params: { id: '550e8400-e29b-41d4-a716-446655440000' }, // Valid UUID
      query: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost'),
      header: jest.fn()
    };

    // Ensure auth/header reads don't trigger 304
    ;(mockRequest.header as any).mockReturnValue(undefined)
  });

  describe('getById', () => {
    it('should return CFPackage when found', async () => {
      const result = {
        CFPackage: {
          CFDocument: { 
            identifier: 'doc-123', 
            title: 'Test',
            lastChangeDateTime: '2024-01-01T00:00:00.000Z'
          },
          CFItems: [],
          CFAssociations: [],
          CFRubrics: []
        }
      };

      mockGetCFPackage.execute.mockResolvedValue(result);
      (mockRequest as any).tenantId = 'test-tenant';
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Valid UUID

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        docId: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(absolutizeCaseUris(result, 'http://localhost'));
    });

    it('should use default tenantId when not in request', async () => {
      const result = {
        CFPackage: {
          CFDocument: { 
            identifier: 'doc-123', 
            title: 'Test',
            lastChangeDateTime: '2024-01-01T00:00:00.000Z'
          },
          CFItems: [],
          CFAssociations: [],
          CFRubrics: []
        }
      };

      mockGetCFPackage.execute.mockResolvedValue(result);
      delete (mockRequest as any).tenantId;
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Valid UUID

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'demo',
        caseVersion: '1.1',
        docId: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(absolutizeCaseUris(result, 'http://localhost'));
    });

    it('should return 404 when package is not found', async () => {
      mockGetCFPackage.execute.mockResolvedValue(null);
      (mockRequest as any).tenantId = 'test-tenant';
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Valid UUID

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        docId: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      );
    });

    it('should handle errors from query', async () => {
      const error = new Error('Database error');
      mockGetCFPackage.execute.mockRejectedValue(error);
      (mockRequest as any).tenantId = 'test-tenant';
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Valid UUID

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          imsx_codeMajor: 'failure',
          imsx_severity: 'error'
        })
      );
    });
  });
});

