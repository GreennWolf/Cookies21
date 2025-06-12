const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const translationService = require('../services/translation.service');
const cacheService = require('../services/cache.service');

class TranslationController {
  // Traducir texto individual
  translate = catchAsync(async (req, res) => {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      throw new AppError('Text and target language are required', 400);
    }

    // Verificar si existe en caché
    const cacheKey = `${sourceLanguage || 'auto'}:${targetLanguage}:${text}`;
    const cachedTranslation = await cacheService.getCachedTranslation(cacheKey);

    if (cachedTranslation) {
      return res.status(200).json({
        success: true,
        data: { 
          translatedText: cachedTranslation,
          fromCache: true
        }
      });
    }

    // Detectar idioma si no se proporciona
    const detectedLanguage = sourceLanguage || await translationService.detectLanguage(text);

    // Realizar traducción
    const translation = await translationService.translateText(text, {
      from: detectedLanguage,
      to: targetLanguage
    });

    // Guardar en caché
    await cacheService.setCachedTranslation(cacheKey, translation);

    res.status(200).json({
      success: true,
      data: {
        translatedText: translation,
        detectedLanguage,
        fromCache: false
      }
    });
  });

  // Obtener idiomas soportados
  getSupportedLanguages = catchAsync(async (req, res) => {
    const languages = await translationService.getSupportedLanguages();
    
    res.status(200).json({
      status: 'success',
      data: {
        languages
      }
    });
  });

  // Traducir múltiples textos
  translateBatch = catchAsync(async (req, res) => {
    const { texts, targetLanguage, sourceLanguage } = req.body;

    if (!Array.isArray(texts) || texts.length === 0 || !targetLanguage) {
      throw new AppError('Valid texts array and target language are required', 400);
    }

    const translations = [];
    const uncachedTexts = [];
    const uncachedIndexes = [];

    // Verificar caché para cada texto
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cacheKey = `${sourceLanguage || 'auto'}:${targetLanguage}:${text}`;
      const cachedTranslation = await cacheService.getCachedTranslation(cacheKey);

      if (cachedTranslation) {
        translations[i] = cachedTranslation;
      } else {
        uncachedTexts.push(text);
        uncachedIndexes.push(i);
      }
    }

    if (uncachedTexts.length > 0) {
      // Detectar idioma para textos no cacheados si no se proporciona
      const detectedLanguage = sourceLanguage || await translationService.detectLanguage(uncachedTexts.join(' '));

      // Traducir textos no cacheados
      const newTranslations = await translationService.translateBatch(uncachedTexts, {
        from: detectedLanguage,
        to: targetLanguage
      });

      // Guardar en caché y asignar traducciones
      for (let i = 0; i < uncachedTexts.length; i++) {
        const text = uncachedTexts[i];
        const translation = Array.isArray(newTranslations) ? newTranslations[i] : newTranslations;
        const originalIndex = uncachedIndexes[i];
        
        const cacheKey = `${detectedLanguage}:${targetLanguage}:${text}`;
        await cacheService.setCachedTranslation(cacheKey, translation);
        
        translations[originalIndex] = translation;
      }
    }

    if (res) {
      return res.status(200).json({
        status: 'success',
        data: {
          translations,
          partialCache: uncachedTexts.length < texts.length
        }
      });
    }

    return {
      translations,
      partialCache: uncachedTexts.length < texts.length
    };
  });

  // Traducir banner completo
  translateBanner = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { targetLanguage } = req.body;
    const { clientId } = req;

    if (!domainId || !targetLanguage) {
      throw new AppError('Domain ID and target language are required', 400);
    }

    // Verificar acceso al dominio
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found or access denied', 404);
    }

    // Extraer todos los textos traducibles del banner
    const texts = this._extractTranslatableTexts(domain.bannerConfig);

    // Verificar si hay textos para traducir
    if (texts.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          translatedConfig: domain.bannerConfig,
          targetLanguage,
          sourceLanguage: domain.settings.defaultLanguage
        }
      });
    }

    // Traducir todos los textos
    const { translations } = await this.translateBatch({
      body: {
        texts,
        targetLanguage,
        sourceLanguage: domain.settings.defaultLanguage
      }
    });

    // Aplicar traducciones al banner
    const translatedConfig = this._applyTranslations(
      domain.bannerConfig,
      translations
    );

    res.status(200).json({
      status: 'success',
      data: {
        translatedConfig,
        targetLanguage,
        sourceLanguage: domain.settings.defaultLanguage
      }
    });
  });

  // Refrescar traducciones
  refreshTranslations = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { languages } = req.body;
    const { clientId } = req;

    if (!domainId || !Array.isArray(languages) || languages.length === 0) {
      throw new AppError('Domain ID and valid languages array are required', 400);
    }

    // Verificar acceso al dominio
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found or access denied', 404);
    }

    // Extraer textos traducibles
    const texts = this._extractTranslatableTexts(domain.bannerConfig);

    if (texts.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { translations: {} }
      });
    }

    // Traducir a todos los idiomas requeridos
    const translations = {};
    const defaultLanguage = domain.settings.defaultLanguage;

    for (const lang of languages) {
      if (lang !== defaultLanguage) {
        const result = await this.translateBatch({
          body: {
            texts,
            targetLanguage: lang,
            sourceLanguage: defaultLanguage
          }
        });
        translations[lang] = result.translations;
      }
    }

    res.status(200).json({
      status: 'success',
      data: { translations }
    });
  });

  // Verificar estado de traducción
  checkTranslationStatus = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { clientId } = req;

    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found or access denied', 404);
    }

    const texts = this._extractTranslatableTexts(domain.bannerConfig);
    const defaultLanguage = domain.settings.defaultLanguage;
    const supportedLanguages = await translationService.getSupportedLanguages();

    const status = {};
    for (const lang of supportedLanguages) {
      if (lang.code !== defaultLanguage) {
        const missingTranslations = [];
        for (const text of texts) {
          const cacheKey = `${defaultLanguage}:${lang.code}:${text}`;
          const cached = await cacheService.getCachedTranslation(cacheKey);
          if (!cached) {
            missingTranslations.push(text);
          }
        }
        status[lang.code] = {
          language: lang.name,
          totalTexts: texts.length,
          translatedTexts: texts.length - missingTranslations.length,
          missingTranslations
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        defaultLanguage,
        translationStatus: status
      }
    });
  });

  // Métodos privados para procesar el banner
  _extractTranslatableTexts(bannerConfig) {
    const texts = new Set();
    
    const processComponent = (component) => {
      if (component.content?.text) {
        texts.add(component.content.text);
      }
      
      if (component.children) {
        component.children.forEach(processComponent);
      }
    };

    bannerConfig.components.forEach(processComponent);
    return Array.from(texts);
  }

  _applyTranslations(bannerConfig, translations) {
    const translatedConfig = JSON.parse(JSON.stringify(bannerConfig));
    let translationIndex = 0;

    const processComponent = (component) => {
      if (component.content?.text) {
        component.content.text = translations[translationIndex++];
      }
      
      if (component.children) {
        component.children.forEach(processComponent);
      }
    };

    translatedConfig.components.forEach(processComponent);
    return translatedConfig;
  }

  // Método para validar idiomas
  _validateLanguage = async (language) => {
    const supportedLanguages = await translationService.getSupportedLanguages();
    return supportedLanguages.some(lang => lang.code === language);
  }
}

module.exports = new TranslationController();