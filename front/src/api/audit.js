/* /src/api/audit.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene los logs de auditoría (globales) con paginación y filtros.
 * @param {Object} params - Parámetros de consulta (startDate, endDate, action, resourceType, severity, status, userId, page, limit).
 * @returns {Object} Datos de auditoría y paginación.
 */
export const getAuditLogs = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/audit/logs', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching audit logs'
    );
  }
};

/**
 * Obtiene los logs de auditoría para un dominio específico.
 * @param {string} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (startDate, endDate, etc.).
 * @returns {Object} Logs de auditoría para el dominio.
 */
export const getDomainAuditLogs = async (domainId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/v1/audit/domain/${domainId}/logs`, { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching domain audit logs'
    );
  }
};

/**
 * Obtiene el detalle de un evento de auditoría.
 * @param {string} eventId - ID del evento de auditoría.
 * @returns {Object} Detalle completo del evento.
 */
export const getAuditEvent = async (eventId) => {
  try {
    const response = await apiClient.get(`/api/v1/audit/event/${eventId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching audit event'
    );
  }
};

/**
 * Obtiene un resumen de la actividad de auditoría (por ejemplo, actividades recientes).
 * @param {Object} params - Parámetros de consulta (period, etc.).
 * @returns {Object} Resumen de actividad.
 */
export const getActivitySummary = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/audit/activity', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching activity summary'
    );
  }
};

/**
 * Exporta los logs de auditoría en un formato específico (json, csv, pdf).
 * @param {Object} params - Parámetros de consulta (startDate, endDate, format).
 * @returns {Blob|Object} Archivo exportado (usualmente se devuelve un blob para descarga).
 */
export const exportAuditLogs = async (params = {}) => {
  try {
    // Indicamos responseType 'blob' para manejar archivos (CSV, PDF)
    const response = await apiClient.get('/api/v1/audit/export', { params, responseType: 'blob' });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error exporting audit logs'
    );
  }
};

/**
 * Obtiene estadísticas de auditoría basadas en filtros (por ejemplo, entre fechas).
 * @param {Object} params - Parámetros de consulta (startDate, endDate, etc.).
 * @returns {Object} Estadísticas agregadas de auditoría.
 */
export const getAuditStats = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/audit/stats', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching audit stats'
    );
  }
};
