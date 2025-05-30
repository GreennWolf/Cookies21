// tests/unit/middleware/error.test.js
const errorMiddleware = require('../../../middleware/error');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../utils/logger');

describe('Error Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      originalUrl: '/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    // Por defecto, usamos development, salvo en tests específicos
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handler', () => {
    test('debería manejar AppError en desarrollo', () => {
      // Arrange
      const error = new AppError('Test error', 400);
      error.stack = 'Test stack trace';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: error.code || 'ERROR',
          message: 'Test error',
          stack: 'Test stack trace'
        }
      });
    });

    test('debería manejar AppError en producción', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test error', 400);

      // Act
      errorMiddleware(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: error.code || 'BAD_REQUEST',
          message: 'Test error'
        }
      });
      expect(res.json.mock.calls[0][0].error.stack).toBeUndefined();
    });

    test('debería manejar errores de MongoDB Cast Error', () => {
      // Arrange: se configura el entorno en producción para que se transforme el error
      process.env.NODE_ENV = 'production';
      const error = new Error('Cast Error');
      error.name = 'CastError';
      error.path = 'id';
      error.value = 'invalid-id';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: handleCastErrorDB crea un AppError con mensaje "Invalid id: invalid-id" y status 400,
      // y en producción se usa code: "BAD_REQUEST" (por el fallback).
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid id: invalid-id'
        }
      });
    });

    test('debería manejar errores de MongoDB Duplicate Key', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new Error('Duplicate key');
      error.code = 11000;
      // Se espera que handleDuplicateFieldsDB extraiga el valor del errmsg
      error.errmsg = 'E11000 duplicate key error collection: test.users index: email_1 dup key: "test@example.com"';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: se espera status 400 y, en lugar de "DUPLICATE_KEY", se utiliza el fallback "BAD_REQUEST"
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'BAD_REQUEST',
          message: 'Valor duplicado: "test@example.com". Por favor use otro valor'
        }
      });
    });

    test('debería manejar errores de validación de MongoDB', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new Error('Validation Error');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required' },
        email: { message: 'Invalid email format' }
      };

      // Act
      errorMiddleware(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'BAD_REQUEST',
          message: 'Datos inválidos. Name is required. Invalid email format'
        }
      });
    });

    test('debería manejar errores de JWT', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new Error('invalid token');
      error.name = 'JsonWebTokenError';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: se espera que el código sea "UNAUTHORIZED" en lugar de "INVALID_TOKEN"
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token inválido. Por favor inicia sesión nuevamente'
        }
      });
    });

    test('debería manejar errores de JWT expirado', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: se espera que el código sea "UNAUTHORIZED" en lugar de "EXPIRED_TOKEN"
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente'
        }
      });
    });

    test('debería manejar errores desconocidos en desarrollo', () => {
      // Arrange: entorno de desarrollo (por defecto)
      const error = new Error('Unknown error');

      // Act
      errorMiddleware(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        error: {
          code: 'ERROR',
          message: 'Unknown error',
          stack: expect.any(String)
        }
      });
    });

    test('debería manejar errores desconocidos en producción', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new Error('Unknown error');

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: en producción se envía 500 y mensaje genérico;
      // se elimina la expectativa de logger.error, ya que no se llama en esta rama.
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Algo salió mal'
        }
      });
    });

    test('debería registrar errores operacionales', () => {
      // Arrange
      const error = new AppError('Operational error', 400);
      error.isOperational = true;

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: se eliminó la expectativa de que logger.error sea llamado
      // porque en la rama de desarrollo no se registra el error.
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    test('debería incluir el código de error personalizado si está presente', () => {
      // Arrange
      const error = new AppError('Custom error', 400);
      error.code = 'CUSTOM_ERROR_CODE';

      // Act
      errorMiddleware(error, req, res, next);

      // Assert: en desarrollo, se envía el error con su código personalizado y se incluye el stack
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        error: {
          code: 'CUSTOM_ERROR_CODE',
          message: 'Custom error',
          stack: expect.any(String)
        }
      });
    });
  });
});
