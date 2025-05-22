/* /src/api/cookie.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene las cookies asociadas a un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} [params={}] - Parámetros de consulta (por ejemplo, category, status, search).
 * @returns {object} Datos de las cookies.
 */
export const getCookies = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/cookies/domain/${domainId}`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching cookies'
    );
  }
};

/**
 * Obtiene una cookie específica por su ID.
 * @param {string} cookieId - ID de la cookie.
 * @returns {object} Datos de la cookie.
 */
export const getCookie = async (cookieId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookies/${cookieId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching cookie'
    );
  }
};

/**
 * Crea una nueva cookie.
 * @param {object} cookieData - Datos de la cookie a crear.
 * @returns {object} Datos de la cookie creada.
 */
export const createCookie = async (cookieData) => {
  try {
    const response = await apiClient.post('/api/v1/cookies', cookieData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error creating cookie'
    );
  }
};

/**
 * Actualiza una cookie existente.
 * @param {string} cookieId - ID de la cookie.
 * @param {object} updates - Campos a actualizar.
 * @returns {object} Datos de la cookie actualizada.
 */
export const updateCookie = async (cookieId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/cookies/${cookieId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating cookie'
    );
  }
};

/**
 * Actualiza el estado de una cookie.
 * @param {string} cookieId - ID de la cookie.
 * @param {string} status - Nuevo estado (por ejemplo, 'active', 'inactive', 'pending_review').
 * @returns {object} Datos de la cookie con el estado actualizado.
 */
export const updateCookieStatus = async (cookieId, status) => {
  try {
    const response = await apiClient.patch(`/api/v1/cookies/${cookieId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating cookie status'
    );
  }
};

/**
 * Encuentra cookies similares a una cookie específica.
 * @param {string} cookieId - ID de la cookie base.
 * @returns {object} Array de cookies similares.
 */
export const findSimilarCookies = async (cookieId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookies/${cookieId}/similar`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error finding similar cookies'
    );
  }
};

/**
 * Valida el cumplimiento de una cookie.
 * @param {string} cookieId - ID de la cookie.
 * @returns {object} Resultado de la validación.
 */
export const validateCompliance = async (cookieId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookies/${cookieId}/compliance`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error validating cookie compliance'
    );
  }
};

/**
 * Obtiene estadísticas de cookies para un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Estadísticas de las cookies.
 */
export const getCookieStats = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookies/domain/${domainId}/stats`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching cookie statistics'
    );
  }
};
