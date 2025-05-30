/**
 * Utilidades para validar drops en contenedores
 * FASE 4 - Validaciones y reglas de drop con soporte completo para anidamiento
 */

// FASE 4 - Constantes y funciones básicas (versión integrada temporalmente)
const MAX_NESTING_DEPTH = 5;

const calculateNestingDepth = (component, allComponents = [], currentDepth = 0) => {
  if (currentDepth > 10) return currentDepth;
  if (!component.parentId) return currentDepth;
  const parent = allComponents.find(comp => comp.id === component.parentId);
  if (!parent) return currentDepth;
  return calculateNestingDepth(parent, allComponents, currentDepth + 1);
};

const validateContainerNesting = (parentContainer, childComponent, allComponents = []) => {
  // REMOVIDA validación de profundidad por solicitud del usuario
  // El sistema de capas no debe influir en si un componente entra o no en un contenedor
  
  // Prevenir auto-contenimiento
  if (parentContainer.id === childComponent.id) {
    return { isValid: false, reason: 'Un componente no puede contenerse a sí mismo' };
  }
  
  return { isValid: true };
};

const validateDragOperation = (draggedComponent, targetContainer, allComponents = []) => {
  return validateContainerNesting(targetContainer, draggedComponent, allComponents);
};

const formatNestingErrorMessage = (validationResult) => {
  return validationResult.reason || '';
};

/**
 * Valida si un componente puede ser agregado a un contenedor
 * Ahora con soporte completo para anidamiento de contenedores
 * @param {Object} containerComponent - El componente contenedor
 * @param {Object} childComponent - El componente que se quiere agregar
 * @param {string} deviceView - Vista actual del dispositivo
 * @param {Array} allComponents - Todos los componentes del banner (para validación de loops)
 * @returns {Object} { isValid: boolean, reason?: string, details?: Object }
 */
export function validateContainerDrop(containerComponent, childComponent, deviceView, allComponents = []) {
  // FASE 4: Usar el nuevo sistema de validación robusto
  const nestingValidation = validateContainerNesting(containerComponent, childComponent, allComponents);
  
  if (!nestingValidation.isValid) {
    return nestingValidation;
  }
  
  // Verificar compatibilidad con el modo del contenedor
  const containerConfig = containerComponent.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';
  
  const compatibility = checkComponentModeCompatibility(childComponent, displayMode);
  if (!compatibility.isCompatible) {
    return {
      isValid: false,
      reason: compatibility.reason,
      details: { code: 'MODE_INCOMPATIBLE' }
    };
  }
  
  return {
    isValid: true,
    details: nestingValidation.details
  };
}

/**
 * Validación en tiempo real durante operaciones de drag & drop
 * @param {Object} draggedComponent - Componente siendo arrastrado
 * @param {Object} targetContainer - Contenedor objetivo
 * @param {Array} allComponents - Todos los componentes del banner
 * @param {Object} dragPosition - Posición actual del cursor
 * @param {string} deviceView - Vista del dispositivo actual
 * @returns {Object} Estado de validación completo para UI
 */
export function validateRealtimeDrag(draggedComponent, targetContainer, allComponents = [], dragPosition = null, deviceView = 'desktop') {
  // Usar la validación de drag operation del nuevo sistema
  const dragValidation = validateDragOperation(draggedComponent, targetContainer, allComponents, dragPosition);
  
  // Verificar también compatibilidad con el modo del contenedor
  if (dragValidation.isValid) {
    const containerConfig = targetContainer.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    
    const compatibility = checkComponentModeCompatibility(draggedComponent, displayMode);
    if (!compatibility.isCompatible) {
      return {
        isValid: false,
        showError: true,
        errorMessage: {
          title: '❌ Componente incompatible',
          description: compatibility.reason,
          suggestion: 'Cambia el modo del contenedor o usa un componente diferente.'
        },
        canDrop: false
      };
    }
  }
  
  return dragValidation;
}

/**
 * Obtiene el número máximo de hijos para un contenedor
 * @param {Object} containerComponent 
 * @param {string} deviceView 
 * @returns {number}
 */
