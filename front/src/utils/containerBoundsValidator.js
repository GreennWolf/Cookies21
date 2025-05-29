// src/utils/containerBoundsValidator.js

/**
 * Sistema de validación de límites para componentes dentro de contenedores
 * Asegura que los hijos respeten los límites de sus contenedores padres
 */

/**
 * Valida y ajusta el tamaño de un componente hijo dentro de su contenedor
 * @param {Object} childSize - Tamaño del hijo {width, height} en píxeles o porcentajes
 * @param {Object} containerSize - Tamaño del contenedor {width, height} en píxeles
 * @param {Object} options - Opciones adicionales de validación
 * @returns {Object} Tamaño ajustado que respeta los límites
 */
export const validateChildSize = (childSize, containerSize, options = {}) => {
  const {
    maxWidthPercent = 100,
    maxHeightPercent = 100,
    minWidth = 20,
    minHeight = 20,
    maintainAspectRatio = false,
    aspectRatio = null
  } = options;

  console.log('🔍 BOUNDS: Validando tamaño de hijo:', { childSize, containerSize, options });

  // Convertir valores a píxeles si es necesario
  const childWidthPx = convertToPixels(childSize.width, containerSize.width);
  const childHeightPx = convertToPixels(childSize.height, containerSize.height);

  // Calcular límites máximos
  const maxWidth = (containerSize.width * maxWidthPercent) / 100;
  const maxHeight = (containerSize.height * maxHeightPercent) / 100;

  let adjustedWidth = childWidthPx;
  let adjustedHeight = childHeightPx;

  // Aplicar límites máximos
  if (adjustedWidth > maxWidth) {
    adjustedWidth = maxWidth;
    console.log(`⚠️ BOUNDS: Ancho ajustado al máximo: ${adjustedWidth}px`);
  }

  if (adjustedHeight > maxHeight) {
    adjustedHeight = maxHeight;
    console.log(`⚠️ BOUNDS: Alto ajustado al máximo: ${adjustedHeight}px`);
  }

  // Aplicar límites mínimos
  if (adjustedWidth < minWidth) {
    adjustedWidth = minWidth;
    console.log(`⚠️ BOUNDS: Ancho ajustado al mínimo: ${adjustedWidth}px`);
  }

  if (adjustedHeight < minHeight) {
    adjustedHeight = minHeight;
    console.log(`⚠️ BOUNDS: Alto ajustado al mínimo: ${adjustedHeight}px`);
  }

  // Mantener aspect ratio si es necesario
  if (maintainAspectRatio && aspectRatio) {
    const currentRatio = adjustedWidth / adjustedHeight;
    
    if (Math.abs(currentRatio - aspectRatio) > 0.01) {
      // Ajustar basándose en la dimensión más restrictiva
      const widthBasedHeight = adjustedWidth / aspectRatio;
      const heightBasedWidth = adjustedHeight * aspectRatio;
      
      if (widthBasedHeight <= maxHeight && widthBasedHeight >= minHeight) {
        adjustedHeight = widthBasedHeight;
      } else if (heightBasedWidth <= maxWidth && heightBasedWidth >= minWidth) {
        adjustedWidth = heightBasedWidth;
      }
      
      console.log(`📐 BOUNDS: Aspect ratio mantenido: ${aspectRatio.toFixed(2)}:1`);
    }
  }

  // Convertir de vuelta a la unidad original si era porcentaje
  const result = {
    width: isPercentage(childSize.width) 
      ? `${(adjustedWidth / containerSize.width) * 100}%` 
      : `${adjustedWidth}px`,
    height: isPercentage(childSize.height)
      ? `${(adjustedHeight / containerSize.height) * 100}%`
      : `${adjustedHeight}px`,
    adjustments: {
      widthAdjusted: adjustedWidth !== childWidthPx,
      heightAdjusted: adjustedHeight !== childHeightPx,
      originalWidth: childWidthPx,
      originalHeight: childHeightPx,
      finalWidth: adjustedWidth,
      finalHeight: adjustedHeight
    }
  };

  console.log('✅ BOUNDS: Tamaño validado:', result);
  return result;
};

/**
 * Valida y ajusta la posición de un componente hijo dentro de su contenedor
 * @param {Object} childPosition - Posición del hijo {top, left} en píxeles o porcentajes
 * @param {Object} childSize - Tamaño del hijo {width, height} en píxeles
 * @param {Object} containerSize - Tamaño del contenedor {width, height} en píxeles
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Posición ajustada que mantiene el hijo dentro del contenedor
 */
