/**
 * EMBED COOKIE DETECTION CONTROLLER
 * 
 * Controlador para procesar cookies detectadas desde el embed en tiempo real
 * Maneja datos de producción desde banners activos
 */

const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const Cookie = require('../models/Cookie');
const Domain = require('../models/Domain');
const embedCookieDetectorService = require('../services/embedCookieDetector.service');

class EmbedCookieDetectionController {
  
  /**
   * Procesa datos de cookies detectadas desde el embed
   */
  async processCookieData(req, res, next) {
    try {
      const {
        domainId,
        clientId,
        sessionId,
        timestamp,
        url,
        type,
        userAgent,
        detectorVersion,
        cookie,
        cookies,
        storage,
        thirdPartyScripts,
        summary,
        pageInfo
      } = req.body;

    console.log('🍪 Processing embed cookie detection data', {
      domainId,
      clientId,
      sessionId,
      type,
      url: url ? url.substring(0, 100) + '...' : 'unknown',
      timestamp: new Date(timestamp).toISOString(),
      nodeEnv: process.env.NODE_ENV
    });
    
    logger.info('🍪 Processing embed cookie detection data', {
      domainId,
      clientId,
      sessionId,
      type,
      url: url ? url.substring(0, 100) + '...' : 'unknown',
      timestamp: new Date(timestamp).toISOString()
    });

    // Verificar que el dominio existe
    const domain = await Domain.findById(domainId);
    if (!domain) {
      logger.warn('Domain not found for embed detection', { domainId, clientId });
      return res.status(404).json({
        status: 'error',
        message: 'Domain not found'
      });
    }

    // Verificar que el cliente coincide
    if (domain.clientId.toString() !== clientId) {
      logger.warn('Client ID mismatch for embed detection', {
        domainId,
        expectedClientId: domain.clientId,
        receivedClientId: clientId
      });
      return res.status(403).json({
        status: 'error',
        message: 'Client ID mismatch'
      });
    }

    let processedData = {
      cookies: 0,
      storage: 0,
      thirdPartyScripts: 0,
      errors: []
    };

    try {
      if (type === 'cookie_detected') {
        // Procesar cookie individual
        await this.processSingleCookie(cookie, domain, {
          sessionId,
          timestamp,
          url,
          userAgent,
          detectorVersion
        });
        processedData.cookies = 1;
        
      } else if (type === 'initial_detection_report') {
        // Procesar reporte inicial completo
        if (cookies && Array.isArray(cookies)) {
          for (const cookieData of cookies) {
            try {
              await this.processSingleCookie(cookieData, domain, {
                sessionId,
                timestamp,
                url,
                userAgent,
                detectorVersion
              });
              processedData.cookies++;
            } catch (error) {
              logger.error('Error processing individual cookie:', error);
              processedData.errors.push({
                cookie: cookieData.name,
                error: error.message
              });
            }
          }
        }

        // Procesar storage si está presente
        if (storage && Array.isArray(storage)) {
          processedData.storage = storage.length;
          // TODO: Implementar procesamiento de storage si es necesario
        }

        // Procesar third-party scripts
        if (thirdPartyScripts && Array.isArray(thirdPartyScripts)) {
          processedData.thirdPartyScripts = thirdPartyScripts.length;
          // TODO: Implementar procesamiento de scripts de terceros si es necesario
        }

        // Log del resumen
        if (summary) {
          logger.info('📊 Embed detection summary', {
            domainId,
            domain: domain.domain,
            totalCookies: summary.totalCookies,
            totalStorage: summary.totalStorage,
            totalThirdPartyScripts: summary.totalThirdPartyScripts,
            pageLoadTime: summary.pageLoadTime,
            detectorVersion: summary.detectorVersion,
            isFirstScan: summary.isFirstScan
          });

          // Si es el primer escaneo, configurar escaneos automáticos
          if (summary.isFirstScan && req.body.requestScheduledScanning) {
            try {
              await this.configureAutomaticScanning(domain, summary);
            } catch (schedulingError) {
              logger.error('Error configuring automatic scanning after first embed detection:', schedulingError);
              // No fallar el procesamiento por errores de programación
            }
          }

          // Decidir si hacer análisis completo basado en configuración
          const shouldDoFullAnalysis = this.shouldDoFullAnalysis(domain, summary);
          
          if (shouldDoFullAnalysis) {
            console.log(`🔍 ANALIZANDO - Iniciando análisis completo para dominio ${domain.domain}`);
            logger.info(`🔍 ANALIZANDO - Iniciando análisis completo para dominio ${domain.domain}`);
          }
          
          // Limpiar cookies inactivas solo si es necesario
          if (cookies && Array.isArray(cookies) && cookies.length > 0 && 
              domain.scanConfig?.cookieCleanupEnabled !== false && shouldDoFullAnalysis) {
            try {
              logger.info(`🧹 Starting cookie cleanup for domain ${domain.domain} - detected ${cookies.length} cookies`);
              await this.cleanupInactiveCookies(domain, cookies, {
                sessionId,
                timestamp,
                detectorVersion
              });
              
              // Actualizar fecha de último análisis completo
              await Domain.findByIdAndUpdate(domain._id, {
                'scanConfig.lastFullAnalysis': new Date()
              });
            } catch (cleanupError) {
              logger.error('Error cleaning up inactive cookies:', cleanupError);
              // No fallar el procesamiento por errores de limpieza
            }
          }
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Cookie data processed successfully',
        processed: processedData
      });

    } catch (error) {
      logger.error('Error processing embed cookie data:', error);
      throw new AppError('Failed to process cookie data', 500);
    }
    } catch (error) {
      logger.error('Error in processCookieData controller:', error);
      next(error);
    }
  }

