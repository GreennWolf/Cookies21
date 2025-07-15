const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

/**
 * ULTRA ADVANCED COOKIE SCANNER V3.0
 * Implementa las técnicas más avanzadas de detección de cookies de 2024
 * Basado en investigación de técnicas profesionales de web scraping
 */
class UltraAdvancedCookieScanner {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 180000, // 3 minutos
      waitTime: 15000,  // 15 segundos para carga dinámica
      scrollDepth: 8,
      interactionLevel: 'aggressive',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.scanResults = {
      cookies: new Map(),
      networkRequests: [],
      scripts: [],
      technologies: new Set(),
      errors: [],
      storageData: {
        localStorage: {},
        sessionStorage: {},
        indexedDB: [],
        webSQL: [],
        cacheAPI: []
      }
    };
  }

  async scan(url) {
    const startTime = Date.now();
    const scanId = uuidv4();
    
    console.log(`🚀 [UltraAdvancedScanner] Iniciando escaneo ULTRA AVANZADO: ${url}`);
    console.log(`📋 Scan ID: ${scanId}`);

    try {
      // 1. Inicializar navegador con configuración extrema
      this.browser = await this.initUltraAdvancedBrowser();
      this.page = await this.browser.newPage();
      
      // 2. Configurar CDP Session para acceso completo
      await this.setupCDPSession();
      
      // 3. Configurar interceptores agresivos
      await this.setupUltraInterceptors();
      
      // 4. Configurar página con máximo realismo
      await this.setupUltraRealisticPage();
      
      // 5. Navegar con técnicas anti-detección
      console.log(`🌐 Navegando con técnicas anti-detección: ${url}`);
      await this.navigateWithStealth(url);
      
      // 6. Ejecutar simulación humana ultra avanzada
      await this.executeUltraHumanSimulation();
      
      // 7. Recolectar TODAS las cookies usando múltiples métodos
      await this.collectAllCookiesUltraMode();
      
      // 8. Detectar tecnologías y scripts avanzados
      await this.detectAdvancedTechnologies();
      
      // 9. Recolectar todos los tipos de storage
      await this.collectAllStorageTypes();
      
      // 10. Análisis de iframes y subdominios
      await this.analyzeIframesAndSubdomains();
      
      // 11. Detectar cookies de terceros usando CDP
      await this.detectThirdPartyCookiesViaCDP();
      
      // 12. Recolectar datos de red avanzados
      const pageData = await this.collectAdvancedPageData();
      
      await this.browser.close();
      
      const scanDuration = Date.now() - startTime;
      console.log(`✅ [UltraAdvancedScanner] Escaneo ULTRA completado en ${scanDuration}ms`);
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
        storageData: this.scanResults.storageData,
        pageData,
        errors: this.scanResults.errors
      };
      
    } catch (error) {
      console.error('❌ [UltraAdvancedScanner] Error durante escaneo:', error);
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }

  async initUltraAdvancedBrowser() {
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
        
        // CONFIGURACIÓN CRÍTICA PARA COOKIES ULTRA AGRESIVA
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
        
        // PERMITIR COOKIES DE TERCEROS AGRESIVAMENTE
        '--third-party-cookie-allow',
        '--enable-experimental-web-platform-features',
        '--disable-privacy-sandbox',
        '--disable-features=PrivacySandboxAdsAPIs',
        '--disable-features=InterestFeedContentSuggestions',
        '--unlimited-storage',
        '--allow-file-access-from-files',
        '--allow-file-access',
        '--enable-local-file-accesses',
        '--aggressive-cache-discard',
        '--enable-network-service-logging',
        
        // NUEVAS FLAGS ULTRA AVANZADAS PARA 2024
        '--disable-features=BlockThirdPartyCookies',
        '--disable-features=CookiesWithoutSameSiteMustBeSecure',
        '--disable-features=SameSiteByDefaultCookies',
        '--enable-features=ThirdPartyStoragePartitioning',
        '--disable-features=StorageAccessAPI',
        '--disable-features=FedCm',
        '--disable-web-security',
        '--disable-cors',
        '--allow-cross-origin-auth-prompt',
        '--disable-features=VizDisplayCompositor',
        '--enable-features=NetworkService',
        '--enable-features=NetworkServiceLogging',
        
        // FINGERPRINTING Y ANTI-DETECCIÓN 
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-zygote',
        '--single-process',
        '--disable-gpu-sandbox',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-ipc-flooding-protection',
        '--enable-features=NetworkServiceLogging,VaapiVideoDecoder',
        '--force-color-profile=srgb',
        '--disable-features=TranslateUI',
        '--disable-features=BlinkGenPropertyTrees',
        '--run-all-compositor-stages-before-draw',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-checker-imaging'
      ],
      defaultViewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation'],
      devtools: false,
      // CONFIGURACIONES ADICIONALES PARA MÁXIMA DETECCIÓN
      executablePath: undefined, // Usar Chrome por defecto
      slowMo: 0,
      timeout: 0
    });
  }

  async setupCDPSession() {
    // Crear sesión CDP para acceso completo a todas las APIs
    this.cdpSession = await this.page.target().createCDPSession();
    
    // Habilitar dominios CDP disponibles (con manejo de errores)
    const cdpDomains = [
      'Runtime',
      'Network',
      'DOMStorage',
      'IndexedDB',
      'ApplicationCache'
    ];
    
    for (const domain of cdpDomains) {
      try {
        await this.cdpSession.send(`${domain}.enable`);
        console.log(`✅ CDP ${domain} habilitado`);
      } catch (error) {
        console.log(`⚠️ CDP ${domain} no disponible: ${error.message}`);
        this.scanResults.errors.push(`CDP ${domain} not available: ${error.message}`);
      }
    }
    
    // Intentar habilitar dominios adicionales (opcionales)
    const optionalDomains = ['Storage', 'Database', 'CacheStorage'];
    for (const domain of optionalDomains) {
      try {
        await this.cdpSession.send(`${domain}.enable`);
        console.log(`✅ CDP ${domain} (opcional) habilitado`);
      } catch (error) {
        console.log(`⚠️ CDP ${domain} (opcional) no disponible - continuando...`);
      }
    }
    
    console.log('🔧 CDP Session configurada con dominios disponibles');
  }

  async setupUltraInterceptors() {
    // Habilitar intercepción de requests
    await this.page.setRequestInterception(true);
    
    // Interceptor de requests ULTRA AGRESIVO
    this.page.on('request', async (request) => {
      try {
        const headers = request.headers();
        
        // Capturar TODAS las cookies en requests
        if (headers.cookie) {
          const cookies = this.parseAllCookieFormats(headers.cookie);
          cookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'requestHeaders',
              detectionMethod: 'http-request-interception',
              url: request.url(),
              timestamp: Date.now(),
              requestType: request.resourceType()
            });
          });
        }
        
        // Registrar request para análisis
        this.scanResults.networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: headers,
          resourceType: request.resourceType(),
          timestamp: Date.now(),
          hascookies: !!headers.cookie
        });
        
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
    
    // Interceptor de responses ULTRA AGRESIVO
    this.page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const setCookieHeaders = headers['set-cookie'];
        
        if (setCookieHeaders) {
          const parsedCookies = this.parseSetCookieHeaders(setCookieHeaders);
          parsedCookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'responseHeaders',
              detectionMethod: 'http-response-interception',
              url: response.url(),
              timestamp: Date.now(),
              responseStatus: response.status(),
              requestType: response.request().resourceType()
            });
          });
        }
        
      } catch (error) {
        this.scanResults.errors.push(`Error intercepting response: ${error.message}`);
      }
    });

    // Interceptor CDP para eventos de red (si está disponible)
    try {
      this.cdpSession.on('Network.responseReceived', (event) => {
        const response = event.response;
        if (response.headers && response.headers['set-cookie']) {
          const cookies = this.parseSetCookieHeaders(response.headers['set-cookie']);
          cookies.forEach(cookie => {
            this.addCookie({
              ...cookie,
              source: 'cdpNetwork',
              detectionMethod: 'cdp-network-response',
              url: response.url,
              timestamp: Date.now()
            });
          });
        }
      });
    } catch (error) {
      console.log('⚠️ CDP Network events no disponibles');
    }
  }

  async setupUltraRealisticPage() {
    // User-Agent ultra realista
    await this.page.setUserAgent(this.options.userAgent);
    
    // Viewport realista
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Headers HTTP ultra realistas
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8,fr;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'DNT': '0',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });
    
    // Geolocalización para activar geo-targeting
    await this.page.setGeolocation({ latitude: 40.4168, longitude: -3.7038 });
    
    // Timezone
    await this.page.emulateTimezone('Europe/Madrid');
    
    // Inyectar scripts ultra avanzados ANTES de la navegación
    await this.page.evaluateOnNewDocument(() => {
      // Ocultar automatización
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Simular APIs completas
      if (!window.DeviceOrientationEvent) {
        window.DeviceOrientationEvent = function() {};
      }
      
      if (!window.DeviceMotionEvent) {
        window.DeviceMotionEvent = function() {};
      }
      
      // Battery API realista
      if (!navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.95
        });
      }
      
      // Propiedades del navegador realistas
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        })
      });
      
      // Screen properties realistas
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
      
      // Plugin list realista
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
        ]
      });
      
      // ULTRA ADVANCED COOKIE MONITORING
      window.__ULTRA_COOKIE_MONITOR__ = {
        writes: [],
        reads: [],
        storage: [],
        mutations: [],
        networkCookies: []
      };
      
      // Interceptar TODAS las operaciones de cookies
      const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      
      Object.defineProperty(document, 'cookie', {
        get() {
          const value = originalCookie.get.call(this);
          window.__ULTRA_COOKIE_MONITOR__.reads.push({
            value,
            timestamp: Date.now(),
            stack: new Error().stack,
            url: window.location.href
          });
          return value;
        },
        set(value) {
          window.__ULTRA_COOKIE_MONITOR__.writes.push({
            value,
            timestamp: Date.now(),
            stack: new Error().stack,
            url: window.location.href,
            userAgent: navigator.userAgent
          });
          return originalCookie.set.call(this, value);
        }
      });
      
      // Interceptar ALL storage APIs
      ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        const originalSetItem = storage.setItem;
        const originalGetItem = storage.getItem;
        const originalRemoveItem = storage.removeItem;
        const originalClear = storage.clear;
        
        storage.setItem = function(key, value) {
          window.__ULTRA_COOKIE_MONITOR__.storage.push({
            type: storageType,
            action: 'set',
            key,
            value,
            timestamp: Date.now(),
            url: window.location.href
          });
          return originalSetItem.call(this, key, value);
        };
        
        storage.getItem = function(key) {
          const value = originalGetItem.call(this, key);
          window.__ULTRA_COOKIE_MONITOR__.storage.push({
            type: storageType,
            action: 'get',
            key,
            value,
            timestamp: Date.now(),
            url: window.location.href
          });
          return value;
        };
      });
      
      // Monitor de mutaciones DOM para detectar cookies dinámicas
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                  // Buscar scripts que podrían establecer cookies
                  if (node.tagName === 'SCRIPT' || node.querySelector && node.querySelector('script')) {
                    window.__ULTRA_COOKIE_MONITOR__.mutations.push({
                      type: 'script_added',
                      timestamp: Date.now(),
                      url: window.location.href,
                      nodeName: node.tagName
                    });
                  }
                }
              });
            }
          });
        });
        observer.observe(document, { childList: true, subtree: true });
      }
      
      // Detectar fingerprinting avanzado
      window.__ULTRA_FINGERPRINTING__ = {
        canvas: false,
        webgl: false,
        audioContext: false,
        webrtc: false,
        fonts: false
      };
      
      // Canvas fingerprinting
      const canvasMethods = ['toDataURL', 'getImageData'];
      canvasMethods.forEach(method => {
        if (HTMLCanvasElement.prototype[method]) {
          const original = HTMLCanvasElement.prototype[method];
          HTMLCanvasElement.prototype[method] = function(...args) {
            window.__ULTRA_FINGERPRINTING__.canvas = true;
            return original.call(this, ...args);
          };
        }
      });
      
      // WebGL fingerprinting
      if (window.WebGLRenderingContext) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(...args) {
          window.__ULTRA_FINGERPRINTING__.webgl = true;
          return originalGetParameter.call(this, ...args);
        };
      }
      
      // Audio fingerprinting
      if (window.AudioContext || window.webkitAudioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const originalCreateOscillator = AudioCtx.prototype.createOscillator;
        AudioCtx.prototype.createOscillator = function(...args) {
          window.__ULTRA_FINGERPRINTING__.audioContext = true;
          return originalCreateOscillator.call(this, ...args);
        };
      }
    });
  }

  async navigateWithStealth(url) {
    // Configurar permisos válidos antes de navegar
    try {
      const context = this.page.browserContext();
      await context.overridePermissions(url, [
        'geolocation',
        'notifications',
        'camera',
        'microphone',
        'midi'
      ]);
    } catch (permError) {
      console.log('⚠️ No se pudieron configurar permisos:', permError.message);
    }
    
    // Navegar con múltiples opciones de espera
    await this.page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: this.options.timeout 
    });
    
    // Esperar carga adicional
    await this.wait(3000);
  }

  async executeUltraHumanSimulation() {
    console.log('🤖 Ejecutando simulación humana ULTRA AVANZADA...');
    
    try {
      // Múltiples pasadas ULTRA agresivas
      for (let pass = 0; pass < 5; pass++) {
        console.log(`🔄 Pasada ULTRA ${pass + 1}/5`);
        
        // Scroll ultra agresivo en múltiples direcciones
        for (let i = 0; i < this.options.scrollDepth; i++) {
          // Scroll vertical
          await this.page.evaluate(() => {
            window.scrollBy(0, window.innerHeight / 2);
          });
          await this.wait(300 + Math.random() * 500);
          
          // Scroll horizontal aleatorio
          if (Math.random() > 0.7) {
            await this.page.evaluate(() => {
              window.scrollBy(Math.random() * 200 - 100, 0);
            });
          }
          
          // Recolectar cookies dinámicamente
          await this.collectDynamicCookies();
        }
        
        // Interacciones ULTRA agresivas
        await this.performUltraAggressiveInteractions();
        
        // Activar eventos de mouse complejos
        await this.triggerComplexMouseEvents();
        
        // Simular interacciones de teclado
        await this.simulateKeyboardInteractions();
        
        // Esperar entre pasadas
        await this.wait(2000 + Math.random() * 3000);
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error in ultra human simulation: ${error.message}`);
    }
  }

  async performUltraAggressiveInteractions() {
    try {
      console.log('🎯 Realizando interacciones ULTRA agresivas...');
      
      // Selectores de consentimiento MUY amplios
      const consentSelectors = [
        // Básicos
        '[class*="accept"]', '[id*="accept"]', 'button[class*="accept"]',
        '[class*="consent"]', '[id*="consent"]', 'button[class*="consent"]',
        '[class*="agree"]', '[id*="agree"]', 'button[class*="agree"]',
        '[class*="allow"]', '[id*="allow"]', 'button[class*="allow"]',
        '[class*="cookie"]', '[id*="cookie"]', 'button[class*="cookie"]',
        '[class*="privacy"]', '[id*="privacy"]',
        '[class*="gdpr"]', '[id*="gdpr"]',
        
        // Avanzados y específicos
        '[data-consent]', '[data-cookie]', '[data-privacy]', '[data-accept]',
        '[data-testid*="accept"]', '[data-testid*="consent"]', '[data-testid*="cookie"]',
        '[aria-label*="accept"]', '[aria-label*="consent"]', '[aria-label*="cookie"]',
        'button[type="submit"]', 'input[type="submit"]',
        'a[href*="accept"]', 'a[href*="consent"]',
        
        // Patrones de clase comunes
        '.btn-accept', '.btn-consent', '.btn-agree', '.btn-allow',
        '.cookie-accept', '.cookie-consent', '.privacy-accept',
        '.gdpr-accept', '.banner-accept', '.modal-accept',
        
        // IDs comunes
        '#accept-cookies', '#consent-button', '#agree-button',
        '#cookie-accept', '#privacy-accept', '#gdpr-accept',
        '#accept-all', '#allow-all', '#consent-all',
        
        // Selectores de CMP populares
        '[id*="onetrust"]', '[class*="onetrust"]',
        '[id*="cookiebot"]', '[class*="cookiebot"]',
        '[id*="iubenda"]', '[class*="iubenda"]',
        '[id*="quantcast"]', '[class*="quantcast"]',
        '[id*="trustarc"]', '[class*="trustarc"]',
        '[id*="didomi"]', '[class*="didomi"]',
        '[id*="klaro"]', '[class*="klaro"]',
        
        // Términos en otros idiomas
        '[class*="acceptar"]', '[class*="aceptar"]', '[id*="acceptar"]',
        '[class*="aceitar"]', '[class*="akzeptieren"]', '[class*="accettare"]',
        '[class*="accepter"]', '[class*="принять"]', '[class*="同意"]'
      ];
      
      // Probar cada selector
      for (const selector of consentSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            console.log(`🔘 Encontrado elemento de consentimiento: ${selector} (${elements.length} elementos)`);
            
            // Intentar hacer click en todos los elementos encontrados
            for (let i = 0; i < Math.min(elements.length, 3); i++) {
              try {
                await elements[i].click();
                console.log(`✅ Click exitoso en elemento ${i + 1}`);
                await this.wait(1000);
                
                // Recolectar cookies después del click
                await this.collectDynamicCookies();
              } catch (clickError) {
                console.log(`⚠️ No se pudo hacer click en elemento ${i + 1}: ${clickError.message}`);
              }
            }
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      // Interacciones con formularios
      await this.interactWithForms();
      
      // Activar eventos específicos de tracking
      await this.triggerTrackingEvents();
      
    } catch (error) {
      this.scanResults.errors.push(`Error in ultra aggressive interactions: ${error.message}`);
    }
  }

  async interactWithForms() {
    try {
      const forms = await this.page.$$('form');
      console.log(`📝 Interactuando con ${forms.length} formularios...`);
      
      for (const form of forms.slice(0, 5)) {
        try {
          // Hover sobre el formulario
          await form.hover();
          await this.wait(500);
          
          // Buscar y activar inputs
          const inputs = await form.$$('input, textarea, select');
          for (const input of inputs.slice(0, 3)) {
            try {
              await input.focus();
              await this.wait(200);
              
              // Simular typing en algunos inputs
              const inputType = await input.evaluate(el => el.type);
              if (['text', 'email', 'search'].includes(inputType)) {
                await input.type('test@example.com', { delay: 100 });
                await this.wait(300);
              }
            } catch (e) {}
          }
          
          // Buscar botones de submit
          const submitButtons = await form.$$('button[type="submit"], input[type="submit"]');
          for (const button of submitButtons.slice(0, 1)) {
            try {
              await button.hover();
              await this.wait(500);
            } catch (e) {}
          }
          
        } catch (e) {}
      }
    } catch (error) {
      this.scanResults.errors.push(`Error interacting with forms: ${error.message}`);
    }
  }

  async triggerComplexMouseEvents() {
    try {
      // Movimientos de mouse complejos y realistas
      const movements = [
        { x: 100, y: 200 }, { x: 300, y: 150 }, { x: 500, y: 400 },
        { x: 700, y: 300 }, { x: 900, y: 500 }, { x: 1200, y: 200 }
      ];
      
      for (const pos of movements) {
        await this.page.mouse.move(pos.x, pos.y, { steps: 10 });
        await this.wait(100 + Math.random() * 200);
        
        // Ocasionalmente hacer click
        if (Math.random() > 0.8) {
          await this.page.mouse.click(pos.x, pos.y);
          await this.wait(300);
        }
      }
      
      // Eventos de wheel
      await this.page.mouse.wheel({ deltaY: 100 });
      await this.wait(500);
      await this.page.mouse.wheel({ deltaY: -50 });
      
    } catch (error) {
      this.scanResults.errors.push(`Error in complex mouse events: ${error.message}`);
    }
  }

  async simulateKeyboardInteractions() {
    try {
      // Simular combinaciones de teclas comunes
      const keySequences = [
        ['Tab'], ['Tab'], ['Enter'],
        ['Escape'], ['Space'],
        ['ArrowDown'], ['ArrowUp'],
        ['F5'] // Refresh ocasional
      ];
      
      for (const keys of keySequences) {
        try {
          for (const key of keys) {
            await this.page.keyboard.press(key);
            await this.wait(200);
          }
        } catch (e) {}
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error in keyboard interactions: ${error.message}`);
    }
  }

  async triggerTrackingEvents() {
    try {
      // Disparar eventos JavaScript que activan tracking
      await this.page.evaluate(() => {
        // Eventos de tracking comunes
        const events = ['mouseenter', 'mouseleave', 'focus', 'blur', 'scroll', 'resize'];
        
        events.forEach(eventType => {
          try {
            const event = new Event(eventType, { bubbles: true });
            document.dispatchEvent(event);
            window.dispatchEvent(event);
          } catch (e) {}
        });
        
        // Eventos específicos para activar analytics
        if (window.gtag) {
          try {
            window.gtag('event', 'page_view', { page_title: document.title });
          } catch (e) {}
        }
        
        if (window.dataLayer) {
          try {
            window.dataLayer.push({ event: 'custom_interaction' });
          } catch (e) {}
        }
        
        // Eventos para Facebook Pixel
        if (window.fbq) {
          try {
            window.fbq('track', 'PageView');
          } catch (e) {}
        }
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error triggering tracking events: ${error.message}`);
    }
  }

  async collectAllCookiesUltraMode() {
    console.log('🍪 Recolectando TODAS las cookies con modo ULTRA...');
    
    try {
      // 1. Cookies del navegador usando CDP (más completo que page.cookies())
      try {
        const allCDPCookies = await this.cdpSession.send('Network.getAllCookies');
        console.log(`📊 CDP getAllCookies: ${allCDPCookies.cookies.length} cookies`);
        
        allCDPCookies.cookies.forEach(cookie => {
          this.addCookie({
            ...cookie,
            source: 'cdpGetAllCookies',
            detectionMethod: 'cdp-get-all-cookies',
            timestamp: Date.now()
          });
        });
      } catch (cdpError) {
        console.log('⚠️ CDP getAllCookies no disponible, usando método alternativo');
        this.scanResults.errors.push(`CDP getAllCookies failed: ${cdpError.message}`);
      }
      
      // 2. Cookies específicas de la página actual
      const pageCookies = await this.page.cookies();
      console.log(`📊 Page cookies: ${pageCookies.length} cookies`);
      
      pageCookies.forEach(cookie => {
        this.addCookie({
          ...cookie,
          source: 'pageCookies',
          detectionMethod: 'page-cookies-api',
          timestamp: Date.now()
        });
      });
      
      // 3. Cookies de múltiples dominios usando CDP
      await this.collectCookiesFromMultipleDomains();
      
      // 4. Cookies del monitor JavaScript ULTRA
      const jsData = await this.page.evaluate(() => window.__ULTRA_COOKIE_MONITOR__ || {});
      
      if (jsData.writes && jsData.writes.length > 0) {
        console.log(`📝 Cookie writes detectadas: ${jsData.writes.length}`);
        jsData.writes.forEach(write => {
          const parsed = this.parseCookieString(write.value);
          if (parsed) {
            this.addCookie({
              ...parsed,
              source: 'javascriptMonitor',
              detectionMethod: 'ultra-runtime-monitoring',
              timestamp: write.timestamp,
              stackTrace: write.stack,
              originalUrl: write.url
            });
          }
        });
      }
      
      // 5. Todas las formas de storage
      await this.collectAllStorageTypesUltra();
      
      // 6. Document.cookie directo con múltiples intentos
      await this.collectDocumentCookiesUltra();
      
      // 7. Cookies de frames usando CDP
      await this.collectFrameCookiesUltra();
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting ultra cookies: ${error.message}`);
    }
  }

  async collectCookiesFromMultipleDomains() {
    try {
      const mainDomain = new URL(this.page.url()).hostname;
      
      // Generar variantes de dominio más exhaustivas
      const domainVariants = [
        mainDomain,
        `.${mainDomain}`,
        `www.${mainDomain}`,
        mainDomain.replace('www.', ''),
        // Subdominios comunes de tracking
        `analytics.${mainDomain}`,
        `tracking.${mainDomain}`,
        `cdn.${mainDomain}`,
        `static.${mainDomain}`,
        `assets.${mainDomain}`,
        `api.${mainDomain}`,
        `metrics.${mainDomain}`,
        `tags.${mainDomain}`,
        `ads.${mainDomain}`,
        `media.${mainDomain}`,
        // Subdominios de terceros comunes
        'doubleclick.net',
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com',
        'connect.facebook.net',
        'hotjar.com',
        'mixpanel.com',
        'segment.com',
        'amplitude.com'
      ];
      
      for (const domain of domainVariants) {
        try {
          const domainCookies = await this.cdpSession.send('Network.getCookies', { 
            urls: [`https://${domain}`, `http://${domain}`] 
          });
          
          if (domainCookies.cookies.length > 0) {
            console.log(`🌐 Cookies de ${domain}: ${domainCookies.cookies.length}`);
            domainCookies.cookies.forEach(cookie => {
              this.addCookie({
                ...cookie,
                source: 'multiDomain',
                detectionMethod: 'cdp-domain-specific',
                timestamp: Date.now(),
                targetDomain: domain
              });
            });
          }
        } catch (e) {
          // Dominio no accesible o error CDP
          console.log(`⚠️ No se pudo acceder a cookies de ${domain}: ${e.message}`);
        }
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting multi-domain cookies: ${error.message}`);
    }
  }

  async collectAllStorageTypesUltra() {
    try {
      // Storage completo usando múltiples métodos
      const allStorageData = await this.page.evaluate(() => {
        const data = {
          localStorage: {},
          sessionStorage: {},
          cookieString: '',
          storageEvents: []
        };
        
        // localStorage completo
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            data.localStorage[key] = value;
          }
        } catch (e) {}
        
        // sessionStorage completo
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            data.sessionStorage[key] = value;
          }
        } catch (e) {}
        
        // Document.cookie completo
        try {
          data.cookieString = document.cookie;
        } catch (e) {}
        
        // Datos del monitor si existen
        if (window.__ULTRA_COOKIE_MONITOR__) {
          data.storageEvents = window.__ULTRA_COOKIE_MONITOR__.storage;
        }
        
        return data;
      });
      
      const domain = new URL(this.page.url()).hostname;
      
      // Procesar localStorage
      Object.entries(allStorageData.localStorage).forEach(([key, value]) => {
        this.addCookie({
          name: `localStorage_${key}`,
          value: value,
          domain,
          source: 'localStorage',
          detectionMethod: 'ultra-storage-scan',
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
          detectionMethod: 'ultra-storage-scan',
          timestamp: Date.now(),
          size: value ? value.length : 0
        });
      });
      
      console.log(`💾 Storage ULTRA - localStorage: ${Object.keys(allStorageData.localStorage).length}, sessionStorage: ${Object.keys(allStorageData.sessionStorage).length}`);
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting ultra storage: ${error.message}`);
    }
  }

  async collectDocumentCookiesUltra() {
    try {
      // Múltiples intentos de document.cookie
      for (let attempt = 0; attempt < 3; attempt++) {
        const cookieString = await this.page.evaluate(() => {
          try {
            return document.cookie;
          } catch (e) {
            return '';
          }
        });
        
        if (cookieString) {
          const cookies = cookieString.split(';').filter(c => c.trim());
          console.log(`📄 Document.cookie intento ${attempt + 1}: ${cookies.length} cookies`);
          
          cookies.forEach(cookieStr => {
            if (cookieStr.trim()) {
              const [name, value] = cookieStr.trim().split('=');
              if (name) {
                this.addCookie({
                  name: name.trim(),
                  value: value ? value.trim() : '',
                  domain: new URL(this.page.url()).hostname,
                  source: 'documentCookie',
                  detectionMethod: `ultra-document-cookie-attempt-${attempt + 1}`,
                  timestamp: Date.now()
                });
              }
            }
          });
        }
        
        await this.wait(1000);
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting document cookies ultra: ${error.message}`);
    }
  }

  async collectFrameCookiesUltra() {
    try {
      const frames = this.page.frames();
      console.log(`🖼️ Analizando ${frames.length} frames con método ULTRA...`);
      
      for (const frame of frames) {
        try {
          if (frame.url() && frame.url() !== 'about:blank') {
            // Cookies del frame usando evaluate
            const frameCookies = await frame.evaluate(() => {
              try {
                return {
                  cookies: document.cookie,
                  domain: window.location.hostname,
                  url: window.location.href
                };
              } catch (e) {
                return { cookies: '', domain: '', url: '' };
              }
            });
            
            if (frameCookies.cookies) {
              const cookies = frameCookies.cookies.split(';');
              console.log(`🔍 Frame ${frameCookies.domain}: ${cookies.length} cookies`);
              
              cookies.forEach(cookieStr => {
                if (cookieStr.trim()) {
                  const [name, value] = cookieStr.trim().split('=');
                  if (name) {
                    this.addCookie({
                      name: name.trim(),
                      value: value ? value.trim() : '',
                      domain: frameCookies.domain || new URL(frame.url()).hostname,
                      source: 'iframe',
                      detectionMethod: 'ultra-iframe-scan',
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
      this.scanResults.errors.push(`Error collecting ultra frame cookies: ${error.message}`);
    }
  }

  async detectThirdPartyCookiesViaCDP() {
    try {
      console.log('🔍 Detectando cookies de terceros via CDP...');
      
      // Usar CDP para obtener cookies de terceros específicamente
      try {
        const allCookies = await this.cdpSession.send('Network.getAllCookies');
        const currentDomain = new URL(this.page.url()).hostname;
        
        const thirdPartyCookies = allCookies.cookies.filter(cookie => {
          const cookieDomain = cookie.domain.replace(/^\./, '');
          return !currentDomain.includes(cookieDomain) && !cookieDomain.includes(currentDomain);
        });
        
        console.log(`🌐 Cookies de terceros detectadas: ${thirdPartyCookies.length}`);
        
        thirdPartyCookies.forEach(cookie => {
          this.addCookie({
            ...cookie,
            source: 'thirdParty',
            detectionMethod: 'cdp-third-party-detection',
            timestamp: Date.now(),
            isThirdParty: true
          });
        });
      } catch (cdpError) {
        console.log('⚠️ CDP third party detection no disponible');
        this.scanResults.errors.push(`CDP third party detection failed: ${cdpError.message}`);
        
        // Método alternativo usando page.cookies()
        const pageCookies = await this.page.cookies();
        const currentDomain = new URL(this.page.url()).hostname;
        
        const thirdPartyCookies = pageCookies.filter(cookie => {
          const cookieDomain = cookie.domain.replace(/^\./, '');
          return !currentDomain.includes(cookieDomain) && !cookieDomain.includes(currentDomain);
        });
        
        console.log(`🌐 Cookies de terceros (método alternativo): ${thirdPartyCookies.length}`);
        
        thirdPartyCookies.forEach(cookie => {
          this.addCookie({
            ...cookie,
            source: 'thirdPartyAlternative',
            detectionMethod: 'page-cookies-third-party',
            timestamp: Date.now(),
            isThirdParty: true
          });
        });
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error detecting third party cookies: ${error.message}`);
    }
  }

  async collectDynamicCookies() {
    try {
      // Recolección dinámica rápida durante interacciones
      const newCookies = await this.page.cookies();
      newCookies.forEach(cookie => {
        this.addCookie({
          ...cookie,
          source: 'dynamic',
          detectionMethod: 'ultra-dynamic-collection',
          timestamp: Date.now()
        });
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting dynamic cookies: ${error.message}`);
    }
  }

  async detectAdvancedTechnologies() {
    console.log('🔧 Detectando tecnologías ULTRA avanzadas...');
    
    try {
      const technologies = await this.page.evaluate(() => {
        const detected = [];
        
        // Google Analytics (todas las versiones)
        if (window.ga || window.gtag || window.dataLayer || window.GoogleAnalyticsObject) {
          detected.push('Google Analytics');
        }
        
        // Facebook Pixel
        if (window.fbq || window._fbq) {
          detected.push('Facebook Pixel');
        }
        
        // Google Tag Manager
        if (window.google_tag_manager || window.dataLayer) {
          detected.push('Google Tag Manager');
        }
        
        // Hotjar
        if (window.hj || window._hjSettings) {
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
        
        // Adobe Analytics
        if (window.s || window.AppMeasurement) {
          detected.push('Adobe Analytics');
        }
        
        // Quantcast
        if (window._qevents || window.__qc) {
          detected.push('Quantcast');
        }
        
        // Comscore
        if (window.COMSCORE || window._comscore) {
          detected.push('Comscore');
        }
        
        // Amplitude
        if (window.amplitude) {
          detected.push('Amplitude');
        }
        
        // Intercom
        if (window.Intercom) {
          detected.push('Intercom');
        }
        
        // Zendesk
        if (window.zE || window.$zopim) {
          detected.push('Zendesk');
        }
        
        // FullStory
        if (window.FS) {
          detected.push('FullStory');
        }
        
        // LogRocket
        if (window.LogRocket) {
          detected.push('LogRocket');
        }
        
        return detected;
      });
      
      technologies.forEach(tech => this.scanResults.technologies.add(tech));
      
      // Detectar por scripts con patrones más amplios
      const scripts = await this.page.$$eval('script[src]', scripts => 
        scripts.map(script => script.src)
      );
      
      this.scanResults.scripts = scripts;
      
      // Análisis de scripts más exhaustivo
      const scriptPatterns = {
        'Google Analytics': ['google-analytics.com', 'googleanalytics.com', 'gtag', '/ga.js', '/analytics.js'],
        'Google Tag Manager': ['googletagmanager.com', '/gtm.js'],
        'Facebook Pixel': ['connect.facebook.net', 'facebook.com/tr'],
        'Hotjar': ['hotjar.com', 'static.hotjar.com'],
        'Mixpanel': ['mixpanel.com', 'cdn.mxpnl.com'],
        'Segment': ['segment.com', 'cdn.segment.com'],
        'Adobe Analytics': ['omtrdc.net', 'adobe.com/analytics'],
        'Quantcast': ['quantserve.com', 'quantcast.com'],
        'DoubleClick': ['doubleclick.net', 'googlesyndication.com'],
        'Amazon': ['amazon-adsystem.com', 'amazonservices.com']
      };
      
      scripts.forEach(src => {
        Object.entries(scriptPatterns).forEach(([tech, patterns]) => {
          if (patterns.some(pattern => src.includes(pattern))) {
            this.scanResults.technologies.add(tech);
          }
        });
      });
      
    } catch (error) {
      this.scanResults.errors.push(`Error detecting advanced technologies: ${error.message}`);
    }
  }

  async collectAllStorageTypes() {
    try {
      console.log('💾 Recolectando todos los tipos de storage...');
      
      // IndexedDB usando método más compatible
      try {
        const indexedDBData = await this.page.evaluate(async () => {
          try {
            if ('indexedDB' in window) {
              return { available: true, databases: [] };
            }
            return { available: false, databases: [] };
          } catch (e) {
            return { available: false, databases: [] };
          }
        });
        this.scanResults.storageData.indexedDB = indexedDBData.databases;
        console.log(`🗄️ IndexedDB disponible: ${indexedDBData.available}`);
      } catch (e) {
        console.log('⚠️ Error con IndexedDB:', e.message);
      }
      
      // WebSQL usando evaluación JavaScript
      try {
        const webSQLData = await this.page.evaluate(() => {
          try {
            if ('openDatabase' in window) {
              return { available: true, databases: [] };
            }
            return { available: false, databases: [] };
          } catch (e) {
            return { available: false, databases: [] };
          }
        });
        this.scanResults.storageData.webSQL = webSQLData.databases;
        console.log(`📊 WebSQL disponible: ${webSQLData.available}`);
      } catch (e) {
        console.log('⚠️ Error con WebSQL:', e.message);
      }
      
      // Cache API
      try {
        const cacheNames = await this.page.evaluate(async () => {
          try {
            if ('caches' in window) {
              const names = await caches.keys();
              return names || [];
            }
            return [];
          } catch (e) {
            return [];
          }
        });
        this.scanResults.storageData.cacheAPI = cacheNames || [];
        console.log(`🗂️ Cache API: ${cacheNames.length} caches`);
      } catch (e) {
        console.log('⚠️ Error con Cache API:', e.message);
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error collecting storage types: ${error.message}`);
    }
  }

  async analyzeIframesAndSubdomains() {
    try {
      console.log('🔍 Analizando iframes y subdominios ULTRA...');
      
      const frames = this.page.frames();
      
      for (const frame of frames) {
        if (frame.url() && frame.url() !== 'about:blank') {
          try {
            // Intentar obtener cookies del frame usando CDP
            const frameURL = frame.url();
            const frameCookies = await this.cdpSession.send('Network.getCookies', {
              urls: [frameURL]
            });
            
            frameCookies.cookies.forEach(cookie => {
              this.addCookie({
                ...cookie,
                source: 'frameViaCDP',
                detectionMethod: 'cdp-frame-analysis',
                timestamp: Date.now(),
                frameUrl: frameURL
              });
            });
            
          } catch (e) {}
        }
      }
      
    } catch (error) {
      this.scanResults.errors.push(`Error analyzing iframes: ${error.message}`);
    }
  }

  async collectAdvancedPageData() {
    try {
      const pageData = await this.page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
        fingerprinting: window.__ULTRA_FINGERPRINTING__ || {},
        hasServiceWorker: 'serviceWorker' in navigator,
        cookieMonitorData: window.__ULTRA_COOKIE_MONITOR__ || {},
        performance: {
          navigation: performance.navigation ? {
            type: performance.navigation.type,
            redirectCount: performance.navigation.redirectCount
          } : null,
          timing: performance.timing ? {
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
          } : null
        },
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }));
      
      return pageData;
    } catch (error) {
      this.scanResults.errors.push(`Error collecting advanced page data: ${error.message}`);
      return {};
    }
  }

  // Métodos de utilidad mejorados
  addCookie(cookieData) {
    const key = `${cookieData.name}_${cookieData.domain || 'unknown'}_${cookieData.source || 'unknown'}`;
    
    if (!this.scanResults.cookies.has(key)) {
      const enrichedCookie = {
        ...cookieData,
        size: cookieData.value ? cookieData.value.length : 0,
        isPersistent: !!(cookieData.expires || cookieData.maxAge),
        isThirdParty: this.isThirdParty(cookieData.domain, cookieData.url || this.page.url()),
        timestamp: cookieData.timestamp || Date.now(),
        isSecure: !!cookieData.secure,
        isHttpOnly: !!cookieData.httpOnly,
        sameSite: cookieData.sameSite || 'None',
        category: this.classifyAdvancedCookie(cookieData.name, cookieData.value),
        detectionInfo: {
          method: cookieData.detectionMethod,
          source: cookieData.source,
          timestamp: cookieData.timestamp || Date.now()
        }
      };
      
      this.scanResults.cookies.set(key, enrichedCookie);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🆕 ULTRA Cookie detectada: ${cookieData.name} (${cookieData.source}/${cookieData.detectionMethod})`);
      }
    }
  }

  classifyAdvancedCookie(name, value) {
    const nameStr = (name || '').toLowerCase();
    const valueStr = (value || '').toLowerCase();
    
    // Clasificación avanzada con más patrones
    const patterns = {
      analytics: ['analytics', 'ga', '_ga', 'gtag', 'gtm', 'measurement', 'metrics', 'stats'],
      advertising: ['ads', 'advertising', 'doubleclick', 'adsystem', 'adnxs', 'facebook', 'fbp', 'fbq'],
      necessary: ['session', 'sess', 'auth', 'login', 'csrf', 'xsrf', 'security'],
      preferences: ['pref', 'lang', 'language', 'currency', 'theme', 'settings'],
      marketing: ['track', 'utm', 'campaign', 'source', 'medium', 'content'],
      social: ['social', 'share', 'like', 'tweet', 'linkedin', 'instagram'],
      functional: ['cart', 'wishlist', 'basket', 'remember', 'persistent']
    };
    
    for (const [category, patternList] of Object.entries(patterns)) {
      if (patternList.some(pattern => nameStr.includes(pattern))) {
        return category;
      }
    }
    
    return 'unknown';
  }

  parseAllCookieFormats(cookieHeader) {
    const cookies = [];
    if (!cookieHeader) return cookies;
    
    // Manejo de múltiples formatos de cookies
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

  parseSetCookieHeaders(setCookieHeaders) {
    const cookies = [];
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    
    headers.forEach(header => {
      if (header) {
        const parsed = this.parseCookieString(header);
        if (parsed) cookies.push(parsed);
      }
    });
    
    return cookies;
  }

  parseCookieString(cookieString) {
    if (!cookieString) return null;
    
    const parts = cookieString.split(';').map(part => part.trim());
    const [nameValue] = parts;
    
    if (!nameValue) return null;
    
    const equalIndex = nameValue.indexOf('=');
    const name = equalIndex > 0 ? nameValue.substring(0, equalIndex).trim() : nameValue.trim();
    const value = equalIndex > 0 ? nameValue.substring(equalIndex + 1).trim() : '';
    
    if (!name) return null;
    
    const cookie = {
      name,
      value,
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

module.exports = UltraAdvancedCookieScanner;