const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/AuthController');
const { validateRequest } = require('../../middleware/validateRequest');
const { authValidation } = require('../../validations/auth.validation');
const { protect } = require('../../middleware/auth');
const { rateLimiter, RATE_LIMIT_TYPES } = require('../../middleware/rateLimiter');

// Rutas públicas
router.post(
  '/register',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // 3 registros por hora
  }),
  validateRequest(authValidation.register),
  AuthController.register
);

router.post(
  '/login',
  rateLimiter(RATE_LIMIT_TYPES.AUTH),
  validateRequest(authValidation.login),
  AuthController.login
);

router.post(
  '/refresh-token',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10 // 10 refreshes por hora
  }),
  validateRequest(authValidation.refreshToken),
  AuthController.refreshToken
);

router.post(
  '/forgot-password',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // 3 intentos por hora
  }),
  validateRequest(authValidation.forgotPassword),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // 3 intentos por hora
  }),
  validateRequest(authValidation.resetPassword),
  AuthController.resetPassword
);

// Rutas protegidas
router.use(protect);

router.post(
  '/logout',
  AuthController.logout
);

router.patch(
  '/change-password',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // 3 cambios por hora
  }),
  validateRequest(authValidation.changePassword),
  AuthController.changePassword
);

// Verificación de sesión (opcional)
router.get(
  '/session',
  AuthController.checkSession
);

module.exports = router;