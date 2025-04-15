// jobs/scheduledTasks.js
const cron = require('node-cron');
const analyticsSyncService = require('../services/analyticsSyncService');
const logger = require('../utils/logger');

// Configurar job diario para sincronizar analytics a las 2am
const setupScheduledJobs = () => {
  logger.info('Configurando tareas programadas...');
  
  // Sincronización diaria de analytics
  cron.schedule('0 2 * * *', async () => {
    logger.info('Ejecutando sincronización diaria de analytics');
    try {
      const result = await analyticsSyncService.runDailySync();
      logger.info(`Sincronización completada. Resultado: ${result ? 'Éxito' : 'Fallo'}`);
    } catch (error) {
      logger.error('Error en job programado de sincronización:', error);
    }
  });
  
  logger.info('Tareas programadas configuradas correctamente');
};

module.exports = { setupScheduledJobs };