// utils/bannerValidator.js

class BannerValidator {
  constructor() {
    // Tipos de componentes permitidos
    this.ALLOWED_COMPONENT_TYPES = [
      'text',
      'button',
      'link',
      'logo',
      'checkbox',
      'toggle',
      'container',
      'panel',
      'image'
    ];

    // Posiciones permitidas
    this.ALLOWED_POSITIONS = [
      'top', 'bottom', 'center',
      'top-left', 'top-right',
      'bottom-left', 'bottom-right'
    ];

    // Acciones permitidas
    this.ALLOWED_ACTIONS = [
      'accept_all',
      'reject_all',
      'save_preferences',
      'show_preferences',
      'close',
      'none',
      'custom'
    ];

    // Límites de validación
    this.LIMITS = {
      maxWidth: 1920,
      maxHeight: 1080,
      maxComponents: 50,
      maxNesting: 5,
      maxTextLength: 5000
    };
  }

  /**
   * Punto de entrada principal:
   * Valida la config de banner (layout + components + etc.)
   */
  validateBannerConfig(config) {
    try {
      const errors = [];

      if (!config || typeof config !== 'object') {
        return {
          isValid: false,
          errors: ['Invalid banner configuration structure']
        };
      }

      // Validar layout
      errors.push(...this._validateLayout(config.layout));
      // Validar componentes
      errors.push(...this._validateComponents(config.components));

      // Validar tema (opcional)
      if (config.theme) {
        errors.push(...this._validateTheme(config.theme));
      }

      // Validar settings (opcional)
      if (config.settings) {
        errors.push(...this._validateSettings(config.settings));
      }

      // Validar acciones requeridas (ej. accept_all, reject_all)
      errors.push(...this._validateRequiredActions(config.components));

      return {
        isValid: errors.length === 0,
        errors: errors.filter(e => e) // Filtrar valores vacíos
      };
    } catch (error) {
      console.error('Error validating banner config:', error);
      return {
        isValid: false,
        errors: ['Internal validation error']
      };
    }
  }

  /**
   * Validación de layout siguiendo el formato del frontend
   */
  _validateLayout(layout) {
    const errors = [];
    
    // Si no hay layout, es un error
    if (!layout || typeof layout !== 'object') {
      errors.push('Invalid layout configuration');
      return errors;
    }
  
    // Detectar formato (backend vs frontend)
    const isBackendFormat = layout.default && typeof layout.default === 'object';
    const isFrontendFormat = layout.desktop && typeof layout.desktop === 'object';
    
    // Si no está en ningún formato conocido, es error
    if (!isBackendFormat && !isFrontendFormat) {
      errors.push('layout.desktop is required and must be an object');
      return errors;
    }
  
    if (isBackendFormat) {
      // Validar formato backend
      errors.push(...this._validateLayoutDevice(layout.default, 'default'));
      
      // Validar responsive si existe
      if (layout.responsive) {
        if (typeof layout.responsive === 'object') {
          if (layout.responsive.tablet) {
            errors.push(...this._validateLayoutDevice(layout.responsive.tablet, 'tablet'));
          }
          if (layout.responsive.mobile) {
            errors.push(...this._validateLayoutDevice(layout.responsive.mobile, 'mobile'));
          }
        } else {
          errors.push('layout.responsive must be an object');
        }
      }
    } else {
      // Validar formato frontend
      errors.push(...this._validateLayoutDevice(layout.desktop, 'desktop'));
      
      if (layout.tablet) {
        errors.push(...this._validateLayoutDevice(layout.tablet, 'tablet'));
      }
      
      if (layout.mobile) {
        errors.push(...this._validateLayoutDevice(layout.mobile, 'mobile'));
      }
    }
  
    return errors;
  }

