import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const GoogleAnalyticsModal = ({ onClose, onSave, currentConfig }) => {
  // Estado para cada campo que deseamos capturar
  const [measurementId, setMeasurementId] = useState('');
  const [credentials, setCredentials] = useState({
    apiKey: '',
    clientId: '',
    clientSecret: ''
  });
  const [loading, setLoading] = useState(false);

  // Inicializar los valores del formulario si ya hay una configuración existente
  useEffect(() => {
    if (currentConfig && currentConfig.enabled) {
      setMeasurementId(currentConfig.measurementId || '');
      // Las credenciales probablemente no se envían por seguridad, pero si las hay:
      if (currentConfig.config && currentConfig.config.credentials) {
        setCredentials(currentConfig.config.credentials);
      }
    }
  }, [currentConfig]);

  // Cerrar el modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construir el objeto de configuración según lo espera el endpoint
      const configData = {
        measurementId,
        config: {
          credentials
        }
      };
      
      await onSave(configData);
    } catch (error) {
      console.error('Error saving Google Analytics configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">
          {currentConfig && currentConfig.enabled 
            ? 'Editar Configuración de Google Analytics' 
            : 'Configurar Google Analytics'
          }
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Measurement ID</label>
            <input
              type="text"
              value={measurementId}
              onChange={(e) => setMeasurementId(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full border p-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              El ID de medición de tu propiedad de Google Analytics 4, comienza con G-
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Credenciales de API</label>
            <div className="space-y-2">
              <input
                type="text"
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="Client ID"
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Client Secret"
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Las credenciales se obtienen desde la consola de Google Cloud Platform.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

GoogleAnalyticsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentConfig: PropTypes.object
};

export default GoogleAnalyticsModal;