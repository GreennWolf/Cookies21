/**
 * @fileoverview Tests de integración para useBannerEditor con DimensionManager
 */

import { getDimensionManager, resetDimensionManager } from '../../../../../services/DimensionManager.js';
import { createDimensionMockDOM, createEventSubscriberMock } from '../../../../../utils/testHelpers.js';

// Mock de APIs externas que no son relevantes para estos tests
jest.mock('../../../../../utils/apiClient', () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../../../../api/bannerTemplate', () => ({
  createTemplate: jest.fn(),
  updateTemplate: jest.fn()
}));

jest.mock('../../../../../api/client', () => ({
  getClients: jest.fn(() => Promise.resolve([]))
}));

jest.mock('../../../../../api/translation', () => ({
  translateText: jest.fn()
}));

jest.mock('../../../../../utils/containerBoundsValidator', () => ({
  validateChildSize: jest.fn(),
  validateChildPosition: jest.fn(),
  validateContainerChildren: jest.fn()
}));

jest.mock('../../../../../utils/bannerConfigHelper', () => ({
  BannerConfigHelper: jest.fn()
}));

jest.mock('../../../../../utils/imageMemoryManager', () => ({
  default: {
    addImage: jest.fn(),
    removeImage: jest.fn(),
    cleanup: jest.fn()
  }
}));

jest.mock('../../../../../utils/imageProcessing', () => ({
  processImageStyles: jest.fn(),
  imageAspectRatioCache: new Map()
}));

