const Audit = require('../models/Audit');
const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { exportAuditLogs } = require('../services/export.service');

class AuditController {
  // Obtener logs de auditoría
  getAuditLogs = catchAsync(async (req, res) => {
    const { clientId } = req;
    const {
      startDate,
      endDate,
      action,
      resourceType,
      severity,
      status,
      userId,
      page = 1,
      limit = 50
    } = req.query;

    const query = { clientId };

    // Aplicar filtros
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (severity) query.severity = severity;
    if (status) query['metadata.status'] = status;
    if (userId) query.userId = userId;

    // Obtener total de registros para paginación
    const total = await Audit.countDocuments(query);

    // Obtener registros con paginación
    const logs = await Audit.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('context.domainId', 'domain');

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Obtener logs por dominio
  getDomainAuditLogs = catchAsync(async (req, res) => {
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

    const logs = await Audit.find({
      'context.domainId': domainId
    })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email');

    res.status(200).json({
      status: 'success',
      data: { logs }
    });
  });

  // Obtener detalle de evento
  getAuditEvent = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const event = await Audit.findOne({
      _id: id,
      clientId
    })
      .populate('userId', 'name email')
      .populate('context.domainId', 'domain');

    if (!event) {
      throw new AppError('Audit event not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { event }
    });
  });

  // Obtener resumen de actividad
  getActivitySummary = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { period = 24 } = req.query;

    const summary = await Audit.getActivitySummary(clientId, period);

    res.status(200).json({
      status: 'success',
      data: { summary }
    });
  });

  // Exportar logs
  exportLogs = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { startDate, endDate, format = 'csv' } = req.query;

    const logs = await Audit.exportLogs(clientId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format
    });

    if (format === 'json') {
      return res.status(200).json({
        status: 'success',
        data: { logs }
      });
    }

    // Para otros formatos (CSV, PDF)
    const file = await exportAuditLogs(logs, format);

    res.setHeader('Content-Type', this._getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs.${format}`);
    res.send(file);
  });

  // Obtener estadísticas de auditoría
  getAuditStats = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { startDate, endDate } = req.query;

    const stats = await Audit.aggregate([
      {
        $match: {
          clientId: mongoose.Types.ObjectId(clientId),
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          bySeverity: {
            $push: {
              k: '$severity',
              v: { $sum: 1 }
            }
          },
          byStatus: {
            $push: {
              k: '$metadata.status',
              v: { $sum: 1 }
            }
          },
          byAction: {
            $push: {
              k: '$action',
              v: { $sum: 1 }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalEvents: 1,
          bySeverity: { $arrayToObject: '$bySeverity' },
          byStatus: { $arrayToObject: '$byStatus' },
          byAction: { $arrayToObject: '$byAction' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: { stats: stats[0] || {} }
    });
  });

  // Métodos privados
  _getContentType(format) {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/json';
    }
  }
}

module.exports = new AuditController();