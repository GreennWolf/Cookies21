// services/tcStringGenerator.service.js
// Generador de TC Strings válidos usando herramientas oficiales IAB TCF

// Polyfill para XMLHttpRequest en Node.js
global.XMLHttpRequest = require('xhr2');

const { TCModel, TCString, GVL } = require('@iabtcf/core');
const logger = require('../utils/logger');

/**
 * Servicio para generar TC Strings válidos usando la biblioteca oficial IAB
 */
class TCStringGeneratorService {
  constructor() {
    this.gvl = null;
    this.initialized = false;
  }

  /**
   * Inicializa el Global Vendor List
   */
  async initialize() {
    try {
      if (this.initialized) {
        return;
      }

      // Crear una GVL mínima para generar TC Strings válidos
      this.gvl = this.createMinimalGVL();
      
      this.initialized = true;
      logger.info('✅ TCStringGenerator inicializado con GVL versión:', this.gvl.vendorListVersion);
    } catch (error) {
      logger.error('❌ Error inicializando TCStringGenerator:', error);
      throw error;
    }
  }

  /**
   * Crea una GVL mínima con vendors básicos para testing
   * @returns {Object} GVL mínima
   */
  createMinimalGVL() {
    // Crear estructura GVL mínima pero válida
    const gvl = {
      vendorListVersion: 3,
      tcfPolicyVersion: 4,
      lastUpdated: new Date().toISOString(),
      purposes: {
        1: { id: 1, name: "Store and/or access information on a device" },
        2: { id: 2, name: "Select basic ads" },
        3: { id: 3, name: "Create a personalized ads profile" },
        4: { id: 4, name: "Select personalized ads" },
        5: { id: 5, name: "Create a personalized content profile" },
        6: { id: 6, name: "Select personalized content" },
        7: { id: 7, name: "Measure ad performance" },
        8: { id: 8, name: "Measure content performance" },
        9: { id: 9, name: "Apply market research to generate audience insights" },
        10: { id: 10, name: "Develop and improve products" }
      },
      specialFeatures: {
        1: { id: 1, name: "Use precise geolocation data" },
        2: { id: 2, name: "Actively scan device characteristics for identification" }
      },
      vendors: {
        1: { 
          id: 1, 
          name: "Google", 
          purposes: [1, 2, 3, 4, 7, 8, 9, 10],
          legIntPurposes: [2, 7, 8, 9, 10],
          policyUrl: "https://policies.google.com/privacy"
        },
        25: { 
          id: 25, 
          name: "Yahoo", 
          purposes: [1, 2, 3, 4, 7, 8, 9, 10],
          legIntPurposes: [2, 7, 8, 9, 10],
          policyUrl: "https://legal.yahoo.com/xw/en/yahoo/privacy/topic/adinfo/index.html"
        },
        28: { 
          id: 28, 
          name: "StackAdapt", 
          purposes: [1, 2, 3, 4, 7],
          legIntPurposes: [2, 7],
          policyUrl: "https://www.stackadapt.com/privacy"
        },
        52: { 
          id: 52, 
          name: "Magnite (Rubicon Project)", 
          purposes: [1, 2, 3, 4, 7, 8, 9, 10],
          legIntPurposes: [2, 7, 8, 9, 10],
          policyUrl: "https://www.magnite.com/legal/advertising-technology-privacy-policy/"
        },
        755: { 
          id: 755, 
          name: "Google Advertising Products", 
          purposes: [1, 2, 3, 4, 7, 8, 9, 10],
          legIntPurposes: [2, 7, 8, 9, 10],
          policyUrl: "https://policies.google.com/privacy"
        },
        793: { 
          id: 793, 
          name: "Amazon", 
          purposes: [1, 2, 3, 4, 7, 8, 9, 10],
          legIntPurposes: [2, 7, 8, 9, 10],
          policyUrl: "https://www.amazon.com/gp/help/customer/display.html?nodeId=468496"
        }
      }
    };

    return gvl;
  }

