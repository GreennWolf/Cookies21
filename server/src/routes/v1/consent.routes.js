const express = require('express');
const router = express.Router();
const ConsentController = require('../../controllers/ConsentController');
const { validateRequest } = require('../../middleware/validateRequest');
const { consentValidation } = require('../../validations/consent.validation');
const { protect } = require('../../middleware/auth');
const ConsentScriptController = require('../../controllers/ConsentScriptController');
const { cacheControl } = require('../../middleware/cache');

// Rutas públicas (no requieren autenticación)

router.get(
  '/country-detection',
  cacheControl('5 minutes'),
  ConsentScriptController.detectCountry
);
router.get('/vendor/list', ConsentScriptController.getVendorList);

router.get(
  '/script/:domainId/embed.js',
  cacheControl('1 hour'),
  ConsentScriptController.serveEmbedScript
);

router.post(
  '/decode',
  ConsentController.decodeTCString
);

router.get(
  '/domain/:domainId',
  validateRequest(consentValidation.getConsent),
  ConsentController.getConsent
);

router.post(
  '/domain/:domainId',
  ConsentController.updateConsent
);

router.post(
  '/domain/:domainId/revoke',
  validateRequest(consentValidation.revokeConsent),
  ConsentController.revokeConsent
);

router.get(
  '/domain/:domainId/verify',
  validateRequest(consentValidation.verifyConsent),
  ConsentController.verifyConsent
);

// Rutas que requieren autenticación
router.use(protect);

router.get(
  '/domain/:domainId/history',
  validateRequest(consentValidation.getHistory),
  ConsentController.getConsentHistory
);



module.exports = router;