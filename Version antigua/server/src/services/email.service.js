const nodemailer = require('nodemailer');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { render } = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

class EmailService {
  constructor() {
    // Configuración de providers
    this.providers = {
      smtp: {
        createTransport: () => nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        })
      },
      ses: {
        createTransport: () => new SESClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        })
      }
    };

    // Provider por defecto
    this.defaultProvider = process.env.EMAIL_PROVIDER || 'smtp';

    // Configuración de plantillas
    this.templatesDir = path.join(__dirname, '../templates/email');
    this.templateCache = {};

    // Configuración de remitente
    this.defaultFrom = {
      name: process.env.EMAIL_FROM_NAME || 'CMP System',
      email: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'
    };

    // Configuración de reintentos
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
  }

  // Enviar email
  async sendEmail(options) {
    const {
      to,
      subject,
      text,
      html,
      from = this.defaultFrom,
      provider = this.defaultProvider,
      attachments = [],
      trackingData = {},
      priority = 'normal'
    } = options;

    try {
      // Preparar email
      const message = {
        from: typeof from === 'string' ? from : `${from.name} <${from.email}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        text,
        html,
        attachments,
        headers: {
          'X-Priority': this._getPriorityHeader(priority),
          'X-Tracking-ID': this._generateTrackingId()
        }
      };

      // Enviar con reintentos
      let lastError;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const result = await this._sendWithProvider(provider, message);
          
          // Registrar envío exitoso
          await this._logEmailSent({
            ...message,
            trackingData,
            provider,
            attempt,
            success: true
          });

          return result;
        } catch (error) {
          lastError = error;
          if (attempt < this.maxRetries) {
            await new Promise(resolve => 
              setTimeout(resolve, this.retryDelay * attempt)
            );
          }
        }
      }

      // Registrar error después de todos los intentos
      await this._logEmailError({
        to,
        subject,
        error: lastError,
        provider,
        attempts: this.maxRetries
      });

      throw lastError;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // Enviar email con plantilla
  async sendTemplateEmail(options) {
    const {
      template,
      data,
      ...emailOptions
    } = options;

    try {
      // Renderizar plantilla
      const rendered = await this._renderTemplate(template, data);

      // Enviar email con contenido renderizado
      return await this.sendEmail({
        ...emailOptions,
        ...rendered
      });
    } catch (error) {
      logger.error('Error sending template email:', error);
      throw error;
    }
  }

  // Enviar email en lote
  async sendBulkEmail(options) {
    const {
      recipients,
      template,
      baseData,
      ...emailOptions
    } = options;

    try {
      const results = [];
      const errors = [];

      // Procesar cada recipiente
      for (const recipient of recipients) {
        try {
          // Combinar datos base con datos específicos del recipiente
          const data = {
            ...baseData,
            ...recipient.data
          };

          // Enviar email individual
          const result = await this.sendTemplateEmail({
            ...emailOptions,
            to: recipient.email,
            template,
            data
          });

          results.push({
            email: recipient.email,
            success: true,
            messageId: result.messageId
          });
        } catch (error) {
          errors.push({
            email: recipient.email,
            error: error.message
          });
        }
      }

      return {
        success: results,
        failed: errors,
        totalSent: results.length,
        totalFailed: errors.length
      };
    } catch (error) {
      logger.error('Error sending bulk email:', error);
      throw error;
    }
  }

  // Enviar notificación de cambios en cookies
  async sendCookieChangeNotification(options) {
    const {
      domain,
      changes,
      recipients,
      scanDate
    } = options;

    return this.sendTemplateEmail({
      template: 'cookie-changes',
      to: recipients,
      subject: `Cookie Changes Detected - ${domain}`,
      data: {
        domain,
        changes: {
          new: changes.newCookies.length,
          modified: changes.modifiedCookies.length,
          removed: changes.removedCookies.length
        },
        scanDate,
        detailsUrl: `${process.env.DASHBOARD_URL}/domains/${domain}/scans`
      }
    });
  }

  // Enviar email de bienvenida
  async sendWelcomeEmail(user) {
    return this.sendTemplateEmail({
      template: 'welcome',
      to: user.email,
      subject: 'Welcome to CMP System',
      data: {
        name: user.name,
        loginUrl: `${process.env.DASHBOARD_URL}/login`,
        docsUrl: `${process.env.DASHBOARD_URL}/docs`
      }
    });
  }

  // Enviar email de recuperación de contraseña
  async sendPasswordResetEmail(user, token) {
    return this.sendTemplateEmail({
      template: 'password-reset',
      to: user.email,
      subject: 'Password Reset Request',
      data: {
        name: user.name,
        resetUrl: `${process.env.DASHBOARD_URL}/reset-password?token=${token}`,
        expiryTime: '1 hour'
      }
    });
  }

  // Métodos privados
  async _sendWithProvider(provider, message) {
    switch (provider) {
      case 'smtp':
        return this._sendWithSMTP(message);
      case 'ses':
        return this._sendWithSES(message);
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  async _sendWithSMTP(message) {
    const transport = this.providers.smtp.createTransport();
    return await transport.sendMail(message);
  }

  async _sendWithSES(message) {
    const client = this.providers.ses.createTransport();
    
    const command = new SendEmailCommand({
      Source: message.from,
      Destination: {
        ToAddresses: message.to.split(',')
      },
      Message: {
        Subject: {
          Data: message.subject
        },
        Body: {
          Text: message.text ? { Data: message.text } : undefined,
          Html: message.html ? { Data: message.html } : undefined
        }
      },
      Headers: Object.entries(message.headers).map(([name, value]) => ({
        Name: name,
        Value: value
      }))
    });

    return await client.send(command);
  }

  async _renderTemplate(templateName, data) {
    try {
      // Intentar obtener plantilla del caché
      let template = this.templateCache[templateName];

      if (!template) {
        // Cargar archivos de plantilla
        const [htmlFile, textFile] = await Promise.all([
          fs.readFile(
            path.join(this.templatesDir, `${templateName}.html`),
            'utf8'
          ),
          fs.readFile(
            path.join(this.templatesDir, `${templateName}.txt`),
            'utf8'
          ).catch(() => null) // Plantilla de texto es opcional
        ]);

        template = {
          html: htmlFile,
          text: textFile
        };

        // Guardar en caché
        this.templateCache[templateName] = template;
      }

      // Renderizar contenido
      const rendered = {
        html: template.html ? render(template.html, data) : undefined,
        text: template.text ? render(template.text, data) : undefined
      };

      return rendered;
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      throw error;
    }
  }

  _getPriorityHeader(priority) {
    const priorities = {
      high: '1',
      normal: '3',
      low: '5'
    };
    return priorities[priority] || priorities.normal;
  }

  _generateTrackingId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async _logEmailSent(data) {
    try {
      // Implementar logging a la base de datos o sistema de monitoreo
      logger.info('Email sent successfully:', {
        to: data.to,
        subject: data.subject,
        trackingId: data.headers['X-Tracking-ID'],
        provider: data.provider,
        attempt: data.attempt
      });
    } catch (error) {
      logger.error('Error logging email sent:', error);
    }
  }

  async _logEmailError(data) {
    try {
      // Implementar logging a la base de datos o sistema de monitoreo
      logger.error('Email sending failed:', {
        to: data.to,
        subject: data.subject,
        error: data.error.message,
        provider: data.provider,
        attempts: data.attempts
      });
    } catch (error) {
      logger.error('Error logging email error:', error);
    }
  }
}

module.exports = new EmailService();