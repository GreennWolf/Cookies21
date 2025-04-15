// src/utils/logger.js
const winston = require('winston');
const { format } = winston;
const path = require('path');

// Configuración de niveles personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5
};

// Colores para diferentes niveles de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'white'
};

// Añadir colores a Winston
winston.addColors(colors);

// Crear formato personalizado
const customFormat = format.combine(
  // Añadir timestamp
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  // Añadir información de errores si existe
  format.errors({ stack: true }),
  // Añadir el nivel del log
  format.padLevels(),
  // Formato condicional basado en el entorno
  format.printf(info => {
    // Formato base del mensaje
    let message = `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;

    // Añadir stacktrace si existe
    if (info.stack) {
      message += `\n${info.stack}`;
    }

    // Añadir metadata adicional si existe
    if (info.metadata && Object.keys(info.metadata).length) {
      message += `\nMetadata: ${JSON.stringify(info.metadata, null, 2)}`;
    }

    return message;
  })
);

// Configurar transports
const transports = [
  // Logs de errores
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: format.combine(
      format.uncolorize(),
      customFormat
    )
  }),
  // Todos los logs
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: format.combine(
      format.uncolorize(),
      customFormat
    )
  })
];

// Añadir transport de consola en desarrollo (o forzado)
if (process.env.NODE_ENV !== 'production' || true) {  // Forzar logueo en consola
  transports.push(
    new winston.transports.Console({
      level: 'debug',  // Mostrar todos los niveles
      format: format.combine(
        format.colorize(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  // No salir en errores no manejados
  exitOnError: false,
  // Manejo de rechazos no manejados
  handleExceptions: true,
  handleRejections: true,
  // Formato para excepciones
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'exceptions.log'),
      format: format.combine(
        format.uncolorize(),
        customFormat
      )
    })
  ]
});

// Métodos auxiliares para logging común
logger.logRequest = (req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    metadata: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
  next();
};

logger.logError = (err, metadata = {}) => {
  logger.error(err.message, {
    metadata: {
      ...metadata,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode
    }
  });
};

logger.logAPIError = (err, req) => {
  logger.error(`API Error: ${err.message}`, {
    metadata: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      stack: err.stack,
      statusCode: err.statusCode
    }
  });
};

logger.logPerformance = (label, duration) => {
  logger.verbose(`Performance - ${label}: ${duration}ms`);
};

logger.logDatabaseQuery = (query, duration) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Database Query', {
      metadata: {
        query,
        duration: `${duration}ms`
      }
    });
  }
};

logger.startTimer = (label) => {
  const start = process.hrtime();
  return () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    logger.logPerformance(label, duration.toFixed(3));
    return duration;
  };
};

// Stream para Morgan (HTTP logging)
// Ahora se verifica que el mensaje tenga contenido (después de aplicar trim)
logger.stream = {
  write: (message) => {
    if (typeof message === 'string' && message.trim()) {
      logger.http(message.trim());
    }
  }
};

module.exports = logger;
