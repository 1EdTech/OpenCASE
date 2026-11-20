type AppConfig = {
  opencaseBaseUrl: string
  oidcAuthority: string
  oidcClientIdPrefix: string
  /** The OpenCASE tenant users sign in to; `system` unless VITE_DEFAULT_TENANT_ID overrides it. */
  defaultTenantId: string
}

function readRequiredEnv(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = (import.meta.env[key] as unknown as string | undefined) ?? fallback
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

function readOptionalEnv(key: string): string | null {
  const value = (import.meta.env[key] as unknown as string | undefined) ?? null
  return value?.trim() || null
}

export function getAppConfig(): AppConfig {
  return {
    // Defaults match `docs/backend_intro.md` for local dev.
    opencaseBaseUrl: readRequiredEnv('VITE_OPENCASE_BASE_URL', 'http://localhost:8080'),
    oidcAuthority: readRequiredEnv('VITE_OIDC_AUTHORITY', 'http://localhost:8081/realms/opencase'),
    oidcClientIdPrefix: readRequiredEnv('VITE_OIDC_CLIENT_ID_PREFIX', 'tenant-'),
    defaultTenantId: readOptionalEnv('VITE_DEFAULT_TENANT_ID') ?? 'system',
  }
}

