import { Request, Response, NextFunction } from 'express';
import { JwtVerifier } from '../../../infrastructure/auth/JwtVerifier';

export function makeAuthMiddleware(verifier: JwtVerifier) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = verifier.verify(token);
      // naive: assume tenantId claim
      (req as any).tenantId = (payload as any).tenantId ?? 'demo';
      (req as any).user = payload;
      return next();
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

