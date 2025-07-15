import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const GTMModal = ({ onClose, onSave, currentConfig }) => {
  // Estado para cada campo que deseamos capturar
  const [containerId, setContainerId] = useState('');
  const [config, setConfig] = useState({
    dataLayerName: 'dataLayer',
    enableEnhancedEcommerce: false,
    enableConsentMode: false
  });
  const [loading, setLoading] = useState(false);

  // Inicializar los valores del formulario si ya hay una configuración existente
  useEffect(() => {
    if (currentConfig && currentConfig.enabled) {
      setContainerId(currentConfig.containerId || '');
      if (currentConfig.config) {
        setConfig({
          ...config,
          ...currentConfig.config
        });
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
        containerId,
        config
      };
      
      await onSave(configData);
    } catch (error) {
      console.error('Error saving GTM configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">
          {currentConfig && currentConfig.enabled 
            ? 'Editar Configuración de Google Tag Manager' 
            : 'Configurar Google Tag Manager'
          }
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Container ID</label>
            <input
              type="text"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              placeholder="GTM-XXXXXX"
              className="w-full border p-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              El ID del contenedor de Google Tag Manager, normalmente comienza con GTM-
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Configuración Avanzada</label>
            <div className="space-y-2">
              <div>
                <label className="block text-sm mb-1">Nombre de la Capa de Datos</label>
                <input
                  type="text"
                  value={config.dataLayerName}
                  onChange={(e) => setConfig({ ...config, dataLayerName: e.target.value })}
                  placeholder="dataLayer"
                  className="w-full border p-2 rounded"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enhancedEcommerce"
                  checked={config.enableEnhancedEcommerce}
                  onChange={(e) => setConfig({ ...config, enableEnhancedEcommerce: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enhancedEcommerce" className="text-sm">
                  Habilitar Enhanced Ecommerce
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="consentMode"
                  checked={config.enableConsentMode}
                  onChange={(e) => setConfig({ ...config, enableConsentMode: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="consentMode" className="text-sm">
                  Habilitar Consent Mode
                </label>
              </div>
            </div>
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

GTMModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentConfig: PropTypes.object
};

export default GTMModal;