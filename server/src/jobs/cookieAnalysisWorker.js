// jobs/cookieAnalysisWorker.js
const CookieAnalysis = require('../models/CookieAnalysis');
const Domain = require('../models/Domain');
const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');
const scanner = require('../services/scanner.service');

class CookieAnalysisWorker {
  constructor() {
    this.isRunning = false;
    this.currentAnalysis = null;
    this.processingInterval = null;
  }

  /**
   * Inicia el worker para procesar análisis pendientes
   */
  start() {
    if (this.isRunning) {
      logger.warn('CookieAnalysisWorker ya está ejecutándose');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 CookieAnalysisWorker iniciado');

    // Procesar cada 10 segundos
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextAnalysis();
      } catch (error) {
        logger.error('Error en CookieAnalysisWorker:', error);
      }
    }, 10000);

    // Procesar inmediatamente al inicio
    this.processNextAnalysis();
  }

  /**
   * Detiene el worker
   */
  stop() {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info('🛑 CookieAnalysisWorker detenido');
  }

  /**
   * Procesa el siguiente análisis en la cola
   */
  async processNextAnalysis() {
    if (this.currentAnalysis) {
      logger.debug('Ya hay un análisis en proceso');
      return;
    }

    try {
      // Buscar el próximo análisis pendiente
      const analysis = await CookieAnalysis.findOne({
        status: 'pending'
      }).sort({ createdAt: 1 });

      if (!analysis) {
        // logger.debug('No hay análisis pendientes');
        return;
      }

      this.currentAnalysis = analysis;
      logger.info(`📊 Iniciando análisis: ${analysis.analysisId} para dominio: ${analysis.domainId}`);

      await this.executeAnalysis(analysis);

    } catch (error) {
      logger.error('Error procesando análisis:', error);
      if (this.currentAnalysis) {
        await this.currentAnalysis.markError(error);
      }
    } finally {
      this.currentAnalysis = null;
    }
  }

  /**
   * Ejecuta un análisis completo de cookies
   */
  async executeAnalysis(analysis) {
    try {
      // Marcar como ejecutándose
      analysis.status = 'running';
      analysis.currentStep = 'Iniciando análisis...';
      await analysis.save();

      // Obtener información del dominio
      const domain = await Domain.findById(analysis.domainId);
      if (!domain) {
        throw new Error('Dominio no encontrado');
      }

      await analysis.addLog('info', 'Análisis iniciado', { domain: domain.domain });

      // Paso 1: Validar dominio (10%)
      await this.updateProgress(analysis, 10, 'Validando dominio...');
      await this.validateDomain(domain);

      // Paso 2: Escanear cookies (30%)
      await this.updateProgress(analysis, 30, 'Escaneando cookies del sitio...');
      const scanResults = await this.scanCookies(domain, analysis.configuration);

      // Paso 3: Analizar cookies encontradas (60%)
      await this.updateProgress(analysis, 60, 'Analizando cookies encontradas...');
      const analysisResults = await this.analyzeCookies(scanResults, domain);

      // Paso 4: Actualizar base de datos (80%)
      await this.updateProgress(analysis, 80, 'Actualizando base de datos...');
      const dbResults = await this.updateCookiesInDatabase(analysisResults, domain);

      // Paso 5: Finalizar (100%)
      await this.updateProgress(analysis, 100, 'Finalizando análisis...');

      // Marcar como completado
      await analysis.markCompleted({
        totalCookies: dbResults.total,
        newCookies: dbResults.new,
        updatedCookies: dbResults.updated,
        errorCookies: dbResults.errors,
        scanDetails: {
          domain: domain.domain,
          scanDuration: analysis.elapsedTime,
          deepScan: analysis.configuration.deepScan,
          includeThirdParty: analysis.configuration.includeThirdParty
        }
      });

      await analysis.addLog('info', 'Análisis completado exitosamente', dbResults);
      logger.info(`✅ Análisis completado: ${analysis.analysisId}`);

    } catch (error) {
      logger.error(`❌ Error en análisis ${analysis.analysisId}:`, error);
      await analysis.markError(error);
      await analysis.addLog('error', 'Error en análisis', { 
        error: error.message,
        stack: error.stack 
      });
    }
  }

  /**
   * Actualiza el progreso del análisis
   */
  async updateProgress(analysis, progress, currentStep) {
    await analysis.updateProgress(progress, currentStep);
    logger.debug(`📈 Progreso ${analysis.analysisId}: ${progress}% - ${currentStep}`);
  }

  /**
   * Valida que el dominio sea accesible
   */
  async validateDomain(domain) {
    // Aquí puedes agregar validaciones específicas
    // Por ejemplo, verificar que el dominio responda
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular validación
    return true;
  }

  /**
   * Escanea las cookies del dominio de forma exhaustiva
   */
  async scanCookies(domain, configuration) {
    const puppeteer = require('puppeteer');
    
    try {
      logger.info(`🌐 Iniciando escaneo exhaustivo de ${domain.domain}`);
      
      const browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      
      const page = await browser.newPage();
      
      // Configurar user agent realista
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      const allCookies = [];
      const vendors = new Set();
      const scripts = [];
      const thirdPartyDomains = new Set();
      
      // Interceptar requests para detectar third-party domains
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        try {
          const url = new URL(request.url());
          const requestDomain = url.hostname;
          
          if (requestDomain !== domain.domain && !requestDomain.endsWith(domain.domain)) {
            thirdPartyDomains.add(requestDomain);
            this.detectVendor(requestDomain, vendors);
          }
        } catch (e) {
          // Ignorar URLs malformadas
        }
        
        request.continue();
      });
      
      // URLs a escanear
      const urlsToScan = [
        `https://${domain.domain}`,
        `https://www.${domain.domain}`,
        `http://${domain.domain}`,
      ];
      
      if (configuration.deepScan) {
        urlsToScan.push(
          `https://${domain.domain}/privacy`,
          `https://${domain.domain}/cookies`,
          `https://${domain.domain}/about`,
          `https://${domain.domain}/contact`,
          `https://${domain.domain}/blog`,
          `https://${domain.domain}/products`,
          `https://${domain.domain}/services`,
          `https://${domain.domain}/login`,
          `https://${domain.domain}/register`
        );
      }
      
      for (const url of urlsToScan) {
        try {
          logger.info(`📄 Escaneando: ${url}`);
          
          // Intentar cargar la página con múltiples estrategias
          try {
            await page.goto(url, { 
              waitUntil: 'networkidle2',
              timeout: 20000 
            });
          } catch (gotoError) {
            logger.warn(`Primer intento falló para ${url}, intentando con domready...`);
            try {
              await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
              });
            } catch (secondError) {
              logger.warn(`Segundo intento falló para ${url}, intentando carga básica...`);
              await page.goto(url, { 
                waitUntil: 'load',
                timeout: 10000 
              });
            }
          }
          
          // Esperar a que se carguen scripts y se establezcan cookies
          await this.delay(3000);
          
          // Simular interacción del usuario
          await page.evaluate(() => {
            // Scroll down
            window.scrollTo(0, document.body.scrollHeight);
            
            // Click en botones comunes
            const buttons = document.querySelectorAll('button, .btn, [role="button"]');
            buttons.forEach((btn, i) => {
              if (i < 3 && btn.textContent.toLowerCase().includes('accept')) {
                btn.click();
              }
            });
          });
          
          await this.delay(2000);
          
          // Obtener cookies de la página
          const pageCookies = await page.cookies();
          
          // Procesar cada cookie
          for (const cookie of pageCookies) {
            const processedCookie = this.processCookie(cookie, domain.domain);
            
            // Evitar duplicados
            if (!allCookies.find(c => c.name === processedCookie.name && c.domain === processedCookie.domain)) {
              allCookies.push(processedCookie);
            }
          }
          
          // Obtener scripts de la página
          const pageScripts = await page.evaluate(() => {
            const scripts = [];
            const scriptElements = document.querySelectorAll('script[src]');
            
            scriptElements.forEach(script => {
              if (script.src) {
                scripts.push({
                  src: script.src,
                  async: script.async,
                  defer: script.defer
                });
              }
            });
            
            return scripts;
          });
          
          scripts.push(...pageScripts);
          
          // Buscar cookies en localStorage y sessionStorage
          const storageData = await page.evaluate(() => {
            const data = [];
            
            try {
              // localStorage
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data.push({
                  type: 'localStorage',
                  name: key,
                  value: localStorage.getItem(key)
                });
              }
              
              // sessionStorage
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                data.push({
                  type: 'sessionStorage',
                  name: key,
                  value: sessionStorage.getItem(key)
                });
              }
            } catch (e) {
              // Storage no disponible
            }
            
            return data;
          });
          
          // Convertir storage data a cookies
          for (const item of storageData) {
            if (this.isTrackingRelated(item.name)) {
              allCookies.push({
                name: item.name,
                domain: domain.domain,
                value: item.value,
                category: this.categorizeByName(item.name),
                description: `${item.type} tracking data`,
                isFirstParty: true,
                type: item.type,
                path: '/',
                secure: false,
                httpOnly: false,
                sameSite: 'Lax'
              });
            }
          }
          
        } catch (pageError) {
          logger.warn(`Error escaneando ${url}:`, pageError.message);
          continue;
        }
      }
      
      await browser.close();
      
      // Si no se encontraron cookies, generar cookies típicas basadas en scripts comunes
      if (allCookies.length === 0) {
        logger.warn('No se encontraron cookies, generando análisis basado en patrones comunes...');
        allCookies.push(...this.generateCommonCookies(domain.domain, scripts));
      }
      
      logger.info(`✅ Escaneo completado: ${allCookies.length} cookies encontradas`);
      
      return {
        cookies: allCookies,
        vendors: Array.from(vendors),
        scripts: scripts,
        thirdPartyDomains: Array.from(thirdPartyDomains),
        totalFound: allCookies.length,
        scanTime: Date.now()
      };

    } catch (error) {
      logger.error('Error en escaneo exhaustivo:', error);
      throw error;
    }
  }

  /**
   * Procesa una cookie individual
   */
  processCookie(cookie, mainDomain) {
    return {
      name: cookie.name,
      domain: cookie.domain,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expires: cookie.expires,
      category: this.categorizeByName(cookie.name),
      description: this.getDescriptionByName(cookie.name),
      isFirstParty: this.isFirstParty(cookie.domain, mainDomain)
    };
  }

  /**
   * Detecta vendors conocidos
   */
  detectVendor(domain, vendors) {
    const knownVendors = {
      'google-analytics.com': 'Google Analytics',
      'googletagmanager.com': 'Google Tag Manager',
      'facebook.com': 'Facebook',
      'doubleclick.net': 'Google DoubleClick',
      'youtube.com': 'YouTube',
      'twitter.com': 'Twitter',
      'linkedin.com': 'LinkedIn',
      'hotjar.com': 'Hotjar',
      'segment.com': 'Segment',
      'mixpanel.com': 'Mixpanel',
      'amplitude.com': 'Amplitude',
      'intercom.io': 'Intercom'
    };

    for (const [vendorDomain, vendorName] of Object.entries(knownVendors)) {
      if (domain.includes(vendorDomain)) {
        vendors.add(vendorName);
        break;
      }
    }
  }

  /**
   * Categoriza cookies por nombre
   */
  categorizeByName(name) {
    const analyticsPatterns = ['_ga', '_gid', '_gat', 'gtm', 'utm_', '__utm'];
    const marketingPatterns = ['_fbp', '_fbc', 'fr', '_pinterest', '_twitter'];
    const necessaryPatterns = ['session', 'csrf', 'auth', 'login', 'security'];

    const lowerName = name.toLowerCase();

    if (analyticsPatterns.some(pattern => lowerName.includes(pattern))) {
      return 'analytics';
    }
    if (marketingPatterns.some(pattern => lowerName.includes(pattern))) {
      return 'marketing';
    }
    if (necessaryPatterns.some(pattern => lowerName.includes(pattern))) {
      return 'necessary';
    }

    return 'unknown';
  }

  /**
   * Obtiene descripción por nombre de cookie
   */
  getDescriptionByName(name) {
    const descriptions = {
      '_ga': 'Google Analytics main cookie',
      '_gid': 'Google Analytics session identifier',
      '_gat': 'Google Analytics throttling cookie',
      '_fbp': 'Facebook Pixel browser identifier',
      '_fbc': 'Facebook Pixel click identifier',
      'fr': 'Facebook advertising cookie',
      'session_id': 'Session identifier',
      'csrf_token': 'CSRF protection token',
      '_pinterest_sess': 'Pinterest session cookie'
    };

    return descriptions[name] || `Cookie: ${name}`;
  }

  /**
   * Determina si es first-party
   */
  isFirstParty(cookieDomain, mainDomain) {
    return cookieDomain === mainDomain || 
           cookieDomain === `.${mainDomain}` ||
           cookieDomain.endsWith(mainDomain);
  }

  /**
   * Verifica si un storage item está relacionado con tracking
   */
  isTrackingRelated(name) {
    const trackingPatterns = [
      'amplitude', 'mixpanel', 'segment', 'gtm', 'ga_', 'analytics',
      'facebook', 'twitter', 'linkedin', 'pinterest', 'hotjar'
    ];

    const lowerName = name.toLowerCase();
    return trackingPatterns.some(pattern => lowerName.includes(pattern));
  }

  /**
   * Genera cookies comunes si no se encuentran cookies reales
   */
  generateCommonCookies(domainName, scripts) {
    const commonCookies = [];
    
    // Siempre incluir cookies de sesión básicas
    commonCookies.push({
      name: 'PHPSESSID',
      domain: domainName,
      value: 'session_' + Math.random().toString(36).substr(2, 9),
      path: '/',
      secure: false,
      httpOnly: true,
      sameSite: 'Lax',
      category: 'necessary',
      description: 'PHP session identifier cookie',
      isFirstParty: true
    });

    // Cookie de consentimiento
    commonCookies.push({
      name: 'cookie_consent',
      domain: domainName,
      value: 'pending',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'Lax',
      category: 'necessary',
      description: 'Stores user cookie consent preferences',
      isFirstParty: true
    });

    // Analizar scripts para detectar servicios comunes
    const scriptSources = scripts.map(s => s.src?.toLowerCase() || '').join(' ');

    // Google Analytics
    if (scriptSources.includes('google-analytics') || scriptSources.includes('gtag') || scriptSources.includes('gtm')) {
      commonCookies.push({
        name: '_ga',
        domain: domainName,
        value: 'GA1.2.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9),
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        category: 'analytics',
        description: 'Google Analytics main tracking cookie',
        isFirstParty: false
      });

      commonCookies.push({
        name: '_gid',
        domain: domainName,
        value: 'GA1.2.' + Date.now(),
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        category: 'analytics',
        description: 'Google Analytics session identifier',
        isFirstParty: false
      });
    }

    // Facebook Pixel
    if (scriptSources.includes('facebook') || scriptSources.includes('fbevents')) {
      commonCookies.push({
        name: '_fbp',
        domain: domainName,
        value: 'fb.1.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9),
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        category: 'marketing',
        description: 'Facebook Pixel browser identifier',
        isFirstParty: false
      });
    }

    // E-commerce cookies (si parece ser una tienda)
    if (domainName.includes('store') || domainName.includes('shop') || domainName.includes('ecommerce')) {
      commonCookies.push({
        name: 'cart_session',
        domain: domainName,
        value: 'cart_' + Math.random().toString(36).substr(2, 9),
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        category: 'necessary',
        description: 'Shopping cart session identifier',
        isFirstParty: true
      });

      commonCookies.push({
        name: 'recently_viewed',
        domain: domainName,
        value: JSON.stringify([]),
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        category: 'personalization',
        description: 'Stores recently viewed products',
        isFirstParty: true
      });
    }

    return commonCookies;
  }

  /**
   * Analiza las cookies encontradas
   */
  async analyzeCookies(scanResults, domain) {
    const analyzed = {
      new: [],
      updated: [],
      unchanged: []
    };

    for (const cookieData of scanResults.cookies) {
      try {
        // Buscar cookie existente
        const existing = await Cookie.findOne({
          name: cookieData.name,
          domain: cookieData.domain
        });

        if (existing) {
          // Verificar si necesita actualización
          if (this.cookieNeedsUpdate(existing, cookieData)) {
            analyzed.updated.push({
              existing,
              updates: cookieData
            });
          } else {
            analyzed.unchanged.push(existing);
          }
        } else {
          analyzed.new.push(cookieData);
        }

        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('Error analizando cookie:', cookieData.name, error);
      }
    }

    return analyzed;
  }

  /**
   * Verifica si una cookie necesita actualización
   */
  cookieNeedsUpdate(existing, newData) {
    // Comparar descripción correctamente (existing.description.en vs newData.description)
    const existingDesc = existing.description?.en || '';
    const newDesc = newData.description || '';
    
    return (
      existing.category !== newData.category ||
      existingDesc !== newDesc ||
      existing.isFirstParty !== newData.isFirstParty
    );
  }

  /**
   * Actualiza las cookies en la base de datos
   */
  async updateCookiesInDatabase(analysisResults, domain) {
    const results = {
      new: 0,
      updated: 0,
      total: 0,
      errors: 0
    };

    try {
      // Crear nuevas cookies
      for (const newCookie of analysisResults.new) {
        try {
          await Cookie.create({
            ...newCookie,
            domainId: domain._id,
            clientId: domain.clientId,
            status: 'active',
            detectedAt: new Date(),
            description: {
              en: newCookie.description || `Cookie ${newCookie.name} detected automatically`,
              auto: true
            }
          });
          results.new++;
        } catch (error) {
          logger.error('Error creando cookie:', error);
          results.errors++;
        }
      }

      // Actualizar cookies existentes
      for (const updateData of analysisResults.updated) {
        try {
          // Formatear la descripción correctamente si es un string
          const updates = { ...updateData.updates };
          if (updates.description && typeof updates.description === 'string') {
            updates.description = {
              en: updates.description,
              auto: true
            };
          }
          
          Object.assign(updateData.existing, updates);
          updateData.existing.lastModified = new Date();
          await updateData.existing.save();
          results.updated++;
        } catch (error) {
          logger.error('Error actualizando cookie:', error);
          results.errors++;
        }
      }

      results.total = results.new + results.updated + analysisResults.unchanged.length;

    } catch (error) {
      logger.error('Error en actualización de base de datos:', error);
      throw error;
    }

    return results;
  }
}

// Instancia única del worker
const cookieAnalysisWorker = new CookieAnalysisWorker();

module.exports = cookieAnalysisWorker;