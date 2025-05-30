// tests/unit/controllers/translationController.test.js

const TranslationController = require('../../../controllers/TranslationController');
const Domain = require('../../../models/Domain');
const translationService = require('../../../services/translation.service');
const cacheService = require('../../../services/cache.service');
const AppError = require('../../../utils/appError');
const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mocks
jest.mock('../../../models/Domain');
jest.mock('../../../services/translation.service');
jest.mock('../../../services/cache.service');

describe('TranslationController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      clientId: 'mock-client-id',
      userId: 'mock-user-id'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  describe('translate', () => {
    test('debería traducir texto exitosamente', async () => {
      const translationRequest = {
        text: 'Hello World',
        targetLanguage: 'es',
        sourceLanguage: 'en'
      };
      req.body = translationRequest;

      const mockTranslation = 'Hola Mundo';
      
      // Simular que no hay traducción en caché
      cacheService.getCachedTranslation.mockResolvedValue(null);
      
      // Simular la traducción
      translationService.translateText.mockResolvedValue(mockTranslation);
      
      // Usar el método correcto para cachear
      cacheService.setCachedTranslation.mockResolvedValue(true);

      await TranslationController.translate(req, res, next);

      expect(translationService.translateText).toHaveBeenCalledWith('Hello World', {
        from: 'en',
        to: 'es'
      });

      // Se espera que se llame con dos parámetros (clave y traducción)
      expect(cacheService.setCachedTranslation).toHaveBeenCalledWith(
        expect.any(String),
        mockTranslation
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translation: mockTranslation,
          detectedLanguage: 'en',
          fromCache: false
        }
      });
    });

    test('debería retornar traducción desde caché si está disponible', async () => {
      const translationRequest = {
        text: 'Hello World',
        targetLanguage: 'es'
      };
      req.body = translationRequest;

      const cachedTranslation = 'Hola Mundo';
      cacheService.getCachedTranslation.mockResolvedValue(cachedTranslation);

      await TranslationController.translate(req, res, next);

      expect(translationService.translateText).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translation: cachedTranslation,
          fromCache: true
        }
      });
    });

    test('debería detectar el idioma si no se proporciona', async () => {
      const translationRequest = {
        text: 'Hello World',
        targetLanguage: 'es'
      };
      req.body = translationRequest;

      const detectedLanguage = 'en';
      const mockTranslation = 'Hola Mundo';

      cacheService.getCachedTranslation.mockResolvedValue(null);
      translationService.detectLanguage.mockResolvedValue(detectedLanguage);
      translationService.translateText.mockResolvedValue(mockTranslation);
      cacheService.setCachedTranslation.mockResolvedValue(true);

      await TranslationController.translate(req, res, next);

      expect(translationService.detectLanguage).toHaveBeenCalledWith('Hello World');
      expect(translationService.translateText).toHaveBeenCalledWith('Hello World', {
        from: detectedLanguage,
        to: 'es'
      });
    });
  });

  describe('translateBatch', () => {
    test('debería traducir múltiples textos exitosamente', async () => {
      const batchRequest = {
        texts: ['Hello', 'World'],
        targetLanguage: 'es',
        sourceLanguage: 'en'
      };
      req.body = batchRequest;

      const mockTranslations = ['Hola', 'Mundo'];
      
      cacheService.getCachedTranslation.mockResolvedValue(null);
      translationService.translateBatch.mockResolvedValue(mockTranslations);

      await TranslationController.translateBatch(req, res, next);

      expect(translationService.translateBatch).toHaveBeenCalledWith(
        batchRequest.texts,
        expect.objectContaining({
          from: 'en',
          to: 'es'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translations: mockTranslations,
          partialCache: false
        }
      });
    });

    test('debería manejar caché parcial para traducciones en lote', async () => {
      const batchRequest = {
        texts: ['Hello', 'World'],
        targetLanguage: 'es'
      };
      req.body = batchRequest;

      // Primera traducción en caché, segunda necesita traducción
      cacheService.getCachedTranslation
        .mockResolvedValueOnce('Hola')
        .mockResolvedValueOnce(null);

      translationService.translateBatch.mockResolvedValue(['Mundo']);

      await TranslationController.translateBatch(req, res, next);

      expect(translationService.translateBatch).toHaveBeenCalledWith(
        ['World'],
        expect.any(Object)
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translations: ['Hola', 'Mundo'],
          partialCache: true
        }
      });
    });
  });

  describe('translateBanner', () => {
    test('debería traducir la configuración completa del banner', async () => {
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.body = {
        targetLanguage: 'es'
      };

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId,
        bannerConfig: {
          components: [
            {
              type: 'text',
              content: { text: 'Accept all cookies' }
            },
            {
              type: 'button',
              content: { text: 'Accept' }
            }
          ]
        },
        settings: {
          defaultLanguage: 'en'
        }
      };

      const mockTranslations = ['Aceptar todas las cookies', 'Aceptar'];

      Domain.findOne.mockResolvedValue(mockDomain);

      // Interceptamos la llamada interna a translateBatch y simulamos la respuesta
      jest.spyOn(TranslationController, 'translateBatch').mockResolvedValue({
        translations: mockTranslations
      });

      await TranslationController.translateBanner(req, res, next);

      // Se espera que se llame a translateBatch con los textos extraídos del banner
      const expectedTexts = ['Accept all cookies', 'Accept'];
      expect(TranslationController.translateBatch).toHaveBeenCalledWith({
        body: {
          texts: expectedTexts,
          targetLanguage: 'es',
          sourceLanguage: mockDomain.settings.defaultLanguage
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translatedConfig: expect.any(Object),
          targetLanguage: 'es',
          sourceLanguage: 'en'
        }
      });
    });
  });

  describe('refreshTranslations', () => {
    test('debería refrescar las traducciones para todos los idiomas especificados', async () => {
      const domainId = 'mock-domain-id';
      req.params.domainId = domainId;
      req.body = {
        languages: ['es', 'fr', 'de']
      };

      const mockDomain = {
        _id: domainId,
        clientId: req.clientId,
        settings: {
          defaultLanguage: 'en'
        },
        bannerConfig: {
          components: [
            {
              type: 'text',
              content: { text: 'Privacy Policy' }
            }
          ]
        }
      };

      Domain.findOne.mockResolvedValue(mockDomain);
      
      // Interceptamos las llamadas a translateBatch para cada idioma
      const spy = jest.spyOn(TranslationController, 'translateBatch');
      spy
        .mockResolvedValueOnce({ translations: ['Política de Privacidad'] })
        .mockResolvedValueOnce({ translations: ['Politique de Confidentialité'] })
        .mockResolvedValueOnce({ translations: ['Datenschutzerklärung'] });

      await TranslationController.refreshTranslations(req, res, next);

      expect(TranslationController.translateBatch).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          translations: {
            es: ['Política de Privacidad'],
            fr: ['Politique de Confidentialité'],
            de: ['Datenschutzerklärung']
          }
        }
      });
    });
  });
});
