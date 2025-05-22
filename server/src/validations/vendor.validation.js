const { query, param } = require('express-validator');

const vendorValidation = {
  getVendorList: [
    query('language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Invalid language code')
  ],

  getVendorListVersion: [
    param('version')
      .isInt({ min: 1 })
      .withMessage('Invalid version number'),

    query('language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Invalid language code')
  ],

  getVendorInfo: [
    param('vendorId')
      .isInt({ min: 1 })
      .withMessage('Invalid vendor ID'),

    query('language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Invalid language code')
  ],

  searchVendors: [
    query('query')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),

    query('category')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid category ID'),

    query('features')
      .optional()
      .custom((value) => {
        if (value) {
          const features = value.split(',').map(Number);
          return features.every(f => Number.isInteger(f) && f > 0);
        }
        return true;
      })
      .withMessage('Invalid features format')
  ],

  getVersionChanges: [
    query('oldVersion')
      .isInt({ min: 1 })
      .withMessage('Invalid old version number'),

    query('newVersion')
      .isInt({ min: 1 })
      .withMessage('Invalid new version number')
      .custom((value, { req }) => {
        const oldVersion = parseInt(req.query.oldVersion);
        const newVersion = parseInt(value);
        return newVersion > oldVersion;
      })
      .withMessage('New version must be greater than old version')
  ]
};

module.exports = {
  vendorValidation
};