/**
 * Decode a JWT payload without verifying signature (UI gating only).
 * Server always enforces scopes.
 */
export function decodeJwtPayload (accessToken: string | null | undefined): Record<string, unknown> | null {
  if (!accessToken) return null
  const parts = accessToken.split('.')
  if (parts.length < 2) return null
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function base64UrlDecode (input: string): string {
  let base64 = input.replaceAll('-', '+').replaceAll('_', '/')
  const pad = base64.length % 4
  if (pad === 2) base64 += '=='
  else if (pad === 3) base64 += '='
  else if (pad === 1) base64 += '===' // invalid length; atob may still throw
  return atob(base64)
}

function collectScopes (payload: Record<string, unknown>): Set<string> {
  const scopes = new Set<string>()
  const raw = payload.scope
  if (typeof raw === 'string') {
    for (const s of raw.split(' ').filter(Boolean)) scopes.add(s)
  } else if (Array.isArray(raw)) {
    for (const s of raw) if (typeof s === 'string') scopes.add(s)
  }

  const realmAccess = payload.realm_access as { roles?: unknown } | undefined
  if (Array.isArray(realmAccess?.roles)) {
    for (const r of realmAccess.roles) if (typeof r === 'string') scopes.add(r)
  }

  const resourceAccess = payload.resource_access
  if (resourceAccess && typeof resourceAccess === 'object') {
    for (const client of Object.values(resourceAccess as Record<string, { roles?: unknown }>)) {
      const roles = client?.roles
      if (Array.isArray(roles)) {
        for (const r of roles) if (typeof r === 'string') scopes.add(r)
      }
    }
  }

  // Membership labels + case.* hierarchy (matches OpenCASE middleware)
  if (scopes.has('admin') || scopes.has('case.owner')) {
    scopes.add('case.owner')
    scopes.add('case.write')
    scopes.add('case.read')
  } else if (scopes.has('author') || scopes.has('case.write')) {
    scopes.add('case.write')
    scopes.add('case.read')
  } else if (scopes.has('viewer') || scopes.has('case.read')) {
    scopes.add('case.read')
  }

  return scopes
}

/** True when the access token can manage tenant members/keys (owner, membership admin, or system case.admin). */
export function tokenHasCaseOwner (accessToken: string | null | undefined): boolean {
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return false
  const scopes = collectScopes(payload)
  return scopes.has('case.owner') || scopes.has('admin') || scopes.has('case.admin')
}
