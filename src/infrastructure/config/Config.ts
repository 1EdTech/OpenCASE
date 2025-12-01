export interface AppConfig {
  httpPort: number;
  caseDataDir: string;
  jwtPublicKey: string;
  jwtIssuer: string;
  jwtAudience: string;
}

export function loadConfig(): AppConfig {
  return {
    httpPort: Number(process.env.PORT ?? 8080),
    caseDataDir: process.env.CASE_DATA_DIR ?? 'data',
    jwtPublicKey: process.env.JWT_PUBLIC_KEY ?? 'changeme',
    jwtIssuer: process.env.JWT_ISSUER ?? 'example-issuer',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'example-audience'
  };
}

