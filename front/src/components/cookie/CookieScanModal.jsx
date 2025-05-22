/* /src/components/cookie/CookieScanModal.jsx */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const CookieScanModal = ({ scanResults, onClose }) => {
  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#235C88]">Resultados del Escaneo de Cookies</h2>
        {scanResults ? (
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {/* Se puede ajustar la forma de renderizar según la estructura de scanResults */}
            <pre>{JSON.stringify(scanResults, null, 2)}</pre>
          </div>
        ) : (
          <p>No se encontraron resultados del escaneo.</p>
        )}
      </div>
    </div>
  );
};

CookieScanModal.propTypes = {
  scanResults: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default CookieScanModal;
