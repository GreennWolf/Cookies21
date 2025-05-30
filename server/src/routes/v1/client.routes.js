// routes/v1/client.routes.js
const express = require('express');
const router = express.Router();
const ClientController = require('../../controllers/ClientController');
const { protect, restrictTo } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { clientValidation } = require('../../validations/client.validation');

// Proteger todas las rutas para que solo usuarios autenticados puedan acceder
router.use(protect);

// Solo usuarios owner pueden acceder a las rutas de clientes
router.use(restrictTo('owner'));

// Crear un nuevo cliente
router.post(
  '/',
  validateRequest(clientValidation.createClient),
  ClientController.createClient
);

// Obtener todos los clientes (con filtros opcionales)
router.get(
  '/',
  ClientController.getClients
);

// Obtener un cliente específico
router.get(
  '/:clientId',
  ClientController.getClient
);

// Actualizar un cliente
router.patch(
  '/:clientId',
  validateRequest(clientValidation.updateClient),
  ClientController.updateClient
);

// Actualizar suscripción de un cliente
router.patch(
  '/:clientId/subscription',
  validateRequest(clientValidation.updateSubscription),
  ClientController.updateClientSubscription
);

// Cambiar estado de un cliente (activar/inactivar/suspender)
router.patch(
  '/:clientId/status',
  validateRequest(clientValidation.toggleStatus),
  ClientController.toggleClientStatus
);

// Obtener métricas de un cliente
router.get(
  '/:clientId/metrics',
  ClientController.getClientMetrics
);

module.exports = router;