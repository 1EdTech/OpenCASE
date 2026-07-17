import type { CFDocument, CFLicense, CFPackage, CFDefinition } from '@/domain/case/types'
import type { HttpClient } from './http'
import type { CgeImportResult, CachedFrameworkItemSummary } from './cgeTypes'
export type { CgeImportResult, CachedFrameworkItemSummary, CgeFrameworkSummary, CgeSubscriptionSummary } from './cgeTypes'
export { normalizeCgeFrameworkList, normalizeCgeSubscriptionList } from './cgeTypes'

export type OpenCaseCfPackageResponse = { CFPackage: CFPackage }

export type OpenCaseManagementCfPackageSummary = {
  sourcedId?: string
  identifier?: string
  title?: string
  uri?: string
  caseVersion?: string
  version?: string
  lastChangeDateTime?: string
  [k: string]: unknown
}

/**
 * Summary of a CFDocument returned by the CFDocuments list endpoint.
 * Based on CASE v1.1 spec: GET /ims/case/v1p1/CFDocuments
 */
export type CfDocumentSummary = {
  identifier: string
  uri?: string
  title?: string
  creator?: string
  description?: string
  frameworkType?: string
  adoptionStatus?: string
  lastChangeDateTime?: string
  caseVersion?: string
  /** URL the framework was imported from (set during import via backend). */
  sourcePackageURI?: string
  /** True when an imported framework has been locally modified after import. */
  isModifiedFromSource?: boolean
  /** Server-level archive flag — independent of CASE adoptionStatus */
  archived?: boolean
  readOnly?: boolean
  cgeFrameworkId?: string
}

export class CaseApiClient {
  constructor(private readonly _http: HttpClient) {}

  async lookupTenantByEmail(params: { email: string }): Promise<{ tenantId?: string } | null> {
    const email = params.email.trim()
    if (!email) return null
    const res = (await this._http.get(`/public/tenant-lookup?email=${encodeURIComponent(email)}`)) as unknown
    if (!res || typeof res !== 'object') return null
    const any = res as { tenantId?: unknown }
    if (typeof any.tenantId === 'string' && any.tenantId.trim()) return { tenantId: any.tenantId.trim() }
    return {}
  }

  async lookupTenantByOrgId(params: { orgId: string }): Promise<{ tenantId?: string } | null> {
    const orgId = params.orgId.trim()
    if (!orgId) return null
    const res = (await this._http.get(`/public/tenant-lookup?orgId=${encodeURIComponent(orgId)}`)) as unknown
    if (!res || typeof res !== 'object') return null
    const any = res as { tenantId?: unknown }
    if (typeof any.tenantId === 'string' && any.tenantId.trim()) return { tenantId: any.tenantId.trim() }
    return {}
  }

  /**
   * SSO first-login: assign default author roles when org_id claim matches tenant.
   * Idempotent. Caller should re-authenticate if status is `assigned`.
   */
  async ensureSelfMembership(params: { tenantId: string }): Promise<{
    status: string
    role?: string
    scopes?: string[]
    note?: string
  }> {
    return (await this._http.post(
      `/management/tenants/${encodeURIComponent(params.tenantId)}/members/ensure-self`,
      {},
    )) as { status: string; role?: string; scopes?: string[]; note?: string }
  }

  async listManagementCfPackages(params: { tenantId: string; caseVersion?: '1.0' | '1.1' }): Promise<CfDocumentSummary[]> {
    const caseVersion = params.caseVersion ?? '1.1'
    const res = (await this._http.get(`/management/tenants/${encodeURIComponent(params.tenantId)}/CFPackages?caseVersion=${encodeURIComponent(caseVersion)}`)) as unknown

    if (res && typeof res === 'object' && 'frameworks' in res && Array.isArray((res as { frameworks: unknown }).frameworks)) {
      return ((res as { frameworks: Array<Record<string, unknown>> }).frameworks).map((f) => ({
        identifier: String(f.sourcedId ?? f.identifier ?? ''),
        title: typeof f.title === 'string' ? f.title : undefined,
        creator: typeof f.creator === 'string' ? f.creator : undefined,
        frameworkType: typeof f.frameworkType === 'string' ? f.frameworkType : undefined,
        subject: typeof f.subject === 'string' ? f.subject : undefined,
        version: typeof f.version === 'string' ? f.version : undefined,
        lastChangeDateTime: typeof f.lastChangeDateTime === 'string' ? f.lastChangeDateTime : undefined,
        caseVersion: typeof f.caseVersion === 'string' ? f.caseVersion : undefined,
        sourcePackageURI: typeof f.sourcePackageURI === 'string' ? f.sourcePackageURI : undefined,
        readOnly: f.readOnly === true,
        cgeFrameworkId: typeof f.cgeFrameworkId === 'string' ? f.cgeFrameworkId : undefined,
      }))
    }

    // Legacy tolerance
    if (Array.isArray(res)) return res as CfDocumentSummary[]
    if (res && typeof res === 'object' && 'CFPackages' in res) {
      const any = res as { CFPackages?: unknown }
      if (Array.isArray(any.CFPackages)) return any.CFPackages as CfDocumentSummary[]
    }
    return []
  }

