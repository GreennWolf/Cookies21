// validations/subscription.validation.js
const Joi = require('joi');

const subscriptionValidation = {
  // Validación para crear un plan
  createPlan: {
    body: Joi.object({
      name: Joi.string().required().trim().min(3).max(50).messages({
        'string.empty': 'El nombre del plan es requerido',
        'any.required': 'El nombre del plan es requerido',
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres'
      }),
      description: Joi.string().trim().max(500).allow('').messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
      limits: Joi.object({
        maxUsers: Joi.number().integer().min(1).default(5).messages({
          'number.min': 'El máximo de usuarios debe ser al menos 1'
        }),
        isUnlimitedUsers: Joi.boolean().default(false),
        maxDomains: Joi.number().integer().min(1).default(1).messages({
          'number.min': 'El máximo de dominios debe ser al menos 1'
        }),
        isUnlimitedDomains: Joi.boolean().default(false)
      }).default(),
      features: Joi.object({
        autoTranslate: Joi.boolean().default(false),
        cookieScanning: Joi.boolean().default(true),
        customization: Joi.boolean().default(false),
        advancedAnalytics: Joi.boolean().default(false),
        multiLanguage: Joi.boolean().default(false),
        apiAccess: Joi.boolean().default(false),
        prioritySupport: Joi.boolean().default(false)
      }).default(),
      pricing: Joi.object({
        enabled: Joi.boolean().default(true),
        currency: Joi.string().valid('USD', 'EUR', 'MXN').default('USD').messages({
          'any.only': 'La moneda debe ser USD, EUR o MXN'
        }),
        amount: Joi.number().min(0).default(0).messages({
          'number.min': 'El precio debe ser un número positivo'
        }),
        interval: Joi.string().valid('monthly', 'quarterly', 'annually', 'custom').default('monthly').messages({
          'any.only': 'El intervalo debe ser monthly, quarterly, annually o custom'
        }),
        customDays: Joi.number().integer().min(1).allow(null).default(null).messages({
          'number.min': 'Los días personalizados deben ser al menos 1'
        })
      }).default(),
      metadata: Joi.object({
        color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3498db').messages({
          'string.pattern.base': 'El color debe ser un valor hexadecimal válido (ej. #3498db)'
        }),
        icon: Joi.string().allow('').default(''),
        displayOrder: Joi.number().integer().min(1).default(99).messages({
          'number.min': 'El orden de visualización debe ser un número entero positivo'
        }),
        isRecommended: Joi.boolean().default(false),
        tags: Joi.array().items(Joi.string()).default([])
      }).default()
    })
  },

  // Validación para actualizar un plan
  updatePlan: {
    params: Joi.object({
      id: Joi.string().required().messages({
        'any.required': 'El ID del plan es requerido'
      })
    }),
    body: Joi.object({
      name: Joi.string().trim().min(3).max(50).messages({
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres'
      }),
      description: Joi.string().trim().max(500).allow('').messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
      status: Joi.string().valid('active', 'inactive', 'archived').messages({
        'any.only': 'El estado debe ser active, inactive o archived'
      }),
      limits: Joi.object({
        maxUsers: Joi.number().integer().min(1).messages({
          'number.min': 'El máximo de usuarios debe ser al menos 1'
        }),
        isUnlimitedUsers: Joi.boolean(),
        maxDomains: Joi.number().integer().min(1).messages({
          'number.min': 'El máximo de dominios debe ser al menos 1'
        }),
        isUnlimitedDomains: Joi.boolean()
      }),
      features: Joi.object({
        autoTranslate: Joi.boolean(),
        cookieScanning: Joi.boolean(),
        customization: Joi.boolean(),
        advancedAnalytics: Joi.boolean(),
        multiLanguage: Joi.boolean(),
        apiAccess: Joi.boolean(),
        prioritySupport: Joi.boolean()
      }),
      pricing: Joi.object({
        enabled: Joi.boolean(),
        currency: Joi.string().valid('USD', 'EUR', 'MXN').messages({
          'any.only': 'La moneda debe ser USD, EUR o MXN'
        }),
        amount: Joi.number().min(0).messages({
          'number.min': 'El precio debe ser un número positivo'
        }),
        interval: Joi.string().valid('monthly', 'quarterly', 'annually', 'custom').messages({
          'any.only': 'El intervalo debe ser monthly, quarterly, annually o custom'
        }),
        customDays: Joi.number().integer().min(1).allow(null).messages({
          'number.min': 'Los días personalizados deben ser al menos 1'
        })
      }),
      metadata: Joi.object({
        color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).messages({
          'string.pattern.base': 'El color debe ser un valor hexadecimal válido (ej. #3498db)'
        }),
        icon: Joi.string().allow(''),
        displayOrder: Joi.number().integer().min(1).messages({
          'number.min': 'El orden de visualización debe ser un número entero positivo'
        }),
        isRecommended: Joi.boolean(),
        tags: Joi.array().items(Joi.string())
      })
    }).min(1).messages({
      'object.min': 'Debe proporcionar al menos un campo para actualizar'
    })
  },

  // Validación para clonar un plan
  clonePlan: {
    params: Joi.object({
      id: Joi.string().required().messages({
        'any.required': 'El ID del plan es requerido'
      })
    }),
    body: Joi.object({
      newName: Joi.string().required().trim().min(3).max(50).messages({
        'string.empty': 'El nombre para el nuevo plan es requerido',
        'any.required': 'El nombre para el nuevo plan es requerido',
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres'
      })
    })
  },

  // Validación para cambiar estado
  toggleStatus: {
    params: Joi.object({
      id: Joi.string().required().messages({
        'any.required': 'El ID del plan es requerido'
      })
    }),
    body: Joi.object({
      status: Joi.string().valid('active', 'inactive', 'archived').required().messages({
        'any.only': 'El estado debe ser active, inactive o archived',
        'any.required': 'El estado es requerido'
      })
    })
  },

  // Validación para asignar plan a cliente
  assignPlanToClient: {
    params: Joi.object({
      planId: Joi.string().required().messages({
        'any.required': 'El ID del plan es requerido'
      }),
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      startDate: Joi.date().default(Date.now),
      endDate: Joi.date().greater(Joi.ref('startDate')).messages({
        'date.greater': 'La fecha de finalización debe ser posterior a la fecha de inicio'
      }),
      isUnlimited: Joi.boolean().default(false),
      customMaxUsers: Joi.number().integer().min(1).messages({
        'number.min': 'El máximo de usuarios debe ser al menos 1'
      })
    })
  }
};

module.exports = { subscriptionValidation };