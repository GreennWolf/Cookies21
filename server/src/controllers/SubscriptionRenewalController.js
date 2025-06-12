const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest');
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const emailService = require('../services/email.service');
const auditService = require('../services/audit.service');

class SubscriptionRenewalController {
  
  // Crear una nueva solicitud de renovación
  createRenewalRequest = catchAsync(async (req, res) => {
    const { 
      requestType, 
      message, 
      contactPreference = 'email', 
      urgency = 'medium' 
    } = req.body;
    
    const userId = req.user._id;
    const clientId = req.clientId || req.user.clientId;
    
    if (!clientId) {
      throw new AppError('No se pudo identificar el cliente para la solicitud', 400);
    }
    
    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await SubscriptionRenewalRequest.getLatestRequestForClient(clientId);
    
    if (existingRequest) {
      return res.status(200).json({
        status: 'success',
        message: 'Ya tienes una solicitud pendiente. Nuestro equipo se contactará contigo pronto.',
        data: {
          request: existingRequest,
          alreadyExists: true
        }
      });
    }
    
    // Obtener información del cliente y su suscripción
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado', 404);
    }
    
    const subscriptionStatus = client.isSubscriptionActive();
    let currentStatus = 'active';
    
    if (!subscriptionStatus.isActive) {
      currentStatus = subscriptionStatus.reason.toLowerCase();
      if (currentStatus === 'client_inactive') currentStatus = 'suspended';
    }
    
    // Crear la solicitud
    const renewalRequest = await SubscriptionRenewalRequest.create({
      clientId,
      requestedBy: userId,
      requestType,
      currentSubscriptionStatus: currentStatus,
      message,
      contactPreference,
      urgency
    });
    
    // Poblar la información del usuario
    await renewalRequest.populate('requestedBy', 'name email');
    await renewalRequest.populate('clientId', 'name email contactEmail');
    
    // Enviar notificaciones a los owners
    await this.notifyOwnersAboutRenewalRequest(renewalRequest);
    
    // Registrar en auditoría
    try {
      await auditService.logAction({
        clientId,
        userId,
        action: 'create',
        resourceType: 'subscription_renewal_request',
        resourceId: renewalRequest._id,
        metadata: {
          requestType,
          urgency,
          currentStatus
        }
      });
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Tu solicitud de renovación ha sido enviada. Nuestro equipo se contactará contigo pronto.',
      data: {
        request: renewalRequest
      }
    });
  });
  
  // Obtener solicitudes de renovación (para owners)
  getRenewalRequests = catchAsync(async (req, res) => {
    const { 
      status = 'all', 
      urgency, 
      requestType,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (status !== 'all') {
      filters.status = status;
    }
    
    if (urgency) {
      filters.urgency = urgency;
    }
    
    if (requestType) {
      filters.requestType = requestType;
    }
    
    // Paginación
    const skip = (page - 1) * limit;
    
    // Obtener solicitudes con información poblada
    const requests = await SubscriptionRenewalRequest.find(filters)
      .populate('requestedBy', 'name email')
      .populate('clientId', 'name email contactEmail')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ urgency: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Contar total para paginación
    const total = await SubscriptionRenewalRequest.countDocuments(filters);
    
    // Estadísticas rápidas
    const stats = await SubscriptionRenewalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statsObject = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    
    res.status(200).json({
      status: 'success',
      data: {
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalRequests: total,
          limit: parseInt(limit)
        },
        stats: statsObject
      }
    });
  });
  
  // Actualizar estado de una solicitud (para owners)
  updateRenewalRequest = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { status, adminNotes, assignedTo } = req.body;
    
    const request = await SubscriptionRenewalRequest.findById(requestId)
      .populate('requestedBy', 'name email')
      .populate('clientId', 'name email contactEmail');
    
    if (!request) {
      throw new AppError('Solicitud de renovación no encontrada', 404);
    }
    
    // Actualizar campos
    if (status) request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    if (assignedTo) request.assignedTo = assignedTo;
    
    if (status === 'completed' || status === 'rejected') {
      request.resolvedAt = new Date();
      request.resolvedBy = req.user._id;
    }
    
    await request.save();
    
    // Enviar email al cliente informando del cambio de estado
    await this.notifyClientAboutStatusChange(request, status);
    
    // Registrar en auditoría
    try {
      await auditService.logAction({
        clientId: request.clientId._id,
        userId: req.user._id,
        action: 'update',
        resourceType: 'subscription_renewal_request',
        resourceId: requestId,
        metadata: {
          newStatus: status,
          adminNotes: adminNotes || 'Sin notas'
        }
      });
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Solicitud actualizada correctamente',
      data: {
        request
      }
    });
  });
  
  // Verificar si un cliente tiene solicitudes pendientes
  checkPendingRequest = catchAsync(async (req, res) => {
    console.log('🔍 checkPendingRequest - Debug info:');
    console.log('  req.clientId:', req.clientId);
    console.log('  req.user.clientId:', req.user.clientId);
    console.log('  req.user.role:', req.user.role);
    console.log('  req.isOwner:', req.isOwner);
    
    const clientId = req.clientId || req.user.clientId;
    
    // Para owners, el clientId puede venir como query parameter
    const targetClientId = clientId || req.query.clientId;
    
    console.log('  finalClientId:', targetClientId);
    
    // Si no hay clientId y el usuario es owner, retornar una respuesta neutra
    if (!targetClientId) {
      if (req.isOwner || req.user.role === 'owner') {
        return res.status(200).json({
          status: 'success',
          message: 'Sin cliente específico para verificar',
          data: {
            hasPendingRequest: false,
            request: null,
            requiresClientId: true
          }
        });
      } else {
        throw new AppError('No se pudo identificar el cliente para verificar solicitudes pendientes.', 400);
      }
    }
    
    const pendingRequest = await SubscriptionRenewalRequest.getLatestRequestForClient(targetClientId);
    
    res.status(200).json({
      status: 'success',
      data: {
        hasPendingRequest: !!pendingRequest,
        request: pendingRequest
      }
    });
  });
  
  // Notificar a los owners sobre nueva solicitud
  async notifyOwnersAboutRenewalRequest(renewalRequest) {
    try {
      // Obtener todos los usuarios owner
      const owners = await UserAccount.find({ role: 'owner', status: 'active' });
      
      if (owners.length === 0) {
        console.log('No se encontraron owners para notificar');
        return;
      }
      
      const emailPromises = owners.map(owner => {
        return emailService.sendRenewalRequestNotification({
          to: owner.email,
          ownerName: owner.name,
          clientName: renewalRequest.clientId.name,
          clientEmail: renewalRequest.clientId.email || renewalRequest.clientId.contactEmail,
          requestType: renewalRequest.requestType,
          urgency: renewalRequest.urgency,
          message: renewalRequest.message,
          requestedBy: renewalRequest.requestedBy.name,
          requestId: renewalRequest._id
        });
      });
      
      await Promise.all(emailPromises);
      console.log(`Notificaciones enviadas a ${owners.length} owners`);
      
    } catch (error) {
      console.error('Error enviando notificaciones a owners:', error);
      // No fallar la operación principal por errores de email
    }
  }
  
  // Notificar al cliente sobre cambio de estado
  async notifyClientAboutStatusChange(request, newStatus) {
    try {
      const clientEmail = request.clientId.email || request.clientId.contactEmail;
      const requestedByEmail = request.requestedBy.email;
      
      if (!clientEmail && !requestedByEmail) {
        console.log('No se encontró email para notificar al cliente');
        return;
      }
      
      await emailService.sendRenewalStatusUpdate({
        to: requestedByEmail || clientEmail,
        clientName: request.clientId.name,
        requestType: request.requestType,
        newStatus,
        adminNotes: request.adminNotes,
        requestId: request._id
      });
      
    } catch (error) {
      console.error('Error enviando notificación al cliente:', error);
      // No fallar la operación principal por errores de email
    }
  }
}

module.exports = new SubscriptionRenewalController();