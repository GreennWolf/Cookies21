/**
 * Módulo para garantizar el posicionamiento responsive de banners
 * Este módulo proporciona funciones que se inyectan en el script generado
 * para asegurar que los banners se adapten correctamente a diferentes tamaños de pantalla.
 * 
 * Incluye manejo para garantizar que el posicionamiento responsive se mantenga
 * después de guardar el consentimiento y recargar la página.
 */

// Función para generar el código JavaScript que maneja el posicionamiento responsive
function generateResponsivePositionHandlerCode() {
  return "    /**\n" +
    "     * Garantiza que el banner se adapte correctamente a diferentes tamaños de pantalla\n" +
    "     * Ajusta automáticamente el ancho y la posición según el viewport del dispositivo\n" +
    "     */\n" +
    "    window.CMP.ensureResponsivePosition = function(forceRefresh) {\n" +
    "      console.log('[CMP] Aplicando posicionamiento responsive...');\n" +
    "      \n" +
    "      // Configurar un mecanismo para asegurar que el posicionamiento se mantiene después de guardar\n" +
    "      if (!window.CMP._responsivePositionInitialized) {\n" +
    "        // Verificar periódicamente si hay cambios en el DOM que puedan afectar la responsividad\n" +
    "        setInterval(function() {\n" +
    "          var banner = document.getElementById('cmp-banner');\n" +
    "          if (banner && banner.style.display !== 'none') {\n" +
    "            console.log('[CMP] Verificación periódica de posicionamiento responsive');\n" +
    "            window.CMP.ensureResponsivePosition(true);\n" +
    "          }\n" +
    "        }, 3000); // Verificar cada 3 segundos\n" +
    "        \n" +
    "        // Marcar como inicializado\n" +
    "        window.CMP._responsivePositionInitialized = true;\n" +
    "      }\n" +
    "      \n" +
    "      // Verificar si se necesita un arreglo especial para posiciones alineadas a la derecha\n" +
    "      if (forceRefresh) {\n" +
    "        // Verificar si hay un wrapper de banner con posicionamiento a la derecha\n" +
    "        var rightAlignedWrapper = document.querySelector('#cmp-floating-wrapper.cmp-wrapper-bottom-right, #cmp-floating-wrapper.cmp-wrapper-top-right');\n" +
    "        if (rightAlignedWrapper) {\n" +
    "          console.log('[CMP] Detectado wrapper con alineación a la derecha, aplicando corrección especial');\n" +
    "          // Garantizar que no haya transformaciones que afecten el cálculo del centro\n" +
    "          rightAlignedWrapper.style.setProperty('transform', 'none', 'important');\n" +
    "          // Forzar un reflow para aplicar inmediatamente\n" +
    "          void rightAlignedWrapper.offsetWidth;\n" +
    "        }\n" +
    "      }\n" +
    "      \n" +
    "      // Función para encontrar el banner usando múltiples estrategias\n" +
    "      function findBanner() {\n" +
    "        // Método 1: Buscar por ID específico\n" +
    "        var banner = document.getElementById('cmp-banner');\n" +
    "        if (banner) return banner;\n" +
    "        \n" +
    "        // Método 2: Buscar por clases específicas\n" +
    "        var bannerSelectors = [\n" +
    "          '.cmp-banner--floating',\n" +
    "          '.cmp-banner--modal',\n" +
    "          '.cmp-banner--banner',\n" +
    "          '.cmp-banner'\n" +
    "        ];\n" +
    "        \n" +
    "        for (var i = 0; i < bannerSelectors.length; i++) {\n" +
    "          var foundBanner = document.querySelector(bannerSelectors[i]);\n" +
    "          if (foundBanner) return foundBanner;\n" +
    "        }\n" +
    "        \n" +
    "        // Método 3: Buscar en contenedores conocidos\n" +
    "        var knownContainers = [\n" +
    "          'cmp-modal-container',\n" +
    "          'cmp-floating-wrapper',\n" +
    "          'cmp-banner-container'\n" +
    "        ];\n" +
    "        \n" +
    "        for (var j = 0; j < knownContainers.length; j++) {\n" +
    "          var container = document.getElementById(knownContainers[j]);\n" +
    "          if (container && container.firstElementChild) {\n" +
    "            return container.firstElementChild;\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        return null;\n" +
    "      }\n" +
    "      \n" +
    "      // Obtener el banner\n" +
    "      var banner = findBanner();\n" +
    "      if (!banner) {\n" +
    "        console.error('[CMP] No se pudo encontrar el banner para aplicar posicionamiento responsive');\n" +
    "        return false;\n" +
    "      }\n" +
    "      \n" +
    "      // Determinar el tipo de banner\n" +
    "      var isModal = banner.classList.contains('cmp-banner--modal');\n" +
    "      var isFloating = banner.classList.contains('cmp-banner--floating');\n" +
    "      var isStandard = !isModal && !isFloating;\n" +
    "      \n" +
    "      // Obtener dimensiones del viewport\n" +
    "      var viewportWidth = window.innerWidth || document.documentElement.clientWidth;\n" +
    "      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;\n" +
    "      \n" +
    "      console.log('[CMP] Viewport detectado:', viewportWidth, 'x', viewportHeight);\n" +
    "      console.log('[CMP] Tipo de banner:', isModal ? 'modal' : (isFloating ? 'flotante' : 'estándar'));\n" +
    "      \n" +
    "      // Función para aplicar estilos basados en el tamaño de la pantalla\n" +
    "      function applyResponsiveStyles() {\n" +
    "        // Determinar si estamos en móvil, tablet o escritorio\n" +
    "        var isMobile = viewportWidth < 768;\n" +
    "        var isTablet = viewportWidth >= 768 && viewportWidth < 1024;\n" +
    "        var isDesktop = viewportWidth >= 1024;\n" +
    "        \n" +
    "        // Limpiar clases responsive anteriores\n" +
    "        banner.classList.remove('cmp-device-mobile', 'cmp-device-tablet', 'cmp-device-desktop');\n" +
    "        \n" +
    "        // Añadir clase específica para el dispositivo\n" +
    "        if (isMobile) {\n" +
    "          banner.classList.add('cmp-device-mobile');\n" +
    "        } else if (isTablet) {\n" +
    "          banner.classList.add('cmp-device-tablet');\n" +
    "        } else {\n" +
    "          banner.classList.add('cmp-device-desktop');\n" +
    "        }\n" +
    "        \n" +
    "        // Obtener el elemento contenedor (podría ser un wrapper o el banner mismo)\n" +
    "        var container = banner;\n" +
    "        var wrapper = null;\n" +
    "        \n" +
    "        // Si el banner está dentro de un wrapper, trabajar con el wrapper\n" +
    "        if (banner.parentNode && (banner.parentNode.id === 'cmp-floating-wrapper' || banner.parentNode.id === 'cmp-modal-container')) {\n" +
    "          wrapper = banner.parentNode;\n" +
    "        }\n" +
    "        \n" +
    "        // Aplicar estilos específicos según el tipo de banner y dispositivo\n" +
    "        if (isModal) {\n" +
    "          // Para banners modales:\n" +
    "          if (isMobile) {\n" +
    "            // En móvil, el modal debe ocupar casi toda la pantalla\n" +
    "            banner.style.setProperty('width', '95%', 'important');\n" +
    "            banner.style.setProperty('max-width', '100%', 'important');\n" +
    "            banner.style.setProperty('max-height', '80vh', 'important');\n" +
    "            banner.style.setProperty('overflow-y', 'auto', 'important');\n" +
    "          } else if (isTablet) {\n" +
    "            // En tablet, un poco más pequeño\n" +
    "            banner.style.setProperty('width', '80%', 'important');\n" +
    "            banner.style.setProperty('max-width', '600px', 'important');\n" +
    "          } else {\n" +
    "            // En escritorio, tamaño estándar\n" +
    "            var specifiedWidth = banner.getAttribute('data-width') || '60%';\n" +
    "            var widthPercent = parseInt(specifiedWidth);\n" +
    "            if (isNaN(widthPercent) || widthPercent < 40) widthPercent = 60;\n" +
    "            if (widthPercent > 90) widthPercent = 90;\n" +
    "            \n" +
    "            banner.style.setProperty('width', widthPercent + '%', 'important');\n" +
    "            banner.style.setProperty('max-width', '800px', 'important');\n" +
    "          }\n" +
    "          \n" +
    "          // Si hay un contenedor modal, aplicar estilos de centrado\n" +
    "          if (wrapper) {\n" +
    "            wrapper.style.setProperty('display', 'flex', 'important');\n" +
    "            wrapper.style.setProperty('align-items', 'center', 'important');\n" +
    "            wrapper.style.setProperty('justify-content', 'center', 'important');\n" +
    "            \n" +
    "            // En móvil, ajustar el padding para dejar más espacio\n" +
    "            if (isMobile) {\n" +
    "              wrapper.style.setProperty('padding', '10px', 'important');\n" +
    "            }\n" +
    "          }\n" +
    "        } else if (isFloating) {\n" +
    "          // Para banners flotantes:\n" +
    "          // Obtener la posición configurada\n" +
    "          var position = banner.getAttribute('data-floating-corner') ||\n" +
    "                        banner.getAttribute('data-position') ||\n" +
    "                        banner.getAttribute('floatingCorner') ||\n" +
    "                        'bottom-right';\n" +
    "          \n" +
    "          // Obtener el margen configurado\n" +
    "          var margin = parseInt(banner.getAttribute('data-floating-margin') ||\n" +
    "                             banner.getAttribute('floatingMargin') || '20');\n" +
    "          \n" +
    "          // Validar margen\n" +
    "          if (isNaN(margin) || margin < 0) margin = 20;\n" +
    "          \n" +
    "          // Ajustar margen según el dispositivo\n" +
    "          if (isMobile) {\n" +
    "            // En móvil, reducir el margen y aumentar el ancho\n" +
    "            margin = Math.min(margin, 10); // Máximo 10px de margen en móviles\n" +
    "            banner.style.setProperty('width', '95%', 'important');\n" +
    "            \n" +
    "            // En móvil, forzar posicionamiento inferior para mejor UX\n" +
    "            if (position.includes('top')) {\n" +
    "              position = position.replace('top', 'bottom');\n" +
    "              console.log('[CMP] Ajustando posición para móvil:', position);\n" +
    "            }\n" +
    "          } else if (isTablet) {\n" +
    "            // En tablet, ajustar ancho a la mitad de la pantalla\n" +
    "            banner.style.setProperty('width', '50%', 'important');\n" +
    "          } else {\n" +
    "            // En escritorio, mantener el ancho configurado o usar 40%\n" +
    "            var specifiedWidth = banner.getAttribute('data-width') || '40%';\n" +
    "            var widthPercent = parseInt(specifiedWidth);\n" +
    "            if (isNaN(widthPercent) || widthPercent < 30) widthPercent = 40;\n" +
    "            if (widthPercent > 70) widthPercent = 70;\n" +
    "            \n" +
    "            banner.style.setProperty('width', widthPercent + '%', 'important');\n" +
    "          }\n" +
    "          \n" +
    "          // Aplicar los cambios al wrapper si existe, o directamente al banner\n" +
    "          var targetElement = wrapper || banner;\n" +
    "          \n" +
    "          // Limpiar todas las posiciones primero\n" +
    "          targetElement.style.removeProperty('top');\n" +
    "          targetElement.style.removeProperty('right');\n" +
    "          targetElement.style.removeProperty('bottom');\n" +
    "          targetElement.style.removeProperty('left');\n" +
    "          \n" +
    "          // Aplicar nueva posición - con manejo especial para posiciones alineadas a la derecha\n" +
    "          if (position === 'top-left') {\n" +
    "            targetElement.style.setProperty('top', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('left', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('right', 'auto', 'important');\n" +
    "            targetElement.style.setProperty('transform', '', 'important'); // Permitir transformaciones\n" +
    "          } else if (position === 'top-right') {\n" +
    "            // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "            targetElement.style.setProperty('transform', 'none', 'important');\n" +
    "            targetElement.style.setProperty('top', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('right', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('left', 'auto', 'important');\n" +
    "            // Forzar un reflow para garantizar que los cambios se apliquen de inmediato\n" +
    "            void targetElement.offsetHeight;\n" +
    "          } else if (position === 'bottom-left') {\n" +
    "            targetElement.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('left', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('right', 'auto', 'important');\n" +
    "            targetElement.style.setProperty('transform', '', 'important'); // Permitir transformaciones\n" +
    "          } else { // bottom-right por defecto\n" +
    "            // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "            targetElement.style.setProperty('transform', 'none', 'important');\n" +
    "            targetElement.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('right', margin + 'px', 'important');\n" +
    "            targetElement.style.setProperty('left', 'auto', 'important');\n" +
    "            // Forzar un reflow para garantizar que los cambios se apliquen de inmediato\n" +
    "            void targetElement.offsetHeight;\n" +
    "          }\n" +
    "          \n" +
    "          // Asegurar que sea posición fixed\n" +
    "          targetElement.style.setProperty('position', 'fixed', 'important');\n" +
    "          \n" +
    "          // Actualizar atributos para mantener coherencia\n" +
    "          banner.setAttribute('data-floating-corner', position);\n" +
    "          banner.setAttribute('data-position', position);\n" +
    "          banner.setAttribute('floatingCorner', position);\n" +
    "          banner.setAttribute('data-floating-margin', margin);\n" +
    "          banner.setAttribute('floatingMargin', margin);\n" +
    "        } else {\n" +
    "          // Para banners estándar (no modal, no flotante):\n" +
    "          // Siempre ocupan el 100% del ancho disponible\n" +
    "          banner.style.setProperty('width', '100%', 'important');\n" +
    "          banner.style.setProperty('max-width', '100%', 'important');\n" +
    "          \n" +
    "          // En móvil ajustar la altura para no ocupar demasiado espacio\n" +
    "          if (isMobile) {\n" +
    "            banner.style.setProperty('padding', '10px', 'important');\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Aplicar z-index adecuado (para asegurar que está por encima de otros elementos)\n" +
    "        if (wrapper) {\n" +
    "          wrapper.style.setProperty('z-index', '2147483646', 'important');\n" +
    "        }\n" +
    "        banner.style.setProperty('z-index', '2147483647', 'important');\n" +
    "        \n" +
    "        // Añadir CSS con media queries para mejor control responsive\n" +
    "        injectResponsiveCSS();\n" +
    "      }\n" +
    "      \n" +
    "      // Función para inyectar CSS responsive adicional\n" +
    "      function injectResponsiveCSS() {\n" +
    "        var styleId = 'cmp-responsive-styles';\n" +
    "        \n" +
    "        // Eliminar estilos anteriores si existen\n" +
    "        var oldStyle = document.getElementById(styleId);\n" +
    "        if (oldStyle && oldStyle.parentNode) {\n" +
    "          oldStyle.parentNode.removeChild(oldStyle);\n" +
    "        }\n" +
    "        \n" +
    "        // Crear elemento style\n" +
    "        var styleEl = document.createElement('style');\n" +
    "        styleEl.id = styleId;\n" +
    "        \n" +
    "        // CSS con media queries\n" +
    "        styleEl.innerHTML = `\n" +
    "          /* Estilos responsive para CMP */\n" +
    "          #cmp-banner, .cmp-banner {\n" +
    "            box-sizing: border-box !important;\n" +
    "          }\n" +
    "          \n" +
    "          /* Estilos para móvil */\n" +
    "          @media (max-width: 767px) {\n" +
    "            #cmp-banner.cmp-device-mobile, .cmp-banner.cmp-device-mobile {\n" +
    "              width: 95% !important;\n" +
    "              font-size: 14px !important;\n" +
    "            }\n" +
    "            \n" +
    "            #cmp-banner.cmp-device-mobile.cmp-banner--modal, .cmp-banner.cmp-device-mobile.cmp-banner--modal {\n" +
    "              max-height: 80vh !important;\n" +
    "              overflow-y: auto !important;\n" +
    "            }\n" +
    "            \n" +
    "            #cmp-banner.cmp-device-mobile button, .cmp-banner.cmp-device-mobile button {\n" +
    "              margin: 5px !important;\n" +
    "              padding: 8px 12px !important;\n" +
    "              font-size: 14px !important;\n" +
    "            }\n" +
    "          }\n" +
    "          \n" +
    "          /* Estilos para tablet */\n" +
    "          @media (min-width: 768px) and (max-width: 1023px) {\n" +
    "            #cmp-banner.cmp-device-tablet.cmp-banner--floating, .cmp-banner.cmp-device-tablet.cmp-banner--floating {\n" +
    "              width: 50% !important;\n" +
    "            }\n" +
    "            \n" +
    "            #cmp-banner.cmp-device-tablet.cmp-banner--modal, .cmp-banner.cmp-device-tablet.cmp-banner--modal {\n" +
    "              width: 80% !important;\n" +
    "              max-width: 600px !important;\n" +
    "            }\n" +
    "          }\n" +
    "          \n" +
    "          /* Estilos para escritorio */\n" +
    "          @media (min-width: 1024px) {\n" +
    "            #cmp-banner.cmp-device-desktop.cmp-banner--floating, .cmp-banner.cmp-device-desktop.cmp-banner--floating {\n" +
    "              max-width: 400px !important;\n" +
    "            }\n" +
    "          }\n" +
    "        `;\n" +
    "        \n" +
    "        // Añadir al head del documento\n" +
    "        document.head.appendChild(styleEl);\n" +
    "      }\n" +
    "      \n" +
    "      // Aplicar estilos responsive\n" +
    "      applyResponsiveStyles();\n" +
    "      \n" +
    "      // Configurar evento de resize para actualizar cuando cambie el tamaño\n" +
    "      if (typeof window.CMP._responsiveHandlerAttached === 'undefined') {\n" +
    "        window.addEventListener('resize', function() {\n" +
    "          // Utilizar debounce para no ejecutar demasiadas veces durante resize\n" +
    "          if (window.CMP._responsiveTimeout) {\n" +
    "            clearTimeout(window.CMP._responsiveTimeout);\n" +
    "          }\n" +
    "          \n" +
    "          window.CMP._responsiveTimeout = setTimeout(function() {\n" +
    "            window.CMP.ensureResponsivePosition();\n" +
    "          }, 200);\n" +
    "        });\n" +
    "        \n" +
    "        // Marcar que ya se ha configurado el handler\n" +
    "        window.CMP._responsiveHandlerAttached = true;\n" +
    "      }\n" +
    "      \n" +
    "      // Orientación en dispositivos móviles\n" +
    "      if (typeof window.CMP._orientationHandlerAttached === 'undefined' && \n" +
    "          typeof window.orientation !== 'undefined') {\n" +
    "        window.addEventListener('orientationchange', function() {\n" +
    "          setTimeout(function() {\n" +
    "            window.CMP.ensureResponsivePosition(true);\n" +
    "          }, 300);\n" +
    "        });\n" +
    "        \n" +
    "        // Marcar que ya se ha configurado el handler\n" +
    "        window.CMP._orientationHandlerAttached = true;\n" +
    "      }\n" +
    "      \n" +
    "      // Manejar también la visibilidad de la página (por si el usuario vuelve después de un tiempo)\n" +
    "      if (typeof window.CMP._visibilityHandlerAttached === 'undefined') {\n" +
    "        document.addEventListener('visibilitychange', function() {\n" +
    "          if (document.visibilityState === 'visible') {\n" +
    "            setTimeout(function() {\n" +
    "              console.log('[CMP] Restaurando posicionamiento responsive después de cambio de visibilidad');\n" +
    "              window.CMP.ensureResponsivePosition(true);\n" +
    "            }, 300);\n" +
    "          }\n" +
    "        });\n" +
    "        \n" +
    "        // Marcar que ya se ha configurado el handler\n" +
    "        window.CMP._visibilityHandlerAttached = true;\n" +
    "      }\n" +
    "      \n" +
    "      // Observar cambios en el DOM que puedan afectar al banner\n" +
    "      if (typeof window.CMP._responsiveObserverAttached === 'undefined' && typeof MutationObserver !== 'undefined') {\n" +
    "        // Crear un observador de mutaciones para detectar cambios en el banner\n" +
    "        try {\n" +
    "          var observer = new MutationObserver(function(mutations) {\n" +
    "            // Verificar si alguna mutación afecta al banner o a sus contenedores\n" +
    "            var shouldUpdate = false;\n" +
    "            \n" +
    "            for (var i = 0; i < mutations.length; i++) {\n" +
    "              var mutation = mutations[i];\n" +
    "              if (mutation.type === 'attributes' || \n" +
    "                  (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {\n" +
    "                shouldUpdate = true;\n" +
    "                break;\n" +
    "              }\n" +
    "            }\n" +
    "            \n" +
    "            if (shouldUpdate) {\n" +
    "              console.log('[CMP] Cambios en el DOM detectados, restaurando posicionamiento responsive');\n" +
    "              window.CMP.ensureResponsivePosition(true);\n" +
    "            }\n" +
    "          });\n" +
    "          \n" +
    "          // Configurar observador para monitorear todo el body para detectar cambios en el banner\n" +
    "          observer.observe(document.body, { \n" +
    "            attributes: true, \n" +
    "            childList: true, \n" +
    "            subtree: true,\n" +
    "            attributeFilter: ['style', 'class'] \n" +
    "          });\n" +
    "          \n" +
    "          // Almacenar referencia al observador\n" +
    "          window.CMP._responsiveObserver = observer;\n" +
    "          \n" +
    "          // Marcar que ya se ha configurado el observer\n" +
    "          window.CMP._responsiveObserverAttached = true;\n" +
    "          \n" +
    "          // Mantener activo por más tiempo para garantizar estabilidad después de guardar\n" +
    "          // Solo se desconectará si detecta que el banner ya no está en el DOM\n" +
    "          var checkInterval = setInterval(function() {\n" +
    "            var banner = document.getElementById('cmp-banner');\n" +
    "            if (!banner && window.CMP._responsiveObserver) {\n" +
    "              window.CMP._responsiveObserver.disconnect();\n" +
    "              delete window.CMP._responsiveObserver;\n" +
    "              console.log('[CMP] MutationObserver para posicionamiento responsive desconectado');\n" +
    "              clearInterval(checkInterval);\n" +
    "            }\n" +
    "          }, 5000);\n" +
    "        } catch (e) {\n" +
    "          console.error('[CMP] Error al configurar MutationObserver:', e);\n" +
    "        }\n" +
    "      }\n" +
    "      \n" +
    "      console.log('[CMP] Posicionamiento responsive aplicado correctamente');\n" +
    "      return true;\n" +
    "    };\n";
}

