// src/services/translation.service.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

class TranslationService {
  constructor() {
    this.SUPPORTED_LANGUAGES = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 
      'ko', 'zh', 'ar', 'hi', 'tr', 'vi', 'th', 'id', 'cs', 'da', 
      'fi', 'el', 'he', 'hu', 'no', 'ro', 'sk', 'sv', 'uk'
    ];

    // Inicializar proveedores de traducción
    this.providers = {
      google: {
        baseUrl: 'https://translation.googleapis.com/language/translate/v2',
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
      },
      azure: {
        baseUrl: 'https://api.cognitive.microsofttranslator.com',
        region: process.env.AZURE_TRANSLATOR_REGION,
        apiKey: process.env.AZURE_TRANSLATOR_KEY
      }
    };

    // Proveedor predeterminado
    this.defaultProvider = 'google';
    // Tiempo de expiración de la caché: 7 días (en segundos)
    this.cacheTTL = 7 * 24 * 60 * 60;
  }

  // Traduce un único texto
  async translateText(text, options = {}) {
    try {
      const { to, provider = this.defaultProvider, cache: useCache = true } = options;
      // Validar idioma destino antes de continuar
      if (!this._isValidLanguage(to)) {
        throw new Error(`Unsupported target language: ${to}`);
      }
      let { from } = options;
      if (!from) {
        from = await this.detectLanguage(text);
      }
      if (from === to) {
        return text;
      }
      if (useCache) {
        const cacheKey = `translation:${from}:${to}:${text}`;
        const cachedTranslation = await cache.get(cacheKey);
        if (cachedTranslation) {
          return cachedTranslation;
        }
      }
      let translation;
      switch (provider) {
        case 'google':
          translation = await this._translateWithGoogle(text, from, to);
          break;
        case 'azure':
          translation = await this._translateWithAzure(text, from, to);
          break;
        default:
          throw new Error(`Unsupported translation provider: ${provider}`);
      }
      if (useCache) {
        const cacheKey = `translation:${from}:${to}:${text}`;
        await cache.set(cacheKey, translation, 'EX', this.cacheTTL);
      }
      return translation;
    } catch (error) {
      logger.error('Error translating text:', error);
      throw error;
    }
  }

  // Traduce un lote de textos
  async translateBatch(texts, options = {}) {
    try {
      const { from, to, provider = this.defaultProvider, cache: useCache = true } = options;
      if (!this._isValidLanguage(to)) {
        throw new Error(`Unsupported target language: ${to}`);
      }
      const sourceLanguage = from || await this.detectLanguage(texts.join(' '));
      if (sourceLanguage === to) {
        return texts;
      }
      const translations = [];
      const uncachedTexts = [];
      const uncachedIndexes = [];
      if (useCache) {
        for (let i = 0; i < texts.length; i++) {
          const cacheKey = `translation:${sourceLanguage}:${to}:${texts[i]}`;
          const cachedTranslation = await cache.get(cacheKey);
          if (cachedTranslation) {
            translations[i] = cachedTranslation;
          } else {
            uncachedTexts.push(texts[i]);
            uncachedIndexes.push(i);
          }
        }
      } else {
        uncachedTexts.push(...texts);
        uncachedIndexes.push(...texts.map((_, i) => i));
      }
      if (uncachedTexts.length > 0) {
        let newTranslations;
        switch (provider) {
          case 'google':
            newTranslations = await this._translateBatchWithGoogle(uncachedTexts, sourceLanguage, to);
            break;
          case 'azure':
            newTranslations = await this._translateBatchWithAzure(uncachedTexts, sourceLanguage, to);
            break;
          default:
            throw new Error(`Unsupported translation provider: ${provider}`);
        }
        // Guardar en caché y asignar traducciones
        for (let i = 0; i < uncachedTexts.length; i++) {
          const text = uncachedTexts[i];
          const translation = newTranslations[i];
          const originalIndex = uncachedIndexes[i];
          if (useCache) {
            const cacheKey = `translation:${sourceLanguage}:${to}:${text}`;
            await cache.set(cacheKey, translation, 'EX', this.cacheTTL);
          }
          translations[originalIndex] = translation;
        }
      }
      return translations;
    } catch (error) {
      logger.error('Error translating batch:', error);
      throw error;
    }
  }

  // Detecta el idioma de un texto usando Google Translate
  async detectLanguage(text) {
    try {
      const response = await axios.post(
        `${this.providers.google.baseUrl}/detect`,
        { q: text },
        { params: { key: this.providers.google.apiKey } }
      );
      return response.data.data.detections[0][0].language;
    } catch (error) {
      logger.error('Error detecting language:', error);
      throw new Error('Error detecting language');
    }
  }

  // Traduce la configuración de un banner (por ejemplo, textos de botones y mensajes)
  async translateBanner(bannerConfig, targetLanguage, options = {}) {
    try {
      // Realizar una copia profunda de la configuración
      const translatedConfig = JSON.parse(JSON.stringify(bannerConfig));
      const textsToTranslate = [];
      const references = [];
      this._extractTranslatableTexts(translatedConfig.components, textsToTranslate, references);
      const translations = await this.translateBatch(textsToTranslate, { to: targetLanguage, ...options });
      this._applyTranslations(references, translations);
      return translatedConfig;
    } catch (error) {
      logger.error('Error translating banner:', error);
      throw error;
    }
  }

  // Proveedor Google: traduce un único texto
  async _translateWithGoogle(text, from, to) {
    try {
      const response = await axios.post(
        `${this.providers.google.baseUrl}`,
        {
          q: text,
          source: from,
          target: to,
          format: 'text'
        },
        { params: { key: this.providers.google.apiKey } }
      );
      return response.data.data.translations[0].translatedText;
    } catch (error) {
      logger.error('Error translating with Google:', error);
      throw new Error('Error translating with Google');
    }
  }

  // Proveedor Azure: traduce un único texto
  async _translateWithAzure(text, from, to) {
    try {
      const response = await axios.post(
        `${this.providers.azure.baseUrl}/translate`,
        [{ text }],
        {
          params: { 'api-version': '3.0', from, to },
          headers: {
            'Ocp-Apim-Subscription-Key': this.providers.azure.apiKey,
            'Ocp-Apim-Subscription-Region': this.providers.azure.region,
            'Content-Type': 'application/json',
            'X-ClientTraceId': uuidv4()
          }
        }
      );
      return response.data[0].translations[0].text;
    } catch (error) {
      logger.error('Error translating with Azure:', error);
      throw error;
    }
  }

  // Proveedor Google: traduce un lote de textos
  async _translateBatchWithGoogle(texts, from, to) {
    try {
      const response = await axios.post(
        `${this.providers.google.baseUrl}`,
        {
          q: texts,
          source: from,
          target: to,
          format: 'text'
        },
        { params: { key: this.providers.google.apiKey } }
      );
      return response.data.data.translations.map(t => t.translatedText);
    } catch (error) {
      logger.error('Error batch translating with Google:', error);
      throw error;
    }
  }

  // Proveedor Azure: traduce un lote de textos
  async _translateBatchWithAzure(texts, from, to) {
    try {
      const response = await axios.post(
        `${this.providers.azure.baseUrl}/translate`,
        texts.map(text => ({ text })),
        {
          params: { 'api-version': '3.0', from, to },
          headers: {
            'Ocp-Apim-Subscription-Key': this.providers.azure.apiKey,
            'Ocp-Apim-Subscription-Region': this.providers.azure.region,
            'Content-Type': 'application/json',
            'X-ClientTraceId': uuidv4()
          }
        }
      );
      return response.data.map(item => item.translations[0].text);
    } catch (error) {
      logger.error('Error batch translating with Azure:', error);
      throw error;
    }
  }

  _isValidLanguage(language) {
    return this.SUPPORTED_LANGUAGES.includes(language);
  }

  // Extrae textos traducibles y almacena referencias directas al objeto y la llave a actualizar
  _extractTranslatableTexts(components, texts, references) {
    components.forEach(component => {
      if (component.content && component.content.text) {
        texts.push(component.content.text);
        references.push({ obj: component.content, key: 'text' });
      }
      if (component.children) {
        this._extractTranslatableTexts(component.children, texts, references);
      }
    });
  }

  // Aplica las traducciones a las referencias almacenadas
  _applyTranslations(references, translations) {
    references.forEach((ref, index) => {
      ref.obj[ref.key] = translations[index];
    });
  }
}

module.exports = new TranslationService();
