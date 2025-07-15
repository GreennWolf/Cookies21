class ComprehensiveReportGenerator {
  constructor() {
    this.complianceRules = this.loadComplianceRules();
  }

  async generateReport(scanData) {
    console.log(`📊 Generando reporte comprehensivo para ${scanData.domain}`);
    
    const startTime = Date.now();
    
    try {
      const report = {
        metadata: this.generateMetadata(scanData),
        summary: this.generateSummary(scanData),
        compliance: await this.assessCompliance(scanData.cookies),
        privacy: this.assessPrivacy(scanData),
        cookies: this.processCookiesForReport(scanData.cookies),
        technologies: this.analyzeTechnologies(scanData),
        recommendations: this.generateRecommendations(scanData),
        riskAssessment: this.assessRisk(scanData),
        comparison: null // Will be filled when comparing with previous system
      };
      
      const generationTime = Date.now() - startTime;
      report.metadata.generationTime = generationTime;
      
      console.log(`✅ Reporte generado en ${generationTime}ms`);
      return report;
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      throw error;
    }
  }

  generateMetadata(scanData) {
    return {
      scanId: scanData.scanId,
      url: scanData.url,
      domain: scanData.domain,
      scanDate: new Date().toISOString(),
      scanDuration: scanData.scanDuration,
      cookiesFound: scanData.cookies.length,
      scannerVersion: '2.0.0',
      reportVersion: '1.0.0',
      generationTime: null // Will be set later
    };
  }

  generateSummary(scanData) {
    const summary = {
      total: scanData.cookies.length,
      byCategory: {
        necessary: 0,
        analytics: 0,
        marketing: 0,
        functional: 0,
        social: 0,
        unknown: 0
      },
      byVendor: new Map(),
      bySource: {
        httpHeaders: 0,
        javascript: 0,
        localStorage: 0,
        sessionStorage: 0,
        indexedDB: 0,
        other: 0
      },
      byRisk: {
        low: 0,
        medium: 0,
        high: 0,
        unknown: 0
      },
      thirdParty: {
        count: 0,
        percentage: 0
      },
      persistent: {
        count: 0,
        percentage: 0
      }
    };

    // Procesar cada cookie
    scanData.cookies.forEach(cookie => {
      // Categoría
      if (summary.byCategory[cookie.category] !== undefined) {
        summary.byCategory[cookie.category]++;
      }

      // Vendor
      if (cookie.vendor && cookie.vendor.name) {
        const vendorName = cookie.vendor.name;
        if (!summary.byVendor.has(vendorName)) {
          summary.byVendor.set(vendorName, { count: 0, id: cookie.vendor.id });
        }
        summary.byVendor.get(vendorName).count++;
      }

      // Fuente
      if (summary.bySource[cookie.source] !== undefined) {
        summary.bySource[cookie.source]++;
      }

      // Riesgo
      const risk = cookie.analysis?.estimatedRisk || 'unknown';
      if (summary.byRisk[risk] !== undefined) {
        summary.byRisk[risk]++;
      }

      // Third-party
      if (cookie.isThirdParty) {
        summary.thirdParty.count++;
      }

      // Persistent
      if (cookie.isPersistent) {
        summary.persistent.count++;
      }
    });

    // Calcular porcentajes
    const total = summary.total;
    if (total > 0) {
      summary.thirdParty.percentage = Math.round((summary.thirdParty.count / total) * 100);
      summary.persistent.percentage = Math.round((summary.persistent.count / total) * 100);
    }

    // Convertir Map a Array para serialización
    summary.byVendor = Array.from(summary.byVendor.entries()).map(([name, data]) => ({
      name,
      id: data.id,
      count: data.count
    })).sort((a, b) => b.count - a.count);

    return summary;
  }

  async assessCompliance(cookies) {
    const compliance = {
      gdpr: await this.assessGDPRCompliance(cookies),
      ccpa: await this.assessCCPACompliance(cookies),
      pecr: await this.assessPECRCompliance(cookies),
      lgpd: await this.assessLGPDCompliance(cookies)
    };

    // Calcular score general
    const scores = [compliance.gdpr.score, compliance.ccpa.score, compliance.pecr.score, compliance.lgpd.score];
    compliance.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    compliance.overallCompliant = compliance.overallScore >= 80;

    return compliance;
  }

  async assessGDPRCompliance(cookies) {
    const assessment = {
      compliant: true,
      score: 100,
      issues: []
    };

    // 1. Verificar cookies no esenciales sin consentimiento
    const nonEssentialCookies = cookies.filter(c => 
      c.category !== 'necessary' && !c.analysis?.hasUserConsent
    );

    if (nonEssentialCookies.length > 0) {
      assessment.compliant = false;
      assessment.issues.push({
        severity: 'high',
        code: 'GDPR_001',
        issue: 'Cookies no esenciales sin consentimiento',
        description: `${nonEssentialCookies.length} cookies no esenciales detectadas sin consentimiento previo`,
        affectedCookies: nonEssentialCookies.map(c => c.name),
        recommendation: 'Implementar gestión de consentimiento antes de establecer estas cookies',
        regulation: 'Art. 6 GDPR - Lawfulness of processing'
      });
      assessment.score -= 30;
    }

    // 2. Verificar información de cookies
    const cookiesWithoutInfo = cookies.filter(c => 
      !c.enrichedData?.description && c.category !== 'necessary'
    );

    if (cookiesWithoutInfo.length > 0) {
      assessment.issues.push({
        severity: 'medium',
        code: 'GDPR_002',
        issue: 'Falta información sobre cookies',
        description: `${cookiesWithoutInfo.length} cookies sin descripción clara de su propósito`,
        affectedCookies: cookiesWithoutInfo.map(c => c.name),
        recommendation: 'Proporcionar información clara sobre el propósito de cada cookie',
        regulation: 'Art. 13 GDPR - Information to be provided'
      });
      assessment.score -= 15;
    }

    // 3. Verificar retención de datos
    const longRetentionCookies = cookies.filter(c => {
      const days = this.getDurationInDays(c);
      return days > 365 && c.category !== 'necessary';
    });

    if (longRetentionCookies.length > 0) {
      assessment.issues.push({
        severity: 'low',
        code: 'GDPR_003',
        issue: 'Períodos de retención excesivos',
        description: `${longRetentionCookies.length} cookies con retención superior a 1 año`,
        affectedCookies: longRetentionCookies.map(c => ({
          name: c.name,
          duration: this.getDurationInDays(c) + ' días'
        })),
        recommendation: 'Revisar y justificar los períodos largos de retención',
        regulation: 'Art. 5(1)(e) GDPR - Storage limitation'
      });
      assessment.score -= 10;
    }

    // 4. Verificar transferencias internacionales
    const internationalCookies = cookies.filter(c => this.isInternationalTransfer(c));
    
    if (internationalCookies.length > 0) {
      assessment.issues.push({
        severity: 'medium',
        code: 'GDPR_004',
        issue: 'Posibles transferencias internacionales',
        description: `${internationalCookies.length} cookies de vendors con posibles transferencias fuera de la UE`,
        affectedCookies: internationalCookies.map(c => c.name),
        recommendation: 'Verificar salvaguardas para transferencias internacionales',
        regulation: 'Capítulo V GDPR - Transfers to third countries'
      });
      assessment.score -= 20;
    }

    assessment.score = Math.max(assessment.score, 0);
    return assessment;
  }

  async assessCCPACompliance(cookies) {
    const assessment = {
      compliant: true,
      score: 100,
      issues: []
    };

    // 1. Verificar venta de información personal
    const marketingCookies = cookies.filter(c => c.category === 'marketing');
    
    if (marketingCookies.length > 0) {
      assessment.issues.push({
        severity: 'medium',
        code: 'CCPA_001',
        issue: 'Cookies de marketing detectadas',
        description: `${marketingCookies.length} cookies que podrían constituir "venta" bajo CCPA`,
        affectedCookies: marketingCookies.map(c => c.name),
        recommendation: 'Implementar mecanismo "Do Not Sell" si es aplicable',
        regulation: 'CCPA § 1798.135 - Right to opt-out'
      });
      assessment.score -= 20;
    }

    // 2. Verificar derechos del consumidor
    const trackingCookies = cookies.filter(c => 
      c.isThirdParty && (c.category === 'analytics' || c.category === 'marketing')
    );

    if (trackingCookies.length > 0) {
      assessment.issues.push({
        severity: 'low',
        code: 'CCPA_002',
        issue: 'Tracking de terceros detectado',
        description: `${trackingCookies.length} cookies de terceros para tracking`,
        affectedCookies: trackingCookies.map(c => c.name),
        recommendation: 'Asegurar que los consumidores pueden ejercer sus derechos de privacidad',
        regulation: 'CCPA § 1798.100 - Right to know'
      });
      assessment.score -= 10;
    }

    assessment.score = Math.max(assessment.score, 0);
    return assessment;
  }

  async assessPECRCompliance(cookies) {
    const assessment = {
      compliant: true,
      score: 100,
      issues: []
    };

    // PECR requiere consentimiento para cookies no esenciales
    const nonEssentialCookies = cookies.filter(c => c.category !== 'necessary');
    
    if (nonEssentialCookies.length > 0) {
      assessment.issues.push({
        severity: 'high',
        code: 'PECR_001',
        issue: 'Cookies no esenciales requieren consentimiento',
        description: `${nonEssentialCookies.length} cookies detectadas que requieren consentimiento bajo PECR`,
        affectedCookies: nonEssentialCookies.map(c => c.name),
        recommendation: 'Obtener consentimiento específico antes de establecer cookies no esenciales',
        regulation: 'PECR Regulation 6 - Restrictions on the use of electronic communications networks'
      });
      assessment.score -= 40;
    }

    assessment.score = Math.max(assessment.score, 0);
    return assessment;
  }

  async assessLGPDCompliance(cookies) {
    const assessment = {
      compliant: true,
      score: 100,
      issues: []
    };

    // Similar a GDPR pero con especificidades brasileñas
    const personalDataCookies = cookies.filter(c => 
      c.category !== 'necessary' && this.containsPersonalData(c)
    );

    if (personalDataCookies.length > 0) {
      assessment.issues.push({
        severity: 'high',
        code: 'LGPD_001',
        issue: 'Procesamiento de datos personales sin base legal',
        description: `${personalDataCookies.length} cookies procesando posibles datos personales`,
        affectedCookies: personalDataCookies.map(c => c.name),
        recommendation: 'Verificar base legal para el tratamiento de datos personales',
        regulation: 'LGPD Art. 7 - Base legal para el tratamiento'
      });
      assessment.score -= 35;
    }

    assessment.score = Math.max(assessment.score, 0);
    return assessment;
  }

  assessPrivacy(scanData) {
    const privacy = {
      trackingLevel: this.assessTrackingLevel(scanData.cookies),
      dataSharing: this.assessDataSharing(scanData.cookies),
      crossSiteTracking: this.detectCrossSiteTracking(scanData),
      fingerprinting: this.assessFingerprinting(scanData),
      dataMinimization: this.assessDataMinimization(scanData.cookies),
      transparencyScore: this.calculateTransparencyScore(scanData.cookies)
    };

    // Calcular score de privacidad general (0-100)
    const scores = [
      this.trackingLevelToScore(privacy.trackingLevel),
      privacy.dataSharing.score || 80,
      privacy.crossSiteTracking.score || 80,
      privacy.fingerprinting.score || 80,
      privacy.dataMinimization.score || 80,
      privacy.transparencyScore
    ];

    privacy.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    privacy.privacyRating = this.getPrivacyRating(privacy.overallScore);

    return privacy;
  }

  assessTrackingLevel(cookies) {
    const trackingCookies = cookies.filter(c => 
      c.category === 'marketing' || c.category === 'analytics'
    );
    
    const thirdPartyTracking = cookies.filter(c => 
      c.isThirdParty && (c.category === 'marketing' || c.category === 'analytics')
    );

    if (thirdPartyTracking.length > 10) return 'invasive';
    if (thirdPartyTracking.length > 5) return 'extensive';
    if (trackingCookies.length > 3) return 'moderate';
    return 'minimal';
  }

  assessDataSharing(cookies) {
    const thirdPartyCookies = cookies.filter(c => c.isThirdParty);
    const uniqueVendors = new Set(thirdPartyCookies.map(c => c.vendor?.name).filter(Boolean));
    
    return {
      detected: thirdPartyCookies.length > 0,
      partnerCount: uniqueVendors.size,
      partners: Array.from(uniqueVendors),
      score: Math.max(100 - (uniqueVendors.size * 10), 0)
    };
  }

  detectCrossSiteTracking(scanData) {
    const crossSiteDomains = new Set();
    
    scanData.cookies.forEach(cookie => {
      if (cookie.isThirdParty && cookie.domain) {
        crossSiteDomains.add(cookie.domain);
      }
    });

    return {
      detected: crossSiteDomains.size > 0,
      domainCount: crossSiteDomains.size,
      domains: Array.from(crossSiteDomains),
      score: Math.max(100 - (crossSiteDomains.size * 15), 0)
    };
  }

  assessFingerprinting(scanData) {
    const fingerprinting = scanData.pageData?.fingerprinting || {};
    const techniques = [];
    
    if (fingerprinting.canvas) techniques.push('Canvas Fingerprinting');
    if (fingerprinting.webgl) techniques.push('WebGL Fingerprinting');
    if (fingerprinting.audioContext) techniques.push('Audio Fingerprinting');
    
    return {
      detected: techniques.length > 0,
      techniques,
      score: Math.max(100 - (techniques.length * 30), 0)
    };
  }

  assessDataMinimization(cookies) {
    // Evaluar si se están recolectando datos mínimos necesarios
    const unnecessaryCookies = cookies.filter(c => {
      // Cookies con valores muy largos o aparentemente excesivos
      return c.value && c.value.length > 1000;
    });

    const duplicatePurposes = this.findDuplicatePurposes(cookies);

    return {
      score: Math.max(100 - (unnecessaryCookies.length * 10) - (duplicatePurposes.length * 5), 0),
      issues: [
        ...unnecessaryCookies.map(c => `Cookie con valor excesivo: ${c.name}`),
        ...duplicatePurposes.map(p => `Propósito duplicado: ${p}`)
      ]
    };
  }

  calculateTransparencyScore(cookies) {
    const withDescription = cookies.filter(c => c.enrichedData?.description).length;
    const withVendor = cookies.filter(c => c.vendor?.name).length;
    const total = cookies.length;

    if (total === 0) return 100;

    const descriptionScore = (withDescription / total) * 50;
    const vendorScore = (withVendor / total) * 50;

    return Math.round(descriptionScore + vendorScore);
  }

  processCookiesForReport(cookies) {
    return cookies.map(cookie => ({
      // Información básica
      name: cookie.name,
      value: this.sanitizeValue(cookie.value),
      domain: cookie.domain,
      path: cookie.path || '/',
      
      // Clasificación
      category: cookie.category || 'unknown',
      categoryConfidence: cookie.categoryConfidence || 0,
      
      // Vendor
      vendor: cookie.vendor ? {
        id: cookie.vendor.id,
        name: cookie.vendor.name,
        confidence: cookie.vendor.confidence,
        detectionMethod: cookie.vendor.detectionMethod
      } : null,
      
      // Propiedades
      expires: cookie.expires,
      maxAge: cookie.maxAge,
      size: cookie.size || (cookie.value ? cookie.value.length : 0),
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || '',
      
      // Análisis
      isThirdParty: cookie.isThirdParty || false,
      isPersistent: cookie.isPersistent || false,
      estimatedRisk: cookie.analysis?.estimatedRisk || 'unknown',
      
      // Metadata
      source: cookie.source,
      detectionMethod: cookie.detectionMethod,
      firstSeen: cookie.timestamp,
      
      // Información enriquecida
      purpose: cookie.enrichedData?.description,
      dataController: cookie.vendor?.name,
      privacyPolicy: cookie.enrichedData?.privacyPolicy,
      retentionPeriod: this.formatDuration(cookie),
      
      // Compliance
      requiresConsent: this.requiresConsent(cookie),
      legalBasis: this.determineLegalBasis(cookie),
      
      // Recomendaciones
      recommendations: this.generateCookieRecommendations(cookie)
    }));
  }

  analyzeTechnologies(scanData) {
    const technologies = {
      detected: Array.from(scanData.technologies || []),
      analytics: [],
      advertising: [],
      social: [],
      other: []
    };

    // Categorizar tecnologías
    technologies.detected.forEach(tech => {
      const lowerTech = tech.toLowerCase();
      if (lowerTech.includes('analytics') || lowerTech.includes('google analytics')) {
        technologies.analytics.push(tech);
      } else if (lowerTech.includes('ads') || lowerTech.includes('facebook') || 
                 lowerTech.includes('pixel') || lowerTech.includes('doubleclick')) {
        technologies.advertising.push(tech);
      } else if (lowerTech.includes('social') || lowerTech.includes('twitter') || 
                 lowerTech.includes('linkedin') || lowerTech.includes('pinterest')) {
        technologies.social.push(tech);
      } else {
        technologies.other.push(tech);
      }
    });

    return technologies;
  }

  generateRecommendations(scanData) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    const cookies = scanData.cookies;
    const highRiskCookies = cookies.filter(c => c.analysis?.estimatedRisk === 'high');
    const unknownCookies = cookies.filter(c => c.category === 'unknown');
    const thirdPartyCookies = cookies.filter(c => c.isThirdParty);

    // Recomendaciones inmediatas
    if (highRiskCookies.length > 0) {
      recommendations.immediate.push({
        priority: 'high',
        title: 'Revisar cookies de alto riesgo',
        description: `${highRiskCookies.length} cookies clasificadas como alto riesgo requieren revisión inmediata`,
        action: 'Implementar gestión de consentimiento para cookies de marketing y tracking',
        impact: 'Cumplimiento legal y reducción de riesgo de privacidad'
      });
    }

    if (unknownCookies.length > 5) {
      recommendations.immediate.push({
        priority: 'medium',
        title: 'Clasificar cookies desconocidas',
        description: `${unknownCookies.length} cookies sin clasificar`,
        action: 'Investigar y documentar el propósito de cada cookie',
        impact: 'Mejora en transparencia y cumplimiento'
      });
    }

    // Recomendaciones a corto plazo
    if (thirdPartyCookies.length > 10) {
      recommendations.shortTerm.push({
        priority: 'medium',
        title: 'Optimizar cookies de terceros',
        description: `Alto número de cookies de terceros (${thirdPartyCookies.length})`,
        action: 'Evaluar necesidad de cada servicio de terceros y considerar alternativas',
        impact: 'Mejora en rendimiento y privacidad'
      });
    }

    recommendations.shortTerm.push({
      priority: 'low',
      title: 'Implementar auditoría regular',
      description: 'Establecer proceso de revisión periódica de cookies',
      action: 'Configurar escaneos automáticos mensuales',
      impact: 'Mantenimiento continuo del cumplimiento'
    });

    // Recomendaciones a largo plazo
    recommendations.longTerm.push({
      priority: 'low',
      title: 'Evaluar alternativas privacy-first',
      description: 'Considerar tecnologías que respeten más la privacidad',
      action: 'Investigar analytics server-side y contextos sin cookies',
      impact: 'Liderazgo en privacidad y preparación para futuras regulaciones'
    });

    return recommendations;
  }

  assessRisk(scanData) {
    const cookies = scanData.cookies;
    let riskScore = 0;
    const riskFactors = [];

    // Factor 1: Cookies de alto riesgo
    const highRiskCount = cookies.filter(c => c.analysis?.estimatedRisk === 'high').length;
    const highRiskPenalty = highRiskCount * 10;
    riskScore += highRiskPenalty;
    if (highRiskCount > 0) {
      riskFactors.push(`${highRiskCount} cookies de alto riesgo (+${highRiskPenalty})`);
    }

    // Factor 2: Cookies de terceros
    const thirdPartyCount = cookies.filter(c => c.isThirdParty).length;
    const thirdPartyPenalty = Math.min(thirdPartyCount * 2, 30);
    riskScore += thirdPartyPenalty;
    if (thirdPartyCount > 0) {
      riskFactors.push(`${thirdPartyCount} cookies de terceros (+${thirdPartyPenalty})`);
    }

    // Factor 3: Cookies sin clasificar
    const unknownCount = cookies.filter(c => c.category === 'unknown').length;
    const unknownPenalty = unknownCount * 3;
    riskScore += unknownPenalty;
    if (unknownCount > 0) {
      riskFactors.push(`${unknownCount} cookies sin clasificar (+${unknownPenalty})`);
    }

    // Factor 4: Retención excesiva
    const longRetentionCount = cookies.filter(c => this.getDurationInDays(c) > 365).length;
    const retentionPenalty = longRetentionCount * 5;
    riskScore += retentionPenalty;
    if (longRetentionCount > 0) {
      riskFactors.push(`${longRetentionCount} cookies con retención >1 año (+${retentionPenalty})`);
    }

    return {
      score: Math.min(riskScore, 100),
      level: this.getRiskLevel(riskScore),
      factors: riskFactors,
      recommendation: this.getRiskRecommendation(riskScore)
    };
  }

  // Utility methods
  getDurationInDays(cookie) {
    if (cookie.maxAge) {
      return cookie.maxAge / (24 * 60 * 60);
    }
    if (cookie.expires) {
      const now = new Date();
      const expires = new Date(cookie.expires);
      return (expires - now) / (1000 * 60 * 60 * 24);
    }
    return 0;
  }

  formatDuration(cookie) {
    const days = this.getDurationInDays(cookie);
    if (days === 0) return 'Sesión';
    if (days < 1) return `${Math.round(days * 24)} horas`;
    if (days < 30) return `${Math.round(days)} días`;
    if (days < 365) return `${Math.round(days / 30)} meses`;
    return `${Math.round(days / 365)} años`;
  }

  sanitizeValue(value) {
    if (!value) return '';
    if (value.length > 100) return value.substring(0, 100) + '...';
    return value;
  }

  requiresConsent(cookie) {
    return cookie.category !== 'necessary';
  }

  determineLegalBasis(cookie) {
    switch (cookie.category) {
      case 'necessary':
        return 'Legitimate interest';
      case 'analytics':
        return 'Consent / Legitimate interest';
      case 'marketing':
        return 'Consent';
      default:
        return 'Consent';
    }
  }

  generateCookieRecommendations(cookie) {
    const recommendations = [];

    if (cookie.category === 'unknown') {
      recommendations.push('Investigar y documentar el propósito de esta cookie');
    }

    if (cookie.isThirdParty && cookie.category === 'marketing') {
      recommendations.push('Verificar que se obtiene consentimiento antes de establecer esta cookie');
    }

    if (!cookie.secure && cookie.isThirdParty) {
      recommendations.push('Considerar usar el flag Secure para mayor seguridad');
    }

    if (this.getDurationInDays(cookie) > 365) {
      recommendations.push('Evaluar si el período de retención es necesario y proporcional');
    }

    return recommendations;
  }

  isInternationalTransfer(cookie) {
    // Lista simplificada de vendors con transferencias internacionales conocidas
    const internationalVendors = ['google', 'facebook', 'amazon', 'microsoft'];
    return cookie.vendor && internationalVendors.includes(cookie.vendor.id);
  }

  containsPersonalData(cookie) {
    // Heurística simple para detectar datos personales
    if (cookie.category === 'marketing' || cookie.category === 'analytics') return true;
    if (cookie.name.toLowerCase().includes('user') || 
        cookie.name.toLowerCase().includes('id') ||
        cookie.name.toLowerCase().includes('track')) return true;
    return false;
  }

  findDuplicatePurposes(cookies) {
    const purposes = new Map();
    cookies.forEach(cookie => {
      if (cookie.enrichedData?.purpose) {
        const purpose = cookie.enrichedData.purpose;
        if (!purposes.has(purpose)) {
          purposes.set(purpose, []);
        }
        purposes.get(purpose).push(cookie.name);
      }
    });

    return Array.from(purposes.entries())
      .filter(([purpose, cookies]) => cookies.length > 1)
      .map(([purpose, cookies]) => purpose);
  }

  trackingLevelToScore(level) {
    switch (level) {
      case 'minimal': return 90;
      case 'moderate': return 70;
      case 'extensive': return 40;
      case 'invasive': return 10;
      default: return 50;
    }
  }

  getPrivacyRating(score) {
    if (score >= 90) return 'Excelente';
    if (score >= 75) return 'Buena';
    if (score >= 60) return 'Aceptable';
    if (score >= 40) return 'Mejorable';
    return 'Deficiente';
  }

  getRiskLevel(score) {
    if (score >= 75) return 'Alto';
    if (score >= 50) return 'Medio';
    if (score >= 25) return 'Bajo';
    return 'Mínimo';
  }

  getRiskRecommendation(score) {
    if (score >= 75) return 'Acción inmediata requerida para reducir riesgos de cumplimiento';
    if (score >= 50) return 'Se recomienda revisar y optimizar la estrategia de cookies';
    if (score >= 25) return 'Realizar seguimiento regular del cumplimiento';
    return 'Mantener las buenas prácticas actuales';
  }

  loadComplianceRules() {
    // Cargar reglas de cumplimiento específicas
    return {
      gdpr: {
        maxRetentionDays: 365,
        requiresConsentCategories: ['analytics', 'marketing', 'social'],
        prohibitedWithoutConsent: ['marketing']
      },
      ccpa: {
        optOutRequired: ['marketing'],
        disclosureRequired: ['analytics', 'marketing']
      }
    };
  }
}

module.exports = ComprehensiveReportGenerator;