const Redis = require('ioredis');
const logger = require('../utils/logger');

const createRedisClient = () => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: true
  };

  const cache = new Redis(config);

  cache.on('connect', () => {
    logger.info('Redis conectado exitosamente');
  });

  cache.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  cache.on('close', () => {
    logger.warn('Conexión a Redis cerrada');
  });

  cache.on('reconnecting', () => {
    logger.info('Reconectando a Redis...');
  });

  return cache;
};

// Exportar cachee y funciones helper
module.exports = {
  cache: createRedisClient(),
  createRedisClient
};