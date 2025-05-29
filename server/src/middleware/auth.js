// middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

// Middleware para proteger rutas (necesita token JWT)
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Obtener token
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  
  if (!token) {
    return next(new AppError('No estás autenticado. Por favor inicia sesión para acceder a este recurso.', 401));
  }
  
  // 2) Verificar token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError('Token inválido o expirado. Por favor inicia sesión nuevamente.', 401));
  }
  
  const { clientId, userId } = decoded;
  
  // 3) Determinar tipo de usuario (cliente o cuenta de usuario)
  let userType = 'client';
  let user;
  
  if (userId) {
    userType = 'user';
    user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('El usuario asociado a este token ya no existe.', 401));
    }
    
    if (user.status !== 'active') {
      return next(new AppError('La cuenta de usuario no está activa.', 403));
    }
    
    // Manejar específicamente el rol owner
    if (user.role === 'owner') {
      // El owner no necesita verificación de cliente
      req.userId = userId;
      req.user = user;
      req.userType = 'user';
      
      // Agregar un flag específico para indicar que es owner
      req.isOwner = true;
      
      // Logs para depuración
      console.log(`🔑 Usuario owner autenticado: ${user.email}`);
      console.log(`🔑 Request path: ${req.originalUrl}`);
      console.log(`🔑 Query params:`, req.query);
      
      return next();
    }
  } else if (clientId) {
    user = await Client.findById(clientId);
    
    if (!user) {
      return next(new AppError('El cliente asociado a este token ya no existe.', 401));
    }
    
    if (user.status !== 'active') {
      return next(new AppError('La cuenta de cliente no está activa.', 403));
    }
  } else {
    return next(new AppError('Payload de token inválido.', 401));
  }
  
  // 4) Verificar asociación entre usuario y cliente
  if (userType === 'user' && clientId) {
    // Solo verificar si el usuario no es owner (ya que los owners no tienen clientId)
    if (String(user.clientId) !== String(clientId)) {
      return next(new AppError('El usuario no pertenece a este cliente.', 403));
    }
  }
  
  // 5) Todo ok, guardar info en req
  req.userId = userId || clientId;
  req.clientId = clientId;
  req.userType = userType;
  req.user = user;
  
  // Debugging info
  console.log('Auth middleware set clientId:', clientId, 'type:', typeof clientId);
  
  next();
});

// Middleware para validar API key
exports.protectApi = catchAsync(async (req, res, next) => {
  let apiKey;
  
  // Obtener API key desde headers o query params
  if (req.headers.authorization && req.headers.authorization.startsWith('ApiKey')) {
    apiKey = req.headers.authorization.split(' ')[1];
  } else if (req.query.apiKey) {
    apiKey = req.query.apiKey;
  }
  
  if (!apiKey) {
    return next(new AppError('API key requerida.', 401));
  }
  
  // Validar API key
  const clientInfo = await Client.validateApiKey(apiKey);
  
  if (!clientInfo) {
    return next(new AppError('API key inválida o expirada.', 401));
  }
  
  // Verificar restricciones de dominio
  const referer = req.headers.referer || req.headers.origin;
  if (referer && clientInfo.domains && clientInfo.domains.length > 0) {
    try {
      const refererDomain = new URL(referer).hostname;
      const isAllowed = clientInfo.domains.some(domain => 
        refererDomain === domain || refererDomain.endsWith(`.${domain}`)
      );
      
      if (!isAllowed) {
        return next(new AppError(`Esta API key no está autorizada para el dominio: ${refererDomain}`, 403));
      }
    } catch (error) {
      return next(new AppError('Referer inválido.', 400));
    }
  }
  
  // Guardar información en req
  req.clientId = clientInfo.clientId;
  req.apiPermissions = clientInfo.permissions;
  
  next();
});

// Restringir acceso por rol
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Log para debug
    console.log(`🔑 restrictTo check - user role: ${req.user?.role}, allowed roles: ${roles.join(', ')}`);
    
    if (req.userType !== 'user') {
      return next(new AppError('Las cuentas de cliente no pueden acceder a este recurso.', 403));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('No tienes permiso para realizar esta acción.', 403));
    }
    
    next();
  };
};

// Verificar permisos específicos
exports.hasPermission = (resource, action) => {
  return (req, res, next) => {
    // Logs para depuración
    console.log(`🔑 hasPermission check - resource: ${resource}, action: ${action}`);
    console.log(`🔑 User role: ${req.user?.role}`);
    
    // Si es owner, siempre tiene permiso
    if (req.user && req.user.role === 'owner') {
      console.log('✅ Permiso concedido: Usuario owner');
      return next();
    }
    
    if (req.userType !== 'user' || !req.user.hasPermission(resource, action)) {
      console.log('❌ Permiso denegado');
      return next(new AppError('No tienes permiso para realizar esta acción.', 403));
    }
    
    console.log('✅ Permiso concedido');
    next();
  };
};

// Verificar acceso a dominio
exports.canAccessDomain = catchAsync(async (req, res, next) => {
  const { domainId } = req.params;
  
  // Si es owner, siempre tiene acceso
  if (req.user && req.user.role === 'owner') {
    return next();
  }
  
  if (req.userType !== 'user' || !req.user.canAccessDomain(domainId)) {
    return next(new AppError('No tienes acceso a este dominio.', 403));
  }
  
  next();
});

// Solo para uso en rutas renderizadas en el frontend
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Verificar token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      
      // 2) Verificar si el usuario todavía existe
      const user = await UserAccount.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        return next();
      }
      
      // 3) Verificar si no es un owner
      if (user.role === 'owner') {
        // Establecer usuario en las variables locales para las plantillas
        res.locals.user = user;
        req.user = user;
        return next();
      }
      
      // 4) Verificar si el cliente todavía existe (para usuarios no-owner)
      const client = await Client.findById(decoded.clientId);
      if (!client || client.status !== 'active') {
        return next();
      }
      
      // 5) Hay un usuario logueado
      res.locals.user = user;
      req.user = user;
      return next();
    }
  } catch (err) {
    // No hacer nada si hay error
  }
  next();
};

// Middleware para verificar permisos de API
exports.hasApiPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiPermissions || !req.apiPermissions.includes(permission)) {
      return next(new AppError(`Esta API key no tiene permisos de ${permission}.`, 403));
    }
    
    next();
  };
};