/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Request, Response, RequestHandler } from 'express'
import { randomBytes } from 'node:crypto'
import type { KeycloakAdminClient } from '../../../../infrastructure/keycloak/KeycloakAdminClient'
import { OidcJwtVerifier } from '../../../../infrastructure/auth/OidcJwtVerifier'
import { requireMatchingTenant } from '../../middleware/tenantAccess'
import { getParam } from '../../utils/expressParams'
import {
  isManagedMembershipRole,
  isMemberRole,
  keycloakRolesForMemberRole,
  memberRoleFromScopes,
  TENANT_MEMBERSHIP_ROLES,
  type MemberRole
} from '../../../../domain/user/memberRoles'
import { logger } from '../../../../infrastructure/logging/Logger'

/**
 * Tenant member management via Keycloak client roles.
 * Keycloak remains the source of truth for membership.
 *
 * Roles visible in Keycloak Admin Console (Clients → tenant-{id} → Roles):
 *   viewer, author, admin  (composites of case.read / case.write / case.owner)
 */
export class MembersManagementController {
  constructor (
    private readonly admin: KeycloakAdminClient,
    private readonly cfg: {
      clientIdPrefix: string
      /** The OpenCASE tenant; ensure-self only assigns the default role here. */
      defaultTenantId: string
    }
  ) {}

  private async resolveTenantClient (tenantId: string): Promise<{ id: string, clientId: string } | null> {
    const clientId = OidcJwtVerifier.computeTenantClientId(this.cfg.clientIdPrefix, tenantId)
    return await this.admin.findClientByClientIdPublic(clientId)
  }

  list: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const client = await this.resolveTenantClient(tenantId)
      if (!client) return res.status(404).json({ error: 'Tenant client not found' })

      await this.admin.ensureTenantMemberRoles(client.id)

      // Every realm user is listed, including users without a role yet, so admins can
      // assign roles here instead of in the Keycloak Admin Console.
      const [allUsers, usersWithRoles] = await Promise.all([
        this.admin.listUsers(),
        this.admin.listUsersWithClientRoles(client.id, [...TENANT_MEMBERSHIP_ROLES])
      ])
      const rolesByUserId = new Map(usersWithRoles.map(u => [u.id, u.roles]))
      const members = allUsers.map(u => {
        const roles = rolesByUserId.get(u.id) ?? []
        return {
          userId: u.id,
          email: u.email ?? null,
          username: u.username ?? null,
          role: memberRoleFromScopes(roles),
          scopes: roles.filter(isManagedMembershipRole)
        }
      })

