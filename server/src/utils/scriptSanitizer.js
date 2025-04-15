// utils/styleSanitizer.js
const logger = require('./logger');

class StyleSanitizer {
  constructor() {
    // Propiedades CSS permitidas y sus valores válidos
    this.allowedProperties = {
      // Posicionamiento
      position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      top: true,
      right: true,
      bottom: true,
      left: true,
      zIndex: true,
      visibility: ['visible', 'hidden'],
      overflow: ['visible', 'hidden', 'scroll', 'auto'],

      // Layout
      display: ['none', 'block', 'flex', 'inline', 'inline-block', 'grid'],
      
      // Dimensiones
      width: true,
      height: true,
      maxWidth: true,
      maxHeight: true,
      minWidth: true,
      minHeight: true,

      // Box Model
      padding: true,
      margin: true,

      // Flexbox
      flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
      flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
      justifyContent: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
      alignItems: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
      flex: true,
      gap: true,

      // Grid
      gridTemplateColumns: true,
      gridTemplateRows: true,
      gridGap: true,

      // Colores y fondo
      color: true,
      backgroundColor: true,
      borderColor: true,
      outlineColor: true,
      opacity: true,

      // Tipografía
      fontFamily: true,
      fontSize: true,
      fontWeight: [
        'normal', 'bold',
        '100','200','300','400','500','600','700','800','900'
      ],
      lineHeight: true,
      textAlign: ['left', 'right', 'center', 'justify'],
      textDecoration: ['none', 'underline', 'line-through'],

      // Bordes
      border: true,
      borderRadius: true,
      borderStyle: ['none', 'solid', 'dashed', 'dotted'],
      borderWidth: true,

      // Sombras
      boxShadow: true,
      textShadow: true,

      // Transiciones y animaciones
      transition: true,
      transform: true,
      animation: true,

      // Cursor
      cursor: ['default', 'pointer', 'not-allowed']
    };

    // Unidades CSS permitidas
    this.allowedUnits = {
      size: ['px', 'em', 'rem', '%', 'vh', 'vw'],
      time: ['s', 'ms'],
      angle: ['deg', 'rad', 'turn']
    };

    // Valores globales permitidos
    this.globalValues = ['inherit', 'initial', 'unset'];

    // Expresiones regulares para validación
    this.patterns = {
      color: /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:[01]|0?\.\d+)\s*\))$/i,
      number: /^-?\d*\.?\d+$/,
      numberWithUnits: /^-?\d*\.?\d+[a-z%]+$/,
      url: /^url\(['"]?([^'")]+)['"]?\)$/
    };
  }

  /**
   * Sanitiza un objeto de estilos (ej. comp.style o comp.responsive.mobile.style),
   * eliminando las propiedades no permitidas o con valores no válidos.
   * Soporta tanto el formato del frontend como el del backend.
   */
  sanitizeStyles(styles) {
    try {
      if (!styles || typeof styles !== 'object') {
        return {};
      }

      // Fuerza serialización, para detectar referencias circulares
      JSON.stringify(styles);
      const sanitized = {};

      // Si contiene desktop, tablet, mobile - detectamos formato frontend
      if (styles.desktop || styles.tablet || styles.mobile) {
        if (styles.desktop && typeof styles.desktop === 'object') {
          sanitized.desktop = this._sanitizeStyleObject(styles.desktop);
        }
        if (styles.tablet && typeof styles.tablet === 'object') {
          sanitized.tablet = this._sanitizeStyleObject(styles.tablet);
        }
        if (styles.mobile && typeof styles.mobile === 'object') {
          sanitized.mobile = this._sanitizeStyleObject(styles.mobile);
        }
        
        // Mantener otras propiedades que no sean device-specific
        Object.entries(styles).forEach(([key, value]) => {
          if (!['desktop', 'tablet', 'mobile'].includes(key)) {
            if (typeof value === 'object') {
              sanitized[key] = this._sanitizeStyleObject(value);
            } else {
              const cssProperty = this._camelToKebab(key);
              const sanitizedValue = this._sanitizeValue(cssProperty, value);
              if (sanitizedValue !== null) {
                sanitized[key] = sanitizedValue;
              }
            }
          }
        });
      } 
      // Si no tiene estructura device-specific, sanitizamos directamente
      else {
        return this._sanitizeStyleObject(styles);
      }

      return sanitized;
    } catch (error) {
      logger.error('Error sanitizing styles:', error);
      return {};
    }
  }

  /**
   * Sanitiza un objeto de estilo plano (no anidado por dispositivo)
   */
  _sanitizeStyleObject(styleObj) {
    if (!styleObj || typeof styleObj !== 'object') {
      return {};
    }

    const sanitized = {};

    Object.entries(styleObj).forEach(([property, value]) => {
      // Si el valor es un objeto anidado (como padding: {top, right, ...})
      if (typeof value === 'object' && value !== null) {
        // Para propiedades como 'padding', 'margin', etc.
        if (['padding', 'margin', 'border'].includes(property)) {
          // Usamos el objeto completo y lo sanitizamos separadamente
          const sanitizedSubObj = this._sanitizeStyleObject(value);
          if (Object.keys(sanitizedSubObj).length > 0) {
            sanitized[property] = sanitizedSubObj;
          }
        } 
        // Para propiedades como 'font', 'colors', etc.
        else {
          const sanitizedSubObj = this._sanitizeStyleObject(value);
          if (Object.keys(sanitizedSubObj).length > 0) {
            sanitized[property] = sanitizedSubObj;
          }
        }
      } 
      // Para valores primitivos
      else {
        const cssProperty = this._camelToKebab(property);
        const sanitizedValue = this._sanitizeValue(cssProperty, value);
        if (sanitizedValue !== null) {
          sanitized[property] = sanitizedValue;
        }
      }
    });

    return sanitized;
  }

  /**
   * Sanitiza una cadena de estilos inline (por ejemplo "width:100px; color:red;")
   * y devuelve la cadena limpia.
   */
  sanitizeInlineStyles(cssString) {
    try {
      if (typeof cssString !== 'string') {
        return '';
      }
      const declarations = cssString.split(';');
      const sanitized = [];

      declarations.forEach(declaration => {
        const [prop, val] = declaration.split(':').map(str => str.trim());
        if (prop && val) {
          const sanitizedVal = this._sanitizeValue(prop, val);
          if (sanitizedVal !== null) {
            sanitized.push(`${prop}: ${sanitizedVal}`);
          }
        }
      });

      return sanitized.join('; ');
    } catch (error) {
      logger.error('Error sanitizing inline styles:', error);
      return '';
    }
  }

  /**
   * Verifica si un valor es válido para la propiedad dada
   */
  isValidValue(property, value) {
    try {
      return this._sanitizeValue(property, value) !== null;
    } catch (error) {
      logger.error('Error validating CSS value:', error);
      return false;
    }
  }

  // Métodos privados

  /**
   * Retorna el valor sanitizado o null si no es permitido
   */
  _sanitizeValue(property, value) {
    // Permitir valores null/undefined - simplemente no los incluimos
    if (value === null || value === undefined) {
      return null;
    }
    
    // Soportar valores globales
    if (this.globalValues.includes(value)) {
      return value;
    }

    // Propiedad permitida?
    const allowedValues = this.allowedProperties[this._kebabToCamel(property)];
    if (!allowedValues) {
      // La propiedad no está en la lista de permitidas
      return null;
    }

    // allowedValues === true => se permiten valores arbitrarios que pasen validaciones extra
    if (allowedValues === true) {
      return this._validateValueByType(property, value);
    }

    // allowedValues es un array (p.ej. display, position, fontWeight, etc.)
    if (Array.isArray(allowedValues)) {
      return allowedValues.includes(value) ? value : null;
    }

    return null;
  }

  /**
   * Aplica validaciones específicas según el tipo de propiedad
   */
  _validateValueByType(property, value) {
    // Manejar valores que sean undefined, null o vacíos
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    // Asegurar que value sea string
    const strValue = String(value);
    
    // Colores
    if (property.includes('color')) {
      // Aceptar nombres de colores CSS comunes
      const namedColors = [
        'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 
        'pink', 'brown', 'gray', 'grey', 'transparent', 'currentcolor',
        'aqua', 'lime', 'teal', 'navy', 'fuchsia', 'olive', 'maroon'
      ];
      
      if (namedColors.includes(strValue.toLowerCase())) {
        return strValue.toLowerCase();
      }
      
      if (!this.patterns.color.test(strValue)) return null;
      
      // Chequear rangos en rgb/rgba
      if (strValue.startsWith('rgb(') || strValue.startsWith('rgba(')) {
        const numbers = strValue.match(/\d+(\.\d+)?/g);
        if (!numbers) return null;
        if (strValue.startsWith('rgb(') && numbers.length === 3) {
          if (numbers.some(num => Number(num) < 0 || Number(num) > 255)) return null;
        } else if (strValue.startsWith('rgba(') && numbers.length === 4) {
          if (numbers.slice(0, 3).some(num => Number(num) < 0 || Number(num) > 255)) return null;
          const alpha = Number(numbers[3]);
          if (alpha < 0 || alpha > 1) return null;
        } else {
          return null;
        }
      }
      return strValue;
    }

    // Números con unidades: p.ej "100px", "2rem", "50%"
    if (this.patterns.numberWithUnits.test(strValue)) {
      const unitMatch = strValue.match(/[a-z%]+$/);
      if (!unitMatch) return null;
      const unit = unitMatch[0];
      
      // Validar unidad según el tipo de propiedad
      if (property.includes('width') || property.includes('height') || 
          property.includes('size') || property.includes('margin') || 
          property.includes('padding') || property.includes('top') || 
          property.includes('left') || property.includes('right') || 
          property.includes('bottom') || property.includes('radius')) {
        if (this.allowedUnits.size.includes(unit)) return strValue;
        return null;
      }
      
      if (property.includes('duration') || property.includes('transition')) {
        if (this.allowedUnits.time.includes(unit)) return strValue;
        return null;
      }
      
      if (property.includes('rotate') || property.includes('angle')) {
        if (this.allowedUnits.angle.includes(unit)) return strValue;
        return null;
      }
      
      // Si llega aquí, es un valor con unidad en una propiedad que no tiene unidad específica
      // Lo aceptamos por flexibilidad
      return strValue;
    }

    // Solo número (p.ej. zIndex, lineHeight numérico, etc.)
    if (this.patterns.number.test(strValue)) {
      return strValue;
    }

    // URL: p.ej. background: "url('...')"
    if (this.patterns.url.test(strValue)) {
      const url = strValue.match(this.patterns.url)[1];
      // Aceptar rutas internas o https
      if (url.startsWith('/') || url.startsWith('https://')) {
        return strValue;
      }
      return null;
    }

    // Valores auto, none, inherit, etc.
    const standardValues = ['auto', 'none', 'inherit', 'initial', 'unset'];
    if (standardValues.includes(strValue.toLowerCase())) {
      return strValue.toLowerCase();
    }

    // Varios sub-valores (ej: "10px 20px")
    // Chequear cada parte recursivamente
    if (strValue.includes(' ')) {
      const parts = strValue.split(' ');
      if (parts.every(part => this._validateValueByType(property, part) !== null)) {
        return strValue;
      }
      return null;
    }

    // Bordes (ej: "1px solid red")
    if (property === 'border' || property.startsWith('border-')) {
      const borderParts = strValue.split(' ');
      // Si tiene 3 partes, verificamos cada una (ancho, estilo, color)
      if (borderParts.length === 3) {
        const [width, style, color] = borderParts;
        if (this._validateValueByType('border-width', width) !== null &&
            this.allowedProperties.borderStyle.includes(style) &&
            this._validateValueByType('border-color', color) !== null) {
          return strValue;
        }
      }
      // Si solo son 2 partes, o si es shorthand especial
      else if (borderParts.length <= 2 || 
               strValue.includes('solid') || 
               strValue.includes('dashed') || 
               strValue.includes('dotted')) {
        return strValue; // Aceptamos formato simplificado por flexibilidad
      }
      return null;
    }

    // Si nada coincide, se descarta
    return null;
  }

  _camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  _kebabToCamel(str) {
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
  }
}

module.exports = new StyleSanitizer();