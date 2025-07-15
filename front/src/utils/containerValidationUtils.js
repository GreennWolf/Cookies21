/**
 * Utilidades de validación para anidamiento de contenedores - FASE 4
 * Sistema robusto para prevenir loops circulares y controlar profundidad
 */

/**
 * Profundidad máxima permitida para anidamiento de contenedores
 */
export const MAX_NESTING_DEPTH = 5;


/**
 * Calcula la profundidad de anidamiento actual de un componente
 * @param {Object} component - El componente a analizar
 * @param {Array} allComponents - Todos los componentes del banner
 * @param {number} currentDepth - Profundidad actual (para recursión)
 * @returns {number} La profundidad de anidamiento
 */
export function calculateNestingDepth(component, allComponents = [], currentDepth = 0) {
  // Si no tiene padre, está en el nivel raíz
  if (!component.parentId) {
    return currentDepth;
  }
  
  // Buscar el componente padre
  const parent = findComponentById(component.parentId, allComponents);
  if (!parent) {
    // Padre no encontrado, asumir nivel raíz
    return currentDepth;
  }
  
  // Recursión: calcular profundidad del padre + 1
  return calculateNestingDepth(parent, allComponents, currentDepth + 1);
}

/**
 * Busca un componente por ID en la estructura anidada
 * @param {string} componentId - ID del componente a buscar
 * @param {Array} components - Array de componentes donde buscar
 * @returns {Object|null} El componente encontrado o null
 */
