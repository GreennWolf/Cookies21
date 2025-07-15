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
        'scanConfig.autoScanEnabled': true
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

      const cronExpression = this.generateCronExpression(domain.scanConfig);
      
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

  // Ejecutar análisis para un dominio
  async executeDomainAnalysis(domain) {
    try {
      logger.info(`Iniciando análisis programado para dominio: ${domain.domain}`);

      // Crear un objeto request mock para el controller
      const mockRequest = {
        params: { domainId: domain._id },
        body: {
          scanType: domain.scanConfig.scanType || 'smart',
          includeSubdomains: domain.scanConfig.includeSubdomains || false,
          maxDepth: domain.scanConfig.maxDepth || 3
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
        'scanConfig.lastScheduledScan': new Date(),
        'scanConfig.nextScheduledScan': this.calculateNextRun(domain.scanConfig)
      });

    } catch (error) {
      logger.error(`Error ejecutando análisis programado para dominio ${domain.domain}:`, error);
    }
  }

  // Calcular la próxima fecha de ejecución
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

  // Actualizar fecha de próxima ejecución en el dominio
  async updateNextRunDate(domain) {
    try {
      const nextRun = this.calculateNextRun(domain.scanConfig);
      await Domain.findByIdAndUpdate(domain._id, {
        'scanConfig.nextScheduledScan': nextRun
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
        'scanConfig.autoScanEnabled': true
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

      if (domain.scanConfig.autoScanEnabled && domain.status === 'active') {
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