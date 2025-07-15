const Analytics = require('../models/Analytics');
const Domain = require('../models/Domain');
const Consent = require('../models/ConsentLog');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const analyticsService = require('../services/analytics.service');
const { generateReport } = require('../services/report.service');
const mongoose = require('mongoose');

class AnalyticsController {
  // Obtener resumen de analíticas - Método que consulta directamente a ConsentLog como getDirectConsentStats
  getDashboardStats = catchAsync(async (req, res) => {
    try {
      console.log('-------------------------------------------------------------------------------');
      console.log('🔥 SERVIDOR: INICIO getDashboardStats - método IDÉNTICO a getDirectConsentStats');
      console.log('-------------------------------------------------------------------------------');
      
      const { clientId } = req;
      const { period = '30d' } = req.query; // Usar 30d como default para tener más datos
      
      console.log(`📌 SERVIDOR: Request: clientId=${clientId}, period=${period}`);
      
      // 1. Obtener los dominios del cliente y verificar permiso
      const domains = await Domain.find({ clientId });
      
      const domainIds = domains.map(d => {
        try {
          return mongoose.Types.ObjectId(d._id);
        } catch (error) {
          console.error(`Error al convertir domainId ${d._id}:`, error.message);
          return null;
        }
      }).filter(id => id !== null);
      
      console.log(`✅ SERVIDOR: Dominios encontrados: ${domains.length}, IDs válidos: ${domainIds.length}`);
      
      if (domainIds.length === 0) {
        console.log('⚠️ SERVIDOR: No se encontraron dominios para el cliente');
        return res.status(200).json({
          status: 'success',
          data: { stats: this._getEmptyStatsStructure() }
        });
      }
      
      // Usar la primera entrada para un ejemplo concreto
      const primaryDomainId = domainIds[0];
      
      // 2. Fechas para el período seleccionado (más amplio para capturar más datos)
      const startDateObj = this._getPeriodStartDate(period);
      const endDateObj = new Date();
      
      console.log(`📅 SERVIDOR: Período: desde ${startDateObj.toISOString()} hasta ${endDateObj.toISOString()}`);
      console.log(`📅 SERVIDOR: Usando dominio principal: ${primaryDomainId}`);
      
      // 3. Consultar directamente a ConsentLog para obtener estadísticas
      console.log('🔍 SERVIDOR: Consultando directamente ConsentLog...');
      
      // 3.1 Obtener total de interacciones
      const totalInteractions = await Consent.countDocuments({
        domainId: { $in: domainIds },
        createdAt: { $gte: startDateObj, $lte: endDateObj }
      });
      
      console.log(`📊 SERVIDOR: Total de interacciones encontradas: ${totalInteractions}`);
      
      if (totalInteractions === 0) {
        console.log('⚠️ SERVIDOR: No hay datos en ConsentLog para el período seleccionado');
        return res.status(200).json({
          status: 'success',
          data: { stats: this._getEmptyStatsStructure() }
        });
      }
      
      // 3.2 Agrupar por tipo de interacción
      const interactionStats = await Consent.aggregate([
        {
          $match: {
            domainId: { $in: domainIds },
            createdAt: { $gte: startDateObj, $lte: endDateObj }
          }
        },
        {
          $group: {
            _id: '$bannerInteraction.type',
            count: { $sum: 1 },
            avgTimeToDecision: { $avg: '$bannerInteraction.timeToDecision' },
            customizationOpenedCount: { 
              $sum: { $cond: [{ $eq: ['$bannerInteraction.customizationOpened', true] }, 1, 0] } 
            },
            preferencesChangedCount: { 
              $sum: { $cond: [{ $eq: ['$bannerInteraction.preferencesChanged', true] }, 1, 0] } 
            }
          }
        }
      ]);
      
      console.log(`✅ SERVIDOR: Datos de interacción obtenidos: ${interactionStats.length} tipos diferentes`);
      
      // 3.3 Agrupar por regulación
      const regulationStats = await Consent.aggregate([
        {
          $match: {
            domainId: { $in: domainIds },
            createdAt: { $gte: startDateObj, $lte: endDateObj }
          }
        },
        {
          $group: {
            _id: '$regulation.type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log(`✅ SERVIDOR: Datos de regulación obtenidos: ${regulationStats.length} tipos diferentes`);
      
      // 3.4 Obtener visitantes únicos
      const uniqueUsersCount = await Consent.distinct('userId', {
        domainId: { $in: domainIds },
        createdAt: { $gte: startDateObj, $lte: endDateObj }
      }).then(userIds => userIds.length);
      
      console.log(`✅ SERVIDOR: Visitantes únicos: ${uniqueUsersCount}`);
      
      // 4. Procesar los datos para construir el resultado
      
      // 4.1 Procesar interacciones
      const interactions = {};
      let rates = { 
        acceptanceRate: 0, 
        rejectionRate: 0, 
        customizationRate: 0 
      };
      
      interactionStats.forEach(stat => {
        const type = stat._id || 'unknown';
        const count = stat.count;
        const percentage = totalInteractions > 0 ? (count / totalInteractions) * 100 : 0;
        
        console.log(`📊 SERVIDOR: Interacción '${type}': ${count} veces (${percentage.toFixed(2)}%)`);
        
        // Mapear tipos de interacción a las tasas que espera el frontend
        if (type === 'accept_all') rates.acceptanceRate = percentage;
        if (type === 'reject_all' || type === 'revoke') rates.rejectionRate = percentage;
        if (type === 'save_preferences') rates.customizationRate = percentage;
      });
      
      // 4.2 Procesar regulaciones
      const visitsByRegulation = {
        gdpr: 0,
        ccpa: 0,
        lgpd: 0,
        other: 0
      };
      
      regulationStats.forEach(stat => {
        const type = stat._id ? stat._id.toLowerCase() : 'other';
        if (visitsByRegulation.hasOwnProperty(type)) {
          visitsByRegulation[type] = stat.count;
          console.log(`📊 SERVIDOR: Regulación '${type}': ${stat.count} visitas`);
        } else {
          visitsByRegulation.other += stat.count;
          console.log(`📊 SERVIDOR: Regulación desconocida '${type}': ${stat.count} visitas -> agregada a 'other'`);
        }
      });
      
      // 4.3 Obtener tiempos medios
      const timeData = await Consent.aggregate([
        {
          $match: {
            domainId: { $in: domainIds },
            createdAt: { $gte: startDateObj, $lte: endDateObj }
          }
        },
        {
          $group: {
            _id: null,
            avgTimeToDecision: { $avg: '$bannerInteraction.timeToDecision' },
            avgTimeInPreferences: { 
              $avg: {
                $cond: [
                  { $eq: ['$bannerInteraction.type', 'save_preferences'] },
                  '$bannerInteraction.timeToDecision',
                  null
                ]
              }
            }
          }
        }
      ]);
      
      const avgTimeToDecision = timeData.length > 0 ? timeData[0].avgTimeToDecision || 0 : 0;
      const avgTimeInPreferences = timeData.length > 0 ? timeData[0].avgTimeInPreferences || 0 : 0;
      
      console.log(`⏱️ SERVIDOR: Tiempo medio hasta decisión: ${avgTimeToDecision}ms`);
      console.log(`⏱️ SERVIDOR: Tiempo medio en preferencias: ${avgTimeInPreferences}ms`);
      
      // 5. Construir resultado final para el dashboard
      const result = {
        totalVisits: totalInteractions,
        uniqueVisitors: uniqueUsersCount,
        avgAcceptanceRate: rates.acceptanceRate,
        avgRejectionRate: rates.rejectionRate,
        avgCustomizationRate: rates.customizationRate,
        avgCloseRate: 0, // Calculado sólo si hay datos
        avgNoInteractionRate: 0, // Calculado sólo si hay datos
        avgTimeToDecision: avgTimeToDecision,
        avgTimeInPreferences: avgTimeInPreferences,
        visitsByRegulation: visitsByRegulation
      };
      
      // Calcular rates adicionales si existen datos
      interactionStats.forEach(stat => {
        if (stat._id === 'close') {
          result.avgCloseRate = totalInteractions > 0 ? (stat.count / totalInteractions) * 100 : 0;
        }
        if (stat._id === 'no_interaction') {
          result.avgNoInteractionRate = totalInteractions > 0 ? (stat.count / totalInteractions) * 100 : 0;
        }
      });
      
      console.log('-------------------------------------------------------------------------------');
      console.log('🔥 SERVIDOR: FIN getDashboardStats - Datos finales:');
      console.log(JSON.stringify(result, null, 2));
      console.log('-------------------------------------------------------------------------------');
      
      res.status(200).json({
        status: 'success',
        data: { stats: result }
      });
    } catch (error) {
      console.error('❌❌❌ ERROR en getDashboardStats:', error);
      res.status(200).json({
        status: 'success',
        data: { 
          stats: this._getEmptyStatsStructure()
        }
      });
    }
  });
  
  // Método auxiliar para obtener una estructura de estadísticas vacía
  _getEmptyStatsStructure() {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      avgAcceptanceRate: 0,
      avgRejectionRate: 0,
      avgCustomizationRate: 0,
      avgCloseRate: 0,
      avgNoInteractionRate: 0,
      avgTimeToDecision: 0,
      avgTimeInPreferences: 0,
      visitsByRegulation: {
        gdpr: 0,
        ccpa: 0,
        lgpd: 0,
        other: 0
      }
    };
  }

  // Obtener analíticas por dominio
  getDomainAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar que el dominio existe, saltando la verificación de clientId para owners
    const query = req.isOwner 
      ? { _id: domainId } 
      : { _id: domainId, clientId: req.clientId };
    
    console.log('⚡ Query para buscar dominio en getDomainAnalytics:', JSON.stringify(query), 'isOwner:', req.isOwner);
    
    const domain = await Domain.findOne(query);

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }
    
    // Log el dominio encontrado
    console.log('✅ Dominio encontrado en getDomainAnalytics:', domain._id, 'clientId:', domain.clientId);

    
    const analytics = await Analytics.find({
      domainId: mongoose.Types.ObjectId(domainId),
      'period.start': { $gte: new Date(startDate) },
      'period.end': { $lte: new Date(endDate) },
      'period.granularity': granularity
    }).sort('period.start');

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  });

