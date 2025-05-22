// tests/unit/middleware/domainAccess.test.js

const { checkDomainAccess, restrictToDomainOwner, checkDomainLimit } = require('../../../middleware/domainAccess');
const Domain = require('../../../models/Domain');
const Client = require('../../../models/Client');
const AppError = require('../../../utils/appError');

// Se definen mocks explícitos para Domain y Client
jest.mock('../../../models/Domain', () => ({
  findOne: jest.fn(),
  findById: jest.fn()
}));
jest.mock('../../../models/Client', () => ({
  findById: jest.fn()
}));

describe('Domain Access Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        domainId: 'mock-domain-id'
      },
      clientId: 'mock-client-id',
      userId: 'mock-user-id',
      user: {
        role: 'admin',
        // Para la prueba de usuario no admin se sobreescribirá
        canAccessDomain: jest.fn()
      },
      apiKey: null
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

  describe('checkDomainAccess', () => {
    test('debería continuar si no hay domainId', async () => {
      req.params = {};
      await checkDomainAccess(req, res, next);
      // Se espera que next sea llamado sin error (es decir, con undefined)
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    test('debería permitir acceso cuando el dominio pertenece al cliente', async () => {
      const mockDomain = {
        _id: 'mock-domain-id',
        clientId: 'mock-client-id',
        domain: 'test.com',
        client: { apiKeys: [] }
      };
      Domain.findOne.mockResolvedValue(mockDomain);

      await checkDomainAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
      expect(req.domain).toBe(mockDomain);
    });

    test('debería validar acceso con API Key', async () => {
      req.apiKey = 'test-api-key';
      const mockDomain = {
        _id: 'mock-domain-id',
        clientId: 'mock-client-id',
        domain: 'test.com',
        client: {
          apiKeys: [{
            key: 'test-api-key',
            domains: ['test.com']
          }]
        }
      };
      Domain.findOne.mockResolvedValue(mockDomain);

      await checkDomainAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    test('debería denegar acceso con API Key no autorizada', async () => {
      req.apiKey = 'test-api-key';
      const mockDomain = {
        _id: 'mock-domain-id',
        clientId: 'mock-client-id',
        domain: 'test.com',
        client: {
          apiKeys: [{
            key: 'test-api-key',
            domains: ['other.com']
          }]
        }
      };
      Domain.findOne.mockResolvedValue(mockDomain);

      await checkDomainAccess(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'API Key no autorizada para este dominio'
        })
      );
    });

    test('debería validar permisos de usuario no admin', async () => {
      req.user.role = 'editor';
      // Simulamos que el método canAccessDomain retorna true
      req.user.canAccessDomain.mockResolvedValue(true);
      
      const mockDomain = {
        _id: 'mock-domain-id',
        clientId: 'mock-client-id',
        domain: 'test.com',
        client: { apiKeys: [] }
      };
      Domain.findOne.mockResolvedValue(mockDomain);

      await checkDomainAccess(req, res, next);

      expect(req.user.canAccessDomain).toHaveBeenCalledWith('mock-domain-id');
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
  });

  describe('restrictToDomainOwner', () => {
    test('debería permitir acceso al propietario del dominio', async () => {
      const mockDomain = {
        _id: 'mock-domain-id',
        clientId: 'mock-client-id',
        toString: () => 'mock-client-id'
      };
      Domain.findById.mockResolvedValue(mockDomain);

      await restrictToDomainOwner(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
      expect(req.domain).toBe(mockDomain);
    });
  });

  describe('checkDomainLimit', () => {
    test('debería permitir crear dominio si no se ha alcanzado el límite', async () => {
      const mockClient = {
        checkSubscriptionLimits: jest.fn().mockResolvedValue({ canAddMoreDomains: true })
      };
      Client.findById.mockResolvedValue(mockClient);
    
      console.log(await mockClient.checkSubscriptionLimits()); // Ver qué devuelve realmente
    
      await checkDomainLimit(req, res, next);
    
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
    

    test('debería denegar si se alcanzó el límite de dominios', async () => {
      // Definimos un mockClient con checkSubscriptionLimits que resuelve en canAddMoreDomains: false
      const mockClient = {
        checkSubscriptionLimits: jest.fn().mockResolvedValue({ canAddMoreDomains: false })
      };
      Client.findById.mockResolvedValue(mockClient);

      await checkDomainLimit(req, res, next);

      // Según la implementación actual, ocurre un error en el bloque catch y se llama a next con un error
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Has alcanzado el límite de dominios para tu suscripción'
        })
      );
      
    });
  });
});
