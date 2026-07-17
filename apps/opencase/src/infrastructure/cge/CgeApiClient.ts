import { logger } from '../logging/Logger'
import type { CgeAuthClient } from './CgeAuthClient'
import type { CgeCredentials, FileCgeCredentialsStore } from './FileCgeCredentialsStore'
import {
  buildFrameworkListQuery,
  extractCoalitionDataList,
  extractCoalitionPagination,
  matchFrameworkEntry,
  resolvePublisherUriFromCoalition
} from './cgeCoalitionHelpers'

export type ResolvedCoalitionFramework = {
  /** Registry row from coalition search (includes frameworkId + sourceUri). */
  entry: any
  /** Optional detail from GET /api/coalition/frameworks/{registryId}. */
  detail: any
  sourceUri: string
}

export class CgeApiClient {
  constructor (
    private readonly auth: CgeAuthClient,
    private readonly credentialsStore: FileCgeCredentialsStore,
    /** Optional deployment-wide defaults when a tenant omits an endpoint. */
    private readonly defaults: { apiBaseUrl?: string, tokenUrl?: string } = {}
  ) {}

  private resolveEndpoints (creds: CgeCredentials): { apiBaseUrl: string, tokenUrl: string } {
    const apiBaseUrl = (creds.apiBaseUrl || this.defaults.apiBaseUrl || '').trim().replace(/\/$/, '')
    const tokenUrl = (creds.tokenUrl || this.defaults.tokenUrl || '').trim()
    if (!apiBaseUrl) {
      throw new Error('CGE API base URL is not configured for this tenant')
    }
    if (!tokenUrl) {
      throw new Error('CGE token URL is not configured for this tenant')
    }
    return { apiBaseUrl, tokenUrl }
  }

  private async withToken <T>(
    tenantId: string,
    fn: (accessToken: string, apiBaseUrl: string) => Promise<T>
  ): Promise<T> {
    const creds = await this.credentialsStore.get(tenantId)
    if (!creds) {
      throw new Error('CGE credentials are not configured for this tenant')
    }
    const { apiBaseUrl, tokenUrl } = this.resolveEndpoints(creds)

    const token = await this.auth.getAccessToken(tokenUrl, creds.clientId, creds.clientSecret)
    try {
      return await fn(token, apiBaseUrl)
    } catch (err: any) {
      if (err?.status === 401) {
        const refreshed = await this.auth.refreshAccessToken(tokenUrl, creds.clientId, creds.clientSecret)
        return await fn(refreshed, apiBaseUrl)
      }
      throw err
    }
  }

