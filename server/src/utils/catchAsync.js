// /utils/catchAsync.js

const AppError = require('./appError');
const logger = require('./logger');

/**
 * Envuelve una función async de un controlador o middleware,
 * atrapando cualquier error y pasándolo a next(error).
 * Elimina la necesidad de try/catch repetitivos.
 * @param {Function} fn - La función asíncrona a envolver (req, res, next).
 * @returns {Function} - Función que maneja errores y llama next(err).
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    const handleError = (error) => {
      // Si por alguna razón no tenemos un next válido (algo muy inusual):
      if (typeof next !== 'function') {
        logger.error('Next handler is not a function:', {
          error: error.message,
          stack: error.stack,
          path: req?.path,
          method: req?.method
        });

        // Intentamos responder con res si existe
        if (res && typeof res.status === 'function') {
          const statusCode = error.statusCode || 500;
          return res.status(statusCode).json({
            status: 'error',
            message: error.message || 'Internal server error'
          });
        }

        // Si no hay forma de responder, volvemos a arrojar.
        throw error;
      }

      // Registrar el error.
      logger.error('Caught async error:', {
        error: error.message,
        stack: error.stack,
        path: req?.path,
        method: req?.method
      });

      console.log(error)

      // Convertir a AppError si es necesario
      const appError = (error instanceof AppError)
        ? error
        : AppError.fromError(error);

      // Añadir contexto extra
      appError.addContext({
        path: req?.path,
        method: req?.method,
        ip: req?.ip,
        timestamp: new Date()
      });

      // Pasar el error al siguiente middleware de errores
      next(appError);
    };

    // Llamamos a fn(req, res, next) y capturamos errores
    return Promise.resolve(fn(req, res, next)).catch(handleError);
  };
};

/**
 * Igual que catchAsync, pero con un timeout. Si la función tarda demasiado,
 * lanza un error 408 (Request timeout).
 */
const catchAsyncWithTimeout = (fn, timeout = 30000) => {
  return (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError('Request timeout', 408));
      }, timeout);
    });

    return Promise.race([fn(req, res, next), timeoutPromise]).catch((error) => {
      logger.error('Caught async error with timeout:', {
        error: error.message,
        stack: error.stack,
        path: req?.path,
        method: req?.method,
        timeout
      });

      const appError = (error instanceof AppError)
        ? error
        : AppError.fromError(error);

      appError.addContext({
        path: req?.path,
        method: req?.method,
        ip: req?.ip,
        timeout,
        timestamp: new Date()
      });

      next(appError);
    });
  };
};

/**
 * Igual que catchAsync, pero con reintentos automáticos en caso de errores
 * con ciertos statusCode (408,429,502,503,504, etc.).
 */
const catchAsyncWithRetry = (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000, // ms
    retryableErrors = [408, 429, 502, 503, 504]
  } = options;

  return (req, res, next) => {
    const attempt = async (retryCount = 0) => {
      try {
        return await fn(req, res, next);
      } catch (error) {
        logger.warn(`Attempt ${retryCount + 1} failed:`, {
          error: error.message,
          path: req?.path,
          method: req?.method
        });

        const appError = (error instanceof AppError)
          ? error
          : AppError.fromError(error);

        // Si el error es "reintenteable" y no hemos agotado maxRetries
        if (
          retryCount < maxRetries &&
          retryableErrors.includes(appError.statusCode)
        ) {
          // Retraso exponencial (opcional)
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, retryCount)));
          return attempt(retryCount + 1);
        }

        appError.addContext({
          path: req?.path,
          method: req?.method,
          retries: retryCount,
          timestamp: new Date()
        });

        throw appError;
      }
    };

    attempt()
      .then(() => {
        // fn no retornó error, nada que hacer
      })
      .catch((error) => next(error));
  };
};

/**
 * catchAsync con "circuit breaker":
 * Si fallan consecutivamente X requests (threshold),
 * se "abre" el circuito y se rechazan requests con 503
 * hasta que pase un tiempo (timeout).
 */
const catchAsyncWithCircuitBreaker = (fn, options = {}) => {
  const {
    threshold = 5,
    timeout = 60000,
    monitorInterval = 5000
  } = options;

  let failures = 0;
  let lastFailure = null;
  let circuitOpen = false;

  // Monitor para resetear el circuito
  setInterval(() => {
    if (circuitOpen && Date.now() - lastFailure > timeout) {
      circuitOpen = false;
      failures = 0;
      logger.info('Circuit breaker reset');
    }
  }, monitorInterval);

  return (req, res, next) => {
    if (circuitOpen) {
      return next(new AppError('Service temporarily unavailable', 503));
    }

    Promise.resolve(fn(req, res, next))
      .catch((error) => {
        failures++;
        lastFailure = Date.now();

        if (failures >= threshold) {
          circuitOpen = true;
          logger.warn('Circuit breaker opened', {
            failures,
            timeout,
            path: req?.path
          });
        }

        const appError = (error instanceof AppError)
          ? error
          : AppError.fromError(error);

        appError.addContext({
          path: req?.path,
          method: req?.method,
          circuitBreakerFailures: failures,
          timestamp: new Date()
        });

        next(appError);
      });
  };
};

module.exports = {
  catchAsync,
  catchAsyncWithTimeout,
  catchAsyncWithRetry,
  catchAsyncWithCircuitBreaker
};
