const providerService = require('../../../services/provider.service');
const { cache } = require('../../../config/redis');

// Mock de la caché de Redis
jest.mock('../../../config/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

describe('ProviderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectCookieProvider', () => {
    test('debería detectar proveedor por nombre de cookie', async () => {
      // Arrange
      const cookie = {
        name: '_ga',
        domain: 'example.com',
        value: 'GA1.2.123456789.1234567890'
      };

      cache.get.mockResolvedValue(null);
      cache.set.mockResolvedValue('OK');

      // Act
      const result = await providerService.detectCookieProvider(cookie);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Google Analytics',
        category: 'analytics',
        iabVendorId: 755
      }));
    });

    test('debería detectar proveedor por dominio', async () => {
      // Arrange
      const cookie = {
        name: 'unknown_cookie',
        domain: 'analytics.google.com',
        value: 'test123'
      };

      cache.get.mockResolvedValue(null);

      // Act
      const result = await providerService.detectCookieProvider(cookie);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Google Analytics',
        category: 'analytics'
      }));
    });

    test('debería devolver proveedor desde caché si existe', async () => {
      // Arrange
      const cookie = {
        name: 'test_cookie',
        domain: 'example.com'
      };

      const cachedProvider = {
        name: 'Test Provider',
        category: 'testing',
        verified: true
      };

      cache.get.mockResolvedValue(JSON.stringify(cachedProvider));

      // Act
      const result = await providerService.detectCookieProvider(cookie);

      // Assert
      expect(result).toEqual(cachedProvider);
    });

    test('debería manejar cookies desconocidas', async () => {
      // Arrange
      const cookie = {
        name: 'unknown_cookie',
        domain: 'unknown.com'
      };

      cache.get.mockResolvedValue(null);

      // Act
      const result = await providerService.detectCookieProvider(cookie);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Unknown',
        category: 'unknown',
        verified: false
      }));
    });
  });

  describe('detectScriptProvider', () => {
    test('debería detectar proveedor por URL del script', async () => {
      // Arrange
      const script = {
        url: 'https://www.google-analytics.com/analytics.js',
        content: '// Google Analytics code'
      };

      cache.get.mockResolvedValue(null);

      // Act
      const result = await providerService.detectScriptProvider(script);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Google Analytics',
        category: 'analytics'
      }));
    });

    test('debería detectar proveedor por contenido del script', async () => {
      // Arrange
      const script = {
        content: 'window.fbq = function() { // Facebook Pixel code }'
      };

      cache.get.mockResolvedValue(null);

      // Act
      const result = await providerService.detectScriptProvider(script);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Facebook',
        category: 'marketing'
      }));
    });

    test('debería detectar múltiples proveedores en el mismo script', async () => {
      // Arrange
      const script = {
        content: 'gtag("config", "UA-123456-7"); fbq("init", "123456789");'
      };

      cache.get.mockResolvedValue(null);

      // Act
      const result = await providerService.detectScriptProvider(script);

      // Assert
      expect(result).toBeTruthy();
    });
  });

  describe('trusted sources', () => {
    test('debería identificar fuentes confiables', () => {
      const trustedDomains = ['google-analytics.com', 'facebook.com'];
      trustedDomains.forEach(domain => {
        expect(providerService.knownProviders.has(domain)).toBeTruthy();
      });
    });

    test('debería identificar fuentes no confiables', () => {
      const untrustedDomains = ['malicious.com', 'unknown.com'];
      untrustedDomains.forEach(domain => {
        expect(providerService.knownProviders.has(domain)).toBeFalsy();
      });
    });
  });

  describe('verifyProvider', () => {
    test('debería verificar proveedor conocido', async () => {
      // Arrange
      const provider = {
        domain: 'google-analytics.com',
        name: 'Google Analytics'
      };

      // Act
      const result = await providerService.verifyProvider(provider);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Google Analytics',
        category: 'analytics',
        verified: true,
        iabVendorId: expect.any(Number)
      }));
    });

    test('debería verificar proveedor desconocido', async () => {
      // Arrange
      const provider = {
        domain: 'unknown-analytics.com',
        name: 'Unknown Service'
      };

      // Act
      const result = await providerService.verifyProvider(provider);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        domain: provider.domain,
        name: provider.name,
        verified: false
      }));
    });
  });
});
