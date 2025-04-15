// tests/unit/services/analytics.service.test.js

const Analytics = require('../../../models/Analytics');
const Consent = require('../../../models/ConsentLog');
const Cookie = require('../../../models/Cookie');
const analyticsService = require('../../../services/analytics.service');
const logger = require('../../../utils/logger');
const { aggregateByTime, calculatePercentages } = require('../../../utils/analyticHelpers');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../models/Analytics');
jest.mock('../../../models/ConsentLog');
jest.mock('../../../models/Cookie');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/analyticHelpers');

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Aseguramos que los métodos estáticos existan en el mock
    Analytics.findOneAndUpdate = jest.fn();
    Analytics.aggregate = jest.fn();
    Cookie.find = jest.fn();
    Consent.find = jest.fn();
    
    // Para los helpers, asignamos implementaciones dummy si es necesario
    calculatePercentages.mockImplementation((value, total) => total ? (value / total) * 100 : 0);
    aggregateByTime.mockImplementation((interactions, field) => interactions);
  });

  describe('trackBannerInteraction', () => {
    test('debería registrar interacción con el banner correctamente', async () => {
      const interactionData = {
        domainId: 'mock-domain-id',
        action: 'accept_all',
        timeToDecision: 1500,
        customization: true,
        metadata: {
          deviceType: 'desktop',
          browserName: 'chrome'
        }
      };

      // Simulamos que el método de Analytics se resuelve exitosamente.
      Analytics.findOneAndUpdate.mockResolvedValue({ ok: 1 });

      // Act
      await analyticsService.trackBannerInteraction(interactionData);

      // Construimos el update esperado. Notar que _getPeriodStart/_getPeriodEnd son métodos internos.
      const expectedUpdate = {
        $inc: {
          'visits.total': 1,
          'interactions.types.accept_all.count': 1,
          'interactions.types.customize.count': 1
        },
        $push: {
          'interactions.details': expect.any(Object)
        }
      };

      expect(Analytics.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object), // Filtro (no lo comprobamos detalladamente)
        expectedUpdate,
        { upsert: true }
      );
    });
  });

  describe('getConsentStats', () => {
    test('debería obtener estadísticas de consentimiento agregadas', async () => {
      const domainId = 'mock-domain-id';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'daily'
      };

      const mockStats = [{
        _id: null,
        totalVisits: 1000,
        uniqueVisitors: 800,
        interactions: [
          { acceptAll: 500, rejectAll: 200, customize: 300, date: '2024-01-01' }
        ]
      }];

      Analytics.aggregate.mockResolvedValue(mockStats);
      // Simulamos que _enrichConsentStats devuelve el mismo objeto (o uno enriquecido)
      analyticsService._enrichConsentStats = jest.fn().mockResolvedValue({
        totalVisits: 1000,
        rates: {
          acceptanceRate: 50,
          rejectionRate: 20,
          customizationRate: 30
        },
        trends: []
      });

      const result = await analyticsService.getConsentStats(domainId, options);

      expect(Analytics.aggregate).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        totalVisits: expect.any(Number),
        rates: expect.objectContaining({
          acceptanceRate: expect.any(Number),
          rejectionRate: expect.any(Number),
          customizationRate: expect.any(Number)
        })
      }));
    });
  });

  describe('getCookieAnalytics', () => {
    test('debería analizar estadísticas de cookies', async () => {
      const domainId = 'mock-domain-id';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockCookies = [
        { name: '_ga', category: 'analytics', provider: 'Google', purpose: { id: 1 } },
        { name: '_fbp', category: 'marketing', provider: 'Facebook', purpose: { id: 2 } }
      ];

      const mockConsents = [
        {
          decisions: {
            cookies: [
              { name: '_ga', allowed: true },
              { name: '_fbp', allowed: false }
            ]
          }
        }
      ];

      Cookie.find.mockResolvedValue(mockCookies);
      Consent.find.mockResolvedValue(mockConsents);

      // Simulamos implementaciones dummy para los métodos internos de análisis
      analyticsService._analyzeCookieCategories = jest.fn(() => [{ category: 'analytics', count: 1, percentage: 50 }]);
      analyticsService._analyzeCookiePurposes = jest.fn(() => [{ purposeId: 1, count: 1, percentage: 50 }]);
      analyticsService._analyzeCookieAcceptance = jest.fn().mockResolvedValue([{ name: '_ga', acceptanceRate: 100, rejectionRate: 0, total: 1 }]);
      analyticsService._analyzeProviders = jest.fn(() => [{ provider: 'Google', cookieCount: 1, categories: ['analytics'], cookies: ['_ga'] }]);

      const result = await analyticsService.getCookieAnalytics(domainId, options);

      expect(result).toEqual(expect.objectContaining({
        categories: expect.any(Array),
        purposes: expect.any(Array),
        acceptance: expect.any(Array),
        providers: expect.any(Array)
      }));
    });
  });

  describe('getDemographicAnalysis', () => {
    test('debería obtener análisis demográfico', async () => {
      const domainId = 'mock-domain-id';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockAggregation = [{
        _id: null,
        countries: [{ code: 'US', visits: 500 }],
        devices: [{ type: 'mobile', visits: 300 }],
        browsers: [{ name: 'chrome', visits: 400 }]
      }];

      Analytics.aggregate.mockResolvedValue(mockAggregation);

      const result = await analyticsService.getDemographicAnalysis(domainId, options);

      // Se valida que se llame a aggregate con un pipeline que contenga por separado etapas de $match, $group y $project
      expect(Analytics.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.any(Object) }),
          expect.objectContaining({ $group: expect.any(Object) }),
          expect.objectContaining({ $project: expect.any(Object) })
        ])
      );

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          countries: expect.any(Object),
          devices: expect.any(Object),
          browsers: expect.any(Object)
        })
      ]));
    });
  });

  describe('aggregateAnalytics', () => {
    test('debería agregar datos de analytics para reporte', async () => {
      const domainId = 'mock-domain-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockConsentStats = { totalVisits: 1000, rates: { acceptanceRate: 75, customizationRate: 10, rejectionRate: 15 } };
      const mockCookieStats = { categories: [{ category: 'analytics', count: 5 }], providers: [{ provider: 'Google', count: 3 }] };
      const mockDemographics = [{ countries: { UK: 300, US: 500 }, devices: { desktop: 600, mobile: 400 } }];

      // Espiamos (spy) en los métodos internos para que resuelvan con valores conocidos
      analyticsService.getConsentStats = jest.fn().mockResolvedValue(mockConsentStats);
      analyticsService.getCookieAnalytics = jest.fn().mockResolvedValue(mockCookieStats);
      analyticsService.getDemographicAnalysis = jest.fn().mockResolvedValue(mockDemographics);

      const result = await analyticsService.aggregateAnalytics(domainId, startDate, endDate);

      expect(result).toEqual(expect.objectContaining({
        consents: mockConsentStats,
        cookies: mockCookieStats,
        demographics: mockDemographics,
        period: expect.objectContaining({
          start: startDate,
          end: endDate,
          duration: expect.any(Number)
        })
      }));

      expect(analyticsService.getConsentStats).toHaveBeenCalledWith(
        domainId,
        expect.objectContaining({ startDate, endDate })
      );
    });

    test('debería manejar errores en la agregación', async () => {
      const error = new Error('Aggregation failed');
      // Para forzar un error en la agregación, simulamos que getConsentStats falla.
      analyticsService.getConsentStats = jest.fn().mockRejectedValue(error);

      await expect(analyticsService.aggregateAnalytics(
        'mock-domain-id',
        new Date(),
        new Date()
      )).rejects.toThrow('Aggregation failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error aggregating analytics:',
        error
      );
    });
  });
});
