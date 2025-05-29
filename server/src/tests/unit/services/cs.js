// tests/unit/services/consent.service.test.js

const Consent = require('../../../models/ConsentLog');
const Domain = require('../../../models/Domain');
const VendorList = require('../../../models/VendorList');
const { generateTCString, decodeTCString } = require('../../../services/tfc.service');
const { logConsentChange } = require('../../../services/audit.service');
const consentService = require('../../../services/consent.service');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../models/ConsentLog');
jest.mock('../../../models/Domain');
jest.mock('../../../models/VendorList');
jest.mock('../../../services/tfc.service');
jest.mock('../../../services/audit.service');
jest.mock('../../../utils/logger');

describe('ConsentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateConsent', () => {
    test('debería crear nuevo consentimiento', async () => {
      // Arrange
      const consentData = {
        domainId: 'domain-1',
        userId: 'user-1',
        decisions: {
          purposes: [
            { id: 1, allowed: true, legalBasis: 'consent' }
          ],
          vendors: [
            { id: 1, allowed: true }
          ]
        },
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        }
      };

      const mockVendorList = {
        version: 1,
        vendors: {
          1: { id: 1, name: 'Test Vendor' }
        },
        purposes: {
          1: { id: 1, name: 'Test Purpose' }
        }
      };

      const mockTCString = 'mock-tc-string';

      VendorList.getLatest.mockResolvedValue(mockVendorList);
      generateTCString.mockResolvedValue(mockTCString);

      const mockConsent = {
        _id: 'consent-1',
        ...consentData,
        tcString: mockTCString,
        status: 'valid'
      };

      Consent.create.mockResolvedValue(mockConsent);

      // Act
      const result = await consentService.updateConsent(consentData);

      // Assert
      expect(Consent.updateMany).toHaveBeenCalledWith(
        {
          domainId: consentData.domainId,
          userId: consentData.userId,
          status: 'valid'
        },
        {
          status: 'superseded',
          'validity.endTime': expect.any(Date)
        }
      );

      expect(Consent.create).toHaveBeenCalledWith(expect.objectContaining({
        ...consentData,
        tcString: mockTCString,
        status: 'valid',
        validity: expect.objectContaining({
          startTime: expect.any(Date)
        })
      }));

      expect(logConsentChange).toHaveBeenCalled();
      expect(result).toEqual(mockConsent);
    });

    test('debería validar decisiones contra vendor list', async () => {
      // Arrange
      const invalidConsentData = {
        decisions: {
          purposes: [
            { id: 999, allowed: true } // ID inválido
          ],
          vendors: [
            { id: 999, allowed: true } // ID inválido
          ]
        }
      };

      const mockVendorList = {
        vendors: { 1: { id: 1 } },
        purposes: { 1: { id: 1 } }
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      // Act & Assert
      await expect(consentService.updateConsent(invalidConsentData))
        .rejects.toThrow('Invalid consent decisions');
    });
  });

  describe('verifyConsent', () => {
    test('debería verificar consentimiento específico', async () => {
      // Arrange
      const verificationData = {
        domainId: 'domain-1',
        userId: 'user-1',
        purposes: [1, 2],
        vendors: [1]
      };

      const mockConsent = {
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

      Consent.findOne.mockResolvedValue(mockConsent);

      // Act
      const result = await consentService.verifyConsent(verificationData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        hasConsent: true,
        details: expect.any(Object)
      }));
    });

    test('debería retornar falso cuando no hay consentimiento válido', async () => {
      // Arrange
      Consent.findOne.mockResolvedValue(null);

      // Act
      const result = await consentService.verifyConsent({
        domainId: 'domain-1',
        userId: 'user-1'
      });

      // Assert
      expect(result).toEqual({
        hasConsent: false,
        reason: 'No valid consent found'
      });
    });
  });

  describe('getConsentHistory', () => {
    test('debería obtener historial de consentimiento', async () => {
      // Arrange
      const queryParams = {
        domainId: 'domain-1',
        userId: 'user-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockHistory = [
        {
          _id: 'consent-1',
          status: 'superseded',
          createdAt: new Date('2024-01-15')
        },
        {
          _id: 'consent-2',
          status: 'valid',
          createdAt: new Date('2024-01-20')
        }
      ];

      Consent.find.mockResolvedValue(mockHistory);

      // Act
      const result = await consentService.getConsentHistory(queryParams);

      // Assert
      expect(Consent.find).toHaveBeenCalledWith(expect.objectContaining({
        domainId: queryParams.domainId,
        userId: queryParams.userId,
        createdAt: {
          $gte: queryParams.startDate,
          $lte: queryParams.endDate
        }
      }));

      expect(result).toEqual({ history: mockHistory });
    });
  });

  describe('decodeTCString', () => {
    test('debería decodificar TCString', async () => {
      // Arrange
      const tcString = 'mock-tc-string';
      const mockDecodedData = {
        version: 2,
        created: new Date(),
        lastUpdated: new Date(),
        cmpId: 28,
        purposes: { 1: true },
        vendors: { 1: true }
      };

      decodeTCString.mockResolvedValue(mockDecodedData);

      // Act
      const result = await consentService.decodeTCString(tcString);

      // Assert
      expect(decodeTCString).toHaveBeenCalledWith(tcString);
      expect(result).toEqual(mockDecodedData);
    });

    test('debería manejar error en decodificación', async () => {
      // Arrange
      const error = new Error('Invalid TC string');
      decodeTCString.mockRejectedValue(error);

      // Act & Assert
      await expect(consentService.decodeTCString('invalid'))
        .rejects.toThrow('Error decoding TC string');

      expect(logger.error).toHaveBeenCalledWith(
        'Error decoding TC string:',
        error
      );
    });
  });

  describe('revokeConsent', () => {
    test('debería revocar consentimiento existente', async () => {
      // Arrange
      const revokeData = {
        domainId: 'domain-1',
        userId: 'user-1'
      };

      const mockConsent = {
        _id: 'consent-1',
        status: 'valid',
        save: jest.fn()
      };

      Consent.findOne.mockResolvedValue(mockConsent);

      // Act
      await consentService.revokeConsent(revokeData);

      // Assert
      expect(mockConsent.status).toBe('revoked');
      expect(mockConsent.validity.endTime).toBeInstanceOf(Date);
      expect(mockConsent.save).toHaveBeenCalled();
      expect(logConsentChange).toHaveBeenCalledWith({
        ...revokeData,
        action: 'revoke',
        oldConsent: mockConsent,
        newConsent: null
      });
    });

    test('debería manejar consentimiento no encontrado', async () => {
      // Arrange
      Consent.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(consentService.revokeConsent({
        domainId: 'domain-1',
        userId: 'user-1'
      })).rejects.toThrow('No valid consent found');
    });
  });
});