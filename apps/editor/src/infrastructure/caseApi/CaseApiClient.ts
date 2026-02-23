import type { CFDocument, CFLicense, CFPackage, CFDefinition } from '@/domain/case/types'
import type { HttpClient } from './http'

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

  async listManagementCfPackages(params: { tenantId: string; caseVersion?: '1.0' | '1.1' }): Promise<OpenCaseManagementCfPackageSummary[]> {
    const caseVersion = params.caseVersion ?? '1.1'
    const res = (await this._http.get(`/management/tenants/${encodeURIComponent(params.tenantId)}/CFPackages?caseVersion=${encodeURIComponent(caseVersion)}`)) as unknown

    // Be tolerant of shape differences: `{ CFPackages: [...] }` or `[...]`.
    if (Array.isArray(res)) return res as OpenCaseManagementCfPackageSummary[]
    if (res && typeof res === 'object' && 'CFPackages' in res) {
      const any = res as { CFPackages?: unknown }
      if (Array.isArray(any.CFPackages)) return any.CFPackages as OpenCaseManagementCfPackageSummary[]
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
   * Import a CFPackage from an external CASE endpoint via the OpenCASE backend.
   *
   * The backend fetches the package (avoiding CORS), validates it, injects
   * source provenance metadata, and stores it in the tenant's framework store.
   */
  async importCfPackage(params: {
    tenantId: string
    endpointUrl: string
    caseVersion?: 'v1p0' | 'v1p1'
    accessToken?: string
  }): Promise<{ status: string; id: string; version: number; validationWarnings?: string[] }> {
    const v = params.caseVersion ?? 'v1p1'
    const url = `/management/tenants/${encodeURIComponent(params.tenantId)}/ims/case/${v}/CFPackages/import`

    const body: Record<string, unknown> = { endpointUrl: params.endpointUrl }
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
}

/** Summary of an API key returned by the list endpoint. */
export type ApiKeySummary = {
  id: string
  clientId: string
  description: string
}

