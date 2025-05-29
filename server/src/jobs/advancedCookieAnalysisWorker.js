const { Bull, isQueueAvailable } = require('../config/bullConfig');
const logger = require('../utils/logger');
const CookieAnalysisResult = require('../models/CookieAnalysisResult');
const advancedCookieAnalyzer = require('../services/advancedCookieAnalyzer.service');

// Función opcional de notificación
let notifyAnalysisComplete;
try {
  notifyAnalysisComplete = require('../services/notification.service').notifyAnalysisComplete;
} catch (err) {
  notifyAnalysisComplete = async (result) => {
    logger.info('Analysis completed (notification service not available):', result.scanId);
  };
}

// Configurar cola de análisis solo si Bull está disponible
let analysisQueue = null;

if (Bull && isQueueAvailable()) {
  try {
    analysisQueue = new Bull('advanced cookie analysis', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000
        }
      }
    });

    // Procesar trabajos de análisis
    analysisQueue.process('startAnalysis', 2, async (job) => {
      const { analysisId, domainId, domain, config } = job.data;
      
      logger.info(`Starting analysis job for domain ${domain} (ID: ${analysisId})`);
      
      try {
        // Actualizar progreso inicial
        await job.progress(5);
        
        // Obtener análisis de la base de datos
        const analysis = await CookieAnalysisResult.findById(analysisId);
        if (!analysis) {
          throw new Error('Analysis not found in database');
        }
        
        // Verificar que el análisis esté en estado pendiente
        if (analysis.status !== 'pending') {
          throw new Error(`Analysis is not in pending state: ${analysis.status}`);
        }
        
        // Marcar como en progreso
        analysis.status = 'running';
        analysis.progress.currentPhase = 'initialization';
        analysis.progress.currentStep = 'Iniciando navegador...';
        await analysis.save();
        
        await job.progress(10);
        
        // Ejecutar análisis
        const result = await advancedCookieAnalyzer.startAnalysis(
          domainId, 
          domain, 
          config,
          analysisId
        );
        
        await job.progress(100);
        
        logger.info(`Analysis completed successfully for domain ${domain} (ID: ${analysisId})`);
        
        // Notificar finalización
        await notifyAnalysisComplete(result);
        
        return {
          analysisId,
          status: 'completed',
          duration: result.duration,
          totalCookies: result.statistics.totalCookies
        };
        
      } catch (error) {
        logger.error(`Analysis failed for domain ${domain} (ID: ${analysisId}):`, error);
        
        // Actualizar estado de error en la base de datos
        try {
          const analysis = await CookieAnalysisResult.findById(analysisId);
          if (analysis) {
            analysis.status = 'failed';
            analysis.progress.currentStep = `Error: ${error.message}`;
            analysis.progress.endTime = new Date();
            await analysis.addError('job_processing', error);
            await analysis.save();
          }
        } catch (dbError) {
          logger.error('Failed to update analysis status in database:', dbError);
        }
        
        throw error;
      }
    });

    // Procesar trabajos de análisis programados
    analysisQueue.process('scheduledAnalysis', 1, async (job) => {
      const { domainId, domain, config, scheduledBy } = job.data;
      
      logger.info(`Starting scheduled analysis for domain ${domain}`);
      
      try {
        // Verificar que no haya análisis activos
        const activeAnalysis = await CookieAnalysisResult.getActiveAnalysis(domainId);
        if (activeAnalysis) {
          logger.warn(`Skipping scheduled analysis for ${domain}: active analysis in progress`);
          return { status: 'skipped', reason: 'Active analysis in progress' };
        }
        
        // Crear nuevo análisis programado
        const analysis = new CookieAnalysisResult({
          domainId,
          domain,
          analysisConfig: config,
          status: 'pending',
          metadata: {
            triggeredBy: scheduledBy,
            triggerType: 'scheduled',
            version: '2.0.0',
            analysisEngine: 'AdvancedPuppeteer'
          }
        });
        
        await analysis.save();
        
        // Ejecutar análisis
        const result = await advancedCookieAnalyzer.startAnalysis(
          domainId, 
          domain, 
          config,
          analysis._id.toString()
        );
        
        logger.info(`Scheduled analysis completed for domain ${domain}`);
        
        // Notificar finalización
        await notifyAnalysisComplete(result);
        
        return {
          analysisId: result._id,
          status: 'completed',
          duration: result.duration,
          totalCookies: result.statistics.totalCookies
        };
        
      } catch (error) {
        logger.error(`Scheduled analysis failed for domain ${domain}:`, error);
        throw error;
      }
    });

    // Eventos de la cola
    analysisQueue.on('completed', (job, result) => {
      logger.info(`Analysis job ${job.id} completed:`, result);
    });

    analysisQueue.on('failed', (job, err) => {
      logger.error(`Analysis job ${job.id} failed:`, err.message);
    });

    analysisQueue.on('stalled', (job) => {
      logger.warn(`Analysis job ${job.id} stalled`);
    });

    analysisQueue.on('progress', (job, progress) => {
      logger.debug(`Analysis job ${job.id} progress: ${progress}%`);
    });
    
  } catch (err) {
    logger.error('Failed to initialize Bull queue:', err);
    analysisQueue = null;
  }
} else {
  logger.warn('Bull queue not available for advanced cookie analysis');
}

