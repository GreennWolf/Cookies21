import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getScanStatus, cancelScan } from '../../api/cookieScan';
import ScanLogsConsole from '../debug/ScanLogsConsole';

const ScanProgressModal = ({ scan, onClose, onScanCompleted, onScanCancelled }) => {
  const [currentScan, setCurrentScan] = useState(scan);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [showLogsConsole, setShowLogsConsole] = useState(false);

  // Función para calcular tiempo transcurrido
  const calculateElapsedTime = (startTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / 1000);
  };

  // Función para estimar tiempo restante
  const calculateEstimatedTimeRemaining = (progress, elapsedSeconds) => {
    if (!progress || progress <= 0) return null;
    
    const totalEstimated = (elapsedSeconds / progress) * 100;
    const remaining = totalEstimated - elapsedSeconds;
    
    return remaining > 0 ? Math.ceil(remaining) : 0;
  };

  // Función para formatear tiempo en mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Actualizar progreso cada segundo
  useEffect(() => {
    let interval;
    
    if (currentScan && ['pending', 'running', 'in_progress'].includes(currentScan.status)) {
      interval = setInterval(async () => {
        try {
          const response = await getScanStatus(currentScan._id);
          const updatedScan = response.data?.scan || response.scan;
          
          setCurrentScan(updatedScan);
          
          // Calcular tiempo transcurrido
          const elapsed = calculateElapsedTime(updatedScan.progress?.startTime);
          setElapsedTime(elapsed);
          
          // Calcular tiempo restante estimado
          const progress = updatedScan.progress?.percentage || 0;
          const remaining = calculateEstimatedTimeRemaining(progress, elapsed);
          setEstimatedTimeRemaining(remaining);
          
          // Si el scan se completó o falló
          if (['completed', 'error', 'cancelled'].includes(updatedScan.status)) {
            if (updatedScan.status === 'completed' && onScanCompleted) {
              onScanCompleted(updatedScan);
            } else if (updatedScan.status === 'cancelled' && onScanCancelled) {
              onScanCancelled(updatedScan);
            }
            
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error updating scan status:', err);
          setError(err.message);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScan, onScanCompleted, onScanCancelled]);

  // Cancelar scan
  const handleCancelScan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cancelScan(currentScan._id);
      
      if (onScanCancelled) {
        onScanCancelled(currentScan);
      }
    } catch (err) {
      console.error('Error cancelling scan:', err);
      setError(err.message || 'Error al cancelar el escaneo');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentScan) return null;

  const progress = currentScan.progress || {};
  const percentage = Math.max(0, Math.min(100, progress.percentage || 0));
  const isActive = ['pending', 'running', 'in_progress'].includes(currentScan.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Progreso del Escaneo
          </h3>
          {!isActive && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Estado del scan */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Estado:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              currentScan.status === 'completed' ? 'bg-green-100 text-green-800' :
              currentScan.status === 'error' ? 'bg-red-100 text-red-800' :
              currentScan.status === 'cancelled' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {currentScan.status === 'completed' ? 'Completado' :
               currentScan.status === 'error' ? 'Error' :
               currentScan.status === 'cancelled' ? 'Cancelado' :
               currentScan.status === 'running' ? 'En progreso' :
               'Iniciando'}
            </span>
          </div>
          
          {progress.currentStep && (
            <p className="text-sm text-gray-600">
              {progress.currentStep}
            </p>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso</span>
            <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                currentScan.status === 'completed' ? 'bg-green-500' :
                currentScan.status === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          {progress.urlsScanned !== undefined && progress.urlsTotal && (
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Páginas analizadas: {progress.urlsScanned}</span>
              <span>Total: {progress.urlsTotal}</span>
            </div>
          )}
        </div>

        {/* Información de tiempo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-xs text-gray-500">Tiempo transcurrido</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {estimatedTimeRemaining !== null ? formatTime(estimatedTimeRemaining) : '--:--'}
            </div>
            <div className="text-xs text-gray-500">Tiempo restante</div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Mensaje de error del scan */}
        {currentScan.status === 'error' && currentScan.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded">
            <strong>Error en el escaneo:</strong> {currentScan.error}
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
                onClick={handleCancelScan}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Cancelando...' : 'Cancelar Escaneo'}
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

ScanProgressModal.propTypes = {
  scan: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onScanCompleted: PropTypes.func,
  onScanCancelled: PropTypes.func
};

export default ScanProgressModal;