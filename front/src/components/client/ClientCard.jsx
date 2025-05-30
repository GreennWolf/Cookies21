import React, { useState } from 'react';
import PropTypes from 'prop-types';

const ClientCard = ({ client, onViewDetails, onToggleStatus }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusToggle = () => {
    setShowConfirm(true);
  };

  const confirmStatusToggle = () => {
    // Si está activo, lo inactivamos. Si está inactivo, lo activamos.
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(client._id, newStatus);
    setShowConfirm(false);
  };

  const cancelToggle = () => {
    setShowConfirm(false);
  };

  return (
    <div className="bg-white p-4 rounded shadow flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-[#235C88]">{client.name}</h3>
        <p className="text-sm text-gray-600">{client.contactEmail}</p>
        
        {/* Añadimos información fiscal si está disponible */}
        {client.fiscalInfo && (client.fiscalInfo.cif || client.fiscalInfo.razonSocial) && (
          <div className="mt-1 text-xs text-gray-500">
            {client.fiscalInfo.cif && (
              <p><span className="font-medium">CIF:</span> {client.fiscalInfo.cif}</p>
            )}
            {client.fiscalInfo.razonSocial && (
              <p><span className="font-medium">Razón Social:</span> {client.fiscalInfo.razonSocial}</p>
            )}
          </div>
        )}
        
        <div className="mt-2 flex items-center">
          <span className="text-sm mr-2">Plan:</span>
          <span className="text-sm font-medium capitalize">{client.subscription?.plan || 'N/A'}</span>
        </div>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(client.status)}`}>
            {client.status === 'active' ? 'Activo' : 
             client.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
          </span>
        </div>
        <div className="mt-2">
          <span className="text-sm">Usuarios: {client.subscription?.currentUsers || 0}/{client.subscription?.maxUsers || 0}</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onViewDetails(client)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Ver Detalles
        </button>
        <button
          onClick={handleStatusToggle}
          className={`px-3 py-1 ${client.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
        >
          {client.status === 'active' ? 'Desactivar' : 'Activar'}
        </button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>
              ¿Estás seguro de que deseas {client.status === 'active' ? 'desactivar' : 'activar'} al cliente <strong>{client.name}</strong>?
            </p>
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={confirmStatusToggle}
                className={`px-3 py-1 ${client.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
              >
                Sí, {client.status === 'active' ? 'desactivar' : 'activar'}
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

ClientCard.propTypes = {
  client: PropTypes.object.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
};

export default ClientCard;