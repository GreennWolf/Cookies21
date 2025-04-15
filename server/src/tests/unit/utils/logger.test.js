// src/tests/unit/utils/logger.test.js

// Colocar los mocks de Winston al tope para que se apliquen antes de los requires
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  };

  return {
    format: {
      combine: jest.fn((...formats) => ({ type: 'combine', formats })),
      timestamp: jest.fn((config) => ({ type: 'timestamp', config })),
      errors: jest.fn((config) => ({ type: 'errors', config })),
      printf: jest.fn((fn) => ({ type: 'printf', transform: fn })),
      colorize: jest.fn(),
      uncolorize: jest.fn(),
      padLevels: jest.fn(() => ({ type: 'padLevels' }))
    },
    createLogger: jest.fn((config = {}) => ({
      ...mockLogger,
      config, // guardar la configuración para poder inspeccionarla en el test
    })),
    transports: {
      File: jest.fn().mockImplementation((config) => config),
      Console: jest.fn().mockImplementation((config) => config)
    },
    addColors: jest.fn()
  };
});

jest.mock('mongoose', () => ({
  connection: { collections: {} }
}));

const { describe, test, expect, beforeEach } = require('@jest/globals');
const winston = require('winston');

// Nota: No usamos clearAllMocks en la suite de configuración inicial,
// ya que queremos revisar las llamadas que se hicieron al cargar el módulo.
describe('Logger - configuración inicial', () => {
  let logger, loggerConfig;

  beforeEach(() => {
    // Reiniciamos módulos para forzar que se ejecute la carga de logger
    jest.resetModules();
    // Volvemos a requerir logger (lo que ejecuta el código de src/utils/logger.js)
    logger = require('../../../utils/logger');
    // La primera llamada a winston.createLogger es la que hizo el módulo
    loggerConfig = winston.createLogger.mock.calls[0][0];
  });

  test('debería crear logger con niveles personalizados', () => {
    expect(winston.createLogger).toHaveBeenCalled();
    expect(loggerConfig).toEqual(
      expect.objectContaining({
        level: expect.any(String),
        levels: expect.any(Object),
        handleExceptions: true,
        handleRejections: true,
        exitOnError: false,
        transports: expect.any(Array)
      })
    );
    // Verificamos que el logger exportado tenga el método http
    expect(logger).toHaveProperty('http');
  });

  test('debería configurar transports correctamente', () => {
    // Se espera que se hayan llamado dos veces para File (error.log y combined.log)
    expect(winston.transports.File).toHaveBeenCalledTimes(3);
    // Verificar transport para error.log
    expect(winston.transports.File).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining('error.log'),
        level: 'error',
        format: expect.any(Object)
      })
    );
    // Verificar transport para combined.log
    expect(winston.transports.File).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining('combined.log'),
        format: expect.any(Object)
      })
    );
  });

  test('debería configurar el formato personalizado correctamente', () => {
    // Verificar que se haya llamado a combine, timestamp, errors, padLevels y printf
    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalledWith({
      format: 'YYYY-MM-DD HH:mm:ss'
    });
    expect(winston.format.errors).toHaveBeenCalledWith({
      stack: true
    });
    expect(winston.format.padLevels).toHaveBeenCalled();
    expect(winston.format.printf).toHaveBeenCalled();
  });
});

