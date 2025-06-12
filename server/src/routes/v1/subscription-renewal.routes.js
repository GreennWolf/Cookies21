const express = require('express');
const router = express.Router();
const SubscriptionRenewalController = require('../../controllers/SubscriptionRenewalController');
const { validateRequest } = require('../../middleware/validateRequest');
const { subscriptionRenewalValidation } = require('../../validations/subscription-renewal.validation');
const { protect, restrictTo } = require('../../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para usuarios (clientes)
router.post(
  '/request',
  validateRequest(subscriptionRenewalValidation.createRenewalRequest),
  SubscriptionRenewalController.createRenewalRequest
);

router.get(
  '/pending',
  SubscriptionRenewalController.checkPendingRequest
);

// Rutas para owners/admins
router.get(
  '/',
  restrictTo('owner'),
  validateRequest(subscriptionRenewalValidation.getRenewalRequests),
  SubscriptionRenewalController.getRenewalRequests
);

router.patch(
  '/:requestId',
  restrictTo('owner'),
  validateRequest(subscriptionRenewalValidation.updateRenewalRequest),
  SubscriptionRenewalController.updateRenewalRequest
);

module.exports = router;