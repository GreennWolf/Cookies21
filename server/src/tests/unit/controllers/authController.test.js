const AuthController = require('../../../controllers/AuthController');
const Client = require('../../../models/Client');
const UserAccount = require('../../../models/UserAccount');
const clientFixtures = require('../../fixtures/client');
const userFixtures = require('../../fixtures/users');
const jwt = require('jsonwebtoken');
const AppError = require('../../../utils/appError');
const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mocks
jest.mock('../../../models/Client');
jest.mock('../../../models/UserAccount');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      clientId: 'mock-client-id',
      userId: 'mock-user-id',
      userType: 'client'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Mock de jwt por defecto
    jwt.sign.mockReturnValue('mock.jwt.token');
    jwt.verify.mockReturnValue({ clientId: 'mock-client-id', userId: 'mock-user-id' });

    // Limpiar todos los mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('debería registrar un nuevo cliente exitosamente', async () => {
      const { validClient } = clientFixtures;
      req.body = validClient;
      
      const mockApiKey = { key: 'mock-api-key' };
      const mockCreatedClient = {
        _id: 'mock-client-id',
        ...validClient,
        generateApiKey: jest.fn().mockResolvedValue(mockApiKey)
      };

      // Configurar mocks en orden de uso
      Client.findOne = jest.fn().mockResolvedValue(null);
      Client.create = jest.fn().mockResolvedValue(mockCreatedClient);
      UserAccount.create = jest.fn().mockResolvedValue({
        _id: 'mock-user-id',
        ...userFixtures.adminUser,
        clientId: mockCreatedClient._id
      });

      await AuthController.register(req, res, next);

      expect(Client.create).toHaveBeenCalledWith(expect.objectContaining({
        name: validClient.name,
        email: validClient.email,
        password: validClient.password,
        company: validClient.company,
        subscription: expect.any(Object)
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          client: expect.any(Object),
          tokens: expect.any(Object)
        })
      });
    });

    test('debería manejar el error de email duplicado', async () => {
      const { validClient } = clientFixtures;
      req.body = validClient;
      
      Client.findOne = jest.fn().mockResolvedValue({ _id: 'existing-id' });

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Email already in use'
        })
      );
      expect(Client.create).not.toHaveBeenCalled();
    });

    test('debería validar los campos requeridos', async () => {
      req.body = {
        name: 'Test'
        // Faltan campos requeridos
      };

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('required')
        })
      );
    });

    test('debería validar el formato de email', async () => {
      req.body = {
        ...clientFixtures.validClient,
        email: 'invalid-email'
      };

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('email')
        })
      );
    });
  });

  describe('login', () => {
    test('debería autenticar un cliente exitosamente', async () => {
      const mockClient = {
        _id: 'mock-client-id',
        email: 'test@example.com',
        name: 'Test Client',
        status: 'active',
        verifyPassword: jest.fn().mockResolvedValue(true)
      };

      req.body = {
        email: mockClient.email,
        password: 'validPassword123'
      };

      Client.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClient)
      });

      UserAccount.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await AuthController.login(req, res, next);

      expect(mockClient.verifyPassword).toHaveBeenCalledWith('validPassword123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockClient._id,
            email: mockClient.email,
            role: 'client'
          }),
          tokens: expect.any(Object)
        })
      });
    });
    test('debería rechazar credenciales inválidas', async () => {
      const mockClient = {
        _id: 'mock-client-id',
        email: 'test@example.com',
        status: 'active',
        verifyPassword: jest.fn().mockResolvedValue(false)
      };

      req.body = {
        email: mockClient.email,
        password: 'wrongPassword'
      };

      Client.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClient)
      });

      UserAccount.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid credentials'
        })
      );
    });

    test('debería validar campos requeridos de login', async () => {
      req.body = {
        email: 'test@example.com'
        // Falta password
      };

      await AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('provide email and password')
        })
      );
    });

    test('debería validar cuenta activa', async () => {
      const mockClient = {
        _id: 'mock-client-id',
        email: 'test@example.com',
        status: 'inactive',
        verifyPassword: jest.fn().mockResolvedValue(true)
      };

      req.body = {
        email: mockClient.email,
        password: 'validPassword123'
      };

      Client.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClient)
      });

      UserAccount.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Account is not active'
        })
      );
    });
  });

  describe('refreshToken', () => {
    test('debería renovar el token exitosamente', async () => {
      req.body = {
        refreshToken: 'valid.refresh.token'
      };
  
      // Configurar el mock para jwt.verify para que retorne un objeto válido
      jwt.verify.mockReturnValue({ clientId: 'mock-client-id', userId: 'mock-user-id' });
  
      // Mockear Client.findById para que retorne un cliente activo
      Client.findById = jest.fn().mockResolvedValue({
        _id: 'mock-client-id',
        status: 'active'
      });
  
      // Si el token contiene userId, también mockear UserAccount.findById para que retorne un usuario activo
      UserAccount.findById = jest.fn().mockResolvedValue({
        _id: 'mock-user-id',
        status: 'active'
      });
  
      await AuthController.refreshToken(req, res, next);
  
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid.refresh.token',
        process.env.JWT_SECRET
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { tokens: expect.any(Object) }
      });
    });
  });

  describe('changePassword', () => {
    test('debería cambiar la contraseña exitosamente', async () => {
      const mockUser = {
        _id: 'mock-user-id',
        verifyPassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      Client.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      req.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      await AuthController.changePassword(req, res, next);

      expect(mockUser.verifyPassword).toHaveBeenCalledWith('oldPassword123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password changed successfully'
      });
    });

    test('debería rechazar contraseña actual incorrecta', async () => {
      const mockUser = {
        _id: 'mock-user-id',
        verifyPassword: jest.fn().mockResolvedValue(false)
      };

      Client.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      req.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123'
      };

      await AuthController.changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Current password is incorrect'
        })
      );
    });

    test('debería validar usuario existente', async () => {
      Client.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      req.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      await AuthController.changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found'
        })
      );
    });
  });

  describe('forgotPassword', () => {
    test('debería enviar el token de reset exitosamente', async () => {
      const mockUser = {
        email: 'test@example.com',
        createPasswordResetToken: jest.fn().mockReturnValue('reset-token'),
        save: jest.fn().mockResolvedValue(true),
        security: {}
      };

      Client.findOne = jest.fn().mockResolvedValue(mockUser);
      UserAccount.findOne = jest.fn().mockResolvedValue(null);

      req.body = { email: mockUser.email };

      await AuthController.forgotPassword(req, res, next);

      expect(mockUser.createPasswordResetToken).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Reset token sent to email'
      });
    });

    test('debería manejar email no encontrado', async () => {
      Client.findOne = jest.fn().mockResolvedValue(null);
      UserAccount.findOne = jest.fn().mockResolvedValue(null);

      req.body = { email: 'nonexistent@example.com' };

      await AuthController.forgotPassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'No user found with that email'
        })
      );
    });
  });

  describe('resetPassword', () => {
    test('debería resetear la contraseña exitosamente', async () => {
      const mockUser = {
        security: {
          passwordResetToken: 'valid-token',
          passwordResetExpires: new Date(Date.now() + 3600000)
        },
        save: jest.fn().mockResolvedValue(true)
      };

      Client.findOne = jest.fn().mockResolvedValue(mockUser);
      UserAccount.findOne = jest.fn().mockResolvedValue(null);

      req.body = {
        token: 'valid-token',
        newPassword: 'newPassword123'
      };

      await AuthController.resetPassword(req, res, next);

      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password reset successfully'
      });
    });

    test('debería rechazar token inválido o expirado', async () => {
      Client.findOne = jest.fn().mockResolvedValue(null);
      UserAccount.findOne = jest.fn().mockResolvedValue(null);

      req.body = {
        token: 'invalid-token',
        newPassword: 'newPassword123'
      };

      await AuthController.resetPassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Token is invalid or has expired'
        })
      );
    });
  });

  describe('checkSession', () => {
    test('debería devolver la información de sesión actual', async () => {
      const mockUser = {
        _id: 'mock-user-id',
        name: 'Test User',
        email: 'test@example.com'
      };

      Client.findById = jest.fn().mockResolvedValue(mockUser);

      await AuthController.checkSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: {
            id: mockUser._id,
            name: mockUser.name,
            email: mockUser.email,
            role: 'client'
          }
        }
      });
    });
  });
});