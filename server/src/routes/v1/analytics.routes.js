const express = require('express');
const router = express.Router();
const AnalyticsController = require('../../controllers/AnalyticsController');
const { validateRequest } = require('../../middleware/validateRequest');
const { analyticsValidation } = require('../../validations/analytic.validation');
const { protect, restrictTo } = require('../../middleware/auth');
const { checkSubscriptionWithReadOnlyMode } = require('../../middleware/subscriptionCheck');
const { cacheControl } = require('../../middleware/cache');
const { analyticsAccessHandler } = require('../../middleware/domainAccess');

// Log para verificar que el router de analytics se ha cargado correctamente
console.log('🔄 Analytics router cargado correctamente');

// Ruta pública para trackear visitas de página (sin autenticación)
router.post('/page-visit', AnalyticsController.trackPageVisit);

// Todas las demás rutas requieren autenticación
router.use(protect);

// Middleware para todas las rutas con parámetro domainId
router.param('domainId', (req, res, next) => {
  console.log(`🔍 Detectado parámetro domainId: ${req.params.domainId}`);
  next();
});

// Rutas del dashboard
router.get(
  '/dashboard',
  checkSubscriptionWithReadOnlyMode,
  cacheControl('5 minutes'),
  validateRequest(analyticsValidation.getDashboardStats),
  AnalyticsController.getDashboardStats
);

// Rutas por dominio - Analytics generales
router.get(
  '/domain/:domainId',
  checkSubscriptionWithReadOnlyMode,
  cacheControl('15 minutes'),
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getDomainAnalytics),
  AnalyticsController.getDomainAnalytics
);

router.get(
  '/domain/:domainId/trends',
  checkSubscriptionWithReadOnlyMode,
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getTrends),
  AnalyticsController.getTrends
);

router.get(
  '/domain/:domainId/consent-stats',
  checkSubscriptionWithReadOnlyMode,
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getConsentStats),
  AnalyticsController.getConsentStats
);

// Ruta nueva optimizada para obtener datos directamente de ConsentLog
router.get(
  '/domain/:domainId/direct-consent-stats',
  checkSubscriptionWithReadOnlyMode,
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getConsentStats),
  AnalyticsController.getDirectConsentStats
);

// Rutas de cookies y datos demográficos
router.get(
  '/domain/:domainId/cookies',
  checkSubscriptionWithReadOnlyMode,
  cacheControl('30 minutes'),
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getCookieAnalytics),
  AnalyticsController.getCookieAnalytics
);

router.get(
  '/domain/:domainId/demographics',
  checkSubscriptionWithReadOnlyMode,
  cacheControl('1 hour'),
  analyticsAccessHandler,  // Middleware especial para analytics
  validateRequest(analyticsValidation.getDemographics),
  AnalyticsController.getDemographics
);

// RUTA DIRECTA PARA TODOS LOS DATOS ANALYTICS - MÍNIMAS VALIDACIONES 
// La vamos a utilizar para debuguear y también como solución ante problemas persistentes
router.get(
  '/direct/:domainId',
  async (req, res) => {
    try {
      console.log('🛠️ Ruta directa de analytics iniciada');
      
      const { domainId } = req.params;
      const { startDate, endDate } = req.query;
      
      console.log(`🛠️ Parámetros: domainId=${domainId}, startDate=${startDate}, endDate=${endDate}`);
      
      // Convertir fechas
      const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDateObj = endDate ? new Date(endDate) : new Date();
      
      // Verificar existencia del dominio sin restricciones de cliente
      const Domain = require('../../models/Domain');
      const domain = await Domain.findById(domainId).select('_id name clientId');
      
      if (!domain) {
        console.log(`🛠️❌ Dominio ${domainId} no existe`);
        return res.status(404).json({
          status: 'error',
          message: 'Dominio no encontrado'
        });
      }
      
      console.log(`🛠️✅ Dominio encontrado: ${domain._id}, clientId: ${domain.clientId}`);
      
      // Obtener datos directamente sin restricciones
      const analyticsService = require('../../services/analytics.service');
      
      // Ejecutar todas las consultas en paralelo
      console.log('🛠️ Obteniendo datos en paralelo...');
      
      const [demographics, cookies, consent] = await Promise.all([
        analyticsService.getDemographicAnalysis(domainId, { startDate: startDateObj, endDate: endDateObj })
          .catch(err => {
            console.error('🛠️❌ Error en demographics:', err.message);
            return { countries: [], devices: [], browsers: [], platforms: [] };
          }),
        analyticsService.getCookieAnalytics(domainId, { startDate: startDateObj, endDate: endDateObj })
          .catch(err => {
            console.error('🛠️❌ Error en cookies:', err.message);
            return { categories: [], purposes: [], acceptance: [], providers: [] };
          }),
        analyticsService.getConsentStats(domainId, { startDate: startDateObj, endDate: endDateObj })
          .catch(err => {
            console.error('🛠️❌ Error en consent:', err.message);
            return {};
          })
      ]);
      
      console.log('🛠️✅ Datos obtenidos exitosamente');
      
      res.status(200).json({
        status: 'success',
        domain: {
          id: domain._id,
          name: domain.name,
          clientId: domain.clientId
        },
        data: {
          demographics,
          cookies,
          consent,
          period: {
            start: startDateObj,
            end: endDateObj
          }
        }
      });
      
    } catch (error) {
      console.error('🛠️❌ ERROR GRAVE en ruta directa:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno al procesar datos de analytics',
        error: error.message
      });
    }
  }
);

