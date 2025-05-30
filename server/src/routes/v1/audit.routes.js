const express = require('express');
const router = express.Router();
const AuditController = require('../../controllers/AuditController');
const { validateRequest } = require('../../middleware/validateRequest');
const { auditValidation } = require('../../validations/audit.validation');
const { protect, restrictTo } = require('../../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(protect);
router.use(restrictTo('admin'));

// Rutas principales
router.get(
  '/logs',
  validateRequest(auditValidation.getAuditLogs),
  AuditController.getAuditLogs
);

router.get(
  '/domain/:domainId/logs',
  validateRequest(auditValidation.getDomainAuditLogs),
  AuditController.getDomainAuditLogs
);

router.get(
  '/event/:id',
  validateRequest(auditValidation.getAuditEvent),
  AuditController.getAuditEvent
);

router.get(
  '/activity',
  validateRequest(auditValidation.getActivitySummary),
  AuditController.getActivitySummary
);

router.get(
  '/stats',
  validateRequest(auditValidation.getAuditStats),
  AuditController.getAuditStats
);

router.get(
  '/export',
  validateRequest(auditValidation.exportLogs),
  AuditController.exportLogs
);

module.exports = router;