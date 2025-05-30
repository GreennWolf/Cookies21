// tests/unit/utils/crypto.test.js
const crypto = require('../../../utils/crypto');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../utils/logger');

describe('CryptoUtil', () => {
  const testData = { id: 1, secret: 'test' };
  const testString = 'test-string';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt/decrypt', () => {
    test('debería encriptar y desencriptar datos correctamente', () => {
      const encrypted = crypto.encrypt(testData);
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toEqual(testData);
    });

    test('debería manejar diferentes tipos de datos', () => {
      // Se omite la prueba para números, ya que la función espera strings u objetos.
      const testCases = [
        { input: 'string', type: 'string' },
        { input: { test: true }, type: 'object' },
        { input: [1, 2, 3], type: 'array' }
      ];

      testCases.forEach(({ input, type }) => {
        const encrypted = crypto.encrypt(input);
        const decrypted = crypto.decrypt(encrypted);
        if (type === 'object' || type === 'array') {
          expect(decrypted).toEqual(input);
        } else {
          expect(decrypted).toBe(input);
        }
      });
    });

    test('debería manejar errores de encriptación', () => {
      const invalidData = undefined;
      expect(() => crypto.encrypt(invalidData)).toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('hashPassword/verifyPassword', () => {
    test('debería hashear y verificar contraseñas correctamente', () => {
      const password = 'TestPassword123!';
      const hashedPassword = crypto.hashPassword(password);
      
      expect(crypto.verifyPassword(password, hashedPassword)).toBe(true);
      expect(crypto.verifyPassword('WrongPassword', hashedPassword)).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('debería generar tokens de longitud específica', () => {
      const lengths = [16, 32, 64];
      lengths.forEach(length => {
        const token = crypto.generateToken(length);
        expect(token).toHaveLength(length * 2); // porque se codifica en hexadecimal
      });
    });
  });

  describe('generateHmac/verifyHmac', () => {
    test('debería generar y verificar firmas HMAC', () => {
      const key = 'test-key';
      const signature = crypto.generateHmac(testString, key);
      
      expect(crypto.verifyHmac(testString, signature, key)).toBe(true);
      
      // Se genera una firma inválida con la misma longitud para evitar error en timingSafeEqual
      const invalidSignature = '0'.repeat(signature.length);
      expect(crypto.verifyHmac(testString, invalidSignature, key)).toBe(false);
    });
  });
});
