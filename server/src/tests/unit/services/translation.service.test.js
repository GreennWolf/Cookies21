// src/tests/unit/services/translation.service.test.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const translationService = require('../../../services/translation.service');
const logger = require('../../../utils/logger');

// Mocks: se define el objeto mock para cache directamente dentro del factory
jest.mock('../../../config/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

jest.mock('axios');
jest.mock('uuid');
jest.mock('../../../utils/logger');

const { cache } = require('../../../config/redis');

describe('TranslationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    test('debería traducir texto usando proveedor por defecto', async () => {
      // Arrange
      const options = { from: 'en', to: 'es', provider: 'google' };
      const mockResponse = {
        data: {
          data: {
            translations: [
              { translatedText: 'texto traducido' }
            ]
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      const result = await translationService.translateText('test text', options);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('translate/v2'),
        expect.objectContaining({
          q: 'test text',
          source: 'en',
          target: 'es'
        }),
        expect.any(Object)
      );
      expect(result).toBe('texto traducido');
    });

    test('debería usar caché para traducciones previas', async () => {
      // Arrange
      const cacheKey = 'translation:en:es:test text';
      const cachedTranslation = 'texto en caché';
      cache.get.mockResolvedValue(cachedTranslation);

      // Act
      const result = await translationService.translateText('test text', {
        from: 'en',
        to: 'es',
        cache: true
      });

      // Assert
      expect(cache.get).toHaveBeenCalledWith(cacheKey);
      expect(axios.post).not.toHaveBeenCalled();
      expect(result).toBe(cachedTranslation);
    });

    test('debería guardar nueva traducción en caché', async () => {
      // Arrange
      cache.get.mockResolvedValue(null);
      const mockResponse = {
        data: {
          data: {
            translations: [
              { translatedText: 'nueva traducción' }
            ]
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      await translationService.translateText('test text', {
        from: 'en',
        to: 'es',
        cache: true
      });

      // Assert
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        'nueva traducción',
        'EX',
        expect.any(Number)
      );
    });

    test('debería manejar idiomas no soportados', async () => {
      // Act & Assert
      await expect(translationService.translateText('test', { to: 'invalid' }))
        .rejects.toThrow('Unsupported target language');
    });
  });

  describe('translateBatch', () => {
    test('debería traducir múltiples textos', async () => {
      // Arrange
      const texts = ['text1', 'text2'];
      const options = { from: 'en', to: 'es' };
      const mockResponse = {
        data: {
          data: {
            translations: [
              { translatedText: 'texto1' },
              { translatedText: 'texto2' }
            ]
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      const result = await translationService.translateBatch(texts, options);

      // Assert
      expect(result).toEqual(['texto1', 'texto2']);
    });

    test('debería combinar caché y nuevas traducciones', async () => {
      // Arrange
      const texts = ['cached', 'new'];
      cache.get
        .mockResolvedValueOnce('en caché')
        .mockResolvedValueOnce(null);

      const mockResponse = {
        data: {
          data: {
            translations: [
              { translatedText: 'nuevo' }
            ]
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      const result = await translationService.translateBatch(texts, {
        from: 'en',
        to: 'es'
      });

      // Assert
      expect(result).toEqual(['en caché', 'nuevo']);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          q: ['new']
        }),
        expect.any(Object)
      );
    });
  });

  describe('translateBanner', () => {
    test('debería traducir configuración de banner', async () => {
      // Arrange
      const bannerConfig = {
        components: [
          {
            type: 'text',
            content: { text: 'Accept cookies' }
          },
          {
            type: 'button',
            content: { text: 'Settings' }
          }
        ]
      };

      const mockTranslations = ['Aceptar cookies', 'Configuración'];
      jest.spyOn(translationService, 'translateBatch').mockResolvedValue(mockTranslations);

      // Act
      const result = await translationService.translateBanner(bannerConfig, 'es');

      // Assert
      expect(result.components[0].content.text).toBe('Aceptar cookies');
      expect(result.components[1].content.text).toBe('Configuración');
    });
  });

  describe('detectLanguage', () => {
    test('debería detectar idioma del texto', async () => {
      // Arrange
      const mockResponse = {
        data: {
          data: {
            detections: [[ { language: 'en', confidence: 0.9 } ]]
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      const result = await translationService.detectLanguage('test text');

      // Assert
      expect(result).toBe('en');
    });

    test('debería manejar error en detección', async () => {
      // Arrange
      const error = new Error('Detection failed');
      axios.post.mockRejectedValue(error);

      // Act & Assert
      await expect(translationService.detectLanguage('test'))
        .rejects.toThrow('Error detecting language');

      expect(logger.error).toHaveBeenCalledWith('Error detecting language:', error);
    });
  });

  describe('_translateWithGoogle', () => {
    test('debería manejar errores de la API', async () => {
      // Arrange
      const error = new Error('API error');
      axios.post.mockRejectedValue(error);

      // Act & Assert
      await expect(translationService._translateWithGoogle('test', 'en', 'es'))
        .rejects.toThrow('Error translating with Google');
    });
  });

  describe('_translateWithAzure', () => {
    test('debería usar headers correctos', async () => {
      // Arrange
      const mockUuid = '123-456';
      uuidv4.mockReturnValue(mockUuid);
      const mockResponse = {
        data: [{ translations: [{ text: 'translated' }] }]
      };
      axios.post.mockResolvedValue(mockResponse);

      // Act
      await translationService._translateWithAzure('test', 'en', 'es');

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-ClientTraceId': mockUuid
          })
        })
      );
    });
  });
});
