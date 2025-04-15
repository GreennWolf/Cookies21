// tests/unit/services/domain.service.test.js

const Domain = require('../../../models/Domain');
const Client = require('../../../models/Client');
const { validateDomain } = require('../../../utils/domainValidator');
const { sanitizeStyles } = require('../../../utils/styleSanitizer');
const domainService = require('../../../services/domain.service');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../models/Domain');
jest.mock('../../../models/Client');
jest.mock('../../../utils/domainValidator');
jest.mock('../../../utils/styleSanitizer');
jest.mock('../../../utils/logger');

describe('DomainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDomain', () => {
    test('debería crear un dominio exitosamente', async () => {
      // Arrange
      const domainData = {
        clientId: 'client-1',
        domain: 'test.com',
        settings: {
          scanning: {
            enabled: true,
            interval: 24
          }
        }
      };

      const mockClient = {
        _id: domainData.clientId,
        subscription: {
          allowedDomains: 5
        },
        checkSubscriptionLimits: jest.fn().mockResolvedValue({
          canAddMoreDomains: true
        })
      };

      validateDomain.mockResolvedValue({
        isValid: true,
        domain: domainData.domain
      });

      Client.findById.mockResolvedValue(mockClient);
      Domain.findOne.mockResolvedValue(null);

      const mockDomain = {
        _id: 'domain-1',
        ...domainData
      };

      Domain.create.mockResolvedValue(mockDomain);

      // Act
      const result = await domainService.createDomain(domainData);

      // Assert
      expect(Domain.create).toHaveBeenCalledWith(expect.objectContaining({
        clientId: domainData.clientId,
        domain: domainData.domain.toLowerCase(),
        settings: expect.any(Object),
        status: 'pending'
      }));

      expect(result).toEqual(mockDomain);
    });

    test('debería validar dominio duplicado', async () => {
      // Arrange
      Domain.findOne.mockResolvedValue({ domain: 'test.com' });

      // Act & Assert
      await expect(domainService.createDomain({
        domain: 'test.com'
      })).rejects.toThrow('Domain already registered');
    });

    test('debería validar límites de suscripción', async () => {
      // Arrange
      const mockClient = {
        checkSubscriptionLimits: jest.fn().mockResolvedValue({
          canAddMoreDomains: false
        })
      };

      Client.findById.mockResolvedValue(mockClient);
      Domain.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(domainService.createDomain({
        clientId: 'client-1',
        domain: 'test.com'
      })).rejects.toThrow('Domain limit reached');
    });
  });

  describe('verifyDomainOwnership', () => {
    test('debería verificar propiedad exitosamente', async () => {
      // Arrange
      const mockDomain = {
        _id: 'domain-1',
        domain: 'test.com',
        status: 'pending',
        save: jest.fn()
      };

      Domain.findById.mockResolvedValue(mockDomain);

      const verificationResult = {
        verified: true,
        method: 'dns'
      };

      // Act
      const result = await domainService.verifyDomainOwnership(mockDomain._id);

      // Assert
      expect(result).toEqual(verificationResult);
      expect(mockDomain.status).toBe('active');
      expect(mockDomain.save).toHaveBeenCalled();
    });
  });

  describe('updateDomainSettings', () => {
    test('debería actualizar configuración del dominio', async () => {
      // Arrange
      const updateData = {
        settings: {
          scanning: {
            interval: 48,
            enabled: true
          }
        }
      };

      const mockDomain = {
        _id: 'domain-1',
        clientId: 'client-1',
        settings: {
          scanning: {
            interval: 24,
            enabled: true
          }
        }
      };

      Domain.findById.mockResolvedValue(mockDomain);
      Domain.findByIdAndUpdate.mockResolvedValue({
        ...mockDomain,
        settings: {
          ...mockDomain.settings,
          ...updateData.settings
        }
      });

      // Act
      const result = await domainService.updateDomainSettings(
        'domain-1',
        'client-1',
        updateData
      );

      // Assert
      expect(Domain.findByIdAndUpdate).toHaveBeenCalledWith(
        'domain-1',
        { $set: updateData },
        { new: true }
      );

      expect(result.settings.scanning.interval).toBe(48);
    });
  });

  describe('updateBannerConfig', () => {
    test('debería actualizar configuración del banner', async () => {
      // Arrange
      const bannerConfig = {
        layout: {
          type: 'modal',
          position: 'center'
        },
        components: []
      };

      const mockDomain = {
        _id: 'domain-1',
        bannerConfig: {},
        save: jest.fn()
      };

      Domain.findOne.mockResolvedValue(mockDomain);
      sanitizeStyles.mockImplementation(styles => styles);

      // Act
      const result = await domainService.updateBannerConfig(
        'domain-1',
        'client-1',
        bannerConfig
      );

      // Assert
      expect(mockDomain.bannerConfig).toEqual(bannerConfig);
      expect(mockDomain.save).toHaveBeenCalled();
    });
  });

  describe('getDomains', () => {
    test('debería obtener lista de dominios con filtros', async () => {
      // Arrange
      const filters = {
        status: 'active',
        search: 'test'
      };

      const mockDomains = [
        { _id: 'domain-1', domain: 'test1.com' },
        { _id: 'domain-2', domain: 'test2.com' }
      ];

      Domain.find.mockResolvedValue(mockDomains);

      // Act
      const result = await domainService.getDomains('client-1', filters);

      // Assert
      expect(Domain.find).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'client-1',
        status: 'active',
        domain: expect.any(Object)
      }));

      expect(result).toEqual(mockDomains);
    });
  });

  describe('deleteDomain', () => {
    test('debería eliminar dominio y datos relacionados', async () => {
      // Arrange
      const mockDomain = {
        _id: 'domain-1',
        clientId: 'client-1'
      };

      Domain.findOneAndDelete.mockResolvedValue(mockDomain);

      // Act
      await domainService.deleteDomain('domain-1', 'client-1');

      // Assert
      expect(Domain.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'domain-1',
        clientId: 'client-1'
      });

      // Verificar limpieza de datos relacionados
      // Aquí se pueden agregar más expectativas según la implementación
    });

    test('debería manejar dominio no encontrado', async () => {
      // Arrange
      Domain.findOneAndDelete.mockResolvedValue(null);

      // Act & Assert
      await expect(domainService.deleteDomain('invalid-id', 'client-1'))
        .rejects.toThrow('Domain not found');
    });
  });
});