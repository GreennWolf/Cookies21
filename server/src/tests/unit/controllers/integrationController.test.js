// Mocks de modelos: en este caso definimos un mock manual para que
// se puedan asignar los métodos estáticos que se usan.
jest.mock('../../../models/Domain', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../../../models/Client', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

// Mocks de servicios
jest.mock('../../../services/google.service', () => ({
  validateGoogleConfig: jest.fn()
}));
jest.mock('../../../services/iab.service', () => ({
  validateIABConfig: jest.fn()
}));

// Mock manual del módulo de criptografía
jest.mock('../../../utils/crypto', () => ({
  encryptCredentials: jest.fn(),
  decryptCredentials: jest.fn(),
  decrypt: jest.fn()
}));

const IntegrationController = require('../../../controllers/IntegrationController');
const Domain = require('../../../models/Domain');
const Client = require('../../../models/Client');
const { validateGoogleConfig } = require('../../../services/google.service');
const { validateIABConfig } = require('../../../services/iab.service');
const { encryptCredentials } = require('../../../utils/crypto');

describe('IntegrationController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      clientId: 'mock-client-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Reiniciar mocks de modelos
    Domain.findOne.mockClear();
    Domain.findByIdAndUpdate.mockClear();
    Client.findById.mockClear();
    Client.findByIdAndUpdate.mockClear();

    // Implementaciones por defecto
    Domain.findByIdAndUpdate.mockResolvedValue({});
    Client.findByIdAndUpdate.mockResolvedValue({});

    // Reiniciar mocks de servicios y criptografía
    validateGoogleConfig.mockClear();
    validateIABConfig.mockClear();
    encryptCredentials.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configureGoogleAnalytics', () => {
    test('debería configurar Google Analytics exitosamente', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      const gaConfig = {
        measurementId: 'G-12345678',
        config: {
          sendPageViews: true,
          anonymizeIp: true,
          credentials: {
            clientId: 'mock-client-id',
            clientSecret: 'mock-secret'
          }
        }
      };

      req.params.domainId = domainId;
      req.body = gaConfig;

      const mockDomain = { _id: domainId, clientId: req.clientId };
      const mockValidation = { isValid: true, measurementId: gaConfig.measurementId };

      Domain.findOne.mockResolvedValue(mockDomain);
      validateGoogleConfig.mockResolvedValue(mockValidation);
      encryptCredentials.mockImplementation(() => 'encrypted-credentials');

      // Act
      await IntegrationController.configureGoogleAnalytics(req, res, next);

      // Assert
      expect(Domain.findByIdAndUpdate).toHaveBeenCalledWith(
        domainId,
        expect.objectContaining({
          'integrations.googleAnalytics': expect.objectContaining({
            enabled: true,
            measurementId: gaConfig.measurementId,
            config: expect.objectContaining({
              credentials: 'encrypted-credentials'
            })
          })
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: expect.any(String)
      });
    });

    test('debería manejar configuración inválida', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      const invalidConfig = {
        measurementId: 'invalid-id'
      };

      req.params.domainId = domainId;
      req.body = invalidConfig;

      const mockDomain = { _id: domainId, clientId: req.clientId };
      Domain.findOne.mockResolvedValue(mockDomain);
      validateGoogleConfig.mockResolvedValue({
        isValid: false,
        errors: ['Invalid Measurement ID format']
      });

      // Act
      await IntegrationController.configureGoogleAnalytics(req, res, next);

      // Assert: Se espera que se llame a next con un error con statusCode 400
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid Google Analytics configuration')
        })
      );
    });
  });

  describe('configureIAB', () => {
    test('debería configurar integración IAB exitosamente', async () => {
      // Arrange
      const iabConfig = {
        cmpId: 123,
        config: {
          version: '2.0',
          scope: 'global'
        }
      };

      req.body = iabConfig;

      const mockClient = { _id: req.clientId };
      Client.findById.mockResolvedValue(mockClient);
      validateIABConfig.mockResolvedValue({ isValid: true, cmpId: iabConfig.cmpId });

      // Act
      await IntegrationController.configureIAB(req, res, next);

      // Assert
      expect(Client.findByIdAndUpdate).toHaveBeenCalledWith(
        req.clientId,
        expect.objectContaining({
          'integrations.iab': expect.objectContaining({
            enabled: true,
            cmpId: iabConfig.cmpId
          })
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: expect.any(String)
      });
    });
  });

  describe('getIntegrationStatus', () => {
    test('debería obtener estado de integraciones', async () => {
      // Arrange
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId,
        integrations: {
          googleAnalytics: { enabled: true, measurementId: 'G-12345678' },
          gtm: { enabled: true, containerId: 'GTM-XXXXX' },
          iab: { enabled: true, cmpId: 123 },
          webhooks: []
        }
      };

      // Simulamos la cadena de métodos: Domain.findOne(...).select('integrations')
      Domain.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockDomain)
      });

      // Act
      await IntegrationController.getIntegrationStatus(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          status: expect.any(Object)
        })
      });
    });
  });
});
