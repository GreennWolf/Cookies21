import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../utils/apiClient';
import { toast } from 'react-hot-toast';

const ScanLogsConsole = ({ isVisible, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [activeScanLogs, setActiveScanLogs] = useState({});
  const [stats, setStats] = useState({});
  const [selectedScan, setSelectedScan] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef(null);

  // Fetch logs de escaneos activos
  const fetchActiveLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/cookie-scan/logs/active');
      setActiveScanLogs(response.data.data.activeScans);
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error fetching active logs:', error);
      toast.error('Error al obtener logs activos');
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs de un escaneo específico
  const fetchScanLogs = async (scanId) => {
    try {
      const response = await apiClient.get(`/api/v1/cookie-scan/scan/${scanId}/logs`);
      setLogs(response.data.data.logs);
    } catch (error) {
      console.error('Error fetching scan logs:', error);
      toast.error(`Error al obtener logs del scan ${scanId}`);
    }
  };

  // Manejo de tecla ESC
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isVisible, onClose]);

  // Auto refresh
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchActiveLogs();
      if (selectedScan !== 'all') {
        fetchScanLogs(selectedScan);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, autoRefresh, selectedScan]);

  // Scroll to bottom when new logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Initial fetch
  useEffect(() => {
    if (isVisible) {
      fetchActiveLogs();
    }
  }, [isVisible]);

  // Handle scan selection
  const handleScanSelect = (scanId) => {
    setSelectedScan(scanId);
    if (scanId !== 'all') {
      fetchScanLogs(scanId);
    } else {
      setLogs([]);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Get log icon based on level
  const getLogIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return '📝';
    }
  };

  // Get log color based on level
  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-green-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-green-300';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex justify-between items-center bg-[#235C88] text-white rounded-t-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold">Logs de Escaneo</h2>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                  Activos: {stats.activeScans || 0}
                </span>
                <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">
                  Total: {stats.totalLogs || 0}
                </span>
                {stats.activeScans > 0 && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-[#235C88] bg-white border-gray-300 rounded focus:ring-[#235C88] focus:ring-2"
              />
              <span>Actualización automática</span>
            </label>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-1"
              title="Cerrar (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Seleccionar escaneo:</label>
            <select
              value={selectedScan}
              onChange={(e) => handleScanSelect(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#235C88] focus:border-[#235C88] text-sm"
            >
              <option value="all">Todos los escaneos activos</option>
              {Object.entries(activeScanLogs).map(([scanId, scanData]) => (
                <option key={scanId} value={scanId}>
                  {scanData.scanType.charAt(0).toUpperCase() + scanData.scanType.slice(1)} - {scanData.domain} ({scanData.logsCount} logs)
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                fetchActiveLogs();
                if (selectedScan !== 'all') fetchScanLogs(selectedScan);
              }}
              disabled={loading}
              className="px-4 py-2 bg-[#235C88] text-white rounded-md hover:bg-[#1a4666] focus:outline-none focus:ring-2 focus:ring-[#235C88] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Actualizar</span>
                </>
              )}
            </button>

            <button
              onClick={() => setLogs([])}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Logs Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {selectedScan === 'all' ? (
            // Show active scans overview
            <div>
              <div className="text-[#235C88] mb-4 pb-2 border-b border-gray-300">
                <h3 className="font-semibold text-lg">Resumen de Escaneos Activos</h3>
                <p className="text-sm text-gray-600">Actualizado: {new Date().toLocaleString('es-ES')}</p>
              </div>
              {Object.entries(activeScanLogs).length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No hay escaneos activos en este momento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(activeScanLogs).map(([scanId, scanData]) => (
                    <div key={scanId} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            scanData.scanType === 'advanced' ? 'bg-purple-100 text-purple-800' : 
                            scanData.scanType === 'traditional' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {scanData.scanType === 'advanced' ? 'Análisis Avanzado' : 
                             scanData.scanType === 'traditional' ? 'Escaneo Tradicional' : 
                             scanData.scanType.charAt(0).toUpperCase() + scanData.scanType.slice(1)}
                          </span>
                          <span className="font-medium text-gray-900">{scanData.domain}</span>
                        </div>
                        <span className="text-xs text-gray-500">ID: {scanId.slice(0, 8)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Inicio:</span>
                          <span className="ml-2 text-gray-900">{formatTime(scanData.startTime)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Logs:</span>
                          <span className="ml-2 text-gray-900">{scanData.logsCount}</span>
                        </div>
                      </div>
                      {scanData.lastLog && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border-l-4 border-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${
                              scanData.lastLog.level === 'error' ? 'bg-red-500' :
                              scanData.lastLog.level === 'warn' ? 'bg-yellow-500' :
                              scanData.lastLog.level === 'info' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }`}></span>
                            <span className="text-xs text-gray-600 uppercase font-medium">
                              {scanData.lastLog.level}
                            </span>
                            <span className="text-sm text-gray-800">
                              {scanData.lastLog.message}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Show specific scan logs
            <div>
              <div className="text-yellow-400 mb-3 border-b border-yellow-600 pb-1">
                [SYSTEM] SCAN_LOG_VIEWER SCAN_ID={selectedScan.slice(0, 8)}
              </div>
              {logs.length === 0 ? (
                <div className="text-gray-500">[WARN] NO_LOGS_AVAILABLE_FOR_SCAN</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className={`${getLogColor(log.level)} hover:bg-gray-900 hover:bg-black/50 px-1`}>
                      <span className="text-gray-400">[{formatTime(log.timestamp)}]</span>
                      <span className="text-white ml-1">[{log.level.toUpperCase()}]</span>
                      <span className="ml-1">{log.message}</span>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="ml-4 text-gray-500 text-xs">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="border-t border-green-500 p-2 bg-black text-xs text-green-400 font-mono">
          <div className="flex justify-between">
            <span>
              [STATS] INFO:{stats.logsByLevel?.info || 0} 
              WARN:{stats.logsByLevel?.warn || 0} 
              ERROR:{stats.logsByLevel?.error || 0} 
              DEBUG:{stats.logsByLevel?.debug || 0}
            </span>
            <span>
              [TIMESTAMP] {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanLogsConsole;