// services/provider.service.js
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
// Puedes seguir utilizando parseUrl si lo deseas, pero en este caso usaremos new URL directamente.
 
class ProviderService {
  constructor() {
    // Base de datos de proveedores conocidos
    this.knownProviders = new Map([
      // Analíticas
      ['google-analytics.com', { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 }],
      ['analytics.google.com', { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 }],
      ['doubleclick.net', { name: 'Google Ads', category: 'marketing', iabVendorId: 755 }],
      ['hotjar.com', { name: 'Hotjar', category: 'analytics', iabVendorId: 765 }],
  
      // Marketing
      ['facebook.com', { name: 'Facebook', category: 'marketing', iabVendorId: 891 }],
      ['linkedin.com', { name: 'LinkedIn', category: 'marketing', iabVendorId: 145 }],
      ['twitter.com', { name: 'Twitter', category: 'marketing', iabVendorId: 13 }],
  
      // Publicidad
      ['adnxs.com', { name: 'AppNexus', category: 'advertising', iabVendorId: 32 }],
      ['pubmatic.com', { name: 'PubMatic', category: 'advertising', iabVendorId: 76 }],
      ['rubiconproject.com', { name: 'Rubicon Project', category: 'advertising', iabVendorId: 52 }],
  
      // Personalización
      ['optimizely.com', { name: 'Optimizely', category: 'personalization', iabVendorId: 565 }],
      ['crazyegg.com', { name: 'Crazy Egg', category: 'personalization', iabVendorId: null }]
    ]);
  }
  
  // Detectar proveedor a partir de una cookie
  async detectCookieProvider(cookie) {
    try {
      // Validar que la cookie tenga al menos el nombre
      if (!cookie || !cookie.name) {
        logger.warn('Invalid cookie provided to detectCookieProvider');
        return this._createUnknownProvider(cookie || {});
      }

      // Verificar caché primero (solo si redis está disponible)
      let cachedProvider = null;
      try {
        const cacheKey = `provider:cookie:${cookie.name}`;
        cachedProvider = await cache.get(cacheKey);
        if (cachedProvider) {
          return JSON.parse(cachedProvider);
        }
      } catch (cacheError) {
        // Si Redis no está disponible, continuar sin caché
        logger.debug('Cache not available for provider detection');
      }
  
      let provider = null;
  
      // 1. Intentar detectar por nombre de cookie
      provider = await this._detectByName(cookie.name);
      
      // 2. Si no se encuentra, intentar por dominio
      if (!provider && cookie.domain) {
        provider = await this._detectByDomain(cookie.domain);
      }
  
      // 3. Si aún no se encuentra, intentar por análisis de contenido
      if (!provider && cookie.value) {
        provider = await this._detectByContent(cookie);
      }
  
      // Si se encontró un proveedor, guardarlo en caché (solo si redis está disponible)
      if (provider) {
        try {
          const cacheKey = `provider:cookie:${cookie.name}`;
          await cache.set(cacheKey, JSON.stringify(provider), 'EX', 86400); // 24 horas
        } catch (cacheError) {
          // Si Redis no está disponible, continuar sin caché
          logger.debug('Cache not available for storing provider data');
        }
      }
  
      return provider || this._createUnknownProvider(cookie);
  
    } catch (error) {
      logger.error('Error detecting cookie provider:', error);
      return this._createUnknownProvider(cookie || {});
    }
  }
  
  // Detectar proveedor a partir de un script
  async detectScriptProvider(script) {
    try {
      const cacheKey = `provider:script:${script.url || (script.content && script.content.substring(0, 100))}`;
      const cachedProvider = await cache.get(cacheKey);
      if (cachedProvider) {
        return JSON.parse(cachedProvider);
      }
  
      let provider = null;
  
      // 1. Intentar detectar por URL
      if (script.url) {
        provider = await this._detectByUrl(script.url);
      }
  
      // 2. Si no se encuentra y hay contenido, analizar el contenido
      if (!provider && script.content) {
        provider = await this._analyzeScriptContent(script.content);
      }
  
      // Guardar en caché si se encontró un proveedor
      if (provider) {
        await cache.set(cacheKey, JSON.stringify(provider), 'EX', 86400);
      }
  
      return provider || this._createUnknownProvider(script);
  
    } catch (error) {
      logger.error('Error detecting script provider:', error);
      return this._createUnknownProvider(script);
    }
  }
  