  /**
   * Valida un sub-layout específico para un dispositivo
   */
  _validateLayoutDevice(deviceConfig, prefix) {
    const errors = [];
    
    // Validar tipo
    if (!deviceConfig.type || !['modal', 'banner', 'floating'].includes(deviceConfig.type)) {
      errors.push(`Invalid layout ${prefix}.type`);
    }
    
    // Validar posición
    if (!deviceConfig.position || !this.ALLOWED_POSITIONS.includes(deviceConfig.position)) {
      errors.push(`Invalid layout ${prefix}.position`);
    }
    
    // Validar dimensiones
    const width = parseInt(deviceConfig.width, 10);
    const height = parseInt(deviceConfig.height, 10);
    
    if (!isNaN(width) && width > this.LIMITS.maxWidth) {
      errors.push(`${prefix}: width cannot exceed ${this.LIMITS.maxWidth}px`);
    }
    
    if (!isNaN(height) && height > this.LIMITS.maxHeight) {
      errors.push(`${prefix}: height cannot exceed ${this.LIMITS.maxHeight}px`);
    }
    
    return errors;
  }

  /**
   * Validación de los componentes
   */
  _validateComponents(components, depth = 0) {
    const errors = [];
    const seenIds = new Set();
  
    if (!Array.isArray(components)) {
      errors.push('Components must be an array');
      return errors;
    }
  
    console.log('Validating components:', components.length);
    
    // Solo aplicar esta verificación al nivel superior (depth=0)
    if (depth === 0 && components.length === 0) {
      errors.push('At least one component is required');
      return errors;
    }
  
    // Para componentes hijos (depth > 0), se permiten arrays vacíos
    if (depth > 0 && components.length === 0) {
      return errors; // Devolver array de errores vacío
    }
  
    if (components.length > this.LIMITS.maxComponents) {
      errors.push(`Cannot exceed ${this.LIMITS.maxComponents} components`);
      return errors;
    }
  
    if (depth > this.LIMITS.maxNesting) {
      errors.push(`Nesting depth cannot exceed ${this.LIMITS.maxNesting} levels`);
      return errors;
    }
  
    components.forEach((component, idx) => {
      // Validar ID único
      if (!component.id) {
        errors.push(`Missing component ID at index ${idx}`);
      } else if (seenIds.has(component.id)) {
        errors.push(`Duplicate component ID: ${component.id}`);
      } else {
        seenIds.add(component.id);
      }
  
      // Validar tipo
      if (!component.type || !this.ALLOWED_COMPONENT_TYPES.includes(component.type)) {
        errors.push(`Invalid component type at index ${idx}`);
      }
  
      // Si el componente es de texto, botón o link y no tiene contenido
      // (excepto en casos de acciones concretas)
      if (['text', 'button', 'link'].includes(component.type)
          && (!component.action || !['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type))) {
        
        // Extraer texto del componente
        let textValue = '';
        
        if (typeof component.content === 'string') {
          textValue = component.content;
        } else if (component.content && component.content.texts) {
          // Buscar el texto en inglés o el primer idioma disponible
          textValue = component.content.texts.en || Object.values(component.content.texts)[0] || '';
        }
  
        if (!textValue || textValue.trim().length === 0) {
          errors.push(`Missing text content for ${component.type} at index ${idx}`);
        } else if (textValue.length > this.LIMITS.maxTextLength) {
          errors.push(`Text content too long at index ${idx}`);
        }
      }
  
      // Validar acción
      if (component.action && !this.ALLOWED_ACTIONS.includes(component.action.type)) {
        errors.push(`Invalid action type at index ${idx}`);
      }
  
      // Validar posiciones
      if (component.position) {
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (component.position[device]) {
            if (component.position[device].top && 
                typeof component.position[device].top === 'string' && 
                !component.position[device].top.endsWith('%') && 
                !component.position[device].top.endsWith('px')) {
              errors.push(`Position ${device}.top must be a percentage or pixel value at index ${idx}`);
            }
            
            if (component.position[device].left && 
                typeof component.position[device].left === 'string' && 
                !component.position[device].left.endsWith('%') && 
                !component.position[device].left.endsWith('px')) {
              errors.push(`Position ${device}.left must be a percentage or pixel value at index ${idx}`);
            }
          }
        });
      }
  
      // Validar children (anidación)
      if (component.children) {
        const childErrors = this._validateComponents(component.children, depth + 1);
        errors.push(...childErrors);
      }
    });
  
    return errors;
  }

