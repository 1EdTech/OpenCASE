import { Request, Response } from 'express';
import { FrameworksController } from '../FrameworksController';
import { CreateFramework } from '../../../../../application/case/commands/CreateFramework';

describe('FrameworksController', () => {
  let controller: FrameworksController;
  let mockCreateFramework: jest.Mocked<CreateFramework>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    mockCreateFramework = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any;

    controller = new FrameworksController(mockCreateFramework);

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
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson
    };
  });

  describe('create', () => {
    it('should create framework successfully', async () => {
      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({ status: 'created' });
    });

    it('should default to caseVersion 1.1 when not provided', async () => {
      mockRequest.query = {};

      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      });
    });

    it('should use caseVersion from query', async () => {
      mockRequest.query = { caseVersion: '1.0' };

      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.0',
        payload: mockRequest.body
      });
    });

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
      };

      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockCreateFramework.execute).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        caseVersion: '1.1',
        payload: mockRequest.body
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
    });

    it('should handle errors from command', async () => {
      const error = new Error('Validation error');
      mockCreateFramework.execute.mockRejectedValue(error);

      await expect(
        controller.create(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Validation error');
    });
  });
});

