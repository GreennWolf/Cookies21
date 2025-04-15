const Consent = require('../models/ConsentLog');
const Domain = require('../models/Domain');
const VendorList = require('../models/VendorList');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const tcfService  = require('../services/tfc.service');
const auditService = require('../services/audit.service');
const logger = require('../utils/logger');

// Función para obtener la IP real del cliente
function getClientIp(req) {
  // Comprobar todas las posibles fuentes de IP, en orden de prioridad
  const ipSources = [
    req.headers['x-forwarded-for'],  // Para cuando hay un proxy o balanceador
    req.headers['x-real-ip'],        // Usado por algunos proxies
    req.connection?.remoteAddress,   // Dirección directa de la conexión
    req.socket?.remoteAddress,       // Socket subyacente
    req.ip                           // Express.js directamente
  ];
  
  // Recorrer todas las fuentes hasta encontrar una válida
  for (const source of ipSources) {
    if (source) {
      // Si es una lista separada por comas (x-forwarded-for puede contener múltiples IPs)
      if (typeof source === 'string' && source.includes(',')) {
        // Tomar la primera IP, que suele ser la del cliente original
        const ip = source.split(',')[0].trim();
        if (ip) return ip;
      } else {
        return source;
      }
    }
  }
  
  // Si no se puede determinar, devolver valor por defecto
  return '0.0.0.0';
}

// Función auxiliar para extraer información del navegador del user-agent
function extractBrowserInfo(userAgent) {
  try {
    if (!userAgent) return { name: 'unknown', version: '0' };
    
    // Patrones para detectar navegadores comunes
    const patterns = [
      { regex: /chrome|chromium|crios/i, name: 'chrome' },
      { regex: /firefox|fxios/i, name: 'firefox' },
      { regex: /safari/i, name: 'safari' },
      { regex: /opr\//i, name: 'opera' },
      { regex: /edg/i, name: 'edge' },
      { regex: /msie|trident/i, name: 'ie' }
    ];
    
    // Encontrar coincidencia
    const browser = patterns.find(pattern => pattern.regex.test(userAgent));
    
    // Extraer versión
    let version = '0';
    if (browser) {
      const versionMatch = userAgent.match(new RegExp(`${browser.name}[\\/\\s](\\d+(\\.\\d+)?)`));
      if (versionMatch && versionMatch[1]) {
        version = versionMatch[1];
      }
    }
    
    return {
      name: browser ? browser.name : 'unknown',
      version: version
    };
  } catch (e) {
    console.error('Error extracting browser info:', e);
    return { name: 'unknown', version: '0' };
  }
}

// Función para extraer información del sistema operativo del user-agent
function extractOsInfo(userAgent) {
  try {
    if (!userAgent) return { type: 'unknown', os: 'unknown' };
    
    // Patrones para detectar sistemas operativos comunes
    const patterns = [
      { regex: /windows|win32|win64/i, os: 'windows' },
      { regex: /macintosh|mac os x/i, os: 'macos' },
      { regex: /android/i, os: 'android' },
      { regex: /iphone|ipad|ipod/i, os: 'ios' },
      { regex: /linux/i, os: 'linux' }
    ];
    
    // Encontrar coincidencia
    const osMatch = patterns.find(pattern => pattern.regex.test(userAgent));
    
    // Determinar el tipo de plataforma
    let type = 'desktop';
    if (/mobile|android|iphone|ipod|tablet|ipad/i.test(userAgent)) {
      type = /tablet|ipad/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    
    return {
      type: type,
      os: osMatch ? osMatch.os : 'unknown'
    };
  } catch (e) {
    console.error('Error extracting OS info:', e);
    return { type: 'unknown', os: 'unknown' };
  }
}

class ConsentController {
  constructor() {
    // Semáforo para controlar solicitudes concurrentes
    this.processingLocks = new Map();
    
    // Limpiar bloqueos antiguos periódicamente (cada 5 minutos)
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.processingLocks.entries()) {
        if (now - timestamp > 60000) { // 1 minuto
          this.processingLocks.delete(key);
        }
      }
    }, 300000); // 5 minutos
  }
  
  /**
   * Mapea acciones de la UI a valores válidos para el modelo ConsentLog
   * @private 
   * @param {string} uiAction - Acción de la interfaz de usuario
   * @returns {string} - Acción válida para el modelo
   */
  _mapActionToValidValue(uiAction) {
    // Mapa de valores de acción UI a valores aceptados por el modelo
    const actionMapping = {
      'accept_all': 'grant',
      'reject_all': 'update',
      'save_preferences': 'update',
      'close': 'update',
      'no_interaction': 'update',
      'load_test': 'load_test' 
    };
    
    return actionMapping[uiAction] || 'grant';
  }

  // Obtener consentimiento actual
  // Obtener consentimiento actual
