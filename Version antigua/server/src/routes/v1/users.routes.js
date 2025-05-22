const express = require('express');
const router = express.Router();
const UserAccountController = require('../../controllers/UserAccountController');
const { validateRequest } = require('../../middleware/validateRequest');
const { userValidation } = require('../../validations/user.validation');
const { protect, restrictTo } = require('../../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para administradores
router.post(
  '/',
  restrictTo('admin'),
  validateRequest(userValidation.createUser),
  UserAccountController.createUser
);

router.get(
  '/',
  restrictTo('admin'),
  UserAccountController.getUsers
);

router.get(
  '/:id',
  restrictTo('admin'),
  UserAccountController.getUser
);

router.patch(
  '/:id',
  restrictTo('admin'),
  validateRequest(userValidation.updateUser),
  UserAccountController.updateUser
);

router.patch(
  '/:id/status',
  restrictTo('admin'),
  validateRequest(userValidation.toggleStatus),
  UserAccountController.toggleUserStatus
);

router.patch(
  '/:id/permissions',
  restrictTo('admin'),
  validateRequest(userValidation.updatePermissions),
  UserAccountController.updatePermissions
);

// Rutas para todos los usuarios autenticados
router.patch(
  '/preferences',
  validateRequest(userValidation.updatePreferences),
  UserAccountController.updatePreferences
);

// Rutas para MFA
router.post(
  '/mfa/setup',
  UserAccountController.setupMFA
);

router.post(
  '/mfa/verify',
  validateRequest(userValidation.verifyMFA),
  UserAccountController.verifyMFA
);

module.exports = router;