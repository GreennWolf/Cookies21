/**
 * Servicio para solucionar problemas de posicionamiento de modales
 * Este servicio proporciona funciones para garantizar que los modales estén correctamente centrados
 * y visibles, independientemente de los estilos CSS en conflicto en la página.
 */

const logger = require('../utils/logger');

class ModalPositionFixerService {
  /**
   * Genera código JavaScript para garantizar el centrado de modales
   * @returns {String} Código JavaScript con funciones mejoradas para centrado de modales
   */
  generateModalFixerCode() {
    return `
    // =============================================
    // SOLUCIONADOR DE CENTRADO DE MODALES
    // =============================================
    window.CMP.debugModalStyles = function() {
      console.log('[CMP DEBUG] Iniciando depuración exhaustiva de estilos del modal...');
      
      var modalContainer = document.getElementById('cmp-modal-container');
      var bannerEl = document.getElementById('cmp-banner');
      
      // Función helper para mostrar todos los estilos computados de un elemento
      function logAllComputedStyles(element, elementName) {
        if (!element) {
          console.log('[CMP DEBUG] No se encontró el elemento:', elementName);
          return;
        }
        
        var computedStyles = window.getComputedStyle(element);
        console.log('[CMP DEBUG] Estilos computados de ' + elementName + ':');
        
        // Propiedades críticas para posicionamiento y visualización
        var criticalProps = [
          'display', 'position', 'visibility', 'opacity',
          'width', 'height', 'maxWidth', 'maxHeight',
          'top', 'right', 'bottom', 'left',
          'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
          'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'zIndex', 'transform', 'transformOrigin',
          'alignItems', 'justifyContent', 'flexDirection', 'flexWrap',
          'backgroundColor', 'boxShadow', 'border', 'borderRadius'
        ];
        
        // Primero mostrar las propiedades críticas
        criticalProps.forEach(function(prop) {
          console.log('[CMP DEBUG] - ' + prop + ':', computedStyles[prop]);
        });
        
        // También mostrar los estilos inline
        console.log('[CMP DEBUG] Estilos inline de ' + elementName + ':', element.getAttribute('style'));
      }
      
      // Log del árbol DOM para entender la estructura
      console.log('[CMP DEBUG] Estructura DOM actual:');
      if (bannerEl) {
        console.log('[CMP DEBUG] - Banner padre:', bannerEl.parentNode ? bannerEl.parentNode.tagName + (bannerEl.parentNode.id ? '#' + bannerEl.parentNode.id : '') : 'ninguno');
      }
      
      // Analizar estilos del contenedor modal
      logAllComputedStyles(modalContainer, 'contenedor modal (cmp-modal-container)');
      
      // Analizar estilos del banner
      logAllComputedStyles(bannerEl, 'banner modal (cmp-banner)');
      
      // Verificar si hay elementos encima del modal
      if (modalContainer) {
        console.log('[CMP DEBUG] Verificando elementos que podrían estar encima del modal...');
        var allElements = document.querySelectorAll('*');
        var modalZIndex = parseInt(window.getComputedStyle(modalContainer).zIndex) || 0;
        
        var elementsAbove = [];
        for (var i = 0; i < allElements.length; i++) {
          var el = allElements[i];
          if (el !== modalContainer && el !== bannerEl && !modalContainer.contains(el)) {
            var elZIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
            if (elZIndex >= modalZIndex && elZIndex > 0) {
              elementsAbove.push({
                element: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.replace(/ /g, '.') : ''),
                zIndex: elZIndex
              });
            }
          }
        }
        
        if (elementsAbove.length > 0) {
          console.log('[CMP DEBUG] Elementos con z-index mayor o igual que podrían ocultar el modal:', elementsAbove);
        } else {
          console.log('[CMP DEBUG] No se encontraron elementos con z-index superior');
        }
      }
      
      // Verificar conflictos de CSS
      console.log('[CMP DEBUG] Buscando reglas CSS que podrían afectar al modal...');
      var conflictingRules = [];
      try {
        for (var i = 0; i < document.styleSheets.length; i++) {
          try {
            var sheet = document.styleSheets[i];
            console.log('[CMP DEBUG] Analizando stylesheet:', sheet.href || 'stylesheet inline');
            
            var rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            
            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j];
              if (rule.selectorText && (
                  rule.selectorText.includes('modal') || 
                  rule.selectorText.includes('cmp-banner') ||
                  rule.selectorText.includes('cmp-modal') ||
                  rule.selectorText.includes('dialog') ||
                  rule.selectorText.includes('popup') ||
                  rule.selectorText.includes('overlay') ||
                  (rule.selectorText === '*') // Reglas universales
                )) {
                var ruleText = rule.cssText || 'No disponible';
                console.log('[CMP DEBUG] Regla CSS potencialmente conflictiva:', rule.selectorText);
                console.log('[CMP DEBUG] - Contenido:', ruleText);
                
                conflictingRules.push({
                  selector: rule.selectorText,
                  text: ruleText,
                  source: sheet.href || 'inline'
                });
              }
            }
          } catch (e) {
            console.log('[CMP DEBUG] No se puede acceder a las reglas de la hoja de estilos ' + i + ':', e.message);
          }
        }
      } catch (e) {
        console.log('[CMP DEBUG] Error al analizar hojas de estilo:', e.message);
      }
      
      // Si no encontramos conflictos, mostrar mensaje
      if (conflictingRules.length === 0) {
        console.log('[CMP DEBUG] No se encontraron reglas CSS potencialmente conflictivas');
      }
      
      // SOLUCIÓN: Prueba de centrado forzado
      console.log('[CMP DEBUG] Ejecutando intento de solución de fuerza bruta para centrado...');
      if (modalContainer && bannerEl) {
        try {
          // 1. Forzar estilos al contenedor
          var containerCriticalCSS = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; background-color: rgba(0,0,0,0.5) !important; z-index: 2147483646 !important;';
          modalContainer.style.cssText = containerCriticalCSS;
          
          // 2. Forzar estilos al banner
          var bannerCriticalCSS = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: 90% !important; max-width: 600px !important; margin: 0 auto !important; background-color: #ffffff !important; z-index: 2147483647 !important; left: auto !important; right: auto !important; top: auto !important; bottom: auto !important;';
          bannerEl.style.cssText = bannerCriticalCSS;
          
          console.log('[CMP DEBUG] Solución de fuerza bruta aplicada, verificar resultado');
        } catch (e) {
          console.log('[CMP DEBUG] Error al aplicar solución de fuerza bruta:', e.message);
        }
      }
      
      return {
        containerFound: !!modalContainer,
        bannerFound: !!bannerEl,
        conflictingRulesCount: conflictingRules.length
      };
    };

    window.CMP.ensureModalVisibility = function() {
      console.log('[CMP] Iniciando proceso de visibilidad del modal con solución avanzada...');
      // Ejecutar inmediatamente para que no haya retraso y envolver en try/catch
      try {
        (function() {
          // Depurar el estado actual antes de modificar
          console.log('[CMP DEBUG] Estado del DOM antes de modificar el modal:');
          
          var modalContainer = document.getElementById('cmp-modal-container');
          var bannerEl = document.getElementById('cmp-banner');
          
          if (!bannerEl) {
            console.error('[CMP ERROR] No se encontró el banner - buscando posibles causas...');
            
            // Búsqueda más profunda en el DOM
            var possibleBanners = document.querySelectorAll('.cmp-banner, [id*="banner"], [class*="banner"], [id*="modal"], [class*="modal"]');
            if (possibleBanners.length > 0) {
              console.log('[CMP DEBUG] Encontrados posibles elementos de banner:', possibleBanners.length);
              // Usar el primer elemento con clase cmp-banner--modal si existe
              for (var i = 0; i < possibleBanners.length; i++) {
                if (possibleBanners[i].classList.contains('cmp-banner--modal')) {
                  bannerEl = possibleBanners[i];
                  console.log('[CMP DEBUG] Encontrado banner alternativo:', bannerEl.id || 'sin id');
                  break;
                }
              }
              
              // Si aún no encontramos uno válido, usar el primero
              if (!bannerEl && possibleBanners.length > 0) {
                bannerEl = possibleBanners[0];
                bannerEl.classList.add('cmp-banner--modal'); // Asegurarnos que tenga la clase correcta
                console.log('[CMP DEBUG] Usando elemento alternativo como banner:', bannerEl.id || 'sin id');
              }
            } else {
              console.error('[CMP ERROR] No se encontraron elementos que pudieran servir como banner');
              return false;
            }
          }
          
          // Verificar si es un modal
          var isModal = bannerEl.classList.contains('cmp-banner--modal');
          if (!isModal) {
            console.log('[CMP DEBUG] El banner no tiene la clase cmp-banner--modal, añadiéndola...');
            bannerEl.classList.add('cmp-banner--modal');
          }
          
          console.log('[CMP DEBUG] Banner modal encontrado con ID:', bannerEl.id);
          
          // ELIMINAR CUALQUIER ESTRUCTURA ANTERIOR
          var elementsToRemove = [
            document.getElementById('cmp-modal-container'),
            document.getElementById('cmp-modal-overlay'),
            document.getElementById('cmp-modal-wrapper'),
            document.querySelector('.cmp-modal-container'),
            document.querySelector('.cmp-modal-overlay'),
            document.querySelector('.cmp-overlay')
          ];
          
          elementsToRemove.forEach(function(el) {
            if (el && el !== bannerEl && el.parentNode) {
              console.log('[CMP DEBUG] Eliminando elemento antiguo:', el.id || el.className || 'elemento sin id/clase');
              el.parentNode.removeChild(el);
            }
          });
          
          // Guardar referencia al padre original del banner
          var originalParent = bannerEl.parentNode;
          console.log('[CMP DEBUG] Padre original del banner:', originalParent ? (originalParent.id || originalParent.tagName) : 'ninguno');
          
          // Quitar el banner del DOM actual para poder recolocarlo
          if (originalParent && originalParent.contains(bannerEl)) {
            originalParent.removeChild(bannerEl);
            console.log('[CMP DEBUG] Banner removido de su padre original');
          }
          
          // Crear un nuevo contenedor modal con todos los atributos necesarios
          var newContainer = document.createElement('div');
          newContainer.id = 'cmp-modal-container';
          newContainer.setAttribute('role', 'dialog');
          newContainer.setAttribute('aria-modal', 'true');
          newContainer.setAttribute('data-cmp-container', 'true');
          
          // Aplicar estilos al contenedor - SUPER IMPORTANTE usar AMBOS métodos para máxima compatibilidad
          var containerStyle = newContainer.style;
          
          // 1. Método setProperty con !important para navegadores modernos
          containerStyle.setProperty('position', 'fixed', 'important');
          containerStyle.setProperty('top', '0', 'important');
          containerStyle.setProperty('left', '0', 'important');
          containerStyle.setProperty('right', '0', 'important');
          containerStyle.setProperty('bottom', '0', 'important');
          containerStyle.setProperty('width', '100%', 'important');
          containerStyle.setProperty('height', '100%', 'important');
          containerStyle.setProperty('display', 'flex', 'important');
          containerStyle.setProperty('align-items', 'center', 'important');
          containerStyle.setProperty('justify-content', 'center', 'important');
          containerStyle.setProperty('background-color', 'rgba(0,0,0,0.5)', 'important');
          containerStyle.setProperty('z-index', '2147483646', 'important');
          containerStyle.setProperty('margin', '0', 'important');
          containerStyle.setProperty('padding', '0', 'important');
          containerStyle.setProperty('opacity', '1', 'important');
          containerStyle.setProperty('visibility', 'visible', 'important');
          
          // 2. Método cssText para navegadores antiguos o cuando setProperty falla
          var cssTextValue = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; background-color: rgba(0,0,0,0.5) !important; z-index: 2147483646 !important; margin: 0 !important; padding: 0 !important; opacity: 1 !important; visibility: visible !important;';
          
          // Aplicar cssText después de setProperty para casos donde setProperty falla
          newContainer.style.cssText += cssTextValue;
          
          console.log('[CMP DEBUG] Estilos aplicados al contenedor modal con doble método');
          
          // Limpiar completamente todos los estilos anteriores del banner
          // 1. Reset completo de los estilos inline
          bannerEl.style = ""; 
          // 2. Remover todos los atributos de estilo para evitar cualquier estilo heredado
          bannerEl.removeAttribute('style');
          
          console.log('[CMP DEBUG] Estilos del banner limpiados completamente');
          
          // Ahora aplicar nuevos estilos limpios al banner usando AMBOS métodos
          // Método 1: setProperty con !important
          var bannerStyle = bannerEl.style;
          bannerStyle.setProperty('display', 'block', 'important');
          bannerStyle.setProperty('visibility', 'visible', 'important');
          bannerStyle.setProperty('opacity', '1', 'important');
          bannerStyle.setProperty('position', 'relative', 'important');
          bannerStyle.setProperty('width', '90%', 'important');
          bannerStyle.setProperty('min-width', '300px', 'important');
          bannerStyle.setProperty('max-width', '600px', 'important');
          bannerStyle.setProperty('margin', '0 auto', 'important');
          bannerStyle.setProperty('background-color', '#ffffff', 'important');
          bannerStyle.setProperty('border-radius', '8px', 'important');
          bannerStyle.setProperty('box-shadow', '0 4px 20px rgba(0,0,0,0.4)', 'important');
          bannerStyle.setProperty('padding', '20px', 'important');
          bannerStyle.setProperty('z-index', '2147483647', 'important');
          bannerStyle.setProperty('max-height', '90vh', 'important');
          bannerStyle.setProperty('overflow-y', 'auto', 'important');
          bannerStyle.setProperty('text-align', 'center', 'important');
          bannerStyle.setProperty('left', 'auto', 'important'); // Importante para evitar conflictos
          bannerStyle.setProperty('right', 'auto', 'important'); // Importante para evitar conflictos
          bannerStyle.setProperty('top', 'auto', 'important'); // Importante para evitar conflictos
          bannerStyle.setProperty('bottom', 'auto', 'important'); // Importante para evitar conflictos
          // No aplicamos transform: none para permitir que elementos como el botón de preferencias conserven sus transformaciones
          
          // Método 2: cssText para navegadores antiguos o cuando setProperty falla
          var bannerCssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: 90% !important; min-width: 300px !important; max-width: 600px !important; margin: 0 auto !important; background-color: #ffffff !important; border-radius: 8px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; padding: 20px !important; z-index: 2147483647 !important; max-height: 90vh !important; overflow-y: auto !important; text-align: center !important; left: auto !important; right: auto !important; top: auto !important; bottom: auto !important;';
          bannerEl.style.cssText += bannerCssText;
          
          console.log('[CMP DEBUG] Nuevos estilos aplicados al banner con doble método');
          
          // Añadir el banner al nuevo contenedor
          newContainer.appendChild(bannerEl);
          
          // Eliminar cualquier otro contenedor modal si existe
          document.querySelectorAll('#cmp-modal-container').forEach(function(el) {
            if (el !== newContainer && el.parentNode) {
              console.log('[CMP DEBUG] Eliminando contenedor modal duplicado');
              el.parentNode.removeChild(el);
            }
          });
          
          // Añadir el nuevo contenedor al final del body para asegurar que esté por encima de todo
          document.body.appendChild(newContainer);
          
          console.log('[CMP DEBUG] Contenedor modal reconstruido y añadido al DOM');
          
          // Ejecutar la función de depuración para verificar los estilos aplicados
          setTimeout(function() {
            if (window.CMP.debugModalStyles) {
              console.log('[CMP DEBUG] Ejecutando depuración de estilos después de 100ms...');
              window.CMP.debugModalStyles();
            }
          }, 100);
          
          // Verificación adicional: asegurarse que todo sigue en su lugar después de un momento
          setTimeout(function() {
            var lateContainer = document.getElementById('cmp-modal-container');
            var lateBanner = document.getElementById('cmp-banner');
            
            if (!lateContainer || !lateBanner || !lateContainer.contains(lateBanner)) {
              console.log('[CMP DEBUG] ¡Alerta! La estructura modal parece haberse alterado, reintentando...');
              window.CMP.ensureModalVisibility(); // Reintentar
            } else {
              console.log('[CMP DEBUG] Verificación tardía: estructura modal intacta');
              
              // Forzar nuevamente los estilos críticos de centrado
              lateContainer.style.display = 'flex';
              lateContainer.style.alignItems = 'center';
              lateContainer.style.justifyContent = 'center';
              
              // Y también volver a aplicar los estilos del banner
              lateBanner.style.margin = '0 auto';
              lateBanner.style.position = 'relative';
              
              // Verificar si el explorador soporta MutationObserver
              if (typeof MutationObserver !== 'undefined') {
                // Crear un observador para detectar cambios en el DOM del modal
                console.log('[CMP DEBUG] Configurando MutationObserver para mantener centrado...');
                var observer = new MutationObserver(function(mutations) {
                  // Si hay cambios, volver a aplicar estilos críticos
                  var container = document.getElementById('cmp-modal-container');
                  var banner = document.getElementById('cmp-banner');
                  
                  if (container) {
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.justifyContent = 'center';
                  }
                  
                  if (banner) {
                    banner.style.margin = '0 auto';
                    banner.style.position = 'relative';
                  }
                });
                
                // Configurar y empezar a observar
                observer.observe(document.body, { 
                  childList: true, 
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['style', 'class']
                });
                
                // Almacenar el observador para posible uso futuro
                window.CMP._modalObserver = observer;
                
                // Detener después de 5 segundos para no consumir recursos
                setTimeout(function() {
                  if (window.CMP._modalObserver) {
                    window.CMP._modalObserver.disconnect();
                    delete window.CMP._modalObserver;
                    console.log('[CMP DEBUG] MutationObserver desconectado');
                  }
                }, 5000);
              }
            }
          }, 500);
          
          // Forzar un reflow para asegurar que se aplican los estilos
          void newContainer.offsetWidth;
          
          console.log('[CMP] Estructura modal reconstruida con éxito - debería estar centrada');
          return true;
        })();
      } catch (error) {
        console.error('[CMP ERROR] Error fatal en ensureModalVisibility:', error);
        
        // Intento de recuperación de emergencia
        try {
          console.log('[CMP DEBUG] Intentando solución de emergencia...');
          
          // Crear un contenedor simple con posición absoluta
          var emergencyContainer = document.createElement('div');
          emergencyContainer.id = 'cmp-modal-container-emergency';
          emergencyContainer.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background-color: rgba(0, 0, 0, 0.5) !important; z-index: 2147483646 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
          
          // Crear un banner de emergencia
          var emergencyBanner = document.createElement('div');
          emergencyBanner.id = 'cmp-banner-emergency';
          emergencyBanner.className = 'cmp-banner cmp-banner--modal';
          emergencyBanner.style.cssText = 'background-color: white !important; padding: 20px !important; border-radius: 8px !important; width: 90% !important; max-width: 600px !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important; text-align: center !important; margin: 0 auto !important;';
          
          emergencyBanner.innerHTML = \`
          <div style="margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Configuración de Cookies</h3>
            <p>Este sitio web utiliza cookies para mejorar su experiencia.</p>
          </div>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button data-cmp-action="reject_all" style="background-color: #f1f1f1; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Rechazar Todo</button>
            <button data-cmp-action="accept_all" style="background-color: #0078d4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Aceptar Todo</button>
          </div>
          \`;
          
          // Añadir al DOM
          emergencyContainer.appendChild(emergencyBanner);
          document.body.appendChild(emergencyContainer);
          
          // Añadir eventos a los botones
          var buttons = emergencyBanner.querySelectorAll('button');
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function(e) {
              var action = this.getAttribute('data-cmp-action');
              if (action === 'accept_all' && typeof window.CMP.acceptAll === 'function') {
                window.CMP.acceptAll();
              } else if (action === 'reject_all' && typeof window.CMP.rejectAll === 'function') {
                window.CMP.rejectAll();
              }
              
              // Ocultar el banner de emergencia
              if (emergencyContainer.parentNode) {
                emergencyContainer.parentNode.removeChild(emergencyContainer);
              }
            });
          }
          
          console.log('[CMP DEBUG] Solución de emergencia implementada correctamente');
          return true;
        } catch (emergencyError) {
          console.error('[CMP ERROR] Error en solución de emergencia:', emergencyError);
          return false;
        }
      }
    };
    `;
  }
  
