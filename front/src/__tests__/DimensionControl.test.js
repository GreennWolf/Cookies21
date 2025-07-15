/**
 * @fileoverview Tests para DimensionControl refactorizado
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { DimensionProvider } from '../contexts/DimensionContext.jsx';
import DimensionControl from '../components/banner/Editor/DimensionControl.jsx';
import { getDimensionManager, resetDimensionManager } from '../services/DimensionManager.js';
import { 
  setupSyncTest,
  waitForSync,
  createSyncTestDOM,
  syncTestConfig
} from '../utils/syncTestHelpers.js';

describe('DimensionControl - Refactorizado con useDimensionSync', () => {
  setupSyncTest();

  const renderDimensionControl = (props = {}) => {
    const defaultProps = {
      label: 'Width',
      property: 'width',
      value: '200px',
      onChange: jest.fn(),
      containerSize: 800,
      componentType: 'button',
      componentId: 'comp-1', // Usar ID que existe en el DOM mock
      device: 'desktop',
      ...props
    };

    return render(
      <DimensionProvider options={{ debug: false }}>
        <DimensionControl {...defaultProps} />
      </DimensionProvider>
    );
  };

  describe('Integración con useDimensionSync', () => {
    test('debe conectarse al DimensionManager correctamente', async () => {
      renderDimensionControl();

      // Verificar indicadores de conexión
      const connectionIndicator = document.querySelector('.bg-green-400');
      expect(connectionIndicator).toBeInTheDocument();
      expect(connectionIndicator).toHaveClass('animate-pulse');

      // Verificar indicador de device
      expect(screen.getByText('desktop')).toBeInTheDocument();
    });

    test('debe recibir cambios externos del DimensionManager', async () => {
      const onChange = jest.fn();
      renderDimensionControl({ onChange });

      const dimensionManager = getDimensionManager();
      
      // Emitir cambio externo
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-1',
          'width',
          '300px',
          'desktop',
          'external-test'
        );
        await waitForSync();
      });

      // Verificar que el input se actualizó
      const input = screen.getByRole('spinbutton');
      await waitFor(() => {
        expect(input.value).toBe('300');
      });
    });

    test('debe emitir cambios a través del DimensionManager', async () => {
      const events = [];
      const dimensionManager = getDimensionManager();
      
      const unsubscribe = dimensionManager.subscribe((event) => {
        if (event.componentId === 'comp-1' && event.type === 'dimension-changed') {
          events.push(event);
        }
      });

      renderDimensionControl();

      const input = screen.getByRole('spinbutton');
      
      // Cambiar valor y hacer blur
      await act(async () => {
        fireEvent.change(input, { target: { value: '250' } });
        fireEvent.blur(input);
        await waitForSync();
      });

      // Verificar que se emitió el evento
      expect(events.length).toBeGreaterThan(0);
      const changeEvent = events.find(e => e.value === '250px');
      expect(changeEvent).toBeDefined();
      expect(changeEvent.source).toBe('input-panel');

      unsubscribe();
    });

    test('debe usar convertToUnit del hook para conversiones', async () => {
      renderDimensionControl({ value: '50%' });

      const select = screen.getByRole('combobox');
      
      // Cambiar de % a px
      await act(async () => {
        fireEvent.change(select, { target: { value: 'px' } });
        await waitForSync();
      });

      // Verificar que se usó la conversión del hook
      const input = screen.getByRole('spinbutton');
      // El valor debería haberse convertido usando las dimensiones reales
      expect(input.value).not.toBe('50'); // No debería ser el valor original
    });
  });

  describe('Performance y Optimizaciones', () => {
    test('callbacks deben estar memoizados', () => {
      const { rerender } = renderDimensionControl();
      
      const input = screen.getByRole('spinbutton');
      const select = screen.getByRole('combobox');
      const button = screen.getByRole('button');
      
      const initialHandlers = {
        onChange: input.onchange,
        onBlur: input.onblur,
        selectChange: select.onchange,
        buttonClick: button.onclick
      };

      // Re-render con props iguales
      rerender(
        <DimensionProvider options={{ debug: false }}>
          <DimensionControl
            label="Width"
            property="width"
            value="200px"
            onChange={jest.fn()}
            containerSize={800}
            componentType="button"
            componentId="test-comp"
            device="desktop"
          />
        </DimensionProvider>
      );

      // Los handlers deberían ser los mismos (memoizados)
      expect(input.onchange).toBe(initialHandlers.onChange);
      expect(input.onblur).toBe(initialHandlers.onBlur);
      expect(select.onchange).toBe(initialHandlers.selectChange);
      expect(button.onclick).toBe(initialHandlers.buttonClick);
    });

    test('no debe re-renderizar innecesariamente', () => {
      const renderCount = jest.fn();
      
      const TestWrapper = (props) => {
        renderCount();
        return <DimensionControl {...props} />;
      };

      const { rerender } = render(
        <DimensionProvider options={{ debug: false }}>
          <TestWrapper
            label="Width"
            property="width"
            value="200px"
            onChange={jest.fn()}
            containerSize={800}
            componentType="button"
            componentId="test-comp"
            device="desktop"
          />
        </DimensionProvider>
      );

      const initialRenderCount = renderCount.mock.calls.length;

      // Re-render con props iguales
      rerender(
        <DimensionProvider options={{ debug: false }}>
          <TestWrapper
            label="Width"
            property="width"
            value="200px"
            onChange={jest.fn()}
            containerSize={800}
            componentType="button"
            componentId="test-comp"
            device="desktop"
          />
        </DimensionProvider>
      );

      // Debería haber solo un render adicional
      expect(renderCount.mock.calls.length).toBe(initialRenderCount + 1);
    });
  });

  describe('Edge Cases', () => {
    test('debe manejar componentId nulo', async () => {
      const onChange = jest.fn();
      renderDimensionControl({ componentId: null, onChange });

      const input = screen.getByRole('spinbutton');
      
      // Cambiar valor
      await act(async () => {
        fireEvent.change(input, { target: { value: '150' } });
        fireEvent.blur(input);
        await waitForSync();
      });

      // Debería usar onChange tradicional
      expect(onChange).toHaveBeenCalledWith('width', '150px');
      
      // No debería mostrar indicador de conexión
      const connectionIndicator = document.querySelector('.bg-green-400');
      expect(connectionIndicator).not.toBeInTheDocument();
    });

    test('debe manejar valores inválidos correctamente', async () => {
      renderDimensionControl();

      const input = screen.getByRole('spinbutton');
      
      // Introducir valor inválido
      await act(async () => {
        fireEvent.change(input, { target: { value: 'abc' } });
      });

      // Debería mostrar indicador de error
      const errorIndicator = document.querySelector('.bg-yellow-400');
      expect(errorIndicator).toBeInTheDocument();
      expect(errorIndicator).toHaveClass('animate-bounce');

      // Input debería tener estilo de error
      expect(input).toHaveClass('border-red-400', 'bg-red-50');
    });

    test('debe aplicar límites en porcentajes', async () => {
      const onChange = jest.fn();
      renderDimensionControl({ 
        value: '50%',
        onChange
      });

      const input = screen.getByRole('spinbutton');
      
      // Intentar valor fuera de rango
      await act(async () => {
        fireEvent.change(input, { target: { value: '5' } }); // Menor que 10%
        fireEvent.blur(input);
        await waitForSync();
      });

      // Debería aplicar límite mínimo de 10%
      expect(onChange).toHaveBeenCalledWith('width', '10%');
    });

    test('debe manejar conversión de unidades fallida', async () => {
      renderDimensionControl({ value: '' });

      const select = screen.getByRole('combobox');
      const input = screen.getByRole('spinbutton');
      
      // Cambiar unidad sin valor numérico
      await act(async () => {
        fireEvent.change(select, { target: { value: '%' } });
        await waitForSync();
      });

      // No debería causar error y debería cambiar la unidad
      expect(select.value).toBe('%');
      expect(input.value).toBe('');
    });
  });

  describe('Indicadores Visuales', () => {
    test('debe mostrar estado de conexión correctamente', () => {
      renderDimensionControl();

      // Indicador verde (conectado)
      const connectedIndicator = document.querySelector('.bg-green-400');
      expect(connectedIndicator).toBeInTheDocument();
      expect(connectedIndicator).toHaveClass('animate-pulse');

      // Device label
      expect(screen.getByText('DESKTOP')).toBeInTheDocument();
    });

    test('debe mostrar indicadores de validación', async () => {
      renderDimensionControl();

      const input = screen.getByRole('spinbutton');
      
      // Introducir valor inválido
      await act(async () => {
        fireEvent.change(input, { target: { value: 'invalid' } });
      });

      // Indicador de validación
      const validationIndicator = document.querySelector('.bg-yellow-400');
      expect(validationIndicator).toBeInTheDocument();
      expect(validationIndicator).toHaveClass('animate-bounce');

      // Mensaje de error con icono
      const errorMessage = screen.getByText(/Valor menor que el mínimo recomendado/);
      expect(errorMessage).toBeInTheDocument();
    });

    test('debe aplicar estilos dinámicos según conexión', () => {
      renderDimensionControl();

      const input = screen.getByRole('spinbutton');
      const select = screen.getByRole('combobox');
      const button = screen.getByRole('button');

      // Elementos conectados deberían tener estilo azul
      expect(input).toHaveClass('border-blue-300', 'bg-blue-50');
      expect(select).toHaveClass('border-blue-300', 'bg-blue-50');
      expect(button).toHaveClass('bg-blue-50', 'border-blue-300', 'text-blue-600');
    });

    test('botón de autocompletar debe mostrar tooltip contextual', () => {
      renderDimensionControl();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Autocompletar con tamaño ideal (Sincronizado)');
    });
  });

  describe('Equivalencias de Unidades', () => {
    test('debe mostrar equivalencia px cuando usa %', async () => {
      renderDimensionControl({ 
        value: '50%',
        containerSize: 800
      });

      // Debería mostrar equivalencia en px
      await waitFor(() => {
        const equivalence = screen.getByText(/≈.*px/);
        expect(equivalence).toBeInTheDocument();
      });
    });

    test('debe mostrar equivalencia % cuando usa px', async () => {
      renderDimensionControl({ 
        value: '400px',
        containerSize: 800
      });

      // Debería mostrar equivalencia en %
      await waitFor(() => {
        const equivalence = screen.getByText(/≈.*%/);
        expect(equivalence).toBeInTheDocument();
      });
    });

    test('debe usar convertToUnit del hook para equivalencias', async () => {
      const mockConvert = jest.fn(() => 50);
      
      // Mock del hook useDimensionSync
      jest.doMock('../hooks/useDimensionSync.js', () => ({
        useDimensionSync: () => ({
          dimensions: {},
          updateDimension: jest.fn(),
          convertToUnit: mockConvert,
          isConnected: true,
          syncInfo: { updateCount: 0 }
        })
      }));

      renderDimensionControl({ value: '100px' });

      // La función convertToUnit del hook debería ser llamada para equivalencias
      await waitFor(() => {
        expect(mockConvert).toHaveBeenCalled();
      });
    });
  });

  describe('Autocompletado', () => {
    test('debe usar handleAutocompleteSize para autocompletado', async () => {
      renderDimensionControl({ componentType: 'button' });

      const button = screen.getByRole('button');
      
      // Simular click en autocompletar
      await act(async () => {
        fireEvent.click(button);
        await waitForSync();
      });

      // Debería haber aplicado un valor (handleAutocompleteSize devuelve valores según componentType)
      const input = screen.getByRole('spinbutton');
      expect(input.value).not.toBe('');
    });

    test('debe emitir cambio a través de updateDimension', async () => {
      const events = [];
      const dimensionManager = getDimensionManager();
      
      const unsubscribe = dimensionManager.subscribe((event) => {
        if (event.source === 'autocomplete') {
          events.push(event);
        }
      });

      renderDimensionControl();

      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.click(button);
        await waitForSync();
      });

      // Debería haber emitido evento con source autocomplete
      expect(events.length).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe('Sincronización Bidireccional', () => {
    test('cambio local debe sincronizar con manager', async () => {
      const events = [];
      const dimensionManager = getDimensionManager();
      
      const unsubscribe = dimensionManager.subscribe((event) => {
        events.push(event);
      });

      renderDimensionControl();

      const input = screen.getByRole('spinbutton');
      
      // Cambio local
      await act(async () => {
        fireEvent.change(input, { target: { value: '180' } });
        fireEvent.blur(input);
        await waitForSync();
      });

      // Verificar que se emitió al DimensionManager
      const changeEvent = events.find(e => 
        e.componentId === 'comp-1' && 
        e.property === 'width' && 
        e.value === '180px'
      );
      expect(changeEvent).toBeDefined();

      unsubscribe();
    });

    test('cambio externo debe actualizar UI', async () => {
      renderDimensionControl();

      const dimensionManager = getDimensionManager();
      const input = screen.getByRole('spinbutton');
      
      // Cambio externo
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-1',
          'width',
          '320px',
          'desktop',
          'external'
        );
        await waitForSync();
      });

      // Verificar que el input se actualizó
      await waitFor(() => {
        expect(input.value).toBe('320');
      });
    });

    test('debe evitar bucles infinitos', async () => {
      const onChange = jest.fn();
      renderDimensionControl({ onChange });

      const dimensionManager = getDimensionManager();
      const input = screen.getByRole('spinbutton');
      
      // Múltiples cambios rápidos
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          fireEvent.change(input, { target: { value: `${100 + i * 10}` } });
          fireEvent.blur(input);
        }
        await waitForSync(200);
      });

      // onChange no debería haberse llamado excesivamente
      expect(onChange.mock.calls.length).toBeLessThan(10);
    });
  });
});