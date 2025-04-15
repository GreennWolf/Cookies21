// tests/integration/consent/consent-flow.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Consent = require('../../../models/ConsentLog');
const VendorList = require('../../../models/VendorList');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Consent Flow Integration Tests', () => {
  let client;
  let token;
  let domain;
  let userId;

  beforeEach(async () => {
    // Crear cliente y obtener token
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;

    // Crear dominio de prueba
    domain = await global.createTestDomain(client._id);

    // ID de usuario simulado para pruebas de consentimiento
    userId = 'test-user-' + Date.now();

    // Crear vendor list de prueba
    await VendorList.create({
      version: 1,
      lastUpdated: new Date(),
      vendors: [
        { id: 1, name: 'Test Vendor 1', purposes: [1, 2] },
        { id: 2, name: 'Test Vendor 2', purposes: [1, 3] }
      ],
      purposes: [
        { id: 1, name: 'Analytics' },
        { id: 2, name: 'Personalization' },
        { id: 3, name: 'Marketing' }
      ]
    });
  });

  describe('Consent Creation Flow', () => {
    test('debería crear nuevo consentimiento con decisiones válidas', async () => {
      const consentData = {
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
          language: 'en',
          deviceType: 'desktop',
          region: 'EU'
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        consent: expect.objectContaining({
          userId,
          status: 'valid',
          decisions: expect.any(Object)
        }),
        tcString: expect.any(String)
      });

      // Verificar que el consentimiento anterior fue invalidado
      const oldConsents = await Consent.find({
        domainId: domain._id,
        userId,
        status: 'superseded'
      });
      expect(oldConsents.length).toBe(0);
    });

    test('debería rechazar decisiones con propósitos inválidos', async () => {
      const invalidConsentData = {
        userId,
        decisions: {
          purposes: [
            { id: 999, allowed: true } // ID de propósito inválido
          ],
          vendors: [
            { id: 1, allowed: true }
          ]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(invalidConsentData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Consent Verification Flow', () => {
    let existingConsent;

    beforeEach(async () => {
      // Crear un consentimiento existente para pruebas
      existingConsent = await Consent.create({
        domainId: domain._id,
        userId,
        status: 'valid',
        tcString: 'mock-tc-string',
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
        validity: {
          startTime: new Date()
        }
      });
    });

    test('debería verificar consentimiento existente', async () => {
      const response = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({
          userId,
          purposes: '1',
          vendors: '1'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        hasConsent: true,
        details: expect.objectContaining({
          purposes: expect.any(Object),
          vendors: expect.any(Object)
        })
      });
    });

    test('debería verificar múltiples propósitos y vendors', async () => {
      const response = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/verify`)
        .query({
          userId,
          purposes: '1,2',
          vendors: '1,2'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.hasConsent).toBe(false); // Porque el propósito 2 y vendor 2 fueron rechazados
    });
  });

  describe('Consent History Flow', () => {
    test('debería obtener historial de consentimiento', async () => {
      // Crear múltiples consentimientos para el mismo usuario
      await Consent.create([
        {
          domainId: domain._id,
          userId,
          status: 'superseded',
          decisions: {
            purposes: [{ id: 1, allowed: true }],
            vendors: [{ id: 1, allowed: true }]
          },
          validity: {
            startTime: new Date(Date.now() - 86400000), // 1 día atrás
            endTime: new Date()
          }
        },
        {
          domainId: domain._id,
          userId,
          status: 'valid',
          decisions: {
            purposes: [{ id: 1, allowed: false }],
            vendors: [{ id: 1, allowed: false }]
          },
          validity: {
            startTime: new Date()
          }
        }
      ]);

      const response = await request(app)
        .get(`/api/v1/consent/domain/${domain._id}/history`)
        .query({ userId })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.history).toHaveLength(2);
      expect(response.body.data.history[0].status).toBe('valid');
    });
  });

  describe('Consent Revocation Flow', () => {
    test('debería revocar consentimiento existente', async () => {
      // Crear consentimiento a revocar
      await Consent.create({
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

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}/revoke`)
        .send({ userId });

      expect(response.status).toBe(200);

      // Verificar que el consentimiento fue revocado
      const revokedConsent = await Consent.findOne({
        domainId: domain._id,
        userId,
        status: 'revoked'
      });
      expect(revokedConsent).toBeTruthy();
      expect(revokedConsent.validity.endTime).toBeTruthy();
    });
  });
});