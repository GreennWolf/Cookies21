const express = require('express');
const router = express.Router();
const CookieController = require('../../controllers/CookieController');
const { validateRequest } = require('../../middleware/validateRequest');
const { cookieValidation } = require('../../validations/cookie.validation');
const { protect, restrictTo } = require('../../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas por dominio
router.get(
  '/domain/:domainId',
  CookieController.getCookies
);

router.get(
  '/domain/:domainId/stats',
  CookieController.getCookieStats
);

// Rutas CRUD básicas
router.post(
  '/',
  validateRequest(cookieValidation.createCookie),
  CookieController.createCookie
);

router.get(
  '/:id',
  CookieController.getCookie
);

router.patch(
  '/:id',
  validateRequest(cookieValidation.updateCookie),
  CookieController.updateCookie
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