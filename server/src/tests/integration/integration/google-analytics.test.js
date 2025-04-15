// tests/integration/integration/google-analytics.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Domain = require('../../../models/Domain');
const { validateGoogleConfig } = require('../../../services/google.service');
const { encryptCredentials } = require('../../../utils/crypto');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Google Analytics Integration Tests', () => {
  let client;
  let token;
  let domain;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    
    // Crear dominio de prueba
    domain = await global.createTestDomain(client._id);
  });

  describe('Configuración de Google Analytics', () => {
    test('debería configurar GA4 exitosamente', async () => {
      const gaConfig = {
        measurementId: 'G-XXXXXXXXXX',
        config: {
          sendPageViews: true,
          anonymizeIp: true,
          credentials: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret'
          }
        }
      };

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/google-analytics`)
        .set('Authorization', `Bearer ${token}`)
        .send(gaConfig);

      expect(response.status).toBe(200);
      
      // Verificar actualización en dominio
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.integrations.googleAnalytics).toMatchObject({
        enabled: true,
        measurementId: gaConfig.measurementId,
        config: expect.objectContaining({
          sendPageViews: true,
          anonymizeIp: true
        })
      });
    });

    test('debería validar formato de Measurement ID', async () => {
      const invalidConfig = {
        measurementId: 'invalid-id',
        config: {
          sendPageViews: true
        }
      };

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/google-analytics`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidConfig);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Tracking de Eventos', () => {
    test('debería enviar eventos de consentimiento a GA', async () => {
      // Configurar GA primero
      await Domain.findByIdAndUpdate(domain._id, {
        'integrations.googleAnalytics': {
          enabled: true,
          measurementId: 'G-XXXXXXXXXX'
        }
      });

      const events = [
        {
          name: 'consent_update',
          params: {
            action: 'accept_all',
            categories: ['analytics', 'marketing'],
            timestamp: new Date().toISOString()
          }
        }
      ];

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/google-analytics/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({ events });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        success: true,
        eventsTracked: events.length
      });
    });

    test('debería manejar correctamente datos de consentimiento', async () => {
      await Domain.findByIdAndUpdate(domain._id, {
        'integrations.googleAnalytics': {
          enabled: true,
          measurementId: 'G-XXXXXXXXXX'
        }
      });

      const consentData = {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        functionality_storage: 'granted',
        personalization_storage: 'denied',
        security_storage: 'granted'
      };

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/google-analytics/consent`)
        .set('Authorization', `Bearer ${token}`)
        .send(consentData);

      expect(response.status).toBe(200);
      expect(response.body.data.consent).toMatchObject(consentData);
    });
  });

  describe('Verificación de Estado', () => {
    test('debería verificar estado de integración', async () => {
      const response = await request(app)
        .get(`/api/v1/integration/domain/${domain._id}/google-analytics/status`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toMatchObject({
        enabled: expect.any(Boolean),
        lastChecked: expect.any(String)
      });
    });

    test('debería reportar errores de tracking', async () => {
      await Domain.findByIdAndUpdate(domain._id, {
        'integrations.googleAnalytics': {
          enabled: true,
          measurementId: 'G-XXXXXXXXXX',
          errors: [
            {
              code: 'TRACKING_ERROR',
              message: 'Failed to send event',
              timestamp: new Date()
            }
          ]
        }
      });

      const response = await request(app)
        .get(`/api/v1/integration/domain/${domain._id}/google-analytics/errors`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0]).toMatchObject({
        code: 'TRACKING_ERROR',
        message: expect.any(String)
      });
    });
  });

  describe('Personalización', () => {
    test('debería actualizar configuración de eventos', async () => {
      const eventConfig = {
        custom_events: [
          {
            name: 'banner_view',
            params: ['position', 'template_id']
          },
          {
            name: 'preferences_opened',
            params: ['source', 'time_spent']
          }
        ]
      };

      const response = await request(app)
        .patch(`/api/v1/integration/domain/${domain._id}/google-analytics/events`)
        .set('Authorization', `Bearer ${token}`)
        .send(eventConfig);

      expect(response.status).toBe(200);
      
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.integrations.googleAnalytics.config.customEvents)
        .toEqual(eventConfig.custom_events);
    });

    test('debería configurar dimensiones personalizadas', async () => {
      const dimensionsConfig = {
        custom_dimensions: [
          {
            name: 'consent_type',
            scope: 'event'
          },
          {
            name: 'banner_template',
            scope: 'user'
          }
        ]
      };

      const response = await request(app)
        .patch(`/api/v1/integration/domain/${domain._id}/google-analytics/dimensions`)
        .set('Authorization', `Bearer ${token}`)
        .send(dimensionsConfig);

      expect(response.status).toBe(200);
      
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.integrations.googleAnalytics.config.customDimensions)
        .toEqual(dimensionsConfig.custom_dimensions);
    });
  });
});