describe('Logger - métodos de logging y funcionalidades', () => {
  // Ahora podemos limpiar los mocks para los demás tests (los cuales no dependen de la carga inicial)
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const logger = require('../../../utils/logger');

  describe('métodos de logging', () => {
    test('debería logear errores con stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.fn';
      logger.logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          metadata: expect.objectContaining({
            stack: expect.stringContaining('at Test.fn')
          })
        })
      );
    });

    test('debería logear requests HTTP', () => {
      const req = {
        method: 'GET',
        originalUrl: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {};
      const next = jest.fn();

      logger.logRequest(req, res, next);

      expect(logger.http).toHaveBeenCalledWith(
        'GET /test',
        expect.objectContaining({
          metadata: expect.objectContaining({
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            userAgent: 'test-agent'
          })
        })
      );
      expect(next).toHaveBeenCalled();
    });

    test('debería logear errores de API', () => {
      const error = new Error('API Error');
      error.stack = 'Error: API Error\n    at Test.fn';
      const req = {
        method: 'POST',
        originalUrl: '/api/test',
        body: { test: true },
        params: { id: '123' },
        query: { filter: 'active' }
      };

      logger.logAPIError(error, req);

      expect(logger.error).toHaveBeenCalledWith(
        'API Error: API Error',
        expect.objectContaining({
          metadata: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
            body: { test: true },
            params: { id: '123' },
            query: { filter: 'active' },
            stack: expect.stringContaining('at Test.fn')
          })
        })
      );
    });

    test('debería logear métricas de rendimiento', () => {
      logger.logPerformance('database-query', 150.5);

      expect(logger.verbose).toHaveBeenCalledWith(
        'Performance - database-query: 150.5ms'
      );
    });
  });

  describe('timer functionality', () => {
    test('debería crear y usar timers correctamente', () => {
      jest.useFakeTimers();
      const endTimer = logger.startTimer('operation');

      jest.advanceTimersByTime(100);
      const duration = endTimer();

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringMatching(/^Performance - operation: \d+(\.\d+)?ms$/)
      );
      expect(duration).toBeGreaterThanOrEqual(0);
      jest.useRealTimers();
    });

    test('debería calcular la duración correctamente', () => {
      const mockHrtime = jest.spyOn(process, 'hrtime');

      mockHrtime
        .mockReturnValueOnce([0, 0])
        .mockReturnValueOnce([1, 500000000]);

      const endTimer = logger.startTimer('precision-test');
      const duration = endTimer();

      expect(duration).toBeCloseTo(1500, 0);

      mockHrtime.mockRestore();
    });
  });

  describe('database logging', () => {
    test('debería logear queries en desarrollo', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.logDatabaseQuery('SELECT * FROM users', 100);

      expect(logger.debug).toHaveBeenCalledWith(
        'Database Query',
        expect.objectContaining({
          metadata: expect.objectContaining({
            query: 'SELECT * FROM users',
            duration: '100ms'
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('no debería logear queries en producción', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.logDatabaseQuery('SELECT * FROM users', 100);

      expect(logger.debug).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('stream para Morgan', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('debería procesar logs de Morgan correctamente eliminando espacios', () => {
      const testCases = [
        { input: 'GET /test 200 100ms\n', expected: 'GET /test 200 100ms' },
        { input: '  GET /api/users 404 50ms  \n', expected: 'GET /api/users 404 50ms' },
        { input: 'POST /login 200 300ms', expected: 'POST /login 200 300ms' }
      ];

      testCases.forEach(({ input, expected }) => {
        logger.stream.write(input);
        expect(logger.http).toHaveBeenCalledWith(expected);
      });

      expect(logger.http).toHaveBeenCalledTimes(testCases.length);
    });

    test('debería manejar mensajes vacíos o inválidos', () => {
      const edgeCases = ['', ' \n', null, undefined];

      edgeCases.forEach(message => {
        logger.stream.write(message);
        // Aseguramos que no se llame con una cadena vacía
        expect(logger.http).not.toHaveBeenCalledWith('');
      });
    });
  });

  describe('manejo de metadatos', () => {
    test('debería incluir metadatos adicionales en los logs', () => {
      const metadata = {
        userId: '123',
        action: 'create',
        resource: 'user'
      };

      logger.info('User action', { metadata });

      expect(logger.info).toHaveBeenCalledWith(
        'User action',
        expect.objectContaining({ metadata })
      );
    });
  });

  describe('manejo de errores no capturados', () => {
    test('debería logear errores no capturados con stack trace completo', () => {
      const error = new Error('Uncaught error');
      error.stack = 'Error: Uncaught error\n    at Test.fn';

      logger.logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Uncaught error',
        expect.objectContaining({
          metadata: expect.objectContaining({
            stack: expect.stringContaining('at Test.fn')
          })
        })
      );
    });
  });
});
