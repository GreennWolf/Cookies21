/**
 * Tipos y interfaces para el LanguageButton Enhanced
 * Archivo de definición de tipos para el sistema de traducción
 */

// ============================================================================
// CONFIGURACIÓN PRINCIPAL
// ============================================================================

/**
 * Configuración completa del LanguageButton Enhanced
 * @typedef {Object} LanguageButtonConfig
 */
export const defaultLanguageButtonConfig = {
  // === CONFIGURACIÓN DE MODO ===
  mode: 'auto-detect',           // 'auto-detect' | 'manual'
  fallbackLanguage: 'en',        // Idioma por defecto si detección falla
  preferBrowserLanguage: true,   // Priorizar idioma del navegador
  saveUserChoice: true,          // Guardar selección del usuario
  
  // === IDIOMAS DISPONIBLES ===
  enabledLanguages: ['en', 'es', 'fr', 'de'],
  originalLanguage: null,        // Se detecta automáticamente
  manualLanguageOverrides: {},   // Override manual por componente
  
  // === CONFIGURACIÓN DE TRADUCCIONES ===
  translationSettings: {
    enableAutoTranslation: true,
    cacheTranslations: true,
    fallbackToOriginal: true,
    showTranslationIndicator: true,
    translationProvider: 'google',
    maxTranslationAttempts: 3
  },
  
  // === CONFIGURACIÓN VISUAL (heredada) ===
  displayMode: 'flag-dropdown',
  size: 'medium',
  style: 'modern',
  showLabel: true,
  position: 'bottom-right',
  
  // === CONFIGURACIÓN TÉCNICA ===
  required: true,
  loadTimeout: 5000,
  debounceDelay: 300
};

// ============================================================================
// IDIOMAS DISPONIBLES EXTENDIDA
// ============================================================================

export const EXTENDED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    initials: 'EN',
    direction: 'ltr',
    region: 'GB',
    priority: 1,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU']
  },
  {
    code: 'es',
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    initials: 'ES',
    direction: 'ltr',
    region: 'ES',
    priority: 1,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['es', 'es-ES', 'es-MX', 'es-AR', 'es-CO']
  },
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    initials: 'FR',
    direction: 'ltr',
    region: 'FR',
    priority: 1,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH']
  },
  {
    code: 'de',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    initials: 'DE',
    direction: 'ltr',
    region: 'DE',
    priority: 1,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['de', 'de-DE', 'de-AT', 'de-CH']
  },
  {
    code: 'it',
    name: 'Italiano',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    initials: 'IT',
    direction: 'ltr',
    region: 'IT',
    priority: 2,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['it', 'it-IT', 'it-CH']
  },
  {
    code: 'pt',
    name: 'Português',
    nativeName: 'Português',
    flag: '🇵🇹',
    initials: 'PT',
    direction: 'ltr',
    region: 'PT',
    priority: 2,
    supportedBy: ['google', 'custom'],
    translationQuality: 'high',
    browserCodes: ['pt', 'pt-PT', 'pt-BR']
  },
  {
    code: 'nl',
    name: 'Nederlands',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    initials: 'NL',
    direction: 'ltr',
    region: 'NL',
    priority: 2,
    supportedBy: ['google', 'custom'],
    translationQuality: 'medium',
    browserCodes: ['nl', 'nl-NL', 'nl-BE']
  },
  {
    code: 'ru',
    name: 'Русский',
    nativeName: 'Русский',
    flag: '🇷🇺',
    initials: 'RU',
    direction: 'ltr',
    region: 'RU',
    priority: 3,
    supportedBy: ['google'],
    translationQuality: 'medium',
    browserCodes: ['ru', 'ru-RU']
  },
  {
    code: 'ja',
    name: '日本語',
    nativeName: '日本語',
    flag: '🇯🇵',
    initials: 'JA',
    direction: 'ltr',
    region: 'JP',
    priority: 3,
    supportedBy: ['google'],
    translationQuality: 'medium',
    browserCodes: ['ja', 'ja-JP']
  },
  {
    code: 'zh',
    name: '中文',
    nativeName: '中文',
    flag: '🇨🇳',
    initials: 'ZH',
    direction: 'ltr',
    region: 'CN',
    priority: 3,
    supportedBy: ['google'],
    translationQuality: 'medium',
    browserCodes: ['zh', 'zh-CN', 'zh-TW', 'zh-HK']
  }
];

// ============================================================================
// ESTADOS Y CONSTANTES
// ============================================================================

export const LANGUAGE_MODES = {
  AUTO_DETECT: 'auto-detect',
  MANUAL: 'manual'
};

export const LOADING_STATES = {
  IDLE: 'idle',
  DETECTING_LANGUAGE: 'detecting_language',
  LOADING_TRANSLATIONS: 'loading_translations',
  APPLYING_TRANSLATIONS: 'applying_translations',
  SAVING_PREFERENCES: 'saving_preferences',
  LOADING_CACHE: 'loading_cache'
};

