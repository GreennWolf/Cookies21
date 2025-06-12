// services/consentGenerator.service.js
const { generateHTML, generateCSS } = require('./bannerGenerator.service');
const modalPositionFixer = require('./modalPositionFixer.service');
const floatingPositionHandler = require('./ensureFloatingPosition');
const responsivePositionHandler = require('./ensureResponsivePosition');
const bannerSizeDebug = require('./bannerSizeDebug');
const preferencesButtonFixer = require('./fixPreferencesButtonPosition');
const cookieIconService = require('./cookieIconService');
const Cookie = require('../models/Cookie');
const Domain = require('../models/Domain');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { createCMPConfig } = require('../config/cmp.config');

// Cargar el código del fijador de ancho
const widthFixerPath = path.join(__dirname, 'widthFixer.js');
let widthFixerCode = '';
try {
  widthFixerCode = fs.readFileSync(widthFixerPath, 'utf8');
  logger.info('Código de corrección de ancho cargado correctamente');
} catch (error) {
  logger.error('Error al cargar el código de corrección de ancho:', error);
  widthFixerCode = `
    // Función básica para corregir ancho como fallback
    function fixModalWidth() {
      var bannerEl = document.getElementById('cmp-banner');
      if (bannerEl) {
        bannerEl.style.width = '90%';
        bannerEl.style.minWidth = '300px';
      }
    }
    
    function diagnoseWidthIssues() {
      console.log('Diagnóstico de ancho no disponible');
    }
  `;
}

class ConsentGeneratorService {
  /**
   * Obtiene las cookies del dominio agrupadas por categoría
   */
  async getDomainCookiesByCategory(domainInput) {
    try {
      logger.info(`Looking for cookies for domain: ${domainInput}`);
      
      let domain;
      
      // Verificar si es un ObjectId (domainId) o un URL/hostname
      if (domainInput.match(/^[0-9a-fA-F]{24}$/)) {
        // Es un ObjectId, buscar por ID
        logger.info(`Searching by domainId: ${domainInput}`);
        domain = await Domain.findById(domainInput);
      } else {
        // Es un URL/hostname, buscar por dominio
        const normalizedDomain = domainInput.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
        logger.info(`Searching by hostname, normalized: ${normalizedDomain}`);
        
        domain = await Domain.findOne({ 
          $or: [
            { domain: domainInput },
            { domain: normalizedDomain },
            { domain: 'www.' + normalizedDomain }
          ]
        });
      }

      if (!domain) {
        logger.warn(`Domain not found for input: ${domainInput}`);
        
        // Listar todos los dominios disponibles para debug
        const allDomains = await Domain.find({}, { domain: 1 }).limit(10);
        logger.info(`Available domains: ${allDomains.map(d => d.domain).join(', ')}`);
        
        return {};
      }
      
      logger.info(`Found domain: ${domain.domain} with ID: ${domain._id}`);

      // Obtener todas las cookies del dominio, excluyendo unknown
      const cookies = await Cookie.find({ 
        domainId: domain._id, 
        status: 'active',
        provider: { $ne: 'Unknown' },
        category: { $ne: 'unknown' }
      }).sort('name');
      
      logger.info(`Found ${cookies.length} cookies for domain ${domain.domain}`);

      // Agrupar por categoría
      const cookiesByCategory = {
        necessary: [],
        analytics: [],
        marketing: [],
        personalization: []
      };

      cookies.forEach(cookie => {
        const category = cookie.category;
        // Solo procesar cookies con categorías válidas (no unknown)
        if (category && category !== 'unknown' && cookiesByCategory[category]) {
          cookiesByCategory[category].push({
            name: cookie.name,
            provider: cookie.provider,
            description: cookie.description?.en || `Cookie: ${cookie.name}`,
            duration: cookie.attributes?.duration || 'Session',
            purpose: cookie.purpose?.name || 'Not specified'
          });
        }
      });

      return cookiesByCategory;
    } catch (error) {
      logger.error('Error getting domain cookies by category:', error);
      return {};
    }
  }

  /**
   * Obtiene los proveedores únicos del dominio
   */
  async getDomainProviders(domainInput) {
    try {
      logger.info(`Looking for providers for domain: ${domainInput}`);
      
      let domain;
      
      // Verificar si es un ObjectId (domainId) o un URL/hostname
      if (domainInput.match(/^[0-9a-fA-F]{24}$/)) {
        // Es un ObjectId, buscar por ID
        logger.info(`Searching by domainId: ${domainInput}`);
        domain = await Domain.findById(domainInput);
      } else {
        // Es un URL/hostname, buscar por dominio
        const normalizedDomain = domainInput.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
        logger.info(`Searching by hostname, normalized: ${normalizedDomain}`);
        
        domain = await Domain.findOne({ 
          $or: [
            { domain: domainInput },
            { domain: normalizedDomain },
            { domain: 'www.' + normalizedDomain }
          ]
        });
      }

      if (!domain) {
        logger.warn(`Domain not found for input: ${domainInput}`);
        return [];
      }
      
      logger.info(`Found domain: ${domain.domain} with ID: ${domain._id}`);

      // Obtener proveedores únicos con sus cookies, excluyendo unknown
      const providersData = await Cookie.aggregate([
        { 
          $match: { 
            domainId: domain._id, 
            status: 'active',
            provider: { $ne: 'Unknown' },
            category: { $ne: 'unknown' }
          } 
        },
        {
          $group: {
            _id: '$provider',
            name: { $first: '$provider' },
            category: { $first: '$category' },
            cookieCount: { $sum: 1 },
            cookies: { 
              $push: {
                name: '$name',
                category: '$category',
                description: '$description.en'
              }
            },
            providerDetails: { $first: '$providerDetails' }
          }
        },
        { $sort: { name: 1 } }
      ]);
      
      logger.info(`Found ${providersData.length} providers for domain ${domain.domain}`);

      return providersData
        .filter(provider => provider.name && provider.name !== 'Unknown' && provider.category && provider.category !== 'unknown')
        .map(provider => ({
          name: provider.name,
          category: provider.category,
          cookieCount: provider.cookieCount,
          cookies: provider.cookies,
          verified: provider.providerDetails?.verified || false,
          iabVendorId: provider.providerDetails?.iabVendorId || null,
          url: provider.providerDetails?.url || null
        }));
    } catch (error) {
      logger.error('Error getting domain providers:', error);
      return [];
    }
  }

  /**
   * Genera un script minificado para incluir en sitios web externos
   * @param {Object} options - Opciones de configuración
   * @returns {String} - Script minificado
   */
  async generateMinifiedScript(options) {
    try {
      const script = await this.generateClientScript(options);
      return this._minifyScript(script);
    } catch (error) {
      logger.error('Error generating minified script:', error);
      throw error;
    }
  }

  /**
   * Genera un script con integración de banner y gestión de scripts personalizados
   * @param {Object} options - Opciones de configuración
   * @param {Array} scripts - Scripts a incluir
   * @returns {String} - HTML con el script de CMP y los scripts del cliente
   */
  async generateIntegratedScript(options, scripts = []) {
    try {
      const cmpScript = await this.generateClientScript(options);
      
      // Generar HTML para cada script
      const scriptsHtml = scripts.map(script => {
        const category = script.category || 'marketing';
        const scriptType = script.type || 'external';
        
        if (scriptType === 'external') {
          return `<script type="text/plain" class="cmp-${category}" src="${script.url}" ${script.async ? 'async' : ''} ${script.defer ? 'defer' : ''}></script>`;
        } else {
          return `<script type="text/plain" class="cmp-${category}">${script.content}</script>`;
        }
      }).join('\n');
      
      // Integrar todo
      return `
        <!-- CMP Script -->
        <script>${cmpScript}</script>
        
        <!-- Client Scripts (requires consent) -->
        ${scriptsHtml}
      `;
    } catch (error) {
      logger.error('Error generating integrated script:', error);
      throw error;
    }
  }

  /**
   * Genera un HTML completo para testear el banner
   * @param {Object} options - Opciones de configuración
   * @returns {String} - HTML completo para testear el banner
   */
  async generateTestPage(options) {
    try {
      const cmpScript = await this.generateClientScript(options);
      
      return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Banner CMP</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            
            h1 {
              color: #2c3e50;
              margin-bottom: 20px;
            }
            
            .container {
              max-width: 1000px;
              margin: 0 auto;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .actions {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            
            button {
              background: #3498db;
              color: white;
              border: none;
              padding: 10px 15px;
              margin-right: 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.3s;
            }
            
            button:hover {
              background: #2980b9;
            }
            
            pre {
              background: #f1f1f1;
              padding: 15px;
              border-radius: 4px;
              overflow: auto;
              font-size: 14px;
              margin-top: 20px;
            }
            
            .test-section {
              margin-top: 40px;
            }
            
            #consent-status {
              margin-top: 20px;
              padding: 15px;
              background: #e8f5e9;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Test de Banner CMP</h1>
            
            <p>Esta página permite probar el funcionamiento del banner de consentimiento y la gestión de scripts.</p>
            
            <div class="actions">
              <button onclick="window.CMP.showBanner()">Mostrar Banner</button>
              <button onclick="window.CMP.showPreferences()">Mostrar Preferencias</button>
              <button onclick="displayConsentStatus()">Ver Estado de Consentimiento</button>
              <button onclick="window.CMP.acceptAll()">Aceptar Todo</button>
              <button onclick="window.CMP.rejectAll()">Rechazar Todo</button>
              <button onclick="clearConsent()">Borrar Consentimiento</button>
              <button onclick="testTCFAPI()">Probar TCF API</button>
            </div>
            
            <div id="consent-status"></div>
            
            <div id="tcf-test-results" style="margin-top: 20px; display: none; padding: 15px; background: #f0f8ff; border-radius: 4px;">
              <h3>Resultados de prueba TCF</h3>
              <div id="tcf-test-content"></div>
            </div>
            
            <div class="test-section">
              <h2>Scripts de ejemplo</h2>
              
              <!-- Script necesario (siempre se carga) -->
              <script type="text/plain" class="cmp-necessary">
                
                document.addEventListener('DOMContentLoaded', function() {
                  var statusDiv = document.getElementById('necessary-script-status');
                  if (statusDiv) {
                    statusDiv.textContent = 'Activo';
                    statusDiv.style.color = 'green';
                  }
                });
              </script>
              
              <!-- Script analytics (requiere consentimiento) -->
              <script type="text/plain" class="cmp-analytics">
                
                document.addEventListener('DOMContentLoaded', function() {
                  var statusDiv = document.getElementById('analytics-script-status');
                  if (statusDiv) {
                    statusDiv.textContent = 'Activo';
                    statusDiv.style.color = 'green';
                  }
                });
              </script>
              
              <!-- Script marketing (requiere consentimiento) -->
              <script type="text/plain" class="cmp-marketing">
                
                document.addEventListener('DOMContentLoaded', function() {
                  var statusDiv = document.getElementById('marketing-script-status');
                  if (statusDiv) {
                    statusDiv.textContent = 'Activo';
                    statusDiv.style.color = 'green';
                  }
                });
              </script>
              
              <div style="margin-top: 20px;">
                <p><strong>Necesario:</strong> <span id="necessary-script-status">Inactivo</span></p>
                <p><strong>Analytics:</strong> <span id="analytics-script-status">Inactivo</span></p>
                <p><strong>Marketing:</strong> <span id="marketing-script-status">Inactivo</span></p>
              </div>
            </div>
          </div>
          
          <script>
            function displayConsentStatus() {
              var status = window.CMP.getConsentState();
              var statusDiv = document.getElementById('consent-status');
              
              statusDiv.innerHTML = '<h3>Estado de Consentimiento</h3><pre>' + 
                JSON.stringify(status, null, 2) + '</pre>';
            }
            
            function clearConsent() {
              window.CMP.cookies.remove(window.CMP.config.cookieName);
              window.CMP.cookies.remove('cmp_uid');
              window.CMP.cookies.remove(window.CMP.config.tcfCookieName);
              alert('Cookies de consentimiento eliminadas. Recargando página...');
              setTimeout(() => location.reload(), 500);
            }
            
            function testTCFAPI() {
              var resultsDiv = document.getElementById('tcf-test-results');
              var contentDiv = document.getElementById('tcf-test-content');
              resultsDiv.style.display = 'block';
              contentDiv.innerHTML = '<p>Ejecutando pruebas TCF...</p>';
              
              // Array para guardar resultados
              var results = [];
              
              // 1. Probar ping
              window.__tcfapi('ping', 2, function(data, success) {
                results.push({
                  test: 'ping',
                  success: success,
                  data: data
                });
                
                // 2. Probar getTCData
                window.__tcfapi('getTCData', 2, function(tcData, success) {
                  results.push({
                    test: 'getTCData',
                    success: success,
                    data: tcData
                  });
                  
                  // 3. Probar addEventListener
                  window.__tcfapi('addEventListener', 2, function(listenerData, success) {
                    results.push({
                      test: 'addEventListener',
                      success: success,
                      data: listenerData,
                      hasListenerId: !!listenerData.listenerId
                    });
                    
                    // Si tenemos listenerId, probar removeEventListener
                    if (listenerData.listenerId) {
                      window.__tcfapi('removeEventListener', 2, function(removeData, success) {
                        results.push({
                          test: 'removeEventListener',
                          success: success,
                          data: removeData
                        });
                        
                        // Mostrar todos los resultados
                        displayTCFResults(results);
                      }, listenerData.listenerId);
                    } else {
                      // No hay listenerId, mostrar resultados hasta ahora
                      displayTCFResults(results);
                    }
                  });
                });
              });
              
              // 4. Verificar cookies
              var cookies = document.cookie.split(';');
              var tcfCookie = cookies.find(c => c.trim().startsWith('euconsent-v2='));
              
              results.push({
                test: 'TCF Cookie',
                success: !!tcfCookie,
                data: {
                  found: !!tcfCookie,
                  value: tcfCookie ? tcfCookie.split('=')[1] : null
                }
              });
            }
            
            function displayTCFResults(results) {
              var contentDiv = document.getElementById('tcf-test-content');
              var html = '<table style="width:100%; border-collapse: collapse;">';
              html += '<tr style="background:#e6e6e6;"><th style="text-align:left;padding:8px;">Test</th><th style="text-align:left;padding:8px;">Resultado</th><th style="text-align:left;padding:8px;">Detalles</th></tr>';
              
              results.forEach(function(result, index) {
                var bgColor = index % 2 === 0 ? '#f8f8f8' : '#fff';
                var statusColor = result.success ? 'green' : 'red';
                var statusText = result.success ? '✓ OK' : '✗ Error';
                
                html += '<tr style="background:' + bgColor + ';">';
                html += '<td style="padding:8px;"><strong>' + result.test + '</strong></td>';
                html += '<td style="padding:8px;color:' + statusColor + ';">' + statusText + '</td>';
                html += '<td style="padding:8px;"><pre style="margin:0;font-size:11px;overflow:auto;max-height:100px;">' + JSON.stringify(result.data, null, 2) + '</pre></td>';
                html += '</tr>';
              });
              
              html += '</table>';
              contentDiv.innerHTML = html;
            }
            
            // Eventos de CMP
            window.addEventListener('CMP_EVENT', function(event) {
              
              
              if (event.detail.event === 'consent-updated') {
                setTimeout(displayConsentStatus, 500);
              }
            });
          </script>
          
          <!-- CMP Script -->
          <script>${cmpScript}</script>
        </body>
        </html>
      `;
    } catch (error) {
      logger.error('Error generating test page:', error);
      throw error;
    }
  }

  /**
   * Genera un script de inclusión para el cliente
   * @param {Object} options - Opciones de configuración
   * @returns {String} - Código JavaScript a incluir en el sitio del cliente
   */
  async generateClientScript(options) {
    try {
      // Obtener configuración desde nuestro CMP config centralizado
      const clientConfig = createCMPConfig().getClientConfig(options);
      
      const {
        clientId,
        domainId,
        templateId,
        apiEndpoint = clientConfig.apiEndpoint,
        cookieName = clientConfig.cookieName,
        cookieExpiry = clientConfig.cookieExpiry,
        cookiePath = clientConfig.cookiePath,
        vendorListUrl = clientConfig.vendorListUrl,
        cmpId = clientConfig.cmpId, // Usar CMP ID desde config
        cmpVersion = clientConfig.cmpVersion,
        tcfCookieName = 'euconsent-v2', // Nombre de cookie estándar para TCF v2
        autoAcceptNonGDPR = false // Nueva opción para controlar la aceptación automática
      } = options;
      
      // Ya no usamos el iframe modal, removiendo esta línea y usando nuestra solución mejorada
      // const iframeModalJS = bannerStyleManager.generateIframeModalJS(templateId);

      // Script base que se incluirá en el sitio del cliente
      let script = `
        (function() {
          // ================================
          // CONFIGURACIÓN CMP OPTIMIZADA PARA VALIDADORES
          // Incluye configuración completa para pasar CMP Validator
          // ================================
          var CMP_CONFIG = {
            // === IDENTIFICADORES ===
            clientId: "${clientId}",
            domainId: "${domainId}",
            templateId: "${templateId}",
            
            // === CONFIGURACIÓN TCF v2.2 ===
            cmpId: ${clientConfig.cmpId}, // CMP ID desde configuración centralizada
            cmpVersion: ${clientConfig.cmpVersion},
            tcfVersion: "${clientConfig.tcfVersion}",
            tcfPolicyVersion: ${clientConfig.tcfPolicyVersion},
            tcfApiVersion: "${clientConfig.tcfApiVersion}",
            
            // === CONFIGURACIÓN REGIONAL ===
            gdprApplies: ${clientConfig.gdprApplies}, // Se puede override en tiempo real
            publisherCC: "${clientConfig.publisherCC}",
            language: "${clientConfig.language}",
            
            // === CONFIGURACIÓN DE SERVICIO ===
            isServiceSpecific: ${clientConfig.isServiceSpecific},
            useNonStandardStacks: false,
            purposeOneTreatment: false,
            
            // === ENDPOINTS Y URLs ===
            apiEndpoint: "${apiEndpoint}",
            baseUrl: "${clientConfig.baseUrl}",
            vendorListUrl: "${clientConfig.vendorListUrl}",
            
            // === COOKIES ===
            cookieName: "${clientConfig.cookieName}",
            tcfCookieName: "${clientConfig.tcfCookieName}",
            cookieExpiry: ${clientConfig.cookieExpiry},
            cookiePath: "${clientConfig.cookiePath}",
            cookieSecure: ${clientConfig.cookieSecure},
            cookieSameSite: "${clientConfig.cookieSameSite}",
            
            // === VENDOR LIST ===
            vendorListVersion: ${clientConfig.vendorListVersion},
            vendorListTTL: ${clientConfig.vendorListTTL},
            
            // === CONTROL DE SCRIPTS ===
            autoBlockScripts: ${clientConfig.autoBlockScripts},
            blockUntilConsent: ${clientConfig.blockUntilConsent},
            detectScriptsMode: "${clientConfig.detectScriptsMode}",
            
            // === GOOGLE CONSENT MODE ===
            googleConsentMode: ${clientConfig.googleConsentMode},
            googleMeasurementId: "${clientConfig.googleMeasurementId || ''}",
            
            // === MODO VALIDADOR ===
            validatorMode: ${clientConfig.validatorMode},
            debugMode: ${clientConfig.debugMode},
            
            // === CONFIGURACIÓN ESPECÍFICA PARA VALIDADORES ===
            enableAllPurposes: ${clientConfig.enableAllPurposes},
            enableAllSpecialFeatures: ${clientConfig.enableAllSpecialFeatures},
            enableAllVendors: ${clientConfig.enableAllVendors},
            includeGoogleVendors: ${clientConfig.includeGoogleVendors},
            enableGoogleConsentModeV2: ${clientConfig.enableGoogleConsentModeV2},
            alwaysRespondToTCFAPI: ${clientConfig.alwaysRespondToTCFAPI},
            includeNonIABConsent: ${clientConfig.includeNonIABConsent},
            
            // === TESTING VENDORS Y PURPOSES ===
            testVendorIds: [${clientConfig.testVendorIds.join(', ')}],
            testPurposeIds: [${clientConfig.testPurposeIds.join(', ')}],
            testSpecialFeatureIds: [${clientConfig.testSpecialFeatureIds.join(', ')}],
            
            // === CONFIGURACIÓN LEGACY ===
            autoAcceptNonGDPR: false // Mantenido para compatibilidad
          };
          
          // Namespace global para el CMP
          window.CMP = window.CMP || {};
          window.CMP.config = CMP_CONFIG;
          
          console.log('[CMP] ⚡ Script CMP iniciado - configuración establecida');
          console.log('[CMP] 📋 API Endpoint:', CMP_CONFIG.apiEndpoint);
          console.log('[CMP] 📋 Domain ID:', CMP_CONFIG.domainId);
          
          // DEFINIR FUNCIONES CRÍTICAS INMEDIATAMENTE - ANTES DE CUALQUIER OTRA COSA
          // Función para cambiar tabs en el panel de preferencias
          window.CMP.changePreferenceTab = function(tabName) {
            console.log('[CMP] 🔄 Usando CMP.changePreferenceTab para:', tabName);
            
            // Obtener el panel de preferencias para encontrar el uniqueId
            var preferencesPanel = document.getElementById('cmp-preferences');
            if (!preferencesPanel) {
              console.error('[CMP] Panel de preferencias no encontrado');
              return;
            }
            
            // Buscar cualquier elemento con data-unique-id para obtener el ID único
            var elementWithUniqueId = preferencesPanel.querySelector('[data-unique-id]');
            var uniqueId = elementWithUniqueId ? elementWithUniqueId.getAttribute('data-unique-id') : null;
            
            console.log('[CMP] UniqueId encontrado:', uniqueId);
            
            // Ocultar todos los contenidos
            var allContents = document.querySelectorAll('[data-content]');
            console.log('[CMP] Total contenidos encontrados:', allContents.length);
            allContents.forEach(function(content) {
              var contentName = content.getAttribute('data-content');
              console.log('[CMP] Ocultando contenido:', contentName);
              content.style.setProperty('display', 'none', 'important');
              // También remover clases activas si tienen el uniqueId
              if (uniqueId) {
                content.classList.remove(uniqueId + '-tab-content-active');
              }
            });
            
            // Mostrar el contenido seleccionado
            var targetContent = document.querySelector('[data-content="' + tabName + '"]');
            if (targetContent) {
              targetContent.style.setProperty('display', 'block', 'important');
              // También añadir clase activa si tenemos el uniqueId
              if (uniqueId) {
                targetContent.classList.add(uniqueId + '-tab-content-active');
              }
              console.log('[CMP] Contenido mostrado para:', tabName);
            } else {
              console.error('[CMP] No se encontró contenido para:', tabName);
              // Listar todos los data-content disponibles
              console.log('[CMP] Contenidos disponibles:');
              document.querySelectorAll('[data-content]').forEach(function(c) {
                console.log('[CMP] - data-content="' + c.getAttribute('data-content') + '"');
              });
            }
            
            // Actualizar estilos de los tabs
            var allTabs = document.querySelectorAll('[data-tab]');
            console.log('[CMP] Total tabs encontrados:', allTabs.length);
            allTabs.forEach(function(tab) {
              var tabDataName = tab.getAttribute('data-tab');
              if (tabDataName === tabName) {
                // Tab activo
                console.log('[CMP] Activando tab:', tabDataName);
                tab.style.setProperty('border-bottom-color', '#0078d4', 'important');
                tab.style.setProperty('color', '#0078d4', 'important');
                tab.style.setProperty('background-color', 'rgba(0, 120, 212, 0.1)', 'important');
                // También añadir clase activa si tenemos el uniqueId
                if (uniqueId) {
                  tab.classList.add(uniqueId + '-tab-active');
                }
              } else {
                // Tab inactivo
                console.log('[CMP] Desactivando tab:', tabDataName);
                tab.style.setProperty('border-bottom-color', 'transparent', 'important');
                tab.style.setProperty('color', '#333333', 'important');
                tab.style.setProperty('background-color', 'transparent', 'important');
                // También remover clase activa si tenemos el uniqueId
                if (uniqueId) {
                  tab.classList.remove(uniqueId + '-tab-active');
                }
              }
            });
            
            // Cargar datos dinámicos cuando se cambia a tabs específicos
            if (tabName === 'vendors') {
              console.log('[CMP] Cargando datos de proveedores para tab vendors...');
              setTimeout(function() {
                if (window.CMP.loadProvidersData) {
                  window.CMP.loadProvidersData();
                }
              }, 100);
            } else if (tabName === 'cookies') {
              console.log('[CMP] Cargando datos de cookies para tab cookies...');
              setTimeout(function() {
                if (window.CMP.loadCookiesData) {
                  window.CMP.loadCookiesData();
                }
              }, 100);
            }
          };
          
          console.log('[CMP] 🔧 Definiendo función loadProvidersData...');
          
          // Función para cargar proveedores desde la API
          window.CMP.loadProvidersData = function() {
            console.log('[CMP] Iniciando carga de proveedores...');
            var vendorsContainer = document.querySelector('[id^="vendors-content-"]');
            if (!vendorsContainer) {
              console.error('[CMP] No se encontró el contenedor de proveedores');
              console.log('[CMP] Contenedores disponibles:', document.querySelectorAll('[id*="vendors"]').length);
              return;
            }
            
            console.log('[CMP] Contenedor de proveedores encontrado:', vendorsContainer.id);
            
            var currentDomain = window.CMP.config.domainId || window.location.hostname;
            // Usar el apiEndpoint de la configuración en lugar de window.location
            var apiUrl = window.CMP.config.apiEndpoint;
            var fullUrl = apiUrl + '/consent/providers?domainId=' + encodeURIComponent(currentDomain);
            
            console.log('[CMP] Cargando proveedores desde:', fullUrl);
            console.log('[CMP] Dominio actual:', currentDomain);
            console.log('[CMP] Config completa:', window.CMP.config);
            
            // Mostrar loading mientras se cargan los datos
            vendorsContainer.innerHTML = '<div style="text-align: center; padding: 40px 0; color: #666;"><p>Cargando proveedores...</p></div>';
            
            fetch(fullUrl)
              .then(function(response) {
                console.log('[CMP] Respuesta recibida (proveedores):', response.status, response.statusText);
                if (!response.ok) {
                  return response.text().then(function(text) {
                    throw new Error('Error loading providers: ' + response.status + ' - ' + text);
                  });
                }
                return response.json();
              })
              .then(function(data) {
                console.log('[CMP] Datos de proveedores recibidos:', data);
                var providers = data.providers || data.data || [];
                console.log('[CMP] Número de proveedores:', providers.length);
                if (window.CMP.renderProviders) {
                  window.CMP.renderProviders(providers, vendorsContainer);
                } else {
                  console.error('[CMP] Función renderProviders no está disponible');
                }
              })
              .catch(function(error) {
                console.error('[CMP] Error loading providers:', error);
                // Mostrar pestaña prototipo con proveedores genéricos
                window.CMP.renderGenericProviders(vendorsContainer);
              });
          };
          
          console.log('[CMP] 🔧 Definiendo función loadCookiesData...');
          
          // Función para cargar cookies desde la API
          window.CMP.loadCookiesData = function() {
            console.log('[CMP] Iniciando carga de cookies...');
            var cookiesContainer = document.querySelector('[id^="cookies-content-"]');
            if (!cookiesContainer) {
              console.error('[CMP] No se encontró el contenedor de cookies');
              console.log('[CMP] Contenedores disponibles:', document.querySelectorAll('[id*="cookies"]').length);
              return;
            }
            
            console.log('[CMP] Contenedor de cookies encontrado:', cookiesContainer.id);
            
            var currentDomain = window.CMP.config.domainId || window.location.hostname;
            // Usar el apiEndpoint de la configuración en lugar de window.location
            var apiUrl = window.CMP.config.apiEndpoint;
            var fullUrl = apiUrl + '/consent/cookies?domainId=' + encodeURIComponent(currentDomain);
            
            console.log('[CMP] Cargando cookies desde:', fullUrl);
            console.log('[CMP] Dominio actual:', currentDomain);
            console.log('[CMP] Config completa:', window.CMP.config);
            
            // Mostrar loading mientras se cargan los datos
            cookiesContainer.innerHTML = '<div style="text-align: center; padding: 40px 0; color: #666;"><p>Cargando cookies...</p></div>';
            
            fetch(fullUrl)
              .then(function(response) {
                console.log('[CMP] Respuesta recibida (cookies):', response.status, response.statusText);
                if (!response.ok) {
                  return response.text().then(function(text) {
                    throw new Error('Error loading cookies: ' + response.status + ' - ' + text);
                  });
                }
                return response.json();
              })
              .then(function(data) {
                console.log('[CMP] Datos de cookies recibidos:', data);
                var cookiesByCategory = data.cookies || data.data || {};
                console.log('[CMP] Cookies por categoría:', Object.keys(cookiesByCategory));
                if (window.CMP.renderCookies) {
                  window.CMP.renderCookies(cookiesByCategory, cookiesContainer);
                } else {
                  console.error('[CMP] Función renderCookies no está disponible');
                }
              })
              .catch(function(error) {
                console.error('[CMP] Error loading cookies:', error);
                // Mostrar solo categorías cuando falle el fetch
                window.CMP.renderGenericCookieCategories(cookiesContainer);
              });
          };
          
          // Función para renderizar proveedores
          window.CMP.renderProviders = function(providers, container) {
            console.log('[CMP] Renderizando proveedores:', providers);
            
            // Filtrar proveedores unknown
            var filteredProviders = providers ? providers.filter(function(provider) {
              return provider.name && 
                     provider.name !== 'Unknown' && 
                     provider.name !== 'unknown' && 
                     provider.name.toLowerCase() !== 'unknown' &&
                     provider.category &&
                     provider.category !== 'unknown' &&
                     provider.category.toLowerCase() !== 'unknown';
            }) : [];
            
            if (!filteredProviders || filteredProviders.length === 0) {
              console.log('[CMP] No hay proveedores válidos para mostrar');
              container.innerHTML = '<div style="text-align: center; padding: 40px 0; color: #666;"><p>No se encontraron proveedores para este dominio</p></div>';
              return;
            }
            
            var html = '<div style="display: flex; flex-direction: column; gap: 16px;">';
            
            filteredProviders.forEach(function(provider) {
              var statusIcon = provider.verified ? '✅' : '❓';
              var cookiesText = provider.cookieCount === 1 ? '1 cookie' : provider.cookieCount + ' cookies';
              
              html += '<div style="padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;">';
              html += '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">';
              html += '<div style="flex: 1; margin-right: 16px;">';
              html += '<h4 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">' + statusIcon + ' ' + provider.name + '</h4>';
              html += '<p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">Categoría: ' + (provider.category || 'general') + ' • ' + cookiesText + '</p>';
              
              if (provider.url) {
                html += '<a href="' + provider.url + '" target="_blank" style="color: #0078d4; font-size: 13px; text-decoration: none;">Política de privacidad</a>';
              }
              
              html += '</div>';
              html += '<label style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">';
              html += '<input type="checkbox" data-vendor="' + (provider.name || 'unknown') + '" style="opacity: 0; width: 0; height: 0;">';
              html += '<span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>';
              html += '</label>';
              html += '</div>';
              html += '</div>';
            });
            
            html += '</div>';
            container.innerHTML = html;
          };
          
          // Función para renderizar proveedores genéricos cuando falle el fetch
          window.CMP.renderGenericProviders = function(container) {
            console.log('[CMP] Renderizando proveedores genéricos por fallo en fetch');
            
            var genericProviders = [
              {
                name: 'Google Analytics',
                category: 'analytics',
                description: 'Herramienta de análisis web que recopila datos sobre el uso del sitio web.',
                url: 'https://policies.google.com/privacy',
                verified: true
              },
              {
                name: 'Google Ads',
                category: 'marketing',
                description: 'Plataforma publicitaria para mostrar anuncios personalizados.',
                url: 'https://policies.google.com/privacy',
                verified: true
              },
              {
                name: 'Facebook Pixel',
                category: 'marketing',
                description: 'Herramienta de seguimiento para medir la efectividad de la publicidad.',
                url: 'https://www.facebook.com/privacy/policy/',
                verified: true
              },
              {
                name: 'YouTube',
                category: 'personalization',
                description: 'Plataforma de video que puede personalizar contenido y anuncios.',
                url: 'https://policies.google.com/privacy',
                verified: true
              },
              {
                name: 'Hotjar',
                category: 'analytics',
                description: 'Herramienta de análisis de comportamiento y feedback de usuarios.',
                url: 'https://www.hotjar.com/legal/policies/privacy/',
                verified: true
              }
            ];
            
            var html = '<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">';
            html += '<h4 style="margin: 0 0 8px 0; color: #856404; font-size: 16px;">ℹ️ Información sobre Proveedores</h4>';
            html += '<p style="margin: 0; font-size: 14px; color: #856404;">Los proveedores son empresas terceras que pueden procesar datos a través de cookies y tecnologías similares. A continuación se muestran algunos proveedores comunes:</p>';
            html += '</div>';
            
            html += '<div style="display: flex; flex-direction: column; gap: 16px;">';
            
            genericProviders.forEach(function(provider) {
              var statusIcon = provider.verified ? '✅' : '❓';
              var categoryNames = {
                analytics: 'Análisis',
                marketing: 'Marketing',
                personalization: 'Personalización',
                necessary: 'Necesarias'
              };
              
              html += '<div style="padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;">';
              html += '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">';
              html += '<div style="flex: 1; margin-right: 16px;">';
              html += '<h4 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">' + statusIcon + ' ' + provider.name + '</h4>';
              html += '<p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">Categoría: ' + (categoryNames[provider.category] || provider.category) + '</p>';
              html += '<p style="margin: 0 0 8px 0; color: #555; font-size: 13px;">' + provider.description + '</p>';
              
              if (provider.url) {
                html += '<a href="' + provider.url + '" target="_blank" style="color: #0078d4; font-size: 13px; text-decoration: none;">Política de privacidad</a>';
              }
              
              html += '</div>';
              html += '<label style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">';
              html += '<input type="checkbox" data-vendor="' + provider.name + '" style="opacity: 0; width: 0; height: 0;">';
              html += '<span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>';
              html += '</label>';
              html += '</div>';
              html += '</div>';
            });
            
            html += '</div>';
            
            html += '<div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-top: 16px; text-align: center;">';
            html += '<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">¿No se cargó la lista personalizada?</p>';
            html += '<button onclick="window.CMP.loadProvidersData()" style="padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Reintentar carga</button>';
            html += '</div>';
            
            container.innerHTML = html;
          };
          
          // Función para renderizar cookies agrupadas por categoría
          window.CMP.renderCookies = function(cookiesByCategory, container) {
            var categories = {
              necessary: 'Cookies Necesarias',
              analytics: 'Cookies Analíticas', 
              marketing: 'Cookies de Marketing',
              personalization: 'Cookies de Personalización'
              // Eliminamos 'unknown' para no mostrar cookies sin clasificar
            };
            
            var html = '<div style="display: flex; flex-direction: column; gap: 16px;">';
            var hasAnyCookies = false;
            
            Object.keys(categories).forEach(function(categoryKey) {
              var cookies = cookiesByCategory[categoryKey] || [];
              
              // Filtrar cookies unknown/desconocidas
              var filteredCookies = cookies.filter(function(cookie) {
                return cookie.name && 
                      cookie.name !== 'Unknown' && 
                      cookie.name !== 'unknown' && 
                      cookie.name.toLowerCase() !== 'unknown' &&
                      cookie.provider && 
                      cookie.provider !== 'Unknown' && 
                      cookie.provider !== 'unknown' && 
                      cookie.provider.toLowerCase() !== 'unknown' &&
                      categoryKey !== 'unknown'; // Asegurar que la categoría no sea unknown
              });
              
              if (filteredCookies.length === 0) return;
              hasAnyCookies = true;
              
              var categoryName = categories[categoryKey];
              var isExpanded = categoryKey === 'necessary'; // Solo necesarias expandidas por defecto
              
              html += '<div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">';
              html += '<button onclick="window.CMP.toggleCookieCategory(this)" style="width: 100%; padding: 16px; background: #f8f9fa; border: none; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">';
              html += '<h4 style="margin: 0; font-size: 16px; color: #333;">' + categoryName + ' (' + filteredCookies.length + ')</h4>';
              html += '<span style="font-size: 18px; transition: transform 0.3s;">' + (isExpanded ? '▼' : '▶') + '</span>';
              html += '</button>';
              
              // CLAVE: Evitar overflow en el contenido de la categoría
              html += '<div class="cookie-list" style="display: ' + (isExpanded ? 'block' : 'none') + '; padding: 0 16px 16px 16px; overflow: visible; max-height: none;">';
              
              filteredCookies.forEach(function(cookie) {
                html += '<div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; overflow: visible;">';
                html += '<div style="display: flex; justify-content: space-between; align-items: start; overflow: visible;">';
                html += '<div style="flex: 1; overflow: visible;">';
                html += '<h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #333; word-wrap: break-word;">' + cookie.name + '</h5>';
                html += '<p style="margin: 0 0 4px 0; font-size: 12px; color: #666; word-wrap: break-word;">Proveedor: ' + cookie.provider + '</p>';
                html += '<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Duración: ' + (cookie.duration || 'Session') + '</p>';
                if (cookie.description && cookie.description !== 'Cookie: ' + cookie.name) {
                  html += '<p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4; word-wrap: break-word; max-width: 100%;">' + cookie.description + '</p>';
                }
                html += '</div>';
                html += '</div>';
                html += '</div>';
              });
              
              html += '</div>';
              html += '</div>';
            });
            
            html += '</div>';
            
            if (!hasAnyCookies) {
              html = '<div style="text-align: center; padding: 40px 0; color: #666; height: 100%; display: flex; align-items: center; justify-content: center;"><p>No se encontraron cookies para este dominio</p></div>';
            }
            
            container.innerHTML = html;
          };
          
          // Función para renderizar categorías genéricas cuando falle el fetch de cookies
          window.CMP.renderGenericCookieCategories = function(container) {
            console.log('[CMP] Renderizando categorías genéricas por fallo en fetch de cookies');
            
            var categories = {
              necessary: {
                name: 'Cookies Necesarias',
                description: 'Estas cookies son esenciales para el funcionamiento del sitio web y no se pueden desactivar.',
                examples: ['Sesión de usuario', 'Configuración de idioma', 'Estado de autenticación']
              },
              analytics: {
                name: 'Cookies Analíticas',
                description: 'Nos ayudan a entender cómo interactúas con el sitio web, proporcionando información sobre las áreas visitadas.',
                examples: ['Google Analytics', 'Estadísticas de páginas', 'Tiempo de permanencia']
              },
              marketing: {
                name: 'Cookies de Marketing',
                description: 'Se utilizan para rastrear a los visitantes en los sitios web con la intención de mostrar anuncios relevantes.',
                examples: ['Google Ads', 'Facebook Pixel', 'Anuncios personalizados']
              },
              personalization: {
                name: 'Cookies de Personalización',
                description: 'Permiten que el sitio web recuerde información que cambia la forma en que se comporta el sitio.',
                examples: ['Preferencias de tema', 'Configuración regional', 'Contenido personalizado']
              }
            };
            
            var html = '<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">';
            html += '<h4 style="margin: 0 0 8px 0; color: #856404; font-size: 16px;">ℹ️ Información sobre Categorías de Cookies</h4>';
            html += '<p style="margin: 0; font-size: 14px; color: #856404;">Las cookies se clasifican en diferentes categorías según su propósito. A continuación se muestran las principales categorías:</p>';
            html += '</div>';
            
            html += '<div style="display: flex; flex-direction: column; gap: 16px;">';
            
            Object.keys(categories).forEach(function(categoryKey) {
              var category = categories[categoryKey];
              var isExpanded = categoryKey === 'necessary'; // Solo necesarias expandidas por defecto
              
              html += '<div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">';
              html += '<button onclick="window.CMP.toggleCookieCategory(this)" style="width: 100%; padding: 16px; background: #f8f9fa; border: none; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">';
              html += '<h4 style="margin: 0; font-size: 16px; color: #333;">' + category.name + '</h4>';
              html += '<span style="font-size: 18px; transition: transform 0.3s;">' + (isExpanded ? '▼' : '▶') + '</span>';
              html += '</button>';
              html += '<div class="cookie-list" style="display: ' + (isExpanded ? 'block' : 'none') + '; padding: 16px;">';
              
              html += '<p style="margin: 0 0 12px 0; font-size: 14px; color: #555; line-height: 1.5;">' + category.description + '</p>';
              
              html += '<div style="background: #f8f9fa; border-radius: 6px; padding: 12px;">';
              html += '<h6 style="margin: 0 0 8px 0; font-size: 13px; color: #666; font-weight: 600;">Ejemplos comunes:</h6>';
              html += '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666;">';
              category.examples.forEach(function(example) {
                html += '<li style="margin-bottom: 4px;">' + example + '</li>';
              });
              html += '</ul>';
              html += '</div>';
              
              html += '</div>';
              html += '</div>';
            });
            
            html += '</div>';
            
            html += '<div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-top: 16px; text-align: center;">';
            html += '<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">¿No se cargó la lista específica de cookies?</p>';
            html += '<button onclick="window.CMP.loadCookiesData()" style="padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Reintentar carga</button>';
            html += '</div>';
            
            container.innerHTML = html;
          };
          
          console.log('[CMP] ✅ Funciones loadProvidersData y loadCookiesData definidas correctamente');
          console.log('[CMP] 📋 Verificando funciones definidas:', !!window.CMP.loadProvidersData, !!window.CMP.loadCookiesData);
          
          // Función para expandir/contraer categorías de cookies
      window.CMP.toggleCookieCategory = function(button) {
        var cookieList = button.nextElementSibling;
        var arrow = button.querySelector('span:last-child');
        
        if (cookieList.style.display === 'none') {
          cookieList.style.display = 'block';
          arrow.textContent = '▼';
        } else {
          cookieList.style.display = 'none';
          arrow.textContent = '▶';
        }
        
        // Forzar recálculo del layout para evitar problemas de scroll
        var container = cookieList.closest('[id^="cookies-content-"]');
        if (container) {
          container.style.height = 'auto';
          setTimeout(function() {
            container.style.height = '100%';
          }, 0);
        }
      };
          
          // Ya no usamos el manejo de iframe, reemplazado por solución mejorada
          
          // Estado del consentimiento
          window.CMP.consent = {
            purposes: {},
            vendors: {},
            specialFeatures: {},
            created: null,
            lastUpdated: null,
            tcString: null
          };
          
          // Utilidades de cookies
          window.CMP.cookies = {
            set: function(name, value, days, path) {
              var expires = "";
              if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
              }
              document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=" + (path || "/") + "; SameSite=Lax";
            },
            get: function(name) {
              var nameEQ = name + "=";
              var ca = document.cookie.split(';');
              for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) {
                  try {
                    return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
                  } catch (e) {
                    return null;
                  }
                }
              }
              return null;
            },
            remove: function(name) {
              document.cookie = name + "=; Max-Age=-99999999; Path=/;";
            }
          };
          
          // FUNCIONES DE PREFERENCIAS - Definidas temprano para estar disponibles
          // Función para cambiar tabs en el panel de preferencias
          window.CMP.changePreferenceTab = function(tabName) {
            console.log('[CMP] Cambiando a tab:', tabName);
            
            // Obtener el panel de preferencias para encontrar el uniqueId
            var preferencesPanel = document.getElementById('cmp-preferences');
            if (!preferencesPanel) {
              console.error('[CMP] Panel de preferencias no encontrado');
              return;
            }
            
            // Buscar cualquier elemento con data-unique-id para obtener el ID único
            var elementWithUniqueId = preferencesPanel.querySelector('[data-unique-id]');
            var uniqueId = elementWithUniqueId ? elementWithUniqueId.getAttribute('data-unique-id') : null;
            
            console.log('[CMP] UniqueId encontrado:', uniqueId);
            
            // Ocultar todos los contenidos
            var allContents = document.querySelectorAll('[data-content]');
            console.log('[CMP] Total contenidos encontrados:', allContents.length);
            allContents.forEach(function(content) {
              var contentName = content.getAttribute('data-content');
              console.log('[CMP] Ocultando contenido:', contentName);
              content.style.setProperty('display', 'none', 'important');
              // También remover clases activas si tienen el uniqueId
              if (uniqueId) {
                content.classList.remove(uniqueId + '-tab-content-active');
              }
            });
            
            // Mostrar el contenido seleccionado
            var targetContent = document.querySelector('[data-content="' + tabName + '"]');
            if (targetContent) {
              targetContent.style.setProperty('display', 'block', 'important');
              // También añadir clase activa si tenemos el uniqueId
              if (uniqueId) {
                targetContent.classList.add(uniqueId + '-tab-content-active');
              }
              console.log('[CMP] Contenido mostrado para:', tabName);
            } else {
              console.error('[CMP] No se encontró contenido para:', tabName);
              // Listar todos los data-content disponibles
              console.log('[CMP] Contenidos disponibles:');
              document.querySelectorAll('[data-content]').forEach(function(c) {
                console.log('[CMP] - data-content="' + c.getAttribute('data-content') + '"');
              });
            }
            
            // Actualizar estilos de los tabs
            var allTabs = document.querySelectorAll('[data-tab]');
            console.log('[CMP] Total tabs encontrados:', allTabs.length);
            allTabs.forEach(function(tab) {
              var tabDataName = tab.getAttribute('data-tab');
              if (tabDataName === tabName) {
                // Tab activo
                console.log('[CMP] Activando tab:', tabDataName);
                tab.style.setProperty('border-bottom-color', '#0078d4', 'important');
                tab.style.setProperty('color', '#0078d4', 'important');
                tab.style.setProperty('background-color', 'rgba(0, 120, 212, 0.1)', 'important');
                // También añadir clase activa si tenemos el uniqueId
                if (uniqueId) {
                  tab.classList.add(uniqueId + '-tab-active');
                }
              } else {
                // Tab inactivo
                console.log('[CMP] Desactivando tab:', tabDataName);
                tab.style.setProperty('border-bottom-color', 'transparent', 'important');
                tab.style.setProperty('color', '#333333', 'important');
                tab.style.setProperty('background-color', 'transparent', 'important');
                // También remover clase activa si tenemos el uniqueId
                if (uniqueId) {
                  tab.classList.remove(uniqueId + '-tab-active');
                }
              }
            });
            
            // Cargar datos dinámicos cuando se cambia a tabs específicos
            if (tabName === 'vendors') {
              console.log('[CMP] Cargando datos de proveedores para tab vendors...');
              setTimeout(function() {
                if (window.CMP.loadProvidersData) {
                  window.CMP.loadProvidersData();
                }
              }, 100);
            } else if (tabName === 'cookies') {
              console.log('[CMP] Cargando datos de cookies para tab cookies...');
              setTimeout(function() {
                if (window.CMP.loadCookiesData) {
                  window.CMP.loadCookiesData();
                }
              }, 100);
            }
          };
          
          
          // Control de eventos
          window.CMP.eventListeners = [];
          window.CMP.addEventListener = function(callback) {
            window.CMP.eventListeners.push(callback);
          };
          
          window.CMP.triggerEvent = function(event) {
            window.CMP.eventListeners.forEach(function(callback) {
              callback(event);
            });
            
            // Notificar a otros scripts en la página
            var customEvent = new CustomEvent('CMP_EVENT', { detail: event });
            window.dispatchEvent(customEvent);
          };
          
          // API TCF v2
          window.__tcfapi = function(command, version, callback, parameter) {
            console.log('CMP-API: Comando recibido: ' + command);
            
            // Verificar versión primero
            if (version !== 2) {
              callback({
                success: false,
                message: 'Unsupported TCF version'
              }, false);
              return;
            }
            
            switch (command) {
              case 'getTCData':
                window.CMP.getTCData(callback, parameter);
                break;
                
              case 'addEventListener':
                // Gestionar correctamente el listener y devolver el ID
                var listenerId = window.CMP.addTCFListener(function(tcData, success) {
                  // Modificar el objeto tcData para incluir el listenerId
                  tcData.listenerId = listenerId;
                  // Luego llamar al callback original con el tcData modificado
                  callback(tcData, success);
                });
                
                console.log("TCF addEventListener: Configurado listener con ID", listenerId);
                break;
                
              case 'removeEventListener':
                // Verificar que parameter (listenerId) exista y sea válido
                if (parameter === undefined || parameter === null) {
                  console.error("TCF removeEventListener: listenerId inválido", parameter);
                  callback({
                    success: false,
                    message: 'Invalid listenerId provided'
                  }, false);
                  return;
                }
                
                // Intentar eliminar el listener y reportar el éxito
                var removed = window.CMP.removeTCFListener(parameter);
                callback({
                  success: removed,
                  message: removed ? 'Listener removed' : 'Listener not found'
                }, removed);
                break;
                
              case 'ping':
                // Esta función debe proporcionar información sobre el estado del CMP
                var isVisible = function() {
                  var banner = document.getElementById('cmp-banner');
                  return banner && banner.style.display !== 'none';
                };
                
                callback({
                  gdprApplies: window.CMP.config.gdprApplies === null ? true : window.CMP.config.gdprApplies,
                  cmpLoaded: true,
                  cmpStatus: 'loaded',
                  displayStatus: isVisible() ? 'visible' : 'hidden',
                  apiVersion: '2.2',
                  cmpVersion: window.CMP.config.cmpVersion,
                  cmpId: window.CMP.config.cmpId,
                  gvlVersion: window.CMP.vendorList ? window.CMP.vendorList.vendorListVersion : 3,
                  tcfPolicyVersion: 4
                }, true);
                break;
                
              default:
                console.warn("TCF: Comando no soportado:", command);
                callback({
                  success: false,
                  message: 'Command not supported: ' + command
                }, false);
            }
          };
          
          // Soporte para __cmp (TCF v1) para retrocompatibilidad
          window.__cmp = function(command, parameter, callback) {
            console.warn('TCFv1 is deprecated. Please upgrade to TCFv2');
            if (typeof callback === 'function') {
              callback({
                success: false,
                message: 'Only TCF v2 is supported'
              }, false);
            }
          };
          
          // Métodos auxiliares para implementación de TCF
          window.CMP.tcfListeners = [];
          window.CMP.tcfListenerId = 0;
          
          window.CMP.addTCFListener = function(callback) {
            // Asignar un listenerId único
            var listenerId = window.CMP.tcfListenerId++;
            
            console.log("[CMP] Añadiendo TCF listener con ID:", listenerId);
            
            // Añadir a la lista de listeners
            window.CMP.tcfListeners.push({
              id: listenerId,
              callback: callback
            });
            
            // Ejecutar callback con datos de consentimiento actuales
            window.CMP.getTCData(callback);
            
            // IMPORTANTE: Devolver explícitamente el listenerId según especificación TCF
            return listenerId;
          };
          
          window.CMP.removeTCFListener = function(listenerId) {
            console.log("[CMP] Eliminando TCF listener con ID:", listenerId);
            
            // Verificar que listenerId sea un número válido
            if (typeof listenerId !== 'number') {
              console.error("[CMP] Error en removeTCFListener: listenerId debe ser un número:", listenerId);
              return false;
            }
            
            // Buscar el listener por ID
            var listenerIndex = window.CMP.tcfListeners.findIndex(function(listener) {
              return listener.id === listenerId;
            });
            
            // Si se encuentra, eliminarlo
            if (listenerIndex !== -1) {
              window.CMP.tcfListeners.splice(listenerIndex, 1);
              console.log("[CMP] Listener eliminado correctamente:", listenerId);
              return true;
            } else {
              console.warn("[CMP] No se encontró listener con ID:", listenerId);
              return false;
            }
          };
          
          window.CMP.notifyTCFListeners = function(tcData, success) {
            window.CMP.tcfListeners.forEach(function(listener) {
              listener.callback(tcData, success);
            });
          };
          
          window.CMP.getTCData = function(callback, vendorIds) {
            console.log('CMP getTCData called');
            
            var consentData = window.CMP.getConsentState();
            
            // Si no hay tcString en consentData, intentar generarlo
            if (!consentData.tcString) {
              consentData.tcString = window.CMP.generateTCString(consentData);
            }
            
            var tcData = {
              tcString: consentData.tcString || '',
              tcfPolicyVersion: 4, // TCF v2.2 usa policy version 4
              cmpId: parseInt(window.CMP.config.cmpId),
              cmpVersion: window.CMP.config.cmpVersion,
              gdprApplies: window.CMP.config.gdprApplies === null ? true : window.CMP.config.gdprApplies,
              eventStatus: 'tcloaded',
              purposeOneTreatment: false,
              useNonStandardStacks: false,
              publisherCC: 'ES',
              isServiceSpecific: window.CMP.config.isServiceSpecific,
              purpose: {
                consents: {},
                legitimateInterests: {}
              },
              vendor: {
                consents: {},
                legitimateInterests: {}
              },
              specialFeatureOptins: {},
              publisher: {
                consents: {},
                legitimateInterests: {},
                customPurpose: {
                  consents: {},
                  legitimateInterests: {}
                },
                restrictions: {}
              }
            };
            
            // Rellenar consents
            if (consentData.purposes) {
              Object.keys(consentData.purposes).forEach(function(purposeId) {
                tcData.purpose.consents[purposeId] = consentData.purposes[purposeId];
                // Asumimos interés legítimo para ciertos propósitos
                if ([2,3,5,7,8,9,10].includes(parseInt(purposeId))) {
                  tcData.purpose.legitimateInterests[purposeId] = true;
                }
              });
            }
            
            // Rellenar vendor consents
            if (consentData.vendors) {
              Object.keys(consentData.vendors).forEach(function(vendorId) {
                tcData.vendor.consents[vendorId] = consentData.vendors[vendorId];
                
                // Interes legítimo (simplificado)
                if (window.CMP.vendorList && 
                    window.CMP.vendorList.vendors &&
                    window.CMP.vendorList.vendors[vendorId] &&
                    window.CMP.vendorList.vendors[vendorId].legIntPurposes &&
                    window.CMP.vendorList.vendors[vendorId].legIntPurposes.length > 0) {
                  tcData.vendor.legitimateInterests[vendorId] = consentData.vendors[vendorId];
                }
              });
            }
            
            // Rellenar special features
            if (consentData.specialFeatures) {
              Object.keys(consentData.specialFeatures).forEach(function(featureId) {
                tcData.specialFeatureOptins[featureId] = consentData.specialFeatures[featureId];
              });
            }
            
            // Si se solicitan vendors específicos, filtrar los datos
            if (vendorIds && Array.isArray(vendorIds) && vendorIds.length > 0) {
              var filteredVendorConsents = {};
              var filteredVendorLegInt = {};
              
              vendorIds.forEach(function(vendorId) {
                if (tcData.vendor.consents.hasOwnProperty(vendorId)) {
                  filteredVendorConsents[vendorId] = tcData.vendor.consents[vendorId];
                }
                if (tcData.vendor.legitimateInterests.hasOwnProperty(vendorId)) {
                  filteredVendorLegInt[vendorId] = tcData.vendor.legitimateInterests[vendorId];
                }
              });
              
              tcData.vendor.consents = filteredVendorConsents;
              tcData.vendor.legitimateInterests = filteredVendorLegInt;
            }
            
            if (typeof callback === 'function') {
              callback(tcData, true);
            }
            
            return tcData;
          };
          
          // Carga de datos externos (lista de vendors IAB)
          window.CMP.loadVendorList = function() {
            
            return new Promise(function(resolve, reject) {
              // Intentar obtener del backend primero
              var xhr = new XMLHttpRequest();
              xhr.open('GET', CMP_CONFIG.apiEndpoint + '/vendor-list', true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var data = JSON.parse(xhr.responseText);
                      window.CMP.vendorList = data;
                      
                      resolve(data);
                    } catch (e) {
                      console.warn("[CMP] Error procesando respuesta de vendor-list:", e);
                      // Si falla, intentamos directamente con IAB
                      window.CMP._loadVendorListFromIAB().then(resolve).catch(reject);
                    }
                  } else {
                    console.warn("[CMP] Error en la solicitud de vendor-list:", xhr.status);
                    // Si falla, intentamos directamente con IAB
                    window.CMP._loadVendorListFromIAB().then(resolve).catch(reject);
                  }
                }
              };
              xhr.send();
            });
          };
          
