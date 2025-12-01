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
      delete process.env.PORT;
      delete process.env.CASE_DATA_DIR;
      delete process.env.JWT_PUBLIC_KEY;
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;

      const config = loadConfig();

      expect(config.httpPort).toBe(8080);
      expect(config.caseDataDir).toBe('data');
      expect(config.jwtPublicKey).toBe('changeme');
      expect(config.jwtIssuer).toBe('example-issuer');
      expect(config.jwtAudience).toBe('example-audience');
    });

    it('should load values from environment variables', () => {
      process.env.PORT = '3000';
      process.env.CASE_DATA_DIR = '/custom/data';
      process.env.JWT_PUBLIC_KEY = 'custom-key';
      process.env.JWT_ISSUER = 'custom-issuer';
      process.env.JWT_AUDIENCE = 'custom-audience';

      const config = loadConfig();

      expect(config.httpPort).toBe(3000);
      expect(config.caseDataDir).toBe('/custom/data');
      expect(config.jwtPublicKey).toBe('custom-key');
      expect(config.jwtIssuer).toBe('custom-issuer');
      expect(config.jwtAudience).toBe('custom-audience');
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

