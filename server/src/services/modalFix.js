/**
 * Solución para los problemas de visibilidad de modales
 * Este script proporciona funciones de utilidad para asegurar la visibilidad de modales
 */

// Solución simplificada para generar HTML de modal
function generateModalHTML(content, id = 'cmp-banner') {
  // Estructura simplificada para el modal
  const html = `
    <div id="cmp-modal-container" style="position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; background-color:rgba(0,0,0,0.5) !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:2147483646 !important;">
      <div id="${id}" style="border-radius:8px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important; width:90% !important; max-width:600px !important; padding:20px !important; position:relative !important; z-index:2147483647 !important;">
        ${content}
      </div>
    </div>
  `;
  
  return html;
}

// CSS para la versión simplificada del modal
function generateModalCSS() {
  return `
    /* Estilos para contenedor de modal (overlay + contenido) */
    #cmp-modal-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: red !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483646 !important; /* Un valor realmente alto para estar por encima de todo */
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Estilos para el contenido del modal */
    #cmp-modal-container > #cmp-banner {
      /* background-color se define en el CSS generado desde el template */
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
      width: 90% !important;
      max-width: 600px !important;
      padding: 20px !important;
      position: relative !important;
      z-index: 2147483647 !important; /* Aún más alto para el modal */
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
    }

    /* Asegurando que los elementos dentro del modal son visibles */
    #cmp-modal-container > #cmp-banner * {
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Corrección para botones dentro del modal */
    #cmp-modal-container button {
      pointer-events: auto !important;
      cursor: pointer !important;
    }
  `;
}

// Código JavaScript para forzar visibilidad de modal
function generateModalVisibilityJS() {
  return `
    // Función para forzar la visibilidad del modal
    window.CMP.forceModalVisibility = function() {
      console.log("[CMP] Forzando visibilidad del modal...");
      
      // Buscar el contenedor del modal
      var modalContainer = document.getElementById('cmp-modal-container');
      var banner = document.getElementById('cmp-banner');
      
      // Si el banner existe pero no está dentro de un contenedor modal, reconstruir la estructura
      if (banner && (!modalContainer || !modalContainer.contains(banner))) {
        console.log("[CMP] Reconstruyendo estructura del modal");
        
        // Guardar referencia al padre original
        var originalParent = banner.parentNode;
        
        // Crear nuevo contenedor
        modalContainer = document.createElement('div');
        modalContainer.id = 'cmp-modal-container';
        modalContainer.style.cssText = "position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100% !important; height:100% !important; background-color:rgba(0,0,0,0.5) !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:2147483646 !important; opacity:1 !important; visibility:visible !important;";
        
        // Remover el banner de su ubicación original
        if (originalParent) {
          originalParent.removeChild(banner);
        }
        
        // Aplicar estilos forzados al banner
        banner.style.cssText = " border-radius:8px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important; width:90% !important; max-width:600px !important; padding:20px !important; position:relative !important; z-index:2147483647 !important; opacity:1 !important; visibility:visible !important; display:block !important; max-height:90vh !important; overflow-y:auto !important;";
        
        // Colocar banner dentro del nuevo contenedor
        modalContainer.appendChild(banner);
        document.body.appendChild(modalContainer);
        
        console.log("[CMP] Modal reconstruido con estructura simplificada");
      } else if (modalContainer) {
        // Si ya existe la estructura, solo forzar visibilidad
        console.log("[CMP] Forzando visibilidad en estructura existente");
        modalContainer.style.cssText = "position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100% !important; height:100% !important; background-color:rgba(0,0,0,0.5) !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:2147483646 !important; opacity:1 !important; visibility:visible !important;";
        
        if (banner) {
          banner.style.cssText = " border-radius:8px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important; width:90% !important; max-width:600px !important; padding:20px !important; position:relative !important; z-index:2147483647 !important; opacity:1 !important; visibility:visible !important; display:block !important; max-height:90vh !important; overflow-y:auto !important;";
        }
      } else {
        console.error("[CMP] No se encontró el banner de consentimiento");
      }
      
      // Forzar repintado del DOM
      setTimeout(function() {
        if (modalContainer) {
          modalContainer.style.opacity = '0.99';
          setTimeout(function() {
            modalContainer.style.opacity = '1';
          }, 50);
        }
      }, 50);
      
      return true;
    };
    
    // Llamar a la función automáticamente después de un retraso
    setTimeout(function() {
      if (document.getElementById('cmp-banner') && 
          document.getElementById('cmp-banner').classList.contains('cmp-banner--modal')) {
        window.CMP.forceModalVisibility();
      }
    }, 500);
  `;
}

module.exports = {
  generateModalHTML,
  generateModalCSS,
  generateModalVisibilityJS
};