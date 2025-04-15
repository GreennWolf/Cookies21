class AppError extends Error {
    constructor(message, statusCode = 500, errors = [], metadata = {}) {
      super(message);
  
      // Propiedades básicas
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      this.errors = errors;
      this.metadata = metadata;
  
      // Añadir código basado en el status
      this.code = this._generateErrorCode(statusCode);
  
      // Capturar stack trace
      Error.captureStackTrace(this, this.constructor);
  
      // Añadir timestamp
      this.timestamp = new Date();
    }
  
    // Métodos estáticos para crear errores comunes
    static badRequest(message = 'Bad Request', errors = [], metadata = {}) {
      return new AppError(message, 400, errors, metadata);
    }
  
    static unauthorized(message = 'Unauthorized', errors = [], metadata = {}) {
      return new AppError(message, 401, errors, metadata);
    }
  
    static forbidden(message = 'Forbidden', errors = [], metadata = {}) {
      return new AppError(message, 403, errors, metadata);
    }
  
    static notFound(message = 'Not Found', errors = [], metadata = {}) {
      return new AppError(message, 404, errors, metadata);
    }
  
    static validation(message = 'Validation Error', errors = [], metadata = {}) {
      return new AppError(message, 422, errors, metadata);
    }
  
    static conflict(message = 'Conflict', errors = [], metadata = {}) {
      return new AppError(message, 409, errors, metadata);
    }
  
    static tooManyRequests(message = 'Too Many Requests', errors = [], metadata = {}) {
      return new AppError(message, 429, errors, metadata);
    }
  
    static internal(message = 'Internal Server Error', errors = [], metadata = {}) {
      return new AppError(message, 500, errors, metadata);
    }
  
    // Método para convertir a objeto plano
    toJSON() {
      return {
        status: this.status,
        code: this.code,
        message: this.message,
        errors: this.errors,
        metadata: this.metadata,
        timestamp: this.timestamp,
        ...((['development', 'test'].includes(process.env.NODE_ENV)) && { stack: this.stack })
      };
    }
  
    // Método para obtener respuesta HTTP formateada
    getResponse() {
      return {
        status: this.status,
        error: {
          code: this.code,
          message: this.message,
          ...(this.errors.length > 0 && { details: this.errors }),
          timestamp: this.timestamp
        }
      };
    }
  
    // Método privado para generar códigos de error
    _generateErrorCode(statusCode) {
      const errorCodes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'VALIDATION_ERROR',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_SERVER_ERROR'
      };
  
      return errorCodes[statusCode] || 'UNKNOWN_ERROR';
    }
  
    // Método para añadir contexto adicional al error
    addContext(context) {
      this.metadata = {
        ...this.metadata,
        ...context
      };
      return this;
    }
  
    // Método para añadir errores adicionales
    addErrors(errors) {
      this.errors = [...this.errors, ...errors];
      return this;
    }
  
    // Método para comprobar si es un tipo específico de error
    is(errorCode) {
      return this.code === errorCode;
    }
  
    // Método para verificar si el error es retryable
    isRetryable() {
      const retryableCodes = [408, 429, 502, 503, 504];
      return retryableCodes.includes(this.statusCode);
    }
  
    // Método para clonar el error con nuevas propiedades
    clone(overrides = {}) {
      const clone = new AppError(
        overrides.message || this.message,
        overrides.statusCode || this.statusCode,
        overrides.errors || [...this.errors],
        overrides.metadata || { ...this.metadata }
      );
      return clone;
    }
  
    // Método para crear error desde objeto de error
    static fromError(error) {
      if (error instanceof AppError) {
        return error;
      }
  
      // Determinar statusCode basado en el tipo de error
      let statusCode = 500;
      let message = error.message;
      let metadata = {};
  
      if (error.name === 'ValidationError') {
        statusCode = 422;
        metadata.validationErrors = error.errors;
      } else if (error.name === 'MongoError' && error.code === 11000) {
        statusCode = 409;
        message = 'Duplicate key error';
        metadata.duplicateKey = error.keyValue;
      }
  
      return new AppError(message, statusCode, [], metadata);
    }
  }
  
  // Exportar también códigos de error comunes
  AppError.CODES = {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONFLICT: 'CONFLICT',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
  };
  
  module.exports = AppError;