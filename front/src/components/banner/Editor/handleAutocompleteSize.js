/**
 * Utilidad para manejar el autocompletado de dimensiones según el tipo de componente,
 * respetando las proporciones y las dimensiones actuales del componente.
 * 
 * Correcciones:
 * - Usa correctamente el canvas como referencia para porcentajes (100% = ancho/alto total del canvas)
 * - Autocompleta con dimensiones actuales del componente cuando existen
 * - Respeta los mínimos por tipo de componente y los muestra como advertencia
 * - Maneja correctamente los porcentajes para que 100% ocupe todo el canvas
 * - Conserva las proporciones en imágenes
 */

const handleAutocompleteSize = (
  componentType,
  deviceView,
  propertyName,
  unit,
  getDimensions
) => {
  // Obtener dimensiones reales
  const dimensions = getDimensions();
  if (!dimensions || !dimensions.containerRect) {
    console.error('No se pudo obtener dimensiones del canvas para autocompletar');
    return null;
  }
  
  // Dimensiones del canvas
  const canvasWidth = dimensions.containerRect.width;
  const canvasHeight = dimensions.containerRect.height;
  
  // Dimensiones actuales del componente (priorizar estas si existen)
  const compRect = dimensions.compRect || null;
  const componentElem = dimensions.componentEl || null;
  
  // Obtener dimensiones reales del componente - MUY IMPORTANTE
  let componentWidth = 0;
  let componentHeight = 0;
  
  // 1. Primero intentar obtener del rect que es más preciso
  if (compRect) {
    componentWidth = compRect.width;
    componentHeight = compRect.height;
  } 
  // 2. Intentar obtener del elemento DOM directamente
  else if (componentElem) {
    componentWidth = componentElem.offsetWidth;
    componentHeight = componentElem.offsetHeight;
  }
  // 3. Usar width/height que nos pasaron (menos preciso)
  else if (dimensions.width && dimensions.height) {
    componentWidth = dimensions.width;
    componentHeight = dimensions.height;
  }
  
  // Calcular porcentajes actuales del componente
  const componentWidthPercent = (componentWidth / canvasWidth) * 100;
  const componentHeightPercent = (componentHeight / canvasHeight) * 100;
  
  // Definir valores mínimos según tipo de componente (en píxeles)
  const minimumSizes = {
    'button': { width: 80, height: 30 },
    'text': { width: 40, height: 20 },
    'image': { width: 50, height: 50 },
    'default': { width: 30, height: 30 }
  };
  
  // Obtener mínimos para el tipo de componente actual
  const minWidth = minimumSizes[componentType]?.width || minimumSizes.default.width;
  const minHeight = minimumSizes[componentType]?.height || minimumSizes.default.height;
  
  // Convertir mínimos a porcentajes para comparaciones
  const minWidthPercent = (minWidth / canvasWidth) * 100;
  const minHeightPercent = (minHeight / canvasHeight) * 100;
  
  // Determinar el valor ideal basado en el tipo de propiedad
  let idealValue = null;
  
  // AUTOCOMPLETA SEGÚN TIPO DE UNIDAD
  if (unit === '%') {
    // ===== PORCENTAJES =====
    
    // Si es width o maxWidth
    if (propertyName === 'width' || propertyName === 'maxWidth') {
      // 1. SIEMPRE usar el ancho actual como base si existe
      if (componentWidth > 0) {
        idealValue = componentWidthPercent;
      } 
      // 2. Si no hay ancho actual, usar valores predeterminados según tipo
      else {
        switch (componentType) {
          case 'button':
            idealValue = deviceView === 'mobile' ? 90 : 25;
            break;
          case 'text':
            idealValue = deviceView === 'mobile' ? 90 : 50;
            break;
          case 'image':
            idealValue = deviceView === 'mobile' ? 90 : 40;
            break;
          default:
            idealValue = 50;
        }
      }
      
      // Asegurarse que no es menor que el mínimo
      if (idealValue < minWidthPercent) {
        console.warn(`El ancho ${idealValue.toFixed(1)}% es menor que el mínimo ${minWidthPercent.toFixed(1)}%. Usando mínimo.`);
        idealValue = minWidthPercent;
      }
    }
    // Si es height o maxHeight
    else if (propertyName === 'height' || propertyName === 'maxHeight') {
      // 1. SIEMPRE usar la altura actual como base si existe
      if (componentHeight > 0) {
        idealValue = componentHeightPercent;
      } 
      // 2. Si no hay altura actual, usar valores predeterminados según tipo
      else {
        switch (componentType) {
          case 'button':
            idealValue = 8; // Los botones suelen ser más pequeños en altura
            break;
          case 'text':
            idealValue = 15;
            break;
          case 'image':
            // Para imágenes intentar mantener proporción si hay ancho definido
            if (componentWidth > 0 && compRect) {
              const ratio = compRect.height / compRect.width;
              idealValue = componentWidthPercent * ratio;
            } else {
              idealValue = 40;
            }
            break;
          default:
            idealValue = 20;
        }
      }
      
      // Asegurarse que no es menor que el mínimo
      if (idealValue < minHeightPercent) {
        console.warn(`La altura ${idealValue.toFixed(1)}% es menor que el mínimo ${minHeightPercent.toFixed(1)}%. Usando mínimo.`);
        idealValue = minHeightPercent;
      }
    }
    // Si es minWidth
    else if (propertyName === 'minWidth') {
      idealValue = minWidthPercent;
    }
    // Si es minHeight
    else if (propertyName === 'minHeight') {
      idealValue = minHeightPercent;
    }
  } 
  // PÍXELES
  else if (unit === 'px') {
    // ===== PÍXELES =====
    
    // Si es width o maxWidth
    if (propertyName === 'width' || propertyName === 'maxWidth') {
      // 1. SIEMPRE usar el ancho actual como base si existe
      if (componentWidth > 0) {
        idealValue = componentWidth;
      } 
      // 2. Si no hay ancho actual, calcular según tipo y canvas
      else {
        switch (componentType) {
          case 'button':
            idealValue = deviceView === 'mobile' ? 
              (canvasWidth * 0.9) : // En móvil casi todo el ancho
              Math.min(180, canvasWidth * 0.25); // Botón con ancho limitado
            break;
          case 'text':
            idealValue = deviceView === 'mobile' ? 
              (canvasWidth * 0.9) : // En móvil casi todo el ancho
              (canvasWidth * 0.5); // Mitad del ancho en desktop
            break;
          case 'image':
            idealValue = deviceView === 'mobile' ? 
              (canvasWidth * 0.9) : // En móvil casi todo el ancho
              (canvasWidth * 0.4); // 40% del ancho en desktop
            break;
          default:
            idealValue = canvasWidth * 0.5;
        }
      }
      
      // Asegurarse que no es menor que el mínimo
      if (idealValue < minWidth) {
        console.warn(`El ancho ${idealValue.toFixed(0)}px es menor que el mínimo ${minWidth}px. Usando mínimo.`);
        idealValue = minWidth;
      }
      
      // DESACTIVADO: Límite de ancho que causaba problemas con zoom
      // if (idealValue > canvasWidth) {
      //   idealValue = canvasWidth;
      // }
    }
    // Si es height o maxHeight
    else if (propertyName === 'height' || propertyName === 'maxHeight') {
      // 1. SIEMPRE usar la altura actual como base si existe
      if (componentHeight > 0) {
        idealValue = componentHeight;
      } 
      // 2. Si no hay altura actual, calcular según tipo y canvas
      else {
        switch (componentType) {
          case 'button':
            idealValue = Math.max(minHeight, Math.min(50, canvasHeight * 0.08));
            break;
          case 'text':
            idealValue = Math.max(minHeight, canvasHeight * 0.15);
            break;
          case 'image':
            // Para imágenes intentar mantener proporción si hay ancho definido
            if (componentWidth > 0 && compRect) {
              const ratio = compRect.height / compRect.width;
              idealValue = componentWidth * ratio;
            } else {
              idealValue = canvasHeight * 0.4;
            }
            break;
          default:
            idealValue = canvasHeight * 0.2;
        }
      }
      
      // Asegurarse que no es menor que el mínimo
      if (idealValue < minHeight) {
        console.warn(`La altura ${idealValue.toFixed(0)}px es menor que el mínimo ${minHeight}px. Usando mínimo.`);
        idealValue = minHeight;
      }
      
      // DESACTIVADO: Límite de altura que causaba problemas con zoom
      // if (idealValue > canvasHeight) {
      //   idealValue = canvasHeight;
      // }
    }
    // Si es minWidth
    else if (propertyName === 'minWidth') {
      idealValue = minWidth;
    }
    // Si es minHeight
    else if (propertyName === 'minHeight') {
      idealValue = minHeight;
    }
  }
  
  // Redondear según tipo de unidad para mejor presentación
  if (idealValue !== null) {
    if (unit === '%') {
      idealValue = Math.round(idealValue * 10) / 10; // Un decimal para porcentajes
    } else {
      idealValue = Math.round(idealValue); // Sin decimales para píxeles
    }
  }
  
  return idealValue;
};

export default handleAutocompleteSize;