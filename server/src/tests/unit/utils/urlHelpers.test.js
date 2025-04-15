// tests/unit/utils/urlHelpers.test.js
const urlHelpers = require('../../../utils/urlHelpers');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
jest.mock('../../../utils/logger');

describe('URLHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseUrl', () => {
    test('debería parsear URLs válidas', () => {
      const validUrls = [
        'https://example.com',
        'https://sub.example.com/path',
        'http://example.com?param=value',
        'https://example.com:8080/path#hash'
      ];

      validUrls.forEach(url => {
        const parsed = urlHelpers.parseUrl(url);
        expect(parsed).toBeTruthy();
        expect(parsed instanceof URL).toBe(true);
      });
    });

    test('debería rechazar URLs inválidas', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/plain;base64,SGVsbG8='
      ];

      invalidUrls.forEach(url => {
        const parsed = urlHelpers.parseUrl(url);
        expect(parsed).toBeNull();
        expect(logger.debug).toHaveBeenCalled();
      });
    });

    test('debería validar longitud máxima de URL', () => {
      const longUrl = `https://example.com/${'x'.repeat(2048)}`;
      const parsed = urlHelpers.parseUrl(longUrl);
      expect(parsed).toBeNull();
    });
  });

  describe('normalizeUrl', () => {
    test('debería normalizar URLs correctamente', () => {
      const testCases = [
        {
          input: 'HTTPS://ExaMPle.COM/PATH/',
          expected: 'https://example.com/path'
        },
        {
          input: 'https://example.com/path/../other/path',
          expected: 'https://example.com/other/path'
        },
        {
          input: 'https://example.com/path?b=2&a=1',
          expected: 'https://example.com/path?a=1&b=2'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(urlHelpers.normalizeUrl(input)).toBe(expected);
      });
    });

    test('debería remover parámetros de tracking', () => {
      const url = 'https://example.com?utm_source=test&valid=true&fbclid=123';
      const normalized = urlHelpers.normalizeUrl(url);
      
      expect(normalized).not.toContain('utm_source');
      expect(normalized).not.toContain('fbclid');
      expect(normalized).toContain('valid=true');
    });
  });

  describe('extractBaseDomain', () => {
    test('debería extraer dominio base correctamente', () => {
      const testCases = [
        {
          input: 'https://example.com',
          expected: 'example.com'
        },
        {
          input: 'https://sub.example.com',
          expected: 'example.com'
        },
        {
          input: 'https://sub.sub.example.com',
          expected: 'example.com'
        },
        {
          input: 'https://example.co.uk',
          expected: 'example.co.uk'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(urlHelpers.extractBaseDomain(input)).toBe(expected);
      });
    });

    test('debería manejar TLDs especiales', () => {
      const testCases = [
        {
          input: 'https://example.co.uk',
          expected: 'example.co.uk'
        },
        {
          input: 'https://sub.example.co.jp',
          expected: 'example.co.jp'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(urlHelpers.extractBaseDomain(input)).toBe(expected);
      });
    });
  });

  describe('isSameDomain', () => {
    test('debería identificar URLs del mismo dominio', () => {
      const testCases = [
        {
          url1: 'https://example.com/path1',
          url2: 'https://example.com/path2',
          expected: true
        },
        {
          url1: 'https://sub1.example.com',
          url2: 'https://sub2.example.com',
          expected: true
        },
        {
          url1: 'https://example.com',
          url2: 'https://different.com',
          expected: false
        }
      ];

      testCases.forEach(({ url1, url2, expected }) => {
        expect(urlHelpers.isSameDomain(url1, url2)).toBe(expected);
      });
    });
  });

  describe('validateUrl', () => {
    test('debería validar URLs con diferentes opciones', () => {
      const url = 'https://example.com';
      const options = {
        protocols: ['https:'],
        allowIPs: false,
        requireSSL: true
      };

      const result = urlHelpers.validateUrl(url, options);
      expect(result.isValid).toBe(true);
    });

    test('debería validar restricciones de IP', () => {
      const testCases = [
        {
          url: 'https://192.168.1.1',
          allowIPs: false,
          expected: false
        },
        {
          url: 'https://8.8.8.8',
          allowIPs: true,
          expected: true
        }
      ];

      testCases.forEach(({ url, allowIPs, expected }) => {
        const result = urlHelpers.validateUrl(url, { allowIPs });
        expect(result.isValid).toBe(expected);
      });
    });

    test('debería validar longitudes máximas', () => {
      const longHostname = `${'x'.repeat(255)}.com`;
      const longPath = `/${'y'.repeat(1024)}`;

      const result1 = urlHelpers.validateUrl(`https://${longHostname}`);
      const result2 = urlHelpers.validateUrl(`https://example.com${longPath}`);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('resolveUrl', () => {
    test('debería resolver URLs relativas correctamente', () => {
      const testCases = [
        {
          base: 'https://example.com',
          path: '/path',
          expected: 'https://example.com/path'
        },
        {
          base: 'https://example.com/base/',
          path: '../other',
          expected: 'https://example.com/other'
        }
      ];

      testCases.forEach(({ base, path, expected }) => {
        expect(urlHelpers.resolveUrl(base, path)).toBe(expected);
      });
    });

    test('debería manejar entradas inválidas', () => {
      expect(urlHelpers.resolveUrl('invalid', '/path')).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('_cleanQueryParams', () => {
    test('debería limpiar y ordenar parámetros de query', () => {
      const params = new URLSearchParams();
      params.append('b', '2');
      params.append('a', '1');
      params.append('utm_source', 'test');

      const cleaned = urlHelpers._cleanQueryParams(params);
      const paramString = cleaned.toString();

      expect(paramString).toBe('a=1&b=2');
      expect(paramString).not.toContain('utm_source');
    });
  });

  describe('_isPrivateIP', () => {
    test('debería identificar IPs privadas', () => {
      const privateIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1'
      ];

      const publicIPs = [
        '8.8.8.8',
        '1.1.1.1',
        '216.58.214.174'
      ];

      privateIPs.forEach(ip => {
        expect(urlHelpers._isPrivateIP(ip)).toBe(true);
      });

      publicIPs.forEach(ip => {
        expect(urlHelpers._isPrivateIP(ip)).toBe(false);
      });
    });
  });
});