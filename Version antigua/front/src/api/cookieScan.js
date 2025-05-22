/* /src/api/cookieScan.js */
import apiClient from '../utils/apiClient';

/**
 * Inicia un nuevo escaneo de cookies para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} scanData - Datos de configuración del escaneo (por ejemplo, scanType, priority).
 * @returns {object} Datos del escaneo iniciado.
 */
export const startScan = async (domainId, scanData) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/scan`, scanData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error starting cookie scan'
    );
  }
};

/**
 * Obtiene el estado de un escaneo de cookies.
 * @param {string} scanId - ID del escaneo.
 * @returns {object} Datos del estado del escaneo.
 */
export const getScanStatus = async (scanId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/scan/${scanId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching scan status'
    );
  }
};

/**
 * Obtiene el historial de escaneos para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} [params={}] - Parámetros de consulta (por ejemplo, status, startDate, endDate, page, limit).
 * @returns {object} Datos del historial de escaneos.
 */
export const getScanHistory = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/domain/${domainId}/history`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching scan history'
    );
  }
};

/**
 * Cancela un escaneo en curso.
 * @param {string} scanId - ID del escaneo.
 * @returns {object} Respuesta del servidor al cancelar el escaneo.
 */
export const cancelScan = async (scanId) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/scan/${scanId}/cancel`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error cancelling scan'
    );
  }
};

/**
 * Obtiene los resultados del escaneo.
 * @param {string} scanId - ID del escaneo.
 * @returns {object} Datos de los resultados del escaneo.
 */
export const getScanResults = async (scanId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/scan/${scanId}/results`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching scan results'
    );
  }
};

/**
 * Aplica cambios detectados en un escaneo.
 * @param {string} scanId - ID del escaneo.
 * @param {object} changesData - Datos de los cambios a aplicar.
 * @returns {object} Respuesta del servidor tras aplicar los cambios.
 */
export const applyChanges = async (scanId, changesData) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/scan/${scanId}/apply`, changesData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error applying changes'
    );
  }
};

/**
 * Programa un escaneo automático para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} scheduleData - Datos de programación (por ejemplo, intervalos, horarios).
 * @returns {object} Respuesta del servidor tras programar el escaneo.
 */
export const scheduleScan = async (domainId, scheduleData) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/schedule`, scheduleData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error scheduling scan'
    );
  }
};

/**
 * Obtiene los cambios específicos detectados en un escaneo.
 * @param {string} scanId - ID del escaneo.
 * @param {object} [queryParams={}] - Parámetros de consulta para filtrar cambios (por ejemplo, type).
 * @returns {object} Datos de los cambios (nuevos, modificados, eliminados).
 */
export const getScanChanges = async (scanId, queryParams = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/scan/${scanId}/changes`, { params: queryParams });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching scan changes'
    );
  }
};

/**
 * Exporta los resultados de un escaneo en un formato específico (JSON, CSV, PDF).
 * @param {string} scanId - ID del escaneo.
 * @param {object} exportData - Datos de exportación (por ejemplo, formato, includeDetails).
 * @returns {Blob|Object} Archivo exportado (usualmente un blob para descarga).
 */
export const exportScanResults = async (scanId, exportData) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/scan/${scanId}/export`, exportData, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error exporting scan results'
    );
  }
};
