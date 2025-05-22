// Depuración para el modal
console.log("🔍 Ejecutando script de depuración para visibilidad del modal");

// Ver qué está ocurriendo en tiempo real
function debugBanner() {
  console.log("=== INICIO DEBUG BANNER ===");
  
  // 1. Verificar si el banner existe
  var banner = document.getElementById('cmp-banner');
  console.log("¿Existe el banner?:", banner ? "SÍ" : "NO");
  
  if (banner) {
    // 2. Verificar sus estilos computados
    var bannerStyle = window.getComputedStyle(banner);
    console.log("Display del banner:", bannerStyle.display);
    console.log("Visibility del banner:", bannerStyle.visibility);
    console.log("Opacity del banner:", bannerStyle.opacity);
    console.log("Position del banner:", bannerStyle.position);
    console.log("Z-index del banner:", bannerStyle.zIndex);
    
    // 3. Verificar si tiene las clases correctas
    console.log("Clases del banner:", banner.className);
    console.log("¿Tiene clase modal?:", banner.classList.contains("cmp-banner--modal"));
    
    // 4. Verificar la estructura DOM
    console.log("Estructura del DOM del banner:");
    console.log("Padre del banner:", banner.parentNode ? banner.parentNode.id || banner.parentNode.tagName : "NINGUNO");
    
    // 5. Verificar si es visible visualmente
    var rect = banner.getBoundingClientRect();
    console.log("Dimensiones del banner:", {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    });
    
    // 6. Verificar si tiene algún display:none como herencia
    var parent = banner.parentNode;
    while (parent && parent !== document) {
      var parentStyle = window.getComputedStyle(parent);
      console.log("Padre:", parent.id || parent.tagName, "- Display:", parentStyle.display);
      if (parentStyle.display === "none") {
        console.log("⚠️ DETECTADO display:none en un elemento padre:", parent.id || parent.tagName);
      }
      parent = parent.parentNode;
    }
  }
  
  // 7. Verificar la estructura de la superposición modal
  var overlay = document.getElementById('cmp-modal-overlay');
  console.log("¿Existe el overlay?:", overlay ? "SÍ" : "NO");
  
  if (overlay) {
    var overlayStyle = window.getComputedStyle(overlay);
    console.log("Display del overlay:", overlayStyle.display);
    console.log("Visibility del overlay:", overlayStyle.visibility);
    console.log("Opacity del overlay:", overlayStyle.opacity);
  }
  
  var wrapper = document.getElementById('cmp-modal-wrapper');
  console.log("¿Existe el wrapper?:", wrapper ? "SÍ" : "NO");
  
  if (wrapper) {
    var wrapperStyle = window.getComputedStyle(wrapper);
    console.log("Display del wrapper:", wrapperStyle.display);
    console.log("Visibility del wrapper:", wrapperStyle.visibility);
    console.log("Opacity del wrapper:", wrapperStyle.opacity);
  }
  
  console.log("=== FIN DEBUG BANNER ===");
}

// Forzar la visibilidad con múltiples técnicas
function forceModalVisibility() {
  console.log("🔨 Forzando visibilidad del modal...");
  
  // 1. Obtener referencias a todos los elementos
  var banner = document.getElementById('cmp-banner');
  var overlay = document.getElementById('cmp-modal-overlay');
  var wrapper = document.getElementById('cmp-modal-wrapper');
  
  // 2. Si no existe la estructura, crearla
  if (!overlay && banner) {
    console.log("Creando estructura completa para el modal");
    
    // Guardar una referencia al padre original
    var originalParent = banner.parentNode;
    if (originalParent) {
      originalParent.removeChild(banner);
    }
    
    // Crear overlay
    overlay = document.createElement('div');
    overlay.id = 'cmp-modal-overlay';
    overlay.className = 'cmp-modal-overlay';
    document.body.appendChild(overlay);
    
    // Crear wrapper
    wrapper = document.createElement('div');
    wrapper.id = 'cmp-modal-wrapper';
    overlay.appendChild(wrapper);
    
    // Mover banner dentro del wrapper
    wrapper.appendChild(banner);
    
    console.log("Estructura modal reconstruida");
  }
  
  // 3. Aplicar estilos agresivos para forzar visibilidad
  if (overlay) {
    console.log("Forzando visibilidad del overlay");
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: rgba(0,0,0,0.5) !important;
      z-index: 2147483647 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    `;
  }
  
  if (wrapper) {
    console.log("Forzando visibilidad del wrapper");
    wrapper.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    `;
  }
  
  if (banner) {
    console.log("Forzando visibilidad del banner");
    banner.style.cssText = `
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      width: 90% !important;
      max-width: 600px !important;
      margin: 0 !important;
      padding: 20px !important;
      background-color: #ffffff !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
      z-index: 2147483647 !important;
      transform: none !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    `;
    
    // Hacer que todos los hijos sean visibles también
    var children = banner.querySelectorAll('*');
    for (var i = 0; i < children.length; i++) {
      children[i].style.visibility = 'visible';
      children[i].style.opacity = '1';
    }
  }
  
  // 4. Forzar un repintado del DOM
  setTimeout(function() {
    if (overlay) overlay.style.opacity = '0.99';
    if (wrapper) wrapper.style.opacity = '0.99';
    if (banner) banner.style.opacity = '0.99';
    
    setTimeout(function() {
      if (overlay) overlay.style.opacity = '1';
      if (wrapper) wrapper.style.opacity = '1';
      if (banner) banner.style.opacity = '1';
      
      console.log("✅ Repintado forzado completado");
    }, 50);
  }, 50);
}

// Exponer funciones al scope global para poder ejecutarlas desde la consola
window.debugBanner = debugBanner;
window.forceModalVisibility = forceModalVisibility;

// Ejecutar diagnóstico inicial
setTimeout(function() {
  console.log("Ejecutando diagnóstico inicial de banner...");
  debugBanner();
  
  // Si no se detecta banner después de 2 segundos, intentar forzar la visibilidad
  setTimeout(function() {
    var banner = document.getElementById('cmp-banner');
    if (!banner || window.getComputedStyle(banner).display === 'none') {
      console.log("⚠️ Banner no encontrado o no visible después de 2 segundos, forzando visibilidad...");
      forceModalVisibility();
    }
  }, 2000);
}, 1000);

// Funciones auxiliares para el usuario
console.log("ℹ️ DEBUG: Para depurar el banner manualmente:");
console.log("  - debugBanner() - Para ver información sobre el estado actual del banner");
console.log("  - forceModalVisibility() - Para forzar la visibilidad del modal");

// Observar mutaciones en el DOM para detectar cuando se añade el banner
console.log("Configurando observador del DOM para detectar cuando se añade el banner...");
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        var node = mutation.addedNodes[i];
        if (node.id === 'cmp-banner' || (node.querySelector && node.querySelector('#cmp-banner'))) {
          console.log("🔔 Se ha detectado la adición del banner al DOM!");
          setTimeout(debugBanner, 100);
          break;
        }
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });