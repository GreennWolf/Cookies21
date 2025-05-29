/**
 * Script de corrección específico para el problema de posicionamiento del botón de preferencias
 * Este script se inyecta en el script generado para asegurar que el botón de preferencias
 * se posicione correctamente en banners flotantes, evitando el margen extra de 30-50px
 */

// Función para generar código JavaScript que soluciona el problema de posicionamiento
function generatePreferencesButtonFixCode() {
  return "    /**\n" +
    "     * Fix específico para el posicionamiento del botón de preferencias en banners flotantes\n" +
    "     * Asegura que el botón esté correctamente pegado al borde sin márgenes adicionales\n" +
    "     */\n" +
    "    window.CMP.fixPreferencesButtonPosition = function() {\n" +
    "      console.log('[CMP] Aplicando fix de posicionamiento para botón de preferencias...');\n" +
    "      \n" +
    "      // Primero verificamos si el banner existe\n" +
    "      var banner = document.getElementById('cmp-banner');\n" +
    "      if (!banner) {\n" +
    "        console.log('[CMP] No se encontró el banner, buscando alternativas...');\n" +
    "        // Buscar alternativas\n" +
    "        var containers = document.querySelectorAll('[id$=\"-container\"], .cmp-banner, [class*=\"cmp-\"]');\n" +
    "        for (var i = 0; i < containers.length; i++) {\n" +
    "          if (containers[i].querySelector('#preferencesBtn, [id*=\"preference\"]')) {\n" +
    "            banner = containers[i];\n" +
    "            console.log('[CMP] Banner alternativo encontrado:', banner.id || banner.className);\n" +
    "            break;\n" +
    "          }\n" +
    "        }\n" +
    "      }\n" +
    "      \n" +
    "      if (!banner) {\n" +
    "        console.log('[CMP] No se pudo encontrar el banner o contenedor, abortando fix');\n" +
    "        return;\n" +
    "      }\n" +
    "      \n" +
    "      // Buscar el botón de preferencias con múltiples selectores\n" +
    "      var prefsButton = banner.querySelector(\n" +
    "        '#preferencesBtn, [id*=\"preference\"], [data-action=\"show_preferences\"], ' +\n" +
    "        'button[data-cmp-action=\"show_preferences\"], .preferences-button, ' +\n" +
    "        '[class*=\"preference\"]'\n" +
    "      );\n" +
    "      \n" +
    "      if (!prefsButton) {\n" +
    "        console.log('[CMP] No se encontró el botón de preferencias, abortando fix');\n" +
    "        return;\n" +
    "      }\n" +
    "      \n" +
    "      console.log('[CMP] Botón de preferencias encontrado:', prefsButton.id || prefsButton.className);\n" +
    "      \n" +
    "      // Verificar la posición actual\n" +
    "      var computedStyle = window.getComputedStyle(prefsButton);\n" +
    "      var currentLeft = computedStyle.left;\n" +
    "      var currentRight = computedStyle.right;\n" +
    "      var transform = computedStyle.transform;\n" +
    "      \n" +
    "      console.log('[CMP] Posición actual del botón - left:', currentLeft, 'right:', currentRight, 'transform:', transform);\n" +
    "      \n" +
    "      // Determinar cómo está posicionado el botón\n" +
    "      var positioning = 'unknown';\n" +
    "      \n" +
    "      // Botón centrado (típicamente con left: 50%)\n" +
    "      if (currentLeft === '50%' || (prefsButton.style.left === '50%') || \n" +
    "          prefsButton.hasAttribute('data-center') || \n" +
    "          prefsButton.getAttribute('transformX') === 'center') {\n" +
    "        positioning = 'center';\n" +
    "      }\n" +
    "      // Botón pegado a la izquierda\n" +
    "      else if ((currentLeft !== 'auto' && currentLeft !== '50%' && currentLeft !== '0px') || \n" +
    "               prefsButton.style.left || \n" +
    "               prefsButton.hasAttribute('data-left') ||\n" +
    "               prefsButton.hasAttribute('data-position-left')) {\n" +
    "        positioning = 'left';\n" +
    "      }\n" +
    "      // Botón pegado a la derecha\n" +
    "      else if (currentRight !== 'auto' || \n" +
    "               prefsButton.style.right || \n" +
    "               prefsButton.hasAttribute('data-right') ||\n" +
    "               prefsButton.hasAttribute('data-position-right')) {\n" +
    "        positioning = 'right';\n" +
    "      }\n" +
    "      \n" +
    "      console.log('[CMP] Tipo de posicionamiento detectado:', positioning);\n" +
    "      \n" +
    "      // Aplicar fijos específicos para cada tipo de posicionamiento\n" +
    "      if (positioning === 'center') {\n" +
    "        // Para botones centrados, asegurar que tienen transform: translateX(-50%)\n" +
    "        console.log('[CMP] Aplicando posicionamiento centrado');\n" +
    "        prefsButton.style.removeProperty('right');\n" +
    "        prefsButton.style.setProperty('left', '50%', 'important');\n" +
    "        prefsButton.style.setProperty('transform', 'translateX(-50%)', 'important');\n" +
    "      }\n" +
    "      else if (positioning === 'left') {\n" +
    "        // Para botones a la izquierda, eliminar cualquier margen o padding extra\n" +
    "        console.log('[CMP] Aplicando posicionamiento a la izquierda');\n" +
    "        prefsButton.style.removeProperty('right');\n" +
    "        prefsButton.style.removeProperty('transform'); // No debe tener transform\n" +
    "        \n" +
    "        // Si el botón ya tiene una posición left exacta, mantenerla o hacerla 0\n" +
    "        var leftVal = (currentLeft !== 'auto') ? currentLeft : '0px';\n" +
    "        \n" +
    "        // Si el valor incluye px, convertirlo a número y verificar si está desplazado\n" +
    "        if (leftVal.includes('px')) {\n" +
    "          var leftPx = parseFloat(leftVal);\n" +
    "          // Si el valor es pequeño (< 5px), hacerlo 0px\n" +
    "          if (leftPx < 5) leftVal = '0px';\n" +
    "          // Si el valor es grande (30-50px), probablemente es el bug\n" +
    "          else if (leftPx >= 30 && leftPx <= 50) leftVal = '0px';\n" +
    "        }\n" +
    "        \n" +
    "        prefsButton.style.setProperty('left', leftVal, 'important');\n" +
    "        prefsButton.style.setProperty('margin-left', '0px', 'important');\n" +
    "        prefsButton.style.setProperty('padding-left', '0px', 'important');\n" +
    "      }\n" +
    "      else if (positioning === 'right') {\n" +
    "        // Para botones a la derecha, eliminar cualquier margen o padding extra\n" +
    "        console.log('[CMP] Aplicando posicionamiento a la derecha');\n" +
    "        prefsButton.style.removeProperty('left');\n" +
    "        prefsButton.style.removeProperty('transform'); // No debe tener transform\n" +
    "        \n" +
    "        // Si el botón ya tiene una posición right exacta, mantenerla o hacerla 0\n" +
    "        var rightVal = (currentRight !== 'auto') ? currentRight : '0px';\n" +
    "        \n" +
    "        // Si el valor incluye px, convertirlo a número y verificar si está desplazado\n" +
    "        if (rightVal.includes('px')) {\n" +
    "          var rightPx = parseFloat(rightVal);\n" +
    "          // Si el valor es pequeño (< 5px), hacerlo 0px\n" +
    "          if (rightPx < 5) rightVal = '0px';\n" +
    "          // Si el valor es grande (30-50px), probablemente es el bug\n" +
    "          else if (rightPx >= 30 && rightPx <= 50) rightVal = '0px';\n" +
    "        }\n" +
    "        \n" +
    "        prefsButton.style.setProperty('right', rightVal, 'important');\n" +
    "        prefsButton.style.setProperty('margin-right', '0px', 'important');\n" +
    "        prefsButton.style.setProperty('padding-right', '0px', 'important');\n" +
    "      }\n" +
    "      \n" +
    "      // Verificar si estamos en un banner flotante\n" +
    "      var isFloating = banner.classList.contains('cmp-banner--floating') || \n" +
    "                      banner.classList.contains('floating') ||\n" +
    "                      banner.getAttribute('data-type') === 'floating';\n" +
    "      \n" +
    "      // Verificar si estamos dentro de un wrapper (común para banners flotantes)\n" +
    "      var wrapper = null;\n" +
    "      if (banner.parentNode && (banner.parentNode.id === 'cmp-floating-wrapper' || \n" +
    "                              banner.parentNode.classList.contains('cmp-wrapper'))) {\n" +
    "        wrapper = banner.parentNode;\n" +
    "        console.log('[CMP] Banner está dentro de un wrapper');\n" +
    "      }\n" +
    "      \n" +
    "      // Caso especial para banners flotantes en esquinas derecha e izquierda\n" +
    "      if (isFloating && wrapper) {\n" +
    "        var position = wrapper.getAttribute('data-position') || \n" +
    "                      banner.getAttribute('data-floating-corner') ||\n" +
    "                      banner.getAttribute('data-position') ||\n" +
    "                      'bottom-right';\n" +
    "        \n" +
    "        console.log('[CMP] Banner flotante con posición:', position);\n" +
    "        \n" +
    "        // En banners flotantes, necesitamos tener en cuenta la posición del banner\n" +
    "        if (position.includes('right')) {\n" +
    "          console.log('[CMP] Ajustando para banner flotante a la derecha');\n" +
    "          // Garantizar que el wrapper no tenga transform que interfiera\n" +
    "          wrapper.style.setProperty('transform', 'none', 'important');\n" +
    "          \n" +
    "          if (positioning === 'right') {\n" +
    "            // El botón debe estar completamente alineado a la derecha\n" +
    "            prefsButton.style.setProperty('right', '0px', 'important');\n" +
    "          }\n" +
    "        }\n" +
    "        else if (position.includes('left')) {\n" +
    "          console.log('[CMP] Ajustando para banner flotante a la izquierda');\n" +
    "          \n" +
    "          if (positioning === 'left') {\n" +
    "            // El botón debe estar completamente alineado a la izquierda\n" +
    "            prefsButton.style.setProperty('left', '0px', 'important');\n" +
    "          }\n" +
    "        }\n" +
    "      }\n" +
    "      \n" +
    "      console.log('[CMP] Fix de posicionamiento aplicado con éxito.');\n" +
    "      return true;\n" +
    "    };\n" +
    "\n" +
    "    // Ejecutar fix después de un tiempo para garantizar que los elementos estén cargados\n" +
    "    setTimeout(function() {\n" +
    "      if (window.CMP && window.CMP.fixPreferencesButtonPosition) {\n" +
    "        window.CMP.fixPreferencesButtonPosition();\n" +
    "      }\n" +
    "    }, 300);\n" +
    "\n" +
    "    // Crear un observador para detectar cambios en el DOM que pudieran afectar al botón\n" +
    "    if (typeof MutationObserver !== 'undefined' && !window.CMP._prefsBtnObserver) {\n" +
    "      var observer = new MutationObserver(function(mutations) {\n" +
    "        // Limpiar cualquier timeout anterior\n" +
    "        if (window.CMP._prefsBtnFixTimeout) {\n" +
    "          clearTimeout(window.CMP._prefsBtnFixTimeout);\n" +
    "        }\n" +
    "        \n" +
    "        // Programar un nuevo fix con un pequeño retraso\n" +
    "        window.CMP._prefsBtnFixTimeout = setTimeout(function() {\n" +
    "          if (window.CMP && window.CMP.fixPreferencesButtonPosition) {\n" +
    "            window.CMP.fixPreferencesButtonPosition();\n" +
    "          }\n" +
    "        }, 100);\n" +
    "      });\n" +
    "      \n" +
    "      // Configurar para observar cambios en atributos y estructura\n" +
    "      observer.observe(document.body, {\n" +
    "        attributes: true,\n" +
    "        childList: true,\n" +
    "        subtree: true,\n" +
    "        attributeFilter: ['style', 'class']\n" +
    "      });\n" +
    "      \n" +
    "      // Guardar referencia al observador\n" +
    "      window.CMP._prefsBtnObserver = observer;\n" +
    "      \n" +
    "      // Desconectar después de 10 segundos para evitar sobrecarga\n" +
    "      setTimeout(function() {\n" +
    "        if (window.CMP._prefsBtnObserver) {\n" +
    "          window.CMP._prefsBtnObserver.disconnect();\n" +
    "          delete window.CMP._prefsBtnObserver;\n" +
    "        }\n" +
    "      }, 10000);\n" +
    "    }\n";
}

