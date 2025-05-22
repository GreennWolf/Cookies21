/* /src/api/user.js - Versión actualizada */
import apiClient from '../utils/apiClient';

/**
 * Crea un nuevo usuario.
 * Si es owner, puede crear usuarios para cualquier cliente.
 * Si es admin, solo puede crear usuarios para su propio cliente.
 * @param {object} userData - Datos del usuario a crear
 * @returns {object} Datos del usuario creado
 */
export const createUser = async (userData) => {
  try {
    // Si el rol es owner, necesitamos manejar clientId de forma diferente
    const dataToSend = { ...userData };
    
    // Para usuarios owner, forzamos clientId como cadena vacía para evitar errores de validación
    if (dataToSend.role === 'owner' && !dataToSend.clientId) {
      dataToSend.clientId = ''; // Enviar cadena vacía en lugar de omitir o null
    }
    
    console.log('Datos enviados al API:', { 
      ...dataToSend, 
      password: dataToSend.password ? '[OCULTO]' : undefined 
    });
    
    const response = await apiClient.post('/api/v1/users', dataToSend);
    return response.data;
  } catch (error) {
    console.error('Error en createUser:', error.response?.data || error);
    throw new Error(
      error.response?.data?.message || 'Error al crear usuario'
    );
  }
};

/**
 * Obtiene la lista de usuarios.
 * Si es owner, puede filtrar por clientId para ver usuarios de cualquier cliente.
 * Si es admin, solo ve usuarios de su propio cliente.
 * @param {object} params - Parámetros opcionales (status, role, search, clientId, etc.).
 * @returns {object} Lista de usuarios y datos de paginación.
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/users', { params });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al obtener usuarios'
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
      error.response?.data?.message || 'Error al obtener usuario'
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
      error.response?.data?.message || 'Error al actualizar usuario'
    );
  }
};

/**
 * Cambia el estado de un usuario (activar, inactivar o suspender).
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
      error.response?.data?.message || 'Error al cambiar el estado del usuario'
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
      error.response?.data?.message || 'Error al actualizar permisos'
    );
  }
};

/**
 * Actualiza las preferencias de un usuario.
 * @param {object} preferences - Preferencias a actualizar.
 * @returns {object} Preferencias actualizadas.
 */
export const updatePreferences = async (preferences) => {
  try {
    const response = await apiClient.patch('/api/v1/users/preferences', { preferences });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al actualizar preferencias'
    );
  }
};

/**
 * Configura la autenticación multifactor (MFA) para un usuario.
 * @returns {object} Detalles de MFA (secret, recovery keys, etc.).
 */
export const setupMFA = async () => {
  try {
    const response = await apiClient.post('/api/v1/users/mfa/setup');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al configurar MFA'
    );
  }
};

/**
 * Verifica el token MFA para un usuario.
 * @param {string} token - Token MFA a verificar.
 * @returns {object} Resultado de la verificación.
 */
export const verifyMFA = async (token) => {
  try {
    const response = await apiClient.post('/api/v1/users/mfa/verify', { token });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al verificar MFA'
    );
  }
};

/**
 * Cambia la contraseña del usuario.
 * @param {object} data - Datos para el cambio de contraseña
 * @param {string} data.userId - ID del usuario
 * @param {string} data.currentPassword - Contraseña actual
 * @param {string} data.newPassword - Nueva contraseña
 * @returns {object} Resultado de la operación
 */
export const changePassword = async (data) => {
  try {
    const response = await apiClient.post('/api/v1/users/change-password', data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Error al cambiar la contraseña'
    );
  }
};