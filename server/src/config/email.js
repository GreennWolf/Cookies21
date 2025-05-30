// config/email.js
const logger = require('../utils/logger');

/**
 * Configuración para el servicio de email
 */
const emailConfig = {
  // Configuración del servidor SMTP
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || ''
    }
  },
  
  // Información del remitente
  sender: {
    name: process.env.EMAIL_SENDER_NAME || 'Cookie Consent Platform',
    email: process.env.EMAIL_SENDER_EMAIL || process.env.EMAIL_USER
  },
  
  // URLs para enlaces en los emails
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    backendApi: process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1'
  },
  
  // Opciones de las plantillas de email
  templates: {
    invitation: {
      subject: 'Invitación para unirte a {{clientName}}',
      expiresInDays: 7
    },
    welcome: {
      subject: 'Bienvenido a {{clientName}}'
    },
    passwordReset: {
      subject: 'Restablecimiento de contraseña',
      expiresInHours: 1
    }
  },
  
  // Opciones para la cola de emails
  queue: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
};

// Función para validar la configuración
const validateEmailConfig = () => {
  const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.warn(`Configuración de email incompleta. Falta: ${missingVars.join(', ')}`);
    logger.warn('El servicio de emails podría no funcionar correctamente.');
    return false;
  }
  
  return true;
};

// Exportar configuración y utilidades
module.exports = {
  emailConfig,
  validateEmailConfig
};