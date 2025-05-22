const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['grant', 'revoke', 'update', 'expire', 'refresh','load_test'],
    required: true
  },
  tcString: {
    type: String,
    required: true
  },
  decisions: {
    purposes: [{
      id: Number,
      name: String,
      allowed: Boolean,
      legalBasis: {
        type: String,
        enum: ['consent', 'legitimate_interest', 'legal_obligation'],
        required: true
      }
    }],
    
    vendors: [{
      id: Number,
      name: String,
      allowed: Boolean,
      serviceProvider: {
        type: Boolean,
        default: false
      }
    }],
    specialFeatures: [{
      id: Number,
      name: String,
      allowed: Boolean
    }]
  },
  preferences: {
    cookies: [{
      category: {
        type: String,
        enum: ['necessary', 'analytics', 'marketing', 'personalization']
      },
      allowed: Boolean
    }],
    scriptIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Script'
    }]
  },
  metadata: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    language: String,
    country: String,
    region: String,
    city: String,
    deviceType: String,
    browser: {
      name: String,
      version: String
    },
    platform: {
      type: String,
      os: String
    }
  },
  bannerInteraction: {
    type: {
      type: String,
      enum: ['accept_all', 'reject_all', 'save_preferences', 'close', 'no_interaction','load_test','grant'],
      required: true
    },
    timeToDecision: Number, // Tiempo en ms desde que se mostró el banner hasta la decisión
    bannerVersion: String,
    customizationOpened: Boolean,
    preferencesChanged: Boolean
  },
  regulation: {
    type: {
      type: String,
      enum: ['gdpr', 'ccpa', 'lgpd', 'other'],
      required: true
    },
    version: String,
    applies: {
      type: Boolean,
      default: true
    },
    basis: String // Base legal específica si aplica
  },
  previous: {
    tcString: String,
    decisions: {
      purposes: [{
        id: Number,
        allowed: Boolean
      }],
      vendors: [{
        id: Number,
        allowed: Boolean
      }]
    }
  },
  validity: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    refreshTime: Date // Cuándo se refrescó el consentimiento
  },
  status: {
    type: String,
    enum: ['valid', 'expired', 'revoked', 'superseded'],
    default: 'valid'
  }
}, {
  timestamps: true
});

// Índices
consentLogSchema.index({ domainId: 1, userId: 1 });
consentLogSchema.index({ 'validity.startTime': 1 });
consentLogSchema.index({ status: 1 });
consentLogSchema.index({ action: 1 });
consentLogSchema.index({ 'metadata.ipAddress': 1 });
consentLogSchema.index({ 'bannerInteraction.type': 1 });

// Middleware pre-save
consentLogSchema.pre('save', function(next) {
  // Si es un nuevo registro o se actualizó el consentimiento
  if (this.isNew || this.isModified('decisions')) {
    // Asegurar que las cookies necesarias siempre estén permitidas
    const necessaryCookies = this.preferences.cookies.find(
      c => c.category === 'necessary'
    );
    if (necessaryCookies) {
      necessaryCookies.allowed = true;
    }
  }
  next();
});

// Métodos de instancia
consentLogSchema.methods = {
  // Verificar si el consentimiento está activo
  isValid() {
    const now = new Date();
    return (
      this.status === 'valid' &&
      this.validity.startTime <= now &&
      (!this.validity.endTime || this.validity.endTime > now)
    );
  },

  // Obtener cambios respecto al consentimiento anterior
  getChanges() {
    if (!this.previous || !this.previous.decisions) return null;

    const changes = {
      purposes: [],
      vendors: []
    };

    // Comparar propósitos
    this.decisions.purposes.forEach(purpose => {
      const previousPurpose = this.previous.decisions.purposes.find(
        p => p.id === purpose.id
      );
      if (!previousPurpose || previousPurpose.allowed !== purpose.allowed) {
        changes.purposes.push({
          id: purpose.id,
          name: purpose.name,
          from: previousPurpose ? previousPurpose.allowed : null,
          to: purpose.allowed
        });
      }
    });

    // Comparar vendors
    this.decisions.vendors.forEach(vendor => {
      const previousVendor = this.previous.decisions.vendors.find(
        v => v.id === vendor.id
      );
      if (!previousVendor || previousVendor.allowed !== vendor.allowed) {
        changes.vendors.push({
          id: vendor.id,
          name: vendor.name,
          from: previousVendor ? previousVendor.allowed : null,
          to: vendor.allowed
        });
      }
    });

    return changes;
  },

  // Generar resumen para auditoría
  generateAuditSummary() {
    return {
      timestamp: this.createdAt,
      action: this.action,
      user: {
        id: this.userId,
        ip: this.metadata.ipAddress,
        location: {
          country: this.metadata.country,
          region: this.metadata.region
        }
      },
      interaction: {
        type: this.bannerInteraction.type,
        timeToDecision: this.bannerInteraction.timeToDecision
      },
      changes: this.getChanges(),
      regulation: this.regulation
    };
  }
};

// Métodos estáticos
consentLogSchema.statics = {
  // Obtener el último consentimiento válido para un usuario
  async getLastValidConsent(domainId, userId) {
    return this.findOne({
      domainId,
      userId,
      status: 'valid',
      'validity.startTime': { $lte: new Date() },
      $or: [
        { 'validity.endTime': { $gt: new Date() } },
        { 'validity.endTime': null }
      ]
    }).sort({ 'validity.startTime': -1 });
  },

  // Obtener estadísticas de consentimiento
  async getConsentStats(domainId, startDate, endDate) {
    const match = {
      domainId: mongoose.Types.ObjectId(domainId),
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    return this.aggregate([
      { $match: match },
      { $group: {
        _id: '$bannerInteraction.type',
        count: { $sum: 1 },
        avgTimeToDecision: { $avg: '$bannerInteraction.timeToDecision' }
      }},
      { $project: {
        type: '$_id',
        count: 1,
        avgTimeToDecision: 1,
        _id: 0
      }}
    ]);
  }
};

module.exports = mongoose.model('ConsentLog', consentLogSchema);