  // Obtener tendencias
  getTrends = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { metric, startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar que el dominio existe, saltando la verificación de clientId para owners
    const query = req.isOwner 
      ? { _id: domainId } 
      : { _id: domainId, clientId: req.clientId };
    
    console.log('⚡ Query para buscar dominio en getTrends:', JSON.stringify(query), 'isOwner:', req.isOwner);
    
    const domain = await Domain.findOne(query);

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }
    
    // Log el dominio encontrado
    console.log('✅ Dominio encontrado en getTrends:', domain._id, 'clientId:', domain.clientId);

    // Convertir domainId a ObjectId
    const trends = await Analytics.getTrends(
      domainId, // El método getTrends ya convierte a ObjectId internamente
      new Date(startDate),
      new Date(endDate),
      granularity
    );

    res.status(200).json({
      status: 'success',
      data: { trends }
    });
  });

  // Obtener analíticas por cookie/vendor
  getCookieAnalytics = catchAsync(async (req, res) => {
    try {
      console.log('-------------------------------------------------------------------------------');
      console.log('💥 INICIO getCookieAnalytics - controller');
      console.log('-------------------------------------------------------------------------------');
      
      const { domainId } = req.params;
      const { startDate, endDate } = req.query;
      
      console.log(`📌 Request: domainId=${domainId}, startDate=${startDate}, endDate=${endDate}`);
      console.log(`📌 Auth info: clientId=${req.clientId}, userType=${req.userType}, isOwner=${req.isOwner}`);
      
      // Intento 1: Buscar el dominio con verificación flexible para owner
      console.log('🔍 INTENTO 1: Buscar dominio con verificación flexible para owner');
      const query = req.isOwner 
        ? { _id: domainId } 
        : { _id: domainId, clientId: req.clientId };
      
      console.log('⚡ Query para buscar dominio:', JSON.stringify(query));
      
      let domain = await Domain.findOne(query);
      
      if (!domain && req.isOwner) {
        // Intento 2: Si es owner y no se encontró, intentar buscar solo por ID
        console.log('🔍 INTENTO 2: Buscar dominio solo por ID para owner');
        domain = await Domain.findById(domainId);
      }
      
      if (!domain) {
        // Intento 3: Verificar si domainId es válido pero sin restricción de cliente
        console.log('🔍 INTENTO 3: Verificar si el dominio existe sin restricción de cliente');
        const anyDomain = await Domain.findById(domainId);
        if (anyDomain) {
          console.log(`⚠️ El dominio existe pero pertenece a otro cliente: ${anyDomain.clientId}`);
        } else {
          console.log(`❌ Dominio con ID ${domainId} no existe en la base de datos`);
        }
        
        throw new AppError('Domain not found', 404);
      }
      
      // Log el dominio encontrado
      console.log(`✅ Dominio encontrado: ID=${domain._id}, clientId=${domain.clientId}`);
      
      // Analizar fechas
      let startDateObj, endDateObj;
      try {
        startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDateObj = endDate ? new Date(endDate) : new Date();
        console.log(`📅 Fechas procesadas: ${startDateObj.toISOString()} - ${endDateObj.toISOString()}`);
      } catch (dateError) {
        console.error('❌ Error procesando fechas:', dateError);
        startDateObj = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDateObj = new Date();
      }
      
      console.log('🍪 Obteniendo analytics de cookies del servicio...');
      
      const cookieAnalytics = await analyticsService.getCookieAnalytics(domainId, {
        startDate: startDateObj,
        endDate: endDateObj
      });
      
      console.log(`✅ Datos obtenidos: ${cookieAnalytics?.categories?.length || 0} categorías, ${cookieAnalytics?.acceptance?.length || 0} cookies`);
      console.log('-------------------------------------------------------------------------------');
      console.log('💥 FIN getCookieAnalytics - controller');
      console.log('-------------------------------------------------------------------------------');
      
      res.status(200).json({
        status: 'success',
        data: cookieAnalytics
      });
    } catch (error) {
      console.log('❌❌❌ ERROR en getCookieAnalytics:', error);
      throw error;
    }
  });

  // Obtener datos demográficos
  getDemographics = catchAsync(async (req, res) => {
    try {
      console.log('-------------------------------------------------------------------------------');
      console.log('💥 INICIO getDemographics - controller');
      console.log('-------------------------------------------------------------------------------');
      
      const { domainId } = req.params;
      const { startDate, endDate } = req.query;
      
      console.log(`📌 Request: domainId=${domainId}, startDate=${startDate}, endDate=${endDate}`);
      console.log(`📌 Auth info: clientId=${req.clientId}, userType=${req.userType}, isOwner=${req.isOwner}`);
      
      // Intento 1: Buscar el dominio con verificación flexible para owner
      console.log('🔍 INTENTO 1: Buscar dominio con verificación flexible para owner');
      const query = req.isOwner 
        ? { _id: domainId } 
        : { _id: domainId, clientId: req.clientId };
      
      console.log('⚡ Query para buscar dominio en getDemographics:', JSON.stringify(query));
      
      let domain = await Domain.findOne(query);
      
      if (!domain && req.isOwner) {
        // Intento 2: Si es owner y no se encontró, intentar buscar solo por ID
        console.log('🔍 INTENTO 2: Buscar dominio solo por ID para owner');
        domain = await Domain.findById(domainId);
      }
      
      if (!domain) {
        // Intento 3: Verificar si domainId es válido pero sin restricción de cliente
        console.log('🔍 INTENTO 3: Verificar si el dominio existe sin restricción de cliente');
        const anyDomain = await Domain.findById(domainId);
        if (anyDomain) {
          console.log(`⚠️ El dominio existe pero pertenece a otro cliente: ${anyDomain.clientId}`);
        } else {
          console.log(`❌ Dominio con ID ${domainId} no existe en la base de datos`);
        }
        
        throw new AppError('Domain not found', 404);
      }
      
      // Log el dominio encontrado
      console.log(`✅ Dominio encontrado: ID=${domain._id}, clientId=${domain.clientId}`);
      
      // Analizar fechas
      let startDateObj, endDateObj;
      try {
        startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDateObj = endDate ? new Date(endDate) : new Date();
        console.log(`📅 Fechas procesadas: ${startDateObj.toISOString()} - ${endDateObj.toISOString()}`);
      } catch (dateError) {
        console.error('❌ Error procesando fechas:', dateError);
        startDateObj = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDateObj = new Date();
      }
      
      console.log('📊 Obteniendo datos demográficos del servicio...');
      
      const demographics = await analyticsService.getDemographicAnalysis(domainId, {
        startDate: startDateObj,
        endDate: endDateObj
      });
      
      console.log(`✅ Datos obtenidos: ${demographics.countries.length} países, ${demographics.devices.length} dispositivos`);
      console.log('-------------------------------------------------------------------------------');
      console.log('💥 FIN getDemographics - controller');
      console.log('-------------------------------------------------------------------------------');
      
      res.status(200).json({
        status: 'success',
        data: { demographics }
      });
    } catch (error) {
      console.log('❌❌❌ ERROR en getDemographics:', error);
      throw error;
    }
  });

  // Generar reporte
  generateReport = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, format = 'pdf' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const data = await analyticsService.aggregateAnalytics(
      domainId, 
      new Date(startDate), 
      new Date(endDate)
    );
    
    const report = await generateReport(data, format);

    res.status(200).json({
      status: 'success',
      data: { report }
    });
  });

  // NUEVOS MÉTODOS
  
  // Obtener analíticas del recorrido del usuario
  getUserJourneyAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const journeyAnalytics = await analyticsService.getUserJourneyAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: journeyAnalytics
    });
  });

  // Obtener analíticas de contexto de sesión
  getSessionContextAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const sessionAnalytics = await analyticsService.getSessionContextAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: sessionAnalytics
    });
  });

  // Obtener métricas UX
  getUXMetrics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const uxMetrics = await analyticsService.getUXMetricsAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: uxMetrics
    });
  });

  // Obtener resultados de test A/B
  getABTestResults = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, variantId } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const abTestResults = await analyticsService.getABTestResults(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      variantId: variantId || null
    });

    res.status(200).json({
      status: 'success',
      data: abTestResults
    });
  });

  // Actualizar métricas de rendimiento
  updatePerformanceMetrics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const metrics = req.body;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const success = await analyticsService.updatePerformanceMetrics(domainId, metrics);

    res.status(200).json({
      status: 'success',
      data: { updated: success }
    });
  });

  // Obtener estadísticas de consentimiento
  getConsentStats = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar que el dominio existe, saltando la verificación de clientId para owners
    const query = req.isOwner 
      ? { _id: domainId } 
      : { _id: domainId, clientId: req.clientId };
    
    console.log('⚡ Query para buscar dominio en getConsentStats:', JSON.stringify(query), 'isOwner:', req.isOwner);
    
    const domain = await Domain.findOne(query);

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }
    
    // Log el dominio encontrado
    console.log('✅ Dominio encontrado en getConsentStats:', domain._id, 'clientId:', domain.clientId);

    const consentStats = await analyticsService.getConsentStats(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity
    });

    res.status(200).json({
      status: 'success',
      data: { consentStats }
    });
  });

  // Método optimizado para obtener estadísticas de consentimiento directamente de ConsentLog
  getDirectConsentStats = catchAsync(async (req, res) => {
    try {
      console.log('-------------------------------------------------------------------------------');
      console.log('🔥 SERVIDOR: INICIO getDirectConsentStats - Consulta directa a ConsentLog');
      console.log('-------------------------------------------------------------------------------');
      
      const { domainId } = req.params;
      const { startDate, endDate } = req.query;
      
      console.log(`📌 SERVIDOR: Request: domainId=${domainId}, startDate=${startDate}, endDate=${endDate}`);
      
      // Verificar que el dominio existe
      const query = req.isOwner 
        ? { _id: domainId } 
        : { _id: domainId, clientId: req.clientId };
      
      console.log('\u26a1 SERVIDOR: Query para buscar dominio:', JSON.stringify(query));
      
      const domain = await Domain.findOne(query);

      if (!domain) {
        throw new AppError('Domain not found', 404);
      }
      
      console.log(`\u2705 SERVIDOR: Dominio encontrado: ID=${domain._id}, clientId=${domain.clientId}`);
      
      // Parsear fechas
      const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDateObj = endDate ? new Date(endDate) : new Date();
      
      // Consultar directamente a ConsentLog para obtener estadísticas
      // 1. Agrupar por tipo de interacción
      const interactionStats = await Consent.aggregate([
        {
          $match: {
            domainId: mongoose.Types.ObjectId(domainId),
            createdAt: { $gte: startDateObj, $lte: endDateObj }
          }
        },
        {
          $group: {
            _id: '$bannerInteraction.type',
            count: { $sum: 1 },
            avgTimeToDecision: { $avg: '$bannerInteraction.timeToDecision' },
            customizationOpenedCount: { 
              $sum: { $cond: [{ $eq: ['$bannerInteraction.customizationOpened', true] }, 1, 0] } 
            },
            preferencesChangedCount: { 
              $sum: { $cond: [{ $eq: ['$bannerInteraction.preferencesChanged', true] }, 1, 0] } 
            }
          }
        }
      ]);
      
      console.log(`\u2705 SERVIDOR: Datos de interacción obtenidos: ${interactionStats.length} tipos`);
      
      // 2. Calcular total de interacciones y porcentajes
      let totalInteractions = 0;
      interactionStats.forEach(stat => {
        totalInteractions += stat.count;
      });
      
      // 3. Mapear datos de interacción a la estructura esperada por el frontend
      const rates = {
        acceptanceRate: 0,
        rejectionRate: 0,
        customizationRate: 0
      };
      
      const interactions = {};
      
      interactionStats.forEach(stat => {
        const type = stat._id;
        const count = stat.count;
        const percentage = totalInteractions > 0 ? (count / totalInteractions) * 100 : 0;
        
        interactions[type] = {
          count,
          percentage,
          avgTimeToDecision: stat.avgTimeToDecision || 0,
          customizationOpenedCount: stat.customizationOpenedCount || 0,
          preferencesChangedCount: stat.preferencesChangedCount || 0
        };
        
        // Mapear a las tasas que espera el frontend
        if (type === 'accept_all') rates.acceptanceRate = percentage;
        if (type === 'reject_all' || type === 'revoke') rates.rejectionRate = percentage;
        if (type === 'save_preferences') rates.customizationRate = percentage;
      });
      
      // 4. Obtener datos de tendencias por día
      const trends = await Consent.aggregate([
        {
          $match: {
            domainId: mongoose.Types.ObjectId(domainId),
            createdAt: { $gte: startDateObj, $lte: endDateObj }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: "$bannerInteraction.type",
            },
            count: { $sum: 1 },
            totalTimeToDecision: { $sum: { $ifNull: ['$bannerInteraction.timeToDecision', 0] } }
          }
        },
        {
          $sort: { "_id.date": 1 }
        }
      ]);
      
      console.log(`\u2705 SERVIDOR: Datos de tendencias obtenidos: ${trends.length} registros`);
      
      // 5. Procesar tendencias para formato esperado por el frontend
      const trendsByDate = {};
      let totalByDate = {};
      
      // Primero calcular totales por día
      trends.forEach(item => {
        const date = item._id.date;
        totalByDate[date] = (totalByDate[date] || 0) + item.count;
      });
      
      // Luego calcular porcentajes
      trends.forEach(item => {
        const date = item._id.date;
        const type = item._id.type;
        const count = item.count;
        const total = Math.max(totalByDate[date] || 0, 1); // Evitar división por cero
        
        if (!trendsByDate[date]) {
          trendsByDate[date] = {
            date: new Date(date),
            acceptAll: 0,
            rejectAll: 0,
            customize: 0,
            totalInteractions: total
          };
        }
        
        // Mapear tipos a los nombres esperados por el frontend
        if (type === 'accept_all') trendsByDate[date].acceptAll = (count / total) * 100;
        else if (type === 'reject_all' || type === 'revoke') trendsByDate[date].rejectAll = (count / total) * 100;
        else if (type === 'save_preferences') trendsByDate[date].customize = (count / total) * 100;
      });
      
      // Convertir a array y ordenar por fecha
      const trendsArray = Object.values(trendsByDate).sort((a, b) => a.date - b.date);
      
      // 6. Construir respuesta final
      const result = {
        totalInteractions,
        uniqueUsers: await Consent.countDocuments({
          domainId: mongoose.Types.ObjectId(domainId),
          createdAt: { $gte: startDateObj, $lte: endDateObj }
        }).distinct('userId'),
        rates,
        trends: trendsArray,
        interactions,
        timeMetrics: {
          avgTimeToDecision: interactions['accept_all']?.avgTimeToDecision || 0,
          avgTimeInPreferences: interactions['save_preferences']?.avgTimeToDecision || 0,
          customizationOpenedCount: Object.values(interactions).reduce((sum, i) => sum + (i.customizationOpenedCount || 0), 0),
          preferencesChangedCount: Object.values(interactions).reduce((sum, i) => sum + (i.preferencesChangedCount || 0), 0)
        }
      };
      
      console.log('-------------------------------------------------------------------------------');
      console.log('🔥 SERVIDOR: FIN getDirectConsentStats - Resultado:', JSON.stringify({
        totalInteractions: result.totalInteractions,
        rates: result.rates,
        timeMetrics: result.timeMetrics
      }));
      console.log('-------------------------------------------------------------------------------');
      
      res.status(200).json({
        status: 'success',
        data: { consentStats: result }
      });
      
    } catch (error) {
      console.error('❌ SERVIDOR: ERROR en getDirectConsentStats:', error);
      throw error;
    }
  });

  // Método público para trackear visitas de página (sin autenticación)
  trackPageVisit = catchAsync(async (req, res) => {
    try {
      console.log('📊 [AnalyticsController] Tracking page visit:', req.body);
      
      const { domainId, metadata } = req.body;
      
      if (!domainId) {
        return res.status(400).json({
          status: 'error',
          message: 'domainId is required'
        });
      }
      
      // Verificar que el dominio existe
      const domain = await Domain.findById(domainId);
      if (!domain) {
        return res.status(404).json({
          status: 'error',
          message: 'Domain not found'
        });
      }
      
      // Llamar al servicio de analytics para trackear la visita
      const result = await analyticsService.trackPageVisit({
        domainId,
        metadata
      });
      
      if (result) {
        console.log('✅ [AnalyticsController] Page visit tracked successfully');
        res.status(200).json({
          status: 'success',
          message: 'Page visit tracked'
        });
      } else {
        console.log('❌ [AnalyticsController] Failed to track page visit');
        res.status(500).json({
          status: 'error',
          message: 'Failed to track page visit'
        });
      }
      
    } catch (error) {
      console.error('❌ [AnalyticsController] Error tracking page visit:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });

  // Métodos privados
  _getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new AnalyticsController();