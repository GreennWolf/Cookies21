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
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  scanConfig: {
    type: {
      type: String,
      enum: ['full', 'quick', 'custom'],
      default: 'full'
    },
    depth: {
      type: Number,
      default: 3  // Niveles de profundidad para escanear
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
    userAgent: String
  },
  progress: {
    urlsScanned: {
      type: Number,
      default: 0
    },
    urlsTotal: Number,
    currentUrl: String,
    startTime: Date,
    endTime: Date,
    duration: Number  // en segundos
  },
  findings: {
    cookies: [{
      name: String,
      domain: String,
      path: String,
      value: String,
      category: String,
      firstParty: Boolean,
      secure: Boolean,
      httpOnly: Boolean,
      sameSite: String,
      foundOn: [String],  // URLs donde se encontró
      detectedScript: {   // Script que posiblemente creó la cookie
        url: String,
        content: String,
        type: String
      },
      matches: [{         // Coincidencias con base de datos conocida
        provider: String,
        purpose: String,
        category: String,
        confidence: Number
      }]
    }],
    scripts: [{
      url: {type:String},
      type: {type:String},      // 'analytics', 'marketing', etc.
      provider: {type:String},
      loadType: {type:String},  // 'async', 'defer', 'sync'
    }],
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
    }
  },
  stats: {
    totalCookies: Number,
    newCookies: Number,
    modifiedCookies: Number,
    removedCookies: Number,
    byCategory: [{
      category: String,
      count: Number,
      percentage: Number
    }],
    byProvider: [{
      provider: String,
      count: Number,
      cookies: [String]
    }]
  },
  errors: [{
    url: String,
    error: String,
    code: String,
    timestamp: Date
  }],
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
    tags: [String]
  }
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
    const cookies = this.findings.cookies;
    
    this.stats = {
      totalCookies: cookies.length,
      newCookies: this.findings.changes.newCookies.length,
      modifiedCookies: this.findings.changes.modifiedCookies.length,
      removedCookies: this.findings.changes.removedCookies.length,
      byCategory: this.calculateCategoryStats(cookies),
      byProvider: this.calculateProviderStats(cookies)
    };
  },

  calculateCategoryStats(cookies) {
    const categories = {};
    cookies.forEach(cookie => {
      categories[cookie.category] = (categories[cookie.category] || 0) + 1;
    });

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: (count / cookies.length) * 100
    }));
  },

  calculateProviderStats(cookies) {
    const providers = {};
    cookies.forEach(cookie => {
      if (!providers[cookie.provider]) {
        providers[cookie.provider] = {
          count: 0,
          cookies: []
        };
      }
      providers[cookie.provider].count++;
      providers[cookie.provider].cookies.push(cookie.name);
    });

    return Object.entries(providers).map(([provider, data]) => ({
      provider,
      count: data.count,
      cookies: data.cookies
    }));
  },

  // Actualizar progreso
  async updateProgress(url) {
    this.progress.currentUrl = url;
    this.progress.urlsScanned++;
    
    if (this.progress.urlsScanned === this.progress.urlsTotal) {
      this.status = 'completed';
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
      changes: this.findings.changes,
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