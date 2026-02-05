import { Request, Response, NextFunction } from 'express'
import { OidcJwtVerifier } from '../../../infrastructure/auth/OidcJwtVerifier'

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
      return next()
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token', message: err?.message })
    }
  }
}

