const { body, param, query } = require('express-validator');

const advancedAnalysisValidation = {
  startAnalysis: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('scanType')
      .optional()
      .isIn(['quick', 'full', 'deep', 'custom'])
      .withMessage('Invalid scan type'),

    body('includeSubdomains')
      .optional()
      .isBoolean()
      .withMessage('includeSubdomains must be a boolean'),

    body('maxUrls')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('maxUrls must be between 1 and 1000'),

    body('depth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('depth must be between 1 and 10'),

    body('timeout')
      .optional()
      .isInt({ min: 5000, max: 120000 })
      .withMessage('timeout must be between 5000ms and 120000ms'),

    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high'])
      .withMessage('Invalid priority level')
  ],

  getAnalysisStatus: [
    param('analysisId')
      .isMongoId()
      .withMessage('Invalid analysis ID format')
  ],

  getAnalysisResults: [
    param('analysisId')
      .isMongoId()
      .withMessage('Invalid analysis ID format'),

    query('includeDetails')
      .optional()
      .isBoolean()
      .withMessage('includeDetails must be a boolean'),

    query('format')
      .optional()
      .isIn(['json', 'csv', 'pdf'])
      .withMessage('Invalid format. Must be json, csv, or pdf')
  ],

  getAnalysisHistory: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('status')
      .optional()
      .isIn(['pending', 'running', 'completed', 'failed', 'cancelled'])
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
      .withMessage('Limit must be between 1 and 100'),

    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'status', 'duration'])
      .withMessage('Invalid sortBy field'),

    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sortOrder must be asc or desc')
  ],

  getCookieTrends: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],

  compareAnalyses: [
    param('analysisId1')
      .isMongoId()
      .withMessage('Invalid first analysis ID format'),

    param('analysisId2')
      .isMongoId()
      .withMessage('Invalid second analysis ID format')
      .custom((value, { req }) => {
        return value !== req.params.analysisId1;
      })
      .withMessage('Cannot compare the same analysis with itself')
  ],

  scheduleAnalysis: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('schedule')
      .notEmpty()
      .withMessage('Schedule configuration is required'),

    body('schedule.frequency')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Frequency must be daily, weekly, or monthly'),

    body('schedule.time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:mm format'),

    body('schedule.daysOfWeek')
      .optional()
      .isArray()
      .withMessage('daysOfWeek must be an array')
      .custom((value) => {
        if (value && value.length > 0) {
          return value.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
        }
        return true;
      })
      .withMessage('daysOfWeek must contain integers between 0 and 6'),

    body('schedule.dayOfMonth')
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage('dayOfMonth must be between 1 and 31'),

    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('enabled must be a boolean'),

    body('analysisConfig')
      .optional()
      .isObject()
      .withMessage('analysisConfig must be an object'),

    body('analysisConfig.scanType')
      .optional()
      .isIn(['quick', 'full', 'deep', 'custom'])
      .withMessage('Invalid scan type in analysisConfig'),

    body('analysisConfig.includeSubdomains')
      .optional()
      .isBoolean()
      .withMessage('includeSubdomains must be a boolean in analysisConfig'),

    body('analysisConfig.maxUrls')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('maxUrls must be between 1 and 1000 in analysisConfig'),

    body('analysisConfig.depth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('depth must be between 1 and 10 in analysisConfig')
  ],

  // Validaciones para análisis inteligente
  startIntelligentAnalysis: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('deepScan')
      .optional()
      .isBoolean()
      .withMessage('deepScan must be a boolean'),

    body('includeThirdParty')
      .optional()
      .isBoolean()
      .withMessage('includeThirdParty must be a boolean'),

    body('timeout')
      .optional()
      .isInt({ min: 5000, max: 120000 })
      .withMessage('timeout must be between 5000ms and 120000ms'),

    body('generateRecommendations')
      .optional()
      .isBoolean()
      .withMessage('generateRecommendations must be a boolean')
  ],

  getIntelligentResults: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),

    query('includeDetails')
      .optional()
      .isBoolean()
      .withMessage('includeDetails must be a boolean')
  ],

  getComplianceReport: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    query('format')
      .optional()
      .isIn(['json', 'pdf', 'csv'])
      .withMessage('format must be json, pdf, or csv')
  ]
};

module.exports = {
  advancedAnalysisValidation
};