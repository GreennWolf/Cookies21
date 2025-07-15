// models/IntelligentCookieResult.js
const mongoose = require('mongoose');

/**
 * Esquema para almacenar resultados del análisis inteligente de cookies
 * Incluye clasificación automática, detección de vendors y cumplimiento GDPR
 */

const cookieFeatureSchema = new mongoose.Schema({
  // Información básica de la cookie
  name: { type: String, required: true, index: true },
  value: { type: String },
  domain: { type: String, required: true, index: true },
  path: { type: String, default: '/' },
  expires: { type: Date },
  httpOnly: { type: Boolean, default: false },
  secure: { type: Boolean, default: false },
  sameSite: { 
    type: String, 
    enum: ['Strict', 'Lax', 'None', null],
    default: null 
  },

  // Características computadas
  nameLength: { type: Number },
  nameEntropy: { type: Number },
  valueLength: { type: Number },
  valueEntropy: { type: Number },
  domainType: { 
    type: String, 
    enum: ['first-party', 'third-party'], 
    index: true 
  },
  duration: { type: Number }, // Segundos hasta expiración (-1 para session)
  hasSpecialChars: { type: Boolean },
  isBase64: { type: Boolean },
  isUUID: { type: Boolean },
  isNumeric: { type: Boolean },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
}, { _id: false });

const classificationSchema = new mongoose.Schema({
  purpose: { 
    type: String, 
    enum: ['necessary', 'functional', 'analytics', 'advertising', 'personalization', 'unknown'],
    required: true,
    index: true
  },
  confidence: { type: Number, min: 0, max: 1 },
  scores: {
    necessary: { type: Number, default: 0 },
    functional: { type: Number, default: 0 },
    analytics: { type: Number, default: 0 },
    advertising: { type: Number, default: 0 },
    personalization: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  isHighConfidence: { type: Boolean, default: false },
  
  // Razones de la clasificación
  reasons: [{
    type: { type: String }, // 'pattern_match', 'domain_match', 'duration_match'
    description: { type: String },
    weight: { type: Number }
  }]
}, { _id: false });

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  iabId: { type: Number, index: true }, // ID del Global Vendor List
  purposes: [{ 
    type: String, 
    enum: ['analytics', 'advertising', 'social', 'ecommerce', 'measurement', 'personalization']
  }],
  description: { type: String },
  confidence: { type: Number, min: 0, max: 1 },
  matches: [{ type: String }], // Razones de la detección
  
  // Información adicional del vendor
  website: { type: String },
  privacyPolicy: { type: String },
  categories: [{ type: String }],
  dataRetentionPeriod: { type: Number }, // Días
  isIABVendor: { type: Boolean, default: false }
}, { _id: false });

const complianceSchema = new mongoose.Schema({
  needsConsent: { type: Boolean, required: true },
  isCompliant: { type: Boolean, required: true },
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'low',
    index: true 
  },
  
  violations: [{
    type: { 
      type: String, 
      enum: ['excessive_duration', 'insecure_session', 'missing_purpose', 'third_party_without_consent']
    },
    message: { type: String },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high'] 
    },
    recommendation: { type: String }
  }],
  
  warnings: [{
    type: { 
      type: String, 
      enum: ['unclear_purpose', 'unknown_vendor', 'insecure_transmission', 'long_duration']
    },
    message: { type: String },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high'] 
    },
    recommendation: { type: String }
  }],
  
  // Puntuación de compliance (0-100)
  complianceScore: { type: Number, min: 0, max: 100 },
  
  // Acciones recomendadas
  recommendations: [{
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'] 
    },
    action: { type: String },
    description: { type: String },
    impact: { type: String }
  }]
}, { _id: false });

const summarySchema = new mongoose.Schema({
  domain: { type: String, required: true },
  totalCookies: { type: Number, default: 0 },
  
  byPurpose: {
    necessary: { type: Number, default: 0 },
    functional: { type: Number, default: 0 },
    analytics: { type: Number, default: 0 },
    advertising: { type: Number, default: 0 },
    personalization: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  
  byVendor: { type: Map, of: Number }, // Vendor name -> count
  
  compliance: {
    compliant: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    needsConsent: { type: Number, default: 0 },
    complianceRate: { type: Number, min: 0, max: 100 }
  },
  
  riskAssessment: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'low' 
  },
  
  // Estadísticas adicionales
  avgConfidence: { type: Number, min: 0, max: 1 },
  thirdPartyCookies: { type: Number, default: 0 },
  sessionCookies: { type: Number, default: 0 },
  persistentCookies: { type: Number, default: 0 },
  
  // Top vendors detectados
  topVendors: [{
    name: { type: String },
    count: { type: Number },
    purposes: [{ type: String }]
  }],
  
  // Principales problemas encontrados
  criticalIssues: [{
    type: { type: String },
    count: { type: Number },
    description: { type: String }
  }]
}, { _id: false });

