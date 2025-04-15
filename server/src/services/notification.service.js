const Domain = require('../models/Domain');
const Client = require('../models/Client');
const Queue = require('../config/queue');
const emailService = require('./email.service');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/crypto');

class NotificationService {
  constructor() {
    // Vincular métodos para preservar el contexto
    this.notifyChanges = this.notifyChanges.bind(this);
    this.notifyConsentEvent = this.notifyConsentEvent.bind(this);
    this.notifySystemAlert = this.notifySystemAlert.bind(this);
    this._sendEmailNotification = this._sendEmailNotification.bind(this);
    this._sendWebhookNotification = this._sendWebhookNotification.bind(this);
    this._createInAppNotification = this._createInAppNotification.bind(this);
    this._processConsentNotification = this._processConsentNotification.bind(this);
    this._hasSignificantChanges = this._hasSignificantChanges.bind(this);
    this._prepareEmailTemplateData = this._prepareEmailTemplateData.bind(this);
    this._prepareWebhookPayload = this._prepareWebhookPayload.bind(this);
    this._generateSignature = this._generateSignature.bind(this);
    this._generateNotificationMessage = this._generateNotificationMessage.bind(this);
    this._getQueueNameBySeverity = this._getQueueNameBySeverity.bind(this);
    this._logWebhookError = this._logWebhookError.bind(this);
    this._sendConsentEmail = this._sendConsentEmail.bind(this);
    this._sendConsentWebhook = this._sendConsentWebhook.bind(this);
    this._createConsentInAppNotification = this._createConsentInAppNotification.bind(this);
  }

  async notifyChanges(scan) {
    try {
      const domain = await Domain.findById(scan.domainId)
        .populate('clientId');

      if (!domain) {
        throw new Error('Domain not found');
      }

      // Verificar si hay cambios significativos
      if (this._hasSignificantChanges(scan.findings)) {
        // Notificar por email
        await this._sendEmailNotification(domain, scan);

        // Notificar por webhook si está configurado
        await this._sendWebhookNotification(domain, scan);

        // Crear notificación in-app usando la cola "notification"
        await this._createInAppNotification(domain, scan);
      }
    } catch (error) {
      logger.error('Error notifying changes:', error);
      throw error;
    }
  }

  async notifyConsentEvent(consentData) {
    try {
      const { domainId, type, data } = consentData;

      const domain = await Domain.findById(domainId)
        .populate('clientId');

      if (!domain) {
        throw new Error('Domain not found');
      }

      if (domain.settings?.notifications?.consent?.[type]) {
        await this._processConsentNotification(domain, type, data);
      }
    } catch (error) {
      logger.error('Error notifying consent event:', error);
      throw error;
    }
  }

  async notifySystemAlert(alert) {
    try {
      const {
        type,
        severity,
        message,
        details,
        clientId
      } = alert;

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      const queueName = this._getQueueNameBySeverity(severity);
      await Queue.addJob(queueName, {
        type,
        message,
        details,
        clientId,
        notificationPreferences: client.settings?.notifications
      });
    } catch (error) {
      logger.error('Error notifying system alert:', error);
      throw error;
    }
  }

  // Métodos privados

  async _sendEmailNotification(domain, data) {
    const emailConfig = domain.settings?.notifications?.email;
    if (!emailConfig?.enabled) return;

    const recipients = emailConfig.recipients || [domain.clientId.email];
    const templateData = this._prepareEmailTemplateData(domain, data);

    await emailService.sendTemplateEmail({
      template: 'cookie-changes',
      recipients,
      data: templateData
    });
  }

  async _sendWebhookNotification(domain, data) {
    const webhooks = domain.settings?.notifications?.webhooks || [];
    
    for (const webhook of webhooks) {
      if (!webhook.enabled) continue;

      try {
        const payload = this._prepareWebhookPayload(domain, data);
        const secret = decrypt(webhook.secret);

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': this._generateSignature(payload, secret)
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        logger.error(`Error sending webhook to ${webhook.url}:`, error);
        // Registrar error pero continuar con otros webhooks
        await this._logWebhookError(domain, webhook, error);
      }
    }
  }

  async _createInAppNotification(domain, data) {
    const notification = {
      type: 'cookie_changes',
      clientId: domain.clientId._id,
      domainId: domain._id,
      title: 'Cambios detectados en cookies',
      message: this._generateNotificationMessage(data),
      data: {
        scanId: data._id,
        changes: data.findings.changes
      },
      status: 'unread',
      createdAt: new Date()
    };
  
    // Se usa "notification" (en singular) para que la función addJob encuentre notificationQueue
    await Queue.addJob('notification', {
      type: 'in_app',
      notification
    });
  }

