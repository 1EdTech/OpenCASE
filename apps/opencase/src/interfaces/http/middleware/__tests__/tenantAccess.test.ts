import type { Request, Response } from 'express'
import { requireMatchingTenant } from '../tenantAccess'

describe('requireMatchingTenant', () => {
  it('returns tenantId when JWT and URL match', () => {
    const req = {
      params: { tenantId: 'demo' },
      tenantId: 'demo'
    } as any as Request
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any as Response

    expect(requireMatchingTenant(req, res)).toBe('demo')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 on mismatch', () => {
    const req = {
      params: { tenantId: 'other' },
      tenantId: 'demo'
    } as any as Request
    const json = jest.fn()
    const res = { status: jest.fn().mockReturnValue({ json }), json } as any as Response

    expect(requireMatchingTenant(req, res)).toBeNull()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
