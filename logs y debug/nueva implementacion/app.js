// app.js - Servidor Node.js con interfaz web para análisis completo de cookies
const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Categorías IAB TCF v2.2 (Actualizadas 2024)
const IAB_CATEGORIES = {
  1: { name: 'Store and/or access information on a device', type: 'necessary', legalBasis: ['consent'] },
  2: { name: 'Select basic ads', type: 'advertising', legalBasis: ['consent', 'legitimate-interest'] },
  3: { name: 'Create a personalised ads profile', type: 'advertising', legalBasis: ['consent'] },
  4: { name: 'Select personalised ads', type: 'advertising', legalBasis: ['consent'] },
  5: { name: 'Create a personalised content profile', type: 'analytics', legalBasis: ['consent'] },
  6: { name: 'Select personalised content', type: 'analytics', legalBasis: ['consent'] },
  7: { name: 'Measure ad performance', type: 'advertising', legalBasis: ['consent', 'legitimate-interest'] },
  8: { name: 'Measure content performance', type: 'analytics', legalBasis: ['consent', 'legitimate-interest'] },
  9: { name: 'Apply market research to generate audience insights', type: 'analytics', legalBasis: ['consent', 'legitimate-interest'] },
  10: { name: 'Develop and improve products', type: 'functional', legalBasis: ['consent', 'legitimate-interest'] },
  11: { name: 'Use limited data to select advertising', type: 'advertising', legalBasis: ['consent', 'legitimate-interest'] }
};

// Servicios conocidos de terceros
const KNOWN_SERVICES = {
  'google-analytics.com': { service: 'Google Analytics', purpose: 'Analytics', vendor: 'Google' },
  'googletagmanager.com': { service: 'Google Tag Manager', purpose: 'Analytics/Marketing', vendor: 'Google' },
  'doubleclick.net': { service: 'Google Ads', purpose: 'Advertising', vendor: 'Google' },
  'googlesyndication.com': { service: 'Google AdSense', purpose: 'Advertising', vendor: 'Google' },
  'facebook.com': { service: 'Facebook', purpose: 'Social/Advertising', vendor: 'Meta' },
  'instagram.com': { service: 'Instagram', purpose: 'Social', vendor: 'Meta' },
  'twitter.com': { service: 'Twitter/X', purpose: 'Social', vendor: 'X Corp' },
  'linkedin.com': { service: 'LinkedIn', purpose: 'Social/Professional', vendor: 'Microsoft' },
  'amazon-adsystem.com': { service: 'Amazon Ads', purpose: 'Advertising', vendor: 'Amazon' },
  'criteo.com': { service: 'Criteo', purpose: 'Advertising', vendor: 'Criteo' },
  'hotjar.com': { service: 'Hotjar', purpose: 'Analytics/UX', vendor: 'Hotjar' },
  'segment.com': { service: 'Segment', purpose: 'Analytics', vendor: 'Twilio' },
  'mixpanel.com': { service: 'Mixpanel', purpose: 'Analytics', vendor: 'Mixpanel' },
  'amplitude.com': { service: 'Amplitude', purpose: 'Analytics', vendor: 'Amplitude' },
  'cloudflare.com': { service: 'Cloudflare', purpose: 'Performance/Security', vendor: 'Cloudflare' },
  'stripe.com': { service: 'Stripe', purpose: 'Payment', vendor: 'Stripe' },
  'paypal.com': { service: 'PayPal', purpose: 'Payment', vendor: 'PayPal' },
  'youtube.com': { service: 'YouTube', purpose: 'Video/Advertising', vendor: 'Google' },
  'vimeo.com': { service: 'Vimeo', purpose: 'Video', vendor: 'Vimeo' },
  'tiktok.com': { service: 'TikTok', purpose: 'Social/Video', vendor: 'ByteDance' },
  'pinterest.com': { service: 'Pinterest', purpose: 'Social', vendor: 'Pinterest' },
  'reddit.com': { service: 'Reddit', purpose: 'Social', vendor: 'Reddit' },
  'snapchat.com': { service: 'Snapchat', purpose: 'Social', vendor: 'Snap Inc' },
  'outbrain.com': { service: 'Outbrain', purpose: 'Advertising', vendor: 'Outbrain' },
  'taboola.com': { service: 'Taboola', purpose: 'Advertising', vendor: 'Taboola' },
  'hubspot.com': { service: 'HubSpot', purpose: 'Marketing/CRM', vendor: 'HubSpot' },
  'mailchimp.com': { service: 'Mailchimp', purpose: 'Email Marketing', vendor: 'Intuit' },
  'intercom.io': { service: 'Intercom', purpose: 'Customer Support', vendor: 'Intercom' },
  'zendesk.com': { service: 'Zendesk', purpose: 'Customer Support', vendor: 'Zendesk' }
};