  /**
   * Procesa una cookie individual detectada
   */
  async processSingleCookie(cookieData, domain, context) {
    const {
      name,
      value,
      domain: cookieDomain,
      source,
      method,
      vendor,
      category,
      isThirdParty,
      stackTrace,
      timestamp: cookieTimestamp,
      size
    } = cookieData;

    const {
      sessionId,
      timestamp,
      url,
      userAgent,
      detectorVersion
    } = context;

    try {
      // Buscar si la cookie ya existe para este dominio
      let existingCookie = await Cookie.findOne({
        domainId: domain._id,
        name: name
      });

      logger.debug(`🔍 Cookie detection for ${name}:`, {
        domainId: domain._id,
        cookieExists: !!existingCookie,
        vendor: vendor,
        category: category,
        source: source,
        method: method
      });

      if (existingCookie) {
        // Actualizar cookie existente con información mejorada
        const updateData = {};
        let shouldUpdate = false;

        // Actualizar vendor si es mejor
        const improvedVendor = vendor || this.determineFallbackVendor(name);
        
        if (improvedVendor && improvedVendor !== 'Unknown' && 
            (!existingCookie.provider || 
             existingCookie.provider === 'Unknown' || 
             existingCookie.provider === 'Sistema V2' ||
             existingCookie.provider === 'Sistema Local')) {
          updateData.provider = improvedVendor;
          shouldUpdate = true;
          logger.debug(`📝 Updating vendor for ${name}: ${existingCookie.provider} → ${improvedVendor}`);
        }

        // Actualizar categoría si es mejor
        if (category && category !== 'unknown' && existingCookie.category !== category) {
          updateData.category = category;
          shouldUpdate = true;
          logger.debug(`📝 Updating category for ${name}: ${existingCookie.category} → ${category}`);
        }

        // Actualizar información de detección
        updateData['detection.lastSeen'] = new Date(timestamp);
        updateData['detection.frequency'] = (existingCookie.detection?.frequency || 0) + 1;
        
        // Agregar patrón de detección embed
        const embedPattern = `EMBED:${source}:${method}`;
        if (!existingCookie.detection?.pattern?.includes(embedPattern)) {
          updateData['detection.pattern'] = `${existingCookie.detection?.pattern || ''};${embedPattern}`.replace(/^;/, '');
          shouldUpdate = true;
        }

        // Actualizar metadatos
        if (!existingCookie.metadata?.detectedByEmbed) {
          updateData['metadata.detectedByEmbed'] = true;
          updateData['metadata.embedDetectionVersion'] = detectorVersion;
          updateData['metadata.lastEmbedDetection'] = new Date(timestamp);
          shouldUpdate = true;
        }

        // Actualizar información de terceros
        if (isThirdParty !== undefined && existingCookie.compliance?.ccpaRequired !== isThirdParty) {
          updateData['compliance.ccpaRequired'] = isThirdParty;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await Cookie.findByIdAndUpdate(existingCookie._id, updateData);
          logger.info(`🔄 Cookie updated from embed: ${name} (${vendor || 'Unknown vendor'})`);
        } else {
          logger.debug(`⏭️ Cookie already up-to-date: ${name}`);
        }

      } else {
        // Crear nueva cookie detectada desde embed
        // Si no hay vendor detectado, intentar determinar uno basado en el nombre
        const finalVendor = vendor || this.determineFallbackVendor(name) || 'Sistema Local';
        
        const newCookie = new Cookie({
          domainId: domain._id,
          name: name,
          category: this.mapCategory(category),
          provider: finalVendor,
          
          description: {
            en: this.generateDescription(name, vendor, category),
            auto: true
          },
          
          purpose: {
            id: this.getPurposeId(category),
            name: this.generatePurpose(category, vendor),
            description: this.generatePurpose(category, vendor)
          },
          
          attributes: {
            duration: this.estimateDuration(name, vendor),
            type: this.getStorageType(source),
            path: '/',
            domain: cookieDomain || domain.domain,
            secure: false,
            httpOnly: false,
            sameSite: ''
          },
          
          detection: {
            method: 'embed',
            firstDetected: new Date(timestamp),
            lastSeen: new Date(timestamp),
            frequency: 1,
            pattern: `EMBED:${source}:${method}`
          },
          
          compliance: {
            gdprRequired: category !== 'necessary',
            ccpaRequired: isThirdParty || false,
            retentionPeriod: this.estimateDuration(name, vendor)
          },
          
          status: 'active',
          
          metadata: {
            createdBy: 'embed-detection',
            version: 1,
            detectedByEmbed: true,
            embedDetectionVersion: detectorVersion,
            sessionId: sessionId,
            sourceUrl: url,
            stackTrace: stackTrace ? stackTrace.substring(0, 500) : null,
            cookieSize: size || 0,
            notes: `Detectada automáticamente por embed detector v${detectorVersion}. Fuente: ${source}. Método: ${method}.`
          }
        });

        await newCookie.save();
        logger.info(`🆕 New cookie created from embed: ${name} (${vendor || 'Unknown vendor'}, ${category || 'unknown category'})`);
      }

    } catch (error) {
      logger.error(`Error processing cookie ${name} from embed:`, error);
      throw error;
    }
  }

