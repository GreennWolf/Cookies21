import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CookieCard = ({ cookie, onViewDetails, onDelete, showDomainInfo = false }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(cookie._id);
    setShowConfirm(false);
  };

  const cancelDelete = () => {
    setShowConfirm(false);
  };

  // Verificar si tenemos información de dominio y cliente
  const hasDomainInfo = cookie.domainId && typeof cookie.domainId === 'object';
  const hasClientInfo = hasDomainInfo && cookie.domainId.clientId && typeof cookie.domainId.clientId === 'object';

  return (
    <div className="bg-white p-4 rounded shadow flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-[#235C88]">{cookie.name}</h3>
        <p className="text-sm text-gray-600">Categoría: {cookie.category}</p>
        {cookie.provider && (
          <p className="text-sm text-gray-600">Proveedor: {cookie.provider}</p>
        )}
        
        {/* Mostrar información de dominio y cliente si está disponible y showDomainInfo es true */}
        {showDomainInfo && hasDomainInfo && (
          <div className="mt-2 py-1 px-2 bg-blue-50 rounded text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Dominio: </span>
              {cookie.domainId.domain}
            </p>
            {hasClientInfo && (
              <p className="text-gray-600 text-xs">
                <span className="font-medium">Cliente: </span>
                {cookie.domainId.clientId.name}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onViewDetails(cookie)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Ver Detalles
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Eliminar
        </button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>
              ¿Estás seguro de que deseas eliminar la cookie <strong>{cookie.name}</strong>?
            </p>
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={confirmDelete}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Sí, eliminar
              </button>
              <button
                onClick={cancelDelete}
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

CookieCard.propTypes = {
  cookie: PropTypes.object.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  showDomainInfo: PropTypes.bool
};

export default CookieCard;
