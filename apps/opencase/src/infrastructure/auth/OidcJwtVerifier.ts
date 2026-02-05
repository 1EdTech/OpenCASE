import jwt, { JwtPayload } from 'jsonwebtoken'
import crypto from 'node:crypto'

export interface OidcJwtVerifierConfig {
  issuerUrl: string
  /**
   * Client-per-tenant convention: expected client_id/azp is `${clientIdPrefix}${tenantId}`
   */
  clientIdPrefix: string
  /**
   * JWKS cache TTL in milliseconds
   */
  jwksCacheTtlMs?: number
}

type Jwk = {
  kid: string
  kty: string
  alg?: string
  use?: string
  n?: string
  e?: string
}

type Jwks = { keys: Jwk[] }

export class OidcJwtVerifier {
  private readonly jwksCacheTtlMs: number
  private oidcConfigCache?: { jwksUri: string, fetchedAtMs: number }
  private jwksCache?: { keysByKid: Map<string, string>, fetchedAtMs: number }

  constructor (private readonly cfg: OidcJwtVerifierConfig) {
    this.jwksCacheTtlMs = cfg.jwksCacheTtlMs ?? 10 * 60 * 1000
  }

  async verify (token: string): Promise<JwtPayload> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid token')
    }

    const header = decoded.header as { kid?: string }
    const kid = header.kid
    if (!kid) {
      throw new Error('Missing kid in token header')
    }

    const publicKeyPem = await this.getPublicKeyForKid(kid)

    const payload = jwt.verify(token, publicKeyPem, {
      algorithms: ['RS256'],
      issuer: this.cfg.issuerUrl
    }) as JwtPayload

    const tenantId = (payload as any).tenantId as string | undefined
    if (!tenantId) {
      throw new Error('Missing tenantId claim')
    }

    const expectedClientId = `${this.cfg.clientIdPrefix}${tenantId}`

    const aud = payload.aud
    const azp = (payload as any).azp as string | undefined
    const audOk =
      typeof aud === 'string'
        ? aud === expectedClientId
        : Array.isArray(aud)
          ? aud.includes(expectedClientId)
          : false

    const azpOk = azp ? azp === expectedClientId : false

    // Keycloak commonly sets azp=client_id; aud can be an array including "account"
    if (!audOk && !azpOk) {
      throw new Error(`Invalid audience/azp for tenant. Expected client_id '${expectedClientId}'`)
    }

    return payload
  }

  private async getPublicKeyForKid (kid: string): Promise<string> {
    const now = Date.now()

    // Cache hit
    if (this.jwksCache && (now - this.jwksCache.fetchedAtMs) < this.jwksCacheTtlMs) {
      const key = this.jwksCache.keysByKid.get(kid)
      if (key) return key
    }

    // Refresh JWKS and retry
    await this.refreshJwks()
    const key = this.jwksCache?.keysByKid.get(kid)
    if (!key) {
      throw new Error(`No matching JWKS key for kid '${kid}'`)
    }
    return key
  }

  private async refreshJwks (): Promise<void> {
    const now = Date.now()
    const jwksUri = await this.getJwksUri()

    const res = await fetch(jwksUri, { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Failed to fetch JWKS: ${res.status} ${res.statusText}. ${body}`)
    }

    const jwks = (await res.json()) as Jwks
    const keysByKid = new Map<string, string>()

    for (const jwk of jwks.keys ?? []) {
      if (!jwk.kid) continue
      const pem = this.jwkToPem(jwk)
      if (pem) keysByKid.set(jwk.kid, pem)
    }

    this.jwksCache = { keysByKid, fetchedAtMs: now }
  }

  private async getJwksUri (): Promise<string> {
    const now = Date.now()
    if (this.oidcConfigCache && (now - this.oidcConfigCache.fetchedAtMs) < this.jwksCacheTtlMs) {
      return this.oidcConfigCache.jwksUri
    }

    const url = new URL('.well-known/openid-configuration', this.cfg.issuerUrl.endsWith('/') ? this.cfg.issuerUrl : `${this.cfg.issuerUrl}/`)
    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Failed to fetch OIDC configuration: ${res.status} ${res.statusText}. ${body}`)
    }

    const cfg = await res.json() as { jwks_uri?: string }
    if (!cfg.jwks_uri) throw new Error('OIDC configuration missing jwks_uri')

    this.oidcConfigCache = { jwksUri: cfg.jwks_uri, fetchedAtMs: now }
    return cfg.jwks_uri
  }

  private jwkToPem (jwk: Jwk): string | null {
    // Node can convert RSA JWK -> KeyObject -> PEM
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) return null
    try {
      const keyObject = crypto.createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' as any })
      return keyObject.export({ type: 'spki', format: 'pem' }).toString()
    } catch {
      return null
    }
  }

  static computeTenantClientId (prefix: string, tenantId: string): string {
    return `${prefix}${tenantId}`
  }
}

