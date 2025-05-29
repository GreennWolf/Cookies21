/**
 * Utilidades para manejo de configuración responsiva en componentes de banner
 */

/**
 * Configuración responsiva por defecto para componentes
 */
export const DEFAULT_RESPONSIVE_CONFIG = {
  enabled: true,           // Activado por defecto para nuevos componentes
  autoScale: true,         // Escalar automáticamente basado en viewport
  keepAspectRatio: true,   // Mantener proporción de aspecto 
  referenceWidth: 1920,    // Anchura de referencia (desktop estándar)
  referenceHeight: 1080,   // Altura de referencia
  scaleProps: [            // Propiedades a escalar
    'width', 
    'height', 
    'fontSize', 
    'padding', 
    'margin',
    'borderRadius',
    'borderWidth',
    'lineHeight'
  ],
  minScale: 0.5,           // Factor mínimo de escala
  maxScale: 1.5,           // Factor máximo de escala
  preservePosition: true,  // Mantener posición relativa al redimensionar
  adaptTextSize: true,     // Adaptar tamaño de texto automáticamente
  breakpoints: {           // Puntos de ruptura para escalado
    mobile: {
      maxWidth: 480,       // Límite superior para 'mobile'
      scaleFactor: 0.7,    // Factor de escala para dispositivos móviles
    },
    tablet: {
      maxWidth: 1024,      // Límite superior para 'tablet'
      scaleFactor: 0.85,   // Factor de escala para tablets
    },
    desktop: {
      scaleFactor: 1.0,    // Factor base para desktop
    }
  }
};

/**
 * Calcula el factor de escala basado en las dimensiones actuales del viewport
 * @param {Object} responsiveConfig - Configuración responsiva del componente
 * @param {Object} viewport - Información del viewport actual {width, height, device}
 * @returns {number} - Factor de escala calculado
 */
export function calculateScaleFactor(responsiveConfig, viewport) {
  if (!responsiveConfig || !responsiveConfig.enabled) {
    return 1.0; // Sin escala si la configuración responsiva no está activada
  }

  const config = { 
    ...DEFAULT_RESPONSIVE_CONFIG, 
    ...responsiveConfig 
  };
  
  // Referencia para cálculo de escala
  const { referenceWidth } = config;
  
  // Obtener el factor de escala base para el dispositivo actual
  let deviceScaleFactor = 1.0;
  if (viewport.device === 'mobile') {
    deviceScaleFactor = config.breakpoints.mobile.scaleFactor;
  } else if (viewport.device === 'tablet') {
    deviceScaleFactor = config.breakpoints.tablet.scaleFactor;
  } else {
    deviceScaleFactor = config.breakpoints.desktop.scaleFactor;
  }
  
  // Calcular escala basada en relación de anchura real vs. referencia
  let widthRatio = viewport.width / referenceWidth;
  
  // Aplicar escalado basado en dispositivo y limitar dentro del rango permitido
  const rawScale = widthRatio * deviceScaleFactor;
  const boundedScale = Math.max(
    config.minScale, 
    Math.min(config.maxScale, rawScale)
  );
  
  return boundedScale;
}

/**
 * Transforma los estilos de un componente según su configuración responsiva
 * @param {Object} component - Componente con configuración
 * @param {Object} styles - Estilos originales
 * @param {Object} viewport - Información del viewport {width, height, device}
 * @returns {Object} - Estilos transformados con propiedades responsivas
 */
