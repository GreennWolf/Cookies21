const express = require('express');
const router = express.Router();
const DomainController = require('../../controllers/DomainController');
const { validateRequest } = require('../../middleware/validateRequest');
const { domainValidation } = require('../../validations/domain.validation');
const { protect, restrictTo } = require('../../middleware/auth');
const { checkSubscriptionWithReadOnlyMode, checkSubscriptionLimits } = require('../../middleware/subscriptionCheck');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas CRUD básicas
router.post(
  '/',
  checkSubscriptionWithReadOnlyMode,
  checkSubscriptionLimits('domains'),
  validateRequest(domainValidation.createDomain),
  DomainController.createDomain
);

router.patch(
  '/:domainId/default-template/:templateId',
  checkSubscriptionWithReadOnlyMode,
  DomainController.setDefaultBannerTemplate
);

router.get(
  '/',
  checkSubscriptionWithReadOnlyMode,
  DomainController.getDomains
);

router.get(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  DomainController.getDomain
);

router.patch(
  '/:id',
  validateRequest(domainValidation.updateDomain),
  DomainController.updateDomain
);

router.delete(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  restrictTo('owner', 'admin'),
  DomainController.deleteDomain
);

// Configuración del banner
router.patch(
  '/:id/banner',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(domainValidation.updateBannerConfig),
  DomainController.updateBannerConfig
);

// Gestión de estado
router.patch(
  '/:id/status',
  checkSubscriptionWithReadOnlyMode,
  restrictTo('owner', 'admin'),
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

// Rutas para análisis programado
router.post(
  '/:domainId/scheduled-analysis',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(domainValidation.configureScheduledAnalysis),
  DomainController.configureScheduledAnalysis
);

router.get(
  '/:domainId/scheduled-analysis',
  DomainController.getScheduledAnalysisConfig
);

router.post(
  '/:domainId/trigger-analysis',
  checkSubscriptionWithReadOnlyMode,
  DomainController.triggerImmediateAnalysis
);

// Ruta solo para owners - ver estado global de análisis programados
router.get(
  '/admin/scheduled-analysis-status',
  restrictTo('owner'),
  DomainController.getScheduledAnalysisStatus
);

module.exports = router;