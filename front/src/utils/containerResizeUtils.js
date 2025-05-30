// utils/containerResizeUtils.js
// FASE 4 - Redimensionado dinámico de contenedores y gestión de hijos

/**
 * Recalcula las posiciones de los hijos cuando cambia el tamaño del contenedor
 * @param {Object} container - Componente contenedor
 * @param {Object} oldSize - Tamaño anterior { width, height }
 * @param {Object} newSize - Nuevo tamaño { width, height }
 * @param {String} deviceView - Vista del dispositivo actual
 * @returns {Array} - Array de hijos con posiciones actualizadas
 */
export const recalculateChildrenPositions = (container, oldSize, newSize, deviceView) => {
  if (!container.children || container.children.length === 0) {
    return [];
  }

  const containerConfig = container.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';

  // En modo libre, recalcular posiciones proporcionalmente
  if (displayMode === 'libre') {
    return recalculateLibreMode(container.children, oldSize, newSize, deviceView);
  }
  
  // En modo flex/grid, mantener orden pero verificar que no excedan límites
  if (displayMode === 'flex' || displayMode === 'grid') {
    return recalculateStructuredMode(container.children, newSize, deviceView, containerConfig);
  }

  return container.children;
};

/**
 * Recalcula posiciones en modo libre (proporcional)
 */
const recalculateLibreMode = (children, oldSize, newSize, deviceView) => {
  if (!oldSize.width || !oldSize.height || !newSize.width || !newSize.height) {
    return children;
  }

  const scaleX = newSize.width / oldSize.width;
  const scaleY = newSize.height / oldSize.height;

  return children.map(child => {
    const childPosition = child.position?.[deviceView] || {};
    
    // Extraer valores actuales
    const currentLeft = parseFloat(childPosition.left) || 0;
    const currentTop = parseFloat(childPosition.top) || 0;
    
    // Calcular nuevas posiciones proporcionales
    let newLeft = currentLeft;
    let newTop = currentTop;
    
    // Solo escalar si hay cambios significativos (más del 5%)
    if (Math.abs(scaleX - 1) > 0.05) {
      newLeft = Math.max(0, Math.min(95, currentLeft * scaleX));
    }
    
    if (Math.abs(scaleY - 1) > 0.05) {
      newTop = Math.max(0, Math.min(95, currentTop * scaleY));
    }

    return {
      ...child,
      position: {
        ...child.position,
        [deviceView]: {
          ...childPosition,
          left: `${newLeft.toFixed(2)}%`,
          top: `${newTop.toFixed(2)}%`,
          percentX: newLeft,
          percentY: newTop
        }
      }
    };
  });
};

/**
 * Recalcula posiciones en modo flex/grid
 */
