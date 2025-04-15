/* /src/api/translation.js */
import apiClient from '../utils/apiClient';

/**
 * Traduce un único texto.
 * @param {string} text - Texto a traducir.
 * @param {string} targetLanguage - Idioma destino.
 * @param {string} [sourceLanguage] - Idioma origen (opcional; si no se especifica, el backend lo detectará).
 * @returns {object} Objeto con la traducción y detalles.
 */
export const translateText = async (text, targetLanguage, sourceLanguage) => {
  try {
    const payload = { text, targetLanguage };
    if (sourceLanguage) {
      payload.sourceLanguage = sourceLanguage;
    }
    const response = await apiClient.post('/api/v1/translation/translate', payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error translating text'
    );
  }
};

/**
 * Traduce un lote de textos.
 * @param {Array<string>} texts - Array de textos a traducir.
 * @param {string} targetLanguage - Idioma destino.
 * @param {string} [sourceLanguage] - Idioma origen (opcional).
 * @returns {object} Objeto con las traducciones.
 */
export const translateBatch = async (texts, targetLanguage, sourceLanguage) => {
  try {
    const payload = { texts, targetLanguage };
    if (sourceLanguage) {
      payload.sourceLanguage = sourceLanguage;
    }
    const response = await apiClient.post('/api/v1/translation/translate/batch', payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error translating batch texts'
    );
  }
};

/**
 * Traduce la configuración del banner para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} translationData - Datos necesarios para traducir (por ejemplo, textos y configuraciones).
 * @returns {object} Configuración del banner traducido.
 */
export const translateBanner = async (domainId, translationData) => {
  try {
    const response = await apiClient.post(`/api/v1/translation/domain/${domainId}/translate`, translationData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error translating banner'
    );
  }
};

/**
 * Refresca las traducciones para un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Resultado del refresco de traducciones.
 */
export const refreshTranslations = async (domainId) => {
  try {
    const response = await apiClient.post(`/api/v1/translation/domain/${domainId}/refresh`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error refreshing translations'
    );
  }
};
