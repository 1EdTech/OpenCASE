import { logger } from '../logging/Logger'
import type { CgeAuthClient } from './CgeAuthClient'
import type { CgeCredentials, FileCgeCredentialsStore } from './FileCgeCredentialsStore'

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
    const qs = query && Object.keys(query).length > 0
      ? `?${new URLSearchParams(query).toString()}`
      : ''
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'GET', `/api/coalition/frameworks${qs}`)
    )
  }

  async getFramework (tenantId: string, frameworkId: string): Promise<any> {
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'GET', `/api/coalition/frameworks/${encodeURIComponent(frameworkId)}`)
    )
  }

  async createSubscription (tenantId: string, body: unknown): Promise<any> {
    return await this.withToken(tenantId, (token, apiBaseUrl) =>
      this.request(apiBaseUrl, token, 'POST', '/api/coalition/subscriptions', body)
    )
  }

  /**
   * Fetch a CFPackage from a publisher CASE host, presenting the CGE JWT.
   */
  async fetchPublisherPackage (tenantId: string, endpointUrl: string): Promise<any> {
    return await this.withToken(tenantId, async (token) => {
      const res = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
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
