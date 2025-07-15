// controllers/UserController.js
const UserAccount = require('../models/UserAccount');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const emailService = require('../services/email.service');
const invitationProcessor = require('../processors/invitationProcessor');
const logger = require('../utils/logger');

class UserController {
  // Obtener todos los usuarios
  getUsers = catchAsync(async (req, res, next) => {
    const { status, role, search, clientId, page = 1, limit = 10 } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (status) filters.status = status;
    if (role) filters.role = role;
    
    // Búsqueda por nombre o email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Filtrar por cliente si no es owner o si se especifica un clientId como owner
    if (req.user.role !== 'owner') {
      // Si no es owner, solo puede ver usuarios de su propio cliente
      filters.clientId = req.user.clientId;
    } else if (clientId) {
      // Si es owner y especifica un clientId, filtrar por ese cliente
      filters.clientId = clientId;
    }
    
    logger.info('Obteniendo usuarios con filtros:', filters);
    logger.info('Usuario que hace la solicitud:', {
      id: req.user._id,
      role: req.user.role,
      clientId: req.user.clientId
    });
    
    // Calcular paginación
    const skip = (page - 1) * limit;
    
    // Obtener usuarios con populate para obtener nombre del cliente
    const users = await UserAccount.find(filters)
      .select('-password -security')
      .populate('clientId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    
    // Contar total para paginación
    const total = await UserAccount.countDocuments(filters);
    
    // Procesar usuarios para agregar clientName
    const processedUsers = users.map(user => {
      const userObj = user.toObject();
      if (userObj.clientId && typeof userObj.clientId === 'object') {
        userObj.clientName = userObj.clientId.name;
      }
      return userObj;
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        users: processedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Obtener un usuario específico
  getUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    
    const user = await UserAccount.findById(userId)
      .select('-password -security')
      .populate('clientId', 'name');
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar permisos (solo owner o usuarios del mismo cliente)
    // if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
    //   return next(new AppError('No tienes permiso para ver este usuario', 403));
    // }
    
    // Agregar clientName al objeto de usuario
    const userObj = user.toObject();
    if (userObj.clientId && typeof userObj.clientId === 'object') {
      userObj.clientName = userObj.clientId.name;
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: userObj
      }
    });
  });

  // Crear un nuevo usuario
  createUser = catchAsync(async (req, res, next) => {
    const { name, email, role, clientId, password, sendInvitation = true } = req.body;
    
    logger.info(`Creando nuevo usuario: ${email} (enviar invitación: ${sendInvitation})`);
    console.log(`👤 Creando nuevo usuario: ${email} (enviar invitación: ${sendInvitation})`);
    
    // Verificar permisos
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return next(new AppError('No tienes permiso para crear usuarios', 403));
    }
    
    // CORRECCIÓN #1: Manejo especial para rol "owner"
    // Los usuarios owner no necesitan clientId
    let userClientId = clientId;
    if (role === 'owner') {
      // Si se está creando un owner, el clientId debe ser null
      userClientId = null;
      console.log(`🔔 Rol owner seleccionado: se establecerá clientId=null`);
    } else if (!userClientId && req.user.role === 'admin') {
      // Si no es owner y no se proporciona clientId, usar el del admin
      userClientId = req.user.clientId;
      logger.info(`ClientId no proporcionado, usando el del admin: ${userClientId}`);
      console.log(`ℹ️ ClientId no proporcionado, usando el del admin: ${userClientId}`);
    }
    
    // Si no es owner, solo puede crear usuarios para su propio cliente
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(userClientId)) {
      logger.warn(`Intento de crear usuario para cliente ${userClientId} pero el admin pertenece a ${req.user.clientId}`);
      console.warn(`⚠️ Intento de crear usuario para cliente ${userClientId} pero el admin pertenece a ${req.user.clientId}`);
      return next(new AppError('Solo puedes crear usuarios para tu propio cliente', 403));
    }
    
    // Verificar si el email ya existe
    const existingUser = await UserAccount.findOne({ email });
    if (existingUser) {
      console.warn(`⚠️ Ya existe un usuario con email: ${email}`);
      return next(new AppError('Ya existe un usuario con ese email', 409));
    }
    
    // CORRECCIÓN #2: Solo validar cliente si no es owner
    let client = null;
    if (role !== 'owner' && userClientId) {
      // Validar que el cliente exista solo si no es owner
      client = await Client.findById(userClientId);
      if (!client) {
        console.error(`❌ Cliente no encontrado: ${userClientId}`);
        return next(new AppError('Cliente no encontrado', 404));
      }
      
      console.log(`🏢 Cliente encontrado: ${client.name} (${userClientId})`);
      
      // Verificar límites de usuarios si no es owner
      if (req.user.role !== 'owner') {
        try {
          const { canInvite, remainingSlots } = await UserAccount.checkUserLimits(client._id);
          if (!canInvite) {
            console.warn(`⚠️ Límite de usuarios alcanzado para cliente ${client.name}`);
            return next(new AppError(`Límite de usuarios alcanzado. Máximo: ${client.subscription.maxUsers}`, 403));
          }
          console.log(`✅ Puede invitar usuarios. Slots restantes: ${remainingSlots}`);
        } catch (error) {
          console.error(`❌ Error al verificar límites: ${error.message}`);
          return next(new AppError(error.message, 403));
        }
      }
    } else if (role !== 'owner') {
      console.error(`❌ Se requiere clientId para usuarios que no son owner`);
      return next(new AppError('Se requiere clientId para usuarios que no son owner', 400));
    } else {
      console.log(`ℹ️ Usuario owner no requiere cliente asociado`);
    }
    
    // Preparar datos del usuario
    const userData = {
      name,
      email,
      role: role || 'viewer', // Valor por defecto: viewer
      clientId: userClientId, // Será null para owners
      status: sendInvitation ? 'pending' : 'active'
    };
    
    // Si no se envía invitación, la contraseña es requerida
    if (!sendInvitation) {
      if (!password) {
        console.error(`❌ Falta contraseña para usuario sin invitación`);
        return next(new AppError('La contraseña es requerida si no se envía invitación', 400));
      }
      userData.password = password;
      console.log(`🔑 Configurando contraseña para usuario sin invitación`);
    }
    
    logger.info(`Creando usuario con datos: ${JSON.stringify({
      ...userData,
      password: password ? '********' : undefined
    })}`);
    
    console.log(`📝 Creando usuario:`);
    console.log(`  - Nombre: ${userData.name}`);
    console.log(`  - Email: ${userData.email}`);
    console.log(`  - Rol: ${userData.role}`);
    console.log(`  - Cliente: ${client ? client.name : (role === 'owner' ? 'N/A (Owner)' : 'Desconocido')}`);
    console.log(`  - Estado: ${userData.status}`);
    
    // Crear usuario
    const user = await UserAccount.create(userData);
    logger.info(`Usuario creado con ID: ${user._id}`);
    console.log(`✅ Usuario creado con ID: ${user._id}`);
    
    // Si se debe enviar invitación, generar token y enviar correo
    let invitationResult = null;
    let invitationToken = null; // CORRECCIÓN #3: Declarar aquí para usar en la respuesta
    
    if (sendInvitation) {
      try {
        // Generar token de invitación
        console.log(`🔑 Generando token de invitación para ${email}`);
        invitationToken = user.createInvitationToken(); // CORRECCIÓN: Guardar la referencia
        await user.save();
        logger.info(`Token de invitación generado para ${email}`);
        console.log(`✅ Token generado: ${invitationToken.substring(0, 8)}...`);
        
        // Implementación real del envío de correo
        console.log(`📧 Preparando envío de invitación a ${email}`);
        
        // Usar emailService directamente con sendDirect=true
        console.log(`📤 Enviando email de invitación directamente`);
        invitationResult = await emailService.sendInvitationEmail({
          email,
          name,
          invitationToken,
          clientName: client ? client.name : (role === 'owner' ? 'Cookie21' : 'la plataforma'),
          role: userData.role,
          sendDirect: true // Forzar envío directo
        });
        
        console.log(`📨 Resultado del envío:`, invitationResult);
        
        if (invitationResult.success) {
          logger.info(`Email de invitación enviado directamente a ${email}`);
          console.log(`✅ Email de invitación enviado correctamente a ${email}`);
          
          if (invitationResult.previewUrl) {
            console.log(`🔍 Previsualización: ${invitationResult.previewUrl}`);
          }
        } else {
          logger.warn(`Error al enviar email de invitación directamente: ${invitationResult.error}`);
          console.error(`❌ Error al enviar email de invitación: ${invitationResult.error}`);
          if (invitationResult.details) {
            console.error('Detalles del error:', invitationResult.details);
          }
        }
      } catch (error) {
        logger.warn(`Error al generar/enviar invitación: ${error.message}`, { error });
        console.error(`❌ Error al generar/enviar invitación: ${error.message}`);
        console.error(error);
        // No bloqueamos la creación del usuario si falla el envío
      }
    }
    
    // Construir la respuesta
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        clientId: user.clientId
      }
    };
    
    // Agregar información de invitación si corresponde
    if (sendInvitation) {
      // Construir la URL de invitación para incluirla en la respuesta
      let inviteUrl = null;
      if (invitationToken) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        inviteUrl = `${frontendUrl}/invitacion/${invitationToken}`;
      }
      
      responseData.invitation = invitationResult ? {
        sent: invitationResult.success,
        message: invitationResult.success ? 
          'Invitación enviada al usuario' : 
          `Error al enviar invitación: ${invitationResult.error}`,
        url: inviteUrl,
        previewUrl: invitationResult.previewUrl
      } : {
        sent: false,
        message: 'No se pudo procesar la invitación'
      };
      
      responseData.message = invitationResult && invitationResult.success ? 
        'Invitación enviada al usuario' : 
        'Usuario creado pero hubo un problema al enviar la invitación';
    } else {
      responseData.message = 'Usuario creado con acceso inmediato';
    }
    
    return res.status(201).json({
      status: 'success',
      data: responseData
    });
  });

  // Actualizar usuario
  updateUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { name, role, preferences } = req.body;
    
    // Obtener el usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar permisos
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      return next(new AppError('No tienes permiso para actualizar este usuario', 403));
    }
    
    // Los admin solo pueden actualizar usuarios que no sean admin u owner
    if (req.user.role === 'admin' && (user.role === 'admin' || user.role === 'owner')) {
      return next(new AppError('No puedes modificar usuarios con el mismo o mayor nivel de permisos', 403));
    }
    
    // Actualizar campos
    if (name) user.name = name;
    
    // Solo owner puede cambiar a alguien a role admin
    if (role) {
      if (role === 'admin' && req.user.role !== 'owner') {
        return next(new AppError('Solo los owners pueden asignar el rol de admin', 403));
      }
      
      // Nunca permitir cambiar a alguien a owner
      if (role === 'owner') {
        return next(new AppError('No se puede asignar el rol de owner', 403));
      }
      
      user.role = role;
    }
    
    // Actualizar preferencias si se proporcionan
    if (preferences) {
      logger.info('Actualizando preferencias del usuario:', {
        userId,
        preferences,
        existingPreferences: user.preferences
      });
      
      // Convertir a objeto plano si es un documento Mongoose
      const existingPrefs = user.preferences && user.preferences.toObject 
        ? user.preferences.toObject() 
        : (user.preferences || {});
      
      // Mezcla profunda de preferencias
      const mergedPreferences = {
        language: preferences.language || existingPrefs.language || 'es',
        theme: preferences.theme || existingPrefs.theme || 'system',
        notifications: {
          email: preferences.notifications?.email !== undefined 
            ? preferences.notifications.email 
            : (existingPrefs.notifications?.email ?? true),
          push: preferences.notifications?.push !== undefined 
            ? preferences.notifications.push 
            : (existingPrefs.notifications?.push ?? true),
          clientCreation: {
            enabled: preferences.notifications?.clientCreation?.enabled !== undefined
              ? preferences.notifications.clientCreation.enabled
              : (existingPrefs.notifications?.clientCreation?.enabled ?? false),
            emailAddress: preferences.notifications?.clientCreation?.emailAddress !== undefined
              ? preferences.notifications.clientCreation.emailAddress
              : (existingPrefs.notifications?.clientCreation?.emailAddress || '')
          }
        }
      };
      
      // Asignar las preferencias mezcladas
      user.preferences = mergedPreferences;
      
      logger.info('Preferencias después de la actualización:', user.preferences);
    }
    
    // Marcar el campo preferences como modificado para asegurar que Mongoose lo guarde
    user.markModified('preferences');
    
    // Guardar cambios
    await user.save();
    
    // Recargar el usuario para asegurar que tenemos los datos actualizados
    const updatedUser = await UserAccount.findById(userId).select('-password -security');
    
    logger.info('Usuario después de guardar:', {
      userId: updatedUser._id,
      preferences: updatedUser.preferences
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          preferences: updatedUser.preferences
        }
      }
    });
  });

  // Cambiar estado del usuario
  toggleUserStatus = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return next(new AppError('Estado no válido', 400));
    }
    
    // Obtener usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar permisos
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      return next(new AppError('No tienes permiso para modificar este usuario', 403));
    }
    
    // No permitir cambiar el estado de usuarios owner
    if (user.role === 'owner') {
      return next(new AppError('No se puede cambiar el estado de un usuario owner', 403));
    }
    
    // Los admin solo pueden modificar usuarios con menos permisos
    if (req.user.role === 'admin' && user.role === 'admin') {
      return next(new AppError('No puedes modificar usuarios con el mismo nivel de permisos', 403));
    }
    
    // Actualizar estado
    user.status = status;
    await user.save();
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  });

  // Reenviar invitación para un usuario pendiente
  resendInvitation = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    
    logger.info(`Solicitud de reenvío de invitación para usuario: ${userId}`);
    console.log(`📧 Solicitud de reenvío de invitación para usuario: ${userId}`);
    
    // Verificar permisos
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return next(new AppError('No tienes permiso para reenviar invitaciones', 403));
    }
    
    // Obtener usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      console.error(`❌ Usuario no encontrado: ${userId}`);
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    console.log(`👤 Usuario encontrado: ${user.email} (${user.name})`);
    
    // Verificar que el usuario esté en estado pendiente
    if (user.status !== 'pending') {
      console.warn(`⚠️ Intento de reenviar invitación a usuario no pendiente: ${user.email}`);
      return next(new AppError('Solo se pueden reenviar invitaciones a usuarios pendientes', 400));
    }
    
    // Verificar permisos para no-owners
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      console.warn(`⚠️ Intento de acceso no autorizado: ${req.user.email} -> ${user.email}`);
      return next(new AppError('No tienes permiso para reenviar invitaciones a este usuario', 403));
    }
    
    // Regenerar token si no existe o está por expirar
    let invitationToken = null;
    const shouldRegenerateToken = !user.security?.invitationToken || 
                               !user.security?.invitationExpires || 
                               user.security.invitationExpires < new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    if (shouldRegenerateToken) {
      console.log(`🔑 Regenerando token de invitación para ${user.email}`);
      invitationToken = user.createInvitationToken();
      await user.save();
      logger.info(`Token de invitación regenerado para ${user.email}`);
      console.log(`✅ Token regenerado: ${invitationToken.substring(0, 8)}...`);
    } else {
      // Siempre regeneramos el token para mayor seguridad y para tener acceso al valor no hasheado
      console.log(`🔑 Regenerando token de invitación para ${user.email} por seguridad`);
      invitationToken = user.createInvitationToken();
      await user.save();
      console.log(`✅ Token regenerado: ${invitationToken.substring(0, 8)}...`);
    }
    
    // Obtener información del cliente
    let clientName = 'la plataforma';
    if (user.clientId) {
      try {
        const client = await Client.findById(user.clientId);
        if (client) {
          clientName = client.name;
          console.log(`🏢 Cliente encontrado: ${clientName}`);
        } else {
          console.warn(`⚠️ Cliente no encontrado: ${user.clientId}`);
        }
      } catch (clientError) {
        console.error(`❌ Error al buscar cliente: ${clientError.message}`);
        // Continuamos con el nombre predeterminado
      }
    }
    
    // CAMBIO IMPORTANTE: Enviar email directamente con el servicio de email
    console.log(`📧 Enviando email de invitación a ${user.email}...`);
    
    const result = await emailService.sendInvitationEmail({
      email: user.email,
      name: user.name,
      invitationToken, // Usar el token recién generado
      clientName,
      role: user.role,
      sendDirect: true // Forzar envío directo
    });
    
    console.log(`📨 Resultado del envío:`, result);
    
    if (!result.success) {
      console.error(`❌ Error al enviar email: ${result.error}`);
      if (result.details) {
        console.error('Detalles del error:', result.details);
      }
      return next(new AppError(`Error al procesar invitación: ${result.error}`, 500));
    }
    
    console.log(`✅ Email reenviado correctamente a ${user.email}`);
    
    // Construir la URL de invitación para incluirla en la respuesta
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/invitacion/${invitationToken}`;
    
    return res.status(200).json({
      status: 'success',
      message: 'Invitación reenviada exitosamente',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        invitation: {
          sent: true,
          method: 'direct',
          url: inviteUrl,
          previewUrl: result.previewUrl
        }
      }
    });
  });

  // Actualizar permisos personalizados
  updatePermissions = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { permissions } = req.body;
    
    // Obtener usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar permisos
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      return next(new AppError('No tienes permiso para modificar este usuario', 403));
    }
    
    // No permitir modificar permisos de owners o admins
    if (user.role === 'owner' || user.role === 'admin') {
      return next(new AppError('No se pueden modificar permisos de usuarios owner o admin', 403));
    }
    
    // Actualizar permisos
    user.customPermissions = {
      enabled: true,
      permissions
    };
    
    await user.save();
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          customPermissions: user.customPermissions
        }
      }
    });
  });

  // Actualizar preferencias de usuario
  updatePreferences = catchAsync(async (req, res, next) => {
    const { preferences } = req.body;
    
    // Solo el propio usuario puede actualizar sus preferencias
    const user = await UserAccount.findById(req.userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Actualizar preferencias
    user.preferences = {
      ...user.preferences,
      ...preferences
    };
    
    await user.save();
    
    return res.status(200).json({
      status: 'success',
      data: {
        preferences: user.preferences
      }
    });
  });

  changePassword = catchAsync(async (req, res, next) => {
    const { userId, currentPassword, newPassword } = req.body;
    
    console.log('🔎 [DEBUG] userId desde el request:', userId);
    console.log('🔎 [DEBUG] currentPassword recibido:', currentPassword);
    console.log('🔎 [DEBUG] newPassword recibido:', newPassword);
  
    const isSelfUpdate = String(req.userId) === String(userId);
    const isAuthorized = req.user.role === 'owner' || (req.user.role === 'admin' && isSelfUpdate);
  
    console.log('🔎 [DEBUG] ¿Es self-update?', isSelfUpdate);
    console.log('🔎 [DEBUG] ¿Está autorizado?', isAuthorized);
  
    if (!isSelfUpdate && !isAuthorized) {
      console.log('⛔ [DEBUG] No autorizado a cambiar contraseña');
      return next(new AppError('No tienes permiso para cambiar la contraseña de este usuario', 403));
    }
  
    // MUY IMPORTANTE: incluir la contraseña usando .select('+password')
    const user = await UserAccount.findById(userId).select('+password');
  
    if (!user) {
      console.log('⛔ [DEBUG] Usuario no encontrado en la base de datos');
      return next(new AppError('Usuario no encontrado', 404));
    }
  
    console.log('🔎 [DEBUG] Usuario encontrado:', user.email);
  
    if (req.user.role === 'admin' && !isSelfUpdate && String(req.user.clientId) !== String(user.clientId)) {
      console.log('⛔ [DEBUG] Admin tratando de cambiar password de otro cliente');
      return next(new AppError('No puedes cambiar la contraseña de usuarios de otro cliente', 403));
    }
  
    if (user.role === 'owner' && req.user.role !== 'owner') {
      console.log('⛔ [DEBUG] Intento de cambiar contraseña de un owner sin ser owner');
      return next(new AppError('Solo un owner puede cambiar la contraseña de otro owner', 403));
    }
  
    if (isSelfUpdate) {
      console.log('🔎 [DEBUG] Verificando contraseña actual...');
      const isPasswordCorrect = await user.verifyPassword(currentPassword);
      console.log('🔎 [DEBUG] ¿Contraseña actual correcta?', isPasswordCorrect);
  
      if (!isPasswordCorrect) {
        return next(new AppError('La contraseña actual es incorrecta', 401));
      }
    }
  
    if (!newPassword || newPassword.length < 8) {
      console.log('⛔ [DEBUG] Nueva contraseña inválida');
      return next(new AppError('La nueva contraseña debe tener al menos 8 caracteres', 400));
    }
  
    console.log('🔎 [DEBUG] Actualizando contraseña...');
    user.password = newPassword;
  
    if (user.security) {
      user.security.passwordResetToken = undefined;
      user.security.passwordResetExpires = undefined;
  
      if (user.status !== 'pending') {
        user.security.invitationToken = undefined;
        user.security.invitationExpires = undefined;
      }
    }
  
    if (!user.accessControl) {
      user.accessControl = {};
    }
  
    user.accessControl.passwordChangedAt = new Date();
  
    await user.save();
  
    if (!isSelfUpdate) {
      console.log(`✅ [DEBUG] Contraseña cambiada por admin/owner para ${user.email}`);
    } else {
      console.log('✅ [DEBUG] Contraseña cambiada por el propio usuario');
    }
  
    return res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });
  });
  
}

module.exports = new UserController();