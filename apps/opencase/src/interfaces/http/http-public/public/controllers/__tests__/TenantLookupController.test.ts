import type { Request, Response } from 'express'
import { TenantLookupController } from '../TenantLookupController'

describe('TenantLookupController', () => {
  const makeRes = () => {
    const res: Partial<Response> = {}
    res.status = jest.fn().mockReturnValue(res)
    res.setHeader = jest.fn()
    res.json = jest.fn().mockReturnValue(res)
    return res as Response
  }

  it('always returns 202 even when email is missing', async () => {
    const keycloakAdmin: any = {
      findUserByEmailExact: jest.fn(),
      listClients: jest.fn(),
      getUserClientRoleMappings: jest.fn()
    }
    const c = new TenantLookupController(keycloakAdmin, { clientIdPrefix: 'tenant-' })
    const req = { query: {} } as unknown as Request
    const res = makeRes()

    await c.lookup(req, res, jest.fn() as any)

    expect(res.status).toHaveBeenCalledWith(202)
    expect((res.json as any).mock.calls[0][0]).toEqual({ status: 'accepted' })
  })

  it('returns 202 with tenantId when user has roles on a tenant client', async () => {
    const keycloakAdmin: any = {
      findUserByEmailExact: jest.fn().mockResolvedValue({ id: 'user-1' }),
      listClients: jest.fn().mockResolvedValue([
        { id: 'c1', clientId: 'tenant-demo' },
        { id: 'c2', clientId: 'other' }
      ]),
      getUserClientRoleMappings: jest.fn().mockImplementation(async (_uid: string, cid: string) => {
        if (cid === 'c1') return [{ id: 'r1', name: 'case.read' }]
        return []
      })
    }
    const c = new TenantLookupController(keycloakAdmin, { clientIdPrefix: 'tenant-' })
    const req = { query: { email: 'user@example.com' } } as unknown as Request
    const res = makeRes()

    await c.lookup(req, res, jest.fn() as any)

    expect(res.status).toHaveBeenCalledWith(202)
    expect((res.json as any).mock.calls[0][0]).toEqual({ status: 'accepted', tenantId: 'demo' })
  })
})

