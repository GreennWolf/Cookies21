const Domain = require('../models/Domain');
const Client = require('../models/Client');
const BannerTemplate = require('../models/BannerTemplate');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { validateDomain } = require('../utils/domainValidator');
const auditService = require('../services/audit.service');
const { domainAnalysisScheduler } = require('../jobs/scheduledTasks');

class DomainController {
  // Crear nuevo dominio
  createDomain = catchAsync(async (req, res) => {
    let targetClientId = req.clientId;
    const { domain, settings, clientId: requestedClientId } = req.body;
    
    console.log('Domain creation request:', {
      targetClientId,
      requestedClientId,
      domain,
      isOwner: req.isOwner,
      requestBody: req.body
    });

    // Si el usuario es owner y se proporcionó un clientId específico, usarlo
    if (req.isOwner && requestedClientId) {
      targetClientId = requestedClientId;
      console.log('Using requested clientId from owner:', targetClientId);
    } else if (requestedClientId) {
      // Si no es owner pero se proporciona clientId, registrar pero usar el del token
      console.log('Non-owner provided clientId. Using token clientId instead:', targetClientId);
    }

    // Validar formato del dominio
    if (!validateDomain(domain)) {
      throw new AppError('Invalid domain format', 400);
    }

    // Verificar si el dominio ya existe
    const existingDomain = await Domain.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) {
      // En lugar de rechazar, actualizar el dominio existente con la nueva configuración
      console.log(`🔄 Dominio ${domain} ya registrado con ID ${existingDomain._id}. Actualizando configuración.`);
      
      // Si se proporciona defaultTemplateId en settings, actualizar
      if (settings && settings.defaultTemplateId) {
        console.log(`🎨 Actualizando defaultTemplateId a: ${settings.defaultTemplateId}`);
        
        // Inicializar settings si no existe
        if (!existingDomain.settings) {
          existingDomain.settings = {};
        }
        
        // Asignar el template ID
        existingDomain.settings.defaultTemplateId = settings.defaultTemplateId;
        
        // Actualizar cualquier otra configuración proporcionada
        if (settings.design) existingDomain.settings.design = settings.design;
        if (settings.scanning) existingDomain.settings.scanning = settings.scanning;
        
        // Actualizar estado si se proporciona
        if (req.body.status) {
          existingDomain.status = req.body.status;
        }
        
        // Guardar los cambios
        await existingDomain.save();
        
        return res.status(200).json({
          status: 'success',
          message: 'Domain settings updated successfully',
          data: { domain: existingDomain }
        });
      }
      
      // Si no hay defaultTemplateId, mantener el comportamiento actual
      throw new AppError('Domain already registered', 400);
    }

    // Verificar que el cliente existe - Asegurar que el ID tenga formato correcto
    let client;
    try {
      const mongoose = require('mongoose');
      
      // Depurar valor original recibido
      console.log('Target clientId (original):', targetClientId, 'type:', typeof targetClientId);
      
      // Manejar diferentes formatos de ID
      // 1. Si el ID es un objeto con propiedad _id o id
      if (typeof targetClientId === 'object' && targetClientId !== null) {
        if (targetClientId._id) {
          targetClientId = targetClientId._id;
        } else if (targetClientId.id) {
          targetClientId = targetClientId.id;
        }
      }
      
      // Convertir explícitamente a string para manejar casos especiales
      const clientIdStr = String(targetClientId).trim();
      
      console.log('Client ID after extraction:', clientIdStr, 'type:', typeof clientIdStr);
      
      let clientId;
      
      // Validar si es un ObjectId válido o intentar buscar por otros campos
      if (mongoose.Types.ObjectId.isValid(clientIdStr)) {
        clientId = clientIdStr;
        console.log('Using valid ObjectId:', clientId);
        
        // Intentar buscar por _id
        client = await Client.findById(clientId);
      } 
      
      // Si no se encontró cliente y tiene formato de ID pero no ObjectId, intentar buscar por id
      if (!client && clientIdStr && clientIdStr.length > 8) {
        console.log('Attempting to find client by alternate id field:', clientIdStr);
        client = await Client.findOne({ id: clientIdStr });
      }
      
      // Si aún no se encuentra, verificar si hay otros campos que coincidan
      if (!client && clientIdStr && clientIdStr.length > 3) {
        console.log('Last attempt - searching by name or email:', clientIdStr);
        client = await Client.findOne({
          $or: [
            { name: clientIdStr },
            { email: clientIdStr },
            { contactEmail: clientIdStr }
          ]
        });
      }
      
      // Si después de todos los intentos no hay cliente, lanzar error
      if (!client) {
        console.error(`Client not found with ID or identifiers related to: ${clientIdStr}`);
        throw new AppError('Client not found', 404);
      }
      
      console.log('Found client:', client.name, 'with ID:', client._id);
    } catch (error) {
      console.error('Error verifying client:', error);
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError('Error processing client ID', 500);
      }
    }

