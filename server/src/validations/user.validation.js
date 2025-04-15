const { body } = require('express-validator');

const userValidation = {
  createUser: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail(),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),

    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['admin', 'editor', 'viewer'])
      .withMessage('Invalid role'),

    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),

    body('permissions.*.resource')
      .optional()
      .isString()
      .withMessage('Resource must be a string'),

    body('permissions.*.actions')
      .optional()
      .isArray()
      .withMessage('Actions must be an array'),

    body('allowedDomains')
      .optional()
      .isArray()
      .withMessage('Allowed domains must be an array')
  ],

  updateUser: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),

    body('role')
      .optional()
      .trim()
      .isIn(['admin', 'editor', 'viewer'])
      .withMessage('Invalid role'),

    body('customPermissions')
      .optional()
      .isObject()
      .withMessage('Custom permissions must be an object'),

    body('accessControl')
      .optional()
      .isObject()
      .withMessage('Access control must be an object')
  ],

  toggleStatus: [
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status')
  ],

  updatePermissions: [
    body('permissions')
      .isArray()
      .withMessage('Permissions must be an array'),

    body('permissions.*.resource')
      .isString()
      .withMessage('Resource must be a string'),

    body('permissions.*.actions')
      .isArray()
      .withMessage('Actions must be an array')
      .custom((value) => {
        const validActions = ['create', 'read', 'update', 'delete'];
        return value.every(action => validActions.includes(action));
      })
      .withMessage('Invalid action in permissions')
  ],

  updatePreferences: [
    body('preferences')
      .isObject()
      .withMessage('Preferences must be an object'),

    body('preferences.language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Invalid language code'),

    body('preferences.notifications')
      .optional()
      .isObject()
      .withMessage('Notifications must be an object'),

    body('preferences.dashboardLayout')
      .optional()
      .isObject()
      .withMessage('Dashboard layout must be an object')
  ],

  verifyMFA: [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('MFA token is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('Invalid MFA token format')
  ]
};

module.exports = {
  userValidation
};