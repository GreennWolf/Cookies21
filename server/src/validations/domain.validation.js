const { body } = require('express-validator');

const domainValidation = {
  createDomain: [
    body('domain')
      .trim()
      .notEmpty()
      .withMessage('Domain is required')
      .matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/)
      .withMessage('Invalid domain format'),
      
    // Campo clientId opcional (para owners)
    body('clientId')
      .optional()
      .isMongoId()
      .withMessage('Client ID must be a valid MongoDB ID'),

    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),

    body('settings.design')
      .optional()
      .isObject()
      .withMessage('Design settings must be an object'),

    body('settings.scanning')
      .optional()
      .isObject()
      .withMessage('Scanning settings must be an object'),

    body('settings.scanning.interval')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Scanning interval must be between 1 and 168 hours')
  ],

  updateDomain: [
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),

    body('settings.design')
      .optional()
      .isObject()
      .withMessage('Design settings must be an object'),

    body('settings.scanning')
      .optional()
      .isObject()
      .withMessage('Scanning settings must be an object'),

    body('settings.purposes')
      .optional()
      .isArray()
      .withMessage('Purposes must be an array'),

    body('settings.vendors')
      .optional()
      .isArray()
      .withMessage('Vendors must be an array')
  ],

  updateBannerConfig: [
    body('bannerConfig')
      .isObject()
      .withMessage('Banner configuration must be an object'),

    body('bannerConfig.components')
      .optional()
      .isArray()
      .withMessage('Components must be an array'),

    body('bannerConfig.components.*.type')
      .optional()
      .isIn(['text', 'button', 'link', 'logo', 'container'])
      .withMessage('Invalid component type'),

    body('bannerConfig.components.*.position')
      .optional()
      .isObject()
      .withMessage('Component position must be an object'),

    body('bannerConfig.components.*.style')
      .optional()
      .isObject()
      .withMessage('Component style must be an object')
  ],

  updateStatus: [
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'pending'])
      .withMessage('Invalid status')
  ]
};

module.exports = {
  domainValidation
};