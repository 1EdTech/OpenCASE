import { logger } from '../logging/Logger'

export interface KeycloakAdminClientConfig {
  baseUrl: string
  realm: string
  adminRealm: string
  clientId: string
  clientSecret?: string
  username?: string
  password?: string
}

type TokenResponse = {
  access_token: string
  expires_in: number
  token_type: string
}

export class KeycloakAdminClient {
  private cachedToken?: { token: string, expiresAtMs: number }

  constructor (private readonly cfg: KeycloakAdminClientConfig) {}

  async ensureRealmExists (): Promise<void> {
    const realm = this.cfg.realm
    const res = await this.requestRaw('GET', `/admin/realms/${encodeURIComponent(realm)}`)
    if (res.status === 200) return
    if (res.status !== 404) {
      throw new Error(`Keycloak realm check failed: ${res.status} ${res.statusText}`)
    }

    logger.info({ realm }, 'Keycloak realm missing; creating realm')
    await this.requestJson('POST', '/admin/realms', { realm, enabled: true })
  }

  /**
   * Configure realm-level settings (idempotent — safe to call on every startup).
   * Enables forgot-password flow, email-based login, and SMTP for dev mail capture.
   */
  async configureRealmSettings (opts?: { smtpHost?: string, smtpPort?: string, smtpFrom?: string, smtpFromDisplayName?: string, loginTheme?: string }): Promise<void> {
    const realm = this.cfg.realm
    const body: Record<string, unknown> = {
      realm,
      resetPasswordAllowed: true,
      loginWithEmailAllowed: true,
      registrationAllowed: false,
      loginTheme: opts?.loginTheme ?? 'opencase',
    }

    // Configure SMTP if a mail host is provided (needed for forgot-password emails)
    if (opts?.smtpHost) {
      body.smtpServer = {
        host: opts.smtpHost,
        port: opts.smtpPort ?? '1025',
        from: opts.smtpFrom ?? 'noreply@opencase.local',
        fromDisplayName: opts.smtpFromDisplayName ?? 'OpenCASE',
        ssl: 'false',
        starttls: 'false',
        auth: 'false',
      }
    }

    await this.requestJson('PUT', `/admin/realms/${encodeURIComponent(realm)}`, body)
    logger.info({ realm }, 'Configured realm settings (resetPassword, loginWithEmail, SMTP)')
  }

