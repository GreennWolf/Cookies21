// middleware/validateRequest.js
const AppError = require('../utils/appError');
const Joi = require('joi');  // Asegúrate de que Joi está importado correctamente

/**
 * Middleware para validar requests con Joi
 * 
 * @param {Object|Function} validations - Schema de Joi o función que devuelve schema basado en req
 */
exports.validateRequest = (validations) => {
  return (req, res, next) => {
    try {
      // Si validations es una función, ejecutarla para obtener el schema específico
      const schema = typeof validations === 'function' ? validations(req) : validations;
      
      // Verificar si schema es nulo o indefinido
      if (!schema) {
        return next();
      }
      
      // Handle diferentes formatos de validación
      if (schema.body || schema.query || schema.params) {
        // Formato 1: { body: schema, query: schema, params: schema }
        if (schema.body) validatePart(req.body, schema.body, 'body');
        if (schema.query) validatePart(req.query, schema.query, 'query');
        if (schema.params) validatePart(req.params, schema.params, 'params');
      } else if (Array.isArray(schema)) {
        // Formato 2: Array de objetos de validación
        for (const validation of schema) {
          const part = validation.part || 'body';
          validatePart(req[part], validation.schema, part);
        }
      } else {
        // Formato 3: Schema directo (aplicado a req.body)
        validatePart(req.body, schema, 'body');
      }
      
      next();
    } catch (error) {
      console.error('Validation error:', error.message);
      return next(new AppError(`Validation error: ${error.message}`, 400));
    }
  };
};

function validatePart(data, schema, part) {
  if (!schema) return;
  
  // Verificar que schema sea realmente un esquema Joi
  if (!schema.validate || typeof schema.validate !== 'function') {
    console.error(`Invalid Joi schema for ${part}`);
    throw new Error(`Invalid schema for ${part}`);
  }
  
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const message = error.details.map(detail => detail.message).join(', ');
    throw new AppError(`Invalid ${part}: ${message}`, 400);
  }
}