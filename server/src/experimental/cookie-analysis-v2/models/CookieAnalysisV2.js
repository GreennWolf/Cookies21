const mongoose = require('mongoose');

// Modelo mejorado para análisis de cookies V2
const cookieAnalysisV2Schema = new mongoose.Schema({
  // Información básica del escaneo
  scanId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  
  // Metadatos del escaneo
  scanDate: {
    type: Date,
    default: Date.now
  },
  scanDuration: {
    type: Number, // milliseconds
    required: true
  },
  scannerVersion: {
    type: String,
    default: '2.0.0'
  },
  
  // Resumen del escaneo
  summary: {
    total: { type: Number, default: 0 },
    byCategory: {
      necessary: { type: Number, default: 0 },
      analytics: { type: Number, default: 0 },
      marketing: { type: Number, default: 0 },
      functional: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 }
    },
    bySource: {
      httpHeaders: { type: Number, default: 0 },
      javascript: { type: Number, default: 0 },
      localStorage: { type: Number, default: 0 },
      sessionStorage: { type: Number, default: 0 },
      indexedDB: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      // Nuevos tipos para detección avanzada
      requestHeaders: { type: Number, default: 0 },
      responseHeaders: { type: Number, default: 0 },
      dynamic: { type: Number, default: 0 },
      browserAPI: { type: Number, default: 0 },
      domainSpecific: { type: Number, default: 0 },
      documentCookie: { type: Number, default: 0 },
      iframe: { type: Number, default: 0 },
      webSQL: { type: Number, default: 0 },
      cacheAPI: { type: Number, default: 0 },
      serviceWorker: { type: Number, default: 0 },
      // ULTRA ADVANCED tipos
      cdpGetAllCookies: { type: Number, default: 0 },
      pageCookies: { type: Number, default: 0 },
      multiDomain: { type: Number, default: 0 },
      javascriptMonitor: { type: Number, default: 0 },
      thirdParty: { type: Number, default: 0 },
      frameViaCDP: { type: Number, default: 0 },
      ultraDynamicCollection: { type: Number, default: 0 },
      ultraStorageScan: { type: Number, default: 0 },
      ultraDocumentCookie: { type: Number, default: 0 },
      ultraIframeScan: { type: Number, default: 0 },
      cdpNetwork: { type: Number, default: 0 },
      cdpDomainSpecific: { type: Number, default: 0 },
      cdpThirdPartyDetection: { type: Number, default: 0 },
      cdpFrameAnalysis: { type: Number, default: 0 },
      ultraRuntimeMonitoring: { type: Number, default: 0 },
      // SuperFastScanner specific counters
      jsMonitor: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      spaNavigation: { type: Number, default: 0 },
      frameDetection: { type: Number, default: 0 },
      directCookie: { type: Number, default: 0 },
      storageDetection: { type: Number, default: 0 },
      networkCapture: { type: Number, default: 0 },
      dynamicTracking: { type: Number, default: 0 }
    },
    byVendor: [{
      vendorId: String,
      vendorName: String,
      count: Number
    }],
    byRisk: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 }
    }
  },
  
  // Cookies detectadas
  cookies: [{
    // Información básica
    name: { type: String, required: true },
    value: String,
    domain: String,
    path: { type: String, default: '/' },
    
    // Propiedades
    expires: Date,
    maxAge: Number,
    size: Number,
    httpOnly: { type: Boolean, default: false },
    secure: { type: Boolean, default: false },
    sameSite: { type: String, enum: ['Strict', 'Lax', 'None', ''], default: '' },
    
    // Clasificación
    category: {
      type: String,
      enum: ['necessary', 'analytics', 'marketing', 'functional', 'social', 'unknown'],
      default: 'unknown'
    },
    categoryConfidence: { type: Number, default: 0 },
    
    // Vendor
    vendor: {
      id: String,
      name: String,
      confidence: Number,
      detectionMethod: String
    },
    
    // Análisis avanzado
    analysis: {
      isThirdParty: { type: Boolean, default: false },
      isPersistent: { type: Boolean, default: false },
      estimatedRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'unknown'],
        default: 'unknown'
      },
      dataTypes: [String], // ['personal', 'behavioral', 'technical', etc.]
      purposes: [String], // ['tracking', 'analytics', 'advertising', etc.]
    },
    
    // Metadata de detección
    source: {
      type: String,
      enum: [
        'httpHeaders', 'javascript', 'localStorage', 'sessionStorage', 'indexedDB', 'other',
        // Nuevos tipos de fuente para detección avanzada
        'requestHeaders', 'responseHeaders', 'dynamic', 'browserAPI', 'domainSpecific', 
        'documentCookie', 'iframe', 'webSQL', 'cacheAPI', 'serviceWorker',
        // ULTRA ADVANCED tipos de fuente
        'cdpGetAllCookies', 'pageCookies', 'multiDomain', 'javascriptMonitor', 'thirdParty',
        'frameViaCDP', 'ultraDynamicCollection', 'ultraStorageScan', 'ultraDocumentCookie',
        'ultraIframeScan', 'cdpNetwork', 'cdpDomainSpecific', 'cdpThirdPartyDetection',
        'cdpFrameAnalysis', 'ultraRuntimeMonitoring',
        // SuperFastScanner specific sources
        'jsMonitor', 'storage', 'spaNavigation', 'frameDetection', 'directCookie',
        'storageDetection', 'networkCapture', 'dynamicTracking'
      ],
      required: true
    },
    detectionMethod: String,
    firstSeen: { type: Date, default: Date.now },
    
    // Información enriquecida
    enrichedData: {
      description: String,
      dataController: String,
      privacyPolicy: String,
      retentionPeriod: String,
      legalBasis: String,
      requiresConsent: { type: Boolean, default: true }
    },
    
    // Recomendaciones
    recommendations: [String]
  }],
  
  // Análisis de cumplimiento
  compliance: {
    gdpr: {
      compliant: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      issues: [{ 
        severity: String,
        issue: String,
        recommendation: String
      }]
    },
    ccpa: {
      compliant: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      issues: [{ 
        severity: String,
        issue: String,
        recommendation: String
      }]
    },
    pecr: {
      compliant: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      issues: [{ 
        severity: String,
        issue: String,
        recommendation: String
      }]
    }
  },
  
  // Análisis de privacidad
  privacy: {
    trackingLevel: {
      type: String,
      enum: ['minimal', 'moderate', 'extensive', 'invasive'],
      default: 'unknown'
    },
    dataSharing: {
      detected: { type: Boolean, default: false },
      partners: [String]
    },
    crossSiteTracking: {
      detected: { type: Boolean, default: false },
      domains: [String]
    },
    fingerprinting: {
      detected: { type: Boolean, default: false },
      techniques: [String]
    }
  },
  
  // Tecnologías detectadas
  technologies: {
    analytics: [String],
    advertising: [String],
    social: [String],
    marketing: [String],
    other: [String]
  },
  
  // Comparación con sistema actual (si disponible)
  comparison: {
    previousSystemFound: { type: Number, default: 0 },
    onlyInV2: { type: Number, default: 0 },
    onlyInPrevious: { type: Number, default: 0 },
    accuracyImprovement: Number
  },
  
  // Status del escaneo
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Logs y errores
  logs: [String],
  errors: [String]
  
}, {
  timestamps: true
});

