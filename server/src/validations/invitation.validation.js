// validations/invitation.validation.js
const Joi = require('joi');

const invitationValidation = {
  // Validación para completar el registro
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

  // Validación para reenviar invitación
  resendInvitation: {
    params: Joi.object({
      userId: Joi.string().required().messages({
        'string.empty': 'El ID del usuario es requerido',
        'any.required': 'El ID del usuario es requerido'
      })
    })
  }
};

module.exports = { invitationValidation };