// tests/integration/integration/webhook.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Domain = require('../../../models/Domain');
const { encryptCredentials } = require('../../../utils/crypto');
const nock = require('nock'); // Para simular llamadas HTTP externas
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Webhook Integration Tests', () => {
  let client;
  let token;
  let domain;
  let webhookUrl;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    domain = await global.createTestDomain(client._id);
    webhookUrl = 'https://webhook.test/endpoint';

    // Limpiar mocks de nock
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Configuración de Webhooks', () => {
    test('debería configurar un nuevo webhook exitosamente', async () => {
      const webhookConfig = {
        url: webhookUrl,
        events: ['consent.created', 'consent.updated'],
        secret: 'test-secret',
        config: {
          retries: 3,
          timeout: 5000
        }
      };

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/webhook`)
        .set('Authorization', `Bearer ${token}`)
        .send(webhookConfig);

      expect(response.status).toBe(201);
      expect(response.body.data.webhook).toMatchObject({
        url: webhookUrl,
        events: webhookConfig.events,
        status: 'active'
      });

      // Verificar que el webhook se guardó en el dominio
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.integrations.webhooks).toHaveLength(1);
      expect(updatedDomain.integrations.webhooks[0].url).toBe(webhookUrl);
    });

    test('debería validar URL del webhook', async () => {
      const invalidConfig = {
        url: 'invalid-url',
        events: ['consent.created']
      };

      const response = await request(app)
        .post(`/api/v1/integration/domain/${domain._id}/webhook`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidConfig);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pruebas de Entrega', () => {
    test('debería entregar eventos exitosamente', async () => {
      // Configurar webhook
      const webhook = {
        url: webhookUrl,
        events: ['consent.created'],
        secret: 'test-secret',
        status: 'active'
      };

      await Domain.findByIdAndUpdate(domain._id, {
        $push: {
          'integrations.webhooks': webhook
        }
      });

      // Simular endpoint del webhook
      const mockWebhook = nock('https://webhook.test')
        .post('/endpoint')
        .reply(200, { received: true });

      // Simular un evento de consentimiento
      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send({
          userId: 'test-user',
          decisions: {
            purposes: [{ id: 1, allowed: true }]
          }
        });

      expect(response.status).toBe(201);
      expect(mockWebhook.isDone()).toBe(true);
    });

    test('debería manejar fallos y reintentos', async () => {
      // Configurar webhook con reintentos
      const webhook = {
        url: webhookUrl,
        events: ['consent.created'],
        secret: 'test-secret',
        status: 'active',
        config: {
          retries: 2,
          timeout: 1000
        }
      };

      await Domain.findByIdAndUpdate(domain._id, {
        $push: {
          'integrations.webhooks': webhook
        }
      });

      // Simular fallos y eventual éxito
      const mockWebhook = nock('https://webhook.test')
        .post('/endpoint')
        .reply(500)
        .post('/endpoint')
        .reply(200, { received: true });

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send({
          userId: 'test-user',
          decisions: {
            purposes: [{ id: 1, allowed: true }]
          }
        });

      expect(response.status).toBe(201);
      expect(mockWebhook.isDone()).toBe(true);
    });
  });

  describe('Gestión de Webhooks', () => {
    test('debería listar webhooks configurados', async () => {
      // Configurar múltiples webhooks
      await Domain.findByIdAndUpdate(domain._id, {
        'integrations.webhooks': [
          {
            url: 'https://webhook1.test/endpoint',
            events: ['consent.created'],
            status: 'active'
          },
          {
            url: 'https://webhook2.test/endpoint',
            events: ['consent.updated'],
            status: 'active'
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v1/integration/domain/${domain._id}/webhooks`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.webhooks).toHaveLength(2);
    });

    test('debería actualizar configuración del webhook', async () => {
      // Crear webhook inicial
      const webhook = {
        url: webhookUrl,
        events: ['consent.created'],
        status: 'active'
      };

      const domain = await Domain.findByIdAndUpdate(
        domain._id,
        { $push: { 'integrations.webhooks': webhook } },
        { new: true }
      );

      const webhookId = domain.integrations.webhooks[0]._id;

      // Actualizar webhook
      const updates = {
        events: ['consent.created', 'consent.updated'],
        config: {
          retries: 5
        }
      };

      const response = await request(app)
        .patch(`/api/v1/integration/domain/${domain._id}/webhook/${webhookId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.webhook.events).toEqual(updates.events);
    });

    test('debería deshabilitar webhook', async () => {
      // Crear webhook inicial
      const webhook = {
        url: webhookUrl,
        events: ['consent.created'],
        status: 'active'
      };

      const domain = await Domain.findByIdAndUpdate(
        domain._id,
        { $push: { 'integrations.webhooks': webhook } },
        { new: true }
      );

      const webhookId = domain.integrations.webhooks[0]._id;

      const response = await request(app)
        .patch(`/api/v1/integration/domain/${domain._id}/webhook/${webhookId}/disable`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.webhook.status).toBe('inactive');

      // Verificar que no se envían eventos al webhook deshabilitado
      const mockWebhook = nock('https://webhook.test')
        .post('/endpoint')
        .reply(200);

      await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send({
          userId: 'test-user',
          decisions: { purposes: [{ id: 1, allowed: true }] }
        });

      expect(mockWebhook.isDone()).toBe(false);
    });
  });
});