  async getCfPackage(params: { docId: string; caseVersion?: 'v1p0' | 'v1p1' }): Promise<CFPackage> {
    const v = params.caseVersion ?? 'v1p1'
    const res = (await this._http.get(`/ims/case/${v}/CFPackages/${encodeURIComponent(params.docId)}`)) as unknown
    if (!res || typeof res !== 'object') throw new Error('Unexpected CFPackage response shape')

    if ('CFDocument' in res) {
      return res as CFPackage
    }
    // Wrapped variant: { CFPackage: { CFDocument, CFItems, ... } }
    if ('CFPackage' in res) {
      return (res as OpenCaseCfPackageResponse).CFPackage
    }
    throw new Error('Unexpected CFPackage response shape')
  }

  /**
   * Save (publish) a CFPackage to the server.
   * 
   * Uses the management endpoint: POST /management/tenants/{tenantId}/ims/case/{version}/CFPackages
   * This creates a new version of the framework on the server.
   * 
   * @param params.tenantId - The tenant ID
   * @param params.cfPackage - The CFPackage in OpenCASE format (lowercase property names)
   * @param params.caseVersion - The CASE version (v1p0 or v1p1), defaults to v1p1
   * @returns The document ID and version from the server
   */
  async saveCfPackage(params: {
    tenantId: string
    cfPackage: unknown // OpenCaseCFPackage format
    caseVersion?: 'v1p0' | 'v1p1'
  }): Promise<{ docId: string; version: string }> {
    const v = params.caseVersion ?? 'v1p1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/ims/case/${v}/CFPackages`
    
    const res = (await this._http.post(url, params.cfPackage)) as unknown
    
    if (res && typeof res === 'object') {
      const obj = res as { docId?: string; version?: string; identifier?: string }
      return {
        docId: obj.docId ?? obj.identifier ?? '',
        version: obj.version ?? '',
      }
    }
    
    throw new Error('Unexpected save response shape')
  }

  /**
   * Delete (archive) or permanently delete a CFPackage on the server.
   * 
   * Uses the management endpoint: DELETE /management/tenants/{tenantId}/ims/case/{version}/CFPackages/{docId}
   * By default, OpenCASE will archive (soft-delete) the framework.
   * Pass `hardDelete: true` to permanently remove it.
   * 
   * @param params.tenantId - The tenant ID
   * @param params.docId - The document/framework identifier to delete
   * @param params.caseVersion - The CASE version (v1p0 or v1p1), defaults to v1p1
   * @param params.hardDelete - If true, permanently deletes the framework (default: false = archive)
   */
  async deleteCfPackage(params: {
    tenantId: string
    docId: string
    caseVersion?: 'v1p0' | 'v1p1'
    hardDelete?: boolean
  }): Promise<void> {
    const v = params.caseVersion ?? 'v1p1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/ims/case/${v}/CFPackages/${encodeURIComponent(params.docId)}`
    const query = params.hardDelete ? '?hardDelete=true' : ''
    
    await this._http.delete(`${url}${query}`)
  }

  /**
   * Restore (unarchive) a previously archived CFPackage on the server.
   *
   * Uses the management endpoint: POST /management/tenants/{tenantId}/ims/case/{version}/CFPackages/{docId}/restore
   *
   * @param params.tenantId - The tenant ID
   * @param params.docId - The document/framework identifier to restore
   * @param params.caseVersion - The CASE version (v1p0 or v1p1), defaults to v1p1
   */
  async restoreFramework(params: {
    tenantId: string
    docId: string
    caseVersion?: 'v1p0' | 'v1p1'
  }): Promise<void> {
    const v = params.caseVersion ?? 'v1p1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/ims/case/${v}/CFPackages/${encodeURIComponent(params.docId)}/restore`
    await this._http.post(url, {})
  }