    // Solo verificar límites si no es owner
    if (!req.isOwner) {
      const subscriptionLimits = await client.checkSubscriptionLimits();
      
      if (!subscriptionLimits.canAddMoreDomains) {
        throw new AppError(
          'Domain limit reached for your subscription. Please upgrade your plan.',
          403
        );
      }
    }

    // Crear dominio
    const newDomain = await Domain.create({
      clientId: targetClientId,
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

    // Para owners, poblar la información del cliente
    let result;
    if (req.isOwner) {
      result = await Domain.findById(newDomain._id).populate('clientId', 'name email');
    } else {
      result = newDomain;
    }

    res.status(201).json({
      status: 'success',
      data: { domain: result }
    });
  });

  // Obtener dominios del cliente (o todos los dominios para owner)
  getDomains = catchAsync(async (req, res) => {
    console.log('🏠 getDomains controller reached with:', {
      clientId: req.clientId,
      isOwner: req.isOwner,
      userRole: req.user?.role
    });
    
    const { clientId } = req;
    const { status, search, clientId: queryClientId } = req.query;

    // Crear la consulta base
    let query = {};
    
    // Si el usuario es owner 
    if (req.isOwner) {
      // Si se proporciona un ID de cliente específico en la consulta, filtrar por ese cliente
      if (queryClientId) {
        query.clientId = queryClientId;
      }
      // Si no se proporciona un cliente, devolver todos los dominios (owner puede ver todos)
    } else {
      // Para usuarios normales, siempre filtrar por su propio clientId
      query.clientId = clientId;
    }

    // Aplicar filtros adicionales
    if (status) query.status = status;
    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    // Obtener dominios con información del cliente para los owners
    let domains;
    let clientInfo;
    
    if (req.isOwner) {
      domains = await Domain.find(query)
        .populate('clientId', 'name email')  // Poblar con información del cliente
        .sort('-createdAt');
        
      // Si se filtró por un cliente específico, incluir su información
      if (queryClientId) {
        clientInfo = await Client.findById(queryClientId).select('name email status');
      }
    } else {
      domains = await Domain.find(query).sort('-createdAt');
    }

    res.status(200).json({
      status: 'success',
      data: { 
        domains,
        client: clientInfo
      },
      subscriptionStatus: req.subscriptionStatus,
      subscriptionInactive: req.subscriptionInactive || false,
      subscriptionMessage: req.subscriptionMessage
    });
  });

  // Obtener dominio específico
  getDomain = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    // Query diferente según el rol del usuario
    let query = { _id: id };
    
    // Si no es owner, filtrar también por clientId
    if (!req.isOwner) {
      query.clientId = clientId;
    }

    // Para owners, incluir información del cliente
    let domain;
    if (req.isOwner) {
      domain = await Domain.findOne(query)
        .populate('clientId', 'name email status');
    } else {
      domain = await Domain.findOne(query);
    }

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

    // Construir el filtro de búsqueda
    let filter = { _id: id };
    
    // Solo filtrar por clientId si NO es owner
    if (!req.isOwner && clientId) {
      filter.clientId = clientId;
    }

    console.log(`🗑️ Eliminando dominio ${id} - isOwner: ${req.isOwner}, filtro:`, filter);

    const domain = await Domain.findOneAndDelete(filter);

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
    const { domainId } = req.params;
    let { templateId } = req.params; // Cambiado a 'let' para poder modificarlo más adelante
    const { clientId } = req;
  
    // Verificar acceso al dominio con búsqueda más flexible
    let domain;
    
    // Para usuarios owner, ser más flexibles
    if (req.isOwner) {
      console.log(`🔍 Owner buscando dominio para asignar template: ${domainId}, template: ${templateId}`);
      
      // Intentar buscar por ID exacto primero
      try {
        domain = await Domain.findById(domainId);
      } catch (err) {
        console.log(`⚠️ Error al buscar dominio por ID: ${err.message}`);
      }
      
      // Si no se encuentra por ID, intentar buscar por nombre de dominio
      if (!domain && domainId.includes('.')) {
        console.log(`🔍 Búsqueda alternativa por nombre de dominio: ${domainId}`);
        domain = await Domain.findOne({ domain: domainId });
      }
    } else {
      // Para usuarios regulares, verificar acceso específico del cliente
      domain = await Domain.findOne({
        _id: domainId,
        clientId
      });
    }
  
    if (!domain) {
      console.error(`❌ Dominio no encontrado para asignar template: ${domainId}, cliente: ${clientId}, isOwner: ${!!req.isOwner}`);
      throw new AppError('Domain not found', 404);
    }
    
    console.log(`✅ Dominio encontrado: ${domain.domain} (${domain._id})`);
    
