// models/BannerTemplate.js
const mongoose = require('mongoose');

/**
 * Schema para estilos de componentes
 * Almacena propiedades CSS aplicables a todos los componentes
 */
const ComponentStyleSchema = new mongoose.Schema({
  // Posición y dimensiones
  position: String,
  top: String,
  right: String,
  bottom: String,
  left: String,
  width: String,
  height: String,
  maxWidth: String,
  maxHeight: String,
  minWidth: String,
  minHeight: String,
  
  // Margen y padding
  margin: mongoose.Schema.Types.Mixed,
  padding: mongoose.Schema.Types.Mixed,
  
  // Tipografía
  fontFamily: String,
  fontSize: String,
  fontWeight: String,
  fontStyle: String,
  lineHeight: String,
  textAlign: String,
  
  // Colores
  color: String,
  backgroundColor: String,
  borderColor: String,
  
  // Bordes
  border: String,
  borderWidth: String,
  borderStyle: String,
  borderRadius: String,
  
  // Otros
  opacity: Number,
  boxShadow: String,
  zIndex: Number,
  cursor: String,
  display: String,
  
  // Permitimos cualquier otro estilo que no esté definido explícitamente
}, { _id: false, strict: false });

/**
 * Schema para posición responsiva de componentes
 * Almacena la posición para cada dispositivo
 */
const ComponentPositionSchema = new mongoose.Schema({
  top: {
    type: String,
    default: '0%'
  },
  left: {
    type: String,
    default: '0%'
  },
  right: String,
  bottom: String
}, { _id: false });

/**
 * Schema para dispositivos responsivos (desktop, tablet, mobile)
 * Aplicable tanto a layout como a componentes
 */
const DeviceStylesSchema = new mongoose.Schema({
  desktop: ComponentStyleSchema,
  tablet: ComponentStyleSchema,
  mobile: ComponentStyleSchema
}, { _id: false });

/**
 * Schema para posiciones responsivas
 */
const DevicePositionsSchema = new mongoose.Schema({
  desktop: ComponentPositionSchema,
  tablet: ComponentPositionSchema,
  mobile: ComponentPositionSchema
}, { _id: false });

/**
 * Schema para layout responsivo
 */
const LayoutDeviceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['modal', 'banner', 'floating'],
    default: 'banner'
  },
  position: {
    type: String,
    enum: ['top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    default: 'bottom'
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: 'auto'
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  minHeight: String
}, { _id: false });

/**
 * Schema completo para layout (desktop, tablet, mobile)
 */
const LayoutSchema = new mongoose.Schema({
  desktop: {
    type: LayoutDeviceSchema,
    required: true,
    default: () => ({})
  },
  tablet: {
    type: LayoutDeviceSchema,
    default: () => ({})
  },
  mobile: {
    type: LayoutDeviceSchema,
    default: () => ({})
  }
}, { _id: false });

/**
 * Schema para acciones de componentes
 */
const ComponentActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'accept_all', 'reject_all', 'save_preferences',
      'show_preferences', 'close', 'none', 'custom'
    ],
    default: 'none'
  },
  callback: String
}, { _id: false });

/**
 * Schema para cada componente
 */
const ComponentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'text',
      'button',
      'link',
      'logo',
      'checkbox',
      'toggle',
      'container',
      'panel',
      'image',
    ],
    required: true
  },
  id: {
    type: String,
    required: true
  },
  action: {
    type: ComponentActionSchema
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(value) {
        // Validar contenido: puede ser string directo o un objeto con texto por idioma
        if (typeof value === 'string') {
          return true;
        }
        
        if (value && typeof value === 'object') {
          // Objeto de contenido con textos por idioma
          if (value.texts && typeof value.texts === 'object') {
            return true;
          }
          
          // Si no hay texto pero hay action, es válido (generaremos texto después)
          if (this.action && this.action.type) {
            return true;
          }
        }
        
        return false;
      },
      message: 'Content must be a string or an object with texts property'
    },
    set: function(value) {
      // Auto-asignar texto por defecto según el tipo de acción
      if (value === undefined || value === null) {
        // Si no hay contenido, asignar texto según acción
        if (this.action?.type === 'accept_all' || this.id === 'acceptAll') {
          return {
            texts: { en: 'Accept All' },
            translatable: true
          };
        } else if (this.action?.type === 'reject_all' || this.id === 'rejectAll') {
          return {
            texts: { en: 'Reject All' },
            translatable: true
          };
        } else if (this.action?.type === 'show_preferences' || this.id === 'preferencesBtn') {
          return {
            texts: { en: 'Preferences' },
            translatable: true
          };
        }
      }
      
      // Auto-convertir strings a estructura de objeto
      if (typeof value === 'string') {
        return {
          texts: { en: value },
          translatable: true
        };
      }
      
      return value;
    }
  },
  style: {
    type: DeviceStylesSchema,
    default: () => ({})
  },
  position: {
    type: DevicePositionsSchema,
    default: () => ({})
  },
  children: [{
    type: mongoose.Schema.Types.Mixed
  }],
  locked: {
    type: Boolean,
    default: false
  },
  centered: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Schema principal para BannerTemplate
 */
const bannerTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    validate: {
      validator: function(v) {
        return this.type !== 'custom' || v != null;
      },
      message: 'ClientId es requerido para plantillas personalizadas'
    }
  },
  // Layout siguiendo formato del frontend
  layout: {
    type: LayoutSchema,
    required: true,
    default: () => ({})
  },
  components: [ComponentSchema],
  theme: {
    colors: {
      primary: String,
      secondary: String,
      accent: String,
      background: String,
      text: String,
      border: String
    },
    fonts: {
      primary: String,
      secondary: String
    },
    spacing: {
      unit: { type: Number, default: 8 }
    },
    animation: {
      type: {
        type: String,
        enum: ['fade','slide','none'],
        default: 'fade'
      },
      duration: {
        type: Number,
        default: 300
      }
    }
  },
  settings: {
    overlay: {
      enabled: { type: Boolean, default: true },
      color: String,
      opacity: Number
    },
    closeButton: {
      enabled: { type: Boolean, default: true },
      position: {
        type: String,
        enum: ['inside','outside'],
        default: 'inside'
      }
    },
    behaviour: {
      autoHide: {
        enabled: Boolean,
        delay: Number
      },
      reshow: {
        enabled: Boolean,
        interval: Number
      },
      preferencesButton: {
        type: String,
        enum: ['always','once','never'],
        default: 'always'
      }
    },
    responsive: {
      breakpoints: {
        mobile: { type: Number, default: 480 },
        tablet: { type: Number, default: 768 }
      }
    }
  },
  metadata: {
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount' },
    isPublic: { type: Boolean, default: false },
    tags: [String],
    category: {
      type: String,
      enum: ['basic','advanced','custom'],
      default: 'custom'
    }
  },
  status: {
    type: String,
    enum: ['draft','active','archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Índices
bannerTemplateSchema.index({ clientId: 1, status: 1 });
bannerTemplateSchema.index({ type: 1, status: 1 });
bannerTemplateSchema.index({ 'metadata.isPublic': 1 });

// Middleware pre-save: incrementa versión si hay cambios
bannerTemplateSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.metadata.version += 1;
  }
  next();
});

// Middleware pre-save: normaliza posiciones
bannerTemplateSchema.pre('save', function(next) {
  if (this.components && Array.isArray(this.components)) {
    this.components.forEach(comp => {
      // Detectar si el componente necesita estar centrado basado en sus estilos
      let needsCentering = false;
      
      if (comp.style) {
        // Verificar si hay textAlign: center en algún dispositivo
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (comp.style[device] && comp.style[device].textAlign === 'center') {
            needsCentering = true;
          }
        });
        
        // Si es una imagen o logo y está centrado, marcarla
        if ((comp.type === 'image' || comp.type === 'logo') && needsCentering) {
          comp.centered = true;
        }
      }
      
      // Para cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (comp.position && comp.position[device]) {
          // Normalizar top
          if (comp.position[device].top && typeof comp.position[device].top === 'string') {
            if (!comp.position[device].top.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!comp.position[device].top.endsWith('px')) {
                comp.position[device].top = `${comp.position[device].top}px`;
              }
            }
          }
          
          // Normalizar left
          if (comp.position[device].left && typeof comp.position[device].left === 'string') {
            if (!comp.position[device].left.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!comp.position[device].left.endsWith('px')) {
                comp.position[device].left = `${comp.position[device].left}px`;
              }
            }
            
            // Detectar si la posición left parece ser un intento de centrado
            if (comp.position[device].left === '50%' || 
                (comp.position[device].left.endsWith('%') && 
                 parseInt(comp.position[device].left) > 40 && 
                 parseInt(comp.position[device].left) < 60)) {
              comp.centered = true;
            }
          }
          
          // Normalizar right
          if (comp.position[device].right && typeof comp.position[device].right === 'string') {
            if (!comp.position[device].right.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!comp.position[device].right.endsWith('px')) {
                comp.position[device].right = `${comp.position[device].right}px`;
              }
            }
          }
          
          // Normalizar bottom
          if (comp.position[device].bottom && typeof comp.position[device].bottom === 'string') {
            if (!comp.position[device].bottom.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!comp.position[device].bottom.endsWith('px')) {
                comp.position[device].bottom = `${comp.position[device].bottom}px`;
              }
            }
          }
        }
      });
    });
  }
  next();
});

// Métodos de instancia
bannerTemplateSchema.methods = {
  async clone(newClientId, newName) {
    const clone = this.toObject();
    delete clone._id;
    clone.clientId = newClientId;
    clone.name = newName;
    clone.type = 'custom';
    clone.metadata.version = 1;
    clone.status = 'draft';
    return await this.constructor.create(clone);
  },

  exportConfig() {
    return {
      layout: this.layout,
      components: this.components,
      theme: this.theme,
      settings: this.settings
    };
  },

  validateComponents() {
    const errors = [];
    const requiredActions = ['accept_all'];
    const actions = this.components
      .filter(c => c.action && c.action.type)
      .map(c => c.action.type);
    requiredActions.forEach(action => {
      if (!actions.includes(action)) {
        errors.push(`Falta componente con acción: ${action}`);
      }
    });
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Métodos estáticos
bannerTemplateSchema.statics = {
  async getPublicTemplates() {
    return this.find({
      type: 'system',
      status: 'active',
      'metadata.isPublic': true
    });
  },
  async getClientTemplates(clientId) {
    return this.find({
      $or: [
        { clientId, type: 'custom' },
        { type: 'system', 'metadata.isPublic': true }
      ],
      status: { $ne: 'archived' }
    });
  }
};

module.exports = mongoose.model('BannerTemplate', bannerTemplateSchema);