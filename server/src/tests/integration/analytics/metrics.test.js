// tests/integration/analytics/metrics.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Analytics = require('../../../models/Analytics');
const Domain = require('../../../models/Domain');
const { aggregateByTime, calculatePercentages } = require('../../../utils/analyticHelpers');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Analytics Metrics Integration Tests', () => {
  let client;
  let token;
  let domain;
  let startDate;
  let endDate;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    
    // Crear dominio de prueba
    domain = await global.createTestDomain(client._id);

    // Fechas para métricas
    startDate = new Date('2024-01-01');
    endDate = new Date('2024-01-31');

    // Crear datos de prueba para análisis
    await Analytics.create([
      {
        domainId: domain._id,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-01T23:59:59'),
          granularity: 'daily'
        },
        visits: { 
          total: 1000,
          unique: 800,
          returning: 200
        },
        interactions: {
          total: 900,
          types: {
            accept_all: { count: 600 },
            customize: { count: 200 },
            reject_all: { count: 100 }
          },
          metrics: {
            avgTimeToDecision: 2500,
            avgTimeInPreferences: 15000
          }
        },
        consents: {
          cookies: [
            { category: 'necessary', total: 1000, accepted: 1000 },
            { category: 'analytics', total: 900, accepted: 600 },
            { category: 'marketing', total: 900, accepted: 400 }
          ]
        }
      },
      {
        domainId: domain._id,
        period: {
          start: new Date('2024-01-02'),
          end: new Date('2024-01-02T23:59:59'),
          granularity: 'daily'
        },
        visits: {
          total: 1200,
          unique: 1000,
          returning: 300
        },
        interactions: {
          total: 1100,
          types: {
            accept_all: { count: 700 },
            customize: { count: 300 },
            reject_all: { count: 100 }
          }
        }
      }
    ]);
  });

  describe('Métricas de Conversión', () => {
    test('debería calcular tasas de aceptación y personalización', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/conversion`)
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString() 
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toMatchObject({
        acceptanceRate: expect.any(Number),
        customizationRate: expect.any(Number),
        rejectionRate: expect.any(Number)
      });

      // Verificar cálculos
      const metrics = response.body.data.metrics;
      expect(metrics.acceptanceRate).toBeCloseTo((1300/2000) * 100); // (600+700)/(900+1100)
      expect(metrics.customizationRate).toBeCloseTo((500/2000) * 100); // (200+300)/(900+1100)
    });

    test('debería calcular tasas de retención', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/retention`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toMatchObject({
        returningVisitorRate: expect.any(Number),
        averageVisitFrequency: expect.any(Number)
      });
    });
  });

  describe('Métricas de Consentimiento', () => {
    test('debería calcular métricas de consentimiento por categoría', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/consent`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'necessary',
            acceptanceRate: 100  // 1000/1000
          }),
          expect.objectContaining({
            category: 'analytics',
            acceptanceRate: expect.any(Number)  // 600/900
          })
        ])
      );
    });

    test('debería calcular métricas de tiempo de decisión', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/timing`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toMatchObject({
        avgTimeToDecision: expect.any(Number),
        avgTimeInPreferences: expect.any(Number)
      });
    });
  });

  describe('Comparativas y Tendencias', () => {
    test('debería calcular tendencias a lo largo del tiempo', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/trends`)
        .query({
          metric: 'acceptanceRate',
          granularity: 'daily'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.trends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            value: expect.any(Number)
          })
        ])
      );
    });

    test('debería comparar métricas con promedios del sector', async () => {
      // Crear algunos dominios adicionales para comparación
      await Promise.all([
        global.createTestDomain(client._id, { domain: 'compare1.com' }),
        global.createTestDomain(client._id, { domain: 'compare2.com' })
      ]);

      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/benchmark`)
        .query({
          metrics: ['acceptanceRate', 'customizationRate'].join(',')
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.benchmark).toMatchObject({
        domain: expect.any(Object),
        industry: expect.any(Object),
        percentile: expect.any(Object)
      });
    });
  });

  describe('Segmentación de Métricas', () => {
    test('debería segmentar métricas por dispositivo', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/segments`)
        .query({
          segment: 'device',
          metrics: ['acceptanceRate', 'customizationRate'].join(',')
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.segments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            segment: expect.any(String),
            metrics: expect.any(Object)
          })
        ])
      );
    });

    test('debería calcular métricas por región geográfica', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/metrics/geography`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.regions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            region: expect.any(String),
            metrics: expect.any(Object)
          })
        ])
      );
    });
  });
});