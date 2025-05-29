// tests/unit/middleware/auth.test.js
const jwt = require('jsonwebtoken');
const { protect, restrictTo } = require('../../../middleware/auth');
const Client = require('../../../models/Client');
const UserAccount = require('../../../models/UserAccount');
const AppError = require('../../../utils/appError');
const { describe, test, expect, beforeEach, beforeAll } = require('@jest/globals');

jest.mock('../../../models/Client');
jest.mock('../../../models/UserAccount');

// Aseguramos que el JWT_SECRET sea el mismo para firmar y verificar
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('protect', () => {
    test('debería permitir acceso con token JWT válido', async () => {
      // Arrange
      const mockClientId = 'mock-client-id';
      const mockUserId = 'mock-user-id';
      
      const token = jwt.sign(
        { clientId: mockClientId, userId: mockUserId },
        process.env.JWT_SECRET
      );
      
      req.headers.authorization = `Bearer ${token}`;

      const mockClient = { 
        _id: mockClientId, 
        status: 'active',
      };
      
      const mockUser = { 
        _id: mockUserId,
        status: 'active',
        role: 'user'
      };

      Client.findById.mockResolvedValue(mockClient);
      UserAccount.findById.mockResolvedValue(mockUser);

      // Act
      await protect(req, res, next);

      // Assert
      expect(Client.findById).toHaveBeenCalledWith(mockClientId);
      expect(UserAccount.findById).toHaveBeenCalledWith(mockUserId);
      expect(req.user).toEqual(mockUser);
      expect(req.clientId).toBe(mockClientId);
      expect(req.userId).toBe(mockUserId);
      expect(req.userType).toBe('user');
      expect(next).toHaveBeenCalledWith();
    });

    test('debería denegar acceso sin token', async () => {
      // Act
      await protect(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Por favor, inicia sesión para obtener acceso');
    });

    test('debería denegar acceso con token inválido', async () => {
      // Arrange
      req.headers.authorization = 'Bearer invalid-token';

      // Act
      await protect(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Error de autenticación');
    });

    test('debería denegar acceso si el usuario no existe', async () => {
      // Arrange
      const token = jwt.sign(
        { clientId: 'mock-client-id', userId: 'non-existent-id' },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      Client.findById.mockResolvedValue({ _id: 'mock-client-id', status: 'active' });
      UserAccount.findById.mockResolvedValue(null);

      // Act
      await protect(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('El usuario no existe');
    });

    test('debería denegar acceso si el usuario está inactivo', async () => {
      // Arrange
      const token = jwt.sign(
        { clientId: 'mock-client-id', userId: 'mock-user-id' },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      Client.findById.mockResolvedValue({ _id: 'mock-client-id', status: 'active' });
      UserAccount.findById.mockResolvedValue({ _id: 'mock-user-id', status: 'inactive' });

      // Act
      await protect(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Cuenta inactiva o suspendida');
    });

    test('debería permitir acceso con API key válida', async () => {
      // Arrange
      req.headers['x-api-key'] = 'valid-api-key';
      const apiKeyValidation = {
        clientId: 'mock-client-id',
        permissions: ['read', 'write']
      };
      Client.validateApiKey = jest.fn().mockResolvedValue(apiKeyValidation);

      // Act
      await protect(req, res, next);

      // Assert
      expect(Client.validateApiKey).toHaveBeenCalledWith('valid-api-key');
      expect(req.clientId).toBe(apiKeyValidation.clientId);
      expect(req.apiKey).toBe('valid-api-key');
      expect(req.permissions).toEqual(apiKeyValidation.permissions);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('restrictTo', () => {
    test('debería permitir acceso a roles autorizados', async () => {
      // Arrange
      req.user = { role: 'admin' };
      const restrictMiddleware = restrictTo('admin', 'editor');

      // Act
      await restrictMiddleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
    });

    test('debería denegar acceso a roles no autorizados', async () => {
      // Arrange
      req.user = { role: 'viewer' };
      const restrictMiddleware = restrictTo('admin', 'editor');

      // Act
      await restrictMiddleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toBe('No tienes permisos para esta acción');
    });

    test('debería denegar acceso cuando no hay usuario', async () => {
      // Arrange
      req.user = undefined;
      const restrictMiddleware = restrictTo('admin', 'editor');

      // Act
      await restrictMiddleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toBe('No tienes permisos para esta acción');
    });
  });
});
