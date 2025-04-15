const AnalyticsController = require('../../../controllers/AnalyticsController');
const Analytics = require('../../../models/Analytics');
const Domain = require('../../../models/Domain');
const { aggregateAnalytics } = require('../../../services/analytics.service');
const { generateReport } = require('../../../services/report.service');
const AppError = require('../../../utils/appError');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Actualizamos el mock de catchAsync para que, en caso de error, llame a next y retorne una promesa resuelta.
jest.mock('../../../utils/catchAsync', () => ({
  catchAsync: (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
      next(err);
      return Promise.resolve(); // Evitamos que la excepción se propague
    })
}));

jest.mock('../../../models/Analytics');
jest.mock('../../../models/Domain');
jest.mock('../../../services/analytics.service');
jest.mock('../../../services/report.service');

describe('AnalyticsController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      clientId: 'mock-client-id'
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    test('debería obtener estadísticas del dashboard', async () => {
      req.query.period = '24h';
      const mockDomains = [
        { _id: 'domain-1' },
        { _id: 'domain-2' }
      ];
      const mockStats = [{
        _id: null,
        totalVisits: 1000,
        uniqueVisitors: 800,
        avgAcceptanceRate: 75.5,
        avgCustomizationRate: 25.3
      }];

      Domain.find.mockResolvedValue(mockDomains);
      Analytics.aggregate.mockResolvedValue(mockStats);

      await AnalyticsController.getDashboardStats(req, res, next);

      expect(Analytics.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            domainId: { $in: ['domain-1', 'domain-2'] },
            'period.start': { $gte: expect.any(Date) }
          }
        },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: '$visits.total' },
            uniqueVisitors: { $sum: '$visits.unique' },
            avgAcceptanceRate: {
              $avg: { $divide: ['$interactions.types.acceptAll.count', '$interactions.total'] }
            },
            avgCustomizationRate: {
              $avg: { $divide: ['$interactions.types.customize.count', '$interactions.total'] }
            }
          }
        }
      ]);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { stats: mockStats[0] || {} }
      });
    });
  });

  describe('getDomainAnalytics', () => {
    test('debería obtener analíticas por dominio', async () => {
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: 'daily'
      };

      const mockDomain = { _id: domainId, clientId: req.clientId };
      const mockAnalytics = [{
        domainId,
        visits: { total: 100 },
        period: { start: '2024-01-01' }
      }];

      Domain.findOne.mockResolvedValue(mockDomain);
      // Simulamos que Analytics.find() retorna un objeto encadenable con sort().
      Analytics.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockAnalytics)
      }));

      await AnalyticsController.getDomainAnalytics(req, res, next);

      expect(Analytics.find).toHaveBeenCalledWith({
        domainId,
        'period.start': { $gte: new Date(req.query.startDate) },
        'period.end': { $lte: new Date(req.query.endDate) },
        'period.granularity': 'daily'
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { analytics: mockAnalytics }
      });
    });

    test('debería manejar dominio no encontrado', async () => {
      req.params.domainId = 'invalid-domain-id';
      Domain.findOne.mockResolvedValue(null);

      await AnalyticsController.getDomainAnalytics(req, res, next);

      // Verificamos que next haya sido llamado con un error que contenga el mensaje 'Domain not found' y statusCode 404.
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toMatchObject({ message: 'Domain not found', statusCode: 404 });
    });
  });

  describe('generateReport', () => {
    test('debería generar reporte de analíticas', async () => {
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'pdf'
      };

      const mockDomain = { _id: domainId, clientId: req.clientId };
      const mockAnalytics = {
        visits: { total: 1000 },
        consents: { acceptanceRate: 75 }
      };
      const mockReport = { content: 'PDF content' };

      Domain.findOne.mockResolvedValue(mockDomain);
      aggregateAnalytics.mockResolvedValue(mockAnalytics);
      generateReport.mockResolvedValue(mockReport);

      await AnalyticsController.generateReport(req, res, next);

      expect(generateReport).toHaveBeenCalledWith(mockAnalytics, 'pdf');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { report: mockReport }
      });
    });

    test('debería manejar error cuando el dominio no existe', async () => {
      req.params.domainId = 'invalid-domain-id';
      Domain.findOne.mockResolvedValue(null);

      await AnalyticsController.generateReport(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toMatchObject({ message: 'Domain not found', statusCode: 404 });
    });
  });
});
