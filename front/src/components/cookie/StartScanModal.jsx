/* /src/components/cookie/StartScanModal.jsx */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { startScan } from '../../api/cookieScan';

const StartScanModal = ({ domain, onClose, onScanStarted }) => {
  const [scanConfig, setScanConfig] = useState({
    scanType: 'full',
    priority: 'normal',
    includeSubdomains: true,
    maxUrls: 100,
    depth: 5 // Siempre depth 5 después de la configuración inicial
  });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleStartScan = async () => {
    setIsStarting(true);
    setError(null);
    
    try {
      // Estructura de datos que espera el servidor
      const scanData = {
        scanType: scanConfig.scanType,
        priority: scanConfig.priority,
        config: {
          includeSubdomains: scanConfig.includeSubdomains,
          maxUrls: scanConfig.maxUrls,
          depth: scanConfig.depth
        }
      };
      
      const response = await startScan(domain._id, scanData);
      
      if (onScanStarted) {
        onScanStarted(response.data?.scan || response.scan);
      }
      
      onClose();
    } catch (err) {
      console.error('Error starting scan:', err);
      setError(err.message || 'Error al iniciar el escaneo');
    } finally {
      setIsStarting(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setScanConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl"
        >
          &times;
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-[#235C88]">
          Escaneo de Cookies - {domain?.domain}
        </h2>
        
        <div className="space-y-6">
          {/* Tipo de escaneo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Escaneo
            </label>
            <select
              value={scanConfig.scanType}
              onChange={(e) => handleConfigChange('scanType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88]"
            >
              <option value="quick">Rápido (10 páginas)</option>
              <option value="full">Completo (100 páginas)</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Opción de subdominios */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={scanConfig.includeSubdomains}
                onChange={(e) => handleConfigChange('includeSubdomains', e.target.checked)}
                className="h-4 w-4 text-[#235C88] focus:ring-[#235C88] border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Analizar subdominios
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              Incluir subdominios como www.ejemplo.com, blog.ejemplo.com, etc.
            </p>
          </div>

          {/* Máximo de URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo de páginas a analizar
            </label>
            <input
              type="number"
              min="10"
              max="500"
              value={scanConfig.maxUrls}
              onChange={(e) => handleConfigChange('maxUrls', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88]"
            />
          </div>

          {/* Profundidad fija */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profundidad de análisis
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
              Nivel 5 (Óptimo para análisis completo)
            </div>
            <p className="text-xs text-gray-500 mt-1">
              La profundidad está optimizada automáticamente para obtener los mejores resultados.
            </p>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad del escaneo
            </label>
            <select
              value={scanConfig.priority}
              onChange={(e) => handleConfigChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88]"
            >
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isStarting}
            >
              Cancelar
            </button>
            <button
              onClick={handleStartScan}
              disabled={isStarting}
              className="px-6 py-2 bg-[#235C88] text-white rounded-md hover:bg-[#1a4666] focus:outline-none focus:ring-2 focus:ring-[#235C88] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Iniciando...</span>
                </>
              ) : (
                <span>Iniciar Escaneo</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

StartScanModal.propTypes = {
  domain: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onScanStarted: PropTypes.func
};

export default StartScanModal;