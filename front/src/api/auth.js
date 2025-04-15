/* /src/api/auth.js */
import apiClient from '../utils/apiClient';

/**
 * Inicia sesión enviando las credenciales.
 * @param {Object} credentials - Objeto con email y password.
 * @returns {Object} Datos de la respuesta, incluyendo tokens y datos de usuario.
 */
export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error during login'
    );
  }
};

/**
 * Registra un nuevo usuario/cliente.
 * @param {Object} userData - Datos necesarios para el registro.
 * @returns {Object} Datos del usuario registrado y API Key inicial.
 */
export const register = async (userData) => {
  try {
    const response = await apiClient.post('/api/v1/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error during registration'
    );
  }
};

/**
 * Refresca el token de autenticación.
 * @param {Object} tokenData - Datos necesarios para refrescar el token.
 * @returns {Object} Nuevos tokens de acceso y refresh.
 */
export const refreshToken = async (tokenData) => {
  try {
    const response = await apiClient.post('/api/v1/auth/refresh-token', tokenData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error refreshing token'
    );
  }
};

/**
 * Solicita el envío de un token para resetear la contraseña.
 * @param {Object} emailData - Objeto con el email del usuario.
 * @returns {Object} Mensaje de confirmación.
 */
export const forgotPassword = async (emailData) => {
  try {
    const response = await apiClient.post('/api/v1/auth/forgot-password', emailData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error during password reset request'
    );
  }
};

/**
 * Resetea la contraseña utilizando el token enviado por email.
 * @param {Object} resetData - Objeto con token y nueva contraseña.
 * @returns {Object} Mensaje de confirmación.
 */
export const resetPassword = async (resetData) => {
  try {
    const response = await apiClient.post('/api/v1/auth/reset-password', resetData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error resetting password'
    );
  }
};

/**
 * Cierra la sesión del usuario.
 * @returns {Object} Mensaje de confirmación.
 */
export const logout = async () => {
  try {
    const response = await apiClient.post('/api/v1/auth/logout');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error during logout'
    );
  }
};

/**
 * Cambia la contraseña del usuario autenticado.
 * @param {Object} data - Objeto que contiene currentPassword y newPassword.
 * @returns {Object} Mensaje de confirmación.
 */
export const changePassword = async (data) => {
  try {
    const response = await apiClient.patch('/api/v1/auth/change-password', data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error changing password'
    );
  }
};

/**
 * Verifica el estado de la sesión actual.
 * @returns {Object} Datos de la sesión.
 */
export const checkSession = async () => {
  try {
    const response = await apiClient.get('/api/v1/auth/session');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error checking session'
    );
  }
};
