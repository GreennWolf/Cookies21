// src/tests/setupAfterEnv.js
const mongoose = require('mongoose');
const { jest } = require('@jest/globals');
const { beforeAll, afterAll, afterEach } = require('@jest/globals');
// Configuración timeout global
jest.setTimeout(30000);

// Mock global de fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: {
      get: jest.fn().mockReturnValue('application/json'),
    }
  })
);

beforeEach(() => {
  // Limpiar todos los mocks antes de cada test
  jest.clearAllMocks();
});

// Helpers para creación de datos de prueba
global.createTestClient = async (data = {}) => {
  const defaultData = {
    name: 'Test Client',
    email: 'test@example.com',
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
  return { ...defaultData, ...data };
};

global.createTestDomain = async (clientId, data = {}) => {
  const defaultData = {
    clientId,
    domain: 'test.com',
    status: 'active',
    settings: {
      scanning: {
        enabled: true,
        interval: 24
      }
    }
  };
  return { ...defaultData, ...data };
};

global.createTestUser = async (data = {}) => {
  const defaultData = {
    name: 'Test User',
    email: 'user@test.com',
    password: 'Password123!',
    role: 'admin',
    status: 'active',
    accessControl: {
      allowedDomains: []
    }
  };
  return { ...defaultData, ...data };
};

// Headers helper para autenticación
global.getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`
});

// Manejo de errores no capturados durante los tests
process.on('unhandledRejection', (error) => {
  console.error('Test ERROR:', error);
});