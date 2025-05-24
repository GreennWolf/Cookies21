// services/containerPositionProcessor.service.js

const logger = require('../utils/logger');

/**
 * Servicio especializado en procesar posiciones de contenedores y sus hijos
 * Maneja la conversión entre diferentes sistemas de coordenadas y la preservación
 * de posiciones para el script y el editor
 */
class ContainerPositionProcessorService {
  
  /**
   * Procesa las posiciones de todos los componentes, incluyendo contenedores y sus hijos
   * @param {Array} components - Array de componentes
   * @param {Object} parentContainer - Contenedor padre (opcional)
   * @returns {Array} - Componentes procesados con posiciones corregidas
   */
  processComponentPositions(components, parentContainer = null) {
    if (!Array.isArray(components)) return [];
    
    return components.map(component => {
      const processedComponent = { ...component };
      
      // Procesar posiciones para cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (processedComponent.position && processedComponent.position[device]) {
          processedComponent.position[device] = this._processDevicePosition(
            processedComponent.position[device],
            processedComponent,
            parentContainer,
            device
          );
        }
        
        // Procesar estilos relacionados con posición
        if (processedComponent.style && processedComponent.style[device]) {
          processedComponent.style[device] = this._processDeviceStylePosition(
            processedComponent.style[device],
            processedComponent,
            parentContainer,
            device
          );
        }
      });
      
      // Si es un contenedor, procesar sus hijos recursivamente
      if (processedComponent.type === 'container' && processedComponent.children) {
        processedComponent.children = this.processComponentPositions(
          processedComponent.children,
          processedComponent
        );
      }
      
