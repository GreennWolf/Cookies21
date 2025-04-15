/* /src/api/integration.js */
import apiClient from '../utils/apiClient';

/**
 * Configura la integración de Google Analytics para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} configData - Configuración que incluye measurementId y credenciales/config adicionales.
 * @returns {object} Respuesta del servidor.
 */
export const configureGoogleAnalytics = async (domainId, configData) => {
  try {
    const response = await apiClient.post(`/api/v1/integration/domain/${domainId}/google-analytics`, configData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error configuring Google Analytics'
    );
  }
};

/**
 * Configura la integración de Google Tag Manager para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} configData - Datos de configuración que incluyen containerId y demás.
 * @returns {object} Respuesta del servidor.
 */
export const configureGTM = async (domainId, configData) => {
  try {
    const response = await apiClient.post(`/api/v1/integration/domain/${domainId}/gtm`, configData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error configuring Google Tag Manager'
    );
  }
};

/**
 * Configura la integración IAB.
 * @param {object} configData - Configuración IAB, que incluye cmpId y otros parámetros.
 * @returns {object} Respuesta del servidor.
 */
export const configureIAB = async (configData) => {
  try {
    const response = await apiClient.post('/api/v1/integration/iab', configData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error configuring IAB integration'
    );
  }
};

/**
 * Configura un webhook para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} webhookData - Datos del webhook (URL, events, secret, etc.).
 * @returns {object} Respuesta del servidor.
 */
export const configureWebhook = async (domainId, webhookData) => {
  try {
    const response = await apiClient.post(`/api/v1/integration/domain/${domainId}/webhook`, webhookData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error configuring webhook'
    );
  }
};

/**
 * Envía una solicitud de prueba a un webhook.
 * @param {object} testData - Datos necesarios para probar el webhook (por ejemplo, URL y secret).
 * @returns {object} Resultado de la prueba.
 */
export const testWebhook = async (testData) => {
  try {
    const response = await apiClient.post('/api/v1/integration/webhook/test', testData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error testing webhook'
    );
  }
};

/**
 * Obtiene el estado de las integraciones para un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Estado de las integraciones (Google Analytics, GTM, IAB, webhooks, etc.).
 */
export const getIntegrationStatus = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/integration/domain/${domainId}/status`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching integration status'
    );
  }
};
