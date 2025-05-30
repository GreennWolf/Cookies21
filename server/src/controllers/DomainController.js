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
      }
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
    
    // Si el usuario es owner pero el dominio no pertenece al cliente actual,
    // actualizar clientId temporalmente para la asignación del template
    if (req.isOwner && domain.clientId && clientId && 
        domain.clientId.toString() !== clientId.toString()) {
      console.log(`⚠️ Owner asignando template a dominio de otro cliente. Ajustando contexto.`);
      req.clientId = domain.clientId;
    }
  
    // Verificar que la plantilla existe
    let template = await BannerTemplate.findOne({
      _id: templateId,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });
  
    if (!template) {
      // Buscar si existe cualquier plantilla para este cliente
      const anyTemplate = await BannerTemplate.findOne({
        $or: [
          { clientId },
          { type: 'system', 'metadata.isPublic': true }
        ]
      });

      if (anyTemplate) {
        // Si existe alguna plantilla para este cliente, usarla como alternativa
        console.log(`⚠️ Plantilla ${templateId} no encontrada. Usando plantilla alternativa: ${anyTemplate._id}`);
        templateId = anyTemplate._id;
        template = anyTemplate; // Actualizar también la referencia a la plantilla
      } else {
        // Si no hay ninguna plantilla disponible, entonces sí es un error crítico
        throw new AppError('Banner template not found', 404);
      }
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
      // Asegurarse de que tenemos un clientId, usando el del dominio si es necesario
      const auditClientId = clientId || domain.clientId || 'system';
      
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
}

module.exports = new DomainController();