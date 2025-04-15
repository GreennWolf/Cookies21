// services/analyticsSyncService.js
const Analytics = require('../models/Analytics');
const Consent = require('../models/ConsentLog');
const Domain = require('../models/Domain');
const logger = require('../utils/logger');

class AnalyticsSyncService {
  // Ejecutar sincronización diaria
  async runDailySync() {
    try {
      logger.info('Iniciando sincronización diaria de analytics');
      
      // Obtener todos los dominios activos
      const domains = await Domain.find({ status: 'active' });
      
      // Para cada dominio, recalcular y consolidar analytics
      for (const domain of domains) {
        await this.syncDomainAnalytics(domain._id);
      }
      
      logger.info('Sincronización diaria completada');
      return true;
    } catch (error) {
      logger.error('Error en sincronización diaria:', error);
      return false;
    }
  }
  
  // Sincronizar analytics para un dominio específico
  async syncDomainAnalytics(domainId) {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = new Date(yesterday.setHours(0, 0, 0, 0));
      const endDate = new Date(yesterday.setHours(23, 59, 59, 999));
      
      // Obtener consentimientos del día anterior
      const consents = await Consent.find({
        domainId,
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      if (consents.length === 0) {
        logger.info(`No hay consentimientos para sincronizar en dominio ${domainId}`);
        return true;
      }
      
      // Calcular estadísticas
      const stats = this._calculateConsentStats(consents);
      
      // Calcular información demográfica
      const demographics = this._calculateDemographics(consents);
      
      // Actualizar o crear registro de analytics
      await Analytics.findOneAndUpdate(
        {
          domainId,
          'period.start': startDate,
          'period.end': endDate,
          'period.granularity': 'daily'
        },
        {
          $set: {
            // Actualizar todas las estadísticas calculadas
            visits: stats.visits,
            interactions: stats.interactions,
            consents: stats.consents,
            demographics: demographics,
            
            // Asegurar que los campos necesarios estén inicializados
            period: {
              start: startDate,
              end: endDate,
              granularity: 'daily'
            }
          }
        },
        { upsert: true }
      );
      
      logger.info(`Analytics sincronizados para dominio ${domainId}, procesados ${consents.length} consentimientos`);
      return true;
    } catch (error) {
      logger.error(`Error sincronizando analytics para dominio ${domainId}:`, error);
      return false;
    }
  }
  
  // Calcular estadísticas basadas en consentimientos
  _calculateConsentStats(consents) {
    // Inicializar estructura de estadísticas
    const stats = {
      visits: {
        total: consents.length,
        unique: new Set(consents.map(c => c.userId)).size,
        returning: 0,
        byRegulation: {
          gdpr: 0,
          ccpa: 0,
          lgpd: 0,
          other: 0
        }
      },
      interactions: {
        total: consents.length,
        types: {
          acceptAll: { count: 0, percentage: 0 },
          rejectAll: { count: 0, percentage: 0 },
          customize: { count: 0, percentage: 0 },
          close: { count: 0, percentage: 0 },
          noInteraction: { count: 0, percentage: 0 }
        },
        metrics: {
          avgTimeToDecision: 0,
          avgTimeInPreferences: 0,
          customizationRate: 0,
          bounceRate: 0
        }
      },
      consents: {
        cookies: {},
        purposes: {},
        vendors: {}
      }
    };
    
    // Procesar cada consentimiento
    consents.forEach(consent => {
      // Contabilizar por tipo de acción
      if (consent.action === 'grant') {
        stats.interactions.types.acceptAll.count++;
      } else if (consent.action === 'reject') {
        stats.interactions.types.rejectAll.count++;
      } else if (consent.bannerInteraction?.customizationOpened) {
        stats.interactions.types.customize.count++;
      } else if (consent.action === 'close') {
        stats.interactions.types.close.count++;
      } else {
        stats.interactions.types.noInteraction.count++;
      }
      
      // Contabilizar por regulación
      if (consent.regulation) {
        const regulationType = consent.regulation.type?.toLowerCase() || 'other';
        if (stats.visits.byRegulation[regulationType] !== undefined) {
          stats.visits.byRegulation[regulationType]++;
        } else {
          stats.visits.byRegulation.other++;
        }
      } else {
        stats.visits.byRegulation.other++;
      }
      
      // Procesar tiempo de decisión
      if (consent.bannerInteraction?.timeToDecision) {
        stats.interactions.metrics.avgTimeToDecision += consent.bannerInteraction.timeToDecision;
      }
      
      // Procesar cookies y propósitos
      if (consent.preferences?.cookies) {
        consent.preferences.cookies.forEach(cookie => {
          if (!stats.consents.cookies[cookie.category]) {
            stats.consents.cookies[cookie.category] = {
              total: 0,
              accepted: 0,
              rejected: 0,
              acceptanceRate: 0
            };
          }
          
          stats.consents.cookies[cookie.category].total++;
          
          if (cookie.allowed) {
            stats.consents.cookies[cookie.category].accepted++;
          } else {
            stats.consents.cookies[cookie.category].rejected++;
          }
        });
      }
      
      // Procesar decisiones de propósitos
      if (consent.decisions?.purposes) {
        consent.decisions.purposes.forEach(purpose => {
          if (!stats.consents.purposes[purpose.id]) {
            stats.consents.purposes[purpose.id] = {
              id: purpose.id,
              name: purpose.name || `Purpose ${purpose.id}`,
              total: 0,
              accepted: 0,
              rejected: 0,
              acceptanceRate: 0
            };
          }
          
          stats.consents.purposes[purpose.id].total++;
          
          if (purpose.allowed) {
            stats.consents.purposes[purpose.id].accepted++;
          } else {
            stats.consents.purposes[purpose.id].rejected++;
          }
        });
      }
    });
    
    // Calcular porcentajes y promedios
    if (stats.interactions.total > 0) {
      // Tipos de interacción
      Object.keys(stats.interactions.types).forEach(type => {
        stats.interactions.types[type].percentage = 
          (stats.interactions.types[type].count / stats.interactions.total) * 100;
      });
      
      // Métricas de interacción
      stats.interactions.metrics.avgTimeToDecision /= stats.interactions.total;
      stats.interactions.metrics.customizationRate = 
        (stats.interactions.types.customize.count / stats.interactions.total) * 100;
      stats.interactions.metrics.bounceRate = 
        (stats.interactions.types.noInteraction.count / stats.interactions.total) * 100;
    }
    
    // Calcular tasas de aceptación para cookies
    Object.keys(stats.consents.cookies).forEach(category => {
      const cookie = stats.consents.cookies[category];
      cookie.acceptanceRate = cookie.total > 0 ? (cookie.accepted / cookie.total) * 100 : 0;
    });
    
    // Calcular tasas de aceptación para propósitos
    Object.keys(stats.consents.purposes).forEach(id => {
      const purpose = stats.consents.purposes[id];
      purpose.acceptanceRate = purpose.total > 0 ? (purpose.accepted / purpose.total) * 100 : 0;
    });
    
    // Convertir objetos a arrays para compatibilidad con el esquema
    stats.consents.cookies = Object.keys(stats.consents.cookies).map(category => ({
      category,
      ...stats.consents.cookies[category]
    }));
    
    stats.consents.purposes = Object.values(stats.consents.purposes);
    
    return stats;
  }
  
  // Calcular información demográfica
  _calculateDemographics(consents) {
    const demographics = {
      countries: {},
      devices: {},
      browsers: {},
      platforms: {}
    };
    
    // Procesar metadatos de cada consentimiento
    consents.forEach(consent => {
      if (!consent.metadata) return;
      
      // Procesar país
      const countryCode = consent.metadata.country || 'unknown';
      if (!demographics.countries[countryCode]) {
        demographics.countries[countryCode] = {
          code: countryCode,
          name: this._getCountryName(countryCode),
          visits: 0,
          acceptanceRate: 0,
          customizationRate: 0
        };
      }
      demographics.countries[countryCode].visits++;
      
      // Procesar dispositivo
      const deviceType = consent.metadata.deviceType || 'unknown';
      if (!demographics.devices[deviceType]) {
        demographics.devices[deviceType] = {
          type: deviceType,
          visits: 0,
          acceptanceRate: 0,
          customizationRate: 0
        };
      }
      demographics.devices[deviceType].visits++;
      
      // Procesar navegador
      let browserName = 'unknown';
      let browserVersion = '0';
      
      if (consent.metadata.browser) {
        browserName = consent.metadata.browser.name || 'unknown';
        browserVersion = consent.metadata.browser.version || '0';
      } else if (consent.metadata.userAgent) {
        const browserInfo = this._extractBrowserInfo(consent.metadata.userAgent);
        browserName = browserInfo.name;
        browserVersion = browserInfo.version;
      }
      
      const browserKey = `${browserName}-${browserVersion}`;
      if (!demographics.browsers[browserKey]) {
        demographics.browsers[browserKey] = {
          name: browserName,
          version: browserVersion,
          visits: 0,
          acceptanceRate: 0
        };
      }
      demographics.browsers[browserKey].visits++;
      
      // Procesar plataforma
      let platform = 'unknown';
      if (consent.metadata.platform) {
        platform = consent.metadata.platform;
      } else if (consent.metadata.userAgent) {
        platform = this._extractPlatform(consent.metadata.userAgent);
      }
      
      if (!demographics.platforms[platform]) {
        demographics.platforms[platform] = {
          name: platform,
          visits: 0,
          acceptanceRate: 0
        };
      }
      demographics.platforms[platform].visits++;
    });
    
    // Convertir objetos a arrays para compatibilidad con el esquema
    return {
      countries: Object.values(demographics.countries),
      devices: Object.values(demographics.devices),
      browsers: Object.values(demographics.browsers),
      platforms: Object.values(demographics.platforms)
    };
  }
  
  // Extraer información del navegador del user-agent
  _extractBrowserInfo(userAgent) {
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
  }
  
  // Extraer información de plataforma del user-agent
  _extractPlatform(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (/windows|win32|win64/i.test(userAgent)) return 'windows';
    if (/macintosh|mac os x/i.test(userAgent)) return 'macos';
    if (/android/i.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
    if (/linux/i.test(userAgent)) return 'linux';
    
    return 'unknown';
  }
  
  // Obtener nombre de país desde código
  _getCountryName(code) {
    const countries = {
      'ES': 'Spain',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'CA': 'Canada',
      'AU': 'Australia'
      // Añadir más según sea necesario
    };
    
    return countries[code] || code;
  }
  
  // Ejecutar sincronización para un periodo específico (utilidad para recuperar datos)
  async syncPeriod(domainId, startDate, endDate) {
    try {
      logger.info(`Sincronizando periodo específico para dominio ${domainId}: ${startDate} - ${endDate}`);
      
      // Convertir strings a objetos Date si es necesario
      const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
      
      // Obtener consentimientos del periodo
      const consents = await Consent.find({
        domainId,
        createdAt: { $gte: start, $lte: end }
      });
      
      if (consents.length === 0) {
        logger.info(`No hay consentimientos para sincronizar en el periodo especificado`);
        return false;
      }
      
      // Calcular estadísticas
      const stats = this._calculateConsentStats(consents);
      
      // Calcular información demográfica
      const demographics = this._calculateDemographics(consents);
      
      // Actualizar o crear registro de analytics
      await Analytics.findOneAndUpdate(
        {
          domainId,
          'period.start': start,
          'period.end': end,
          'period.granularity': 'custom'
        },
        {
          $set: {
            visits: stats.visits,
            interactions: stats.interactions,
            consents: stats.consents,
            demographics: demographics,
            period: {
              start: start,
              end: end,
              granularity: 'custom'
            }
          }
        },
        { upsert: true }
      );
      
      logger.info(`Analytics sincronizados para periodo específico, procesados ${consents.length} consentimientos`);
      return true;
    } catch (error) {
      logger.error(`Error sincronizando periodo específico:`, error);
      return false;
    }
  }
}

module.exports = new AnalyticsSyncService();