// src/utils/styleUtils.js

/**
 * Utilidad para manejo, validación y normalización de estilos de componentes
 * Soluciona problemas de coherencia y límites en propiedades de estilo
 */
class StyleUtils {
    constructor() {
      // Valores por defecto por tipo de componente
      this.defaultStyles = {
        text: {
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#000000',
          padding: '10px',
          backgroundColor: 'transparent',
          width: 'auto',
          minWidth: '50px',
          minHeight: '20px',
          borderWidth: '0px',
          borderStyle: 'solid',
          borderColor: 'transparent'
        },
        button: {
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: '#3b82f6',
          padding: '8px 16px',
          borderRadius: '4px',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: '#2563eb',
          width: 'auto',
          minWidth: '100px',
          height: 'auto',
          minHeight: '20px',
          cursor: 'pointer',
          textAlign: 'center'
        },
        image: {
          maxWidth: '100%',
          height: 'auto',
          borderWidth: '0px',
          borderStyle: 'solid',
          borderColor: 'transparent'
        },
        container: {
          padding: '8px',
          backgroundColor: 'transparent',
          border: '1px dashed #ccc'
        }
      };
      
      // Límites para propiedades de estilo
      this.styleLimits = {
        fontSize: { min: 8, max: 72, unit: 'px' },
        padding: { min: 0, max: 50, unit: 'px' },
        margin: { min: 0, max: 50, unit: 'px' },
        borderRadius: { min: 0, max: 50, unit: 'px' },
        borderWidth: { min: 0, max: 10, unit: 'px' },
        borderSize: { min: 0, max: 10, unit: 'px' }, // Nuevo para bordes personalizados
        boxWidth: { min: 30, max: 500, unit: 'px' }, // Mínimo para cajas de texto
        boxHeight: { min: 20, max: 300, unit: 'px' }, // Mínimo para cajas de texto
        buttonWidth: { min: 40, max: 500, unit: 'px' }, // Tamaño mínimo para botones
        buttonHeight: { min: 20, max: 150, unit: 'px' }, // Tamaño mínimo para botones
        opacity: { min: 0, max: 1, unit: '' },
        zIndex: { min: 0, max: 1000, unit: '' }
      };
      
      // Propiedades que deben validarse al agregarlas o modificarlas
      this.criticalProperties = [
        'position', 'top', 'left', 'right', 'bottom',
        'height', 'width', 'minHeight', 'minWidth',
        'maxHeight', 'maxWidth', 'display', 'float',
        'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
        'borderColor', 'borderWidth', 'borderStyle'
      ];
      
      // Valores permitidos para propiedades específicas
      this.allowedValues = {
        position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
        display: ['none', 'block', 'inline', 'inline-block', 'flex', 'grid'],
        textAlign: ['left', 'center', 'right', 'justify'],
        fontWeight: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
        overflow: ['visible', 'hidden', 'scroll', 'auto'],
        borderStyle: ['none', 'solid', 'dashed', 'dotted', 'double']
      };
    }
  
    /**
     * Genera estilos por defecto para un tipo de componente y dispositivo
     * @param {string} componentType - Tipo de componente (text, button, etc.)
     * @param {string} deviceType - Tipo de dispositivo (desktop, tablet, mobile)
     * @returns {Object} - Estilos por defecto
     */
    getDefaultStyles(componentType, deviceType = 'desktop') {
      const baseStyles = this.defaultStyles[componentType] || {};
      
      // Ajustes responsive
      if (deviceType === 'tablet') {
        return {
          ...baseStyles,
          fontSize: componentType === 'text' ? '14px' : '12px',
          padding: componentType === 'button' ? '6px 12px' : baseStyles.padding
        };
      } else if (deviceType === 'mobile') {
        return {
          ...baseStyles,
          fontSize: componentType === 'text' ? '12px' : '10px',
          padding: componentType === 'button' ? '4px 10px' : baseStyles.padding
        };
      }
      
      return { ...baseStyles };
    }
  
