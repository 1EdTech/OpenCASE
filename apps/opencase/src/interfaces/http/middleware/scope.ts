import { Request, Response, NextFunction } from 'express'

/** Hierarchy: membership labels + case.* scopes. case.admin (system) is orthogonal. */
const SCOPE_IMPLIES: Record<string, string[]> = {
  admin: ['case.owner', 'case.write', 'case.read'],
  author: ['case.write', 'case.read'],
  viewer: ['case.read'],
  'case.owner': ['case.write', 'case.read'],
  'case.write': ['case.read'],
}

export function expandScopes (scopes: string[]): Set<string> {
  const expanded = new Set(scopes)
  // Fixed-point expansion so owner → write → read
  let changed = true
  while (changed) {
    changed = false
    for (const s of [...expanded]) {
      for (const implied of SCOPE_IMPLIES[s] ?? []) {
        if (!expanded.has(implied)) {
          expanded.add(implied)
          changed = true
        }
      }
    }
  }
  return expanded
}

export function normalizeScopes (user: any): string[] {
  const raw = user?.scope
  const scopes: string[] = []
  if (typeof raw === 'string') {
    scopes.push(...raw.split(' ').filter(Boolean))
  } else if (Array.isArray(raw)) {
    scopes.push(...raw.map(String).filter(Boolean))
  }

  // Keycloak fallback: accept client/realm roles as scopes
  const realmRoles = user?.realm_access?.roles
  if (Array.isArray(realmRoles)) scopes.push(...realmRoles.map(String))

  const resourceAccess = user?.resource_access
  if (resourceAccess && typeof resourceAccess === 'object') {
    for (const client of Object.values(resourceAccess as Record<string, any>)) {
      const roles = client?.roles
      if (Array.isArray(roles)) scopes.push(...roles.map(String))
    }
  }

  return scopes.filter(Boolean)
}

export function userHasScope (user: any, requiredScope: string): boolean {
  const expanded = expandScopes(normalizeScopes(user))
  return expanded.has(requiredScope)
}

/**
 * Creates middleware that requires a specific scope in the JWT token.
 * Applies hierarchy: case.owner satisfies case.write and case.read; case.write satisfies case.read.
 */
export function requireScope (requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - no user information' })
    }

    if (!userHasScope(user, requiredScope)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required scope '${requiredScope}' not found in token`
      })
    }

    return next()
  }
}

/**
 * Creates middleware that requires any of the specified scopes in the JWT token.
 */
export function requireAnyScope (...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - no user information' })
    }

    const hasRequiredScope = requiredScopes.some(scope => userHasScope(user, scope))

    if (!hasRequiredScope) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required scope(s) '${requiredScopes.join(' or ')}' not found in token`
      })
    }

    return next()
  }
}
