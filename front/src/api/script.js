/* /src/api/script.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene todos los scripts asociados a un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} queryParams - Parámetros opcionales de búsqueda (category, type, status).
 * @returns {object} Datos de los scripts.
 */
export const getScripts = async (domainId, queryParams = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/script/domain/${domainId}`, {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching scripts'
    );
  }
};

/**
 * Verifica los scripts externos de un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Resultado de la verificación de scripts externos.
 */
export const checkExternalScripts = async (domainId) => {
  try {
    const response = await apiClient.post(`/api/v1/script/domain/${domainId}/check-external`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error checking external scripts'
    );
  }
};

/**
 * Genera las etiquetas HTML para los scripts de un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Objeto con las etiquetas HTML generadas.
 */
export const generateScriptTags = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/script/domain/${domainId}/generate-tags`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error generating script tags'
    );
  }
};

/**
 * Actualiza el orden de carga de los scripts de un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} loadOrderData - Objeto con el nuevo orden de carga.
 * @returns {object} Datos actualizados de los scripts.
 */
export const updateLoadOrder = async (domainId, loadOrderData) => {
  try {
    const response = await apiClient.patch(`/api/v1/script/domain/${domainId}/load-order`, loadOrderData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating script load order'
    );
  }
};

/**
 * Crea un nuevo script.
 * @param {object} scriptData - Datos del script a crear.
 * @returns {object} Datos del script creado.
 */
export const createScript = async (scriptData) => {
  try {
    const response = await apiClient.post('/api/v1/script', scriptData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error creating script'
    );
  }
};

/**
 * Obtiene un script específico por su ID.
 * @param {string} scriptId - ID del script.
 * @returns {object} Datos del script.
 */
export const getScript = async (scriptId) => {
  try {
    const response = await apiClient.get(`/api/v1/script/${scriptId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching script'
    );
  }
};

/**
 * Actualiza un script existente.
 * @param {string} scriptId - ID del script.
 * @param {object} updates - Campos a actualizar.
 * @returns {object} Datos del script actualizado.
 */
export const updateScript = async (scriptId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/script/${scriptId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating script'
    );
  }
};

/**
 * Actualiza el estado de un script (por ejemplo, active, inactive, pending_review, blocked).
 * @param {string} scriptId - ID del script.
 * @param {string} status - Nuevo estado.
 * @returns {object} Datos del script con el estado actualizado.
 */
export const updateScriptStatus = async (scriptId, status) => {
  try {
    const response = await apiClient.patch(`/api/v1/script/${scriptId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating script status'
    );
  }
};
