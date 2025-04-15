const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');

class CookieSyncService {
  /**
   * Sincroniza las cookies detectadas en el escaneo con las cookies almacenadas.
   * @param {String} domainId - ID del dominio.
   * @param {Array} scannedCookies - Array de cookies obtenidas del escaneo.
   */
  async syncCookies(domainId, scannedCookies) {
    try {
      // Obtener cookies actuales en la BD para el dominio
      const existingCookies = await Cookie.find({ domainId });
      
      // Crear un mapa para búsquedas rápidas (clave: name + path)
      const existingMap = new Map();
      existingCookies.forEach(cookie => {
        const key = `${cookie.name}-${cookie.path || ''}`;
        existingMap.set(key, cookie);
      });

      // Procesar las cookies escaneadas
      for (const scanned of scannedCookies) {
        const key = `${scanned.name}-${scanned.path || ''}`;
        const existing = existingMap.get(key);
        // Transformar provider y attributes:
        const providerStr = typeof scanned.provider === 'object' && scanned.provider !== null
          ? scanned.provider.name || 'Unknown'
          : scanned.provider || 'Unknown';
        const sanitizedAttributes = {
          duration: scanned.attributes && scanned.attributes.duration ? scanned.attributes.duration : '',
          type: scanned.attributes && scanned.attributes.type ? scanned.attributes.type : '',
          path: scanned.attributes && scanned.attributes.path ? scanned.attributes.path : '',
          domain: scanned.attributes && scanned.attributes.domain ? scanned.attributes.domain : '',
          secure: scanned.attributes && typeof scanned.attributes.secure === 'boolean' ? scanned.attributes.secure : false,
          httpOnly: scanned.attributes && typeof scanned.attributes.httpOnly === 'boolean' ? scanned.attributes.httpOnly : false,
          sameSite: scanned.attributes && scanned.attributes.sameSite  && scanned.sameSite != ``? scanned.attributes.sameSite : ''
        };

        if (existing) {
          // Actualizar cookie existente: actualizar lastSeen y frecuencia.
          existing.detection.lastSeen = new Date();
          existing.detection.frequency = (existing.detection.frequency || 0) + 1;
          // Actualizar otros campos si fuera necesario, por ejemplo:
          existing.provider = providerStr;
          existing.attributes = sanitizedAttributes;
          await existing.save();
          // Quitar del mapa para identificar los que ya no se detectan
          existingMap.delete(key);
        } else {
          // No existe: crear una nueva cookie
          await Cookie.create({
            domainId,
            name: scanned.name,
            provider: providerStr,
            category: scanned.category,
            description: { en: scanned.description || 'Sin descripción', auto: true },
            purpose: scanned.purpose,
            attributes: sanitizedAttributes,
            script: scanned.script,
            detection: {
              method: 'scan',
              firstDetected: new Date(),
              lastSeen: new Date(),
              frequency: 1,
              pattern: scanned.pattern || ''
            },
            status: 'active',
            metadata: {
              createdBy: 'scan',
              lastModifiedBy: 'scan',
              version: 1
            }
          });
        }
      }

      // Las cookies que quedan en existingMap ya no se detectaron en este escaneo;
      // se pueden marcar como inactivas.
      for (const cookie of existingMap.values()) {
        cookie.status = 'inactive';
        await cookie.save();
      }

      logger.info('Cookie synchronization completed');
    } catch (error) {
      logger.error('Error synchronizing cookies:', error);
      throw error;
    }
  }
}

module.exports = new CookieSyncService();
