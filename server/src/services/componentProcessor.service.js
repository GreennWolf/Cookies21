// services/componentProcessor.service.js

const logger = require('../utils/logger');
const containerPositionProcessor = require('./containerPositionProcessor.service');

class ComponentProcessorService {
  /**
   * Procesa una lista de componentes para resolver anidamientos y dependencias
   */
  processComponents(components) {
    try {
      if (!components || !Array.isArray(components)) {
        return [];
      }

      // Paso 1: Validar estructura de componentes
      const validatedComponents = this._validateComponents(components);

      // Paso 2: Resolver relaciones padre-hijo
      const hierarchicalComponents = this._buildHierarchy(validatedComponents);

      // Paso 3: Calcular niveles de anidamiento
      const componentsWithNesting = this._calculateNestingLevels(hierarchicalComponents);

      // Paso 4: Procesar posiciones de contenedores y sus hijos
      const componentsWithPositions = containerPositionProcessor.processComponentPositions(componentsWithNesting);

      // Paso 5: Optimizar posicionamiento general
      const optimizedComponents = this._optimizePositioning(componentsWithPositions);

      // Paso 6: Validar y corregir posiciones de hijos en contenedores
      const validatedPositions = this._validateAndCorrectContainerPositions(optimizedComponents);

      return validatedPositions;
    } catch (error) {
      logger.error('Error processing components:', error);
      return components; // Devolver componentes originales si falla el procesamiento
    }
  }

