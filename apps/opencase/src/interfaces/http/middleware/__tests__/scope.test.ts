import { Request, Response, NextFunction } from 'express'
import { requireScope, expandScopes, userHasScope } from '../scope'

describe('expandScopes', () => {
  it('expands case.owner to include write and read', () => {
    expect([...expandScopes(['case.owner'])].sort()).toEqual([
      'case.owner',
      'case.read',
      'case.write'
    ])
  })

  it('expands admin membership role to case.owner', () => {
    expect([...expandScopes(['admin'])].sort()).toEqual([
      'admin',
      'case.owner',
      'case.read',
      'case.write'
    ])
  })

  it('expands case.write to include read', () => {
    expect([...expandScopes(['case.write'])].sort()).toEqual([
      'case.read',
      'case.write'
    ])
  })

  it('does not expand case.admin into tenant scopes', () => {
    expect([...expandScopes(['case.admin'])]).toEqual(['case.admin'])
  })
})

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

  it('should allow case.owner to satisfy case.write', () => {
    const middleware = requireScope('case.write')
    ;(mockRequest as any).user = { scope: 'case.owner' }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should allow admin membership role to satisfy case.owner', () => {
    const middleware = requireScope('case.owner')
    ;(mockRequest as any).user = { scope: 'admin' }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should allow case.write to satisfy case.read', () => {
    const middleware = requireScope('case.read')
    ;(mockRequest as any).user = { scope: 'case.write' }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should not allow case.write to satisfy case.owner', () => {
    const middleware = requireScope('case.owner')
    ;(mockRequest as any).user = { scope: 'case.write' }

    middleware(mockRequest as Request, mockResponse as Response, mockNext)

    expect(responseStatus).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
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

  it('userHasScope reads resource_access roles', () => {
    const user = {
      resource_access: {
        'tenant-demo': { roles: ['case.write'] }
      }
    }
    expect(userHasScope(user, 'case.read')).toBe(true)
    expect(userHasScope(user, 'case.write')).toBe(true)
    expect(userHasScope(user, 'case.owner')).toBe(false)
  })
})
