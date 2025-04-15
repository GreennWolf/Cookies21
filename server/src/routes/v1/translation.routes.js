const express = require('express');
const router = express.Router();
const TranslationController = require('../../controllers/TranslationController');
const { validateRequest } = require('../../middleware/validateRequest');
const { translationValidation } = require('../../validations/translation.validation');
const { protect } = require('../../middleware/auth');
const { checkDomainAccess } = require('../../middleware/domainAccess');
const { rateLimiter } = require('../../middleware/rateLimiter');

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta para traducción simple
router.post(
  '/translate',
  rateLimiter('translation', {
    windowMs: 60 * 1000, // 1 minuto
    max: 100 // 100 solicitudes por minuto
  }),
  validateRequest(translationValidation.translate),
  TranslationController.translate
);

// Ruta para traducción en lote
router.post(
  '/translate/batch',
  rateLimiter('translation_batch', {
    windowMs: 60 * 1000,
    max: 20 // 20 solicitudes por minuto
  }),
  validateRequest(translationValidation.translateBatch),
  TranslationController.translateBatch
);

// Ruta para traducir banner completo
router.post(
  '/domain/:domainId/translate',
  checkDomainAccess,
  rateLimiter('banner_translation', {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10 // 10 solicitudes por 5 minutos
  }),
  validateRequest(translationValidation.translateBanner),
  TranslationController.translateBanner
);

// Ruta para refrescar traducciones
router.post(
  '/domain/:domainId/refresh',
  checkDomainAccess,
  rateLimiter('translation_refresh', {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5 // 5 solicitudes por hora
  }),
  validateRequest(translationValidation.refreshTranslations),
  TranslationController.refreshTranslations
);

module.exports = router;