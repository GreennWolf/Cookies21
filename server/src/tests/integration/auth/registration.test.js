// tests/integration/auth/registration.test.js

const request = require('supertest');
const app = require('../../testApp');
const Client = require('../../../models/Client');
const UserAccount = require('../../../models/UserAccount');
const clientFixtures  = require('../../fixtures/client');
const userFixtures = require('../../fixtures/users');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Registration Flow', () => {
  describe('Client Registration', () => {
    test('debería registrar un nuevo cliente exitosamente', async () => {
      // Arrange
      const { validClient } = clientFixtures;

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validClient);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: expect.objectContaining({
          client: expect.objectContaining({
            name: validClient.name,
            email: validClient.email
          }),
          apiKey: expect.any(String)
        })
      });

      // Verificar que el cliente se creó en la base de datos
      const client = await Client.findOne({ email: validClient.email });
      expect(client).toBeTruthy();
      expect(client.status).toBe('active');

      // Verificar que se creó el usuario admin
      const adminUser = await UserAccount.findOne({ 
        clientId: client._id,
        role: 'admin'
      });
      expect(adminUser).toBeTruthy();
    });

    test('debería prevenir registro con email duplicado', async () => {
      // Arrange
      const { validClient } = clientFixtures;
      await Client.create(validClient);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validClient);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'fail',
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Email already in use'
        })
      });
    });

    test('debería validar campos requeridos', async () => {
      // Arrange
      const invalidClient = {
        name: 'Test Client',
        // email faltante
        password: 'Password123!'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidClient);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('debería crear API key inicial', async () => {
      // Arrange
      const { validClient } = clientFixtures;

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validClient);

      // Assert
      expect(response.body.data.apiKey).toBeTruthy();
      
      const client = await Client.findOne({ email: validClient.email });
      expect(client.apiKeys).toHaveLength(1);
      expect(client.apiKeys[0].status).toBe('active');
    });
  });

  describe('User Account Creation', () => {
    let client;
    let adminToken;

    beforeEach(async () => {
      // Crear cliente y obtener token de admin
      ({ client, token: adminToken } = await global.createAuthenticatedClient());
    });

    test('debería permitir a admin crear nuevos usuarios', async () => {
      // Arrange
      const { editorUser } = userFixtures;

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...editorUser,
          clientId: client._id
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.user).toEqual(
        expect.objectContaining({
          email: editorUser.email,
          role: editorUser.role
        })
      );

      // Verificar usuario en base de datos
      const user = await UserAccount.findOne({ email: editorUser.email });
      expect(user).toBeTruthy();
      expect(user.clientId.toString()).toBe(client._id.toString());
    });

    test('debería validar límites de usuarios según suscripción', async () => {
      // Arrange
      const users = Array(6).fill(null).map((_, i) => ({
        name: `Test User ${i}`,
        email: `user${i}@test.com`,
        password: 'Password123!',
        role: 'editor'
      }));

      // Crear usuarios hasta alcanzar el límite
      for (let i = 0; i < 5; i++) {
        await UserAccount.create({
          ...users[i],
          clientId: client._id
        });
      }

      // Act - Intentar crear un usuario adicional
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...users[5],
          clientId: client._id
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('User limit reached');
    });

    test('debería enviar email de invitación al crear usuario', async () => {
      // Arrange
      const { editorUser } = userFixtures;
      const emailService = require('../../../services/email.service');

      // Act
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...editorUser,
          clientId: client._id
        });

      // Assert
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
        editorUser.email,
        expect.any(Object)
      );
    });
  });
});