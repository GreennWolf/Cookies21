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
      // Verificar caché primero
      const cacheKey = `provider:cookie:${cookie.name}`;
      const cachedProvider = await cache.get(cacheKey);
      if (cachedProvider) {
        return JSON.parse(cachedProvider);
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
  
      // Si se encontró un proveedor, guardarlo en caché
      if (provider) {
        await cache.set(cacheKey, JSON.stringify(provider), 'EX', 86400); // 24 horas
      }
  
      return provider || this._createUnknownProvider(cookie);
  
    } catch (error) {
      logger.error('Error detecting cookie provider:', error);
      return this._createUnknownProvider(cookie);
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
    // Patrones comunes de nombres de cookies
    const patterns = [
      { regex: /_ga|_gid|_gat/, provider: 'Google Analytics' },
      { regex: /_fbp|fr/, provider: 'Facebook' },
      { regex: /_hjid|_hjSession/, provider: 'Hotjar' },
      { regex: /optimizely/, provider: 'Optimizely' }
    ];
  
    for (const pattern of patterns) {
      if (pattern.regex.test(name)) {
        const entry = Array.from(this.knownProviders.entries()).find(([_, v]) => v.name === pattern.provider);
        if (entry) return entry[1];
      }
    }
  
    return null;
  }
  
  async _detectByDomain(domain) {
    const normalizedDomain = this._normalizeDomain(domain);
    
    // Buscar en proveedores conocidos
    for (const [providerDomain, providerInfo] of this.knownProviders) {
      if (normalizedDomain.includes(providerDomain)) {
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
    return domain.toLowerCase().replace(/^www\./, '');
  }
  
  _createUnknownProvider(source) {
    return {
      name: 'Unknown',
      category: 'unknown',
      domain: source.domain || (source.url ? source.url : 'unknown'),
      verified: false
    };
  }
}

module.exports = new ProviderService();
