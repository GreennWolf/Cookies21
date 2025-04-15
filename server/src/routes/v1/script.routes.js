const express = require('express');
const router = express.Router();
const ScriptController = require('../../controllers/ScriptController');
const { validateRequest } = require('../../middleware/validateRequest');
const { scriptValidation } = require('../../validations/script.validation');
const { protect } = require('../../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas por dominio
router.get(
  '/domain/:domainId',
  ScriptController.getScripts
);

router.post(
  '/domain/:domainId/check-external',
  ScriptController.checkExternalScripts
);

router.get(
  '/domain/:domainId/generate-tags',
  ScriptController.generateScriptTags
);

router.patch(
  '/domain/:domainId/load-order',
  validateRequest(scriptValidation.updateLoadOrder),
  ScriptController.updateLoadOrder
);

// Rutas CRUD básicas
router.post(
  '/',
  validateRequest(scriptValidation.createScript),
  ScriptController.createScript
);

router.get(
  '/:id',
  ScriptController.getScript
);

router.patch(
  '/:id',
  validateRequest(scriptValidation.updateScript),
  ScriptController.updateScript
);

// Gestión de estado
router.patch(
  '/:id/status',
  validateRequest(scriptValidation.updateStatus),
  ScriptController.updateScriptStatus
);

module.exports = router;