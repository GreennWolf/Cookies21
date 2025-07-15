/**
 * @fileoverview Helpers para testing del sistema de dimensiones
 * @module testHelpers
 * @author Banner Editor Team
 * @version 1.0.0
 */

/**
 * Crea un mock del DOM para testing de dimensiones
 * 
 * @param {Object} options - Opciones de configuración del mock
 * @returns {Object} Elementos DOM mockeados
 */
export function createDimensionMockDOM(options = {}) {
  const {
    canvasWidth = 800,
    canvasHeight = 600,
    containerWidth = 400,
    containerHeight = 300,
    componentId = 'test-component',
    hasContainer = false
  } = options;

  // Limpiar DOM anterior
  document.body.innerHTML = '';

  // Canvas principal
  const canvas = document.createElement('div');
  canvas.className = 'banner-container';
  canvas.setAttribute('data-banner-canvas', 'true');
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  
  // Mockear clientWidth y clientHeight
  Object.defineProperty(canvas, 'clientWidth', { 
    value: canvasWidth, 
    writable: true 
  });
  Object.defineProperty(canvas, 'clientHeight', { 
    value: canvasHeight, 
    writable: true 
  });

  let component, container = null;

  if (hasContainer) {
    // Contenedor padre
    container = document.createElement('div');
    container.setAttribute('data-component-type', 'container');
    container.setAttribute('data-id', 'test-container');
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;
    
    Object.defineProperty(container, 'clientWidth', { 
      value: containerWidth, 
      writable: true 
    });
    Object.defineProperty(container, 'clientHeight', { 
      value: containerHeight, 
      writable: true 
    });

    // Componente dentro del contenedor
    component = document.createElement('div');
    component.setAttribute('data-id', componentId);
    component.style.width = '100px';
    component.style.height = '50px';
    
    Object.defineProperty(component, 'clientWidth', { value: 100 });
    Object.defineProperty(component, 'clientHeight', { value: 50 });

    container.appendChild(component);
    canvas.appendChild(container);
  } else {
    // Componente directamente en canvas
    component = document.createElement('div');
    component.setAttribute('data-id', componentId);
    component.style.width = '200px';
    component.style.height = '100px';
    
    Object.defineProperty(component, 'clientWidth', { value: 200 });
    Object.defineProperty(component, 'clientHeight', { value: 100 });

    canvas.appendChild(component);
  }

  document.body.appendChild(canvas);

  return {
    canvas,
    container,
    component,
    cleanup: () => {
      document.body.innerHTML = '';
    }
  };
}

/**
 * Crea un mock de suscriptor para testing de eventos
 * 
 * @returns {Object} Mock de suscriptor con helpers
 */
export function createEventSubscriberMock() {
  const events = [];
  const callback = jest.fn((event) => {
    events.push(event);
  });

  return {
    callback,
    events,
    getEventsByType: (type) => events.filter(e => e.type === type),
    getLastEvent: () => events[events.length - 1],
    clear: () => {
      events.length = 0;
      callback.mockClear();
    },
    expectEvent: (type, properties = {}) => {
      const event = events.find(e => e.type === type);
      expect(event).toBeDefined();
      
      if (Object.keys(properties).length > 0) {
        expect(event).toEqual(expect.objectContaining(properties));
      }
      
      return event;
    }
  };
}

/**
 * Helper para testing de conversiones de unidades
 * 
 * @param {Object} testCases - Casos de test con formato { input, expected, description }
 * @param {Function} convertFunction - Función de conversión a testear
 */
export function testUnitConversions(testCases, convertFunction) {
  testCases.forEach(({ input, expected, description }) => {
    test(description || `debería convertir ${JSON.stringify(input)} a ${expected}`, () => {
      const result = convertFunction(...input);
      
      if (typeof expected === 'number') {
        expect(result).toBeCloseTo(expected, 1);
      } else {
        expect(result).toBe(expected);
      }
    });
  });
}

/**
 * Helper para testing de validaciones
 * 
 * @param {Object} testCases - Casos de test de validación
 * @param {Function} validateFunction - Función de validación a testear
 */
export function testValidations(testCases, validateFunction) {
  testCases.forEach(({ input, expected, description, shouldAdjust = false }) => {
    test(description || `debería validar ${JSON.stringify(input)}`, () => {
      const result = validateFunction(...input);
      expect(result).toBe(expected);
      
      if (shouldAdjust) {
        expect(result).not.toBe(input[0]);
      }
    });
  });
}

/**
 * Mock de console para capturar logs en tests
 * 
 * @returns {Object} Mock de console con helpers
 */
export function createConsoleMock() {
  const originalConsole = { ...console };
  const logs = {
    log: [],
    warn: [],
    error: [],
    debug: []
  };

  const mock = {
    log: jest.fn((...args) => logs.log.push(args)),
    warn: jest.fn((...args) => logs.warn.push(args)),
    error: jest.fn((...args) => logs.error.push(args)),
    debug: jest.fn((...args) => logs.debug.push(args))
  };

  Object.assign(console, mock);

  return {
    logs,
    mock,
    restore: () => {
      Object.assign(console, originalConsole);
    },
    expectLog: (level, message) => {
      const levelLogs = logs[level];
      const found = levelLogs.some(log => 
        log.some(arg => 
          typeof arg === 'string' && arg.includes(message)
        )
      );
      expect(found).toBe(true);
    },
    clear: () => {
      Object.keys(logs).forEach(level => {
        logs[level].length = 0;
        mock[level].mockClear();
      });
    }
  };
}

/**
 * Configuración común para tests de dimensiones
 */
export const DIMENSION_TEST_CONFIG = {
  // Valores de test comunes
  testValues: {
    valid: ['100px', '50%', '0px', '0%', 100, 0],
    invalid: ['auto', 'invalid', null, undefined, NaN, ''],
    edge: ['0.1px', '99.9%', '1000000px']
  },
  
  // Componentes de test
  testComponents: {
    canvas: { width: 800, height: 600 },
    container: { width: 400, height: 300 },
    button: { type: 'button', minWidth: 80, minHeight: 30 },
    text: { type: 'text', minWidth: 40, minHeight: 20 },
    image: { type: 'image', minWidth: 50, minHeight: 50 }
  },
  
  // Tolerancias para comparaciones numéricas
  tolerances: {
    conversion: 0.1,
    percentage: 0.01
  }
};

// Export por defecto
export default {
  createDimensionMockDOM,
  createEventSubscriberMock,
  testUnitConversions,
  testValidations,
  createConsoleMock,
  DIMENSION_TEST_CONFIG
};