  /**
   * Mapea categorías del detector a categorías del sistema
   */
  mapCategory(detectorCategory) {
    const categoryMapping = {
      'necessary': 'necessary',
      'analytics': 'analytics',
      'marketing': 'marketing',
      'advertising': 'marketing',
      'personalization': 'personalization',
      'preferences': 'personalization',
      'functional': 'functional',
      'performance': 'performance',
      'social': 'social',
      'unknown': 'other'
    };

    return categoryMapping[detectorCategory] || 'other';
  }

  /**
   * Obtiene ID de propósito basado en categoría
   */
  getPurposeId(category) {
    const purposeMapping = {
      'necessary': 1,
      'analytics': 2,
      'marketing': 3,
      'advertising': 4,
      'functional': 5,
      'personalization': 6,
      'social': 7,
      'performance': 8,
      'unknown': 0
    };

    return purposeMapping[category] || 0;
  }

  /**
   * Genera descripción automática para la cookie
   */
  generateDescription(name, vendor, category) {
    if (vendor && vendor !== 'Unknown') {
      return `Cookie de ${vendor} utilizada para ${this.getCategoryDescription(category)}`;
    }
    return `Cookie "${name}" categorizada como ${category || 'unknown'}`;
  }

  /**
   * Genera propósito basado en categoría y vendor
   */
  generatePurpose(category, vendor) {
    const purposes = {
      'necessary': 'Funcionalidad esencial del sitio web',
      'analytics': 'Medición y análisis de rendimiento',
      'marketing': 'Publicidad y marketing dirigido',
      'advertising': 'Publicidad personalizada',
      'personalization': 'Personalización de contenido',
      'preferences': 'Preferencias del usuario',
      'functional': 'Funcionalidad mejorada',
      'performance': 'Optimización de rendimiento',
      'social': 'Integración con redes sociales'
    };

    let purpose = purposes[category] || 'Propósito no identificado';
    
    if (vendor && vendor !== 'Unknown') {
      purpose += ` (${vendor})`;
    }

    return purpose;
  }

  /**
   * Obtiene descripción de categoría
   */
  getCategoryDescription(category) {
    const descriptions = {
      'necessary': 'funcionalidad esencial',
      'analytics': 'análisis y métricas',
      'marketing': 'marketing y publicidad',
      'advertising': 'publicidad dirigida',
      'personalization': 'personalización',
      'preferences': 'preferencias del usuario',
      'functional': 'funcionalidad adicional',
      'performance': 'optimización de rendimiento',
      'social': 'redes sociales'
    };

    return descriptions[category] || 'propósito desconocido';
  }

