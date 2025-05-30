const logger = require('../utils/logger');

let Bull;
let redisAvailable = false;

// Intentar cargar Bull solo si está instalado
try {
  Bull = require('bull');
  // Verificar si Redis está disponible
  const testQueue = new Bull('test-queue', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: () => null // No reintentar si falla
    }
  });
  
  // Verificar conexión
  testQueue.client.ping((err) => {
    if (err) {
      logger.warn('Redis not available for Bull queues:', err.message);
      redisAvailable = false;
    } else {
      logger.info('Redis connected successfully for Bull queues');
      redisAvailable = true;
    }
  });
  
  // Limpiar queue de test
  setTimeout(() => {
    testQueue.close();
  }, 1000);
  
} catch (err) {
  logger.warn('Bull not available, using direct execution for analysis jobs');
  Bull = null;
}

module.exports = {
  Bull,
  redisAvailable,
  isQueueAvailable: () => Bull && redisAvailable
};