export const validateChildPosition = (childPosition, childSize, containerSize, options = {}) => {
  const {
    padding = 0, // Padding interno del contenedor
    allowPartialOverflow = false, // Permitir que el hijo sobresalga parcialmente
    overflowThreshold = 0.2 // Porcentaje máximo de overflow permitido (20%)
  } = options;

  console.log('📍 BOUNDS: Validando posición de hijo:', { childPosition, childSize, containerSize });

  // Convertir posiciones a píxeles
  let topPx = convertToPixels(childPosition.top || '0', containerSize.height);
  let leftPx = convertToPixels(childPosition.left || '0', containerSize.width);

  // Convertir tamaños a píxeles
  const widthPx = convertToPixels(childSize.width, containerSize.width);
  const heightPx = convertToPixels(childSize.height, containerSize.height);

  // Calcular límites considerando padding
  const minTop = padding;
  const minLeft = padding;
  const maxTop = containerSize.height - heightPx - padding;
  const maxLeft = containerSize.width - widthPx - padding;

  // Si se permite overflow parcial, ajustar límites
  let effectiveMinTop = minTop;
  let effectiveMinLeft = minLeft;
  let effectiveMaxTop = maxTop;
  let effectiveMaxLeft = maxLeft;

  if (allowPartialOverflow) {
    const overflowHeight = heightPx * overflowThreshold;
    const overflowWidth = widthPx * overflowThreshold;
    
    effectiveMinTop = -overflowHeight;
    effectiveMinLeft = -overflowWidth;
    effectiveMaxTop = containerSize.height - heightPx + overflowHeight;
    effectiveMaxLeft = containerSize.width - widthPx + overflowWidth;
  }

  // Aplicar límites
  let adjustedTop = topPx;
  let adjustedLeft = leftPx;

  if (adjustedTop < effectiveMinTop) {
    adjustedTop = effectiveMinTop;
    console.log(`⚠️ BOUNDS: Top ajustado al mínimo: ${adjustedTop}px`);
  } else if (adjustedTop > effectiveMaxTop) {
    adjustedTop = effectiveMaxTop;
    console.log(`⚠️ BOUNDS: Top ajustado al máximo: ${adjustedTop}px`);
  }

  if (adjustedLeft < effectiveMinLeft) {
    adjustedLeft = effectiveMinLeft;
    console.log(`⚠️ BOUNDS: Left ajustado al mínimo: ${adjustedLeft}px`);
  } else if (adjustedLeft > effectiveMaxLeft) {
    adjustedLeft = effectiveMaxLeft;
    console.log(`⚠️ BOUNDS: Left ajustado al máximo: ${adjustedLeft}px`);
  }

  // Convertir de vuelta a la unidad original
  const result = {
    top: isPercentage(childPosition.top)
      ? `${(adjustedTop / containerSize.height) * 100}%`
      : `${adjustedTop}px`,
    left: isPercentage(childPosition.left)
      ? `${(adjustedLeft / containerSize.width) * 100}%`
      : `${adjustedLeft}px`,
    adjustments: {
      topAdjusted: adjustedTop !== topPx,
      leftAdjusted: adjustedLeft !== leftPx,
      originalTop: topPx,
      originalLeft: leftPx,
      finalTop: adjustedTop,
      finalLeft: adjustedLeft
    }
  };

  console.log('✅ BOUNDS: Posición validada:', result);
  return result;
};

/**
 * Valida completamente un componente hijo dentro de su contenedor
 * @param {Object} child - Componente hijo con position y style
 * @param {Object} container - Componente contenedor con dimensiones
 * @param {string} device - Dispositivo actual (desktop, tablet, mobile)
 * @returns {Object} Componente con posición y tamaño validados
 */
