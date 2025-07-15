const puppeteer = require('puppeteer');
const { URL } = require('url');
const logger = require('../utils/logger');
const CookieAnalysis = require('../models/CookieAnalysis');
const IntelligentCookieResult = require('../models/IntelligentCookieResult');
const IntelligentCookieAnalyzer = require('./intelligentCookieAnalyzer.service');
const providerService = require('./provider.service');

class AdvancedCookieAnalyzer {
  constructor() {
    this.browser = null;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Patrones de detección
    this.cookiePatterns = {
      necessary: [
        /^(csrf|session|auth|secure|__Secure-|__Host-)/i,
        /_csrf$/i, /^XSRF-TOKEN$/i, /^laravel_session$/i
      ],
      functional: [
        /^(prefs|settings|language|timezone|display|theme)/i,
        /_preferences$/i, /^ui-/i, /^remember_/i
      ],
      analytics: [
        /^(_ga|_gid|_gat|__utm|_dc_gtm_)/i,
        /^_pk_/i, /^amplitude/i, /^mp_/i, /^mixpanel/i,
        /^_hjid|_hjAbsoluteSessionInProgress/i
      ],
      advertising: [
        /^(_fbp|_fbc|fr)/i, /^(_gcl|_gac)/i,
        /^pinterest_/i, /^_ttp/i, /^ide|test_cookie/i,
        /^doubleclick/i, /^adroll/i, /^_uuid/i
      ],
      social: [
        /^(facebook|fb_|twitter|linkedin|instagram)/i,
        /^social_/i, /^share_/i
      ]
    };

    this.providerPatterns = {
      'Google Analytics': {
        cookies: [/_ga/, /_gid/, /_gat/, /__utm/],
        scripts: [/google-analytics\.com/, /googletagmanager\.com/],
        domain: 'google.com'
      },
      'Facebook': {
        cookies: [/_fbp/, /_fbc/, /^fr$/],
        scripts: [/connect\.facebook\.net/, /facebook\.com\/tr/],
        domain: 'facebook.com'
      },
      'Google Ads': {
        cookies: [/_gcl/, /_gac/, /ide/, /test_cookie/],
        scripts: [/googleadservices\.com/, /googlesyndication\.com/],
        domain: 'google.com'
      },
      'Hotjar': {
        cookies: [/_hjid/, /_hjAbsoluteSessionInProgress/],
        scripts: [/hotjar\.com/],
        domain: 'hotjar.com'
      },
      'TikTok': {
        cookies: [/_ttp/],
        scripts: [/tiktok\.com/],
        domain: 'tiktok.com'
      }
    };

    this.consentPlatforms = [
      { name: 'OneTrust', patterns: [/onetrust/i, /optanon/i] },
      { name: 'Cookiebot', patterns: [/cookiebot/i] },
      { name: 'TrustArc', patterns: [/trustarc/i, /truste/i] },
      { name: 'Cookie Consent', patterns: [/cookieconsent/i] },
      { name: 'Quantcast', patterns: [/quantcast/i] }
    ];
  }

