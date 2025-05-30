import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains } from '../api/domain';
import { getCookies, createCookie, updateCookieStatus } from '../api/cookie';
import { getClients } from '../api/client';
import { startScan, startAsyncAnalysis, getActiveScan, cancelScanInProgress, forceStopAllScans, forceStopAllAnalysis, cancelAnalysis } from '../api/cookieScan';
import DomainSelector from '../components/domain/DomainSelector';
import CookieList from '../components/cookie/CookieList';
import CookieScanModal from '../components/cookie/CookieScanModal';
import StartScanModal from '../components/cookie/StartScanModal';
import ScanProgressModal from '../components/cookie/ScanProgressModal';
import AdvancedAnalysisModal from '../components/cookie/AdvancedAnalysisModal';
import AdvancedAnalysisProgressModal from '../components/cookie/AdvancedAnalysisProgressModal';
import CookieAnalysisModal from '../components/cookie/CookieAnalysisModal';
import CookieDetailsModal from '../components/cookie/CookieDetailsModal';
import CreateCookieModal from '../components/cookie/CreateCookieModal';
import CookieScanHistoryModal from '../components/cookie/CookieScanHistoryModal';
import CancelScanConfirmModal from '../components/cookie/CancelScanConfirmModal';
import ScanLogsConsole from '../components/debug/ScanLogsConsole';
import { useAuth } from '../contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

