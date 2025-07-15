// middleware/subscriptionCheck.js
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

/**
 * Middleware para verificar que la suscripción del cliente esté activa
 * Se puede usar en rutas que requieren suscripción válida
 */
exports.requireActiveSubscription = catchAsync(async (req, res, next) => {
  // Los usuarios owner no necesitan verificación de suscripción
  if (req.user && req.user.role === 'owner') {
    console.log('🔓 Skipping subscription check for owner user');
    return next();
  }
  
  console.log('🔒 Checking subscription for user:', {
    role: req.user?.role,
    clientId: req.clientId,
    userType: req.userType
  });
  
  let client = null;
  
  console.log('🔍 Looking for client with options:', {
    hasReqClient: !!req.client,
    paramsClientId: req.params.clientId,
    userClientId: req.user?.clientId,
    reqClientId: req.clientId
  });
  
  // Siempre intentar obtener el cliente desde la base de datos para asegurar que sea un documento Mongoose
  let clientId = null;
  
  if (req.params.clientId) {
    console.log('🎯 Using params.clientId:', req.params.clientId);
    clientId = req.params.clientId;
  }
  else if (req.user && req.user.clientId) {
    console.log('👤 Using user.clientId:', req.user.clientId);
    clientId = req.user.clientId;
  }
  else if (req.clientId) {
    console.log('🔑 Using req.clientId:', req.clientId);
    clientId = req.clientId;
  }
  else if (req.client && req.client._id) {
    console.log('📋 Using existing req.client._id:', req.client._id);
    clientId = req.client._id;
  }
  
  if (clientId) {
    console.log('🔍 Fetching client from database with ID:', clientId);
    client = await Client.findById(clientId);
  }
  
  console.log('🎪 Client found result:', {
    clientFound: !!client,
    clientId: client?._id,
    clientStatus: client?.status
  });
  
  if (!client) {
    console.log('❌ Client not found for subscription check:', {
      hasReqClient: !!req.client,
      hasParamsClientId: !!req.params.clientId,
      hasUserClientId: !!req.user?.clientId,
      clientId: req.clientId
    });
    return next(new AppError('Cliente no encontrado para verificar suscripción', 404));
  }
  
  // Verificar que el cliente tenga el método necesario
  if (!client || typeof client.isSubscriptionActive !== 'function') {
    console.log('❌ Client invalid or missing isSubscriptionActive method');
    return next(new AppError('Cliente no válido o no encontrado', 404));
  }
  
  // Verificar el estado de la suscripción
  const subscriptionStatus = client.isSubscriptionActive();
  
  console.log('📊 Subscription status check:', {
    isActive: subscriptionStatus.isActive,
    reason: subscriptionStatus.reason,
    message: subscriptionStatus.message
  });
  
  if (!subscriptionStatus.isActive) {
    const errorMessages = {
      'CLIENT_INACTIVE': 'Tu cuenta está inactiva. Contacta al administrador para reactivarla.',
      'NOT_STARTED': 'Tu suscripción aún no ha comenzado. Verifica las fechas de tu plan.',
      'EXPIRED': 'Tu suscripción ha expirado. Renueva tu plan para continuar accediendo a todas las funcionalidades.',
      'CANCELLED': 'Tu suscripción ha sido cancelada. Reactiva tu plan para continuar usando el servicio.',
      'SUSPENDED': 'Tu cuenta ha sido suspendida. Contacta al soporte técnico para más información.'
    };
    
    const message = errorMessages[subscriptionStatus.reason] || subscriptionStatus.message;
    
    console.log('🚫 Blocking request due to inactive subscription:', {
      reason: subscriptionStatus.reason,
      message,
      clientId: client._id
    });
    
    return next(new AppError(message, 403, {
      code: 'SUBSCRIPTION_INACTIVE',
      reason: subscriptionStatus.reason,
      details: subscriptionStatus
    }));
  }
  
  // Agregar información de suscripción al request para uso posterior
  req.subscriptionStatus = subscriptionStatus;
  req.client = client;
  
  console.log('✅ Subscription check passed, proceeding to controller');
  next();
});

/**
 * Middleware que permite acceso de solo lectura cuando la suscripción está inactiva
 * Para rutas GET, permite el acceso pero marca la suscripción como inactiva
 * Para rutas POST/PUT/PATCH/DELETE, bloquea el acceso
 */
