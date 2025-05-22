import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const IABModal = ({ onClose, onSave, currentConfig }) => {
  // Estado para cada campo que deseamos capturar
  const [cmpId, setCmpId] = useState('');
  const [config, setConfig] = useState({
    cmpVersion: 1,
    tcfVersion: 2,
    vendorIds: [],
    purposeIds: [],
    defaultLanguage: 'es',
    useTcf: true
  });
  const [loading, setLoading] = useState(false);

  // Inicializar los valores del formulario si ya hay una configuración existente
  useEffect(() => {
    if (currentConfig && currentConfig.enabled) {
      setCmpId(currentConfig.cmpId || '');
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

  // Manejar la entrada de listas separadas por comas
  const handleVendorIdsChange = (e) => {
    const value = e.target.value;
    // Convertir string a array de números
    const vendorIds = value
      .split(',')
      .map(id => id.trim())
      .filter(id => id)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
    
    setConfig({ ...config, vendorIds });
  };

  const handlePurposeIdsChange = (e) => {
    const value = e.target.value;
    // Convertir string a array de números
    const purposeIds = value
      .split(',')
      .map(id => id.trim())
      .filter(id => id)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
    
    setConfig({ ...config, purposeIds });
  };

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construir el objeto de configuración según lo espera el endpoint
      const configData = {
        cmpId,
        config
      };
      
      await onSave(configData);
    } catch (error) {
      console.error('Error saving IAB configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">
          {currentConfig && currentConfig.enabled 
            ? 'Editar Configuración IAB' 
            : 'Configurar IAB CMP'
          }
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">CMP ID</label>
            <input
              type="text"
              value={cmpId}
              onChange={(e) => setCmpId(e.target.value)}
              placeholder="ID del CMP registrado en IAB"
              className="w-full border p-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ID único asignado por IAB Europe para tu Consent Management Platform
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Versión del CMP</label>
            <input
              type="number"
              value={config.cmpVersion}
              onChange={(e) => setConfig({ ...config, cmpVersion: parseInt(e.target.value, 10) || 1 })}
              min="1"
              className="w-full border p-2 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Versión de TCF</label>
            <select
              value={config.tcfVersion}
              onChange={(e) => setConfig({ ...config, tcfVersion: parseInt(e.target.value, 10) })}
              className="w-full border p-2 rounded"
              required
            >
              <option value="1">TCF v1</option>
              <option value="2">TCF v2</option>
            </select>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">IDs de Vendors (separados por comas)</label>
            <textarea
              value={config.vendorIds.join(', ')}
              onChange={handleVendorIdsChange}
              placeholder="1, 2, 3, 4"
              className="w-full border p-2 rounded h-20"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lista de IDs de vendors registrados en la Global Vendor List de IAB
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">IDs de Propósitos (separados por comas)</label>
            <textarea
              value={config.purposeIds.join(', ')}
              onChange={handlePurposeIdsChange}
              placeholder="1, 2, 3, 4"
              className="w-full border p-2 rounded h-20"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lista de IDs de propósitos según la especificación IAB TCF
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Idioma predeterminado</label>
            <select
              value={config.defaultLanguage}
              onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="fr">Francés</option>
              <option value="de">Alemán</option>
              <option value="it">Italiano</option>
              <option value="pt">Portugués</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useTcf"
              checked={config.useTcf}
              onChange={(e) => setConfig({ ...config, useTcf: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="useTcf">
              Usar Transparency & Consent Framework
            </label>
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

IABModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentConfig: PropTypes.object
};

export default IABModal;