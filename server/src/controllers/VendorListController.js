// controllers/VendorListController.js

const VendorList = require('../models/VendorList');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { fetchGlobalVendorList } = require('../services/iab.service');
const cacheVendorList = require('../services/cache.service');
const IABService = require('../services/iab.service');

class VendorListController {
  // Obtener última versión de la GVL
  getLatestVendorList = catchAsync(async (req, res) => {
    const { language = 'en' } = req.query;

    // Intentar obtener de caché primero
    let vendorList = await VendorList.getLatest();

    // Si no existe o está desactualizada, actualizar
    if (!vendorList || vendorList.isOutdated()) {
      vendorList = await this._updateVendorList();
    }

    // Obtener traducciones si es necesario
    if (language !== 'en') {
      vendorList = await this._getTranslatedVendorList(vendorList, language);
    }

    res.status(200).json({
      status: 'success',
      data: { 
        vendorList,
        timestamp: new Date(),
        language
      }
    });
  });

  // Obtener versión específica de la GVL
  getVendorListVersion = catchAsync(async (req, res) => {
    const { version } = req.params;
    const { language = 'en' } = req.query;

    const vendorList = await VendorList.findOne({ version: parseInt(version) });

    if (!vendorList) {
      throw new AppError('Vendor list version not found', 404);
    }

    // Obtener traducciones si es necesario
    let translatedList = vendorList;
    if (language !== 'en') {
      translatedList = await this._getTranslatedVendorList(vendorList, language);
    }

    res.status(200).json({
      status: 'success',
      data: { 
        vendorList: translatedList,
        language
      }
    });
  });

  // Forzar actualización de la GVL
  forceUpdate = catchAsync(async (req, res) => {
    const vendorList = await this._updateVendorList();

    res.status(200).json({
      status: 'success',
      message: 'Vendor list updated successfully',
      data: { vendorList }
    });
  });

  // Obtener cambios entre versiones
  getVersionChanges = catchAsync(async (req, res) => {
    const { oldVersion, newVersion } = req.query;

    const changes = await VendorList.getVersionDiff(
      parseInt(oldVersion),
      parseInt(newVersion)
    );

    if (!changes) {
      throw new AppError('Unable to compare versions', 400);
    }

    res.status(200).json({
      status: 'success',
      data: { changes }
    });
  });

  // Obtener información de vendor específico
  getVendorInfo = catchAsync(async (req, res) => {
    const { vendorId } = req.params;
    const { language = 'en' } = req.query;

    const vendorList = await VendorList.getLatest();
    if (!vendorList) {
      throw new AppError('Vendor list not available', 500);
    }

    const vendor = vendorList.vendors.find(v => v.id === parseInt(vendorId));
    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    // Obtener traducciones si es necesario
    let translatedVendor = vendor;
    if (language !== 'en') {
      translatedVendor = await this._getTranslatedVendor(vendor, language);
    }

    res.status(200).json({
      status: 'success',
      data: { vendor: translatedVendor }
    });
  });

  // Buscar vendors
  searchVendors = catchAsync(async (req, res) => {
    const { query, category, features } = req.query;
    const vendorList = await VendorList.getLatest();

    if (!vendorList) {
      throw new AppError('Vendor list not available', 500);
    }

    let vendors = vendorList.vendors;

    // Aplicar filtros
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      vendors = vendors.filter(v => 
        searchRegex.test(v.name) || 
        searchRegex.test(v.policyUrl)
      );
    }

    if (category) {
      vendors = vendors.filter(v => 
        v.purposes.includes(parseInt(category)) ||
        v.legIntPurposes.includes(parseInt(category))
      );
    }

    if (features) {
      const requiredFeatures = features.split(',').map(Number);
      vendors = vendors.filter(v => 
        requiredFeatures.every(f => v.features.includes(f))
      );
    }

    res.status(200).json({
      status: 'success',
      data: { 
        vendors,
        total: vendors.length
      }
    });
  });

  // Obtener estadísticas de vendors
  getVendorStats = catchAsync(async (req, res) => {
    const vendorList = await VendorList.getLatest();

    if (!vendorList) {
      throw new AppError('Vendor list not available', 500);
    }

    const stats = {
      totalVendors: vendorList.vendors.length,
      byPurpose: this._getVendorsByPurpose(vendorList),
      byFeature: this._getVendorsByFeature(vendorList),
      topVendors: this._getTopVendors(vendorList)
    };

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  });

  // Métodos privados

  async _updateVendorList() {
    // Obtener nueva lista de IAB
    const gvlData = await fetchGlobalVendorList();
    
    // Guardar en base de datos
    const vendorList = await VendorList.updateFromGVL(gvlData);
    
    // Actualizar caché usando el método setVendorList
    await cacheVendorList.setVendorList(vendorList);

    return vendorList;
  }

  async _getTranslatedVendorList(vendorList, language) {
    // Implementar traducción de la lista
    return vendorList;
  }

  async _getTranslatedVendor(vendor, language) {
    // Implementar traducción de vendor específico
    return vendor;
  }

  _getVendorsByPurpose(vendorList) {
    const stats = {};
    vendorList.purposes.forEach(purpose => {
      stats[purpose.id] = {
        name: purpose.name,
        vendors: vendorList.vendors.filter(v => 
          v.purposes.includes(purpose.id) ||
          v.legIntPurposes.includes(purpose.id)
        ).length
      };
    });
    return stats;
  }

  _getVendorsByFeature(vendorList) {
    const stats = {};
    vendorList.features.forEach(feature => {
      stats[feature.id] = {
        name: feature.name,
        vendors: vendorList.vendors.filter(v => 
          v.features.includes(feature.id)
        ).length
      };
    });
    return stats;
  }

  _getTopVendors(vendorList, limit = 10) {
    return vendorList.vendors
      .map(v => ({
        id: v.id,
        name: v.name,
        purposeCount: v.purposes.length + v.legIntPurposes.length,
        featureCount: v.features.length
      }))
      .sort((a, b) => b.purposeCount - a.purposeCount)
      .slice(0, limit);
  }

  // COMPLIANCE POINT 7: Método para debug de datos GVL v3
  debugGVLData = catchAsync(async (req, res) => {
    const iabService = new IABService();
    const gvlData = await iabService.fetchCurrentGVLData();
    
    res.status(200).json({
      status: 'success',
      message: 'GVL data logged to console',
      data: {
        gvlSpecificationVersion: gvlData.gvlSpecificationVersion,
        vendorListVersion: gvlData.vendorListVersion,
        tcfPolicyVersion: gvlData.tcfPolicyVersion,
        lastUpdated: gvlData.lastUpdated
      }
    });
  });
}

module.exports = new VendorListController();
