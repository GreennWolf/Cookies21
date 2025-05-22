// routes/v1/banner-template.routes.js
const express = require('express');
const router = express.Router();
const BannerTemplateController = require('../../controllers/BannerTemplateController');
const { validateRequest } = require('../../middleware/validateRequest');
const { bannerTemplateValidation } = require('../../validations/banner-tamplate.validation');
const { protect } = require('../../middleware/auth');
const { bannerImageUpload } = require('../../utils/multerConfig');
const { cacheControl } = require('../../middleware/cache');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas públicas (con caché)
router.get(
  '/system',
  cacheControl('1 day'),
  validateRequest(bannerTemplateValidation.getSystemTemplates),
  BannerTemplateController.getSystemTemplates
);

// Rutas de cliente
router.get(
  '/',
  validateRequest(bannerTemplateValidation.getClientTemplates),
  BannerTemplateController.getClientTemplates
);

router.get(
  '/:id',
  validateRequest(bannerTemplateValidation.getTemplate),
  BannerTemplateController.getTemplate
);

router.patch(
  '/:id/unarchive',
  BannerTemplateController.unarchiveTemplate
);

// Creación y actualización de template con soporte para imágenes
router.post('/', bannerImageUpload, BannerTemplateController.createTemplate);

router.post(
  '/:id/clone',
  validateRequest(bannerTemplateValidation.cloneTemplate),
  BannerTemplateController.cloneTemplate
);

router.patch('/:id', bannerImageUpload, BannerTemplateController.updateTemplate);

router.post(
  '/preview',
  validateRequest(bannerTemplateValidation.previewTemplate),
  BannerTemplateController.previewTemplate
);

router.patch(
  '/:id/archive',
  validateRequest(bannerTemplateValidation.archiveTemplate),
  BannerTemplateController.archiveTemplate
);

router.get(
  '/:id/export',
  validateRequest(bannerTemplateValidation.exportConfig),
  BannerTemplateController.exportConfig
);

router.get(
  '/:id/versions',
  validateRequest(bannerTemplateValidation.getVersions),
  BannerTemplateController.getTemplateVersions
);

router.post(
  '/:id/restore',
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
  BannerTemplateController.deleteTemplate
);

router.get(
  '/:id/export-script', 
  BannerTemplateController.exportEmbeddableScript
);

module.exports = router;