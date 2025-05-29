// routes/v1/subscription.routes.js
const express = require('express');
const router = express.Router();
const SubscriptionPlanController = require('../../controllers/SubscriptionPlanController');
const { protect, restrictTo } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { subscriptionValidation } = require('../../validations/subscription.validation');

// Proteger todas las rutas para que solo usuarios autenticados puedan acceder
router.use(protect);

// Solo usuarios owner pueden acceder a las rutas de suscripción
router.use(restrictTo('owner'));

// Inicializar planes predeterminados
router.post(
  '/initialize',
  SubscriptionPlanController.initDefaultPlans
);

// Obtener todos los planes
router.get(
  '/',
  SubscriptionPlanController.getPlans
);

// Crear un nuevo plan
router.post(
  '/',
  validateRequest(subscriptionValidation.createPlan),
  SubscriptionPlanController.createPlan
);

// Obtener un plan específico
router.get(
  '/:id',
  SubscriptionPlanController.getPlan
);

// Actualizar un plan
router.patch(
  '/:id',
  validateRequest(subscriptionValidation.updatePlan),
  SubscriptionPlanController.updatePlan
);

// Clonar un plan existente
router.post(
  '/:id/clone',
  validateRequest(subscriptionValidation.clonePlan),
  SubscriptionPlanController.clonePlan
);

// Cambiar estado de un plan (activar/inactivar/archivar)
router.patch(
  '/:id/status',
  validateRequest(subscriptionValidation.toggleStatus),
  SubscriptionPlanController.togglePlanStatus
);

// Asignar un plan a un cliente
router.post(
  '/:planId/assign/:clientId',
  validateRequest(subscriptionValidation.assignPlanToClient),
  SubscriptionPlanController.assignPlanToClient
);

module.exports = router;