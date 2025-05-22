// tests/integration/domain/domain-settings.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Domain = require('../../../models/Domain');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Domain Settings Integration Tests', () => {
  let client;
  let token;
  let domain;

  beforeEach(async () => {
    // Crear cliente y usuario autenticado
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;

    // Crear dominio de prueba
    domain = await global.createTestDomain(client._id, {
      domain: 'test-domain.com',
      settings: {
        scanning: {
          enabled: true,
          interval: 24
        },
        design: {
          theme: 'light',
          position: 'bottom'
        }
      }
    });
  });

  describe('GET /api/v1/domains/:id', () => {
    test('debería obtener la configuración del dominio', async () => {
      const response = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.domain).toMatchObject({
        domain: 'test-domain.com',
        settings: expect.objectContaining({
          scanning: expect.any(Object),
          design: expect.any(Object)
        })
      });
    });

    test('debería rechazar acceso sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/v1/domains/${domain._id}`);

      expect(response.status).toBe(401);
    });

    test('debería rechazar acceso a dominio de otro cliente', async () => {
      const otherClient = await global.createTestClient({
        email: 'other@test.com'
      });
      const otherDomain = await global.createTestDomain(otherClient._id);

      const response = await request(app)
        .get(`/api/v1/domains/${otherDomain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/domains/:id', () => {
    test('debería actualizar la configuración del dominio', async () => {
      const updateData = {
        settings: {
          scanning: {
            interval: 48,
            enabled: false
          },
          design: {
            theme: 'dark',
            position: 'center'
          }
        }
      };

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.domain.settings).toMatchObject(updateData.settings);

      // Verificar persistencia en base de datos
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.settings).toMatchObject(updateData.settings);
    });

    test('debería validar configuración inválida', async () => {
      const invalidData = {
        settings: {
          scanning: {
            interval: 'invalid'
          }
        }
      };

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/domains/:id/banner', () => {
    test('debería actualizar configuración del banner', async () => {
      const bannerConfig = {
        enabled: true,
        theme: 'custom',
        position: 'bottom',
        colors: {
          primary: '#007bff',
          text: '#ffffff'
        }
      };

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/banner`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bannerConfig });

      expect(response.status).toBe(200);
      expect(response.body.data.bannerConfig).toMatchObject(bannerConfig);
    });
  });

  describe('PATCH /api/v1/domains/:id/status', () => {
    test('debería actualizar el estado del dominio (solo admin)', async () => {
      const { token: adminToken } = await global.createAuthenticatedUser(client._id, 'admin');

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(response.status).toBe(200);
      expect(response.body.data.domain.status).toBe('inactive');
    });

    test('debería rechazar actualización de estado para no-admin', async () => {
      const { token: editorToken } = await global.createAuthenticatedUser(client._id, 'editor');

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/status`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ status: 'inactive' });

      expect(response.status).toBe(403);
    });
  });

  describe('Cache Integration', () => {
    test('debería utilizar caché para consultas repetidas', async () => {
      // Primera llamada - sin caché
      const response1 = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response1.status).toBe(200);
      expect(response1.body.fromCache).toBeUndefined();

      // Segunda llamada - debería usar caché
      const response2 = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response2.status).toBe(200);
      expect(response2.body.fromCache).toBe(true);
    });
  });
});