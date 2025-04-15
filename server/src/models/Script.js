const mongoose = require('mongoose');
const crypto = require('crypto');

const scriptSchema = new mongoose.Schema({
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
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['analytics', 'marketing', 'personalization', 'necessary'],
    required: true
  },
  content: {
    type: String,
    // Requerido solo si type es 'inline'
    validate: {
      validator: function(v) {
        return this.type !== 'inline' || (v && v.length > 0);
      },
      message: 'Content is required for inline scripts'
    }
  },
  url: {
    type: String,
    // Requerido solo si type es 'external'
    validate: {
      validator: function(v) {
        return this.type !== 'external' || (v && v.length > 0);
      },
      message: 'URL is required for external scripts'
    }
  },
  type: {
    type: String,
    enum: ['inline', 'external'],
    required: true
  },
  loadConfig: {
    async: {
      type: Boolean,
      default: false
    },
    defer: {
      type: Boolean,
      default: false
    },
    attributes: [{
      name: String,
      value: String
    }],
    loadOrder: {
      type: Number,
      default: 0
    }
  },
  dependencies: [{
    scriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Script'
    },
    loadOrder: Number
  }],
  blockingConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    replacementContent: String,  // Contenido a mostrar mientras está bloqueado
    fallbackBehavior: {
      type: String,
      enum: ['none', 'placeholder', 'custom'],
      default: 'none'
    }
  },
  compliance: {
    iabVendorId: Number,
    purposeIds: [Number],
    gdprRequired: {
      type: Boolean,
      default: true
    },
    ccpaRequired: {
      type: Boolean,
      default: false
    },
    requiresConsentBefore: {
      type: Boolean,
      default: true
    }
  },
  detection: {
    hash: String,  // Hash del contenido para detectar cambios
    version: {
      type: String,
      default: '1.0.0'
    },
    lastVerified: Date,
    changes: [{
      date: Date,
      type: {
        type: String,
        enum: ['content', 'url', 'configuration']
      },
      description: String
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_review', 'blocked'],
    default: 'pending_review'
  },
  metadata: {
    createdBy: {
      type: String,
      enum: ['system', 'user', 'scan'],
      default: 'system'
    },
    lastModifiedBy: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
},{ suppressWarning: true });

// Índices
scriptSchema.index({ domainId: 1, category: 1 });
scriptSchema.index({ provider: 1 });
scriptSchema.index({ status: 1 });
scriptSchema.index({ 'detection.hash': 1 });

// Middleware pre-save para generar hash
scriptSchema.pre('save', async function(next) {
  if (this.isModified('content') || this.isModified('url')) {
    const hashContent = this.type === 'inline' ? this.content : this.url;
    this.detection.hash = crypto
      .createHash('sha256')
      .update(hashContent)
      .digest('hex');

    // Registrar cambio
    this.detection.changes.push({
      date: new Date(),
      type: this.isModified('content') ? 'content' : 'url',
      description: 'Content or URL updated'
    });
  }
  next();
});

// Métodos de instancia
scriptSchema.methods = {
  // Generar HTML del script
  generateHtml() {
    const classAttribute = `cmp-${this.category}`;
    const attributes = this.loadConfig.attributes
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');

    if (this.type === 'external') {
      return `<script 
        type="text/plain" 
        class="${classAttribute}"
        src="${this.url}"
        ${this.loadConfig.async ? 'async' : ''}
        ${this.loadConfig.defer ? 'defer' : ''}
        ${attributes}
      ></script>`;
    }

    return `<script type="text/plain" class="${classAttribute}">
      ${this.content}
    </script>`;
  },

  // Validar script
  async validate() {
    const issues = [];

    if (this.type === 'external') {
      try {
        const response = await fetch(this.url, { method: 'HEAD' });
        if (!response.ok) {
          issues.push('Script URL is not accessible');
        }
      } catch (error) {
        issues.push(`Error accessing script URL: ${error.message}`);
      }
    }

    if (this.dependencies.length > 0) {
      const deps = await mongoose.model('Script').find({
        _id: { $in: this.dependencies.map(d => d.scriptId) }
      });
      
      if (deps.length !== this.dependencies.length) {
        issues.push('Some dependencies are not found');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  },

  // Comprobar cambios en script externo
  async checkForUpdates() {
    if (this.type !== 'external') return null;

    try {
      const response = await fetch(this.url);
      const content = await response.text();
      const newHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      if (newHash !== this.detection.hash) {
        return {
          hasChanged: true,
          oldHash: this.detection.hash,
          newHash
        };
      }

      return { hasChanged: false };
    } catch (error) {
      throw new Error(`Error checking for updates: ${error.message}`);
    }
  }
};

// Métodos estáticos
scriptSchema.statics = {
  // Encontrar scripts similares
  async findSimilar(script) {
    return this.find({
      $or: [
        { name: { $regex: new RegExp(script.name, 'i') } },
        { provider: script.provider },
        { 'detection.hash': script.detection.hash }
      ]
    });
  },

  // Obtener scripts por orden de carga
  async getLoadOrder(domainId) {
    const scripts = await this.find({ 
      domainId,
      status: 'active'
    }).sort('loadConfig.loadOrder');

    return this.resolveLoadDependencies(scripts);
  },

  // Resolver dependencias de carga
  resolveLoadDependencies(scripts) {
    const ordered = [];
    const visited = new Set();

    function visit(script) {
      if (visited.has(script._id.toString())) return;
      
      script.dependencies.forEach(dep => {
        const depScript = scripts.find(s => 
          s._id.toString() === dep.scriptId.toString()
        );
        if (depScript) visit(depScript);
      });

      visited.add(script._id.toString());
      ordered.push(script);
    }

    scripts.forEach(script => visit(script));
    return ordered;
  }
};

module.exports = mongoose.model('Script', scriptSchema);