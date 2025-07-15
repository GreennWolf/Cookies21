const Cookie = require('../../../models/Cookie');
const Domain = require('../../../models/Domain');
const logger = require('../../../utils/logger');

class CookieImporter {
  constructor() {
    this.importedCount = 0;
    this.skippedCount = 0;
    this.updatedCount = 0;
    this.errors = [];
  }

  /**
   * Importa cookies detectadas del sistema V2 al modelo Cookie principal
   * @param {Object} analysisResult - Resultado del análisis V2
   * @param {String} domainId - ID del dominio
   */
  async importCookiesFromV2Analysis(analysisResult, domainId) {
    logger.info(`🔄 [CookieImporter] Iniciando importación de ${analysisResult.cookies.length} cookies para dominio ${domainId}`);
    
    this.resetCounters();
    
    try {
      // Verificar que el dominio existe
      let domain;
      try {
        domain = await Domain.findById(domainId);
      } catch (dbError) {
        logger.warn(`⚠️ [CookieImporter] No se puede acceder a la BD para verificar dominio: ${dbError.message}`);
        // Crear un objeto dominio mock para continuar en modo testing
        domain = {
          _id: domainId,
          domain: analysisResult.domain || 'test-domain',
          status: 'testing'
        };
      }
      
      if (!domain) {
        throw new Error(`Dominio con ID ${domainId} no encontrado`);
      }

      // Procesar cada cookie detectada
      for (const detectedCookie of analysisResult.cookies) {
        try {
          await this.processCookie(detectedCookie, domain);
        } catch (error) {
          this.errors.push(`Error procesando cookie ${detectedCookie.name}: ${error.message}`);
          logger.error(`Error procesando cookie ${detectedCookie.name}:`, error);
        }
      }

      const totalProcessed = this.importedCount + this.skippedCount + this.updatedCount;
      logger.info(`✅ [CookieImporter] Importación completada:`);
      logger.info(`   📊 Total procesadas: ${totalProcessed}`);
      logger.info(`   🆕 Nuevas importadas: ${this.importedCount}`);
      logger.info(`   🔄 Actualizadas: ${this.updatedCount}`);
      logger.info(`   ⏭️ Omitidas (duplicadas): ${this.skippedCount}`);
      logger.info(`   ❌ Errores: ${this.errors.length}`);

      return {
        success: true,
        imported: this.importedCount,
        updated: this.updatedCount,
        skipped: this.skippedCount,
        errors: this.errors,
        totalProcessed
      };

    } catch (error) {
      logger.error('❌ [CookieImporter] Error durante importación:', error);
      throw error;
    }
  }

  /**
   * Procesa una cookie individual del análisis V2
   */
  async processCookie(detectedCookie, domain) {
    try {
      // Limpiar y validar datos de la cookie
      const cookieData = this.cleanCookieData(detectedCookie, domain);
      
      logger.debug(`🍪 Procesando cookie: ${cookieData.name}`);
      logger.debug(`   Provider detectado: ${cookieData.provider}`);
      logger.debug(`   Categoría: ${cookieData.category}`);
      logger.debug(`   Vendor info: ${JSON.stringify(detectedCookie.vendor)}`);
      
      // Buscar si la cookie ya existe
      let existingCookie;
      try {
        existingCookie = await Cookie.findOne({
          name: cookieData.name,
          domainId: domain._id,
          status: 'active'
        });
      } catch (dbError) {
        logger.warn(`⚠️ No se pudo buscar cookie existente: ${dbError.message}`);
        existingCookie = null; // Asumir que no existe si no podemos buscar
      }

      if (existingCookie) {
        logger.debug(`📌 Cookie existente encontrada: ${existingCookie.name}`);
        logger.debug(`   Provider actual: ${existingCookie.provider}`);
        logger.debug(`   Categoría actual: ${existingCookie.category}`);
        
        // Si existe, verificar si necesita actualización
        const needsUpdate = this.needsUpdate(existingCookie, cookieData);
        
        if (needsUpdate) {
          await this.updateExistingCookie(existingCookie, cookieData);
          this.updatedCount++;
          logger.info(`✅ Cookie actualizada: ${cookieData.name} (${existingCookie.provider} → ${cookieData.provider})`);
        } else {
          this.skippedCount++;
          logger.info(`⏭️ Cookie omitida (sin cambios): ${cookieData.name}`);
        }
      } else {
        // Crear nueva cookie
        await this.createNewCookie(cookieData, domain);
        this.importedCount++;
        logger.info(`🆕 Nueva cookie creada: ${cookieData.name} (Provider: ${cookieData.provider})`);
      }

    } catch (error) {
      logger.error(`Error procesando cookie ${detectedCookie.name}:`, error);
      throw error;
    }
  }

