/* /src/api/subscription.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene todos los planes de suscripción.
 * @param {object} params - Parámetros opcionales de consulta (status, search).
 * @returns {object} Lista de planes de suscripción.
 */
export const getSubscriptionPlans = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/subscriptions', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener planes de suscripción'
    );
  }
};

/**
 * Obtiene un plan de suscripción específico.
 * @param {string} planId - ID del plan.
 * @returns {object} Datos del plan.
 */
export const getSubscriptionPlan = async (planId) => {
  try {
    const response = await apiClient.get(`/api/v1/subscriptions/${planId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener plan de suscripción'
    );
  }
};

/**
 * Crea un nuevo plan de suscripción.
 * @param {object} planData - Datos del plan a crear.
 * @returns {object} Plan creado.
 */
export const createSubscriptionPlan = async (planData) => {
  try {
    const response = await apiClient.post('/api/v1/subscriptions', planData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al crear plan de suscripción'
    );
  }
};

/**
 * Actualiza un plan de suscripción.
 * @param {string} planId - ID del plan.
 * @param {object} updates - Datos a actualizar.
 * @returns {object} Plan actualizado.
 */
export const updateSubscriptionPlan = async (planId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/subscriptions/${planId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al actualizar plan de suscripción'
    );
  }
};

/**
 * Cambia el estado de un plan de suscripción.
 * @param {string} planId - ID del plan.
 * @param {string} status - Nuevo estado (active, inactive, archived).
 * @returns {object} Plan con estado actualizado.
 */
export const togglePlanStatus = async (planId, status) => {
  try {
    const response = await apiClient.patch(
      `/api/v1/subscriptions/${planId}/status`, 
      { status }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al cambiar estado del plan'
    );
  }
};

/**
 * Clona un plan existente.
 * @param {string} planId - ID del plan a clonar.
 * @param {string} newName - Nombre para el nuevo plan.
 * @returns {object} Nuevo plan clonado.
 */
export const clonePlan = async (planId, newName) => {
  try {
    const response = await apiClient.post(
      `/api/v1/subscriptions/${planId}/clone`, 
      { newName }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al clonar plan'
    );
  }
};

/**
 * Inicializa los planes predeterminados.
 * @returns {object} Lista de planes creados.
 */
export const initializeDefaultPlans = async () => {
  try {
    const response = await apiClient.post('/api/v1/subscriptions/initialize');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al inicializar planes predeterminados'
    );
  }
};

/**
 * Asigna un plan a un cliente.
 * @param {string} planId - ID del plan.
 * @param {string} clientId - ID del cliente.
 * @param {object} options - Opciones adicionales (startDate, endDate, isUnlimited, maxUsers).
 * @returns {object} Cliente con plan actualizado.
 */
export const assignPlanToClient = async (planId, clientId, options = {}) => {
  try {
    const response = await apiClient.post(
      `/api/v1/subscriptions/${planId}/assign/${clientId}`, 
      options
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al asignar plan al cliente'
    );
  }
};