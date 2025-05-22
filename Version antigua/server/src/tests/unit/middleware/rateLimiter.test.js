// tests/unit/middleware/rateLimiter.test.js

const { rateLimiter } = require('../../../middleware/rateLimiter');
const logger = require('../../../utils/logger');
const AppError = require('../../../utils/appError');

jest.mock('../../../utils/logger');

// Mock del módulo express-rate-limit
const mockRateLimit = (config) => {
  return (req, res, next) => {
    if (config.skip && config.skip(req)) {
      return next();
    }

    if (req.simulateLimit) {
      config.handler(req, res, next);
      if (config.onLimitReached) {
        config.onLimitReached(req, res);
      }
      return;
    }

    if (req.simulateStoreError && config.onError) {
      config.onError(req.storeError, req);
    }

    return next();
  };
};

jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((config) => mockRateLimit(config));
});

describe('Rate Limiter Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      path: '/test',
      method: 'GET',
      headers: {},
      user: null,
      simulateLimit: false
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Rate Limiter Error Handling', () => {
    test('debería loguear intentos de exceso de límite', async () => {
      // Arrange
      const limiter = rateLimiter('test');
      req.simulateLimit = true;

      // Act
      await limiter(req, res, next);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded:',
        expect.objectContaining({
          type: 'test',
          ip: '127.0.0.1',
          path: '/test',
          method: 'GET'
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429
        })
      );
    });
  });

  describe('Rate Limiter Configuration', () => {
    test('debería aplicar configuración específica por tipo', async () => {
      // Arrange
      const limiter = rateLimiter('api');
      req.user = { role: 'admin' };

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    test('debería permitir sobrescribir opciones por defecto', async () => {
      // Arrange
      const customMessage = 'Custom limit message';
      const limiter = rateLimiter('test', { message: customMessage });
      req.simulateLimit = true;

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
          statusCode: 429
        })
      );
    });
  });

  describe('Rate Limiter Skip Logic', () => {
    test('debería saltar límites para administradores', async () => {
      // Arrange
      const limiter = rateLimiter('test');
      req.user = { role: 'admin' };

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    test('debería saltar límites para IPs en whitelist', async () => {
      // Arrange
      const whitelist = ['127.0.0.1'];
      const limiter = rateLimiter('test', { whitelist });

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    });
  });

  describe('Rate Limiter Store Errors', () => {
    test('debería manejar errores del store', async () => {
      // Arrange
      const limiter = rateLimiter('test');
      const error = new Error('Store error');
      req.simulateStoreError = true;
      req.storeError = error;

      // Act
      await limiter(req, res, next);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Rate limit error:',
        expect.objectContaining({
          error: error.message,
          type: 'test',
          ip: '127.0.0.1',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Rate Limiter Types', () => {
    test('debería aplicar configuración específica para tipo API', async () => {
      // Arrange
      const limiter = rateLimiter('api');
      req.simulateLimit = true;

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Límite de API excedido',
          statusCode: 429
        })
      );
    });

    test('debería aplicar configuración específica para tipo AUTH', async () => {
      // Arrange
      const limiter = rateLimiter('auth');
      req.simulateLimit = true;

      // Act
      await limiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Demasiados intentos de autenticación',
          statusCode: 429
        })
      );
    });
  });
});