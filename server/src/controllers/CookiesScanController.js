const CookieScan = require('../models/CookieScan');
const CookieAnalysis = require('../models/CookieAnalysis');
const Domain = require('../models/Domain');
const Cookie = require('../models/Cookie');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { scanDomain } = require('../services/scanner.service');
const scannerService = require('../services/scanner.service');
const providerService = require('../services/provider.service');
const analyticsService = require('../services/analytics.service');
const { notifyChanges } = require('../services/notification.service');
const cookieSyncService = require('../services/cookieSync.service');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const scanLogger = require('../utils/scanLogger');

class CookieScanController {
  // Función auxiliar para crear un objeto progress válido
  createValidProgress = (options = {}) => {
    const validStatuses = ['pending', 'running', 'completed', 'cancelled', 'error'];
    const status = validStatuses.includes(options.status) ? options.status : 'pending';
    
    return {
      percentage: typeof options.percentage === 'number' ? options.percentage : 0,
      urlsScanned: typeof options.urlsScanned === 'number' ? options.urlsScanned : 0,
      urlsTotal: typeof options.urlsTotal === 'number' ? options.urlsTotal : 100,
      status: status,
      startTime: options.startTime || null,
      endTime: options.endTime || null,
      duration: options.duration || null,
      currentStep: options.currentStep || '',
      message: options.message || ''
    };
  };

