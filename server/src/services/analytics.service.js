const Analytics = require('../models/Analytics');
const Consent = require('../models/ConsentLog');
const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');
const { aggregateByTime, calculatePercentages } = require('../utils/analyticHelpers');

class AnalyticsService {
  // Registrar interacción con el banner
  async trackBannerInteraction(data) {
    try {
      const {
        domainId,
        action,
        timeToDecision,
        customization,
        metadata
      } = data;

      await Analytics.findOneAndUpdate(
        {
          domainId,
          'period.start': this._getPeriodStart(),
          'period.end': this._getPeriodEnd(),
          'period.granularity': 'daily'
        },
        {
          $inc: {
            'visits.total': 1,
            [`interactions.types.${action}.count`]: 1,
            ...(customization && { 'interactions.types.customize.count': 1 })
          },
          $push: {
            'interactions.details': {
              action,
              timeToDecision,
              timestamp: new Date(),
              metadata
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error tracking banner interaction:', error);
    }
  }

  // Obtener estadísticas de consentimiento
  async getConsentStats(domainId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      granularity = 'daily'
    } = options;

    try {
      const stats = await Analytics.aggregate([
        {
          $match: {
            domainId,
            'period.start': { $gte: startDate },
            'period.end': { $lte: endDate },
            'period.granularity': granularity
          }
        },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: '$visits.total' },
            uniqueVisitors: { $sum: '$visits.unique' },
            interactions: {
              $push: {
                acceptAll: '$interactions.types.acceptAll.count',
                rejectAll: '$interactions.types.rejectAll.count',
                customize: '$interactions.types.customize.count',
                date: '$period.start'
              }
            }
          }
        }
      ]);

      // Calcular tasas y porcentajes
      const enrichedStats = await this._enrichConsentStats(stats[0]);

      return enrichedStats;
    } catch (error) {
      logger.error('Error getting consent stats:', error);
      throw error;
    }
  }

  // Obtener análisis de cookies
  async getCookieAnalytics(domainId, options = {}) {
    try {
      const cookies = await Cookie.find({ domainId });
      const consents = await Consent.find({ 
        domainId,
        createdAt: { 
          $gte: options.startDate,
          $lte: options.endDate 
        }
      });
  
      return {
        categories: this._analyzeCookieCategories(cookies),
        purposes: this._analyzeCookiePurposes(cookies),
        acceptance: await this._analyzeCookieAcceptance(cookies, consents),
        providers: this._analyzeProviders(cookies)
      };
    } catch (error) {
      logger.error('Error getting cookie analytics:', error);
      throw error;
    }
  }
  
  // Método corregido para analizar aceptación de cookies
  async _analyzeCookieAcceptance(cookies, consents) {
    const acceptance = {};
    
    // Primero inicializar el objeto para todas las cookies
    cookies.forEach(cookie => {
      acceptance[cookie.name] = {
        accepted: 0,
        rejected: 0,
        total: 0
      };
    });
  
    // Analizar las decisiones de consentimiento
    consents.forEach(consent => {
      // CORRECCIÓN: Acceder a las cookies en la ruta correcta
      if (consent.preferences && consent.preferences.cookies) {
        consent.preferences.cookies.forEach(cookieDecision => {
          // Categorías de cookies
          const cookiesInCategory = cookies.filter(c => c.category === cookieDecision.category);
          cookiesInCategory.forEach(cookie => {
            if (acceptance[cookie.name]) {
              acceptance[cookie.name].total++;
              if (cookieDecision.allowed) {
                acceptance[cookie.name].accepted++;
              } else {
                acceptance[cookie.name].rejected++;
              }
            }
          });
        });
      }
    });
  
    // Calcular tasas de aceptación
    return Object.entries(acceptance).map(([name, stats]) => ({
      name,
      acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
      rejectionRate: stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0,
      total: stats.total
    }));
  }

