// services/bannerTranslation.service.js
const translationService = require('./translation.service');
const BannerTemplate = require('../models/BannerTemplate');
const logger = require('../utils/logger');

// Límites de caracteres gratuitos
const TRANSLATION_LIMITS = {
  google: {
    monthly: 500000, // 500k caracteres/mes gratis
    current: 0,
    resetDate: null
  },
  azure: {
    monthly: 2000000, // 2M caracteres/mes gratis
    current: 0,
    resetDate: null
  }
};

// Textos del sistema pre-traducidos (no consumen cuota)
const SYSTEM_TRANSLATIONS = {
  'Accept All': {
    es: 'Aceptar todo',
    fr: 'Tout accepter',
    de: 'Alle akzeptieren',
    it: 'Accetta tutto',
    pt: 'Aceitar tudo',
    nl: 'Alles accepteren',
    pl: 'Zaakceptuj wszystko',
    ru: 'Принять все',
    ja: 'すべて受け入れる',
    zh: '全部接受',
    ar: 'قبول الكل',
    ko: '모두 수락'
  },
  'Reject All': {
    es: 'Rechazar todo',
    fr: 'Tout refuser',
    de: 'Alle ablehnen',
    it: 'Rifiuta tutto',
    pt: 'Rejeitar tudo',
    nl: 'Alles weigeren',
    pl: 'Odrzuć wszystko',
    ru: 'Отклонить все',
    ja: 'すべて拒否',
    zh: '全部拒绝',
    ar: 'رفض الكل',
    ko: '모두 거부'
  },
  'Preferences': {
    es: 'Preferencias',
    fr: 'Préférences',
    de: 'Einstellungen',
    it: 'Preferenze',
    pt: 'Preferências',
    nl: 'Voorkeuren',
    pl: 'Preferencje',
    ru: 'Настройки',
    ja: '設定',
    zh: '偏好设置',
    ar: 'التفضيلات',
    ko: '환경설정'
  },
  'Save preferences': {
    es: 'Guardar preferencias',
    fr: 'Enregistrer les préférences',
    de: 'Einstellungen speichern',
    it: 'Salva preferenze',
    pt: 'Salvar preferências',
    nl: 'Voorkeuren opslaan',
    pl: 'Zapisz preferencje',
    ru: 'Сохранить настройки',
    ja: '設定を保存',
    zh: '保存偏好',
    ar: 'حفظ التفضيلات',
    ko: '환경설정 저장'
  }
};

class BannerTranslationService {
  constructor() {
    this.translationService = translationService; // Ya es una instancia
    this.loadLimitsFromDB();
  }

  /**
   * Carga los límites actuales desde la base de datos
   */
  async loadLimitsFromDB() {
    try {
      // Aquí cargaríamos los límites desde Redis o MongoDB
      // Por ahora usamos valores en memoria
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      TRANSLATION_LIMITS.google.resetDate = firstDayOfMonth;
      TRANSLATION_LIMITS.azure.resetDate = firstDayOfMonth;
    } catch (error) {
      logger.error('Error loading translation limits:', error);
    }
  }

  /**
   * Verifica si debemos resetear los contadores mensuales
   */
  checkMonthlyReset() {
    const now = new Date();
    
    ['google', 'azure'].forEach(provider => {
      const limit = TRANSLATION_LIMITS[provider];
      if (!limit.resetDate || now >= new Date(limit.resetDate).setMonth(limit.resetDate.getMonth() + 1)) {
        limit.current = 0;
        limit.resetDate = new Date(now.getFullYear(), now.getMonth(), 1);
        logger.info(`Reset monthly character count for ${provider}`);
      }
    });
  }

  /**
   * Obtiene el proveedor disponible según los límites
   */
  getAvailableProvider(characterCount) {
    this.checkMonthlyReset();
    
    // Primero intentar con Google
    if (TRANSLATION_LIMITS.google.current + characterCount <= TRANSLATION_LIMITS.google.monthly) {
      return 'google';
    }
    
    // Si Google está agotado, usar Azure
    if (TRANSLATION_LIMITS.azure.current + characterCount <= TRANSLATION_LIMITS.azure.monthly) {
      logger.info('Google translation limit reached, switching to Azure');
      return 'azure';
    }
    
    // Si ambos están agotados
    logger.warn('All translation providers have reached their limits');
    return null;
  }

