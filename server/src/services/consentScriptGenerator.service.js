// services/consentGenerator.service.js
const { generateHTML, generateCSS } = require('./bannerGenerator.service');
const modalPositionFixer = require('./modalPositionFixer.service');
const floatingPositionHandler = require('./ensureFloatingPosition');
const responsivePositionHandler = require('./ensureResponsivePosition');
const bannerSizeDebug = require('./bannerSizeDebug');
const preferencesButtonFixer = require('./fixPreferencesButtonPosition');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

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
      const {
        clientId,
        domainId,
        templateId,
        apiEndpoint = '/api/v1/consent',
        cookieName = 'cmp_consent',
        cookieExpiry = 365, // días
        cookiePath = '/',
        vendorListUrl = 'https://vendorlist.consensu.org/v2/vendor-list.json',
        cmpId = 28, // ID de CMP registrado con IAB
        cmpVersion = 1,
        tcfCookieName = 'euconsent-v2', // Nombre de cookie estándar para TCF v2
        autoAcceptNonGDPR = false // Nueva opción para controlar la aceptación automática
      } = options;
      
      // Ya no usamos el iframe modal, removiendo esta línea y usando nuestra solución mejorada
      // const iframeModalJS = bannerStyleManager.generateIframeModalJS(templateId);

      // Script base que se incluirá en el sitio del cliente
      let script = `
        (function() {
          // Configuración
          var CMP_CONFIG = {
            clientId: "${clientId}",
            domainId: "${domainId}",
            templateId: "${templateId}",
            apiEndpoint: "${apiEndpoint}",
            cookieName: "${cookieName}",
            cookieExpiry: ${cookieExpiry},
            cookiePath: "${cookiePath}",
            vendorListUrl: "${vendorListUrl}",
            cmpId: "${cmpId}",
            cmpVersion: ${cmpVersion},
            tcfVersion: "2.2",
            tcfCookieName: "${tcfCookieName}", // Nombre de cookie estándar para TCF
            gdprApplies: null, // Se determinará en tiempo de ejecución
            isServiceSpecific: true,
            autoAcceptNonGDPR: ${autoAcceptNonGDPR} // Controla si se auto-acepta cuando GDPR no aplica
          };
          
          // Namespace global para el CMP
          window.CMP = window.CMP || {};
          window.CMP.config = CMP_CONFIG;
          
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
                  gvlVersion: window.CMP.vendorList ? window.CMP.vendorList.vendorListVersion : 348,
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
              xhr.open('GET', CMP_CONFIG.apiEndpoint + '/banner/' + CMP_CONFIG.templateId, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      var data = JSON.parse(xhr.responseText);
                      
                      resolve(data.data || data);
                    } catch (e) {
                      console.error("[CMP] Error procesando banner:", e);
                      reject(e);
                    }
                  } else {
                    console.error("[CMP] Error solicitando banner:", xhr.status);
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
              console.log('[CMP] Ocultando banner');
              
              // NUEVA IMPLEMENTACIÓN PARA OCULTAR MODALES
              // Comprobar si existe la estructura simplificada
              var modalContainer = document.getElementById('cmp-modal-container');
              var bannerEl = document.getElementById('cmp-banner');
              
              // Si tenemos contenedor modal, lo ocultamos
              if (modalContainer) {
                console.log('[CMP] Ocultando banner tipo modal (estructura simplificada)');
                modalContainer.style.display = 'none';
                
                // Opcionalmente, remover del DOM
                if (modalContainer.parentNode) {
                  modalContainer.parentNode.removeChild(modalContainer);
                }
              } else if (bannerEl) {
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
            };
            window.CMP.showPreferences = function() {
              var panel = document.getElementById('cmp-preferences');
              if (panel) {
                panel.style.display = 'flex';
                // Asegurar que el panel de preferencias tenga un z-index mayor que el banner modal
                panel.style.setProperty('z-index', '2147483648', 'important');
              }
            };
            window.CMP.acceptAll = function() {
              // Lógica de aceptar todo
              
              window.CMP.triggerEvent({ event: 'consent-updated', detail: { action: 'accept_all' } });
              window.CMP.hideBanner();
            };
            window.CMP.rejectAll = function() {
              // Lógica de rechazar todo
              
              window.CMP.triggerEvent({ event: 'consent-updated', detail: { action: 'reject_all' } });
              window.CMP.hideBanner();
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
          
          // Generar string TCF v2 
          window.CMP.generateTCString = function(consent) {
            try {
              // Crear un formato más cercano a un TC string real
              // En producción, esto debería usar la librería @iabtcf/core
              const timestamp = Math.floor(new Date().getTime() / 100);
              const tcfVersion = 2;
              const cmpId = parseInt(window.CMP.config.cmpId);
              const cmpVersion = window.CMP.config.cmpVersion;
              const consentScreen = 1; // Primera pantalla donde se obtuvo consentimiento
              const consentLanguage = 'ES'; // Idioma del consentimiento
              const vendorListVersion = window.CMP.vendorList ? window.CMP.vendorList.vendorListVersion : 348;
              const policyVersion = 4; // TCF v2.2 usa policy version 4
              
              // Crear un segmento de datos de consentimiento (simplificado)
              let purposesConsent = '';
              for (let i = 1; i <= 10; i++) {
                purposesConsent += (consent.purposes && consent.purposes[i]) ? '1' : '0';
              }
              
              // Simplificado: crear un TC string con formato que parezca válido
              // Formato básico: TC[base64-version]-[base64-vendor stuff]-[base64-purpose stuff]
              const tcFormat = 'C' + tcfVersion;
              const vendorData = btoa(cmpId + '.' + cmpVersion + '.' + consentScreen + '.' + consentLanguage + '.' + timestamp + '.' + vendorListVersion + '.' + policyVersion);
              const purposeData = btoa(purposesConsent);
              
              const tcString = 'TC' + tcFormat + vendorData.substring(0, 20) + '.' + purposeData.substring(0, 18);
              return tcString;
            } catch (e) {
              console.error('[CMP] Error generando TC string:', e);
              // Fallback a formato sencillo
              return 'TC2.2-CMP' + window.CMP.config.cmpId + '-CONSENT' + Math.floor(Math.random() * 1000000);
            }
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
                }).catch(function(err) {
                  console.error("[CMP] Error loadBanner:", err);
                });
              }).catch(function(err) {
                console.error("[CMP] Error loadVendorList:", err);
                // Fallback: Mostrar banner sin vendor list
                window.CMP.loadBanner().then(function(bannerData) {
                  window.CMP.injectBanner(bannerData);
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
 * Genera un panel de preferencias TCF v2.2 completo
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
      legBasis: 'Base legítima',
      legInterest: 'Interés legítimo',
      consent: 'Consentimiento',
      moreInfo: 'Más información',
      back: 'Volver',
      learnMore: 'Más información',
      purposeTitle: 'Finalidades',
      specialPurposeTitle: 'Finalidades especiales',
      featureTitle: 'Características',
      specialFeatureTitle: 'Características especiales'
    }
  };

  // Estilo del panel
  const mainColor = colors.primary || '#0078d4';
  const textColor = colors.text || '#333333';
  const bgColor = colors.background || '#ffffff';
  const borderColor = '#e0e0e0';
  const secondaryBgColor = '#f5f5f5';
  const maxHeight = compact ? '70vh' : '80vh';
  const tabsLayout = compact ? 'column' : 'row';

  // Crear HTML para el panel
  return `
    <div id="cmp-preferences" class="cmp-preferences" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 2147483648; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div class="cmp-preferences-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 800px; max-height: ${maxHeight}; background-color: ${bgColor}; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); display: flex; flex-direction: column; overflow: hidden;">
        <!-- Header -->
        <div class="cmp-preferences-header" style="padding: 16px 20px; border-bottom: 1px solid ${borderColor}; position: relative;">
          <h2 style="margin: 0; color: ${textColor}; font-size: 1.4rem; font-weight: 600;">${uiTexts.title}</h2>
          <button class="cmp-close-button" style="position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; font-size: 24px; line-height: 1; color: ${textColor}; padding: 0; width: 24px; height: 24px;" aria-label="Cerrar">×</button>
        </div>
        
        <!-- Main Content -->
        <div class="cmp-preferences-content" style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
          <!-- Description -->
          <div class="cmp-preferences-description" style="padding: 16px 20px; border-bottom: 1px solid ${borderColor};">
            <p style="margin: 0 0 8px 0; color: ${textColor}; line-height: 1.5;">${uiTexts.description}</p>
          </div>
          
          <!-- Tabs Navigation -->
          <div class="cmp-preferences-tabs" style="display: flex; flex-direction: ${tabsLayout}; border-bottom: 1px solid ${borderColor}; background-color: ${secondaryBgColor};">
            <button class="cmp-tab active" data-tab="purposes" style="flex: 1; padding: 12px 16px; background: none; border: none; border-bottom: 3px solid ${mainColor}; cursor: pointer; font-weight: 500; color: ${textColor}; text-align: center;">
              ${uiTexts.tabs.purposes}
            </button>
            ${showVendorTab ? `
            <button class="cmp-tab" data-tab="vendors" style="flex: 1; padding: 12px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: ${textColor}; text-align: center;">
              ${uiTexts.tabs.vendors}
            </button>` : ''}
            <button class="cmp-tab" data-tab="cookie-policy" style="flex: 1; padding: 12px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: ${textColor}; text-align: center;">
              ${uiTexts.tabs.cookiePolicy}
            </button>
          </div>
          
          <!-- Tab Content -->
          <div class="cmp-tab-content-container" style="flex-grow: 1; overflow-y: auto; padding: 0;">
            <!-- Purposes Tab (active by default) -->
            <div class="cmp-tab-content active" data-tab-content="purposes" style="padding: 20px;">
              <!-- Categories -->
              <div class="cmp-categories">
                <div class="cmp-category">
                  <div class="cmp-category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${textColor};">${uiTexts.categories.necessary.title}</h3>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" checked disabled data-category="necessary" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${mainColor}; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem;">${uiTexts.categories.necessary.description}</p>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[1].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[1].description}</p>
                  </div>
                </div>
                
                <div class="cmp-category" style="margin-top: 24px;">
                  <div class="cmp-category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${textColor};">${uiTexts.categories.analytics.title}</h3>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" data-category="analytics" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem;">${uiTexts.categories.analytics.description}</p>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[7].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[7].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[8].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[8].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[9].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[9].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[10].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[10].description}</p>
                  </div>
                </div>
                
                <div class="cmp-category" style="margin-top: 24px;">
                  <div class="cmp-category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${textColor};">${uiTexts.categories.marketing.title}</h3>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" data-category="marketing" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem;">${uiTexts.categories.marketing.description}</p>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[2].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[2].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[3].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[3].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[4].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[4].description}</p>
                  </div>
                </div>
                
                <div class="cmp-category" style="margin-top: 24px;">
                  <div class="cmp-category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${textColor};">${uiTexts.categories.personalization.title}</h3>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" data-category="personalization" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem;">${uiTexts.categories.personalization.description}</p>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[5].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[5].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.purposes[6].title}</h4>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.purposes[6].description}</p>
                  </div>
                </div>
                
                <!-- Special Features -->
                <div class="cmp-category" style="margin-top: 24px;">
                  <div class="cmp-category-header" style="margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${textColor};">${uiTexts.other.specialFeatureTitle}</h3>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.specialFeatures[1].title}</h4>
                      <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                        <input type="checkbox" data-special-feature="1" style="opacity: 0; width: 0; height: 0;">
                        <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                      </label>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.specialFeatures[1].description}</p>
                  </div>
                  
                  <div class="cmp-purpose" style="margin-bottom: 8px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">${uiTexts.specialFeatures[2].title}</h4>
                      <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                        <input type="checkbox" data-special-feature="2" style="opacity: 0; width: 0; height: 0;">
                        <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                      </label>
                    </div>
                    <p style="margin: 0; color: ${textColor}; font-size: 0.85rem;">${uiTexts.specialFeatures[2].description}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Vendors Tab -->
            ${showVendorTab ? `
            <div class="cmp-tab-content" data-tab-content="vendors" style="padding: 20px; display: none;">
              <div class="cmp-vendors-info" style="margin-bottom: 20px;">
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem;">
                  Estos son los proveedores con los que trabajamos para características como publicidad, analíticas y personalización.
                  Puede dar o retirar su consentimiento para cada proveedor individualmente, o para todos a la vez.
                </p>
                
                <div style="margin-bottom: 16px;">
                  <button class="cmp-button" data-cmp-action="accept_all" style="background-color: ${mainColor}; color: white; border: none; border-radius: 4px; padding: 8px 16px; margin-right: 8px; cursor: pointer;">
                    ${uiTexts.buttons.acceptAll}
                  </button>
                  <button class="cmp-button" data-cmp-action="reject_all" style="background-color: #f5f5f5; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 4px; padding: 8px 16px; cursor: pointer;">
                    ${uiTexts.buttons.rejectAll}
                  </button>
                </div>
                
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.85rem; font-style: italic;">
                  La lista completa de vendors se cargará dinámicamente desde IAB. Aquí se muestran algunos ejemplos de vendors comunes.
                </p>
              </div>
              
              <div class="cmp-vendor-list">
                <!-- Google -->
                <div class="cmp-vendor" style="margin-bottom: 16px; padding: 16px; border: 1px solid ${borderColor}; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">Google</h4>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" data-vendor="1" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 0.85rem;">
                    Proporciona servicios como publicidad, análisis y personalización de contenido.
                  </p>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style="color: ${mainColor}; font-size: 0.85rem;">${uiTexts.other.moreInfo}</a>
                </div>
                
                <!-- Meta Platforms -->
                <div class="cmp-vendor" style="margin-bottom: 16px; padding: 16px; border: 1px solid ${borderColor}; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 1rem; color: ${textColor};">Meta Platforms, Inc.</h4>
                    <label class="cmp-switch" style="position: relative; display: inline-block; width: 48px; height: 24px;">
                      <input type="checkbox" data-vendor="2" style="opacity: 0; width: 0; height: 0;">
                      <span class="cmp-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                    </label>
                  </div>
                  <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 0.85rem;">
                    Proporciona servicios de publicidad y analíticas.
                  </p>
                  <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" style="color: ${mainColor}; font-size: 0.85rem;">${uiTexts.other.moreInfo}</a>
                </div>
                
                <!-- Otros Vendors dinámicos se cargarían aquí -->
                <p style="margin: 16px 0; color: ${textColor}; font-size: 0.85rem; text-align: center;">
                  La lista completa contiene todos los proveedores de la Global Vendor List de IAB.
                </p>
              </div>
            </div>` : ''}
            
            <!-- Cookie Policy Tab -->
            <div class="cmp-tab-content" data-tab-content="cookie-policy" style="padding: 20px; display: none;">
              <div class="cmp-policy-content">
                <h3 style="margin: 0 0 16px 0; font-size: 1.2rem; color: ${textColor};">Política de Cookies</h3>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Esta página describe nuestra política de cookies y cómo utilizamos las tecnologías de seguimiento en nuestro sitio web.
                </p>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">¿Qué son las cookies?</h4>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Las cookies son pequeños archivos de texto que se almacenan en su navegador o dispositivo por sitios web, aplicaciones o servicios online.
                  Estas cookies ayudan a nuestro sitio web a recordar información sobre su visita, como su idioma preferido y otras configuraciones.
                </p>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">¿Por qué utilizamos cookies?</h4>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Utilizamos cookies para varios propósitos, incluyendo:
                </p>
                <ul style="margin: 0 0 16px 0; padding-left: 20px; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  <li style="margin-bottom: 8px;">Asegurar el funcionamiento correcto del sitio web</li>
                  <li style="margin-bottom: 8px;">Recordar sus preferencias y configuraciones</li>
                  <li style="margin-bottom: 8px;">Analizar cómo interactúa con nuestro sitio para mejorarlo</li>
                  <li style="margin-bottom: 8px;">Proporcionar contenido y publicidad personalizada</li>
                </ul>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">Tipos de cookies que utilizamos</h4>
                <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  <strong>Cookies Necesarias:</strong> Esenciales para el funcionamiento del sitio.
                </p>
                <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  <strong>Cookies Analíticas:</strong> Nos ayudan a entender cómo utiliza nuestro sitio.
                </p>
                <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  <strong>Cookies de Marketing:</strong> Utilizadas para mostrarle publicidad relevante.
                </p>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  <strong>Cookies de Personalización:</strong> Permiten adaptar el contenido a sus preferencias.
                </p>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">Sus derechos y opciones</h4>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Puede gestionar sus preferencias de cookies en cualquier momento utilizando nuestro panel de preferencias.
                  También puede configurar su navegador para rechazar cookies, aunque esto puede limitar la funcionalidad de nuestro sitio.
                </p>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">Actualizaciones de la política</h4>
                <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Esta política puede actualizarse periódicamente para reflejar cambios en nuestras prácticas o requisitos legales.
                  La fecha de la última actualización aparecerá al principio de la política.
                </p>
                
                <h4 style="margin: 16px 0 8px 0; font-size: 1rem; color: ${textColor};">Contacto</h4>
                <p style="margin: 0; color: ${textColor}; font-size: 0.9rem; line-height: 1.5;">
                  Si tiene preguntas sobre nuestra política de cookies, por favor contáctenos a través de nuestro formulario de contacto.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer with Buttons -->
        <div class="cmp-preferences-footer" style="padding: 16px 20px; border-top: 1px solid ${borderColor}; display: flex; justify-content: flex-end; align-items: center; background-color: ${secondaryBgColor};">
          <button class="cmp-button" data-cmp-action="reject_all" style="background-color: #f5f5f5; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 4px; padding: 8px 16px; margin-right: 8px; cursor: pointer;">
            ${uiTexts.buttons.rejectAll}
          </button>
          <button class="cmp-button" data-cmp-action="accept_all" style="background-color: ${mainColor}; color: white; border: none; border-radius: 4px; padding: 8px 16px; margin-right: 8px; cursor: pointer;">
            ${uiTexts.buttons.acceptAll}
          </button>
          <button class="cmp-button" data-cmp-action="save_preferences" style="background-color: ${mainColor}; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;">
            ${uiTexts.buttons.save}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Estilos adicionales para switches y transiciones -->
    <style>
      /* Asegurar que el panel de preferencias aparezca por encima del banner modal */
      .cmp-preferences {
        z-index: 2147483648 !important; /* Valor máximo posible + 1 */
      }
      
      .cmp-preferences *,
      .cmp-preferences *::before,
      .cmp-preferences *::after {
        box-sizing: border-box;
      }
      
      .cmp-switch input:checked + .cmp-switch-slider {
        background-color: ${mainColor};
      }
      
      .cmp-switch-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      .cmp-switch input:checked + .cmp-switch-slider:before {
        transform: translateX(24px);
      }
      
      .cmp-tab {
        position: relative;
        transition: all 0.3s;
      }
      
      .cmp-tab:not(.active) {
        border-bottom-color: transparent !important;
      }
      
      .cmp-tab:hover:not(.active) {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .cmp-tab-content {
        display: none;
      }
      
      .cmp-tab-content.active {
        display: block;
      }
      
      .cmp-button {
        transition: all 0.2s;
      }
      
      .cmp-button:hover {
        opacity: 0.9;
      }
      
      .cmp-close-button:hover {
        color: #666;
      }
      
      .cmp-preferences-container {
        animation: cmpSlideIn 0.3s ease-out;
        position: relative; /* Asegurar que el contenedor tenga el contexto correcto */
        z-index: 2147483649 !important; /* Aún mayor que el contenedor principal */
      }
      
      @keyframes cmpSlideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -48%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
      
      /* Responsive adjustments */
      @media (max-width: 640px) {
        .cmp-preferences-container {
          width: 100%;
          height: 100%;
          max-height: 100%;
          border-radius: 0;
          transform: none !important;
          top: 0;
          left: 0;
        }
        
        .cmp-preferences-tabs {
          flex-direction: column;
        }
        
        .cmp-preferences-footer {
          flex-direction: column;
          gap: 8px;
        }
        
        .cmp-preferences-footer button {
          width: 100%;
          margin-right: 0 !important;
        }
      }
    </style>
  `;
}
}

module.exports = new ConsentGeneratorService();