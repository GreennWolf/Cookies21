const { body, param, query } = require('express-validator');

const cookieScanValidation = {
  startScan: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('scanType')
      .optional()
      .isIn(['full', 'quick', 'custom'])
      .withMessage('Invalid scan type'),

    body('priority')
      .optional()
      .isIn(['high', 'normal', 'low'])
      .withMessage('Invalid priority level'),

    body('config')
      .optional()
      .isObject()
      .withMessage('Config must be an object'),

    body('config.maxUrls')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('maxUrls must be between 1 and 1000'),

    body('config.includeSubdomains')
      .optional()
      .isBoolean()
      .withMessage('includeSubdomains must be a boolean'),

    body('config.depth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('depth must be between 1 and 10')
  ],

  getScanStatus: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format')
  ],

  getScanHistory: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid status'),

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

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  cancelScan: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format')
  ],

  getScanResults: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format')
  ],

  applyChanges: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format'),

    body('changes')
      .isArray()
      .withMessage('Changes must be an array')
      .notEmpty()
      .withMessage('Changes array cannot be empty'),

    body('changes.*.type')
      .isIn(['add', 'update', 'delete'])
      .withMessage('Invalid change type'),

    body('changes.*.cookieId')
      .optional()
      .isMongoId()
      .withMessage('Invalid cookie ID format'),

    body('changes.*.cookie')
      .custom((value, { req }) => {
        if (['add', 'update'].includes(req.body.type)) {
          return value && typeof value === 'object';
        }
        return true;
      })
      .withMessage('Cookie object is required for add and update operations')
  ],

  scheduleScan: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('schedule.interval')
      .isInt({ min: 1, max: 168 }) // máximo 1 semana en horas
      .withMessage('Interval must be between 1 and 168 hours'),

    body('schedule.startTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid start time format (HH:mm)'),

    body('schedule.daysOfWeek')
      .optional()
      .isArray()
      .withMessage('daysOfWeek must be an array')
      .custom((value) => {
        return value.every(day => day >= 0 && day <= 6);
      })
      .withMessage('Invalid days of week (0-6)')
  ],

  getChanges: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format'),

    query('type')
      .optional()
      .isIn(['added', 'modified', 'removed'])
      .withMessage('Invalid change type filter')
  ],

  exportScan: [
    param('scanId')
      .isMongoId()
      .withMessage('Invalid scan ID format'),

    body('format')
      .optional()
      .isIn(['json', 'csv', 'pdf'])
      .withMessage('Invalid export format'),

    body('includeDetails')
      .optional()
      .isBoolean()
      .withMessage('includeDetails must be a boolean')
  ]
};

module.exports = {
  cookieScanValidation
};