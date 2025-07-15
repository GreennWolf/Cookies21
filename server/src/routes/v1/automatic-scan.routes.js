/**
 * AUTOMATIC SCAN ROUTES
 * 
 * Rutas para gestionar la configuración de escaneos automáticos
 */

const express = require('express');
const automaticScanController = require('../../controllers/AutomaticScanController');
const { protect } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Validaciones
const validateDomainId = [
  param('domainId').isMongoId().withMessage('ID de dominio inválido')
];

const validateScanConfig = [
  body('autoScanEnabled').optional().isBoolean().withMessage('autoScanEnabled debe ser un booleano'),
  body('scanInterval').optional().isIn(['hourly', 'every-2-hours', 'every-6-hours', 'daily', 'weekly', 'monthly', 'custom']).withMessage('Intervalo de escaneo no válido'),
  body('cronExpression').optional().isString().withMessage('Expresión cron debe ser una cadena'),
  body('timezone').optional().isString().withMessage('Zona horaria debe ser una cadena'),
  body('scanType').optional().isIn(['quick', 'full', 'smart']).withMessage('Tipo de escaneo no válido'),
  body('maxDepth').optional().isInt({ min: 1, max: 10 }).withMessage('Profundidad máxima debe estar entre 1 y 10'),
  body('includeSubdomains').optional().isBoolean().withMessage('includeSubdomains debe ser un booleano'),
  body('enableAdvancedAnalysis').optional().isBoolean().withMessage('enableAdvancedAnalysis debe ser un booleano'),
  body('notifyOnCompletion').optional().isBoolean().withMessage('notifyOnCompletion debe ser un booleano'),
  body('retryAttempts').optional().isInt({ min: 0, max: 5 }).withMessage('Intentos de reintento deben estar entre 0 y 5'),
  body('embedDetectionEnabled').optional().isBoolean().withMessage('embedDetectionEnabled debe ser un booleano')
];

const validateManualScan = [
  body('scanType').optional().isIn(['quick', 'full', 'smart']).withMessage('Tipo de escaneo no válido')
];

const validateToggleAutoScan = [
  body('enabled').isBoolean().withMessage('enabled debe ser un booleano')
];

const validateCookieCleanup = [
  body('cookieCleanupEnabled').optional().isBoolean().withMessage('cookieCleanupEnabled debe ser un booleano'),
  body('cookieCleanupAction').optional().isIn(['mark_inactive', 'delete', 'ignore']).withMessage('cookieCleanupAction debe ser mark_inactive, delete o ignore')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100')
];

// Aplicar autenticación a todas las rutas
router.use(protect);

// GET /api/v1/automatic-scan/active - Obtener escaneos activos
router.get('/active', automaticScanController.getActiveScans);

// GET /api/v1/automatic-scan/domain/:domainId - Obtener configuración de escaneo
router.get('/domain/:domainId', 
  validateDomainId,
  validateRequest,
  automaticScanController.getScanConfig
);

// PUT /api/v1/automatic-scan/domain/:domainId/configure - Configurar escaneo automático
router.put('/domain/:domainId/configure',
  validateDomainId,
  validateScanConfig,
  validateRequest,
  automaticScanController.configureScan
);

// POST /api/v1/automatic-scan/domain/:domainId/scan - Ejecutar escaneo manual
router.post('/domain/:domainId/scan',
  validateDomainId,
  validateManualScan,
  validateRequest,
  automaticScanController.runManualScan
);

// GET /api/v1/automatic-scan/domain/:domainId/history - Obtener historial de escaneos
router.get('/domain/:domainId/history',
  validateDomainId,
  validatePagination,
  validateRequest,
  automaticScanController.getScanHistory
);

// PATCH /api/v1/automatic-scan/domain/:domainId/toggle - Habilitar/deshabilitar escaneo automático
router.patch('/domain/:domainId/toggle',
  validateDomainId,
  validateToggleAutoScan,
  validateRequest,
  automaticScanController.toggleAutoScan
);

// POST /api/v1/automatic-scan/embed/process - Procesar datos de embed detection (integración con embed detector)
router.post('/embed/process',
  // Validaciones específicas para embed detection
  body('domainId').isMongoId().withMessage('ID de dominio inválido'),
  body('clientId').isMongoId().withMessage('ID de cliente inválido'),
  body('type').isString().withMessage('Tipo de reporte requerido'),
  validateRequest,
  automaticScanController.processEmbedDetection
);

// PUT /api/v1/automatic-scan/domain/:domainId/cookie-cleanup - Configurar limpieza de cookies
router.put('/domain/:domainId/cookie-cleanup',
  validateDomainId,
  validateCookieCleanup,
  validateRequest,
  automaticScanController.configureCookieCleanup
);

module.exports = router;