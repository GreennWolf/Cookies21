// Configuración mejorada de variables de entorno
const path = require('path');
const fs = require('fs');

// Intentar cargar diferentes archivos .env según el entorno
const envFiles = [
  `.env.${process.env.NODE_ENV || 'development'}.local`,
  `.env.${process.env.NODE_ENV || 'development'}`,
  '.env.local',
  '.env'
];

let envLoaded = false;
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ Variables de entorno cargadas desde: ${envFile}`);
    console.log(`📁 Ruta completa: ${envPath}`);
    envLoaded = true;
    break;
  } else {
    console.log(`❌ No encontrado: ${envPath}`);
  }
}

if (!envLoaded) {
  console.log('⚠️  No se encontró archivo .env, usando variables del sistema');
  require('dotenv').config(); // Fallback
}

// Debug: Mostrar estado de variables críticas
console.log('🔍 DEBUG - Variables de entorno después de carga:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
console.log(`PORT: ${process.env.PORT || 'no definido'}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '[CONFIGURADO]' : 'no definido'}`);
if (process.env.MONGODB_URI) {
  // Mostrar URI pero ocultar la contraseña
  const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@');
  console.log(`📄 URI (masked): ${maskedUri}`);
}
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '[CONFIGURADO]' : 'no definido'}`);

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const cookieAnalysisWorker = require('./jobs/cookieAnalysisWorker');
const { setupScheduledJobs } = require('./jobs/scheduledTasks');

// Establecer valores por defecto para desarrollo si no están definidas
if (!process.env.PORT) process.env.PORT = '3000';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// Verificar variables de entorno críticas
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('📋 Available options:');
  console.error('1. Create .env file in server directory');
  console.error('2. Set system environment variables');
  console.error('3. Use PM2 ecosystem file with env variables');
  
  // En desarrollo, usar valores por defecto
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Using development defaults...');
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/cookies21';
      console.log('📝 MONGODB_URI set to default development value');
    }
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'desarrollo-jwt-secret-no-usar-en-produccion';
      console.log('📝 JWT_SECRET set to default development value');
    }
  } else {
    console.error('❌ Cannot start in production without proper environment variables');
    process.exit(1);
  }
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

    // Iniciar el worker de análisis de cookies
    logger.info('Starting cookie analysis worker...');
    cookieAnalysisWorker.start();
    logger.info('Cookie analysis worker started successfully');

    // Iniciar tareas programadas
    logger.info('Starting scheduled jobs...');
    setupScheduledJobs();
    logger.info('Scheduled jobs started successfully');

    // Iniciar el programador de escaneos automáticos
    logger.info('Starting automatic scan scheduler...');
    const automaticScanScheduler = require('./services/automaticScanScheduler.service');
    await automaticScanScheduler.initialize();
    logger.info('Automatic scan scheduler started successfully');

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
  cookieAnalysisWorker.stop();
  
  // Detener el programador de escaneos automáticos
  const automaticScanScheduler = require('./services/automaticScanScheduler.service');
  automaticScanScheduler.shutdown().catch(error => {
    logger.error('Error shutting down automatic scan scheduler:', error);
  });
  
  if (server) {
    server.close(() => {
      logger.info('💥 Process terminated!');
    });
  }
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
  cookieAnalysisWorker.stop();
  
  // Detener el programador de escaneos automáticos
  const automaticScanScheduler = require('./services/automaticScanScheduler.service');
  automaticScanScheduler.shutdown().catch(error => {
    logger.error('Error shutting down automatic scan scheduler:', error);
  });
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