  // Obtener análisis demográfico
  async getDemographicAnalysis(domainId, options = {}) {
    try {
      // First, find all analytics documents within the date range
      const documents = await Analytics.find({
        domainId,
        'period.start': { $gte: options.startDate },
        'period.end': { $lte: options.endDate }
      });
  
      // Initialize result structure
      const demographics = {
        countries: [],
        devices: [],
        browsers: [],
        platforms: []
      };
      
      // Temporary maps to aggregate data by key
      const countriesMap = new Map();
      const devicesMap = new Map();
      const browsersMap = new Map();
      const platformsMap = new Map();
      
      // Process each document to build our maps
      documents.forEach(doc => {
        // Process countries
        if (doc.demographics && doc.demographics.countries) {
          doc.demographics.countries.forEach(country => {
            const key = `${country.code || 'unknown'}-${country.name || 'Unknown'}`;
            const existing = countriesMap.get(key);
            if (existing) {
              existing.visits += country.visits || 0;
              // Calculate weighted average for acceptance rate based on visit count
              if (country.visits && country.acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - country.visits) / totalVisits;
                const newWeightedRate = (country.acceptanceRate * country.visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              countriesMap.set(key, {
                code: country.code || 'unknown',
                name: country.name || 'Unknown',
                visits: country.visits || 0,
                acceptanceRate: country.acceptanceRate || 0
              });
            }
          });
        }
        
        // Process devices with same logic
        if (doc.demographics && doc.demographics.devices) {
          doc.demographics.devices.forEach(device => {
            const key = device.type || 'unknown';
            const existing = devicesMap.get(key);
            if (existing) {
              existing.visits += device.visits || 0;
              if (device.visits && device.acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - device.visits) / totalVisits;
                const newWeightedRate = (device.acceptanceRate * device.visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              devicesMap.set(key, {
                type: device.type || 'unknown',
                visits: device.visits || 0,
                acceptanceRate: device.acceptanceRate || 0
              });
            }
          });
        }
        
        // Process browsers
        if (doc.demographics && doc.demographics.browsers) {
          doc.demographics.browsers.forEach(browser => {
            const key = `${browser.name || 'unknown'}-${browser.version || '0'}`;
            const existing = browsersMap.get(key);
            if (existing) {
              existing.visits += browser.visits || 0;
              if (browser.visits && browser.acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - browser.visits) / totalVisits;
                const newWeightedRate = (browser.acceptanceRate * browser.visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              browsersMap.set(key, {
                name: browser.name || 'unknown',
                version: browser.version || '0',
                visits: browser.visits || 0,
                acceptanceRate: browser.acceptanceRate || 0
              });
            }
          });
        }
        
        // Process platforms
        if (doc.demographics && doc.demographics.platforms) {
          doc.demographics.platforms.forEach(platform => {
            const key = platform.name || 'unknown';
            const existing = platformsMap.get(key);
            if (existing) {
              existing.visits += platform.visits || 0;
              if (platform.visits && platform.acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - platform.visits) / totalVisits;
                const newWeightedRate = (platform.acceptanceRate * platform.visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              platformsMap.set(key, {
                name: platform.name || 'unknown',
                visits: platform.visits || 0,
                acceptanceRate: platform.acceptanceRate || 0
              });
            }
          });
        }
      });
      
      // Convert maps to arrays and sort by visits (descending)
      demographics.countries = Array.from(countriesMap.values())
        .sort((a, b) => b.visits - a.visits);
      
      demographics.devices = Array.from(devicesMap.values())
        .sort((a, b) => b.visits - a.visits);
      
      demographics.browsers = Array.from(browsersMap.values())
        .sort((a, b) => b.visits - a.visits);
      
      demographics.platforms = Array.from(platformsMap.values())
        .sort((a, b) => b.visits - a.visits);
      
      // Round acceptance rates to 2 decimal places for readability
      demographics.countries.forEach(c => {
        c.acceptanceRate = parseFloat(c.acceptanceRate.toFixed(2));
      });
      
      demographics.devices.forEach(d => {
        d.acceptanceRate = parseFloat(d.acceptanceRate.toFixed(2));
      });
      
      demographics.browsers.forEach(b => {
        b.acceptanceRate = parseFloat(b.acceptanceRate.toFixed(2));
      });
      
      demographics.platforms.forEach(p => {
        p.acceptanceRate = parseFloat(p.acceptanceRate.toFixed(2));
      });
      
      return demographics;
    } catch (error) {
      logger.error('Error getting demographic analysis:', error);
      throw error;
    }
  }

  // Agregar datos de analytics
  async aggregateAnalytics(domainId, startDate, endDate) {
    try {
      const [consentStats, cookieStats, demographics] = await Promise.all([
        this.getConsentStats(domainId, { startDate, endDate }),
        this.getCookieAnalytics(domainId, { startDate, endDate }),
        this.getDemographicAnalysis(domainId, { startDate, endDate })
      ]);

      return {
        consents: consentStats,
        cookies: cookieStats,
        demographics,
        period: {
          start: startDate,
          end: endDate,
          duration: endDate - startDate
        }
      };
    } catch (error) {
      logger.error('Error aggregating analytics:', error);
      throw error;
    }
  }

  // NUEVOS MÉTODOS
  
// Actualizar estadísticas de cookies por categoría - VERSIÓN CORREGIDA
async updateCookieStats(domainId, cookieCategories) {
  try {
    const today = new Date();
    const periodStart = this._getPeriodStart(today);
    const periodEnd = this._getPeriodEnd(today);
    
    // Verificar si existe un documento para este periodo
    let analyticsDoc = await Analytics.findOne({
      domainId,
      'period.start': periodStart,
      'period.end': periodEnd
    });
    
    if (!analyticsDoc) {
      // Si no existe, crear uno nuevo con las categorías iniciales
      const initialData = {
        domainId,
        period: {
          start: periodStart,
          end: periodEnd,
          granularity: 'daily'
        },
        visits: {
          total: 1,
          unique: 1
        },
        interactions: {
          total: 1,
          types: {
            acceptAll: { count: 0, percentage: 0 },
            rejectAll: { count: 0, percentage: 0 },
            customize: { count: 0, percentage: 0 },
            close: { count: 0, percentage: 0 },
            noInteraction: { count: 0, percentage: 0 }
          }
        },
        consents: {
          cookies: cookieCategories.map(cat => ({
            category: cat.category,
            total: 1,
            accepted: cat.allowed ? 1 : 0,
            rejected: cat.allowed ? 0 : 1,
            acceptanceRate: cat.allowed ? 1 : 0
          }))
        }
      };
      
      analyticsDoc = await Analytics.create(initialData);
      logger.info(`Created new analytics document for domain ${domainId}`);
      return true;
    }
    
    // Si existe, actualizar cada categoría
    for (const category of cookieCategories) {
      // Verificar si la estructura del documento es correcta
      if (!analyticsDoc.consents) {
        analyticsDoc.consents = {};
      }
      
      if (!analyticsDoc.consents.cookies || !Array.isArray(analyticsDoc.consents.cookies)) {
        analyticsDoc.consents.cookies = [];
      }
      
      // Buscar la categoría en el array
      const categoryIndex = analyticsDoc.consents.cookies.findIndex(
        c => c && c.category === category.category
      );
      
      if (categoryIndex >= 0) {
        // Actualizar categoría existente
        const existingCategory = analyticsDoc.consents.cookies[categoryIndex];
        existingCategory.total = (existingCategory.total || 0) + 1;
        existingCategory.accepted = (existingCategory.accepted || 0) + (category.allowed ? 1 : 0);
        existingCategory.rejected = (existingCategory.rejected || 0) + (category.allowed ? 0 : 1);
        existingCategory.acceptanceRate = existingCategory.total > 0 ? 
          existingCategory.accepted / existingCategory.total : 0;
      } else {
        // Añadir nueva categoría
        analyticsDoc.consents.cookies.push({
          category: category.category,
          total: 1,
          accepted: category.allowed ? 1 : 0,
          rejected: category.allowed ? 0 : 1,
          acceptanceRate: category.allowed ? 1 : 0
        });
      }
    }
    
    // Guardar el documento actualizado
    await analyticsDoc.save();
    
    return true;
  } catch (error) {
    logger.error('Error updating cookie stats:', error);
    return false;
  }
}
  // Actualizar datos demográficos
  async updateDemographicData(domainId, demographicInfo) {
    try {
      const { country, region, device, browser, platform } = demographicInfo;
      const today = new Date();
      const periodStart = this._getPeriodStart(today);
      const periodEnd = this._getPeriodEnd(today);
      
      // Actualizar países
      if (country) {
        await this._updateDemographicArray(
          domainId, 
          periodStart, 
          periodEnd, 
          'demographics.countries',
          { code: country.code || 'unknown', name: country.name || 'Unknown' }
        );
      }
      
      // Actualizar dispositivos
      if (device) {
        await this._updateDemographicArray(
          domainId, 
          periodStart, 
          periodEnd, 
          'demographics.devices',
          { type: device.type || 'unknown' }
        );
      }
      
      // Actualizar navegadores
      if (browser) {
        await this._updateDemographicArray(
          domainId, 
          periodStart, 
          periodEnd, 
          'demographics.browsers',
          { name: browser.name || 'unknown', version: browser.version || '0' }
        );
      }
      
      // Actualizar plataformas
      if (platform) {
        await this._updateDemographicArray(
          domainId, 
          periodStart, 
          periodEnd, 
          'demographics.platforms',
          { name: platform || 'unknown' }
        );
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating demographic data:', error);
      return false;
    }
  }

  // Método auxiliar para actualizar arrays demográficos
  async _updateDemographicArray(domainId, periodStart, periodEnd, arrayPath, matchFilter) {
    // Crear filtro para buscar el elemento en el array
    const arrayFilters = [];
    const filterObj = {};
    
    // Construir filtro basado en las propiedades del objeto matchFilter
    Object.keys(matchFilter).forEach((key, index) => {
      const filterName = `filter${index}`;
      arrayFilters.push({ [filterName]: matchFilter[key] });
      filterObj[`${arrayPath}.$[${filterName}].${key}`] = matchFilter[key];
    });
    
    // Buscar el documento y ver si el elemento ya existe en el array
    const existingDoc = await Analytics.findOne({
      domainId,
      'period.start': periodStart,
      'period.end': periodEnd,
      ...filterObj
    });
    
    if (existingDoc) {
      // Si existe, incrementar visitas
      return Analytics.updateOne(
        {
          domainId,
          'period.start': periodStart,
          'period.end': periodEnd,
          ...filterObj
        },
        {
          $inc: { [`${arrayPath}.$[elem].visits`]: 1 }
        },
        {
          arrayFilters: [{ "elem": matchFilter }]
        }
      );
    } else {
      // Si no existe, añadir nuevo elemento al array
      const newItem = {
        ...matchFilter,
        visits: 1,
        acceptanceRate: 0,
        customizationRate: 0
      };
      
      return Analytics.updateOne(
        {
          domainId,
          'period.start': periodStart,
          'period.end': periodEnd
        },
        {
          $push: { [arrayPath]: newItem }
        },
        { upsert: true }
      );
    }
  }

  // Actualizar métricas de rendimiento
// Actualizar métricas de rendimiento
async updatePerformanceMetrics(domainId, metrics) {
  try {
    const { loadTime, renderTime, scriptSize, error } = metrics;
    const today = new Date();
    const periodStart = this._getPeriodStart(today);
    const periodEnd = this._getPeriodEnd(today);
    
    // Buscar el documento actual para calcular promedios correctamente
    const currentDoc = await Analytics.findOne({
      domainId,
      'period.start': periodStart,
      'period.end': periodEnd
    });
    
    const updateObj = {
      $setOnInsert: {
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd,
        'period.granularity': 'daily'
      }
    };
    
    // Actualizar tiempos de carga si se proporcionan
    if (loadTime) {
      updateObj.$inc = updateObj.$inc || {};
      updateObj.$inc['performance.loadTime.total'] = loadTime;
      updateObj.$inc['performance.loadTime.count'] = 1;
      
      // Calcular nuevo promedio de carga
      let loadTimeAvg = loadTime; // Valor por defecto si no hay historial
      if (currentDoc && currentDoc.performance && 
          currentDoc.performance.loadTime && 
          currentDoc.performance.loadTime.count > 0) {
        
        const currentTotal = currentDoc.performance.loadTime.total || 0;
        const currentCount = currentDoc.performance.loadTime.count || 0;
        
        // Calcular el nuevo promedio
        loadTimeAvg = (currentTotal + loadTime) / (currentCount + 1);
      }
      
      updateObj.$set = updateObj.$set || {};
      updateObj.$set['performance.loadTime.avg'] = loadTimeAvg;
      
      // Actualizar min y max
      if (!updateObj.$min) updateObj.$min = {};
      if (!updateObj.$max) updateObj.$max = {};
      
      // Solo establecer el mínimo si no existe o si el nuevo valor es menor
      if (!currentDoc || !currentDoc.performance || !currentDoc.performance.loadTime || 
          typeof currentDoc.performance.loadTime.min === 'undefined' || 
          loadTime < currentDoc.performance.loadTime.min) {
        updateObj.$min['performance.loadTime.min'] = loadTime;
      }
      
      // Solo establecer el máximo si no existe o si el nuevo valor es mayor
      if (!currentDoc || !currentDoc.performance || !currentDoc.performance.loadTime || 
          typeof currentDoc.performance.loadTime.max === 'undefined' || 
          loadTime > currentDoc.performance.loadTime.max) {
        updateObj.$max['performance.loadTime.max'] = loadTime;
      }
    }
    
    // Actualizar tiempos de renderizado si se proporcionan
    if (renderTime) {
      updateObj.$inc = updateObj.$inc || {};
      updateObj.$inc['performance.renderTime.total'] = renderTime;
      updateObj.$inc['performance.renderTime.count'] = 1;
      
      // Calcular nuevo promedio de renderizado
      let renderTimeAvg = renderTime; // Valor por defecto si no hay historial
      if (currentDoc && currentDoc.performance && 
          currentDoc.performance.renderTime && 
          currentDoc.performance.renderTime.count > 0) {
        
        const currentTotal = currentDoc.performance.renderTime.total || 0;
        const currentCount = currentDoc.performance.renderTime.count || 0;
        
        // Calcular el nuevo promedio
        renderTimeAvg = (currentTotal + renderTime) / (currentCount + 1);
      }
      
      updateObj.$set = updateObj.$set || {};
      updateObj.$set['performance.renderTime.avg'] = renderTimeAvg;
      
      // Actualizar min y max
      if (!updateObj.$min) updateObj.$min = {};
      if (!updateObj.$max) updateObj.$max = {};
      
      // Solo establecer el mínimo si no existe o si el nuevo valor es menor
      if (!currentDoc || !currentDoc.performance || !currentDoc.performance.renderTime || 
          typeof currentDoc.performance.renderTime.min === 'undefined' || 
          renderTime < currentDoc.performance.renderTime.min) {
        updateObj.$min['performance.renderTime.min'] = renderTime;
      }
      
      // Solo establecer el máximo si no existe o si el nuevo valor es mayor
      if (!currentDoc || !currentDoc.performance || !currentDoc.performance.renderTime || 
          typeof currentDoc.performance.renderTime.max === 'undefined' || 
          renderTime > currentDoc.performance.renderTime.max) {
        updateObj.$max['performance.renderTime.max'] = renderTime;
      }
    }
    
    // Actualizar tamaño del script si se proporciona
    if (scriptSize) {
      updateObj.$set = updateObj.$set || {};
      updateObj.$set['performance.scriptSize.original'] = scriptSize.original || 0;
      updateObj.$set['performance.scriptSize.compressed'] = scriptSize.compressed || 0;
    }
    
    // Registrar error si se proporciona
    if (error) {
      const errorUpdate = {
        type: error.type || 'unknown',
        count: 1,
        lastOccurrence: new Date()
      };
      
      const errorExists = await Analytics.findOne({
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd,
        'performance.errors.type': errorUpdate.type
      });
      
      if (errorExists) {
        // Incrementar contador de error existente
        updateObj.$inc = updateObj.$inc || {};
        updateObj.$inc['performance.errors.$[elem].count'] = 1;
        updateObj.$set = updateObj.$set || {};
        updateObj.$set['performance.errors.$[elem].lastOccurrence'] = new Date();
        
        await Analytics.updateOne(
          {
            domainId,
            'period.start': periodStart,
            'period.end': periodEnd
          },
          updateObj,
          {
            arrayFilters: [{ "elem.type": errorUpdate.type }],
            upsert: true
          }
        );
      } else {
        // Añadir nuevo tipo de error
        updateObj.$push = updateObj.$push || {};
        updateObj.$push['performance.errors'] = errorUpdate;
        
        await Analytics.updateOne(
          {
            domainId,
            'period.start': periodStart,
            'period.end': periodEnd
          },
          updateObj,
          { upsert: true }
        );
      }
    } else {
      // Si no hay error, actualizar normalmente
      await Analytics.updateOne(
        {
          domainId,
          'period.start': periodStart,
          'period.end': periodEnd
        },
        updateObj,
        { upsert: true }
      );
    }
    
    return true;
  } catch (error) {
    logger.error('Error updating performance metrics:', error);
    return false;
  }
}
  
  // Métodos privados existentes
  _getPeriodStart(date = new Date()) {
    return new Date(date.setHours(0, 0, 0, 0));
  }

  _getPeriodEnd(date = new Date()) {
    return new Date(date.setHours(23, 59, 59, 999));
  }

  async _enrichConsentStats(stats) {
    if (!stats) return null;

    const enriched = {
      ...stats,
      rates: {
        acceptanceRate: calculatePercentages(
          stats.interactions.reduce((sum, i) => sum + i.acceptAll, 0),
          stats.totalVisits
        ),
        rejectionRate: calculatePercentages(
          stats.interactions.reduce((sum, i) => sum + i.rejectAll, 0),
          stats.totalVisits
        ),
        customizationRate: calculatePercentages(
          stats.interactions.reduce((sum, i) => sum + i.customize, 0),
          stats.totalVisits
        )
      },
      trends: aggregateByTime(stats.interactions, 'date')
    };

    return enriched;
  }

  _analyzeCookieCategories(cookies) {
    const categories = {};
    cookies.forEach(cookie => {
      categories[cookie.category] = (categories[cookie.category] || 0) + 1;
    });

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: calculatePercentages(count, cookies.length)
    }));
  }

  _analyzeCookiePurposes(cookies) {
    const purposes = {};
    cookies.forEach(cookie => {
      if (cookie.purpose?.id) {
        purposes[cookie.purpose.id] = (purposes[cookie.purpose.id] || 0) + 1;
      }
    });

    return Object.entries(purposes).map(([purposeId, count]) => ({
      purposeId: parseInt(purposeId),
      count,
      percentage: calculatePercentages(count, cookies.length)
    }));
  }

  async _analyzeCookieAcceptance(cookies, consents) {
    const acceptance = {};
    
    // Primero inicializar el objeto para todas las cookies
    cookies.forEach(cookie => {
      acceptance[cookie.name] = {
        accepted: 0,
        rejected: 0,
        total: 0
      };
    });
  
    // Analizar las decisiones de consentimiento
    consents.forEach(consent => {
      // CORRECCIÓN: Acceder a las cookies en la ruta correcta
      if (consent.preferences && consent.preferences.cookies) {
        consent.preferences.cookies.forEach(cookieDecision => {
          // Categorías de cookies
          const cookiesInCategory = cookies.filter(c => c.category === cookieDecision.category);
          cookiesInCategory.forEach(cookie => {
            if (acceptance[cookie.name]) {
              acceptance[cookie.name].total++;
              if (cookieDecision.allowed) {
                acceptance[cookie.name].accepted++;
              } else {
                acceptance[cookie.name].rejected++;
              }
            }
          });
        });
      }
    });
  
    // Calcular tasas de aceptación sin usar _calculatePercentages
    return Object.entries(acceptance).map(([name, stats]) => ({
      name,
      acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
      rejectionRate: stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0,
      total: stats.total
    }));
  }

  _analyzeProviders(cookies) {
    const providers = {};
    cookies.forEach(cookie => {
      if (cookie.provider) {
        if (!providers[cookie.provider]) {
          providers[cookie.provider] = {
            cookies: [],
            categories: new Set()
          };
        }
        providers[cookie.provider].cookies.push(cookie.name);
        providers[cookie.provider].categories.add(cookie.category);
      }
    });

    return Object.entries(providers).map(([provider, data]) => ({
      provider,
      cookieCount: data.cookies.length,
      categories: Array.from(data.categories),
      cookies: data.cookies
    }));
  }

  // Nuevos métodos para analytics.service.js

// Obtener analytics de jornada del usuario
async getUserJourneyAnalytics(domainId, options = {}) {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;
    
    const journeyStats = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate }
        }
      },
      {
        $unwind: '$userJourney.sequences'
      },
      {
        $group: {
          _id: '$userJourney.sequences.action',
          count: { $sum: 1 },
          avgDuration: { $avg: '$userJourney.sequences.durationMs' },
          completionRate: { $avg: '$userJourney.completionRate' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Obtener puntos de abandono
    const abandonmentPoints = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'userJourney.abandonmentPoint': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$userJourney.abandonmentPoint',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return {
      journeyStats,
      abandonmentPoints,
      journeyFlowVisualization: this._generateJourneyFlowData(journeyStats)
    };
  } catch (error) {
    logger.error('Error getting user journey analytics:', error);
    throw error;
  }
}

// Obtener analytics de contexto de sesión
async getSessionContextAnalytics(domainId, options = {}) {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;
    
    // Análisis de páginas de entrada
    const entryPages = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'sessionContext.entryPage': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$sessionContext.entryPage',
          count: { $sum: 1 },
          conversionRate: { $avg: { $cond: [{ $eq: ['$userJourney.sequences.action', 'accept_all'] }, 1, 0] } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);
    
    // Análisis de referrers
    const referrers = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'sessionContext.referrer': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$sessionContext.referrer',
          count: { $sum: 1 },
          conversionRate: { $avg: { $cond: [{ $eq: ['$userJourney.sequences.action', 'accept_all'] }, 1, 0] } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);
    
    // Análisis de profundidad de navegación
    const navigationDepth = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'sessionContext.pagesViewedBefore': { $exists: true }
        }
      },
      {
        $group: {
          _id: { $floor: '$sessionContext.pagesViewedBefore' },
          count: { $sum: 1 },
          acceptanceRate: { $avg: { $cond: [{ $eq: ['$interactions.types.acceptAll.count', 0] }, 0, 1] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return {
      entryPages,
      referrers,
      navigationDepth
    };
  } catch (error) {
    logger.error('Error getting session context analytics:', error);
    throw error;
  }
}

// Obtener métricas de UX
async getUXMetricsAnalytics(domainId, options = {}) {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;
    
    // Velocidad promedio de scroll
    const scrollSpeed = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'uxMetrics.scrollSpeed': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageScrollSpeed: { $avg: '$uxMetrics.scrollSpeed' },
          maxScrollSpeed: { $max: '$uxMetrics.scrollSpeed' },
          minScrollSpeed: { $min: '$uxMetrics.scrollSpeed' }
        }
      }
    ]);
    
    // Elementos con más hover
    const hoverElements = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'uxMetrics.hoverTimes': { $exists: true }
        }
      },
      {
        $unwind: '$uxMetrics.hoverTimes'
      },
      {
        $group: {
          _id: '$uxMetrics.hoverTimes.element',
          avgDuration: { $avg: '$uxMetrics.hoverTimes.durationMs' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { avgDuration: -1 }
      }
    ]);
    
    // Indecisión promedio
    const indecisionScore = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'uxMetrics.indecisionScore': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageIndecision: { $avg: '$uxMetrics.indecisionScore' }
        }
      }
    ]);
    
    // Tiempo de lectura
    const readingTime = await Analytics.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'uxMetrics.readingTime': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageReadingTime: { $avg: '$uxMetrics.readingTime' },
          maxReadingTime: { $max: '$uxMetrics.readingTime' },
          users: { $sum: 1 }
        }
      }
    ]);
    
    return {
      scrollSpeed: scrollSpeed[0] || { averageScrollSpeed: 0 },
      hoverElements,
      indecisionScore: indecisionScore[0] || { averageIndecision: 0 },
      readingTime: readingTime[0] || { averageReadingTime: 0 }
    };
  } catch (error) {
    logger.error('Error getting UX metrics analytics:', error);
    throw error;
  }
}

