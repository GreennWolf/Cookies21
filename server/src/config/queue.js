const Bull = require('bull');
const logger = require('../utils/logger');

const isTest = process.env.NODE_ENV === 'test';

// Opciones por defecto para las colas
// MODIFICACIÓN: Removidas las opciones problemáticas maxRetriesPerRequest y enableReadyCheck
const defaultOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    // Se eliminaron estas opciones que causan el problema:
    // maxRetriesPerRequest: null,
    // enableReadyCheck: true
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
};

// Clase mock para tests
class MockQueue {
  constructor(name) {
    this.name = name;
  }
  add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
  process = jest.fn();
  on = jest.fn();
  close = jest.fn().mockResolvedValue(undefined);
  getActive = jest.fn().mockResolvedValue([]);
  getCompleted = jest.fn().mockResolvedValue([]);
  getFailed = jest.fn().mockResolvedValue([]);
  getDelayed = jest.fn().mockResolvedValue([]);
  getWaiting = jest.fn().mockResolvedValue([]);
  empty = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn().mockResolvedValue(undefined);
  resume = jest.fn().mockResolvedValue(undefined);
}

// Factory function para crear colas
const createQueue = (name, options = {}) => {
  if (isTest) {
    return new MockQueue(name);
  }
  return new Bull(name, options);
};

// Definición de colas
const queues = {
  scanQueue: createQueue('cookie-scan', defaultOptions),
  notificationQueue: createQueue('notifications', {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 5,
      timeout: 5000
    }
  }),
  analyticsQueue: createQueue('analytics', {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      removeOnComplete: 100,
      attempts: 2
    }
  }),
  emailQueue: createQueue('email', {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 3,
      timeout: 30000
    }
  }),
  exportQueue: createQueue('export', {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 1,
      timeout: 300000
    }
  })
};

// Configurar manejadores de eventos para todas las colas
if (!isTest) {
  Object.entries(queues).forEach(([name, queue]) => {
    queue.on('error', error => {
      logger.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} in ${name} queue failed:`, error);
    });

    if (process.env.NODE_ENV === 'development') {
      queue.on('completed', job => {
        logger.debug(`Job ${job.id} in ${name} queue completed`);
      });
    }
  });
}

// Funciones auxiliares para manejo de colas
const queueHelpers = {
  async addJob(queueName, data, options = {}) {
    const queue = queues[queueName + 'Queue'];
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    return await queue.add(data, options);
  },

  async getQueueStatus(queueName) {
    const queue = queues[queueName + 'Queue'];
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const [active, completed, failed, delayed, waiting] = await Promise.all([
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
      queue.getWaiting()
    ]);

    return {
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      waiting: waiting.length
    };
  },

  async clearQueue(queueName) {
    const queue = queues[queueName + 'Queue'];
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    await queue.empty();
    if (!isTest) logger.info(`Queue ${queueName} cleared`);
  },

  async pauseQueue(queueName) {
    const queue = queues[queueName + 'Queue'];
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    await queue.pause();
    if (!isTest) logger.info(`Queue ${queueName} paused`);
  },

  async resumeQueue(queueName) {
    const queue = queues[queueName + 'Queue'];
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    await queue.resume();
    if (!isTest) logger.info(`Queue ${queueName} resumed`);
  }
};

module.exports = {
  queues,
  ...queueHelpers
};