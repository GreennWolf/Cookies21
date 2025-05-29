/**
 * Script de corrección específico para el problema de ancho del banner modal
 * Este script se inyecta en el script generado para asegurar que el ancho del modal
 * sea correcto y no se vea afectado por otros estilos en la página.
 */

// Función para corregir el ancho del modal en caso de problemas
function fixModalWidth() {
  console.log('[CMP] Ejecutando corrección de ancho del modal...');
  
  // Obtener referencias a los elementos
  var modalContainer = document.getElementById('cmp-modal-container');
  var bannerEl = document.getElementById('cmp-banner');
  
  if (!modalContainer || !bannerEl) {
    console.log('[CMP] No se encontraron los elementos necesarios para corregir el ancho');
    return;
  }
  
  // Comprobar el ancho actual del banner
  var computedStyles = window.getComputedStyle(bannerEl);
  var currentWidth = computedStyles.width;
  var expectedWidth, expectedMinWidth;
  
  // Determinar valores esperados según el tipo de banner
  if (bannerEl.classList.contains('cmp-banner--modal')) {
    expectedWidth = '90%';
    expectedMinWidth = '300px';
  } else if (bannerEl.classList.contains('cmp-banner--floating')) {
    expectedWidth = '40%';
    expectedMinWidth = '250px';
    
    // Para banners flotantes, usamos la implementación mejorada desde ensureFloatingPosition.js
    // Llamamos directamente a la función si existe
    if (typeof window.CMP !== 'undefined' && typeof window.CMP.ensureFloatingPosition === 'function') {
      window.CMP.ensureFloatingPosition();
    }
  } else {
    // Banner estándar
    expectedWidth = '100%';
    expectedMinWidth = '100%';
  }
  
  console.log('[CMP] Ancho actual del banner:', currentWidth);
  console.log('[CMP] Ancho esperado para este tipo de banner:', expectedWidth);
  console.log('[CMP] Ancho mínimo definido:', expectedMinWidth);
  
  // Verificar si hay reglas que afecten al ancho
  console.log('[CMP] Verificando si hay reglas CSS que puedan afectar al ancho del modal...');
  
  // Forzar estilos para garantizar el ancho correcto
  // Aplicar estilos según el tipo de banner
  var bannerType = "";
  
  // Determinar el tipo de banner
  if (bannerEl.classList.contains('cmp-banner--modal')) {
    bannerType = "modal";
    // Obtener el ancho especificado o usar el valor por defecto
    var specifiedWidth = bannerEl.getAttribute('data-width') || '60%';
    // Asegurar que el ancho esté dentro del rango permitido (40% - 90%)
    var widthPercent = parseInt(specifiedWidth);
    if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
    if (widthPercent > 90) widthPercent = 90;
    
    bannerEl.style.setProperty('width', widthPercent + '%', 'important');
    bannerEl.style.setProperty('min-width', '40%', 'important');
    bannerEl.style.setProperty('max-width', '90%', 'important');
  } else if (bannerEl.classList.contains('cmp-banner--floating')) {
    bannerType = "floating";
    // Obtener el ancho especificado o usar el valor por defecto
    var specifiedWidth = bannerEl.getAttribute('data-width') || '50%';
    // Asegurar que el ancho esté dentro del rango permitido (40% - 70%)
    var widthPercent = parseInt(specifiedWidth);
    if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
    if (widthPercent > 70) widthPercent = 70;
    
    bannerEl.style.setProperty('width', widthPercent + '%', 'important');
    bannerEl.style.setProperty('min-width', '40%', 'important');
    bannerEl.style.setProperty('max-width', '70%', 'important');
    
    // Aplicar posicionamiento según la esquina configurada
    var floatingCorner = bannerEl.getAttribute('data-floating-corner') || 'bottom-right';
    var floatingMargin = bannerEl.getAttribute('data-floating-margin') || '20';
    
    // Asegurar que el margen es un número válido
    var marginValue = parseFloat(floatingMargin);
    if (isNaN(marginValue) || marginValue < 0) marginValue = 20;
    
    // Convertir margen a pixels
    var margin = marginValue + 'px';
    
    console.log('[CMP] Aplicando posicionamiento flotante:', floatingCorner, 'con margen:', margin);
    
    // Limpiar posiciones previas
    bannerEl.style.removeProperty('top');
    bannerEl.style.removeProperty('bottom');
    bannerEl.style.removeProperty('left');
    bannerEl.style.removeProperty('right');
    
    // Aplicar posicionamiento según la esquina
    switch (floatingCorner) {
      case 'top-left':
        bannerEl.style.setProperty('top', margin, 'important');
        bannerEl.style.setProperty('left', margin, 'important');
        break;
      case 'top-right':
        bannerEl.style.setProperty('top', margin, 'important');
        bannerEl.style.setProperty('right', margin, 'important');
        break;
      case 'bottom-left':
        bannerEl.style.setProperty('bottom', margin, 'important');
        bannerEl.style.setProperty('left', margin, 'important');
        break;
      case 'bottom-right':
      default:
        bannerEl.style.setProperty('bottom', margin, 'important');
        bannerEl.style.setProperty('right', margin, 'important');
        break;
    }
    
    // Asegurar que el banner flotante tenga position: fixed
    bannerEl.style.setProperty('position', 'fixed', 'important');
  } else {
    // Banner estándar (no modal, no flotante)
    bannerType = "banner";
    bannerEl.style.setProperty('width', '100%', 'important');
    bannerEl.style.setProperty('min-width', '100%', 'important');
    bannerEl.style.setProperty('max-width', '100%', 'important');
  }
  
  console.log('[CMP] Aplicando estilos para banner tipo:', bannerType);
  
  // También aplicar usando cssText para máxima compatibilidad según el tipo de banner
  if (bannerType === "modal") {
    // Obtener el ancho para cssText
    var specifiedWidth = bannerEl.getAttribute('data-width') || '60%';
    var widthPercent = parseInt(specifiedWidth);
    if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
    if (widthPercent > 90) widthPercent = 90;
    
    bannerEl.style.cssText += `; width: ${widthPercent}% !important; min-width: 40% !important; max-width: 90% !important;`;
  } else if (bannerType === "floating") {
    var floatingCorner = bannerEl.getAttribute('data-floating-corner') || 'bottom-right';
    var floatingMargin = bannerEl.getAttribute('data-floating-margin') || '20';
    
    // Asegurar que el margen es un número válido
    var marginValue = parseFloat(floatingMargin);
    if (isNaN(marginValue) || marginValue < 0) marginValue = 20;
    
    // Convertir margen a pixels
    var margin = marginValue + 'px';
    
    // Obtener el ancho para cssText
    var specifiedWidth = bannerEl.getAttribute('data-width') || '50%';
    var widthPercent = parseInt(specifiedWidth);
    if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
    if (widthPercent > 70) widthPercent = 70;
    
    var positionCSS = '';
    switch (floatingCorner) {
      case 'top-left':
        positionCSS = `top: ${margin} !important; left: ${margin} !important;`;
        break;
      case 'top-right':
        positionCSS = `top: ${margin} !important; right: ${margin} !important;`;
        break;
      case 'bottom-left':
        positionCSS = `bottom: ${margin} !important; left: ${margin} !important;`;
        break;
      case 'bottom-right':
      default:
        positionCSS = `bottom: ${margin} !important; right: ${margin} !important;`;
        break;
    }
    
    bannerEl.style.cssText += `; width: ${widthPercent}% !important; min-width: 40% !important; max-width: 70% !important; position: fixed !important; ${positionCSS}`;
  } else { // banner estándar
    bannerEl.style.cssText += '; width: 100% !important; min-width: 100% !important; max-width: 100% !important;';
  }
  
  // Realizar una limpieza de cualquier regla que pueda estar afectando
  // Esto puede ser necesario en ciertos navegadores o con ciertos CSS
  
  // Verificar el ancho después de los cambios
  setTimeout(function() {
    var newComputedStyles = window.getComputedStyle(bannerEl);
    var newWidth = newComputedStyles.width;
    console.log('[CMP] Ancho del banner después de corrección:', newWidth);
    
    // Si aún hay problemas, intenta una solución más radical
    // Umbral de ancho mínimo según el tipo de banner
    var widthThreshold = 300;
    if (bannerType === "floating") {
      widthThreshold = 250;
    }
    
    if (newWidth === currentWidth && parseInt(newWidth) < widthThreshold) {
      console.log('[CMP] Aplicando solución radical para el ancho del banner tipo ' + bannerType + '...');
      
      // Crear un contenedor interno con ancho según el tipo de banner
      var innerWrapper = document.createElement('div');
      
      // Aplicar estilos según el tipo de banner
      if (bannerType === "modal") {
        // Obtener el ancho para innerWrapper
        var specifiedWidth = bannerEl.getAttribute('data-width') || '60%';
        var widthPercent = parseInt(specifiedWidth);
        if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
        if (widthPercent > 90) widthPercent = 90;
        
        innerWrapper.style.cssText = `width: ${widthPercent}% !important; min-width: 40% !important; max-width: 90% !important; margin: 0 auto !important;`;
      } else if (bannerType === "floating") {
        var floatingCorner = bannerEl.getAttribute('data-floating-corner') || 'bottom-right';
        var floatingMargin = bannerEl.getAttribute('data-floating-margin') || '20';
        var margin = floatingMargin + (isNaN(parseFloat(floatingMargin)) ? '' : 'px');
        
        // Obtener el ancho para innerWrapper
        var specifiedWidth = bannerEl.getAttribute('data-width') || '50%';
        var widthPercent = parseInt(specifiedWidth);
        if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 40;
        if (widthPercent > 70) widthPercent = 70;
        
        // Asegurarse de que el margen es un número válido
        var floatingCorner = bannerEl.getAttribute('data-floating-corner') || 'bottom-right';
        var floatingMargin = bannerEl.getAttribute('data-floating-margin') || '20';
        var marginValue = parseFloat(floatingMargin);
        if (isNaN(marginValue) || marginValue < 0) marginValue = 20;
        var margin = marginValue + 'px';
        
        var positionCSS = '';
        switch (floatingCorner) {
          case 'top-left':
            positionCSS = `position: fixed !important; top: ${margin} !important; left: ${margin} !important;`;
            break;
          case 'top-right':
            positionCSS = `position: fixed !important; top: ${margin} !important; right: ${margin} !important;`;
            break;
          case 'bottom-left':
            positionCSS = `position: fixed !important; bottom: ${margin} !important; left: ${margin} !important;`;
            break;
          case 'bottom-right':
          default:
            positionCSS = `position: fixed !important; bottom: ${margin} !important; right: ${margin} !important;`;
            break;
        }
        
        innerWrapper.style.cssText = `width: ${widthPercent}% !important; min-width: 40% !important; max-width: 70% !important; ${positionCSS}`;
      } else { // banner estándar
        innerWrapper.style.cssText = 'width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 auto !important;';
      }
      
      // Mover todo el contenido al wrapper
      while (bannerEl.firstChild) {
        innerWrapper.appendChild(bannerEl.firstChild);
      }
      
      // Añadir el wrapper al banner
      bannerEl.appendChild(innerWrapper);
      
      console.log('[CMP] Solución radical aplicada, utilizando contenedor interno');
    }
  }, 100);
}

