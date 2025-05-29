/**
 * Módulo para depurar información sobre el tamaño del banner
 * Proporciona herramientas para visualizar el tamaño y posición de los banners
 */

// Genera código JavaScript para inyectar en el script de consentimiento
function generateDebugOverlayCode() {
  return "    /**\n" +
    "     * Función para mostrar una superposición de depuración que muestra información \n" +
    "     * sobre el tamaño y posición del banner\n" +
    "     */\n" +
    "    window.CMP.showDebugOverlay = function() {\n" +
    "      // Buscar el banner y el wrapper\n" +
    "      var banner = document.getElementById('cmp-banner');\n" +
    "      var wrapper = document.getElementById('cmp-floating-wrapper');\n" +
    "      \n" +
    "      if (!banner) {\n" +
    "        console.error('No se pudo encontrar el banner para depuración');\n" +
    "        return;\n" +
    "      }\n" +
    "      \n" +
    "      // Crear overlay\n" +
    "      var overlay = document.createElement('div');\n" +
    "      overlay.id = 'cmp-debug-overlay';\n" +
    "      overlay.style.position = 'fixed';\n" +
    "      overlay.style.bottom = '10px';\n" +
    "      overlay.style.left = '10px';\n" +
    "      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';\n" +
    "      overlay.style.color = 'white';\n" +
    "      overlay.style.padding = '10px';\n" +
    "      overlay.style.borderRadius = '5px';\n" +
    "      overlay.style.fontFamily = 'monospace';\n" +
    "      overlay.style.fontSize = '12px';\n" +
    "      overlay.style.maxWidth = '400px';\n" +
    "      overlay.style.zIndex = '2147483647';\n" +
    "      \n" +
    "      // Recolectar información\n" +
    "      var bannerRect = banner.getBoundingClientRect();\n" +
    "      var wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;\n" +
    "      \n" +
    "      // Información del banner\n" +
    "      var bannerInfo = '<strong>Banner:</strong><br>' +\n" +
    "        'ID: ' + banner.id + '<br>' +\n" +
    "        'Position: ' + getComputedStyle(banner).position + '<br>' +\n" +
    "        'Width: ' + bannerRect.width.toFixed(0) + 'px<br>' +\n" +
    "        'Height: ' + bannerRect.height.toFixed(0) + 'px<br>' +\n" +
    "        'Top: ' + bannerRect.top.toFixed(0) + 'px<br>' +\n" +
    "        'Left: ' + bannerRect.left.toFixed(0) + 'px<br>' +\n" +
    "        'Right: ' + (window.innerWidth - bannerRect.right).toFixed(0) + 'px<br>' +\n" +
    "        'Bottom: ' + (window.innerHeight - bannerRect.bottom).toFixed(0) + 'px<br>';\n" +
    "      \n" +
    "      // Información del wrapper (si existe)\n" +
    "      var wrapperInfo = wrapper ? \n" +
    "        '<br><strong>Wrapper:</strong><br>' +\n" +
    "        'ID: ' + wrapper.id + '<br>' +\n" +
    "        'Position: ' + getComputedStyle(wrapper).position + '<br>' +\n" +
    "        'Width: ' + wrapperRect.width.toFixed(0) + 'px<br>' +\n" +
    "        'Height: ' + wrapperRect.height.toFixed(0) + 'px<br>' +\n" +
    "        'Top: ' + wrapperRect.top.toFixed(0) + 'px<br>' +\n" +
    "        'Left: ' + wrapperRect.left.toFixed(0) + 'px<br>' +\n" +
    "        'Right: ' + (window.innerWidth - wrapperRect.right).toFixed(0) + 'px<br>' +\n" +
    "        'Bottom: ' + (window.innerHeight - wrapperRect.bottom).toFixed(0) + 'px<br>' +\n" +
    "        'Margin: ' + (wrapper.style.margin || '0px') : '';\n" +
    "      \n" +
    "      // Información extendida de configuración\n" +
    "      var configInfo = '<br><br><strong>Configuración:</strong><br>' +\n" +
    "        'data-position: ' + (banner.getAttribute('data-position') || 'no definido') + '<br>' +\n" +
    "        'data-floating-corner: ' + (banner.getAttribute('data-floating-corner') || 'no definido') + '<br>' +\n" +
    "        'data-floating-margin: ' + (banner.getAttribute('data-floating-margin') || 'no definido') + 'px<br>' +\n" +
    "        'floatingCorner: ' + (banner.getAttribute('floatingCorner') || 'no definido') + '<br>' +\n" +
    "        'floatingMargin: ' + (banner.getAttribute('floatingMargin') || 'no definido') + 'px<br>' +\n" +
    "        'classes: ' + banner.className + '<br>' +\n" +
    "        '<br><strong>Estilos Computados:</strong><br>' +\n" +
    "        'position: ' + getComputedStyle(banner).position + '<br>' +\n" +
    "        'top: ' + getComputedStyle(banner).top + '<br>' +\n" +
    "        'right: ' + getComputedStyle(banner).right + '<br>' +\n" +
    "        'bottom: ' + getComputedStyle(banner).bottom + '<br>' +\n" +
    "        'left: ' + getComputedStyle(banner).left + '<br>' +\n" +
    "        'margin: ' + getComputedStyle(banner).margin + '<br>';\n" +
    "        \n" +
    "      // Agregar información sobre el wrapper si existe\n" +
    "      if (wrapper) {\n" +
    "        configInfo += '<br><strong>Wrapper:</strong><br>' +\n" +
    "          'classes: ' + wrapper.className + '<br>' +\n" +
    "          'position: ' + getComputedStyle(wrapper).position + '<br>' +\n" +
    "          'top: ' + getComputedStyle(wrapper).top + '<br>' +\n" +
    "          'right: ' + getComputedStyle(wrapper).right + '<br>' +\n" +
    "          'bottom: ' + getComputedStyle(wrapper).bottom + '<br>' +\n" +
    "          'left: ' + getComputedStyle(wrapper).left + '<br>' +\n" +
    "          'margin: ' + getComputedStyle(wrapper).margin + '<br>';\n" +
    "      } else {\n" +
    "        configInfo += '<br><strong>Wrapper:</strong> No encontrado<br>';\n" +
    "      }\n" +
    "      \n" +
    "      // Información de ventana\n" +
    "      var windowInfo = '<br><strong>Ventana:</strong><br>' +\n" +
    "        'Width: ' + window.innerWidth + 'px<br>' +\n" +
    "        'Height: ' + window.innerHeight + 'px';\n" +
    "      \n" +
    "      // Unir toda la información\n" +
    "      overlay.innerHTML = bannerInfo + wrapperInfo + configInfo + windowInfo +\n" +
    "        '<br><br><button id=\"cmp-debug-test-position\" style=\"background:#4CAF50;border:none;color:white;padding:5px 10px;border-radius:3px;cursor:pointer;margin-right:10px;\">Probar Posicionamiento</button>' +\n" +
    "        '<button id=\"cmp-debug-close\" style=\"background:#ff4444;border:none;color:white;padding:5px 10px;border-radius:3px;cursor:pointer;\">Cerrar</button>';\n" +
    "      \n" +
    "      // Añadir controlador para el botón de prueba\n" +
    "      document.getElementById('cmp-debug-test-position').addEventListener('click', function() {\n" +
    "        console.log('[CMP DEBUG] Probando posicionamiento del banner...');\n" +
    "        if (typeof window.CMP.ensureFloatingPosition === 'function') {\n" +
    "          // Mostrar panel de prueba de posiciones\n" +
    "          var testPanel = document.createElement('div');\n" +
    "          testPanel.id = 'cmp-position-test-panel';\n" +
    "          testPanel.style.position = 'fixed';\n" +
    "          testPanel.style.top = '20px';\n" +
    "          testPanel.style.left = '20px';\n" +
    "          testPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';\n" +
    "          testPanel.style.color = 'white';\n" +
    "          testPanel.style.padding = '15px';\n" +
    "          testPanel.style.borderRadius = '5px';\n" +
    "          testPanel.style.zIndex = '2147483647';\n" +
    "          testPanel.style.fontFamily = 'monospace';\n" +
    "          testPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';\n" +
    "          \n" +
    "          // Crear controles para posición y margen\n" +
    "          testPanel.innerHTML = \n" +
    "            \"<h3 style='margin-top:0;text-align:center'>Test de Posicionamiento</h3>\" +\n" +
    "            \"<div style='margin-bottom:10px'>\" +\n" +
    "            \"  <label style='display:block;margin-bottom:5px'>Posición:</label>\" +\n" +
    "            \"  <select id='cmp-test-position' style='width:100%;padding:5px;margin-bottom:10px'>\" +\n" +
    "            \"    <option value='bottom-right'>bottom-right</option>\" +\n" +
    "            \"    <option value='bottom-left'>bottom-left</option>\" +\n" +
    "            \"    <option value='top-right'>top-right</option>\" +\n" +
    "            \"    <option value='top-left'>top-left</option>\" +\n" +
    "            \"  </select>\" +\n" +
    "            \"</div>\" +\n" +
    "            \"<div style='margin-bottom:15px'>\" +\n" +
    "            \"  <label style='display:block;margin-bottom:5px'>Margen (px):</label>\" +\n" +
    "            \"  <input id='cmp-test-margin' type='number' value='20' min='0' max='100' style='width:100%;padding:5px'>\" +\n" +
    "            \"</div>\" +\n" +
    "            \"<div style='display:flex;justify-content:space-between'>\" +\n" +
    "            \"  <button id='cmp-test-apply' style='background:#4CAF50;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer'>Aplicar</button>\" +\n" +
    "            \"  <button id='cmp-test-cancel' style='background:#f44336;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer'>Cancelar</button>\" +\n" +
    "            \"</div>\";\n" +
    "          \n" +
    "          document.body.appendChild(testPanel);\n" +
    "          \n" +
    "          // Establecer valores actuales\n" +
    "          var banner = document.getElementById('cmp-banner');\n" +
    "          if (banner) {\n" +
    "            var currentPos = banner.getAttribute('data-floating-corner') || \n" +
    "                           banner.getAttribute('data-position') || \n" +
    "                           banner.getAttribute('floatingCorner') || \n" +
    "                           'bottom-right';\n" +
    "            var currentMargin = parseInt(banner.getAttribute('data-floating-margin') || \n" +
    "                                      banner.getAttribute('floatingMargin') || '20');\n" +
    "            \n" +
    "            document.getElementById('cmp-test-position').value = currentPos;\n" +
    "            document.getElementById('cmp-test-margin').value = currentMargin;\n" +
    "          }\n" +
    "          \n" +
    "          // Controlador para aplicar\n" +
    "          document.getElementById('cmp-test-apply').addEventListener('click', function() {\n" +
    "            var newPos = document.getElementById('cmp-test-position').value;\n" +
    "            var newMargin = document.getElementById('cmp-test-margin').value;\n" +
    "            \n" +
    "            // Aplicar nuevos valores al banner\n" +
    "            if (banner) {\n" +
    "              banner.setAttribute('data-floating-corner', newPos);\n" +
    "              banner.setAttribute('data-position', newPos);\n" +
    "              banner.setAttribute('floatingCorner', newPos);\n" +
    "              banner.setAttribute('data-floating-margin', newMargin);\n" +
    "              banner.setAttribute('floatingMargin', newMargin);\n" +
    "              \n" +
    "              // Aplicar posicionamiento\n" +
    "              window.CMP.ensureFloatingPosition();\n" +
    "              \n" +
    "              // Actualizar overlay\n" +
    "              setTimeout(function() {\n" +
    "                document.body.removeChild(testPanel);\n" +
    "                window.CMP.showDebugOverlay();\n" +
    "              }, 100);\n" +
    "            }\n" +
    "          });\n" +
    "          \n" +
    "          // Controlador para cancelar\n" +
    "          document.getElementById('cmp-test-cancel').addEventListener('click', function() {\n" +
    "            document.body.removeChild(testPanel);\n" +
    "          });\n" +
    "        } else {\n" +
    "          alert('La función ensureFloatingPosition no está disponible');\n" +
    "          \n" +
    "          // Intentar aplicar fix directo como fallback\n" +
    "          var banner = document.getElementById('cmp-banner');\n" +
    "          if (banner) {\n" +
    "            var wrapper = document.createElement('div');\n" +
    "            wrapper.id = 'cmp-floating-wrapper';\n" +
    "            wrapper.style.position = 'fixed';\n" +
    "            wrapper.style.zIndex = '2147483647';\n" +
    "            wrapper.style.bottom = '20px';\n" +
    "            wrapper.style.right = '20px';\n" +
    "            \n" +
    "            // Clonar el banner\n" +
    "            var clonedBanner = banner.cloneNode(true);\n" +
    "            wrapper.appendChild(clonedBanner);\n" +
    "            \n" +
    "            // Reemplazar en el DOM\n" +
    "            if (banner.parentNode) {\n" +
    "              banner.parentNode.replaceChild(wrapper, banner);\n" +
    "              alert('Se aplicó un fix directo como alternativa');\n" +
    "              setTimeout(window.CMP.showDebugOverlay, 100);\n" +
    "            }\n" +
    "          }\n" +
    "        }\n" +
    "      });\n" +
    "      \n" +
    "      // Añadir al DOM\n" +
    "      document.body.appendChild(overlay);\n" +
    "      \n" +
    "      // Añadir cerrar botón\n" +
    "      document.getElementById('cmp-debug-close').addEventListener('click', function() {\n" +
    "        document.body.removeChild(overlay);\n" +
    "      });\n" +
    "    };\n" +
    "    \n" +
    "    // Exponer función para uso en consola\n" +
    "    window.showCMPDebug = window.CMP.showDebugOverlay;\n" +
    "  ";
}

