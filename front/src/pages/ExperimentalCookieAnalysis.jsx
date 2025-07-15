import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Play, 
  GitCompare, 
  Settings, 
  Zap, 
  Shield, 
  Eye, 
  Network,
  Info,
  AlertTriangle,
  Globe,
  RefreshCw
} from 'lucide-react';

import CookieAnalysisV2Results from '../components/experimental/CookieAnalysisV2Results';
import ComparisonResults from '../components/experimental/ComparisonResults';
import CustomDomainSelector from '../components/domain/CustomDomainSelector';
import experimentalCookieAnalysisAPI from '../api/experimentalCookieAnalysis';
import { getDomains } from '../api/domain';
import { useAuth } from '../contexts/AuthContext';

const ExperimentalCookieAnalysis = () => {
  const [domain, setDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const { hasRole } = useAuth();
  
  // Verificar si el usuario es owner
  const isOwner = hasRole('owner');
  
  // Estados para análisis V2
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  
  // Estados para comparación
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);

  // Opciones de análisis
  const [analysisOptions, setAnalysisOptions] = useState({
    scannerType: 'superfast', // 'superfast' o 'ultra'
    timeout: 30000,
    waitTime: 3000, // Cambiar waitFor por waitTime
    scrollDepth: 3,
    enableFingerprinting: true,
    enableStorageDetection: true,
    enableJavaScriptAnalysis: true,
    enableNetworkAnalysis: true
  });

  // Estado para detectar problemas de autenticación
  const [authError, setAuthError] = useState(false);
  const [testingMode, setTestingMode] = useState(false);

  // Cargar dominios disponibles al montar el componente y cuando cambie isOwner
  useEffect(() => {
    loadAvailableDomains();
  }, [isOwner]);

  const loadAvailableDomains = async () => {
    setDomainsLoading(true);
    try {
      // Si es owner, obtener todos los dominios sin filtros restrictivos
      const params = {};
      
      // Solo aplicar límite alto si es owner, sino usar límite por defecto
      if (isOwner) {
        params.limit = 1000; // Límite alto para owners
      } else {
        params.limit = 100;
      }
      
      console.log('🔍 Cargando dominios para experimental:', { isOwner, params });
      
      const response = await getDomains(params);
      const domains = response.data.domains || [];
      
      console.log('📊 Dominios cargados:', {
        total: domains.length,
        dominios: domains.map(d => ({ id: d._id, domain: d.domain, status: d.status })),
        isOwnerLoad: isOwner
      });
      
      setAvailableDomains(domains);
      setAuthError(false); // Si cargan correctamente, no hay error de auth
    } catch (error) {
      console.error('Error loading domains:', error);
      
      // Detectar errores de autenticación
      if (error.message?.includes('autenticado') || error.response?.status === 401) {
        setAuthError(true);
        setTestingMode(true);
        console.log('🧪 Modo testing activado por error de autenticación');
      }
    } finally {
      setDomainsLoading(false);
    }
  };

  const handleDomainSelect = (domainObj) => {
    setSelectedDomain(domainObj);
    if (domainObj) {
      setDomain(domainObj.domain);
    } else {
      setDomain('');
    }
  };

  const handleManualDomainChange = (value) => {
    setDomain(value);
    setSelectedDomain(null); // Limpiar selección si se escribe manualmente
  };

  const handleAnalysisSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDomain?._id && !domain.trim()) {
      setAnalysisError('Por favor selecciona un dominio o escribe uno manualmente');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      let domainToAnalyze;
      
      if (selectedDomain?._id) {
        // Usar dominio seleccionado del dropdown
        domainToAnalyze = selectedDomain._id;
        console.log('🎯 Analizando dominio seleccionado:', { 
          id: selectedDomain._id, 
          domain: selectedDomain.domain 
        });
      } else if (domain.trim()) {
        // Para dominio manual, crear un registro temporal o buscar si existe
        const manualDomain = domain.trim();
        console.log('📝 Analizando dominio manual:', manualDomain);
        
        // Buscar si el dominio manual ya existe en la lista
        const existingDomain = availableDomains.find(d => 
          d.domain.toLowerCase() === manualDomain.toLowerCase()
        );
        
        if (existingDomain) {
          domainToAnalyze = existingDomain._id;
          console.log('✅ Dominio manual encontrado en BD:', existingDomain);
        } else {
          // Para dominios manuales, usar la API de escaneo de URL
          console.log('🌐 Usando API de escaneo de URL para dominio manual:', manualDomain);
          
          const result = await experimentalCookieAnalysisAPI.scanURL(manualDomain, {
            ...analysisOptions,
            saveToDatabase: false // No guardar en BD por defecto para URLs manuales
          });
          
          setAnalysisResult(result);
          return; // Salir aquí porque ya tenemos el resultado
        }
      }
      
      const result = await experimentalCookieAnalysisAPI.scanDomain(domainToAnalyze, analysisOptions);
      setAnalysisResult(result);
      
    } catch (error) {
      console.error('Error en análisis:', error);
      setAnalysisError(error.response?.data?.message || error.message || 'Error en el análisis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleComparisonSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDomain?._id && !domain.trim()) {
      setComparisonError('Por favor selecciona un dominio para comparar');
      return;
    }

    setComparisonLoading(true);
    setComparisonError(null);
    setComparisonResult(null);

    try {
      let domainToCompare;
      
      if (selectedDomain?._id) {
        // Usar dominio seleccionado del dropdown
        domainToCompare = selectedDomain._id;
        console.log('🎯 Comparando dominio seleccionado:', { 
          id: selectedDomain._id, 
          domain: selectedDomain.domain 
        });
      } else if (domain.trim()) {
        // Buscar dominio manual en la lista disponible
        const manualDomain = domain.trim();
        const existingDomain = availableDomains.find(d => 
          d.domain.toLowerCase() === manualDomain.toLowerCase()
        );
        
        if (existingDomain) {
          domainToCompare = existingDomain._id;
          console.log('✅ Dominio manual encontrado para comparación:', existingDomain);
        } else {
          setComparisonError('Para comparación se requiere un dominio registrado en el sistema. Por favor selecciona uno de la lista.');
          return;
        }
      }
      
      const result = await experimentalCookieAnalysisAPI.compareSystems(domainToCompare);
      setComparisonResult(result);
      
    } catch (error) {
      console.error('Error en comparación:', error);
      setComparisonError(error.response?.data?.message || error.message || 'Error en la comparación');
    } finally {
      setComparisonLoading(false);
    }
  };

  const updateAnalysisOption = (key, value) => {
    setAnalysisOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Si hay error de autenticación, mostrar interfaz de testing simplificada
  if (authError && testingMode) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold">Análisis Experimental de Cookies V2</h1>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              MODO TESTING
            </Badge>
          </div>
          <p className="text-gray-600 mb-4">
            Sistema avanzado de análisis de cookies - Modo de testing sin autenticación
          </p>
          
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              🧪 <strong>Modo Testing Activado:</strong> Para usar todas las funciones, por favor inicia sesión. 
              En modo testing puedes probar el sistema experimental con URLs manuales.
            </AlertDescription>
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Prueba Rápida del Sistema (Sin Autenticación)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="manual-url">URL de Prueba</Label>
              <Input
                id="manual-url"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://ejemplo.com"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Ingresa cualquier URL para probar el sistema experimental
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  // Simular análisis experimental
                  console.log('🧪 Modo testing - analizaría:', domain);
                  alert(`🧪 En modo testing. El sistema analizaría: ${domain}\n\nPara usar realmente el sistema, por favor inicia sesión.`);
                }}
                disabled={!domain || analysisLoading}
                className="flex-1"
              >
                {analysisLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Probando Sistema...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Probar Sistema Experimental
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">¿Qué hace este sistema?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Detecta más de 100 tipos de cookies diferentes</li>
                <li>• Utiliza 8 métodos simultáneos de detección</li>
                <li>• Clasifica automáticamente según GDPR</li>
                <li>• Identifica cookies de más de 500 proveedores</li>
                <li>• Genera reportes de cumplimiento detallados</li>
              </ul>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Para acceder a todas las funciones, <strong>inicia sesión</strong> en tu cuenta. 
                Los usuarios registrados pueden analizar sus dominios y guardar resultados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Análisis Experimental de Cookies V2</h1>
          <Badge variant="outline" className="bg-blue-50">
            EXPERIMENTAL
          </Badge>
        </div>
        <p className="text-gray-600">
          Sistema avanzado de análisis de cookies con detección mejorada, clasificación ML y evaluación de cumplimiento
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Nota:</strong> Este es un sistema experimental separado del análisis principal. 
          Utiliza métodos avanzados de detección incluyendo fingerprinting, análisis de red, y clasificación inteligente.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Análisis V2
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Comparación V1 vs V2
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab de Análisis V2 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Análisis Avanzado V2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalysisSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Label>Seleccionar Dominio</Label>
                  
                  {/* Selector de dominios */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomDomainSelector
                        domains={availableDomains}
                        selectedDomain={selectedDomain}
                        onSelect={handleDomainSelect}
                      />
                      {/* Información de debug */}
                      <div className="text-xs text-gray-500 mt-1">
                        {domainsLoading ? 'Cargando dominios...' : 
                          `${availableDomains.length} dominios disponibles ${isOwner ? '(como owner)' : ''}`
                        }
                        {selectedDomain && (
                          <div className="text-green-600 mt-1">
                            ✅ Seleccionado: {selectedDomain.domain} (ID: {selectedDomain._id})
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={loadAvailableDomains}
                      disabled={domainsLoading}
                      className="h-10"
                    >
                      <RefreshCw className={`h-4 w-4 ${domainsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {/* Input manual como alternativa */}
                  <div>
                    <Label htmlFor="domain-analysis" className="text-sm text-gray-600">
                      O escribe un dominio manualmente (para testing)
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="domain-analysis"
                        type="text"
                        placeholder="ejemplo.com"
                        value={domain}
                        onChange={(e) => handleManualDomainChange(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        disabled={analysisLoading || !domain.trim()}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {analysisLoading ? 'Analizando...' : 'Analizar'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Selector de tipo de scanner */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-sm font-medium text-blue-800 mb-2 block">Tipo de Scanner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateAnalysisOption('scannerType', 'superfast')}
                      className={`p-3 rounded-md text-sm font-medium transition-colors ${
                        analysisOptions.scannerType === 'superfast'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      ⚡ SuperFast
                      <div className="text-xs opacity-80 mt-1">
                        {analysisOptions.scannerType === 'superfast' ? '100+ cookies' : 'Rápido'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAnalysisOption('scannerType', 'ultra')}
                      className={`p-3 rounded-md text-sm font-medium transition-colors ${
                        analysisOptions.scannerType === 'ultra'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      🚀 Ultra
                      <div className="text-xs opacity-80 mt-1">
                        {analysisOptions.scannerType === 'ultra' ? 'Análisis profundo' : 'Completo'}
                      </div>
                    </button>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    {analysisOptions.scannerType === 'superfast' 
                      ? '🔥 RECOMENDADO: Detecta 100+ cookies con 8 métodos simultáneos' 
                      : '⏱️ Análisis exhaustivo con CDP, puede tardar hasta 3 minutos'
                    }
                  </div>
                </div>

                {/* Opciones rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="fingerprinting"
                      checked={analysisOptions.enableFingerprinting}
                      onCheckedChange={(checked) => updateAnalysisOption('enableFingerprinting', checked)}
                    />
                    <Label htmlFor="fingerprinting" className="text-sm">Fingerprinting</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="storage"
                      checked={analysisOptions.enableStorageDetection}
                      onCheckedChange={(checked) => updateAnalysisOption('enableStorageDetection', checked)}
                    />
                    <Label htmlFor="storage" className="text-sm">Storage APIs</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="javascript"
                      checked={analysisOptions.enableJavaScriptAnalysis}
                      onCheckedChange={(checked) => updateAnalysisOption('enableJavaScriptAnalysis', checked)}
                    />
                    <Label htmlFor="javascript" className="text-sm">JavaScript</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="network"
                      checked={analysisOptions.enableNetworkAnalysis}
                      onCheckedChange={(checked) => updateAnalysisOption('enableNetworkAnalysis', checked)}
                    />
                    <Label htmlFor="network" className="text-sm">Red</Label>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Resultados del Análisis V2 */}
          <CookieAnalysisV2Results 
            analysisResult={analysisResult}
            isLoading={analysisLoading}
            error={analysisError}
          />
        </TabsContent>

        {/* Tab de Comparación */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-purple-600" />
                Comparación de Sistemas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleComparisonSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Label>Seleccionar Dominio para Comparar</Label>
                  
                  {/* Selector de dominios */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomDomainSelector
                        domains={availableDomains}
                        selectedDomain={selectedDomain}
                        onSelect={handleDomainSelect}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={loadAvailableDomains}
                      disabled={domainsLoading}
                      className="h-10"
                    >
                      <RefreshCw className={`h-4 w-4 ${domainsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {/* Input manual como alternativa */}
                  <div>
                    <Label htmlFor="domain-comparison" className="text-sm text-gray-600">
                      O escribe un dominio manualmente
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="domain-comparison"
                        type="text"
                        placeholder="ejemplo.com"
                        value={domain}
                        onChange={(e) => handleManualDomainChange(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        disabled={comparisonLoading || !domain.trim()}
                        className="flex items-center gap-2"
                      >
                        <GitCompare className="h-4 w-4" />
                        {comparisonLoading ? 'Comparando...' : 'Comparar'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta comparación ejecutará ambos sistemas (V1 y V2) simultáneamente en el mismo dominio.
                    Puede tomar hasta 2 minutos completarse.
                  </AlertDescription>
                </Alert>
              </form>
            </CardContent>
          </Card>

          {/* Resultados de la Comparación */}
          <ComparisonResults 
            comparisonResult={comparisonResult}
            isLoading={comparisonLoading}
            error={comparisonError}
          />
        </TabsContent>

        {/* Tab de Configuración */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                Configuración Avanzada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeouts */}
              <div className="space-y-4">
                <h4 className="font-medium">Timeouts y Esperas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeout">Timeout Total (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={analysisOptions.timeout}
                      onChange={(e) => updateAnalysisOption('timeout', parseInt(e.target.value))}
                      min="5000"
                      max="120000"
                      step="1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waitTime">Espera Inicial (ms)</Label>
                    <Input
                      id="waitTime"
                      type="number"
                      value={analysisOptions.waitTime}
                      onChange={(e) => updateAnalysisOption('waitTime', parseInt(e.target.value))}
                      min="1000"
                      max="10000"
                      step="500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="scrollDepth">Profundidad de Scroll</Label>
                    <Input
                      id="scrollDepth"
                      type="number"
                      value={analysisOptions.scrollDepth}
                      onChange={(e) => updateAnalysisOption('scrollDepth', parseInt(e.target.value))}
                      min="1"
                      max="10"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Métodos de Detección */}
              <div className="space-y-4">
                <h4 className="font-medium">Métodos de Detección</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Fingerprinting</div>
                        <div className="text-sm text-gray-600">Detecta cookies mediante técnicas de fingerprinting</div>
                      </div>
                    </div>
                    <Switch
                      checked={analysisOptions.enableFingerprinting}
                      onCheckedChange={(checked) => updateAnalysisOption('enableFingerprinting', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">Storage APIs</div>
                        <div className="text-sm text-gray-600">Monitorea localStorage, sessionStorage, IndexedDB</div>
                      </div>
                    </div>
                    <Switch
                      checked={analysisOptions.enableStorageDetection}
                      onCheckedChange={(checked) => updateAnalysisOption('enableStorageDetection', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <div>
                        <div className="font-medium">JavaScript Runtime</div>
                        <div className="text-sm text-gray-600">Analiza la ejecución de JavaScript en tiempo real</div>
                      </div>
                    </div>
                    <Switch
                      checked={analysisOptions.enableJavaScriptAnalysis}
                      onCheckedChange={(checked) => updateAnalysisOption('enableJavaScriptAnalysis', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Network className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">Análisis de Red</div>
                        <div className="text-sm text-gray-600">Intercepta y analiza requests HTTP/HTTPS</div>
                      </div>
                    </div>
                    <Switch
                      checked={analysisOptions.enableNetworkAnalysis}
                      onCheckedChange={(checked) => updateAnalysisOption('enableNetworkAnalysis', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Información del Sistema */}
              <div className="space-y-4">
                <h4 className="font-medium">Información del Sistema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">Versión del Sistema</div>
                    <div className="text-gray-600">V2.0.0-experimental</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">Métodos de Detección</div>
                    <div className="text-gray-600">8 métodos avanzados</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">Base de Datos de Proveedores</div>
                    <div className="text-gray-600">500+ proveedores conocidos</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">Regulaciones Soportadas</div>
                    <div className="text-gray-600">GDPR, CCPA, PECR, LGPD</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExperimentalCookieAnalysis;