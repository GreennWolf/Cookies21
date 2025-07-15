const VendorDatabaseV2 = require('../models/VendorDatabaseV2');

class VendorDetector {
  constructor() {
    this.vendorCache = new Map();
    this.domainIndex = new Map();
    this.cookieIndex = new Map();
    this.loadVendorDatabase();
  }

  async loadVendorDatabase() {
    console.log('📂 Cargando base de datos de vendors...');
    
    try {
      // Cargar desde MongoDB si existe
      const vendors = await VendorDatabaseV2.find({ status: 'active' });
      
      if (vendors.length === 0) {
        console.log('⚠️ No hay vendors en BD, creando base de datos inicial...');
        await this.createInitialVendorDatabase();
      } else {
        console.log(`✅ Cargados ${vendors.length} vendors desde BD`);
        this.buildIndices(vendors);
      }
      
    } catch (error) {
      console.error('❌ Error cargando vendors:', error);
      // Usar vendors hardcodeados como fallback
      this.loadHardcodedVendors();
    }
  }

  async createInitialVendorDatabase() {
    const initialVendors = this.getInitialVendors();
    
    try {
      await VendorDatabaseV2.insertMany(initialVendors);
      console.log(`✅ Creados ${initialVendors.length} vendors iniciales`);
      this.buildIndices(initialVendors);
    } catch (error) {
      console.error('❌ Error creando vendors iniciales:', error);
      this.loadHardcodedVendors();
    }
  }

  buildIndices(vendors) {
    vendors.forEach(vendor => {
      // Índice por ID
      this.vendorCache.set(vendor.vendorId, vendor);
      
      // Índice por dominio
      vendor.domains.forEach(domainObj => {
        const domain = domainObj.domain || domainObj;
        this.domainIndex.set(domain.toLowerCase(), vendor);
      });
      
      // Índice por cookies
      vendor.knownCookies.forEach(cookie => {
        this.cookieIndex.set(cookie.name.toLowerCase(), vendor);
      });
    });
    
    console.log(`📊 Índices construidos: ${this.vendorCache.size} vendors, ${this.domainIndex.size} dominios, ${this.cookieIndex.size} cookies`);
  }

  async detectVendor(cookie, pageData = {}) {
    console.log(`🔍 Detectando vendor para cookie: ${cookie.name}`);
    
    const detectionMethods = [
      () => this.detectByExactDomain(cookie.domain),
      () => this.detectByParentDomain(cookie.domain),
      () => this.detectByCookieName(cookie.name),
      () => this.detectByCookiePattern(cookie),
      () => this.detectByNetworkRequests(cookie, pageData.networkRequests),
      () => this.detectByScriptAnalysis(cookie, pageData.scripts),
      () => this.detectByValuePattern(cookie.value)
    ];
    
    for (const method of detectionMethods) {
      try {
        const vendor = await method();
        if (vendor) {
          const confidence = this.calculateConfidence(vendor, cookie, method.name);
          console.log(`✅ Vendor detectado: ${vendor.name} (${confidence.toFixed(2)})`);
          
          return {
            id: vendor.vendorId,
            name: vendor.name,
            confidence,
            detectionMethod: method.name,
            vendor: vendor
          };
        }
      } catch (error) {
        console.warn(`⚠️ Error en método ${method.name}:`, error.message);
      }
    }
    
    // Si no se detecta, intentar con heurísticas
    return this.detectByHeuristics(cookie, pageData);
  }

  detectByExactDomain(domain) {
    if (!domain) return null;
    
    const cleanDomain = domain.toLowerCase().replace(/^\./, '');
    return this.domainIndex.get(cleanDomain);
  }

  detectByParentDomain(domain) {
    if (!domain) return null;
    
    const parts = domain.toLowerCase().replace(/^\./, '').split('.');
    
    // Intentar con cada nivel de dominio padre
    for (let i = 0; i < parts.length - 1; i++) {
      const parentDomain = parts.slice(i).join('.');
      const vendor = this.domainIndex.get(parentDomain);
      if (vendor) return vendor;
    }
    
    return null;
  }

  detectByCookieName(cookieName) {
    if (!cookieName) return null;
    
    return this.cookieIndex.get(cookieName.toLowerCase());
  }

