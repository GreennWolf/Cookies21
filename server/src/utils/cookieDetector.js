const logger = require('./logger');

class CookieDetector {
  constructor() {
    // Patrones para detectar cookies según su propósito
    this.cookiePatterns = {
      necessary: [
        // Cookies técnicas necesarias
        /^(sess|session|PHPSESSID|asp\.net|jsessionid)/i,
        /^(csrf|xsrf|token)/i,
        /^(__Host-|__Secure-)/,
        /_csrf$/i,
        /^(auth|login)/i
      ],
      preferences: [
        // Cookies de preferencias
        /^(prefs|preferences|settings)/i,
        /^(lang|language|locale)/i,
        /^(theme|display|view)/i,
        /_settings$/i,
        /^(timezone|region)/i
      ],
      analytics: [
        // Cookies de análisis
        /^(_ga|_gid|_gat|__utm[a-z])/i,
        /^(_pk_|_hjid|_hjSession)/i,
        /^(mp_|mixpanel)/i,
        /^(amplitude|heap|matomo)/i,
        /^(plausible|clarity)/i
      ],
      marketing: [
        // Cookies de marketing
        /^(_fbp|_fbc|fr|tr)/i,
        /^(_gcl|_gac|_gads)/i,
        /^(test_cookie|IDE|id)/i,
        /^(linkedin|li_gc)/i,
        /^(twitter|pinterest)/i
      ],
      advertising: [
        // Cookies publicitarias
        /^(doubleclick|adsense)/i,
        /^(adroll|adform)/i,
        /^(criteo|taboola)/i,
        /^(outbrain|pubmatic)/i,
        /^(rubicon|openx)/i
      ]
    };

    // Patrones comunes de proveedores
    this.vendorPatterns = {
      google: {
        pattern: /^(_ga|_gid|_gat|__utm|_gcl|_gac)/i,
        name: 'Google',
        domain: 'google.com'
      },
      facebook: {
        pattern: /^(_fbp|_fbc|fr|tr)/i,
        name: 'Facebook',
        domain: 'facebook.com'
      },
      hotjar: {
        pattern: /^(_hj|_hjid|_hjSession)/i,
        name: 'Hotjar',
        domain: 'hotjar.com'
      },
      linkedin: {
        pattern: /^(linkedin|li_gc|BizoID|UserMatchHistory)/i,
        name: 'LinkedIn',
        domain: 'linkedin.com'
      }
    };
  }

  /**
   * Detecta y analiza una cookie
   * @param {Object} cookie - Objeto cookie a analizar
   * @returns {Object} - Análisis detallado de la cookie
   */
  detectCookie(cookie) {
    try {
      // Validación explícita al inicio
      if (!cookie || typeof cookie !== 'object') {
        throw new Error('Invalid cookie: cookie must be an object');
      }
  
      if (!cookie.name) {
        throw new Error('Invalid cookie: name is required');
      }
  
      const analysis = {
        name: cookie.name,
        value: cookie.value,
        category: this._detectCategory(cookie),
        provider: this._detectProvider(cookie),
        attributes: this._analyzeAttributes(cookie),
        metadata: this._generateMetadata(cookie),
        compliance: this._checkCompliance(cookie)
      };
  
      return analysis;
    } catch (error) {
      logger.error('Error detecting cookie:', error);
      return null;
    }
  }

  /**
   * Detecta la categoría de la cookie
   * @private
   */
  _detectCategory(cookie) {
    // Verificar cada categoría
    for (const [category, patterns] of Object.entries(this.cookiePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(cookie.name)) {
          return category;
        }
      }
    }

    // Intentar detectar por dominio y valor
    if (this._isAnalyticsCookie(cookie)) return 'analytics';
    if (this._isMarketingCookie(cookie)) return 'marketing';
    if (this._isPreferencesCookie(cookie)) return 'preferences';

