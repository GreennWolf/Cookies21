// models/CookieScan.js
const mongoose = require('mongoose');

const cookieScanSchema = new mongoose.Schema({
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  scanId: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled','running', 'error'],
    default: 'pending'
  },
  scanConfig: {
    type: {
      type: String,
      enum: ['full', 'quick', 'custom', 'comprehensive'],
      default: 'full'
    },
    depth: {
      type: Number,
      default: 3
    },
    maxUrls: {
      type: Number,
      default: 100
    },
    includeSubdomains: {
      type: Boolean,
      default: true
    },
    urlPatterns: {
      include: [String],
      exclude: [String]
    },
    userAgent: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    }
  },
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    urlsScanned: {
      type: Number,
      default: 0
    },
    urlsTotal: Number,
    currentUrl: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'cancelled', 'error'],
      default: 'pending'
    },
    currentStep: String,
    message: String
  },
  findings: {
    cookies: [{
      name: String,
      domain: String,
      path: String,
      value: String,
      category: String,
      description: String,
      isFirstParty: Boolean,
      firstParty: Boolean,
      secure: Boolean,
      httpOnly: Boolean,
      sameSite: String,
      expires: Date,
      maxAge: Number,
      foundOn: [String],
      provider: mongoose.Schema.Types.Mixed,
      duration: String,
      attributes: mongoose.Schema.Types.Mixed, // CAMBIADO A MIXED
      script: mongoose.Schema.Types.Mixed,
      detectedScript: {
        url: String,
        content: String,
        type: String
      },
      matches: [{
        provider: String,
        purpose: String,
        category: String,
        confidence: Number
      }]
    }],
    scripts: [{
      url: {type:String},
      type: {type:String},
      provider: mongoose.Schema.Types.Mixed, // CAMBIADO A MIXED
      category: String,
      loadType: {type:String},
      hasTracking: Boolean
    }],
    trackers: [{
      type: {type:String},
      url: String,
      size: {
        width: Number,
        height: Number
      }
    }],
    storage: mongoose.Schema.Types.Mixed,
    iframes: mongoose.Schema.Types.Mixed,
    forms: mongoose.Schema.Types.Mixed,
    vendors: mongoose.Schema.Types.Mixed,
    changes: {
      newCookies: [{
        name: String,
        domain: String,
        category: String
      }],
      modifiedCookies: [{
        name: String,
        domain: String,
        changes: [{
          field: String,
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed
        }]
      }],
      removedCookies: [{
        name: String,
        domain: String,
        lastSeen: Date
      }]
    },
    metadata: {
      startTime: Date,
      endTime: Date,
      duration: Number,
      urlsScanned: Number,
      errors: [{
        url: String,
        error: String,
        timestamp: Date
      }]
    }
  },
  stats: {
    totalCookies: Number,
    newCookies: Number,
    modifiedCookies: Number,
    removedCookies: Number,
    byCategory: mongoose.Schema.Types.Mixed,
    byProvider: mongoose.Schema.Types.Mixed,
    overview: {
      totalCookies: Number,
      totalScripts: Number,
      totalTrackers: Number,
      totalVendors: Number,
      urlsScanned: Number,
      scanDuration: Number,
      errors: Number
    },
    cookies: {
      byCategory: mongoose.Schema.Types.Mixed,
      byProvider: mongoose.Schema.Types.Mixed,
      byDuration: mongoose.Schema.Types.Mixed,
      firstParty: Number,
      thirdParty: Number
    },
    scripts: {
      byType: mongoose.Schema.Types.Mixed,
      byProvider: mongoose.Schema.Types.Mixed
    },
    trackers: {
      byType: mongoose.Schema.Types.Mixed,
      byDomain: mongoose.Schema.Types.Mixed
    },
    changes: {
      total: Number,
      new: Number,
      modified: Number,
      removed: Number
    }
  },
  errors: [{
    url: String,
    error: String,
    code: String,
    timestamp: Date
  }],
  error: String,
  notifications: [{
    type: {
      type: String,
      enum: ['warning', 'error', 'info']
    },
    message: String,
    timestamp: Date,
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  metadata: {
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount'
    },
    scanType: {
      type: String,
      enum: ['scheduled', 'manual', 'auto'],
      default: 'manual'
    },
    priority: {
      type: Number,
      default: 1
    },
    tags: [String],
    errors: [{
      url: String,
      error: String,
      timestamp: Date
    }]
  },
  endTime: Date
}, {
  timestamps: true
}, { suppressReservedKeysWarning: true });

