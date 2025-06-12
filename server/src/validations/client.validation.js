// validations/client.validation.js
const Joi = require('joi');

const clientValidation = {
  // Validación para crear un cliente
  createClient: {
    body: Joi.object({
      name: Joi.string().required().trim().messages({
        'string.empty': 'El nombre del cliente es requerido',
        'any.required': 'El nombre del cliente es requerido'
      }),
      contactEmail: Joi.string().email().required().trim().messages({
        'string.email': 'El email debe tener un formato válido',
        'string.empty': 'El email de contacto es requerido',
        'any.required': 'El email de contacto es requerido'
      }),
      subscription: Joi.object({
        plan: Joi.string().valid('basic', 'standard', 'premium', 'enterprise', 'custom').default('basic').messages({
          'any.only': 'El plan debe ser basic, standard, premium, enterprise o custom'
        }),
        planId: Joi.string(), // ID del plan de suscripción
        maxUsers: Joi.number().integer().min(1).default(5).messages({
          'number.min': 'Debe permitir al menos 1 usuario'
        }),
        startDate: Joi.date().default(Date.now),
        endDate: Joi.date().greater(Joi.ref('startDate')).messages({
          'date.greater': 'La fecha de finalización debe ser posterior a la fecha de inicio'
        }),
        isUnlimited: Joi.boolean().default(false)
      }).default(),
      domains: Joi.array().items(Joi.string().trim()).default([]),
      adminUser: Joi.object({
        name: Joi.string().required().trim().messages({
          'string.empty': 'El nombre del administrador es requerido',
          'any.required': 'El nombre del administrador es requerido'
        }),
        email: Joi.string().email().required().trim().messages({
          'string.email': 'El email debe tener un formato válido',
          'string.empty': 'El email del administrador es requerido',
          'any.required': 'El email del administrador es requerido'
        }),
        password: Joi.string().min(8).allow('').messages({
          'string.min': 'La contraseña debe tener al menos 8 caracteres'
        }),
        sendInvitation: Joi.boolean().default(true)
      }).required().messages({
        'any.required': 'La información del administrador es requerida'
      })
    })
  },

  // Validación para actualizar un cliente
  updateClient: {
    params: Joi.object({
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      name: Joi.string().trim(),
      contactEmail: Joi.string().email().trim().messages({
        'string.email': 'El email debe tener un formato válido'
      }),
      subscription: Joi.object({
        plan: Joi.string().valid('basic', 'standard', 'premium', 'enterprise', 'custom').messages({
          'any.only': 'El plan debe ser basic, standard, premium, enterprise o custom'
        }),
        maxUsers: Joi.number().integer().min(1).messages({
          'number.min': 'Debe permitir al menos 1 usuario'
        }),
        startDate: Joi.date(),
        endDate: Joi.date().greater(Joi.ref('startDate')).messages({
          'date.greater': 'La fecha de finalización debe ser posterior a la fecha de inicio'
        }),
        isUnlimited: Joi.boolean()
      }),
      domains: Joi.array().items(Joi.string().trim())
    }).min(1).messages({
      'object.min': 'Debe proporcionar al menos un campo para actualizar'
    })
  },

  // Validación para actualizar específicamente la suscripción
  updateSubscription: {
    params: Joi.object({
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      planId: Joi.string().messages({
        'string.empty': 'El ID del plan no puede estar vacío'
      }),
      startDate: Joi.date(),
      endDate: Joi.date().allow(null).messages({
        'date.base': 'La fecha de finalización debe ser una fecha válida'
      }),
      isUnlimited: Joi.boolean(),
      maxUsers: Joi.number().integer().min(1).messages({
        'number.min': 'El máximo de usuarios debe ser al menos 1'
      }),
      features: Joi.object({
        autoTranslate: Joi.boolean(),
        cookieScanning: Joi.boolean(),
        customization: Joi.boolean(),
        advancedAnalytics: Joi.boolean(),
        multiLanguage: Joi.boolean(),
        apiAccess: Joi.boolean(),
        prioritySupport: Joi.boolean()
      })
    }).min(1).messages({
      'object.min': 'Debe proporcionar al menos un campo para actualizar'
    })
  },

  // Validación para cambiar estado de un cliente
  toggleStatus: {
    params: Joi.object({
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      status: Joi.string().valid('active', 'inactive', 'suspended').required().messages({
        'any.only': 'El estado debe ser active, inactive o suspended',
        'any.required': 'El estado es requerido'
      })
    })
  },

  // Validación para cancelar suscripción
  cancelSubscription: {
    params: Joi.object({
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      reason: Joi.string().max(500).optional().messages({
        'string.max': 'La razón no puede exceder 500 caracteres'
      }),
      cancelImmediately: Joi.boolean().optional().default(false).messages({
        'boolean.base': 'cancelImmediately debe ser true o false'
      })
    })
  },

  // Validación para reactivar suscripción
  reactivateSubscription: {
    params: Joi.object({
      clientId: Joi.string().required().messages({
        'any.required': 'El ID del cliente es requerido'
      })
    }),
    body: Joi.object({
      extendDays: Joi.number().integer().min(1).max(365).optional().default(30).messages({
        'number.base': 'extendDays debe ser un número',
        'number.integer': 'extendDays debe ser un número entero',
        'number.min': 'extendDays debe ser al menos 1 día',
        'number.max': 'extendDays no puede exceder 365 días'
      })
    })
  },
  
};

module.exports = { clientValidation };