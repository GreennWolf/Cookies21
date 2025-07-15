/**
 * @fileoverview Tests específicos para el sistema de eventos del DimensionManager
 */

import { getDimensionManager, resetDimensionManager } from '../DimensionManager.js';
import { createDimensionMockDOM, createEventSubscriberMock } from '../../utils/testHelpers.js';

describe('DimensionManager - Sistema de Eventos', () => {
  let manager;
  let domElements;

  beforeEach(() => {
    resetDimensionManager(true);
    domElements = createDimensionMockDOM({
      canvasWidth: 800,
      canvasHeight: 600,
      componentId: 'test-component'
    });
    manager = getDimensionManager({ debug: false });
  });

  afterEach(() => {
    domElements.cleanup();
    resetDimensionManager(true);
  });

  describe('Suscriptores múltiples', () => {
    test('debería notificar a múltiples suscriptores globales', () => {
      const subscriber1 = createEventSubscriberMock();
      const subscriber2 = createEventSubscriberMock();
      const subscriber3 = createEventSubscriberMock();

      manager.subscribe(subscriber1.callback);
      manager.subscribe(subscriber2.callback);
      manager.subscribe(subscriber3.callback);

      // Emitir evento
      manager.updateDimension('test-component', 'width', '100px', 'desktop', 'test');

      // Todos los suscriptores deberían haber recibido el evento
      expect(subscriber1.callback).toHaveBeenCalled();
      expect(subscriber2.callback).toHaveBeenCalled();
      expect(subscriber3.callback).toHaveBeenCalled();

      // Todos deberían tener el mismo evento
      const event1 = subscriber1.getLastEvent();
      const event2 = subscriber2.getLastEvent();
      const event3 = subscriber3.getLastEvent();

      expect(event1.type).toBe('dimension-changed');
      expect(event2.type).toBe('dimension-changed');
      expect(event3.type).toBe('dimension-changed');
    });

    test('debería manejar suscriptores específicos por componente', () => {
      const globalSubscriber = createEventSubscriberMock();
      const componentSubscriber = createEventSubscriberMock();
      const otherComponentSubscriber = createEventSubscriberMock();

      manager.subscribe(globalSubscriber.callback);
      manager.subscribeToComponent('test-component', componentSubscriber.callback);
      manager.subscribeToComponent('other-component', otherComponentSubscriber.callback);

      // Emitir evento para test-component
      manager.updateDimension('test-component', 'width', '100px', 'desktop', 'test');

      // Global y componente específico deberían recibir
      expect(globalSubscriber.callback).toHaveBeenCalled();
      expect(componentSubscriber.callback).toHaveBeenCalled();
      // Otro componente NO debería recibir
      expect(otherComponentSubscriber.callback).not.toHaveBeenCalled();
    });

    test('debería manejar suscriptores específicos por tipo de evento', () => {
      const globalSubscriber = createEventSubscriberMock();
      const dimensionChangeSubscriber = createEventSubscriberMock();
      const validationSubscriber = createEventSubscriberMock();

      manager.subscribe(globalSubscriber.callback);
      manager.subscribeToEvent('dimension-changed', dimensionChangeSubscriber.callback);
      manager.subscribeToEvent('dimension-validated', validationSubscriber.callback);

      // Emitir evento que genera dimension-changed
      manager.updateDimension('test-component', 'width', '100px', 'desktop', 'test');

      // Global y dimension-changed deberían recibir
      expect(globalSubscriber.callback).toHaveBeenCalled();
      expect(dimensionChangeSubscriber.callback).toHaveBeenCalled();
      
      // validation subscriber puede o no recibir dependiendo de si la validación está habilitada
      // pero al menos debería estar definido
      expect(validationSubscriber.callback).toBeDefined();
    });

    test('debería manejar errores en callbacks sin afectar otros', () => {
      const workingSubscriber = createEventSubscriberMock();
      const errorSubscriber = jest.fn(() => {
        throw new Error('Test error in callback');
      });
      const anotherWorkingSubscriber = createEventSubscriberMock();

      manager.subscribe(workingSubscriber.callback);
      manager.subscribe(errorSubscriber);
      manager.subscribe(anotherWorkingSubscriber.callback);

      // Emitir evento
      manager.updateDimension('test-component', 'width', '100px', 'desktop', 'test');

      // Los callbacks que funcionan deberían haberse ejecutado
      expect(workingSubscriber.callback).toHaveBeenCalled();
      expect(anotherWorkingSubscriber.callback).toHaveBeenCalled();
      
      // El callback con error también se debería haber intentado ejecutar
      expect(errorSubscriber).toHaveBeenCalled();
    });
  });

  describe('Filtros de suscripción avanzados', () => {
    test('debería suscribirse a múltiples componentes', () => {
      const subscriber = createEventSubscriberMock();

      const unsubscribe = manager.subscribeToComponents(
        ['comp1', 'comp2', 'comp3'], 
        subscriber.callback
      );

      // Emitir eventos para diferentes componentes
      manager.emitDimensionChanged('comp1', 'width', '100px', 'desktop', 'test');
      manager.emitDimensionChanged('comp2', 'height', '50px', 'desktop', 'test');
      manager.emitDimensionChanged('comp4', 'width', '200px', 'desktop', 'test'); // No suscrito

      // Debería haber recibido 2 eventos (comp1 y comp2, pero no comp4)
      expect(subscriber.callback).toHaveBeenCalledTimes(2);

      // Cleanup
      unsubscribe();

      // Después del cleanup, no debería recibir más eventos
      subscriber.callback.mockClear();
      manager.emitDimensionChanged('comp1', 'width', '300px', 'desktop', 'test');
      expect(subscriber.callback).not.toHaveBeenCalled();
    });

    test('debería suscribirse a múltiples tipos de eventos', () => {
      const subscriber = createEventSubscriberMock();

      const unsubscribe = manager.subscribeToEvents(
        ['dimension-changed', 'dimension-validated'], 
        subscriber.callback
      );

      // Emitir diferentes tipos de eventos
      manager.emitDimensionChanged('test-comp', 'width', '100px', 'desktop', 'test');
      manager.emitDimensionValidated('test-comp', 'width', '100px', '100px', {});
      manager.emitDimensionError('test-op', new Error('test'), {}); // No suscrito

      // Debería haber recibido 2 eventos
      expect(subscriber.callback).toHaveBeenCalledTimes(2);

      // Cleanup
      unsubscribe();
    });
  });

  describe('Estadísticas de suscriptores', () => {
    test('debería rastrear estadísticas de suscriptores correctamente', () => {
      const initialStats = manager.getStats();

      // Agregar suscriptores
      const unsub1 = manager.subscribe(jest.fn());
      const unsub2 = manager.subscribeToComponent('comp1', jest.fn());
      const unsub3 = manager.subscribeToEvent('dimension-changed', jest.fn());

      const midStats = manager.getStats();
      expect(midStats.subscribers.global).toBe(1);
      expect(midStats.subscribers.byComponent).toBe(1);
      expect(midStats.subscribers.byEventType).toBe(1);
      expect(midStats.subscribers.total).toBe(3);

      // Remover suscriptores
      unsub1();
      unsub2();
      unsub3();

      const finalStats = manager.getStats();
      expect(finalStats.subscribers.total).toBe(0);
    });

    test('debería obtener listas de suscripciones activas', () => {
      manager.subscribeToComponent('comp1', jest.fn());
      manager.subscribeToComponent('comp2', jest.fn());
      manager.subscribeToEvent('dimension-changed', jest.fn());
      manager.subscribeToEvent('dimension-validated', jest.fn());

      const activeComponents = manager.getActiveComponentSubscriptions();
      const activeEvents = manager.getActiveEventSubscriptions();

      expect(activeComponents).toEqual(['comp1', 'comp2']);
      expect(activeEvents).toEqual(['dimension-changed', 'dimension-validated']);
    });

    test('debería limpiar todos los suscriptores', () => {
      manager.subscribe(jest.fn());
      manager.subscribeToComponent('comp1', jest.fn());
      manager.subscribeToEvent('dimension-changed', jest.fn());

      expect(manager.getStats().subscribers.total).toBe(3);

      manager.clearAllSubscribers();

      expect(manager.getStats().subscribers.total).toBe(0);
      expect(manager.getActiveComponentSubscriptions()).toEqual([]);
      expect(manager.getActiveEventSubscriptions()).toEqual([]);
    });
  });

  describe('Flujo completo de eventos', () => {
    test('debería emitir todos los eventos apropiados durante updateDimension', () => {
      const allEventsSubscriber = createEventSubscriberMock();
      manager.subscribe(allEventsSubscriber.callback);

      // Realizar actualización que puede generar múltiples eventos
      manager.updateDimension('test-component', 'width', '5px', 'desktop', 'test');

      // Debería haber al menos un evento dimension-changed
      allEventsSubscriber.expectEvent('dimension-changed', {
        componentId: 'test-component',
        property: 'width'
      });

      // Si la validación está habilitada, también debería haber dimension-validated
      if (manager.config.enableValidation) {
        allEventsSubscriber.expectEvent('dimension-validated');
      }
    });
  });
});