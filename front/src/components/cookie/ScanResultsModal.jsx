import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getScanResults, getAnalysisResults } from '../../api/cookieScan';

const ScanResultsModal = ({ isOpen, onClose, scanId, scanInfo }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && scanId) {
      fetchScanResults();
    }
  }, [isOpen, scanId]);

  const fetchScanResults = async () => {
    setLoading(true);
    try {
      // Determinar si es un análisis avanzado o escaneo normal
      const isAdvancedAnalysis = scanInfo?.isAdvancedAnalysis || scanInfo?.scanType === 'advanced';
      
      const response = isAdvancedAnalysis 
        ? await getAnalysisResults(scanId)
        : await getScanResults(scanId);
      
      console.log('Raw scan results:', response.data); // Debug log
      setResults(response.data);
    } catch (error) {
      toast.error('Error al cargar resultados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely extract numeric values from complex objects
  const extractNumericValue = (value, fallback = 0) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !isNaN(value)) return parseInt(value);
    if (typeof value === 'object' && value !== null) {
      // Try common object properties
      if (typeof value.count === 'number') return value.count;
      if (typeof value.total === 'number') return value.total;
      if (typeof value.value === 'number') return value.value;
      // If it's an array, return its length
      if (Array.isArray(value)) return value.length;
    }
    return fallback;
  };

  // Helper function to extract scan statistics
  const extractScanStats = (results) => {
    if (!results) return { cookies: 0, urls: 0, vendors: 0 };

    // The backend returns { scan, changes }, so we need to access scan.findings
    const scan = results.scan || results;
    const findings = scan.findings || {};
    const stats = scan.stats || {};

    const cookies = extractNumericValue(
      findings.cookies?.length ||
      stats.cookies?.count ||
      stats.totalCookies ||
      results.cookieCount ||
      0
    );

    const urls = extractNumericValue(
      stats.urlsScanned ||
      stats.overview?.urlsScanned ||
      findings.metadata?.urlsScanned ||
      scan.progress?.urlsScanned ||
      0
    );

    const vendors = extractNumericValue(
      findings.vendors?.length ||
      stats.vendors?.count ||
      stats.vendorCount ||
      0
    );

    return { cookies, urls, vendors };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'necessary':
      case 'necesarias':
        return 'bg-green-100 text-green-800';
      case 'analytics':
      case 'analíticas':
        return 'bg-blue-100 text-blue-800';
      case 'marketing':
      case 'publicitarias':
        return 'bg-purple-100 text-purple-800';
      case 'functional':
      case 'funcionales':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Resultados del Escaneo
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {scanInfo?.scanType === 'full' ? 'Análisis Completo' : 
               scanInfo?.scanType === 'quick' ? 'Escaneo Rápido' : 
               'Escaneo'} - {formatDate(scanInfo?.startTime)}
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
              <span className="ml-2 text-gray-600">Cargando resultados...</span>
            </div>
          ) : (
            <div className="p-6">
              {/* Summary Stats */}
              {results && (() => {
                const stats = extractScanStats(results);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">
                        {stats.cookies}
                      </div>
                      <div className="text-sm text-blue-700">Cookies Encontradas</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">
                        {stats.urls}
                      </div>
                      <div className="text-sm text-green-700">URLs Escaneadas</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-900">
                        {stats.vendors}
                      </div>
                      <div className="text-sm text-purple-700">Vendors Detectados</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">
                        {formatDuration(scanInfo?.startTime, scanInfo?.endTime)}
                      </div>
                      <div className="text-sm text-orange-700">Duración Total</div>
                    </div>
                  </div>
                );
              })()}

              {/* Scan Details */}
              {scanInfo && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Detalles del Escaneo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        scanInfo.status === 'completed' ? 'bg-green-100 text-green-800' :
                        scanInfo.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {scanInfo.status === 'completed' ? 'Completado' : 
                         scanInfo.status === 'error' ? 'Error' : scanInfo.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <span className="ml-2 text-gray-900">
                        {scanInfo.scanType === 'full' ? 'Análisis Completo' : 
                         scanInfo.scanType === 'quick' ? 'Escaneo Rápido' : scanInfo.scanType}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Inicio:</span>
                      <span className="ml-2 text-gray-900">{formatDate(scanInfo.startTime)}</span>
                    </div>
                    {scanInfo.endTime && (
                      <div>
                        <span className="font-medium text-gray-700">Fin:</span>
                        <span className="ml-2 text-gray-900">{formatDate(scanInfo.endTime)}</span>
                      </div>
                    )}
                    {(scanInfo.config || scanInfo.scanConfig) && (
                      <>
                        <div>
                          <span className="font-medium text-gray-700">URLs Máx:</span>
                          <span className="ml-2 text-gray-900">
                            {scanInfo.config?.maxUrls || scanInfo.scanConfig?.maxUrls || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Profundidad:</span>
                          <span className="ml-2 text-gray-900">
                            {scanInfo.config?.depth || scanInfo.scanConfig?.depth || 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Cookies Table */}
              {(() => {
                // Extract cookies from various possible locations in the data structure
                // Backend returns { scan, changes }, so check scan.findings.cookies first
                const scan = results?.scan || results;
                const cookiesArray = scan?.findings?.cookies || 
                                   results?.cookies || 
                                   results?.findings?.cookies || 
                                   results?.data?.cookies || 
                                   [];
                
                return Array.isArray(cookiesArray) && cookiesArray.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Cookies Detectadas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dominio
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duración
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Propósito
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cookiesArray.map((cookie, index) => {
                          // Sanitize cookie data to prevent rendering errors
                          const safeCookie = {
                            _id: cookie._id || `cookie-${index}`,
                            name: cookie.name || 'Cookie sin nombre',
                            category: cookie.category || 'Sin categoría',
                            domain: cookie.domain || 'N/A',
                            duration: cookie.duration || cookie.attributes?.duration || 'N/A',
                            purpose: cookie.purpose || cookie.description?.en || cookie.description || 'Sin descripción'
                          };
                          
                          return (
                          <tr key={safeCookie._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {safeCookie.name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(safeCookie.category)}`}>
                                {safeCookie.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {safeCookie.domain}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {safeCookie.duration}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {safeCookie.purpose}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No se encontraron cookies en este escaneo</p>
                </div>
              );
              })()}
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
    </div>
  );
};

export default ScanResultsModal;