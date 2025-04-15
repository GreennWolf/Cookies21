const mongoose = require('mongoose');

const geoDataSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['country', 'region', 'state', 'custom'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  regulations: [{
    type: {
      type: String,
      enum: ['gdpr', 'ccpa', 'lgpd', 'pipeda', 'custom'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'active'
    },
    effectiveDate: Date,
    requirements: {
      explicitConsent: Boolean,
      minAge: Number,
      maxRetentionDays: Number,
      requiresNotification: Boolean,
      specialCategories: [String]
    }
  }],
  rules: {
    bannerConfig: {
      required: {
        type: Boolean,
        default: true
      },
      allowDismiss: {
        type: Boolean,
        default: false
      },
      requiresExplicitAction: {
        type: Boolean,
        default: true
      }
    },
    cookies: {
      requiredCategories: [{
        type: String,
        enum: ['necessary', 'analytics', 'marketing', 'personalization']
      }],
      maxAge: {
        type: Number,  // en días
        default: 365
      },
      requiresRenewal: {
        type: Boolean,
        default: false
      }
    },
    purposes: {
      required: [Number],  // IDs de propósitos requeridos
      prohibited: [Number], // IDs de propósitos prohibidos
      requiresLegalBasis: {
        type: Boolean,
        default: true
      }
    },
    vendors: {
      requiresDisclosure: {
        type: Boolean,
        default: true
      },
      maxAllowed: Number,
      restrictedVendors: [{
        vendorId: Number,
        reason: String
      }]
    }
  },
  defaultSettings: {
    language: {
      type: String,
      default: 'en'
    },
    currency: String,
    timezone: String,
    dateFormat: String
  },
  restrictions: {
    ipRanges: [{
      start: String,
      end: String,
      priority: Number
    }],
    domains: [{
      pattern: String,
      action: {
        type: String,
        enum: ['allow', 'block', 'restrict'],
        default: 'allow'
      }
    }],
    services: [{
      type: String,
      restricted: Boolean,
      conditions: [String]
    }]
  },
  compliance: {
    dataRetention: {
      consentLogs: {
        type: Number,  // días
        default: 365
      },
      activityLogs: {
        type: Number,  // días
        default: 90
      }
    },
    reporting: {
      required: {
        type: Boolean,
        default: false
      },
      frequency: String,
      format: [String]
    },
    documentation: {
      required: {
        type: Boolean,
        default: false
      },
      types: [String]
    }
  },
  metadata: {
    source: String,
    lastVerified: Date,
    notes: String,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Índices
geoDataSchema.index({ code: 1 }, { unique: true });
geoDataSchema.index({ type: 1 });
geoDataSchema.index({ 'regulations.type': 1 });

// Middleware pre-save
geoDataSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.metadata.version += 1;
  }
  next();
});

// Métodos de instancia
geoDataSchema.methods = {
  // Verificar si una regulación está activa
  isRegulationActive(regulationType) {
    const regulation = this.regulations.find(r => r.type === regulationType);
    return regulation && regulation.status === 'active' &&
           (!regulation.effectiveDate || regulation.effectiveDate <= new Date());
  },

  // Obtener configuración para un dominio específico
  getDomainConfig(domain) {
    const domainRule = this.restrictions.domains.find(d => 
      new RegExp(d.pattern).test(domain)
    );
    return domainRule ? domainRule.action : 'allow';
  },

  // Verificar si una IP está en el rango
  isIpInRange(ip) {
    // Implementar lógica de verificación de IP
    return this.restrictions.ipRanges.some(range => {
      return this.ipInRange(ip, range.start, range.end);
    });
  },

  // Obtener requisitos de consentimiento
  getConsentRequirements() {
    const requirements = new Set();
    this.regulations
      .filter(r => r.status === 'active')
      .forEach(r => {
        if (r.requirements.explicitConsent) {
          requirements.add('explicit_consent');
        }
        if (r.requirements.requiresNotification) {
          requirements.add('notification');
        }
      });
    return Array.from(requirements);
  }
};

// Métodos estáticos
geoDataSchema.statics = {
  // Encontrar configuración por IP
  async findByIp(ip) {
    const regions = await this.find();
    return regions.find(region => region.isIpInRange(ip));
  },

  // Obtener configuraciones activas por tipo de regulación
  async getActiveRegulations(regulationType) {
    return this.find({
      'regulations': {
        $elemMatch: {
          type: regulationType,
          status: 'active',
          effectiveDate: { $lte: new Date() }
        }
      }
    });
  },

  // Actualizar reglas masivamente
  async updateRules(regulationType, rules) {
    return this.updateMany(
      { 'regulations.type': regulationType },
      { $set: { 'rules': rules } }
    );
  },

  // Validar configuración contra regulación
  validateConfig(config, regulations) {
    const errors = [];
    regulations.forEach(reg => {
      if (reg.requirements.explicitConsent && 
          !config.bannerConfig.requiresExplicitAction) {
        errors.push(`${reg.type} requires explicit consent`);
      }
      // Más validaciones según sea necesario
    });
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = mongoose.model('GeoData', geoDataSchema);