  async _processConsentNotification(domain, type, data) {
    const notificationData = {
      type,
      domain: domain.domain,
      timestamp: new Date(),
      ...data
    };

    const notifications = domain.settings.notifications.consent[type];

    if (notifications.email) {
      await this._sendConsentEmail(domain, notificationData);
    }

    if (notifications.webhook) {
      await this._sendConsentWebhook(domain, notificationData);
    }

    if (notifications.inApp) {
      await this._createConsentInAppNotification(domain, notificationData);
    }
  }

  _hasSignificantChanges(findings) {
    return (
      findings.changes.newCookies.length > 0 ||
      findings.changes.modifiedCookies.length > 0 ||
      findings.changes.removedCookies.length > 0
    );
  }

  _prepareEmailTemplateData(domain, data) {
    return {
      domain: domain.domain,
      changes: {
        new: data.findings.changes.newCookies.length,
        modified: data.findings.changes.modifiedCookies.length,
        removed: data.findings.changes.removedCookies.length
      },
      scanDate: data.createdAt,
      detailsUrl: `${process.env.DASHBOARD_URL}/domains/${domain._id}/scans/${data._id}`
    };
  }

  _prepareWebhookPayload(domain, data) {
    return {
      event: 'cookie_scan_completed',
      domain: domain.domain,
      scanId: data._id,
      timestamp: new Date().toISOString(),
      findings: data.findings,
      stats: data.stats
    };
  }

  _generateSignature(payload, secret) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(JSON.stringify(payload)).digest('hex');
  }

  _generateNotificationMessage(data) {
    const { newCookies, modifiedCookies, removedCookies } = data.findings.changes;
    const parts = [];

    if (newCookies.length > 0) {
      parts.push(`${newCookies.length} nuevas cookies detectadas`);
    }
    if (modifiedCookies.length > 0) {
      parts.push(`${modifiedCookies.length} cookies modificadas`);
    }
    if (removedCookies.length > 0) {
      parts.push(`${removedCookies.length} cookies eliminadas`);
    }

    return parts.join(', ');
  }

  _getQueueNameBySeverity(severity) {
    const queueMap = {
      critical: 'high_priority_notifications',
      high: 'high_priority_notifications',
      medium: 'normal_priority_notifications',
      low: 'low_priority_notifications'
    };

    return queueMap[severity] || 'normal_priority_notifications';
  }

  async _logWebhookError(domain, webhook, error) {
    // Si no tienes una cola para errores, puedes encolar en export o crear una nueva cola en queue.js
    await Queue.addJob('error_logs', {
      type: 'webhook_error',
      domainId: domain._id,
      webhookUrl: webhook.url,
      error: error.message,
      timestamp: new Date()
    });
  }

  async _sendConsentEmail(domain, data) {
    const emailConfig =
      domain.settings?.notifications?.consent?.[data.type]?.email || { recipients: [domain.clientId?.email || 'noreply@example.com'] };

    const recipients = emailConfig.recipients || [domain.clientId?.email || 'noreply@example.com'];

    const templateData = {
      domain: domain.domain,
      consentType: data.type,
      timestamp: data.timestamp,
      ...data
    };

    await emailService.sendTemplateEmail({
      template: 'consent-event',
      to: recipients,
      subject: `Evento de consentimiento: ${data.type}`,
      data: templateData
    });
  }

  async _sendConsentWebhook(domain, data) {
    const webhooks = domain.settings?.notifications?.webhooks || [];
    
    for (const webhook of webhooks) {
      if (!webhook.enabled) continue;

      try {
        const payload = {
          event: 'consent_event',
          consentType: data.type,
          domain: domain.domain,
          timestamp: data.timestamp,
          ...data
        };

        const secret = decrypt(webhook.secret);

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': this._generateSignature(payload, secret)
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        logger.error(`Error sending consent webhook to ${webhook.url}:`, error);
        await this._logWebhookError(domain, webhook, error);
      }
    }
  }

  async _createConsentInAppNotification(domain, data) {
    const notification = {
      type: 'consent_event',
      clientId: domain.clientId ? domain.clientId._id : null,
      domainId: domain._id,
      title: `Evento de consentimiento: ${data.type}`,
      message: `Se ha registrado un evento de consentimiento en el dominio ${domain.domain}.`,
      data,
      status: 'unread',
      createdAt: new Date()
    };

    await Queue.addJob('notification', {
      type: 'consent_event',
      data: notification
    });
  }
}

module.exports = new NotificationService();
