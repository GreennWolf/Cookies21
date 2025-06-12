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
  ],

  configureScheduledAnalysis: [
    body('enabled')
      .isBoolean()
      .withMessage('Enabled must be a boolean'),

    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Frequency must be daily, weekly, or monthly'),

    body('time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:mm format'),

    body('daysOfWeek')
      .optional()
      .isArray()
      .withMessage('Days of week must be an array'),

    body('daysOfWeek.*')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('Days of week must be integers between 0 and 6'),

    body('dayOfMonth')
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage('Day of month must be between 1 and 31'),

    body('analysisConfig')
      .optional()
      .isObject()
      .withMessage('Analysis config must be an object'),

    body('analysisConfig.scanType')
      .optional()
      .isIn(['quick', 'full', 'deep'])
      .withMessage('Scan type must be quick, full, or deep'),

    body('analysisConfig.includeSubdomains')
      .optional()
      .isBoolean()
      .withMessage('Include subdomains must be a boolean'),

    body('analysisConfig.maxUrls')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Max URLs must be between 1 and 1000'),

    body('analysisConfig.depth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Depth must be between 1 and 10')
  ]
};

module.exports = {
  domainValidation
};