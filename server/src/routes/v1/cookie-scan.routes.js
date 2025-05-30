const express = require('express');
const router = express.Router();
const CookieScanController = require('../../controllers/CookiesScanController');
const { validateRequest } = require('../../middleware/validateRequest');
const { cookieScanValidation } = require('../../validations/cookie-scan.validation');
const { protect } = require('../../middleware/auth');
const { checkDomainAccess } = require('../../middleware/domainAccess');

// Verificar que todos los métodos del controlador existen
// console.log('Available controller methods:', Object.keys(CookieScanController));

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.post(
  '/domain/:domainId/scan',
  checkDomainAccess,
  validateRequest(cookieScanValidation.startScan),
  CookieScanController.startScan
);

router.get(
  '/scan/:scanId',
  validateRequest(cookieScanValidation.getScanStatus),
  CookieScanController.getScanStatus
);

router.get(
  '/domain/:domainId/history',
  checkDomainAccess,
  validateRequest(cookieScanValidation.getScanHistory),
  CookieScanController.getScanHistory
);

router.post(
  '/scan/:scanId/cancel',
  validateRequest(cookieScanValidation.cancelScan),
  CookieScanController.cancelScan
);

router.get(
  '/scan/:scanId/results',
  validateRequest(cookieScanValidation.getScanResults),
  CookieScanController.getScanResults
);

router.post(
  '/scan/:scanId/apply',
  validateRequest(cookieScanValidation.applyChanges),
  CookieScanController.applyChanges
);

router.post(
  '/domain/:domainId/schedule',
  checkDomainAccess,
  validateRequest(cookieScanValidation.scheduleScan),
  CookieScanController.scheduleScan
);

// Rutas adicionales para funcionalidades específicas
router.get(
  '/scan/:scanId/changes',
  validateRequest(cookieScanValidation.getChanges),
  CookieScanController.getScanChanges
);

router.post(
  '/scan/:scanId/export',
  validateRequest(cookieScanValidation.exportScan),
  CookieScanController.exportScanResults
);

// Async Analysis Routes
router.post(
  '/domain/:domainId/async-analysis',
  checkDomainAccess,
  validateRequest(cookieScanValidation.startScan),
  CookieScanController.startAsyncAnalysis
);

// Advanced Analysis Routes
router.post(
  '/domain/:domainId/advanced-analysis',
  checkDomainAccess,
  validateRequest(cookieScanValidation.startScan),
  CookieScanController.startAdvancedAnalysis
);

router.get(
  '/analysis/:analysisId/status',
  validateRequest(cookieScanValidation.getScanStatus),
  CookieScanController.getAnalysisStatus
);

router.get(
  '/domain/:domainId/analysis-history',
  checkDomainAccess,
  validateRequest(cookieScanValidation.getScanHistory),
  CookieScanController.getAnalysisHistory
);

router.post(
  '/analysis/:analysisId/cancel',
  validateRequest(cookieScanValidation.cancelScan),
  CookieScanController.cancelAnalysis
);

router.get(
  '/analysis/:analysisId/results',
  validateRequest(cookieScanValidation.getScanResults),
  CookieScanController.getAnalysisResults
);

// New routes for cancel functionality
router.post(
  '/scan/:scanId/cancel-scan',
  CookieScanController.cancelScan
);

router.get(
  '/domain/:domainId/active-scan',
  checkDomainAccess,
  CookieScanController.getActiveScan
);

// Force stop all scans (owner only)
router.post(
  '/domain/:domainId/force-stop',
  checkDomainAccess,
  CookieScanController.forceStopAllScans
);

// Force stop all analyses (owner only)
router.post(
  '/domain/:domainId/force-stop-analysis',
  checkDomainAccess,
  CookieScanController.forceStopAllAnalysis
);

// Logs Routes
router.get(
  '/scan/:scanId/logs',
  CookieScanController.getScanLogs
);

router.get(
  '/logs/active',
  CookieScanController.getActiveScanLogs
);

module.exports = router;