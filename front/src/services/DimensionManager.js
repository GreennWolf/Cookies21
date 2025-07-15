/**
 * @fileoverview Manager central para el sistema de dimensiones del Banner Editor
 * @module DimensionManager
 * @author Banner Editor Team
 * @version 1.0.0
 */

import { ReferenceResolver } from './ReferenceResolver.js';
import { UnitConverter } from './UnitConverter.js';
import { DimensionValidator } from './DimensionValidator.js';

/**
 * Clase central que coordina todas las operaciones de dimensiones
 * Actúa como punto único de acceso para conversiones, validaciones y eventos
 * 
 * @class DimensionManager
 */
export class DimensionManager {
  /**
   * Constructor de DimensionManager
   * Instancia todas las dependencias necesarias
   */
  constructor() {
    // Instanciar dependencias
    this.referenceResolver = new ReferenceResolver();
    this.unitConverter = new UnitConverter(this.referenceResolver);
    this.validator = new DimensionValidator();
    
    // Sistema de eventos y suscripciones
    this.subscribers = new Set();
    this.componentSubscribers = new Map(); // Suscriptores específicos por componente
    this.eventTypeSubscribers = new Map(); // Suscriptores específicos por tipo de evento
    this.dimensionCache = new Map(); // Caché de dimensiones por componente/dispositivo
    
    // Configuración del manager
    this.config = {
      debug: process.env.NODE_ENV === 'development',
      enableValidation: false, // Desactivado temporalmente para permitir cualquier valor
      enableLogging: true
    };
    
    // Estadísticas para debugging
    this.stats = {
      conversions: 0,
      validations: 0,
      events: 0,
      subscribers: 0
    };
    
    console.log('DimensionManager: Inicializado correctamente', {
      config: this.config,
      dependencies: {
        referenceResolver: !!this.referenceResolver,
        unitConverter: !!this.unitConverter,
        validator: !!this.validator
      }
    });
  }

  /**
   * Sistema básico de eventos - suscribirse a cambios
   * 
   * @param {Function} callback - Función a llamar cuando ocurra un evento
   * @returns {Function} Función de cleanup para desuscribirse
   */
  subscribe(callback) {
    // Validar callback
    if (typeof callback !== 'function') {
      console.error('DimensionManager: callback debe ser una función');
      return () => {};
    }

    // Agregar callback al Set de suscriptores
    this.subscribers.add(callback);
    this.stats.subscribers = this.subscribers.size;
    
    if (this.config.debug) {
      console.log(`DimensionManager: Nuevo suscriptor agregado (total: ${this.subscribers.size})`);
    }

    // Retornar función de cleanup
    return () => {
      this.subscribers.delete(callback);
      this.stats.subscribers = this.subscribers.size;
      
      if (this.config.debug) {
        console.log(`DimensionManager: Suscriptor removido (total: ${this.subscribers.size})`);
      }
    };
  }

