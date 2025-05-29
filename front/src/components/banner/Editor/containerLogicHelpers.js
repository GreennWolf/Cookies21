/**
 * Container Logic Helpers
 * Funciones lógicas centralizadas para la gestión de contenedores
 */

/**
 * Valida si un componente puede ser agregado a un contenedor
 */
export const validateAddToContainer = (parentContainer, componentType, allComponents = []) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Verificar que el contenedor padre existe
  if (!parentContainer) {
    validation.isValid = false;
    validation.errors.push('Contenedor padre no encontrado');
    return validation;
  }

  // Verificar que el padre es efectivamente un contenedor
  if (parentContainer.type !== 'container') {
    validation.isValid = false;
    validation.errors.push('El elemento padre no es un contenedor');
    return validation;
  }

  // Verificar límite de hijos (opcional)
  const maxChildren = 20;
  if (parentContainer.children && parentContainer.children.length >= maxChildren) {
    validation.isValid = false;
    validation.errors.push(`Límite de hijos excedido (máximo ${maxChildren})`);
    return validation;
  }

  // REMOVIDA validación de profundidad por solicitud del usuario
  // El sistema de capas no debe influir en si un componente entra o no en un contenedor
  // Se permite anidamiento ilimitado de contenedores

  return validation;
};

/**
 * Calcula la profundidad de anidamiento de un contenedor
 */
export const calculateContainerDepth = (container, allComponents = [], currentDepth = 0) => {
  if (currentDepth > 10) return currentDepth; // Evitar loops infinitos
  
  if (!container.parentId) return currentDepth;
  
  const parent = allComponents.find(comp => comp.id === container.parentId);
  if (!parent) return currentDepth;
  
  return calculateContainerDepth(parent, allComponents, currentDepth + 1);
};

/**
 * Encuentra todos los contenedores en una estructura
 */
export const findAllContainers = (components = []) => {
  const containers = [];
  
  const searchRecursive = (componentsList) => {
    componentsList.forEach(comp => {
      if (comp.type === 'container') {
        containers.push(comp);
        if (comp.children && comp.children.length > 0) {
          searchRecursive(comp.children);
        }
      }
    });
  };
  
  searchRecursive(components);
  return containers;
};

/**
 * Encuentra un contenedor por ID en toda la estructura
 */
export const findContainerById = (components = [], containerId) => {
  const searchRecursive = (componentsList) => {
    for (const comp of componentsList) {
      if (comp.id === containerId && comp.type === 'container') {
        return comp;
      }
      if (comp.children && comp.children.length > 0) {
        const found = searchRecursive(comp.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return searchRecursive(components);
};

/**
 * Encuentra un componente (hijo) por ID en toda la estructura
 */
export const findComponentById = (components = [], componentId) => {
  const searchRecursive = (componentsList) => {
    for (const comp of componentsList) {
      if (comp.id === componentId) {
        return comp;
      }
      if (comp.children && comp.children.length > 0) {
        const found = searchRecursive(comp.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return searchRecursive(components);
};

/**
 * Valida la estructura completa de contenedores
 */
export const validateContainerStructure = (components = []) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalComponents: 0,
      totalContainers: 0,
      maxDepth: 0,
      orphanedComponents: 0
    }
  };

  const containers = findAllContainers(components);
  validation.stats.totalContainers = containers.length;
  validation.stats.totalComponents = components.length;

  // Verificar contenedores
  containers.forEach(container => {
    // Verificar estructura básica
    if (!container.children) {
      validation.errors.push(`Contenedor ${container.id} no tiene array de children`);
      validation.isValid = false;
    }

    // Verificar configuración de contenedor
    if (!container.containerConfig) {
      validation.warnings.push(`Contenedor ${container.id} no tiene containerConfig`);
    }

    // Calcular profundidad
    const depth = calculateContainerDepth(container, components);
    validation.stats.maxDepth = Math.max(validation.stats.maxDepth, depth);

    // Verificar hijos
    if (container.children) {
      container.children.forEach(child => {
        if (!child.parentId || child.parentId !== container.id) {
          validation.errors.push(`Hijo ${child.id} no tiene parentId correcto`);
          validation.isValid = false;
        }
      });
    }
  });

  return validation;
};

/**
 * Optimiza la posición de componentes en un contenedor
 */
export const optimizeContainerLayout = (container, deviceView = 'desktop') => {
  if (!container.children || container.children.length === 0) {
    return container;
  }

  const config = container.containerConfig?.[deviceView];
  if (!config) return container;

  const optimizedChildren = [...container.children];

  // Optimización según el modo de display
  switch (config.displayMode) {
    case 'flex':
      // Organizar en línea o columna
      optimizedChildren.forEach((child, index) => {
        const position = config.flexDirection === 'row' 
          ? { top: '0%', left: `${index * 25}%` }
          : { top: `${index * 25}%`, left: '0%' };
          
        if (!child.position) child.position = {};
        child.position[deviceView] = position;
      });
      break;

    case 'grid':
      // Organizar en grid
      const columns = parseInt(config.gridTemplateColumns?.match(/repeat\((\d+)/)?.[1] || '2');
      optimizedChildren.forEach((child, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const position = {
          top: `${row * 30}%`,
          left: `${col * (90 / columns)}%`
        };
        
        if (!child.position) child.position = {};
        child.position[deviceView] = position;
      });
      break;

    case 'libre':
      // Evitar solapamientos
      optimizedChildren.forEach((child, index) => {
        if (!child.position?.[deviceView]) {
          const position = {
            top: `${10 + (index * 15) % 70}%`,
            left: `${10 + (index * 20) % 60}%`
          };
          
          if (!child.position) child.position = {};
          child.position[deviceView] = position;
        }
      });
      break;
  }

  return {
    ...container,
    children: optimizedChildren
  };
};

/**
 * Limpia estructura de contenedores removiendo referencias rotas
 */
export const cleanContainerStructure = (components = []) => {
  const cleanedComponents = components.map(comp => {
    if (comp.type === 'container' && comp.children) {
      // Limpiar hijos que no tienen parentId correcto
      const validChildren = comp.children.filter(child => 
        child.parentId === comp.id
      );
      
      return {
        ...comp,
        children: validChildren
      };
    }
    return comp;
  });

  return cleanedComponents;
};

export default {
  validateAddToContainer,
  calculateContainerDepth,
  findAllContainers,
  findContainerById,
  findComponentById,
  validateContainerStructure,
  optimizeContainerLayout,
  cleanContainerStructure
};