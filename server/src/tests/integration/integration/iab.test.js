// tests/integration/integration/iab.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const VendorList = require('../../../models/VendorList');
const Client = require('../../../models/Client');
const { validateIABConfig } = require('../../../services/iab.service');
const { fetchGlobalVendorList } = require('../../../services/iab.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('IAB Integration Tests', () => {
  let client;
  let token;
  let mockVendorList;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;

    // Crear lista de vendors de prueba
    mockVendorList = await VendorList.create({
      version: 1,
      lastUpdated: new Date(),
      vendors: [
        {
          id: 1,
          name: 'Test Analytics',
          purposes: [1, 2],
          legIntPurposes: [3],
          features: [1],
          policyUrl: 'https://test.com/privacy'
        },
        {
          id: 2,
          name: 'Test Marketing',
          purposes: [4, 5],
          features: [2, 3],
          policyUrl: 'https://test.com/privacy'
        }
      ],
      purposes: [
        { id: 1, name: 'Store and/or access information on a device' },
        { id: 2, name: 'Select basic ads' },
        { id: 3, name: 'Create a personalised ads profile' },
        { id: 4, name: 'Select personalised ads' },
        { id: 5, name: 'Create a personalised content profile' }
      ],
      features: [
        { id: 1, name: 'Feature 1' },
        { id: 2, name: 'Feature 2' },
        { id: 3, name: 'Feature 3' }
      ]
    });
  });

  describe('Configuración IAB', () => {
    test('debería configurar integración IAB exitosamente', async () => {
      const iabConfig = {
        cmpId: 123,
        cmpVersion: 1,
        config: {
          version: '2.2',
          scope: 'global',
          defaultLanguage: 'en'
        }
      };

      const response = await request(app)
        .post('/api/v1/integration/iab')
        .set('Authorization', `Bearer ${token}`)
        .send(iabConfig);

      expect(response.status).toBe(200);
      
      // Verificar actualización del cliente
      const updatedClient = await Client.findById(client._id);
      expect(updatedClient.integrations.iab).toMatchObject({
        enabled: true,
        cmpId: 123,
        config: expect.any(Object)
      });
    });

    test('debería validar configuración IAB inválida', async () => {
      const invalidConfig = {
        cmpId: 'invalid',
        config: {
          version: 'invalid'
        }
      };

      const response = await request(app)
        .post('/api/v1/integration/iab')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidConfig);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid IAB configuration');
    });
  });

  describe('Gestión de Vendor List', () => {
    test('debería obtener última versión de Global Vendor List', async () => {
      const response = await request(app)
        .get('/api/v1/vendors/list')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vendorList).toMatchObject({
        version: expect.any(Number),
        vendors: expect.any(Array),
        purposes: expect.any(Array)
      });
    });

    test('debería obtener vendor list específica por idioma', async () => {
      const response = await request(app)
        .get('/api/v1/vendors/list')
        .query({ language: 'es' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vendorList.purposes[0]).toHaveProperty('name');
      expect(response.body.data.language).toBe('es');
    });

    test('debería obtener cambios entre versiones de vendor list', async () => {
      // Crear una nueva versión de la lista
      const newVendorList = await VendorList.create({
        ...mockVendorList.toObject(),
        version: 2,
        vendors: [
          ...mockVendorList.vendors,
          {
            id: 3,
            name: 'New Vendor',
            purposes: [1],
            features: [1]
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/vendors/changes')
        .query({ 
          oldVersion: mockVendorList.version,
          newVersion: newVendorList.version
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.changes).toMatchObject({
        vendors: {
          added: expect.arrayContaining([
            expect.objectContaining({ id: 3 })
          ]),
          removed: expect.any(Array),
          modified: expect.any(Array)
        }
      });
    });
  });

  describe('Integración con Consentimientos', () => {
    test('debería validar consentimientos contra vendor list', async () => {
      const response = await request(app)
        .post('/api/v1/vendors/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: 1,
          purposeIds: [1, 2],
          features: [1]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
    });

    test('debería identificar consentimientos inválidos', async () => {
      const response = await request(app)
        .post('/api/v1/vendors/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: 999, // vendor que no existe
          purposeIds: [999], // propósito que no existe
          features: [999]
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid vendor');
    });
  });

  describe('Gestión de Traducciones', () => {
    test('debería obtener traducciones para propósitos y características', async () => {
      const response = await request(app)
        .get('/api/v1/vendors/translations')
        .query({ language: 'es' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.translations).toMatchObject({
        purposes: expect.any(Object),
        features: expect.any(Object)
      });
    });
  });
});