/* /src/api/domain.js */
import apiClient from '../utils/apiClient';

/**
 * Obtiene todos los dominios asociados al cliente.
 * @returns {Object} Datos de dominios.
 */
export const getDomains = async () => {
  try {
    const response = await apiClient.get('/api/v1/domains');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching domains'
    );
  }
};

/**
 * Obtiene un dominio específico por ID.
 * @param {String} domainId - ID del dominio.
 * @returns {Object} Datos del dominio.
 */
export const getDomain = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/domains/${domainId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching domain'
    );
  }
};

/**
 * Crea un nuevo dominio.
 * @param {Object} domainData - Datos del dominio a crear.
 * @returns {Object} Datos del dominio creado.
 */
export const createDomain = async (domainData) => {
  try {
    const response = await apiClient.post('/api/v1/domains', domainData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error creating domain'
    );
  }
};

/**
 * Actualiza la información de un dominio.
 * @param {String} domainId - ID del dominio a actualizar.
 * @param {Object} updates - Campos a actualizar.
 * @returns {Object} Datos del dominio actualizado.
 */
export const updateDomain = async (domainId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/domains/${domainId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating domain'
    );
  }
};

/**
 * Elimina un dominio.
 * @param {String} domainId - ID del dominio a eliminar.
 * @returns {Object} Respuesta del servidor.
 */
export const deleteDomain = async (domainId) => {
  try {
    const response = await apiClient.delete(`/api/v1/domains/${domainId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error deleting domain'
    );
  }
};

/**
 * Actualiza la configuración del banner de un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {Object} bannerConfig - Configuración del banner.
 * @returns {Object} Datos actualizados del banner.
 */
export const updateBannerConfig = async (domainId, bannerConfig) => {
  try {
    const response = await apiClient.patch(`/api/v1/domains/${domainId}/banner`, { bannerConfig });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating banner configuration'
    );
  }
};

/**
 * Actualiza el estado de un dominio.
 * @param {String} domainId - ID del dominio.
 * @param {String} status - Nuevo estado (por ejemplo, 'active', 'inactive', 'pending').
 * @returns {Object} Datos del dominio actualizado.
 */
export const updateDomainStatus = async (domainId, status) => {
  try {
    const response = await apiClient.patch(`/api/v1/domains/${domainId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating domain status'
    );
  }
};

/**
 * Verifica la propiedad de un dominio.
 * @param {String} domainId - ID del dominio a verificar.
 * @returns {Object} Resultado de la verificación.
 */
export const verifyDomain = async (domainId) => {
  try {
    const response = await apiClient.post(`/api/v1/domains/${domainId}/verify`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error verifying domain'
    );
  }
};

/**
 * Asigna una plantilla de banner como predeterminada para un dominio
 * @param {String} domainId - ID del dominio
 * @param {String} templateId - ID de la plantilla de banner
 * @returns {Object} Datos del dominio actualizado.
 */
export const setDomainDefaultTemplate = async (domainId, templateId) => {
  try {
    const response = await apiClient.patch(`/api/v1/domains/${domainId}/default-template/${templateId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al asignar plantilla predeterminada al dominio'
    );
  }
};