// Función para inyectar el código en el script principal
function injectResponsivePositionHandlerIntoScript(consentScript) {
  const handlerCode = generateResponsivePositionHandlerCode();
  
  // Buscar si ya existe una implementación de la función
  if (consentScript.includes('window.CMP.ensureResponsivePosition')) {
    console.log('Reemplazando implementación existente de ensureResponsivePosition');
    
    // Patrón para encontrar la implementación existente
    const existingPattern = /window\.CMP\.ensureResponsivePosition\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/;
    
    // Reemplazar la implementación existente con la nueva
    return consentScript.replace(existingPattern, handlerCode);
  } else {
    console.log('Añadiendo nueva implementación de ensureResponsivePosition');
    
    // Buscar un buen punto para insertar el código
    const initPoint = consentScript.indexOf('window.CMP.init = function()');
    
    if (initPoint !== -1) {
      // Insertar antes de la función init
      return consentScript.substring(0, initPoint) + handlerCode + '\n\n' + consentScript.substring(initPoint);
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
        
        return consentScript.substring(0, endPoint + 1) + '\n\n' + handlerCode + consentScript.substring(endPoint + 1);
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
        
        return consentScript.substring(0, endPoint + 1) + '\n\n' + handlerCode + consentScript.substring(endPoint + 1);
      } else {
        // Insertar al final del espacio de nombres CMP
        return consentScript + '\n\n' + handlerCode;
      }
    }
  }
}

module.exports = {
  generateResponsivePositionHandlerCode,
  injectResponsivePositionHandlerIntoScript
};