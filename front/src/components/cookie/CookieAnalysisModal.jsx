/* /src/components/cookie/CookieAnalysisModal.jsx */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getAnalysisStatus } from '../../api/cookieScan';

const CookieAnalysisModal = ({ isOpen, onClose, domainName, analysisId }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending'); // pending, running, completed, error
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && status !== 'running') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, status]);

  // Polling para actualizar el progreso
  useEffect(() => {
    if (!isOpen || !analysisId) return;

    let intervalId = null;
    let isActive = true;

    const pollProgress = async () => {
      if (!isActive) return;
      
      try {
        const response = await getAnalysisStatus(analysisId);
        
        if (response.success && isActive) {
          setProgress(response.data.progress || 0);
          setStatus(response.data.status || 'pending');
          setCurrentStep(response.data.currentStep || '');
          setEstimatedTime(response.data.estimatedTime || null);
          setElapsedTime(response.data.elapsedTime || 0);
          
          if (response.data.status === 'completed') {
            setResults(response.data.results);
            // Stop polling when completed
            isActive = false;
            if (intervalId) clearInterval(intervalId);
          } else if (response.data.status === 'error') {
            setError(response.data.error);
            // Stop polling on error
            isActive = false;
            if (intervalId) clearInterval(intervalId);
          } else if (response.data.status === 'cancelled') {
            setError('Análisis cancelado');
            // Stop polling when cancelled
            isActive = false;
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        setError('Error al obtener el progreso del análisis');
        setStatus('error');
        // Stop polling on error
        isActive = false;
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Polling inicial
    pollProgress();
    
    // Solo iniciar el intervalo si el análisis está activo
    if (status === 'pending' || status === 'running') {
      intervalId = setInterval(() => {
        if (isActive) {
          pollProgress();
        }
      }, 2000);
    }

    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, analysisId]);

  // Formatear tiempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtener el color de la barra de progreso
  const getProgressColor = () => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Iniciando análisis...';
      case 'running':
        return 'Analizando cookies...';
      case 'completed':
        return 'Análisis completado';
      case 'error':
        return 'Error en el análisis';
      default:
        return 'Preparando...';
    }
  };

  // Función para cerrar el modal (siempre disponible)
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const canClose = status === 'completed' || status === 'error';
  const isActive = status === 'pending' || status === 'running';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        {/* Botón de cerrar - siempre disponible */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl transition-colors"
          title={isActive ? "Cerrar ventana (el análisis continuará en segundo plano)" : "Cerrar"}
        >
          &times;
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#235C88] mb-2">
            Análisis de Cookies
          </h2>
          <p className="text-gray-600">
            Dominio: <span className="font-semibold">{domainName}</span>
          </p>
        </div>

        {/* Estado actual */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold">{getStatusText()}</span>
            <span className="text-sm text-gray-500">
              {progress}% completado
            </span>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Step actual */}
        {currentStep && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Paso actual:</span> {currentStep}
            </p>
          </div>
        )}

        {/* Información de tiempo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Tiempo transcurrido</p>
            <p className="text-xl font-bold text-gray-800">
              {formatTime(elapsedTime)}
            </p>
          </div>
          {estimatedTime && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Tiempo estimado restante</p>
              <p className="text-xl font-bold text-gray-800">
                {formatTime(Math.max(0, estimatedTime - elapsedTime))}
              </p>
            </div>
          )}
        </div>

        {/* Indicador de carga animado */}
        {status === 'running' && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Resultados */}
        {status === 'completed' && results && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">
              ✅ Análisis completado exitosamente
            </h3>
            <div className="text-sm text-green-700">
              <p>• Cookies encontradas: <span className="font-semibold">{results.totalCookies || 0}</span></p>
              <p>• Cookies nuevas: <span className="font-semibold">{results.newCookies || 0}</span></p>
              <p>• Cookies actualizadas: <span className="font-semibold">{results.updatedCookies || 0}</span></p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">
              ❌ Error en el análisis
            </h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Nota informativa cuando el análisis está activo */}
        {isActive && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Puedes cerrar esta ventana sin problema.</strong> El análisis continuará ejecutándose en segundo plano y recibirás una notificación cuando termine.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3">
          {status === 'running' && (
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
            >
              Analizando...
            </button>
          )}
          
          {canClose && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
              
              {status === 'completed' && (
                <button
                  onClick={() => {
                    // Aquí se puede agregar lógica para ver los resultados detallados
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Ver Resultados
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

CookieAnalysisModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  domainName: PropTypes.string.isRequired,
  analysisId: PropTypes.string,
};

export default CookieAnalysisModal;