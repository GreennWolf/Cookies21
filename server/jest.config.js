// jest.config.js
module.exports = {
  // Entorno de pruebas global
  testEnvironment: 'node',

  // Archivo de setup global (se ejecuta para todos los tests)
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],

  // Alias para rutas del proyecto
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/src/tests/fixtures/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1'
  },

  // Transformación de archivos
  transform: {
    '^.+\\.m?[jt]sx?$': ['babel-jest', { configFile: './babel.config.js' }]
  },

  transformIgnorePatterns: [
    '/node_modules/(?!(puppeteer|puppeteer-core|@puppeteer|string-width|strip-ansi|ansi-regex|eastasianwidth|emoji-regex).*)'
  ],

  // Extensiones de archivo soportadas
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],

  // Directorios ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.yarn/'
  ],

  // Cobertura de código
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/server.js',
    '!src/app.js',
    '!src/tests/**',
    '!src/config/**',
    '!src/**/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Configuración de rendimiento
  maxWorkers: process.env.CI ? 1 : '50%',
  maxConcurrency: process.env.CI ? 1 : 5,
  workerIdleMemoryLimit: '512MB',

  // Caché
  cache: true,
  cacheDirectory: './node_modules/.cache/jest',

  // Variables globales
  globals: {
    NODE_ENV: 'test'
  },

  // Gestión de mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Output y reportes
  verbose: true,
  testTimeout: 30000,

  // Detección de problemas
  detectLeaks: true,
  detectOpenHandles: true,
  forceExit: true,

  // Manejo de errores
  bail: process.env.CI ? 1 : 0,

  // Reportes
  reporters: [
    'default',
    process.env.CI && [
      'jest-junit',
      {
        outputDirectory: './reports/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ].filter(Boolean),

  // Notificaciones
  notify: false,

  // Configuración específica para pruebas unitarias e integración
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
    }
  ],

  // Watchman config
  watchman: false
};
