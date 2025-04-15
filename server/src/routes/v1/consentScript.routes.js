// routes/v1/consentScript.routes.js
const express = require('express');
const router = express.Router();
const ConsentScriptController = require('../../controllers/ConsentScriptController');
const { validateRequest } = require('../../middleware/validateRequest');
const { protect } = require('../../middleware/auth');
const { cacheControl } = require('../../middleware/cache');

// Rutas que requieren autenticación

router.use('/generate', protect);
router.use('/install', protect);
router.use('/test', protect);
router.use('/provider', protect);

// Generación de scripts (autenticada)
router.post(
  '/generate/:domainId',
  ConsentScriptController.generateScript
);

router.post(
  '/generate/:domainId/integrated',
  ConsentScriptController.generateIntegratedScript
);

router.get(
  '/install/:domainId',
  ConsentScriptController.generateInstallationCode
);

router.post(
  '/test/:domainId',
  ConsentScriptController.generateTestPage
);

router.post(
  '/provider/:provider',
  ConsentScriptController.getProviderScript
);

// Banner específico
router.get(
  '/banner/:templateId',
  cacheControl('1 hour'),
  ConsentScriptController.getBanner
);

// Rutas públicas

router.post(
  '/interaction/:domainId',
  ConsentScriptController.logInteraction
);


module.exports = router;