    /**
     * Parsea un valor de estilo CSS y extrae su valor numérico y unidad
     * @param {string|number} value - Valor a parsear (ej: "10px", 10, "50%")
     * @param {string} defaultUnit - Unidad por defecto si no se detecta
     * @returns {Object} - Objeto con el valor numérico y unidad { value, unit }
     */
    parseStyleValue(value, defaultUnit = 'px') {
      // Si es un número, usar la unidad por defecto
      if (typeof value === 'number') {
        return { value, unit: defaultUnit };
      }
      
      // Si no es string o está vacío, devolver valores por defecto
      if (typeof value !== 'string' || !value.trim()) {
        return { value: 0, unit: defaultUnit };
      }
      
      // Buscar números y unidades (ej: "10px", "1.5em", "50%")
      const match = value.match(/^([-+]?[0-9]*\.?[0-9]+)([a-z%]*)$/);
      if (match) {
        return {
          value: parseFloat(match[1]),
          unit: match[2] || defaultUnit
        };
      }
      
      // Si no se puede parsear, devolver valores por defecto
      return { value: 0, unit: defaultUnit };
    }
    
    /**
     * Formatea un valor numérico con una unidad como string CSS
     * @param {number} value - Valor numérico
     * @param {string} unit - Unidad CSS (px, %, em, etc.)
     * @param {number} precision - Número de decimales para redondeo
     * @returns {string} - Valor formateado (ej: "10.5px")
     */
    formatStyleValue(value, unit = 'px', precision = 2) {
      // Si no es un número válido, devolver 0 con la unidad
      if (isNaN(parseFloat(value))) {
        return `0${unit}`;
      }
      
      // Para valores enteros, no mostrar decimales
      if (Number.isInteger(Number(value))) {
        return `${value}${unit}`;
      }
      
      // Para valores con decimales, redondear a la precisión especificada
      return `${parseFloat(value).toFixed(precision)}${unit}`;
    }
    
    /**
     * Convierte un valor de una unidad a otra
     * @param {string|number} value - Valor a convertir
     * @param {string} fromUnit - Unidad original
     * @param {string} toUnit - Unidad destino
     * @param {number} containerSize - Tamaño del contenedor (para % <-> px)
     * @returns {number} - Valor convertido (sin unidad)
     */
    convertStyleUnit(value, fromUnit, toUnit, containerSize = 0) {
      // Si es el mismo tipo de unidad, devolver el valor tal cual
      if (fromUnit === toUnit) {
        return typeof value === 'string' ? parseFloat(value) : value;
      }
      
      // Extraer valor numérico
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      // Convertir entre unidades
      if (fromUnit === 'px' && toUnit === '%' && containerSize > 0) {
        return (numValue / containerSize) * 100;
      } else if (fromUnit === '%' && toUnit === 'px' && containerSize > 0) {
        return (numValue * containerSize) / 100;
      }
      
      // Si no podemos convertir, devolver el valor original
      console.warn(`No se puede convertir de ${fromUnit} a ${toUnit}`);
      return numValue;
    }

    /**
     * Valida un valor de estilo según sus límites
     * @param {string} property - Propiedad CSS
     * @param {string|number} value - Valor a validar
     * @returns {string|number} - Valor validado
     */
    validateStyleValue(property, value) {
      // Si no hay valor o no está en nuestros límites, devolver el valor original
      if (value === undefined || value === null || !this.styleLimits[property]) {
        // Verificar si es un valor de enumeración
        if (this.allowedValues[property]) {
          return this.allowedValues[property].includes(value) ? 
            value : this.allowedValues[property][0];
        }
        return value;
      }
      
      // Parsear el valor de estilo
      const { value: numValue, unit } = this.parseStyleValue(value, this.styleLimits[property].unit);
      
      // Aplicar límites
      const { min, max } = this.styleLimits[property];
      const validValue = Math.min(max, Math.max(min, numValue));
      
      // Si es igual al valor original, devolver el original para preservar formato
      if (validValue === numValue && typeof value === 'string') return value;
      
      // Formatear con unidad
      return this.formatStyleValue(validValue, unit);
    }
  
