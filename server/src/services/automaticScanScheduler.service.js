/**
 * AUTOMATIC SCAN SCHEDULER SERVICE
 * 
 * Sistema de programación automática de escaneos de cookies por dominio
 * Gestiona cron jobs basados en la configuración del usuario
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const Domain = require('../models/Domain');
const scanner = require('./scanner.service');

class AutomaticScanSchedulerService {
  constructor() {
    this.activeCronJobs = new Map(); // domainId -> cronJob
    this.scanIntervals = new Map(); // domainId -> intervalConfig
    this.defaultScanInterval = '0 2 * * *'; // Daily at 2 AM by default
    this.initialized = false;
  }

  /**
   * Inicializar el scheduler y cargar todos los dominios activos
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Automatic Scan Scheduler');

      // Cargar todos los dominios con escaneo automático habilitado
      await this.loadActiveDomains();

      this.initialized = true;
      logger.info('Automatic Scan Scheduler initialized successfully');
    } catch (error) {
      logger.error('Error initializing Automatic Scan Scheduler:', error);
      throw error;
    }
  }

  /**
   * Cargar dominios activos y configurar sus cron jobs
   */
  async loadActiveDomains() {
    try {
      const domains = await Domain.find({ 
        status: 'active',
        'scanConfig.autoScanEnabled': true 
      }).populate('clientId');

      logger.info(`Loading ${domains.length} domains with automatic scanning enabled`);

      for (const domain of domains) {
        await this.scheduleDomainScans(domain);
      }

      logger.info(`Scheduled automatic scans for ${this.activeCronJobs.size} domains`);
    } catch (error) {
      logger.error('Error loading active domains:', error);
      throw error;
    }
  }

  /**
   * Programar escaneos automáticos para un dominio
   * @param {Object} domain - Objeto de dominio
   */
  async scheduleDomainScans(domain) {
    try {
      const domainId = domain._id.toString();
      
      // Detener job existente si existe
      this.stopDomainScans(domainId);

      // Obtener configuración de escaneo
      const scanConfig = this.getScanConfig(domain);
      
      // Validar configuración de cron
      if (!cron.validate(scanConfig.cronExpression)) {
        logger.warn(`Invalid cron expression for domain ${domain.domain}: ${scanConfig.cronExpression}`);
        scanConfig.cronExpression = this.defaultScanInterval;
      }

      // Crear nuevo cron job
      const cronJob = cron.schedule(scanConfig.cronExpression, async () => {
        await this.executeDomainScan(domain, scanConfig);
      }, {
        scheduled: true,
        timezone: scanConfig.timezone || 'UTC'
      });

      // Guardar referencia del job
      this.activeCronJobs.set(domainId, cronJob);
      this.scanIntervals.set(domainId, scanConfig);

      logger.info(`Scheduled automatic scans for domain: ${domain.domain}`, {
        domainId,
        cronExpression: scanConfig.cronExpression,
        timezone: scanConfig.timezone,
        scanType: scanConfig.scanType
      });

    } catch (error) {
      logger.error(`Error scheduling scans for domain ${domain.domain}:`, error);
    }
  }

  /**
   * Obtener configuración de escaneo para un dominio
   * @param {Object} domain - Objeto de dominio
   * @returns {Object} Configuración de escaneo
   */
  getScanConfig(domain) {
    const defaultConfig = {
      cronExpression: this.defaultScanInterval,
      timezone: 'UTC',
      scanType: 'full', // 'full' | 'quick' | 'smart'
      maxDepth: 3,
      includeSubdomains: false,
      enableAdvancedAnalysis: false,
      notifyOnCompletion: true,
      retryAttempts: 2
    };

    // Mergear con configuración del dominio si existe
    if (domain.scanConfig) {
      return {
        ...defaultConfig,
        ...domain.scanConfig,
        cronExpression: this.convertIntervalToCron(domain.scanConfig.scanInterval) || defaultConfig.cronExpression
      };
    }

    return defaultConfig;
  }

  /**
   * Convertir intervalo de escaneo a expresión cron
   * @param {String} interval - Intervalo (hourly, daily, weekly, monthly)
   * @returns {String} Expresión cron
   */
  convertIntervalToCron(interval) {
    const cronExpressions = {
      'hourly': '0 * * * *',           // Cada hora
      'every-2-hours': '0 */2 * * *',  // Cada 2 horas
      'every-6-hours': '0 */6 * * *',  // Cada 6 horas
      'daily': '0 2 * * *',            // Diario a las 2 AM
      'weekly': '0 2 * * 1',           // Semanal los lunes a las 2 AM
      'monthly': '0 2 1 * *',          // Mensual el día 1 a las 2 AM
      'custom': null                   // Usa cronExpression personalizada
    };

    return cronExpressions[interval];
  }

  /**
   * Ejecutar escaneo de dominio
   * @param {Object} domain - Objeto de dominio
   * @param {Object} scanConfig - Configuración de escaneo
   */
  async executeDomainScan(domain, scanConfig) {
    const domainId = domain._id.toString();
    const startTime = Date.now();

    try {
      logger.info(`Starting automatic scan for domain: ${domain.domain}`, {
        domainId,
        scanType: scanConfig.scanType,
        scheduledTime: new Date().toISOString()
      });

      // Actualizar último escaneo programado
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.lastScheduledScan': new Date(),
        'scanConfig.scanStatus': 'scanning'
      });

      // Ejecutar escaneo según el tipo
      let scanResult;
      switch (scanConfig.scanType) {
        case 'quick':
          scanResult = await scanner.quickScan(domain.domain, {
            clientId: domain.clientId._id,
            domainId: domainId
          });
          break;
        
        case 'smart':
          scanResult = await scanner.smartScan(domain.domain, {
            clientId: domain.clientId._id,
            domainId: domainId,
            previousScanData: domain.lastScanResult
          });
          break;
        
        case 'full':
        default:
          scanResult = await scanner.scanDomain(domain.domain, {
            clientId: domain.clientId._id,
            domainId: domainId,
            maxDepth: scanConfig.maxDepth,
            includeSubdomains: scanConfig.includeSubdomains
          });
          break;
      }

      const duration = Date.now() - startTime;

      // Actualizar resultado en la base de datos
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.scanStatus': 'completed',
        'scanConfig.lastScanResult': scanResult,
        'scanConfig.lastScanDuration': duration,
        'scanConfig.nextScheduledScan': this.getNextScanTime(scanConfig.cronExpression)
      });

      logger.info(`Automatic scan completed for domain: ${domain.domain}`, {
        domainId,
        duration: `${duration}ms`,
        cookiesFound: scanResult?.cookiesFound || 0,
        newCookies: scanResult?.newCookies || 0,
        updatedCookies: scanResult?.updatedCookies || 0
      });

      // Enviar notificación si está habilitada
      if (scanConfig.notifyOnCompletion) {
        await this.sendScanNotification(domain, scanResult, duration);
      }

      // Programar análisis avanzado si está habilitado
      if (scanConfig.enableAdvancedAnalysis && scanResult?.cookiesFound > 0) {
        await this.scheduleAdvancedAnalysis(domain, scanResult);
      }

    } catch (error) {
      logger.error(`Error in automatic scan for domain ${domain.domain}:`, error);

      // Actualizar estado de error
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.scanStatus': 'error',
        'scanConfig.lastError': {
          message: error.message,
          timestamp: new Date(),
          stack: error.stack
        }
      });

      // Reintentar si está configurado
      if (scanConfig.retryAttempts > 0) {
        await this.scheduleRetry(domain, scanConfig, error);
      }
    }
  }

  /**
   * Obtener próximo tiempo de escaneo
   * @param {String} cronExpression - Expresión cron
   * @returns {Date} Próximo tiempo de ejecución
   */
  getNextScanTime(cronExpression) {
    try {
      const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
      // Esta es una aproximación - en producción usaríamos una librería como node-cron-parser
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Aproximación de 24 horas
    } catch (error) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Programar reintento de escaneo
   * @param {Object} domain - Objeto de dominio
   * @param {Object} scanConfig - Configuración de escaneo
   * @param {Error} error - Error del escaneo anterior
   */
  async scheduleRetry(domain, scanConfig, error) {
    const retryDelay = 30 * 60 * 1000; // 30 minutos
    
    setTimeout(async () => {
      logger.info(`Retrying automatic scan for domain: ${domain.domain}`);
      
      const retryConfig = {
        ...scanConfig,
        retryAttempts: scanConfig.retryAttempts - 1
      };
      
      await this.executeDomainScan(domain, retryConfig);
    }, retryDelay);
  }

  /**
   * Enviar notificación de escaneo completado
   * @param {Object} domain - Objeto de dominio
   * @param {Object} scanResult - Resultado del escaneo
   * @param {Number} duration - Duración del escaneo
   */
  async sendScanNotification(domain, scanResult, duration) {
    try {
      // Aquí integrarías con el servicio de notificaciones/email
      logger.info(`Scan notification for domain: ${domain.domain}`, {
        cookiesFound: scanResult?.cookiesFound || 0,
        duration: `${duration}ms`
      });
    } catch (error) {
      logger.error('Error sending scan notification:', error);
    }
  }

  /**
   * Programar análisis avanzado
   * @param {Object} domain - Objeto de dominio
   * @param {Object} scanResult - Resultado del escaneo
   */
  async scheduleAdvancedAnalysis(domain, scanResult) {
    try {
      // Aquí integrarías con el servicio de análisis avanzado
      logger.info(`Advanced analysis scheduled for domain: ${domain.domain}`, {
        cookiesForAnalysis: scanResult?.cookiesFound || 0
      });
    } catch (error) {
      logger.error('Error scheduling advanced analysis:', error);
    }
  }

  /**
   * Configurar escaneos para un dominio específico
   * @param {String} domainId - ID del dominio
   * @param {Object} scanConfig - Nueva configuración de escaneo
   */
  async configureDomainScans(domainId, scanConfig) {
    try {
      // Actualizar configuración en la base de datos
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig': {
          ...scanConfig,
          autoScanEnabled: true,
          updatedAt: new Date()
        }
      });

      // Recargar configuración del dominio
      const domain = await Domain.findById(domainId).populate('clientId');
      if (domain) {
        await this.scheduleDomainScans(domain);
        logger.info(`Updated scan configuration for domain: ${domain.domain}`);
      }

    } catch (error) {
      logger.error(`Error configuring scans for domain ${domainId}:`, error);
      throw error;
    }
  }

  /**
   * Detener escaneos automáticos para un dominio
   * @param {String} domainId - ID del dominio
   */
  stopDomainScans(domainId) {
    const cronJob = this.activeCronJobs.get(domainId);
    if (cronJob) {
      cronJob.stop();
      cronJob.destroy();
      this.activeCronJobs.delete(domainId);
      this.scanIntervals.delete(domainId);
      logger.info(`Stopped automatic scans for domain: ${domainId}`);
    }
  }

  /**
   * Habilitar escaneos automáticos para un dominio
   * @param {String} domainId - ID del dominio
   */
  async enableDomainScans(domainId) {
    try {
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.autoScanEnabled': true
      });

      const domain = await Domain.findById(domainId).populate('clientId');
      if (domain) {
        await this.scheduleDomainScans(domain);
      }
    } catch (error) {
      logger.error(`Error enabling scans for domain ${domainId}:`, error);
      throw error;
    }
  }

  /**
   * Deshabilitar escaneos automáticos para un dominio
   * @param {String} domainId - ID del dominio
   */
  async disableDomainScans(domainId) {
    try {
      await Domain.findByIdAndUpdate(domainId, {
        'scanConfig.autoScanEnabled': false
      });

      this.stopDomainScans(domainId);
    } catch (error) {
      logger.error(`Error disabling scans for domain ${domainId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener estado de escaneos activos
   * @returns {Object} Estado de escaneos
   */
  getActiveScansStatus() {
    const status = {
      totalActiveDomains: this.activeCronJobs.size,
      domains: []
    };

    for (const [domainId, cronJob] of this.activeCronJobs.entries()) {
      const scanConfig = this.scanIntervals.get(domainId);
      status.domains.push({
        domainId,
        isRunning: cronJob.running,
        cronExpression: scanConfig?.cronExpression,
        scanType: scanConfig?.scanType,
        timezone: scanConfig?.timezone
      });
    }

    return status;
  }

  /**
   * Limpiar y detener todos los cron jobs
   */
  async shutdown() {
    logger.info('Shutting down Automatic Scan Scheduler');
    
    for (const [domainId, cronJob] of this.activeCronJobs.entries()) {
      cronJob.stop();
      cronJob.destroy();
    }
    
    this.activeCronJobs.clear();
    this.scanIntervals.clear();
    this.initialized = false;
    
    logger.info('Automatic Scan Scheduler shutdown completed');
  }
}

module.exports = new AutomaticScanSchedulerService();