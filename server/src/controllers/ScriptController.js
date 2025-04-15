const Script = require('../models/Script');
const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { validateScript } = require('../utils/scriptValidator');
const { sanitizeScript } = require('../utils/scriptSanitizer');

class ScriptController {
  // Obtener scripts de un dominio
  getScripts = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { category, type, status } = req.query;

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
    if (type) query.type = type;
    if (status) query.status = status;

    const scripts = await Script.find(query)
      .sort('loadConfig.loadOrder');

    res.status(200).json({
      status: 'success',
      data: { scripts }
    });
  });

  // Obtener script específico
  getScript = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const script = await Script.findById(id)
      .populate('domainId');

    if (!script) {
      throw new AppError('Script not found', 404);
    }

    // Verificar acceso
    if (script.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to access this script', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { script }
    });
  });

  // Crear nuevo script
  createScript = catchAsync(async (req, res) => {
    const {
      domainId,
      name,
      provider,
      category,
      content,
      url,
      type,
      loadConfig,
      dependencies,
      blockingConfig
    } = req.body;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Validar script
    if (type === 'inline' && content) {
      const validationResult = await validateScript(content);
      if (!validationResult.isValid) {
        throw new AppError(`Invalid script: ${validationResult.errors.join(', ')}`, 400);
      }
    }

    // Sanitizar contenido si es inline
    const sanitizedContent = type === 'inline' ? sanitizeScript(content) : null;

    const script = await Script.create({
      domainId,
      name,
      provider,
      category,
      content: sanitizedContent,
      url,
      type,
      loadConfig,
      dependencies,
      blockingConfig,
      metadata: {
        createdBy: 'user',
        lastModifiedBy: req.userId
      }
    });

    res.status(201).json({
      status: 'success',
      data: { script }
    });
  });

  // Actualizar script
  updateScript = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { clientId } = req;

    const script = await Script.findById(id).populate('domainId');

    if (!script) {
      throw new AppError('Script not found', 404);
    }

    // Verificar acceso
    if (script.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to update this script', 403);
    }

    // Validar y sanitizar nuevo contenido si se actualiza
    if (updates.content && script.type === 'inline') {
      const validationResult = await validateScript(updates.content);
      if (!validationResult.isValid) {
        throw new AppError(`Invalid script: ${validationResult.errors.join(', ')}`, 400);
      }
      updates.content = sanitizeScript(updates.content);
    }

    // Actualizar metadata
    updates.metadata = {
      ...script.metadata,
      lastModifiedBy: req.userId,
      version: (script.metadata.version || 0) + 1
    };

    const updatedScript = await Script.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { script: updatedScript }
    });
  });

  // Actualizar orden de carga
  updateLoadOrder = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { scriptOrder } = req.body;
    const { clientId } = req;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Actualizar orden de cada script
    const updatePromises = scriptOrder.map((item, index) => 
      Script.findByIdAndUpdate(
        item.scriptId,
        { 
          'loadConfig.loadOrder': index,
          'metadata.lastModifiedBy': req.userId
        }
      )
    );

    await Promise.all(updatePromises);

    // Obtener scripts actualizados
    const scripts = await Script.find({ domainId })
      .sort('loadConfig.loadOrder');

    res.status(200).json({
      status: 'success',
      data: { scripts }
    });
  });

  // Cambiar estado del script
  updateScriptStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { clientId } = req;

    if (!['active', 'inactive', 'pending_review', 'blocked'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const script = await Script.findById(id).populate('domainId');

    if (!script) {
      throw new AppError('Script not found', 404);
    }

    // Verificar acceso
    if (script.domainId.clientId.toString() !== clientId) {
      throw new AppError('Not authorized to update this script', 403);
    }

    script.status = status;
    script.metadata.lastModifiedBy = req.userId;
    await script.save();

    res.status(200).json({
      status: 'success',
      data: { script }
    });
  });

  // Verificar scripts externos
  checkExternalScripts = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { clientId } = req;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const externalScripts = await Script.find({
      domainId,
      type: 'external',
      status: 'active'
    });

    const checkResults = await Promise.all(
      externalScripts.map(script => script.checkForUpdates())
    );

    res.status(200).json({
      status: 'success',
      data: { 
        results: checkResults.map((result, index) => ({
          scriptId: externalScripts[index]._id,
          ...result
        }))
      }
    });
  });

  // Generar HTML de scripts
  generateScriptTags = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { clientId } = req;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const scripts = await Script.find({
      domainId,
      status: 'active'
    }).sort('loadConfig.loadOrder');

    const scriptTags = scripts.map(script => script.generateHtml());

    res.status(200).json({
      status: 'success',
      data: { scriptTags }
    });
  });
}

module.exports = new ScriptController();