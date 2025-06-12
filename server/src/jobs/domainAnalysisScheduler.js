const cron = require('node-cron');
const Domain = require('../models/Domain');
const CookiesScanController = require('../controllers/CookiesScanController');
const logger = require('../utils/logger');

class DomainAnalysisScheduler {
  constructor() {
    this.activeJobs = new Map();
    this.isInitialized = false;
  }

  // Inicializar todos los cron jobs para dominios activos
  async initialize() {
    if (this.isInitialized) {
      logger.warn('DomainAnalysisScheduler ya está inicializado');
      return;
    }

    try {
      logger.info('Inicializando programador de análisis de dominios...');
      
      // Obtener todos los dominios activos con análisis programado habilitado
      const domains = await Domain.find({
        status: 'active',
        'analysisSchedule.enabled': true
      });

      logger.info(`Encontrados ${domains.length} dominios con análisis programado`);

      // Configurar cron job para cada dominio
      for (const domain of domains) {
        this.scheduleForDomain(domain);
      }

      // Job para verificar nuevos dominios con análisis programado cada hora
      cron.schedule('0 * * * *', async () => {
        await this.updateScheduledDomains();
      });

      this.isInitialized = true;
      logger.info('Programador de análisis de dominios inicializado correctamente');
    } catch (error) {
      logger.error('Error al inicializar programador de análisis de dominios:', error);
    }
  }

  // Programar análisis para un dominio específico
  scheduleForDomain(domain) {
    try {
      const domainId = domain._id.toString();
      
      // Si ya existe un job para este dominio, cancelarlo
      if (this.activeJobs.has(domainId)) {
        this.activeJobs.get(domainId).destroy();
      }

      const cronExpression = this.generateCronExpression(domain.analysisSchedule);
      
      if (!cronExpression) {
        logger.warn(`No se pudo generar expresión cron para dominio ${domain.domain}`);
        return;
      }

      logger.info(`Programando análisis para dominio ${domain.domain} con expresión: ${cronExpression}`);

      const task = cron.schedule(cronExpression, async () => {
        await this.executeDomainAnalysis(domain);
      }, {
        scheduled: false,
        timezone: 'America/Mexico_City'
      });

      task.start();
      this.activeJobs.set(domainId, task);

      // Actualizar la fecha del próximo análisis
      this.updateNextRunDate(domain);

    } catch (error) {
      logger.error(`Error programando análisis para dominio ${domain.domain}:`, error);
    }
  }

  // Generar expresión cron basada en la configuración del dominio
  generateCronExpression(schedule) {
    const [hour, minute] = schedule.time.split(':').map(Number);
    
    switch (schedule.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      
      case 'weekly':
        const days = schedule.daysOfWeek && schedule.daysOfWeek.length > 0 
          ? schedule.daysOfWeek.join(',') 
          : '0'; // Domingo por defecto
        return `${minute} ${hour} * * ${days}`;
      
      case 'monthly':
        const dayOfMonth = schedule.dayOfMonth || 1;
        return `${minute} ${hour} ${dayOfMonth} * *`;
      
      default:
        logger.warn(`Frecuencia no soportada: ${schedule.frequency}`);
        return null;
    }
  }

  // Ejecutar análisis para un dominio
  async executeDomainAnalysis(domain) {
    try {
      logger.info(`Iniciando análisis programado para dominio: ${domain.domain}`);

      // Crear un objeto request mock para el controller
      const mockRequest = {
        params: { domainId: domain._id },
        body: {
          scanType: domain.analysisSchedule.analysisConfig.scanType || 'full',
          includeSubdomains: domain.analysisSchedule.analysisConfig.includeSubdomains || true,
          maxUrls: domain.analysisSchedule.analysisConfig.maxUrls || 100,
          depth: domain.analysisSchedule.analysisConfig.depth || 5
        },
        user: { 
          id: 'system',
          role: 'system'
        }
      };

      const mockResponse = {
        status: (code) => ({
          json: (data) => {
            if (code === 201) {
              logger.info(`Análisis programado iniciado exitosamente para ${domain.domain}. Scan ID: ${data.scanId}`);
            } else {
              logger.error(`Error en análisis programado para ${domain.domain}:`, data);
            }
          }
        })
      };

      // Ejecutar el análisis usando el controller existente
      await CookiesScanController.startScan(mockRequest, mockResponse);

      // Actualizar lastRun y nextRun en el dominio
      await Domain.findByIdAndUpdate(domain._id, {
        'analysisSchedule.lastRun': new Date(),
        'analysisSchedule.nextRun': this.calculateNextRun(domain.analysisSchedule)
      });

    } catch (error) {
      logger.error(`Error ejecutando análisis programado para dominio ${domain.domain}:`, error);
    }
  }

