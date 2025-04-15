const Domain = require('../models/Domain');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { validateGoogleConfig } = require('../services/google.service');
const { validateIABConfig } = require('../services/iab.service');
const { encryptCredentials, decryptCredentials } = require('../utils/crypto');

class IntegrationController {
  // Google Analytics Integration
  configureGoogleAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { measurementId, config } = req.body;
    const { clientId } = req;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Validar configuración con Google
    const validationResult = await validateGoogleConfig({
      measurementId,
      ...config
    });

    if (!validationResult.isValid) {
      throw new AppError(`Invalid Google Analytics configuration: ${validationResult.errors.join(', ')}`, 400);
    }

    // Actualizar configuración del dominio
    await Domain.findByIdAndUpdate(domainId, {
      'integrations.googleAnalytics': {
        enabled: true,
        measurementId,
        config: {
          ...config,
          credentials: encryptCredentials(config.credentials)
        },
        lastVerified: new Date()
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Google Analytics configuration updated successfully'
    });
  });

  // Google Tag Manager Integration
  configureGTM = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { containerId, config } = req.body;
    const { clientId } = req;

    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Validar configuración GTM
    const validationResult = await validateGoogleConfig({
      containerId,
      ...config
    });

    if (!validationResult.isValid) {
      throw new AppError(`Invalid GTM configuration: ${validationResult.errors.join(', ')}`, 400);
    }

    await Domain.findByIdAndUpdate(domainId, {
      'integrations.gtm': {
        enabled: true,
        containerId,
        config,
        lastVerified: new Date()
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'GTM configuration updated successfully'
    });
  });

  // IAB Integration
  configureIAB = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { cmpId, config } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Validar configuración IAB
    const validationResult = await validateIABConfig({
      cmpId,
      ...config
    });

    if (!validationResult.isValid) {
      throw new AppError(`Invalid IAB configuration: ${validationResult.errors.join(', ')}`, 400);
    }

    await Client.findByIdAndUpdate(clientId, {
      'integrations.iab': {
        enabled: true,
        cmpId,
        config,
        lastVerified: new Date()
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'IAB configuration updated successfully'
    });
  });

  // Webhook Configuration
  configureWebhook = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { url, events, secret, config } = req.body;
    const { clientId } = req;

    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar URL del webhook
    try {
      const testResult = await this._testWebhook(url, secret);
      if (!testResult.success) {
        throw new AppError('Webhook test failed: ' + testResult.error, 400);
      }
    } catch (error) {
      throw new AppError('Failed to verify webhook URL: ' + error.message, 400);
    }

    // Asegurarse de que integrations existe
    await Domain.updateOne(
      { _id: domainId }, 
      { $setOnInsert: { integrations: { webhooks: [] } } },
      { upsert: true }
    );

    await Domain.findByIdAndUpdate(domainId, {
      $push: {
        'integrations.webhooks': {
          url,
          events,
          secret: encryptCredentials(secret),
          config,
          status: 'active',
          createdAt: new Date()
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Webhook configured successfully'
    });
  });

  // Obtener estado de integraciones
  getIntegrationStatus = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { clientId } = req;

    const domain = await Domain.findOne({ 
      _id: domainId, 
      clientId 
    }).select('integrations');

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Asegurar que domain.integrations existe
    const integrations = domain.integrations || {};

    // Verificar estado de cada integración
    const status = {
      googleAnalytics: await this._checkIntegrationStatus(
        integrations.googleAnalytics
      ),
      gtm: await this._checkIntegrationStatus(
        integrations.gtm
      ),
      iab: await this._checkIntegrationStatus(
        integrations.iab
      ),
      webhooks: await Promise.all(
        (integrations.webhooks || []).map(
          webhook => this._checkWebhookStatus(webhook)
        )
      )
    };

    res.status(200).json({
      status: 'success',
      data: { status }
    });
  });

  // Probar webhooks
  testWebhook = catchAsync(async (req, res) => {
    const { url, secret } = req.body;

    const testResult = await this._testWebhook(url, secret);

    res.status(200).json({
      status: 'success',
      data: { 
        success: testResult.success,
        latency: testResult.latency,
        error: testResult.error
      }
    });
  });

  // Métodos privados
  async _testWebhook(url, secret) {
    try {
      const startTime = Date.now();
      // Implementar prueba de webhook
      // Aquí se debería enviar una solicitud de prueba al webhook
      // y verificar la respuesta
      
      // Por ahora, simulamos una respuesta exitosa
      const endTime = Date.now();
      return {
        success: true,
        latency: endTime - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error desconocido'
      };
    }
  }

  async _checkIntegrationStatus(integration) {
    if (!integration || !integration.enabled) {
      return {
        enabled: false,
        status: 'disabled'
      };
    }

    try {
      // Implementar verificación específica según el tipo de integración
      // Por ahora, simplemente devolvemos que está activa
      return {
        enabled: true,
        status: 'active',
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        enabled: true,
        status: 'error',
        error: error.message || 'Error desconocido',
        lastChecked: new Date()
      };
    }
  }

  async _checkWebhookStatus(webhook) {
    if (!webhook) {
      return {
        status: 'unknown',
        lastChecked: new Date()
      };
    }
    
    try {
      const testResult = await this._testWebhook(
        webhook.url,
        webhook.secret ? decryptCredentials(webhook.secret) : ''
      );

      return {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events || [],
        status: testResult.success ? 'active' : 'error',
        lastChecked: new Date(),
        error: testResult.error
      };
    } catch (error) {
      return {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events || [],
        status: 'error',
        lastChecked: new Date(),
        error: error.message || 'Error desconocido'
      };
    }
  }
}

module.exports = new IntegrationController();