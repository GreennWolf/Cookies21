/**
 * Banner Debug Helper
 * Funciones para debugging y verificación del sistema de banner editor
 */

export const BannerDebugHelper = {
  
  /**
   * Verifica que todas las props necesarias lleguen a un componente
   */
  verifyProps: (componentName, props, requiredProps) => {
    console.group(`🔍 Verificando props para ${componentName}`);
    
    const missingProps = [];
    const presentProps = [];
    
    requiredProps.forEach(propName => {
      if (props[propName] !== undefined) {
        presentProps.push(propName);
        console.log(`✅ ${propName}:`, typeof props[propName]);
      } else {
        missingProps.push(propName);
        console.warn(`❌ FALTA: ${propName}`);
      }
    });
    
    console.log(`📊 Props presentes: ${presentProps.length}/${requiredProps.length}`);
    
    if (missingProps.length > 0) {
      console.error(`⚠️ Props faltantes en ${componentName}:`, missingProps);
    }
    
    console.groupEnd();
    
    return {
      valid: missingProps.length === 0,
      missing: missingProps,
      present: presentProps
    };
  },

  /**
   * Verifica la estructura de un contenedor
   */
  verifyContainerStructure: (container) => {
    console.group(`🏗️ Verificando estructura del contenedor ${container.id}`);
    
    const checks = {
      hasId: !!container.id,
      hasType: container.type === 'container',
      hasChildren: Array.isArray(container.children),
      hasContainerConfig: !!container.containerConfig,
      childrenCount: container.children?.length || 0
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${check}:`, result);
    });
    
    if (container.children) {
      container.children.forEach((child, index) => {
        console.log(`👶 Hijo ${index}:`, {
          id: child.id,
          type: child.type,
          hasParentId: !!child.parentId,
          parentIdMatches: child.parentId === container.id
        });
      });
    }
    
    console.groupEnd();
    
    return checks;
  },

  /**
   * Verifica el flujo de drag & drop
   */
  verifyDragDropFlow: (eventType, data) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (eventType) {
      case 'drag-start':
        console.log(`🚀 [${timestamp}] DRAG START:`, data);
        break;
      case 'drag-over':
        console.log(`🎯 [${timestamp}] DRAG OVER:`, data);
        break;
      case 'drop':
        console.log(`📍 [${timestamp}] DROP:`, data);
        break;
      case 'container-drop':
        console.log(`🏗️ [${timestamp}] CONTAINER DROP:`, data);
        break;
    }
  },

  /**
   * Verifica el estado del banner config
   */
  verifyBannerConfig: (bannerConfig) => {
    console.group('🎨 Verificando BannerConfig');
    
    const components = bannerConfig.components || [];
    const containers = components.filter(c => c.type === 'container');
    
    console.log(`📊 Total componentes: ${components.length}`);
    console.log(`🏗️ Total contenedores: ${containers.length}`);
    
    containers.forEach(container => {
      this.verifyContainerStructure(container);
    });
    
    console.groupEnd();
  },

  /**
   * Rastrea funciones de contenedor
   */
  traceFunctionCall: (functionName, params) => {
    console.log(`🔧 ${functionName} llamada con:`, params);
  },

  /**
   * Verifica que el data-container-id esté presente
   */
  verifyContainerDataAttribute: () => {
    const containers = document.querySelectorAll('[data-container-id]');
    console.log(`🏷️ Contenedores con data-container-id encontrados: ${containers.length}`);
    
    containers.forEach((container, index) => {
      const containerId = container.getAttribute('data-container-id');
      console.log(`📦 Contenedor ${index}: ID = ${containerId}`);
    });
    
    return containers.length;
  }
};

// Función para debugging automático en desarrollo
export const enableBannerDebugging = () => {
  if (process.env.NODE_ENV === 'development') {
    // Verificar contenedores cada 5 segundos
    setInterval(() => {
      BannerDebugHelper.verifyContainerDataAttribute();
    }, 5000);
    
    console.log('🔍 Banner debugging habilitado');
  }
};

export default BannerDebugHelper;