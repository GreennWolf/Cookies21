// validations/user.validation.js
const Joi = require('joi');

const userValidation = {
  // Validación para crear un usuario
  createUser: {
    body: Joi.object({
      name: Joi.string().required().trim().messages({
        'string.empty': 'El nombre del usuario es requerido',
        'any.required': 'El nombre del usuario es requerido'
      }),
      email: Joi.string().email().required().trim().messages({
        'string.email': 'El email debe tener un formato válido',
        'string.empty': 'El email es requerido',
        'any.required': 'El email es requerido'
      }),
      role: Joi.string().valid('owner', 'admin', 'editor', 'viewer').default('viewer').messages({
        'any.only': 'El rol debe ser owner, admin, editor o viewer'
      }),
      clientId: Joi.string().messages({
        'string.empty': 'El ID del cliente no puede estar vacío'
      }),
      sendInvitation: Joi.boolean().default(true),
      password: Joi.string().min(8).allow('').messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres'
      })
    })
  },

  // Validación para actualizar un usuario
  updateUser: {
    params: Joi.object({
      userId: Joi.string().required().messages({
        'any.required': 'El ID del usuario es requerido'
      })
    }),
    body: Joi.object({
      name: Joi.string().trim(),
      role: Joi.string().valid('owner', 'admin', 'editor', 'viewer').messages({
        'any.only': 'El rol debe ser owner, admin, editor o viewer'
      })
    }).min(1).messages({
      'object.min': 'Debe proporcionar al menos un campo para actualizar'
    })
  },

  // Validación para cambiar estado de un usuario
  toggleStatus: {
    params: Joi.object({
      userId: Joi.string().required().messages({
        'any.required': 'El ID del usuario es requerido'
      })
    }),
    body: Joi.object({
      status: Joi.string().valid('active', 'inactive', 'suspended').required().messages({
        'any.only': 'El estado debe ser active, inactive o suspended',
        'any.required': 'El estado es requerido'
      })
    })
  },

  // Validación para actualizar permisos
  updatePermissions: {
    params: Joi.object({
      userId: Joi.string().required().messages({
        'any.required': 'El ID del usuario es requerido'
      })
    }),
    body: Joi.object({
      permissions: Joi.array().items(
        Joi.object({
          resource: Joi.string().required(),
          actions: Joi.array().items(Joi.string()).required()
        })
      ).required().messages({
        'any.required': 'Los permisos son requeridos'
      })
    })
  },

  // Validación para actualizar preferencias
  updatePreferences: {
    body: Joi.object({
      preferences: Joi.object({
        language: Joi.string().valid('es', 'en', 'fr', 'de', 'it', 'pt', 'nl'),
        theme: Joi.string().valid('light', 'dark', 'system'),
        notifications: Joi.object({
          email: Joi.boolean(),
          push: Joi.boolean()
        })
      }).required().messages({
        'any.required': 'Las preferencias son requeridas'
      })
    })
  },

  // Validación para verificar MFA
  verifyMFA: {
    body: Joi.object({
      token: Joi.string().required().messages({
        'string.empty': 'El token MFA es requerido',
        'any.required': 'El token MFA es requerido'
      })
    })
  },

  // Validación para completar registro de usuario invitado
  completeRegistration: {
    body: Joi.object({
      token: Joi.string().required().messages({
        'string.empty': 'El token de invitación es requerido',
        'any.required': 'El token de invitación es requerido'
      }),
      password: Joi.string().min(8).required().messages({
        'string.empty': 'La contraseña es requerida',
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'any.required': 'La contraseña es requerida'
      }),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Las contraseñas no coinciden',
        'any.required': 'La confirmación de contraseña es requerida'
      })
    })
  },

  // Validación para cambio de contraseña
  changePassword: {
    body: Joi.object({
      userId: Joi.string().required().messages({
        'string.empty': 'El ID de usuario es requerido',
        'any.required': 'El ID de usuario es requerido'
      }),
      currentPassword: Joi.string().when('$isSelfUpdate', {
        is: true,
        then: Joi.string().required().messages({
          'string.empty': 'La contraseña actual es requerida',
          'any.required': 'La contraseña actual es requerida'
        }),
        otherwise: Joi.string().allow('', null)
      }),
      newPassword: Joi.string().min(8).required().messages({
        'string.empty': 'La nueva contraseña es requerida',
        'string.min': 'La nueva contraseña debe tener al menos {#limit} caracteres',
        'any.required': 'La nueva contraseña es requerida'
      })
    })
  },

  // Validación para reenviar invitación
  resendInvitation: {
    params: Joi.object({
      userId: Joi.string().required().messages({
        'any.required': 'El ID del usuario es requerido'
      })
    }),
    body: Joi.object({
      sendDirectly: Joi.boolean().default(false)
    })
  }
};

module.exports = { userValidation };