    // Usar el clientId del dominio como referencia principal
    const domainClientId = domain.clientId;
    console.log(`🔍 [setDefaultBannerTemplate] Cliente del dominio: ${domainClientId}, Cliente del request: ${clientId}`);
  
    // Verificar que la plantilla existe y pertenece al cliente del dominio o es del sistema
    let template = await BannerTemplate.findOne({
      _id: templateId,
      $or: [
        { clientId: domainClientId, status: 'active' },
        { type: 'system', status: 'active' }
      ]
    });
  
    console.log(`🔍 [setDefaultBannerTemplate] Buscando template ${templateId} para cliente del dominio ${domainClientId}`);
    
    // Debug: verificar si la plantilla existe en la base de datos
    const templateExists = await BannerTemplate.findById(templateId);
    if (templateExists) {
      console.log(`📋 [setDefaultBannerTemplate] Template ${templateId} existe en BD:`, {
        id: templateExists._id,
        name: templateExists.name,
        clientId: templateExists.clientId,
        type: templateExists.type,
        status: templateExists.status
      });
    } else {
      console.log(`❌ [setDefaultBannerTemplate] Template ${templateId} NO existe en la base de datos`);
    }
    
    if (!template) {
      console.log(`❌ [setDefaultBannerTemplate] Template ${templateId} no encontrado para cliente del dominio ${domainClientId}`);
      
      // Verificar si es un template de sistema en draft (los templates de sistema pueden usarse por cualquier cliente)
      if (templateExists && templateExists.type === 'system') {
        console.log(`✅ [setDefaultBannerTemplate] Template ${templateId} es del sistema, permitiendo uso por cualquier cliente`);
        template = templateExists;
      }
      // Si el template original está en draft, verificar si se puede activar
      else if (templateExists && templateExists.status === 'draft' && templateExists.clientId && templateExists.clientId.toString() === domainClientId.toString()) {
        console.log(`⚠️ [setDefaultBannerTemplate] Template ${templateId} está en draft pero pertenece al cliente correcto`);
        console.log(`🔧 [setDefaultBannerTemplate] Usando template en draft: ${templateExists._id}`);
        templateId = templateExists._id;
        template = templateExists;
      } else {
        // Buscar una plantilla activa del mismo cliente
        let clientTemplate = await BannerTemplate.findOne({
          clientId: domainClientId,
          status: 'active'
        }).sort({ updatedAt: -1 });

        if (clientTemplate) {
          console.log(`✅ [setDefaultBannerTemplate] Usando template activo del cliente: ${clientTemplate._id}`);
          templateId = clientTemplate._id;
          template = clientTemplate;
        } else {
          // Si no hay plantillas del cliente, buscar una del sistema
          console.log(`🔍 [setDefaultBannerTemplate] No hay templates activos del cliente, buscando template del sistema`);
          let systemTemplate = await BannerTemplate.findOne({
            type: 'system',
            status: 'active'
          }).sort({ updatedAt: -1 });

          if (systemTemplate) {
            console.log(`✅ [setDefaultBannerTemplate] Usando template del sistema: ${systemTemplate._id}`);
            templateId = systemTemplate._id;
            template = systemTemplate;
          } else {
            console.error(`❌ [setDefaultBannerTemplate] No se encontró ningún template disponible`);
            throw new AppError('No banner templates available', 404);
          }
        }
      }
    } else {
      console.log(`✅ [setDefaultBannerTemplate] Template encontrado: ${template._id} (${template.type === 'system' ? 'sistema' : 'cliente'})`);
    }
  
    // Inicializar settings si no existe
    if (!domain.settings) {
      domain.settings = {};
    }
  
    // Actualizar el defaultTemplateId
    domain.settings.defaultTemplateId = templateId;
    
    console.log(`🎨 [setDefaultBannerTemplate] Asignando template ${templateId} al dominio ${domain.domain}`);
    console.log(`📝 [setDefaultBannerTemplate] Settings antes de guardar:`, domain.settings);
    
    // Guardar cambios
    await domain.save();
    
    console.log(`✅ [setDefaultBannerTemplate] Template asignado correctamente al dominio ${domain.domain}`);
    console.log(`📝 [setDefaultBannerTemplate] Settings después de guardar:`, domain.settings);
  
