// src/tests/integration/domain/domain-management.test.js

const request = require('supertest');
const app = require('../../testApp');
const Domain = require('../../../models/Domain');
const Cookie = require('../../../models/Cookie');
const CookieScan = require('../../../models/CookieScan');
const Consent = require('../../../models/ConsentLog');
const Analytics = require('../../../models/Analytics');
const BannerTemplate = require('../../../models/BannerTemplate');
const Script = require('../../../models/Script');
const UserAccount = require('../../../models/UserAccount');
const { domainFixtures } = require('../../fixtures/domain');
const { clientFixtures } = require('../../fixtures/client');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Domain Management Flow', () => {
  let client;
  let adminToken;

  // Se asume que global.createAuthenticatedClient está definida en el setup.
  beforeEach(async () => {
    // Genera un cliente y token únicos para cada test.
    ({ client, token: adminToken } = await global.createAuthenticatedClient());
  });

  describe('Domain Creation', () => {
    test('debería crear un nuevo dominio exitosamente', async () => {
      // Arrange
      const { validDomain } = domainFixtures;  // Asegúrate de que este fixture exporte validDomain

      // Act
      const response = await request(app)
        .post('/api/v1/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDomain);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          domain: expect.objectContaining({
            domain: validDomain.domain.toLowerCase(),
            status: 'pending',
            settings: expect.objectContaining({
              scanning: expect.any(Object)
            })
          })
        }
      });

      // Verificar en base de datos
      const createdDomain = await Domain.findOne({ domain: validDomain.domain.toLowerCase() });
      expect(createdDomain).toBeTruthy();
      expect(createdDomain.clientId.toString()).toBe(client._id.toString());
    });

    test('debería validar límites de suscripción', async () => {
      // Arrange
      const { validDomain } = domainFixtures;
      
      // Crear dominios hasta alcanzar el límite (suponiendo límite de 5)
      const domainsToCreate = Array(5).fill(null).map((_, i) => ({
        ...validDomain,
        domain: `domain${i}.com`
      }));

      for (const domainData of domainsToCreate) {
        await Domain.create({
          ...domainData,
          clientId: client._id
        });
      }

      // Act - Intentar crear un dominio adicional
      const response = await request(app)
        .post('/api/v1/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDomain);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Domain limit reached');
    });

    test('debería validar formato de dominio', async () => {
      // Arrange
      const invalidDomains = [
        { domain: 'invalid' },
        { domain: 'invalid.' },
        { domain: '.invalid' },
        { domain: 'inv@lid.com' },
        { domain: 'http://invalid.com' }
      ];

      // Act & Assert
      for (const invalidDomain of invalidDomains) {
        const response = await request(app)
          .post('/api/v1/domains')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidDomain);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    test('debería prevenir dominios duplicados', async () => {
      // Arrange
      const { validDomain } = domainFixtures;
      await Domain.create({
        ...validDomain,
        clientId: client._id
      });

      // Act
      const response = await request(app)
        .post('/api/v1/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDomain);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Domain already registered');
    });
  });

  describe('Domain Configuration', () => {
    let domain;

    beforeEach(async () => {
      domain = await global.createTestDomain(client._id);
    });

    test('debería actualizar configuración del dominio', async () => {
      // Arrange
      const updateData = {
        settings: {
          scanning: {
            interval: 48,
            customPaths: ['/blog', '/shop']
          },
          design: {
            theme: {
              primary: '#1a73e8'
            }
          }
        }
      };

      // Act
      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      
      // Verificar que los cambios se aplicaron
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.settings.scanning.interval).toBe(48);
      expect(updatedDomain.settings.scanning.customPaths).toEqual(['/blog', '/shop']);
      expect(updatedDomain.settings.design.theme.primary).toBe('#1a73e8');
    });

    test('debería actualizar estado del dominio', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      // Assert
      expect(response.status).toBe(200);
      
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.status).toBe('active');
    });

    test('debería validar estados permitidos', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Domain Query & Filtering', () => {
    beforeEach(async () => {
      // Crear múltiples dominios para testing
      const domains = [
        { domain: 'active.com', status: 'active' },
        { domain: 'pending.com', status: 'pending' },
        { domain: 'inactive.com', status: 'inactive' },
        { domain: 'test.active.com', status: 'active' }
      ];

      for (const dom of domains) {
        await Domain.create({
          ...dom,
          clientId: client._id,
          settings: { scanning: { enabled: true } }
        });
      }
    });

    test('debería filtrar dominios por estado', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/domains')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.domains).toHaveLength(2);
      expect(response.body.data.domains.every(d => d.status === 'active')).toBe(true);
    });

    test('debería permitir búsqueda por texto', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/domains')
        .query({ search: 'test' })
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.domains).toHaveLength(1);
      expect(response.body.data.domains[0].domain).toContain('test');
    });

    test('debería paginar resultados correctamente', async () => {
      // Crear más dominios para probar paginación
      const extraDomains = Array(10).fill(null).map((_, i) => ({
        domain: `page-test-${i}.com`,
        status: 'active',
        clientId: client._id,
        settings: { scanning: { enabled: true } }
      }));

      await Domain.insertMany(extraDomains);

      // Act - Primera página
      const firstPage = await request(app)
        .get('/api/v1/domains')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Primera página
      expect(firstPage.status).toBe(200);
      expect(firstPage.body.data.domains).toHaveLength(5);
      expect(firstPage.body.data.pagination).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 5,
          totalPages: expect.any(Number),
          total: expect.any(Number)
        })
      );

      // Act - Segunda página
      const secondPage = await request(app)
        .get('/api/v1/domains')
        .query({ page: 2, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Segunda página
      expect(secondPage.status).toBe(200);
      expect(secondPage.body.data.domains).toHaveLength(5);
      expect(secondPage.body.data.domains).not.toEqual(firstPage.body.data.domains);
    });
  });

  describe('Domain Deletion', () => {
    let domain;

    beforeEach(async () => {
      domain = await global.createTestDomain(client._id);
    });

    test('debería eliminar dominio y datos relacionados', async () => {
      // Arrange
      // Para evitar problemas de validación, en la creación de cookies usamos description como objeto
      await Cookie.create({
        domainId: domain._id,
        name: '_ga',
        provider: 'Google Analytics',
        category: 'analytics',
        description: { en: 'Google Analytics cookie' },
        status: 'active'
      });

      await CookieScan.create({
        domainId: domain._id,
        status: 'completed'
      });

      // Se asume que Consent, Analytics, BannerTemplate, Script y UserAccount están configurados
      // para eliminar datos relacionados. Estos modelos se deben ajustar en función de la implementación.
      await Consent.create({
        domainId: domain._id,
        userId: 'test-user',
        status: 'valid'
      });

      await Analytics.create({
        domainId: domain._id,
        period: {
          start: new Date(),
          end: new Date(),
          granularity: 'daily'
        }
      });

      await BannerTemplate.create({
        domainId: domain._id,
        name: 'Test Template',
        type: 'custom',
        status: 'active'
      });

      await Script.create({
        domainId: domain._id,
        name: 'Test Script',
        provider: 'Test Provider',
        category: 'analytics'
      });

      // Act
      const response = await request(app)
        .delete(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      
      const deletedDomain = await Domain.findById(domain._id);
      expect(deletedDomain).toBeNull();

      // Verificar que datos relacionados hayan sido eliminados
      const cookies = await Cookie.find({ domainId: domain._id });
      expect(cookies).toHaveLength(0);

      const scans = await CookieScan.find({ domainId: domain._id });
      expect(scans).toHaveLength(0);

      const consents = await Consent.find({ domainId: domain._id });
      expect(consents).toHaveLength(0);

      const analytics = await Analytics.find({ domainId: domain._id });
      expect(analytics).toHaveLength(0);

      const templates = await BannerTemplate.find({ domainId: domain._id });
      expect(templates).toHaveLength(0);

      const scripts = await Script.find({ domainId: domain._id });
      expect(scripts).toHaveLength(0);

      const users = await UserAccount.find({
        'accessControl.allowedDomains': domain._id
      });
      expect(users).toHaveLength(0);
    });

    test('debería requerir permisos de administrador', async () => {
      const { token: editorToken } = await global.createAuthenticatedUser(client._id, 'editor');
      const response = await request(app)
        .delete(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(response.status).toBe(403);
    });

    test('debería validar dominio existente', async () => {
      const response = await request(app)
        .delete(`/api/v1/domains/invalid-id`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(404);
    });

    test('debería validar propiedad del dominio', async () => {
      const { client: otherClient, token: otherToken } = await global.createAuthenticatedClient();
      const response = await request(app)
        .delete(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(response.status).toBe(404);
    });
  });
});
