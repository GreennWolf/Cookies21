// src/services/scanner.service.js
const puppeteer = require('puppeteer');
const { URL } = require('url');
const logger = require('../utils/logger');
const providerService = require('./provider.service');
const { cache } = require('../config/redis');
const CookieScan = require('../models/CookieScan');

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
    
    try {
      const page = await this.browserPool.newPage();
      while (queue.length > 0 && urls.size < maxUrls) {
        const currentUrl = queue.shift();
        if (visited.has(currentUrl)) continue;
        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle0', timeout: this.scanTimeout });
          visited.add(currentUrl);
          const links = await page.evaluate(() =>
            Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
          );
          for (const link of links) {
            if (urls.size >= maxUrls) break;
            const normalizedUrl = this._normalizeUrl(link);
            if (!normalizedUrl) continue;
            const isValid = includeSubdomains
              ? this._isValidDomainOrSubdomain(normalizedUrl, startUrl)
              : this._isValidUrl(normalizedUrl, startUrl);
            if (isValid && !visited.has(normalizedUrl)) {
              urls.add(normalizedUrl);
              queue.push(normalizedUrl);
            }
          }
        } catch (error) {
          console.error(`Error discovering URL ${currentUrl}:`, error);
        }
      }
      await page.close();
      return Array.from(urls);
    } catch (error) {
      console.error("Error in URL discovery:", error);
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
    try {
      await this.initBrowserPool();
      const domain = scan.domainId;
      if (!domain || !domain.domain) {
        console.error("Domain information is missing");
        return;
      }
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
      for (const chunk of chunks) {
        const promises = chunk.map(url => this._scanUrl(url, findings, scan));
        await Promise.all(promises);
      }
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
      return { findings, stats, significantChanges: this._hasSignificantChanges(findings.changes) };
    } catch (error) {
      console.error("Error scanning domain:", error);
      return { findings: null, stats: null, error: error.message };
    } finally {
      if (this.browserPool) {
        await this.browserPool.close();
        this.browserPool = null;
      }
    }
  }

  async _scanUrl(url, findings, scan) {
    const page = await this.browserPool.newPage();
    try {
      await this._setupInterceptors(page, findings);
      await this._setupEventListeners(page, findings);
      scan.progress.currentUrl = url;
      await this._updateScan(scan);
      await page.setDefaultNavigationTimeout(this.scanTimeout);
      await page.setDefaultTimeout(this.scanTimeout);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await this._retryOperation(
        () => page.goto(url, { waitUntil: ['load', 'networkidle0'], timeout: this.scanTimeout }),
        this.maxRetries
      );
      
      const cookies = await page.cookies();
      for (const cookie of cookies) {
        const cookieInfo = await this._analyzeCookie(cookie);
        if (cookieInfo) {
          findings.cookies.push(cookieInfo);
        }
      }
      const resources = await this._extractResources(page);
      findings.scripts.push(...resources.scripts);
      findings.trackers.push(...resources.trackers);
      const storageData = await this._extractStorageData(page);
      findings.storage = storageData;
      const iframeContent = await this._analyzeIframes(page);
      findings.iframes = iframeContent;
      const forms = await this._analyzeForms(page);
      findings.forms = forms;
      scan.progress.scannedUrls++;
      findings.metadata.urlsScanned++;
      await this._updateScan(scan);
    } catch (error) {
      console.error(`Error scanning URL ${url}:`, error);
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
              if (info) findings.cookies.push(info);
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
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      const urlDomain = urlObj.hostname;
      const baseDomain = baseObj.hostname;
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
      const provider = await providerService.detectCookieProvider(cookie);
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
}

module.exports = new ScannerService();
