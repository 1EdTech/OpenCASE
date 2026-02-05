import { Request, Response, NextFunction } from 'express'
import { requireScope } from '../scope'

describe('requireScope', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
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

  it('should call next when required scope is present', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: 'case.read case.admin case.write'
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(responseStatus).not.toHaveBeenCalled()
  })

  it('should return 401 when user is not set', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = undefined

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(401)
    expect(responseJson).toHaveBeenCalledWith({
      error: 'Unauthorized - no user information'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 403 when required scope is not present', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: 'case.read case.write'
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(403)
    expect(responseJson).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: "Required scope 'case.admin' not found in token"
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should handle scope as undefined', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: undefined
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(403)
    expect(responseJson).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: "Required scope 'case.admin' not found in token"
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should handle empty scope string', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: ''
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should match scope exactly', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: 'case.admin case.read'
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should not match partial scope names', () => {
    const middleware = requireScope('case.admin')
    ;(mockRequest as any).user = {
      scope: 'case.administer case.read'
    }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
  })
})













