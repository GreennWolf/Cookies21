const { body, param } = require('express-validator');

const integrationValidation = {
  configureGoogleAnalytics: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('measurementId')
      .notEmpty()
      .withMessage('Measurement ID is required')
      .matches(/^G-[A-Z0-9]+$/)
      .withMessage('Invalid Google Analytics measurement ID format'),

    body('config')
      .isObject()
      .withMessage('Config must be an object'),

    body('config.sendPageViews')
      .optional()
      .isBoolean()
      .withMessage('sendPageViews must be a boolean'),

    body('config.anonymizeIp')
      .optional()
      .isBoolean()
      .withMessage('anonymizeIp must be a boolean'),

    body('config.credentials')
      .optional()
      .isObject()
      .withMessage('Credentials must be an object'),

    body('config.credentials.clientId')
      .if(body('config.credentials').exists())
      .notEmpty()
      .withMessage('Client ID is required for credentials'),

    body('config.credentials.clientSecret')
      .if(body('config.credentials').exists())
      .notEmpty()
      .withMessage('Client secret is required for credentials')
  ],

  configureGTM: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('containerId')
      .notEmpty()
      .withMessage('Container ID is required')
      .matches(/^GTM-[A-Z0-9]+$/)
      .withMessage('Invalid GTM container ID format'),

    body('config')
      .isObject()
      .withMessage('Config must be an object'),

    body('config.dataLayer')
      .optional()
      .isBoolean()
      .withMessage('dataLayer must be a boolean'),

    body('config.events')
      .optional()
      .isArray()
      .withMessage('Events must be an array'),

    body('config.events.*')
      .optional()
      .isString()
      .withMessage('Event names must be strings')
  ],

  configureIAB: [
    body('cmpId')
      .notEmpty()
      .withMessage('CMP ID is required')
      .isInt({ min: 1 })
      .withMessage('Invalid CMP ID'),

    body('config')
      .isObject()
      .withMessage('Config must be an object'),

    body('config.version')
      .notEmpty()
      .withMessage('TCF version is required')
      .matches(/^2\.\d+$/)
      .withMessage('Invalid TCF version format'),

    body('config.scope')
      .optional()
      .isIn(['global', 'service-specific'])
      .withMessage('Invalid scope value'),

    body('config.vendorListVersion')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid vendor list version')
  ],

  configureWebhook: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('url')
      .notEmpty()
      .withMessage('Webhook URL is required')
      .isURL({
        protocols: ['http', 'https'],
        require_protocol: true
      })
      .withMessage('Invalid webhook URL format'),

    body('events')
      .isArray()
      .withMessage('Events must be an array')
      .notEmpty()
      .withMessage('At least one event is required'),

    body('events.*')
      .isIn([
        'consent.created',
        'consent.updated',
        'consent.revoked',
        'cookie.detected',
        'scan.completed'
      ])
      .withMessage('Invalid event type'),

    body('secret')
      .notEmpty()
      .withMessage('Webhook secret is required')
      .isLength({ min: 32 })
      .withMessage('Webhook secret must be at least 32 characters long'),

    body('config')
      .optional()
      .isObject()
      .withMessage('Config must be an object'),

    body('config.retryAttempts')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Retry attempts must be between 0 and 10'),

    body('config.timeout')
      .optional()
      .isInt({ min: 1000, max: 30000 })
      .withMessage('Timeout must be between 1000 and 30000 ms')
  ],

  testWebhook: [
    body('url')
      .notEmpty()
      .withMessage('Webhook URL is required')
      .isURL({
        protocols: ['http', 'https'],
        require_protocol: true
      })
      .withMessage('Invalid webhook URL format'),

    body('secret')
      .notEmpty()
      .withMessage('Webhook secret is required')
      .isLength({ min: 32 })
      .withMessage('Webhook secret must be at least 32 characters long')
  ],

  getIntegrationStatus: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format')
  ]
};

module.exports = {
  integrationValidation
};