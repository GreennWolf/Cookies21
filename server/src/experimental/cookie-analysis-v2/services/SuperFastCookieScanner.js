const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

/**
 * SUPER FAST COOKIE SCANNER V4.0
 * Enfocado 100% en detección máxima de cookies con velocidad optimizada
 * Implementa las mejores técnicas profesionales de 2024
 */
class SuperFastCookieScanner {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 60000,     // 1 minuto por sitio
      waitTime: 5000,     // 5 segundos espera dinámica
      scrollDepth: 3,     // Solo 3 scrolls rápidos
      interactionLevel: 'focused', // Enfocado en cookies
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.scanResults = {
      cookies: new Map(),
      networkRequests: [],
      scripts: [],
      technologies: new Set(),
      errors: []
    };
  }

  async scan(url) {
    const startTime = Date.now();
    const scanId = uuidv4();
    this.targetUrl = url; // Guardar para referencia
    
    console.log(`🚀 [SuperFastScanner] Iniciando escaneo súper rápido: ${url}`);
    console.log(`📋 Scan ID: ${scanId}`);

    try {
      // 1. Inicializar navegador optimizado para velocidad
      this.browser = await this.initOptimizedBrowser();
      this.page = await this.browser.newPage();
      
      // 2. Configurar página para máxima detección de cookies
      await this.setupCookieFocusedPage();
      
      // 3. Configurar interceptores ENFOCADOS en cookies
      await this.setupCookieInterceptors();
      
      // 4. Navegar rápidamente
      console.log(`🌐 Navegando rápidamente: ${url}`);
      await this.fastNavigate(url);
      
      // 5. Activar TODAS las fuentes de cookies conocidas
      await this.triggerAllCookieSources();
      
      // 6. Analizar subdominios comunes
      await this.analyzeCommonSubdomains();
      
      // 7. Recolectar cookies usando TODOS los métodos conocidos
      await this.collectAllCookiesQuickly();
      
      // 8. Analizar recursos de terceros para más cookies
      await this.analyzeThirdPartyResources();
      
      // 9. Detectar tecnologías rápidamente
      await this.quickTechDetection();
      
      await this.browser.close();
      
      const scanDuration = Date.now() - startTime;
      console.log(`✅ [SuperFastScanner] Escaneo completado en ${scanDuration}ms`);
      console.log(`🍪 Cookies encontradas: ${this.scanResults.cookies.size}`);
      
      return {
        scanId,
        url,
        domain: new URL(url).hostname,
        scanDuration,
        cookies: Array.from(this.scanResults.cookies.values()),
        networkRequests: this.scanResults.networkRequests,
        scripts: this.scanResults.scripts,
        technologies: Array.from(this.scanResults.technologies),
        errors: this.scanResults.errors
      };
      
    } catch (error) {
      console.error('❌ [SuperFastScanner] Error durante escaneo:', error);
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }

  async initOptimizedBrowser() {
    return await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        
        // CONFIGURACIÓN CRÍTICA PARA COOKIES
        '--disable-features=SameSiteByDefaultCookies',
        '--disable-features=CookiesWithoutSameSiteMustBeSecure',
        '--third-party-cookie-allow',
        '--disable-features=BlockThirdPartyCookies',
        '--enable-features=ThirdPartyStoragePartitioning',
        '--disable-cors',
        
        // OPTIMIZACIONES DE VELOCIDAD
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--mute-audio',
        '--no-pings'
      ],
      defaultViewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation'],
      devtools: false
    });
  }

  async setupCookieFocusedPage() {
    // User-Agent realista
    await this.page.setUserAgent(this.options.userAgent);
    
    // Headers optimizados para cookies
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '0',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache'
    });
    
    // Geolocalización española para geo-cookies
    await this.page.setGeolocation({ latitude: 40.4168, longitude: -3.7038 });
    await this.page.emulateTimezone('Europe/Madrid');
    
    // Script ULTRA optimizado para monitoreo de cookies
    await this.page.evaluateOnNewDocument(() => {
      // Ocultar automatización
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // SISTEMA DE MONITOREO DE COOKIES ULTRA RÁPIDO
      window.__SUPER_COOKIE_MONITOR__ = {
        allCookies: [],
        writes: [],
        storage: []
      };
      
      // Interceptar document.cookie de forma ultraoptimizada
      const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      
      Object.defineProperty(document, 'cookie', {
        get() {
          const value = originalCookie.get.call(this);
          // Guardar todas las cookies encontradas
          if (value) {
            window.__SUPER_COOKIE_MONITOR__.allCookies.push({
              cookies: value,
              timestamp: Date.now(),
              url: window.location.href
            });
          }
          return value;
        },
        set(value) {
          window.__SUPER_COOKIE_MONITOR__.writes.push({
            value,
            timestamp: Date.now(),
            url: window.location.href
          });
          return originalCookie.set.call(this, value);
        }
      });
      
      // Interceptar storage con alta eficiencia
      ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        if (storage) {
          const originalSetItem = storage.setItem;
          storage.setItem = function(key, value) {
            window.__SUPER_COOKIE_MONITOR__.storage.push({
              type: storageType,
              key,
              value,
              timestamp: Date.now()
            });
            return originalSetItem.call(this, key, value);
          };
        }
      });
      
      // Interceptar fetch y XMLHttpRequest para cookies automáticas
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        // Activar cookies automáticamente
        setTimeout(() => {
          const currentCookies = document.cookie;
          if (currentCookies) {
            window.__SUPER_COOKIE_MONITOR__.allCookies.push({
              cookies: currentCookies,
              timestamp: Date.now(),
              source: 'fetch-triggered',
              url: window.location.href
            });
          }
        }, 100);
        return originalFetch.apply(this, args);
      };
    });
  }

  async setupCookieInterceptors() {
    // Interceptor de requests optimizado para cookies
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      try {
        const headers = request.headers();
        
        // Capturar cookies de request headers
        if (headers.cookie) {
          const cookies = this.fastParseCookies(headers.cookie);
          cookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'requestHeaders',
              detectionMethod: 'http-request-interception',
              url: request.url(),
              timestamp: Date.now()
            });
          });
        }
        
        // Registrar request
        this.scanResults.networkRequests.push({
          url: request.url(),
          method: request.method(),
          hasСookies: !!headers.cookie,
          timestamp: Date.now()
        });
        
        request.continue();
        
      } catch (error) {
        try {
          request.continue();
        } catch (e) {
          // Request ya manejado
        }
      }
    });
    
    // Interceptor de responses optimizado
    this.page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const setCookieHeaders = headers['set-cookie'];
        
        if (setCookieHeaders) {
          const cookies = this.fastParseSetCookies(setCookieHeaders);
          cookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'responseHeaders',
              detectionMethod: 'http-response-interception',
              url: response.url(),
              timestamp: Date.now()
            });
          });
        }
      } catch (error) {
        this.scanResults.errors.push(`Error intercepting response: ${error.message}`);
      }
    });
  }

  async fastNavigate(url) {
    // Navegar rápidamente con timeout corto
    await this.page.goto(url, { 
      waitUntil: ['domcontentloaded'],
      timeout: this.options.timeout 
    });
    
    // Espera mínima para carga inicial
    await this.wait(2000);
  }

  async triggerAllCookieSources() {
    console.log('🎯 Activando todas las fuentes de cookies...');
    
    try {
      // 1. Scroll rápido para activar lazy loading y analytics
      for (let i = 0; i < this.options.scrollDepth; i++) {
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.wait(300);
      }
      
      // 2. Activar eventos comunes que generan cookies
      await this.page.evaluate(() => {
        // Eventos de tracking
        const events = ['mouseenter', 'focus', 'scroll'];
        events.forEach(eventType => {
          try {
            document.dispatchEvent(new Event(eventType, { bubbles: true }));
          } catch (e) {}
        });
        
        // Activar analytics populares
        if (window.gtag) {
          try { window.gtag('event', 'page_view'); } catch (e) {}
        }
        if (window.dataLayer) {
          try { window.dataLayer.push({ event: 'custom_scan' }); } catch (e) {}
        }
        if (window.fbq) {
          try { window.fbq('track', 'PageView'); } catch (e) {}
        }
        if (window.ga) {
          try { window.ga('send', 'pageview'); } catch (e) {}
        }
      });
      
      // 3. Buscar y activar botones de consentimiento MÁS COMUNES
      const quickConsentSelectors = [
        '[id*="accept"]', '[class*="accept"]', 'button[class*="accept"]',
        '[id*="consent"]', '[class*="consent"]', 'button[class*="consent"]', 
        '[id*="cookie"]', '[class*="cookie"]', 'button[class*="cookie"]',
        '[id*="agree"]', '[class*="agree"]', 'button[class*="agree"]',
        '[id*="allow"]', '[class*="allow"]', 'button[class*="allow"]',
        '.btn-accept', '#accept-cookies', '#accept-all', '#allow-all',
        '[id*="onetrust"]', '[class*="onetrust"]',
        '[id*="cookiebot"]', '[class*="cookiebot"]',
        '[id*="iubenda"]', '[class*="iubenda"]',
        '[data-consent]', '[data-cookie]', '[data-accept]',
        '.cookie-accept', '.privacy-accept', '.banner-accept'
      ];
      
      for (const selector of quickConsentSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            console.log(`🔘 Encontrado: ${selector} (${elements.length})`);
            // Solo hacer click en el primer elemento para rapidez
            try {
              await elements[0].click();
              await this.wait(500);
              break; // Salir después del primer click exitoso
            } catch (e) {
              // Continuar con el siguiente
            }
          }
        } catch (e) {
          // Continuar
        }
      }
      
      // 4. Activar interacciones básicas
      await this.page.evaluate(() => {
        // Click en elementos comunes que activan tracking
        const commonElements = ['a', 'button'];
        commonElements.forEach(tag => {
          const elements = document.querySelectorAll(tag);
          if (elements.length > 0) {
            try {
              elements[0].dispatchEvent(new Event('mouseenter', { bubbles: true }));
            } catch (e) {}
          }
        });
        
        // Activar eventos de scroll y resize que activan más tracking
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        
        // Simular actividad de usuario realista
        document.dispatchEvent(new Event('mousemove'));
        document.dispatchEvent(new Event('keydown'));
        
        // Activar APIs de timing que suelen crear cookies
        if (window.performance && window.performance.mark) {
          try {
            window.performance.mark('user-interaction');
          } catch (e) {}
        }
        
        // Disparar eventos de visibilidad que activan tracking
        if (document.hidden !== undefined) {
          Object.defineProperty(document, 'hidden', { value: false, writable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        }
      });
      
      // 5. Simular interacciones con formularios para activar más cookies
      try {
        const inputs = await this.page.$$('input[type="email"], input[type="text"], input[name*="email"]');
        if (inputs.length > 0) {
          await inputs[0].focus();
          await this.wait(300);
          await inputs[0].type('test@example.com', { delay: 50 });
          await this.wait(500);
        }
      } catch (e) {
        // No hay formularios o error
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error triggering cookie sources: ${error.message}`);
    }
  }

  async analyzeCommonSubdomains() {
    console.log('🌐 Analizando subdominios comunes...');
    
    try {
      const mainDomain = new URL(this.targetUrl).hostname.replace('www.', '');
      const commonSubdomains = [
        'www', 'api', 'cdn', 'static', 'assets', 'media', 
        'app', 'admin', 'secure', 'auth', 'login',
        'analytics', 'stats', 'tracking', 'metrics',
        'images', 'img', 'data', 'content', 'files',
        'shop', 'store', 'payment', 'checkout',
        'account', 'user', 'profile', 'my',
        'support', 'help', 'docs', 'blog'
      ];
      
      // También intentar navegar a subdominios para activar más cookies
      const currentUrl = this.page.url();
      
      for (const subdomain of commonSubdomains) {
        try {
          const subdomainUrl = `https://${subdomain}.${mainDomain}`;
          
          // Hacer una petición rápida para verificar si existe
          const exists = await this.page.evaluate(async (url) => {
            try {
              const resp = await fetch(url, { 
                method: 'HEAD', 
                mode: 'no-cors',
                credentials: 'include'
              });
              return true;
            } catch (e) {
              return false;
            }
          }, subdomainUrl);
          
          if (exists) {
            console.log(`✅ Subdominio encontrado: ${subdomainUrl}`);
            
            // Intentar navegar brevemente al subdominio
            try {
              await this.page.goto(subdomainUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 5000 
              });
              
              // Esperar un momento para que se establezcan cookies
              await this.wait(1000);
              
              // Recolectar cookies del subdominio
              const subdomainCookies = await this.page.cookies();
              console.log(`🍪 Cookies en ${subdomain}: ${subdomainCookies.length}`);
              
              subdomainCookies.forEach(cookie => {
                this.addCookie({
                  ...cookie,
                  source: 'subdomain',
                  detectionMethod: 'subdomain-navigation',
                  subdomain: subdomain,
                  timestamp: Date.now()
                });
              });
              
              // También obtener cookies de document.cookie
              const directCookies = await this.page.evaluate(() => document.cookie);
              if (directCookies) {
                const cookies = directCookies.split(';').filter(c => c.trim());
                cookies.forEach(cookieStr => {
                  const [name, value] = cookieStr.trim().split('=');
                  if (name) {
                    this.addCookie({
                      name: name.trim(),
                      value: value ? value.trim() : '',
                      domain: new URL(subdomainUrl).hostname,
                      source: 'subdomain-direct',
                      detectionMethod: 'subdomain-document-cookie',
                      subdomain: subdomain,
                      timestamp: Date.now()
                    });
                  }
                });
              }
            } catch (e) {
              // Si no podemos navegar, al menos intentar obtener cookies
              try {
                const cookies = await this.page.cookies(subdomainUrl);
                cookies.forEach(cookie => {
                  this.addCookie({
                    ...cookie,
                    source: 'subdomain',
                    detectionMethod: 'subdomain-scan',
                    subdomain: subdomain,
                    timestamp: Date.now()
                  });
                });
              } catch (err) {
                // Ignorar errores
              }
            }
          }
        } catch (e) {
          // Subdominio no accesible
        }
      }
      
      // Volver a la URL original
      if (this.page.url() !== currentUrl) {
        await this.page.goto(currentUrl, { waitUntil: 'domcontentloaded' });
      }
      
    } catch (error) {
      console.log('⚠️ Error analizando subdominios:', error.message);
    }
  }

  async collectAllCookiesQuickly() {
    console.log('🍪 Recolectando cookies súper rápido...');
    
    try {
      // 1. Cookies del navegador (método principal)
      const pageCookies = await this.page.cookies();
      console.log(`📊 Page cookies: ${pageCookies.length}`);
      
      pageCookies.forEach(cookie => {
        this.addCookie({
          ...cookie,
          source: 'pageCookies',
          detectionMethod: 'page-cookies-api',
          timestamp: Date.now()
        });
      });
      
      // 2. Cookies del monitor JavaScript
      const jsData = await this.page.evaluate(() => window.__SUPER_COOKIE_MONITOR__ || {});
      
      // Procesar cookies capturadas por el monitor
      if (jsData.allCookies && jsData.allCookies.length > 0) {
        console.log(`📝 JS Monitor cookies: ${jsData.allCookies.length} capturas`);
        jsData.allCookies.forEach(capture => {
          if (capture.cookies) {
            const cookies = capture.cookies.split(';').filter(c => c.trim());
            cookies.forEach(cookieStr => {
              const [name, value] = cookieStr.trim().split('=');
              if (name) {
                this.addCookie({
                  name: name.trim(),
                  value: value ? value.trim() : '',
                  domain: new URL(capture.url || this.page.url()).hostname,
                  source: 'jsMonitor',
                  detectionMethod: 'super-runtime-monitoring',
                  timestamp: capture.timestamp
                });
              }
            });
          }
        });
      }
      
      // 3. Document.cookie directo
      const directCookies = await this.page.evaluate(() => {
        try {
          return document.cookie;
        } catch (e) {
          return '';
        }
      });
      
      if (directCookies) {
        const cookies = directCookies.split(';').filter(c => c.trim());
        console.log(`📄 Document.cookie directo: ${cookies.length}`);
        cookies.forEach(cookieStr => {
          const [name, value] = cookieStr.trim().split('=');
          if (name) {
            this.addCookie({
              name: name.trim(),
              value: value ? value.trim() : '',
              domain: new URL(this.page.url()).hostname,
              source: 'documentCookie',
              detectionMethod: 'super-document-cookie',
              timestamp: Date.now()
            });
          }
        });
      }
      
      // 4. Storage rápido
      const storageData = await this.page.evaluate(() => {
        const data = {};
        try {
          // localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[`localStorage_${key}`] = localStorage.getItem(key);
          }
          // sessionStorage
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[`sessionStorage_${key}`] = sessionStorage.getItem(key);
          }
        } catch (e) {}
        return data;
      });
      
      const domain = new URL(this.page.url()).hostname;
      Object.entries(storageData).forEach(([key, value]) => {
        this.addCookie({
          name: key,
          value: value,
          domain,
          source: 'storage',
          detectionMethod: 'super-storage-scan',
          timestamp: Date.now()
        });
      });
      
      console.log(`💾 Storage items: ${Object.keys(storageData).length}`);
      
      // 5. Detectar cookies en iframes (método rápido)
      try {
        const frames = this.page.frames();
        console.log(`🖼️ Analizando ${frames.length} frames...`);
        
        for (const frame of frames) { // Analizar TODOS los frames
          try {
            if (frame.url() && frame.url() !== 'about:blank') {
              // Obtener cookies del frame
              const frameCookies = await frame.evaluate(() => {
                try {
                  return document.cookie;
                } catch (e) {
                  return '';
                }
              });
              
              if (frameCookies) {
                const cookies = frameCookies.split(';').filter(c => c.trim());
                console.log(`🔍 Frame ${frame.url()}: ${cookies.length} cookies`);
                cookies.forEach(cookieStr => {
                  const [name, value] = cookieStr.trim().split('=');
                  if (name) {
                    const frameDomain = new URL(frame.url()).hostname;
                    this.addCookie({
                      name: name.trim(),
                      value: value ? value.trim() : '',
                      domain: frameDomain,
                      source: 'iframe',
                      detectionMethod: 'super-iframe-scan',
                      timestamp: Date.now(),
                      frameUrl: frame.url(),
                      isThirdParty: frameDomain !== new URL(this.targetUrl).hostname
                    });
                  }
                });
              }
              
              // También obtener localStorage del frame
              const frameStorage = await frame.evaluate(() => {
                const storage = {};
                try {
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    storage[key] = localStorage.getItem(key);
                  }
                } catch (e) {}
                return storage;
              });
              
              Object.entries(frameStorage).forEach(([key, value]) => {
                const frameDomain = new URL(frame.url()).hostname;
                this.addCookie({
                  name: `iframe_localStorage_${key}`,
                  value: value,
                  domain: frameDomain,
                  source: 'iframe-storage',
                  detectionMethod: 'super-iframe-storage',
                  timestamp: Date.now(),
                  frameUrl: frame.url(),
                  isThirdParty: frameDomain !== new URL(this.targetUrl).hostname
                });
              });
            }
          } catch (e) {
            // Frame no accesible - esto es común con frames de terceros
          }
        }
      } catch (error) {
        console.log('⚠️ Error analizando frames:', error.message);
      }
      
      // 6. Detectar cookies usando navegación URL hash (activar SPAs)
      try {
        await this.page.evaluate(() => {
          // Simular navegación SPA que activa más tracking
          if (window.history && window.history.pushState) {
            const currentUrl = window.location.href;
            window.history.pushState({}, '', currentUrl + '#super-scan');
            window.dispatchEvent(new PopStateEvent('popstate'));
            setTimeout(() => {
              window.history.pushState({}, '', currentUrl);
            }, 100);
          }
        });
        
        await this.wait(1000);
        
        // Recolectar cookies después de la navegación SPA
        const spaDetectedCookies = await this.page.evaluate(() => document.cookie);
        if (spaDetectedCookies) {
          const cookies = spaDetectedCookies.split(';').filter(c => c.trim());
          cookies.forEach(cookieStr => {
            const [name, value] = cookieStr.trim().split('=');
            if (name) {
              this.addCookie({
                name: name.trim(),
                value: value ? value.trim() : '',
                domain: new URL(this.page.url()).hostname,
                source: 'spaNavigation',
                detectionMethod: 'super-spa-detection',
                timestamp: Date.now()
              });
            }
          });
        }
      } catch (error) {
        console.log('⚠️ Error en detección SPA:', error.message);
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting cookies quickly: ${error.message}`);
    }
  }

  async analyzeThirdPartyResources() {
    console.log('🌍 Analizando recursos de terceros...');
    
    try {
      // Obtener todos los recursos cargados desde terceros
      const thirdPartyData = await this.page.evaluate((pageUrl) => {
        const pageDomain = new URL(pageUrl).hostname;
        const thirdPartyDomains = new Set();
        const resources = [];
        
        // Analizar scripts
        document.querySelectorAll('script[src]').forEach(script => {
          try {
            const url = new URL(script.src);
            if (!url.hostname.includes(pageDomain)) {
              thirdPartyDomains.add(url.hostname);
              resources.push({ type: 'script', url: script.src, domain: url.hostname });
            }
          } catch (e) {}
        });
        
        // Analizar iframes
        document.querySelectorAll('iframe[src]').forEach(iframe => {
          try {
            const url = new URL(iframe.src);
            if (!url.hostname.includes(pageDomain)) {
              thirdPartyDomains.add(url.hostname);
              resources.push({ type: 'iframe', url: iframe.src, domain: url.hostname });
            }
          } catch (e) {}
        });
        
        // Analizar imágenes (pueden establecer cookies)
        document.querySelectorAll('img[src]').forEach(img => {
          try {
            const url = new URL(img.src);
            if (!url.hostname.includes(pageDomain)) {
              thirdPartyDomains.add(url.hostname);
              resources.push({ type: 'image', url: img.src, domain: url.hostname });
            }
          } catch (e) {}
        });
        
        // Analizar links
        document.querySelectorAll('link[href]').forEach(link => {
          try {
            const url = new URL(link.href);
            if (!url.hostname.includes(pageDomain)) {
              thirdPartyDomains.add(url.hostname);
              resources.push({ type: 'link', url: link.href, domain: url.hostname });
            }
          } catch (e) {}
        });
        
        return {
          domains: Array.from(thirdPartyDomains),
          resources: resources
        };
      }, this.page.url());
      
      console.log(`📊 Dominios de terceros encontrados: ${thirdPartyData.domains.length}`);
      
      // Intentar obtener cookies de los principales dominios de terceros
      for (const domain of thirdPartyData.domains.slice(0, 10)) { // Limitar a 10 para velocidad
        try {
          // Intentar hacer una petición al dominio
          const cookies = await this.page.cookies(`https://${domain}`);
          if (cookies.length > 0) {
            console.log(`🍪 Cookies de terceros en ${domain}: ${cookies.length}`);
            cookies.forEach(cookie => {
              this.addCookie({
                ...cookie,
                source: 'thirdParty',
                detectionMethod: 'third-party-analysis',
                thirdPartyDomain: domain,
                isThirdParty: true,
                timestamp: Date.now()
              });
            });
          }
        } catch (e) {
          // Ignorar errores
        }
      }
      
      // Analizar recursos específicos conocidos por establecer cookies
      const cookieSetters = [
        'doubleclick.net', 'google-analytics.com', 'googletagmanager.com',
        'facebook.com', 'twitter.com', 'linkedin.com', 'pinterest.com',
        'amazon-adsystem.com', 'googlesyndication.com', 'google.com',
        'youtube.com', 'cloudflare.com', 'cloudflareinsights.com'
      ];
      
      for (const knownDomain of cookieSetters) {
        if (thirdPartyData.domains.some(d => d.includes(knownDomain))) {
          console.log(`🎯 Dominio conocido de cookies encontrado: ${knownDomain}`);
          
          // Simular interacción que podría activar cookies
          await this.page.evaluate((domain) => {
            // Disparar eventos que podrían activar tracking
            if (domain.includes('google')) {
              if (window.gtag) window.gtag('event', 'page_view');
              if (window.ga) window.ga('send', 'pageview');
            }
            if (domain.includes('facebook') && window.fbq) {
              window.fbq('track', 'PageView');
            }
          }, knownDomain);
        }
      }
      
    } catch (error) {
      console.log('⚠️ Error analizando recursos de terceros:', error.message);
    }
  }

  async quickTechDetection() {
    try {
      // Detectar tecnologías rápidamente
      const technologies = await this.page.evaluate(() => {
        const detected = [];
        
        // Detección rápida de las principales
        if (window.ga || window.gtag || window.dataLayer) detected.push('Google Analytics');
        if (window.fbq || window._fbq) detected.push('Facebook Pixel');
        if (window.hj) detected.push('Hotjar');
        if (window.mixpanel) detected.push('Mixpanel');
        if (window.analytics) detected.push('Segment');
        if (window._gaq) detected.push('Google Analytics Classic');
        if (window.twttr) detected.push('Twitter');
        if (window.DISQUS) detected.push('Disqus');
        if (window.Intercom) detected.push('Intercom');
        if (window.Crisp) detected.push('Crisp');
        if (window.olark) detected.push('Olark');
        if (window.drift) detected.push('Drift');
        if (window.tidioChatApi) detected.push('Tidio');
        
        return detected;
      });
      
      technologies.forEach(tech => this.scanResults.technologies.add(tech));
      
      // Scripts rápido - NO limitar, obtener TODOS
      const scripts = await this.page.$$eval('script[src]', scripts => 
        scripts.map(script => script.src)
      );
      
      this.scanResults.scripts = scripts;
      
      // Patrones de scripts comunes expandidos
      const patterns = {
        'Google Analytics': ['google-analytics.com', 'gtag', 'analytics.js'],
        'Facebook Pixel': ['connect.facebook.net', 'fbevents.js'],
        'Google Tag Manager': ['googletagmanager.com'],
        'Hotjar': ['hotjar.com'],
        'Mixpanel': ['mixpanel.com'],
        'Segment': ['segment.com', 'segment.io'],
        'Intercom': ['intercom.io'],
        'Drift': ['drift.com'],
        'Crisp': ['crisp.chat'],
        'LiveChat': ['livechatinc.com'],
        'Zendesk': ['zendesk.com'],
        'HubSpot': ['hubspot.com', 'hsforms.net'],
        'Marketo': ['marketo.com', 'mktoresp.com'],
        'Pardot': ['pardot.com'],
        'Mailchimp': ['mailchimp.com', 'list-manage.com'],
        'OptinMonster': ['optinmonster.com'],
        'Sumo': ['sumo.com'],
        'AddThis': ['addthis.com'],
        'ShareThis': ['sharethis.com']
      };
      
      scripts.forEach(src => {
        Object.entries(patterns).forEach(([tech, patternsArr]) => {
          if (patternsArr.some(pattern => src.includes(pattern))) {
            this.scanResults.technologies.add(tech);
          }
        });
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error in quick tech detection: ${error.message}`);
    }
  }

  // Métodos de utilidad optimizados
  addCookie(cookieData) {
    const key = `${cookieData.name}_${cookieData.domain || 'unknown'}_${cookieData.source || 'unknown'}`;
    
    if (!this.scanResults.cookies.has(key)) {
      const enrichedCookie = {
        ...cookieData,
        size: cookieData.value ? cookieData.value.length : 0,
        category: this.quickClassifyTasteless(cookieData.name),
        isThirdParty: cookieData.isThirdParty !== undefined ? cookieData.isThirdParty : this.isThirdParty(cookieData.domain, this.targetUrl),
        timestamp: cookieData.timestamp || Date.now(),
        vendor: this.detectVendor(cookieData) // Agregar detección de vendor
      };
      
      this.scanResults.cookies.set(key, enrichedCookie);
    }
  }

  detectVendor(cookieData) {
    const name = (cookieData.name || '').toLowerCase();
    const domain = (cookieData.domain || '').toLowerCase();
    
    // Patrones de cookies por proveedor
    const vendorPatterns = {
      // Google
      'Google Analytics': /^(_ga|_gid|_gat|__utm|_gac|_gali|_gcl|_dc_gtm|_gaexp|ga_|__ga)/,
      'Google Tag Manager': /^(_gtm|gtm_)/,
      'Google Ads': /^(IDE|DSID|id|APISID|HSID|SSID|SID|SAPISID|gcl_|gac_)/,
      'YouTube': /^(VISITOR_INFO|YSC|PREF|GPS|CONSENT)/,
      
      // Facebook
      'Facebook': /^(_fb|fbp|fbc|fr|xs|datr|sb|c_user|act|presence|wd|spin)/,
      
      // Twitter
      'Twitter': /^(guest_id|personalization_id|ct0|auth_token|twid|muc|_twitter)/,
      
      // LinkedIn
      'LinkedIn': /^(li_|lidc|lissc|bcookie|bscookie|_guid)/,
      
      // Analytics
      'Hotjar': /^(_hj|hj_)/,
      'Mixpanel': /^(mp_|mixpanel)/,
      'Segment': /^(ajs_|segment_)/,
      'Amplitude': /^(amplitude_)/,
      'Matomo': /^(_pk_|matomo_|piwik_)/,
      
      // E-commerce
      'WooCommerce': /^(woocommerce_|wp_woocommerce_)/,
      'Shopify': /^(_shopify_|cart_|checkout_token)/,
      'Magento': /^(mage-|form_key|PHPSESSID)/,
      
      // CMS
      'WordPress': /^(wp-|wordpress_)/,
      'Drupal': /^(SESS|has_js)/,
      'Joomla': /^(joomla_)/,
      
      // Marketing
      'HubSpot': /^(__hs|hubspotutk|__hssrc|__hstc)/,
      'Marketo': /^(_mkto_trk)/,
      'Mailchimp': /^(mc_|_mcga)/,
      'OptinMonster': /^(om-)/,
      
      // Advertising
      'DoubleClick': /^(test_cookie|IDE|DSID)/,
      'Amazon Ads': /^(ad-id|ad-privacy)/,
      
      // CDN/Security
      'Cloudflare': /^(__cf|cf_|__cfduid)/,
      'CloudflareInsights': /^(_cfuvid)/,
      
      // Chat/Support
      'Intercom': /^(intercom-)/,
      'Drift': /^(drift|driftt_)/,
      'Crisp': /^(crisp-client)/,
      'Zendesk': /^(__zlcmid)/,
      'LiveChat': /^(__lc|__livechat)/,
      'Tidio': /^(tidio_)/,
      
      // Other
      'Stripe': /^(__stripe_|stripe_)/,
      'PayPal': /^(paypal|PYPF)/,
      'Disqus': /^(disqus_)/,
      'AddThis': /^(__atuvc|__atuvs)/,
      'ShareThis': /^(__sharethis_)/
    };
    
    // Verificar por patrones de nombre
    for (const [vendor, pattern] of Object.entries(vendorPatterns)) {
      if (pattern.test(name)) {
        return { name: vendor };
      }
    }
    
    // Verificar por dominio
    const domainVendors = {
      'google-analytics.com': 'Google Analytics',
      'googletagmanager.com': 'Google Tag Manager',
      'doubleclick.net': 'DoubleClick',
      'facebook.com': 'Facebook',
      'twitter.com': 'Twitter',
      'linkedin.com': 'LinkedIn',
      'youtube.com': 'YouTube',
      'hotjar.com': 'Hotjar',
      'mixpanel.com': 'Mixpanel',
      'segment.com': 'Segment',
      'cloudflare.com': 'Cloudflare',
      'amazon-adsystem.com': 'Amazon Ads',
      'googlesyndication.com': 'Google AdSense',
      'google.com': 'Google',
      'gstatic.com': 'Google',
      'googleapis.com': 'Google'
    };
    
    for (const [domainPattern, vendor] of Object.entries(domainVendors)) {
      if (domain.includes(domainPattern)) {
        return { name: vendor };
      }
    }
    
    // Si es una cookie local (no third-party), usar el dominio como vendor
    if (!cookieData.isThirdParty && cookieData.domain) {
      return { name: cookieData.domain };
    }
    
    // Si no se puede detectar
    return { name: 'Unknown' };
  }

  quickClassifyTasteless(name) {
    const nameStr = (name || '').toLowerCase();
    
    // Clasificación mejorada con más patrones
    // Analytics
    if (nameStr.match(/^(_ga|_gid|_gat|__utm|_gtm|_gac|_gali|_gcl|_dc_gtm)/)) return 'analytics';
    if (nameStr.includes('analytics') || nameStr.includes('gtag')) return 'analytics';
    if (nameStr.match(/^(mp_|mixpanel|amplitude_|segment_)/)) return 'analytics';
    if (nameStr.includes('hotjar') || nameStr.includes('_hj')) return 'analytics';
    
    // Advertising/Marketing
    if (nameStr.match(/^(_fb|fbp|fbc|fr|xs|datr|sb|c_user)/)) return 'advertising';
    if (nameStr.includes('ads') || nameStr.includes('doubleclick')) return 'advertising';
    if (nameStr.includes('adsense') || nameStr.includes('adwords')) return 'advertising';
    if (nameStr.match(/^(IDE|DSID|id|APISID|HSID|SSID|SID|SAPISID)/)) return 'advertising';
    
    // Necessary/Functional
    if (nameStr.match(/^(sess|session|auth|token|csrf|xsrf)/)) return 'necessary';
    if (nameStr.includes('login') || nameStr.includes('logged')) return 'necessary';
    if (nameStr.includes('cart') || nameStr.includes('checkout')) return 'necessary';
    if (nameStr.match(/^(wp-|wordpress_)/)) return 'necessary';
    if (nameStr.includes('woocommerce')) return 'necessary';
    
    // Preferences
    if (nameStr.match(/^(pref|preference|lang|language|locale|theme)/)) return 'preferences';
    if (nameStr.includes('cookie_consent') || nameStr.includes('gdpr')) return 'preferences';
    if (nameStr.includes('timezone') || nameStr.includes('currency')) return 'preferences';
    
    // Performance
    if (nameStr.includes('performance') || nameStr.includes('perf_')) return 'performance';
    if (nameStr.includes('cache') || nameStr.includes('cdn')) return 'performance';
    
    return 'unknown';
  }

  fastParseCookies(cookieHeader) {
    const cookies = [];
    if (!cookieHeader) return cookies;
    
    const pairs = cookieHeader.split(/[;,]/).map(p => p.trim());
    pairs.forEach(pair => {
      if (pair) {
        const [name, value] = pair.split('=');
        if (name && name.trim()) {
          cookies.push({
            name: name.trim(),
            value: value ? value.trim() : ''
          });
        }
      }
    });
    
    return cookies;
  }

  fastParseSetCookies(setCookieHeaders) {
    const cookies = [];
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    
    headers.forEach(header => {
      if (header) {
        const parts = header.split(';')[0]; // Solo tomar nombre=valor para velocidad
        const [name, value] = parts.split('=');
        if (name && name.trim()) {
          cookies.push({
            name: name.trim(),
            value: value ? value.trim() : ''
          });
        }
      }
    });
    
    return cookies;
  }

  isThirdParty(cookieDomain, pageUrl) {
    if (!cookieDomain || !pageUrl) return false;
    
    try {
      const pageDomain = new URL(pageUrl).hostname;
      const cleanCookieDomain = cookieDomain.replace(/^\./, '');
      
      return !pageDomain.endsWith(cleanCookieDomain) && 
             !cleanCookieDomain.endsWith(pageDomain);
    } catch {
      return false;
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SuperFastCookieScanner;