const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class AdvancedCookieScanner {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 120000, // 2 minutos
      waitTime: 10000,  // 10 segundos para carga dinámica
      scrollDepth: 5,
      interactionLevel: 'medium',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };
    
    this.browser = null;
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
    
    console.log(`🚀 [AdvancedScanner] Iniciando escaneo: ${url}`);
    console.log(`📋 Scan ID: ${scanId}`);

    try {
      // Inicializar navegador
      this.browser = await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Configurar página
      await this.setupPage(page);
      
      // Configurar interceptores
      await this.setupInterceptors(page);
      
      // Navegar a la página
      console.log(`🌐 Navegando a: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: this.options.timeout 
      });
      
      // Configurar permisos después de la navegación
      try {
        const context = page.browserContext();
        await context.overridePermissions(url, [
          'geolocation',
          'notifications',
          'camera',
          'microphone',
          'background-sync',
          'midi',
          'push'
        ]);
      } catch (e) {
        // Los permisos no son críticos
      }
      
      // Esperar carga inicial
      await this.wait(2000);
      
      // Simular comportamiento humano
      await this.simulateHumanBehavior(page);
      
      // Recolectar todas las cookies
      await this.collectAllCookies(page);
      
      // Detectar tecnologías
      await this.detectTechnologies(page);
      
      // Recolectar datos de la página
      const pageData = await this.collectPageData(page);
      
      await this.browser.close();
      
      const scanDuration = Date.now() - startTime;
      console.log(`✅ [AdvancedScanner] Escaneo completado en ${scanDuration}ms`);
      console.log(`📊 Cookies encontradas: ${this.scanResults.cookies.size}`);
      
      return {
        scanId,
        url,
        domain: new URL(url).hostname,
        scanDuration,
        cookies: Array.from(this.scanResults.cookies.values()),
        networkRequests: this.scanResults.networkRequests,
        scripts: this.scanResults.scripts,
        technologies: Array.from(this.scanResults.technologies),
        pageData,
        errors: this.scanResults.errors
      };
      
    } catch (error) {
      console.error('❌ [AdvancedScanner] Error durante escaneo:', error);
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }

  async initBrowser() {
    return await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        // Configuración CRÍTICA para cookies
        '--disable-features=SameSiteByDefaultCookies',
        '--disable-features=CookiesWithoutSameSiteMustBeSecure',
        '--disable-site-isolation-trials',
        '--disable-features=site-per-process',
        '--allow-running-insecure-content',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--enable-aggressive-domstorage-flushing',
        // Permitir cookies de terceros
        '--third-party-cookie-allow',
        '--enable-experimental-web-platform-features',
        // Deshabilitar protecciones de privacidad para testing
        '--disable-privacy-sandbox',
        '--disable-features=PrivacySandboxAdsAPIs',
        '--disable-features=InterestFeedContentSuggestions',
        // Permitir todos los tipos de storage
        '--unlimited-storage',
        '--allow-file-access-from-files',
        '--allow-file-access',
        '--enable-local-file-accesses',
        // Network optimizations para capturar más requests
        '--aggressive-cache-discard',
        '--enable-network-service-logging'
      ],
      defaultViewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      // Configuraciones adicionales para máxima detección
      ignoreDefaultArgs: ['--enable-automation'],
      devtools: false
    });
  }

  async setupPage(page) {
    // Configurar User-Agent realista
    await page.setUserAgent(this.options.userAgent);
    
    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Configurar headers adicionales para parecer más humano
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '0', // No hacer track - irónicamente ayuda a activar más tracking
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    });
    
    // Configurar geolocalización para activar geo-targeting
    await page.setGeolocation({ latitude: 40.4168, longitude: -3.7038 }); // Madrid, España
    
    // Configurar timezone
    await page.emulateTimezone('Europe/Madrid');
    
    // Los permisos se configurarán después de navegar a la página
    
    // Inyectar APIs adicionales para detectar fingerprinting
    await page.evaluateOnNewDocument(() => {
      // Simular más APIs disponibles
      if (!window.DeviceOrientationEvent) {
        window.DeviceOrientationEvent = function() {};
      }
      if (!window.DeviceMotionEvent) {
        window.DeviceMotionEvent = function() {};
      }
      
      // Simular battery API
      if (!navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        });
      }
      
      // Agregar más propiedades realistas
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });
      
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 10,
          rtt: 50
        })
      });
    });
  }

  async setupInterceptors(page) {
    // Habilitar intercepción de requests
    await page.setRequestInterception(true);
    
    // 1. Interceptar requests para capturar cookies de terceros
    page.on('request', async (request) => {
      try {
        const headers = request.headers();
        
        // Registrar request con cookies
        if (headers.cookie) {
          const cookies = this.parseCookieHeaderValue(headers.cookie);
          cookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'requestHeaders',
              detectionMethod: 'http-request-header',
              url: request.url(),
              timestamp: new Date().toISOString(),
              requestType: request.resourceType()
            });
          });
        }
        
        // Continuar request
        request.continue();
        
      } catch (error) {
        this.scanResults.errors.push(`Error intercepting request: ${error.message}`);
        try {
          request.continue();
        } catch (e) {
          // Request ya fue manejado
        }
      }
    });
    
    // 2. Interceptar respuestas HTTP para cookies
    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const setCookieHeaders = headers['set-cookie'];
        
        if (setCookieHeaders) {
          const parsedCookies = this.parseSetCookieHeaders(setCookieHeaders);
          parsedCookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'responseHeaders',
              detectionMethod: 'http-response-header',
              url: response.url(),
              timestamp: new Date().toISOString(),
              responseStatus: response.status(),
              requestType: response.request().resourceType()
            });
          });
        }
        
        // Guardar request para análisis
        this.scanResults.networkRequests.push({
          url: response.url(),
          status: response.status(),
          headers: headers,
          timestamp: Date.now(),
          resourceType: response.request().resourceType()
        });
        
      } catch (error) {
        this.scanResults.errors.push(`Error intercepting response: ${error.message}`);
      }
    });
    
    // 2. Inyectar monitor de cookies JavaScript
    await page.evaluateOnNewDocument(() => {
      // Almacenar referencias originales
      const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      const originalSetItem = Storage.prototype.setItem;
      const originalGetItem = Storage.prototype.getItem;
      
      // Crear almacenes para datos
      window.__COOKIE_MONITOR__ = {
        writes: [],
        reads: [],
        storage: []
      };
      
      // Interceptar document.cookie
      Object.defineProperty(document, 'cookie', {
        get() {
          const value = originalCookie.get.call(this);
          window.__COOKIE_MONITOR__.reads.push({
            value,
            timestamp: Date.now(),
            stack: new Error().stack
          });
          return value;
        },
        set(value) {
          window.__COOKIE_MONITOR__.writes.push({
            value,
            timestamp: Date.now(),
            stack: new Error().stack,
            url: window.location.href
          });
          return originalCookie.set.call(this, value);
        }
      });
      
      // Interceptar localStorage
      Storage.prototype.setItem = function(key, value) {
        window.__COOKIE_MONITOR__.storage.push({
          type: 'localStorage',
          action: 'set',
          key,
          value,
          timestamp: Date.now()
        });
        return originalSetItem.call(this, key, value);
      };
      
      // Interceptar sessionStorage
      const originalSessionSetItem = sessionStorage.setItem;
      sessionStorage.setItem = function(key, value) {
        window.__COOKIE_MONITOR__.storage.push({
          type: 'sessionStorage',
          action: 'set',
          key,
          value,
          timestamp: Date.now()
        });
        return originalSessionSetItem.call(this, key, value);
      };
      
      // Detectar fingerprinting
      window.__FINGERPRINTING__ = {
        canvas: false,
        webgl: false,
        audioContext: false
      };
      
      // Canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        window.__FINGERPRINTING__.canvas = true;
        return originalToDataURL.call(this, ...args);
      };
      
      // WebGL fingerprinting
      if (window.WebGLRenderingContext) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(...args) {
          window.__FINGERPRINTING__.webgl = true;
          return originalGetParameter.call(this, ...args);
        };
      }
    });
  }

  async simulateHumanBehavior(page) {
    console.log('🤖 Simulando comportamiento humano avanzado...');
    
    try {
      // Esperar carga inicial de DOM con Puppeteer
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      
      // Múltiples pasadas para activar lazy loading
      for (let pass = 0; pass < 3; pass++) {
        console.log(`🔄 Pasada ${pass + 1}/3 de simulación`);
        
        // Scroll gradual y agresivo
        for (let i = 0; i < this.options.scrollDepth; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight / 3);
          });
          await this.wait(800 + Math.random() * 1200);
          
          // Recolectar cookies en cada scroll
          await this.collectDynamicCookies(page);
        }
        
        // Scroll hasta arriba
        await page.evaluate(() => window.scrollTo(0, 0));
        await this.wait(1000);
        
        // Scroll hasta abajo
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.wait(2000);
        
        // Movimiento de mouse aleatorio para activar eventos
        for (let i = 0; i < 5; i++) {
          await page.mouse.move(
            Math.random() * 1920,
            Math.random() * 1080
          );
          await this.wait(300);
        }
        
        // Interacciones agresivas
        await this.performAdvancedInteractions(page);
        
        // Esperar entre pasadas
        await this.wait(3000);
      }
      
      // Esperar carga final
      await this.wait(this.options.waitTime);
      
    } catch (error) {
      this.scanResults.errors.push(`Error in human behavior simulation: ${error.message}`);
    }
  }

  async performAdvancedInteractions(page) {
    try {
      console.log('🎯 Realizando interacciones avanzadas...');
      
      // 1. Buscar y activar banners de consentimiento
      const consentSelectors = [
        '[class*="accept"]', '[id*="accept"]', 'button[class*="accept"]',
        '[class*="consent"]', '[id*="consent"]', 'button[class*="consent"]',
        '[class*="agree"]', '[id*="agree"]', 'button[class*="agree"]',
        '[class*="allow"]', '[id*="allow"]', 'button[class*="allow"]',
        '[class*="cookie"]', '[id*="cookie"]', 'button[class*="cookie"]',
        '[class*="privacy"]', '[id*="privacy"]',
        '[class*="gdpr"]', '[id*="gdpr"]',
        '[data-consent]', '[data-cookie]', '[data-privacy]'
      ];
      
      for (const selector of consentSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`🔘 Activando elemento de consentimiento: ${selector}`);
            await elements[0].click();
            await this.wait(3000);
            // Recolectar cookies después del click
            await this.collectDynamicCookies(page);
          }
        } catch (e) {
          // Continuar si no se puede hacer click
        }
      }
      
      // 2. Activar eventos de mouse en elementos comunes
      const interactiveSelectors = [
        'a', 'button', '[onclick]', '[onmouseover]', '[role="button"]',
        'input[type="submit"]', 'input[type="button"]', '[data-track]',
        '[class*="track"]', '[class*="analytics"]', '[data-ga]'
      ];
      
      for (const selector of interactiveSelectors) {
        try {
          const elements = await page.$$(selector);
          const limit = Math.min(elements.length, 5); // Limitar para no ser demasiado agresivo
          
          for (let i = 0; i < limit; i++) {
            try {
              await elements[i].hover();
              await this.wait(200);
              
              // Algunos elementos requieren focus
              await elements[i].focus().catch(() => {});
              await this.wait(200);
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Continuar si no se puede hacer hover
        }
      }
      
      // 3. Activar formularios para detectar tracking
      const forms = await page.$$('form');
      for (const form of forms.slice(0, 3)) {
        try {
          await form.hover();
          await this.wait(500);
          
          // Buscar inputs y activarlos
          const inputs = await form.$$('input, textarea');
          for (const input of inputs.slice(0, 2)) {
            try {
              await input.focus();
              await this.wait(300);
            } catch (e) {}
          }
        } catch (e) {}
      }
      
      // 4. Simular navegación interna
      const internalLinks = await page.$$('a[href^="/"], a[href*="' + new URL(page.url()).hostname + '"]');
      if (internalLinks.length > 0) {
        try {
          console.log('🔗 Simulando navegación interna...');
          const link = internalLinks[0];
          await link.hover();
          await this.wait(1000);
          
          // No hacer click real, solo hover para activar prefetch/tracking
        } catch (e) {}
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error in advanced interactions: ${error.message}`);
    }
  }

  async collectAllCookies(page) {
    console.log('🍪 Recolectando todas las cookies con métodos avanzados...');
    
    try {
      // 1. Cookies del navegador (incluye todos los dominios)
      const allCookies = await page.cookies();
      console.log(`📊 Cookies del navegador encontradas: ${allCookies.length}`);
      
      allCookies.forEach(cookie => {
        this.addCookie({
          ...cookie,
          source: 'browserAPI',
          detectionMethod: 'puppeteer-cookies-api',
          timestamp: Date.now()
        });
      });
      
      // 2. Cookies de ALL domains (wildcards)
      const mainDomain = new URL(page.url()).hostname;
      const domainVariants = [
        mainDomain,
        `.${mainDomain}`,
        `www.${mainDomain}`,
        mainDomain.replace('www.', ''),
        // Subdominios comunes
        `analytics.${mainDomain}`,
        `tracking.${mainDomain}`,
        `cdn.${mainDomain}`,
        `static.${mainDomain}`
      ];
      
      for (const domain of domainVariants) {
        try {
          const domainCookies = await page.cookies(`https://${domain}`);
          domainCookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'domainSpecific',
              detectionMethod: 'domain-specific-api',
              timestamp: Date.now(),
              targetDomain: domain
            });
          });
        } catch (e) {
          // Domain no accesible
        }
      }
      
      // 3. Cookies de JavaScript runtime monitoring
      const jsData = await page.evaluate(() => window.__COOKIE_MONITOR__ || {});
      
      if (jsData.writes && jsData.writes.length > 0) {
        console.log(`📝 Cookie writes detectadas: ${jsData.writes.length}`);
        jsData.writes.forEach(write => {
          const parsed = this.parseCookieString(write.value);
          if (parsed) {
            this.addCookie({
              ...parsed,
              source: 'javascript',
              detectionMethod: 'runtime-monitoring',
              timestamp: write.timestamp,
              stackTrace: write.stack
            });
          }
        });
      }
      
      // 4. Todas las formas de storage
      await this.collectAllStorageTypes(page);
      
      // 5. Cookies desde document.cookie directo
      const documentCookies = await page.evaluate(() => {
        try {
          const cookieString = document.cookie;
          return cookieString ? cookieString.split(';').map(c => c.trim()) : [];
        } catch (e) {
          return [];
        }
      });
      
      console.log(`📄 Document.cookie encontradas: ${documentCookies.length}`);
      documentCookies.forEach(cookieStr => {
        if (cookieStr) {
          const [name, value] = cookieStr.split('=');
          if (name) {
            this.addCookie({
              name: name.trim(),
              value: value ? value.trim() : '',
              domain: mainDomain,
              source: 'documentCookie',
              detectionMethod: 'document-cookie-direct',
              timestamp: Date.now()
            });
          }
        }
      });
      
      // 6. Cookies de frames/iframes
      await this.collectFrameCookies(page);
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting cookies: ${error.message}`);
    }
  }
  
  async collectDynamicCookies(page) {
    try {
      // Recolectar cookies que pueden haber aparecido dinámicamente
      const newCookies = await page.cookies();
      newCookies.forEach(cookie => {
        this.addCookie({
          ...cookie,
          source: 'dynamic',
          detectionMethod: 'dynamic-collection',
          timestamp: Date.now()
        });
      });
      
      // Recolectar storage dinámico
      const dynamicStorage = await page.evaluate(() => {
        const data = { localStorage: {}, sessionStorage: {} };
        
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data.localStorage[key] = localStorage.getItem(key);
          }
        } catch (e) {}
        
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.sessionStorage[key] = sessionStorage.getItem(key);
          }
        } catch (e) {}
        
        return data;
      });
      
      const domain = new URL(page.url()).hostname;
      Object.entries(dynamicStorage.localStorage).forEach(([key, value]) => {
        this.addCookie({
          name: `ls_${key}`,
          value: value,
          domain,
          source: 'localStorage',
          detectionMethod: 'dynamic-storage-collection',
          timestamp: Date.now()
        });
      });
      
      Object.entries(dynamicStorage.sessionStorage).forEach(([key, value]) => {
        this.addCookie({
          name: `ss_${key}`,
          value: value,
          domain,
          source: 'sessionStorage',
          detectionMethod: 'dynamic-storage-collection',
          timestamp: Date.now()
        });
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting dynamic cookies: ${error.message}`);
    }
  }
  
  async collectAllStorageTypes(page) {
    try {
      const allStorageData = await page.evaluate(() => {
        const data = {
          localStorage: {},
          sessionStorage: {},
          indexedDB: [],
          webSQL: [],
          cookies: document.cookie
        };
        
        // localStorage
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data.localStorage[key] = localStorage.getItem(key);
          }
        } catch (e) {}
        
        // sessionStorage
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.sessionStorage[key] = sessionStorage.getItem(key);
          }
        } catch (e) {}
        
        // IndexedDB (básico)
        try {
          if (window.indexedDB) {
            // Esto es complejo, por ahora solo detectamos si existe
            data.indexedDB.push('IndexedDB_available');
          }
        } catch (e) {}
        
        return data;
      });
      
      const domain = new URL(page.url()).hostname;
      
      // Procesar localStorage
      Object.entries(allStorageData.localStorage).forEach(([key, value]) => {
        this.addCookie({
          name: `localStorage_${key}`,
          value: value,
          domain,
          source: 'localStorage',
          detectionMethod: 'complete-storage-scan',
          timestamp: Date.now(),
          size: value ? value.length : 0
        });
      });
      
      // Procesar sessionStorage
      Object.entries(allStorageData.sessionStorage).forEach(([key, value]) => {
        this.addCookie({
          name: `sessionStorage_${key}`,
          value: value,
          domain,
          source: 'sessionStorage',
          detectionMethod: 'complete-storage-scan',
          timestamp: Date.now(),
          size: value ? value.length : 0
        });
      });
      
      console.log(`💾 Storage completo - localStorage: ${Object.keys(allStorageData.localStorage).length}, sessionStorage: ${Object.keys(allStorageData.sessionStorage).length}`);
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting storage: ${error.message}`);
    }
  }
  
  async collectFrameCookies(page) {
    try {
      // Buscar todos los frames/iframes
      const frames = page.frames();
      console.log(`🖼️ Analizando ${frames.length} frames...`);
      
      for (const frame of frames) {
        try {
          if (frame.url() && frame.url() !== 'about:blank') {
            // Cookies del frame
            const frameCookies = await frame.evaluate(() => {
              try {
                return document.cookie;
              } catch (e) {
                return '';
              }
            });
            
            if (frameCookies) {
              const cookies = frameCookies.split(';');
              cookies.forEach(cookieStr => {
                if (cookieStr.trim()) {
                  const [name, value] = cookieStr.trim().split('=');
                  if (name) {
                    this.addCookie({
                      name: name.trim(),
                      value: value ? value.trim() : '',
                      domain: new URL(frame.url()).hostname,
                      source: 'iframe',
                      detectionMethod: 'iframe-cookie-scan',
                      timestamp: Date.now(),
                      frameUrl: frame.url()
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          // Frame no accesible
        }
      }
    } catch (error) {
      this.scanResults.errors.push(`Error collecting frame cookies: ${error.message}`);
    }
  }

  async detectTechnologies(page) {
    console.log('🔧 Detectando tecnologías...');
    
    try {
      const technologies = await page.evaluate(() => {
        const detected = [];
        
        // Google Analytics
        if (window.ga || window.gtag || window.dataLayer) {
          detected.push('Google Analytics');
        }
        
        // Facebook Pixel
        if (window.fbq) {
          detected.push('Facebook Pixel');
        }
        
        // Google Tag Manager
        if (window.google_tag_manager) {
          detected.push('Google Tag Manager');
        }
        
        // Hotjar
        if (window.hj) {
          detected.push('Hotjar');
        }
        
        // Mixpanel
        if (window.mixpanel) {
          detected.push('Mixpanel');
        }
        
        // Segment
        if (window.analytics) {
          detected.push('Segment');
        }
        
        return detected;
      });
      
      technologies.forEach(tech => this.scanResults.technologies.add(tech));
      
      // Detectar por scripts
      const scripts = await page.$$eval('script[src]', scripts => 
        scripts.map(script => script.src)
      );
      
      this.scanResults.scripts = scripts;
      
      // Analizar scripts por patrones conocidos
      scripts.forEach(src => {
        if (src.includes('google-analytics.com')) {
          this.scanResults.technologies.add('Google Analytics');
        }
        if (src.includes('googletagmanager.com')) {
          this.scanResults.technologies.add('Google Tag Manager');
        }
        if (src.includes('connect.facebook.net')) {
          this.scanResults.technologies.add('Facebook Pixel');
        }
        if (src.includes('hotjar.com')) {
          this.scanResults.technologies.add('Hotjar');
        }
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error detecting technologies: ${error.message}`);
    }
  }

  async collectPageData(page) {
    try {
      return await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
        fingerprinting: window.__FINGERPRINTING__ || {},
        hasServiceWorker: 'serviceWorker' in navigator,
        cookieCount: document.cookie.split(';').filter(c => c.trim()).length
      }));
    } catch (error) {
      this.scanResults.errors.push(`Error collecting page data: ${error.message}`);
      return {};
    }
  }

  addCookie(cookieData) {
    const key = `${cookieData.name}_${cookieData.domain || 'unknown'}_${cookieData.source || 'unknown'}`;
    
    // Permitir múltiples fuentes de la misma cookie
    if (!this.scanResults.cookies.has(key)) {
      // Enriquecer datos de la cookie
      const enrichedCookie = {
        ...cookieData,
        size: cookieData.value ? cookieData.value.length : 0,
        isPersistent: !!(cookieData.expires || cookieData.maxAge),
        isThirdParty: this.isThirdParty(cookieData.domain, cookieData.url),
        timestamp: cookieData.timestamp || Date.now(),
        // Campos adicionales para mejor análisis
        isSecure: !!cookieData.secure,
        isHttpOnly: !!cookieData.httpOnly,
        sameSite: cookieData.sameSite || 'None',
        // Clasificación automática básica
        category: this.classifyBasicCookie(cookieData.name, cookieData.value),
        // Información de detección
        detectionInfo: {
          method: cookieData.detectionMethod,
          source: cookieData.source,
          timestamp: cookieData.timestamp || Date.now()
        }
      };
      
      this.scanResults.cookies.set(key, enrichedCookie);
      
      // Log para debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🆕 Nueva cookie detectada: ${cookieData.name} (${cookieData.source}/${cookieData.detectionMethod})`);
      }
    } else {
      // Si ya existe, agregar información de múltiples fuentes
      const existing = this.scanResults.cookies.get(key);
      if (existing.detectionInfo && !Array.isArray(existing.detectionInfo)) {
        existing.detectionInfo = [existing.detectionInfo];
      }
      if (Array.isArray(existing.detectionInfo)) {
        existing.detectionInfo.push({
          method: cookieData.detectionMethod,
          source: cookieData.source,
          timestamp: cookieData.timestamp || Date.now()
        });
      }
    }
  }
  
  classifyBasicCookie(name, value) {
    const nameStr = (name || '').toLowerCase();
    const valueStr = (value || '').toLowerCase();
    
    // Clasificación básica por patrones comunes
    if (nameStr.includes('analytics') || nameStr.includes('ga') || nameStr.includes('_ga')) {
      return 'analytics';
    }
    if (nameStr.includes('ads') || nameStr.includes('advertising') || nameStr.includes('doubleclick')) {
      return 'advertising';
    }
    if (nameStr.includes('session') || nameStr.includes('sess') || nameStr.includes('jsession')) {
      return 'necessary';
    }
    if (nameStr.includes('consent') || nameStr.includes('cookie') || nameStr.includes('gdpr')) {
      return 'necessary';
    }
    if (nameStr.includes('pref') || nameStr.includes('lang') || nameStr.includes('currency')) {
      return 'preferences';
    }
    if (nameStr.includes('track') || nameStr.includes('utm') || nameStr.includes('campaign')) {
      return 'marketing';
    }
    
    return 'unknown';
  }
  
  parseCookieHeaderValue(cookieHeader) {
    const cookies = [];
    if (!cookieHeader) return cookies;
    
    const pairs = cookieHeader.split(';');
    pairs.forEach(pair => {
      const [name, value] = pair.trim().split('=');
      if (name) {
        cookies.push({
          name: name.trim(),
          value: value ? value.trim() : ''
        });
      }
    });
    
    return cookies;
  }

  parseSetCookieHeaders(setCookieHeaders) {
    const cookies = [];
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    
    headers.forEach(header => {
      const parsed = this.parseCookieString(header);
      if (parsed) cookies.push(parsed);
    });
    
    return cookies;
  }

  parseCookieString(cookieString) {
    if (!cookieString) return null;
    
    const parts = cookieString.split(';').map(part => part.trim());
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');
    
    if (!name) return null;
    
    const cookie = {
      name: name.trim(),
      value: value ? value.trim() : '',
      httpOnly: false,
      secure: false,
      sameSite: ''
    };
    
    // Parsear atributos
    parts.slice(1).forEach(part => {
      const [key, val] = part.split('=');
      const lowerKey = key.toLowerCase();
      
      switch (lowerKey) {
        case 'expires':
          cookie.expires = new Date(val);
          break;
        case 'max-age':
          cookie.maxAge = parseInt(val);
          break;
        case 'domain':
          cookie.domain = val;
          break;
        case 'path':
          cookie.path = val;
          break;
        case 'httponly':
          cookie.httpOnly = true;
          break;
        case 'secure':
          cookie.secure = true;
          break;
        case 'samesite':
          cookie.sameSite = val || 'None';
          break;
      }
    });
    
    return cookie;
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

module.exports = AdvancedCookieScanner;