// src/services/scanner.service.js
const puppeteer = require('puppeteer');
const { URL } = require('url');
const logger = require('../utils/logger');
const providerService = require('./provider.service');
const { cache } = require('../config/redis');
const CookieScan = require('../models/CookieScan');
const scanLogger = require('../utils/scanLogger');

class ScannerService {
  constructor() {
    this.browserPool = null;
    this.maxConcurrentScans = 5;
    this.scanTimeout = 20000; // 20 segundos por página (reducido)
    this.maxPagesPerScan = 100;
    this.maxRetries = 3;

    // Patrones comunes para tracking
    this.trackingPatterns = {
      pixels: [
        /facebook\.com\/tr\//i,
        /google-analytics\.com\/collect/i,
        /linkedin\.com\/px/i,
        /ads\.twitter\.com/i
      ],
      beacons: [
        /beacon\.js/i,
        /analytics\.js/i,
        /gtm\.js/i
      ],
      tracking: [
        /tracking/i,
        /analytics/i,
        /telemetry/i,
        /stats\./i
      ]
    };

    // Patrones de categorías de cookies - EXPANDIDO
    this.cookiePatterns = {
      necessary: [
        /^(csrf|session|auth|secure|__Secure-|__Host-)/i,
        /_csrf$/i,
        /^XSRF-TOKEN$/i,
        /^ARRAffinity/i,
        /^ASP\.NET/i,
        /^AWSALB/i,
        /^connect\.sid$/i,
        /^express\.sess/i
      ],
      functionality: [
        /^(prefs|settings|language|timezone|display)/i,
        /_preferences$/i,
        /^ui-/i,
        /^player/i,
        /^volume/i,
        /^fontSize/i,
        /^colorScheme/i
      ],
      analytics: [
        /^(_ga|_gid|_gat|__utm)/i,
        /^_pk_/i,
        /^amplitude/i,
        /^mp_/i,
        /^_hjid/i,
        /^_hjsession/i,
        /^_clck/i,
        /^_clsk/i,
        /^ki_/i,
        /^km_/i,
        /^optimizely/i,
        /^segment/i,
        /^ajs_/i,
        /^_vwo_/i,
        /^_vis_opt_/i,
        /^_gclxxxx/i,
        /^_gaexp/i,
        /^_opt_/i,
        /^zarget/i,
        /^_ce\.s$/i,
        /^_BEAMER_/i
      ],
      marketing: [
        /^(_fbp|_fbc|fr|xs|c_user|datr|sb|spin|wd|presence)/i,
        /^(_gcl|_gac)/i,
        /^pinterest_/i,
        /^_ttp/i,
        /^_uetvid$/i,
        /^_uetsid$/i,
        /^mautic/i,
        /^mtc_/i,
        /^_mkto_trk$/i,
        /^visitor_id/i,
        /^pardot/i,
        /^BIGipServer/i,
        /^mc_/i,
        /^_mcid$/i,
        /^aa_/i,
        /^_pinterest_/i,
        /^_pin_unauth$/i,
        /^_routing_id$/i,
        /^_shopify_/i,
        /^_landing_page$/i,
        /^_orig_referrer$/i,
        /^cart_/i,
        /^checkout_/i
      ],
      advertising: [
        /^(ide|test_cookie|_drt_|id|RUL|DSID|uid|uuid|guid)/i,
        /^doubleclick/i,
        /^adroll/i,
        /^__ar_v4$/i,
        /^_te_$/i,
        /^tuuid/i,
        /^c$/i,
        /^cto_/i,
        /^criteo/i,
        /^tluid$/i,
        /^taboola/i,
        /^t_gid$/i,
        /^TDCPM$/i,
        /^TDID$/i,
        /^anj$/i,
        /^uuid2$/i,
        /^sessid$/i,
        /^ssid$/i,
        /^_kuid_$/i,
        /^bito$/i,
        /^bitoIsSecure$/i,
        /^checkForPermission$/i,
        /^_cc_/i,
        /^_pubcid$/i,
        /^panoramaId/i,
        /^ad-id$/i,
        /^ad-privacy$/i
      ],
      personalizacion: [
        // Cookies de personalización del sitio
        /^(custom|personal|user_|my_)/i,
        /^(bookmark|favorite|wishlist)/i,
        /^(layout|view_mode|display_)/i
      ]
    };

    // Bindeamos métodos
    this.initBrowserPool = this.initBrowserPool.bind(this);
    this._discoverUrls = this._discoverUrls.bind(this);
    this.startScan = this.startScan.bind(this);
    this.scanDomain = this.scanDomain.bind(this);
    this._scanUrl = this._scanUrl.bind(this);
    this._setupInterceptors = this._setupInterceptors.bind(this);
    this._setupEventListeners = this._setupEventListeners.bind(this);
    this._extractResources = this._extractResources.bind(this);
    this._extractStorageData = this._extractStorageData.bind(this);
    this._analyzeIframes = this._analyzeIframes.bind(this);
    this._analyzeForms = this._analyzeForms.bind(this);
    this._analyzeRequest = this._analyzeRequest.bind(this);
    this._parseSetCookieHeader = this._parseSetCookieHeader.bind(this);
    this._determineScriptCategory = this._determineScriptCategory.bind(this);
    this._identifyChanges = this._identifyChanges.bind(this);
    this._generateStats = this._generateStats.bind(this);
    this._chunkArray = this._chunkArray.bind(this);
    this._isValidUrl = this._isValidUrl.bind(this);
    this._isValidDomainOrSubdomain = this._isValidDomainOrSubdomain.bind(this);
    this._normalizeUrl = this._normalizeUrl.bind(this);
    this._countBy = this._countBy.bind(this);
    this._analyzeCookie = this._analyzeCookie.bind(this);
    this._analyzeScript = this._analyzeScript.bind(this);
    this._detectCookieCategory = this._detectCookieCategory.bind(this);
    this._analyzeCookieDuration = this._analyzeCookieDuration.bind(this);
    this._hasSignificantChanges = this._hasSignificantChanges.bind(this);
    this._calculateCookieSize = this._calculateCookieSize.bind(this);
    this._isFirstPartyCookie = this._isFirstPartyCookie.bind(this);
    this._updateScan = this._updateScan.bind(this);
  }

  // Función helper para extraer el dominio base (sin subdominios)
  _extractBaseDomain(hostname) {
    if (!hostname) return '';
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  async initBrowserPool() {
    if (!this.browserPool) {
      try {
        this.browserPool = await puppeteer.launch({
          headless: "new",
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            // Deshabilitar todas las protecciones de privacidad
            '--disable-blink-features=AutomationControlled',
            '--disable-features=CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating',
            '--disable-site-isolation-trials',
            '--disable-features=BlockThirdPartyCookies',
            '--disable-features=SameSiteByDefaultCookies',
            '--disable-features=CookiesWithoutSameSiteMustBeSecure',
            '--disable-features=PartitionedCookies',
            // Permitir todas las cookies
            '--enable-features=AllowAllCookies',
            '--disable-features=ImprovedCookieControls',
            '--disable-features=LegacySameSiteCookieBehaviorEnabledForDomainList',
            // Deshabilitar protecciones adicionales
            '--disable-features=PrivacySandboxSettings4',
            '--disable-features=PrivacySandboxAdsAPIsOverride',
            '--disable-features=FledgeConsiderKAnonymity',
            '--disable-features=FledgeEnforceKAnonymity',
            // Aceptar todas las cookies de terceros
            '--disable-features=ThirdPartyCookiePhaseout',
            '--test-third-party-cookie-phaseout',
            // User agent más permisivo
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ],
          ignoreHTTPSErrors: true,
          defaultViewport: { width: 1920, height: 1080 },
          protocolTimeout: 60000  // Aumentar timeout a 60 segundos
        });
      } catch (error) {
        logger.error("Error initializing browser pool:", error);
        throw error;
      }
    }
  }

