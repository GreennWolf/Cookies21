/* /src/utils/apiClient.js */
import axios from 'axios';

// Determinar la URL base para las API
const getBaseUrl = () => {
  // Usar la variable de entorno si está definida
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // En caso contrario, detectar entorno
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  // En desarrollo, usar localhost:3000 por defecto (puerto del servidor backend)
  if (isDevelopment) {
    return 'http://localhost:3000';
  }
  
  // En producción, usar el mismo origen
  return window.location.origin;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
});

// Interceptor para añadir el token de autenticación a cada solicitud
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si se recibe un error 401 (no autorizado), se puede limpiar el token y redirigir al login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Si se recibe un error 403 con código de suscripción inactiva
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data;
      
      // Verificar si es un error de suscripción inactiva
      if (errorData.code === 'SUBSCRIPTION_INACTIVE' || 
          errorData.error?.code === 'SUBSCRIPTION_INACTIVE' ||
          (errorData.message && errorData.message.includes('suscripción'))) {
        
        // Guardar información del error para mostrar en el dashboard
        localStorage.setItem('subscription_error', JSON.stringify({
          reason: errorData.reason || errorData.error?.reason,
          message: errorData.message,
          timestamp: new Date().toISOString()
        }));
        
        // Disparar evento personalizado para que los componentes puedan reaccionar
        window.dispatchEvent(new CustomEvent('subscription:inactive', {
          detail: {
            reason: errorData.reason || errorData.error?.reason,
            message: errorData.message,
            details: errorData.details || errorData.error?.details
          }
        }));
        
        // No redirigir, permitir que el componente actual maneje el error
        // pero mostrar el mensaje apropiado
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
