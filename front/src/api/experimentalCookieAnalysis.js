import apiClient from '../utils/apiClient';

export const experimentalCookieAnalysisAPI = {
  // Realizar análisis completo V2
  async scanDomain(domainId, options = {}) {
    try {
      const response = await apiClient.post(`/api/v1/experimental/cookie-analysis/scan/${domainId}`, {
        compare: options.compare || false,
        scannerType: options.scannerType || 'superfast', // 'superfast' o 'ultra'
        timeout: options.timeout || 30000,
        waitTime: options.waitTime || 3000, // Cambiar waitFor por waitTime
        scrollDepth: options.scrollDepth || 3,
        enableFingerprinting: options.enableFingerprinting !== false,
        enableStorageDetection: options.enableStorageDetection !== false,
        enableJavaScriptAnalysis: options.enableJavaScriptAnalysis !== false,
        enableNetworkAnalysis: options.enableNetworkAnalysis !== false,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error en análisis experimental:', error);
      throw error;
    }
  },

  // Comparar con sistema actual
  async compareSystems(domainId) {
    try {
      const response = await apiClient.get(`/api/v1/experimental/cookie-analysis/compare/${domainId}`);
      return response.data;
    } catch (error) {
      console.error('Error en comparación de sistemas:', error);
      throw error;
    }
  },

  // Escanear URL manual (solo owners)
  async scanURL(url, options = {}) {
    try {
      const response = await apiClient.post('/api/v1/experimental/cookie-analysis/scan-url', {
        url,
        scannerType: options.scannerType || 'superfast',
        timeout: options.timeout,
        waitTime: options.waitTime,
        scrollDepth: options.scrollDepth,
        saveToDatabase: options.saveToDatabase || false
      });
      return response.data;
    } catch (error) {
      console.error('Error en escaneo de URL:', error);
      throw error;
    }
  },

  // Obtener estadísticas del análisis
  async getAnalysisStats() {
    try {
      const response = await apiClient.get('/api/v1/experimental/cookie-analysis/stats');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
};

export default experimentalCookieAnalysisAPI;