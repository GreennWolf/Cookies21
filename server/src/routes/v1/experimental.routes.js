const router = require('express').Router();
const { protect, restrictTo } = require('../../middleware/auth');
const catchAsync = require('../../utils/catchAsync');
const SuperFastCookieScanner = require('../../experimental/cookie-analysis-v2/services/SuperFastCookieScanner');
const CookieImporter = require('../../experimental/cookie-analysis-v2/services/CookieImporter');
const Domain = require('../../models/Domain');
const logger = require('../../utils/logger');

/**
 * RUTAS EXPERIMENTALES - SOLO PARA OWNERS
 * Sistema V2 de detección avanzada de cookies
 */

// Middleware para verificar que es owner
router.use(protect, restrictTo('owner'));

/**
 * @route   POST /api/v1/experimental/scanner/test
 * @desc    Probar el scanner V2 con una URL
 * @access  Owner only
 */
router.post('/scanner/test', catchAsync(async (req, res) => {
  const { url, config = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL es requerida'
    });
  }
  
  logger.info(`[Experimental] Owner ${req.user.email} probando scanner V2 con ${url}`);
  
  const scanner = new SuperFastCookieScanner({
    headless: config.headless ?? true,
    timeout: config.timeout ?? 30000,
    waitTime: config.waitTime ?? 3000,
    scrollDepth: config.scrollDepth ?? 2,
    ...config
  });
  
  try {
    const results = await scanner.scan(url);
    
    // Estadísticas adicionales
    const stats = {
      totalCookies: results.cookies.length,
      bySource: {},
      byCategory: {},
      technologies: results.technologies.length,
      scanDuration: results.scanDuration
    };
    
    // Agrupar por fuente
    results.cookies.forEach(cookie => {
      const source = cookie.source || 'unknown';
      const category = cookie.category || 'unknown';
      
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        ...results,
        stats
      }
    });
  } catch (error) {
    logger.error('[Experimental] Error en scanner V2:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando scanner V2',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/experimental/scanner/analyze/:domainId
 * @desc    Analizar un dominio con el sistema V2 e importar resultados
 * @access  Owner only
 */
router.post('/scanner/analyze/:domainId', catchAsync(async (req, res) => {
  const { domainId } = req.params;
  const { autoImport = false, config = {} } = req.body;
  
  // Verificar que el dominio existe
  const domain = await Domain.findById(domainId);
  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Dominio no encontrado'
    });
  }
  
  logger.info(`[Experimental] Analizando dominio ${domain.domain} con sistema V2`);
  
  const scanner = new SuperFastCookieScanner({
    headless: config.headless ?? true,
    timeout: config.timeout ?? 30000,
    waitTime: config.waitTime ?? 3000,
    scrollDepth: config.scrollDepth ?? 2,
    ...config
  });
  
  try {
    // Ejecutar escaneo
    const scanResults = await scanner.scan(`https://${domain.domain}`);
    
    let importResults = null;
    
    // Importar a base de datos si se solicita
    if (autoImport && scanResults.cookies.length > 0) {
      logger.info(`[Experimental] Importando ${scanResults.cookies.length} cookies a base de datos`);
      
      const importer = new CookieImporter();
      importResults = await importer.importCookiesFromV2Analysis(scanResults, domainId);
    }
    
    // Estadísticas
    const stats = {
      totalCookies: scanResults.cookies.length,
      bySource: {},
      byCategory: {},
      technologies: scanResults.technologies.length,
      scanDuration: scanResults.scanDuration,
      imported: importResults?.imported || 0,
      updated: importResults?.updated || 0,
      errors: importResults?.errors || []
    };
    
    // Agrupar cookies
    scanResults.cookies.forEach(cookie => {
      const source = cookie.source || 'unknown';
      const category = cookie.category || 'unknown';
      
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        domain: domain.domain,
        scanResults: {
          ...scanResults,
          cookies: scanResults.cookies.slice(0, 100) // Limitar para no sobrecargar la respuesta
        },
        importResults,
        stats
      }
    });
    
  } catch (error) {
    logger.error('[Experimental] Error analizando dominio:', error);
    res.status(500).json({
      success: false,
      message: 'Error analizando dominio',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/experimental/scanner/compare/:domainId
 * @desc    Comparar resultados del sistema V1 vs V2
 * @access  Owner only
 */
router.post('/scanner/compare/:domainId', catchAsync(async (req, res) => {
  const { domainId } = req.params;
  
  const domain = await Domain.findById(domainId).populate('cookies');
  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Dominio no encontrado'
    });
  }
  
  logger.info(`[Experimental] Comparando sistemas V1 vs V2 para ${domain.domain}`);
  
  // Cookies actuales en DB (sistema V1)
  const v1Cookies = domain.cookies?.filter(c => c.status === 'active') || [];
  
  // Escanear con sistema V2
  const scanner = new SuperFastCookieScanner({
    headless: true,
    timeout: 30000
  });
  
  try {
    const v2Results = await scanner.scan(`https://${domain.domain}`);
    
    // Comparación
    const comparison = {
      v1: {
        total: v1Cookies.length,
        cookies: v1Cookies.map(c => ({
          name: c.name,
          category: c.category,
          provider: c.provider
        }))
      },
      v2: {
        total: v2Results.cookies.length,
        bySource: {},
        byCategory: {},
        technologies: v2Results.technologies,
        uniqueCookies: []
      },
      improvement: {
        absolute: v2Results.cookies.length - v1Cookies.length,
        percentage: v1Cookies.length > 0 
          ? Math.round(((v2Results.cookies.length - v1Cookies.length) / v1Cookies.length) * 100)
          : 0
      }
    };
    
    // Analizar V2
    const v1Names = new Set(v1Cookies.map(c => c.name));
    
    v2Results.cookies.forEach(cookie => {
      const source = cookie.source || 'unknown';
      const category = cookie.category || 'unknown';
      
      comparison.v2.bySource[source] = (comparison.v2.bySource[source] || 0) + 1;
      comparison.v2.byCategory[category] = (comparison.v2.byCategory[category] || 0) + 1;
      
      // Cookies únicas en V2
      if (!v1Names.has(cookie.name)) {
        comparison.v2.uniqueCookies.push({
          name: cookie.name,
          source: cookie.source,
          category: cookie.category
        });
      }
    });
    
    res.json({
      success: true,
      data: comparison
    });
    
  } catch (error) {
    logger.error('[Experimental] Error comparando sistemas:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparando sistemas',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/v1/experimental/stats
 * @desc    Obtener estadísticas del sistema experimental
 * @access  Owner only
 */
router.get('/stats', catchAsync(async (req, res) => {
  // Aquí podrías agregar estadísticas de uso del sistema experimental
  res.json({
    success: true,
    data: {
      message: 'Sistema Experimental V2 - Zona de pruebas para owners',
      features: [
        'SuperFastCookieScanner - Detecta 100+ cookies',
        'Múltiples métodos de detección simultáneos',
        'Análisis de iframes y storage',
        'Detección de tecnologías y vendors',
        'Importación automática a base de datos'
      ],
      endpoints: [
        'POST /scanner/test - Probar con cualquier URL',
        'POST /scanner/analyze/:domainId - Analizar dominio e importar',
        'POST /scanner/compare/:domainId - Comparar V1 vs V2'
      ]
    }
  });
}));

module.exports = router;