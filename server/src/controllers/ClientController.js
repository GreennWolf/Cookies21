// controllers/ClientController.js
const Client = require('../models/Client');
const Domain = require('../models/Domain');
const UserAccount = require('../models/UserAccount');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest');
const BannerTemplate = require('../models/BannerTemplate');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const nodemailer = require('nodemailer');
const emailService = require('../services/email.service');
const consentScriptGenerator = require('../services/consentScriptGenerator.service');
const auditService = require('../services/audit.service');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getBaseUrl } = require('../config/urls');
const fs = require('fs').promises;
const path = require('path');
const { ensureDirectoryExists } = require('../utils/multerConfig');
const bcrypt = require('bcryptjs');
const BannerImageManager = require('../services/bannerImageManager.service');

class ClientController {
  // Crear un nuevo cliente con transacción completa (ORDEN: cliente → dominio → banner → usuario)
  createClient = catchAsync(async (req, res, next) => {
    console.log('🔄 INICIANDO TRANSACCIÓN COMPLETA DE CREACIÓN DE CLIENTE');
    
    // Variables para rollback
    let createdClient = null;
    let createdDomains = [];
    let createdTemplate = null;
    let createdUser = null;
    
    try {
      // Llamar al método transaccional
      const result = await this._createClientTransaction(req, res, next);
      
      // Si llegamos aquí, todo fue exitoso
      console.log('✅ TRANSACCIÓN COMPLETADA EXITOSAMENTE');
      return result;
      
    } catch (error) {
      console.error('❌ ERROR EN TRANSACCIÓN, INICIANDO ROLLBACK AUTOMÁTICO');
      
      // Intentar rollback automático en orden inverso
      await this._performRollback({
        createdUser: error.rollbackData?.createdUser,
        createdTemplate: error.rollbackData?.createdTemplate, 
        createdDomains: error.rollbackData?.createdDomains || [],
        createdClient: error.rollbackData?.createdClient
      });
      
      // Re-lanzar el error original con información adicional
      return next(new AppError(
        error.message || 'Error durante la creación del cliente. Se han revertido todos los cambios.',
        error.statusCode || 500
      ));
    }
  });