function getMaxChildrenForContainer(containerComponent, deviceView) {
  const containerConfig = containerComponent.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';
  
  switch (displayMode) {
    case 'libre':
      return 10; // Máximo 10 componentes en modo libre
    case 'flex':
      return 8; // Máximo 8 componentes en flexbox
    case 'grid':
      // Calcular basado en la configuración del grid
      const columns = containerConfig.gridTemplateColumns || 'repeat(2, 1fr)';
      if (columns.includes('repeat(')) {
        const match = columns.match(/repeat\((\d+),/);
        if (match) {
          const cols = parseInt(match[1]);
          return cols * 3; // Máximo 3 filas por defecto
        }
      }
      return 6; // Fallback para grid
    default:
      return 5;
  }
}

/**
 * Verifica la compatibilidad de un componente con un modo de contenedor
 * @param {Object} component 
 * @param {string} displayMode 
 * @returns {Object}
 */
function checkComponentModeCompatibility(component, displayMode) {
  const componentType = component.type;
  
  // Reglas específicas por tipo de componente
  const compatibilityRules = {
    libre: {
      // En modo libre, todos los componentes son compatibles incluidos contenedores anidados
      text: true,
      button: true,
      image: true,
      container: true // PERMITIR contenedores anidados
    },
    flex: {
      // En flexbox, verificar que los componentes funcionan bien en línea
      text: true,
      button: true,
      image: true,
      container: true // PERMITIR contenedores anidados
    },
    grid: {
      // En grid, todos los componentes básicos funcionan bien
      text: true,
      button: true,
      image: true,
      container: true // PERMITIR contenedores anidados
    }
  };
  
  const rules = compatibilityRules[displayMode] || compatibilityRules.libre;
  const isCompatible = rules[componentType];
  
  if (isCompatible === false) {
    return {
      isCompatible: false,
      reason: `Los componentes de tipo "${componentType}" no son compatibles con el modo "${displayMode}"`
    };
  }
  
  if (isCompatible === undefined) {
    return {
      isCompatible: false,
      reason: `Tipo de componente "${componentType}" no reconocido`
    };
  }
  
  return {
    isCompatible: true
  };
}

/**
 * Calcula la posición óptima para un componente en un contenedor
 * @param {Object} containerComponent 
 * @param {Object} dropPosition 
 * @param {string} deviceView 
 * @returns {Object}
 */
export function calculateOptimalPosition(containerComponent, dropPosition, deviceView) {
  const containerConfig = containerComponent.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';
  
  switch (displayMode) {
    case 'libre':
      // En modo libre, usar la posición exacta del drop
      return {
        top: `${dropPosition.topPercent.toFixed(2)}%`,
        left: `${dropPosition.leftPercent.toFixed(2)}%`,
        percentX: parseFloat(dropPosition.leftPercent.toFixed(2)),
        percentY: parseFloat(dropPosition.topPercent.toFixed(2))
      };
      
    case 'flex':
    case 'grid':
      // En flex/grid, la posición se maneja automáticamente
      return {
        top: '0%',
        left: '0%',
        percentX: 0,
        percentY: 0
      };
      
    default:
      return {
        top: '0%',
        left: '0%',
        percentX: 0,
        percentY: 0
      };
  }
}

/**
 * Genera un ID único para un componente hijo
 * @param {string} componentType 
 * @param {string} parentId 
 * @returns {string}
 */
export function generateChildId(componentType, parentId) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${componentType}-${parentId}-${timestamp}-${random}`;
}

/**
 * Obtiene información de ayuda para el usuario sobre el modo de drop
 * @param {string} displayMode 
 * @returns {Object}
 */
export function getDropModeInfo(displayMode) {
  const info = {
    libre: {
      title: 'Modo Libre',
      description: 'Los componentes se posicionarán exactamente donde los sueltes',
      icon: 'target',
      color: '#3b82f6'
    },
    flex: {
      title: 'Modo Flexbox',
      description: 'Los componentes se organizarán automáticamente en una fila o columna',
      icon: 'layout',
      color: '#10b981'
    },
    grid: {
      title: 'Modo Grid',
      description: 'Los componentes se colocarán en la siguiente celda disponible de la cuadrícula',
      icon: 'grid',
      color: '#8b5cf6'
    }
  };
  
  return info[displayMode] || info.libre;
}