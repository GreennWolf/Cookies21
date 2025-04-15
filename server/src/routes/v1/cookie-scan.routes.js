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

module.exports = router;