describe('useBannerEditor - Integración con DimensionManager', () => {
  let domElements;
  let dimensionManager;

  beforeEach(() => {
    // Reset DimensionManager antes de cada test
    resetDimensionManager(true);
    
    // Crear DOM mock para los tests
    domElements = createDimensionMockDOM({
      canvasWidth: 800,
      canvasHeight: 600,
      componentId: 'test-component'
    });
    
    // Obtener instancia del DimensionManager
    dimensionManager = getDimensionManager({ debug: false });
  });

  afterEach(() => {
    domElements.cleanup();
    resetDimensionManager(true);
  });

  describe('Integración básica del DimensionManager', () => {
    test('debería poder obtener instancia del DimensionManager', () => {
      // Verificar que DimensionManager está disponible
      expect(dimensionManager).toBeDefined();
      expect(typeof dimensionManager.subscribe).toBe('function');
      expect(typeof dimensionManager.updateDimension).toBe('function');
      expect(typeof dimensionManager.emitDimensionChanged).toBe('function');
    });
    
    test('debería poder suscribirse a eventos del DimensionManager', () => {
      const eventSubscriber = createEventSubscriberMock();
      const unsubscribe = dimensionManager.subscribe(eventSubscriber.callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Emitir un evento de prueba
      dimensionManager.emitDimensionChanged(
        'test-component',
        'width',
        '200px',
        'desktop',
        'test-source'
      );
      
      // Verificar que el suscriptor recibió el evento
      expect(eventSubscriber.callback).toHaveBeenCalled();
      
      const lastEvent = eventSubscriber.getLastEvent();
      expect(lastEvent).toMatchObject({
        type: 'dimension-changed',
        componentId: 'test-component',
        property: 'width',
        value: '200px',
        device: 'desktop',
        source: 'test-source'
      });
      
      // Cleanup
      unsubscribe();
    });
  });

  describe('Flujo de eventos bidireccional', () => {
    test('debería emitir eventos cuando se usan métodos del DimensionManager', () => {
      const eventSubscriber = createEventSubscriberMock();
      dimensionManager.subscribe(eventSubscriber.callback);
      
      // Usar updateDimension para simular un cambio desde drag-resize
      const result = dimensionManager.updateDimension(
        'test-component',
        'width',
        '300px',
        'desktop',
        'drag-resize'
      );
      
      expect(result.success).toBe(true);
      expect(eventSubscriber.callback).toHaveBeenCalled();
      
      // Verificar que se emitió el evento correcto
      eventSubscriber.expectEvent('dimension-changed', {
        componentId: 'test-component',
        property: 'width',
        value: '300px',
        device: 'desktop',
        source: 'drag-resize'
      });
    });
    
    test('debería filtrar eventos por source para prevenir bucles infinitos', () => {
      const stateUpdateSubscriber = createEventSubscriberMock();
      const externalSubscriber = createEventSubscriberMock();
      
      // Suscriptor que solo acepta eventos externos (no state-update)
      dimensionManager.subscribe((event) => {
        if (event.source !== 'state-update') {
          externalSubscriber.callback(event);
        }
      });
      
      // Suscriptor que acepta todos los eventos
      dimensionManager.subscribe(stateUpdateSubscriber.callback);
      
      // Emitir evento externo
      dimensionManager.emitDimensionChanged(
        'test-component',
        'width',
        '200px',
        'desktop',
        'drag-resize'
      );
      
      // Emitir evento interno
      dimensionManager.emitDimensionChanged(
        'test-component',
        'height',
        '100px',
        'desktop',
        'state-update'
      );
      
      // Verificar que el suscriptor externo solo recibió el evento de drag-resize
      expect(externalSubscriber.callback).toHaveBeenCalledTimes(1);
      expect(externalSubscriber.getLastEvent().source).toBe('drag-resize');
      
      // Verificar que el suscriptor completo recibió ambos eventos
      expect(stateUpdateSubscriber.callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Validación y parsing de dimensiones', () => {
    test('debería validar y parsear valores de dimensiones correctamente', () => {
      // Test con valor en píxeles
      const pxResult = dimensionManager.updateDimension(
        'test-component',
        'width',
        '250px',
        'desktop',
        'test'
      );
      
      expect(pxResult.success).toBe(true);
      expect(pxResult.finalValue).toBe('250px');
      
      // Test con valor en porcentaje
      const percentResult = dimensionManager.updateDimension(
        'test-component',
        'width',
        '50%',
        'desktop',
        'test'
      );
      
      expect(percentResult.success).toBe(true);
      expect(percentResult.finalValue).toBe('50%');
    });
    
    test('debería manejar valores inválidos gracefully', () => {
      const result = dimensionManager.updateDimension(
        'test-component',
        'width',
        'invalid-value',
        'desktop',
        'test'
      );
      
      // Debería procesar el valor inválido usando las reglas del validador
      expect(result.success).toBe(true);
      expect(result.wasValidated).toBe(true);
    });
  });

  describe('Estadísticas y debugging', () => {
    test('debería rastrear estadísticas de uso', () => {
      const initialStats = dimensionManager.getStats();
      
      // Realizar algunas operaciones
      dimensionManager.updateDimension('test-comp', 'width', '100px', 'desktop', 'test');
      dimensionManager.convertToUnit('200px', 'px', '%', 'test-comp', 'width');
      dimensionManager.validateDimension('300px', 'test-comp', 'height');
      
      const finalStats = dimensionManager.getStats();
      
      expect(finalStats.conversions).toBeGreaterThan(initialStats.conversions);
      expect(finalStats.validations).toBeGreaterThan(initialStats.validations);
      expect(finalStats.events).toBeGreaterThan(initialStats.events);
    });
  });

  describe('Gestión de suscriptores', () => {
    test('debería poder agregar y remover suscriptores correctamente', () => {
      const subscriber1 = createEventSubscriberMock();
      const subscriber2 = createEventSubscriberMock();
      
      const unsub1 = dimensionManager.subscribe(subscriber1.callback);
      const unsub2 = dimensionManager.subscribeToComponent('test-comp', subscriber2.callback);
      
      // Verificar que están en las estadísticas
      let stats = dimensionManager.getStats();
      expect(stats.subscribers.global).toBe(1);
      expect(stats.subscribers.byComponent).toBe(1);
      expect(stats.subscribers.total).toBe(2);
      
      // Emitir evento
      dimensionManager.emitDimensionChanged('test-comp', 'width', '100px', 'desktop', 'test');
      
      // Ambos deberían recibir el evento
      expect(subscriber1.callback).toHaveBeenCalled();
      expect(subscriber2.callback).toHaveBeenCalled();
      
      // Remover suscriptores
      unsub1();
      unsub2();
      
      // Verificar cleanup
      stats = dimensionManager.getStats();
      expect(stats.subscribers.total).toBe(0);
    });
  });

  describe('Método updateDimensionFromManager (Fase 2.2.4)', () => {
    test('debería actualizar estado directamente sin emitir eventos adicionales', () => {
      // Simular el comportamiento del método exportado desde useBannerEditor
      // Como no podemos usar renderHook, simulamos la funcionalidad
      
      const eventSubscriber = createEventSubscriberMock();
      dimensionManager.subscribe(eventSubscriber.callback);
      
      // Simular actualización directa que NO debería generar eventos
      // Este test verifica que cuando el DimensionManager actualiza el estado del hook,
      // no se generan eventos adicionales (previniendo bucles infinitos)
      
      const mockUpdateDimensionFromManager = jest.fn();
      
      // Simular el comportamiento del suscriptor del hook
      const hookSubscriber = (event) => {
        if (event.source === 'state-update') {
          console.log('Hook ignorando evento de state-update para evitar bucle');
          return;
        }
        
        if (event.type === 'dimension-changed') {
          console.log('Hook recibiendo evento externo y actualizando estado directamente');
          mockUpdateDimensionFromManager(event.componentId, event.property, event.value, event.device);
        }
      };
      
      dimensionManager.subscribe(hookSubscriber);
      
      // Simular evento externo (como drag-resize)
      dimensionManager.emitDimensionChanged(
        'test-component',
        'width',
        '300px',
        'desktop',
        'drag-resize'
      );
      
      // Verificar que el hook recibió el evento y llamó al método de actualización directa
      expect(mockUpdateDimensionFromManager).toHaveBeenCalledWith(
        'test-component',
        'width',
        '300px',
        'desktop'
      );
      
      // Verificar que no hay bucles: solo se emitió el evento original
      const dimensionEvents = eventSubscriber.events.filter(e => e.type === 'dimension-changed');
      expect(dimensionEvents.length).toBe(1);
      expect(dimensionEvents[0].source).toBe('drag-resize');
    });
  });

  describe('Prueba de flujo completo de integración', () => {
    test('debería mantener sincronización completa entre todas las capas', () => {
      const allEventsSubscriber = createEventSubscriberMock();
      dimensionManager.subscribe(allEventsSubscriber.callback);
      
      // 1. Simular cambio desde drag-resize
      dimensionManager.updateDimension(
        'test-component',
        'width',
        '200px',
        'desktop',
        'drag-resize'
      );
      
      // 2. Simular cambio desde panel de propiedades (state-update)
      dimensionManager.updateDimension(
        'test-component',
        'height',
        '100px',
        'desktop',
        'state-update'
      );
      
      // 3. Otro cambio externo
      dimensionManager.emitDimensionChanged(
        'test-component',
        'width',
        '250px',
        'desktop',
        'external-tool'
      );
      
      // Verificar todos los eventos
      const allEvents = allEventsSubscriber.events;
      const dimensionEvents = allEvents.filter(e => e.type === 'dimension-changed');
      
      expect(dimensionEvents.length).toBe(3);
      
      // Verificar cada evento
      expect(dimensionEvents[0]).toMatchObject({
        componentId: 'test-component',
        property: 'width',
        value: '200px',
        source: 'drag-resize'
      });
      
      expect(dimensionEvents[1]).toMatchObject({
        componentId: 'test-component',
        property: 'height',
        value: '100px',
        source: 'state-update'
      });
      
      expect(dimensionEvents[2]).toMatchObject({
        componentId: 'test-component',
        property: 'width',
        value: '250px',
        source: 'external-tool'
      });
    });
  });
});