const intelligentCookieResultSchema = new mongoose.Schema({
  // Referencia al análisis
  analysisId: {
    type: String,
    required: true,
    index: true
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  
  // Información del dominio analizado
  domain: { type: String, required: true, index: true },
  url: { type: String },
  
  // Resumen del análisis
  summary: summarySchema,
  
  // Cookies analizadas individualmente
  cookies: [{
    features: cookieFeatureSchema,
    classification: classificationSchema,
    vendor: vendorSchema,
    compliance: complianceSchema,
    analysisTimestamp: { type: Date, default: Date.now },
    
    // Historial de cambios
    previousClassification: { type: String },
    classificationChanged: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Metadatos del análisis
  metadata: {
    analysisTime: { type: Number }, // Milisegundos
    totalCookies: { type: Number },
    scriptsFound: { type: Number },
    timestamp: { type: Date, default: Date.now },
    version: { type: String, default: '2.0' },
    userAgent: { type: String },
    
    // Configuración del análisis
    analysisConfig: {
      deepScan: { type: Boolean, default: true },
      includeThirdParty: { type: Boolean, default: true },
      timeout: { type: Number, default: 30000 }
    }
  },
  
  // Archivos adicionales
  screenshots: [{ type: String }], // URLs de screenshots
  reports: [{ 
    type: { type: String },
    url: { type: String },
    generatedAt: { type: Date }
  }],
  
  // Estado del análisis
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  
  // Errores si los hay
  errors: [{
    type: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Quién realizó el análisis
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAccount'
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
intelligentCookieResultSchema.index({ domainId: 1, createdAt: -1 });
intelligentCookieResultSchema.index({ clientId: 1, 'summary.riskAssessment': 1 });
intelligentCookieResultSchema.index({ 'cookies.classification.purpose': 1 });
intelligentCookieResultSchema.index({ 'cookies.vendor.iabId': 1 });
intelligentCookieResultSchema.index({ 'summary.compliance.complianceRate': 1 });

// Métodos del esquema
intelligentCookieResultSchema.methods.getComplianceOverview = function() {
  return {
    totalCookies: this.summary.totalCookies,
    complianceRate: this.summary.compliance.complianceRate,
    riskLevel: this.summary.riskAssessment,
    criticalIssues: this.summary.criticalIssues.length,
    needsConsent: this.summary.compliance.needsConsent,
    violations: this.summary.compliance.violations,
    warnings: this.summary.compliance.warnings
  };
};

intelligentCookieResultSchema.methods.getCookiesByPurpose = function(purpose) {
  return this.cookies.filter(cookie => cookie.classification.purpose === purpose);
};

intelligentCookieResultSchema.methods.getCookiesByVendor = function(vendorName) {
  return this.cookies.filter(cookie => cookie.vendor.name === vendorName);
};

intelligentCookieResultSchema.methods.getHighRiskCookies = function() {
  return this.cookies.filter(cookie => 
    cookie.compliance.riskLevel === 'high' || 
    cookie.compliance.violations.length > 0
  );
};

// Método estático para generar reporte de cumplimiento
intelligentCookieResultSchema.statics.generateComplianceReport = async function(domainId, clientId) {
  const latestAnalysis = await this.findOne({ 
    domainId, 
    clientId, 
    status: 'completed' 
  }).sort({ createdAt: -1 });

  if (!latestAnalysis) {
    return null;
  }

  return {
    domain: latestAnalysis.domain,
    analysisDate: latestAnalysis.createdAt,
    overview: latestAnalysis.getComplianceOverview(),
    purposeBreakdown: latestAnalysis.summary.byPurpose,
    vendorBreakdown: Object.fromEntries(latestAnalysis.summary.byVendor),
    criticalIssues: latestAnalysis.summary.criticalIssues,
    recommendations: latestAnalysis.cookies
      .flatMap(cookie => cookie.compliance.recommendations)
      .filter(rec => rec.priority === 'high' || rec.priority === 'critical')
      .slice(0, 10), // Top 10 recomendaciones
    highRiskCookies: latestAnalysis.getHighRiskCookies().slice(0, 20) // Top 20 cookies de riesgo
  };
};

// Virtual para calcular tendencias
intelligentCookieResultSchema.virtual('trends').get(function() {
  // Esta función se puede expandir para comparar con análisis anteriores
  return {
    cookieGrowth: 0, // Calculado comparando con análisis previo
    newVendors: 0,
    complianceImprovement: 0
  };
});

intelligentCookieResultSchema.set('toJSON', { virtuals: true });
intelligentCookieResultSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('IntelligentCookieResult', intelligentCookieResultSchema);