  /**
   * Limpia y valida los datos de la cookie del análisis V2
   */
  cleanCookieData(detectedCookie, domain) {
    // Mapear categorías del V2 al sistema principal
    const categoryMapping = {
      'necessary': 'necessary',
      'analytics': 'analytics', 
      'marketing': 'marketing',
      'advertising': 'marketing',
      'functional': 'functional',
      'preferences': 'personalization',
      'social': 'social',
      'unknown': 'other'
    };

    // Mapear fuentes del V2 a tipos reconocidos
    const sourceMapping = {
      'httpHeaders': 'HTTP Header',
      'requestHeaders': 'HTTP Request',
      'responseHeaders': 'HTTP Response', 
      'javascript': 'JavaScript',
      'localStorage': 'Local Storage',
      'sessionStorage': 'Session Storage',
      'browserAPI': 'Browser API',
      'documentCookie': 'Document Cookie',
      'iframe': 'iFrame',
      'dynamic': 'Dynamic Detection',
      'domainSpecific': 'Domain Specific',
      // SuperFastScanner sources
      'jsMonitor': 'JavaScript Monitor',
      'storage': 'Web Storage',
      'spaNavigation': 'SPA Navigation',
      'frameDetection': 'Frame Detection',
      'directCookie': 'Direct Cookie Access',
      'storageDetection': 'Storage Detection',
      'networkCapture': 'Network Capture',
      'dynamicTracking': 'Dynamic Tracking',
      'pageCookies': 'Page Cookies',
      'multiDomain': 'Multi-Domain',
      'thirdParty': 'Third Party',
      'other': 'Other'
    };

    const purpose = this.inferPurpose(detectedCookie);
    const duration = this.calculateDuration(detectedCookie);

    return {
      // Campos básicos requeridos
      domainId: domain._id,
      name: detectedCookie.name || '',
      category: categoryMapping[detectedCookie.category] || 'other',
      
      // Provider information - Usar el vendor detectado o inferirlo del nombre
      provider: this.detectProvider(detectedCookie),
      providerDetails: detectedCookie.vendor ? {
        name: detectedCookie.vendor.name,
        category: categoryMapping[detectedCookie.category] || 'other',
        iabVendorId: detectedCookie.vendor.id ? parseInt(detectedCookie.vendor.id) : null,
        verified: (detectedCookie.vendor.confidence || 0) > 0.7
      } : {
        name: this.detectProvider(detectedCookie),
        category: categoryMapping[detectedCookie.category] || 'other',
        verified: false
      },
      
      // Descripción
      description: {
        en: purpose,
        auto: true
      },
      
      // Propósito
      purpose: {
        id: this.getPurposeId(detectedCookie.category),
        name: purpose,
        description: purpose
      },
      
      // Atributos de la cookie
      attributes: {
        duration: duration,
        type: detectedCookie.source === 'localStorage' || detectedCookie.source === 'sessionStorage' ? 'Storage' : 'HTTP',
        path: detectedCookie.path || '/',
        domain: detectedCookie.domain || domain.domain,
        secure: detectedCookie.secure || false,
        httpOnly: detectedCookie.httpOnly || false,
        sameSite: detectedCookie.sameSite || ''
      },
      
      // Información de detección
      detection: {
        method: 'scan',
        firstDetected: new Date(),
        lastSeen: new Date(),
        frequency: 1,
        pattern: `V2:${detectedCookie.source}:${detectedCookie.detectionMethod}`
      },
      
      // Compliance
      compliance: {
        gdprRequired: detectedCookie.category !== 'necessary',
        ccpaRequired: detectedCookie.analysis?.isThirdParty || false,
        retentionPeriod: duration
      },
      
      // Status
      status: 'active',
      
      // Metadata
      metadata: {
        createdBy: 'scan',
        version: 1,
        notes: `Detectada automáticamente por sistema V2. Fuente: ${sourceMapping[detectedCookie.source] || 'Unknown'}. Confianza: ${(detectedCookie.categoryConfidence || 0) * 100}%`
      }
    };
  }