  // Método transaccional principal (privado)
  _createClientTransaction = async (req, res, next) => {
    const { 
      name, 
      contactEmail, 
      subscription = {}, 
      domains = [],
      adminUser = {},
      fiscalInfo = {},
      sendScriptByEmail = false,
      configureBanner = false,
      bannerConfig = null
    } = req.body;
  
    console.log('📋 INICIANDO VALIDACIONES PREVIAS');
    
    // PASO 0: Validaciones exhaustivas antes de crear nada
    await this._validateCreationData({ name, contactEmail, adminUser, domains });
    
    // Variables para rollback
    let createdClient = null;
    let createdDomains = [];
    let createdTemplate = null;
    let createdUser = null;
    
    try {
      // PASO 1: CREAR CLIENTE (PRIMERO)
      console.log('📝 PASO 1: Creando cliente...');
      
      // Preparar suscripción
      let subscriptionPlan = null;
      if (subscription?.planId) {
        subscriptionPlan = await SubscriptionPlan.findById(subscription.planId);
        if (!subscriptionPlan || subscriptionPlan.status !== 'active') {
          const error = new AppError('Plan de suscripción no válido', 400);
          error.rollbackData = { createdClient, createdDomains, createdTemplate, createdUser };
          throw error;
        }
      }
      
      const clientSubscription = {
        plan: subscription?.plan || (subscriptionPlan ? subscriptionPlan.name.toLowerCase() : 'basic'),
        planId: subscriptionPlan ? subscriptionPlan._id : null,
        startDate: subscription?.startDate ? new Date(subscription.startDate) : new Date(),
        maxUsers: subscription?.maxUsers || (subscriptionPlan ? subscriptionPlan.limits.maxUsers : 5),
        isUnlimited: subscription?.isUnlimited || (subscriptionPlan ? subscriptionPlan.limits.isUnlimitedUsers : false),
        endDate: subscription?.isUnlimited ? new Date(2099, 11, 31) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
      
      if (subscriptionPlan) {
        clientSubscription.features = {
          autoTranslate: subscriptionPlan.features.autoTranslate,
          cookieScanning: subscriptionPlan.features.cookieScanning,
          customization: subscriptionPlan.features.customization
        };
      }
      
      createdClient = await Client.create({
        name,
        contactEmail,
        email: contactEmail,
        subscription: clientSubscription,
        domains,
        status: 'active',
        fiscalInfo: {
          cif: fiscalInfo.cif || '',
          razonSocial: fiscalInfo.razonSocial || '',
          direccion: fiscalInfo.direccion || '',
          codigoPostal: fiscalInfo.codigoPostal || '',
          poblacion: fiscalInfo.poblacion || '',
          provincia: fiscalInfo.provincia || '',
          pais: fiscalInfo.pais || 'España'
        }
      });
      
      console.log(`✅ PASO 1 COMPLETADO: Cliente creado con ID ${createdClient._id}`);
      
      // PASO 2: CREAR DOMINIOS (SEGUNDO)
      console.log('🌐 PASO 2: Creando dominios...');
      
      if (domains && domains.length > 0) {
        const validDomains = domains.filter(d => d && d.trim() && !d.includes('@'));
        
        for (const domainName of validDomains) {
          try {
            const domainData = {
              domain: domainName,
              clientId: createdClient._id.toString(),
              status: 'active',
              settings: {
                scanning: {
                  autoDetect: true,
                  interval: 24
                }
              }
            };
            
            const domain = await Domain.create(domainData);
            createdDomains.push(domain);
            console.log(`✅ Dominio creado: ${domainName}`);
            
          } catch (domainError) {
            console.error(`❌ Error creando dominio ${domainName}:`, domainError.message);
            const error = new AppError(`Error creando dominio ${domainName}: ${domainError.message}`, 400);
            error.rollbackData = { createdClient, createdDomains, createdTemplate, createdUser };
            throw error;
          }
        }
      }
      
      console.log(`✅ PASO 2 COMPLETADO: ${createdDomains.length} dominios creados`);
      
      // PASO 3: CREAR BANNER (TERCERO)
      console.log('🎨 PASO 3: Creando banner...');
      
      if (configureBanner && bannerConfig) {
        try {
          let bannerData;
          
          if (bannerConfig.customizedTemplate) {
            bannerData = {
              ...bannerConfig.customizedTemplate,
              name: bannerConfig.name || `${createdClient.name} - Banner Principal`,
              clientId: createdClient._id.toString(),
              type: 'custom',
              metadata: {
                createdBy: req.userId,
                lastModifiedBy: req.userId,
                version: 1,
                isPublic: false
              }
            };
            
            delete bannerData._id;
            delete bannerData.__v;
            delete bannerData.createdAt;
            delete bannerData.updatedAt;
          } else {
            bannerData = {
              name: bannerConfig.name || `${createdClient.name} - Banner Principal`,
              clientId: createdClient._id.toString(),
              type: 'custom',
              components: bannerConfig.components || [],
              layout: bannerConfig.layout || {
                desktop: { width: '400px', height: 'auto' },
                tablet: { width: '350px', height: 'auto' },
                mobile: { width: '300px', height: 'auto' }
              }
            };
          }
          
          createdTemplate = await BannerTemplate.create(bannerData);
          console.log(`✅ Banner creado con ID: ${createdTemplate._id}`);
          
          // NUEVO: Procesar imágenes del banner si existen archivos subidos
          console.log('🔍 DEBUG IMÁGENES - Verificando archivos subidos:', {
            hasReqFiles: !!req.files,
            filesLength: req.files ? req.files.length : 0,
            filesNames: req.files ? req.files.map(f => f.originalname) : [],
            bannerHasComponents: !!(createdTemplate.components && createdTemplate.components.length > 0),
            componentsCount: createdTemplate.components ? createdTemplate.components.length : 0
          });
          
          if (req.files && req.files.length > 0) {
            console.log(`🖼️ PROCESANDO ${req.files.length} imágenes para banner ${createdTemplate._id}`);
            console.log('📁 Archivos a procesar:', req.files.map(f => ({
              originalname: f.originalname,
              mimetype: f.mimetype,
              size: f.size,
              path: f.path
            })));
            
            try {
              const imageManager = new BannerImageManager();
              const imageResult = await imageManager.processImagesUnified({
                bannerId: createdTemplate._id.toString(),
                uploadedFiles: req.files,
                components: createdTemplate.components || [],
                isUpdate: false,
                metadata: {
                  createdBy: req.userId,
                  clientId: createdClient._id.toString()
                }
              });
              
              console.log('🔍 RESULTADO del procesamiento de imágenes:', {
                success: imageResult.success,
                stats: imageResult.stats,
                hasComponents: !!imageResult.components,
                componentsLength: imageResult.components ? imageResult.components.length : 0
              });
              
              if (imageResult.success) {
                // El BannerImageManager ya guardó directamente en BD
                console.log(`✅ ${imageResult.stats.successful} imágenes procesadas y guardadas en BD`);
                
                // Verificar que se guardó correctamente
                const savedTemplate = await BannerTemplate.findById(createdTemplate._id);
                const imageComponentsAfterSave = [];
                const findImageComponents = (comps, path = '') => {
                  comps.forEach((comp, index) => {
                    if (comp.type === 'image') {
                      imageComponentsAfterSave.push({
                        id: comp.id,
                        path: path ? `${path}[${index}]` : `[${index}]`,
                        content: comp.content,
                        previewUrl: comp.style?.desktop?._previewUrl
                      });
                    }
                    if (comp.children) {
                      findImageComponents(comp.children, path ? `${path}[${index}].children` : `[${index}].children`);
                    }
                  });
                };
                findImageComponents(savedTemplate.components);
                console.log('📸 VERIFICACIÓN FINAL - Componentes imagen en BD:', JSON.stringify(imageComponentsAfterSave, null, 2));
              } else {
                console.error('❌ El procesamiento de imágenes no fue exitoso');
              }
              
            } catch (imageError) {
              console.error('❌ Error procesando imágenes del banner:', imageError.message);
              // No fallar la transacción por errores de imagen, solo advertir
              console.warn('⚠️ Banner creado pero sin procesar imágenes');
            }
          }
          
          // Asignar template a dominios creados
          for (const domain of createdDomains) {
            domain.settings.defaultTemplateId = createdTemplate._id;
            await domain.save();
          }
          
        } catch (bannerError) {
          console.error('❌ Error creando banner:', bannerError.message);
          const error = new AppError(`Error creando banner: ${bannerError.message}`, 400);
          error.rollbackData = { createdClient, createdDomains, createdTemplate, createdUser };
          throw error;
        }
      }
      
      console.log('✅ PASO 3 COMPLETADO: Banner configurado');
      
      // PASO 4: CREAR USUARIO (ÚLTIMO)
      console.log('👤 PASO 4: Creando usuario administrador...');
      
      try {
        const hashedPassword = adminUser.password ? 
          await bcrypt.hash(adminUser.password, 12) : 
          await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 12);
        
        createdUser = await UserAccount.create({
          name: adminUser.name,
          email: adminUser.email,
          password: hashedPassword,
          role: 'admin',
          clientId: createdClient._id,
          status: 'active',
          emailVerified: !adminUser.sendInvitation // Si se envía invitación, marcar como no verificado
        });
        
        console.log(`✅ Usuario administrador creado: ${createdUser.email}`);
        
        // Enviar email de invitación si es necesario
        if (adminUser.sendInvitation) {
          try {
            await emailService.sendInvitationEmail({
              email: adminUser.email,
              name: adminUser.name,
              clientName: createdClient.name,
              temporaryPassword: adminUser.password || 'Se generará al primer login'
            });
            console.log('✅ Email de invitación enviado');
          } catch (emailError) {
            console.warn('⚠️ Error enviando email de invitación:', emailError.message);
            // No fallar la transacción por errores de email
          }
        }
        
      } catch (userError) {
        console.error('❌ Error creando usuario:', userError.message);
        const error = new AppError(`Error creando usuario administrador: ${userError.message}`, 400);
        error.rollbackData = { createdClient, createdDomains, createdTemplate, createdUser };
        throw error;
      }
      
      console.log('✅ PASO 4 COMPLETADO: Usuario administrador creado');
      
      // PASO 5: NOTIFICAR AL OWNER (OPCIONAL)
      console.log('📧 PASO 5: Enviando notificación al owner...');
      
      try {
        // Buscar usuarios owner con notificaciones habilitadas
        const ownersToNotify = await UserAccount.find({
          role: 'owner',
          'preferences.notifications.clientCreation.enabled': true
        }).select('name email preferences.notifications.clientCreation');
        
        console.log(`📧 Owners a notificar: ${ownersToNotify.length}`);
        
        for (const owner of ownersToNotify) {
          try {
            // Usar el email personalizado si está configurado, sino el email del usuario
            const notificationEmail = owner.preferences.notifications.clientCreation.emailAddress || owner.email;
            
            // Preparar datos del cliente para el email
            const clientDataForEmail = {
              name: createdClient.name,
              contactEmail: createdClient.contactEmail,
              domain: createdDomains.length > 0 ? createdDomains.map(d => d.domain).join(', ') : 'Sin dominios',
              plan: createdClient.subscription.plan || 'basic',
              createdAt: new Date().toLocaleString('es-ES'),
              fiscalInfo: createdClient.fiscalInfo,
              adminUser: {
                name: createdUser.name,
                email: createdUser.email
              }
            };
            
            await emailService.sendClientCreationNotification({
              ownerName: owner.name,
              ownerEmail: notificationEmail,
              clientData: clientDataForEmail
            });
            
            console.log(`✅ Notificación enviada a ${owner.name} (${notificationEmail})`);
            
          } catch (emailError) {
            console.error(`❌ Error enviando notificación a ${owner.name}:`, emailError.message);
            // No fallar la transacción por errores de email
          }
        }
        
      } catch (notificationError) {
        console.error('❌ Error en el proceso de notificaciones:', notificationError.message);
        // No fallar la transacción por errores de notificación
      }
      
      console.log('✅ PASO 5 COMPLETADO: Notificaciones procesadas');
      
      // TRANSACCIÓN COMPLETADA EXITOSAMENTE
      console.log('🎉 TRANSACCIÓN COMPLETADA EXITOSAMENTE');
      
      return res.status(201).json({
        status: 'success',
        message: 'Cliente creado exitosamente con todos sus recursos',
        data: {
          client: {
            id: createdClient._id,
            name: createdClient.name,
            contactEmail: createdClient.contactEmail,
            status: createdClient.status,
            subscription: createdClient.subscription,
            domains: createdDomains.map(d => ({ id: d._id, domain: d.domain })),
            template: createdTemplate ? { id: createdTemplate._id, name: createdTemplate.name } : null,
            adminUser: { id: createdUser._id, email: createdUser.email, name: createdUser.name }
          }
        }
      });
      
    } catch (error) {
      // Agregar datos de rollback al error si no los tiene
      if (!error.rollbackData) {
        error.rollbackData = { createdClient, createdDomains, createdTemplate, createdUser };
      }
      throw error;
    }
  };

