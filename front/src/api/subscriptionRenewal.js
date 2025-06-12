import apiClient from '../utils/apiClient';

/**
 * Crear una nueva solicitud de renovación/reactivación
 */
export const createRenewalRequest = async (requestData) => {
  try {
    const response = await apiClient.post('/api/v1/subscription-renewals/request', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating renewal request:', error);
    throw new Error(
      error.response?.data?.message || 'Error al enviar la solicitud de renovación'
    );
  }
};

/**
 * Verificar si el usuario tiene una solicitud pendiente
 */
export const checkPendingRequest = async (clientId = null) => {
  try {
    const url = clientId 
      ? `/api/v1/subscription-renewals/pending?clientId=${clientId}`
      : '/api/v1/subscription-renewals/pending';
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error checking pending request:', error);
    throw new Error(
      error.response?.data?.message || 'Error al verificar solicitudes pendientes'
    );
  }
};

/**
 * Obtener todas las solicitudes de renovación (solo para owners)
 */
export const getRenewalRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.urgency) {
      params.append('urgency', filters.urgency);
    }
    if (filters.requestType) {
      params.append('requestType', filters.requestType);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }

    const response = await apiClient.get(`/api/v1/subscription-renewals?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching renewal requests:', error);
    throw new Error(
      error.response?.data?.message || 'Error al obtener solicitudes de renovación'
    );
  }
};

/**
 * Actualizar una solicitud de renovación (solo para owners)
 */
export const updateRenewalRequest = async (requestId, updateData) => {
  try {
    const response = await apiClient.patch(`/api/v1/subscription-renewals/${requestId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating renewal request:', error);
    throw new Error(
      error.response?.data?.message || 'Error al actualizar la solicitud'
    );
  }
};