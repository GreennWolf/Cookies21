const puppeteer = require('puppeteer');
const { URL } = require('url');
const logger = require('../utils/logger');
const CookieAnalysis = require('../models/CookieAnalysis');
const fs = require('fs').promises;
const path = require('path');

/**
 * Sistema Inteligente de Análisis de Cookies
 * Implementa clasificación automática, detección de vendors y cumplimiento GDPR
 */
class IntelligentCookieAnalyzer {
  constructor() {
    this.browser = null;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.gvlCache = null; // Cache para Global Vendor List
    this.initializeClassificationSystem();
  }

  /**
   * Inicializa el sistema de clasificación con patrones avanzados
   */
  initializeClassificationSystem() {
    // Patrones de clasificación por propósito (basado en CookieBlock research)
    this.purposePatterns = {
      necessary: {
        patterns: [
          // Autenticación y sesión
          /^(csrf|session|auth|secure|__Secure-|__Host-)/i,
          /_csrf$/i, /^XSRF-TOKEN$/i, /^laravel_session$/i,
          /^PHPSESSID$/i, /^JSESSIONID$/i, /^AWSALB/i,
          // Carrito de compra
          /^(cart|basket|checkout|order)/i,
          // Preferencias de cookies
          /^(cookieconsent|gdpr|privacy)/i,
          // Balanceadores de carga
          /^lb-/i, /^sticky/i
        ],
        domains: ['localhost', 'same-origin'],
        duration: { max: 86400 }, // Máximo 24h para sesión
        weight: 1.0,
        description: 'Cookies técnicamente necesarias para el funcionamiento del sitio'
      },

      functional: {
        patterns: [
          // Preferencias de usuario
          /^(prefs|settings|language|lang|timezone|display|theme)/i,
          /_preferences$/i, /^ui-/i, /^remember_/i,
          // Personalización
          /^(user_|profile_|custom_)/i,
          // Formularios
          /^form_/i, /^input_/i,
          // Chat y soporte
          /^(chat|support|help)/i
        ],
        duration: { min: 86400, max: 31536000 }, // 1 día a 1 año
        weight: 0.8,
        description: 'Cookies que mejoran la funcionalidad y personalización'
      },

      analytics: {
        patterns: [
          // Google Analytics
          /^(_ga|_gid|_gat|__utm|_dc_gtm_)/i,
          // Otras plataformas analytics
          /^_pk_/i, /^amplitude/i, /^mp_/i, /^mixpanel/i,
          /^_hjid|_hjAbsoluteSessionInProgress/i,
          // Adobe Analytics
          /^s_/i, /^AMCV_/i,
          // Hotjar
          /^_hjSessionUser_/i, /^_hjFirstSeen/i,
          // Matomo
          /^_pk_id/i, /^_pk_ses/i
        ],
        domains: [
          'google-analytics.com', 'googletagmanager.com',
          'hotjar.com', 'matomo.org', 'adobe.com'
        ],
        weight: 0.6,
        description: 'Cookies para análisis estadístico y mejora del rendimiento'
      },

      advertising: {
        patterns: [
          // Facebook
          /^(_fbp|_fbc|fr)/i,
          // Google Ads
          /^(_gcl|_gac)/i, /^ide|test_cookie/i,
          // Otros
          /^pinterest_/i, /^_ttp/i, /^doubleclick/i,
          /^adroll/i, /^_uuid/i, /^dpm/i,
          // RTB y DSP
          /^(rtb|dsp|ssp|bid)/i,
          // Tracking pixels
          /^(px|pixel|track)/i
        ],
        domains: [
          'doubleclick.net', 'facebook.com', 'twitter.com',
          'linkedin.com', 'pinterest.com', 'tiktok.com'
        ],
        weight: 0.4,
        description: 'Cookies para publicidad dirigida y remarketing'
      },

      personalization: {
        patterns: [
          // Contenido personalizado
          /^(content_|recommendation|suggest)/i,
          // A/B Testing
          /^(experiment|test_|variant)/i,
          // Machine Learning
          /^(ml_|ai_|model_)/i
        ],
        weight: 0.7,
        description: 'Cookies para personalización de contenido'
      }
    };

    // Patrones de vendors conocidos (IAB TCF y otros)
    this.vendorPatterns = {
      'Google Analytics (ID: 755)': {
        cookies: [/_ga/, /_gid/, /_gat/, /__utm/, /_dc_gtm_/],
        scripts: [/google-analytics\.com/, /googletagmanager\.com/],
        domains: ['google-analytics.com', 'googletagmanager.com'],
        iabId: 755,
        purposes: ['analytics', 'measurement'],
        description: 'Servicio de análisis web de Google'
      },
      'Facebook (ID: 284)': {
        cookies: [/_fbp/, /_fbc/, /^fr$/, /^c_user$/],
        scripts: [/connect\.facebook\.net/, /facebook\.com\/tr/],
        domains: ['facebook.com', 'facebook.net'],
        iabId: 284,
        purposes: ['advertising', 'social'],
        description: 'Plataforma publicitaria de Meta'
      },
      'Google Ads (ID: 755)': {
        cookies: [/_gcl/, /_gac/, /ide/, /test_cookie/],
        scripts: [/googleadservices\.com/, /doubleclick\.net/],
        domains: ['googleadservices.com', 'doubleclick.net'],
        iabId: 755,
        purposes: ['advertising'],
        description: 'Plataforma publicitaria de Google'
      },
      'Hotjar (ID: 1007)': {
        cookies: [/_hjid/, /_hjSessionUser_/, /_hjAbsoluteSessionInProgress/],
        scripts: [/hotjar\.com/],
        domains: ['hotjar.com'],
        iabId: 1007,
        purposes: ['analytics', 'heatmaps'],
        description: 'Análisis de comportamiento de usuario'
      },
      'LinkedIn (ID: 281)': {
        cookies: [/^li_/, /^lidc/, /^bscookie/],
        scripts: [/linkedin\.com/, /snap\.licdn\.com/],
        domains: ['linkedin.com'],
        iabId: 281,
        purposes: ['advertising', 'social'],
        description: 'Red social profesional y publicidad'
      },
      'Twitter/X (ID: 263)': {
        cookies: [/^_twitter_sess/, /^auth_token/, /^twid/],
        scripts: [/twitter\.com/, /x\.com/],
        domains: ['twitter.com', 'x.com'],
        iabId: 263,
        purposes: ['advertising', 'social'],
        description: 'Red social y plataforma publicitaria'
      },
      'TikTok (ID: 1025)': {
        cookies: [/_ttp/, /_tt_enable_cookie/, /ttwid/],
        scripts: [/tiktok\.com/, /bytedance\.com/],
        domains: ['tiktok.com', 'bytedance.com'],
        iabId: 1025,
        purposes: ['advertising', 'social'],
        description: 'Plataforma de vídeo y publicidad'
      },
      'Pinterest (ID: 133)': {
        cookies: [/^_pinterest_/, /^_pin_unauth/, /^_routing_id/],
        scripts: [/pinterest\.com/],
        domains: ['pinterest.com'],
        iabId: 133,
        purposes: ['advertising', 'social'],
        description: 'Plataforma visual y publicidad'
      },
      'Amazon (ID: 793)': {
        cookies: [/^aws/, /^amazon/, /^amzn/],
        scripts: [/amazon\.com/, /cloudfront\.net/],
        domains: ['amazon.com', 'amazonaws.com'],
        iabId: 793,
        purposes: ['advertising', 'ecommerce'],
        description: 'Comercio electrónico y servicios cloud'
      },
      'Microsoft (ID: 355)': {
        cookies: [/^MS/, /^Microsoft/, /^_ms/],
        scripts: [/microsoft\.com/, /bing\.com/],
        domains: ['microsoft.com', 'bing.com'],
        iabId: 355,
        purposes: ['advertising', 'analytics'],
        description: 'Servicios Microsoft y Bing Ads'
      }
    };

    // Características para análisis ML-style
    this.analysisFeatures = [
      'nameLength', 'nameEntropy', 'valueLength', 'valueEntropy',
      'domainType', 'duration', 'httpOnly', 'secure', 'sameSite',
      'hasSpecialChars', 'isBase64', 'isUUID', 'isNumeric'
    ];
  }

