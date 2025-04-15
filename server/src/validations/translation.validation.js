const { body, param } = require('express-validator');

// Lista de idiomas soportados (ISO 639-1)
const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 
  'ko', 'zh', 'ar', 'hi', 'tr', 'vi', 'th', 'id', 'cs', 'da', 
  'fi', 'el', 'he', 'hu', 'no', 'ro', 'sk', 'sv', 'uk'
];

const translationValidation = {
  translate: [
    body('text')
      .notEmpty()
      .withMessage('Text is required')
      .isString()
      .withMessage('Text must be a string')
      .isLength({ max: 5000 })
      .withMessage('Text cannot exceed 5000 characters'),

    body('targetLanguage')
      .notEmpty()
      .withMessage('Target language is required')
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported target language'),

    body('sourceLanguage')
      .optional()
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported source language')
  ],

  translateBatch: [
    body('texts')
      .isArray()
      .withMessage('Texts must be an array')
      .notEmpty()
      .withMessage('Texts array cannot be empty')
      .custom((texts) => {
        const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
        return totalLength <= 50000; // Límite total de caracteres
      })
      .withMessage('Total text length exceeds limit'),

    body('texts.*')
      .isString()
      .withMessage('Each text must be a string')
      .isLength({ max: 5000 })
      .withMessage('Individual text cannot exceed 5000 characters'),

    body('targetLanguage')
      .notEmpty()
      .withMessage('Target language is required')
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported target language'),

    body('sourceLanguage')
      .optional()
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported source language')
  ],

  translateBanner: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('targetLanguage')
      .notEmpty()
      .withMessage('Target language is required')
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported target language'),

    body('components')
      .optional()
      .isArray()
      .withMessage('Components must be an array')
      .custom((components) => {
        const hasInvalidComponent = components.some(comp => 
          !comp.id || typeof comp.id !== 'string'
        );
        return !hasInvalidComponent;
      })
      .withMessage('Invalid component format')
  ],

  refreshTranslations: [
    param('domainId')
      .isMongoId()
      .withMessage('Invalid domain ID format'),

    body('languages')
      .isArray()
      .withMessage('Languages must be an array')
      .notEmpty()
      .withMessage('Languages array cannot be empty')
      .custom((languages) => {
        return languages.every(lang => SUPPORTED_LANGUAGES.includes(lang));
      })
      .withMessage('One or more unsupported languages'),

    body('force')
      .optional()
      .isBoolean()
      .withMessage('Force must be a boolean'),

    body('components')
      .optional()
      .isArray()
      .withMessage('Components must be an array')
      .custom((components) => {
        if (!components.length) return true;
        return components.every(comp => 
          typeof comp === 'string' && comp.length > 0
        );
      })
      .withMessage('Invalid component IDs format')
  ]
};

// Constantes exportadas
translationValidation.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;

module.exports = {
  translationValidation
};