  async ensureClient (client: {
    clientId: string
    publicClient: boolean
    standardFlowEnabled: boolean
    redirectUris: string[]
    webOrigins: string[]
  }): Promise<{ id: string }> {
    const existing = await this.findClientByClientId(client.clientId)
    if (existing) return { id: existing.id }

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(this.cfg.realm)}/clients`, {
      clientId: client.clientId,
      enabled: true,
      publicClient: client.publicClient,
      standardFlowEnabled: client.standardFlowEnabled,
      directAccessGrantsEnabled: false,
      implicitFlowEnabled: false,
      serviceAccountsEnabled: false,
      redirectUris: client.redirectUris,
      webOrigins: client.webOrigins
    })

    const created = await this.findClientByClientId(client.clientId)
    if (!created) throw new Error(`Failed to create Keycloak client '${client.clientId}'`)
    return { id: created.id }
  }

  async ensureClientRole (clientUuid: string, roleName: string): Promise<void> {
    const realm = this.cfg.realm
    const existing = await this.requestRaw('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`)
    if (existing.status === 200) return
    if (existing.status !== 404) throw new Error(`Failed to check role '${roleName}': ${existing.status} ${existing.statusText}`)

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles`, {
      name: roleName
    })
  }

  async ensureProtocolMapper (clientUuid: string, mapper: any): Promise<void> {
    const realm = this.cfg.realm
    const list = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`)
    const existing = Array.isArray(list) ? list.find((m: any) => m?.name === mapper.name) : undefined
    if (existing) return

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`, mapper)
  }

  async ensureUser (user: { username: string, email?: string, enabled?: boolean }): Promise<{ id: string }> {
    const realm = this.cfg.realm
    const users = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/users?username=${encodeURIComponent(user.username)}&exact=true`)
    const existing = Array.isArray(users) ? users[0] : undefined
    if (existing?.id) return { id: existing.id }

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/users`, {
      username: user.username,
      email: user.email ?? user.username,
      enabled: user.enabled ?? true,
      emailVerified: true
    })

    const users2 = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/users?username=${encodeURIComponent(user.username)}&exact=true`)
    const created = Array.isArray(users2) ? users2[0] : undefined
    if (!created?.id) throw new Error(`Failed to create Keycloak user '${user.username}'`)
    return { id: created.id }
  }

  async findUserByEmailExact (email: string): Promise<{ id: string, username?: string, email?: string } | null> {
    const realm = this.cfg.realm
    const users = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/users?email=${encodeURIComponent(email)}&exact=true`
    )
    const u = Array.isArray(users) ? users[0] : undefined
    return u?.id ? { id: u.id, username: u.username, email: u.email } : null
  }

  async listClients (opts?: { max?: number }): Promise<Array<{ id: string, clientId: string }>> {
    const realm = this.cfg.realm
    const max = opts?.max ?? 2000
    const list = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients?max=${max}`)
    if (!Array.isArray(list)) return []
    return list
      .map((c: any) => ({ id: c?.id as string | undefined, clientId: c?.clientId as string | undefined }))
      .filter((c: any) => typeof c.id === 'string' && typeof c.clientId === 'string') as Array<{ id: string, clientId: string }>
  }

  async getUserClientRoleMappings (userId: string, clientUuid: string): Promise<any[]> {
    const realm = this.cfg.realm
    const roles = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`
    )
    return Array.isArray(roles) ? roles : []
  }

  async setUserPassword (userId: string, password: string, temporary: boolean): Promise<void> {
    const realm = this.cfg.realm
    await this.requestJson('PUT', `/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}/reset-password`, {
      type: 'password',
      value: password,
      temporary
    })
  }

  async assignClientRoles (userId: string, clientUuid: string, roleNames: string[]): Promise<void> {
    const realm = this.cfg.realm
    const roles: any[] = []
    for (const roleName of roleNames) {
      const role = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`)
      roles.push(role)
    }

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`, roles)
  }

  private async findClientByClientId (clientId: string): Promise<{ id: string, clientId: string } | null> {
    const realm = this.cfg.realm
    const list = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(clientId)}`)
    if (!Array.isArray(list) || list.length === 0) return null
    const found = list[0]
    return found?.id ? { id: found.id, clientId: found.clientId } : null
  }

  private async getAdminToken (): Promise<string> {
    const now = Date.now()
    if (this.cachedToken && now < this.cachedToken.expiresAtMs) {
      return this.cachedToken.token
    }

    const url = `${this.cfg.baseUrl}/realms/${encodeURIComponent(this.cfg.adminRealm)}/protocol/openid-connect/token`

    const params = new URLSearchParams()
    params.set('client_id', this.cfg.clientId)

    if (this.cfg.clientSecret) {
      params.set('grant_type', 'client_credentials')
      params.set('client_secret', this.cfg.clientSecret)
    } else {
      if (!this.cfg.username || !this.cfg.password) {
        throw new Error('Keycloak admin auth not configured (set KEYCLOAK_ADMIN_CLIENT_SECRET or KEYCLOAK_ADMIN_USERNAME/PASSWORD)')
      }
      params.set('grant_type', 'password')
      params.set('username', this.cfg.username)
      params.set('password', this.cfg.password)
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString()
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Failed to obtain Keycloak admin token: ${res.status} ${res.statusText}. ${body}`)
    }

    const json = await res.json() as TokenResponse
    const expiresAtMs = Date.now() + (json.expires_in * 1000) - 10_000
    this.cachedToken = { token: json.access_token, expiresAtMs }
    return json.access_token
  }

  private async requestRaw (method: string, path: string, body?: any): Promise<Response> {
    const token = await this.getAdminToken()
    const url = `${this.cfg.baseUrl}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
    let payload: string | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    return await fetch(url, { method, headers, body: payload })
  }

  private async requestJson (method: string, path: string, body?: any): Promise<any> {
    const res = await this.requestRaw(method, path, body)
    if (res.status === 204) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Keycloak Admin API error: ${method} ${path} -> ${res.status} ${res.statusText}. ${text}`)
    }
    return await res.json().catch(() => null)
  }
}

