import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getAnalysisStatus, cancelAnalysis } from '../../api/cookieScan';
import { toast } from 'react-hot-toast';
import ScanLogsConsole from '../debug/ScanLogsConsole';

const AdvancedAnalysisProgressModal = ({ analysisId, onClose, onAnalysisCompleted, onAnalysisCancelled }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showLogsConsole, setShowLogsConsole] = useState(false);

  // Actualizar estado cada 2 segundos
  useEffect(() => {
    let interval;
    
    const fetchStatus = async () => {
      try {
        const response = await getAnalysisStatus(analysisId);
        const analysisData = response.data;
        
        setAnalysis(analysisData);
        setIsLoading(false);
        
        // Calcular tiempo transcurrido
        if (analysisData.progress?.startTime) {
          const start = new Date(analysisData.progress.startTime);
          const now = new Date();
          const elapsed = Math.floor((now - start) / 1000);
          setElapsedTime(elapsed);
        }
        
        // Si el análisis se completó o falló
        if (['completed', 'failed', 'cancelled'].includes(analysisData.status)) {
          if (analysisData.status === 'completed' && onAnalysisCompleted) {
            onAnalysisCompleted(analysisData);
          } else if (analysisData.status === 'cancelled' && onAnalysisCancelled) {
            onAnalysisCancelled(analysisData);
          }
          
          clearInterval(interval);
        }
        
      } catch (err) {
        console.error('Error fetching analysis status:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    // Fetch inicial
    fetchStatus();
    
    // Configurar intervalo si el análisis está activo
    if (!analysis || ['pending', 'running'].includes(analysis?.status)) {
      interval = setInterval(fetchStatus, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisId, analysis?.status, onAnalysisCompleted, onAnalysisCancelled]);

  // Función para cerrar el modal sin cancelar (cuando está corriendo)
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Función para cancelar el análisis (solo cuando está corriendo)
  const handleCancel = async () => {
    if (!analysis || !['pending', 'running'].includes(analysis.status)) {
      return;
    }
    
    const confirmed = window.confirm(
      '¿Estás seguro de que quieres cancelar este análisis? El progreso se perderá.'
    );
    
    if (!confirmed) return;
    
    setIsCancelling(true);
    
    try {
      await cancelAnalysis(analysisId);
      toast.success('Análisis cancelado');
      
      if (onAnalysisCancelled) {
        onAnalysisCancelled(analysis);
      }
    } catch (err) {
      console.error('Error cancelling analysis:', err);
      toast.error('Error al cancelar el análisis');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseIcon = (phase) => {
    const icons = {
      initialization: '⚙️',
      discovery: '🔍',
      analysis: '🔬',
      processing: '⚡',
      finalization: '✨'
    };
    return icons[phase] || '🔄';
  };

  const getPhaseDescription = (phase) => {
    const descriptions = {
      initialization: 'Preparando el navegador y configuración inicial',
      discovery: 'Descubriendo páginas y subdominios del sitio web',
      analysis: 'Analizando cookies, scripts y tecnologías detectadas',
      processing: 'Procesando datos y categorizando hallazgos',
      finalization: 'Generando reporte final y recomendaciones'
    };
    return descriptions[phase] || 'Procesando...';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      running: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      cancelled: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pendiente',
      running: 'En progreso',
      completed: 'Completado',
      failed: 'Error',
      cancelled: 'Cancelado'
    };
    return texts[status] || status;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#235C88]"></div>
            <span className="text-lg font-medium text-gray-700">Cargando análisis...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">No se pudo cargar la información del análisis</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = ['pending', 'running'].includes(analysis.status);
  const percentage = Math.max(0, Math.min(100, analysis.progress?.percentage || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Análisis Avanzado de Cookies
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isActive ? "Cerrar ventana (el análisis continuará en segundo plano)" : "Cerrar"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Información del dominio */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-[#235C88] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">{analysis.domain}</h4>
              <p className="text-sm text-gray-500">ID: {analysis.scanId}</p>
            </div>
            <div className="flex-grow"></div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(analysis.status)}`}>
              {getStatusText(analysis.status)}
            </div>
          </div>
        </div>

        {/* Fase actual */}
        {isActive && analysis.progress && (
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{getPhaseIcon(analysis.progress.currentPhase)}</span>
              <div>
                <h5 className="font-medium text-gray-900 capitalize">
                  {analysis.progress.currentPhase}
                </h5>
                <p className="text-sm text-gray-600">
                  {getPhaseDescription(analysis.progress.currentPhase)}
                </p>
              </div>
            </div>
            
            {analysis.progress.currentStep && (
              <p className="text-sm text-gray-600 ml-11">
                {analysis.progress.currentStep}
              </p>
            )}
            
            {analysis.progress.currentUrl && (
              <p className="text-xs text-gray-500 ml-11 mt-1 truncate">
                📄 {analysis.progress.currentUrl}
              </p>
            )}
          </div>
        )}

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso</span>
            <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                analysis.status === 'completed' ? 'bg-green-500' :
                analysis.status === 'failed' ? 'bg-red-500' :
                'bg-[#235C88]'
              } relative overflow-hidden`}
              style={{ width: `${percentage}%` }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas en tiempo real */}
        {analysis.progress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#235C88]">
                {analysis.progress.urlsAnalyzed || 0}
              </div>
              <div className="text-xs text-gray-500">URLs Analizadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analysis.progress.urlsDiscovered || 0}
              </div>
              <div className="text-xs text-gray-500">URLs Descubiertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-xs text-gray-500">Tiempo Transcurrido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analysis.progress.estimatedTimeRemaining ? 
                  formatTime(Math.round(analysis.progress.estimatedTimeRemaining)) : 
                  '--:--'
                }
              </div>
              <div className="text-xs text-gray-500">Tiempo Restante</div>
            </div>
          </div>
        )}

        {/* Métricas en tiempo real */}
        {analysis.realTimeMetrics && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h6 className="font-medium text-gray-700 mb-3">Métricas en Tiempo Real</h6>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cookies por minuto:</span>
                <span className="font-medium ml-2">{analysis.realTimeMetrics.cookiesPerMinute}</span>
              </div>
              <div>
                <span className="text-gray-600">URLs por minuto:</span>
                <span className="font-medium ml-2">{analysis.realTimeMetrics.urlsPerMinute}</span>
              </div>
              <div>
                <span className="text-gray-600">Tasa de error:</span>
                <span className="font-medium ml-2">{(analysis.realTimeMetrics.errorRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Errores del análisis */}
        {analysis.progress?.errors && analysis.progress.errors.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
            <h6 className="font-medium text-yellow-800 mb-2">
              Advertencias ({analysis.progress.errors.length})
            </h6>
            <div className="max-h-20 overflow-y-auto">
              {analysis.progress.errors.slice(0, 3).map((error, index) => (
                <p key={index} className="text-xs text-yellow-700 truncate">
                  • {error.url}: {error.error}
                </p>
              ))}
              {analysis.progress.errors.length > 3 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Y {analysis.progress.errors.length - 3} errores más...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error del análisis */}
        {analysis.status === 'failed' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded">
            <strong>Error en el análisis:</strong> {analysis.progress?.currentStep || 'Error desconocido'}
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

        {/* Botones */}
        <div className="flex justify-between">
          {/* Botón de logs a la izquierda */}
          <button
            onClick={() => setShowLogsConsole(true)}
            className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Logs</span>
          </button>

          {/* Botones principales a la derecha */}
          <div className="flex space-x-3">
            {isActive ? (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCancelling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <span>Cancelar Análisis</span>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#235C88] text-white rounded-md hover:bg-[#1a4666] focus:outline-none focus:ring-2 focus:ring-[#235C88]"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Consola de Logs */}
      <ScanLogsConsole
        isVisible={showLogsConsole}
        onClose={() => setShowLogsConsole(false)}
      />
    </div>
  );
};

AdvancedAnalysisProgressModal.propTypes = {
  analysisId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onAnalysisCompleted: PropTypes.func,
  onAnalysisCancelled: PropTypes.func
};

export default AdvancedAnalysisProgressModal;