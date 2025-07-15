// routes/v1/banner-template.routes.js
const express = require('express');
const router = express.Router();
const BannerTemplateController = require('../../controllers/BannerTemplateController');
const { validateRequest } = require('../../middleware/validateRequest');
const { bannerTemplateValidation } = require('../../validations/banner-tamplate.validation');
const { protect } = require('../../middleware/auth');
const { checkSubscriptionWithReadOnlyMode } = require('../../middleware/subscriptionCheck');
const { bannerImageUpload } = require('../../utils/multerConfig');
const { cacheControl } = require('../../middleware/cache');

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta para subir imágenes temporales durante edición
router.post(
  '/upload-temp-image',
  bannerImageUpload,
  BannerTemplateController.uploadTempImage
);

// Rutas públicas (con caché)
router.get(
  '/system',
  cacheControl('1 day'),
  validateRequest(bannerTemplateValidation.getSystemTemplates),
  BannerTemplateController.getSystemTemplates
);

// Rutas para plantillas del sistema (solo para usuarios owner)
router.post(
  '/system',
  bannerImageUpload,
  // validateRequest(bannerTemplateValidation.createSystemTemplate),
  BannerTemplateController.createSystemTemplate
);

router.patch(
  '/system/:id',
  bannerImageUpload,
  validateRequest(bannerTemplateValidation.updateSystemTemplate),
  BannerTemplateController.updateSystemTemplate
);

// Rutas de cliente
router.get(
  '/',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.getClientTemplates),
  BannerTemplateController.getClientTemplates
);

router.get(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.getTemplate),
  BannerTemplateController.getTemplate
);

router.patch(
  '/:id/unarchive',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.unarchiveTemplate
);

// Creación y actualización de template con soporte para imágenes
router.post('/', checkSubscriptionWithReadOnlyMode, bannerImageUpload, BannerTemplateController.createTemplate);

router.post(
  '/:id/clone',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.cloneTemplate),
  BannerTemplateController.cloneTemplate
);

router.patch('/:id', checkSubscriptionWithReadOnlyMode, bannerImageUpload, BannerTemplateController.updateTemplate);

router.post(
  '/preview',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.previewTemplate),
  BannerTemplateController.previewTemplate
);

router.patch(
  '/:id/archive',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.archiveTemplate),
  BannerTemplateController.archiveTemplate
);

router.get(
  '/:id/export',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.exportConfig),
  BannerTemplateController.exportConfig
);

router.get(
  '/:id/versions',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.getVersions),
  BannerTemplateController.getTemplateVersions
);

router.post(
  '/:id/restore',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.restoreVersion),
  BannerTemplateController.restoreVersion
);

router.post(
  '/:id/test',
  validateRequest(bannerTemplateValidation.testTemplate),
  BannerTemplateController.testTemplate
);

router.delete(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.deleteTemplate),
  BannerTemplateController.deleteTemplate
);

router.get(
  '/:id/export-script', 
  BannerTemplateController.exportEmbeddableScript
);

// Nuevo endpoint para limpiar imágenes no utilizadas
router.post(
  '/:id/cleanup-images',
  BannerTemplateController.cleanupBannerImages
);

// Endpoint para limpiar imágenes de banners eliminados (solo owners)
router.post(
  '/cleanup-deleted-banners',
  BannerTemplateController.cleanupDeletedBannersImages
);

// Rutas de asignación de banners a clientes (solo para owners)
router.patch(
  '/:id/assign-client',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(bannerTemplateValidation.assignBannerToClient),
  BannerTemplateController.assignBannerToClient
);

router.patch(
  '/:id/unassign-client',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.unassignBannerFromClient
);

router.get(
  '/available-for-assignment',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.getAvailableBannersForAssignment
);

// Rutas de traducción
router.post(
  '/:id/detect-languages',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.detectLanguages
);

router.post(
  '/:id/translate',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.translateBanner
);

router.get(
  '/:id/translations',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.getBannerTranslations
);

router.put(
  '/:id/translations/:lang',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.updateTranslation
);

router.get(
  '/translation-usage',
  BannerTemplateController.getTranslationUsage
);

// Ruta para enviar script por email
router.post(
  '/:id/send-script-email',
  checkSubscriptionWithReadOnlyMode,
  BannerTemplateController.sendScriptByEmail
);

module.exports = router;