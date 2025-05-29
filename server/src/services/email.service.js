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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invitación a ${clientName}</h2>
          <p>Hola ${name},</p>
          <p>Has sido invitado a unirte a ${clientName} con el rol de ${role || 'usuario'}.</p>
          <p>Para completar tu registro, haz clic en el siguiente enlace:</p>
          <p><a href="${inviteUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Completar registro</a></p>
          <p>O copia y pega esta URL en tu navegador:</p>
          <p>${inviteUrl}</p>
          <p>Este enlace expirará en 7 días.</p>
          <p>Si no has solicitado esta invitación, puedes ignorar este mensaje.</p>
          <p>Saludos,<br>El equipo de ${clientName}</p>
        </div>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Bienvenido a ${clientName}!</h2>
          <p>Hola ${name},</p>
          <p>Tu cuenta ha sido activada correctamente.</p>
          <p>Ya puedes acceder a la plataforma con tu email y contraseña.</p>
          <p><a href="${loginUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Iniciar sesión</a></p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>Saludos,<br>El equipo de ${clientName}</p>
        </div>
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
              <img src="${baseUrl}/public/logo.webp" alt="Cookie21 Logo">
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
              <img src="${baseUrl}/public/logo.webp" alt="Cookie21 Logo">
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
      const docsUrl = `${baseUrl}/documentacion`;
      
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
              <img src="${baseUrl}/public/logo.webp" alt="Cookie21 Logo">
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
}

module.exports = new EmailService();