  private async request (
    apiBaseUrl: string,
    accessToken: string,
    method: string,
    path: string,
    body?: unknown
  ): Promise<any> {
    const url = `${apiBaseUrl.replace(/\/$/, '')}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
    let payload: string | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const res = await fetch(url, { method, headers, body: payload })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error: any = new Error(`CGE API error: ${method} ${path} -> ${res.status}. ${text.slice(0, 500)}`)
      error.status = res.status
      throw error
    }
    if (res.status === 204) return null
    return await res.json().catch(() => null)
  }

  async listFrameworks (tenantId: string, query?: Record<string, string>): Promise<any> {
    const coalitionQuery = buildFrameworkListQuery(query)
    const qs = Object.keys(coalitionQuery).length > 0
      ? `?${new URLSearchParams(coalitionQuery).toString()}`
      : ''
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'GET', `/api/coalition/frameworks${qs}`)
    )
  }

  /** GET /api/coalition/frameworks/{id} — id is the registry entry UUID, not frameworkId. */
  async getFrameworkRegistryEntry (tenantId: string, registryId: string): Promise<any> {
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'GET', `/api/coalition/frameworks/${encodeURIComponent(registryId)}`)
    )
  }

  /** @deprecated Use getFrameworkRegistryEntry — param is registry UUID, not frameworkId. */
  async getFramework (tenantId: string, registryId: string): Promise<any> {
    return this.getFrameworkRegistryEntry(tenantId, registryId)
  }

  /**
   * Resolve a coalition framework by CASE frameworkId:
   * 1. Optional registry detail when registryId is known
   * 2. GET /api/coalition/frameworks?search={frameworkId}
   * 3. Paginate coalition list and match frameworkId exactly
   * 4. When sourceUri is already known (from browse UI), use it without registry match
   */
  async resolveFramework (
    tenantId: string,
    frameworkId: string,
    sourceUri?: string,
    registryId?: string
  ): Promise<ResolvedCoalitionFramework> {
    const trimmedId = frameworkId.trim()
    if (!trimmedId) {
      throw new Error('frameworkId is required')
    }

    const trimmedRegistryId = registryId?.trim()
    let entry: any = null

    if (trimmedRegistryId) {
      try {
        entry = await this.getFrameworkRegistryEntry(tenantId, trimmedRegistryId)
      } catch (registryErr: any) {
        logger.warn({ tenantId, frameworkId: trimmedId, registryId: trimmedRegistryId, error: registryErr?.message }, 'CGE registry lookup by id failed')
      }
    }

    if (!entry) {
      const searchRes = await this.listFrameworks(tenantId, { search: trimmedId, limit: '100' })
      entry = matchFrameworkEntry(extractCoalitionDataList(searchRes), trimmedId, trimmedRegistryId)
    }

    if (!entry) {
      entry = await this.findFrameworkInCoalitionPages(tenantId, trimmedId, trimmedRegistryId)
    }

    if (!entry) {
      try {
        entry = await this.getFrameworkRegistryEntry(tenantId, trimmedId)
      } catch {
        entry = null
      }
    }

    const explicitSourceUri = (sourceUri ?? '').trim()
    if (!entry && explicitSourceUri) {
      logger.info({ tenantId, frameworkId: trimmedId, sourceUri: explicitSourceUri }, 'Using coalition sourceUri from client without registry match')
      entry = {
        frameworkId: trimmedId,
        id: trimmedRegistryId,
        sourceUri: explicitSourceUri
      }
    }

    if (!entry) {
      throw new Error(`Framework not found in CASE Global registry: ${trimmedId}`)
    }

    let detail = entry
    const resolvedRegistryId = typeof entry.id === 'string' ? entry.id.trim() : trimmedRegistryId ?? ''
    if (resolvedRegistryId && resolvedRegistryId !== trimmedId) {
      try {
        detail = await this.getFrameworkRegistryEntry(tenantId, resolvedRegistryId)
      } catch (detailErr: any) {
        logger.warn({ tenantId, frameworkId: trimmedId, registryId: resolvedRegistryId, error: detailErr?.message }, 'CGE registry detail fetch failed; using list row')
      }
    }

    const resolvedUri = resolvePublisherUriFromCoalition(entry, detail, explicitSourceUri)
    if (!resolvedUri) {
      throw new Error('Could not resolve publisher URI for framework')
    }

    return { entry, detail, sourceUri: resolvedUri }
  }

  /** Paginate coalition browse until a frameworkId/registryId match is found. */
  private async findFrameworkInCoalitionPages (
    tenantId: string,
    frameworkId: string,
    registryId?: string
  ): Promise<any | null> {
    const pageLimit = 100
    let page = 1
    let totalPages = 1

    while (page <= totalPages && page <= 20) {
      const listRes = await this.listFrameworks(tenantId, { limit: String(pageLimit), page: String(page) })
      const match = matchFrameworkEntry(extractCoalitionDataList(listRes), frameworkId, registryId)
      if (match) return match

      const pagination = extractCoalitionPagination(listRes)
      totalPages = pagination?.totalPages ?? page
      if (!extractCoalitionDataList(listRes).length) break
      page += 1
    }

    return null
  }

  async createSubscription (tenantId: string, body: unknown): Promise<any> {
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'POST', '/api/coalition/subscriptions', body)
    )
  }

  async listSubscriptions (tenantId: string, query?: Record<string, string>): Promise<any> {
    const qs = query && Object.keys(query).length > 0
      ? `?${new URLSearchParams(query).toString()}`
      : ''
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'GET', `/api/coalition/subscriptions${qs}`)
    )
  }

  /**
   * Fetch a CFPackage from a publisher CASE host, presenting the CGE JWT.
   * Accepts either wrapped ({ CFPackage: ... }) or flat CASE JSON.
   */
  async fetchPublisherPackage (tenantId: string, endpointUrl: string, options?: { skipAuth?: boolean }): Promise<any> {
    if (options?.skipAuth) {
      const res = await fetch(endpointUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const error: any = new Error(`Publisher fetch failed: ${res.status}. ${text.slice(0, 500)}`)
        error.status = res.status
        throw error
      }
      return await res.json()
    }

    return await this.withToken(tenantId, async (token) => {
      const fetchOnce = async (accessToken: string) => {
        const res = await fetch(endpointUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json'
          }
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          const error: any = new Error(`Publisher fetch failed: ${res.status}. ${text.slice(0, 500)}`)
          error.status = res.status
          throw error
        }
        return await res.json()
      }

      try {
        return await fetchOnce(token)
      } catch (err: any) {
        if (err?.status !== 401) throw err
        const creds = await this.credentialsStore.get(tenantId)
        if (!creds) throw err
        const { tokenUrl } = this.resolveEndpoints(creds)
        const refreshed = await this.auth.refreshAccessToken(tokenUrl, creds.clientId, creds.clientSecret)
        return await fetchOnce(refreshed)
      }
    })
  }

  async testCredentials (tenantId: string): Promise<{ ok: boolean, message: string }> {
    try {
      const creds = await this.credentialsStore.get(tenantId)
      if (!creds) {
        return { ok: false, message: 'No credentials configured' }
      }
      const { tokenUrl } = this.resolveEndpoints(creds)
      await this.auth.refreshAccessToken(tokenUrl, creds.clientId, creds.clientSecret)
      return { ok: true, message: 'Token minted successfully' }
    } catch (error: any) {
      logger.warn({ tenantId, error: error?.message }, 'CGE credential test failed')
      return { ok: false, message: error?.message || 'Token request failed' }
    }
  }
}
