/**
 * @fileoverview Helpers para testing del sistema de sincronización
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DimensionProvider } from '../contexts/DimensionContext.jsx';
import { useDimensionSync } from '../hooks/useDimensionSync.js';
import { resetDimensionManager } from '../services/DimensionManager.js';

/**
 * Componente de test que usa useDimensionSync
 */
export function TestSyncComponent({ 
  componentId, 
  device, 
  onDimensionChange,
  options = {}
}) {
  const {
    dimensions,
    updateDimension,
    convertToUnit,
    syncInfo,
    isConnected
  } = useDimensionSync(componentId, device, options);

  // Notificar cambios al padre para testing
  React.useEffect(() => {
    if (onDimensionChange && Object.keys(dimensions).length > 0) {
      onDimensionChange({
        componentId,
        device,
        dimensions,
        syncInfo
      });
    }
  }, [dimensions, componentId, device, onDimensionChange, syncInfo]);

  return (
    <div data-testid={`sync-component-${componentId}`}>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="dimensions">
        {JSON.stringify(dimensions)}
      </div>
      <div data-testid="update-count">
        {syncInfo.updateCount}
      </div>
      <button
        data-testid="update-width"
        onClick={() => updateDimension('width', '300px', 'test-button')}
      >
        Update Width
      </button>
      <button
        data-testid="update-height"
        onClick={() => updateDimension('height', '200px', 'test-button')}
      >
        Update Height
      </button>
      <button
        data-testid="convert-units"
        onClick={() => {
          const converted = convertToUnit('50', '%', 'px', 'width');
          window.testConvertResult = converted;
        }}
      >
        Convert Units
      </button>
    </div>
  );
}

/**
 * Wrapper que incluye DimensionProvider para tests
 */
export function renderWithDimensionProvider(component, options = {}) {
  const providerOptions = {
    debug: false,
    enableValidation: true,
    enableLogging: false,
    ...options
  };

  return render(
    <DimensionProvider options={providerOptions}>
      {component}
    </DimensionProvider>
  );
}

/**
 * Crea un entorno de test completo con múltiples componentes
 */
export function createMultiComponentTestEnv() {
  const changeLog = [];
  
  const handleDimensionChange = (data) => {
    changeLog.push({
      timestamp: Date.now(),
      ...data
    });
  };

  const TestEnvironment = () => (
    <div data-testid="test-environment">
      <TestSyncComponent
        componentId="comp-1"
        device="desktop"
        onDimensionChange={handleDimensionChange}
        options={{ debug: false }}
      />
      <TestSyncComponent
        componentId="comp-2"
        device="desktop"
        onDimensionChange={handleDimensionChange}
        options={{ debug: false }}
      />
      <TestSyncComponent
        componentId="comp-1"
        device="mobile"
        onDimensionChange={handleDimensionChange}
        options={{ debug: false }}
      />
    </div>
  );

  return {
    TestEnvironment,
    getChangeLog: () => [...changeLog],
    clearChangeLog: () => changeLog.length = 0
  };
}

/**
 * Mock del DOM con elementos específicos para testing
 */
export function createSyncTestDOM() {
  const mockDOM = document.createElement('div');
  mockDOM.innerHTML = `
    <div class="banner-container" style="width: 800px; height: 600px;">
      <div data-id="comp-1" data-component-type="text" style="width: 200px; height: 100px;"></div>
      <div data-id="comp-2" data-component-type="button" style="width: 150px; height: 50px;"></div>
      <div data-id="container-1" data-component-type="container" style="width: 400px; height: 300px;">
        <div data-id="comp-3" data-component-type="image" style="width: 100px; height: 100px;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(mockDOM);

  return {
    mockDOM,
    cleanup: () => {
      if (mockDOM.parentNode) {
        mockDOM.parentNode.removeChild(mockDOM);
      }
    },
    getComponent: (id) => mockDOM.querySelector(`[data-id="${id}"]`),
    getCanvas: () => mockDOM.querySelector('.banner-container')
  };
}

/**
 * Configuración estandarizada para tests de sincronización
 */
export const syncTestConfig = {
  defaultTimeout: 100,
  devices: ['desktop', 'tablet', 'mobile'],
  components: [
    { id: 'comp-1', type: 'text' },
    { id: 'comp-2', type: 'button' },
    { id: 'comp-3', type: 'image' }
  ],
  dimensions: [
    { property: 'width', values: ['200px', '50%', '300px'] },
    { property: 'height', values: ['100px', '25%', '150px'] }
  ]
};

/**
 * Utilidad para esperar actualizaciones de sincronización
 */
export function waitForSync(timeout = 100) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Setup y cleanup automático para tests de sincronización
 */
export function setupSyncTest() {
  let domElements;
  
  beforeEach(() => {
    // Reset DimensionManager
    resetDimensionManager(true);
    
    // Crear DOM mock
    domElements = createSyncTestDOM();
    
    // Limpiar resultados globales de tests anteriores
    delete window.testConvertResult;
  });

  afterEach(() => {
    // Limpiar DOM
    if (domElements) {
      domElements.cleanup();
    }
    
    // Reset DimensionManager
    resetDimensionManager(true);
    
    // Limpiar resultados globales
    delete window.testConvertResult;
  });

  return {
    getDomElements: () => domElements
  };
}

/**
 * Matcher personalizado para verificar sincronización
 */
export function expectSyncronized(componentData, expectedDimensions) {
  expect(componentData).toBeDefined();
  expect(componentData.dimensions).toBeDefined();
  
  Object.entries(expectedDimensions).forEach(([property, value]) => {
    expect(componentData.dimensions[property]).toBe(value);
  });
  
  expect(componentData.syncInfo.isConnected).toBe(true);
  expect(componentData.syncInfo.updateCount).toBeGreaterThan(0);
}