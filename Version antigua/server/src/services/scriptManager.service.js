// services/scriptManager.service.js
const logger = require('../utils/logger');

class ScriptManagerService {
  constructor() {
    this.knownIntegrations = {
      'google-analytics': {
        category: 'analytics',
        purposeIds: [1, 7, 8, 10],
        vendorId: 755,
        activationCode: this.getGoogleAnalyticsActivation()
      },
      'google-tag-manager': {
        category: 'marketing',
        purposeIds: [1, 2, 3, 4, 7, 8, 9, 10],
        vendorId: 755,
        activationCode: this.getGoogleTagManagerActivation()
      },
      'facebook-pixel': {
        category: 'marketing',
        purposeIds: [1, 2, 3, 4],
        vendorId: 891,
        activationCode: this.getFacebookPixelActivation()
      },
      'hotjar': {
        category: 'analytics',
        purposeIds: [1, 5, 7, 8, 9],
        vendorId: 765,
        activationCode: this.getHotjarActivation()
      }
    };
  }

  /**
   * Genera el código para gestionar scripts basados en el consentimiento
   * @param {Object} options - Opciones de configuración
   * @returns {String} - Código JavaScript para gestión de scripts
   */
  generateScriptManager(options = {}) {
    const {
      includeDefaultCategories = true,
      googleConsentMode = true
    } = options;

    // Definir la función de Google Consent Mode fuera de la template string
    const googleConsentModeCode = this.generateGoogleConsentMode();

    return `
    // Script Manager for Consent-Based Script Loading
    (function() {
      // Estado de consentimiento por categoría
      var consentState = {
        necessary: true, // Siempre permitido
        analytics: false,
        marketing: false,
        personalization: false
      };
      
      // Mapeo de propósitos TCF a categorías
      var purposeToCategory = {
        // Propósito 1: Almacenar/acceder a información en dispositivo
        1: ['necessary'],
        
        // Propósito 2, 3, 4: Anuncios
        2: ['marketing'],
        3: ['marketing'],
        4: ['marketing'],
        
        // Propósito 5, 6: Contenido personalizado
        5: ['personalization'],
        6: ['personalization'],
        
        // Propósito 7, 8, 9, 10: Medición y análisis
        7: ['analytics'],
        8: ['analytics'],
        9: ['analytics'],
        10: ['analytics']
      };
      
      // Almacenar scripts pendientes
      var pendingScripts = [];
      
      // Inicializar el gestor de scripts
      function init() {
        // Buscar scripts con type="text/plain" que necesitan activarse
        findConsentBasedScripts();
        
        // Inicializar integración con TCF API
        setupTCFIntegration();
        
        ${googleConsentMode ? googleConsentModeCode : ''}
      }
      
      // Buscar scripts en el documento que requieren consentimiento
      function findConsentBasedScripts() {
        var scripts = document.querySelectorAll('script[type="text/plain"]');
        
        scripts.forEach(function(script) {
          var scriptCategory = null;
          
          // Detectar categoría del script por clase
          ${includeDefaultCategories ? `
          ['necessary', 'analytics', 'marketing', 'personalization'].forEach(function(category) {
            if (script.classList.contains('cmp-' + category)) {
              scriptCategory = category;
            }
          });` : ''}
          
          // Añadir a pendientes
          if (scriptCategory) {
            pendingScripts.push({
              element: script,
              category: scriptCategory,
              executed: false
            });
          }
        });
        
        // Primera ejecución para scripts de categoría 'necessary'
        executeScriptsByCategory('necessary');
      }
      
      // Procesar scripts por categoría
      function executeScriptsByCategory(category) {
        pendingScripts.forEach(function(pendingScript) {
          if (pendingScript.category === category && !pendingScript.executed) {
            activateScript(pendingScript.element);
            pendingScript.executed = true;
          }
        });
      }
      
      // Activar un script específico
      function activateScript(scriptElement) {
        var newScript = document.createElement('script');
        
        // Copiar atributos
        Array.from(scriptElement.attributes).forEach(function(attr) {
          if (attr.name !== 'type') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        
        // Establecer type correcto
        newScript.setAttribute('type', 'text/javascript');
        
        // Contenido o src
        if (scriptElement.src) {
          newScript.src = scriptElement.src;
        } else {
          newScript.textContent = scriptElement.textContent;
        }
        
        // Marcar como activado en el original
        scriptElement.setAttribute('data-activated', 'true');
        
        // Insertar en el DOM
        scriptElement.parentNode.insertBefore(newScript, scriptElement);
      }
      
      // Actualizar consentimiento para todas las categorías
      function updateConsent(purposesConsents) {
        // Resetear estados (excepto 'necessary')
        consentState.analytics = false;
        consentState.marketing = false;
        consentState.personalization = false;
        
        // Actualizar estado basado en propósitos consentidos
        Object.keys(purposesConsents).forEach(function(purposeId) {
          var isConsented = purposesConsents[purposeId];
          
          if (isConsented && purposeToCategory[purposeId]) {
            purposeToCategory[purposeId].forEach(function(category) {
              if (category !== 'necessary') { // 'necessary' siempre true
                consentState[category] = true;
              }
            });
          }
        });
        
        // Ejecutar scripts por categoría
        Object.keys(consentState).forEach(function(category) {
          if (consentState[category]) {
            executeScriptsByCategory(category);
          }
        });
        
        return consentState;
      }
      
      // Configurar integración con TCF
      function setupTCFIntegration() {
        // Verificar si existe TCF API
        if (typeof window.__tcfapi !== 'function') {
          console.warn('TCF API not available. Scripts will remain inactive until consent is provided.');
          return;
        }
        
        // Escuchar cambios de consentimiento
        window.__tcfapi('addEventListener', 2, function(tcData, success) {
          if (success && tcData.eventStatus === 'tcloaded' || tcData.eventStatus === 'useractioncomplete') {
            // Actualizar consentimientos basados en TCF data
            if (tcData.purpose && tcData.purpose.consents) {
              updateConsent(tcData.purpose.consents);
            }
          }
        });
      }
      
      // Método para verificar si una categoría tiene consentimiento
      function hasConsent(category) {
        return !!consentState[category];
      }
      
      // Método para comprobar si un script específico puede activarse
      function canExecuteScript(element) {
        var scriptCategory = null;
        
        // Detectar categoría
        ['necessary', 'analytics', 'marketing', 'personalization'].forEach(function(category) {
          if (element.classList.contains('cmp-' + category)) {
            scriptCategory = category;
          }
        });
        
        return scriptCategory ? hasConsent(scriptCategory) : false;
      }
      
      // Exponer API pública
      window.CMP = window.CMP || {};
      window.CMP.scriptManager = {
        updateConsent: updateConsent,
        activateScript: activateScript,
        hasConsent: hasConsent,
        getState: function() { return Object.assign({}, consentState); }
      };
      
      // Inicializar cuando el DOM esté listo
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
    `;
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
   * Genera código de activación para Google Analytics
   * @returns {String} - Código de activación
   */
  getGoogleAnalyticsActivation() {
    return `
    // Google Analytics Activation
    function activateGoogleAnalytics(trackingId) {
      if (!trackingId) {
        console.error('Google Analytics tracking ID is required');
        return;
      }
      
      // Crear script de GA
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      
      // Inicializar con anonimización de IP
      ga('create', trackingId, { 'anonymizeIp': true });
      ga('send', 'pageview');
      
      console.log('Google Analytics activated with ID: ' + trackingId);
    }
    `;
  }

  /**
   * Genera código de activación para Google Tag Manager
   * @returns {String} - Código de activación
   */
  getGoogleTagManagerActivation() {
    return `
    // Google Tag Manager Activation
    function activateGoogleTagManager(containerId) {
      if (!containerId) {
        console.error('Google Tag Manager container ID is required');
        return;
      }
      
      // Crear script de GTM
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer',containerId);
      
      // Crear noscript iframe para GTM (opcional)
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.googletagmanager.com/ns.html?id=' + containerId;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      
      var noscript = document.createElement('noscript');
      noscript.appendChild(iframe);
      
      document.body.insertBefore(noscript, document.body.firstChild);
      
      console.log('Google Tag Manager activated with container ID: ' + containerId);
    }
    `;
  }

  /**
   * Genera código de activación para Facebook Pixel
   * @returns {String} - Código de activación
   */
  getFacebookPixelActivation() {
    return `
    // Facebook Pixel Activation
    function activateFacebookPixel(pixelId) {
      if (!pixelId) {
        console.error('Facebook Pixel ID is required');
        return;
      }
      
      // Crear script de Facebook Pixel
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      // Inicializar con consentimiento otorgado
      fbq('consent', 'grant');
      fbq('init', pixelId);
      fbq('track', 'PageView');
      
      console.log('Facebook Pixel activated with ID: ' + pixelId);
    }
    `;
  }

  /**
   * Genera código de activación para Hotjar
   * @returns {String} - Código de activación
   */
  getHotjarActivation() {
    return `
    // Hotjar Activation
    function activateHotjar(hjid) {
      if (!hjid) {
        console.error('Hotjar Site ID is required');
        return;
      }
      
      // Crear script de Hotjar
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:hjid,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      
      console.log('Hotjar activated with Site ID: ' + hjid);
    }
    `;
  }

  /**
   * Genera código HTML para integrar un script específico
   * @param {String} providerName - Nombre del proveedor
   * @param {Object} options - Opciones específicas
   * @returns {String} - Código HTML del script
   */
  generateProviderScriptTag(providerName, options = {}) {
    const provider = this.knownIntegrations[providerName];
    
    if (!provider) {
      logger.error(`Unknown provider: ${providerName}`);
      return null;
    }
    
    const { trackingId, containerId, pixelId, siteId } = options;
    
    // Determinar ID a usar
    let providerId = '';
    switch (providerName) {
      case 'google-analytics':
        providerId = trackingId;
        break;
      case 'google-tag-manager':
        providerId = containerId;
        break;
      case 'facebook-pixel':
        providerId = pixelId;
        break;
      case 'hotjar':
        providerId = siteId;
        break;
    }
    
    if (!providerId) {
      logger.error(`Missing ID for provider ${providerName}`);
      return null;
    }
    
    // Crear script tag
    return `
    <!-- ${providerName} integration (requires ${provider.category} consent) -->
    <script type="text/plain" class="cmp-${provider.category}" data-provider="${providerName}" data-provider-id="${providerId}">
      try {
        ${providerName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}('${providerId}');
      } catch (e) {
        console.error('Error activating ${providerName}:', e);
      }
    </script>
    `;
  }

  /**
   * Genera todas las funciones de activación conocidas
   * @returns {String} - Código con funciones de activación
   */
  generateAllProviderActivationFunctions() {
    return Object.keys(this.knownIntegrations)
      .map(provider => this.knownIntegrations[provider].activationCode)
      .join('\n\n');
  }
}

module.exports = new ScriptManagerService();