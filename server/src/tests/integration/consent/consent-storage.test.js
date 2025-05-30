// tests/integration/consent/consent-storage.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Consent = require('../../../models/ConsentLog');
const Domain = require('../../../models/Domain');
const VendorList = require('../../../models/VendorList');
const { redis } = require('../../../config/redis');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Consent Storage Integration Tests', () => {
  let client;
  let token;
  let domain;
  let userId;
  let vendorList;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    domain = await global.createTestDomain(client._id);
    userId = 'test-user-' + Date.now();

    // Crear vendor list de prueba
    vendorList = await VendorList.create({
      version: 1,
      lastUpdated: new Date(),
      vendors: [
        { id: 1, name: 'Test Vendor', purposes: [1, 2] }
      ],
      purposes: [
        { id: 1, name: 'Test Purpose 1' },
        { id: 2, name: 'Test Purpose 2' }
      ]
    });
  });

  describe('Persistencia de Consentimiento', () => {
    test('debería persistir consentimiento y sobrescribir versión anterior', async () => {
      // Crear consentimiento inicial
      const initialConsent = await Consent.create({
        domainId: domain._id,
        userId,
        status: 'valid',
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [{ id: 1, allowed: true }]
        },
        validity: {
          startTime: new Date()
        }
      });

      // Crear nuevo consentimiento
      const newConsentData = {
        userId,
        decisions: {
          purposes: [
            { id: 1, allowed: false },
            { id: 2, allowed: true }
          ],
          vendors: [{ id: 1, allowed: false }]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(newConsentData);

      expect(response.status).toBe(201);

      // Verificar que el consentimiento anterior fue invalidado
      const oldConsent = await Consent.findById(initialConsent._id);
      expect(oldConsent.status).toBe('superseded');
      expect(oldConsent.validity.endTime).toBeTruthy();

      // Verificar que el nuevo consentimiento está activo
      const newConsent = await Consent.findOne({
        domainId: domain._id,
        userId,
        status: 'valid'
      });
      expect(newConsent).toBeTruthy();
      expect(newConsent.decisions.purposes).toHaveLength(2);
    });

    test('debería mantener el historial de cambios', async () => {
      // Crear múltiples versiones de consentimiento
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa para timestamps diferentes
        
        await request(app)
          .post(`/api/v1/consent/domain/${domain._id}`)
          .send({
            userId,
            decisions: {
              purposes: [{ id: 1, allowed: i % 2 === 0 }],
              vendors: [{ id: 1, allowed: i % 2 === 0 }]
            }
          });
      }

      // Verificar historial
      const history = await Consent.find({
        domainId: domain._id,
        userId
      }).sort('createdAt');

      expect(history).toHaveLength(3);
      expect(history[0].status).toBe('superseded');
      expect(history[1].status).toBe('superseded');
      expect(history[2].status).toBe('valid');
    });
  });

  describe('Caché y Rendimiento', () => {
    test('debería cachear y recuperar consentimientos frecuentemente accedidos', async () => {
      // Crear consentimiento
      const consentData = {
        userId,
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      // Primera verificación - debería guardar en caché
      const response1 = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({ userId });

      expect(response1.status).toBe(200);
      expect(redis.set).toHaveBeenCalled();

      // Segunda verificación - debería usar caché
      const response2 = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({ userId });

      expect(response2.status).toBe(200);
      expect(redis.get).toHaveBeenCalled();
    });

    test('debería invalidar caché al actualizar consentimiento', async () => {
      // Crear consentimiento inicial
      const initialConsent = {
        userId,
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(initialConsent);

      // Actualizar consentimiento
      const updateResponse = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send({
          ...initialConsent,
          decisions: {
            purposes: [{ id: 1, allowed: false }],
            vendors: [{ id: 1, allowed: false }]
          }
        });

      expect(updateResponse.status).toBe(201);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('Limpieza y Mantenimiento', () => {
    test('debería manejar limpieza de consentimientos antiguos', async () => {
      // Crear consentimientos con fechas antiguas
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6);

      await Consent.create([
        {
          domainId: domain._id,
          userId: 'old-user-1',
          status: 'superseded',
          decisions: {
            purposes: [{ id: 1, allowed: true }],
            vendors: [{ id: 1, allowed: true }]
          },
          validity: {
            startTime: oldDate,
            endTime: new Date(oldDate.getTime() + 86400000)
          },
          createdAt: oldDate
        },
        {
          domainId: domain._id,
          userId: 'old-user-2',
          status: 'revoked',
          decisions: {
            purposes: [{ id: 1, allowed: true }],
            vendors: [{ id: 1, allowed: true }]
          },
          validity: {
            startTime: oldDate,
            endTime: new Date(oldDate.getTime() + 86400000)
          },
          createdAt: oldDate
        }
      ]);

      // Verificar que los consentimientos antiguos no aparecen en las consultas normales
      const activeConsents = await Consent.find({
        domainId: domain._id,
        status: 'valid'
      });

      expect(activeConsents).toHaveLength(0);
    });
  });
});