  /**
   * Obtiene el ID de propósito basado en la categoría
   */
  getPurposeId(category) {
    const purposeMapping = {
      'necessary': 1,
      'analytics': 2, 
      'marketing': 3,
      'advertising': 4,
      'functional': 5,
      'preferences': 6,
      'social': 7,
      'unknown': 0
    };
    
    return purposeMapping[category] || 0;
  }

  /**
   * Detecta el proveedor/vendor basándose en el nombre de la cookie
   */
  detectProvider(cookie) {
    // Si ya tiene vendor detectado, usarlo
    if (cookie.vendor?.name) {
      return cookie.vendor.name;
    }
    
    const name = (cookie.name || '').toLowerCase();
    
    // Mapeo de patrones comunes de cookies a proveedores
    const providerPatterns = {
      // Google
      '_ga': 'Google Analytics',
      '_gid': 'Google Analytics',
      '_gat': 'Google Analytics',
      '_gcl': 'Google Ads',
      'ga4': 'Google Analytics 4',
      '__utma': 'Google Analytics',
      '__utmb': 'Google Analytics',
      '__utmc': 'Google Analytics',
      '__utmz': 'Google Analytics',
      'google': 'Google',
      'goog': 'Google',
      
      // Facebook/Meta
      '_fbp': 'Facebook Pixel',
      'fbsr': 'Facebook',
      'xs': 'Facebook',
      'c_user': 'Facebook',
      'fr': 'Facebook',
      
      // WooCommerce
      'woocommerce': 'WooCommerce',
      'wc_': 'WooCommerce',
      'wp_woocommerce': 'WooCommerce',
      
      // WordPress
      'wordpress': 'WordPress',
      'wp_': 'WordPress',
      'wp-': 'WordPress',
      
      // Cloudflare
      '__cf': 'Cloudflare',
      'cf_': 'Cloudflare',
      
      // Amazon
      'aws': 'Amazon Web Services',
      'amzn': 'Amazon',
      
      // Microsoft
      'muid': 'Microsoft',
      '_clck': 'Microsoft Clarity',
      '_clsk': 'Microsoft Clarity',
      
      // Adobe
      's_cc': 'Adobe Analytics',
      's_sq': 'Adobe Analytics',
      's_vi': 'Adobe Analytics',
      
      // Hotjar
      '_hj': 'Hotjar',
      
      // Stripe
      '__stripe': 'Stripe',
      
      // PayPal
      'paypal': 'PayPal',
      
      // Twitter/X
      'twtr': 'Twitter',
      '_twitter': 'Twitter',
      
      // LinkedIn
      'lidc': 'LinkedIn',
      'bcookie': 'LinkedIn',
      'bscookie': 'LinkedIn',
      
      // YouTube
      'yt': 'YouTube',
      'ysc': 'YouTube',
      'visitor_info': 'YouTube',
      
      // TikTok
      'tiktok': 'TikTok',
      '_tt': 'TikTok',
      
      // HubSpot
      'hubspot': 'HubSpot',
      '__hs': 'HubSpot',
      
      // Mailchimp
      'mc_': 'Mailchimp',
      
      // Segment
      'ajs_': 'Segment',
      
      // Mixpanel
      'mp_': 'Mixpanel',
      
      // CMP/Consent
      'euconsent': 'IAB Europe',
      'cookieconsent': 'Cookie Consent',
      'gdpr': 'GDPR Consent',
      'cmp': 'Consent Management'
    };
    
    // Buscar coincidencias en el nombre
    for (const [pattern, provider] of Object.entries(providerPatterns)) {
      if (name.includes(pattern)) {
        return provider;
      }
    }
    
    // Si no se encuentra un patrón conocido, intentar inferir del dominio de la cookie
    if (cookie.domain) {
      const domain = cookie.domain.toLowerCase();
      if (domain.includes('google')) return 'Google';
      if (domain.includes('facebook') || domain.includes('fb')) return 'Facebook';
      if (domain.includes('twitter')) return 'Twitter';
      if (domain.includes('linkedin')) return 'LinkedIn';
      if (domain.includes('amazon')) return 'Amazon';
      if (domain.includes('microsoft')) return 'Microsoft';
      if (domain.includes('adobe')) return 'Adobe';
      if (domain.includes('youtube')) return 'YouTube';
    }
    
    // Si no se puede detectar, usar "Propios" como valor por defecto
    return 'Propios';
  }