  /**
   * Notificar a todos los suscriptores sobre un evento
   * 
   * @param {Object} eventData - Datos del evento
   */
  notifySubscribers(eventData) {
    // Validar eventData
    if (!eventData || typeof eventData !== 'object') {
      console.error('DimensionManager: eventData debe ser un objeto válido');
      return;
    }

    // Estructurar evento completo
    const event = {
      ...eventData,
      timestamp: Date.now(),
      managerId: this.constructor.name
    };

    // Incrementar contador de eventos
    this.stats.events++;

    if (this.config.debug) {
      console.log('DimensionManager: Notificando evento:', event);
    }

    // Notificar a todos los suscriptores
    let successfulNotifications = 0;
    let failedNotifications = 0;

    // Notificar suscriptores globales
    this.subscribers.forEach(callback => {
      try {
        callback(event);
        successfulNotifications++;
      } catch (error) {
        failedNotifications++;
        console.error('DimensionManager: Error en callback de suscriptor global:', error, {
          event,
          callback: callback.name || 'función anónima'
        });
      }
    });

    // Notificar suscriptores específicos por componente
    if (event.componentId && this.componentSubscribers.has(event.componentId)) {
      this.componentSubscribers.get(event.componentId).forEach(callback => {
        try {
          callback(event);
          successfulNotifications++;
        } catch (error) {
          failedNotifications++;
          console.error('DimensionManager: Error en callback de suscriptor de componente:', error, {
            componentId: event.componentId,
            event,
            callback: callback.name || 'función anónima'
          });
        }
      });
    }

    // Notificar suscriptores específicos por tipo de evento
    if (event.type && this.eventTypeSubscribers.has(event.type)) {
      this.eventTypeSubscribers.get(event.type).forEach(callback => {
        try {
          callback(event);
          successfulNotifications++;
        } catch (error) {
          failedNotifications++;
          console.error('DimensionManager: Error en callback de suscriptor de evento:', error, {
            eventType: event.type,
            event,
            callback: callback.name || 'función anónima'
          });
        }
      });
    }

    if (this.config.debug && (successfulNotifications > 0 || failedNotifications > 0)) {
      console.log(`DimensionManager: Evento notificado - Exitosos: ${successfulNotifications}, Fallidos: ${failedNotifications}`);
    }
  }

  /**
   * Emite un evento específico de cambio de dimensión
   * 
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad que cambió
   * @param {string} value - Nuevo valor
   * @param {string} device - Dispositivo
   * @param {string} source - Fuente del cambio
   */
  emitDimensionChanged(componentId, property, value, device, source) {
    // Actualizar caché de dimensiones
    const cacheKey = `${componentId}_${device}`;
    const currentDimensions = this.dimensionCache.get(cacheKey) || {};
    const updatedDimensions = {
      ...currentDimensions,
      [property]: value
    };
    this.dimensionCache.set(cacheKey, updatedDimensions);

    this.notifySubscribers({
      type: 'dimension-changed',
      componentId,
      property,
      value,
      device,
      source,
      // Metadatos adicionales
      previousValue: currentDimensions[property] || null,
      timestamp: Date.now()
    });
  }

  /**
   * Emite un evento cuando una dimensión es actualizada desde el estado global
   * 
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad actualizada
   * @param {string} value - Nuevo valor
   * @param {string} device - Dispositivo
   */
  emitDimensionUpdatedFromState(componentId, property, value, device) {
    this.notifySubscribers({
      type: 'dimension-updated-from-state',
      componentId,
      property,
      value,
      device,
      source: 'state-update'
    });
  }

  /**
   * Emite un evento cuando se detecta un error en el sistema de dimensiones
   * 
   * @param {string} operation - Operación que falló
   * @param {Error} error - Error capturado
   * @param {Object} context - Contexto adicional del error
   */
  emitDimensionError(operation, error, context = {}) {
    this.notifySubscribers({
      type: 'dimension-error',
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: 'error'
    });
  }

  /**
   * Suscribirse a cambios de un componente específico
   * 
   * @param {string} componentId - ID del componente a observar
   * @param {Function} callback - Función a llamar cuando el componente cambie
   * @returns {Function} Función de cleanup
   */
  subscribeToComponent(componentId, callback) {
    if (!componentId || typeof callback !== 'function') {
      console.error('DimensionManager: componentId y callback son requeridos');
      return () => {};
    }

    // Agregar a suscriptores de componente específico
    if (!this.componentSubscribers.has(componentId)) {
      this.componentSubscribers.set(componentId, new Set());
    }
    this.componentSubscribers.get(componentId).add(callback);

    if (this.config.debug) {
      console.log(`DimensionManager: Suscriptor agregado para componente ${componentId}`);
    }

    // Retornar función de cleanup
    return () => {
      const componentSubs = this.componentSubscribers.get(componentId);
      if (componentSubs) {
        componentSubs.delete(callback);
        if (componentSubs.size === 0) {
          this.componentSubscribers.delete(componentId);
        }
      }
    };
  }