export function transformStyles(component, styles, viewport) {
  // Si no hay configuración responsiva o está desactivada, devolver estilos originales
  if (!component.responsiveConfig || !component.responsiveConfig.enabled) {
    return styles;
  }
  
  // Combinar configuración por defecto con la del componente
  const config = {
    ...DEFAULT_RESPONSIVE_CONFIG,
    ...component.responsiveConfig
  };
  
  // Calcular factor de escala
  const scaleFactor = calculateScaleFactor(config, viewport);
  
  // Clonar estilos para no modificar los originales
  const enhancedStyles = { ...styles };
  
  // Verificar si se trata de una imagen para mantener aspect ratio
  const isImage = component.type === 'image';
  const isText = component.type === 'text';
  const isButton = component.type === 'button';
  
  // Aplicar transformaciones según el tipo de componente y configuración
  if (config.autoScale) {
    // Determinar transform-origin según la posición del componente
    let transformOrigin = '0% 0%'; // Por defecto, desde la esquina superior izquierda
    
    // Si tiene transformaciones, ajustar el transform-origin
    if (component.position?.[viewport.device]) {
      const position = component.position[viewport.device];
      
      // Detectar posición y establecer origen de transformación apropiado
      if (position.alignment) {
        // Si tiene alineación explícita, usarla para el origen
        switch (position.alignment) {
          case 'center':
            transformOrigin = 'center center';
            break;
          case 'top-center':
            transformOrigin = 'center top';
            break;
          case 'bottom-center':
            transformOrigin = 'center bottom';
            break;
          case 'center-left':
            transformOrigin = 'left center';
            break;
          case 'center-right':
            transformOrigin = 'right center';
            break;
          case 'top-left':
            transformOrigin = 'left top';
            break;
          case 'top-right':
            transformOrigin = 'right top';
            break;
          case 'bottom-left':
            transformOrigin = 'left bottom';
            break;
          case 'bottom-right':
            transformOrigin = 'right bottom';
            break;
          default:
            // Analizar transform individuales si no hay alineación específica
            if (position.transformX === 'center') {
              transformOrigin = 'center 0%';
            } else if (position.transformX === 'right') {
              transformOrigin = '100% 0%';
            }
            
            if (position.transformY === 'center') {
              transformOrigin = transformOrigin.replace('0%', 'center');
            } else if (position.transformY === 'bottom') {
              transformOrigin = transformOrigin.replace('0%', '100%');
            }
        }
      } else {
        // Analizar transform individuales si no hay alineación específica
        if (position.transformX === 'center') {
          transformOrigin = 'center 0%';
        } else if (position.transformX === 'right') {
          transformOrigin = '100% 0%';
        }
        
        if (position.transformY === 'center') {
          transformOrigin = transformOrigin.replace('0%', 'center');
        } else if (position.transformY === 'bottom') {
          transformOrigin = transformOrigin.replace('0%', '100%');
        }
      }
    }
    
    // Aplicar escalado con diferentes estrategias según el tipo de componente
    if (isImage) {
      // Para imágenes, aplicar escalado directo manteniendo proporciones
      const scaleTransform = `scale(${scaleFactor})`;
      enhancedStyles.transform = styles.transform 
        ? `${styles.transform} ${scaleTransform}`
        : scaleTransform;
      enhancedStyles.transformOrigin = transformOrigin;
      
      // Mantener aspect ratio para imágenes
      if (config.keepAspectRatio) {
        enhancedStyles.objectFit = enhancedStyles.objectFit || 'contain';
      }
    } else if (isText && config.adaptTextSize) {
      // Para textos, escalar el tamaño de fuente y dimensiones proporcionalmente
      if (styles.fontSize) {
        const matches = styles.fontSize.match(/^(\d+)(px|rem|em|%)$/);
        if (matches) {
          const [_, value, unit] = matches;
          // Escalar tamaño de texto con un límite mínimo para garantizar legibilidad
          const minFontSize = 12; // px
          const scaledSize = Math.max(minFontSize, Math.round(parseFloat(value) * scaleFactor));
          enhancedStyles.fontSize = `${scaledSize}${unit}`;
        }
      }
      
      // Escalar dimensiones y espaciado para textos
      const textPropsToScale = ['width', 'height', 'padding', 'margin', 'lineHeight'];
      textPropsToScale.forEach(prop => {
        if (styles[prop]) {
          const matches = styles[prop].match(/^(\d+)(px|rem|em|%)$/);
          if (matches) {
            const [_, value, unit] = matches;
            if (unit !== '%') { // No escalar porcentajes
              enhancedStyles[prop] = `${Math.round(parseFloat(value) * scaleFactor)}${unit}`;
            }
          }
        }
      });
    } else if (isButton) {
      // Para botones, aplicar escalado directo con especial atención a padding y bordes
      const scaleTransform = `scale(${scaleFactor})`;
      enhancedStyles.transform = styles.transform 
        ? `${styles.transform} ${scaleTransform}`
        : scaleTransform;
      enhancedStyles.transformOrigin = transformOrigin;
      
      // Asegurar que los bordes y bordes redondeados escalen proporcionalmente
      if (styles.borderRadius) {
        const matches = styles.borderRadius.match(/^(\d+)(px|rem|em|%)$/);
        if (matches) {
          const [_, value, unit] = matches;
          if (unit !== '%') {
            enhancedStyles.borderRadius = `${Math.round(parseFloat(value) * scaleFactor)}${unit}`;
          }
        }
      }
    } else {
      // Para otros componentes, aplicar escalado general
      const scaleTransform = `scale(${scaleFactor})`;
      enhancedStyles.transform = styles.transform 
        ? `${styles.transform} ${scaleTransform}`
        : scaleTransform;
      enhancedStyles.transformOrigin = transformOrigin;
    }
    
    // Aplicar escalado a todas las propiedades configuradas que puedan tener unidades
    Object.keys(styles).forEach(propName => {
      if (config.scaleProps.includes(propName) && 
          // Evitar re-escalar propiedades ya procesadas específicamente para cada tipo
          !((isText && ['fontSize', 'lineHeight'].includes(propName)) || 
            (isButton && propName === 'borderRadius'))) {
        
        // Escalar solo valores numéricos con unidades
        const propValue = styles[propName];
        if (typeof propValue === 'string') {
          const matches = propValue.match(/^(\d+)(px|rem|em|%)$/);
          if (matches) {
            const [_, value, unit] = matches;
            // No escalar porcentajes
            if (unit !== '%') {
              enhancedStyles[propName] = `${Math.round(parseFloat(value) * scaleFactor)}${unit}`;
            }
          }
        }
      }
    });
    
    // Si la escala es muy pequeña, asegurar tamaños mínimos para usabilidad
    if (scaleFactor < 0.7) {
      // Asegurar que los textos sean legibles
      if (isText && enhancedStyles.fontSize) {
        const matches = enhancedStyles.fontSize.match(/^(\d+)(px|rem|em|%)$/);
        if (matches) {
          const [_, value, unit] = matches;
          if (unit === 'px' && parseInt(value) < 12) {
            enhancedStyles.fontSize = '12px';
          }
        }
      }
      
      // Asegurar que los botones sean tocables
      if (isButton) {
        const minButtonWidth = 80; // px
        const minButtonHeight = 40; // px
        
        if (enhancedStyles.width) {
          const matches = enhancedStyles.width.match(/^(\d+)(px|rem|em|%)$/);
          if (matches) {
            const [_, value, unit] = matches;
            if (unit === 'px' && parseInt(value) < minButtonWidth) {
              enhancedStyles.width = `${minButtonWidth}px`;
            }
          }
        }
        
        if (enhancedStyles.height) {
          const matches = enhancedStyles.height.match(/^(\d+)(px|rem|em|%)$/);
          if (matches) {
            const [_, value, unit] = matches;
            if (unit === 'px' && parseInt(value) < minButtonHeight) {
              enhancedStyles.height = `${minButtonHeight}px`;
            }
          }
        }
      }
    }
  }
  
  // Añadir indicador visual de componente responsivo (solo en editor)
  enhancedStyles.position = enhancedStyles.position || 'relative';
  
  return enhancedStyles;
}

