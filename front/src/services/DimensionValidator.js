/**
 * @fileoverview Validador de dimensiones para componentes del Banner Editor
 * @module DimensionValidator
 * @author Banner Editor Team
 * @version 1.0.0
 */

/**
 * Clase que maneja la validación de límites de dimensiones para componentes
 * Aplica reglas específicas según tipo de componente y unidad
 * 
 * @class DimensionValidator
 */
export class DimensionValidator {
  /**
   * Constructor de DimensionValidator
   */
  constructor() {
    // Límites por defecto para todas las dimensiones
    this.DEFAULT_RULES = {
      percentage: {
        min: 10,  // 10% mínimo
        max: 100  // 100% máximo
      },
      pixels: {
        min: 10   // 10px mínimo, sin máximo específico
      }
    };

    // Límites específicos por tipo de componente
    this.COMPONENT_RULES = {
      button: {
        width: {
          minPx: 80,       // Botones necesitan al menos 80px de ancho para usabilidad
          minPercent: 5,   // O 5% mínimo del contenedor
          maxPercent: 100  // Pueden ocupar todo el ancho disponible
        },
        height: {
          minPx: 30,       // Botones necesitan al menos 30px de altura para touch targets
          minPercent: 3,
          maxPercent: 50   // Máximo 50% de altura para evitar botones gigantes
        }
      },
      text: {
        width: {
          minPx: 40,       // Texto necesita al menos 40px de ancho para legibilidad
          minPercent: 5,
          maxPercent: 100
        },
        height: {
          minPx: 20,       // Altura mínima para una línea de texto
          minPercent: 3,
          maxPercent: 100  // Texto puede ocupar toda la altura disponible
        }
      },
      image: {
        width: {
          minPx: 50,       // Imágenes necesitan al menos 50px para ser visibles
          minPercent: 5,
          maxPercent: 100
        },
        height: {
          minPx: 50,
          minPercent: 5,
          maxPercent: 100
        }
      },
      container: {
        width: {
          minPx: 100,      // Contenedores necesitan espacio mínimo para sus hijos
          minPercent: 10,  // Al menos 10% del contenedor padre
          maxPercent: 100
        },
        height: {
          minPx: 50,
          minPercent: 10,
          maxPercent: 100
        }
      },
      'language-button': {
        width: {
          minPx: 120,      // Botones de idioma necesitan espacio para texto + bandera
          minPercent: 5,
          maxPercent: 50   // No deberían ocupar más del 50% del ancho
        },
        height: {
          minPx: 32,       // Altura estándar para componentes de interfaz
          minPercent: 3,
          maxPercent: 20
        }
      },
      // Componente por defecto - para tipos no reconocidos
      default: {
        width: {
          minPx: 30,
          minPercent: 5,
          maxPercent: 100
        },
        height: {
          minPx: 20,
          minPercent: 3,
          maxPercent: 100
        }
      }
    };
  }

  /**
   * Obtiene las reglas de validación para un tipo de componente y propiedad específicos
   * 
   * @param {string} componentType - Tipo de componente ('button', 'text', 'image', etc.)
   * @param {string} property - Propiedad de dimensión ('width', 'height', etc.)
   * @returns {Object} Objeto con reglas de validación consolidadas
   */
  getRules(componentType, property) {
    // Validar parámetros
    if (!componentType || !property) {
      console.warn('DimensionValidator: componentType y property son requeridos');
      componentType = 'default';
      property = 'width';
    }

    // Normalizar property (extraer base si es minWidth, maxWidth, etc.)
    const baseProperty = property.toLowerCase().includes('width') ? 'width' : 'height';
    
    // Obtener reglas del componente específico
    const componentRules = this.COMPONENT_RULES[componentType] || this.COMPONENT_RULES.default;
    const propertyRules = componentRules[baseProperty] || {};
    
    // Combinar con reglas por defecto
    const consolidatedRules = {
      // Límites en píxeles
      minPx: propertyRules.minPx || this.DEFAULT_RULES.pixels.min,
      maxPx: propertyRules.maxPx || null, // Sin máximo por defecto en píxeles
      
      // Límites en porcentaje
      minPercent: propertyRules.minPercent || this.DEFAULT_RULES.percentage.min,
      maxPercent: propertyRules.maxPercent || this.DEFAULT_RULES.percentage.max,
      
      // Metadatos
      componentType,
      property: baseProperty,
      hasSpecificRules: this.COMPONENT_RULES.hasOwnProperty(componentType)
    };
    
    console.debug(`DimensionValidator: Reglas para ${componentType}.${property}:`, consolidatedRules);
    
    return consolidatedRules;
  }

  /**
   * Valida y ajusta un valor de dimensión según las reglas
   * 
   * @param {string|number} value - Valor a validar
   * @param {string} unit - Unidad del valor ('px', '%')
   * @param {string} componentType - Tipo de componente
   * @param {string} property - Propiedad de dimensión
   * @returns {string} Valor validado y ajustado en formato CSS
   */
  validate(value, unit, componentType, property) {
    // Parsear valor numérico
    const numValue = parseFloat(value);
    
    // Si el valor no es un número válido, retornar valor original
    if (isNaN(numValue)) {
      console.warn(`DimensionValidator: Valor inválido "${value}", retornando sin cambios`);
      return `${value}${unit || 'px'}`;
    }
    
    // Obtener reglas para este componente y propiedad
    const rules = this.getRules(componentType, property);
    
    // Aplicar límites según la unidad
    let validatedValue = numValue;
    let adjustmentMade = false;
    
    if (unit === '%') {
      // Validar límites de porcentaje
      if (validatedValue < rules.minPercent) {
        validatedValue = rules.minPercent;
        adjustmentMade = true;
        console.info(`DimensionValidator: Ajustado ${numValue}% → ${validatedValue}% (mínimo para ${componentType})`);
      }
      
      if (validatedValue > rules.maxPercent) {
        validatedValue = rules.maxPercent;
        adjustmentMade = true;
        console.info(`DimensionValidator: Ajustado ${numValue}% → ${validatedValue}% (máximo para ${componentType})`);
      }
    } else if (unit === 'px') {
      // Validar límites de píxeles
      if (validatedValue < rules.minPx) {
        validatedValue = rules.minPx;
        adjustmentMade = true;
        console.info(`DimensionValidator: Ajustado ${numValue}px → ${validatedValue}px (mínimo para ${componentType})`);
      }
      
      // Aplicar máximo en píxeles solo si está definido
      if (rules.maxPx && validatedValue > rules.maxPx) {
        validatedValue = rules.maxPx;
        adjustmentMade = true;
        console.info(`DimensionValidator: Ajustado ${numValue}px → ${validatedValue}px (máximo para ${componentType})`);
      }
    }
    
    // Log solo si se hizo ajuste
    if (adjustmentMade) {
      console.debug(`DimensionValidator: Validación ${componentType}.${property}: ${value}${unit} → ${validatedValue}${unit}`);
    }
    
    // Retornar valor formateado
    return `${validatedValue}${unit}`;
  }
}

// Export por defecto
export default DimensionValidator;