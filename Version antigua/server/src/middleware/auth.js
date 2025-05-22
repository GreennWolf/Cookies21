const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const AppError = require('../utils/appError');
const { promisify } = require('util');

exports.protect = async (req, res, next) => {
  try {
    // 1) Verificar si existe el token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-api-key']) {
      // Verificar API Key
      const apiKeyValidation = await Client.validateApiKey(req.headers['x-api-key']);
      if (apiKeyValidation) {
        req.clientId = apiKeyValidation.clientId;
        req.apiKey = req.headers['x-api-key'];
        req.permissions = apiKeyValidation.permissions;
        return next();
      }
    }

    if (!token) {
      return next(new AppError('Por favor, inicia sesión para obtener acceso', 401));
    }

    

    // 2) Verificar token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Verificar si el usuario existe
    const client = await Client.findById(decoded.clientId);
    const userAccount = decoded.userId ? await UserAccount.findById(decoded.userId) : null;

    if (!client || (decoded.userId && !userAccount)) {
      return next(new AppError('El usuario no existe', 401));
    }

    // 4) Verificar estado del cliente/usuario
    if (client.status !== 'active' || (userAccount && userAccount.status !== 'active')) {
      return next(new AppError('Cuenta inactiva o suspendida', 401));
    }

    // 5) Guardar información en el request
    req.clientId = client._id;
    if (userAccount) {
      req.userId = userAccount._id;
      req.user = userAccount;
      req.userType = 'user';
    } else {
      req.userType = 'client';
    }

    next();
  } catch (error) {
    next(new AppError('Error de autenticación', 401));
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    next();
  };
};

exports.requireApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return next(new AppError('API Key requerida', 401));
    }

    const validation = await Client.validateApiKey(apiKey);
    if (!validation) {
      return next(new AppError('API Key inválida', 401));
    }

    req.clientId = validation.clientId;
    req.permissions = validation.permissions;
    req.apiKey = apiKey;

    next();
  } catch (error) {
    next(new AppError('Error al validar API Key', 401));
  }
};

exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // Verificar permisos de API Key
    if (req.apiKey) {
      if (!req.permissions.includes(permission)) {
        return next(new AppError('La API Key no tiene los permisos necesarios', 403));
      }
      return next();
    }

    // Verificar permisos de usuario
    if (!req.user) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    if (req.user.role === 'admin') {
      return next(); // Los admins tienen todos los permisos
    }

    if (!req.user.hasPermission(permission)) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    next();
  };
};