// tests/integration/auth/login.test.js

const request = require('supertest');
const app = require('../../testApp');
const Client = require('../../../models/Client');
const UserAccount = require('../../../models/UserAccount');
const { clientFixtures } = require('../../fixtures/client');
const { userFixtures } = require('../../fixtures/users');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Login Flow', () => {
  describe('Client Login', () => {
    beforeEach(async () => {
      // Crear un cliente para las pruebas
      const { validClient } = clientFixtures;
      await global.createTestClient(validClient);
    });

    test('debería autenticar un cliente exitosamente', async () => {
      // Arrange
      const { validClient } = clientFixtures;
      const credentials = {
        email: validClient.email,
        password: validClient.password
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          user: expect.objectContaining({
            email: validClient.email,
            role: 'client'
          }),
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          })
        }
      });
    });

    test('debería rechazar credenciales inválidas', async () => {
      // Arrange
      const invalidCredentials = {
        email: 'client@test.com',
        password: 'WrongPassword123!'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    test('debería prevenir login de cuenta inactiva', async () => {
      // Arrange
      const { validClient } = clientFixtures;
      await Client.findOneAndUpdate(
        { email: validClient.email },
        { status: 'inactive' }
      );

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validClient.email,
          password: validClient.password
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Account is not active');
    });
  });

  describe('User Account Login', () => {
    let client;
    let user;

    beforeEach(async () => {
      // Crear cliente y usuario para las pruebas
      ({ client } = await global.createAuthenticatedClient());
      const { editorUser } = userFixtures;
      user = await global.createTestUser({
        ...editorUser,
        clientId: client._id
      });
    });

    test('debería autenticar un usuario exitosamente', async () => {
      // Arrange
      const credentials = {
        email: user.email,
        password: user.password
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.user).toEqual(
        expect.objectContaining({
          email: user.email,
          role: user.role
        })
      );
      expect(response.body.data.tokens).toBeTruthy();
    });

    test('debería actualizar último login del usuario', async () => {
      // Arrange
      const credentials = {
        email: user.email,
        password: user.password
      };

      // Act
      await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Assert
      const updatedUser = await UserAccount.findById(user._id);
      expect(updatedUser.accessControl.lastLogin).toBeTruthy();
    });
  });

  describe('Token Management', () => {
    test('debería refrescar token exitosamente', async () => {
      // Arrange
      const { client, token } = await global.createAuthenticatedClient();
      const refreshToken = token; // En entorno de prueba usamos el mismo token

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.tokens).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      });
    });

    test('debería invalidar token en logout', async () => {
      // Arrange
      const { token } = await global.createAuthenticatedClient();

      // Act
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(logoutResponse.status).toBe(200);

      // Intentar usar el token después de logout
      const protectedResponse = await request(app)
        .get('/api/v1/domains')
        .set('Authorization', `Bearer ${token}`);

      expect(protectedResponse.status).toBe(401);
    });

    test('debería manejar token expirado', async () => {
      // Arrange
      const expiredToken = global.generateAuthToken(
        'mock-user-id',
        'mock-client-id',
        { expiresIn: '0s' } // Token expirado inmediatamente
      );

      // Act
      const response = await request(app)
        .get('/api/v1/domains')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Token expired');
    });
  });

  describe('Password Management', () => {
    let client;

    beforeEach(async () => {
      ({ client } = await global.createAuthenticatedClient());
    });

    test('debería permitir cambio de contraseña', async () => {
      // Arrange
      const { token } = await global.createAuthenticatedClient();
      const passwordData = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!'
      };

      // Act
      const response = await request(app)
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      // Assert
      expect(response.status).toBe(200);

      // Verificar que podemos hacer login con la nueva contraseña
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: client.email,
          password: 'NewPassword123!'
        });

      expect(loginResponse.status).toBe(200);
    });

    test('debería generar token de reset de password', async () => {
      // Arrange
      const emailService = require('../../../services/email.service');

      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: client.email });

      // Assert
      expect(response.status).toBe(200);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String)
      );

      // Verificar que se generó el token
      const updatedClient = await Client.findById(client._id);
      expect(updatedClient.security.passwordResetToken).toBeTruthy();
      expect(updatedClient.security.passwordResetExpires).toBeTruthy();
    });

    test('debería resetear password con token válido', async () => {
      // Arrange
      // Generar token de reset
      const resetToken = client.createPasswordResetToken();
      await client.save();

      // Act
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword123!'
        });

      // Assert
      expect(response.status).toBe(200);

      // Verificar que el token fue consumido
      const updatedClient = await Client.findById(client._id);
      expect(updatedClient.security.passwordResetToken).toBeUndefined();
      expect(updatedClient.security.passwordResetExpires).toBeUndefined();

      // Verificar que podemos hacer login con la nueva contraseña
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: client.email,
          password: 'ResetPassword123!'
        });

      expect(loginResponse.status).toBe(200);
    });
  });
});