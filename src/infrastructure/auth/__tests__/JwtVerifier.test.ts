import { JwtVerifier } from '../JwtVerifier';
import jwt from 'jsonwebtoken';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('JwtVerifier', () => {
  let verifier: JwtVerifier;
  const config = {
    issuer: 'test-issuer',
    audience: 'test-audience',
    publicKey: 'test-public-key'
  };

  beforeEach(() => {
    verifier = new JwtVerifier(config);
    jest.clearAllMocks();
  });

  describe('verify', () => {
    it('should verify token with correct options', () => {
      const token = 'test-token';
      const payload = { sub: 'user-123', tenantId: 'tenant-1' };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const result = verifier.verify(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, config.publicKey, {
        algorithms: ['RS256'],
        issuer: config.issuer,
        audience: config.audience
      });
      expect(result).toEqual(payload);
    });

    it('should return JwtPayload when verification succeeds', () => {
      const token = 'valid-token';
      const payload = {
        sub: 'user-123',
        tenantId: 'tenant-1',
        iat: 1234567890,
        exp: 1234567890
      };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const result = verifier.verify(token);

      expect(result).toEqual(payload);
    });

    it('should throw error when token is invalid', () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => verifier.verify(token)).toThrow('Invalid token');
    });

    it('should throw error when issuer does not match', () => {
      const token = 'token';
      const error = new jwt.JsonWebTokenError('Invalid issuer');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => verifier.verify(token)).toThrow();
    });

    it('should throw error when audience does not match', () => {
      const token = 'token';
      const error = new jwt.JsonWebTokenError('Invalid audience');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => verifier.verify(token)).toThrow();
    });
  });
});

