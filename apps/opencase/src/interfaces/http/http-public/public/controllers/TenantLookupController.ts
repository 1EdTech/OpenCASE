import type { Request, Response, RequestHandler } from 'express'
import type { KeycloakAdminClient } from '../../../../../infrastructure/keycloak/KeycloakAdminClient'
import { OidcJwtVerifier } from '../../../../../infrastructure/auth/OidcJwtVerifier'
import { logger } from '../../../../../infrastructure/logging/Logger'

export class TenantLookupController {
  private clientCache?: { fetchedAtMs: number, clients: Array<{ id: string, clientId: string }> }

  constructor (
    private readonly keycloakAdmin: KeycloakAdminClient,
    private readonly cfg: { clientIdPrefix: string }
  ) {}

  lookup: RequestHandler = async (req: Request, res: Response) => {
    // Anti-enumeration: always 202, regardless of whether the email/org exists.
    res.status(202)
    res.setHeader('Cache-Control', 'no-store')

    const rawOrgId = (req.query as any)?.orgId as string | string[] | undefined
    const orgId = (Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId)?.trim()
    if (orgId) {
      try {
        const clientId = OidcJwtVerifier.computeTenantClientId(this.cfg.clientIdPrefix, orgId)
        const client = await this.keycloakAdmin.findClientByClientIdPublic(clientId)
        if (client) {
          return res.json({ status: 'accepted', tenantId: orgId })
        }
        return res.json({ status: 'accepted' })
      } catch (error: any) {
        logger.warn({ error: error?.message, orgId }, 'Tenant lookup by orgId failed')
        return res.json({ status: 'accepted' })
      }
    }

    const rawEmail = (req.query as any)?.email as string | string[] | undefined
    const email = (Array.isArray(rawEmail) ? rawEmail[0] : rawEmail)?.trim()
    if (!email) return res.json({ status: 'accepted' })

    try {
      const user = await this.keycloakAdmin.findUserByEmailExact(email)
      if (!user) return res.json({ status: 'accepted' })

      const tenantId = await this.findTenantIdForUser(user.id)
      if (!tenantId) return res.json({ status: 'accepted' })

      return res.json({ status: 'accepted', tenantId })
    } catch (error: any) {
      // Never leak details; keep behavior uniform.
      logger.warn({ error: error?.message, email }, 'Tenant lookup failed (returning accepted without tenantId)')
      return res.json({ status: 'accepted' })
    }
  }

  private async getCachedClients (): Promise<Array<{ id: string, clientId: string }>> {
    const ttlMs = 5 * 60 * 1000
    const now = Date.now()
    if (this.clientCache && (now - this.clientCache.fetchedAtMs) < ttlMs) {
      return this.clientCache.clients
    }
    const clients = await this.keycloakAdmin.listClients({ max: 5000 })
    this.clientCache = { fetchedAtMs: now, clients }
    return clients
  }

  private async findTenantIdForUser (userId: string): Promise<string | null> {
    const prefix = this.cfg.clientIdPrefix
    const clients = await this.getCachedClients()
    const tenantClients = clients
      .filter(c => c.clientId.startsWith(prefix))
      .sort((a, b) => a.clientId.localeCompare(b.clientId))

    for (const c of tenantClients) {
      const roles = await this.keycloakAdmin.getUserClientRoleMappings(userId, c.id)
      if (Array.isArray(roles) && roles.length > 0) {
        const tenantId = c.clientId.slice(prefix.length)
        return tenantId || null
      }
    }

    return null
  }
}
