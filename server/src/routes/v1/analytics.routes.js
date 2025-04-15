const express = require('express');
const router = express.Router();
const AnalyticsController = require('../../controllers/AnalyticsController');
const { validateRequest } = require('../../middleware/validateRequest');
const { analyticsValidation } = require('../../validations/analytic.validation');
const { protect, restrictTo } = require('../../middleware/auth');
const { cacheControl } = require('../../middleware/cache');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas del dashboard
router.get(
  '/dashboard',
  cacheControl('5 minutes'),
  validateRequest(analyticsValidation.getDashboardStats),
  AnalyticsController.getDashboardStats
);

// Rutas por dominio - Analytics generales
router.get(
  '/domain/:domainId',
  cacheControl('15 minutes'),
  validateRequest(analyticsValidation.getDomainAnalytics),
  AnalyticsController.getDomainAnalytics
);

router.get(
  '/domain/:domainId/trends',
  validateRequest(analyticsValidation.getTrends),
  AnalyticsController.getTrends
);

router.get(
  '/domain/:domainId/consent-stats',
  validateRequest(analyticsValidation.getConsentStats),
  AnalyticsController.getConsentStats
);

// Rutas de cookies y datos demográficos
router.get(
  '/domain/:domainId/cookies',
  cacheControl('30 minutes'),
  validateRequest(analyticsValidation.getCookieAnalytics),
  AnalyticsController.getCookieAnalytics
);

router.get(
  '/domain/:domainId/demographics',
  cacheControl('1 hour'),
  validateRequest(analyticsValidation.getDemographics),
  AnalyticsController.getDemographics
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