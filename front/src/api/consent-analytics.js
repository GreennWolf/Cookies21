/* /src/api/consent-analytics.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene estadísticas directamente del modelo de consentimiento para un dominio
 * Esta es una alternativa al endpoint con error para cookies
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (startDate, endDate).
 * @returns {Object} Datos de analíticas de cookies basados en consentimiento.
 */
export const getConsentCookieStats = async (domainId, params = {}) => {
  try {
    // Usamos el endpoint de history para obtener datos crudos
    const response = await apiClient.get(`/api/v1/consent/domain/${domainId}/history`, { 
      params: {
        ...params,
        // No necesitamos limitar por userId
        limit: 1000 // Traer suficientes datos para hacer análisis
      }
    });
    
    // Procesamos los datos para extraer estadísticas
    const history = response.data?.data?.history || [];
    
    // Extraer datos de cookies
    const cookieStats = processCookieStats(history);
    
    return {
      status: 'success',
      data: cookieStats
    };
  } catch (error) {
    console.error('Error en getConsentCookieStats:', error);
    throw new Error(
      error.response?.data?.message || 'Error obteniendo estadísticas de cookies desde consentimiento'
    );
  }
};

/**
 * Procesa los logs de consentimiento para extraer estadísticas de cookies
 * @param {Array} consentLogs - Array de registros de consentimiento
 * @returns {Array} Estadísticas de cookies por categoría
 */
function processCookieStats(consentLogs) {
  // Categorías de cookies predefinidas
  const categories = ['necessary', 'analytics', 'marketing', 'personalization'];
  
  // Inicializar contadores
  const stats = categories.map(category => ({
    category,
    total: 0,
    accepted: 0,
    rejected: 0,
    acceptanceRate: 0
  }));
  
  // Procesar cada consentimiento
  consentLogs.forEach(consent => {
    // Verificar si hay preferencias de cookies
    if (consent.preferences && Array.isArray(consent.preferences.cookies)) {
      // Actualizar contadores para cada categoría
      consent.preferences.cookies.forEach(cookie => {
        const category = stats.find(s => s.category === cookie.category);
        if (category) {
          category.total++;
          if (cookie.allowed) {
            category.accepted++;
          } else {
            category.rejected++;
          }
        }
      });
    }
  });
  
  // Calcular tasas de aceptación
  stats.forEach(category => {
    if (category.total > 0) {
      category.acceptanceRate = category.accepted / category.total;
    }
  });
  
  return stats;
}

/**
 * Obtiene datos de consentimiento para análisis
 * @param {String} domainId - ID del dominio.
 * @param {Object} params - Parámetros de consulta (startDate, endDate).
 * @returns {Object} Datos de consentimiento para análisis.
 */
export const getConsentAnalytics = async (domainId, params = {}) => {
  try {
    // Usamos el endpoint de history
    const response = await apiClient.get(`/api/v1/consent/domain/${domainId}/history`, { 
      params: {
        ...params,
        limit: 1000
      }
    });
    
    // Procesamos los datos para análisis
    const history = response.data?.data?.history || [];
    
    // Extraer datos por tipo de interacción
    const interactionStats = processInteractionStats(history);
    
    return {
      status: 'success',
      data: { 
        interactionStats,
        totalConsents: history.length
      }
    };
  } catch (error) {
    console.error('Error en getConsentAnalytics:', error);
    throw new Error(
      error.response?.data?.message || 'Error obteniendo analíticas de consentimiento'
    );
  }
};

/**
 * Procesa los logs de consentimiento para extraer estadísticas de interacción
 * @param {Array} consentLogs - Array de registros de consentimiento
 * @returns {Object} Estadísticas de interacción
 */
function processInteractionStats(consentLogs) {
  // Tipos de interacción predefinidos
  const types = ['accept_all', 'reject_all', 'save_preferences', 'close', 'no_interaction', 'load_test', 'grant'];
  
  // Inicializar contadores
  const stats = types.reduce((acc, type) => {
    acc[type] = {
      count: 0,
      avgTimeToDecision: 0
    };
    return acc;
  }, {});
  
  // Procesar cada consentimiento
  consentLogs.forEach(consent => {
    // Verificar si hay datos de interacción con banner
    if (consent.bannerInteraction && consent.bannerInteraction.type) {
      const type = consent.bannerInteraction.type;
      
      // Incrementar contador
      if (stats[type]) {
        stats[type].count++;
        
        // Acumular tiempo de decisión
        if (consent.bannerInteraction.timeToDecision) {
          stats[type].totalTime = (stats[type].totalTime || 0) + consent.bannerInteraction.timeToDecision;
        }
      }
    }
  });
  
  // Calcular tiempos promedio
  Object.keys(stats).forEach(type => {
    if (stats[type].count > 0 && stats[type].totalTime) {
      stats[type].avgTimeToDecision = stats[type].totalTime / stats[type].count;
      delete stats[type].totalTime; // Eliminar dato temporal
    }
  });
  
  return stats;
}

// Asegurarnos de que ambas funciones estén correctamente exportadas
export default {
  getConsentCookieStats,
  getConsentAnalytics
};