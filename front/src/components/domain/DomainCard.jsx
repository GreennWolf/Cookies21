/* /src/components/domain/DomainCard.jsx */
import React from 'react';
import PropTypes from 'prop-types';

const DomainCard = ({ domain, onViewDetails, onDelete }) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold text-[#235C88] mb-2">{domain.domain}</h2>
      <p className="text-gray-600 mb-2">Estado: {domain.status}</p>
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