// Función de depuración para modales (versión original)
function generateModalDebugCode() {
  return "    function debugBannerSize() {\n" +
    "      console.log(\"=== DEPURACIÓN DE TAMAÑO DEL BANNER MODAL ===\");\n" +
    "      \n" +
    "      // Intentar encontrar el banner y contenedor\n" +
    "      var container = document.getElementById('cmp-modal-container');\n" +
    "      var banner = document.getElementById('cmp-banner');\n" +
    "      \n" +
    "      if (!container) {\n" +
    "        console.log(\"❌ No se encontró el contenedor del modal\");\n" +
    "      } else {\n" +
    "        var containerStyles = window.getComputedStyle(container);\n" +
    "        console.log(\"✅ Contenedor modal encontrado\");\n" +
    "        console.log(\"- Position:\", containerStyles.position);\n" +
    "        console.log(\"- Display:\", containerStyles.display);\n" +
    "        console.log(\"- Align-items:\", containerStyles.alignItems);\n" +
    "        console.log(\"- Justify-content:\", containerStyles.justifyContent);\n" +
    "        console.log(\"- Z-index:\", containerStyles.zIndex);\n" +
    "      }\n" +
    "      \n" +
    "      if (!banner) {\n" +
    "        console.log(\"❌ No se encontró el banner\");\n" +
    "      } else {\n" +
    "        var bannerStyles = window.getComputedStyle(banner);\n" +
    "        console.log(\"✅ Banner encontrado\");\n" +
    "        console.log(\"- Width:\", bannerStyles.width);\n" +
    "        console.log(\"- Min-width:\", bannerStyles.minWidth);\n" +
    "        console.log(\"- Max-width:\", bannerStyles.maxWidth);\n" +
    "        console.log(\"- Box-sizing:\", bannerStyles.boxSizing);\n" +
    "        console.log(\"- Position:\", bannerStyles.position);\n" +
    "        console.log(\"- Display:\", bannerStyles.display);\n" +
    "        console.log(\"- Margin:\", bannerStyles.margin);\n" +
    "        \n" +
    "        // Calcular tamaños reales\n" +
    "        console.log(\"- clientWidth (contenido + padding):\", banner.clientWidth + \"px\");\n" +
    "        console.log(\"- offsetWidth (contenido + padding + bordes):\", banner.offsetWidth + \"px\");\n" +
    "        console.log(\"- scrollWidth:\", banner.scrollWidth + \"px\");\n" +
    "        \n" +
    "        // Verificar estilos inline\n" +
    "        console.log(\"- Estilos inline:\", banner.getAttribute('style'));\n" +
    "      }\n" +
    "      \n" +
    "      // Comprobar si hay reglas CSS que afectan al ancho\n" +
    "      try {\n" +
    "        var affectingRules = [];\n" +
    "        for (var i = 0; i < document.styleSheets.length; i++) {\n" +
    "          try {\n" +
    "            var sheet = document.styleSheets[i];\n" +
    "            var rules = sheet.cssRules || sheet.rules;\n" +
    "            if (!rules) continue;\n" +
    "            \n" +
    "            for (var j = 0; j < rules.length; j++) {\n" +
    "              var rule = rules[j];\n" +
    "              if (rule.selectorText && \n" +
    "                  (rule.selectorText.includes('cmp-banner') || \n" +
    "                   rule.selectorText.includes('modal')) && \n" +
    "                  rule.cssText.includes('width')) {\n" +
    "                affectingRules.push({\n" +
    "                  selector: rule.selectorText,\n" +
    "                  cssText: rule.cssText,\n" +
    "                  source: sheet.href || 'inline'\n" +
    "                });\n" +
    "              }\n" +
    "            }\n" +
    "          } catch (e) {\n" +
    "            // Error al acceder a stylesheet, probablemente CORS\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        if (affectingRules.length > 0) {\n" +
    "          console.log(\"⚠️ Se encontraron reglas CSS que podrían afectar al ancho:\");\n" +
    "          affectingRules.forEach(function(rule, index) {\n" +
    "            console.log(\"[\" + (index + 1) + \"] Selector: \" + rule.selector);\n" +
    "            console.log(\"    CSS: \" + rule.cssText);\n" +
    "            console.log(\"    Fuente: \" + rule.source);\n" +
    "          });\n" +
    "        } else {\n" +
    "          console.log(\"✅ No se encontraron reglas CSS conflictivas\");\n" +
    "        }\n" +
    "      } catch (e) {\n" +
    "        console.log(\"❌ Error al buscar reglas CSS:\", e);\n" +
    "      }\n" +
    "      \n" +
    "      console.log(\"=== FIN DE DEPURACIÓN ===\");\n" +
    "    }\n" +
    "  ";
}

