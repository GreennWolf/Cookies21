// controllers/InvitationController.js
const crypto = require('crypto');
const UserAccount = require('../models/UserAccount');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const emailService = require('../services/email.service');
const invitationProcessor = require('../processors/invitationProcessor');
const logger = require('../utils/logger');

class InvitationController {
  // Verificar token de invitación
  verifyInvitation = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    
    if (!token) {
      return next(new AppError('Token de invitación requerido', 400));
    }
    
    // Hashear el token para comparar con el almacenado
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Buscar usuario con el token
    const user = await UserAccount.findOne({
      'security.invitationToken': hashedToken,
      'security.invitationExpires': { $gt: Date.now() }
    });
    
    if (!user) {
      return next(new AppError('Token inválido o expirado', 400));
    }
    
    // Verificar que el usuario esté en estado pending
    if (user.status !== 'pending') {
      return next(new AppError('Esta invitación ya ha sido utilizada', 400));
    }
    
    // Obtener información del cliente
    let clientName = 'la plataforma';
    if (user.clientId) {
      const client = await Client.findById(user.clientId);
      if (client) {
        clientName = client.name;
      }
    }
    
    // Log para depuración
    logger.info(`Invitación verificada para ${user.email} (Token: ${token.substring(0, 8)}...)`);
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        invitation: {
          clientName,
          expiresAt: user.security.invitationExpires
        }
      }
    });
  });

  // Completar registro (establecer contraseña)
  completeRegistration = catchAsync(async (req, res, next) => {
    const { token, password, confirmPassword } = req.body;
    
    // Log para depuración
    logger.info(`Intento de completar registro con token: ${token ? token.substring(0, 8) : 'no token'}...`);
    
    // Validar que la contraseña y confirmación coincidan
    if (password !== confirmPassword) {
      return next(new AppError('Las contraseñas no coinciden', 400));
    }
    
    // Hashear el token para comparar con el almacenado
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Buscar usuario con el token
    const user = await UserAccount.findOne({
      'security.invitationToken': hashedToken,
      'security.invitationExpires': { $gt: Date.now() }
    });
    
    if (!user) {
      logger.warn(`Token inválido o expirado: ${token ? token.substring(0, 8) : 'no token'}...`);
      return next(new AppError('Token inválido o expirado', 400));
    }
    
    // Verificar que el usuario esté en estado pending
    if (user.status !== 'pending') {
      logger.warn(`Intento de usar invitación ya utilizada: ${user.email}`);
      return next(new AppError('Esta invitación ya ha sido utilizada', 400));
    }
    
    // Actualizar contraseña y estado
    user.password = password;
    user.status = 'active';
    user.security.invitationToken = undefined;
    user.security.invitationExpires = undefined;
    
    // Log para depuración
    logger.info(`Guardando usuario activado: ${user.email}`);
    
    await user.save();
    
    // Obtener nombre del cliente para el email de bienvenida
    let clientName = 'la plataforma';
    if (user.clientId) {
      const client = await Client.findById(user.clientId);
      if (client) {
        clientName = client.name;
      }
    }
    
    // Enviar email de bienvenida
    try {
      await emailService.sendWelcomeEmail({
        email: user.email,
        name: user.name,
        clientName
      });
      logger.info(`Email de bienvenida enviado a ${user.email}`);
    } catch (error) {
      logger.warn(`Error al enviar email de bienvenida: ${error.message}`);
      // No bloqueamos el proceso por un error en el email
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Registro completado exitosamente',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  });

  // Reenviar invitación
  resendInvitation = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    
    logger.info(`Solicitud de reenvío de invitación para usuario: ${userId}`);
    
    // Verificar permisos
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return next(new AppError('No tienes permiso para reenviar invitaciones', 403));
    }
    
    // Buscar usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar que el usuario esté en estado pending
    if (user.status !== 'pending') {
      return next(new AppError('Solo se pueden reenviar invitaciones a usuarios pendientes', 400));
    }
    
    // Verificar permisos para no-owners
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      return next(new AppError('No tienes permiso para reenviar invitaciones a este usuario', 403));
    }
    
    // Regenerar token si ha expirado o está próximo a expirar
    const shouldRegenerateToken = !user.security?.invitationExpires || 
                                 user.security.invitationExpires < new Date(Date.now() + 24 * 60 * 60 * 1000); // menos de 1 día
    
    if (shouldRegenerateToken) {
      logger.info(`Regenerando token para: ${user.email}`);
      user.createInvitationToken();
      await user.save();
    }
    
    // Encolar el reenvío de invitación a través del procesador
    const result = await invitationProcessor.queueInvitation({
      userId: user._id,
      senderId: req.userId
    });
    
    if (!result.success) {
      return next(new AppError(`Error al procesar invitación: ${result.error}`, 500));
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Invitación reenviada exitosamente',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        jobId: result.jobId
      }
    });
  });

  // Nuevo método para enviar invitación directamente (útil para testing y depuración)
  sendInvitationDirect = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    
    logger.info(`Solicitud de envío directo de invitación para usuario: ${userId}`);
    
    // Verificar permisos (solo admin y owner)
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return next(new AppError('No tienes permiso para enviar invitaciones', 403));
    }
    
    // Buscar usuario
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar que el usuario esté en estado pending
    if (user.status !== 'pending') {
      return next(new AppError('Solo se pueden enviar invitaciones a usuarios pendientes', 400));
    }
    
    // Verificar permisos para no-owners
    if (req.user.role !== 'owner' && String(req.user.clientId) !== String(user.clientId)) {
      return next(new AppError('No tienes permiso para enviar invitaciones a este usuario', 403));
    }
    
    // Regenerar token
    const invitationToken = user.createInvitationToken();
    await user.save();
    
    // Obtener nombre del cliente
    let clientName = 'la plataforma';
    if (user.clientId) {
      const client = await Client.findById(user.clientId);
      if (client) {
        clientName = client.name;
      }
    }
    
    // Enviar email directamente
    try {
      const emailResult = await emailService.sendInvitationEmail({
        email: user.email,
        name: user.name,
        invitationToken,
        clientName,
        role: user.role
      });
      
      if (!emailResult.success) {
        return next(new AppError(`Error al enviar email: ${emailResult.error}`, 500));
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Invitación enviada exitosamente',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      logger.error(`Error al enviar invitación directa: ${error.message}`);
      return next(new AppError(`Error al enviar invitación: ${error.message}`, 500));
    }
  });
}

module.exports = new InvitationController();