  /**
   * Integra el código de corrección en el script de consentimiento
   * @param {String} consentScript - Script de consentimiento original
   * @returns {String} - Script modificado con la solución de centrado
   */
  injectModalFixerIntoScript(consentScript) {
    logger.info('Inyectando código de corrección de centrado en script de consentimiento');
    
    // Generar el código para el fixer
    const fixerCode = this.generateModalFixerCode();
    
    // Verificar si el script ya contiene funciones ensureModalVisibility o debugModalStyles
    if (consentScript.includes('window.CMP.ensureModalVisibility') || 
        consentScript.includes('window.CMP.debugModalStyles')) {
      // Reemplazar las implementaciones existentes
      logger.info('Se detectaron implementaciones existentes, reemplazándolas...');
      
      // Reemplazar ensureModalVisibility
      const ensureModalPattern = /window\.CMP\.ensureModalVisibility\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*\}\s*;/;
      const debugModalPattern = /window\.CMP\.debugModalStyles\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/;
      
      let updatedScript = consentScript;
      
      // Extraer e insertar las funciones mejoradas una por una
      const ensureModalMatch = fixerCode.match(/window\.CMP\.ensureModalVisibility\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*\}\s*;/);
      const debugModalMatch = fixerCode.match(/window\.CMP\.debugModalStyles\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;/);
      