  /**
   * Import a CFPackage into the tenant's framework store via the OpenCASE backend,
   * either by fetching it from an external CASE endpoint (avoiding CORS) or from a
   * CFPackage JSON payload provided directly (e.g. pasted by the user). Exactly one
   * of `endpointUrl` or `cfPackage` should be provided.
   *
   * The backend validates the package, injects source provenance metadata
   * (when imported from a URL), and stores it in the tenant's framework store.
   */
  async importCfPackage(params: {
    tenantId: string
    endpointUrl?: string
    cfPackage?: object
    caseVersion?: 'v1p0' | 'v1p1'
    accessToken?: string
  }): Promise<{ status: string; id: string; version: number; validationWarnings?: string[] }> {
    const v = params.caseVersion ?? 'v1p1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/ims/case/${v}/CFPackages/import`

    const body: Record<string, unknown> = {}
    if (params.endpointUrl) body.endpointUrl = params.endpointUrl
    if (params.cfPackage) body.cfPackage = params.cfPackage
    if (params.accessToken) body.accessToken = params.accessToken

    const res = (await this._http.post(url, body)) as unknown

    if (res && typeof res === 'object') {
      const obj = res as { status?: string; id?: string; version?: number; validationWarnings?: string[] }
      return {
        status: obj.status ?? 'imported',
        id: obj.id ?? '',
        version: obj.version ?? 1,
        validationWarnings: obj.validationWarnings,
      }
    }

    throw new Error('Unexpected import response shape')
  }

  /**
   * List all CFDocuments from the CASE API.
   *
   * Uses the standard CASE endpoint: GET /ims/case/{version}/CFDocuments
   * Returns a list of document summaries without full item/association data.
   */
  async listCfDocuments(params?: { caseVersion?: 'v1p0' | 'v1p1'; limit?: number; offset?: number; includeArchived?: boolean }): Promise<CfDocumentSummary[]> {
    const v = params?.caseVersion ?? 'v1p1'
    const queryParams = new URLSearchParams()
    if (params?.limit != null) queryParams.set('limit', String(params.limit))
    if (params?.offset != null) queryParams.set('offset', String(params.offset))
    if (params?.includeArchived) queryParams.set('includeArchived', 'true')

    const query = queryParams.toString()
    const url = `/ims/case/${v}/CFDocuments${query ? `?${query}` : ''}`

    const res = (await this._http.get(url)) as unknown

    // Handle various response shapes:
    // - Direct array: [...]
    // - v1p1 style: { CFDocuments: [...] }
    // - Set wrapper: { CFDocumentSet: { CFDocuments: [...] } }
    if (Array.isArray(res)) {
      return res as CfDocumentSummary[]
    }

    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>

      // Check for CFDocumentSet wrapper (CASE spec format)
      if ('CFDocumentSet' in obj && obj.CFDocumentSet && typeof obj.CFDocumentSet === 'object') {
        const set = obj.CFDocumentSet as Record<string, unknown>
        if (Array.isArray(set.CFDocuments)) {
          return set.CFDocuments as CfDocumentSummary[]
        }
      }

      // Check for direct CFDocuments array
      if ('CFDocuments' in obj && Array.isArray(obj.CFDocuments)) {
        return obj.CFDocuments as CfDocumentSummary[]
      }
    }

