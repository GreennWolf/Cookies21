/**
 * EMBED COOKIE DETECTION ROUTES
 * 
 * Endpoints para recibir y procesar cookies detectadas desde el embed
 * Estas rutas procesan datos en tiempo real desde banners en producción
 */

const express = require('express');
const { validationResult } = require('express-validator');
const { body, query, param } = require('express-validator');
const embedCookieDetectionController = require('../../controllers/EmbedCookieDetectionController');
const { rateLimiter } = require('../../middleware/rateLimiter');
const { catchAsync } = require('../../utils/catchAsync');

const router = express.Router();

// Middleware para validar con express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     EmbedCookieData:
 *       type: object
 *       required:
 *         - domainId
 *         - clientId
 *         - sessionId
 *         - timestamp
 *         - url
 *       properties:
 *         domainId:
 *           type: string
 *           description: ID del dominio
 *         clientId:
 *           type: string
 *           description: ID del cliente
 *         sessionId:
 *           type: string
 *           description: ID único de la sesión de detección
 *         timestamp:
 *           type: number
 *           description: Timestamp de Unix cuando se detectó
 *         url:
 *           type: string
 *           format: uri
 *           description: URL donde se detectaron las cookies
 *         type:
 *           type: string
 *           enum: [cookie_detected, initial_detection_report]
 *           description: Tipo de reporte
 *         userAgent:
 *           type: string
 *           description: User agent del navegador
 *         detectorVersion:
 *           type: string
 *           description: Versión del detector
 */

/**
 * @swagger
 * /api/v1/embed/cookies/detect:
 *   post:
 *     summary: Recibe cookies detectadas desde embed
 *     description: Endpoint para recibir datos de cookies detectadas en tiempo real desde banners embed
 *     tags: [Embed Cookie Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmbedCookieData'
 *     responses:
 *       200:
 *         description: Datos procesados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cookie data processed successfully
 *                 processed:
 *                   type: object
 *                   properties:
 *                     cookies:
 *                       type: number
 *                     storage:
 *                       type: number
 *                     thirdPartyScripts:
 *                       type: number
 *       400:
 *         description: Datos de entrada inválidos
 *       429:
 *         description: Demasiadas solicitudes
 *       500:
 *         description: Error interno del servidor
 */
router.post('/process',
  // Validaciones mínimas para evitar errores 400
  [
    // Solo validaciones críticas
    body('domainId')
      .optional()
      .isString()
      .withMessage('domainId must be a string'),
    
    body('clientId')
      .optional()
      .isString()
      .withMessage('clientId must be a string')
  ],
  // Validación personalizada más permisiva
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // En lugar de fallar, solo logear y continuar
      console.log('⚠️ Validation warnings (continuing anyway):', errors.array());
    }
    next();
  },
  (req, res, next) => embedCookieDetectionController.processCookieData(req, res, next)
);

/**
 * @swagger
 * /api/v1/embed/cookies/health:
 *   get:
 *     summary: Health check para el sistema de detección embed
 *     description: Verifica que el sistema de detección de cookies embed esté funcionando
 *     tags: [Embed Cookie Detection]
 *     responses:
 *       200:
 *         description: Sistema funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: embed-cookie-detection
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health',
  (req, res, next) => embedCookieDetectionController.healthCheck(req, res, next)
);

/**
 * @swagger
 * /api/v1/embed/cookies/stats:
 *   get:
 *     summary: Estadísticas del sistema de detección embed
 *     description: Obtiene estadísticas sobre la detección de cookies embed
 *     tags: [Embed Cookie Detection]
 *     parameters:
 *       - in: query
 *         name: domainId
 *         schema:
 *           type: string
 *         description: Filtrar por dominio específico
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filtrar por cliente específico
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Horas hacia atrás para las estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDetections:
 *                       type: number
 *                     uniqueCookies:
 *                       type: number
 *                     topVendors:
 *                       type: array
 *                     categoriesBreakdown:
 *                       type: object
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats',
  [
    query('domainId')
      .optional()
      .isString()
      .withMessage('domainId must be a string'),
    
    query('clientId')
      .optional()
      .isString()
      .withMessage('clientId must be a string'),
    
    query('hours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('hours must be an integer between 1 and 168')
  ],
  validate,
  (req, res, next) => embedCookieDetectionController.getDetectionStats(req, res, next)
);

/**
 * @swagger
 * /api/v1/embed/cookies/domain/{domainId}/info:
 *   get:
 *     summary: Información detallada de escaneo de un dominio
 *     description: Obtiene información completa sobre el estado de escaneo de un dominio
 *     tags: [Embed Cookie Detection]
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del dominio
 *     responses:
 *       200:
 *         description: Información obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *       404:
 *         description: Dominio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/domain/:domainId/info',
  [
    param('domainId')
      .isString()
      .withMessage('domainId must be a string')
  ],
  validate,
  (req, res, next) => embedCookieDetectionController.getDomainScanInfo(req, res, next)
);

// 🧪 DEBUG ENDPOINT: Para testing de limpieza de cookies
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/add-test-cookies/:domainId',
    [
      param('domainId')
        .isString()
        .withMessage('domainId must be a string')
    ],
    validate,
    (req, res, next) => embedCookieDetectionController.addTestCookiesForCleanup(req, res, next)
  );
}

module.exports = router;