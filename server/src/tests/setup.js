// src/tests/setup.js

const { beforeAll, afterAll, afterEach } = require('@jest/globals');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const { TextEncoder, TextDecoder } = require('util');
const path = require('path');

// Configuraciones globales para TextEncoder y TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Importaciones de la app y modelos
const app = require('./testApp');
const Client = require('../models/Client');
const Domain = require('../models/Domain');
const UserAccount = require('../models/UserAccount');

global.app = app;

let mongoServer;

// Variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// --- Mocks de módulos externos (Bull, Redis, Winston, Puppeteer) ---
// Estos mocks se configuran para que los tests no dependan de conexiones reales.

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getDelayed: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    empty: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    defaultJobOptions: {},
  }));
});

jest.mock('../config/redis', () => ({
  client: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    on: jest.fn()
  },
  createRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    on: jest.fn()
  })
}));

jest.mock('winston', () => ({
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    uncolorize: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  },
  addColors: jest.fn(),
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn()
  })
}));

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockImplementation(() => Promise.resolve({
    newPage: jest.fn().mockImplementation(() => Promise.resolve({
      goto: jest.fn().mockResolvedValue(null),
      setViewport: jest.fn().mockResolvedValue(null),
      $: jest.fn().mockResolvedValue(null),
      $$: jest.fn().mockResolvedValue([]),
      evaluate: jest.fn().mockResolvedValue({}),
      cookies: jest.fn().mockResolvedValue([]), // Para que page.cookies() exista
      close: jest.fn().mockResolvedValue(null),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
      setUserAgent: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn()
    })),
    close: jest.fn().mockResolvedValue(null)
  }))
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  stream: { write: jest.fn() }
}));

// También se pueden mockear otros servicios si es necesario
jest.mock('../services/email.service');
jest.mock('../services/analytics.service');
jest.mock('../services/scanner.service');
jest.mock('../services/provider.service');
jest.mock('../services/notification.service');

// --- Configuración de MongoDB Memory Server ---
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '6.0.12',
        downloadDir: path.join(__dirname, '../node_modules/.cache/mongodb-memory-server'),
        arch: process.arch,
        platform: process.platform
      },
      instance: {
        dbName: 'testdb',
        port: 27017
      }
    });

    const mongoUri = await mongoServer.getUri();
    const mongooseOpts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, mongooseOpts);
  } catch (error) {
    console.error('MongoDB Memory Server setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop({ doCleanup: true });
    }
    // Si se usan colas u otros recursos, limpiarlos aquí
    const { queues } = require('../config/queue');
    if (queues) {
      await Promise.all(
        Object.values(queues).map(queue => 
          queue.close ? queue.close() : Promise.resolve()
        )
      );
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});

afterEach(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      await Promise.all(
        Object.values(collections).map(collection => collection.deleteMany({}))
      );
    }
  } catch (error) {
    console.error('Collection cleanup failed:', error);
  }
});

// --- Helpers Globales ---

global.generateAuthToken = (userId, clientId, role = 'admin') => {
  return jwt.sign(
    { userId, clientId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

global.createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Función para generar un email único y evitar duplicados
function generateUniqueEmail() {
  return `test+${Date.now()}@example.com`;
}

global.createTestClient = async (data = {}) => {
  const uniqueEmail = generateUniqueEmail();
  const defaultData = {
    name: 'Test Client',
    email: uniqueEmail,
    password: 'Password123!',
    company: {
      name: 'Test Company',
      website: 'https://test.com'
    },
    status: 'active',
    subscription: {
      plan: 'basic',
      allowedDomains: 5
    }
  };

  try {
    return await Client.create({ ...defaultData, ...data });
  } catch (error) {
    console.error('Error creating test client:', error);
    throw error;
  }
};

global.createAuthenticatedClient = async () => {
  try {
    const client = await global.createTestClient();
    const token = global.generateAuthToken(client._id, client._id);
    return { client, token };
  } catch (error) {
    console.error('Error creating authenticated client:', error);
    throw error;
  }
};

global.createTestDomain = async (clientId, data = {}) => {
  const defaultData = {
    clientId,
    domain: 'test.com',
    status: 'active',
    settings: {
      scanning: {
        enabled: true,
        interval: 24,
        includeSubdomains: true,
        maxUrls: 100
      }
    }
  };

  try {
    return await Domain.create({ ...defaultData, ...data });
  } catch (error) {
    console.error('Error creating test domain:', error);
    throw error;
  }
};

global.createAuthenticatedUser = async (clientId, role = 'admin') => {
  try {
    const userData = {
      name: `Test ${role}`,
      email: `${role}+${Date.now()}@test.com`,
      password: 'Password123!',
      role: role,
      clientId: clientId,
      status: 'active'
    };

    const user = await UserAccount.create(userData);
    const token = global.generateAuthToken(user._id, clientId, role);
    return { user, token };
  } catch (error) {
    console.error('Error creating authenticated user:', error);
    throw error;
  }
};

jest.setTimeout(30000);

console.log('*** Setup global ejecutado ***');