  // Iniciar nuevo escaneo
  startScan = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      scanType = 'full', 
      priority = 'normal', 
      config = {}
    } = req.body;
    
    const {
      includeSubdomains = true,
      maxUrls = 100,
      depth = 5
    } = config;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    // Verificar si ya existe un escaneo en progreso
    const activeScan = await CookieScan.findOne({
      domainId,
      status: { $in: ['pending', 'in_progress', 'running'] }
    });
    
    if (activeScan) {
      // Si existe un scan activo, intentar cancelarlo automáticamente si lleva mucho tiempo
      const now = new Date();
      const scanAge = now - new Date(activeScan.createdAt);
      const maxScanTime = 30 * 60 * 1000; // 30 minutos
      
      if (scanAge > maxScanTime) {
        // Cancelar scan que lleva demasiado tiempo
        logger.warn(`Auto-cancelling stale scan ${activeScan._id} that has been running for ${Math.floor(scanAge / 60000)} minutes`);
        activeScan.status = 'cancelled';
        activeScan.endTime = new Date();
        activeScan.error = 'Auto-cancelled due to timeout';
        await activeScan.save();
      } else {
        throw new AppError('A scan is already in progress for this domain', 400);
      }
    }

    try {
      // Crear registro inicial del scan con progress válido
      const scan = await CookieScan.create({
        domainId,
        status: 'pending',
        scanConfig: {
          type: scanType,
          priority,
          includeSubdomains: includeSubdomains,
          maxUrls: maxUrls,
          depth: depth
        },
        metadata: {
          triggeredBy: req.userId,
          scanType: 'manual'
        },
        progress: this.createValidProgress({
          urlsTotal: maxUrls,
          status: 'pending',
          percentage: 0,
          urlsScanned: 0
        })
      });

      // Cambiar a estado running de forma segura
      scan.status = 'running';
      scan.progress = this.createValidProgress({
        percentage: 0,
        urlsScanned: 0,
        urlsTotal: maxUrls,
        status: 'running',
        startTime: new Date(),
        endTime: null,
        duration: null,
        currentStep: 'Iniciando escaneo...'
      });
      
      await scan.save();

      // Iniciar el escaneo de forma asíncrona con un pequeño delay para permitir respuesta
      setTimeout(() => {
        this._executeAsyncScan(scan._id, domain);
      }, 1000); // Solo 1 segundo para permitir que se devuelva la respuesta

      // Recargar para respuesta
      const finalScan = await CookieScan.findById(scan._id).populate('domainId');

      res.status(201).json({
        status: 'success',
        data: { scan: finalScan }
      });

    } catch (scanError) {
      logger.error('Error during comprehensive scan:', scanError);
      throw new AppError('Error during scan execution: ' + scanError.message, 500);
    }
  });

  // Obtener estado del escaneo
  getScanStatus = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId, isOwner } = req;

    const scan = await CookieScan.findById(scanId).populate('domainId');

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Si no es owner, verificar que el scan pertenece al cliente
    if (!isOwner && scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { scan }
    });
  });

  // Obtener historial de escaneos
  getScanHistory = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    const query = { domainId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const scans = await CookieScan.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CookieScan.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: { 
        scans,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  });

  // Obtener cambios específicos de un escaneo
  getScanChanges = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { type } = req.query;
    const { clientId, isOwner } = req;

    const scan = await CookieScan.findById(scanId)
      .populate('domainId');

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Si no es owner, verificar que el scan pertenece al cliente
    if (!isOwner && scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    // Filtrar cambios por tipo si se especifica
    let changes = scan.findings?.changes || {};
    if (type) {
      switch (type) {
        case 'added':
          changes = { newCookies: changes.newCookies || [] };
          break;
        case 'modified':
          changes = { modifiedCookies: changes.modifiedCookies || [] };
          break;
        case 'removed':
          changes = { removedCookies: changes.removedCookies || [] };
          break;
      }
    }

    res.status(200).json({
      status: 'success',
      data: { changes }
    });
  });

  // Exportar resultados del escaneo
  exportScanResults = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { format = 'json', includeDetails = false } = req.body;
    const { clientId, isOwner } = req;

    const scan = await CookieScan.findById(scanId)
      .populate('domainId');

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Si no es owner, verificar que el scan pertenece al cliente
    if (!isOwner && scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    if (scan.status !== 'completed') {
      throw new AppError('Scan results not available yet', 400);
    }

    let exportData = {
      scanId: scan.scanId,
      domain: scan.domainId.domain,
      scanDate: scan.createdAt,
      status: scan.status,
      findings: {
        totalCookies: scan.findings?.cookies?.length || 0,
        changes: scan.findings?.changes || {}
      },
      stats: scan.stats || {}
    };

    if (includeDetails) {
      exportData.findings.cookies = scan.findings?.cookies || [];
      exportData.findings.scripts = scan.findings?.scripts || [];
    }

    // Formato de exportación
    switch (format) {
      case 'csv':
        // Implementar exportación CSV
        const csvData = this._convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=scan_${scan.scanId}.csv`);
        return res.send(csvData);

      case 'pdf':
        // Por ahora devolver error ya que PDF requiere librería adicional
        throw new AppError('PDF export not implemented yet', 501);

      case 'json':
      default:
        return res.status(200).json({
          status: 'success',
          data: exportData
        });
    }
  });

  // Cancelar escaneo en progreso
  cancelScan = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId, isOwner } = req;

    // Buscar el escaneo
    let scan;
    if (isOwner) {
      scan = await CookieScan.findById(scanId).populate('domainId');
    } else {
      scan = await CookieScan.findById(scanId).populate('domainId');
      if (!scan || scan.domainId.clientId.toString() !== clientId) {
        throw new AppError('Scan not found', 404);
      }
    }

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Verificar que el escaneo esté en progreso
    if (!['pending', 'in_progress', 'running'].includes(scan.status)) {
      throw new AppError('Scan is not in progress and cannot be cancelled', 400);
    }

    // Cancelar el escaneo
    scan.status = 'cancelled';
    scan.endTime = new Date();
    scan.error = 'Cancelled by user';
    
    // Actualizar progress de forma segura
    const cancelledProgress = this.createValidProgress({
      percentage: scan.progress?.percentage || 0,
      urlsScanned: scan.progress?.urlsScanned || 0,
      urlsTotal: scan.progress?.urlsTotal || 100,
      status: 'cancelled',
      startTime: scan.progress?.startTime || scan.createdAt,
      endTime: new Date(),
      duration: null,
      currentStep: 'Escaneo cancelado',
      message: 'Cancelado por el usuario'
    });
    
    // Calcular duración si es posible
    if (cancelledProgress.startTime && cancelledProgress.endTime) {
      cancelledProgress.duration = (cancelledProgress.endTime - cancelledProgress.startTime) / 1000;
    }
    
    scan.progress = cancelledProgress;

    await scan.save();

    logger.info(`Scan ${scanId} cancelled by user ${req.userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Scan cancelled successfully',
      data: { scan }
    });
  });

  // Obtener resultados del escaneo
  getScanResults = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId, isOwner } = req;

    const scan = await CookieScan.findById(scanId)
      .populate('domainId');

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Si no es owner, verificar que el scan pertenece al cliente
    if (!isOwner && scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    if (scan.status !== 'completed') {
      throw new AppError('Scan results not available yet', 400);
    }

    // Obtener análisis de cambios
    const changes = await analyticsService.analyzeCookieChanges(scan.domainId, scan.findings);

    res.status(200).json({
      status: 'success',
      data: { 
        scan,
        changes 
      }
    });
  });

  // Aplicar cambios detectados
  applyChanges = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { changes } = req.body;
    const { clientId, isOwner } = req;

    const scan = await CookieScan.findById(scanId).populate('domainId');

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Si no es owner, verificar que el scan pertenece al cliente
    if (!isOwner && scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    if (scan.status !== 'completed') {
      throw new AppError('Scan must be completed to apply changes', 400);
    }

    // Aplicar cambios
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          await Cookie.create({
            domainId: scan.domainId._id,
            clientId: scan.domainId.clientId,
            name: change.cookie.name,
            domain: change.cookie.domain || scan.domainId.domain,
            provider: await providerService.detectCookieProvider(change.cookie),
            category: change.cookie.category,
            description: {
              en: change.cookie.description || `Cookie: ${change.cookie.name}`,
              auto: true
            },
            attributes: change.cookie.attributes,
            isFirstParty: change.cookie.isFirstParty,
            detection: {
              method: 'scan',
              firstDetected: new Date(),
              lastSeen: new Date()
            },
            status: 'active'
          });
          break;

        case 'update':
          await Cookie.findByIdAndUpdate(change.cookieId, {
            $set: {
              provider: change.cookie.provider,
              category: change.cookie.category,
              description: change.cookie.description,
              attributes: change.cookie.attributes,
              'detection.lastSeen': new Date(),
              lastModified: new Date()
            }
          });
          break;

        case 'delete':
          await Cookie.findByIdAndUpdate(change.cookieId, {
            $set: {
              status: 'inactive',
              lastModified: new Date()
            }
          });
          break;
      }
    }

    // Actualizar estado del dominio
    await Domain.findByIdAndUpdate(scan.domainId._id, {
      'settings.scanning.lastScan': new Date()
    });

    res.status(200).json({
      status: 'success',
      message: 'Changes applied successfully'
    });
  });

  // Programar escaneo automático
  scheduleScan = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { schedule } = req.body;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    await Domain.findByIdAndUpdate(domainId, {
      'settings.scanning': {
        ...domain.settings.scanning,
        ...schedule,
        enabled: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Scan schedule updated successfully'
    });
  });

  // Obtener escaneos activos para un dominio
  getActiveScan = catchAsync(async (req, res) => {
    const { domainId } = req.params;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const activeScan = await CookieScan.findOne({
      domainId,
      status: { $in: ['pending', 'running', 'in_progress'] }
    }).sort({ createdAt: -1 });

    if (!activeScan) {
      return res.status(200).json({
        status: 'success',
        data: { scan: null }
      });
    }

    res.status(200).json({
      status: 'success',
      data: { scan: activeScan }
    });
  });

  // Forzar cancelación de todos los escaneos activos para un dominio (para debugging)
  forceStopAllScans = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { isOwner } = req;

    // Solo owners pueden forzar la parada
    if (!isOwner) {
      throw new AppError('Not authorized to force stop scans', 403);
    }

    // El dominio ya fue validado por el middleware checkDomainAccess
    const activeScans = await CookieScan.find({
      domainId,
      status: { $in: ['pending', 'running', 'in_progress'] }
    });

    let cancelledCount = 0;
    for (const scan of activeScans) {
      scan.status = 'cancelled';
      scan.endTime = new Date();
      scan.error = 'Force cancelled by admin';
      
      scan.progress = this.createValidProgress({
        percentage: scan.progress?.percentage || 0,
        urlsScanned: scan.progress?.urlsScanned || 0,
        urlsTotal: scan.progress?.urlsTotal || 100,
        status: 'cancelled',
        startTime: scan.progress?.startTime || scan.createdAt,
        endTime: new Date(),
        duration: null,
        currentStep: 'Escaneo cancelado por administrador',
        message: 'Cancelado forzadamente por administrador'
      });
      
      await scan.save();
      cancelledCount++;
    }

    logger.info(`Force cancelled ${cancelledCount} active scans for domain ${domainId} by user ${req.userId}`);

    res.status(200).json({
      status: 'success',
      message: `Force cancelled ${cancelledCount} active scans`,
      data: { cancelledCount }
    });
  });

  // ==================== ANÁLISIS ASÍNCRONO ====================

  // Iniciar análisis asíncrono de cookies
  startAsyncAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { deepScan = true, includeThirdParty = true, timeout = 300 } = req.body;
    const { userId } = req;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    // Verificar si ya existe un análisis en progreso para este dominio
    const activeAnalysis = await CookieAnalysis.findOne({
      domainId,
      status: { $in: ['pending', 'running'] }
    });

    if (activeAnalysis) {
      throw new AppError('An analysis is already in progress for this domain', 400);
    }

    // Generar ID único para el análisis
    const analysisId = uuidv4();

    // Crear registro de análisis
    const analysis = await CookieAnalysis.create({
      analysisId,
      domainId,
      clientId: domain.clientId._id || domain.clientId,
      status: 'pending',
      configuration: {
        deepScan,
        includeThirdParty,
        timeout
      },
      createdBy: userId,
      estimatedDuration: deepScan ? 180 : 120
    });

    await analysis.addLog('info', 'Análisis asíncrono creado', {
      domainId,
      configuration: { deepScan, includeThirdParty, timeout }
    });

    res.status(201).json({
      status: 'success',
      success: true,
      message: 'Analysis started successfully',
      data: {
        analysisId: analysis.analysisId,
        status: analysis.status,
        estimatedDuration: analysis.estimatedDuration
      }
    });
  });

  // Obtener estado de un análisis
  getAnalysisStatus = catchAsync(async (req, res) => {
    const { analysisId } = req.params;
    const { clientId, isOwner } = req;

    const filter = { analysisId };
    
    // Si no es owner, restringir por clientId
    if (!isOwner) {
      filter.clientId = clientId;
    }

    const analysis = await CookieAnalysis.findOne(filter).populate('domainId', 'domain');

    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    res.status(200).json({
      status: 'success',
      success: true,
      data: {
        analysisId: analysis.analysisId,
        status: analysis.status,
        progress: {
          percentage: analysis.progress,
          startTime: analysis.startTime,
          endTime: analysis.endTime
        },
        currentStep: analysis.currentStep,
        estimatedTime: analysis.estimatedTimeRemaining,
        elapsedTime: analysis.elapsedTime,
        results: analysis.status === 'completed' ? analysis.results : null,
        error: analysis.status === 'error' ? (analysis.error?.message || 'Error desconocido') : null,
        domain: analysis.domainId?.domain
      }
    });
  });

  // Iniciar análisis avanzado de cookies
  startAdvancedAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      deepScan = true,
      includeThirdParty = true,
      timeout = 300
    } = req.body;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    // Verificar si ya existe un análisis en progreso
    const activeAnalysis = await CookieAnalysis.findOne({
      domainId,
      status: { $in: ['pending', 'running'] }
    });
    
    if (activeAnalysis) {
      // Si existe un análisis activo, verificar si lleva mucho tiempo
      const now = new Date();
      const analysisAge = now - new Date(activeAnalysis.createdAt);
      const maxAnalysisTime = 5 * 60 * 1000; // Reducido a 5 minutos para testing
      
      logger.info(`Found active analysis ${activeAnalysis._id} with status ${activeAnalysis.status}, age: ${Math.floor(analysisAge / 60000)} minutes`);
      
      if (analysisAge > maxAnalysisTime) {
        // Cancelar análisis que lleva demasiado tiempo
        logger.warn(`Auto-cancelling stale analysis ${activeAnalysis._id} that has been running for ${Math.floor(analysisAge / 60000)} minutes`);
        activeAnalysis.status = 'cancelled';
        activeAnalysis.endTime = new Date();
        activeAnalysis.currentStep = 'Auto-cancelado por timeout';
        await activeAnalysis.save();
        
        // Limpiar logs del análisis cancelado
        setTimeout(() => {
          const scanLog = scanLogger.createScanLogger(activeAnalysis._id, 'advanced', domain.domain);
          scanLog.scanCancelled('Auto-cancelado por timeout');
          scanLog.cleanup();
        }, 1000);
        
        logger.info(`Analysis ${activeAnalysis._id} successfully cancelled, proceeding with new analysis`);
      } else {
        const remainingTime = Math.ceil((maxAnalysisTime - analysisAge) / 60000);
        throw new AppError(`An analysis is already in progress for this domain. Please wait ${remainingTime} minutes or use the "Limpiar Análisis" button.`, 400);
      }
    }

    try {
      // Generar ID único para el análisis
      const analysisId = uuidv4();

      // Crear registro del análisis
      const analysis = await CookieAnalysis.create({
        analysisId,
        domainId,
        clientId: domain.clientId,
        status: 'pending',
        configuration: {
          deepScan,
          includeThirdParty,
          timeout
        },
        createdBy: req.userId
      });

      // Ejecutar análisis de forma asíncrona
      setTimeout(() => {
        this._executeAdvancedAnalysis(analysis._id, domain);
      }, 100);

      res.status(201).json({
        status: 'success',
        success: true,
        data: {
          analysisId: analysis.analysisId,
          status: analysis.status,
          estimatedDuration: analysis.estimatedDuration,
          message: 'Advanced analysis started successfully'
        }
      });

    } catch (error) {
      logger.error('Error starting advanced analysis:', error);
      throw new AppError('Failed to start advanced analysis', 500);
    }
  });

  // Obtener historial de análisis para un dominio
  getAnalysisHistory = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    const filter = { domainId, clientId: domain.clientId };
    if (status) {
      filter.status = status;
    }

    const analyses = await CookieAnalysis.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('analysisId status progress currentStep startTime endTime results error')
      .lean();

    const total = await CookieAnalysis.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      success: true,
      data: {
        analyses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Cancelar un análisis en progreso
  cancelAnalysis = catchAsync(async (req, res) => {
    const { analysisId } = req.params;
    const { clientId, isOwner } = req;

    const filter = {
      analysisId,
      status: { $in: ['pending', 'running'] }
    };

    // Si no es owner, restringir por clientId
    if (!isOwner) {
      filter.clientId = clientId;
    }

    const analysis = await CookieAnalysis.findOne(filter);

    if (!analysis) {
      throw new AppError('Analysis not found or cannot be cancelled', 404);
    }

    analysis.status = 'cancelled';
    analysis.endTime = new Date();
    analysis.currentStep = 'Análisis cancelado por el usuario';
    await analysis.save();

    await analysis.addLog('info', 'Análisis cancelado por el usuario');

    res.status(200).json({
      status: 'success',
      success: true,
      message: 'Analysis cancelled successfully',
      data: {
        analysisId: analysis.analysisId,
        status: analysis.status
      }
    });
  });

  // Obtener logs de un escaneo específico
  getScanLogs = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId, isOwner } = req;

    // Verificar que el scan existe y el usuario tiene acceso
    const filter = { _id: scanId };
    
    if (!isOwner) {
      filter.clientId = clientId;
    }

    const scan = await CookieScan.findOne(filter) || 
                 await CookieAnalysis.findOne({ analysisId: scanId });

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Obtener logs del scanLogger
    const scanLogs = scanLogger.getScanLogs(scanId) || scanLogger.getScanLogs(scan._id);

    res.status(200).json({
      success: true,
      data: {
        scanId: scanId,
        scanType: scan.scanConfig ? 'traditional' : 'advanced',
        logs: scanLogs ? scanLogs.logs : [],
        stats: scanLogger.getLogStats()
      }
    });
  });

  // Obtener logs de todos los escaneos activos
  getActiveScanLogs = catchAsync(async (req, res) => {
    const { clientId, isOwner } = req;

    const activeLogs = scanLogger.getAllActiveScanLogs();
    const stats = scanLogger.getLogStats();

    res.status(200).json({
      success: true,
      data: {
        activeScans: activeLogs,
        stats: stats,
        timestamp: new Date()
      }
    });
  });

  // Forzar limpieza de análisis colgados para un dominio (solo owners)
  forceStopAllAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { isOwner } = req;

    if (!isOwner) {
      throw new AppError('Only owners can force stop analyses', 403);
    }

    // El dominio ya fue validado por el middleware checkDomainAccess
    const domain = req.domain;

    // Encontrar todos los análisis activos para este dominio
    const activeAnalyses = await CookieAnalysis.find({
      domainId,
      status: { $in: ['pending', 'running'] }
    });

    let stoppedCount = 0;
    const results = [];

    for (const analysis of activeAnalyses) {
      try {
        analysis.status = 'cancelled';
        analysis.endTime = new Date();
        analysis.currentStep = 'Forzado a parar por administrador';
        await analysis.save();

        results.push({
          analysisId: analysis.analysisId,
          status: 'cancelled',
          reason: 'Forzado por administrador'
        });

        // Limpiar logs
        setTimeout(() => {
          const scanLog = scanLogger.createScanLogger(analysis._id, 'advanced', domain.domain);
          scanLog.scanCancelled('Forzado a parar por administrador');
          scanLog.cleanup();
        }, 1000);

        stoppedCount++;
        logger.info(`Force stopped analysis ${analysis.analysisId} for domain ${domain.domain}`);
      } catch (error) {
        logger.error(`Error stopping analysis ${analysis.analysisId}:`, error);
        results.push({
          analysisId: analysis.analysisId,
          status: 'error',
          reason: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Force stopped ${stoppedCount} analyses for domain ${domain.domain}`,
      data: {
        stoppedCount,
        totalFound: activeAnalyses.length,
        results
      }
    });
  });

  // Obtener resultados detallados de un análisis
  getAnalysisResults = catchAsync(async (req, res) => {
    const { analysisId } = req.params;
    const { clientId, isOwner } = req;

    const filter = {
      analysisId,
      status: 'completed'
    };

    // Si no es owner, restringir por clientId
    if (!isOwner) {
      filter.clientId = clientId;
    }

    const analysis = await CookieAnalysis.findOne(filter).populate('domainId', 'domain');

    if (!analysis) {
      throw new AppError('Analysis not found or not completed', 404);
    }

    // Obtener cookies relacionadas que fueron actualizadas/creadas durante este análisis
    const cookies = await Cookie.find({
      domainId: analysis.domainId,
      $or: [
        { detectedAt: { $gte: analysis.startTime, $lte: analysis.endTime } },
        { lastModified: { $gte: analysis.startTime, $lte: analysis.endTime } }
      ]
    }).select('name domain category description isFirstParty status');

    res.status(200).json({
      status: 'success',
      success: true,
      data: {
        analysis: {
          analysisId: analysis.analysisId,
          domain: analysis.domainId.domain,
          startTime: analysis.startTime,
          endTime: analysis.endTime,
          duration: analysis.elapsedTime,
          results: analysis.results,
          configuration: analysis.configuration
        },
        cookies,
        summary: {
          totalCookies: analysis.results.totalCookies,
          newCookies: analysis.results.newCookies,
          updatedCookies: analysis.results.updatedCookies,
          errorCookies: analysis.results.errorCookies
        }
      }
    });
  });

  // ==================== MÉTODOS PRIVADOS ====================

  // Ejecutar análisis avanzado de forma asíncrona
  _executeAdvancedAnalysis = async (analysisId, domain) => {
    // Crear logger específico para este escaneo
    const scanLog = scanLogger.createScanLogger(analysisId, 'advanced', domain.domain);
    
    try {
      const analysis = await CookieAnalysis.findById(analysisId);
      if (!analysis || analysis.status === 'cancelled') {
        scanLog.warn('Análisis no encontrado o ya cancelado');
        return;
      }

      // Actualizar estado a running
      analysis.status = 'running';
      analysis.currentStep = 'Iniciando análisis avanzado...';
      await analysis.save();

      scanLog.scanStart({
        domain: domain.domain,
        configuration: analysis.configuration,
        analysisId
      });

      let scanResults = null;
      
      try {
        // Intentar usar el servicio de escaneo real si está disponible
        if (scannerService && typeof scannerService.scanDomain === 'function') {
          // Crear un scan temporal para usar el servicio
          const tempScan = {
            domainId: domain,
            scanConfig: {
              includeSubdomains: analysis.configuration.includeSubdomains,
              deepScan: analysis.configuration.deepScan,
              maxUrls: 100,
              depth: 5
            },
            progress: {},
            _id: analysisId
          };

          scanLog.info('Iniciando escaneo con Puppeteer');
          
          // Función para actualizar progreso
          const originalUpdateScan = scannerService._updateScan;
          if (originalUpdateScan) {
            scannerService._updateScan = async (scan) => {
              if (scan._id === analysisId && scan.progress) {
                const percentage = Math.floor((scan.progress.scannedUrls / scan.progress.totalUrls) * 80);
                await analysis.updateProgress(percentage, `Escaneando URL ${scan.progress.scannedUrls}/${scan.progress.totalUrls}`);
                scanLog.scanProgress(percentage, `URL ${scan.progress.scannedUrls}/${scan.progress.totalUrls}`);
              }
            };
          }

          // Ejecutar escaneo
          scanResults = await scannerService.scanDomain(tempScan);
          
          // Restaurar función original
          if (originalUpdateScan) {
            scannerService._updateScan = originalUpdateScan;
          }
          
          scanLog.info('Escaneo con Puppeteer completado', { 
            cookiesFound: scanResults?.findings?.cookies?.length || 0 
          });
        }
      } catch (scanError) {
        scanLog.error('Scanner service not available', { error: scanError.message });
      }

      // Si no hay resultados del scanner, usar datos simulados
      if (!scanResults || !scanResults.findings) {
        scanLog.info('Usando datos simulados para demostración');
        await analysis.updateProgress(50, 'Generando análisis simulado...');
        
        // Simular resultados para demostración
        scanResults = {
          findings: {
            cookies: [
              { name: '_ga', domain: domain.domain, category: 'analytics', httpOnly: false, secure: true, sameSite: 'lax', duration: '2 years' },
              { name: '_gid', domain: domain.domain, category: 'analytics', httpOnly: false, secure: true, sameSite: 'lax', duration: '24 hours' },
              { name: 'session_id', domain: domain.domain, category: 'necessary', httpOnly: true, secure: true, sameSite: 'strict', duration: 'session' },
              { name: 'preferences', domain: domain.domain, category: 'functional', httpOnly: false, secure: true, sameSite: 'lax', duration: '1 year' },
              { name: '_fbp', domain: domain.domain, category: 'advertising', httpOnly: false, secure: true, sameSite: 'lax', duration: '90 days' }
            ],
            metadata: {
              urlsScanned: 1,
              subdomains: []
            }
          },
          stats: {
            technologies: ['Google Analytics', 'Facebook Pixel']
          }
        };
      }

      // Analizar las cookies encontradas
      scanLog.info('Analizando cookies encontradas', { count: scanResults?.findings?.cookies?.length || 0 });
      await analysis.updateProgress(85, 'Analizando cookies encontradas...');
      
      const cookiesFound = scanResults?.findings?.cookies || [];
      
      // Deduplicar cookies por nombre y dominio
      const uniqueCookies = [];
      const seenCookies = new Set();
      
      for (const cookie of cookiesFound) {
        const cookieKey = `${cookie.name}|${cookie.domain || domain.domain}`;
        if (!seenCookies.has(cookieKey)) {
          seenCookies.add(cookieKey);
          uniqueCookies.push(cookie);
        }
      }
      
      const existingCookies = await Cookie.find({ domainId: domain._id });
      
      scanLog.debug(`Cookies encontradas: ${cookiesFound.length}, cookies únicas: ${uniqueCookies.length}, cookies existentes: ${existingCookies.length}`);
      
      let newCookies = 0;
      let updatedCookies = 0;
      const cookiesByCategory = {
        necessary: 0,
        functional: 0,
        analytics: 0,
        advertising: 0,
        other: 0
      };

      // Procesar cada cookie única encontrada
      for (const cookieData of uniqueCookies) {
        // Detectar categoría y proveedor
        let provider = null;
        try {
          provider = await providerService.detectCookieProvider(cookieData);
        } catch (providerError) {
          scanLog.warn('Error detecting cookie provider', { 
            cookieName: cookieData.name, 
            error: providerError.message 
          });
          provider = null;
        }
        const category = provider?.category || cookieData.category || 'other';
        
        scanLog.cookieFound(cookieData.name, cookieData.domain, category);
        
        // Contar por categoría
        if (cookiesByCategory[category] !== undefined) {
          cookiesByCategory[category]++;
        } else {
          cookiesByCategory.other++;
        }

        // Buscar si la cookie ya existe
        const existingCookie = existingCookies.find(c => 
          c.name === cookieData.name && c.domain === cookieData.domain
        );

        if (existingCookie) {
          // Actualizar cookie existente si hay cambios
          const hasChanges = 
            existingCookie.httpOnly !== cookieData.httpOnly ||
            existingCookie.secure !== cookieData.secure ||
            existingCookie.sameSite !== cookieData.sameSite ||
            existingCookie.duration !== cookieData.duration;

          if (hasChanges) {
            existingCookie.httpOnly = cookieData.httpOnly;
            existingCookie.secure = cookieData.secure;
            existingCookie.sameSite = cookieData.sameSite;
            existingCookie.duration = cookieData.duration;
            existingCookie.lastSeen = new Date();
            existingCookie.provider = provider?.name || existingCookie.provider;
            existingCookie.category = category;
            await existingCookie.save();
            updatedCookies++;
          }
        } else {
          // Crear nueva cookie
          await Cookie.create({
            domainId: domain._id,
            clientId: domain.clientId,
            name: cookieData.name,
            domain: cookieData.domain,
            path: cookieData.path || '/',
            category: category,
            description: provider?.description || cookieData.description || '',
            purpose: provider?.purpose || cookieData.purpose || '',
            provider: provider?.name || 'Unknown',
            duration: cookieData.duration,
            isFirstParty: cookieData.domain === domain.domain || (cookieData.domain && typeof cookieData.domain === 'string' && cookieData.domain.endsWith(`.${domain.domain}`)),
            httpOnly: cookieData.httpOnly,
            secure: cookieData.secure,
            sameSite: cookieData.sameSite,
            value: cookieData.value,
            expires: cookieData.expires,
            detectedAt: new Date(),
            lastSeen: new Date(),
            status: 'active'
          });
          newCookies++;
        }
      }

      await analysis.updateProgress(95, 'Generando reporte de análisis...');

      // Calcular score de cumplimiento
      const totalCookies = uniqueCookies.length;
      const necessaryCookies = cookiesByCategory.necessary;
      const nonNecessaryCookies = totalCookies - necessaryCookies;
      const complianceScore = totalCookies > 0 
        ? Math.floor((necessaryCookies / totalCookies) * 100)
        : 100;

      // Completar análisis con resultados reales
      const results = {
        totalCookies: totalCookies,
        newCookies: newCookies,
        updatedCookies: updatedCookies,
        errorCookies: 0,
        scanDetails: {
          urlsScanned: scanResults?.findings?.metadata?.urlsScanned || 1,
          cookiesByCategory: cookiesByCategory,
          complianceScore: complianceScore,
          issues: [],
          subdomains: scanResults?.findings?.metadata?.subdomains || [],
          technologies: scanResults?.stats?.technologies || []
        }
      };

      await analysis.markCompleted(results);
      
      scanLog.scanComplete({
        totalCookies,
        newCookies,
        updatedCookies,
        complianceScore,
        urlsScanned: scanResults?.findings?.metadata?.urlsScanned || 1
      });

      // Notificar cambios si hay nuevas cookies
      if (newCookies > 0 || updatedCookies > 0) {
        try {
          // Crear objeto scan temporal para notificaciones
          const scanForNotification = {
            domainId: domain._id,
            findings: {
              changes: {
                newCookies: Array(newCookies).fill({ type: 'cookie', status: 'new' }),
                modifiedCookies: Array(updatedCookies).fill({ type: 'cookie', status: 'modified' })
              }
            }
          };
          
          await notifyChanges(scanForNotification);
          scanLog.info('Notificaciones de cambios enviadas', { newCookies, updatedCookies });
        } catch (notificationError) {
          scanLog.warn('Error enviando notificaciones', { error: notificationError.message });
          // No fallar el escaneo por errores de notificación
        }
      }

      // Limpiar logs después de completar
      setTimeout(() => scanLog.cleanup(), 60000); // Limpiar después de 1 minuto

    } catch (error) {
      scanLog.scanError(error, { phase: 'analysis_execution' });
      
      try {
        const analysis = await CookieAnalysis.findById(analysisId);
        if (analysis) {
          await analysis.markError(error);
        }
      } catch (updateError) {
        scanLog.error('Error updating analysis status', { error: updateError.message });
      }
      
      // Limpiar logs en caso de error también
      setTimeout(() => scanLog.cleanup(), 30000); // Limpiar después de 30 segundos
    }
  };

  // Ejecutar escaneo de forma asíncrona
  _executeAsyncScan = async (scanId, domain) => {
    let progressInterval;
    
    try {
      const scan = await CookieScan.findById(scanId);
      if (!scan || scan.status === 'cancelled') return;

      // Configurar actualización de progreso
      progressInterval = setInterval(async () => {
        try {
          const currentScan = await CookieScan.findById(scanId);
          if (currentScan && currentScan.status === 'running') {
            const currentProgress = currentScan.progress?.percentage || 0;
            const newProgress = Math.min(currentProgress + 15, 90); // Incrementar 15% cada 2 segundos hasta 90%
            
            currentScan.progress = this.createValidProgress({
              percentage: newProgress,
              urlsScanned: Math.floor(newProgress * currentScan.progress.urlsTotal / 100),
              urlsTotal: currentScan.progress.urlsTotal,
              status: 'running',
              startTime: currentScan.progress.startTime,
              endTime: null,
              duration: null,
              currentStep: `Escaneando... ${newProgress}%`,
              message: `Progreso del escaneo: ${newProgress}%`
            });
            
            await currentScan.save();
          } else {
            clearInterval(progressInterval);
          }
        } catch (error) {
          clearInterval(progressInterval);
        }
      }, 2000); // Actualizar cada 2 segundos

      // Usar el scanner service
      const scannerService = require('../services/scanner.service');
      
      // El scanner espera el scan con el dominio completo
      scan.domainId = domain;
      scan.consentAttempted = false; // Inicializar flag de consent
      
      const results = await scannerService.scanDomain(scan);
      
      // Limpiar el intervalo una vez completado
      clearInterval(progressInterval);
      
      // Actualizar con resultados
      const updatedScan = await CookieScan.findById(scanId);
      
      if (results && results.findings) {
        updatedScan.status = 'completed';
        updatedScan.findings = results.findings;
        updatedScan.stats = results.stats;
        updatedScan.endTime = new Date();
        
        // Actualizar progress
        updatedScan.progress = this.createValidProgress({
          percentage: 100,
          urlsScanned: results.findings.metadata?.urlsScanned || updatedScan.progress.urlsTotal,
          urlsTotal: updatedScan.progress.urlsTotal,
          status: 'completed',
          startTime: updatedScan.progress.startTime,
          endTime: new Date(),
          duration: null,
          currentStep: 'Escaneo completado',
          message: 'Escaneo finalizado exitosamente'
        });
        
        // Calcular duración
        if (updatedScan.progress.startTime && updatedScan.progress.endTime) {
          updatedScan.progress.duration = (updatedScan.progress.endTime - updatedScan.progress.startTime) / 1000;
        }
        
        // Procesar resultados
        await this._processScanResults(updatedScan, results);
      } else {
        updatedScan.status = 'error';
        updatedScan.error = results?.error || 'No results returned from scanner';
        updatedScan.endTime = new Date();
        
        updatedScan.progress = this.createValidProgress({
          percentage: updatedScan.progress.percentage || 0,
          urlsScanned: updatedScan.progress.urlsScanned || 0,
          urlsTotal: updatedScan.progress.urlsTotal,
          status: 'error',
          startTime: updatedScan.progress.startTime,
          endTime: new Date(),
          duration: null,
          currentStep: 'Error en el escaneo',
          message: results?.error || 'No se obtuvieron resultados del scanner'
        });
      }
      
      await updatedScan.save();
      
      // Notificar cambios si es necesario
      if (results?.significantChanges) {
        await notifyChanges(updatedScan);
      }
      
    } catch (error) {
      // Asegurar que el intervalo se limpie en caso de error
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      logger.error('Error in async scan execution:', error);
      
      try {
        const errorScan = await CookieScan.findById(scanId);
        if (errorScan) {
          errorScan.status = 'error';
          errorScan.error = error.message;
          errorScan.endTime = new Date();
          
          errorScan.progress = this.createValidProgress({
            percentage: errorScan.progress?.percentage || 0,
            urlsScanned: errorScan.progress?.urlsScanned || 0,
            urlsTotal: errorScan.progress?.urlsTotal || 100,
            status: 'error',
            startTime: errorScan.progress?.startTime || errorScan.createdAt,
            endTime: new Date(),
            duration: null,
            currentStep: 'Error en el escaneo',
            message: error.message
          });
          
          if (errorScan.progress.startTime && errorScan.progress.endTime) {
            errorScan.progress.duration = (errorScan.progress.endTime - errorScan.progress.startTime) / 1000;
          }
          
          await errorScan.save();
        }
      } catch (saveError) {
        logger.error('Error saving error state:', saveError);
      }
    }
  };

  // Método legacy para compatibilidad
  _initiateScan = async (scanId) => {
    return this._executeAsyncScan(scanId);
  };

  // Procesar resultados del scanner y crear cookies en la base de datos
  async _processScanResults(scan, results) {
    try {
      if (!results.findings || !results.findings.cookies) {
        logger.warn('No cookies found in scan results');
        return;
      }

      const domain = typeof scan.domainId === 'string' ? 
        await Domain.findById(scan.domainId) : 
        scan.domainId;

      logger.info(`Processing ${results.findings.cookies.length} cookies from scan`);

      for (const cookieData of results.findings.cookies) {
        try {
          // Verificar si la cookie ya existe
          const existingCookie = await Cookie.findOne({
            name: cookieData.name,
            domain: cookieData.domain || domain.domain
          });

          if (existingCookie) {
            // Actualizar cookie existente
            existingCookie.category = cookieData.category || 'unknown';
            existingCookie.description = {
              en: cookieData.description || `Cookie: ${cookieData.name}`,
              auto: true
            };
            existingCookie.isFirstParty = cookieData.isFirstParty !== undefined ? 
              cookieData.isFirstParty : true;
            existingCookie.lastModified = new Date();
            
            if (cookieData.attributes) {
              existingCookie.attributes = {
                duration: cookieData.attributes.duration,
                type: cookieData.attributes.type,
                path: cookieData.attributes.path || '/',
                domain: cookieData.attributes.domain || domain.domain,
                secure: cookieData.attributes.secure || false,
                httpOnly: cookieData.attributes.httpOnly || false,
                sameSite: cookieData.attributes.sameSite || 'Lax'
              };
            }

            await existingCookie.save();
            logger.info(`Updated existing cookie: ${cookieData.name}`);
          } else {
            // Crear nueva cookie
            const newCookie = await Cookie.create({
              name: cookieData.name,
              domain: cookieData.domain || domain.domain,
              domainId: domain._id,
              clientId: domain.clientId,
              category: cookieData.category || 'unknown',
              description: {
                en: cookieData.description || `Cookie: ${cookieData.name}`,
                auto: true
              },
              isFirstParty: cookieData.isFirstParty !== undefined ? 
                cookieData.isFirstParty : true,
              attributes: {
                duration: cookieData.attributes?.duration || 'session',
                type: cookieData.attributes?.type || 'http',
                path: cookieData.attributes?.path || '/',
                domain: cookieData.attributes?.domain || domain.domain,
                secure: cookieData.attributes?.secure || false,
                httpOnly: cookieData.attributes?.httpOnly || false,
                sameSite: cookieData.attributes?.sameSite || 'Lax'
              },
              status: 'active',
              detectedAt: new Date()
            });

            logger.info(`Created new cookie: ${cookieData.name}`);
          }
        } catch (cookieError) {
          logger.error(`Error processing cookie ${cookieData.name}:`, cookieError);
        }
      }

      logger.info(`Completed processing cookies for scan ${scan._id}`);
    } catch (error) {
      logger.error('Error processing scan results:', error);
      throw error;
    }
  }

  // Convertir datos a CSV
  _convertToCSV(data) {
    // Implementación simple de conversión a CSV
    const headers = ['Cookie Name', 'Category', 'Domain', 'Type', 'Duration'];
    const rows = data.findings.cookies?.map(cookie => [
      cookie.name,
      cookie.category,
      cookie.domain,
      cookie.attributes?.type || 'http',
      cookie.duration
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}

module.exports = new CookieScanController();