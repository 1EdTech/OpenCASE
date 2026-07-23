import { randomBytes } from 'node:crypto'
import { KeycloakAdminClient } from './KeycloakAdminClient'
import { logger } from '../logging/Logger'
import { OidcJwtVerifier } from '../auth/OidcJwtVerifier'

export interface KeycloakTenantProvisionerConfig {
  realm: string
  clientIdPrefix: string
  spaRedirectUris: string[]
  spaWebOrigins: string[]
  systemAdminEmail?: string
  systemAdminPassword?: string
  bootstrapSystemAdmin?: boolean
  /** SMTP host for Keycloak email delivery (e.g. 'mailpit' for dev). When set, realm SMTP is configured. */
  smtpHost?: string
  smtpPort?: string
  smtpFrom?: string
}

export class KeycloakTenantProvisioner {
  constructor (
    private readonly admin: KeycloakAdminClient,
    private readonly cfg: KeycloakTenantProvisionerConfig
  ) {}

  async bootstrapSystemAdmin (): Promise<void> {
    if (!this.cfg.bootstrapSystemAdmin) return
    const email = this.cfg.systemAdminEmail
    const password = this.cfg.systemAdminPassword
    if (!email || !password) return

    await this.admin.ensureRealmExists()
    await this.admin.configureRealmSettings({
      smtpHost: this.cfg.smtpHost,
      smtpPort: this.cfg.smtpPort,
      smtpFrom: this.cfg.smtpFrom,
    })

    const tenantId = 'system'
    const roles = ['case.read', 'case.write', 'case.owner', 'case.admin']
    const { clientId, clientUuid } = await this.ensureTenantClient(tenantId, roles)

    const { id: userId } = await this.admin.ensureUser({ username: email, email, enabled: true })
    await this.admin.setUserPassword(userId, password, false)
    await this.admin.assignClientRoles(userId, clientUuid, roles)

    logger.info({ clientId, email }, 'Bootstrapped system admin user in Keycloak')
  }

  async provisionTenant (tenantId: string): Promise<{ adminEmail: string, adminPassword: string }> {
    await this.admin.ensureRealmExists()

    const roles = ['case.read', 'case.write', 'case.owner']
    const { clientId, clientUuid } = await this.ensureTenantClient(tenantId, roles)

    const adminEmail = `admin@${tenantId}.local`
    const { id: userId } = await this.admin.ensureUser({ username: adminEmail, email: adminEmail, enabled: true })
    const adminPassword = randomBytes(18).toString('base64url')
    await this.admin.setUserPassword(userId, adminPassword, true)
    await this.admin.assignClientRoles(userId, clientUuid, roles)

    logger.info({ tenantId, clientId, adminEmail }, 'Provisioned tenant client and admin user in Keycloak')
    return { adminEmail, adminPassword }
  }

  private async ensureTenantClient (tenantId: string, roles: string[]): Promise<{ clientId: string, clientUuid: string }> {
    const clientId = OidcJwtVerifier.computeTenantClientId(this.cfg.clientIdPrefix, tenantId)
    const { id: clientUuid } = await this.admin.ensureClient({
      clientId,
      publicClient: true,
      standardFlowEnabled: true,
      redirectUris: this.cfg.spaRedirectUris,
      webOrigins: this.cfg.spaWebOrigins
    })

    for (const role of roles) {
      await this.admin.ensureClientRole(clientUuid, role)
    }

    await this.admin.ensureProtocolMapper(clientUuid, {
      name: 'tenantId',
      protocol: 'openid-connect',
      protocolMapper: 'oidc-hardcoded-claim-mapper',
      config: {
        'claim.name': 'tenantId',
        'claim.value': tenantId,
        'jsonType.label': 'String',
        'id.token.claim': 'true',
        'access.token.claim': 'true',
        'userinfo.token.claim': 'true'
      }
    })

    await this.admin.ensureProtocolMapper(clientUuid, {
      name: 'scope',
      protocol: 'openid-connect',
      protocolMapper: 'oidc-usermodel-client-role-mapper',
      config: {
        'clientId': clientId,
        'rolePrefix': '',
        'claim.name': 'scope',
        'jsonType.label': 'String',
        'multivalued': 'true',
        'access.token.claim': 'true',
        'id.token.claim': 'true',
        'userinfo.token.claim': 'true'
      }
    })

    return { clientId, clientUuid }
  }
}