// Función para arreglar el botón de preferencias
function generatePreferenceButtonFixCode() {
  return "    /**\n" +
    "     * Asegura que los botones de preferencias dentro del banner están correctamente posicionados\n" +
    "     * Esta función debe llamarse cuando el banner ya está en el DOM\n" +
    "     */\n" +
    "    window.CMP.fixPreferenceButton = function() {\n" +
    "      console.log('[CMP] Corrigiendo posición del botón de preferencias...');\n" +
    "      \n" +
    "      // Ocultar valores de depuración que puedan mostrarse en px\n" +
    "      try {\n" +
    "        var hideDebugStyle = document.getElementById('cmp-hide-debug-values');\n" +
    "        if (!hideDebugStyle) {\n" +
    "          var styleEl = document.createElement('style');\n" +
    "          styleEl.id = 'cmp-hide-debug-values';\n" +
    "          styleEl.textContent = `\n" +
    "            /* Ocultar valores numéricos de depuración */\n" +
    "            #cmp-banner *:before, #cmp-banner *:after,\n" +
    "            .cmp-banner *:before, .cmp-banner *:after,\n" +
    "            button:before, button:after,\n" +
    "            .cmp-button:before, .cmp-button:after,\n" +
    "            [data-cmp-action]:before, [data-cmp-action]:after,\n" +
    "            [role=\"button\"]:before, [role=\"button\"]:after {\n" +
    "              content: '' !important;\n" +
    "              display: none !important;\n" +
    "              visibility: hidden !important;\n" +
    "              opacity: 0 !important;\n" +
    "            }\n" +
    "          `;\n" +
    "          document.head.appendChild(styleEl);\n" +
    "          console.log('[CMP] Estilos para ocultar valores de depuración aplicados');\n" +
    "        }\n" +
    "      } catch (e) {\n" +
    "        console.error('[CMP] Error al aplicar estilos para ocultar valores de depuración:', e);\n" +
    "      }\n" +
    "      \n" +
    "      // Función para encontrar un botón de preferencias en el DOM\n" +
    "      function findPreferenceButton() {\n" +
    "        // 1. Buscar por atributo de acción\n" +
    "        var prefsButton = document.querySelector('[data-cmp-action=\"show_preferences\"], [data-action=\"show_preferences\"]');\n" +
    "        if (prefsButton) {\n" +
    "          console.log('[CMP] Botón de preferencias encontrado por atributo de acción');\n" +
    "          return prefsButton;\n" +
    "        }\n" +
    "        \n" +
    "        // 2. Buscar por texto del botón (diferentes variantes comunes)\n" +
    "        var buttonTexts = ['Preferences', 'Settings', 'Preferencias', 'Configuración', 'Cookie Settings', 'More Options'];\n" +
    "        var buttons = document.querySelectorAll('button, .button, [role=\"button\"], a.preferences, .cmp-preferences-button');\n" +
    "        \n" +
    "        for (var i = 0; i < buttons.length; i++) {\n" +
    "          var buttonText = buttons[i].textContent || buttons[i].innerText || '';\n" +
    "          buttonText = buttonText.trim().toLowerCase();\n" +
    "          \n" +
    "          for (var j = 0; j < buttonTexts.length; j++) {\n" +
    "            if (buttonText.includes(buttonTexts[j].toLowerCase())) {\n" +
    "              console.log('[CMP] Botón de preferencias encontrado por texto: ' + buttonText);\n" +
    "              return buttons[i];\n" +
    "            }\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // 3. Buscar por clases CSS específicas\n" +
    "        var buttonSelectors = [\n" +
    "          '.cmp-button-preferences',\n" +
    "          '.cmp-preferences',\n" +
    "          '.preferences-button',\n" +
    "          '.settings-button',\n" +
    "          '.cmp-settings',\n" +
    "          '.cookie-settings',\n" +
    "          '[id*=\"preferences\"]',\n" +
    "          '[id*=\"settings\"]',\n" +
    "          '[class*=\"preferences\"]',\n" +
    "          '[class*=\"settings\"]'\n" +
    "        ];\n" +
    "        \n" +
    "        for (var k = 0; k < buttonSelectors.length; k++) {\n" +
    "          var element = document.querySelector(buttonSelectors[k]);\n" +
    "          if (element) {\n" +
    "            console.log('[CMP] Botón de preferencias encontrado por selector: ' + buttonSelectors[k]);\n" +
    "            return element;\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Si no se encuentra un botón específico, retornar null\n" +
    "        console.log('[CMP] No se encontró un botón de preferencias en el banner');\n" +
    "        return null;\n" +
    "      }\n" +
    "      \n" +
    "      // Buscar el banner y el botón\n" +
    "      var bannerEl = document.getElementById('cmp-banner');\n" +
    "      var preferenceButton = findPreferenceButton();\n" +
    "      \n" +
    "      if (!bannerEl) {\n" +
    "        console.error('[CMP] No se encontró el banner para corregir el botón de preferencias');\n" +
    "        return false;\n" +
    "      }\n" +
    "      \n" +
    "      if (!preferenceButton) {\n" +
    "        console.log('[CMP] No se encontró un botón de preferencias, nada que corregir');\n" +
    "        return false;\n" +
    "      }\n" +
    "      \n" +
    "      // Verificar si el botón está centrado (tiene transform)\n" +
    "      var computedStyle = window.getComputedStyle(preferenceButton);\n" +
    "      var transform = computedStyle.transform || computedStyle.webkitTransform || computedStyle.mozTransform;\n" +
    "      var position = computedStyle.position;\n" +
    "      var left = computedStyle.left;\n" +
    "      \n" +
    "      console.log('[CMP] Estilos actuales del botón:', {\n" +
    "        position: position,\n" +
    "        left: left,\n" +
    "        transform: transform,\n" +
    "        display: computedStyle.display,\n" +
    "        margin: computedStyle.margin\n" +
    "      });\n" +
    "      \n" +
    "      // Verificar si tiene transform: translateX(-50%)\n" +
    "      var needsTransform = left === '50%' && transform === 'none';\n" +
    "      \n" +
    "      if (needsTransform) {\n" +
    "        console.log('[CMP] Corrigiendo posición del botón centrado que perdió su transform');\n" +
    "        \n" +
    "        // Añadir transform manualmente\n" +
    "        preferenceButton.style.setProperty('transform', 'translateX(-50%)', 'important');\n" +
    "        console.log('[CMP] Transform aplicado: translateX(-50%)');\n" +
    "        \n" +
    "        return true;\n" +
    "      }\n" +
    "      \n" +
    "      // No se detectaron problemas específicos\n" +
    "      console.log('[CMP] No se detectaron problemas específicos con el botón de preferencias');\n" +
    "      return false;\n" +
    "    };\n";
}