  /**
   * Analiza una cookie individual y extrae características
   */
  extractCookieFeatures(cookie) {
    // Validaciones iniciales
    if (!cookie || !cookie.name) {
      logger.warn('Cookie inválida recibida para análisis');
      return null;
    }

    const safeName = cookie.name || '';
    const safeValue = cookie.value || '';
    const safeDomain = cookie.domain || '';

    const features = {
      name: safeName,
      value: safeValue,
      domain: safeDomain,
      path: cookie.path || '/',
      expires: cookie.expires || null,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || 'Lax',
      
      // Características computadas
      nameLength: safeName.length,
      nameEntropy: this.calculateEntropy(safeName),
      valueLength: safeValue.length,
      valueEntropy: this.calculateEntropy(safeValue),
      domainType: this.getDomainType(safeDomain),
      duration: this.calculateDuration(cookie.expires),
      hasSpecialChars: /[^a-zA-Z0-9_-]/.test(safeName),
      isBase64: this.isBase64(safeValue),
      isUUID: this.isUUID(safeValue),
      isNumeric: /^\d+$/.test(safeValue),
      
      // Timestamps
      createdAt: new Date(),
      lastSeen: new Date()
    };

    return features;
  }

  /**
   * Clasifica una cookie por propósito usando algoritmo de scoring
   */
  classifyPurpose(cookieFeatures) {
    // Validación inicial
    if (!cookieFeatures || !cookieFeatures.name) {
      logger.warn('Features de cookie inválidas para clasificación');
      return {
        purpose: 'unknown',
        confidence: 0,
        scores: {},
        reason: 'Invalid cookie features'
      };
    }

    const scores = {};
    let maxScore = 0;
    let predictedPurpose = 'unknown';
    let confidence = 0;

    // Calcular scores para cada propósito
    for (const [purpose, config] of Object.entries(this.purposePatterns)) {
      let score = 0;

      // Score por patrones de nombre
      for (const pattern of config.patterns) {
        if (pattern.test(cookieFeatures.name)) {
          score += config.weight;
          break;
        }
      }

      // Score por dominio
      if (config.domains && cookieFeatures.domain) {
        for (const domain of config.domains) {
          if (cookieFeatures.domain.includes(domain) || domain === 'same-origin') {
            score += 0.3;
            break;
          }
        }
      }

      // Score por duración
      if (config.duration && typeof cookieFeatures.duration === 'number') {
        const duration = cookieFeatures.duration;
        if (duration >= 0) {
          if (config.duration.min && duration >= config.duration.min) score += 0.2;
          if (config.duration.max && duration <= config.duration.max) score += 0.2;
        }
      }

      // Bonificaciones por características específicas
      if (purpose === 'necessary') {
        if (cookieFeatures.httpOnly) score += 0.3;
        if (cookieFeatures.secure) score += 0.2;
        if (cookieFeatures.domainType && cookieFeatures.domainType === 'first-party') score += 0.4;
      }

      if (purpose === 'advertising') {
        if (cookieFeatures.domainType && cookieFeatures.domainType === 'third-party') score += 0.4;
        if (typeof cookieFeatures.duration === 'number' && cookieFeatures.duration > 86400) score += 0.3; // Más de 1 día
      }

      scores[purpose] = score;

      if (score > maxScore) {
        maxScore = score;
        predictedPurpose = purpose;
      }
    }

    // Calcular confianza basada en la diferencia entre el mejor y segundo mejor score
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    if (sortedScores.length > 1) {
      confidence = (sortedScores[0] - sortedScores[1]) / sortedScores[0];
    } else {
      confidence = sortedScores[0] > 0 ? 1 : 0;
    }

    return {
      purpose: predictedPurpose,
      confidence: Math.min(confidence, 1),
      scores: scores,
      isHighConfidence: confidence > 0.3 && maxScore > 0.5
    };
  }

