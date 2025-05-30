// src/tests/unit/controllers/userAccountController.test.js

const UserAccountController = require('../../../controllers/UserAccountController');
const UserAccount = require('../../../models/UserAccount');
const Client = require('../../../models/Client');
// Mockear sendInvitationEmail con factory para que sea una función mock
const { sendInvitationEmail } = require('../../../services/email.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Se simulan los mocks de los modelos y servicios
jest.mock('../../../models/UserAccount');
jest.mock('../../../models/Client');
jest.mock('../../../services/email.service', () => ({
  sendInvitationEmail: jest.fn()
}));

describe('UserAccountController', () => {
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
      user: {
        name: 'Test Admin',
        role: 'admin'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('debería crear un nuevo usuario exitosamente', async () => {
      const userData = {
        email: 'newuser@test.com',
        name: 'New User',
        role: 'editor',
        permissions: ['read', 'write'],
        allowedDomains: ['domain-1']
      };

      req.body = userData;

      // Simulamos que el cliente puede invitar (sin límite)
      UserAccount.validateInvitation.mockResolvedValue({ canInvite: true });
      // Simulamos que no existe un usuario con ese email
      UserAccount.findOne.mockResolvedValue(null);
      // Simulamos la respuesta del envío del email de invitación
      sendInvitationEmail.mockResolvedValue();

      const mockCreatedUser = {
        _id: 'mock-user-id',
        ...userData,
        clientId: req.clientId,
        status: 'pending'
      };

      UserAccount.create.mockResolvedValue(mockCreatedUser);

      await UserAccountController.createUser(req, res, next);

      // Se verifica que se llame a UserAccount.create con la estructura correcta,
      // donde las propiedades "permissions" y "allowedDomains" están anidadas respectivamente.
      expect(UserAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: req.clientId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: 'pending',
          password: expect.any(String),
          customPermissions: {
            enabled: true,
            permissions: userData.permissions
          },
          accessControl: {
            allowedDomains: userData.allowedDomains
          }
        })
      );

      expect(sendInvitationEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: expect.objectContaining({
            id: mockCreatedUser._id,
            email: mockCreatedUser.email,
            name: mockCreatedUser.name,
            role: mockCreatedUser.role
          })
        }
      });
    });

    test('debería prevenir la creación de usuarios cuando se alcanza el límite', async () => {
      req.body = {
        email: 'newuser@test.com',
        role: 'editor'
      };

      UserAccount.validateInvitation.mockResolvedValue({ 
        canInvite: false,
        reason: 'User limit reached'
      });

      await UserAccountController.createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'User limit reached for your subscription'
        })
      );
    });

    test('debería validar los campos requeridos', async () => {
      req.body = {
        name: 'Test',
        // Falta el campo email (entre otros)
        password: 'password123'
      };

      // Simulamos que al intentar crear el usuario se rechaza la operación
      UserAccount.validateInvitation.mockResolvedValue({ canInvite: true });
      UserAccount.findOne.mockResolvedValue(null);
      
      // Usamos AppError para simular un error de validación con statusCode 400
      const AppError = require('../../../utils/appError');
      UserAccount.create.mockRejectedValue(
        new AppError('Client validation failed: email is required', 400)
      );

      await UserAccountController.createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('required')
        })
      );
    });
  });

  describe('getUsers', () => {
    test('debería obtener usuarios con filtros', async () => {
      req.query = {
        status: 'active',
        role: 'editor',
        search: 'test'
      };

      const mockUsers = [
        { _id: 'user-1', name: 'Test User 1', role: 'editor' },
        { _id: 'user-2', name: 'Test User 2', role: 'editor' }
      ];

      // Simulamos el encadenamiento de métodos .select() y .sort()
      UserAccount.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      await UserAccountController.getUsers(req, res, next);

      // La consulta incluirá además un "$or" por el filtro "search"
      expect(UserAccount.find).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: req.clientId,
          status: 'active',
          role: 'editor',
          $or: expect.any(Array)
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { users: mockUsers }
      });
    });
  });

  describe('updateUser', () => {
    test('debería actualizar un usuario exitosamente', async () => {
      const userId = 'mock-user-id';
      const updates = {
        name: 'Updated Name',
        role: 'editor'
      };

      req.params.id = userId;
      req.body = updates;

      const mockUser = {
        _id: userId,
        clientId: req.clientId
      };

      const mockUpdatedUser = {
        ...mockUser,
        ...updates
      };

      UserAccount.findOne.mockResolvedValue(mockUser);
      UserAccount.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

      await UserAccountController.updateUser(req, res, next);

      expect(UserAccount.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );
    });

    test('debería validar permisos para actualizar roles', async () => {
      req.params.id = 'user-id';
      req.body = { role: 'admin' };
      req.user = { role: 'editor' };

      await UserAccountController.updateUser(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Only admins can update roles'
        })
      );
    });
  });

  describe('toggleUserStatus', () => {
    test('debería cambiar el estado de un usuario', async () => {
      const userId = 'mock-user-id';
      req.params.id = userId;
      req.body = { status: 'inactive' };

      const mockUpdatedUser = {
        _id: userId,
        status: 'inactive'
      };

      UserAccount.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

      await UserAccountController.toggleUserStatus(req, res, next);

      expect(UserAccount.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId, clientId: req.clientId },
        { status: 'inactive' },
        { new: true }
      );
    });

    test('debería validar estados inválidos', async () => {
      req.params.id = 'user-id';
      req.body = { status: 'invalid-status' };

      await UserAccountController.toggleUserStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid status'
        })
      );
    });
  });

  describe('updatePermissions', () => {
    test('debería actualizar permisos de usuario', async () => {
      const userId = 'mock-user-id';
      const permissions = {
        domains: ['read', 'write'],
        analytics: ['read']
      };

      req.params.id = userId;
      req.body = { permissions };

      const mockUser = {
        _id: userId,
        clientId: req.clientId,
        customPermissions: {},
        validatePermissionsForRole: jest.fn().mockReturnValue({ isValid: true }),
        save: jest.fn().mockResolvedValue(true)
      };

      UserAccount.findOne.mockResolvedValue(mockUser);

      await UserAccountController.updatePermissions(req, res, next);

      expect(mockUser.customPermissions.enabled).toBe(true);
      expect(mockUser.customPermissions.permissions).toEqual(permissions);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    test('debería actualizar las preferencias de usuario', async () => {
      req.body = { preferences: { theme: 'dark' } };
      req.userId = 'mock-user-id';

      const mockUser = {
        _id: 'mock-user-id',
        preferences: { theme: 'dark' }
      };

      // Simular findByIdAndUpdate con método encadenado select()
      UserAccount.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await UserAccountController.updatePreferences(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { preferences: mockUser.preferences }
      });
    });
  });

  describe('setupMFA', () => {
    test('debería configurar MFA exitosamente', async () => {
      const mockMfaDetails = {
        secret: 'mock-secret',
        recoveryKeys: ['key1', 'key2']
      };

      const mockUser = {
        _id: req.userId,
        setupMFA: jest.fn().mockResolvedValue(mockMfaDetails)
      };

      UserAccount.findById.mockResolvedValue(mockUser);

      await UserAccountController.setupMFA(req, res, next);

      expect(mockUser.setupMFA).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          secret: expect.any(String),
          recoveryKeys: expect.any(Array)
        })
      });
    });
  });

  describe('verifyMFA', () => {
    test('debería verificar token MFA válido', async () => {
      const token = '123456';
      req.body = { token };

      const mockUser = {
        _id: req.userId,
        verifyMFAToken: jest.fn().mockResolvedValue(true)
      };

      UserAccount.findById.mockResolvedValue(mockUser);

      await UserAccountController.verifyMFA(req, res, next);

      expect(mockUser.verifyMFAToken).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'MFA verified successfully'
      });
    });

    test('debería manejar token MFA inválido', async () => {
      req.body = { token: '123456' };

      const mockUser = {
        _id: req.userId,
        verifyMFAToken: jest.fn().mockResolvedValue(false)
      };

      UserAccount.findById.mockResolvedValue(mockUser);

      await UserAccountController.verifyMFA(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid MFA token'
        })
      );
    });
  });
});