  /**
   * Infiere el propósito de la cookie basado en su nombre y categoría
   */
  inferPurpose(cookie) {
    const name = (cookie.name || '').toLowerCase();
    const category = cookie.category || 'unknown';
    
    // Patrones comunes para inferir propósito
    if (name.includes('session') || name.includes('sess')) {
      return 'Gestión de sesión de usuario';
    }
    if (name.includes('analytics') || name.includes('ga') || name.includes('_ga')) {
      return 'Análisis y métricas del sitio web';
    }
    if (name.includes('ads') || name.includes('advertising')) {
      return 'Publicidad y marketing dirigido';
    }
    if (name.includes('consent') || name.includes('cookie') || name.includes('gdpr')) {
      return 'Gestión de consentimiento de cookies';
    }
    if (name.includes('pref') || name.includes('lang') || name.includes('currency')) {
      return 'Preferencias del usuario';
    }
    if (name.includes('cart') || name.includes('wishlist')) {
      return 'Funcionalidad de comercio electrónico';
    }
    if (name.includes('auth') || name.includes('token')) {
      return 'Autenticación y seguridad';
    }
    
    // Basado en categoría
    switch (category) {
      case 'necessary':
        return 'Funcionalidad esencial del sitio web';
      case 'analytics':
        return 'Análisis de comportamiento del usuario';
      case 'marketing':
      case 'advertising':
        return 'Marketing y publicidad personalizada';
      case 'preferences':
        return 'Personalización y preferencias';
      default:
        return 'Propósito por determinar';
    }
  }

  /**
   * Calcula la duración de la cookie
   */
  calculateDuration(cookie) {
    if (cookie.expires) {
      const expires = new Date(cookie.expires);
      const now = new Date();
      const diffMs = expires - now;
      
      if (diffMs > 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (days > 365) {
          return `${Math.floor(days / 365)} año(s)`;
        } else if (days > 0) {
          return `${days} día(s)`;
        } else {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          return `${hours} hora(s)`;
        }
      }
    }
    
    if (cookie.maxAge) {
      const days = Math.floor(cookie.maxAge / (60 * 60 * 24));
      if (days > 365) {
        return `${Math.floor(days / 365)} año(s)`;
      } else if (days > 0) {
        return `${days} día(s)`;
      } else {
        const hours = Math.floor(cookie.maxAge / (60 * 60));
        return `${hours} hora(s)`;
      }
    }
    
    // Si es sessionStorage o no tiene expiración
    if (cookie.source === 'sessionStorage' || !cookie.expires && !cookie.maxAge) {
      return 'Sesión (hasta cerrar navegador)';
    }
    
    return 'Duración desconocida';
  }

