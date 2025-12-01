import jwt, { JwtPayload } from 'jsonwebtoken';

export interface JwtVerifierConfig {
  issuer: string;
  audience: string;
  publicKey: string;
}

export class JwtVerifier {
  constructor(private readonly cfg: JwtVerifierConfig) {}

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.cfg.publicKey, {
      algorithms: ['RS256'],
      issuer: this.cfg.issuer,
      audience: this.cfg.audience
    }) as JwtPayload;
  }
}

