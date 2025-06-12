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

// Banner específico por template ID
router.get(
  '/banner/:templateId',
  cacheControl('1 hour'),
  ConsentScriptController.getBanner
);

// Banner específico por dominio (determina dinámicamente qué template usar)
router.get(
  '/banner/domain/:domainId',
  cacheControl('30 minutes'),
  ConsentScriptController.getBannerByDomain
);

// Rutas públicas

router.post(
  '/interaction/:domainId',
  ConsentScriptController.logInteraction
);

// Rutas para datos dinámicos del panel de preferencias (públicas)
router.get(
  '/providers',
  ConsentScriptController.getProviders
);

router.get(
  '/cookies',
  ConsentScriptController.getCookies
);

module.exports = router;