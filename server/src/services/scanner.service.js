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
    this.scanTimeout = 30000; // 30 segundos por página
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

    // Patrones de categorías de cookies
    this.cookiePatterns = {
      necessary: [
        /^(csrf|session|auth|secure|__Secure-|__Host-)/i,
        /_csrf$/i,
        /^XSRF-TOKEN$/i
      ],
      functionality: [
        /^(prefs|settings|language|timezone|display)/i,
        /_preferences$/i,
        /^ui-/i
      ],
      analytics: [
        /^(_ga|_gid|_gat|__utm)/i,
        /^_pk_/i,
        /^amplitude/i,
        /^mp_/i
      ],
      marketing: [
        /^(_fbp|_fbc|fr)/i,
        /^(_gcl|_gac)/i,
        /^pinterest_/i,
        /^_ttp/i
      ],
      advertising: [
        /^(ide|test_cookie|_drt_|id)/i,
        /^doubleclick/i,
        /^adroll/i
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
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          ignoreHTTPSErrors: true,
          defaultViewport: { width: 1920, height: 1080 }
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
    const includeSubdomains = config.includeSubdomains || false;
    const maxDepth = config.depth || 5; // Usar depth 5 como predeterminado
    
    try {
      const baseUrl = new URL(startUrl);
      const page = await this.browserPool.newPage();
      
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
            
            // Enlaces de navegación
            document.querySelectorAll('a[href]').forEach(anchor => {
              try {
                const href = anchor.getAttribute('href');
                if (!href) return;
                
                const absoluteUrl = new URL(href, baseUrl);
                
                // Verificar si es válido según configuración de subdominios
                let isValid = false;
                if (includeSubdomains && absoluteUrl.hostname) {
                  isValid = absoluteUrl.hostname.endsWith(baseDomain) || absoluteUrl.hostname === baseDomain;
                } else if (absoluteUrl.hostname) {
                  isValid = absoluteUrl.hostname === baseDomain;
                }
                
                if (isValid && ['http:', 'https:'].includes(absoluteUrl.protocol)) {
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
                  if ((includeSubdomains && absoluteUrl.hostname && absoluteUrl.hostname.endsWith(baseDomain)) ||
                      (!includeSubdomains && absoluteUrl.hostname === baseDomain)) {
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
                  if ((includeSubdomains && absoluteUrl.hostname && absoluteUrl.hostname.endsWith(baseDomain)) ||
                      (!includeSubdomains && absoluteUrl.hostname === baseDomain)) {
                    foundLinks.add(absoluteUrl.href);
                  }
                } catch (e) {}
              }
            });
            
            return Array.from(foundLinks);
          }, baseUrl.hostname, includeSubdomains, maxDepth);
          
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
        const promises = chunk.map(url => this._scanUrl(url, findings, scan, scanLog));
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
      if (this.browserPool) {
        await this.browserPool.close();
        this.browserPool = null;
      }
    }
  }

  async _scanUrl(url, findings, scan, scanLog = null) {
    const page = await this.browserPool.newPage();
    try {
      if (scanLog) {
        scanLog.info(`Scanning URL: ${url}`, { url });
      }
      
      // Configurar página para mejor detección
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Evitar detección de automatización
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
      });
      
      await this._setupInterceptors(page, findings);
      await this._setupEventListeners(page, findings);
      scan.progress.currentUrl = url;
      await this._updateScan(scan);
      await page.setDefaultNavigationTimeout(this.scanTimeout);
      await page.setDefaultTimeout(this.scanTimeout);
      
      await this._retryOperation(
        () => page.goto(url, { waitUntil: ['load', 'networkidle0'], timeout: this.scanTimeout }),
        this.maxRetries
      );
      
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
      
      // Simular interacciones para activar scripts de tracking
      await page.evaluate(() => {
        // Scroll para activar lazy loading y eventos
        window.scrollTo(0, document.body.scrollHeight / 2);
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
        
        // Disparar eventos comunes
        ['load', 'scroll', 'mousemove', 'click'].forEach(event => {
          window.dispatchEvent(new Event(event));
        });
        
        // Activar analytics si están disponibles
        if (window.gtag) window.gtag('event', 'page_view');
        if (window.ga) window.ga('send', 'pageview');
        if (window.fbq) window.fbq('track', 'PageView');
      });
      
      await page.waitForTimeout(2000);
      
      // Obtener cookies del navegador
      const cookies = await page.cookies();
      for (const cookie of cookies) {
        const cookieInfo = await this._analyzeCookie(cookie);
        if (cookieInfo) {
          // Verificar si la cookie ya existe en findings para evitar duplicados
          const existingCookie = findings.cookies.find(existing => 
            existing.name === cookieInfo.name && 
            existing.domain === cookieInfo.domain
          );
          
          if (!existingCookie) {
            findings.cookies.push(cookieInfo);
            if (scanLog) {
              scanLog.cookieFound(cookieInfo.name, cookieInfo.domain, cookieInfo.category);
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
      await page.close();
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
          if (headers['set-cookie']) {
            const cookies = this._parseSetCookieHeader(headers['set-cookie']);
            for (const cookie of cookies) {
              const info = await this._analyzeCookie(cookie);
              if (info) {
                // Verificar si la cookie ya existe en findings para evitar duplicados
                const existingCookie = findings.cookies.find(existing => 
                  existing.name === info.name && 
                  existing.domain === info.domain
                );
                
                if (!existingCookie) {
                  findings.cookies.push(info);
                }
              }
            }
          }
          if (headers['content-type'] && headers['content-type'].includes('javascript')) {
            let content;
            try {
              content = await response.text();
            } catch (err) {
              console.error(`Error retrieving script content from ${url}:`, err);
              // Salta este recurso si no se puede obtener el contenido
              return;
            }
            const scriptInfo = await this._analyzeScript({ src: url, content, type: headers['content-type'] });
            if (scriptInfo) findings.scripts.push(scriptInfo);
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
    return 'unknown';
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
        return 'unknown';
      }
    });
  }

  _countBy(items, key) {
    const count = {};
    items.forEach(item => {
      const value = typeof key === 'function'
        ? key(item)
        : key.split('.').reduce((obj, k) => obj?.[k], item) || 'unknown';
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
      const providerName = script.provider && script.provider.name ? script.provider.name : 'unknown';
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
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        category,
        provider,
        duration,
        script: relatedScript,
        firstParty: this._isFirstPartyCookie(cookie),
        attributes: {
          session: !cookie.expires,
          persistent: !!cookie.expires,
          size: this._calculateCookieSize(cookie)
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
        provider: provider && provider.name ? provider.name : 'Unknown',
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
    if (cookie.httpOnly && cookie.secure) return 'necessary';
    if (cookie.name.includes('consent')) return 'necessary';
    return 'unknown';
  }

  _simpleProviderDetection(cookie) {
    // Detección simple de proveedores basada en nombre de cookie
    const name = cookie.name.toLowerCase();
    
    if (name.includes('_ga') || name.includes('_gid') || name.includes('_gat')) {
      return { name: 'Google Analytics', category: 'analytics' };
    }
    if (name.includes('_fbp') || name.includes('fr')) {
      return { name: 'Facebook', category: 'marketing' };
    }
    if (name.includes('_hjid') || name.includes('_hjsession')) {
      return { name: 'Hotjar', category: 'analytics' };
    }
    if (name.includes('mailchimp')) {
      return { name: 'Mailchimp', category: 'marketing' };
    }
    if (name.includes('woocommerce')) {
      return { name: 'WooCommerce', category: 'necessary' };
    }
    if (name.includes('cookieyes') || name.includes('consent')) {
      return { name: 'Consent Management', category: 'necessary' };
    }
    
    return { name: 'Unknown', category: 'unknown' };
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

  // Método para intentar aceptar cookies automáticamente (simplificado)
  async _tryAcceptCookies(page) {
    try {
      logger.info('🍪 Attempting to accept cookie consent...');
      
      await page.waitForTimeout(2000);
      
      // Selectores más específicos y comunes
      const consentSelectors = [
        '#onetrust-accept-btn-handler',
        '.onetrust-accept-btn-handler',
        '#accept-recommended-btn-handler',
        '.cookie-consent-accept',
        '.cc-btn.cc-dismiss',
        '#cookiebot-accept',
        '.cookiebot-accept',
        '#didomi-notice-agree-button',
        '.qc-cmp-button.qc-cmp-accept-button',
        '.trustarc-agree-button',
        '.cookieyes-accept',
        '.iubenda-cs-accept-btn',
        'button[id*="accept"]:not([id*="reject"])',
        'button[class*="accept"]:not([class*="reject"])'
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