exports.checkSubscriptionWithReadOnlyMode = catchAsync(async (req, res, next) => {
  // Los usuarios owner no necesitan verificación de suscripción
  if (req.user && req.user.role === 'owner') {
    console.log('🔓 Skipping subscription check for owner user');
    return next();
  }
  
  console.log('🔒 Checking subscription with read-only mode for:', {
    method: req.method,
    role: req.user?.role,
    clientId: req.clientId,
    userType: req.userType
  });
  
  let client = null;
  let clientId = null;
  
  if (req.params.clientId) {
    clientId = req.params.clientId;
  }
  else if (req.user && req.user.clientId) {
    clientId = req.user.clientId;
  }
  else if (req.clientId) {
    clientId = req.clientId;
  }
  else if (req.client && req.client._id) {
    clientId = req.client._id;
  }
  
  if (clientId) {
    client = await Client.findById(clientId);
  }
  
  if (!client) {
    console.log('❌ Client not found for subscription check');
    return next(new AppError('Cliente no encontrado para verificar suscripción', 404));
  }
  
  // Verificar que el cliente tenga el método necesario
  if (!client || typeof client.isSubscriptionActive !== 'function') {
    console.log('❌ Client invalid or missing isSubscriptionActive method');
    return next(new AppError('Cliente no válido o no encontrado', 404));
  }
  
  // Verificar el estado de la suscripción
  const subscriptionStatus = client.isSubscriptionActive();
  
  console.log('📊 Subscription status check (read-only mode):', {
    isActive: subscriptionStatus.isActive,
    reason: subscriptionStatus.reason,
    method: req.method
  });
  
  // Agregar información de suscripción al request
  req.subscriptionStatus = subscriptionStatus;
  req.client = client;
  
  if (!subscriptionStatus.isActive) {
    // Para métodos GET, permitir acceso pero marcar como inactiva
    if (req.method === 'GET') {
      console.log('📖 Allowing read-only access for inactive subscription');
      req.subscriptionInactive = true;
      req.subscriptionReason = subscriptionStatus.reason;
      req.subscriptionMessage = subscriptionStatus.message;
      return next();
    }
    
    // Para métodos de escritura (POST, PUT, PATCH, DELETE), bloquear
    const errorMessages = {
      'CLIENT_INACTIVE': 'Tu cuenta está inactiva. Contacta al administrador para reactivarla.',
      'NOT_STARTED': 'Tu suscripción aún no ha comenzado. Verifica las fechas de tu plan.',
      'EXPIRED': 'Tu suscripción ha expirado. Renueva tu plan para continuar accediendo a todas las funcionalidades.',
      'CANCELLED': 'Tu suscripción ha sido cancelada. Reactiva tu plan para continuar usando el servicio.',
      'SUSPENDED': 'Tu cuenta ha sido suspendida. Contacta al soporte técnico para más información.'
    };
    
    const message = errorMessages[subscriptionStatus.reason] || subscriptionStatus.message;
    
    console.log('🚫 Blocking write operation due to inactive subscription:', {
      reason: subscriptionStatus.reason,
      message,
      method: req.method
    });
    
    return next(new AppError(message, 403, {
      code: 'SUBSCRIPTION_INACTIVE',
      reason: subscriptionStatus.reason,
      details: subscriptionStatus,
      allowedMethods: ['GET']
    }));
  }
  
  console.log('✅ Subscription check passed (read-only mode)');
  next();
});

/**
 * Middleware más específico para el script de consentimiento
 * Verifica suscripción pero permite servir un mensaje de error en lugar de bloquear
 */
exports.checkSubscriptionForScript = catchAsync(async (req, res, next) => {
  const { clientId } = req.params;
  
  if (!clientId) {
    return next(new AppError('Client ID requerido', 400));
  }
  
  const client = await Client.findById(clientId);
  
  if (!client) {
    return next(new AppError('Cliente no encontrado', 404));
  }
  
  // Asegurar que el cliente sea un documento Mongoose con los métodos del esquema
  if (typeof client.isSubscriptionActive !== 'function') {
    client = await Client.findById(client._id || client.id);
    if (!client) {
      return next(new AppError('Cliente no encontrado en la base de datos', 404));
    }
  }
  
  const subscriptionStatus = client.isSubscriptionActive();
  
  // Agregar información al request
  req.client = client;
  req.subscriptionStatus = subscriptionStatus;
  
  // Si la suscripción no está activa, permitir continuar pero marcar como inactiva
  if (!subscriptionStatus.isActive) {
    req.subscriptionInactive = true;
    req.subscriptionReason = subscriptionStatus.reason;
  }
  
  next();
});

/**
 * Middleware para verificar límites de suscripción (usuarios, dominios, etc.)
 */
