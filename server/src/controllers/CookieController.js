const Cookie = require('../models/Cookie');
const Domain = require('../models/Domain');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { detectCookieProvider } = require('../utils/cookieDetector');

class CookieController {
  // Obtener cookies de un dominio o varias cookies filtradas (para owners)
  getCookies = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { category, status, search, clientId: queryClientId } = req.query;

    // Si es owner y no se proporciona domainId pero sí clientId, devolver todas las cookies para ese cliente
    if (req.isOwner && !domainId && queryClientId) {
      // Primero buscar los dominios del cliente
      const clientDomains = await Domain.find({ clientId: queryClientId })
        .select('_id');
      
      if (clientDomains.length === 0) {
        throw new AppError('No domains found for this client', 404);
      }
      
      // Construir query para cookies de todos los dominios del cliente
      const domainIds = clientDomains.map(d => d._id);
      const query = { domainId: { $in: domainIds } };
      
      // Aplicar filtros adicionales
      if (category) query.category = category;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { provider: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Obtener cookies y poblar información de dominio
      const cookies = await Cookie.find(query)
        .populate({
          path: 'domainId',
          select: 'domain status',
          populate: { path: 'clientId', select: 'name email' }
        })
        .populate('scriptId', 'name type')
        .sort('name');
      
      // Obtener información de cliente para incluir en la respuesta
      const client = await Client.findById(queryClientId).select('name email');
      
      return res.status(200).json({
        status: 'success',
        data: { 
          cookies,
          client
        }
      });
    }

    // Si no se proporcionó domainId y no es una consulta por cliente, error
    if (!domainId) {
      throw new AppError('Domain ID is required', 400);
    }

    // Verificar acceso al dominio
    let domain;
    
    // Si es owner, puede acceder a cualquier dominio
    if (req.isOwner) {
      domain = await Domain.findById(domainId).populate('clientId', 'name email');
    } else {
      // Si no es owner, solo puede acceder a dominios de su propio cliente
      domain = await Domain.findOne({
        _id: domainId,
        clientId: req.clientId
      });
    }

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Construir query
    const query = { domainId };
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } }
      ];
    }

    const cookies = await Cookie.find(query)
      .populate('scriptId', 'name type')
      .sort('name');

    res.status(200).json({
      status: 'success',
      data: { 
        cookies,
        domain: req.isOwner ? domain : undefined // Incluir información del dominio para owners
      }
    });
  });

  // Obtener cookie específica
  getCookie = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const cookie = await Cookie.findById(id)
      .populate('scriptId')
      .populate({
        path: 'domainId',
        populate: req.isOwner ? { path: 'clientId', select: 'name email' } : undefined
      });

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso (solo para no-owners)
    if (!req.isOwner && cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this cookie', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { cookie }
    });
  });

  // Crear cookie manualmente
  createCookie = catchAsync(async (req, res) => {
    const {
      domainId,
      name,
      provider,
      category,
      description,
      purpose,
      attributes,
      script
    } = req.body;

    // Verificar acceso al dominio
    let domain;
    
    // Si es owner, puede acceder a cualquier dominio
    if (req.isOwner) {
      domain = await Domain.findById(domainId).populate('clientId', 'name email');
    } else {
      // Si no es owner, solo puede acceder a dominios de su propio cliente
      domain = await Domain.findOne({
        _id: domainId,
        clientId: req.clientId
      });
    }

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Detectar proveedor si no se proporciona
    const detectedProvider = provider || await detectCookieProvider(name);

    const cookie = await Cookie.create({
      domainId,
      name,
      provider: detectedProvider,
      category,
      description: {
        en: description,
        auto: false
      },
      purpose,
      attributes,
      script,
      metadata: {
        createdBy: 'user',
        lastModifiedBy: req.userId
      }
    });

    // Si es owner, poblar la información completa
    let result;
    if (req.isOwner) {
      result = await Cookie.findById(cookie._id)
        .populate('domainId');
    } else {
      result = cookie;
    }

    res.status(201).json({
      status: 'success',
      data: { cookie: result }
    });
  });

  // Actualizar cookie
  updateCookie = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { clientId } = req;

    const cookie = await Cookie.findById(id).populate('domainId');

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso (solo para no-owners)
    if (!req.isOwner && cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to update this cookie', 403);
    }

    // Actualizar metadata
    updates.metadata = {
      ...cookie.metadata,
      lastModifiedBy: req.userId,
      version: (cookie.metadata.version || 0) + 1
    };

    const updatedCookie = await Cookie.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    // Si es owner, poblar información completa
    let result;
    if (req.isOwner) {
      result = await Cookie.findById(updatedCookie._id)
        .populate({
          path: 'domainId',
          populate: { path: 'clientId', select: 'name email' }
        });
    } else {
      result = updatedCookie;
    }

    res.status(200).json({
      status: 'success',
      data: { cookie: result }
    });
  });

  // Cambiar estado de cookie
  updateCookieStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { clientId } = req;

    if (!['active', 'inactive', 'pending_review'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const cookie = await Cookie.findById(id).populate('domainId');

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso (solo para no-owners)
    if (!req.isOwner && cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to update this cookie', 403);
    }

    cookie.status = status;
    cookie.metadata.lastModifiedBy = req.userId;
    await cookie.save();

    // Si es owner, poblar información completa
    let result;
    if (req.isOwner) {
      result = await Cookie.findById(cookie._id)
        .populate({
          path: 'domainId',
          populate: { path: 'clientId', select: 'name email' }
        });
    } else {
      result = cookie;
    }

    res.status(200).json({
      status: 'success',
      data: { cookie: result }
    });
  });

  // Obtener estadísticas de cookies
  getCookieStats = catchAsync(async (req, res) => {
    const { domainId } = req.params;

    // Verificar acceso al dominio
    let domain;
    
    // Si es owner, puede acceder a cualquier dominio
    if (req.isOwner) {
      domain = await Domain.findById(domainId).populate('clientId', 'name email');
    } else {
      // Si no es owner, solo puede acceder a dominios de su propio cliente
      domain = await Domain.findOne({
        _id: domainId,
        clientId: req.clientId
      });
    }

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const stats = await Cookie.getStatsByCategory(domainId);

    res.status(200).json({
      status: 'success',
      data: { 
        stats,
        domain: req.isOwner ? domain : undefined // Incluir información del dominio para owners
      }
    });
  });

  // Buscar cookies similares
  findSimilarCookies = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const cookie = await Cookie.findById(id).populate('domainId');

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso (solo para no-owners)
    if (!req.isOwner && cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this cookie', 403);
    }

    // Para owners, buscar en todas las cookies de todos los clientes
    // Para usuarios normales, restringir a cookies del mismo cliente
    let similarCookies;
    if (req.isOwner) {
      similarCookies = await Cookie.findSimilar(cookie);
      
      // Poblar información del dominio y cliente para owners
      for (let i = 0; i < similarCookies.length; i++) {
        if (similarCookies[i].domainId) {
          await similarCookies[i].populate({
            path: 'domainId',
            populate: { path: 'clientId', select: 'name email' }
          });
        }
      }
    } else {
      // Para usuarios normales, filtrar solo dentro de su cliente
      const similarCookiesAll = await Cookie.findSimilar(cookie);
      
      // Filtrar solo por dominios del mismo cliente
      const clientDomains = await Domain.find({ clientId }).select('_id');
      const clientDomainIds = clientDomains.map(d => d._id.toString());
      
      similarCookies = similarCookiesAll.filter(c => 
        clientDomainIds.includes(c.domainId.toString())
      );
    }

    res.status(200).json({
      status: 'success',
      data: { 
        cookies: similarCookies,
        baseCookie: req.isOwner ? await Cookie.findById(id)
          .populate({
            path: 'domainId',
            populate: { path: 'clientId', select: 'name email' }
          }) : cookie
      }
    });
  });

  // Validar cumplimiento
  validateCompliance = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const cookie = await Cookie.findById(id).populate('domainId');

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso (solo para no-owners)
    if (!req.isOwner && cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this cookie', 403);
    }

    const validationResult = cookie.validateCompliance();

    res.status(200).json({
      status: 'success',
      data: { 
        validation: validationResult,
        cookie: req.isOwner ? await Cookie.findById(id)
          .populate({
            path: 'domainId',
            populate: { path: 'clientId', select: 'name email' }
          }) : cookie
      }
    });
  });
}

module.exports = new CookieController();