/**
 * Transforma la posición de un componente según su configuración responsiva
 * @param {Object} component - Componente con configuración
 * @param {Object} position - Posición original
 * @param {Object} viewport - Información del viewport
 * @returns {Object} - Posición transformada con propiedades responsivas
 */
export function transformPosition(component, position, viewport) {
  // Si no hay configuración responsiva o está desactivada, devolver posición original
  if (!component.responsiveConfig || !component.responsiveConfig.enabled) {
    return position;
  }
  
  // Combinar configuración por defecto con la del componente
  const config = {
    ...DEFAULT_RESPONSIVE_CONFIG,
    ...component.responsiveConfig
  };
  
  // Clonar posición para no modificar la original
  const transformedPosition = { ...position };
  
  // Las posiciones en porcentajes (%) son inherentemente responsivas
  // pero podemos ajustar los márgenes y offsets para pantallas pequeñas
  
  if (viewport.device === 'mobile' && config.preservePosition) {
    // En dispositivos móviles, podemos ajustar offsets para mejorar visualización
    if (position.offsetX && typeof position.offsetX === 'number') {
      // Reducir offsets horizontales para evitar que elementos se salgan de pantalla
      const mobileOffsetX = Math.round(position.offsetX * 0.7);
      transformedPosition.offsetX = mobileOffsetX;
    }
    
    if (position.offsetY && typeof position.offsetY === 'number') {
      // Reducir offsets verticales para adaptarse a pantallas más pequeñas
      const mobileOffsetY = Math.round(position.offsetY * 0.7);
      transformedPosition.offsetY = mobileOffsetY;
    }
    
    // Ajustar márgenes flotantes para que se vean mejor en móvil
    if (position.floatingMargin && typeof position.floatingMargin === 'number') {
      // Reducir márgenes para mantener elementos más cerca de los bordes
      const mobileMargin = Math.max(10, Math.round(position.floatingMargin * 0.6));
      transformedPosition.floatingMargin = mobileMargin;
    }
  }
  
  // Si tenemos una referencia de viewport desktop pero estamos en dispositivo más pequeño
  if ((viewport.device === 'mobile' || viewport.device === 'tablet') && 
      config.referenceWidth && viewport.width < config.referenceWidth) {
    
    // Para componentes en esquinas, asegurar que están visibles correctamente
    if (position.alignment) {
      // No necesitamos cambiar la alineación, ya que el porcentaje funciona bien
      // Solo asegurarse de que los transforms son correctos
      
      // Si está alineado a una esquina u otro punto especial, verificar que tenga transforms apropiados
      switch (position.alignment) {
        case 'center':
          transformedPosition.transformX = 'center';
          transformedPosition.transformY = 'center';
          break;
        case 'top-center':
          transformedPosition.transformX = 'center';
          break;
        case 'bottom-center':
          transformedPosition.transformX = 'center';
          transformedPosition.transformY = 'bottom';
          break;
        case 'center-left':
          transformedPosition.transformY = 'center';
          break;
        case 'center-right':
          transformedPosition.transformX = 'right';
          transformedPosition.transformY = 'center';
          break;
        case 'top-left':
          // No necesita transforms
          break;
        case 'top-right':
          transformedPosition.transformX = 'right';
          break;
        case 'bottom-left':
          transformedPosition.transformY = 'bottom';
          break;
        case 'bottom-right':
          transformedPosition.transformX = 'right';
          transformedPosition.transformY = 'bottom';
          break;
      }
    }
  }
  
  return transformedPosition;
}

