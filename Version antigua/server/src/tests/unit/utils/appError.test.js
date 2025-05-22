// tests/unit/utils/appError.test.js
const AppError = require('../../../utils/appError');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('AppError', () => {
  describe('constructor', () => {
    test('debería crear un error con propiedades básicas', () => {
      const error = new AppError('Test error', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.code).toBe('BAD_REQUEST');
    });

    test('debería asignar status error para códigos 5xx', () => {
      const error = new AppError('Server error', 500);
      expect(error.status).toBe('error');
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('métodos estáticos', () => {
    test('badRequest debería crear error 400', () => {
      const error = AppError.badRequest('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    test('unauthorized debería crear error 401', () => {
      const error = AppError.unauthorized('Not authorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    test('forbidden debería crear error 403', () => {
      const error = AppError.forbidden('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    test('notFound debería crear error 404', () => {
      const error = AppError.notFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    test('validation debería crear error 422', () => {
      const error = AppError.validation('Invalid data');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('toJSON', () => {
    test('debería serializar error correctamente', () => {
      const error = new AppError('Test error', 400, ['Invalid field'], { context: 'test' });
      const json = error.toJSON();

      expect(json).toEqual({
        status: 'fail',
        code: 'BAD_REQUEST',
        message: 'Test error',
        errors: ['Invalid field'],
        metadata: { context: 'test' },
        timestamp: expect.any(Date),
        stack: expect.any(String)
      });
    });

    test('no debería incluir stack en producción', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new AppError('Test error', 400);
      const json = error.toJSON();

      expect(json.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getResponse', () => {
    test('debería formatear respuesta HTTP', () => {
      const error = new AppError('Test error', 400, ['Invalid field']);
      const response = error.getResponse();

      expect(response).toEqual({
        status: 'fail',
        error: {
          code: 'BAD_REQUEST',
          message: 'Test error',
          details: ['Invalid field'],
          timestamp: expect.any(Date)
        }
      });
    });

    test('no debería incluir details si no hay errores', () => {
      const error = new AppError('Test error', 400);
      const response = error.getResponse();

      expect(response.error.details).toBeUndefined();
    });
  });

  describe('addContext', () => {
    test('debería añadir contexto al error', () => {
      const error = new AppError('Test error', 400);
      error.addContext({ user: 'testUser', action: 'create' });

      expect(error.metadata).toEqual({
        user: 'testUser',
        action: 'create'
      });
    });

    test('debería mantener contexto existente', () => {
      const error = new AppError('Test error', 400, [], { existing: 'context' });
      error.addContext({ new: 'context' });

      expect(error.metadata).toEqual({
        existing: 'context',
        new: 'context'
      });
    });
  });

  describe('fromError', () => {
    test('debería convertir Error a AppError', () => {
      const originalError = new Error('System error');
      const appError = AppError.fromError(originalError);

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.statusCode).toBe(500);
      expect(appError.message).toBe('System error');
    });

    test('debería manejar errores de validación de Mongoose', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = { field: { message: 'Required' } };

      const appError = AppError.fromError(validationError);
      expect(appError.statusCode).toBe(422);
      expect(appError.metadata.validationErrors).toBeDefined();
    });

    test('debería manejar errores de duplicación de Mongo', () => {
      const mongoError = new Error('Duplicate key');
      mongoError.name = 'MongoError';
      mongoError.code = 11000;
      mongoError.keyValue = { email: 'test@example.com' };

      const appError = AppError.fromError(mongoError);
      expect(appError.statusCode).toBe(409);
      expect(appError.metadata.duplicateKey).toBeDefined();
    });
  });

  describe('isRetryable', () => {
    test('debería identificar errores retryables', () => {
      const retryableCodes = [408, 429, 502, 503, 504];
      
      retryableCodes.forEach(code => {
        const error = new AppError('Test error', code);
        expect(error.isRetryable()).toBe(true);
      });

      const nonRetryableCodes = [400, 401, 403, 404, 422, 500];
      nonRetryableCodes.forEach(code => {
        const error = new AppError('Test error', code);
        expect(error.isRetryable()).toBe(false);
      });
    });
  });

  describe('clone', () => {
    test('debería clonar error con nuevas propiedades', () => {
      const original = new AppError('Original error', 400, ['error1'], { meta: 'data' });
      const clone = original.clone({
        message: 'New message',
        statusCode: 500
      });

      expect(clone).toBeInstanceOf(AppError);
      expect(clone.message).toBe('New message');
      expect(clone.statusCode).toBe(500);
      expect(clone.errors).toEqual(['error1']);
      expect(clone.metadata).toEqual({ meta: 'data' });
    });
  });
});