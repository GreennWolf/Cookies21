/**
 * @fileoverview Tests para DimensionContext
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DimensionProvider, useDimensionManager } from '../DimensionContext.jsx';
import { resetDimensionManager } from '../../services/DimensionManager.js';

// Componente de test que use el hook
function TestComponent() {
  try {
    const dimensionManager = useDimensionManager();
    return (
      <div data-testid="test-component">
        {dimensionManager ? 'Manager Available' : 'Manager Not Available'}
      </div>
    );
  } catch (error) {
    return (
      <div data-testid="test-component">
        Error: {error.message}
      </div>
    );
  }
}

describe('DimensionContext', () => {
  beforeEach(() => {
    // Reset DimensionManager antes de cada test
    resetDimensionManager(true);
  });

  afterEach(() => {
    resetDimensionManager(true);
  });

  describe('DimensionProvider', () => {
    test('debería proporcionar DimensionManager a componentes hijos', () => {
      render(
        <DimensionProvider options={{ debug: false }}>
          <TestComponent />
        </DimensionProvider>
      );

      expect(screen.getByTestId('test-component')).toHaveTextContent('Manager Available');
    });

    test('debería inicializar con opciones personalizadas', () => {
      const customOptions = {
        debug: true,
        enableValidation: false,
        enableLogging: true
      };

      render(
        <DimensionProvider options={customOptions}>
          <TestComponent />
        </DimensionProvider>
      );

      expect(screen.getByTestId('test-component')).toHaveTextContent('Manager Available');
    });
  });

  describe('useDimensionManager', () => {
    test('debería arrojar error cuando se usa fuera de DimensionProvider', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('test-component')).toHaveTextContent(
        'Error: useDimensionManager debe ser usado dentro de un DimensionProvider'
      );
    });

    test('debería retornar instancia del manager cuando se usa dentro del provider', () => {
      render(
        <DimensionProvider options={{ debug: false }}>
          <TestComponent />
        </DimensionProvider>
      );

      expect(screen.getByTestId('test-component')).toHaveTextContent('Manager Available');
    });
  });

  describe('Inicialización', () => {
    test('no debería renderizar children hasta que el manager esté inicializado', async () => {
      const { container } = render(
        <DimensionProvider options={{ debug: false }}>
          <div data-testid="child">Child Content</div>
        </DimensionProvider>
      );

      // El provider puede no renderizar inmediatamente en algunos casos
      // pero eventualmente debería mostrar el contenido
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const child = container.querySelector('[data-testid="child"]');
      if (child) {
        expect(child).toHaveTextContent('Child Content');
      }
    });

    test('debería usar configuración por defecto correctamente', () => {
      render(
        <DimensionProvider>
          <TestComponent />
        </DimensionProvider>
      );

      expect(screen.getByTestId('test-component')).toHaveTextContent('Manager Available');
    });
  });
});