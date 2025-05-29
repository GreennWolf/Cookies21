import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../contexts/AuthContext';
import { getUser, updateUser, changePassword } from '../api/user';
import { getClient } from '../api/client';

const AccountSettingsPage = () => {
  // Obtener el contexto de autenticación y navegación
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Estado para controlar el proceso de carga inicial
  const [initializing, setInitializing] = useState(true);
  
  // Estados para la información del usuario
  const [user, setUser] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Estados para el formulario de edición de perfil
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });
  
  // Estados para el formulario de cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Estados para controlar la visibilidad de las contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Verificar el estado de autenticación al iniciar
  useEffect(() => {
    // Verificar si hay contexto de autenticación
    if (!authContext) {
      console.error("No se encontró el contexto de autenticación");
      toast.error("Error de autenticación. Por favor, recarga la página.");
      setInitializing(false);
      return;
    }
    
    // Verificar si el usuario está autenticado
    if (!authContext.isAuthenticated || !authContext.user || !authContext.user.id) {
      console.error("Usuario no autenticado o información de usuario incompleta");
      toast.error("Tu sesión parece haber expirado. Por favor, inicia sesión nuevamente.");
      setInitializing(false);
      
      // Redirigir al login después de un breve retraso
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
      return;
    }
    
    // Si todo está bien, cargar los datos del usuario
    setInitializing(false);
    loadUserData();
  }, [authContext, navigate]);

  // Función para cargar los datos del usuario de forma segura
  const loadUserData = async () => {
    // Salir si no hay contexto de autenticación o usuario
    if (!authContext || !authContext.user || !authContext.user.id) {
      console.error("No se pueden cargar datos del usuario: información de autenticación incompleta");
      return;
    }
    
    const userId = authContext.user.id;
    
    setIsLoading(true);
    
    try {
      // Cargar datos del usuario
      const userResponse = await getUser(userId);
      const userData = userResponse.data.user;
      
      setUser(userData);
      setProfileForm({
        name: userData.name || '',
        email: userData.email || '',
      });
      
      // Si es admin u owner, intentar cargar los detalles del cliente
      if (['admin', 'owner'].includes(userData.role) && userData.clientId) {
        try {
          const clientResponse = await getClient(userData.clientId);
          setClientDetails(clientResponse.data.client);
        } catch (clientError) {
          console.error("Error al cargar detalles del cliente:", clientError);
          // No mostramos toast para no molestar al usuario
        }
      }
    } catch (error) {
      console.error("Error al cargar datos del usuario:", error);
      toast.error("No se pudieron cargar tus datos. Por favor, intenta más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!profileForm.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!profileForm.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      newErrors.email = 'El formato del email es inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }
    
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirme la nueva contraseña';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    // Verificar que tenemos la información necesaria
    if (!authContext || !authContext.user || !authContext.user.id) {
      toast.error("Error de autenticación. Por favor, recarga la página.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userId = authContext.user.id;
      await updateUser(userId, profileForm);
      toast.success('Perfil actualizado exitosamente');
      setIsEditingProfile(false);
      loadUserData(); // Recargar los datos
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast.error(error.message || 'Error al actualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    // Verificar que tenemos la información necesaria
    if (!authContext || !authContext.user || !authContext.user.id) {
      toast.error("Error de autenticación. Por favor, recarga la página.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userId = authContext.user.id;
      
      // Enviar solicitud de cambio de contraseña
      await changePassword({
        userId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      toast.success('Contraseña actualizada exitosamente');
      setIsChangingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      toast.error(error.message || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar estado de inicialización
  if (initializing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Verificando sesión...</p>
      </div>
    );
  }

  // Verificar si hay problemas con la autenticación
  if (!authContext || !authContext.isAuthenticated || !authContext.user || !authContext.user.id) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 p-4 rounded border border-yellow-300 text-yellow-800">
          <h2 className="text-lg font-semibold mb-2">Sesión no válida</h2>
          <p>No se pudo verificar tu sesión. Serás redirigido a la página de inicio de sesión.</p>
        </div>
      </div>
    );
  }

  // Mostrar indicador de carga mientras se obtienen los datos
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verificar si tenemos los datos del usuario
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded border border-red-200 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Error al cargar datos</h2>
          <p>No se pudieron cargar los datos de tu cuenta. Por favor, intenta recargar la página.</p>
          <button 
            onClick={loadUserData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const canViewClientInfo = ['owner', 'admin'].includes(user.role);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#235C88] mb-6">Configuración de Cuenta</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Seguridad
          </button>
          {canViewClientInfo && clientDetails && (
            <button
              onClick={() => setActiveTab('plan')}
              className={`py-2 px-1 font-medium text-sm border-b-2 ${
                activeTab === 'plan'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Plan y Facturación
            </button>
          )}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Perfil Tab */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Información de Perfil</h2>
            
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFormChange}
                    className={`w-full border p-2 rounded ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileFormChange}
                    className={`w-full border p-2 rounded ${errors.email ? 'border-red-500' : ''}`}
                    disabled  // El email no se puede cambiar
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  <p className="text-sm text-gray-500 mt-1">
                    El email no puede ser modificado.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nombre</p>
                    <p className="mt-1">{user.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1">{user.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rol</p>
                    <p className="mt-1">
                      {user.role === 'owner' ? 'Owner (Propietario)' : 
                       user.role === 'admin' ? 'Admin (Administrador)' : 
                       user.role === 'editor' ? 'Editor' : 'Viewer (Visualizador)'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estado</p>
                    <p className="mt-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 
                        user.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Activo' : 
                         user.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                      </span>
                    </p>
                  </div>
                  
                  {user.clientId && user.clientName && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cliente</p>
                      <p className="mt-1">{user.clientName}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Último acceso</p>
                    <p className="mt-1">
                      {user.accessControl?.lastLogin ? 
                        new Date(user.accessControl.lastLogin).toLocaleString() : 
                        'Nunca'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Seguridad Tab */}
        {activeTab === 'security' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Seguridad de la Cuenta</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Cambiar Contraseña</h3>
              
              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña Actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordFormChange}
                        className={`w-full border p-2 rounded ${errors.currentPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordFormChange}
                        className={`w-full border p-2 rounded ${errors.newPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordFormChange}
                        className={`w-full border p-2 rounded ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                  
                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Puedes cambiar tu contraseña en cualquier momento. Te recomendamos usar una contraseña única y segura.
                  </p>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              )}
            </div>
            
            {/* Si se implementa, se puede añadir aquí más opciones como 2FA */}
          </div>
        )}
        
        {/* Plan y Facturación Tab (solo para admin y owner) */}
        {activeTab === 'plan' && canViewClientInfo && clientDetails && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Plan y Facturación</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded border">
                <h3 className="text-lg font-medium mb-2">Plan Actual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nombre del Plan</p>
                    <p className="mt-1 font-semibold">
                      {clientDetails.subscription?.plan === 'basic' ? 'Básico' :
                       clientDetails.subscription?.plan === 'standard' ? 'Estándar' :
                       clientDetails.subscription?.plan === 'premium' ? 'Premium' :
                       clientDetails.subscription?.plan === 'enterprise' ? 'Empresarial' :
                       'No disponible'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estado</p>
                    <p className="mt-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        clientDetails.subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 
                        clientDetails.subscription?.status === 'trial' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {clientDetails.subscription?.status === 'active' ? 'Activo' : 
                         clientDetails.subscription?.status === 'trial' ? 'Periodo de Prueba' : 
                         clientDetails.subscription?.status === 'expired' ? 'Expirado' : 
                         clientDetails.subscription?.status === 'canceled' ? 'Cancelado' : 
                         'No disponible'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsPage;