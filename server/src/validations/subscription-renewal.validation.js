const Joi = require('joi');

const subscriptionRenewalValidation = {
  createRenewalRequest: {
    body: Joi.object({
      requestType: Joi.string()
        .valid('renewal', 'reactivation', 'upgrade', 'support')
        .required()
        .messages({
          'any.required': 'El tipo de solicitud es requerido',
          'any.only': 'El tipo de solicitud debe ser: renewal, reactivation, upgrade o support'
        }),
      
      message: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
          'any.required': 'El mensaje es requerido',
          'string.min': 'El mensaje debe tener al menos 10 caracteres',
          'string.max': 'El mensaje no puede tener más de 1000 caracteres'
        }),
      
      contactPreference: Joi.string()
        .valid('email', 'phone')
        .default('email')
        .messages({
          'any.only': 'La preferencia de contacto debe ser email o phone'
        }),
      
      urgency: Joi.string()
        .valid('low', 'medium', 'high')
        .default('medium')
        .messages({
          'any.only': 'La urgencia debe ser low, medium o high'
        })
    })
  },

  getRenewalRequests: {
    query: Joi.object({
      status: Joi.string()
        .valid('all', 'pending', 'in_progress', 'completed', 'rejected')
        .default('all'),
      
      urgency: Joi.string()
        .valid('low', 'medium', 'high')
        .optional(),
      
      requestType: Joi.string()
        .valid('renewal', 'reactivation', 'upgrade', 'support')
        .optional(),
      
      page: Joi.number()
        .integer()
        .min(1)
        .default(1),
      
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
    })
  },

  updateRenewalRequest: {
    params: Joi.object({
      requestId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'any.required': 'El ID de solicitud es requerido',
          'string.pattern.base': 'El ID de solicitud debe ser un ObjectId válido'
        })
    }),
    
    body: Joi.object({
      status: Joi.string()
        .valid('pending', 'in_progress', 'completed', 'rejected')
        .optional()
        .messages({
          'any.only': 'El estado debe ser: pending, in_progress, completed o rejected'
        }),
      
      adminNotes: Joi.string()
        .max(2000)
        .optional()
        .messages({
          'string.max': 'Las notas no pueden tener más de 2000 caracteres'
        }),
      
      assignedTo: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
          'string.pattern.base': 'El ID del usuario asignado debe ser un ObjectId válido'
        })
    })
  },

  checkPendingRequest: {
    // No necesita validación, usa el clientId del token
  }
};

module.exports = { subscriptionRenewalValidation };