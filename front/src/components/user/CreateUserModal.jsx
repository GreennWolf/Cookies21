import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from '../../contexts/AuthContext';

const CreateUserModal = ({ 
  onClose, 
  onUserCreated, 
  isOwner,
  selectedClientId,
  clients
}) => {
  // Obtener el usuario actual del contexto de autenticación
  const { user } = useContext(AuthContext);
  
  // Obtener el clientId del usuario si es admin
  const adminClientId = !isOwner && user ? user.clientId : null;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer',
    // Priorizar selectedClientId, luego adminClientId si existe
    clientId: selectedClientId || adminClientId || '',
    sendInvitation: true,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [generateRandomPassword, setGenerateRandomPassword] = useState(false);

  // Actualizar clientId si el selectedClientId cambia
  useEffect(() => {
    if (selectedClientId) {
      setFormData(prev => ({ ...prev, clientId: selectedClientId }));
    } else if (adminClientId && !isOwner) {
      // Si no hay selectedClientId pero hay adminClientId y no es owner
      setFormData(prev => ({ ...prev, clientId: adminClientId }));
    }
  }, [selectedClientId, adminClientId, isOwner]);

  useEffect(() => {
    const handleEsc = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Generar contraseña aleatoria
  useEffect(() => {
    if (generateRandomPassword) {
      const randomPassword = generatePassword(12);
      setFormData(prev => ({
        ...prev,
        password: randomPassword
      }));
      setShowPassword(true); // Mostrar la contraseña automáticamente
      setGenerateRandomPassword(false); // Resetear el trigger
    }
  }, [generateRandomPassword]);

  const generatePassword = (length = 12) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    // Validar role
    if (!formData.role) {
      newErrors.role = 'El rol es obligatorio';
    }
    
    // Validar clientId (solo para owners y para roles que no sean owner)
    if (isOwner && !formData.clientId && formData.role !== 'owner') {
      newErrors.clientId = 'Debe seleccionar un cliente';
    }
    
    // Si no es owner, verificar que tiene clientId
    if (!isOwner && !formData.clientId && !adminClientId) {
      newErrors.clientId = 'No se pudo determinar el cliente';
    }
    
    // Validar contraseña si no se envía invitación
    if (!formData.sendInvitation && !formData.password) {
      newErrors.password = 'La contraseña es obligatoria si no se envía invitación';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Preparar los datos para enviar
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        sendInvitation: formData.sendInvitation,
        // Siempre incluimos un clientId, incluso para owners (cadena vacía)
        clientId: formData.role === 'owner' ? '' : (formData.clientId || selectedClientId || adminClientId || '')
      };
      
      // Si no es owner y no hay clientId válido, mostrar error
      if (formData.role !== 'owner' && !userData.clientId) {
        throw new Error('No se pudo determinar el ID del cliente');
      }
      
      // Agregar contraseña solo si no se enviará invitación
      if (!formData.sendInvitation) {
        userData.password = formData.password;
      }
      
      // Para depuración
      console.log('Enviando datos de usuario:', {
        ...userData,
        password: userData.password ? '[OCULTO]' : undefined,
      });
      
      // Enviar formulario
      await onUserCreated(userData);
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors(prev => ({
        ...prev,
        general: error.message || 'Error al crear el usuario'
      }));
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : clientId;
  };

  // Obtener nombre del cliente para mostrar cuando el usuario es admin
  let clientName = '';
  if (!isOwner && formData.clientId) {
    // Buscar el cliente por ID en la lista de clientes si está disponible
    if (clients && clients.length > 0) {
      clientName = getClientName(formData.clientId);
    } else {
      // Si no tenemos la lista de clientes, usar el clientName del usuario actual si existe
      clientName = user?.clientName || formData.clientId;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Invitar Usuario</h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Rol</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`w-full border p-2 rounded ${errors.role ? 'border-red-500' : ''}`}
                required
              >
                {isOwner && <option value="owner">Owner (Propietario)</option>}
                {isOwner && <option value="admin">Admin (Administrador)</option>}
                <option value="editor">Editor</option>
                <option value="viewer">Viewer (Visualizador)</option>
              </select>
              {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
            </div>
            
            {/* Cliente (solo para owners y para roles que no sean owner) */}
            {isOwner && formData.role !== 'owner' && (
              <div>
                <label className="block font-semibold mb-1">Cliente</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className={`w-full border p-2 rounded ${errors.clientId ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
                
                {formData.clientId && (
                  <p className="text-sm text-gray-600 mt-1">
                    Cliente seleccionado: {getClientName(formData.clientId)}
                  </p>
                )}
              </div>
            )}
            
            {!isOwner && formData.clientId && (
              <div className="bg-gray-100 p-3 rounded text-sm">
                <strong>Cliente:</strong> {clientName}
              </div>
            )}
            
            <div>
              <label className="block font-semibold mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full border p-2 rounded ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Nombre completo"
                required
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full border p-2 rounded ${errors.email ? 'border-red-500' : ''}`}
                placeholder="correo@ejemplo.com"
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                name="sendInvitation"
                id="sendInvitation"
                checked={formData.sendInvitation}
                onChange={handleChange}
                className="mr-2"
              />
              <label htmlFor="sendInvitation" className="text-sm">
                Enviar invitación por email
              </label>
            </div>
            
            {!formData.sendInvitation && (
              <div>
                <label className="block font-semibold mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full border p-2 rounded ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Contraseña segura"
                    required={!formData.sendInvitation}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setGenerateRandomPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Generar contraseña aleatoria
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enviando...' : formData.sendInvitation ? 'Invitar Usuario' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
          
          {formData.sendInvitation && (
            <div className="mt-4 text-sm text-gray-600">
              <p>Se enviará un email con las instrucciones de acceso al usuario.</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

CreateUserModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onUserCreated: PropTypes.func.isRequired,
  isOwner: PropTypes.bool,
  selectedClientId: PropTypes.string,
  clients: PropTypes.array
};

CreateUserModal.defaultProps = {
  isOwner: false,
  selectedClientId: '',
  clients: []
};

export default CreateUserModal;