// tests/unit/controllers/domainController.test.js

const DomainController = require('../../../controllers/DomainController');
const Domain = require('../../../models/Domain');
const Client = require('../../../models/Client');
const domainFixtures = require('../../fixtures/domain');
const clientFixtures = require('../../fixtures/client');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Se mockean los modelos
jest.mock('../../../models/Domain');
jest.mock('../../../models/Client');

describe('DomainController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}, // Aseguramos que req.query existe (incluso vacío)
      clientId: 'mock-client-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Definir manualmente los métodos estáticos en el mock del modelo Domain
    Domain.create = jest.fn();
    Domain.findOne = jest.fn();
    Domain.find = jest.fn();
    Domain.findOneAndUpdate = jest.fn();
    Domain.findById = jest.fn();

    // Definir método en el mock del modelo Client
    Client.findById = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Remover el mock global de verifyDomainOwnership, en caso de haberse asignado.
    delete global.verifyDomainOwnership;
  });

  describe('createDomain', () => {
    test('debería crear un dominio exitosamente', async () => {
      // Arrange
      const { validDomain } = domainFixtures; // Ej: { domain: 'TEST.com', settings: { scanning: { interval: 24 } } }
      req.body = validDomain;

      const mockClient = {
        _id: req.clientId,
        subscription: {
          allowedDomains: 5
        },
        checkSubscriptionLimits: jest.fn().mockResolvedValue({
          canAddMoreDomains: true
        })
      };

      Client.findById.mockResolvedValue(mockClient);
      Domain.findOne.mockResolvedValue(null); // No existe dominio duplicado

      const mockCreatedDomain = {
        _id: 'mock-domain-id',
        ...validDomain,
        clientId: req.clientId,
        // El controlador agrega valores por defecto:
        settings: {
          design: {},
          scanning: { enabled: true, interval: 24, ...validDomain.settings.scanning }
        },
        status: 'pending'
      };

      Domain.create.mockResolvedValue(mockCreatedDomain);

      // Act
      await DomainController.createDomain(req, res, next);

      // Assert
      expect(Domain.create).toHaveBeenCalledWith(expect.objectContaining({
        clientId: req.clientId,
        domain: validDomain.domain.toLowerCase(),
        settings: expect.objectContaining({
          scanning: expect.objectContaining({ enabled: true, interval: 24 })
        })
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { domain: mockCreatedDomain }
      });
    });

    test('debería manejar dominio duplicado', async () => {
      // Arrange
      const { validDomain } = domainFixtures;
      req.body = validDomain;

      Domain.findOne.mockResolvedValue(validDomain); // Dominio ya existe

      // Act
      await DomainController.createDomain(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Domain already registered'
        })
      );
    });

    test('debería validar límites de suscripción', async () => {
      // Arrange
      const { validDomain } = domainFixtures;
      req.body = validDomain;

      const mockClient = {
        _id: req.clientId,
        subscription: {
          allowedDomains: 1
        },
        checkSubscriptionLimits: jest.fn().mockResolvedValue({
          canAddMoreDomains: false
        })
      };

      Client.findById.mockResolvedValue(mockClient);
      Domain.findOne.mockResolvedValue(null);

      // Act
      await DomainController.createDomain(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('Domain limit reached')
        })
      );
    });
  });

  describe('getDomains', () => {
    test('debería obtener lista de dominios', async () => {
      // Arrange
      const mockDomains = [
        { _id: 'domain-1', domain: 'test1.com' },
        { _id: 'domain-2', domain: 'test2.com' }
      ];

      // Debido a la cadena sort(), simulamos que Domain.find() retorna un objeto con el método sort
      const sortMock = jest.fn().mockResolvedValue(mockDomains);
      Domain.find.mockReturnValue({ sort: sortMock });

      // Act
      await DomainController.getDomains(req, res, next);

      // Assert
      expect(Domain.find).toHaveBeenCalledWith({ clientId: req.clientId });
      expect(sortMock).toHaveBeenCalledWith('-createdAt');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { domains: mockDomains }
      });
    });
  });

  describe('updateDomain', () => {
    test('debería actualizar configuración del dominio', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      const updateData = {
        settings: {
          scanning: {
            interval: 48
          }
        }
      };

      req.params.id = domainId;
      req.body = updateData;

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId,
        domain: 'test.com'
      };

      Domain.findOneAndUpdate.mockResolvedValue({
        ...mockDomain,
        ...updateData
      });

      // Act
      await DomainController.updateDomain(req, res, next);

      // Assert
      expect(Domain.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: domainId, clientId: req.clientId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('verifyDomainOwnership', () => {
    test('debería verificar propiedad del dominio exitosamente', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.id = domainId;

      // Creamos un dominio mock con método save
      const mockDomain = {
        _id: domainId,
        domain: 'test.com',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      Domain.findOne.mockResolvedValue(mockDomain);

      // Inyectamos globalmente la función verifyDomainOwnership para simular la verificación.
      global.verifyDomainOwnership = jest.fn().mockResolvedValue({
        verified: true,
        method: 'dns',
        details: {}
      });

      // Act
      await DomainController.verifyDomainOwnership(req, res, next);

      // Assert
      expect(Domain.findOne).toHaveBeenCalledWith({ _id: domainId, clientId: req.clientId });
      expect(global.verifyDomainOwnership).toHaveBeenCalledWith(mockDomain);
      // Se espera que, al ser verificado, el dominio actualice su status y se llame a save()
      expect(mockDomain.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          verified: true,
          method: 'dns',
          details: {}
        })
      });
    });
  });
});
