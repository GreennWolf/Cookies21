// routes/v1/invitation.routes.js
const express = require('express');
const router = express.Router();
const InvitationController = require('../../controllers/InvitationController');
const { protect } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { invitationValidation } = require('../../validations/invitation.validation');
const { rateLimiter, RATE_LIMIT_TYPES } = require('../../middleware/rateLimiter');

// Rutas públicas (no requieren autenticación)

// Verificar token de invitación
router.get(
  '/:token',
  rateLimiter(RATE_LIMIT_TYPES.PUBLIC, {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10 // 10 verificaciones por ventana
  }),
  InvitationController.verifyInvitation
);

// Completar registro (establecer contraseña)
router.post(
  '/complete-registration',
  rateLimiter(RATE_LIMIT_TYPES.PUBLIC, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5 // 5 intentos por hora
  }),
  validateRequest(invitationValidation.completeRegistration),
  InvitationController.completeRegistration
);

// Rutas protegidas (requieren autenticación)
router.use(protect);

// Reenviar invitación
router.post(
  '/resend/:userId',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10 // 10 reenvíos por hora
  }),
  validateRequest(invitationValidation.resendInvitation),
  InvitationController.resendInvitation
);

// Enviar invitación directamente (útil para testing y depuración)
router.post(
  '/send-direct/:userId',
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10 // 10 envíos por hora
  }),
  InvitationController.sendInvitationDirect
);

module.exports = router;