  detectByCookiePattern(cookie) {
    if (!cookie.name) return null;
    
    // Buscar por patrones de regex en vendors
    for (const vendor of this.vendorCache.values()) {
      for (const knownCookie of vendor.knownCookies) {
        if (knownCookie.pattern) {
          try {
            const regex = new RegExp(knownCookie.pattern, 'i');
            if (regex.test(cookie.name)) {
              return vendor;
            }
          } catch (e) {
            // Patrón regex inválido, continuar
          }
        }
      }
    }
    
    // Patrones hardcodeados adicionales
    const patterns = {
      google: /^(_ga|_gid|_gat|NID|SID|SIDCC|APISID|SAPISID|SSID|1P_JAR)/i,
      facebook: /^(_fbp|fbm_|fbsr_|fr|c_user|xs|datr)/i,
      amazon: /^(session-id|ubid-|x-wl-|ad-id|csm-hit)/i,
      microsoft: /^(MUID|MC1|MSFPC|ANON|AI_)/i,
      adobe: /^(s_cc|s_sq|s_vi|s_fid|AMCV_)/i,
      linkedin: /^(bcookie|bscookie|lang|lidc|UserMatchHistory)/i,
      twitter: /^(auth_token|twid|remember_checked)/i,
      hotjar: /^(_hjid|_hjFirstSeen|_hjIncludedInPageviewSample)/i,
      mixpanel: /^(mp_|__mp)/i,
      segment: /^(ajs_|analytics_)/i
    };
    
    for (const [vendorId, pattern] of Object.entries(patterns)) {
      if (pattern.test(cookie.name)) {
        return this.vendorCache.get(vendorId);
      }
    }
    
    return null;
  }

  detectByNetworkRequests(cookie, networkRequests = []) {
    if (!cookie.domain || networkRequests.length === 0) return null;
    
    // Buscar requests que coincidan con el dominio de la cookie
    const matchingRequests = networkRequests.filter(req => {
      try {
        const reqDomain = new URL(req.url).hostname;
        return reqDomain.includes(cookie.domain) || cookie.domain.includes(reqDomain);
      } catch {
        return false;
      }
    });
    
    if (matchingRequests.length === 0) return null;
    
    // Buscar vendor por dominio de los requests
    for (const request of matchingRequests) {
      try {
        const reqDomain = new URL(request.url).hostname;
        const vendor = this.detectByExactDomain(reqDomain) || 
                      this.detectByParentDomain(reqDomain);
        if (vendor) return vendor;
      } catch {
        continue;
      }
    }
    
    return null;
  }

  detectByScriptAnalysis(cookie, scripts = []) {
    if (!scripts || scripts.length === 0) return null;
    
    // Analizar scripts por dominios conocidos
    for (const script of scripts) {
      try {
        const scriptDomain = new URL(script).hostname;
        const vendor = this.detectByExactDomain(scriptDomain) || 
                      this.detectByParentDomain(scriptDomain);
        
        if (vendor) {
          // Verificar si la cookie podría ser de este vendor
          if (this.cookieCouldBeFromVendor(cookie, vendor)) {
            return vendor;
          }
        }
      } catch {
        continue;
      }
    }
    
    // Patrones específicos en URLs de scripts
    const scriptPatterns = {
      google: /google-analytics\.com|googletagmanager\.com|googlesyndication\.com/,
      facebook: /connect\.facebook\.net|facebook\.com/,
      hotjar: /static\.hotjar\.com/,
      mixpanel: /cdn\.mixpanel\.com/,
      segment: /cdn\.segment\.com/
    };
    
    for (const script of scripts) {
      for (const [vendorId, pattern] of Object.entries(scriptPatterns)) {
        if (pattern.test(script)) {
          const vendor = this.vendorCache.get(vendorId);
          if (vendor && this.cookieCouldBeFromVendor(cookie, vendor)) {
            return vendor;
          }
        }
      }
    }
    
    return null;
  }

  detectByValuePattern(value) {
    if (!value) return null;
    
    // Patrones específicos en valores de cookies
    const valuePatterns = {
      google: {
        pattern: /^GA\d\.\d\.\d+\.\d+$/,  // Google Analytics client ID
        vendorId: 'google'
      },
      facebook: {
        pattern: /^fp_/,  // Facebook pixel
        vendorId: 'facebook'
      }
    };
    
    for (const [patternId, config] of Object.entries(valuePatterns)) {
      if (config.pattern.test(value)) {
        return this.vendorCache.get(config.vendorId);
      }
    }
    
    return null;
  }

