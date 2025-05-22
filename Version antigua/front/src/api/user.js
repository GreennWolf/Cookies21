/* /src/api/user.js */
import apiClient from '../utils/apiClient';

/**
 * Crea un nuevo usuario (solo administradores pueden invitar).
 * @param {object} userData - Datos del usuario a crear (email, name, role, permisos, etc.).
 * @returns {object} Datos del usuario creado.
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/api/v1/users', userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error creating user'
    );
  }
};

/**
 * Obtiene la lista de usuarios para el cliente.
 * @param {object} params - Parámetros opcionales de consulta (status, role, search, etc.).
 * @returns {object} Lista de usuarios y datos de paginación.
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/users', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching users'
    );
  }
};

/**
 * Obtiene la información de un usuario específico.
 * @param {string} userId - ID del usuario.
 * @returns {object} Datos del usuario.
 */
export const getUser = async (userId) => {
  try {
    const response = await apiClient.get(`/api/v1/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error fetching user'
    );
  }
};

/**
 * Actualiza los datos de un usuario.
 * @param {string} userId - ID del usuario.
 * @param {object} updates - Datos a actualizar.
 * @returns {object} Usuario actualizado.
 */
export const updateUser = async (userId, updates) => {
  try {
    const response = await apiClient.patch(`/api/v1/users/${userId}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating user'
    );
  }
};

/**
 * Cambia el estado de un usuario (por ejemplo, activar, inactivar o suspender).
 * @param {string} userId - ID del usuario.
 * @param {string} status - Nuevo estado (active, inactive, suspended).
 * @returns {object} Usuario con el estado actualizado.
 */
export const toggleUserStatus = async (userId, status) => {
  try {
    const response = await apiClient.patch(`/api/v1/users/${userId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error toggling user status'
    );
  }
};

/**
 * Actualiza los permisos de un usuario.
 * @param {string} userId - ID del usuario.
 * @param {object} permissions - Permisos a actualizar.
 * @returns {object} Usuario con permisos actualizados.
 */
export const updatePermissions = async (userId, permissions) => {
  try {
    const response = await apiClient.patch(`/api/v1/users/${userId}/permissions`, { permissions });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating user permissions'
    );
  }
};

/**
 * Actualiza las preferencias de un usuario.
 * @param {string} userId - ID del usuario.
 * @param {object} preferences - Preferencias a actualizar.
 * @returns {object} Preferencias actualizadas.
 */
export const updatePreferences = async (userId, preferences) => {
  try {
    const response = await apiClient.patch('/api/v1/users/preferences', { preferences });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error updating user preferences'
    );
  }
};

/**
 * Configura la autenticación multifactor (MFA) para un usuario.
 * @param {string} userId - ID del usuario.
 * @returns {object} Detalles de MFA (secret, recovery keys, etc.).
 */
export const setupMFA = async (userId) => {
  try {
    const response = await apiClient.post('/api/v1/users/mfa/setup', { userId });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error setting up MFA'
    );
  }
};

/**
 * Verifica el token MFA para un usuario.
 * @param {string} userId - ID del usuario.
 * @param {string} token - Token MFA a verificar.
 * @returns {object} Resultado de la verificación.
 */
export const verifyMFA = async (userId, token) => {
  try {
    const response = await apiClient.post('/api/v1/users/mfa/verify', { userId, token });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error verifying MFA'
    );
  }
};
