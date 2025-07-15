const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  // Información básica del dominio
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  // Configuración mínima
  settings: {
    defaultTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerTemplate'
    }
  },

  // Configuración de escaneo automático con cron
  scanConfig: {
    autoScanEnabled: {
      type: Boolean,
      default: false // Desactivado por defecto para evitar sobrecarga
    },
    scanInterval: {
      type: String,
      enum: ['hourly', 'every-2-hours', 'every-6-hours', 'every-12-hours', 'daily', 'weekly', 'monthly', 'custom'],
      default: 'daily'
    },
    cronExpression: {
      type: String,
      default: '0 2 * * *' // Diario a las 2 AM
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    scanType: {
      type: String,
      enum: ['quick', 'full', 'smart'],
      default: 'smart'
    },
    maxDepth: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    includeSubdomains: {
      type: Boolean,
      default: false
    },
    enableAdvancedAnalysis: {
      type: Boolean,
      default: false
    },
    notifyOnCompletion: {
      type: Boolean,
      default: true
    },
    retryAttempts: {
      type: Number,
      default: 2,
      min: 0,
      max: 5
    },
    // Para el modo smart: frecuencia de análisis completo
    smartAnalysisFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    // Configuración de limpieza
    cookieCleanupAction: {
      type: String,
      enum: ['mark_inactive', 'delete', 'ignore'],
      default: 'mark_inactive'
    },
    cookieCleanupEnabled: {
      type: Boolean,
      default: true
    },
    // Estado del escaneo
    scanStatus: {
      type: String,
      enum: ['idle', 'scanning', 'completed', 'error'],
      default: 'idle'
    },
    lastScheduledScan: Date,
    lastFullAnalysis: Date,
    nextScheduledScan: Date,
    firstScanCompleted: {
      type: Boolean,
      default: false
    },
    lastScanDuration: Number, // en milisegundos
    // Resultados del último escaneo
    lastScanResult: {
      cookiesFound: Number,
      newCookies: Number,
      updatedCookies: Number,
      inactiveCookies: Number,
      errors: [String],
      completedAt: Date
    },
    lastError: {
      message: String,
      timestamp: Date,
      stack: String
    },
    embedDetectionEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Estado del dominio
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending' // Pending por defecto hasta verificación
  }
}, { 
  timestamps: true 
});

// Índices
domainSchema.index({ clientId: 1 });
domainSchema.index({ domain: 1 });
domainSchema.index({ status: 1 });
domainSchema.index({ 'scanConfig.autoScanEnabled': 1 });

// Validación de dominio en pre-save
domainSchema.pre('save', function(next) {
  const domainRegex = /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|localhost)$/;
  if (!domainRegex.test(this.domain)) {
    return next(new Error('Dominio inválido'));
  }
  
  // Actualizar cronExpression cuando cambia scanInterval
  if (this.isModified('scanConfig.scanInterval')) {
    this.scanConfig.cronExpression = this.generateCronExpression();
  }
  
  next();
});

// Método para generar cron expression basado en el intervalo
domainSchema.methods.generateCronExpression = function() {
  const cronMap = {
    'hourly': '0 * * * *',           // Cada hora en punto
    'every-2-hours': '0 */2 * * *',  // Cada 2 horas
    'every-6-hours': '0 */6 * * *',  // Cada 6 horas
    'every-12-hours': '0 */12 * * *',// Cada 12 horas
    'daily': '0 2 * * *',            // Diario a las 2 AM
    'weekly': '0 2 * * 0',           // Semanal - Domingos a las 2 AM
    'monthly': '0 2 1 * *'           // Mensual - Día 1 a las 2 AM
  };
  
  return cronMap[this.scanConfig.scanInterval] || this.scanConfig.cronExpression;
};

// Método para determinar si necesita análisis completo (modo smart)
domainSchema.methods.needsFullAnalysis = function() {
  if (this.scanConfig.scanType !== 'smart') {
    return this.scanConfig.scanType === 'full';
  }
  
  // En modo smart, verificar la frecuencia configurada
  const lastAnalysis = this.scanConfig.lastFullAnalysis;
  if (!lastAnalysis) return true; // Primera vez
  
  const daysSinceLastAnalysis = (Date.now() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24);
  
  switch (this.scanConfig.smartAnalysisFrequency) {
    case 'daily':
      return daysSinceLastAnalysis >= 1;
    case 'weekly':
      return daysSinceLastAnalysis >= 7;
    case 'monthly':
      return daysSinceLastAnalysis >= 30;
    default:
      return daysSinceLastAnalysis >= 7; // Por defecto semanal
  }
};

// Método de instancia para verificar si el dominio está activo
domainSchema.methods.isActive = function() {
  return this.status === 'active';
};

// Método para obtener la configuración completa del dominio
domainSchema.methods.getFullConfig = function() {
  return {
    domain: this.domain,
    settings: this.settings,
    scanConfig: this.scanConfig,
    status: this.status
  };
};

// Método para actualizar el estado del escaneo
domainSchema.methods.updateScanStatus = async function(status, result = null, error = null) {
  this.scanConfig.scanStatus = status;
  this.scanConfig.lastScheduledScan = new Date();
  
  if (result) {
    this.scanConfig.lastScanResult = result;
  }
  
  if (error) {
    this.scanConfig.lastError = {
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    };
  }
  
  return this.save();
};

// Método para obtener las cookies asociadas a este dominio
domainSchema.methods.getCookies = async function() {
  // Se asume que existe un modelo Cookie y que cada cookie tiene un campo "domain" que almacena el ObjectId del dominio.
  const Cookie = require('./Cookie');
  return await Cookie.find({ domain: this._id });
};

module.exports = mongoose.model('Domain', domainSchema);