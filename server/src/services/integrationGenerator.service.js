// services/integrationGenerator.service.js
const logger = require('../utils/logger');

class IntegrationGeneratorService {
  /**
   * Genera el código de todas las integraciones configuradas
   * @param {Object} integrations - Configuración de integraciones
   * @returns {String} - Código JavaScript con las integraciones
   */
  generateIntegrationsCode(integrations = {}) {
    try {
      console.log("🔍 DEBUG: Generando código para integraciones configuradas...");
      let integrationsCode = '';
      
      // Google Analytics
      if (integrations.googleAnalytics && integrations.googleAnalytics.enabled) {
        console.log("🔍 DEBUG: Incluyendo integración con Google Analytics...");
        integrationsCode += this.generateGoogleAnalyticsCode(integrations.googleAnalytics);
      }
      
      // Google Tag Manager
      if (integrations.gtm && integrations.gtm.enabled) {
        console.log("🔍 DEBUG: Incluyendo integración con Google Tag Manager...");
        integrationsCode += this.generateGTMCode(integrations.gtm);
      }
      
      // Facebook Pixel
      if (integrations.facebookPixel && integrations.facebookPixel.enabled) {
        console.log("🔍 DEBUG: Incluyendo integración con Facebook Pixel...");
        integrationsCode += this.generateFacebookPixelCode(integrations.facebookPixel);
      }
      
      // HubSpot
      if (integrations.hubspot && integrations.hubspot.enabled) {
        console.log("🔍 DEBUG: Incluyendo integración con HubSpot...");
        integrationsCode += this.generateHubSpotCode(integrations.hubspot);
      }
      
      // Webhooks
      if (integrations.webhooks && integrations.webhooks.length > 0) {
        console.log("🔍 DEBUG: Incluyendo integración con Webhooks...");
        integrationsCode += this.generateWebhooksCode(integrations.webhooks);
      }
      
      // Si no hay integraciones configuradas, devolver comentario vacío
      if (integrationsCode === '') {
        integrationsCode = '// No hay integraciones configuradas';
      }
      
      console.log(`✅ DEBUG: Código de integraciones generado (${integrationsCode.length} caracteres)`);
      return integrationsCode;
    } catch (error) {
      console.error('❌ DEBUG: Error generando código de integraciones:', error);
      return '// Error generando código de integraciones';
    }
  }

  // Método para Google Analytics
  generateGoogleAnalyticsCode(gaConfig) {
    const { measurementId, config = {} } = gaConfig;
    
    return `
    // Integración con Google Analytics
    function initializeGoogleAnalytics() {
      try {
        console.log("🔄 Inicializando Google Analytics...");
        
        // Solo inicializar si hay consentimiento para analytics
        var consentState = getConsentState();
        var analyticsAllowed = consentState.purposes && 
                              (consentState.purposes.analytics === true || 
                               consentState.purposes[7] === true || 
                               consentState.purposes[8] === true);
        
        if (!analyticsAllowed) {
          console.log("ℹ️ Analytics no permitido por consentimiento, omitiendo inicialización de GA");
          return;
        }
        
        // Inicializar Google Analytics de forma segura
        var gaScript = document.createElement('script');
        gaScript.setAttribute('data-category', 'analytics');
        gaScript.async = true;
        gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';
        document.head.appendChild(gaScript);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        
        // Aplicar configuración personalizada
        gtag('config', '${measurementId}', ${JSON.stringify(config)});
        
        console.log("✅ Google Analytics inicializado correctamente");
      } catch (error) {
        console.error("❌ Error inicializando Google Analytics:", error);
      }
    }

    // Registrar evento para inicializar GA después del consentimiento
    document.addEventListener('consentApplied', function(event) {
      if (event.detail && event.detail.categories && event.detail.categories.analytics) {
        initializeGoogleAnalytics();
      }
    });
    `;
  }

  // Método para Google Tag Manager
  generateGTMCode(gtmConfig) {
    const { containerId, config = {} } = gtmConfig;
    
    return `
    // Integración con Google Tag Manager
    function initializeGTM() {
      try {
        console.log("🔄 Inicializando Google Tag Manager...");
        
        // Cargamos GTM pero dejamos que Consent Mode maneje el consentimiento
        (function(w,d,s,l,i){
          w[l]=w[l]||[];
          w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
          j.setAttribute('data-category', 'necessary'); // GTM container siempre es necesario
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${containerId}');
        
        // Configuración adicional si existe
        if (window.dataLayer && ${Object.keys(config).length > 0}) {
          window.dataLayer.push(${JSON.stringify(config)});
        }
        
        console.log("✅ Google Tag Manager inicializado correctamente");
      } catch (error) {
        console.error("❌ Error inicializando Google Tag Manager:", error);
      }
    }

    // Inicializamos GTM inmediatamente, pero enviamos el estado de consentimiento
    initializeGTM();
    `;
  }

