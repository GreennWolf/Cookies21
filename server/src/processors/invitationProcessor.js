// processors/invitationProcessor.js
const { queues } = require('../config/queue');
const emailService = require('../services/email.service');
const UserAccount = require('../models/UserAccount');
const Client = require('../models/Client');
const logger = require('../utils/logger');

/**
 * Procesador para manejar la cola de invitaciones
 */
class InvitationProcessor {
  constructor() {
    this._setupProcessor();
    logger.info('InvitationProcessor inicializado');
    console.log('🚀 InvitationProcessor inicializado');
  }

  /**
   * Configurar el procesador de la cola de invitaciones
   */
  _setupProcessor() {
    // Utilizamos la cola de emails existente
    queues.emailQueue.process('invitation', async (job) => {
      try {
        logger.info(`Procesando trabajo de invitación: ${job.id}`);
        console.log(`🔄 Procesando trabajo de invitación: ${job.id}`);
        return await this._processInvitation(job.data);
      } catch (error) {
        logger.error(`Error procesando invitación: ${error.message}`, { jobId: job.id, error });
        console.error(`❌ Error procesando invitación ${job.id}: ${error.message}`);
        throw error; // Para que Bull reintente
      }
    });
  }

  /**
   * Procesa el envío de una invitación
   * @param {Object} data - Datos de la invitación
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async _processInvitation(data) {
    const { userId, senderId } = data;
    
    logger.info(`Procesando invitación para usuario: ${userId}`);
    console.log(`📧 Procesando invitación para usuario: ${userId}`);
    
    // Obtener datos del usuario
    const user = await UserAccount.findById(userId);
    if (!user) {
      const errorMsg = `Usuario con ID ${userId} no encontrado`;
      logger.error(errorMsg);
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`📋 Datos del usuario: ${user.email}, Rol: ${user.role}, Estado: ${user.status}`);
    
    // Verificar si el usuario ya está activo
    if (user.status !== 'pending') {
      const warningMsg = `Intento de enviar invitación a usuario no pendiente: ${user.email}`;
      logger.warn(warningMsg);
      console.warn(`⚠️ ${warningMsg}`);
      return { skipped: true, reason: 'User not in pending status' };
    }
    
    // Generar token de invitación si no existe o regenerarlo si se solicita explícitamente
    let invitationToken = null;
    
    // Si no hay token de invitación o se ha solicitado regenerarlo
    if (!user.security?.invitationToken || data.regenerateToken) {
      console.log(`🔑 Generando nuevo token de invitación para ${user.email}`);
      invitationToken = user.createInvitationToken();
      await user.save();
      logger.info(`Token de invitación generado para ${user.email}`);
      console.log(`✅ Token generado: ${invitationToken.substring(0, 8)}...`);
    } else {
      // En un entorno real, tendríamos que regenerar el token aquí
      // porque no tenemos acceso al token original (solo al hash)
      // Regeneramos siempre el token por seguridad
      console.log(`🔑 Regenerando token de invitación para ${user.email}`);
      invitationToken = user.createInvitationToken();
      await user.save();
      logger.info(`Token de invitación regenerado para ${user.email}`);
      console.log(`✅ Token regenerado: ${invitationToken.substring(0, 8)}...`);
    }
    
    // Obtener datos del cliente si existe
    let clientName = 'la plataforma';
    if (user.clientId) {
      try {
        const client = await Client.findById(user.clientId);
        if (client) {
          clientName = client.name;
          console.log(`🏢 Cliente encontrado: ${clientName}`);
        } else {
          console.warn(`⚠️ Cliente con ID ${user.clientId} no encontrado`);
        }
      } catch (error) {
        console.error(`❌ Error al buscar cliente: ${error.message}`);
        // Continuamos con el valor predeterminado
      }
    }
    
    logger.info(`Enviando email de invitación a ${user.email} para cliente ${clientName}`);
    console.log(`📧 Enviando email de invitación a ${user.email} para cliente ${clientName}`);
    
    try {
      // Enviar email de invitación con el nuevo servicio
      // IMPORTANTE: Pasamos sendDirect:true para forzar el envío directo
      const result = await emailService.sendInvitationEmail({
        email: user.email,
        name: user.name,
        invitationToken,
        clientName,
        role: user.role,
        sendDirect: true // Forzar envío directo
      });
      
      console.log(`📤 Resultado del envío:`, result);
      
      if (!result.success) {
        const errorMsg = `Error al enviar email de invitación: ${result.error}`;
        logger.error(errorMsg);
        console.error(`❌ ${errorMsg}`);
        if (result.details) {
          console.error('Detalles del error:', result.details);
        }
        throw new Error(errorMsg);
      }
      
      // Registrar evento de invitación enviada
      logger.info(`Invitación enviada con éxito a ${user.email}`);
      console.log(`✅ Invitación enviada con éxito a ${user.email}`);
      
      return {
        success: true,
        messageId: result.jobId,
        user: {
          id: user._id,
          email: user.email
        }
      };
    } catch (error) {
      const errorMsg = `Error inesperado al enviar invitación: ${error.message}`;
      logger.error(errorMsg);
      console.error(`❌ ${errorMsg}`);
      throw error; // Propagar el error para que Bull reintente
    }
  }

  /**
   * Añade una invitación a la cola
   * @param {Object} data - Datos de la invitación
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async queueInvitation(data) {
    try {
      // Validar datos mínimos
      if (!data.userId) {
        return {
          success: false,
          error: 'Se requiere el ID del usuario'
        };
      }
      
      const options = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true
      };
      
      // Si es de alta prioridad, ajustar opciones
      if (data.highPriority) {
        options.priority = 1;
      }
      
      logger.info(`Encolando invitación para usuario: ${data.userId}`);
      console.log(`📋 Encolando invitación para usuario: ${data.userId}`);
      
      // Verificar si se solicita procesamiento directo
      if (data.processDirectly) {
        console.log(`🔄 Procesando invitación directamente para usuario: ${data.userId}`);
        return await this.processInvitationDirect(data);
      }
      
      const job = await queues.emailQueue.add('invitation', data, options);
      
      logger.info(`Invitación añadida a la cola: ${job.id} - Usuario: ${data.userId}`);
      console.log(`✅ Invitación añadida a la cola: ${job.id} - Usuario: ${data.userId}`);
      
      return {
        success: true,
        jobId: job.id
      };
    } catch (error) {
      logger.error(`Error al encolar invitación: ${error.message}`, { error });
      console.error(`❌ Error al encolar invitación: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesa directamente una invitación (útil para pruebas o depuración)
   * @param {Object} data - Datos de la invitación
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processInvitationDirect(data) {
    try {
      logger.info(`Procesando invitación directamente para usuario: ${data.userId}`);
      console.log(`🔄 Procesando invitación directamente para usuario: ${data.userId}`);
      
      // Forzar la regeneración del token y añadir sendDirect=true
      const processData = { 
        ...data, 
        regenerateToken: true
      };
      
      const result = await this._processInvitation(processData);
      console.log(`✅ Resultado del procesamiento directo:`, result);
      
      return result;
    } catch (error) {
      logger.error(`Error al procesar invitación directamente: ${error.message}`, { error });
      console.error(`❌ Error al procesar invitación directamente: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InvitationProcessor();