  /**
   * Actualiza el contador de caracteres usados
   */
  updateCharacterCount(provider, count) {
    if (TRANSLATION_LIMITS[provider]) {
      TRANSLATION_LIMITS[provider].current += count;
      logger.info(`Updated ${provider} character count: ${TRANSLATION_LIMITS[provider].current}/${TRANSLATION_LIMITS[provider].monthly}`);
    }
  }

  /**
   * Traduce los componentes de un banner
   */
  async translateBannerComponents(bannerId, targetLanguage, options = {}) {
    try {
      const banner = await BannerTemplate.findById(bannerId);
      if (!banner) {
        throw new Error('Banner not found');
      }

      // Verificar si ya tenemos traducciones para este idioma
      const componentsToTranslate = [];
      const translationMap = new Map();

      // Recorrer componentes recursivamente
      const processComponents = (components, parent = null) => {
        components.forEach(component => {
          if (component.type === 'text' || component.type === 'button' || component.type === 'link') {
            let content = component.content;
            
            // Manejar diferentes formatos de contenido
            if (typeof content === 'object' && content.texts) {
              // Ya tiene estructura multi-idioma
              if (!content.texts[targetLanguage]) {
                // No tiene traducción para este idioma
                const originalText = content.texts[content.originalLanguage || 'en'] || content.texts.en;
                if (originalText && !content.isSystemText) {
                  componentsToTranslate.push({
                    id: component.id,
                    text: originalText,
                    component: component,
                    parent: parent
                  });
                }
              }
            } else if (typeof content === 'string') {
              // Es un string simple, necesita traducción
              componentsToTranslate.push({
                id: component.id,
                text: content,
                component: component,
                parent: parent
              });
            }
          }

          // Procesar hijos si existen
          if (component.children && Array.isArray(component.children)) {
            processComponents(component.children, component);
          }
        });
      };

      processComponents(banner.components);

      if (componentsToTranslate.length === 0) {
        logger.info(`No components need translation to ${targetLanguage}`);
        return {
          success: true,
          message: 'All components already translated',
          charactersUsed: 0,
          provider: null
        };
      }

      // Preparar textos para traducir
      const textsToTranslate = [];
      const componentRefs = [];

      componentsToTranslate.forEach(item => {
        // Verificar primero si es un texto del sistema
        const systemTranslation = SYSTEM_TRANSLATIONS[item.text]?.[targetLanguage];
        if (systemTranslation) {
          // Usar traducción del sistema
          if (!item.component.content.texts) {
            item.component.content = {
              texts: { en: item.text },
              originalLanguage: 'en',
              isSystemText: true
            };
          }
          item.component.content.texts[targetLanguage] = systemTranslation;
        } else {
          // Necesita traducción real
          textsToTranslate.push(item.text);
          componentRefs.push(item);
        }
      });

      let charactersTranslated = 0;
      let providerUsed = null;

      if (textsToTranslate.length > 0) {
        // Calcular caracteres a traducir
        const totalCharacters = textsToTranslate.reduce((sum, text) => sum + text.length, 0);
        
        // Obtener proveedor disponible
        providerUsed = this.getAvailableProvider(totalCharacters);
        
        if (!providerUsed) {
          throw new Error('Translation quota exceeded for all providers');
        }

        // Detectar idioma origen si no está especificado
        let sourceLanguage = banner.translationStats?.autoDetectedLanguage;
        if (!sourceLanguage) {
          sourceLanguage = await this.translationService.detectLanguage(textsToTranslate.join(' '));
          banner.translationStats.autoDetectedLanguage = sourceLanguage;
        }

        // Traducir con fallback
        let translations;
        try {
          translations = await this.translationService.translateBatch(
            textsToTranslate,
            {
              from: sourceLanguage,
              to: targetLanguage,
              provider: providerUsed,
              cache: true
            }
          );
          
          // Actualizar contador
          this.updateCharacterCount(providerUsed, totalCharacters);
          charactersTranslated = totalCharacters;
        } catch (error) {
          logger.error(`Translation failed with ${providerUsed}:`, error);
          
          // Intentar con el otro proveedor si falla
          const fallbackProvider = providerUsed === 'google' ? 'azure' : 'google';
          if (this.getAvailableProvider(totalCharacters) === fallbackProvider) {
            logger.info(`Retrying with ${fallbackProvider}`);
            translations = await this.translationService.translateBatch(
              textsToTranslate,
              {
                from: sourceLanguage,
                to: targetLanguage,
                provider: fallbackProvider,
                cache: true
              }
            );
            this.updateCharacterCount(fallbackProvider, totalCharacters);
            providerUsed = fallbackProvider;
            charactersTranslated = totalCharacters;
          } else {
            throw error;
          }
        }

        // Aplicar traducciones a los componentes
        translations.forEach((translation, index) => {
          const ref = componentRefs[index];
          if (!ref.component.content.texts) {
            ref.component.content = {
              texts: { en: ref.text },
              originalLanguage: sourceLanguage,
              translatable: true
            };
          }
          ref.component.content.texts[targetLanguage] = translation;
        });
      }

      // Actualizar estadísticas del banner
      if (!banner.translationStats) {
        banner.translationStats = {};
      }
      
      if (!banner.translationStats.supportedLanguages.includes(targetLanguage)) {
        banner.translationStats.supportedLanguages.push(targetLanguage);
      }
      
      if (charactersTranslated > 0) {
        banner.translationStats.charactersTranslated[providerUsed] += charactersTranslated;
        banner.translationStats.charactersTranslated.total += charactersTranslated;
        banner.translationStats.lastTranslationDate = new Date();
        banner.translationStats.translationProvider = providerUsed;
      }

      // Guardar cambios
      await banner.save();

      return {
        success: true,
        message: 'Translation completed',
        charactersUsed: charactersTranslated,
        provider: providerUsed,
        componentsTranslated: componentRefs.length,
        systemTranslations: componentsToTranslate.length - componentRefs.length
      };

    } catch (error) {
      logger.error('Error translating banner components:', error);
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas de uso actual
   */
  getUsageStats() {
    this.checkMonthlyReset();
    
    return {
      google: {
        used: TRANSLATION_LIMITS.google.current,
        limit: TRANSLATION_LIMITS.google.monthly,
        percentage: (TRANSLATION_LIMITS.google.current / TRANSLATION_LIMITS.google.monthly * 100).toFixed(2),
        remaining: TRANSLATION_LIMITS.google.monthly - TRANSLATION_LIMITS.google.current
      },
      azure: {
        used: TRANSLATION_LIMITS.azure.current,
        limit: TRANSLATION_LIMITS.azure.monthly,
        percentage: (TRANSLATION_LIMITS.azure.current / TRANSLATION_LIMITS.azure.monthly * 100).toFixed(2),
        remaining: TRANSLATION_LIMITS.azure.monthly - TRANSLATION_LIMITS.azure.current
      },
      nextReset: new Date(TRANSLATION_LIMITS.google.resetDate).setMonth(
        TRANSLATION_LIMITS.google.resetDate.getMonth() + 1
      )
    };
  }

  /**
   * Obtiene todas las traducciones de un banner
   */
  async getBannerTranslations(bannerId) {
    try {
      const banner = await BannerTemplate.findById(bannerId);
      if (!banner) {
        throw new Error('Banner not found');
      }

      const translations = {};
      const languages = banner.translationStats?.supportedLanguages || ['en'];

      languages.forEach(lang => {
        translations[lang] = [];
        
        const extractTranslations = (components) => {
          components.forEach(component => {
            if (component.content?.texts?.[lang]) {
              translations[lang].push({
                componentId: component.id,
                text: component.content.texts[lang],
                type: component.type
              });
            }
            
            if (component.children) {
              extractTranslations(component.children);
            }
          });
        };

        extractTranslations(banner.components);
      });

      return {
        bannerId,
        languages,
        translations,
        stats: banner.translationStats
      };

    } catch (error) {
      logger.error('Error getting banner translations:', error);
      throw error;
    }
  }
}

module.exports = new BannerTranslationService();