  // Función para reintentar operaciones con backoff exponencial
  async _retryOperation(operation, maxRetries, initialDelay = 1000) {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  async _discoverUrls(startUrl, config) {
    const urls = new Set([startUrl]);
    const visited = new Set();
    const queue = [startUrl];
    const maxUrls = config.maxUrls || this.maxPagesPerScan;
    const includeSubdomains = config.includeSubdomains !== false; // Por defecto true
    const maxDepth = config.depth || 5;
    
    try {
      const baseUrl = new URL(startUrl);
      const baseDomain = this._extractBaseDomain(baseUrl.hostname);
      const page = await this.browserPool.newPage();
      
      console.log(`🔍 Iniciando descubrimiento de URLs para dominio: ${baseDomain}`);
      console.log(`🔍 Incluir subdominios: ${includeSubdomains}`);
      
      while (queue.length > 0 && urls.size < maxUrls) {
        const currentUrl = queue.shift();
        if (visited.has(currentUrl)) continue;
        
        try {
          await page.goto(currentUrl, { 
            waitUntil: 'networkidle0', 
            timeout: this.scanTimeout 
          });
          visited.add(currentUrl);
          
          // Extraer enlaces de manera más comprehensiva
          const links = await page.evaluate((baseDomain, includeSubdomains, maxDepth) => {
            const foundLinks = new Set();
            const baseUrl = window.location.origin;
            
            // Función helper para verificar si un dominio pertenece al dominio base
            function isValidDomain(hostname) {
              if (!hostname) return false;
              
              // Extraer dominio base (eliminar subdominios)
              const extractBaseDomain = (domain) => {
                const parts = domain.split('.');
                if (parts.length >= 2) {
                  return parts.slice(-2).join('.');
                }
                return domain;
              };
              
              const targetBaseDomain = extractBaseDomain(hostname);
              
              if (includeSubdomains) {
                // Permitir dominio exacto y subdominios
                return targetBaseDomain === baseDomain || hostname === baseDomain;
              } else {
                // Solo dominio exacto
                return hostname === baseDomain;
              }
            }
            
            // Enlaces de navegación
            document.querySelectorAll('a[href]').forEach(anchor => {
              try {
                const href = anchor.getAttribute('href');
                if (!href) return;
                
                // Ignorar enlaces externos obvios
                if (href.includes('facebook.com') || href.includes('instagram.com') || 
                    href.includes('twitter.com') || href.includes('linkedin.com') ||
                    href.includes('youtube.com') || href.includes('tiktok.com') ||
                    href.includes('pinterest.com') || href.includes('whatsapp.com') ||
                    href.includes('telegram.org') || href.includes('snapchat.com') ||
                    href.startsWith('mailto:') || href.startsWith('tel:') ||
                    href.startsWith('sms:') || href.startsWith('viber:') ||
                    href.startsWith('skype:')) {
                  return;
                }
                
                const absoluteUrl = new URL(href, baseUrl);
                
                // Verificar si el dominio es válido
                if (isValidDomain(absoluteUrl.hostname) && ['http:', 'https:'].includes(absoluteUrl.protocol)) {
                  // Verificar profundidad
                  const pathDepth = absoluteUrl.pathname.split('/').filter(p => p).length;
                  if (pathDepth <= maxDepth) {
                    foundLinks.add(absoluteUrl.href);
                  }
                }
              } catch (e) {
                // Ignorar URLs inválidas
              }
            });
            
            // Enlaces en formularios
            document.querySelectorAll('form[action]').forEach(form => {
              try {
                const action = form.getAttribute('action');
                if (action && !action.startsWith('#')) {
                  const absoluteUrl = new URL(action, baseUrl);
                  if (isValidDomain(absoluteUrl.hostname)) {
                    foundLinks.add(absoluteUrl.href);
                  }
                }
              } catch (e) {}
            });
            
            // Enlaces en JavaScript
            document.querySelectorAll('[onclick*="location"], [onclick*="href"]').forEach(element => {
              const onclick = element.getAttribute('onclick');
              const match = onclick.match(/(?:location\.href|window\.location)\s*=\s*["']([^"']+)["']/);
              if (match) {
                try {
                  const absoluteUrl = new URL(match[1], baseUrl);
                  if (isValidDomain(absoluteUrl.hostname)) {
                    foundLinks.add(absoluteUrl.href);
                  }
                } catch (e) {}
              }
            });
            
            return Array.from(foundLinks);
          }, baseDomain, includeSubdomains, maxDepth);
          
          for (const link of links) {
            if (urls.size >= maxUrls) break;
            const normalizedUrl = this._normalizeUrl(link);
            if (normalizedUrl && !visited.has(normalizedUrl) && !urls.has(normalizedUrl)) {
              urls.add(normalizedUrl);
              queue.push(normalizedUrl);
            }
          }
        } catch (error) {
          logger.error(`Error discovering URL ${currentUrl}:`, error);
        }
      }
      await page.close();
      return Array.from(urls);
    } catch (error) {
      logger.error("Error in URL discovery:", error);
      return [startUrl];
    }
  }

  async startScan(scanConfig) {
    let scan;
    try {
      scan = await CookieScan.create({
        domainId: scanConfig.domainId,
        status: 'pending',
        scanConfig: {
          type: scanConfig.scanType,
          priority: scanConfig.priority,
          includeSubdomains: true,
          maxUrls: scanConfig.scanType === 'quick' ? 10 : 100,
          depth: scanConfig.depth || 3,
          urlPatterns: { include: [], exclude: [] }
        },
        metadata: { triggeredBy: scanConfig.triggeredBy, scanType: 'manual' }
      });
    } catch (error) {
      console.error("Error creating scan record:", error);
    }
    return await this.scanDomain(scan);
  }

  async scanDomain(scan) {
    // Crear logger específico para este escaneo
    const scanLog = scanLogger.createScanLogger(scan._id, 'traditional', scan.domainId.domain);
    
    try {
      await this.initBrowserPool();
      const domain = scan.domainId;
      if (!domain || !domain.domain) {
        scanLog.error("Domain information is missing");
        return;
      }
      
      // Función para verificar si el escaneo ha sido cancelado
      const checkCancellation = async () => {
        try {
          let currentScan = null;
          
          // Intentar buscar por _id si es ObjectId
          if (scan._id && scan._id.toString().match(/^[0-9a-fA-F]{24}$/)) {
            currentScan = await require('../models/CookieScan').findById(scan._id);
          }
          
          // Si no se encuentra o scan._id no es ObjectId, buscar por scanId
          if (!currentScan && scan.scanId) {
            currentScan = await require('../models/CookieScan').findOne({ scanId: scan.scanId });
          }
          
          // Si aún no se encuentra, buscar por cualquier campo UUID
          if (!currentScan && scan._id && !scan._id.toString().match(/^[0-9a-fA-F]{24}$/)) {
            currentScan = await require('../models/CookieScan').findOne({ scanId: scan._id });
          }
          
          return currentScan && currentScan.status === 'cancelled';
        } catch (error) {
          console.log('Error verificando cancelación:', error.message);
          return false;
        }
      };
      
      scanLog.scanStart({
        domain: domain.domain,
        scanType: 'traditional',
        configuration: scan.scanConfig,
        scanId: scan._id
      });
      
      const startUrl = `https://${domain.domain}`;
      const findings = {
        cookies: [],
        scripts: [],
        vendors: new Set(),
        trackers: [],
        changes: { newCookies: [], modifiedCookies: [], removedCookies: [] },
        metadata: { startTime: new Date(), endTime: null, duration: null, urlsScanned: 0, errors: [] }
      };
      const urlsToScan = await this._discoverUrls(startUrl, scan.scanConfig);
      
      scanLog.info(`Discovered ${urlsToScan.length} URLs to scan`, {
        urls: urlsToScan.slice(0, 5),
        totalUrls: urlsToScan.length
      });
      
      scan.progress = {
        status: 'in_progress',
        totalUrls: urlsToScan.length,
        scannedUrls: 0,
        currentUrl: '',
        startTime: new Date(),
        endTime: null,
        duration: null
      };
      await this._updateScan(scan);
      
      const chunks = this._chunkArray(urlsToScan, this.maxConcurrentScans);
      scanLog.info(`Starting scan with ${chunks.length} chunks of ${this.maxConcurrentScans} concurrent scans`);
      
      for (const chunk of chunks) {
        // Verificar cancelación antes de cada chunk
        if (await checkCancellation()) {
          scanLog.info('Escaneo cancelado por el usuario');
          scan.status = 'cancelled';
          scan.progress.endTime = new Date();
          scan.progress.duration = (scan.progress.endTime - scan.progress.startTime) / 1000;
          await this._updateScan(scan);
          return { findings: null, stats: null, cancelled: true };
        }
        
        const promises = chunk.map(url => this._scanUrl(url, findings, scan, scanLog, checkCancellation));
        await Promise.all(promises);
      }
      
      scanLog.info('Analyzing changes and generating statistics');
      await this._analyzeChanges(domain, findings);
      const stats = this._generateStats(findings);
      
      findings.metadata.endTime = new Date();
      findings.metadata.duration = findings.metadata.endTime - findings.metadata.startTime;
      scan.findings = findings;
      scan.stats = stats;
      scan.status = 'completed';
      scan.progress.endTime = new Date();
      scan.progress.duration = findings.metadata.duration;
      await this._updateScan(scan);
      
      scanLog.scanComplete({
        totalCookies: findings.cookies.length,
        newCookies: findings.changes.newCookies.length,
        modifiedCookies: findings.changes.modifiedCookies.length,
        urlsScanned: findings.metadata.urlsScanned,
        duration: findings.metadata.duration
      });
      
      // Limpiar logs después de completar
      setTimeout(() => scanLog.cleanup(), 60000);
      
      return { findings, stats, significantChanges: this._hasSignificantChanges(findings.changes) };
    } catch (error) {
      console.error("Error scanning domain:", error);
      scanLog.scanError(error, { phase: 'scan_execution' });
      
      // Limpiar logs en caso de error también
      setTimeout(() => scanLog.cleanup(), 30000);
      
      return { findings: null, stats: null, error: error.message };
    } finally {
      try {
        if (this.browserPool) {
          // Cerrar todas las páginas abiertas antes de cerrar el browser
          const pages = await this.browserPool.pages();
          for (const page of pages) {
            try {
              if (!page.isClosed()) {
                await page.close();
              }
            } catch (e) {
              // Ignorar errores de cierre de página
            }
          }
          
          await this.browserPool.close();
          this.browserPool = null;
        }
      } catch (error) {
        console.log('Error cerrando browser pool:', error.message);
        this.browserPool = null;
      }
    }
  }

  async _scanUrl(url, findings, scan, scanLog = null, checkCancellation = null) {
    // Verificar cancelación antes de empezar
    if (checkCancellation && await checkCancellation()) {
      console.log(`🛑 Scan cancelado, saltando URL: ${url}`);
      return;
    }
    
    const page = await this.browserPool.newPage();
    try {
      if (scanLog) {
        scanLog.info(`Scanning URL: ${url}`, { url });
      }
      
      // Configurar página para mejor detección
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Habilitar CDP para acceso completo
      let cdpEnabled = false;
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Runtime.enable');
        await client.send('ServiceWorker.enable');
        cdpEnabled = true;
        console.log('🔧 CDP habilitado correctamente');
        // No cerramos el cliente aquí porque lo usaremos después
      } catch (error) {
        console.log('🔧 Error habilitando CDP:', error.message);
        cdpEnabled = false;
      }
      
      // Configurar permisos para aceptar todas las cookies
      const context = page.browserContext();
      await context.overridePermissions(url, ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'payment-handler', 'background-sync']);
      
      // Configurar cookies para aceptar todas (incluidas terceros)
      await page.setCookie({
        name: 'cookie_consent',
        value: 'all',
        domain: new URL(url).hostname,
        path: '/'
      });
      
      // Evitar detección de automatización
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
        
        // Sobrescribir funciones de privacidad
        if (navigator.permissions) {
          const originalQuery = navigator.permissions.query;
          navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications' || parameters.name === 'camera' || parameters.name === 'microphone') {
              return Promise.resolve({ state: 'granted' });
            }
            return originalQuery(parameters);
          };
        }
        
        // Habilitar todas las APIs de cookies
        if (document.hasStorageAccess) {
          document.hasStorageAccess = () => Promise.resolve(true);
        }
        if (document.requestStorageAccess) {
          document.requestStorageAccess = () => Promise.resolve();
        }
      });
      
      await this._setupInterceptors(page, findings);
      await this._setupEventListeners(page, findings);
      scan.progress.currentUrl = url;
      await this._updateScan(scan);
      await page.setDefaultNavigationTimeout(this.scanTimeout);
      await page.setDefaultTimeout(this.scanTimeout);
      
      // Navegar con manejo robusto de errores
      try {
        await this._retryOperation(
          () => page.goto(url, { waitUntil: ['load', 'networkidle0'], timeout: this.scanTimeout }),
          this.maxRetries
        );
      } catch (navigationError) {
        if (navigationError.message.includes('Target closed') || 
            navigationError.message.includes('Execution context was destroyed')) {
          console.log(`🔄 Página cerrada durante navegación, recreando página: ${url}`);
          
          // Cerrar página actual y crear una nueva
          try {
            await page.close();
          } catch (e) {
            // Página ya cerrada
          }
          
          // Crear nueva página
          page = await this.browserPool.newPage();
          
          // Reconfigurar página
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await page.setViewport({ width: 1920, height: 1080 });
          await this._setupInterceptors(page, findings);
          
          // Intentar navegar de nuevo
          await page.goto(url, { waitUntil: ['load'], timeout: this.scanTimeout });
        } else {
          throw navigationError;
        }
      }
      
      // Esperar un momento para que se carguen los scripts
      await page.waitForTimeout(3000);
      
      // Intentar aceptar cookies automáticamente solo una vez por scan
      if (!scan.consentAttempted) {
        const consentAccepted = await this._tryAcceptCookies(page);
        scan.consentAttempted = true;
        if (consentAccepted) {
          await page.waitForTimeout(3000); // Esperar después de aceptar cookies
        }
      }
      
      // Simular comportamiento humano más realista
      console.log('🤖 Simulando comportamiento humano avanzado...');
      
      // Verificar si la página sigue activa antes de simular
      if (page.isClosed()) {
        console.log('⚠️ Página cerrada, saltando simulación humana');
        return;
      }
      
      try {
        // Simular movimiento de mouse más natural
        await page.mouse.move(100, 100);
        await page.waitForTimeout(300);
        await page.mouse.move(300, 200, { steps: 10 });
        await page.waitForTimeout(300);
        await page.mouse.move(500, 400, { steps: 15 });
        await page.waitForTimeout(500);
        
        // Simular eventos de teclado
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      } catch (error) {
        if (error.message.includes('Target closed') || 
            error.message.includes('Execution context was destroyed')) {
          console.log('⚠️ Contexto destruido durante simulación de mouse/teclado, continuando...');
        } else {
          console.log('⚠️ Error en simulación de mouse/teclado:', error.message);
        }
      }
      
      // Simular scroll gradual con pausas y más eventos
      try {
        await page.evaluate(() => {
          return new Promise((resolve) => {
            let scrollY = 0;
            const maxScroll = document.body.scrollHeight;
            const scrollStep = maxScroll / 10;
            
            function scrollNext() {
              try {
                scrollY += scrollStep;
                window.scrollTo(0, scrollY);
                
                // Disparar múltiples eventos en cada scroll
                window.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('mousemove'));
                window.dispatchEvent(new Event('resize'));
                document.dispatchEvent(new Event('visibilitychange'));
                
                // Simular hover en elementos aleatorios
                const elements = document.querySelectorAll('a, button, input, div[onclick]');
                if (elements.length > 0) {
                  const randomEl = elements[Math.floor(Math.random() * elements.length)];
                  if (randomEl) {
                    randomEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    setTimeout(() => {
                      try {
                        randomEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                      } catch (e) {
                        // Elemento puede haber sido removido
                      }
                    }, 100);
                  }
                }
                
                if (scrollY < maxScroll) {
                  setTimeout(scrollNext, 300); // Pausa entre scrolls
                } else {
                  // Volver arriba
                  window.scrollTo(0, 0);
                  resolve();
                }
              } catch (e) {
                console.log('Error durante scroll:', e);
                resolve(); // Resolver de todos modos
              }
            }
            
            scrollNext();
          });
        });
      } catch (error) {
        if (error.message.includes('Target closed') || 
            error.message.includes('Execution context was destroyed')) {
          console.log('⚠️ Contexto destruido durante scroll, continuando...');
        } else {
          console.log('⚠️ Error en simulación de scroll:', error.message);
        }
      }
      
      // Simular clics en elementos comunes
      try {
        await page.evaluate(() => {
          // NO hacer click real que cause navegación
          const links = Array.from(document.querySelectorAll('a[href]')).filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('/') || href.includes(window.location.hostname));
          });
          
          if (links.length > 0) {
            const randomLink = links[Math.floor(Math.random() * Math.min(links.length, 3))];
            if (randomLink) {
              console.log('🔗 Simulating hover on link:', randomLink.href);
              // Solo simular hover, NO hacer click real
              randomLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              randomLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            }
          }
          
          // Activar eventos de tracking conocidos
          ['load', 'DOMContentLoaded', 'scroll', 'mousemove', 'click', 'focus', 'blur'].forEach(event => {
            window.dispatchEvent(new Event(event, { bubbles: true }));
          });
          
          // Simular eventos de mouse más realistas
          document.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
          }));
          
          // Activar analytics manualmente - EXPANDIDO
          try {
            // Google Analytics
            if (window.gtag) window.gtag('event', 'page_view', { page_title: document.title });
            if (window.ga) window.ga('send', 'pageview');
            if (window._gaq) window._gaq.push(['_trackPageview']);
            
            // Facebook Pixel
            if (window.fbq) {
              window.fbq('track', 'PageView');
              window.fbq('track', 'ViewContent');
              window.fbq('track', 'Search');
            }
            
            // Google Tag Manager
            if (window.dataLayer) {
              window.dataLayer.push({ event: 'pageview' });
              window.dataLayer.push({ event: 'gtm.load' });
              window.dataLayer.push({ event: 'gtm.dom' });
            }
            
            // Adobe Analytics
            if (window.s && window.s.t) window.s.t();
            if (window._satellite) window._satellite.pageBottom();
            
            // Segment
            if (window.analytics) {
              window.analytics.page();
              window.analytics.track('Page Viewed');
            }
            
            // Mixpanel
            if (window.mixpanel) {
              window.mixpanel.track('Page View');
              window.mixpanel.track_pageview();
            }
            
            // Heap Analytics
            if (window.heap) {
              window.heap.track('Page View');
            }
            
            // Matomo/Piwik
            if (window._paq) {
              window._paq.push(['trackPageView']);
              window._paq.push(['enableLinkTracking']);
            }
            
            // Hotjar
            if (window.hj) {
              window.hj('event', 'page_view');
            }
            
            // Amplitude
            if (window.amplitude) {
              window.amplitude.getInstance().logEvent('Page View');
            }
            
            // LinkedIn Insight
            if (window._linkedin_data_partner_ids) {
              window._linkedin_data_partner_ids.forEach(id => {
                if (window._already_called_linkedin_ids && !window._already_called_linkedin_ids[id]) {
                  window._already_called_linkedin_ids[id] = true;
                }
              });
            }
            
            // Twitter Pixel
            if (window.twq) {
              window.twq('track', 'PageView');
            }
            
            // Pinterest Tag
            if (window.pintrk) {
              window.pintrk('track', 'pagevisit');
            }
          } catch (e) {
            console.log('Error triggering analytics:', e);
          }
        });
      } catch (error) {
        if (error.message.includes('Target closed') || 
            error.message.includes('Execution context was destroyed')) {
          console.log('⚠️ Contexto destruido durante simulación de clics, continuando...');
        } else {
          console.log('⚠️ Error en simulación de clics:', error.message);
        }
      }
      
      // Verificar cancelación antes de navegación interna
      if (checkCancellation && await checkCancellation()) {
        console.log(`🛑 Scan cancelado durante navegación interna`);
        return;
      }
      
      // NAVEGACIÓN INTERNA SIMPLIFICADA - Solo simular clics sin navegación real
      console.log('🔗 Simulando navegación interna...');
      try {
        if (!page.isClosed()) {
          await page.evaluate(() => {
            try {
              // Simular clics en enlaces internos principales sin navegar
              const links = Array.from(document.querySelectorAll('a[href]')).filter(link => {
                const href = link.getAttribute('href');
                return href && (href.startsWith('/') || href.includes(window.location.hostname));
              }).slice(0, 3);
              
              links.forEach((link, index) => {
                setTimeout(() => {
                  try {
                    // Simular hover y eventos sin hacer clic real
                    link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    link.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    
                    // Activar analytics sin navegar
                    if (window.gtag) window.gtag('event', 'link_click', { link_url: link.href });
                    if (window.fbq) window.fbq('track', 'ViewContent', { content_name: link.textContent });
                  } catch (e) {
                    console.log('Error simulando clic:', e);
                  }
                }, index * 200);
              });
              
              // Simular formularios
              const forms = document.querySelectorAll('form');
              forms.forEach(form => {
                form.dispatchEvent(new Event('focus'));
                const inputs = form.querySelectorAll('input[type="email"], input[type="text"]');
                inputs.forEach(input => {
                  input.dispatchEvent(new Event('focus'));
                  input.dispatchEvent(new Event('blur'));
                });
              });
              
            } catch (e) {
              console.log('Error en simulación de navegación:', e);
            }
          });
          
          await page.waitForTimeout(2000); // Esperar a que se activen tracking
        }
      } catch (e) {
        if (!e.message.includes('Execution context was destroyed') && 
            !e.message.includes('Target closed')) {
          console.log('Error en navegación simulada:', e.message);
        }
        // Ignorar errores de contexto destruido ya que son esperados
      }
      
      // Verificar cancelación antes de detección final
      if (checkCancellation && await checkCancellation()) {
        console.log(`🛑 Scan cancelado antes de detección final`);
        return;
      }
      
      await page.waitForTimeout(2000); // Tiempo reducido para que se establezcan cookies
      
      // Detectar Service Workers y sus cookies
      console.log('🔍 Detectando Service Workers...');
      try {
        const serviceWorkerData = await page.evaluate(() => {
          return navigator.serviceWorker ? navigator.serviceWorker.getRegistrations() : [];
        });
        
        if (serviceWorkerData.length > 0) {
          console.log(`🔍 Encontrados ${serviceWorkerData.length} Service Workers`);
          
          // Interceptar mensajes de Service Workers
          await page.evaluateOnNewDocument(() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('📨 Service Worker message:', event.data);
              });
            }
          });
        }
      } catch (error) {
        console.log('🔍 Error detectando Service Workers:', error.message);
      }
      
      // Detectar Web Workers
      await page.evaluateOnNewDocument(() => {
        const originalWorker = window.Worker;
        if (originalWorker) {
          window.Worker = new Proxy(originalWorker, {
            construct(target, args) {
              console.log('🔍 Web Worker creado:', args[0]);
              const worker = new target(...args);
              
              // Interceptar mensajes del worker
              const originalPostMessage = worker.postMessage;
              worker.postMessage = function(...args) {
                console.log('📨 Mensaje a Web Worker:', args);
                return originalPostMessage.apply(this, args);
              };
              
              return worker;
            }
          });
        }
      });
      
      // Obtener TODAS las cookies del navegador usando múltiples métodos
      console.log('🔍 === INICIO DETECCIÓN DE COOKIES ===');
      
      // Método 1: Network.getAllCookies (más completo)
      let networkCookies = [];
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        const allCookies = await client.send('Network.getAllCookies');
        networkCookies = allCookies.cookies || [];
        console.log(`🔍 Network.getAllCookies encontró: ${networkCookies.length} cookies`);
        await client.detach();
      } catch (error) {
        console.log('🔍 Error usando CDP, usando método alternativo:', error.message);
        networkCookies = [];
      }
      
      // Método 2: page.cookies() (contexto actual) - MÁS ROBUSTO
      let contextCookies = [];
      try {
        contextCookies = await page.cookies();
        console.log(`🔍 page.cookies() encontró: ${contextCookies.length} cookies`);
      } catch (error) {
        console.log('🔍 Error obteniendo cookies del contexto:', error.message);
        
        // Método alternativo usando evaluateHandle
        try {
          const cookiesHandle = await page.evaluateHandle(() => {
            const cookies = [];
            if (document.cookie) {
              const cookieString = document.cookie;
              const cookiePairs = cookieString.split(';');
              for (const pair of cookiePairs) {
                const [name, value] = pair.trim().split('=');
                if (name && value) {
                  cookies.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: window.location.hostname,
                    path: '/',
                    source: 'evaluateHandle'
                  });
                }
              }
            }
            return cookies;
          });
          
          contextCookies = await cookiesHandle.jsonValue();
          console.log(`🔍 evaluateHandle encontró: ${contextCookies.length} cookies`);
          await cookiesHandle.dispose();
        } catch (fallbackError) {
          console.log('🔍 Error en método alternativo:', fallbackError.message);
          contextCookies = [];
        }
      }
      
      // Método 3: Extraer desde Runtime (JavaScript)
      let documentCookies = [];
      try {
        // Verificar si la página sigue activa antes de evaluar
        if (!page.isClosed()) {
          documentCookies = await page.evaluate(() => {
            const cookies = [];
            if (document.cookie) {
              const cookieString = document.cookie;
              console.log('🔍 document.cookie:', cookieString);
              const cookiePairs = cookieString.split(';');
              for (const pair of cookiePairs) {
                const [name, value] = pair.trim().split('=');
                if (name && value) {
                  cookies.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: window.location.hostname,
                    path: '/',
                    source: 'document'
                  });
                }
              }
            }
            return cookies;
          });
          console.log(`🔍 document.cookie encontró: ${documentCookies.length} cookies`);
        } else {
          console.log('🔍 Página cerrada, saltando document.cookie');
        }
      } catch (error) {
        if (error.message.includes('Target closed') || 
            error.message.includes('Execution context was destroyed')) {
          console.log('🔍 Contexto destruido durante document.cookie, continuando...');
        } else {
          console.log('🔍 Error obteniendo document.cookie:', error.message);
        }
        documentCookies = [];
      }
      
      // Método 4: Storage APIs
      let storageCookies = [];
      try {
        if (!page.isClosed()) {
          storageCookies = await page.evaluate(() => {
            const cookies = [];
            try {
              // localStorage
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                cookies.push({
                  name: key,
                  value: localStorage.getItem(key),
                  domain: window.location.hostname,
                  type: 'localStorage',
                  source: 'storage'
                });
              }
              // sessionStorage
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                cookies.push({
                  name: key,
                  value: sessionStorage.getItem(key),
                  domain: window.location.hostname,
                  type: 'sessionStorage',
                  source: 'storage'
                });
              }
            } catch (e) {
              console.log('Storage access error:', e);
            }
            return cookies;
          });
          console.log(`🔍 Storage APIs encontró: ${storageCookies.length} items`);
        } else {
          console.log('🔍 Página cerrada, saltando Storage APIs');
        }
      } catch (error) {
        if (error.message.includes('Target closed') || 
            error.message.includes('Execution context was destroyed')) {
          console.log('🔍 Contexto destruido durante Storage APIs, continuando...');
        } else {
          console.log('🔍 Error obteniendo Storage APIs:', error.message);
        }
        storageCookies = [];
      }
      
      // Método 5: Extraer cookies de todos los iframes
      const iframeCookies = await page.evaluate(() => {
        const cookies = [];
        const frames = Array.from(document.querySelectorAll('iframe'));
        console.log(`🔍 Encontrados ${frames.length} iframes`);
        
        frames.forEach((iframe, index) => {
          try {
            if (iframe.contentDocument && iframe.contentDocument.cookie) {
              const iframeCookieString = iframe.contentDocument.cookie;
              console.log(`🔍 iframe ${index} cookies:`, iframeCookieString);
              const cookiePairs = iframeCookieString.split(';');
              for (const pair of cookiePairs) {
                const [name, value] = pair.trim().split('=');
                if (name && value) {
                  cookies.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: iframe.src ? new URL(iframe.src).hostname : window.location.hostname,
                    path: '/',
                    source: 'iframe'
                  });
                }
              }
            }
          } catch (e) {
            // Cross-origin iframe, no podemos acceder
            console.log(`🔍 iframe ${index} es cross-origin:`, iframe.src);
          }
        });
        
        return cookies;
      });
      console.log(`🔍 iframes encontraron: ${iframeCookies.length} cookies`);
      
      // Método 6: Detectar cookies en Shadow DOM
      const shadowDOMCookies = await page.evaluate(() => {
        const cookies = [];
        const elementsWithShadow = [];
        
        // Buscar todos los elementos que podrían tener Shadow DOM
        document.querySelectorAll('*').forEach(element => {
          if (element.shadowRoot) {
            elementsWithShadow.push(element);
          }
        });
        
        console.log(`🔍 Encontrados ${elementsWithShadow.length} elementos con Shadow DOM`);
        
        elementsWithShadow.forEach((element, index) => {
          try {
            // Buscar scripts en Shadow DOM
            const shadowScripts = element.shadowRoot.querySelectorAll('script');
            shadowScripts.forEach(script => {
              if (script.textContent.includes('cookie')) {
                console.log(`🔍 Script con cookies en Shadow DOM ${index}`);
              }
            });
            
            // Buscar iframes en Shadow DOM
            const shadowIframes = element.shadowRoot.querySelectorAll('iframe');
            shadowIframes.forEach(iframe => {
              console.log(`🔍 iframe en Shadow DOM: ${iframe.src}`);
            });
          } catch (e) {
            console.log(`Error analizando Shadow DOM ${index}:`, e);
          }
        });
        
        return cookies;
      });
      console.log(`🔍 Shadow DOM análisis completado`);
      
      // Método 7: Detectar IndexedDB y Cache Storage
      const advancedStorage = await page.evaluate(async () => {
        const storage = { indexedDB: [], cacheStorage: [] };
        
        try {
          // IndexedDB
          if ('indexedDB' in window) {
            const databases = await indexedDB.databases();
            console.log(`🔍 Encontradas ${databases.length} bases de datos IndexedDB`);
            storage.indexedDB = databases.map(db => ({ name: db.name, version: db.version }));
          }
          
          // Cache Storage
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log(`🔍 Encontrados ${cacheNames.length} caches`);
            storage.cacheStorage = cacheNames;
          }
        } catch (e) {
          console.log('Error accediendo a storage avanzado:', e);
        }
        
        return storage;
      });
      
      // Método 8: Forzar ejecución de scripts conocidos de tracking
      await page.evaluate(() => {
        try {
          // Forzar Google Analytics
          if (window.gtag) {
            window.gtag('config', 'GA_MEASUREMENT_ID', { cookie_flags: 'SameSite=None;Secure' });
            window.gtag('event', 'page_view');
          }
          
          // Forzar Facebook Pixel
          if (window.fbq) {
            window.fbq('init', 'PIXEL_ID');
            window.fbq('track', 'PageView');
          }
          
          // Forzar Google Tag Manager
          if (window.dataLayer) {
            window.dataLayer.push({
              'event': 'gtm.js',
              'gtm.start': new Date().getTime(),
              'gtm.uniqueEventId': Math.random()
            });
          }
          
          // Simular interacciones que activan cookies - EXPANDIDO
          const events = [
            'mouseenter', 'mouseleave', 'focus', 'blur', 'resize',
            'orientationchange', 'devicemotion', 'deviceorientation',
            'online', 'offline', 'storage', 'popstate',
            'hashchange', 'pageshow', 'pagehide', 'unload',
            'beforeunload', 'visibilitychange', 'fullscreenchange'
          ];
          
          events.forEach(eventType => {
            window.dispatchEvent(new Event(eventType));
            document.dispatchEvent(new Event(eventType));
          });
          
          // Simular interacción con formularios
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
              input.dispatchEvent(new Event('focus'));
              input.dispatchEvent(new Event('input'));
              input.dispatchEvent(new Event('change'));
              input.dispatchEvent(new Event('blur'));
            });
          });
          
          // Simular video/audio eventos
          const mediaElements = document.querySelectorAll('video, audio');
          mediaElements.forEach(media => {
            ['loadstart', 'progress', 'suspend', 'abort', 'error', 'emptied',
             'stalled', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
             'playing', 'waiting', 'seeking', 'seeked', 'ended', 'durationchange',
             'timeupdate', 'play', 'pause', 'ratechange', 'volumechange'].forEach(event => {
              media.dispatchEvent(new Event(event));
            });
          });
          
          // Activar eventos de performance
          if (window.performance && window.performance.mark) {
            window.performance.mark('user_interaction');
            window.performance.measure('page_interaction', 'navigationStart', 'user_interaction');
          }
          
          // Simular navegación con History API
          if (window.history && window.history.pushState) {
            window.history.pushState({}, '', window.location.href + '#simulated');
            window.history.back();
          }
          
        } catch (e) {
          console.log('Error forzando scripts:', e);
        }
      });
      
      // Esperar a que los scripts procesen
      await page.waitForTimeout(2000);
      
      // Obtener cookies finales después de forzar scripts
      let additionalCookies = [];
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        const finalNetworkCookies = await client.send('Network.getAllCookies');
        additionalCookies = finalNetworkCookies.cookies || [];
        console.log(`🔍 Cookies adicionales después de forzar scripts: ${additionalCookies.length}`);
        await client.detach();
      } catch (error) {
        console.log('🔍 Error obteniendo cookies finales:', error.message);
        additionalCookies = [];
      }
      
      // Combinar todas las cookies encontradas
      const combinedCookies = [
        ...networkCookies, 
        ...contextCookies, 
        ...documentCookies, 
        ...storageCookies, 
        ...iframeCookies, 
        ...additionalCookies
      ];
      const uniqueCookies = new Map();
      
      // Eliminar duplicados usando solo el nombre de la cookie
      combinedCookies.forEach((cookie, index) => {
        const key = cookie.name; // Solo usar el nombre como clave única
        if (!uniqueCookies.has(key)) {
          uniqueCookies.set(key, cookie);
          console.log(`🍪 Cookie ${index + 1}: ${cookie.name} | Domain: ${cookie.domain || 'N/A'} | Source: ${cookie.source || 'network'}`);
        }
      });
      
      console.log(`🔍 Total cookies únicas encontradas: ${uniqueCookies.size}`);
      console.log('🔍 === FIN DETECCIÓN DE COOKIES ===');
      
      // Procesar todas las cookies únicas con deduplicación mejorada
      const processedCookieNames = new Set();
      
      for (const cookie of uniqueCookies.values()) {
        const cookieInfo = await this._analyzeCookie(cookie);
        if (cookieInfo) {
          // Crear clave única basada en nombre y dominio principal
          const domainKey = this._extractMainDomain(cookieInfo.domain);
          const cookieKey = `${cookieInfo.name}-${domainKey}`;
          
          // Solo agregar si no hemos procesado esta cookie antes
          if (!processedCookieNames.has(cookieKey)) {
            processedCookieNames.add(cookieKey);
            
            // Verificar si la cookie ya existe en findings
            const existingCookie = findings.cookies.find(existing => 
              existing.name === cookieInfo.name && 
              this._extractMainDomain(existing.domain) === domainKey
            );
            
            if (!existingCookie) {
              findings.cookies.push(cookieInfo);
              if (scanLog) {
                scanLog.cookieFound(cookieInfo.name, cookieInfo.domain, cookieInfo.category);
              }
            }
          }
        }
      }
      
      // Extraer recursos y datos adicionales
      const resources = await this._extractResources(page);
      findings.scripts.push(...resources.scripts);
      findings.trackers.push(...resources.trackers);
      
      const storageData = await this._extractStorageData(page);
      findings.storage = storageData;
      
      const iframeContent = await this._analyzeIframes(page);
      findings.iframes = iframeContent;
      
      const forms = await this._analyzeForms(page);
      findings.forms = forms;
      
      // Detectar CMP y TCF data
      const cmpData = await this._detectCMP(page);
      if (cmpData.detected) {
        findings.cmpData = cmpData;
      }
      
      const tcfData = await this._extractTCFData(page);
      if (tcfData.hasFramework) {
        findings.tcfData = tcfData;
      }
      
      scan.progress.scannedUrls++;
      findings.metadata.urlsScanned++;
      await this._updateScan(scan);
    } catch (error) {
      logger.error(`Error scanning URL ${url}:`, error);
      if (scanLog) {
        scanLog.error(`Error scanning URL ${url}`, { url, error: error.message });
      }
      findings.metadata.errors.push({ url, error: error.message, timestamp: new Date() });
      if (!scan.metadata) {
        scan.metadata = { errors: [] };
      } else if (!scan.metadata.errors) {
        scan.metadata.errors = [];
      }
      scan.metadata.errors.push({ url, error: error.message, timestamp: new Date() });
      await this._updateScan(scan);
    } finally {
      try {
        if (page && !page.isClosed()) {
          await page.close();
        }
      } catch (error) {
        // Página ya cerrada o error cerrando, continuar
        console.log('🔍 Error cerrando página (probablemente ya cerrada):', error.message);
      }
    }
  }

  async _updateScan(scan) {
    try {
      await require('../models/CookieScan').findByIdAndUpdate(scan._id, {
        progress: scan.progress,
        findings: scan.findings,
        stats: scan.stats,
        status: scan.status,
        metadata: scan.metadata
      });
    } catch (error) {
      logger.error("Error updating scan document:", error);
    }
  }

  async _setupInterceptors(page, findings) {
    try {
      await page.setRequestInterception(true);
      
      // Interceptar WebSockets (solo si CDP está disponible)
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        // Escuchar eventos de WebSocket
        client.on('Network.webSocketCreated', ({ requestId, url }) => {
          console.log(`🔌 WebSocket creado: ${url}`);
          findings.webSockets = findings.webSockets || [];
          findings.webSockets.push({ url, requestId, timestamp: new Date() });
        });
        
        client.on('Network.webSocketFrameSent', ({ requestId, response }) => {
          console.log(`📤 WebSocket mensaje enviado:`, response.payloadData);
        });
        
        client.on('Network.webSocketFrameReceived', ({ requestId, response }) => {
          console.log(`📥 WebSocket mensaje recibido:`, response.payloadData);
        });
        
        console.log('🔧 WebSocket interceptors configurados');
      } catch (error) {
        console.log('🔧 Error configurando WebSocket interceptors:', error.message);
      }
      
      page.on('request', request => {
        const url = request.url();
        const headers = request.headers();
        const resourceType = request.resourceType();
        const analysis = this._analyzeRequest(url, headers, resourceType);
        if (analysis.isTracker) findings.trackers.push(analysis);
        request.continue();
      });
      
      page.on('response', async response => {
        try {
          const headers = response.headers();
          const url = response.url();
          
          // Detectar más headers relacionados con cookies
          const cookieHeaders = ['set-cookie', 'set-cookie2'];
          for (const header of cookieHeaders) {
            if (headers[header]) {
              const cookies = this._parseSetCookieHeader(headers[header]);
              for (const cookie of cookies) {
                const info = await this._analyzeCookie(cookie);
                if (info) {
                  // Verificar si la cookie ya existe en findings para evitar duplicados (mejorado)
                  const domainKey = this._extractMainDomain(info.domain);
                  const existingCookie = findings.cookies.find(existing => 
                    existing.name === info.name && 
                    this._extractMainDomain(existing.domain) === domainKey
                  );
                  
                  if (!existingCookie) {
                    findings.cookies.push(info);
                    console.log(`🍪 Nueva cookie desde ${header}: ${info.name} (${info.expiration?.durationText || 'Sesión'})`);
                  }
                }
              }
            }
          }
          
          // Analizar respuestas JSON que podrían contener cookies
          if (headers['content-type'] && headers['content-type'].includes('application/json')) {
            try {
              const jsonContent = await response.text();
              const data = JSON.parse(jsonContent);
              
              // Buscar patrones de cookies en JSON
              const searchForCookies = (obj, path = '') => {
                for (const key in obj) {
                  if (typeof obj[key] === 'object' && obj[key] !== null) {
                    searchForCookies(obj[key], `${path}.${key}`);
                  } else if (typeof obj[key] === 'string' && 
                           (key.toLowerCase().includes('cookie') || 
                            key.toLowerCase().includes('token') ||
                            key.toLowerCase().includes('session'))) {
                    console.log(`🔍 Posible cookie en JSON ${path}.${key}: ${obj[key].substring(0, 20)}...`);
                  }
                }
              };
              
              searchForCookies(data);
            } catch (e) {
              // No es JSON válido
            }
          }
          
          if (headers['content-type'] && headers['content-type'].includes('javascript')) {
            let content;
            try {
              // Verificar si la respuesta sigue siendo válida antes de obtener el texto
              if (!response.ok() || response.status() >= 400) {
                console.log(`Skipping script due to HTTP status ${response.status()}: ${url}`);
                return;
              }
              
              // Timeout para evitar bloqueos - REDUCIDO
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout getting script content')), 2000)
              );
              
              content = await Promise.race([
                response.text(),
                timeoutPromise
              ]);
              
            } catch (err) {
              // Solo log el error si no es por navegación/contexto destruido
              if (!err.message.includes('Target closed') && 
                  !err.message.includes('Execution context was destroyed') &&
                  !err.message.includes('Protocol error')) {
                console.error(`Error retrieving script content from ${url}:`, err.message);
              }
              // Salta este recurso si no se puede obtener el contenido
              return;
            }
            
            try {
              const scriptInfo = await this._analyzeScript({ src: url, content, type: headers['content-type'] });
              if (scriptInfo) findings.scripts.push(scriptInfo);
            } catch (err) {
              console.log(`Error analyzing script ${url}:`, err.message);
            }
          }
        } catch (error) {
          console.error(`Error analyzing response from ${response.url()}:`, error);
        }
      });
    } catch (error) {
      console.error("Error setting up interceptors:", error);
    }
  }

  async _setupEventListeners(page, findings) {
    return;
  }

  async _analyzeChanges(domain, findings) {
    try {
      const existingCookies = typeof domain.getCookies === 'function'
        ? await domain.getCookies()
        : [];
      const existingMap = new Map(existingCookies.map(cookie => [cookie.name, cookie]));
      findings.changes = { newCookies: [], modifiedCookies: [], removedCookies: [] };
      for (const cookie of findings.cookies) {
        const existing = existingMap.get(cookie.name);
        if (!existing) {
          findings.changes.newCookies.push(cookie);
        } else if (this._hasCookieChanged(existing, cookie)) {
          findings.changes.modifiedCookies.push({
            previous: existing,
            current: cookie,
            changes: this._identifyChanges(existing, cookie)
          });
        }
      }
      const currentNames = new Set(findings.cookies.map(c => c.name));
      findings.changes.removedCookies = existingCookies.filter(cookie => !currentNames.has(cookie.name));
    } catch (error) {
      console.error("Error analyzing changes:", error);
    }
  }

  async _extractResources(page) {
    try {
      return await page.evaluate(() => {
        const resources = { scripts: [], trackers: [] };
        document.querySelectorAll('script').forEach(script => {
          resources.scripts.push({
            src: script.src || null,
            type: script.type || 'text/javascript',
            async: script.async,
            defer: script.defer,
            content: script.innerText || null
          });
        });
        document.querySelectorAll('img, iframe').forEach(el => {
          const url = el.src;
          if (url && (url.includes('beacon') || url.includes('pixel'))) {
            resources.trackers.push({
              type: el.tagName.toLowerCase(),
              url,
              size: { width: el.width, height: el.height }
            });
          }
        });
        return resources;
      });
    } catch (error) {
      console.error("Error extracting resources:", error);
      return { scripts: [], trackers: [] };
    }
  }

  async _extractStorageData(page) {
    try {
      return await page.evaluate(() => {
        const storage = { localStorage: {}, sessionStorage: {} };
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage.localStorage[key] = localStorage.getItem(key);
        }
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          storage.sessionStorage[key] = sessionStorage.getItem(key);
        }
        return storage;
      });
    } catch (error) {
      console.error("Error extracting storage data:", error);
      return { localStorage: {}, sessionStorage: {} };
    }
  }

  async _analyzeIframes(page) {
    try {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          title: iframe.title,
          name: iframe.name,
          id: iframe.id,
          size: { width: iframe.width, height: iframe.height },
          attributes: {
            sandbox: iframe.sandbox.value,
            allow: iframe.allow,
            loading: iframe.loading
          }
        }));
      });
    } catch (error) {
      console.error("Error analyzing iframes:", error);
      return [];
    }
  }

  async _analyzeForms(page) {
    try {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input')).map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            required: input.required,
            attributes: { autocomplete: input.autocomplete, pattern: input.pattern }
          }))
        }));
      });
    } catch (error) {
      console.error("Error analyzing forms:", error);
      return [];
    }
  }

  _analyzeRequest(url, headers, resourceType) {
    const analysis = {
      url,
      type: resourceType,
      isTracker: false,
      category: null,
      trackerType: null,
      headers: {}
    };
    try {
      const urlObj = new URL(url);
      for (const [type, patterns] of Object.entries(this.trackingPatterns)) {
        if (patterns.some(pattern => pattern.test(url))) {
          analysis.isTracker = true;
          analysis.trackerType = type;
          break;
        }
      }
      const relevantHeaders = ['referer', 'origin', 'user-agent', 'cookie', 'x-requested-with'];
      relevantHeaders.forEach(header => {
        if (headers[header]) analysis.headers[header] = headers[header];
      });
      if (resourceType === 'image' && analysis.isTracker) {
        analysis.category = 'tracking_pixel';
      } else if (resourceType === 'script' && analysis.isTracker) {
        analysis.category = 'tracking_script';
      } else if (url.includes('analytics') || url.includes('track')) {
        analysis.category = 'analytics';
      }
    } catch (error) {
      console.error("Error analyzing request:", error);
    }
    return analysis;
  }

  _parseSetCookieHeader(headerValue) {
    try {
      const cookieStrings = Array.isArray(headerValue) ? headerValue : [headerValue];
      return cookieStrings.map(cookieStr => {
        const [nameValue, ...directives] = cookieStr.split(';');
        const [name, value] = nameValue.split('=').map(s => s.trim());
        const cookie = { name, value };
        directives.forEach(directive => {
          const [key, val] = directive.split('=').map(s => s.trim());
          switch (key.toLowerCase()) {
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
            case 'secure':
              cookie.secure = true;
              break;
            case 'httponly':
              cookie.httpOnly = true;
              break;
            case 'samesite':
              cookie.sameSite = val;
              break;
          }
        });
        return cookie;
      });
    } catch (error) {
      console.error("Error parsing Set-Cookie header:", error);
      return [];
    }
  }

  _determineScriptCategory(script) {
    if (script.src) {
      const url = script.src.toLowerCase();
      if (url.includes('analytics') || url.includes('tracking')) return 'analytics';
      if (url.includes('ads') || url.includes('advertising')) return 'advertising';
      if (url.includes('tag-manager')) return 'tag_manager';
    }
    if (script.content) {
      const content = script.content.toLowerCase();
      if (content.includes('gtag') || content.includes('analytics')) return 'analytics';
      if (content.includes('fbq') || content.includes('pixel')) return 'marketing';
      if (content.includes('datalayer')) return 'tag_manager';
    }
    return 'personalization';
  }

  _identifyChanges(oldCookie, newCookie) {
    const changes = [];
    const props = ['value', 'domain', 'path', 'expires', 'httpOnly', 'secure', 'sameSite'];
    props.forEach(prop => {
      if (oldCookie[prop] !== newCookie[prop]) {
        changes.push({ property: prop, old: oldCookie[prop], new: newCookie[prop] });
      }
    });
    return changes;
  }

  _generateStats(findings) {
    return {
      overview: {
        totalCookies: findings.cookies.length,
        totalScripts: findings.scripts.length,
        totalTrackers: findings.trackers.length,
        totalVendors: findings.vendors.size
      },
      cookies: {
        byCategory: this._countByCategory(findings.cookies),
        byProvider: this._countByProvider(findings.cookies),
        byDuration: this._countByDuration(findings.cookies)
      },
      scripts: {
        byType: this._countByType(findings.scripts),
        byProvider: this._countScriptsByProvider(findings.scripts)
      },
      trackers: {
        byType: this._countByType(findings.trackers),
        byDomain: this._countByDomain(findings.trackers)
      },
      changes: {
        total: findings.changes.newCookies.length +
               findings.changes.modifiedCookies.length +
               findings.changes.removedCookies.length,
        new: findings.changes.newCookies.length,
        modified: findings.changes.modifiedCookies.length,
        removed: findings.changes.removedCookies.length
      }
    };
  }

  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  _isValidUrl(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      return urlObj.hostname === baseObj.hostname;
    } catch {
      return false;
    }
  }

  _isValidDomainOrSubdomain(url, baseUrl) {
    try {
      if (!url || !baseUrl) return false;
      
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      const urlDomain = urlObj.hostname;
      const baseDomain = baseObj.hostname;
      
      if (!urlDomain || !baseDomain) return false;
      
      return urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain);
    } catch {
      return false;
    }
  }

  _normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      urlObj.protocol = 'https:';
      return urlObj.toString().replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  _countByCategory(items) {
    return this._countBy(items, 'category');
  }

  _countByProvider(items) {
    return this._countBy(items, 'provider.name');
  }

  _countByType(items) {
    return this._countBy(items, 'type');
  }

  _countByDomain(items) {
    return this._countBy(items, item => {
      try {
        return new URL(item.url).hostname;
      } catch {
        return 'personalization';
      }
    });
  }

  _countBy(items, key) {
    const count = {};
    items.forEach(item => {
      const value = typeof key === 'function'
        ? key(item)
        : key.split('.').reduce((obj, k) => obj?.[k], item) || 'other';
      count[value] = (count[value] || 0) + 1;
    });
    return count;
  }

  async _findRelatedScript(cookie) {
    return null;
  }

  async _estimateGzipSize(content) {
    if (!content) return 0;
    return Math.floor(content.length * 0.5);
  }

  _detectEventListeners(content) {
    if (!content) return false;
    return content.includes('addEventListener');
  }

  _detectCookieAccess(content) {
    if (!content) return false;
    return content.includes('document.cookie');
  }

  async _detectDependencies(script) {
    return [];
  }

  async _analyzeSecurityRisks(script) {
    return [];
  }

  _hasCookieChanged(existing, cookie) {
    return existing.value !== cookie.value;
  }

  _countByDuration(cookies) {
    const count = {};
    cookies.forEach(cookie => {
      const duration = this._analyzeCookieDuration(cookie);
      count[duration] = (count[duration] || 0) + 1;
    });
    return count;
  }

  _countScriptsByProvider(scripts) {
    const count = {};
    scripts.forEach(script => {
      const providerName = script.provider && script.provider.name ? script.provider.name : 'Other Provider';
      count[providerName] = (count[providerName] || 0) + 1;
    });
    return count;
  }

  async _analyzeCookie(cookie) {
    try {
      const category = this._detectCookieCategory(cookie);
      
      let provider = null;
      try {
        if (providerService && typeof providerService.detectCookieProvider === 'function') {
          provider = await providerService.detectCookieProvider(cookie);
        } else {
          logger.warn('Provider service not available, using simple detection');
          provider = this._simpleProviderDetection(cookie);
        }
      } catch (error) {
        logger.error('Error detecting cookie provider:', error);
        provider = this._simpleProviderDetection(cookie);
      }
      
      const duration = this._analyzeCookieDuration(cookie);
      const relatedScript = await this._findRelatedScript(cookie);
      const expirationInfo = this._getDetailedExpirationInfo(cookie);
      
      // Asegurar que provider sea String, no objeto
      const providerName = provider && typeof provider === 'object' ? provider.name : provider;
      
      // Asegurar que category nunca sea 'unknown'
      const finalCategory = category === 'unknown' ? 'personalization' : category;
      
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        category: finalCategory,
        provider: providerName || 'Propios',
        duration,
        script: relatedScript,
        firstParty: this._isFirstPartyCookie(cookie),
        attributes: {
          session: !cookie.expires,
          persistent: !!cookie.expires,
          size: this._calculateCookieSize(cookie)
        },
        expiration: {
          date: expirationInfo.date,
          durationDays: expirationInfo.durationDays,
          durationText: expirationInfo.durationText,
          isSession: expirationInfo.isSession
        }
      };
    } catch (error) {
      console.error("Error analyzing cookie:", error);
      return null;
    }
  }

  async _analyzeScript(script) {
    try {
      const provider = await providerService.detectScriptProvider(script);
      return {
        url: script.src || '',
        type: script.type || 'text/javascript',
        provider: provider && provider.name ? provider.name : 'Propios',
        loadType: script.async ? 'async' : (script.defer ? 'defer' : 'sync')
      };
    } catch (error) {
      console.error("Error analyzing script:", error);
      return null;
    }
  }

  _detectCookieCategory(cookie) {
    for (const [category, patterns] of Object.entries(this.cookiePatterns)) {
      if (patterns.some(pattern => pattern.test(cookie.name))) {
        return category;
      }
    }
    
    // Mejorar detección por atributos y dominio
    if (cookie.httpOnly && cookie.secure) return 'necessary';
    if (cookie.name.includes('consent')) return 'necessary';
    
    // Detectar cookies de terceros por dominio
    if (cookie.domain) {
      const domain = cookie.domain.toLowerCase();
      
      // Dominios de terceros conocidos -> marketing/advertising
      const thirdPartyDomains = [
        'google', 'facebook', 'doubleclick', 'googlesyndication', 'googleadservices',
        'linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'snapchat',
        'amazon-adsystem', 'adsystem', 'criteo', 'outbrain', 'taboola',
        'adnxs', 'adsymptotic', 'adform', 'rlcdn', 'rubiconproject'
      ];
      
      if (thirdPartyDomains.some(td => domain.includes(td))) {
        return 'marketing';
      }
      
      // Analytics de terceros
      const analyticsDomains = [
        'analytics', 'hotjar', 'mixpanel', 'amplitude', 'segment',
        'optimizely', 'crazyegg', 'mouseflow', 'fullstory'
      ];
      
      if (analyticsDomains.some(ad => domain.includes(ad))) {
        return 'analytics';
      }
    }
    
    // Detectar por patrones en el nombre
    const cookieName = cookie.name.toLowerCase();
    
    // Patrones de tracking/marketing
    if (/^(utm_|gclid|fbclid|msclkid|twclid|li_|_ttp|_pin)/.test(cookieName)) {
      return 'marketing';
    }
    
    // Patrones de analytics
    if (/^(_{1,2}(ga|gid|gat)|pk_|_hjid|hj|_clck|amp_|heap|mp_)/.test(cookieName)) {
      return 'analytics';
    }
    
    // IDs únicos largos (probablemente tracking)
    if (/^[a-f0-9]{8,}$/i.test(cookie.value) || /^[A-Za-z0-9+/=]{20,}$/.test(cookie.value)) {
      return 'marketing';
    }
    
    // Si el dominio es diferente al dominio principal, probablemente terceros
    // Nota: En servidor no tenemos window, así que solo verificamos si es dominio externo
    if (cookie.domain && !cookie.domain.startsWith('.') && this._isThirdPartyDomain(cookie.domain)) {
      return 'marketing';
    }
    
    return 'personalization';
  }

  _simpleProviderDetection(cookie) {
    // Detección mejorada de proveedores
    const name = cookie.name.toLowerCase();
    const domain = cookie.domain ? cookie.domain.toLowerCase() : '';
    
    // Google Services
    if (name.includes('_ga') || name.includes('_gid') || name.includes('_gat') || name.includes('__utm')) {
      return { name: 'Google Analytics', category: 'analytics' };
    }
    if (name.includes('_gcl') || name.includes('_gac') || domain.includes('google')) {
      return { name: 'Google Ads', category: 'marketing' };
    }
    
    // Facebook/Meta
    if (name.includes('_fbp') || name.includes('_fbc') || name.includes('fr') || domain.includes('facebook')) {
      return { name: 'Facebook Pixel', category: 'marketing' };
    }
    
    // Analytics Platforms
    if (name.includes('_hjid') || name.includes('_hjsession') || domain.includes('hotjar')) {
      return { name: 'Hotjar', category: 'analytics' };
    }
    if (name.includes('mp_') || domain.includes('mixpanel')) {
      return { name: 'Mixpanel', category: 'analytics' };
    }
    if (name.includes('amplitude') || domain.includes('amplitude')) {
      return { name: 'Amplitude', category: 'analytics' };
    }
    if (name.includes('_clck') || name.includes('_clsk') || domain.includes('clarity')) {
      return { name: 'Microsoft Clarity', category: 'analytics' };
    }
    
    // Marketing Platforms
    if (name.includes('linkedin') || name.includes('li_gc') || domain.includes('linkedin')) {
      return { name: 'LinkedIn Insight', category: 'marketing' };
    }
    if (name.includes('_ttp') || domain.includes('tiktok')) {
      return { name: 'TikTok Pixel', category: 'marketing' };
    }
    if (name.includes('pinterest') || domain.includes('pinterest')) {
      return { name: 'Pinterest', category: 'marketing' };
    }
    
    // E-commerce
    if (name.includes('woocommerce') || name.includes('wc_')) {
      return { name: 'WooCommerce', category: 'necessary' };
    }
    if (name.includes('shopify') || domain.includes('shopify')) {
      return { name: 'Shopify', category: 'necessary' };
    }
    
    // CMP/Consent
    if (name.includes('cookieyes') || name.includes('consent') || name.includes('cmp')) {
      return { name: 'Consent Management', category: 'necessary' };
    }
    
    // Advertising Networks
    if (domain.includes('doubleclick') || domain.includes('googlesyndication')) {
      return { name: 'Google DoubleClick', category: 'advertising' };
    }
    if (domain.includes('criteo') || name.includes('criteo')) {
      return { name: 'Criteo', category: 'advertising' };
    }
    if (domain.includes('outbrain') || name.includes('outbrain')) {
      return { name: 'Outbrain', category: 'advertising' };
    }
    
    // Si es de un dominio de terceros pero no lo reconocemos, clasificar como Third Party
    if (domain && this._isThirdPartyDomain(domain)) {
      return { name: 'Third Party Service', category: 'marketing' };
    }
    
    // Para cookies desconocidas, usar "Propios" y "personalization"
    return { name: 'Propios', category: 'personalization' };
  }
  
  _isThirdPartyDomain(domain) {
    if (!domain) return false;
    
    const domainLower = domain.toLowerCase();
    
    // Conocidos servicios de terceros
    const knownThirdParties = [
      'google.com', 'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'facebook.com', 'linkedin.com', 'twitter.com', 'instagram.com',
      'criteo.com', 'outbrain.com', 'taboola.com', 'amazon-adsystem.com',
      'hotjar.com', 'mixpanel.com', 'amplitude.com', 'segment.com',
      'pinterest.com', 'snapchat.com', 'tiktok.com', 'youtube.com'
    ];
    
    // Verificar si es un dominio de terceros conocido
    if (knownThirdParties.some(tp => domainLower.includes(tp))) {
      return true;
    }
    
    // Indicadores de servicios de terceros
    const thirdPartyIndicators = [
      'ads', 'analytics', 'tracking', 'pixel', 'tag', 'cdn',
      'static', 'assets', 'media', 'api'
    ];
    
    // Si contiene indicadores de terceros
    if (thirdPartyIndicators.some(indicator => domainLower.includes(indicator))) {
      return true;
    }
    
    // Si no empieza con punto (subdominio) y tiene múltiples partes, puede ser tercero
    return !domainLower.startsWith('.') && domainLower.split('.').length >= 3;
  }

  _analyzeCookieDuration(cookie) {
    if (!cookie.expires) return 'session';
    const duration = new Date(cookie.expires) - new Date();
    const days = duration / (1000 * 60 * 60 * 24);
    if (days <= 1) return 'session';
    if (days <= 30) return 'short_term';
    if (days <= 365) return 'medium_term';
    return 'long_term';
  }

  _hasSignificantChanges(changes) {
    return changes.newCookies.length > 0 ||
           changes.modifiedCookies.some(change =>
             change.changes.some(c => ['category', 'provider'].includes(c.property))
           );
  }

  _calculateCookieSize(cookie) {
    return new TextEncoder().encode(`${cookie.name}=${cookie.value}`).length;
  }

  _isFirstPartyCookie(cookie) {
    if (!cookie.domain) return true;
    return cookie.domain.startsWith('.');
  }

  _extractMainDomain(domain) {
    if (!domain) return 'localhost';
    
    // Remover punto inicial si existe
    const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;
    
    // Obtener dominio principal (ej: subdomain.example.com -> example.com)
    const parts = cleanDomain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return cleanDomain;
  }

  _getDetailedExpirationInfo(cookie) {
    const now = new Date();
    let expirationDate = null;
    let durationDays = 0;
    let durationText = 'Sesión';

    if (cookie.expires) {
      expirationDate = new Date(cookie.expires);
      durationDays = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      
      if (durationDays <= 0) {
        durationText = 'Expirada';
      } else if (durationDays === 1) {
        durationText = '1 día';
      } else if (durationDays < 7) {
        durationText = `${durationDays} días`;
      } else if (durationDays < 30) {
        const weeks = Math.floor(durationDays / 7);
        durationText = weeks === 1 ? '1 semana' : `${weeks} semanas`;
      } else if (durationDays < 365) {
        const months = Math.floor(durationDays / 30);
        durationText = months === 1 ? '1 mes' : `${months} meses`;
      } else {
        const years = Math.floor(durationDays / 365);
        const months = Math.floor((durationDays % 365) / 30);
        if (years === 1 && months === 0) {
          durationText = '1 año';
        } else if (months === 0) {
          durationText = `${years} años`;
        } else {
          durationText = `${years} año${years > 1 ? 's' : ''} y ${months} mes${months > 1 ? 'es' : ''}`;
        }
      }
    } else if (cookie.maxAge) {
      durationDays = Math.ceil(cookie.maxAge / (60 * 60 * 24));
      expirationDate = new Date(now.getTime() + (cookie.maxAge * 1000));
      durationText = durationDays === 1 ? '1 día' : `${durationDays} días`;
    }

    return {
      date: expirationDate,
      durationDays: Math.max(0, durationDays),
      durationText,
      isSession: !expirationDate
    };
  }

  // Método para intentar aceptar cookies automáticamente (simplificado)
  async _tryAcceptCookies(page) {
    try {
      logger.info('🍪 Attempting to accept ALL cookies...');
      
      await page.waitForTimeout(2000);
      
      // Primero intentar aceptar TODO mediante scripts conocidos
      try {
        await page.evaluate(() => {
          // OneTrust - Aceptar todo
          if (window.OneTrust) {
            window.OneTrust.AllowAll();
            return true;
          }
          // Cookiebot - Aceptar todo
          if (window.Cookiebot) {
            window.Cookiebot.consent.marketing = true;
            window.Cookiebot.consent.statistics = true;
            window.Cookiebot.consent.preferences = true;
            window.Cookiebot.submitConsent();
            return true;
          }
          // Quantcast Choice - Aceptar todo
          if (window.__tcfapi) {
            window.__tcfapi('setTCString', 2, (result) => {}, 'IABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
            return true;
          }
          // Didomi - Aceptar todo
          if (window.Didomi) {
            window.Didomi.setUserAgreeToAll();
            return true;
          }
          // TrustArc - Aceptar todo
          if (window.truste) {
            window.truste.eu.clickListener({target: {className: 'call'}});
            return true;
          }
        });
      } catch (e) {
        // Continuar con selectores
      }
      
      // Selectores expandidos para aceptar TODO
      const consentSelectors = [
        // OneTrust
        '#onetrust-accept-btn-handler',
        '.onetrust-accept-btn-handler',
        '#accept-recommended-btn-handler',
        '.ot-pc-refuse-all-handler',
        '#onetrust-pc-btn-handler',
        // CookieBot
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
        'a[id="CybotCookiebotDialogBodyLevelButtonAccept"]',
        '.CybotCookiebotDialogBodyButton[id*="AllowAll"]',
        // Quantcast
        '.qc-cmp2-summary-buttons button:last-child',
        'button[mode="primary"]',
        // TrustArc
        '.trustarc-agree-button',
        'a.call',
        // Didomi
        '#didomi-notice-agree-button',
        'button[id="didomi-notice-agree-button"]',
        // CookieYes
        '.cky-btn-accept',
        '.cookie-consent-accept',
        // General patterns
        'button:contains("Accept All")',
        'button:contains("Accept all")',
        'button:contains("Aceptar todo")',
        'button:contains("Aceptar todas")',
        'button[id*="accept-all"]',
        'button[class*="accept-all"]',
        '.cc-btn.cc-dismiss',
        '.cc-allow',
        'button[data-cookiebanner="accept_all"]'
      ];
      
      // Intentar solo una vez con selectores específicos
      for (const selector of consentSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              await element.click();
              logger.info(`✅ Clicked consent button: ${selector}`);
              await page.waitForTimeout(2000);
              return true;
            }
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      // Fallback: buscar por texto común solo una vez
      try {
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
          const acceptTexts = ['accept all', 'accept cookies', 'acepto', 'aceptar', 'allow all'];
          
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase().trim();
            
            if (acceptTexts.some(t => text === t || text.includes(t))) {
              if (btn.offsetParent !== null) { // Verificar si es visible
                btn.click();
                return true;
              }
            }
          }
          
          return false;
        });
        
        if (clicked) {
          logger.info('✅ Clicked consent button via text search');
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        logger.error('Error in text-based consent detection:', e.message);
      }
      
      logger.info('ℹ️ No consent banner found or clickable');
      return false;
    } catch (error) {
      logger.error('Error in consent acceptance:', error);
      return false;
    }
  }

  // Detectar CMP (Consent Management Platform)
  async _detectCMP(page) {
    const CMP_DETECTORS = {
      cookiebot: {
        detect: 'window.Cookiebot !== undefined',
        getConsent: 'window.Cookiebot?.consent'
      },
      onetrust: {
        detect: 'window.OneTrust !== undefined || window.OnetrustActiveGroups !== undefined',
        getConsent: 'window.OneTrust?.getGeolocationData()'
      },
      quantcast: {
        detect: 'window.__tcfapi !== undefined',
        getConsent: 'window.__tcfapi?.getTCData'
      },
      trustarc: {
        detect: 'window.truste !== undefined',
        getConsent: 'window.truste?.eu?.bindMap'
      },
      cookieyes: {
        detect: 'window.CookieYes !== undefined',
        getConsent: 'window.CookieYes?.getConsent()'
      },
      termly: {
        detect: 'window.Termly !== undefined',
        getConsent: 'window.Termly?.getConsent()'
      },
      iubenda: {
        detect: 'window._iub !== undefined',
        getConsent: 'window._iub?.cs?.consent'
      },
      didomi: {
        detect: 'window.Didomi !== undefined',
        getConsent: 'window.Didomi?.getUserStatus()'
      }
    };

    return await page.evaluate((detectors) => {
      const result = {
        detected: false,
        cmp: null,
        version: null,
        consentGiven: null
      };
      
      for (const [name, detector] of Object.entries(detectors)) {
        try {
          if (eval(detector.detect)) {
            result.detected = true;
            result.cmp = name;
            
            try {
              const consentData = eval(detector.getConsent);
              if (consentData) {
                result.consentGiven = consentData;
              }
            } catch (e) {}
            
            break;
          }
        } catch (e) {}
      }
      
      return result;
    }, CMP_DETECTORS);
  }

  // Extraer datos TCF (Transparency and Consent Framework)
  async _extractTCFData(page) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const tcfData = {
          hasFramework: false,
          consentString: null,
          version: null,
          tcfVersion: null,
          purposes: {},
          vendors: {},
          vendorCount: 0,
          compliance: {
            usesEventListener: false,
            tcf22Compliant: false,
            issues: []
          }
        };

        // Verificar __tcfapi
        if (window.__tcfapi && typeof window.__tcfapi === 'function') {
          tcfData.hasFramework = true;
          
          try {
            window.__tcfapi('addEventListener', 2, (tcDataResult, success) => {
              if (success && tcDataResult) {
                tcfData.compliance.usesEventListener = true;
                tcfData.consentString = tcDataResult.tcString;
                tcfData.version = tcDataResult.tcfPolicyVersion;
                tcfData.purposes = tcDataResult.purpose || {};
                tcfData.vendors = tcDataResult.vendor || {};
                tcfData.cmpId = tcDataResult.cmpId;
                tcfData.cmpVersion = tcDataResult.cmpVersion;
                
                if (tcDataResult.vendor && tcDataResult.vendor.consents) {
                  tcfData.vendorCount = Object.keys(tcDataResult.vendor.consents).length;
                }
                
                // Verificar compliance TCF 2.2
                const restrictedPurposes = [3, 4, 5, 6];
                if (tcDataResult.purpose && tcDataResult.purpose.legitimateInterests) {
                  restrictedPurposes.forEach(purposeId => {
                    if (tcDataResult.purpose.legitimateInterests[purposeId]) {
                      tcfData.compliance.issues.push(`Purpose ${purposeId} incorrectly uses legitimate interest (TCF 2.2 violation)`);
                    }
                  });
                }
                
                tcfData.compliance.tcf22Compliant = tcfData.compliance.issues.length === 0;
              }
              resolve(tcfData);
            });
            
            setTimeout(() => {
              if (!tcfData.compliance.usesEventListener) {
                // Fallback a getTCData
                try {
                  window.__tcfapi('getTCData', 2, (tcDataResult, success) => {
                    if (success && tcDataResult) {
                      tcfData.consentString = tcDataResult.tcString;
                      tcfData.version = tcDataResult.tcfPolicyVersion;
                      tcfData.purposes = tcDataResult.purpose || {};
                      tcfData.vendors = tcDataResult.vendor || {};
                      tcfData.compliance.issues.push('Uses deprecated getTCData method');
                    }
                    resolve(tcfData);
                  });
                } catch (e) {
                  resolve(tcfData);
                }
              }
            }, 2000);
            
          } catch (e) {
            resolve(tcfData);
          }
        } else {
          // Buscar consent strings en cookies/localStorage
          const consentCookie = document.cookie.match(/euconsent-v2=([^;]+)/);
          if (consentCookie) {
            tcfData.consentString = decodeURIComponent(consentCookie[1]);
            tcfData.hasFramework = true;
          }

          const localConsent = localStorage.getItem('euconsent-v2');
          if (localConsent) {
            tcfData.consentString = localConsent;
            tcfData.hasFramework = true;
          }
          
          resolve(tcfData);
        }
      });
    });
  }
}

module.exports = new ScannerService();