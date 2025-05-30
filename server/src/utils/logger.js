// src/utils/logger.js
const winston = require('winston');
const { format } = winston;
const path = require('path');

// Configuración básica de colores
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
});

// Formato simple
const simpleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// Creamos una versión MUY simple del logger para evitar problemas
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // IMPORTANTE: SOLO usamos Console transport por ahora
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        simpleFormat
      )
    })
  ],
  // Desactivamos completamente el manejo de excepciones
  exitOnError: false,
  handleExceptions: false,
  handleRejections: false
});

// Si estamos en producción y realmente queremos logs en archivos
// los agregamos de manera simple y con opciones conservadoras
if (process.env.NODE_ENV === 'production') {
  try {
    // Primero asegurar que existe el directorio
    const logDir = path.join(process.cwd(), 'logs');
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Luego agregar transporte de archivo
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: format.combine(
        format.uncolorize(),
        simpleFormat
      ),
      // Opciones conservadoras para evitar problemas
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      // IMPORTANTE: no usar rotación diaria que puede causar problemas
      handleExceptions: false
    }));
  } catch (error) {
    console.error('No se pudieron configurar los archivos de log:', error);
    // Continuamos sin logs en archivos
  }
}

// Funciones auxiliares básicas
logger.logRequest = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
};

logger.logError = (err) => {
  logger.error(`Error: ${err.message}`);
  if (err.stack) {
    logger.error(`Stack: ${err.stack}`);
  }
};

// Stream para Morgan
logger.stream = {
  write: (message) => {
    if (message && message.trim()) {
      logger.info(message.trim());
    }
  }
};

// Método de cierre seguro
logger.shutdown = () => {
  console.log('Cerrando logger...');
  // En esta versión simplificada no hay mucho que cerrar
  // pero lo mantenemos por compatibilidad
  return Promise.resolve();
};

module.exports = logger;