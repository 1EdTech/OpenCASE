import { Request, Response, NextFunction } from 'express'
import { makeAuthMiddleware, makeOptionalAuthMiddleware } from '../auth'
import { type JwtPayload } from 'jsonwebtoken'

describe('makeAuthMiddleware', () => {
  let mockVerifier: { verify: jest.Mock<Promise<JwtPayload>, [string]> }
  let middleware: any
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: jest.Mock
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    mockVerifier = {
      verify: jest.fn()
    }

    middleware = makeAuthMiddleware(mockVerifier as any)

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      header: jest.fn()
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }

    mockNext = jest.fn()
  })

  describe('authentication', () => {
    it('should call next when token is valid', async () => {
      const token = 'valid-token'
      const payload = { sub: 'user-123', tenantId: 'tenant-1' };

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
      mockVerifier.verify.mockResolvedValue(payload as any)

      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockVerifier.verify).toHaveBeenCalledWith(token)
      expect((mockRequest as any).tenantId).toBe('tenant-1')
      expect((mockRequest as any).user).toEqual(payload)
      expect(mockNext).toHaveBeenCalled()
      expect(responseStatus).not.toHaveBeenCalled()
    })

    it('should return 401 when Authorization header is missing', async () => {
      (mockRequest.header as jest.Mock).mockReturnValue(undefined)

      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      (mockRequest.header as jest.Mock).mockReturnValue('Invalid token')

      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when token verification fails', async () => {
      const token = 'invalid-token'
      const error = new Error('Invalid token');

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
      mockVerifier.verify.mockRejectedValue(error)

      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid token', message: 'Invalid token' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 if tenantId claim is missing', async () => {
      const token = 'test-token-123'
      const payload = { sub: 'user-123' };

      (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
      mockVerifier.verify.mockResolvedValue(payload as any)

      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid token (missing tenantId)' })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})

describe('makeOptionalAuthMiddleware', () => {
  let mockVerifier: { verify: jest.Mock<Promise<JwtPayload>, [string]> }
  let middleware: any
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: jest.Mock
  let responseJson: jest.Mock
  let responseStatus: jest.Mock
  let responseSetHeader: jest.Mock

  beforeEach(() => {
    mockVerifier = {
      verify: jest.fn()
    }

    middleware = makeOptionalAuthMiddleware(mockVerifier as any)

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })
    responseSetHeader = jest.fn()

    mockRequest = {
      header: jest.fn()
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson,
      setHeader: responseSetHeader
    }

    mockNext = jest.fn()
  })

  it('should treat a request with no Authorization header as anonymous', async () => {
    (mockRequest.header as jest.Mock).mockReturnValue(undefined)

    await middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect((mockRequest as any).isAuthenticated).toBe(false)
    expect(mockNext).toHaveBeenCalled()
    expect(responseStatus).not.toHaveBeenCalled()
  })

  it('should authenticate when the token is valid', async () => {
    const token = 'valid-token'
    const payload = { sub: 'user-123', tenantId: 'tenant-1' };

    (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
    mockVerifier.verify.mockResolvedValue(payload as any)

    await middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect((mockRequest as any).isAuthenticated).toBe(true)
    expect((mockRequest as any).tenantId).toBe('tenant-1')
    expect(mockNext).toHaveBeenCalled()
    expect(responseStatus).not.toHaveBeenCalled()
  })

  it('should treat a valid token missing tenantId as anonymous', async () => {
    const token = 'valid-token'
    const payload = { sub: 'user-123' };

    (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
    mockVerifier.verify.mockResolvedValue(payload as any)

    await middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect((mockRequest as any).isAuthenticated).toBe(false)
    expect(mockNext).toHaveBeenCalled()
    expect(responseStatus).not.toHaveBeenCalled()
  })

  it('should return 401 when an explicitly supplied token fails verification', async () => {
    const token = 'garbage-token'
    const error = new Error('jwt expired');

    (mockRequest.header as jest.Mock).mockReturnValue(`Bearer ${token}`)
    mockVerifier.verify.mockRejectedValue(error)

    await middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseSetHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer error="invalid_token"')
    expect(responseStatus).toHaveBeenCalledWith(401)
    expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid token', message: 'jwt expired' })
    expect(mockNext).not.toHaveBeenCalled()
  })
})

