// src/tests/unit/controllers/cookieScanController.test.js

// --- Mocks globales ---

// Mock de Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(null),
      setViewport: jest.fn().mockResolvedValue(null),
      $: jest.fn().mockResolvedValue(null),
      $$: jest.fn().mockResolvedValue([]),
      evaluate: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(null),
      setDefaultNavigationTimeout: jest.fn(),
      setUserAgent: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn()
    }),
    close: jest.fn().mockResolvedValue(null)
  })
}));

// Mock de analytics.service (para analyzeCookieChanges)
jest.mock('../../../services/analytics.service', () => ({
  analyzeCookieChanges: jest.fn().mockResolvedValue({ changes: 'mock changes' })
}));

// --- Fin de Mocks globales ---

const CookieScanController = require('../../../controllers/CookiesScanController');
const CookieScan = require('../../../models/CookieScan');
const Domain = require('../../../models/Domain');
const Cookie = require('../../../models/Cookie');
const { scanDomain } = require('../../../services/scanner.service');
const cookieFixtures  = require('../../fixtures/cookies');
const domainFixtures  = require('../../fixtures/domain');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock de otros modelos y servicios
jest.mock('../../../models/CookieScan');
jest.mock('../../../models/Domain');
jest.mock('../../../models/Cookie');
jest.mock('../../../services/scanner.service');

// Si el fixture de cookie analytics no existe, se define dummy
if (!cookieFixtures.analyticsCookie) {
  cookieFixtures.analyticsCookie = { name: '_ga', value: 'GA1.2.123.456' };
}

describe('CookieScanController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      clientId: 'mock-client-id',
      userId: 'mock-user-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Reiniciamos los métodos mockeados
    CookieScan.findOne = jest.fn();
    CookieScan.create = jest.fn();
    CookieScan.findById = jest.fn();
    Domain.findOne = jest.fn();
    CookieScan.countDocuments = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startScan', () => {
    test('debería iniciar un escaneo exitosamente', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.body = {
        scanType: 'full',
        priority: 'normal'
      };

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId,
        domain: 'test.com'
      };

      const mockScan = {
        _id: 'mock-scan-id',
        domainId,
        status: 'pending',
        scanConfig: req.body,
        metadata: { triggeredBy: req.userId, scanType: 'manual' },
        save: jest.fn().mockResolvedValue(true)
      };

      Domain.findOne.mockResolvedValue(mockDomain);
      // Simulamos que no hay escaneo activo
      CookieScan.findOne.mockResolvedValue(null);
      CookieScan.create.mockResolvedValue(mockScan);

      // Act
      await CookieScanController.startScan(req, res, next);

      // Assert
      expect(CookieScan.create).toHaveBeenCalledWith(expect.objectContaining({
        domainId,
        status: 'pending',
        scanConfig: expect.objectContaining({
          type: 'full',
          priority: 'normal',
          includeSubdomains: true,
          maxUrls: 100
        }),
        metadata: expect.objectContaining({
          triggeredBy: req.userId,
          scanType: 'manual'
        })
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { scan: mockScan }
      });
    });

    test('debería prevenir escaneos simultáneos', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId
      };

      const activeScan = {
        _id: 'active-scan-id',
        status: 'in_progress'
      };

      Domain.findOne.mockResolvedValue(mockDomain);
      CookieScan.findOne.mockResolvedValue(activeScan);

      // Act
      await CookieScanController.startScan(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'A scan is already in progress for this domain'
        })
      );
    });
  });

  describe('getScanStatus', () => {
    test('debería obtener el estado del escaneo', async () => {
      // Arrange
      const scanId = 'mock-scan-id';
      req.params.scanId = scanId;

      const mockScan = {
        _id: scanId,
        domainId: { _id: 'mock-domain-id', clientId: req.clientId },
        status: 'completed',
        progress: { urlsScanned: 50, urlsTotal: 50 }
      };

      // Simular encadenamiento simple de populate
      CookieScan.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockScan)
      });

      // Act
      await CookieScanController.getScanStatus(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { scan: mockScan }
      });
    });
  });

  describe('getScanResults', () => {
    test('debería obtener resultados del escaneo completado', async () => {
      // Arrange
      const scanId = 'mock-scan-id';
      req.params.scanId = scanId;

      const mockScan = {
        _id: scanId,
        domainId: { _id: 'mock-domain-id', clientId: req.clientId },
        status: 'completed',
        findings: {
          cookies: [cookieFixtures.analyticsCookie],
          scripts: [],
          changes: {
            newCookies: [cookieFixtures.analyticsCookie],
            modifiedCookies: [],
            removedCookies: []
          }
        }
      };

      // Simular encadenamiento de dos llamadas a populate:
      CookieScan.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockScan)
        })
      });

      // Act
      await CookieScanController.getScanResults(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          scan: mockScan,
          changes: { changes: 'mock changes' }
        })
      });
    });

    test('debería manejar escaneo no completado', async () => {
      // Arrange
      const scanId = 'mock-scan-id';
      req.params.scanId = scanId;

      const mockScan = {
        _id: scanId,
        domainId: { _id: 'mock-domain-id', clientId: req.clientId },
        status: 'in_progress'
      };

      // Simular encadenamiento
      CookieScan.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockScan)
        })
      });

      // Act
      await CookieScanController.getScanResults(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Scan results not available yet'
        })
      );
    });
  });

  describe('cancelScan', () => {
    test('debería cancelar un escaneo en progreso', async () => {
      // Arrange
      const scanId = 'mock-scan-id';
      req.params.scanId = scanId;

      // Definir mockScan mutable y simular que save actualiza el estado
      const mockScan = {
        _id: scanId,
        domainId: { _id: 'mock-domain-id', clientId: req.clientId },
        status: 'in_progress',
        save: jest.fn().mockImplementation(function () {
          this.status = 'cancelled';
          return Promise.resolve(this);
        })
      };

      // Para cancelScan, se usa solo un populate
      CookieScan.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockScan)
      });

      // Act
      await CookieScanController.cancelScan(req, res, next);

      // Assert
      expect(mockScan.status).toBe('cancelled');
      expect(mockScan.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