      if (ensureModalMatch && updatedScript.match(ensureModalPattern)) {
        updatedScript = updatedScript.replace(ensureModalPattern, ensureModalMatch[0]);
        logger.info('Función ensureModalVisibility reemplazada con éxito');
      } else {
        logger.warn('No se pudo reemplazar la función ensureModalVisibility, añadiéndola al final');
        // Buscar un buen lugar para insertar después de la declaración de window.CMP
        const insertPoint = updatedScript.indexOf('window.CMP = window.CMP || {};');
        if (insertPoint !== -1) {
          const insertAt = updatedScript.indexOf(';', insertPoint) + 1;
          updatedScript = updatedScript.substring(0, insertAt) + 
                         '\n\n' + ensureModalMatch[0] + '\n' + 
                         updatedScript.substring(insertAt);
        } else {
          // Fallback: añadir al final
          updatedScript += '\n\n' + ensureModalMatch[0];
        }
      }
      
      if (debugModalMatch && updatedScript.match(debugModalPattern)) {
        updatedScript = updatedScript.replace(debugModalPattern, debugModalMatch[0]);
        logger.info('Función debugModalStyles reemplazada con éxito');
      } else {
        logger.warn('No se pudo reemplazar la función debugModalStyles, añadiéndola al final');
        // Buscar un buen lugar para insertar después de ensureModalVisibility
        const insertPoint = updatedScript.indexOf('window.CMP.ensureModalVisibility');
        if (insertPoint !== -1) {
          // Encontrar el final de la función
          let braceCount = 0;
          let endPoint = insertPoint;
          let inString = false;
          let stringChar = '';
          
          for (let i = insertPoint; i < updatedScript.length; i++) {
            const char = updatedScript[i];
            
            // Manejar strings para ignorar braces dentro de strings
            if ((char === '"' || char === "'") && (i === 0 || updatedScript[i-1] !== '\\')) {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
              }
            }
            
            if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  // Hemos encontrado el final de la función
                  endPoint = i + 1;
                  break;
                }
              }
            }
          }
          
          // Insertar después del final de la función
          updatedScript = updatedScript.substring(0, endPoint) + 
                         ';\n\n' + debugModalMatch[0] + '\n' + 
                         updatedScript.substring(endPoint);
        } else {
          // Fallback: añadir al final
          updatedScript += '\n\n' + debugModalMatch[0];
        }
      }
      
      return updatedScript;
    } else {
      // Las funciones no existen, añadir el bloque completo antes de la inicialización
      logger.info('No se detectaron implementaciones existentes, añadiendo código nuevo...');
      
      // Buscar un buen punto para insertar el código, por ejemplo antes de window.CMP.init
      const insertPoint = consentScript.indexOf('window.CMP.init = function()');
      
      if (insertPoint !== -1) {
        return consentScript.substring(0, insertPoint) + 
               fixerCode + '\n\n' + 
               consentScript.substring(insertPoint);
      } else {
        // Si no encontramos un buen punto, añadir al final del namespace window.CMP
        const namespaceEnd = consentScript.indexOf('})();');
        
        if (namespaceEnd !== -1) {
          return consentScript.substring(0, namespaceEnd) + 
                 fixerCode + '\n\n' + 
                 consentScript.substring(namespaceEnd);
        } else {
          // Último recurso: añadir al final
          logger.warn('No se encontró un punto adecuado para insertar el código, añadiendo al final');
          return consentScript + '\n\n' + fixerCode;
        }
      }
    }
  }
}

module.exports = new ModalPositionFixerService();