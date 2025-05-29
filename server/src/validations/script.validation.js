const { body, param } = require('express-validator');

const scriptValidation = {
  createScript: [
    body('domainId')
      .notEmpty()
      .withMessage('Domain ID is required')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Script name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('provider')
      .trim()
      .notEmpty()
      .withMessage('Provider is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Provider must be between 2 and 100 characters'),

    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['analytics', 'marketing', 'personalization'])
      .withMessage('Invalid category'),

    body('type')
      .notEmpty()
      .withMessage('Type is required')
      .isIn(['inline', 'external'])
      .withMessage('Invalid type'),

    body('content')
      .custom((value, { req }) => {
        if (req.body.type === 'inline' && !value) {
          throw new Error('Content is required for inline scripts');
        }
        if (value && value.includes('<script>')) {
          throw new Error('Inline script tags are not allowed in content');
        }
        return true;
      }),

    body('url')
      .custom((value, { req }) => {
        if (req.body.type === 'external' && !value) {
          throw new Error('URL is required for external scripts');
        }
        if (value) {
          const urlPattern = /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
          if (!urlPattern.test(value)) {
            throw new Error('Invalid URL format');
          }
        }
        return true;
      }),

    body('loadConfig')
      .optional()
      .isObject()
      .withMessage('Load config must be an object'),

    body('loadConfig.async')
      .optional()
      .isBoolean()
      .withMessage('Async must be a boolean'),

    body('loadConfig.defer')
      .optional()
      .isBoolean()
      .withMessage('Defer must be a boolean'),

    body('loadConfig.attributes')
      .optional()
      .isArray()
      .withMessage('Attributes must be an array'),

    body('loadConfig.attributes.*.name')
      .optional()
      .isString()
      .withMessage('Attribute name must be a string')
      .matches(/^[a-zA-Z0-9-_]+$/)
      .withMessage('Invalid attribute name format'),

    body('loadConfig.attributes.*.value')
      .optional()
      .isString()
      .withMessage('Attribute value must be a string'),

    body('loadConfig.loadOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Load order must be a positive integer'),

    body('dependencies')
      .optional()
      .isArray()
      .withMessage('Dependencies must be an array'),

    body('dependencies.*.scriptId')
      .optional()
      .isMongoId()
      .withMessage('Invalid script ID in dependencies'),

    body('dependencies.*.loadOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Dependency load order must be a positive integer'),

    body('blockingConfig')
      .optional()
      .isObject()
      .withMessage('Blocking config must be an object'),

    body('blockingConfig.enabled')
      .optional()
      .isBoolean()
      .withMessage('Blocking enabled must be a boolean'),

    body('blockingConfig.replacementContent')
      .optional()
      .isString()
      .withMessage('Replacement content must be a string'),

    body('blockingConfig.fallbackBehavior')
      .optional()
      .isIn(['none', 'placeholder', 'custom'])
      .withMessage('Invalid fallback behavior')
  ],

  updateScript: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('provider')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Provider must be between 2 and 100 characters'),

    body('category')
      .optional()
      .isIn(['analytics', 'marketing', 'personalization'])
      .withMessage('Invalid category'),

    body('content')
      .optional()
      .custom((value, { req }) => {
        if (value && value.includes('<script>')) {
          throw new Error('Inline script tags are not allowed in content');
        }
        return true;
      }),

    body('url')
      .optional()
      .custom((value) => {
        if (value) {
          const urlPattern = /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
          if (!urlPattern.test(value)) {
            throw new Error('Invalid URL format');
          }
        }
        return true;
      }),

    body('loadConfig')
      .optional()
      .isObject()
      .withMessage('Load config must be an object'),

    body('blockingConfig')
      .optional()
      .isObject()
      .withMessage('Blocking config must be an object')
  ],

  updateStatus: [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'pending_review', 'blocked'])
      .withMessage('Invalid status')
  ],

  updateLoadOrder: [
    body('scriptOrder')
      .isArray()
      .withMessage('Script order must be an array'),

    body('scriptOrder.*.scriptId')
      .isMongoId()
      .withMessage('Invalid script ID format'),

    body('scriptOrder')
      .custom((value) => {
        const ids = value.map(item => item.scriptId);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          throw new Error('Duplicate script IDs in order');
        }
        return true;
      })
  ],

  validateDomainParam: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format')
  ],

  validateScriptParam: [
    param('id')
      .isMongoId()
      .withMessage('Invalid script ID format')
  ]
};

module.exports = {
  scriptValidation
};