/**
 * Helper para el manejo de paneles
 * 
 * Este módulo proporciona funciones para manipular los paneles de la interfaz.
 */

/**
 * Fuerza la apertura de un panel específico
 * @param {string} panelId - ID del panel a abrir
 */
export function forceExpandPanel(panelId) {
  // 1. Establecer el valor en localStorage
  localStorage.setItem(`panel_${panelId}_expanded`, 'true');
  
  // 2. Disparar un evento personalizado para que los paneles respondan
  const event = new CustomEvent('panel:forceExpand', { 
    detail: { panelId } 
  });
  window.dispatchEvent(event);
}

/**
 * Fuerza la apertura del panel de componentes
 */
export function forceExpandComponentsPanel() {
  forceExpandPanel('components');
}

export default {
  forceExpandPanel,
  forceExpandComponentsPanel
};