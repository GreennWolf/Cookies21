/**
 * @fileoverview Tests de integración para el sistema completo de dimensiones
 */

import { getDimensionManager, resetDimensionManager } from '../DimensionManager.js';
import { createDimensionMockDOM, createEventSubscriberMock, DIMENSION_TEST_CONFIG } from '../../utils/testHelpers.js';

describe('Sistema de Dimensiones - Integración', () => {
  let manager;
  let domElements;
  let subscriber;

  beforeEach(() => {
    resetDimensionManager(true);
    domElements = createDimensionMockDOM({
      canvasWidth: 800,
      canvasHeight: 600,
      hasContainer: false,
      componentId: 'integration-test-component'
    });
    manager = getDimensionManager({ debug: false });
    subscriber = createEventSubscriberMock();
    manager.subscribe(subscriber.callback);
  });

  afterEach(() => {
    domElements.cleanup();
    resetDimensionManager(true);
  });

  describe('Flujo completo: parseValue → getReference → convert → validate', () => {
    test('debería procesar valor px completo correctamente', () => {
      const componentId = 'integration-test-component';
      
      // 1. Parse y normalización
      const normalized = manager.parseAndNormalize('200px', componentId, 'width');
      
      expect(normalized).toEqual(
        expect.objectContaining({
          value: 200,
          unit: 'px',
          componentId,
          property: 'width',
          reference: expect.objectContaining({
            size: 800,
            type: 'canvas'
          }),
          equivalents: expect.objectContaining({
            px: 200,
            '%': 25.0 // 200px de 800px = 25%
          }),
          isValid: true
        })
      );

      // 2. Conversión
      const convertedToPercent = manager.convertToUnit('200px', 'px', '%', componentId, 'width');
      expect(convertedToPercent).toBe(25);

      // 3. Validación
      const validated = manager.validateDimension('200px', componentId, 'width');
      expect(validated).toBe('200px'); // 200px es válido para componente default

      // 4. Verificar eventos emitidos
      expect(subscriber.events.length).toBeGreaterThan(0);
      subscriber.expectEvent('unit-converted', {
        componentId,
        property: 'width',
        convertedValue: 25,
        convertedUnit: '%'
      });
    });

    test('debería procesar valor % completo correctamente', () => {
      const componentId = 'integration-test-component';
      
      // 1. Parse y normalización
      const normalized = manager.parseAndNormalize('25%', componentId, 'width');
      
      expect(normalized).toEqual(
        expect.objectContaining({
          value: 25,
          unit: '%',
          equivalents: expect.objectContaining({
            px: 200, // 25% de 800px = 200px
            '%': 25
          })
        })
      );

      // 2. Conversión
      const convertedToPx = manager.convertToUnit('25%', '%', 'px', componentId, 'width');
      expect(convertedToPx).toBe(200);

      // 3. Validación (25% > 10% mínimo, válido)
      const validated = manager.validateDimension('25%', componentId, 'width');
      expect(validated).toBe('25%');
    });

    test('debería manejar valor inválido gracefully', () => {
      const componentId = 'integration-test-component';
      
      // 1. Parse de valor inválido
      const normalized = manager.parseAndNormalize('invalid', componentId, 'width');
      
      expect(normalized).toEqual(
        expect.objectContaining({
          value: 0,
          unit: 'px' // parseValue convierte 'invalid' a 0px
        })
      );

      // 2. Conversión de 0 (siempre da 0)
      const converted = manager.convertToUnit('0px', 'px', '%', componentId, 'width');
      expect(converted).toBe(0);

      // 3. Validación aplicará mínimo
      const validated = manager.validateDimension('0px', componentId, 'width');
      expect(validated).toBe('30px'); // Mínimo para default es 30px
    });
  });

  describe('Flujo con componente dentro de contenedor', () => {
    beforeEach(() => {
      domElements.cleanup();
      domElements = createDimensionMockDOM({
        canvasWidth: 800,
        canvasHeight: 600,
        containerWidth: 400,
        containerHeight: 300,
        hasContainer: true,
        componentId: 'child-component'
      });
    });

    test('debería usar contenedor padre como referencia', () => {
      const componentId = 'child-component';
      
      // Parse debería detectar contenedor padre
      const normalized = manager.parseAndNormalize('100px', componentId, 'width');
      
      expect(normalized.reference).toEqual(
        expect.objectContaining({
          size: 400, // Ancho del contenedor, no del canvas
          type: 'container'
        })
      );

      // Conversión debería usar 400px como referencia
      const convertedToPercent = manager.convertToUnit('100px', 'px', '%', componentId, 'width');
      expect(convertedToPercent).toBe(25); // 100px de 400px = 25%

      // Conversión inversa
      const convertedToPx = manager.convertToUnit('50%', '%', 'px', componentId, 'width');
      expect(convertedToPx).toBe(200); // 50% de 400px = 200px
    });
  });

  describe('Estadísticas y eventos del sistema', () => {
    test('debería rastrear estadísticas correctamente', () => {
      const componentId = 'integration-test-component';
      
      const initialStats = manager.getStats();
      
      // Realizar operaciones
      manager.parseAndNormalize('100px', componentId, 'width');
      manager.convertToUnit('100px', 'px', '%', componentId, 'width');
      manager.validateDimension('100px', componentId, 'width');
      
      const finalStats = manager.getStats();
      
      expect(finalStats.conversions).toBe(initialStats.conversions + 1);
      expect(finalStats.validations).toBe(initialStats.validations + 1);
      expect(finalStats.events).toBeGreaterThan(initialStats.events);
    });

    test('debería emitir eventos apropiados', () => {
      const componentId = 'integration-test-component';
      
      // Limpiar eventos previos
      subscriber.clear();
      
      // Realizar operación que genera eventos
      manager.convertToUnit('100px', 'px', '%', componentId, 'width');
      manager.validateDimension('5px', componentId, 'width'); // Valor que será ajustado
      
      // Verificar eventos
      const conversionEvent = subscriber.expectEvent('unit-converted');
      expect(conversionEvent.convertedValue).toBe(12.5);
      
      const validationEvent = subscriber.expectEvent('dimension-validated');
      expect(validationEvent.wasAdjusted).toBe(true);
      expect(validationEvent.validatedValue).toBe('30px');
    });
  });

  describe('Casos edge del sistema integrado', () => {
    test('debería manejar canvas de tamaño 0', () => {
      // Modificar DOM para simular canvas sin tamaño
      Object.defineProperty(domElements.canvas, 'clientWidth', { value: 0 });
      Object.defineProperty(domElements.canvas, 'clientHeight', { value: 0 });
      
      const componentId = 'integration-test-component';
      
      // El sistema debería usar fallbacks
      const normalized = manager.parseAndNormalize('100px', componentId, 'width');
      expect(normalized.reference.isValid).toBe(false);
      
      // Conversión debería retornar valor original como fallback
      const converted = manager.convertToUnit('100px', 'px', '%', componentId, 'width');
      expect(converted).toBe(100); // Valor original como fallback
    });

    test('debería manejar componente que no existe en DOM', () => {
      const nonExistentId = 'component-that-does-not-exist';
      
      // Parse debería usar canvas como fallback
      const normalized = manager.parseAndNormalize('100px', nonExistentId, 'width');
      expect(normalized.reference.type).toBe('canvas');
      
      // Sistema debería seguir funcionando
      const converted = manager.convertToUnit('100px', 'px', '%', nonExistentId, 'width');
      expect(converted).toBe(12.5); // 100px de 800px canvas
    });

    test('debería manejar múltiples operaciones concurrentes', () => {
      const componentIds = ['comp1', 'comp2', 'comp3'];
      
      // Realizar múltiples operaciones en paralelo
      const results = componentIds.map(id => ({
        normalized: manager.parseAndNormalize('150px', id, 'width'),
        converted: manager.convertToUnit('150px', 'px', '%', id, 'width'),
        validated: manager.validateDimension('150px', id, 'width')
      }));
      
      // Todas deberían tener resultados consistentes
      results.forEach(result => {
        expect(result.normalized.value).toBe(150);
        expect(result.converted).toBe(18.75); // 150px de 800px = 18.75%
        expect(result.validated).toBe('150px');
      });
      
      // Estadísticas deberían reflejar todas las operaciones
      const stats = manager.getStats();
      expect(stats.conversions).toBe(3);
      expect(stats.validations).toBe(3);
    });
  });

  describe('Configuración del sistema', () => {
    test('debería respetar configuración de validación deshabilitada', () => {
      manager.config.enableValidation = false;
      
      const result = manager.validateDimension('1px', 'integration-test-component', 'width');
      expect(result).toBe('1px'); // No se aplica mínimo de 30px
    });

    test('debería respetar configuración de logging deshabilitado', () => {
      manager.config.enableLogging = false;
      subscriber.clear();
      
      manager.convertToUnit('100px', 'px', '%', 'integration-test-component', 'width');
      
      // No debería haber eventos de conversión
      expect(subscriber.getEventsByType('unit-converted')).toHaveLength(0);
    });
  });
});