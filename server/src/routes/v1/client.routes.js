// routes/v1/client.routes.js
const express = require('express');
const router = express.Router();
const ClientController = require('../../controllers/ClientController');
const { protect, restrictTo } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { clientValidation } = require('../../validations/client.validation');
const { bannerImageUpload } = require('../../utils/multerConfig');

// Middleware para procesar FormData antes de la validación
const processFormData = (req, res, next) => {
  // Solo procesar si es multipart
  const isMultipart = req.headers['content-type'] && 
                      req.headers['content-type'].startsWith('multipart/form-data');
  
  if (isMultipart) {
    console.log('🔧 MIDDLEWARE - Procesando FormData antes de validación');
    console.log('🔍 MIDDLEWARE - Datos crudos recibidos:', Object.keys(req.body));
    console.log('🔍 MIDDLEWARE - Archivos recibidos:', req.files ? req.files.length : 0);
    
    try {
      // Crear objeto con datos parseados
      const processedData = {};
      
      // Copiar campos simples
      processedData.name = req.body.name;
      processedData.contactEmail = req.body.contactEmail;
      processedData.sendScriptByEmail = req.body.sendScriptByEmail === 'true';
      processedData.configureBanner = req.body.configureBanner === 'true';
      processedData.domainForScript = req.body.domainForScript || '';
      
      // Parsear campos JSON
      if (req.body.subscription && req.body.subscription !== 'undefined') {
        try {
          processedData.subscription = JSON.parse(req.body.subscription);
        } catch (e) {
          processedData.subscription = {};
        }
      } else {
        processedData.subscription = {};
      }
      
      if (req.body.domains && req.body.domains !== 'undefined') {
        try {
          processedData.domains = JSON.parse(req.body.domains);
        } catch (e) {
          processedData.domains = [];
        }
      } else {
        processedData.domains = [];
      }
      
      if (req.body.adminUser && req.body.adminUser !== 'undefined') {
        try {
          processedData.adminUser = JSON.parse(req.body.adminUser);
        } catch (e) {
          processedData.adminUser = {};
        }
      } else {
        processedData.adminUser = {};
      }
      
      if (req.body.fiscalInfo && req.body.fiscalInfo !== 'undefined') {
        try {
          processedData.fiscalInfo = JSON.parse(req.body.fiscalInfo);
        } catch (e) {
          processedData.fiscalInfo = {};
        }
      } else {
        processedData.fiscalInfo = {};
      }
      
      if (req.body.bannerConfig && req.body.bannerConfig !== 'undefined') {
        try {
          processedData.bannerConfig = JSON.parse(req.body.bannerConfig);
        } catch (e) {
          processedData.bannerConfig = null;
        }
      } else {
        processedData.bannerConfig = null;
      }
      
      // Reemplazar req.body con datos procesados
      req.body = processedData;
      
      console.log('✅ MIDDLEWARE - FormData procesado para validación');
      console.log('🔍 MIDDLEWARE - Datos procesados:', {
        name: processedData.name,
        hasSubscription: !!processedData.subscription,
        hasAdminUser: !!processedData.adminUser,
        hasDomains: Array.isArray(processedData.domains),
        domainsCount: processedData.domains?.length || 0,
        configureBanner: processedData.configureBanner,
        hasBannerConfig: !!processedData.bannerConfig
      });
    } catch (error) {
      console.error('❌ Error procesando FormData:', error);
      return res.status(400).json({
        status: 'error',
        message: 'Error al procesar los datos del formulario'
      });
    }
  }
  
  next();
};

// Middleware personalizado para verificar acceso a cliente específico
const allowOwnClientAccess = (req, res, next) => {
  const { clientId } = req.params;
  const user = req.user;
  
  // Los owners siempre pueden acceder
  if (user.role === 'owner') {
    return next();
  }
  
  // Los usuarios no-owner solo pueden acceder a su propio cliente
  if (user.clientId && user.clientId.toString() === clientId) {
    return next();
  }
  
  // Si no es owner y no es su propio cliente, denegar acceso
  return res.status(403).json({
    status: 'error',
    message: 'No tienes permiso para acceder a este cliente'
  });
};

// Proteger todas las rutas para que solo usuarios autenticados puedan acceder
router.use(protect);

// Crear un nuevo cliente (solo owners)
router.post(
  '/',
  restrictTo('owner'),
  bannerImageUpload, // Procesar imágenes si se incluyen
  processFormData, // Procesar FormData antes de validación
  validateRequest(clientValidation.createClient),
  ClientController.createClient
);

// Obtener todos los clientes (solo owners)
router.get(
  '/',
  restrictTo('owner'),
  ClientController.getClients
);

// Obtener un cliente específico (owners o el propio cliente)
router.get(
  '/:clientId',
  allowOwnClientAccess,
  ClientController.getClient
);

// Actualizar un cliente (solo owners)
router.patch(
  '/:clientId',
  restrictTo('owner'),
  validateRequest(clientValidation.updateClient),
  ClientController.updateClient
);

// Actualizar suscripción de un cliente (solo owners)
router.patch(
  '/:clientId/subscription',
  restrictTo('owner'),
  validateRequest(clientValidation.updateSubscription),
  ClientController.updateClientSubscription
);

// Cambiar estado de un cliente (solo owners)
router.patch(
  '/:clientId/status',
  restrictTo('owner'),
  validateRequest(clientValidation.toggleStatus),
  ClientController.toggleClientStatus
);

// Obtener métricas de un cliente (owners o el propio cliente)
router.get(
  '/:clientId/metrics',
  allowOwnClientAccess,
  ClientController.getClientMetrics
);

// Cancelar suscripción de un cliente (solo owners)
router.post(
  '/:clientId/cancel-subscription',
  restrictTo('owner'),
  validateRequest(clientValidation.cancelSubscription),
  ClientController.cancelSubscription
);

// Reactivar suscripción de un cliente (solo owners)
router.post(
  '/:clientId/reactivate-subscription',
  restrictTo('owner'),
  validateRequest(clientValidation.reactivateSubscription),
  ClientController.reactivateSubscription
);

module.exports = router;