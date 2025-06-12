/* /src/api/cookie.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene las cookies asociadas a un dominio.
 * @param {string} domainId - ID del dominio. Si es null/undefined para usuarios owner, se pueden obtener todas.
 * @param {object} [params={}] - Parámetros de consulta (por ejemplo, category, status, search, clientId).
 * @returns {object} Datos de las cookies.
 */
export const getCookies = async (domainId, params = {}) => {
  try {
    // Si es owner y tiene filtro por cliente pero sin dominio específico
    if (!domainId && params.clientId) {
      // Para owner, usar endpoint de todas las cookies con filtro por cliente
      const response = await apiClient.get(`/api/v1/cookies/all`, { params });
      return response.data;
    }
    
    // Si se proporciona un domainId, obtener cookies para ese dominio específico
    if (domainId) {
      const response = await apiClient.get(`/api/v1/cookies/domain/${domainId}`, { params });
      return response.data;
    }
    
    // Si no hay dominio ni cliente, retornar datos vacíos para evitar error 404
    return { data: { cookies: [] } };
  } catch (error) {
    console.error('Error en getCookies:', error);
    // Devolver datos vacíos para evitar errores en la interfaz
    if (error.response?.status === 404) {
      return { data: { cookies: [] } };
    }
    throw new Error(
      error.response?.data?.message || 'Error al obtener cookies'
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
 * Elimina una cookie específica.
 * @param {string} cookieId - ID de la cookie a eliminar.
 * @returns {object} Confirmación de eliminación.
 */
export const deleteCookie = async (cookieId) => {
  try {
    const response = await apiClient.delete(`/api/v1/cookies/${cookieId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error deleting cookie'
    );
  }
};

/**
 * Elimina múltiples cookies.
 * @param {Array} cookieIds - Array de IDs de cookies a eliminar.
 * @returns {object} Confirmación de eliminación múltiple.
 */
export const deleteCookies = async (cookieIds) => {
  try {
    const response = await apiClient.delete('/api/v1/cookies/bulk', {
      data: { cookieIds }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error deleting cookies'
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