  /**
   * Genera un TC String válido basado en consentimientos
   * @param {Object} options - Opciones de configuración
   * @param {Object} options.consents - Consentimientos por propósito {purposeId: boolean}
   * @param {Object} options.vendors - Consentimientos por vendor {vendorId: boolean}
   * @param {Object} options.specialFeatures - Características especiales {featureId: boolean}
   * @param {Object} options.publisherConsents - Consentimientos del publisher
   * @param {string} options.publisherCC - Código de país del publisher (ej: 'ES')
   * @param {number} options.cmpId - ID del CMP
   * @param {number} options.cmpVersion - Versión del CMP
   * @returns {string} TC String válido
   */
  async generateTCString(options = {}) {
    try {
      await this.initialize();

      // Crear nuevo modelo TC
      const tcModel = new TCModel(this.gvl);
      
      // Configurar información básica
      tcModel.cmpId = options.cmpId || 300; // ID temporal para testing
      tcModel.cmpVersion = options.cmpVersion || 1;
      tcModel.publisherCC = options.publisherCC || 'ES';
      tcModel.isServiceSpecific = true;
      tcModel.useNonStandardStacks = false;
      tcModel.purposeOneTreatment = false;

      // Configurar consentimientos de propósitos
      if (options.consents) {
        Object.entries(options.consents).forEach(([purposeId, consent]) => {
          const id = parseInt(purposeId, 10);
          if (id > 0 && id <= 10) { // TCF v2.2 tiene 10 propósitos estándar
            tcModel.purposeConsents.set(id, consent === true);
          }
        });
      }

      // Configurar intereses legítimos de propósitos
      if (options.legitimateInterests) {
        Object.entries(options.legitimateInterests).forEach(([purposeId, interest]) => {
          const id = parseInt(purposeId, 10);
          if (id > 1 && id <= 10) { // El propósito 1 no puede usar interés legítimo
            tcModel.purposeLegitimateInterests.set(id, interest === true);
          }
        });
      }

      // Configurar consentimientos de vendors
      if (options.vendors) {
        Object.entries(options.vendors).forEach(([vendorId, consent]) => {
          const id = parseInt(vendorId, 10);
          if (id > 0 && this.gvl.vendors[id]) { // Solo vendors válidos en GVL
            tcModel.vendorConsents.set(id, consent === true);
            
            // Si el vendor también usa interés legítimo, configurarlo
            const vendor = this.gvl.vendors[id];
            if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
              tcModel.vendorLegitimateInterests.set(id, consent === true);
            }
          }
        });
      }

      // Configurar características especiales
      if (options.specialFeatures) {
        Object.entries(options.specialFeatures).forEach(([featureId, consent]) => {
          const id = parseInt(featureId, 10);
          if (id > 0 && id <= 2) { // TCF v2.2 tiene 2 características especiales
            tcModel.specialFeatureOptins.set(id, consent === true);
          }
        });
      }

      // Configurar consentimientos del publisher
      if (options.publisherConsents) {
        Object.entries(options.publisherConsents).forEach(([purposeId, consent]) => {
          const id = parseInt(purposeId, 10);
          if (id > 0 && id <= 24) { // Hasta 24 propósitos personalizados del publisher
            tcModel.publisherConsents.set(id, consent === true);
          }
        });
      }

      // Generar el TC String
      const tcString = TCString.encode(tcModel);
      
      logger.info('✅ TC String generado exitosamente');
      logger.debug('TC String:', tcString);
      
      return tcString;

    } catch (error) {
      logger.error('❌ Error generando TC String:', error);
      throw error;
    }
  }

  /**
   * Genera un TC String para el validador con configuración completa
   * @returns {string} TC String válido para testing
   */
  async generateValidatorTCString() {
    const validatorOptions = {
      cmpId: 300,
      cmpVersion: 1,
      publisherCC: 'ES',
      consents: {
        1: true, 2: true, 3: true, 4: true, 5: true,
        6: true, 7: true, 8: true, 9: true, 10: true
      },
      legitimateInterests: {
        2: true, 3: true, 4: true, 5: true, 6: true,
        7: true, 8: true, 9: true, 10: true
      },
      vendors: {
        // Vendors críticos para testing
        1: true, 2: true, 3: true, 25: true, 28: true,
        52: true, 91: true, 128: true, 755: true, 793: true
      },
      specialFeatures: {
        1: true, 2: true
      },
      publisherConsents: {
        1: true, 2: true, 3: true, 4: true, 5: true
      }
    };

    return await this.generateTCString(validatorOptions);
  }

  /**
   * Genera un TC String mínimo pero válido
   * @returns {string} TC String básico válido
   */
  async generateMinimalTCString() {
    const minimalOptions = {
      cmpId: 300,
      cmpVersion: 1,
      publisherCC: 'ES',
      consents: {
        1: true // Solo consentimiento para propósito esencial
      },
      vendors: {
        1: true // Solo un vendor básico
      }
    };

    return await this.generateTCString(minimalOptions);
  }

  /**
   * Decodifica un TC String para verificar su contenido
   * @param {string} tcString - TC String a decodificar
   * @returns {Object} Contenido decodificado del TC String
   */
  async decodeTCString(tcString) {
    try {
      await this.initialize();
      
      const tcModel = TCString.decode(tcString, this.gvl);
      
      return {
        cmpId: tcModel.cmpId,
        cmpVersion: tcModel.cmpVersion,
        publisherCC: tcModel.publisherCC,
        vendorListVersion: tcModel.vendorListVersion,
        purposeConsents: tcModel.purposeConsents.toObject(),
        purposeLegitimateInterests: tcModel.purposeLegitimateInterests.toObject(),
        vendorConsents: tcModel.vendorConsents.toObject(),
        vendorLegitimateInterests: tcModel.vendorLegitimateInterests.toObject(),
        specialFeatureOptins: tcModel.specialFeatureOptins.toObject(),
        publisherConsents: tcModel.publisherConsents.toObject()
      };
    } catch (error) {
      logger.error('❌ Error decodificando TC String:', error);
      throw error;
    }
  }

  /**
   * Valida si un TC String es correcto
   * @param {string} tcString - TC String a validar
   * @returns {boolean} True si es válido
   */
  async validateTCString(tcString) {
    try {
      await this.decodeTCString(tcString);
      return true;
    } catch (error) {
      logger.warn('TC String inválido:', error.message);
      return false;
    }
  }

  /**
   * Obtiene la lista de vendors disponibles
   * @returns {Object} Lista de vendors del GVL
   */
  async getAvailableVendors() {
    await this.initialize();
    return this.gvl.vendors;
  }

  /**
   * Obtiene información específica de un vendor
   * @param {number} vendorId - ID del vendor
   * @returns {Object|null} Información del vendor o null si no existe
   */
  async getVendorInfo(vendorId) {
    await this.initialize();
    return this.gvl.vendors[vendorId] || null;
  }
}

// Crear instancia singleton
const tcStringGenerator = new TCStringGeneratorService();

module.exports = {
  TCStringGeneratorService,
  tcStringGenerator
};