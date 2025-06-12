// services/email.service.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Servicio para el envío de emails
 */
class EmailService {
  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
    this.transporter = null;
    
    // Mostrar variables de entorno (ocultando la contraseña)
    console.log('🔧 EmailService - Variables de entorno:');
    console.log(`  HOST: ${process.env.EMAIL_HOST}`);
    console.log(`  PORT: ${process.env.EMAIL_PORT}`);
    console.log(`  USER: ${process.env.EMAIL_USER}`);
    console.log(`  FROM: ${process.env.EMAIL_FROM}`);
    console.log(`  PASS: ${process.env.EMAIL_PASS ? '******' : 'No configurado'}`);
    console.log(`  MODE: ${this.isDev ? 'Desarrollo' : 'Producción'}`);
    
    logger.info('EmailService inicializado. Modo: ' + (this.isDev ? 'desarrollo' : 'producción'));
  }

  /**
   * Inicializa el transporter si no existe aún
   */
  async _initializeTransporter() {
    console.log('🔄 Inicializando transporter de email...');
    
    if (this.transporter) {
      console.log('✅ Transporter ya existe, saltando inicialización');
      return;
    }

    try {
      if (this.isDev && process.env.USE_ETHEREAL === 'true') {
        // Crear cuenta de prueba en Ethereal para desarrollo
        console.log('🧪 Creando cuenta de prueba en Ethereal...');
        logger.info('Creando cuenta de prueba en Ethereal...');
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false, // true para 465, false para otros puertos
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log(`✅ Cuenta Ethereal creada: ${testAccount.user}`);
        logger.info('Cuenta de prueba en Ethereal creada:');
        logger.info(`- Usuario: ${testAccount.user}`);
        logger.info(`- Contraseña: ${testAccount.pass}`);
        logger.info('Los emails enviados se podrán ver en https://ethereal.email');
      } else {
        // Configuración personalizada para Cookie21
        console.log('🔧 Configurando transporter SMTP para Cookie21...');
        console.log(`  Host: ${process.env.EMAIL_HOST}`);
        console.log(`  Puerto: ${process.env.EMAIL_PORT}`);
        console.log(`  Usuario: ${process.env.EMAIL_USER}`);
        console.log(`  Secure: ${process.env.EMAIL_PORT === '465' ? 'true' : 'false'}`);
        
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'cookie21.com',
          port: parseInt(process.env.EMAIL_PORT || '465'),
          secure: process.env.EMAIL_PORT === '465', // true para 465, false para otros puertos
          auth: {
            user: process.env.EMAIL_USER || 'noreply@cookie21.com',
            pass: process.env.EMAIL_PASS || '4s^yB0s54'
          },
          debug: true, // Activar debug de SMTP
          logger: true, // Activar logs internos de nodemailer
          tls: {
            rejectUnauthorized: false // Ayuda con algunos problemas de certificados
          }
        });
        
        console.log('✅ Transporter SMTP configurado');
        logger.info(`Configuración SMTP: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
      }

      // Verificar configuración
      console.log('🔄 Verificando conexión SMTP...');
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');
      logger.info('Conexión SMTP verificada exitosamente');
    } catch (error) {
      console.error('❌ Error al inicializar transporter:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al inicializar transporter: ${error.message}`, error);
      
      if (this.isDev) {
        // En desarrollo, si falla la conexión SMTP, usaremos una simulación de envío
        console.log('⚠️ Usando simulación de envío para desarrollo');
        logger.info('Usando simulación de envío para desarrollo');
        this.transporter = null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Envía un email de invitación a un usuario
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async sendInvitationEmail(options) {
    console.log('📧 Enviando email de invitación...');
    console.log('  Destinatario:', options.email);
    console.log('  Cliente:', options.clientName);
    console.log('  Envío directo:', options.sendDirect ? 'Sí' : 'No');
    
    try {
      const { email, name, invitationToken, clientName, role, sendDirect = false } = options;
      
      if (!email || !name || !invitationToken) {
        console.error('❌ Faltan campos requeridos para el email de invitación');
        logger.error('Faltan campos requeridos para el email de invitación');
        return {
          success: false,
          error: 'Faltan campos requeridos'
        };
      }
      
      // Construir la URL de invitación
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteUrl = `${frontendUrl}/invitacion/${invitationToken}`;
      console.log('  URL de invitación:', inviteUrl);
      
      // Contenido del email
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitación a ${clientName}</title>
          <style>
            body, html { 
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              color: #1a202c;
              line-height: 1.6;
              background-color: #f7fafc;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background-color: #235C88;
              padding: 30px;
              text-align: center;
            }
            .header img {
              max-height: 50px;
              width: auto;
            }
            .content {
              padding: 40px 30px;
            }
            h1 {
              color: #235C88;
              margin: 0 0 20px 0;
              font-size: 28px;
              font-weight: 600;
            }
            p {
              margin: 0 0 16px 0;
              color: #4a5568;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background-color: #235C88;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 24px 0;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #1a4668;
            }
            .info-box {
              background-color: #EBF8FF;
              border-left: 4px solid #235C88;
              padding: 16px;
              margin: 24px 0;
              border-radius: 0 4px 4px 0;
            }
            .footer {
              background-color: #f7fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              margin: 0;
              font-size: 14px;
              color: #718096;
            }
            .footer a {
              color: #235C88;
              text-decoration: none;
            }
            @media (max-width: 600px) {
              .content {
                padding: 30px 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.BACKEND_URL || 'https://api.cookie21.com'}/emails/logoB.png" alt="Cookie21 Logo">
            </div>
            
            <div class="content">
              <h1>Te han invitado a ${clientName}</h1>
              <p>Hola ${name},</p>
              <p>Has sido invitado a unirte a <strong>${clientName}</strong> con el rol de <strong>${role || 'usuario'}</strong>.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>📧 Tu email:</strong> ${email}</p>
                <p style="margin: 8px 0 0 0;"><strong>🏢 Cliente:</strong> ${clientName}</p>
                <p style="margin: 8px 0 0 0;"><strong>👤 Rol asignado:</strong> ${role || 'usuario'}</p>
              </div>
              
              <p>Para completar tu registro y establecer tu contraseña, haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Completar registro</a>
              </div>
              
              <p style="font-size: 14px; color: #718096;">O copia y pega esta URL en tu navegador:</p>
              <p style="font-size: 14px; word-break: break-all; color: #718096;">${inviteUrl}</p>
              
              <p style="margin-top: 24px; font-size: 14px; color: #718096;">⏰ Este enlace expirará en <strong>7 días</strong>.</p>
              
              <p style="margin-top: 32px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
              <p>Saludos cordiales,<br><strong>El equipo de ${clientName}</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Cookie21. Todos los derechos reservados.</p>
              <p style="margin-top: 8px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy">Política de Privacidad</a> | 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms">Términos de Uso</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Si el transporter es null en desarrollo, simular el envío
      if (this.isDev && !this.transporter && !sendDirect) {
        console.log('🧪 SIMULACIÓN DE EMAIL DE INVITACIÓN');
        console.log(`  Para: ${email}`);
        console.log(`  Asunto: Invitación a ${clientName}`);
        console.log(`  Token: ${invitationToken.substring(0, 8)}...`);
        
        logger.info('=== SIMULACIÓN DE EMAIL ===');
        logger.info(`Para: ${email}`);
        logger.info(`Asunto: Invitación a ${clientName}`);
        logger.info(`Token: ${invitationToken.substring(0, 8)}...`);
        logger.info(`URL: ${inviteUrl}`);
        logger.info('=== FIN DE SIMULACIÓN ===');
        
        return {
          success: true,
          jobId: `simulated-${Date.now()}`,
          previewUrl: null,
          simulado: true
        };
      }
      
      // Inicializar transporter si no existe
      if (!this.transporter || sendDirect) {
        console.log('🔄 Inicializando transporter para envío...');
        await this._initializeTransporter();
      }
      
      // Verificar que tenemos un transporter
      if (!this.transporter) {
        console.error('❌ No se pudo inicializar el transporter');
        return {
          success: false,
          error: 'No se pudo inicializar el transporter de email'
        };
      }
      
      // Preparar opciones del email
      const fromEmail = process.env.EMAIL_FROM || `"${clientName}" <noreply@cookie21.com>`;
      console.log('  Remitente:', fromEmail);
      
      const mailOptions = {
        from: fromEmail,
        to: email,
        subject: `Invitación a ${clientName}`,
        html: htmlContent,
        text: `
          Invitación a ${clientName}
          
          Hola ${name},
          
          Has sido invitado a unirte a ${clientName} con el rol de ${role || 'usuario'}.
          
          Para completar tu registro, visita el siguiente enlace:
          ${inviteUrl}
          
          Este enlace expirará en 7 días.
          
          Si no has solicitado esta invitación, puedes ignorar este mensaje.
          
          Saludos,
          El equipo de ${clientName}
        `
      };
      
      // Enviar email
      console.log('🔄 Enviando email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      logger.info(`Email de invitación enviado a ${email}`);
      
      // Si estamos en desarrollo con Ethereal, mostrar URL de previsualización
      const previewUrl = this.isDev && process.env.USE_ETHEREAL === 'true' ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('  Previsualización:', previewUrl);
        logger.info(`Previsualización: ${previewUrl}`);
      }
      
      return {
        success: true,
        jobId: info.messageId,
        previewUrl
      };
    } catch (error) {
      console.error('❌ Error al enviar email de invitación:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al enviar email de invitación: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }

  /**
   * Envía un email de bienvenida a un usuario que completó su registro
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async sendWelcomeEmail(options) {
    console.log('📧 Enviando email de bienvenida...');
    console.log('  Destinatario:', options.email);
    
    try {
      const { email, name, clientName } = options;
      
      if (!email || !name) {
        console.error('❌ Faltan campos requeridos para el email de bienvenida');
        logger.error('Faltan campos requeridos para el email de bienvenida');
        return {
          success: false,
          error: 'Faltan campos requeridos'
        };
      }
      
      // Construir la URL de login
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${frontendUrl}/login`;
      console.log('  URL de login:', loginUrl);
      
      // Contenido del email
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>¡Bienvenido a ${clientName}!</title>
          <style>
            body, html { 
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              color: #1a202c;
              line-height: 1.6;
              background-color: #f7fafc;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #235C88 0%, #1a4668 100%);
              padding: 40px 30px;
              text-align: center;
            }
            .header img {
              max-height: 80px;
              width: auto;
              display: block;
              margin: 0 auto 20px auto;
            }
            .welcome-badge {
              display: inline-block;
              background-color: rgba(255, 255, 255, 0.2);
              color: white;
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin: 0 auto;
              clear: both;
            }
            .content {
              padding: 40px 30px;
            }
            h1 {
              color: #235C88;
              margin: 0 0 20px 0;
              font-size: 32px;
              font-weight: 600;
              text-align: center;
            }
            p {
              margin: 0 0 16px 0;
              color: #4a5568;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background-color: #235C88;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 24px 0;
              transition: all 0.2s;
              box-shadow: 0 4px 6px rgba(35, 92, 136, 0.2);
            }
            .button:hover {
              background-color: #1a4668;
              box-shadow: 0 6px 8px rgba(35, 92, 136, 0.3);
            }
            .feature-list {
              background-color: #f7fafc;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
            }
            .feature-item {
              display: flex;
              align-items: start;
              margin-bottom: 16px;
            }
            .feature-icon {
              color: #235C88;
              margin-right: 12px;
              font-size: 20px;
            }
            .footer {
              background-color: #f7fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              margin: 0;
              font-size: 14px;
              color: #718096;
            }
            .footer a {
              color: #235C88;
              text-decoration: none;
            }
            @media (max-width: 600px) {
              .content {
                padding: 30px 20px;
              }
              h1 {
                font-size: 28px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.BACKEND_URL || 'https://api.cookie21.com'}/emails/logoB.png" alt="Cookie21 Logo">
              <div class="welcome-badge">🎉 Cuenta Activada</div>
            </div>
            
            <div class="content">
              <h1>¡Bienvenido a ${clientName}!</h1>
              <p style="text-align: center; font-size: 18px; color: #2d3748;">Hola ${name},</p>
              <p style="text-align: center;">Tu cuenta ha sido activada correctamente y ya puedes comenzar a utilizar Cookie21.</p>
              
              <div class="feature-list">
                <h3 style="margin-top: 0; color: #235C88;">¿Qué puedes hacer ahora?</h3>
                <div class="feature-item">
                  <span class="feature-icon">✅</span>
                  <div>
                    <strong>Configurar tu banner de cookies</strong><br>
                    <span style="font-size: 14px; color: #718096;">Personaliza el diseño y los textos de tu aviso de cookies</span>
                  </div>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">📊</span>
                  <div>
                    <strong>Analizar las cookies de tu sitio</strong><br>
                    <span style="font-size: 14px; color: #718096;">Escanea tu web para detectar todas las cookies activas</span>
                  </div>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">📈</span>
                  <div>
                    <strong>Ver estadísticas de consentimiento</strong><br>
                    <span style="font-size: 14px; color: #718096;">Monitoriza las preferencias de tus usuarios</span>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Iniciar sesión</a>
              </div>
              
              <p style="text-align: center; margin-top: 32px; font-size: 14px; color: #718096;">
                Si necesitas ayuda, visita nuestra <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/documentation" style="color: #235C88;">documentación</a> o contáctanos.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>El equipo de Cookie21</strong></p>
              <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} Cookie21. Todos los derechos reservados.</p>
              <p style="margin-top: 8px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy">Política de Privacidad</a> | 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms">Términos de Uso</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Si el transporter es null en desarrollo, simular el envío
      if (this.isDev && !this.transporter) {
        console.log('🧪 SIMULACIÓN DE EMAIL DE BIENVENIDA');
        console.log(`  Para: ${email}`);
        console.log(`  Asunto: ¡Bienvenido a ${clientName}!`);
        
        logger.info('=== SIMULACIÓN DE EMAIL ===');
        logger.info(`Para: ${email}`);
        logger.info(`Asunto: ¡Bienvenido a ${clientName}!`);
        logger.info(`URL de login: ${loginUrl}`);
        logger.info('=== FIN DE SIMULACIÓN ===');
        
        return {
          success: true,
          jobId: `simulated-${Date.now()}`,
          previewUrl: null,
          simulado: true
        };
      }
      
      // Inicializar transporter si no existe
      if (!this.transporter) {
        console.log('🔄 Inicializando transporter para envío...');
        await this._initializeTransporter();
      }
      
      // Verificar que tenemos un transporter
      if (!this.transporter) {
        console.error('❌ No se pudo inicializar el transporter');
        return {
          success: false,
          error: 'No se pudo inicializar el transporter de email'
        };
      }
      
      // Preparar opciones del email
      const fromEmail = process.env.EMAIL_FROM || `"${clientName}" <noreply@cookie21.com>`;
      console.log('  Remitente:', fromEmail);
      
      // Enviar el email
      console.log('🔄 Enviando email...');
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: `¡Bienvenido a ${clientName}!`,
        html: htmlContent,
        text: `
          ¡Bienvenido a ${clientName}!
          
          Hola ${name},
          
          Tu cuenta ha sido activada correctamente.
          
          Ya puedes acceder a la plataforma con tu email y contraseña:
          ${loginUrl}
          
          Si tienes alguna pregunta, no dudes en contactarnos.
          
          Saludos,
          El equipo de ${clientName}
        `
      });
      
      console.log('✅ Email enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      logger.info(`Email de bienvenida enviado a ${email}`);
      
      // Si estamos en desarrollo con Ethereal, mostrar URL de previsualización
      const previewUrl = this.isDev && process.env.USE_ETHEREAL === 'true' ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('  Previsualización:', previewUrl);
        logger.info(`Previsualización: ${previewUrl}`);
      }
      
      return {
        success: true,
        jobId: info.messageId,
        previewUrl
      };
    } catch (error) {
      console.error('❌ Error al enviar email de bienvenida:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al enviar email de bienvenida: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }
  
  /**
   * Envía un email con el estilo de Cookies21
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async sendCookies21Email(options) {
    console.log('📧 Enviando email con plantilla Cookie21...');
    console.log('  Destinatario:', options.email);
    console.log('  Asunto:', options.subject);
    
    try {
      const { email, name, subject, message, buttonText, buttonUrl, clientName = 'Cookie21' } = options;
      
      if (!email || !name || !subject || !message) {
        console.error('❌ Faltan campos requeridos para el email de Cookie21');
        logger.error('Faltan campos requeridos para el email de Cookie21');
        return {
          success: false,
          error: 'Faltan campos requeridos'
        };
      }
      
      // URL base para imágenes
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      // Contenido del email con estilo Cookie21
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body, html { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #333;
              line-height: 1.5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 1px solid #eaeaea;
              margin-bottom: 30px;
            }
            .header img {
              max-height: 60px;
              width: auto;
            }
            .content {
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            h1 {
              color: #2c5282;
              margin-top: 0;
              font-size: 24px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2c5282;
              color: white !important;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
              color: #666;
              font-size: 12px;
              text-align: center;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              display: inline-block;
              margin: 0 5px;
            }
            .contact-info {
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.BACKEND_URL || 'https://api.cookie21.com'}/emails/logoO.png" alt="Cookie21 Logo">
            </div>
            
            <div class="content">
              <h1>${subject}</h1>
              <p>Hola ${name},</p>
              ${message}
              
              ${buttonText && buttonUrl ? `
              <div style="text-align: center;">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </div>
              ` : ''}
              
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
              <p>Saludos,<br>El equipo de ${clientName}</p>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://twitter.com/cookie21es" target="_blank">Twitter</a> | 
                <a href="https://www.linkedin.com/company/cookie21" target="_blank">LinkedIn</a> |
                <a href="https://www.facebook.com/cookie21es" target="_blank">Facebook</a>
              </div>
              
              <div class="contact-info">
                <p>&copy; ${new Date().getFullYear()} Cookies 21. Todos los derechos reservados.</p>
                <p>
                  <a href="${baseUrl}/politica-privacidad">Política de Privacidad</a> | 
                  <a href="${baseUrl}/aviso-legal">Aviso Legal</a> |
                  <a href="${baseUrl}/contacto">Contacto</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Versión de texto plano
      const textContent = `
        ${subject}
        
        Hola ${name},
        
        ${message.replace(/<[^>]*>?/gm, '')}
        
        ${buttonText && buttonUrl ? `${buttonText}: ${buttonUrl}` : ''}
        
        Si tienes alguna pregunta, no dudes en contactarnos.
        
        Saludos,
        El equipo de ${clientName}
        
        © ${new Date().getFullYear()} ${clientName}. Todos los derechos reservados.
      `;
      
      // Si el transporter es null en desarrollo, simular el envío
      if (this.isDev && !this.transporter) {
        console.log('🧪 SIMULACIÓN DE EMAIL COOKIE21');
        console.log(`  Para: ${email}`);
        console.log(`  Asunto: ${subject}`);
        console.log(`  Mensaje: ${message.substring(0, 50)}...`);
        if (buttonText && buttonUrl) {
          console.log(`  Botón: ${buttonText} - ${buttonUrl}`);
        }
        
        logger.info('=== SIMULACIÓN DE EMAIL COOKIE21 ===');
        logger.info(`Para: ${email}`);
        logger.info(`Asunto: ${subject}`);
        logger.info(`Mensaje: ${message.substring(0, 50)}...`);
        if (buttonText && buttonUrl) {
          logger.info(`Botón: ${buttonText} - ${buttonUrl}`);
        }
        logger.info('=== FIN DE SIMULACIÓN ===');
        
        return {
          success: true,
          jobId: `simulated-${Date.now()}`,
          previewUrl: null,
          simulado: true
        };
      }
      
      // Inicializar transporter si no existe
      if (!this.transporter) {
        console.log('🔄 Inicializando transporter para envío...');
        await this._initializeTransporter();
      }
      
      // Verificar que tenemos un transporter
      if (!this.transporter) {
        console.error('❌ No se pudo inicializar el transporter');
        return {
          success: false,
          error: 'No se pudo inicializar el transporter de email'
        };
      }
      
      // Preparar opciones del email
      const fromEmail = process.env.EMAIL_FROM || `"${clientName}" <noreply@cookie21.com>`;
      console.log('  Remitente:', fromEmail);
      
      // Enviar el email
      console.log('🔄 Enviando email...');
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      logger.info(`Email de Cookie21 enviado a ${email}`);
      
      // Si estamos en desarrollo con Ethereal, mostrar URL de previsualización
      const previewUrl = this.isDev && process.env.USE_ETHEREAL === 'true' ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('  Previsualización:', previewUrl);
        logger.info(`Previsualización: ${previewUrl}`);
      }
      
      return {
        success: true,
        jobId: info.messageId,
        previewUrl
      };
    } catch (error) {
      console.error('❌ Error al enviar email de Cookie21:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al enviar email de Cookie21: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }

  /**
   * Envía un email de configuración de cookies con el estilo de Cookie21
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async sendCookieConfigEmail(options) {
    console.log('📧 Enviando email de configuración de cookies...');
    console.log('  Destinatario:', options.email);
    console.log('  Sitio web:', options.website);
    
    try {
      const { email, name, website, configUrl, clientName = 'Cookie21' } = options;
      
      if (!email || !name || !website) {
        console.error('❌ Faltan campos requeridos para el email de configuración de cookies');
        logger.error('Faltan campos requeridos para el email de configuración de cookies');
        return {
          success: false,
          error: 'Faltan campos requeridos'
        };
      }
      
      // URL base para imágenes y enlaces
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const cookieConfigUrl = configUrl || `${baseUrl}/panel/configuracion-cookies`;
      console.log('  URL de configuración:', cookieConfigUrl);
      
      // Contenido del email con estilo Cookie21
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Configuración de Cookies para ${website}</title>
          <style>
            body, html { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #333;
              line-height: 1.5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 1px solid #eaeaea;
              margin-bottom: 30px;
            }
            .header img {
              max-height: 60px;
              width: auto;
            }
            .content {
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            h1 {
              color: #2c5282;
              margin-top: 0;
              font-size: 24px;
            }
            .info-box {
              background-color: #ebf8ff;
              border-left: 4px solid #3182ce;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 4px 4px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2c5282;
              color: white !important;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
              color: #666;
              font-size: 12px;
              text-align: center;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              display: inline-block;
              margin: 0 5px;
            }
            .contact-info {
              margin-top: 15px;
            }
            .cookie-types {
              margin: 20px 0;
            }
            .cookie-type {
              margin-bottom: 15px;
            }
            .cookie-type h3 {
              color: #2c5282;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.BACKEND_URL || 'https://api.cookie21.com'}/emails/logoO.png" alt="Cookie21 Logo">
            </div>
            
            <div class="content">
              <h1>Configuración de Cookies para ${website}</h1>
              <p>Hola ${name},</p>
              <p>Te compartimos la información sobre la configuración de cookies para tu sitio web.</p>
              
              <div class="info-box">
                <p><strong>Importante:</strong> Recuerda que es necesario cumplir con la nueva Guía 2023 sobre el uso de las cookies de la Agencia Española. Estos criterios deben implementarse antes de enero de 2024.</p>
              </div>
              
              <div class="cookie-types">
                <div class="cookie-type">
                  <h3>Cookies Técnicas Necesarias</h3>
                  <p>Estas cookies son imprescindibles para el funcionamiento de tu sitio web.</p>
                </div>
                
                <div class="cookie-type">
                  <h3>Cookies de Análisis o Medición</h3>
                  <p>Para la mejora continua de tu página web. Puedes activarlas o desactivarlas.</p>
                </div>
                
                <div class="cookie-type">
                  <h3>Cookies de Marketing o Publicidad</h3>
                  <p>Para mejorar la gestión de la publicidad mostrada en tu sitio web.</p>
                </div>
              </div>
              
              <p>Para realizar la configuración completa de las cookies en tu sitio web, haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${cookieConfigUrl}" class="button">CUMPLIR NORMATIVA</a>
              </div>
              
              <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
              <p>Saludos,<br>El equipo de ${clientName}</p>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://twitter.com/cookie21es" target="_blank">Twitter</a> | 
                <a href="https://www.linkedin.com/company/cookie21" target="_blank">LinkedIn</a> |
                <a href="https://www.facebook.com/cookie21es" target="_blank">Facebook</a>
              </div>
              
              <div class="contact-info">
                <p>&copy; ${new Date().getFullYear()} Cookies 21. Todos los derechos reservados.</p>
                <p>
                  <a href="${baseUrl}/politica-privacidad">Política de Privacidad</a> | 
                  <a href="${baseUrl}/aviso-legal">Aviso Legal</a> |
                  <a href="${baseUrl}/contacto">Contacto</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Versión de texto plano
      const textContent = `
        Configuración de Cookies para ${website}
        
        Hola ${name},
        
        Te compartimos la información sobre la configuración de cookies para tu sitio web.
        
        IMPORTANTE: Recuerda que es necesario cumplir con la nueva Guía 2023 sobre el uso de las cookies de la Agencia Española. Estos criterios deben implementarse antes de enero de 2024.
        
        Tipos de cookies:
        
        - Cookies Técnicas Necesarias: Estas cookies son imprescindibles para el funcionamiento de tu sitio web.
        
        - Cookies de Análisis o Medición: Para la mejora continua de tu página web. Puedes activarlas o desactivarlas.
        
        - Cookies de Marketing o Publicidad: Para mejorar la gestión de la publicidad mostrada en tu sitio web.
        
        Para realizar la configuración completa de las cookies en tu sitio web, visita: ${cookieConfigUrl}
        
        Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
        
        Saludos,
        El equipo de ${clientName}
        
        © ${new Date().getFullYear()} ${clientName}. Todos los derechos reservados.
      `;
      
      // Si el transporter es null en desarrollo, simular el envío
      if (this.isDev && !this.transporter) {
        console.log('🧪 SIMULACIÓN DE EMAIL CONFIGURACIÓN COOKIES');
        console.log(`  Para: ${email}`);
        console.log(`  Asunto: Configuración de Cookies para ${website}`);
        console.log(`  URL de configuración: ${cookieConfigUrl}`);
        
        logger.info('=== SIMULACIÓN DE EMAIL CONFIGURACIÓN COOKIES ===');
        logger.info(`Para: ${email}`);
        logger.info(`Asunto: Configuración de Cookies para ${website}`);
        logger.info(`URL de configuración: ${cookieConfigUrl}`);
        logger.info('=== FIN DE SIMULACIÓN ===');
        
        return {
          success: true,
          jobId: `simulated-${Date.now()}`,
          previewUrl: null,
          simulado: true
        };
      }
      
      // Inicializar transporter si no existe
      if (!this.transporter) {
        console.log('🔄 Inicializando transporter para envío...');
        await this._initializeTransporter();
      }
      
      // Verificar que tenemos un transporter
      if (!this.transporter) {
        console.error('❌ No se pudo inicializar el transporter');
        return {
          success: false,
          error: 'No se pudo inicializar el transporter de email'
        };
      }
      
      // Preparar opciones del email
      const fromEmail = process.env.EMAIL_FROM || `"${clientName}" <noreply@cookie21.com>`;
      console.log('  Remitente:', fromEmail);
      
      // Enviar el email
      console.log('🔄 Enviando email...');
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: `Configuración de Cookies para ${website}`,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      logger.info(`Email de configuración de cookies enviado a ${email}`);
      
      // Si estamos en desarrollo con Ethereal, mostrar URL de previsualización
      const previewUrl = this.isDev && process.env.USE_ETHEREAL === 'true' ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('  Previsualización:', previewUrl);
        logger.info(`Previsualización: ${previewUrl}`);
      }
      
      return {
        success: true,
        jobId: info.messageId,
        previewUrl
      };
    } catch (error) {
      console.error('❌ Error al enviar email de configuración de cookies:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al enviar email de configuración de cookies: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }
  
  /**
   * Envía un email con el script de embed para un dominio
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async sendEmbedScriptEmail(options) {
    console.log('📧 Enviando email con script de embed...');
    console.log('  Destinatario:', options.email);
    console.log('  Dominio:', options.domain);
    
    try {
      const { 
        email, 
        name, 
        domain, 
        script, 
        clientName = 'Cookie21',
        invitationInfo = null, // Información opcional de invitación si se combina
        sendDirect = false 
      } = options;
      
      if (!email || !name || !domain || !script) {
        console.error('❌ Faltan campos requeridos para el email de script embed');
        logger.error('Faltan campos requeridos para el email de script embed');
        return {
          success: false,
          error: 'Faltan campos requeridos'
        };
      }
      
      // URL base para imágenes y enlaces
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const docsUrl = `${baseUrl}/documentation`;
      
      // Contenido específico para invitación si está incluida
      let invitationSection = '';
      if (invitationInfo && invitationInfo.token && invitationInfo.url) {
        invitationSection = `
          <div style="margin: 30px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
            <h3 style="color: #2c5282; margin-top: 0;">✨ Invitación a Cookies21</h3>
            <p>Has sido invitado a unirte a la plataforma Cookies21 como administrador del cliente ${clientName}.</p>
            <p>Para completar tu registro, haz clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${invitationInfo.url}" style="display: inline-block; background-color: #2c5282; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Completar registro</a>
            </div>
            <p style="font-size: 0.9em; color: #64748b;">Este enlace expirará en 7 días.</p>
          </div>
        `;
      }
      
      // Contenido del email con script embebible
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Script de Consentimiento de Cookies para ${domain}</title>
          <style>
            body, html { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #333;
              line-height: 1.5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 1px solid #eaeaea;
              margin-bottom: 30px;
            }
            .header img {
              max-height: 60px;
              width: auto;
            }
            .content {
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            h1 {
              color: #2c5282;
              margin-top: 0;
              font-size: 24px;
            }
            h2 {
              color: #2c5282;
              font-size: 20px;
              margin-top: 30px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2c5282;
              color: white !important;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
              color: #666;
              font-size: 12px;
              text-align: center;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              display: inline-block;
              margin: 0 5px;
            }
            .contact-info {
              margin-top: 15px;
            }
            .code-block {
              background-color: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 15px;
              overflow-x: auto;
              font-family: monospace;
              font-size: 14px;
              line-height: 1.5;
              margin: 20px 0;
            }
            .tip-box {
              background-color: #ebf8ff;
              border-left: 4px solid #3182ce;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 4px 4px 0;
            }
            .important-notice {
              background-color: #fff5f5;
              border-left: 4px solid #e53e3e;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 4px 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.BACKEND_URL || 'https://api.cookie21.com'}/emails/logoO.png" alt="Cookie21 Logo">
            </div>
            
            <div class="content">
              <h1>Script de Consentimiento de Cookies para ${domain}</h1>
              <p>Hola ${name},</p>
              <p>Te compartimos el script de consentimiento de cookies para tu sitio web <strong>${domain}</strong>. Este script debe instalarse en todas las páginas de tu sitio web para cumplir con la normativa vigente sobre cookies.</p>
              
              ${invitationSection}
              
              <h2>📋 Código para insertar</h2>
              <p>Añade el siguiente código justo antes del cierre de la etiqueta <code>&lt;/head&gt;</code> en todas las páginas de tu sitio web:</p>
              
              <div class="code-block">${script.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              
              <div class="tip-box">
                <p><strong>Consejo:</strong> Si tu sitio web utiliza un sistema de gestión de contenidos (CMS) como WordPress, puedes añadir este código en la configuración del tema o mediante un plugin específico para scripts en el header.</p>
              </div>
              
              <div class="important-notice">
                <p><strong>Importante:</strong> Recuerda que este script debe estar presente en todas las páginas de tu sitio web para asegurar el cumplimiento normativo. La ausencia del script en alguna página podría resultar en incumplimiento de la normativa.</p>
              </div>
              
              <h2>🔎 Verificación</h2>
              <p>Una vez instalado el script, puedes verificar su correcto funcionamiento visitando tu sitio web. Deberías ver aparecer el banner de consentimiento de cookies en tu primera visita.</p>
              
              <h2>📚 Documentación</h2>
              <p>Para más información sobre la configuración y personalización del banner, consulta nuestra documentación:</p>
              
              <div style="text-align: center;">
                <a href="${docsUrl}" class="button">Ver documentación</a>
              </div>
              
              <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
              <p>Saludos cordiales,<br>De parte del equipo de Cookies 21</p>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://twitter.com/cookie21es" target="_blank">Twitter</a> | 
                <a href="https://www.linkedin.com/company/cookie21" target="_blank">LinkedIn</a> |
                <a href="https://www.facebook.com/cookie21es" target="_blank">Facebook</a>
              </div>
              
              <div class="contact-info">
                <p>&copy; ${new Date().getFullYear()} Cookies 21. Todos los derechos reservados.</p>
                <p>
                  <a href="${baseUrl}/politica-privacidad">Política de Privacidad</a> | 
                  <a href="${baseUrl}/aviso-legal">Aviso Legal</a> |
                  <a href="${baseUrl}/contacto">Contacto</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Versión de texto plano
      const textContent = `
        Script de Consentimiento de Cookies para ${domain}
        
        Hola ${name},
        
        Te compartimos el script de consentimiento de cookies para tu sitio web ${domain}. Este script debe instalarse en todas las páginas de tu sitio web para cumplir con la normativa vigente sobre cookies.
        
        ${invitationInfo ? `
        ✨ INVITACIÓN A COOKIES21
        
        Has sido invitado a unirte a la plataforma Cookies21 como administrador del cliente ${clientName}.
        
        Para completar tu registro, visita el siguiente enlace:
        ${invitationInfo.url}
        
        Este enlace expirará en 7 días.
        ` : ''}
        
        CÓDIGO PARA INSERTAR
        
        Añade el siguiente código justo antes del cierre de la etiqueta </head> en todas las páginas de tu sitio web:
        
        ${script}
        
        IMPORTANTE: Recuerda que este script debe estar presente en todas las páginas de tu sitio web para asegurar el cumplimiento normativo.
        
        VERIFICACIÓN
        
        Una vez instalado el script, puedes verificar su correcto funcionamiento visitando tu sitio web. Deberías ver aparecer el banner de consentimiento de cookies en tu primera visita.
        
        DOCUMENTACIÓN
        
        Para más información sobre la configuración y personalización del banner, consulta nuestra documentación:
        ${docsUrl}
        
        Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
        
        Saludos,
        El equipo de ${clientName}
        
        © ${new Date().getFullYear()} ${clientName}. Todos los derechos reservados.
      `;
      
      // Si el transporter es null en desarrollo, simular el envío
      if (this.isDev && !this.transporter && !sendDirect) {
        console.log('🧪 SIMULACIÓN DE EMAIL CON SCRIPT DE EMBED');
        console.log(`  Para: ${email}`);
        console.log(`  Asunto: Script de Consentimiento de Cookies para ${domain}`);
        console.log(`  Dominio: ${domain}`);
        
        logger.info('=== SIMULACIÓN DE EMAIL CON SCRIPT EMBED ===');
        logger.info(`Para: ${email}`);
        logger.info(`Asunto: Script de Consentimiento de Cookies para ${domain}`);
        logger.info(`Dominio: ${domain}`);
        logger.info(`Invitación incluida: ${invitationInfo ? 'Sí' : 'No'}`);
        logger.info('=== FIN DE SIMULACIÓN ===');
        
        return {
          success: true,
          jobId: `simulated-${Date.now()}`,
          previewUrl: null,
          simulado: true
        };
      }
      
      // Inicializar transporter si no existe
      if (!this.transporter || sendDirect) {
        console.log('🔄 Inicializando transporter para envío...');
        await this._initializeTransporter();
      }
      
      // Verificar que tenemos un transporter
      if (!this.transporter) {
        console.error('❌ No se pudo inicializar el transporter');
        return {
          success: false,
          error: 'No se pudo inicializar el transporter de email'
        };
      }
      
      // Preparar opciones del email
      const fromEmail = process.env.EMAIL_FROM || `"${clientName}" <noreply@cookie21.com>`;
      console.log('  Remitente:', fromEmail);
      
      // Enviar el email
      console.log('🔄 Enviando email...');
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: `Script de Consentimiento de Cookies para ${domain}`,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      logger.info(`Email con script embed enviado a ${email} para dominio ${domain}`);
      
      // Si estamos en desarrollo con Ethereal, mostrar URL de previsualización
      const previewUrl = this.isDev && process.env.USE_ETHEREAL === 'true' ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('  Previsualización:', previewUrl);
        logger.info(`Previsualización: ${previewUrl}`);
      }
      
      return {
        success: true,
        jobId: info.messageId,
        previewUrl,
        combined: !!invitationInfo // Indicar si fue un correo combinado
      };
    } catch (error) {
      console.error('❌ Error al enviar email con script embed:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      logger.error(`Error al enviar email con script embed: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }

  /**
   * Realiza un test de conexión y envío de email
   * @returns {Promise<Object>} - Resultado del test
   */
  async testConnection() {
    console.log('🔄 Realizando test de conexión SMTP...');
    
    try {
      // Mostrar configuración
      console.log('Configuración actual:');
      console.log(`  HOST: ${process.env.EMAIL_HOST}`);
      console.log(`  PORT: ${process.env.EMAIL_PORT}`);
      console.log(`  USER: ${process.env.EMAIL_USER}`);
      console.log(`  FROM: ${process.env.EMAIL_FROM}`);
      console.log(`  PASS: ${process.env.EMAIL_PASS ? '[CONFIGURADO]' : '[NO CONFIGURADO]'}`);
      
      // Reinicializar el transporter (forzar nueva conexión)
      this.transporter = null;
      await this._initializeTransporter();
      
      if (!this.transporter) {
        return {
          success: false,
          error: 'No se pudo inicializar el transporter',
          stage: 'init'
        };
      }
      
      // Verificar la conexión
      console.log('🔄 Verificando conexión SMTP...');
      const verifyResult = await this.transporter.verify();
      console.log('✅ Conexión verificada:', verifyResult);
      
      // Enviar email de prueba
      const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
      if (!testEmail) {
        return {
          success: true,
          connectionOk: true,
          message: 'Conexión SMTP verificada correctamente, pero no se envió email de prueba (falta TEST_EMAIL)'
        };
      }
      
      console.log(`🔄 Enviando email de prueba a ${testEmail}...`);
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Test" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: `Test de conexión SMTP - ${new Date().toISOString()}`,
        text: `Este es un email de prueba enviado el ${new Date().toLocaleString()}.
        
Configuración:
- HOST: ${process.env.EMAIL_HOST}
- PORT: ${process.env.EMAIL_PORT}
- USER: ${process.env.EMAIL_USER}
- FROM: ${process.env.EMAIL_FROM}

Si estás recibiendo este email, la configuración SMTP está funcionando correctamente.`
      });
      
      console.log('✅ Email de prueba enviado correctamente');
      console.log('  ID del mensaje:', info.messageId);
      console.log('  Respuesta:', info.response);
      
      return {
        success: true,
        connectionOk: true,
        emailSent: true,
        messageId: info.messageId,
        response: info.response
      };
      
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      console.error('Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response
        }
      };
    }
  }

  /**
   * Envía notificación a owners sobre nueva solicitud de renovación
   */
  async sendRenewalRequestNotification(data) {
    const { to, ownerName, clientName, clientEmail, requestType, urgency, message, requestedBy, requestId } = data;
    
    const urgencyText = {
      low: 'Baja',
      medium: 'Media', 
      high: 'Alta'
    };
    
    const requestTypeText = {
      renewal: 'Renovación de Suscripción',
      reactivation: 'Reactivación de Suscripción',
      upgrade: 'Actualización de Plan',
      support: 'Soporte Técnico'
    };
    
    const urgencyColor = {
      low: '#22C55E',
      medium: '#F59E0B',
      high: '#EF4444'
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva Solicitud de ${requestTypeText[requestType]}</title>
      <style>
        ${this._getEmailStyles()}
        .urgency-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          background-color: ${urgencyColor[urgency]};
        }
        .request-details {
          background-color: #f8fafc;
          border-left: 4px solid #235C88;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="content">
          <h1>🔔 Nueva Solicitud Recibida</h1>
          
          <p>Hola <strong>${ownerName}</strong>,</p>
          
          <p>Se ha recibido una nueva solicitud de <strong>${requestTypeText[requestType]}</strong> que requiere tu atención.</p>
          
          <div class="request-details">
            <h3 style="margin-top: 0; color: #235C88;">📋 Detalles de la Solicitud</h3>
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Solicitado por:</strong> ${requestedBy}</p>
            <p><strong>Tipo:</strong> ${requestTypeText[requestType]}</p>
            <p><strong>Urgencia:</strong> <span class="urgency-badge">${urgencyText[urgency]}</span></p>
            <p><strong>Mensaje:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; font-style: italic; border-left: 3px solid #235C88;">
              "${message}"
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/renewal-requests" class="button">
              🚀 Ver en Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 20px;">
            <strong>ID de solicitud:</strong> ${requestId}<br>
            <strong>Recibida:</strong> ${new Date().toLocaleString('es-ES')}
          </p>
          
          <p style="font-size: 12px; color: #9CA3AF;">
            Este email se envió automáticamente desde el sistema de gestión de suscripciones de Cookies21.
          </p>
        </div>
      </div>
    </body>
    </html>`;

    return this.sendEmail({
      to,
      subject: `🔔 Nueva ${requestTypeText[requestType]} - ${clientName}`,
      html
    });
  }

  /**
   * Envía notificación al cliente sobre cambio de estado de su solicitud
   */
  async sendRenewalStatusUpdate(data) {
    const { to, clientName, requestType, newStatus, adminNotes, requestId } = data;
    
    const statusText = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completada',
      rejected: 'Rechazada'
    };
    
    const statusColor = {
      pending: '#F59E0B',
      in_progress: '#3B82F6',
      completed: '#22C55E',
      rejected: '#EF4444'
    };
    
    const requestTypeText = {
      renewal: 'Renovación de Suscripción',
      reactivation: 'Reactivación de Suscripción',
      upgrade: 'Actualización de Plan',
      support: 'Soporte Técnico'
    };

    let statusMessage = '';
    let nextSteps = '';
    
    switch (newStatus) {
      case 'in_progress':
        statusMessage = 'Nuestro equipo está revisando tu solicitud y se contactará contigo pronto.';
        nextSteps = 'Te notificaremos por email cuando tengamos una actualización.';
        break;
      case 'completed':
        statusMessage = 'Tu solicitud ha sido procesada exitosamente.';
        nextSteps = 'Revisa tu panel de control para ver los cambios aplicados.';
        break;
      case 'rejected':
        statusMessage = 'Lamentablemente, no pudimos procesar tu solicitud en este momento.';
        nextSteps = 'Puedes contactar a nuestro equipo de soporte para más información.';
        break;
      default:
        statusMessage = 'El estado de tu solicitud ha sido actualizado.';
        nextSteps = 'Te mantendremos informado sobre cualquier cambio.';
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Actualización de tu Solicitud</title>
      <style>
        ${this._getEmailStyles()}
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          background-color: ${statusColor[newStatus]};
        }
        .status-update {
          background-color: #f8fafc;
          border: 2px solid ${statusColor[newStatus]};
          padding: 25px;
          margin: 25px 0;
          border-radius: 12px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="content">
          <h1>📱 Actualización de Solicitud</h1>
          
          <p>Estimado cliente de <strong>${clientName}</strong>,</p>
          
          <p>Te escribimos para informarte sobre una actualización en tu solicitud de <strong>${requestTypeText[requestType]}</strong>.</p>
          
          <div class="status-update">
            <h3 style="margin-top: 0;">Estado Actual</h3>
            <span class="status-badge">${statusText[newStatus]}</span>
            <p style="margin: 15px 0 5px 0; font-size: 16px;">${statusMessage}</p>
          </div>
          
          ${adminNotes ? `
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #92400E;">💬 Nota del Equipo:</h4>
            <p style="margin-bottom: 0; color: #92400E;">${adminNotes}</p>
          </div>
          ` : ''}
          
          <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #0C4A6E;">🔄 Próximos Pasos:</h4>
            <p style="margin-bottom: 0; color: #0C4A6E;">${nextSteps}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">
              📊 Ir al Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 20px;">
            <strong>Solicitud:</strong> ${requestTypeText[requestType]}<br>
            <strong>ID de referencia:</strong> ${requestId}<br>
            <strong>Actualizada:</strong> ${new Date().toLocaleString('es-ES')}
          </p>
          
          <p style="font-size: 12px; color: #9CA3AF;">
            Si tienes preguntas, puedes responder a este email o contactar a nuestro equipo de soporte.
          </p>
        </div>
      </div>
    </body>
    </html>`;

    return this.sendEmail({
      to,
      subject: `📱 Actualización: ${requestTypeText[requestType]} - ${statusText[newStatus]}`,
      html
    });
  }

  // Método para enviar confirmación de renovación exitosa
  async sendRenewalSuccessNotification({ 
    to, 
    clientName, 
    planName, 
    endDate, 
    features = [],
    requestType = 'renewal' 
  }) {
    console.log(`📧 Enviando confirmación de renovación exitosa a: ${to}`);
    
    const typeMessages = {
      renewal: {
        title: '¡Suscripción Renovada Exitosamente!',
        message: 'Tu suscripción ha sido renovada y ya puedes continuar disfrutando de todos nuestros servicios.',
        icon: '🎉'
      },
      reactivation: {
        title: '¡Suscripción Reactivada!',
        message: 'Tu suscripción ha sido reactivada y ya tienes acceso completo a todos los servicios.',
        icon: '✅'
      },
      upgrade: {
        title: '¡Plan Actualizado!',
        message: 'Tu plan ha sido actualizado exitosamente. Disfruta de las nuevas características.',
        icon: '⬆️'
      }
    };

    const typeInfo = typeMessages[requestType] || typeMessages.renewal;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const dashboardUrl = `${frontendUrl}/dashboard`;
    const formattedEndDate = new Date(endDate).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${typeInfo.title}</title>
        <style>
          body, html { 
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            color: #1a202c;
            line-height: 1.6;
            background-color: #f7fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header img {
            max-height: 60px;
            width: auto;
            display: block;
            margin: 0 auto 20px auto;
            filter: brightness(0) invert(1);
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
            display: block;
          }
          .success-title {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: white;
          }
          .success-subtitle {
            font-size: 16px;
            margin: 0;
            opacity: 0.9;
            color: white;
          }
          .content {
            padding: 40px 30px;
          }
          .renewal-card {
            background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
            border: 2px solid #3B82F6;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }
          .plan-name {
            font-size: 24px;
            font-weight: bold;
            color: #1E40AF;
            margin: 0 0 8px 0;
          }
          .plan-details {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
          }
          .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #F3F4F6;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #374151;
          }
          .detail-value {
            color: #10B981;
            font-weight: 600;
          }
          .features-list {
            background: #F9FAFB;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .features-title {
            font-weight: bold;
            color: #374151;
            margin: 0 0 12px 0;
          }
          .feature-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            color: #6B7280;
          }
          .feature-check {
            color: #10B981;
            font-weight: bold;
            margin-right: 8px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #235C88 0%, #1a4668 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(35, 92, 136, 0.3);
          }
          .footer {
            background-color: #F9FAFB;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
          }
          .footer-text {
            font-size: 14px;
            color: #6B7280;
            margin: 8px 0;
          }
          .brand-footer {
            background: linear-gradient(135deg, #235C88 0%, #1a4668 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
          @media (max-width: 600px) {
            .container {
              margin: 0;
              border-radius: 0;
            }
            .header, .content, .footer {
              padding: 20px;
            }
            .success-title {
              font-size: 24px;
            }
            .plan-name {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <img src="https://via.placeholder.com/200x60/FFFFFF/FFFFFF?text=COOKIE21" alt="Cookie21 Logo" />
            <div class="success-icon">${typeInfo.icon}</div>
            <h1 class="success-title">${typeInfo.title}</h1>
            <p class="success-subtitle">${typeInfo.message}</p>
          </div>

          <!-- Content -->
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
              Hola,
            </p>
            
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
              ¡Excelentes noticias! Tu suscripción de <strong>${clientName}</strong> está activa y lista para usar.
            </p>

            <!-- Renewal Card -->
            <div class="renewal-card">
              <h2 class="plan-name">Plan ${planName}</h2>
              
              <div class="plan-details">
                <div class="detail-item">
                  <span class="detail-label">Estado:</span>
                  <span class="detail-value">✅ Activo</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Válido hasta:</span>
                  <span class="detail-value">${formattedEndDate}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Renovado el:</span>
                  <span class="detail-value">${new Date().toLocaleDateString('es-ES')}</span>
                </div>
              </div>

              ${features.length > 0 ? `
                <div class="features-list">
                  <h3 class="features-title">🚀 Características incluidas:</h3>
                  ${features.map(feature => `
                    <div class="feature-item">
                      <span class="feature-check">✓</span>
                      <span>${feature}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                🚀 Acceder al Panel de Control
              </a>
            </div>

            <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>💡 Consejo:</strong> Ahora puedes configurar nuevos dominios, crear banners personalizados y acceder a todas las herramientas de gestión de cookies y consentimiento.
              </p>
            </div>

            <p style="font-size: 16px; color: #374151; margin: 24px 0 0 0;">
              Gracias por confiar en Cookie21 para el cumplimiento de privacidad de tu sitio web.
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              ¿Necesitas ayuda? Responde a este email o visita nuestro centro de ayuda.
            </p>
            <p class="footer-text">
              <strong>Equipo de Cookie21</strong>
            </p>
          </div>

          <!-- Brand Footer -->
          <div class="brand-footer">
            <p style="margin: 0;">
              <strong>Cookie21</strong> - Solución completa de gestión de consentimiento y privacidad
            </p>
            <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 12px;">
              Cumplimiento GDPR • Gestión de Cookies • Banners Personalizables
            </p>
          </div>
        </div>
      </body>
      </html>`;

    return this.sendEmail({
      to,
      subject: `${typeInfo.icon} ${typeInfo.title} - ${clientName}`,
      html
    });
  }
}

module.exports = new EmailService();