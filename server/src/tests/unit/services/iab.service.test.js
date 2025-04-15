// Mocks deben declararse antes de importar cualquier módulo que los utilice
jest.mock('../../../config/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

jest.mock('../../../models/VendorList');
jest.mock('../../../utils/logger');
jest.mock('axios');

const iabService = require('../../../services/iab.service');
const VendorList = require('../../../models/VendorList');
const { cache } = require('../../../config/redis');
const logger = require('../../../utils/logger');
const axios = require('axios');
const { describe, test, expect, beforeEach } = require('@jest/globals');

describe('IABService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchGlobalVendorList', () => {
    test('debería obtener y almacenar la GVL exitosamente', async () => {
      const mockGVLData = {
        vendorListVersion: 100,
        lastUpdated: '2024-01-25T12:00:00Z',
        vendors: {
          1: { id: 1, name: 'Vendor 1' },
          2: { id: 2, name: 'Vendor 2' }
        },
        purposes: {
          1: { id: 1, name: 'Purpose 1' }
        }
      };

      // Simulamos las llamadas a axios.get para obtener la versión y la lista
      axios.get
        .mockResolvedValueOnce({ data: mockGVLData }) // para _getLatestVersion
        .mockResolvedValueOnce({ data: mockGVLData }); // para _fetchVendorList

      // Simulamos que no hay dato en cache
      cache.get.mockResolvedValue(null);
      // Simulamos que updateFromGVL se ejecuta correctamente
      VendorList.updateFromGVL.mockResolvedValue();

      const result = await iabService.fetchGlobalVendorList();

      expect(VendorList.updateFromGVL).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorListVersion: mockGVLData.vendorListVersion,
          vendors: mockGVLData.vendors
        })
      );

      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        expect.any(Number)
      );

      expect(result).toEqual(expect.objectContaining({
        vendorListVersion: mockGVLData.vendorListVersion
      }));
    });

    test('debería devolver la lista cacheada si está disponible', async () => {
      const cachedList = {
        vendorListVersion: 99,
        vendors: { 1: { id: 1, name: 'Cached Vendor' } }
      };

      cache.get.mockResolvedValue(JSON.stringify(cachedList));

      const result = await iabService.fetchGlobalVendorList();

      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedList);
    });
  });

  describe('validateIABConfig', () => {
    test('debería validar configuración IAB correctamente', async () => {
      const config = {
        cmpId: 123,
        cmpVersion: 1,
        tcfVersion: '2.2'
      };

      const mockCMPResponse = { status: 200 };
      axios.get.mockResolvedValueOnce(mockCMPResponse);
      // Para que _getLatestVersion se resuelva correctamente
      iabService._getLatestVersion = jest.fn().mockResolvedValue('2.2');

      const result = await iabService.validateIABConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.cmpId).toBe(config.cmpId);
      expect(result.tcfVersion).toBe(config.tcfVersion);
    });

    test('debería rechazar CMP ID inválido', async () => {
      const config = {
        cmpId: 999999,
        tcfVersion: '2.2'
      };

      axios.get.mockRejectedValue(new Error('CMP not found'));

      const result = await iabService.validateIABConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid CMP ID');
    });
  });

  describe('getTranslations', () => {
    test('debería obtener traducciones para un idioma', async () => {
      const languageCode = 'es';
      const mockTranslations = {
        purposes: {
          1: { name: 'Propósito 1', description: 'Descripción 1' }
        }
      };

      axios.get.mockResolvedValue({ data: mockTranslations });
      cache.get.mockResolvedValue(null);

      const result = await iabService.getTranslations(languageCode);

      expect(result).toEqual(mockTranslations);
      expect(cache.set).toHaveBeenCalled();
    });
  });

  describe('verifyVendor', () => {
    test('debería verificar un vendor válido', async () => {
      const vendorId = 1;
      const mockVendorList = {
        vendors: {
          1: {
            id: 1,
            name: 'Test Vendor',
            purposes: [1, 2],
            policyUrl: 'https://vendor.com/privacy'
          }
        }
      };

      // Simulamos que la lista de vendors se obtiene desde el caché
      cache.get.mockResolvedValue(JSON.stringify(mockVendorList));

      const result = await iabService.verifyVendor(vendorId);

      expect(result.isValid).toBe(true);
      expect(result.vendor).toEqual(mockVendorList.vendors[1]);
      expect(result.verification.hasValidPurposes).toBe(true);
    });

    test('debería rechazar vendor no encontrado', async () => {
      const vendorId = 999;
      const mockVendorList = { vendors: {} };

      cache.get.mockResolvedValue(JSON.stringify(mockVendorList));

      const result = await iabService.verifyVendor(vendorId);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Vendor not found in GVL');
    });
  });
});
