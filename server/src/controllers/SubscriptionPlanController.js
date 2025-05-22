// controllers/SubscriptionPlanController.js
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const logger = require('../utils/logger');

class SubscriptionPlanController {
  // Obtener todos los planes (solo para owners)
  getPlans = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para acceder a los planes de suscripción', 403));
    }
    
    const { status, search } = req.query;
    
    // Construir filtros de búsqueda
    const filters = {};
    if (status) filters.status = status;
    
    // Búsqueda por nombre o descripción
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Obtener planes
    const plans = await SubscriptionPlan.find(filters)
      .sort({ 'metadata.displayOrder': 1, name: 1 });
    
    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: {
        plans
      }
    });
  });
  
  // Obtener un plan específico
  getPlan = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para acceder a los planes de suscripción', 403));
    }
    
    const { id } = req.params;
    
    const plan = await SubscriptionPlan.findById(id);
    
    if (!plan) {
      return next(new AppError('Plan no encontrado', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  });
  
  // Crear un nuevo plan (solo owners)
  createPlan = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para crear planes de suscripción', 403));
    }
    
    const {
      name,
      description,
      limits,
      features,
      pricing,
      metadata
    } = req.body;
    
    // Verificar si ya existe un plan con ese nombre
    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return next(new AppError('Ya existe un plan con ese nombre', 409));
    }
    
    // Crear plan
    const plan = await SubscriptionPlan.create({
      name,
      description,
      limits: {
        maxUsers: limits?.maxUsers || 5,
        isUnlimitedUsers: limits?.isUnlimitedUsers || false,
        maxDomains: limits?.maxDomains || 1,
        isUnlimitedDomains: limits?.isUnlimitedDomains || false
      },
      features: {
        autoTranslate: features?.autoTranslate || false,
        cookieScanning: features?.cookieScanning || true,
        customization: features?.customization || false,
        advancedAnalytics: features?.advancedAnalytics || false,
        multiLanguage: features?.multiLanguage || false,
        apiAccess: features?.apiAccess || false,
        prioritySupport: features?.prioritySupport || false
      },
      pricing: {
        enabled: pricing?.enabled !== undefined ? pricing.enabled : true,
        currency: pricing?.currency || 'USD',
        amount: pricing?.amount || 0,
        interval: pricing?.interval || 'monthly',
        customDays: pricing?.customDays
      },
      metadata: {
        color: metadata?.color || '#3498db',
        icon: metadata?.icon,
        displayOrder: metadata?.displayOrder || 99,
        isRecommended: metadata?.isRecommended || false,
        tags: metadata?.tags || []
      }
    });
    
    logger.info(`Plan de suscripción creado: ${plan.name} (${plan._id})`);
    
    res.status(201).json({
      status: 'success',
      data: {
        plan
      }
    });
  });
  
  // Actualizar un plan existente
  updatePlan = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para modificar planes de suscripción', 403));
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar si el plan existe
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return next(new AppError('Plan no encontrado', 404));
    }
    
    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (updates.name && updates.name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({ 
        name: updates.name,
        _id: { $ne: id }
      });
      
      if (existingPlan) {
        return next(new AppError('Ya existe otro plan con ese nombre', 409));
      }
    }
    
    // Aplicar actualizaciones
    if (updates.name) plan.name = updates.name;
    if (updates.description) plan.description = updates.description;
    if (updates.status) plan.status = updates.status;
    
    // Actualizar límites
    if (updates.limits) {
      if (updates.limits.maxUsers !== undefined) plan.limits.maxUsers = updates.limits.maxUsers;
      if (updates.limits.isUnlimitedUsers !== undefined) plan.limits.isUnlimitedUsers = updates.limits.isUnlimitedUsers;
      if (updates.limits.maxDomains !== undefined) plan.limits.maxDomains = updates.limits.maxDomains;
      if (updates.limits.isUnlimitedDomains !== undefined) plan.limits.isUnlimitedDomains = updates.limits.isUnlimitedDomains;
    }
    
    // Actualizar características
    if (updates.features) {
      const featureKeys = Object.keys(updates.features);
      featureKeys.forEach(key => {
        if (plan.features[key] !== undefined) {
          plan.features[key] = updates.features[key];
        }
      });
    }
    
    // Actualizar precios
    if (updates.pricing) {
      if (updates.pricing.enabled !== undefined) plan.pricing.enabled = updates.pricing.enabled;
      if (updates.pricing.currency) plan.pricing.currency = updates.pricing.currency;
      if (updates.pricing.amount !== undefined) plan.pricing.amount = updates.pricing.amount;
      if (updates.pricing.interval) plan.pricing.interval = updates.pricing.interval;
      if (updates.pricing.customDays !== undefined) plan.pricing.customDays = updates.pricing.customDays;
    }
    
    // Actualizar metadatos
    if (updates.metadata) {
      if (updates.metadata.color) plan.metadata.color = updates.metadata.color;
      if (updates.metadata.icon !== undefined) plan.metadata.icon = updates.metadata.icon;
      if (updates.metadata.displayOrder !== undefined) plan.metadata.displayOrder = updates.metadata.displayOrder;
      if (updates.metadata.isRecommended !== undefined) plan.metadata.isRecommended = updates.metadata.isRecommended;
      if (updates.metadata.tags) plan.metadata.tags = updates.metadata.tags;
    }
    
    // Guardar cambios
    await plan.save();
    
    logger.info(`Plan de suscripción actualizado: ${plan.name} (${plan._id})`);
    
    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  });
  
  // Clonar un plan existente
  clonePlan = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para clonar planes de suscripción', 403));
    }
    
    const { id } = req.params;
    const { newName } = req.body;
    
    // Verificar que se proporcione un nuevo nombre
    if (!newName) {
      return next(new AppError('Se requiere un nombre para el nuevo plan', 400));
    }
    
    // Verificar si el plan a clonar existe
    const sourcePlan = await SubscriptionPlan.findById(id);
    if (!sourcePlan) {
      return next(new AppError('Plan origen no encontrado', 404));
    }
    
    // Verificar que no exista un plan con el nuevo nombre
    const existingPlan = await SubscriptionPlan.findOne({ name: newName });
    if (existingPlan) {
      return next(new AppError('Ya existe un plan con ese nombre', 409));
    }
    
    // Clonar el plan
    const newPlan = await sourcePlan.clone(newName);
    
    logger.info(`Plan de suscripción clonado: ${sourcePlan.name} -> ${newPlan.name}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        plan: newPlan
      }
    });
  });
  
  // Cambiar estado de un plan
  togglePlanStatus = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para modificar planes de suscripción', 403));
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    // Validar el estado
    if (!['active', 'inactive', 'archived'].includes(status)) {
      return next(new AppError('Estado no válido', 400));
    }
    
    // Buscar y actualizar el plan
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return next(new AppError('Plan no encontrado', 404));
    }
    
    logger.info(`Estado del plan ${plan.name} (${plan._id}) cambiado a: ${status}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  });
  
  // Asignar plan a un cliente
  assignPlanToClient = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para asignar planes', 403));
    }
    
    const { planId, clientId } = req.params;
    const { 
      startDate,
      endDate,
      isUnlimited = false,
      customMaxUsers
    } = req.body;
    
    // Verificar que exista el plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return next(new AppError('Plan no encontrado', 404));
    }
    
    // Verificar que el plan esté activo
    if (plan.status !== 'active') {
      return next(new AppError('No se puede asignar un plan inactivo', 400));
    }
    
    // Verificar que exista el cliente
    const client = await Client.findById(clientId);
    if (!client) {
      return next(new AppError('Cliente no encontrado', 404));
    }
    
    // Preparar información de suscripción
    const subscriptionData = {
      plan: plan.name,
      startDate: startDate ? new Date(startDate) : new Date(),
      maxUsers: customMaxUsers || plan.limits.maxUsers,
      isUnlimited: isUnlimited || plan.limits.isUnlimitedUsers,
      features: {
        autoTranslate: plan.features.autoTranslate,
        cookieScanning: plan.features.cookieScanning,
        customization: plan.features.customization
      }
    };
    
    // Configurar fecha de finalización
    if (subscriptionData.isUnlimited) {
      // Para suscripciones ilimitadas, usar fecha lejana
      subscriptionData.endDate = new Date(2099, 11, 31);
    } else if (endDate) {
      // Si se proporciona fecha de fin específica
      subscriptionData.endDate = new Date(endDate);
    } else {
      // Calcular basado en el intervalo del plan
      const today = new Date();
      const endDateCalc = new Date(today);
      
      switch (plan.pricing.interval) {
        case 'monthly':
          endDateCalc.setMonth(today.getMonth() + 1);
          break;
        case 'quarterly':
          endDateCalc.setMonth(today.getMonth() + 3);
          break;
        case 'annually':
          endDateCalc.setFullYear(today.getFullYear() + 1);
          break;
        case 'custom':
          if (plan.pricing.customDays) {
            endDateCalc.setDate(today.getDate() + plan.pricing.customDays);
          } else {
            endDateCalc.setMonth(today.getMonth() + 1); // Default a un mes
          }
          break;
        default:
          endDateCalc.setMonth(today.getMonth() + 1); // Default a un mes
      }
      
      subscriptionData.endDate = endDateCalc;
    }
    
    // Actualizar suscripción del cliente
    client.subscription = subscriptionData;
    await client.save();
    
    logger.info(`Plan "${plan.name}" asignado al cliente "${client.name}" (${client._id})`);
    
    res.status(200).json({
      status: 'success',
      data: {
        client: {
          id: client._id,
          name: client.name,
          subscription: client.subscription
        }
      }
    });
  });
  
  // Inicializar planes predeterminados
  initDefaultPlans = catchAsync(async (req, res, next) => {
    // Verificar que el usuario sea owner
    if (req.user.role !== 'owner') {
      return next(new AppError('No tiene permisos para inicializar planes', 403));
    }
    
    // Crear planes predeterminados
    await SubscriptionPlan.createDefaultPlans();
    
    // Obtener los planes creados
    const plans = await SubscriptionPlan.find().sort({ 'metadata.displayOrder': 1 });
    
    res.status(200).json({
      status: 'success',
      message: 'Planes predeterminados inicializados correctamente',
      data: {
        plans
      }
    });
  });
}

module.exports = new SubscriptionPlanController();