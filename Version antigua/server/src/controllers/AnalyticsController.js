const Analytics = require('../models/Analytics');
const Domain = require('../models/Domain');
const Consent = require('../models/ConsentLog');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const analyticsService = require('../services/analytics.service');
const { generateReport } = require('../services/report.service');

class AnalyticsController {
  // Obtener resumen de analíticas
  getDashboardStats = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { period = '24h' } = req.query;
  
    const domains = await Domain.find({ clientId });
    const domainIds = domains.map(d => d._id);
  
    const stats = await Analytics.aggregate([
      {
        $match: {
          domainId: { $in: domainIds },
          'period.start': { 
            $gte: this._getPeriodStartDate(period) 
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: '$visits.total' },
          uniqueVisitors: { $sum: '$visits.unique' },
          // Acceptance rates
          avgAcceptanceRate: { 
            $avg: {
              $divide: [
                '$interactions.types.acceptAll.count',
                { $max: ['$interactions.total', 1] } // Avoid division by zero
              ]
            }
          },
          avgRejectionRate: { 
            $avg: {
              $divide: [
                '$interactions.types.rejectAll.count', 
                { $max: ['$interactions.total', 1] }
              ]
            }
          },
          avgCustomizationRate: {
            $avg: {
              $divide: [
                '$interactions.types.customize.count',
                { $max: ['$interactions.total', 1] }
              ]
            }
          },
          avgCloseRate: {
            $avg: {
              $divide: [
                '$interactions.types.close.count',
                { $max: ['$interactions.total', 1] }
              ]
            }
          },
          avgNoInteractionRate: {
            $avg: {
              $divide: [
                '$interactions.types.noInteraction.count',
                { $max: ['$interactions.total', 1] }
              ]
            }
          },
          // Time metrics
          avgTimeToDecision: { $avg: '$interactions.metrics.avgTimeToDecision' },
          avgTimeInPreferences: { $avg: '$interactions.metrics.avgTimeInPreferences' },
          // Regulation metrics (summing up values by regulation type)
          gdprVisits: { $sum: '$visits.byRegulation.gdpr' },
          ccpaVisits: { $sum: '$visits.byRegulation.ccpa' },
          lgpdVisits: { $sum: '$visits.byRegulation.lgpd' },
          otherRegulationVisits: { $sum: '$visits.byRegulation.other' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVisits: 1,
          uniqueVisitors: 1,
          avgAcceptanceRate: 1,
          avgRejectionRate: 1,
          avgCustomizationRate: 1,
          avgCloseRate: 1,
          avgNoInteractionRate: 1,
          avgTimeToDecision: 1,
          avgTimeInPreferences: 1,
          // Structure regulation data in the format expected by frontend
          visitsByRegulation: {
            gdpr: '$gdprVisits',
            ccpa: '$ccpaVisits',
            lgpd: '$lgpdVisits',
            other: '$otherRegulationVisits'
          }
        }
      }
    ]);
  
    res.status(200).json({
      status: 'success',
      data: { stats: stats[0] || {} }
    });
  });

  // Obtener analíticas por dominio
  getDomainAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const analytics = await Analytics.find({
      domainId,
      'period.start': { $gte: new Date(startDate) },
      'period.end': { $lte: new Date(endDate) },
      'period.granularity': granularity
    }).sort('period.start');

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  });

  // Obtener tendencias
  getTrends = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { metric, startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const trends = await Analytics.getTrends(
      domainId,
      new Date(startDate),
      new Date(endDate),
      granularity
    );

    res.status(200).json({
      status: 'success',
      data: { trends }
    });
  });

  // Obtener analíticas por cookie/vendor
  getCookieAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const cookieAnalytics = await analyticsService.getCookieAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: cookieAnalytics
    });
  });

  // Obtener datos demográficos
  getDemographics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const demographics = await analyticsService.getDemographicAnalysis(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: { demographics }
    });
  });

  // Generar reporte
  generateReport = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, format = 'pdf' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const data = await analyticsService.aggregateAnalytics(
      domainId, 
      new Date(startDate), 
      new Date(endDate)
    );
    
    const report = await generateReport(data, format);

    res.status(200).json({
      status: 'success',
      data: { report }
    });
  });

  // NUEVOS MÉTODOS
  
  // Obtener analíticas del recorrido del usuario
  getUserJourneyAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const journeyAnalytics = await analyticsService.getUserJourneyAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: journeyAnalytics
    });
  });

  // Obtener analíticas de contexto de sesión
  getSessionContextAnalytics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const sessionAnalytics = await analyticsService.getSessionContextAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: sessionAnalytics
    });
  });

  // Obtener métricas UX
  getUXMetrics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const uxMetrics = await analyticsService.getUXMetricsAnalytics(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(200).json({
      status: 'success',
      data: uxMetrics
    });
  });

  // Obtener resultados de test A/B
  getABTestResults = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, variantId } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const abTestResults = await analyticsService.getABTestResults(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      variantId: variantId || null
    });

    res.status(200).json({
      status: 'success',
      data: abTestResults
    });
  });

  // Actualizar métricas de rendimiento
  updatePerformanceMetrics = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const metrics = req.body;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const success = await analyticsService.updatePerformanceMetrics(domainId, metrics);

    res.status(200).json({
      status: 'success',
      data: { updated: success }
    });
  });

  // Obtener estadísticas de consentimiento
  getConsentStats = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    // Verificar acceso al dominio
    const domain = await Domain.findOne({
      _id: domainId,
      clientId: req.clientId
    });

    if (!domain) {
      throw new AppError('Domain not found', 404);
    }

    const consentStats = await analyticsService.getConsentStats(domainId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity
    });

    res.status(200).json({
      status: 'success',
      data: { consentStats }
    });
  });

  // Métodos privados
  _getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new AnalyticsController();