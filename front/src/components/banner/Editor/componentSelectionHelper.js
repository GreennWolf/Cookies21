/**
 * Helper para la selección de componentes y manejo de paneles
 * 
 * Este módulo proporciona funciones para gestionar la selección de componentes
 * y asegurar que el panel de propiedades se abra automáticamente.
 */

// Importamos los estilos CSS
import './componentSelection.css';

/**
 * Verifica y asegura que el panel de componentes esté abierto
 * @param {Object} panelsConfig - La configuración actual de los paneles
 * @param {Function} setPanelsConfig - Función para actualizar la configuración de paneles
 * @param {Function} savePanelsConfig - Función para guardar la configuración en localStorage
 */
export function ensureComponentsPanelOpen(panelsConfig, setPanelsConfig, savePanelsConfig) {
  // Si el panel de componentes está oculto o colapsado, abrirlo
  if (!panelsConfig.components.expanded || !panelsConfig.components.visible) {
    const newConfig = { ...panelsConfig };
    
    // Asegurar que sea visible
    if (!newConfig.components.visible) {
      newConfig.components.visible = true;
    }
    
    // Asegurar que esté expandido
    if (!newConfig.components.expanded) {
      newConfig.components.expanded = true;
    }
    
    // Actualizar la configuración
    setPanelsConfig(newConfig);
    savePanelsConfig(newConfig);
    
    // Forzar el estado expandido en localStorage directamente
    localStorage.setItem(`panel_components_expanded`, 'true');
    
    return true; // Indica que se hizo un cambio
  }
  
  return false; // No se hizo ningún cambio
}

/**
 * Aplica las clases CSS adecuadas para la selección de componentes
 * @param {string} componentId - ID del componente seleccionado
 */
export function applyComponentSelectionStyles(componentId) {
  // Eliminar la clase 'selected' de todos los componentes
  document.querySelectorAll('.banner-component').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Añadir la clase 'selected' al componente seleccionado
  if (componentId) {
    const componentElement = document.querySelector(`[data-component-id="${componentId}"]`);
    if (componentElement) {
      componentElement.classList.add('selected');
      
      // Determinar si está bloqueado
      const isLocked = componentElement.hasAttribute('data-locked') || 
                      componentElement.getAttribute('data-locked') === 'true';
      
      if (isLocked) {
        componentElement.classList.add('locked');
      } else {
        componentElement.classList.remove('locked');
      }
    }
  }
}

/**
 * Inicializa los componentes con las clases CSS necesarias
 */
export function initializeComponentStyles() {
  // Añadir la clase 'banner-component' a todos los componentes
  document.querySelectorAll('[data-component-id]').forEach(el => {
    el.classList.add('banner-component');
  });
}

/**
 * Manejador de eventos para cuando se selecciona un componente
 * @param {Object} component - El componente seleccionado
 * @param {Object} panelsConfig - La configuración actual de los paneles
 * @param {Function} setPanelsConfig - Función para actualizar la configuración de paneles
 * @param {Function} savePanelsConfig - Función para guardar la configuración en localStorage
 * @param {Function} setSelectedComponent - Función para actualizar el componente seleccionado
 */
export function handleComponentSelection(component, panelsConfig, setPanelsConfig, savePanelsConfig, setSelectedComponent) {
  // Asegurar que el panel esté abierto
  ensureComponentsPanelOpen(panelsConfig, setPanelsConfig, savePanelsConfig);
  
  // Actualizar el componente seleccionado
  setSelectedComponent(component);
  
  // Aplicar estilos de selección
  applyComponentSelectionStyles(component.id);
}

export default {
  ensureComponentsPanelOpen,
  applyComponentSelectionStyles,
  initializeComponentStyles,
  handleComponentSelection
};