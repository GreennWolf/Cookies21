// src/tests/unit/middleware/cache.test.js

const { cacheControl } = require('../../../middleware/cache');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Cache Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      set: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheControl', () => {
    test('debería establecer headers de cache-control correctamente con tiempo en minutos', () => {
      // Arrange
      const duration = '5 minutes';
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(res.set).toHaveBeenCalledWith({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      expect(next).toHaveBeenCalled();
    });

    test('debería establecer headers de cache-control correctamente con tiempo en horas', () => {
      // Arrange
      const duration = '2 hours';
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=7200');
      expect(res.set).toHaveBeenCalledWith({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      expect(next).toHaveBeenCalled();
    });

    test('debería establecer no-cache cuando la duración es 0', () => {
      // Arrange
      const duration = '0';
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(res.set).toHaveBeenCalledWith({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      expect(next).toHaveBeenCalled();
    });

    test('debería manejar duraciones inválidas', () => {
      // Arrange
      const duration = 'invalid duration';
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(res.set).toHaveBeenCalledWith({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      expect(next).toHaveBeenCalled();
    });

    test('debería establecer headers adicionales de cache', () => {
      // Arrange
      const duration = '1 hour';
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
      expect(res.set).toHaveBeenCalledWith({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      expect(next).toHaveBeenCalled();
    });

    test('debería manejar errores y llamar a next', () => {
      // Arrange
      const duration = null; // Esto forzará un error en ms()
      const middleware = cacheControl(duration);

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });
});
