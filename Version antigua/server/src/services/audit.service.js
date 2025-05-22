// services/audit.service.js
const Audit = require('../models/Audit');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Registra una acción en la auditoría
   * @param {Object} data - Datos de la acción
   * @param {String} data.clientId - ID del cliente
   * @param {String} [data.userId] - ID del usuario (opcional)
   * @param {String} data.action - Acción realizada (create, update, delete, generate, consent)
   * @param {String} data.resourceType - Tipo de recurso (domain, template, script, etc)
   * @param {String} data.resourceId - ID del recurso
   * @param {Object} [data.metadata] - Metadatos adicionales
   * @param {Object} [data.context] - Contexto de la acción
   * @returns {Promise<Object>} - Registro de auditoría creado
   */
  async logAction(data) {
    try {
      const { 
        clientId, 
        userId, 
        action, 
        resourceType, 
        resourceId, 
        metadata = {}, 
        context = {} 
      } = data;
      
      // Valida que clientId es requerido
      if (!clientId) {
        throw new Error('clientId is required for audit logging');
      }
      
      // Valida que action es una de las permitidas
      const validActions = ['create', 'update', 'delete', 'generate', 'consent', 'view'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}. Valid actions are: ${validActions.join(', ')}`);
      }
      
      // Crea un objeto de audit
      const auditData = {
        clientId,
        action,
        resourceType,
        resourceId,
        timestamp: new Date(),
        metadata,
        context
      };
      
      // Solo incluye userId si está presente y no es 'anonymous'
      if (userId && userId !== 'anonymous') {
        // Verifica si es un ObjectId válido
        if (mongoose.Types.ObjectId.isValid(userId)) {
          auditData.userId = userId;
        } else {
          logger.warn(`Invalid userId format for audit (not an ObjectId): ${userId}`);
        }
      }
      
      // Crea el registro en la base de datos
      const audit = await Audit.create(auditData);
      
      return audit;
    } catch (error) {
      logger.error('Error logging audit action:', error);
      throw error;
    }
  }
  
  /**
   * Busca registros de auditoría
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} options - Opciones de paginación y ordenamiento
   * @returns {Promise<Object>} - Resultado de la búsqueda
   */
  async find(filters = {}, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sort = { timestamp: -1 } 
      } = options;
      
      // Calcular el skip para paginación
      const skip = (page - 1) * limit;
      
      // Realizar la búsqueda
      const audits = await Audit.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Contar el total de documentos para la paginación
      const total = await Audit.countDocuments(filters);
      
      return {
        data: audits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding audit records:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene estadísticas de auditoría
   * @param {Object} filters - Filtros para las estadísticas
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(filters = {}) {
    try {
      // Estadísticas por acción
      const actionStats = await Audit.aggregate([
        { $match: filters },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Estadísticas por tipo de recurso
      const resourceTypeStats = await Audit.aggregate([
        { $match: filters },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Estadísticas por día
      const timeStats = await Audit.aggregate([
        { $match: filters },
        { 
          $group: { 
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      return {
        actions: actionStats,
        resourceTypes: resourceTypeStats,
        timeline: timeStats
      };
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw error;
    }
  }

  /**
 * Registra un cambio de consentimiento
 * @param {Object} data - Datos del cambio
 * @param {String} data.domainId - ID del dominio
 * @param {String} data.userId - ID del usuario
 * @param {String} data.action - Acción realizada (grant, revoke, update, etc)
 * @param {Object} data.oldConsent - Consentimiento anterior (puede ser null)
 * @param {Object} data.newConsent - Nuevo consentimiento (puede ser null)
 * @returns {Promise<Object>} - Registro de auditoría creado
 */
async logConsentChange(data) {
  try {
    const { domainId, userId, action, oldConsent, newConsent } = data;
    
    // Buscar el clientId asociado al dominio
    const Domain = require('../models/Domain');
    let clientId;
    
    try {
      const domain = await Domain.findById(domainId);
      if (domain) {
        clientId = domain.clientId;
      } else {
        logger.warn(`Domain not found for consent audit: ${domainId}`);
        return null; // No podemos registrar sin clientId
      }
    } catch (error) {
      logger.error(`Error finding domain for consent audit: ${error.message}`);
      return null;
    }
    
    // Construir los metadatos para el registro de auditoría
    const metadata = {
      consentAction: action,
      userId
    };
    
    // Añadir información de los cambios si tenemos ambos consentimientos
    if (oldConsent && newConsent) {
      metadata.changes = this._getConsentChanges(oldConsent, newConsent);
    }
    
    // Registrar la acción usando el método general
    return await this.logAction({
      clientId,
      action: 'consent', // Categoría general
      resourceType: 'consent',
      resourceId: newConsent ? newConsent._id : (oldConsent ? oldConsent._id : domainId),
      metadata,
      context: {
        domainId,
        userId
      }
    });
  } catch (error) {
    logger.error('Error logging consent change:', error);
    // No lanzar el error, simplemente log
    return null;
  }
}

/**
 * Compara dos consentimientos y devuelve los cambios
 * @private
 * @param {Object} oldConsent - Consentimiento anterior
 * @param {Object} newConsent - Nuevo consentimiento
 * @returns {Object} - Objeto con los cambios
 */
_getConsentChanges(oldConsent, newConsent) {
  const changes = {
    purposes: [],
    vendors: []
  };
  
  // Si no tenemos alguno de los consentimientos, devolvemos vacío
  if (!oldConsent || !newConsent) {
    return changes;
  }
  
  // Comparar propósitos
  if (oldConsent.decisions && newConsent.decisions) {
    const oldPurposes = oldConsent.decisions.purposes || [];
    const newPurposes = newConsent.decisions.purposes || [];
    
    // Crear un mapa para facilitar la comparación
    const oldPurposeMap = {};
    oldPurposes.forEach(p => {
      if (p && typeof p.id !== 'undefined') {
        oldPurposeMap[p.id] = p.allowed;
      }
    });
    
    newPurposes.forEach(p => {
      if (p && typeof p.id !== 'undefined') {
        const oldValue = oldPurposeMap[p.id];
        // Solo registrar si hay un cambio
        if (typeof oldValue !== 'undefined' && oldValue !== p.allowed) {
          changes.purposes.push({
            id: p.id,
            name: p.name || `Purpose ${p.id}`,
            from: oldValue,
            to: p.allowed
          });
        }
      }
    });
  }
  
  // Comparar vendors (lógica similar a propósitos)
  if (oldConsent.decisions && newConsent.decisions) {
    const oldVendors = oldConsent.decisions.vendors || [];
    const newVendors = newConsent.decisions.vendors || [];
    
    const oldVendorMap = {};
    oldVendors.forEach(v => {
      if (v && typeof v.id !== 'undefined') {
        oldVendorMap[v.id] = v.allowed;
      }
    });
    
    newVendors.forEach(v => {
      if (v && typeof v.id !== 'undefined') {
        const oldValue = oldVendorMap[v.id];
        if (typeof oldValue !== 'undefined' && oldValue !== v.allowed) {
          changes.vendors.push({
            id: v.id,
            name: v.name || `Vendor ${v.id}`,
            from: oldValue,
            to: v.allowed
          });
        }
      }
    });
  }
  
  return changes;
}
// Añadir estos nuevos métodos a audit.service.js

// Registro mejorado con prueba legal
async logActionWithLegalProof(data) {
  try {
    const { clientId, userId, action, resourceType, resourceId, metadata, context } = data;
    const { consentVersion, consentText, displayedTexts } = data.legalProof || {};
    
    // Generar hash de verificación para integridad
    const verificationHash = this._generateVerificationHash(data);
    
    const auditData = {
      clientId,
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date(),
      metadata,
      context,
      legalProof: {
        consentVersion,
        consentText,
        displayedTexts,
        verificationHash,
        timestamp: {
          iso: new Date().toISOString(),
          unix: Math.floor(Date.now() / 1000),
          precision: 'millisecond'
        }
      }
    };
    
    // Firmar digitalmente el registro
    auditData.securityInfo = {
      digitalSignature: this._createDigitalSignature(auditData),
      accessLog: [],
      modificationHistory: []
    };
    
    // Crear el registro en la base de datos
    const audit = await Audit.create(auditData);
    
    return audit;
  } catch (error) {
    logger.error('Error logging action with legal proof:', error);
    throw error;
  }
}

// Registrar contexto administrativo de un cambio
async logAdminChange(data) {
  try {
    const { clientId, userId, action, resourceType, resourceId, metadata, context } = data;
    const { changeReason, regulatoryReference, approvalChain } = data.adminContext || {};
    
    const auditData = {
      clientId,
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date(),
      metadata,
      context,
      adminContext: {
        changeReason,
        regulatoryReference,
        approvalChain
      }
    };
    
    // Crear el registro en la base de datos
    const audit = await Audit.create(auditData);
    
    // Evaluar automáticamente el cumplimiento
    await this._evaluateCompliance(audit);
    
    return audit;
  } catch (error) {
    logger.error('Error logging admin change:', error);
    throw error;
  }
}

// Evaluar automáticamente el cumplimiento
async _evaluateCompliance(auditRecord) {
  try {
    // Reglas básicas de verificación de cumplimiento
    const checks = [
      {
        checkName: 'hasRegulationReference',
        passed: !!auditRecord.adminContext?.regulatoryReference,
        details: 'Cambio debe tener referencia regulatoria'
      },
      {
        checkName: 'hasApprovalChain',
        passed: Array.isArray(auditRecord.adminContext?.approvalChain) && 
                auditRecord.adminContext.approvalChain.length > 0,
        details: 'Cambio debe tener cadena de aprobación'
      },
      {
        checkName: 'hasChangeReason',
        passed: !!auditRecord.adminContext?.changeReason,
        details: 'Cambio debe tener justificación'
      }
    ];
    
    // Calcular puntuación de cumplimiento (0-100)
    const passedChecks = checks.filter(check => check.passed).length;
    const complianceScore = (passedChecks / checks.length) * 100;
    
    // Registrar problemas detectados
    const flaggedIssues = checks
      .filter(check => !check.passed)
      .map(check => ({
        issueType: check.checkName,
        severity: 'warning',
        description: check.details,
        regulationReference: 'GDPR Art. 5 - Accountability'
      }));
    
    // Actualizar el registro con la evaluación
    await Audit.findByIdAndUpdate(
      auditRecord._id,
      {
        $set: {
          'riskAssessment': {
            complianceScore,
            flaggedIssues,
            automaticChecks: checks
          }
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error('Error evaluating compliance:', error);
    return false;
  }
}

// Métodos auxiliares para seguridad
_generateVerificationHash(data) {
  // Implementación simplificada - en producción usar algoritmos criptográficos adecuados
  const crypto = require('crypto');
  const dataString = JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

_createDigitalSignature(data) {
  // Implementación simplificada - en producción usar firma digital real
  const crypto = require('crypto');
  const dataString = JSON.stringify(data);
  return crypto.createHash('sha512').update(dataString).digest('hex');
}
}

module.exports = new AuditService();