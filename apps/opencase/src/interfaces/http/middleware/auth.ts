import { Request, Response, NextFunction } from 'express'
import { OidcJwtVerifier } from '../../../infrastructure/auth/OidcJwtVerifier'

/**
 * Strict auth middleware — rejects requests without a valid Bearer JWT.
 * Used for management API routes.
 */
export function makeAuthMiddleware (verifier: OidcJwtVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization')
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = header.slice('Bearer '.length)

    try {
      const payload = await verifier.verify(token)
      const tenantId = (payload as any).tenantId as string | undefined
      if (!tenantId) {
        return res.status(401).json({ error: 'Invalid token (missing tenantId)' })
      }
      ;(req as any).tenantId = tenantId
      ;(req as any).user = payload
      ;(req as any).isAuthenticated = true
      return next()
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token', message: err?.message })
    }
  }
}

/**
 * Optional auth middleware — attempts JWT verification but passes through
 * unauthenticated if no token is supplied at all. Used for CASE Provider API
 * routes where public-licensed frameworks are accessible without auth.
 *
 * If a Bearer token IS supplied but fails verification, this rejects with 401
 * rather than silently falling back to anonymous access — an explicitly
 * presented credential that doesn't verify should not be indistinguishable
 * from "no credential was offered" (see RFC 6750 §3, invalid_token).
 *
 * Sets `req.isAuthenticated` to true/false so controllers can decide.
 *
 * CASE IDs are globally unique, so the read API does not need a tenantId to
 * resolve entities — controllers use global lookups instead. Only authenticated
 * requests set a tenantId (from the JWT) for scoping list endpoints.
 */
export function makeOptionalAuthMiddleware (verifier: OidcJwtVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization')
    if (!header || !header.startsWith('Bearer ')) {
      // No token — unauthenticated request; no tenantId needed (global lookup)
      ;(req as any).isAuthenticated = false
      return next()
    }

    const token = header.slice('Bearer '.length)

    try {
      const payload = await verifier.verify(token)
      const tokenTenantId = (payload as any).tenantId as string | undefined
      if (!tokenTenantId) {
        // Valid JWT but missing tenantId — treat as unauthenticated
        ;(req as any).isAuthenticated = false
        return next()
      }
      ;(req as any).tenantId = tokenTenantId
      ;(req as any).user = payload
      ;(req as any).isAuthenticated = true
      return next()
    } catch (err: any) {
      // A token was explicitly presented but failed verification — reject
      // rather than treating this the same as an anonymous request.
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"')
      return res.status(401).json({ error: 'Invalid token', message: err?.message })
    }
  }
}

