const { body } = require('express-validator');

const cookieValidation = {
  createCookie: [
    body('domainId')
      .notEmpty()
      .withMessage('Domain ID is required')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Cookie name is required')
      .matches(/^[a-zA-Z0-9_\-.]+$/)
      .withMessage('Invalid cookie name format'),

    body('provider')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Provider name must be between 2 and 100 characters'),

    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['necessary', 'analytics', 'marketing', 'personalization'])
      .withMessage('Invalid category'),

    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),

    body('purpose')
      .optional()
      .isObject()
      .withMessage('Purpose must be an object'),

    body('purpose.id')
      .optional()
      .isInt()
      .withMessage('Purpose ID must be an integer'),

    body('attributes')
      .optional()
      .isObject()
      .withMessage('Attributes must be an object'),

    body('attributes.duration')
      .optional()
      .isString()
      .withMessage('Duration must be a string'),

    body('script')
      .optional()
      .isObject()
      .withMessage('Script must be an object')
  ],

  updateCookie: [
    body('provider')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Provider name must be between 2 and 100 characters'),

    body('category')
      .optional()
      .isIn(['necessary', 'analytics', 'marketing', 'personalization'])
      .withMessage('Invalid category'),

    body('description')
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),

    body('purpose')
      .optional()
      .isObject()
      .withMessage('Purpose must be an object'),

    body('attributes')
      .optional()
      .isObject()
      .withMessage('Attributes must be an object'),

    body('script')
      .optional()
      .isObject()
      .withMessage('Script must be an object')
  ],

  updateStatus: [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'pending_review'])
      .withMessage('Invalid status')
  ]
};

module.exports = {
  cookieValidation
};