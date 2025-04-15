// services/bannerExport.service.js
const fs = require('fs').promises;
const path = require('path');
const bannerGenerator = require('./bannerGenerator.service');
const logger = require('../utils/logger');
const consentScriptGenerator = require('./consentScriptGenerator.service');

class BannerExportService {
  /**
   * Genera un script embebible completo para la plantilla
   */
  async generateEmbeddableScript(template, options = {}, providedHtml = null, providedCss = null, providedPreferencesPanel = null) {
    try {
      const bannerId = template._id ? `banner-${template._id}` : `banner-${Date.now()}`;
      
      // Opciones de configuración
      const {
        minify = true,
        includeGoogleConsentMode = true,
        forceGDPR = false,
        cookieExpiry = 365,
        baseUrl = process.env.BASE_URL || 'http://localhost:3000',
        domainId = ''  // Aseguramos que siempre haya al menos un string vacío
      } = options;
      
      // Procesar plantilla para exportación
      const processedTemplate = await this.processTemplateForExport(template);
      
      // Asegurar que la plantilla tiene el domainId
      processedTemplate.domainId = domainId;
      console.log(`🔍 DEBUG: DomainId asignado a template: ${processedTemplate.domainId}`);
      
      // Usar HTML y CSS proporcionados o generarlos
      let html, css, preferencesPanel;
      
      if (providedHtml) {
        html = providedHtml;
        console.log("✅ DEBUG: Usando HTML proporcionado directamente, longitud:", html.length);
      } else {
        console.log("🔍 DEBUG: Generando HTML desde plantilla...");
        html = await bannerGenerator.generateHTML(processedTemplate);
        console.log("✅ DEBUG: HTML generado, longitud:", html.length);
      }
      
      if (providedCss) {
        css = providedCss;
        console.log("✅ DEBUG: Usando CSS proporcionado directamente, longitud:", css.length);
      } else {
        console.log("🔍 DEBUG: Generando CSS desde plantilla...");
        css = await bannerGenerator.generateCSS(processedTemplate);
        console.log("✅ DEBUG: CSS generado, longitud:", css.length);
      }
      
      if (providedPreferencesPanel) {
        preferencesPanel = providedPreferencesPanel;
        console.log("✅ DEBUG: Usando panel de preferencias proporcionado directamente");
      } else {
        console.log("🔍 DEBUG: Generando panel de preferencias...");
        // Panel de preferencias - MODIFICADO para usar consentScriptGenerator
        preferencesPanel = consentScriptGenerator.generatePreferencesPanel({
          colors: template.theme?.colors,
          texts: template.settings?.texts || {},
          showVendorTab: true,
          compact: false
        });
        console.log("✅ DEBUG: Panel de preferencias generado, longitud:", preferencesPanel.length);
      }
      
      // Reemplazar todas las URLs relativas en el HTML final (si no se ha hecho ya)
      if (!providedHtml) {
        console.log("🔍 DEBUG: Corrigiendo URLs de imágenes...");
        html = this._fixImageUrls(html, baseUrl);
        console.log("✅ DEBUG: URLs de imágenes corregidas");
      }
      
      // Extraer los componentes y otras propiedades necesarias
      console.log("🔍 DEBUG: Extrayendo componentes...");
      const components = JSON.stringify(processedTemplate.components || []);
      const layoutType = processedTemplate.layout?.desktop?.type || 'banner';
      const layoutPosition = processedTemplate.layout?.desktop?.position || 'bottom';
      console.log(`🔍 DEBUG: Layout: tipo=${layoutType}, posición=${layoutPosition}`);
      
      // Generar CSS para diferentes tipos de banner (incorporado directamente)
      console.log("🔍 DEBUG: Generando CSS específico para el tipo de banner...");
      let typeSpecificCSSString = '';
      
      switch(layoutType) {
        case 'modal':
          console.log("🔍 DEBUG: Generando CSS para tipo modal");
          typeSpecificCSSString = `
          .cmp-banner {
            position: fixed !important;
            z-index: 100000 !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: 90% !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            border-radius: 6px !important;
          }
          .cmp-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 99999;
          }`;
          break;
        case 'floating':
          console.log("🔍 DEBUG: Generando CSS para tipo floating");
          // Determinar posición para floating
          let positionCSS = '';
          if (layoutPosition === 'bottom-right' || layoutPosition === 'bottom') {
            positionCSS = 'bottom: 20px; right: 20px;';
          } else if (layoutPosition === 'bottom-left') {
            positionCSS = 'bottom: 20px; left: 20px;';
          } else if (layoutPosition === 'top-right' || layoutPosition === 'top') {
            positionCSS = 'top: 20px; right: 20px;';
          } else if (layoutPosition === 'top-left') {
            positionCSS = 'top: 20px; left: 20px;';
          } else {
            positionCSS = 'bottom: 20px; right: 20px;'; // Valor por defecto
          }
          
          typeSpecificCSSString = `
          .cmp-banner {
            position: fixed !important;
            z-index: 100000 !important;
            ${positionCSS}
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            border-radius: 6px !important;
          }`;
          break;
        default: // banner normal
          console.log("🔍 DEBUG: Generando CSS para tipo banner normal");
          // Determinar posición para banner tipo normal
          let bannerPositionCSS = '';
          if (layoutPosition === 'top') {
            bannerPositionCSS = 'top: 0; left: 0; right: 0;';
          } else if (layoutPosition === 'bottom') {
            bannerPositionCSS = 'bottom: 0; left: 0; right: 0;';
          } else if (layoutPosition === 'center') {
            bannerPositionCSS = 'top: 50%; left: 0; right: 0; transform: translateY(-50%);';
          } else {
            bannerPositionCSS = 'bottom: 0; left: 0; right: 0;'; // Valor por defecto
          }
          
          typeSpecificCSSString = `
          .cmp-banner {
            position: fixed !important;
            z-index: 100000 !important;
            ${bannerPositionCSS}
            width: 100% !important;
            padding: 15px !important; /* Añadido para garantizar visibilidad */
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.15) !important;
          }`;
          break;
      }
      
      // Generar el código Google Consent Mode si está habilitado
      console.log("🔍 DEBUG: Generando código de Google Consent Mode...");
      const googleConsentModeCode = includeGoogleConsentMode ? this.generateGoogleConsentMode() : '';
      
      // IMPORTANTE: Limpiar el HTML y CSS para evitar problemas de escape
      console.log("🔍 DEBUG: Limpiando HTML y CSS para evitar problemas...");
      const safeHtml = html.replace(/`/g, '\\`').replace(/\${/g, '\\${');
      const safeCss = css.replace(/`/g, '\\`').replace(/\${/g, '\\${');
      const safePreferencesPanel = preferencesPanel.replace(/`/g, '\\`').replace(/\${/g, '\\${');
      
      console.log("🔍 DEBUG: Generando script completo...");
      console.log("🔍 DEBUG: CMP ID a utilizar:", process.env.IAB_CMP_ID || '1');
      
      // Generar el script completo con las mejoras
      let script = `
  // =============================================
  // CMP Script - Versión Mejorada
  // =============================================
  console.log("🚀 CMP Script iniciándose...");
  
  (function() {
    // =============================================
    // IMPLEMENTACIÓN DEL STUB TCF - PRIMERO EN EJECUCIÓN
    // =============================================
    (function() {
      console.log("🔍 CMP Debug: Inicializando TCF API stub");
      // Crear iframe locator inmediatamente
      try {
        if (!window.frames['__tcfapiLocator']) {
          console.log("🔍 CMP Debug: Creando iframe __tcfapiLocator");
          var locatorFrame = document.createElement('iframe');
          locatorFrame.name = '__tcfapiLocator';
          locatorFrame.style.display = 'none';
          locatorFrame.setAttribute('aria-hidden', 'true');
          document.body.appendChild(locatorFrame);
          console.log("✅ CMP Debug: iframe __tcfapiLocator creado correctamente");
        } else {
          console.log("ℹ️ CMP Debug: iframe __tcfapiLocator ya existe");
        }
      } catch (e) {
        console.error("❌ CMP Debug: Error creando iframe __tcfapiLocator:", e);
        console.log("🔄 CMP Debug: Intentando crear iframe en DOMContentLoaded");
        // Intentar de nuevo cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
          if (!window.frames['__tcfapiLocator']) {
            console.log("🔍 CMP Debug: Creando iframe __tcfapiLocator en DOMContentLoaded");
            var locatorFrame = document.createElement('iframe');
            locatorFrame.name = '__tcfapiLocator';
            locatorFrame.style.display = 'none';
            locatorFrame.setAttribute('aria-hidden', 'true');
            document.body.appendChild(locatorFrame);
            console.log("✅ CMP Debug: iframe __tcfapiLocator creado en DOMContentLoaded");
          }
        });
      }
      
      // Verificar que __tcfapiLocator existe en frames
      setTimeout(function() {
        console.log("🔍 CMP Debug: Verificando __tcfapiLocator en frames:", 
          window.frames['__tcfapiLocator'] ? "Encontrado ✓" : "No encontrado ✗");
      }, 500);
      
      // Implementar __tcfapi stub si no existe
      if (typeof window.__tcfapi !== 'function') {
        console.log("🔍 CMP Debug: Creando stub de la función __tcfapi");
        window.__tcfapi = function(cmd, version, callback, parameter) {
          console.log("🔍 CMP Debug: __tcfapi llamada:", cmd, version);
          
          // Almacenar llamadas hasta que el API real esté disponible
          var args = {command: cmd, version: version, parameter: parameter};
          
          if (cmd === 'ping') {
            console.log("🔍 CMP Debug: Procesando comando 'ping'");
            var pingResponse = {
              gdprApplies: true,
              cmpLoaded: true,
              cmpStatus: 'loaded',
              displayStatus: 'visible',
              apiVersion: '2.2',
              cmpVersion: 1,
              cmpId: "${process.env.IAB_CMP_ID || 28}",
              gvlVersion: 1,
              tcfPolicyVersion: 2
            };
            console.log("🔍 CMP Debug: Respuesta ping:", JSON.stringify(pingResponse));
            callback(pingResponse, true);
          } else {
            console.log("🔍 CMP Debug: Encolando comando:", cmd);
            // Almacenar otras llamadas para procesarlas después
            var queue = window.__tcfapi.commandQueue = window.__tcfapi.commandQueue || [];
            queue.push({
              command: cmd,
              parameter: parameter,
              version: version,
              callback: callback
            });
            console.log("🔍 CMP Debug: Cola de comandos actualizada, tamaño:", queue.length);
          }
        };
        console.log("✅ CMP Debug: Stub __tcfapi creado correctamente");
      } else {
        console.log("ℹ️ CMP Debug: __tcfapi ya existe, no se ha creado el stub");
      }
      
      // Verificar si __tcfapi está disponible
      setTimeout(function() {
        console.log("🔍 CMP Debug: Verificando si __tcfapi es accesible:", 
          typeof window.__tcfapi === 'function' ? "Función ✓" : "No es función ✗");
        
        // Probar ping
        if (typeof window.__tcfapi === 'function') {
          console.log("🔍 CMP Debug: Ejecutando self-test de __tcfapi con 'ping'");
          try {
            window.__tcfapi('ping', 2, function(data, success) {
              console.log("🔍 CMP Debug: Respuesta ping self-test:", 
                JSON.stringify(data), "Success:", success);
            });
          } catch (e) {
            console.error("❌ CMP Debug: Error en self-test de ping:", e);
          }
        }
      }, 1000);
      
      // Manejar mensajes postMessage
      console.log("🔍 CMP Debug: Configurando listener para mensajes postMessage");
      window.addEventListener('message', function(event) {
        console.log("🔍 CMP Debug: Mensaje recibido, verificando si es __tcfapiCall");
        var msgIsString = typeof event.data === 'string';
        var json = {};
        try {
          json = msgIsString ? JSON.parse(event.data) : event.data;
        } catch (e) {
          console.log("ℹ️ CMP Debug: Mensaje no es JSON válido, ignorando");
          return;
        }
        
        if (json.__tcfapiCall) {
          console.log("🔍 CMP Debug: Recibido __tcfapiCall via postMessage:", 
            json.__tcfapiCall.command);
          window.__tcfapi(
            json.__tcfapiCall.command,
            json.__tcfapiCall.version,
            function(retValue, success) {
              console.log("🔍 CMP Debug: Enviando respuesta __tcfapiReturn");
              var returnMsg = {
                __tcfapiReturn: {
                  returnValue: retValue,
                  success: success,
                  callId: json.__tcfapiCall.callId
                }
              };
              event.source.postMessage(
                msgIsString ? JSON.stringify(returnMsg) : returnMsg,
                '*'
              );
              console.log("✅ CMP Debug: Respuesta __tcfapiReturn enviada");
            },
            json.__tcfapiCall.parameter
          );
        }
      }, false);
      console.log("✅ CMP Debug: Listener postMessage configurado");
    })();
  
    // Banner ID único para evitar conflictos
    var bannerId = "${bannerId}";
    console.log("🔍 CMP Debug: Banner ID:", bannerId);
    
    // Componentes para recreación
    var components = ${components};
    
    // URL base para imágenes
    var baseUrl = "${baseUrl}";
    
    // IMPORTANTE: DomainID explícitamente incluido
    var domainId = "${domainId}";
    console.log("🔍 CMP Debug: DomainId:", domainId);
    
    // Configuración
    var config = {
      animation: {
        type: "${template.settings?.animation?.type || 'fade'}",
        duration: ${template.settings?.animation?.duration || 300}
      },
      autoHide: ${template.settings?.behaviour?.autoHide?.enabled || false},
      autoHideDelay: ${template.settings?.behaviour?.autoHide?.delay || 0},
      reshow: ${template.settings?.behaviour?.reshow?.enabled || false},
      reshowInterval: ${template.settings?.behaviour?.reshow?.interval || 0},
      useOverlay: ${layoutType === 'modal'},
      forceGDPR: ${forceGDPR},
      cookieExpiry: ${cookieExpiry},
      googleConsentMode: ${includeGoogleConsentMode},
      domainId: "${domainId}" // Pasamos el domainId a la configuración
    };
    console.log("🔍 CMP Debug: Configuración inicializada", config);
    
    // Utilidades para cookies
    var cookieUtils = {
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
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) {
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
    
    // ---- Compatibilidad con navegadores antiguos ----
    function setupCompatibility() {
      // Polyfill para Element.matches
      if (!Element.prototype.matches) {
        Element.prototype.matches = 
          Element.prototype.msMatchesSelector || 
          Element.prototype.webkitMatchesSelector;
      }
      
      // Polyfill para Element.closest
      if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
          var el = this;
          do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
          } while (el !== null && el.nodeType === 1);
          return null;
        };
      }
      
      // Polyfill para Array.forEach
      if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
      }
    }
    
    // Detectar si se aplica GDPR
    function detectGDPR() {
      return new Promise(function(resolve) {
        // Si hemos forzado GDPR en la configuración, devolver true
        if (config.forceGDPR) {
          console.log("GDPR aplicado por configuración");
          return resolve(true);
        }
        
        // Comprobar en CloudFlare o encabezados si es posible
        if (navigator.globalPrivacyControl) {
          console.log("GPC detectado, aplicando GDPR");
          return resolve(true);
        }
        
        try {
          // Intentar detectar por timezone
          var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          var europeanTimezones = [
            'Europe/', // Cualquier timezone de Europa
            'Atlantic/Canary', 'Atlantic/Faroe', 'Atlantic/Madeira'
          ];
          
          var isEuropeanTimezone = europeanTimezones.some(function(tz) {
            return timezone.indexOf(tz) === 0;
          });
          
          if (isEuropeanTimezone) {
            console.log("Timezone europeo detectado, aplicando GDPR");
            return resolve(true);
          }
          
          // Navegador con preferencias de idioma
          var languages = navigator.languages || [navigator.language || navigator.userLanguage].filter(Boolean);
          var europeanLangs = ['fr', 'de', 'es', 'it', 'pt', 'nl', 'el', 'bg', 'hr', 'cs', 'da', 'et', 'fi', 'hu', 'ga', 'lv', 'lt', 'mt', 'pl', 'ro', 'sk', 'sl', 'sv'];
          
          var hasEuropeanLang = languages.some(function(lang) {
            var langCode = lang.split('-')[0].toLowerCase();
            return europeanLangs.indexOf(langCode) !== -1;
          });
          
          if (hasEuropeanLang) {
            console.log("Idioma europeo detectado, aplicando GDPR");
            return resolve(true);
          }
          
          // Si no podemos determinar, por defecto aplicamos GDPR por seguridad
          console.log("No se pudo determinar región, aplicando GDPR por defecto");
          return resolve(true);
        } catch (error) {
          console.error("Error en detección de GDPR:", error);
          // En caso de error, aplicar GDPR por seguridad
          return resolve(true);
        }
      });
    }
    
    // ---- Utilidades ----
    function getDeviceType() {
      var width = window.innerWidth;
      if (width <= 480) return 'mobile';
      if (width <= 768) return 'tablet';
      return 'desktop';
    }
    
    // Aplicar estilos a un elemento
    function applyStyles(element, styles) {
      if (!element || !styles) return;
      Object.keys(styles).forEach(function(property) {
        if (styles[property] !== undefined && styles[property] !== null) {
          element.style[property] = styles[property];
        }
      });
    }
    
    // --- FUNCIÓN MOSTRAR BANNER - MEJORADA ---
    function showBanner() {
      try {
        console.log("🔄 Iniciando función showBanner...");
        
        if (document.getElementById('cmp-banner')) {
          // El banner ya existe, solo hay que mostrarlo
          var banner = document.getElementById('cmp-banner');
          
          // Forzar visualización con !important
          banner.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; pointer-events: auto !important;';
          banner.classList.add('cmp-banner--visible');
          
          // Evento de consola para depuración
          console.log("✅ Banner existente encontrado y mostrado");
          
          return;
        }
        
        console.log("🔄 Banner no encontrado en el DOM, creando uno nuevo...");
        
        // Inyectar estilos
        injectStyles();
        
        // Crear el banner en el DOM
        createBanner();
        
        // Configurar listeners de eventos
        setupEventListeners();
        
        // Forzar visualización después de crearlo
        setTimeout(function() {
          var newBanner = document.getElementById('cmp-banner');
          if (newBanner) {
            newBanner.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; pointer-events: auto !important;';
            console.log("✅ Banner creado y forzado a mostrarse");
          } else {
            console.error("❌ No se pudo encontrar el banner después de crearlo");
          }
        }, 100);
        
        // Si hay autoHide configurado
        if (config.autoHide && config.autoHideDelay > 0) {
          setTimeout(function() {
            hideBanner();
          }, config.autoHideDelay * 1000);
        }
      } catch (error) {
        console.error("❌ Error en showBanner:", error);
        // Intentar crear un banner de emergencia en caso de error
        createEmergencyBanner();
      }
    }
  
    // --- FUNCIÓN DE EMERGENCIA ---
    function createEmergencyBanner() {
      try {
        console.log("🚨 Creando banner de emergencia...");
        
        // Crear un banner básico de emergencia
        var emergencyBanner = document.createElement('div');
        emergencyBanner.id = 'cmp-banner';
        emergencyBanner.className = 'cmp-banner';
        emergencyBanner.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 15px; z-index: 99999; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;';
        
        emergencyBanner.innerHTML = \`
          <div>
            <p style="margin:0">Este sitio utiliza cookies para mejorar su experiencia.</p>
          </div>
          <div style="display:flex;gap:10px">
            <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
            <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
          </div>
        \`;
        
        document.body.appendChild(emergencyBanner);
        
        // Configurar listeners
        var buttons = emergencyBanner.querySelectorAll('button');
        buttons.forEach(function(button) {
          button.addEventListener('click', function() {
            var action = this.getAttribute('data-cmp-action');
            if (action === 'accept_all') {
              acceptAll();
            } else if (action === 'reject_all') {
              rejectAll();
            }
            hideBanner();
          });
        });
        
        console.log("✅ Banner de emergencia creado y configurado");
      } catch (emergencyError) {
        console.error("❌ Error crítico al crear banner de emergencia:", emergencyError);
      }
    }
    
    // Ocultar el banner
    function hideBanner() {
      var banner = document.getElementById('cmp-banner');
      var overlay = document.getElementById(bannerId + "-overlay");
      
      if (banner) {
        // Añadir clase para animación de salida
        banner.classList.add('cmp-banner--hiding');
        banner.classList.remove('cmp-banner--visible');
        
        if (overlay) {
          overlay.style.opacity = "0";
        }
        
        // Esperar a que termine la animación
        setTimeout(function() {
          if (banner.parentNode) {
            banner.parentNode.removeChild(banner);
          }
          
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, config.animation.duration);
      }
    }
    
    // --- FUNCIÓN PARA INYECTAR ESTILOS - MEJORADA ---
    function injectStyles() {
      try {
        console.log("🔄 Inyectando estilos CSS...");
        
        // Remover estilos anteriores si existen
        var oldStyle = document.getElementById(bannerId + "-styles");
        if (oldStyle && oldStyle.parentNode) {
          oldStyle.parentNode.removeChild(oldStyle);
        }
        
        // Estilos del banner
        var styleEl = document.createElement('style');
        styleEl.id = bannerId + "-styles";
        
        // Usar CSS del template o alternativo
        var cssContent = \`${safeCss}\`;
        
        if (!cssContent || cssContent.trim() === '') {
          console.error("❌ CSS vacío o inválido");
          // Usar CSS alternativo
          styleEl.textContent = ".cmp-banner { position: fixed; bottom: 0; left: 0; right: 0; background: white; z-index: 99999; padding: 15px; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); }";
        } else {
          styleEl.textContent = cssContent;
        }
        
        document.head.appendChild(styleEl);
        console.log("✅ Estilos básicos del banner inyectados");
        
        // Estilos específicos para el tipo de banner
        var typeStyleEl = document.createElement('style');
        typeStyleEl.id = bannerId + "-type-styles";
        
        const typeSpecificCSS = \`${typeSpecificCSSString}\`;
        
        if (!typeSpecificCSS || typeof typeSpecificCSS !== 'string' || typeSpecificCSS.trim() === '') {
          console.error("❌ CSS específico de tipo vacío o inválido");
          // Usar CSS alternativo
          typeStyleEl.textContent = ".cmp-banner { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 99999 !important; }";
        } else {
          typeStyleEl.textContent = typeSpecificCSS;
        }
        
        document.head.appendChild(typeStyleEl);
        console.log("✅ Estilos específicos del tipo de banner inyectados");
        
        // Estilos para animaciones
        var animStyleEl = document.createElement('style');
        animStyleEl.id = bannerId + "-animation-styles";
        
        try {
          animStyleEl.textContent = generateAnimationCSS();
        } catch (animError) {
          console.error("❌ Error generando CSS de animación:", animError);
          // Usar CSS alternativo para animaciones
          animStyleEl.textContent = ".cmp-banner--visible { display: block !important; opacity: 1; } .cmp-banner--hiding { opacity: 0; transition: opacity 300ms ease-in; }";
        }
        
        document.head.appendChild(animStyleEl);
        console.log("✅ Estilos de animación inyectados");
        
        // Estilos críticos para garantizar visibilidad
        var criticalStyleEl = document.createElement('style');
        criticalStyleEl.id = bannerId + "-critical-styles";
        criticalStyleEl.textContent = \`
          #cmp-banner, .cmp-banner {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 100000 !important;
            pointer-events: auto !important;
          }
        \`;
        document.head.appendChild(criticalStyleEl);
        console.log("✅ Estilos críticos inyectados");
        
      } catch (error) {
        console.error("❌ Error al inyectar estilos:", error);
        
        // Intentar inyectar estilos mínimos en caso de error
        try {
          var emergencyStyles = document.createElement('style');
          emergencyStyles.textContent = \`
            .cmp-banner { 
              position: fixed !important; 
              bottom: 0 !important; 
              left: 0 !important; 
              right: 0 !important; 
              background: white !important; 
              z-index: 99999 !important; 
              padding: 15px !important;
              box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
            }
            .cmp-banner--visible { 
              display: block !important; 
              opacity: 1 !important; 
            }
          \`;
          document.head.appendChild(emergencyStyles);
          console.log("✅ Estilos de emergencia inyectados con éxito");
        } catch (emergencyError) {
          console.error("❌ Error crítico al inyectar estilos de emergencia:", emergencyError);
        }
      }
    }
    
    // --- FUNCIÓN PARA CREAR EL BANNER - MEJORADA ---
    function createBanner() {
      try {
        console.log("🔄 Iniciando creación del banner...");
        console.log("HTML del banner disponible:", Boolean(\`${safeHtml}\`.length > 0));
        
        // Para modales, crear primero el overlay
        if (config.useOverlay) {
          var overlayEl = document.createElement('div');
          overlayEl.id = bannerId + "-overlay";
          overlayEl.className = "cmp-modal-overlay";
          document.body.appendChild(overlayEl);
          
          console.log("✅ Overlay creado con ID:", bannerId + "-overlay");
          
          // Transición de entrada para el overlay
          setTimeout(function() {
            overlayEl.style.opacity = "0";
            setTimeout(function() {
              overlayEl.style.transition = "opacity " + (config.animation.duration * 0.8) + "ms ease-out";
              overlayEl.style.opacity = "1";
            }, 50);
          }, 0);
        }
        
        // Crear el contenedor del banner
        var bannerEl = document.createElement('div');
        bannerEl.id = bannerId + "-container";
        
        console.log("✅ Contenedor del banner creado con ID:", bannerId + "-container");
        
        // Obtener HTML del template o usar uno básico
        var htmlContent = \`${safeHtml}\`;
        
        if (!htmlContent || htmlContent.trim() === '') {
          console.error("❌ HTML del banner vacío o inválido, usando HTML por defecto");
          htmlContent = \`
            <div id="cmp-banner" class="cmp-banner" role="dialog">
              <div style="flex:1">
                <p style="margin:0">Este sitio utiliza cookies para mejorar tu experiencia.</p>
              </div>
              <div style="display:flex;gap:10px">
                <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
                <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
              </div>
            </div>
          \`;
        }
        
        console.log("🔄 Insertando HTML del banner (primeros 100 chars):", htmlContent.substring(0, 100) + "...");
        
        // Insertar el HTML base
        bannerEl.innerHTML = htmlContent;
        document.body.appendChild(bannerEl);
        
        // Verificar el banner creado
        var createdBanner = document.querySelector('#cmp-banner');
        if (!createdBanner) {
          console.error("❌ No se encontró el elemento #cmp-banner después de insertar el HTML. Contenido del bannerEl:", bannerEl.innerHTML.substring(0, 200) + "...");
          
          // MODIFICADO: Si no se encuentra, crearlo directamente
          createdBanner = document.createElement('div');
          createdBanner.id = 'cmp-banner';
          createdBanner.className = 'cmp-banner';
          createdBanner.setAttribute('role', 'dialog');
          createdBanner.innerHTML = \`
            <div style="flex:1">
              <p style="margin:0">Este sitio utiliza cookies para mejorar tu experiencia.</p>
            </div>
            <div style="display:flex;gap:10px">
              <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
              <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
            </div>
          \`;
          document.body.appendChild(createdBanner);
          console.log("✅ Banner creado directamente como fallback");
        }
        
        console.log("✅ Banner insertado correctamente en el DOM");
        
        // MODIFICADO: Forzar estilos directamente para asegurar visibilidad
        if (createdBanner) {
          createdBanner.style.cssText = \`
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999999 !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding: 15px !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.2) !important;
          \`;
          console.log("✅ Estilos forzados aplicados al banner");
        }
        
        // Actualizar cada componente individualmente
        console.log("🔄 Configurando posicionamiento de componentes...");
        setupComponentPositioning();
        
        // Crear panel de preferencias si no existe
        if (!document.getElementById('cmp-preferences')) {
          console.log("🔄 Creando panel de preferencias...");
          
          var preferencesContent = \`${safePreferencesPanel}\`;
          
          if (!preferencesContent || preferencesContent.trim() === '') {
            console.error("❌ Panel de preferencias vacío o inválido");
          } else {
            var preferencesEl = document.createElement('div');
            preferencesEl.innerHTML = preferencesContent;
            document.body.appendChild(preferencesEl);
            console.log("✅ Panel de preferencias creado e insertado");
          }
        }
        
        // Añadir la clase para hacerlo visible después de un delay
        setTimeout(function() {
          var banner = document.querySelector('#cmp-banner');
          if (banner) {
            banner.classList.add('cmp-banner--visible');
            console.log("✅ Clase cmp-banner--visible añadida al banner");
          } else {
            console.error("❌ No se pudo encontrar #cmp-banner para añadir clase visible");
          }
        }, 50);
        
      } catch (error) {
        console.error("❌ Error al crear el banner:", error);
        
        // Crear un banner de emergencia en caso de error
        createEmergencyBanner();
      }
    }
    
    // Configurar posicionamiento de componentes
    function setupComponentPositioning() {
      try {
        console.log("🔄 Configurando posicionamiento de componentes...");
        
        var banner = document.querySelector('#cmp-banner');
        if (!banner) {
          console.error("❌ No se encontró el banner para posicionar componentes");
          return;
        }
        
        // Asegurar que el banner tiene posición relativa para posicionamiento absoluto de componentes
        banner.style.position = "relative";
        
        // Obtener el dispositivo actual
        var currentDevice = getDeviceType();
        console.log("📱 Dispositivo actual:", currentDevice);
        
        // Procesar cada componente individualmente
        var componentsCount = 0;
        components.forEach(function(comp) {
          var compEl = document.querySelector('[data-component-id="' + comp.id + '"]');
          if (!compEl) {
            console.warn("⚠️ No se encontró el componente con ID:", comp.id);
            return;
          }
          
          componentsCount++;
          
          // Establecer posición absoluta para cada componente
          compEl.style.position = "absolute";
          
          // Aplicar posición específica del dispositivo
          var devicePosition = getDeviceSpecificPosition(comp, currentDevice);
          if (devicePosition) {
            if (devicePosition.top) compEl.style.top = devicePosition.top;
            if (devicePosition.left) compEl.style.left = devicePosition.left;
            if (devicePosition.right) compEl.style.right = devicePosition.right;
            if (devicePosition.bottom) compEl.style.bottom = devicePosition.bottom;
          }
          
          // Aplicar estilos específicos del dispositivo
          var deviceStyles = getDeviceSpecificStyles(comp, currentDevice);
          applyStyles(compEl, deviceStyles);
          
          // Verificación especial para imágenes
          if (comp.type === 'image' || comp.type === 'logo') {
            var img = compEl.querySelector('img');
            if (img) {
              // Estilos para la imagen
              img.style.maxWidth = "100%";
              img.style.height = "auto";
              img.style.display = "block";
              
              // Verificar si debe estar centrado
              var shouldCenter = comp.centered || 
                                (deviceStyles && deviceStyles.textAlign === 'center');
              
              if (shouldCenter && compEl.parentNode) {
                compEl.classList.add('cmp-logo-centered');
              }
              
              // Manejar eventos de carga
              img.onload = function() {
                compEl.classList.add('cmp-image-loaded');
              };
              
              // Manejar errores de carga
              img.onerror = function() {
                console.warn('⚠️ Error cargando imagen:', img.src);
                // Agregar clase para mostrar un estado de error
                compEl.classList.add('cmp-image-error');
              };
            }
          }
        });
        
        console.log("✅ Posicionamiento completado para", componentsCount, "componentes");
      } catch (error) {
        console.error("❌ Error en setupComponentPositioning:", error);
      }
    }
    
    // Obtener posición específica para el dispositivo con fallbacks
    function getDeviceSpecificPosition(component, deviceType) {
      if (!component.position) return { top: '0px', left: '0px' };
      
      // Aplicar fallbacks - si no hay configuración específica, usar el inmediato superior
      let positionObj;
      if (deviceType === 'mobile') {
        positionObj = component.position.mobile || component.position.tablet || component.position.desktop || { top: '0px', left: '0px' };
      } else if (deviceType === 'tablet') {
        positionObj = component.position.tablet || component.position.desktop || { top: '0px', left: '0px' };
      } else {
        positionObj = component.position.desktop || { top: '0px', left: '0px' };
      }
      
      // Asegurar que se devuelven todas las propiedades de posición
      return {
        top: positionObj.top,
        left: positionObj.left,
        right: positionObj.right,
        bottom: positionObj.bottom
      };
    }
    
    // Obtener estilos específicos para el dispositivo
    function getDeviceSpecificStyles(component, deviceType) {
      if (!component.style) return {};
      
      // Aplicar fallbacks - si no hay configuración específica, usar el inmediato superior
      if (deviceType === 'mobile') {
        return component.style.mobile || component.style.tablet || component.style.desktop || {};
      } else if (deviceType === 'tablet') {
        return component.style.tablet || component.style.desktop || {};
      }
      
      return component.style.desktop || {};
    }
    
    // Generar CSS para animaciones
    function generateAnimationCSS() {
      try {
        var animationType = config.animation.type;
        var duration = config.animation.duration;
        var css = '';
        
        if (animationType === 'fade') {
          css = \`
            @keyframes cmpFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes cmpFadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            
            .cmp-banner--visible {
              animation: cmpFadeIn \${duration}ms ease-out forwards;
              display: block !important;
            }
            
            .cmp-banner--hiding {
              animation: cmpFadeOut \${duration}ms ease-in forwards;
            }
          \`;
        } else if (animationType === 'slide') {
          css = \`
            @keyframes cmpSlideInTop {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes cmpSlideOutTop {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(-100%); opacity: 0; }
            }
            
            @keyframes cmpSlideInBottom {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes cmpSlideOutBottom {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(100%); opacity: 0; }
            }
            
            .cmp-banner--visible[data-position="top"] {
              animation: cmpSlideInTop \${duration}ms ease-out forwards;
              display: block !important;
            }
            
            .cmp-banner--hiding[data-position="top"] {
              animation: cmpSlideOutTop \${duration}ms ease-in forwards;
            }
            
            .cmp-banner--visible[data-position="bottom"] {
              animation: cmpSlideInBottom \${duration}ms ease-out forwards;
              display: block !important;
            }
            
            .cmp-banner--hiding[data-position="bottom"] {
              animation: cmpSlideOutBottom \${duration}ms ease-in forwards;
            }
            
            .cmp-banner--visible {
              display: block !important;
            }
          \`;
        } else {
          // Animación por defecto (sin animación pero visible)
          css = \`
            .cmp-banner--visible {
              display: block !important;
              opacity: 1;
            }
            
            .cmp-banner--hiding {
              opacity: 0;
              transition: opacity \${duration}ms ease-in;
            }
          \`;
        }
        
        return css;
      } catch (error) {
        console.error("❌ Error en generateAnimationCSS:", error);
        // Retornar CSS básico en caso de error
        return '.cmp-banner--visible { display: block !important; opacity: 1; } .cmp-banner--hiding { opacity: 0; transition: opacity 300ms ease; }';
      }
    }
    
    // Configurar listeners de eventos
    function setupEventListeners() {
      try {
        console.log("🔄 Configurando listeners de eventos...");
        
        var banner = document.querySelector('#cmp-banner');
        if (!banner) {
          console.error("❌ No se encontró el banner para configurar listeners");
          return;
        }
        
        // Botones con atributo data-cmp-action
        var actionButtons = banner.querySelectorAll('[data-cmp-action]');
        
        if (actionButtons.length === 0) {
          console.warn("⚠️ No se encontraron botones con atributo data-cmp-action, buscando por texto");
          
          // Buscar botones por texto si no tienen el atributo
          var allButtons = banner.querySelectorAll('button, [role="button"], a');
          allButtons.forEach(function(button) {
            var buttonText = button.textContent.toLowerCase().trim();
            if (buttonText.includes('aceptar') || buttonText.includes('accept')) {
              button.setAttribute('data-cmp-action', 'accept_all');
            } else if (buttonText.includes('rechazar') || buttonText.includes('reject')) {
              button.setAttribute('data-cmp-action', 'reject_all');
            } else if (buttonText.includes('preferencias') || buttonText.includes('preferences')) {
              button.setAttribute('data-cmp-action', 'show_preferences');
            }
          });
          
          // Volver a buscar con atributos actualizados
          actionButtons = banner.querySelectorAll('[data-cmp-action]');
          console.log("✅ Encontrados", actionButtons.length, "botones después de buscar por texto");
        } else {
          console.log("✅ Encontrados", actionButtons.length, "botones para configurar");
        }
        
        // Si aún no hay botones, crear botones de emergencia
        if (actionButtons.length === 0) {
          console.warn("⚠️ No se encontraron botones, creando botones de emergencia");
          var emergencyButtons = document.createElement('div');
          emergencyButtons.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
          emergencyButtons.innerHTML = \`
            <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
            <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
          \`;
          banner.appendChild(emergencyButtons);
          
          // Actualizar la lista de botones
          actionButtons = banner.querySelectorAll('[data-cmp-action]');
        }
        
        actionButtons.forEach(function(button) {
          button.addEventListener('click', function(e) {
            e.preventDefault();
            var action = button.getAttribute('data-cmp-action');
            
            console.log("🖱️ Clic en botón con acción:", action);
            
            switch(action) {
              case 'accept_all':
                acceptAll();
                break;
              case 'reject_all':
                rejectAll();
                break;
              case 'show_preferences':
                showPreferences();
                break;
              case 'save_preferences':
                savePreferences();
                break;
              case 'close':
                hideBanner();
                break;
              default:
                console.warn("⚠️ Acción desconocida:", action);
            }
          });
        });
        
        // Responsiveness
        window.addEventListener('resize', function() {
          adaptToScreenSize();
        });
        
        console.log("✅ Listeners de eventos configurados");
      } catch (error) {
        console.error("❌ Error en setupEventListeners:", error);
      }
    }
    
    // Adaptar el banner a pantallas responsivas
    function adaptToScreenSize() {
      try {
        var currentDevice = getDeviceType();
        console.log("📱 Adaptando a tamaño de pantalla:", currentDevice);
        setupComponentPositioning();
      } catch (error) {
        console.error("❌ Error en adaptToScreenSize:", error);
      }
    }
    
    // Formats consent decisions for the backend API
    function formatConsentPayload(decisions, userId, action) {
      // Map cookie categories to TCF purposes
      var categoryToPurposes = {
        'necessary': [1],
        'analytics': [7, 8, 9, 10],
        'marketing': [2, 3, 4],
        'personalization': [5, 6]
      };
      
      // Build format expected by backend
      var formattedPurposes = {};
      var formattedVendors = {};
      
      // Convert from {category: boolean} to {purposeId: boolean}
      Object.keys(decisions).forEach(function(category) {
        if (categoryToPurposes[category]) {
          categoryToPurposes[category].forEach(function(purposeId) {
            formattedPurposes[purposeId] = decisions[category];
          });
        }
      });
      
      // Ensure purpose 1 is always true (necessary)
      formattedPurposes["1"] = true;
      
      return {
        userId: userId,
        decisions: {
          purposes: formattedPurposes,
          vendors: formattedVendors
        },
        bannerInteraction: {
          type: action,
          timeToDecision: 0,
          customizationOpened: action === 'save_preferences'
        },
        metadata: {
          userAgent: navigator.userAgent,
          language: navigator.language || document.documentElement.lang || 'es',
          deviceType: getDeviceType()
        }
      };
    }
      // Función para mapear propósitos a categorías
  function mapToCategories(purposes) {
    // Valor predeterminado si purposes es undefined
    if (!purposes) {
      return {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false
      };
    }
    
    var categories = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false
    };
    
    // Comprobar si las propiedades existen antes de acceder
    if (purposes['7'] === true || purposes['8'] === true) {
      categories.analytics = true;
    }
    
    if (purposes['2'] === true || purposes['3'] === true || purposes['4'] === true) {
      categories.marketing = true;
    }
    
    if (purposes['5'] === true || purposes['6'] === true) {
      categories.personalization = true;
    }
    
    return categories;
  }
    
    // NUEVA FUNCIÓN: Enviar consentimiento al servidor - CORREGIDA
    function saveConsentToServer(consent, action) {
      try {
        console.log("🔄 [CMP] Enviando consentimiento al servidor");
        
        // CORRECCIÓN: Obtener ID de usuario consistentemente
        var currentUserId = "";
        
        // Intentar obtener userId de múltiples fuentes
        if (typeof userId !== 'undefined') {
          currentUserId = userId;
        } else if (window.CMP && window.CMP.getUserId) {
          currentUserId = window.CMP.getUserId();
        } else if (window.getUserId) {
          currentUserId = window.getUserId();
        } else {
          // Generar un ID si no existe
          currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
          console.log("✅ [CMP] Generado nuevo userId:", currentUserId);
        }
        
        // Verificar que tenemos ID de dominio
        if (!config.domainId) {
          console.error("❌ [CMP] Error: No se encontró ID de dominio para enviar consentimiento");
          return;
        }
        
        // Construir la URL del endpoint de consentimiento
        var apiUrl = baseUrl + "/api/v1/consent/domain/" + config.domainId;
        
        console.log("🔄 [CMP] Usando URL:", apiUrl);
        
        // NUEVO: Verificar formato de consent para realizar conversión si es necesario
        var dbFormatConsent = consent;
        
        if (consent && !Array.isArray(consent.purposes) && typeof consent.purposes === 'object') {
          // Es formato cliente, necesita conversión
          dbFormatConsent = convertToDBFormat(consent);
        }
        
        // Mapear categorías de cookies basadas en propósitos
        var cookieCategories = [];
        
        // Necesarias (siempre permitidas)
        cookieCategories.push({ category: 'necessary', allowed: true });
        
        // Si estamos en formato cliente, mapear categorías
        if (consent && !Array.isArray(consent.purposes)) {
          var categories = mapToCategories(consent.purposes);
          
          cookieCategories.push({ category: 'analytics', allowed: categories.analytics });
          cookieCategories.push({ category: 'marketing', allowed: categories.marketing });
          cookieCategories.push({ category: 'personalization', allowed: categories.personalization });
        } else if (Array.isArray(consent.purposes)) {
          // Si estamos en formato DB, calcular categorías de otra manera
          // Analytics: propósitos 7 y 8
          var analyticsAllowed = false;
          var marketingAllowed = false;
          var personalizationAllowed = false;
          
          for (var i = 0; i < consent.purposes.length; i++) {
            var purpose = consent.purposes[i];
            if ((purpose.id === 7 || purpose.id === 8) && purpose.allowed === true) {
              analyticsAllowed = true;
            }
            if ((purpose.id === 2 || purpose.id === 3 || purpose.id === 4) && purpose.allowed === true) {
              marketingAllowed = true;
            }
            if ((purpose.id === 5 || purpose.id === 6) && purpose.allowed === true) {
              personalizationAllowed = true;
            }
          }
          
          cookieCategories.push({ category: 'analytics', allowed: analyticsAllowed });
          cookieCategories.push({ category: 'marketing', allowed: marketingAllowed });
          cookieCategories.push({ category: 'personalization', allowed: personalizationAllowed });
        }
        
        // Obtener metadatos para el envío
        var deviceType = getDeviceType();
        var language = navigator.language || 'es';
        var userAgent = navigator.userAgent;
        
        // Preparar los datos para enviar en formato unificado
        var payload = {
          userId: currentUserId,
          decisions: dbFormatConsent,
          preferences: {
            cookies: cookieCategories,
            scriptIds: []
          },
          bannerInteraction: {
            type: action,
            timeToDecision: 0,
            customizationOpened: action === 'save_preferences'
          },
          metadata: {
            userAgent: userAgent,
            language: language,
            deviceType: deviceType
          }
        };
        
        // Registrar qué estamos enviando
        console.log("📤 [CMP] Enviando consentimiento al servidor con formato unificado");
        
        // Hacer la solicitud POST al servidor
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        .then(function(response) {
          if (!response.ok) {
            return response.text().then(function(text) {
              throw new Error('Error ' + response.status + ': ' + text);
            });
          }
          return response.json();
        })
        .then(function(data) {
          console.log("✅ [CMP] Consentimiento guardado en el servidor:", data);
          
          // NUEVO: Almacenar el tcString generado por el servidor si está disponible
          if (data && data.data && data.data.tcString) {
            // Actualizar consentimiento interno con tcString del servidor
            consentState.tcString = data.data.tcString;
            
            // Guardar en cookie
            cookieUtils.set(bannerId + '-consent', consentState, config.cookieExpiry);
            
            console.log("✅ [CMP] TCString actualizado desde servidor");
          }
        })
        .catch(function(error) {
          console.error("❌ [CMP] Error al guardar consentimiento en el servidor:", error);
          
          // Segundo intento con payload reducido en caso de error
          if (error.message.includes('413') || error.message.includes('payload too large')) {
            var minimalPayload = {
              userId: currentUserId,
              decisions: {
                purposes: [{ id: 1, name: "Storage and access", allowed: true, legalBasis: "consent" }],
                vendors: []
              },
              bannerInteraction: { type: action }
            };
            
            console.log("🔄 [CMP] Reintentando con payload reducido");
            
            fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(minimalPayload)
            })
            .then(function(response) {
              if (response.ok) {
                console.log("✅ [CMP] Reintento exitoso");
              } else {
                console.error("❌ [CMP] Error en reintento:", response.status);
              }
            })
            .catch(function(e) {
              console.error("❌ [CMP] Error en reintento:", e);
            });
          }
        });
      } catch (e) {
        console.error("❌ [CMP] Error enviando consentimiento al servidor:", e);
      }
    }
    
    // Aceptar todas las cookies
    function acceptAll() {
      try {
        console.log("🔄 Aceptando todas las cookies...");
        
        // Marcar todos los propósitos como aceptados
        var allPurposes = {
          necessary: true,
          analytics: true,
          marketing: true,
          personalization: true
        };
        
        saveConsent(allPurposes, 'accept_all');
        hideBanner();
        
        console.log("✅ Todas las cookies aceptadas");
      } catch (error) {
        console.error("❌ Error en acceptAll:", error);
      }
    }
    
    // Rechazar todas las cookies excepto las necesarias
    function rejectAll() {
      try {
        console.log("🔄 Rechazando cookies no esenciales...");
        
        // Solo mantener cookies necesarias
        var minimalPurposes = {
          necessary: true,
          analytics: false,
          marketing: false,
          personalization: false
        };
        
        saveConsent(minimalPurposes, 'reject_all');
        hideBanner();
        
        console.log("✅ Cookies no esenciales rechazadas");
      } catch (error) {
        console.error("❌ Error en rejectAll:", error);
      }
    }
    
    // Mostrar panel de preferencias
    function showPreferences() {
      try {
        console.log("🔄 Mostrando panel de preferencias...");
        
        var preferencesPanel = document.getElementById('cmp-preferences');
        if (!preferencesPanel) {
          console.error("❌ Panel de preferencias no encontrado");
          return;
        }
        
        // Ocultar banner principal si está visible
        var banner = document.getElementById('cmp-banner');
        if (banner) {
          banner.classList.remove('cmp-banner--visible');
        }
        
        // Mostrar panel de preferencias
        preferencesPanel.style.display = 'flex';
        
        // Setup de event listeners para el panel de preferencias
        setupPreferencesEventListeners();
        
        console.log("✅ Panel de preferencias mostrado");
      } catch (error) {
        console.error("❌ Error en showPreferences:", error);
      }
    }
    
    // Configurar listeners del panel de preferencias
    function setupPreferencesEventListeners() {
      try {
        console.log("🔄 Configurando listeners del panel de preferencias...");
        
        var preferencesPanel = document.getElementById('cmp-preferences');
        if (!preferencesPanel) {
          console.error("❌ Panel de preferencias no encontrado");
          return;
        }
        
        // Tab switching
        var tabs = preferencesPanel.querySelectorAll('.cmp-tab');
        var tabContents = preferencesPanel.querySelectorAll('.cmp-tab-content');
        
        if (tabs.length === 0) {
          console.warn("⚠️ No se encontraron tabs en el panel de preferencias");
        }
        
        tabs.forEach(function(tab) {
          tab.addEventListener('click', function() {
            var tabId = this.getAttribute('data-tab');
            
            // Reset all tabs
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tabContents.forEach(function(c) { c.classList.remove('active'); });
            
            // Activate selected tab
            this.classList.add('active');
            var activeContent = preferencesPanel.querySelector('[data-tab-content="' + tabId + '"]');
            if (activeContent) {
              activeContent.classList.add('active');
            } else {
              console.warn("⚠️ No se encontró contenido para tab:", tabId);
            }
          });
        });
        
        // Button actions
        var acceptButton = preferencesPanel.querySelector('.cmp-button-accept');
        var rejectButton = preferencesPanel.querySelector('.cmp-button-reject');
        var saveButton = preferencesPanel.querySelector('.cmp-button-save');
        var closeButton = preferencesPanel.querySelector('.cmp-close-button');
        
        if (acceptButton) {
          acceptButton.addEventListener('click', function() {
            acceptAll();
            preferencesPanel.style.display = 'none';
          });
        }
        
        if (rejectButton) {
          rejectButton.addEventListener('click', function() {
            rejectAll();
            preferencesPanel.style.display = 'none';
          });
        }
        
        if (saveButton) {
          saveButton.addEventListener('click', function() {
            savePreferences();
            preferencesPanel.style.display = 'none';
          });
        }
        
        if (closeButton) {
          closeButton.addEventListener('click', function() {
            preferencesPanel.style.display = 'none';
            showBanner(); // Mostrar de nuevo el banner principal
          });
        }
        
        // Cargar estado de consentimiento actual en los controles
        loadConsentStateToUI();
        
        console.log("✅ Listeners del panel de preferencias configurados");
      } catch (error) {
        console.error("❌ Error en setupPreferencesEventListeners:", error);
      }
    }
    
    // Cargar estado de consentimiento en la UI
    function loadConsentStateToUI() {
      try {
        console.log("🔄 Cargando estado de consentimiento en la UI...");
        
        var preferencesPanel = document.getElementById('cmp-preferences');
        if (!preferencesPanel) {
          console.error("❌ Panel de preferencias no encontrado");
          return;
        }
        
        // Obtener estado actual
        var currentState = getConsentState();
        
        // Actualizar checkboxes de categorías
        var categoryInputs = preferencesPanel.querySelectorAll('[data-category]');
        categoryInputs.forEach(function(input) {
          var category = input.getAttribute('data-category');
          input.checked = currentState.purposes && currentState.purposes[category] === true;
        });
        
        // Actualizar checkboxes de propósitos específicos
        var purposeInputs = preferencesPanel.querySelectorAll('[data-purpose-id]');
        purposeInputs.forEach(function(input) {
          var purposeId = input.getAttribute('data-purpose-id');
          input.checked = currentState.purposes && currentState.purposes[purposeId] === true;
        });
        
        console.log("✅ Estado de consentimiento cargado en la UI");
      } catch (error) {
        console.error("❌ Error en loadConsentStateToUI:", error);
      }
    }
    
    // Guardar preferencias personalizadas
    function savePreferences() {
      try {
        console.log("🔄 Guardando preferencias personalizadas...");
        
        var preferencesPanel = document.getElementById('cmp-preferences');
        if (!preferencesPanel) return;
        
        var purposes = {
          necessary: true, // Siempre necesarias
          analytics: false,
          marketing: false,
          personalization: false
        };
        
        // Recoger categorías
        var categoryInputs = preferencesPanel.querySelectorAll('[data-category]');
        categoryInputs.forEach(function(input) {
          var category = input.getAttribute('data-category');
          purposes[category] = input.checked;
        });
        
        saveConsent(purposes, 'save_preferences');
        hideBanner();
        
        // Ocultar también el panel de preferencias
        preferencesPanel.style.display = 'none';
        
        console.log("✅ Preferencias personalizadas guardadas");
      } catch (error) {
        console.error("❌ Error en savePreferences:", error);
      }
    }
    
    // Guardar estado de consentimiento
    function saveConsent(consent, action) {
      try {
        console.log("🔄 Guardando consentimiento, acción:", action);
        
        var now = new Date().toISOString();
        
        // Si es primer consentimiento
        if (!consentState.created) {
          consentState.created = now;
        }
        
        // Actualizar estado
        consentState.purposes = consent;
        consentState.lastUpdated = now;
        
        // Guardar en cookie
        cookieUtils.set(bannerId + '-consent', consentState, config.cookieExpiry);
        
        // Aplicar consentimiento (activar/desactivar scripts)
        applyConsent(consentState);
        
        // Actualizar Google Consent Mode si está habilitado
        if (config.googleConsentMode && window.gtag) {
          updateGoogleConsent(consentState);
        }
        
        // Enviar evento si existe dataLayer
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'consent_update',
            consent_action: action,
            consent_categories: consent
          });
        }
        
        // NUEVO: Enviar consentimiento al servidor
        saveConsentToServer(consent, action);
        
        console.log("✅ Estado de consentimiento guardado, categorías:", JSON.stringify(consent));
        return consent;
      } catch (error) {
        console.error("❌ Error en saveConsentState:", error);
        // Intentar guardar al servidor de todos modos
        saveConsentToServer(consent, action);
      }
    }
    
    // Obtener estado de consentimiento actual
    function getConsentState() {
      try {
        // CORRECCIÓN: Inicializar consentState si no existe
        if (typeof consentState === 'undefined' || !consentState) {
          window.consentState = {
            purposes: {
              1: true, // Almacenamiento siempre permitido
              2: false,
              3: false,
              4: false,
              5: false,
              6: false,
              7: false,
              8: false,
              9: false,
              10: false
            },
            vendors: {},
            specialFeatures: {},
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          consentState = window.consentState;
        }
        
        // Si ya tenemos estado en memoria con propósitos, devolverlo
        if (consentState.purposes && Object.keys(consentState.purposes).length > 0) {
          return consentState;
        }
        
        // Intentar obtener de cookie
        var savedConsent = cookieUtils.get(bannerId + '-consent');
        if (savedConsent) {
          consentState = savedConsent;
          
          // Verificar formato y actualizar si es necesario
          if (!consentState.purposes || typeof consentState.purposes !== 'object') {
            consentState.purposes = { 1: true };
          }
          
          // Verificar que propósito 1 esté siempre permitido
          if (!consentState.purposes[1]) {
            consentState.purposes[1] = true;
          }
          
          return consentState;
        }
        
        // Estado por defecto (solo cookies necesarias)
        return {
          purposes: {
            1: true, // Almacenamiento siempre permitido
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false
          },
          vendors: {},
          specialFeatures: {},
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error("❌ Error en getConsentState:", error);
        
        // Retornar estado básico en caso de error
        return {
          purposes: { 1: true },
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    // Aplicar el consentimiento actual a los elementos de la página
    function applyConsent(consent) {
      try {
        console.log("🔄 Aplicando consentimiento a la página");
        
        // Determinar qué categorías están permitidas
        var categories = {};
        
        // Si es formato cliente (objeto con propiedades numéricas)
        if (consent.purposes && typeof consent.purposes === 'object' && !Array.isArray(consent.purposes)) {
          categories = mapToCategories(consent.purposes);
        } 
        // Si es formato DB (array de objetos)
        else if (Array.isArray(consent.purposes)) {
          categories = {
            necessary: true,
            analytics: consent.purposes.some(function(p) { 
              return (p.id === 7 || p.id === 8) && p.allowed === true;
            }),
            marketing: consent.purposes.some(function(p) { 
              return (p.id === 2 || p.id === 3 || p.id === 4) && p.allowed === true;
            }),
            personalization: consent.purposes.some(function(p) { 
              return (p.id === 5 || p.id === 6) && p.allowed === true;
            })
          };
        }
        
        // Aplicar a scripts según categoría
        var scripts = document.querySelectorAll('script[data-category]');
        scripts.forEach(function(script) {
          var category = script.getAttribute('data-category');
          if (category && categories[category] === false) {
            // Desactivar script si la categoría no está permitida
            script.setAttribute('type', 'text/plain');
            console.log("⛔ Script bloqueado:", script.src || "inline");
          } else if (category && categories[category] === true) {
            // Activar script si la categoría está permitida
            if (script.getAttribute('type') === 'text/plain') {
              // Sólo ejecutar si está bloqueado
              executeScript(script);
              console.log("✅ Script activado:", script.src || "inline");
            }
          }
        });
        
        // Actualizar UI con el estado de consentimiento
        updateConsentUI(categories);
        
        // Disparar evento para notificar a scripts de terceros
        var event = new CustomEvent('consentApplied', { 
          detail: { categories: categories, consent: consent } 
        });
        document.dispatchEvent(event);
        
        console.log("✅ Consentimiento aplicado, categorías:", categories);
      } catch (error) {
        console.error("❌ Error aplicando consentimiento:", error);
      }
    }
  
    // Función auxiliar para ejecutar un script bloqueado
    function executeScript(script) {
      try {
        var newScript = document.createElement('script');
        var attributes = script.attributes;
        
        // Copiar todos los atributos excepto type
        for (var i = 0; i < attributes.length; i++) {
          var attr = attributes[i];
          if (attr.name !== 'type') {
            newScript.setAttribute(attr.name, attr.value);
          }
        }
        
        // Restaurar type a text/javascript
        newScript.setAttribute('type', 'text/javascript');
        
        // Copiar contenido si es un script inline
        if (!script.src && script.innerHTML) {
          newScript.innerHTML = script.innerHTML;
        }
        
        // Reemplazar el script original
        script.parentNode.replaceChild(newScript, script);
      } catch (e) {
        console.error("Error ejecutando script:", e);
      }
    }
  
    // Actualizar elementos de UI con el estado de consentimiento
    function updateConsentUI(categories) {
      // Actualizar checkboxes, toggles, etc.
      var categoryInputs = document.querySelectorAll('[data-category]');
      categoryInputs.forEach(function(input) {
        var category = input.getAttribute('data-category');
        if (category && categories[category] !== undefined) {
          if (input.tagName === 'INPUT' && input.type === 'checkbox') {
            input.checked = categories[category];
          } else {
            input.setAttribute('data-status', categories[category] ? 'allowed' : 'denied');
          }
        }
      });
    }
    
    // Activar un script
    function activateScript(script) {
      try {
        if (script.getAttribute('data-activated') === 'true') {
          return; // Ya activado
        }
        
        var newScript = document.createElement('script');
        
        // Copiar todos los atributos excepto type
        for (var i = 0; i < script.attributes.length; i++) {
          var attr = script.attributes[i];
          if (attr.name !== 'type' && attr.name !== 'data-activated') {
            newScript.setAttribute(attr.name, attr.value);
          }
        }
        
        // Establecer type correcto
        newScript.setAttribute('type', 'text/javascript');
        
        // Marcar como activado
        script.setAttribute('data-activated', 'true');
        
        // Copiar contenido o src
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        
        // Insertar en DOM
        script.parentNode.insertBefore(newScript, script.nextSibling);
        
        console.log("✅ Script activado:", script.src || script.textContent.substring(0, 30) + "...");
      } catch (error) {
        console.error("❌ Error al activar script:", error);
      }
    }
    
    // Actualizar Google Consent Mode
    function updateGoogleConsent(consent) {
      try {
        if (!window.gtag) {
          console.log("ℹ️ Google Tag Manager no detectado");
          return;
        }
        
        console.log("🔄 Actualizando Google Consent Mode...");
        
        // Estado de consentimiento para Google
        var consentModeParams = {
          'ad_storage': consent.purposes.marketing ? 'granted' : 'denied',
          'analytics_storage': consent.purposes.analytics ? 'granted' : 'denied',
          'personalization_storage': consent.purposes.personalization ? 'granted' : 'denied',
          'functionality_storage': 'granted', // Siempre permitido
          'security_storage': 'granted' // Siempre permitido
        };
        
        // Actualizar en Google
        gtag('consent', 'update', consentModeParams);
        
        console.log("✅ Google Consent Mode actualizado");
      } catch (error) {
        console.error("❌ Error en updateGoogleConsent:", error);
      }
    }
    
    // Comprobar si existe consentimiento previo
    function hasExistingConsent() {
      try {
        var savedConsent = cookieUtils.get(bannerId + '-consent');
        return !!savedConsent && !!savedConsent.lastUpdated;
      } catch (error) {
        console.error("❌ Error en hasExistingConsent:", error);
        return false;
      }
    }
    
    // Verificar si el banner debe mostrarse
    function shouldShowBanner() {
      try {
        // Si hay consentimiento previo y no está configurado reshow, no mostrar
        if (hasExistingConsent() && !config.reshow) {
          return false;
        }
        
        // Si hay reshow configurado, verificar intervalo
        if (hasExistingConsent() && config.reshow && config.reshowInterval > 0) {
          var savedConsent = cookieUtils.get(bannerId + '-consent');
          var lastUpdatedTime = new Date(savedConsent.lastUpdated).getTime();
          var currentTime = new Date().getTime();
          
          // Convertir intervalo a milisegundos
          var intervalMs = config.reshowInterval * 1000;
          
          // Si no ha pasado suficiente tiempo, no mostrar
          if (currentTime - lastUpdatedTime < intervalMs) {
            return false;
          }
        }
        
        return true;
      } catch (error) {
        console.error("❌ Error en shouldShowBanner:", error);
        // En caso de error, mostrar el banner por seguridad
        return true;
      }
    }
    
    ${includeGoogleConsentMode ? googleConsentModeCode : ''}
    
    // NUEVA FUNCIÓN: Exponer CMP globalmente
    function exposeGlobalCMP() {
  console.log("🔄 Exponiendo objeto CMP al ámbito global");
  
  if (!window.CMP) {
    window.CMP = {
      showBanner: showBanner,
      hideBanner: hideBanner,
      acceptAll: acceptAll,
      rejectAll: rejectAll,
      getConsentState: getConsentState,
      showPreferences: showPreferences,
      // Añadir el método getUserId
      getUserId: function() {
        // Intentar obtener de localStorage
        try {
          const fromStorage = localStorage.getItem('cmp_user_id');
          if (fromStorage) {
            return fromStorage;
          }
        } catch (e) {
          console.log("Error accessing localStorage", e);
        }
        
        // Intentar obtener de cookies
        try {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf('cmp_user_id=') === 0) {
              return cookie.substring('cmp_user_id='.length);
            }
          }
        } catch (e) {
          console.log("Error accessing cookies", e);
        }
        
        // Si no existe, crear uno nuevo
        const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        
        // Intentar guardarlo
        try {
          localStorage.setItem('cmp_user_id', newId);
        } catch (e) {
          console.log("Error saving to localStorage", e);
        }
        
        // También en cookies
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = 'cmp_user_id=' + newId + '; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
        
        return newId;
      },
      // Añadir el método getSessionId
      getSessionId: function() {
        if (!window._cmpSessionId) {
          window._cmpSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        }
        return window._cmpSessionId;
      },
      reset: function() {
        cookieUtils.remove(bannerId + '-consent');
        consentState = {
          purposes: { necessary: true },
          created: null,
          lastUpdated: null
        };
        showBanner();
      },
      // Añadir estos métodos de utilidad para debugging
      _debug: {
        forceShowBanner: function() {
          var banner = document.getElementById('cmp-banner');
          if (banner) {
            banner.style.cssText = \`
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              z-index: 999999 !important;
            \`;
            return "Banner forzado a mostrarse";
          } else {
            return "Banner no encontrado en el DOM";
          }
        }
      }
    };
    
    console.log("✅ Objeto CMP creado y expuesto globalmente");
  } else {
    console.log("ℹ️ Objeto CMP ya existe, asegurando funcionalidades");
    // Asegurar que todas las funciones están disponibles
    window.CMP.showBanner = showBanner;
    window.CMP.hideBanner = hideBanner;
    window.CMP.acceptAll = acceptAll;
    window.CMP.rejectAll = rejectAll;
    window.CMP.getConsentState = getConsentState;
    window.CMP.showPreferences = showPreferences;
    
    // Asegurar que getUserId y getSessionId estén disponibles
    if (typeof window.CMP.getUserId !== 'function') {
      window.CMP.getUserId = function() {
        // Misma implementación que arriba - usar el mismo código
        try {
          const fromStorage = localStorage.getItem('cmp_user_id');
          if (fromStorage) return fromStorage;
        } catch (e) {}
        
        try {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf('cmp_user_id=') === 0) {
              return cookie.substring('cmp_user_id='.length);
            }
          }
        } catch (e) {}
        
        const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        try { localStorage.setItem('cmp_user_id', newId); } catch (e) {}
        document.cookie = 'cmp_user_id=' + newId + '; max-age=31536000; path=/; SameSite=Lax';
        return newId;
      };
    }
    
    if (typeof window.CMP.getSessionId !== 'function') {
      window.CMP.getSessionId = function() {
        if (!window._cmpSessionId) {
          window._cmpSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        }
        return window._cmpSessionId;
      };
    }
  }
}
  
    // Inicializar
    function init() {
      try {
        console.log("🚀 Inicializando CMP...");
        
        // Configurar polyfills
        setupCompatibility();
        
        // Estado de consentimiento (inicialmente vacío)
        var consentState = {
          purposes: {},
          vendors: {},
          specialFeatures: {},
          created: null,
          lastUpdated: null
        };
        
        // Inicializar y asegurar userId persistence
        function initializeUserId() {
          const storageKey = 'cmp_user_id';
          let userId;
          
          // Try localStorage first
          try {
            userId = localStorage.getItem(storageKey);
            if (userId) {
              console.log("✅ [CMP] UserId found in localStorage:", userId);
              return userId;
            }
          } catch (e) {
            console.log("⚠️ [CMP] localStorage not available:", e);
          }
          
          // Try cookies next
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf(storageKey + '=') === 0) {
              userId = cookie.substring(storageKey.length + 1);
              console.log("✅ [CMP] UserId found in cookies:", userId);
              return userId;
            }
          }
          
          // Generate new ID if not found
          userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
          console.log("✅ [CMP] New userId generated:", userId);
          
          // Store in both localStorage and cookies for redundancy
          try {
            localStorage.setItem(storageKey, userId);
          } catch (e) {
            console.log("⚠️ [CMP] Could not save to localStorage:", e);
          }
          
          // Set cookie with 1-year expiry
          const expiry = new Date();
          expiry.setFullYear(expiry.getFullYear() + 1);
          document.cookie = storageKey + '=' + userId + '; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
          
          return userId;
        }
        
        // Initialize userId immediately
        var userId = initializeUserId();
        console.log("🔑 [CMP] User ID initialized:", userId);
        
        // Cargar estado de consentimiento
        consentState = getConsentState();
        
        // Si hay consentimiento previo, aplicarlo
        if (hasExistingConsent()) {
          console.log("🔄 Consentimiento previo encontrado, aplicando...");
          applyConsent(consentState);
          
          // Actualizar Google Consent Mode si está habilitado
          if (config.googleConsentMode && window.gtag) {
            updateGoogleConsent(consentState);
          }
        } else {
          console.log("ℹ️ No se encontró consentimiento previo");
        }
        
        // Determinar si debemos mostrar el banner
        if (shouldShowBanner()) {
          console.log("🔄 Se debe mostrar el banner");
          // Mostrar banner después de un breve delay para permitir que la página cargue
          setTimeout(function() {
            showBanner();
          }, 800);
        } else {
          console.log("ℹ️ No es necesario mostrar el banner");
        }
        
        // Exponer API pública
        exposeGlobalCMP();
        
        console.log("✅ CMP inicializado correctamente");
      } catch (error) {
        console.error("❌ Error en init:", error);
        // Intentar recuperarse del error
        try {
          // Crear objeto CMP mínimo en caso de error
          window.CMP = {
            showBanner: function() { createEmergencyBanner(); },
            hideBanner: function() { 
              var banner = document.getElementById('cmp-banner');
              if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
              }
            },
            acceptAll: function() {
              cookieUtils.set(bannerId + '-consent', { 
                purposes: { necessary: true, analytics: true, marketing: true, personalization: true },
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              }, 365);
              this.hideBanner();
            },
            rejectAll: function() {
              cookieUtils.set(bannerId + '-consent', { 
                purposes: { necessary: true, analytics: false, marketing: false, personalization: false },
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              }, 365);
              this.hideBanner();
            }
          };
        } catch (recoveryError) {
          console.error("❌ Error crítico en CMP, no se pudo recuperar:", recoveryError);
        }
      }
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(init, 100);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 100);
      });
    }
    
    // Por último, verificar periódicamente el estado de CMP para asegurar que todo funcione
    setInterval(function() {
      console.log("🔍 CMP Debug: Estado actual del CMP:");
      console.log("- __tcfapi disponible:", typeof window.__tcfapi === 'function' ? "Sí ✓" : "No ✗");
      console.log("- __tcfapiLocator iframe:", window.frames['__tcfapiLocator'] ? "Existe ✓" : "No existe ✗");
      console.log("- Consent cookie:", document.cookie.includes("${bannerId}-consent") ? "Existe ✓" : "No existe ✗");
      
      // Verificar banner visible
      var bannerElement = document.getElementById('cmp-banner');
      console.log("- Banner en DOM:", bannerElement ? "Existe ✓" : "No existe ✗");
    if (bannerElement) {
      console.log("- Banner visible:", window.getComputedStyle(bannerElement).display !== 'none' ? "Sí ✓" : "No ✗");
    }
    
    // Verificar si CMP está expuesto
    console.log("- window.CMP disponible:", typeof window.CMP === 'object' ? "Sí ✓" : "No ✗");
    
    // Si existe el banner pero no es visible, forzar
    if (bannerElement && window.getComputedStyle(bannerElement).display === 'none' && shouldShowBanner()) {
      console.log("🔄 CMP Debug: Forzando visibilidad del banner");
      bannerElement.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; pointer-events: auto !important;';
    }
    
    // Auto-test de ping
    if (typeof window.__tcfapi === 'function') {
      window.__tcfapi('ping', 2, function(data, success) {
        console.log("- Ping auto-test:", success ? "Éxito ✓" : "Fallo ✗");
        console.log("- Ping respuesta:", JSON.stringify(data));
      });
    }
  }, 5000); // Verificar cada 5 segundos
})();
    `;
    
    // Definir variable con código de rastreo mejorado
    const enhancedTrackingCode = `
// Rastreo mejorado de interacciones
// Solución para la función trackEnhancedInteraction
function trackEnhancedInteraction(action, decisions) {
  try {
    // Función de ayuda para obtener ID de usuario incluso si getUserId no está definido
    function getEffectiveUserId() {
      // Intenta usar el método getUserId si existe
      if (window.CMP && typeof window.CMP.getUserId === 'function') {
        return window.CMP.getUserId();
      }
      
      // Usa userId global si está disponible
      if (typeof userId !== 'undefined') {
        return userId;
      }
      
      // Busca en cookies o localStorage
      try {
        const fromStorage = localStorage.getItem('cmp_user_id');
        if (fromStorage) {
          return fromStorage;
        }
        
        // Buscar en cookies
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.indexOf('cmp_user_id=') === 0) {
            return cookie.substring('cmp_user_id='.length);
          }
        }
      } catch (e) {
        console.log("Error accessing storage", e);
      }
      
      // Crear uno nuevo si no se encuentra
      return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }
    
    // Función de ayuda para obtener ID de sesión incluso si getSessionId no está definido
    function getEffectiveSessionId() {
      // Intenta usar el método getSessionId si existe
      if (window.CMP && typeof window.CMP.getSessionId === 'function') {
        return window.CMP.getSessionId();
      }
      
      // Crear o recuperar ID de sesión propio
      if (!window._cmpSessionId) {
        window._cmpSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      }
      return window._cmpSessionId;
    }
    
    // Recopilar contexto de sesión
    var sessionContextData = {
      entryPage: document.referrer || window.location.href,
      referrer: document.referrer,
      pagesViewedBefore: sessionStorage.getItem('cmp_pages_viewed') || 0,
      timeOnSiteBefore: (Date.now() - (window.performance.timing?.navigationStart || Date.now()))/1000,
      deviceContext: {
        screenSize: window.innerWidth + 'x' + window.innerHeight,
        orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown',
        connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
      }
    };
    
    // Recopilar datos de la jornada del usuario
    var userJourneyData = {
      durationMs: window._cmpTimers ? Date.now() - window._cmpTimers.lastAction : 0
    };
    
    // Actualizar timer
    if (!window._cmpTimers) window._cmpTimers = {};
    window._cmpTimers.lastAction = Date.now();
    
    // Actualizar historial de acciones
    if (!window._cmpActionHistory) window._cmpActionHistory = [];
    window._cmpActionHistory.push({
      action: action,
      timestamp: new Date().toISOString()
    });
    
    // Solo mantener las últimas 10 acciones
    if (window._cmpActionHistory.length > 10) {
      window._cmpActionHistory.shift();
    }
    
    // Recopilar métricas UX
    var uxMetricsData = {
      scrollSpeed: window._cmpScrollSpeed || 0,
      hoverTimes: window._cmpHoverTimes || [],
      indecisionScore: window._cmpIndecisionScore || 0,
      readingTime: window._cmpReadingTime || 0
    };
    
    // Recopilar datos A/B si existen
    var abTestData = window._cmpAbTestData || {
      variantId: config.variantId || 'default',
      controlGroup: config.controlGroup || false, 
      bannerVersion: config.version || '1.0',
      textVariation: config.textVariation || 'default'
    };
    
    // Preparar hash de texto de consentimiento para auditoría legal
    var consentTextHash = '';
    try {
      var consentText = document.querySelector('.cmp-policy-text')?.innerText || '';
      if (consentText) {
        // Hash simple (en producción usar algo más seguro)
        consentTextHash = consentText.split('').reduce((hash, char) => {
          return ((hash << 5) - hash) + char.charCodeAt(0);
        }, 0).toString(36);
      }
    } catch (e) {
      console.error("Error hashing consent text:", e);
    }
    
    // Recopilar textos mostrados
    var displayedTexts = [];
    try {
      document.querySelectorAll('.cmp-policy-section').forEach(section => {
        displayedTexts.push({
          section: section.getAttribute('data-section-name') || 'unknown',
          content: section.innerText,
          language: document.documentElement.lang || 'en'
        });
      });
    } catch (e) {
      console.error("Error capturing displayed texts:", e);
    }

    await analyticsService.updateDemographicData(domainId, {
    country: {
      code: metadata.country || req.headers['cf-ipcountry'] || 'ES',
      name: this._getCountryName(metadata.country || req.headers['cf-ipcountry'] || 'ES')
    },
    region: metadata.region || '',
    device: {
      type: osInfo.type || 'desktop'
    },
    browser: browserInfo,
    platform: osInfo.os || 'unknown'
  });
    
    // Enviar todos los datos al servidor
    var apiUrl = baseUrl + "/api/v1/consent/domain/" + config.domainId;
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: getEffectiveUserId(),
        sessionId: getEffectiveSessionId(),
        action: action,
        timeToDecision: userJourneyData.durationMs,
        decisions: decisions,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenSize: window.innerWidth + 'x' + window.innerHeight
        },
        pageContext: window.location.href,
        previousActions: window._cmpActionHistory.map(a => a.action),
        userJourneyData: userJourneyData,
        sessionContextData: sessionContextData,
        uxMetricsData: uxMetricsData,
        abTestData: abTestData,
        consentVersion: config.version || '1.0',
        consentTextHash: consentTextHash,
        displayedTexts: displayedTexts
      })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) { console.log("Enhanced tracking data sent successfully"); })
    .catch(function(error) { console.error("Error in enhanced tracking:", error); });
  } catch (e) {
    console.error("Error in trackEnhancedInteraction:", e);
  }
}

// Rastreo de UX
function setupUXTracking() {
  // Inicializar variables
  window._cmpScrollDistance = 0;
  window._cmpScrollTime = 0;
  window._cmpScrollSpeed = 0;
  window._cmpHoverTimes = [];
  window._cmpIndecisionScore = 0;
  window._cmpReadingTime = 0;
  window._cmpLastMouseMove = 0;
  window._cmpHoverTarget = null;
  window._cmpHoverStartTime = 0;
  
  // Rastrear scroll
  document.addEventListener('scroll', function(e) {
    if (!window._cmpScrollStartPos) {
      window._cmpScrollStartPos = window.scrollY;
      window._cmpScrollStartTime = Date.now();
    } else {
      window._cmpScrollDistance = Math.abs(window.scrollY - window._cmpScrollStartPos);
      window._cmpScrollTime = Date.now() - window._cmpScrollStartTime;
      window._cmpScrollSpeed = window._cmpScrollDistance / (window._cmpScrollTime / 1000);
    }
  }, { passive: true });
  
  // Rastrear hover
  document.addEventListener('mousemove', function(e) {
    window._cmpLastMouseMove = Date.now();
    
    // Si pasó a un nuevo elemento interactivo
    var target = e.target.closest('button, a, [role="button"], [data-cmp-action]');
    if (target && target !== window._cmpHoverTarget) {
      // Terminar hover anterior si existía
      if (window._cmpHoverTarget && window._cmpHoverStartTime) {
        var hoverTime = Date.now() - window._cmpHoverStartTime;
        if (hoverTime > 100) { // Ignorar hovers muy cortos
          window._cmpHoverTimes.push({
            element: window._cmpHoverTarget.textContent || window._cmpHoverTarget.id || 'unknown',
            durationMs: hoverTime
          });
        }
      }
      
      // Iniciar nuevo hover
      window._cmpHoverTarget = target;
      window._cmpHoverStartTime = Date.now();
    }
  }, { passive: true });
  
  // Rastrear indecisión (cambios entre botones)
  document.addEventListener('click', function(e) {
    var target = e.target.closest('button, a, [role="button"], [data-cmp-action]');
    if (target) {
      window._cmpIndecisionScore = window._cmpHoverTimes.length;
    }
  }, { passive: true });
  
  // Rastrear tiempo de lectura
  setInterval(function() {
    if (document.querySelector('#cmp-preferences:not([style*="display: none"])')) {
      if (Date.now() - window._cmpLastMouseMove < 3000) {
        window._cmpReadingTime += 0.5; // Incrementar en medio segundo
      }
    }
  }, 500);
}

// Reemplazar las funciones existentes de consentimiento
var originalAcceptAll = acceptAll;
acceptAll = function() {
  var result = originalAcceptAll.apply(this, arguments);
  trackEnhancedInteraction('accept_all', consentState.purposes);
  return result;
};

var originalRejectAll = rejectAll;
rejectAll = function() {
  var result = originalRejectAll.apply(this, arguments);
  trackEnhancedInteraction('reject_all', consentState.purposes);
  return result;
};

var originalSavePreferences = savePreferences;
savePreferences = function() {
  var result = originalSavePreferences.apply(this, arguments);
  trackEnhancedInteraction('save_preferences', consentState.purposes);
  return result;
};

var originalShowPreferences = showPreferences;
showPreferences = function() {
  var result = originalShowPreferences.apply(this, arguments);
  trackEnhancedInteraction('show_preferences', null);
  return result;
};

// Generar ID de sesión
CMP.getSessionId = function() {
  if (!window._cmpSessionId) {
    window._cmpSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }
  return window._cmpSessionId;
};
`;

    // Luego agregar esta línea para insertar el código en el script
    script = script.replace('})();', enhancedTrackingCode + '\n})();');
    
    console.log("🔍 DEBUG: Script generado, longitud:", script.length);
    
    // Minificar si se solicita
    if (minify) {
      console.log("🔍 DEBUG: Minificando script...");
      script = this._minifyScript(script);
      console.log("✅ DEBUG: Script minificado, longitud:", script.length);
    }
    
    console.log("✅ DEBUG: Script generado exitosamente");
    return script;
    
  } catch (error) {
    console.error('❌ DEBUG: Error generating embeddable script:', error);
    throw error;
  }
}

  


  /**
   * Corrige todas las URLs de imágenes en el HTML generado
   */
  _fixImageUrls(html, baseUrl) {
    if (!html || typeof html !== 'string') return html;
    
    logger.debug(`Using baseUrl for image URLs: ${baseUrl}`);
    
    try {
      // Corregir los img src directos
      let fixedHtml = html.replace(/<img\s+([^>]*?)src=["'](\/(templates|images|assets)[^"']+)["']([^>]*?)>/gi, function(match, before, url, folder, after) {
        const fullUrl = baseUrl + url;
        logger.debug(`Found image URL in src: ${url}, replacing with: ${fullUrl}`);
        return `<img ${before}src="${fullUrl}"${after}>`;
      });
      
      // Reemplazar URLs relativas en style="background-image: url(..."
      fixedHtml = fixedHtml.replace(/background-image:\s*url\(['"]?(\/(templates|images|assets)[^'")]+)['"]?\)/gi, function(match, url) {
        const fullUrl = baseUrl + url;
        logger.debug(`Found image URL in background-image: ${url}, replacing with: ${fullUrl}`);
        return `background-image: url('${fullUrl}')`;
      });
      
      // Buscar URLs que no comienzan con / pero tampoco con http/https/data
      fixedHtml = fixedHtml.replace(/<img\s+([^>]*?)src=["']((?!\/|https?:|data:)[^"']+)["']([^>]*?)>/gi, function(match, before, url, after) {
        if (!url.startsWith('/') && !url.startsWith('http') && !url.startsWith('data:')) {
          const fullUrl = baseUrl + '/' + url;
          logger.debug(`Found relative image URL: ${url}, replacing with: ${fullUrl}`);
          return `<img ${before}src="${fullUrl}"${after}>`;
        }
        return match;
      });
      
      return fixedHtml;
    } catch (error) {
      logger.error('Error fixing image URLs:', error);
      return html; // Devolver el original en caso de error
    }
  }

  /**
   * Procesa la plantilla para exportación, convirtiendo URLs relativas a absolutas
   */
  async processTemplateForExport(template) {
    // Crear copia para no modificar el original
    const exportTemplate = JSON.parse(JSON.stringify(template));
    
    // Convertir todas las URLs relativas a absolutas
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Función recursiva para procesar componentes
    const processComponents = (components) => {
      if (!components || !Array.isArray(components)) return components;
      
      return components.map(comp => {
        if (!comp) return comp;
        
        // Convertir rutas relativas a absolutas para imágenes
        if ((comp.type === 'image' || comp.type === 'logo') && typeof comp.content === 'string') {
          const originalContent = comp.content;
          
          // Si empieza con /, añadir baseUrl
          if (comp.content.startsWith('/')) {
            comp.content = `${baseUrl}${comp.content}`;
            logger.debug(`Processed image URL from: ${originalContent} to: ${comp.content}`);
          } 
          // Si no empieza con http/https/data, tratar como ruta relativa
          else if (!comp.content.startsWith('http://') && 
                   !comp.content.startsWith('https://') && 
                   !comp.content.startsWith('data:')) {
            comp.content = `${baseUrl}/${comp.content}`;
            logger.debug(`Processed image URL from: ${originalContent} to: ${comp.content}`);
          }
        }
        
        // Procesar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          comp.children = processComponents(comp.children);
        }
        
        return comp;
      });
    };
    
    if (exportTemplate.components) {
      exportTemplate.components = processComponents(exportTemplate.components);
    }
    
    return exportTemplate;
  }

  /**
   * Genera código para Google Consent Mode
   * @returns {String} - Código JavaScript para Google Consent Mode
   */
  /**
 * Genera código para Google Consent Mode
 * @returns {String} - Código JavaScript para Google Consent Mode
 */
generateGoogleConsentMode() {
  return `
  // Google Consent Mode Setup
  function updateGoogleConsent(consentState) {
    if (window.gtag) {
      var consentModeParams = {
        'ad_storage': consentState.marketing ? 'granted' : 'denied',
        'analytics_storage': consentState.analytics ? 'granted' : 'denied',
        'personalization_storage': consentState.personalization ? 'granted' : 'denied',
        'functionality_storage': 'granted', // Cookies funcionales
        'security_storage': 'granted'       // Cookies de seguridad
      };
      
      gtag('consent', 'update', consentModeParams);
    }
  }
  
  // Default state - rechazado
  if (window.dataLayer) {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'personalization_storage': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted',
      'wait_for_update': 500
    });
  }
  `;
}

  /**
   * Genera el código del script embebible completamente funcional
   */
  /**
 * Genera el código del script embebible completamente funcional
 */
/**
 * Genera el código del script embebible completamente funcional
 */
_createScriptCode(template, html, css, preferencesPanel, options) {
  const {
    baseUrl,
    cookieExpiry = 365,
    forceGDPR = false,
    includeGoogleConsentMode = true
  } = options;
  
  // Extraer los componentes para incluirlos directamente en el script
  const components = JSON.stringify(template.components || []);
  
  // Obtener tipo y posición del banner
  const layoutType = template.layout?.desktop?.type || 'banner';
  const layoutPosition = template.layout?.desktop?.position || 'bottom';
  
  // Configuración específica para diferentes tipos de banner
  let typeSpecificCSS = '';
  
switch(layoutType) {
  case 'modal':
    typeSpecificCSS = `
      .cmp-banner {
        position: fixed !important;
        z-index: 100000 !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        max-width: 90% !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        border-radius: 6px !important;
      }
      .cmp-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999;
      }
    `;
    break;
    
  case 'floating':
    // Determinar posición para floating
    let positionCSS = '';
    if (layoutPosition === 'bottom-right' || layoutPosition === 'bottom') {
      positionCSS = 'bottom: 20px; right: 20px;';
    } else if (layoutPosition === 'bottom-left') {
      positionCSS = 'bottom: 20px; left: 20px;';
    } else if (layoutPosition === 'top-right' || layoutPosition === 'top') {
      positionCSS = 'top: 20px; right: 20px;';
    } else if (layoutPosition === 'top-left') {
      positionCSS = 'top: 20px; left: 20px;';
    } else {
      positionCSS = 'bottom: 20px; right: 20px;'; // Valor por defecto
    }
    
    typeSpecificCSS = `
      .cmp-banner {
        position: fixed !important;
        z-index: 100000 !important;
        ${positionCSS}
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        border-radius: 6px !important;
      }
    `;
    break;
    
  default: // banner normal
    // Determinar posición para banner tipo normal
    let bannerPositionCSS = '';
    if (layoutPosition === 'top') {
      bannerPositionCSS = 'top: 0; left: 0; right: 0;';
    } else if (layoutPosition === 'bottom') {
      bannerPositionCSS = 'bottom: 0; left: 0; right: 0;';
    } else if (layoutPosition === 'center') {
      bannerPositionCSS = 'top: 50%; left: 0; right: 0; transform: translateY(-50%);';
    } else {
      bannerPositionCSS = 'bottom: 0; left: 0; right: 0;'; // Valor por defecto
    }
    
    typeSpecificCSS = `
      .cmp-banner {
        position: fixed !important;
        z-index: 100000 !important;
        ${bannerPositionCSS}
        width: 100% !important;
      }
    `;
    break;
}
  
  // Configuración de comportamiento
  const hasBehavior = template.settings?.behaviour || template.settings?.behavior;
  const autoHideEnabled = hasBehavior?.autoHide?.enabled || false;
  const autoHideDelay = hasBehavior?.autoHide?.delay || 0;
  const reshowEnabled = hasBehavior?.reshow?.enabled || false;
  const reshowInterval = hasBehavior?.reshow?.interval || 0;
  const useOverlay = layoutType === 'modal';
  
  // Generar ID único basado en template ID o timestamp
  const bannerId = template._id ? `banner-${template._id}` : `banner-${Date.now()}`;
  
  // Obtener código para Google Consent Mode si está habilitado
  const googleConsentModeCode = includeGoogleConsentMode ? this.generateGoogleConsentMode() : '';
  
  // IMPORTANTE: Limpiar el HTML y CSS para evitar problemas de escape
  const safeHtml = html.replace(/`/g, '\\`').replace(/\${/g, '\\${');
  const safeCss = css.replace(/`/g, '\\`').replace(/\${/g, '\\${');
  const safePreferencesPanel = preferencesPanel.replace(/`/g, '\\`').replace(/\${/g, '\\${');

  return `
(function() {
  // Banner ID único para evitar conflictos
  var bannerId = "${bannerId}";
  
  // Componentes para recreación
  var components = ${components};
  
  // URL base para imágenes
  var baseUrl = "${baseUrl}";
  
  // Configuración
  var config = {
    animation: {
      type: "${template.settings?.animation?.type || 'fade'}",
      duration: ${template.settings?.animation?.duration || 300}
    },
    autoHide: ${autoHideEnabled},
    autoHideDelay: ${autoHideDelay},
    reshow: ${reshowEnabled},
    reshowInterval: ${reshowInterval},
    useOverlay: ${useOverlay},
    forceGDPR: ${forceGDPR},
    cookieExpiry: ${cookieExpiry},
    googleConsentMode: ${includeGoogleConsentMode},
    domainId: "${template.domainId || ''}"
  };
  
  // Initialize and ensure userId persistence across devices and browsers
  function initializeUserId() {
    const storageKey = 'cmp_user_id';
    let userId;
    
    // Try localStorage first
    try {
      userId = localStorage.getItem(storageKey);
      if (userId) {
        console.log("✅ [CMP] UserId found in localStorage:", userId);
        return userId;
      }
    } catch (e) {
      console.log("⚠️ [CMP] localStorage not available:", e);
    }
    
    // Try cookies next
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(storageKey + '=') === 0) {
        userId = cookie.substring(storageKey.length + 1);
        console.log("✅ [CMP] UserId found in cookies:", userId);
        return userId;
      }
    }
    
    // Generate new ID if not found
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    console.log("✅ [CMP] New userId generated:", userId);
    
    // Store in both localStorage and cookies for redundancy
    try {
      localStorage.setItem(storageKey, userId);
    } catch (e) {
      console.log("⚠️ [CMP] Could not save to localStorage:", e);
    }
    
    // Set cookie with 1-year expiry
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    document.cookie = storageKey + '=' + userId + '; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
    
    return userId;
  }
  
  // Initialize userId immediately
  var userId = initializeUserId();
  console.log("🔑 [CMP] User ID initialized:", userId);
  
  // Estado de consentimiento (inicialmente vacío)
  var consentState = {
    purposes: {},
    vendors: {},
    specialFeatures: {},
    created: null,
    lastUpdated: null
  };
  
  // Utilidades para cookies
  var cookieUtils = {
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
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
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
  
  // ---- Compatibilidad con navegadores antiguos ----
  function setupCompatibility() {
    // Polyfill para Element.matches
    if (!Element.prototype.matches) {
      Element.prototype.matches = 
        Element.prototype.msMatchesSelector || 
        Element.prototype.webkitMatchesSelector;
    }
    
    // Polyfill para Element.closest
    if (!Element.prototype.closest) {
      Element.prototype.closest = function(s) {
        var el = this;
        do {
          if (el.matches(s)) return el;
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
      };
    }
    
    // Polyfill para Array.forEach
    if (window.NodeList && !NodeList.prototype.forEach) {
      NodeList.prototype.forEach = Array.prototype.forEach;
    }
  }
  
  // Detectar si se aplica GDPR
  function detectGDPR() {
    return new Promise(function(resolve) {
      // Si hemos forzado GDPR en la configuración, devolver true
      if (config.forceGDPR) {
        console.log("GDPR aplicado por configuración");
        return resolve(true);
      }
      
      // Comprobar en CloudFlare o encabezados si es posible
      if (navigator.globalPrivacyControl) {
        console.log("GPC detectado, aplicando GDPR");
        return resolve(true);
      }
      
      try {
        // Intentar detectar por timezone
        var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var europeanTimezones = [
          'Europe/', // Cualquier timezone de Europa
          'Atlantic/Canary', 'Atlantic/Faroe', 'Atlantic/Madeira'
        ];
        
        var isEuropeanTimezone = europeanTimezones.some(function(tz) {
          return timezone.indexOf(tz) === 0;
        });
        
        if (isEuropeanTimezone) {
          console.log("Timezone europeo detectado, aplicando GDPR");
          return resolve(true);
        }
        
        // Navegador con preferencias de idioma
        var languages = navigator.languages || [navigator.language || navigator.userLanguage].filter(Boolean);
        var europeanLangs = ['fr', 'de', 'es', 'it', 'pt', 'nl', 'el', 'bg', 'hr', 'cs', 'da', 'et', 'fi', 'hu', 'ga', 'lv', 'lt', 'mt', 'pl', 'ro', 'sk', 'sl', 'sv'];
        
        var hasEuropeanLang = languages.some(function(lang) {
          var langCode = lang.split('-')[0].toLowerCase();
          return europeanLangs.indexOf(langCode) !== -1;
        });
        
        if (hasEuropeanLang) {
          console.log("Idioma europeo detectado, aplicando GDPR");
          return resolve(true);
        }
        
        // Si no podemos determinar, por defecto aplicamos GDPR por seguridad
        console.log("No se pudo determinar región, aplicando GDPR por defecto");
        return resolve(true);
      } catch (error) {
        console.error("Error en detección de GDPR:", error);
        // En caso de error, aplicar GDPR por seguridad
        return resolve(true);
      }
    });
  }
  
  // ---- Utilidades ----
  function getDeviceType() {
    var width = window.innerWidth;
    if (width <= 480) return 'mobile';
    if (width <= 768) return 'tablet';
    return 'desktop';
  }
  
  // Aplicar estilos a un elemento
  function applyStyles(element, styles) {
    if (!element || !styles) return;
    Object.keys(styles).forEach(function(property) {
      if (styles[property] !== undefined && styles[property] !== null) {
        element.style[property] = styles[property];
      }
    });
  }
  
  // --- FUNCIÓN MOSTRAR BANNER - MEJORADA CON LOGS Y DEPURACIÓN ---
  function showBanner() {
    try {
      console.log("🔄 Iniciando función showBanner...");
      
      if (document.getElementById('cmp-banner')) {
        // El banner ya existe, solo hay que mostrarlo
        var banner = document.getElementById('cmp-banner');
        
        // Forzar visualización con !important
        banner.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; pointer-events: auto !important;';
        banner.classList.add('cmp-banner--visible');
        
        // Evento de consola para depuración
        console.log("✅ Banner existente encontrado y mostrado");
        
        return;
      }
      
      console.log("🔄 Banner no encontrado en el DOM, creando uno nuevo...");
      
      // Inyectar estilos
      injectStyles();
      
      // Crear el banner en el DOM
      createBanner();
      
      // Configurar listeners de eventos
      setupEventListeners();
      
      // Forzar visualización después de crearlo
      setTimeout(function() {
        var newBanner = document.getElementById('cmp-banner');
        if (newBanner) {
          newBanner.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; pointer-events: auto !important;';
          console.log("✅ Banner creado y forzado a mostrarse");
        } else {
          console.error("❌ No se pudo encontrar el banner después de crearlo");
        }
      }, 100);
      
      // Si hay autoHide configurado
      if (config.autoHide && config.autoHideDelay > 0) {
        setTimeout(function() {
          hideBanner();
        }, config.autoHideDelay * 1000);
      }
    } catch (error) {
      console.error("❌ Error en showBanner:", error);
      // Intentar crear un banner de emergencia en caso de error
      createEmergencyBanner();
    }
  }
  
  // --- FUNCIÓN DE EMERGENCIA ---
  function createEmergencyBanner() {
    try {
      console.log("🚨 Creando banner de emergencia...");
      
      // Crear un banner básico de emergencia
      var emergencyBanner = document.createElement('div');
      emergencyBanner.id = 'cmp-banner';
      emergencyBanner.className = 'cmp-banner';
      emergencyBanner.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 15px; z-index: 99999; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;';
      
      emergencyBanner.innerHTML = \`
        <div>
          <p style="margin:0">Este sitio utiliza cookies para mejorar su experiencia.</p>
        </div>
        <div style="display:flex;gap:10px">
          <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
          <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
        </div>
      \`;
      
      document.body.appendChild(emergencyBanner);
      
      // Configurar listeners
      var buttons = emergencyBanner.querySelectorAll('button');
      buttons.forEach(function(button) {
        button.addEventListener('click', function() {
          var action = this.getAttribute('data-cmp-action');
          if (action === 'accept_all') {
            acceptAll();
          } else if (action === 'reject_all') {
            rejectAll();
          }
          hideBanner();
        });
      });
      
      console.log("✅ Banner de emergencia creado y configurado");
    } catch (emergencyError) {
      console.error("❌ Error crítico al crear banner de emergencia:", emergencyError);
    }
  }
  
  // Ocultar el banner
  function hideBanner() {
    var banner = document.getElementById('cmp-banner');
    var overlay = document.getElementById(bannerId + "-overlay");
    
    if (banner) {
      // Añadir clase para animación de salida
      banner.classList.add('cmp-banner--hiding');
      banner.classList.remove('cmp-banner--visible');
      
      if (overlay) {
        overlay.style.opacity = "0";
      }
      
      // Esperar a que termine la animación
      setTimeout(function() {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
        
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, config.animation.duration);
    }
  }
  
  // --- FUNCIÓN PARA INYECTAR ESTILOS - MEJORADA ---
  function injectStyles() {
    try {
      console.log("🔄 Inyectando estilos CSS...");
      
      // Estilos del banner
      var styleEl = document.createElement('style');
      styleEl.id = bannerId + "-styles";
      
      // Usar CSS del template o alternativo
      var cssContent = \`${safeCss}\`;
      
      if (!cssContent || cssContent.trim() === '') {
        console.error("❌ CSS vacío o inválido");
        // Usar CSS alternativo
        styleEl.textContent = ".cmp-banner { position: fixed; bottom: 0; left: 0; right: 0; background: white; z-index: 99999; padding: 15px; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); }";
      } else {
        styleEl.textContent = cssContent;
      }
      
      document.head.appendChild(styleEl);
      console.log("✅ Estilos básicos del banner inyectados");
      
      // Estilos específicos para el tipo de banner
      var typeStyleEl = document.createElement('style');
      typeStyleEl.id = bannerId + "-type-styles";
      
      if (!typeSpecificCSS || typeof typeSpecificCSS !== 'string' || typeSpecificCSS.trim() === '') {
        console.error("❌ CSS específico de tipo vacío o inválido");
        // Usar CSS alternativo
        typeStyleEl.textContent = ".cmp-banner { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 99999 !important; }";
      } else {
        typeStyleEl.textContent = typeSpecificCSS;
      }
      
      document.head.appendChild(typeStyleEl);
      console.log("✅ Estilos específicos del tipo de banner inyectados");
      
      // Estilos para animaciones
      var animStyleEl = document.createElement('style');
      animStyleEl.id = bannerId + "-animation-styles";
      
      try {
        animStyleEl.textContent = generateAnimationCSS();
      } catch (animError) {
        console.error("❌ Error generando CSS de animación:", animError);
        // Usar CSS alternativo para animaciones
        animStyleEl.textContent = ".cmp-banner--visible { display: block !important; opacity: 1; } .cmp-banner--hiding { opacity: 0; transition: opacity 300ms ease-in; }";
      }
      
      document.head.appendChild(animStyleEl);
      console.log("✅ Estilos de animación inyectados");
      
    } catch (error) {
      console.error("❌ Error al inyectar estilos:", error);
      
      // Intentar inyectar estilos mínimos en caso de error
      try {
        var emergencyStyles = document.createElement('style');
        emergencyStyles.textContent = \`
          .cmp-banner { 
            position: fixed !important; 
            bottom: 0 !important; 
            left: 0 !important; 
            right: 0 !important; 
            background: white !important; 
            z-index: 99999 !important; 
            padding: 15px !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .cmp-banner--visible { 
            display: block !important; 
            opacity: 1 !important; 
          }
        \`;
        document.head.appendChild(emergencyStyles);
        console.log("✅ Estilos de emergencia inyectados con éxito");
      } catch (emergencyError) {
        console.error("❌ Error crítico al inyectar estilos de emergencia:", emergencyError);
      }
    }
  }
  
  // --- FUNCIÓN PARA CREAR EL BANNER - MEJORADA CON LOGS Y MANEJO DE ERRORES ---
  function createBanner() {
    try {
      console.log("🔄 Iniciando creación del banner...");
      console.log("HTML del banner disponible:", Boolean(\`${safeHtml}\`.length > 0));
      
      // Para modales, crear primero el overlay
      if (config.useOverlay) {
        var overlayEl = document.createElement('div');
        overlayEl.id = bannerId + "-overlay";
        overlayEl.className = "cmp-modal-overlay";
        document.body.appendChild(overlayEl);
        
        console.log("✅ Overlay creado con ID:", bannerId + "-overlay");
        
        // Transición de entrada para el overlay
        setTimeout(function() {
          overlayEl.style.opacity = "0";
          setTimeout(function() {
            overlayEl.style.transition = "opacity " + (config.animation.duration * 0.8) + "ms ease-out";
            overlayEl.style.opacity = "1";
          }, 50);
        }, 0);
      }
      
      // Crear el contenedor del banner
      var bannerEl = document.createElement('div');
      bannerEl.id = bannerId + "-container";
      
      console.log("✅ Contenedor del banner creado con ID:", bannerId + "-container");
      
      // Obtener HTML del template o usar uno básico
      var htmlContent = \`${safeHtml}\`;
      
      if (!htmlContent || htmlContent.trim() === '') {
        console.error("❌ HTML del banner vacío o inválido, usando HTML por defecto");
        htmlContent = \`
          <div id="cmp-banner" class="cmp-banner" role="dialog">
            <div style="flex:1">
              <p style="margin:0">Este sitio utiliza cookies para mejorar tu experiencia.</p>
            </div>
            <div style="display:flex;gap:10px">
              <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
              <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
            </div>
          </div>
        \`;
      }
      
      console.log("🔄 Insertando HTML del banner (primeros 100 chars):", htmlContent.substring(0, 100) + "...");
      
      // Insertar el HTML base
      bannerEl.innerHTML = htmlContent;
      document.body.appendChild(bannerEl);
      
      // Verificar el banner creado
      var createdBanner = document.querySelector('#cmp-banner');
      if (!createdBanner) {
        console.error("❌ No se encontró el elemento #cmp-banner después de insertar el HTML. Contenido del bannerEl:", bannerEl.innerHTML.substring(0, 200) + "...");
        throw new Error("No se pudo encontrar #cmp-banner después de la inserción");
      }
      
      console.log("✅ Banner insertado correctamente en el DOM");
      
      // Actualizar cada componente individualmente
      console.log("🔄 Configurando posicionamiento de componentes...");
      setupComponentPositioning();
      
      // Crear panel de preferencias si no existe
      if (!document.getElementById('cmp-preferences')) {
        console.log("🔄 Creando panel de preferencias...");
        
        var preferencesContent = \`${safePreferencesPanel}\`;
        
        if (!preferencesContent || preferencesContent.trim() === '') {
          console.error("❌ Panel de preferencias vacío o inválido");
        } else {
          var preferencesEl = document.createElement('div');
          preferencesEl.innerHTML = preferencesContent;
          document.body.appendChild(preferencesEl);
          console.log("✅ Panel de preferencias creado e insertado");
        }
      }
      
      // Añadir la clase para hacerlo visible después de un delay
      setTimeout(function() {
        var banner = document.querySelector('#cmp-banner');
        if (banner) {
          banner.classList.add('cmp-banner--visible');
          console.log("✅ Clase cmp-banner--visible añadida al banner");
        } else {
          console.error("❌ No se pudo encontrar #cmp-banner para añadir clase visible");
        }
      }, 50);
      
    } catch (error) {
      console.error("❌ Error al crear el banner:", error);
      
      // Crear un banner de emergencia en caso de error
      createEmergencyBanner();
    }
  }
  
  // Configurar posicionamiento de componentes
  function setupComponentPositioning() {
    try {
      console.log("🔄 Configurando posicionamiento de componentes...");
      
      var banner = document.querySelector('#cmp-banner');
      if (!banner) {
        console.error("❌ No se encontró el banner para posicionar componentes");
        return;
      }
      
      // Asegurar que el banner tiene posición relativa para posicionamiento absoluto de componentes
      banner.style.position = "relative";
      
      // Obtener el dispositivo actual
      var currentDevice = getDeviceType();
      console.log("📱 Dispositivo actual:", currentDevice);
      
      // Procesar cada componente individualmente
      var componentsCount = 0;
      components.forEach(function(comp) {
        var compEl = document.querySelector('[data-component-id="' + comp.id + '"]');
        if (!compEl) {
          console.warn("⚠️ No se encontró el componente con ID:", comp.id);
          return;
        }
        
        componentsCount++;
        
        // Establecer posición absoluta para cada componente
        compEl.style.position = "absolute";
        
        // Aplicar posición específica del dispositivo
        var devicePosition = getDeviceSpecificPosition(comp, currentDevice);
        if (devicePosition) {
          if (devicePosition.top) compEl.style.top = devicePosition.top;
          if (devicePosition.left) compEl.style.left = devicePosition.left;
          if (devicePosition.right) compEl.style.right = devicePosition.right;
          if (devicePosition.bottom) compEl.style.bottom = devicePosition.bottom;
        }
        
        // Aplicar estilos específicos del dispositivo
        var deviceStyles = getDeviceSpecificStyles(comp, currentDevice);
        applyStyles(compEl, deviceStyles);
        
        // Verificación especial para imágenes
        if (comp.type === 'image' || comp.type === 'logo') {
          var img = compEl.querySelector('img');
          if (img) {
            // Estilos para la imagen
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.display = "block";
            
            // Verificar si debe estar centrado
            var shouldCenter = comp.centered || 
                              (deviceStyles && deviceStyles.textAlign === 'center');
            
            if (shouldCenter && compEl.parentNode) {
              compEl.classList.add('cmp-logo-centered');
            }
            
            // Manejar eventos de carga
            img.onload = function() {
              compEl.classList.add('cmp-image-loaded');
            };
            
            // Manejar errores de carga
            img.onerror = function() {
              console.warn('⚠️ Error cargando imagen:', img.src);
              // Agregar clase para mostrar un estado de error
              compEl.classList.add('cmp-image-error');
            };
          }
        }
      });
      
      console.log("✅ Posicionamiento completado para", componentsCount, "componentes");
    } catch (error) {
      console.error("❌ Error en setupComponentPositioning:", error);
    }
  }
  
  // Obtener posición específica para el dispositivo con fallbacks
  function getDeviceSpecificPosition(component, deviceType) {
    if (!component.position) return { top: '0px', left: '0px' };
    
    // Aplicar fallbacks - si no hay configuración específica, usar el inmediato superior
    let positionObj;
    if (deviceType === 'mobile') {
      positionObj = component.position.mobile || component.position.tablet || component.position.desktop || { top: '0px', left: '0px' };
    } else if (deviceType === 'tablet') {
      positionObj = component.position.tablet || component.position.desktop || { top: '0px', left: '0px' };
    } else {
      positionObj = component.position.desktop || { top: '0px', left: '0px' };
    }
    
    // Asegurar que se devuelven todas las propiedades de posición
    return {
      top: positionObj.top,
      left: positionObj.left,
      right: positionObj.right,
      bottom: positionObj.bottom
    };
  }
  
  // Obtener estilos específicos para el dispositivo
  function getDeviceSpecificStyles(component, deviceType) {
    if (!component.style) return {};
    
    // Aplicar fallbacks - si no hay configuración específica, usar el inmediato superior
    if (deviceType === 'mobile') {
      return component.style.mobile || component.style.tablet || component.style.desktop || {};
    } else if (deviceType === 'tablet') {
      return component.style.tablet || component.style.desktop || {};
    }
    
    return component.style.desktop || {};
  }
  
  // Generar CSS para animaciones
  function generateAnimationCSS() {
    try {
      var animationType = config.animation.type;
      var duration = config.animation.duration;
      var css = '';
      
      if (animationType === 'fade') {
        css = \`
          @keyframes cmpFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes cmpFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          
          .cmp-banner--visible {
            animation: cmpFadeIn \${duration}ms ease-out forwards;
            display: block !important;
          }
          
          .cmp-banner--hiding {
            animation: cmpFadeOut \${duration}ms ease-in forwards;
          }
        \`;
      } else if (animationType === 'slide') {
        css = \`
          @keyframes cmpSlideInTop {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes cmpSlideOutTop {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
          }
          
          @keyframes cmpSlideInBottom {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes cmpSlideOutBottom {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
          }
          
          .cmp-banner--visible[data-position="top"] {
            animation: cmpSlideInTop \${duration}ms ease-out forwards;
            display: block !important;
          }
          
          .cmp-banner--hiding[data-position="top"] {
            animation: cmpSlideOutTop \${duration}ms ease-in forwards;
          }
          
          .cmp-banner--visible[data-position="bottom"] {
            animation: cmpSlideInBottom \${duration}ms ease-out forwards;
            display: block !important;
          }
          
          .cmp-banner--hiding[data-position="bottom"] {
            animation: cmpSlideOutBottom \${duration}ms ease-in forwards;
          }
          
          .cmp-banner--visible {
            display: block !important;
          }
        \`;
      } else {
        // Animación por defecto (sin animación pero visible)
        css = \`
          .cmp-banner--visible {
            display: block !important;
            opacity: 1;
          }
          
          .cmp-banner--hiding {
            opacity: 0;
            transition: opacity \${duration}ms ease-in;
          }
        \`;
      }
      
      return css;
    } catch (error) {
      console.error("❌ Error en generateAnimationCSS:", error);
      // Retornar CSS básico en caso de error
      return '.cmp-banner--visible { display: block !important; opacity: 1; } .cmp-banner--hiding { opacity: 0; transition: opacity 300ms ease; }';
    }
  }
  
  // Configurar listeners de eventos
  function setupEventListeners() {
    try {
      console.log("🔄 Configurando listeners de eventos...");
      
      var banner = document.querySelector('#cmp-banner');
      if (!banner) {
        console.error("❌ No se encontró el banner para configurar listeners");
        return;
      }
      
      // Botones con atributo data-cmp-action
      var actionButtons = banner.querySelectorAll('[data-cmp-action]');
      
      if (actionButtons.length === 0) {
        console.warn("⚠️ No se encontraron botones con atributo data-cmp-action, buscando por texto");
        
        // Buscar botones por texto si no tienen el atributo
        var allButtons = banner.querySelectorAll('button, [role="button"], a');
        allButtons.forEach(function(button) {
          var buttonText = button.textContent.toLowerCase().trim();
          if (buttonText.includes('aceptar') || buttonText.includes('accept')) {
            button.setAttribute('data-cmp-action', 'accept_all');
          } else if (buttonText.includes('rechazar') || buttonText.includes('reject')) {
            button.setAttribute('data-cmp-action', 'reject_all');
          } else if (buttonText.includes('preferencias') || buttonText.includes('preferences')) {
            button.setAttribute('data-cmp-action', 'show_preferences');
          }
        });
        
        // Volver a buscar con atributos actualizados
        actionButtons = banner.querySelectorAll('[data-cmp-action]');
        console.log("✅ Encontrados", actionButtons.length, "botones después de buscar por texto");
      } else {
        console.log("✅ Encontrados", actionButtons.length, "botones para configurar");
      }
      
      // Si aún no hay botones, crear botones de emergencia
      if (actionButtons.length === 0) {
        console.warn("⚠️ No se encontraron botones, creando botones de emergencia");
        var emergencyButtons = document.createElement('div');
        emergencyButtons.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
        emergencyButtons.innerHTML = \`
          <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
          <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
        \`;
        banner.appendChild(emergencyButtons);
        
        // Actualizar la lista de botones
        actionButtons = banner.querySelectorAll('[data-cmp-action]');
      }
      
      actionButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          var action = button.getAttribute('data-cmp-action');
          
          console.log("🖱️ Clic en botón con acción:", action);
          
          switch(action) {
            case 'accept_all':
              acceptAll();
              break;
            case 'reject_all':
              rejectAll();
              break;
            case 'show_preferences':
              showPreferences();
              break;
            case 'save_preferences':
              savePreferences();
              break;
            case 'close':
              hideBanner();
              break;
            default:
              console.warn("⚠️ Acción desconocida:", action);
          }
        });
      });
      
      // Responsiveness
      window.addEventListener('resize', function() {
        adaptToScreenSize();
      });
      
      console.log("✅ Listeners de eventos configurados");
    } catch (error) {
      console.error("❌ Error en setupEventListeners:", error);
    }
  }
  
  // Adaptar el banner a pantallas responsivas
  function adaptToScreenSize() {
    try {
      var currentDevice = getDeviceType();
      console.log("📱 Adaptando a tamaño de pantalla:", currentDevice);
      setupComponentPositioning();
    } catch (error) {
      console.error("❌ Error en adaptToScreenSize:", error);
    }
  }
  
  // Formats consent decisions for the backend API
  function formatConsentPayload(decisions, userId, action) {
    // Map cookie categories to TCF purposes
    var categoryToPurposes = {
      'necessary': [1],
      'analytics': [7, 8, 9, 10],
      'marketing': [2, 3, 4],
      'personalization': [5, 6]
    };
    
    // Build format expected by backend
    var formattedPurposes = {};
    var formattedVendors = {};
    
    // Convert from {category: boolean} to {purposeId: boolean}
    Object.keys(decisions).forEach(function(category) {
      if (categoryToPurposes[category]) {
        categoryToPurposes[category].forEach(function(purposeId) {
          formattedPurposes[purposeId] = decisions[category];
        });
      }
    });
    
    // Ensure purpose 1 is always true (necessary)
    formattedPurposes["1"] = true;
    
    return {
      userId: userId,
      decisions: {
        purposes: formattedPurposes,
        vendors: formattedVendors
      },
      bannerInteraction: {
        type: action,
        timeToDecision: 0,
        customizationOpened: action === 'save_preferences'
      },
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language || document.documentElement.lang || 'es',
        deviceType: getDeviceType()
      }
    };
  }

  
  
  // NUEVA FUNCIÓN: Enviar consentimiento al servidor
  
function saveConsentToServer(consent, action) {
  try {
    console.log("🔄 [CMP] Enviando consentimiento al servidor");
    
    // Generar un ID de usuario único si no existe
    var currentUserId = userId;
    
    // Verificar que tenemos ID de dominio
    if (!config.domainId) {
      console.error("❌ [CMP] Error: No se encontró ID de dominio para enviar consentimiento");
      return;
    }
    
    // Construir la URL del endpoint de consentimiento - CORREGIDO
    var apiUrl = baseUrl + "/api/v1/consent/domain/" + config.domainId;
    
    console.log("🔄 [CMP] Usando URL:", apiUrl);
    
    // Preparar los datos para enviar
    var payload = {
      userId: currentUserId,
      decisions: {
        purposes: consent.purposes,
        vendors: {}
      },
      bannerInteraction: {
        type: action,
        timeToDecision: 0,
        customizationOpened: action === 'save_preferences'
      },
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language || document.documentElement.lang || 'es',
        deviceType: getDeviceType()
      }
    };
    
    // Registrar qué estamos enviando
    console.log("📤 [CMP] Enviando consentimiento al servidor:", JSON.stringify(payload));
    
    // Hacer la solicitud POST al servidor
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          throw new Error('Error ' + response.status + ': ' + text);
        });
      }
      return response.json();
    })
    .then(function(data) {
      console.log("✅ [CMP] Consentimiento guardado en el servidor:", data);
    })
    .catch(function(error) {
      console.error("❌ [CMP] Error al guardar consentimiento en el servidor:", error);
      
      // Segundo intento con payload reducido en caso de error
      if (error.message.includes('413') || error.message.includes('payload too large')) {
        var minimalPayload = {
          userId: currentUserId,
          decisions: {
            purposes: consent.purposes
          },
          bannerInteraction: { type: action }
        };
        
        console.log("🔄 [CMP] Reintentando con payload reducido");
        
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(minimalPayload)
        })
        .then(function(response) {
          if (response.ok) {
            console.log("✅ [CMP] Reintento exitoso");
          } else {
            console.error("❌ [CMP] Error en reintento:", response.status);
          }
        })
        .catch(function(e) {
          console.error("❌ [CMP] Error en reintento:", e);
        });
      }
    });
  } catch (e) {
    console.error("❌ [CMP] Error enviando consentimiento al servidor:", e);
  }
}
  
  // -- FUNCIONALIDAD DE CONSENTIMIENTO --
  
  // Aceptar todas las cookies
  function acceptAll() {
    try {
      console.log("🔄 Aceptando todas las cookies...");
      
      // NUEVO: Formato unificado para todos los propósitos
      var allPurposes = {
        1: true, 2: true, 3: true, 4: true, 5: true, 
        6: true, 7: true, 8: true, 9: true, 10: true
      };
      
      // Crear objeto completo con formato cliente
      var decisions = {
        purposes: allPurposes,
        vendors: {},
        specialFeatures: { 1: true, 2: true }
      };
      
      // Utilizar la función unificada de guardado
      saveConsent(decisions, 'accept_all');
      hideBanner();
      
      console.log("✅ Todas las cookies aceptadas");
    } catch (error) {
      console.error("❌ Error en acceptAll:", error);
    }
  }
  
  // Rechazar todas las cookies excepto las necesarias
  function rejectAll() {
    try {
      console.log("🔄 Rechazando cookies no esenciales...");
      
      // NUEVO: Formato unificado para propósitos (solo el 1 permitido)
      var minimalPurposes = {
        1: true, 2: false, 3: false, 4: false, 5: false, 
        6: false, 7: false, 8: false, 9: false, 10: false
      };
      
      // Crear objeto completo con formato cliente
      var decisions = {
        purposes: minimalPurposes,
        vendors: {},
        specialFeatures: { 1: false, 2: false }
      };
      
      // Utilizar la función unificada de guardado
      saveConsent(decisions, 'reject_all');
      hideBanner();
      
      console.log("✅ Cookies no esenciales rechazadas");
    } catch (error) {
      console.error("❌ Error en rejectAll:", error);
    }
  }
  
  // Mostrar panel de preferencias
  function showPreferences() {
    try {
      console.log("🔄 Mostrando panel de preferencias...");
      
      var preferencesPanel = document.getElementById('cmp-preferences');
      if (!preferencesPanel) {
        console.error("❌ Panel de preferencias no encontrado");
        return;
      }
      
      // Ocultar banner principal si está visible
      var banner = document.getElementById('cmp-banner');
      if (banner) {
        banner.classList.remove('cmp-banner--visible');
      }
      
      // Mostrar panel de preferencias
      preferencesPanel.style.display = 'flex';
      
      // Setup de event listeners para el panel de preferencias
      setupPreferencesEventListeners();
      
      console.log("✅ Panel de preferencias mostrado");
    } catch (error) {
      console.error("❌ Error en showPreferences:", error);
    }
  }
  
  // Configurar listeners del panel de preferencias
  function setupPreferencesEventListeners() {
    try {
      console.log("🔄 Configurando listeners del panel de preferencias...");
      
      var preferencesPanel = document.getElementById('cmp-preferences');
      if (!preferencesPanel) {
        console.error("❌ Panel de preferencias no encontrado");
        return;
      }
      
      // Tab switching
      var tabs = preferencesPanel.querySelectorAll('.cmp-tab');
      var tabContents = preferencesPanel.querySelectorAll('.cmp-tab-content');
      
      if (tabs.length === 0) {
        console.warn("⚠️ No se encontraron tabs en el panel de preferencias");
      }
      
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var tabId = this.getAttribute('data-tab');
          
          // Reset all tabs
          tabs.forEach(function(t) { t.classList.remove('active'); });
          tabContents.forEach(function(c) { c.classList.remove('active'); });
          
          // Activate selected tab
          this.classList.add('active');
          var activeContent = preferencesPanel.querySelector('[data-tab-content="' + tabId + '"]');
          if (activeContent) {
            activeContent.classList.add('active');
          } else {
            console.warn("⚠️ No se encontró contenido para tab:", tabId);
          }
        });
      });
      
      // Button actions
      var acceptButton = preferencesPanel.querySelector('.cmp-button-accept');
      var rejectButton = preferencesPanel.querySelector('.cmp-button-reject');
      var saveButton = preferencesPanel.querySelector('.cmp-button-save');
      var closeButton = preferencesPanel.querySelector('.cmp-close-button');
      
      if (acceptButton) {
        acceptButton.addEventListener('click', function() {
          acceptAll();
          preferencesPanel.style.display = 'none';
        });
      }
      
      if (rejectButton) {
        rejectButton.addEventListener('click', function() {
          rejectAll();
          preferencesPanel.style.display = 'none';
        });
      }
      
      if (saveButton) {
        saveButton.addEventListener('click', function() {
          savePreferences();
          preferencesPanel.style.display = 'none';
        });
      }
      
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          preferencesPanel.style.display = 'none';
          showBanner(); // Mostrar de nuevo el banner principal
        });
      }
      
      // Cargar estado de consentimiento actual en los controles
      loadConsentStateToUI();
      
      console.log("✅ Listeners del panel de preferencias configurados");
    } catch (error) {
      console.error("❌ Error en setupPreferencesEventListeners:", error);
    }
  }
  
  // Cargar estado de consentimiento en la UI
  function loadConsentStateToUI() {
    try {
      console.log("🔄 Cargando estado de consentimiento en la UI...");
      
      var preferencesPanel = document.getElementById('cmp-preferences');
      if (!preferencesPanel) {
        console.error("❌ Panel de preferencias no encontrado");
        return;
      }
      
      // Obtener estado actual
      var currentState = getConsentState();
      
      // Actualizar checkboxes de categorías
      var categoryInputs = preferencesPanel.querySelectorAll('[data-category]');
      categoryInputs.forEach(function(input) {
        var category = input.getAttribute('data-category');
        input.checked = currentState.purposes && currentState.purposes[category] === true;
      });
      
      // Actualizar checkboxes de propósitos específicos
      var purposeInputs = preferencesPanel.querySelectorAll('[data-purpose-id]');
      purposeInputs.forEach(function(input) {
        var purposeId = input.getAttribute('data-purpose-id');
        input.checked = currentState.purposes && currentState.purposes[purposeId] === true;
      });
      
      console.log("✅ Estado de consentimiento cargado en la UI");
    } catch (error) {
      console.error("❌ Error en loadConsentStateToUI:", error);
    }
  }
  
  // Guardar preferencias personalizadas
  function savePreferences() {
    try {
      console.log("🔄 Guardando preferencias personalizadas...");
      
      var preferencesPanel = document.getElementById('cmp-preferences');
      if (!preferencesPanel) return;
      
      var purposes = {
        necessary: true, // Siempre necesarias
        analytics: false,
        marketing: false,
        personalization: false
      };
      
      // Recoger categorías
      var categoryInputs = preferencesPanel.querySelectorAll('[data-category]');
      categoryInputs.forEach(function(input) {
        var category = input.getAttribute('data-category');
        purposes[category] = input.checked;
      });
      
      saveConsent(purposes, 'save_preferences');
      hideBanner();
      
      // Ocultar también el panel de preferencias
      preferencesPanel.style.display = 'none';
      
      console.log("✅ Preferencias personalizadas guardadas");
    } catch (error) {
      console.error("❌ Error en savePreferences:", error);
    }
  }
  
  // Guardar estado de consentimiento
  function saveConsent(consent, action) {
    try {
      console.log("🔄 Guardando consentimiento, acción:", action);
      
      var now = new Date().toISOString();
      
      // Si es primer consentimiento
      if (!consentState.created) {
        consentState.created = now;
      }
      
      // NUEVO: Convertir al formato unificado para almacenamiento
      // Mantener formato original para preservar compatibilidad
      var clientFormat = {
        purposes: {},
        vendors: {},
        specialFeatures: {},
        purposesLI: {},
        vendorsLI: {}
      };
      
      // Procesar decisiones de propósitos
      if (consent.purposes) {
        Object.assign(clientFormat.purposes, consent.purposes);
      }
      
      // Procesar decisiones de vendors
      if (consent.vendors) {
        Object.assign(clientFormat.vendors, consent.vendors);
      }
      
      // Procesar características especiales
      if (consent.specialFeatures) {
        Object.assign(clientFormat.specialFeatures, consent.specialFeatures);
      }
      
      // Procesar intereses legítimos si existen
      if (consent.purposesLI) {
        Object.assign(clientFormat.purposesLI, consent.purposesLI);
      }
      
      if (consent.vendorsLI) {
        Object.assign(clientFormat.vendorsLI, consent.vendorsLI);
      }
      
      // NUEVO: Convertir a formato DB (para envío al servidor)
      var dbFormat = convertToDBFormat(clientFormat);
      
      // Actualizar estado interno
      consentState.purposes = clientFormat.purposes;
      consentState.vendors = clientFormat.vendors;
      consentState.specialFeatures = clientFormat.specialFeatures;
      consentState.purposesLI = clientFormat.purposesLI;
      consentState.vendorsLI = clientFormat.vendorsLI;
      consentState.lastUpdated = now;
      
      // Guardar en cookie
      cookieUtils.set(bannerId + '-consent', consentState, config.cookieExpiry);
      
      // Aplicar consentimiento (activar/desactivar scripts)
      applyConsent(consentState);
      
      // Actualizar Google Consent Mode si está habilitado
      if (config.googleConsentMode && window.gtag) {
        updateGoogleConsent(consentState);
      }
      
      // Enviar evento si existe dataLayer
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'consent_update',
          consent_action: action,
          consent_categories: mapToCategories(clientFormat.purposes)
        });
      }
      
      // NUEVO: Enviar consentimiento al servidor en formato DB
      saveConsentToServer(dbFormat, action);
      
      console.log("✅ Estado de consentimiento guardado, categorías:", JSON.stringify(clientFormat.purposes));
      return clientFormat;
    } catch (error) {
      console.error("❌ Error en saveConsentState:", error);
      
      // Intentar guardar al servidor de todos modos
      try {
        // Intentar convertir al formato DB incluso en caso de error
        var minimalDBFormat = {
          purposes: [{ id: 1, name: "Storage and access", allowed: true, legalBasis: "consent" }],
          vendors: []
        };
        
        saveConsentToServer(minimalDBFormat, action);
      } catch (e) {
        console.error("❌ Error crítico al enviar consentimiento al servidor:", e);
      }
      
      // Actualizar estado mínimo en caso de error
      var minimalState = {
        purposes: { 1: true }, // Al menos propósito 1 (almacenamiento) siempre permitido
        vendors: {},
        specialFeatures: {},
        lastUpdated: now
      };
      
      if (!consentState.created) {
        minimalState.created = now;
      } else {
        minimalState.created = consentState.created;
      }
      
      // Guardar estado mínimo
      consentState = minimalState;
      cookieUtils.set(bannerId + '-consent', consentState, config.cookieExpiry);
      
      // Aplicar consentimiento mínimo
      applyConsent(minimalState);
      
      return minimalState;
    }
  }

  function convertToDBFormat(clientConsent) {
  var dbFormat = {
    purposes: [],
    vendors: [],
    specialFeatures: []
  };
  
  // Procesar propósitos
  if (clientConsent.purposes) {
    Object.keys(clientConsent.purposes).forEach(function(id) {
      var purposeId = parseInt(id, 10);
      var allowed = clientConsent.purposes[id];
      
      // Mapeo de ID a nombres para propósitos comunes
      var purposeNames = {
        1: "Store and access information on device",
        2: "Select basic ads",
        3: "Create a personalised ads profile",
        4: "Select personalised ads",
        5: "Create a personalised content profile",
        6: "Select personalised content",
        7: "Measure ad performance",
        8: "Measure content performance",
        9: "Apply market research",
        10: "Develop and improve products"
      };
      
      dbFormat.purposes.push({
        id: purposeId,
        name: purposeNames[purposeId] || "Purpose " + purposeId,
        allowed: allowed === true,
        legalBasis: "consent"
      });
    });
  }
  
  // Procesar vendors
  if (clientConsent.vendors) {
    Object.keys(clientConsent.vendors).forEach(function(id) {
      var vendorId = parseInt(id, 10);
      var allowed = clientConsent.vendors[id];
      
      // Nombres de algunos vendors comunes
      var vendorNames = {
        1: "Google",
        2: "Meta Platforms, Inc.",
        7: "MediaMath",
        28: "OneTrust LLC",
        91: "Criteo",
        128: "Xandr, Inc.",
        132: "Index Exchange",
        755: "Google Advertising Products",
        765: "TrueData",
        802: "Roku"
      };
      
      dbFormat.vendors.push({
        id: vendorId,
        name: vendorNames[vendorId] || "Vendor " + vendorId,
        allowed: allowed === true
      });
    });
  }
  
  // Procesar características especiales
  if (clientConsent.specialFeatures) {
    Object.keys(clientConsent.specialFeatures).forEach(function(id) {
      var featureId = parseInt(id, 10);
      var allowed = clientConsent.specialFeatures[id];
      
      var featureNames = {
        1: "Use precise geolocation data",
        2: "Actively scan device characteristics"
      };
      
      dbFormat.specialFeatures.push({
        id: featureId,
        name: featureNames[featureId] || "Feature " + featureId,
        allowed: allowed === true
      });
    });
  }
  
  return dbFormat;
}


  
  // Obtener estado de consentimiento actual
  function getConsentState() {
    try {
      // Si ya tenemos estado en memoria, devolverlo
      if (consentState.lastUpdated) {
        return consentState;
      }
      
      // Intentar obtener de cookie
      var savedConsent = cookieUtils.get(bannerId + '-consent');
      if (savedConsent) {
        consentState = savedConsent;
        return consentState;
      }
      
      // Estado por defecto (solo cookies necesarias)
      return {
        purposes: {
          necessary: true,
          analytics: false,
          marketing: false,
          personalization: false
        },
        created: null,
        lastUpdated: null
      };
    } catch (error) {
      console.error("❌ Error en getConsentState:", error);
      
      // Retornar estado básico en caso de error
      return {
        purposes: { necessary: true },
        created: null,
        lastUpdated: null
      };
    }
  }
  
  // Aplicar consentimiento actual (activar/desactivar scripts)
  function applyConsent(consent) {
    try {
      console.log("🔄 Aplicando consentimiento a scripts...");
      
      // Obtener todos los scripts con data-category
      var scripts = document.querySelectorAll('script[type="text/plain"][data-category]');
      
      if (scripts.length === 0) {
        console.log("ℹ️ No se encontraron scripts para activar");
        return;
      }
      
      var activatedCount = 0;
      
      scripts.forEach(function(script) {
        var category = script.getAttribute('data-category');
        var shouldActivate = consent.purposes && consent.purposes[category] === true;
        
        // Para categoría "necessary" siempre activar
        if (category === 'necessary') {
          shouldActivate = true;
        }
        
        if (shouldActivate && !script.getAttribute('data-activated')) {
          activateScript(script);
          activatedCount++;
        }
      });
      
      console.log("✅ Consentimiento aplicado, scripts activados:", activatedCount);
    } catch (error) {
      console.error("❌ Error en applyConsent:", error);
    }
  }
  
  // Activar un script
  function activateScript(script) {
    try {
      if (script.getAttribute('data-activated') === 'true') {
        return; // Ya activado
      }
      
      var newScript = document.createElement('script');
      
      // Copiar todos los atributos excepto type
      for (var i = 0; i < script.attributes.length; i++) {
        var attr = script.attributes[i];
        if (attr.name !== 'type' && attr.name !== 'data-activated') {
          newScript.setAttribute(attr.name, attr.value);
        }
      }
      
      // Establecer type correcto
      newScript.setAttribute('type', 'text/javascript');
      
      // Marcar como activado
      script.setAttribute('data-activated', 'true');
      
      // Copiar contenido o src
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      
      // Insertar en DOM
      script.parentNode.insertBefore(newScript, script.nextSibling);
      
      console.log("✅ Script activado:", script.src || script.textContent.substring(0, 30) + "...");
    } catch (error) {
      console.error("❌ Error al activar script:", error);
    }
  }
  
  // Actualizar Google Consent Mode
  function updateGoogleConsent(consent) {
    try {
      if (!window.gtag) {
        console.log("ℹ️ Google Tag Manager no detectado");
        return;
      }
      
      console.log("🔄 Actualizando Google Consent Mode...");
      
      // Estado de consentimiento para Google
      var consentModeParams = {
        'ad_storage': consent.purposes.marketing ? 'granted' : 'denied',
        'analytics_storage': consent.purposes.analytics ? 'granted' : 'denied',
        'personalization_storage': consent.purposes.personalization ? 'granted' : 'denied',
        'functionality_storage': 'granted', // Siempre permitido
        'security_storage': 'granted' // Siempre permitido
      };
      
      // Actualizar en Google
      gtag('consent', 'update', consentModeParams);
      
      console.log("✅ Google Consent Mode actualizado");
    } catch (error) {
      console.error("❌ Error en updateGoogleConsent:", error);
    }
  }
  
  // Comprobar si existe consentimiento previo
  function hasExistingConsent() {
    try {
      var savedConsent = cookieUtils.get(bannerId + '-consent');
      return !!savedConsent && !!savedConsent.lastUpdated;
    } catch (error) {
      console.error("❌ Error en hasExistingConsent:", error);
      return false;
    }
  }
  
  // Verificar si el banner debe mostrarse
  function shouldShowBanner() {
    try {
      // Si hay consentimiento previo y no está configurado reshow, no mostrar
      if (hasExistingConsent() && !config.reshow) {
        return false;
      }
      
      // Si hay reshow configurado, verificar intervalo
      if (hasExistingConsent() && config.reshow && config.reshowInterval > 0) {
        var savedConsent = cookieUtils.get(bannerId + '-consent');
        var lastUpdatedTime = new Date(savedConsent.lastUpdated).getTime();
        var currentTime = new Date().getTime();
        
        // Convertir intervalo a milisegundos
        var intervalMs = config.reshowInterval * 1000;
        
        // Si no ha pasado suficiente tiempo, no mostrar
        if (currentTime - lastUpdatedTime < intervalMs) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error en shouldShowBanner:", error);
      // En caso de error, mostrar el banner por seguridad
      return true;
    }
  }
  
  ${includeGoogleConsentMode ? googleConsentModeCode : ''}
  
  // Inicializar
  function init() {
    try {
      console.log("🚀 Inicializando CMP...");
      
      // Configurar polyfills
      setupCompatibility();
      
      // Cargar estado de consentimiento
      consentState = getConsentState();
      
      // Si hay consentimiento previo, aplicarlo
      if (hasExistingConsent()) {
        console.log("🔄 Consentimiento previo encontrado, aplicando...");
        applyConsent(consentState);
        
        // Actualizar Google Consent Mode si está habilitado
        if (config.googleConsentMode && window.gtag) {
          updateGoogleConsent(consentState);
        }
      } else {
        console.log("ℹ️ No se encontró consentimiento previo");
      }
      
      // Determinar si debemos mostrar el banner
      if (shouldShowBanner()) {
        console.log("🔄 Se debe mostrar el banner");
        // Mostrar banner después de un breve delay para permitir que la página cargue
        setTimeout(function() {
          showBanner();
        }, 800);
      } else {
        console.log("ℹ️ No es necesario mostrar el banner");
      }
      
      // Exponer API pública
      window.cookieConsent = {
        showBanner: showBanner,
        hideBanner: hideBanner,
        showPreferences: showPreferences,
        acceptAll: acceptAll,
        rejectAll: rejectAll,
        getState: getConsentState,
        reset: function() {
          cookieUtils.remove(bannerId + '-consent');
          consentState = {
            purposes: { necessary: true },
            created: null,
            lastUpdated: null
          };
          showBanner();
        }
      };
      
      // También asignar a window.CMP para compatibilidad
      window.CMP = window.CMP || {};
      window.CMP.showBanner = showBanner;
      window.CMP.hideBanner = hideBanner;
      window.CMP.showPreferences = showPreferences;
      window.CMP.acceptAll = acceptAll;
      window.CMP.rejectAll = rejectAll;
      window.CMP.getConsentState = getConsentState;
      
      console.log("✅ CMP inicializado correctamente");
    } catch (error) {
      console.error("❌ Error en init:", error);
      // Intentar recuperarse del error
      try {
        window.cookieConsent = {
          showBanner: function() { createEmergencyBanner(); },
          hideBanner: function() { 
            var banner = document.getElementById('cmp-banner');
            if (banner && banner.parentNode) {
              banner.parentNode.removeChild(banner);
            }
          },
          acceptAll: function() {
            cookieUtils.set(bannerId + '-consent', { 
              purposes: { necessary: true, analytics: true, marketing: true, personalization: true },
              created: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }, 365);
            this.hideBanner();
          },
          rejectAll: function() {
            cookieUtils.set(bannerId + '-consent', { 
              purposes: { necessary: true, analytics: false, marketing: false, personalization: false },
              created: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }, 365);
            this.hideBanner();
          }
        };
        
        // También asignar a window.CMP para compatibilidad
        window.CMP = window.CMP || {};
        window.CMP.showBanner = window.cookieConsent.showBanner;
        window.CMP.hideBanner = window.cookieConsent.hideBanner;
        window.CMP.acceptAll = window.cookieConsent.acceptAll;
        window.CMP.rejectAll = window.cookieConsent.rejectAll;
      } catch (recoveryError) {
        console.error("❌ Error crítico en CMP, no se pudo recuperar:", recoveryError);
      }
    }
  }
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  }
})();
    `.trim();
}
  /**
   * Minifica un script para reducir su tamaño
   * @private
   * @param {String} script - Script a minificar
   * @returns {String} - Script minificado
   */
  _minifyScript(script) {
    try {
      if (!script || typeof script !== 'string') {
        return script;
      }

      // Paso 1: Eliminar comentarios con expresiones regulares
      let result = script
        .replace(/\/\*[\s\S]*?\*\//g, '')             // Eliminar comentarios multilinea
        .replace(/\/\/.*?(?:\n|$)/g, '');            // Eliminar comentarios de una línea

      // Paso 2: Minificar con manejo especial para strings y URLs
      let minified = '';
      let inString = false;        // Indica si estamos dentro de una cadena
      let stringChar = '';         // Carácter de apertura de la cadena actual (" o ')
      let prevChar = '';           // Carácter anterior
      
      for (let i = 0; i < result.length; i++) {
        const char = result[i];
        const nextChar = result[i + 1] || '';
        
        // Manejar cadenas para evitar romper URLs y JSON
        if ((char === '"' || char === "'") && prevChar !== '\\') {
          if (!inString) {
            // Entrar en una cadena
            inString = true;
            stringChar = char;
            minified += char;
          } else if (char === stringChar) {
            // Salir de una cadena si encontramos el mismo delimitador
            inString = false;
            stringChar = '';
            minified += char;
          } else {
            // Un delimitador de cadena diferente dentro de una cadena
            minified += char;
          }
        } 
        else if (inString) {
          // Dentro de una cadena, preservar todo exactamente como está
          minified += char;
        }
        // Si estamos fuera de una cadena, podemos minificar
        else if (/\s/.test(char)) {
          // Solo preservar espacios necesarios
          if (
            (/[a-zA-Z0-9_$]/.test(prevChar) && /[a-zA-Z0-9_$]/.test(nextChar)) ||
            (/\d/.test(prevChar) && /\d/.test(nextChar))
          ) {
            minified += ' ';
          }
        }
        else {
          // Cualquier otro carácter
          minified += char;
        }
        
        prevChar = char;
      }
      
      // Paso 3: Eliminar espacios múltiples que pudieran quedar
      minified = minified.replace(/\s{2,}/g, ' ');
      
      return minified.trim();
    } catch (error) {
      logger.error('Error al minificar script:', error);
      // En caso de error, devolver el script original sin cambios
      return script;
    }
  }
}

module.exports = new BannerExportService();