// Función para inyectar el código en el script principal
function injectPreferencesButtonFixIntoScript(consentScript) {
  const fixCode = generatePreferencesButtonFixCode();
  
  // Buscar si ya existe una implementación de la función
  if (consentScript.includes('window.CMP.fixPreferencesButtonPosition')) {
    console.log('Reemplazando implementación existente de fixPreferencesButtonPosition');
    
    // Patrón para encontrar la implementación existente
    const existingPattern = /window\.CMP\.fixPreferencesButtonPosition\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/;
    
    // Reemplazar la implementación existente con la nueva
    return consentScript.replace(existingPattern, fixCode);
  } else {
    console.log('Añadiendo nueva implementación de fixPreferencesButtonPosition');
    
    // Buscar un buen punto para insertar el código
    const initPoint = consentScript.indexOf('window.CMP.init = function()');
    
    if (initPoint !== -1) {
      // Insertar antes de la función init
      return consentScript.substring(0, initPoint) + fixCode + '\n\n' + consentScript.substring(initPoint);
    } else {
      // Buscar un buen lugar alternativo para insertar (después de otras funciones similares)
      const floatingPoint = consentScript.indexOf('window.CMP.ensureFloatingPosition = function()');
      const modalPoint = consentScript.indexOf('window.CMP.ensureModalVisibility = function()');
      
      if (floatingPoint !== -1) {
        // Encontrar el final de la función ensureFloatingPosition
        let braceCount = 0;
        let endPoint = floatingPoint;
        
        for (let i = floatingPoint; i < consentScript.length; i++) {
          const char = consentScript[i];
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPoint = i + 1;
              break;
            }
          }
        }
        
        return consentScript.substring(0, endPoint + 1) + '\n\n' + fixCode + consentScript.substring(endPoint + 1);
      } else if (modalPoint !== -1) {
        // Encontrar el final de la función ensureModalVisibility
        let braceCount = 0;
        let endPoint = modalPoint;
        
        for (let i = modalPoint; i < consentScript.length; i++) {
          const char = consentScript[i];
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPoint = i + 1;
              break;
            }
          }
        }
        
        return consentScript.substring(0, endPoint + 1) + '\n\n' + fixCode + consentScript.substring(endPoint + 1);
      } else {
        // Insertar al final del espacio de nombres CMP
        return consentScript + '\n\n' + fixCode;
      }
    }
  }
}

module.exports = {
  generatePreferencesButtonFixCode,
  injectPreferencesButtonFixIntoScript
};