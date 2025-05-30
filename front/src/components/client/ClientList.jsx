import React from 'react';
import PropTypes from 'prop-types';
import ClientCard from './ClientCard';

const ClientList = ({ clients, onViewDetails, onToggleStatus }) => {
  if (!clients || clients.length === 0) {
    return <p className="text-gray-600">No se encontraron clientes.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard
          key={client._id}
          client={client}
          onViewDetails={onViewDetails}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
};

ClientList.propTypes = {
  clients: PropTypes.array.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
};

export default ClientList;