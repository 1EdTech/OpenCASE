import { loadConfig } from '../Config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default values when env vars are not set', () => {
      // By default, NODE_ENV is treated as non-production in this project.
      // In non-production, Keycloak system-admin bootstrap defaults to true.
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.CASE_DATA_DIR;
      delete process.env.OIDC_ISSUER_URL;
      delete process.env.OIDC_CLIENT_ID_PREFIX;
      delete process.env.KEYCLOAK_BASE_URL;
      delete process.env.KEYCLOAK_REALM;
      delete process.env.KEYCLOAK_ADMIN_REALM;
      delete process.env.KEYCLOAK_ADMIN_CLIENT_ID;
      delete process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
      delete process.env.KEYCLOAK_ADMIN_USERNAME;
      delete process.env.KEYCLOAK_ADMIN_PASSWORD;
      delete process.env.KEYCLOAK_SPA_REDIRECT_URIS;
      delete process.env.KEYCLOAK_SPA_WEB_ORIGINS;
      delete process.env.KEYCLOAK_BOOTSTRAP_SYSTEM_ADMIN;
      delete process.env.KEYCLOAK_SYSTEM_ADMIN_EMAIL;
      delete process.env.KEYCLOAK_SYSTEM_ADMIN_PASSWORD;

      const config = loadConfig();

      expect(config.httpPort).toBe(8080);
      expect(config.caseDataDir).toBe('data');
      expect(config.oidcIssuerUrl).toBe('http://localhost:8081/realms/opencase');
      expect(config.oidcClientIdPrefix).toBe('tenant-');
      expect(config.keycloakBaseUrl).toBe('http://localhost:8081');
      expect(config.keycloakRealm).toBe('opencase');
      expect(config.keycloakAdminRealm).toBe('master');
      expect(config.keycloakAdminClientId).toBe('admin-cli');
      expect(config.keycloakSpaRedirectUris).toEqual(['http://localhost:3000/*']);
      expect(config.keycloakSpaWebOrigins).toEqual(['http://localhost:3000']);
      expect(config.keycloakBootstrapSystemAdmin).toBe(true);
      expect(config.keycloakSystemAdminEmail).toBe('system-admin@local');
      expect(config.keycloakSystemAdminPassword).toBe('admin');
    });

    it('should default KEYCLOAK_BOOTSTRAP_SYSTEM_ADMIN to false in production when not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.KEYCLOAK_BOOTSTRAP_SYSTEM_ADMIN;

      const config = loadConfig();

      expect(config.keycloakBootstrapSystemAdmin).toBe(false);
    });

    it('should load values from environment variables', () => {
      process.env.PORT = '3000';
      process.env.CASE_DATA_DIR = '/custom/data';
      process.env.OIDC_ISSUER_URL = 'http://kc/realms/x';
      process.env.OIDC_CLIENT_ID_PREFIX = 't-';
      process.env.KEYCLOAK_BASE_URL = 'http://kc';
      process.env.KEYCLOAK_REALM = 'x';
      process.env.KEYCLOAK_ADMIN_REALM = 'master';
      process.env.KEYCLOAK_ADMIN_CLIENT_ID = 'admin-cli';
      process.env.KEYCLOAK_ADMIN_USERNAME = 'admin';
      process.env.KEYCLOAK_ADMIN_PASSWORD = 'admin';
      process.env.KEYCLOAK_SPA_REDIRECT_URIS = 'http://localhost:3000/*,http://localhost:5173/*';
      process.env.KEYCLOAK_SPA_WEB_ORIGINS = 'http://localhost:3000,http://localhost:5173';
      process.env.KEYCLOAK_BOOTSTRAP_SYSTEM_ADMIN = 'true';
      process.env.KEYCLOAK_SYSTEM_ADMIN_EMAIL = 'sys@local';
      process.env.KEYCLOAK_SYSTEM_ADMIN_PASSWORD = 'pw';

      const config = loadConfig();

      expect(config.httpPort).toBe(3000);
      expect(config.caseDataDir).toBe('/custom/data');
      expect(config.oidcIssuerUrl).toBe('http://kc/realms/x');
      expect(config.oidcClientIdPrefix).toBe('t-');
      expect(config.keycloakBaseUrl).toBe('http://kc');
      expect(config.keycloakRealm).toBe('x');
      expect(config.keycloakAdminUsername).toBe('admin');
      expect(config.keycloakAdminPassword).toBe('admin');
      expect(config.keycloakSpaRedirectUris).toEqual(['http://localhost:3000/*', 'http://localhost:5173/*']);
      expect(config.keycloakSpaWebOrigins).toEqual(['http://localhost:3000', 'http://localhost:5173']);
      expect(config.keycloakBootstrapSystemAdmin).toBe(true);
      expect(config.keycloakSystemAdminEmail).toBe('sys@local');
      expect(config.keycloakSystemAdminPassword).toBe('pw');
    });

    it('should convert PORT string to number', () => {
      process.env.PORT = '9000';

      const config = loadConfig();

      expect(config.httpPort).toBe(9000);
      expect(typeof config.httpPort).toBe('number');
    });

    it('should handle invalid PORT as NaN but still return number', () => {
      process.env.PORT = 'invalid';

      const config = loadConfig();

      expect(Number.isNaN(config.httpPort)).toBe(true);
    });
  });
});