// Obtener resultados de test A/B
async getABTestResults(domainId, options = {}) {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      variantId = null
    } = options;
    
    const matchCriteria = {
      domainId: mongoose.Types.ObjectId(domainId),
      'period.start': { $gte: startDate },
      'period.end': { $lte: endDate },
      'abTestData': { $exists: true }
    };
    
    if (variantId) {
      matchCriteria['abTestData.variantId'] = variantId;
    }
    
    // Resultados por variante
    const variantResults = await Analytics.aggregate([
      {
        $match: matchCriteria
      },
      {
        $group: {
          _id: '$abTestData.variantId',
          total: { $sum: 1 },
          acceptances: { $sum: { $cond: [{ $eq: ['$interactions.types.acceptAll.count', 0] }, 0, 1] } },
          customizations: { $sum: { $cond: [{ $eq: ['$interactions.types.customize.count', 0] }, 0, 1] } },
          avgTimeToDecision: { $avg: '$interactions.metrics.avgTimeToDecision' }
        }
      },
      {
        $project: {
          _id: 0,
          variantId: '$_id',
          total: 1,
          acceptances: 1,
          customizations: 1,
          acceptanceRate: { $multiply: [{ $divide: ['$acceptances', '$total'] }, 100] },
          customizationRate: { $multiply: [{ $divide: ['$customizations', '$total'] }, 100] },
          avgTimeToDecision: 1
        }
      },
      {
        $sort: { acceptanceRate: -1 }
      }
    ]);
    
    // Comparación control vs test
    const controlVsTest = await Analytics.aggregate([
      {
        $match: matchCriteria
      },
      {
        $group: {
          _id: '$abTestData.controlGroup',
          total: { $sum: 1 },
          acceptances: { $sum: { $cond: [{ $eq: ['$interactions.types.acceptAll.count', 0] }, 0, 1] } }
        }
      },
      {
        $project: {
          _id: 0,
          isControl: '$_id',
          total: 1,
          acceptances: 1,
          acceptanceRate: { $multiply: [{ $divide: ['$acceptances', '$total'] }, 100] }
        }
      }
    ]);
    
    return {
      variantResults,
      controlVsTest,
      significanceTest: this._calculateStatisticalSignificance(controlVsTest)
    };
  } catch (error) {
    logger.error('Error getting A/B test results:', error);
    throw error;
  }
}

