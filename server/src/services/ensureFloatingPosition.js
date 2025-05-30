/**
 * Módulo para garantizar el posicionamiento correcto de banners flotantes
 * Este módulo proporciona funciones que se inyectan en el script generado
 * para asegurar que los banners flotantes se posicionen correctamente.
 */

// Función para generar el código JavaScript que maneja el posicionamiento flotante
function generateFloatingPositionHandlerCode() {
  return "    /**\n" +
    "     * Enfoque de wrapper para posicionar correctamente banners flotantes\n" +
    "     * utilizando fixed positioning en un contenedor separado.\n" +
    "     */\n" +
    "    window.CMP.ensureFloatingPosition = function() {\n" +
    "      console.log('[CMP] Aplicando posicionamiento flotante con enfoque wrapper...');\n" +
    "      \n" +
    "      // Método mejorado para encontrar el banner usando múltiples estrategias\n" +
    "      function findBanner() {\n" +
    "        console.log('[CMP] Buscando el banner utilizando métodos múltiples...');\n" +
    "        \n" +
    "        // Método 1: Buscar por ID específico (método más directo)\n" +
    "        var banner = document.getElementById('cmp-banner');\n" +
    "        if (banner) {\n" +
    "          console.log('[CMP] Banner encontrado por ID: cmp-banner');\n" +
    "          return banner;\n" +
    "        }\n" +
    "        \n" +
    "        // Método 2: Buscar por ID de contenedor específico en configuración\n" +
    "        var containerId = window.CMP && window.CMP.config && window.CMP.config.bannerId \n" +
    "                      ? window.CMP.config.bannerId + '-container' \n" +
    "                      : null;\n" +
    "        \n" +
    "        if (containerId) {\n" +
    "          var specificContainer = document.getElementById(containerId);\n" +
    "          if (specificContainer) {\n" +
    "            var foundInSpecific = specificContainer.querySelector('#cmp-banner') || specificContainer.firstElementChild;\n" +
    "            if (foundInSpecific) {\n" +
    "              console.log('[CMP] Banner encontrado en contenedor específico: ' + containerId);\n" +
    "              return foundInSpecific;\n" +
    "            }\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Método 3: Buscar en cualquier contenedor que termine en -container\n" +
    "        var containers = document.querySelectorAll('[id$=\"-container\"]');\n" +
    "        for (var i = 0; i < containers.length; i++) {\n" +
    "          var found = containers[i].querySelector('#cmp-banner') || containers[i].firstElementChild;\n" +
    "          if (found) {\n" +
    "            console.log('[CMP] Banner encontrado en contenedor genérico: ' + containers[i].id);\n" +
    "            return found;\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Método 4: Buscar todos los tipos de banners por clases\n" +
    "        var bannerSelectors = [\n" +
    "          '.cmp-banner--floating',  // Banner flotante\n" +
    "          '.cmp-banner--modal',     // Banner modal\n" +
    "          '.cmp-banner--banner',    // Banner estándar\n" +
    "          '.cmp-banner'             // Cualquier banner con clase base\n" +
    "        ];\n" +
    "        \n" +
    "        for (var j = 0; j < bannerSelectors.length; j++) {\n" +
    "          var typedBanner = document.querySelector(bannerSelectors[j]);\n" +
    "          if (typedBanner) {\n" +
    "            console.log('[CMP] Banner encontrado por clase: ' + bannerSelectors[j]);\n" +
    "            return typedBanner;\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Método 5: Buscar elementos con atributos de posicionamiento\n" +
    "        var positionAttributes = [\n" +
    "          '[data-floating-corner]',\n" +
    "          '[data-position=\"bottom-right\"]', \n" +
    "          '[data-position=\"top-right\"]', \n" +
    "          '[data-position=\"bottom-left\"]', \n" +
    "          '[data-position=\"top-left\"]',\n" +
    "          '[floatingCorner]'\n" +
    "        ];\n" +
    "        \n" +
    "        for (var k = 0; k < positionAttributes.length; k++) {\n" +
    "          var elementsWithPosition = document.querySelectorAll(positionAttributes[k]);\n" +
    "          if (elementsWithPosition.length > 0) {\n" +
    "            console.log('[CMP] Banner encontrado por atributo: ' + positionAttributes[k]);\n" +
    "            return elementsWithPosition[0];\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Método 6: Buscar en contenedores conocidos\n" +
    "        var knownContainers = [\n" +
    "          'cmp-modal-container',\n" +
    "          'cmp-floating-container',\n" +
    "          'cmp-banner-container'\n" +
    "        ];\n" +
    "        \n" +
    "        for (var l = 0; l < knownContainers.length; l++) {\n" +
    "          var containerEl = document.getElementById(knownContainers[l]);\n" +
    "          if (containerEl && containerEl.firstElementChild) {\n" +
    "            console.log('[CMP] Banner encontrado en contenedor conocido: ' + knownContainers[l]);\n" +
    "            return containerEl.firstElementChild;\n" +
    "          }\n" +
    "        }\n" +
    "        \n" +
    "        // Método 7: Último recurso - buscar elementos con estructura o estilo que sugiera un banner\n" +
    "        var possibleBanners = document.querySelectorAll('[role=\"dialog\"], [aria-labelledby=\"cmp-title\"], [aria-modal=\"true\"]');\n" +
    "        if (possibleBanners.length > 0) {\n" +
    "          console.log('[CMP] Posible banner encontrado por atributos de accesibilidad');\n" +
    "          return possibleBanners[0];\n" +
    "        }\n" +
    "        \n" +
    "        console.log('[CMP] No se pudo encontrar el banner por ningún método');\n" +
    "        return null;\n" +
    "      }\n" +
    "      \n" +
    "      var banner = findBanner();\n" +
    "      if (!banner) {\n" +
    "        console.error('[CMP] No se pudo encontrar el banner para aplicar posicionamiento flotante');\n" +
    "        return false;\n" +
    "      }\n" +
    "      \n" +
    "      // Verificar si ya existe un wrapper anterior para evitar anidamiento\n" +
    "      // Importante: revisar no solo por el parent directo sino más arriba en el DOM\n" +
    "      var existingWrapper = null;\n" +
    "      var parent = banner.parentNode;\n" +
    "      \n" +
    "      // Buscar el wrapper hasta 5 niveles arriba en el DOM\n" +
    "      for (var i = 0; i < 5 && parent; i++) {\n" +
    "        if (parent.id === 'cmp-floating-wrapper') {\n" +
    "          existingWrapper = parent;\n" +
    "          break;\n" +
    "        }\n" +
    "        parent = parent.parentNode;\n" +
    "      }\n" +
    "      \n" +
    "      if (existingWrapper) {\n" +
    "        console.log('[CMP] El banner ya está dentro de un wrapper, actualizando posición...');\n" +
    "        \n" +
    "        // Actualizar posición y margen del wrapper existente\n" +
    "        var position = banner.getAttribute('data-floating-corner') || \n" +
    "                     banner.getAttribute('data-position') || \n" +
    "                     banner.getAttribute('floatingCorner') || \n" +
    "                     'bottom-right';\n" +
    "        var margin = parseInt(banner.getAttribute('data-floating-margin') || \n" +
    "                            banner.getAttribute('floatingMargin') || '20');\n" +
    "        \n" +
    "        // Validar que el margen sea un número válido\n" +
    "        if (isNaN(margin) || margin < 0) margin = 20;\n" +
    "        \n" +
    "        // Depuración adicional para comprobar valores detectados\n" +
    "        console.log('[CMP] Valores detectados en el banner existente - Posición:', position, 'Margen:', margin + 'px');\n" +
    "        \n" +
    "        // Limpiar todas las clases de posicionamiento\n" +
    "        ['cmp-position-top-left', 'cmp-position-top-right', \n" +
    "         'cmp-position-bottom-left', 'cmp-position-bottom-right'].forEach(function(cls) {\n" +
    "           existingWrapper.classList.remove(cls);\n" +
    "        });\n" +
    "        \n" +
    "        // Eliminar todas las propiedades de posición anteriores\n" +
    "        existingWrapper.style.removeProperty('top');\n" +
    "        existingWrapper.style.removeProperty('right');\n" +
    "        existingWrapper.style.removeProperty('bottom');\n" +
    "        existingWrapper.style.removeProperty('left');\n" +
    "        \n" +
    "        // Asegurarse que values de CSS no interfieran con el posicionamiento\n" +
    "        existingWrapper.style.setProperty('top', 'auto', 'important');\n" +
    "        existingWrapper.style.setProperty('right', 'auto', 'important');\n" +
    "        existingWrapper.style.setProperty('bottom', 'auto', 'important');\n" +
    "        existingWrapper.style.setProperty('left', 'auto', 'important');\n" +
    "        \n" +
    "        // Aplicar nueva posición con setProperty !important para sobrescribir cualquier otro estilo\n" +
    "        if (position === 'top-left') {\n" +
    "          existingWrapper.style.setProperty('top', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('left', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('right', 'auto', 'important');\n" +
    "          existingWrapper.style.setProperty('bottom', 'auto', 'important');\n" +
    "        } \n" +
    "        else if (position === 'top-right') {\n" +
    "          // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "          existingWrapper.style.setProperty('transform', 'none', 'important');\n" +
    "          existingWrapper.style.setProperty('top', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('right', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('left', 'auto', 'important');\n" +
    "          existingWrapper.style.setProperty('bottom', 'auto', 'important');\n" +
    "          // Forzar un reflow para garantizar que los cambios se apliquen\n" +
    "          void existingWrapper.offsetHeight;\n" +
    "        }\n" +
    "        else if (position === 'bottom-left') {\n" +
    "          existingWrapper.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('left', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('right', 'auto', 'important');\n" +
    "          existingWrapper.style.setProperty('top', 'auto', 'important');\n" +
    "        }\n" +
    "        else { // bottom-right default\n" +
    "          // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "          existingWrapper.style.setProperty('transform', 'none', 'important');\n" +
    "          existingWrapper.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('right', margin + 'px', 'important');\n" +
    "          existingWrapper.style.setProperty('left', 'auto', 'important');\n" +
    "          existingWrapper.style.setProperty('top', 'auto', 'important');\n" +
    "          // Forzar un reflow para garantizar que los cambios se apliquen\n" +
    "          void existingWrapper.offsetHeight;\n" +
    "        }\n" +
    "        \n" +
    "        // Agregar clase de posición para posible targeteo por CSS\n" +
    "        existingWrapper.classList.add('cmp-position-' + position);\n" +
    "        existingWrapper.classList.add('cmp-margin-' + margin);\n" +
    "        \n" +
    "        console.log('[CMP] Wrapper actualizado a posición:', position, 'con margen:', margin + 'px');\n" +
    "        return true;\n" +
    "      }\n" +
    "      \n" +
    "      // Proceder con crear nuevo wrapper\n" +
    "      console.log('[CMP] Creando nuevo wrapper para el banner flotante...');\n" +
    "      \n" +
    "      // Obtener la posición y el margen del banner\n" +
    "      var position = banner.getAttribute('data-floating-corner') || \n" +
    "                   banner.getAttribute('data-position') || \n" +
    "                   'bottom-right';\n" +
    "      \n" +
    "      var margin = parseInt(banner.getAttribute('data-floating-margin') || '20');\n" +
    "      if (isNaN(margin) || margin < 0) margin = 20;\n" +
    "      \n" +
    "      console.log('[CMP] Configuración de posicionamiento - Posición:', position, 'Margen:', margin + 'px');\n" +
    "      \n" +
    "      // Create wrapper with absolute positioning (más luego se convierte a fixed)\n" +
    "      var wrapper = document.createElement('div');\n" +
    "      wrapper.id = 'cmp-floating-wrapper';\n" +
    "      \n" +
    "      // Primero establecemos atributos y luego aplicamos estilos para evitar conflictos\n" +
    "      wrapper.setAttribute('data-margin', margin);\n" +
    "      wrapper.setAttribute('data-position', position);\n" +
    "      wrapper.setAttribute('data-wrapper', 'true');\n" +
    "      wrapper.setAttribute('role', 'dialog');\n" +
    "      wrapper.setAttribute('aria-modal', 'true');\n" +
    "      \n" +
    "      // Añadir clases útiles para debug y CSS targeting\n" +
    "      wrapper.className = 'cmp-wrapper cmp-wrapper-' + position;\n" +
    "      \n" +
    "      // Ahora aplicar los estilos inline con !important\n" +
    "      // Estilos directos para el wrapper con máxima prioridad\n" +
    "      var wrapperStyles = [\n" +
    "        'position: fixed !important',\n" +
    "        'z-index: 2147483647 !important',\n" +
    "        'display: block !important',\n" +
    "        'visibility: visible !important',\n" +
    "        'opacity: 1 !important',\n" +
    "        'pointer-events: auto !important',\n" +
    "        'box-sizing: border-box !important',\n" +
    "        'overflow: visible !important',\n" +
    "        'transform: none !important',\n" +
    "        'max-width: none !important',\n" +
    "        'max-height: none !important',\n" +
    "        'transition: none !important',\n" +
    "        'animation: none !important'\n" +
    "      ];\n" +
    "      \n" +
    "      // Preposicionamiento según configuración - esto ayuda al renderizado inicial\n" +
    "      if (position === 'top-right' || position === 'bottom-right') {\n" +
    "        // Para posiciones a la derecha, forzar right y left=auto\n" +
    "        wrapperStyles.push('right: ' + margin + 'px !important');\n" +
    "        wrapperStyles.push('left: auto !important');\n" +
    "        \n" +
    "        if (position === 'top-right') {\n" +
    "          wrapperStyles.push('top: ' + margin + 'px !important');\n" +
    "          wrapperStyles.push('bottom: auto !important');\n" +
    "        } else {\n" +
    "          wrapperStyles.push('bottom: ' + margin + 'px !important');\n" +
    "          wrapperStyles.push('top: auto !important');\n" +
    "        }\n" +
    "      } else {\n" +
    "        // Para posiciones a la izquierda, forzar left y right=auto\n" +
    "        wrapperStyles.push('left: ' + margin + 'px !important');\n" +
    "        wrapperStyles.push('right: auto !important');\n" +
    "        \n" +
    "        if (position === 'top-left') {\n" +
    "          wrapperStyles.push('top: ' + margin + 'px !important');\n" +
    "          wrapperStyles.push('bottom: auto !important');\n" +
    "        } else {\n" +
    "          wrapperStyles.push('bottom: ' + margin + 'px !important');\n" +
    "          wrapperStyles.push('top: auto !important');\n" +
    "        }\n" +
    "      }\n" +
    "      \n" +
    "      // Aplicar el estilo base - esto establece todos los estilos en un solo paso\n" +
    "      wrapper.setAttribute('style', wrapperStyles.join(';'));\n" +
    "      \n" +
    "      // Las posiciones iniciales ya se aplicaron durante la creación del estilo del wrapper\n" +
    "      // Sin embargo, aún aplicamos estas propiedades directamente para garantizar que cualquier estilo CSS\n" +
    "      // heredado no sobrescriba nuestro posicionamiento\n" +
    "      \n" +
    "      // Reforzar los estilos establecidos para que sobreescriban cualquier valor anterior\n" +
    "      if (position === 'top-left') {\n" +
    "        wrapper.style.setProperty('top', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('left', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('right', 'auto', 'important');\n" +
    "        wrapper.style.setProperty('bottom', 'auto', 'important');\n" +
    "      } \n" +
    "      else if (position === 'top-right') {\n" +
    "        // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "        wrapper.style.setProperty('transform', 'none', 'important');\n" +
    "        wrapper.style.setProperty('top', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('right', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('left', 'auto', 'important');\n" +
    "        wrapper.style.setProperty('bottom', 'auto', 'important');\n" +
    "        // Forzar un reflow para garantizar que los cambios se apliquen\n" +
    "        void wrapper.offsetHeight;\n" +
    "      }\n" +
    "      else if (position === 'bottom-left') {\n" +
    "        wrapper.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('left', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('right', 'auto', 'important');\n" +
    "        wrapper.style.setProperty('top', 'auto', 'important');\n" +
    "      }\n" +
    "      else { // bottom-right default\n" +
    "        // Para right, siempre garantizar que no haya transform que afecte el cálculo\n" +
    "        wrapper.style.setProperty('transform', 'none', 'important');\n" +
    "        wrapper.style.setProperty('bottom', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('right', margin + 'px', 'important');\n" +
    "        wrapper.style.setProperty('left', 'auto', 'important');\n" +
    "        wrapper.style.setProperty('top', 'auto', 'important');\n" +
    "        // Forzar un reflow para garantizar que los cambios se apliquen\n" +
    "        void wrapper.offsetHeight;\n" +
    "      }\n" +
    "      \n" +
    "      // Añadir clases adicionales para soporte CSS\n" +
    "      wrapper.classList.add('cmp-position-' + position);\n" +
    "      wrapper.classList.add('cmp-margin-' + margin);\n" +
    "      \n" +
    "      // Forzar un reflow para que los estilos se apliquen inmediatamente\n" +
    "      void wrapper.offsetHeight;\n" +
    "      \n" +
    "      // Clone banner, remove positioning but preserve aesthetics\n" +
    "      var originalBanner = banner.cloneNode(true);\n" +
    "      \n" +
    "      // LIMPIEZA DE ESTILOS MUY IMPORTANTE: Eliminar cualquier estilo inline que pueda interferir\n" +
    "      // Esta es la clave para que funcione correctamente\n" +
    "      var style = originalBanner.getAttribute('style') || '';\n" +
    "      \n" +
    "      // Lista completa de propiedades de posicionamiento que pueden interferir\n" +
    "      var positionProperties = [\n" +
    "        'position', 'top', 'bottom', 'left', 'right', 'float', 'transform',\n" +
    "        'margin-top', 'margin-bottom', 'margin-left', 'margin-right',\n" +
    "        'z-index', 'display', 'flex', 'grid', 'align-items', 'justify-content',\n" +
    "        'place-items', 'place-content', 'order', 'flex-direction',\n" +
    "        'absolute', 'relative', 'fixed', 'sticky', 'static'\n" +
    "      ];\n" +
    "      \n" +
    "      // Crear expresión regular para eliminar todas las propiedades de posicionamiento\n" +
    "      var positioningRegex = new RegExp(positionProperties.map(function(prop) {\n" +
    "        return prop + '\\\\s*:\\\\s*[^;]+;?';\n" +
    "      }).join('|'), 'g');\n" +
    "      \n" +
    "      // Eliminamos todos los estilos de posicionamiento mientras preservamos otros estilos\n" +
    "      var cleanStyle = style.replace(positioningRegex, '');\n" +
    "      \n" +
    "      // Aplicar el estilo limpio y añadir position static con !important\n" +
    "      originalBanner.setAttribute('style', cleanStyle);\n" +
    "      \n" +
    "      // Establecer todas las propiedades de posicionamiento a sus valores neutrales con !important\n" +
    "      originalBanner.style.setProperty('position', 'static', 'important');\n" +
    "      originalBanner.style.setProperty('top', 'auto', 'important');\n" +
    "      originalBanner.style.setProperty('bottom', 'auto', 'important');\n" +
    "      originalBanner.style.setProperty('left', 'auto', 'important');\n" +
    "      originalBanner.style.setProperty('right', 'auto', 'important');\n" +
    "      originalBanner.style.setProperty('float', 'none', 'important');\n" +
    "      // No eliminar transform para permitir que elementos como el botón de preferencias mantengan su transform\n" +
    "      // originalBanner.style.setProperty('transform', 'none', 'important');\n" +
    "      originalBanner.style.setProperty('margin', '0', 'important');\n" +
    "      originalBanner.style.setProperty('z-index', 'auto', 'important');\n" +
    "      \n" +
    "      // Eliminar cualquier clase CSS que pueda estar afectando al posicionamiento\n" +
    "      var classNames = originalBanner.className.split(' ');\n" +
    "      classNames = classNames.filter(function(name) {\n" +
    "        return !name.includes('left') && !name.includes('right') && \n" +
    "               !name.includes('top') && !name.includes('bottom');\n" +
    "      });\n" +
    "      originalBanner.className = classNames.join(' ');\n" +
    "      \n" +
    "      // Conservar atributos importantes en el clon e incluir atributos adicionales\n" +
    "      // Almacenar TODOS los posibles atributos de posicionamiento para máxima compatibilidad\n" +
    "      originalBanner.setAttribute('data-floating-corner', position);\n" +
    "      originalBanner.setAttribute('data-floating-margin', margin);\n" +
    "      originalBanner.setAttribute('data-position', position);\n" +
    "      originalBanner.setAttribute('floatingCorner', position);\n" +
    "      originalBanner.setAttribute('floatingMargin', margin);\n" +
    "      \n" +
    "      // Añadir clase de posicionamiento específica para CSS\n" +
    "      var currentClasses = originalBanner.className || '';\n" +
    "      if (!currentClasses.includes('cmp-position-' + position)) {\n" +
    "        originalBanner.className = currentClasses + ' cmp-position-' + position;\n" +
    "      }\n" +
    "      \n" +
    "      // Depuración crítica para verificar atributos\n" +
    "      console.log('[CMP] Atributos de posicionamiento establecidos:', {\n" +
    "        'data-floating-corner': originalBanner.getAttribute('data-floating-corner'),\n" +
    "        'data-floating-margin': originalBanner.getAttribute('data-floating-margin'),\n" +
    "        'data-position': originalBanner.getAttribute('data-position')\n" +
    "      });\n" +
    "      \n" +
    "      // Add banner to wrapper and replace in DOM\n" +
    "      wrapper.appendChild(originalBanner);\n" +
    "      var parent = banner.parentNode;\n" +
    "      \n" +
    "      if (parent) {\n" +
    "        // Eliminar el banner original y poner el wrapper con el banner clonado\n" +
    "        parent.replaceChild(wrapper, banner);\n" +
    "      } else {\n" +
    "        // Si no hay padre, simplemente añadir al body\n" +
    "        console.log('[CMP] No se encontró un padre para el banner, añadiendo directamente al body');\n" +
    "        document.body.appendChild(wrapper);\n" +
    "      }\n" +
    "      \n" +
    "      // Forzar un reflow para que los cambios se apliquen inmediatamente\n" +
    "      void wrapper.offsetHeight;\n" +
    "      \n" +
    "      // Inyectar CSS adicional para asegurar posicionamiento correcto\n" +
    "      // Esto es un respaldo por si falla la manipulación directa del DOM\n" +
    "      var styleId = 'cmp-forced-positioning-css';\n" +
    "      \n" +
    "      // Eliminar estilo anterior si existe\n" +
    "      var oldStyle = document.getElementById(styleId);\n" +
    "      if (oldStyle && oldStyle.parentNode) {\n" +
    "        oldStyle.parentNode.removeChild(oldStyle);\n" +
    "      }\n" +
    "      \n" +
    "      // Crear nuevo estilo\n" +
    "      var styleEl = document.createElement('style');\n" +
    "      styleEl.id = styleId;\n" +
    "      styleEl.innerHTML = \n" +
    "        \"/* Estilos forzados para posicionamiento de banners CMP */\" +\n" +
    "        \"#cmp-floating-wrapper {\" +\n" +
    "        \"  position: fixed !important;\" +\n" +
    "        \"  z-index: 2147483647 !important;\" +\n" +
    "        \"  visibility: visible !important;\" +\n" +
    "        \"  opacity: 1 !important;\" +\n" +
    "        \"}\" +\n" +
    "        \n" +
    "        \"/* Posicionamiento específico para cada esquina */\" +\n" +
    "        \"#cmp-floating-wrapper.cmp-wrapper-top-right {\" +\n" +
    "        \"  top: \" + margin + \"px !important;\" +\n" +
    "        \"  right: \" + margin + \"px !important;\" +\n" +
    "        \"  left: auto !important;\" +\n" +
    "        \"  bottom: auto !important;\" +\n" +
    "        \"}\" +\n" +
    "        \n" +
    "        \"#cmp-floating-wrapper.cmp-wrapper-top-left {\" +\n" +
    "        \"  top: \" + margin + \"px !important;\" +\n" +
    "        \"  left: \" + margin + \"px !important;\" +\n" +
    "        \"  right: auto !important;\" +\n" +
    "        \"  bottom: auto !important;\" +\n" +
    "        \"}\" +\n" +
    "        \n" +
    "        \"#cmp-floating-wrapper.cmp-wrapper-bottom-right {\" +\n" +
    "        \"  bottom: \" + margin + \"px !important;\" +\n" +
    "        \"  right: \" + margin + \"px !important;\" +\n" +
    "        \"  left: auto !important;\" +\n" +
    "        \"  top: auto !important;\" +\n" +
    "        \"}\" +\n" +
    "        \n" +
    "        \"#cmp-floating-wrapper.cmp-wrapper-bottom-left {\" +\n" +
    "        \"  bottom: \" + margin + \"px !important;\" +\n" +
    "        \"  left: \" + margin + \"px !important;\" +\n" +
    "        \"  right: auto !important;\" +\n" +
    "        \"  top: auto !important;\" +\n" +
    "        \"}\" +\n" +
    "        \n" +
    "        \"/* Estilos para el banner dentro del wrapper */\" +\n" +
    "        \"#cmp-floating-wrapper > #cmp-banner {\" +\n" +
    "        \"  position: static !important;\" +\n" +
    "        \"  margin: 0 !important;\" +\n" +
    "        /* Removemos transform: none para permitir que elementos como el botón de preferencias conserven su transform */ \n" +
    "        \"}\" + \n" +
    "        \n" +
    "        \"/* Corrección para posicionamiento a la derecha - previene problemas con cálculo de centro */\" +\n" +
    "        \"#cmp-floating-wrapper.cmp-wrapper-bottom-right, #cmp-floating-wrapper.cmp-wrapper-top-right {\" +\n" +
    "        \"  transform: none !important;\" +\n" +
    "        \"}\";\n" +
    "      \n" +
    "      // Añadir al head\n" +
    "      document.head.appendChild(styleEl);\n" +
    "      \n" +
    "      // Añadir log para depuración\n" +
    "      console.log('[CMP] Estilos aplicados al wrapper:', {\n" +
    "        position: wrapper.style.position,\n" +
    "        top: wrapper.style.top,\n" +
    "        right: wrapper.style.right,\n" +
    "        bottom: wrapper.style.bottom,\n" +
    "        left: wrapper.style.left,\n" +
    "        margin: margin + 'px',\n" +
    "        id: wrapper.id,\n" +
    "        zIndex: wrapper.style.zIndex\n" +
    "      });\n" +
    "      \n" +
    "      console.log('[CMP] Banner flotante posicionado correctamente en:', position);\n" +
    "      return true;\n" +
    "    };\n";
}

// Función para inyectar el código en el script principal
function injectFloatingPositionHandlerIntoScript(consentScript) {
  const handlerCode = generateFloatingPositionHandlerCode();
  
  // Buscar si ya existe una implementación de la función
  if (consentScript.includes('window.CMP.ensureFloatingPosition')) {
    console.log('Reemplazando implementación existente de ensureFloatingPosition');
    
    // Patrón para encontrar la implementación existente
    const existingPattern = /window\.CMP\.ensureFloatingPosition\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/;
    
    // Reemplazar la implementación existente con la nueva
    return consentScript.replace(existingPattern, handlerCode);
  } else {
    console.log('Añadiendo nueva implementación de ensureFloatingPosition');
    
    // Buscar un buen punto para insertar el código
    const initPoint = consentScript.indexOf('window.CMP.init = function()');
    
    if (initPoint !== -1) {
      // Insertar antes de la función init
      return consentScript.substring(0, initPoint) + handlerCode + '\n\n' + consentScript.substring(initPoint);
    } else {
      // Insertar al final del espacio de nombres CMP
      return consentScript + '\n\n' + handlerCode;
    }
  }
}

module.exports = {
  generateFloatingPositionHandlerCode,
  injectFloatingPositionHandlerIntoScript
};