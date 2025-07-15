const express = require('express');
const router = express.Router();
const AdvancedCookieAnalysisController = require('../../controllers/AdvancedCookieAnalysisController');
const { validateRequest } = require('../../middleware/validateRequest');
const { advancedAnalysisValidation } = require('../../validations/advanced-analysis.validation');
const { protect } = require('../../middleware/auth');
const { checkDomainAccess } = require('../../middleware/domainAccess');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales de análisis
router.post(
  '/domain/:domainId/start',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.startAnalysis),
  AdvancedCookieAnalysisController.startAdvancedAnalysis
);

// Nuevas rutas para análisis inteligente
router.post(
  '/domain/:domainId/intelligent/start',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.startIntelligentAnalysis),
  AdvancedCookieAnalysisController.startIntelligentAnalysis
);

router.get(
  '/domain/:domainId/intelligent/results',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.getIntelligentResults),
  AdvancedCookieAnalysisController.getIntelligentAnalysisResults
);

router.get(
  '/domain/:domainId/intelligent/compliance-report',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.getComplianceReport),
  AdvancedCookieAnalysisController.generateComplianceReport
);

router.get(
  '/analysis/:analysisId/status',
  validateRequest(advancedAnalysisValidation.getAnalysisStatus),
  AdvancedCookieAnalysisController.getAnalysisStatus
);

router.get(
  '/analysis/:analysisId/results',
  validateRequest(advancedAnalysisValidation.getAnalysisResults),
  AdvancedCookieAnalysisController.getAnalysisResults
);

router.get(
  '/analysis/:analysisId/compliance',
  validateRequest(advancedAnalysisValidation.getAnalysisStatus),
  AdvancedCookieAnalysisController.getComplianceReport
);

router.post(
  '/analysis/:analysisId/cancel',
  validateRequest(advancedAnalysisValidation.getAnalysisStatus),
  AdvancedCookieAnalysisController.cancelAnalysis
);

// Rutas de gestión e historial
router.get(
  '/domain/:domainId/history',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.getAnalysisHistory),
  AdvancedCookieAnalysisController.getAnalysisHistory
);

router.get(
  '/domain/:domainId/trends',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.getCookieTrends),
  AdvancedCookieAnalysisController.getCookieTrends
);

// Comparación de análisis
router.get(
  '/compare/:analysisId1/:analysisId2',
  validateRequest(advancedAnalysisValidation.compareAnalyses),
  AdvancedCookieAnalysisController.compareAnalyses
);

// Programación de análisis automáticos
router.post(
  '/domain/:domainId/schedule',
  checkDomainAccess,
  validateRequest(advancedAnalysisValidation.scheduleAnalysis),
  AdvancedCookieAnalysisController.scheduleAnalysis
);

module.exports = router;