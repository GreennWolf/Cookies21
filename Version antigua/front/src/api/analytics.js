/* /src/api/analytics.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene las estadísticas del dashboard.
 * @param {Object} params - Parámetros de consulta (por ejemplo, period).
 * @returns {Object} Datos del dashboard.
 */
export const getDashboardStats = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/analytics/dashboard', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching dashboard statistics'
    );
  }
};

/**
 * Obtiene las analíticas de un dominio específico.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, startDate, endDate, granularity).
 * @returns {Object} Datos analíticos del dominio.
 */
export const getDomainAnalytics = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching domain analytics'
    );
  }
};

/**
 * Obtiene las tendencias de analíticas para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, metric, startDate, endDate, granularity).
 * @returns {Object} Datos de tendencias.
 */
export const getTrends = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}/trends`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching trends'
    );
  }
};

/**
 * Obtiene las estadísticas de consentimiento para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, startDate, endDate, granularity).
 * @returns {Object} Datos de estadísticas de consentimiento.
 */
export const getConsentStats = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}/consent-stats`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching consent statistics'
    );
  }
};

/**
 * Obtiene las analíticas relacionadas con cookies de un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, type, startDate, endDate).
 * @returns {Object} Datos de analíticas de cookies.
 */
export const getCookieAnalytics = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}/cookies`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching cookie analytics'
    );
  }
};

/**
 * Obtiene datos demográficos para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, metric).
 * @returns {Object} Datos demográficos.
 */
export const getDemographics = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}/demographics`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching demographics data'
    );
  }
};

/**
 * Genera un reporte de analíticas para un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (por ejemplo, startDate, endDate, format).
 * @returns {Object} Datos del reporte.
 */
export const generateReport = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/domain/${domainId}/report`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error generating report'
    );
  }
};