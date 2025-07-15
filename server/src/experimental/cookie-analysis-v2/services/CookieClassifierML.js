class CookieClassifierML {
  constructor() {
    this.categories = {
      NECESSARY: {
        id: 'necessary',
        name: 'Estrictamente Necesarias',
        patterns: [
          /^(PHPSESSID|JSESSIONID|ASP\.NET_SessionId|session_?id|sid|csrf|xsrf)/i,
          /^(auth|authorization|authenticated|login|logged_in)/i,
          /^(cart|basket|checkout|order)/i,
          /^(lang|language|locale|i18n)/i,
          /^(currency|region|country)/i,
          /^(consent|cookie_consent|gdpr|ccpa)/i
        ],
        keywords: ['session', 'auth', 'security', 'csrf', 'language', 'essential', 'necessary'],
        domains: ['localhost', 'same-origin'],
        risk: 'low'
      },
      
      ANALYTICS: {
        id: 'analytics',
        name: 'Analíticas',
        patterns: [
          /^(_ga|_gid|_gat|_gaq|__utm)/i,
          /^(gtm|gtag)/i,
          /^(mp_|mixpanel|heap|segment)/i,
          /^(ahoy_|matomo_|piwik)/i,
          /^(anj|adobe_analytics|omniture)/i,
          /^(clarity|hotjar|fullstory)/i,
          /^(_hjid|_hjFirstSeen|_hjIncludedInPageviewSample)/i
        ],
        keywords: ['analytics', 'tracking', 'metrics', 'performance', 'statistics', 'measurement'],
        domains: [
          'google-analytics.com', 'googletagmanager.com', 'mixpanel.com',
          'hotjar.com', 'fullstory.com', 'segment.com', 'amplitude.com'
        ],
        risk: 'medium'
      },
      
      MARKETING: {
        id: 'marketing',
        name: 'Marketing',
        patterns: [
          /^(fbp|fbc|fb_|facebook)/i,
          /^(IDE|DSID|id|fr|tr)/i,
          /^(NID|SID|SIDCC|APISID|SAPISID|SSID)/i,
          /^(uuid|uuid2|anj)/i,
          /^(tuuid|c|tuuid_lu)/i,
          /^(B|bcookie|lidc|UserMatchHistory)/i,
          /^(_gcl_|_gac_)/i,
          /^(criteo|outbrain|taboola)/i
        ],
        keywords: ['marketing', 'advertising', 'ads', 'remarketing', 'retargeting', 'campaign'],
        domains: [
          'doubleclick.net', 'facebook.com', 'linkedin.com', 'twitter.com',
          'criteo.com', 'outbrain.com', 'taboola.com', 'adsystem.com'
        ],
        risk: 'high'
      },
      
      FUNCTIONAL: {
        id: 'functional',
        name: 'Funcionales',
        patterns: [
          /^(player|video|audio)/i,
          /^(chat|intercom|zendesk|tawk)/i,
          /^(map|location|geo)/i,
          /^(font|theme|dark_mode)/i,
          /^(preferences|settings|config)/i,
          /^(timezone|tz)/i,
          /^(notification|alert)/i
        ],
        keywords: ['preferences', 'settings', 'features', 'functionality', 'user-experience'],
        domains: ['intercom.io', 'zendesk.com', 'maps.googleapis.com'],
        risk: 'low'
      },
      
      SOCIAL: {
        id: 'social',
        name: 'Redes Sociales',
        patterns: [
          /^(twitter|twtr)/i,
          /^(pinterest|_pinterest)/i,
          /^(youtube|yt)/i,
          /^(vimeo)/i,
          /^(instagram|ig)/i,
          /^(tiktok|tt)/i,
          /^(linkedin|li)/i
        ],
        keywords: ['social', 'share', 'embed', 'widget', 'follow', 'like'],
        domains: [
          'twitter.com', 'pinterest.com', 'youtube.com', 'vimeo.com',
          'instagram.com', 'tiktok.com', 'linkedin.com'
        ],
        risk: 'medium'
      }
    };
    
    this.vendorPatterns = this.loadVendorPatterns();
  }

  async classifyCookie(cookie, pageData = {}) {
    console.log(`🔍 Clasificando cookie: ${cookie.name}`);
    
    // 1. Clasificación por reglas (alta precisión)
    const ruleBasedResult = this.classifyByRules(cookie, pageData);
    
    if (ruleBasedResult.confidence > 0.8) {
      console.log(`✅ Clasificación por reglas: ${ruleBasedResult.category} (${ruleBasedResult.confidence})`);
      return ruleBasedResult;
    }
    
    // 2. Clasificación por contexto
    const contextResult = this.classifyByContext(cookie, pageData);
    
    if (contextResult.confidence > 0.7) {
      console.log(`✅ Clasificación por contexto: ${contextResult.category} (${contextResult.confidence})`);
      return contextResult;
    }
    
    // 3. Clasificación por ML/heurísticas
    const mlResult = this.classifyByHeuristics(cookie, pageData);
    
    // 4. Combinar resultados
    const finalResult = this.combineClassifications([ruleBasedResult, contextResult, mlResult]);
    
    console.log(`📊 Clasificación final: ${finalResult.category} (${finalResult.confidence})`);
    return finalResult;
  }

  classifyByRules(cookie, pageData) {
    let bestMatch = { 
      category: 'unknown', 
      confidence: 0, 
      method: 'rules',
      reasons: []
    };
    
    for (const [categoryKey, category] of Object.entries(this.categories)) {
      let score = 0;
      let matches = 0;
      const reasons = [];
      
      // Coincidencia por patrones regex (peso alto)
      for (const pattern of category.patterns) {
        if (pattern.test(cookie.name)) {
          score += 15;
          matches++;
          reasons.push(`Pattern match: ${pattern}`);
        }
      }
      
      // Coincidencia por keywords en nombre (peso medio)
      const lowerName = cookie.name.toLowerCase();
      for (const keyword of category.keywords) {
        if (lowerName.includes(keyword)) {
          score += 8;
          matches++;
          reasons.push(`Keyword match: ${keyword}`);
        }
      }
      
      // Coincidencia por dominio (peso alto)
      if (cookie.domain) {
        for (const domain of category.domains) {
          if (cookie.domain.includes(domain) || domain.includes(cookie.domain)) {
            score += 12;
            matches++;
            reasons.push(`Domain match: ${domain}`);
          }
        }
      }
      
      // Bonus por vendor conocido
      if (this.isKnownVendor(cookie.domain, category.id)) {
        score += 10;
        reasons.push('Known vendor for category');
      }
      
      // Calcular confianza
      const maxPossibleScore = (category.patterns.length * 15) + 
                              (category.keywords.length * 8) + 
                              (category.domains.length * 12) + 10;
      
      const confidence = maxPossibleScore > 0 ? Math.min(score / maxPossibleScore, 1) : 0;
      
      if (confidence > bestMatch.confidence && matches > 0) {
        bestMatch = { 
          category: category.id, 
          confidence,
          method: 'rules',
          reasons,
          matches
        };
      }
    }
    
    return bestMatch;
  }

  classifyByContext(cookie, pageData) {
    const context = {
      category: 'unknown',
      confidence: 0,
      method: 'context',
      reasons: []
    };
    
    // Análisis por fuente de detección
    let sourceBonus = 0;
    let sourceReasons = [];
    
    switch (cookie.source) {
      case 'httpHeaders':
        if (cookie.httpOnly) {
          sourceBonus += 0.2;
          sourceReasons.push('HttpOnly cookie suggests functional/necessary');
          if (cookie.name.includes('session') || cookie.name.includes('auth')) {
            context.category = 'necessary';
            sourceBonus += 0.3;
          }
        }
        break;
        
      case 'javascript':
        sourceBonus += 0.1;
        sourceReasons.push('JavaScript-set cookie');
        break;
        
      case 'localStorage':
      case 'sessionStorage':
        sourceBonus += 0.2;
        sourceReasons.push('Storage API usage suggests functional purpose');
        context.category = 'functional';
        break;
    }
    
    // Análisis por tecnologías detectadas en la página
    if (pageData.technologies) {
      for (const tech of pageData.technologies) {
        if (tech.includes('Analytics')) {
          if (cookie.name.includes('ga') || cookie.name.includes('gtm')) {
            context.category = 'analytics';
            sourceBonus += 0.4;
            sourceReasons.push(`Technology match: ${tech}`);
          }
        }
        if (tech.includes('Facebook') || tech.includes('Pixel')) {
          if (cookie.name.includes('fb') || cookie.name.includes('facebook')) {
            context.category = 'marketing';
            sourceBonus += 0.4;
            sourceReasons.push(`Technology match: ${tech}`);
          }
        }
      }
    }
    
    // Análisis por propiedades de la cookie
    if (cookie.isPersistent) {
      if (cookie.maxAge > 86400 * 365) { // > 1 año
        sourceBonus += 0.1;
        if (context.category === 'unknown') {
          context.category = 'marketing'; // Cookies persistentes largas suelen ser marketing
        }
      }
    } else {
      if (context.category === 'unknown') {
        context.category = 'necessary'; // Cookies de sesión suelen ser necesarias
        sourceBonus += 0.2;
      }
    }
    
    // Análisis por dominio third-party
    if (cookie.isThirdParty) {
      sourceBonus += 0.1;
      if (context.category === 'unknown') {
        context.category = 'marketing'; // Third-party suelen ser marketing
        sourceBonus += 0.2;
      }
      sourceReasons.push('Third-party cookie suggests marketing/analytics');
    }
    
    context.confidence = Math.min(sourceBonus, 0.9);
    context.reasons = sourceReasons;
    
    return context;
  }

  classifyByHeuristics(cookie, pageData) {
    const features = this.extractFeatures(cookie, pageData);
    
    // Algoritmo heurístico simple (simulando ML)
    let scores = {
      necessary: 0,
      analytics: 0,
      marketing: 0,
      functional: 0,
      social: 0
    };
    
    // Feature: Nombre de cookie
    const name = cookie.name.toLowerCase();
    
    // Heurística 1: Longitud del nombre
    if (name.length < 8) {
      scores.necessary += 0.1;
    } else if (name.length > 20) {
      scores.marketing += 0.1;
    }
    
    // Heurística 2: Entropía del valor
    const entropy = this.calculateEntropy(cookie.value || '');
    if (entropy < 2) {
      scores.necessary += 0.1;
    } else if (entropy > 4) {
      scores.marketing += 0.2;
    }
    
    // Heurística 3: Prefijos y sufijos comunes
    if (name.startsWith('_') || name.startsWith('__')) {
      scores.analytics += 0.2;
    }
    if (name.endsWith('_id') || name.endsWith('id')) {
      scores.marketing += 0.1;
    }
    
    // Heurística 4: Patrones UUID/GUID
    if (this.isUUID(cookie.value)) {
      scores.marketing += 0.3;
    }
    
    // Heurística 5: Duración
    if (features.duration > 365) {
      scores.marketing += 0.2;
    } else if (features.duration === 0) {
      scores.necessary += 0.2;
    }
    
    // Encontrar categoría con mayor score
    const bestCategory = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    );
    
    return {
      category: bestCategory[0],
      confidence: Math.min(bestCategory[1], 0.8),
      method: 'heuristics',
      reasons: [`Heuristic score: ${bestCategory[1].toFixed(2)}`],
      scores
    };
  }

  combineClassifications(results) {
    // Filtrar resultados válidos
    const validResults = results.filter(r => r.confidence > 0.1);
    
    if (validResults.length === 0) {
      return {
        category: 'unknown',
        confidence: 0,
        method: 'none',
        reasons: ['No classification methods succeeded']
      };
    }
    
    // Si hay un resultado con muy alta confianza, usarlo
    const highConfidence = validResults.find(r => r.confidence > 0.9);
    if (highConfidence) {
      return highConfidence;
    }
    
    // Combinar por peso según método
    const weights = {
      rules: 0.5,
      context: 0.3,
      heuristics: 0.2
    };
    
    const categoryScores = {};
    const allReasons = [];
    
    validResults.forEach(result => {
      const weight = weights[result.method] || 0.1;
      const weightedScore = result.confidence * weight;
      
      if (!categoryScores[result.category]) {
        categoryScores[result.category] = 0;
      }
      categoryScores[result.category] += weightedScore;
      
      allReasons.push(`${result.method}: ${result.confidence.toFixed(2)}`);
    });
    
    // Encontrar la categoría con mayor score combinado
    const bestCategory = Object.entries(categoryScores).reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    
    return {
      category: bestCategory[0],
      confidence: Math.min(bestCategory[1], 1),
      method: 'combined',
      reasons: allReasons,
      breakdown: categoryScores
    };
  }

  extractFeatures(cookie, pageData) {
    return {
      nameLength: cookie.name ? cookie.name.length : 0,
      valueLength: cookie.value ? cookie.value.length : 0,
      nameEntropy: this.calculateEntropy(cookie.name || ''),
      valueEntropy: this.calculateEntropy(cookie.value || ''),
      hasUnderscore: (cookie.name || '').includes('_'),
      hasDash: (cookie.name || '').includes('-'),
      isUpperCase: (cookie.name || '') === (cookie.name || '').toUpperCase(),
      isNumeric: /^\d+$/.test(cookie.value || ''),
      isUUID: this.isUUID(cookie.value || ''),
      isBase64: this.isBase64(cookie.value || ''),
      isThirdParty: cookie.isThirdParty || false,
      isPersistent: cookie.isPersistent || false,
      duration: this.calculateDurationDays(cookie),
      isSecure: cookie.secure || false,
      isHttpOnly: cookie.httpOnly || false,
      sameSite: cookie.sameSite || 'None'
    };
  }

  calculateEntropy(str) {
    if (!str) return 0;
    
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  isUUID(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  isBase64(value) {
    if (!value || value.length < 4) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(value) && value.length % 4 === 0;
  }

  calculateDurationDays(cookie) {
    if (cookie.maxAge) {
      return cookie.maxAge / (24 * 60 * 60); // seconds to days
    }
    if (cookie.expires) {
      const now = new Date();
      const expires = new Date(cookie.expires);
      return (expires - now) / (1000 * 60 * 60 * 24); // ms to days
    }
    return 0; // session cookie
  }

  isKnownVendor(domain, category) {
    if (!domain) return false;
    
    const vendorMappings = {
      'google.com': ['analytics', 'marketing'],
      'facebook.com': ['marketing', 'social'],
      'linkedin.com': ['marketing', 'social'],
      'twitter.com': ['social'],
      'hotjar.com': ['analytics'],
      'mixpanel.com': ['analytics']
    };
    
    for (const [vendorDomain, categories] of Object.entries(vendorMappings)) {
      if (domain.includes(vendorDomain) && categories.includes(category)) {
        return true;
      }
    }
    
    return false;
  }

  loadVendorPatterns() {
    // Cargar patrones de vendors conocidos
    return {
      google: {
        domains: ['google.com', 'gstatic.com', 'googleapis.com'],
        cookies: ['_ga', '_gid', '_gat', 'NID', 'SID'],
        categories: ['analytics', 'marketing', 'functional']
      },
      facebook: {
        domains: ['facebook.com', 'fbcdn.net'],
        cookies: ['_fbp', 'fr', 'c_user'],
        categories: ['marketing', 'social']
      }
      // ... más vendors
    };
  }

  getCategoryInfo(categoryId) {
    for (const category of Object.values(this.categories)) {
      if (category.id === categoryId) {
        return category;
      }
    }
    return null;
  }
}

module.exports = CookieClassifierML;