// Índices para optimizar consultas
cookieAnalysisV2Schema.index({ domain: 1, scanDate: -1 });
cookieAnalysisV2Schema.index({ scanId: 1 });
cookieAnalysisV2Schema.index({ status: 1 });
cookieAnalysisV2Schema.index({ 'cookies.category': 1 });
cookieAnalysisV2Schema.index({ 'cookies.vendor.id': 1 });

// Métodos del esquema
cookieAnalysisV2Schema.methods.addCookie = function(cookieData) {
  this.cookies.push(cookieData);
  this.updateSummary();
};

cookieAnalysisV2Schema.methods.updateSummary = function() {
  this.summary.total = this.cookies.length;
  
  // Reset contadores
  Object.keys(this.summary.byCategory).forEach(cat => {
    this.summary.byCategory[cat] = 0;
  });
  Object.keys(this.summary.bySource).forEach(src => {
    this.summary.bySource[src] = 0;
  });
  Object.keys(this.summary.byRisk).forEach(risk => {
    this.summary.byRisk[risk] = 0;
  });
  
  // Contar cookies por categoría, fuente y riesgo
  this.cookies.forEach(cookie => {
    if (this.summary.byCategory[cookie.category] !== undefined) {
      this.summary.byCategory[cookie.category]++;
    }
    if (this.summary.bySource[cookie.source] !== undefined) {
      this.summary.bySource[cookie.source]++;
    }
    if (this.summary.byRisk[cookie.analysis.estimatedRisk] !== undefined) {
      this.summary.byRisk[cookie.analysis.estimatedRisk]++;
    }
  });
};

cookieAnalysisV2Schema.methods.generateReport = function() {
  return {
    scanId: this.scanId,
    domain: this.domain,
    scanDate: this.scanDate,
    summary: this.summary,
    compliance: this.compliance,
    privacy: this.privacy,
    technologies: this.technologies,
    totalCookies: this.cookies.length,
    riskScore: this.calculateRiskScore()
  };
};

cookieAnalysisV2Schema.methods.calculateRiskScore = function() {
  const weights = { low: 1, medium: 3, high: 5, unknown: 2 };
  let totalScore = 0;
  let totalCookies = 0;
  
  Object.entries(this.summary.byRisk).forEach(([risk, count]) => {
    totalScore += (weights[risk] || 0) * count;
    totalCookies += count;
  });
  
  return totalCookies > 0 ? Math.round((totalScore / totalCookies) * 20) : 0; // 0-100 score
};

module.exports = mongoose.model('CookieAnalysisV2', cookieAnalysisV2Schema, 'cookie_analysis_v2');