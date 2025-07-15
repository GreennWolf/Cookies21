const mongoose = require('mongoose');

const vendorListSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
    unique: true
  },
  lastUpdated: {
    type: Date,
    required: true
  },
  vendors: [{
    id: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    purposes: [Number],
    legIntPurposes: [Number],
    flexiblePurposes: [Number],
    specialPurposes: [Number],
    features: [Number],
    specialFeatures: [Number],
    policyUrl: String,
    cookieMaxAgeSeconds: Number,
    usesCookies: {
      type: Boolean,
      default: true
    },
    deviceStorageDisclosureUrl: String,
    deletedDate: Date,
    urls: [{
      langId: String,
      privacy: String,
      legIntClaim: String
    }]
  }],
  purposes: [{
    id: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    descriptionLegal: String,
    consentable: {
      type: Boolean,
      default: true
    },
    rightToObject: {
      type: Boolean,
      default: true
    }
  }],
  specialPurposes: [{
    id: Number,
    name: String,
    description: String,
    descriptionLegal: String
  }],
  features: [{
    id: Number,
    name: String,
    description: String,
    descriptionLegal: String
  }],
  specialFeatures: [{
    id: Number,
    name: String,
    description: String,
    descriptionLegal: String
  }],
  stacks: [{
    id: Number,
    name: String,
    description: String,
    purposes: [Number],
    specialFeatures: [Number]
  }],
  metadata: {
    fetchedFrom: String,
    fetchTimestamp: Date,
    ttl: {
      type: Number,
      default: 604800 // COMPLIANCE POINT 7: 7 días (una semana) de caché para el GVL según IAB TCF
    },
    status: {
      type: String,
      enum: ['current', 'outdated', 'error'],
      default: 'current'
    },
    errors: [{
      date: Date,
      message: String,
      code: String
    }]
  },
  translations: {
    type: Map,
    of: new mongoose.Schema({
      purposes: Map,
      specialPurposes: Map,
      features: Map,
      specialFeatures: Map,
      stacks: Map
    }, { _id: false })
  }
}, {
  timestamps: true
});

// Índices
vendorListSchema.index({ 'metadata.status': 1 });
vendorListSchema.index({ lastUpdated: -1 });

// Middleware pre-save
vendorListSchema.pre('save', function(next) {
  if (this.isNew) {
    this.metadata.fetchTimestamp = new Date();
  }
  next();
});

// Métodos de instancia
vendorListSchema.methods = {
  // Verificar si la lista está actualizada
  isOutdated() {
    const now = new Date();
    const ttlMs = this.metadata.ttl * 1000;
    return (now - this.metadata.fetchTimestamp) > ttlMs;
  },

  // Obtener vendor por ID
  getVendor(vendorId) {
    return this.vendors.find(v => v.id === vendorId);
  },

  // Obtener propósito por ID
  getPurpose(purposeId) {
    return this.purposes.find(p => p.id === purposeId);
  },

  // Validar vendor contra propósitos
  validateVendorPurposes(vendorId, purposeIds) {
    const vendor = this.getVendor(vendorId);
    if (!vendor) return false;

    return purposeIds.every(purposeId => 
      vendor.purposes.includes(purposeId) ||
      vendor.legIntPurposes.includes(purposeId)
    );
  },

  // Obtener traducción
  getTranslation(languageCode, category, id) {
    const langTranslations = this.translations.get(languageCode);
    if (!langTranslations) return null;

    const categoryTranslations = langTranslations[category];
    if (!categoryTranslations) return null;

    return categoryTranslations.get(id.toString());
  }
};

// Métodos estáticos
vendorListSchema.statics = {
  // Obtener la última versión
  async getLatest() {
    return this.findOne({
      'metadata.status': 'current'
    }).sort({ version: -1 });
  },

  // Actualizar desde GVL
  async updateFromGVL(gvlData) {
    const existingVersion = await this.findOne({ version: gvlData.vendorListVersion });
    
    if (existingVersion) {
      existingVersion.metadata.status = 'outdated';
      await existingVersion.save();
    }

    return await this.create({
      version: gvlData.vendorListVersion,
      lastUpdated: gvlData.lastUpdated,
      vendors: gvlData.vendors,
      purposes: gvlData.purposes,
      specialPurposes: gvlData.specialPurposes,
      features: gvlData.features,
      specialFeatures: gvlData.specialFeatures,
      stacks: gvlData.stacks,
      metadata: {
        fetchedFrom: gvlData.source,
        status: 'current'
      }
    });
  },

  // Obtener cambios entre versiones
  async getVersionDiff(oldVersion, newVersion) {
    const [oldList, newList] = await Promise.all([
      this.findOne({ version: oldVersion }),
      this.findOne({ version: newVersion })
    ]);

    if (!oldList || !newList) return null;

    const changes = {
      vendors: {
        added: [],
        removed: [],
        modified: []
      },
      purposes: {
        added: [],
        removed: [],
        modified: []
      }
    };

    // Comparar vendors
    const oldVendorIds = new Set(oldList.vendors.map(v => v.id));
    const newVendorIds = new Set(newList.vendors.map(v => v.id));

    for (const vendor of newList.vendors) {
      if (!oldVendorIds.has(vendor.id)) {
        changes.vendors.added.push(vendor);
      } else {
        const oldVendor = oldList.vendors.find(v => v.id === vendor.id);
        if (JSON.stringify(oldVendor) !== JSON.stringify(vendor)) {
          changes.vendors.modified.push({
            id: vendor.id,
            old: oldVendor,
            new: vendor
          });
        }
      }
    }

    changes.vendors.removed = oldList.vendors
      .filter(v => !newVendorIds.has(v.id));

    return changes;
  }
};

module.exports = mongoose.model('VendorList', vendorListSchema);