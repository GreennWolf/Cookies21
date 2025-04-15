// tests/e2e/flows.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../testApp');
const Client = require('../../models/Client');
const Domain = require('../../models/Domain');
const CookieScan = require('../../models/CookieScan');
const BannerTemplate = require('../../models/BannerTemplate');
const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('E2E Flows', () => {
  let client;
  let authToken;
  let domain;

  beforeAll(async () => {
    try {
      // Limpiar datos existentes
      await Promise.all([
        Client.deleteMany({}),
        Domain.deleteMany({}),
        CookieScan.deleteMany({}),
        BannerTemplate.deleteMany({})
      ]);

      // Crear cliente de prueba
      client = await Client.create({
        name: 'Test Company',
        email: 'test@company.com',
        password: 'Password123!',
        company: {
          name: 'Test Company Ltd',
          website: 'https://test-company.com'
        },
        status: 'active'
      });

      // Obtener token de autenticación
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@company.com',
          password: 'Password123!'
        });

      if (!loginResponse.body.success) {
        throw new Error('Login failed: ' + JSON.stringify(loginResponse.body));
      }

      authToken = loginResponse.body.token || loginResponse.body.accessToken;
      if (!authToken) {
        throw new Error('No auth token received in login response');
      }

    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Limpiar datos
      await Promise.all([
        Client.deleteMany({}),
        Domain.deleteMany({}),
        CookieScan.deleteMany({}),
        BannerTemplate.deleteMany({})
      ]);
      
      // Cerrar conexión
      await mongoose.connection.close();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Domain Management Flow', () => {
    test('should complete full domain setup and configuration process', async () => {
      // 1. Crear dominio
      const domainResponse = await request(app)
        .post('/api/v1/domains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domain: 'test-domain.com',
          settings: {
            scanning: {
              enabled: true,
              interval: 24
            }
          }
        });

      expect(domainResponse.status).toBe(201);
      expect(domainResponse.body.data).toBeDefined();
      domain = domainResponse.body.data.domain;
      expect(domain._id).toBeDefined();

      // 2. Configurar banner
      const templateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Template',
          domainId: domain._id,
          layout: {
            type: 'modal',
            position: 'center'
          },
          components: [
            {
              type: 'button',
              id: 'accept-all',
              action: { type: 'accept_all' },
              content: { text: 'Accept All' }
            },
            {
              type: 'button',
              id: 'reject-all',
              action: { type: 'reject_all' },
              content: { text: 'Reject All' }
            }
          ]
        });

      expect(templateResponse.status).toBe(201);
      expect(templateResponse.body.data.template).toBeDefined();

      // 3. Iniciar escaneo de cookies
      const scanResponse = await request(app)
        .post(`/api/v1/scans/domain/${domain._id}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scanType: 'full',
          priority: 'normal'
        });

      expect(scanResponse.status).toBe(201);
      const scanId = scanResponse.body.data.scan._id;

      // 4. Verificar estado del escaneo (con retry y timeout)
      const maxAttempts = 10;
      const timeout = 1000; // 1 segundo entre intentos
      let scanComplete = false;
      let attempts = 0;

      while (!scanComplete && attempts < maxAttempts) {
        const statusResponse = await request(app)
          .get(`/api/v1/scans/scan/${scanId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (statusResponse.body.data.scan.status === 'completed') {
          scanComplete = true;
          expect(statusResponse.body.data.scan.findings).toBeDefined();
        } else {
          await new Promise(resolve => setTimeout(resolve, timeout));
          attempts++;
        }
      }

      expect(scanComplete).toBe(true);

      // 5. Verificar cookies detectadas
      const cookiesResponse = await request(app)
        .get(`/api/v1/cookies/domain/${domain._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cookiesResponse.status).toBe(200);
      expect(Array.isArray(cookiesResponse.body.data.cookies)).toBe(true);

      // 6. Verificar analíticas
      const analyticsResponse = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data.analytics).toBeDefined();

      // 7. Generar reporte
      const reportResponse = await request(app)
        .get(`/api/v1/analytics/domain/${domain._id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'pdf',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.data.report).toBeDefined();
    });
  });

  describe('Consent Management Flow', () => {
    test('should handle complete consent lifecycle', async () => {
      expect(domain).toBeDefined();
      const userId = 'test-user-123';

      // 1. Obtener banner
      const bannerResponse = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}`)
        .query({ userId });

      expect(bannerResponse.status).toBe(200);
      expect(bannerResponse.body.data.banner).toBeDefined();

      // 2. Registrar consentimiento
      const consentResponse = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send({
          userId,
          decisions: {
            purposes: [
              { id: 1, allowed: true, legalBasis: 'consent' },
              { id: 2, allowed: false, legalBasis: 'consent' }
            ],
            vendors: [
              { id: 1, allowed: true },
              { id: 2, allowed: false }
            ]
          },
          metadata: {
            deviceType: 'desktop',
            language: 'en'
          }
        });

      expect(consentResponse.status).toBe(201);
      expect(consentResponse.body.data.consent).toBeDefined();

      // 3. Verificar consentimiento
      const verifyResponse = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({
          userId,
          purposes: '1',
          vendors: '1'
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.hasConsent).toBe(true);

      // 4. Revocar consentimiento
      const revokeResponse = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}/revoke`)
        .send({ userId });

      expect(revokeResponse.status).toBe(200);

      // 5. Verificar revocación
      const finalVerifyResponse = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({ userId });

      expect(finalVerifyResponse.status).toBe(200);
      expect(finalVerifyResponse.body.data.hasConsent).toBe(false);
    });
  });

  describe('Integration Flow', () => {
    test('should configure and verify integrations', async () => {
      expect(domain).toBeDefined();

      // 1. Configurar Google Analytics
      const gaResponse = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/google-analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          measurementId: 'G-XXXXXXXX',
          config: {
            sendPageViews: true,
            anonymizeIp: true
          }
        });

      expect(gaResponse.status).toBe(200);
      expect(gaResponse.body.data.integration).toBeDefined();

      // 2. Configurar IAB
      const iabResponse = await request(app)
        .post('/api/v1/integration/iab')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cmpId: 123,
          config: {
            version: '2.0'
          }
        });

      expect(iabResponse.status).toBe(200);
      expect(iabResponse.body.data.integration).toBeDefined();

      // 3. Verificar estado de integraciones
      const statusResponse = await request(app)
        .get(`/api/v1/integration/domain/${domain._id}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBeDefined();
      expect(statusResponse.body.data.status.googleAnalytics).toBeDefined();
      expect(statusResponse.body.data.status.iab).toBeDefined();
    });
  });
});