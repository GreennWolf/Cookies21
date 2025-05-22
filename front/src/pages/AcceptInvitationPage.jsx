// pages/AcceptInvitationPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // Cambiado de react-toastify a react-hot-toast para coincidir con App.jsx
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
// Componente de mensajes de depuración
const DebugInfo = ({ data, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs">
      <h3 className="font-bold text-gray-700 mb-1">Información de Depuración</h3>
      <pre className="overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

const AcceptInvitationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer parámetros de depuración de la URL
  const queryParams = new URLSearchParams(location.search);
  const debugMode = queryParams.get('debug') === 'true';
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    token: token?.substring(0, 8) + '...',
    verificationAttempted: false,
    apiResponses: []
  });

  // Función para verificar el token
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsLoading(true);
        
        // Actualizar info de depuración
        setDebugInfo(prev => ({
          ...prev,
          verificationAttempted: true,
          verificationStart: new Date().toISOString()
        }));
        
        const response = await axios.get(`${API_URL}/api/v1/invitation/${token}`);

        
        // Actualizar datos de invitación
        setInvitationData(response.data.data);
        setError(null);
        
        // Actualizar info de depuración
        setDebugInfo(prev => ({
          ...prev,
          apiResponses: [
            ...prev.apiResponses,
            {
              endpoint: `/api/v1/invitation/${token?.substring(0, 8)}...`,
              timestamp: new Date().toISOString(),
              status: response.status,
              data: response.data
            }
          ]
        }));
        
        // Mostrar notificación de éxito
        toast.success('Invitación verificada correctamente');
      } catch (err) {
        console.error('Error al verificar invitación:', err);
        
        const errorMessage = err.response?.data?.message || 
                          'Error al verificar invitación. Por favor, contacta al administrador.';
        
        setError(errorMessage);
        
        // Actualizar info de depuración
        setDebugInfo(prev => ({
          ...prev,
          apiResponses: [
            ...prev.apiResponses,
            {
              endpoint: `/api/v1/invitation/${token?.substring(0, 8)}...`,
              timestamp: new Date().toISOString(),
              status: err.response?.status || 'unknown',
              error: errorMessage,
              details: err.response?.data || err.message
            }
          ]
        }));
        
        // Mostrar notificación de error
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setError('Token de invitación no proporcionado');
      setIsLoading(false);
    }
  }, [token]);

  // Manejar cambios en los campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validar contraseña
  const validatePassword = (password) => {
    // Al menos 8 caracteres
    if (password.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    
    // Verificar si tiene al menos un número
    if (!/\d/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos un número' };
    }
    
    // Verificar si tiene al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe incluir al menos una letra mayúscula' };
    }
    
    // Si pasa todas las validaciones
    return { valid: true };
  };

  // Validar formulario
  const validateForm = () => {
    // Validar que la contraseña sea segura
    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.message);
      return false;
    }
    
    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return false;
    }
    
    return true;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormSubmitting(true);
      
      // Actualizar info de depuración
      setDebugInfo(prev => ({
        ...prev,
        formSubmission: {
          timestamp: new Date().toISOString(),
          passwordLength: formData.password.length
        }
      }));
      
      const response = await axios.post(`${API_URL}/api/v1/invitation/complete-registration`, {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      // Actualizar info de depuración
      setDebugInfo(prev => ({
        ...prev,
        apiResponses: [
          ...prev.apiResponses,
          {
            endpoint: '/api/v1/invitation/complete-registration',
            timestamp: new Date().toISOString(),
            status: response.status,
            data: response.data
          }
        ]
      }));
      
      toast.success('Registro completado exitosamente');
      
      // Redireccionar al login
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Registro completado. Por favor inicia sesión con tu email y contraseña.' 
          } 
        });
      }, 2000);
    } catch (err) {
      console.error('Error al completar registro:', err);
      
      const errorMessage = err.response?.data?.message || 
                         'Error al completar el registro. Por favor, inténtalo de nuevo.';
      
      // Actualizar info de depuración
      setDebugInfo(prev => ({
        ...prev,
        apiResponses: [
          ...prev.apiResponses,
          {
            endpoint: '/api/v1/invitation/complete-registration',
            timestamp: new Date().toISOString(),
            status: err.response?.status || 'unknown',
            error: errorMessage,
            details: err.response?.data || err.message
          }
        ]
      }));
      
      toast.error(errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Renderizar pantalla de carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando invitación...</p>
          <DebugInfo data={debugInfo} isVisible={debugMode} />
        </div>
      </div>
    );
  }

  // Renderizar error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Error en la invitación</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            
            {/* Opciones de acción */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Ir al inicio de sesión
              </button>
              <button
                onClick={() => {
                  // Intentar recargar la página
                  window.location.reload();
                }}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
              >
                Reintentar
              </button>
            </div>
            
            <DebugInfo data={debugInfo} isVisible={debugMode} />
          </div>
        </div>
      </div>
    );
  }

  // Renderizar formulario
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#235C88]">Completar registro</h2>
          <p className="text-gray-600 mt-2">
            Has sido invitado a unirte a <span className="font-semibold">{invitationData?.invitation?.clientName || 'la plataforma'}</span> como <span className="font-semibold">{
              invitationData?.user?.role === 'admin' ? 'Administrador' :
              invitationData?.user?.role === 'editor' ? 'Editor' : 'Visualizador'
            }</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
              Nombre
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              value={invitationData?.user?.name || ''}
              disabled
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              value={invitationData?.user?.email || ''}
              disabled
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Contraseña (mínimo 8 caracteres)"
              required
            />
            <div className="mt-1 text-xs text-gray-500">
              <p>La contraseña debe tener al menos:</p>
              <ul className="list-disc list-inside pl-2">
                <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>8 caracteres</li>
                <li className={/\d/.test(formData.password) ? 'text-green-600' : ''}>Un número</li>
                <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>Una letra mayúscula</li>
              </ul>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="confirmPassword">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Confirmar contraseña"
              required
            />
            {formData.password && formData.confirmPassword && (
              <div className="mt-1 text-xs">
                {formData.password === formData.confirmPassword ? (
                  <p className="text-green-600">Las contraseñas coinciden</p>
                ) : (
                  <p className="text-red-600">Las contraseñas no coinciden</p>
                )}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Procesando...' : 'Completar registro'}
          </button>
        </form>
        
        <DebugInfo data={debugInfo} isVisible={debugMode} />
      </div>
    </div>
  );
};

export default AcceptInvitationPage;