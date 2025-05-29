const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
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
  settings: {
    design: {
      theme: {
        primary: String,
        secondary: String,
        background: String,
        text: String
      },
      position: {
        type: String,
        enum: ['top', 'bottom', 'center'],
        default: 'bottom'
      },
      layout: {
        type: String,
        enum: ['bar', 'box', 'modal'],
        default: 'bar'
      }
    },
    defaultTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerTemplate'
    },
    scanning: {
      enabled: {
        type: Boolean,
        default: true
      },
      interval: {
        type: Number,
        default: 24
      },
      lastScan: Date,
      autoDetect: {
        type: Boolean,
        default: true
      }
    },
    purposes: [{
      id: Number,
      name: String,
      enabled: Boolean,
      legIntEnabled: Boolean,
      showInPopup: {
        type: Boolean,
        default: true
      }
    }],
    vendors: [{
      id: Number,
      name: String,
      enabled: Boolean,
      url: String
    }],
    banner: {
      components: [{
        type: {
          type: String,
          enum: ['text', 'button', 'logo', 'link', 'container']
        },
        id: String,
        position: {
          x: Number,
          y: Number,
          width: Number,
          height: Number
        },
        style: {
          backgroundColor: String,
          backgroundOpacity: Number,
          borderRadius: Number,
          padding: {
            top: Number,
            right: Number,
            bottom: Number,
            left: Number
          },
          margin: {
            top: Number,
            right: Number,
            bottom: Number,
            left: Number
          },
          font: {
            family: String,
            size: Number,
            weight: String,
            color: String
          },
          textAlign: String,
          verticalAlign: String,
          hover: {
            backgroundColor: String,
            color: String,
            opacity: Number
          }
        },
        content: {
          type: String,
          value: String,
          action: {
            type: String,
            callback: String
          }
        },
        responsive: {
          mobile: {
            hidden: Boolean,
            position: Object,
            style: Object
          },
          tablet: {
            hidden: Boolean,
            position: Object,
            style: Object
          }
        }
      }],
      animation: {
        type: String,
        duration: Number
      },
      overlay: {
        enabled: Boolean,
        color: String,
        opacity: Number
      }
    }
  },
  
  // Configuración para análisis programados
  analysisSchedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    time: {
      type: String,
      default: '02:00' // Formato HH:mm
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }], // Para frecuencia semanal
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: 1 // Para frecuencia mensual
    },
    analysisConfig: {
      scanType: {
        type: String,
        enum: ['quick', 'full', 'deep'],
        default: 'full'
      },
      includeSubdomains: {
        type: Boolean,
        default: true
      },
      maxUrls: {
        type: Number,
        default: 100,
        min: 1,
        max: 1000
      },
      depth: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
      }
    },
    lastRun: Date,
    nextRun: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  }
}, { 
  timestamps: true 
});

// Índice para filtrar por clientId
domainSchema.index({ clientId: 1 });

// Validación de dominio en pre-save
domainSchema.pre('save', function(next) {
  const domainRegex = /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|localhost)$/;
  if (!domainRegex.test(this.domain)) {
    return next(new Error('Dominio inválido'));
  }
  next();
});

// Método de instancia para verificar si el dominio está activo
domainSchema.methods.isActive = function() {
  return this.status === 'active';
};

// Método para obtener la configuración completa del dominio
domainSchema.methods.getFullConfig = function() {
  return {
    domain: this.domain,
    settings: this.settings,
    status: this.status
  };
};

// Método para actualizar el estado del escaneo
domainSchema.methods.updateScanStatus = async function() {
  this.settings.scanning.lastScan = new Date();
  return this.save();
};

// Método para obtener las cookies asociadas a este dominio
domainSchema.methods.getCookies = async function() {
  // Se asume que existe un modelo Cookie (por ejemplo, en './Cookie')
  // y que cada cookie tiene un campo "domain" que almacena el ObjectId del dominio.
  const Cookie = require('./Cookie'); // Ajusta la ruta según corresponda
  return await Cookie.find({ domain: this._id });
};

module.exports = mongoose.model('Domain', domainSchema);
