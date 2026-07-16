import { logger } from '../logging/Logger'

type TokenCache = {
  accessToken: string
  expiresAtMs: number
}

/**
 * OAuth2 client_credentials token client for CASE Global (org API key).
 */
export class CgeAuthClient {
  private cache = new Map<string, TokenCache>()

  constructor (
    private readonly tokenUrl: string
  ) {}

  async getAccessToken (clientId: string, clientSecret: string): Promise<string> {
    const cacheKey = clientId
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAtMs) {
      return cached.accessToken
    }

    return await this.fetchToken(clientId, clientSecret)
  }

  /** Force mint a new token (e.g. after HTTP 401). */
  async refreshAccessToken (clientId: string, clientSecret: string): Promise<string> {
    this.cache.delete(clientId)
    return await this.fetchToken(clientId, clientSecret)
  }

  private async fetchToken (clientId: string, clientSecret: string): Promise<string> {
    if (!this.tokenUrl) {
      throw new Error('CGE_TOKEN_URL is not configured')
    }

    const params = new URLSearchParams()
    params.set('grant_type', 'client_credentials')
    params.set('client_id', clientId)
    params.set('client_secret', clientSecret)

    const res = await fetch(this.tokenUrl, {
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
    this.cache.set(clientId, {
      accessToken: json.access_token,
      expiresAtMs: Date.now() + (expiresIn * 1000) - 30_000
    })

    return json.access_token
  }
}