export const validateChildInContainer = (child, container, device = 'desktop') => {
  console.log(`🔲 BOUNDS: Validando hijo ${child.id} en contenedor ${container.id} para ${device}`);

  // Obtener dimensiones del contenedor
  const containerStyle = container.style?.[device] || {};
  const containerSize = {
    width: parseFloat(containerStyle.width) || 300,
    height: parseFloat(containerStyle.height) || 200
  };

  // Obtener estilo y posición del hijo
  const childStyle = child.style?.[device] || {};
  const childPosition = child.position?.[device] || { top: '0%', left: '0%' };

  // Validar tamaño primero
  const validatedSize = validateChildSize(
    {
      width: childStyle.width || '100px',
      height: childStyle.height || '100px'
    },
    containerSize,
    {
      maxWidthPercent: 95, // Máximo 95% del contenedor
      maxHeightPercent: 95,
      maintainAspectRatio: child.type === 'image',
      aspectRatio: child._aspectRatio
    }
  );

  // Validar posición con el tamaño validado
  const validatedPosition = validateChildPosition(
    childPosition,
    validatedSize,
    containerSize,
    {
      padding: 5, // 5px de padding interno
      allowPartialOverflow: false
    }
  );

  // Crear copia del hijo con valores validados
  const validatedChild = {
    ...child,
    style: {
      ...child.style,
      [device]: {
        ...childStyle,
        width: validatedSize.width,
        height: validatedSize.height
      }
    },
    position: {
      ...child.position,
      [device]: {
        ...childPosition,
        top: validatedPosition.top,
        left: validatedPosition.left
      }
    }
  };

  // Agregar metadatos de validación
  if (validatedSize.adjustments.widthAdjusted || validatedSize.adjustments.heightAdjusted ||
      validatedPosition.adjustments.topAdjusted || validatedPosition.adjustments.leftAdjusted) {
    validatedChild._boundsAdjusted = {
      device,
      size: validatedSize.adjustments,
      position: validatedPosition.adjustments
    };
    
    console.log(`⚠️ BOUNDS: Se aplicaron ajustes al hijo ${child.id}:`, validatedChild._boundsAdjusted);
  }

  return validatedChild;
};

/**
 * Valida recursivamente todos los hijos de un contenedor
 * @param {Object} container - Contenedor con hijos
 * @param {string} device - Dispositivo actual
 * @returns {Object} Contenedor con todos sus hijos validados
 */
export const validateContainerChildren = (container, device = 'desktop') => {
  if (!container.children || !Array.isArray(container.children)) {
    return container;
  }

  console.log(`📦 BOUNDS: Validando ${container.children.length} hijos del contenedor ${container.id}`);

  const validatedChildren = container.children.map(child => {
    let validatedChild = validateChildInContainer(child, container, device);
    
    // Si el hijo también es un contenedor, validar sus hijos recursivamente
    if (validatedChild.type === 'container' && validatedChild.children) {
      validatedChild = validateContainerChildren(validatedChild, device);
    }
    
    return validatedChild;
  });

  return {
    ...container,
    children: validatedChildren
  };
};

/**
 * Calcula el espacio disponible en un contenedor considerando sus hijos
 * @param {Object} container - Contenedor
 * @param {string} device - Dispositivo
 * @returns {Object} Información sobre el espacio disponible
 */
export const calculateAvailableSpace = (container, device = 'desktop') => {
  const containerStyle = container.style?.[device] || {};
  const containerWidth = parseFloat(containerStyle.width) || 300;
  const containerHeight = parseFloat(containerStyle.height) || 200;
  
  if (!container.children || container.children.length === 0) {
    return {
      totalSpace: { width: containerWidth, height: containerHeight },
      usedSpace: { width: 0, height: 0 },
      availableSpace: { width: containerWidth, height: containerHeight },
      occupancyPercent: 0
    };
  }

  // Calcular espacio ocupado por los hijos
  let maxRight = 0;
  let maxBottom = 0;

  container.children.forEach(child => {
    const childStyle = child.style?.[device] || {};
    const childPosition = child.position?.[device] || {};
    
    const width = convertToPixels(childStyle.width || '100px', containerWidth);
    const height = convertToPixels(childStyle.height || '100px', containerHeight);
    const left = convertToPixels(childPosition.left || '0', containerWidth);
    const top = convertToPixels(childPosition.top || '0', containerHeight);
    
    const right = left + width;
    const bottom = top + height;
    
    maxRight = Math.max(maxRight, right);
    maxBottom = Math.max(maxBottom, bottom);
  });

  const usedWidth = Math.min(maxRight, containerWidth);
  const usedHeight = Math.min(maxBottom, containerHeight);
  const occupancyPercent = ((usedWidth * usedHeight) / (containerWidth * containerHeight)) * 100;

  return {
    totalSpace: { width: containerWidth, height: containerHeight },
    usedSpace: { width: usedWidth, height: usedHeight },
    availableSpace: { 
      width: containerWidth - usedWidth, 
      height: containerHeight - usedHeight 
    },
    occupancyPercent: Math.round(occupancyPercent)
  };
};

// Utilidades auxiliares
const convertToPixels = (value, containerSize) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      return (parseFloat(value) / 100) * containerSize;
    }
    return parseFloat(value) || 0;
  }
  return 0;
};

const isPercentage = (value) => {
  return typeof value === 'string' && value.endsWith('%');
};

export default {
  validateChildSize,
  validateChildPosition,
  validateChildInContainer,
  validateContainerChildren,
  calculateAvailableSpace
};