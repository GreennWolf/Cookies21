/* /src/api/vendor.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene la última versión de la Global Vendor List (GVL).
 * @param {string} [language='en'] - Código de idioma para las traducciones (opcional).
 * @returns {object} Objeto con la lista de vendors.
 */
export const getLatestVendorList = async (language = 'en') => {
  try {
    const response = await apiClient.get('/api/v1/vendor/list', {
      params: { language }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching the latest vendor list'
    );
  }
};

/**
 * Obtiene una versión específica de la Global Vendor List.
 * @param {number|string} version - Versión de la lista a obtener.
 * @param {string} [language='en'] - Código de idioma para las traducciones (opcional).
 * @returns {object} Objeto con la lista de vendors para la versión solicitada.
 */
export const getVendorListVersion = async (version, language = 'en') => {
  try {
    const response = await apiClient.get(`/api/v1/vendor/list/${version}`, {
      params: { language }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching vendor list version'
    );
  }
};

/**
 * Obtiene la información de un vendor específico.
 * @param {number|string} vendorId - ID del vendor.
 * @param {string} [language='en'] - Código de idioma para las traducciones (opcional).
 * @returns {object} Datos del vendor.
 */
export const getVendorInfo = async (vendorId, language = 'en') => {
  try {
    const response = await apiClient.get(`/api/v1/vendor/vendor/${vendorId}`, {
      params: { language }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching vendor info'
    );
  }
};

/**
 * Busca vendors según un criterio de búsqueda y filtros opcionales.
 * @param {object} queryParams - Parámetros de búsqueda (por ejemplo, query, category, etc.).
 * @returns {object} Objeto con la lista de vendors que coinciden.
 */
export const searchVendors = async (queryParams = {}) => {
  try {
    const response = await apiClient.get('/api/v1/vendor/search', {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error searching vendors'
    );
  }
};

/**
 * Obtiene estadísticas de vendors (solo accesible para administradores).
 * @returns {object} Estadísticas de vendors.
 */
export const getVendorStats = async () => {
  try {
    const response = await apiClient.get('/api/v1/vendor/stats');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching vendor statistics'
    );
  }
};

/**
 * Fuerza la actualización de la Global Vendor List.
 * @returns {object} Respuesta del servidor tras actualizar la lista.
 */
export const forceUpdateVendorList = async () => {
  try {
    const response = await apiClient.post('/api/v1/vendor/update');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error forcing vendor list update'
    );
  }
};

/**
 * Obtiene los cambios entre dos versiones de la Global Vendor List.
 * @param {object} params - Parámetros de consulta (oldVersion y newVersion).
 * @returns {object} Objeto con los cambios detectados.
 */
export const getVersionChanges = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/vendor/changes', {
      params
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching version differences'
    );
  }
};
