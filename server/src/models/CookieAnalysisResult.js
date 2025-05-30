const mongoose = require('mongoose');

// Esquema para resultados detallados de análisis de cookies
const cookieAnalysisResultSchema = new mongoose.Schema({
  // Información del análisis
  scanId: {
    type: String,
    unique: true,
    index: true
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
    index: true
  },
  domain: {
    type: String,
    required: true
  },
  
  // Estado del análisis
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Configuración del análisis
  analysisConfig: {
    scanType: {
      type: String,
      enum: ['quick', 'full', 'deep', 'custom'],
      default: 'full'
    },
    includeSubdomains: {
      type: Boolean,
      default: true
    },
    maxUrls: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    depth: {
      type: Number,
      default: 5,
      min: 1,
      max: 10
    },
    timeout: {
      type: Number,
      default: 30000
    },
    retries: {
      type: Number,
      default: 3
    },
    userAgent: String,
    viewport: {
      width: { type: Number, default: 1920 },
      height: { type: Number, default: 1080 }
    },
    acceptLanguages: [String],
    excludePatterns: [String],
    includePatterns: [String]
  },
  
  // Progreso del análisis
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentPhase: {
      type: String,
      enum: ['initialization', 'discovery', 'analysis', 'processing', 'finalization'],
      default: 'initialization'
    },
    currentStep: String,
    currentUrl: String,
    urlsDiscovered: {
      type: Number,
      default: 0
    },
    urlsAnalyzed: {
      type: Number,
      default: 0
    },
    urlsTotal: {
      type: Number,
      default: 0
    },
    startTime: Date,
    endTime: Date,
    estimatedTimeRemaining: Number,
    errors: [{
      url: String,
      error: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // URLs descubiertas y analizadas
  discoveredUrls: [{
    url: String,
    depth: Number,
    foundOn: String,
    analyzed: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Cookies encontradas
  cookies: [{
    // Información básica de la cookie
    name: { type: String, required: true },
    value: String,
    domain: String,
    path: String,
    
    // Atributos de seguridad
    secure: Boolean,
    httpOnly: Boolean,
    sameSite: {
      type: String,
      enum: ['Strict', 'Lax', 'None', null]
    },
    
    // Tiempo de vida
    expires: Date,
    maxAge: Number,
    session: Boolean,
    duration: {
      type: String,
      enum: ['session', 'persistent', 'long-term']
    },
    
    // Clasificación
    category: {
      type: String,
      enum: ['necessary', 'functional', 'analytics', 'advertising', 'social', 'performance', 'unknown'],
      default: 'unknown'
    },
    isFirstParty: Boolean,
    
    // Análisis avanzado
    purpose: String,
    description: String,
    provider: {
      name: String,
      domain: String,
      category: String,
      privacyPolicy: String
    },
    
    // Tracking
    foundOnUrls: [String],
    sourceScript: {
      url: String,
      type: String,
      inline: Boolean
    },
    
    // Tamaño y complejidad
    size: Number,
    complexity: {
      type: String,
      enum: ['simple', 'encoded', 'encrypted', 'complex']
    },
    
    // Metadatos
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    frequency: Number,
    
    // Análisis de contenido
    containsPII: Boolean,
    containsTrackingData: Boolean,
    encrypted: Boolean,
    
    // Compliance
    gdprCompliant: Boolean,
    ccpaCompliant: Boolean,
    requiredForFunctionality: Boolean
  }],
  
  // Scripts analizados
  scripts: [{
    url: String,
    type: {
      type: String,
      enum: ['inline', 'external', 'module', 'worker']
    },
    category: {
      type: String,
      enum: ['analytics', 'advertising', 'social', 'functionality', 'security', 'unknown']
    },
    provider: {
      name: String,
      domain: String
    },
    size: Number,
    loadType: {
      type: String,
      enum: ['sync', 'async', 'defer']
    },
    foundOnUrls: [String],
    cookiesSet: [String],
    hasTracking: Boolean,
    hasConsent: Boolean,
    consentMethod: String
  }],
  
  // Tecnologías detectadas
  technologies: [{
    name: String,
    category: String,
    version: String,
    confidence: Number,
    source: String
  }],
  
  // CMPs detectados
  consentManagement: {
    detected: Boolean,
    platforms: [{
      name: String,
      version: String,
      vendor: String,
      tcfCompliant: Boolean,
      iabVendors: [Number],
      purposes: [Number],
      legitimateInterests: [Number]
    }],
    consentString: String,
    consentStatus: {
      analytics: Boolean,
      advertising: Boolean,
      functional: Boolean,
      necessary: Boolean
    }
  },
  
  // Análisis de storage
  localStorage: [{
    key: String,
    value: String,
    size: Number,
    containsPII: Boolean,
    purpose: String
  }],
  
  sessionStorage: [{
    key: String,
    value: String,
    size: Number,
    containsPII: Boolean,
    purpose: String
  }],
  
  indexedDB: [{
    database: String,
    objectStore: String,
    keyPath: String,
    size: Number,
    recordCount: Number
  }],
  
  // Análisis de tráfico
  networkRequests: [{
    url: String,
    method: String,
    type: String,
    initiator: String,
    responseHeaders: mongoose.Schema.Types.Mixed,
    requestHeaders: mongoose.Schema.Types.Mixed,
    timing: {
      start: Number,
      end: Number,
      duration: Number
    },
    size: Number,
    trackingPurpose: String
  }],
  
  // Píxeles de tracking
  trackingPixels: [{
    url: String,
    type: String,
    provider: String,
    purpose: String,
    foundOnUrls: [String]
  }],
  
  // Análisis de formularios
  forms: [{
    action: String,
    method: String,
    fields: [{
      name: String,
      type: String,
      required: Boolean,
      containsPII: Boolean
    }],
    hasTrackingScripts: Boolean,
    foundOnUrl: String
  }],
  
  // Iframes analizados
  iframes: [{
    src: String,
    sandbox: [String],
    cookiesSet: [String],
    purpose: String,
    provider: String,
    foundOnUrls: [String]
  }],
  
  // Comparación con análisis anterior
  changes: {
    newCookies: [{
      name: String,
      domain: String,
      category: String,
      addedOn: { type: Date, default: Date.now }
    }],
    removedCookies: [{
      name: String,
      domain: String,
      category: String,
      removedOn: { type: Date, default: Date.now }
    }],
    modifiedCookies: [{
      name: String,
      domain: String,
      changes: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        modifiedOn: { type: Date, default: Date.now }
      }]
    }],
    newScripts: [String],
    removedScripts: [String],
    newTechnologies: [String]
  },
  
  // Estadísticas generales
  statistics: {
    totalCookies: { type: Number, default: 0 },
    firstPartyCookies: { type: Number, default: 0 },
    thirdPartyCookies: { type: Number, default: 0 },
    sessionCookies: { type: Number, default: 0 },
    persistentCookies: { type: Number, default: 0 },
    secureCookies: { type: Number, default: 0 },
    httpOnlyCookies: { type: Number, default: 0 },
    sameSiteCookies: { type: Number, default: 0 },
    
    totalScripts: { type: Number, default: 0 },
    inlineScripts: { type: Number, default: 0 },
    externalScripts: { type: Number, default: 0 },
    trackingScripts: { type: Number, default: 0 },
    
    totalRequests: { type: Number, default: 0 },
    trackingRequests: { type: Number, default: 0 },
    
    performanceMetrics: {
      totalScanTime: Number,
      averagePageLoadTime: Number,
      totalDataTransfer: Number,
      errorRate: Number
    },
    
    complianceScore: {
      gdpr: Number,
      ccpa: Number,
      overall: Number
    },
    
    riskAssessment: {
      privacyRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      complianceRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      securityRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }
  },
  
  // Recomendaciones
  recommendations: [{
    type: {
      type: String,
      enum: ['security', 'privacy', 'compliance', 'performance', 'optimization']
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    },
    title: String,
    description: String,
    action: String,
    affectedItems: [String],
    estimatedImpact: String
  }],
  
  // Metadatos del análisis
  metadata: {
    version: String,
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount'
    },
    triggerType: {
      type: String,
      enum: ['manual', 'scheduled', 'webhook', 'api']
    },
    browserVersion: String,
    userAgent: String,
    analysisEngine: String,
    processingTime: Number,
    resourceUsage: {
      memory: Number,
      cpu: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimización
cookieAnalysisResultSchema.index({ domainId: 1, status: 1 });
cookieAnalysisResultSchema.index({ 'progress.startTime': -1 });
cookieAnalysisResultSchema.index({ 'metadata.triggeredBy': 1 });
cookieAnalysisResultSchema.index({ scanId: 1 });
cookieAnalysisResultSchema.index({ domain: 1, status: 1 });

// Virtuals
cookieAnalysisResultSchema.virtual('duration').get(function() {
  if (this.progress.startTime && this.progress.endTime) {
    return Math.round((this.progress.endTime - this.progress.startTime) / 1000);
  }
  return null;
});

cookieAnalysisResultSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

cookieAnalysisResultSchema.virtual('isRunning').get(function() {
  return ['pending', 'running'].includes(this.status);
});

// Pre-save middleware
cookieAnalysisResultSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generar scanId único si no existe
    if (!this.scanId) {
      this.scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Establecer startTime si no existe
    if (!this.progress.startTime) {
      this.progress.startTime = new Date();
    }
  }
  
  // Calcular estadísticas si se completa el análisis
  if (this.isModified('status') && this.status === 'completed') {
    this.calculateStatistics();
    this.progress.endTime = new Date();
    this.progress.percentage = 100;
  }
  
  next();
});

// Métodos de instancia
cookieAnalysisResultSchema.methods = {
  // Calcular estadísticas
  calculateStatistics() {
    this.statistics.totalCookies = this.cookies.length;
    this.statistics.firstPartyCookies = this.cookies.filter(c => c.isFirstParty).length;
    this.statistics.thirdPartyCookies = this.cookies.filter(c => !c.isFirstParty).length;
    this.statistics.sessionCookies = this.cookies.filter(c => c.session).length;
    this.statistics.persistentCookies = this.cookies.filter(c => !c.session).length;
    this.statistics.secureCookies = this.cookies.filter(c => c.secure).length;
    this.statistics.httpOnlyCookies = this.cookies.filter(c => c.httpOnly).length;
    this.statistics.sameSiteCookies = this.cookies.filter(c => c.sameSite).length;
    
    this.statistics.totalScripts = this.scripts.length;
    this.statistics.inlineScripts = this.scripts.filter(s => s.type === 'inline').length;
    this.statistics.externalScripts = this.scripts.filter(s => s.type === 'external').length;
    this.statistics.trackingScripts = this.scripts.filter(s => s.hasTracking).length;
    
    this.statistics.totalRequests = this.networkRequests.length;
    this.statistics.trackingRequests = this.networkRequests.filter(r => r.trackingPurpose).length;
    
    // Calcular métricas de rendimiento
    if (this.progress.startTime && this.progress.endTime) {
      this.statistics.performanceMetrics.totalScanTime = 
        (this.progress.endTime - this.progress.startTime) / 1000;
    }
    
    this.statistics.performanceMetrics.errorRate = 
      this.progress.errors.length / Math.max(this.progress.urlsAnalyzed, 1);
  },
  
  // Actualizar progreso
  updateProgress(phase, step, percentage, url = null) {
    this.progress.currentPhase = phase;
    this.progress.currentStep = step;
    this.progress.percentage = Math.min(percentage, 100);
    
    if (url) {
      this.progress.currentUrl = url;
    }
    
    // Calcular tiempo estimado restante
    if (this.progress.startTime && percentage > 5) {
      const elapsed = (Date.now() - this.progress.startTime) / 1000;
      const totalEstimated = (elapsed / percentage) * 100;
      this.progress.estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed);
    }
    
    return this.save();
  },
  
  // Añadir error
  addError(url, error) {
    this.progress.errors.push({
      url,
      error: error.message || error,
      timestamp: new Date()
    });
    
    return this.save();
  },
  
  // Añadir cookie
  addCookie(cookieData) {
    // Verificar si la cookie ya existe
    const existingIndex = this.cookies.findIndex(
      c => c.name === cookieData.name && c.domain === cookieData.domain
    );
    
    if (existingIndex !== -1) {
      // Actualizar cookie existente
      this.cookies[existingIndex] = { ...this.cookies[existingIndex], ...cookieData };
      this.cookies[existingIndex].lastSeen = new Date();
      this.cookies[existingIndex].frequency++;
    } else {
      // Añadir nueva cookie
      this.cookies.push({
        ...cookieData,
        firstSeen: new Date(),
        lastSeen: new Date(),
        frequency: 1
      });
    }
  },
  
  // Generar reporte de compliance
  generateComplianceReport() {
    const necessaryCookies = this.cookies.filter(c => c.category === 'necessary');
    const analyticsCookies = this.cookies.filter(c => c.category === 'analytics');
    const advertisingCookies = this.cookies.filter(c => c.category === 'advertising');
    
    return {
      summary: {
        totalCookies: this.statistics.totalCookies,
        necessaryCookies: necessaryCookies.length,
        analyticsCookies: analyticsCookies.length,
        advertisingCookies: advertisingCookies.length,
        complianceScore: this.statistics.complianceScore
      },
      gdprIssues: this.recommendations.filter(r => r.type === 'compliance'),
      securityIssues: this.recommendations.filter(r => r.type === 'security'),
      recommendations: this.recommendations
    };
  }
};

// Métodos estáticos
cookieAnalysisResultSchema.statics = {
  // Obtener análisis activo para un dominio
  async getActiveAnalysis(domainId) {
    return this.findOne({
      domainId,
      status: { $in: ['pending', 'running'] }
    });
  },
  
  // Obtener último análisis completado
  async getLastCompletedAnalysis(domainId) {
    return this.findOne({
      domainId,
      status: 'completed'
    }).sort({ 'progress.endTime': -1 });
  },
  
  // Obtener tendencias de cookies
  async getCookieTrends(domainId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          status: 'completed',
          'progress.endTime': { $gte: startDate }
        }
      },
      {
        $sort: { 'progress.endTime': 1 }
      },
      {
        $project: {
          date: '$progress.endTime',
          totalCookies: '$statistics.totalCookies',
          firstPartyCookies: '$statistics.firstPartyCookies',
          thirdPartyCookies: '$statistics.thirdPartyCookies',
          complianceScore: '$statistics.complianceScore.overall'
        }
      }
    ]);
  }
};

module.exports = mongoose.model('CookieAnalysisResult', cookieAnalysisResultSchema);