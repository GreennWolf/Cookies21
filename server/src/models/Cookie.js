const mongoose = require('mongoose');

const cookieSchema = new mongoose.Schema({
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,  // Debe ser String, no un objeto
    default: 'Unknown'
  },
  category: {
    type: String,
    enum: ['necessary', 'analytics', 'marketing', 'personalization','unknown'],
    required: true
  },
  description: {
    en: {
      type: String,
      required: false,
      default: 'Auto-detected cookie'
    },
    auto: {
      type: Boolean,
      default: true
    }
  },
  scriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script'
  },
  purpose: {
    id: Number,
    name: String,
    description: String
  },
    providerDetails: {
    name: String,
    category: String,
    iabVendorId: Number,
    url: String,
    verified: Boolean
  },
  attributes: {
    duration:{type: String},
    type:{type: String},
    path:{type: String},
    domain:{type: String},
    secure: {type:Boolean},
    httpOnly: {type:Boolean},
    sameSite: {
      type: String,
      enum: ['Strict', 'Lax', 'None' , '']
    }
  },
  detection: {
    method: {
      type: String,
      enum: ['scan', 'manual', 'import'],
      default: 'scan'
    },
    firstDetected: {
      type: Date,
      default: Date.now
    },
    lastSeen: Date,
    frequency: {
      type: Number,
      default: 0
    },
    pattern: String  // Patrón usado para detectar la cookie
  },
  script: {
    content: String,
    url: String,
    async: Boolean,
    defer: Boolean,
    type: {
      type: String,
      enum: ['inline', 'external', 'none'],
      default: 'none'
    },
    loadOrder: {
      type: Number,
      default: 0
    }
  },
  compliance: {
    iabVendorId: Number,
    iabPurposeId: Number,
    gdprRequired: {
      type: Boolean,
      default: true
    },
    ccpaRequired: {
      type: Boolean,
      default: false
    },
    retentionPeriod: String,  // Período de retención de datos
    dataSharingPurposes: [String]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_review'],
    default: 'active'
  },
  metadata: {
    createdBy: {
      type: String,
      enum: ['system', 'user', 'scan'],
      default: 'system'
    },
    lastModifiedBy: String,
    version: {
      type: Number,
      default: 1
    },
    notes: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
cookieSchema.index({ domainId: 1, name: 1 });
cookieSchema.index({ category: 1 });
cookieSchema.index({ status: 1 });
cookieSchema.index({ 'compliance.iabVendorId': 1 });

// Middleware pre-save
cookieSchema.pre('save', async function(next) {
  if (this.isModified('script.content') || this.isModified('script.url')) {
    this.metadata.version += 1;
  }
  
  if (this.isNew) {
    this.detection.firstDetected = new Date();
    this.detection.lastSeen = new Date();
  }

  // Asegurar que description.en siempre tenga un valor
  if (!this.description.en) {
    this.description.en = `Auto-detected: ${this.name}`;
    this.description.auto = true;
  }

  next();
});

// Métodos de instancia
cookieSchema.methods = {
  // Clasificar automáticamente la cookie
  async autoClassify() {
    const knownPatterns = {
      analytics: [
        '_ga', '_gid', 'analytics', 'statistic', 'stats',
        'gtag', 'pixel', '_fbp', '_hjid', 'umami'
      ],
      marketing: [
        'ads', 'campaign', 'track', 'visitor', 
        'marketing', 'promotion', 'banner',
        'doubleclick', 'facebook', 'linkedin'
      ],
      necessary: [
        'session', 'csrf', 'token', 'auth', 
        'security', 'essential', 'necessary',
        'gdpr', 'cookie_consent'
      ],
      personalization: [
        'pref', 'custom', 'user', 'theme',
        'language', 'currency', 'region',
        'timezone', 'display'
      ]
    };

    for (const [category, patterns] of Object.entries(knownPatterns)) {
      if (patterns.some(pattern => 
        this.name.toLowerCase().includes(pattern) ||
        (this.provider && this.provider.toLowerCase().includes(pattern))
      )) {
        this.category = category;
        this.detection.pattern = pattern;
        return true;
      }
    }

    return false;
  },

  // Actualizar última vez vista
  async updateLastSeen() {
    this.detection.lastSeen = new Date();
    this.detection.frequency += 1;
    return this.save();
  },

  // Generar script HTML
  generateScriptHtml() {
    if (this.script.type === 'none') return '';

    const classAttribute = `cmp-${this.category}`;
    
    if (this.script.type === 'external') {
      return `<script 
        type="text/plain" 
        class="${classAttribute}"
        src="${this.script.url}"
        ${this.script.async ? 'async' : ''}
        ${this.script.defer ? 'defer' : ''}
      ></script>`;
    }

    return `<script type="text/plain" class="${classAttribute}">
      ${this.script.content}
    </script>`;
  },

  // Validar cumplimiento
  validateCompliance() {
    const issues = [];

    if (!this.description.en) {
      issues.push('Missing description');
    }

    if (this.category !== 'necessary' && !this.compliance.gdprRequired) {
      issues.push('Non-necessary cookies must require GDPR consent');
    }

    if (!this.attributes.duration) {
      issues.push('Missing cookie duration');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

// Métodos estáticos
cookieSchema.statics = {
  // Encontrar cookies similares
  async findSimilar(cookie) {
    return this.find({
      name: { $regex: new RegExp(cookie.name, 'i') },
      category: cookie.category
    });
  },

  // Obtener estadísticas por categoría
  async getStatsByCategory(domainId) {
    return this.aggregate([
      { $match: { domainId: mongoose.Types.ObjectId(domainId) } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        active: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
          }
        }
      }}
    ]);
  }
};

module.exports = mongoose.model('Cookie', cookieSchema);