// tests/unit/utils/catchAsync.test.js
jest.mock('../../../config/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}));
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { 
  catchAsync, 
  catchAsyncWithTimeout, 
  catchAsyncWithRetry,
  catchAsyncWithCircuitBreaker 
} = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

jest.mock('../../../utils/logger');

describe('catchAsync utilities', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    res = jest.fn();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('catchAsync', () => {
    test('debería manejar funciones asíncronas exitosas', async () => {
      const successFn = async () => 'success';
      const wrappedFn = catchAsync(successFn);

      await wrappedFn(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('debería capturar y convertir errores a AppError', async () => {
      const errorFn = async () => {
        throw new Error('Test error');
      };
      const wrappedFn = catchAsync(errorFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
          isOperational: true
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    test('debería preservar AppErrors existentes', async () => {
      const appErrorFn = async () => {
        throw new AppError('Custom error', 400);
      };
      const wrappedFn = catchAsync(appErrorFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Custom error'
        })
      );
    });
  });

  describe('catchAsyncWithTimeout', () => {
    test('debería resolver antes del timeout', async () => {
      const quickFn = async () => 'quick response';
      const wrappedFn = catchAsyncWithTimeout(quickFn, 1000);

      await wrappedFn(req, res, next);
      // Se espera que quickFn se resuelva sin llegar al timeout
      expect(next).not.toHaveBeenCalled();
    });

    test('debería lanzar error de timeout', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'slow response';
      };
      const wrappedFn = catchAsyncWithTimeout(slowFn, 100);

      await wrappedFn(req, res, next);
      // Se espera un poco más para que se dispare el timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          message: 'Request timeout'
        })
      );
    });

    test('debería incluir información de timeout en el error', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      };
      const wrappedFn = catchAsyncWithTimeout(slowFn, 100);
    
      await wrappedFn(req, res, next);
      // Esperamos para que se ejecute el timeout
      await new Promise(resolve => setTimeout(resolve, 150));
    
      // Verificamos que se llamó a next con un error con mensaje y statusCode esperados
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request timeout',
          statusCode: 408
        })
      );
    
      // Extraemos el error pasado a next para inspeccionar su metadata
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.metadata).toEqual(
        expect.objectContaining({
          timeout: 100
        })
      );
    });
  });

  describe('catchAsyncWithRetry', () => {
    test('debería resolver en el primer intento', async () => {
      const successFn = async () => 'success';
      const wrappedFn = catchAsyncWithRetry(successFn);

      await wrappedFn(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('debería reintentar en caso de error y eventualmente tener éxito', async () => {
      let attempts = 0;
      const eventualSuccessFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new AppError('Temporary error', 503);
        }
        return 'success';
      };

      const wrappedFn = catchAsyncWithRetry(eventualSuccessFn, {
        maxRetries: 3,
        delay: 100
      });

      await wrappedFn(req, res, next);
      // Esperamos lo suficiente para que se completen los reintentos
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(attempts).toBe(3);
      expect(next).not.toHaveBeenCalled();
    });

    test('debería fallar después de máximos reintentos', async () => {
      jest.useFakeTimers();
    
      // Función que siempre falla con un AppError de status 503.
      const failingFn = async () => {
        throw new AppError('Service unavailable', 503);
      };
    
      const wrappedFn = catchAsyncWithRetry(failingFn, {
        maxRetries: 2,
        delay: 100
      });
    
      // Llamamos a la función envuelta
      wrappedFn(req, res, next);
    
      // Avanzamos el tiempo para disparar el primer delay (100 * 2^0 = 100 ms)
      await jest.advanceTimersByTimeAsync(100);
    
      // Avanzamos el tiempo para disparar el segundo delay (100 * 2^1 = 200 ms)
      await jest.advanceTimersByTimeAsync(200);
    
      // Esperamos a que se resuelvan las microtareas pendientes
      await Promise.resolve();
    
      // Verificamos que next haya sido llamado con un error que incluya retries: 2 y statusCode: 503
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          metadata: expect.objectContaining({
            retries: 2
          })
        })
      );
    
      jest.useRealTimers();
    });
  
    test('no debería reintentar errores no retryables', async () => {
      // Función que lanza un error no retryable (status 400)
      const nonRetryableError = async () => {
        throw new AppError('Bad request', 400);
      };
    
      const wrappedFn = catchAsyncWithRetry(nonRetryableError, {
        maxRetries: 3,
        delay: 100
      });
    
      wrappedFn(req, res, next);
    
      // Esperamos para que se procese el error sin reintentos
      await new Promise(resolve => setTimeout(resolve, 150));
    
      // Verificamos que next haya sido llamado con un error que incluya retries: 0 y statusCode: 400
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          metadata: expect.objectContaining({
            retries: 0
          })
        })
      );
    });
    
  });

  describe('catchAsyncWithCircuitBreaker', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('debería permitir requests cuando el circuito está cerrado', async () => {
      const successFn = async () => 'success';
      const wrappedFn = catchAsyncWithCircuitBreaker(successFn);

      await wrappedFn(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('debería abrir el circuito después de múltiples fallos', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      const wrappedFn = catchAsyncWithCircuitBreaker(failingFn, {
        threshold: 2,
        timeout: 1000
      });

      // Primer fallo
      await wrappedFn(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Segundo fallo - debería abrir el circuito
      await wrappedFn(req, res, next);
      
      // Tercer intento - debería rechazar inmediatamente
      next.mockClear();
      await wrappedFn(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: 'Service temporarily unavailable'
        })
      );
    });

    test('debería resetear el circuito después del timeout', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      const wrappedFn = catchAsyncWithCircuitBreaker(failingFn, {
        threshold: 2,
        timeout: 1000
      });

      // Forzar apertura del circuito
      await wrappedFn(req, res, next);
      await wrappedFn(req, res, next);

      // Avanzar el tiempo más allá del timeout
      jest.advanceTimersByTime(1500);

      // El circuito debería estar cerrado nuevamente
      next.mockClear();
      await wrappedFn(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });
});