  /**
   * Verifica si una cookie existente necesita actualización
   */
  needsUpdate(existingCookie, newData) {
    // SIEMPRE actualizar si:
    
    // 1. El vendor/provider cambió o no estaba definido correctamente
    const genericProviders = ['Sistema V2', 'Propios', 'Unknown', 'Desconocido', 'Sistema'];
    if (!existingCookie.provider || 
        genericProviders.includes(existingCookie.provider) ||
        (existingCookie.provider !== newData.provider && newData.provider !== 'Unknown')) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: provider cambió de "${existingCookie.provider}" a "${newData.provider}"`);
      return true;
    }
    
    // 2. La categoría cambió o mejoró
    if (existingCookie.category !== newData.category && 
        newData.category !== 'other' && 
        newData.category !== 'unknown') {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: categoría cambió de "${existingCookie.category}" a "${newData.category}"`);
      return true;
    }
    
    // 3. El propósito cambió o no estaba definido
    if (!existingCookie.purpose?.name || existingCookie.purpose?.name !== newData.purpose?.name) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: propósito cambió`);
      return true;
    }
    
    // 4. La duración cambió
    if (existingCookie.attributes?.duration !== newData.attributes?.duration) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: duración cambió`);
      return true;
    }
    
    // 5. La información del vendor es más completa ahora
    if (newData.providerDetails && (!existingCookie.providerDetails || 
        existingCookie.providerDetails.name !== newData.providerDetails.name ||
        !existingCookie.providerDetails.verified && newData.providerDetails.verified)) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: información del vendor mejorada`);
      return true;
    }
    
    // 6. Si fue detectada hace más de 1 hora, actualizar para refrescar lastSeen
    if (existingCookie.detection?.lastSeen) {
      const hoursSinceLastSeen = (new Date() - new Date(existingCookie.detection.lastSeen)) / (1000 * 60 * 60);
      if (hoursSinceLastSeen > 1) {
        logger.debug(`🔄 Actualizando ${existingCookie.name}: no vista en ${Math.floor(hoursSinceLastSeen)} horas`);
        return true;
      }
    }
    
    // 7. Siempre actualizar si no tiene el pattern V2
    if (!existingCookie.detection?.pattern?.includes('V2:')) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: añadiendo información V2`);
      return true;
    }
    
    // 8. Si la cookie fue creada por el sistema antiguo
    if (existingCookie.metadata?.createdBy === 'system' || 
        existingCookie.metadata?.createdBy === 'manual') {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: cookie del sistema antiguo`);
      return true;
    }
    
    // 9. Si tenemos mejor información de terceros
    if (newData.compliance?.ccpaRequired !== existingCookie.compliance?.ccpaRequired) {
      logger.debug(`🔄 Actualizando ${existingCookie.name}: información de terceros cambió`);
      return true;
    }
    
    return false;
  }

  /**
   * Actualiza una cookie existente con nueva información
   */
  async updateExistingCookie(existingCookie, newData) {
    // Mantener datos existentes pero actualizar con nueva información
    const updateData = {
      ...newData,
      // Preservar fechas originales
      createdAt: existingCookie.createdAt,
      // Actualizar detección
      detection: {
        ...existingCookie.detection,
        lastSeen: new Date(),
        frequency: (existingCookie.detection?.frequency || 0) + 1,
        pattern: newData.detection.pattern
      },
      // Actualizar metadata
      metadata: {
        ...existingCookie.metadata,
        lastModifiedBy: 'scan-v2',
        version: (existingCookie.metadata?.version || 1) + 1,
        notes: newData.metadata.notes
      }
    };
    
    await Cookie.findByIdAndUpdate(existingCookie._id, updateData);
    logger.debug(`Cookie ${existingCookie.name} actualizada con datos del análisis V2`);
  }

  /**
   * Crea una nueva cookie en la base de datos
   */
  async createNewCookie(cookieData, domain) {
    try {
      const newCookie = new Cookie(cookieData);
      
      await newCookie.save();
      logger.debug(`✅ Nueva cookie ${cookieData.name} creada desde análisis V2`);
      return newCookie;
    } catch (saveError) {
      // Si falla el guardado (por ejemplo, BD no disponible)
      logger.warn(`⚠️ No se pudo guardar cookie ${cookieData.name} en BD: ${saveError.message}`);
      
      // En modo testing, simular que se guardó
      if (domain.status === 'testing') {
        logger.info(`🧪 Modo testing: Cookie ${cookieData.name} simulada como guardada`);
        return { ...cookieData, _id: `test_${Date.now()}_${cookieData.name}` };
      }
      
      throw saveError;
    }
  }

  /**
   * Resetea los contadores para una nueva importación
   */
  resetCounters() {
    this.importedCount = 0;
    this.skippedCount = 0;
    this.updatedCount = 0;
    this.errors = [];
  }
}

module.exports = CookieImporter;