// tests/integration/analytics/data-collection.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Analytics = require('../../../models/Analytics');
const Domain = require('../../../models/Domain');
const { aggregateAnalytics } = require('../../../services/analytics.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Analytics Data Collection Integration Tests', () => {
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

    // Establecer fechas para pruebas
    startDate = new Date('2024-01-01');
    endDate = new Date('2024-01-31');
  });

  describe('Recolección de Interacciones', () => {
    test('debería registrar interacción con el banner correctamente', async () => {
      const interactionData = {
        domainId: domain._id,
        action: 'accept_all',
        timeToDecision: 1500,
        metadata: {
          deviceType: 'desktop',
          browserName: 'chrome',
          language: 'en',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/v1/analytics/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send(interactionData);

      expect(response.status).toBe(201);
      
      // Verificar registro en base de datos
      const analytics = await Analytics.findOne({
        domainId: domain._id,
        'period.start': { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      expect(analytics).toBeTruthy();
      expect(analytics.interactions.types.accept_all.count).toBe(1);
      expect(analytics.visits.total).toBe(1);
    });
  });

  describe('Agregación de Datos', () => {
    beforeEach(async () => {
      // Crear datos de prueba
      await Analytics.create([
        {
          domainId: domain._id,
          period: {
            start: startDate,
            end: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
            granularity: 'daily'
          },
          visits: { total: 100, unique: 80 },
          interactions: {
            total: 90,
            types: {
              accept_all: { count: 70 },
              customize: { count: 20 }
            }
          },
          demographics: {
            devices: [{ type: 'desktop', visits: 60 }, { type: 'mobile', visits: 40 }],
            countries: [{ code: 'US', visits: 70 }, { code: 'UK', visits: 30 }]
          }
        }
      ]);
    });

    test('debería obtener estadísticas agregadas por período', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: 'daily'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalVisits: 100,
        uniqueVisitors: 80,
        interactions: {
          total: 90,
          acceptanceRate: expect.any(Number),
          customizationRate: expect.any(Number)
        }
      });
    });

    test('debería obtener datos demográficos correctos', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/demographics`)
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.demographics).toMatchObject({
        devices: expect.arrayContaining([
          { type: 'desktop', visits: 60 },
          { type: 'mobile', visits: 40 }
        ]),
        countries: expect.arrayContaining([
          { code: 'US', visits: 70 },
          { code: 'UK', visits: 30 }
        ])
      });
    });
  });

  describe('Cálculo de Tendencias', () => {
    test('debería calcular tendencias temporales correctamente', async () => {
      await Analytics.insertMany([
        {
          domainId: domain._id,
          period: {
            start: startDate,
            end: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
            granularity: 'daily'
          },
          interactions: {
            total: 100,
            types: { accept_all: { count: 80 } }
          }
        },
        {
          domainId: domain._id,
          period: {
            start: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
            end: new Date(startDate.getTime() + 48 * 60 * 60 * 1000),
            granularity: 'daily'
          },
          interactions: {
            total: 120,
            types: { accept_all: { count: 90 } }
          }
        }
      ]);

      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/trends`)
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          metric: 'acceptance_rate'
        });

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
  });
});