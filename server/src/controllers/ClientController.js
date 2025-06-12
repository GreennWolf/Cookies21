// controllers/ClientController.js
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const nodemailer = require('nodemailer');
const emailService = require('../services/email.service');
const consentScriptGenerator = require('../services/consentScriptGenerator.service');
const auditService = require('../services/audit.service');
const crypto = require('crypto');
const logger = require('../utils/logger');

class ClientController {
  // Crear un nuevo cliente (solo para usuarios owner)
  createClient = catchAsync(async (req, res, next) => {
    const { 
      name, 
      contactEmail, 
      subscription, 
      domains = [],
      adminUser,
      fiscalInfo = {}, // Nuevo campo para información fiscal
      sendScriptByEmail = false, // Nuevo campo para enviar script por email
      configureBanner = false, // Flag para indicar si se debe configurar un banner
      bannerConfig = null, // Configuración del banner
      domainForScript = '' // Dominio para el cual generar el script
    } = req.body;
  
    console.log('🏢 Datos recibidos para crear cliente:', JSON.stringify(req.body, null, 2));
    console.log(`📫 Enviar script por email: ${sendScriptByEmail ? 'Sí' : 'No'}`);
    console.log(`🎨 Configurar banner: ${configureBanner ? 'Sí' : 'No'}`);
  
    // Validar que se envíen los campos requeridos
    if (!name || !contactEmail) {
      return next(new AppError('Se requiere nombre y email de contacto', 400));
    }
  
    // Validar que el adminUser tenga los datos necesarios
    if (!adminUser || !adminUser.name || !adminUser.email) {
      return next(new AppError('Se requiere información del administrador', 400));
    }
  
    // Verificar si ya existe un cliente con ese email
    const existingClient = await Client.findOne({ contactEmail });
    if (existingClient) {
      console.warn(`⚠️ Ya existe un cliente con email: ${contactEmail}`);
      return next(new AppError('Ya existe un cliente con ese email', 409));
    }
  
    // Buscar el plan de suscripción si se ha proporcionado un planId
    let subscriptionPlan = null;
    if (subscription?.planId) {
      subscriptionPlan = await SubscriptionPlan.findById(subscription.planId);
      
      if (!subscriptionPlan) {
        console.error(`❌ Plan de suscripción no encontrado: ${subscription.planId}`);
        return next(new AppError('Plan de suscripción no encontrado', 404));
      }
      
      if (subscriptionPlan.status !== 'active') {
        console.warn(`⚠️ Plan de suscripción inactivo: ${subscriptionPlan.name}`);
        return next(new AppError('El plan seleccionado no está activo', 400));
      }
      
      console.log(`✅ Plan de suscripción encontrado: ${subscriptionPlan.name}`);
    }
  
    // Preparar el objeto de suscripción
    const clientSubscription = {
      plan: subscription?.plan || (subscriptionPlan ? subscriptionPlan.name.toLowerCase() : 'basic'),
      planId: subscriptionPlan ? subscriptionPlan._id : null,
      startDate: subscription?.startDate ? new Date(subscription.startDate) : new Date(),
      maxUsers: subscription?.maxUsers || (subscriptionPlan ? subscriptionPlan.limits.maxUsers : 5),
      isUnlimited: subscription?.isUnlimited || (subscriptionPlan ? subscriptionPlan.limits.isUnlimitedUsers : false)
    };
  
    // Si no es ilimitada, establecer fecha de finalización
    if (!clientSubscription.isUnlimited) {
      clientSubscription.endDate = subscription?.endDate ? 
        new Date(subscription.endDate) : 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año por defecto
    } else {
      // Para suscripciones ilimitadas, usar fecha lejana
      clientSubscription.endDate = new Date(2099, 11, 31);
    }
  
    // Si hay un plan seleccionado, copiar las características
    if (subscriptionPlan) {
      clientSubscription.features = {
        autoTranslate: subscriptionPlan.features.autoTranslate,
        cookieScanning: subscriptionPlan.features.cookieScanning,
        customization: subscriptionPlan.features.customization
      };
    }
  
    console.log(`📝 Configuración de suscripción:`);
    console.log(`  - Plan: ${clientSubscription.plan}`);
    console.log(`  - Fecha inicio: ${clientSubscription.startDate}`);
    console.log(`  - Fecha fin: ${clientSubscription.endDate}`);
    console.log(`  - Máx. usuarios: ${clientSubscription.maxUsers}`);
    console.log(`  - Ilimitada: ${clientSubscription.isUnlimited ? 'Sí' : 'No'}`);
  
    // Variable para almacenar el cliente creado
    let createdClient = null;
    // Variable para almacenar el ID del banner template (si se crea uno)
    let bannerTemplateId = null;
  
    try {
      // Crear cliente con la información fiscal
      createdClient = await Client.create({
        name,
        contactEmail,
        email: contactEmail, // Asignación explícita del email para sincronizar con contactEmail
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
  
      console.log(`✅ Cliente creado: ${createdClient._id} - ${createdClient.name}`);
      
      // Para la versión inicial, no creamos el banner aquí para evitar duplicación
      // El frontend ya maneja la creación del banner para el cliente
      // Solo guardamos la configuración de banner si se proporcionó para referencia
      if (configureBanner && bannerConfig) {
        console.log(`🎨 Se recibió configuración de banner para el cliente: ${createdClient.name}`);
        console.log(`📝 La creación del banner será manejada por el frontend`);
        
        // Si hay imágenes, vamos a guardarlas en almacenamiento temporal
        // para que el frontend pueda accederlas al crear el banner
        if (bannerConfig.images && Object.keys(bannerConfig.images).length > 0 && req.files && req.files.length > 0) {
          try {
            console.log(`🖼️ Imágenes detectadas: ${Object.keys(bannerConfig.images).length}`);
            console.log(`📂 Archivos recibidos: ${req.files.length}`);
            
            // Aquí podríamos hacer algún procesamiento si fuera necesario, 
            // pero por ahora el frontend ya maneja esto correctamente
          } catch (error) {
            console.error('⚠️ Error al procesar imágenes del banner:', error);
          }
        }
      }
      
      // Determinar si se debe enviar invitación o usar contraseña
      const sendInvitation = adminUser.sendInvitation !== false; // Por defecto, enviar invitación
  
      // Preparar datos del administrador
      const adminData = {
        clientId: createdClient._id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'admin',
        // Si se envía invitación, el estado es 'pending', de lo contrario 'active'
        status: sendInvitation ? 'pending' : 'active'
      };
  
      // Generación de contraseña según el caso
      let adminPassword = null;
  
      if (!sendInvitation) {
        // Si no se envía invitación, usar la contraseña proporcionada o generar una
        if (adminUser.password) {
          adminPassword = adminUser.password;
          adminData.password = adminPassword;
        } else {
          // Generar contraseña aleatoria
          adminPassword = crypto.randomBytes(4).toString('hex') + 
                        Math.random().toString(36).substring(2, 6) + 
                        '!A9';
          adminData.password = adminPassword;
        }
        
        console.log(`🔑 Configurando contraseña para admin: ${adminPassword.substring(0, 3)}...`);
      }
  
      console.log(`👤 Creando admin con datos:`, {
        ...adminData,
        password: adminPassword ? `${adminPassword.substring(0, 3)}...` : 'N/A'
      });
  
      // Crear usuario administrador
      const admin = await UserAccount.create(adminData);
      console.log(`✅ Administrador creado: ${admin._id} - ${admin.email}`);
  
      // Datos para invitación
      let invitationData = null;
  
      // Generar token de invitación y enviar email si es necesario
      if (sendInvitation) {
        try {
          // Crear un token de invitación
          console.log(`🔑 Generando token de invitación para ${admin.email}`);
          const invitationToken = admin.createInvitationToken();
          await admin.save();
          
          console.log(`✅ Token de invitación generado: ${invitationToken.substring(0, 8)}...`);
          
          // Construir URL de invitación
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const inviteUrl = `${frontendUrl}/invitacion/${invitationToken}`;
          
          // CAMBIO IMPORTANTE: Usar directamente el servicio de email
          console.log(`📧 Enviando email de invitación a ${admin.email}...`);
          
          const emailResult = await emailService.sendInvitationEmail({
            email: admin.email,
            name: admin.name,
            invitationToken,
            clientName: createdClient.name,
            role: 'admin',
            sendDirect: true // Forzar envío directo
          });
          
          console.log(`📨 Resultado del envío:`, emailResult);
          
          if (emailResult.success) {
            console.log(`✅ Email de invitación enviado correctamente a ${admin.email}`);
            
            invitationData = {
              sent: true,
              email: admin.email,
              token: invitationToken.substring(0, 8) + '...', // Solo mostrar parte del token por seguridad
              url: inviteUrl,
              previewUrl: emailResult.previewUrl
            };
          } else {
            console.error(`❌ Error al enviar email de invitación: ${emailResult.error}`);
            if (emailResult.details) {
              console.error('Detalles del error:', emailResult.details);
            }
            
            invitationData = {
              sent: false,
              email: admin.email,
              error: emailResult.error
            };
          }
        } catch (inviteError) {
          console.error('❌ Error al generar token de invitación o enviar email:', inviteError);
          
          invitationData = {
            sent: false,
            email: admin.email,
            error: inviteError.message
          };
        }
      }
  
      // Incluir información del plan en la respuesta
      let planInfo = null;
      if (subscriptionPlan) {
        planInfo = {
          id: subscriptionPlan._id,
          name: subscriptionPlan.name,
          features: subscriptionPlan.features
        };
      }
      
      // Variable para almacenar información del email de script si se envía
      let scriptEmailData = null;
      
      // Enviar script por email si está marcada la opción
      if (sendScriptByEmail) {
        try {
          console.log('📨 Enviando script de embed por email...');
          
          // Determinar el dominio para el script
          const domainToUse = domainForScript || (domains.length > 0 ? domains[0] : null);
          
          if (!domainToUse) {
            console.warn('⚠️ No se pudo enviar el script por email: No hay dominio disponible');
          } else {
            console.log(`🌐 Generando script para el dominio: ${domainToUse}`);
            
            // Variables para almacenar información del dominio
            let domainId;
            let domainName;
            let domainObject = null;
            
            // Primero verificamos si ya es un objeto Domain con _id
            if (typeof domainToUse === 'object' && domainToUse !== null && domainToUse._id) {
              domainId = domainToUse._id;
              domainName = domainToUse.domain || 'tu sitio web';
              domainObject = domainToUse;
              console.log(`✅ Usando dominio existente con ID: ${domainId}`);
            } else {
              // Si es un string (nombre de dominio) o necesitamos crear/encontrar el dominio
              const Domain = require('../models/Domain');
              const domainStr = typeof domainToUse === 'string' ? domainToUse : 
                               (domainToUse && typeof domainToUse === 'object' ? (domainToUse.domain || domainToUse.name || '') : '');
              
              if (!domainStr) {
                console.error('❌ No se pudo determinar el nombre del dominio');
                throw new Error('Nombre de dominio inválido');
              }
              
              // Normalizar el nombre del dominio
              const normalizedDomain = domainStr.toLowerCase().trim();
              console.log(`🔍 Buscando dominio: ${normalizedDomain}`);
              
              // Buscar si el dominio ya existe
              try {
                domainObject = await Domain.findOne({ domain: normalizedDomain });
                
                if (domainObject) {
                  console.log(`✅ Dominio encontrado en la base de datos: ${domainObject._id}`);
                  domainId = domainObject._id;
                  domainName = domainObject.domain;
                  
                  // Si existe un banner template, siempre asignarlo como defaultTemplateId del dominio
                  if (bannerTemplateId) {
                    console.log(`🎨 Actualizando dominio existente con plantilla ${bannerTemplateId}`);
                    console.log(`🔍 Tipo de bannerTemplateId: ${typeof bannerTemplateId}`);
                    console.log(`🆔 Valor de bannerTemplateId: ${bannerTemplateId}`);
                    
                    // Inicializar settings si no existe
                    if (!domainObject.settings) {
                      domainObject.settings = {};
                    }
                    
                    // Asignar la plantilla (sobreescribiendo cualquier valor previo)
                    // Asegurándonos de que sea un string válido
                    domainObject.settings.defaultTemplateId = String(bannerTemplateId);
                    
                    try {
                      await domainObject.save();
                      console.log(`✅ Dominio actualizado con éxito. defaultTemplateId: ${domainObject.settings.defaultTemplateId}`);
                    } catch (updateError) {
                      console.error(`❌ Error al actualizar dominio: ${updateError.message}`);
                      if (updateError.errors && updateError.errors.settings) {
                        console.error(`🔍 Error específico en settings: ${JSON.stringify(updateError.errors.settings)}`);
                      }
                    }
                  }
                } else {
                  // El dominio no existe, lo creamos
                  console.log(`🆕 Creando nuevo dominio para: ${normalizedDomain}`);
                  
                  try {
                    // Verificar que el formato del dominio sea válido
                    const { validateDomain } = require('../utils/domainValidator');
                    if (!validateDomain(normalizedDomain)) {
                      console.error(`❌ Formato de dominio inválido: ${normalizedDomain}`);
                      throw new Error('Formato de dominio inválido');
                    }
                    
                    // Crear el nuevo dominio asociado al cliente
                    // Configurar settings con el bannerTemplateId si existe
                    const settings = {
                      design: {},
                      scanning: {
                        enabled: true,
                        interval: 24
                      }
                    };
                    
                    // Si hay un banner template, asignarlo como defaultTemplateId del dominio
                    if (bannerTemplateId) {
                      // Loguear información de depuración detallada sobre el template
                      console.log(`🎨 Asignando banner template ${bannerTemplateId} como predeterminado para el dominio`);
                      console.log(`🔍 Tipo de bannerTemplateId: ${typeof bannerTemplateId}`);
                      console.log(`🆔 Valor de bannerTemplateId: ${bannerTemplateId}`);
                      
                      // Asignar el template ID asegurándose de que sea un string válido
                      settings.defaultTemplateId = String(bannerTemplateId);
                    }
                    
                    domainObject = await Domain.create({
                      clientId: createdClient._id,
                      domain: normalizedDomain,
                      status: 'pending',
                      settings: settings
                    });
                    
                    console.log(`✅ Nuevo dominio creado con ID: ${domainObject._id}`);
                    
                    // Actualizar la lista de dominios del cliente con el nombre de dominio
                    await Client.findByIdAndUpdate(
                      createdClient._id, 
                      { $addToSet: { domains: normalizedDomain } }
                    );
                    
                    domainId = domainObject._id;
                    domainName = normalizedDomain;
                  } catch (createError) {
                    console.error(`❌ Error al crear dominio: ${createError.message}`);
                    throw new Error(`No se pudo crear el dominio: ${createError.message}`);
                  }
                }
              } catch (domainError) {
                console.error(`❌ Error al procesar dominio: ${domainError.message}`);
                throw domainError;
              }
            }
            
            // Verificación final
            if (!domainId) {
              console.error('❌ No se pudo determinar el ID del dominio');
              throw new Error('ID de dominio no disponible');
            }
            
            console.log(`🔑 ID final del dominio para script: ${domainId}`);
            console.log(`🏷️ Nombre del dominio: ${domainName}`);
            
            // Generar script de consentimiento
            const scriptOptions = {
              clientId: createdClient._id,
              domainId: domainId, // Usar el ID del dominio específico
              templateId: bannerTemplateId || 'default', // Usar el ID de plantilla si existe
              apiEndpoint: process.env.API_URL ? `${process.env.API_URL}/api/v1/consent` : '/api/v1/consent',
              autoAcceptNonGDPR: false
            };
            
            const script = await consentScriptGenerator.generateMinifiedScript(scriptOptions);
            console.log(`✅ Script generado (${script.length} caracteres)`);
            
            // Preparar opciones para el email, considerando si hay invitación
            const emailOptions = {
              email: adminUser.email,
              name: adminUser.name,
              domain: domainName, // Usar el nombre del dominio en lugar del objeto o ID
              script: `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.API_URL || 'https://app.cookie21.com'}/api/v1/consent/script/${domainId}/embed.js${process.env.NODE_ENV === 'development' ? '?dev=true' : ''}');
</script>`,
              clientName: createdClient.name,
              sendDirect: true
            };
            
            // Si también se envió invitación, incluir los datos en el email
            if (sendInvitation && invitationData && invitationData.sent) {
              emailOptions.invitationInfo = {
                token: invitationData.token,
                url: invitationData.url
              };
              console.log('🔄 Combinando email de script con invitación');
            }
            
            // Enviar el email
            const emailResult = await emailService.sendEmbedScriptEmail(emailOptions);
            console.log('📧 Resultado envío email de script:', emailResult);
            
            if (emailResult.success) {
              scriptEmailData = {
                sent: true,
                email: adminUser.email,
                domain: domainName, // Usar el nombre del dominio en lugar del objeto
                combined: emailResult.combined,
                previewUrl: emailResult.previewUrl
              };
            } else {
              scriptEmailData = {
                sent: false,
                email: adminUser.email,
                error: emailResult.error
              };
            }
          }
        } catch (scriptError) {
          console.error('❌ Error al enviar script por email:', scriptError);
          
          // Determinar si el error está relacionado con el dominio
          const errorMessage = scriptError.message || '';
          const isDomainError = 
            errorMessage.includes('dominio') || 
            errorMessage.includes('domain') || 
            errorMessage.includes('ID del dominio');
          
          scriptEmailData = {
            sent: false,
            email: adminUser.email,
            error: isDomainError 
              ? `Error con el dominio: ${errorMessage}. Por favor, crea el dominio primero desde la sección de dominios.` 
              : scriptError.message
          };
          
          // Si es un error de dominio, también lo mostramos en la consola de forma destacada
          if (isDomainError) {
            console.error('🚨🚨🚨 ERROR DE DOMINIO 🚨🚨🚨');
            console.error('El dominio no pudo ser procesado correctamente. Asegúrate de:');
            console.error('1. Crear el dominio en la plataforma antes de enviar el script');
            console.error('2. Verificar que el formato del dominio sea válido (ej: example.com)');
            console.error('3. Comprobar que el dominio no esté ya registrado por otro cliente');
          }
        }
      }
  
      return res.status(201).json({
        status: 'success',
        data: {
          client: {
            id: createdClient._id,
            name: createdClient.name,
            contactEmail: createdClient.contactEmail,
            subscription: createdClient.subscription,
            domains: createdClient.domains,
            fiscalInfo: createdClient.fiscalInfo
          },
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            password: !sendInvitation ? adminPassword : undefined
          },
          plan: planInfo,
          invitation: invitationData,
          // Incluir información del banner si se configuró
          banner: bannerTemplateId ? { 
            templateId: bannerTemplateId,
            configured: true
          } : null,
          // Incluir información del email de script si se envió
          scriptEmail: scriptEmailData
        }
      });
    } catch (error) {
      console.error('❌ Error al crear cliente:', error);
      
      // Si se creó el cliente pero falló al crear el admin, intentar eliminar el cliente
      if (error.message && error.message.includes('UserAccount validation failed') && createdClient) {
        try {
          await Client.findByIdAndDelete(createdClient._id);
          console.warn('⚠️ Se eliminó el cliente parcialmente creado debido a error en la creación del admin');
        } catch (cleanupError) {
          console.error('❌ Error al limpiar cliente tras fallo:', cleanupError);
        }
      }
      
      return next(new AppError(`Error al crear cliente: ${error.message}`, 422));
    }
  });

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
        
        logger.info(`Suscripción del cliente ${client.name} (${client._id}) actualizada al plan ${plan.name}`);
      } catch (error) {
        return next(new AppError(`Error al actualizar la suscripción: ${error.message}`, 400));
      }
    } else {
      // Actualización manual de campos individuales
      if (startDate) {
        client.subscription.startDate = new Date(startDate);
      }
      
      if (typeof isUnlimited === 'boolean') {
        client.subscription.isUnlimited = isUnlimited;
        
        if (isUnlimited) {
          client.subscription.endDate = new Date(2099, 11, 31);
        } else if (endDate) {
          client.subscription.endDate = new Date(endDate);
        }
      } else if (endDate) {
        client.subscription.endDate = new Date(endDate);
      }
      
      if (maxUsers) {
        client.subscription.maxUsers = maxUsers;
      }
      
      // Actualizar características si se proporcionan
      if (features) {
        Object.keys(features).forEach(key => {
          if (client.subscription.features[key] !== undefined) {
            client.subscription.features[key] = features[key];
          }
        });
      }
      
      // Marcar los campos modificados para asegurar que se guarden
      client.markModified('subscription');
      
      await client.save();
      logger.info(`Suscripción del cliente ${client.name} (${client._id}) actualizada manualmente`);
    }
    
    const updatedClient = await Client.findById(clientId)
      .populate('subscription.planId', 'name description features limits pricing');

    // Verificar si la suscripción está ahora activa y completar solicitudes pendientes
    const subscriptionStatus = updatedClient.isSubscriptionActive();
    if (subscriptionStatus.isActive) {
      try {
        const pendingRenewalRequest = await SubscriptionRenewalRequest.findOne({
          clientId: updatedClient._id,
          status: { $in: ['pending', 'in_progress'] }
        }).populate('requestedBy', 'name email');

        if (pendingRenewalRequest) {
          console.log(`🔄 Completando solicitud de renovación pendiente tras actualización: ${pendingRenewalRequest._id}`);
          
          // Actualizar la solicitud como completada
          const now = new Date();
          pendingRenewalRequest.status = 'completed';
          pendingRenewalRequest.resolvedAt = now;
          pendingRenewalRequest.resolvedBy = req.user._id;
          pendingRenewalRequest.adminNotes = `Suscripción actualizada por ${req.user.name}. Plan actualizado: ${
            typeof updatedClient.subscription.plan === 'object' 
              ? updatedClient.subscription.plan.name 
              : (updatedClient.subscription.plan || 'Básico')
          }`;
          
          await pendingRenewalRequest.save();
          
          // Enviar email de confirmación al cliente
          try {
            const planName = typeof updatedClient.subscription.plan === 'object' 
              ? updatedClient.subscription.plan.name 
              : (updatedClient.subscription.plan || 'Básico');
            
            const features = [];
            if (updatedClient.subscription.planId && updatedClient.subscription.planId.features) {
              const planFeatures = updatedClient.subscription.planId.features;
              if (planFeatures.autoTranslate) features.push('Traducción automática de banners');
              if (planFeatures.cookieScanning) features.push('Escaneo automático de cookies');
              if (planFeatures.customization) features.push('Personalización avanzada de banners');
            }
            
            const clientEmail = updatedClient.contactEmail || updatedClient.email;
            const requestedByEmail = pendingRenewalRequest.requestedBy?.email;
            
            if (clientEmail || requestedByEmail) {
              console.log(`📧 Enviando email de confirmación de renovación a: ${requestedByEmail || clientEmail}`);
              
              await emailService.sendRenewalSuccessNotification({
                to: requestedByEmail || clientEmail,
                clientName: updatedClient.name,
                planName: planName,
                endDate: updatedClient.subscription.endDate,
                features: features,
                requestType: pendingRenewalRequest.requestType
              });
              
              console.log(`✅ Email de confirmación enviado exitosamente tras actualización`);
            }
          } catch (emailError) {
            console.error('❌ Error enviando email de confirmación tras actualización:', emailError);
          }
        }
      } catch (renewalError) {
        console.error('❌ Error procesando solicitud de renovación tras actualización:', renewalError);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        client: {
          id: updatedClient._id,
          name: updatedClient.name,
          subscription: updatedClient.subscription
        }
      }
    });
  });
  
  // Resto de métodos del controlador...
  
  // Obtener todos los clientes (con filtros opcionales)
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
    
    // Obtener información adicional
    const clientObj = client.toObject();
    
    // Verificar estado de suscripción
    const subscriptionInfo = client.isSubscriptionActive();
    clientObj.subscriptionActive = subscriptionInfo.isActive;
    clientObj.subscriptionReason = subscriptionInfo.reason;
    
    // Verificar si tiene solicitud de renovación pendiente
    const pendingRenewal = await SubscriptionRenewalRequest.findOne({
      clientId: client._id,
      status: { $in: ['pending', 'in_progress'] }
    })
    .select('requestType urgency createdAt status message contactPreference')
    .populate('requestedBy', 'name email');
    
    clientObj.hasPendingRenewal = !!pendingRenewal;
    clientObj.pendingRenewalInfo = pendingRenewal;
    
    return res.status(200).json({
      status: 'success',
      data: {
        client: clientObj
      }
    });
  });

  // Actualizar un cliente
  updateClient = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const { name, contactEmail, domains, subscription, fiscalInfo } = req.body;
    
    const client = await Client.findById(clientId);
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Actualizar campos básicos
    if (name) client.name = name;
    if (contactEmail) {
      client.contactEmail = contactEmail;
      client.email = contactEmail; // Actualizar email junto con contactEmail
    }
    if (domains) client.domains = domains;
    
    // Actualizar información fiscal
    if (fiscalInfo) {
      client.fiscalInfo = {
        ...client.fiscalInfo || {},
        ...fiscalInfo
      };
    }
    
    // Actualizar suscripción si se proporciona
    if (subscription) {
      if (subscription.plan) client.subscription.plan = subscription.plan;
      if (subscription.maxUsers) client.subscription.maxUsers = subscription.maxUsers;
      
      // Manejar fechas de suscripción
      if (subscription.startDate) {
        client.subscription.startDate = new Date(subscription.startDate);
      }
      
      // Manejar suscripción ilimitada
      if (typeof subscription.isUnlimited === 'boolean') {
        client.subscription.isUnlimited = subscription.isUnlimited;
        
        if (subscription.isUnlimited) {
          client.subscription.endDate = new Date(2099, 11, 31);
        } else if (subscription.endDate) {
          client.subscription.endDate = new Date(subscription.endDate);
        }
      } else if (subscription.endDate) {
        client.subscription.endDate = new Date(subscription.endDate);
      }
    }
    
    // Guardar cambios
    await client.save();
    
    return res.status(200).json({
      status: 'success',
      data: {
        client
      }
    });
  });

  // Cambiar estado de un cliente
  toggleClientStatus = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return next(new AppError('Estado no válido', 400));
    }
    
    const client = await Client.findByIdAndUpdate(
      clientId,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Si el cliente está inactivo o suspendido, también inactivar a sus usuarios
    if (status !== 'active') {
      await UserAccount.updateMany(
        { clientId },
        { status: 'inactive' }
      );
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        client
      }
    });
  });

  // Obtener métricas de un cliente
  getClientMetrics = catchAsync(async (req, res, next) => {
    const { clientId } = req.params;
    
    const client = await Client.findById(clientId)
      .populate('subscription.planId', 'name description features');
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Contar usuarios del cliente
    const usersCount = await UserAccount.countDocuments({ clientId });
    
    // Calcular días restantes de suscripción
    const daysRemaining = client.subscription.isUnlimited ? 
      'Ilimitado' : 
      Math.ceil((new Date(client.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    // Verificar límites actuales
    const subscriptionLimits = await client.checkSubscriptionLimits();
    
    // Obtener información del plan si está disponible
    let planInfo = null;
    if (client.subscription.planId) {
      planInfo = {
        id: client.subscription.planId._id,
        name: client.subscription.planId.name,
        description: client.subscription.planId.description,
        features: client.subscription.planId.features
      };
    }
    
    // Obtener otros datos de uso
    const metrics = {
      users: {
        total: usersCount,
        active: await UserAccount.countDocuments({ clientId, status: 'active' }),
        limit: client.subscription.maxUsers,
        canAddMore: subscriptionLimits.canAddMoreUsers
      },
      subscription: {
        plan: client.subscription.plan,
        planInfo,
        daysRemaining,
        isUnlimited: client.subscription.isUnlimited,
        features: client.subscription.features
      },
      domains: {
        count: client.domains.length,
        list: client.domains,
        canAddMore: subscriptionLimits.canAddMoreDomains
      },
      fiscalInfo: client.fiscalInfo || {}
    };
    
    return res.status(200).json({
      status: 'success',
      data: {
        metrics
      }
    });
  });

  /**
   * Cancelar suscripción de un cliente (solo para owners)
   */
  cancelSubscription = catchAsync(async (req, res) => {
    const { clientId } = req.params;
    const { reason, cancelImmediately = false } = req.body;

    // Verificar que solo owners puedan cancelar suscripciones
    if (req.user.role !== 'owner') {
      throw new AppError('Solo los owners pueden cancelar suscripciones', 403);
    }

    // Buscar el cliente
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado', 404);
    }

    // Verificar que la suscripción esté activa
    const subscriptionStatus = client.isSubscriptionActive();
    if (!subscriptionStatus.isActive && subscriptionStatus.reason !== 'NOT_STARTED') {
      throw new AppError('La suscripción ya está inactiva', 400);
    }

    // Guardar información de la cancelación
    const cancellationInfo = {
      cancelledAt: new Date(),
      cancelledBy: req.user._id,
      reason: reason || 'Cancelación manual por owner',
      originalEndDate: client.subscription.endDate,
      cancelImmediately
    };

    if (cancelImmediately) {
      // Cancelación inmediata
      client.subscription.endDate = new Date();
      client.subscription.status = 'cancelled';
      client.status = 'inactive';
    } else {
      // Cancelar al final del período actual
      client.subscription.status = 'cancelled';
      // Mantener endDate original para que termine naturalmente
    }

    // Agregar información de cancelación
    client.subscription.cancellation = cancellationInfo;

    await client.save();

    // Registrar en auditoría (no-blocking)
    try {
      await auditService.logAction({
        clientId,
        userId: req.user._id,
        action: 'cancel_subscription',
        resourceType: 'client',
        resourceId: clientId,
        metadata: {
          cancellationType: cancelImmediately ? 'immediate' : 'end_of_period',
          reason,
          originalEndDate: cancellationInfo.originalEndDate
        }
      });
    } catch (auditError) {
      logger.error('Error logging audit action for subscription cancellation:', auditError);
      // No fallar la operación principal por errores de auditoría
    }

    res.status(200).json({
      status: 'success',
      message: cancelImmediately 
        ? 'Suscripción cancelada inmediatamente' 
        : 'Suscripción programada para cancelar al final del período',
      data: {
        client: {
          id: client._id,
          companyName: client.companyName,
          subscription: client.subscription
        }
      }
    });
  });

  /**
   * Reactivar suscripción de un cliente (solo para owners)
   */
  reactivateSubscription = catchAsync(async (req, res) => {
    const { clientId } = req.params;
    const { extendDays = 30 } = req.body;

    // Verificar que solo owners puedan reactivar suscripciones
    if (req.user.role !== 'owner') {
      throw new AppError('Solo los owners pueden reactivar suscripciones', 403);
    }

    // Buscar el cliente
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado', 404);
    }

    // Verificar que la suscripción esté inactiva
    const subscriptionStatus = client.isSubscriptionActive();
    if (subscriptionStatus.isActive) {
      throw new AppError('La suscripción ya está activa', 400);
    }

    const now = new Date();
    let newEndDate;

    // Determinar nueva fecha de fin según el estado actual
    if (subscriptionStatus.reason === 'CANCELLED' || subscriptionStatus.reason === 'EXPIRED') {
      // Si estaba cancelada o expirada, extender desde ahora
      newEndDate = new Date(now.getTime() + (extendDays * 24 * 60 * 60 * 1000));
    } else if (subscriptionStatus.reason === 'NOT_STARTED') {
      // Si no había empezado, mantener la duración original pero empezar ahora
      const originalDuration = client.subscription.endDate 
        ? new Date(client.subscription.endDate) - new Date(client.subscription.startDate)
        : extendDays * 24 * 60 * 60 * 1000;
      newEndDate = new Date(now.getTime() + originalDuration);
    } else {
      // Para otros casos, extender desde ahora
      newEndDate = new Date(now.getTime() + (extendDays * 24 * 60 * 60 * 1000));
    }

    // Guardar información de la reactivación
    const reactivationInfo = {
      reactivatedAt: now,
      reactivatedBy: req.user._id,
      previousStatus: client.subscription.status,
      previousEndDate: client.subscription.endDate,
      newEndDate,
      extendedDays: extendDays
    };

    // Reactivar la suscripción
    client.subscription.status = 'active';
    client.subscription.startDate = now;
    client.subscription.endDate = newEndDate;
    client.status = 'active';

    // Agregar información de reactivación
    client.subscription.reactivation = reactivationInfo;

    // Limpiar información de cancelación si existe
    if (client.subscription.cancellation) {
      client.subscription.previousCancellation = client.subscription.cancellation;
      delete client.subscription.cancellation;
    }

    await client.save();

    // Buscar y completar solicitudes de renovación pendientes
    try {
      const pendingRenewalRequest = await SubscriptionRenewalRequest.findOne({
        clientId: client._id,
        status: { $in: ['pending', 'in_progress'] }
      }).populate('requestedBy', 'name email');

      if (pendingRenewalRequest) {
        console.log(`🔄 Completando solicitud de renovación pendiente: ${pendingRenewalRequest._id}`);
        
        // Actualizar la solicitud como completada
        pendingRenewalRequest.status = 'completed';
        pendingRenewalRequest.resolvedAt = now;
        pendingRenewalRequest.resolvedBy = req.user._id;
        pendingRenewalRequest.adminNotes = `Suscripción reactivada automáticamente por ${req.user.name}. Extendida por ${extendDays} días hasta ${newEndDate.toLocaleDateString('es-ES')}.`;
        
        await pendingRenewalRequest.save();
        
        // Enviar email de confirmación al cliente
        try {
          const planName = typeof client.subscription.plan === 'object' 
            ? client.subscription.plan.name 
            : (client.subscription.plan || 'Básico');
          
          const features = [];
          if (client.subscription.planId && client.subscription.planId.features) {
            const planFeatures = client.subscription.planId.features;
            if (planFeatures.autoTranslate) features.push('Traducción automática de banners');
            if (planFeatures.cookieScanning) features.push('Escaneo automático de cookies');
            if (planFeatures.customization) features.push('Personalización avanzada de banners');
          }
          
          const clientEmail = client.contactEmail || client.email;
          const requestedByEmail = pendingRenewalRequest.requestedBy?.email;
          
          if (clientEmail || requestedByEmail) {
            console.log(`📧 Enviando email de confirmación de renovación a: ${requestedByEmail || clientEmail}`);
            
            await emailService.sendRenewalSuccessNotification({
              to: requestedByEmail || clientEmail,
              clientName: client.name,
              planName: planName,
              endDate: newEndDate,
              features: features,
              requestType: pendingRenewalRequest.requestType
            });
            
            console.log(`✅ Email de confirmación enviado exitosamente`);
          } else {
            console.warn('⚠️ No se encontró email para enviar confirmación');
          }
        } catch (emailError) {
          console.error('❌ Error enviando email de confirmación:', emailError);
          // No fallar la operación principal por errores de email
        }
      }
    } catch (renewalError) {
      console.error('❌ Error procesando solicitud de renovación:', renewalError);
      // No fallar la operación principal por errores en el procesamiento de renovación
    }

    // Registrar en auditoría (no-blocking)
    try {
      await auditService.logAction({
        clientId,
        userId: req.user._id,
        action: 'reactivate_subscription',
        resourceType: 'client',
        resourceId: clientId,
        metadata: {
          previousStatus: reactivationInfo.previousStatus,
          newEndDate: newEndDate.toISOString(),
          extendedDays: extendDays,
          previousEndDate: reactivationInfo.previousEndDate
        }
      });
    } catch (auditError) {
      logger.error('Error logging audit action for subscription reactivation:', auditError);
      // No fallar la operación principal por errores de auditoría
    }

    res.status(200).json({
      status: 'success',
      message: `Suscripción reactivada exitosamente hasta ${newEndDate.toLocaleDateString('es-ES')}`,
      data: {
        client: {
          id: client._id,
          companyName: client.companyName,
          subscription: client.subscription
        }
      }
    });
  });
}

module.exports = new ClientController();