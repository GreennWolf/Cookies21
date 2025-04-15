// tests/integration/analytics/reporting.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Analytics = require('../../../models/Analytics');
const Domain = require('../../../models/Domain');
const { generateReport } = require('../../../services/report.service');
const { exportAuditLogs } = require('../../../services/export.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Analytics Reporting Integration Tests', () => {
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

    // Fechas para reporting
    startDate = new Date('2024-01-01');
    endDate = new Date('2024-01-31');

    // Crear datos de prueba para analytics
    await Analytics.create([
      {
        domainId: domain._id,
        period: {
          start: startDate,
          end: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          granularity: 'daily'
        },
        visits: { 
          total: 1000,
          unique: 800
        },
        interactions: {
          total: 900,
          types: {
            accept_all: { count: 600 },
            customize: { count: 200 },
            reject_all: { count: 100 }
          }
        },
        demographics: {
          devices: [
            { type: 'desktop', visits: 600 },
            { type: 'mobile', visits: 400 }
          ],
          countries: [
            { code: 'US', visits: 500 },
            { code: 'UK', visits: 300 },
            { code: 'ES', visits: 200 }
          ]
        }
      }
    ]);
  });

  describe('Generación de Reportes', () => {
    test('debería generar reporte en formato PDF', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/report`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'pdf'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    test('debería generar reporte en formato CSV', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/report`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'csv'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('Date,Total Visits,Unique Visitors');
    });

    test('debería incluir métricas personalizadas en el reporte', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/report`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'json',
          metrics: 'acceptance_rate,customization_rate'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.report).toMatchObject({
        metrics: expect.objectContaining({
          acceptance_rate: expect.any(Number),
          customization_rate: expect.any(Number)
        })
      });
    });
  });

  describe('Exportación de Datos', () => {
    test('debería exportar datos analíticos completos', async () => {
      const response = await request(app)
        .post(`/api/v1/analytics/domain/${domain._id}/export`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeDetails: true
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        summary: expect.any(Object),
        interactions: expect.any(Object),
        demographics: expect.any(Object)
      });
    });

    test('debería exportar datos filtrados por criterios', async () => {
      const response = await request(app)
        .post(`/api/v1/analytics/domain/${domain._id}/export`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          filters: {
            country: 'US',
            device: 'desktop'
          }
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.demographics).toMatchObject({
        devices: expect.arrayContaining([
          expect.objectContaining({
            type: 'desktop',
            visits: 600
          })
        ]),
        countries: expect.arrayContaining([
          expect.objectContaining({
            code: 'US',
            visits: 500
          })
        ])
      });
    });

    test('debería exportar datos en formato Excel', async () => {
      const response = await request(app)
        .post(`/api/v1/analytics/domain/${domain._id}/export`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'excel'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type'])
        .toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('Reportes Programados', () => {
    test('debería configurar reporte programado', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        dayOfWeek: 1, // Lunes
        time: '00:00',
        format: 'pdf',
        recipients: ['admin@test.com']
      };

      const response = await request(app)
        .post(`/api/v1/analytics/domain/${domain._id}/reports/schedule`)
        .send(scheduleConfig)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.schedule).toMatchObject(scheduleConfig);

      // Verificar actualización en el dominio
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.settings.reporting.schedules)
        .toContainEqual(expect.objectContaining(scheduleConfig));
    });

    test('debería generar reporte bajo demanda', async () => {
      const response = await request(app)
        .post(`/api/v1/analytics/domain/${domain._id}/reports/generate`)
        .send({
          template: 'monthly_summary',
          format: 'pdf'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });
});