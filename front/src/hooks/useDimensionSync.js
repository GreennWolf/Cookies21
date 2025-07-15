/**
 * @fileoverview Hook personalizado para sincronización de dimensiones
 * @module useDimensionSync
 * @author Banner Editor Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDimensionManager } from '../services/DimensionManager.js';
import { useDimensionManager } from '../contexts/DimensionContext.jsx';

/**
 * Hook que proporciona sincronización bidireccional de dimensiones
 * para un componente específico en un dispositivo específico
 * 
 * @param {string} componentId - ID del componente a sincronizar
 * @param {string} device - Dispositivo ('desktop', 'tablet', 'mobile')
 * @param {Object} options - Opciones del hook
 * @param {boolean} options.debug - Habilitar logging de debug
 * @param {boolean} options.enableSync - Habilitar sincronización automática
 * @returns {Object} Objeto con estado y funciones de sincronización
 * 
 * @example
 * const { dimensions, updateDimension, convertToUnit } = useDimensionSync('comp-123', 'desktop');
 * 
 * // Actualizar dimensión
 * updateDimension('width', '200px', 'input-panel');
 * 
 * // Convertir unidades
 * const converted = convertToUnit('50%', '%', 'px', 'width');
 */
export function useDimensionSync(componentId, device, options = {}) {
  // Configuración del hook
  const config = useMemo(() => ({
    debug: options.debug ?? process.env.NODE_ENV === 'development',
    enableSync: options.enableSync ?? true,
    ...options
  }), [options]);

  // Referencias para evitar recreación innecesaria
  const dimensionManagerRef = useRef(null);
  const lastUpdateSourceRef = useRef(null);
  
  // Estado local sincronizado para el componente/device específico
  const [localDimensions, setLocalDimensions] = useState({});
  const [syncInfo, setSyncInfo] = useState({
    isConnected: false,
    lastUpdate: null,
    updateCount: 0
  });

  // Obtener instancia del DimensionManager desde el contexto
  let contextDimensionManager = null;
  try {
    contextDimensionManager = useDimensionManager();
  } catch (error) {
    console.warn('⚠️ useDimensionSync: Error al obtener contexto, usando método directo:', error.message);
  }
  
  console.log('🔗 useDimensionSync: DimensionManager obtenido del contexto', {
    manager: !!contextDimensionManager,
    contextType: typeof contextDimensionManager,
    componentId,
    device
  });
  
  // Establecer referencia al DimensionManager - PRIORIZAR CONTEXTO
  useEffect(() => {
    console.log('🔧 useDimensionSync: Configurando DimensionManager', {
      hasContext: !!contextDimensionManager,
      currentRef: !!dimensionManagerRef.current
    });
    
    // PRIORIDAD 1: Usar manager del contexto si está disponible
    if (contextDimensionManager && typeof contextDimensionManager.updateDimension === 'function') {
      dimensionManagerRef.current = contextDimensionManager;
      
      console.log('✅ useDimensionSync: Usando DimensionManager del contexto', {
        componentId,
        device,
        hasUpdateDimension: typeof contextDimensionManager.updateDimension,
        hasConvertToUnit: typeof contextDimensionManager.convertToUnit
      });
      
      setSyncInfo(prev => ({
        ...prev,
        isConnected: true
      }));
      return;
    }
    
    // PRIORIDAD 2: Solo crear manager directo si el contexto no funciona
    if (!dimensionManagerRef.current) {
      try {
        const manager = getDimensionManager({ 
          debug: config.debug, 
          enableValidation: false,
          enableLogging: true 
        });
        
        if (manager && typeof manager.updateDimension === 'function') {
          dimensionManagerRef.current = manager;
          
          console.log('✅ useDimensionSync: DimensionManager directo creado como fallback', {
            componentId,
            device,
            hasUpdateDimension: typeof manager.updateDimension,
            hasConvertToUnit: typeof manager.convertToUnit
          });
          
          setSyncInfo(prev => ({
            ...prev,
            isConnected: true
          }));
        } else {
          console.error('❌ useDimensionSync: Manager sin métodos', manager);
          setSyncInfo(prev => ({ ...prev, isConnected: false }));
        }
      } catch (error) {
        console.error('❌ useDimensionSync: Error al crear DimensionManager:', error);
        setSyncInfo(prev => ({ ...prev, isConnected: false }));
      }
    }
  }, [componentId, device, config.debug, contextDimensionManager]);

  // Suscripción para sincronización automática con el DimensionManager
  useEffect(() => {
    if (!config.enableSync || !componentId || !device || !dimensionManagerRef.current) {
      return;
    }

    // Obtener dimensiones actuales del DimensionManager al montar
    const currentDimensions = dimensionManagerRef.current.getDimensions(componentId, device);
    if (currentDimensions && Object.keys(currentDimensions).length > 0) {
      setLocalDimensions(currentDimensions);
      if (config.debug) {
        console.log('🔗 useDimensionSync: Dimensiones iniciales cargadas', {
          componentId,
          device,
          dimensions: currentDimensions
        });
      }
    }

    // Función suscriptora que filtra eventos solo para este componente/device
    const handleDimensionEvent = (event) => {
      // Filtrar solo eventos relevantes para este componente y device
      if (event.componentId !== componentId || event.device !== device) {
        return;
      }
      
      // Evitar procesar eventos que originamos nosotros mismos
      if (lastUpdateSourceRef.current && 
          event.source === lastUpdateSourceRef.current && 
          Date.now() - (lastUpdateSourceRef.current?.timestamp || 0) < 100) {
        if (config.debug) {
          console.log('🔄 useDimensionSync: Ignorando evento propio', {
            componentId,
            device,
            property: event.property,
            source: event.source
          });
        }
        return;
      }

      if (config.debug) {
        console.log('🔄 useDimensionSync: Recibiendo actualización externa', {
          componentId,
          device,
          property: event.property,
          value: event.value,
          source: event.source
        });
      }

      // Actualizar estado local con el nuevo valor
      setLocalDimensions(prev => ({
        ...prev,
        [event.property]: event.value
      }));

      // Actualizar información de sincronización
      setSyncInfo(prev => ({
        ...prev,
        lastUpdate: {
          property: event.property,
          value: event.value,
          source: event.source,
          timestamp: Date.now()
        },
        updateCount: prev.updateCount + 1
      }));
    };

    // Suscribirse a eventos del DimensionManager
    const unsubscribe = dimensionManagerRef.current.subscribe(handleDimensionEvent);
    
    // Marcar como conectado
    setSyncInfo(prev => ({
      ...prev,
      isConnected: true
    }));

    if (config.debug) {
      console.log('🔗 useDimensionSync: Suscripción activada', {
        componentId,
        device
      });
    }

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      setSyncInfo(prev => ({
        ...prev,
        isConnected: false
      }));
      
      if (config.debug) {
        console.log('🧹 useDimensionSync: Suscripción limpiada', {
          componentId,
          device
        });
      }
    };
  }, [componentId, device, config.enableSync, config.debug]);
  // Función para actualizar una dimensión específica - SIMPLIFICADA
  const updateDimension = useCallback((property, value, source = 'hook') => {
    if (!componentId || !device || !property || value === undefined || value === null) {
      console.error('useDimensionSync: updateDimension parámetros inválidos', {
        componentId, device, property, value
      });
      return false;
    }

    // Actualizar estado local inmediatamente
    setLocalDimensions(prev => ({
      ...prev,
      [property]: value
    }));

    console.log(`✅ useDimensionSync: updateDimension - ${componentId}.${property} = ${value} (${source})`);

    // Intentar usar DimensionManager si está disponible
    if (dimensionManagerRef.current && typeof dimensionManagerRef.current.updateDimension === 'function') {
      try {
        const result = dimensionManagerRef.current.updateDimension(componentId, property, value, device, source);
        if (result && result.success) {
          console.log('✅ useDimensionSync: DimensionManager actualizado exitosamente');
        }
      } catch (error) {
        console.warn('⚠️ useDimensionSync: Error con DimensionManager, pero continuando:', error.message);
      }
    }

    return true;
  }, [componentId, device]);
  
  // Función para convertir valores entre unidades - MEJORADA CON DIMENSIONMANAGER
  const convertToUnit = useCallback((value, fromUnit, toUnit, property) => {
    if (!value || fromUnit === toUnit) {
      return parseFloat(value) || 0;
    }

    const numValue = parseFloat(value) || 0;
    
    console.log(`🔄 useDimensionSync: Convirtiendo ${numValue}${fromUnit} → ${toUnit} para ${property}`);

    // PRIORIDAD 1: Usar DimensionManager si está disponible
    if (dimensionManagerRef.current && typeof dimensionManagerRef.current.convertToUnit === 'function') {
      try {
        console.log(`🔧 Intentando conversión con DimensionManager:`, {
          value, fromUnit, toUnit, property, componentId, device
        });
        
        const result = dimensionManagerRef.current.convertToUnit(value, fromUnit, toUnit, componentId, {
          property,
          device
        });
        
        console.log(`📊 DimensionManager resultado:`, { result, type: typeof result, isNaN: isNaN(result) });
        
        if (result !== null && result !== undefined && !isNaN(result)) {
          console.log(`✅ Conversión vía DimensionManager: ${numValue}${fromUnit} → ${result}${toUnit}`);
          return result;
        } else {
          console.log(`❌ DimensionManager retornó valor inválido, usando fallback`);
        }
      } catch (error) {
        console.log('⚠️ Error en conversión con DimensionManager, usando fallback:', error);
      }
    } else {
      console.log(`⚠️ DimensionManager no disponible o sin método convertToUnit`);
    }

    // PRIORIDAD 2: Fallback MEJORADO con dimensiones reales del canvas
    console.log(`🔧 Usando fallback local para conversión ${fromUnit} → ${toUnit}`);
    
    // Obtener dimensiones reales del canvas según el dispositivo actual
    const getCanvasRealSize = () => {
      const canvasElement = document.querySelector('.banner-container');
      if (!canvasElement) {
        console.warn('⚠️ No se encontró .banner-container, usando dimensiones de dispositivo');
        // Usar dimensiones reales del dispositivo como fallback
        const deviceDimensions = {
          'mobile': { width: 375, height: 667 },
          'tablet': { width: 768, height: 1024 },
          'desktop': { width: 1200, height: 800 }
        };
        const currentDevice = device || 'desktop';
        return deviceDimensions[currentDevice] || deviceDimensions.desktop;
      }
      
      return {
        width: canvasElement.clientWidth,
        height: canvasElement.clientHeight
      };
    };
    
    const canvasSize = getCanvasRealSize();
    const containerSize = property === 'width' || property.includes('width') 
      ? canvasSize.width 
      : canvasSize.height;
    
    console.log(`📐 Dimensiones del canvas para conversión:`, {
      canvasSize,
      propertyUsed: property,
      containerSizeUsed: containerSize,
      device
    });
    
    if (fromUnit === 'px' && toUnit === '%') {
      if (containerSize <= 0) {
        console.error('❌ Tamaño del contenedor inválido para conversión px→%');
        return 0;
      }
      
      const percentage = (numValue / containerSize) * 100;
      console.log(`✅ Conversión px→%: ${numValue}px → ${percentage.toFixed(1)}% (canvas: ${containerSize}px)`);
      return Math.round(percentage * 10) / 10;
      
    } else if (fromUnit === '%' && toUnit === 'px') {
      const pixels = (numValue * containerSize) / 100;
      console.log(`✅ Conversión %→px: ${numValue}% → ${Math.round(pixels)}px (canvas: ${containerSize}px)`);
      return Math.round(pixels);
    }
    
    return numValue;
  }, [componentId, device]);

  // Optimización: Obtener dimensión específica de manera eficiente
  const getDimension = useCallback((property) => {
    return localDimensions[property] || null;
  }, [localDimensions]);

  // Optimización: Verificar si una dimensión está sincronizada
  const isDimensionSynced = useCallback((property) => {
    return localDimensions.hasOwnProperty(property);
  }, [localDimensions]);

  // Función de utilidad para obtener todas las dimensiones disponibles
  const getAllDimensions = useCallback(() => {
    return { ...localDimensions };
  }, [localDimensions]);

  // Debug helpers para facilitar el debugging
  const getDebugInfo = useCallback(() => {
    return {
      hookInfo: {
        componentId,
        device,
        config,
        isConnected: syncInfo.isConnected,
        updateCount: syncInfo.updateCount
      },
      dimensions: { ...localDimensions },
      syncInfo: { ...syncInfo },
      manager: {
        exists: !!dimensionManagerRef.current,
        stats: dimensionManagerRef.current?.getStats?.() || null
      },
      lastSource: lastUpdateSourceRef.current
    };
  }, [componentId, device, config, syncInfo, localDimensions]);

  // Función para logging manual de debug
  const logDebugInfo = useCallback(() => {
    const debugInfo = getDebugInfo();
    console.log('🔍 useDimensionSync: Debug Info', debugInfo);
    return debugInfo;
  }, [getDebugInfo]);

  // Función para validar el estado del hook
  const validateHookState = useCallback(() => {
    const issues = [];
    
    if (!componentId) {
      issues.push('componentId es requerido');
    }
    
    if (!device) {
      issues.push('device es requerido');
    }
    
    if (!dimensionManagerRef.current) {
      issues.push('DimensionManager no está disponible');
    }
    
    if (config.enableSync && !syncInfo.isConnected) {
      issues.push('Sincronización habilitada pero no conectada');
    }
    
    const isValid = issues.length === 0;
    
    if (config.debug && !isValid) {
      console.warn('⚠️ useDimensionSync: Problemas detectados', {
        componentId,
        device,
        issues
      });
    }
    
    return {
      isValid,
      issues,
      recommendations: isValid ? [] : [
        'Verificar que componentId y device sean válidos',
        'Verificar que DimensionManager esté inicializado',
        'Verificar que la sincronización esté habilitada'
      ]
    };
  }, [componentId, device, config, syncInfo]);

  // Cleanup automático cuando el hook se desmonta
  useEffect(() => {
    return () => {
      if (config.debug) {
        console.log('🧹 useDimensionSync: Hook desmontado', {
          componentId,
          device,
          finalDimensions: localDimensions,
          finalSyncInfo: syncInfo
        });
      }
    };
  }, [componentId, device, localDimensions, syncInfo, config.debug]);

  // Memoizar el objeto de retorno para evitar re-renders innecesarios
  const hookResult = useMemo(() => ({
    // Estado
    dimensions: localDimensions,
    syncInfo,
    
    // Funciones principales
    updateDimension,
    convertToUnit,
    
    // Funciones de utilidad
    getDimension,
    isDimensionSynced,
    getAllDimensions,
    
    // Debug helpers
    getDebugInfo,
    logDebugInfo,
    validateHookState,
    
    // Información de debug
    componentId,
    device,
    config,
    
    // Estado de conexión mejorado - verificar manager real
    isConnected: syncInfo.isConnected || (!!dimensionManagerRef.current && typeof dimensionManagerRef.current.updateDimension === 'function'),
    hasUpdates: syncInfo.updateCount > 0
  }), [
    localDimensions,
    syncInfo,
    updateDimension,
    convertToUnit,
    getDimension,
    isDimensionSynced,
    getAllDimensions,
    getDebugInfo,
    logDebugInfo,
    validateHookState,
    componentId,
    device,
    config,
    dimensionManagerRef.current // Agregar referencia para reactualizar isConnected
  ]);

  return hookResult;
}

export default useDimensionSync;