// Patrones para categorizar cookies
const COOKIE_PATTERNS = {
  necessary: [
    /^(session|sess|PHPSESSID|jsessionid|asp\.net_sessionid|connect\.sid)/i,
    /^(csrf|xsrf|_csrf|csrftoken)/i,
    /^(auth|authorization|authenticated|login|user_id|userid)/i,
    /^(lang|language|locale|i18n)/i,
    /^(cart|basket|shopping|checkout)/i,
    /^(consent|gdpr|privacy|cookie_consent|cookieconsent)/i,
    /^(wp-|wordpress)/i,
    /^(AWSALB|AWSALBCORS)/i
  ],
  functional: [
    /^(pref|preference|preferences|settings|user_settings)/i,
    /^(theme|dark_mode|layout|view|display)/i,
    /^(remember|keep|persist)/i,
    /^(timezone|time_zone|region|country)/i,
    /^(font|text_size|accessibility)/i,
    /^(player|video_quality|volume)/i
  ],
  analytics: [
    /^(_ga|_gid|_gat|_ga_|__utm)/i,
    /^(_gac_|_gcl_au|_gali)/i,
    /^(gtm|GTM)/i,
    /^(adobe|omniture|s_cc|s_sq|s_vi|visitor)/i,
    /^(_hjid|_hjSession|_hjIncludedInSample|hotjar)/i,
    /^(mp_|mixpanel)/i,
    /^(amplitude_|amp_)/i,
    /^(segment|ajs_)/i,
    /^(optimizely|optmzly)/i,
    /^(vwo_|_vis_opt_)/i,
    /^(_clck|_clsk|clarity)/i,
    /^(ki_|crazy_egg)/i
  ],
  advertising: [
    /^(_gcl_|gclid|fbp|_fbp|fbclid)/i,
    /^(IDE|DSID|FLC|AID|TAID|__gads|__gpi)/i,
    /^(fr|datr|xs|c_user|sb)/i,  // Facebook
    /^(personalization_id|guest_id|ct0)/i,  // Twitter
    /^(lidc|li_gc|bcookie|bscookie)/i,  // LinkedIn
    /^(uuid|uid|guid|visitor_id)/i,
    /^(tracking|track|trk)/i,
    /^(campaign|utm_|mkto_)/i,
    /^(referrer|ref|source)/i,
    /^(_pinterest_|_pin_)/i,
    /^(outbrain_|ob_)/i,
    /^(_tb_|taboola)/i,
    /^(criteo|cto_)/i
  ],
  social: [
    /^(facebook|fb_|instagram|ig_)/i,
    /^(twitter|tw_|twid)/i,
    /^(linkedin|li_|liap)/i,
    /^(youtube|yt_|YSC|VISITOR_INFO)/i,
    /^(pinterest|_pinterest_)/i,
    /^(reddit_|_reddit)/i,
    /^(tiktok|tt_)/i,
    /^(snapchat|sc_)/i,
    /^(whatsapp|wa_)/i,
    /^(telegram|tg_)/i
  ]
};

// Detectores de CMPs (Consent Management Platforms)
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

