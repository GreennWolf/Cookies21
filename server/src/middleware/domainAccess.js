const Domain = require('../models/Domain');
const Client = require('../models/Client');
const AppError = require('../utils/appError');

exports.checkDomainAccess = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    const { clientId } = req;
    
    console.log('🔒 checkDomainAccess middleware iniciado');
    console.log(`🔒 Parámetros: domainId=${domainId}, clientId=${clientId}, isOwner=${req.isOwner}`);

    // Si no hay domainId en los parámetros, continuar
    if (!domainId) {
      console.log('🔒 No hay domainId, continuando...');
      return next();
    }
    
    // Si es owner, tiene acceso a todos los dominios
    if (req.isOwner) {
      console.log('🔒 Usuario es owner, buscando dominio sin restricción de cliente');
      const domain = await Domain.findById(domainId).populate('clientId', 'name email');
      if (!domain) {
        console.log(`🔒❌ Dominio ${domainId} no encontrado en la base de datos`);
        return next(new AppError('Dominio no encontrado', 404));
      }
      
      console.log(`🔒✅ Dominio encontrado para owner: ${domain._id}, clientId: ${domain.clientId}`);
      
      // Agregar el dominio al request para uso posterior
      req.domain = domain;
      return next();
    }

    // Para no-owners, verificar si el dominio existe y pertenece al cliente
    console.log(`🔒 Usuario no es owner, verificando acceso al dominio para cliente ${clientId}`);
    
    // Primero, verificar si el dominio existe en general
    const anyDomain = await Domain.findById(domainId);
    if (!anyDomain) {
      console.log(`🔒❌ Dominio ${domainId} no existe en la base de datos`);
      return next(new AppError('Dominio no encontrado', 404));
    }
    
    // Luego verificar si pertenece al cliente
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      console.log(`🔒❌ Dominio ${domainId} encontrado pero pertenece a otro cliente (${anyDomain.clientId})`);
      return next(new AppError('Dominio no encontrado o sin acceso', 404));
    }
    
    console.log(`🔒✅ Dominio encontrado con acceso verificado: ${domain._id}, clientId: ${domain.clientId}`);

    // Si es acceso por API Key, verificar si el dominio está en la lista permitida
    if (req.apiKey) {
      const apiKey = domain.client.apiKeys.find(k => k.key === req.apiKey);
      if (apiKey && apiKey.domains.length > 0) {
        if (!apiKey.domains.includes(domain.domain)) {
          return next(new AppError('API Key no autorizada para este dominio', 403));
        }
      }
    }

    // Si es un usuario, verificar permisos específicos del dominio
    if (req.user && req.user.role !== 'admin') {
      const hasAccess = await req.user.canAccessDomain(domainId);
      if (!hasAccess) {
        return next(new AppError('Usuario no autorizado para este dominio', 403));
      }
    }

    // Agregar el dominio al request para uso posterior
    req.domain = domain;
    next();

  } catch (error) {
    next(new AppError('Error al verificar acceso al dominio', 500));
  }
};

// Middleware especial para analytics - permite acceso flexible a dominios
exports.analyticsAccessHandler = async (req, res, next) => {
  try {
    console.log('-------------------------------------------------------------------------------');
    console.log('🔐 INICIO analyticsAccessHandler - middleware especial para analytics');
    console.log('-------------------------------------------------------------------------------');
    
    const { domainId } = req.params;
    const { clientId } = req;
    
    console.log(`🔐 Request: domainId=${domainId}`);
    console.log(`🔐 Auth info: clientId=${clientId}, userType=${req.userType}, isOwner=${req.isOwner}`);
    
    if (!domainId) {
      console.log('🔐 No hay domainId en la ruta, continuando...');
      return next();
    }
    
    // Intento 1: Si es owner, permitir acceso a cualquier dominio
    if (req.isOwner) {
      console.log('🔐 Usuario es owner, buscando dominio sin restricción');
      const domain = await Domain.findById(domainId);
      
      if (!domain) {
        console.log(`🔐❌ Dominio con ID ${domainId} no existe en la base de datos`);
        return next(new AppError('Dominio no encontrado', 404));
      }
      
      console.log(`🔐✅ Dominio encontrado para owner: ${domain._id}`);
      req.domain = domain;
      return next();
    }
    
    // Intento 2: Para no-owners, verificar acceso al dominio
    console.log(`🔐 Usuario regular, verificando acceso al dominio para cliente ${clientId}`);
    const domain = await Domain.findOne({ _id: domainId, clientId });
    
    if (!domain) {
      // Ver si el dominio existe pero pertenece a otro cliente
      const anyDomain = await Domain.findById(domainId);
      
      if (anyDomain) {
        console.log(`🔐❌ Dominio encontrado pero pertenece a cliente ${anyDomain.clientId}`);
        return next(new AppError('No tienes acceso a este dominio', 403));
      } else {
        console.log(`🔐❌ Dominio con ID ${domainId} no existe en la base de datos`);
        return next(new AppError('Dominio no encontrado', 404));
      }
    }
    
    console.log(`🔐✅ Acceso a dominio verificado para cliente ${clientId}`);
    req.domain = domain;
    return next();
    
  } catch (error) {
    console.log('🔐❌ Error en analyticsAccessHandler:', error.message);
    return next(new AppError('Error verificando acceso al dominio', 500));
  }
};

exports.restrictToDomainOwner = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    const { clientId } = req;
    
    console.log('🔒 restrictToDomainOwner middleware iniciado');
    console.log(`🔒 Parámetros: domainId=${domainId}, clientId=${clientId}, isOwner=${req.isOwner}`);

    // Si es owner, permitir acceso a cualquier dominio
    if (req.isOwner) {
      console.log('🔒 Usuario es owner, buscando dominio sin restricción');
      const domain = await Domain.findById(domainId).populate('clientId', 'name email');
      if (!domain) {
        console.log(`🔒❌ Dominio ${domainId} no encontrado en la base de datos`);
        return next(new AppError('Dominio no encontrado', 404));
      }
      
      console.log(`🔒✅ Dominio encontrado para owner: ${domain._id}`);
      req.domain = domain;
      return next();
    }

    // Para no-owners, verificar si el dominio pertenece al cliente
    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    if (domain.clientId.toString() !== clientId) {
      return next(new AppError('No tienes permisos para este dominio', 403));
    }

    req.domain = domain;
    next();
  } catch (error) {
    next(new AppError('Error al verificar propietario del dominio', 500));
  }
};

exports.checkDomainLimit = async (req, res, next) => {
  try {
    // Si es owner, permitir siempre (ignorar límites)
    if (req.isOwner) {
      return next();
    }
    
    const { clientId } = req;

    // Obtener límites del cliente
    const client = await Client.findById(clientId);
    const limits = await client.checkSubscriptionLimits();

    if (!limits.canAddMoreDomains) {
      return next(new AppError('Has alcanzado el límite de dominios para tu suscripción', 403));
    }

    next();
  } catch (error) {
    next(new AppError('Error al verificar límites de dominio', 500));
  }
};