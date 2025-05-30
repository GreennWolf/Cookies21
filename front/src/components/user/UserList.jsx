import React from 'react';
import PropTypes from 'prop-types';

const UserList = ({ users, onViewDetails, onToggleStatus, isOwner }) => {
  if (!users || users.length === 0) {
    return <p className="text-gray-600">No se encontraron usuarios.</p>;
  }

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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-indigo-100 text-indigo-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Usuario
            </th>
            {isOwner && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rol
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Última Conexión
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              {isOwner && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.clientId ? (user.clientName || 'Cliente ID: ' + user.clientId) : 'N/A'}
                  </div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                  {user.role === 'owner' ? 'Owner' : 
                   user.role === 'admin' ? 'Admin' : 
                   user.role === 'editor' ? 'Editor' : 'Viewer'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                  {user.status === 'active' ? 'Activo' : 
                   user.status === 'inactive' ? 'Inactivo' : 
                   user.status === 'pending' ? 'Pendiente' : 'Suspendido'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.accessControl?.lastLogin ? 
                  new Date(user.accessControl.lastLogin).toLocaleDateString() : 
                  'Nunca'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onViewDetails(user)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Detalles
                </button>
                {/* Ahora permitimos cambiar el estado de owners si el usuario actual es owner */}
                {(isOwner || user.role !== 'owner') && (
                  <button
                    onClick={() => onToggleStatus(user._id, user.status === 'active' ? 'inactive' : 'active')}
                    className={user.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                  >
                    {user.status === 'active' ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

UserList.propTypes = {
  users: PropTypes.array.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  isOwner: PropTypes.bool
};

UserList.defaultProps = {
  isOwner: false
};

export default UserList;