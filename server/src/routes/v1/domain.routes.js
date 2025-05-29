const express = require('express');
const router = express.Router();
const DomainController = require('../../controllers/DomainController');
const { validateRequest } = require('../../middleware/validateRequest');
const { domainValidation } = require('../../validations/domain.validation');
const { protect, restrictTo } = require('../../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas CRUD básicas
router.post(
  '/',
  validateRequest(domainValidation.createDomain),
  DomainController.createDomain
);

router.patch(
  '/:domainId/default-template/:templateId',
  DomainController.setDefaultBannerTemplate
);

router.get(
  '/',
  DomainController.getDomains
);

router.get(
  '/:id',
  DomainController.getDomain
);

router.patch(
  '/:id',
  validateRequest(domainValidation.updateDomain),
  DomainController.updateDomain
);

router.delete(
  '/:id',
  restrictTo('admin'),
  DomainController.deleteDomain
);

// Configuración del banner
router.patch(
  '/:id/banner',
  validateRequest(domainValidation.updateBannerConfig),
  DomainController.updateBannerConfig
);

// Gestión de estado
router.patch(
  '/:id/status',
  restrictTo('admin'),
  validateRequest(domainValidation.updateStatus),
  DomainController.updateDomainStatus
);

// Verificación de dominio
router.post(
  '/:id/verify',
  DomainController.verifyDomainOwnership
);

// Asignar template a dominio por nombre (útil cuando el dominio ya se creó pero falta asignar template)
router.post(
  '/assign-template/:domainName',
  DomainController.assignTemplateByDomainName
);

module.exports = router;