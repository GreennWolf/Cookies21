// src/api/scriptGenerator.js
import apiClient from '../utils/apiClient';

/**
 * Genera un script estándar para el banner
 */
export const generateStandardScript = async (domainId, templateId) => {
  try {
    const response = await apiClient.post(`/api/v1/consent-script/generate/${domainId}`, {
      templateId
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error generando script');
  }
};

/**
 * Genera un script con integración de scripts del cliente
 */
export const generateIntegratedScript = async (domainId, templateId, scriptIds = []) => {
  try {
    const response = await apiClient.post(`/api/v1/consent-script/generate/${domainId}/integrated`, {
      templateId,
      scriptIds
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error generando script integrado');
  }
};

/**
 * Genera código de instalación para el banner
 */
export const generateInstallationCode = async (domainId) => {
  try {
    const response = await apiClient.get(`/api/v1/consent-script/install/${domainId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error generando código de instalación');
  }
};

/**
 * Obtiene la URL del script servido por el backend
 */
export const getScriptUrl = (domainId) => {
  return `${apiClient.defaults.baseURL}/api/v1/consent-script/script/${domainId}/embed.js`;
};