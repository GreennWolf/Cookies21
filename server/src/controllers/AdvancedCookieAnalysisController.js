const CookieAnalysisResult = require('../models/CookieAnalysisResult');
const IntelligentCookieResult = require('../models/IntelligentCookieResult');
const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const advancedCookieAnalyzer = require('../services/advancedCookieAnalyzer.service');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Import opcional del worker
let AnalysisWorker;
try {
  AnalysisWorker = require('../jobs/advancedCookieAnalysisWorker').AnalysisWorker;
} catch (err) {
  logger.warn('AnalysisWorker not available, using direct execution');
}

class AdvancedCookieAnalysisController {
  
  /**
   * Iniciar un nuevo análisis avanzado de cookies
   */
  startAdvancedAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      scanType = 'full',
      includeSubdomains = true,
      maxUrls = 100,
      depth = 5,
      timeout = 30000,
      priority = 'normal'
    } = req.body;

    // Verificar que el dominio existe y el usuario tiene acceso
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    // Verificar si ya hay un análisis en progreso
    const activeAnalysis = await CookieAnalysisResult.getActiveAnalysis(domainId);
    if (activeAnalysis) {
      // Si el análisis lleva más de 1 hora, marcarlo como fallido
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (activeAnalysis.progress.startTime < hourAgo) {
        activeAnalysis.status = 'failed';
        activeAnalysis.progress.currentStep = 'Timeout - análisis cancelado automáticamente';
        await activeAnalysis.save();
      } else {
        throw new AppError('An analysis is already in progress for this domain', 400);
      }
    }

    // Configuración del análisis
    const analysisConfig = {
      scanType,
      includeSubdomains,
      maxUrls: Math.min(maxUrls, 1000), // Límite máximo
      depth: Math.min(depth, 10), // Límite máximo
      timeout,
      retries: 3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      acceptLanguages: ['es-ES', 'es', 'en-US', 'en'],
      priority
    };

    try {
      // Crear registro inicial del análisis primero
      const analysis = new CookieAnalysisResult({
        domainId,
        domain: domain.domain,
        analysisConfig,
        status: 'pending',
        metadata: {
          triggeredBy: req.userId,
          triggerType: 'manual',
          version: '2.0.0',
          analysisEngine: 'AdvancedPuppeteer'
        },
        progress: {
          currentPhase: 'initialization',
          percentage: 0,
          startTime: new Date()
        }
      });

      await analysis.save();

      // Añadir trabajo a la cola para procesamiento asíncrono
      if (typeof AnalysisWorker !== 'undefined' && AnalysisWorker.addAnalysisJob) {
        await AnalysisWorker.addAnalysisJob(
          analysis._id.toString(),
          domainId,
          domain.domain,
          analysisConfig,
          priority
        );
      } else {
        // Si no hay worker, ejecutar directamente (para desarrollo)
        setTimeout(async () => {
          try {
            await advancedCookieAnalyzer.startAnalysis(
              domainId,
              domain.domain,
              analysisConfig,
              analysis._id.toString()
            );
          } catch (err) {
            logger.error('Error in async analysis:', err);
            // Actualizar análisis con error
            try {
              analysis.status = 'failed';
              analysis.progress.currentStep = `Error: ${err.message}`;
              await analysis.save();
            } catch (saveErr) {
              logger.error('Error saving failed analysis:', saveErr);
            }
          }
        }, 1000);
      }

      logger.info(`Advanced analysis started for domain ${domain.domain} by user ${req.userId}`);

      res.status(201).json({
        status: 'success',
        message: 'Advanced analysis started successfully',
        data: {
          analysisId: analysis._id,
          scanId: analysis.scanId,
          status: analysis.status,
          estimatedDuration: this.estimateAnalysisDuration(analysisConfig),
          progress: analysis.progress
        }
      });

    } catch (error) {
      logger.error(`Failed to start advanced analysis for domain ${domain.domain}:`, error);
      throw new AppError(`Failed to start analysis: ${error.message}`, 500);
    }
  });

  /**
   * Iniciar análisis inteligente con clasificación automática y detección de vendors
   */
  startIntelligentAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      deepScan = true,
      includeThirdParty = true,
      timeout = 30000,
      generateRecommendations = true
    } = req.body;

    // Verificar que el dominio existe y el usuario tiene acceso
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    // Verificar permisos
    const clientId = req.isOwner ? domain.clientId : req.clientId;
    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    try {
      // Generar ID único para el análisis
      const analysisId = uuidv4();

      // Configuración del análisis inteligente
      const analysisConfig = {
        deepScan,
        includeThirdParty,
        timeout,
        generateRecommendations,
        analysisType: 'intelligent',
        version: '2.0'
      };

      logger.info(`🧠 Iniciando análisis inteligente para dominio: ${domain.domain}`);

      // Ejecutar análisis inteligente de forma asíncrona
      setTimeout(async () => {
        try {
          const result = await advancedCookieAnalyzer.performIntelligentAnalysis(
            domainId,
            clientId,
            domain.domain,
            analysisId,
            analysisConfig
          );

          logger.info(`✅ Análisis inteligente completado para ${domain.domain}: ${result.totalCookies} cookies analizadas`);
        } catch (err) {
          logger.error(`❌ Error en análisis inteligente para ${domain.domain}:`, err);
        }
      }, 1000);

      res.status(201).json({
        status: 'success',
        message: 'Análisis inteligente iniciado correctamente',
        data: {
          analysisId,
          domain: domain.domain,
          analysisType: 'intelligent',
          config: analysisConfig,
          estimatedDuration: 60, // 1 minuto estimado
          status: 'running'
        }
      });

    } catch (error) {
      logger.error(`Failed to start intelligent analysis for domain ${domain.domain}:`, error);
      throw new AppError(`Failed to start intelligent analysis: ${error.message}`, 500);
    }
  });

  /**
   * Obtener resultados del análisis inteligente
   */
  getIntelligentAnalysisResults = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { limit = 1, includeDetails = false } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    // Buscar resultados del análisis inteligente
    let query = { domainId, status: 'completed' };
    if (!req.isOwner) {
      query.clientId = req.clientId;
    }

    const results = await IntelligentCookieResult.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    if (results.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontraron resultados de análisis inteligente'
      });
    }

    // Formatear respuesta
    const responseData = results.map(result => {
      const baseData = {
        resultId: result._id,
        analysisId: result.analysisId,
        domain: result.domain,
        analysisDate: result.createdAt,
        summary: result.summary,
        metadata: result.metadata
      };

      if (includeDetails) {
        baseData.cookies = result.cookies;
        baseData.detailedBreakdown = {
          byPurpose: result.summary.byPurpose,
          byVendor: Object.fromEntries(result.summary.byVendor),
          complianceOverview: result.getComplianceOverview(),
          highRiskCookies: result.getHighRiskCookies().slice(0, 10),
          topVendors: result.summary.topVendors,
          criticalIssues: result.summary.criticalIssues
        };
      }

      return baseData;
    });

    res.status(200).json({
      status: 'success',
      results: responseData.length,
      data: limit === 1 ? responseData[0] : responseData
    });
  });

  /**
   * Generar reporte de cumplimiento GDPR
   */
  generateComplianceReport = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { format = 'json' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const clientId = req.isOwner ? domain.clientId : req.clientId;
    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    // Generar reporte usando el método estático del modelo
    const report = await IntelligentCookieResult.generateComplianceReport(domainId, clientId);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontraron análisis completados para generar el reporte'
      });
    }

    // Agregar información adicional al reporte
    report.generatedAt = new Date();
    report.generatedBy = req.userId;
    report.reportVersion = '2.0';

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        data: report
      });
    } else {
      // En el futuro se pueden agregar otros formatos (PDF, CSV, etc.)
      throw new AppError('Formato de reporte no soportado', 400);
    }
  });

  /**
   * Obtener el estado de un análisis
   */
  getAnalysisStatus = catchAsync(async (req, res) => {
    const { analysisId } = req.params;

    const analysis = await CookieAnalysisResult.findById(analysisId).populate('domainId');
    
    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && analysis.domainId.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this analysis', 403);
    }

    // Calcular métricas en tiempo real
    const realTimeMetrics = this.calculateRealTimeMetrics(analysis);

    res.status(200).json({
      status: 'success',
      data: {
        analysis: {
          id: analysis._id,
          scanId: analysis.scanId,
          domain: analysis.domain,
          status: analysis.status,
          progress: analysis.progress,
          statistics: analysis.statistics,
          realTimeMetrics,
          isCompleted: analysis.isCompleted,
          isRunning: analysis.isRunning,
          duration: analysis.duration
        }
      }
    });
  });

  /**
   * Obtener resultados completos del análisis
   */
  getAnalysisResults = catchAsync(async (req, res) => {
    const { analysisId } = req.params;
    const { includeDetails = true, format = 'json' } = req.query;

    const analysis = await CookieAnalysisResult.findById(analysisId).populate('domainId');
    
    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && analysis.domainId.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this analysis', 403);
    }

    if (analysis.status !== 'completed') {
      throw new AppError('Analysis not completed yet', 400);
    }

    // Preparar datos según el nivel de detalle solicitado
    let responseData = {
      analysis: {
        id: analysis._id,
        scanId: analysis.scanId,
        domain: analysis.domain,
        status: analysis.status,
        duration: analysis.duration,
        timestamp: analysis.updatedAt
      },
      summary: {
        totalCookies: analysis.statistics.totalCookies,
        cookiesByCategory: this.groupByCategory(analysis.cookies),
        cookiesByProvider: this.groupByProvider(analysis.cookies),
        riskAssessment: analysis.statistics.riskAssessment,
        complianceScore: analysis.statistics.complianceScore
      },
      changes: analysis.changes,
      recommendations: analysis.recommendations
    };

    if (includeDetails === 'true') {
      responseData.detailed = {
        cookies: analysis.cookies,
        scripts: analysis.scripts,
        technologies: analysis.technologies,
        consentManagement: analysis.consentManagement,
        localStorage: analysis.localStorage,
        sessionStorage: analysis.sessionStorage,
        networkRequests: analysis.networkRequests.slice(0, 100), // Limitar para rendimiento
        trackingPixels: analysis.trackingPixels,
        forms: analysis.forms,
        iframes: analysis.iframes
      };
    }

    // Manejar diferentes formatos de respuesta
    if (format === 'csv') {
      return this.exportToCSV(res, analysis);
    } else if (format === 'pdf') {
      return this.exportToPDF(res, analysis);
    }

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  });

  /**
   * Obtener análisis de compliance
   */
  getComplianceReport = catchAsync(async (req, res) => {
    const { analysisId } = req.params;

    const analysis = await CookieAnalysisResult.findById(analysisId).populate('domainId');
    
    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && analysis.domainId.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this analysis', 403);
    }

    if (analysis.status !== 'completed') {
      throw new AppError('Analysis not completed yet', 400);
    }

    const complianceReport = analysis.generateComplianceReport();

    res.status(200).json({
      status: 'success',
      data: {
        complianceReport,
        analysisId: analysis._id,
        domain: analysis.domain,
        timestamp: analysis.updatedAt
      }
    });
  });

  /**
   * Cancelar un análisis en progreso
   */
  cancelAnalysis = catchAsync(async (req, res) => {
    const { analysisId } = req.params;

    const analysis = await CookieAnalysisResult.findById(analysisId).populate('domainId');
    
    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && analysis.domainId.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this analysis', 403);
    }

    if (!analysis.isRunning) {
      throw new AppError('Analysis is not running and cannot be cancelled', 400);
    }

    // Cancelar análisis
    analysis.status = 'cancelled';
    analysis.progress.currentStep = 'Análisis cancelado por el usuario';
    analysis.progress.endTime = new Date();
    
    await analysis.save();

    logger.info(`Analysis ${analysis.scanId} cancelled by user ${req.userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Analysis cancelled successfully',
      data: {
        analysisId: analysis._id,
        status: analysis.status
      }
    });
  });

  /**
   * Obtener historial de análisis para un dominio
   */
  getAnalysisHistory = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    // Construir query
    const query = { domainId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Construir sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar query con paginación
    const analyses = await CookieAnalysisResult.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('scanId status progress.startTime progress.endTime statistics.totalCookies createdAt updatedAt');

    const total = await CookieAnalysisResult.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        analyses,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  });

  /**
   * Comparar dos análisis
   */
  compareAnalyses = catchAsync(async (req, res) => {
    const { analysisId1, analysisId2 } = req.params;

    const [analysis1, analysis2] = await Promise.all([
      CookieAnalysisResult.findById(analysisId1).populate('domainId'),
      CookieAnalysisResult.findById(analysisId2).populate('domainId')
    ]);

    if (!analysis1 || !analysis2) {
      throw new AppError('One or both analyses not found', 404);
    }

    // Verificar permisos
    if (!req.isOwner && (
      analysis1.domainId.clientId.toString() !== req.clientId ||
      analysis2.domainId.clientId.toString() !== req.clientId
    )) {
      throw new AppError('Access denied to these analyses', 403);
    }

    if (analysis1.status !== 'completed' || analysis2.status !== 'completed') {
      throw new AppError('Both analyses must be completed for comparison', 400);
    }

    const comparison = this.performAnalysisComparison(analysis1, analysis2);

    res.status(200).json({
      status: 'success',
      data: {
        comparison,
        analysis1: {
          id: analysis1._id,
          scanId: analysis1.scanId,
          timestamp: analysis1.updatedAt
        },
        analysis2: {
          id: analysis2._id,
          scanId: analysis2.scanId,
          timestamp: analysis2.updatedAt
        }
      }
    });
  });

  /**
   * Obtener tendencias de cookies para un dominio
   */
  getCookieTrends = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { days = 30 } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    const trends = await CookieAnalysisResult.getCookieTrends(domainId, parseInt(days));

    res.status(200).json({
      status: 'success',
      data: {
        trends,
        domain: domain.domain,
        period: `${days} days`
      }
    });
  });

  /**
   * Programar análisis automático
   */
  scheduleAnalysis = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      schedule,
      analysisConfig = {},
      enabled = true
    } = req.body;

    // Verificar acceso al dominio
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    if (!req.isOwner && domain.clientId && domain.clientId.toString() !== req.clientId) {
      throw new AppError('Access denied to this domain', 403);
    }

    // Validar configuración de programación
    if (!schedule || !schedule.frequency) {
      throw new AppError('Schedule configuration is required', 400);
    }

    // Actualizar configuración de escaneo automático en el dominio
    domain.scanConfig = {
      ...domain.scanConfig,
      autoScanEnabled: enabled,
      scanInterval: schedule.frequency, // 'daily', 'weekly', 'monthly'
      scanType: analysisConfig.scanType || 'smart',
      includeSubdomains: analysisConfig.includeSubdomains || false,
      maxDepth: analysisConfig.depth || 3,
      lastScheduledScan: null,
      nextScheduledScan: this.calculateNextRun(schedule)
    };

    await domain.save();

    logger.info(`Analysis scheduled for domain ${domain.domain} by user ${req.userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Analysis scheduled successfully',
      data: {
        domainId: domain._id,
        scanConfig: domain.scanConfig
      }
    });
  });

  // Métodos auxiliares

  estimateAnalysisDuration(config) {
    // Estimación basada en configuración
    const baseTime = 30; // segundos base
    const urlFactor = Math.min(config.maxUrls, 100) * 0.5; // 0.5 segundos por URL
    const depthFactor = config.depth * 5; // 5 segundos por nivel de profundidad
    const subdomainFactor = config.includeSubdomains ? 30 : 0; // 30 segundos extra para subdominios

    return Math.round(baseTime + urlFactor + depthFactor + subdomainFactor);
  }

  calculateRealTimeMetrics(analysis) {
    const metrics = {
      cookiesPerMinute: 0,
      urlsPerMinute: 0,
      averagePageLoadTime: 0,
      errorRate: 0
    };

    if (analysis.progress.startTime) {
      const elapsedMinutes = (Date.now() - analysis.progress.startTime) / (1000 * 60);
      
      if (elapsedMinutes > 0) {
        metrics.cookiesPerMinute = Math.round(analysis.cookies.length / elapsedMinutes);
        metrics.urlsPerMinute = Math.round(analysis.progress.urlsAnalyzed / elapsedMinutes);
        metrics.errorRate = analysis.progress.errors.length / Math.max(analysis.progress.urlsAnalyzed, 1);
      }
    }

    return metrics;
  }

  groupByCategory(cookies) {
    const categories = {};
    cookies.forEach(cookie => {
      const category = cookie.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  groupByProvider(cookies) {
    const providers = {};
    cookies.forEach(cookie => {
      const provider = cookie.provider?.name || 'Propios';
      providers[provider] = (providers[provider] || 0) + 1;
    });
    return providers;
  }

  performAnalysisComparison(analysis1, analysis2) {
    return {
      summary: {
        analysis1Date: analysis1.updatedAt,
        analysis2Date: analysis2.updatedAt,
        timeDifference: Math.abs(analysis2.updatedAt - analysis1.updatedAt) / (1000 * 60 * 60 * 24), // días
        cookiesDifference: analysis2.statistics.totalCookies - analysis1.statistics.totalCookies
      },
      changes: {
        newCookies: this.findNewCookies(analysis1.cookies, analysis2.cookies),
        removedCookies: this.findNewCookies(analysis2.cookies, analysis1.cookies),
        modifiedCookies: this.findModifiedCookies(analysis1.cookies, analysis2.cookies),
        newProviders: this.findNewProviders(analysis1.cookies, analysis2.cookies),
        newTechnologies: this.findNewTechnologies(analysis1.technologies, analysis2.technologies)
      },
      riskComparison: {
        privacyRisk: {
          before: analysis1.statistics.riskAssessment.privacyRisk,
          after: analysis2.statistics.riskAssessment.privacyRisk,
          improvement: this.calculateRiskImprovement(
            analysis1.statistics.riskAssessment.privacyRisk,
            analysis2.statistics.riskAssessment.privacyRisk
          )
        },
        complianceRisk: {
          before: analysis1.statistics.riskAssessment.complianceRisk,
          after: analysis2.statistics.riskAssessment.complianceRisk,
          improvement: this.calculateRiskImprovement(
            analysis1.statistics.riskAssessment.complianceRisk,
            analysis2.statistics.riskAssessment.complianceRisk
          )
        }
      }
    };
  }

  findNewCookies(oldCookies, newCookies) {
    const oldCookieSet = new Set(oldCookies.map(c => `${c.name}:${c.domain}`));
    return newCookies.filter(c => !oldCookieSet.has(`${c.name}:${c.domain}`));
  }

  findModifiedCookies(oldCookies, newCookies) {
    const modifications = [];
    const oldCookieMap = new Map(oldCookies.map(c => [`${c.name}:${c.domain}`, c]));

    newCookies.forEach(newCookie => {
      const key = `${newCookie.name}:${newCookie.domain}`;
      const oldCookie = oldCookieMap.get(key);
      
      if (oldCookie) {
        const changes = this.compareCookiesDetailed(oldCookie, newCookie);
        if (changes.length > 0) {
          modifications.push({
            cookie: { name: newCookie.name, domain: newCookie.domain },
            changes
          });
        }
      }
    });

    return modifications;
  }

  findNewProviders(oldCookies, newCookies) {
    const oldProviders = new Set(oldCookies.map(c => c.provider?.name).filter(Boolean));
    const newProviders = new Set(newCookies.map(c => c.provider?.name).filter(Boolean));
    
    return Array.from(newProviders).filter(provider => !oldProviders.has(provider));
  }

  findNewTechnologies(oldTech, newTech) {
    const oldTechSet = new Set(oldTech.map(t => t.name));
    return newTech.filter(t => !oldTechSet.has(t.name));
  }

  compareCookiesDetailed(oldCookie, newCookie) {
    const changes = [];
    const fieldsToCompare = [
      'value', 'expires', 'secure', 'httpOnly', 'sameSite', 
      'category', 'size', 'duration'
    ];

    fieldsToCompare.forEach(field => {
      if (JSON.stringify(oldCookie[field]) !== JSON.stringify(newCookie[field])) {
        changes.push({
          field,
          oldValue: oldCookie[field],
          newValue: newCookie[field]
        });
      }
    });

    return changes;
  }

  calculateRiskImprovement(oldRisk, newRisk) {
    const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const oldLevel = riskLevels[oldRisk] || 0;
    const newLevel = riskLevels[newRisk] || 0;
    
    const difference = oldLevel - newLevel;
    
    if (difference > 0) return 'improved';
    if (difference < 0) return 'worsened';
    return 'unchanged';
  }

  calculateNextRun(schedule) {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case 'weekly':
        const targetDay = schedule.daysOfWeek[0];
        const currentDay = nextRun.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget <= 0 && (daysUntilTarget < 0 || nextRun <= now)) {
          daysUntilTarget += 7;
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;
        
      case 'monthly':
        nextRun.setDate(schedule.dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }
    
    return nextRun;
  }

  exportToCSV(res, analysis) {
    // Implementar exportación a CSV
    const csvData = this.convertAnalysisToCSV(analysis);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cookie-analysis-${analysis.scanId}.csv"`);
    res.send(csvData);
  }

  exportToPDF(res, analysis) {
    // Implementar exportación a PDF (requiere librerías adicionales)
    throw new AppError('PDF export not implemented yet', 501);
  }

  convertAnalysisToCSV(analysis) {
    const headers = [
      'Cookie Name', 'Domain', 'Category', 'Provider', 'Secure', 
      'HttpOnly', 'SameSite', 'First Party', 'Duration', 'Size'
    ];
    
    const rows = analysis.cookies.map(cookie => [
      cookie.name,
      cookie.domain,
      cookie.category,
      cookie.provider?.name || 'Propios',
      cookie.secure ? 'Yes' : 'No',
      cookie.httpOnly ? 'Yes' : 'No',
      cookie.sameSite || 'None',
      cookie.isFirstParty ? 'Yes' : 'No',
      cookie.duration,
      cookie.size
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

module.exports = new AdvancedCookieAnalysisController();