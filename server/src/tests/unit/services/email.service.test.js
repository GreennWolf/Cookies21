// tests/unit/services/email.service.test.js
const emailService = require('../../../services/email.service');
const logger = require('../../../utils/logger');
const { render } = require('ejs');
const path = require('path');
const fs = require('fs').promises; // Usamos fs.promises
const nodemailer = require('nodemailer');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

jest.mock('../../../utils/logger');
jest.mock('ejs');
jest.mock('fs').promises;
jest.mock('nodemailer');
jest.mock('@aws-sdk/client-ses');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Para la mayoría de los tests se usa un spy en sendTemplateEmail
    jest.spyOn(emailService, 'sendTemplateEmail').mockResolvedValue({ messageId: 'mock-id' });
    // Configuramos fs.readFile como función mock
    fs.readFile = jest.fn();
  });

  describe('sendEmail', () => {
    test('debería enviar email exitosamente', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test content',
        html: '<p>Test content</p>'
      };

      const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
      };

      // Configuramos el spy para providers.smtp.createTransport
      jest.spyOn(emailService.providers.smtp, 'createTransport')
        .mockReturnValue(mockTransport);

      const result = await emailService.sendEmail(emailData);

      expect(mockTransport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html
        })
      );
      expect(result).toEqual({ messageId: 'mock-id' });
    });

    test('debería reintentar en caso de error', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      const mockTransport = {
        sendMail: jest.fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValueOnce({ messageId: 'mock-id' })
      };

      jest.spyOn(emailService.providers.smtp, 'createTransport')
        .mockReturnValue(mockTransport);

      const result = await emailService.sendEmail(emailData);

      expect(mockTransport.sendMail).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ messageId: 'mock-id' });
    });
  });

  describe('sendTemplateEmail', () => {
    // Restauramos la implementación real para este bloque de pruebas
    beforeEach(() => {
      jest.restoreAllMocks();
      // Configuramos fs.readFile como función mock
      fs.readFile = jest.fn();
      // Se configura el provider SMTP para que al enviar email se use un transport mockeado
      jest.spyOn(emailService.providers.smtp, 'createTransport').mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
      });
    });

    test('debería enviar email con plantilla', async () => {
      const templateData = {
        template: 'welcome',
        data: { name: 'Test User' },
        to: 'test@example.com',
        subject: 'Welcome'
      };

      const mockTemplate = {
        html: '<h1>Welcome <%= name %></h1>',
        text: 'Welcome <%= name %>'
      };

      // Simulamos la lectura de archivos de plantilla: primero el HTML y luego el texto.
      fs.readFile
        .mockResolvedValueOnce(mockTemplate.html)
        .mockResolvedValueOnce(mockTemplate.text);

      // Configuramos render para que devuelva el contenido renderizado
      render.mockReturnValue('Rendered content');

      // Al usar la implementación real de sendTemplateEmail, se ejecuta _renderTemplate y luego sendEmail
      const result = await emailService.sendTemplateEmail(templateData);

      expect(render).toHaveBeenCalledWith(
        mockTemplate.html,
        templateData.data
      );
      // Como sendTemplateEmail llama internamente a sendEmail (que en este test devuelve { messageId: 'mock-id' }),
      // esperamos ese resultado.
      expect(result).toEqual({ messageId: 'mock-id' });
    });
  });

  describe('sendBulkEmail', () => {
    test('debería enviar emails en lote', async () => {
      const bulkData = {
        recipients: [
          { email: 'user1@test.com', data: { name: 'User 1' } },
          { email: 'user2@test.com', data: { name: 'User 2' } }
        ],
        template: 'welcome',
        baseData: { company: 'Test Co' },
        subject: 'Welcome'
      };

      // La función sendTemplateEmail ya está espiada y retorna { messageId: 'mock-id' }
      const result = await emailService.sendBulkEmail(bulkData);

      expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(2);
      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
    });
  });

  describe('sendCookieChangeNotification', () => {
    test('debería enviar notificación de cambios en cookies', async () => {
      const options = {
        domain: 'test.com',
        changes: {
          newCookies: [{ name: '_ga' }],
          modifiedCookies: [],
          removedCookies: []
        },
        recipients: ['admin@test.com'],
        scanDate: new Date()
      };

      await emailService.sendCookieChangeNotification(options);

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
        template: 'cookie-changes',
        to: options.recipients,
        subject: `Cookie Changes Detected - ${options.domain}`,
        data: expect.any(Object)
      });
    });
  });

  describe('sendWelcomeEmail', () => {
    test('debería enviar email de bienvenida', async () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await emailService.sendWelcomeEmail(user);

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
        template: 'welcome',
        to: user.email,
        subject: 'Welcome to CMP System',
        data: expect.objectContaining({
          name: user.name
        })
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    test('debería enviar email de reset de password', async () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User'
      };
      const token = 'reset-token';

      await emailService.sendPasswordResetEmail(user, token);

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
        template: 'password-reset',
        to: user.email,
        subject: 'Password Reset Request',
        data: expect.objectContaining({
          name: user.name,
          resetUrl: expect.stringContaining(token)
        })
      });
    });
  });

  describe('_logEmailSent', () => {
    test('debería registrar email enviado exitosamente', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test',
        headers: {
          'X-Tracking-ID': '123'
        },
        provider: 'smtp',
        attempt: 1
      };

      await emailService._logEmailSent(emailData);

      expect(logger.info).toHaveBeenCalledWith(
        'Email sent successfully:',
        {
          to: emailData.to,
          subject: emailData.subject,
          trackingId: emailData.headers['X-Tracking-ID'],
          provider: emailData.provider,
          attempt: emailData.attempt
        }
      );
    });
  });

  describe('_logEmailError', () => {
    test('debería registrar error de envío', async () => {
      const errorData = {
        to: 'test@example.com',
        subject: 'Test',
        error: new Error('Send failed'),
        provider: 'smtp',
        attempts: 3
      };

      await emailService._logEmailError(errorData);

      expect(logger.error).toHaveBeenCalledWith(
        'Email sending failed:',
        {
          to: errorData.to,
          subject: errorData.subject,
          error: 'Send failed',
          provider: errorData.provider,
          attempts: errorData.attempts
        }
      );
    });
  });

  describe('_getPriorityHeader', () => {
    test('debería retornar header de prioridad correcto', () => {
      // Llamamos a la función usando bind para asegurar el contexto
      const getPriority = emailService._getPriorityHeader.bind(emailService);
      expect(getPriority('high')).toBe('1');
      expect(getPriority('normal')).toBe('3');
      expect(getPriority('low')).toBe('5');
      expect(getPriority('invalid')).toBe('3');
    });
  });

  describe('_generateTrackingId', () => {
    test('debería generar ID de tracking único', () => {
      // Usamos bind para asegurar el contexto
      const generateTrackingId = emailService._generateTrackingId.bind(emailService);
      const id1 = generateTrackingId();
      const id2 = generateTrackingId();

      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
