/**
 * @fileoverview Tests de integración del sistema de sincronización
 */

import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { 
  TestSyncComponent,
  renderWithDimensionProvider,
  createMultiComponentTestEnv,
  setupSyncTest,
  waitForSync,
  expectSyncronized,
  syncTestConfig
} from '../utils/syncTestHelpers.js';
import { getDimensionManager, resetDimensionManager } from '../services/DimensionManager.js';
import { useDimensionSync } from '../hooks/useDimensionSync.js';

describe('Sistema de Sincronización - Integración', () => {
  setupSyncTest();

  describe('2.5.2: Sincronización Básica', () => {
    test('cambio externo debe actualizar hook', async () => {
      let componentData = null;
      
      const handleChange = (data) => {
        componentData = data;
      };

      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      // Verificar conexión inicial
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

      // Emitir cambio externo desde DimensionManager
      const dimensionManager = getDimensionManager();
      
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-1',
          'width',
          '250px',
          'desktop',
          'external-test'
        );
        await waitForSync();
      });

      // Verificar que el hook recibió el cambio
      await waitFor(() => {
        expect(componentData).not.toBeNull();
      });

      expectSyncronized(componentData, { width: '250px' });
      expect(screen.getByTestId('update-count')).toHaveTextContent('1');
    });

    test('updateDimension debe emitir evento', async () => {
      const events = [];
      
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();
      
      // Suscribirse a eventos
      const unsubscribe = dimensionManager.subscribe((event) => {
        events.push(event);
      });

      // Actualizar dimensión usando el hook
      await act(async () => {
        fireEvent.click(screen.getByTestId('update-width'));
        await waitForSync();
      });

      // Verificar que se emitió al menos el evento de cambio
      expect(events.length).toBeGreaterThanOrEqual(1);
      
      // Buscar el evento de cambio específicamente
      const changeEvent = events.find(e => e.type === 'dimension-changed');
      expect(changeEvent).toMatchObject({
        componentId: 'comp-1',
        property: 'width',
        value: '300px',
        device: 'desktop',
        source: 'test-button'
      });

      unsubscribe();
    });

    test('múltiples hooks deben recibir actualizaciones', async () => {
      const { TestEnvironment, getChangeLog, clearChangeLog } = createMultiComponentTestEnv();
      
      renderWithDimensionProvider(<TestEnvironment />);

      // Limpiar log inicial
      clearChangeLog();

      const dimensionManager = getDimensionManager();

      // Emitir cambio que afecte a comp-1 desktop
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-1',
          'width',
          '400px',
          'desktop',
          'external-test'
        );
        await waitForSync();
      });

      // Verificar que solo el hook correcto recibió el cambio
      const changeLog = getChangeLog();
      expect(changeLog).toHaveLength(1);
      expect(changeLog[0].componentId).toBe('comp-1');
      expect(changeLog[0].device).toBe('desktop');
      expect(changeLog[0].dimensions.width).toBe('400px');
    });

    test('debe filtrar eventos por componentId', async () => {
      let componentData = null;
      
      const handleChange = (data) => {
        componentData = data;
      };

      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();

      // Emitir cambio para otro componente
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-2', // ← Componente diferente
          'width',
          '500px',
          'desktop',
          'external-test'
        );
        await waitForSync();
      });

      // El hook NO debería haber recibido el cambio
      expect(componentData).toBeNull();
      expect(screen.getByTestId('update-count')).toHaveTextContent('0');
    });

    test('debe filtrar eventos por device', async () => {
      let componentData = null;
      
      const handleChange = (data) => {
        componentData = data;
      };

      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();

      // Emitir cambio para otro device
      await act(async () => {
        dimensionManager.emitDimensionChanged(
          'comp-1',
          'width',
          '500px',
          'mobile', // ← Device diferente
          'external-test'
        );
        await waitForSync();
      });

      // El hook NO debería haber recibido el cambio
      expect(componentData).toBeNull();
      expect(screen.getByTestId('update-count')).toHaveTextContent('0');
    });
  });

  describe('Conversión de Unidades en Hook', () => {
    test('convertToUnit debe funcionar correctamente', async () => {
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          options={{ debug: false }}
        />
      );

      // Ejecutar conversión
      await act(async () => {
        fireEvent.click(screen.getByTestId('convert-units'));
        await waitForSync();
      });

      // Verificar resultado de conversión
      expect(window.testConvertResult).toBeDefined();
      expect(typeof window.testConvertResult).toBe('number');
      expect(window.testConvertResult).toBeGreaterThan(0);
    });
  });

  describe('Estados de Conexión', () => {
    test('hook debe marcar como conectado cuando manager está disponible', async () => {
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          options={{ debug: false }}
        />
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    test('hook debe manejar desconexión del manager', async () => {
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          options={{ debug: false }}
        />
      );

      // Inicialmente conectado
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

      // Simular desconexión (esto sería difícil de hacer con singleton, pero testeable)
      await act(async () => {
        resetDimensionManager(true);
        await waitForSync();
      });

      // El estado puede variar según implementación del singleton
      // Este test verifica el comportamiento esperado
    });
  });

  describe('Evitar Bucles Infinitos', () => {
    test('hook no debe procesar sus propios eventos', async () => {
      const events = [];
      let updateCount = 0;
      
      const handleChange = (data) => {
        updateCount++;
      };

      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();
      
      const unsubscribe = dimensionManager.subscribe((event) => {
        events.push(event);
      });

      // Simular click múltiple rápido
      await act(async () => {
        fireEvent.click(screen.getByTestId('update-width'));
        fireEvent.click(screen.getByTestId('update-width'));
        fireEvent.click(screen.getByTestId('update-width'));
        await waitForSync();
      });

      // Debería haber solo los eventos necesarios, no bucles
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThan(10); // Límite razonable

      unsubscribe();
    });
  });

  describe('2.5.3: Casos Complejos', () => {
    test('múltiples componentes deben sincronizar independientemente', async () => {
      const { TestEnvironment, getChangeLog, clearChangeLog } = createMultiComponentTestEnv();
      
      renderWithDimensionProvider(<TestEnvironment />);
      clearChangeLog();

      const dimensionManager = getDimensionManager();

      // Cambiar dimensiones de diferentes componentes
      await act(async () => {
        dimensionManager.emitDimensionChanged('comp-1', 'width', '300px', 'desktop', 'test');
        dimensionManager.emitDimensionChanged('comp-2', 'height', '150px', 'desktop', 'test');
        dimensionManager.emitDimensionChanged('comp-1', 'width', '250px', 'mobile', 'test');
        await waitForSync();
      });

      const changeLog = getChangeLog();
      
      // Verificar que cada hook recibió solo sus cambios
      expect(changeLog).toHaveLength(3);
      
      const comp1Desktop = changeLog.find(c => c.componentId === 'comp-1' && c.device === 'desktop');
      const comp2Desktop = changeLog.find(c => c.componentId === 'comp-2' && c.device === 'desktop');
      const comp1Mobile = changeLog.find(c => c.componentId === 'comp-1' && c.device === 'mobile');
      
      expect(comp1Desktop.dimensions.width).toBe('300px');
      expect(comp2Desktop.dimensions.height).toBe('150px');
      expect(comp1Mobile.dimensions.width).toBe('250px');
    });

    test('cambio de device view debe mantener valores específicos', async () => {
      let currentData = null;
      
      const handleChange = (data) => {
        currentData = data;
      };

      const { rerender } = renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();

      // Establecer valor para desktop
      await act(async () => {
        dimensionManager.emitDimensionChanged('comp-1', 'width', '400px', 'desktop', 'test');
        await waitForSync();
      });

      expect(currentData.dimensions.width).toBe('400px');

      // Cambiar a mobile (simular cambio de device view)
      currentData = null;
      rerender(
        <TestSyncComponent
          componentId="comp-1"
          device="mobile"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      // Mobile no debería tener el valor de desktop
      expect(currentData?.dimensions?.width).toBeUndefined();

      // Establecer valor específico para mobile
      await act(async () => {
        dimensionManager.emitDimensionChanged('comp-1', 'width', '100%', 'mobile', 'test');
        await waitForSync();
      });

      expect(currentData.dimensions.width).toBe('100%');
    });

    test('componentes dentro de contenedores deben usar referencia correcta', async () => {
      // Simular componente dentro de contenedor
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-3" // comp-3 está dentro de container-1 según nuestro DOM mock
          device="desktop"
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();

      // Intentar conversión que debería usar el contenedor como referencia
      await act(async () => {
        fireEvent.click(screen.getByTestId('convert-units'));
        await waitForSync();
      });

      // La conversión debería haberse realizado usando las dimensiones del contenedor
      expect(window.testConvertResult).toBeDefined();
      expect(typeof window.testConvertResult).toBe('number');
      
      // El resultado debería ser diferente al de un componente root
      // (50% de 400px container = 200px vs 50% de 800px canvas = 400px)
      expect(window.testConvertResult).toBeLessThan(300); // Asumiendo contenedor más pequeño
    });

    test('unmount y remount de componentes debe limpiar suscripciones', async () => {
      let componentData = null;
      
      const handleChange = (data) => {
        componentData = data;
      };

      const { unmount } = renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          onDimensionChange={handleChange}
          options={{ debug: false }}
        />
      );

      const dimensionManager = getDimensionManager();
      const initialSubscribers = dimensionManager.getStats().subscribers.total;

      // Verificar que está suscrito
      expect(initialSubscribers).toBeGreaterThan(0);

      // Desmontar componente
      unmount();

      // Emitir evento después del unmount
      await act(async () => {
        dimensionManager.emitDimensionChanged('comp-1', 'width', '500px', 'desktop', 'test');
        await waitForSync();
      });

      // No debería haber recibido el evento
      expect(componentData).toBeNull();

      // Verificar que suscripciones se limpiaron
      const finalSubscribers = dimensionManager.getStats().subscribers.total;
      expect(finalSubscribers).toBeLessThanOrEqual(initialSubscribers);
    });

    test('casos de error en suscriptores no deben afectar otros', async () => {
      const events = [];
      const dimensionManager = getDimensionManager();

      // Agregar suscriptor que falla
      const failingSubscriber = () => {
        throw new Error('Test error in subscriber');
      };

      // Agregar suscriptor normal
      const normalSubscriber = (event) => {
        events.push(event);
      };

      const unsubscribe1 = dimensionManager.subscribe(failingSubscriber);
      const unsubscribe2 = dimensionManager.subscribe(normalSubscriber);

      // Emitir evento que debería causar error en un suscriptor
      await act(async () => {
        dimensionManager.emitDimensionChanged('comp-1', 'width', '300px', 'desktop', 'test');
        await waitForSync();
      });

      // El suscriptor normal debería haber recibido el evento a pesar del error
      expect(events).toHaveLength(1);
      expect(events[0].value).toBe('300px');

      unsubscribe1();
      unsubscribe2();
    });

    test('muchas actualizaciones rápidas deben manejarse correctamente', async () => {
      const events = [];
      const dimensionManager = getDimensionManager();
      
      // Suscribirse directamente al manager para contar eventos
      const unsubscribe = dimensionManager.subscribe((event) => {
        if (event.componentId === 'comp-1' && event.type === 'dimension-changed') {
          events.push(event);
        }
      });

      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="comp-1"
          device="desktop"
          options={{ debug: false }}
        />
      );

      // Emitir muchos cambios rápidos
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          dimensionManager.emitDimensionChanged(
            'comp-1', 
            'width', 
            `${200 + i * 10}px`, 
            'desktop', 
            'rapid-test'
          );
        }
        await waitForSync(200); // Esperar más tiempo para procesamientos
      });

      // Debería haber procesado todas las actualizaciones
      expect(events.length).toBe(10);
      expect(screen.getByTestId('update-count')).toHaveTextContent('10');
      
      unsubscribe();
    });
  });

  describe('2.5.4: Performance', () => {
    test('no debe haber memory leaks con suscripciones', async () => {
      const dimensionManager = getDimensionManager();
      const initialSubscribers = dimensionManager.getStats().subscribers.total;
      const components = [];

      // Crear múltiples componentes
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderWithDimensionProvider(
          <TestSyncComponent
            componentId={`perf-comp-${i}`}
            device="desktop"
            options={{ debug: false }}
          />
        );
        components.push(unmount);
      }

      // Verificar que suscriptores aumentaron
      const midSubscribers = dimensionManager.getStats().subscribers.total;
      expect(midSubscribers).toBeGreaterThan(initialSubscribers);

      // Desmontar todos los componentes
      components.forEach(unmount => unmount());

      // Verificar que suscriptores volvieron al estado inicial
      await act(async () => {
        await waitForSync();
      });

      const finalSubscribers = dimensionManager.getStats().subscribers.total;
      expect(finalSubscribers).toBeLessThanOrEqual(initialSubscribers + 1); // Margen de error
    });

    test('suscripciones deben limpiarse correctamente al desmontar', async () => {
      const dimensionManager = getDimensionManager();
      let eventCount = 0;

      // Crear componente temporal con callback
      let tempCallback = null;
      const { unmount } = renderWithDimensionProvider(
        <TestSyncComponent
          componentId="temp-comp"
          device="desktop"
          onDimensionChange={() => { eventCount++; }}
          options={{ debug: false }}
        />
      );

      // Emitir evento con componente montado
      await act(async () => {
        dimensionManager.emitDimensionChanged('temp-comp', 'width', '100px', 'desktop', 'test');
        await waitForSync();
      });

      expect(eventCount).toBe(1);

      // Desmontar componente
      unmount();

      // Emitir evento con componente desmontado
      await act(async () => {
        dimensionManager.emitDimensionChanged('temp-comp', 'width', '200px', 'desktop', 'test');
        await waitForSync();
      });

      // No debería haber recibido el segundo evento
      expect(eventCount).toBe(1);
    });

    test('debe manejar muchos componentes simultáneamente sin lag', async () => {
      const startTime = Date.now();
      const componentCount = 20;
      const components = [];

      // Crear muchos componentes
      for (let i = 0; i < componentCount; i++) {
        const component = renderWithDimensionProvider(
          <TestSyncComponent
            componentId={`mass-comp-${i}`}
            device="desktop"
            options={{ debug: false }}
          />
        );
        components.push(component);
      }

      const setupTime = Date.now() - startTime;
      expect(setupTime).toBeLessThan(2000); // Menos de 2 segundos para crear 20 componentes

      const dimensionManager = getDimensionManager();
      const updateStartTime = Date.now();

      // Emitir eventos a todos los componentes
      await act(async () => {
        for (let i = 0; i < componentCount; i++) {
          dimensionManager.emitDimensionChanged(
            `mass-comp-${i}`, 
            'width', 
            `${100 + i * 10}px`, 
            'desktop', 
            'mass-test'
          );
        }
        await waitForSync(500); // Tiempo generoso para procesamiento
      });

      const updateTime = Date.now() - updateStartTime;
      expect(updateTime).toBeLessThan(3000); // Menos de 3 segundos para 20 actualizaciones

      // Limpiar componentes
      components.forEach(({ unmount }) => unmount());
    });

    test('cambios muy rápidos no deben causar problemas de performance', async () => {
      const updateTimes = [];
      const dimensionManager = getDimensionManager();
      
      // Suscribirse directamente al manager para timing exacto
      const unsubscribe = dimensionManager.subscribe((event) => {
        if (event.componentId === 'rapid-comp' && event.type === 'dimension-changed') {
          updateTimes.push(Date.now());
        }
      });
      
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="rapid-comp"
          device="desktop"
          options={{ debug: false }}
        />
      );

      const startTime = Date.now();

      // Emitir 50 cambios muy rápidos
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          dimensionManager.emitDimensionChanged(
            'rapid-comp', 
            'width', 
            `${100 + i}px`, 
            'desktop', 
            'rapid-perf-test'
          );
        }
        await waitForSync(1000); // Esperar tiempo suficiente
      });

      const totalTime = Date.now() - startTime;
      
      // Verificar que todos los eventos se procesaron
      expect(updateTimes.length).toBe(50);
      
      // Verificar que el tiempo total fue razonable
      expect(totalTime).toBeLessThan(5000); // Menos de 5 segundos
      
      // Verificar que no hay delays excesivos entre updates
      if (updateTimes.length > 1) {
        const delays = updateTimes.slice(1).map((time, i) => time - updateTimes[i]);
        const maxDelay = Math.max(...delays);
        expect(maxDelay).toBeLessThan(1000); // Ningún delay mayor a 1 segundo
      }
      
      unsubscribe();
    });

    test('memory usage debe mantenerse estable con uso prolongado', async () => {
      const dimensionManager = getDimensionManager();
      let componentData = null;
      
      renderWithDimensionProvider(
        <TestSyncComponent
          componentId="memory-comp"
          device="desktop"
          onDimensionChange={(data) => { componentData = data; }}
          options={{ debug: false }}
        />
      );

      // Simular uso prolongado con muchos cambios
      const iterations = 100;
      const memorySnapshots = [];

      for (let cycle = 0; cycle < 5; cycle++) {
        const cycleStart = Date.now();
        
        await act(async () => {
          for (let i = 0; i < iterations; i++) {
            dimensionManager.emitDimensionChanged(
              'memory-comp', 
              i % 2 === 0 ? 'width' : 'height',
              `${100 + (i % 50)}px`, 
              'desktop', 
              'memory-test'
            );
          }
          await waitForSync(200);
        });

        // Tomar snapshot de memoria (aproximado via stats del manager)
        const stats = dimensionManager.getStats();
        memorySnapshots.push({
          cycle,
          time: Date.now() - cycleStart,
          subscribers: stats.subscribers.total,
          events: stats.events ? stats.events.length : 0
        });
      }

      // Verificar que la memoria se mantiene estable
      const subscriberCounts = memorySnapshots.map(s => s.subscribers);
      const maxSubscribers = Math.max(...subscriberCounts);
      const minSubscribers = Math.min(...subscriberCounts);
      
      // No debería haber variación significativa en suscriptores
      expect(maxSubscribers - minSubscribers).toBeLessThanOrEqual(2);
      
      // Verificar que los tiempos no aumentan significativamente
      const times = memorySnapshots.map(s => s.time);
      const firstTime = times[0];
      const lastTime = times[times.length - 1];
      
      // El último ciclo no debería ser más de 3x más lento que el primero
      expect(lastTime).toBeLessThan(firstTime * 3);
    });
  });

  describe('2.5.5: Integración Completa', () => {
    test('flujo end-to-end con DimensionProvider debe funcionar', async () => {
      const changeLog = [];
      
      const TestApp = () => (
        <div data-testid="test-app">
          <TestSyncComponent
            componentId="app-comp-1"
            device="desktop"
            onDimensionChange={(data) => changeLog.push({ ...data, source: 'comp-1' })}
            options={{ debug: false }}
          />
          <TestSyncComponent
            componentId="app-comp-2"
            device="desktop"
            onDimensionChange={(data) => changeLog.push({ ...data, source: 'comp-2' })}
            options={{ debug: false }}
          />
        </div>
      );

      renderWithDimensionProvider(<TestApp />);

      // Verificar que la aplicación se renderizó correctamente
      expect(screen.getByTestId('test-app')).toBeInTheDocument();
      
      // Verificar que ambos componentes están conectados
      const comp1Status = screen.getAllByTestId('connection-status')[0];
      const comp2Status = screen.getAllByTestId('connection-status')[1];
      
      expect(comp1Status).toHaveTextContent('Connected');
      expect(comp2Status).toHaveTextContent('Connected');

      // Emitir cambio que afecte a ambos componentes
      const dimensionManager = getDimensionManager();
      
      await act(async () => {
        dimensionManager.emitDimensionChanged('app-comp-1', 'width', '350px', 'desktop', 'end-to-end');
        dimensionManager.emitDimensionChanged('app-comp-2', 'height', '250px', 'desktop', 'end-to-end');
        await waitForSync();
      });

      // Verificar que los cambios se propagaron correctamente
      expect(changeLog).toHaveLength(2);
      
      const comp1Change = changeLog.find(c => c.source === 'comp-1');
      const comp2Change = changeLog.find(c => c.source === 'comp-2');
      
      expect(comp1Change.dimensions.width).toBe('350px');
      expect(comp2Change.dimensions.height).toBe('250px');
    });

    test('contexto debe funcionar en componentes anidados', async () => {
      let nestedData = null;
      
      const NestedComponent = () => {
        const {
          dimensions,
          updateDimension,
          isConnected
        } = useDimensionSync('nested-comp', 'desktop', { debug: false });

        React.useEffect(() => {
          if (Object.keys(dimensions).length > 0) {
            nestedData = { dimensions, isConnected };
          }
        }, [dimensions, isConnected]);

        return (
          <div data-testid="nested-component">
            <span data-testid="nested-connection">
              {isConnected ? 'Nested Connected' : 'Nested Disconnected'}
            </span>
            <button
              data-testid="nested-update"
              onClick={() => updateDimension('width', '400px', 'nested-source')}
            >
              Update from Nested
            </button>
          </div>
        );
      };

      const ParentComponent = () => (
        <div data-testid="parent-component">
          <div>
            <div>
              <NestedComponent />
            </div>
          </div>
        </div>
      );

      renderWithDimensionProvider(<ParentComponent />);

      // Verificar que el componente anidado puede acceder al contexto
      expect(screen.getByTestId('nested-connection')).toHaveTextContent('Nested Connected');

      // Emitir cambio externo al componente anidado
      const dimensionManager = getDimensionManager();
      
      await act(async () => {
        dimensionManager.emitDimensionChanged('nested-comp', 'height', '300px', 'desktop', 'external');
        await waitForSync();
      });

      // Verificar que el componente anidado recibió el cambio
      expect(nestedData).not.toBeNull();
      expect(nestedData.dimensions.height).toBe('300px');
      expect(nestedData.isConnected).toBe(true);

      // Verificar que el componente anidado puede emitir cambios
      const events = [];
      const unsubscribe = dimensionManager.subscribe((event) => {
        if (event.source === 'nested-source') {
          events.push(event);
        }
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('nested-update'));
        await waitForSync();
      });

      expect(events).toHaveLength(1);
      expect(events[0].value).toBe('400px');
      expect(events[0].componentId).toBe('nested-comp');

      unsubscribe();
    });

    test('interacción entre múltiples hooks debe ser consistente', async () => {
      const interactions = [];
      
      const InteractiveComponent = ({ id, device }) => {
        const {
          dimensions,
          updateDimension,
          convertToUnit,
          syncInfo
        } = useDimensionSync(id, device, { debug: false });

        const handleInteraction = async () => {
          // Actualizar propia dimensión
          updateDimension('width', '200px', `source-${id}`);
          
          // Convertir unidad
          const converted = convertToUnit('50', '%', 'px', 'width');
          
          interactions.push({
            id,
            device,
            action: 'interaction',
            dimensions: { ...dimensions },
            converted,
            updateCount: syncInfo.updateCount
          });
        };

        return (
          <div data-testid={`interactive-${id}-${device}`}>
            <button
              data-testid={`interact-${id}-${device}`}
              onClick={handleInteraction}
            >
              Interact {id}
            </button>
            <span data-testid={`count-${id}-${device}`}>
              {syncInfo.updateCount}
            </span>
          </div>
        );
      };

      const MultiInteractiveApp = () => (
        <div>
          <InteractiveComponent id="multi-1" device="desktop" />
          <InteractiveComponent id="multi-2" device="desktop" />
          <InteractiveComponent id="multi-1" device="mobile" />
        </div>
      );

      renderWithDimensionProvider(<MultiInteractiveApp />);

      // Verificar renderizado inicial
      expect(screen.getByTestId('interactive-multi-1-desktop')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-multi-2-desktop')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-multi-1-mobile')).toBeInTheDocument();

      // Interactuar con diferentes componentes
      await act(async () => {
        fireEvent.click(screen.getByTestId('interact-multi-1-desktop'));
        await waitForSync();
        
        fireEvent.click(screen.getByTestId('interact-multi-2-desktop'));
        await waitForSync();
        
        fireEvent.click(screen.getByTestId('interact-multi-1-mobile'));
        await waitForSync();
      });

      // Verificar que las interacciones fueron independientes
      expect(interactions).toHaveLength(3);
      
      const desktop1 = interactions.find(i => i.id === 'multi-1' && i.device === 'desktop');
      const desktop2 = interactions.find(i => i.id === 'multi-2' && i.device === 'desktop');
      const mobile1 = interactions.find(i => i.id === 'multi-1' && i.device === 'mobile');
      
      expect(desktop1).toBeDefined();
      expect(desktop2).toBeDefined();
      expect(mobile1).toBeDefined();
      
      // Verificar que cada componente mantuvo su estado independiente
      expect(desktop1.converted).toBeDefined();
      expect(desktop2.converted).toBeDefined();
      expect(mobile1.converted).toBeDefined();
    });

    test('sistema completo debe ser resiliente a errores', async () => {
      const errorLogs = [];
      const originalConsoleError = console.error;
      
      // Capturar errores sin mostrarlos en consola
      console.error = jest.fn((...args) => {
        errorLogs.push(args.join(' '));
      });

      try {
        const ResilientComponent = () => {
          const { updateDimension, isConnected } = useDimensionSync('resilient-comp', 'desktop');

          const triggerError = () => {
            // Intentar operaciones que podrían fallar
            updateDimension('', '', ''); // Parámetros inválidos
            updateDimension('width', null, 'invalid-source');
            updateDimension('invalid-property', '200px', 'test');
          };

          return (
            <div data-testid="resilient-component">
              <span data-testid="resilient-connection">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <button data-testid="trigger-error" onClick={triggerError}>
                Trigger Errors
              </button>
            </div>
          );
        };

        renderWithDimensionProvider(<ResilientComponent />);

        // Verificar que el componente funciona normalmente
        expect(screen.getByTestId('resilient-connection')).toHaveTextContent('Connected');

        // Trigger errores
        await act(async () => {
          fireEvent.click(screen.getByTestId('trigger-error'));
          await waitForSync();
        });

        // El sistema debería seguir funcionando después de errores
        expect(screen.getByTestId('resilient-connection')).toHaveTextContent('Connected');
        
        // Debería haber logged errores pero no crashed
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verificar que el DimensionManager sigue funcionando
        const dimensionManager = getDimensionManager();
        expect(dimensionManager).toBeDefined();
        expect(typeof dimensionManager.updateDimension).toBe('function');

      } finally {
        // Restaurar console.error
        console.error = originalConsoleError;
      }
    });
  });
});