    /**
     * Sanitiza un objeto de estilos completo
     * @param {Object} styles - Objeto con propiedades de estilo a sanitizar
     * @param {Object} options - Opciones de sanitización
     * @returns {Object} - Estilos sanitizados
     */
    sanitizeStyles(styles, options = {}) {
      if (!styles || typeof styles !== 'object') return {};
      
      const sanitized = {};
      const { strict = false } = options;
      
      // Iterar sobre cada propiedad y validar
      Object.entries(styles).forEach(([key, value]) => {
        // Si es modo estricto, solo permitir propiedades en nuestra lista
        if (strict && !this.styleLimits[key] && !this.allowedValues[key] && 
            !this.criticalProperties.includes(key)) {
          return;
        }
        
        // Validar valor
        sanitized[key] = this.validateStyleValue(key, value);
      });
      
      return sanitized;
    }
  
    /**
     * Crea un estilo completo para un componente (todos los dispositivos)
     * @param {string} componentType - Tipo de componente
     * @param {Object} customStyles - Estilos personalizados (opcional)
     * @returns {Object} - Estilos completos para todos los dispositivos
     */
    createComponentStyles(componentType, customStyles = {}) {
      return {
        desktop: {
          ...this.getDefaultStyles(componentType, 'desktop'),
          ...(customStyles.desktop || {})
        },
        tablet: {
          ...this.getDefaultStyles(componentType, 'tablet'),
          ...(customStyles.tablet || {})
        },
        mobile: {
          ...this.getDefaultStyles(componentType, 'mobile'),
          ...(customStyles.mobile || {})
        }
      };
    }
  
    /**
     * Convierte estilos entre el formato frontend y backend
     * @param {Object} styles - Estilos en formato frontend
     * @param {Object} options - Opciones de conversión
     * @returns {Object} - Estilos en formato backend
     */
    convertToBackendFormat(styles, options = {}) {
      if (!styles) return {};
      
      const result = {
        // Usar desktop como base
        ...this.sanitizeStyles(styles.desktop || {}, options),
        
        // Agregar responsive solo si hay diferencias
        responsive: {}
      };
      
      // Agregar estilos tablet solo si son diferentes
      if (styles.tablet && Object.keys(styles.tablet).length > 0) {
        const tabletStyles = this.sanitizeStyles(styles.tablet || {}, options);
        // Solo incluir propiedades diferentes a desktop
        const tabletDiff = {};
        Object.entries(tabletStyles).forEach(([key, value]) => {
          if (value !== result[key]) {
            tabletDiff[key] = value;
          }
        });
        
        if (Object.keys(tabletDiff).length > 0) {
          result.responsive.tablet = { style: tabletDiff };
        }
      }
      
      // Agregar estilos mobile solo si son diferentes
      if (styles.mobile && Object.keys(styles.mobile).length > 0) {
        const mobileStyles = this.sanitizeStyles(styles.mobile || {}, options);
        // Solo incluir propiedades diferentes a desktop
        const mobileDiff = {};
        Object.entries(mobileStyles).forEach(([key, value]) => {
          if (value !== result[key]) {
            mobileDiff[key] = value;
          }
        });
        
        if (Object.keys(mobileDiff).length > 0) {
          result.responsive.mobile = { style: mobileDiff };
        }
      }
      
      // Si no hay estilos responsive, eliminar la propiedad
      if (Object.keys(result.responsive).length === 0) {
        delete result.responsive;
      }
      
      return result;
    }
  
