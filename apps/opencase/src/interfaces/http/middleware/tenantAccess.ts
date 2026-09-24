import type { Request, Response } from 'express'
import { getParam } from '../utils/expressParams'

/**
 * Validate that the JWT tenantId matches the URL :tenantId path param.
 * Returns the tenantId on success, or null after writing an error response.
 */
export function requireMatchingTenant (
  req: Request,
  res: Response
): string | null {
  const tokenTenantId = (req as any).tenantId as string | undefined
  const urlTenantId = getParam(req, 'tenantId')

  if (!urlTenantId) {
    res.status(400).json({ error: 'Missing tenantId' })
    return null
  }

  if (!tokenTenantId) {
    res.status(401).json({ error: 'Unauthorized - missing tenantId in token' })
    return null
  }

  if (urlTenantId !== tokenTenantId) {
    res.status(403).json({
      error: 'Tenant mismatch - authenticated tenant does not match URL parameter'
    })
    return null
  }

  return tokenTenantId
}
