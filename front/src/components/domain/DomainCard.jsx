/* /src/components/domain/DomainCard.jsx */
import React from 'react';
import PropTypes from 'prop-types';

const DomainCard = ({ domain, onViewDetails, onDelete }) => {
  // Verificar si tenemos información del cliente (solo para usuarios owner)
  const hasClientInfo = domain.clientId && typeof domain.clientId === 'object';

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold text-[#235C88] mb-2">{domain.domain}</h2>
      <p className="text-gray-600 mb-2">Estado: {domain.status}</p>
      
      {/* Mostrar información del cliente si está disponible (para usuarios owner) */}
      {hasClientInfo && (
        <div className="mb-2 py-1 px-2 bg-blue-50 rounded text-sm">
          <p className="text-gray-700">
            <span className="font-medium">Cliente: </span>
            {domain.clientId.name}
          </p>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={() => onViewDetails(domain)}
          className="px-3 py-1 bg-[#235C88] text-white rounded hover:bg-[#1e4a6b] transition"
        >
          Ver Detalles
        </button>
        <button
          onClick={() => onDelete(domain._id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

DomainCard.propTypes = {
  domain: PropTypes.object.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default DomainCard;