// Ruta especial para pruebas - sin validación
router.get(
  '/dev/force-demographics/:domainId',
  async (req, res) => {
    try {
      const { domainId } = req.params;
      const { startDate, endDate, method = 'standard' } = req.query;
      
      console.log(`🔧 Forzando acceso directo a demografías, sin validación de dominio. Método: ${method}`);
      
      // Obtener datos directamente del servicio
      const analyticsService = require('../../services/analytics.service');
      
      let demographics;
      
      if (method === 'direct') {
        // Usar método alternativo directo
        demographics = await analyticsService.getDirectDemographics(domainId);
      } else {
        // Usar método estándar
        demographics = await analyticsService.getDemographicAnalysis(domainId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        });
      }
      
      res.status(200).json({
        status: 'success',
        method: method,
        data: { demographics }
      });
    } catch (error) {
      console.error('Error en ruta de desarrollo:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// NUEVAS RUTAS DE DESARROLLO

// Ruta para listar todos los documentos de analytics directos
router.get(
  '/dev/list-analytics/:domainId',
  async (req, res) => {
    try {
      const { domainId } = req.params;
      const { limit = 10 } = req.query;
      
      console.log(`🔍 Listando documentos de analytics para dominio: ${domainId}`);
      
      const Analytics = require('../../models/Analytics');
      const docs = await Analytics.find({ domainId })
        .sort({ 'period.start': -1 })
        .limit(parseInt(limit))
        .select('_id domainId period demographics');
      
      console.log(`📋 Encontrados ${docs.length} documentos`);
      
      res.status(200).json({
        status: 'success',
        count: docs.length,
        data: docs
      });
    } catch (error) {
      console.error('Error listando analytics:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// NUEVAS RUTAS

// Rutas para análisis de recorrido de usuario
router.get(
  '/domain/:domainId/user-journey',
  cacheControl('30 minutes'),
  validateRequest(analyticsValidation.getUserJourneyAnalytics),
  AnalyticsController.getUserJourneyAnalytics
);

// Rutas para análisis de contexto de sesión
router.get(
  '/domain/:domainId/session-context',
  cacheControl('30 minutes'),
  validateRequest(analyticsValidation.getSessionContextAnalytics),
  AnalyticsController.getSessionContextAnalytics
);

// Rutas para métricas UX
router.get(
  '/domain/:domainId/ux-metrics',
  cacheControl('30 minutes'),
  validateRequest(analyticsValidation.getUXMetrics),
  AnalyticsController.getUXMetrics
);

// Rutas para resultados de test A/B
router.get(
  '/domain/:domainId/ab-test',
  cacheControl('15 minutes'),
  validateRequest(analyticsValidation.getABTestResults),
  AnalyticsController.getABTestResults
);

// Rutas para actualizar métricas de rendimiento
router.post(
  '/domain/:domainId/performance',
  validateRequest(analyticsValidation.updatePerformanceMetrics),
  AnalyticsController.updatePerformanceMetrics
);

// Generación de reportes
router.get(
  '/domain/:domainId/report',
  validateRequest(analyticsValidation.generateReport),
  AnalyticsController.generateReport
);

module.exports = router;