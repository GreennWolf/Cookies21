const Joi = require('joi');
const { objectId } = require('./custom.validation');

const analyticsValidation = {
  // Validación existente
  getDashboardStats: {
    query: Joi.object({
      period: Joi.string().valid('1h', '24h', '7d', '30d').default('24h')
    })
  },
  
  getDomainAnalytics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      granularity: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily')
    })
  },
  
  getTrends: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      metric: Joi.string().valid('visits', 'acceptanceRate', 'customizationRate').required(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      granularity: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily')
    })
  },
  
  getCookieAnalytics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
  },
  
  getDemographics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
  },
  
  generateReport: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      format: Joi.string().valid('pdf', 'csv', 'json').default('pdf')
    })
  },
  
  // NUEVAS VALIDACIONES
  
  getConsentStats: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      granularity: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily')
    })
  },
  
  getUserJourneyAnalytics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
  },
  
  getSessionContextAnalytics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
  },
  
  getUXMetrics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
  },
  
  getABTestResults: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      variantId: Joi.string().optional()
    })
  },
  
  updatePerformanceMetrics: {
    params: Joi.object({
      domainId: Joi.string().custom(objectId).required()
    }),
    body: Joi.object({
      loadTime: Joi.number().positive().optional(),
      renderTime: Joi.number().positive().optional(),
      scriptSize: Joi.object({
        original: Joi.number().positive().required(),
        compressed: Joi.number().positive().required()
      }).optional(),
      error: Joi.object({
        type: Joi.string().required(),
        message: Joi.string().optional()
      }).optional()
    }).min(1) // Debe contener al menos una métrica
  }
};

module.exports = { analyticsValidation };