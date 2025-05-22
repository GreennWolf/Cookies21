const morgan = require('morgan');
const logger = require('../utils/logger');

// Formato personalizado para logs de desarrollo
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Formato personalizado para logs de producción
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Función para saltar logs de rutas específicas (como health checks)
const skipRoutes = ['/health', '/favicon.ico'];
const skip = (req, res) => {
  return skipRoutes.includes(req.path);
};

// Stream personalizado para usar nuestro logger
const stream = {
  write: (message) => {
    // Remover el salto de línea que Morgan añade al final
    const log = message.trim();
    
    // Usar diferentes niveles de log según el status code
    const statusCode = parseInt(message.split(' ')[1]);
    if (statusCode >= 500) {
      logger.error(log);
    } else if (statusCode >= 400) {
      logger.warn(log);
    } else {
      logger.http(log);
    }
  }
};

// Configuración de Morgan según el entorno
const morganConfig = {
  development: {
    format: devFormat,
    options: {
      skip,
      stream
    }
  },
  production: {
    format: prodFormat,
    options: {
      skip,
      stream
    }
  },
  test: {
    format: devFormat,
    options: {
      skip: () => true, // No log en tests
      stream
    }
  }
};

// Exportar configuración según el entorno
module.exports = morgan(
  morganConfig[process.env.NODE_ENV || 'development'].format,
  morganConfig[process.env.NODE_ENV || 'development'].options
);