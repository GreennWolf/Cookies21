// tests/unit/services/notification.service.test.js

const notificationService = require('../../../services/notification.service');
const Domain = require('../../../models/Domain');
const Client = require('../../../models/Client');
const Queue = require('../../../config/queue');
const emailService = require('../../../services/email.service');
const logger = require('../../../utils/logger');
const { decrypt } = require('../../../utils/crypto');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mocks de los módulos
jest.mock('../../../models/Domain');
jest.mock('../../../models/Client');
jest.mock('../../../config/queue');
jest.mock('../../../services/email.service');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/crypto');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Definir Queue.add como función mock para simular encolar trabajos
    Queue.add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
  });

  describe('notifyChanges', () => {
    test('debería notificar cambios significativos', async () => {
      const mockScan = {
        domainId: 'mock-domain-id',
        findings: {
          changes: {
            newCookies: [{ name: '_ga' }],
            modifiedCookies: [],
            removedCookies: []
          }
        },
        createdAt: new Date()
      };

      const mockDomain = {
        _id: 'mock-domain-id',
        domain: 'test.com',
        clientId: {
          _id: 'mock-client-id',
          email: 'test@example.com'
        },
        settings: {
          notifications: {
            email: {
              enabled: true,
              recipients: ['admin@test.com']
            },
            webhooks: []
          }
        }
      };

      // Simular findById(...).populate(...) de forma encadenable
      Domain.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockDomain)
      }));

      await notificationService.notifyChanges(mockScan);

      // Verificar que se haya llamado a enviar email (por ejemplo, a través de emailService)
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'cookie-changes',
          data: expect.objectContaining({
            domain: mockDomain.domain
          })
        })
      );
    });

    test('no debería notificar si no hay cambios significativos', async () => {
      const mockScan = {
        domainId: 'mock-domain-id',
        findings: {
          changes: {
            newCookies: [],
            modifiedCookies: [],
            removedCookies: []
          }
        },
        createdAt: new Date()
      };

      const mockDomain = {
        _id: 'mock-domain-id',
        domain: 'test.com'
      };

      Domain.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockDomain)
      }));

      await notificationService.notifyChanges(mockScan);

      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe('notifyConsentEvent', () => {
    test('debería notificar eventos de consentimiento configurados', async () => {
      const consentData = {
        domainId: 'mock-domain-id',
        type: 'revoke',
        data: {
          userId: 'user-123',
          timestamp: new Date()
        }
      };

      const mockDomain = {
        _id: 'mock-domain-id',
        domain: 'test.com',
        settings: {
          notifications: {
            consent: {
              revoke: {
                email: true,
                webhook: true,
                inApp: true
              }
            }
          }
        }
      };

      Domain.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockDomain)
      }));

      await notificationService.notifyConsentEvent(consentData);

      expect(Queue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'consent_event',
          data: expect.any(Object)
        })
      );
    });
  });

  describe('notifySystemAlert', () => {
    test('debería encolar alerta del sistema según severidad', async () => {
      const alert = {
        type: 'error',
        severity: 'high',
        message: 'Critical system error',
        details: { code: 'ERR_001' },
        clientId: 'mock-client-id'
      };

      const mockClient = {
        _id: 'mock-client-id',
        settings: {
          notifications: {
            email: true,
            severity: ['high', 'critical']
          }
        }
      };

      Client.findById.mockResolvedValue(mockClient);

      await notificationService.notifySystemAlert(alert);

      expect(Queue.add).toHaveBeenCalledWith(
        'high_priority_notifications',
        expect.objectContaining({
          type: alert.type,
          message: alert.message,
          details: alert.details,
          clientId: alert.clientId,
          notificationPreferences: mockClient.settings.notifications
        })
      );
    });

    test('debería manejar diferentes niveles de severidad', async () => {
      const lowAlert = {
        type: 'warning',
        severity: 'low',
        message: 'Minor warning',
        clientId: 'mock-client-id'
      };

      const mockClient = {
        _id: 'mock-client-id',
        settings: {
          notifications: {
            email: true,
            severity: ['low', 'medium', 'high']
          }
        }
      };

      Client.findById.mockResolvedValue(mockClient);

      await notificationService.notifySystemAlert(lowAlert);

      expect(Queue.add).toHaveBeenCalledWith(
        'low_priority_notifications',
        expect.any(Object)
      );
    });
  });

  describe('_sendEmailNotification', () => {
    test('debería enviar notificación por email si está habilitado', async () => {
      const mockDomain = {
        domain: 'test.com',
        settings: {
          notifications: {
            email: {
              enabled: true,
              recipients: ['admin@test.com']
            }
          }
        },
        clientId: {
          email: 'owner@test.com'
        }
      };

      const mockScanData = {
        _id: 'scan-123',
        createdAt: new Date(),
        findings: {
          changes: {
            newCookies: [{ name: '_ga' }],
            modifiedCookies: [],
            removedCookies: []
          }
        }
      };

      await notificationService._sendEmailNotification(mockDomain, mockScanData);

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'cookie-changes',
          recipients: mockDomain.settings.notifications.email.recipients,
          data: expect.objectContaining({
            domain: mockDomain.domain,
            changes: expect.any(Object)
          })
        })
      );
    });

    test('no debería enviar email si las notificaciones están deshabilitadas', async () => {
      const mockDomain = {
        domain: 'test.com',
        settings: {
          notifications: {
            email: {
              enabled: false
            }
          }
        }
      };

      const mockData = {
        findings: {
          changes: {
            newCookies: [],
            modifiedCookies: [],
            removedCookies: []
          }
        }
      };

      await notificationService._sendEmailNotification(mockDomain, mockData);

      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe('_sendWebhookNotification', () => {
    test('debería enviar notificación a todos los webhooks configurados', async () => {
      const mockDomain = {
        domain: 'test.com',
        settings: {
          notifications: {
            webhooks: [
              {
                enabled: true,
                url: 'https://webhook1.test.com',
                secret: 'encrypted-secret-1'
              },
              {
                enabled: true,
                url: 'https://webhook2.test.com',
                secret: 'encrypted-secret-2'
              }
            ]
          }
        }
      };

      const mockData = {
        _id: 'scan-123',
        findings: {
          changes: {
            newCookies: [{ name: '_ga' }],
            modifiedCookies: [],
            removedCookies: []
          }
        },
        stats: {
          totalCookies: 10
        }
      };

      decrypt.mockImplementation(secret => `decrypted-${secret}`);
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await notificationService._sendWebhookNotification(mockDomain, mockData);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook1.test.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });

    test('debería manejar errores de webhooks individuales', async () => {
      const mockDomain = {
        domain: 'test.com',
        _id: 'domain-123',
        settings: {
          notifications: {
            webhooks: [
              {
                enabled: true,
                url: 'https://webhook-error.test.com',
                secret: 'encrypted-secret'
              }
            ]
          }
        }
      };

      const mockData = {
        findings: {
          changes: {
            newCookies: [],
            modifiedCookies: [],
            removedCookies: []
          }
        },
        stats: {}
      };

      decrypt.mockImplementation(secret => `decrypted-${secret}`);
      global.fetch = jest.fn().mockRejectedValue(new Error('Webhook failed'));

      await notificationService._sendWebhookNotification(mockDomain, mockData);

      expect(Queue.add).toHaveBeenCalledWith(
        'error_logs',
        expect.objectContaining({
          type: 'webhook_error'
        })
      );
    });
  });

  describe('_createInAppNotification', () => {
    test('debería crear notificación in-app', async () => {
      const mockDomain = {
        _id: 'domain-123',
        domain: 'test.com',
        clientId: {
          _id: 'client-123'
        }
      };

      const mockData = {
        _id: 'scan-123',
        findings: {
          changes: {
            newCookies: [{ name: '_ga' }],
            modifiedCookies: [{ name: '_gid' }],
            removedCookies: []  // Se incluye removedCookies para evitar error
          }
        }
      };

      await notificationService._createInAppNotification(mockDomain, mockData);

      expect(Queue.add).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          type: 'in_app',
          notification: expect.objectContaining({
            type: 'cookie_changes',
            clientId: mockDomain.clientId._id,
            domainId: mockDomain._id,
            status: 'unread'
          })
        })
      );
    });
  });
});
