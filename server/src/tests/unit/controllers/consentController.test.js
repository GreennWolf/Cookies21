// tests/unit/controllers/consentController.test.js

const ConsentController = require('../../../controllers/ConsentController');
const Consent = require('../../../models/ConsentLog');
const Domain = require('../../../models/Domain');
const VendorList = require('../../../models/VendorList');
const { generateTCString } = require('../../../services/tfc.service');
const { logConsentChange } = require('../../../services/audit.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mocks
jest.mock('../../../models/ConsentLog');
jest.mock('../../../models/Domain');
jest.mock('../../../models/VendorList');
jest.mock('../../../services/tfc.service');
jest.mock('../../../services/audit.service');

describe('ConsentController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        domainId: 'mock-domain-id'
      },
      body: {},
      query: {},
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
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

  describe('getConsent', () => {
    test('debería obtener el consentimiento actual', async () => {
      // Arrange
      req.query.userId = 'mock-user-id';

      const mockDomain = {
        _id: req.params.domainId,
        domain: 'test.com'
      };

      const mockConsent = {
        _id: 'mock-consent-id',
        userId: req.query.userId,
        status: 'valid',
        decisions: {
          purposes: [
            { id: 1, allowed: true },
            { id: 2, allowed: false }
          ],
          vendors: [
            { id: 1, allowed: true }
          ]
        }
      };

      Domain.findById.mockResolvedValue(mockDomain);
      // Simular el encadenamiento .sort('-createdAt')
      Consent.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConsent)
      });

      // Act
      await ConsentController.getConsent(req, res, next);

      // Assert
      expect(Consent.findOne).toHaveBeenCalledWith({
        domainId: req.params.domainId,
        userId: req.query.userId,
        status: 'valid'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { consent: mockConsent }
      });
    });
  });

  describe('updateConsent', () => {
    test('debería actualizar el consentimiento exitosamente', async () => {
      // Arrange
      const consentData = {
        userId: 'mock-user-id',
        decisions: {
          purposes: [
            { id: 1, allowed: true, legalBasis: 'consent' }
          ],
          vendors: [
            { id: 1, allowed: true }
          ]
        },
        metadata: {
          language: 'en',
          deviceType: 'desktop'
        }
      };

      req.body = consentData;

      const mockDomain = {
        _id: req.params.domainId,
        domain: 'test.com'
      };

      // Configuramos el mockVendorList con los métodos getPurpose y getVendor
      const mockVendorList = {
        version: 1,
        vendors: { 1: { id: 1, name: 'Test Vendor' } },
        purposes: { 1: { id: 1, name: 'Test Purpose' } },
        getPurpose: (id) => id === 1 ? { id: 1, name: 'Test Purpose' } : undefined,
        getVendor: (id) => id === 1 ? { id: 1, name: 'Test Vendor' } : undefined
      };

      const mockTCString = 'mock-tc-string';

      Domain.findById.mockResolvedValue(mockDomain);
      VendorList.getLatest.mockResolvedValue(mockVendorList);
      generateTCString.mockResolvedValue(mockTCString);

      const mockNewConsent = {
        _id: 'mock-consent-id',
        ...consentData,
        tcString: mockTCString,
        status: 'valid'
      };

      Consent.create.mockResolvedValue(mockNewConsent);

      // Act
      await ConsentController.updateConsent(req, res, next);

      // Assert
      expect(Consent.create).toHaveBeenCalledWith(expect.objectContaining({
        domainId: req.params.domainId,
        userId: consentData.userId,
        tcString: mockTCString,
        decisions: consentData.decisions,
        metadata: expect.objectContaining({
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      }));

      expect(logConsentChange).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          consent: mockNewConsent,
          tcString: mockTCString
        }
      });
    });

    test('debería validar las decisiones contra la lista de vendors', async () => {
      // Arrange
      const invalidConsentData = {
        userId: 'mock-user-id',
        decisions: {
          purposes: [
            { id: 999, allowed: true } // Propósito inválido
          ],
          vendors: [
            { id: 999, allowed: true } // Vendor inválido
          ]
        }
      };

      req.body = invalidConsentData;

      const mockDomain = {
        _id: req.params.domainId
      };

      // Para el caso de validación, definimos un mockVendorList que NO reconoce los IDs 999.
      const mockVendorList = {
        version: 1,
        vendors: { 1: { id: 1, name: 'Test Vendor' } },
        purposes: { 1: { id: 1, name: 'Test Purpose' } },
        getPurpose: (id) => id === 1 ? { id: 1, name: 'Test Purpose' } : undefined,
        getVendor: (id) => id === 1 ? { id: 1, name: 'Test Vendor' } : undefined
      };

      Domain.findById.mockResolvedValue(mockDomain);
      VendorList.getLatest.mockResolvedValue(mockVendorList);

      // Act
      await ConsentController.updateConsent(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid consent decisions')
        })
      );
    });
  });

  describe('verifyConsent', () => {
    test('debería verificar el consentimiento específico', async () => {
      // Arrange
      req.query = {
        userId: 'mock-user-id',
        purposes: '1,2',
        vendors: '1'
      };

      const mockConsent = {
        _id: 'mock-consent-id',
        status: 'valid',
        decisions: {
          purposes: [
            { id: 1, allowed: true },
            { id: 2, allowed: true }
          ],
          vendors: [
            { id: 1, allowed: true }
          ]
        },
        verifySpecificConsent: jest.fn().mockResolvedValue({
          hasConsent: true,
          details: {
            purposes: { 1: true, 2: true },
            vendors: { 1: true }
          }
        })
      };

      // Simular encadenamiento .sort('-createdAt')
      Consent.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConsent)
      });

      // Act
      await ConsentController.verifyConsent(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          hasConsent: true,
          details: expect.any(Object)
        })
      });
    });
  });
});