  // Verificar proveedor conocido
  async verifyProvider(provider) {
    try {
      // Verificar si el proveedor está en nuestra base de datos
      if (this.knownProviders.has(provider.domain)) {
        return {
          ...this.knownProviders.get(provider.domain),
          verified: true
        };
      }
  
      // Intentar verificar con servicios externos
      const verificationResults = await Promise.all([
        this._verifyWithIAB(provider),
        this._verifyWithPublicAPIs(provider)
      ]);
  
      // Combinar resultados
      const verified = verificationResults.some(result => result.verified);
      
      return {
        ...provider,
        verified,
        verificationSource: verified ? verificationResults.find(r => r.verified).source : null
      };
  
    } catch (error) {
      logger.error('Error verifying provider:', error);
      return {
        ...provider,
        verified: false
      };
    }
  }
  
  // Métodos privados
  
  async _detectByName(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    // Patrones comunes de nombres de cookies con sus respectivos proveedores
    const patterns = [
      // Google Analytics
      { regex: /^_ga(_.*)?$/, provider: { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 } },
      { regex: /^_gid$/, provider: { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 } },
      { regex: /^_gat/, provider: { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 } },
      { regex: /^__utm/, provider: { name: 'Google Analytics', category: 'analytics', iabVendorId: 755 } },
      
      // Facebook
      { regex: /^_fbp$/, provider: { name: 'Facebook', category: 'marketing', iabVendorId: 891 } },
      { regex: /^_fbc$/, provider: { name: 'Facebook', category: 'marketing', iabVendorId: 891 } },
      { regex: /^fr$/, provider: { name: 'Facebook', category: 'marketing', iabVendorId: 891 } },
      
      // Hotjar
      { regex: /^_hjid/, provider: { name: 'Hotjar', category: 'analytics', iabVendorId: 765 } },
      { regex: /^_hjSession/, provider: { name: 'Hotjar', category: 'analytics', iabVendorId: 765 } },
      
      // LinkedIn
      { regex: /^li_/, provider: { name: 'LinkedIn', category: 'marketing', iabVendorId: 145 } },
      { regex: /^_lfa/, provider: { name: 'LinkedIn', category: 'marketing', iabVendorId: 145 } },
      
      // Twitter
      { regex: /^_twitter_sess/, provider: { name: 'Twitter', category: 'marketing', iabVendorId: 13 } },
      { regex: /^_ttp/, provider: { name: 'Twitter', category: 'marketing', iabVendorId: 13 } },
      
      // Optimizely
      { regex: /optimizely/, provider: { name: 'Optimizely', category: 'personalization', iabVendorId: 565 } },
      
      // Mailchimp
      { regex: /mailchimp/, provider: { name: 'Mailchimp', category: 'marketing', iabVendorId: null } },
      
      // WooCommerce
      { regex: /^woocommerce/, provider: { name: 'WooCommerce', category: 'necessary', iabVendorId: null } },
      { regex: /^wc_/, provider: { name: 'WooCommerce', category: 'necessary', iabVendorId: null } },
      { regex: /^wp_woocommerce_session_/, provider: { name: 'WooCommerce', category: 'necessary', iabVendorId: null } },
      
      // WordPress
      { regex: /^wordpress/, provider: { name: 'WordPress', category: 'necessary', iabVendorId: null } },
      { regex: /^wp-/, provider: { name: 'WordPress', category: 'necessary', iabVendorId: null } },
      
      // Consent Management
      { regex: /cookieyes/, provider: { name: 'CookieYes', category: 'necessary', iabVendorId: null } },
      { regex: /^consent/, provider: { name: 'Consent Management', category: 'necessary', iabVendorId: null } },
      { regex: /^cookiebot/, provider: { name: 'Cookiebot', category: 'necessary', iabVendorId: null } },
      { regex: /^onetrust/, provider: { name: 'OneTrust', category: 'necessary', iabVendorId: null } },
      
      // Sourcebuster (sbjs cookies)
      { regex: /^sbjs_/, provider: { name: 'Sourcebuster', category: 'analytics', iabVendorId: null } },
      
      // Session cookies
      { regex: /^session/, provider: { name: 'Website', category: 'necessary', iabVendorId: null } },
      { regex: /^sess/, provider: { name: 'Website', category: 'necessary', iabVendorId: null } },
      { regex: /^PHPSESSID$/, provider: { name: 'PHP Session', category: 'necessary', iabVendorId: null } },
      { regex: /^JSESSIONID$/, provider: { name: 'Java Session', category: 'necessary', iabVendorId: null } },
      
      // Security cookies
      { regex: /^csrf/, provider: { name: 'CSRF Protection', category: 'necessary', iabVendorId: null } },
      { regex: /^_token/, provider: { name: 'Security Token', category: 'necessary', iabVendorId: null } },
      { regex: /^__Secure-/, provider: { name: 'Secure Cookie', category: 'necessary', iabVendorId: null } },
      { regex: /^__Host-/, provider: { name: 'Host Cookie', category: 'necessary', iabVendorId: null } },
      
      // Device identification
      { regex: /^device_id$/, provider: { name: 'Device Tracking', category: 'analytics', iabVendorId: null } },
      { regex: /^user_id$/, provider: { name: 'User Tracking', category: 'analytics', iabVendorId: null } }
    ];
  
    for (const pattern of patterns) {
      if (pattern.regex.test(name)) {
        return pattern.provider;
      }
    }
  
    return null;
  }
  
