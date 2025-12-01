import { Request, Response, NextFunction } from 'express';
import { makeAuthMiddleware } from '../auth';
import { JwtVerifier } from '../../../../infrastructure/auth/JwtVerifier';

describe('makeAuthMiddleware', () => {
  let mockVerifier: jest.Mocked<JwtVerifier>;
  let middleware: (req: Request, res: Response, next: NextFunction) => void;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    mockVerifier = {
      verify: jest.fn()
    } as any;

    middleware = makeAuthMiddleware(mockVerifier);

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      header: jest.fn()
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson
    };

    mockNext = jest.fn();
  });

  describe('authentication', () => {
    it('should call next when token is valid', () => {
      const token = 'valid-token';
      const payload = { sub: 'user-123', tenantId: 'tenant-1' };

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`);
      mockVerifier.verify.mockReturnValue(payload as any);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifier.verify).toHaveBeenCalledWith(token);
      expect((mockRequest as any).tenantId).toBe('tenant-1');
      expect((mockRequest as any).user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('should use default tenantId when not in token', () => {
      const token = 'valid-token';
      const payload = { sub: 'user-123' };

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`);
      mockVerifier.verify.mockReturnValue(payload as any);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).tenantId).toBe('demo');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      (mockRequest.header as jest.Mock).mockReturnValue(undefined);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      (mockRequest.header as jest.Mock).mockReturnValue('Invalid token');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`);
      mockVerifier.verify.mockImplementation(() => {
        throw error;
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer header', () => {
      const token = 'test-token-123';
      const payload = { sub: 'user-123' };

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`);
      mockVerifier.verify.mockReturnValue(payload as any);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifier.verify).toHaveBeenCalledWith(token);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

