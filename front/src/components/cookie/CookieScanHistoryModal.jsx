import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getScanHistory, getAnalysisHistory, cancelScanInProgress } from '../../api/cookieScan';
import CancelScanConfirmModal from './CancelScanConfirmModal';
import ScanResultsModal from './ScanResultsModal';

const CookieScanHistoryModal = ({ isOpen, onClose, domainId, domainName }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [scanToCancel, setScanToCancel] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  // Función para sanitizar datos de scan
  const sanitizeScanData = (scan) => {
    if (!scan || typeof scan !== 'object') return null;
    
    return {
      _id: scan._id || '',
      status: typeof scan.status === 'string' ? scan.status : 'unknown',
      scanType: typeof scan.scanType === 'string' ? scan.scanType : 'N/A',
      startTime: scan.startTime || null,
      endTime: scan.endTime || null,
      progress: typeof scan.progress === 'number' ? scan.progress : 0,
      error: typeof scan.error === 'string' ? scan.error : null,
      results: scan.results || {},
      cookieCount: typeof scan.cookieCount === 'number' ? scan.cookieCount : 0,
      urlsScanned: typeof scan.urlsScanned === 'number' ? scan.urlsScanned : 0,
      currentUrl: typeof scan.currentUrl === 'string' ? scan.currentUrl : '',
      // Identificar si es un análisis avanzado
      isAdvancedAnalysis: scan.isAdvancedAnalysis || scan.scanType === 'advanced' || false,
      config: scan.config || scan.scanConfig || null
    };
  };

  useEffect(() => {
    if (isOpen && domainId) {
      fetchScanHistory();
    }
  }, [isOpen, domainId, pagination.page]);

  // Actualizar automáticamente cada 5 segundos cuando el modal está abierto
  useEffect(() => {
    let interval;
    if (isOpen && domainId) {
      interval = setInterval(() => {
        // Solo actualizar si hay escaneos en progreso
        const hasActiveScans = scans.some(scan => {
          const sanitized = sanitizeScanData(scan);
          return sanitized && (
            sanitized.status === 'running' || 
            sanitized.status === 'pending' || 
            sanitized.status === 'in_progress'
          );
        });
        if (hasActiveScans) {
          fetchScanHistory();
        }
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, domainId, scans]);

  const fetchScanHistory = async () => {
    setLoading(true);
    try {
      // Obtener tanto escaneos normales como análisis avanzados
      const [scanResponse, analysisResponse] = await Promise.allSettled([
        getScanHistory(domainId, {
          page: pagination.page,
          limit: Math.ceil(pagination.limit / 2) // Dividir el límite entre ambos tipos
        }),
        getAnalysisHistory(domainId, {
          page: pagination.page,
          limit: Math.ceil(pagination.limit / 2)
        })
      ]);
      
      let allScans = [];
      let totalCount = 0;
      
      // Procesar escaneos normales
      if (scanResponse.status === 'fulfilled' && scanResponse.value?.data?.scans) {
        const normalScans = Array.isArray(scanResponse.value.data.scans) 
          ? scanResponse.value.data.scans.map(scan => ({
              ...sanitizeScanData(scan),
              type: 'scan'
            })).filter(Boolean)
          : [];
        allScans = [...allScans, ...normalScans];
        totalCount += scanResponse.value.data.total || 0;
      }
      
      // Procesar análisis avanzados
      if (analysisResponse.status === 'fulfilled' && analysisResponse.value?.data?.analyses) {
        const advancedAnalyses = Array.isArray(analysisResponse.value.data.analyses) 
          ? analysisResponse.value.data.analyses.map(analysis => ({
              _id: analysis._id || analysis.analysisId,
              status: analysis.status || 'unknown',
              scanType: 'Análisis Avanzado',
              startTime: analysis.startTime,
              endTime: analysis.endTime,
              progress: analysis.progress || 0,
              error: analysis.error?.message || null,
              results: analysis.results || {},
              cookieCount: analysis.results?.totalCookies || 0,
              urlsScanned: analysis.results?.urlsScanned || 0,
              isAdvancedAnalysis: true, // Marcar explícitamente como análisis avanzado
              config: analysis.config || analysis.scanConfig || null,
              type: 'analysis'
            })).filter(Boolean)
          : [];
        allScans = [...allScans, ...advancedAnalyses];
        totalCount += analysisResponse.value.data.total || 0;
      }
      
      // Ordenar por fecha de inicio (más reciente primero)
      allScans.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      setScans(allScans);
      setPagination(prev => ({
        ...prev,
        total: totalCount
      }));
    } catch (error) {
      console.error('Error fetching scan history:', error);
      toast.error('Error al cargar el historial: ' + (error.message || 'Error desconocido'));
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (scan) => {
    const sanitized = sanitizeScanData(scan);
    if (!sanitized) {
      toast.error('Datos de escaneo inválidos');
      return;
    }
    setScanToCancel(sanitized);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    if (!scanToCancel || !scanToCancel._id) {
      toast.error('No se puede cancelar: datos de escaneo inválidos');
      return;
    }
    
    try {
      await cancelScanInProgress(scanToCancel._id);
      toast.success('Escaneo cancelado exitosamente');
      setShowCancelConfirm(false);
      setScanToCancel(null);
      // Refrescar la lista
      fetchScanHistory();
    } catch (error) {
      console.error('Error cancelling scan:', error);
      toast.error('Error al cancelar escaneo: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleViewResults = (scan) => {
    const sanitized = sanitizeScanData(scan);
    if (!sanitized) {
      toast.error('Datos de escaneo inválidos');
      return;
    }
    setSelectedScan(sanitized);
    setShowResults(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
      case 'in_progress':
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'running':
      case 'in_progress':
        return 'En progreso';
      case 'pending':
        return 'Pendiente';
      case 'error':
      case 'failed':
        return 'Error';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status || 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      const duration = Math.floor((end - start) / 1000); // segundos
      
      if (duration < 0) return 'N/A';
      if (duration < 60) return `${duration}s`;
      if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  const getScanTypeDisplay = (scanType) => {
    switch (scanType) {
      case 'comprehensive':
      case 'full':
        return 'Completo';
      case 'quick':
        return 'Rápido';
      default:
        return scanType || 'N/A';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Historial de Escaneos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Dominio: {domainName || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando historial...</span>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No hay escaneos en el historial</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inicio
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cookies
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progreso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scans.map((scan) => {
                      if (!scan || !scan._id) return null;
                      
                      return (
                        <tr key={scan._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(scan.status)}`}>
                              {getStatusText(scan.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getScanTypeDisplay(scan.scanType)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(scan.startTime)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(scan.startTime, scan.endTime)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(scan.results && typeof scan.results.cookieCount === 'number') 
                              ? scan.results.cookieCount 
                              : scan.cookieCount || 0}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {scan.status === 'running' || scan.status === 'pending' || scan.status === 'in_progress' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${Math.min(Math.max(scan.progress || 0, 0), 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600">{scan.progress || 0}%</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {scan.status === 'completed' ? '100%' : '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm space-x-2">
                            {/* Botón cancelar para escaneos activos */}
                            {(scan.status === 'running' || scan.status === 'pending' || scan.status === 'in_progress') && (
                              <button
                                onClick={() => handleCancelClick(scan)}
                                className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors mr-2"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancelar
                              </button>
                            )}
                            
                            {/* Botón ver para escaneos completados - SVG CORREGIDO */}
                            {scan.status === 'completed' && (
                              <button
                                onClick={() => handleViewResults(scan)}
                                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors mr-2"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 0116 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver
                              </button>
                            )}
                            
                            {/* Mostrar error si existe */}
                            {(scan.status === 'error' || scan.status === 'failed') && scan.error && (
                              <span className="text-xs text-red-600" title={scan.error}>
                                Error: {scan.error.substring(0, 30)}...
                              </span>
                            )}
                            
                            {/* Fallback: mostrar estado si no hay botones */}
                            {!['running', 'pending', 'in_progress', 'completed', 'error', 'failed', 'cancelled'].includes(scan.status) && (
                              <span className="text-xs text-gray-500">
                                {scan.status || 'Sin estado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} escaneos
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Página {pagination.page} de {Math.ceil(pagination.total / pagination.limit) || 1}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación para cancelar */}
      {showCancelConfirm && scanToCancel && (
        <CancelScanConfirmModal
          isOpen={showCancelConfirm}
          onClose={() => {
            setShowCancelConfirm(false);
            setScanToCancel(null);
          }}
          onConfirm={handleCancelConfirm}
          scanInfo={scanToCancel}
        />
      )}

      {/* Modal de resultados */}
      {showResults && selectedScan && (
        <ScanResultsModal
          isOpen={showResults}
          onClose={() => {
            setShowResults(false);
            setSelectedScan(null);
          }}
          scanId={selectedScan._id}
          scanInfo={selectedScan}
        />
      )}
    </div>
  );
};

export default CookieScanHistoryModal;