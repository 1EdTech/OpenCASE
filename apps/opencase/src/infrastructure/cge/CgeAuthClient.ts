import { logger } from '../logging/Logger'

type TokenCache = {
  accessToken: string
  expiresAtMs: number
}

/**
 * OAuth2 client_credentials token client for CASE Global (org API key).
 * Token URL is supplied per call so each tenant can use its own CGE endpoint.
 */
export class CgeAuthClient {
  private cache = new Map<string, TokenCache>()

  private cacheKey (tokenUrl: string, clientId: string): string {
    return `${tokenUrl}::${clientId}`
  }

  async getAccessToken (tokenUrl: string, clientId: string, clientSecret: string): Promise<string> {
    const key = this.cacheKey(tokenUrl, clientId)
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expiresAtMs) {
      return cached.accessToken
    }

    return await this.fetchToken(tokenUrl, clientId, clientSecret)
  }

  /** Force mint a new token (e.g. after HTTP 401). */
  async refreshAccessToken (tokenUrl: string, clientId: string, clientSecret: string): Promise<string> {
    this.cache.delete(this.cacheKey(tokenUrl, clientId))
    return await this.fetchToken(tokenUrl, clientId, clientSecret)
  }

  private async fetchToken (tokenUrl: string, clientId: string, clientSecret: string): Promise<string> {
    const url = tokenUrl.trim()
    if (!url) {
      throw new Error('CGE token URL is not configured for this tenant')
    }

    const params = new URLSearchParams()
    params.set('grant_type', 'client_credentials')
    params.set('client_id', clientId)
    params.set('client_secret', clientSecret)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: params.toString()
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn({ status: res.status, body: body.slice(0, 500) }, 'CGE token request failed')
      throw new Error(`Failed to obtain CGE access token: ${res.status} ${res.statusText}`)
    }

    const json = await res.json() as { access_token?: string, expires_in?: number }
    if (!json.access_token) {
      throw new Error('CGE token response missing access_token')
    }

    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 300
    this.cache.set(this.cacheKey(url, clientId), {
      accessToken: json.access_token,
      expiresAtMs: Date.now() + (expiresIn * 1000) - 30_000
    })

    return json.access_token
  }
}
