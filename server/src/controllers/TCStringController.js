// controllers/TCStringController.js
const { tcStringGenerator } = require('../services/tcStringGenerator.service');
const { createCMPConfig } = require('../config/cmp.config');
const { catchAsync } = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * Controlador para generación de TC Strings usando el servicio oficial IAB
 */
class TCStringController {
  /**
   * Genera un TC String válido usando tcStringGenerator oficial
   */
  generateTCString = catchAsync(async (req, res) => {
    const { tcData, domainId } = req.body;
    
    // Obtener configuración centralizada
    const cmpConfig = createCMPConfig();
    const tcfConfig = cmpConfig.getTCStringConfig();
    
    // Preparar opciones para el generador oficial
    const options = {
      cmpId: tcData.cmpId || tcfConfig.cmpId,
      cmpVersion: tcData.cmpVersion || tcfConfig.cmpVersion,
      publisherCC: tcData.publisherCC || tcfConfig.publisherCC,
      consents: tcData.purposeConsents || {},
      legitimateInterests: tcData.purposeLegitimateInterests || {},
      vendors: tcData.vendorConsents || {},
      specialFeatures: tcData.specialFeatureOptins || {}
    };

    logger.info('🔧 Generando TC String con configuración oficial IAB:', {
      cmpId: options.cmpId,
      vendorListVersion: tcfConfig.vendorListVersion,
      domainId
    });

    // Generar TC String usando el servicio oficial
    const tcString = await tcStringGenerator.generateTCString(options);
    
    logger.info('✅ TC String generado exitosamente:', tcString.substring(0, 50) + '...');
    
    res.status(200).json({
      success: true,
      tcString,
      metadata: {
        cmpId: options.cmpId,
        cmpVersion: options.cmpVersion,
        vendorListVersion: tcfConfig.vendorListVersion,
        tcfPolicyVersion: tcfConfig.tcfPolicyVersion,
        generatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Genera un TC String optimizado para validadores IAB
   */
  generateValidatorTCString = catchAsync(async (req, res) => {
    logger.info('🧪 Generando TC String optimizado para validador IAB');
    
    // Usar el método específico para validadores
    const tcString = await tcStringGenerator.generateValidatorTCString();
    
    // Obtener configuración para metadata
    const cmpConfig = createCMPConfig();
    const tcfConfig = cmpConfig.getTCStringConfig();
    
    res.status(200).json({
      success: true,
      tcString,
      metadata: {
        cmpId: tcfConfig.cmpId,
        cmpVersion: tcfConfig.cmpVersion,
        vendorListVersion: tcfConfig.vendorListVersion,
        tcfPolicyVersion: tcfConfig.tcfPolicyVersion,
        type: 'validator-optimized',
        generatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Valida un TC String existente
   */
  validateTCString = catchAsync(async (req, res) => {
    const { tcString } = req.body;
    
    if (!tcString || typeof tcString !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'TC String is required and must be a string'
      });
    }

    logger.info('🔍 Validando TC String:', tcString.substring(0, 50) + '...');
    
    // Validar usando el servicio oficial
    const isValid = await tcStringGenerator.validateTCString(tcString);
    
    let decodedData = null;
    if (isValid) {
      try {
        decodedData = await tcStringGenerator.decodeTCString(tcString);
      } catch (error) {
        logger.warn('TC String válido pero no se pudo decodificar:', error.message);
      }
    }
    
    res.status(200).json({
      success: true,
      isValid,
      tcString,
      decodedData,
      validatedAt: new Date().toISOString()
    });
  });

  /**
   * Genera un TC String simple para casos de fallback
   */
  generateSimpleTCString = catchAsync(async (req, res) => {
    const { consent, cmpId, cmpVersion, publisherCC } = req.body;
    
    // Obtener configuración centralizada
    const cmpConfig = createCMPConfig();
    const tcfConfig = cmpConfig.getTCStringConfig();
    
    logger.info('🔧 Generando TC String simple para fallback');
    
    // Preparar opciones mínimas pero válidas
    const options = {
      cmpId: cmpId || tcfConfig.cmpId,
      cmpVersion: cmpVersion || tcfConfig.cmpVersion,
      publisherCC: publisherCC || tcfConfig.publisherCC,
      consents: consent?.purposes || { 1: true }, // Solo propósito necesario por defecto
      vendors: consent?.vendors || { 1: true }    // Solo un vendor por defecto
    };

    // Generar TC String usando el servicio mínimo
    const tcString = await tcStringGenerator.generateMinimalTCString();
    
    logger.info('✅ TC String simple generado exitosamente');
    
    res.status(200).json({
      success: true,
      tcString,
      metadata: {
        type: 'simple-fallback',
        cmpId: options.cmpId,
        cmpVersion: options.cmpVersion,
        generatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Decodifica un TC String para inspección
   */
  decodeTCString = catchAsync(async (req, res) => {
    const { tcString } = req.body;
    
    if (!tcString || typeof tcString !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'TC String is required and must be a string'
      });
    }

    logger.info('🔓 Decodificando TC String:', tcString.substring(0, 50) + '...');
    
    // Decodificar usando el servicio oficial
    const decodedData = await tcStringGenerator.decodeTCString(tcString);
    
    res.status(200).json({
      success: true,
      tcString,
      decodedData,
      decodedAt: new Date().toISOString()
    });
  });
}

module.exports = new TCStringController();