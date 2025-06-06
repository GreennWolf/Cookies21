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
   */
  sanitizeStyles(styles) {
    try {
      if (!styles || typeof styles !== 'object') {
        return {};
      }

      // Fuerza serialización, para detectar referencias circulares
      JSON.stringify(styles);
      const sanitized = {};

      Object.entries(styles).forEach(([property, value]) => {
        const cssProperty = this._camelToKebab(property);
        const sanitizedValue = this._sanitizeValue(cssProperty, value);
        if (sanitizedValue !== null) {
          sanitized[property] = sanitizedValue;
        }
      });

      return sanitized;
    } catch (error) {
      logger.error('Error sanitizing styles:', error);
      return {};
    }
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
    // Colores
    if (property.includes('color')) {
      if (!this.patterns.color.test(value)) return null;
      // Chequear rangos en rgb/rgba
      if (value.startsWith('rgb(') || value.startsWith('rgba(')) {
        const numbers = value.match(/\d+(\.\d+)?/g);
        if (!numbers) return null;
        if (value.startsWith('rgb(') && numbers.length === 3) {
          if (numbers.some(num => Number(num) < 0 || Number(num) > 255)) return null;
        } else if (value.startsWith('rgba(') && numbers.length === 4) {
          if (numbers.slice(0, 3).some(num => Number(num) < 0 || Number(num) > 255)) return null;
          const alpha = Number(numbers[3]);
          if (alpha < 0 || alpha > 1) return null;
        } else {
          return null;
        }
      }
      return value;
    }

    // Números con unidades: p.ej "100px", "2rem", "50%"
    if (this.patterns.numberWithUnits.test(value)) {
      const unitMatch = value.match(/[a-z%]+$/);
      if (!unitMatch) return null;
      const unit = unitMatch[0];
      if (this.allowedUnits.size.includes(unit)) return value;
      return null;
    }

    // Solo número (p.ej. zIndex, lineHeight numérico, etc.)
    if (this.patterns.number.test(value)) {
      return value;
    }

    // URL: p.ej. background: "url('...')"
    if (this.patterns.url.test(value)) {
      const url = value.match(this.patterns.url)[1];
      // Aceptar rutas internas o https
      if (url.startsWith('/') || url.startsWith('https://')) {
        return value;
      }
      return null;
    }

    // Varios sub-valores (ej: "10px 20px")
    // Chequear cada parte recursivamente
    if (value.includes(' ')) {
      const parts = value.split(' ');
      if (parts.every(part => this._validateValueByType(property, part) !== null)) {
        return value;
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