getConsent = catchAsync(async (req, res) => {
  const { domainId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(200).json({
      status: 'success',
      data: { consent: null, hasValidConsent: false }
    });
  }

  // Verificar dominio
  const domain = await Domain.findById(domainId);
  if (!domain) {
    throw new AppError('Domain not found', 404);
  }

  // Obtener consentimiento actual
  const consent = await Consent.findOne({
    domainId,
    userId,
    status: 'valid'
  }).sort('-createdAt');

  // Devolver respuesta incluso si no hay consentimiento (no error)
  res.status(200).json({
    status: 'success',
    data: { 
      consent,
      hasValidConsent: !!consent
    }
  });
});

updateConsent = catchAsync(async (req, res) => {
  const { domainId } = req.params;
  const { 
    userId,
    decisions,
    metadata = {},
    bannerInteraction = {}
  } = req.body;

  console.log('Solicitud de consentimiento recibida:', {
    domainId,
    userId,
    decisions: typeof decisions === 'string' ? decisions : JSON.stringify(decisions),
    bannerInteraction: typeof bannerInteraction === 'string' ? bannerInteraction : bannerInteraction.type
  });
  
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }
  
  // Verificar dominio
  const domain = await Domain.findById(domainId);
  if (!domain) {
    throw new AppError('Domain not found', 404);
  }
  
  // Normalizar el userId sin eliminar caracteres potencialmente importantes
  const normalizedUserId = userId.toString();
  const lockKey = `${domainId}:${normalizedUserId}`;
  
  // Establecer bloqueo con una duración máxima menor (500ms)
  this.processingLocks.set(lockKey, Date.now());

  try {
    // Obtener la lista de vendedores de manera robusta
    let vendorList = {
      purposes: { 
        1: { id: 1, name: 'Storage and access' },
        2: { id: 2, name: 'Personalization' },
        3: { id: 3, name: 'Ad selection' },
        4: { id: 4, name: 'Content selection' },
        5: { id: 5, name: 'Measurement' }
      },
      vendors: {},
      specialFeatures: {},
      vendorListVersion: 1
    };
  
    try {
      const latestVendorList = await VendorList.getLatest();
      if (latestVendorList && latestVendorList.purposes) {
        vendorList = latestVendorList;
      }
    } catch (error) {
      logger.warn('Error obteniendo lista de vendors, usando valores por defecto:', error);
    }
  
    // NUEVO: Detectar formato de decisiones y normalizar
    let inputDecisions = decisions;
    
    // Si decisions es un string, intentamos parsearlo
    if (typeof decisions === 'string') {
      try {
        inputDecisions = JSON.parse(decisions);
        console.log('Decisiones parseadas:', inputDecisions);
      } catch (e) {
        logger.error('Error al parsear JSON de decisiones:', e);
        inputDecisions = null;
      }
    }
    
    // NUEVO: Detectar formato y normalizar a formato DB
    const sourceFormat = tcfService.detectDecisionsFormat(inputDecisions);
    console.log(`Formato detectado: ${sourceFormat}`);
    
    // NUEVA SOLUCIÓN: Convertir formato de categorías a formato DB si es desconocido
    if (sourceFormat === 'unknown' && inputDecisions && typeof inputDecisions === 'object' && 
        ('necessary' in inputDecisions || 'analytics' in inputDecisions || 'marketing' in inputDecisions || 'personalization' in inputDecisions)) {
      
      console.log("Detectado formato de categorías, convirtiendo a formato DB");
      
      // Convertir de formato de categorías a formato DB
      const dbFormat = {
        purposes: []
      };
      
      // Siempre incluir propósito necesario
      dbFormat.purposes.push({
        id: 1,
        name: "Storage and access",
        allowed: true,
        legalBasis: "consent"
      });
      
      // Analytics (propósitos 7 y 8)
      if (inputDecisions.analytics === true) {
        dbFormat.purposes.push({
          id: 7,
          name: "Measure ad performance",
          allowed: true,
          legalBasis: "consent"
        });
        dbFormat.purposes.push({
          id: 8,
          name: "Measure content performance",
          allowed: true,
          legalBasis: "consent"
        });
      }
      
      // Marketing (propósitos 2, 3, 4)
      if (inputDecisions.marketing === true) {
        [2, 3, 4].forEach(id => {
          const names = {
            2: "Select basic ads",
            3: "Create a personalized ads profile",
            4: "Select personalized ads"
          };
          dbFormat.purposes.push({
            id: id,
            name: names[id],
            allowed: true,
            legalBasis: "consent"
          });
        });
      }
      
      // Personalización (propósitos 5 y 6)
      if (inputDecisions.personalization === true) {
        [5, 6].forEach(id => {
          const names = {
            5: "Create a personalized content profile",
            6: "Select personalized content"
          };
          dbFormat.purposes.push({
            id: id,
            name: names[id],
            allowed: true,
            legalBasis: "consent"
          });
        });
      }
      
      inputDecisions = dbFormat;
      console.log("Decisiones convertidas:", JSON.stringify(inputDecisions));
    }
    
    // Normalizar a formato DB utilizando tcfService
    const normalizedDecisions = sourceFormat === 'unknown' ? inputDecisions : 
      tcfService.normalizeDecisions(
        inputDecisions, 
        'db', 
        { vendorList }
      );
    
    console.log('Decisiones normalizadas a formato DB:', JSON.stringify(normalizedDecisions));
    
    // Asegurar que al menos el propósito 1 (almacenamiento) siempre está permitido
    if (Array.isArray(normalizedDecisions.purposes)) {
      const storagePurpose = normalizedDecisions.purposes.find(p => p.id === 1);
      if (storagePurpose) {
        storagePurpose.allowed = true;
      } else {
        normalizedDecisions.purposes.push({
          id: 1,
          name: "Storage and access",
          allowed: true,
          legalBasis: "consent"
        });
      }
    }
    
    // Normalizar interacción
    const normalizedInteraction = typeof bannerInteraction === 'string' 
      ? { type: bannerInteraction, timeToDecision: 0, customizationOpened: false }
      : { 
          type: bannerInteraction.type || 'grant',
          timeToDecision: bannerInteraction.timeToDecision || 0,
          customizationOpened: bannerInteraction.customizationOpened || false
        };
    
    // Mapear la acción UI a un valor válido para el modelo
    const mappedAction = this._mapActionToValidValue(normalizedInteraction.type);
    console.log('Acción UI:', normalizedInteraction.type, '-> Mapeada a acción del modelo:', mappedAction);
  
    // NUEVO: Crear objeto para generación de TCString
    const tcStringOptions = {
      decisions: normalizedDecisions,
      format: 'db',
      vendorList,
      metadata
    };
    
    // Generar TC String (con manejo de errores mejorado)
    let tcString;
    try {
      tcString = await tcfService.generateTCString(tcStringOptions);
      console.log('TC String generado exitosamente');
    } catch (error) {
      logger.error('Error generando TC String:', error);
      // Usar un string dummy para no bloquear el flujo
      tcString = "CPcl_kAPcl_kAAAAAAENCZCAAEAAAAAAAAAAAAAAAAAAA";
      console.log('Usando TC String por defecto debido a error');
    }
  
    // Obtener la IP real del cliente
    const clientIp = getClientIp(req);
    console.log(`IP del cliente detectada: ${clientIp}`);

    // Extraer información del navegador y SO
    const userAgent = req.headers['user-agent'] || metadata.userAgent || 'Unknown';
    const browserInfo = extractBrowserInfo(userAgent);
    const osInfo = extractOsInfo(userAgent);
  
    // NUEVO: Mapear categorías de cookies desde propósitos para preferencias
    const cookieCategories = [
      { category: 'necessary', allowed: true }, // Siempre permitido
    ];
    
    // Añadir otras categorías basadas en propósitos permitidos
    const purposes = normalizedDecisions.purposes || [];
    
    // Analytics: propósitos 7 (medición de anuncios) y 8 (medición de contenido)
    const analyticsAllowed = purposes.some(p => 
      (p.id === 7 || p.id === 8) && p.allowed === true
    );
    cookieCategories.push({ category: 'analytics', allowed: analyticsAllowed });
    
    // Marketing: propósitos 2 (anuncios básicos), 3 (perfil para anuncios) y 4 (anuncios personalizados)
    const marketingAllowed = purposes.some(p => 
      (p.id === 2 || p.id === 3 || p.id === 4) && p.allowed === true
    );
    cookieCategories.push({ category: 'marketing', allowed: marketingAllowed });
    
    // Personalización: propósitos 5 (perfil para contenido) y 6 (contenido personalizado)
    const personalizationAllowed = purposes.some(p => 
      (p.id === 5 || p.id === 6) && p.allowed === true
    );
    cookieCategories.push({ category: 'personalization', allowed: personalizationAllowed });
  
    // Preparar datos para ConsentLog
    const consentLogData = {
      domainId,
      userId: normalizedUserId,
      tcString,
      action: mappedAction,
      decisions: normalizedDecisions,
      preferences: {
        cookies: cookieCategories,
        scriptIds: []
      },
      metadata: {
        ipAddress: clientIp || metadata.ipAddress || '127.0.0.1',
        userAgent: userAgent,
        language: metadata.language || req.headers['accept-language']?.substring(0, 2) || 'es',
        country: metadata.country || req.headers['cf-ipcountry'] || 'ES',
        region: metadata.region || '',
        city: metadata.city || '',
        deviceType: metadata.deviceType || osInfo.type || 'desktop',
        browser: {
          name: browserInfo.name,
          version: browserInfo.version
        },
        platform: osInfo.type && osInfo.os ? `${osInfo.type}/${osInfo.os}` : 'desktop/unknown'
      },
      bannerInteraction: normalizedInteraction,
      regulation: {
        type: 'gdpr',
        applies: true,
        version: '2.2'
      },
      validity: {
        startTime: new Date()
      },
      status: 'valid'
    };
  
    console.log('Procesando consentimiento con acción:', consentLogData.action);
    console.log('ID de usuario:', normalizedUserId);
    console.log('Cantidad de propósitos a guardar:', consentLogData.decisions.purposes.length);
  
    // Buscar si ya existe un consentimiento válido para este usuario
    console.log(`Buscando consentimiento existente para usuario: '${normalizedUserId}' en dominio: '${domainId}'`);
    
    // Primero buscar cualquier consentimiento existente, incluso no válido
    let existingConsent = await Consent.findOne({
      domainId,
      userId: normalizedUserId
    }).sort('-createdAt');

    if (existingConsent) {
      console.log(`Encontrado consentimiento existente (ID: ${existingConsent._id}), estado: ${existingConsent.status}`);
      
      // Guardar la información anterior para auditoría
      const oldConsent = { ...existingConsent.toObject() };
      
      // Actualizar los campos del consentimiento existente
      existingConsent.tcString = tcString;
      existingConsent.action = mappedAction;
      existingConsent.decisions = consentLogData.decisions;
      existingConsent.preferences = consentLogData.preferences;
      existingConsent.metadata = consentLogData.metadata;
      existingConsent.bannerInteraction = normalizedInteraction;
      
      // Actualizar estado y validez
      existingConsent.status = 'valid';
      existingConsent.validity = {
        startTime: new Date(),
        endTime: null,
        refreshTime: new Date()
      };
      
      try {
        // Guardar los cambios
        const consent = await existingConsent.save();
        console.log(`Consentimiento existente actualizado con éxito (ID: ${consent._id})`);
        
        // Registro de auditoría para el cambio (sin bloquear la respuesta)
        try {
          await auditService.logConsentChange({
            domainId,
            userId: normalizedUserId,
            action: mappedAction,
            oldConsent: oldConsent,
            newConsent: consent
          });
        } catch (error) {
          logger.error('Error registrando cambio de consentimiento en auditoría:', error);
        }
        
        // Responder con éxito
        res.status(201).json({
          status: 'success',
          data: {
            consent,
            tcString
          }
        });
      } catch (error) {
        logger.error('Error actualizando consentimiento existente:', error);
        console.error(error.stack);
        throw new AppError('Error al actualizar registro de consentimiento: ' + error.message, 500);
      }
    } else {
      // No existe un consentimiento previo, crear uno nuevo
      console.log(`No existe consentimiento previo para usuario '${normalizedUserId}' y dominio '${domainId}', creando uno nuevo...`);
      
      try {
        // Crear nuevo consentimiento
        const consent = await Consent.create(consentLogData);
        console.log('Consentimiento creado exitosamente con ID:', consent._id);
        
        // Registro de auditoría (sin bloquear la respuesta)
        try {
          await auditService.logConsentChange({
            domainId,
            userId: normalizedUserId,
            action: mappedAction,
            oldConsent: null,
            newConsent: consent
          });
        } catch (error) {
          logger.error('Error registrando nuevo consentimiento en auditoría:', error);
        }
        
        // Responder con éxito
        res.status(201).json({
          status: 'success',
          data: {
            consent,
            tcString
          }
        });
        
        // AÑADE ESTE CÓDIGO JUSTO DESPUÉS DE LA LÍNEA ANTERIOR
        try {
          // Importar el servicio de analytics
          const analyticsService = require('../services/analytics.service');
          
          // Registrar interacción en analytics
          await analyticsService.trackBannerInteraction({
            domainId,
            action: mappedAction,
            timeToDecision: normalizedInteraction.timeToDecision || 0,
            customization: normalizedInteraction.customizationOpened || false,
            metadata: {
              userId: normalizedUserId,
              deviceInfo: {
                browser: browserInfo,
                os: osInfo,
                deviceType: metadata.deviceType || osInfo.type || 'desktop'
              },
              ipAddress: clientIp
            }
          });
          
          // Actualizar estadísticas de cookies por categoría
          await analyticsService.updateCookieStats(domainId, cookieCategories);

          
          
          console.log('Datos de analytics actualizados correctamente');
        } catch (analyticsError) {
          // No bloquear la respuesta si falla analytics
          logger.error('Error registrando datos en analytics:', analyticsError);
        }
      } catch (error) {
        logger.error('Error creando nuevo consentimiento:', error);
        console.error(error.stack);
        throw new AppError('Error al crear registro de consentimiento: ' + error.message, 500);
      }
    }
  } catch (error) {
    // Liberar el bloqueo en caso de error
    this.processingLocks.delete(lockKey);
    throw error;
  } finally {
    // Asegurar que el bloqueo se libere siempre
    setTimeout(() => {
      this.processingLocks.delete(lockKey);
      console.log(`Bloqueo liberado para ${lockKey}`);
    }, 200);
  }
});

  // Revocar consentimiento
  revokeConsent = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { userId } = req.body;

    const consent = await Consent.findOne({
      domainId,
      userId,
      status: 'valid'
    });

    if (!consent) {
      throw new AppError('No valid consent found', 404);
    }

    // Revocar consentimiento
    consent.status = 'revoked';
    consent.validity.endTime = new Date();
    await consent.save();

    // Registrar cambio
    await auditService.logConsentChange({
      domainId,
      userId,
      action: 'revoke',
      oldConsent: consent,
      newConsent: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Consent revoked successfully'
    });
  });

  // Verificar consentimiento
  verifyConsent = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { userId, purposes, vendors } = req.query;

    const consent = await Consent.findOne({
      domainId,
      userId,
      status: 'valid'
    }).sort('-createdAt');

    if (!consent) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasConsent: false,
          reason: 'No valid consent found'
        }
      });
    }

    // Verificar consentimiento específico si se solicita
    if (purposes || vendors) {
      const verification = await consent.verifySpecificConsent(purposes, vendors);
      return res.status(200).json({
        status: 'success',
        data: verification
      });
    }

    // Verificar validez general
    const isValid = consent.isValid();

    res.status(200).json({
      status: 'success',
      data: {
        hasConsent: isValid,
        consent: isValid ? consent : null
      }
    });
  });

  // Obtener historial de consentimiento
  getConsentHistory = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { userId, startDate, endDate } = req.query;

    const query = {
      domainId,
      userId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const history = await Consent.find(query)
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: { history }
    });
  });

  // Decodificar TC String
  /**
 * Decodificar TC String
 */