  /**
   * Valida la estructura de cada componente
   */
  _validateComponents(components) {
    return components.map(component => {
      // Asegurar que cada componente tenga un ID único
      if (!component.id) {
        component.id = this._generateId(component.type);
      }

      // Validar tipo de componente
      const validTypes = ['text', 'button', 'link', 'logo', 'checkbox', 'toggle', 'container', 'panel', 'image', 'language-button'];
      if (!validTypes.includes(component.type)) {
        logger.warn(`Invalid component type: ${component.type}, defaulting to 'text'`);
        component.type = 'text';
      }

      // Asegurar estructura de estilos
      if (!component.style) {
        component.style = {};
      }

      // Asegurar estructura de posición
      if (!component.position) {
        component.position = {};
      }

      // Configurar contenedores con soporte responsivo
      if (component.type === 'container') {
        if (!component.containerConfig) {
          component.containerConfig = {};
        }
        
        // Configurar para cada dispositivo preservando valores existentes
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (!component.containerConfig[device]) {
            component.containerConfig[device] = {};
          }
          
          // Para tablet y mobile, heredar configuración de desktop si no se especifica
          const deviceConfig = component.containerConfig[device];
          const desktopConfig = component.containerConfig.desktop || {};
          
          // Configurar valores por defecto o heredados
          if (deviceConfig.displayMode === undefined) {
            deviceConfig.displayMode = device === 'desktop' ? 'libre' : (desktopConfig.displayMode || 'libre');
          }
          if (deviceConfig.allowDrops === undefined) deviceConfig.allowDrops = true;
          if (deviceConfig.nestingLevel === undefined) deviceConfig.nestingLevel = 0;
          if (deviceConfig.maxChildren === undefined) deviceConfig.maxChildren = desktopConfig.maxChildren || 50;
          
          // Configuraciones de flexbox con valores por defecto o heredados
          if (deviceConfig.displayMode === 'flex') {
            if (deviceConfig.flexDirection === undefined) {
              deviceConfig.flexDirection = device === 'desktop' ? 'row' : (desktopConfig.flexDirection || 'row');
            }
            if (deviceConfig.justifyContent === undefined) {
              deviceConfig.justifyContent = device === 'desktop' ? 'flex-start' : (desktopConfig.justifyContent || 'flex-start');
            }
            if (deviceConfig.alignItems === undefined) {
              deviceConfig.alignItems = device === 'desktop' ? 'flex-start' : (desktopConfig.alignItems || 'flex-start');
            }
            if (deviceConfig.gap === undefined) {
              deviceConfig.gap = device === 'desktop' ? '0px' : (desktopConfig.gap || '0px');
            }
            if (deviceConfig.flexWrap === undefined) {
              deviceConfig.flexWrap = device === 'desktop' ? 'nowrap' : (desktopConfig.flexWrap || 'nowrap');
            }
          }
          
          // Configuraciones de grid con valores por defecto o heredados
          if (deviceConfig.displayMode === 'grid') {
            if (deviceConfig.gridTemplateColumns === undefined) {
              deviceConfig.gridTemplateColumns = device === 'desktop' ? 'repeat(auto-fit, minmax(200px, 1fr))' : (desktopConfig.gridTemplateColumns || 'repeat(auto-fit, minmax(200px, 1fr))');
            }
            if (deviceConfig.gridTemplateRows === undefined) {
              deviceConfig.gridTemplateRows = device === 'desktop' ? 'auto' : (desktopConfig.gridTemplateRows || 'auto');
            }
            if (deviceConfig.gridGap === undefined) {
              deviceConfig.gridGap = device === 'desktop' ? '0px' : (desktopConfig.gridGap || '0px');
            }
            if (deviceConfig.gridAutoFlow === undefined) {
              deviceConfig.gridAutoFlow = device === 'desktop' ? 'row' : (desktopConfig.gridAutoFlow || 'row');
            }
          }
        });
        
        // Mantener displayMode por compatibilidad
        if (!component.displayMode) {
          component.displayMode = component.containerConfig.desktop?.displayMode || 'libre';
        }
        
        // Asegurar que children existe
        if (!component.children) {
          component.children = [];
        }
      }

      return component;
    });
  }

  /**
   * Construye la jerarquía padre-hijo
   */
  _buildHierarchy(components) {
    const componentMap = new Map();
    const rootComponents = [];

    // Crear mapa de componentes - MANTENER children existentes
    components.forEach(comp => {
      componentMap.set(comp.id, { ...comp, children: comp.children || [] });
    });

    // Construir jerarquía
    components.forEach(comp => {
      const component = componentMap.get(comp.id);
      
      if (comp.parentId && componentMap.has(comp.parentId)) {
        // Es un componente hijo
        const parent = componentMap.get(comp.parentId);
        parent.children.push(component);
      } else {
        // Es un componente raíz
        rootComponents.push(component);
      }
    });

    return rootComponents;
  }

  /**
   * Calcula los niveles de anidamiento para validación
   */
  _calculateNestingLevels(components, level = 0) {
    return components.map(component => {
      const processedComponent = { ...component };
      
      // Establecer nivel de anidamiento
      if (processedComponent.containerConfig) {
        processedComponent.containerConfig.nestingLevel = level;
      }

      // Validar límite de anidamiento
      if (level > 5) {
        logger.warn(`Component ${component.id} exceeds maximum nesting level (5)`);
      }

      // Procesar hijos recursivamente
      if (processedComponent.children && processedComponent.children.length > 0) {
        processedComponent.children = this._calculateNestingLevels(processedComponent.children, level + 1);
      }

      return processedComponent;
    });
  }

  /**
   * Optimiza el posicionamiento de componentes
   */
  _optimizePositioning(components) {
    return components.map(component => {
      const optimizedComponent = { ...component };

      // Optimizar posición para cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (optimizedComponent.position && optimizedComponent.position[device]) {
          optimizedComponent.position[device] = this._optimizeDevicePosition(
            optimizedComponent.position[device],
            optimizedComponent,
            device
          );
        }
      });

      // Procesar hijos
      if (optimizedComponent.children && optimizedComponent.children.length > 0) {
        optimizedComponent.children = this._optimizePositioning(optimizedComponent.children);
      }

      return optimizedComponent;
    });
  }

  /**
   * Optimiza la posición para un dispositivo específico
   */
  _optimizeDevicePosition(position, component, device) {
    const optimizedPosition = { ...position };

    // Asegurar valores válidos
    if (optimizedPosition.top && !this._isValidCSSValue(optimizedPosition.top)) {
      optimizedPosition.top = '0%';
    }

    if (optimizedPosition.left && !this._isValidCSSValue(optimizedPosition.left)) {
      optimizedPosition.left = '0%';
    }

    // Configurar transformaciones para centrado - NOTA: Solo para componentes marcados como centered
    // NO modificar automáticamente componentes que no están explícitamente marcados como centered
    if (component.centered === true) {
      if (optimizedPosition.left === '50%' && !optimizedPosition.transformX) {
        optimizedPosition.transformX = 'center';
      }
      if (optimizedPosition.top === '50%' && !optimizedPosition.transformY) {
        optimizedPosition.transformY = 'center';
      }
    }

    // Para componentes hijos en contenedores flex/grid, ajustar posicionamiento
    if (component.parentId) {
      // Los hijos de contenedores flex/grid no necesitan posición absoluta
      optimizedPosition.position = 'relative';
    }

    return optimizedPosition;
  }

  /**
   * Aplana la jerarquía para generar una lista plana con referencias padre-hijo
   */
  flattenHierarchy(components, parentId = null) {
    const flatComponents = [];

    components.forEach(component => {
      // Crear copia del componente sin children para la lista plana
      const flatComponent = { ...component };
      delete flatComponent.children;
      
      // Establecer parentId
      if (parentId) {
        flatComponent.parentId = parentId;
      }

      flatComponents.push(flatComponent);

      // Procesar hijos recursivamente
      if (component.children && component.children.length > 0) {
        const childComponents = this.flattenHierarchy(component.children, component.id);
        flatComponents.push(...childComponents);
      }
    });

    return flatComponents;
  }

  /**
   * Convierte una lista plana en jerarquía para el procesamiento
   */
  buildHierarchyFromFlat(flatComponents) {
    const componentMap = new Map();
    const rootComponents = [];

    // Crear mapa de componentes
    flatComponents.forEach(comp => {
      componentMap.set(comp.id, { ...comp, children: [] });
    });

    // Construir jerarquía
    flatComponents.forEach(comp => {
      const component = componentMap.get(comp.id);
      
      if (comp.parentId && componentMap.has(comp.parentId)) {
        // Es un componente hijo
        const parent = componentMap.get(comp.parentId);
        parent.children.push(component);
      } else {
        // Es un componente raíz
        rootComponents.push(component);
      }
    });

    return rootComponents;
  }

  /**
   * Valida que un valor CSS sea válido
   */
  _isValidCSSValue(value) {
    if (typeof value !== 'string') return false;
    
    // Patrones básicos para valores CSS válidos
    const validPatterns = [
      /^\d*\.?\d+(%|px|em|rem|vh|vw)$/, // Números enteros y decimales con unidades
      /^auto$/, // auto
      /^inherit$/, // inherit
      /^initial$/, // initial
      /^unset$/ // unset
    ];

    return validPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Genera un ID único para un componente
   */
  _generateId(type) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Valida y corrige posiciones de hijos en contenedores
   */
  _validateAndCorrectContainerPositions(components) {
    const correctedComponents = [...components];
    
    correctedComponents.forEach(component => {
      if (component.type === 'container' && component.children) {
        // Validar posiciones de hijos
        const validation = containerPositionProcessor.validateChildPositions(component);
        
        if (!validation.valid && validation.corrections.length > 0) {
          logger.info(`Applying position corrections for container ${component.id}:`, validation.corrections);
          
          // Aplicar correcciones
          component.children = containerPositionProcessor.applyPositionCorrections(
            component.children,
            validation.corrections
          );
        }
      }
    });
    
    return correctedComponents;
  }

  /**
   * Valida que la estructura de un banner sea correcta
   */
  validateBannerStructure(config) {
    const errors = [];
    const warnings = [];

    try {
      // Validar layout
      if (!config.layout) {
        errors.push('Banner layout is required');
      }

      // Validar componentes
      if (!config.components || !Array.isArray(config.components)) {
        errors.push('Banner components must be an array');
      } else {
        // Validar componentes individuales
        config.components.forEach((comp, index) => {
          if (!comp.id) {
            warnings.push(`Component at index ${index} is missing an ID`);
          }
          if (!comp.type) {
            errors.push(`Component at index ${index} is missing a type`);
          }
          
          // Validar contenedores específicamente
          if (comp.type === 'container') {
            this._validateContainerStructure(comp, errors, warnings);
          }
        });

        // Validar que no haya IDs duplicados
        const allIds = this._extractAllComponentIds(config.components);
        const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          errors.push(`Duplicate component IDs found: ${duplicateIds.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error validating banner structure:', error);
      return {
        isValid: false,
        errors: ['Failed to validate banner structure'],
        warnings: []
      };
    }
  }

  /**
   * Valida la estructura específica de un contenedor
   */
  _validateContainerStructure(container, errors, warnings) {
    // Validar configuración del contenedor
    if (!container.containerConfig) {
      warnings.push(`Container ${container.id} is missing containerConfig`);
    } else {
      // Validar configuración por dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        const deviceConfig = container.containerConfig[device];
        if (!deviceConfig) {
          warnings.push(`Container ${container.id} is missing ${device} configuration`);
        } else {
          // Validar displayMode
          const validModes = ['libre', 'flex', 'grid'];
          if (!validModes.includes(deviceConfig.displayMode)) {
            warnings.push(`Container ${container.id} has invalid displayMode for ${device}: ${deviceConfig.displayMode}`);
          }
        }
      });
    }

    // Validar hijos
    if (container.children && Array.isArray(container.children)) {
      if (container.children.length > 50) {
        warnings.push(`Container ${container.id} has too many children (${container.children.length}), maximum is 50`);
      }

      // Validar que los hijos tengan parentId correcto
      container.children.forEach(child => {
        if (child.parentId && child.parentId !== container.id) {
          warnings.push(`Child component ${child.id} has incorrect parentId: ${child.parentId}, should be ${container.id}`);
        }
      });
    }
  }

  /**
   * Extrae todos los IDs de componentes, incluyendo hijos anidados
   */
  _extractAllComponentIds(components) {
    const ids = [];
    
    const extractIds = (comps) => {
      if (!Array.isArray(comps)) return;
      
      comps.forEach(comp => {
        if (comp.id) {
          ids.push(comp.id);
        }
        if (comp.children) {
          extractIds(comp.children);
        }
      });
    };
    
    extractIds(components);
    return ids;
  }
  
  /**
   * Valida que existan los componentes obligatorios en el banner
   */
  validateRequiredComponents(components) {
    const errors = [];
    const warnings = [];
    
    // Función para buscar componentes recursivamente
    const findComponentsByType = (comps, type) => {
      let found = [];
      if (!Array.isArray(comps)) return found;
      
      comps.forEach(comp => {
        if (comp.type === type) {
          found.push(comp);
        }
        if (comp.children && Array.isArray(comp.children)) {
          found = found.concat(findComponentsByType(comp.children, type));
        }
      });
      
      return found;
    };
    
    // Función para buscar botones por acción
    const findButtonsByAction = (comps, actionType) => {
      let found = [];
      if (!Array.isArray(comps)) return found;
      
      comps.forEach(comp => {
        if (comp.type === 'button' && comp.action && comp.action.type === actionType) {
          found.push(comp);
        }
        if (comp.children && Array.isArray(comp.children)) {
          found = found.concat(findButtonsByAction(comp.children, actionType));
        }
      });
      
      return found;
    };
    
    // Validar botones obligatorios de cookies
    const acceptButtons = findButtonsByAction(components, 'accept_all');
    const rejectButtons = findButtonsByAction(components, 'reject_all');
    const preferencesButtons = findButtonsByAction(components, 'show_preferences');
    
    if (acceptButtons.length === 0) {
      errors.push({
        type: 'missing_component',
        message: 'Falta el botón "Aceptar Todo" (accept_all)',
        severity: 'error'
      });
    }
    
    if (rejectButtons.length === 0) {
      errors.push({
        type: 'missing_component',
        message: 'Falta el botón "Rechazar Todo" (reject_all)',
        severity: 'error'
      });
    }
    
    if (preferencesButtons.length === 0) {
      errors.push({
        type: 'missing_component',
        message: 'Falta el botón "Configuración de Cookies" (show_preferences)',
        severity: 'error'
      });
    }
    
    // Validar selector de idioma obligatorio
    const languageButtons = findComponentsByType(components, 'language-button');
    if (languageButtons.length === 0) {
      errors.push({
        type: 'missing_component',
        message: 'Falta el componente "Selector de Idioma" (language-button). Este componente es obligatorio para la selección de idioma en la vista previa.',
        severity: 'error'
      });
    } else if (languageButtons.length > 1) {
      warnings.push({
        type: 'duplicate_component',
        message: `Se encontraron ${languageButtons.length} selectores de idioma. Se recomienda usar solo uno.`,
        severity: 'warning'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        missingComponents: errors.length,
        totalWarnings: warnings.length
      }
    };
  }
}

module.exports = new ComponentProcessorService();