  detectByHeuristics(cookie, pageData) {
    // Última opción: usar heurísticas basadas en características
    let bestMatch = null;
    let bestScore = 0;
    
    for (const vendor of this.vendorCache.values()) {
      let score = 0;
      
      // Score por similitud de nombre
      const nameScore = this.calculateNameSimilarity(cookie.name, vendor);
      score += nameScore * 0.3;
      
      // Score por dominio parcial
      if (cookie.domain && vendor.domains.some(d => 
        this.calculateDomainSimilarity(cookie.domain, d.domain || d) > 0.5)) {
        score += 0.4;
      }
      
      // Score por propósito
      if (cookie.category && vendor.purposes.includes(cookie.category)) {
        score += 0.3;
      }
      
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = vendor;
      }
    }
    
    if (bestMatch) {
      return {
        id: bestMatch.vendorId,
        name: bestMatch.name,
        confidence: bestScore,
        detectionMethod: 'heuristics',
        vendor: bestMatch
      };
    }
    
    return null;
  }

  cookieCouldBeFromVendor(cookie, vendor) {
    if (!vendor) return false;
    
    // Verificar si el nombre de la cookie coincide con patrones conocidos
    for (const knownCookie of vendor.knownCookies) {
      if (knownCookie.name === cookie.name) return true;
      
      if (knownCookie.pattern) {
        try {
          const regex = new RegExp(knownCookie.pattern, 'i');
          if (regex.test(cookie.name)) return true;
        } catch {
          continue;
        }
      }
    }
    
    // Verificar dominio
    if (cookie.domain) {
      for (const vendorDomain of vendor.domains) {
        const domain = vendorDomain.domain || vendorDomain;
        if (cookie.domain.includes(domain) || domain.includes(cookie.domain)) {
          return true;
        }
      }
    }
    
    return false;
  }

  calculateConfidence(vendor, cookie, method) {
    let baseConfidence = 0;
    
    switch (method) {
      case 'detectByExactDomain':
        baseConfidence = 0.95;
        break;
      case 'detectByCookieName':
        baseConfidence = 0.90;
        break;
      case 'detectByCookiePattern':
        baseConfidence = 0.85;
        break;
      case 'detectByParentDomain':
        baseConfidence = 0.75;
        break;
      case 'detectByNetworkRequests':
        baseConfidence = 0.70;
        break;
      case 'detectByScriptAnalysis':
        baseConfidence = 0.65;
        break;
      case 'detectByValuePattern':
        baseConfidence = 0.80;
        break;
      default:
        baseConfidence = 0.50;
    }
    
    // Ajustar por características adicionales
    let adjustments = 0;
    
    // Bonus por cookie conocida exactamente
    if (vendor.knownCookies.some(kc => kc.name === cookie.name)) {
      adjustments += 0.1;
    }
    
    // Bonus por dominio exacto
    if (cookie.domain && vendor.domains.some(d => 
      (d.domain || d).toLowerCase() === cookie.domain.toLowerCase())) {
      adjustments += 0.05;
    }
    
    // Penalty por third-party sin justificación
    if (cookie.isThirdParty && !vendor.purposes.includes('advertising') && 
        !vendor.purposes.includes('analytics')) {
      adjustments -= 0.1;
    }
    
    return Math.min(Math.max(baseConfidence + adjustments, 0), 1);
  }

  calculateNameSimilarity(cookieName, vendor) {
    if (!cookieName) return 0;
    
    const lowerCookieName = cookieName.toLowerCase();
    
    // Verificar si el nombre de la cookie contiene el nombre del vendor
    if (lowerCookieName.includes(vendor.name.toLowerCase())) {
      return 0.8;
    }
    
    // Verificar prefijos comunes
    for (const knownCookie of vendor.knownCookies) {
      const knownName = knownCookie.name.toLowerCase();
      
      // Coincidencia exacta
      if (knownName === lowerCookieName) return 1.0;
      
      // Prefijo común
      const commonPrefix = this.getCommonPrefix(knownName, lowerCookieName);
      if (commonPrefix.length >= 3) {
        return commonPrefix.length / Math.max(knownName.length, lowerCookieName.length);
      }
    }
    
    return 0;
  }

  calculateDomainSimilarity(domain1, domain2) {
    if (!domain1 || !domain2) return 0;
    
    const clean1 = domain1.toLowerCase().replace(/^\./, '');
    const clean2 = domain2.toLowerCase().replace(/^\./, '');
    
    if (clean1 === clean2) return 1.0;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    const parts1 = clean1.split('.');
    const parts2 = clean2.split('.');
    
    // Verificar TLD + dominio principal
    if (parts1.length >= 2 && parts2.length >= 2) {
      const tld1 = parts1.slice(-2).join('.');
      const tld2 = parts2.slice(-2).join('.');
      if (tld1 === tld2) return 0.6;
    }
    
    return 0;
  }

  getCommonPrefix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.substring(0, i);
  }

  loadHardcodedVendors() {
    console.log('📥 Cargando vendors hardcodeados como fallback...');
    
    const hardcodedVendors = this.getInitialVendors();
    this.buildIndices(hardcodedVendors);
  }

  getInitialVendors() {
    return [
      {
        vendorId: 'google',
        name: 'Google',
        displayName: 'Google LLC',
        company: {
          legalName: 'Google LLC',
          headquarters: 'Mountain View, CA, USA',
          country: 'US',
          website: 'https://www.google.com'
        },
        domains: [
          { domain: 'google.com', type: 'primary' },
          { domain: 'googleapis.com', type: 'api' },
          { domain: 'google-analytics.com', type: 'analytics' },
          { domain: 'googletagmanager.com', type: 'analytics' },
          { domain: 'googlesyndication.com', type: 'advertising' },
          { domain: 'doubleclick.net', type: 'advertising' },
          { domain: 'gstatic.com', type: 'cdn' }
        ],
        knownCookies: [
          { name: '_ga', category: 'analytics', description: 'Google Analytics - Distingue usuarios únicos', duration: '2 years' },
          { name: '_gid', category: 'analytics', description: 'Google Analytics - Distingue usuarios únicos', duration: '24 hours' },
          { name: '_gat', category: 'analytics', description: 'Google Analytics - Limita la velocidad de solicitud', duration: '1 minute' },
          { name: 'NID', category: 'functional', description: 'Preferencias del usuario', duration: '6 months' },
          { name: 'IDE', category: 'marketing', description: 'DoubleClick - Publicidad dirigida', duration: '1 year' },
          { name: '1P_JAR', category: 'marketing', description: 'Optimización de anuncios', duration: '1 month' }
        ],
        purposes: ['analytics', 'advertising', 'functionality'],
        compliance: {
          iabVendorId: 755,
          iabTCFParticipant: true,
          gdprCompliant: true,
          ccpaCompliant: true
        },
        urls: {
          privacyPolicy: 'https://policies.google.com/privacy'
        },
        status: 'active'
      },
      {
        vendorId: 'facebook',
        name: 'Facebook',
        displayName: 'Meta Platforms, Inc.',
        company: {
          legalName: 'Meta Platforms, Inc.',
          headquarters: 'Menlo Park, CA, USA',
          country: 'US',
          website: 'https://www.facebook.com'
        },
        domains: [
          { domain: 'facebook.com', type: 'primary' },
          { domain: 'fb.com', type: 'primary' },
          { domain: 'fbcdn.net', type: 'cdn' },
          { domain: 'connect.facebook.net', type: 'api' }
        ],
        knownCookies: [
          { name: '_fbp', category: 'marketing', description: 'Facebook Pixel - Remarketing', duration: '90 days' },
          { name: 'fr', category: 'marketing', description: 'Publicidad dirigida', duration: '90 days' },
          { name: 'c_user', category: 'functional', description: 'ID de usuario', duration: 'session' }
        ],
        purposes: ['advertising', 'analytics', 'social_media'],
        compliance: {
          iabVendorId: 8,
          iabTCFParticipant: true,
          gdprCompliant: true,
          ccpaCompliant: true
        },
        urls: {
          privacyPolicy: 'https://www.facebook.com/privacy/explanation'
        },
        status: 'active'
      },
      {
        vendorId: 'hotjar',
        name: 'Hotjar',
        displayName: 'Hotjar Ltd.',
        domains: [
          { domain: 'hotjar.com', type: 'primary' },
          { domain: 'static.hotjar.com', type: 'cdn' }
        ],
        knownCookies: [
          { name: '_hjid', category: 'analytics', description: 'Hotjar - ID único del sitio', duration: '1 year' },
          { name: '_hjFirstSeen', category: 'analytics', description: 'Identifica nueva sesión', duration: '30 minutes' }
        ],
        purposes: ['analytics'],
        compliance: {
          gdprCompliant: true,
          ccpaCompliant: true
        },
        status: 'active'
      }
      // Más vendors pueden ser agregados aquí...
    ];
  }
}

module.exports = VendorDetector;