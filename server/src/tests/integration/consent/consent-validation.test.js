// tests/integration/consent/consent-validation.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const Consent = require('../../../models/ConsentLog');
const VendorList = require('../../../models/VendorList');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { generateTCString } = require('../../../services/tfc.service');

describe('Consent Validation Integration Tests', () => {
  let client;
  let token;
  let domain;
  let userId;
  let vendorList;

  beforeEach(async () => {
    // Configuración básica
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    domain = await global.createTestDomain(client._id);
    userId = 'test-user-' + Date.now();

    // Crear vendor list para pruebas
    vendorList = await VendorList.create({
      version: 1,
      lastUpdated: new Date(),
      vendors: [
        {
          id: 1,
          name: 'Analytics Provider',
          purposes: [1, 2],
          legIntPurposes: [3]
        },
        {
          id: 2,
          name: 'Marketing Provider',
          purposes: [1, 4],
          legIntPurposes: [5]
        }
      ],
      purposes: [
        { id: 1, name: 'Store and/or access information on a device' },
        { id: 2, name: 'Select basic ads' },
        { id: 3, name: 'Create a personalised ads profile' },
        { id: 4, name: 'Select personalised ads' },
        { id: 5, name: 'Create a personalised content profile' }
      ]
    });
  });

  describe('Validación de Estructura de Consentimiento', () => {
    test('debería validar estructura completa del consentimiento', async () => {
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
      expect(response.body.data.consent).toMatchObject({
        userId,
        status: 'valid',
        decisions: expect.objectContaining({
          purposes: expect.any(Array),
          vendors: expect.any(Array)
        })
      });
    });

    test('debería validar campos requeridos', async () => {
      const invalidConsent = {
        // userId faltante
        decisions: {
          purposes: [{ id: 1, allowed: true }]
          // vendors faltante
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(invalidConsent);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(
        expect.objectContaining({
          field: expect.any(String),
          message: expect.any(String)
        })
      );
    });
  });

  describe('Validación de Propósitos y Vendors', () => {
    test('debería validar propósitos contra la lista de vendors', async () => {
      const consentData = {
        userId,
        decisions: {
          purposes: [
            { id: 999, allowed: true }, // Propósito inválido
            { id: 1, allowed: true }
          ],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid purpose ID');
    });

    test('debería validar vendors contra la lista de vendors', async () => {
      const consentData = {
        userId,
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [
            { id: 999, allowed: true }, // Vendor inválido
            { id: 1, allowed: true }
          ]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid vendor ID');
    });
  });

  describe('Validación de Base Legal', () => {
    test('debería validar base legal para propósitos', async () => {
      const consentData = {
        userId,
        decisions: {
          purposes: [
            { id: 1, allowed: true, legalBasis: 'invalid' }, // Base legal inválida
            { id: 2, allowed: true, legalBasis: 'consent' }
          ],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid legal basis');
    });

    test('debería validar interés legítimo para propósitos específicos', async () => {
      const consentData = {
        userId,
        decisions: {
          purposes: [
            { id: 3, allowed: true, legalBasis: 'legitimate_interest' }
          ],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(201);
      expect(response.body.data.consent.decisions.purposes[0].legalBasis)
        .toBe('legitimate_interest');
    });
  });

  describe('Validación de TCF String', () => {
    test('debería generar y validar TCF string', async () => {
      const consentData = {
        userId,
        decisions: {
          purposes: [
            { id: 1, allowed: true, legalBasis: 'consent' },
            { id: 2, allowed: true, legalBasis: 'consent' }
          ],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(201);
      expect(response.body.data.tcString).toBeTruthy();

      // Verificar TC string
      const verifyResponse = await request(app)
        .post('/api/v1/consent/decode')
        .set('Authorization', `Bearer ${token}`)
        .send({ tcString: response.body.data.tcString });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.decoded).toMatchObject({
        version: expect.any(Number),
        created: expect.any(String),
        lastUpdated: expect.any(String),
        cmpId: expect.any(Number)
      });
    });
  });

  describe('Validación de Metadata', () => {
    test('debería validar y almacenar metadata del consentimiento', async () => {
      const metadata = {
        language: 'en',
        deviceType: 'desktop',
        region: 'EU',
        screenSize: '1920x1080',
        timeZone: 'Europe/London',
        userAgent: 'Mozilla/5.0...'
      };

      const consentData = {
        userId,
        decisions: {
          purposes: [{ id: 1, allowed: true, legalBasis: 'consent' }],
          vendors: [{ id: 1, allowed: true }]
        },
        metadata
      };

      const response = await request(app)
        .post(`/api/v1/consent/domain/${domain._id}`)
        .send(consentData);

      expect(response.status).toBe(201);
      expect(response.body.data.consent.metadata).toMatchObject(metadata);
    });
  });
});