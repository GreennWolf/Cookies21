// utils/scanLogger.js - Logger especializado para escaneo de cookies
const logger = require('./logger');

class ScanLogger {
  constructor() {
    this.activeScanLogs = new Map(); // scanId -> logs array
    this.maxLogsPerScan = 100; // Límite de logs por escaneo
  }

  // Crear un logger específico para un escaneo
  createScanLogger(scanId, scanType = 'scan', domain = '') {
    const scanLogger = {
      scanId,
      scanType,
      domain,
      startTime: new Date(),
      logs: []
    };

    this.activeScanLogs.set(scanId, scanLogger);
    
    const logFn = (level, message, details = {}) => {
      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        details,
        scanId,
        scanType,
        domain
      };

      // Agregar a logs específicos del scan
      if (scanLogger.logs.length >= this.maxLogsPerScan) {
        scanLogger.logs.shift(); // Remover el más antiguo
      }
      scanLogger.logs.push(logEntry);

      // Log principal con prefijo de escaneo
      const scanIdStr = String(scanId); // Convertir a string para manejar ObjectIds
      const prefix = `🔍 SCAN[${scanType.toUpperCase()}:${scanIdStr.slice(0, 8)}]`;
      const fullMessage = `${prefix} ${message}`;
      
      // Log según el nivel
      switch (level) {
        case 'error':
          logger.error(fullMessage, details);
          break;
        case 'warn':
          logger.warn(fullMessage, details);
          break;
        case 'info':
          logger.info(fullMessage, details);
          break;
        case 'debug':
          logger.debug(fullMessage, details);
          break;
        default:
          logger.info(fullMessage, details);
      }
    };

    return {
      info: (message, details) => logFn('info', message, details),
      warn: (message, details) => logFn('warn', message, details),
      error: (message, details) => logFn('error', message, details),
      debug: (message, details) => logFn('debug', message, details),
      
      // Métodos específicos para escaneo
      scanStart: (config) => {
        logFn('info', `🚀 Iniciando escaneo de ${domain}`, config);
      },
      
      scanProgress: (progress, currentStep) => {
        logFn('info', `📊 Progreso: ${progress}% - ${currentStep}`);
      },
      
      cookieFound: (cookieName, cookieDomain, category) => {
        logFn('debug', `🍪 Cookie encontrada: ${cookieName} (${category})`, { 
          cookieName, 
          cookieDomain, 
          category 
        });
      },
      
      urlScanned: (url, cookiesCount, errors = 0) => {
        logFn('debug', `🌐 URL escaneada: ${url}`, { 
          url, 
          cookiesCount, 
          errors 
        });
      },
      
      scanComplete: (results) => {
        logFn('info', `✅ Escaneo completado: ${results.totalCookies} cookies encontradas`, results);
      },
      
      scanError: (error, context) => {
        logFn('error', `❌ Error en escaneo: ${error.message}`, { 
          error: error.message, 
          stack: error.stack, 
          context 
        });
      },
      
      scanCancelled: (reason) => {
        logFn('warn', `⏹️ Escaneo cancelado: ${reason}`);
      },

      // Obtener logs del escaneo
      getLogs: () => {
        const scanData = this.activeScanLogs.get(scanId);
        return scanData ? [...scanData.logs] : [];
      },

      // Limpiar logs del escaneo
      cleanup: () => {
        this.activeScanLogs.delete(scanId);
        logFn('debug', '🧹 Logs de escaneo limpiados');
      }
    };
  }

  // Obtener logs de un escaneo específico
  getScanLogs(scanId) {
    const scanData = this.activeScanLogs.get(scanId);
    return scanData ? {
      scanId: scanData.scanId,
      scanType: scanData.scanType,
      domain: scanData.domain,
      startTime: scanData.startTime,
      logs: [...scanData.logs]
    } : null;
  }

  // Obtener logs de todos los escaneos activos
  getAllActiveScanLogs() {
    const result = {};
    this.activeScanLogs.forEach((scanData, scanId) => {
      result[scanId] = {
        scanType: scanData.scanType,
        domain: scanData.domain,
        startTime: scanData.startTime,
        logsCount: scanData.logs.length,
        lastLog: scanData.logs[scanData.logs.length - 1]
      };
    });
    return result;
  }

  // Limpiar logs antiguos (llamar periódicamente)
  cleanupOldLogs(olderThanMinutes = 60) {
    const cutoffTime = new Date(Date.now() - (olderThanMinutes * 60 * 1000));
    
    for (const [scanId, scanData] of this.activeScanLogs.entries()) {
      if (scanData.startTime < cutoffTime) {
        this.activeScanLogs.delete(scanId);
        logger.debug(`🧹 Logs antiguos limpiados para scan ${scanId}`);
      }
    }
  }

  // Obtener estadísticas de logs
  getLogStats() {
    const stats = {
      activeScans: this.activeScanLogs.size,
      totalLogs: 0,
      logsByLevel: { info: 0, warn: 0, error: 0, debug: 0 },
      logsByScanType: {}
    };

    this.activeScanLogs.forEach((scanData) => {
      stats.totalLogs += scanData.logs.length;
      
      if (!stats.logsByScanType[scanData.scanType]) {
        stats.logsByScanType[scanData.scanType] = 0;
      }
      stats.logsByScanType[scanData.scanType] += scanData.logs.length;

      scanData.logs.forEach((log) => {
        if (stats.logsByLevel[log.level]) {
          stats.logsByLevel[log.level]++;
        }
      });
    });

    return stats;
  }
}

// Instancia singleton
const scanLogger = new ScanLogger();

// Limpiar logs antiguos cada 30 minutos
setInterval(() => {
  scanLogger.cleanupOldLogs(60); // Limpiar logs de más de 1 hora
}, 30 * 60 * 1000);

module.exports = scanLogger;