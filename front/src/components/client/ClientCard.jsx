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
    <div className={`bg-white p-4 rounded shadow flex flex-col justify-between relative ${client.hasPendingRenewal ? 'ring-2 ring-yellow-400' : ''}`}>
      {/* Indicador de renovación pendiente */}
      {client.hasPendingRenewal && (
        <div className="absolute top-2 right-2">
          <div className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Renovación pendiente
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-bold text-[#235C88] truncate pr-2" title={client.name}>
          {client.name}
        </h3>
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
        
        {/* Estado del cliente */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(client.status)}`}>
            {client.status === 'active' ? 'Activo' : 
             client.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
          </span>
          
          {/* Estado de suscripción */}
          {client.subscriptionActive !== undefined && (
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              client.subscriptionActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {client.subscriptionActive ? 'Suscripción activa' : 'Suscripción inactiva'}
            </span>
          )}
        </div>
        
        {/* Información de renovación pendiente */}
        {client.hasPendingRenewal && client.pendingRenewalInfo && (
          <div className="mt-2 text-xs bg-yellow-50 p-2 rounded">
            <p className="font-medium text-yellow-800">
              Tipo: {client.pendingRenewalInfo.requestType === 'renewal' ? 'Renovación' : 
                     client.pendingRenewalInfo.requestType === 'reactivation' ? 'Reactivación' : 
                     client.pendingRenewalInfo.requestType === 'support' ? 'Soporte' : 'Actualización'}
            </p>
            <p className="text-yellow-700">
              Urgencia: {client.pendingRenewalInfo.urgency === 'high' ? 'Alta' : 
                        client.pendingRenewalInfo.urgency === 'medium' ? 'Media' : 'Baja'}
            </p>
          </div>
        )}
        
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
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