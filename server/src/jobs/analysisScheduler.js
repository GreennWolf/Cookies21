const cron = require('node-cron');
const logger = require('../utils/logger');
const Domain = require('../models/Domain');
const { AnalysisWorker } = require('./advancedCookieAnalysisWorker');

class AnalysisScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.isInitialized = false;
  }

  // Inicializar programador
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Analysis scheduler already initialized');
      return;
    }

    logger.info('Initializing analysis scheduler...');

    // Programar verificación cada hora para análisis pendientes
    this.scheduleHourlyCheck();

    // Cargar tareas programadas existentes
    await this.loadScheduledAnalyses();

    this.isInitialized = true;
    logger.info('Analysis scheduler initialized successfully');
  }

  // Programar verificación cada hora
  scheduleHourlyCheck() {
    // Ejecutar cada hora en el minuto 0
    const task = cron.schedule('0 * * * *', async () => {
      logger.info('Running hourly analysis schedule check...');
      await this.checkScheduledAnalyses();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledTasks.set('hourly_check', task);
    logger.info('Hourly schedule check configured');
  }

  // Cargar análisis programados desde la base de datos
  async loadScheduledAnalyses() {
    try {
      const domainsWithSchedule = await Domain.find({
        'scanConfig.autoScanEnabled': true
      }).select('domain scanConfig');

      logger.info(`Found ${domainsWithSchedule.length} domains with scheduled analysis`);

      for (const domain of domainsWithSchedule) {
        await this.scheduleAnalysisForDomain(domain);
      }

    } catch (error) {
      logger.error('Error loading scheduled analyses:', error);
    }
  }

  // Programar análisis para un dominio específico
  async scheduleAnalysisForDomain(domain) {
    try {
      const scanConfig = domain.scanConfig;
      
      if (!scanConfig || !scanConfig.autoScanEnabled) {
        logger.debug(`Skipping disabled schedule for domain ${domain.domain}`);
        return;
      }

      // Generar expresión cron
      const cronExpression = this.generateCronExpression(scanConfig);
      
      if (!cronExpression) {
        logger.warn(`Invalid schedule configuration for domain ${domain.domain}`);
        return;
      }

      // Cancelar tarea existente si existe
      await this.cancelScheduleForDomain(domain._id);

      // Crear nueva tarea programada
      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledAnalysis(domain);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.scheduledTasks.set(domain._id.toString(), task);

      logger.info(`Scheduled analysis for domain ${domain.domain} with cron: ${cronExpression}`);

    } catch (error) {
      logger.error(`Error scheduling analysis for domain ${domain.domain}:`, error);
    }
  }

  // Generar expresión cron basada en la configuración
  generateCronExpression(scanConfig) {
    // Si ya tiene una expresión cron personalizada, usarla
    if (scanConfig.cronExpression) {
      return scanConfig.cronExpression;
    }
    
    // Generar basado en el intervalo configurado
    const cronMap = {
      'hourly': '0 * * * *',
      'every-2-hours': '0 */2 * * *',
      'every-6-hours': '0 */6 * * *',
      'every-12-hours': '0 */12 * * *',
      'daily': '0 2 * * *',
      'weekly': '0 2 * * 0',
      'monthly': '0 2 1 * *'
    };
    
    return cronMap[scanConfig.scanInterval] || '0 2 * * *'; // Default diario
  }

  // Ejecutar análisis programado
  async executeScheduledAnalysis(domain) {
    try {
      logger.info(`Executing scheduled analysis for domain ${domain.domain}`);

      // Verificar que la programación sigue activa
      const currentDomain = await Domain.findById(domain._id);
      if (!currentDomain || !currentDomain.scanConfig?.autoScanEnabled) {
        logger.info(`Schedule disabled for domain ${domain.domain}, skipping analysis`);
        return;
      }

      // Configuración del análisis
      const config = currentDomain.scanConfig || {};
      const analysisConfig = {
        scanType: config.scanType || 'smart',
        includeSubdomains: config.includeSubdomains || false,
        maxDepth: config.maxDepth || 3,
        timeout: 30000,
        retries: 3,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        acceptLanguages: ['es-ES', 'es', 'en-US', 'en']
      };

      // Añadir trabajo a la cola
      await AnalysisWorker.addScheduledAnalysisJob(
        currentDomain._id,
        currentDomain.domain,
        analysisConfig,
        'system' // ID del sistema para análisis programados
      );

      // Actualizar última ejecución
      currentDomain.scanConfig.lastScheduledScan = new Date();
      currentDomain.scanConfig.nextScheduledScan = this.calculateNextRun(currentDomain.scanConfig);
      await currentDomain.save();

      logger.info(`Scheduled analysis queued for domain ${domain.domain}`);

    } catch (error) {
      logger.error(`Error executing scheduled analysis for domain ${domain.domain}:`, error);
    }
  }

  // Verificar análisis programados (ejecutado cada hora)
  async checkScheduledAnalyses() {
    try {
      const now = new Date();
      
      // Buscar dominios con análisis programados que deberían ejecutarse
      const overdueAnalyses = await Domain.find({
        'scanConfig.autoScanEnabled': true,
        'scanConfig.nextScheduledScan': { $lte: now }
      });

      logger.info(`Found ${overdueAnalyses.length} overdue scheduled analyses`);

      for (const domain of overdueAnalyses) {
        // Verificar si hay tarea programada
        const taskId = domain._id.toString();
        if (!this.scheduledTasks.has(taskId)) {
          logger.info(`Re-scheduling missing task for domain ${domain.domain}`);
          await this.scheduleAnalysisForDomain(domain);
        } else {
          // Ejecutar análisis si no se ha ejecutado ya
          await this.executeScheduledAnalysis(domain);
        }
      }

    } catch (error) {
      logger.error('Error checking scheduled analyses:', error);
    }
  }

  // Calcular próxima ejecución
  calculateNextRun(scanConfig) {
    const now = new Date();
    let nextRun = new Date(now);
    
    // Establecer hora por defecto (2 AM)
    nextRun.setHours(2, 0, 0, 0);

    switch (scanConfig.scanInterval) {
      case 'hourly':
        nextRun.setHours(now.getHours() + 1, 0, 0, 0);
        break;
      case 'every-2-hours':
        nextRun.setHours(now.getHours() + 2, 0, 0, 0);
        break;
      case 'every-6-hours':
        nextRun.setHours(now.getHours() + 6, 0, 0, 0);
        break;
      case 'every-12-hours':
        nextRun.setHours(now.getHours() + 12, 0, 0, 0);
        break;
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        nextRun.setDay(0); // Domingo
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(1);
        break;
      default:
        // Default: daily
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
    }
    
    return nextRun;
  }

  // Cancelar programación para un dominio
  async cancelScheduleForDomain(domainId) {
    const taskId = domainId.toString();
    
    if (this.scheduledTasks.has(taskId)) {
      const task = this.scheduledTasks.get(taskId);
      task.stop();
      this.scheduledTasks.delete(taskId);
      
      logger.info(`Cancelled scheduled analysis for domain ${domainId}`);
      return true;
    }
    
    return false;
  }

  // Actualizar programación para un dominio
  async updateScheduleForDomain(domain) {
    await this.cancelScheduleForDomain(domain._id);
    
    if (domain.scanConfig?.autoScanEnabled) {
      await this.scheduleAnalysisForDomain(domain);
    }
  }

  // Obtener estadísticas del programador
  getSchedulerStats() {
    return {
      totalScheduledTasks: this.scheduledTasks.size,
      isInitialized: this.isInitialized,
      activeTasks: Array.from(this.scheduledTasks.keys()).map(key => {
        const task = this.scheduledTasks.get(key);
        return {
          domainId: key,
          running: task.running
        };
      })
    };
  }

  // Detener todas las tareas programadas
  async stopAllSchedules() {
    logger.info('Stopping all scheduled analyses...');
    
    for (const [taskId, task] of this.scheduledTasks) {
      task.stop();
      logger.debug(`Stopped scheduled task for domain ${taskId}`);
    }
    
    this.scheduledTasks.clear();
    this.isInitialized = false;
    
    logger.info('All scheduled analyses stopped');
  }

  // Reiniciar programador
  async restart() {
    await this.stopAllSchedules();
    await this.initialize();
  }
}

// Crear instancia única del programador
const analysisScheduler = new AnalysisScheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping analysis scheduler...');
  await analysisScheduler.stopAllSchedules();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, stopping analysis scheduler...');
  await analysisScheduler.stopAllSchedules();
});

module.exports = analysisScheduler;