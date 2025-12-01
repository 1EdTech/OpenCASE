import { Request, Response } from 'express';
import { CFPackagesControllerV1p1 } from '../CFPackagesController';
import { GetCFPackage } from '../../../../../../application/case/queries/GetCFPackage';

describe('CFPackagesControllerV1p1', () => {
  let controller: CFPackagesControllerV1p1;
  let mockGetCFPackage: jest.Mocked<GetCFPackage>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    mockGetCFPackage = {
      execute: jest.fn()
    } as any;

    controller = new CFPackagesControllerV1p1(mockGetCFPackage);

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      params: { id: 'doc-123' },
      header: jest.fn()
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson
    };
  });

  describe('getById', () => {
    it('should return CFPackage when found', async () => {
      const result = {
        CFPackage: {
          CFDocument: { 
            sourcedId: 'doc-123', 
            title: 'Test',
            lastChangeDateTime: '2024-01-01T00:00:00.000Z',
            tenantId: 'test-tenant',
            caseVersion: '1.1' as const
          },
          CFItems: [],
          CFAssociations: [],
          CFRubrics: []
        }
      };

      mockGetCFPackage.execute.mockResolvedValue(result);
      (mockRequest as any).tenantId = 'test-tenant';

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        docId: 'doc-123'
      });
      expect(responseJson).toHaveBeenCalledWith(result);
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('should use default tenantId when not in request', async () => {
      const result = {
        CFPackage: {
          CFDocument: { 
            sourcedId: 'doc-123', 
            title: 'Test',
            lastChangeDateTime: '2024-01-01T00:00:00.000Z',
            tenantId: 'demo',
            caseVersion: '1.1' as const
          },
          CFItems: [],
          CFAssociations: [],
          CFRubrics: []
        }
      };

      mockGetCFPackage.execute.mockResolvedValue(result);
      delete (mockRequest as any).tenantId;

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'demo',
        caseVersion: '1.1',
        docId: 'doc-123'
      });
      expect(responseJson).toHaveBeenCalledWith(result);
    });

    it('should return 404 when package is not found', async () => {
      mockGetCFPackage.execute.mockResolvedValue(null);
      (mockRequest as any).tenantId = 'test-tenant';

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockGetCFPackage.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        docId: 'doc-123'
      });
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ error: 'CFPackage not found' });
    });

    it('should handle errors from query', async () => {
      const error = new Error('Database error');
      mockGetCFPackage.execute.mockRejectedValue(error);
      (mockRequest as any).tenantId = 'test-tenant';

      await expect(
        controller.getById(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });
  });
});

