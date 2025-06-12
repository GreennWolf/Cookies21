const express = require('express');
const router = express.Router();
const CookieController = require('../../controllers/CookieController');
const { validateRequest } = require('../../middleware/validateRequest');
const { cookieValidation } = require('../../validations/cookie.validation');
const { protect, restrictTo } = require('../../middleware/auth');
const { checkSubscriptionWithReadOnlyMode } = require('../../middleware/subscriptionCheck');

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta para obtener todas las cookies (para owners)
router.get(
  '/all',
  restrictTo('owner'),
  CookieController.getCookies
);

// Rutas por dominio
router.get(
  '/domain/:domainId',
  checkSubscriptionWithReadOnlyMode,
  CookieController.getCookies
);

router.get(
  '/domain/:domainId/stats',
  checkSubscriptionWithReadOnlyMode,
  CookieController.getCookieStats
);

// Rutas CRUD básicas
router.post(
  '/',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(cookieValidation.createCookie),
  CookieController.createCookie
);

router.get(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  CookieController.getCookie
);

router.patch(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  validateRequest(cookieValidation.updateCookie),
  CookieController.updateCookie
);

router.delete(
  '/bulk',
  checkSubscriptionWithReadOnlyMode,
  CookieController.deleteCookies
);

router.delete(
  '/:id',
  checkSubscriptionWithReadOnlyMode,
  CookieController.deleteCookie
);

// Gestión de estado
router.patch(
  '/:id/status',
  validateRequest(cookieValidation.updateStatus),
  CookieController.updateCookieStatus
);

// Funcionalidades adicionales
router.get(
  '/:id/similar',
  CookieController.findSimilarCookies
);

router.get(
  '/:id/compliance',
  CookieController.validateCompliance
);

module.exports = router;