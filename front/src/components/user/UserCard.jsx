import React, { useState } from 'react';
import PropTypes from 'prop-types';

const UserCard = ({ user, onViewDetails, onToggleStatus, isOwner }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusToggle = () => {
    setShowConfirm(true);
  };

  const confirmStatusToggle = () => {
    // Si está activo, lo inactivamos. Si está inactivo, lo activamos.
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(user._id, newStatus);
    setShowConfirm(false);
  };

  const cancelToggle = () => {
    setShowConfirm(false);
  };

  // Verificar si el botón de cambio de estado debe mostrarse
  // Ahora permitimos que un owner pueda cambiar el estado de otro owner
  const showStatusToggle = isOwner || user.role !== 'owner';

  return (
    <div className="bg-white p-4 rounded shadow flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-[#235C88]">{user.name}</h3>
        <p className="text-sm text-gray-600">{user.email}</p>
        <div className="mt-2 flex items-center">
          <span className="text-sm mr-2">Rol:</span>
          <span className="text-sm font-medium">{user.role}</span>
        </div>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(user.status)}`}>
            {user.status === 'active' ? 'Activo' : 
             user.status === 'inactive' ? 'Inactivo' : 
             user.status === 'suspended' ? 'Suspendido' : 'Pendiente'}
          </span>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onViewDetails(user)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Ver Detalles
        </button>
        {showStatusToggle && (
          <button
            onClick={handleStatusToggle}
            className={`px-3 py-1 ${user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
          >
            {user.status === 'active' ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>
              ¿Estás seguro de que deseas {user.status === 'active' ? 'desactivar' : 'activar'} al usuario <strong>{user.name}</strong>?
            </p>
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={confirmStatusToggle}
                className={`px-3 py-1 ${user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
              >
                Sí, {user.status === 'active' ? 'desactivar' : 'activar'}
              </button>
              <button
                onClick={cancelToggle}
                className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UserCard.propTypes = {
  user: PropTypes.object.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  isOwner: PropTypes.bool
};

UserCard.defaultProps = {
  isOwner: false
};

export default UserCard;