  /**
   * Detecta el vendor de una cookie
   */
  detectVendor(cookieFeatures, domainScripts = []) {
    // Validación inicial
    if (!cookieFeatures || !cookieFeatures.name) {
      return {
        name: 'Unknown Vendor',
        iabId: null,
        purposes: ['unknown'],
        description: 'Datos insuficientes para detección',
        confidence: 0,
        matches: []
      };
    }

    for (const [vendorName, vendorConfig] of Object.entries(this.vendorPatterns)) {
      let score = 0;
      let matches = [];

      // Verificar patrones de cookies
      if (vendorConfig.cookies && Array.isArray(vendorConfig.cookies)) {
        for (const pattern of vendorConfig.cookies) {
          if (pattern.test(cookieFeatures.name)) {
            score += 1;
            matches.push(`cookie_pattern:${pattern}`);
          }
        }
      }

      // Verificar dominio
      if (vendorConfig.domains && Array.isArray(vendorConfig.domains) && cookieFeatures.domain) {
        for (const domain of vendorConfig.domains) {
          if (cookieFeatures.domain.includes(domain)) {
            score += 0.8;
            matches.push(`domain:${domain}`);
          }
        }
      }

      // Verificar scripts en la página
      if (vendorConfig.scripts && Array.isArray(vendorConfig.scripts) && Array.isArray(domainScripts)) {
        for (const scriptPattern of vendorConfig.scripts) {
          if (domainScripts.some(script => script && scriptPattern.test(script))) {
            score += 0.6;
            matches.push(`script:${scriptPattern}`);
          }
        }
      }

      if (score > 0.5) {
        return {
          name: vendorName,
          iabId: vendorConfig.iabId,
          purposes: vendorConfig.purposes,
          description: vendorConfig.description,
          confidence: Math.min(score / 2, 1),
          matches: matches
        };
      }
    }

    return {
      name: 'Unknown Vendor',
      iabId: null,
      purposes: ['unknown'],
      description: 'Vendor no identificado',
      confidence: 0,
      matches: []
    };
  }