/**
 * Genera CSS responsivo para un componente
 * @param {Object} component - Componente con configuración
 * @param {string} componentId - ID del componente 
 * @returns {string} - Reglas CSS responsivas
 */
export function generateResponsiveCSS(component, componentId) {
  if (!component.responsiveConfig?.enabled) {
    return ''; // No generar CSS responsivo si no está habilitado
  }
  
  const config = {
    ...DEFAULT_RESPONSIVE_CONFIG,
    ...component.responsiveConfig
  };
  
  let css = '';
  
  // Generar media queries para diferentes breakpoints
  const { breakpoints } = config;
  
  // Media query para mobile
  css += `
    @media (max-width: ${breakpoints.mobile.maxWidth}px) {
      #${componentId} {
        transform: scale(${breakpoints.mobile.scaleFactor});
        transform-origin: top left;
      }
    }
  `;
  
  // Media query para tablet
  css += `
    @media (min-width: ${breakpoints.mobile.maxWidth + 1}px) and (max-width: ${breakpoints.tablet.maxWidth}px) {
      #${componentId} {
        transform: scale(${breakpoints.tablet.scaleFactor});
        transform-origin: top left;
      }
    }
  `;
  
  // Media query para pantallas más grandes que la referencia
  css += `
    @media (min-width: ${config.referenceWidth + 1}px) {
      #${componentId} {
        transform: scale(${breakpoints.desktop.scaleFactor * 1.2});
        transform-origin: top left;
      }
    }
  `;
  
  return css;
}