      return processedComponent;
    });
  }
  
  /**
   * Procesa la posición de un dispositivo específico
   */
  _processDevicePosition(position, component, parentContainer, device) {
    const processedPosition = { ...position };
    
    // Si el componente está dentro de un contenedor
    if (parentContainer) {
      const containerConfig = parentContainer.containerConfig || {};
      const displayMode = containerConfig.displayMode || 'libre';
      
      if (displayMode === 'libre') {
        // En modo libre, mantener posiciones absolutas pero relativas al contenedor
        processedPosition.position = 'absolute';
        
        // Asegurar que las posiciones están en formato correcto
        processedPosition.top = this._normalizePosition(processedPosition.top, '0%');
        processedPosition.left = this._normalizePosition(processedPosition.left, '0%');
        
        // Calcular posiciones porcentuales si no existen
        if (!processedPosition.percentX && processedPosition.left) {
          processedPosition.percentX = this._extractPercentage(processedPosition.left);
        }
        if (!processedPosition.percentY && processedPosition.top) {
          processedPosition.percentY = this._extractPercentage(processedPosition.top);
        }
        
      } else {
        // En modo flex/grid, usar posición relativa
        processedPosition.position = 'relative';
        processedPosition.top = 'auto';
        processedPosition.left = 'auto';
        processedPosition.right = 'auto';
        processedPosition.bottom = 'auto';
      }
    } else {
      // Componente raíz del banner
      processedPosition.position = 'absolute';
      
      // Asegurar posiciones válidas
      processedPosition.top = this._normalizePosition(processedPosition.top, '0%');
      processedPosition.left = this._normalizePosition(processedPosition.left, '0%');
    }
    
    // Procesar transformaciones para centrado
    if (component.centered || processedPosition.alignment === 'center') {
      if (processedPosition.left === '50%' && !processedPosition.transformX) {
        processedPosition.transformX = 'center';
      }
      if (processedPosition.top === '50%' && !processedPosition.transformY) {
        processedPosition.transformY = 'center';
      }
    }
    
    return processedPosition;
  }
  
  /**
   * Procesa estilos relacionados con posición
   */
  _processDeviceStylePosition(style, component, parentContainer, device) {
    const processedStyle = { ...style };
    
    // Si el componente está dentro de un contenedor
    if (parentContainer) {
      const containerConfig = parentContainer.containerConfig || {};
      const displayMode = containerConfig.displayMode || 'libre';
      
      if (displayMode === 'flex') {
        // Aplicar propiedades flex si están configuradas
        const flexConfig = containerConfig[device] || {};
        
        // Limpiar posicionamiento absoluto para flex
        delete processedStyle.position;
        delete processedStyle.top;
        delete processedStyle.left;
        delete processedStyle.right;
        delete processedStyle.bottom;
        
      } else if (displayMode === 'grid') {
        // Aplicar propiedades grid si están configuradas
        const gridConfig = containerConfig[device] || {};
        
        // Limpiar posicionamiento absoluto para grid
        delete processedStyle.position;
        delete processedStyle.top;
        delete processedStyle.left;
        delete processedStyle.right;
        delete processedStyle.bottom;
        
      } else {
        // Modo libre - mantener posicionamiento absoluto
        processedStyle.position = 'absolute';
      }
    }
    
    return processedStyle;
  }
  
  /**
   * Normaliza un valor de posición
   */
  _normalizePosition(value, defaultValue = '0%') {
    if (!value && value !== 0) return defaultValue;
    
    const strValue = String(value);
    
    // Si ya tiene unidades, devolverlo tal como está
    if (strValue.endsWith('%') || strValue.endsWith('px')) {
      return strValue;
    }
    
    // Si es un número, añadir unidades porcentuales
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue)) {
      return `${numValue}%`;
    }
    
    return defaultValue;
  }
  
  /**
   * Extrae el valor porcentual de una posición
   */
  _extractPercentage(position) {
    if (!position) return 0;
    
    const strPosition = String(position);
    if (strPosition.endsWith('%')) {
      return parseFloat(strPosition);
    }
    
    return 0;
  }
  
  /**
   * Convierte posiciones de píxeles a porcentajes basado en el contenedor padre
   */
  convertPixelsToPercentage(pixelValue, containerSize) {
    if (!pixelValue || !containerSize) return 0;
    
    const pixels = parseFloat(String(pixelValue).replace('px', ''));
    const container = parseFloat(containerSize);
    
    if (isNaN(pixels) || isNaN(container) || container === 0) return 0;
    
    return (pixels / container) * 100;
  }
  
  /**
   * Convierte posiciones de porcentajes a píxeles basado en el contenedor padre
   */
  convertPercentageToPixels(percentageValue, containerSize) {
    if (!percentageValue || !containerSize) return 0;
    
    const percentage = parseFloat(String(percentageValue).replace('%', ''));
    const container = parseFloat(containerSize);
    
    if (isNaN(percentage) || isNaN(container)) return 0;
    
    return (percentage / 100) * container;
  }
  
  /**
   * Valida que las posiciones de los hijos estén dentro del contenedor
   */
  validateChildPositions(container) {
    if (!container.children || !Array.isArray(container.children)) {
      return { valid: true, corrections: [] };
    }
    
    const corrections = [];
    const containerConfig = container.containerConfig || {};
    const displayMode = containerConfig.displayMode || 'libre';
    
    // Solo validar en modo libre
    if (displayMode !== 'libre') {
      return { valid: true, corrections: [] };
    }
    
    container.children.forEach(child => {
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        const position = child.position && child.position[device];
        if (!position) return;
        
        const correction = this._validateChildPosition(child, position, device);
        if (correction) {
          corrections.push(correction);
        }
      });
    });
    
    return {
      valid: corrections.length === 0,
      corrections
    };
  }
  
  /**
   * Valida la posición de un hijo específico
   */
  _validateChildPosition(child, position, device) {
    const leftPercent = this._extractPercentage(position.left);
    const topPercent = this._extractPercentage(position.top);
    
    // Validar límites (0-100%)
    const maxLeft = 90; // Dejar espacio para el componente
    const maxTop = 90;
    
    let needsCorrection = false;
    const correction = {
      componentId: child.id,
      device,
      original: { left: position.left, top: position.top },
      corrected: {}
    };
    
    if (leftPercent < 0 || leftPercent > maxLeft) {
      correction.corrected.left = `${Math.max(0, Math.min(maxLeft, leftPercent))}%`;
      needsCorrection = true;
    }
    
    if (topPercent < 0 || topPercent > maxTop) {
      correction.corrected.top = `${Math.max(0, Math.min(maxTop, topPercent))}%`;
      needsCorrection = true;
    }
    
    return needsCorrection ? correction : null;
  }
  
  /**
   * Aplica correcciones de posición a un componente
   */
  applyPositionCorrections(components, corrections) {
    if (!corrections || corrections.length === 0) return components;
    
    const correctionMap = new Map();
    corrections.forEach(correction => {
      const key = `${correction.componentId}-${correction.device}`;
      correctionMap.set(key, correction);
    });
    
    return this._applyCorrectionsRecursive(components, correctionMap);
  }
  
  /**
   * Aplica correcciones recursivamente
   */
  _applyCorrectionsRecursive(components, correctionMap) {
    return components.map(component => {
      const processedComponent = { ...component };
      
      // Aplicar correcciones si existen
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        const key = `${component.id}-${device}`;
        const correction = correctionMap.get(key);
        
        if (correction && processedComponent.position && processedComponent.position[device]) {
          processedComponent.position[device] = {
            ...processedComponent.position[device],
            ...correction.corrected
          };
          
          logger.info(`Applied position correction for ${component.id} on ${device}:`, correction);
        }
      });
      
      // Procesar hijos recursivamente
      if (processedComponent.children) {
        processedComponent.children = this._applyCorrectionsRecursive(
          processedComponent.children,
          correctionMap
        );
      }
      
      return processedComponent;
    });
  }
}

module.exports = new ContainerPositionProcessorService();