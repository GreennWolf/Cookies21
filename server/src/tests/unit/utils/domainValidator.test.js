// tests/unit/utils/domainValidator.test.js
const domainValidator = require('../../../utils/domainValidator');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../utils/logger');

describe('DomainValidator', () => {
  describe('validateDomain', () => {
    test('debería validar dominios correctos', async () => {
      // En entorno de test (sin DNS ni SSL) se pasan opciones para evitar que la validación falle
      const validDomains = [
        'example.com',
        'sub.example.com',
        'example.co.uk'
      ];

      for (const domain of validDomains) {
        const result = await domainValidator.validateDomain(domain, {
          checkDNS: false,
          enforceSSL: false
        });
        expect(result.isValid).toBe(true);
      }
    });

    test('debería rechazar dominios inválidos', async () => {
      const invalidDomains = [
        'not_valid',
        'example',
        'example..com',
        'example.invalid'
      ];

      for (const domain of invalidDomains) {
        const result = await domainValidator.validateDomain(domain);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('debería validar opciones de configuración', async () => {
      const domain = 'example.com';
      const options = {
        checkDNS: true,
        allowSubdomains: true,
        allowIP: false,
        enforceSSL: true
      };

      const result = await domainValidator.validateDomain(domain, options);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.dns).toBeDefined();
      expect(result.metadata.ssl).toBeDefined();
    });
  });

  describe('areDomainsRelated', () => {
    test('debería identificar dominios relacionados', () => {
      const testCases = [
        {
          domain1: 'example.com',
          domain2: 'sub.example.com',
          expected: true
        },
        {
          domain1: 'example.com',
          domain2: 'different.com',
          expected: false
        }
      ];

      testCases.forEach(({ domain1, domain2, expected }) => {
        expect(domainValidator.areDomainsRelated(domain1, domain2)).toBe(expected);
      });
    });
  });
});