/**
 * Inicializa configuración responsiva para un componente
 * @param {Object} component - Componente a inicializar
 * @returns {Object} - Componente con configuración responsiva inicializada
 */
export function initializeResponsiveConfig(component) {
  // No modificar el componente original
  const enhancedComponent = { ...component };
  
  // Si ya tiene configuración responsiva, no hacer nada
  if (enhancedComponent.responsiveConfig) {
    return enhancedComponent;
  }
  
  // Configuración por defecto, optimizada según tipo de componente
  let componentConfig = { ...DEFAULT_RESPONSIVE_CONFIG };
  
  // Ajustes específicos según tipo de componente
  if (component.type === 'image') {
    componentConfig.keepAspectRatio = true;
    componentConfig.adaptTextSize = false; // No aplicable para imágenes
    componentConfig.scaleProps = ['width', 'height', 'borderRadius', 'borderWidth'];
    // Asegurar que la imagen permanezca visible en todos los dispositivos
    componentConfig.preservePosition = true;
    
    // Verificar la alineación para establecer punto de origen óptimo
    const deviceView = component.position?.mobile ? 'mobile' : 'desktop';
    const devicePosition = component.position?.[deviceView] || {};
    
    if (devicePosition.alignment === 'center') {
      // Para imágenes centradas, la configuración es óptima por defecto
      componentConfig.scaleFactor = 0.9; // Reducir un poco el tamaño por defecto para evitar desborde
    } else if (['top-right', 'bottom-right', 'center-right'].includes(devicePosition.alignment)) {
      // Para imágenes alineadas a la derecha, ajustar punto de origen
      componentConfig.transformOrigin = 'right center';
    }
    
  } else if (component.type === 'text') {
    componentConfig.adaptTextSize = true;
    componentConfig.scaleProps = ['fontSize', 'padding', 'margin', 'lineHeight', 'width', 'height'];
    componentConfig.minScale = 0.7; // Evitar que el texto se haga demasiado pequeño
    
    // Verificar si el texto es un título grande o párrafo
    const content = typeof component.content === 'string' 
      ? component.content 
      : component.content?.texts?.en || '';
    
    // Para textos grandes (potencialmente títulos), permitir más escalado
    if (content.length < 50) {
      // Título o texto corto: permitir más escalado
      componentConfig.maxScale = 1.2;
      componentConfig.minScale = 0.75;
    } else {
      // Párrafo o texto largo: mantener más consistente
      componentConfig.maxScale = 1.1;
      componentConfig.minScale = 0.8;
    }
    
  } else if (component.type === 'button') {
    componentConfig.adaptTextSize = true;
    componentConfig.scaleProps = ['width', 'height', 'fontSize', 'padding', 'borderRadius', 'borderWidth'];
    componentConfig.minScale = 0.8; // Botones no demasiado pequeños para mantener usabilidad
    
    // Para botones, definir tamaños mínimos para asegurar usabilidad en móvil
    componentConfig.minWidth = 80; // px
    componentConfig.minHeight = 40; // px
  }
  
  // Verificar alineación general para configuración óptima
  const deviceView = component.position?.mobile ? 'mobile' : 'desktop';
  const devicePosition = component.position?.[deviceView] || {};
  
  if (devicePosition.alignment) {
    // Para componentes con alineaciones específicas, configurar según posición
    switch (devicePosition.alignment) {
      case 'center':
        componentConfig.transformOrigin = 'center center';
        break;
      case 'top-left':
        componentConfig.transformOrigin = 'left top';
        break;
      case 'top-right':
        componentConfig.transformOrigin = 'right top';
        break;
      case 'bottom-left':
        componentConfig.transformOrigin = 'left bottom';
        break;
      case 'bottom-right':
        componentConfig.transformOrigin = 'right bottom';
        break;
    }
  }
  
  // Establecer configuración en el componente
  enhancedComponent.responsiveConfig = componentConfig;
  
  return enhancedComponent;
}