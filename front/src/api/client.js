/* /src/api/client.js */
import apiClient from '../utils/apiClient';

/**
 * Crea un nuevo cliente (solo usuarios owner pueden hacerlo).
 * @param {object} clientData - Datos del cliente a crear
 * @returns {object} Datos del cliente creado y su administrador inicial
 */
export const createClient = async (clientData) => {
  try {
    const response = await apiClient.post('/api/v1/clients', clientData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al crear el cliente'
    );
  }
};

/**
 * Obtiene la lista de clientes.
 * @param {object} params - Parámetros opcionales de consulta (status, plan, search, etc.).
 * @returns {object} Lista de clientes y datos de paginación.
 */
export const getClients = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/clients', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener clientes'
    );
  }
};

/**
 * Obtiene la información de un cliente específico.
 * @param {string} clientId - ID del cliente.
 * @returns {object} Datos del cliente.
 */
export const getClient = async (clientId) => {
  try {
    const response = await apiClient.get(`/api/v1/clients/${clientId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener cliente'
    );
  }
};

/**
 * Obtiene los detalles completos de un cliente, incluyendo su plan, facturación, etc.
 * @param {string} clientId - ID del cliente
 * @returns {object} Datos detallados del cliente
 */
export const getClientDetails = async (clientId) => {
  try {
    // Usamos la ruta básica de cliente, ya que este endpoint específico podría no existir
    const response = await apiClient.get(`/api/v1/clients/${clientId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener detalles del cliente'
    );
  }
};

/**
 * Actualiza los datos de un cliente.
 * @param {string} clientId - ID del cliente.
 * @param {object} updates - Datos a actualizar (nombre, email, dominios, información fiscal, etc.).
 * @returns {object} Cliente actualizado.
 */
export const updateClient = async (clientId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/clients/${clientId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al actualizar cliente'
    );
  }
};

/**
 * Actualiza el plan de suscripción de un cliente.
 * @param {string} clientId - ID del cliente.
 * @param {object} subscriptionData - Datos de la suscripción a actualizar.
 * @returns {object} Datos de suscripción actualizados.
 */
export const updateSubscription = async (clientId, subscriptionData) => {
  try {
    const response = await apiClient.patch(
      `/api/v1/clients/${clientId}/subscription`, 
      subscriptionData
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al actualizar suscripción'
    );
  }
};

/**
 * Actualiza solo la información fiscal de un cliente.
 * @param {string} clientId - ID del cliente.
 * @param {object} fiscalInfo - Información fiscal a actualizar.
 * @returns {object} Cliente con la información fiscal actualizada.
 */
export const updateClientFiscalInfo = async (clientId, fiscalInfo) => {
  try {
    const response = await apiClient.patch(
      `/api/v1/clients/${clientId}`, 
      { fiscalInfo }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al actualizar información fiscal'
    );
  }
};

/**
 * Cambia el estado de un cliente (activar, inactivar o suspender).
 * @param {string} clientId - ID del cliente.
 * @param {string} status - Nuevo estado (active, inactive, suspended).
 * @returns {object} Cliente con el estado actualizado.
 */
export const toggleClientStatus = async (clientId, status) => {
  try {
    const response = await apiClient.patch(
      `/api/v1/clients/${clientId}/status`, 
      { status }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al cambiar el estado del cliente'
    );
  }
};

/**
 * Obtiene métricas de uso de un cliente.
 * @param {string} clientId - ID del cliente.
 * @returns {object} Métricas del cliente (usuarios, dominios, uso de API, información fiscal, etc.).
 */
export const getClientMetrics = async (clientId) => {
  try {
    const response = await apiClient.get(`/api/v1/clients/${clientId}/metrics`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener métricas del cliente'
    );
  }
};

/**
 * Asigna un template a un dominio por nombre.
 * Útil cuando el dominio ya fue creado pero falta asignarle un template.
 * @param {string} domainName - Nombre del dominio.
 * @param {string} templateId - ID del template a asignar.
 * @returns {object} Dominio actualizado.
 */
export const assignTemplateToDomain = async (domainName, templateId) => {
  try {
    const response = await apiClient.post(
      `/api/v1/domains/assign-template/${domainName}`,
      { templateId }
    );
    return response.data;
  } catch (error) {
    console.error('Error asignando template a dominio:', error);
    throw new Error(
      error.response?.data?.message || 'Error al asignar template al dominio'
    );
  }
};