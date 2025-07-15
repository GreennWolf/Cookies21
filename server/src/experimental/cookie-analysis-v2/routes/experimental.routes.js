const express = require('express');
const rateLimit = require('express-rate-limit');
const ExperimentalCookieController = require('../controllers/ExperimentalCookieController');
const { protect } = require('../../../middleware/auth');

const router = express.Router();

// Rate limiting para endpoints experimentales
const experimentalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // límite de 20 requests por ventana por IP
  message: {
    status: 'error',
    message: 'Too many experimental requests, try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting más estricto para escaneos
const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // máximo 5 escaneos por 5 minutos
  message: {
    status: 'error', 
    message: 'Too many scan requests, please wait before scanning again'
  }
});

/**
 * @route   GET /api/v1/experimental/health-public
 * @desc    Health check público sin autenticación
 * @access  Public
 */
router.get('/health-public', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Experimental Cookie Analysis System is healthy (public endpoint)',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    authentication: 'not required'
  });
});

/**
 * @route   POST /api/v1/experimental/test-scanner
 * @desc    Test scanner without database (public endpoint for testing)
 * @access  Public
 */
router.post('/test-scanner', async (req, res) => {
  try {
    const { url = 'https://example.com' } = req.body;
    
    res.status(200).json({
      status: 'success',
      message: 'Scanner test completed successfully',
      data: {
        url: url,
        mockResults: {
          scanId: 'test_' + Date.now(),
          cookiesFound: 42,
          scannerType: 'SuperFastCookieScanner',
          detectionMethods: [
            'HTTP Headers',
            'JavaScript Monitor', 
            'Storage Detection',
            'Frame Analysis',
            'Network Capture'
          ],
          summary: {
            necessary: 8,
            analytics: 15,
            marketing: 12,
            functional: 5,
            unknown: 2
          }
        }
      },
      timestamp: new Date().toISOString(),
      note: 'This is a mock response for testing - connect database for real scanning'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Test scanner failed',
      error: error.message
    });
  }
});

// Middleware de autenticación para todas las rutas experimentales (excepto health-public)
router.use(protect);

// Aplicar rate limiting a todas las rutas
router.use(experimentalLimiter);

/**
 * @route   POST /api/v1/experimental/cookie-analysis/scan/:domainId
 * @desc    Escanear dominio con el sistema experimental
 * @access  Private
 * @params  domainId - ID del dominio a escanear
 * @query   compare - (opcional) Comparar con sistema actual
 */
router.post('/cookie-analysis/scan/:domainId', 
  scanLimiter,
  ExperimentalCookieController.scanDomain
);

/**
 * @route   POST /api/v1/experimental/cookie-analysis/scan-url
 * @desc    Escanear URL manual (solo para testing de owners)
 * @access  Private (owners only)
 */
router.post('/cookie-analysis/scan-url',
  scanLimiter,
  ExperimentalCookieController.scanURL
);

/**
 * @route   GET /api/v1/experimental/cookie-analysis/report/:scanId
 * @desc    Obtener reporte detallado de un escaneo
 * @access  Private
 * @params  scanId - ID del escaneo
 * @query   format - Formato del reporte (json, summary, full)
 */
router.get('/cookie-analysis/report/:scanId', 
  ExperimentalCookieController.getDetailedReport
);

/**
 * @route   GET /api/v1/experimental/cookie-analysis/compare/:domainId
 * @desc    Comparar sistema nuevo vs actual
 * @access  Private
 * @params  domainId - ID del dominio a comparar
 */
router.get('/cookie-analysis/compare/:domainId',
  scanLimiter,
  ExperimentalCookieController.compareSystems
);

/**
 * @route   GET /api/v1/experimental/cookie-analysis/scans
 * @desc    Obtener lista de escaneos realizados
 * @access  Private
 * @query   limit - Límite de resultados (default: 50)
 * @query   page - Página (default: 1)
 * @query   domain - Filtrar por dominio
 */
router.get('/cookie-analysis/scans',
  ExperimentalCookieController.getScans
);

/**
 * @route   DELETE /api/v1/experimental/cookie-analysis/scan/:scanId
 * @desc    Eliminar un escaneo
 * @access  Private
 * @params  scanId - ID del escaneo a eliminar
 */
router.delete('/cookie-analysis/scan/:scanId',
  ExperimentalCookieController.deleteScan
);

/**
 * @route   GET /api/v1/experimental/cookie-analysis/stats
 * @desc    Obtener estadísticas del sistema experimental
 * @access  Private
 */
router.get('/cookie-analysis/stats',
  ExperimentalCookieController.getStats
); 

/**
 * @route   GET /api/v1/experimental/cookie-analysis/health
 * @desc    Health check del sistema experimental
 * @access  Private
 */
router.get('/cookie-analysis/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Experimental Cookie Analysis System is healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;