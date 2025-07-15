/**
 * @fileoverview Resuelve dimensiones de referencia para conversiones de unidades
 * @module ReferenceResolver
 * @author Banner Editor Team
 * @version 1.0.0
 */

/**
 * Clase que maneja la resolución de dimensiones de referencia para componentes del banner
 * Determina qué elemento usar como referencia para conversiones px ↔ %
 * 
 * @class ReferenceResolver
 */
export class ReferenceResolver {
  /**
   * Constructor de ReferenceResolver
   */
  constructor() {
    // Configuración de selectores
    this.selectors = {
      canvas: '.banner-container',
      canvasFallback: '[data-banner-canvas]',
      editorFallback: '.banner-editor',
      component: '[data-id]',
      container: '[data-component-type="container"]'
    };
  }

  /**
   * Obtiene la referencia de dimensión para un componente y propiedad específicos
   * 
   * @param {string} componentId - ID del componente
   * @param {string} property - Propiedad de dimensión ('width', 'height', etc.')
   * @returns {Object|null} Objeto con element, size y type o null si no encuentra referencia
   * 
   * @example
   * const ref = resolver.getReference('comp-123', 'width');
   * // { element: HTMLElement, size: 800, type: 'canvas' }
   */
  getReference(componentId, property) {
    if (!componentId || !property) {
      console.warn('ReferenceResolver: componentId y property son requeridos');
      return null;
    }

    // Determinar si la propiedad es de ancho (width, minWidth, maxWidth, etc.)
    const isWidthProperty = property.toLowerCase().includes('width');
    
    // Intentar encontrar un contenedor padre primero
    const parentContainer = this.getParentContainer(componentId);
    
    if (parentContainer) {
      // El componente tiene un contenedor padre - usar como referencia
      const size = isWidthProperty 
        ? parentContainer.clientWidth 
        : parentContainer.clientHeight;
      
      console.log(`🔍 ReferenceResolver: Usando contenedor padre como referencia para ${componentId}.${property}`, {
        elementSize: size,
        clientWidth: parentContainer.clientWidth,
        clientHeight: parentContainer.clientHeight,
        property: property,
        isWidthProperty
      });
      
      return {
        element: parentContainer,
        size: size > 0 ? size : 0, // Asegurar que size no sea negativo
        type: 'container',
        isValid: size > 0
      };
    }
    
    // No tiene contenedor padre - usar canvas principal
    const canvas = this.getMainCanvas();
    
    if (canvas) {
      const size = isWidthProperty 
        ? canvas.clientWidth 
        : canvas.clientHeight;
      
      console.log(`🔍 ReferenceResolver: Usando canvas principal como referencia para ${componentId}.${property}`, {
        elementSize: size,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        property: property,
        isWidthProperty,
        canvasElement: canvas
      });
      
      return {
        element: canvas,
        size: size > 0 ? size : 0, // Asegurar que size no sea negativo
        type: 'canvas',
        isValid: size > 0
      };
    }
    
    // No se pudo encontrar referencia
    console.error(`ReferenceResolver: No se pudo encontrar referencia para ${componentId}.${property}`);
    return null;
  }

  /**
   * Obtiene el elemento del canvas principal del banner
   * 
   * @returns {HTMLElement|null} Elemento del canvas o null si no se encuentra
   */
  getMainCanvas() {
    // Intentar encontrar el canvas principal usando selectores en orden de prioridad
    
    // Prioridad 1: .banner-container (selector principal)
    let canvas = document.querySelector(this.selectors.canvas);
    if (canvas) {
      return canvas;
    }
    
    // Prioridad 2: [data-banner-canvas] (fallback específico)
    canvas = document.querySelector(this.selectors.canvasFallback);
    if (canvas) {
      return canvas;
    }
    
    // Prioridad 3: .banner-editor (fallback general)
    canvas = document.querySelector(this.selectors.editorFallback);
    if (canvas) {
      return canvas;
    }
    
    // No se encontró canvas - logging para debugging
    console.warn('ReferenceResolver: No se pudo encontrar el canvas principal del banner');
    return null;
  }

  /**
   * Obtiene el contenedor padre de un componente específico
   * 
   * @param {string} componentId - ID del componente
   * @returns {HTMLElement|null} Elemento del contenedor padre o null si no se encuentra
   */
  getParentContainer(componentId) {
    if (!componentId) {
      console.warn('ReferenceResolver: componentId es requerido para getParentContainer');
      return null;
    }

    // Buscar el elemento del componente usando su ID
    const componentElement = document.querySelector(`[data-id="${componentId}"]`);
    
    if (!componentElement) {
      console.warn(`ReferenceResolver: No se encontró componente con ID ${componentId}`);
      return null;
    }

    // Buscar el contenedor padre más cercano
    const parentContainer = componentElement.closest(this.selectors.container);
    
    if (!parentContainer) {
      // No es necesario warning aquí - muchos componentes no tienen contenedor padre
      console.debug(`ReferenceResolver: Componente ${componentId} no tiene contenedor padre`);
      return null;
    }

    console.debug(`ReferenceResolver: Encontrado contenedor padre para ${componentId}`);
    return parentContainer;
  }
}

// Export por defecto
export default ReferenceResolver;