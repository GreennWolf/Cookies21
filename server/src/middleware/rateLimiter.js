const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.rateLimiter = (type, options = {}) => {
  // Configuración por defecto
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutos por defecto
    max: 100, // límite por ventana
    message: 'Demasiadas peticiones, por favor intente más tarde',
    statusCode: 429,
    standardHeaders: true, // Devolver info de rate limit en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilitar los headers `X-RateLimit-*`
  };

  // Opciones específicas por tipo de endpoint
  const typeOptions = {
    api: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 1000, // 1000 peticiones por hora
      message: 'Límite de API excedido'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // 5 intentos por 15 minutos
      message: 'Demasiados intentos de autenticación'
    },
    webhook: {
      windowMs: 60 * 1000, // 1 minuto
      max: 10, // 10 peticiones por minuto
      message: 'Demasiadas llamadas al webhook'
    },
    scan: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 2, // 2 escaneos por 5 minutos
      message: 'Demasiadas solicitudes de escaneo'
    },
    export: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 10, // 10 exportaciones por hora
      message: 'Límite de exportación excedido'
    }
  };

  // Configuración final combinando opciones
  const finalOptions = {
    ...defaultOptions,
    ...(typeOptions[type] || {}),
    ...options,
    
    // Generador de claves personalizado
    keyGenerator: (req) => {
      // Priorizar API key sobre IP
      const key = req.headers['x-api-key'] || req.ip;
      return `${type}:${key}`;
    },

    // Manejador personalizado de límite excedido
    handler: (req, res, next) => {
      const error = new AppError(
        options.message || typeOptions[type]?.message || defaultOptions.message,
        429
      );

      // Loguear el intento fallido
      logger.warn('Rate limit exceeded:', {
        type,
        ip: req.ip,
        apiKey: req.headers['x-api-key'],
        path: req.path,
        method: req.method
      });

      next(error);
    },

    // Función para saltar el rate limit
    skip: (req) => {
      // Saltar para administradores
      if (req.user && req.user.role === 'admin') {
        return true;
      }

      // Saltar para IPs en whitelist si está configurado
      if (options.whitelist && options.whitelist.includes(req.ip)) {
        return true;
      }

      return false;
    },

    // Manejador de errores del store
    onError: (error, req) => {
      logger.error('Rate limit error:', {
        error: error.message,
        type,
        ip: req.ip,
        path: req.path
      });
    }
  };

  // Crear y retornar el middleware
  try {
    const limiter = rateLimit(finalOptions);

    // Wrapper para manejo de errores
    return (req, res, next) => {
      Promise.resolve(limiter(req, res, next)).catch(next);
    };
  } catch (error) {
    logger.error('Error creating rate limiter:', error);
    
    // Retornar un middleware que no aplica límites en caso de error
    return (req, res, next) => next();
  }
};

// Tipos de rate limit predefinidos
exports.RATE_LIMIT_TYPES = {
  API: 'api',
  AUTH: 'auth',
  WEBHOOK: 'webhook',
  SCAN: 'scan',
  EXPORT: 'export'
};

// Función auxiliar para crear un rate limiter con whitelist
exports.createRateLimiterWithWhitelist = (type, whitelist = []) => {
  return exports.rateLimiter(type, { whitelist });
};

// Middleware para rutas que requieren límites estrictos
exports.strictRateLimit = exports.rateLimiter('auth', {
  windowMs: 60 * 1000, // 1 minuto
  max: 3, // 3 intentos por minuto
  message: 'Demasiados intentos. Por favor, espere un momento.'
});

// Middleware para API pública
exports.publicApiRateLimit = exports.rateLimiter('api', {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 peticiones por 15 minutos
});