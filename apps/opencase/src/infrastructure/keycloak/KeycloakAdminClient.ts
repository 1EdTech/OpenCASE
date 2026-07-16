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

    // Ensure CASE OAuth2 client scopes exist in the realm so that
    // client_credentials grants with scope=case.read (etc.) are accepted.
    for (const scopeName of ['case.read', 'case.write', 'case.owner', 'case.admin']) {
      try {
        await this.ensureClientScope(scopeName)
      } catch (err) {
        logger.warn({ scopeName, err }, 'Could not create client scope (non-fatal)')
      }
    }

    logger.info({ realm }, 'Configured realm settings (resetPassword, loginWithEmail, SMTP, CASE scopes)')
  }

  async setRealmSslRequired (realm: string, sslRequired: string): Promise<void> {
    await this.requestJson('PUT', `/admin/realms/${encodeURIComponent(realm)}`, { sslRequired })
    logger.info({ realm, sslRequired }, 'Set realm sslRequired')
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

  async ensureClientRole (clientUuid: string, roleName: string, description?: string): Promise<void> {
    const realm = this.cfg.realm
    const existing = await this.requestRaw('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`)
    if (existing.status === 200) {
      if (description) {
        const role = await existing.json().catch(() => null) as any
        if (role && role.description !== description) {
          await this.requestJson('PUT', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`, {
            ...role,
            description
          })
        }
      }
      return
    }
    if (existing.status !== 404) throw new Error(`Failed to check role '${roleName}': ${existing.status} ${existing.statusText}`)

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles`, {
      name: roleName,
      description: description ?? ''
    })
  }

  async getClientRole (clientUuid: string, roleName: string): Promise<any | null> {
    const realm = this.cfg.realm
    const res = await this.requestRaw(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`
    )
    if (res.status === 404) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to get role '${roleName}': ${res.status}. ${text}`)
    }
    return await res.json()
  }

  /**
   * Ensure case.* scope roles and viewer/author/admin membership roles exist on a tenant client.
   * Membership roles are composites of the corresponding case.* roles so they appear clearly in Keycloak.
   */
  async ensureTenantMemberRoles (clientUuid: string): Promise<void> {
    await this.ensureClientRole(clientUuid, 'case.read', 'Read frameworks (case.read)')
    await this.ensureClientRole(clientUuid, 'case.write', 'Author frameworks (case.write)')
    await this.ensureClientRole(clientUuid, 'case.owner', 'Tenant administrator (case.owner)')

    await this.ensureClientRole(clientUuid, 'viewer', 'Viewer — read frameworks')
    await this.ensureClientRole(clientUuid, 'author', 'Author — create and edit frameworks')
    await this.ensureClientRole(clientUuid, 'admin', 'Admin — manage members, API keys, and credentials')

    await this.ensureClientRoleComposites(clientUuid, 'viewer', ['case.read'])
    await this.ensureClientRoleComposites(clientUuid, 'author', ['case.read', 'case.write'])
    await this.ensureClientRoleComposites(clientUuid, 'admin', ['case.read', 'case.write', 'case.owner'])
  }

  private async ensureClientRoleComposites (
    clientUuid: string,
    compositeRoleName: string,
    childRoleNames: string[]
  ): Promise<void> {
    const realm = this.cfg.realm
    const existing = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(compositeRoleName)}/composites`
    )
    const existingNames = new Set(
      (Array.isArray(existing) ? existing : []).map((r: any) => r?.name as string).filter(Boolean)
    )
    const missing = childRoleNames.filter(n => !existingNames.has(n))
    if (missing.length === 0) return

    const children: any[] = []
    for (const name of missing) {
      const role = await this.getClientRole(clientUuid, name)
      if (role) children.push(role)
    }
    if (children.length === 0) return

    await this.requestJson(
      'POST',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(compositeRoleName)}/composites`,
      children
    )
  }

  /**
   * Set membership for a user on a tenant client to exactly one MemberRole.
   * Assigns the human-readable role (viewer/author/admin) plus case.* scopes for JWT mappers.
   * Only touches OpenCASE-managed roles; leaves other client roles alone.
   */
  async setMemberRole (
    userId: string,
    clientUuid: string,
    desiredRoleNames: string[]
  ): Promise<void> {
    await this.ensureTenantMemberRoles(clientUuid)

    const managed = new Set([
      'case.read', 'case.write', 'case.owner',
      'viewer', 'author', 'admin'
    ])
    const desired = new Set(desiredRoleNames)
    const current = await this.getUserClientRoleMappings(userId, clientUuid)
    const currentNames = current.map((r: any) => r?.name as string).filter(Boolean)
    const currentManaged = currentNames.filter(n => managed.has(n))

    const toRemove = currentManaged.filter(n => !desired.has(n))
    const toAdd = [...desired].filter(n => !currentManaged.includes(n))

    if (toRemove.length > 0) await this.removeClientRoles(userId, clientUuid, toRemove)
    if (toAdd.length > 0) await this.assignClientRoles(userId, clientUuid, toAdd)
  }

  async ensureProtocolMapper (clientUuid: string, mapper: any): Promise<void> {
    const realm = this.cfg.realm
    const list = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`)
    const existing = Array.isArray(list) ? list.find((m: any) => m?.name === mapper.name) : undefined
    if (existing) return

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`, mapper)
  }

  async ensureUser (user: { username: string, email?: string, enabled?: boolean }): Promise<{ id: string, created: boolean }> {
    const realm = this.cfg.realm
    const users = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/users?username=${encodeURIComponent(user.username)}&exact=true`)
    const existing = Array.isArray(users) ? users[0] : undefined
    if (existing?.id) return { id: existing.id, created: false }

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/users`, {
      username: user.username,
      email: user.email ?? user.username,
      enabled: user.enabled ?? true,
      emailVerified: true
    })

    const users2 = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/users?username=${encodeURIComponent(user.username)}&exact=true`)
    const created = Array.isArray(users2) ? users2[0] : undefined
    if (!created?.id) throw new Error(`Failed to create Keycloak user '${user.username}'`)
    return { id: created.id, created: true }
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

  async removeClientRoles (userId: string, clientUuid: string, roleNames: string[]): Promise<void> {
    if (roleNames.length === 0) return
    const realm = this.cfg.realm
    const roles: any[] = []
    for (const roleName of roleNames) {
      const role = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`)
      roles.push(role)
    }

    const res = await this.requestRaw(
      'DELETE',
      `/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`,
      roles
    )
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to remove client roles: ${res.status} ${res.statusText}. ${text}`)
    }
  }

  /**
   * Replace a user's client roles for a given client with exactly `roleNames`.
   */
  async setClientRoles (userId: string, clientUuid: string, roleNames: string[]): Promise<void> {
    const current = await this.getUserClientRoleMappings(userId, clientUuid)
    const currentNames = current.map((r: any) => r?.name as string).filter(Boolean)
    const toRemove = currentNames.filter(n => !roleNames.includes(n))
    const toAdd = roleNames.filter(n => !currentNames.includes(n))
    if (toRemove.length > 0) await this.removeClientRoles(userId, clientUuid, toRemove)
    if (toAdd.length > 0) await this.assignClientRoles(userId, clientUuid, toAdd)
  }

  async getUserById (userId: string): Promise<{ id: string, username?: string, email?: string, enabled?: boolean } | null> {
    const realm = this.cfg.realm
    const res = await this.requestRaw('GET', `/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}`)
    if (res.status === 404) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Keycloak Admin API error: GET user ${userId} -> ${res.status}. ${text}`)
    }
    const u = await res.json().catch(() => null) as any
    if (!u?.id) return null
    return { id: u.id, username: u.username, email: u.email, enabled: u.enabled }
  }

  /**
   * List users that have any of the given client roles on a tenant client.
   * Uses Keycloak role-user listing per role and de-duplicates.
   */
  async listUsersWithClientRoles (
    clientUuid: string,
    roleNames: string[]
  ): Promise<Array<{ id: string, username?: string, email?: string, roles: string[] }>> {
    const realm = this.cfg.realm
    const byId = new Map<string, { id: string, username?: string, email?: string, roles: Set<string> }>()

    for (const roleName of roleNames) {
      const users = await this.requestJson(
        'GET',
        `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}/users?max=5000`
      )
      if (!Array.isArray(users)) continue
      for (const u of users) {
        if (!u?.id) continue
        const existing = byId.get(u.id)
        if (existing) {
          existing.roles.add(roleName)
        } else {
          byId.set(u.id, {
            id: u.id,
            username: u.username,
            email: u.email,
            roles: new Set([roleName])
          })
        }
      }
    }

    return [...byId.values()].map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: [...u.roles].sort()
    }))
  }

  async findClientByClientIdPublic (clientId: string): Promise<{ id: string, clientId: string } | null> {
    return await this.findClientByClientId(clientId)
  }

  // ── OAuth2 client scope helpers ──────────────────────────────────

  /**
   * Ensure an OAuth2 client scope exists in the realm (idempotent).
   * Returns the Keycloak-internal UUID of the scope.
   */
  async ensureClientScope (scopeName: string): Promise<{ id: string }> {
    const realm = this.cfg.realm
    const scopes = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/client-scopes`)
    const existing = Array.isArray(scopes)
      ? scopes.find((s: any) => s?.name === scopeName)
      : undefined
    if (existing?.id) return { id: existing.id }

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/client-scopes`, {
      name: scopeName,
      protocol: 'openid-connect',
      attributes: { 'display.on.consent.screen': 'false' }
    })

    const scopes2 = await this.requestJson('GET', `/admin/realms/${encodeURIComponent(realm)}/client-scopes`)
    const created = Array.isArray(scopes2)
      ? scopes2.find((s: any) => s?.name === scopeName)
      : undefined
    if (!created?.id) throw new Error(`Failed to create client scope '${scopeName}'`)
    return { id: created.id }
  }

  /**
   * Assign an optional client scope to a Keycloak client (idempotent).
   * Optional scopes are available when explicitly requested via the `scope` parameter.
   */
  async assignOptionalClientScope (clientUuid: string, scopeId: string): Promise<void> {
    const realm = this.cfg.realm
    // Check if already assigned
    const existing = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/optional-client-scopes`
    )
    if (Array.isArray(existing) && existing.some((s: any) => s?.id === scopeId)) return

    await this.requestRaw(
      'PUT',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/optional-client-scopes/${encodeURIComponent(scopeId)}`
    )
  }

  /**
   * Assign a default client scope to a Keycloak client (idempotent).
   * Default scopes are always included in token responses.
   */
  async assignDefaultClientScope (clientUuid: string, scopeId: string): Promise<void> {
    const realm = this.cfg.realm
    const existing = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/default-client-scopes`
    )
    if (Array.isArray(existing) && existing.some((s: any) => s?.id === scopeId)) return

    await this.requestRaw(
      'PUT',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/default-client-scopes/${encodeURIComponent(scopeId)}`
    )
  }

  // ── API-key (confidential client) helpers ────────────────────────

  /**
   * Create a confidential (non-public) Keycloak client with service-account
   * support and the `client_credentials` grant.  Returns the Keycloak-internal
   * UUID, the clientId string, and the auto-generated client secret.
   */
  async createConfidentialClient (opts: {
    clientId: string
    description?: string
  }): Promise<{ id: string, clientId: string, secret: string }> {
    const realm = this.cfg.realm

    await this.requestJson('POST', `/admin/realms/${encodeURIComponent(realm)}/clients`, {
      clientId: opts.clientId,
      description: opts.description ?? '',
      enabled: true,
      publicClient: false,
      standardFlowEnabled: false,
      directAccessGrantsEnabled: false,
      implicitFlowEnabled: false,
      serviceAccountsEnabled: true,
      redirectUris: [],
      webOrigins: []
    })

    const created = await this.findClientByClientId(opts.clientId)
    if (!created) throw new Error(`Failed to create confidential client '${opts.clientId}'`)

    // Assign CASE OAuth2 client scopes so the client_credentials grant
    // accepts scope=case.read (etc.) without returning invalid_scope.
    for (const scopeName of ['case.read', 'case.write', 'case.owner', 'case.admin']) {
      try {
        const { id: scopeId } = await this.ensureClientScope(scopeName)
        await this.assignOptionalClientScope(created.id, scopeId)
      } catch (err) {
        logger.warn({ scopeName, err }, 'Could not assign client scope to confidential client (non-fatal)')
      }
    }

    const secret = await this.getClientSecret(created.id)
    return { id: created.id, clientId: opts.clientId, secret }
  }

  /**
   * Fetch the client secret for a confidential client (by Keycloak UUID).
   */
  async getClientSecret (clientUuid: string): Promise<string> {
    const realm = this.cfg.realm
    const res = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/client-secret`
    )
    const value = res?.value as string | undefined
    if (!value) throw new Error(`No secret found for client ${clientUuid}`)
    return value
  }

  /**
   * Delete a Keycloak client by its internal UUID.
   */
  async deleteClient (clientUuid: string): Promise<void> {
    const realm = this.cfg.realm
    await this.requestRaw('DELETE', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}`)
  }

  /**
   * Get the service-account user associated with a confidential client.
   * Needed to assign client roles to the service account.
   */
  async getServiceAccountUser (clientUuid: string): Promise<{ id: string }> {
    const realm = this.cfg.realm
    const user = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}/service-account-user`
    )
    if (!user?.id) throw new Error(`No service-account user for client ${clientUuid}`)
    return { id: user.id }
  }

  /**
   * List all clients whose `clientId` starts with the given prefix.
   * Returns id (UUID), clientId, and description for each match.
   */
  async listClientsByPrefix (prefix: string): Promise<Array<{ id: string, clientId: string, description: string }>> {
    const realm = this.cfg.realm
    // Keycloak search is substring-based; we filter the result for an exact prefix match.
    const list = await this.requestJson(
      'GET',
      `/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(prefix)}&max=500&search=true`
    )
    if (!Array.isArray(list)) return []
    return list
      .filter((c: any) => typeof c?.clientId === 'string' && c.clientId.startsWith(prefix))
      .map((c: any) => ({
        id: c.id as string,
        clientId: c.clientId as string,
        description: (c.description ?? '') as string
      }))
  }

  /**
   * Retrieve a single client by its Keycloak internal UUID.
   */
  async getClientByUuid (clientUuid: string): Promise<{ id: string, clientId: string, description: string } | null> {
    const realm = this.cfg.realm
    const res = await this.requestRaw('GET', `/admin/realms/${encodeURIComponent(realm)}/clients/${encodeURIComponent(clientUuid)}`)
    if (res.status === 404) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Keycloak Admin API error: GET client ${clientUuid} -> ${res.status}. ${text}`)
    }
    const c = await res.json().catch(() => null) as any
    if (!c?.id) return null
    return { id: c.id, clientId: c.clientId ?? '', description: c.description ?? '' }
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

