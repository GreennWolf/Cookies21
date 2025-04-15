const Cookie = require('../models/Cookie');
const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { detectCookieProvider } = require('../utils/cookieDetector');

class CookieController {
  // Obtener cookies de un dominio
  getCookies = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { category, status, search } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

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
      data: { cookies }
    });
  });

  // Obtener cookie específica
  getCookie = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const cookie = await Cookie.findById(id)
      .populate('scriptId')
      .populate('domainId');

    if (!cookie) {
      throw new AppError('Cookie not found', 404);
    }

    // Verificar acceso
    if (cookie.domainId.clientId.toString() !== clientId) {
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
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

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

    res.status(201).json({
      status: 'success',
      data: { cookie }
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

    // Verificar acceso
    if (cookie.domainId.clientId.toString() !== clientId) {
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

    res.status(200).json({
      status: 'success',
      data: { cookie: updatedCookie }
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

    // Verificar acceso
    if (cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to update this cookie', 403);
    }

    cookie.status = status;
    cookie.metadata.lastModifiedBy = req.userId;
    await cookie.save();

    res.status(200).json({
      status: 'success',
      data: { cookie }
    });
  });

  // Obtener estadísticas de cookies
  getCookieStats = catchAsync(async (req, res) => {
    const { domainId } = req.params;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const stats = await Cookie.getStatsByCategory(domainId);

    res.status(200).json({
      status: 'success',
      data: { stats }
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

    // Verificar acceso
    if (cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this cookie', 403);
    }

    const similarCookies = await Cookie.findSimilar(cookie);

    res.status(200).json({
      status: 'success',
      data: { cookies: similarCookies }
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

    // Verificar acceso
    if (cookie.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this cookie', 403);
    }

    const validationResult = cookie.validateCompliance();

    res.status(200).json({
      status: 'success',
      data: { validation: validationResult }
    });
  });
}

module.exports = new CookieController();