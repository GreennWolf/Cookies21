const { body, query, param } = require('express-validator');

const consentValidation = {
  getConsent: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),
    
    query('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string')
  ],

  updateConsent: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string'),

    body('decisions')
      .notEmpty()
      .withMessage('Decisions are required')
      .isObject()
      .withMessage('Decisions must be an object'),

    body('decisions.purposes')
      .isArray()
      .withMessage('Purposes must be an array'),

    body('decisions.purposes.*.id')
      .isInt({ min: 1 })
      .withMessage('Purpose ID must be a positive integer'),

    body('decisions.purposes.*.allowed')
      .isBoolean()
      .withMessage('Purpose allowed must be a boolean'),

    body('decisions.purposes.*.legalBasis')
      .optional()
      .isIn(['consent', 'legitimate_interest', 'legal_obligation'])
      .withMessage('Invalid legal basis'),

    body('decisions.vendors')
      .isArray()
      .withMessage('Vendors must be an array'),

    body('decisions.vendors.*.id')
      .isInt({ min: 1 })
      .withMessage('Vendor ID must be a positive integer'),

    body('decisions.vendors.*.allowed')
      .isBoolean()
      .withMessage('Vendor allowed must be a boolean'),

    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),

    body('metadata.language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Invalid language code'),

    body('metadata.deviceType')
      .optional()
      .isString()
      .withMessage('Device type must be a string')
  ],

  revokeConsent: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string')
  ],

  verifyConsent: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string'),

    query('purposes')
      .optional()
      .custom((value) => {
        if (value) {
          const purposes = value.split(',').map(Number);
          return purposes.every(p => Number.isInteger(p) && p > 0);
        }
        return true;
      })
      .withMessage('Invalid purposes format'),

    query('vendors')
      .optional()
      .custom((value) => {
        if (value) {
          const vendors = value.split(',').map(Number);
          return vendors.every(v => Number.isInteger(v) && v > 0);
        }
        return true;
      })
      .withMessage('Invalid vendors format')
  ],

  getHistory: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (value && req.query.startDate) {
          return new Date(value) > new Date(req.query.startDate);
        }
        return true;
      })
      .withMessage('End date must be after start date')
  ],

  decodeTCString: [
    body('tcString')
      .notEmpty()
      .withMessage('TC String is required')
      .isString()
      .withMessage('TC String must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Invalid TC String format')
  ]
};

module.exports = {
  consentValidation
};