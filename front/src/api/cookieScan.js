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
 * Inicia un análisis asíncrono de cookies para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} analysisData - Datos de configuración del análisis.
 * @returns {object} Datos del análisis iniciado con analysisId.
 */
export const startAsyncAnalysis = async (domainId, analysisData = {}) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/async-analysis`, analysisData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error starting cookie analysis'
    );
  }
};

/**
 * Inicia un análisis avanzado de cookies para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} analysisConfig - Configuración del análisis avanzado.
 * @returns {object} Datos del análisis iniciado.
 */
export const startAdvancedAnalysis = async (domainId, analysisConfig = {}) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/advanced-analysis`, analysisConfig);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error starting advanced analysis'
    );
  }
};

/**
 * Obtiene el estado de un análisis de cookies en curso.
 * @param {string} analysisId - ID del análisis.
 * @returns {object} Estado del análisis con progreso y tiempo estimado.
 */
export const getAnalysisStatus = async (analysisId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/analysis/${analysisId}/status`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching analysis status'
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
 * Obtiene el historial de análisis avanzados para un dominio.
 * @param {string} domainId - ID del dominio.
 * @param {object} [params={}] - Parámetros de consulta (por ejemplo, status, page, limit).
 * @returns {object} Datos del historial de análisis avanzados.
 */
export const getAnalysisHistory = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/domain/${domainId}/analysis-history`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching analysis history'
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
 * Cancela un análisis avanzado en curso.
 * @param {string} analysisId - ID del análisis.
 * @returns {object} Respuesta del servidor al cancelar el análisis.
 */
export const cancelAnalysis = async (analysisId) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/analysis/${analysisId}/cancel`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error cancelling analysis'
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
 * Obtiene los resultados del análisis avanzado.
 * @param {string} analysisId - ID del análisis.
 * @returns {object} Datos de los resultados del análisis.
 */
export const getAnalysisResults = async (analysisId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/analysis/${analysisId}/results`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching analysis results'
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

/**
 * Cancela un escaneo en progreso.
 * @param {string} scanId - ID del escaneo.
 * @returns {object} Respuesta del servidor al cancelar el escaneo.
 */
export const cancelScanInProgress = async (scanId) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/scan/${scanId}/cancel-scan`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error cancelling scan in progress'
    );
  }
};

/**
 * Obtiene el escaneo activo para un dominio.
 * @param {string} domainId - ID del dominio.
 * @returns {object} Datos del escaneo activo o null si no hay ninguno.
 */
export const getActiveScan = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/cookie-scan/domain/${domainId}/active-scan`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching active scan'
    );
  }
};

/**
 * Fuerza la cancelación de todos los escaneos activos para un dominio (solo owners).
 * @param {string} domainId - ID del dominio.
 * @returns {object} Respuesta del servidor con el número de escaneos cancelados.
 */
export const forceStopAllScans = async (domainId) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/force-stop`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error force stopping scans'
    );
  }
};

/**
 * Fuerza la cancelación de todos los análisis activos para un dominio (solo owners).
 * @param {string} domainId - ID del dominio.
 * @returns {object} Respuesta del servidor con el número de análisis cancelados.
 */
export const forceStopAllAnalysis = async (domainId) => {
  try {
    const response = await apiClient.post(`/api/v1/cookie-scan/domain/${domainId}/force-stop-analysis`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error force stopping analyses'
    );
  }
};
