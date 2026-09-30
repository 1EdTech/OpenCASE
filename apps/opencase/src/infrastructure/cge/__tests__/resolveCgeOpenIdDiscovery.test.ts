import { normalizeOpenIdDiscoveryUrl, resolveCgeOpenIdDiscovery } from '../resolveCgeOpenIdDiscovery'

describe('normalizeOpenIdDiscoveryUrl', () => {
  it('appends well-known path to realm issuer URLs', () => {
    expect(normalizeOpenIdDiscoveryUrl('https://caseglobal-preview.1edtech.org/auth/realms/caseglobal'))
      .toBe('https://caseglobal-preview.1edtech.org/auth/realms/caseglobal/.well-known/openid-configuration')
  })

  it('preserves a full discovery URL', () => {
    const url = 'https://caseglobal-preview.1edtech.org/auth/realms/caseglobal/.well-known/openid-configuration'
    expect(normalizeOpenIdDiscoveryUrl(url)).toBe(url)
  })

  it('trims trailing slashes before normalizing', () => {
    expect(normalizeOpenIdDiscoveryUrl('https://example.com/realm/caseglobal/'))
      .toBe('https://example.com/realm/caseglobal/.well-known/openid-configuration')
  })
})

describe('resolveCgeOpenIdDiscovery', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('derives token and API base URLs from discovery document', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        issuer: 'https://caseglobal-preview.1edtech.org/auth/realms/caseglobal',
        token_endpoint: 'https://caseglobal-preview.1edtech.org/auth/realms/caseglobal/protocol/openid-connect/token'
      })
    })) as unknown as typeof fetch

    const result = await resolveCgeOpenIdDiscovery(
      'https://caseglobal-preview.1edtech.org/auth/realms/caseglobal/.well-known/openid-configuration'
    )

    expect(result.discoveryUrl).toContain('/.well-known/openid-configuration')
    expect(result.tokenUrl).toContain('/protocol/openid-connect/token')
    expect(result.apiBaseUrl).toBe('https://caseglobal-preview.1edtech.org')
  })

  it('throws when discovery document lacks token_endpoint', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ issuer: 'https://example.com' })
    })) as unknown as typeof fetch

    await expect(resolveCgeOpenIdDiscovery('https://example.com/realm')).rejects.toThrow(/token_endpoint/)
  })
})
