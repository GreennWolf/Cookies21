// src/middleware/cache.js

const redis = require('../config/redis');
const { logger } = require('../utils/logger');
const ms = require('ms');

exports.cacheControl = (duration = '5 minutes') => {
  return (req, res, next) => {
    try {
      const durationMs = ms(duration);
      // Si durationMs no es un número válido o es menor o igual a 0, usamos no-cache
      if (typeof durationMs !== 'number' || isNaN(durationMs) || durationMs <= 0) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.set('Cache-Control', `public, max-age=${durationMs / 1000}`);
      }

      // Headers adicionales para forzar el no-cache en ciertos contextos
      res.set({
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      next();
    } catch (error) {
      // Si logger no está definido o no tiene el método error, usar console.error
      if (logger && typeof logger.error === 'function') {
        logger.error('Cache middleware error:', error);
      } else {
        console.error('Cache middleware error:', error);
      }
      next();
    }
  };
};

exports.clearCache = (pattern) => {
  return async (req, res, next) => {
    try {
      if (pattern) {
        const keys = await redis.keys(pattern);
        if (keys.length) {
          await redis.del(keys);
        }
      }
      next();
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error('Clear cache error:', error);
      } else {
        console.error('Clear cache error:', error);
      }
      next();
    }
  };
};

exports.cacheUpdate = (keyPattern) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = async function(data) {
      try {
        const keys = await redis.keys(keyPattern);
        for (const key of keys) {
          const cachedData = await redis.get(key);
          if (cachedData) {
            const updatedData = _updateCachedData(JSON.parse(cachedData), data);
            await redis.set(key, JSON.stringify(updatedData));
          }
        }
      } catch (error) {
        if (logger && typeof logger.error === 'function') {
          logger.error('Cache update error:', error);
        } else {
          console.error('Cache update error:', error);
        }
      }
      return originalJson.call(this, data);
    };
    next();
  };
};

// Funciones auxiliares privadas

function _generateCacheKey(req, options) {
  const parts = [
    options.prefix || 'cache',
    req.originalUrl || req.url,
    ...(options.queryParams ? options.queryParams.map(param => req.query[param]) : []),
    ...(req.clientId && options.includeClient ? [req.clientId] : []),
    ...(req.headers['accept-language'] && options.includeLanguage ? [req.headers['accept-language']] : [])
  ];

  return parts
    .filter(Boolean)
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9:]/g, '_');
}

function _updateCachedData(cachedData, newData) {
  // Si los datos son arrays, actualizar elementos que coincidan por ID
  if (Array.isArray(cachedData) && Array.isArray(newData)) {
    return cachedData.map(item => {
      const updatedItem = newData.find(newItem => newItem.id === item.id);
      return updatedItem || item;
    });
  }

  // Si son objetos, hacer merge superficial
  if (typeof cachedData === 'object' && typeof newData === 'object') {
    return { ...cachedData, ...newData };
  }

  // Si no es ninguno de los anteriores, devolver los nuevos datos
  return newData;
}
