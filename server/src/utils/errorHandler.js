// Manejador de errores para el middleware
// Añadir al archivo errorHandler.js o equivalente

/**
 * Manejador global de errores con mejoras para capturar errores no manejados
 * @param {Error} err - El error que se produjo
 * @param {Request} req - El objeto de solicitud Express
 * @param {Response} res - El objeto de respuesta Express
 * @param {Function} next - La función middleware next
 */
const errorHandler = (err, req, res, next) => {
    console.error('🔴 Error capturado:', err);
    
    // Asignar valores predeterminados
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Procesar errores específicos
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    
    // Manejar errores de ID no válida de MongoDB
    if (error.name === 'CastError') {
      console.log('❗ Error de conversión de tipo:', error);
      const message = `Valor inválido para el campo ${error.path}: ${error.value}`;
      error = new AppError(message, 400);
    }
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      console.log('❗ Error de validación:', error);
      const messages = Object.values(error.errors).map(val => val.message);
      const message = `Datos inválidos: ${messages.join('. ')}`;
      error = new AppError(message, 400);
    }
    
    // Manejar errores de duplicado en MongoDB
    if (error.code === 11000) {
      console.log('❗ Error de clave duplicada:', error);
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      const message = `El valor '${value}' para el campo '${field}' ya existe. Por favor use otro valor`;
      error = new AppError(message, 409);
    }
    
    // Manejar errores de JWT
    if (error.name === 'JsonWebTokenError') {
      console.log('❗ Error de JWT:', error);
      error = new AppError('Token inválido. Por favor inicie sesión nuevamente', 401);
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❗ Error de token expirado:', error);
      error = new AppError('Su sesión ha expirado. Por favor inicie sesión nuevamente', 401);
    }
    
    // Manejar errores de referencia
    if (error.name === 'ReferenceError') {
      console.log('❗ Error de referencia:', error);
      const message = `Error interno del servidor: ${error.message}`;
      error = new AppError(message, 500);
      
      // Registrar información adicional para depuración
      console.error('📌 Ubicación del error:', error.stack);
      console.error('📌 Ruta:', req.originalUrl);
      console.error('📌 Método:', req.method);
      console.error('📌 Cuerpo:', JSON.stringify(req.body, null, 2));
    }
    
    // Respuestas según el entorno
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo, enviar detalles completos
      return res.status(error.statusCode).json({
        status: error.status,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details || null
        }
      });
    } else {
      // En producción, mensajes simplificados
      if (error.isOperational) {
        // Errores operacionales controlados
        return res.status(error.statusCode).json({
          status: error.status,
          error: {
            message: error.message
          }
        });
      } else {
        // Errores de programación o desconocidos
        console.error('🔴 ERROR NO CONTROLADO:', error);
        
        return res.status(500).json({
          status: 'error',
          error: {
            message: 'Algo salió mal'
          }
        });
      }
    }
  };