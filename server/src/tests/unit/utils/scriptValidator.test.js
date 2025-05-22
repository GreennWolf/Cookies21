// src/tests/unit/utils/scriptValidator.test.js
const scriptValidator = require('../../../utils/scriptValidator');
const logger = require('../../../utils/logger');
const urlHelpers = require('../../../utils/urlHelpers');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../utils/logger');
jest.mock('../../../utils/urlHelpers', () => ({
  parseUrl: jest.fn()
}));

// Definir una implementación para parseUrl que use el constructor URL
beforeEach(() => {
  urlHelpers.parseUrl.mockImplementation(url => {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  });
});

describe('ScriptValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateScript', () => {
    test('debería validar scripts externos válidos', () => {
      // Arrange
      const script = {
        src: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
        type: 'external',
        async: true,
        defer: false
      };

      // Act
      const result = scriptValidator.validateScript(script);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.domain).toBe('cdn.jsdelivr.net');
    });

    test('debería validar scripts inline válidos', () => {
      // Arrange
      const script = {
        content: `
          function sum(a, b) {
            return a + b;
          }
          console.log(sum(1, 2));
        `,
        type: 'inline'
      };

      // Act
      const result = scriptValidator.validateScript(script);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debería detectar patrones peligrosos', () => {
      // Arrange
      const script = {
        content: `
          eval('alert("test")');
          document.write('hack');
          someElement.innerHTML = '<script>malicious</script>';
        `,
        type: 'inline'
      };

      // Act
      const result = scriptValidator.validateScript(script);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Dangerous pattern detected'));
    });

    test('debería validar atributos de script', () => {
      // Arrange
      const script = {
        src: 'https://example.com/script.js',
        type: 'external',
        async: true,
        defer: true,
        crossOrigin: 'invalid'
      };

      // Act
      const result = scriptValidator.validateScript(script);

      // Assert
      expect(result.errors).toContain('Invalid crossorigin attribute');
    });
  });

  describe('validateInlineScript', () => {
    test('debería validar sintaxis JavaScript', () => {
      const validScript = `
        const x = 1;
        const y = 2;
        console.log(x + y);
      `;

      const invalidScript = `
        const x = 1;
        console.log(y; // error de sintaxis
      `;

      const validResult = scriptValidator.validateInlineScript(validScript);
      const invalidResult = scriptValidator.validateInlineScript(invalidScript);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    test('debería detectar uso de APIs sensibles', () => {
      const script = `
        localStorage.setItem('key', 'value');
        sessionStorage.getItem('key');
        navigator.geolocation.getCurrentPosition();
      `;

      const result = scriptValidator.validateInlineScript(script);
      expect(result.warnings).toHaveLength(3);
      expect(result.metadata.apis).toContain('localStorage');
      expect(result.metadata.apis).toContain('sessionStorage');
    });
  });

  describe('isTrustedSource', () => {
    test('debería identificar fuentes confiables', () => {
      const trustedUrls = [
        'https://www.google-analytics.com/analytics.js',
        'https://cdn.jsdelivr.net/npm/jquery',
        'https://cdnjs.cloudflare.com/ajax/libs/lodash/4.17.21/lodash.min.js'
      ];

      const untrustedUrls = [
        'https://malicious-cdn.com/script.js',
        'http://unsecure-cdn.com/script.js',
        'https://unknown-source.com/analytics.js'
      ];

      trustedUrls.forEach(url => {
        expect(scriptValidator.isTrustedSource(url)).toBe(true);
      });

      untrustedUrls.forEach(url => {
        expect(scriptValidator.isTrustedSource(url)).toBe(false);
      });
    });
  });

  describe('_compareObjects', () => {
    test('debería comparar objetos recursivamente', () => {
      const obj1 = {
        name: 'test',
        config: {
          enabled: true,
          options: ['a', 'b']
        }
      };

      const obj2 = {
        name: 'test',
        config: {
          enabled: false,
          options: ['a', 'c']
        }
      };

      const differences = [];
      scriptValidator._compareObjects(
        obj1, 
        obj2, 
        [], 
        differences, 
        { maxDepth: 3, ignoreArrayOrder: false }
      );

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'config.enabled',
          oldValue: true,
          newValue: false
        })
      );
    });
  });

  describe('_validateAttributes', () => {
    test('debería validar atributos de script', () => {
      const validAttributes = {
        type: 'text/javascript',
        async: true,
        defer: false,
        crossOrigin: 'anonymous',
        integrity: 'sha384-validHash'
      };

      const invalidAttributes = {
        type: 'invalid/type',
        crossOrigin: 'invalid',
        integrity: 'invalid-hash'
      };

      const validResult = scriptValidator._validateScriptAttributes({ ...validAttributes });
      const invalidResult = scriptValidator._validateScriptAttributes({ ...invalidAttributes });

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid crossorigin attribute');
    });
  });

  describe('error handling', () => {
    test('debería manejar errores inesperados', () => {
      // Simular error en esprima
      jest.spyOn(require('esprima'), 'parseScript').mockImplementation(() => {
        throw new Error('Parsing error');
      });

      const result = scriptValidator.validateScript({
        content: 'valid code',
        type: 'inline'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Internal validation error');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
