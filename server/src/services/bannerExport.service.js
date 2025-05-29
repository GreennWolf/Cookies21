// services/bannerExport.service.js
const fs = require('fs').promises;
const path = require('path');
const bannerGenerator = require('./bannerGenerator.service');
const logger = require('../utils/logger');
const consentScriptGenerator = require('./consentScriptGenerator.service');
const { getBaseUrl } = require('../config/urls');

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
        baseUrl = getBaseUrl(),
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
      
      // En lugar de generar CSS específico aquí, vamos a delegar completamente 
      // la responsabilidad al servicio bannerGenerator.service.js
      console.log("🔍 DEBUG: Delegando generación de CSS específico al bannerGenerator.service.js");
      let typeSpecificCSSString = "";
      
      // Añadir reglas optimizadas para la nueva estructura simplificada
      if (layoutType === 'modal') {
        console.log("🔍 DEBUG: Aplicando ajustes mejorados para modal (versión 2.0)");
        typeSpecificCSSString = `
          /* Estructura mejorada para modales 2.0 - solución supercompleta para centrado */
          #cmp-modal-container, .cmp-modal-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 2147483646 !important;
            opacity: 1 !important;
            visibility: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            pointer-events: auto !important;
            transform: none !important;
            box-sizing: border-box !important;
          }
          
          /* Asegurar que el banner modal sea visible y correctamente posicionado */
          #cmp-banner.cmp-banner--modal, .cmp-banner.cmp-banner--modal {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 auto !important;
            position: relative !important;
            width: 60% !important;
            min-width: 40% !important;
            max-width: 90% !important;
            background-color: #ffffff !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
            padding: 20px !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            text-align: center !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
          }
          
          /* Estilos para banner flotante */
          #cmp-banner.cmp-banner--floating, .cmp-banner.cmp-banner--floating {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: fixed !important;
            width: 50% !important;
            min-width: 40% !important;
            max-width: 70% !important;
            background-color: #ffffff !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
            padding: 20px !important;
            margin: 20px !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
          }
          
          /* Estilos para banner estándar */
          #cmp-banner.cmp-banner--banner, .cmp-banner.cmp-banner--banner {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: fixed !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            background-color: #ffffff !important;
            padding: 20px !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
          }
          
          /* Compatibilidad con navegadores antiguos */
          @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
            #cmp-modal-container, .cmp-modal-container {
              display: table !important;
              width: 100% !important;
              height: 100% !important;
            }
            
            #cmp-banner.cmp-banner--modal, .cmp-banner.cmp-banner--modal {
              display: table-cell !important;
              vertical-align: middle !important;
              text-align: center !important;
            }
            
            #cmp-banner.cmp-banner--modal > *, .cmp-banner.cmp-banner--modal > * {
              text-align: left !important;
            }
          }
        `;
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
      console.log("🔍 DEBUG: CMP ID a utilizar:", process.env.IAB_CMP_ID || '28');
      
      // Generar el script completo con las mejoras
      let script = `
// =============================================
// CMP Script - Implementación TCF v2.2
// =============================================
console.log("🚀 CMP Script iniciándose...");

(function() {
  // =============================================
  // IMPLEMENTACIÓN DEL STUB TCF - PRIMERO EN EJECUCIÓN
  // =============================================
  (function() {
    console.log("🔍 CMP Debug: Inicializando TCF API stub");
    
    // Variables de configuración del CMP
    var CMP_CONFIG = {
      cmpId: ${process.env.IAB_CMP_ID || 28},
      cmpVersion: 1,
      tcfPolicyVersion: 4, // TCF v2.2 usa policy version 4
      apiVersion: "2.2",
      gdprApplies: ${forceGDPR},
      publisherCC: "ES",
      language: navigator.language.substring(0, 2) || "es",
      consentScope: "service", // service o global
      gvlVersion: 3 // Vendors List versión 3 para TCF v2.2
    };
    
    // Crear iframe locator inmediatamente
    function createLocatorFrame() {
      if (!window.frames['__tcfapiLocator']) {
        try {
          if (document.body) {
            console.log("🔍 CMP Debug: Creando iframe __tcfapiLocator");
            var locatorFrame = document.createElement('iframe');
            locatorFrame.name = '__tcfapiLocator';
            locatorFrame.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;';
            locatorFrame.setAttribute('aria-hidden', 'true');
            locatorFrame.setAttribute('title', 'TCF API Locator');
            document.body.appendChild(locatorFrame);
            console.log("✅ CMP Debug: iframe __tcfapiLocator creado correctamente");
          } else {
            // Si document.body aún no está listo, intentar más tarde
            setTimeout(createLocatorFrame, 5);
            return;
          }
        } catch (e) {
          console.error("❌ CMP Debug: Error creando iframe __tcfapiLocator:", e);
          // Intentar en DOMContentLoaded
          document.addEventListener('DOMContentLoaded', createLocatorFrame);
        }
      }
    }
    
    createLocatorFrame();
    
    // Command queue segura
    window.__tcfapi_commandQueue = window.__tcfapi_commandQueue || [];
    
    // Contadores para callback IDs
    var eventCallbackId = 0;
    var eventCallbacks = {};
    
    // Implementar __tcfapi stub
    if (typeof window.__tcfapi !== 'function') {
      console.log("🔍 CMP Debug: Creando stub de la función __tcfapi");
      
      window.__tcfapi = function(cmd, version, callback, parameter) {
        console.log("🔍 CMP-API: Comando recibido:", cmd, version);
        
        // Validar callback
        if (typeof callback !== 'function') {
          console.error("❌ CMP Debug: Callback inválido para comando " + cmd);
          return;
        }
        
        // Validar versión
        if (version !== 2 && version !== 2.2) {
          console.error("❌ CMP Debug: Versión " + version + " no soportada");
          callback(null, false);
          return;
        }
        
        // Comando ping debe responder inmediatamente
        if (cmd === 'ping') {
          console.log("🔍 CMP Debug: Procesando comando 'ping'");
          var pingResponse = {
            gdprApplies: CMP_CONFIG.gdprApplies,
            cmpLoaded: false,
            cmpStatus: 'stub',
            displayStatus: 'hidden',
            apiVersion: CMP_CONFIG.apiVersion,
            cmpVersion: CMP_CONFIG.cmpVersion,
            cmpId: CMP_CONFIG.cmpId,
            gvlVersion: CMP_CONFIG.gvlVersion,
            tcfPolicyVersion: CMP_CONFIG.tcfPolicyVersion
          };
          console.log("🔍 CMP Debug: Respuesta ping:", JSON.stringify(pingResponse));
          callback(pingResponse, true);
          return;
        }
        
        // Comando addEventListener requiere tracking específico
        if (cmd === 'addEventListener') {
          var callbackId = 'event_' + (++eventCallbackId);
          eventCallbacks[callbackId] = callback;
          
          // Encolar comando para procesamiento posterior
          window.__tcfapi_commandQueue.push({
            command: cmd,
            parameter: parameter,
            version: version,
            callbackId: callbackId, // Guardar ID en lugar del callback
            callback: callback // También guardar callback para uso inmediato
          });
          
          console.log("🔍 CMP Debug: Callback registrado con ID:", callbackId);
          
          // CORRECCIÓN: Devolver inmediatamente el listenerId al callback
          if (typeof callback === 'function') {
            // Crear datos TCF básicos para addEventListener
            var tcData = {
              eventStatus: 'tcloaded',
              cmpStatus: 'loaded',
              listenerId: callbackId,
              tcString: window.consentState ? window.consentState.tcString : '',
              tcfPolicyVersion: config.tcfPolicyVersion,
              cmpVersion: config.cmpVersion,
              cmpId: config.cmpId,
              gdprApplies: true,
              purposeConsents: window.consentState ? window.consentState.purposes : { 1: true },
              vendorConsents: window.consentState ? window.consentState.vendors : {},
              specialFeatures: window.consentState ? window.consentState.specialFeatures : {}
            };
            
            // Llamar inmediatamente al callback con los datos actuales
            callback(tcData, true);
          }
          return;
        }
        
        // Comando removeEventListener
        if (cmd === 'removeEventListener') {
          if (!parameter) {
            console.error("❌ CMP Debug: removeEventListener requiere ID de listener");
            callback(null, false);
            return;
          }
          
          var removed = parameter in eventCallbacks;
          if (removed) {
            delete eventCallbacks[parameter];
            console.log("🔍 CMP Debug: Listener eliminado:", parameter);
          }
          
          callback({}, removed);
          return;
        }
        
        // Encolar otros comandos para procesamiento posterior
        console.log("🔍 CMP Debug: Encolando comando:", cmd);
        window.__tcfapi_commandQueue.push({
          command: cmd,
          parameter: parameter,
          version: version,
          callback: callback
        });
        
        console.log("🔍 CMP Debug: Cola de comandos actualizada, tamaño:", window.__tcfapi_commandQueue.length);
      };
      
      console.log("✅ CMP Debug: Stub __tcfapi creado correctamente");
    } else {
      console.log("ℹ️ CMP Debug: __tcfapi ya existe, no se ha creado el stub");
    }
    
    // Manejar mensajes postMessage
    console.log("🔍 CMP Debug: Configurando listener para mensajes postMessage");
    
    function postMessageHandler(event) {
      try {
        var data = event.data;
        var msgIsString = typeof data === 'string';
        
        if (msgIsString) {
          try {
            data = JSON.parse(data);
          } catch (e) {
            // No es JSON válido, ignorar
            return;
          }
        }
        
        if (data && data.__tcfapiCall) {
          console.log("🔍 CMP Debug: Recibido __tcfapiCall via postMessage:", data.__tcfapiCall.command);
          
          var callData = data.__tcfapiCall;
          
          window.__tcfapi(
            callData.command,
            callData.version,
            function(retValue, success) {
              console.log("🔍 CMP Debug: Enviando respuesta __tcfapiReturn");
              var returnMsg = {
                __tcfapiReturn: {
                  returnValue: retValue,
                  success: success,
                  callId: callData.callId
                }
              };
              
              if (event.source && event.source.postMessage) {
                event.source.postMessage(
                  msgIsString ? JSON.stringify(returnMsg) : returnMsg,
                  '*'
                );
                console.log("✅ CMP Debug: Respuesta __tcfapiReturn enviada");
              } else {
                console.error("❌ CMP Debug: No se puede enviar respuesta - origin no válido");
              }
            },
            callData.parameter
          );
        }
      } catch (e) {
        console.error("❌ CMP Debug: Error procesando postMessage:", e);
      }
    }
    
    window.addEventListener('message', postMessageHandler, false);
    
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
    cmpId: ${process.env.IAB_CMP_ID || 28},
    cmpVersion: 1,
    tcfPolicyVersion: 4, // TCF v2.2 usa policy version 4
    publisherCC: "ES", // Código de país del publicador
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
    domainId: "${domainId}", // Pasamos el domainId a la configuración
    cookieName: "euconsent-v2", // Nombre estándar para TCF v2.2
    language: navigator.language.substring(0, 2) || "es"
  };
  
  console.log("🔍 CMP Debug: Configuración inicializada", config);

  // =============================================
  // DEFINICIONES TCF v2.2 - LISTAS DE FINALIDADES
  // =============================================
  var TCF_PURPOSES = {
    1: {
      id: 1,
      name: "Almacenar o acceder a información en un dispositivo",
      description: "Las cookies, identificadores de dispositivos o similar, se pueden utilizar para fines específicos como almacenar información, acceder a información ya almacenada o identificar el dispositivo.",
      category: "necessary"
    },
    2: {
      id: 2,
      name: "Publicidad básica",
      description: "Se pueden mostrar anuncios basados en el contenido que está viendo, la aplicación que está usando, su ubicación aproximada o el tipo de dispositivo.",
      category: "marketing"
    },
    3: {
      id: 3,
      name: "Publicidad personalizada según perfil",
      description: "Se puede crear un perfil sobre usted y sus intereses para mostrarle anuncios personalizados que sean relevantes para usted.",
      category: "marketing"
    },
    4: {
      id: 4,
      name: "Publicidad personalizada según rendimiento",
      description: "Se pueden usar anuncios personalizados basados en un perfil para la selección y entrega de anuncios personalizados y medir su rendimiento.",
      category: "marketing"
    },
    5: {
      id: 5,
      name: "Contenido personalizado según perfil",
      description: "Se puede crear un perfil sobre usted y sus intereses para mostrarle contenido personalizado que sea relevante para usted.",
      category: "personalization"
    },
    6: {
      id: 6,
      name: "Contenido personalizado según rendimiento",
      description: "El contenido personalizado se puede utilizar según un perfil para la selección y entrega de contenido personalizado y medir su rendimiento.",
      category: "personalization"
    },
    7: {
      id: 7,
      name: "Medición del rendimiento de anuncios",
      description: "Se puede medir el rendimiento y la eficacia de los anuncios que ve o con los que interactúa.",
      category: "analytics"
    },
    8: {
      id: 8,
      name: "Medición del rendimiento de contenidos",
      description: "Se puede medir el rendimiento y la eficacia del contenido que ve o con el que interactúa.",
      category: "analytics"
    },
    9: {
      id: 9,
      name: "Estudios de mercado para generar información sobre audiencias",
      description: "Mediante estudios de mercado se puede generar información sobre las audiencias que vieron o interactuaron con contenido o anuncios.",
      category: "analytics"
    },
    10: {
      id: 10,
      name: "Desarrollar y mejorar productos",
      description: "Usando datos de lo que ve y utiliza, los proveedores pueden mejorar sus sistemas y desarrollar nuevos productos.",
      category: "analytics"
    }
  };
  
  // Categorías de cookies más amigables para el usuario
  var COOKIE_CATEGORIES = {
    necessary: {
      id: "necessary",
      name: "Cookies Necesarias",
      description: "Estas cookies son esenciales para el funcionamiento del sitio web y no pueden ser desactivadas en nuestros sistemas. Normalmente solo se establecen en respuesta a acciones realizadas por usted y permiten el uso de funciones básicas.",
      isRequired: true,
      purposes: [1]
    },
    analytics: {
      id: "analytics",
      name: "Cookies Analíticas",
      description: "Estas cookies nos permiten medir y mejorar el rendimiento de nuestro sitio web y proporcionarle una mejor experiencia de usuario. Nos ayudan a saber qué páginas son las más y menos populares y cómo los visitantes navegan por el sitio.",
      isRequired: false,
      purposes: [7, 8, 9, 10]
    },
    marketing: {
      id: "marketing",
      name: "Cookies de Marketing",
      description: "Estas cookies son utilizadas para seguir a los visitantes en los sitios web. La intención es mostrar anuncios que sean relevantes y atractivos para el usuario individual, y por lo tanto más valiosos para los editores y terceros anunciantes.",
      isRequired: false,
      purposes: [2, 3, 4]
    },
    personalization: {
      id: "personalization",
      name: "Cookies de Personalización",
      description: "Estas cookies nos permiten proporcionarle funcionalidades y personalización mejoradas. Pueden ser establecidas por nosotros o por proveedores externos cuyos servicios hemos agregado a nuestras páginas.",
      isRequired: false,
      purposes: [5, 6]
    }
  };
  
  /* --------------------------------------------------
   * GENERADOR TC STRING (Implementación completa base64url)
   * -------------------------------------------------- */
  var TCStringGenerator = (function() {
    // Base64url encoding/decoding
    function base64UrlEncode(str) {
      return btoa(str)
        .replace(/\\+/g, '-')
        .replace(/\\//g, '_')
        .replace(/=/g, '');
    }
    
    function base64UrlDecode(str) {
      // Add back padding if needed
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) {
        str += '=';
      }
      return atob(str);
    }
    
    // Bit operations
    function encodeToBase64(value, size) {
      var bitString = value.toString(2);
      while (bitString.length < size) {
        bitString = '0' + bitString;
      }
      return bitString;
    }
    
    function encodeEuConsent(tcData) {
      // Esta es una implementación simplificada para generar un TC string básico
      // En implementación real, usar iabtcf-core para encoding correcto
      // NOTA: No usar en producción sin completar todos los campos según spec TCF v2.2
      
      const TC_EPOCH = 1596240000000; // 2020-08-31T00:00:00Z en ms
      const now = new Date();
      const timeInt = Math.floor((now.getTime() - TC_EPOCH) / 100);
      
      let bitString = "";
      
      // Core string - Segmento 1 (obligatorio)
      // Version
      bitString += encodeToBase64(2, 6); // Version 2
      
      // Created
      bitString += encodeToBase64(timeInt, 36);
      
      // Last Updated
      bitString += encodeToBase64(timeInt, 36);
      
      // CmpId
      bitString += encodeToBase64(tcData.cmpId || 28, 12);
      
      // CmpVersion
      bitString += encodeToBase64(tcData.cmpVersion || 1, 12);
      
      // Consent Screen
      bitString += encodeToBase64(1, 6);
      
      // Consent Language
      const langStr = (tcData.language || 'es').toUpperCase();
      const langVal = (langStr.charCodeAt(0) << 8) + langStr.charCodeAt(1);
      bitString += encodeToBase64(langVal, 12);
      
      // Vendor List Version
      bitString += encodeToBase64(tcData.gvlVersion || 3, 12);
      
      // TCF Policy Version
      bitString += encodeToBase64(tcData.tcfPolicyVersion || 4, 6); // V2.2 = 4
      
      // IsServiceSpecific
      bitString += encodeToBase64(1, 1);
      
      // Use Non-Standard Stacks
      bitString += encodeToBase64(0, 1);
      
      // Special Feature Optins
      let specialFeaturesStr = "";
      for (let i = 1; i <= 12; i++) {
        specialFeaturesStr += tcData.specialFeatures && tcData.specialFeatures[i] ? "1" : "0";
      }
      bitString += specialFeaturesStr;
      
      // Purpose Consents
      let purposesConsentsStr = "";
      for (let i = 1; i <= 24; i++) {
        purposesConsentsStr += tcData.purposeConsents && tcData.purposeConsents[i] ? "1" : "0";
      }
      bitString += purposesConsentsStr;
      
      // Purpose Legitimate Interests
      let purposesLIStr = "";
      for (let i = 1; i <= 24; i++) {
        purposesLIStr += tcData.purposeLegitimateInterests && tcData.purposeLegitimateInterests[i] ? "1" : "0";
      }
      bitString += purposesLIStr;
      
      // Purpose One Treatment
      bitString += encodeToBase64(0, 1);
      
      // Publisher CC
      const publisherCC = (tcData.publisherCC || 'ES').toUpperCase();
      const pubCCVal = (publisherCC.charCodeAt(0) << 8) + publisherCC.charCodeAt(1);
      bitString += encodeToBase64(pubCCVal, 12);
      
      // Vendor Consents - simplificado para demo
      // En implementación real, implementar la lógica completa para vendorId ranges y maxVendorId
      bitString += encodeToBase64(0, 16); // Max Vendor ID
      bitString += encodeToBase64(0, 1);  // Encoding Type
      
      // Vendor Legitimate Interests - simplificado
      bitString += encodeToBase64(0, 16); // Max Vendor ID LI
      bitString += encodeToBase64(0, 1);  // Encoding Type LI
      
      // Este bitString se convertiría a base64url en implementación real
      // Para demo, hacemos un encoding básico
      var bytes = [];
      for (let i = 0; i < bitString.length; i += 8) {
        let byte = bitString.substr(i, 8);
        while (byte.length < 8) byte += '0';
        bytes.push(parseInt(byte, 2));
      }
      
      // Convertir bytes a string para base64
      let binaryString = String.fromCharCode.apply(null, bytes);
      return base64UrlEncode(binaryString);
    }
    
    return {
      generateTCString: function(tcData) {
        return encodeEuConsent(tcData);
      }
    };
  })();
  
  // Utilidades para cookies
  var cookieUtils = {
    set: function(name, value, days, path, domain) {
      var expires = "";
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      var cookieDomain = domain ? "; domain=" + domain : "";
      document.cookie = name + "=" + encodeURIComponent(value) + expires + cookieDomain + "; path=" + (path || "/") + "; SameSite=Lax";
    },
    get: function(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    },
    remove: function(name, domain) {
      var cookieDomain = domain ? "; domain=" + domain : "";
      document.cookie = name + "=; Max-Age=-99999999; path=/;" + cookieDomain;
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
        try {
          if (banner && banner.parentNode && banner.parentNode.contains(banner)) {
            banner.parentNode.removeChild(banner);
          }
        } catch (e) {
          console.warn("⚠️ Error al eliminar banner:", e);
        }
        
        try {
          if (overlay && overlay.parentNode && overlay.parentNode.contains(overlay)) {
            overlay.parentNode.removeChild(overlay);
          }
        } catch (e) {
          console.warn("⚠️ Error al eliminar overlay:", e);
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
      try {
        if (oldStyle && oldStyle.parentNode && oldStyle.parentNode.contains(oldStyle)) {
          oldStyle.parentNode.removeChild(oldStyle);
        }
      } catch (e) {
        console.warn("⚠️ Error al eliminar estilos anteriores:", e);
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
        createdBanner.setAttribute('aria-labelledby', 'cmp-title');
        createdBanner.setAttribute('aria-describedby', 'cmp-description');
        createdBanner.innerHTML = \`
          <div style="flex:1">
            <p style="margin:0" id="cmp-description">Este sitio utiliza cookies para mejorar tu experiencia.</p>
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
  
  // Función para mapear propósitos a categorías
  function mapToCategories(purposes) {
    // Valor predeterminado si purposes es undefined
    if (!purposes) {
      return {
        necessary: true, // IMPORTANTE: Siempre true
        analytics: false,
        marketing: false,
        personalization: false
      };
    }
    
    var categories = {
      necessary: true, // IMPORTANTE: Siempre true
      analytics: false,
      marketing: false,
      personalization: false
    };
    
    // Si purposes está en formato numérico
    if (typeof purposes === 'object' && !Array.isArray(purposes)) {
      // Analytics: propósitos 7, 8, 9, 10
      if (purposes['7'] === true || purposes['8'] === true || 
          purposes['9'] === true || purposes['10'] === true) {
        categories.analytics = true;
      }
      
      // Marketing: propósitos 2, 3, 4
      if (purposes['2'] === true || purposes['3'] === true || purposes['4'] === true) {
        categories.marketing = true;
      }
      
      // Personalización: propósitos 5, 6
      if (purposes['5'] === true || purposes['6'] === true) {
        categories.personalization = true;
      }
    } 
    // Si purposes ya tiene formato de categorías
    else if (purposes.analytics !== undefined) {
      categories.analytics = purposes.analytics;
      categories.marketing = purposes.marketing;
      categories.personalization = purposes.personalization;
    }
    
    return categories;
  }
  
  // Convertir decisiones de consentimiento al formato de base de datos
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
      
      // Obtener metadatos para el envío y datos demográficos
      var deviceType = getDeviceType();
      var language = navigator.language || 'es';
      var userAgent = navigator.userAgent;
      
      // Recolectar datos demográficos completos utilizando el objeto window.CMP.demographics si está disponible
      var demographicData = {};
      
      if (window.CMP && window.CMP.demographics) {
        console.log("✅ [CMP] Usando datos demográficos recolectados por el script de consentimiento:", window.CMP.demographics);
        demographicData = window.CMP.demographics;
      } else {
        console.log("🔍 [CMP] No se encontraron datos demográficos del script, recolectando datos básicos");
        // Crear datos básicos cuando no hay datos completos disponibles
        
        // Detectar navegador básico
        var browserInfo = {
          name: 'unknown',
          version: 'unknown'
        };
        
        if (/firefox/i.test(userAgent)) {
          browserInfo.name = 'Firefox';
        } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
          browserInfo.name = 'Chrome';
        } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
          browserInfo.name = 'Safari';
        } else if (/edg/i.test(userAgent)) {
          browserInfo.name = 'Edge';
        } else if (/trident|msie/i.test(userAgent)) {
          browserInfo.name = 'Internet Explorer';
        } else if (/opera|opr/i.test(userAgent)) {
          browserInfo.name = 'Opera';
        }
        
        // Detectar sistema operativo básico
        var osInfo = {
          name: 'unknown',
          version: 'unknown'
        };
        
        if (/windows/i.test(userAgent)) {
          osInfo.name = 'Windows';
        } else if (/macintosh|mac os/i.test(userAgent)) {
          osInfo.name = 'MacOS';
        } else if (/linux/i.test(userAgent)) {
          osInfo.name = 'Linux';
        } else if (/android/i.test(userAgent)) {
          osInfo.name = 'Android';
        } else if (/iphone|ipad|ipod/i.test(userAgent)) {
          osInfo.name = 'iOS';
        }
        
        // Crear estructura demográfica básica
        demographicData = {
          browser: browserInfo,
          os: osInfo,
          device: {
            type: deviceType,
            screen: {
              width: window.screen ? window.screen.width : 'unknown',
              height: window.screen ? window.screen.height : 'unknown'
            }
          },
          timestamp: new Date().toISOString()
        };
        
        console.log("✅ [CMP] Datos demográficos básicos generados:", demographicData);
      }
      
      // Preparar los datos para enviar en formato unificado con datos demográficos enriquecidos
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
          deviceType: deviceType,
          demographicData: demographicData // Incluir datos demográficos completos
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
      
      // NUEVO: Formato unificado para todos los propósitos con todo en true
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
      
      // Tab switching - CORREGIDO: Buscar con la clase correcta
      var tabs = preferencesPanel.querySelectorAll('.cmp-pref-tab, .cmp-tab');
      var tabContents = preferencesPanel.querySelectorAll('[data-content]');
      
      if (tabs.length === 0) {
        console.warn("⚠️ No se encontraron tabs en el panel de preferencias");
      }
      
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var tabId = this.getAttribute('data-tab');
          
          // Si CMP.changePreferenceTab está disponible, usarla
          if (window.CMP && typeof window.CMP.changePreferenceTab === 'function') {
            console.log("🔄 Usando CMP.changePreferenceTab para:", tabId);
            window.CMP.changePreferenceTab(tabId);
          } else {
            // Fallback: lógica básica de cambio de tabs
            console.log("🔄 Usando fallback para cambio de tab:", tabId);
            
            // Reset all tabs - usar diferentes clases posibles
            tabs.forEach(function(t) { 
              t.classList.remove('active');
              t.style.setProperty('border-bottom-color', 'transparent', 'important');
              t.style.setProperty('color', '#333333', 'important');
              t.style.setProperty('background-color', 'transparent', 'important');
              // También remover clases con ID único si existen
              var uniqueId = t.getAttribute('data-unique-id');
              if (uniqueId) {
                t.classList.remove(uniqueId + '-tab-active');
              }
            });
            
            tabContents.forEach(function(c) { 
              c.style.setProperty('display', 'none', 'important');
              c.classList.remove('active');
              // También remover clases con ID único si existen
              var uniqueId = c.querySelector('[data-unique-id]');
              if (uniqueId) {
                var uid = uniqueId.getAttribute('data-unique-id');
                c.classList.remove(uid + '-tab-content-active');
              }
            });
            
            // Activate selected tab
            this.classList.add('active');
            this.style.setProperty('border-bottom-color', '#0078d4', 'important');
            this.style.setProperty('color', '#0078d4', 'important');
            this.style.setProperty('background-color', 'rgba(0, 120, 212, 0.1)', 'important');
            var uniqueId = this.getAttribute('data-unique-id');
            if (uniqueId) {
              this.classList.add(uniqueId + '-tab-active');
            }
            
            // Buscar contenido con data-content matching
            var activeContent = preferencesPanel.querySelector('[data-content="' + tabId + '"]');
            if (activeContent) {
              activeContent.style.setProperty('display', 'block', 'important');
              activeContent.classList.add('active');
              if (uniqueId) {
                activeContent.classList.add(uniqueId + '-tab-content-active');
              }
            } else {
              console.warn("⚠️ No se encontró contenido para tab:", tabId);
            }
          }
        });
      });
      
      // MEJORADO: Buscar botones por atributo data-cmp-action
      function setupButtonAction(action, callback) {
        var buttons = preferencesPanel.querySelectorAll('[data-cmp-action="' + action + '"]');
        if (buttons && buttons.length > 0) {
          console.log("✅ Configurando " + buttons.length + " botones para acción:", action);
          buttons.forEach(function(button) {
            button.addEventListener('click', callback);
          });
        } else {
          console.warn("⚠️ Botones no encontrados para acción:", action);
        }
      }
      
      // Configurar botones específicos de proveedores
      function setupVendorButtons() {
        var acceptAllVendorsBtn = preferencesPanel.querySelector('.cmp-accept-all-vendors');
        if (acceptAllVendorsBtn) {
          acceptAllVendorsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Clic en Aceptar Todo Proveedores (bannerExport)');
            
            // Marcar todos los checkboxes de vendors como checked
            preferencesPanel.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
              cb.checked = true;
              // Disparar evento change
              var event = new Event('change', { bubbles: true });
              cb.dispatchEvent(event);
            });
            console.log('✅ Todos los proveedores aceptados');
          });
        }
        
        var rejectAllVendorsBtn = preferencesPanel.querySelector('.cmp-reject-all-vendors');
        if (rejectAllVendorsBtn) {
          rejectAllVendorsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Clic en Rechazar Todo Proveedores (bannerExport)');
            
            // Marcar todos los checkboxes de vendors como unchecked
            preferencesPanel.querySelectorAll('input[type="checkbox"][data-vendor]').forEach(function(cb) {
              cb.checked = false;
              // Disparar evento change
              var event = new Event('change', { bubbles: true });
              cb.dispatchEvent(event);
            });
            console.log('❌ Todos los proveedores rechazados');
          });
        }
      }
      
      // Configurar acciones para todos los botones
      setupButtonAction('accept_all', function() {
        console.log("🖱️ Clic en botón aceptar todo");
        acceptAll();
        preferencesPanel.style.display = 'none';
      });
      
      setupButtonAction('reject_all', function() {
        console.log("🖱️ Clic en botón rechazar todo");
        rejectAll();
        preferencesPanel.style.display = 'none';
      });
      
      setupButtonAction('save_preferences', function() {
        console.log("🖱️ Clic en botón guardar preferencias");
        savePreferences();
        preferencesPanel.style.display = 'none';
      });
      
      setupButtonAction('close', function() {
        console.log("🖱️ Clic en botón cerrar");
        preferencesPanel.style.display = 'none';
        showBanner(); // Mostrar de nuevo el banner principal
      });
      
      // Configurar botones específicos de proveedores
      setupVendorButtons();
      
      // También configurar el botón de cierre en la esquina superior derecha
      var closeButton = preferencesPanel.querySelector('.cmp-close-button, .cmp-close-preferences');
      if (closeButton) {
        // Remover listener anterior si existe
        var newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);
        
        newCloseButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("🖱️ Clic en botón cerrar (esquina)");
          preferencesPanel.style.setProperty('display', 'none', 'important');
          // No llamar showBanner() aquí para evitar conflictos
        });
        console.log("✅ Event listener del botón X configurado correctamente");
      } else {
        console.warn("⚠️ Botón de cerrar X no encontrado");
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
      console.log("Estado actual del consentimiento:", currentState);
      
      // ARREGLO: Forzar que "necessary" siempre esté checked
      var necessaryInput = preferencesPanel.querySelector('[data-category="necessary"]');
      if (necessaryInput) {
        necessaryInput.checked = true;
        // Asegurarse de que el switch se vea como activado
        var necessarySwitch = necessaryInput.closest('.cmp-switch');
        if (necessarySwitch) {
          necessarySwitch.classList.add('necessary-switch');
        }
      }
      
      // MEJORADO: Mapear propósitos a categorías más amigables
      var categories = mapToCategories(currentState.purposes);
      console.log("Categorías mapeadas:", categories);
      
      // MEJORADO: Método directo para actualizar categorías
      function updateCategoryCheckbox(category, value) {
        var input = preferencesPanel.querySelector('[data-category="' + category + '"]');
        if (input) {
          console.log("🔍 Actualizando checkbox de categoría:", category, "a", value);
          input.checked = value;
        }
      }
      
      // Actualizar cada categoría individualmente
      updateCategoryCheckbox('analytics', categories.analytics);
      updateCategoryCheckbox('marketing', categories.marketing);
      updateCategoryCheckbox('personalization', categories.personalization);
      
      console.log("✅ Estado de consentimiento cargado en la UI");
    } catch (error) {
      console.error("❌ Error en loadConsentStateToUI:", error);
    }
  }
  
  // Guardar preferencias personalizadas
  // FUNCIÓN CORREGIDA: GUARDAR PREFERENCIAS PERSONALIZADAS
  function savePreferences() {
    try {
      console.log("🔄 Guardando preferencias personalizadas...");
      
      var preferencesPanel = document.getElementById('cmp-preferences');
      if (!preferencesPanel) {
        console.error("❌ Panel de preferencias no encontrado");
        return;
      }
      
      // IMPORTANTE: Comenzar con las cookies esenciales ya aceptadas
      var purposes = {
        1: true  // Propósito 1 (almacenamiento) siempre true
      };
      
      // También inicializar formato de categorías
      var categories = {
        necessary: true,  // Siempre true
        analytics: false,
        marketing: false,
        personalization: false
      };
      
      // MEJORADO: Log más detallado para depuración
      console.log("🔍 Recopilando estados de checkbox por categoría...");
      
      // Recoger estados de los checkboxes por categoría
      var categoryInputs = preferencesPanel.querySelectorAll('[data-category]');
      console.log("🔍 Encontrados", categoryInputs.length, "checkboxes de categoría");
      
      categoryInputs.forEach(function(input) {
        var category = input.getAttribute('data-category');
        var isChecked = input.checked;
        
        console.log("🔍 Categoría:", category, "Estado:", isChecked);
        
        // Guardar el estado en el formato de categorías
        categories[category] = isChecked || category === 'necessary';
        
        // Mapear de categorías a propósitos TCF específicamente
        if (category === 'analytics' && isChecked) {
          purposes[7] = true;
          purposes[8] = true;
          purposes[9] = true;
          purposes[10] = true;
        } else if (category === 'marketing' && isChecked) {
          purposes[2] = true;
          purposes[3] = true;
          purposes[4] = true;
        } else if (category === 'personalization' && isChecked) {
          purposes[5] = true;
          purposes[6] = true;
        }
        
        // Asegurar que categorías no seleccionadas estén explícitamente en false
        if (!isChecked && category !== 'necessary') {
          if (category === 'analytics') {
            purposes[7] = false;
            purposes[8] = false; 
            purposes[9] = false;
            purposes[10] = false;
          } else if (category === 'marketing') {
            purposes[2] = false;
            purposes[3] = false;
            purposes[4] = false;
          } else if (category === 'personalization') {
            purposes[5] = false;
            purposes[6] = false;
          }
        }
      });
      
      // Combinar propósitos y categorías en un solo objeto
      var finalPurposes = Object.assign({}, purposes, categories);
      
      console.log("🔍 Propósitos finales:", finalPurposes);
      
      // Crear objeto de decisiones completo
      var decisions = {
        purposes: finalPurposes,
        vendors: {},
        specialFeatures: {}
      };
      
      // Guardar consentimiento
      saveConsent(decisions, 'save_preferences');
      
      // Ocultar panel
      hideBanner();
      preferencesPanel.style.display = 'none';
      
      console.log("✅ Preferencias personalizadas guardadas:", decisions);
    } catch (error) {
      console.error("❌ Error en savePreferences:", error);
      // Intentar guardar lo básico en caso de error
      var fallbackDecisions = {
        purposes: { 1: true, necessary: true },
        vendors: {},
        specialFeatures: {}
      };
      saveConsent(fallbackDecisions, 'save_preferences_error');
    }
  }

  function showSavedFeedback() {
    try {
      // Crear elemento de feedback
      var feedback = document.createElement('div');
      feedback.style.cssText = "position: fixed;" +
          "bottom: 20px;" +
          "right: 20px;" +
          "background-color: #4CAF50;" +
          "color: white;" +
          "padding: 10px 20px;" +
          "border-radius: 4px;" +
          "box-shadow: 0 2px 4px rgba(0,0,0,0.2);" +
          "z-index: 999999;" +
          "opacity: 0;" +
          "transition: opacity 0.3s ease-in-out;";
      feedback.textContent = "Preferencias guardadas";
      
      // Añadir al DOM
      document.body.appendChild(feedback);
      
      // Mostrar con animación
      setTimeout(function() {
        feedback.style.opacity = "1";
    }, 10);
    
    // Ocultar después de 2 segundos
    setTimeout(function() {
      feedback.style.opacity = "0";
      setTimeout(function() {
        try {
          if (feedback && feedback.parentNode && feedback.parentNode.contains(feedback)) {
            feedback.parentNode.removeChild(feedback);
          }
        } catch (e) {
          console.warn("⚠️ Error al eliminar feedback:", e);
        }
      }, 300);
    }, 2000);
  } catch (e) {
    // Ignorar errores en feedback
    console.log("No se pudo mostrar feedback:", e);
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
      
      // IMPORTANTE: Asegurar que las cookies necesarias siempre estén activadas
      if (consent.purposes) {
        // Si usamos formato numérico de propósitos
        if (typeof consent.purposes === 'object' && !Array.isArray(consent.purposes)) {
          consent.purposes[1] = true; // Propósito 1 = almacenamiento (necesarias)
        }
        // Si usamos formato de categorías
        if (consent.purposes.necessary !== undefined) {
          consent.purposes.necessary = true;
        }
      }
      
      // Actualizar estado interno
      if (consent.purposes) {
        consentState.purposes = {...consent.purposes};
      }
      
      if (consent.vendors) {
        consentState.vendors = {...consent.vendors};
      }
      
      if (consent.specialFeatures) {
        consentState.specialFeatures = {...consent.specialFeatures};
      }
      
      consentState.lastUpdated = now;
      
      // Generar TC String según spec TCF v2.2
      consentState.tcString = TCStringGenerator.generateTCString({
        cmpId: config.cmpId,
        cmpVersion: config.cmpVersion,
        tcfPolicyVersion: config.tcfPolicyVersion,
        publisherCC: config.publisherCC,
        purposeConsents: consentState.purposes,
        vendorConsents: consentState.vendors,
        specialFeatures: consentState.specialFeatures,
        language: config.language,
        gvlVersion: config.gvlVersion || 3
      });
      
      // Guardar en cookie
      cookieUtils.set(config.cookieName, consentState.tcString, config.cookieExpiry);
      
      // Guardar también una versión más detallada para uso interno
      cookieUtils.set(bannerId + '-consent', JSON.stringify(consentState), config.cookieExpiry);
      
      // Aplicar consentimiento (activar/desactivar scripts)
      applyConsent(consentState);
      
      // Actualizar Google Consent Mode si está habilitado
      if (config.googleConsentMode && window.gtag) {
        updateGoogleConsentMode(consentState);
      }
      
      // Enviar evento si existe dataLayer
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'consent_update',
          consent_action: action,
          consent_categories: mapToCategories(consentState.purposes)
        });
      }
      
      // Enviar consentimiento al servidor si hay domainId
      if (config.domainId) {
        saveConsentToServer(consentState, action);
      }
      
      // Mostrar mensaje de confirmación
      showSavedFeedback();
      
      // Actualizar API TCF
      // Disparar eventos useractioncomplete a todos los listeners TCF registrados
      if (window.__tcfapi_commandQueue) {
        var eventCallbacks = {};
        var queueCopy = [...window.__tcfapi_commandQueue];
        
        // Extraer callbacks de eventos
        queueCopy.forEach(function(item, index) {
          if (item.command === 'addEventListener' && item.callbackId) {
            eventCallbacks[item.callbackId] = item.callback;
          }
        });
        
        // Llamar a todos los callbacks con el evento useractioncomplete
        Object.keys(eventCallbacks).forEach(function(callbackId) {
          var callback = eventCallbacks[callbackId];
          if (typeof callback === 'function') {
            callback({
              eventStatus: 'useractioncomplete',
              cmpStatus: 'loaded',
              listenerId: callbackId,
              tcString: consentState.tcString,
              tcfPolicyVersion: config.tcfPolicyVersion,
              cmpVersion: config.cmpVersion,
              cmpId: config.cmpId,
              gdprApplies: true,
              purposeConsents: consentState.purposes,
              vendorConsents: consentState.vendors,
              specialFeatures: consentState.specialFeatures
            }, true);
          }
        });
      }
      
      console.log("✅ Estado de consentimiento guardado, tcString generado:", consentState.tcString);
      return true;
    } catch (error) {
      console.error("❌ Error en saveConsent:", error);
      // Intentar guardar mínimo en caso de error
      
      // Estado mínimo en caso de error
      var minimalState = {
        purposes: { 1: true }, // Al menos propósito 1 (almacenamiento) siempre permitido
        vendors: {},
        specialFeatures: {},
        lastUpdated: now
      };
      
      // Guardar estado mínimo
      consentState = minimalState;
      cookieUtils.set(bannerId + '-consent', JSON.stringify(minimalState), config.cookieExpiry);
      
      return false;
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
      
      // Intentar obtener de cookie TCF estándar
      var tcString = cookieUtils.get(config.cookieName);
      if (tcString) {
        // En una implementación real, aquí decodificaríamos el TC string
        // Pero para simplificar, solo actualizamos el tcString
        consentState.tcString = tcString;
      }
      
      // Intentar obtener de cookie interna
      var savedConsent = cookieUtils.get(bannerId + '-consent');
      if (savedConsent) {
        try {
          const parsedConsent = JSON.parse(savedConsent);
          consentState = {...parsedConsent};
          
          // Verificar formato y actualizar si es necesario
          if (!consentState.purposes || typeof consentState.purposes !== 'object') {
            consentState.purposes = { 1: true };
          }
          
          // Verificar que propósito 1 esté siempre permitido
          if (!consentState.purposes[1]) {
            consentState.purposes[1] = true;
          }
          
          return consentState;
        } catch (e) {
          console.error("Error al parsear consentimiento guardado:", e);
        }
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
      var categories = mapToCategories(consent.purposes);
      
      // Aplicar a scripts según categoría
      var scripts = document.querySelectorAll('script[data-category]');
      scripts.forEach(function(script) {
        var category = script.getAttribute('data-category');
        
        // Las necesarias siempre se permiten
        if (category === 'necessary') {
          if (script.getAttribute('type') === 'text/plain') {
            executeScript(script);
            console.log("✅ Script necesario activado:", script.src || "inline");
          }
          return;
        }
        
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
  function updateGoogleConsentMode(consent) {
    try {
      if (!window.gtag) {
        console.log("ℹ️ Google Tag Manager no detectado");
        return;
      }
      
      console.log("🔄 Actualizando Google Consent Mode...");
      
      // Mapear categorías para el formato de Google
      var categories = mapToCategories(consent.purposes);
      
      // Estado de consentimiento para Google
      var consentModeParams = {
        'ad_storage': categories.marketing ? 'granted' : 'denied',
        'analytics_storage': categories.analytics ? 'granted' : 'denied',
        'personalization_storage': categories.personalization ? 'granted' : 'denied',
        'functionality_storage': 'granted', // Siempre permitido (funcional)
        'security_storage': 'granted' // Siempre permitido (seguridad)
      };
      
      // Actualizar en Google
      gtag('consent', 'update', consentModeParams);
      
      console.log("✅ Google Consent Mode actualizado:", consentModeParams);
    } catch (error) {
      console.error("❌ Error en updateGoogleConsentMode:", error);
    }
  }
  
  // Comprobar si existe consentimiento previo
  function hasExistingConsent() {
    try {
      // Intentar cookie TCF estándar primero
      var tcString = cookieUtils.get(config.cookieName);
      if (tcString) {
        return true;
      }
      
      // Intentar cookie interna
      var savedConsent = cookieUtils.get(bannerId + '-consent');
      if (!savedConsent) {
        return false;
      }
      
      // Verificar si es un JSON válido antes de parsear
      try {
        var parsed = JSON.parse(savedConsent);
        return !!parsed && !!parsed.lastUpdated;
      } catch (parseError) {
        console.warn("⚠️ Cookie de consentimiento no es JSON válido:", savedConsent);
        // Si no es JSON válido pero existe, consideramos que no hay consentimiento válido
        return false;
      }
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
        if (savedConsent) {
          try {
            var parsedConsent = JSON.parse(savedConsent);
            if (parsedConsent && parsedConsent.lastUpdated) {
              var lastUpdatedTime = new Date(parsedConsent.lastUpdated).getTime();
              var currentTime = new Date().getTime();
              
              // Convertir intervalo a milisegundos
              var intervalMs = config.reshowInterval * 1000;
              
              // Si no ha pasado suficiente tiempo, no mostrar
              if (currentTime - lastUpdatedTime < intervalMs) {
                return false;
              }
            }
          } catch (parseError) {
            console.warn("⚠️ Error al parsear savedConsent en shouldShowBanner:", parseError);
            // Si hay error de parsing, mostrar el banner por seguridad
            return true;
          }
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

    // NUEVA FUNCIÓN: Recolectar datos demográficos completos
    function collectDemographicData() {
      console.log("🔄 Recolectando datos demográficos completos...");
      
      try {
        // Datos del navegador
        const browserInfo = getBrowserInfo();
        
        // Datos del sistema operativo
        const osInfo = getOSInfo();
        
        // Datos del dispositivo
        const deviceInfo = getDeviceInfo();
        
        // Datos de la pantalla
        const screenInfo = {
          width: window.screen ? window.screen.width : 'unknown',
          height: window.screen ? window.screen.height : 'unknown',
          colorDepth: window.screen ? window.screen.colorDepth : 'unknown',
          pixelRatio: window.devicePixelRatio || 1
        };
        
        // Datos de la conexión
        const connectionInfo = getConnectionInfo();
        
        // Datos de la página/sitio
        const pageInfo = {
          url: encodeURIComponent(window.location.href),
          referrer: encodeURIComponent(document.referrer),
          title: document.title
        };

        // Datos del país (usar el valor de configuración o detectar)
        const countryInfo = {
          code: 'unknown',
          name: 'Unknown',
          language: navigator.language || 'unknown'
        };
        
        // Intentar obtener país del localStorage primero
        try {
          const storedCountryCode = localStorage.getItem('CMP_COUNTRY_CODE');
          const storedCountryName = localStorage.getItem('CMP_COUNTRY_NAME');
          if (storedCountryCode && storedCountryCode !== 'unknown') {
            countryInfo.code = storedCountryCode;
            countryInfo.name = storedCountryName || getCountryName(storedCountryCode) || 'Unknown';
          }
        } catch(e) {
          console.warn("Error accediendo a datos guardados de país:", e);
        }
        
        // Compilar todos los datos
        const demographicData = {
          browser: browserInfo,
          os: osInfo,
          device: deviceInfo,
          screen: screenInfo,
          connection: connectionInfo,
          page: pageInfo,
          country: countryInfo,
          timestamp: new Date().toISOString()
        };
        
        console.log("✅ Datos demográficos recolectados:", demographicData);
        return demographicData;
      } catch(e) {
        console.error("❌ Error recolectando datos demográficos:", e);
        // Devolver datos mínimos en caso de error
        return {
          browser: { name: 'unknown', version: 'unknown' },
          os: { name: 'unknown', version: 'unknown' },
          device: { type: getDeviceType(), vendor: 'unknown', model: 'unknown' },
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Función para detectar el navegador
    function getBrowserInfo() {
      const ua = navigator.userAgent;
      let browserName = 'unknown';
      let browserVersion = 'unknown';
      
      // Detectar navegador
      if (/Firefox\\/([0-9.]+)/.test(ua)) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\\/([0-9.]+)/)[1];
      } else if (/Edg\\/([0-9.]+)/.test(ua)) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edg\\/([0-9.]+)/)[1];
      } else if (/Chrome\\/([0-9.]+)/.test(ua) && !/Edg|OPR|Opera/.test(ua)) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\\/([0-9.]+)/)[1];
      } else if (/Safari\\/([0-9.]+)/.test(ua) && !/Chrome|Edg|OPR|Opera/.test(ua)) {
        browserName = 'Safari';
        if (/Version\\/([0-9.]+)/.test(ua)) {
          browserVersion = ua.match(/Version\\/([0-9.]+)/)[1];
        }
      } else if (/OPR\\/|Opera\\/([0-9.]+)/.test(ua)) {
        browserName = 'Opera';
        const match = ua.match(/OPR\\/([0-9.]+)/) || ua.match(/Opera\\/([0-9.]+)/);
        if (match) browserVersion = match[1];
      } else if (/MSIE|Trident/.test(ua)) {
        browserName = 'Internet Explorer';
        const match = ua.match(/MSIE ([0-9.]+)/) || ua.match(/rv:([0-9.]+)/);
        if (match) browserVersion = match[1];
      }
      
      return {
        name: browserName,
        version: browserVersion,
        userAgent: ua,
        language: navigator.language || 'unknown',
        cookies: navigator.cookieEnabled,
        engine: getEngineInfo()
      };
    }
    
    // Función auxiliar para detectar el motor de renderizado
    function getEngineInfo() {
      const ua = navigator.userAgent;
      if (/Gecko\\//.test(ua)) return 'Gecko';
      if (/WebKit\\//.test(ua)) return 'WebKit';
      if (/Trident\\//.test(ua)) return 'Trident';
      if (/Presto\\//.test(ua)) return 'Presto';
      return 'unknown';
    }
    
    // Función para detectar el sistema operativo
    function getOSInfo() {
      const ua = navigator.userAgent;
      let osName = 'unknown';
      let osVersion = 'unknown';
      
      if (/Windows NT ([0-9.]+)/.test(ua)) {
        osName = 'Windows';
        const version = ua.match(/Windows NT ([0-9.]+)/)[1];
        const versionMap = {
          '10.0': '10',
          '6.3': '8.1',
          '6.2': '8',
          '6.1': '7',
          '6.0': 'Vista',
          '5.2': 'XP',
          '5.1': 'XP',
          '5.0': '2000'
        };
        osVersion = versionMap[version] || version;
      } else if (/Mac OS X ([0-9_.]+)/.test(ua)) {
        osName = 'MacOS';
        osVersion = ua.match(/Mac OS X ([0-9_.]+)/)[1].replace(/_/g, '.');
      } else if (/Android ([0-9.]+)/.test(ua)) {
        osName = 'Android';
        osVersion = ua.match(/Android ([0-9.]+)/)[1];
      } else if (/iOS ([0-9_.]+)/.test(ua) || /iPhone OS ([0-9_.]+)/.test(ua)) {
        osName = 'iOS';
        const match = ua.match(/iOS ([0-9_.]+)/) || ua.match(/iPhone OS ([0-9_.]+)/);
        if (match) osVersion = match[1].replace(/_/g, '.');
      } else if (/Linux/.test(ua)) {
        osName = 'Linux';
      }
      
      return {
        name: osName,
        version: osVersion,
        platform: navigator.platform || 'unknown'
      };
    }
    
    // Función para detectar información del dispositivo
    function getDeviceInfo() {
      const ua = navigator.userAgent;
      const deviceType = getDeviceType();
      let vendor = 'unknown';
      let model = 'unknown';
      
      // Intentar detectar fabricante/modelo
      if (/iPhone|iPad|iPod/.test(ua)) {
        vendor = 'Apple';
        if (/iPhone/.test(ua)) model = 'iPhone';
        if (/iPad/.test(ua)) model = 'iPad';
        if (/iPod/.test(ua)) model = 'iPod';
      } else if (/Samsung/.test(ua)) {
        vendor = 'Samsung';
      } else if (/Pixel/.test(ua)) {
        vendor = 'Google';
        model = ua.match(/Pixel [0-9XL]+/i) ? ua.match(/Pixel [0-9XL]+/i)[0] : 'Pixel';
      } else if (/Huawei|Honor/.test(ua)) {
        vendor = /Honor/.test(ua) ? 'Honor' : 'Huawei';
      } else if (/Xiaomi|Redmi/.test(ua)) {
        vendor = /Redmi/.test(ua) ? 'Redmi' : 'Xiaomi';
      }
      
      // Detectar si es móvil o tablet
      const isMobile = /Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua);
      
      return {
        type: deviceType,
        vendor: vendor,
        model: model,
        mobile: isMobile,
        touchScreen: 'ontouchstart' in window
      };
    }
    
    // Función para obtener información de conexión
    function getConnectionInfo() {
      let connectionInfo = {
        type: 'unknown',
        downlink: 'unknown',
        rtt: 'unknown',
        effectiveType: 'unknown'
      };
      
      // Intentar obtener información de la API Navigator.connection
      try {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (connection) {
          connectionInfo = {
            type: connection.type || 'unknown',
            downlink: connection.downlink || 'unknown',
            rtt: connection.rtt || 'unknown', 
            effectiveType: connection.effectiveType || 'unknown',
            saveData: connection.saveData || false
          };
        }
      } catch(e) {
        console.warn("Error obteniendo información de conexión:", e);
      }
      
      return connectionInfo;
    }
    
    // Función para mapear códigos de país a nombres
    function getCountryName(countryCode) {
      const countryMap = {
        'AF': 'Afghanistan',
        'AL': 'Albania',
        'DZ': 'Algeria',
        'AR': 'Argentina',
        'AU': 'Australia',
        'AT': 'Austria',
        'BE': 'Belgium',
        'BR': 'Brazil',
        'CA': 'Canada',
        'CL': 'Chile',
        'CN': 'China',
        'CO': 'Colombia',
        'HR': 'Croatia',
        'CZ': 'Czech Republic',
        'DK': 'Denmark',
        'EG': 'Egypt',
        'FI': 'Finland',
        'FR': 'France',
        'DE': 'Germany',
        'GR': 'Greece',
        'HK': 'Hong Kong',
        'HU': 'Hungary',
        'IN': 'India',
        'ID': 'Indonesia',
        'IE': 'Ireland',
        'IL': 'Israel',
        'IT': 'Italy',
        'JP': 'Japan',
        'KR': 'South Korea',
        'LU': 'Luxembourg',
        'MY': 'Malaysia',
        'MX': 'Mexico',
        'NL': 'Netherlands',
        'NZ': 'New Zealand',
        'NG': 'Nigeria',
        'NO': 'Norway',
        'PK': 'Pakistan',
        'PE': 'Peru',
        'PH': 'Philippines',
        'PL': 'Poland',
        'PT': 'Portugal',
        'RO': 'Romania',
        'RU': 'Russia',
        'SA': 'Saudi Arabia',
        'SG': 'Singapore',
        'ZA': 'South Africa',
        'ES': 'Spain',
        'SE': 'Sweden',
        'CH': 'Switzerland',
        'TW': 'Taiwan',
        'TH': 'Thailand',
        'TR': 'Turkey',
        'UA': 'Ukraine',
        'AE': 'United Arab Emirates',
        'GB': 'United Kingdom',
        'US': 'United States',
        'VE': 'Venezuela',
        'VN': 'Vietnam'
      };
      
      return countryMap[countryCode] || null;
    }
    
    if (!window.CMP) {
      window.CMP = {
        // Recopilar y almacenar datos demográficos
        demographics: collectDemographicData(),
        
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
          cookieUtils.remove(config.cookieName);
          cookieUtils.remove(bannerId + '-consent');
          consentState = {
            purposes: { 1: true },
            vendors: {},
            specialFeatures: {},
            created: null,
            lastUpdated: null,
            tcString: ""
          };
          showBanner();
        },
        // TCF API expuesta para depuración y compatibilidad
        tcf: {
          getTCData: function(callback, vendorIds) {
            if (typeof callback !== 'function') {
              console.error("getTCData requiere un callback");
              return;
            }
            
            var tcData = {
              tcString: consentState.tcString,
              tcfPolicyVersion: config.tcfPolicyVersion,
              cmpVersion: config.cmpVersion,
              cmpId: config.cmpId,
              gdprApplies: true,
              cmpStatus: 'loaded',
              eventStatus: 'tcloaded',
              purposeConsents: {},
              vendorConsents: {},
              purposeLegitimateInterests: {},
              vendorLegitimateInterests: {},
              publisher: {
                consents: {},
                legitimateInterests: {},
                restrictions: {}
              }
            };
            
            // Mapear consentimientos de propósitos
            if (consentState.purposes) {
              Object.keys(consentState.purposes).forEach(function(id) {
                // Solo incluir IDs numéricas
                if (!isNaN(parseInt(id))) {
                  tcData.purposeConsents[id] = !!consentState.purposes[id];
                  tcData.publisher.consents[id] = !!consentState.purposes[id];
                }
              });
            }
            
            // Incluir vendors si se especifican
            if (vendorIds && Array.isArray(vendorIds)) {
              vendorIds.forEach(function(id) {
                tcData.vendorConsents[id] = consentState.vendors ? !!consentState.vendors[id] : false;
              });
            } else if (consentState.vendors) {
              Object.keys(consentState.vendors).forEach(function(id) {
                tcData.vendorConsents[id] = !!consentState.vendors[id];
              });
            }
            
            callback(tcData, true);
          }
        },
        // Debug mode para comprobar el estado actual
        debug: function() {
          return {
            config: config,
            consentState: consentState,
            hasConsent: hasExistingConsent(),
            tcfAPI: typeof window.__tcfapi === 'function',
            tcfLocator: !!window.frames['__tcfapiLocator'],
            cookies: {
              tcf: cookieUtils.get(config.cookieName),
              internal: cookieUtils.get(bannerId + '-consent')
            }
          };
        }
      };
      
      console.log("✅ Objeto CMP creado y expuesto globalmente");
    } else {
      console.log("ℹ️ Objeto CMP ya existe, asegurando funcionalidades");
      // Asegurar que todas las funciones están disponibles
      window.CMP.showBanner = showBanner;
      window.CMP.hideBanner = hideBanner;
      window.CMP.showPreferences = showPreferences;
      window.CMP.acceptAll = acceptAll;
      window.CMP.rejectAll = rejectAll;
      window.CMP.getConsentState = getConsentState;
    }
  }
  
  // Inicializar
  function init() {
    try {
      console.log("🚀 Inicializando CMP...");
      
      // Configurar polyfills
      setupCompatibility();
      
      // Verificar si estamos en una iframe o en la página principal
      var inIframe = window !== window.top;
      if (inIframe) {
        console.log("ℹ️ CMP ejecutándose en iframe, comportamiento reducido");
        
        // En iframe, mantenemos sólo las funciones esenciales TCF
        if (typeof window.__tcfapi !== 'function') {
          // Implementar __tcfapi para iframe
          window.__tcfapi = function(cmd, version, callback, parameter) {
            if (callback) {
              // Intentar pasar comandos a ventana principal
              try {
                window.top.postMessage({
                  __tcfapiCall: {
                    command: cmd,
                    version: version,
                    parameter: parameter,
                    callId: Math.random().toString(36).substring(2, 15)
                  }
                }, '*');
                
                // Para comandos que necesitan respuesta inmediata en iframe
                if (cmd === 'ping') {
                  callback({
                    gdprApplies: true,
                    cmpLoaded: false,
                    cmpStatus: 'stub',
                    displayStatus: 'hidden',
                    apiVersion: '2.2',
                    cmpId: config.cmpId,
                    cmpVersion: config.cmpVersion,
                    tcfPolicyVersion: config.tcfPolicyVersion
                  }, true);
                }
              } catch (e) {
                console.error("Error pasando comando a ventana principal:", e);
                callback(null, false);
              }
            }
          };
        }
        
        // No mostramos banner en iframes
        return;
      }
      
      // Estado de consentimiento (inicialmente solo cookies necesarias activadas)
      window.consentState = getConsentState();
      consentState = window.consentState;
      
      // Si hay consentimiento previo, aplicarlo
      if (hasExistingConsent()) {
        console.log("🔄 Consentimiento previo encontrado, aplicando...");
        applyConsent(consentState);
        
        // Actualizar Google Consent Mode si está habilitado
        if (config.googleConsentMode && window.gtag) {
          updateGoogleConsentMode(consentState);
        }
      } else {
        console.log("ℹ️ No se encontró consentimiento previo");
      }
      
      // Exponer API pública
      exposeGlobalCMP();
      
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
            try {
              if (banner && banner.parentNode && banner.parentNode.contains(banner)) {
                banner.parentNode.removeChild(banner);
              }
            } catch (e) {
              console.warn("⚠️ Error al ocultar banner de emergencia:", e);
            }
          },
          acceptAll: function() {
            cookieUtils.set(config.cookieName, "default-tcstring-emergency", config.cookieExpiry);
            cookieUtils.set(bannerId + '-consent', JSON.stringify({ 
              purposes: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
              created: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }), config.cookieExpiry);
            this.hideBanner();
          },
          rejectAll: function() {
            cookieUtils.set(config.cookieName, "default-tcstring-emergency", config.cookieExpiry);
            cookieUtils.set(bannerId + '-consent', JSON.stringify({ 
              purposes: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false },
              created: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }), config.cookieExpiry);
            this.hideBanner();
          }
        };
      } catch (recoveryError) {
        console.error("❌ Error crítico en CMP, no se pudo recuperar:", recoveryError);
      }
    }
  }
  
  // IMPORTANTE: Verificación de compatibilidad para evitar errores en consola
  if (window.addEventListener && document.querySelectorAll) {
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(init, 100);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 100);
      });
    }
  } else {
    console.error("❌ Navegador no compatible con CMP");
  }
  
  // Por último, verificar periódicamente el estado de CMP para asegurar que todo funcione
  var debugInterval = setInterval(function() {
    if (window.CMP_DEBUG_MODE) {
      console.log("🔍 CMP Debug: Estado actual del CMP:");
      console.log("- __tcfapi disponible:", typeof window.__tcfapi === 'function' ? "Sí ✓" : "No ✗");
      console.log("- __tcfapiLocator iframe:", window.frames['__tcfapiLocator'] ? "Existe ✓" : "No existe ✗");
      console.log("- Consent cookie:", document.cookie.includes(config.cookieName) ? "Existe ✓" : "No existe ✗");
      
      // Verificar banner visible
      var bannerElement = document.getElementById('cmp-banner');
      console.log("- Banner en DOM:", bannerElement ? "Existe ✓" : "No existe ✗");
      if (bannerElement) {
        console.log("- Banner visible:", window.getComputedStyle(bannerElement).display !== 'none' ? "Sí ✓" : "No ✗");
      }
      
      // Verificar si CMP está expuesto
      console.log("- window.CMP disponible:", typeof window.CMP === 'object' ? "Sí ✓" : "No ✗");
      
      // Auto-test de ping
      if (typeof window.__tcfapi === 'function') {
        window.__tcfapi('ping', 2, function(data, success) {
          console.log("- Ping auto-test:", success ? "Éxito ✓" : "Fallo ✗");
          console.log("- Ping respuesta:", data);
        });
      }
    }
  }, 5000); // Verificar cada 5 segundos
})();
    `;
    
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
          
          // Manejar múltiples formatos de rutas URL
          if (comp.content.startsWith('/')) {
            // Detectar y normalizar URL para imágenes
            if (comp.content.startsWith('/direct-image/')) {
              // Convertir /direct-image/ a /templates/images/ para consistencia
              const pathParts = comp.content.split('/');
              if (pathParts.length >= 4) {
                const bannerId = pathParts[2];
                const fileName = pathParts[3].split('?')[0]; // Eliminar parámetros de consulta
                comp.content = `/templates/images/${bannerId}/${fileName}`;
                console.log(`🔄 URL normalizada de direct-image a templates: ${originalContent} -> ${comp.content}`);
              }
            }
            
            // Convertir rutas relativas en absolutas
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
  generateGoogleConsentMode() {
    return `
  // Google Consent Mode Setup
  function updateGoogleConsent(consentState) {
    if (window.gtag) {
      // Mapear categorías de cookies a requisitos de Google
      var categories = mapToCategories(consentState);
      
      var consentModeParams = {
        'ad_storage': categories.marketing ? 'granted' : 'denied',
        'analytics_storage': categories.analytics ? 'granted' : 'denied',
        'personalization_storage': categories.personalization ? 'granted' : 'denied',
        'functionality_storage': 'granted', // Cookies funcionales (siempre)
        'security_storage': 'granted'       // Cookies de seguridad (siempre)
      };
      
      gtag('consent', 'update', consentModeParams);
      console.log("✅ Google Consent Mode actualizado:", consentModeParams);
    }
  }
  
  // Default state - rechazado hasta que el usuario decida
  if (window.dataLayer) {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    
    // Configuración inicial (waiting for user decision)
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'personalization_storage': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted',
      'wait_for_update': 500 // Esperar 500ms para actualización de consentimiento
    });
    
    // Registrar evento para analytics
    gtag('event', 'cmp_initialized', {
      'event_category': 'CMP',
      'event_label': 'CMP inicializado',
      'non_interaction': true
    });
  }
  `;
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