// Función para diagnosticar problemas de ancho usando el computed style
function diagnoseWidthIssues() {
  var bannerEl = document.getElementById('cmp-banner');
  if (!bannerEl) return;
  
  var computedStyles = window.getComputedStyle(bannerEl);
  
  console.log('=== DIAGNÓSTICO DE ANCHO DEL MODAL ===');
  console.log('- width:', computedStyles.width);
  console.log('- min-width:', computedStyles.minWidth);
  console.log('- max-width:', computedStyles.maxWidth);
  console.log('- box-sizing:', computedStyles.boxSizing);
  console.log('- padding:', computedStyles.padding);
  console.log('- border:', computedStyles.border);
  console.log('- margin:', computedStyles.margin);
  console.log('- display:', computedStyles.display);
  
  // Calcular ancho real teniendo en cuenta padding y borders
  var paddingLeft = parseInt(computedStyles.paddingLeft) || 0;
  var paddingRight = parseInt(computedStyles.paddingRight) || 0;
  var borderLeft = parseInt(computedStyles.borderLeftWidth) || 0;
  var borderRight = parseInt(computedStyles.borderRightWidth) || 0;
  
  var contentWidth = bannerEl.clientWidth - paddingLeft - paddingRight;
  var fullWidth = bannerEl.offsetWidth;
  
  console.log('- clientWidth (content + padding):', bannerEl.clientWidth);
  console.log('- offsetWidth (content + padding + border):', bannerEl.offsetWidth);
  console.log('- scrollWidth:', bannerEl.scrollWidth);
  console.log('- Ancho calculado (solo contenido):', contentWidth);
  
  // Buscar cualquier estilo que pueda estar interfiriendo
  try {
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      try {
        var rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        
        for (var j = 0; j < rules.length; j++) {
          try {
            var rule = rules[j];
            if (rule.selectorText && (
                rule.selectorText.includes('modal') || 
                rule.selectorText.includes('banner') ||
                rule.selectorText.includes('cmp-')
              )) {
              
              var cssText = rule.cssText;
              if (cssText.includes('width') || cssText.includes('min-width') || cssText.includes('max-width')) {
                console.log('- Regla CSS conflictiva:', rule.selectorText);
                console.log('  Contenido:', cssText);
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  console.log('==============================');
}

// Función específica para verificar y corregir márgenes de banners flotantes
function ensureFloatingMargins() {
  console.log('[CMP] Redirigiendo a la implementación mejorada de ensureFloatingPosition');
  
  // En lugar de implementar lógica aquí, llamamos directamente a la función optimizada
  if (typeof window.CMP !== 'undefined' && typeof window.CMP.ensureFloatingPosition === 'function') {
    console.log('[CMP] Llamando a window.CMP.ensureFloatingPosition()');
    return window.CMP.ensureFloatingPosition();
  }
  
  // Si no existe la función optimizada, usar implementación básica temporal
  console.log('[CMP] La función optimizada no está disponible, usando implementación básica');
  
  var bannerEl = document.getElementById('cmp-banner');
  if (!bannerEl || !bannerEl.classList.contains('cmp-banner--floating')) {
    return false;
  }
  
  // Aplicar estilo position:fixed temporalmente hasta que se cargue la implementación completa
  bannerEl.style.setProperty('position', 'fixed', 'important');
  bannerEl.style.setProperty('z-index', '2147483647', 'important');
  
  return true;
}

// Exportar las funciones para su uso
module.exports = {
  fixModalWidth,
  diagnoseWidthIssues,
  ensureFloatingMargins
};