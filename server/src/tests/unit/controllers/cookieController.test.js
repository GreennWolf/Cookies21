// tests/unit/controllers/cookieController.test.js

const CookieController = require('../../../controllers/CookieController');
const Cookie = require('../../../models/Cookie');
const Domain = require('../../../models/Domain');

// Se configura el mock de detectCookieProvider para poder usar mockResolvedValue, etc.
jest.mock('../../../utils/cookieDetector', () => ({
  detectCookieProvider: jest.fn()
}));
const { detectCookieProvider } = require('../../../utils/cookieDetector');

const  cookieFixtures  = require('../../fixtures/cookies');
const  domainFixtures  = require('../../fixtures/domain');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mocks de modelos
jest.mock('../../../models/Cookie');
jest.mock('../../../models/Domain');

describe('CookieController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      clientId: 'mock-client-id',
      userId: 'mock-user-id'
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

  describe('getCookies', () => {
    test('debería obtener cookies de un dominio', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.query = {
        category: 'analytics',
        status: 'active',
        search: 'test'
      };

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId
      };

      const mockCookies = [
        {
          name: '_ga',
          category: 'analytics',
          status: 'active'
        },
        {
          name: '_gid',
          category: 'analytics',
          status: 'active'
        }
      ];

      Domain.findOne.mockResolvedValue(mockDomain);
      // Simulamos el comportamiento encadenable de Cookie.find()
      Cookie.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockCookies)
      });

      // Act
      await CookieController.getCookies(req, res, next);

      // Assert
      expect(Cookie.find).toHaveBeenCalledWith(expect.objectContaining({
        domainId,
        category: 'analytics',
        status: 'active',
        $or: expect.any(Array)
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { cookies: mockCookies }
      });
    });

    test('debería manejar dominio no encontrado', async () => {
      // Arrange
      const domainId = 'invalid-domain-id';
      req.params.domainId = domainId;

      Domain.findOne.mockResolvedValue(null);

      // Act
      await CookieController.getCookies(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Domain not found'
        })
      );
    });
  });

  describe('createCookie', () => {
    test('debería crear una cookie exitosamente', async () => {
      // Arrange
      const cookieData = {
        domainId: 'mock-domain-id',
        name: '_ga',
        // provider se omite para que se detecte
        category: 'analytics',
        description: 'Google Analytics cookie',
        purpose: 'Analytics tracking',
        attributes: {
          duration: '2 years',
          type: 'persistent'
        }
      };

      req.body = cookieData;

      const mockDomain = {
        _id: cookieData.domainId,
        clientId: req.clientId
      };

      const mockCreatedCookie = {
        _id: 'mock-cookie-id',
        ...cookieData,
        provider: 'Google Analytics',
        description: {
          en: cookieData.description,
          auto: false
        },
        metadata: {
          createdBy: 'user',
          lastModifiedBy: req.userId
        }
      };

      Domain.findOne.mockResolvedValue(mockDomain);
      detectCookieProvider.mockResolvedValue('Google Analytics');
      Cookie.create.mockResolvedValue(mockCreatedCookie);

      // Act
      await CookieController.createCookie(req, res, next);

      // Assert
      expect(Cookie.create).toHaveBeenCalledWith(expect.objectContaining({
        domainId: cookieData.domainId,
        name: cookieData.name,
        provider: 'Google Analytics',
        category: cookieData.category,
        description: {
          en: cookieData.description,
          auto: false
        },
        purpose: cookieData.purpose,
        attributes: cookieData.attributes,
        script: undefined,
        metadata: expect.objectContaining({
          createdBy: 'user',
          lastModifiedBy: req.userId
        })
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { cookie: mockCreatedCookie }
      });
    });
  });

  describe('updateCookie', () => {
    test('debería actualizar una cookie exitosamente', async () => {
      // Arrange
      const cookieId = 'mock-cookie-id';
      const updates = {
        category: 'marketing',
        description: 'Updated description'
      };

      req.params.id = cookieId;
      req.body = updates;

      const mockCookie = {
        _id: cookieId,
        domainId: {
          _id: 'mock-domain-id',
          clientId: req.clientId
        },
        metadata: {
          version: 1
        }
      };

      const mockUpdatedCookie = {
        ...mockCookie,
        ...updates,
        metadata: {
          version: 2,
          lastModifiedBy: req.userId
        }
      };

      // Simulamos findById().populate() encadenable
      Cookie.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCookie)
      });
      Cookie.findByIdAndUpdate.mockResolvedValue(mockUpdatedCookie);

      // Act
      await CookieController.updateCookie(req, res, next);

      // Assert
      expect(Cookie.findByIdAndUpdate).toHaveBeenCalledWith(
        cookieId,
        expect.objectContaining({
          ...updates,
          metadata: expect.objectContaining({
            version: 2,
            lastModifiedBy: req.userId
          })
        }),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { cookie: mockUpdatedCookie }
      });
    });
  });

  describe('updateCookieStatus', () => {
    test('debería actualizar el estado de una cookie', async () => {
      // Arrange
      const cookieId = 'mock-cookie-id';
      req.params.id = cookieId;
      req.body = { status: 'inactive' };

      const mockCookie = {
        _id: cookieId,
        // Definimos status inicialmente, por ejemplo "active"
        status: 'active',
        domainId: {
          _id: 'mock-domain-id',
          clientId: req.clientId
        },
        metadata: {},
        save: jest.fn().mockResolvedValue(true)
      };

      // Simulamos findById().populate() encadenable
      Cookie.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCookie)
      });

      // Act
      await CookieController.updateCookieStatus(req, res, next);

      // Assert
      expect(mockCookie.status).toBe('inactive');
      expect(mockCookie.metadata.lastModifiedBy).toBe(req.userId);
      expect(mockCookie.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { cookie: mockCookie }
      });
    });

    test('debería validar estados inválidos', async () => {
      // Arrange
      const cookieId = 'mock-cookie-id';
      req.params.id = cookieId;
      req.body = { status: 'invalid-status' };

      // Act
      await CookieController.updateCookieStatus(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid status'
        })
      );
    });
  });

  describe('getCookieStats', () => {
    test('debería obtener estadísticas de cookies por categoría', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId
      };

      const mockStats = [
        { _id: 'analytics', count: 5 },
        { _id: 'marketing', count: 3 },
        { _id: 'necessary', count: 2 }
      ];

      Domain.findOne.mockResolvedValue(mockDomain);
      Cookie.getStatsByCategory.mockResolvedValue(mockStats);

      // Act
      await CookieController.getCookieStats(req, res, next);

      // Assert
      expect(Cookie.getStatsByCategory).toHaveBeenCalledWith(domainId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { stats: mockStats }
      });
    });
  });

  describe('validateCompliance', () => {
    test('debería validar cumplimiento de una cookie', async () => {
      // Arrange
      const cookieId = 'mock-cookie-id';
      req.params.id = cookieId;

      const mockCookie = {
        _id: cookieId,
        domainId: {
          _id: 'mock-domain-id',
          clientId: req.clientId
        },
        // Simulamos el método de validación
        validateCompliance: jest.fn().mockReturnValue({
          valid: true,
          issues: []
        })
      };

      // Simulamos findById().populate() encadenable
      Cookie.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCookie)
      });

      // Act
      await CookieController.validateCompliance(req, res, next);

      // Assert
      expect(mockCookie.validateCompliance).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          validation: {
            valid: true,
            issues: []
          }
        }
      });
    });
  });
});
