// controllers/ClientController.js
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const nodemailer = require('nodemailer');
const emailService = require('../services/email.service');
const consentScriptGenerator = require('../services/consentScriptGenerator.service');
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
      
      await client.save();
      logger.info(`Suscripción del cliente ${client.name} (${client._id}) actualizada manualmente`);
    }
    
    const updatedClient = await Client.findById(clientId)
      .populate('subscription.planId', 'name description');
    
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
    const { status, plan, search, page = 1, limit = 10 } = req.query;
    
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
    
    // Obtener clientes
    const clients = await Client.find(filters)
      .select('-apiKeys')
      .populate('subscription.planId', 'name description')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    
    // Contar total para paginación
    const total = await Client.countDocuments(filters);
    
    return res.status(200).json({
      status: 'success',
      data: {
        clients,
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
      .populate('subscription.planId', 'name description features');
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        client
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
}

module.exports = new ClientController();