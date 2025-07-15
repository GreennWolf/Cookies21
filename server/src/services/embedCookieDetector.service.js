/**
 * EMBED COOKIE DETECTOR SERVICE
 * 
 * Sistema avanzado de detección de cookies que se ejecuta dentro del banner embed
 * Proporciona análisis en tiempo real con alta precisión desde el contexto de la página
 */

const logger = require('../utils/logger');

class EmbedCookieDetectorService {
  constructor() {
    this.version = '1.0.0';
    this.detectorId = 'embed-detector';
  }

  /**
   * Genera el código JavaScript que se inyecta en el banner para detectar cookies
   * @param {Object} config - Configuración del detector
   * @returns {String} Código JavaScript minificado
   */
  generateDetectorScript(config = {}) {
    const {
      domainId,
      clientId,
      apiEndpoint = '/api/v1/embed/cookies/process',
      enableRealTime = true,
      enableStackTrace = true,
      enableStorage = true,
      enableThirdParty = true,
      debugMode = false
    } = config;

    return `
      (function() {
        'use strict';
        
        // Configuración del detector
        const DETECTOR_CONFIG = {
          domainId: '${domainId}',
          clientId: '${clientId}',
          apiEndpoint: '${apiEndpoint}',
          enableRealTime: ${enableRealTime},
          enableStackTrace: ${enableStackTrace},
          enableStorage: ${enableStorage},
          enableThirdParty: ${enableThirdParty},
          debugMode: ${debugMode},
          version: '${this.version}'
        };
        
        // Estado del detector
        const DETECTOR_STATE = {
          initialized: false,
          detectedCookies: new Map(),
          detectedStorage: new Map(),
          thirdPartyScripts: new Set(),
          interceptorsActive: false,
          sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        
        // Utilidades
        const utils = {
          log: function(message, data) {
            if (DETECTOR_CONFIG.debugMode) {
              console.log('[CookieDetector]', message, data);
            }
          },
          
          error: function(message, error) {
            if (DETECTOR_CONFIG.debugMode) {
              console.error('[CookieDetector]', message, error);
            }
          },
          
          // Obtener stack trace limpio
          getCleanStackTrace: function() {
            if (!DETECTOR_CONFIG.enableStackTrace) return null;
            
            try {
              const stack = new Error().stack;
              return stack.split('\\n')
                .slice(3) // Remover líneas internas del detector
                .map(line => line.trim())
                .filter(line => line && !line.includes('CookieDetector'))
                .slice(0, 5) // Solo las 5 líneas más relevantes
                .join('\\n');
            } catch (e) {
              return null;
            }
          },
          
          // Detectar vendor desde stack trace
          detectVendorFromStack: function(stack) {
            if (!stack) return null;
            
            const vendorPatterns = {
              'Google Analytics': [/google-analytics\\.com/, /gtag/, /analytics\\.js/, /_ga/, /gtm\\.js/],
              'Google Tag Manager': [/googletagmanager\\.com/, /gtm\\.js/],
              'Facebook Pixel': [/connect\\.facebook\\.net/, /fbevents\\.js/, /fbq/],
              'Hotjar': [/hotjar\\.com/, /hj\\.js/],
              'Mixpanel': [/mixpanel\\.com/, /mixpanel\\.js/],
              'Segment': [/segment\\.com/, /analytics\\.js/],
              'Google Ads': [/googlesyndication\\.com/, /adsbygoogle/],
              'YouTube': [/youtube\\.com/, /ytimg\\.com/],
              'Twitter': [/twitter\\.com/, /twimg\\.com/],
              'LinkedIn': [/linkedin\\.com/, /licdn\\.com/],
              'Pinterest': [/pinterest\\.com/, /pinimg\\.com/],
              'TikTok': [/tiktok\\.com/, /bytedance/, /tt_/, /ttid/],
              'Amazon': [/amazon-adsystem\\.com/, /amazonadvertising/],
              'Cloudflare': [/cloudflare\\.com/, /cf-ray/],
              'WordPress': [/wp-content/, /wordpress/],
              'WooCommerce': [/woocommerce/, /wc-/],
              'Shopify': [/shopify/, /myshopify/],
              'Stripe': [/stripe\\.com/, /js\\.stripe/],
              'PayPal': [/paypal\\.com/, /paypalobjects/],
              'Mailchimp': [/mailchimp\\.com/, /list-manage/],
              'HubSpot': [/hubspot\\.com/, /hsforms/],
              'Zendesk': [/zendesk\\.com/, /zopim/],
              'Intercom': [/intercom\\.io/, /intercom\\.com/],
              'Drift': [/drift\\.com/, /driftt/],
              'Crisp': [/crisp\\.chat/]
            };
            
            const stackLower = stack.toLowerCase();
            for (const [vendor, patterns] of Object.entries(vendorPatterns)) {
              if (patterns.some(pattern => pattern.test(stackLower))) {
                return vendor;
              }
            }
            
            return null;
          },
          
          // Categorizar cookie por nombre y vendor
          categorizeCookie: function(name, vendor, domain) {
            const nameLower = (name || '').toLowerCase();
            
            // Categorización por vendor conocido
            const vendorCategories = {
              'Google Analytics': 'analytics',
              'Google Tag Manager': 'analytics',
              'Facebook Pixel': 'advertising',
              'Hotjar': 'analytics',
              'Mixpanel': 'analytics',
              'Segment': 'analytics',
              'Google Ads': 'advertising',
              'YouTube': 'advertising',
              'Twitter': 'advertising',
              'LinkedIn': 'advertising',
              'Pinterest': 'advertising',
              'TikTok': 'advertising',
              'Amazon': 'advertising',
              'Cloudflare': 'performance',
              'WordPress': 'necessary',
              'WooCommerce': 'necessary',
              'Shopify': 'necessary',
              'Stripe': 'necessary',
              'PayPal': 'necessary',
              // Nuevos vendors del sistema
              'Cookies21 CMP': 'necessary',
              'IAB Consent Framework': 'necessary',
              'Sistema de Consent': 'necessary',
              'Sistema de Idioma': 'preferences',
              'Sistema de Tema': 'preferences',
              'Sistema de Zona Horaria': 'preferences',
              'Sistema de Sesión': 'necessary',
              'Sistema de Autenticación': 'necessary',
              'Sistema de Carrito': 'necessary',
              'Sistema de Pedidos': 'necessary',
              'Sistema de Favoritos': 'preferences',
              'Sistema de Preferencias': 'preferences',
              'Sistema de Configuración': 'preferences',
              'Sistema de Localización': 'preferences',
              'Sistema de Debug': 'performance',
              'Sistema de Rendimiento': 'performance',
              'Sistema de Cache': 'performance'
            };
            
            if (vendor && vendorCategories[vendor]) {
              return vendorCategories[vendor];
            }
            
            // Categorización por patrones de nombre específicos
            
            // Cookies de análitica
            if (nameLower.match(/^(_ga|_gid|_gat|__utm|_gtm|_gac|_gali|_gcl|_dc_gtm)/)) return 'analytics';
            if (nameLower.includes('analytics') || nameLower.includes('tracking') || nameLower.includes('stats')) return 'analytics';
            
            // Cookies de publicidad/marketing
            if (nameLower.match(/^(_fb|fbp|fbc|fr|xs|datr|sb|c_user)/)) return 'advertising';
            if (nameLower.includes('ads') || nameLower.includes('doubleclick') || nameLower.includes('marketing')) return 'advertising';
            
            // Cookies necesarias para funcionamiento
            if (nameLower.match(/^(sess|session|auth|token|csrf|xsrf|login|logged)/)) return 'necessary';
            if (nameLower.match(/^(cart|checkout|woocommerce|wp-)/)) return 'necessary';
            if (nameLower.includes('banner-') && nameLower.includes('-consent')) return 'necessary';
            if (nameLower === 'euconsent-v2') return 'necessary';
            if (nameLower.includes('security') || nameLower.includes('csrf')) return 'necessary';
            
            // Cookies de preferencias/personalización
            if (nameLower.match(/^(pref|preference|lang|language|locale|theme|mode)/)) return 'preferences';
            if (nameLower.includes('cookie_consent') || nameLower.includes('gdpr') || nameLower.includes('consent')) return 'preferences';
            if (nameLower.includes('settings') || nameLower.includes('config')) return 'preferences';
            if (nameLower.includes('currency') || nameLower.includes('timezone') || nameLower.includes('region')) return 'preferences';
            
            // Cookies de rendimiento
            if (nameLower.includes('performance') || nameLower.includes('cache') || nameLower.includes('cdn')) return 'performance';
            if (nameLower.includes('speed') || nameLower.includes('optimize')) return 'performance';
            
            // Cookies funcionales
            if (nameLower.includes('wishlist') || nameLower.includes('favorites') || nameLower.includes('compare')) return 'functional';
            if (nameLower.includes('search') || nameLower.includes('filter') || nameLower.includes('sort')) return 'functional';
            
            // Si tiene patron reconocible pero no categorizado, intentar inferir
            if (nameLower.includes('user') || nameLower.includes('visitor')) {
              if (nameLower.includes('id') || nameLower.includes('session')) return 'necessary';
              return 'preferences';
            }
            
            // Si no se puede categorizar específicamente, usar 'other' en lugar de 'unknown'
            return 'other';
          },
          
          // Detectar si es tercero
          isThirdParty: function(cookieDomain, pageDomain) {
            if (!cookieDomain || !pageDomain) return false;
            
            const cleanCookieDomain = cookieDomain.replace(/^\\./, '');
            const cleanPageDomain = pageDomain.replace(/^www\\./, '');
            
            return !cleanPageDomain.endsWith(cleanCookieDomain) && 
                   !cleanCookieDomain.endsWith(cleanPageDomain);
          },
          
          // Enviar datos al servidor
          sendToServer: function(data) {
            if (!DETECTOR_CONFIG.apiEndpoint) return;
            
            try {
              fetch(DETECTOR_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...data,
                  domainId: DETECTOR_CONFIG.domainId,
                  clientId: DETECTOR_CONFIG.clientId,
                  sessionId: DETECTOR_STATE.sessionId,
                  timestamp: Date.now(),
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  detectorVersion: DETECTOR_CONFIG.version
                }),
                credentials: 'same-origin'
              }).catch(error => {
                utils.error('Failed to send data to server:', error);
              });
            } catch (error) {
              utils.error('Error sending data:', error);
            }
          }
        };
        
        // Detector principal
        const detector = {
          // Inicializar detector
          init: function() {
            if (DETECTOR_STATE.initialized) return;
            
            utils.log('Initializing Cookie Detector', DETECTOR_CONFIG);
            
            // Detectar cookies existentes
            this.detectExistingCookies();
            
            // Configurar interceptores
            this.setupInterceptors();
            
            // Analizar storage si está habilitado
            if (DETECTOR_CONFIG.enableStorage) {
              this.analyzeStorage();
            }
            
            // Analizar scripts de terceros
            if (DETECTOR_CONFIG.enableThirdParty) {
              this.analyzeThirdPartyScripts();
            }
            
            DETECTOR_STATE.initialized = true;
            utils.log('Cookie Detector initialized successfully');
            
            // Enviar reporte inicial
            setTimeout(() => this.sendInitialReport(), 1000);
          },
          
          // Detectar cookies existentes
          detectExistingCookies: function() {
            try {
              const cookies = document.cookie;
              if (!cookies) return;
              
              const cookieArray = cookies.split(';').map(c => c.trim()).filter(c => c);
              const pageDomain = window.location.hostname;
              
              cookieArray.forEach(cookieStr => {
                const [name, value] = cookieStr.split('=');
                if (name && name.trim()) {
                  const cookieName = name.trim();
                  const cookieValue = value ? value.trim() : '';
                  
                  this.processCookie({
                    name: cookieName,
                    value: cookieValue,
                    domain: pageDomain,
                    source: 'existing',
                    method: 'document.cookie'
                  });
                }
              });
            } catch (error) {
              utils.error('Error detecting existing cookies:', error);
            }
          },
          
          // Procesar una cookie detectada
          processCookie: function(cookieData) {
            const {
              name,
              value,
              domain = window.location.hostname,
              source = 'unknown',
              method = 'unknown',
              stackTrace = null
            } = cookieData;
            
            // Crear clave única
            const cookieKey = \`\${name}_\${domain}_\${source}\`;
            
            // Si ya fue procesada, skip
            if (DETECTOR_STATE.detectedCookies.has(cookieKey)) {
              return;
            }
            
            // Detectar vendor y categoría
            const vendor = utils.detectVendorFromStack(stackTrace) || this.detectVendorFromName(name);
            const category = utils.categorizeCookie(name, vendor, domain);
            const isThirdParty = utils.isThirdParty(domain, window.location.hostname);
            
            // Crear objeto de cookie procesada
            const processedCookie = {
              name,
              value: value.substring(0, 200), // Limitar valor por seguridad
              domain,
              source,
              method,
              vendor,
              category,
              isThirdParty,
              stackTrace: stackTrace ? stackTrace.substring(0, 500) : null,
              timestamp: Date.now(),
              size: value ? value.length : 0
            };
            
            // Guardar cookie procesada
            DETECTOR_STATE.detectedCookies.set(cookieKey, processedCookie);
            
            utils.log('Cookie detected:', {
              name,
              vendor,
              category,
              source,
              isThirdParty
            });
            
            // Enviar en tiempo real si está habilitado
            if (DETECTOR_CONFIG.enableRealTime) {
              utils.sendToServer({
                type: 'cookie_detected',
                cookie: processedCookie
              });
            }
          },
          
          // Detectar vendor por nombre de cookie
          detectVendorFromName: function(name) {
            const nameLower = (name || '').toLowerCase();
            
            // Patrones específicos de vendors conocidos
            if (nameLower.match(/^(_ga|_gid|_gat|__utm|_gac|_gali|_gcl)/)) return 'Google Analytics';
            if (nameLower.match(/^(_gtm|gtm_)/)) return 'Google Tag Manager';
            if (nameLower.match(/^(_fb|fbp|fbc|fr)/)) return 'Facebook Pixel';
            if (nameLower.match(/^(_hj|hj_)/)) return 'Hotjar';
            if (nameLower.match(/^(mp_|mixpanel)/)) return 'Mixpanel';
            if (nameLower.match(/^(ajs_|segment_)/)) return 'Segment';
            if (nameLower.match(/^(woocommerce_|wp_woocommerce_)/)) return 'WooCommerce';
            if (nameLower.match(/^(wp-|wordpress_)/)) return 'WordPress';
            if (nameLower.match(/^(__cf|cf_|__cfduid)/)) return 'Cloudflare';
            if (nameLower.match(/^(__stripe_|stripe_)/)) return 'Stripe';
            if (nameLower.match(/^(paypal|PYPF)/)) return 'PayPal';
            if (nameLower.match(/^(tt_|ttid|tiktok)/)) return 'TikTok';
            if (nameLower.match(/^(yt|youtube)/)) return 'YouTube';

            // Cookies específicas del sistema de consent
            if (nameLower.includes('banner-') && nameLower.includes('-consent')) return 'Cookies21 CMP';
            if (nameLower === 'euconsent-v2') return 'IAB Consent Framework';
            if (nameLower === 'cookieconsentgiven') return 'Sistema de Consent';
            if (nameLower.includes('gdpr') || nameLower.includes('consent')) return 'Sistema de Consent';
            
            // Cookies de preferencias del sitio
            if (nameLower.includes('language') || nameLower.includes('lang') || nameLower === 'locale') return 'Sistema de Idioma';
            if (nameLower.includes('theme') || nameLower.includes('mode') || nameLower.includes('dark')) return 'Sistema de Tema';
            if (nameLower.includes('timezone') || nameLower.includes('tz')) return 'Sistema de Zona Horaria';
            
            // Cookies de sesión y autenticación
            if (nameLower.includes('session') && !nameLower.includes('google')) return 'Sistema de Sesión';
            if (nameLower.includes('auth') || nameLower.includes('token') || nameLower.includes('csrf')) return 'Sistema de Autenticación';
            if (nameLower.includes('login') || nameLower.includes('logged') || nameLower.includes('user_id')) return 'Sistema de Autenticación';
            
            // Cookies de comercio electrónico
            if (nameLower.includes('cart') && !nameLower.includes('woocommerce')) return 'Sistema de Carrito';
            if (nameLower.includes('checkout') || nameLower.includes('order')) return 'Sistema de Pedidos';
            if (nameLower.includes('wishlist') || nameLower.includes('favorites')) return 'Sistema de Favoritos';
            
            // Cookies de personalización
            if (nameLower.includes('pref') || nameLower.includes('preference')) return 'Sistema de Preferencias';
            if (nameLower.includes('settings') || nameLower.includes('config')) return 'Sistema de Configuración';
            if (nameLower.includes('currency') || nameLower.includes('region')) return 'Sistema de Localización';
            
            // Cookies de rendimiento y debugging
            if (nameLower.includes('debug') || nameLower.includes('dev')) return 'Sistema de Debug';
            if (nameLower.includes('performance') || nameLower.includes('perf')) return 'Sistema de Rendimiento';
            if (nameLower.includes('cache') || nameLower.includes('cdn')) return 'Sistema de Cache';
            
            return null;
          },
          
          // Configurar interceptores
          setupInterceptors: function() {
            if (DETECTOR_STATE.interceptorsActive) return;
            
            try {
              // Interceptar document.cookie setter
              const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
              if (originalCookieDescriptor && originalCookieDescriptor.set) {
                Object.defineProperty(document, 'cookie', {
                  set: function(value) {
                    // Procesar nueva cookie
                    const stackTrace = utils.getCleanStackTrace();
                    const [name] = value.split('=');
                    
                    if (name && name.trim()) {
                      detector.processCookie({
                        name: name.trim(),
                        value: value,
                        source: 'intercepted',
                        method: 'document.cookie.set',
                        stackTrace: stackTrace
                      });
                    }
                    
                    // Llamar al setter original
                    return originalCookieDescriptor.set.call(this, value);
                  },
                  get: originalCookieDescriptor.get,
                  configurable: true
                });
              }
              
              DETECTOR_STATE.interceptorsActive = true;
              utils.log('Cookie interceptors activated');
              
            } catch (error) {
              utils.error('Error setting up interceptors:', error);
            }
          },
          
          // Analizar storage
          analyzeStorage: function() {
            try {
              ['localStorage', 'sessionStorage'].forEach(storageType => {
                const storage = window[storageType];
                if (!storage) return;
                
                for (let i = 0; i < storage.length; i++) {
                  const key = storage.key(i);
                  const value = storage.getItem(key);
                  
                  if (key) {
                    const vendor = this.detectVendorFromName(key);
                    const category = utils.categorizeCookie(key, vendor);
                    
                    DETECTOR_STATE.detectedStorage.set(\`\${storageType}_\${key}\`, {
                      type: storageType,
                      key,
                      value: value ? value.substring(0, 200) : '',
                      vendor,
                      category,
                      timestamp: Date.now(),
                      size: value ? value.length : 0
                    });
                  }
                }
              });
              
              utils.log('Storage analyzed', {
                localStorage: Object.keys(localStorage).length,
                sessionStorage: Object.keys(sessionStorage).length
              });
              
            } catch (error) {
              utils.error('Error analyzing storage:', error);
            }
          },
          
          // Analizar scripts de terceros
          analyzeThirdPartyScripts: function() {
            try {
              const scripts = document.querySelectorAll('script[src]');
              const pageDomain = window.location.hostname;
              
              scripts.forEach(script => {
                try {
                  const url = new URL(script.src);
                  if (url.hostname !== pageDomain) {
                    DETECTOR_STATE.thirdPartyScripts.add({
                      src: script.src,
                      domain: url.hostname,
                      vendor: utils.detectVendorFromStack(script.src)
                    });
                  }
                } catch (e) {
                  // Ignore invalid URLs
                }
              });
              
              utils.log('Third party scripts analyzed', {
                total: DETECTOR_STATE.thirdPartyScripts.size
              });
              
            } catch (error) {
              utils.error('Error analyzing third party scripts:', error);
            }
          },
          
          // Enviar reporte inicial y configurar escaneos programados
          sendInitialReport: function() {
            const report = {
              type: 'initial_detection_report',
              summary: {
                totalCookies: DETECTOR_STATE.detectedCookies.size,
                totalStorage: DETECTOR_STATE.detectedStorage.size,
                totalThirdPartyScripts: DETECTOR_STATE.thirdPartyScripts.size,
                detectorVersion: DETECTOR_CONFIG.version,
                pageLoadTime: Date.now(),
                isFirstScan: true // Marca que es el primer escaneo
              },
              cookies: Array.from(DETECTOR_STATE.detectedCookies.values()),
              storage: Array.from(DETECTOR_STATE.detectedStorage.values()),
              thirdPartyScripts: Array.from(DETECTOR_STATE.thirdPartyScripts),
              pageInfo: {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                userAgent: navigator.userAgent,
                language: navigator.language
              },
              // Solicitar configuración de escaneo programado
              requestScheduledScanning: true
            };
            
            utils.sendToServer(report);
            utils.log('Initial comprehensive report sent', report.summary);
            
            // Configurar escaneos periódicos adicionales
            this.setupPeriodicScanning();
          },
          
          // Configurar escaneos periódicos desde el cliente
          setupPeriodicScanning: function() {
            // Escanear cada 30 segundos durante los primeros 5 minutos
            // para capturar cookies que se crean dinámicamente
            let scanCount = 0;
            const maxInitialScans = 10; // 5 minutos
            
            const periodicScan = () => {
              if (scanCount >= maxInitialScans) return;
              
              scanCount++;
              utils.log(\`Periodic scan #\${scanCount}\`);
              
              // Re-escanear cookies
              this.detectExistingCookies();
              
              // Re-analizar storage
              if (DETECTOR_CONFIG.enableStorage) {
                this.analyzeStorage();
              }
              
              // Enviar reporte incremental si hay nuevas cookies
              const newCookiesCount = DETECTOR_STATE.detectedCookies.size;
              if (newCookiesCount > 0) {
                utils.sendToServer({
                  type: 'periodic_scan_report',
                  scanNumber: scanCount,
                  summary: {
                    totalCookies: newCookiesCount,
                    totalStorage: DETECTOR_STATE.detectedStorage.size,
                    timestamp: Date.now()
                  },
                  newCookies: Array.from(DETECTOR_STATE.detectedCookies.values())
                    .filter(cookie => cookie.timestamp > (Date.now() - 30000)), // Solo cookies de últimos 30s
                  newStorage: Array.from(DETECTOR_STATE.detectedStorage.values())
                    .filter(storage => storage.timestamp > (Date.now() - 30000))
                });
              }
              
              // Programar siguiente escaneo
              if (scanCount < maxInitialScans) {
                setTimeout(periodicScan, 30000); // 30 segundos
              }
            };
            
            // Iniciar escaneos periódicos después de 30 segundos
            setTimeout(periodicScan, 30000);
          }
        };
        
        // Auto-inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => detector.init());
        } else {
          // DOM ya está listo
          setTimeout(() => detector.init(), 100);
        }
        
        // Exponer detector globalmente para debugging
        if (DETECTOR_CONFIG.debugMode) {
          window.__COOKIE_DETECTOR__ = {
            state: DETECTOR_STATE,
            config: DETECTOR_CONFIG,
            detector: detector,
            utils: utils
          };
        }
        
      })();
    `;
  }

