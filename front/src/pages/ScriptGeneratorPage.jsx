// src/pages/ScriptGeneratorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplate } from '../api/bannerTemplate';
import { 
  generateStandardScript,
  generateIntegratedScript,
  generateInstallationCode
} from '../api/scriptGenerator';
import { 
  getDomains,
  setDomainDefaultTemplate
} from '../api/domain';
import { Copy, Check, Code, Eye, Download, X } from 'lucide-react';

function ScriptGeneratorPage() {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [bannerData, setBannerData] = useState(null);
  const [scriptType, setScriptType] = useState('standard'); // standard, integrated, installation
  const [showPreview, setShowPreview] = useState(false);
  
  // Estados para la selección de dominio
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainError, setDomainError] = useState(null);

  useEffect(() => {
    // Cargar la información del banner
    async function loadBannerData() {
      try {
        const response = await getTemplate(bannerId);
        setBannerData(response.data.template);
      } catch (err) {
        setError(`Error al cargar el banner: ${err.message}`);
      }
    }

    loadBannerData();
  }, [bannerId]);
  
  // Cargamos la lista de dominios
  useEffect(() => {
    async function loadDomains() {
      try {
        setDomainsLoading(true);
        setDomainError(null);
        const response = await getDomains();
        setDomains(response.data.domains || []);
      } catch (err) {
        setDomainError(`Error al cargar dominios: ${err.message}`);
      } finally {
        setDomainsLoading(false);
      }
    }
    
    loadDomains();
  }, []);

  // Función mejorada para manejar la selección de dominio
  const handleDomainSelection = async (domain) => {
    try {
      setSelectedDomain(domain);
      setShowDomainModal(false);
      setError(null);
      
      // Asignar el banner actual como plantilla predeterminada
      await setDomainDefaultTemplate(domain._id, bannerId);
      console.log(`Banner ${bannerId} asignado como predeterminado para el dominio ${domain.domain}`);
    } catch (err) {
      console.error('Error al asignar plantilla:', err);
      setError(`Se seleccionó el dominio, pero hubo un error al asignar la plantilla: ${err.message}`);
    }
  };

  // Función para mostrar el modal y seleccionar un dominio
  const handleSelectDomain = () => {
    if (domains.length === 0) {
      setDomainError("No hay dominios disponibles. Primero debes crear un dominio.");
      return;
    }
    setShowDomainModal(true);
  };

  // Función para generar script cuando se ha seleccionado un dominio
  const generateScript = async () => {
    if (!bannerData || !selectedDomain) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (scriptType) {
        case 'standard':
          response = await generateStandardScript(selectedDomain._id, bannerId);
          setScript(response.data.script);
          break;
        case 'integrated':
          response = await generateIntegratedScript(selectedDomain._id, bannerId);
          setScript(response.data.script);
          break;
        case 'installation':
          response = await generateInstallationCode(selectedDomain._id);
          setScript(response.data.installCode);
          break;
        default:
          response = await generateStandardScript(selectedDomain._id, bannerId);
          setScript(response.data.script);
      }
    } catch (err) {
      setError(`Error al generar el script: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Ejecutar generación del script cuando cambia el tipo o el dominio seleccionado
  useEffect(() => {
    if (selectedDomain) {
      generateScript();
    }
  }, [scriptType, selectedDomain]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const fileName = `banner-consent-${scriptType}-${bannerId}.js`;
    const blob = new Blob([script], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // Modal de selección de dominio
  const DomainSelectionModal = () => {
    if (!showDomainModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Seleccionar Dominio</h3>
            <button 
              onClick={() => setShowDomainModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          {domainsLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : domainError ? (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
              {domainError}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {domains.length === 0 ? (
                <p className="text-gray-500 text-center p-4">
                  No hay dominios disponibles. Debes crear un dominio primero.
                </p>
              ) : (
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div 
                      key={domain._id}
                      onClick={() => handleDomainSelection(domain)}
                      className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${
                        selectedDomain?._id === domain._id ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <div className="font-medium">{domain.name || domain.domain}</div>
                      <div className="text-sm text-gray-500">{domain.domain}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowDomainModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 mr-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => navigate('/dashboard/domains/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Crear Nuevo Dominio
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Generador de Script para Banner</h1>
        <button 
          onClick={() => navigate('/dashboard/banners')}
          className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          Volver a Banners
        </button>
      </div>

      {bannerData && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">{bannerData.name}</h2>
          <p className="text-gray-600 mb-4">
            ID: {bannerId} | Última modificación: {new Date(bannerData.updatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
      
      {/* Sección para seleccionar dominio */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Selección de Dominio</h3>
        <p className="text-gray-600 mb-4">
          Para generar el script, primero debes seleccionar el dominio donde se implementará.
        </p>
        
        {selectedDomain ? (
          <div className="flex justify-between items-center p-3 border rounded bg-blue-50 mb-4">
            <div>
              <div className="font-medium">{selectedDomain.name || selectedDomain.domain}</div>
              <div className="text-sm text-gray-500">{selectedDomain.domain}</div>
            </div>
            <button
              onClick={handleSelectDomain}
              className="px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-100"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <button
            onClick={handleSelectDomain}
            className="w-full py-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 mb-4"
          >
            Seleccionar un dominio
          </button>
        )}
        
        {domainError && !showDomainModal && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
            {domainError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Tipo de Script</h3>
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setScriptType('standard')}
            className={`px-4 py-2 rounded ${
              scriptType === 'standard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={!selectedDomain}
          >
            Estándar
          </button>
          <button
            onClick={() => setScriptType('integrated')}
            className={`px-4 py-2 rounded ${
              scriptType === 'integrated' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={!selectedDomain}
          >
            Con scripts integrados
          </button>
          <button
            onClick={() => setScriptType('installation')}
            className={`px-4 py-2 rounded ${
              scriptType === 'installation' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={!selectedDomain}
          >
            Código de instalación
          </button>
        </div>
        
        {!selectedDomain && (
          <div className="bg-yellow-50 text-yellow-700 p-3 rounded mb-4">
            Selecciona un dominio para generar el script.
          </div>
        )}
        
        <div className="flex items-center justify-end gap-3 mb-2">
          <button
            onClick={handleCopyScript}
            disabled={loading || !script || !selectedDomain}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownloadScript}
            disabled={loading || !script || !selectedDomain}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
          >
            <Download size={16} />
            Descargar
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={!script || !selectedDomain}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <Eye size={16} />
            {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading && selectedDomain ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : script ? (
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              <code>{script}</code>
            </pre>
          </div>
        ) : selectedDomain ? (
          <div className="bg-gray-50 p-6 text-center text-gray-500 rounded">
            El script se generará aquí
          </div>
        ) : null}
      </div>

      {showPreview && script && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Vista Previa</h3>
          <div className="border rounded-lg overflow-hidden h-96">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Preview</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      padding: 20px;
                      margin: 0;
                    }
                    h1 {
                      margin-top: 0;
                      font-size: 24px;
                    }
                    
                    /* Para asegurar que el banner sea visible */
                    #cmp-container, #cmp-banner, .cmp-banner {
                      position: fixed !important; 
                      bottom: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      z-index: 9999 !important;
                      display: block !important;
                      opacity: 1 !important;
                      visibility: visible !important;
                    }
                  </style>
                  <!-- Script de instalación si ese es el tipo -->
                  ${scriptType === 'installation' ? script : ''}
                  <script>
                    // Interceptar peticiones para evitar errores CORS y 401
                    const originalFetch = window.fetch;
                    const originalXHROpen = XMLHttpRequest.prototype.open;
                    
                    // Interceptar fetch
                    window.fetch = function(url, options) {
                      // Para peticiones a la API, simular respuestas
                      if (url.includes('/api/v1/consent/')) {
                        console.log('[Preview] Interceptando fetch a:', url);
                        
                        // Diferentes mocks según el endpoint
                        if (url.includes('/country-detection')) {
                          return Promise.resolve(new Response(JSON.stringify({
                            status: 'success',
                            data: { gdprApplies: true, countryCode: 'ES' }
                          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                        
                        if (url.includes('/vendor/list')) {
                          return Promise.resolve(new Response(JSON.stringify({
                            status: 'success',
                            data: { 
                              vendors: { "1": { name: "Google" }, "2": { name: "Facebook" } },
                              purposes: { "1": { name: "Storage" }, "2": { name: "Basic Ads" } }
                            }
                          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                        
                        if (url.includes('/decode')) {
                          return Promise.resolve(new Response(JSON.stringify({
                            status: 'success',
                            data: { 
                              decoded: {
                                purposes: {},
                                vendors: {},
                                specialFeatures: {}
                              }
                            }
                          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                        
                        if (url.includes('/domain/')) {
                          return Promise.resolve(new Response(JSON.stringify({
                            status: 'success',
                            data: { consent: { status: 'valid' } }
                          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                      }
                      
                      // Para otros URLs, usar el fetch normal
                      return originalFetch(url, options);
                    };
                    
                    // Interceptar XMLHttpRequest
                    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                      if (url.includes('/api/v1/consent/')) {
                        console.log('[Preview] Interceptando XHR a:', url);
                        // Redirigir a un URL que será interceptado por fetch
                        url = 'https://preview-mock.local/api' + url.split('/api')[1];
                      }
                      return originalXHROpen.call(this, method, url, ...rest);
                    };
                    
                    // Forzar visualización del banner después de la carga
                    window.addEventListener('load', function() {
                      console.log('[Preview] Página cargada, intentando mostrar banner...');
                      
                      setTimeout(function() {
                        if (window.CMP) {
                          console.log('[Preview] CMP disponible, mostrando banner...');
                          window.CMP.showBanner();
                          
                          // Forzar visibilidad del banner
                          const bannerElements = document.querySelectorAll('#cmp-banner, #cmp-container, .cmp-banner');
                          bannerElements.forEach(el => {
                            if (el) {
                              el.style.display = 'block';
                              el.style.visibility = 'visible';
                              el.style.opacity = '1';
                              console.log('[Preview] Elemento forzado visible:', el.id || el.className);
                            }
                          });
                        } else {
                          console.error('[Preview] CMP no disponible después de 1 segundo');
                          document.getElementById('debug-output').innerHTML = '<p>Error: CMP no disponible después de 1 segundo</p>';
                        }
                      }, 1000);
                    });
                  </script>
                </head>
                <body>
                  <h1>Página de ejemplo</h1>
                  <p>Este es un ejemplo de cómo se vería tu banner de consentimiento en una página web.</p>
                  
                  <!-- Script del banner si no es de instalación -->
                  ${scriptType !== 'installation' ? `<script>${script}</script>` : ''}
                  
                  <!-- Panel de depuración -->
                  <div style="margin-top: 20px; padding: 10px; border: 1px solid #ddd;">
                    <h3>Herramientas de depuración:</h3>
                    <div id="debug-output"></div>
                    <button onclick="if(window.CMP) { window.CMP.showBanner(); document.getElementById('debug-output').innerHTML = '<p>Banner mostrado manualmente</p>'; }">Mostrar Banner</button>
                    <button onclick="if(window.CMP) { window.CMP.showPreferences(); document.getElementById('debug-output').innerHTML = '<p>Panel de preferencias mostrado</p>'; }">Mostrar Preferencias</button>
                    <button onclick="document.getElementById('debug-output').innerHTML = '<p>CMP disponible: ' + (window.CMP ? 'Sí' : 'No') + '</p>'">Verificar CMP</button>
                  </div>
                </body>
                </html>
              `}
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      )}

      {script && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4">Instrucciones de implementación</h3>
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">1. Copia el script</h4>
            <p className="text-gray-600">Copia el código generado utilizando el botón "Copiar" arriba.</p>
          </div>
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">2. Inserta el script en tu página web</h4>
            <p className="text-gray-600 mb-2">
              {scriptType === 'installation' 
                ? 'Inserta este código justo antes del cierre de la etiqueta </head> en todas las páginas donde quieras mostrar el banner.' 
                : 'Crea un archivo JavaScript con este contenido y súbelo a tu servidor. Luego, inclúyelo en tu sitio web con una etiqueta script.'}
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm">
              {scriptType === 'installation' 
                ? '<!-- Dentro de la etiqueta <head> -->\n' + (script || '<!-- Código de instalación aquí -->')
                : `<script src="ruta/a/tu-banner-script.js"></script>`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">3. Verifica la implementación</h4>
            <p className="text-gray-600">
              Comprueba que el banner se muestra correctamente en tu sitio web y que todas las funcionalidades de consentimiento funcionan adecuadamente.
            </p>
          </div>
        </div>
      )}
      
      {/* Modal de selección de dominio */}
      <DomainSelectionModal />
    </div>
  );
}

export default ScriptGeneratorPage;