export function findComponentById(componentId, components) {
  if (!Array.isArray(components)) return null;
  
  for (const comp of components) {
    // Verificar si es el componente buscado
    if (comp.id === componentId) {
      return comp;
    }
    
    // Buscar en los hijos recursivamente
    if (comp.children && Array.isArray(comp.children)) {
      const found = findComponentById(componentId, comp.children);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Obtiene la cadena de ancestros de un componente
 * @param {Object} component - El componente
 * @param {Array} allComponents - Todos los componentes del banner
 * @returns {Array} Array de IDs de ancestros (desde el más cercano al más lejano)
 */
export function getAncestorChain(component, allComponents = []) {
  const ancestors = [];
  let current = component;
  
  while (current && current.parentId) {
    const parent = findComponentById(current.parentId, allComponents);
    if (!parent) break;
    
    ancestors.push(parent.id);
    current = parent;
  }
  
  return ancestors;
}

/**
 * Verifica si un componente es ancestro de otro
 * @param {string} potentialAncestorId - ID del posible ancestro
 * @param {Object} component - El componente descendiente
 * @param {Array} allComponents - Todos los componentes del banner
 * @returns {boolean} true si es ancestro
 */
export function isAncestor(potentialAncestorId, component, allComponents = []) {
  const ancestorChain = getAncestorChain(component, allComponents);
  return ancestorChain.includes(potentialAncestorId);
}

/**
 * Verifica si un componente es descendiente de otro
 * @param {string} potentialDescendantId - ID del posible descendiente
 * @param {Object} component - El componente ancestro
 * @returns {boolean} true si es descendiente
 */
export function isDescendant(potentialDescendantId, component) {
  if (!component.children || !Array.isArray(component.children)) {
    return false;
  }
  
  // Buscar en hijos directos
  for (const child of component.children) {
    if (child.id === potentialDescendantId) {
      return true;
    }
    
    // Buscar recursivamente en nietos
    if (isDescendant(potentialDescendantId, child)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detecta si agregar un componente como hijo crearía un loop circular
 * @param {Object} parentContainer - El contenedor padre
 * @param {Object} childComponent - El componente a agregar como hijo
 * @param {Array} allComponents - Todos los componentes del banner
 * @returns {Object} { hasLoop: boolean, reason?: string, loopPath?: Array }
 */
export function detectCircularReference(parentContainer, childComponent, allComponents = []) {
  // Caso 1: El componente no puede ser padre de sí mismo
  if (parentContainer.id === childComponent.id) {
    return {
      hasLoop: true,
      reason: 'Un contenedor no puede contenerse a sí mismo',
      loopPath: [parentContainer.id]
    };
  }
  
  // Caso 2: El componente hijo no puede ser un ancestro del padre
  // (esto crearía un loop: A → B → A)
  if (isAncestor(childComponent.id, parentContainer, allComponents)) {
    const ancestorChain = getAncestorChain(parentContainer, allComponents);
    const loopStart = ancestorChain.indexOf(childComponent.id);
    const loopPath = [parentContainer.id, ...ancestorChain.slice(0, loopStart + 1)];
    
    return {
      hasLoop: true,
      reason: `Crear este anidamiento formaría un loop circular: ${loopPath.join(' → ')}`,
      loopPath
    };
  }
  
  // Caso 3: El contenedor padre no puede ser descendiente del hijo
  // (variación del caso anterior)
  if (childComponent.type === 'container' && isDescendant(parentContainer.id, childComponent)) {
    return {
      hasLoop: true,
      reason: 'El contenedor padre no puede ser descendiente del componente hijo',
      loopPath: [childComponent.id, parentContainer.id]
    };
  }
  
  return { hasLoop: false };
}

/**
 * Validación completa para anidamiento de contenedores
 * @param {Object} parentContainer - El contenedor padre
 * @param {Object} childComponent - El componente a anidar
 * @param {Array} allComponents - Todos los componentes del banner
 * @returns {Object} { isValid: boolean, reason?: string, details?: Object }
 */
export function validateContainerNesting(parentContainer, childComponent, allComponents = []) {
  // 1. Verificar que el padre es realmente un contenedor
  if (parentContainer.type !== 'container') {
    return {
      isValid: false,
      reason: 'El componente de destino no es un contenedor',
      details: { code: 'NOT_CONTAINER' }
    };
  }
  
  // 2. Verificar profundidad máxima
  const currentDepth = calculateNestingDepth(parentContainer, allComponents);
  if (currentDepth >= MAX_NESTING_DEPTH) {
    return {
      isValid: false,
      reason: `Se ha alcanzado la profundidad máxima de anidamiento (${MAX_NESTING_DEPTH} niveles)`,
      details: { 
        code: 'MAX_DEPTH_EXCEEDED',
        currentDepth,
        maxDepth: MAX_NESTING_DEPTH
      }
    };
  }
  
  // 3. Si el hijo es un contenedor, verificar loops circulares
  if (childComponent.type === 'container') {
    const circularCheck = detectCircularReference(parentContainer, childComponent, allComponents);
    if (circularCheck.hasLoop) {
      return {
        isValid: false,
        reason: circularCheck.reason,
        details: {
          code: 'CIRCULAR_REFERENCE',
          loopPath: circularCheck.loopPath
        }
      };
    }
    
    // 4. Verificar que el anidamiento resultante no excedería la profundidad máxima
    const childDepth = calculateNestingDepth(childComponent, allComponents);
    const resultingDepth = currentDepth + 1 + childDepth;
    
    if (resultingDepth > MAX_NESTING_DEPTH) {
      return {
        isValid: false,
        reason: `El anidamiento resultaría en una profundidad de ${resultingDepth}, excediendo el máximo de ${MAX_NESTING_DEPTH}`,
        details: {
          code: 'RESULTING_DEPTH_EXCEEDED',
          currentDepth,
          childDepth,
          resultingDepth,
          maxDepth: MAX_NESTING_DEPTH
        }
      };
    }
  }
  
  // 5. Verificaciones adicionales de compatibilidad
  const maxChildren = getMaxChildrenForContainer(parentContainer);
  const currentChildrenCount = parentContainer.children?.length || 0;
  
  if (currentChildrenCount >= maxChildren) {
    return {
      isValid: false,
      reason: `El contenedor ha alcanzado el límite máximo de ${maxChildren} componentes`,
      details: {
        code: 'MAX_CHILDREN_EXCEEDED',
        currentCount: currentChildrenCount,
        maxChildren
      }
    };
  }
  
  return {
    isValid: true,
    details: {
      currentDepth,
      resultingDepth: currentDepth + 1,
      maxDepth: MAX_NESTING_DEPTH
    }
  };
}

/**
 * Obtiene el número máximo de hijos para un contenedor basado en su configuración
 * @param {Object} containerComponent - El componente contenedor
 * @param {string} deviceView - Vista del dispositivo (opcional)
 * @returns {number} Número máximo de hijos
 */
function getMaxChildrenForContainer(containerComponent, deviceView = 'desktop') {
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
 * Obtiene indicadores visuales para mostrar el nivel de anidamiento
 * @param {number} depth - Profundidad actual
 * @returns {Object} Información de visualización del nivel
 */
export function getNestingLevelIndicator(depth) {
  const levels = [
    { color: '#3b82f6', name: 'Nivel 1', icon: '▫️' },
    { color: '#10b981', name: 'Nivel 2', icon: '▪️' },
    { color: '#f59e0b', name: 'Nivel 3', icon: '🔸' },
    { color: '#ef4444', name: 'Nivel 4', icon: '🔺' },
    { color: '#8b5cf6', name: 'Nivel 5', icon: '⬨' }
  ];
  
  if (depth >= levels.length) {
    return {
      color: '#dc2626',
      name: `Nivel ${depth + 1} (Máximo excedido)`,
      icon: '⚠️',
      isExceeded: true
    };
  }
  
  return {
    ...levels[depth],
    isExceeded: false
  };
}

/**
 * Genera mensajes de error amigables para el usuario
 * @param {Object} validationResult - Resultado de la validación
 * @returns {Object} Mensaje formateado para mostrar al usuario
 */
export function formatNestingErrorMessage(validationResult) {
  if (validationResult.isValid) {
    return null;
  }
  
  const { reason, details } = validationResult;
  
  const baseMessage = {
    title: '❌ No se puede realizar esta acción',
    description: reason,
    type: 'error'
  };
  
  // Personalizar mensaje según el tipo de error
  switch (details?.code) {
    case 'NOT_CONTAINER':
      return {
        ...baseMessage,
        title: '❌ Destino inválido',
        suggestion: 'Solo puedes agregar componentes dentro de contenedores.'
      };
      
    case 'MAX_DEPTH_EXCEEDED':
      return {
        ...baseMessage,
        title: '📊 Profundidad máxima alcanzada',
        suggestion: `Intenta crear un nuevo contenedor en un nivel superior. Máximo permitido: ${details.maxDepth} niveles.`
      };
      
    case 'CIRCULAR_REFERENCE':
      return {
        ...baseMessage,
        title: '🔄 Referencia circular detectada',
        suggestion: 'Este anidamiento crearía un loop infinito. Reorganiza la estructura de contenedores.',
        technicalDetails: `Ruta del loop: ${details.loopPath?.join(' → ')}`
      };
      
    case 'RESULTING_DEPTH_EXCEEDED':
      return {
        ...baseMessage,
        title: '📈 Anidamiento muy profundo',
        suggestion: `El anidamiento resultante (${details.resultingDepth} niveles) excede el máximo permitido (${details.maxDepth}).`
      };
      
    case 'MAX_CHILDREN_EXCEEDED':
      return {
        ...baseMessage,
        title: '👥 Contenedor lleno',
        suggestion: `Este contenedor ya tiene ${details.currentCount} componentes (máximo: ${details.maxChildren}). Considera usar otro contenedor.`
      };
      
    default:
      return baseMessage;
  }
}

/**
 * Valida una operación de drag & drop en tiempo real
 * @param {Object} draggedComponent - Componente siendo arrastrado
 * @param {Object} targetContainer - Contenedor objetivo
 * @param {Array} allComponents - Todos los componentes
 * @param {Object} dragPosition - Posición del cursor durante el drag
 * @returns {Object} Estado de validación para mostrar indicadores visuales
 */
export function validateDragOperation(draggedComponent, targetContainer, allComponents = [], dragPosition = null) {
  // Validación básica de anidamiento
  const nestingValidation = validateContainerNesting(targetContainer, draggedComponent, allComponents);
  
  if (!nestingValidation.isValid) {
    return {
      isValid: false,
      showError: true,
      errorMessage: formatNestingErrorMessage(nestingValidation),
      canDrop: false
    };
  }
  
  // Si la validación es exitosa, permitir el drop
  return {
    isValid: true,
    showError: false,
    canDrop: true,
    nestingInfo: {
      currentDepth: nestingValidation.details.currentDepth,
      resultingDepth: nestingValidation.details.resultingDepth,
      levelIndicator: getNestingLevelIndicator(nestingValidation.details.resultingDepth)
    }
  };
}


/**
 * Utilidad para debug: muestra la estructura completa de anidamiento
 * @param {Array} components - Componentes del banner
 * @param {number} indent - Nivel de indentación (para recursión)
 */
export function debugNestingStructure(components, indent = 0) {
  if (!Array.isArray(components)) return;
  
  const indentStr = '  '.repeat(indent);
  
  components.forEach(comp => {
    const depthInfo = calculateNestingDepth(comp, components);
    console.log(`${indentStr}${comp.type}[${comp.id}] - Depth: ${depthInfo}`);
    
    if (comp.children && comp.children.length > 0) {
      debugNestingStructure(comp.children, indent + 1);
    }
  });
}