/* /src/components/cookie/EstimatedTimeModal.jsx */
import React from 'react';
import PropTypes from 'prop-types';

const EstimatedTimeModal = ({ isOpen, onClose, onConfirm, config }) => {
  if (!isOpen) return null;

  const estimateTime = () => {
    const { maxUrls = 100, depth = 3 } = config || {};
    const baseTimePerUrl = 7; // segundos por URL (basado en los logs)
    const estimatedSeconds = maxUrls * baseTimePerUrl;
    const minutes = Math.ceil(estimatedSeconds / 60);
    
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hora${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `y ${remainingMinutes} minutos` : ''}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-[#235C88]">Análisis Completo de Cookies</h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            El análisis completo escaneará el dominio para detectar todas las cookies, 
            scripts de terceros y rastreadores.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Configuración del escaneo:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• URLs a escanear: hasta {config?.maxUrls || 100}</li>
              <li>• Profundidad: {config?.depth || 3} niveles</li>
              <li>• Incluir subdominios: {config?.includeSubdomains ? 'Sí' : 'No'}</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-amber-800">Tiempo estimado:</p>
                <p className="text-amber-700">Aproximadamente {estimateTime()}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            El escaneo se ejecutará en segundo plano. Puedes continuar trabajando 
            mientras se completa el análisis.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#235C88] text-white rounded-md hover:bg-[#1a4a6b] transition"
          >
            Iniciar Análisis
          </button>
        </div>
      </div>
    </div>
  );
};

EstimatedTimeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  config: PropTypes.shape({
    maxUrls: PropTypes.number,
    depth: PropTypes.number,
    includeSubdomains: PropTypes.bool
  })
};

export default EstimatedTimeModal;