// Índices
cookieScanSchema.index({ domainId: 1, status: 1 });
cookieScanSchema.index({ 'progress.startTime': 1 });
cookieScanSchema.index({ status: 1, 'metadata.priority': 1 });

// Pre-save middleware
cookieScanSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generar scanId único
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.scanId = `scan_${timestamp}_${random}`;
    
    // Inicializar progress si no existe
    if (!this.progress) {
      this.progress = {
        percentage: 0,
        urlsScanned: 0,
        status: 'pending'
      };
    }
  }

  // Validar que progress sea un objeto
  if (typeof this.progress === 'number') {
    this.progress = {
      percentage: this.progress,
      urlsScanned: 0,
      status: this.status || 'pending'
    };
  }

  // Calcular stats si el escaneo está completo
  if (this.status === 'completed' && this.isModified('status')) {
    this.calculateStats();
  }

  next();
});

// Métodos de instancia
cookieScanSchema.methods = {
  // Calcular estadísticas
  calculateStats() {
    const cookies = this.findings?.cookies || [];
    
    this.stats = {
      totalCookies: cookies.length,
      newCookies: (this.findings?.changes?.newCookies || []).length,
      modifiedCookies: (this.findings?.changes?.modifiedCookies || []).length,
      removedCookies: (this.findings?.changes?.removedCookies || []).length,
      byCategory: this.calculateCategoryStats(cookies),
      byProvider: this.calculateProviderStats(cookies)
    };
  },

  calculateCategoryStats(cookies) {
    const categories = {};
    cookies.forEach(cookie => {
      categories[cookie.category || 'other'] = (categories[cookie.category || 'other'] || 0) + 1;
    });

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: cookies.length > 0 ? (count / cookies.length) * 100 : 0
    }));
  },

  calculateProviderStats(cookies) {
    const providers = {};
    cookies.forEach(cookie => {
      const provider = cookie.provider || 'Other';
      if (!providers[provider]) {
        providers[provider] = {
          count: 0,
          cookies: []
        };
      }
      providers[provider].count++;
      providers[provider].cookies.push(cookie.name);
    });

    return Object.entries(providers).map(([provider, data]) => ({
      provider,
      count: data.count,
      cookies: data.cookies
    }));
  },

  // Actualizar progreso
  async updateProgress(url, percentage = null) {
    this.progress.currentUrl = url;
    this.progress.urlsScanned++;
    
    if (percentage !== null) {
      this.progress.percentage = Math.min(percentage, 100);
    }
    
    if (this.progress.urlsScanned === this.progress.urlsTotal) {
      this.status = 'completed';
      this.progress.status = 'completed';
      this.progress.endTime = new Date();
      this.progress.duration = 
        (this.progress.endTime - this.progress.startTime) / 1000;
    }

    return this.save();
  },

  // Añadir error
  async addError(url, error) {
    this.errors.push({
      url,
      error: error.message,
      code: error.code,
      timestamp: new Date()
    });

    return this.save();
  },

  // Generar reporte
  generateReport() {
    return {
      scanId: this.scanId,
      domain: this.domainId,
      duration: this.progress.duration,
      stats: this.stats,
      changes: this.findings?.changes,
      errors: this.errors,
      timestamp: this.updatedAt
    };
  }
};

// Métodos estáticos
cookieScanSchema.statics = {
  // Obtener último escaneo
  async getLastScan(domainId) {
    return this.findOne({
      domainId,
      status: 'completed'
    }).sort({ 'progress.endTime': -1 });
  },

  // Obtener tendencias
  async getScanTrends(domainId, limit = 10) {
    return this.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
          status: 'completed'
        }
      },
      {
        $sort: { 'progress.endTime': -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          date: '$progress.endTime',
          totalCookies: '$stats.totalCookies',
          newCookies: '$stats.newCookies',
          removedCookies: '$stats.removedCookies',
          duration: '$progress.duration'
        }
      }
    ]);
  }
};

module.exports = mongoose.model('CookieScan', cookieScanSchema);