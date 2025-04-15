const CookieScan = require('../models/CookieScan');
const Domain = require('../models/Domain');
const Cookie = require('../models/Cookie');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { scanDomain } = require('../services/scanner.service');
const { detectCookieProvider } = require('../services/provider.service');
const { analyzeCookieChanges } = require('../services/analytics.service');
const { notifyChanges } = require('../services/notification.service');
const cookieSyncService = require('../services/cookieSync.service');

class CookieScanController {
  // Iniciar nuevo escaneo
  startScan = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { scanType = 'full', priority = 'normal' } = req.body;
    const { clientId } = req;
  
    // Verificar acceso al dominio
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }
  
    // Verificar si ya existe un escaneo en progreso
    const activeScan = await CookieScan.findOne({
      domainId,
      status: { $in: ['pending', 'in_progress'] }
    });
    if (activeScan) {
      throw new AppError('A scan is already in progress for this domain', 400);
    }
  
    // Crear nuevo registro de escaneo
    const scan = await CookieScan.create({
      domainId,
      status: 'pending',
      scanConfig: {
        type: scanType,
        priority,
        includeSubdomains: true,
        maxUrls: scanType === 'quick' ? 10 : 100
      },
      metadata: {
        triggeredBy: req.userId,
        scanType: 'manual'
      }
    });
  
    // Iniciar escaneo y esperar a que finalice
    await this._initiateScan(scan._id);
  
    // Recargar el documento actualizado para devolver la información final
    const finalScan = await CookieScan.findById(scan._id).populate('domainId');
  
    res.status(201).json({
      status: 'success',
      data: { scan: finalScan }
    });
  });

  // Obtener estado del escaneo
  getScanStatus = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId } = req;

    const scan = await CookieScan.findById(scanId).populate('domainId');

    if (!scan || scan.domainId.clientId.toString() !== clientId) {
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
    const { clientId } = req;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

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

// Añadir estos métodos a la clase CookieScanController:

// Obtener cambios específicos de un escaneo
getScanChanges = catchAsync(async (req, res) => {
  const { scanId } = req.params;
  const { type } = req.query;
  const { clientId } = req;

  const scan = await CookieScan.findById(scanId)
    .populate('domainId');

  if (!scan || scan.domainId.clientId.toString() !== clientId) {
    throw new AppError('Scan not found', 404);
  }

  // Filtrar cambios por tipo si se especifica
  let changes = scan.findings.changes;
  if (type) {
    switch (type) {
      case 'added':
        changes = { newCookies: scan.findings.changes.newCookies };
        break;
      case 'modified':
        changes = { modifiedCookies: scan.findings.changes.modifiedCookies };
        break;
      case 'removed':
        changes = { removedCookies: scan.findings.changes.removedCookies };
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
  const { clientId } = req;

  const scan = await CookieScan.findById(scanId)
    .populate('domainId');

  if (!scan || scan.domainId.clientId.toString() !== clientId) {
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
      totalCookies: scan.findings.cookies.length,
      changes: scan.findings.changes
    },
    stats: scan.stats
  };

  if (includeDetails) {
    exportData.findings.cookies = scan.findings.cookies;
    exportData.findings.scripts = scan.findings.scripts;
  }

  // Formato de exportación
  switch (format) {
    case 'csv':
      // Convertir a CSV usando un servicio de exportación
      const csvData = await exportService.exportToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=scan_${scan.scanId}.csv`);
      return res.send(csvData);

    case 'pdf':
      // Generar PDF usando un servicio de exportación
      const pdfData = await exportService.exportToPDF(exportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=scan_${scan.scanId}.pdf`);
      return res.send(pdfData);

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
    const { clientId } = req;

    const scan = await CookieScan.findById(scanId).populate('domainId');

    if (!scan || scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    if (!['pending', 'in_progress'].includes(scan.status)) {
      throw new AppError('Scan cannot be cancelled', 400);
    }

    scan.status = 'cancelled';
    await scan.save();

    res.status(200).json({
      status: 'success',
      message: 'Scan cancelled successfully'
    });
  });

  // Obtener resultados del escaneo
  getScanResults = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { clientId } = req;

    const scan = await CookieScan.findById(scanId)
      .populate('domainId')
      .populate('findings.matches');

    if (!scan || scan.domainId.clientId.toString() !== clientId) {
      throw new AppError('Scan not found', 404);
    }

    if (scan.status !== 'completed') {
      throw new AppError('Scan results not available yet', 400);
    }

    // Obtener análisis de cambios
    const changes = await analyzeCookieChanges(scan.findings, scan.domainId);

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
    const { clientId } = req;

    const scan = await CookieScan.findById(scanId).populate('domainId');

    if (!scan || scan.domainId.clientId.toString() !== clientId) {
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
            domainId: scan.domainId,
            name: change.cookie.name,
            provider: await detectCookieProvider(change.cookie),
            category: change.cookie.category,
            description: change.cookie.description,
            attributes: change.cookie.attributes,
            detection: {
              method: 'scan',
              firstDetected: new Date(),
              lastSeen: new Date()
            }
          });
          break;

        case 'update':
          await Cookie.findByIdAndUpdate(change.cookieId, {
            $set: {
              provider: change.cookie.provider,
              category: change.cookie.category,
              description: change.cookie.description,
              attributes: change.cookie.attributes,
              'detection.lastSeen': new Date()
            }
          });
          break;

        case 'delete':
          await Cookie.findByIdAndUpdate(change.cookieId, {
            $set: {
              status: 'inactive'
            }
          });
          break;
      }
    }

    // Actualizar estado del dominio
    await Domain.findByIdAndUpdate(scan.domainId, {
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
    const { clientId } = req;

    const domain = await Domain.findOne({ _id: domainId, clientId });
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

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

  // Métodos privados
  async _initiateScan(scanId) {
    try {
      const scan = await CookieScan.findById(scanId).populate('domainId');
      if (!scan) return;
  
      scan.status = 'in_progress';
      scan.progress.startTime = new Date();
      await scan.save();
  
      const results = await scanDomain(scan);
  
      // Sincronizar las cookies detectadas con la BD
      if (results.findings && results.findings.cookies) {
        await cookieSyncService.syncCookies(scan.domainId._id, results.findings.cookies);
      }
  
      scan.findings = results.findings;
      scan.stats = results.stats;
      scan.status = 'completed';
      scan.progress.endTime = new Date();
      scan.progress.duration = (scan.progress.endTime - scan.progress.startTime) / 1000;
      
      await scan.save();
  
      if (results.significantChanges) {
        await notifyChanges(scan);
      }
    } catch (error) {
      await CookieScan.findByIdAndUpdate(scanId, {
        status: 'failed',
        errors: [{ message: error.message, timestamp: new Date() }]
      });
      console.error(error);
    }
  }
}

module.exports = new CookieScanController();