  // Método para Facebook Pixel
  generateFacebookPixelCode(fbConfig) {
    const { pixelId, config = {} } = fbConfig;
    
    return `
    // Integración con Facebook Pixel
    function initializeFacebookPixel() {
      try {
        console.log("🔄 Inicializando Facebook Pixel...");
        
        // Solo inicializar si hay consentimiento para marketing
        var consentState = getConsentState();
        var marketingAllowed = consentState.purposes && 
                              (consentState.purposes.marketing === true || 
                               consentState.purposes[2] === true || 
                               consentState.purposes[3] === true ||
                               consentState.purposes[4] === true);
        
        if (!marketingAllowed) {
          console.log("ℹ️ Marketing no permitido por consentimiento, omitiendo inicialización de Facebook Pixel");
          return;
        }
        
        // Inicializar Facebook Pixel
        !function(f,b,e,v,n,t,s) {
          if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.setAttribute('data-category', 'marketing');
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)
        }(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
        
        // Configuración avanzada si existe
        ${Object.keys(config).length > 0 ? 
          `try { fbq('set', ${JSON.stringify(config)}); } catch(e) { console.error("Error en configuración de FB Pixel:", e); }` 
          : ''}
        
        console.log("✅ Facebook Pixel inicializado correctamente");
      } catch (error) {
        console.error("❌ Error inicializando Facebook Pixel:", error);
      }
    }

    // Registrar evento para inicializar FB Pixel después del consentimiento
    document.addEventListener('consentApplied', function(event) {
      if (event.detail && event.detail.categories && event.detail.categories.marketing) {
        initializeFacebookPixel();
      }
    });
    `;
  }

  // Método para HubSpot
  generateHubSpotCode(hubspotConfig) {
    const { hubId, config = {} } = hubspotConfig;
    
    return `
    // Integración con HubSpot
    function initializeHubSpot() {
      try {
        console.log("🔄 Inicializando HubSpot...");
        
        // Solo inicializar si hay consentimiento para marketing
        var consentState = getConsentState();
        var marketingAllowed = consentState.purposes && 
                              (consentState.purposes.marketing === true || 
                               consentState.purposes[2] === true || 
                               consentState.purposes[3] === true ||
                               consentState.purposes[4] === true);
        
        if (!marketingAllowed) {
          console.log("ℹ️ Marketing no permitido por consentimiento, omitiendo inicialización de HubSpot");
          return;
        }
        
        // Inicializar HubSpot
        var hsScript = document.createElement('script');
        hsScript.setAttribute('data-category', 'marketing');
        hsScript.type = 'text/javascript';
        hsScript.async = true;
        hsScript.defer = true;
        hsScript.src = '//js.hs-scripts.com/${hubId}.js';
        document.body.appendChild(hsScript);
        
        // Configuración adicional si existe
        if (window.dataLayer && ${Object.keys(config).length > 0}) {
          window._hsq = window._hsq || [];
          _hsq.push(${JSON.stringify(config)});
        }
        
        console.log("✅ HubSpot inicializado correctamente");
      } catch (error) {
        console.error("❌ Error inicializando HubSpot:", error);
      }
    }

    // Registrar evento para inicializar HubSpot después del consentimiento
    document.addEventListener('consentApplied', function(event) {
      if (event.detail && event.detail.categories && event.detail.categories.marketing) {
        initializeHubSpot();
      }
    });
    `;
  }

  // Método para Webhooks
  generateWebhooksCode(webhooks) {
    if (!webhooks || webhooks.length === 0) {
      return '';
    }
    
    // Filtrar webhooks activos
    const activeWebhooks = webhooks.filter(webhook => webhook.status === 'active');
    
    if (activeWebhooks.length === 0) {
      return '// No hay webhooks activos configurados';
    }
    
    return `
    // Integración con Webhooks
    function sendWebhookNotification(action, decisions) {
      try {
        console.log("🔄 Enviando notificación webhook para acción:", action);
        
        // Preparar datos para el webhook
        var webhookData = {
          action: action,
          timestamp: new Date().toISOString(),
          decisions: decisions,
          userId: typeof getUserId === 'function' ? getUserId() : null,
          sessionId: typeof getSessionId === 'function' ? getSessionId() : null,
          metadata: {
            userAgent: navigator.userAgent,
            language: navigator.language || document.documentElement.lang || 'es',
            url: window.location.href,
            referrer: document.referrer,
            deviceType: getDeviceType()
          }
        };
        
        // Enviar a todos los webhooks configurados
        ${activeWebhooks.map(webhook => {
          const url = webhook.url;
          const events = webhook.events || ['accept_all', 'reject_all', 'save_preferences'];
          
          return `
        // Webhook: ${url}
        if (${JSON.stringify(events)}.includes(action)) {
          console.log("🔄 Enviando a webhook: ${url}");
          fetch('${url}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData),
            keepalive: true // Importante para asegurar el envío incluso si se cierra la página
          }).then(function(response) {
            if (!response.ok) throw new Error('Error en respuesta: ' + response.status);
            console.log("✅ Webhook enviado correctamente a ${url}");
          }).catch(function(error) {
            console.error("❌ Error enviando webhook a ${url}:", error);
          });
        }
          `;
        }).join('\n')}
        
      } catch (error) {
        console.error("❌ Error enviando notificaciones webhook:", error);
      }
    }

    // Sobrescribir funciones de consentimiento para incluir notificaciones webhook
    var originalSaveConsent = saveConsent;
    saveConsent = function(consent, action) {
      // Llamar a la función original primero
      var result = originalSaveConsent.apply(this, arguments);
      
      // Luego enviar la notificación webhook
      sendWebhookNotification(action, consent);
      
      return result;
    };
    `;
  }
}

module.exports = new IntegrationGeneratorService();