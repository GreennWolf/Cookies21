const mongoose = require('mongoose');

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
    devices: [{
      type: String,
      visits: Number,
      acceptanceRate: Number,
      customizationRate: Number
    }],
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
    if (total === 0) return {};

    return {
      acceptanceRate: (types.acceptAll.count / total) * 100,
      rejectionRate: (types.rejectAll.count / total) * 100,
      customizationRate: (types.customize.count / total) * 100,
      bounceRate: (types.noInteraction.count / total) * 100
    };
  },

  // Obtener resumen de rendimiento
  getPerformanceSummary() {
    return {
      avgLoadTime: this.performance.loadTime.avg,
      errorRate: this.performance.errors.reduce((sum, err) => sum + err.count, 0) / this.visits.total,
      sizeSavings: (1 - (this.performance.scriptSize.compressed / this.performance.scriptSize.original)) * 100
    };
  },

  // Obtener top datos demográficos
  getTopDemographics(limit = 5) {
    return {
      countries: [...this.demographics.countries]
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit),
      devices: [...this.demographics.devices]
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit),
      browsers: [...this.demographics.browsers]
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit)
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

  // Obtener tendencias
  async getTrends(domainId, startDate, endDate, granularity = 'daily') {
    return this.aggregate([
      {
        $match: {
          domainId: mongoose.Types.ObjectId(domainId),
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
                $divide: [
                  '$interactions.types.acceptAll.count',
                  '$interactions.total'
                ]
              },
              100
            ]
          },
          customizationRate: {
            $multiply: [
              {
                $divide: [
                  '$interactions.types.customize.count',
                  '$interactions.total'
                ]
              },
              100
            ]
          }
        }
      }
    ]);
  },

  // Generar reporte comparativo
  async generateComparisonReport(domainIds, period) {
    const analytics = await this.find({
      domainId: { $in: domainIds },
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