  async initBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        protocolTimeout: 60000  // Aumentar timeout a 60 segundos
      });
    }
    return this.browser;
  }

  async startAnalysis(domainId, domain, config, analysisId = null) {
    logger.info(`Starting advanced cookie analysis for ${domain}`);
    
    let analysis;
    
    if (analysisId) {
      // Si se proporciona un ID, usar el análisis existente
      analysis = await CookieAnalysis.findOne({ analysisId });
      if (!analysis) {
        throw new Error('Analysis not found');
      }
      // Actualizar estado a running
      analysis.status = 'running';
      analysis.progress.currentPhase = 'initialization';
      analysis.progress.percentage = 0;
      await analysis.save();
    } else {
      // Si no, crear nuevo análisis
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 9);
      const scanId = `scan_${timestamp}_${random}`;
      
      analysis = new CookieAnalysis({
        scanId,
        domainId,
        domain,
        analysisConfig: config,
        status: 'running',
        progress: {
          currentPhase: 'initialization',
          percentage: 0,
          startTime: new Date()
        }
      });
      
      await analysis.save();
    }

    try {
      // Inicializar browser
      await this.initBrowser();
      await analysis.updateProgress('initialization', 'Inicializando navegador', 5);

      // Fase 1: Descubrimiento de URLs
      await analysis.updateProgress('discovery', 'Descubriendo URLs', 10);
      const urls = await this.discoverUrls(domain, config);
      analysis.discoveredUrls = urls.map(url => ({
        url: url.url,
        depth: url.depth,
        foundOn: url.foundOn
      }));
      analysis.progress.urlsTotal = urls.length;
      await analysis.save();

      // Fase 2: Análisis de páginas
      await analysis.updateProgress('analysis', 'Analizando páginas', 20);
      await this.analyzePages(analysis, urls);

      // Fase 3: Procesamiento de datos
      await analysis.updateProgress('processing', 'Procesando resultados', 85);
      await this.processResults(analysis);

      // Fase 4: Finalización
      await analysis.updateProgress('finalization', 'Generando recomendaciones', 95);
      await this.generateRecommendations(analysis);

      // Completar análisis
      analysis.status = 'completed';
      analysis.progress.percentage = 100;
      analysis.progress.currentStep = 'Análisis completado';
      await analysis.save();

      logger.info(`Analysis completed for ${domain}: ${analysis.scanId}`);
      return analysis;

    } catch (error) {
      logger.error(`Analysis failed for ${domain}:`, error);
      analysis.status = 'failed';
      analysis.progress.currentStep = `Error: ${error.message}`;
      await analysis.addError('analysis', error);
      await analysis.save();
      throw error;
    }
  }

  async discoverUrls(domain, config) {
    const urls = [];
    const visited = new Set();
    const toVisit = [{ url: `https://${domain}`, depth: 0, foundOn: 'root' }];
    
    // Añadir subdominios si está habilitado
    if (config.includeSubdomains) {
      const subdomains = await this.discoverSubdomains(domain);
      subdomains.forEach(subdomain => {
        toVisit.push({ url: `https://${subdomain}`, depth: 0, foundOn: 'subdomain_discovery' });
      });
    }

    while (toVisit.length > 0 && urls.length < config.maxUrls) {
      const current = toVisit.shift();
      
      if (visited.has(current.url) || current.depth > config.depth) {
        continue;
      }
      
      visited.add(current.url);
      urls.push(current);

      try {
        const page = await this.browser.newPage();
        await page.setUserAgent(this.userAgent);
        await page.setViewport(config.viewport || { width: 1920, height: 1080 });
        
        const response = await page.goto(current.url, { 
          waitUntil: 'networkidle0', 
          timeout: config.timeout || 30000 
        });

        if (response && response.ok()) {
          // Extraer links si no hemos alcanzado la profundidad máxima
          if (current.depth < config.depth) {
            const links = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href && !href.startsWith('mailto:') && !href.startsWith('tel:'));
            });

            links.forEach(link => {
              try {
                const linkUrl = new URL(link);
                const linkDomain = linkUrl.hostname;
                
                // Solo incluir URLs del mismo dominio o subdominios
                if (linkDomain === domain || 
                    (config.includeSubdomains && linkDomain.endsWith(`.${domain}`))) {
                  
                  const normalizedUrl = `${linkUrl.protocol}//${linkUrl.hostname}${linkUrl.pathname}`;
                  
                  if (!visited.has(normalizedUrl) && 
                      !toVisit.some(item => item.url === normalizedUrl)) {
                    toVisit.push({
                      url: normalizedUrl,
                      depth: current.depth + 1,
                      foundOn: current.url
                    });
                  }
                }
              } catch (e) {
                // Ignorar URLs malformadas
              }
            });
          }
        }

        await page.close();
      } catch (error) {
        logger.warn(`Error discovering URLs from ${current.url}:`, error.message);
      }
    }

    return urls;
  }

  async discoverSubdomains(domain) {
    const subdomains = [];
    const commonSubdomains = ['www', 'api', 'blog', 'shop', 'store', 'admin', 'app', 'mobile', 'm'];
    
    for (const sub of commonSubdomains) {
      try {
        const subdomain = `${sub}.${domain}`;
        const page = await this.browser.newPage();
        
        const response = await page.goto(`https://${subdomain}`, { 
          timeout: 10000,
          waitUntil: 'domcontentloaded'
        });
        
        if (response && response.ok()) {
          subdomains.push(subdomain);
        }
        
        await page.close();
      } catch (error) {
        // Subdominio no existe o no es accesible
      }
    }
    
    return subdomains;
  }

  async analyzePages(analysis, urls) {
    const totalUrls = urls.length;
    let processedUrls = 0;

    for (const urlData of urls) {
      try {
        await this.analyzePage(analysis, urlData.url);
        processedUrls++;
        
        // Actualizar progreso
        const percentage = 20 + Math.floor((processedUrls / totalUrls) * 60);
        await analysis.updateProgress('analysis', 
          `Analizando página ${processedUrls}/${totalUrls}`, 
          percentage, urlData.url);
        
        analysis.progress.urlsAnalyzed = processedUrls;
        await analysis.save();

      } catch (error) {
        logger.warn(`Error analyzing ${urlData.url}:`, error.message);
        await analysis.addError(urlData.url, error);
      }
    }
  }

  async analyzePage(analysis, url) {
    const page = await this.browser.newPage();
    
    try {
      // Configurar interceptores
      await this.setupPageInterceptors(page, analysis);
      
      // Navegar a la página
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: analysis.analysisConfig.timeout || 30000 
      });

      // Esperar un momento para que se ejecuten los scripts
      await page.waitForTimeout(2000);

      // Analizar cookies
      await this.analyzeCookiesOnPage(page, analysis, url);
      
      // Analizar localStorage y sessionStorage
      await this.analyzeStorageOnPage(page, analysis, url);
      
      // Analizar scripts
      await this.analyzeScriptsOnPage(page, analysis, url);
      
      // Analizar iframes
      await this.analyzeIframesOnPage(page, analysis, url);
      
      // Analizar formularios
      await this.analyzeFormsOnPage(page, analysis, url);
      
      // Detectar CMP
      await this.detectConsentManagement(page, analysis, url);
      
      // Detectar tecnologías
      await this.detectTechnologies(page, analysis, url);

    } finally {
      await page.close();
    }
  }

  async setupPageInterceptors(page, analysis) {
    // Interceptar requests para análisis de red
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Analizar request
      this.analyzeNetworkRequest(request, analysis);
      request.continue();
    });

    page.on('response', (response) => {
      // Analizar response
      this.analyzeNetworkResponse(response, analysis);
    });
  }

  async analyzeCookiesOnPage(page, analysis, url) {
    const cookies = await page.cookies();
    
    for (const cookie of cookies) {
      const analyzedCookie = await this.analyzeCookie(cookie, url);
      analysis.addCookie(analyzedCookie);
    }
  }

  async analyzeCookie(cookie, foundOnUrl) {
    const cookieData = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : null,
      session: !cookie.expires,
      foundOnUrls: [foundOnUrl],
      size: (cookie.name + cookie.value).length
    };

    // Determinar si es first-party
    try {
      const urlObj = new URL(foundOnUrl);
      cookieData.isFirstParty = cookie.domain === urlObj.hostname || 
                               cookie.domain === `.${urlObj.hostname}`;
    } catch (e) {
      cookieData.isFirstParty = false;
    }

    // Clasificar cookie
    cookieData.category = this.categorizeCookie(cookie);
    
    // Detectar proveedor
    cookieData.provider = this.identifyProvider(cookie);
    
    // Analizar duración
    cookieData.duration = this.analyzeDuration(cookie);
    
    // Analizar contenido
    cookieData.containsPII = this.detectPII(cookie.value);
    cookieData.containsTrackingData = this.detectTrackingData(cookie.value);
    cookieData.encrypted = this.isEncrypted(cookie.value);
    
    // Determinar complejidad
    cookieData.complexity = this.determineComplexity(cookie.value);
    
    // Evaluar compliance
    cookieData.gdprCompliant = this.evaluateGDPRCompliance(cookieData);
    cookieData.ccpaCompliant = this.evaluateCCPACompliance(cookieData);

    return cookieData;
  }

  categorizeCookie(cookie) {
    for (const [category, patterns] of Object.entries(this.cookiePatterns)) {
      if (patterns.some(pattern => pattern.test(cookie.name))) {
        return category;
      }
    }
    
    // Análisis por dominio
    if (cookie.domain.includes('google')) return 'analytics';
    if (cookie.domain.includes('facebook')) return 'social';
    if (cookie.domain.includes('doubleclick')) return 'advertising';
    
    return 'other';
  }

  identifyProvider(cookie) {
    for (const [provider, config] of Object.entries(this.providerPatterns)) {
      if (config.cookies.some(pattern => pattern.test(cookie.name))) {
        return {
          name: provider,
          domain: config.domain,
          category: this.getProviderCategory(provider)
        };
      }
    }
    
    return {
      name: 'Propios',
      domain: cookie.domain,
      category: 'other'
    };
  }

  getProviderCategory(provider) {
    const categories = {
      'Google Analytics': 'analytics',
      'Facebook': 'social',
      'Google Ads': 'advertising',
      'Hotjar': 'analytics',
      'TikTok': 'social'
    };
    return categories[provider] || 'other';
  }

  analyzeDuration(cookie) {
    if (!cookie.expires) return 'session';
    
    const now = Date.now() / 1000;
    const duration = cookie.expires - now;
    
    if (duration < 86400) return 'session'; // < 1 día
    if (duration < 2592000) return 'persistent'; // < 30 días
    return 'long-term'; // > 30 días
  }

  detectPII(value) {
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{10,}\b/ // Possible phone number
    ];
    
    return piiPatterns.some(pattern => pattern.test(value));
  }

  detectTrackingData(value) {
    // Detectar IDs de tracking comunes
    const trackingPatterns = [
      /^GA\d+\.\d+\.\d+\.\d+$/, // Google Analytics
      /^[0-9a-f]{32}$/, // MD5 hash
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, // UUID
      /^\d{13,}$/ // Timestamp
    ];
    
    return trackingPatterns.some(pattern => pattern.test(value));
  }

  isEncrypted(value) {
    // Detectar valores encriptados/codificados
    const encryptionPatterns = [
      /^[A-Za-z0-9+/]+=*$/, // Base64
      /^[0-9a-fA-F]+$/, // Hex
      /^[A-Za-z0-9_-]{20,}$/ // Token-like
    ];
    
    return value.length > 20 && 
           encryptionPatterns.some(pattern => pattern.test(value));
  }

  determineComplexity(value) {
    if (value.length < 10) return 'simple';
    if (this.isEncrypted(value)) return 'encrypted';
    if (value.includes('|') || value.includes('&') || value.includes(';')) return 'complex';
    return 'encoded';
  }

  evaluateGDPRCompliance(cookieData) {
    // Cookies necesarias están exentas
    if (cookieData.category === 'necessary') return true;
    
    // Verificar atributos de seguridad
    const hasSecureAttributes = cookieData.secure && cookieData.sameSite;
    
    // Verificar duración razonable
    const reasonableDuration = cookieData.duration !== 'long-term';
    
    return hasSecureAttributes && reasonableDuration;
  }

  evaluateCCPACompliance(cookieData) {
    // Similar al GDPR pero con diferentes criterios
    return !cookieData.containsPII || cookieData.category === 'necessary';
  }

  async analyzeStorageOnPage(page, analysis, url) {
    try {
      const storageData = await page.evaluate(() => {
        const local = [];
        const session = [];
        
        // localStorage
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            local.push({ key, value, size: (key + value).length });
          }
        } catch (e) {}
        
        // sessionStorage
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            session.push({ key, value, size: (key + value).length });
          }
        } catch (e) {}
        
        return { local, session };
      });
      
      // Procesar localStorage
      storageData.local.forEach(item => {
        analysis.localStorage.push({
          key: item.key,
          value: item.value,
          size: item.size,
          containsPII: this.detectPII(item.value),
          purpose: this.inferStoragePurpose(item.key, item.value)
        });
      });
      
      // Procesar sessionStorage
      storageData.session.forEach(item => {
        analysis.sessionStorage.push({
          key: item.key,
          value: item.value,
          size: item.size,
          containsPII: this.detectPII(item.value),
          purpose: this.inferStoragePurpose(item.key, item.value)
        });
      });
      
    } catch (error) {
      logger.warn(`Error analyzing storage on ${url}:`, error.message);
    }
  }

  inferStoragePurpose(key, value) {
    const purposes = {
      'auth': /^(auth|token|session|login)/i,
      'preferences': /^(pref|setting|config|theme)/i,
      'analytics': /^(analytics|tracking|stats)/i,
      'cart': /^(cart|basket|shopping)/i
    };
    
    for (const [purpose, pattern] of Object.entries(purposes)) {
      if (pattern.test(key)) return purpose;
    }
    
    return 'other';
  }

  async analyzeScriptsOnPage(page, analysis, url) {
    try {
      const scripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(script => ({
          src: script.src,
          inline: !script.src,
          content: script.src ? null : script.textContent?.substring(0, 1000),
          type: script.type || 'text/javascript',
          async: script.async,
          defer: script.defer
        }));
      });
      
      scripts.forEach(script => {
        const analyzedScript = this.analyzeScript(script, url);
        
        // Verificar si ya existe el script
        const existingScript = analysis.scripts.find(s => 
          s.url === analyzedScript.url || 
          (s.type === 'inline' && analyzedScript.type === 'inline')
        );
        
        if (!existingScript) {
          analysis.scripts.push(analyzedScript);
        } else {
          // Añadir URL donde se encontró
          if (!existingScript.foundOnUrls.includes(url)) {
            existingScript.foundOnUrls.push(url);
          }
        }
      });
      
    } catch (error) {
      logger.warn(`Error analyzing scripts on ${url}:`, error.message);
    }
  }

  analyzeScript(script, foundOnUrl) {
    const scriptData = {
      url: script.src || 'inline',
      type: script.inline ? 'inline' : 'external',
      category: 'other',
      size: script.content ? script.content.length : 0,
      loadType: script.async ? 'async' : (script.defer ? 'defer' : 'sync'),
      foundOnUrls: [foundOnUrl],
      hasTracking: false,
      hasConsent: false
    };
    
    // Categorizar script
    if (script.src) {
      scriptData.category = this.categorizeScript(script.src);
      scriptData.provider = this.identifyScriptProvider(script.src);
    } else if (script.content) {
      scriptData.category = this.categorizeScriptByContent(script.content);
      scriptData.hasTracking = this.detectTrackingInScript(script.content);
      scriptData.hasConsent = this.detectConsentInScript(script.content);
    }
    
    return scriptData;
  }

  categorizeScript(src) {
    const patterns = {
      analytics: [/google-analytics/, /googletagmanager/, /hotjar/, /mixpanel/],
      advertising: [/doubleclick/, /googlesyndication/, /googleadservices/],
      social: [/facebook/, /twitter/, /linkedin/, /pinterest/],
      functionality: [/jquery/, /bootstrap/, /lodash/],
      security: [/recaptcha/, /cloudflare/]
    };
    
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (categoryPatterns.some(pattern => pattern.test(src))) {
        return category;
      }
    }
    
    return 'other';
  }

  identifyScriptProvider(src) {
    try {
      const url = new URL(src);
      const domain = url.hostname;
      
      const providers = {
        'google-analytics.com': 'Google Analytics',
        'googletagmanager.com': 'Google Tag Manager',
        'googlesyndication.com': 'Google Ads',
        'facebook.net': 'Facebook',
        'hotjar.com': 'Hotjar',
        'mixpanel.com': 'Mixpanel'
      };
      
      for (const [providerDomain, providerName] of Object.entries(providers)) {
        if (domain.includes(providerDomain)) {
          return { name: providerName, domain: providerDomain };
        }
      }
      
      return { name: 'Propios', domain };
    } catch (e) {
      return { name: 'Propios', domain: 'other' };
    }
  }

  categorizeScriptByContent(content) {
    const patterns = {
      analytics: [/analytics/, /tracking/, /gtag/, /_gaq/],
      advertising: [/doubleclick/, /googletag/, /advertisement/],
      social: [/facebook/, /twitter/, /linkedin/],
      functionality: [/jquery/, /function/, /document\.ready/]
    };
    
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (categoryPatterns.some(pattern => pattern.test(content))) {
        return category;
      }
    }
    
    return 'other';
  }

  detectTrackingInScript(content) {
    const trackingPatterns = [
      /track\(/i, /analytics/i, /pixel/i, /beacon/i,
      /user.*id/i, /session.*id/i, /visitor.*id/i
    ];
    
    return trackingPatterns.some(pattern => pattern.test(content));
  }

  detectConsentInScript(content) {
    const consentPatterns = [
      /consent/i, /cookie.*banner/i, /privacy/i, /gdpr/i,
      /onetrust/i, /cookiebot/i, /trustarc/i
    ];
    
    return consentPatterns.some(pattern => pattern.test(content));
  }

  async analyzeIframesOnPage(page, analysis, url) {
    try {
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          sandbox: iframe.sandbox ? Array.from(iframe.sandbox) : [],
          width: iframe.width,
          height: iframe.height
        }));
      });
      
      iframes.forEach(iframe => {
        if (iframe.src) {
          analysis.iframes.push({
            src: iframe.src,
            sandbox: iframe.sandbox,
            purpose: this.inferIframePurpose(iframe.src),
            provider: this.identifyIframeProvider(iframe.src),
            foundOnUrls: [url]
          });
        }
      });
      
    } catch (error) {
      logger.warn(`Error analyzing iframes on ${url}:`, error.message);
    }
  }

  inferIframePurpose(src) {
    const purposes = {
      'advertising': [/doubleclick/, /googlesyndication/, /ads/],
      'social': [/facebook/, /twitter/, /youtube/, /instagram/],
      'analytics': [/google-analytics/, /hotjar/],
      'payment': [/paypal/, /stripe/, /square/],
      'maps': [/maps\.google/, /openstreetmap/]
    };
    
    for (const [purpose, patterns] of Object.entries(purposes)) {
      if (patterns.some(pattern => pattern.test(src))) {
        return purpose;
      }
    }
    
    return 'other';
  }

  identifyIframeProvider(src) {
    try {
      const url = new URL(src);
      return url.hostname;
    } catch (e) {
      return 'other';
    }
  }

  async analyzeFormsOnPage(page, analysis, url) {
    try {
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
            name: field.name,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder
          }))
        }));
      });
      
      forms.forEach(form => {
        analysis.forms.push({
          action: form.action,
          method: form.method,
          fields: form.fields.map(field => ({
            ...field,
            containsPII: this.fieldContainsPII(field)
          })),
          foundOnUrl: url
        });
      });
      
    } catch (error) {
      logger.warn(`Error analyzing forms on ${url}:`, error.message);
    }
  }

  fieldContainsPII(field) {
    const piiFields = [
      /email/i, /mail/i, /phone/i, /tel/i, /name/i,
      /address/i, /ssn/i, /social/i, /birth/i, /age/i
    ];
    
    const fieldIdentifier = `${field.name} ${field.type} ${field.placeholder}`.toLowerCase();
    return piiFields.some(pattern => pattern.test(fieldIdentifier));
  }

  async detectConsentManagement(page, analysis, url) {
    try {
      const cmpData = await page.evaluate(() => {
        const detectedPlatforms = [];
        
        // Verificar variables globales comunes de CMP
        const globalVars = ['OneTrust', 'Cookiebot', 'TrustArc', '__tcfapi', '__cmp'];
        globalVars.forEach(varName => {
          if (window[varName]) {
            detectedPlatforms.push({ name: varName, detected: true });
          }
        });
        
        // Verificar elementos DOM
        const selectors = [
          '[id*="onetrust"]', '[class*="onetrust"]',
          '[id*="cookiebot"]', '[class*="cookiebot"]',
          '[id*="trustarc"]', '[class*="trustarc"]'
        ];
        
        selectors.forEach(selector => {
          if (document.querySelector(selector)) {
            detectedPlatforms.push({ 
              name: selector.match(/\*(.*?)\]/)[1], 
              detected: true 
            });
          }
        });
        
        // Verificar TCF API
        let tcfData = null;
        if (window.__tcfapi) {
          try {
            window.__tcfapi('getTCData', 2, (tcData, success) => {
              if (success) {
                tcfData = {
                  tcfPolicyVersion: tcData.tcfPolicyVersion,
                  gdprApplies: tcData.gdprApplies,
                  cmpId: tcData.cmpId,
                  cmpVersion: tcData.cmpVersion,
                  consentString: tcData.tcString
                };
              }
            });
          } catch (e) {}
        }
        
        return { detectedPlatforms, tcfData };
      });
      
      if (cmpData.detectedPlatforms.length > 0) {
        analysis.consentManagement.detected = true;
        analysis.consentManagement.platforms = cmpData.detectedPlatforms;
        
        if (cmpData.tcfData) {
          analysis.consentManagement.platforms[0].tcfCompliant = true;
          analysis.consentManagement.consentString = cmpData.tcfData.consentString;
        }
      }
      
    } catch (error) {
      logger.warn(`Error detecting consent management on ${url}:`, error.message);
    }
  }

  async detectTechnologies(page, analysis, url) {
    try {
      const technologies = await page.evaluate(() => {
        const detected = [];
        
        // Verificar frameworks de JS
        const frameworks = {
          'jQuery': () => typeof window.jQuery !== 'undefined',
          'React': () => typeof window.React !== 'undefined',
          'Vue': () => typeof window.Vue !== 'undefined',
          'Angular': () => typeof window.angular !== 'undefined',
          'Bootstrap': () => typeof window.bootstrap !== 'undefined'
        };
        
        Object.entries(frameworks).forEach(([name, detector]) => {
          if (detector()) {
            detected.push({ name, category: 'JavaScript Framework' });
          }
        });
        
        // Verificar analytics
        const analytics = {
          'Google Analytics': () => typeof window.gtag !== 'undefined' || typeof window.ga !== 'undefined',
          'Google Tag Manager': () => typeof window.dataLayer !== 'undefined',
          'Hotjar': () => typeof window.hj !== 'undefined',
          'Mixpanel': () => typeof window.mixpanel !== 'undefined'
        };
        
        Object.entries(analytics).forEach(([name, detector]) => {
          if (detector()) {
            detected.push({ name, category: 'Analytics' });
          }
        });
        
        return detected;
      });
      
      technologies.forEach(tech => {
        const existing = analysis.technologies.find(t => t.name === tech.name);
        if (!existing) {
          analysis.technologies.push({
            ...tech,
            confidence: 100,
            source: url
          });
        }
      });
      
    } catch (error) {
      logger.warn(`Error detecting technologies on ${url}:`, error.message);
    }
  }

  analyzeNetworkRequest(request, analysis) {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    
    // Detectar tracking requests
    const trackingPurpose = this.identifyTrackingPurpose(url);
    
    if (trackingPurpose) {
      analysis.networkRequests.push({
        url,
        method,
        type: request.resourceType(),
        initiator: request.frame() ? request.frame().url() : 'direct',
        requestHeaders: headers,
        trackingPurpose,
        timing: { start: Date.now() }
      });
    }
    
    // Detectar tracking pixels
    if (this.isTrackingPixel(url, request.resourceType())) {
      analysis.trackingPixels.push({
        url,
        type: 'pixel',
        provider: this.identifyPixelProvider(url),
        purpose: trackingPurpose || 'tracking'
      });
    }
  }

  analyzeNetworkResponse(response, analysis) {
    const request = response.request();
    const url = request.url();
    
    // Buscar el request correspondiente
    const networkRequest = analysis.networkRequests.find(r => r.url === url);
    if (networkRequest) {
      networkRequest.responseHeaders = response.headers();
      networkRequest.timing.end = Date.now();
      networkRequest.timing.duration = networkRequest.timing.end - networkRequest.timing.start;
      
      // Obtener tamaño de respuesta
      response.buffer().then(buffer => {
        networkRequest.size = buffer.length;
      }).catch(() => {
        // Ignorar errores de buffer
      });
    }
  }

  identifyTrackingPurpose(url) {
    const purposes = {
      'analytics': [/analytics/, /tracking/, /stats/, /metrics/],
      'advertising': [/ads/, /doubleclick/, /googlesyndication/, /advertisement/],
      'social': [/facebook\.com\/tr/, /twitter\.com/, /linkedin\.com/, /pinterest\.com/],
      'attribution': [/attribution/, /conversion/, /pixel/]
    };
    
    for (const [purpose, patterns] of Object.entries(purposes)) {
      if (patterns.some(pattern => pattern.test(url))) {
        return purpose;
      }
    }
    
    return null;
  }

  isTrackingPixel(url, resourceType) {
    return resourceType === 'image' && (
      url.includes('pixel') ||
      url.includes('track') ||
      url.includes('beacon') ||
      /\.(gif|png)\?/.test(url)
    );
  }

  identifyPixelProvider(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      const providers = {
        'facebook.com': 'Facebook',
        'google-analytics.com': 'Google Analytics',
        'doubleclick.net': 'Google Ads',
        'linkedin.com': 'LinkedIn',
        'pinterest.com': 'Pinterest'
      };
      
      for (const [domain, provider] of Object.entries(providers)) {
        if (hostname.includes(domain)) {
          return provider;
        }
      }
      
      return hostname;
    } catch (e) {
      return 'Propios';
    }
  }

  async processResults(analysis) {
    // Calcular estadísticas
    analysis.calculateStatistics();
    
    // Detectar cambios comparando con análisis anterior
    await this.detectChanges(analysis);
    
    // Evaluar riesgos
    this.evaluateRisks(analysis);
    
    await analysis.save();
  }

  async detectChanges(analysis) {
    const lastAnalysis = await CookieAnalysis.findOne({ 
      domainId: analysis.domainId, 
      status: 'completed' 
    }).sort({ endTime: -1 });
    
    if (!lastAnalysis) {
      // Primer análisis, todas las cookies son nuevas
      analysis.changes.newCookies = analysis.cookies.map(cookie => ({
        name: cookie.name,
        domain: cookie.domain,
        category: cookie.category
      }));
      return;
    }
    
    const currentCookies = new Map(analysis.cookies.map(c => [`${c.name}:${c.domain}`, c]));
    const lastCookies = new Map(lastAnalysis.cookies.map(c => [`${c.name}:${c.domain}`, c]));
    
    // Cookies nuevas
    for (const [key, cookie] of currentCookies) {
      if (!lastCookies.has(key)) {
        analysis.changes.newCookies.push({
          name: cookie.name,
          domain: cookie.domain,
          category: cookie.category
        });
      }
    }
    
    // Cookies eliminadas
    for (const [key, cookie] of lastCookies) {
      if (!currentCookies.has(key)) {
        analysis.changes.removedCookies.push({
          name: cookie.name,
          domain: cookie.domain,
          category: cookie.category
        });
      }
    }
    
    // Cookies modificadas
    for (const [key, currentCookie] of currentCookies) {
      const lastCookie = lastCookies.get(key);
      if (lastCookie) {
        const changes = this.compareCookies(lastCookie, currentCookie);
        if (changes.length > 0) {
          analysis.changes.modifiedCookies.push({
            name: currentCookie.name,
            domain: currentCookie.domain,
            changes
          });
        }
      }
    }
  }

  compareCookies(oldCookie, newCookie) {
    const changes = [];
    const fieldsToCompare = ['value', 'expires', 'secure', 'httpOnly', 'sameSite', 'category'];
    
    fieldsToCompare.forEach(field => {
      if (oldCookie[field] !== newCookie[field]) {
        changes.push({
          field,
          oldValue: oldCookie[field],
          newValue: newCookie[field]
        });
      }
    });
    
    return changes;
  }

  evaluateRisks(analysis) {
    let privacyRisk = 0;
    let complianceRisk = 0;
    let securityRisk = 0;
    
    // Evaluar riesgo de privacidad
    const piiCookies = analysis.cookies.filter(c => c.containsPII).length;
    const thirdPartyCookies = analysis.cookies.filter(c => !c.isFirstParty).length;
    const trackingCookies = analysis.cookies.filter(c => c.containsTrackingData).length;
    
    privacyRisk += piiCookies * 3;
    privacyRisk += thirdPartyCookies * 2;
    privacyRisk += trackingCookies * 2;
    
    // Evaluar riesgo de compliance
    const nonCompliantCookies = analysis.cookies.filter(c => !c.gdprCompliant).length;
    const advertisingCookies = analysis.cookies.filter(c => c.category === 'advertising').length;
    
    complianceRisk += nonCompliantCookies * 4;
    complianceRisk += advertisingCookies * 2;
    complianceRisk += analysis.consentManagement.detected ? 0 : 10;
    
    // Evaluar riesgo de seguridad
    const insecureCookies = analysis.cookies.filter(c => !c.secure).length;
    const noHttpOnlyCookies = analysis.cookies.filter(c => !c.httpOnly && c.category === 'necessary').length;
    const noSamSiteCookies = analysis.cookies.filter(c => !c.sameSite).length;
    
    securityRisk += insecureCookies * 3;
    securityRisk += noHttpOnlyCookies * 4;
    securityRisk += noSamSiteCookies * 2;
    
    // Asignar niveles de riesgo
    analysis.statistics.riskAssessment = {
      privacyRisk: this.getRiskLevel(privacyRisk, [5, 15, 30]),
      complianceRisk: this.getRiskLevel(complianceRisk, [5, 20, 40]),
      securityRisk: this.getRiskLevel(securityRisk, [5, 15, 25])
    };
  }

  getRiskLevel(score, thresholds) {
    if (score <= thresholds[0]) return 'low';
    if (score <= thresholds[1]) return 'medium';
    if (score <= thresholds[2]) return 'high';
    return 'critical';
  }

  async generateRecommendations(analysis) {
    const recommendations = [];
    
    // Recomendaciones de seguridad
    const insecureCookies = analysis.cookies.filter(c => !c.secure);
    if (insecureCookies.length > 0) {
      recommendations.push({
        type: 'security',
        severity: 'warning',
        title: 'Cookies inseguras detectadas',
        description: `${insecureCookies.length} cookies no tienen el atributo Secure`,
        action: 'Configurar todas las cookies con el atributo Secure',
        affectedItems: insecureCookies.map(c => c.name),
        estimatedImpact: 'Mejora la seguridad contra ataques man-in-the-middle'
      });
    }
    
    // Recomendaciones de compliance
    if (!analysis.consentManagement.detected) {
      recommendations.push({
        type: 'compliance',
        severity: 'error',
        title: 'No se detectó gestión de consentimiento',
        description: 'No se encontró una plataforma de gestión de consentimiento',
        action: 'Implementar una solución de gestión de consentimiento (CMP)',
        affectedItems: ['Todo el sitio web'],
        estimatedImpact: 'Cumplimiento con GDPR y otras regulaciones de privacidad'
      });
    }
    
    // Recomendaciones de privacidad
    const piiCookies = analysis.cookies.filter(c => c.containsPII);
    if (piiCookies.length > 0) {
      recommendations.push({
        type: 'privacy',
        severity: 'warning',
        title: 'Cookies con información personal detectadas',
        description: `${piiCookies.length} cookies contienen posible información personal`,
        action: 'Revisar y minimizar la información personal en cookies',
        affectedItems: piiCookies.map(c => c.name),
        estimatedImpact: 'Reducción del riesgo de privacidad'
      });
    }
    
    // Recomendaciones de rendimiento
    const largeCookies = analysis.cookies.filter(c => c.size > 1000);
    if (largeCookies.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'info',
        title: 'Cookies de gran tamaño detectadas',
        description: `${largeCookies.length} cookies superan 1KB de tamaño`,
        action: 'Optimizar el tamaño de las cookies o usar almacenamiento local',
        affectedItems: largeCookies.map(c => c.name),
        estimatedImpact: 'Mejora del rendimiento de carga de páginas'
      });
    }
    
    analysis.recommendations = recommendations;
  }

  /**
   * Análisis inteligente con clasificación automática y detección de vendors
   */
  async performIntelligentAnalysis(domainId, clientId, domainUrl, analysisId, config = {}) {
    logger.info(`🧠 Iniciando análisis inteligente para: ${domainUrl}`);
    
    try {
      // Crear instancia del analizador inteligente
      const intelligentAnalyzer = new IntelligentCookieAnalyzer();
      
      // Realizar el análisis
      const analysisResult = await intelligentAnalyzer.analyzeDomain(domainUrl, config);
      
      // Calcular métricas de compliance
      const complianceRate = this.calculateComplianceRate(analysisResult.cookies);
      analysisResult.summary.compliance.complianceRate = complianceRate;
      
      // Generar recomendaciones específicas
      const recommendations = this.generateIntelligentRecommendations(analysisResult);
      
      // Preparar datos para guardar en BD
      const resultData = {
        analysisId,
        domainId,
        clientId,
        domain: analysisResult.domain,
        url: domainUrl,
        summary: {
          ...analysisResult.summary,
          avgConfidence: this.calculateAverageConfidence(analysisResult.cookies),
          thirdPartyCookies: analysisResult.cookies.filter(c => c.domainType === 'third-party' || (c.features && c.features.domainType === 'third-party')).length,
          sessionCookies: analysisResult.cookies.filter(c => c.duration === -1 || (c.features && c.features.duration === -1)).length,
          persistentCookies: analysisResult.cookies.filter(c => c.duration > 0 || (c.features && c.features.duration > 0)).length,
          topVendors: this.getTopVendors(analysisResult.cookies),
          criticalIssues: this.getCriticalIssues(analysisResult.cookies)
        },
        cookies: analysisResult.cookies.map(cookie => ({
          features: cookie,
          classification: cookie.classification,
          vendor: cookie.vendor,
          compliance: {
            ...cookie.compliance,
            complianceScore: this.calculateCookieComplianceScore(cookie),
            recommendations: this.getCookieRecommendations(cookie)
          },
          analysisTimestamp: new Date(),
          classificationChanged: false, // Se calculará comparando con análisis previo
          lastUpdated: new Date()
        })),
        metadata: analysisResult.metadata,
        status: 'completed'
      };
      
      // Guardar en base de datos
      const savedResult = await IntelligentCookieResult.create(resultData);
      
      // Cerrar analizador
      await intelligentAnalyzer.close();
      
      logger.info(`✅ Análisis inteligente completado. Guardado con ID: ${savedResult._id}`);
      
      return {
        resultId: savedResult._id,
        summary: savedResult.summary,
        totalCookies: savedResult.cookies.length,
        complianceRate: complianceRate,
        riskLevel: savedResult.summary.riskAssessment,
        recommendations: recommendations.slice(0, 5) // Top 5 recomendaciones
      };
      
    } catch (error) {
      logger.error(`❌ Error en análisis inteligente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula la tasa de cumplimiento general
   */
  calculateComplianceRate(cookies) {
    if (cookies.length === 0) return 100;
    
    const compliantCookies = cookies.filter(cookie => cookie.compliance.isCompliant).length;
    return Math.round((compliantCookies / cookies.length) * 100);
  }

  /**
   * Calcula la confianza promedio de las clasificaciones
   */
  calculateAverageConfidence(cookies) {
    if (cookies.length === 0) return 0;
    
    const totalConfidence = cookies.reduce((sum, cookie) => sum + cookie.classification.confidence, 0);
    return totalConfidence / cookies.length;
  }

  /**
   * Obtiene los vendors más frecuentes
   */
  getTopVendors(cookies) {
    const vendorCounts = {};
    const vendorPurposes = {};
    
    cookies.forEach(cookie => {
      const vendorName = cookie.vendor.name;
      if (vendorName !== 'Unknown Vendor') {
        vendorCounts[vendorName] = (vendorCounts[vendorName] || 0) + 1;
        vendorPurposes[vendorName] = cookie.vendor.purposes;
      }
    });
    
    return Object.entries(vendorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        purposes: vendorPurposes[name] || []
      }));
  }

  /**
   * Identifica problemas críticos
   */
  getCriticalIssues(cookies) {
    const issues = {};
    
    cookies.forEach(cookie => {
      cookie.compliance.violations.forEach(violation => {
        const key = violation.type;
        if (!issues[key]) {
          issues[key] = {
            type: key,
            count: 0,
            description: violation.message
          };
        }
        issues[key].count++;
      });
    });
    
    return Object.values(issues)
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcula puntuación de compliance por cookie
   */
  calculateCookieComplianceScore(cookie) {
    let score = 100;
    
    // Penalizar violaciones
    cookie.compliance.violations.forEach(violation => {
      switch (violation.severity) {
        case 'high': score -= 30; break;
        case 'medium': score -= 15; break;
        case 'low': score -= 5; break;
      }
    });
    
    // Penalizar warnings
    cookie.compliance.warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Genera recomendaciones específicas por cookie
   */
  getCookieRecommendations(cookie) {
    const recommendations = [];
    
    cookie.compliance.violations.forEach(violation => {
      recommendations.push({
        priority: violation.severity === 'high' ? 'critical' : 'high',
        action: `Corregir ${violation.type}`,
        description: violation.message,
        impact: 'Cumplimiento GDPR'
      });
    });
    
    cookie.compliance.warnings.forEach(warning => {
      recommendations.push({
        priority: 'medium',
        action: `Revisar ${warning.type}`,
        description: warning.message,
        impact: 'Mejora de compliance'
      });
    });
    
    return recommendations;
  }

  /**
   * Genera recomendaciones generales del análisis
   */
  generateIntelligentRecommendations(analysisResult) {
    const recommendations = [];
    
    // Recomendaciones basadas en el resumen
    const summary = analysisResult.summary;
    
    if (summary.compliance.violations > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Corregir violaciones GDPR',
        description: `Detectadas ${summary.compliance.violations} violaciones de cumplimiento`,
        action: 'Revisar cookies con violaciones y aplicar correcciones',
        impact: 'Evitar sanciones regulatorias'
      });
    }
    
    if (summary.byPurpose.unknown > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Clasificar cookies sin propósito',
        description: `${summary.byPurpose.unknown} cookies necesitan clasificación manual`,
        action: 'Definir propósito para cookies no clasificadas',
        impact: 'Transparencia para usuarios'
      });
    }
    
    if (summary.byPurpose.advertising > summary.byPurpose.necessary) {
      recommendations.push({
        priority: 'medium',
        title: 'Optimizar uso de cookies publicitarias',
        description: 'Alto número de cookies publicitarias detectadas',
        action: 'Revisar necesidad de todas las cookies publicitarias',
        impact: 'Mejorar experiencia de usuario'
      });
    }
    
    const unknownVendors = Object.entries(summary.byVendor)
      .filter(([name]) => name === 'Unknown Vendor')
      .reduce((sum, [, count]) => sum + count, 0);
    
    if (unknownVendors > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Identificar vendors desconocidos',
        description: `${unknownVendors} cookies de vendors no identificados`,
        action: 'Documentar y registrar vendors en uso',
        impact: 'Transparencia y control de terceros'
      });
    }
    
    return recommendations;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new AdvancedCookieAnalyzer();