    return []
  }

  /**
   * List all available definitions (seeds + framework-contributed) for a tenant.
   *
   * Uses the management endpoint: GET /management/tenants/{tenantId}/definitions
   * Returns the full catalogue for populating comboboxes / pickers in the editor.
   */
  async listDefinitions(params: { tenantId: string; caseVersion?: '1.0' | '1.1' }): Promise<CFDefinition> {
    const v = params.caseVersion ?? '1.1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/definitions?caseVersion=${encodeURIComponent(v)}`
    const res = (await this._http.get(url)) as unknown

    if (res && typeof res === 'object') {
      return res as CFDefinition
    }
    return {}
  }

  /**
   * List the available CFLicenses for a tenant.
   *
   * Uses the management endpoint: GET /management/tenants/{tenantId}/licenses
   */
  async listLicenses(params: { tenantId: string }): Promise<CFLicense[]> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/licenses`
    const res = (await this._http.get(url)) as unknown

    if (Array.isArray(res)) return res as CFLicense[]

    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>
      if ('CFLicenses' in obj && Array.isArray(obj.CFLicenses)) {
        return obj.CFLicenses as CFLicense[]
      }
    }

    return []
  }

  // ── API Key Management ──────────────────────────────────────────

  /**
   * List API keys for a tenant.
   *
   * Uses the management endpoint: GET /management/tenants/{tenantId}/api-keys
   * Requires `case.owner` scope.
   */
  async listApiKeys(params: { tenantId: string }): Promise<ApiKeySummary[]> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/api-keys`
    const res = (await this._http.get(url)) as unknown

    if (res && typeof res === 'object' && 'apiKeys' in res) {
      const obj = res as { apiKeys?: unknown }
      if (Array.isArray(obj.apiKeys)) return obj.apiKeys as ApiKeySummary[]
    }
    if (Array.isArray(res)) return res as ApiKeySummary[]

    return []
  }

  /**
   * Create a new API key for a tenant.
   *
   * Uses the management endpoint: POST /management/tenants/{tenantId}/api-keys
   * Returns the clientId and clientSecret — the secret is only shown once.
   * Requires `case.owner` scope.
   */
  async createApiKey(params: {
    tenantId: string
    description: string
  }): Promise<{ clientId: string; clientSecret: string; description: string }> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/api-keys`
    const res = (await this._http.post(url, { description: params.description })) as unknown

    if (res && typeof res === 'object') {
      const obj = res as { clientId?: string; clientSecret?: string; description?: string }
      if (obj.clientId && obj.clientSecret) {
        return {
          clientId: obj.clientId,
          clientSecret: obj.clientSecret,
          description: obj.description ?? ''
        }
      }
    }

    throw new Error('Unexpected API key creation response')
  }

  /**
   * Delete an API key for a tenant.
   *
   * Uses the management endpoint: DELETE /management/tenants/{tenantId}/api-keys/{keyId}
   * Requires `case.owner` scope.
   *
   * @param params.keyId - The Keycloak internal UUID of the API key client
   */
  async deleteApiKey(params: { tenantId: string; keyId: string }): Promise<void> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/api-keys/${encodeURIComponent(params.keyId)}`
    await this._http.delete(url)
  }

  // ── Member Management ───────────────────────────────────────────

  /**
   * List tenant members (Keycloak users with client roles).
   * Requires `case.owner` scope.
   */
  async listMembers(params: { tenantId: string }): Promise<TenantMember[]> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/members`
    const res = (await this._http.get(url)) as unknown
    if (res && typeof res === 'object' && 'members' in res) {
      const obj = res as { members?: unknown }
      if (Array.isArray(obj.members)) return obj.members as TenantMember[]
    }
    return []
  }

  /**
   * Add or ensure a member by email and assign a role.
   * New users get a temporary password (returned once) and must change it on first login.
   * Requires `case.owner` scope.
   */
  async createMember(params: {
    tenantId: string
    email: string
    role: TenantMemberRole
  }): Promise<TenantMember & {
    temporaryPassword: string | null
    mustChangePassword: boolean
    created: boolean
  }> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/members`
    const res = (await this._http.post(url, {
      email: params.email,
      role: params.role,
    })) as unknown
    if (res && typeof res === 'object') {
      const obj = res as {
        userId?: string
        email?: string
        role?: TenantMemberRole
        scopes?: string[]
        temporaryPassword?: string | null
        mustChangePassword?: boolean
        created?: boolean
      }
      if (obj.userId && obj.role) {
        return {
          userId: obj.userId,
          email: obj.email ?? params.email,
          username: null,
          role: obj.role,
          scopes: obj.scopes ?? [],
          temporaryPassword: obj.temporaryPassword ?? null,
          mustChangePassword: obj.mustChangePassword === true,
          created: obj.created === true,
        }
      }
    }
    throw new Error('Unexpected create member response')
  }

  /**
   * Update a member's role.
   * Requires `case.owner` scope.
   */
  async updateMember(params: {
    tenantId: string
    userId: string
    role: TenantMemberRole
  }): Promise<TenantMember> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/members/${encodeURIComponent(params.userId)}`
    const res = (await this._http.patch(url, { role: params.role })) as unknown
    if (res && typeof res === 'object') {
      const obj = res as { userId?: string; email?: string | null; role?: TenantMemberRole; scopes?: string[] }
      if (obj.userId && obj.role) {
        return {
          userId: obj.userId,
          email: obj.email ?? null,
          username: null,
          role: obj.role,
          scopes: obj.scopes ?? [],
        }
      }
    }
    throw new Error('Unexpected update member response')
  }

  /**
   * Remove a member's roles for this tenant.
   * Requires `case.owner` scope.
   */
  async deleteMember(params: { tenantId: string; userId: string }): Promise<void> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/members/${encodeURIComponent(params.userId)}`
    await this._http.delete(url)
  }

  // ── CASE Global (CGE) credentials ───────────────────────────────

  /**
   * Get public CGE credential status for a tenant (never returns the secret).
   * Requires `case.owner` (or `case.admin`).
   */
  async getCgeCredentials(params: { tenantId: string }): Promise<CgeCredentialsPublic> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/credentials`
    const res = (await this._http.get(url)) as unknown
    if (res && typeof res === 'object') {
      const obj = res as CgeCredentialsPublic
      return {
        configured: obj.configured === true,
        clientIdMasked: obj.clientIdMasked ?? null,
        discoveryUrl: obj.discoveryUrl ?? null,
        updatedAt: obj.updatedAt ?? null,
      }
    }
    return {
      configured: false,
      clientIdMasked: null,
      discoveryUrl: null,
      updatedAt: null,
    }
  }

  /**
   * Store / replace CGE org API key and OpenID discovery URL.
   * Requires `case.owner` (or `case.admin`).
   * Omit `clientSecret` (or pass empty) when updating discovery/clientId and keeping the existing secret.
   */
  async putCgeCredentials(params: {
    tenantId: string
    clientId: string
    clientSecret?: string
    discoveryUrl: string
  }): Promise<CgeCredentialsPublic> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/credentials`
    const res = (await this._http.put(url, {
      clientId: params.clientId,
      clientSecret: params.clientSecret ?? '',
      discoveryUrl: params.discoveryUrl,
    })) as unknown
    if (res && typeof res === 'object') {
      const obj = res as CgeCredentialsPublic
      return {
        configured: obj.configured === true,
        clientIdMasked: obj.clientIdMasked ?? null,
        discoveryUrl: obj.discoveryUrl ?? null,
        updatedAt: obj.updatedAt ?? null,
      }
    }
    throw new Error('Unexpected CGE credentials response')
  }

  /**
   * Delete stored CGE credentials for a tenant.
   * Requires `case.owner` (or `case.admin`).
   */
  async deleteCgeCredentials(params: { tenantId: string }): Promise<void> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/credentials`
    await this._http.delete(url)
  }

  /**
   * Test CGE credentials by minting a client_credentials token.
   * Requires `case.owner` (or `case.admin`).
   */
  async testCgeCredentials(params: { tenantId: string }): Promise<{ ok: boolean; message: string }> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/credentials/test`
    const res = (await this._http.post(url, {})) as unknown
    if (res && typeof res === 'object') {
      const obj = res as { ok?: boolean; message?: string }
      return { ok: obj.ok === true, message: obj.message ?? '' }
    }
    return { ok: false, message: 'Unexpected test response' }
  }

  // ── CASE Global (CGE) framework discovery + cache ─────────────────

  async listCgeFrameworks(params: {
    tenantId: string
    /** Coalition API `search` param (title/id text search). */
    search?: string
    /** @deprecated Use `search` — kept for backward compatibility. */
    q?: string
    limit?: number
    page?: number
    /** @deprecated Use `page` — converted server-side when present. */
    offset?: number
    region?: string
    sector?: string
    sort?: 'title' | 'published_at' | 'created_at'
    order?: 'asc' | 'desc'
  }): Promise<unknown> {
    const qs = new URLSearchParams()
    const search = params.search ?? params.q
    if (search) qs.set('search', search)
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.page != null) qs.set('page', String(params.page))
    if (params.offset != null) qs.set('offset', String(params.offset))
    if (params.region) qs.set('region', params.region)
    if (params.sector) qs.set('sector', params.sector)
    if (params.sort) qs.set('sort', params.sort)
    if (params.order) qs.set('order', params.order)
    const query = qs.toString()
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/frameworks${query ? `?${query}` : ''}`
    return await this._http.get(url)
  }

  async getCgeFramework(params: { tenantId: string; frameworkId: string }): Promise<unknown> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/frameworks/${encodeURIComponent(params.frameworkId)}`
    return await this._http.get(url)
  }

  async listCgeSubscriptions(params: { tenantId: string }): Promise<unknown> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/subscriptions`
    return await this._http.get(url)
  }

  async createCgeSubscription(params: {
    tenantId: string
    frameworkId: string
  }): Promise<unknown> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/subscriptions`
    return await this._http.post(url, { frameworkId: params.frameworkId })
  }

  async importCgeFramework(params: {
    tenantId: string
    frameworkId: string
    sourceUri?: string
    registryId?: string
    readOnly?: boolean
    subscribe?: boolean
    refresh?: boolean
    linkedFromDocId?: string
    caseVersion?: '1.0' | '1.1'
    skipPublisherAuth?: boolean
  }): Promise<CgeImportResult> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/import`
    const res = (await this._http.post(url, {
      frameworkId: params.frameworkId,
      sourceUri: params.sourceUri,
      registryId: params.registryId,
      readOnly: params.readOnly ?? true,
      subscribe: params.subscribe ?? false,
      refresh: params.refresh ?? false,
      linkedFromDocId: params.linkedFromDocId,
      caseVersion: params.caseVersion ?? '1.1',
      skipPublisherAuth: params.skipPublisherAuth ?? false,
    })) as unknown
    if (res && typeof res === 'object') {
      const obj = res as CgeImportResult
      return {
        status: obj.status ?? 'imported',
        id: obj.id ?? obj.docId ?? '',
        docId: obj.docId ?? obj.id ?? '',
        version: obj.version,
        cgeFrameworkId: obj.cgeFrameworkId,
        title: obj.title,
        sourceUri: obj.sourceUri,
        itemCount: obj.itemCount,
        cachedAt: obj.cachedAt,
        readOnly: obj.readOnly,
        fromCache: obj.fromCache,
      }
    }
    throw new Error('Unexpected CGE import response')
  }

  async refreshCgeCache(params: {
    tenantId: string
    frameworkId: string
    skipPublisherAuth?: boolean
  }): Promise<CgeImportResult> {
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/frameworks/${encodeURIComponent(params.frameworkId)}/refresh`
    const res = (await this._http.post(url, {
      skipPublisherAuth: params.skipPublisherAuth ?? false,
    })) as unknown
    if (res && typeof res === 'object') {
      const obj = res as CgeImportResult
      return {
        status: obj.status ?? 'refreshed',
        id: obj.id ?? obj.docId ?? '',
        docId: obj.docId ?? obj.id ?? '',
        cgeFrameworkId: obj.cgeFrameworkId,
        title: obj.title,
        sourceUri: obj.sourceUri,
        itemCount: obj.itemCount,
        cachedAt: obj.cachedAt,
      }
    }
    throw new Error('Unexpected CGE refresh response')
  }

  async searchCachedFrameworkItems(params: {
    tenantId: string
    docId: string
    q?: string
    limit?: number
    caseVersion?: '1.0' | '1.1'
  }): Promise<{ items: CachedFrameworkItemSummary[] }> {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.caseVersion) qs.set('caseVersion', params.caseVersion)
    const query = qs.toString()
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/cge/cache/${encodeURIComponent(params.docId)}/items${query ? `?${query}` : ''}`
    const res = (await this._http.get(url)) as unknown
    if (res && typeof res === 'object' && Array.isArray((res as any).items)) {
      return { items: (res as any).items as CachedFrameworkItemSummary[] }
    }
    return { items: [] }
  }
}

/** Summary of an API key returned by the list endpoint. */
export type ApiKeySummary = {
  id: string
  clientId: string
  description: string
}

export type TenantMemberRole = 'viewer' | 'author' | 'admin'

export type TenantMember = {
  userId: string
  email: string | null
  username?: string | null
  role: TenantMemberRole | null
  scopes: string[]
}

export type CgeCredentialsPublic = {
  configured: boolean
  clientIdMasked: string | null
  discoveryUrl: string | null
  updatedAt: string | null
}