export const ERROR_STATES = {
  DETECTION_FAILED: 'detection_failed',
  TRANSLATION_FAILED: 'translation_failed',
  NETWORK_ERROR: 'network_error',
  CACHE_ERROR: 'cache_error',
  CONFIG_ERROR: 'config_error',
  TIMEOUT_ERROR: 'timeout_error'
};

export const TRANSLATION_TYPES = {
  CACHED: 'cached',
  FRESH: 'fresh',
  FALLBACK: 'fallback'
};

export const TRANSLATION_PROVIDERS = {
  GOOGLE: 'google',
  CUSTOM: 'custom'
};

// ============================================================================
// ESTADO INTERNO DEL COMPONENTE
// ============================================================================

export const createInitialState = (config = {}) => ({
  // === IDIOMA ACTUAL ===
  currentLanguage: config.fallbackLanguage || 'es',
  detectedLanguage: null,
  userSelectedLanguage: null,
  
  // === ESTADO DE TRADUCCIONES ===
  translationState: {
    isTranslating: false,
    isDetectingLanguage: false,
    availableTranslations: [],
    cachedTranslations: [],
    translationProgress: 0,
    lastTranslationTime: null
  },
  
  // === ESTADO DE UI ===
  uiState: {
    isOpen: false,
    isLoading: false,
    hasError: false,
    errorMessage: null,
    showTranslationIndicator: false,
    loadingState: LOADING_STATES.IDLE
  },
  
  // === CONFIGURACIÓN DE USUARIO ===
  userPreferences: {
    preferredMode: LANGUAGE_MODES.AUTO_DETECT,
    lastUsedLanguage: config.fallbackLanguage || 'es',
    hasCustomizedSettings: false
  }
});

// ============================================================================
// CONFIGURACIÓN RESPONSIVE
// ============================================================================

export const RESPONSIVE_CONFIG = {
  desktop: {
    displayMode: 'flag-dropdown',
    size: 'medium',
    position: 'top-right',
    showLabels: true,
    maxVisibleLanguages: 10
  },
  tablet: {
    displayMode: 'flag-dropdown',
    size: 'medium',
    position: 'top-center',
    showLabels: false,
    maxVisibleLanguages: 6
  },
  mobile: {
    displayMode: 'icon-dropdown',
    size: 'large',
    position: 'bottom-center',
    showLabels: false,
    maxVisibleLanguages: 4,
    useBottomSheet: true
  }
};

// ============================================================================
// PROPIEDADES CONFIGURABLES PARA EL EDITOR
// ============================================================================

export const ENHANCED_CONFIG_PROPERTIES = [
  // === CONFIGURACIÓN DE MODO ===
  {
    key: 'mode',
    label: 'Language Mode',
    type: 'select',
    options: [
      { value: 'auto-detect', label: 'Auto-detect Browser Language' },
      { value: 'manual', label: 'Manual Language Selection' }
    ],
    default: 'auto-detect',
    description: 'How the language should be determined'
  },
  {
    key: 'fallbackLanguage',
    label: 'Fallback Language',
    type: 'select',
    options: EXTENDED_LANGUAGES.map(lang => ({ value: lang.code, label: `${lang.flag} ${lang.name}` })),
    default: 'en',
    description: 'Language to use if detection fails'
  },
  {
    key: 'preferBrowserLanguage',
    label: 'Prefer Browser Language',
    type: 'toggle',
    default: true,
    description: 'Prioritize browser language over default'
  },
  
  // === IDIOMAS DISPONIBLES ===
  {
    key: 'enabledLanguages',
    label: 'Enabled Languages',
    type: 'multi-select',
    options: EXTENDED_LANGUAGES.map(lang => ({ 
      value: lang.code, 
      label: `${lang.flag} ${lang.name}`,
      quality: lang.translationQuality
    })),
    default: ['en', 'es', 'fr', 'de'],
    description: 'Languages available for selection'
  },
  
  // === CONFIGURACIÓN DE TRADUCCIONES ===
  {
    key: 'translationSettings.enableAutoTranslation',
    label: 'Enable Auto Translation',
    type: 'toggle',
    default: true,
    description: 'Automatically translate content when language changes'
  },
  {
    key: 'translationSettings.cacheTranslations',
    label: 'Cache Translations',
    type: 'toggle',
    default: true,
    description: 'Save translations to improve performance'
  },
  {
    key: 'translationSettings.showTranslationIndicator',
    label: 'Show Translation Indicator',
    type: 'toggle',
    default: true,
    description: 'Show visual indicator for auto-translated content'
  },
  {
    key: 'translationSettings.translationProvider',
    label: 'Translation Provider',
    type: 'select',
    options: [
      { value: 'google', label: 'Google Translate' },
      { value: 'custom', label: 'Custom Provider' }
    ],
    default: 'google',
    description: 'Service to use for translations'
  },
  
  // === CONFIGURACIÓN VISUAL HEREDADA ===
  {
    key: 'displayMode',
    label: 'Display Mode',
    type: 'select',
    options: [
      { value: 'flag-dropdown', label: 'Flag + Dropdown' },
      { value: 'flag-only', label: 'Flag Only' },
      { value: 'text-only', label: 'Text Only' },
      { value: 'icon-dropdown', label: 'Icon + Dropdown' }
    ],
    default: 'flag-dropdown'
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ],
    default: 'medium'
  },
  {
    key: 'style',
    label: 'Style',
    type: 'select',
    options: [
      { value: 'modern', label: 'Modern' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'classic', label: 'Classic' }
    ],
    default: 'modern'
  },
  {
    key: 'showLabel',
    label: 'Show Language Name',
    type: 'toggle',
    default: true
  },
  
  // === CONFIGURACIÓN TÉCNICA ===
  {
    key: 'saveUserChoice',
    label: 'Save User Choice',
    type: 'toggle',
    default: true,
    description: 'Remember user language selection'
  },
  {
    key: 'loadTimeout',
    label: 'Load Timeout (ms)',
    type: 'number',
    min: 1000,
    max: 30000,
    step: 1000,
    default: 5000,
    description: 'Timeout for translation requests'
  }
];

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene la configuración de un idioma por su código
 * @param {string} languageCode - Código del idioma (ej: 'es', 'en')
 * @returns {Object|null} - Configuración del idioma o null si no existe
 */
