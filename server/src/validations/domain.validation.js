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

    body('settings.defaultTemplateId')
      .optional()
      .isMongoId()
      .withMessage('Default template ID must be a valid MongoDB ID')
  ],

  updateDomain: [
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),

    body('settings.defaultTemplateId')
      .optional()
      .isMongoId()
      .withMessage('Default template ID must be a valid MongoDB ID')
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

    body('scanInterval')
      .optional()
      .isIn(['hourly', 'every-2-hours', 'every-6-hours', 'every-12-hours', 'daily', 'weekly', 'monthly'])
      .withMessage('Scan interval must be hourly, every-2-hours, every-6-hours, every-12-hours, daily, weekly, or monthly'),

    body('scanType')
      .optional()
      .isIn(['quick', 'full', 'smart'])
      .withMessage('Scan type must be quick, full, or smart'),

    body('includeSubdomains')
      .optional()
      .isBoolean()
      .withMessage('Include subdomains must be a boolean'),

    body('maxDepth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Max depth must be between 1 and 10')
  ]
};

module.exports = {
  domainValidation
};