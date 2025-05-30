/* /src/api/consent.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene el consentimiento actual para un dominio y usuario.
 * @param {String} domainId - ID del dominio.
 * @param {String} userId - ID del usuario (se pasa como query).
 * @returns {Object} Objeto de consentimiento.
 */
export const getConsent = async (domainId, userId) => {
  try {
    const response = await apiClient.get(`/api/v1/consent/domain/${domainId}`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching consent'
    );
  }
};

/**
 * Actualiza (o crea) el consentimiento para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} consentData - Datos del consentimiento (incluye userId, decisions, metadata, etc.).
 * @returns {Object} Objeto con el consentimiento actualizado.
 */
export const updateConsent = async (domainId, consentData) => {
  try {
    const response = await apiClient.post(`/api/v1/consent/domain/${domainId}`, consentData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating consent'
    );
  }
};

/**
 * Revoca el consentimiento para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {String} userId - ID del usuario.
 * @returns {Object} Respuesta del servidor.
 */
export const revokeConsent = async (domainId, userId) => {
  try {
    const response = await apiClient.post(`/api/v1/consent/domain/${domainId}/revoke`, { userId });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error revoking consent'
    );
  }
};

/**
 * Verifica el consentimiento de un usuario para un dominio, opcionalmente filtrando por propósitos y vendors.
 * @param {String} domainId - ID del dominio.
 * @param {Object} queryParams - Parámetros de consulta (userId, purposes, vendors, etc.).
 * @returns {Object} Resultado de la verificación.
 */
export const verifyConsent = async (domainId, queryParams) => {
  try {
    const response = await apiClient.get(`/api/v1/consent/domain/${domainId}/verify`, {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error verifying consent'
    );
  }
};

/**
 * Decodifica un TC String.
 * @param {String} tcString - El TC String a decodificar.
 * @returns {Object} Objeto con el TC String decodificado.
 */
export const decodeTCString = async (tcString) => {
  try {
    const response = await apiClient.post('/api/v1/consent/decode', { tcString });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error decoding TC String'
    );
  }
};

/**
 * Obtiene el historial de consentimiento para un dominio específico.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, userId, startDate, endDate).
 * @returns {Object} Objeto con el historial de consentimientos.
 */
export const getConsentHistory = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/consent/domain/${domainId}/history`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching consent history'
    );
  }
};
