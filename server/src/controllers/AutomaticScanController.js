/**
 * AUTOMATIC SCAN CONTROLLER
 * 
 * Controlador para gestionar la configuración de escaneos automáticos por dominio
 */

const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Domain = require('../models/Domain');
const automaticScanScheduler = require('../services/automaticScanScheduler.service');
const logger = require('../utils/logger');

class AutomaticScanController {
  /**
   * Obtener configuración de escaneo automático para un dominio
   */
  getScanConfig = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para ver la configuración de este dominio', 403));
    }

    res.status(200).json({
      success: true,
      data: {
        domainId: domain._id,
        domain: domain.domain,
        scanConfig: domain.scanConfig || {
          autoScanEnabled: false,
          scanInterval: 'daily',
          scanType: 'full'
        }
      }
    });
  });

  /**
   * Configurar escaneo automático para un dominio
   */
  configureScan = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;
    const {
      autoScanEnabled,
      scanInterval,
      cronExpression,
      timezone,
      scanType,
      maxDepth,
      includeSubdomains,
      enableAdvancedAnalysis,
      notifyOnCompletion,
      retryAttempts,
      embedDetectionEnabled
    } = req.body;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para configurar este dominio', 403));
    }

    // Validar cronExpression si es personalizada
    if (scanInterval === 'custom' && cronExpression) {
      const cron = require('node-cron');
      if (!cron.validate(cronExpression)) {
        return next(new AppError('Expresión cron no válida', 400));
      }
    }

    // Configurar escaneo automático
    const scanConfig = {
      autoScanEnabled: Boolean(autoScanEnabled),
      scanInterval: scanInterval || 'daily',
      cronExpression: cronExpression || domain.scanConfig?.cronExpression || '0 2 * * *',
      timezone: timezone || 'UTC',
      scanType: scanType || 'full',
      maxDepth: maxDepth || 3,
      includeSubdomains: Boolean(includeSubdomains),
      enableAdvancedAnalysis: Boolean(enableAdvancedAnalysis),
      notifyOnCompletion: Boolean(notifyOnCompletion),
      retryAttempts: retryAttempts || 2,
      embedDetectionEnabled: embedDetectionEnabled !== undefined ? Boolean(embedDetectionEnabled) : true,
      updatedAt: new Date()
    };

    // Actualizar configuración en la base de datos
    await Domain.findByIdAndUpdate(domainId, {
      scanConfig: {
        ...domain.scanConfig,
        ...scanConfig
      }
    });

    // Configurar o detener escaneos automáticos según la configuración
    try {
      if (autoScanEnabled) {
        await automaticScanScheduler.configureDomainScans(domainId, scanConfig);
        logger.info(`Automatic scanning enabled for domain: ${domain.domain}`, {
          domainId,
          scanInterval: scanConfig.scanInterval,
          scanType: scanConfig.scanType
        });
      } else {
        await automaticScanScheduler.disableDomainScans(domainId);
        logger.info(`Automatic scanning disabled for domain: ${domain.domain}`, { domainId });
      }
    } catch (error) {
      logger.error('Error configuring automatic scans:', error);
      return next(new AppError('Error al configurar escaneos automáticos', 500));
    }

    res.status(200).json({
      success: true,
      message: autoScanEnabled ? 'Escaneos automáticos configurados correctamente' : 'Escaneos automáticos deshabilitados',
      data: {
        domainId,
        scanConfig
      }
    });
  });

  /**
   * Ejecutar escaneo manual inmediato
   */
  runManualScan = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;
    const { scanType = 'full' } = req.body;

    const domain = await Domain.findById(domainId).populate('clientId');
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId._id.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para escanear este dominio', 403));
    }

    // Verificar que no haya un escaneo en progreso
    if (domain.scanConfig?.scanStatus === 'scanning') {
      return next(new AppError('Ya hay un escaneo en progreso para este dominio', 409));
    }

    try {
      // Marcar escaneo como iniciado
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.scanStatus': 'scanning',
        'scanConfig.lastScheduledScan': new Date()
      });

      // Ejecutar escaneo en background
      const scanner = require('../services/scanner.service');
      
      // No esperamos el resultado para responder inmediatamente
      scanner.scanDomain(domain.domain, {
        clientId: domain.clientId._id,
        domainId: domainId,
        scanType: scanType,
        isManual: true
      }).then(result => {
        // Actualizar resultado del escaneo
        Domain.findByIdAndUpdate(domainId, {
          'scanConfig.scanStatus': 'completed',
          'scanConfig.lastScanResult': result,
          'scanConfig.lastScanDuration': Date.now() - new Date(domain.scanConfig.lastScheduledScan).getTime()
        }).catch(error => {
          logger.error('Error updating scan result:', error);
        });
      }).catch(error => {
        logger.error('Error in manual scan:', error);
        Domain.findByIdAndUpdate(domainId, {
          'scanConfig.scanStatus': 'error',
          'scanConfig.lastError': {
            message: error.message,
            timestamp: new Date(),
            stack: error.stack
          }
        }).catch(updateError => {
          logger.error('Error updating scan error:', updateError);
        });
      });

      res.status(200).json({
        success: true,
        message: 'Escaneo manual iniciado correctamente',
        data: {
          domainId,
          domain: domain.domain,
          scanType,
          status: 'scanning',
          startedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error starting manual scan:', error);
      
      // Restablecer estado en caso de error
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.scanStatus': 'error',
        'scanConfig.lastError': {
          message: error.message,
          timestamp: new Date()
        }
      });

      return next(new AppError('Error al iniciar el escaneo manual', 500));
    }
  });

  /**
   * Obtener estado de escaneos activos
   */
  getActiveScans = catchAsync(async (req, res, next) => {
    const { clientId, role } = req.user;

    let filter = {};
    if (role !== 'owner') {
      filter.clientId = clientId;
    }

    // Obtener dominios con escaneos activos
    const domains = await Domain.find({
      ...filter,
      'scanConfig.autoScanEnabled': true
    }).select('domain scanConfig');

    // Obtener estado del scheduler
    const schedulerStatus = automaticScanScheduler.getActiveScansStatus();

    res.status(200).json({
      success: true,
      data: {
        totalActiveDomains: domains.length,
        schedulerStatus,
        domains: domains.map(domain => ({
          domainId: domain._id,
          domain: domain.domain,
          config: domain.scanConfig,
          isScheduled: schedulerStatus.domains.some(d => d.domainId === domain._id.toString())
        }))
      }
    });
  });

  /**
   * Obtener historial de escaneos para un dominio
   */
  getScanHistory = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para ver el historial de este dominio', 403));
    }

    // En una implementación completa, esto vendría de una colección de historial de escaneos
    // Por ahora devolvemos la información del último escaneo
    const scanHistory = {
      domainId: domain._id,
      domain: domain.domain,
      currentConfig: domain.scanConfig,
      recentScans: domain.scanConfig?.lastScanResult ? [{
        scanId: `scan_${Date.now()}`,
        type: domain.scanConfig.scanType || 'full',
        status: domain.scanConfig.scanStatus || 'completed',
        startedAt: domain.scanConfig.lastScheduledScan,
        completedAt: domain.scanConfig.lastScanResult?.completedAt,
        duration: domain.scanConfig.lastScanDuration,
        results: domain.scanConfig.lastScanResult,
        error: domain.scanConfig.lastError
      }] : []
    };

    res.status(200).json({
      success: true,
      data: scanHistory
    });
  });

  /**
   * Habilitar/deshabilitar escaneo automático
   */
  toggleAutoScan = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;
    const { enabled } = req.body;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para modificar este dominio', 403));
    }

    try {
      // Actualizar estado en la base de datos
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.autoScanEnabled': Boolean(enabled),
        'scanConfig.updatedAt': new Date()
      });

      // Habilitar o deshabilitar en el scheduler
      if (enabled) {
        await automaticScanScheduler.enableDomainScans(domainId);
      } else {
        await automaticScanScheduler.disableDomainScans(domainId);
      }

      res.status(200).json({
        success: true,
        message: enabled ? 'Escaneo automático habilitado' : 'Escaneo automático deshabilitado',
        data: {
          domainId,
          autoScanEnabled: Boolean(enabled)
        }
      });

    } catch (error) {
      logger.error('Error toggling auto scan:', error);
      return next(new AppError('Error al cambiar el estado del escaneo automático', 500));
    }
  });

  /**
   * Procesamiento de datos de cookie detection del embed
   */
  processEmbedDetection = catchAsync(async (req, res, next) => {
    const {
      domainId,
      clientId,
      type,
      requestScheduledScanning,
      summary
    } = req.body;

    // Si es el primer escaneo y solicita programación automática
    if (type === 'initial_detection_report' && requestScheduledScanning && summary?.isFirstScan) {
      try {
        const domain = await Domain.findById(domainId);
        if (domain && !domain.scanConfig?.firstScanCompleted) {
          // Marcar primer escaneo como completado
          await Domain.findByIdAndUpdate(domainId, {
            'scanConfig.firstScanCompleted': true,
            'scanConfig.lastScheduledScan': new Date()
          });

          // Si el escaneo automático está habilitado, asegurar que esté programado
          if (domain.scanConfig?.autoScanEnabled) {
            await automaticScanScheduler.scheduleDomainScans(domain);
            logger.info(`Automatic scanning scheduled after first embed detection for domain: ${domain.domain}`);
          }
        }
      } catch (error) {
        logger.error('Error processing first scan detection:', error);
      }
    }

    // Delegar el resto del procesamiento al controlador de embed detection existente
    const embedCookieDetectionController = require('./EmbedCookieDetectionController');
    return embedCookieDetectionController.processCookieData(req, res, next);
  });

  /**
   * Configurar limpieza automática de cookies
   */
  configureCookieCleanup = catchAsync(async (req, res, next) => {
    const { domainId } = req.params;
    const { 
      cookieCleanupEnabled, 
      cookieCleanupAction 
    } = req.body;

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return next(new AppError('Dominio no encontrado', 404));
    }

    // Verificar permisos del cliente
    if (domain.clientId.toString() !== req.user.clientId.toString() && req.user.role !== 'owner') {
      return next(new AppError('No tienes permisos para configurar este dominio', 403));
    }

    // Actualizar configuración de limpieza
    const cleanupConfig = {
      cookieCleanupEnabled: cookieCleanupEnabled !== undefined ? Boolean(cookieCleanupEnabled) : true,
      cookieCleanupAction: cookieCleanupAction || 'mark_inactive'
    };

    await Domain.findByIdAndUpdate(domainId, {
      'scanConfig.cookieCleanupEnabled': cleanupConfig.cookieCleanupEnabled,
      'scanConfig.cookieCleanupAction': cleanupConfig.cookieCleanupAction,
      'scanConfig.updatedAt': new Date()
    });

    logger.info(`Cookie cleanup configuration updated for domain: ${domain.domain}`, {
      domainId,
      cookieCleanupEnabled: cleanupConfig.cookieCleanupEnabled,
      cookieCleanupAction: cleanupConfig.cookieCleanupAction
    });

    res.status(200).json({
      success: true,
      message: 'Configuración de limpieza de cookies actualizada',
      data: {
        domainId,
        cookieCleanupConfig: cleanupConfig
      }
    });
  });
}

module.exports = new AutomaticScanController();