  /**
   * Estima duración de la cookie
   */
  estimateDuration(name, vendor) {
    // Patrones comunes de duración
    if (name.includes('session') || name.includes('sess')) return 'Sesión';
    if (name.startsWith('_ga')) return '2 años';
    if (name.startsWith('_gid')) return '24 horas';
    if (vendor === 'Facebook') return '90 días';
    if (vendor === 'Google Analytics') return '2 años';
    if (vendor === 'Google Tag Manager') return '2 años';
    
    return 'Duración variable';
  }

  /**
   * Obtiene tipo de storage
   */
  getStorageType(source) {
    if (source === 'localStorage' || source === 'sessionStorage' || source === 'storage') {
      return 'Storage';
    }
    return 'HTTP';
  }

  /**
   * Health check del sistema de detección
   */
  async healthCheck(req, res, next) {
    try {
      res.status(200).json({
        status: 'healthy',
        service: 'embed-cookie-detection',
        version: embedCookieDetectorService.version || '1.0.0',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Configura escaneos automáticos después del primer escaneo embed
   */
  async configureAutomaticScanning(domain, summary) {
    try {
      const automaticScanScheduler = require('../services/automaticScanScheduler.service');
      
      // Verificar múltiples condiciones para determinar si es realmente el primer escaneo
      const isFirstScan = await this.isReallyFirstScan(domain, summary);
      
      if (!isFirstScan) {
        logger.debug(`Domain ${domain.domain} already has been scanned before - skipping automatic configuration`);
        return;
      }

      // Marcar el primer escaneo como completado
      await Domain.findByIdAndUpdate(domain._id, {
        'scanConfig.firstScanCompleted': true,
        'scanConfig.lastScheduledScan': new Date(),
        'scanConfig.lastScanResult': {
          cookiesFound: summary.totalCookies || 0,
          newCookies: summary.totalCookies || 0,
          updatedCookies: 0,
          completedAt: new Date()
        }
      });

      // Si el escaneo automático está habilitado, programar escaneos
      if (domain.scanConfig?.autoScanEnabled) {
        await automaticScanScheduler.scheduleDomainScans(domain);
        logger.info(`🚀 Automatic scanning scheduled for domain: ${domain.domain} after first embed detection`);
      } else {
        // Si no está habilitado, configurar valores por defecto y habilitar
        const defaultScanConfig = {
          autoScanEnabled: true,
          scanInterval: 'daily',
          cronExpression: '0 2 * * *', // Diario a las 2 AM
          timezone: 'UTC',
          scanType: 'smart', // Uso smart para optimizar
          maxDepth: 2,
          includeSubdomains: false,
          enableAdvancedAnalysis: false,
          notifyOnCompletion: false,
          retryAttempts: 1,
          embedDetectionEnabled: true,
          firstScanCompleted: true,
          updatedAt: new Date()
        };

        await Domain.findByIdAndUpdate(domain._id, {
          scanConfig: {
            ...domain.scanConfig,
            ...defaultScanConfig
          }
        });

        await automaticScanScheduler.configureDomainScans(domain._id.toString(), defaultScanConfig);
        
        logger.info(`🎯 Automatic scanning auto-configured and enabled for domain: ${domain.domain}`, {
          domainId: domain._id,
          scanInterval: defaultScanConfig.scanInterval,
          scanType: defaultScanConfig.scanType,
          triggeredByFirstEmbedScan: true
        });
      }

    } catch (error) {
      logger.error(`Error configuring automatic scanning for domain ${domain.domain}:`, error);
      throw error;
    }
  }

  /**
   * Decide si hacer análisis completo basado en configuración y frecuencia
   */
  shouldDoFullAnalysis(domain, summary) {
    // 🛠️ MODO DESARROLLO: Siempre analizar cuando se vea el banner
    if (process.env.NODE_ENV === 'development') {
      console.log('🚧 DEV MODE: Always performing full analysis in development');
      logger.debug('🚧 DEV MODE: Always performing full analysis in development');
      return true;
    }
    
    // Modo de análisis del dominio
    const analysisMode = domain.scanConfig?.analysisMode || 'smart';
    
    switch (analysisMode) {
      case 'always':
        // Siempre hacer análisis completo (no recomendado en producción)
        logger.debug('🔄 Analysis mode: ALWAYS - performing full analysis');
        return true;
        
      case 'never':
        // Nunca hacer análisis en tiempo real
        logger.debug('⏭️ Analysis mode: NEVER - skipping analysis');
        return false;
        
      case 'first_only':
        // Solo en el primer escaneo
        const isFirst = !domain.scanConfig?.firstScanCompleted;
        logger.debug(`🎯 Analysis mode: FIRST_ONLY - analysis: ${isFirst}`);
        return isFirst;
        
      case 'smart':
      default:
        // Análisis inteligente basado en condiciones
        return this.smartAnalysisDecision(domain, summary);
    }
  }

  /**
   * Decisión inteligente sobre cuándo hacer análisis completo
   */
  smartAnalysisDecision(domain, summary) {
    console.log(`🔍 Smart analysis decision for domain ${domain.domain}:`, {
      firstScanCompleted: domain.scanConfig?.firstScanCompleted,
      lastFullAnalysis: domain.scanConfig?.lastFullAnalysis,
      nodeEnv: process.env.NODE_ENV,
      analysisMode: domain.scanConfig?.analysisMode
    });
    
    // 1. Si es el primer escaneo, siempre analizar
    if (!domain.scanConfig?.firstScanCompleted) {
      console.log('🆕 Smart analysis: First scan - performing analysis');
      logger.debug('🆕 Smart analysis: First scan - performing analysis');
      return true;
    }
    
    // 2. Si hace mucho que no se analiza (más de 7 días)
    const lastAnalysis = domain.scanConfig?.lastFullAnalysis;
    if (!lastAnalysis || (Date.now() - new Date(lastAnalysis).getTime()) > 7 * 24 * 60 * 60 * 1000) {
      logger.debug('⏰ Smart analysis: Long time since last analysis - performing analysis');
      return true;
    }
    
    // 3. Si hay muchas cookies nuevas detectadas
    const newCookiesCount = summary?.totalCookies || 0;
    const knownCookiesCount = domain.scanConfig?.lastScanResult?.cookiesFound || 0;
    
    if (newCookiesCount > knownCookiesCount * 1.5) {
      logger.debug(`📈 Smart analysis: Many new cookies detected (${newCookiesCount} vs ${knownCookiesCount}) - performing analysis`);
      return true;
    }
    
    // 4. En casos normales, no hacer análisis completo
    logger.debug('✋ Smart analysis: Normal conditions - skipping full analysis');
    return false;
  }

  /**
   * Verifica si realmente es el primer escaneo del dominio
   */
  async isReallyFirstScan(domain, summary) {
    try {
      // Condición 1: Verificar flag de primer escaneo en la base de datos
      if (domain.scanConfig?.firstScanCompleted) {
        logger.debug(`❌ First scan check failed: scanConfig.firstScanCompleted = true`);
        return false;
      }

      // Condición 2: Verificar si hay cookies existentes en la base de datos para este dominio
      const existingCookiesCount = await Cookie.countDocuments({ domainId: domain._id });
      
      // Condición 3: Verificar si hay cookies detectadas por métodos diferentes al embed
      const nonEmbedCookiesCount = await Cookie.countDocuments({ 
        domainId: domain._id,
        'detection.method': { $ne: 'embed' }
      });

      logger.info(`🔍 First scan analysis for domain ${domain.domain}:`, {
        domainId: domain._id,
        firstScanCompleted: domain.scanConfig?.firstScanCompleted || false,
        existingCookiesCount,
        nonEmbedCookiesCount,
        summaryTotalCookies: summary.totalCookies || 0,
        summaryIsFirstScan: summary.isFirstScan || false
      });

      // Si hay cookies que NO fueron detectadas por embed, significa que ya hubo un escaneo previo
      if (nonEmbedCookiesCount > 0) {
        logger.info(`❌ First scan check failed: Found ${nonEmbedCookiesCount} cookies detected by non-embed methods`);
        return false;
      }

      // Si hay muchas cookies ya existentes pero el summary dice que es el primer escaneo,
      // probablemente es el primer escaneo EMBED pero ya hubo otros escaneos
      if (existingCookiesCount > summary.totalCookies * 2) {
        logger.info(`❌ First scan check failed: Too many existing cookies (${existingCookiesCount}) vs summary (${summary.totalCookies})`);
        return false;
      }

      // Si llegamos aquí, probablemente ES el primer escaneo
      logger.info(`✅ First scan confirmed for domain ${domain.domain}`);
      return true;

    } catch (error) {
      logger.error('Error checking if first scan:', error);
      // En caso de error, asumir que NO es el primer escaneo para ser conservadores
      return false;
    }
  }

  /**
   * Obtiene estadísticas de detección
   */
  async getDetectionStats(req, res, next) {
    try {
      const {
        domainId,
        clientId,
        hours = 24
      } = req.query;

    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

    // Construir filtro
    const filter = {
      'metadata.detectedByEmbed': true,
      'detection.lastSeen': { $gte: since }
    };

    if (domainId) {
      filter.domainId = domainId;
    }

    if (clientId) {
      // Buscar dominios del cliente
      const domains = await Domain.find({ clientId }).select('_id');
      filter.domainId = { $in: domains.map(d => d._id) };
    }

    // Obtener estadísticas
    const [
      totalDetections,
      uniqueCookies,
      vendorStats,
      categoryStats
    ] = await Promise.all([
      Cookie.countDocuments(filter),
      Cookie.distinct('name', filter).then(names => names.length),
      Cookie.aggregate([
        { $match: filter },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Cookie.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      stats: {
        timeRange: `${hours} hours`,
        totalDetections,
        uniqueCookies,
        topVendors: vendorStats.map(v => ({
          vendor: v._id || 'Unknown',
          count: v.count
        })),
        categoriesBreakdown: categoryStats.reduce((acc, c) => {
          acc[c._id || 'unknown'] = c.count;
          return acc;
        }, {})
      }
    });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Limpia cookies inactivas - marca como inactivas las cookies que ya no se detectan
   */
  async cleanupInactiveCookies(domain, detectedCookies, context) {
    try {
      const { sessionId, timestamp, detectorVersion } = context;
      
      logger.info(`🔍 Starting cleanup analysis for domain ${domain.domain}`);
      
      // Obtener todas las cookies existentes del dominio (no solo embed)
      const existingCookies = await Cookie.find({
        domainId: domain._id,
        status: 'active'
      });

      // Mostrar las cookies existentes en la BD
      const existingCookieNames = existingCookies.map(c => c.name);
      logger.info(`📊 Found ${existingCookies.length} existing active cookies in domain ${domain.domain}:`);
      logger.info(`📋 Cookies in DB: [${existingCookieNames.join(', ')}]`);

      // Crear un Set con los nombres de las cookies detectadas actualmente
      const currentCookieNames = new Set(
        detectedCookies.map(cookie => cookie.name).filter(name => name)
      );

      logger.info(`🆕 Currently detected cookies: [${Array.from(currentCookieNames).join(', ')}]`);

      // COMPARACIÓN DETALLADA
      logger.info(`🔍 COMPARISON ANALYSIS:`);
      logger.info(`   - Cookies in DB: ${existingCookieNames.length}`);
      logger.info(`   - Cookies detected: ${currentCookieNames.size}`);
      
      // Mostrar diferencias
      const missingInDetection = existingCookieNames.filter(name => !currentCookieNames.has(name));
      const newInDetection = Array.from(currentCookieNames).filter(name => !existingCookieNames.includes(name));
      
      if (missingInDetection.length > 0) {
        logger.warn(`❌ Cookies in DB but NOT detected (will be removed): [${missingInDetection.join(', ')}]`);
      }
      
      if (newInDetection.length > 0) {
        logger.info(`✅ New cookies detected (should already be in DB): [${newInDetection.join(', ')}]`);
      }

      // Encontrar cookies que existían antes pero ya no se detectan
      const inactiveCookies = existingCookies.filter(
        existingCookie => {
          const shouldKeep = currentCookieNames.has(existingCookie.name);
          if (!shouldKeep) {
            logger.warn(`🚨 Cookie "${existingCookie.name}" is in DB but NOT detected - will be removed!`);
          }
          return !shouldKeep;
        }
      );

      if (inactiveCookies.length === 0) {
        logger.info(`✅ No inactive cookies found for domain ${domain.domain} - all ${existingCookies.length} cookies still active`);
        return {
          inactivated: 0,
          total: existingCookies.length,
          currently_detected: currentCookieNames.size
        };
      }

      logger.warn(`🚨 Found ${inactiveCookies.length} inactive cookies that need cleanup:`, 
        inactiveCookies.map(c => c.name));
      

      // Determinar acción basada en configuración del dominio
      const cleanupAction = domain.scanConfig?.cookieCleanupAction || 'delete';
      
      let updatedCount = 0;
      
      for (const inactiveCookie of inactiveCookies) {
        try {
          switch (cleanupAction) {
            case 'delete':
              // Eliminar completamente la cookie
              await Cookie.findByIdAndDelete(inactiveCookie._id);
              logger.info(`🗑️ Deleted inactive cookie: ${inactiveCookie.name} from domain ${domain.domain}`);
              updatedCount++;
              break;
              
            case 'mark_inactive':
            default:
              // Marcar como inactiva pero mantener en la base de datos
              await Cookie.findByIdAndUpdate(inactiveCookie._id, {
                status: 'inactive',
                'detection.lastSeen': new Date(timestamp),
                'metadata.deactivatedBy': 'embed-cleanup',
                'metadata.deactivatedAt': new Date(timestamp),
                'metadata.deactivationReason': 'No longer detected in page scan',
                'metadata.lastCleanupSession': sessionId
              });
              logger.info(`😴 Marked cookie as inactive: ${inactiveCookie.name} from domain ${domain.domain}`);
              updatedCount++;
              break;
              
            case 'ignore':
              // No hacer nada, mantener las cookies como están
              logger.debug(`⏭️ Ignoring inactive cookie: ${inactiveCookie.name}`);
              break;
          }
        } catch (error) {
          logger.error(`Error processing inactive cookie ${inactiveCookie.name}:`, error);
        }
      }

      const result = {
        action: cleanupAction,
        inactivated: updatedCount,
        total_existing: existingEmbedCookies.length,
        currently_detected: currentCookieNames.size,
        inactive_found: inactiveCookies.length
      };

      logger.info(`🧹 Cookie cleanup completed for domain ${domain.domain}:`, result);
      
      return result;

    } catch (error) {
      logger.error('Error in cleanupInactiveCookies:', error);
      throw error;
    }
  }

  /**
   * Determina un vendor de fallback basado en el nombre de la cookie
   */
  determineFallbackVendor(cookieName) {
    const nameLower = (cookieName || '').toLowerCase();
    
    // Cookies específicas del sistema de consent
    if (nameLower.includes('banner-') && nameLower.includes('-consent')) return 'Cookies21 CMP';
    if (nameLower === 'euconsent-v2') return 'IAB Consent Framework';
    
    // Cookies de preferencias del sitio
    if (nameLower.includes('language') || nameLower.includes('lang')) return 'Sistema de Idioma';
    if (nameLower.includes('theme') || nameLower.includes('mode')) return 'Sistema de Tema';
    
    // Cookies de sesión y autenticación
    if (nameLower.includes('session')) return 'Sistema de Sesión';
    if (nameLower.includes('auth') || nameLower.includes('token')) return 'Sistema de Autenticación';
    
    // Cookies de comercio electrónico
    if (nameLower.includes('cart')) return 'Sistema de Carrito';
    if (nameLower.includes('checkout') || nameLower.includes('order')) return 'Sistema de Pedidos';
    
    // Cookies de personalización
    if (nameLower.includes('pref') || nameLower.includes('preference')) return 'Sistema de Preferencias';
    if (nameLower.includes('settings') || nameLower.includes('config')) return 'Sistema de Configuración';
    
    // Si no coincide con ningún patrón, retornar null para que use el fallback general
    return null;
  }

  /**
   * Obtiene información detallada de un dominio para debug
   */
  async getDomainScanInfo(req, res, next) {
    try {
      const { domainId } = req.params;

      // Buscar el dominio
      const domain = await Domain.findById(domainId);
      if (!domain) {
        return res.status(404).json({
          status: 'error',
          message: 'Domain not found'
        });
      }

      // Obtener todas las cookies del dominio
      const allCookies = await Cookie.find({ domainId }).select('name provider category detection metadata');

      // Separar cookies por método de detección
      const cookiesByMethod = {
        embed: allCookies.filter(c => c.detection?.method === 'embed'),
        scan: allCookies.filter(c => c.detection?.method === 'scan'),
        manual: allCookies.filter(c => c.detection?.method === 'manual'),
        import: allCookies.filter(c => c.detection?.method === 'import'),
        other: allCookies.filter(c => !['embed', 'scan', 'manual', 'import'].includes(c.detection?.method))
      };

      // Estadísticas por vendor
      const vendorStats = {};
      allCookies.forEach(cookie => {
        const vendor = cookie.provider || 'Unknown';
        vendorStats[vendor] = (vendorStats[vendor] || 0) + 1;
      });

      // Información del dominio
      const domainInfo = {
        _id: domain._id,
        domain: domain.domain,
        clientId: domain.clientId,
        scanConfig: domain.scanConfig || {},
        status: domain.status
      };

      res.status(200).json({
        status: 'success',
        data: {
          domain: domainInfo,
          cookiesStats: {
            total: allCookies.length,
            byMethod: {
              embed: cookiesByMethod.embed.length,
              scan: cookiesByMethod.scan.length,
              manual: cookiesByMethod.manual.length,
              import: cookiesByMethod.import.length,
              other: cookiesByMethod.other.length
            },
            byVendor: vendorStats
          },
          cookies: {
            embed: cookiesByMethod.embed.map(c => ({
              name: c.name,
              vendor: c.provider,
              category: c.category,
              lastSeen: c.detection?.lastSeen,
              frequency: c.detection?.frequency
            })),
            nonEmbed: [...cookiesByMethod.scan, ...cookiesByMethod.manual, ...cookiesByMethod.import, ...cookiesByMethod.other].map(c => ({
              name: c.name,
              vendor: c.provider,
              category: c.category,
              method: c.detection?.method,
              firstDetected: c.detection?.firstDetected
            }))
          },
          scanHistory: {
            firstScanCompleted: domain.scanConfig?.firstScanCompleted || false,
            lastScheduledScan: domain.scanConfig?.lastScheduledScan,
            lastScanResult: domain.scanConfig?.lastScanResult,
            autoScanEnabled: domain.scanConfig?.autoScanEnabled || false,
            scanInterval: domain.scanConfig?.scanInterval
          }
        }
      });

    } catch (error) {
      logger.error('Error getting domain scan info:', error);
      next(error);
    }
  }

  /**
   * 🧪 DEBUG: Agregar cookies de prueba para testing de limpieza
   */
  async addTestCookiesForCleanup(req, res, next) {
    try {
      const { domainId } = req.params;

      // Buscar el dominio
      const domain = await Domain.findById(domainId);
      if (!domain) {
        return res.status(404).json({
          status: 'error',
          message: 'Domain not found'
        });
      }

      // Crear cookies de prueba que NO estarán en la página
      const testCookies = [
        {
          name: '_ga_test_cleanup',
          provider: 'Google Analytics',
          category: 'analytics'
        },
        {
          name: '_fbp_test_cleanup', 
          provider: 'Facebook Pixel',
          category: 'marketing'
        },
        {
          name: 'test_session_cleanup',
          provider: 'Sistema de Sesión',
          category: 'necessary'
        }
      ];

      const createdCookies = [];

      for (const testCookie of testCookies) {
        const newCookie = new Cookie({
          domainId: domain._id,
          name: testCookie.name,
          category: testCookie.category,
          provider: testCookie.provider,
          
          description: {
            en: `Test cookie for cleanup testing - ${testCookie.name}`,
            auto: true
          },
          
          purpose: {
            id: this.getPurposeId(testCookie.category),
            name: `Test purpose for ${testCookie.category}`,
            description: `Test purpose for ${testCookie.category}`
          },
          
          attributes: {
            duration: 'Test duration',
            type: 'HTTP',
            path: '/',
            domain: domain.domain,
            secure: false,
            httpOnly: false,
            sameSite: ''
          },
          
          detection: {
            method: 'manual',
            firstDetected: new Date(),
            lastSeen: new Date(),
            frequency: 1,
            pattern: 'TEST_FOR_CLEANUP'
          },
          
          compliance: {
            gdprRequired: testCookie.category !== 'necessary',
            ccpaRequired: false,
            retentionPeriod: 'Test duration'
          },
          
          status: 'active',
          
          metadata: {
            createdBy: 'scan',
            version: 1,
            detectedByEmbed: false,
            notes: `🧪 TEST COOKIE: Created for cleanup testing. This cookie should be REMOVED when cleanup runs because it won't be detected on the page.`
          }
        });

        await newCookie.save();
        createdCookies.push(testCookie.name);
        
        logger.info(`🧪 DEBUG: Created test cookie for cleanup: ${testCookie.name}`);
      }

      logger.warn(`🧪 DEBUG: Added ${createdCookies.length} test cookies to domain ${domain.domain} for cleanup testing`);
      
      res.status(200).json({
        status: 'success',
        message: 'Test cookies added for cleanup testing',
        data: {
          domain: domain.domain,
          createdCookies: createdCookies,
          instructions: 'These cookies are now in the database but will NOT be detected on the page. Next embed scan should detect them as inactive and remove them.'
        }
      });

    } catch (error) {
      logger.error('Error adding test cookies for cleanup:', error);
      next(error);
    }
  }
}

module.exports = new EmbedCookieDetectionController();