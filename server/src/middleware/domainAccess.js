const Domain = require('../models/Domain');
const Client = require('../models/Client');
const AppError = require('../utils/appError');

exports.checkDomainAccess = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    const { clientId } = req;

    // Si no hay domainId en los parámetros, continuar
    if (!domainId) return next();

    // Verificar si el dominio existe y pertenece al cliente
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      return next(new AppError('Dominio no encontrado o sin acceso', 404));
    }

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

exports.restrictToDomainOwner = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    const { clientId } = req;

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