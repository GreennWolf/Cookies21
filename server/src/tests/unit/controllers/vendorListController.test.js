// tests/unit/controllers/vendorListController.test.js

const VendorListController = require('../../../controllers/VendorListController');
const VendorList = require('../../../models/VendorList');
const { fetchGlobalVendorList } = require('../../../services/iab.service');
// Importamos el objeto de cache completo (la instancia) en lugar de destructurarlo.
const cacheVendorList = require('../../../services/cache.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mocks de los módulos
jest.mock('../../../models/VendorList');
jest.mock('../../../services/iab.service');
// Para el servicio de cache, proveemos un mock con los métodos que usaremos:
jest.mock('../../../services/cache.service', () => ({
  setVendorList: jest.fn(),
  getVendorList: jest.fn()
}));

describe('VendorListController', () => {
  let req;
  let res;
  let next;

  // Aseguramos que los métodos estáticos de VendorList estén mockeados
  VendorList.getLatest = jest.fn();
  VendorList.findOne = jest.fn();
  VendorList.getVersionDiff = jest.fn();

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      clientId: 'mock-client-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestVendorList', () => {
    test('debería obtener la última lista de vendors desde caché', async () => {
      const mockVendorList = {
        version: 100,
        vendors: [{ id: 1, name: 'Vendor 1', purposes: [1], features: [1], legIntPurposes: [] }],
        lastUpdated: new Date(),
        isOutdated: jest.fn().mockReturnValue(false)
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      await VendorListController.getLatestVendorList(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          vendorList: mockVendorList,
          timestamp: expect.any(Date),
          language: 'en'
        }
      });
    });

    test('debería actualizar la lista si está desactualizada', async () => {
      // Simulamos que la lista obtenida está desactualizada.
      const outdatedList = {
        isOutdated: jest.fn().mockReturnValue(true)
      };
      const newVendorList = {
        version: 101,
        vendors: [{ id: 1, name: 'Updated Vendor', purposes: [1], features: [1], legIntPurposes: [] }]
      };

      VendorList.getLatest.mockResolvedValue(outdatedList);
      // Mocks para la actualización
      VendorList.updateFromGVL = jest.fn().mockResolvedValue(newVendorList);
      fetchGlobalVendorList.mockResolvedValue(newVendorList);
      // Se mockea el método setVendorList del objeto cacheVendorList
      cacheVendorList.setVendorList.mockResolvedValue(newVendorList);

      await VendorListController.getLatestVendorList(req, res, next);

      expect(fetchGlobalVendorList).toHaveBeenCalled();
      expect(VendorList.updateFromGVL).toHaveBeenCalledWith(newVendorList);
      expect(cacheVendorList.setVendorList).toHaveBeenCalledWith(newVendorList);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          vendorList: newVendorList,
          timestamp: expect.any(Date),
          language: 'en'
        }
      });
    });
  });

  describe('getVendorListVersion', () => {
    test('debería obtener una versión específica de la lista', async () => {
      const version = '100';
      req.params.version = version;
      req.query.language = 'en';

      const mockVendorList = {
        version: parseInt(version),
        vendors: [{ id: 1, name: 'Vendor 1', purposes: [1], features: [1], legIntPurposes: [] }]
      };

      VendorList.findOne.mockResolvedValue(mockVendorList);

      await VendorListController.getVendorListVersion(req, res, next);

      expect(VendorList.findOne).toHaveBeenCalledWith({ version: 100 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          vendorList: mockVendorList,
          language: 'en'
        }
      });
    });

    test('debería manejar versión no encontrada', async () => {
      req.params.version = '999';
      VendorList.findOne.mockResolvedValue(null);

      await VendorListController.getVendorListVersion(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Vendor list version not found'
        })
      );
    });
  });

  describe('forceUpdate', () => {
    test('debería forzar una actualización de la lista', async () => {
      const newVendorList = {
        version: 102,
        vendors: [{ id: 1, name: 'New Vendor', purposes: [1], features: [1], legIntPurposes: [] }]
      };

      fetchGlobalVendorList.mockResolvedValue(newVendorList);
      VendorList.updateFromGVL = jest.fn().mockResolvedValue(newVendorList);
      // Se mockea el método setVendorList
      cacheVendorList.setVendorList.mockResolvedValue(newVendorList);

      await VendorListController.forceUpdate(req, res, next);

      expect(fetchGlobalVendorList).toHaveBeenCalled();
      expect(VendorList.updateFromGVL).toHaveBeenCalledWith(newVendorList);
      expect(cacheVendorList.setVendorList).toHaveBeenCalledWith(newVendorList);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getVersionChanges', () => {
    test('debería obtener cambios entre versiones', async () => {
      req.query = {
        oldVersion: '100',
        newVersion: '101'
      };

      const mockChanges = {
        vendors: {
          added: [{ id: 2, name: 'New Vendor' }],
          removed: [{ id: 1, name: 'Old Vendor' }],
          modified: []
        }
      };

      VendorList.getVersionDiff.mockResolvedValue(mockChanges);

      await VendorListController.getVersionChanges(req, res, next);

      expect(VendorList.getVersionDiff).toHaveBeenCalledWith(100, 101);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { changes: mockChanges }
      });
    });
  });

  describe('searchVendors', () => {
    test('debería buscar vendors con filtros', async () => {
      req.query = {
        query: 'google',
        category: '1',
        features: '1,2'
      };

      const mockVendorList = {
        vendors: [
          { id: 1, name: 'Google', purposes: [1], features: [1, 2], legIntPurposes: [] }
        ]
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      await VendorListController.searchVendors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          vendors: expect.any(Array),
          total: expect.any(Number)
        }
      });
    });
  });

  describe('getVendorStats', () => {
    test('debería obtener estadísticas de vendors', async () => {
      const mockVendorList = {
        vendors: [
          { id: 1, purposes: [1, 2], features: [1], legIntPurposes: [] },
          { id: 2, purposes: [1], features: [2], legIntPurposes: [] }
        ],
        purposes: [
          { id: 1, name: 'Purpose 1' },
          { id: 2, name: 'Purpose 2' }
        ],
        features: [
          { id: 1, name: 'Feature 1' },
          { id: 2, name: 'Feature 2' }
        ]
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      await VendorListController.getVendorStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          stats: expect.objectContaining({
            totalVendors: expect.any(Number),
            byPurpose: expect.any(Object),
            byFeature: expect.any(Object),
            topVendors: expect.any(Array)
          })
        }
      });
    });
  });

  describe('getVendorInfo', () => {
    test('debería obtener información de un vendor específico', async () => {
      const vendorId = '1';
      req.params.vendorId = vendorId;
      req.query.language = 'en';

      const mockVendorList = {
        vendors: [
          {
            id: 1,
            name: 'Test Vendor',
            purposes: [1, 2],
            features: [1],
            legIntPurposes: []
          }
        ]
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      await VendorListController.getVendorInfo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          vendor: expect.objectContaining({
            id: 1,
            name: 'Test Vendor'
          })
        }
      });
    });

    test('debería manejar vendor no encontrado', async () => {
      req.params.vendorId = '999';
      
      const mockVendorList = {
        vendors: []
      };

      VendorList.getLatest.mockResolvedValue(mockVendorList);

      await VendorListController.getVendorInfo(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Vendor not found'
        })
      );
    });
  });
});
