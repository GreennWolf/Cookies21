import apiClient from '../utils/apiClient';

/**
 * API para análisis avanzado de cookies
 */

/**
 * Iniciar un nuevo análisis avanzado
 */
export const startAdvancedAnalysis = async (domainId, config) => {
  try {
    const response = await apiClient.post(`/api/v1/advanced-analysis/domain/${domainId}/start`, config);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error starting advanced analysis');
  }
};

/**
 * Obtener estado del análisis
 */
export const getAnalysisStatus = async (analysisId) => {
  try {
    const response = await apiClient.get(`/api/v1/advanced-analysis/analysis/${analysisId}/status`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching analysis status');
  }
};

/**
 * Obtener resultados completos del análisis
 */
export const getAnalysisResults = async (analysisId, options = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (options.includeDetails !== undefined) {
      params.append('includeDetails', options.includeDetails);
    }
    
    if (options.format) {
      params.append('format', options.format);
    }
    
    const response = await apiClient.get(
      `/api/v1/advanced-analysis/analysis/${analysisId}/results?${params}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching analysis results');
  }
};

/**
 * Obtener reporte de compliance
 */
export const getComplianceReport = async (analysisId) => {
  try {
    const response = await apiClient.get(`/api/v1/advanced-analysis/analysis/${analysisId}/compliance`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching compliance report');
  }
};

/**
 * Cancelar análisis en progreso
 */
export const cancelAnalysis = async (analysisId) => {
  try {
    const response = await apiClient.post(`/api/v1/advanced-analysis/analysis/${analysisId}/cancel`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error cancelling analysis');
  }
};

/**
 * Obtener historial de análisis
 */
export const getAnalysisHistory = async (domainId, options = {}) => {
  try {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await apiClient.get(
      `/api/v1/advanced-analysis/domain/${domainId}/history?${params}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching analysis history');
  }
};

/**
 * Obtener tendencias de cookies
 */
export const getCookieTrends = async (domainId, days = 30) => {
  try {
    const response = await apiClient.get(
      `/api/v1/advanced-analysis/domain/${domainId}/trends?days=${days}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching cookie trends');
  }
};

/**
 * Comparar dos análisis
 */
export const compareAnalyses = async (analysisId1, analysisId2) => {
  try {
    const response = await apiClient.get(
      `/api/v1/advanced-analysis/compare/${analysisId1}/${analysisId2}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error comparing analyses');
  }
};

/**
 * Programar análisis automático
 */
export const scheduleAnalysis = async (domainId, scheduleConfig) => {
  try {
    const response = await apiClient.post(
      `/api/v1/advanced-analysis/domain/${domainId}/schedule`,
      scheduleConfig
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error scheduling analysis');
  }
};

/**
 * Exportar resultados de análisis
 */
export const exportAnalysisResults = async (analysisId, format = 'csv') => {
  try {
    const response = await apiClient.get(
      `/api/v1/advanced-analysis/analysis/${analysisId}/results?format=${format}`,
      {
        responseType: 'blob'
      }
    );
    
    // Crear URL para descarga
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Crear enlace de descarga temporal
    const link = document.createElement('a');
    link.href = url;
    link.download = `cookie-analysis-${analysisId}.${format}`;
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error exporting analysis results');
  }
};