export const getLanguageConfig = (languageCode) => {
  return EXTENDED_LANGUAGES.find(lang => lang.code === languageCode) || null;
};

/**
 * Obtiene los idiomas habilitados basados en la configuración
 * @param {Array} enabledCodes - Array de códigos de idiomas habilitados
 * @returns {Array} - Array de configuraciones de idiomas habilitados
 */
export const getEnabledLanguages = (enabledCodes = []) => {
  return EXTENDED_LANGUAGES.filter(lang => enabledCodes.includes(lang.code));
};

/**
 * Detecta el idioma preferido del navegador
 * @returns {string} - Código del idioma detectado o 'en' por defecto
 */
export const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const shortLang = browserLang.split('-')[0];
  
  // Buscar coincidencia exacta primero
  let match = EXTENDED_LANGUAGES.find(lang => 
    lang.browserCodes.includes(browserLang)
  );
  
  // Si no hay coincidencia exacta, buscar por código corto
  if (!match) {
    match = EXTENDED_LANGUAGES.find(lang => lang.code === shortLang);
  }
  
  return match ? match.code : 'en';
};

/**
 * Valida la configuración del LanguageButton
 * @param {Object} config - Configuración a validar
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateLanguageConfig = (config) => {
  const errors = [];
  
  if (!config.enabledLanguages || config.enabledLanguages.length === 0) {
    errors.push('At least one language must be enabled');
  }
  
  if (config.fallbackLanguage && !config.enabledLanguages.includes(config.fallbackLanguage)) {
    errors.push('Fallback language must be included in enabled languages');
  }
  
  if (!Object.values(LANGUAGE_MODES).includes(config.mode)) {
    errors.push('Invalid language mode');
  }
  
  if (config.loadTimeout && (config.loadTimeout < 1000 || config.loadTimeout > 30000)) {
    errors.push('Load timeout must be between 1000 and 30000 milliseconds');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Migra configuración antigua a nueva estructura
 * @param {Object} oldConfig - Configuración actual/antigua
 * @returns {Object} - Nueva configuración migrada
 */
export const migrateLanguageConfig = (oldConfig = {}) => {
  return {
    // Mantener compatibilidad
    displayMode: oldConfig.displayMode || 'flag-dropdown',
    size: oldConfig.size || 'medium',
    style: oldConfig.style || 'modern',
    showLabel: oldConfig.showLabel !== undefined ? oldConfig.showLabel : true,
    enabledLanguages: oldConfig.languages || ['en', 'es'],
    
    // Nuevos valores por defecto
    mode: oldConfig.autoDetect ? 'auto-detect' : 'manual',
    fallbackLanguage: oldConfig.defaultLanguage || 'en',
    preferBrowserLanguage: oldConfig.autoDetect !== undefined ? oldConfig.autoDetect : true,
    saveUserChoice: true,
    
    // Configuración de traducciones por defecto
    translationSettings: {
      enableAutoTranslation: true,
      cacheTranslations: true,
      fallbackToOriginal: true,
      showTranslationIndicator: true,
      translationProvider: 'google',
      maxTranslationAttempts: 3
    },
    
    // Configuración técnica por defecto
    required: true,
    loadTimeout: 5000,
    debounceDelay: 300
  };
};