// Inyecta el código de depuración en el script principal
function injectDebugCodeIntoScript(consentScript) {
  const debugCode = generateDebugOverlayCode();
  const modalDebugCode = generateModalDebugCode();
  const preferenceButtonFixCode = generatePreferenceButtonFixCode();
  
  // Verificar si el script ya tiene la función de depuración
  if (consentScript.includes('window.CMP.showDebugOverlay')) {
    // Ya existe, reemplazar con la nueva versión
    const pattern = /window\.CMP\.showDebugOverlay\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/;
    consentScript = consentScript.replace(pattern, debugCode);
  } else {
    // No existe, añadirla al final
    consentScript += '\n\n' + debugCode;
  }
  
  // Añadir también la función de depuración para modales
  if (!consentScript.includes('function debugBannerSize()')) {
    consentScript += '\n\n' + modalDebugCode;
  }
  
  // Añadir código para arreglar el botón de preferencias
  if (!consentScript.includes('window.CMP.fixPreferenceButton')) {
    consentScript += '\n\n' + preferenceButtonFixCode;
    
    // Añadir llamada a la función durante la inicialización
    const initIndex = consentScript.indexOf('window.CMP.init = function()');
    if (initIndex !== -1) {
      const initStartBrace = consentScript.indexOf('{', initIndex) + 1;
      const insertCode = '\n    // Corregir la posición del botón de preferencias después de mostrar el banner\n' +
                         '    setTimeout(function() {\n' +
                         '      if (typeof window.CMP.fixPreferenceButton === "function") {\n' +
                         '        window.CMP.fixPreferenceButton();\n' +
                         '      }\n' +
                         '    }, 150);\n';
      
      consentScript = consentScript.substring(0, initStartBrace) + insertCode + consentScript.substring(initStartBrace);
    }
  }
  
  return consentScript;
}

module.exports = {
  generateDebugOverlayCode,
  generateModalDebugCode,
  generatePreferenceButtonFixCode,
  injectDebugCodeIntoScript
};