  // Calcular la próxima fecha de ejecución
  calculateNextRun(schedule) {
    const now = new Date();
    const [hour, minute] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      
      case 'weekly':
        const targetDays = schedule.daysOfWeek || [0];
        let found = false;
        
        for (let i = 0; i < 7; i++) {
          const testDate = new Date(nextRun);
          testDate.setDate(testDate.getDate() + i);
          
          if (targetDays.includes(testDate.getDay()) && testDate > now) {
            nextRun = testDate;
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Si no encontramos día esta semana, ir a la próxima semana
          nextRun.setDate(nextRun.getDate() + 7);
          while (!targetDays.includes(nextRun.getDay())) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        }
        break;
      
      case 'monthly':
        const targetDay = schedule.dayOfMonth || 1;
        nextRun.setDate(targetDay);
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDay);
        }
        break;
    }

    return nextRun;
  }

  // Actualizar fecha de próxima ejecución en el dominio
  async updateNextRunDate(domain) {
    try {
      const nextRun = this.calculateNextRun(domain.analysisSchedule);
      await Domain.findByIdAndUpdate(domain._id, {
        'analysisSchedule.nextRun': nextRun
      });
    } catch (error) {
      logger.error(`Error actualizando nextRun para dominio ${domain.domain}:`, error);
    }
  }

  // Verificar y actualizar dominios programados
  async updateScheduledDomains() {
    try {
      logger.debug('Verificando dominios con análisis programado...');
      
      // Obtener dominios activos con análisis programado
      const domains = await Domain.find({
        status: 'active',
        'analysisSchedule.enabled': true
      });

      const currentDomainIds = new Set(domains.map(d => d._id.toString()));
      const scheduledDomainIds = new Set(this.activeJobs.keys());

      // Agregar nuevos dominios
      for (const domain of domains) {
        const domainId = domain._id.toString();
        if (!scheduledDomainIds.has(domainId)) {
          logger.info(`Programando nuevo dominio: ${domain.domain}`);
          this.scheduleForDomain(domain);
        }
      }

      // Remover dominios que ya no están activos o deshabilitados
      for (const domainId of scheduledDomainIds) {
        if (!currentDomainIds.has(domainId)) {
          logger.info(`Cancelando programación para dominio: ${domainId}`);
          this.unscheduleDomain(domainId);
        }
      }

    } catch (error) {
      logger.error('Error actualizando dominios programados:', error);
    }
  }

  // Desprogramar un dominio específico
  unscheduleDomain(domainId) {
    if (this.activeJobs.has(domainId)) {
      this.activeJobs.get(domainId).destroy();
      this.activeJobs.delete(domainId);
      logger.info(`Análisis desprogramado para dominio: ${domainId}`);
    }
  }

  // Reprogramar un dominio (útil cuando se actualiza la configuración)
  async rescheduleDomain(domainId) {
    try {
      const domain = await Domain.findById(domainId);
      if (!domain) {
        logger.warn(`Dominio no encontrado: ${domainId}`);
        return;
      }

      if (domain.analysisSchedule.enabled && domain.status === 'active') {
        this.scheduleForDomain(domain);
        logger.info(`Dominio reprogramado: ${domain.domain}`);
      } else {
        this.unscheduleDomain(domainId);
        logger.info(`Análisis deshabilitado para dominio: ${domain.domain}`);
      }
    } catch (error) {
      logger.error(`Error reprogramando dominio ${domainId}:`, error);
    }
  }

  // Obtener estado de todos los jobs programados
  getScheduledDomainsStatus() {
    const status = [];
    
    for (const [domainId, task] of this.activeJobs) {
      status.push({
        domainId,
        running: task.running,
        scheduled: task.scheduled
      });
    }

    return status;
  }

  // Detener todos los jobs (útil para shutdown graceful)
  stopAll() {
    logger.info('Deteniendo todos los análisis programados...');
    
    for (const [domainId, task] of this.activeJobs) {
      task.destroy();
    }
    
    this.activeJobs.clear();
    this.isInitialized = false;
    logger.info('Todos los análisis programados han sido detenidos');
  }
}

// Singleton instance
const domainAnalysisScheduler = new DomainAnalysisScheduler();

module.exports = domainAnalysisScheduler;