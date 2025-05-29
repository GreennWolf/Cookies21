const mongoose = require('mongoose');
const { Schema } = mongoose;

const analyticsSchema = new mongoose.Schema({
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  period: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    granularity: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  visits: {
    total: {
      type: Number,
      default: 0
    },
    unique: {
      type: Number,
      default: 0
    },
    returning: {
      type: Number,
      default: 0
    },
    byRegulation: {
      gdpr: {
        type: Number,
        default: 0
      },
      ccpa: {
        type: Number,
        default: 0
      },
      lgpd: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    }
  },
  interactions: {
    total: {
      type: Number,
      default: 0
    },
    types: {
      acceptAll: {
        count: Number,
        percentage: Number
      },
      rejectAll: {
        count: Number,
        percentage: Number
      },
      customize: {
        count: Number,
        percentage: Number
      },
      close: {
        count: Number,
        percentage: Number
      },
      noInteraction: {
        count: Number,
        percentage: Number
      }
    },
    metrics: {
      avgTimeToDecision: Number, // en millisegundos
      avgTimeInPreferences: Number,
      customizationRate: Number, // % de usuarios que personalizan
      bounceRate: Number // % de usuarios que cierran sin interactuar
    }
  },
  consents: {
    cookies: [{
      category: {
        type: String,
        enum: ['necessary', 'analytics', 'marketing', 'personalization']
      },
      total: Number,
      accepted: Number,
      rejected: Number,
      acceptanceRate: Number
    }],
    purposes: [{
      id: Number,
      name: String,
      total: Number,
      accepted: Number,
      rejected: Number,
      acceptanceRate: Number
    }],
    vendors: [{
      id: Number,
      name: String,
      total: Number,
      accepted: Number,
      rejected: Number,
      acceptanceRate: Number
    }]
  },
  demographics: {
    countries: [{
      code: String,
      name: String,
      visits: Number,
      acceptanceRate: Number,
      customizationRate: Number
    }],
    // IMPORTANTE: Para evitar errores de casting, permitimos tanto arrays como tipos mixtos
    devices: Schema.Types.Mixed,
    browsers: [{
      name: String,
      version: String,
      visits: Number,
      acceptanceRate: Number
    }],
    platforms: [{
      name: String,
      visits: Number,
      acceptanceRate: Number
    }]
  },
  performance: {
    loadTime: {
      avg: Number,
      min: Number,
      max: Number
    },
    renderTime: {
      avg: Number,
      min: Number,
      max: Number
    },
    scriptSize: {
      original: Number, // en bytes
      compressed: Number
    },
    errors: [{
      type: String,
      count: Number,
      lastOccurrence: Date
    }]
  },
  tcf: {
    version: String,
    vendorListVersion: String,
    purposes: [{
      id: Number,
      name: String,
      acceptanceRate: Number
    }],
    specialFeatures: [{
      id: Number,
      name: String,
      acceptanceRate: Number
    }],
    stacks: [{
      id: Number,
      name: String,
      acceptanceRate: Number
    }]
  },
  userJourney: {
    sequences: [{
      action: String,        // 'view', 'open_preferences', 'modify', 'save', etc.
      timestamp: Date,
      durationMs: Number,    // Tiempo en esta etapa
      pageContext: String,   // URL o sección donde ocurrió
      previousActions: [String]
    }],
    abandonmentPoint: String, // Última acción antes de abandonar
    completionRate: Number    // % de usuarios que completan el flujo
  },
  
  // Contexto de sesión mejorado
  sessionContext: {
    entryPage: String,       // Landing page
    referrer: String,        // Fuente de tráfico
    pagesViewedBefore: Number, // Profundidad de navegación
    timeOnSiteBefore: Number,  // Segundos antes de interactuar con banner
    deviceContext: {
      screenSize: String,
      orientation: String,
      connectionType: String  // 4G, WiFi, etc.
    }
  },
  
  // Correlaciones de negocio
  businessImpact: {
    conversionRate: {
      withConsent: Number,
      withoutConsent: Number,
      delta: Number
    },
    revenueImpact: {
      estimated: Number,
      byCookieCategory: {
        necessary: Number,
        analytics: Number,
        marketing: Number,
        personalization: Number
      }
    },
    userSegment: String      // 'high_value', 'returning', 'new', etc.
  },
  
  // Métricas UX
  uxMetrics: {
    scrollSpeed: Number,     // px/segundo en texto de política
    hoverTimes: [{
      element: String,
      durationMs: Number
    }],
    indecisionScore: Number, // Cambios entre opciones antes de decidir
    readingTime: Number      // Tiempo en sección de preferencias
  },
  
  // A/B testing
  abTestData: {
    variantId: String,       // Identificador de la variante mostrada
    controlGroup: Boolean,   // Si es parte del grupo de control
    bannerVersion: String,   // Versión del banner
    textVariation: String    // Variación de texto utilizada
  }
}, {
  timestamps: true
});

