/**
 * Utilidades para el manejo de imágenes en el editor
 */

/**
 * Convierte diferentes formatos de contenido de imagen a URL
 */
export const extractImageUrl = (content) => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (content && typeof content === 'object') {
    // Formato con textos localizados
    if (content.texts?.en) {
      return content.texts.en;
    }
    if (content.texts?.es) {
      return content.texts.es;
    }
    // Primer texto disponible
    if (content.texts && Object.keys(content.texts).length > 0) {
      return Object.values(content.texts)[0];
    }
    // Otras propiedades
    if (content.url) {
      return content.url;
    }
    if (content.src) {
      return content.src;
    }
  }
  
  return null;
};

/**
 * Crea el formato de contenido adecuado para guardar
 */
export const createImageContent = (url, translatable = true) => {
  if (!url) return '';
  
  if (translatable) {
    return {
      texts: {
        en: url
      },
      translatable: true
    };
  }
  
  return url;
};

/**
 * Valida si una URL de imagen es válida
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Comprobar formatos comunes
  return (
    url.startsWith('data:image/') ||
    url.startsWith('/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)
  );
};

/**
 * Convierte píxeles a porcentaje relativo al contenedor
 */
export const pxToPercent = (pixels, containerSize) => {
  if (!containerSize || containerSize === 0) return '0%';
  return `${((pixels / containerSize) * 100).toFixed(2)}%`;
};

/**
 * Convierte porcentaje a píxeles
 */
export const percentToPx = (percent, containerSize) => {
  if (!containerSize) return 0;
  
  if (typeof percent === 'string' && percent.endsWith('%')) {
    return (parseFloat(percent) / 100) * containerSize;
  }
  
  return parseFloat(percent) || 0;
};

/**
 * Calcula el aspect ratio de una imagen
 */
export const calculateAspectRatio = (width, height) => {
  if (!width || !height) return null;
  return width / height;
};

/**
 * Ajusta dimensiones manteniendo aspect ratio
 */
export const adjustDimensionsToAspectRatio = (currentWidth, currentHeight, newWidth, aspectRatio) => {
  if (!aspectRatio) {
    return { width: newWidth, height: currentHeight };
  }
  
  const newHeight = newWidth / aspectRatio;
  return { width: newWidth, height: newHeight };
};

/**
 * Calcula las dimensiones máximas que caben en un contenedor
 */
export const fitToContainer = (imageWidth, imageHeight, containerWidth, containerHeight, padding = 0.1) => {
  const maxWidth = containerWidth * (1 - padding);
  const maxHeight = containerHeight * (1 - padding);
  
  if (!imageWidth || !imageHeight) {
    return { width: maxWidth, height: maxHeight };
  }
  
  const aspectRatio = imageWidth / imageHeight;
  
  let finalWidth = maxWidth;
  let finalHeight = maxWidth / aspectRatio;
  
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = maxHeight * aspectRatio;
  }
  
  return { width: finalWidth, height: finalHeight };
};

/**
 * Centra un elemento dentro de un contenedor
 */
export const centerInContainer = (elementWidth, elementHeight, containerWidth, containerHeight) => {
  const left = (containerWidth - elementWidth) / 2;
  const top = (containerHeight - elementHeight) / 2;
  
  return {
    left: Math.max(0, left),
    top: Math.max(0, top)
  };
};

/**
 * Limita una posición para que el elemento no se salga del contenedor
 */
export const constrainToContainer = (left, top, elementWidth, elementHeight, containerWidth, containerHeight) => {
  const maxLeft = containerWidth - elementWidth;
  const maxTop = containerHeight - elementHeight;
  
  return {
    left: Math.max(0, Math.min(left, maxLeft)),
    top: Math.max(0, Math.min(top, maxTop))
  };
};

/**
 * Obtiene información sobre una imagen desde su URL
 */
export const getImageInfo = (url) => {
  return new Promise((resolve, reject) => {
    if (!isValidImageUrl(url)) {
      reject(new Error('URL de imagen no válida'));
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        url: url
      });
    };
    
    img.onerror = () => {
      reject(new Error('Error cargando la imagen'));
    };
    
    img.src = url;
  });
};

/**
 * Convierte unidades CSS a píxeles
 */
export const cssToPixels = (value, containerSize) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  
  if (value.endsWith('%')) {
    return (parseFloat(value) / 100) * (containerSize || 0);
  }
  
  if (value.endsWith('em')) {
    return parseFloat(value) * 16; // Asume 16px como base
  }
  
  if (value.endsWith('rem')) {
    return parseFloat(value) * 16; // Asume 16px como base
  }
  
  return parseFloat(value) || 0;
};

/**
 * Convierte píxeles a una unidad CSS específica
 */
export const pixelsToCSS = (pixels, unit = 'px', containerSize) => {
  switch (unit) {
    case 'px':
      return `${pixels}px`;
    case '%':
      if (containerSize) {
        return `${((pixels / containerSize) * 100).toFixed(2)}%`;
      }
      return `${pixels}px`;
    case 'em':
    case 'rem':
      return `${(pixels / 16).toFixed(2)}${unit}`;
    default:
      return `${pixels}px`;
  }
};

/**
 * Genera configuraciones de estilo responsivo para una imagen
 */
export const generateResponsiveImageStyle = (baseStyle, deviceView) => {
  const style = { ...baseStyle };
  
  // Ajustes específicos por dispositivo
  switch (deviceView) {
    case 'mobile':
      // En móvil, reducir tamaños si son muy grandes
      if (style.width && cssToPixels(style.width) > 300) {
        style.width = '90%';
        style.maxWidth = '300px';
      }
      break;
      
    case 'tablet':
      // En tablet, mantener proporciones pero limitar tamaño
      if (style.width && cssToPixels(style.width) > 400) {
        style.width = '80%';
        style.maxWidth = '400px';
      }
      break;
      
    default:
      // Desktop: mantener configuración original
      break;
  }
  
  return style;
};

export default {
  extractImageUrl,
  createImageContent,
  isValidImageUrl,
  pxToPercent,
  percentToPx,
  calculateAspectRatio,
  adjustDimensionsToAspectRatio,
  fitToContainer,
  centerInContainer,
  constrainToContainer,
  getImageInfo,
  cssToPixels,
  pixelsToCSS,
  generateResponsiveImageStyle
};