    // Si no se puede determinar, retornar unknown
    return 'unknown';
  }

  /**
   * Detecta el proveedor de la cookie
   * @private
   */
  _detectProvider(cookie) {
    // Verificar patrones de proveedores conocidos
    for (const [vendor, info] of Object.entries(this.vendorPatterns)) {
      if (info.pattern.test(cookie.name) || 
          (cookie.domain && cookie.domain.includes(info.domain))) {
        return {
          name: info.name,
          domain: info.domain,
          verified: true
        };
      }
    }

    // Intentar detectar por dominio
    if (cookie.domain) {
      // Eliminar www. y obtener dominio base
      const domain = cookie.domain.replace(/^www\./, '');
      return {
        name: this._getDomainName(domain),
        domain: domain,
        verified: false
      };
    }

    return {
      name: 'Unknown',
      domain: null,
      verified: false
    };
  }

  /**
   * Analiza los atributos de la cookie
   * @private
   */
  _analyzeAttributes(cookie) {
    return {
      domain: cookie.domain || null,
      path: cookie.path || '/',
      secure: cookie.secure || false,
      httpOnly: cookie.httpOnly || false,
      sameSite: cookie.sameSite || null,
      expiration: this._getExpirationInfo(cookie),
      size: this._calculateSize(cookie)
    };
  }

  /**
   * Genera metadata adicional de la cookie
   * @private
   */
  _generateMetadata(cookie) {
    return {
      firstSeen: new Date(),
      lastUpdated: new Date(),
      valuePattern: this._detectValuePattern(cookie.value),
      persistence: this._determinePersistence(cookie),
      risk: this._assessRisk(cookie)
    };
  }

  /**
   * Verifica el cumplimiento de la cookie
   * @private
   */
  _checkCompliance(cookie) {
    const compliance = {
      isCompliant: true,
      issues: [],
      recommendations: []
    };

    // Verificar atributos de seguridad
    if (!cookie.secure) {
      compliance.isCompliant = false;
      compliance.issues.push('Cookie no segura');
      compliance.recommendations.push('Habilitar el flag Secure');
    }

    if (!cookie.sameSite) {
      compliance.issues.push('SameSite no especificado');
      compliance.recommendations.push('Especificar atributo SameSite');
    }

    // Verificar duración
    const duration = this._getExpirationInfo(cookie).durationDays;
    if (duration > 365) {
      compliance.isCompliant = false;
      compliance.issues.push('Duración excesiva');
      compliance.recommendations.push('Reducir duración a máximo 12 meses');
    }

    return compliance;
  }

  /**
   * Detecta el patrón del valor de la cookie
   * @private
   */
  _detectValuePattern(value) {
    if (!value) return 'empty';
    if (/^[0-9]+$/.test(value)) return 'numeric';
    if (/^[A-Za-z0-9+/=]+$/.test(value)) return 'base64';
    if (/^[A-Fa-f0-9]+$/.test(value)) return 'hex';
    if (value.includes('=')) return 'kvp';
    if (value.startsWith('{') && value.endsWith('}')) return 'json';
    return 'string';
  }

  /**
   * Determina la persistencia de la cookie
   * @private
   */
  _determinePersistence(cookie) {
    if (!cookie.expires && !cookie.maxAge) {
      return 'session';
    }

    const duration = this._getExpirationInfo(cookie).durationDays;
    if (duration <= 1) return 'short';
    if (duration <= 30) return 'medium';
    return 'long';
  }

  /**
   * Evalúa el riesgo de la cookie
   * @private
   */
  _assessRisk(cookie) {
    let riskScore = 0;

    // Factores de riesgo
    if (!cookie.secure) riskScore += 2;
    if (!cookie.httpOnly) riskScore += 1;
    if (!cookie.sameSite) riskScore += 1;
    if (this._getExpirationInfo(cookie).durationDays > 365) riskScore += 1;
    if (cookie.value && cookie.value.length > 1000) riskScore += 1;

    // Determinar nivel de riesgo
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calcula el tamaño de la cookie
   * @private
   */
  _calculateSize(cookie) {
    const size = new TextEncoder().encode(
      `${cookie.name}=${cookie.value}`
    ).length;

    return {
      bytes: size,
      formattedSize: this._formatSize(size)
    };
  }

  /**
   * Obtiene información de expiración
   * @private
   */
  _getExpirationInfo(cookie) {
    const now = new Date();
    let expirationDate = null;
    let durationDays = 0;

    if (cookie.expires) {
      expirationDate = new Date(cookie.expires);
      durationDays = (expirationDate - now) / (1000 * 60 * 60 * 24);
    } else if (cookie.maxAge) {
      durationDays = cookie.maxAge / (60 * 60 * 24);
      expirationDate = new Date(now.getTime() + (cookie.maxAge * 1000));
    }

    return {
      date: expirationDate,
      durationDays: Math.round(durationDays),
      isSession: !expirationDate
    };
  }

  // Métodos auxiliares

  _isAnalyticsCookie(cookie) {
    const analyticsKeywords = ['stats', 'analytics', 'track', 'monitor'];
    return analyticsKeywords.some(keyword => 
      cookie.name.toLowerCase().includes(keyword)
    );
  }

  _isMarketingCookie(cookie) {
    const marketingKeywords = ['ads', 'promo', 'campaign', 'marketing'];
    return marketingKeywords.some(keyword => 
      cookie.name.toLowerCase().includes(keyword)
    );
  }

  _isPreferencesCookie(cookie) {
    const preferencesKeywords = ['pref', 'settings', 'config', 'layout'];
    return preferencesKeywords.some(keyword => 
      cookie.name.toLowerCase().includes(keyword)
    );
  }

  _getDomainName(domain) {
    return domain
      .split('.')
      .slice(0, -1)
      .join('.')
      .split('.')
      .pop()
      .replace(/^./, c => c.toUpperCase());
  }

  _formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
}

module.exports = new CookieDetector();