// Índices
analyticsSchema.index({ domainId: 1, 'period.start': 1, 'period.end': 1 });
analyticsSchema.index({ 'demographics.countries.code': 1 });

// Métodos de instancia
analyticsSchema.methods = {
  // Calcular métricas de conversión
  calculateConversionMetrics() {
    const { total, types } = this.interactions;
    if (!total || total === 0) return {
      acceptanceRate: 0,
      rejectionRate: 0,
      customizationRate: 0,
      bounceRate: 0
    };
    
    // Verificar que types existe y tiene las propiedades necesarias
    if (!types) return {
      acceptanceRate: 0,
      rejectionRate: 0,
      customizationRate: 0,
      bounceRate: 0
    };
    
    // Obtener contadores con defaults seguros
    const acceptAll = types.acceptAll?.count || 0;
    const rejectAll = types.rejectAll?.count || 0;
    const customize = types.customize?.count || 0;
    const noInteraction = types.noInteraction?.count || 0;

    return {
      acceptanceRate: (acceptAll / total) * 100,
      rejectionRate: (rejectAll / total) * 100,
      customizationRate: (customize / total) * 100,
      bounceRate: (noInteraction / total) * 100
    };
  },

  // Obtener resumen de rendimiento
  getPerformanceSummary() {
    // Validar que existe performance
    if (!this.performance) {
      return {
        avgLoadTime: 0,
        errorRate: 0,
        sizeSavings: 0
      };
    }
    
    // Obtener loadTime con defaults seguros
    const avgLoadTime = this.performance.loadTime?.avg || 0;
    
    // Calcular tasa de errores con validación
    let errorRate = 0;
    if (this.performance.errors && Array.isArray(this.performance.errors) && 
        this.visits && this.visits.total > 0) {
      const errorCount = this.performance.errors.reduce((sum, err) => sum + (err.count || 0), 0);
      errorRate = errorCount / this.visits.total;
    }
    
    // Calcular ahorro de tamaño con validación
    let sizeSavings = 0;
    if (this.performance.scriptSize?.original && 
        this.performance.scriptSize?.compressed && 
        this.performance.scriptSize.original > 0) {
      sizeSavings = (1 - (this.performance.scriptSize.compressed / this.performance.scriptSize.original)) * 100;
    }
    
    return {
      avgLoadTime,
      errorRate,
      sizeSavings
    };
  },

  // Obtener top datos demográficos
  getTopDemographics(limit = 5) {
    // Verificar que demographics existe
    if (!this.demographics) {
      return {
        countries: [],
        devices: [],
        browsers: []
      };
    }
    
    // Procesar países con validación
    let countries = [];
    if (this.demographics.countries && Array.isArray(this.demographics.countries)) {
      countries = [...this.demographics.countries]
        .filter(country => country && typeof country === 'object')
        .sort((a, b) => (b.visits || 0) - (a.visits || 0))
        .slice(0, limit);
    }
    
    // Procesar dispositivos con validación (manejar Schema.Types.Mixed)
    let devices = [];
    if (this.demographics.devices) {
      // Si es array, procesarlo normalmente
      if (Array.isArray(this.demographics.devices)) {
        devices = [...this.demographics.devices]
          .filter(device => device && typeof device === 'object')
          .sort((a, b) => (b.visits || 0) - (a.visits || 0))
          .slice(0, limit);
      } 
      // Si es objeto, convertirlo a array para procesar
      else if (typeof this.demographics.devices === 'object') {
        devices = Object.entries(this.demographics.devices)
          .filter(([_, value]) => value && typeof value === 'object')
          .map(([key, value]) => ({
            type: value.type || key,
            visits: value.visits || 0,
            acceptanceRate: value.acceptanceRate || 0
          }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, limit);
      }
    }
    
    // Procesar navegadores con validación
    let browsers = [];
    if (this.demographics.browsers && Array.isArray(this.demographics.browsers)) {
      browsers = [...this.demographics.browsers]
        .filter(browser => browser && typeof browser === 'object')
        .sort((a, b) => (b.visits || 0) - (a.visits || 0))
        .slice(0, limit);
    }
    
    return {
      countries,
      devices,
      browsers
    };
  }
};

// Métodos estáticos
analyticsSchema.statics = {
  // Crear o actualizar analytics para un período
  async upsertPeriod(domainId, period, data) {
    const query = {
      domainId,
      'period.start': period.start,
      'period.end': period.end,
      'period.granularity': period.granularity
    };

    return this.findOneAndUpdate(query, data, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });
  },

  // Obtener tendencias - Método mejorado que puede utilizar datos de ConsentLog como respaldo
  async getTrends(domainId, startDate, endDate, granularity = 'daily') {
    // Validar y convertir domainId a ObjectId
    let objectId;
    try {
      objectId = mongoose.Types.ObjectId(domainId);
    } catch (error) {
      console.error(`Error al convertir domainId a ObjectId en getTrends: ${error.message}`);
      return [];
    }
    
    console.log(`📊 getTrends - Obteniendo tendencias para dominio ${domainId}`);
    console.log(`📊 Período: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 1. Intentar obtener datos de Analytics primero
    const analyticsResults = await this.aggregate([
      {
        $match: {
          domainId: objectId,
          'period.start': { $gte: startDate },
          'period.end': { $lte: endDate },
          'period.granularity': granularity
        }
      },
      {
        $sort: { 'period.start': 1 }
      },
      {
        $project: {
          date: '$period.start',
          visits: '$visits.total',
          acceptanceRate: {
            $multiply: [
              {
                $cond: [
                  { $eq: ['$interactions.total', 0] },
                  0,
                  {
                    $divide: [
                      { $ifNull: ['$interactions.types.acceptAll.count', 0] },
                      { $max: ['$interactions.total', 1] }
                    ]
                  }
                ]
              },
              100
            ]
          },
          customizationRate: {
            $multiply: [
              {
                $cond: [
                  { $eq: ['$interactions.total', 0] },
                  0,
                  {
                    $divide: [
                      { $ifNull: ['$interactions.types.customize.count', 0] },
                      { $max: ['$interactions.total', 1] }
                    ]
                  }
                ]
              },
              100
            ]
          }
        }
      }
    ]);
    
    console.log(`✅ Datos de Analytics: ${analyticsResults.length} registros`);
    
    // 2. Si no hay resultados de Analytics, obtener datos de ConsentLog
    if (!analyticsResults || analyticsResults.length === 0) {
      console.log(`⚠️ No hay datos en Analytics. Obteniendo datos de ConsentLog...`);
      
      try {
        const ConsentLog = mongoose.model('ConsentLog');
        
        // Agrupar consentimientos por día y calcular tasas
        const consentTrends = await ConsentLog.aggregate([
          {
            $match: {
              domainId: objectId,
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { 
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
              },
              total: { $sum: 1 },
              acceptAll: {
                $sum: {
                  $cond: [{ $eq: ["$bannerInteraction.type", "accept_all"] }, 1, 0]
                }
              },
              customize: {
                $sum: {
                  $cond: [{ $eq: ["$bannerInteraction.type", "save_preferences"] }, 1, 0]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              date: { $dateFromString: { dateString: "$_id.date" } },
              visits: "$total",
              acceptanceRate: {
                $multiply: [
                  { $divide: ["$acceptAll", { $max: ["$total", 1] }] },
                  100
                ]
              },
              customizationRate: {
                $multiply: [
                  { $divide: ["$customize", { $max: ["$total", 1] }] },
                  100
                ]
              }
            }
          },
          {
            $sort: { date: 1 }
          }
        ]);
        
        console.log(`✅ Datos obtenidos de ConsentLog: ${consentTrends.length} registros`);
        
        // Si obtuvimos datos de ConsentLog, los usamos
        if (consentTrends && consentTrends.length > 0) {
          return consentTrends;
        }
      } catch (consentError) {
        console.error(`❌ Error obteniendo datos de ConsentLog: ${consentError.message}`);
      }
    }
    
    // 3. Si llegamos aquí, devolvemos los resultados de Analytics (incluso si están vacíos)
    return analyticsResults;
  },

  // Generar reporte comparativo
  async generateComparisonReport(domainIds, period) {
    // Convertir todos los domainIds a ObjectId
    const objectIds = [];
    try {
      for (const id of domainIds) {
        objectIds.push(mongoose.Types.ObjectId(id));
      }
    } catch (error) {
      console.error(`Error al convertir domainIds a ObjectId en generateComparisonReport: ${error.message}`);
      return {};
    }

    const analytics = await this.find({
      domainId: { $in: objectIds },
      'period.start': period.start,
      'period.end': period.end
    });

    return analytics.reduce((report, domainAnalytics) => {
      report[domainAnalytics.domainId] = {
        visits: domainAnalytics.visits,
        conversionMetrics: domainAnalytics.calculateConversionMetrics(),
        performance: domainAnalytics.getPerformanceSummary()
      };
      return report;
    }, {});
  }
};

module.exports = mongoose.model('Analytics', analyticsSchema);