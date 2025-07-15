import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { startAdvancedAnalysis } from '../../api/cookieScan';
import { toast } from 'react-hot-toast';

const AdvancedAnalysisModal = ({ domain, onClose, onAnalysisStarted }) => {
  const [config, setConfig] = useState({
    scanType: 'full',
    includeSubdomains: true,
    maxUrls: 100,
    depth: 5,
    timeout: 30000,
    priority: 'normal'
  });
  
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const [estimatedDuration, setEstimatedDuration] = useState(null);

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Calcular duración estimada
  useEffect(() => {
    const baseTime = 30;
    const urlFactor = Math.min(config.maxUrls, 100) * 0.5;
    const depthFactor = config.depth * 5;
    const subdomainFactor = config.includeSubdomains ? 30 : 0;
    
    const estimated = Math.round(baseTime + urlFactor + depthFactor + subdomainFactor);
    setEstimatedDuration(estimated);
  }, [config]);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartAnalysis = async () => {
    setIsStarting(true);
    setError(null);
    
    try {
      const response = await startAdvancedAnalysis(domain._id, config);
      
      toast.success('Análisis avanzado iniciado correctamente');
      
      if (onAnalysisStarted) {
        onAnalysisStarted(response.data);
      }
      
      onClose();
    } catch (err) {
      console.error('Error starting advanced analysis:', err);
      setError(err.message);
      toast.error('Error al iniciar el análisis avanzado');
    } finally {
      setIsStarting(false);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes} minutos`;
  };

  const getScanTypeDescription = (type) => {
    const descriptions = {
      quick: 'Análisis rápido de las páginas principales (hasta 25 URLs)',
      full: 'Análisis completo del sitio web (hasta 100 URLs)',
      deep: 'Análisis profundo y exhaustivo (hasta 200 URLs)',
      custom: 'Configuración personalizada'
    };
    return descriptions[type] || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-[#235C88]">
          Análisis Avanzado de Cookies - {domain?.domain}
        </h2>
        
        <div className="space-y-6">
          {/* Descripción del análisis avanzado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">
              🚀 Análisis Avanzado con IA
            </h3>
            <p className="text-blue-700 text-sm">
              Nuestro sistema de análisis avanzado utiliza tecnología de última generación para:
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li>• Detectar cookies, scripts y tecnologías en profundidad</li>
              <li>• Analizar cumplimiento GDPR y CCPA automáticamente</li>
              <li>• Identificar proveedores y categorizar cookies inteligentemente</li>
              <li>• Evaluar riesgos de privacidad y seguridad</li>
              <li>• Generar recomendaciones personalizadas</li>
            </ul>
          </div>

          {/* Tipo de escaneo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Análisis
            </label>
            <div className="space-y-3">
              {['quick', 'full', 'deep', 'custom'].map((type) => (
                <label key={type} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="scanType"
                    value={type}
                    checked={config.scanType === type}
                    onChange={(e) => handleConfigChange('scanType', e.target.value)}
                    className="mt-1 h-4 w-4 text-[#235C88] focus:ring-[#235C88] border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type === 'quick' && 'Rápido'}
                      {type === 'full' && 'Completo'}
                      {type === 'deep' && 'Profundo'}
                      {type === 'custom' && 'Personalizado'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {getScanTypeDescription(type)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración avanzada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subdominios */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.includeSubdomains}
                  onChange={(e) => handleConfigChange('includeSubdomains', e.target.checked)}
                  className="h-4 w-4 text-[#235C88] focus:ring-[#235C88] border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Incluir subdominios
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                Analizar subdominios como www, blog, shop, etc.
              </p>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad del análisis
              </label>
              <select
                value={config.priority}
                onChange={(e) => handleConfigChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88]"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          {/* Configuración detallada para tipo custom */}
          {config.scanType === 'custom' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-700">Configuración Personalizada</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Máximo de URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de páginas ({config.maxUrls})
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={config.maxUrls}
                    onChange={(e) => handleConfigChange('maxUrls', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>

                {/* Profundidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profundidad de análisis ({config.depth})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.depth}
                    onChange={(e) => handleConfigChange('depth', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Timeout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout por página (segundos)
                </label>
                <select
                  value={config.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88]"
                >
                  <option value={15000}>15 segundos</option>
                  <option value={30000}>30 segundos</option>
                  <option value={60000}>60 segundos</option>
                  <option value={120000}>120 segundos</option>
                </select>
              </div>
            </div>
          )}

          {/* Estimación de tiempo */}
          {estimatedDuration && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Duración estimada: {formatDuration(estimatedDuration)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                El tiempo real puede variar según la velocidad del sitio web y la carga del servidor
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isStarting}
            >
              Cancelar
            </button>
            <button
              onClick={handleStartAnalysis}
              disabled={isStarting}
              className="px-6 py-2 bg-[#235C88] text-white rounded-md hover:bg-[#1a4666] focus:outline-none focus:ring-2 focus:ring-[#235C88] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Iniciar Análisis Avanzado</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

AdvancedAnalysisModal.propTypes = {
  domain: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onAnalysisStarted: PropTypes.func
};

export default AdvancedAnalysisModal;