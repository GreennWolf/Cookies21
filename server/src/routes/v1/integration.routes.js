const express = require('express');
const router = express.Router();
const IntegrationController = require('../../controllers/IntegrationController');
const { validateRequest } = require('../../middleware/validateRequest');
const { integrationValidation } = require('../../validations/integration.validation');
const { protect } = require('../../middleware/auth');
const { checkDomainAccess } = require('../../middleware/domainAccess');
const { rateLimiter } = require('../../middleware/rateLimiter');

// Todas las rutas requieren autenticación
router.use(protect);

// Google Analytics
router.post(
  '/domain/:domainId/google-analytics',
  checkDomainAccess,
  validateRequest(integrationValidation.configureGoogleAnalytics),
  IntegrationController.configureGoogleAnalytics
);

// Google Tag Manager
router.post(
  '/domain/:domainId/gtm',
  checkDomainAccess,
  validateRequest(integrationValidation.configureGTM),
  IntegrationController.configureGTM
);

// IAB Integration
router.post(
  '/iab',
  validateRequest(integrationValidation.configureIAB),
  IntegrationController.configureIAB
);

// Webhooks
router.post(
  '/domain/:domainId/webhook',
  checkDomainAccess,
  rateLimiter('webhook_config', {
    windowMs: 60 * 1000, // 1 minuto
    max: 10 // 10 solicitudes por minuto
  }),
  validateRequest(integrationValidation.configureWebhook),
  IntegrationController.configureWebhook
);

// Test webhook
router.post(
  '/webhook/test',
  rateLimiter('webhook_test', {
    windowMs: 60 * 1000, // 1 minuto
    max: 20 // 20 solicitudes por minuto
  }),
  validateRequest(integrationValidation.testWebhook),
  IntegrationController.testWebhook
);

// Estado de integraciones
router.get(
  '/domain/:domainId/status',
  checkDomainAccess,
  validateRequest(integrationValidation.getIntegrationStatus),
  IntegrationController.getIntegrationStatus
);

module.exports = router;