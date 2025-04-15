const { query, param } = require('express-validator');

const auditValidation = {
  getAuditLogs: [
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
      .withMessage('End date must be after start date'),

    query('action')
      .optional()
      .isIn([
        'create',
        'update',
        'delete',
        'login',
        'logout',
        'export',
        'import',
        'enable',
        'disable',
        'configure',
        'scan',
        'reset'
      ])
      .withMessage('Invalid action type'),

    query('resourceType')
      .optional()
      .isIn([
        'cookie',
        'script',
        'banner',
        'domain',
        'user',
        'template',
        'consent',
        'apiKey',
        'settings'
      ])
      .withMessage('Invalid resource type'),

    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),

    query('status')
      .optional()
      .isIn(['success', 'failure', 'warning'])
      .withMessage('Invalid status'),

    query('userId')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID format'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getDomainAuditLogs: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format')
  ],

  getAuditEvent: [
    param('id')
      .isMongoId()
      .withMessage('Invalid event ID format')
  ],

  getActivitySummary: [
    query('period')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Period must be between 1 and 168 hours')
  ],

  getAuditStats: [
    query('startDate')
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        return new Date(value) > new Date(req.query.startDate);
      })
      .withMessage('End date must be after start date')
  ],

  exportLogs: [
    query('startDate')
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        return new Date(value) > new Date(req.query.startDate);
      })
      .withMessage('End date must be after start date'),

    query('format')
      .optional()
      .isIn(['json', 'csv', 'pdf'])
      .withMessage('Invalid export format')
  ]
};

module.exports = {
  auditValidation
};