  // Actualizar suscripción de un cliente
  updateClientSubscription = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const { 
      planId, 
      startDate, 
      endDate, 
      isUnlimited, 
      maxUsers,
      features
    } = req.body;
    
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para modificar suscripciones', 403));
    }
    
    // Validación personalizada de fechas
    if (!isUnlimited && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return next(new AppError('La fecha de finalización no puede ser anterior a la fecha de inicio', 400));
      }
    }
    
    // Buscar el cliente
    const client = await Client.findById(clientId);
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Si se proporciona un planId, buscar el plan y actualizar desde él
    if (planId) {
      try {
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
          return next(new AppError('Plan de suscripción no encontrado', 404));
        }
        
        // Actualizar suscripción del cliente usando el plan
        await client.updateFromPlan(plan, {
          startDate,
          endDate,
          isUnlimited,
          maxUsers
        });
      } catch (error) {
        return next(new AppError(`Error al actualizar desde el plan: ${error.message}`, 400));
      }
    } else {
      // Actualización manual de campos específicos
      const updateData = {};
      
      if (startDate !== undefined) updateData['subscription.startDate'] = startDate;
      if (endDate !== undefined) updateData['subscription.endDate'] = endDate;
      if (isUnlimited !== undefined) updateData['subscription.isUnlimited'] = isUnlimited;
      if (maxUsers !== undefined) updateData['subscription.limits.maxUsers'] = maxUsers;
      if (features !== undefined) updateData['subscription.features'] = features;
      
      await Client.findByIdAndUpdate(clientId, updateData);
    }
    
    // Obtener el cliente actualizado
    const updatedClient = await Client.findById(clientId)
      .populate('subscription.plan', 'name type features')
      .select('-__v');
    
    res.status(200).json({
      status: 'success',
      data: {
        client: updatedClient
      }
    });
  });

  // Obtener todos los clientes
  getClients = catchAsync(async (req, res, next) => {
    const { status, plan, search, page = 1, limit = 50, subscriptionStatus } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (status) filters.status = status;
    if (plan) filters['subscription.plan'] = plan;
    
    // Búsqueda por nombre o email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { name: searchRegex },
        { contactEmail: searchRegex },
        { 'fiscalInfo.cif': searchRegex },
        { 'fiscalInfo.razonSocial': searchRegex }
      ];
    }
    
    // Calcular paginación
    const skip = (page - 1) * limit;
    
    // Obtener todos los clientes primero
    let allClients = await Client.find(filters)
      .select('-apiKeys')
      .populate('subscription.planId', 'name description features limits pricing')
      .sort({ createdAt: -1 });
    
    // Agregar información de solicitudes de renovación pendientes
    const clientsWithRenewalInfo = await Promise.all(
      allClients.map(async (client) => {
        const clientObj = client.toObject();
        
        // Verificar estado de suscripción
        const subscriptionInfo = client.isSubscriptionActive();
        clientObj.subscriptionActive = subscriptionInfo.isActive;
        clientObj.subscriptionReason = subscriptionInfo.reason;
        
        // Verificar si tiene solicitud de renovación pendiente
        const pendingRenewal = await SubscriptionRenewalRequest.findOne({
          clientId: client._id,
          status: { $in: ['pending', 'in_progress'] }
        }).select('requestType urgency createdAt status');
        
        clientObj.hasPendingRenewal = !!pendingRenewal;
        clientObj.pendingRenewalInfo = pendingRenewal ? {
          requestType: pendingRenewal.requestType,
          urgency: pendingRenewal.urgency,
          createdAt: pendingRenewal.createdAt,
          status: pendingRenewal.status
        } : null;
        
        return clientObj;
      })
    );
    
    // Filtrar por estado de suscripción si se especifica
    let filteredClients = clientsWithRenewalInfo;
    if (subscriptionStatus) {
      switch (subscriptionStatus) {
        case 'active':
          filteredClients = clientsWithRenewalInfo.filter(c => c.subscriptionActive);
          break;
        case 'inactive':
          filteredClients = clientsWithRenewalInfo.filter(c => !c.subscriptionActive);
          break;
        case 'pending_renewal':
          filteredClients = clientsWithRenewalInfo.filter(c => c.hasPendingRenewal);
          break;
      }
    }
    
    // Aplicar paginación después del filtro
    const total = filteredClients.length;
    const paginatedClients = filteredClients.slice(skip, skip + Number(limit));
    
    return res.status(200).json({
      status: 'success',
      data: {
        clients: paginatedClients,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Obtener un cliente específico
  getClient = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    
    const client = await Client.findById(clientId)
      .select('-apiKeys')
      .populate('subscription.planId', 'name description features limits pricing');
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Agregar información de estado de suscripción
    const clientObj = client.toObject();
    const subscriptionInfo = client.isSubscriptionActive();
    clientObj.subscriptionActive = subscriptionInfo.isActive;
    clientObj.subscriptionReason = subscriptionInfo.reason;
    
    // Verificar si tiene solicitud de renovación pendiente
    const pendingRenewal = await SubscriptionRenewalRequest.findOne({
      clientId: client._id,
      status: { $in: ['pending', 'in_progress'] }
    }).select('requestType urgency createdAt status');
    
    clientObj.hasPendingRenewal = !!pendingRenewal;
    clientObj.pendingRenewalInfo = pendingRenewal ? {
      requestType: pendingRenewal.requestType,
      urgency: pendingRenewal.urgency,
      createdAt: pendingRenewal.createdAt,
      status: pendingRenewal.status
    } : null;
    
    res.status(200).json({
      status: 'success',
      data: {
        client: clientObj
      }
    });
  });

  // Actualizar un cliente
  updateClient = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const updates = req.body;
    
    // Verificar que el cliente existe
    const existingClient = await Client.findById(clientId);
    if (!existingClient) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Verificar permisos: admins solo pueden editar su propio cliente
    if (req.user.role === 'admin' && existingClient._id.toString() !== req.user.clientId.toString()) {
      return next(new AppError('No tiene permisos para editar este cliente', 403));
    }
    
    // Eliminar campos que no se pueden actualizar directamente
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.apiKeys;
    
    // Actualizar el cliente
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-apiKeys');
    
    res.status(200).json({
      status: 'success',
      data: {
        client: updatedClient
      }
    });
  });

  // Cambiar estado del cliente (activar/desactivar)
  toggleClientStatus = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const { status } = req.body;
    
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para cambiar el estado del cliente', 403));
    }
    
    // Validar estado
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return next(new AppError('Estado no válido', 400));
    }
    
    const client = await Client.findByIdAndUpdate(
      clientId,
      { status, updatedAt: new Date() },
      { new: true }
    ).select('-apiKeys');
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        client
      }
    });
  });

  // Obtener métricas del cliente
  getClientMetrics = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    
    // Verificar que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Verificar permisos
    if (req.user.role === 'admin' && client._id.toString() !== req.user.clientId.toString()) {
      return next(new AppError('No tiene permisos para ver las métricas de este cliente', 403));
    }
    
    // Implementar métricas reales del cliente
    let metrics;
    
    try {
      // Contar dominios del cliente
      const domainsCount = await Domain.countDocuments({ 
        clientId: clientId,
        status: { $ne: 'inactive' }
      });
      
      // Contar usuarios del cliente
      const totalUsers = await UserAccount.countDocuments({ clientId: clientId });
      const activeUsers = await UserAccount.countDocuments({ 
        clientId: clientId, 
        status: 'active' 
      });
      
      // Contar banners/templates del cliente
      const bannersCount = await BannerTemplate.countDocuments({ 
        clientId: clientId,
        status: { $ne: 'inactive' }
      });
      
      // Obtener información de suscripción
      const subscriptionInfo = {
        plan: client.subscription.plan || 'basic',
        status: client.subscription.status || 'active',
        isUnlimited: client.subscription.isUnlimited || false,
        maxUsers: client.subscription.maxUsers || 5,
        startDate: client.subscription.startDate,
        endDate: client.subscription.endDate
      };
      
      metrics = {
        domains: {
          total: domainsCount,
          active: domainsCount, // Por ahora consideramos que todos los contados están activos
          canAddMore: true // Básicamente siempre se pueden agregar más dominios
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          limit: client.subscription.maxUsers || 5,
          canAddMore: client.subscription.isUnlimited || totalUsers < (client.subscription.maxUsers || 5)
        },
        banners: {
          total: bannersCount,
          active: bannersCount
        },
        subscription: subscriptionInfo,
        fiscalInfo: client.fiscalInfo || {},
        // Datos adicionales que podrían ser útiles
        analytics: {
          // Aquí se pueden agregar métricas de analytics cuando se implementen
          totalViews: 0,
          totalConsents: 0
        }
      };
      
      console.log(`📊 Métricas calculadas para cliente ${client.name}:`, metrics);
      
    } catch (metricsError) {
      console.error('❌ Error calculando métricas:', metricsError);
      
      // Devolver métricas básicas en caso de error
      metrics = {
        domains: { total: 0, active: 0, canAddMore: true },
        users: { 
          total: 0, 
          active: 0, 
          limit: client.subscription.maxUsers || 5,
          canAddMore: client.subscription.isUnlimited || true
        },
        banners: { total: 0, active: 0 },
        subscription: {
          plan: client.subscription.plan || 'basic',
          status: client.subscription.status || 'active',
          isUnlimited: client.subscription.isUnlimited || false,
          maxUsers: client.subscription.maxUsers || 5
        },
        fiscalInfo: client.fiscalInfo || {},
        analytics: { totalViews: 0, totalConsents: 0 }
      };
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        metrics
      }
    });
  });

  // Cancelar suscripción
  cancelSubscription = catchAsync(async (req, res) => {
    const { clientId } = req.params;
    const { reason, effectiveDate } = req.body;
    
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        status: 'error',
        message: 'No tiene permisos para cancelar suscripciones'
      });
    }
    
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Cliente no encontrado'
      });
    }
    
    // Actualizar la suscripción
    const cancelDate = effectiveDate ? new Date(effectiveDate) : new Date();
    
    client.subscription.status = 'cancelled';
    client.subscription.cancelledAt = cancelDate;
    client.subscription.cancellationReason = reason;
    client.subscription.endDate = cancelDate;
    
    await client.save();
    
    // Registrar en auditoría
    await auditService.log({
      action: 'subscription_cancelled',
      resourceType: 'Client',
      resourceId: clientId,
      userId: req.user._id,
      details: {
        reason,
        effectiveDate: cancelDate,
        previousStatus: 'active'
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Suscripción cancelada exitosamente',
      data: {
        client: {
          id: client._id,
          name: client.name,
          subscription: client.subscription
        }
      }
    });
  });

  // Reactivar suscripción
  reactivateSubscription = catchAsync(async (req, res) => {
    const { clientId } = req.params;
    const { newEndDate, planId } = req.body;
    
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        status: 'error',
        message: 'No tiene permisos para reactivar suscripciones'
      });
    }
    
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Cliente no encontrado'
      });
    }
    
    // Si se proporciona un nuevo plan, validarlo
    if (planId) {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || plan.status !== 'active') {
        return res.status(400).json({
          status: 'error',
          message: 'Plan de suscripción no válido'
        });
      }
      
      // Actualizar la suscripción con el nuevo plan
      await client.updateFromPlan(plan, {
        startDate: new Date(),
        endDate: newEndDate ? new Date(newEndDate) : undefined
      });
    } else {
      // Reactivar con la configuración anterior
      client.subscription.status = 'active';
      client.subscription.reactivatedAt = new Date();
      client.subscription.endDate = newEndDate ? new Date(newEndDate) : client.subscription.endDate;
      
      // Limpiar campos de cancelación
      client.subscription.cancelledAt = undefined;
      client.subscription.cancellationReason = undefined;
      
      await client.save();
    }
    
    // Registrar en auditoría
    await auditService.log({
      action: 'subscription_reactivated',
      resourceType: 'Client',
      resourceId: clientId,
      userId: req.user._id,
      details: {
        newEndDate,
        planId,
        reactivatedAt: new Date()
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Suscripción reactivada exitosamente',
      data: {
        client: {
          id: client._id,
          name: client.name,
          subscription: client.subscription
        }
      }
    });
  });

  // Método de rollback automático (privado)
  _performRollback = async (rollbackData) => {
    console.log('🧹 INICIANDO ROLLBACK AUTOMÁTICO');
    const errors = [];

    try {
      // PASO 4: Eliminar usuario creado (último en ser creado, primero en eliminarse)
      if (rollbackData.createdUser) {
        try {
          console.log(`🧹 Eliminando usuario: ${rollbackData.createdUser._id}`);
          await UserAccount.findByIdAndDelete(rollbackData.createdUser._id);
          console.log('✅ Usuario eliminado exitosamente');
        } catch (error) {
          console.error('❌ Error eliminando usuario:', error.message);
          errors.push(`usuario: ${error.message}`);
        }
      }

      // PASO 3: Eliminar banner/template creado
      if (rollbackData.createdTemplate) {
        try {
          console.log(`🧹 Eliminando banner/template: ${rollbackData.createdTemplate._id}`);
          await BannerTemplate.findByIdAndDelete(rollbackData.createdTemplate._id);
          console.log('✅ Banner/template eliminado exitosamente');
        } catch (error) {
          console.error('❌ Error eliminando banner/template:', error.message);
          errors.push(`banner: ${error.message}`);
        }
      }

      // PASO 2: Eliminar dominios creados
      if (rollbackData.createdDomains && rollbackData.createdDomains.length > 0) {
        for (const domain of rollbackData.createdDomains) {
          try {
            console.log(`🧹 Eliminando dominio: ${domain._id} (${domain.domain})`);
            await Domain.findByIdAndDelete(domain._id);
            console.log(`✅ Dominio ${domain.domain} eliminado exitosamente`);
          } catch (error) {
            console.error(`❌ Error eliminando dominio ${domain.domain}:`, error.message);
            errors.push(`dominio ${domain.domain}: ${error.message}`);
          }
        }
      }

      // PASO 1: Eliminar cliente creado (primero en ser creado, último en eliminarse)
      if (rollbackData.createdClient) {
        try {
          console.log(`🧹 Eliminando cliente: ${rollbackData.createdClient._id}`);
          await Client.findByIdAndDelete(rollbackData.createdClient._id);
          console.log('✅ Cliente eliminado exitosamente');
        } catch (error) {
          console.error('❌ Error eliminando cliente:', error.message);
          errors.push(`cliente: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        console.error(`⚠️ ROLLBACK COMPLETADO CON ERRORES: ${errors.join(', ')}`);
      } else {
        console.log('✅ ROLLBACK COMPLETADO EXITOSAMENTE');
      }

    } catch (rollbackError) {
      console.error('❌ ERROR CRÍTICO EN ROLLBACK:', rollbackError);
      throw rollbackError;
    }
  };

  // Validar datos de creación antes de empezar la transacción (privado)
  _validateCreationData = async ({ name, contactEmail, adminUser, domains }) => {
    console.log('🔍 VALIDANDO DATOS DE CREACIÓN');
    
    // Validaciones básicas
    if (!name || !contactEmail) {
      throw new AppError('Nombre y email de contacto son requeridos', 400);
    }
    
    if (!adminUser || !adminUser.name || !adminUser.email) {
      throw new AppError('Datos del usuario administrador son requeridos', 400);
    }
    
    // Verificar si ya existe un cliente con el mismo email de contacto
    const existingClientByEmail = await Client.findOne({ contactEmail });
    if (existingClientByEmail) {
      throw new AppError(`Ya existe un cliente con el email de contacto "${contactEmail}"`, 409);
    }
    
    // Verificar si ya existe un usuario con el email del admin
    const existingAdmin = await UserAccount.findOne({ email: adminUser.email });
    if (existingAdmin) {
      throw new AppError(`Ya existe un usuario con el email "${adminUser.email}"`, 409);
    }
    
    // Validar dominios si se proporcionan
    if (domains && domains.length > 0) {
      for (const domainName of domains) {
        if (!domainName || domainName.trim() === '') continue;
        
        const existingDomain = await Domain.findOne({ domain: domainName.trim() });
        if (existingDomain) {
          throw new AppError(`El dominio ${domainName} ya existe`, 409);
        }
      }
    }

    return true;
  };
}

module.exports = new ClientController();