  /**
   * Validación de theme (opcional)
   */
  _validateTheme(theme) {
    const errors = [];

    if (typeof theme !== 'object') {
      errors.push('Invalid theme configuration');
      return errors;
    }

    if (theme.colors) {
      // Regex para colores hex, rgb, rgba y nombres
      const colorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$|^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$|^[a-zA-Z]+$/;
      
      Object.entries(theme.colors).forEach(([key, val]) => {
        if (val && !colorRegex.test(val)) {
          errors.push(`Invalid color format for ${key}: ${val}`);
        }
      });
    }

    if (theme.fonts && !theme.fonts.primary) {
      errors.push('Primary font is required in theme');
    }

    return errors;
  }

  /**
   * Validación de settings (opcional)
   */
  _validateSettings(settings) {
    const errors = [];

    if (settings.animation) {
      if (!settings.animation.type || !['fade', 'slide', 'none'].includes(settings.animation.type)) {
        errors.push('Invalid animation type in settings');
      }
      if (typeof settings.animation.duration !== 'number' || settings.animation.duration < 0) {
        errors.push('Invalid animation duration in settings');
      }
    }

    if (settings.behaviour) {
      if (settings.behaviour.autoHide) {
        if (typeof settings.behaviour.autoHide.enabled !== 'boolean') {
          errors.push('autoHide.enabled must be a boolean');
        }
        if (typeof settings.behaviour.autoHide.delay !== 'number' || settings.behaviour.autoHide.delay < 0) {
          errors.push('autoHide.delay must be a non-negative number');
        }
      }
      if (settings.behaviour.reshow) {
        if (typeof settings.behaviour.reshow.enabled !== 'boolean') {
          errors.push('reshow.enabled must be a boolean');
        }
        if (typeof settings.behaviour.reshow.interval !== 'number' || settings.behaviour.reshow.interval < 0) {
          errors.push('reshow.interval must be a non-negative number');
        }
      }
    }

    return errors;
  }

  /**
   * Valida que existan acciones mínimas (accept_all, reject_all)
   * al menos en algún componente, para cumplir con la funcionalidad básica.
   */
  _validateRequiredActions(components) {
    const errors = [];
    let hasAcceptAll = false;
    let hasRejectAll = false;

    // Revisión recursiva
    function checkActions(comps) {
      comps.forEach(c => {
        if (c.action && c.action.type === 'accept_all') {
          hasAcceptAll = true;
        }
        if (c.action && c.action.type === 'reject_all') {
          hasRejectAll = true;
        }
        if (c.children && Array.isArray(c.children)) {
          checkActions(c.children);
        }
      });
    }

    if (Array.isArray(components)) {
      checkActions(components);

      if (!hasAcceptAll) {
        errors.push('No component with accept_all action found');
      }
      if (!hasRejectAll) {
        errors.push('No component with reject_all action found');
      }
    }

    return errors;
  }

  /**
   * Función auxiliar para normalizar posiciones a percent/pixel
   */
  normalizePositions(components) {
    if (!Array.isArray(components)) return components;

    return components.map(comp => {
      const newComp = { ...comp };
      if (newComp.position) {
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (newComp.position[device]) {
            // Asumimos que si es un número, lo convertimos a '%'
            if (typeof newComp.position[device].top === 'number') {
              newComp.position[device].top = newComp.position[device].top + '%';
            }
            if (typeof newComp.position[device].left === 'number') {
              newComp.position[device].left = newComp.position[device].left + '%';
            }
          }
        });
      }

      // Normalizar hijos
      if (newComp.children && Array.isArray(newComp.children)) {
        newComp.children = this.normalizePositions(newComp.children);
      }
      return newComp;
    });
  }
}

module.exports = new BannerValidator();
