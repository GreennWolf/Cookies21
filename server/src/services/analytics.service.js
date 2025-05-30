const Analytics = require('../models/Analytics');
const Consent = require('../models/ConsentLog');
const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { aggregateByTime, calculatePercentages } = require('../utils/analyticHelpers');

class AnalyticsService {
  constructor() {
    // Cache para controlar visitantes únicos
    this._uniqueVisitorCache = new Map();
    
    // Limpiar caché automáticamente cada día
    setInterval(() => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      // Eliminar entradas de más de un día
      this._uniqueVisitorCache.forEach((timestamp, key) => {
        if (now - timestamp > oneDayMs) {
          this._uniqueVisitorCache.delete(key);
        }
      });
      
      logger.info(`Limpieza de caché de visitantes únicos completada. Entradas restantes: ${this._uniqueVisitorCache.size}`);
    }, 3600000); // Verificar cada hora
  }

  // Analizar cambios en cookies detectados durante un escaneo
  async analyzeCookieChanges(domainId, findings) {
    try {
      logger.info(`Analizando cambios de cookies para dominio ${domainId}`);
      
      if (!findings || !findings.cookies) {
        logger.warn('No se encontraron cookies en los findings');
        return {
          newCookies: [],
          modifiedCookies: [],
          removedCookies: [],
          totalChanges: 0
        };
      }

      // Obtener cookies existentes del dominio
      const existingCookies = await Cookie.find({ domainId });
      const existingCookieMap = new Map();
      
      existingCookies.forEach(cookie => {
        const key = `${cookie.name}-${cookie.domain}`;
        existingCookieMap.set(key, cookie);
      });

      const newCookies = [];
      const modifiedCookies = [];
      const scanCookieKeys = new Set();

      // Analizar cookies encontradas en el escaneo
      for (const foundCookie of findings.cookies) {
        const key = `${foundCookie.name}-${foundCookie.domain}`;
        scanCookieKeys.add(key);
        
        const existingCookie = existingCookieMap.get(key);
        
        if (!existingCookie) {
          // Cookie nueva
          newCookies.push({
            name: foundCookie.name,
            domain: foundCookie.domain,
            category: foundCookie.category || 'other',
            value: foundCookie.value,
            expires: foundCookie.expires,
            httpOnly: foundCookie.httpOnly,
            secure: foundCookie.secure,
            sameSite: foundCookie.sameSite,
            path: foundCookie.path || '/'
          });
        } else {
          // Verificar si la cookie ha sido modificada
          const hasChanges = 
            existingCookie.value !== foundCookie.value ||
            existingCookie.expires !== foundCookie.expires ||
            existingCookie.httpOnly !== foundCookie.httpOnly ||
            existingCookie.secure !== foundCookie.secure ||
            existingCookie.sameSite !== foundCookie.sameSite;

          if (hasChanges) {
            modifiedCookies.push({
              name: foundCookie.name,
              domain: foundCookie.domain,
              changes: {
                value: { old: existingCookie.value, new: foundCookie.value },
                expires: { old: existingCookie.expires, new: foundCookie.expires },
                httpOnly: { old: existingCookie.httpOnly, new: foundCookie.httpOnly },
                secure: { old: existingCookie.secure, new: foundCookie.secure },
                sameSite: { old: existingCookie.sameSite, new: foundCookie.sameSite }
              }
            });
          }
        }
      }

      // Detectar cookies removidas (que existían antes pero no están en el escaneo)
      const removedCookies = [];
      existingCookies.forEach(cookie => {
        const key = `${cookie.name}-${cookie.domain}`;
        if (!scanCookieKeys.has(key)) {
          removedCookies.push({
            name: cookie.name,
            domain: cookie.domain,
            category: cookie.category,
            lastSeen: cookie.lastSeen || cookie.updatedAt
          });
        }
      });

      const result = {
        newCookies,
        modifiedCookies,
        removedCookies,
        totalChanges: newCookies.length + modifiedCookies.length + removedCookies.length,
        summary: {
          newCount: newCookies.length,
          modifiedCount: modifiedCookies.length,
          removedCount: removedCookies.length
        }
      };

      logger.info(`Análisis de cambios completado: ${result.totalChanges} cambios detectados`, result.summary);
      return result;

    } catch (error) {
      logger.error('Error analizando cambios de cookies:', error);
      throw error;
    }
  }
  // Registrar interacción con el banner - VERSIÓN MEJORADA
  async trackBannerInteraction(data) {
    try {
      const {
        domainId,
        action,
        timeToDecision,
        customization,
        metadata
      } = data;

      if (!domainId) {
        logger.error('No se proporcionó domainId para trackBannerInteraction');
        return false;
      }

      // Mapeo de acciones de interacción a campos en el modelo Analytics
      // Aquí normalizamos el formato de action para que coincida con el schema
      let normalizedAction = action;
      if (action === 'accept_all') normalizedAction = 'acceptAll';
      if (action === 'reject_all' || action === 'revoke') normalizedAction = 'rejectAll';
      if (action === 'save_preferences') normalizedAction = 'customize';
      if (action === 'no_interaction') normalizedAction = 'noInteraction';

      // Preparar actualizaciones para visitas e interacciones
      const updates = {
        $inc: {
          'visits.total': 1,
          'interactions.total': 1
        },
        $push: {
          'interactions.details': {
            action: normalizedAction,
            timeToDecision,
            timestamp: new Date(),
            metadata
          }
        }
      };

      // Incrementar contador específico según la acción
      if (normalizedAction && ['acceptAll', 'rejectAll', 'customize', 'close', 'noInteraction'].includes(normalizedAction)) {
        updates.$inc[`interactions.types.${normalizedAction}.count`] = 1;
      }

      // Si hay customización, incrementar ese contador también
      if (customization) {
        updates.$inc['interactions.types.customize.count'] = 1;
      }

      // Si tenemos userId en metadata, registrar visita única
      if (metadata && metadata.userId) {
        // Verificar si este usuario ya ha sido contado hoy
        const today = new Date();
        const visitorKey = `${domainId}:${metadata.userId}`;
        
        // Si es un visitante único, incrementar el contador
        if (!this._uniqueVisitorCache.has(visitorKey)) {
          updates.$inc['visits.unique'] = 1;
          
          // Añadir a la cache con timestamp
          this._uniqueVisitorCache.set(visitorKey, today.getTime());
          
          // Si conocemos el tipo de regulación, incrementar el contador específico
          if (metadata.regulation && metadata.regulation.type) {
            const regulationType = metadata.regulation.type.toLowerCase();
            if (['gdpr', 'ccpa', 'lgpd'].includes(regulationType)) {
              updates.$inc[`visits.byRegulation.${regulationType}`] = 1;
            } else {
              updates.$inc['visits.byRegulation.other'] = 1;
            }
          } else {
            // Por defecto asumimos GDPR para Europa
            updates.$inc['visits.byRegulation.gdpr'] = 1;
          }
        }
      }
      
      // Si tenemos tiempo de decisión, actualizar métricas
      if (typeof timeToDecision === 'number' && timeToDecision > 0) {
        const existingDoc = await Analytics.findOne({
          domainId,
          'period.start': this._getPeriodStart(),
          'period.end': this._getPeriodEnd()
        });
        
        if (existingDoc && existingDoc.interactions && existingDoc.interactions.metrics) {
          // Calcular nuevo promedio
          const currentAvg = existingDoc.interactions.metrics.avgTimeToDecision || 0;
          const currentCount = existingDoc.interactions.total || 0;
          
          if (currentCount > 0) {
            const newAvg = ((currentAvg * currentCount) + timeToDecision) / (currentCount + 1);
            updates.$set = updates.$set || {};
            updates.$set['interactions.metrics.avgTimeToDecision'] = Math.round(newAvg);
          }
        } else {
          // Si no hay documento previo, el promedio es el valor actual
          updates.$set = updates.$set || {};
          updates.$set['interactions.metrics.avgTimeToDecision'] = timeToDecision;
        }
      }

      // Actualizar documento con todos los contadores
      const result = await Analytics.findOneAndUpdate(
        {
          domainId,
          'period.start': this._getPeriodStart(),
          'period.end': this._getPeriodEnd(),
          'period.granularity': 'daily'
        },
        updates,
        { upsert: true, new: true }
      );
      
      // Actualizar los porcentajes después de la actualización
      await this._updateInteractionPercentages(domainId);
      
      logger.info(`Banner interaction tracked successfully for domain ${domainId}, action: ${action}`);
      return true;
    } catch (error) {
      logger.error('Error tracking banner interaction:', error);
      return false;
    }
  }

  // Obtener estadísticas de consentimiento - Método mejorado que utiliza ConsentLog directamente
  async getConsentStats(domainId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      granularity = 'daily'
    } = options;

    try {
      console.log('📊 SERVIDOR: Obteniendo estadísticas de consentimiento utilizando ConsentLog directamente');
      console.log(`🔍 SERVIDOR: domainId: ${domainId}, período: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      // 1. Obtener datos directamente desde ConsentLog por tipo de interacción
      const consentStats = await Consent.getConsentStats(
        domainId,
        startDate,
        endDate
      );
      
      console.log(`✅ SERVIDOR: Datos de ConsentLog obtenidos:`, JSON.stringify(consentStats, null, 2));
      
      // 2. Extraer datos de Analytics como respaldo/complemento
      let analyticsStats = {};
      try {
        const stats = await Analytics.aggregate([
          {
            $match: {
              domainId: mongoose.Types.ObjectId(domainId),
              'period.start': { $gte: startDate },
              'period.end': { $lte: endDate },
              'period.granularity': granularity
            }
          },
          {
            $group: {
              _id: null,
              totalVisits: { $sum: '$visits.total' },
              uniqueVisitors: { $sum: '$visits.unique' }
            }
          }
        ]);
        
        if (stats && stats.length > 0) {
          analyticsStats = stats[0];
          console.log(`✅ SERVIDOR: Datos complementarios de Analytics obtenidos:`, JSON.stringify(analyticsStats, null, 2));
        } else {
          console.log(`⚠️ SERVIDOR: No se encontraron datos complementarios en Analytics`);
        }
      } catch (analyticsError) {
        console.error('❌ SERVIDOR: Error obteniendo datos complementarios de Analytics:', analyticsError.message);
      }
      
      // 3. Construir estructura de respuesta combinando ambas fuentes
      // Procesar datos para interacciones
      let totalInteractions = 0;
      const interactions = {};
      
      consentStats.forEach(stat => {
        const type = stat.type || 'unknown';
        interactions[type] = {
          count: stat.count || 0,
          percentage: 0, // Se calculará después
          avgTimeToDecision: stat.avgTimeToDecision || 0
        };
        totalInteractions += stat.count || 0;
      });
      
      // Calcular porcentajes de interacciones
      if (totalInteractions > 0) {
        Object.keys(interactions).forEach(type => {
          interactions[type].percentage = 
            (interactions[type].count / totalInteractions) * 100;
        });
      }
      
      // Añadir datos de tendencia por fechas
      const trends = await this._getConsentTrendsByDate(domainId, startDate, endDate);
      
      // Estructura esperada por el frontend: necesitamos rates y trends
      // Ver /front/src/components/analytics/ConsentStats.jsx
      const result = {
        totalVisits: analyticsStats.totalVisits || totalInteractions || 0,
        uniqueVisitors: analyticsStats.uniqueVisitors || totalInteractions || 0,
        // Aquí está el formato que espera el frontend para las tasas
        rates: {
          acceptanceRate: (interactions['accept_all']?.percentage || 0),
          rejectionRate: (interactions['reject_all']?.percentage || 0),
          customizationRate: (interactions['save_preferences']?.percentage || 0)
        },
        // El frontend espera un array con objetos que tengan propiedades like:
        // {date: '2023-01-01', acceptAll: 50, rejectAll: 30, customize: 20}
        trends: trends,
        // Guardar también las interacciones originales por si son útiles
        interactions: interactions,
        rawData: {
          consentStats,
          analyticsStats
        }
      };
      
      console.log(`📊 SERVIDOR: Estructura final para el frontend:`, JSON.stringify({
        rates: result.rates,
        trends: result.trends?.length > 0 ? [result.trends[0]] : [],
        interactions: result.interactions
      }, null, 2));
      
      return result;
    } catch (error) {
      logger.error('Error getting consent stats:', error);
      // Devolver una estructura vacía pero válida en caso de error
      return {
        totalVisits: 0,
        uniqueVisitors: 0,
        rates: {
          acceptanceRate: 0,
          rejectionRate: 0,
          customizationRate: 0
        },
        trends: [],
        interactions: {}
      };
    }
  }
  
  // Método auxiliar para obtener tendencias de consentimientos por fecha
  async _getConsentTrendsByDate(domainId, startDate, endDate) {
    try {
      // Agrupar consentimientos por día y tipo de interacción
      const consentTrends = await Consent.aggregate([
        {
          $match: {
            domainId: mongoose.Types.ObjectId(domainId),
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: "$bannerInteraction.type"
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.date": 1 }
        }
      ]);
      
      console.log(`✅ SERVIDOR: Datos de tendencias por día obtenidos:`, JSON.stringify(consentTrends.slice(0, 2), null, 2));
      
      // Transformar los datos agrupados a la estructura esperada por el frontend
      const trendData = {};
      let totalByDate = {};
      
      // Primero sumamos el total por fecha para calcular porcentajes
      consentTrends.forEach(item => {
        const date = item._id.date;
        const count = item.count || 0;
        
        totalByDate[date] = (totalByDate[date] || 0) + count;
      });
      
      // Ahora calculamos los valores para cada tipo por día
      consentTrends.forEach(item => {
        const date = item._id.date;
        const type = item._id.type || 'unknown';
        const count = item.count || 0;
        const total = totalByDate[date] || 1; // Evitar división por cero
        
        if (!trendData[date]) {
          trendData[date] = {
            date: new Date(date),
            // Estos son los nombres que espera el frontend en ConsentStats.jsx
            acceptAll: 0,
            rejectAll: 0, 
            customize: 0
          };
        }
        
        // Mapear tipos de interacción a los nombres esperados por el frontend
        // y convertir a porcentajes
        if (type === 'accept_all') {
          trendData[date].acceptAll = (count / total) * 100;
        } else if (type === 'reject_all') {
          trendData[date].rejectAll = (count / total) * 100;
        } else if (type === 'save_preferences') {
          trendData[date].customize = (count / total) * 100;
        }
        // Otros tipos como 'close' o 'no_interaction' no se muestran en el gráfico
      });
      
      // Convertir a array y ordenar por fecha
      const result = Object.values(trendData).sort((a, b) => a.date - b.date);
      console.log(`✅ SERVIDOR: Datos de tendencias procesados para frontend:`, 
                  JSON.stringify(result.length > 0 ? [result[0]] : [], null, 2));
      return result;
    } catch (error) {
      console.error('Error obteniendo tendencias de consentimiento:', error);
      return [];
    }
  }

  // Obtener análisis de cookies
  async getCookieAnalytics(domainId, options = {}) {
    try {
      const cookies = await Cookie.find({ domainId: mongoose.Types.ObjectId(domainId) });
      const consents = await Consent.find({ 
        domainId: mongoose.Types.ObjectId(domainId),
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
      // Set default dates if not provided - Ampliamos el rango para capturar más datos
      const startDate = options.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default a 90 días atrás
      const endDate = options.endDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default a mañana
      
      // Verificar si el domainId es válido
      if (!domainId) {
        logger.error('getDemographicAnalysis: No se proporcionó un domainId válido');
        return {
          countries: [],
          devices: [],
          browsers: [],
          platforms: []
        };
      }
      
      // Crear query para buscar documentos - Hacemos la consulta más flexible
      // Solo filtramos por domainId sin restricciones de fechas para capturar más datos
      const query = {};
      
      // Validar y convertir domainId a ObjectId adecuadamente
      try {
        if (domainId && domainId.trim() !== '') {
          query.domainId = mongoose.Types.ObjectId(domainId);
        } else {
          logger.error('getDemographicAnalysis: domainId inválido o nulo');
          throw new Error('Invalid domainId');
        }
      } catch (idError) {
        logger.error(`Error al convertir domainId a ObjectId: ${idError.message}`);
        throw new Error(`Invalid domainId format: ${domainId}`);
      }
      
      // Log de la consulta para depuración
      logger.info(`[getDemographicAnalysis] Query flexible: ${JSON.stringify(query)}`);
      
      // First, find all analytics documents with the query - Usamos .lean() para mejor rendimiento
      const documents = await Analytics.find(query).sort({ 'period.start': -1 }).lean();
      
      // Log the number of documents found for debugging
      console.log(`[getDemographicAnalysis] Found ${documents.length} analytics documents for domainId ${domainId}`);
      
      // Si no hay documentos, intentar buscar con cualquier fecha
      if (documents.length === 0) {
        console.log(`[getDemographicAnalysis] No se encontraron documentos con filtros. Buscando sin filtros de fecha...`);
        // Intentamos obtener directamente el último registro con ObjectId válido
        try {
          const latestDoc = await Analytics.findOne({ domainId: mongoose.Types.ObjectId(domainId) }).sort({ createdAt: -1 }).lean();
          if (latestDoc) {
            console.log(`[getDemographicAnalysis] Encontrado documento sin filtros: ${latestDoc._id}`);
            // Si encontramos un documento, lo agregamos a nuestra lista
            documents.push(latestDoc);
          } else {
            console.log('[getDemographicAnalysis] No se encontró ningún documento sin filtros');
          }
        } catch (idError) {
          console.error(`[getDemographicAnalysis] Error al obtener documento sin filtros: ${idError.message}`);
        }
      }
  
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
        // Process countries with more robust handling
        if (doc.demographics && doc.demographics.countries) {
          // Make sure countries is an array
          const countries = Array.isArray(doc.demographics.countries) ? 
            doc.demographics.countries : [];
          
          countries.forEach(country => {
            // Skip invalid country objects
            if (!country || typeof country !== 'object') return;
            
            // Safely extract country data with defaults
            const countryCode = typeof country.code === 'string' ? country.code : 'unknown';
            const countryName = typeof country.name === 'string' ? country.name : 'Unknown';
            const visits = typeof country.visits === 'number' ? country.visits : 0;
            const acceptanceRate = typeof country.acceptanceRate === 'number' ? country.acceptanceRate : 0;
            
            const key = `${countryCode}-${countryName}`;
            const existing = countriesMap.get(key);
            
            if (existing) {
              existing.visits += visits;
              // Calculate weighted average for acceptance rate based on visit count
              if (visits > 0 && acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - visits) / totalVisits;
                const newWeightedRate = (acceptanceRate * visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              countriesMap.set(key, {
                code: countryCode,
                name: countryName,
                visits: visits,
                acceptanceRate: acceptanceRate
              });
            }
          });
        }
        
        // Process devices with more robust handling for Schema.Types.Mixed
        if (doc.demographics && doc.demographics.devices) {
          // Handle different possible formats of the devices data after schema change
          const devices = doc.demographics.devices;
          
          // Case 1: If devices is an array (original expected format)
          if (Array.isArray(devices)) {
            devices.forEach(device => {
              // Safely access properties with fallbacks
              if (device && typeof device === 'object') {
                const key = device.type || 'unknown';
                const visits = typeof device.visits === 'number' ? device.visits : 0;
                const acceptanceRate = typeof device.acceptanceRate === 'number' ? device.acceptanceRate : 0;
                
                const existing = devicesMap.get(key);
                if (existing) {
                  existing.visits += visits;
                  if (visits && acceptanceRate !== undefined) {
                    const totalVisits = existing.visits;
                    const prevWeightedRate = existing.acceptanceRate * (totalVisits - visits) / totalVisits;
                    const newWeightedRate = (acceptanceRate * visits) / totalVisits;
                    existing.acceptanceRate = prevWeightedRate + newWeightedRate;
                  }
                } else {
                  devicesMap.set(key, {
                    type: key,
                    visits: visits,
                    acceptanceRate: acceptanceRate
                  });
                }
              }
            });
          } 
          // Case 2: If devices is an object (could happen with Schema.Types.Mixed)
          else if (devices && typeof devices === 'object' && !Array.isArray(devices)) {
            // Try to extract device data from object format
            Object.entries(devices).forEach(([key, value]) => {
              if (value && typeof value === 'object') {
                // If value is an object with device properties
                const deviceType = value.type || key || 'unknown';
                const visits = typeof value.visits === 'number' ? value.visits : 0;
                const acceptanceRate = typeof value.acceptanceRate === 'number' ? value.acceptanceRate : 0;
                
                const existing = devicesMap.get(deviceType);
                if (existing) {
                  existing.visits += visits;
                  // Update weighted acceptance rate
                  if (visits > 0) {
                    const totalVisits = existing.visits;
                    const prevWeightedRate = existing.acceptanceRate * (totalVisits - visits) / totalVisits;
                    const newWeightedRate = (acceptanceRate * visits) / totalVisits;
                    existing.acceptanceRate = prevWeightedRate + newWeightedRate;
                  }
                } else {
                  devicesMap.set(deviceType, {
                    type: deviceType,
                    visits: visits,
                    acceptanceRate: acceptanceRate
                  });
                }
              } 
              // If the value is a primitive (like a count)
              else if (typeof value === 'number') {
                const deviceType = key;
                const visits = value;
                
                const existing = devicesMap.get(deviceType);
                if (existing) {
                  existing.visits += visits;
                } else {
                  devicesMap.set(deviceType, {
                    type: deviceType,
                    visits: visits,
                    acceptanceRate: 0
                  });
                }
              }
            });
          }
        }
        
        // Process browsers with more robust handling
        if (doc.demographics && doc.demographics.browsers) {
          // Make sure browsers is an array
          const browsers = Array.isArray(doc.demographics.browsers) ? 
            doc.demographics.browsers : [];
          
          browsers.forEach(browser => {
            // Skip invalid browser objects
            if (!browser || typeof browser !== 'object') return;
            
            // Safely extract browser data with defaults
            const browserName = typeof browser.name === 'string' ? browser.name : 'unknown';
            const browserVersion = typeof browser.version === 'string' ? browser.version : '0';
            const visits = typeof browser.visits === 'number' ? browser.visits : 0;
            const acceptanceRate = typeof browser.acceptanceRate === 'number' ? browser.acceptanceRate : 0;
            
            const key = `${browserName}-${browserVersion}`;
            const existing = browsersMap.get(key);
            
            if (existing) {
              existing.visits += visits;
              if (visits > 0 && acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - visits) / totalVisits;
                const newWeightedRate = (acceptanceRate * visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              browsersMap.set(key, {
                name: browserName,
                version: browserVersion,
                visits: visits,
                acceptanceRate: acceptanceRate
              });
            }
          });
        }
        
        // Process platforms with more robust handling
        if (doc.demographics && doc.demographics.platforms) {
          // Make sure platforms is an array
          const platforms = Array.isArray(doc.demographics.platforms) ? 
            doc.demographics.platforms : [];
          
          platforms.forEach(platform => {
            // Skip invalid platform objects
            if (!platform || typeof platform !== 'object') return;
            
            // Safely extract platform data with defaults
            const platformName = typeof platform.name === 'string' ? platform.name : 'unknown';
            const visits = typeof platform.visits === 'number' ? platform.visits : 0;
            const acceptanceRate = typeof platform.acceptanceRate === 'number' ? platform.acceptanceRate : 0;
            
            const key = platformName;
            const existing = platformsMap.get(key);
            
            if (existing) {
              existing.visits += visits;
              if (visits > 0 && acceptanceRate !== undefined) {
                const totalVisits = existing.visits;
                const prevWeightedRate = existing.acceptanceRate * (totalVisits - visits) / totalVisits;
                const newWeightedRate = (acceptanceRate * visits) / totalVisits;
                existing.acceptanceRate = prevWeightedRate + newWeightedRate;
              }
            } else {
              platformsMap.set(key, {
                name: platformName,
                visits: visits,
                acceptanceRate: acceptanceRate
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
      
      // Add defensive rounding to avoid NaN or undefined values
      // Round acceptance rates to 2 decimal places for readability
      demographics.countries.forEach(c => {
        if (typeof c.acceptanceRate === 'number' && !isNaN(c.acceptanceRate)) {
          c.acceptanceRate = parseFloat(c.acceptanceRate.toFixed(2));
        } else {
          c.acceptanceRate = 0; // Default to 0 for invalid values
        }
        
        // Asegurar que todos los países tienen customizationRate
        if (typeof c.customizationRate !== 'number' || isNaN(c.customizationRate)) {
          c.customizationRate = 0;
        } else {
          c.customizationRate = parseFloat(c.customizationRate.toFixed(2));
        }
      });
      
      demographics.devices.forEach(d => {
        if (typeof d.acceptanceRate === 'number' && !isNaN(d.acceptanceRate)) {
          d.acceptanceRate = parseFloat(d.acceptanceRate.toFixed(2));
        } else {
          d.acceptanceRate = 0; // Default to 0 for invalid values
        }
        
        // Asegurar que todos los dispositivos tienen customizationRate
        if (typeof d.customizationRate !== 'number' || isNaN(d.customizationRate)) {
          d.customizationRate = 0;
        } else {
          d.customizationRate = parseFloat(d.customizationRate.toFixed(2));
        }
      });
      
      demographics.browsers.forEach(b => {
        if (typeof b.acceptanceRate === 'number' && !isNaN(b.acceptanceRate)) {
          b.acceptanceRate = parseFloat(b.acceptanceRate.toFixed(2));
        } else {
          b.acceptanceRate = 0; // Default to 0 for invalid values
        }
      });
      
      demographics.platforms.forEach(p => {
        if (typeof p.acceptanceRate === 'number' && !isNaN(p.acceptanceRate)) {
          p.acceptanceRate = parseFloat(p.acceptanceRate.toFixed(2));
        } else {
          p.acceptanceRate = 0; // Default to 0 for invalid values
        }
      });
      
      // Enriquecemos los datos para asegurar que todos los campos necesarios están presentes
      // Aseguramos que cada país tiene todos los campos necesarios
      demographics.countries = demographics.countries.map(country => ({
        code: country.code || 'unknown',
        name: country.name || 'Desconocido',
        visits: country.visits || 0,
        acceptanceRate: typeof country.acceptanceRate === 'number' ? country.acceptanceRate : 0,
        customizationRate: typeof country.customizationRate === 'number' ? country.customizationRate : 0
      }));
      
      // Lo mismo para dispositivos
      demographics.devices = demographics.devices.map(device => ({
        type: device.type || 'unknown',
        visits: device.visits || 0,
        acceptanceRate: typeof device.acceptanceRate === 'number' ? device.acceptanceRate : 0,
        customizationRate: typeof device.customizationRate === 'number' ? device.customizationRate : 0
      }));
      
      // Y navegadores
      demographics.browsers = demographics.browsers.map(browser => ({
        name: browser.name || 'unknown',
        version: browser.version || '0',
        visits: browser.visits || 0,
        acceptanceRate: typeof browser.acceptanceRate === 'number' ? browser.acceptanceRate : 0
      }));
      
      // Y plataformas
      demographics.platforms = demographics.platforms.map(platform => ({
        name: platform.name || 'unknown',
        visits: platform.visits || 0,
        acceptanceRate: typeof platform.acceptanceRate === 'number' ? platform.acceptanceRate : 0
      }));
      
      // Log successful processing and data size for debugging
      logger.info(`Demographics data processed successfully for domainId: ${domainId}`, {
        countriesCount: demographics.countries.length,
        devicesCount: demographics.devices.length,
        browsersCount: demographics.browsers.length,
        platformsCount: demographics.platforms.length
      });
      
      return demographics;
    } catch (error) {
      logger.error(`Error in getDemographicAnalysis for domainId ${domainId}:`, error);
      
      // Return empty but valid structure when errors occur - 
      // this prevents frontend from crashing when there's a data issue
      return {
        countries: [],
        devices: [],
        browsers: [],
        platforms: []
      };
    }
  }

  // Agregar datos de analytics
  async aggregateAnalytics(domainId, startDate, endDate) {
    try {
      console.log('💠 Agregando analíticas para dominio:', domainId);
      console.log(`💠 Período: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      // Realizar todas las solicitudes en paralelo con try/catch independientes
      let consentStats = {}, cookieStats = {}, demographics = {};
      
      try {
        consentStats = await this.getConsentStats(domainId, { startDate, endDate });
        console.log('✅ Estadísticas de consentimiento obtenidas');
      } catch (consentError) {
        console.error('❌ Error obteniendo estadísticas de consentimiento:', consentError.message);
        consentStats = {};
      }
      
      try {
        cookieStats = await this.getCookieAnalytics(domainId, { startDate, endDate });
        console.log('✅ Estadísticas de cookies obtenidas');
      } catch (cookieError) {
        console.error('❌ Error obteniendo estadísticas de cookies:', cookieError.message);
        cookieStats = {
          categories: [],
          purposes: [],
          acceptance: [],
          providers: []
        };
      }
      
      try {
        demographics = await this.getDemographicAnalysis(domainId, { startDate, endDate });
        console.log('✅ Datos demográficos obtenidos');
      } catch (demoError) {
        console.error('❌ Error obteniendo datos demográficos:', demoError.message);
        demographics = {
          countries: [],
          devices: [],
          browsers: [],
          platforms: []
        };
      }

      console.log('💠 Agregación completada correctamente');
      
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
      // Devolver estructura válida aunque haya error
      return {
        consents: {},
        cookies: {
          categories: [],
          purposes: [],
          acceptance: [],
          providers: []
        },
        demographics: {
          countries: [],
          devices: [],
          browsers: [],
          platforms: []
        },
        period: {
          start: startDate,
          end: endDate,
          duration: endDate - startDate
        }
      };
    }
  }

  // Método directo para extraer análisis demográficos por domainId
  async getDirectDemographics(domainId) {
    try {
      console.log(`⚡ Extrayendo datos demográficos directamente para dominio: ${domainId}`);
      
      // Obtener todos los documentos de analytics para este dominio
      const documents = await Analytics.find({ domainId: mongoose.Types.ObjectId(domainId) }).sort({ 'period.start': -1 }).limit(100);
      console.log(`📊 Encontrados ${documents.length} documentos de analytics`);
      
      if (documents.length === 0) {
        return {
          countries: [],
          devices: [],
          browsers: [],
          platforms: []
        };
      }
      
      // Extraer todos los datos demográficos
      const allDemographics = documents.map(doc => doc.demographics).filter(Boolean);
      console.log(`📊 Extrayendo datos de ${allDemographics.length} registros demográficos`);
      
      // Combinar todos los datos
      const result = {
        countries: [],
        devices: [],
        browsers: [],
        platforms: []
      };
      
      // Procesar países
      const countryMap = new Map();
      allDemographics.forEach(demo => {
        if (demo.countries && Array.isArray(demo.countries)) {
          demo.countries.forEach(country => {
            if (country && country.code) {
              const key = country.code;
              const existing = countryMap.get(key);
              if (existing) {
                existing.visits += country.visits || 0;
              } else {
                countryMap.set(key, {
                  code: country.code,
                  name: country.name || country.code,
                  visits: country.visits || 0,
                  acceptanceRate: country.acceptanceRate || 0
                });
              }
            }
          });
        }
      });
      
      // Procesar dispositivos - manejar con cuidado por Schema.Types.Mixed
      const deviceMap = new Map();
      allDemographics.forEach(demo => {
        if (demo.devices) {
          // Si es un array, procesarlo normalmente
          if (Array.isArray(demo.devices)) {
            demo.devices.forEach(device => {
              if (device && device.type) {
                const key = device.type;
                const existing = deviceMap.get(key);
                if (existing) {
                  existing.visits += device.visits || 0;
                } else {
                  deviceMap.set(key, {
                    type: device.type,
                    visits: device.visits || 0,
                    acceptanceRate: device.acceptanceRate || 0
                  });
                }
              }
            });
          } 
          // Si es un objeto, extraer datos
          else if (typeof demo.devices === 'object') {
            Object.entries(demo.devices).forEach(([key, value]) => {
              // Si el valor es un objeto con propiedades tipo dispositivo
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                const deviceType = value.type || key;
                const existing = deviceMap.get(deviceType);
                if (existing) {
                  existing.visits += value.visits || 0;
                } else {
                  deviceMap.set(deviceType, {
                    type: deviceType,
                    visits: value.visits || 0,
                    acceptanceRate: value.acceptanceRate || 0
                  });
                }
              }
            });
          }
        }
      });
      
      // Agregar los datos a los resultados
      result.countries = Array.from(countryMap.values()).sort((a, b) => b.visits - a.visits);
      result.devices = Array.from(deviceMap.values()).sort((a, b) => b.visits - a.visits);
      
      // Obtener también datos de navegadores y plataformas si están disponibles
      // Implementación similar a países y dispositivos...
      
      console.log(`✅ Análisis demográfico directo completado: ${result.countries.length} países, ${result.devices.length} dispositivos`);
      
      return result;
    } catch (error) {
      logger.error(`Error al extraer datos demográficos directamente: ${error.message}`, error);
      return {
        countries: [],
        devices: [],
        browsers: [],
        platforms: []
      };
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
  // Actualizar datos demográficos - VERSIÓN MEJORADA
  async updateDemographicData(domainId, demographicInfo) {
    try {
      // Validación de datos de entrada
      if (!domainId) {
        logger.error('Error: domainId es requerido para actualizar datos demográficos');
        return false;
      }

      if (!demographicInfo) {
        logger.error('Error: demographicInfo es requerido para actualizar datos demográficos');
        return false;
      }
      
      const { country, region, device, browser, platform, connection, page, timestamp = new Date() } = demographicInfo;
      const today = new Date();
      const periodStart = this._getPeriodStart(today);
      const periodEnd = this._getPeriodEnd(today);
      
      // Log detallado de los datos recibidos para diagnóstico
      logger.debug(`[Analytics] Actualizando datos demográficos para dominio ${domainId}:`, {
        demographicData: JSON.stringify(demographicInfo),
        period: { start: periodStart, end: periodEnd }
      });
      
      // Primero, verificar si el documento existe o crear uno nuevo
      let analyticsDoc = await Analytics.findOne({
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd
      });
      
      if (!analyticsDoc) {
        // Crear documento base con toda la estructura necesaria
        analyticsDoc = await Analytics.create({
          domainId,
          period: {
            start: periodStart,
            end: periodEnd,
            granularity: 'daily'
          },
          visits: {
            total: 1,
            unique: 1,
            byRegulation: {
              gdpr: 1,
              ccpa: 0,
              lgpd: 0,
              other: 0
            }
          },
          interactions: {
            total: 0,
            types: {
              acceptAll: { count: 0, percentage: 0 },
              rejectAll: { count: 0, percentage: 0 },
              customize: { count: 0, percentage: 0 },
              close: { count: 0, percentage: 0 },
              noInteraction: { count: 0, percentage: 0 }
            },
            metrics: {
              avgTimeToDecision: 0,
              avgTimeInPreferences: 0
            }
          },
          demographics: {
            countries: [],
            devices: [],
            browsers: [],
            platforms: []
          }
        });
        
        logger.info(`[Analytics] Creado nuevo documento para dominio ${domainId}`);
      }
      
      // Actualizar cada tipo de datos demográficos
      const updatePromises = [];
      
      // 1. País
      if (country && country.code) {
        try {
          // Sanitizar y normalizar el código de país
          const countryCode = country.code.toString().trim().toUpperCase();
          
          // Solo actualizar si tenemos un código de país válido
          if (countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
            // Mapa de códigos de país a nombres si no se proporciona un nombre
            const countryName = country.name || this._getCountryName(countryCode);
            
            updatePromises.push(
              this._updateDemographicArray(
                domainId, 
                periodStart, 
                periodEnd, 
                'demographics.countries',
                { 
                  code: countryCode, 
                  name: countryName,
                  language: country.language || null
                }
              )
            );
            
            logger.debug(`[Analytics] País actualizando: ${countryCode} (${countryName})`);
          } else {
            logger.warn(`[Analytics] Código de país inválido ignorado: ${country.code}`);
          }
        } catch (countryError) {
          logger.error(`[Analytics] Error al procesar país: ${countryError.message}`);
        }
      }
      
      // 2. Dispositivo - usando método especializado que sabemos funciona 
      if (device && device.type) {
        try {
          const deviceType = device.type.toString().toLowerCase();
          
          // Normalizar tipo de dispositivo a valores conocidos
          let normalizedType = 'unknown';
          if (['mobile', 'tablet', 'desktop'].includes(deviceType)) {
            normalizedType = deviceType;
          } else if (deviceType.includes('mobile') || deviceType.includes('phone')) {
            normalizedType = 'mobile';
          } else if (deviceType.includes('tablet') || deviceType.includes('ipad')) {
            normalizedType = 'tablet';
          } else if (deviceType.includes('desktop') || deviceType.includes('laptop')) {
            normalizedType = 'desktop';
          }
          
          updatePromises.push(
            this._updateDeviceDirectly(domainId, periodStart, periodEnd, normalizedType)
          );
          
          logger.debug(`[Analytics] Dispositivo actualizando: ${normalizedType}`);
        } catch (deviceError) {
          logger.error(`[Analytics] Error al procesar dispositivo: ${deviceError.message}`);
        }
      }
      
      // 3. Navegador
      if (browser && browser.name) {
        try {
          // Normalizar nombre del navegador
          const browserName = browser.name.toString().toLowerCase();
          let normalizedName = browserName;
          
          // Mapeo de variantes de nombres de navegadores
          const browserMapping = {
            'chrome': ['chrome', 'chromium', 'google chrome'],
            'firefox': ['firefox', 'mozilla firefox', 'ff'],
            'safari': ['safari', 'apple safari'],
            'edge': ['edge', 'microsoft edge', 'edg'],
            'opera': ['opera', 'opr'],
            'ie': ['ie', 'internet explorer', 'msie', 'trident']
          };
          
          // Buscar normalización
          for (const [standard, variants] of Object.entries(browserMapping)) {
            if (variants.includes(browserName)) {
              normalizedName = standard;
              break;
            }
          }
          
          const browserData = { 
            name: normalizedName,
            version: browser.version || '0'
          };
          
          updatePromises.push(
            this._updateDemographicArray(
              domainId, 
              periodStart, 
              periodEnd, 
              'demographics.browsers',
              browserData
            )
          );
          
          logger.debug(`[Analytics] Navegador actualizando: ${normalizedName} v${browserData.version}`);
        } catch (browserError) {
          logger.error(`[Analytics] Error al procesar navegador: ${browserError.message}`);
        }
      }
      
      // 4. Plataforma
      if (platform) {
        try {
          // Normalizar plataforma 
          let platformName = '';
          
          if (typeof platform === 'string') {
            platformName = platform.toLowerCase();
          } else if (typeof platform === 'object' && platform.name) {
            platformName = platform.name.toLowerCase();
          } else if (typeof platform === 'object' && platform.os) {
            platformName = platform.os.toLowerCase();
          } else {
            platformName = 'unknown';
          }
          
          const platformData = { name: platformName };
          
          updatePromises.push(
            this._updateDemographicArray(
              domainId, 
              periodStart, 
              periodEnd, 
              'demographics.platforms',
              platformData
            )
          );
          
          logger.debug(`[Analytics] Plataforma actualizando: ${platformName}`);
        } catch (platformError) {
          logger.error(`[Analytics] Error al procesar plataforma: ${platformError.message}`);
        }
      }
      
      // 5. Conexión (si existe) 
      if (connection) {
        try {
          const connectionType = connection.effectiveType || connection.type || 'unknown';
          const connectionData = { type: connectionType };
          
          updatePromises.push(
            this._updateDemographicArray(
              domainId, 
              periodStart, 
              periodEnd, 
              'demographics.connections',
              connectionData
            )
          );
          
          logger.debug(`[Analytics] Conexión actualizando: ${connectionType}`);
        } catch (connError) {
          logger.warn(`[Analytics] Error al procesar conexión: ${connError.message}`);
        }
      }
      
      // 6. Página (si existe)
      if (page) {
        try {
          // Extraer la ruta principal para agrupar URLs similares
          let pagePath = 'unknown';
          
          if (typeof page === 'string') {
            try {
              const url = new URL(page);
              pagePath = url.pathname; 
            } catch {
              pagePath = page;
            }
          } else if (page.url) {
            try {
              const url = new URL(page.url);
              pagePath = url.pathname;
            } catch {
              pagePath = page.url;
            }
          }
          
          // Actualizar estadísticas de página
          updatePromises.push(
            Analytics.findOneAndUpdate(
              {
                domainId,
                'period.start': periodStart,
                'period.end': periodEnd,
                'pageStats.path': pagePath
              },
              {
                $inc: {
                  'pageStats.$.views': 1,
                  'pageStats.$.interactions': 1
                }
              }
            ).then(result => {
              // Si no existe, crear nuevo documento de página
              if (!result) {
                return Analytics.findOneAndUpdate(
                  {
                    domainId,
                    'period.start': periodStart,
                    'period.end': periodEnd
                  },
                  {
                    $push: {
                      'pageStats': {
                        path: pagePath,
                        views: 1,
                        interactions: 1,
                        firstView: new Date()
                      }
                    }
                  }
                );
              }
              return result;
            })
          );
          
          logger.debug(`[Analytics] Página registrada: ${pagePath}`);
        } catch (pageError) {
          logger.warn(`[Analytics] Error al procesar página: ${pageError.message}`);
        }
      }
      
      // Esperar a que todas las actualizaciones terminen
      await Promise.allSettled(updatePromises);
      
      // Actualizar tasas de aceptación y porcentajes después de todas las actualizaciones
      await this._updateAcceptanceRates(domainId, periodStart, periodEnd);
      
      logger.info(`[Analytics] Datos demográficos actualizados exitosamente para dominio ${domainId}`);
      return true;
    } catch (error) {
      logger.error(`[Analytics] Error en updateDemographicData: ${error.message}`, error);
      return false;
    }
  }
  
  // Método auxiliar para obtener nombre de país a partir de código
  _getCountryName(countryCode) {
    if (!countryCode) return 'Unknown';
    
    // Mapa de códigos de país comunes
    const countryMap = {
      'ES': 'España',
      'US': 'Estados Unidos',
      'MX': 'México',
      'AR': 'Argentina',
      'CO': 'Colombia',
      'PE': 'Perú',
      'CL': 'Chile',
      'BR': 'Brasil',
      'DE': 'Alemania',
      'FR': 'Francia',
      'GB': 'Reino Unido',
      'IT': 'Italia',
      'PT': 'Portugal',
      'CA': 'Canadá',
      'AU': 'Australia',
      'JP': 'Japón',
      'CN': 'China',
      'IN': 'India',
      'RU': 'Rusia',
      'ZA': 'Sudáfrica'
    };
    
    return countryMap[countryCode] || countryCode;
  }

  // Método auxiliar para actualizar arrays demográficos - VERSIÓN CORREGIDA Y OPTIMIZADA
  // Actualizar porcentajes de interacción
  async _updateInteractionPercentages(domainId) {
    try {
      // Buscar el documento actual
      const analytics = await Analytics.findOne({
        domainId,
        'period.start': this._getPeriodStart(),
        'period.end': this._getPeriodEnd()
      });
      
      if (!analytics || !analytics.interactions) return false;
      
      // Asegurar que todos los campos necesarios existen
      const interactions = analytics.interactions;
      const total = interactions.total || 0;
      
      if (total === 0) return false; // No hay interacciones para calcular porcentajes
      
      // Mapeo de todos los tipos de interacción
      const types = interactions.types || {};
      const updates = { $set: {} };
      
      // Calcular porcentajes para cada tipo
      ['acceptAll', 'rejectAll', 'customize', 'close', 'noInteraction'].forEach(type => {
        if (types[type]) {
          const count = types[type].count || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          updates.$set[`interactions.types.${type}.percentage`] = parseFloat(percentage.toFixed(2));
        }
      });
      
      // También actualizar otras métricas relevantes
      if (types.customize) {
        const customizeCount = types.customize.count || 0;
        updates.$set['interactions.metrics.customizationRate'] = total > 0 ? (customizeCount / total) * 100 : 0;
      }
      
      if (types.noInteraction) {
        const noInteractionCount = types.noInteraction.count || 0;
        updates.$set['interactions.metrics.bounceRate'] = total > 0 ? (noInteractionCount / total) * 100 : 0;
      }
      
      // Aplicar las actualizaciones
      if (Object.keys(updates.$set).length > 0) {
        await Analytics.updateOne(
          {
            domainId,
            'period.start': this._getPeriodStart(),
            'period.end': this._getPeriodEnd()
          },
          updates
        );
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error updating interaction percentages: ${error.message}`, error);
      return false;
    }
  }
  
  // Actualizar tasas de aceptación para datos demográficos
  async _updateAcceptanceRates(domainId, periodStart, periodEnd) {
    try {
      // Buscar el documento actual
      const analytics = await Analytics.findOne({
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd
      });
      
      if (!analytics) return false;
      
      // Obtener datos de interacciones
      const interactions = analytics.interactions || {};
      const types = interactions.types || {};
      const totalVisits = analytics.visits?.total || 0;
      
      // Calcular tasas de aceptación
      const acceptAll = types.acceptAll?.count || 0;
      const acceptanceRate = totalVisits > 0 ? (acceptAll / totalVisits) * 100 : 0;
      
      // Calcular tasa de personalización
      const customize = types.customize?.count || 0;
      const customizationRate = totalVisits > 0 ? (customize / totalVisits) * 100 : 0;
      
      // Actualizar tasas para países
      const updates = [];
      
      // 1. Actualizar países
      if (analytics.demographics?.countries && Array.isArray(analytics.demographics.countries)) {
        for (const country of analytics.demographics.countries) {
          if (country && country.code) {
            updates.push(
              Analytics.updateOne(
                {
                  domainId,
                  'period.start': periodStart,
                  'period.end': periodEnd,
                  'demographics.countries.code': country.code
                },
                {
                  $set: {
                    'demographics.countries.$.acceptanceRate': acceptanceRate,
                    'demographics.countries.$.customizationRate': customizationRate
                  }
                }
              )
            );
          }
        }
      }
      
      // 2. Actualizar dispositivos
      if (analytics.demographics?.devices) {
        // Si es un array (formato esperado), actualizamos cada dispositivo
        if (Array.isArray(analytics.demographics.devices)) {
          for (const device of analytics.demographics.devices) {
            if (device && device.type) {
              updates.push(
                Analytics.updateOne(
                  {
                    domainId,
                    'period.start': periodStart,
                    'period.end': periodEnd,
                    'demographics.devices.type': device.type
                  },
                  {
                    $set: {
                      'demographics.devices.$.acceptanceRate': acceptanceRate,
                      'demographics.devices.$.customizationRate': customizationRate
                    }
                  }
                )
              );
            }
          }
        }
        // Si es un objeto, tratarlo como Schema.Types.Mixed
        else if (typeof analytics.demographics.devices === 'object') {
          // Convertir a array primero
          const devicesArray = [];
          
          for (const [key, value] of Object.entries(analytics.demographics.devices)) {
            if (value && typeof value === 'object') {
              devicesArray.push({
                type: value.type || key,
                visits: value.visits || 0,
                acceptanceRate: acceptanceRate,
                customizationRate: customizationRate
              });
            }
          }
          
          // Actualizar todo el array de dispositivos
          if (devicesArray.length > 0) {
            updates.push(
              Analytics.updateOne(
                {
                  domainId,
                  'period.start': periodStart,
                  'period.end': periodEnd
                },
                {
                  $set: {
                    'demographics.devices': devicesArray
                  }
                }
              )
            );
          }
        }
      }
      
      // 3. Actualizar navegadores
      if (analytics.demographics?.browsers && Array.isArray(analytics.demographics.browsers)) {
        for (const browser of analytics.demographics.browsers) {
          if (browser && browser.name) {
            updates.push(
              Analytics.updateOne(
                {
                  domainId,
                  'period.start': periodStart,
                  'period.end': periodEnd,
                  'demographics.browsers.name': browser.name,
                  'demographics.browsers.version': browser.version
                },
                {
                  $set: {
                    'demographics.browsers.$.acceptanceRate': acceptanceRate
                  }
                }
              )
            );
          }
        }
      }
      
      // 4. Actualizar plataformas
      if (analytics.demographics?.platforms && Array.isArray(analytics.demographics.platforms)) {
        for (const platform of analytics.demographics.platforms) {
          if (platform && platform.name) {
            updates.push(
              Analytics.updateOne(
                {
                  domainId,
                  'period.start': periodStart,
                  'period.end': periodEnd,
                  'demographics.platforms.name': platform.name
                },
                {
                  $set: {
                    'demographics.platforms.$.acceptanceRate': acceptanceRate
                  }
                }
              )
            );
          }
        }
      }
      
      // Ejecutar todas las actualizaciones en paralelo
      await Promise.allSettled(updates);
      
      return true;
    } catch (error) {
      logger.error(`Error updating acceptance rates: ${error.message}`, error);
      return false;
    }
  }

  async _updateDemographicArray(domainId, periodStart, periodEnd, arrayPath, matchFilter) {
    try {
      // Asegurarse de que domainId es válido
      if (!domainId) {
        logger.error('Error: domainId es requerido para actualizar datos demográficos');
        return null;
      }
      
      // Validar que matchFilter contiene al menos una propiedad
      if (!matchFilter || Object.keys(matchFilter).length === 0) {
        logger.error('Error: matchFilter debe contener al menos una propiedad');
        return null;
      }
      
      // Determinar qué tipo de array estamos trabajando (countries, devices, browsers, platforms)
      const arrayName = arrayPath.split('.')[1]; 
      
      // ¡¡IMPORTANTE!! - Para evitar el error CastError, manejamos los dispositivos de forma diferente
      // Dispositivos tienen un formato específico para evitar el error "Cast to [string] failed for value"
      if (arrayName === 'devices') {
        // Usamos un método especializado para actualizar dispositivos directamente
        return this._updateDeviceDirectly(domainId, periodStart, periodEnd, matchFilter.type || 'unknown');
      }
      
      // Para otros tipos demográficos, continuamos con el método general:
      // Crear un filtro según el schema esperado por MongoDB (campos específicos):
      const sanitizedFilter = {};
      
      // Sanitizar de forma específica según el tipo de array
      if (arrayName === 'countries') {
        // Para países necesitamos code y name como strings
        sanitizedFilter.code = String(matchFilter.code || 'unknown').toUpperCase();
        sanitizedFilter.name = String(matchFilter.name || 'Unknown');
      }
      else if (arrayName === 'browsers') {
        // Para navegadores necesitamos name y version como strings
        sanitizedFilter.name = String(matchFilter.name || 'unknown').toLowerCase();
        sanitizedFilter.version = String(matchFilter.version || '0');
      }
      else if (arrayName === 'platforms') {
        // Para plataformas solo name es parte del schema
        sanitizedFilter.name = String(matchFilter.name || 'unknown').toLowerCase();
      }
      else {
        // Para otros casos no especificados, convertir a strings (por seguridad)
        Object.keys(matchFilter).forEach(key => {
          if (matchFilter[key] === null || matchFilter[key] === undefined) {
            sanitizedFilter[key] = 'unknown';
          } else {
            sanitizedFilter[key] = String(matchFilter[key]);
          }
        });
      }
      
      logger.debug(`Demografía sanitizada: ${JSON.stringify(sanitizedFilter)}`);
      
      // Verificar si ya existe un documento para este periodo
      const existingPeriodDoc = await Analytics.findOne({
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd
      });
      
      if (!existingPeriodDoc) {
        // Si no existe documento para el periodo, crear uno nuevo con estructura básica
        const basicStructure = {
          domainId,
          period: {
            start: periodStart,
            end: periodEnd,
            granularity: 'daily'
          },
          visits: {
            total: 1,
            unique: 1,
            byRegulation: {
              gdpr: 1,
              ccpa: 0,
              lgpd: 0,
              other: 0
            }
          },
          interactions: {
            total: 0,
            types: {
              acceptAll: { count: 0, percentage: 0 },
              rejectAll: { count: 0, percentage: 0 },
              customize: { count: 0, percentage: 0 },
              close: { count: 0, percentage: 0 },
              noInteraction: { count: 0, percentage: 0 }
            },
            metrics: {
              avgTimeToDecision: 0,
              avgTimeInPreferences: 0
            }
          },
          demographics: {}
        };
        
        // Añadir el item demográfico al array correspondiente siguiendo el esquema
        // En Analytics.js, TODOS los arrays demográficos tienen estos campos numéricos:
        // visits: Number, acceptanceRate: Number, customizationRate: Number (dispositivos)
        const newItem = {
          ...sanitizedFilter,
          // Establecer estos campos SIEMPRE como números
          visits: 1,                 // Number - obligatorio
          acceptanceRate: 0,          // Number - obligatorio
          customizationRate: 0        // Number - solo dispositivos necesitan esto
        };
        
        // Crear la estructura del array si no existe - en formato adecuado para el esquema
        if (arrayPath === 'demographics.countries') {
          basicStructure.demographics.countries = [newItem];
          basicStructure.demographics.devices = [];
          basicStructure.demographics.browsers = [];
          basicStructure.demographics.platforms = [];
        } else if (arrayPath === 'demographics.devices') {
          basicStructure.demographics.countries = [];
          basicStructure.demographics.devices = [newItem];
          basicStructure.demographics.browsers = [];
          basicStructure.demographics.platforms = [];
        } else if (arrayPath === 'demographics.browsers') {
          basicStructure.demographics.countries = [];
          basicStructure.demographics.devices = [];
          basicStructure.demographics.browsers = [newItem];
          basicStructure.demographics.platforms = [];
        } else if (arrayPath === 'demographics.platforms') {
          basicStructure.demographics.countries = [];
          basicStructure.demographics.devices = [];
          basicStructure.demographics.browsers = [];
          basicStructure.demographics.platforms = [newItem];
        }
        
        try {
          // Crear el documento
          await Analytics.create(basicStructure);
          logger.info(`Creado nuevo documento de analytics para dominio ${domainId} con información demográfica`);
          return true;
        } catch (createError) {
          logger.error(`Error al crear documento de analytics: ${createError.message}`, createError);
          return null;
        }
      }
      
      // Utilizar método findOneAndUpdate simplificado para actualización atómica
      // Verificar si el elemento ya existe en el array usando $elemMatch
      const arrayPathPrefix = arrayPath.split('.')[0]; // demographics
      // Ya tenemos arrayName definido antes, usamos la misma variable
      
      // Construir filtro de consulta para buscar coincidencia
      const elemMatchQuery = {};
      Object.keys(sanitizedFilter).forEach(key => {
        elemMatchQuery[key] = sanitizedFilter[key];
      });
      
      // Verificar si el elemento existe
      const elemMatchPath = `${arrayPathPrefix}.${arrayName}`;
      const matchQuery = { 
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd
      };
      matchQuery[elemMatchPath] = { $elemMatch: elemMatchQuery };
      
      const exists = await Analytics.findOne(matchQuery);
      
      if (exists) {
        // Si existe, identificar el índice del elemento para actualizarlo
        let elementIndex = -1;
        if (exists[arrayPathPrefix] && Array.isArray(exists[arrayPathPrefix][arrayName])) {
          elementIndex = exists[arrayPathPrefix][arrayName].findIndex(item => {
            return Object.keys(elemMatchQuery).every(key => 
              item[key] === elemMatchQuery[key]
            );
          });
        }
        
        if (elementIndex >= 0) {
          // Actualizar elemento existente
          const updatePath = `${elemMatchPath}.${elementIndex}.visits`;
          const updateOperation = { $inc: {} };
          updateOperation.$inc[updatePath] = 1;
          
          return Analytics.updateOne(
            {
              domainId,
              'period.start': periodStart,
              'period.end': periodEnd
            },
            updateOperation
          );
        }
      }
      
      // Si no existe o no se encontró, añadir como nuevo elemento
      // IMPORTANTE: Asegurar que los campos coinciden con el schema de Analytics.js
      const newItem = {
        ...sanitizedFilter,
        // Estos campos deben ser números según el schema (líneas ~120-142)
        visits: 1,                 // Number
        acceptanceRate: 0,         // Number 
        customizationRate: 0       // Number - solo para devices
      };
      
      const updateOperation = { $push: {} };
      updateOperation.$push[arrayPath] = newItem;
      
      return Analytics.updateOne(
        {
          domainId,
          'period.start': periodStart,
          'period.end': periodEnd
        },
        updateOperation
      );
    } catch (error) {
      logger.error(`Error en _updateDemographicArray: ${error.message}`, error);
      logger.error(`Datos de entrada: domainId=${domainId}, arrayPath=${arrayPath}, matchFilter=${JSON.stringify(matchFilter)}`);
      return null;
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

  // Método especializado para actualizar dispositivos sin errores de casting
  async _updateDeviceDirectly(domainId, periodStart, periodEnd, deviceType) {
    try {
      // Normalizar tipo de dispositivo
      let normalizedType = 'unknown';
      if (['mobile', 'tablet', 'desktop'].includes(deviceType.toLowerCase())) {
        normalizedType = deviceType.toLowerCase();
      } else if (deviceType.toLowerCase().includes('mobile') || deviceType.toLowerCase().includes('phone')) {
        normalizedType = 'mobile';
      } else if (deviceType.toLowerCase().includes('tablet') || deviceType.toLowerCase().includes('ipad')) {
        normalizedType = 'tablet';
      } else if (deviceType.toLowerCase().includes('desktop') || deviceType.toLowerCase().includes('laptop')) {
        normalizedType = 'desktop';
      }
      
      // Verificar si ya existe un documento para este periodo
      const existingDoc = await Analytics.findOne({
        domainId,
        'period.start': periodStart,
        'period.end': periodEnd
      });
      
      if (existingDoc) {
        // Si existe documento, verificar si ya tiene un dispositivo de este tipo
        let deviceExists = false;
        let deviceIndex = -1;
        
        // Verificar que demographics.devices exista y sea un array
        if (existingDoc.demographics && 
            existingDoc.demographics.devices && 
            Array.isArray(existingDoc.demographics.devices)) {
            
          // Buscar el dispositivo por tipo
          deviceIndex = existingDoc.demographics.devices.findIndex(
            d => d && d.type === normalizedType
          );
          
          deviceExists = deviceIndex >= 0;
        }
        
        if (deviceExists) {
          // Si ya existe un dispositivo de este tipo, incrementar visitas
          return Analytics.updateOne(
            {
              domainId,
              'period.start': periodStart,
              'period.end': periodEnd,
              'demographics.devices.type': normalizedType
            },
            { $inc: { 'demographics.devices.$.visits': 1 } }
          );
        } else {
          // Si no existe, agregar un nuevo dispositivo al array
          return Analytics.updateOne(
            {
              domainId,
              'period.start': periodStart,
              'period.end': periodEnd
            },
            { 
              $push: { 
                'demographics.devices': { 
                  type: normalizedType,
                  visits: 1,
                  acceptanceRate: 0,
                  customizationRate: 0
                } 
              } 
            }
          );
        }
      } else {
        // Si no existe documento para el periodo, crear uno nuevo
        return Analytics.create({
          domainId,
          period: {
            start: periodStart,
            end: periodEnd,
            granularity: 'daily'
          },
          visits: {
            total: 1,
            unique: 1,
            byRegulation: {
              gdpr: 1,
              ccpa: 0,
              lgpd: 0,
              other: 0
            }
          },
          interactions: {
            total: 0,
            types: {
              acceptAll: { count: 0, percentage: 0 },
              rejectAll: { count: 0, percentage: 0 },
              customize: { count: 0, percentage: 0 },
              close: { count: 0, percentage: 0 },
              noInteraction: { count: 0, percentage: 0 }
            }
          },
          demographics: {
            countries: [],
            devices: [{
              type: normalizedType,
              visits: 1,
              acceptanceRate: 0,
              customizationRate: 0
            }],
            browsers: [],
            platforms: []
          }
        });
      }
    } catch (error) {
      logger.error(`Error al actualizar dispositivo directamente: ${error.message}`, error);
      return null;
    }
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