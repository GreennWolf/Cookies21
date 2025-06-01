// jobs/scheduledTasks.js
const cron = require('node-cron');
const analyticsSyncService = require('../services/analyticsSyncService');
const imageProcessorService = require('../services/imageProcessor.service');
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
  
  // Limpieza de imágenes de banners eliminados cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Ejecutando limpieza de imágenes de banners eliminados');
    try {
      const result = await imageProcessorService.cleanupDeletedBannersImages();
      if (result.deletedBanners > 0) {
        logger.info(`Limpieza de banners completada: ${result.deletedBanners} directorios eliminados, ${result.deletedFiles} archivos eliminados`);
      } else {
        logger.debug('No se encontraron banners eliminados para limpiar');
      }
    } catch (error) {
      logger.error('Error en job programado de limpieza de imágenes:', error);
    }
  });
  
  logger.info('Tareas programadas configuradas correctamente');
};

module.exports = { setupScheduledJobs };