exports.checkSubscriptionLimits = (limitType) => {
  return catchAsync(async (req, res, next) => {
    // Los usuarios owner no tienen límites de suscripción
    if (req.user && req.user.role === 'owner') {
      return next();
    }
    
    const client = req.client || await Client.findById(req.params.clientId || req.user.clientId || req.clientId);
    
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Asegurar que el cliente sea un documento Mongoose con los métodos del esquema
    if (typeof client.isSubscriptionActive !== 'function') {
      client = await Client.findById(client._id || client.id);
      if (!client) {
        return next(new AppError('Cliente no encontrado en la base de datos', 404));
      }
    }
    
    // Primero verificar que la suscripción esté activa
    const subscriptionStatus = client.isSubscriptionActive();
    if (!subscriptionStatus.isActive) {
      return next(new AppError('Suscripción inactiva', 403));
    }
    
    // Verificar límites específicos
    const limits = await client.checkSubscriptionLimits();
    
    switch (limitType) {
      case 'users':
        if (!limits.canAddMoreUsers) {
          return next(new AppError(
            `Has alcanzado el límite de usuarios (${limits.currentUsers}/${limits.maxUsers}). Actualiza tu plan para agregar más usuarios.`,
            403,
            { code: 'USER_LIMIT_EXCEEDED' }
          ));
        }
        break;
        
      case 'domains':
        if (!limits.canAddMoreDomains) {
          return next(new AppError(
            `Has alcanzado el límite de dominios (${limits.currentDomains}/10). Actualiza tu plan para agregar más dominios.`,
            403,
            { code: 'DOMAIN_LIMIT_EXCEEDED' }
          ));
        }
        break;
    }
    
    req.subscriptionLimits = limits;
    next();
  });
};

/**
 * Middleware específico para rutas de script que verifica suscripción por domainId
 * Marca req.subscriptionInactive = true si está inactiva pero no bloquea la petición
 */
exports.checkSubscriptionForScript = catchAsync(async (req, res, next) => {
  const { domainId } = req.params;
  
  if (!domainId) {
    return next(new AppError('Domain ID requerido', 400));
  }
  
  try {
    // Obtener dominio
    const Domain = require('../models/Domain');
    const Client = require('../models/Client');
    
    console.log('🔍 Buscando dominio con ID:', domainId);
    const domain = await Domain.findById(domainId).populate('clientId');
    
    if (!domain) {
      console.log('❌ Dominio no encontrado:', domainId);
      return next(new AppError('Dominio no encontrado', 404));
    }
    
    console.log('✅ Dominio encontrado:', {
      id: domain._id,
      domain: domain.domain,
      clientId: domain.clientId?._id || domain.clientId,
      hasClient: !!domain.clientId
    });
    
    const client = domain.clientId;
    if (!client) {
      console.log('❌ Cliente asociado al dominio no encontrado');
      return next(new AppError('Cliente asociado al dominio no encontrado', 404));
    }
    
    // Asegurar que el cliente sea un documento Mongoose con los métodos del esquema
    let finalClient = client;
    if (typeof client.isSubscriptionActive !== 'function') {
      console.log('🔄 Cliente no tiene método isSubscriptionActive, refrescando desde BD');
      finalClient = await Client.findById(client._id || client.id);
      if (!finalClient) {
        console.log('❌ Cliente no encontrado en la base de datos');
        return next(new AppError('Cliente no encontrado en la base de datos', 404));
      }
    }
    
    // Verificar suscripción
    console.log('🔄 Verificando suscripción del cliente:', {
      clientId: finalClient._id,
      hasMethod: typeof finalClient.isSubscriptionActive === 'function',
      status: finalClient.status,
      subscriptionStatus: finalClient.subscription?.status
    });
    
    const subscriptionStatus = finalClient.isSubscriptionActive();
    
    console.log('📊 Estado de suscripción:', {
      isActive: subscriptionStatus.isActive,
      reason: subscriptionStatus.reason
    });
    
    if (!subscriptionStatus.isActive) {
      // Marcar como inactiva pero no bloquear
      req.subscriptionInactive = true;
      req.subscriptionReason = subscriptionStatus.reason;
      req.subscriptionMessage = subscriptionStatus.message;
      req.client = finalClient;
      req.domain = domain;
    }
    
    // Agregar información al request
    req.client = finalClient;
    req.domain = domain;
    req.subscriptionStatus = subscriptionStatus;
    
    next();
  } catch (error) {
    console.error('❌ Error en checkSubscriptionForScript:', error);
    return next(new AppError('Error verificando suscripción', 500));
  }
});