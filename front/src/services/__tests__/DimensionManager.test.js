/**
 * @fileoverview Tests para DimensionManager
 */

import { DimensionManager, getDimensionManager, resetDimensionManager, hasDimensionManager } from '../DimensionManager.js';

// Mock del DOM para testing
const mockDOM = () => {
  const canvas = document.createElement('div');
  canvas.className = 'banner-container';
  Object.defineProperty(canvas, 'clientWidth', { value: 800 });
  Object.defineProperty(canvas, 'clientHeight', { value: 600 });
  
  const component = document.createElement('div');
  component.setAttribute('data-id', 'test-component');
  
  canvas.appendChild(component);
  document.body.appendChild(canvas);
  
  return { canvas, component };
};

describe('DimensionManager', () => {
  let manager;
  let domElements;

  beforeEach(() => {
    resetDimensionManager(true);
    domElements = mockDOM();
    manager = new DimensionManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetDimensionManager(true);
  });

  describe('constructor', () => {
    test('debería inicializar todas las dependencias', () => {
      expect(manager.referenceResolver).toBeDefined();
      expect(manager.unitConverter).toBeDefined();
      expect(manager.validator).toBeDefined();
      expect(manager.subscribers).toBeInstanceOf(Set);
    });

    test('debería inicializar con configuración por defecto', () => {
      expect(manager.config.enableValidation).toBe(true);
      expect(manager.config.enableLogging).toBe(true);
    });

    test('debería inicializar estadísticas en cero', () => {
      expect(manager.stats.conversions).toBe(0);
      expect(manager.stats.validations).toBe(0);
      expect(manager.stats.events).toBe(0);
    });
  });

  describe('sistema de eventos', () => {
    test('debería suscribir y desuscribir correctamente', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe(callback);
      
      expect(manager.subscribers.size).toBe(1);
      
      unsubscribe();
      expect(manager.subscribers.size).toBe(0);
    });

    test('debería notificar a suscriptores', () => {
      const callback = jest.fn();
      manager.subscribe(callback);
      
      const eventData = { type: 'test', data: 'test-data' };
      manager.notifySubscribers(eventData);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          ...eventData,
          timestamp: expect.any(Number),
          managerId: 'DimensionManager'
        })
      );
    });

    test('debería manejar errores en callbacks', () => {
      const errorCallback = jest.fn(() => { throw new Error('Test error'); });
      const normalCallback = jest.fn();
      
      manager.subscribe(errorCallback);
      manager.subscribe(normalCallback);
      
      manager.notifySubscribers({ type: 'test' });
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });

    test('debería incrementar contador de eventos', () => {
      manager.subscribe(jest.fn());
      
      const initialEvents = manager.stats.events;
      manager.notifySubscribers({ type: 'test' });
      
      expect(manager.stats.events).toBe(initialEvents + 1);
    });
  });

  describe('parseAndNormalize', () => {
    test('debería parsear y normalizar valor válido', () => {
      const result = manager.parseAndNormalize('100px', 'test-component', 'width');
      
      expect(result).toEqual(
        expect.objectContaining({
          value: 100,
          unit: 'px',
          componentId: 'test-component',
          property: 'width',
          reference: expect.objectContaining({
            size: 800,
            type: 'canvas'
          }),
          equivalents: expect.objectContaining({
            px: 100,
            '%': 12.5 // 100px de 800px = 12.5%
          })
        })
      );
    });

    test('debería manejar parámetros inválidos', () => {
      expect(manager.parseAndNormalize('100px', '', 'width')).toBeNull();
      expect(manager.parseAndNormalize('100px', 'test-component', '')).toBeNull();
    });
  });

  describe('convertToUnit', () => {
    test('debería convertir px a %', () => {
      const result = manager.convertToUnit('100px', 'px', '%', 'test-component', 'width');
      expect(result).toBe(12.5); // 100px de 800px = 12.5%
    });

    test('debería convertir % a px', () => {
      const result = manager.convertToUnit('50%', '%', 'px', 'test-component', 'width');
      expect(result).toBe(400); // 50% de 800px = 400px
    });

    test('debería retornar mismo valor para misma unidad', () => {
      const result = manager.convertToUnit('100px', 'px', 'px', 'test-component', 'width');
      expect(result).toBe(100);
    });

    test('debería incrementar contador de conversiones', () => {
      const initialConversions = manager.stats.conversions;
      manager.convertToUnit('100px', 'px', '%', 'test-component', 'width');
      expect(manager.stats.conversions).toBe(initialConversions + 1);
    });
  });

  describe('validateDimension', () => {
    test('debería validar dimensión correctamente', () => {
      const result = manager.validateDimension('50px', 'test-component', 'width');
      expect(result).toBe('50px'); // 50px es válido para componente default
    });

    test('debería ajustar valor por debajo del mínimo', () => {
      const result = manager.validateDimension('5px', 'test-component', 'width');
      expect(result).toBe('30px'); // Mínimo para default es 30px
    });

    test('debería incrementar contador de validaciones', () => {
      const initialValidations = manager.stats.validations;
      manager.validateDimension('100px', 'test-component', 'width');
      expect(manager.stats.validations).toBe(initialValidations + 1);
    });

    test('debería respetar configuración de validación deshabilitada', () => {
      manager.config.enableValidation = false;
      const result = manager.validateDimension('5px', 'test-component', 'width');
      expect(result).toBe('5px'); // No se aplican límites
    });
  });

  describe('getStats', () => {
    test('debería retornar estadísticas actualizadas', () => {
      const stats = manager.getStats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          conversions: expect.any(Number),
          validations: expect.any(Number),
          events: expect.any(Number),
          subscribers: 0,
          uptime: expect.any(Number)
        })
      );
    });
  });
});

describe('funciones singleton', () => {
  beforeEach(() => {
    resetDimensionManager(true);
  });

  afterEach(() => {
    resetDimensionManager(true);
  });

  describe('getDimensionManager', () => {
    test('debería crear instancia singleton', () => {
      const manager1 = getDimensionManager();
      const manager2 = getDimensionManager();
      
      expect(manager1).toBe(manager2);
      expect(hasDimensionManager()).toBe(true);
    });

    test('debería aplicar opciones de configuración', () => {
      const manager = getDimensionManager({ 
        debug: true, 
        enableValidation: false 
      });
      
      expect(manager.config.debug).toBe(true);
      expect(manager.config.enableValidation).toBe(false);
    });
  });

  describe('resetDimensionManager', () => {
    test('debería resetear instancia sin suscriptores', () => {
      getDimensionManager();
      expect(hasDimensionManager()).toBe(true);
      
      const result = resetDimensionManager();
      expect(result).toBe(true);
      expect(hasDimensionManager()).toBe(false);
    });

    test('debería rechazar reset con suscriptores activos', () => {
      const manager = getDimensionManager();
      manager.subscribe(jest.fn());
      
      const result = resetDimensionManager();
      expect(result).toBe(false);
      expect(hasDimensionManager()).toBe(true);
    });

    test('debería forzar reset con suscriptores activos', () => {
      const manager = getDimensionManager();
      manager.subscribe(jest.fn());
      
      const result = resetDimensionManager(true);
      expect(result).toBe(true);
      expect(hasDimensionManager()).toBe(false);
    });
  });
});