  /**
   * Suscribirse a un tipo específico de evento
   * 
   * @param {string} eventType - Tipo de evento ('dimension-changed', 'dimension-validated', etc.)
   * @param {Function} callback - Función a llamar cuando ocurra el evento
   * @returns {Function} Función de cleanup
   */
  subscribeToEvent(eventType, callback) {
    if (!eventType || typeof callback !== 'function') {
      console.error('DimensionManager: eventType y callback son requeridos');
      return () => {};
    }

    // Agregar a suscriptores de tipo de evento específico
    if (!this.eventTypeSubscribers.has(eventType)) {
      this.eventTypeSubscribers.set(eventType, new Set());
    }
    this.eventTypeSubscribers.get(eventType).add(callback);

    if (this.config.debug) {
      console.log(`DimensionManager: Suscriptor agregado para evento ${eventType}`);
    }

    // Retornar función de cleanup
    return () => {
      const eventSubs = this.eventTypeSubscribers.get(eventType);
      if (eventSubs) {
        eventSubs.delete(callback);
        if (eventSubs.size === 0) {
          this.eventTypeSubscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Emite un evento de validación de dimensión
   * 
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad validada
   * @param {string} originalValue - Valor original
   * @param {string} validatedValue - Valor después de validación
   * @param {Object} rules - Reglas aplicadas
   */
  emitDimensionValidated(componentId, property, originalValue, validatedValue, rules) {
    this.notifySubscribers({
      type: 'dimension-validated',
      componentId,
      property,
      originalValue,
      validatedValue,
      wasAdjusted: originalValue !== validatedValue,
      rules
    });
  }

  /**
   * Parsea y normaliza un valor de dimensión
   * 
   * @param {string|number} value - Valor a parsear
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad de dimensión
   * @returns {Object} Objeto normalizado con value, unit, reference
   */
  parseAndNormalize(value, componentId, property) {
    try {
      // Validar parámetros
      if (!componentId || !property) {
        console.warn('DimensionManager: componentId y property son requeridos para parseAndNormalize');
        return null;
      }

      // Parsear valor usando UnitConverter
      const parsed = this.unitConverter.parseValue(value);
      
      if (this.config.debug) {
        console.log(`DimensionManager: Parseando ${value} → ${parsed.value}${parsed.unit}`);
      }

      // Obtener referencia usando ReferenceResolver
      const reference = this.referenceResolver.getReference(componentId, property);
      
      if (!reference) {
        console.warn(`DimensionManager: No se pudo obtener referencia para ${componentId}.${property}`);
        // Retornar objeto básico sin referencia
        return {
          value: parsed.value,
          unit: parsed.unit,
          reference: null,
          equivalents: null,
          isValid: false
        };
      }

      // Calcular valores equivalentes en ambas unidades
      const equivalents = {};
      
      if (reference.size > 0) {
        // Calcular equivalente en píxeles
        if (parsed.unit === '%') {
          equivalents.px = this.unitConverter.convertPercentToPx(parsed.value, reference.size);
        } else {
          equivalents.px = parsed.value;
        }
        
        // Calcular equivalente en porcentaje
        if (parsed.unit === 'px') {
          equivalents['%'] = this.unitConverter.convertPxToPercent(parsed.value, reference.size);
        } else {
          equivalents['%'] = parsed.value;
        }
      }

      const normalized = {
        value: parsed.value,
        unit: parsed.unit,
        reference: reference,
        equivalents: equivalents,
        isValid: reference && reference.isValid,
        componentId,
        property
      };

      if (this.config.debug) {
        console.log('DimensionManager: Valor normalizado:', normalized);
      }

      return normalized;

    } catch (error) {
      console.error('DimensionManager: Error en parseAndNormalize:', error, {
        value, componentId, property
      });
      return null;
    }
  }

  /**
   * Convierte un valor entre unidades diferentes
   * 
   * @param {string|number} value - Valor a convertir
   * @param {string} fromUnit - Unidad origen
   * @param {string} toUnit - Unidad destino
   * @param {string} componentId - ID del componente para referencia
   * @param {string} property - Propiedad para referencia
   * @returns {number} Valor convertido
   */
  convertToUnit(value, fromUnit, toUnit, componentId, property) {
    try {
      // Incrementar contador de conversiones
      this.stats.conversions++;

      // Validar parámetros
      if (!componentId || !property) {
        console.warn('DimensionManager: componentId y property son requeridos para convertToUnit');
        return parseFloat(value) || 0;
      }

      if (!fromUnit || !toUnit) {
        console.warn('DimensionManager: fromUnit y toUnit son requeridos');
        return parseFloat(value) || 0;
      }

      // Si las unidades son iguales, no hay conversión
      if (fromUnit === toUnit) {
        const parsed = this.unitConverter.parseValue(value);
        return parsed.value;
      }

      if (this.config.debug) {
        console.log(`DimensionManager: Convirtiendo ${value} de ${fromUnit} a ${toUnit} para ${componentId}.${property}`);
      }

      // Obtener referencia para la conversión
      const reference = this.referenceResolver.getReference(componentId, property);
      
      if (!reference) {
        console.error(`DimensionManager: No se pudo obtener referencia para conversión ${componentId}.${property}`);
        return parseFloat(value) || 0;
      }

      // Realizar conversión usando UnitConverter
      const convertedValue = this.unitConverter.convert(value, fromUnit, toUnit, reference);

      if (this.config.debug) {
        console.log(`DimensionManager: Conversión completada: ${value}${fromUnit} → ${convertedValue}${toUnit} (ref: ${reference.size}px)`);
      }

      // Emitir evento de conversión si está habilitado el logging
      if (this.config.enableLogging) {
        this.notifySubscribers({
          type: 'unit-converted',
          componentId,
          property,
          originalValue: value,
          originalUnit: fromUnit,
          convertedValue,
          convertedUnit: toUnit,
          reference: {
            size: reference.size,
            type: reference.type
          }
        });
      }

      return convertedValue;

    } catch (error) {
      console.error('DimensionManager: Error en convertToUnit:', error, {
        value, fromUnit, toUnit, componentId, property
      });
      
      // Retornar valor original como fallback
      return parseFloat(value) || 0;
    }
  }

  /**
   * Valida un valor de dimensión según las reglas
   * 
   * @param {string|number} value - Valor a validar
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad de dimensión
   * @returns {string} Valor validado en formato CSS
   */
  validateDimension(value, componentId, property) {
    try {
      // Incrementar contador de validaciones
      this.stats.validations++;

      // Si la validación está deshabilitada, retornar valor original
      if (!this.config.enableValidation) {
        const parsed = this.unitConverter.parseValue(value);
        return `${parsed.value}${parsed.unit}`;
      }

      // Validar parámetros
      if (!componentId || !property) {
        console.warn('DimensionManager: componentId y property son requeridos para validateDimension');
        const parsed = this.unitConverter.parseValue(value);
        return `${parsed.value}${parsed.unit}`;
      }

      // Parsear valor para obtener número y unidad
      const parsed = this.unitConverter.parseValue(value);
      const originalValue = `${parsed.value}${parsed.unit}`;

      if (this.config.debug) {
        console.log(`DimensionManager: Validando ${originalValue} para ${componentId}.${property}`);
      }

      // Obtener tipo de componente (necesitaremos integrarlo con el estado en fases futuras)
      // Por ahora usaremos 'default' como fallback
      const componentType = 'default'; // TODO: Obtener del estado global en fases futuras

      // Realizar validación usando DimensionValidator
      const validatedValue = this.validator.validate(
        parsed.value,
        parsed.unit,
        componentType,
        property
      );

      // Obtener reglas aplicadas para el evento
      const rules = this.validator.getRules(componentType, property);

      // Emitir evento de validación
      this.emitDimensionValidated(
        componentId,
        property,
        originalValue,
        validatedValue,
        rules
      );

      if (this.config.debug && originalValue !== validatedValue) {
        console.log(`DimensionManager: Valor ajustado: ${originalValue} → ${validatedValue}`);
      }

      return validatedValue;

    } catch (error) {
      console.error('DimensionManager: Error en validateDimension:', error, {
        value, componentId, property
      });
      
      // Retornar valor parseado como fallback
      const parsed = this.unitConverter.parseValue(value);
      return `${parsed.value}${parsed.unit}`;
    }
  }

  /**
   * Método principal para actualizar una dimensión
   * Combina parsing, validación y notificación de eventos
   * 
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad de dimensión
   * @param {string|number} value - Nuevo valor
   * @param {string} device - Dispositivo ('desktop', 'tablet', 'mobile')
   * @param {string} source - Fuente del cambio ('drag-resize', 'input-panel', etc.)
   * @returns {Object} Resultado de la actualización
   */
  updateDimension(componentId, property, value, device, source) {
    try {
      // Validar parámetros requeridos
      if (!componentId || !property || !device || !source) {
        throw new Error('Todos los parámetros son requeridos para updateDimension');
      }

      if (this.config.debug) {
        console.log(`DimensionManager: Actualizando ${componentId}.${property} = ${value} en ${device} desde ${source}`);
      }

      // 1. Parsear y normalizar el valor
      const normalized = this.parseAndNormalize(value, componentId, property);
      if (!normalized) {
        throw new Error('No se pudo parsear el valor de dimensión');
      }

      // 2. Validar el valor si está habilitado
      let finalValue = `${normalized.value}${normalized.unit}`;
      if (this.config.enableValidation) {
        finalValue = this.validateDimension(value, componentId, property);
      }

      // 3. Emitir evento de cambio de dimensión
      this.emitDimensionChanged(componentId, property, finalValue, device, source);

      // 4. Retornar resultado
      const result = {
        success: true,
        componentId,
        property,
        originalValue: value,
        finalValue,
        device,
        source,
        normalized,
        wasValidated: this.config.enableValidation,
        timestamp: Date.now()
      };

      if (this.config.debug) {
        console.log('DimensionManager: Actualización completada:', result);
      }

      return result;

    } catch (error) {
      console.error('DimensionManager: Error en updateDimension:', error, {
        componentId, property, value, device, source
      });

      // Emitir evento de error
      this.emitDimensionError('updateDimension', error, {
        componentId, property, value, device, source
      });

      // Retornar resultado de error
      return {
        success: false,
        error: error.message,
        componentId,
        property,
        originalValue: value,
        device,
        source,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Obtiene las dimensiones actuales de un componente para un dispositivo
   * 
   * @param {string} componentId - ID del componente
   * @param {string} device - Dispositivo ('desktop', 'tablet', 'mobile')
   * @returns {Object} Objeto con las dimensiones actuales
   */
  getDimensions(componentId, device) {
    if (!componentId || !device) {
      return {};
    }

    // Crear clave única para buscar dimensiones
    const cacheKey = `${componentId}_${device}`;
    
    // Retornar dimensiones almacenadas en caché si existen
    if (this.dimensionCache.has(cacheKey)) {
      return { ...this.dimensionCache.get(cacheKey) };
    }

    // Si no hay dimensiones en caché, retornar objeto vacío
    return {};
  }

  /**
   * Obtiene estadísticas del manager para debugging
   * 
   * @returns {Object} Objeto con estadísticas de uso
   */
  getStats() {
    return {
      ...this.stats,
      subscribers: {
        global: this.subscribers.size,
        byComponent: this.componentSubscribers.size,
        byEventType: this.eventTypeSubscribers.size,
        total: this.subscribers.size + 
               Array.from(this.componentSubscribers.values()).reduce((sum, set) => sum + set.size, 0) +
               Array.from(this.eventTypeSubscribers.values()).reduce((sum, set) => sum + set.size, 0)
      },
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Suscribirse a cambios de múltiples componentes
   * 
   * @param {string[]} componentIds - Array de IDs de componentes
   * @param {Function} callback - Función a llamar cuando cualquiera cambie
   * @returns {Function} Función de cleanup que desuscribe de todos
   */
  subscribeToComponents(componentIds, callback) {
    if (!Array.isArray(componentIds) || typeof callback !== 'function') {
      console.error('DimensionManager: componentIds debe ser array y callback función');
      return () => {};
    }

    const unsubscribers = componentIds.map(id => 
      this.subscribeToComponent(id, callback)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Suscribirse a múltiples tipos de eventos
   * 
   * @param {string[]} eventTypes - Array de tipos de eventos
   * @param {Function} callback - Función a llamar cuando cualquiera ocurra
   * @returns {Function} Función de cleanup
   */
  subscribeToEvents(eventTypes, callback) {
    if (!Array.isArray(eventTypes) || typeof callback !== 'function') {
      console.error('DimensionManager: eventTypes debe ser array y callback función');
      return () => {};
    }

    const unsubscribers = eventTypes.map(type => 
      this.subscribeToEvent(type, callback)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Obtiene lista de componentes con suscriptores activos
   * 
   * @returns {Array} Array de componentIds con suscriptores
   */
  getActiveComponentSubscriptions() {
    return Array.from(this.componentSubscribers.keys());
  }

  /**
   * Obtiene lista de tipos de eventos con suscriptores activos
   * 
   * @returns {Array} Array de eventTypes con suscriptores
   */
  getActiveEventSubscriptions() {
    return Array.from(this.eventTypeSubscribers.keys());
  }

  /**
   * Limpia todos los suscriptores (útil para cleanup)
   */
  clearAllSubscribers() {
    this.subscribers.clear();
    this.componentSubscribers.clear();
    this.eventTypeSubscribers.clear();
    
    if (this.config.debug) {
      console.log('DimensionManager: Todos los suscriptores limpiados');
    }
  }
}

/**
 * Instancia singleton del DimensionManager
 * @type {DimensionManager|null}
 */
let dimensionManagerInstance = null;

/**
 * Obtiene la instancia singleton del DimensionManager
 * Crea una nueva instancia si no existe
 * 
 * @param {Object} options - Opciones de configuración opcional
 * @returns {DimensionManager} Instancia del DimensionManager
 */
export function getDimensionManager(options = {}) {
  if (!dimensionManagerInstance) {
    dimensionManagerInstance = new DimensionManager();
    dimensionManagerInstance.startTime = Date.now();
    
    // Aplicar configuración opcional
    if (options.debug !== undefined) {
      dimensionManagerInstance.config.debug = options.debug;
    }
    if (options.enableValidation !== undefined) {
      dimensionManagerInstance.config.enableValidation = options.enableValidation;
    }
    if (options.enableLogging !== undefined) {
      dimensionManagerInstance.config.enableLogging = options.enableLogging;
    }
    
    if (dimensionManagerInstance.config.debug) {
      console.log('DimensionManager: Singleton creado con configuración:', dimensionManagerInstance.config);
    }
  }
  
  return dimensionManagerInstance;
}

/**
 * Resetea la instancia singleton (útil para testing)
 * 
 * @param {boolean} force - Forzar reset aunque haya suscriptores activos
 */
export function resetDimensionManager(force = false) {
  if (dimensionManagerInstance) {
    const subscriberCount = dimensionManagerInstance.subscribers.size;
    
    if (subscriberCount > 0 && !force) {
      console.warn(`DimensionManager: Intentando resetear instancia con ${subscriberCount} suscriptores activos. Use force=true para forzar.`);
      return false;
    }
    
    if (subscriberCount > 0) {
      console.warn(`DimensionManager: Forzando reset con ${subscriberCount} suscriptores activos`);
    }
    
    dimensionManagerInstance = null;
    return true;
  }
  
  return true;
}

/**
 * Verifica si existe una instancia del DimensionManager
 * 
 * @returns {boolean} True si existe una instancia
 */
export function hasDimensionManager() {
  return dimensionManagerInstance !== null;
}

// Export por defecto
export default DimensionManager;