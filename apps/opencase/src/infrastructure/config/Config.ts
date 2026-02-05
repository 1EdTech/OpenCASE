export interface AppConfig {
  httpPort: number;
  caseDataDir: string;
  /**
   * OIDC issuer URL (Keycloak realm issuer), e.g. http://localhost:8081/realms/opencase
   * Note: in docker-compose we use http://keycloak:8080/realms/opencase for in-network calls.
   */
  oidcIssuerUrl: string;
  /**
   * Client-per-tenant convention: client_id (and typically token azp) is `${oidcClientIdPrefix}${tenantId}`
   */
  oidcClientIdPrefix: string;

  // Keycloak Admin API (used for tenant bootstrap)
  keycloakBaseUrl: string;
  keycloakRealm: string;
  keycloakAdminRealm: string;
  keycloakAdminClientId: string;
  keycloakAdminClientSecret?: string;
  keycloakAdminUsername?: string;
  keycloakAdminPassword?: string;

  // Defaults used when creating new SPA clients per tenant
  keycloakSpaRedirectUris: string[];
  keycloakSpaWebOrigins: string[];

  // Optional bootstrap for initial access to /management/tenants (case.admin)
  keycloakBootstrapSystemAdmin: boolean;
  keycloakSystemAdminEmail: string;
  keycloakSystemAdminPassword: string;
}

export function loadConfig(): AppConfig {
  const parseCsv = (value: string | undefined): string[] =>
    (value ?? '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)

  const isProduction = (process.env.NODE_ENV ?? '').toLowerCase() === 'production'

  return {
    httpPort: Number(process.env.PORT ?? 8080),
    caseDataDir: process.env.CASE_DATA_DIR ?? 'data',
    oidcIssuerUrl: process.env.OIDC_ISSUER_URL ?? 'http://localhost:8081/realms/opencase',
    oidcClientIdPrefix: process.env.OIDC_CLIENT_ID_PREFIX ?? 'tenant-',

    keycloakBaseUrl: process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8081',
    keycloakRealm: process.env.KEYCLOAK_REALM ?? 'opencase',
    keycloakAdminRealm: process.env.KEYCLOAK_ADMIN_REALM ?? 'master',
    keycloakAdminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? 'admin-cli',
    keycloakAdminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
    // Dev default matches docker-compose Keycloak defaults; override in production.
    keycloakAdminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? 'admin',
    keycloakAdminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',

    keycloakSpaRedirectUris: parseCsv(process.env.KEYCLOAK_SPA_REDIRECT_URIS ?? 'http://localhost:3000/*'),
    keycloakSpaWebOrigins: parseCsv(process.env.KEYCLOAK_SPA_WEB_ORIGINS ?? 'http://localhost:3000'),

    // Default to true for local/dev so a usable initial client+user exists without extra env setup.
    keycloakBootstrapSystemAdmin: (process.env.KEYCLOAK_BOOTSTRAP_SYSTEM_ADMIN ?? (isProduction ? 'false' : 'true')) === 'true',
    keycloakSystemAdminEmail: process.env.KEYCLOAK_SYSTEM_ADMIN_EMAIL ?? 'system-admin@local',
    keycloakSystemAdminPassword: process.env.KEYCLOAK_SYSTEM_ADMIN_PASSWORD ?? 'admin'
  };
}