// Funciones para gestionar trabajos
const AnalysisWorker = {
  // Verificar si el worker está disponible
  isAvailable: () => !!analysisQueue,
  
  // Añadir trabajo de análisis
  async addAnalysisJob(analysisId, domainId, domain, config, priority = 'normal') {
    if (!analysisQueue) {
      logger.warn('Queue not available, cannot add analysis job');
      return null;
    }
    
    const jobOptions = {
      priority: this.getPriorityValue(priority),
      delay: 0,
      attempts: 3
    };
    
    const job = await analysisQueue.add('startAnalysis', {
      analysisId,
      domainId,
      domain,
      config
    }, jobOptions);
    
    logger.info(`Analysis job ${job.id} queued for domain ${domain}`);
    return job;
  },
  
  // Añadir trabajo de análisis programado
  async addScheduledAnalysisJob(domainId, domain, config, scheduledBy, delay = 0) {
    if (!analysisQueue) {
      logger.warn('Queue not available, cannot add scheduled analysis job');
      return null;
    }
    
    const jobOptions = {
      priority: 0, // Prioridad baja para análisis programados
      delay,
      attempts: 2
    };
    
    const job = await analysisQueue.add('scheduledAnalysis', {
      domainId,
      domain,
      config,
      scheduledBy
    }, jobOptions);
    
    logger.info(`Scheduled analysis job ${job.id} queued for domain ${domain}`);
    return job;
  },
  
  // Cancelar trabajo
  async cancelJob(jobId) {
    if (!analysisQueue) {
      return false;
    }
    
    const job = await analysisQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Analysis job ${jobId} cancelled`);
      return true;
    }
    return false;
  },
  
  // Obtener estado de trabajo
  async getJobStatus(jobId) {
    if (!analysisQueue) {
      return null;
    }
    
    const job = await analysisQueue.getJob(jobId);
    if (!job) {
      return null;
    }
    
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress(),
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue
    };
  },
  
  // Obtener estadísticas de la cola
  async getQueueStats() {
    if (!analysisQueue) {
      return {
        available: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      analysisQueue.getWaiting(),
      analysisQueue.getActive(),
      analysisQueue.getCompleted(),
      analysisQueue.getFailed(),
      analysisQueue.getDelayed()
    ]);
    
    return {
      available: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  },
  
  // Limpiar trabajos completados
  async cleanQueue() {
    if (!analysisQueue) {
      return;
    }
    
    await analysisQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 horas
    await analysisQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 días
    logger.info('Analysis queue cleaned');
  },
  
  // Pausar cola
  async pauseQueue() {
    if (!analysisQueue) {
      return;
    }
    
    await analysisQueue.pause();
    logger.info('Analysis queue paused');
  },
  
  // Reanudar cola
  async resumeQueue() {
    if (!analysisQueue) {
      return;
    }
    
    await analysisQueue.resume();
    logger.info('Analysis queue resumed');
  },
  
  // Obtener valor numérico de prioridad
  getPriorityValue(priority) {
    const priorities = {
      low: -10,
      normal: 0,
      high: 10
    };
    return priorities[priority] || 0;
  },
  
  // Cerrar cola
  async close() {
    if (!analysisQueue) {
      return;
    }
    
    await analysisQueue.close();
    logger.info('Analysis queue closed');
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing analysis queue...');
  await AnalysisWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing analysis queue...');
  await AnalysisWorker.close();
  process.exit(0);
});

module.exports = {
  analysisQueue,
  AnalysisWorker
};