const Cookies = () => {
  const [domains, setDomains] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [selectedCookie, setSelectedCookie] = useState(null);
  const [isCookieDetailsOpen, setIsCookieDetailsOpen] = useState(false);
  const [isCreateCookieOpen, setIsCreateCookieOpen] = useState(false);
  const [activeScan, setActiveScan] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isStartScanModalOpen, setIsStartScanModalOpen] = useState(false);
  const [isScanProgressModalOpen, setIsScanProgressModalOpen] = useState(false);
  const [isAdvancedAnalysisModalOpen, setIsAdvancedAnalysisModalOpen] = useState(false);
  const [isAdvancedProgressModalOpen, setIsAdvancedProgressModalOpen] = useState(false);
  const [currentAdvancedAnalysisId, setCurrentAdvancedAnalysisId] = useState(null);
  const [showLogsConsole, setShowLogsConsole] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    includeSubdomains: true,
    maxUrls: 100,
    depth: 5
  });
  const { hasRole } = useAuth();
  
  // Verificar si el usuario es owner
  const isOwner = hasRole('owner');

  // Función helper para asegurar que los datos sean seguros para renderizar
  const sanitizeScanData = (scanData) => {
    if (!scanData || typeof scanData !== 'object') {
      return null;
    }

    return {
      _id: scanData._id || '',
      status: scanData.status || 'unknown',
      progress: typeof scanData.progress === 'number' ? scanData.progress : 0,
      urlsScanned: typeof scanData.urlsScanned === 'number' ? scanData.urlsScanned : 0,
      currentUrl: typeof scanData.currentUrl === 'string' ? scanData.currentUrl : '',
      startTime: scanData.startTime || '',
      endTime: scanData.endTime || '',
      duration: typeof scanData.duration === 'number' ? scanData.duration : 0,
      domainId: scanData.domainId || '',
      scanType: scanData.scanType || 'full'
    };
  };

  // Obtener dominios asociados al usuario/cliente
  useEffect(() => {
    const fetchDomains = async () => {
      setLoading(true);
      try {
        // Si es owner y hay clientId seleccionado, filtrar dominios por ese cliente
        const params = {};
        if (isOwner && selectedClientId) {
          params.clientId = selectedClientId;
        }
        
        const res = await getDomains(params);
        setDomains(Array.isArray(res.data.domains) ? res.data.domains : []);
      } catch (error) {
        console.error('Error fetching domains:', error);
        toast.error(error.message || 'Error al cargar dominios');
        setDomains([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDomains();
    
    // Si es owner, cargar los clientes
    if (isOwner) {
      fetchClients();
    }
  }, [isOwner, selectedClientId]);
  
  // Cargar la lista de clientes si el usuario es owner
  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(Array.isArray(response.data.clients) ? response.data.clients : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar clientes: ' + (error.message || 'Error desconocido'));
      setClients([]);
    }
  };

  // Obtener cookies para el dominio seleccionado o para todos los dominios del cliente seleccionado (owner)
  useEffect(() => {
    const fetchCookies = async () => {
      // Si no hay dominio seleccionado y no es owner, no hacer nada
      if (!selectedDomain && !isOwner) {
        setCookies([]);
        return;
      }
      
      setLoading(true);
      try {
        let res;
        if (selectedDomain) {
          // Si hay un dominio seleccionado, obtener cookies para ese dominio
          res = await getCookies(selectedDomain._id);
        } else if (isOwner) {
          // Si es owner y no hay dominio seleccionado, puede obtener todas las cookies
          // con filtro opcional por cliente
          const params = {};
          if (selectedClientId) {
            params.clientId = selectedClientId;
          } else {
            // Si es owner pero no ha seleccionado cliente, no mostrar cookies
            setCookies([]);
            setLoading(false);
            return;
          }
          res = await getCookies(null, params);
        }
        
        setCookies(Array.isArray(res.data.cookies) ? res.data.cookies : []);
      } catch (error) {
        console.error('Error al obtener cookies:', error);
        // Mensaje más descriptivo del error
        toast.error('No se pudieron cargar las cookies: ' + (error.message || 'Error de servidor'));
        setCookies([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCookies();
  }, [selectedDomain, isOwner, selectedClientId]);

  // Verificar si hay escaneos activos para el dominio seleccionado
  useEffect(() => {
    let intervalId = null;
    
    const checkActiveScan = async () => {
      if (!selectedDomain) {
        setActiveScan(null);
        return;
      }

      try {
        const response = await getActiveScan(selectedDomain._id);
        const scanData = response.data?.scan;
        setActiveScan(sanitizeScanData(scanData));
        
        // Solo continuar verificando si hay un scan activo
        if (scanData && ['pending', 'running', 'in_progress'].includes(scanData.status)) {
          // Programar siguiente verificación solo si es necesario
          intervalId = setTimeout(checkActiveScan, 5000);
        }
      } catch (error) {
        // Si no hay escaneo activo, no es un error
        setActiveScan(null);
      }
    };

    // Verificación inicial
    checkActiveScan();
    
    // Cleanup
    return () => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
    };
  }, [selectedDomain]);

  // Función para mostrar confirmación de cancelar escaneo
  const handleCancelClick = () => {
    if (!activeScan) {
      toast.error('No hay escaneo activo para cancelar');
      return;
    }
    setShowCancelConfirm(true);
  };

  // Función para cancelar un escaneo en progreso
  const handleCancelConfirm = async () => {
    if (!activeScan || !activeScan._id) {
      toast.error('No hay escaneo activo para cancelar');
      return;
    }

    try {
      await cancelScanInProgress(activeScan._id);
      setActiveScan(null);
      setShowCancelConfirm(false);
      toast.success('Escaneo cancelado exitosamente');
    } catch (error) {
      console.error('Error cancelling scan:', error);
      toast.error(error.message || 'Error al cancelar el escaneo');
    }
  };

  // Función para análisis completo usando el scanner tradicional
  const handleComprehensiveAnalysis = () => {
    if (!selectedDomain) {
      toast.error('Por favor selecciona un dominio');
      return;
    }
    
    if (activeScan) {
      toast.error('Ya hay un escaneo en progreso para este dominio');
      return;
    }
    
    setIsStartScanModalOpen(true);
  };

  // Función llamada cuando se inicia un nuevo scan
  const handleScanStarted = (scan) => {
    setActiveScan(sanitizeScanData(scan));
    setIsScanProgressModalOpen(true);
    toast.success('Escaneo iniciado correctamente');
  };

  // Función llamada cuando se completa un scan
  const handleScanCompleted = (scan) => {
    setActiveScan(null);
    setIsScanProgressModalOpen(false);
    setScanResults(sanitizeScanData(scan));
    setIsScanModalOpen(true);
    toast.success('Escaneo completado');
    
    // Refrescar cookies
    if (selectedDomain) {
      getCookies(selectedDomain._id).then(res => {
        setCookies(Array.isArray(res.data.cookies) ? res.data.cookies : []);
      });
    }
  };

  // Función llamada cuando se cancela un scan
  const handleScanCancelled = (scan) => {
    setActiveScan(null);
    setIsScanProgressModalOpen(false);
    toast.info('Escaneo cancelado');
  };

  // Función para iniciar análisis avanzado
  const handleAdvancedAnalysis = () => {
    if (!selectedDomain) {
      toast.error('Por favor selecciona un dominio');
      return;
    }
    
    if (activeScan) {
      toast.error('Ya hay un escaneo en progreso para este dominio');
      return;
    }
    
    setIsAdvancedAnalysisModalOpen(true);
  };

  // Función llamada cuando se inicia un análisis avanzado
  const handleAdvancedAnalysisStarted = (analysisData) => {
    setCurrentAdvancedAnalysisId(analysisData.analysisId);
    setIsAdvancedAnalysisModalOpen(false);
    setIsAdvancedProgressModalOpen(true);
    toast.success('Análisis avanzado iniciado correctamente');
  };

  // Función llamada cuando se completa un análisis avanzado
  const handleAdvancedAnalysisCompleted = (analysisData) => {
    setIsAdvancedProgressModalOpen(false);
    setCurrentAdvancedAnalysisId(null);
    toast.success('Análisis avanzado completado');
    
    // Refrescar cookies
    if (selectedDomain) {
      getCookies(selectedDomain._id).then(res => {
        setCookies(Array.isArray(res.data.cookies) ? res.data.cookies : []);
      });
    }
  };

  // Función llamada cuando se cancela un análisis avanzado
  const handleAdvancedAnalysisCancelled = (analysisData) => {
    setIsAdvancedProgressModalOpen(false);
    setCurrentAdvancedAnalysisId(null);
    toast.info('Análisis avanzado cancelado');
  };

  // Función para forzar la limpieza de análisis colgados (solo owners)
  const handleForceStopAnalysis = async () => {
    if (!selectedDomain) {
      toast.error('Por favor selecciona un dominio');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres forzar la cancelación de todos los análisis activos para este dominio?')) {
      return;
    }

    try {
      const response = await forceStopAllAnalysis(selectedDomain._id);
      toast.success(`Se cancelaron ${response.data.stoppedCount} análisis`);
      
      // Refrescar el estado
      if (currentAdvancedAnalysisId) {
        setCurrentAdvancedAnalysisId(null);
        setIsAdvancedProgressModalOpen(false);
      }
    } catch (error) {
      console.error('Error forcing stop analyses:', error);
      toast.error(error.message || 'Error al forzar la cancelación de análisis');
    }
  };


  // Función llamada cuando se completa el análisis
  const handleAnalysisComplete = async () => {
    setIsAnalysisModalOpen(false);
    setAnalysisId(null);
    
    // Refrescar la lista de cookies
    if (selectedDomain) {
      try {
        const cookiesRes = await getCookies(selectedDomain._id);
        setCookies(Array.isArray(cookiesRes.data.cookies) ? cookiesRes.data.cookies : []);
        toast.success('Lista de cookies actualizada');
      } catch (error) {
        console.error('Error al refrescar cookies:', error);
        toast.error('Error al actualizar la lista de cookies');
      }
    }
  };

  // Función para ver detalles de una cookie
  const handleViewDetails = (cookie) => {
    if (!cookie || typeof cookie !== 'object') {
      toast.error('Cookie inválida');
      return;
    }
    setSelectedCookie(cookie);
    setIsCookieDetailsOpen(true);
  };

  // Función para eliminar una cookie (marcar como inactiva)
  const handleDelete = async (cookieId) => {
    if (!selectedDomain || !cookieId) {
      toast.error('Datos insuficientes para eliminar la cookie');
      return;
    }
    
    try {
      await updateCookieStatus(cookieId, 'inactive');
      toast.success('Cookie eliminada');
      const res = await getCookies(selectedDomain._id);
      setCookies(Array.isArray(res.data.cookies) ? res.data.cookies : []);
    } catch (error) {
      console.error('Error deleting cookie:', error);
      toast.error(error.message || 'Error al eliminar la cookie');
    }
  };

  // Función para crear una cookie (se llamará desde el modal)
  const handleCreateCookie = async (cookieData) => {
    if (!cookieData || typeof cookieData !== 'object') {
      toast.error('Datos de cookie inválidos');
      return;
    }

    try {
      await createCookie(cookieData);
      toast.success('Cookie creada');
      if (selectedDomain) {
        const res = await getCookies(selectedDomain._id);
        setCookies(Array.isArray(res.data.cookies) ? res.data.cookies : []);
      }
    } catch (error) {
      console.error('Error creating cookie:', error);
      toast.error(error.message || 'Error al crear la cookie');
    }
  };

  // Manejar cambio de cliente seleccionado (solo para owners)
  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    // Al cambiar de cliente, resetear el dominio seleccionado
    setSelectedDomain(null);
  };

  // Calcular tiempo restante estimado
  const calculateRemainingTime = (scan) => {
    if (!scan || !scan.progress || scan.progress.percentage <= 0) return null;
    
    const startTime = scan.progress.startTime ? new Date(scan.progress.startTime) : null;
    if (!startTime) return null;
    
    const now = new Date();
    const elapsedMs = now - startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    if (elapsedSeconds < 10) return null; // No calcular hasta tener datos suficientes
    
    const progress = scan.progress.percentage;
    const totalEstimatedSeconds = (elapsedSeconds / progress) * 100;
    const remainingSeconds = Math.max(0, Math.ceil(totalEstimatedSeconds - elapsedSeconds));
    
    return remainingSeconds;
  };

  // Formatear tiempo en mm:ss
  const formatTime = (seconds) => {
    if (seconds == null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render del progreso del escaneo activo
  const renderScanProgress = () => {
    if (!activeScan) return null;

    const progress = activeScan.progress?.percentage || 0;
    const status = activeScan.status || 'running';
    const remainingTime = calculateRemainingTime(activeScan);
    const currentStep = activeScan.progress?.currentStep || 'Procesando...';

    return (
      <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <span className="text-blue-800 font-medium">
                Escaneo en progreso
              </span>
              {progress > 0 && (
                <span className="text-blue-600 font-semibold ml-2">
                  {progress.toFixed(1)}%
                </span>
              )}
              <div className="text-sm text-blue-600 mt-1">
                {currentStep}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Tiempo restante */}
            {remainingTime !== null && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Tiempo restante</div>
                <div className="text-lg font-mono font-bold text-blue-700">
                  {formatTime(remainingTime)}
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm"
              >
                Historial
              </button>
              <button
                onClick={handleCancelClick}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                disabled={!activeScan._id}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden" 
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Información adicional */}
        {activeScan.progress && (
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>
              Páginas: {activeScan.progress.urlsScanned || 0} / {activeScan.progress.urlsTotal || '?'}
            </span>
            {activeScan.progress.startTime && (
              <span>
                Iniciado: {new Date(activeScan.progress.startTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-[#181818]">
        {isOwner ? 'Gestión Global de Cookies' : 'Gestión de Cookies'}
      </h1>
      
      {/* Filtros para owner */}
      {isOwner && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de cliente para owners */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={handleClientChange}
                className="w-full border rounded p-2"
              >
                <option value="">Todos los clientes</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name || 'Cliente sin nombre'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Selector de dominios */}
      <DomainSelector 
        domains={domains} 
        selectedDomain={selectedDomain} 
        onSelect={setSelectedDomain} 
      />

      {/* Banner de escaneo activo */}
      {selectedDomain && activeScan && renderScanProgress()}

      {/* Botones para análisis y gestión de cookies */}
      {selectedDomain && (
        <TooltipProvider>
          <div className="my-4 flex flex-wrap gap-3">
            {/* Análisis Completo Button */}
            {/* <div className="flex items-center gap-1">
              <button 
                onClick={handleComprehensiveAnalysis} 
                disabled={loading || activeScan}
                className="px-4 py-2 bg-[#235C88] text-white rounded hover:bg-[#1a4a6b] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Escaneo Básico</span>
                  </>
                )}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700 ml-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-white border-gray-200">
                  <p className="max-w-xs">
                    <strong>Escaneo Básico de Cookies</strong><br />
                    Análisis rápido del sitio web, detecta cookies en páginas principales.
                    Ideal para revisiones rápidas y monitoreo básico.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div> */}

            {/* Análisis Avanzado Button */}
            <div className="flex items-center gap-1">
              <button 
                onClick={handleAdvancedAnalysis} 
                disabled={loading || activeScan}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Análisis Avanzado</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs font-medium">
                  IA
                </span>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700 ml-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-white border-gray-200">
                  <p className="max-w-xs">
                    <strong>Análisis Avanzado con IA</strong><br />
                    Análisis exhaustivo con inteligencia artificial. Detecta cookies, scripts,
                    tecnologías, evalúa compliance GDPR/CCPA, analiza riesgos de privacidad
                    y genera recomendaciones personalizadas.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Crear Cookie Button */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsCreateCookieOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Crear Cookie</span>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700 ml-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-white border-gray-200">
                  <p className="max-w-xs">
                    <strong>Agregar Cookie Manual</strong><br />
                    Registra manualmente una nueva cookie con su categoría, 
                    propósito y duración. Útil para cookies propias 
                    o que no fueron detectadas automáticamente.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Historial Button */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Historial</span>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700 ml-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-white border-gray-200">
                  <p className="max-w-xs">
                    <strong>Historial de Escaneos</strong><br />
                    Visualiza todos los escaneos realizados en este dominio: 
                    completados, en progreso, cancelados y con errores. 
                    Permite cancelar escaneos activos.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Console de Logs Button - Solo para owners */}
            {isOwner && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowLogsConsole(true)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Logs</span>
                  <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs font-medium">
                    DEBUG
                  </span>
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-500 hover:text-gray-700 ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200">
                    <p className="max-w-xs">
                      <strong>Consola de Logs de Escaneo</strong><br />
                      Muestra logs detallados en tiempo real de todos los escaneos activos.
                      Útil para debugging y monitoreo avanzado del sistema.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Botón de limpieza de análisis - Solo para owners */}
            {isOwner && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleForceStopAnalysis}
                  className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900 transition flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Limpiar Análisis</span>
                  <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs font-medium">
                    FORCE
                  </span>
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-500 hover:text-gray-700 ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200">
                    <p className="max-w-xs">
                      <strong>Limpiar Análisis Colgados</strong><br />
                      Fuerza la cancelación de todos los análisis avanzados activos para este dominio.
                      Úsalo cuando un análisis se haya quedado colgado o bloqueado.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Lista de cookies */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      ) : (
        <CookieList 
          cookies={cookies} 
          onViewDetails={handleViewDetails} 
          onDelete={handleDelete} 
          showDomainInfo={isOwner} // Mostrar información de dominio para owners
        />
      )}

      {/* Modal para resultados del escaneo */}
      {isScanModalOpen && scanResults && (
        <CookieScanModal 
          scanResults={scanResults} 
          onClose={() => setIsScanModalOpen(false)}
        />
      )}

      {/* Modal de análisis asíncrono de cookies - Currently not used */}
      {/* {isAnalysisModalOpen && analysisId && (
        <CookieAnalysisModal 
          isOpen={isAnalysisModalOpen}
          onClose={handleAnalysisComplete}
          domainName={selectedDomain?.domain || ''}
          analysisId={analysisId}
        />
      )} */}

      {/* Modal de detalles de cookie */}
      {isCookieDetailsOpen && selectedCookie && (
        <CookieDetailsModal 
          cookie={selectedCookie} 
          onClose={() => setIsCookieDetailsOpen(false)}
          onDelete={handleDelete}
        />
      )}

      {/* Modal para crear cookie */}
      {isCreateCookieOpen && selectedDomain && (
        <CreateCookieModal 
          onClose={() => setIsCreateCookieOpen(false)}
          onCreated={handleCreateCookie}
          domainId={selectedDomain._id}
        />
      )}

      {/* Modal de historial de escaneos */}
      {isHistoryModalOpen && selectedDomain && (
        <CookieScanHistoryModal 
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          domainId={selectedDomain._id}
          domainName={selectedDomain.domain}
        />
      )}

      {/* Modal de confirmación para cancelar escaneo */}
      {showCancelConfirm && activeScan && (
        <CancelScanConfirmModal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelConfirm}
          scanInfo={activeScan}
        />
      )}


      {/* Modal para iniciar nuevo escaneo */}
      {isStartScanModalOpen && selectedDomain && (
        <StartScanModal
          domain={selectedDomain}
          onClose={() => setIsStartScanModalOpen(false)}
          onScanStarted={handleScanStarted}
        />
      )}

      {/* Modal de progreso de escaneo */}
      {isScanProgressModalOpen && activeScan && (
        <ScanProgressModal
          scan={activeScan}
          onClose={() => setIsScanProgressModalOpen(false)}
          onScanCompleted={handleScanCompleted}
          onScanCancelled={handleScanCancelled}
        />
      )}

      {/* Modal para iniciar análisis avanzado */}
      {isAdvancedAnalysisModalOpen && selectedDomain && (
        <AdvancedAnalysisModal
          domain={selectedDomain}
          onClose={() => setIsAdvancedAnalysisModalOpen(false)}
          onAnalysisStarted={handleAdvancedAnalysisStarted}
        />
      )}

      {/* Modal de progreso de análisis avanzado */}
      {isAdvancedProgressModalOpen && currentAdvancedAnalysisId && (
        <AdvancedAnalysisProgressModal
          analysisId={currentAdvancedAnalysisId}
          onClose={() => setIsAdvancedProgressModalOpen(false)}
          onAnalysisCompleted={handleAdvancedAnalysisCompleted}
          onAnalysisCancelled={handleAdvancedAnalysisCancelled}
        />
      )}

      {/* Consola de Logs de Escaneo */}
      <ScanLogsConsole
        isVisible={showLogsConsole}
        onClose={() => setShowLogsConsole(false)}
      />
    </div>
  );
};

export default Cookies;