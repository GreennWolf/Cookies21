// services/consentGenerator.service.js
const { generateHTML, generateCSS } = require('./bannerGenerator.service');
const logger = require('../utils/logger');

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
            </div>
            
            <div id="consent-status"></div>
            
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
              alert('Cookies de consentimiento eliminadas. Recargando página...');
              setTimeout(() => location.reload(), 500);
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
        autoAcceptNonGDPR = false // Nueva opción para controlar la aceptación automática
      } = options;

      // Script base que se incluirá en el sitio del cliente
      const script = `
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
            gdprApplies: null, // Se determinará en tiempo de ejecución
            isServiceSpecific: true,
            autoAcceptNonGDPR: ${autoAcceptNonGDPR} // Controla si se auto-acepta cuando GDPR no aplica
          };
          
          // Namespace global para el CMP
          window.CMP = window.CMP || {};
          window.CMP.config = CMP_CONFIG;
          
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
                window.CMP.addTCFListener(callback);
                break;
              case 'removeEventListener':
                window.CMP.removeTCFListener(parameter);
                break;
              case 'ping':
                callback({
                  gdprApplies: window.CMP.config.gdprApplies,
                  cmpLoaded: true,
                  cmpStatus: 'loaded',
                  displayStatus: window.CMP.isVisible() ? 'visible' : 'hidden',
                  apiVersion: '2.2',
                  cmpVersion: window.CMP.config.cmpVersion,
                  cmpId: window.CMP.config.cmpId,
                  gvlVersion: window.CMP.vendorList ? window.CMP.vendorList.vendorListVersion : 348,
                  tcfPolicyVersion: 2
                }, true);
                break;
              default:
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
            var listenerId = window.CMP.tcfListenerId++;
            window.CMP.tcfListeners.push({
              id: listenerId,
              callback: callback
            });
            
            // Ejecutar callback con datos de consentimiento actuales
            window.CMP.getTCData(callback);
            
            return listenerId;
          };
          
          window.CMP.removeTCFListener = function(listenerId) {
            window.CMP.tcfListeners = window.CMP.tcfListeners.filter(function(listener) {
              return listener.id !== listenerId;
            });
          };
          
          window.CMP.notifyTCFListeners = function(tcData, success) {
            window.CMP.tcfListeners.forEach(function(listener) {
              listener.callback(tcData, success);
            });
          };
          
          window.CMP.getTCData = function(callback, vendorIds) {
            var consentData = window.CMP.getConsentState();
            var tcData = {
              tcString: consentData.tcString || '',
              tcfPolicyVersion: 2,
              cmpId: parseInt(window.CMP.config.cmpId),
              cmpVersion: window.CMP.config.cmpVersion,
              gdprApplies: window.CMP.config.gdprApplies,
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
                      console.warn("⚠️ [CMP] Error procesando respuesta de vendor-list:", e);
                      // Si falla, intentamos directamente con IAB
                      window.CMP._loadVendorListFromIAB().then(resolve).catch(reject);
                    }
                  } else {
                    console.warn("⚠️ [CMP] Error en la solicitud de vendor-list:", xhr.status);
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
                      console.warn("⚠️ [CMP] Error procesando respuesta del proxy:", e);
                      // Si falla, usar fallback mínimo
                      useFallbackVendorList();
                    }
                  } else {
                    console.warn("⚠️ [CMP] Error en la solicitud al proxy:", xhr.status);
                    // Si falla, usar fallback mínimo
                    useFallbackVendorList();
                  }
                }
              };
              xhr.send();
              
              // Función para usar lista mínima en caso de fallo
              function useFallbackVendorList() {
                console.warn('⚠️ [CMP] Usando lista de vendors de respaldo');
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
                      console.error("❌ [CMP] Error procesando respuesta de detección GDPR:", e);
                      // Si hay error, asumimos que sí aplica para mayor seguridad
                      window.CMP.config.gdprApplies = true;
                      resolve(true);
                    }
                  } else {
                    console.error("❌ [CMP] Error en solicitud de detección GDPR:", xhr.status);
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
                      console.error("❌ [CMP] Error procesando banner:", e);
                      reject(e);
                    }
                  } else {
                    console.error("❌ [CMP] Error solicitando banner:", xhr.status);
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
              var el = document.getElementById('cmp-banner');
              if (el) el.style.display = 'block';
            };
            window.CMP.hideBanner = function() {
              var el = document.getElementById('cmp-banner');
              if (el) el.style.display = 'none';
            };
            window.CMP.showPreferences = function() {
              var panel = document.getElementById('cmp-preferences');
              if (panel) panel.style.display = 'flex';
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
            
            // Marcar banner como visible
            var cmpBanner = document.getElementById('cmp-banner');
            if (cmpBanner) cmpBanner.style.display = 'block';
          };
          
          // Guardar/Leer consentimiento
          window.CMP.getConsentState = function() {
            var stored = window.CMP.cookies.get(window.CMP.config.cookieName);
            return stored || window.CMP.consent;
          };
          
          window.CMP.setConsentState = function(consent) {
            window.CMP.consent = consent;
            window.CMP.cookies.set(window.CMP.config.cookieName, consent, window.CMP.config.cookieExpiry, window.CMP.config.cookiePath);
            window.CMP.triggerEvent({ event: 'consent-updated', detail: { consent: consent } });
          };
          
          // Iniciar la carga
          window.CMP.init = function() {
            
            
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
                  console.error("❌ [CMP] Error loadBanner:", err);
                });
              }).catch(function(err) {
                console.error("❌ [CMP] Error loadVendorList:", err);
                // Fallback: Mostrar banner sin vendor list
                window.CMP.loadBanner().then(function(bannerData) {
                  window.CMP.injectBanner(bannerData);
                }).catch(function(error) {
                  console.error("❌ [CMP] Error en fallback loadBanner:", error);
                });
              });
            }).catch(function(err) {
              console.error("❌ [CMP] Error detectGDPR:", err);
              // Fallback: Asumir GDPR
              window.CMP.config.gdprApplies = true;
              window.CMP.loadBanner().then(function(bannerData) {
                window.CMP.injectBanner(bannerData);
              }).catch(function(error) {
                console.error("❌ [CMP] Error en fallback loadBanner:", error);
              });
            });
          };
          
          // Ejecutar init si el DOM ya está listo
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.CMP.init);
          } else {
            window.CMP.init();
          }
        })();
      `;

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
   * Genera el panel de preferencias de consentimiento
   * @param {Object} options - Opciones de configuración
   * @returns {String} - HTML del panel de preferencias
   */
  generatePreferencesPanel(options = {}) {
    try {
      const {
        colors = {
          primary: '#0078d7',
          secondary: '#f0f0f0',
          text: '#333333',
          background: '#ffffff'
        },
        texts = {},
        showVendorTab = true,
        compact = false
      } = options;

      // Textos por defecto
      const defaultTexts = {
        title: 'Preferencias de privacidad',
        description: 'Seleccione qué cookies desea aceptar',
        tabGeneral: 'General',
        tabVendors: 'Proveedores',
        tabPurposes: 'Propósitos',
        acceptAll: 'Aceptar todo',
        rejectAll: 'Rechazar todo',
        save: 'Guardar preferencias',
        close: 'Cerrar',
        necessary: 'Necesarias',
        analytics: 'Analíticas',
        marketing: 'Marketing',
        personalization: 'Personalización',
        necessaryDescription: 'Cookies esenciales para el funcionamiento del sitio web',
        analyticsDescription: 'Cookies para analizar el uso del sitio web',
        marketingDescription: 'Cookies para publicidad personalizada',
        personalizationDescription: 'Cookies para personalizar su experiencia'
      };

      // Combinar textos por defecto con personalizados
      const finalTexts = { ...defaultTexts, ...texts };

      // Estilos CSS inline
      const styles = `
        .cmp-preferences {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 100001;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
        }
        
        .cmp-preferences-panel {
          background-color: ${colors.background || '#fff'};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          width: ${compact ? '90%' : '80%'};
          max-width: ${compact ? '600px' : '800px'};
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .cmp-preferences-header {
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .cmp-preferences-title {
          margin: 0;
          color: ${colors.text || '#333'};
          font-size: 18px;
          font-weight: bold;
        }
        
        .cmp-close-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        }
        
        .cmp-tabs {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .cmp-tab {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          color: #666;
        }
        
        .cmp-tab.active {
          border-bottom-color: ${colors.primary || '#0078d7'};
          color: ${colors.primary || '#0078d7'};
          font-weight: bold;
        }
        
        .cmp-tab-content {
          display: none;
          padding: 16px;
          overflow-y: auto;
          max-height: 50vh;
        }
        
        .cmp-tab-content.active {
          display: block;
        }
        
        .cmp-category {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .cmp-category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .cmp-category-title {
          font-weight: bold;
          color: ${colors.text || '#333'};
        }
        
        .cmp-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 24px;
        }
        
        .cmp-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .cmp-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }
        
        .cmp-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .cmp-slider {
          background-color: ${colors.primary || '#0078d7'};
        }
        
        input:checked + .cmp-slider:before {
          transform: translateX(16px);
        }
        
        .cmp-category-description {
          color: #666;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .cmp-vendor-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f5f5f5;
          }
        
        .cmp-vendor-name {
          font-size: 14px;
        }
        
        .cmp-footer {
          padding: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          border-top: 1px solid #e0e0e0;
        }
        
        .cmp-button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
        
        .cmp-button-secondary {
          background-color: ${colors.secondary || '#f0f0f0'};
          color: ${colors.text || '#333'};
        }
        
        .cmp-button-primary {
          background-color: ${colors.primary || '#0078d7'};
          color: #fff;
        }
        
        .cmp-button-reject {
          background-color: #f44336;
          color: #fff;
        }
        
        .cmp-button-accept {
          background-color: #4caf50;
          color: #fff;
        }
      `;

      // Generar HTML
      const html = `
        <div id="cmp-preferences" class="cmp-preferences">
          <style>${styles}</style>
          <div class="cmp-preferences-panel">
            <div class="cmp-preferences-header">
              <h2 class="cmp-preferences-title">${finalTexts.title}</h2>
              <button class="cmp-close-button" data-cmp-action="close">&times;</button>
            </div>
            
            <div class="cmp-tabs">
              <div class="cmp-tab active" data-tab="general">${finalTexts.tabGeneral}</div>
              ${showVendorTab ? `<div class="cmp-tab" data-tab="vendors">${finalTexts.tabVendors}</div>` : ''}
              <div class="cmp-tab" data-tab="purposes">${finalTexts.tabPurposes}</div>
            </div>
            
            <div class="cmp-tab-content active" data-tab-content="general">
              <p>${finalTexts.description}</p>
              
              <!-- Categoría: Necessary -->
              <div class="cmp-category">
                <div class="cmp-category-header">
                  <div class="cmp-category-title">${finalTexts.necessary}</div>
                  <label class="cmp-switch">
                    <input type="checkbox" checked disabled data-category="necessary">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-category-description">${finalTexts.necessaryDescription}</div>
              </div>
              
              <!-- Categoría: Analytics -->
              <div class="cmp-category">
                <div class="cmp-category-header">
                  <div class="cmp-category-title">${finalTexts.analytics}</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-category="analytics">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-category-description">${finalTexts.analyticsDescription}</div>
              </div>
              
              <!-- Categoría: Marketing -->
              <div class="cmp-category">
                <div class="cmp-category-header">
                  <div class="cmp-category-title">${finalTexts.marketing}</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-category="marketing">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-category-description">${finalTexts.marketingDescription}</div>
              </div>
              
              <!-- Categoría: Personalization -->
              <div class="cmp-category">
                <div class="cmp-category-header">
                  <div class="cmp-category-title">${finalTexts.personalization}</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-category="personalization">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-category-description">${finalTexts.personalizationDescription}</div>
              </div>
            </div>
            
            ${showVendorTab ? `
            <div class="cmp-tab-content" data-tab-content="vendors">
              <p>Lista de proveedores que utilizan cookies en este sitio web:</p>
              
              <div id="cmp-vendor-list">
                <!-- Se poblará dinámicamente con la lista de vendors -->
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Google</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-vendor-id="755">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Facebook</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-vendor-id="891">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
              </div>
            </div>
            ` : ''}
            
            <div class="cmp-tab-content" data-tab-content="purposes">
              <p>Propósitos para los que se utilizan las cookies:</p>
              
              <div id="cmp-purpose-list">
                <!-- Se poblará dinámicamente con la lista de propósitos -->
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Almacenar información</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-purpose-id="1">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Personalización</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-purpose-id="2">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Anuncios</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-purpose-id="3">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
                <div class="cmp-vendor-item">
                  <div class="cmp-vendor-name">Medición</div>
                  <label class="cmp-switch">
                    <input type="checkbox" data-purpose-id="4">
                    <span class="cmp-slider"></span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="cmp-footer">
              <button class="cmp-button cmp-button-secondary" data-cmp-action="close">${finalTexts.close}</button>
              <button class="cmp-button cmp-button-reject" data-cmp-action="reject_all">${finalTexts.rejectAll}</button>
              <button class="cmp-button cmp-button-accept" data-cmp-action="accept_all">${finalTexts.acceptAll}</button>
              <button class="cmp-button cmp-button-primary" data-cmp-action="save_preferences">${finalTexts.save}</button>
            </div>
          </div>
        </div>
      `;

      return html.trim();
    } catch (error) {
      logger.error('Error generating preferences panel:', error);
      return `
        <div id="cmp-preferences" class="cmp-preferences">
          <div class="cmp-preferences-panel">
            <div class="cmp-preferences-header">
              <h2>Preferencias de privacidad</h2>
              <button class="cmp-close-button" data-cmp-action="close">&times;</button>
            </div>
            <div style="padding: 16px;">
              <p>Ha ocurrido un error al cargar el panel de preferencias.</p>
            </div>
            <div style="padding: 16px; text-align: right;">
              <button style="padding: 8px 16px; background: #0078d7; color: white; border: none; border-radius: 4px; cursor: pointer;" data-cmp-action="close">Cerrar</button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

module.exports = new ConsentGeneratorService();