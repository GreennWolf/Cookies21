/* /src/components/cookie/CookieList.jsx */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CookieCard from './CookieCard';

const CookieList = ({ 
  cookies, 
  onViewDetails, 
  onDelete, 
  onBulkDelete,
  showDomainInfo = false,
  enableBulkSelection = false 
}) => {
  const [selectedCookies, setSelectedCookies] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  if (!cookies || cookies.length === 0) {
    return <p className="text-gray-600">No se encontraron cookies.</p>;
  }

  const handleSelectCookie = (cookieId) => {
    const newSelected = new Set(selectedCookies);
    if (newSelected.has(cookieId)) {
      newSelected.delete(cookieId);
    } else {
      newSelected.add(cookieId);
    }
    setSelectedCookies(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedCookies.size === cookies.length) {
      setSelectedCookies(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedCookies(new Set(cookies.map(c => c._id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCookies.size === 0) return;
    
    if (onBulkDelete) {
      await onBulkDelete(Array.from(selectedCookies));
    }
    
    setSelectedCookies(new Set());
    setShowBulkActions(false);
  };

  return (
    <div>
      {enableBulkSelection && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCookies.size === cookies.length && cookies.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Seleccionar todas ({cookies.length})
                </span>
              </label>
              
              {selectedCookies.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedCookies.size} cookie{selectedCookies.size !== 1 ? 's' : ''} seleccionada{selectedCookies.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {showBulkActions && (
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Eliminar seleccionadas ({selectedCookies.size})
                </button>
                <button
                  onClick={() => {
                    setSelectedCookies(new Set());
                    setShowBulkActions(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cookies.map((cookie) => (
          <CookieCard
            key={cookie._id}
            cookie={cookie}
            onViewDetails={onViewDetails}
            onDelete={onDelete}
            showDomainInfo={showDomainInfo}
            enableSelection={enableBulkSelection}
            isSelected={selectedCookies.has(cookie._id)}
            onSelect={() => handleSelectCookie(cookie._id)}
          />
        ))}
      </div>
    </div>
  );
};

CookieList.propTypes = {
  cookies: PropTypes.array.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onBulkDelete: PropTypes.func,
  showDomainInfo: PropTypes.bool,
  enableBulkSelection: PropTypes.bool
};

export default CookieList;
