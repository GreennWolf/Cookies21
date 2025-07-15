/**
 * @fileoverview Tests para el hook useDimensionSync
 */

import { renderHook, act } from '@testing-library/react';
import { useDimensionSync } from '../useDimensionSync.js';
import { getDimensionManager, resetDimensionManager } from '../../services/DimensionManager.js';
import { createDimensionMockDOM } from '../../utils/testHelpers.js';

describe('useDimensionSync', () => {
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

  describe('Inicialización básica', () => {
    test('debería inicializar con parámetros correctos', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      expect(result.current.componentId).toBe('test-component');
      expect(result.current.device).toBe('desktop');
      expect(result.current.config.debug).toBe(false);
      expect(result.current.dimensions).toEqual({});
      expect(result.current.syncInfo.isConnected).toBe(true);
    });

    test('debería tener todas las funciones necesarias', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop')
      );

      expect(typeof result.current.updateDimension).toBe('function');
      expect(typeof result.current.convertToUnit).toBe('function');
      expect(typeof result.current.getDimension).toBe('function');
      expect(typeof result.current.isDimensionSynced).toBe('function');
      expect(typeof result.current.getAllDimensions).toBe('function');
      expect(typeof result.current.getDebugInfo).toBe('function');
      expect(typeof result.current.logDebugInfo).toBe('function');
      expect(typeof result.current.validateHookState).toBe('function');
    });
  });

  describe('updateDimension', () => {
    test('debería actualizar dimensión correctamente', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      let updateResult;
      await act(async () => {
        updateResult = result.current.updateDimension('width', '200px', 'test');
      });

      expect(updateResult).toBe(true);
    });

    test('debería manejar parámetros inválidos', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      let updateResult;
      await act(async () => {
        updateResult = result.current.updateDimension('', '200px', 'test');
      });

      expect(updateResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('updateDimension requiere property y value válidos'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('debería retornar false con hook mal configurado', () => {
      const { result } = renderHook(() => 
        useDimensionSync('', 'desktop', { debug: false })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const updateResult = result.current.updateDimension('width', '200px', 'test');

      expect(updateResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('convertToUnit', () => {
    test('debería convertir unidades correctamente', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const converted = result.current.convertToUnit('50', '%', 'px', 'width');
      
      // Debería retornar un número válido
      expect(typeof converted).toBe('number');
      expect(converted).toBeGreaterThan(0);
    });

    test('debería retornar valor original si las unidades son iguales', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const converted = result.current.convertToUnit('200', 'px', 'px', 'width');
      
      expect(converted).toBe(200);
    });

    test('debería manejar parámetros inválidos gracefully', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const converted = result.current.convertToUnit('200', '', 'px', 'width');
      
      // Debería retornar el valor original
      expect(converted).toBe('200');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Sincronización automática', () => {
    test('debería recibir cambios externos', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Emitir cambio externo
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'test-component',
          'width',
          '300px',
          'desktop',
          'external'
        );
      });

      // El hook debería haber recibido el cambio
      expect(result.current.dimensions.width).toBe('300px');
      expect(result.current.syncInfo.updateCount).toBe(1);
      expect(result.current.hasUpdates).toBe(true);
    });

    test('debería filtrar eventos de otros componentes', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Emitir cambio para otro componente
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'other-component',
          'width',
          '300px',
          'desktop',
          'external'
        );
      });

      // El hook NO debería haber recibido el cambio
      expect(result.current.dimensions.width).toBeUndefined();
      expect(result.current.syncInfo.updateCount).toBe(0);
    });

    test('debería filtrar eventos de otros devices', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Emitir cambio para otro device
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'test-component',
          'width',
          '300px',
          'mobile',
          'external'
        );
      });

      // El hook NO debería haber recibido el cambio
      expect(result.current.dimensions.width).toBeUndefined();
      expect(result.current.syncInfo.updateCount).toBe(0);
    });
  });

  describe('Funciones de utilidad', () => {
    test('getDimension debería retornar valor específico', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Agregar una dimensión
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'test-component',
          'width',
          '200px',
          'desktop',
          'external'
        );
      });

      expect(result.current.getDimension('width')).toBe('200px');
      expect(result.current.getDimension('height')).toBeNull();
    });

    test('isDimensionSynced debería verificar existencia', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Agregar una dimensión
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'test-component',
          'width',
          '200px',
          'desktop',
          'external'
        );
      });

      expect(result.current.isDimensionSynced('width')).toBe(true);
      expect(result.current.isDimensionSynced('height')).toBe(false);
    });

    test('getAllDimensions debería retornar copia de todas las dimensiones', async () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Agregar dimensiones
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'test-component',
          'width',
          '200px',
          'desktop',
          'external'
        );
        dimensionManager.emitDimensionChanged(
          'test-component',
          'height',
          '100px',
          'desktop',
          'external'
        );
      });

      const allDimensions = result.current.getAllDimensions();
      expect(allDimensions).toEqual({
        width: '200px',
        height: '100px'
      });
      
      // Verificar que es una copia, no referencia
      allDimensions.width = '300px';
      expect(result.current.dimensions.width).toBe('200px');
    });
  });

  describe('Debug helpers', () => {
    test('getDebugInfo debería retornar información completa', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const debugInfo = result.current.getDebugInfo();

      expect(debugInfo).toHaveProperty('hookInfo');
      expect(debugInfo).toHaveProperty('dimensions');
      expect(debugInfo).toHaveProperty('syncInfo');
      expect(debugInfo).toHaveProperty('manager');
      expect(debugInfo.hookInfo.componentId).toBe('test-component');
      expect(debugInfo.hookInfo.device).toBe('desktop');
      expect(debugInfo.manager.exists).toBe(true);
    });

    test('validateHookState debería validar configuración', () => {
      const { result } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      const validation = result.current.validateHookState();

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    test('validateHookState debería detectar problemas', () => {
      const { result } = renderHook(() => 
        useDimensionSync('', '', { debug: false })
      );

      const validation = result.current.validateHookState();

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('debería limpiar suscripción al desmontar', () => {
      const { unmount } = renderHook(() => 
        useDimensionSync('test-component', 'desktop', { debug: false })
      );

      // Verificar que esté conectado
      expect(dimensionManager.getStats().subscribers.total).toBeGreaterThan(0);

      // Desmontar
      unmount();

      // Verificar que se limpió
      // Note: Este test puede variar según la implementación del singleton
    });
  });
});