// models/CookieAnalysis.js
const mongoose = require('mongoose');

const cookieAnalysisSchema = new mongoose.Schema({
  analysisId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false // Permitir null para dominios sin cliente (cuando es owner)
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'error', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStep: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  estimatedDuration: {
    type: Number, // en segundos
    default: 120 // 2 minutos por defecto
  },
  configuration: {
    deepScan: {
      type: Boolean,
      default: true
    },
    includeThirdParty: {
      type: Boolean,
      default: true
    },
    timeout: {
      type: Number,
      default: 300 // 5 minutos
    }
  },
  results: {
    totalCookies: {
      type: Number,
      default: 0
    },
    newCookies: {
      type: Number,
      default: 0
    },
    updatedCookies: {
      type: Number,
      default: 0
    },
    errorCookies: {
      type: Number,
      default: 0
    },
    scanDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  error: {
    message: String,
    stack: String,
    code: String
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info'
    },
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAccount'
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
cookieAnalysisSchema.index({ domainId: 1, status: 1 });
cookieAnalysisSchema.index({ clientId: 1, status: 1 });
cookieAnalysisSchema.index({ status: 1, createdAt: -1 });
cookieAnalysisSchema.index({ startTime: 1 });

// Métodos del esquema
cookieAnalysisSchema.methods.updateProgress = async function(progress, currentStep) {
  // Evitar guardados paralelos usando isModified para verificar si ya está en proceso
  if (this.$__.saving) {
    return this;
  }
  
  this.progress = Math.min(100, Math.max(0, progress));
  if (currentStep) {
    this.currentStep = currentStep;
  }
  
  try {
    return await this.save();
  } catch (error) {
    // Si hay error de guardado paralelo, simplemente devolver el documento
    if (error.message.includes('parallel')) {
      return this;
    }
    throw error;
  }
};

cookieAnalysisSchema.methods.addLog = function(level, message, details) {
  this.logs.push({
    level,
    message,
    details,
    timestamp: new Date()
  });
  return this.save();
};

cookieAnalysisSchema.methods.markCompleted = function(results) {
  this.status = 'completed';
  this.progress = 100;
  this.endTime = new Date();
  this.currentStep = 'Análisis completado';
  if (results) {
    this.results = { ...this.results, ...results };
  }
  return this.save();
};

cookieAnalysisSchema.methods.markError = function(error) {
  this.status = 'error';
  this.endTime = new Date();
  this.currentStep = 'Error en el análisis';
  this.error = {
    message: error.message || 'Error desconocido',
    stack: error.stack,
    code: error.code
  };
  return this.save();
};

// Método para obtener tiempo transcurrido
cookieAnalysisSchema.virtual('elapsedTime').get(function() {
  const now = this.endTime || new Date();
  return Math.floor((now - this.startTime) / 1000);
});

// Método para obtener tiempo estimado restante
cookieAnalysisSchema.virtual('estimatedTimeRemaining').get(function() {
  if (this.status === 'completed' || this.status === 'error') {
    return 0;
  }
  
  const elapsed = this.elapsedTime;
  const progressRatio = this.progress / 100;
  
  if (progressRatio > 0) {
    const estimatedTotal = elapsed / progressRatio;
    return Math.max(0, Math.floor(estimatedTotal - elapsed));
  }
  
  return this.estimatedDuration - elapsed;
});

cookieAnalysisSchema.set('toJSON', { virtuals: true });
cookieAnalysisSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CookieAnalysis', cookieAnalysisSchema);