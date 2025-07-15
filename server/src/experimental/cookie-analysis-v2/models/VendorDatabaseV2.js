const mongoose = require('mongoose');

// Modelo expandido para vendors V2
const vendorDatabaseV2Schema = new mongoose.Schema({
  // Información básica del vendor
  vendorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  displayName: String,
  
  // Información corporativa
  company: {
    legalName: String,
    headquarters: String,
    country: String,
    website: String,
    contact: {
      email: String,
      phone: String,
      address: String
    }
  },
  
  // Dominios conocidos
  domains: [{
    domain: String,
    type: {
      type: String,
      enum: ['primary', 'cdn', 'api', 'tracking', 'analytics', 'advertising'],
      default: 'primary'
    }
  }],
  
  // Cookies conocidas del vendor
  knownCookies: [{
    name: String,
    pattern: String, // Regex pattern
    category: {
      type: String,
      enum: ['necessary', 'analytics', 'marketing', 'functional', 'social'],
      required: true
    },
    description: String,
    purpose: String,
    duration: String,
    dataTypes: [String],
    examples: [String]
  }],
  
  // Propósitos y categorías
  purposes: [{
    type: String,
    enum: [
      'analytics', 'advertising', 'social_media', 'personalization',
      'functionality', 'security', 'performance', 'targeting',
      'measurement', 'optimization', 'attribution', 'retargeting'
    ]
  }],
  
  // Información de cumplimiento
  compliance: {
    iabVendorId: Number,
    iabTCFParticipant: { type: Boolean, default: false },
    gdprCompliant: { type: Boolean, default: false },
    ccpaCompliant: { type: Boolean, default: false },
    privacyShield: { type: Boolean, default: false },
    certifications: [String]
  },
  
  // URLs importantes
  urls: {
    privacyPolicy: String,
    cookiePolicy: String,
    optOut: String,
    dpa: String, // Data Processing Agreement
    terms: String
  },
  
  // Categoría de industria
  industry: {
    primary: String,
    secondary: [String]
  },
  
  // Información de detección
  detection: {
    confidence: { type: Number, default: 0 }, // 0-1
    lastUpdated: { type: Date, default: Date.now },
    sources: [String], // ['manual', 'crawl', 'user_report', 'ai_detection']
    verified: { type: Boolean, default: false }
  },
  
  // Patrones de JavaScript
  jsPatterns: [{
    pattern: String,
    type: {
      type: String,
      enum: ['global_variable', 'function_call', 'script_src', 'inline_code']
    },
    confidence: Number
  }],
  
  // Tecnologías relacionadas
  technologies: [String],
  
  // Alternativas y competidores
  alternatives: [String],
  
  // Estadísticas de uso
  usage: {
    popularityScore: { type: Number, default: 0 },
    topSites: [String],
    marketShare: Number,
    growth: Number
  },
  
  // Estado
  status: {
    type: String,
    enum: ['active', 'deprecated', 'acquired', 'discontinued'],
    default: 'active'
  }
  
}, {
  timestamps: true
});

// Índices
vendorDatabaseV2Schema.index({ vendorId: 1 });
vendorDatabaseV2Schema.index({ name: 1 });
vendorDatabaseV2Schema.index({ 'domains.domain': 1 });
vendorDatabaseV2Schema.index({ purposes: 1 });
vendorDatabaseV2Schema.index({ 'compliance.iabVendorId': 1 });
vendorDatabaseV2Schema.index({ status: 1 });

// Métodos estáticos
vendorDatabaseV2Schema.statics.findByDomain = function(domain) {
  return this.find({
    'domains.domain': { $regex: domain, $options: 'i' }
  });
};

vendorDatabaseV2Schema.statics.findByCookieName = function(cookieName) {
  return this.find({
    $or: [
      { 'knownCookies.name': cookieName },
      { 'knownCookies.pattern': { $regex: cookieName } }
    ]
  });
};

vendorDatabaseV2Schema.statics.findByJSPattern = function(jsCode) {
  return this.find({
    'jsPatterns.pattern': { $regex: jsCode, $options: 'i' }
  });
};

// Métodos de instancia
vendorDatabaseV2Schema.methods.addCookie = function(cookieData) {
  this.knownCookies.push(cookieData);
  this.detection.lastUpdated = new Date();
};

vendorDatabaseV2Schema.methods.calculateConfidence = function(detectionMethod, matches) {
  let baseConfidence = 0;
  
  switch(detectionMethod) {
    case 'exact_domain_match':
      baseConfidence = 0.95;
      break;
    case 'cookie_pattern_match':
      baseConfidence = 0.85;
      break;
    case 'js_pattern_match':
      baseConfidence = 0.75;
      break;
    case 'subdomain_match':
      baseConfidence = 0.65;
      break;
    case 'ml_prediction':
      baseConfidence = 0.60;
      break;
    default:
      baseConfidence = 0.50;
  }
  
  // Ajustar por número de coincidencias
  const matchBonus = Math.min(matches * 0.05, 0.20);
  
  return Math.min(baseConfidence + matchBonus, 1.0);
};

module.exports = mongoose.model('VendorDatabaseV2', vendorDatabaseV2Schema, 'vendor_database_v2');