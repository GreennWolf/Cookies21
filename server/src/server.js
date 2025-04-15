require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Verificar variables de entorno críticas
const requiredEnvVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('Please check your .env file or environment configuration');
  // Continuar de todos modos con valores por defecto
}

// Creación de directorios necesarios
const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    logger.warn(`Could not create directory ${dirPath}: ${error.message}`);
  }
};

const createRequiredDirectories = () => {
  const publicDir = path.join(process.cwd(), 'public');
  const templatesDir = path.join(publicDir, 'templates');
  const imagesDir = path.join(templatesDir, 'images');
  const logsDir = path.join(process.cwd(), 'logs');
  const tempDir = path.join(process.cwd(), 'temp');
  
  ensureDirectoryExists(publicDir);
  ensureDirectoryExists(templatesDir);
  ensureDirectoryExists(imagesDir);
  ensureDirectoryExists(logsDir);
  ensureDirectoryExists(tempDir);
};

// Manejador de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', error);
  process.exit(1);
});

let server;

const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Crear directorios necesarios
    createRequiredDirectories();
    
    // Conectar a la base de datos
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Database connection established successfully');

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';

    // Crear servidor HTTP
    server = app.listen(port, host, () => {
      logger.info(`
        ################################################
        🛡️  Server listening on ${host}:${port} 🛡️
        🌐  Environment: ${process.env.NODE_ENV || 'development'} 🌐
        📝  API Docs: http://${host}:${port}/api-docs 📝
        ✅  Health: http://${host}:${port}/health ✅
        ################################################
      `);
    });

    // Configurar timeouts del servidor
    server.timeout = 120000; // 2 minutos
    server.keepAliveTimeout = 65000; // Poco más de 60 segundos (valor recomendado)
    server.headersTimeout = 66000; // Un poco más que keepAliveTimeout

    // Manejador de errores del servidor
    server.on('error', (error) => {
      logger.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`);
        process.exit(1);
      }
    });

    return server;

  } catch (error) {
    logger.error('Error starting server:', error);
    throw error;
  }
};

// Manejadores de proceso
process.on('unhandledRejection', (error) => {
  logger.error('UNHANDLED REJECTION! 💥', error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('💥 Process terminated!');
    });
  }
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('💥 Process terminated!');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Iniciar servidor con retrointento
(async function startWithRetry(retries = 3, delay = 5000) {
  try {
    await startServer();
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Server start failed. Retrying in ${delay/1000}s... (${retries} attempts remaining)`);
      setTimeout(() => startWithRetry(retries - 1, delay), delay);
    } else {
      logger.error('Failed to start server after multiple attempts:', error);
      process.exit(1);
    }
  }
})();

module.exports = server;