import { Request, Response } from 'express'
import { MembersManagementController } from '../MembersManagementController'
import type { KeycloakAdminClient } from '../../../../../infrastructure/keycloak/KeycloakAdminClient'

describe('MembersManagementController', () => {
  let controller: MembersManagementController
  let admin: jest.Mocked<KeycloakAdminClient>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock
  let mockResponse: Partial<Response>

  const makeRequest = (overrides: Record<string, unknown> = {}): Request => ({
    tenantId: 'system',
    params: { tenantId: 'system' },
    body: {},
    user: { sub: 'user-1', azp: 'tenant-system' },
    ...overrides
  }) as unknown as Request

  beforeEach(() => {
    admin = {
      findClientByClientIdPublic: jest.fn().mockResolvedValue({ id: 'client-uuid', clientId: 'tenant-system' }),
      ensureTenantMemberRoles: jest.fn().mockResolvedValue(undefined),
      listUsers: jest.fn().mockResolvedValue([]),
      listUsersWithClientRoles: jest.fn().mockResolvedValue([]),
      getUserClientRoleMappings: jest.fn().mockResolvedValue([]),
      isMemberRoleProvisioned: jest.fn().mockResolvedValue(false),
      markMemberRoleProvisioned: jest.fn().mockResolvedValue(undefined),
      setMemberRole: jest.fn().mockResolvedValue(undefined),
      removeClientRoles: jest.fn().mockResolvedValue(undefined)
    } as any

    controller = new MembersManagementController(admin, {
      clientIdPrefix: 'tenant-',
      defaultTenantId: 'system'
    })

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })
    mockResponse = { status: responseStatus, json: responseJson }
  })

  describe('list', () => {
    it('lists every realm user, with a null role for users who have none', async () => {
      admin.listUsers.mockResolvedValue([
        { id: 'u-admin', username: 'admin@x.org', email: 'admin@x.org' },
        { id: 'u-new', username: 'new@x.org', email: 'new@x.org' }
      ])
      admin.listUsersWithClientRoles.mockResolvedValue([
        { id: 'u-admin', username: 'admin@x.org', email: 'admin@x.org', roles: ['admin', 'case.owner', 'case.read', 'case.write'] }
      ])

      await controller.list(makeRequest(), mockResponse as Response, jest.fn())

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        members: [
          {
            userId: 'u-admin',
            email: 'admin@x.org',
            username: 'admin@x.org',
            role: 'admin',
            scopes: ['admin', 'case.owner', 'case.read', 'case.write']
          },
          { userId: 'u-new', email: 'new@x.org', username: 'new@x.org', role: null, scopes: [] }
        ]
      })
    })
  })

  describe('remove', () => {
    it('removes managed roles and marks the user so ensure-self does not restore them', async () => {
      admin.getUserClientRoleMappings.mockResolvedValue([{ name: 'author' }, { name: 'case.read' }, { name: 'other' }])

      await controller.remove(makeRequest({ params: { tenantId: 'system', userId: 'u-1' } }), mockResponse as Response, jest.fn())

      expect(admin.removeClientRoles).toHaveBeenCalledWith('u-1', 'client-uuid', ['author', 'case.read'])
      expect(admin.markMemberRoleProvisioned).toHaveBeenCalledWith('u-1')
      expect(responseStatus).toHaveBeenCalledWith(200)
    })
  })

  describe('ensureSelf', () => {
    it('assigns author to a user with no roles who was never provisioned, without an org_id claim', async () => {
      await controller.ensureSelf(makeRequest(), mockResponse as Response, jest.fn())

      expect(admin.setMemberRole).toHaveBeenCalledWith('user-1', 'client-uuid', ['case.read', 'case.write', 'author'])
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ status: 'assigned', role: 'author' }))
    })

    it('leaves an existing role alone', async () => {
      admin.getUserClientRoleMappings.mockResolvedValue([{ name: 'viewer' }, { name: 'case.read' }])

      await controller.ensureSelf(makeRequest(), mockResponse as Response, jest.fn())

      expect(admin.setMemberRole).not.toHaveBeenCalled()
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ status: 'unchanged', role: 'viewer' }))
    })

    it('does not give a role back to a user whose roles were removed', async () => {
      admin.isMemberRoleProvisioned.mockResolvedValue(true)

      await controller.ensureSelf(makeRequest(), mockResponse as Response, jest.fn())

      expect(admin.setMemberRole).not.toHaveBeenCalled()
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ status: 'unchanged', role: null }))
    })

    it('refuses tokens not issued to the Editor client, such as API keys', async () => {
      await controller.ensureSelf(
        makeRequest({ user: { sub: 'service-account-1', azp: 'system-api-abc123' } }),
        mockResponse as Response,
        jest.fn()
      )

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(admin.setMemberRole).not.toHaveBeenCalled()
    })

    it('refuses tenants other than the configured one', async () => {
      await controller.ensureSelf(
        makeRequest({ tenantId: 'other', params: { tenantId: 'other' } }),
        mockResponse as Response,
        jest.fn()
      )

      expect(responseStatus).toHaveBeenCalledWith(403)
      expect(admin.setMemberRole).not.toHaveBeenCalled()
    })
  })
})
