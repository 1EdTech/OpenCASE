export interface AppConfig {
  httpPort: number;
  caseDataDir: string;
  /**
   * OIDC issuer URL (Keycloak realm issuer), e.g. http://localhost:3000/realms/opencase
   * This is the external URL that appears in JWT tokens (iss claim).
   */
  oidcIssuerUrl: string;
  /**
   * Optional internal URL for fetching JWKS (when running behind a reverse proxy).
   * e.g. http://keycloak:8080/realms/opencase for internal Docker network access.
   * If not set, uses oidcIssuerUrl.
   */
  oidcJwksFetchUrl?: string;
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

  // SMTP for Keycloak email delivery (forgot-password, etc.)
  smtpHost?: string;
  smtpPort?: string;
  smtpFrom?: string;

  /**
   * Default CTDL registry origin used to resolve bare CTIDs on import
   * (e.g. https://credentialengineregistry.org, or a sandbox/self-hosted registry).
   * A full resource URL passed to import overrides this per request.
   */
  credentialRegistryBaseUrl: string;

  /**
   * Registry Assistant publishing config. Per-tenant secrets live in env for now
   * (future: fetched via a Keycloak sign-on event with the Registry). Defaults to
   * the sandbox environment; production is opt-in per publish request.
   */
  registryAssistant: {
    environment: 'sandbox' | 'production';
    sandboxBaseUrl: string;
    productionBaseUrl: string;
    /** Per-organization API key (secret). Absent = publishing disabled. */
    apiKey?: string;
    /** CTID of the publishing organization (PublishForOrganizationIdentifier). */
    organizationCtid?: string;
    /** Request timeout in ms for Registry Assistant calls (format/publish). */
    timeoutMs: number;
  };
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
    oidcJwksFetchUrl: process.env.OIDC_JWKS_FETCH_URL,
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
    keycloakSystemAdminPassword: process.env.KEYCLOAK_SYSTEM_ADMIN_PASSWORD ?? 'admin',

    // SMTP — defaults to 'mailpit' for Docker Compose dev environment
    smtpHost: process.env.SMTP_HOST ?? (isProduction ? undefined : 'mailpit'),
    smtpPort: process.env.SMTP_PORT ?? '1025',
    smtpFrom: process.env.SMTP_FROM ?? 'noreply@opencase.local',

    credentialRegistryBaseUrl: process.env.CREDENTIAL_REGISTRY_BASE_URL ?? 'https://credentialengineregistry.org',

    registryAssistant: {
      environment: (process.env.REGISTRY_ASSISTANT_ENVIRONMENT === 'production' ? 'production' : 'sandbox'),
      sandboxBaseUrl: process.env.REGISTRY_ASSISTANT_SANDBOX_BASE_URL ?? 'https://sandbox.credentialengine.org',
      productionBaseUrl: process.env.REGISTRY_ASSISTANT_PRODUCTION_BASE_URL ?? 'https://apps.credentialengine.org',
      apiKey: process.env.REGISTRY_ASSISTANT_API_KEY,
      organizationCtid: process.env.REGISTRY_ASSISTANT_ORG_CTID,
      timeoutMs: Number(process.env.REGISTRY_ASSISTANT_TIMEOUT_MS ?? 60000),
    },
  };
}

