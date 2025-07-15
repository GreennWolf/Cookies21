/**
 * Hook simplificado para sincronización de dimensiones
 * Versión temporal mientras se resuelven los problemas del DimensionManager
 */

import { useState, useCallback } from 'react';

export function useSimpleDimensionSync(componentId, device) {
  const [dimensions, setDimensions] = useState({});
  
  // Función simplificada para actualizar dimensiones
  const updateDimension = useCallback((property, value, source = 'manual') => {
    if (!componentId || !property) {
      console.error('useSimpleDimensionSync: updateDimension requiere componentId y property');
      return false;
    }
    
    console.log(`🔄 SimpleSync: Actualizando ${componentId}.${property} = ${value} (${source})`);
    
    setDimensions(prev => ({
      ...prev,
      [property]: value
    }));
    
    // Emitir evento personalizado para sincronización manual
    window.dispatchEvent(new CustomEvent('dimension-changed', {
      detail: {
        componentId,
        device,
        property,
        value,
        source,
        timestamp: Date.now()
      }
    }));
    
    return true;
  }, [componentId, device]);
  
  // Función simplificada para conversión de unidades
  const convertToUnit = useCallback((value, fromUnit, toUnit, property) => {
    if (!value || fromUnit === toUnit) {
      return parseFloat(value) || 0;
    }
    
    const numValue = parseFloat(value) || 0;
    
    // Conversión básica px ↔ %
    if (fromUnit === 'px' && toUnit === '%') {
      // Obtener tamaño del contenedor del DOM
      const element = document.querySelector(`[data-id="${componentId}"]`);
      let containerSize = 800; // Fallback
      
      if (element) {
        const container = element.closest('.banner-container');
        if (container) {
          containerSize = property === 'width' ? container.clientWidth : container.clientHeight;
        }
      }
      
      const percentage = (numValue / containerSize) * 100;
      console.log(`🔄 SimpleSync: Convirtiendo ${numValue}px → ${percentage.toFixed(1)}% (contenedor: ${containerSize}px)`);
      return Math.round(percentage * 10) / 10; // Redondear a 1 decimal
    } else if (fromUnit === '%' && toUnit === 'px') {
      // Obtener tamaño del contenedor del DOM
      const element = document.querySelector(`[data-id="${componentId}"]`);
      let containerSize = 800; // Fallback
      
      if (element) {
        const container = element.closest('.banner-container');
        if (container) {
          containerSize = property === 'width' ? container.clientWidth : container.clientHeight;
        }
      }
      
      const pixels = (numValue * containerSize) / 100;
      console.log(`🔄 SimpleSync: Convirtiendo ${numValue}% → ${pixels}px (contenedor: ${containerSize}px)`);
      return Math.round(pixels);
    }
    
    return numValue;
  }, [componentId]);
  
  return {
    dimensions,
    updateDimension,
    convertToUnit,
    isConnected: true // Siempre conectado en la versión simple
  };
}