decodeTCString = catchAsync(async (req, res) => {
  // Si no hay datos, retornar una estructura vacía pero válida
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).json({
      status: 'success',
      data: { 
        decoded: {
          purposes: {},
          vendors: {},
          specialFeatures: {}
        }
      }
    });
  }

  const { tcString } = req.body;

  // Si no hay TC String válido, devolver una estructura vacía pero no error
  if (!tcString || typeof tcString !== 'string') {
    return res.status(200).json({
      status: 'success',
      data: { 
        decoded: {
          purposes: {},
          vendors: {},
          specialFeatures: {}
        }
      }
    });
  }

  try {
    const decoded = await tcfService.decodeTCString(tcString);
    
    res.status(200).json({
      status: 'success',
      data: { decoded }
    });
  } catch (error) {
    logger.error('Error decoding TC String:', error);
    
    // Devolver una estructura vacía pero válida en caso de error
    return res.status(200).json({
      status: 'success',
      data: { 
        decoded: {
          purposes: {},
          vendors: {},
          specialFeatures: {},
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          tcString: tcString
        }
      }
    });
  }
});

  // Métodos privados
  async _validateDecisions(decisions, vendorList) {
    const errors = [];

    // Validar propósitos
    if (decisions.purposes) {
      // Comprobar si purposes es un objeto o un array
      if (Array.isArray(decisions.purposes)) {
        // Si es un array de objetos con { id, allowed }
        for (const purpose of decisions.purposes) {
          if (!vendorList.getPurpose || !vendorList.getPurpose(purpose.id)) {
            errors.push(`Invalid purpose ID: ${purpose.id}`);
          }
        }
      } else if (typeof decisions.purposes === 'object') {
        // Si es un objeto con formato { 1: true, 2: false, ... }
        for (const purposeId in decisions.purposes) {
          if (vendorList.purposes && !vendorList.purposes[purposeId]) {
            errors.push(`Invalid purpose ID: ${purposeId}`);
          }
        }
      } else {
        errors.push('Invalid purposes format');
      }
    }
  
    // Validar vendors
    if (decisions.vendors) {
      // Comprobar si vendors es un objeto o un array
      if (Array.isArray(decisions.vendors)) {
        // Si es un array de objetos con { id, allowed }
        for (const vendor of decisions.vendors) {
          if (!vendorList.getVendor || !vendorList.getVendor(vendor.id)) {
            errors.push(`Invalid vendor ID: ${vendor.id}`);
          }
        }
      } else if (typeof decisions.vendors === 'object') {
        // Si es un objeto con formato { 123: true, 456: false, ... }
        for (const vendorId in decisions.vendors) {
          if (vendorList.vendors && !vendorList.vendors[vendorId]) {
            errors.push(`Invalid vendor ID: ${vendorId}`);
          }
        }
      } else {
        errors.push('Invalid vendors format');
      }
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ConsentController();