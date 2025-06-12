// routes/v1/users.routes.js
const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/UserController');
const { protect, restrictTo, hasPermission } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { userValidation } = require('../../validations/user.validation');
const { rateLimiter, RATE_LIMIT_TYPES } = require('../../middleware/rateLimiter');
const { requireActiveSubscription, checkSubscriptionLimits } = require('../../middleware/subscriptionCheck');

// Proteger todas las rutas para que solo usuarios autenticados puedan acceder
router.use(protect);

// Obtener todos los usuarios
// Solo owner puede acceder a todos los usuarios (y filtrar por clientId)
// Admin solo puede ver usuarios de su cliente
router.get(
  '/',
  hasPermission('users', 'read'),
  UserController.getUsers
);

// Crear un nuevo usuario
// Solo owner y admin pueden crear usuarios
router.post(
  '/',
  requireActiveSubscription,
  checkSubscriptionLimits('users'),
  hasPermission('users', 'create'),
  validateRequest(userValidation.createUser),
  UserController.createUser
);

// Obtener un usuario específico
router.get(
  '/:userId',
  hasPermission('users', 'read'),
  UserController.getUser
);

// Actualizar un usuario
router.patch(
  '/:userId',
  hasPermission('users', 'update'),
  validateRequest(userValidation.updateUser),
  UserController.updateUser
);

// Cambiar estado de un usuario (activar/inactivar/suspender)
router.patch(
  '/:userId/status',
  hasPermission('users', 'update'),
  validateRequest(userValidation.toggleStatus),
  UserController.toggleUserStatus
);

// Reenviar invitación a un usuario pendiente
router.post(
  '/:userId/resend-invitation',
  hasPermission('users', 'update'),
  validateRequest(userValidation.resendInvitation),
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10 // 10 reenvíos por hora
  }),
  UserController.resendInvitation
);

// Actualizar permisos personalizados
router.patch(
  '/:userId/permissions',
  hasPermission('users', 'update'),
  validateRequest(userValidation.updatePermissions),
  UserController.updatePermissions
);

// Actualizar preferencias propias del usuario
router.patch(
  '/preferences',
  validateRequest(userValidation.updatePreferences),
  UserController.updatePreferences
);

router.post(
  '/change-password',
  validateRequest(userValidation.changePassword),
  rateLimiter(RATE_LIMIT_TYPES.AUTH, {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // 5 intentos por 15 minutos
  }),
  UserController.changePassword
);

module.exports = router;