    // Registrar auditoría si existe el servicio
    try {
      // Usar el clientId del dominio para la auditoría
      const auditClientId = domainClientId || 'system';
      
      if (auditService && typeof auditService.logAction === 'function') {
        await auditService.logAction({
          clientId: auditClientId,
          userId: req.userId || 'system',
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

  // Método para asignar un template a un dominio por nombre
  // Este método es útil cuando ya se ha creado el dominio y se necesita asignar un template
  assignTemplateByDomainName = catchAsync(async (req, res) => {
    const { domainName } = req.params;
    const { templateId } = req.body;
    
    if (!domainName || !templateId) {
      throw new AppError('Domain name and template ID are required', 400);
    }
    
    console.log(`🔍 Buscando dominio por nombre: ${domainName}`);
    
    // Buscar el dominio por nombre
    const domain = await Domain.findOne({ domain: domainName.toLowerCase() });
    
    if (!domain) {
      throw new AppError(`Domain "${domainName}" not found`, 404);
    }
    
    console.log(`✅ Dominio encontrado: ${domain._id}`);
    console.log(`🎨 Asignando template ${templateId} al dominio`);
    
    // Inicializar settings si no existe
    if (!domain.settings) {
      domain.settings = {};
    }
    
    // Asignar el template
    domain.settings.defaultTemplateId = templateId;
    
    // Guardar los cambios
    await domain.save();
    
    return res.status(200).json({
      status: 'success',
      message: `Template ${templateId} assigned to domain ${domainName}`,
      data: { domain }
    });
  });

  // Configurar análisis programado para un dominio
  configureScheduledAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { enabled, frequency, time, daysOfWeek, dayOfMonth, analysisConfig } = req.body;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied', 403);
    }

    // Actualizar configuración de análisis programado
    domain.analysisSchedule = {
      enabled: enabled || false,
      frequency: frequency || 'weekly',
      time: time || '02:00',
      daysOfWeek: daysOfWeek || [0], // Domingo por defecto
      dayOfMonth: dayOfMonth || 1,
      analysisConfig: {
        scanType: analysisConfig?.scanType || 'full',
        includeSubdomains: analysisConfig?.includeSubdomains || true,
        maxUrls: analysisConfig?.maxUrls || 100,
        depth: analysisConfig?.depth || 5
      }
    };

    await domain.save();

    // Reprogramar el dominio con la nueva configuración
    await domainAnalysisScheduler.rescheduleDomain(domainId);

    await auditService.logAction('DOMAIN_SCHEDULE_UPDATED', {
      domainId,
      userId: req.user.id,
      changes: { analysisSchedule: domain.analysisSchedule }
    });

    res.status(200).json({
      status: 'success',
      message: 'Scheduled analysis configured successfully',
      data: {
        domain: {
          _id: domain._id,
          domain: domain.domain,
          analysisSchedule: domain.analysisSchedule
        }
      }
    });
  });

  // Obtener configuración de análisis programado
  getScheduledAnalysisConfig = catchAsync(async (req, res) => {
    const { domainId } = req.params;

    const domain = await Domain.findById(domainId).select('domain analysisSchedule status');
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied', 403);
    }

    res.status(200).json({
      status: 'success',
      data: {
        domain: {
          _id: domain._id,
          domain: domain.domain,
          analysisSchedule: domain.analysisSchedule || {
            enabled: false,
            frequency: 'weekly',
            time: '02:00',
            daysOfWeek: [0],
            dayOfMonth: 1,
            analysisConfig: {
              scanType: 'full',
              includeSubdomains: true,
              maxUrls: 100,
              depth: 5
            }
          }
        }
      }
    });
  });

  // Obtener estado de análisis programados de todos los dominios
  getScheduledAnalysisStatus = catchAsync(async (req, res) => {
    // Solo owners pueden ver el estado global
    if (!req.isOwner) {
      throw new AppError('Access denied', 403);
    }

    const scheduledStatus = domainAnalysisScheduler.getScheduledDomainsStatus();
    
    // Obtener información adicional de los dominios
    const domainsInfo = await Domain.find({
      _id: { $in: scheduledStatus.map(s => s.domainId) }
    }).select('domain analysisSchedule.lastRun analysisSchedule.nextRun status');

    const statusWithInfo = scheduledStatus.map(status => {
      const domainInfo = domainsInfo.find(d => d._id.toString() === status.domainId);
      return {
        ...status,
        domain: domainInfo?.domain || 'Unknown',
        lastRun: domainInfo?.analysisSchedule?.lastRun,
        nextRun: domainInfo?.analysisSchedule?.nextRun,
        status: domainInfo?.status || 'unknown'
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        scheduledDomains: statusWithInfo,
        totalScheduled: statusWithInfo.length
      }
    });
  });

  // Ejecutar análisis inmediato para un dominio
  triggerImmediateAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied', 403);
    }

    // Ejecutar análisis usando el scheduler
    await domainAnalysisScheduler.executeDomainAnalysis(domain);

    await auditService.logAction('DOMAIN_ANALYSIS_TRIGGERED', {
      domainId,
      userId: req.user.id,
      domain: domain.domain
    });

    res.status(200).json({
      status: 'success',
      message: 'Analysis triggered successfully',
      data: {
        domain: domain.domain,
        triggeredAt: new Date()
      }
    });
  });
}

module.exports = new DomainController();