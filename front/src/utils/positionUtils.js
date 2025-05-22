// utils/positionUtils.js
// Utilidad centralizada para manejar cálculos de posición y dimensiones

/**
 * Utilidad para manejar cálculos de posición y dimensiones de manera consistente
 * en todos los componentes del editor de banner
 */
export const PositionUtils = {
    /**
     * Analiza un valor CSS y extrae el valor numérico y la unidad
     * 
     * @param {string} cssValue - Valor CSS (e.g. "10px", "50%")
     * @param {string} defaultUnit - Unidad por defecto si no se especifica
     * @returns {Object} - { value: number, unit: string }
     */
    parseCssValue(cssValue, defaultUnit = 'px') {
      if (!cssValue || typeof cssValue !== 'string') {
        return { value: 0, unit: defaultUnit };
      }
      
      // Extraer el valor numérico y la unidad
      const matches = cssValue.match(/^([\d.]+)(.*)$/);
      if (!matches) {
        return { value: 0, unit: defaultUnit };
      }
      
      const numValue = parseFloat(matches[1]) || 0;
      const unit = matches[2] || defaultUnit;
      
      return { value: numValue, unit };
    },

    /**
     * Calcula la posición en porcentaje basada en píxeles
     * 
     * @param {number} pixelValue - Valor en píxeles
     * @param {number} containerSize - Tamaño del contenedor en píxeles
     * @returns {number} - Valor en porcentaje (sin símbolo %)
     */
    pixelsToPercent(pixelValue, containerSize) {
      if (!containerSize) return 0;
      return (pixelValue / containerSize) * 100;
    },
  
    /**
     * Calcula la posición en píxeles basada en porcentaje
     * 
     * @param {number} percentValue - Valor en porcentaje (sin símbolo %)
     * @param {number} containerSize - Tamaño del contenedor en píxeles
     * @returns {number} - Valor en píxeles
     */
    percentToPixels(percentValue, containerSize) {
      return (percentValue / 100) * containerSize;
    },
    
    /**
     * Convierte un valor de una unidad a otra
     * 
     * @param {number} value - Valor numérico
     * @param {string} fromUnit - Unidad original ('px', '%', etc.)
     * @param {string} toUnit - Unidad destino ('px', '%', etc.)
     * @param {number} containerSize - Tamaño del contenedor (necesario para conversión %<->px)
     * @returns {number} - Valor convertido
     */
    convertUnit(value, fromUnit, toUnit, containerSize) {
      if (fromUnit === toUnit) {
        return value;
      }
      
      // Conversión de px a %
      if (fromUnit === 'px' && toUnit === '%') {
        return this.pixelsToPercent(value, containerSize);
      }
      
      // Conversión de % a px
      if (fromUnit === '%' && toUnit === 'px') {
        return this.percentToPixels(value, containerSize);
      }
      
      // Si no se puede convertir, devolver el valor original
      console.warn(`No se puede convertir de ${fromUnit} a ${toUnit}`);
      return value;
    },
  
    /**
     * Calcula la posición segura para un componente
     * 
     * @param {Object} params - Parámetros
     * @param {number} params.value - Valor de posición (left o top)
     * @param {number} params.componentSize - Tamaño del componente (width o height)
     * @param {number} params.containerSize - Tamaño del contenedor (width o height)
     * @param {boolean} params.isRightOrBottom - Si es posición right o bottom
     * @returns {number} - Valor seguro en la misma unidad que se proporcionó
     */
    calculateSafePosition({ value, componentSize, containerSize, isRightOrBottom = false }) {
      // Para posiciones izquierda/arriba, simplemente evitamos valores negativos
      if (!isRightOrBottom) {
        return Math.max(0, value);
      }
      
      // Para posiciones derecha/abajo, evitamos desbordamiento
      // Consideramos el tamaño del componente para que no salga del contenedor
      const maxValue = containerSize - componentSize;
      return Math.min(value, maxValue);
    },
  
    /**
     * Calcula la posición para situaciones especiales (esquinas, centro, etc.)
     * 
     * @param {string} positionCode - Código de posición ('tl', 'tr', 'cc', etc.)
     * @param {Object} dims - Dimensiones del componente y contenedor
     * @returns {Object} - Posición { top, left } en porcentajes
     */
    calculatePositionByCode(positionCode, dims) {
      const { widthPercent, heightPercent, containerRect } = dims;
      
      // Posiciones estándar
      const positions = {
        // Primera fila (Superior)
        'tl': { top: 0, left: 0 },
        'tc': { top: 0, left: 50 - (widthPercent / 2) },
        'tr': { top: 0, left: 99.82 - widthPercent },
        
        // Segunda fila (Centro)
        'cl': { top: 50 - (heightPercent / 2), left: 0 },
        'cc': { top: 50 - (heightPercent / 2), left: 50 - (widthPercent / 2) },
        'cr': { top: 50 - (heightPercent / 2), left: 99.82 - widthPercent },
        
        // Tercera fila (Inferior)
        'bl': { top: 100 - heightPercent, left: 0 },
        'bc': { top: 100 - heightPercent, left: 50 - (widthPercent / 2) },
        'br': { top: 100 - heightPercent, left: 99.82 - widthPercent }
      };
  
      // Si la posición solicitada existe, la devolvemos
      if (positions[positionCode]) {
        return positions[positionCode];
      }
      
      // Si no existe, devolvemos la posición central
      console.warn(`Posición ${positionCode} no reconocida, usando centro`);
      return positions['cc'];
    },
    
    /**
     * Devuelve propiedades de limpieza para evitar problemas de posicionamiento
     * @returns {Object} - Propiedades CSS para limpiar
     */
    getCleanupProps() {
      return {
        transform: 'none',
        right: 'auto',
        bottom: 'auto'
      };
    },
    
    /**
     * Formatea un valor numérico como string CSS con unidad
     * 
     * @param {number} value - Valor numérico
     * @param {string} unit - Unidad CSS ('px', '%', etc.)
     * @param {number} precision - Precisión decimal
     * @returns {string} - Valor formateado (ej: "10.5%")
     */
    formatWithUnit(value, unit = '%', precision = 2) {
      return `${value.toFixed(precision)}${unit}`;
    }
  };
  
  export default PositionUtils;