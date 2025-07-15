// services/cookieIconService.js
const fs = require('fs');
const path = require('path');

class CookieIconService {
  /**
   * Genera el código JavaScript e HTML para el icono flotante de Cookie21
   * @param {Object} options - Opciones de configuración
   * @returns {string} Código JavaScript e HTML para el icono flotante
   */
  generateFloatingIcon(options = {}) {
    const { 
      baseUrl = 'http://localhost:3000',
      position = 'bottom-right',
      color = '#007bff',
      enabled = true,
      backgroundColor = 'transparent',
      size = 40
    } = options;
    
    // Debug: mostrar configuración recibida
    console.log('🔍 [CookieIconService] Configuración recibida:', {
      baseUrl,
      position,
      color,
      enabled,
      backgroundColor,
      size,
      originalOptions: options
    });
    
    // Si no está habilitado, retornar código vacío
    if (!enabled) {
      return `
        // Icono flotante deshabilitado
        window.CMP = window.CMP || {};
        window.CMP.floatingIconEnabled = false;
      `;
    }
    
    // Calcular posición basada en la configuración
    const positionStyles = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    }[position] || 'bottom: 20px; right: 20px;';
    
    console.log('🎯 [CookieIconService] Estilos calculados:', { position, positionStyles });

    return `
      // ===============================
      // FLOATING ICON FUNCTIONALITY
      // ===============================
      
      // Variables globales para el icono flotante
      window.CMP = window.CMP || {};
      window.CMP.floatingIcon = null;
      window.CMP.isOpen = false; // Variable para controlar si el banner está abierto
      
      // Función global para detectar si hay banners visibles
      window.CMP.isBannerVisible = function() {
        console.log('[CMP] 🔍 Ejecutando isBannerVisible()...');
        
        // PRIMERA VERIFICACIÓN: Elementos con clase cmp-banner--visible (más específico)
        const visibleCmpBanners = document.querySelectorAll('.cmp-banner--visible');
        console.log(\`[CMP] 🎯 Elementos con cmp-banner--visible: \${visibleCmpBanners.length}\`);
        
        if (visibleCmpBanners.length > 0) {
          for (const banner of visibleCmpBanners) {
            console.log('[CMP] 📋 Banner cmp-banner--visible encontrado:', {
              id: banner.id,
              className: banner.className,
              display: getComputedStyle(banner).display,
              offsetWidth: banner.offsetWidth,
              offsetHeight: banner.offsetHeight,
              offsetParent: !!banner.offsetParent
            });
            
            // Si tiene la clase visible, considerarlo visible independientemente del display
            if (banner.offsetWidth > 0 && banner.offsetHeight > 0) {
              console.log('[CMP] ✅ Banner CMP CONFIRMADO VISIBLE por clase cmp-banner--visible');
              return true;
            }
          }
        }
        
        // SEGUNDA VERIFICACIÓN: Elementos con clase cmp-banner que tengan clase visible
        const cmpBanners = document.querySelectorAll('.cmp-banner');
        console.log(\`[CMP] 🎯 Elementos con cmp-banner: \${cmpBanners.length}\`);
        
        if (cmpBanners.length > 0) {
          for (const banner of cmpBanners) {
            const hasVisibleClass = banner.classList.contains('cmp-banner--visible') || 
                                   banner.classList.contains('visible') ||
                                   banner.classList.contains('show') ||
                                   banner.classList.contains('active');
            
            console.log('[CMP] 🔍 Banner cmp-banner encontrado:', {
              id: banner.id,
              className: banner.className,
              hasVisibleClass,
              display: getComputedStyle(banner).display,
              offsetWidth: banner.offsetWidth,
              offsetHeight: banner.offsetHeight,
              offsetParent: !!banner.offsetParent
            });
            
            // Si tiene clase visible Y tiene dimensiones, está visible
            if (hasVisibleClass && banner.offsetWidth > 0 && banner.offsetHeight > 0) {
              console.log('[CMP] ✅ Banner CMP VISIBLE por clase de estado');
              return true;
            }
          }
        }
        
        // TERCERA VERIFICACIÓN: Selectores generales para otros sistemas
        const selectors = [
          '#cmp-banner',
          '[id*="banner-"][id*="container"]',
          '[id*="cookie"]',
          '[class*="cookie"]', 
          '[id*="consent"]',
          '[class*="consent"]',
          '[id*="banner"]',
          '[class*="banner"]',
          '[data-testid*="cookie"]',
          '[data-testid*="consent"]',
          '[data-testid*="banner"]',
          '.cookiebanner',
          '.cookie-banner',
          '.consent-banner',
          '.privacy-banner',
          '.gdpr-banner',
          '#cookieNotice',
          '#consentNotice',
          '.notice-banner',
          '[role="dialog"][aria-label*="cookie" i]',
          '[role="dialog"][aria-label*="consent" i]',
          '[role="banner"][class*="cookie" i]',
          '[role="banner"][class*="consent" i]'
        ];
        
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              // Verificar que no sea el icono flotante mismo
              if (element.id === 'cmp-floating-icon') {
                continue;
              }
              
              // Verificaciones de visibilidad estándar
              const style = getComputedStyle(element);
              const isDisplayed = style.display !== 'none';
              const isVisible = style.visibility !== 'hidden';
              const isOpaque = parseFloat(style.opacity) > 0;
              const hasOffsetParent = element.offsetParent !== null;
              const hasSize = element.offsetWidth > 0 && element.offsetHeight > 0;
              
              const isElementVisible = isDisplayed && isVisible && isOpaque && hasOffsetParent && hasSize;
              
              if (isElementVisible) {
                console.log('[CMP] 🔍 Banner genérico detectado visible:', {
                  selector: selector,
                  id: element.id,
                  className: element.className,
                  tagName: element.tagName,
                  display: style.display,
                  visibility: style.visibility,
                  opacity: style.opacity,
                  offsetWidth: element.offsetWidth,
                  offsetHeight: element.offsetHeight,
                  offsetParent: !!element.offsetParent
                });
                return true;
              }
            }
          } catch (e) {
            // Ignorar errores de selectores inválidos
            console.log('[CMP] ⚠️ Error en selector:', selector, e.message);
            continue;
          }
        }
        
        console.log('[CMP] ❌ No se detectaron banners visibles');
        return false;
      };
      
      // Función para crear el icono flotante
      window.CMP.createFloatingIcon = function() {
        console.log('[CMP] 🔄 Intentando crear icono flotante... isOpen:', window.CMP.isOpen);
        
        // Verificar si hay banners visibles usando la función global
        const bannerVisible = window.CMP.isBannerVisible();
        
        if (window.CMP.isOpen || bannerVisible) {
          console.log('[CMP] ⚠️ Banner está abierto/visible, no se muestra el icono');
          return null;
        }
        
        // Evitar duplicados
        if (window.CMP.floatingIcon) {
          console.log('[CMP] ⚠️ Icono flotante ya existe, eliminando el anterior...');
          window.CMP.floatingIcon.remove();
          window.CMP.floatingIcon = null;
        }
        
        // También eliminar cualquier icono existente del DOM
        const existingIcon = document.getElementById('cmp-floating-icon');
        if (existingIcon) {
          existingIcon.remove();
        }
        
        // Crear el icono
        const icon = document.createElement('div');
        icon.id = 'cmp-floating-icon';
        
        // Configurar imagen con tamaño dinámico
        const iconSize = ${size};
        const imageSize = Math.round(iconSize * 0.8); // Imagen 80% del tamaño del contenedor
        icon.innerHTML = '<img src="${baseUrl}/icon.ico" width="' + imageSize + '" height="' + imageSize + '" style="width: ' + imageSize + 'px; height: ' + imageSize + 'px; border-radius: ' + Math.round(imageSize * 0.2) + 'px;" alt="Cookie Settings" />';
        
        // Debug: mostrar configuración en el navegador
        console.log('[CMP] 🎯 Configuración del icono flotante:', {
          position: '${position}',
          color: '${color}',
          enabled: ${enabled},
          backgroundColor: '${backgroundColor}',
          size: iconSize,
          positionStyles: '${positionStyles}'
        });
        
        // Determinar dirección de animación según posición
        const animationClass = '${position}'.includes('top') ? 'floatInFromTop' : 'floatInFromBottom';
        
        // Configurar color de fondo
        const backgroundStyle = '${backgroundColor}' === 'transparent' || '${backgroundColor}' === '' || '${backgroundColor}' === 'none' 
          ? 'transparent' 
          : '${backgroundColor}';
        
        icon.style.cssText = \`
          position: fixed;
          ${positionStyles}
          width: \${iconSize}px;
          height: \${iconSize}px;
          cursor: pointer;
          z-index: 2147483649;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          animation: \${animationClass} 0.5s ease-out;
          animation-fill-mode: both;
          background: \${backgroundStyle} !important;
          background-color: \${backgroundStyle} !important;
          border: none !important;
          border-radius: \${Math.round(iconSize * 0.2)}px;
          box-shadow: \${backgroundStyle !== 'transparent' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
        \`;
        
        // Agregar efectos de hover
        icon.addEventListener('mouseenter', function() {
          const hoverRadius = Math.round(iconSize * 0.3);
          this.style.borderRadius = hoverRadius + 'px';
          this.style.backgroundColor = backgroundStyle;
          this.style.background = backgroundStyle;
          this.style.transform = 'scale(1.1)';
          if (backgroundStyle !== 'transparent') {
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          }
        });
        
        icon.addEventListener('mouseleave', function() {
          const normalRadius = Math.round(iconSize * 0.2);
          this.style.borderRadius = normalRadius + 'px';
          this.style.backgroundColor = backgroundStyle;
          this.style.background = backgroundStyle;
          this.style.transform = 'scale(1)';
          if (backgroundStyle !== 'transparent') {
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          } else {
            this.style.boxShadow = 'none';
          }
        });
        
        // Agregar animación CSS
        if (!document.getElementById('floating-icon-styles')) {
          const styles = document.createElement('style');
          styles.id = 'floating-icon-styles';
          styles.textContent = \`
            @keyframes floatInFromBottom {
              from {
                transform: translateY(100px) scale(0.5);
                opacity: 0;
              }
              to {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            
            @keyframes floatInFromTop {
              from {
                transform: translateY(-100px) scale(0.5);
                opacity: 0;
              }
              to {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            
            #cmp-floating-icon {
              border: none !important;
              outline: none !important;
            }
            
            #cmp-floating-icon:hover {
              transform: scale(1.1) !important;
              border: none !important;
              outline: none !important;
            }
            
          \`;
          document.head.appendChild(styles);
        }
        
        // Event listener para mostrar el banner
        icon.addEventListener('click', function() {
          console.log('[CMP] 🎯 Icono flotante clickeado, mostrando banner...');
          
          // Marcar banner como abierto ANTES de mostrarlo
          window.CMP.isOpen = true;
          
          // Ocultar este icono inmediatamente
          if (window.CMP.floatingIcon) {
            window.CMP.floatingIcon.style.display = 'none';
          }
          
          if (typeof window.CMP.showBannerFromIcon === 'function') {
            window.CMP.showBannerFromIcon();
          } else if (typeof window.CMP.showBanner === 'function') {
            window.CMP.showBanner();
          } else {
            console.log('[CMP] ⚠️ No se encontró función para mostrar banner');
          }
        });
        
        // Agregar al DOM
        document.body.appendChild(icon);
        window.CMP.floatingIcon = icon;
        
        console.log('[CMP] ✅ Icono flotante creado exitosamente');
        return icon;
      };
      
      // Función para mostrar el icono flotante
      window.CMP.showFloatingIcon = function() {
        console.log('[CMP] 🔄 showFloatingIcon() llamada... isOpen:', window.CMP.isOpen);
        
        // Usar la función global de detección de banners
        const bannerVisible = window.CMP.isBannerVisible();
        
        // No mostrar si el banner está realmente visible
        if (bannerVisible || window.CMP.isOpen) {
          console.log('[CMP] ⚠️ Banner está visible/abierto, no se muestra el icono');
          return;
        }
        
        // Si hay consentimiento previo, mostrar el icono independientemente del estado isOpen
        const hasConsent = checkExistingConsent();
        if (hasConsent && !bannerVisible) {
          console.log('[CMP] ✅ Hay consentimiento previo y no hay banner, forzando mostrar icono');
          window.CMP.isOpen = false;
        }
        
        // Solo crear el icono si no existe uno visible
        const existingIcon = document.getElementById('cmp-floating-icon');
        if (existingIcon && existingIcon.style.display !== 'none') {
          console.log('[CMP] ✅ Icono ya está visible, no se recrea');
          return;
        }
        
        // Limpiar iconos existentes
        console.log('[CMP] 🔄 Creando icono con configuración actualizada...');
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 🗑️ Eliminando icono existente...');
          window.CMP.floatingIcon.remove();
          window.CMP.floatingIcon = null;
        }
        
        // También eliminar cualquier icono con ID cmp-floating-icon
        if (existingIcon) {
          console.log('[CMP] 🗑️ Eliminando icono DOM existente...');
          existingIcon.remove();
        }
        
        console.log('[CMP] 🆕 Creando nuevo icono con configuración...');
        window.CMP.createFloatingIcon();
      };
      
      // Función para ocultar el icono flotante
      window.CMP.hideFloatingIcon = function() {
        console.log('[CMP] 🔄 hideFloatingIcon() llamada...');
        
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Ocultando icono flotante...');
          window.CMP.floatingIcon.style.display = 'none';
        }
        
        // También ocultar cualquier icono del DOM
        const existingIcon = document.getElementById('cmp-floating-icon');
        if (existingIcon) {
          existingIcon.style.display = 'none';
        }
      };
      
      // Función para ocultar el icono cuando el banner esté activo
      window.CMP.hideIconWhenBannerActive = function() {
        console.log('[CMP] 🔄 hideIconWhenBannerActive() llamada...');
        
        // Marcar banner como abierto
        window.CMP.isOpen = true;
        
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Ocultando icono porque el banner está activo...');
          window.CMP.floatingIcon.style.display = 'none';
        }
        
        // También ocultar cualquier icono del DOM
        const existingIcon = document.getElementById('cmp-floating-icon');
        if (existingIcon) {
          existingIcon.style.display = 'none';
        }
      };
      
      // Función para mostrar el icono cuando el banner se cierre
      window.CMP.showIconWhenBannerClosed = function() {
        console.log('[CMP] 🔄 showIconWhenBannerClosed() llamada...');
        
        // Marcar banner como cerrado
        window.CMP.isOpen = false;
        
        // Verificar si ya hay consentimiento
        const hasConsent = checkExistingConsent();
        if (!hasConsent) {
          console.log('[CMP] ⚠️ No hay consentimiento, no se muestra el icono');
          return;
        }
        
        // Mostrar el icono existente o crear uno nuevo
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Mostrando icono existente porque el banner se cerró...');
          window.CMP.floatingIcon.style.display = 'flex';
        } else {
          console.log('[CMP] 🆕 Creando nuevo icono porque el banner se cerró...');
          window.CMP.createFloatingIcon();
        }
      };
      
      // Función para mostrar banner desde el icono
      window.CMP.showBannerFromIcon = function() {
        console.log('[CMP] 🔄 showBannerFromIcon() llamada...');
        
        // Cambiar estado: banner abierto
        window.CMP.isOpen = true;
        console.log('[CMP] 📝 Banner marcado como abierto (isOpen = true)');
        
        // Ocultar el icono mientras el banner está activo
        window.CMP.hideIconWhenBannerActive();
        
        // Mostrar el banner
        if (typeof window.CMP.showBanner === 'function') {
          window.CMP.showBanner();
        } else {
          console.log('[CMP] ⚠️ Función showBanner no disponible');
        }
      };
      
      // Función para interceptar las funciones del CMP cuando estén disponibles
      window.CMP.setupFloatingIconInterceptors = function() {
        console.log('[CMP] 🔗 Configurando interceptores del icono flotante...');
        
        // Interceptar showBanner para marcar como abierto
        if (typeof window.CMP.showBanner === 'function' && !window.CMP._showBannerIntercepted) {
          const originalShowBanner = window.CMP.showBanner;
          
          window.CMP.showBanner = function() {
            console.log('[CMP] 🔄 showBanner interceptado, marcando banner como abierto...');
            
            // Marcar banner como abierto
            window.CMP.isOpen = true;
            console.log('[CMP] 📝 Banner marcado como abierto (isOpen = true)');
            
            // Ocultar el icono mientras el banner está activo
            window.CMP.hideIconWhenBannerActive();
            
            // Ejecutar la función original
            return originalShowBanner.apply(this, arguments);
          };
          
          window.CMP._showBannerIntercepted = true;
          console.log('[CMP] ✅ showBanner interceptado exitosamente');
        }
        
        // Interceptar hideBanner para marcar como cerrado
        if (typeof window.CMP.hideBanner === 'function' && !window.CMP._hideBannerIntercepted) {
          const originalHideBanner = window.CMP.hideBanner;
          
          window.CMP.hideBanner = function() {
            console.log('[CMP] 🔄 hideBanner interceptado, marcando banner como cerrado...');
            
            // Ejecutar la función original
            var result = originalHideBanner.apply(this, arguments);
            
            // Marcar banner como cerrado
            window.CMP.isOpen = false;
            console.log('[CMP] 📝 Banner marcado como cerrado (isOpen = false)');
            
            // Mostrar el icono después de cerrar el banner
            setTimeout(function() {
              console.log('[CMP] 🎯 Mostrando icono después de hideBanner...');
              window.CMP.showIconWhenBannerClosed();
            }, 100);
            
            return result;
          };
          
          window.CMP._hideBannerIntercepted = true;
          console.log('[CMP] ✅ hideBanner interceptado exitosamente');
        }
        
        // Interceptar acceptAll para marcar como cerrado
        if (typeof window.CMP.acceptAll === 'function' && !window.CMP._acceptAllIntercepted) {
          var originalAcceptAll = window.CMP.acceptAll;
          
          window.CMP.acceptAll = function() {
            console.log('[CMP] 🔄 acceptAll interceptado...');
            
            // Ejecutar la función original
            var result = originalAcceptAll.apply(this, arguments);
            
            // Marcar banner como cerrado
            window.CMP.isOpen = false;
            console.log('[CMP] 📝 Banner marcado como cerrado (isOpen = false)');
            
            // Mostrar el icono después de aceptar
            setTimeout(function() {
              console.log('[CMP] 🎯 Mostrando icono después de acceptAll...');
              window.CMP.showIconWhenBannerClosed();
            }, 800);
            
            return result;
          };
          
          window.CMP._acceptAllIntercepted = true;
          console.log('[CMP] ✅ acceptAll interceptado exitosamente');
        }
        
        // Interceptar rejectAll para marcar como cerrado
        if (typeof window.CMP.rejectAll === 'function' && !window.CMP._rejectAllIntercepted) {
          var originalRejectAll = window.CMP.rejectAll;
          
          window.CMP.rejectAll = function() {
            console.log('[CMP] 🔄 rejectAll interceptado...');
            
            // Ejecutar la función original
            var result = originalRejectAll.apply(this, arguments);
            
            // Marcar banner como cerrado
            window.CMP.isOpen = false;
            console.log('[CMP] 📝 Banner marcado como cerrado (isOpen = false)');
            
            // Mostrar el icono después de rechazar
            setTimeout(function() {
              console.log('[CMP] 🎯 Mostrando icono después de rejectAll...');
              window.CMP.showIconWhenBannerClosed();
            }, 800);
            
            return result;
          };
          
          window.CMP._rejectAllIntercepted = true;
          console.log('[CMP] ✅ rejectAll interceptado exitosamente');
        }
        
        // Interceptar savePreferences para marcar como cerrado
        if (typeof window.CMP.savePreferences === 'function' && !window.CMP._savePreferencesIntercepted) {
          var originalSavePreferences = window.CMP.savePreferences;
          
          window.CMP.savePreferences = function() {
            console.log('[CMP] 🔄 savePreferences interceptado...');
            
            // Ejecutar la función original
            var result = originalSavePreferences.apply(this, arguments);
            
            // Marcar banner como cerrado
            window.CMP.isOpen = false;
            console.log('[CMP] 📝 Banner marcado como cerrado (isOpen = false)');
            
            // Mostrar el icono después de guardar preferencias
            setTimeout(function() {
              console.log('[CMP] 🎯 Mostrando icono después de savePreferences...');
              window.CMP.showIconWhenBannerClosed();
            }, 800);
            
            return result;
          };
          
          window.CMP._savePreferencesIntercepted = true;
          console.log('[CMP] ✅ savePreferences interceptado exitosamente');
        }
        
        console.log('[CMP] 🔍 Estado de interceptores:', {
          showBanner: window.CMP._showBannerIntercepted || false,
          hideBanner: window.CMP._hideBannerIntercepted || false,
          acceptAll: window.CMP._acceptAllIntercepted || false,
          rejectAll: window.CMP._rejectAllIntercepted || false,
          savePreferences: window.CMP._savePreferencesIntercepted || false
        });
      };
      
      // Intentar configurar interceptores múltiples veces
      var interceptorAttempts = 0;
      var maxInterceptorAttempts = 10;
      
      function trySetupInterceptors() {
        interceptorAttempts++;
        console.log('[CMP] 🔄 Intento #' + interceptorAttempts + ' de configurar interceptores...');
        
        if (typeof window.CMP.setupFloatingIconInterceptors === 'function') {
          window.CMP.setupFloatingIconInterceptors();
        }
        
        // Continuar intentando si no hemos interceptado todas las funciones
        var interceptedCount = 0;
        if (window.CMP._showBannerIntercepted) interceptedCount++;
        if (window.CMP._hideBannerIntercepted) interceptedCount++;
        if (window.CMP._acceptAllIntercepted) interceptedCount++;
        if (window.CMP._rejectAllIntercepted) interceptedCount++;
        if (window.CMP._savePreferencesIntercepted) interceptedCount++;
        
        console.log('[CMP] 📊 Funciones interceptadas:', interceptedCount + '/5');
        
        if (interceptedCount < 3 && interceptorAttempts < maxInterceptorAttempts) {
          setTimeout(trySetupInterceptors, 1500);
        } else {
          console.log('[CMP] 🏁 Configuración de interceptores completada. Interceptadas:', interceptedCount);
        }
      }
      
      // Iniciar intentos de interceptores
      setTimeout(trySetupInterceptors, 500);
      setTimeout(trySetupInterceptors, 2000);
      setTimeout(trySetupInterceptors, 5000);
      
      // Función para verificar que las funciones están disponibles
      window.CMP.verifyFloatingIconFunctions = function() {
        console.log('[CMP] 🔍 Verificando disponibilidad de funciones del icono flotante...');
        const functions = ['createFloatingIcon', 'showFloatingIcon', 'hideFloatingIcon', 'showBannerFromIcon', 'testFloatingIcon'];
        let available = 0;
        
        functions.forEach(function(funcName) {
          if (typeof window.CMP[funcName] === 'function') {
            console.log('[CMP] ✅ Función disponible:', funcName);
            available++;
          } else {
            console.log('[CMP] ❌ Función NO disponible:', funcName);
          }
        });
        
        console.log('[CMP] 📊 Funciones disponibles:', available + '/' + functions.length);
        return available === functions.length;
      };
      
      // Auto-test inicial para mostrar el icono si el banner ya está cerrado
      function initialFloatingIconCheck() {
        console.log('[CMP] 🧪 Verificación inicial del icono flotante...');
        
        // Verificar funciones
        window.CMP.verifyFloatingIconFunctions();
        
        // Verificar si ya existe consentimiento previo
        const hasConsent = checkExistingConsent();
        console.log('[CMP] 🔍 Consentimiento previo detectado:', hasConsent);
        
        // Si no hay banner visible y no está marcado como abierto, mostrar icono
        const bannerElement = document.querySelector('[data-testid="cookie-banner"], #cookie-banner, .cookie-banner, [id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"], #cmp-banner');
        const bannerVisible = bannerElement && bannerElement.style.display !== 'none' && bannerElement.offsetParent !== null;
        
        console.log('[CMP] 🔍 Banner visible:', bannerVisible);
        console.log('[CMP] 🔍 isOpen actual:', window.CMP.isOpen);
        
        if (!bannerVisible && hasConsent) {
          // Si hay consentimiento y no hay banner, mostrar icono
          window.CMP.isOpen = false;
          console.log('[CMP] ✅ Hay consentimiento previo y no hay banner, mostrando icono flotante...');
          setTimeout(function() {
            window.CMP.showFloatingIcon();
          }, 2000);
        } else if (!bannerVisible && !window.CMP.isOpen) {
          // Si no hay banner visible y no está marcado como abierto, mostrar icono
          console.log('[CMP] ✅ No hay banner visible, mostrando icono flotante...');
          setTimeout(function() {
            window.CMP.showFloatingIcon();
          }, 2000);
        } else if (bannerVisible) {
          console.log('[CMP] 📝 Banner visible detectado, marcando como abierto...');
          window.CMP.isOpen = true;
        }
      }
      
      // Función para verificar si ya existe consentimiento
      function checkExistingConsent() {
        // Verificar cookies de consentimiento
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'euconsent-v2' || name === 'cmp-consent' || name.includes('consent')) {
            if (value && value !== '' && value !== 'undefined') {
              return true;
            }
          }
        }
        
        // Verificar localStorage
        try {
          const localConsent = localStorage.getItem('cmp-consent') || localStorage.getItem('cookie-consent');
          if (localConsent && localConsent !== 'null') {
            return true;
          }
        } catch (e) {
          console.log('[CMP] No se pudo verificar localStorage:', e);
        }
        
        // Verificar si window.CMP tiene información de consentimiento
        if (window.CMP && window.CMP.consent && Object.keys(window.CMP.consent).length > 0) {
          return true;
        }
        
        return false;
      }
      
      // Función de debug para el estado
      window.CMP.debugFloatingIconState = function() {
        console.log('[CMP] 🔍 === DEBUG DEL ESTADO ===');
        console.log('[CMP] isOpen:', window.CMP.isOpen);
        console.log('[CMP] floatingIcon exists:', !!window.CMP.floatingIcon);
        
        const bannerElement = document.querySelector('[data-testid="cookie-banner"], #cookie-banner, .cookie-banner');
        console.log('[CMP] Banner element found:', !!bannerElement);
        if (bannerElement) {
          console.log('[CMP] Banner display:', bannerElement.style.display);
          console.log('[CMP] Banner offsetParent:', bannerElement.offsetParent);
        }
      };
      
      // Función para forzar el estado cerrado (para debug)
      window.CMP.forceClosedState = function() {
        console.log('[CMP] 🔧 Forzando estado cerrado...');
        window.CMP.isOpen = false;
        window.CMP.showFloatingIcon();
      };
      
      // Función para forzar el estado abierto (para debug)  
      window.CMP.forceOpenState = function() {
        console.log('[CMP] 🔧 Forzando estado abierto...');
        window.CMP.isOpen = true;
        window.CMP.hideFloatingIcon();
      };
      
      // ===============================
      // OBSERVADOR DE CAMBIOS DEL DOM
      // ===============================
      
      // Configurar MutationObserver para detectar banners que aparecen/desaparecen
      window.CMP.setupBannerObserver = function() {
        console.log('[CMP] 🔍 Configurando observador de banners...');
        
        if (window.CMP._bannerObserver) {
          console.log('[CMP] ⚠️ Observador ya configurado, saltando...');
          return;
        }
        
        const observer = new MutationObserver(function(mutations) {
          let shouldCheck = false;
          
          mutations.forEach(function(mutation) {
            // Verificar si se agregaron/removieron nodos
            if (mutation.type === 'childList') {
              // Verificar nodos agregados
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                  const element = node;
                  // Verificar si el elemento o sus hijos son banners
                  if (element.id && (element.id.includes('cookie') || element.id.includes('consent') || element.id.includes('banner'))) {
                    console.log('[CMP] 👁️ Banner agregado al DOM:', element.id);
                    shouldCheck = true;
                  }
                  if (element.className && typeof element.className === 'string' && 
                      (element.className.includes('cookie') || element.className.includes('consent') || element.className.includes('banner'))) {
                    console.log('[CMP] 👁️ Banner con clase agregado al DOM:', element.className);
                    shouldCheck = true;
                  }
                  
                  // Verificar elementos hijos
                  const childBanners = element.querySelectorAll && element.querySelectorAll('[id*="cookie"], [id*="consent"], [id*="banner"], [class*="cookie"], [class*="consent"], [class*="banner"]');
                  if (childBanners && childBanners.length > 0) {
                    console.log('[CMP] 👁️ Elementos banner detectados en nodo agregado:', childBanners.length);
                    shouldCheck = true;
                  }
                }
              });
              
              // Verificar nodos removidos
              mutation.removedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                  const element = node;
                  if (element.id && (element.id.includes('cookie') || element.id.includes('consent') || element.id.includes('banner'))) {
                    console.log('[CMP] 👁️ Banner removido del DOM:', element.id);
                    shouldCheck = true;
                  }
                }
              });
            }
            
            // Verificar cambios de atributos (como style, class)
            if (mutation.type === 'attributes') {
              const element = mutation.target;
              if (element.id && (element.id.includes('cookie') || element.id.includes('consent') || element.id.includes('banner'))) {
                console.log('[CMP] 👁️ Atributos de banner cambiados:', element.id, 'atributo:', mutation.attributeName);
                shouldCheck = true;
              }
              if (element.className && typeof element.className === 'string' && 
                  (element.className.includes('cookie') || element.className.includes('consent') || element.className.includes('banner'))) {
                console.log('[CMP] 👁️ Atributos de banner con clase cambiados:', element.className, 'atributo:', mutation.attributeName);
                shouldCheck = true;
              }
            }
          });
          
          // Verificar estado del icono si se detectaron cambios relevantes
          if (shouldCheck) {
            console.log('[CMP] 🔄 Cambios detectados, verificando estado del icono...');
            setTimeout(function() {
              const bannerVisible = window.CMP.isBannerVisible();
              
              if (bannerVisible && window.CMP.floatingIcon && window.CMP.floatingIcon.style.display !== 'none') {
                console.log('[CMP] 🙈 Banner ahora visible, ocultando icono...');
                window.CMP.hideFloatingIcon();
                window.CMP.isOpen = true;
              } else if (!bannerVisible && (!window.CMP.floatingIcon || window.CMP.floatingIcon.style.display === 'none')) {
                console.log('[CMP] 👁️ Banner ahora oculto, mostrando icono...');
                window.CMP.isOpen = false;
                window.CMP.showFloatingIcon();
              }
            }, 100); // Pequeño delay para que se complete la mutación
          }
        });
        
        // Observar todo el document
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'id']
        });
        
        window.CMP._bannerObserver = observer;
        console.log('[CMP] ✅ Observador de banners configurado exitosamente');
      };
      
      // Configurar observador cuando el DOM esté listo
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.CMP.setupBannerObserver);
      } else {
        window.CMP.setupBannerObserver();
      }
      
      // IMPORTANTE: Ejecutar inmediatamente al cargar
      console.log('[CMP] 🚀 Código del icono flotante cargado con control de estado isOpen y observador del DOM');
      
      // Verificar funciones inmediatamente
      if (typeof window.CMP.verifyFloatingIconFunctions === 'function') {
        window.CMP.verifyFloatingIconFunctions();
      }
      
      // FORZAR registro de funciones en window.CMP
      console.log('[CMP] 🔧 Forzando registro de funciones en window.CMP...');
      console.log('[CMP] - createFloatingIcon:', typeof window.CMP.createFloatingIcon);
      console.log('[CMP] - showFloatingIcon:', typeof window.CMP.showFloatingIcon);
      console.log('[CMP] - hideFloatingIcon:', typeof window.CMP.hideFloatingIcon);
      
      // Ejecutar verificación inicial en varios momentos
      setTimeout(initialFloatingIconCheck, 1000);  // Primera verificación rápida
      setTimeout(initialFloatingIconCheck, 3000);  // Segunda verificación después de carga completa
      setTimeout(initialFloatingIconCheck, 5000);  // Tercera verificación final
      
      // Verificación periódica cada 10 segundos (solo las primeras 3 veces)
      let periodicChecks = 0;
      const periodicInterval = setInterval(function() {
        periodicChecks++;
        console.log('[CMP] 🔄 Verificación periódica #' + periodicChecks);
        initialFloatingIconCheck();
        
        if (periodicChecks >= 3) {
          clearInterval(periodicInterval);
          console.log('[CMP] 🏁 Verificaciones periódicas completadas');
        }
      }, 10000);
    `;
  }
}

module.exports = new CookieIconService();