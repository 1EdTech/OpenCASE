export type CgeOpenIdDiscovery = {
  discoveryUrl: string
  issuer: string
  tokenUrl: string
  apiBaseUrl: string
}

/** Normalize user input to a full OpenID Connect discovery document URL. */
export function normalizeOpenIdDiscoveryUrl (input: string): string {
  const trimmed = input.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (trimmed.includes('/.well-known/openid-configuration')) {
    return trimmed
  }
  return `${trimmed}/.well-known/openid-configuration`
}

/**
 * Fetch an OIDC discovery document and derive CGE coalition API + token endpoints.
 * API base is the discovery URL origin (e.g. https://caseglobal-preview.1edtech.org).
 */
export async function resolveCgeOpenIdDiscovery (discoveryInput: string): Promise<CgeOpenIdDiscovery> {
  const discoveryUrl = normalizeOpenIdDiscoveryUrl(discoveryInput)
  if (!discoveryUrl) {
    throw new Error('OpenID discovery URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(discoveryUrl)
  } catch {
    throw new Error('OpenID discovery URL is not a valid URL')
  }

  const res = await fetch(discoveryUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenID discovery failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const doc = await res.json() as { issuer?: string, token_endpoint?: string }
  const tokenUrl = typeof doc.token_endpoint === 'string' ? doc.token_endpoint.trim() : ''
  if (!tokenUrl) {
    throw new Error('OpenID discovery document is missing token_endpoint')
  }

  const apiBaseUrl = `${parsed.protocol}//${parsed.host}`

  return {
    discoveryUrl,
    issuer: typeof doc.issuer === 'string' ? doc.issuer.trim() : '',
    tokenUrl,
    apiBaseUrl
  }
}