      return res.status(200).json({ members })
    } catch (error: any) {
      logger.error({ error: error?.message }, 'Failed to list members')
      return res.status(400).json({ error: error?.message || 'Failed to list members' })
    }
  }

  create: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
      const role = req.body?.role as MemberRole
      if (!email) return res.status(400).json({ error: 'email is required' })
      if (!isMemberRole(role)) {
        return res.status(400).json({ error: 'role must be one of: viewer, author, admin' })
      }

      const client = await this.resolveTenantClient(tenantId)
      if (!client) return res.status(404).json({ error: 'Tenant client not found' })

      const { id: userId, created } = await this.admin.ensureUser({
        username: email,
        email,
        enabled: true
      })

      let temporaryPassword: string | null = null
      if (created) {
        temporaryPassword = randomBytes(12).toString('base64url')
        // temporary=true forces UPDATE_PASSWORD on next Keycloak login
        await this.admin.setUserPassword(userId, temporaryPassword, true)
      }

      const roles = keycloakRolesForMemberRole(role)
      await this.admin.setMemberRole(userId, client.id, roles)

      return res.status(201).json({
        userId,
        email,
        role,
        scopes: roles,
        temporaryPassword,
        mustChangePassword: temporaryPassword !== null,
        created
      })
    } catch (error: any) {
      logger.error({ error: error?.message }, 'Failed to create member')
      return res.status(400).json({ error: error?.message || 'Failed to create member' })
    }
  }

  update: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const userId = getParam(req, 'userId')
      if (!userId) return res.status(400).json({ error: 'Missing userId' })

      const role = req.body?.role as MemberRole
      if (!isMemberRole(role)) {
        return res.status(400).json({ error: 'role must be one of: viewer, author, admin' })
      }

      const client = await this.resolveTenantClient(tenantId)
      if (!client) return res.status(404).json({ error: 'Tenant client not found' })

      const user = await this.admin.getUserById(userId)
      if (!user) return res.status(404).json({ error: 'User not found' })

      const roles = keycloakRolesForMemberRole(role)
      await this.admin.setMemberRole(userId, client.id, roles)

      return res.status(200).json({
        userId,
        email: user.email ?? null,
        role,
        scopes: roles
      })
    } catch (error: any) {
      logger.error({ error: error?.message }, 'Failed to update member')
      return res.status(400).json({ error: error?.message || 'Failed to update member' })
    }
  }

  remove: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const userId = getParam(req, 'userId')
      if (!userId) return res.status(400).json({ error: 'Missing userId' })

      const client = await this.resolveTenantClient(tenantId)
      if (!client) return res.status(404).json({ error: 'Tenant client not found' })

      const current = await this.admin.getUserClientRoleMappings(userId, client.id)
      const currentNames = current.map((r: any) => r?.name as string).filter(Boolean)
      const toRemove = currentNames.filter(isManagedMembershipRole)
      if (toRemove.length > 0) {
        await this.admin.removeClientRoles(userId, client.id, toRemove)
      }
      // Keep ensure-self from giving the default role back on the user's next login.
      await this.admin.markMemberRoleProvisioned(userId)

      return res.status(200).json({ status: 'removed', userId })
    } catch (error: any) {
      logger.error({ error: error?.message }, 'Failed to remove member')
      return res.status(400).json({ error: error?.message || 'Failed to remove member' })
    }
  }

  /**
   * First login: assign the default author role to a user who has no tenant roles
   * and has never had a member role set or removed by OpenCASE.
   */
  ensureSelf: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      if (tenantId !== this.cfg.defaultTenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `ensure-self only assigns roles in tenant '${this.cfg.defaultTenantId}'`
        })
      }

      const user = (req as any).user as Record<string, unknown> | undefined

      // Only people signing in to the Editor. API-key tokens are issued to their own client,
      // and must not be able to give their service account a member role.
      const editorClientId = OidcJwtVerifier.computeTenantClientId(this.cfg.clientIdPrefix, tenantId)
      if (user?.azp !== editorClientId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `ensure-self requires a token issued to '${editorClientId}'`
        })
      }

      const sub = typeof user?.sub === 'string' ? user.sub : undefined
      if (!sub) return res.status(401).json({ error: 'Unauthorized - missing sub' })

      const client = await this.resolveTenantClient(tenantId)
      if (!client) return res.status(404).json({ error: 'Tenant client not found' })

      await this.admin.ensureTenantMemberRoles(client.id)

      const current = await this.admin.getUserClientRoleMappings(sub, client.id)
      const currentNames = current.map((r: any) => r?.name as string).filter(Boolean)
      const existingRole = memberRoleFromScopes(currentNames)
      if (existingRole) {
        return res.status(200).json({
          status: 'unchanged',
          userId: sub,
          role: existingRole,
          scopes: currentNames.filter(isManagedMembershipRole)
        })
      }

      if (await this.admin.isMemberRoleProvisioned(sub)) {
        return res.status(200).json({ status: 'unchanged', userId: sub, role: null, scopes: [] })
      }

      const role: MemberRole = 'author'
      const roles = keycloakRolesForMemberRole(role)
      await this.admin.setMemberRole(sub, client.id, roles)

      logger.info({ tenantId, userId: sub }, 'ensure-self assigned default author roles')

      return res.status(200).json({
        status: 'assigned',
        userId: sub,
        role,
        scopes: roles,
        note: 'Refresh the access token to pick up the new scopes'
      })
    } catch (error: any) {
      logger.error({ error: error?.message }, 'Failed ensure-self membership')
      return res.status(400).json({ error: error?.message || 'Failed to ensure membership' })
    }
  }
}