  async _detectByDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return null;
    }

    const normalizedDomain = this._normalizeDomain(domain);
    
    // Buscar en proveedores conocidos
    for (const [providerDomain, providerInfo] of this.knownProviders) {
      if (normalizedDomain && normalizedDomain.includes(providerDomain)) {
        return providerInfo;
      }
    }
  
    return null;
  }
  
  async _detectByContent(cookie) {
    // Analizar el valor de la cookie en busca de patrones
    const patterns = [
      { regex: /UA-\d+-\d+/, provider: 'Google Analytics' },
      { regex: /GTM-[A-Z0-9]+/, provider: 'Google Tag Manager' },
      { regex: /fbp|fbq/, provider: 'Facebook' }
    ];
  
    for (const pattern of patterns) {
      if (pattern.regex.test(cookie.value)) {
        const entry = Array.from(this.knownProviders.entries()).find(([_, v]) => v.name === pattern.provider);
        if (entry) return entry[1];
      }
    }
  
    return null;
  }
  
  async _detectByUrl(url) {
    // Extraer el hostname utilizando el constructor URL
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      logger.error('Error parsing URL:', error);
    }
    return await this._detectByDomain(hostname);
  }
  
  async _analyzeScriptContent(content) {
    // Buscar referencias a servicios conocidos en el código
    const patterns = [
      { regex: /googletagmanager|gtag/i, provider: 'Google Tag Manager' },
      { regex: /facebook\.com|fbevents|fbq/i, provider: 'Facebook' },
      { regex: /linkedin\.com|licdn/i, provider: 'LinkedIn' },
      { regex: /hotjar\.com|hj\./i, provider: 'Hotjar' }
    ];
  
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        const entry = Array.from(this.knownProviders.entries()).find(([_, v]) => v.name === pattern.provider);
        if (entry) return entry[1];
      }
    }
  
    return null;
  }
  

  async _verifyWithIAB(provider) {
    // Implementar verificación con IAB GVL
    return { verified: false, source: 'iab' };
  }
  
  async _verifyWithPublicAPIs(provider) {
    // Implementar verificación con APIs públicas
    return { verified: false, source: 'public_apis' };
  }
  
  _normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return '';
    }
    return domain.toLowerCase().replace(/^www\./, '').replace(/^\./, '');
  }
  
  _createUnknownProvider(source) {
    return {
      name: 'Propios',
      category: 'other',
      domain: (source && source.domain) || (source && source.url) || 'unknown',
      verified: false
    };
  }
}

module.exports = new ProviderService();
