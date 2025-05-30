const redis = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hora en segundos
    this.prefixes = {
      vendor: 'vendor:',
      translation: 'translation:',
      consent: 'consent:',
      domain: 'domain:',
      analytics: 'analytics:',
      template: 'template:',
      scan: 'scan:'
    };
  }

  // Guardar en caché
  async set(key, value, options = {}) {
    try {
      const {
        ttl = this.defaultTTL,
        prefix = '',
        serialize = true
      } = options;

      const cacheKey = this._buildKey(prefix, key);
      const cacheValue = serialize ? JSON.stringify(value) : value;

      if (ttl > 0) {
        await redis.setex(cacheKey, ttl, cacheValue);
      } else {
        await redis.set(cacheKey, cacheValue);
      }

      logger.debug(`Cache set: ${cacheKey}`);
      return true;
    } catch (error) {
      logger.error('Error setting cache:', error);
      return false;
    }
  }

  // Obtener de caché
  async get(key, options = {}) {
    try {
      const {
        prefix = '',
        parse = true,
        defaultValue = null
      } = options;

      const cacheKey = this._buildKey(prefix, key);
      const value = await redis.get(cacheKey);

      if (value === null) {
        return defaultValue;
      }

      return parse ? JSON.parse(value) : value;
    } catch (error) {
      logger.error('Error getting cache:', error);
      return null;
    }
  }

  // Eliminar de caché
  async delete(key, options = {}) {
    try {
      const { prefix = '' } = options;
      const cacheKey = this._buildKey(prefix, key);
      
      await redis.del(cacheKey);
      logger.debug(`Cache deleted: ${cacheKey}`);
      
      return true;
    } catch (error) {
      logger.error('Error deleting cache:', error);
      return false;
    }
  }

  // Métodos especializados para traducciones
  async setCachedTranslation(key, translation, ttl = 604800) {
    return this.set(key, translation, {
      prefix: 'translation:',
      ttl
    });
  }

  async getCachedTranslation(key) {
    return this.get(key, { prefix: 'translation:' });
  }

  // Métodos especializados para consentimiento
  async setCachedConsent(userId, domainId, data, ttl = 3600) {
    const key = `${domainId}:${userId}`;
    return this.set(key, data, {
      prefix: 'consent:',
      ttl
    });
  }

  async getCachedConsent(userId, domainId) {
    const key = `${domainId}:${userId}`;
    return this.get(key, { prefix: 'consent:' });
  }

  // Métodos especializados para vendors
  async setVendorList(vendorList, ttl = 86400) {
    return this.set('vendor:list:latest', vendorList, { ttl });
  }

  async getVendorList() {
    return this.get('vendor:list:latest');
  }

  // Métodos útiles
  async clearPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        logger.debug(`Cache cleared for pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error('Error clearing cache pattern:', error);
      return false;
    }
  }

  async exists(key, options = {}) {
    try {
      const { prefix = '' } = options;
      const cacheKey = this._buildKey(prefix, key);
      
      return await redis.exists(cacheKey);
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      return false;
    }
  }

  // Método privado para construir claves
  _buildKey(prefix, key) {
    const predefinedPrefix = this.prefixes[prefix];
    const finalPrefix = predefinedPrefix || prefix;
    
    return finalPrefix ? `${finalPrefix}${key}` : key;
  }
}

module.exports = new CacheService();