  /**
   * Verifica cumplimiento GDPR
   */
  checkGDPRCompliance(cookieFeatures, classification, vendor) {
    const violations = [];
    const warnings = [];

    // Validaciones iniciales
    if (!cookieFeatures || !classification || !vendor) {
      return {
        needsConsent: true,
        isCompliant: false,
        violations: [{
          type: 'invalid_data',
          message: 'Datos insuficientes para análisis de cumplimiento',
          severity: 'high'
        }],
        warnings: [],
        riskLevel: 'high'
      };
    }

    // Verificar si necesita consentimiento
    const needsConsent = !['necessary'].includes(classification.purpose);

    if (needsConsent) {
      // Cookies de larga duración
      if (typeof cookieFeatures.duration === 'number' && cookieFeatures.duration > 31536000) { // > 1 año
        violations.push({
          type: 'excessive_duration',
          message: `Cookie con duración excesiva: ${Math.round(cookieFeatures.duration / 86400)} días`,
          severity: 'high'
        });
      }

      // Cookies de terceros sin propósito claro
      if (cookieFeatures.domainType && cookieFeatures.domainType === 'third-party' && typeof classification.confidence === 'number' && classification.confidence < 0.3) {
        warnings.push({
          type: 'unclear_purpose',
          message: 'Cookie de tercero con propósito poco claro',
          severity: 'medium'
        });
      }

      // Vendors no identificados
      if (vendor.name === 'Unknown Vendor' && cookieFeatures.domainType && cookieFeatures.domainType === 'third-party') {
        warnings.push({
          type: 'unknown_vendor',
          message: 'Vendor no identificado en lista oficial',
          severity: 'medium'
        });
      }
    }

    // Verificar flags de seguridad para cookies necesarias
    if (classification.purpose === 'necessary') {
      if (!cookieFeatures.httpOnly && cookieFeatures.name && cookieFeatures.name.includes('session')) {
        violations.push({
          type: 'insecure_session',
          message: 'Cookie de sesión sin flag HttpOnly',
          severity: 'high'
        });
      }

      if (!cookieFeatures.secure && cookieFeatures.domain && cookieFeatures.domain !== 'localhost') {
        warnings.push({
          type: 'insecure_transmission',
          message: 'Cookie sin flag Secure en producción',
          severity: 'medium'
        });
      }
    }

    return {
      needsConsent,
      isCompliant: violations.length === 0,
      violations,
      warnings,
      riskLevel: violations.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Funciones auxiliares para análisis de características
   */
  calculateEntropy(str) {
    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    for (let char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  getDomainType(cookieDomain) {
    // Validación inicial
    if (!cookieDomain || typeof cookieDomain !== 'string') {
      return 'unknown';
    }

    const domain = cookieDomain.toLowerCase().trim();
    
    // Dominios conocidos de terceros
    const thirdPartyDomains = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
      'facebook.com', 'connect.facebook.net', 'hotjar.com', 'matomo.org',
      'adobe.com', 'twitter.com', 'linkedin.com', 'pinterest.com',
      'tiktok.com', 'bing.com', 'amazon-adsystem.com'
    ];

    // Si el dominio empieza con punto, es típicamente third-party
    if (domain.startsWith('.')) {
      return 'third-party';
    }

    // Verificar contra lista de dominios conocidos de terceros
    for (const thirdPartyDomain of thirdPartyDomains) {
      if (domain.includes(thirdPartyDomain)) {
        return 'third-party';
      }
    }

    // Si es localhost o IP local, considerarlo first-party
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || domain.includes('::1')) {
      return 'first-party';
    }

    // Por defecto, asumir first-party
    return 'first-party';
  }

  calculateDuration(expires) {
    if (!expires || expires === -1) return -1; // Session cookie
    const now = new Date().getTime();
    const expiryTime = new Date(expires).getTime();
    return Math.max(0, (expiryTime - now) / 1000); // Segundos hasta expiración
  }

  isBase64(str) {
    try {
      return btoa(atob(str)) === str && str.length > 10;
    } catch (err) {
      return false;
    }
  }

  isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Analiza todas las cookies de un dominio
   */
  async analyzeDomain(domain, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 Iniciando análisis inteligente de cookies para: ${domain}`);
      
      // Configurar navegador
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      }

      const page = await this.browser.newPage();
      await page.setUserAgent(this.userAgent);

      // Habilitar interceptación de requests para detectar todas las cookies
      await page.setCookie(); // Limpiar cookies existentes
      
      const allCookies = new Map();
      const detectedScripts = new Set();
      
      // Interceptar respuestas para capturar cookies de terceros
      page.on('response', response => {
        try {
          const headers = response.headers();
          const setCookieHeaders = headers['set-cookie'];
          if (setCookieHeaders) {
            const url = new URL(response.url());
            logger.debug(`🍪 Cookies detectadas desde: ${url.hostname}`);
          }
          
          // Detectar scripts
          if (response.url().includes('.js')) {
            detectedScripts.add(response.url());
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      });

      // Configurar página para capturar todas las cookies
      await page.setRequestInterception(true);
      
      // Array para almacenar todas las URLs visitadas
      const visitedUrls = new Set();
      
      page.on('request', request => {
        visitedUrls.add(request.url());
        request.continue();
      });

      // Navegar al dominio
      const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      logger.info(`🌐 Navegando a: ${fullUrl}`);
      
      try {
        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (navigationError) {
        // Si falla con https, intentar con http
        if (fullUrl.startsWith('https://')) {
          const httpUrl = fullUrl.replace('https://', 'http://');
          logger.info(`🔄 Reintentando con HTTP: ${httpUrl}`);
          await page.goto(httpUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        } else {
          throw navigationError;
        }
      }
      
      // Intentar aceptar cookies para ver todas las cookies posibles
      try {
        // Buscar y clickear botones comunes de aceptar cookies
        const acceptSelectors = [
          'button[id*="accept"]', 'button[class*="accept"]',
          'button[id*="agree"]', 'button[class*="agree"]',
          'button[id*="consent"]', 'button[class*="consent"]',
          'a[id*="accept"]', 'a[class*="accept"]',
          '.cookie-consent-accept', '#cookie-accept',
          'button:has-text("Accept")', 'button:has-text("Aceptar")',
          'button:has-text("OK")', 'button:has-text("Agree")'
        ];
        
        for (const selector of acceptSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              logger.debug(`✅ Click en botón de cookies: ${selector}`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              break;
            }
          } catch (e) {
            // Continuar con el siguiente selector
          }
        }
      } catch (e) {
        logger.debug('No se encontró banner de cookies para aceptar');
      }
      
      // Esperar un poco para que se carguen scripts dinámicos y se establezcan cookies
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Obtener TODAS las cookies (incluyendo de terceros)
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');
      await client.send('Runtime.enable');
      
      // Método 1: Obtener cookies del navegador
      logger.info(`🔍 Obteniendo cookies con CDP...`);
      const browserCookies = await client.send('Network.getAllCookies');
      const cdpCookies = browserCookies.cookies || [];
      logger.info(`📊 CDP encontró ${cdpCookies.length} cookies`);
      
      // Método 2: Obtener cookies con page.cookies()
      const pageCookies = await page.cookies();
      logger.info(`📊 page.cookies() encontró ${pageCookies.length} cookies`);
      
      // Método 3: Ejecutar JavaScript para obtener cookies
      const jsCookies = await page.evaluate(() => {
        const cookies = [];
        if (document.cookie) {
          document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name) {
              cookies.push({
                name: name.trim(),
                value: value ? value.trim() : '',
                domain: window.location.hostname,
                path: '/',
                httpOnly: false,
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax'
              });
            }
          });
        }
        return cookies;
      });
      logger.info(`📊 JavaScript encontró ${jsCookies.length} cookies`);
      
      // Método 4: Obtener localStorage y sessionStorage
      const storageData = await page.evaluate(() => {
        const data = {
          localStorage: {},
          sessionStorage: {}
        };
        
        // LocalStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data.localStorage[key] = localStorage.getItem(key);
        }
        
        // SessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data.sessionStorage[key] = sessionStorage.getItem(key);
        }
        
        return data;
      });
      
      logger.info(`📊 LocalStorage items: ${Object.keys(storageData.localStorage).length}`);
      logger.info(`📊 SessionStorage items: ${Object.keys(storageData.sessionStorage).length}`);
      
      // Combinar todas las cookies únicas
      const allCookiesMap = new Map();
      
      // Agregar cookies de CDP
      cdpCookies.forEach(cookie => {
        const key = `${cookie.name}_${cookie.domain}`;
        allCookiesMap.set(key, cookie);
      });
      
      // Agregar cookies de page.cookies()
      pageCookies.forEach(cookie => {
        const key = `${cookie.name}_${cookie.domain}`;
        if (!allCookiesMap.has(key)) {
          allCookiesMap.set(key, cookie);
        }
      });
      
      // Agregar cookies de JavaScript
      jsCookies.forEach(cookie => {
        const key = `${cookie.name}_${cookie.domain}`;
        if (!allCookiesMap.has(key)) {
          allCookiesMap.set(key, cookie);
        }
      });
      
      const cookies = Array.from(allCookiesMap.values());
      logger.info(`📊 Total de cookies únicas encontradas: ${cookies.length}`);
      
      // Extraer scripts de la página
      const scripts = await page.evaluate(() => {
        return Array.from(document.scripts).map(script => script.src).filter(src => src);
      });
      
      // Agregar scripts detectados
      scripts.push(...Array.from(detectedScripts));

      // Procesar cada cookie
      const analyzedCookies = [];
      logger.info(`🔄 Iniciando procesamiento de ${cookies.length} cookies...`);
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        try {
          logger.info(`🔍 [${i+1}/${cookies.length}] Procesando cookie: ${cookie?.name || 'sin nombre'} - Dominio: ${cookie?.domain || 'sin dominio'}`);
          const features = this.extractCookieFeatures(cookie);
          
          // Saltar cookies inválidas
          if (!features) {
            logger.warn(`Cookie inválida saltada: ${cookie?.name || 'sin nombre'}`);
            continue;
          }

          logger.debug(`✅ Features extraídas para ${features.name}: domainType=${features.domainType}`);
          
          let classification;
          try {
            classification = this.classifyPurpose(features);
            logger.debug(`✅ Clasificación para ${features.name}: ${classification.purpose}`);
          } catch (classError) {
            logger.error(`❌ Error en clasificación para ${features.name}: ${classError.message}`);
            throw classError;
          }
          
          let vendor;
          try {
            vendor = this.detectVendor(features, scripts);
            logger.debug(`✅ Vendor para ${features.name}: ${vendor.name}`);
          } catch (vendorError) {
            logger.error(`❌ Error en detección de vendor para ${features.name}: ${vendorError.message}`);
            throw vendorError;
          }
          
          let compliance;
          try {
            compliance = this.checkGDPRCompliance(features, classification, vendor);
            logger.debug(`✅ Cumplimiento para ${features.name}: ${compliance.isCompliant}`);
          } catch (complianceError) {
            logger.error(`❌ Error en análisis de cumplimiento para ${features.name}: ${complianceError.message}`);
            throw complianceError;
          }

          analyzedCookies.push({
            ...features,
            classification,
            vendor,
            compliance,
            analysisTimestamp: new Date(),
            analysisVersion: '2.0'
          });
        } catch (cookieError) {
          logger.error(`Error procesando cookie ${cookie?.name || 'sin nombre'}: ${cookieError.message}`);
          continue;
        }
      }

      // Generar resumen
      logger.info(`📊 Generando resumen para ${analyzedCookies.length} cookies analizadas`);
      let summary;
      try {
        summary = this.generateAnalysisSummary(analyzedCookies, domain);
        logger.info(`✅ Resumen generado exitosamente`);
      } catch (summaryError) {
        logger.error(`❌ Error generando resumen:`, summaryError);
        logger.error(`Stack trace:`, summaryError.stack);
        throw summaryError;
      }

      await page.close();

      const analysisTime = Date.now() - startTime;
      logger.info(`✅ Análisis completado en ${analysisTime}ms`);

      const result = {
        domain,
        summary,
        cookies: analyzedCookies,
        metadata: {
          analysisTime,
          totalCookies: cookies.length,
          scriptsFound: scripts.length,
          timestamp: new Date(),
          version: '2.0'
        }
      };

      logger.info(`📦 Resultado final:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      logger.error(`❌ Error analizando ${domain}:`, error);
      logger.error(`Stack trace completo:`, error.stack);
      
      // Cerrar página si está abierta
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // Ignorar error al cerrar
        }
      }
      
      throw error;
    }
  }

  /**
   * Genera resumen del análisis
   */
  generateAnalysisSummary(cookies, domain) {
    const summary = {
      domain,
      totalCookies: cookies.length,
      byPurpose: {},
      byVendor: {},
      compliance: {
        compliant: 0,
        violations: 0,
        warnings: 0,
        needsConsent: 0
      },
      riskAssessment: 'low'
    };

    // Validar que hay cookies para procesar
    if (!cookies || cookies.length === 0) {
      return summary;
    }

    // Agrupar por propósito
    for (const cookie of cookies) {
      // Validar estructura de la cookie
      if (!cookie || !cookie.classification || !cookie.vendor || !cookie.compliance) {
        logger.warn(`Cookie con estructura inválida saltada en resumen`);
        continue;
      }

      // Agrupar por propósito
      const purpose = cookie.classification.purpose || 'unknown';
      summary.byPurpose[purpose] = (summary.byPurpose[purpose] || 0) + 1;

      // Agrupar por vendor
      const vendorName = cookie.vendor.name || 'Unknown';
      summary.byVendor[vendorName] = (summary.byVendor[vendorName] || 0) + 1;

      // Estadísticas de compliance
      if (cookie.compliance.isCompliant) {
        summary.compliance.compliant++;
      } else {
        summary.compliance.violations++;
      }

      if (cookie.compliance.warnings && cookie.compliance.warnings.length > 0) {
        summary.compliance.warnings++;
      }

      if (cookie.compliance.needsConsent) {
        summary.compliance.needsConsent++;
      }
    }

    // Evaluar riesgo general
    if (summary.totalCookies > 0) {
      const violationRate = summary.compliance.violations / summary.totalCookies;
      if (violationRate > 0.3) {
        summary.riskAssessment = 'high';
      } else if (violationRate > 0.1 || summary.compliance.warnings > 0) {
        summary.riskAssessment = 'medium';
      }
    }

    return summary;
  }

  /**
   * Cierra el navegador
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = IntelligentCookieAnalyzer;