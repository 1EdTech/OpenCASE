type AppConfig = {
  opencaseBaseUrl: string
  oidcAuthority: string
  oidcClientIdPrefix: string
}

function readRequiredEnv(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = (import.meta.env[key] as unknown as string | undefined) ?? fallback
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export function getAppConfig(): AppConfig {
  return {
    // Defaults match `docs/backend_intro.md` for local dev.
    opencaseBaseUrl: readRequiredEnv('VITE_OPENCASE_BASE_URL', 'http://localhost:8080'),
    oidcAuthority: readRequiredEnv('VITE_OIDC_AUTHORITY', 'http://localhost:8081/realms/opencase'),
    oidcClientIdPrefix: readRequiredEnv('VITE_OIDC_CLIENT_ID_PREFIX', 'tenant-'),
  }
}

