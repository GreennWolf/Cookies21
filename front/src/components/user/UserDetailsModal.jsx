import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const UserDetailsModal = ({ 
  user, 
  onClose, 
  onToggleStatus, 
  onUpdateUser,
  onUpdatePermissions,
  isOwner
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'viewer',
    email: user.email || '',
    // Incluir más campos según sea necesario
  });

  const [permissions, setPermissions] = useState(
    user.customPermissions?.permissions || []
  );

  useEffect(() => {
    const handleEsc = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPermission = (resource, action) => {
    // Si ya existe el recurso, agregamos la acción
    const existingResourceIndex = permissions.findIndex(p => p.resource === resource);
    
    if (existingResourceIndex !== -1) {
      // Verificar si la acción ya existe
      if (permissions[existingResourceIndex].actions.includes(action)) {
        return;
      }
      
      // Crear una nueva copia del array de permisos
      const newPermissions = [...permissions];
      newPermissions[existingResourceIndex] = {
        ...newPermissions[existingResourceIndex],
        actions: [...newPermissions[existingResourceIndex].actions, action]
      };
      
      setPermissions(newPermissions);
    } else {
      // Si el recurso no existe, lo creamos con la acción
      setPermissions([
        ...permissions,
        {
          resource,
          actions: [action]
        }
      ]);
    }
  };

  const handleRemovePermission = (resource, action) => {
    const existingResourceIndex = permissions.findIndex(p => p.resource === resource);
    
    if (existingResourceIndex !== -1) {
      const newPermissions = [...permissions];
      const newActions = newPermissions[existingResourceIndex].actions.filter(a => a !== action);
      
      if (newActions.length === 0) {
        // Si no quedan acciones, eliminamos el recurso
        newPermissions.splice(existingResourceIndex, 1);
      } else {
        newPermissions[existingResourceIndex] = {
          ...newPermissions[existingResourceIndex],
          actions: newActions
        };
      }
      
      setPermissions(newPermissions);
    }
  };

  const hasPermission = (resource, action) => {
    const resourcePermission = permissions.find(p => p.resource === resource);
    return resourcePermission && resourcePermission.actions.includes(action);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateUser(user._id, formData);
    setIsEditing(false);
  };

  const handleSubmitPermissions = (e) => {
    e.preventDefault();
    onUpdatePermissions(user._id, permissions);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Definición de los recursos y acciones disponibles
  const availablePermissions = {
    users: ['create', 'read', 'update', 'delete'],
    subscription: ['read', 'update'],
    apiKeys: ['create', 'read', 'revoke'],
    domains: ['create', 'read', 'update', 'delete'],
    banner: ['create', 'read', 'update', 'delete'],
    cookies: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    settings: ['read', 'update']
  };

  // Traducción de los nombres de recursos
  const resourceTranslations = {
    users: 'Usuarios',
    subscription: 'Suscripción',
    apiKeys: 'Claves API',
    domains: 'Dominios',
    banner: 'Banner',
    cookies: 'Cookies',
    analytics: 'Analíticas',
    settings: 'Configuración'
  };

  // Traducción de acciones
  const actionTranslations = {
    create: 'Crear',
    read: 'Ver',
    update: 'Modificar',
    delete: 'Eliminar',
    revoke: 'Revocar'
  };

  if (!user) return null;

  // Determinar si el usuario actual puede editar este usuario
  // Ahora un owner puede editar a otro owner
  const canEdit = isOwner || user.role !== 'owner';
  
  // Los owners pueden editar el rol de cualquier usuario, incluyendo otros owners
  // Para usuarios no-owner, solo pueden editar roles inferiores (no owner ni admin)
  const canEditRole = isOwner || (user.role !== 'owner' && user.role !== 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
          &#10005;
        </button>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[#181818]">Detalles del Usuario</h2>
          
          <div className="border-b border-gray-200 mt-4">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={user.role === 'owner'} // Los owners tienen todos los permisos
              >
                Permisos
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'general' && (
          <>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-semibold">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    El email no se puede modificar.
                  </p>
                </div>
                
                {canEditRole && (
                  <div>
                    <label className="block font-semibold">Rol</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    >
                      {isOwner && <option value="owner">Owner (Propietario)</option>}
                      {isOwner && <option value="admin">Admin (Administrador)</option>}
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer (Visualizador)</option>
                    </select>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Nombre:</span> {user.name}
                  </div>
                  <div>
                    <span className="font-semibold">Email:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-semibold">Rol:</span> {
                      user.role === 'owner' ? 'Owner (Propietario)' :
                      user.role === 'admin' ? 'Admin (Administrador)' :
                      user.role === 'editor' ? 'Editor' : 'Viewer (Visualizador)'
                    }
                  </div>
                  <div>
                    <span className="font-semibold">Estado:</span> 
                    <span className={`ml-2 inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(user.status)}`}>
                      {user.status === 'active' ? 'Activo' : 
                       user.status === 'inactive' ? 'Inactivo' : 
                       user.status === 'pending' ? 'Pendiente' : 'Suspendido'}
                    </span>
                  </div>
                  {user.clientId && (
                    <div>
                      <span className="font-semibold">Cliente:</span> {user.clientName || 'N/A'}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Último acceso:</span> {
                      user.accessControl?.lastLogin ? 
                      new Date(user.accessControl.lastLogin).toLocaleString() : 'Nunca'
                    }
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de registro:</span> {
                      user.createdAt ? 
                      new Date(user.createdAt).toLocaleDateString() : 'N/A'
                    }
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Editar
                      </button>
                      {/* Solo permitir cambiar estado si el usuario actual es owner o el usuario a editar no es owner */}
                      {(isOwner || user.role !== 'owner') && (
                        <button
                          onClick={() => onToggleStatus(user._id, user.status === 'active' ? 'inactive' : 'active')}
                          className={`px-4 py-2 ${user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
                        >
                          {user.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'permissions' && user.role !== 'owner' && (
          <form onSubmit={handleSubmitPermissions} className="space-y-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Establece permisos personalizados para este usuario. Por defecto, se utilizarán los permisos de su rol ({user.role}).
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(availablePermissions).map(([resource, actions]) => (
                <div key={resource} className="bg-gray-50 p-4 rounded border">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {resourceTranslations[resource] || resource}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                    {actions.map(action => (
                      <label key={`${resource}-${action}`} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={hasPermission(resource, action)}
                          onChange={e => {
                            if (e.target.checked) {
                              handleAddPermission(resource, action);
                            } else {
                              handleRemovePermission(resource, action);
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">
                          {actionTranslations[action] || action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Guardar Permisos
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

UserDetailsModal.propTypes = {
  user: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  onUpdateUser: PropTypes.func.isRequired,
  onUpdatePermissions: PropTypes.func.isRequired,
  isOwner: PropTypes.bool
};

UserDetailsModal.defaultProps = {
  isOwner: false
};

export default UserDetailsModal;