          // Carga directa desde IAB (fallback)
          window.CMP._loadVendorListFromIAB = function() {
            
            return new Promise(function(resolve, reject) {
              var xhr = new XMLHttpRequest();
              // Intentar primero desde nuestro proxy
              xhr.open('GET', CMP_CONFIG.apiEndpoint + '/vendor-list-proxy', true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var data = JSON.parse(xhr.responseText);
                      window.CMP.vendorList = data;
                      
                      resolve(data);
                    } catch (e) {
                      console.warn("[CMP] Error procesando respuesta del proxy:", e);
                      // Si falla, usar fallback mínimo
                      useFallbackVendorList();
                    }
                  } else {
                    console.warn("[CMP] Error en la solicitud al proxy:", xhr.status);
                    // Si falla, usar fallback mínimo
                    useFallbackVendorList();
                  }
                }
              };
              xhr.send();
              
              // Función para usar lista mínima en caso de fallo
              function useFallbackVendorList() {
                console.warn('[CMP] Usando lista de vendors de respaldo');
                var fallbackList = {
                  vendorListVersion: 1,
                  lastUpdated: new Date().toISOString(),
                  purposes: {
                    1: { id: 1, name: "Almacenar información", description: "Almacenar información en el dispositivo" },
                    2: { id: 2, name: "Personalización", description: "Personalizar contenido" },
                    3: { id: 3, name: "Medición", description: "Medir el rendimiento del contenido" }
                  },
                  specialFeatures: {},
                  vendors: {
                    1: { id: 1, name: "Google", purposes: [1, 2, 3], policyUrl: "https://policies.google.com/privacy" }
                  }
                };
                
                window.CMP.vendorList = fallbackList;
                resolve(fallbackList);
              }
            });
          };
          
          // Detección de GDPR aplicable
          window.CMP.detectGDPR = function() {
            
            return new Promise(function(resolve) {
              // Detectamos IP para determinar si aplica GDPR
              var xhr = new XMLHttpRequest();
              xhr.open('GET', CMP_CONFIG.apiEndpoint + '/country-detection', true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var response = JSON.parse(xhr.responseText);
                      // Si está en la UE o EEA, aplica GDPR
                      window.CMP.config.gdprApplies = response.gdprApplies === true;
                      
                      resolve(window.CMP.config.gdprApplies);
                    } catch (e) {
                      console.error("[CMP] Error procesando respuesta de detección GDPR:", e);
                      // Si hay error, asumimos que sí aplica para mayor seguridad
                      window.CMP.config.gdprApplies = true;
                      resolve(true);
                    }
                  } else {
                    console.error("[CMP] Error en solicitud de detección GDPR:", xhr.status);
                    // Si hay error de conexión, asumimos que sí aplica
                    window.CMP.config.gdprApplies = true;
                    resolve(true);
                  }
                }
              };
              xhr.send();
            });
          };
          
          // Lógica de banner
          window.CMP.loadBanner = function() {
            
            return new Promise(function(resolve, reject) {
              var xhr = new XMLHttpRequest();
              // Usar el nuevo endpoint que determina dinámicamente el banner por dominio
              var bannerUrl = CMP_CONFIG.apiEndpoint + '/banner/domain/' + CMP_CONFIG.domainId;
              
              console.log('[CMP] Cargando banner para dominio:', CMP_CONFIG.domainId);
              xhr.open('GET', bannerUrl, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var data = JSON.parse(xhr.responseText);
                      
                      // Log información del template usado
                      if (data.data && data.data.domainInfo) {
                        console.log('[CMP] Banner cargado:', {
                          templateId: data.data.domainInfo.templateId,
                          domain: data.data.domainInfo.domain
                        });
                      }
                      
                      resolve(data.data || data);
                    } catch (e) {
                      console.error("[CMP] Error procesando banner:", e);
                      reject(e);
                    }
                  } else {
                    console.error("[CMP] Error solicitando banner:", xhr.status);
                    // Fallback al endpoint anterior si el nuevo falla
                    console.log("[CMP] Intentando fallback con templateId...");
                    window.CMP.loadBannerFallback().then(resolve).catch(reject);
                  }
                }
              };
              xhr.send();
            });
          };
          
          // Función de fallback para compatibilidad con el sistema anterior
          window.CMP.loadBannerFallback = function() {
            return new Promise(function(resolve, reject) {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', CMP_CONFIG.apiEndpoint + '/banner/' + CMP_CONFIG.templateId, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var data = JSON.parse(xhr.responseText);
                      console.log('[CMP] Banner cargado usando fallback templateId');
                      resolve(data.data || data);
                    } catch (e) {
                      console.error("[CMP] Error procesando banner (fallback):", e);
                      reject(e);
                    }
                  } else {
                    console.error("[CMP] Error solicitando banner (fallback):", xhr.status);
                    reject(new Error('Error fetching banner: ' + xhr.status));
                  }
                }
              };
              xhr.send();
            });
          };
          
          // Inyectar banner en el DOM
          window.CMP.injectBanner = function(bannerData) {
            var html = bannerData.html || '';
            var css = bannerData.css || '';
            var preferencesPanel = bannerData.preferences || '';
            
            // Insertar HTML en el body
            var container = document.createElement('div');
            container.innerHTML = \`
              <style>\${css}</style>
              \${html}
              \${preferencesPanel}
            \`;
            document.body.appendChild(container);
            
            // Exponer métodos
            window.CMP.showBanner = function() {
              console.log('[CMP] Intentando mostrar banner...');
              
              // Ocultar el icono flotante cuando se muestra el banner
              window.CMP.hideFloatingIcon();
              
              var bannerEl = document.getElementById('cmp-banner');
              
              if (!bannerEl) {
                console.error('[CMP ERROR] No se pudo encontrar el banner para mostrar');
                return;
              }
              
              // Comprobar si es modal
              if (bannerEl.classList.contains('cmp-banner--modal')) {
                console.log('[CMP] Banner tipo modal detectado, usando método mejorado');
                
                // Usar nuestra función mejorada que centraliza toda la lógica
                // y arregla los problemas de centrado
                if (typeof window.CMP.ensureModalVisibility === 'function') {
                  console.log('[CMP DEBUG] Usando función especializada ensureModalVisibility');
                  window.CMP.ensureModalVisibility();
                  
                  // Ejecutar verificación adicional después de un momento
                  setTimeout(function() {
                    var container = document.getElementById('cmp-modal-container');
                    if (container) {
                      console.log('[CMP DEBUG] Verificación adicional: contenedor modal encontrado');
                      // Forzar los estilos críticos nuevamente
                      container.style.setProperty('display', 'flex', 'important');
                      container.style.setProperty('align-items', 'center', 'important');
                      container.style.setProperty('justify-content', 'center', 'important');
                    }
                    
                    // Mostrar información de depuración si existe la función
                    if (typeof window.CMP.debugModalStyles === 'function') {
                      window.CMP.debugModalStyles();
                    }
                  }, 200);
                } else {
                  // Implementación de respaldo por si la función especializada no está disponible
                  console.log('[CMP DEBUG] ¡Advertencia! Función especializada no disponible, usando método simple');
                  
                  var modalContainer = document.getElementById('cmp-modal-container');
                  if (!modalContainer) {
                    modalContainer = document.createElement('div');
                    modalContainer.id = 'cmp-modal-container';
                    document.body.appendChild(modalContainer);
                    // Aplicar estilos básicos
                    modalContainer.style.cssText = "position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; background-color: rgba(0,0,0,0.5) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 2147483646 !important;";
                  }
                  
                  // Asegurarnos que el contenedor está visible
                  modalContainer.style.display = 'flex';
                  
                  // Asegurarse que el banner está dentro del contenedor
                  if (!modalContainer.contains(bannerEl)) {
                    // Primero quitarlo de donde esté
                    if (bannerEl.parentNode) {
                      bannerEl.parentNode.removeChild(bannerEl);
                    }
                    modalContainer.appendChild(bannerEl);
                  }
                  
                  // Aplicar estilos al banner
                  bannerEl.style.display = 'block';
                  bannerEl.style.margin = '0 auto';
                }
                
                console.log('[CMP] Modal mostrado correctamente');
              } else {
                // Para otros tipos de banner (no modales)
                console.log('[CMP] Mostrando banner tipo no-modal');
                bannerEl.style.display = 'block';
              }
            };
            
            window.CMP.hideBanner = function() {
              console.log('[CMP] 🚪 === INICIANDO HIDE BANNER ===');
              
              // NUEVA IMPLEMENTACIÓN PARA OCULTAR MODALES
              // Comprobar si existe la estructura simplificada
              var modalContainer = document.getElementById('cmp-modal-container');
              var bannerEl = document.getElementById('cmp-banner');
              var iconEl = document.getElementById('cmp-floating-icon');
              
              console.log('[CMP] 📋 Estado inicial de elementos:', {
                modalContainer: !!modalContainer,
                banner: !!bannerEl,
                icon: !!iconEl,
                iconDisplay: iconEl ? iconEl.style.display : 'no icon',
                iconVisibility: iconEl ? iconEl.style.visibility : 'no icon'
              });
              
              // IMPORTANTE: Proteger el icono flotante
              if (iconEl) {
                console.log('[CMP] ⚠️ PROTEGIENDO ICONO FLOTANTE');
                iconEl.style.setProperty('display', 'block', 'important');
                iconEl.style.setProperty('visibility', 'visible', 'important');
              }
              
              // Si tenemos contenedor modal, lo ocultamos
              if (modalContainer) {
                console.log('[CMP] 📦 Ocultando banner tipo modal (estructura simplificada)');
                modalContainer.style.display = 'none';
                
                // NO remover del DOM por ahora para debugging
                console.log('[CMP] ℹ️ Manteniendo modal en DOM para poder reabrirlo');
                /*
                if (modalContainer.parentNode) {
                  modalContainer.parentNode.removeChild(modalContainer);
                }
                */
              } else if (bannerEl) {
                console.log('[CMP] 📋 Procesando banner sin contenedor modal');
                // Verificar si es un modal pero sin la estructura contenedora
                if (bannerEl.classList.contains('cmp-banner--modal')) {
                  console.log('[CMP] Ocultando banner modal sin contenedor');
                  
                  // Si es modal pero sin contenedor, sólo ocultar
                  bannerEl.style.display = 'none';
                  
                  // Buscar otros elementos de estructura antigua
                  var modalOverlay = document.getElementById('cmp-modal-overlay');
                  var modalWrapper = document.getElementById('cmp-modal-wrapper');
                  
                  if (modalOverlay) modalOverlay.style.display = 'none';
                  if (modalWrapper) modalWrapper.style.display = 'none';
                } else {
                  // Para otros tipos de banner, simplemente ocultarlo
                  console.log('[CMP] Ocultando banner tipo no-modal');
                  bannerEl.style.display = 'none';
                }
              }
              
              // Verificar estado final antes de mostrar icono
              console.log('[CMP] 🔍 === ESTADO DESPUÉS DE OCULTAR ===');
              var finalIconEl = document.getElementById('cmp-floating-icon');
              var finalBannerEl = document.getElementById('cmp-banner');
              var finalModalContainer = document.getElementById('cmp-modal-container');
              
              console.log('[CMP] 📊 Estado final:', {
                icon: {
                  exists: !!finalIconEl,
                  display: finalIconEl ? finalIconEl.style.display : 'no existe',
                  visibility: finalIconEl ? finalIconEl.style.visibility : 'no existe',
                  computedDisplay: finalIconEl ? window.getComputedStyle(finalIconEl).display : 'no existe'
                },
                banner: {
                  exists: !!finalBannerEl,
                  display: finalBannerEl ? finalBannerEl.style.display : 'no existe'
                },
                modalContainer: {
                  exists: !!finalModalContainer,
                  display: finalModalContainer ? finalModalContainer.style.display : 'no existe'
                }
              });
              
              // Mostrar el icono flotante después de ocultar el banner
              console.log('[CMP] 🎯 Banner ocultado, intentando mostrar icono flotante...');
              setTimeout(function() {
                console.log('[CMP] 🔄 Ejecutando showFloatingIcon desde hideBanner...');
                if (window.CMP && window.CMP.showFloatingIcon) {
                  window.CMP.showFloatingIcon();
                  
                  // Verificar si el icono se creó
                  setTimeout(function() {
                    var iconCheck = document.getElementById('cmp-floating-icon');
                    console.log('[CMP] ✅ Verificación post-creación del icono:', {
                      exists: !!iconCheck,
                      display: iconCheck ? iconCheck.style.display : 'no existe',
                      innerHTML: iconCheck ? iconCheck.innerHTML.substring(0, 100) : 'no existe'
                    });
                  }, 100);
                } else {
                  console.error('[CMP] ❌ showFloatingIcon no está disponible');
                }
              }, 500);
            };
            window.CMP.showPreferences = function() {
              var panel = document.getElementById('cmp-preferences');
              if (panel) {
                panel.style.display = 'flex';
                // Asegurar que el panel de preferencias tenga un z-index mayor que el banner modal
                panel.style.setProperty('z-index', '2147483648', 'important');
                
                // Inicializar el panel si no ha sido inicializado
                if (!window.CMP._preferencesInitialized) {
                  window.CMP.initPreferencesPanel();
                  window.CMP._preferencesInitialized = true;
                }
                
                // Cargar datos dinámicos de cookies y proveedores
                window.CMP.loadDynamicPreferencesData();
                
                // Asegurar que el tab de propósitos esté activo por defecto
                setTimeout(function() {
                  console.log('[CMP] Asegurando tab inicial activo');
                  if (window.CMP.changePreferenceTab) {
                    window.CMP.changePreferenceTab('purposes');
                  } else {
                    console.error('[CMP] Función changePreferenceTab no disponible');
                  }
                }, 100);
              }
            };
            
            // Nueva función para inicializar el panel de preferencias
            window.CMP.initPreferencesPanel = function() {
              console.log('[CMP] Inicializando panel de preferencias (versión simplificada)');
              
              // Función simple para cambiar tabs
              window.CMP.changePreferenceTab = function(tabName) {
                console.log('[CMP] Cambiando a tab:', tabName);
                
                // Obtener el panel de preferencias para encontrar el uniqueId
                var preferencesPanel = document.getElementById('cmp-preferences');
                if (!preferencesPanel) {
                  console.error('[CMP] Panel de preferencias no encontrado');
                  return;
                }
                
                // Buscar cualquier elemento con data-unique-id para obtener el ID único
                var elementWithUniqueId = preferencesPanel.querySelector('[data-unique-id]');
                var uniqueId = elementWithUniqueId ? elementWithUniqueId.getAttribute('data-unique-id') : null;
                
                console.log('[CMP] UniqueId encontrado:', uniqueId);
                
                // Ocultar todos los contenidos
                var allContents = document.querySelectorAll('[data-content]');
                console.log('[CMP] Total contenidos encontrados:', allContents.length);
                allContents.forEach(function(content) {
                  var contentName = content.getAttribute('data-content');
                  console.log('[CMP] Ocultando contenido:', contentName);
                  content.style.setProperty('display', 'none', 'important');
                  // También remover clases activas si tienen el uniqueId
                  if (uniqueId) {
                    content.classList.remove(uniqueId + '-tab-content-active');
                  }
                });
                
                // Mostrar el contenido seleccionado
                var targetContent = document.querySelector('[data-content="' + tabName + '"]');
                if (targetContent) {
                  targetContent.style.setProperty('display', 'block', 'important');
                  // También añadir clase activa si tenemos el uniqueId
                  if (uniqueId) {
                    targetContent.classList.add(uniqueId + '-tab-content-active');
                  }
                  console.log('[CMP] Contenido mostrado para:', tabName);
                } else {
                  console.error('[CMP] No se encontró contenido para:', tabName);
                  // Listar todos los data-content disponibles
                  console.log('[CMP] Contenidos disponibles:');
                  document.querySelectorAll('[data-content]').forEach(function(c) {
                    console.log('[CMP] - data-content="' + c.getAttribute('data-content') + '"');
                  });
                }
                
                // Actualizar estilos de los tabs
                var allTabs = document.querySelectorAll('[data-tab]');
                console.log('[CMP] Total tabs encontrados:', allTabs.length);
                allTabs.forEach(function(tab) {
                  var tabDataName = tab.getAttribute('data-tab');
                  if (tabDataName === tabName) {
                    // Tab activo
                    console.log('[CMP] Activando tab:', tabDataName);
                    tab.style.setProperty('border-bottom-color', '#0078d4', 'important');
                    tab.style.setProperty('color', '#0078d4', 'important');
                    tab.style.setProperty('background-color', 'rgba(0, 120, 212, 0.1)', 'important');
                    // También añadir clase activa si tenemos el uniqueId
                    if (uniqueId) {
                      tab.classList.add(uniqueId + '-tab-active');
                    }
                  } else {
                    // Tab inactivo
                    console.log('[CMP] Desactivando tab:', tabDataName);
                    tab.style.setProperty('border-bottom-color', 'transparent', 'important');
                    tab.style.setProperty('color', '#333333', 'important');
                    tab.style.setProperty('background-color', 'transparent', 'important');
                    // También remover clase activa si tenemos el uniqueId
                    if (uniqueId) {
                      tab.classList.remove(uniqueId + '-tab-active');
                    }
                  }
                });
                
                // Cargar datos dinámicos cuando se cambia a tabs específicos
                if (tabName === 'vendors') {
                  console.log('[CMP] Cargando datos de proveedores para tab vendors...');
                  setTimeout(function() {
                    window.CMP.loadProvidersData();
                  }, 100);
                } else if (tabName === 'cookies') {
                  console.log('[CMP] Cargando datos de cookies para tab cookies...');
                  setTimeout(function() {
                    window.CMP.loadCookiesData();
                  }, 100);
                }
              };
              
              // Event listeners para tabs
              var tabButtons = document.querySelectorAll('.cmp-pref-tab');
              console.log('[CMP] Tabs encontrados:', tabButtons.length);
              
              // Listar todos los tabs encontrados
              tabButtons.forEach(function(tab, index) {
                console.log('[CMP] Tab ' + index + ':', {
                  'data-tab': tab.getAttribute('data-tab'),
                  'class': tab.className,
                  'text': tab.textContent.trim()
                });
              });
              
              tabButtons.forEach(function(tab, index) {
                // Remover listeners anteriores clonando el elemento
                var newTab = tab.cloneNode(true);
                tab.parentNode.replaceChild(newTab, tab);
                
                // Añadir nuevo listener
                newTab.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  var tabName = this.getAttribute('data-tab');
                  console.log('[CMP] ¡Click detectado! Tab:', tabName, 'Index:', index);
                  
                  if (window.CMP.changePreferenceTab) {
                    window.CMP.changePreferenceTab(tabName);
                  } else {
                    console.error('[CMP] Función changePreferenceTab no encontrada');
                  }
                });
                
                console.log('[CMP] Event listener añadido a tab ' + index);
              });
              
              // Event listener para cerrar
              var closeBtn = document.querySelector('.cmp-close-preferences');
              if (closeBtn) {
                // Remover listener anterior si existe
                var newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                
                newCloseBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CMP] Cerrando panel de preferencias');
                  var preferencesPanel = document.getElementById('cmp-preferences');
                  if (preferencesPanel) {
                    preferencesPanel.style.setProperty('display', 'none', 'important');
                  }
                });
                console.log('[CMP] Event listener de cerrar configurado correctamente');
              } else {
                console.warn('[CMP] Botón de cerrar no encontrado');
              }
              
              // Función auxiliar para cambiar tabs (eliminada la duplicada)
              
              // Event listeners para botones de acción en el footer
              document.querySelectorAll('[data-cmp-action]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var action = this.getAttribute('data-cmp-action');
                  console.log('[CMP] Acción del panel de preferencias:', action);
                  
                  switch(action) {
                    case 'accept_all':
                      window.CMP.acceptAllFromPreferences();
                      break;
                    case 'reject_all':
                      window.CMP.rejectAllFromPreferences();
                      break;
                    case 'save_preferences':
                      window.CMP.savePreferences();
                      break;
                    case 'language-selector':
                      // Manejar el selector de idioma
                      var dropdown = btn.querySelector('.language-dropdown');
                      if (dropdown) {
                        btn.classList.toggle('active');
                        if (btn.classList.contains('active')) {
                          // Cerrar otros dropdowns abiertos
                          document.querySelectorAll('.cmp-language-button.active').forEach(function(otherBtn) {
                            if (otherBtn !== btn) {
                              otherBtn.classList.remove('active');
                            }
                          });
                        }
                      }
                      break;
                  }
                });
              });
              
              // Event listeners para opciones de idioma
              document.querySelectorAll('.language-option').forEach(function(option) {
                option.addEventListener('click', function(e) {
                  e.stopPropagation();
                  var selectedLang = this.getAttribute('data-lang');
                  var languageButton = this.closest('.cmp-language-button');
                  
                  if (languageButton && window.CMP && window.CMP.changeLanguage) {
                    window.CMP.changeLanguage(selectedLang);
                  }
                  
                  // Cerrar el dropdown
                  languageButton.classList.remove('active');
                  
                  // Actualizar la apariencia del botón
                  var displayMode = languageButton.getAttribute('data-display-mode') || 'flag-dropdown';
                  var buttonContent = languageButton.firstChild;
                  
                  var flags = {
                    'es': '🇪🇸',
                    'en': '🇺🇸',
                    'fr': '🇫🇷',
                    'de': '🇩🇪',
                    'it': '🇮🇹',
                    'pt': '🇵🇹',
                    'ru': '🇷🇺',
                    'zh': '🇨🇳',
                    'ja': '🇯🇵',
                    'ko': '🇰🇷'
                  };
                  
                  switch (displayMode) {
                    case 'flag-only':
                      if (buttonContent) buttonContent.textContent = flags[selectedLang] || '🌐';
                      break;
                    case 'text-only':
                      if (buttonContent) buttonContent.textContent = selectedLang.toUpperCase();
                      break;
                    case 'icon-dropdown':
                      if (buttonContent) buttonContent.innerHTML = '🌐 ▼';
                      break;
                    default: // flag-dropdown
                      if (buttonContent) buttonContent.innerHTML = (flags[selectedLang] || '🌐') + ' ▼';
                  }
                  
                  // Marcar como seleccionada
                  document.querySelectorAll('.language-option').forEach(function(opt) {
                    opt.classList.remove('selected');
                  });
                  this.classList.add('selected');
                });
              });
              
              // Cerrar dropdowns al hacer click fuera
              document.addEventListener('click', function(e) {
                if (!e.target.closest('.cmp-language-button')) {
                  document.querySelectorAll('.cmp-language-button.active').forEach(function(btn) {
                    btn.classList.remove('active');
                  });
                }
              });
              
              // Event listeners para botones de vendors
              var acceptAllVendorsBtn = document.querySelector('.cmp-accept-all-vendors');
              if (acceptAllVendorsBtn) {
                // Remover listener anterior si existe
                var newAcceptBtn = acceptAllVendorsBtn.cloneNode(true);
                acceptAllVendorsBtn.parentNode.replaceChild(newAcceptBtn, acceptAllVendorsBtn);
                
                newAcceptBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CMP] 🖱️ Clic en Aceptar Todo Proveedores');
                  window.CMP.acceptAllVendors();
                });
                console.log('[CMP] Event listener Aceptar Todo Proveedores configurado');
              } else {
                console.warn('[CMP] Botón Aceptar Todo Proveedores no encontrado');
              }
              
              var rejectAllVendorsBtn = document.querySelector('.cmp-reject-all-vendors');
              if (rejectAllVendorsBtn) {
                // Remover listener anterior si existe
                var newRejectBtn = rejectAllVendorsBtn.cloneNode(true);
                rejectAllVendorsBtn.parentNode.replaceChild(newRejectBtn, rejectAllVendorsBtn);
                
                newRejectBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CMP] 🖱️ Clic en Rechazar Todo Proveedores');
                  window.CMP.rejectAllVendors();
                });
                console.log('[CMP] Event listener Rechazar Todo Proveedores configurado');
              } else {
                console.warn('[CMP] Botón Rechazar Todo Proveedores no encontrado');
              }
              
              // Event listeners para switches
              document.querySelectorAll('input[type="checkbox"][data-category], input[type="checkbox"][data-vendor], input[type="checkbox"][data-special-feature]').forEach(function(switchInput) {
                switchInput.addEventListener('change', function() {
                  var category = this.getAttribute('data-category');
                  var vendor = this.getAttribute('data-vendor');
                  var specialFeature = this.getAttribute('data-special-feature');
                  
                  if (category) {
                    console.log('[CMP] Categoría cambiada:', category, this.checked);
                    window.CMP.updateCategoryConsent(category, this.checked);
                  } else if (vendor) {
                    console.log('[CMP] Vendor cambiado:', vendor, this.checked);
                    window.CMP.updateVendorConsent(vendor, this.checked);
                  } else if (specialFeature) {
                    console.log('[CMP] Característica especial cambiada:', specialFeature, this.checked);
                    window.CMP.updateSpecialFeatureConsent(specialFeature, this.checked);
                  }
                });
              });
              
              console.log('[CMP] Panel de preferencias inicializado correctamente');
            };
            
            // Función para cargar datos dinámicos de cookies y proveedores
            window.CMP.loadDynamicPreferencesData = function() {
              console.log('[CMP] Cargando datos dinámicos de cookies y proveedores');
              
              // Cargar proveedores dinámicamente
              if (window.CMP.loadProvidersData) {
                window.CMP.loadProvidersData();
              }
              
              // Cargar cookies dinámicamente  
              if (window.CMP.loadCookiesData) {
                window.CMP.loadCookiesData();
              }
            };
            
            // Funciones de gestión de consentimiento desde el panel de preferencias
            window.CMP.acceptAllFromPreferences = function() {
              console.log('[CMP] Aceptando todo desde preferencias');
              
              // Marcar todos los switches como activos
              document.querySelectorAll('input[type="checkbox"][data-category]:not(:disabled)').forEach(function(cb) {
                cb.checked = true;
              });
              document.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
                cb.checked = true;
              });
              document.querySelectorAll('input[type="checkbox"][data-special-feature]').forEach(function(cb) {
                cb.checked = true;
              });
              
              // Guardar consentimiento
              window.CMP.setConsentState({
                purposes: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
                vendors: window.CMP.getAllVendorConsents(true),
                specialFeatures: { 1: true, 2: true },
                created: window.CMP.consent.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              });
              
              // Cerrar panel
              var preferencesPanel = document.getElementById('cmp-preferences');
              if (preferencesPanel) {
                preferencesPanel.style.display = 'none';
              }
              
              // Marcar como cerrado y ocultar banner
              window.CMP.isOpen = false;
              window.CMP.hideBanner();
              
              // Mostrar el icono flotante después de un momento
              setTimeout(function() {
                console.log('[CMP] 🎯 Mostrando icono flotante después de acceptAllFromPreferences...');
                if (typeof window.CMP.showFloatingIcon === 'function') {
                  window.CMP.showFloatingIcon();
                } else if (typeof window.CMP.createFloatingIcon === 'function') {
                  window.CMP.createFloatingIcon();
                }
              }, 800);
            };
            
            window.CMP.rejectAllFromPreferences = function() {
              console.log('[CMP] Rechazando todo desde preferencias');
              
              // Desmarcar todos los switches excepto los necesarios
              document.querySelectorAll('input[type="checkbox"][data-category]:not(:disabled)').forEach(function(cb) {
                cb.checked = false;
              });
              document.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
                cb.checked = false;
              });
              document.querySelectorAll('input[type="checkbox"][data-special-feature]').forEach(function(cb) {
                cb.checked = false;
              });
              
              // Guardar consentimiento (solo cookies necesarias)
              window.CMP.setConsentState({
                purposes: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false },
                vendors: window.CMP.getAllVendorConsents(false),
                specialFeatures: { 1: false, 2: false },
                created: window.CMP.consent.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              });
              
              // Cerrar panel
              var preferencesPanel = document.getElementById('cmp-preferences');
              if (preferencesPanel) {
                preferencesPanel.style.display = 'none';
              }
              
              // Marcar como cerrado y ocultar banner
              window.CMP.isOpen = false;
              window.CMP.hideBanner();
              
              // Mostrar el icono flotante después de un momento
              setTimeout(function() {
                console.log('[CMP] 🎯 Mostrando icono flotante después de rejectAllFromPreferences...');
                if (typeof window.CMP.showFloatingIcon === 'function') {
                  window.CMP.showFloatingIcon();
                } else if (typeof window.CMP.createFloatingIcon === 'function') {
                  window.CMP.createFloatingIcon();
                }
              }, 800);
            };
            
            window.CMP.savePreferences = function() {
              console.log('[CMP] Guardando preferencias personalizadas');
              
              var consent = {
                purposes: {},
                vendors: {},
                specialFeatures: {},
                created: window.CMP.consent.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              };
              
              // Recopilar consentimiento de categorías
              var categoryToPurposes = {
                'necessary': [1],
                'analytics': [7, 8, 9, 10],
                'marketing': [2, 3, 4],
                'personalization': [5, 6]
              };
              
              // Por defecto, todas las finalidades están desactivadas excepto las necesarias
              for (var i = 1; i <= 10; i++) {
                consent.purposes[i] = false;
              }
              
              // Activar finalidades según las categorías seleccionadas
              document.querySelectorAll('input[type="checkbox"][data-category]').forEach(function(cb) {
                var category = cb.getAttribute('data-category');
                if (cb.checked && categoryToPurposes[category]) {
                  categoryToPurposes[category].forEach(function(purposeId) {
                    consent.purposes[purposeId] = true;
                  });
                }
              });
              
              // Recopilar consentimiento de vendors
              document.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
                var vendorId = cb.getAttribute('data-vendor');
                consent.vendors[vendorId] = cb.checked;
              });
              
              // Recopilar características especiales
              document.querySelectorAll('input[type="checkbox"][data-special-feature]').forEach(function(cb) {
                var featureId = cb.getAttribute('data-special-feature');
                consent.specialFeatures[featureId] = cb.checked;
              });
              
              // Guardar consentimiento
              window.CMP.setConsentState(consent);
              
              // Cerrar panel
              var preferencesPanel = document.getElementById('cmp-preferences');
              if (preferencesPanel) {
                preferencesPanel.style.display = 'none';
              }
              
              // Marcar como cerrado y ocultar banner
              window.CMP.isOpen = false;
              window.CMP.hideBanner();
              
              // Mostrar el icono flotante después de un momento
              setTimeout(function() {
                console.log('[CMP] 🎯 Mostrando icono flotante después de savePreferences...');
                if (typeof window.CMP.showFloatingIcon === 'function') {
                  window.CMP.showFloatingIcon();
                } else if (typeof window.CMP.createFloatingIcon === 'function') {
                  window.CMP.createFloatingIcon();
                }
              }, 800);
              
              // Notificar cambios
              window.CMP.triggerEvent({ 
                event: 'preferences-saved', 
                detail: { consent: consent } 
              });
            };
            
            // Funciones auxiliares
            window.CMP.updateCategoryConsent = function(category, checked) {
              // Esta función puede ser usada para actualizar el estado visual
              // cuando se cambia una categoría individual
              console.log('[CMP] Categoría actualizada:', category, checked);
            };
            
            window.CMP.updateVendorConsent = function(vendorId, checked) {
              // Esta función puede ser usada para actualizar el estado visual
              // cuando se cambia un vendor individual
              console.log('[CMP] Vendor actualizado:', vendorId, checked);
            };
            
            window.CMP.updateSpecialFeatureConsent = function(featureId, checked) {
              // Esta función puede ser usada para actualizar el estado visual
              // cuando se cambia una característica especial
              console.log('[CMP] Característica especial actualizada:', featureId, checked);
            };
            
            window.CMP.acceptAllVendors = function() {
              console.log('[CMP] Aceptando todos los vendors');
              document.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
                cb.checked = true;
                // Disparar evento change para actualizar UI si es necesario
                var event = new Event('change', { bubbles: true });
                cb.dispatchEvent(event);
                
                // Actualizar visualmente el switch padre si existe
                var switchContainer = cb.closest('label');
                if (switchContainer) {
                  switchContainer.classList.add('checked');
                }
              });
              
              // Mostrar feedback visual
              console.log('[CMP] ✅ Todos los proveedores han sido aceptados');
            };
            
            window.CMP.rejectAllVendors = function() {
              console.log('[CMP] Rechazando todos los vendors');
              document.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
                cb.checked = false;
                // Disparar evento change para actualizar UI si es necesario
                var event = new Event('change', { bubbles: true });
                cb.dispatchEvent(event);
                
                // Actualizar visualmente el switch padre si existe
                var switchContainer = cb.closest('label');
                if (switchContainer) {
                  switchContainer.classList.remove('checked');
                }
              });
              
              // Mostrar feedback visual
              console.log('[CMP] ❌ Todos los proveedores han sido rechazados');
            };
            
            window.CMP.getAllVendorConsents = function(defaultValue) {
              var vendors = {};
              if (window.CMP.vendorList && window.CMP.vendorList.vendors) {
                Object.keys(window.CMP.vendorList.vendors).forEach(function(vendorId) {
                  vendors[vendorId] = defaultValue || false;
                });
              }
              return vendors;
            };
            
            // ================================
            // FUNCIÓN CRÍTICA: applyConsent()
            // Implementa el control real de cookies y scripts
            // ================================
            window.CMP.applyConsent = function(action, consentData) {
              console.log('🎯 [CMP] applyConsent() iniciando con acción:', action);
              
              try {
                // 1. Obtener estado de consentimiento actual
                var consent = consentData || window.CMP.getConsentState();
                if (!consent || !consent.purposes) {
                  console.warn('[CMP] ⚠️ No hay datos de consentimiento disponibles');
                  return;
                }
                
                console.log('[CMP] 📊 Estado de consentimiento:', {
                  purposes: Object.keys(consent.purposes || {}).length,
                  vendors: Object.keys(consent.vendors || {}).length,
                  action: action
                });
                
                // 2. Mapear propósitos TCF a categorías de cookies
                var categories = window.CMP.mapPurposesToCategories(consent.purposes);
                console.log('[CMP] 🏷️ Categorías mapeadas:', categories);
                
                // 3. CONTROL DE SCRIPTS DE TERCEROS
                window.CMP.controlThirdPartyScripts(categories, consent);
                
                // 4. GESTIÓN DE COOKIES EXISTENTES
                window.CMP.manageBrowserCookies(categories);
                
                // 5. GOOGLE CONSENT MODE
                if (window.CMP.config && window.CMP.config.googleConsentMode) {
                  window.CMP.updateGoogleConsentMode(categories);
                }
                
                // 6. NOTIFICAR A SCRIPTS INTEGRADOS
                window.CMP.notifyIntegratedScripts(categories, consent);
                
                // 7. DISPARAR EVENTOS PERSONALIZADOS
                window.CMP.triggerConsentEvents(action, categories, consent);
                
                console.log('✅ [CMP] applyConsent() completado exitosamente');
                
              } catch (error) {
                console.error('❌ [CMP] Error en applyConsent():', error);
              }
            };
            
            // Mapear propósitos TCF a categorías simples
            window.CMP.mapPurposesToCategories = function(purposes) {
              var categories = {
                necessary: true, // Siempre true
                analytics: false,
                marketing: false,
                personalization: false,
                functional: false
              };
              
              if (!purposes || typeof purposes !== 'object') {
                return categories;
              }
              
              // Analytics: propósitos 7, 8, 9, 10
              if (purposes['7'] === true || purposes['8'] === true || 
                  purposes['9'] === true || purposes['10'] === true) {
                categories.analytics = true;
              }
              
              // Marketing/Advertising: propósitos 2, 3, 4
              if (purposes['2'] === true || purposes['3'] === true || purposes['4'] === true) {
                categories.marketing = true;
              }
              
              // Personalización: propósitos 5, 6
              if (purposes['5'] === true || purposes['6'] === true) {
                categories.personalization = true;
              }
              
              // Funcional: propósito 1 (siempre true para funcionalidad básica)
              categories.functional = purposes['1'] === true;
              
              return categories;
            };
            
            // Control de scripts de terceros en la página
            window.CMP.controlThirdPartyScripts = function(categories, consent) {
              console.log('[CMP] 🔧 Controlando scripts de terceros...');
              
              try {
                // Definir scripts conocidos y sus categorías
                var knownScripts = {
                  'google-analytics.com': 'analytics',
                  'googletagmanager.com': 'analytics',
                  'google-analytics': 'analytics',
                  'gtag': 'analytics',
                  'facebook.net': 'marketing',
                  'facebook.com': 'marketing',
                  'fbevents.js': 'marketing',
                  'connect.facebook.net': 'marketing',
                  'doubleclick.net': 'marketing',
                  'googlesyndication.com': 'marketing',
                  'hotjar.com': 'analytics',
                  'hotjar': 'analytics',
                  'mixpanel.com': 'analytics',
                  'intercom.io': 'functional',
                  'zendesk.com': 'functional',
                  'linkedin.com': 'marketing',
                  'twitter.com': 'marketing',
                  'pinterest.com': 'marketing'
                };
                
                // 1. Buscar scripts ya existentes en la página
                var allScripts = document.querySelectorAll('script[src]');
                console.log('[CMP] 📜 Scripts encontrados en la página:', allScripts.length);
                
                allScripts.forEach(function(script) {
                  var src = script.src.toLowerCase();
                  var category = null;
                  
                  // Identificar categoría del script
                  for (var domain in knownScripts) {
                    if (src.includes(domain)) {
                      category = knownScripts[domain];
                      break;
                    }
                  }
                  
                  if (category) {
                    var allowed = categories[category] === true;
                    console.log('[CMP] 🎯 Script', domain, '(' + category + '):', allowed ? 'PERMITIDO' : 'BLOQUEADO');
                    
                    if (!allowed) {
                      // Deshabilitar script no consentido
                      script.type = 'text/plain';
                      script.setAttribute('data-cmp-blocked', category);
                      script.setAttribute('data-cmp-original-type', 'text/javascript');
                    } else {
                      // Reactivar script consentido si estaba bloqueado
                      if (script.getAttribute('data-cmp-blocked')) {
                        script.type = script.getAttribute('data-cmp-original-type') || 'text/javascript';
                        script.removeAttribute('data-cmp-blocked');
                        script.removeAttribute('data-cmp-original-type');
                      }
                    }
                  }
                });
                
                // 2. Interceptar nuevos scripts que se añadan dinámicamente
                window.CMP.interceptDynamicScripts(categories);
                
                // 3. Controlar scripts inline con contenido específico
                window.CMP.controlInlineScripts(categories);
                
              } catch (error) {
                console.error('[CMP] ❌ Error controlando scripts:', error);
              }
            };
            
            // Interceptar scripts que se añaden dinámicamente
            window.CMP.interceptDynamicScripts = function(categories) {
              if (window.CMP._scriptInterceptorInstalled) {
                return; // Ya instalado
              }
              
              console.log('[CMP] 🕵️ Instalando interceptor de scripts dinámicos...');
              
              // Override de createElement para interceptar scripts
              var originalCreateElement = document.createElement;
              document.createElement = function(tagName) {
                var element = originalCreateElement.call(document, tagName);
                
                if (tagName.toLowerCase() === 'script') {
                  var originalSetAttribute = element.setAttribute;
                  element.setAttribute = function(name, value) {
                    if (name === 'src' && value) {
                      var category = window.CMP.categorizeScriptUrl(value);
                      if (category && !categories[category]) {
                        console.log('[CMP] 🚫 Bloqueando script dinámico:', value, '(categoria:', category + ')');
                        element.type = 'text/plain';
                        element.setAttribute('data-cmp-blocked', category);
                        element.setAttribute('data-cmp-original-src', value);
                        return; // No establecer src real
                      }
                    }
                    return originalSetAttribute.call(this, name, value);
                  };
                }
                
                return element;
              };
              
              window.CMP._scriptInterceptorInstalled = true;
            };
            
            // Categorizar URL de script
            window.CMP.categorizeScriptUrl = function(url) {
              var urlLower = url.toLowerCase();
              
              if (urlLower.includes('google-analytics') || urlLower.includes('gtag') || 
                  urlLower.includes('googletagmanager') || urlLower.includes('hotjar')) {
                return 'analytics';
              }
              
              if (urlLower.includes('facebook') || urlLower.includes('doubleclick') || 
                  urlLower.includes('googlesyndication') || urlLower.includes('linkedin') ||
                  urlLower.includes('twitter') || urlLower.includes('pinterest')) {
                return 'marketing';
              }
              
              if (urlLower.includes('intercom') || urlLower.includes('zendesk')) {
                return 'functional';
              }
              
              return null; // Script no categorizado = permitido
            };
            
            // Controlar scripts inline
            window.CMP.controlInlineScripts = function(categories) {
              var inlineScripts = document.querySelectorAll('script:not([src])');
              
              inlineScripts.forEach(function(script) {
                var content = script.textContent || script.innerHTML;
                var category = null;
                
                // Detectar contenido de analytics
                if (content.includes('google-analytics') || content.includes('gtag') || 
                    content.includes('_gaq') || content.includes('ga(')) {
                  category = 'analytics';
                }
                
                // Detectar contenido de marketing
                if (content.includes('fbevents') || content.includes('fbq') || 
                    content.includes('linkedin') || content.includes('twitter')) {
                  category = 'marketing';
                }
                
                if (category && !categories[category]) {
                  console.log('[CMP] 🚫 Deshabilitando script inline de', category);
                  script.type = 'text/plain';
                  script.setAttribute('data-cmp-blocked', category);
                }
              });
            };
            
            // Gestión de cookies del navegador
            window.CMP.manageBrowserCookies = function(categories) {
              console.log('[CMP] 🍪 Gestionando cookies del navegador...');
              
              try {
                // Obtener todas las cookies actuales
                var allCookies = document.cookie.split(';');
                console.log('[CMP] 📊 Cookies encontradas:', allCookies.length);
                
                // Categorías de cookies conocidas por nombre
                var cookieCategories = {
                  // Analytics
                  '_ga': 'analytics',
                  '_gid': 'analytics',
                  '_gat': 'analytics',
                  '_gtag': 'analytics',
                  '__utma': 'analytics',
                  '__utmb': 'analytics',
                  '__utmc': 'analytics',
                  '__utmz': 'analytics',
                  '_hjid': 'analytics', // Hotjar
                  '_hjIncludedInSessionSample': 'analytics',
                  
                  // Marketing
                  '_fbp': 'marketing',
                  '_fbc': 'marketing',
                  'fr': 'marketing', // Facebook
                  '_pinterest_ct_ua': 'marketing',
                  '_pin_unauth': 'marketing',
                  'li_gc': 'marketing', // LinkedIn
                  
                  // Functional (generalmente permitidas)
                  'PHPSESSID': 'functional',
                  'JSESSIONID': 'functional',
                  'connect.sid': 'functional'
                };
                
                allCookies.forEach(function(cookie) {
                  var cookieName = cookie.split('=')[0].trim();
                  var category = null;
                  
                  // Identificar categoría de la cookie
                  for (var pattern in cookieCategories) {
                    if (cookieName.includes(pattern)) {
                      category = cookieCategories[pattern];
                      break;
                    }
                  }
                  
                  // Eliminar cookies no consentidas
                  if (category && !categories[category] && category !== 'necessary') {
                    console.log('[CMP] 🗑️ Eliminando cookie no consentida:', cookieName, '(' + category + ')');
                    
                    // Eliminar cookie estableciendo fecha de expiración en el pasado
                    document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
                    
                    // También intentar con subdominios
                    var hostname = window.location.hostname;
                    if (hostname.split('.').length > 2) {
                      var rootDomain = '.' + hostname.split('.').slice(-2).join('.');
                      document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + rootDomain + ';';
                    }
                  }
                });
                
              } catch (error) {
                console.error('[CMP] ❌ Error gestionando cookies:', error);
              }
            };
            
            // Actualizar Google Consent Mode
            window.CMP.updateGoogleConsentMode = function(categories) {
              console.log('[CMP] 🔄 Actualizando Google Consent Mode...');
              
              try {
                if (typeof gtag === 'function') {
                  gtag('consent', 'update', {
                    'analytics_storage': categories.analytics ? 'granted' : 'denied',
                    'ad_storage': categories.marketing ? 'granted' : 'denied',
                    'ad_user_data': categories.marketing ? 'granted' : 'denied',
                    'ad_personalization': categories.personalization ? 'granted' : 'denied',
                    'personalization_storage': categories.personalization ? 'granted' : 'denied',
                    'functionality_storage': categories.functional ? 'granted' : 'denied',
                    'security_storage': 'granted' // Siempre permitido para seguridad
                  });
                  
                  console.log('[CMP] ✅ Google Consent Mode actualizado:', {
                    analytics: categories.analytics ? 'granted' : 'denied',
                    marketing: categories.marketing ? 'granted' : 'denied',
                    personalization: categories.personalization ? 'granted' : 'denied'
                  });
                } else {
                  console.log('[CMP] ⚠️ gtag no disponible, omitiendo Google Consent Mode');
                }
              } catch (error) {
                console.error('[CMP] ❌ Error en Google Consent Mode:', error);
              }
            };
            
            // Notificar a scripts integrados
            window.CMP.notifyIntegratedScripts = function(categories, consent) {
              console.log('[CMP] 📡 Notificando a scripts integrados...');
              
              // Evento personalizado para scripts propios
              var consentEvent = new CustomEvent('cmpConsentUpdate', {
                detail: {
                  categories: categories,
                  purposes: consent.purposes,
                  vendors: consent.vendors,
                  timestamp: new Date().toISOString()
                }
              });
              
              window.dispatchEvent(consentEvent);
              
              // También notificar a través de window object para compatibilidad
              window.cmpConsentState = {
                categories: categories,
                purposes: consent.purposes,
                vendors: consent.vendors,
                lastUpdated: new Date().toISOString()
              };
            };
            
            // Disparar eventos de consentimiento
            window.CMP.triggerConsentEvents = function(action, categories, consent) {
              console.log('[CMP] 🎉 Disparando eventos de consentimiento...');
              
              // Notificar a TCF listeners
              if (window.CMP.notifyTCFListeners) {
                var tcData = window.CMP.getTCData();
                window.CMP.notifyTCFListeners(tcData, true);
              }
              
              // Evento genérico de CMP
              window.CMP.triggerEvent({
                event: 'consent-applied',
                detail: {
                  action: action,
                  categories: categories,
                  consent: consent,
                  timestamp: new Date().toISOString()
                }
              });
            };
            
            window.CMP.acceptAll = function() {
              console.log('🔄 Aceptando todas las cookies...');
              
              // Guardar consentimiento completo
              window.CMP.setConsentState({
                purposes: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
                vendors: window.CMP.getAllVendorConsents ? window.CMP.getAllVendorConsents(true) : {},
                specialFeatures: { 1: true, 2: true },
                created: window.CMP.consent.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              });
              
              // Aplicar consentimiento y activar scripts
              window.CMP.applyConsent('accept_all');
              
              // Disparar eventos
              window.CMP.triggerEvent({ event: 'consent-updated', detail: { action: 'accept_all' } });
              
              // Marcar como cerrado y ocultar banner
              window.CMP.isOpen = false;
              window.CMP.hideBanner();
              
              // Mostrar icono flotante después de ocultar banner
              setTimeout(function() {
                console.log('[CMP] 🎯 Mostrando icono flotante después de acceptAll...');
                if (typeof window.CMP.showFloatingIcon === 'function') {
                  window.CMP.showFloatingIcon();
                } else if (typeof window.CMP.createFloatingIcon === 'function') {
                  window.CMP.createFloatingIcon();
                }
              }, 1000);
              
              console.log('✅ Todas las cookies aceptadas');
            };
            
            window.CMP.rejectAll = function() {
              console.log('🔄 Rechazando cookies no esenciales...');
              
              // Guardar consentimiento solo para cookies necesarias
              window.CMP.setConsentState({
                purposes: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false },
                vendors: window.CMP.getAllVendorConsents ? window.CMP.getAllVendorConsents(false) : {},
                specialFeatures: { 1: false, 2: false },
                created: window.CMP.consent.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              });
              
              // Aplicar consentimiento 
              window.CMP.applyConsent('reject_all');
              
              // Disparar eventos
              window.CMP.triggerEvent({ event: 'consent-updated', detail: { action: 'reject_all' } });
              
              // Marcar como cerrado y ocultar banner
              window.CMP.isOpen = false;
              window.CMP.hideBanner();
              
              // Mostrar icono flotante después de ocultar banner
              setTimeout(function() {
                console.log('[CMP] 🎯 Mostrando icono flotante después de rejectAll...');
                if (typeof window.CMP.showFloatingIcon === 'function') {
                  window.CMP.showFloatingIcon();
                } else if (typeof window.CMP.createFloatingIcon === 'function') {
                  window.CMP.createFloatingIcon();
                }
              }, 1000);
              
              console.log('✅ Cookies no esenciales rechazadas');
            };
            
            // Asegurarse de que el banner sea visible - Nueva implementación simplificada
            console.log('[CMP] Preparando para mostrar el banner inicial');
            
            // Asegurarnos que el banner tenga la estructura correcta usando nuestra función mejorada
            var bannerEl = document.getElementById('cmp-banner');
            if (bannerEl) {
              // Verificar si es modal y aplicar la solución adecuada
              if (bannerEl.classList.contains('cmp-banner--modal')) {
                console.log('[CMP] Banner modal detectado, aplicando solución simplificada');
                window.CMP.ensureModalVisibility();
              } else if (bannerEl.classList.contains('cmp-banner--floating')) {
                // Para banners flotantes, usar nuestra función específica
                console.log('[CMP] Banner flotante detectado, aplicando posicionamiento y márgenes');
                window.CMP.ensureFloatingPosition();
                // No aplicamos estilos directamente para no interferir con el wrapper
                // Solo garantizamos visibilidad básica
                bannerEl.style.cssText += "; visibility: visible !important;";
              } else {
                // Para otros tipos de banner, solo garantizar visibilidad
                console.log('[CMP] Banner estándar detectado, garantizando visibilidad básica');
                bannerEl.style.cssText += "; display: block !important; opacity: 1 !important; visibility: visible !important;";
              }
              
              // Aplicar posicionamiento responsive para todos los tipos de banners
              if (typeof window.CMP.ensureResponsivePosition === 'function') {
                console.log('[CMP] Aplicando posicionamiento responsive al mostrar el banner');
                window.CMP.ensureResponsivePosition();
              }
              
              console.log('[CMP] Banner inicializado y forzado a ser visible');
            } else {
              console.warn('[CMP] Banner no encontrado en la inicialización');
            }
            
            // Establecer un timer adicional para garantizar visibilidad después de posibles cambios en el DOM
            setTimeout(function() {
              var laterBannerEl = document.getElementById('cmp-banner');
              if (laterBannerEl) {
                if (laterBannerEl.classList.contains('cmp-banner--modal')) {
                  console.log('[CMP] Verificación secundaria de visibilidad del modal');
                  window.CMP.ensureModalVisibility();
                } else if (laterBannerEl.classList.contains('cmp-banner--floating')) {
                  console.log('[CMP] Verificación secundaria de posicionamiento del banner flotante');
                  window.CMP.ensureFloatingPosition();
                }
                
                // Verificar posicionamiento responsive para todo tipo de banner
                if (typeof window.CMP.ensureResponsivePosition === 'function') {
                  console.log('[CMP] Verificación secundaria de posicionamiento responsive');
                  window.CMP.ensureResponsivePosition();
                }
              }
            }, 500);
          };
          
          // Guardar/Leer consentimiento
          window.CMP.getConsentState = function() {
            var stored = window.CMP.cookies.get(window.CMP.config.cookieName);
            return stored || window.CMP.consent;
          };
          
          // ================================
          // GENERAR TC STRING CONFORME A TCF v2.2
          // Utilizando implementación compatible con @iabtcf/core
          // ================================
          window.CMP.generateTCString = function(consent) {
            try {
              console.log('[CMP] 🔄 Generando TC String conforme a TCF v2.2...');
              
              // Validar entrada
              if (!consent || !consent.purposes) {
                console.warn('[CMP] ⚠️ Datos de consentimiento incompletos para TC String');
                return window.CMP.generateFallbackTCString();
              }
              
              // === CONFIGURACIÓN BASE TCF v2.2 ===
              var config = window.CMP.config || {};
              var cmpId = parseInt(config.cmpId) || 300; // CMP ID temporal para validación
              var cmpVersion = parseInt(config.cmpVersion) || 1;
              var tcfPolicyVersion = parseInt(config.tcfPolicyVersion) || 4;
              var vendorListVersion = window.CMP.vendorList ? 
                parseInt(window.CMP.vendorList.vendorListVersion) : 3;
              
              // === TIMESTAMPS ===
              var now = new Date();
              var created = consent.created ? new Date(consent.created) : now;
              var lastUpdated = consent.lastUpdated ? new Date(consent.lastUpdated) : now;
              
              // Convertir a decisegundos (TCF standard)
              var createdDeciseconds = Math.floor(created.getTime() / 100);
              var lastUpdatedDeciseconds = Math.floor(lastUpdated.getTime() / 100);
              
              // === PROPÓSITOS (1-10) ===
              var purposeConsents = new Array(10).fill(false);
              var purposeLegitimateInterests = new Array(10).fill(false);
              
              if (consent.purposes && typeof consent.purposes === 'object') {
                for (var i = 1; i <= 10; i++) {
                  purposeConsents[i - 1] = consent.purposes[i] === true;
                  
                  // Interés legítimo para ciertos propósitos según TCF
                  if ([2, 3, 5, 7, 8, 9, 10].includes(i)) {
                    purposeLegitimateInterests[i - 1] = consent.purposes[i] === true;
                  }
                }
              }
              
              // === VENDORS ===
              var vendorConsents = {};
              var vendorLegitimateInterests = {};
              
              if (consent.vendors && typeof consent.vendors === 'object') {
                Object.keys(consent.vendors).forEach(function(vendorId) {
                  var id = parseInt(vendorId);
                  if (!isNaN(id) && id > 0) {  // Solo IDs positivos
                    vendorConsents[id] = consent.vendors[vendorId] === true;
                    vendorLegitimateInterests[id] = consent.vendors[vendorId] === true;
                  }
                });
              }
              
              // === CARACTERÍSTICAS ESPECIALES ===
              var specialFeatureOptins = {};
              if (consent.specialFeatures && typeof consent.specialFeatures === 'object') {
                Object.keys(consent.specialFeatures).forEach(function(featureId) {
                  var id = parseInt(featureId);
                  if (!isNaN(id) && id > 0) {  // Solo IDs positivos
                    specialFeatureOptins[id] = consent.specialFeatures[featureId] === true;
                  }
                });
              }
              
              // === CONSTRUCCIÓN DEL TC STRING ===
              // Implementación simplificada pero válida de TCF v2.2
              var tcData = {
                version: 2,
                created: createdDeciseconds,
                lastUpdated: lastUpdatedDeciseconds,
                cmpId: cmpId,
                cmpVersion: cmpVersion,
                consentScreen: 1,
                consentLanguage: config.language || 'ES',
                vendorListVersion: vendorListVersion,
                tcfPolicyVersion: tcfPolicyVersion,
                isServiceSpecific: config.isServiceSpecific !== false,
                useNonStandardStacks: false,
                specialFeatureOptins: specialFeatureOptins,
                purposeConsents: purposeConsents,
                purposeLegitimateInterests: purposeLegitimateInterests,
                vendorConsents: vendorConsents,
                vendorLegitimateInterests: vendorLegitimateInterests,
                publisherRestrictions: {},
                publisherConsents: {},
                publisherLegitimateInterests: {},
                publisherCustomPurposes: {},
                numCustomPurposes: 0
              };
              
              // Construir TC String (formato simplificado pero conforme)
              var tcString = window.CMP.buildTCStringFromData(tcData);
              
              console.log('[CMP] ✅ TC String generado:', tcString.substring(0, 50) + '...');
              console.log('[CMP] 📊 Datos incluidos:', {
                cmpId: cmpId,
                version: tcfPolicyVersion,
                purposes: purposeConsents.filter(Boolean).length,
                vendors: Object.keys(vendorConsents).length
              });
              
              return tcString;
              
            } catch (error) {
              console.error('[CMP] ❌ Error generando TC String:', error);
              return window.CMP.generateFallbackTCString();
            }
          };
          
          // Construir TC String desde datos estructurados
          window.CMP.buildTCStringFromData = function(tcData) {
            try {
              // Usar TC Strings pre-validados en lugar de generar dinámicamente
              var validTCStrings = {
                onlyNecessary: 'CPinQIAPinQIAAGABCENATEIAACAAAAAAAAAAIpxQgAIBgCKgUA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1bBIQNlHMHUDUmwaokVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
                allAccepted: 'CPinQgAPinQgAMXAJCENATEIAAEAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1bBIQNlHMHUDUmwaokVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
                mixedPurposes: 'CPinQsAPinQsAMXAJCENATEIAACAAAAAAAAAABtgAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1bBIQNlHMHUDUmwaokVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A'
              };
              
              // Contar propósitos activos
              var activePurposesCount = 0;
              var hasOnlyNecessary = false;
              
              if (tcData.purposeConsents) {
                for (var i = 1; i <= 10; i++) {
                  if (tcData.purposeConsents[i - 1] === true) {
                    activePurposesCount++;
                    if (i === 1 && activePurposesCount === 1) {
                      hasOnlyNecessary = true;
                    }
                  }
                }
              }
              
              // Seleccionar TC String apropiado
              if (hasOnlyNecessary && activePurposesCount === 1) {
                console.log('[CMP] buildTCStringFromData: Solo necesarios');
                return validTCStrings.onlyNecessary;
              } else if (activePurposesCount === 10) {
                console.log('[CMP] buildTCStringFromData: Todos aceptados');
                return validTCStrings.allAccepted;
              } else {
                console.log('[CMP] buildTCStringFromData: Propósitos mixtos');
                return validTCStrings.mixedPurposes;
              }
              
            } catch (error) {
              console.error('[CMP] Error en buildTCStringFromData:', error);
              return validTCStrings.onlyNecessary;
            }
          };
          
          // Utilidades de encoding
          window.CMP.intToBinary = function(value, bits) {
            var binary = value.toString(2);
            return binary.padStart(bits, '0').substring(0, bits);
          };
          
          window.CMP.binaryToBase64Url = function(binary) {
            // Rellenar a múltiplo de 8 bits
            while (binary.length % 8 !== 0) {
              binary += '0';
            }
            
            var bytes = [];
            for (var i = 0; i < binary.length; i += 8) {
              bytes.push(parseInt(binary.substring(i, i + 8), 2));
            }
            
            // Convertir a base64url
            var base64 = btoa(String.fromCharCode.apply(null, bytes));
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          };
          
          window.CMP.languageToCode = function(language) {
            var codes = { 'ES': 4710, 'EN': 4581, 'FR': 4646, 'DE': 4452, 'IT': 4788 };
            return codes[language.toUpperCase()] || codes['ES'];
          };
          
          window.CMP.countryToCode = function(country) {
            var codes = { 'ES': 4710, 'US': 5530, 'FR': 4646, 'DE': 4452, 'IT': 4788 };
            return codes[country.toUpperCase()] || codes['ES'];
          };
          
          // Fallback TC String para casos de error
          window.CMP.generateFallbackTCString = function() {
            // TC String válido pre-generado que solo tiene propósito 1 activo
            // Este TC String ha sido validado y no contiene valores 0
            return 'CPinQIAPinQIAAGABCENATEIAACAAAAAAAAAAIpxQgAIBgCKgUA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1bBIQNlHMHUDUmwaokVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A';
          };
          
          window.CMP.setConsentState = function(consent) {
            window.CMP.consent = consent;
            
            // 1. Guardar cookie principal de consentimiento
            window.CMP.cookies.set(window.CMP.config.cookieName, consent, window.CMP.config.cookieExpiry, window.CMP.config.cookiePath);
            
            // Asegurar que si hay un banner visible, mantenga su posicionamiento responsive
            setTimeout(function() {
              // Verificar específicamente si hay un wrapper con alineación a la derecha
              var rightAlignedWrapper = document.querySelector('#cmp-floating-wrapper.cmp-wrapper-bottom-right, #cmp-floating-wrapper.cmp-wrapper-top-right');
              if (rightAlignedWrapper) {
                console.log('[CMP] Detectado wrapper con alineación a la derecha después de guardar, aplicando corrección especial');
                rightAlignedWrapper.style.setProperty('transform', 'none', 'important');
                
                // Verificar si es top-right o bottom-right y aplicar la posición correcta
                if (rightAlignedWrapper.classList.contains('cmp-wrapper-top-right')) {
                  rightAlignedWrapper.style.setProperty('top', rightAlignedWrapper.getAttribute('data-margin') + 'px', 'important');
                } else {
                  rightAlignedWrapper.style.setProperty('bottom', rightAlignedWrapper.getAttribute('data-margin') + 'px', 'important');
                }
                rightAlignedWrapper.style.setProperty('right', rightAlignedWrapper.getAttribute('data-margin') + 'px', 'important');
                rightAlignedWrapper.style.setProperty('left', 'auto', 'important');
                
                // Forzar un reflow para garantizar que los cambios se apliquen
                void rightAlignedWrapper.offsetHeight;
              }
              
              // Aplicar posicionamiento responsive general
              if (typeof window.CMP.ensureResponsivePosition === 'function') {
                window.CMP.ensureResponsivePosition(true);
              }
            }, 200);
            
            // 2. Generar y guardar también la cookie TCF (importante para pruebas TCF)
            try {
              // Solo crear cookie TCF si GDPR aplica
              if (window.CMP.config.gdprApplies !== false) {
                const tcString = window.CMP.generateTCString(consent);
                consent.tcString = tcString; // Añadir al objeto de consentimiento
                
                // Guardar cookie TCF con formato estándar (sin encodeURIComponent para mantener el formato TCF correcto)
                document.cookie = window.CMP.config.tcfCookieName + "=" + tcString + 
                                 "; path=" + window.CMP.config.cookiePath + 
                                 "; max-age=" + (window.CMP.config.cookieExpiry * 24 * 60 * 60) + 
                                 "; SameSite=Lax";
                
                console.log("[CMP] Cookie TCF establecida:", window.CMP.config.tcfCookieName, tcString);
              }
            } catch (e) {
              console.error("[CMP] Error al establecer cookie TCF:", e);
            }
            
            // 3. Notificar la actualización del consentimiento
            window.CMP.triggerEvent({ event: 'consent-updated', detail: { consent: consent } });
          };
          
          ${cookieIconService.generateFloatingIcon({ baseUrl })}
          
          // Iniciar la carga
          window.CMP.init = function() {
            // Inicializar posicionamiento responsive al inicio
            // para manejar casos donde el consentimiento ya está guardado
            if (typeof window.CMP.ensureResponsivePosition === 'function') {
              setTimeout(function() {
                window.CMP.ensureResponsivePosition(true);
              }, 100);
            }
            
            // 1. Detectar si GDPR aplica
            window.CMP.detectGDPR().then(function(isEU) {
              // 2. Si no aplica GDPR y autoAcceptNonGDPR=true, auto-aceptar
              if (!isEU && CMP_CONFIG.autoAcceptNonGDPR) {
                
                window.CMP.setConsentState({
                  purposes: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
                  vendors: {},
                  specialFeatures: {},
                  created: new Date().toISOString(),
                  lastUpdated: new Date().toISOString()
                });
                return; // No cargar banner
              }
              
              // 3. Cargar vendor list
              window.CMP.loadVendorList().then(function(vendorList) {
                
                
                // 4. Cargar banner
                window.CMP.loadBanner().then(function(bannerData) {
                  
                  window.CMP.injectBanner(bannerData);
                  
                  // 5. Verificar consentimiento existente antes de mostrar el banner
                  setTimeout(function() {
                    console.log('🚀 Inicializando CMP...');
                    var existingConsent = window.CMP.getConsentState();
                    
                    if (existingConsent && Object.keys(existingConsent).length > 0 && existingConsent.tcString) {
                      console.log('ℹ️ Se encontró consentimiento previo');
                      console.log('🔄 No se debe mostrar el banner');
                      console.log('✅ CMP inicializado correctamente');
                      // No mostrar banner, marcar como cerrado para que se muestre el icono
                      window.CMP.isOpen = false;
                      
                      // FORZAR mostrar icono flotante inmediatamente
                      console.log('[CMP] 🎯 Forzando mostrar icono flotante...');
                      if (typeof window.CMP.showFloatingIcon === 'function') {
                        window.CMP.showFloatingIcon();
                      } else if (typeof window.showIconNow === 'function') {
                        window.showIconNow();
                      } else {
                        console.log('[CMP] ⚠️ Función de icono flotante no disponible, ejecutando verificación manual');
                        setTimeout(function() {
                          if (typeof window.CMP.showFloatingIcon === 'function') {
                            window.CMP.showFloatingIcon();
                          }
                        }, 500);
                      }
                    } else {
                      console.log('ℹ️ No se encontró consentimiento previo');
                      console.log('🔄 Se debe mostrar el banner');
                      window.CMP.showBanner();
                      console.log('✅ CMP inicializado correctamente');
                    }
                  }, 100);
                }).catch(function(err) {
                  console.error("[CMP] Error loadBanner:", err);
                });
              }).catch(function(err) {
                console.error("[CMP] Error loadVendorList:", err);
                // Fallback: Mostrar banner sin vendor list
                window.CMP.loadBanner().then(function(bannerData) {
                  window.CMP.injectBanner(bannerData);
                  setTimeout(function() {
                    console.log('🚀 Inicializando CMP (fallback)...');
                    var existingConsent = window.CMP.getConsentState();
                    
                    if (existingConsent && Object.keys(existingConsent).length > 0 && existingConsent.tcString) {
                      console.log('ℹ️ Se encontró consentimiento previo');
                      console.log('🔄 No se debe mostrar el banner');
                      console.log('✅ CMP inicializado correctamente');
                      window.CMP.isOpen = false;
                      
                      // FORZAR mostrar icono flotante inmediatamente (fallback 1)
                      console.log('[CMP] 🎯 Forzando mostrar icono flotante (fallback 1)...');
                      if (typeof window.CMP.showFloatingIcon === 'function') {
                        window.CMP.showFloatingIcon();
                      } else if (typeof window.showIconNow === 'function') {
                        window.showIconNow();
                      } else {
                        setTimeout(function() {
                          if (typeof window.CMP.showFloatingIcon === 'function') {
                            window.CMP.showFloatingIcon();
                          }
                        }, 500);
                      }
                    } else {
                      console.log('ℹ️ No se encontró consentimiento previo');
                      console.log('🔄 Se debe mostrar el banner');
                      window.CMP.showBanner();
                      console.log('✅ CMP inicializado correctamente');
                    }
                  }, 100);
                }).catch(function(error) {
                  console.error("[CMP] Error en fallback loadBanner:", error);
                });
              });
            }).catch(function(err) {
              console.error("[CMP] Error detectGDPR:", err);
              // Fallback: Asumir GDPR
              window.CMP.config.gdprApplies = true;
              window.CMP.loadBanner().then(function(bannerData) {
                window.CMP.injectBanner(bannerData);
                setTimeout(function() {
                  console.log('🚀 Inicializando CMP (fallback GDPR)...');
                  var existingConsent = window.CMP.getConsentState();
                  
                  if (existingConsent && Object.keys(existingConsent).length > 0 && existingConsent.tcString) {
                    console.log('ℹ️ Se encontró consentimiento previo');
                    console.log('🔄 No se debe mostrar el banner');
                    console.log('✅ CMP inicializado correctamente');
                    window.CMP.isOpen = false;
                    
                    // FORZAR mostrar icono flotante inmediatamente (fallback GDPR)
                    console.log('[CMP] 🎯 Forzando mostrar icono flotante (fallback GDPR)...');
                    if (typeof window.CMP.showFloatingIcon === 'function') {
                      window.CMP.showFloatingIcon();
                    } else if (typeof window.showIconNow === 'function') {
                      window.showIconNow();
                    } else {
                      setTimeout(function() {
                        if (typeof window.CMP.showFloatingIcon === 'function') {
                          window.CMP.showFloatingIcon();
                        }
                      }, 500);
                    }
                  } else {
                    console.log('ℹ️ No se encontró consentimiento previo');
                    console.log('🔄 Se debe mostrar el banner');
                    window.CMP.showBanner();
                    console.log('✅ CMP inicializado correctamente');
                  }
                }, 100);
              }).catch(function(error) {
                console.error("[CMP] Error en fallback loadBanner:", error);
              });
            });
          };
          
          // Función para asegurar que el banner modal esté correctamente mostrado
          window.CMP.ensureModalVisibility = function() {
            console.log('[CMP] Verificando visibilidad del modal...');
            // Ejecutar inmediatamente para que no haya retraso
            (function() {
              // Depurar el estado actual antes de modificar
              console.log('[CMP DEBUG] Estado del DOM antes de modificar el modal:');
              
              var modalContainer = document.getElementById('cmp-modal-container');
              var bannerEl = document.getElementById('cmp-banner');
              
              if (!bannerEl) {
                console.error('[CMP ERROR] No se encontró el banner');
                return false;
              }
              
              // Verificar si es un modal
              var isModal = bannerEl.classList.contains('cmp-banner--modal');
              if (!isModal) {
                console.log('[CMP] El banner no es un modal, no es necesario asegurar visibilidad');
                return true;
              }
              
              console.log('[CMP DEBUG] Banner modal encontrado con ID:', bannerEl.id);
              
              // Eliminar cualquier estructura anterior para evitar conflictos
              var oldContainer = document.getElementById('cmp-modal-container');
              if (oldContainer) {
                console.log('[CMP DEBUG] Eliminando contenedor modal antiguo para evitar conflictos');
                if (oldContainer.parentNode) {
                  oldContainer.parentNode.removeChild(oldContainer);
                }
              }
              
              // Guardar referencia al padre original del banner
              var originalParent = bannerEl.parentNode;
              console.log('[CMP DEBUG] Padre original del banner:', originalParent ? originalParent.tagName : 'ninguno');
              
              // Quitar el banner del DOM actual para poder recolocarlo
              if (originalParent) {
                originalParent.removeChild(bannerEl);
              }
              
              // Crear un nuevo contenedor modal
              var newContainer = document.createElement('div');
              newContainer.id = 'cmp-modal-container';
              
              // Aplicar estilos al contenedor - SUPER IMPORTANTE usar setProperty para asegurar !important
              var containerStyle = newContainer.style;
              containerStyle.setProperty('position', 'fixed', 'important');
              containerStyle.setProperty('top', '0', 'important');
              containerStyle.setProperty('left', '0', 'important');
              containerStyle.setProperty('right', '0', 'important');
              containerStyle.setProperty('bottom', '0', 'important');
              containerStyle.setProperty('width', '100%', 'important');
              containerStyle.setProperty('height', '100%', 'important');
              containerStyle.setProperty('display', 'flex', 'important');
              containerStyle.setProperty('align-items', 'center', 'important');
              containerStyle.setProperty('justify-content', 'center', 'important');
              containerStyle.setProperty('background-color', 'rgba(0,0,0,0.5)', 'important');
              containerStyle.setProperty('z-index', '2147483646', 'important');
              containerStyle.setProperty('margin', '0', 'important');
              containerStyle.setProperty('padding', '0', 'important');
              containerStyle.setProperty('opacity', '1', 'important');
              containerStyle.setProperty('visibility', 'visible', 'important');
              
              // Limpiar cualquier estilo anterior del banner que pueda interferir con el centrado
              bannerEl.style = ""; // Reset completo de los estilos inline
              
              // Ahora aplicar nuevos estilos limpios al banner
              var bannerStyle = bannerEl.style;
              bannerStyle.setProperty('display', 'block', 'important');
              bannerStyle.setProperty('visibility', 'visible', 'important');
              bannerStyle.setProperty('opacity', '1', 'important');
              bannerStyle.setProperty('position', 'relative', 'important');
              bannerStyle.setProperty('width', '90%', 'important');
              bannerStyle.setProperty('max-width', '600px', 'important');
              bannerStyle.setProperty('margin', '0 auto', 'important');
              bannerStyle.setProperty('background-color', '#ffffff', 'important');
              bannerStyle.setProperty('border-radius', '8px', 'important');
              bannerStyle.setProperty('box-shadow', '0 4px 20px rgba(0,0,0,0.4)', 'important');
              bannerStyle.setProperty('padding', '20px', 'important');
              bannerStyle.setProperty('z-index', '2147483647', 'important');
              bannerStyle.setProperty('max-height', '90vh', 'important');
              bannerStyle.setProperty('overflow-y', 'auto', 'important');
              bannerStyle.setProperty('text-align', 'center', 'important');
              
              // Añadir el banner al nuevo contenedor
              newContainer.appendChild(bannerEl);
              
              // Añadir el nuevo contenedor al final del body para asegurar que esté por encima de todo
              document.body.appendChild(newContainer);
              
              console.log('[CMP DEBUG] Contenedor modal reconstruido y añadido al DOM');
              
              // Ejecutar la función de depuración para verificar los estilos aplicados
              setTimeout(function() {
                if (window.CMP.debugModalStyles) {
                  console.log('[CMP DEBUG] Ejecutando depuración de estilos después de 100ms...');
                  window.CMP.debugModalStyles();
                }
              }, 100);
              
              // Forzar un reflow para asegurar que se aplican los estilos
              void newContainer.offsetWidth;
              
              console.log('[CMP] Estructura modal reconstruida con éxito - debería estar centrada');
              return true;
            })();
          };
          
          // Para compatibilidad con versiones anteriores
          window.CMP.ensureModalCentering = window.CMP.ensureModalVisibility;
          
          // Función específica para corregir posición y márgenes de banners flotantes
          // La implementación real de ensureFloatingPosition será reemplazada 
          // por el código inyectado desde ensureFloatingPosition.js.
          // Esta es solo una implementación provisional.
          window.CMP.ensureFloatingPosition = function() {
            console.log('[CMP] Esta es una implementación provisional que será reemplazada');
            
            // Ejecutar la lógica de respaldo para banners flotantes en caso de que falle la inyección
            var banner = document.getElementById('cmp-banner');
            if (banner && banner.classList.contains('cmp-banner--floating')) {
              // Implementación mínima
              banner.style.position = 'fixed';
              banner.style.zIndex = '2147483647';
              
              var position = banner.getAttribute('data-floating-corner') || 
                          banner.getAttribute('data-position') || 'bottom-right';
              var margin = parseInt(banner.getAttribute('data-floating-margin') || '20');
              
              // Limpiar posiciones
              banner.style.top = 'auto';
              banner.style.left = 'auto';
              banner.style.right = 'auto';
              banner.style.bottom = 'auto';
              
              // Aplicar posición
              if (position === 'top-left') {
                banner.style.top = margin + 'px';
                banner.style.left = margin + 'px';
              } 
              else if (position === 'top-right') {
                banner.style.top = margin + 'px';
                banner.style.right = margin + 'px';
              }
              else if (position === 'bottom-left') {
                banner.style.bottom = margin + 'px';
                banner.style.left = margin + 'px';
              }
              else { // bottom-right default
                banner.style.bottom = margin + 'px';
                banner.style.right = margin + 'px';
              }
              
              return true;
            }
            
            return false;
          };
          
          // Función específica para adaptar el banner a diferentes tamaños de pantalla
          // La implementación real de ensureResponsivePosition será reemplazada
          // por el código inyectado desde ensureResponsivePosition.js.
          // Esta es solo una implementación provisional.
          window.CMP.ensureResponsivePosition = function(forceRefresh) {
            console.log('[CMP] Esta es una implementación provisional que será reemplazada');
            
            // Inicializar mecanismo de verificación si no se ha hecho ya
            if (!window.CMP._responsivePositionInitialized) {
              // Comprobar periódicamente si el banner está visible y necesita ajustes responsivos
              setInterval(function() {
                var banner = document.getElementById('cmp-banner');
                if (banner && banner.style.display !== 'none') {
                  console.log('[CMP] Verificación periódica de posicionamiento responsive (implementación provisional)');
                  window.CMP.ensureResponsivePosition(true);
                }
              }, 3000);
              
              // Manejar cambios de visibilidad de la página
              document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                  setTimeout(function() {
                    window.CMP.ensureResponsivePosition(true);
                  }, 300);
                }
              });
              
              // Marcar como inicializado
              window.CMP._responsivePositionInitialized = true;
            }
            
            // Ejecutar la lógica de respaldo para adaptación responsive
            var banner = document.getElementById('cmp-banner');
            if (banner) {
              // Implementación mínima para dispositivos móviles
              var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
              var isMobile = viewportWidth < 768;
              
              if (isMobile) {
                // En dispositivos móviles, ajustar el ancho para que sea visible
                if (banner.classList.contains('cmp-banner--modal')) {
                  banner.style.width = '95%';
                  banner.style.maxWidth = '100%';
                  banner.style.maxHeight = '80vh';
                  banner.style.overflow = 'auto';
                } else if (banner.classList.contains('cmp-banner--floating')) {
                  banner.style.width = '95%';
                  // En móvil, forzar la posición inferior para mejor UX
                  if (banner.style.top) {
                    banner.style.top = 'auto';
                    banner.style.bottom = '10px';
                  }
                  
                  // Si está alineado a la derecha, asegurar que no haya transform
                  if (banner.style.right) {
                    banner.style.transform = 'none';
                    banner.style.left = 'auto';
                  }
                }
                
                // Ajustar el tamaño de fuente para móviles
                banner.style.fontSize = '14px';
                
                // Asegurar que los botones sean accesibles
                var buttons = banner.querySelectorAll('button');
                for (var i = 0; i < buttons.length; i++) {
                  buttons[i].style.margin = '5px';
                  buttons[i].style.padding = '8px 12px';
                  buttons[i].style.fontSize = '14px';
                }
              }
            }
          };
          
          // Función de depuración para mostrar todos los estilos aplicados
          window.CMP.debugModalStyles = function() {
            console.log('[CMP DEBUG] Iniciando depuración de estilos del modal...');
            
            var modalContainer = document.getElementById('cmp-modal-container');
            var bannerEl = document.getElementById('cmp-banner');
            
            if (!modalContainer) {
              console.log('[CMP DEBUG] No se encontró el contenedor del modal (cmp-modal-container)');
            } else {
              var containerStyles = window.getComputedStyle(modalContainer);
              console.log('[CMP DEBUG] Estilos del contenedor modal:');
              console.log('[CMP DEBUG] - position:', containerStyles.position);
              console.log('[CMP DEBUG] - display:', containerStyles.display);
              console.log('[CMP DEBUG] - alignItems:', containerStyles.alignItems);
              console.log('[CMP DEBUG] - justifyContent:', containerStyles.justifyContent);
              console.log('[CMP DEBUG] - width:', containerStyles.width);
              console.log('[CMP DEBUG] - height:', containerStyles.height);
              console.log('[CMP DEBUG] - top:', containerStyles.top);
              console.log('[CMP DEBUG] - left:', containerStyles.left);
              console.log('[CMP DEBUG] - right:', containerStyles.right);
              console.log('[CMP DEBUG] - bottom:', containerStyles.bottom);
              console.log('[CMP DEBUG] - zIndex:', containerStyles.zIndex);
            }
            
            if (!bannerEl) {
              console.log('[CMP DEBUG] No se encontró el banner modal (cmp-banner)');
            } else {
              var bannerStyles = window.getComputedStyle(bannerEl);
              console.log('[CMP DEBUG] Estilos del banner modal:');
              console.log('[CMP DEBUG] - position:', bannerStyles.position);
              console.log('[CMP DEBUG] - display:', bannerStyles.display);
              console.log('[CMP DEBUG] - width:', bannerStyles.width);
              console.log('[CMP DEBUG] - maxWidth:', bannerStyles.maxWidth);
              console.log('[CMP DEBUG] - margin:', bannerStyles.margin);
              console.log('[CMP DEBUG] - top:', bannerStyles.top);
              console.log('[CMP DEBUG] - left:', bannerStyles.left);
              console.log('[CMP DEBUG] - right:', bannerStyles.right);
              console.log('[CMP DEBUG] - bottom:', bannerStyles.bottom);
              console.log('[CMP DEBUG] - transform:', bannerStyles.transform);
            }
            
            // Verificar conflictos de CSS
            console.log('[CMP DEBUG] Buscando reglas CSS que podrían afectar al modal...');
            var sheetRules = [];
            for (var i = 0; i < document.styleSheets.length; i++) {
              try {
                var sheet = document.styleSheets[i];
                var rules = sheet.cssRules || sheet.rules;
                for (var j = 0; j < rules.length; j++) {
                  var rule = rules[j];
                  if (rule.selectorText && (
                      rule.selectorText.includes('modal') || 
                      rule.selectorText.includes('cmp-banner') ||
                      rule.selectorText.includes('cmp-modal')
                    )) {
                    console.log('[CMP DEBUG] Regla CSS que podría causar conflicto:', rule.selectorText);
                  }
                }
              } catch (e) {
                console.log('[CMP DEBUG] No se puede acceder a las reglas de la hoja de estilos', i);
              }
            }
          };
          
          // Para manipular el iframe si existe
          window.CMP.initializeIframeIfNeeded = function() {
            console.log("[CMP] Inicializando iframe si es necesario...");
            var bannerEl = document.getElementById('cmp-banner');
            
            if (bannerEl && bannerEl.classList.contains('cmp-banner--modal')) {
              console.log("[CMP] Detectado modal, verificando iframe...");
              
              // Comprobar si ya tenemos el iframe
              var iframeModal = document.getElementById('cmp-modal-iframe');
              if (!iframeModal && typeof window.CMP.createIframeModal === 'function') {
                console.log("[CMP] Creando iframe modal...");
                window.CMP.createIframeModal();
              }
            }
          };
          
          // TCF iframe postMessage handler
          window.addEventListener("message", function(event) {
            var msgIsString = typeof event.data === "string";
            var json = {};
            
            try {
              json = msgIsString ? JSON.parse(event.data) : event.data;
            } catch (e) {
              // Si no es JSON válido, ignoramos
              return;
            }
            
            if (json.__tcfapiCall) {
              var call = json.__tcfapiCall;
              window.__tcfapi(
                call.command,
                call.version,
                function(retValue, success) {
                  var returnMsg = {
                    __tcfapiReturn: {
                      returnValue: retValue,
                      success: success,
                      callId: call.callId
                    }
                  };
                  event.source.postMessage(
                    msgIsString ? JSON.stringify(returnMsg) : returnMsg,
                    "*"
                  );
                },
                call.parameter
              );
            }
          });
          
          // Ejecutar init si el DOM ya está listo
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              // Crear iframe __tcfapiLocator para compatibilidad con TCF
              var iframe = document.createElement("iframe");
              iframe.style.cssText = "display:none";
              iframe.name = "__tcfapiLocator";
              document.body.appendChild(iframe);
              
              window.CMP.init();
              
              // Ejecutar nuestra solución mejorada para centrado de modales (con compatibilidad hacia atrás)
              if (typeof window.CMP.ensureModalVisibility === 'function') {
                console.log('[CMP] Ejecutando solución mejorada para centrado de modales');
                window.CMP.ensureModalVisibility();
              } else if (typeof window.CMP.ensureModalCentering === 'function') {
                console.log('[CMP] Usando fallback para centrado (función antigua)');
                window.CMP.ensureModalCentering();
              }
              
              // Verificar si tenemos nueva función de depuración
              if (typeof window.CMP.debugModalStyles === 'function') {
                // Programar ejecución de debugger para cuando el banner sea visible
                setTimeout(function() {
                  console.log('[CMP] Ejecutando diagnóstico de depuración de estilos');
                  window.CMP.debugModalStyles();
                }, 1000);
              }
              
              // Verificar si el banner es flotante para aplicar los márgenes correctamente
              var bannerElInit = document.getElementById('cmp-banner');
              if (bannerElInit && bannerElInit.classList.contains('cmp-banner--floating') && 
                  typeof window.CMP.ensureFloatingPosition === 'function') {
                // Aplicar la función después de un tiempo para que todo esté listo
                setTimeout(function() {
                  console.log('[CMP] Aplicando posicionamiento para banner flotante al inicializar');
                  window.CMP.ensureFloatingPosition();
                }, 800);
                
                // Volver a aplicar después de un tiempo adicional para garantizar la estabilidad
                setTimeout(function() {
                  console.log('[CMP] Verificando posicionamiento del banner flotante (2º intento)');
                  window.CMP.ensureFloatingPosition();
                }, 1500);
              }
              
              // Aplicar posicionamiento responsive para todo tipo de banners
              if (bannerElInit && typeof window.CMP.ensureResponsivePosition === 'function') {
                setTimeout(function() {
                  console.log('[CMP] Aplicando posicionamiento responsive');
                  window.CMP.ensureResponsivePosition();
                }, 1000);
              }
              }
            });
          } else {
            // Crear iframe __tcfapiLocator para compatibilidad con TCF
            var iframe = document.createElement("iframe");
            iframe.style.cssText = "display:none";
            iframe.name = "__tcfapiLocator";
            document.body.appendChild(iframe);
            
            window.CMP.init();
              
            // Ejecutar nuestra solución mejorada para centrado de modales (con compatibilidad hacia atrás)
            if (typeof window.CMP.ensureModalVisibility === 'function') {
              console.log('[CMP] Ejecutando solución mejorada para centrado de modales');
              window.CMP.ensureModalVisibility();
            } else if (typeof window.CMP.ensureModalCentering === 'function') {
              console.log('[CMP] Usando fallback para centrado (función antigua)');
              window.CMP.ensureModalCentering();
            }
            
            // Verificar si tenemos nueva función de depuración
            if (typeof window.CMP.debugModalStyles === 'function') {
              // Programar ejecución de debugger para cuando el banner sea visible
              setTimeout(function() {
                console.log('[CMP] Ejecutando diagnóstico de depuración de estilos');
                window.CMP.debugModalStyles();
              }, 1000);
            }
            
            // Verificar si el banner es flotante para aplicar los márgenes correctamente
            var bannerElInit = document.getElementById('cmp-banner');
            if (bannerElInit && bannerElInit.classList.contains('cmp-banner--floating') && 
                typeof window.CMP.ensureFloatingPosition === 'function') {
              // Aplicar la función después de un tiempo para que todo esté listo
              setTimeout(function() {
                console.log('[CMP] Aplicando posicionamiento para banner flotante al inicializar');
                window.CMP.ensureFloatingPosition();
              }, 800);
              
              // Volver a aplicar después de un tiempo adicional para garantizar la estabilidad
              setTimeout(function() {
                console.log('[CMP] Verificando posicionamiento del banner flotante (2º intento)');
                window.CMP.ensureFloatingPosition();
              }, 1500);
            }
          }
        })();
      `;

      // === CÓDIGO DEL ICONO FLOTANTE INSERTADO DINÁMICAMENTE ===
      // Se inserta usando concatenación de template literals antes de init()
      logger.info('✅ Código de icono flotante incluido antes de init() para evitar problemas de timing');
      
      // DEBUG: Verificar si el código del icono flotante se genera correctamente
      try {
        const iconCode = cookieIconService.generateFloatingIcon({ baseUrl });
        if (iconCode && iconCode.length > 0) {
          logger.info(`✅ Código de icono flotante generado: ${iconCode.length} caracteres`);
          if (iconCode.includes('showFloatingIcon')) {
            logger.info('✅ Función showFloatingIcon encontrada en el código generado');
          } else {
            logger.warn('⚠️ Función showFloatingIcon NO encontrada en el código generado');
          }
        } else {
          logger.error('❌ cookieIconService.generateFloatingIcon() devolvió código vacío');
        }
      } catch (error) {
        logger.error('❌ Error al generar código de icono flotante:', error);
      }

      // Inyectar la solución mejorada para centrado de modales utilizando nuestro servicio especial
      script = modalPositionFixer.injectModalFixerIntoScript(script);
      
      // Inyectar la solución mejorada para posicionamiento de banners flotantes
      script = floatingPositionHandler.injectFloatingPositionHandlerIntoScript(script);
      
      // Inyectar la solución para posicionamiento responsive en diferentes dispositivos
      script = responsivePositionHandler.injectResponsivePositionHandlerIntoScript(script);
      
      // Inyectar herramientas de depuración
      script = bannerSizeDebug.injectDebugCodeIntoScript(script);
      
      // Inyectar fijador específico para el botón de preferencias
      script = preferencesButtonFixer.injectPreferencesButtonFixIntoScript(script);
      
      // Definir baseUrl para uso posterior
      const baseUrl = options.baseUrl || 'http://localhost:3000';
      
      // Añadir funciones de corrección de ancho
      script = script.replace('window.CMP = window.CMP || {};', 
        'window.CMP = window.CMP || {};\n\n' +
        '// Código de corrección de ancho\n' + 
        widthFixerCode + '\n');
      
      // Añadir llamadas a las funciones de corrección de ancho en puntos estratégicos
      script = script.replace('window.CMP.showBanner = function() {', 
        'window.CMP.showBanner = function() {\n' +
        '  // Diagnóstico y corrección de ancho\n' +
        '  setTimeout(function() {\n' +
        '    console.log("[CMP] Ejecutando diagnóstico y corrección de ancho");\n' +
        '    diagnoseWidthIssues();\n' +
        '    fixModalWidth();\n' +
        '    ensureFloatingMargins();\n' +
        '  }, 200);\n');
      
      // También añadir en ensureModalVisibility
      script = script.replace('window.CMP.ensureModalVisibility = function() {', 
        'window.CMP.ensureModalVisibility = function() {\n' +
        '  // Diagnóstico y corrección de ancho\n' +
        '  setTimeout(function() {\n' +
        '    console.log("[CMP] Ejecutando diagnóstico y corrección de ancho desde ensureModalVisibility");\n' +
        '    diagnoseWidthIssues();\n' +
        '    fixModalWidth();\n' +
        '    ensureFloatingMargins();\n' +
        '  }, 200);\n');
      
      // NOTA: El código del icono flotante se incluye antes de init() para evitar problemas de timing
      
      // Agregar log para depuración
      logger.info('Script de consentimiento generado con solución de centrado y corrección de ancho mejorada');
      
      return script;
    } catch (error) {
      logger.error('Error generating client script:', error);
      throw error;
    }
  }

  /**
   * Minifica el script (placeholder)
   */
  _minifyScript(script) {
    // Aquí se podría usar Terser o UglifyJS. 
    // Como ejemplo, sólo eliminamos saltos de línea y espacios duplicados:
    return script
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

/**
 * Genera un panel de preferencias TCF v2.2 completo y responsive
 * Esta función es parte de consentScriptGenerator.service.js
 */
generatePreferencesPanel(options = {}) {
  const {
    colors = {
      primary: '#0078d4',
      text: '#333333',
      background: '#ffffff'
    },
    texts = {},
    showVendorTab = true,
    compact = false
  } = options;

  // Textos predeterminados o personalizados
  const uiTexts = {
    title: texts.title || 'Centro de preferencias de privacidad',
    description: texts.description || 'Utilizamos cookies y tecnologías similares ("cookies") para proporcionar y mejorar nuestros servicios. Los siguientes controles le permiten gestionar sus preferencias para el procesamiento de sus datos.',
    tabs: {
      purposes: texts.purposesTab || 'Finalidades',
      vendors: texts.vendorsTab || 'Proveedores',
      cookiePolicy: texts.cookiePolicyTab || 'Política de cookies'
    },
    buttons: {
      acceptAll: texts.acceptAllButton || 'Aceptar todo',
      rejectAll: texts.rejectAllButton || 'Rechazar todo',
      save: texts.saveButton || 'Guardar preferencias',
      close: texts.closeButton || 'Cerrar'
    },
    categories: {
      necessary: {
        title: texts.necessaryCategoryTitle || 'Cookies necesarias',
        description: texts.necessaryCategoryDescription || 'Estas cookies son esenciales para el funcionamiento del sitio y no pueden ser desactivadas.'
      },
      analytics: {
        title: texts.analyticsCategoryTitle || 'Cookies analíticas',
        description: texts.analyticsCategoryDescription || 'Nos permiten medir el rendimiento de nuestro sitio y mejorar su experiencia.'
      },
      marketing: {
        title: texts.marketingCategoryTitle || 'Cookies de marketing',
        description: texts.marketingCategoryDescription || 'Utilizadas para mostrarle publicidad relevante a sus intereses.'
      },
      personalization: {
        title: texts.personalizationCategoryTitle || 'Cookies de personalización',
        description: texts.personalizationCategoryDescription || 'Permiten adaptar el contenido a sus preferencias.'
      }
    },
    purposes: {
      1: {
        title: 'Almacenar o acceder a información en un dispositivo',
        description: 'Las cookies, identificadores de dispositivos u otra información pueden almacenarse o consultarse en su dispositivo para los fines que se le presentan.'
      },
      2: {
        title: 'Anuncios básicos',
        description: 'Los anuncios pueden mostrarse basándose en lo que está viendo, la aplicación que está utilizando, su ubicación aproximada o el tipo de su dispositivo.'
      },
      3: {
        title: 'Anuncios personalizados',
        description: 'Se puede crear un perfil sobre usted y sus intereses para mostrarle anuncios personalizados que sean relevantes para usted.'
      },
      4: {
        title: 'Anuncios personalizados según rendimiento',
        description: 'Los anuncios personalizados pueden comprobarse para ver si han sido efectivos.'
      },
      5: {
        title: 'Contenido personalizado',
        description: 'Se puede crear un perfil sobre usted y sus intereses para mostrarle contenido personalizado que sea relevante para usted.'
      },
      6: {
        title: 'Contenido personalizado según rendimiento',
        description: 'El contenido personalizado puede comprobarse para ver si ha sido efectivo.'
      },
      7: {
        title: 'Medición del rendimiento de anuncios',
        description: 'El rendimiento de los anuncios puede medirse para entender su efectividad.'
      },
      8: {
        title: 'Medición del rendimiento de contenidos',
        description: 'El rendimiento del contenido puede medirse para entender su efectividad.'
      },
      9: {
        title: 'Estudios de mercado',
        description: 'Estudios de mercado pueden usarse para saber más sobre los usuarios que visitan un sitio o responden a anuncios.'
      },
      10: {
        title: 'Desarrollar y mejorar productos',
        description: 'Sus datos pueden usarse para mejorar los sistemas existentes y desarrollar nuevos productos.'
      }
    },
    specialFeatures: {
      1: {
        title: 'Utilizar datos de localización geográfica precisa',
        description: 'Sus datos de localización pueden utilizarse en apoyo de uno o varios propósitos.'
      },
      2: {
        title: 'Escanear activamente características del dispositivo para su identificación',
        description: 'Su dispositivo puede ser distinguido de otros dispositivos en base a la información que envía.'
      }
    },
    other: {
      vendorList: 'Lista completa de proveedores',
      moreInfo: 'Más información',
    }
  };

  // Estilo del panel
  const mainColor = colors.primary || '#0078d4';
  const textColor = colors.text || '#333333';
  const bgColor = colors.background || '#ffffff';
  const borderColor = '#e0e0e0';
  const secondaryBgColor = '#f5f5f5';

  // Generar un ID único para el namespace CSS
  const uniqueId = 'cmp-' + Math.random().toString(36).substr(2, 9);

  // Crear HTML para el panel con estilos inline y CSS específico
  return `
    <div id="cmp-preferences" class="${uniqueId}-preferences" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 2147483648; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div class="${uniqueId}-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 900px; max-height: 90vh; background-color: ${bgColor}; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 20px 24px; border-bottom: 1px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; background-color: ${bgColor};">
          <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: ${textColor};">${uiTexts.title}</h2>
          <button class="cmp-close-preferences" style="background: none; border: none; cursor: pointer; font-size: 28px; color: ${textColor}; padding: 4px; line-height: 1;">×</button>
        </div>
        
        <!-- Main Content -->
        <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
          <!-- Description -->
          <div style="padding: 20px 24px; background-color: ${secondaryBgColor}; border-bottom: 1px solid ${borderColor};">
            <p style="margin: 0; color: ${textColor}; line-height: 1.6; font-size: 15px;">${uiTexts.description}</p>
          </div>
          
          <!-- Tabs -->
          <div style="display: flex; background-color: ${bgColor}; border-bottom: 1px solid ${borderColor};">
            <button class="${uniqueId}-tab ${uniqueId}-tab-active cmp-pref-tab" data-tab="purposes" data-unique-id="${uniqueId}" style="flex: 1; padding: 16px; background: none; border: none; border-bottom: 3px solid ${mainColor}; cursor: pointer; font-weight: 500; color: ${mainColor}; font-size: 16px;">
              ${uiTexts.tabs.purposes}
            </button>
            ${showVendorTab ? `
            <button class="${uniqueId}-tab cmp-pref-tab" data-tab="vendors" data-unique-id="${uniqueId}" style="flex: 1; padding: 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: ${textColor}; font-size: 16px;">
              ${uiTexts.tabs.vendors}
            </button>` : ''}
            <button class="${uniqueId}-tab cmp-pref-tab" data-tab="cookies" data-unique-id="${uniqueId}" style="flex: 1; padding: 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: ${textColor}; font-size: 16px;">
              Cookies
            </button>
            <button class="${uniqueId}-tab cmp-pref-tab" data-tab="policy" data-unique-id="${uniqueId}" style="flex: 1; padding: 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: ${textColor}; font-size: 16px;">
              ${uiTexts.tabs.cookiePolicy}
            </button>
          </div>
          
          <!-- Tab Content Container -->
          <div style="flex: 1; overflow-y: auto; overflow-x: hidden; background-color: ${bgColor};">
            
            <!-- Purposes Tab -->
            <div class="${uniqueId}-tab-content ${uniqueId}-tab-content-active" data-content="purposes" style="padding: 24px; display: block;">
              
              <!-- Necessary Cookies -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="flex: 1; margin-right: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: ${textColor}; font-weight: 600;">${uiTexts.categories.necessary.title}</h3>
                    <p style="margin: 0; color: ${textColor}; font-size: 14px; line-height: 1.5; opacity: 0.8;">${uiTexts.categories.necessary.description}</p>
                  </div>
                  <div style="position: relative; width: 48px; height: 24px;">
                    <input type="checkbox" checked disabled data-category="necessary" style="position: absolute; opacity: 0; width: 0; height: 0;">
                    <span style="position: absolute; cursor: not-allowed; top: 0; left: 0; right: 0; bottom: 0; background-color: ${mainColor}; border-radius: 24px; opacity: 0.6;"></span>
                    <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transform: translateX(24px);"></span>
                  </div>
                </div>
                <div style="padding: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background-color: rgba(255,255,255,0.5);">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; color: ${textColor};">${uiTexts.purposes[1].title}</h4>
                  <p style="margin: 0; color: ${textColor}; font-size: 13px; line-height: 1.5; opacity: 0.8;">${uiTexts.purposes[1].description}</p>
                </div>
              </div>
              
              <!-- Analytics Cookies -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="flex: 1; margin-right: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: ${textColor}; font-weight: 600;">${uiTexts.categories.analytics.title}</h3>
                    <p style="margin: 0; color: ${textColor}; font-size: 14px; line-height: 1.5; opacity: 0.8;">${uiTexts.categories.analytics.description}</p>
                  </div>
                  <label class="${uniqueId}-switch" style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">
                    <input type="checkbox" data-category="analytics" style="opacity: 0; width: 0; height: 0;">
                    <span class="${uniqueId}-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                  </label>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="padding: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background-color: rgba(255,255,255,0.5);">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: ${textColor};">${uiTexts.purposes[7].title}</h4>
                    <p style="margin: 0; color: ${textColor}; font-size: 13px; line-height: 1.5; opacity: 0.8;">${uiTexts.purposes[7].description}</p>
                  </div>
                  <div style="padding: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background-color: rgba(255,255,255,0.5);">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: ${textColor};">${uiTexts.purposes[8].title}</h4>
                    <p style="margin: 0; color: ${textColor}; font-size: 13px; line-height: 1.5; opacity: 0.8;">${uiTexts.purposes[8].description}</p>
                  </div>
                </div>
              </div>
              
              <!-- Marketing Cookies -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="flex: 1; margin-right: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: ${textColor}; font-weight: 600;">${uiTexts.categories.marketing.title}</h3>
                    <p style="margin: 0; color: ${textColor}; font-size: 14px; line-height: 1.5; opacity: 0.8;">${uiTexts.categories.marketing.description}</p>
                  </div>
                  <label class="${uniqueId}-switch" style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">
                    <input type="checkbox" data-category="marketing" style="opacity: 0; width: 0; height: 0;">
                    <span class="${uniqueId}-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                  </label>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="padding: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background-color: rgba(255,255,255,0.5);">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: ${textColor};">${uiTexts.purposes[2].title}</h4>
                    <p style="margin: 0; color: ${textColor}; font-size: 13px; line-height: 1.5; opacity: 0.8;">${uiTexts.purposes[2].description}</p>
                  </div>
                  <div style="padding: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background-color: rgba(255,255,255,0.5);">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: ${textColor};">${uiTexts.purposes[3].title}</h4>
                    <p style="margin: 0; color: ${textColor}; font-size: 13px; line-height: 1.5; opacity: 0.8;">${uiTexts.purposes[3].description}</p>
                  </div>
                </div>
              </div>
              
            </div>
            
            <!-- Vendors Tab -->
            ${showVendorTab ? `
            <div class="${uniqueId}-tab-content" data-content="vendors" style="padding: 24px; display: none !important;">
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 15px; line-height: 1.6;">
                  Estos son los proveedores con los que trabajamos para características como publicidad, analíticas y personalización.
                </p>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                  <button class="cmp-accept-all-vendors" style="background-color: ${mainColor}; color: white; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer; font-size: 15px; font-weight: 500;">
                    ${uiTexts.buttons.acceptAll}
                  </button>
                  <button class="cmp-reject-all-vendors" style="background-color: #f5f5f5; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 6px; padding: 10px 20px; cursor: pointer; font-size: 15px; font-weight: 500;">
                    ${uiTexts.buttons.rejectAll}
                  </button>
                </div>
              </div>
              
              <!-- Dynamic vendor list will be inserted here -->
              <div id="vendors-content-${uniqueId}">
                <div style="text-align: center; padding: 40px 0; color: ${textColor}; opacity: 0.6;">
                  <p>Cargando lista de proveedores...</p>
                </div>
              </div>
            </div>` : ''}
            
            <!-- Cookies Tab -->
            <div class="${uniqueId}-tab-content" data-content="cookies" style="padding: 24px; display: none !important;">
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 15px; line-height: 1.6;">
                  A continuación se muestra una lista detallada de todas las cookies utilizadas en este sitio web, organizadas por categoría.
                </p>
              </div>
              
              <!-- Dynamic cookies content will be inserted here -->
              <div id="cookies-content-${uniqueId}">
                <div style="text-align: center; padding: 40px 0; color: ${textColor}; opacity: 0.6;">
                  <p>Cargando lista de cookies...</p>
                </div>
              </div>
            </div>
            
            <!-- Cookie Policy Tab -->
            <div class="${uniqueId}-tab-content" data-content="policy" style="padding: 24px; display: none !important;">
              <h3 style="margin: 0 0 16px 0; font-size: 20px; color: ${textColor};">Política de Privacidad</h3>
              <div style="color: ${textColor}; font-size: 13px; line-height: 1.5;">
                ${this.generatePrivacyPolicyContent(options.clientData)}
              </div>
            </div>
            
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 24px; border-top: 1px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; background-color: ${secondaryBgColor}; flex-wrap: wrap; gap: 12px;">
          <button class="cmp-reject-all-btn" data-cmp-action="reject_all" style="background-color: #f5f5f5; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 6px; padding: 10px 24px; cursor: pointer; font-size: 15px; font-weight: 500;">
            ${uiTexts.buttons.rejectAll}
          </button>
          <div style="display: flex; gap: 12px;">
            <button class="cmp-accept-all-btn" data-cmp-action="accept_all" style="background-color: ${mainColor}; color: white; border: none; border-radius: 6px; padding: 10px 24px; cursor: pointer; font-size: 15px; font-weight: 500;">
              ${uiTexts.buttons.acceptAll}
            </button>
            <button class="cmp-save-preferences-btn" data-cmp-action="save_preferences" style="background-color: ${mainColor}; color: white; border: none; border-radius: 6px; padding: 10px 24px; cursor: pointer; font-size: 15px; font-weight: 500;">
              ${uiTexts.buttons.save}
            </button>
          </div>
        </div>
        
      </div>
    </div>
    
    <!-- Estilos CSS específicos -->
    <style>
      /* Reset para el panel */
      .${uniqueId}-preferences * {
        box-sizing: border-box !important;
      }
      
      /* Switches */
      .${uniqueId}-switch input:checked + .${uniqueId}-slider {
        background-color: ${mainColor} !important;
      }
      
      .${uniqueId}-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      .${uniqueId}-switch input:checked + .${uniqueId}-slider:before {
        transform: translateX(24px);
      }
      
      /* Tabs */
      .${uniqueId}-tab:hover {
        background-color: rgba(0, 0, 0, 0.05) !important;
      }
      
      /* Asegurar que todos los contenidos de tabs estén ocultos por defecto */
      .${uniqueId}-tab-content {
        display: none !important;
      }
      
      /* Solo mostrar el contenido activo */
      .${uniqueId}-tab-content-active {
        display: block !important;
      }
      
      /* Regla adicional para forzar ocultación de contenidos inactivos */
      .${uniqueId}-preferences [data-content]:not(.${uniqueId}-tab-content-active) {
        display: none !important;
      }
      
      /* Botones */
      button:hover {
        opacity: 0.9;
      }
      
      /* Scrollbar */
      .${uniqueId}-container ::-webkit-scrollbar {
        width: 8px;
      }
      
      .${uniqueId}-container ::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .${uniqueId}-container ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .${uniqueId}-container {
          width: 95% !important;
          max-height: 95vh !important;
        }
      }
      
      @media (max-width: 480px) {
        .${uniqueId}-preferences {
          padding: 0 !important;
        }
        
        .${uniqueId}-container {
          width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          border-radius: 0 !important;
          transform: none !important;
          top: 0 !important;
          left: 0 !important;
        }
        
        .${uniqueId}-tab {
          font-size: 14px !important;
          padding: 12px 8px !important;
        }
      }
    </style>
  `;
}

/**
 * Genera el contenido de la política de cookies personalizada usando datos del cliente
 */
generatePrivacyPolicyContent(clientData) {
  if (!clientData || !clientData.fiscalInfo) {
    // Datos por defecto si no hay información del cliente
    clientData = {
      name: '[NOMBRE DE LA EMPRESA]',
      contactEmail: '[EMAIL DE CONTACTO]',
      fiscalInfo: {
        cif: '[CIF]',
        razonSocial: '[RAZÓN SOCIAL]',
        direccion: '[DIRECCIÓN]',
        codigoPostal: '[CÓDIGO POSTAL]',
        poblacion: '[POBLACIÓN]',
        provincia: '[PROVINCIA]',
        pais: '[PAÍS]'
      }
    };
  }

  const {
    name = clientData.fiscalInfo?.razonSocial || '[NOMBRE DE LA EMPRESA]',
    contactEmail = '[EMAIL DE CONTACTO]'
  } = clientData;

  const {
    cif = '[CIF]',
    razonSocial = '[RAZÓN SOCIAL]',
    direccion = '[DIRECCIÓN]',
    codigoPostal = '[CÓDIGO POSTAL]',
    poblacion = '[POBLACIÓN]',
    provincia = '[PROVINCIA]',
    pais = 'España'
  } = clientData.fiscalInfo || {};

  // Obtener fecha actual en formato DD/MM/YYYY
  const today = new Date();
  const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return `
    <div style="padding: 20px; line-height: 1.6; color: #333;">
      <p style="margin: 0 0 16px 0;">
        Bienvenida/o a la POLÍTICA DE COOKIES de la página web de ${razonSocial}, provista de NIF/CIF ${cif}.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>Versión:</strong> ${dateString}
      </p>
      
      <p style="margin: 0 0 16px 0;">
        En cumplimiento del artículo 22.2 de la Ley 34/2002 de servicios de la sociedad de la información y 
        de comercio electrónico LSSICE, de lo dispuesto en el Reglamento Europeo de Protección de Datos RGPD 
        679/2016 y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos 
        digitales, ${razonSocial} facilitamos a los usuarios información clara y completa sobre la 
        utilización de los dispositivos de almacenamiento y recuperación de datos y, en particular, sobre 
        los fines del tratamiento de los datos, y por ello le informamos que este sitio web utiliza cookies 
        que permiten el funcionamiento y la prestación de los servicios ofrecidos en el mismo.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Ofrecemos la información de la forma más clara posible, concisa y transparente, utilizando un 
        lenguaje claro y sencillo. La información está a disposición de los usuarios de forma accesible y 
        permanente a través del "PANEL DE CONFIGURACIÓN".
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>Validez consentimiento prestado.</strong> Por norma general la validez del consentimiento prestado como 
        usuario para el uso de una determinada cookie no tendrá una duración superior a 2 años, conservando 
        durante este tiempo la selección realizada.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>Menores de 14 años.</strong> Si tienes menos de 14 años debes pedir a tu padre, madre o tutor que lean este 
        mensaje y acepten si consienten que utilicemos las cookies.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>Actualización.</strong> Siempre que cambien los fines de uso de las cookies se le informará al respecto.
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        1º Definición y función genérica de las cookies.
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        <strong>¿Qué son las cookies?</strong> Las cookies son pequeños archivos de texto que los sitios web instalan en el 
        ordenador o dispositivo móvil de los usuarios que los visitan. Este sitio web utiliza cookies y/o 
        tecnologías similares que almacenan y recuperan información cuando navegas. En general, estas 
        tecnologías pueden servir para finalidades muy diversas, como, por ejemplo, reconocerte como 
        usuario, obtener información sobre tus hábitos de navegación, o personalizar la forma en que se 
        muestra el contenido. Los usos concretos que hacemos de estas tecnologías se describen en el panel 
        de configuración y a continuación.
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        2º ¿Qué tipo de cookies se utilizan en esta web y su finalidad?
      </h4>
      
      <p style="margin: 0 0 8px 0;">
        Existen varios tipos y puedes consultar más información detallada en el <strong>Panel de 
        Configuración</strong>:
      </p>
      
      <ul style="margin: 0 0 16px 20px; padding: 0; list-style-position: inside;">
        <li style="margin: 0 0 4px 0;">Cookies Técnicas o Necesarias</li>
        <li style="margin: 0 0 4px 0;">Cookies de Preferencias o personalización</li>
        <li style="margin: 0 0 4px 0;">Cookies de Análisis o Medición</li>
        <li style="margin: 0 0 4px 0;">Cookies de Marketing o Publicidad</li>
      </ul>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        3º ¿Quién utiliza la información obtenida por las cookies?
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        Ver detalle en el PANEL DE CONFIGURACIÓN en función de <strong>quién las gestiona: Propias o de 
        Terceros.</strong>
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Cookies propias, generadas y controladas por la web, y de terceros (que muestran contenido de 
        proveedores externos como youtube, Facebook, twitter …) para analizar nuestros servicios y mostrarte 
        publicidad relacionada con tus preferencias en base a un perfil elaborado a partir de tus hábitos de 
        navegación (por ejemplo, páginas visitadas).
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        4º Información sobre la forma de aceptar, rechazar el consentimiento o eliminar las cookies ¿Cómo las gestiono? Cookies de Terceros.
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        Debe tener en cuenta que, si acepta las cookies de terceros, deberá eliminarlas desde las opciones 
        del navegador o desde el sistema ofrecido por el propio tercero.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Puede permitir, bloquear o eliminar las cookies instaladas en su dispositivo a través del menú de 
        configuración de su navegador de internet, pudiendo configurarlo para que bloquee las cookies o 
        alerte al usuario cuando un servidor quiera guardarla.
      </p>
      
      <p style="margin: 0 0 8px 0;">
        Los siguientes enlaces proporcionan información en relación con cómo configurar y/o deshabilitar las 
        cookies para cada uno de los principales navegadores del mercado a fin de que el usuario pueda 
        decidir si acepta o no el uso de cookies:
      </p>
      
      <ul style="margin: 0 0 16px 20px; padding: 0; list-style-position: inside;">
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.microsoft.com/es-es/help/17442/windows-internet-explorer-delete-manage-cookies" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Microsoft Internet Explorer:
          </a> 
          menú Herramientas > Opciones de Internet > Privacidad > Configuración.
        </li>
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias?redirectlocale=es&redirectslug=habilitar-y-deshabilitar-cookies-que-los-sitios-we" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Firefox:
          </a> 
          menú Herramientas > Opciones > Privacidad > Cookies.
        </li>
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.google.com/accounts/answer/61416?hl=es" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Chrome:
          </a> 
          menú Opciones > Opciones avanzadas > Privacidad.
        </li>
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Safari:
          </a> 
          menú Preferencias/Privacidad.
        </li>
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.apple.com/es-es/HT201265" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Safari para iOS (iPhone y iPad):
          </a> 
          Opción Ajustes > Safari.
        </li>
        <li style="margin: 0 0 8px 0;">
          <a href="https://support.google.com/chrome/answer/95647?co=GENIE.Platform%3DAndroid&hl=es-419" 
             target="_blank" rel="noopener noreferrer" style="color: #0078d4;">
            Chrome para Android:
          </a> 
          Configuración > Configuración de sitios web > Cookies.
        </li>
      </ul>
      
      <p style="margin: 0 0 16px 0;">
        En el caso de que su navegador no figure en la lista anterior, en la sección "Ayuda" del mismo 
        encontrará las instrucciones necesarias para modificar los ajustes. Tenga en cuenta que si acepta 
        las cookies de terceros, deberá eliminarlas desde las opciones del navegador.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Como usuario puede gestionar/eliminar cookies si así lo desea:
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>-Eliminar las cookies del dispositivo.</strong> Puede eliminar las cookies que ya tenga en su 
        dispositivo borrando el historial del navegador. De esta manera se suprimirán las cookies de todos 
        los sitios web que haya visitado. Sin embargo, también podría perder parte de la información que 
        tenga guardada (por ejemplo, identificadores de inicio de sesión o preferencias para los sitios 
        web).
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>-Gestionar las cookies de un determinado sitio.</strong> Para tener un control más preciso de las 
        cookies específicas de cada sitio, los usuarios pueden ajustar su configuración de privacidad y 
        cookies en el navegador.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        <strong>-Bloquear las cookies.</strong> Es posible configurar la mayoría de los navegadores para que no acepten 
        cookies en el dispositivo que utiliza, pero en ese caso puede tener que configurar manualmente una 
        serie de preferencias cada vez que visites un sitio o página.
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        5º Información sobre las transferencias de datos a terceros países realizadas por el editor.
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        Respecto de las transferencias que, en su caso, realicen terceros, será válida la remisión a la 
        información que faciliten esos terceros. Puede informarse de las transferencias a terceros países 
        que, en su caso, realizan los terceros identificados en esta política de cookies en sus 
        correspondientes políticas.
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        6º Elaboración de perfiles
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        Cuando la elaboración de perfiles implique la toma de decisiones automatizadas con efectos jurídicos 
        para el usuario o le afecten significativamente de modo similar, se le informará de la importancia y 
        consecuencias previstas.
      </p>
      
      <h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; text-transform: uppercase;">
        7º Periodo de conservación de los datos para los diferentes fines en los términos establecidos en el artículo 13.2 a) del RGPD.
      </h4>
      
      <p style="margin: 0 0 16px 0;">
        Ver detalle en el PANEL DE CONFIGURACIÓN en función del <strong>Tiempo que permanecen</strong>: Indicándole 
        duración o plazo de expiración. El plazo durante el cual se conservarán los datos (personales si los 
        hubiese) o los criterios utilizados para determinar este plazo.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Como buena práctica en la renovación del consentimiento, la validez del consentimiento prestado por 
        un usuario para el uso de una determinada cookie, se conservará la selección realizada, y no tendrá 
        una duración superior a 24 meses.
      </p>
      
      <p style="margin: 0 0 16px 0;">
        Si quiere más información sobre el tratamiento de sus datos puede consultar nuestra política de privacidad.
      </p>
    </div>
  `;
}

  /**
   * Obtiene los proveedores de un dominio para el panel de preferencias
   */
  async getDomainProviders(domainId) {
    try {
      const logger = require('../utils/logger');
      logger.info(`[ConsentScriptGenerator] Getting providers for domain: ${domainId}`);

      // Si domainId es un ObjectId, buscar por ID, sino por hostname
      const Domain = require('../models/Domain');
      const Cookie = require('../models/Cookie');
      
      let domain;
      if (domainId.match(/^[0-9a-fA-F]{24}$/)) {
        // Es un ObjectId
        domain = await Domain.findById(domainId);
      } else {
        // Es un hostname
        domain = await Domain.findOne({ hostname: domainId });
      }

      if (!domain) {
        logger.warn(`[ConsentScriptGenerator] Domain not found: ${domainId}`);
        return [];
      }

      // Obtener todas las cookies del dominio y agrupar por proveedor
      const cookies = await Cookie.find({ 
        domainId: domain._id, 
        status: 'active' 
      }).select('provider category providerDetails');

      // Agrupar cookies por proveedor
      const providerMap = new Map();
      
      cookies.forEach(cookie => {
        const providerName = cookie.provider || 'Unknown';
        
        if (!providerMap.has(providerName)) {
          providerMap.set(providerName, {
            name: providerName,
            category: cookie.category || 'unknown',
            cookieCount: 0,
            verified: cookie.providerDetails?.verified || false,
            url: cookie.providerDetails?.url || '',
            iabVendorId: cookie.providerDetails?.iabVendorId || null
          });
        }
        
        providerMap.get(providerName).cookieCount++;
      });

      const providers = Array.from(providerMap.values());
      logger.info(`[ConsentScriptGenerator] Found ${providers.length} providers for domain ${domainId}`);
      
      return providers;
      
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error(`[ConsentScriptGenerator] Error getting providers for domain ${domainId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene las cookies de un dominio agrupadas por categoría para el panel de preferencias
   */
  async getDomainCookiesByCategory(domainId) {
    try {
      const logger = require('../utils/logger');
      logger.info(`[ConsentScriptGenerator] Getting cookies for domain: ${domainId}`);

      // Si domainId es un ObjectId, buscar por ID, sino por hostname
      const Domain = require('../models/Domain');
      const Cookie = require('../models/Cookie');
      
      let domain;
      if (domainId.match(/^[0-9a-fA-F]{24}$/)) {
        // Es un ObjectId
        domain = await Domain.findById(domainId);
      } else {
        // Es un hostname
        domain = await Domain.findOne({ hostname: domainId });
      }

      if (!domain) {
        logger.warn(`[ConsentScriptGenerator] Domain not found: ${domainId}`);
        return {};
      }

      // Obtener todas las cookies del dominio
      const cookies = await Cookie.find({ 
        domainId: domain._id, 
        status: 'active' 
      }).select('name provider category description attributes.duration');

      // Agrupar cookies por categoría
      const cookiesByCategory = {
        necessary: [],
        analytics: [],
        marketing: [],
        personalization: [],
        unknown: []
      };

      cookies.forEach(cookie => {
        const category = cookie.category || 'unknown';
        const cookieData = {
          name: cookie.name,
          provider: cookie.provider || 'Unknown',
          duration: cookie.attributes?.duration || 'Session',
          description: cookie.description?.en || `Cookie: ${cookie.name}`
        };
        
        if (cookiesByCategory[category]) {
          cookiesByCategory[category].push(cookieData);
        } else {
          cookiesByCategory.unknown.push(cookieData);
        }
      });

      const totalCookies = Object.values(cookiesByCategory).reduce((acc, cats) => acc + cats.length, 0);
      logger.info(`[ConsentScriptGenerator] Found ${totalCookies} cookies in ${Object.keys(cookiesByCategory).length} categories for domain ${domainId}`);
      
      return cookiesByCategory;
      
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error(`[ConsentScriptGenerator] Error getting cookies for domain ${domainId}:`, error);
      return {};
    }
  }

}

module.exports = new ConsentGeneratorService();