// Generar datos para visualización de flujo de jornada
_generateJourneyFlowData(journeyStats) {
  // Función simplificada - en la implementación real sería más compleja
  const nodes = journeyStats.map(stat => ({
    id: stat._id,
    value: stat.count
  }));
  
  // Enlaces entre nodos (simplificado)
  const links = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    links.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      value: Math.min(nodes[i].value, nodes[i + 1].value)
    });
  }
  
  return { nodes, links };
}

// Calcular significancia estadística para tests A/B
_calculateStatisticalSignificance(controlVsTest) {
  // Implementación simplificada - en producción usar bibliotecas estadísticas
  if (!controlVsTest || controlVsTest.length < 2) {
    return { significant: false, confidence: 0, pValue: 1 };
  }
  
  const control = controlVsTest.find(group => group.isControl);
  const test = controlVsTest.find(group => !group.isControl);
  
  if (!control || !test) {
    return { significant: false, confidence: 0, pValue: 1 };
  }
  
  // Método simplificado para chi-cuadrado
  const controlAcceptances = control.acceptances;
  const controlRejections = control.total - control.acceptances;
  const testAcceptances = test.acceptances;
  const testRejections = test.total - test.acceptances;
  
  const totalAcceptances = controlAcceptances + testAcceptances;
  const totalRejections = controlRejections + testRejections;
  const totalSamples = control.total + test.total;
  
  const expectedControlAcceptances = (control.total * totalAcceptances) / totalSamples;
  const expectedControlRejections = (control.total * totalRejections) / totalSamples;
  const expectedTestAcceptances = (test.total * totalAcceptances) / totalSamples;
  const expectedTestRejections = (test.total * totalRejections) / totalSamples;
  
  const chiSquared = 
    Math.pow(controlAcceptances - expectedControlAcceptances, 2) / expectedControlAcceptances +
    Math.pow(controlRejections - expectedControlRejections, 2) / expectedControlRejections +
    Math.pow(testAcceptances - expectedTestAcceptances, 2) / expectedTestAcceptances +
    Math.pow(testRejections - expectedTestRejections, 2) / expectedTestRejections;
  
  // Valor p aproximado para chi-cuadrado con 1 grado de libertad
  let pValue = 1;
  const significant = chiSquared > 3.84; // Umbral para p=0.05 con 1 grado de libertad
  
  if (chiSquared > 10.83) pValue = 0.001;
  else if (chiSquared > 6.64) pValue = 0.01;
  else if (chiSquared > 3.84) pValue = 0.05;
  else if (chiSquared > 2.71) pValue = 0.1;
  
  return {
    significant,
    confidence: significant ? 95 : Math.round((1 - pValue) * 100),
    pValue,
    chiSquared
  };
}
}

module.exports = new AnalyticsService();