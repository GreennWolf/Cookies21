// tests/unit/utils/scriptSanitizer.test.js
const scriptSanitizer = require('../../../utils/scriptSanitizer');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
jest.mock('../../../utils/logger');

describe('ScriptSanitizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeScript', () => {
    test('debería remover patrones peligrosos', () => {
      const dangerousScript = `
        <script>
          eval('alert("test")');
          document.write('test');
          setTimeout('alert("test")', 1000);
        </script>
      `;

      const sanitized = scriptSanitizer.sanitizeScript(dangerousScript);
      
      expect(sanitized).not.toContain('eval');
      expect(sanitized).not.toContain('document.write');
      expect(sanitized).not.toContain('setTimeout');
    });

    test('debería preservar código JavaScript seguro', () => {
      const safeScript = `
        const add = (a, b) => a + b;
        const result = add(1, 2);
        console.log(result);
      `;

      const sanitized = scriptSanitizer.sanitizeScript(safeScript);
      expect(sanitized).toContain('const add');
      expect(sanitized).toContain('console.log');
    });

    test('debería manejar APIs sensibles', () => {
      const script = `
        localStorage.setItem('test', 'value');
        sessionStorage.getItem('test');
      `;

      const sanitized = scriptSanitizer.sanitizeScript(script);
      expect(sanitized).toContain('console.warn');
      expect(sanitized).toContain('Accessing sensitive API');
    });

    test('debería envolver el código en un scope seguro', () => {
      const script = 'console.log("test");';
      const sanitized = scriptSanitizer.sanitizeScript(script);

      expect(sanitized).toContain('use strict');
      expect(sanitized).toContain('const safeWindow');
    });

    test('debería manejar entradas inválidas', () => {
      const invalidInputs = [null, undefined, 123, {}];
      
      invalidInputs.forEach(input => {
        if (!input || typeof input !== 'string') {
          logger.error('Invalid input provided to sanitizeScript:', { input });
          return '';
        }
        const result = scriptSanitizer.sanitizeScript(input);
        expect(result).toBe('');
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('sanitizeInlineCode', () => {
    test('debería limpiar código inline', () => {
      const inlineCode = `
        alert('test');//comentario malicioso
        /* comentario
           multilinea */
      `;

      const sanitized = scriptSanitizer.sanitizeInlineCode(inlineCode);
      expect(sanitized).not.toContain('//');
      expect(sanitized).not.toContain('/*');
    });

    test('debería escapar caracteres especiales', () => {
      const code = '<script>alert("test")</script>';
      const sanitized = scriptSanitizer.sanitizeInlineCode(code);
      
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('_validateScriptUrl', () => {
    test('debería validar URLs de script', () => {
      const validUrl = 'https://example.com/script.js';
      const invalidUrl = 'http://malicious.com/script.js';

      expect(scriptSanitizer._isValidScriptUrl(validUrl)).toBe(true);
      expect(scriptSanitizer._isValidScriptUrl(invalidUrl)).toBe(false);
    });
  });
});