const recalculateStructuredMode = (children, newSize, deviceView, containerConfig) => {
  // En modo estructurado, verificar que los elementos no excedan el nuevo tamaño
  return children.map(child => {
    const childStyle = child.style?.[deviceView] || {};
    
    // Verificar y ajustar dimensiones si es necesario
    let updatedStyle = { ...childStyle };
    let needsUpdate = false;
    
    // Verificar ancho
    if (childStyle.width && childStyle.width.endsWith('px')) {
      const childWidth = parseInt(childStyle.width);
      if (childWidth > newSize.width * 0.8) { // No más del 80% del contenedor
        updatedStyle.width = `${Math.floor(newSize.width * 0.8)}px`;
        needsUpdate = true;
      }
    }
    
    // Verificar alto
    if (childStyle.height && childStyle.height.endsWith('px')) {
      const childHeight = parseInt(childStyle.height);
      if (childHeight > newSize.height * 0.8) { // No más del 80% del contenedor
        updatedStyle.height = `${Math.floor(newSize.height * 0.8)}px`;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      return {
        ...child,
        style: {
          ...child.style,
          [deviceView]: updatedStyle
        }
      };
    }

    return child;
  });
};

/**
 * Calcula el tamaño mínimo requerido para un contenedor basado en sus hijos
 * @param {Object} container - Componente contenedor
 * @param {String} deviceView - Vista del dispositivo actual
 * @returns {Object} - Tamaño mínimo { width, height }
 */
export const calculateMinimumContainerSize = (container, deviceView) => {
  if (!container.children || container.children.length === 0) {
    return { width: 100, height: 50 }; // Tamaño mínimo por defecto
  }

  const containerConfig = container.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';

  if (displayMode === 'libre') {
    return calculateMinimumForLibreMode(container.children, deviceView);
  }
  
  if (displayMode === 'flex') {
    return calculateMinimumForFlexMode(container.children, deviceView, containerConfig);
  }
  
  if (displayMode === 'grid') {
    return calculateMinimumForGridMode(container.children, deviceView, containerConfig);
  }

  return { width: 100, height: 50 };
};

/**
 * Calcula tamaño mínimo para modo libre
 */
const calculateMinimumForLibreMode = (children, deviceView) => {
  let maxRight = 0;
  let maxBottom = 0;

  children.forEach(child => {
    const position = child.position?.[deviceView] || {};
    const style = child.style?.[deviceView] || {};
    
    const left = parseFloat(position.left) || 0;
    const top = parseFloat(position.top) || 0;
    
    // Estimar dimensiones del hijo
    const childWidth = parseInt(style.width) || 100;
    const childHeight = parseInt(style.height) || 30;
    
    // Convertir a porcentajes si es necesario y calcular posición final
    const rightPercent = left + (childWidth / 10); // Aproximación
    const bottomPercent = top + (childHeight / 5); // Aproximación
    
    maxRight = Math.max(maxRight, rightPercent);
    maxBottom = Math.max(maxBottom, bottomPercent);
  });

  // Añadir margen de seguridad
  return {
    width: Math.max(150, maxRight * 4), // Factor de conversión aproximado
    height: Math.max(100, maxBottom * 3)
  };
};

/**
 * Calcula tamaño mínimo para modo flex
 */
const calculateMinimumForFlexMode = (children, deviceView, containerConfig) => {
  const flexDirection = containerConfig.flexDirection || 'row';
  const gap = parseInt(containerConfig.gap) || 10;
  
  let totalWidth = 0;
  let totalHeight = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  children.forEach(child => {
    const style = child.style?.[deviceView] || {};
    const childWidth = parseInt(style.width) || 100;
    const childHeight = parseInt(style.height) || 30;
    
    if (flexDirection === 'row') {
      totalWidth += childWidth + gap;
      maxHeight = Math.max(maxHeight, childHeight);
    } else {
      totalHeight += childHeight + gap;
      maxWidth = Math.max(maxWidth, childWidth);
    }
  });

  // Remover el último gap
  if (flexDirection === 'row') {
    totalWidth = Math.max(0, totalWidth - gap);
    return { width: Math.max(150, totalWidth + 20), height: Math.max(80, maxHeight + 20) };
  } else {
    totalHeight = Math.max(0, totalHeight - gap);
    return { width: Math.max(150, maxWidth + 20), height: Math.max(80, totalHeight + 20) };
  }
};

/**
 * Calcula tamaño mínimo para modo grid
 */
const calculateMinimumForGridMode = (children, deviceView, containerConfig) => {
  const columns = extractGridColumns(containerConfig.gridTemplateColumns || 'repeat(2, 1fr)');
  const gap = parseInt(containerConfig.gap) || 10;
  
  // Calcular dimensiones promedio de los hijos
  let avgWidth = 0;
  let avgHeight = 0;
  
  children.forEach(child => {
    const style = child.style?.[deviceView] || {};
    avgWidth += parseInt(style.width) || 100;
    avgHeight += parseInt(style.height) || 30;
  });
  
  if (children.length > 0) {
    avgWidth /= children.length;
    avgHeight /= children.length;
  }
  
  // Calcular filas necesarias
  const rows = Math.ceil(children.length / columns);
  
  // Calcular tamaño total
  const totalWidth = (avgWidth * columns) + (gap * (columns - 1)) + 20; // 20px de padding
  const totalHeight = (avgHeight * rows) + (gap * (rows - 1)) + 20;
  
  return {
    width: Math.max(200, totalWidth),
    height: Math.max(100, totalHeight)
  };
};

/**
 * Extrae el número de columnas de una definición de grid
 */
const extractGridColumns = (gridTemplateColumns) => {
  if (gridTemplateColumns.includes('repeat(')) {
    const match = gridTemplateColumns.match(/repeat\((\d+),/);
    return match ? parseInt(match[1]) : 2;
  }
  
  // Contar columnas separadas por espacios
  return gridTemplateColumns.split(' ').length;
};

/**
 * Valida si el nuevo tamaño del contenedor es válido
 * @param {Object} container - Componente contenedor
 * @param {Object} newSize - Nuevo tamaño propuesto
 * @param {String} deviceView - Vista del dispositivo actual
 * @returns {Object} - { isValid: boolean, adjustedSize?: Object, reason?: string }
 */
export const validateContainerResize = (container, newSize, deviceView) => {
  const minSize = calculateMinimumContainerSize(container, deviceView);
  
  // Verificar tamaño mínimo
  if (newSize.width < minSize.width || newSize.height < minSize.height) {
    return {
      isValid: false,
      adjustedSize: {
        width: Math.max(newSize.width, minSize.width),
        height: Math.max(newSize.height, minSize.height)
      },
      reason: `El tamaño mínimo requerido es ${minSize.width}x${minSize.height}px`
    };
  }
  
  // Verificar tamaño máximo razonable
  const maxWidth = 1200;
  const maxHeight = 800;
  
  if (newSize.width > maxWidth || newSize.height > maxHeight) {
    return {
      isValid: false,
      adjustedSize: {
        width: Math.min(newSize.width, maxWidth),
        height: Math.min(newSize.height, maxHeight)
      },
      reason: `El tamaño máximo permitido es ${maxWidth}x${maxHeight}px`
    };
  }
  
  return { isValid: true };
};

/**
 * Optimiza la distribución de hijos en un contenedor redimensionado
 * @param {Object} container - Componente contenedor
 * @param {Object} newSize - Nuevo tamaño del contenedor
 * @param {String} deviceView - Vista del dispositivo actual
 * @returns {Array} - Array de hijos optimizados
 */
export const optimizeChildrenDistribution = (container, newSize, deviceView) => {
  if (!container.children || container.children.length === 0) {
    return [];
  }

  const containerConfig = container.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';

  if (displayMode === 'libre') {
    return optimizeLibreDistribution(container.children, newSize, deviceView);
  }

  // Para flex y grid, no necesitamos optimización adicional
  return container.children;
};

/**
 * Optimiza distribución en modo libre para evitar solapamientos
 */
const optimizeLibreDistribution = (children, containerSize, deviceView) => {
  const padding = 10; // Padding del contenedor
  const minSpacing = 5; // Espaciado mínimo entre elementos
  
  return children.map((child, index) => {
    const position = child.position?.[deviceView] || {};
    const style = child.style?.[deviceView] || {};
    
    const childWidth = parseInt(style.width) || 100;
    const childHeight = parseInt(style.height) || 30;
    
    let left = parseFloat(position.left) || 0;
    let top = parseFloat(position.top) || 0;
    
    // Convertir porcentajes a píxeles para cálculos
    const leftPx = (left / 100) * (containerSize.width - padding * 2);
    const topPx = (top / 100) * (containerSize.height - padding * 2);
    
    // Verificar límites del contenedor
    const maxLeftPx = containerSize.width - childWidth - padding;
    const maxTopPx = containerSize.height - childHeight - padding;
    
    const adjustedLeftPx = Math.max(0, Math.min(leftPx, maxLeftPx));
    const adjustedTopPx = Math.max(0, Math.min(topPx, maxTopPx));
    
    // Convertir de vuelta a porcentajes
    const adjustedLeft = (adjustedLeftPx / (containerSize.width - padding * 2)) * 100;
    const adjustedTop = (adjustedTopPx / (containerSize.height - padding * 2)) * 100;
    
    return {
      ...child,
      position: {
        ...child.position,
        [deviceView]: {
          ...position,
          left: `${adjustedLeft.toFixed(2)}%`,
          top: `${adjustedTop.toFixed(2)}%`,
          percentX: adjustedLeft,
          percentY: adjustedTop
        }
      }
    };
  });
};