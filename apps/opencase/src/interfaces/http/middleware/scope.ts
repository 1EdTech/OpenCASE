import { Request, Response, NextFunction } from 'express'

/**
 * Creates middleware that requires a specific scope in the JWT token
 */
export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - no user information' })
    }

    const scopes = normalizeScopes(user)
    
    if (!scopes.includes(requiredScope)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Required scope '${requiredScope}' not found in token` 
      })
    }

    return next()
  }
}

/**
 * Creates middleware that requires any of the specified scopes in the JWT token
 */
export function requireAnyScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - no user information' })
    }

    const scopes = normalizeScopes(user)
    
    const hasRequiredScope = requiredScopes.some(scope => scopes.includes(scope))
    
    if (!hasRequiredScope) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Required scope(s) '${requiredScopes.join(' or ')}' not found in token` 
      })
    }

    return next()
  }
}

function normalizeScopes (user: any): string[] {
  const raw = user?.scope
  if (typeof raw === 'string') {
    return raw.split(' ').filter(Boolean)
  }
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean)
  }

  // Keycloak fallback: accept client/realm roles as scopes
  const scopes: string[] = []
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

