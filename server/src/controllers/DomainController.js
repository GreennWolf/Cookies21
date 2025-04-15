const Domain = require('../models/Domain');
const Client = require('../models/Client');
const BannerTemplate = require('../models/BannerTemplate');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { validateDomain } = require('../utils/domainValidator');
const auditService = require('../services/audit.service');

class DomainController {
  // Crear nuevo dominio
  createDomain = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { domain, settings } = req.body;

    console.log(clientId , domain,settings)

    // Validar formato del dominio
    if (!validateDomain(domain)) {
      throw new AppError('Invalid domain format', 400);
    }

    // Verificar si el dominio ya existe
    const existingDomain = await Domain.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) {
      throw new AppError('Domain already registered', 400);
    }

    // Verificar límites de suscripción
    const client = await Client.findById(clientId);
    const subscriptionLimits = await client.checkSubscriptionLimits();
    
    if (!subscriptionLimits.canAddMoreDomains) {
      throw new AppError(
        'Domain limit reached for your subscription. Please upgrade your plan.',
        403
      );
    }

    // Crear dominio
    const newDomain = await Domain.create({
      clientId,
      domain: domain.toLowerCase(),
      settings: {
        ...settings,
        design: settings?.design || {},
        scanning: {
          enabled: true,
          interval: 24, // Default 24 hours
          ...settings?.scanning
        }
      },
      status: 'pending'
    });

    // Iniciar verificación de dominio (async)
    // await verifyDomainOwnership(newDomain);

    res.status(201).json({
      status: 'success',
      data: { domain: newDomain }
    });
  });

  // Obtener dominios del cliente
  getDomains = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { status, search } = req.query;

    const query = { clientId };
    if (status) query.status = status;
    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    const domains = await Domain.find(query).sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: { domains }
    });
  });

  // Obtener dominio específico
  getDomain = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const domain = await Domain.findOne({
      _id: id,
      clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { domain }
    });
  });

  // Actualizar configuración de dominio
  updateDomain = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const updates = req.body;

    // Campos no actualizables
    delete updates.domain;
    delete updates.clientId;
    delete updates.status;

    const domain = await Domain.findOneAndUpdate(
      { _id: id, clientId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { domain }
    });
  });

  // Actualizar configuración del banner
  updateBannerConfig = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { bannerConfig } = req.body;

    const domain = await Domain.findOne({ _id: id, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    domain.bannerConfig = {
      ...domain.bannerConfig,
      ...bannerConfig
    };

    await domain.save();

    res.status(200).json({
      status: 'success',
      data: { 
        bannerConfig: domain.bannerConfig 
      }
    });
  });

  // Actualizar estado del dominio
  updateDomainStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { status } = req.body;

    if (!['active', 'inactive', 'pending'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const domain = await Domain.findOneAndUpdate(
      { _id: id, clientId },
      { status },
      { new: true }
    );

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { domain }
    });
  });

  // Verificar propiedad del dominio
  verifyDomainOwnership = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const domain = await Domain.findOne({ _id: id, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Iniciar proceso de verificación
    const verificationResult = await verifyDomainOwnership(domain);

    if (verificationResult.verified) {
      domain.status = 'active';
      await domain.save();
    }

    res.status(200).json({
      status: 'success',
      data: { 
        verified: verificationResult.verified,
        method: verificationResult.method,
        details: verificationResult.details
      }
    });
  });

  // Eliminar dominio
  deleteDomain = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const domain = await Domain.findOneAndDelete({ _id: id, clientId });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Eliminar datos relacionados (cookies, consentimientos, etc.)
    // await cleanupDomainData(id);

    res.status(200).json({
      status: 'success',
      message: 'Domain deleted successfully'
    });
  });

  setDefaultBannerTemplate = catchAsync(async (req, res) => {
    const { domainId, templateId } = req.params;
    const { clientId } = req;
  
    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId
    });
  
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }
  
    // Verificar que la plantilla existe
    const template = await BannerTemplate.findOne({
      _id: templateId,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });
  
    if (!template) {
      throw new AppError('Banner template not found', 404);
    }
  
    // Inicializar settings si no existe
    if (!domain.settings) {
      domain.settings = {};
    }
  
    // Actualizar el defaultTemplateId
    domain.settings.defaultTemplateId = templateId;
    
    // Guardar cambios
    await domain.save();
  
    // Registrar auditoría si existe el servicio
    try {
      if (auditService && typeof auditService.logAction === 'function') {
        await auditService.logAction({
          clientId,
          userId: req.userId,
          action: 'update',
          resourceType: 'domain',
          resourceId: domain._id,
          metadata: {
            status: 'success',
            operation: 'setDefaultBannerTemplate'
          },
          context: {
            domainId: domain._id,
            templateId
          }
        });
      }
    } catch (error) {
      // Log error pero no fallar la operación principal
      console.error('Error registrando auditoría:', error);
    }
  
    res.status(200).json({
      status: 'success',
      data: {
        domain: {
          _id: domain._id,
          domain: domain.domain,
          settings: {
            defaultTemplateId: domain.settings.defaultTemplateId
          }
        }
      }
    });
  });
}

module.exports = new DomainController();