class CookieAnalyzer {
  constructor() {
    this.browser = null;
    this.currentUrl = null;
    this.consentAccepted = false;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-features=BlockInsecurePrivateNetworkRequests',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        defaultViewport: null
      });
    }
    return this.browser;
  }

  async analyzeWebsite(url, options = {}) {
    // Opciones de análisis
    const {
      maxDepth = 2,
      maxPages = 20,
      followInternalLinks = true,
      analyzeSubdomains = true
    } = options;

    this.currentUrl = url;
    this.consentAccepted = false;
    const browser = await this.initBrowser();
    const startTime = Date.now();
    
    // Estructuras para el análisis completo
    const visitedUrls = new Set();
    const pendingUrls = new Set([url]);
    const allCookiesMap = new Map();
    const cookiesByPage = new Map();
    let totalPagesAnalyzed = 0;
    
    try {
      const baseUrl = new URL(url);
      const baseDomain = baseUrl.hostname;
      
      console.log(`\n🌐 Starting comprehensive site analysis for: ${baseDomain}`);
      console.log(`📋 Options: maxDepth=${maxDepth}, maxPages=${maxPages}`);
      console.log('━'.repeat(60));
      
      // Analizar cada URL en la cola
      while (pendingUrls.size > 0 && totalPagesAnalyzed < maxPages) {
        const currentUrl = pendingUrls.values().next().value;
        pendingUrls.delete(currentUrl);
        
        if (visitedUrls.has(currentUrl)) continue;
        
        console.log(`\n📄 Analyzing page ${totalPagesAnalyzed + 1}/${maxPages}: ${currentUrl}`);
        
        const page = await browser.newPage();
        
        try {
          // Analizar la página actual
          const pageResult = await this.analyzeSinglePage(page, currentUrl);
          visitedUrls.add(currentUrl);
          totalPagesAnalyzed++;
          
          // Guardar cookies de esta página
          cookiesByPage.set(currentUrl, pageResult.cookies);
          
          // Agregar todas las cookies al mapa global
          pageResult.cookies.forEach(cookie => {
            const key = `${cookie.name}_${cookie.domain}_${cookie.path || '/'}`;
            if (!allCookiesMap.has(key)) {
              allCookiesMap.set(key, {
                ...cookie,
                foundOn: [currentUrl]
              });
            } else {
              allCookiesMap.get(key).foundOn.push(currentUrl);
            }
          });
          
          // Si debemos seguir enlaces internos
          if (followInternalLinks && totalPagesAnalyzed < maxPages) {
            const internalLinks = await this.extractInternalLinks(page, baseDomain, analyzeSubdomains);
            
            console.log(`  🔗 Found ${internalLinks.length} internal links`);
            
            // Agregar nuevos enlaces a la cola
            internalLinks.forEach(link => {
              if (!visitedUrls.has(link) && !pendingUrls.has(link)) {
                // Calcular profundidad
                const linkUrl = new URL(link);
                const pathDepth = linkUrl.pathname.split('/').filter(p => p).length;
                
                if (pathDepth <= maxDepth) {
                  pendingUrls.add(link);
                }
              }
            });
          }
          
          console.log(`  ✅ Page analyzed: ${pageResult.cookies.length} cookies found`);
          console.log(`  📊 Total unique cookies so far: ${allCookiesMap.size}`);
          
        } catch (pageError) {
          console.error(`  ❌ Error analyzing ${currentUrl}:`, pageError.message);
        } finally {
          await page.close();
        }
        
        // Pequeña pausa entre páginas
        if (pendingUrls.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Análisis final y resumen
      console.log('\n' + '═'.repeat(60));
      console.log('📊 COMPREHENSIVE ANALYSIS COMPLETE');
      console.log('═'.repeat(60));
      console.log(`Pages analyzed: ${totalPagesAnalyzed}`);
      console.log(`Total unique cookies: ${allCookiesMap.size}`);
      console.log(`Analysis time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      
      // Mostrar distribución de cookies por página
      console.log('\n📍 Cookies per page:');
      cookiesByPage.forEach((cookies, pageUrl) => {
        console.log(`  ${pageUrl}: ${cookies.length} cookies`);
      });
      
      // Categorizar todas las cookies únicas
      const allCookiesArray = Array.from(allCookiesMap.values());
      const categorizedCookies = this.categorizeCookies(allCookiesArray);
      
      // Obtener datos adicionales de la última página
      const lastPage = await browser.newPage();
      await lastPage.goto(url, { waitUntil: 'domcontentloaded' });
      
      const storageData = await this.extractStorageData(lastPage);
      const tcfData = await this.extractTCFData(lastPage);
      const cmpData = await this.detectCMP(lastPage);
      const googleConsentMode = await this.extractGoogleConsentMode(lastPage);
      
      await lastPage.close();
      
      // Generar análisis completo
      const analysis = {
        url,
        timestamp: new Date().toISOString(),
        cookies: categorizedCookies,
        storage: storageData,
        tcfData,
        cmpData,
        googleConsentMode,
        summary: this.generateSummary(categorizedCookies, tcfData, cmpData),
        comprehensiveAnalysis: {
          pagesAnalyzed: totalPagesAnalyzed,
          urlsVisited: Array.from(visitedUrls),
          cookiesByPage: Object.fromEntries(cookiesByPage),
          totalUniqueCookies: allCookiesMap.size,
          analysisTimeSeconds: ((Date.now() - startTime) / 1000).toFixed(2),
          options: { maxDepth, maxPages, followInternalLinks, analyzeSubdomains }
        },
        analysisDetails: {
          browserCookies: allCookiesArray.filter(c => !c.source || c.source === 'browser').length,
          interceptedCookies: allCookiesArray.filter(c => c.source === 'http-header').length,
          totalUniqueCookies: allCookiesMap.size,
          interactionsPerformed: true,
          comprehensiveMode: true
        }
      };
      
      return analysis;
      
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    } finally {
      // No cerrar el browser aquí porque es reutilizable
    }
  }
  
  // Nueva función para analizar una sola página
  async analyzeSinglePage(page, url) {
    // Configurar página
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Evitar detección
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });
    
    // Interceptar cookies
    const interceptedCookies = new Map();
    
    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        if (headers['set-cookie']) {
          const cookies = Array.isArray(headers['set-cookie']) 
            ? headers['set-cookie'] 
            : [headers['set-cookie']];
          
          cookies.forEach(cookieStr => {
            const parsed = this.parseCookieString(cookieStr);
            if (parsed) {
              interceptedCookies.set(`${parsed.name}_${parsed.domain || ''}`, parsed);
            }
          });
        }
      } catch (e) {}
    });
    
    // Navegar a la página
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Intentar aceptar cookies si es la primera página
    if (!this.consentAccepted) {
      this.consentAccepted = await this.tryAcceptCookies(page);
      if (this.consentAccepted) {
        await page.waitForTimeout(3000);
      }
    }
    
    // Simular interacciones básicas
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);
    });
    
    await page.waitForTimeout(2000);
    
    // Activar scripts de tracking
    await page.evaluate(() => {
      // Disparar eventos
      ['load', 'scroll', 'mousemove'].forEach(event => {
        window.dispatchEvent(new Event(event));
      });
      
      // Analytics
      if (window.gtag) window.gtag('event', 'page_view');
      if (window.ga) window.ga('send', 'pageview');
      if (window.fbq) window.fbq('track', 'PageView');
    });
    
    await page.waitForTimeout(2000);
    
    // Obtener todas las cookies
    const browserCookies = await page.cookies();
    const allCookies = new Map();
    
    // Combinar cookies del navegador
    browserCookies.forEach(cookie => {
      allCookies.set(`${cookie.name}_${cookie.domain}`, cookie);
    });
    
    // Combinar cookies interceptadas
    interceptedCookies.forEach((cookie, key) => {
      if (!allCookies.has(key)) {
        allCookies.set(key, cookie);
      }
    });
    
    return {
      url,
      cookies: Array.from(allCookies.values())
    };
  }
  
  // Nueva función para extraer enlaces internos
  async extractInternalLinks(page, baseDomain, includeSubdomains = true) {
    return await page.evaluate((baseDomain, includeSubdomains) => {
      const links = new Set();
      const baseUrl = window.location.origin;
      
      // Encontrar todos los enlaces
      document.querySelectorAll('a[href]').forEach(anchor => {
        try {
          const href = anchor.getAttribute('href');
          if (!href) return;
          
          // Convertir a URL absoluta
          const absoluteUrl = new URL(href, baseUrl);
          
          // Verificar si es un enlace interno
          if (includeSubdomains) {
            // Incluir subdominios
            if (absoluteUrl.hostname.endsWith(baseDomain)) {
              links.add(absoluteUrl.href);
            }
          } else {
            // Solo mismo dominio
            if (absoluteUrl.hostname === baseDomain) {
              links.add(absoluteUrl.href);
            }
          }
          
          // Limitar a HTTP/HTTPS
          if (!['http:', 'https:'].includes(absoluteUrl.protocol)) {
            return;
          }
          
          // Excluir ciertos tipos de archivos
          const excludeExtensions = ['.pdf', '.zip', '.doc', '.xls', '.png', '.jpg', '.gif'];
          if (excludeExtensions.some(ext => absoluteUrl.pathname.toLowerCase().endsWith(ext))) {
            return;
          }
          
        } catch (e) {
          // Ignorar URLs inválidas
        }
      });
      
      // También buscar enlaces en botones y elementos con onclick
      document.querySelectorAll('[onclick*="location"], [onclick*="href"]').forEach(element => {
        const onclick = element.getAttribute('onclick');
        const match = onclick.match(/(?:location\.href|window\.location)\s*=\s*["']([^"']+)["']/);
        if (match) {
          try {
            const absoluteUrl = new URL(match[1], baseUrl);
            if (absoluteUrl.hostname === baseDomain || 
                (includeSubdomains && absoluteUrl.hostname.endsWith(baseDomain))) {
              links.add(absoluteUrl.href);
            }
          } catch (e) {}
        }
      });
      
      // Buscar en formularios
      document.querySelectorAll('form[action]').forEach(form => {
        try {
          const action = form.getAttribute('action');
          if (action && !action.startsWith('#')) {
            const absoluteUrl = new URL(action, baseUrl);
            if (absoluteUrl.hostname === baseDomain || 
                (includeSubdomains && absoluteUrl.hostname.endsWith(baseDomain))) {
              links.add(absoluteUrl.href);
            }
          }
        } catch (e) {}
      });
      
      return Array.from(links);
    }, baseDomain, includeSubdomains);
  }

  async tryAcceptCookies(page) {
    console.log('🍪 Attempting to accept cookie consent...');
    
    // Esperar a que aparezca el banner
    await page.waitForTimeout(2000);
    
    // Selectores específicos para YouTube/Google
    const youtubeConsentSelectors = [
      // YouTube/Google específicos
      'button[aria-label*="Accept"]',
      'button[aria-label*="Reject"]',
      'tp-yt-paper-button[aria-label*="Accept"]',
      'tp-yt-paper-button[aria-label*="Reject"]',
      'button.VfPpkd-LgbsSe[jsname="V67aGc"]',
      '.VfPpkd-LgbsSe-OWXEXe-k8QpJ button',
      'button[jsname="higCR"]',
      'div[jsname="V67aGc"]',
      '#yDmH0d button:has-text("Accept all")',
      '#yDmH0d button:has-text("I agree")',
      'form[action*="consent"] button',
      'div[role="dialog"] button[jsname]',
      '.qqtRac button',
      '.VtwTSb button',
      
      // Selectores de Google Consent
      'button[jsaction*="accept"]',
      'div[jsaction*="accept"]',
      '.xe7COe button',
      '.VDity button',
      
      // Botones comunes de aceptar
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="agree"]',
      'button[class*="agree"]',
      'button[id*="consent"]',
      'button[class*="consent"]',
      'button[id*="allow"]',
      'button[class*="allow"]',
      'a[id*="accept"]',
      'a[class*="accept"]',
      
      // CMPs específicos
      '#onetrust-accept-btn-handler',
      '.onetrust-accept-btn-handler',
      '#accept-recommended-btn-handler',
      '.cookie-consent-accept',
      '.cc-btn.cc-dismiss',
      '#cookiebot-accept',
      '.cookiebot-accept',
      '#didomi-notice-agree-button',
      '.didomi-continue-without-agreeing',
      '#tarteaucitronPersonalize2',
      '.tarteaucitronAllow',
      '.qc-cmp-button.qc-cmp-accept-button',
      '#_evidon-accept-button',
      '.evidon-consent-button-text',
      '.trustarc-agree-button',
      '.cookieyes-accept',
      '.iubenda-cs-accept-btn'
    ];
    
    // Intentar múltiples veces
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`Attempt ${attempt + 1} to find consent banner...`);
      
      // Buscar iframes de consent (YouTube/Google usan iframes)
      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Buscar en el frame principal y en iframes
          for (const selector of youtubeConsentSelectors) {
            try {
              const element = await frame.$(selector);
              if (element) {
                const box = await element.boundingBox();
                if (box) {
                  await element.click();
                  console.log(`✅ Clicked consent button in frame: ${selector}`);
                  await page.waitForTimeout(3000);
                  return true;
                }
              }
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Frame no accesible
        }
      }
      
      // Intentar en la página principal
      for (const selector of youtubeConsentSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              await element.click();
              console.log(`✅ Clicked consent button: ${selector}`);
              await page.waitForTimeout(3000);
              return true;
            }
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      // Intentar con evaluación de JavaScript
      try {
        const clicked = await page.evaluate(() => {
          // Buscar botones con texto específico
          const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
          const acceptTexts = ['accept', 'agree', 'allow', 'ok', 'yes', 'continue', 
                              'aceptar', 'permitir', 'accept all', 'i agree', 'got it'];
          
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase().trim();
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (acceptTexts.some(t => text.includes(t) || ariaLabel.includes(t))) {
              btn.click();
              return true;
            }
          }
          
          // Buscar en shadow DOM si existe
          const elements = document.querySelectorAll('*');
          for (const el of elements) {
            if (el.shadowRoot) {
              const shadowButtons = el.shadowRoot.querySelectorAll('button');
              for (const btn of shadowButtons) {
                if (acceptTexts.some(t => btn.textContent.toLowerCase().includes(t))) {
                  btn.click();
                  return true;
                }
              }
            }
          }
          
          return false;
        });
        
        if (clicked) {
          console.log('✅ Clicked consent button via JavaScript');
          await page.waitForTimeout(3000);
          return true;
        }
      } catch (e) {
        console.log('Error in JavaScript consent detection');
      }
      
      // Esperar antes del siguiente intento
      await page.waitForTimeout(2000);
    }
    
    console.log('❌ Could not find or click consent button');
    return false;
  }

  parseCookieString(cookieStr) {
    try {
      const parts = cookieStr.split(';').map(p => p.trim());
      const [name, value] = parts[0].split('=');
      
      if (!name) return null;
      
      const cookie = {
        name: name.trim(),
        value: value ? value.trim() : '',
        source: 'http-header'
      };
      
      // Parsear atributos
      parts.slice(1).forEach(part => {
        const [key, val] = part.split('=');
        const attrName = key.toLowerCase().trim();
        
        switch (attrName) {
          case 'domain':
            cookie.domain = val ? val.trim() : '';
            break;
          case 'path':
            cookie.path = val ? val.trim() : '/';
            break;
          case 'expires':
            cookie.expires = new Date(val).getTime() / 1000;
            break;
          case 'max-age':
            cookie.expires = Date.now() / 1000 + parseInt(val);
            break;
          case 'secure':
            cookie.secure = true;
            break;
          case 'httponly':
            cookie.httpOnly = true;
            break;
          case 'samesite':
            cookie.sameSite = val ? val.toLowerCase() : 'none';
            break;
        }
      });
      
      return cookie;
    } catch (e) {
      return null;
    }
  }

  async extractStorageData(page) {
    return await page.evaluate(async () => {
      const local = {};
      const session = {};
      
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);
          local[key] = {
            value: value,
            length: value.length,
            type: typeof value,
            preview: value.length > 100 ? value.substring(0, 100) + '...' : value
          };
        }
      } catch (e) {}
      
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key);
          session[key] = {
            value: value,
            length: value.length,
            type: typeof value,
            preview: value.length > 100 ? value.substring(0, 100) + '...' : value
          };
        }
      } catch (e) {}
      
      // Contar IndexedDB databases
      let indexedDBCount = 0;
      try {
        if (window.indexedDB && window.indexedDB.databases) {
          const databases = await window.indexedDB.databases();
          indexedDBCount = databases.length;
        }
      } catch (e) {}
      
      return { 
        localStorage: local, 
        sessionStorage: session,
        indexedDBCount,
        cookieString: document.cookie,
        cookieCount: document.cookie ? document.cookie.split(';').length : 0
      };
    });
  }

  async extractTCFData(page) {
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
                
                if (!tcfData.compliance.usesEventListener) {
                  tcfData.compliance.issues.push('Should use addEventListener instead of getTCData (TCF 2.2 requirement)');
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

  async detectCMP(page) {
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
            
            // Intentar obtener versión y estado de consentimiento
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

  async extractGoogleConsentMode(page) {
    return await page.evaluate(() => {
      const consentData = {
        hasConsentMode: false,
        defaultConsent: {},
        consentUpdate: {},
        implementation: null
      };

      // Verificar Google Consent Mode
      if (window.gtag && typeof window.gtag === 'function') {
        consentData.hasConsentMode = true;
        consentData.implementation = 'gtag';
        
        // Buscar en dataLayer
        if (window.dataLayer && Array.isArray(window.dataLayer)) {
          window.dataLayer.forEach(item => {
            if (Array.isArray(item) && item[0] === 'consent') {
              if (item[1] === 'default') {
                consentData.defaultConsent = item[2];
              } else if (item[1] === 'update') {
                consentData.consentUpdate = item[2];
              }
            }
          });
        }
      }

      return consentData;
    });
  }

  identifyService(domain) {
    for (const [key, value] of Object.entries(KNOWN_SERVICES)) {
      if (domain.includes(key)) {
        return value;
      }
    }
    return null;
  }

  categorizeCookies(cookies) {
    const hostname = new URL(this.currentUrl).hostname;
    
    return cookies.map(cookie => {
      const category = this.determineCookieCategory(cookie);
      const risk = this.assessPrivacyRisk(cookie, category);
      const iabPurposes = this.mapToIABPurpose(category);
      const service = this.identifyService(cookie.domain || '');
      const isThirdParty = cookie.domain && !cookie.domain.includes(hostname);
      
      return {
        ...cookie,
        category,
        risk,
        iabPurposes,
        service,
        isThirdParty,
        expires: cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'session',
        duration: this.calculateDuration(cookie)
      };
    });
  }

  determineCookieCategory(cookie) {
    const name = cookie.name.toLowerCase();
    const domain = (cookie.domain || '').toLowerCase();

    // Verificar patrones de nombre
    for (const [category, patterns] of Object.entries(COOKIE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(name))) {
        return category;
      }
    }

    // Verificar por dominio/servicio
    const service = this.identifyService(domain);
    if (service) {
      if (service.purpose.includes('Analytics')) return 'analytics';
      if (service.purpose.includes('Advertising')) return 'advertising';
      if (service.purpose.includes('Social')) return 'social';
      if (service.purpose.includes('Payment')) return 'necessary';
      if (service.purpose.includes('Security')) return 'necessary';
    }

    // Verificar por características
    if (cookie.httpOnly && cookie.secure) return 'necessary';
    if (domain.includes('google') || domain.includes('doubleclick')) return 'advertising';
    if (domain.includes('facebook') || domain.includes('twitter')) return 'social';

    return 'unknown';
  }

  assessPrivacyRisk(cookie, category) {
    let riskScore = 0;
    
    // Riesgo por categoría
    if (category === 'advertising' || category === 'social') riskScore += 3;
    else if (category === 'analytics') riskScore += 2;
    else if (category === 'unknown') riskScore += 1;
    
    // Riesgo por configuración de seguridad
    if (!cookie.secure) riskScore += 1;
    if (!cookie.httpOnly && category !== 'necessary') riskScore += 1;
    if (cookie.sameSite === 'none') riskScore += 2;
    if (!cookie.sameSite) riskScore += 1;
    
    // Riesgo por duración
    if (cookie.expires) {
      const days = this.calculateDuration(cookie);
      if (days > 365) riskScore += 2;
      else if (days > 90) riskScore += 1;
    }
    
    // Riesgo por terceros
    if (cookie.isThirdParty) riskScore += 1;
    
    // Determinar nivel de riesgo
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  calculateDuration(cookie) {
    if (!cookie.expires) return 0;
    const expirationDate = new Date(cookie.expires * 1000);
    const now = new Date();
    const days = Math.floor((expirationDate - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  mapToIABPurpose(category) {
    const mapping = {
      necessary: [1],
      functional: [10],
      analytics: [8, 9],
      advertising: [2, 3, 4, 7],
      social: [2, 4],
      unknown: []
    };
    return mapping[category] || [];
  }

  generateSummary(cookies, tcfData, cmpData) {
    const summary = {
      total: cookies.length,
      byCategory: {},
      byRisk: { low: 0, medium: 0, high: 0 },
      byParty: { firstParty: 0, thirdParty: 0 },
      byService: {},
      avgDuration: 0,
      tcfCompliance: {
        hasFramework: tcfData.hasFramework,
        consentString: !!tcfData.consentString,
        vendorCount: tcfData.vendorCount || 0,
        tcf22Compliant: tcfData.compliance?.tcf22Compliant || false,
        usesEventListener: tcfData.compliance?.usesEventListener || false,
        issues: tcfData.compliance?.issues || []
      },
      cmp: cmpData,
      recommendations: []
    };

    let totalDuration = 0;
    let durationCount = 0;

    cookies.forEach(cookie => {
      // Por categoría
      summary.byCategory[cookie.category] = (summary.byCategory[cookie.category] || 0) + 1;
      
      // Por riesgo
      summary.byRisk[cookie.risk]++;
      
      // Por party
      if (cookie.isThirdParty) {
        summary.byParty.thirdParty++;
      } else {
        summary.byParty.firstParty++;
      }
      
      // Por servicio
      if (cookie.service) {
        const serviceName = cookie.service.service;
        summary.byService[serviceName] = (summary.byService[serviceName] || 0) + 1;
      }
      
      // Duración promedio
      if (cookie.duration > 0) {
        totalDuration += cookie.duration;
        durationCount++;
      }
    });

    summary.avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Generar recomendaciones
    if (!tcfData.hasFramework && cookies.length > 10) {
      summary.recommendations.push({
        priority: 'high',
        message: 'Implement IAB Transparency & Consent Framework v2.2 for GDPR compliance'
      });
    } else if (tcfData.hasFramework && !tcfData.compliance?.tcf22Compliant) {
      summary.recommendations.push({
        priority: 'high',
        message: 'Update TCF implementation to be fully v2.2 compliant'
      });
    }

    if (summary.byRisk.high > 5) {
      summary.recommendations.push({
        priority: 'high',
        message: `Review ${summary.byRisk.high} high-risk cookies for privacy compliance`
      });
    }

    if (summary.byParty.thirdParty > summary.byParty.firstParty) {
      summary.recommendations.push({
        priority: 'medium',
        message: 'High number of third-party cookies detected. Consider reducing for better privacy'
      });
    }

    if (summary.avgDuration > 180) {
      summary.recommendations.push({
        priority: 'medium',
        message: `Average cookie duration is ${summary.avgDuration} days. Consider shorter retention periods`
      });
    }

    if (!cmpData.detected) {
      summary.recommendations.push({
        priority: 'high',
        message: 'No Consent Management Platform detected. Implement a CMP for compliance'
      });
    }

    const insecureCookies = cookies.filter(c => !c.secure && c.category !== 'necessary').length;
    if (insecureCookies > 0) {
      summary.recommendations.push({
        priority: 'medium',
        message: `${insecureCookies} cookies lack secure flag. Enable HTTPS-only transmission`
      });
    }

    if (summary.recommendations.length === 0) {
      summary.recommendations.push({
        priority: 'low',
        message: 'Cookie configuration looks good! Continue monitoring for compliance'
      });
    }

    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Instancia global del analizador
const analyzer = new CookieAnalyzer();

// Cache para análisis (opcional)
const analysisCache = new Map();

// Rutas API
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validar URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Opciones de análisis
    const analysisOptions = {
      maxDepth: options.maxDepth || 2,
      maxPages: options.maxPages || 10,
      followInternalLinks: options.followInternalLinks !== false,
      analyzeSubdomains: options.analyzeSubdomains !== false
    };

    console.log(`\n🚀 Starting analysis for: ${url}`);
    console.log(`📋 Options:`, analysisOptions);
    const startTime = Date.now();
    
    const analysis = await analyzer.analyzeWebsite(url, analysisOptions);
    
    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Analysis completed in ${analysisTime} seconds`);
    
    // Guardar en cache
    const analysisId = Date.now().toString();
    analysisCache.set(analysisId, analysis);
    
    res.json({
      success: true,
      data: analysis,
      analysisId,
      analysisTime
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para exportar a CSV
app.get('/api/export/csv/:analysisId', (req, res) => {
  const analysis = analysisCache.get(req.params.analysisId);
  
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  
  const csvRows = [
    ['Name', 'Domain', 'Category', 'Risk', 'Third Party', 'Service', 'Expires', 'Duration (days)', 'IAB Purposes', 'Secure', 'HttpOnly', 'SameSite']
  ];
  
  analysis.cookies.forEach(cookie => {
    csvRows.push([
      cookie.name,
      cookie.domain || '',
      cookie.category,
      cookie.risk,
      cookie.isThirdParty ? 'Yes' : 'No',
      cookie.service?.service || '',
      cookie.expires,
      cookie.duration || 0,
      cookie.iabPurposes.join(';'),
      cookie.secure ? 'Yes' : 'No',
      cookie.httpOnly ? 'Yes' : 'No',
      cookie.sameSite || 'none'
    ]);
  });
  
  const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cookie-analysis-${new URL(analysis.url).hostname}-${Date.now()}.csv"`);
  res.send(csv);
});

// Ruta para exportar a JSON
app.get('/api/export/json/:analysisId', (req, res) => {
  const analysis = analysisCache.get(req.params.analysisId);
  
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cookie-analysis-${new URL(analysis.url).hostname}-${Date.now()}.json"`);
  res.json(analysis);
});

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de cierre limpio
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await analyzer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await analyzer.close();
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
🍪 =========================================
   Cookie Analyzer IAB TCF 2.2 - Complete
=========================================

🚀 Server running on: http://localhost:${PORT}
📊 Ready to analyze ALL cookies from any website!

✨ Features:
   - Complete cookie detection (HTTP, JS, intercepted)
   - Multi-page analysis (follows internal links)
   - IAB TCF 2.2 compliance checking
   - Third-party service identification
   - Privacy risk assessment
   - CMP detection (Cookiebot, OneTrust, etc.)
   - Google Consent Mode v2 support
   - Storage analysis (localStorage, sessionStorage)
   - Export to CSV/JSON

📖 Usage:
   1. Open http://localhost:${PORT} in your browser
   2. Enter any website URL
   3. Configure analysis options
   4. Get comprehensive cookie analysis

Press Ctrl+C to stop the server
`);

  // Auto-abrir navegador en Windows
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    setTimeout(() => {
      exec(`start http://localhost:${PORT}`, (err) => {
        if (err) {
          console.log(`💡 Please open http://localhost:${PORT} in your browser`);
        }
      });
    }, 1000);
  }
});