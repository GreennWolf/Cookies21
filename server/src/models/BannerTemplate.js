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
  
  // Flexbox
  flexDirection: String,
  justifyContent: String,
  alignItems: String,
  flexWrap: String,
  flex: String,
  gap: String,
  
  // Transformaciones
  transform: String,
  transformOrigin: String,
  
  // Transiciones
  transition: String,
  
  // Filtros
  filter: String,
  backdropFilter: String,
  
  // Otros
  opacity: Number,
  boxShadow: String,
  zIndex: Number,
  cursor: String,
  display: String,
  overflow: String,
  pointerEvents: String,
  userSelect: String,
  
  // Metadatos para vista previa de imágenes
  _previewUrl: String,
  _aspectRatio: Number,
  
  // Permitimos cualquier otro estilo que no esté definido explícitamente
}, { _id: false, strict: false });

/**
 * Schema para posición responsiva de componentes
 * Almacena la posición para cada dispositivo
 */
const ComponentPositionSchema = new mongoose.Schema({
  // Propiedades básicas de posición (absolutas)
  top: {
    type: String,
    default: '0%'
  },
  left: {
    type: String,
    default: '0%'
  },
  right: String,
  bottom: String,
  
  // Propiedades mejoradas para posicionamiento responsivo
  alignment: {
    type: String,
    enum: ['default', 'center', 'left', 'right', 'top', 'bottom', 
           'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center-left', 'center-right'],
    default: 'default'
  },
  // Valores para posicionamiento relativo como porcentaje del contenedor
  percentX: {
    type: Number,
    min: 0,
    max: 100
  },
  percentY: {
    type: Number,
    min: 0,
    max: 100
  },
  // Offset para ajuste fino respecto a la alineación (en píxeles)
  offsetX: {
    type: Number,
    default: 0
  },
  offsetY: {
    type: Number,
    default: 0
  },
  // Transformación para centrado (desplazamiento respecto al centro del componente)
  transformX: {
    type: String,
    enum: ['none', 'center', 'left', 'right'],
    default: 'none'
  },
  transformY: {
    type: String,
    enum: ['none', 'center', 'top', 'bottom'],
    default: 'none'
  },
  // Propiedad para saber si está vinculado a otro componente
  relativeTo: {
    type: String // ID del componente al que está vinculado
  }
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
 * Schema para configuración de contenedores por dispositivo
 */
const ContainerDeviceConfigSchema = new mongoose.Schema({
  displayMode: {
    type: String,
    enum: ['libre', 'flex', 'grid'],
    default: 'libre'
  },
  allowDrops: {
    type: Boolean,
    default: true
  },
  nestingLevel: {
    type: Number,
    default: 0,
    max: 5
  },
  maxChildren: {
    type: Number,
    default: 50
  },
  // Configuraciones específicas de flexbox
  flexDirection: {
    type: String,
    enum: ['row', 'column', 'row-reverse', 'column-reverse'],
    default: 'row'
  },
  justifyContent: {
    type: String,
    enum: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    default: 'flex-start'
  },
  alignItems: {
    type: String,
    enum: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
    default: 'flex-start'
  },
  gap: {
    type: String,
    default: '0px'
  },
  flexWrap: {
    type: String,
    enum: ['nowrap', 'wrap', 'wrap-reverse'],
    default: 'nowrap'
  },
  // Configuraciones específicas de grid
  gridTemplateColumns: String,
  gridTemplateRows: String,
  gridGap: String,
  gridAutoFlow: {
    type: String,
    enum: ['row', 'column', 'dense', 'row dense', 'column dense'],
    default: 'row'
  },
  justifyItems: {
    type: String,
    enum: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
    default: 'flex-start'
  }
}, { _id: false });

/**
 * Schema para configuración responsiva de contenedores
 */
const ResponsiveContainerConfigSchema = new mongoose.Schema({
  desktop: ContainerDeviceConfigSchema,
  tablet: ContainerDeviceConfigSchema,
  mobile: ContainerDeviceConfigSchema
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
  minHeight: String,
  // Propiedades específicas para banners flotantes
  floatingCorner: {
    type: String,
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    default: 'bottom-right'
  },
  floatingMargin: {
    type: String,
    default: '20'
  },
  // Data attributes para el script
  'data-floating-corner': String,
  'data-floating-margin': String,
  'data-width': String
}, { _id: false, strict: false });

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
      'language-button'
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
        // Para language-button, permitir estructura de configuración específica
        if (this.type === 'language-button') {
          if (value && typeof value === 'object') {
            // Validar que tenga las propiedades básicas de language-button
            const hasValidMode = ['auto', 'manual'].includes(value.defaultLanguageMode);
            const hasLanguages = Array.isArray(value.languages) && value.languages.length > 0;
            return hasValidMode || hasLanguages || true; // Ser permisivo por ahora
          }
          return true;
        }
        
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
      message: 'Content must be a string, an object with texts property, or language-button configuration'
    },
    set: function(value) {
      // Auto-asignar texto por defecto según el tipo de acción
      if (value === undefined || value === null) {
        // Si no hay contenido, asignar texto según acción con traducciones predefinidas
        if (this.action?.type === 'accept_all' || this.id === 'acceptAll') {
          return {
            texts: { 
              en: 'Accept All',
              es: 'Aceptar todo',
              fr: 'Tout accepter',
              de: 'Alle akzeptieren',
              it: 'Accetta tutto',
              pt: 'Aceitar tudo'
            },
            translatable: false, // No necesita traducción automática
            isSystemText: true
          };
        } else if (this.action?.type === 'reject_all' || this.id === 'rejectAll') {
          return {
            texts: { 
              en: 'Reject All',
              es: 'Rechazar todo',
              fr: 'Tout refuser',
              de: 'Alle ablehnen',
              it: 'Rifiuta tutto',
              pt: 'Rejeitar tudo'
            },
            translatable: false,
            isSystemText: true
          };
        } else if (this.action?.type === 'show_preferences' || this.id === 'preferencesBtn') {
          return {
            texts: { 
              en: 'Preferences',
              es: 'Preferencias',
              fr: 'Préférences',
              de: 'Einstellungen',
              it: 'Preferenze',
              pt: 'Preferências'
            },
            translatable: false,
            isSystemText: true
          };
        }
        
        // Si es un language-button sin contenido, asignar configuración por defecto
        if (this.type === 'language-button') {
          return {
            displayMode: 'flag-dropdown',
            languages: ['es', 'en', 'fr', 'de', 'it', 'pt'],
            defaultLanguageMode: 'auto',
            defaultLanguage: 'es',
            showLabel: true,
            labelText: 'Idioma:',
            size: 'medium',
            style: 'modern',
            position: 'inline',
            required: true,
            autoDetectBrowserLanguage: true,
            fallbackLanguage: 'en',
            saveUserPreference: true
          };
        }
      }
      
      // TEMPORALMENTE DESHABILITADO - mantener strings como strings para compatibilidad
      // TODO: Habilitar cuando el frontend esté preparado para manejar objetos
      /*
      // Auto-convertir strings a estructura de objeto con soporte multi-idioma
      if (typeof value === 'string') {
        return {
          texts: { 
            en: value,
            // Las traducciones se agregarán dinámicamente
          },
          originalLanguage: 'en',
          translatable: true,
          lastTranslated: null
        };
      }
      */
      
      // Si ya es un objeto con estructura de traducciones, mantenerlo
      if (value && typeof value === 'object' && value.texts) {
        return value; // Mantener el objeto tal como está
      }
      
      // Para todo lo demás, devolver el valor tal como está (compatibilidad)
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
    type: mongoose.Schema.Types.Mixed,
    ref: 'ComponentSchema'
  }],
  parentId: {
    type: String,
    default: null
  },
  displayMode: {
    type: String,
    enum: ['libre', 'flex', 'grid'],
    default: 'libre'
  },
  locked: {
    type: Boolean,
    default: false
  },
  centered: {
    type: Boolean,
    default: false
  },
  // Propiedades mejoradas para posicionamiento responsivo
  positioning: {
    type: String,
    enum: ['absolute', 'relative', 'responsive'],
    default: 'absolute'
  },
  responsiveConfig: {
    keepAspectRatio: {
      type: Boolean,
      default: false
    },
    maintainSizeOnMobile: {
      type: Boolean,
      default: false
    },
    alignmentPriority: {
      type: String,
      enum: ['position', 'size', 'spacing'],
      default: 'position'
    },
    stackOrder: {
      type: Number,
      default: 0
    }
  },
  // Propiedades para el sistema de drag & drop
  draggable: {
    type: Boolean,
    default: true
  },
  resizable: {
    type: Boolean,
    default: true
  },
  // Configuración específica del contenedor
  containerConfig: {
    type: ResponsiveContainerConfigSchema,
    default: () => ({})
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
      },
      mode: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'auto'
      }
    }
  },
  // Sistema de traducción
  translationStats: {
    supportedLanguages: {
      type: [String],
      default: ['en'] // Inglés siempre incluido
    },
    charactersTranslated: {
      google: { type: Number, default: 0 },
      azure: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    lastTranslationDate: Date,
    autoDetectedLanguage: String, // Idioma detectado del contenido original
    translationProvider: {
      type: String,
      enum: ['google', 'azure', 'manual'],
      default: 'google'
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
          const devicePos = comp.position[device];
          
          // MEJORA: Detectar y configurar alineación automática
          if (comp.centered && !devicePos.alignment) {
            devicePos.alignment = 'center';
            
            // Si es una imagen o botón, configurar transformación para centrado real
            if (comp.type === 'image' || comp.type === 'button') {
              devicePos.transformX = 'center';
              devicePos.transformY = 'center';
            }
          }
          
          // MEJORA: Convertir posiciones absolutas a posiciones relativas (porcentaje)
          // Si el posicionamiento es responsivo, calcular percentX y percentY
          if (comp.positioning === 'responsive' || comp.positioning === 'relative') {
            // Si tiene left (pero no como porcentaje) y no tiene percentX, intenta convertir
            if (devicePos.left && !devicePos.left.endsWith('%') && devicePos.percentX === undefined) {
              // Asumimos que el valor está en píxeles, determinaremos percentX durante la renderización
              // Solo configuramos un marcador para posterior conversión
              devicePos._convertLeftToPercent = true;
            }
            
            // Si tiene top (pero no como porcentaje) y no tiene percentY, intenta convertir
            if (devicePos.top && !devicePos.top.endsWith('%') && devicePos.percentY === undefined) {
              // Asumimos que el valor está en píxeles, determinaremos percentY durante la renderización
              devicePos._convertTopToPercent = true;
            }
            
            // Si ya tiene valores en porcentaje, extraerlos
            if (devicePos.left && devicePos.left.endsWith('%')) {
              devicePos.percentX = parseFloat(devicePos.left);
            }
            
            if (devicePos.top && devicePos.top.endsWith('%')) {
              devicePos.percentY = parseFloat(devicePos.top);
            }
          }
          
          // Normalizar top
          if (devicePos.top && typeof devicePos.top === 'string') {
            if (!devicePos.top.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!devicePos.top.endsWith('px')) {
                devicePos.top = `${devicePos.top}px`;
              }
            }
          }
          
          // Normalizar left
          if (devicePos.left && typeof devicePos.left === 'string') {
            if (!devicePos.left.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!devicePos.left.endsWith('px')) {
                devicePos.left = `${devicePos.left}px`;
              }
            }
            
            // Detectar si la posición left parece ser un intento de centrado
            if (devicePos.left === '50%' || 
                (devicePos.left.endsWith('%') && 
                 parseInt(devicePos.left) > 40 && 
                 parseInt(devicePos.left) < 60)) {
              comp.centered = true;
              // MEJORA: Configurar alineación para centrado
              if (!devicePos.alignment) {
                devicePos.alignment = 'center';
                devicePos.percentX = 50;
              }
            }
          }
          
          // Normalizar right
          if (devicePos.right && typeof devicePos.right === 'string') {
            if (!devicePos.right.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!devicePos.right.endsWith('px')) {
                devicePos.right = `${devicePos.right}px`;
              }
            }
          }
          
          // Normalizar bottom
          if (devicePos.bottom && typeof devicePos.bottom === 'string') {
            if (!devicePos.bottom.endsWith('%')) {
              // Mantener valores en píxeles, solo añadir 'px' si no lo tiene
              if (!devicePos.bottom.endsWith('px')) {
                devicePos.bottom = `${devicePos.bottom}px`;
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
  },
  
  // NUEVO: Método para migrar componentes al nuevo sistema de posicionamiento
  migrateToResponsivePositioning() {
    const updates = [];
    
    if (this.components && Array.isArray(this.components)) {
      this.components.forEach(comp => {
        let wasUpdated = false;
        
        // Establecer el modo de posicionamiento predeterminado según el tipo
        if (!comp.positioning) {
          comp.positioning = 'responsive';
          wasUpdated = true;
        }
        
        // Configurar keep aspect ratio para imágenes
        if (comp.type === 'image' && comp.responsiveConfig?.keepAspectRatio === undefined) {
          if (!comp.responsiveConfig) comp.responsiveConfig = {};
          comp.responsiveConfig.keepAspectRatio = true;
          wasUpdated = true;
        }
        
        // Para cada dispositivo, configurar los valores de alineación y posicionamiento relativo
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (comp.position && comp.position[device]) {
            const devicePos = comp.position[device];
            
            // Si tiene left o top como porcentaje, transformarlos a valores relativos
            if (devicePos.left && devicePos.left.endsWith('%')) {
              devicePos.percentX = parseFloat(devicePos.left);
              wasUpdated = true;
            }
            
            if (devicePos.top && devicePos.top.endsWith('%')) {
              devicePos.percentY = parseFloat(devicePos.top);
              wasUpdated = true;
            }
            
            // Detectar componentes centrados
            if ((devicePos.left === '50%' || 
                (devicePos.left && devicePos.left.endsWith('%') && 
                 parseInt(devicePos.left) > 40 && parseInt(devicePos.left) < 60)) && 
                !devicePos.alignment) {
              devicePos.alignment = 'center';
              devicePos.percentX = 50;
              wasUpdated = true;
            }
            
            // Analizar configuración de transformaciones para centrado real
            if (comp.centered && !devicePos.transformX) {
              devicePos.transformX = 'center';
              wasUpdated = true;
            }
          }
        });
        
        if (wasUpdated) {
          updates.push({
            id: comp.id,
            type: comp.type,
            changes: ['positioning', 'alignments', 'transforms'].filter(c => wasUpdated)
          });
        }
      });
    }
    
    return {
      componentsUpdated: updates.length,
      updates
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
  },
  // NUEVO: Método para migrar todas las plantillas al nuevo sistema
  async migrateAllToResponsivePositioning() {
    const templates = await this.find({ status: { $ne: 'archived' } });
    const results = [];
    
    for (const template of templates) {
      const migrationResult = template.migrateToResponsivePositioning();
      if (migrationResult.componentsUpdated > 0) {
        await template.save();
        results.push({
          templateId: template._id,
          templateName: template.name,
          ...migrationResult
        });
      }
    }
    
    return {
      templatesUpdated: results.length,
      totalTemplates: templates.length,
      details: results
    };
  }
};

module.exports = mongoose.model('BannerTemplate', bannerTemplateSchema);