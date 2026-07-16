import { logger } from '../logging/Logger'
import type { CgeAuthClient } from './CgeAuthClient'
import type { FileCgeCredentialsStore } from './FileCgeCredentialsStore'

export class CgeApiClient {
  constructor (
    private readonly apiBaseUrl: string,
    private readonly auth: CgeAuthClient,
    private readonly credentialsStore: FileCgeCredentialsStore
  ) {}

  private async withToken <T>(
    tenantId: string,
    fn: (accessToken: string) => Promise<T>
  ): Promise<T> {
    const creds = await this.credentialsStore.get(tenantId)
    if (!creds) {
      throw new Error('CGE credentials are not configured for this tenant')
    }

    const token = await this.auth.getAccessToken(creds.clientId, creds.clientSecret)
    try {
      return await fn(token)
    } catch (err: any) {
      if (err?.status === 401) {
        const refreshed = await this.auth.refreshAccessToken(creds.clientId, creds.clientSecret)
        return await fn(refreshed)
      }
      throw err
    }
  }

  private async request (
    accessToken: string,
    method: string,
    path: string,
    body?: unknown
  ): Promise<any> {
    if (!this.apiBaseUrl) {
      throw new Error('CGE_API_BASE_URL is not configured')
    }
    const url = `${this.apiBaseUrl.replace(/\/$/, '')}${path}`
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
    return await this.withToken(tenantId, (token) =>
      this.request(token, 'GET', `/api/coalition/frameworks${qs}`)
    )
  }

  async getFramework (tenantId: string, frameworkId: string): Promise<any> {
    return await this.withToken(tenantId, (token) =>
      this.request(token, 'GET', `/api/coalition/frameworks/${encodeURIComponent(frameworkId)}`)
    )
  }

  async createSubscription (tenantId: string, body: unknown): Promise<any> {
    return await this.withToken(tenantId, (token) =>
      this.request(token, 'POST', '/api/coalition/subscriptions', body)
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
      await this.auth.refreshAccessToken(creds.clientId, creds.clientSecret)
      return { ok: true, message: 'Token minted successfully' }
    } catch (error: any) {
      logger.warn({ tenantId, error: error?.message }, 'CGE credential test failed')
      return { ok: false, message: error?.message || 'Token request failed' }
    }
  }
}