  /**
   * Minifica el código JavaScript removiendo comentarios y espacios innecesarios
   * @param {String} code - Código JavaScript a minificar
   * @returns {String} Código minificado
   */
  minifyScript(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
      .replace(/\/\/.*$/gm, '') // Remover comentarios de línea
      .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno
      .replace(/;\s*}/g, ';}') // Limpiar antes de llaves
      .replace(/{\s*;/g, '{') // Limpiar después de llaves
      .trim();
  }

  /**
   * Valida la configuración del detector
   * @param {Object} config - Configuración a validar
   * @returns {Object} Configuración validada
   */
  validateConfig(config) {
    const {
      domainId,
      clientId,
      apiEndpoint,
      enableRealTime = true,
      enableStackTrace = true,
      enableStorage = true,
      enableThirdParty = true,
      debugMode = false
    } = config;

    if (!domainId) {
      throw new Error('domainId is required for embed cookie detector');
    }

    if (!clientId) {
      throw new Error('clientId is required for embed cookie detector');
    }

    return {
      domainId,
      clientId,
      apiEndpoint: apiEndpoint || '/api/v1/embed/cookies/detect',
      enableRealTime: Boolean(enableRealTime),
      enableStackTrace: Boolean(enableStackTrace),
      enableStorage: Boolean(enableStorage),
      enableThirdParty: Boolean(enableThirdParty),
      debugMode: Boolean(debugMode)
    };
  }

  /**
   * Genera configuración de detector para un dominio específico
   * @param {Object} domain - Objeto de dominio
   * @param {Object} options - Opciones adicionales
   * @returns {Object} Configuración del detector
   */
  generateConfigForDomain(domain, options = {}) {
    try {
      const config = this.validateConfig({
        domainId: domain._id,
        clientId: domain.clientId,
        ...options
      });

      logger.info(`Generated embed detector config for domain: ${domain.domain}`, {
        domainId: config.domainId,
        clientId: config.clientId,
        features: {
          realTime: config.enableRealTime,
          stackTrace: config.enableStackTrace,
          storage: config.enableStorage,
          thirdParty: config.enableThirdParty
        }
      });

      return config;
    } catch (error) {
      logger.error('Error generating detector config:', error);
      throw error;
    }
  }
}

module.exports = new EmbedCookieDetectorService();