    /**
     * Convierte estilos de formato backend a frontend
     * @param {Object} backendStyles - Estilos en formato backend
     * @returns {Object} - Estilos en formato frontend
     */
    convertToFrontendFormat(backendStyles) {
      if (!backendStyles) return {
        desktop: {},
        tablet: {},
        mobile: {}
      };
      
      const desktopStyles = this.sanitizeStyles(backendStyles || {});
      
      // Base para todos los dispositivos
      const result = {
        desktop: { ...desktopStyles },
        tablet: { ...desktopStyles },
        mobile: { ...desktopStyles }
      };
      
      // Aplicar estilos específicos para tablet
      if (backendStyles.responsive?.tablet?.style) {
        result.tablet = {
          ...result.tablet,
          ...this.sanitizeStyles(backendStyles.responsive.tablet.style)
        };
      }
      
      // Aplicar estilos específicos para mobile
      if (backendStyles.responsive?.mobile?.style) {
        result.mobile = {
          ...result.mobile,
          ...this.sanitizeStyles(backendStyles.responsive.mobile.style)
        };
      }
      
      return result;
    }
    
    /**
     * Detecta conflictos entre propiedades de estilo
     * @param {Object} styles - Estilos a analizar
     * @returns {Array} - Lista de conflictos detectados
     */
    detectStyleConflicts(styles) {
      const conflicts = [];
      
      // Detectar conflictos en la posición
      if (styles.position === 'absolute' || styles.position === 'fixed') {
        if (!styles.top && !styles.bottom) {
          conflicts.push('Posición absoluta/fija sin definir top o bottom');
        }
        if (!styles.left && !styles.right) {
          conflicts.push('Posición absoluta/fija sin definir left o right');
        }
      }
      
      // Detectar conflictos en dimensiones
      if (styles.width && styles.maxWidth && 
          parseInt(styles.width) > parseInt(styles.maxWidth)) {
        conflicts.push('Width mayor que maxWidth');
      }
      
      if (styles.height && styles.maxHeight && 
          parseInt(styles.height) > parseInt(styles.maxHeight)) {
        conflicts.push('Height mayor que maxHeight');
      }
      
      // Detectar conflictos en display
      if (styles.display === 'none' && styles.opacity !== undefined && 
          styles.opacity > 0) {
        conflicts.push('Display none con opacity mayor a 0');
      }
      
      return conflicts;
    }
    
    /**
     * Genera un objeto de estilo para un tipo específico de layout
     * @param {string} layoutType - Tipo de layout (banner, modal, floating)
     * @param {string} position - Posición del layout (top, bottom, center, etc.)
     * @returns {Object} - Estilos para el layout específico
     */
    generateLayoutStyles(layoutType, position) {
      // Estilos base según tipo
      let baseStyles = {};
      
      switch (layoutType) {
        case 'banner':
          baseStyles = {
            position: 'fixed',
            width: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            zIndex: 9999
          };
          break;
          
        case 'modal':
          baseStyles = {
            position: 'fixed',
            width: '80%',
            maxWidth: '600px',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 20px rgba(0,0,0,0.2)',
            borderRadius: '8px',
            zIndex: 10000
          };
          break;
          
        case 'floating':
          baseStyles = {
            position: 'fixed',
            width: 'auto',
            maxWidth: '300px',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 10px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            zIndex: 9998
          };
          break;
          
        default:
          baseStyles = {
            position: 'fixed',
            width: '100%'
          };
      }
      
      // Ajuste según posición
      switch (position) {
        case 'top':
          baseStyles = { ...baseStyles, top: 0, left: 0, right: 0 };
          break;
          
        case 'bottom':
          baseStyles = { ...baseStyles, bottom: 0, left: 0, right: 0 };
          break;
          
        case 'center':
          baseStyles = { 
            ...baseStyles, 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)' 
          };
          break;
          
        case 'top-left':
          baseStyles = { ...baseStyles, top: 0, left: 0 };
          break;
          
        case 'top-right':
          baseStyles = { ...baseStyles, top: 0, right: 0 };
          break;
          
        case 'bottom-left':
          baseStyles = { ...baseStyles, bottom: 0, left: 0 };
          break;
          
        case 'bottom-right':
          baseStyles = { ...baseStyles, bottom: 0, right: 0 };
          break;
          
        default:
          baseStyles = { ...baseStyles, bottom: 0, left: 0, right: 0 };
      }
      
      return baseStyles;
    }
  }
  
  export default new StyleUtils();