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
    const { baseUrl = 'http://localhost:3000' } = options;

    return `
      // ===============================
      // FLOATING ICON FUNCTIONALITY
      // ===============================
      
      // Variables globales para el icono flotante
      window.CMP = window.CMP || {};
      window.CMP.floatingIcon = null;
      window.CMP.isOpen = false; // Variable para controlar si el banner está abierto
      
      // Función para crear el icono flotante
      window.CMP.createFloatingIcon = function() {
        console.log('[CMP] 🔄 Intentando crear icono flotante... isOpen:', window.CMP.isOpen);
        
        // No mostrar si el banner está abierto
        if (window.CMP.isOpen) {
          console.log('[CMP] ⚠️ Banner está abierto, no se muestra el icono');
          return null;
        }
        
        // Evitar duplicados
        if (window.CMP.floatingIcon) {
          console.log('[CMP] ⚠️ Icono flotante ya existe, eliminando el anterior...');
          window.CMP.floatingIcon.remove();
          window.CMP.floatingIcon = null;
        }
        
        // Crear el icono
        const icon = document.createElement('div');
        icon.id = 'cookie-floating-icon';
        icon.innerHTML = '<img src="${baseUrl}/icon.ico" width="40" height="40" style="width: 40px; height: 40px; border-radius: 8px;" alt="Cookie Settings" />';
        icon.style.cssText = \`
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          cursor: pointer;
          z-index: 2147483649;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          animation: floatIn 0.5s ease-out;
        \`;
        
        // Agregar efectos de hover
        icon.addEventListener('mouseenter', function() {
          this.style.borderRadius = '12px';
          this.style.backgroundColor = 'transparent';
          this.style.transform = 'scale(1.1)';
        });
        
        icon.addEventListener('mouseleave', function() {
          this.style.borderRadius = '0';
          this.style.backgroundColor = 'transparent';
          this.style.transform = 'scale(1)';
        });
        
        // Agregar animación CSS
        if (!document.getElementById('floating-icon-styles')) {
          const styles = document.createElement('style');
          styles.id = 'floating-icon-styles';
          styles.textContent = \`
            @keyframes floatIn {
              from {
                transform: translateY(100px) scale(0.5);
                opacity: 0;
              }
              to {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            
            #cookie-floating-icon:hover {
              transform: scale(1.1);
              background: transparent !important;
            }
            
          \`;
          document.head.appendChild(styles);
        }
        
        // Event listener para mostrar el banner
        icon.addEventListener('click', function() {
          console.log('[CMP] 🎯 Icono flotante clickeado, mostrando banner...');
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
        
        // Verificar si el banner está realmente visible
        const bannerElement = document.querySelector('#cmp-banner, [id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"]');
        const bannerVisible = bannerElement && bannerElement.style.display !== 'none' && bannerElement.offsetParent !== null;
        
        // No mostrar si el banner está realmente visible
        if (bannerVisible && window.CMP.isOpen) {
          console.log('[CMP] ⚠️ Banner está visible y abierto, no se muestra el icono');
          return;
        }
        
        // Si hay consentimiento previo, mostrar el icono independientemente del estado isOpen
        const hasConsent = checkExistingConsent();
        if (hasConsent && !bannerVisible) {
          console.log('[CMP] ✅ Hay consentimiento previo y no hay banner, forzando mostrar icono');
          window.CMP.isOpen = false;
        }
        
        if (!window.CMP.floatingIcon) {
          console.log('[CMP] 📝 Icono no existe, creándolo...');
          window.CMP.createFloatingIcon();
        } else {
          console.log('[CMP] 👁️ Mostrando icono existente...');
          window.CMP.floatingIcon.style.display = 'flex';
        }
      };
      
      // Función para ocultar el icono flotante
      window.CMP.hideFloatingIcon = function() {
        console.log('[CMP] 🔄 hideFloatingIcon() llamada...');
        
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Ocultando icono flotante...');
          window.CMP.floatingIcon.style.display = 'none';
        }
      };
      
      // Función para ocultar el icono cuando el banner esté activo
      window.CMP.hideIconWhenBannerActive = function() {
        console.log('[CMP] 🔄 hideIconWhenBannerActive() llamada...');
        
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Ocultando icono porque el banner está activo...');
          window.CMP.floatingIcon.style.display = 'none';
        }
      };
      
      // Función para mostrar el icono cuando el banner se cierre
      window.CMP.showIconWhenBannerClosed = function() {
        console.log('[CMP] 🔄 showIconWhenBannerClosed() llamada...');
        
        if (window.CMP.floatingIcon) {
          console.log('[CMP] 👁️ Mostrando icono porque el banner se cerró...');
          window.CMP.floatingIcon.style.display = 'flex';
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
      
      // IMPORTANTE: Ejecutar inmediatamente al cargar
      console.log('[CMP] 🚀 Código del icono flotante cargado con control de estado isOpen');
      
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