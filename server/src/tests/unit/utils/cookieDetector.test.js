// tests/unit/utils/cookieDetector.test.js

const cookieDetector = require('../../../utils/cookieDetector');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock del logger
jest.mock('../../../utils/logger');

describe('CookieDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectCookie', () => {
    test('debería detectar y analizar una cookie de Google Analytics correctamente', () => {
      // Arrange
      const cookie = {
        name: '_ga',
        value: 'GA1.2.123456789.1234567890',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax'
      };

      // Act
      const analysis = cookieDetector.detectCookie(cookie);

      // Assert
      expect(analysis).toEqual(expect.objectContaining({
        name: '_ga',
        category: 'analytics',
        provider: expect.objectContaining({
          name: 'Google',
          domain: 'google.com',
          verified: true
        }),
        attributes: expect.objectContaining({
          domain: 'example.com',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax'
        })
      }));
    });

    test('debería detectar y analizar una cookie de marketing correctamente', () => {
      // Arrange
      const cookie = {
        name: '_fbp',
        value: 'fb.1.1234567890.123456789',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: false
      };

      // Act
      const analysis = cookieDetector.detectCookie(cookie);

      // Assert
      expect(analysis).toEqual(expect.objectContaining({
        name: '_fbp',
        category: 'marketing',
        provider: expect.objectContaining({
          name: 'Facebook',
          domain: 'facebook.com',
          verified: true
        })
      }));
    });

    test('debería categorizar correctamente una cookie necesaria', () => {
      // Arrange
      const cookie = {
        name: 'PHPSESSID',
        value: '123456789abcdef',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true
      };

      // Act
      const analysis = cookieDetector.detectCookie(cookie);

      // Assert
      expect(analysis.category).toBe('necessary');
      expect(analysis.metadata.risk).toBe('low');
    });

    test('debería manejar cookies con formatos inválidos', () => {
      // Arrange
      const invalidCookie = {
        name: '',
        value: undefined
      };

      // Act
      const analysis = cookieDetector.detectCookie(invalidCookie);

      // Assert
      expect(analysis).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('debería detectar cookies de preferencias', () => {
      // Arrange
      const cookie = {
        name: 'user_preferences',
        value: 'theme=dark;lang=es',
        domain: 'example.com'
      };

      // Act
      const analysis = cookieDetector.detectCookie(cookie);

      // Assert
      expect(analysis.category).toBe('preferences');
      expect(analysis.metadata.valuePattern).toBe('kvp');
    });
  });

  describe('_detectCategory', () => {
    test('debería detectar categorías basadas en patrones conocidos', () => {
      const testCases = [
        { name: '_ga', expected: 'analytics' },
        { name: 'PHPSESSID', expected: 'necessary' },
        { name: '_fbp', expected: 'marketing' },
        { name: 'theme_preference', expected: 'preferences' }
      ];

      testCases.forEach(({ name, expected }) => {
        const cookie = { name };
        const category = cookieDetector._detectCategory(cookie);
        expect(category).toBe(expected);
      });
    });

    test('debería retornar "unknown" para cookies no reconocidas', () => {
      // Arrange
      const cookie = {
        name: 'random_cookie_name',
        value: 'random_value'
      };

      // Act
      const category = cookieDetector._detectCategory(cookie);

      // Assert
      expect(category).toBe('unknown');
    });
  });

  describe('_detectProvider', () => {
    test('debería identificar proveedores conocidos', () => {
      // Arrange
      const cookie = {
        name: '_ga',
        domain: 'analytics.google.com'
      };

      // Act
      const provider = cookieDetector._detectProvider(cookie);

      // Assert
      expect(provider).toEqual({
        name: 'Google',
        domain: 'google.com',
        verified: true
      });
    });

    test('debería manejar proveedores desconocidos', () => {
      // Arrange
      const cookie = {
        name: 'custom_cookie',
        domain: 'unknown-service.com'
      };

      // Act
      const provider = cookieDetector._detectProvider(cookie);

      // Assert
      expect(provider.verified).toBe(false);
      expect(provider.name).toBe('Unknown-service');
    });
  });

  describe('_analyzeAttributes', () => {
    test('debería analizar los atributos de la cookie correctamente', () => {
      // Arrange
      const cookie = {
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expires: new Date('2025-01-01')
      };

      // Act
      const attributes = cookieDetector._analyzeAttributes(cookie);

      // Assert
      expect(attributes).toEqual(expect.objectContaining({
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expiration: expect.any(Object),
        size: expect.any(Object)
      }));
    });
  });

  describe('_assessRisk', () => {
    test('debería evaluar correctamente el riesgo de las cookies', () => {
      const testCases = [
        {
          cookie: {
            secure: false,
            httpOnly: false,
            sameSite: null,
            value: 'x'.repeat(1500)
          },
          expectedRisk: 'high'
        },
        {
          cookie: {
            secure: true,
            httpOnly: true,
            sameSite: 'Strict',
            value: 'short_value'
          },
          expectedRisk: 'low'
        }
      ];

      testCases.forEach(({ cookie, expectedRisk }) => {
        const risk = cookieDetector._assessRisk(cookie);
        expect(risk).toBe(expectedRisk);
      });
    });
  });
});