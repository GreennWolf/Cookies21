// tests/integration/auth/permissions.test.js

const request = require('supertest');
const app = require('../../testApp');
const { userFixtures } = require('../../fixtures/users');
const Domain = require('../../../models/Domain');
const UserAccount = require('../../../models/UserAccount');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Permissions Flow', () => {
  let client;
  let domain;

  beforeEach(async () => {
    // Crear cliente y dominio base para las pruebas
    ({ client } = await global.createAuthenticatedClient());
    domain = await global.createTestDomain(client._id);
  });

  describe('Role Based Access Control', () => {
    test('debería restringir acciones basadas en rol', async () => {
      // Arrange
      const { editorUser } = userFixtures;
      const { user: editor, token: editorToken } = await global.createAuthenticatedUser(
        client._id,
        'editor'
      );

      // Act & Assert
      // Editor puede ver usuarios pero no crear
      const viewResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${editorToken}`);
      
      expect(viewResponse.status).toBe(200);

      const createResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(editorUser);

      expect(createResponse.status).toBe(403);
      expect(createResponse.body.error.code).toBe('FORBIDDEN');
    });

    test('debería permitir acciones según permisos del rol', async () => {
      // Arrange
      const { token: adminToken } = await global.createAuthenticatedUser(
        client._id,
        'admin'
      );

      const { token: editorToken } = await global.createAuthenticatedUser(
        client._id,
        'editor'
      );

      const { token: viewerToken } = await global.createAuthenticatedUser(
        client._id,
        'viewer'
      );

      // Act & Assert
      // Probar permisos de dominio
      const testEndpoints = [
        {
          method: 'post',
          path: '/api/v1/domains',
          allowedRoles: ['admin']
        },
        {
          method: 'get',
          path: `/api/v1/domains/${domain._id}`,
          allowedRoles: ['admin', 'editor', 'viewer']
        },
        {
          method: 'patch',
          path: `/api/v1/domains/${domain._id}`,
          allowedRoles: ['admin', 'editor']
        },
        {
          method: 'delete',
          path: `/api/v1/domains/${domain._id}`,
          allowedRoles: ['admin']
        }
      ];

      const tokens = {
        admin: adminToken,
        editor: editorToken,
        viewer: viewerToken
      };

      for (const endpoint of testEndpoints) {
        for (const role of ['admin', 'editor', 'viewer']) {
          const response = await request(app)[endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${tokens[role]}`);

          const expectedStatus = endpoint.allowedRoles.includes(role) ? 
            [200, 201] : // Successful status codes
            [403];       // Forbidden

          expect(expectedStatus).toContain(response.status);
        }
      }
    });
  });

  describe('Domain Access Control', () => {
    test('debería restringir acceso por dominio asignado', async () => {
      // Arrange
      const restrictedDomain = await global.createTestDomain(client._id);
      const { user, token } = await global.createAuthenticatedUser(client._id, 'editor');

      // Actualizar usuario con dominios permitidos específicos
      await UserAccount.findByIdAndUpdate(user._id, {
        'accessControl.allowedDomains': [domain._id] // Solo acceso a un dominio
      });

      // Act & Assert
      // Puede acceder al dominio permitido
      const allowedResponse = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(allowedResponse.status).toBe(200);

      // No puede acceder al dominio restringido
      const restrictedResponse = await request(app)
        .get(`/api/v1/domains/${restrictedDomain._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(restrictedResponse.status).toBe(403);
    });

    test('debería aplicar restricciones en operaciones relacionadas', async () => {
      // Arrange
      const { user, token } = await global.createAuthenticatedUser(client._id, 'editor');
      
      // Usuario solo tiene acceso al dominio principal
      await UserAccount.findByIdAndUpdate(user._id, {
        'accessControl.allowedDomains': [domain._id]
      });

      const restrictedDomain = await global.createTestDomain(client._id);

      // Act & Assert
      // Probar diferentes operaciones relacionadas con dominios
      const endpoints = [
        `/api/v1/domains/${restrictedDomain._id}/scan`,
        `/api/v1/domains/${restrictedDomain._id}/cookies`,
        `/api/v1/domains/${restrictedDomain._id}/analytics`,
        `/api/v1/domains/${restrictedDomain._id}/banner`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
      }
    });
  });

  describe('Custom Permissions', () => {
    test('debería respetar permisos personalizados', async () => {
      // Arrange
      const { user, token } = await global.createAuthenticatedUser(client._id, 'editor');

      // Configurar permisos personalizados
      await UserAccount.findByIdAndUpdate(user._id, {
        customPermissions: {
          enabled: true,
          permissions: [
            {
              resource: 'domains',
              actions: ['read', 'update']
            },
            {
              resource: 'cookies',
              actions: ['read']
            }
          ]
        }
      });

      // Act & Assert
      // Puede leer y actualizar dominios
      const readResponse = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(readResponse.status).toBe(200);

      const updateResponse = await request(app)
        .patch(`/api/v1/domains/${domain._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { scanning: { interval: 48 } } });
      expect(updateResponse.status).toBe(200);

      // Puede leer cookies pero no crear
      const readCookiesResponse = await request(app)
        .get(`/api/v1/domains/${domain._id}/cookies`)
        .set('Authorization', `Bearer ${token}`);
      expect(readCookiesResponse.status).toBe(200);

      const createCookieResponse = await request(app)
        .post(`/api/v1/domains/${domain._id}/cookies`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'test_cookie', category: 'analytics' });
      expect(createCookieResponse.status).toBe(403);
    });

    test('debería validar conflictos de permisos', async () => {
      // Arrange
      const { user, token } = await global.createAuthenticatedUser(
        client._id,
        'viewer' // Rol con permisos limitados
      );

      // Intentar asignar permisos que excedan el rol
      const updateResponse = await request(app)
        .patch(`/api/v1/users/${user._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          permissions: [
            {
              resource: 'domains',
              actions: ['create', 'delete'] // Acciones no permitidas para viewer
            }
          ]
        });

      expect(updateResponse.status).toBe(403);
    });
  });

  describe('API Key Permissions', () => {
    test('debería respetar permisos de API key', async () => {
      // Arrange
      const apiKey = await client.generateApiKey({
        name: 'Test Key',
        permissions: ['read'],
        domains: [domain._id]
      });

      // Act & Assert
      // Puede leer datos
      const readResponse = await request(app)
        .get(`/api/v1/domains/${domain._id}`)
        .set('X-API-Key', apiKey.key);
      expect(readResponse.status).toBe(200);

      // No puede modificar datos
      const updateResponse = await request(app)
        .patch(`/api/v1/domains/${domain._id}`)
        .set('X-API-Key', apiKey.key)
        .send({ settings: { scanning: { interval: 48 } } });
      expect(updateResponse.status).toBe(403);
    });
  });
});