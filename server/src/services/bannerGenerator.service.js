// services/bannerGenerator.service.js

const cleanCSS = require('clean-css');
const logger = require('../utils/logger');
const TemplateVariablesService = require('./templateVariables.service');

class BannerGeneratorService {
  /**
   * Genera el HTML del banner a partir de config.
   */
  async generateHTML(config, clientInfo = null) {
    try {
      let { layout = {}, components = [] } = config;
      
      console.log('🚀 BannerGenerator.generateHTML - INICIO DEBUG:', {
        configExists: !!config,
        layoutExists: !!layout,
        originalComponentsLength: components.length,
        clientInfoExists: !!clientInfo,
        clientName: clientInfo?.name || clientInfo?.businessName
      });
      
      // Procesar componentes con variables del cliente si existe clientInfo
      if (clientInfo && components.length > 0) {
        console.log('🔄 BannerGenerator: Procesando variables con clientInfo:', {
          razonsocial: clientInfo.businessName || clientInfo.razonSocial,
          email: clientInfo.email
        });
        const context = TemplateVariablesService.createContextFromClient(clientInfo);
        components = TemplateVariablesService.processBannerComponents(components, context);
        
        console.log('📋 BannerGenerator: DESPUES de procesar variables:', {
          processedComponentsLength: components.length,
          firstComponentType: components[0]?.type,
          componentsTypes: components.map(c => c.type)
        });
        
        // Debug: Verificar si se procesaron las variables
        const hasVariables = JSON.stringify(components).includes('{razonsocial}');
        console.log('✅ BannerGenerator: Variables procesadas, aún contiene {razonsocial}:', hasVariables);
      }
      
      // Usar configuración desktop por defecto, pero considerar todas las configuraciones responsive
      const layoutConfig = layout.desktop || {
        type: 'banner',
        position: 'bottom'
      };
      
      // También extraer configuraciones de tablet y mobile para datos HTML
      const tabletConfig = layout.tablet || {};
      const mobileConfig = layout.mobile || {};
      
      console.log('🎨 BannerGenerator: Layout config:', {
        desktop: { type: layoutConfig.type, position: layoutConfig.position },
        tablet: { type: tabletConfig.type, position: tabletConfig.position },
        mobile: { type: mobileConfig.type, position: mobileConfig.position }
      });
      
      
      if (components.length === 0) {
        console.warn("⚠️ No hay componentes en el template, usando banner básico");
        // Proporcionar un banner básico cuando no hay componentes
        return `
          <div 
            id="cmp-banner" 
            class="cmp-banner cmp-banner--${layoutConfig.type}" 
            data-position="${layoutConfig.position}"
            data-tablet-type="${tabletConfig.type || layoutConfig.type}"
            data-tablet-position="${tabletConfig.position || layoutConfig.position}"
            data-mobile-type="${mobileConfig.type || layoutConfig.type}"
            data-mobile-position="${mobileConfig.position || layoutConfig.position}"
            role="dialog"
            aria-labelledby="cmp-title"
            aria-describedby="cmp-description"
          >
            <div style="flex:1">
              <p style="margin:0">Este sitio utiliza cookies para mejorar tu experiencia.</p>
            </div>
            <div style="display:flex;gap:10px">
              <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
              <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
            </div>
          </div>
        `;
      }
      
      // Procesar los componentes y generar el HTML
      const componentsHTML = this._generateComponentsHTML(components, clientInfo);
      
      console.log('🏗️ BannerGenerator: HTML de componentes generado:', {
        componentsHTMLLength: componentsHTML.length,
        componentsHTMLPreview: componentsHTML.substring(0, 200) + '...',
        isEmpty: !componentsHTML || componentsHTML.trim() === ''
      });
      
      // Asegurémonos de que el banner modal tenga una estructura más robusta para mejor centrado
      let baseHtml = '';
      
      if (layoutConfig.type === 'modal') {
        // SOLUCIÓN MEJORADA PARA MODALES CENTRADOS
        // Estructura simplificada con flexbox para centrado perfecto
        // Añadiendo algunos atributos y estilos adicionales para mejorar el centrado
        // Determinar posición del modal según la configuración
        const modalPosition = layoutConfig.position || 'center';
        let modalContainerStyle = `position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100vw !important; height:100vh !important; background-color:rgba(0,0,0,0.5) !important; z-index:2147483646 !important; opacity:1 !important; visibility:visible !important; margin:0 !important; padding:0 !important; pointer-events:auto !important; transform:none !important;`;
        
        // Ajustar alineación según la posición configurada
        if (modalPosition === 'center') {
          modalContainerStyle += `display:flex !important; align-items:center !important; justify-content:center !important;`;
        } else if (modalPosition === 'top') {
          modalContainerStyle += `display:flex !important; align-items:flex-start !important; justify-content:center !important; padding-top:5vh !important;`;
        } else if (modalPosition === 'bottom') {
          modalContainerStyle += `display:flex !important; align-items:flex-end !important; justify-content:center !important; padding-bottom:5vh !important;`;
        } else {
          // Para posiciones específicas como top-left, top-right, etc.
          modalContainerStyle += `display:block !important;`;
        }
        
        baseHtml = `
          <div 
            id="cmp-modal-container" 
            class="cmp-modal-container"
            data-cmp-role="modal-container"
            data-cmp-z-index="2147483646"
            data-cmp-version="2.0"
            data-position="${modalPosition}"
            style="${modalContainerStyle}">
            <div 
              id="cmp-banner" 
              class="cmp-banner cmp-banner--${layoutConfig.type}"
              data-position="${layoutConfig.position}"
              data-tablet-type="${tabletConfig.type || layoutConfig.type}"
              data-tablet-position="${tabletConfig.position || layoutConfig.position}"
              data-mobile-type="${mobileConfig.type || layoutConfig.type}"
              data-mobile-position="${mobileConfig.position || layoutConfig.position}"
              data-cmp-role="modal-content"
              data-cmp-z-index="2147483647"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cmp-title"
              aria-describedby="cmp-description"
              style="border-radius:8px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important; width:60% !important; min-width:40% !important; max-width:90% !important; padding:20px !important; position:relative !important; z-index:2147483647 !important; opacity:1 !important; visibility:visible !important; display:block !important; max-height:90vh !important; overflow-y:auto !important; margin:0 auto !important; left:auto !important; right:auto !important; top:auto !important; bottom:auto !important; transform:none !important; text-align:center !important; pointer-events:auto !important;"
              data-width="60"
            >
              <div class="cmp-banner-content-wrapper">
                ${componentsHTML}
              </div>
              ${config.showBranding !== false ? `
                <div class="cmp-branding-footer">
                  <span>Desarrollado por </span>
                  <a href="https://cookie21.com" target="_blank" rel="noopener">Cookie21</a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        // Aplicar estilos específicos según el tipo de banner
        let bannerStyle = '';
        let extraAttributes = '';
        
        if (layoutConfig.type === 'floating') {
          // IMPORTANTE: Estrategia de múltiples fuentes para la esquina
          // 1. Usar floatingCorner si existe (propiedad principal)
          // 2. Usar data-floating-corner si existe (data attribute guardado)
          // 3. Usar position si es una esquina válida
          // 4. Usar bottom-right como valor por defecto
          
          console.log('Generando HTML para banner flotante con config:', layoutConfig);
          
          // Obtener esquina de múltiples fuentes
          let floatingCorner = layoutConfig.floatingCorner;
          
          if (!floatingCorner && layoutConfig['data-floating-corner']) {
            floatingCorner = layoutConfig['data-floating-corner'];
          }
          
          if (!floatingCorner && 
              layoutConfig.position && 
              ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(layoutConfig.position)) {
            floatingCorner = layoutConfig.position;
          }
          
          // Si aún no tenemos un valor, usar por defecto
          if (!floatingCorner) {
            floatingCorner = 'bottom-right';
          }
          
          // ESTRATEGIA SIMILAR PARA EL MARGEN
          // 1. Usar floatingMargin si existe (propiedad principal)
          // 2. Usar data-floating-margin si existe (data attribute guardado)
          // 3. Usar valor por defecto
          
          let floatingMargin = layoutConfig.floatingMargin;
          
          if (!floatingMargin && layoutConfig['data-floating-margin']) {
            floatingMargin = layoutConfig['data-floating-margin'];
          }
          
          if (!floatingMargin) {
            floatingMargin = '20';
          }
          
          // Validar que el margen sea un número válido
          let marginValue = parseInt(floatingMargin);
          if (isNaN(marginValue) || marginValue < 0) marginValue = 20;
          
          // Agregar atributos para posicionamiento
          // IMPORTANTE: Usar múltiples atributos para máxima compatibilidad
          extraAttributes = `
            data-floating-corner="${floatingCorner}"
            data-floating-margin="${marginValue}"
            data-position="${floatingCorner}"
            floatingCorner="${floatingCorner}"
            floatingMargin="${marginValue}"
          `;
          
          console.log(`Banner flotante configurado con esquina: ${floatingCorner}, margen: ${marginValue}px`);
          
          // Estilos base para banners flotantes - SOLO ESTILOS ESTÉTICOS
          // El posicionamiento será aplicado ÚNICAMENTE por ensureFloatingPosition.js
          // NO incluimos position:fixed aquí para evitar conflictos
          bannerStyle = 'width:50% !important; min-width:40% !important; max-width:70% !important; border-radius:8px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important;';
          
          // Importante: NO aplicamos posicionamiento aquí
          // Esto evita conflictos con el wrapper que implementa el posicionamiento
          
          // IMPORTANTE: Guardamos la posición en atributos pero NO en estilos inline
          // Esto permite que el script cliente determine completamente la posición
        } else {
          // Banner estándar (no modal, no flotante)
          bannerStyle = 'width:100% !important; min-width:100% !important; max-width:100% !important;';
        }
        
        // Para banners flotantes, creamos un HTML con estilo mínimo para evitar conflictos
        if (layoutConfig.type === 'floating') {
          baseHtml = `
            <div 
              id="cmp-banner" 
              class="cmp-banner cmp-banner--${layoutConfig.type}" 
              data-position="${layoutConfig.position}"
              data-tablet-type="${tabletConfig.type || layoutConfig.type}"
              data-tablet-position="${tabletConfig.position || layoutConfig.position}"
              data-mobile-type="${mobileConfig.type || layoutConfig.type}"
              data-mobile-position="${mobileConfig.position || layoutConfig.position}"
              ${extraAttributes}
              role="dialog"
              aria-labelledby="cmp-title"
              aria-describedby="cmp-description"
              style="border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.4);"
              data-width="50"
            >
              <div class="cmp-banner-content-wrapper">
                ${componentsHTML}
              </div>
              ${config.showBranding !== false ? `
                <div class="cmp-branding-footer">
                  <span>Desarrollado por </span>
                  <a href="https://cookie21.com" target="_blank" rel="noopener">Cookie21</a>
                </div>
              ` : ''}
            </div>
          `;
        } else {
          // Para otros tipos de banner (modal, estándar), mantener el comportamiento original
          baseHtml = `
            <div 
              id="cmp-banner" 
              class="cmp-banner cmp-banner--${layoutConfig.type}" 
              data-position="${layoutConfig.position}"
              data-tablet-type="${tabletConfig.type || layoutConfig.type}"
              data-tablet-position="${tabletConfig.position || layoutConfig.position}"
              data-mobile-type="${mobileConfig.type || layoutConfig.type}"
              data-mobile-position="${mobileConfig.position || layoutConfig.position}"
              ${extraAttributes}
              role="dialog"
              aria-labelledby="cmp-title"
              aria-describedby="cmp-description"
              style="${bannerStyle}"
              data-width="${layoutConfig.type === 'modal' ? '60' : '100'}"
            >
              <div class="cmp-banner-content-wrapper">
                ${componentsHTML}
              </div>
              ${config.showBranding !== false ? `
                <div class="cmp-branding-footer">
                  <span>Desarrollado por </span>
                  <a href="https://cookie21.com" target="_blank" rel="noopener">Cookie21</a>
                </div>
              ` : ''}
            </div>
          `;
        }
      }
      
      console.log('📏 BannerGenerator: HTML base antes de minificar:', {
        baseHtmlLength: baseHtml.length,
        baseHtmlPreview: baseHtml.substring(0, 300) + '...',
        isEmpty: !baseHtml || baseHtml.trim() === ''
      });
      
      const minifiedHtml = this._minifyHTML(baseHtml);
      
      console.log('📦 BannerGenerator: HTML final minificado:', {
        minifiedHtmlLength: minifiedHtml.length,
        minifiedHtmlPreview: minifiedHtml.substring(0, 200) + '...'
      });
      
      return minifiedHtml;
    } catch (error) {
      console.error('❌ Error generating banner HTML:', error);
      
      // Generar HTML alternativo básico
      const fallbackHtml = `
        <div 
          id="cmp-banner" 
          class="cmp-banner" 
          role="dialog"
        >
          <div style="flex:1">
            <p style="margin:0">Este sitio utiliza cookies para mejorar tu experiencia.</p>
          </div>
          <div style="display:flex;gap:10px">
            <button data-cmp-action="reject_all" style="background:#f44336;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Rechazar</button>
            <button data-cmp-action="accept_all" style="background:#4CAF50;color:white;border:none;padding:8px 15px;cursor:pointer;border-radius:4px;">Aceptar</button>
          </div>
        </div>
      `;
      
      
      return fallbackHtml;
    }
  }

  /**
   * Genera el CSS del banner (minificado).
   */
  async generateCSS(config) {
    try {
      const { theme, layout = {}, components = [] } = config;
      
      const baseStyles = this._generateBaseStyles(theme);
      const layoutStyles = this._generateLayoutStyles(layout);
      const componentStyles = this._generateComponentStyles(components, theme);
      const animationStyles = this._generateAnimationStyles(config.settings?.animation);
      const accessibilityStyles = this._generateAccessibilityStyles();
      const responsiveHelpers = this._generateResponsiveHelpers();
      const brandingStyles = this._generateBrandingStyles(config, theme, layout);

      const css = [
        baseStyles,
        layoutStyles,
        componentStyles,
        animationStyles,
        accessibilityStyles,
        responsiveHelpers,
        brandingStyles
      ].join('\n');

      return new cleanCSS({ level: 2, compatibility: 'ie11' }).minify(css).styles;
    } catch (error) {
      logger.error('Error generating banner CSS:', error);
      throw error;
    }
  }

  /**
   * Transforma un array de componentes en HTML.
   */
  _generateComponentsHTML(components, clientInfo = null) {
    if (!components || !Array.isArray(components)) {
      return '';
    }
    
    // Procesar componentes con variables del cliente si existe clientInfo
    let processedComponents = components;
    if (clientInfo) {
      const context = TemplateVariablesService.createContextFromClient(clientInfo);
      processedComponents = TemplateVariablesService.processBannerComponents(components, context);
    }
    
    return processedComponents.map(c => {
      if (!c) return '';
      
      // Extraer el contenido de texto
      let contentText = '';
      
      if (typeof c.content === 'string') {
        contentText = c.content;
      } else if (c.content && c.content.texts) {
        // Usar texto en inglés por defecto o el primer idioma disponible
        contentText = c.content.texts.en || Object.values(c.content.texts)[0] || '';
      } else if (c.content && c.content.text) {
        // Si ya tiene text (posiblemente procesado por _applyLanguagePreference)
        contentText = c.content.text;
      }
      
      // Procesar variables de cliente en el contenido
      if (contentText && clientInfo) {
        contentText = this._processClientVariables(contentText, clientInfo);
      }
      
      // Usar clase adicional 'locked' para componentes bloqueados
      const lockedClass = c.locked ? ' cmp-locked' : '';
      
      // Generar HTML según el tipo
      switch (c.type) {
        case 'text':
          return `
            <div 
              class="cmp-text${lockedClass}" 
              data-component-id="${c.id}"
              ${c.id === 'cmp-description' ? 'id="cmp-description"' : ''}
            >
              ${contentText}
            </div>
          `;
        case 'button':
          return `
            <button 
              class="cmp-button${lockedClass}"
              data-component-id="${c.id}"
              data-cmp-action="${c.action?.type || 'none'}"
              type="button"
              role="button"
              aria-label="${c.action?.type || 'Button'}"
            >
              ${contentText}
            </button>
          `;
        case 'language-button':
          const langDisplayMode = c.content?.displayMode || 'flag-dropdown';
          const defaultLang = c.content?.defaultLanguage || 'es';
          const supportedLanguages = c.content?.supportedLanguages || ['es', 'en', 'fr', 'de', 'it'];
          
          let languageButtonContent;
          switch (langDisplayMode) {
            case 'flag-only':
              languageButtonContent = '🇪🇸';
              break;
            case 'text-only':
              languageButtonContent = defaultLang.toUpperCase();
              break;
            case 'icon-dropdown':
              languageButtonContent = '🌐 ▼';
              break;
            default: // flag-dropdown
              languageButtonContent = '🇪🇸 ▼';
          }
          
          return `
            <div 
              class="cmp-language-button${lockedClass}"
              data-component-id="${c.id}"
              data-cmp-action="language-selector"
              data-display-mode="${langDisplayMode}"
              data-default-language="${defaultLang}"
              data-supported-languages="${supportedLanguages.join(',')}"
              role="button"
              aria-label="Language Selector"
              style="cursor: pointer; position: relative;"
            >
              ${languageButtonContent}
              <div class="language-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; min-width: 120px;">
                ${supportedLanguages.map(lang => {
                  const flags = {
                    'es': '🇪🇸 Español',
                    'en': '🇺🇸 English', 
                    'fr': '🇫🇷 Français',
                    'de': '🇩🇪 Deutsch',
                    'it': '🇮🇹 Italiano',
                    'pt': '🇵🇹 Português',
                    'ru': '🇷🇺 Русский',
                    'zh': '🇨🇳 中文',
                    'ja': '🇯🇵 日本語',
                    'ko': '🇰🇷 한국어'
                  };
                  return `<div class="language-option" data-lang="${lang}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">${flags[lang] || lang.toUpperCase()}</div>`;
                }).join('')}
              </div>
            </div>
          `;
        case 'link':
          return `
            <a 
              class="cmp-link${lockedClass}"
              data-component-id="${c.id}"
              data-cmp-action="${c.action?.type || 'none'}"
              href="#"
              role="button"
              aria-label="${c.action?.type || 'Link'}"
            >
              ${contentText}
            </a>
          `;
        case 'logo':
        case 'image':
          const imgSrc = contentText || '/images/placeholder.png';
          const altText = c.type === 'logo' ? 'Logo' : (c.alt || 'Image');
          
          // Generar estilos inline para el contenedor de la imagen
          let containerStyles = '';
          let imageStyles = '';
          
          // IMPORTANTE: Aplicar posición y tamaño al contenedor
          if (c.style?.desktop) {
            const style = c.style.desktop;
            
            // Estilos para el contenedor div
            if (style.width) containerStyles += `width: ${style.width}; `;
            if (style.height) containerStyles += `height: ${style.height}; `;
            
            // Si es hijo de un contenedor, verificar el modo
            if (c.parentId) {
              // Buscar el contenedor padre para determinar el modo
              const parentContainer = this._findParentContainer(c.parentId, components);
              if (parentContainer && parentContainer.containerConfig?.desktop) {
                const displayMode = parentContainer.containerConfig.desktop.displayMode || 'libre';
                
                if (displayMode === 'libre') {
                  // En modo libre, aplicar posición absoluta
                  if (c.position?.desktop) {
                    containerStyles += 'position: absolute; ';
                    if (c.position.desktop.top) containerStyles += `top: ${c.position.desktop.top}; `;
                    if (c.position.desktop.left) containerStyles += `left: ${c.position.desktop.left}; `;
                    if (c.position.desktop.right) containerStyles += `right: ${c.position.desktop.right}; `;
                    if (c.position.desktop.bottom) containerStyles += `bottom: ${c.position.desktop.bottom}; `;
                  }
                }
                // Para flex/grid, no aplicar position absolute
              }
            } else {
              // Componente raíz, aplicar posición absoluta
              if (c.position?.desktop) {
                containerStyles += 'position: absolute; ';
                if (c.position.desktop.top) containerStyles += `top: ${c.position.desktop.top}; `;
                if (c.position.desktop.left) containerStyles += `left: ${c.position.desktop.left}; `;
                if (c.position.desktop.right) containerStyles += `right: ${c.position.desktop.right}; `;
                if (c.position.desktop.bottom) containerStyles += `bottom: ${c.position.desktop.bottom}; `;
              }
            }
            
            // Estilos para la imagen
            if (style.objectFit) imageStyles += `object-fit: ${style.objectFit}; `;
            if (style.objectPosition) imageStyles += `object-position: ${style.objectPosition}; `;
            // La imagen siempre ocupa el 100% de su contenedor
            imageStyles += 'width: 100%; height: 100%; display: block;';
          }
          
          return `
            <div 
              class="cmp-${c.type}${lockedClass}"
              data-component-id="${c.id}"
              ${containerStyles ? `style="${containerStyles.trim()}"` : ''}
            >
              <img 
                src="${imgSrc}" 
                alt="${altText}" 
                loading="lazy" 
                ${imageStyles ? `style="${imageStyles.trim()}"` : ''}
              />
            </div>
          `;
        case 'checkbox':
          return `
            <label 
              class="cmp-checkbox${lockedClass}"
              data-component-id="${c.id}"
            >
              <input type="checkbox" data-category="${c.action?.category || ''}" />
              <span class="cmp-checkbox-label">${contentText}</span>
            </label>
          `;
        case 'toggle':
          return `
            <label 
              class="cmp-toggle${lockedClass}"
              data-component-id="${c.id}"
            >
              <input type="checkbox" data-category="${c.action?.category || ''}" />
              <span class="cmp-toggle-slider" role="presentation"></span>
              <span class="cmp-toggle-text">${contentText}</span>
            </label>
          `;
        case 'container':
          // Determinar el displayMode desde containerConfig (responsivo) o la propiedad legacy
          const desktopConfig = c.containerConfig?.desktop || {};
          const displayMode = desktopConfig.displayMode || c.displayMode || 'libre';
          
          const containerClasses = ['cmp-container'];
          containerClasses.push(`cmp-container--${displayMode}`);
          if (c.locked) containerClasses.push('cmp-locked');
          
          // Añadir clases específicas para flex y grid
          if (displayMode === 'flex') {
            containerClasses.push('cmp-flex-container');
          } else if (displayMode === 'grid') {
            containerClasses.push('cmp-grid-container');
          }
          
          // Añadir clase para identificar contenedores con hijos
          if (c.children && c.children.length > 0) {
            containerClasses.push('cmp-container--has-children');
          }
          
          // Generar data attributes adicionales para flexbox/grid
          let extraAttributes = '';
          if (displayMode === 'flex') {
            extraAttributes += `data-flex-direction="${desktopConfig.flexDirection || 'row'}"`;
            extraAttributes += ` data-justify-content="${desktopConfig.justifyContent || 'flex-start'}"`;
            extraAttributes += ` data-align-items="${desktopConfig.alignItems || 'flex-start'}"`;
            if (desktopConfig.gap) extraAttributes += ` data-gap="${desktopConfig.gap}"`;
          } else if (displayMode === 'grid') {
            if (desktopConfig.gridTemplateColumns) extraAttributes += ` data-grid-columns="${desktopConfig.gridTemplateColumns}"`;
            if (desktopConfig.gridTemplateRows) extraAttributes += ` data-grid-rows="${desktopConfig.gridTemplateRows}"`;
            if (desktopConfig.gridGap) extraAttributes += ` data-grid-gap="${desktopConfig.gridGap}"`;
          }
          
          return `
            <div 
              class="${containerClasses.join(' ')}"
              data-component-id="${c.id}"
              data-display-mode="${displayMode}"
              data-nesting-level="${desktopConfig.nestingLevel || 0}"
              ${desktopConfig.allowDrops ? 'data-allow-drops="true"' : ''}
              data-container-type="container"
              data-children-count="${c.children?.length || 0}"
              ${extraAttributes}
            >
              ${c.children ? this._generateComponentsHTML(c.children, clientInfo) : ''}
            </div>
          `;
        case 'panel':
          return `
            <div 
              class="cmp-panel${lockedClass}"
              data-component-id="${c.id}"
            >
              <div class="cmp-panel-header">${contentText}</div>
              <div class="cmp-panel-body">
                ${c.children ? this._generateComponentsHTML(c.children, clientInfo) : ''}
              </div>
            </div>
          `;
        default:
          return '';
      }
    }).join('\n');
  }

  /**
   * Genera estilos CSS base para el banner
   */
  _generateBaseStyles(theme) {
    if (!theme) return '';
    
    return `
      /* Estilos base para todos los banners */
      .cmp-banner {
        font-family: ${theme.fontFamily || 'Arial, sans-serif'};
        font-size: ${theme.fontSize || '14px'};
        color: ${theme.textColor || '#333333'};
        display: flex;
        flex-wrap: wrap;
        padding: 15px;
        box-sizing: border-box;
        z-index: 999999;
        pointer-events: auto;
        overscroll-behavior: contain;
      }
      
      /* Reset básico para todos los elementos del CMP */
      .cmp-banner * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* Botones y links */
      .cmp-button {
        background-color: ${theme.primaryColor || '#4285f4'};
        color: ${theme.buttonTextColor || '#ffffff'};
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
        text-align: center;
      }
      
      .cmp-button:hover {
        background-color: ${this._adjustColor(theme.primaryColor || '#4285f4', -20)};
      }
      
      /* Los estilos específicos de cada botón se aplicarán desde _generateComponentStyles */
      
      .cmp-link {
        color: ${theme.linkColor || '#4285f4'};
        text-decoration: underline;
        cursor: pointer;
        font-size: 14px;
      }
      
      .cmp-link:hover {
        color: ${this._adjustColor(theme.linkColor || '#4285f4', -20)};
      }
      
      /* Estilos de checkboxes y toggles */
      .cmp-checkbox, .cmp-toggle {
        display: flex;
        align-items: center;
        margin: 5px 0;
        user-select: none;
      }
      
      .cmp-checkbox input, .cmp-toggle input {
        margin-right: 8px;
      }
      
      .cmp-toggle {
        position: relative;
        padding-left: 50px;
      }
      
      .cmp-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }
      
      .cmp-toggle-slider {
        position: absolute;
        left: 0;
        top: 0;
        width: 40px;
        height: 20px;
        background-color: #ccc;
        border-radius: 34px;
        transition: .3s;
      }
      
      .cmp-toggle-slider:before {
        content: "";
        position: absolute;
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: .3s;
      }
      
      .cmp-toggle input:checked + .cmp-toggle-slider {
        background-color: ${theme.primaryColor || '#4285f4'};
      }
      
      .cmp-toggle input:checked + .cmp-toggle-slider:before {
        transform: translateX(20px);
      }
      
      /* Contenedores */
      .cmp-container {
        position: relative;
        box-sizing: border-box;
        min-height: 40px;
        overflow: visible; /* Permitir que los hijos se vean si salen ligeramente */
        width: 100%; /* Asegurar que ocupe el espacio disponible */
        height: auto; /* Altura automática por defecto */
      }
      
      .cmp-container--libre {
        position: relative;
        overflow: visible; /* En modo libre, permitir posicionamiento libre */
      }
      
      .cmp-container--flex {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: flex-start;
        justify-content: flex-start;
        overflow: visible; /* Permitir que el contenido se vea */
      }
      
      .cmp-container--grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
        align-items: start;
        justify-items: start;
        overflow: visible; /* Permitir que el contenido se vea */
      }
      
      /* Contenedores con hijos */
      .cmp-container--has-children {
        min-height: 60px; /* Un poco más de altura mínima cuando tiene hijos */
      }
      
      /* Flex container específico */
      .cmp-flex-container {
        display: flex;
      }
      
      /* Grid container específico */
      .cmp-grid-container {
        display: grid;
      }
      
      /* Componentes hijos en contenedores flex/grid */
      .cmp-container--flex > *,
      .cmp-flex-container > * {
        position: relative;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      
      .cmp-container--grid > *,
      .cmp-grid-container > * {
        position: relative;
        box-sizing: border-box;
      }
      
      /* Componentes hijos en modo libre mantienen posición absoluta */
      .cmp-container--libre > * {
        position: absolute;
        box-sizing: border-box;
      }
      

      
      /* En contenedores flex/grid, las imágenes pueden tener tamaños específicos */
        .cmp-container--flex .cmp-image,
        .cmp-container--grid .cmp-image,
        .cmp-container--flex .cmp-logo,
        .cmp-container--grid .cmp-logo {
          display: inline-block;
          overflow: hidden;
          /* NO forzar tamaños aquí */
        }

        /* En modo libre, las imágenes mantienen sus dimensiones exactas */
        .cmp-container--libre .cmp-image,
        .cmp-container--libre .cmp-logo {
          display: block;
          overflow: hidden;
          /* NO forzar tamaños aquí */
        }

        /* Solo aplicar max-width como fallback si no hay tamaño definido */
        .cmp-container .cmp-image img:not([style*="width"]),
        .cmp-container .cmp-logo img:not([style*="width"]) {
          max-width: 100%;
        }

        .cmp-container .cmp-image img:not([style*="height"]),
        .cmp-container .cmp-logo img:not([style*="height"]) {
          height: auto;
        }
      
      /* Estilos de depuración (solo en desarrollo) */
      .cmp-container[data-nesting-level="0"] {
        /* Sin borde para contenedores raíz */
      }
      
      .cmp-container[data-nesting-level="1"] {
        /* border: 1px dashed rgba(0, 100, 200, 0.2); */
      }
      
      .cmp-container[data-nesting-level="2"] {
        /* border: 1px dashed rgba(0, 150, 100, 0.2); */
      }
      
      .cmp-container[data-nesting-level="3"] {
        /* border: 1px dashed rgba(200, 100, 0, 0.2); */
      }
      
      .cmp-container[data-nesting-level="4"] {
        /* border: 1px dashed rgba(200, 0, 100, 0.2); */
      }
      
      /* Paneles */
      .cmp-panel {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin: 5px 0;
      }
      
      .cmp-panel-header {
        padding: 10px 15px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        font-weight: bold;
        cursor: pointer;
      }
      
      .cmp-panel-body {
        padding: 15px;
      }
    `;
  }

  /**
   * Genera estilos CSS para cada componente con soporte responsive
   */
  /**
   * Genera estilos para el layout responsive
   */
  _generateLayoutStyles(layout) {
    if (!layout) return '';
    
    // Mapeo de posiciones
    const posMap = {
      top: 'top: 0; left: 0; right: 0;',
      bottom: 'bottom: 0; left: 0; right: 0;',
      center: 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
      'top-left': 'top: 0; left: 0;',
      'top-right': 'top: 0; right: 0;',
      'bottom-left': 'bottom: 0; left: 0;',
      'bottom-right': 'bottom: 0; right: 0;'
    };

    let css = '';

    // Estilos para DESKTOP (base)
    if (layout.desktop) {
      const desktop = layout.desktop;
      const desktopPosCSS = posMap[desktop.position] || posMap.bottom;

      // Para banners con altura 100%, necesitamos configuración especial
      let heightStyles = '';
      if (desktop.height) {
        if (desktop.height === '100%' || desktop.height === '100vh') {
          // Para altura completa, usar viewport height y asegurar que ocupe toda la pantalla
          heightStyles = `
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height para móviles */
            max-height: 100vh;
            overflow-y: auto;
          `;
          // Para banners con 100% altura, dejar que el posMap maneje el posicionamiento
          // Solo agregar posicionamiento adicional para modalse o casos especiales sin posMap
          if (desktop.type === 'modal') {
            heightStyles += 'top: 0; bottom: 0;';
          }
        } else {
          heightStyles = `height: ${desktop.height};`;
        }
      } else {
        heightStyles = 'height: auto;';
      }

      css += `
        .cmp-banner--${desktop.type} {
          position: fixed;
          ${desktopPosCSS}
          width: ${desktop.width || '100%'};
          ${heightStyles}
          background-color: ${desktop.backgroundColor || '#ffffff'};
          ${desktop.minHeight ? `min-height: ${desktop.minHeight};` : ''}
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
      `;
      
      // Añadir sombras específicas según tipo
      if (desktop.type === 'modal') {
        css += `
          /* NUEVA SOLUCIÓN MEJORADA PARA MODALES 2.0 */
          
          /* Contenedor para modal (background overlay + contenido) */
          #cmp-modal-container, .cmp-modal-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 2147483646 !important; /* Valor extremadamente alto para estar por encima de todo */
            opacity: 1 !important;
            visibility: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
            box-sizing: border-box !important;
            pointer-events: auto !important;
          }
          
          /* Posicionamiento específico basado en data-position */
          #cmp-modal-container[data-position="center"], .cmp-modal-container[data-position="center"] {
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          
          #cmp-modal-container[data-position="top"], .cmp-modal-container[data-position="top"] {
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 5vh !important;
            padding-bottom: 0 !important;
          }
          
          #cmp-modal-container[data-position="bottom"], .cmp-modal-container[data-position="bottom"] {
            align-items: flex-end !important;
            justify-content: center !important;
            padding-bottom: 5vh !important;
            padding-top: 0 !important;
          }
          
          #cmp-modal-container[data-position="top-left"], .cmp-modal-container[data-position="top-left"] {
            align-items: flex-start !important;
            justify-content: flex-start !important;
            padding: 5vh !important;
          }
          
          #cmp-modal-container[data-position="top-right"], .cmp-modal-container[data-position="top-right"] {
            align-items: flex-start !important;
            justify-content: flex-end !important;
            padding: 5vh !important;
          }
          
          #cmp-modal-container[data-position="bottom-left"], .cmp-modal-container[data-position="bottom-left"] {
            align-items: flex-end !important;
            justify-content: flex-start !important;
            padding: 5vh !important;
          }
          
          #cmp-modal-container[data-position="bottom-right"], .cmp-modal-container[data-position="bottom-right"] {
            align-items: flex-end !important;
            justify-content: flex-end !important;
            padding: 5vh !important;
          }
          
          /* El banner modal en sí - mejorado para resolver problemas de ancho */
          #cmp-banner.cmp-banner--modal, .cmp-banner.cmp-banner--modal, .cmp-banner--modal {
            background-color: #ffffff !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
            width: 90% !important;
            min-width: 300px !important;
            max-width: 600px !important;
            padding: 20px !important;
            position: relative !important;
            z-index: 2147483647 !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            text-align: center !important;
            margin: 0 auto !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
          }
          
          /* Reset de estilos para garantizar visibilidad */
          #cmp-banner.cmp-banner--modal *, .cmp-banner.cmp-banner--modal *, .cmp-banner--modal * {
            visibility: visible !important;
          }
          
          /* Estilos específicos para los botones en el modal */
          .cmp-banner--modal .cmp-button {
            margin: 5px !important;
            min-width: 120px !important;
            cursor: pointer !important;
            pointer-events: auto !important;
          }
          
          /* Compatibilidad con navegadores antiguos */
          @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
            #cmp-modal-container {
              display: block !important;
            }
            
            .cmp-banner--modal {
              margin: 10% auto !important;
              max-width: 90% !important;
              width: 600px !important;
            }
          }
        `;
      } else if (desktop.type === 'floating') {
        css += `
          .cmp-banner--floating {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
            max-width: 400px;
          }
        `;
      } else {
        css += `
          .cmp-banner--banner {
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          }
        `;
      }
    }

    // Estilos TABLET - Media query para tablets
    if (layout.tablet) {
      const tablet = layout.tablet;
      
      // Aplicar estilos de tablet si tienen configuración específica O si desktop tiene altura 100%
      if (tablet.type && (tablet.position || tablet.width || tablet.height || tablet.backgroundColor || tablet.minHeight) ||
          (layout.desktop?.height === '100%' || layout.desktop?.height === '100vh')) {
        const tabletPosCSS = posMap[tablet.position] || '';

        // Manejar altura para tablet - con herencia de desktop
        let tabletHeightStyles = '';
        if (tablet.height) {
          if (tablet.height === '100%' || tablet.height === '100vh') {
            tabletHeightStyles = `
              height: 100vh !important;
              height: 100dvh !important;
              max-height: 100vh !important;
              overflow-y: auto;
            `;
            if (tablet.type === 'modal') {
              tabletHeightStyles += ' top: 0; bottom: 0;';
            }
          } else {
            tabletHeightStyles = `height: ${tablet.height};`;
          }
        } else if (layout.desktop?.height === '100%' || layout.desktop?.height === '100vh') {
          // Heredar configuración de altura 100% de desktop si tablet no está configurado
          tabletHeightStyles = `
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            overflow-y: auto;
          `;
          if ((tablet.type || layout.desktop.type) === 'modal') {
            tabletHeightStyles += ' top: 0; bottom: 0;';
          }
        }

        css += `
          @media (max-width: 1024px) and (min-width: 769px) {
            .cmp-banner--${tablet.type} {
              ${tabletPosCSS ? `position: fixed; ${tabletPosCSS}` : ''}
              ${tablet.width ? `width: ${tablet.width};` : ''}
              ${tabletHeightStyles}
              ${tablet.backgroundColor ? `background-color: ${tablet.backgroundColor};` : ''}
              ${tablet.minHeight ? `min-height: ${tablet.minHeight};` : ''}
            }
            
            /* Ajustes específicos para tablet según el tipo */
            ${tablet.type === 'modal' || (!tablet.type && layout.desktop.type === 'modal') ? `
              /* Modal específico para tablet */
              #cmp-modal-container {
                align-items: ${(tablet.position === 'top' || (!tablet.position && layout.desktop.position === 'top')) ? 'flex-start' : 
                              (tablet.position === 'bottom' || (!tablet.position && layout.desktop.position === 'bottom')) ? 'flex-end' :
                              'center'} !important;
                justify-content: center !important;
                ${(tablet.position === 'top' || (!tablet.position && layout.desktop.position === 'top')) ? 'padding-top: 3vh !important;' : 
                  (tablet.position === 'bottom' || (!tablet.position && layout.desktop.position === 'bottom')) ? 'padding-bottom: 3vh !important;' : 
                  'padding: 0 !important;'}
              }
              
              .cmp-banner--modal {
                margin: 0 !important;
                padding: 25px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                width: 90% !important;
                max-width: 550px !important;
                z-index: 999999 !important;
              }
            ` : ''}
            
            ${tablet.type === 'floating' ? `
              .cmp-banner--floating {
                max-width: 350px;
              }
            ` : ''}
          }
        `;
      }
    }

    // Estilos MOBILE - Media query para móviles
    if (layout.mobile) {
      const mobile = layout.mobile;
      const mobilePosCSS = posMap[mobile.position] || '';

      // Manejar altura para mobile - con herencia de desktop
      let mobileHeightStyles = '';
      if (mobile.height) {
        if (mobile.height === '100%' || mobile.height === '100vh') {
          mobileHeightStyles = `
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            overflow-y: auto;
          `;
          if ((mobile.type || layout.desktop.type) === 'modal') {
            mobileHeightStyles += ' top: 0; bottom: 0;';
          }
        } else {
          mobileHeightStyles = `height: ${mobile.height};`;
        }
      } else if (layout.desktop?.height === '100%' || layout.desktop?.height === '100vh') {
        // Heredar configuración de altura 100% de desktop si móvil no está configurado
        mobileHeightStyles = `
          height: 100vh !important;
          height: 100dvh !important;
          max-height: 100vh !important;
          overflow-y: auto;
        `;
        if (layout.desktop.type === 'modal') {
          mobileHeightStyles += ' top: 0; bottom: 0;';
        }
      }

      css += `
        @media (max-width: 768px) {
          .cmp-banner--${mobile.type || layout.desktop.type} {
            ${mobilePosCSS ? `position: fixed; ${mobilePosCSS}` : ''}
            ${mobile.width ? `width: ${mobile.width};` : ''}
            ${mobileHeightStyles}
            ${mobile.backgroundColor ? `background-color: ${mobile.backgroundColor};` : ''}
            ${mobile.minHeight ? `min-height: ${mobile.minHeight};` : ''}
          }
          
          /* Ajustes específicos para móvil */
          ${(mobile.type === 'modal' || (!mobile.type && layout.desktop.type === 'modal')) ? `
            /* Modal específico para móvil */
            #cmp-modal-container {
              align-items: ${(mobile.position === 'top' || (!mobile.position && layout.desktop.position === 'top')) ? 'flex-start' : 
                            (mobile.position === 'bottom' || (!mobile.position && layout.desktop.position === 'bottom')) ? 'flex-end' :
                            'center'} !important;
              justify-content: center !important;
              ${(mobile.position === 'top' || (!mobile.position && layout.desktop.position === 'top')) ? 'padding-top: 2vh !important;' : 
                (mobile.position === 'bottom' || (!mobile.position && layout.desktop.position === 'bottom')) ? 'padding-bottom: 2vh !important;' : 
                'padding: 0 !important;'}
            }
            
            .cmp-banner--modal {
              margin: 0 !important;
              padding: 20px !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              align-items: center !important;
              width: 95% !important;
              /* REMOVIDO: max-width: 400px !important; - No limitar ancho para banners 100% */
              z-index: 999999 !important;
            }
          ` : ''}
          
          .cmp-banner--floating {
            width: calc(100% - 20px);
            max-width: none;
            margin: 0 10px;
          }
          
          /* Ajustar botones en móvil */
          .cmp-button {
            padding: 10px 16px;
            font-size: 16px;
          }
        }
      `;
    }

    return css;
  }

  /**
   * Genera estilos CSS para cada componente con soporte responsive
   */
  _generateComponentStyles(components, theme) {
    if (!components || !Array.isArray(components)) {
      return '';
    }
    
    if (!theme) {
      theme = {
        primaryColor: '#4285f4',
        secondaryColor: '#f1f1f1',
        tertiaryColor: '#757575',
        buttonTextColor: '#ffffff',
        secondaryButtonTextColor: '#333333',
        tertiaryButtonTextColor: '#ffffff'
      };
    }
    
    let css = '';
    
    components.forEach(c => {
      if (!c || !c.id) return;
      
      const selector = `[data-component-id="${c.id}"]`;
      
      // DESKTOP STYLES (base)
      if (c.style?.desktop) {
        let styleToApply = { ...c.style.desktop };
        
        // Los estilos se aplicarán exactamente como están guardados, sin sobrescrituras
        
        css += `${selector} {
          ${this._styleObjToCSS(styleToApply)}
        }`;
        
        // Agregar estilos de hover para botones
        if (c.type === 'button' && (styleToApply.hoverBackgroundColor || styleToApply.hoverColor)) {
          css += `${selector}:hover {
            ${styleToApply.hoverBackgroundColor ? `background-color: ${styleToApply.hoverBackgroundColor} !important;` : ''}
            ${styleToApply.hoverColor ? `color: ${styleToApply.hoverColor} !important;` : ''}
          }`;
        }
      }
      
      // Añadir la posición del componente (desde position)
      if (c.position?.desktop) {
        const pos = c.position.desktop;
        let positionCSS = '';
        
        // Determinar el tipo de posicionamiento basado en el contexto
        if (c.parentId) {
          // Es un componente hijo - determinar si el padre es contenedor y su modo
          const parentContainer = this._findParentContainer(c.parentId, components);
          if (parentContainer) {
            const parentConfig = parentContainer.containerConfig?.desktop || {};
            const displayMode = parentConfig.displayMode || 'libre';
            
            if (displayMode === 'libre') {
              // En modo libre, usar posición absoluta
              positionCSS += 'position: absolute;';
            } else {
              // En flex/grid, usar posición relativa
              positionCSS += 'position: relative;';
            }
          } else {
            // Si no encontramos el padre, usar relativa por defecto
            positionCSS += 'position: relative;';
          }
        } else {
          // Para componentes raíz, usar absolute
          positionCSS += 'position: absolute;';
        }
        
        // Aplicar transformaciones si existen
        let transformCSS = '';
        if (pos.transformX === 'center' && pos.transformY === 'center') {
          transformCSS = 'transform: translate(-50%, -50%);';
        } else if (pos.transformX === 'center') {
          transformCSS = 'transform: translateX(-50%);';
        } else if (pos.transformY === 'center') {
          transformCSS = 'transform: translateY(-50%);';
        }
        
        // Solo aplicar top/left si no está en un contenedor flex/grid
        let positionValues = '';
        if (!c.parentId || positionCSS.includes('absolute')) {
          positionValues = `
            ${pos.top ? `top: ${pos.top};` : ''}
            ${pos.left ? `left: ${pos.left};` : ''}
            ${pos.right ? `right: ${pos.right};` : ''}
            ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
          `;
        }
        
        css += `${selector} {
          ${positionCSS}
          ${positionValues}
          ${transformCSS}
          transition: top 0.3s ease, left 0.3s ease, right 0.3s ease, bottom 0.3s ease, transform 0.3s ease;
        }`;
      }
      
      // Estilos específicos para contenedores
      if (c.type === 'container' && c.containerConfig?.desktop) {
        const containerConfig = c.containerConfig.desktop;
        const displayMode = containerConfig.displayMode || 'libre';
        
        // Aplicar configuración de flexbox
        if (displayMode === 'flex') {
          css += `${selector} {
            display: flex;
            ${containerConfig.flexDirection ? `flex-direction: ${containerConfig.flexDirection};` : ''}
            ${containerConfig.justifyContent ? `justify-content: ${containerConfig.justifyContent};` : ''}
            ${containerConfig.alignItems ? `align-items: ${containerConfig.alignItems};` : ''}
            ${containerConfig.flexWrap ? `flex-wrap: ${containerConfig.flexWrap};` : ''}
            ${containerConfig.gap ? `gap: ${containerConfig.gap};` : ''}
          }`;
        }
        
        // Aplicar configuración de grid
        if (displayMode === 'grid') {
          css += `${selector} {
            display: grid;
            ${containerConfig.gridTemplateColumns ? `grid-template-columns: ${containerConfig.gridTemplateColumns};` : ''}
            ${containerConfig.gridTemplateRows ? `grid-template-rows: ${containerConfig.gridTemplateRows};` : ''}
            ${containerConfig.justifyItems ? `justify-items: ${containerConfig.justifyItems};` : ''}
            ${containerConfig.alignItems ? `align-items: ${containerConfig.alignItems};` : ''}
            ${containerConfig.gap ? `gap: ${containerConfig.gap};` : ''}
          }`;
        }
      }
      
      // ESTILOS RESPONSIVOS DE CONTENEDOR (TABLET)
      if (c.type === 'container' && c.containerConfig?.tablet) {
        const tabletConfig = c.containerConfig.tablet;
        const displayMode = tabletConfig.displayMode;
        
        css += `
          @media (max-width: 1024px) and (min-width: 769px) {
            ${selector} {`;
        
        if (displayMode === 'flex') {
          css += `
              display: flex;
              ${tabletConfig.flexDirection ? `flex-direction: ${tabletConfig.flexDirection};` : ''}
              ${tabletConfig.justifyContent ? `justify-content: ${tabletConfig.justifyContent};` : ''}
              ${tabletConfig.alignItems ? `align-items: ${tabletConfig.alignItems};` : ''}
              ${tabletConfig.flexWrap ? `flex-wrap: ${tabletConfig.flexWrap};` : ''}
              ${tabletConfig.gap ? `gap: ${tabletConfig.gap};` : ''}`;
        } else if (displayMode === 'grid') {
          css += `
              display: grid;
              ${tabletConfig.gridTemplateColumns ? `grid-template-columns: ${tabletConfig.gridTemplateColumns};` : ''}
              ${tabletConfig.gridTemplateRows ? `grid-template-rows: ${tabletConfig.gridTemplateRows};` : ''}
              ${tabletConfig.justifyItems ? `justify-items: ${tabletConfig.justifyItems};` : ''}
              ${tabletConfig.alignItems ? `align-items: ${tabletConfig.alignItems};` : ''}
              ${tabletConfig.gridGap ? `gap: ${tabletConfig.gridGap};` : ''}`;
        }
        
        css += `
            }
          }`;
      }
      
      // ESTILOS RESPONSIVOS DE CONTENEDOR (MOBILE)
      if (c.type === 'container' && c.containerConfig?.mobile) {
        const mobileConfig = c.containerConfig.mobile;
        const displayMode = mobileConfig.displayMode;
        
        css += `
          @media (max-width: 768px) {
            ${selector} {`;
        
        if (displayMode === 'flex') {
          css += `
              display: flex;
              ${mobileConfig.flexDirection ? `flex-direction: ${mobileConfig.flexDirection};` : ''}
              ${mobileConfig.justifyContent ? `justify-content: ${mobileConfig.justifyContent};` : ''}
              ${mobileConfig.alignItems ? `align-items: ${mobileConfig.alignItems};` : ''}
              ${mobileConfig.flexWrap ? `flex-wrap: ${mobileConfig.flexWrap};` : ''}
              ${mobileConfig.gap ? `gap: ${mobileConfig.gap};` : ''}`;
        } else if (displayMode === 'grid') {
          css += `
              display: grid;
              ${mobileConfig.gridTemplateColumns ? `grid-template-columns: ${mobileConfig.gridTemplateColumns};` : ''}
              ${mobileConfig.gridTemplateRows ? `grid-template-rows: ${mobileConfig.gridTemplateRows};` : ''}
              ${mobileConfig.justifyItems ? `justify-items: ${mobileConfig.justifyItems};` : ''}
              ${mobileConfig.alignItems ? `align-items: ${mobileConfig.alignItems};` : ''}
              ${mobileConfig.gridGap ? `gap: ${mobileConfig.gridGap};` : ''}`;
        }
        
        css += `
            }
          }`;
      }
      
      // TABLET STYLES (media query)
      if (c.style?.tablet || c.position?.tablet) {
        let tabletStyleToApply = c.style?.tablet ? { ...c.style.tablet } : {};
        
        css += `
          @media (max-width: 1024px) and (min-width: 769px) {
            ${selector} {
              ${this._styleObjToCSS(tabletStyleToApply)}
            }
            ${c.type === 'button' && (tabletStyleToApply.hoverBackgroundColor || tabletStyleToApply.hoverColor) ? `
            ${selector}:hover {
              ${tabletStyleToApply.hoverBackgroundColor ? `background-color: ${tabletStyleToApply.hoverBackgroundColor} !important;` : ''}
              ${tabletStyleToApply.hoverColor ? `color: ${tabletStyleToApply.hoverColor} !important;` : ''}
            }` : ''}
          }
        `;
      }
      
      // TABLET POSITION STYLES - Aplicar lógica de contenedores como en desktop
      if (c.position?.tablet) {
        const pos = c.position.tablet;
        let positionCSS = '';
        
        // Determinar el tipo de posicionamiento basado en el contexto del contenedor padre
        if (c.parentId) {
          // Es un componente hijo - determinar si el padre es contenedor y su modo
          const parentContainer = this._findParentContainer(c.parentId, components);
          if (parentContainer) {
            const parentConfig = parentContainer.containerConfig?.tablet || parentContainer.containerConfig?.desktop || {};
            const displayMode = parentConfig.displayMode || 'libre';
            
            if (displayMode === 'libre') {
              // En modo libre, usar posición absoluta
              positionCSS += 'position: absolute;';
            } else {
              // En flex/grid, usar posición relativa
              positionCSS += 'position: relative;';
            }
          } else {
            // Si no encontramos el padre, usar relativa por defecto
            positionCSS += 'position: relative;';
          }
        } else {
          // Para componentes raíz, usar absolute
          positionCSS += 'position: absolute;';
        }
        
        // Aplicar transformaciones si existen
        let transformCSS = '';
        if (pos.transformX === 'center' && pos.transformY === 'center') {
          transformCSS = 'transform: translate(-50%, -50%);';
        } else if (pos.transformX === 'center') {
          transformCSS = 'transform: translateX(-50%);';
        } else if (pos.transformY === 'center') {
          transformCSS = 'transform: translateY(-50%);';
        }
        
        // Solo aplicar top/left si no está en un contenedor flex/grid
        let positionValues = '';
        if (!c.parentId || positionCSS.includes('absolute')) {
          positionValues = `
            ${pos.top ? `top: ${pos.top};` : ''}
            ${pos.left ? `left: ${pos.left};` : ''}
            ${pos.right ? `right: ${pos.right};` : ''}
            ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
          `;
        }
        
        css += `
          @media (max-width: 1024px) and (min-width: 769px) {
            ${selector} {
              ${positionCSS}
              ${positionValues}
              ${transformCSS}
            }
          }
        `;
      }
      
      // MOBILE STYLES (media query)
      if (c.style?.mobile || c.position?.mobile) {
        let mobileStyleToApply = c.style?.mobile ? { ...c.style.mobile } : {};
        
        css += `
          @media (max-width: 768px) {
            ${selector} {
              ${this._styleObjToCSS(mobileStyleToApply)}
            }
            ${c.type === 'button' && (mobileStyleToApply.hoverBackgroundColor || mobileStyleToApply.hoverColor) ? `
            ${selector}:hover {
              ${mobileStyleToApply.hoverBackgroundColor ? `background-color: ${mobileStyleToApply.hoverBackgroundColor} !important;` : ''}
              ${mobileStyleToApply.hoverColor ? `color: ${mobileStyleToApply.hoverColor} !important;` : ''}
            }` : ''}
          }
        `;
      }
      
      // MOBILE POSITION STYLES - Aplicar lógica de contenedores como en desktop
      if (c.position?.mobile) {
        const pos = c.position.mobile;
        let positionCSS = '';
        
        // Determinar el tipo de posicionamiento basado en el contexto del contenedor padre
        if (c.parentId) {
          // Es un componente hijo - determinar si el padre es contenedor y su modo
          const parentContainer = this._findParentContainer(c.parentId, components);
          if (parentContainer) {
            const parentConfig = parentContainer.containerConfig?.mobile || parentContainer.containerConfig?.desktop || {};
            const displayMode = parentConfig.displayMode || 'libre';
            
            if (displayMode === 'libre') {
              // En modo libre, usar posición absoluta
              positionCSS += 'position: absolute;';
            } else {
              // En flex/grid, usar posición relativa
              positionCSS += 'position: relative;';
            }
          } else {
            // Si no encontramos el padre, usar relativa por defecto
            positionCSS += 'position: relative;';
          }
        } else {
          // Para componentes raíz, usar absolute
          positionCSS += 'position: absolute;';
        }
        
        // Aplicar transformaciones si existen
        let transformCSS = '';
        if (pos.transformX === 'center' && pos.transformY === 'center') {
          transformCSS = 'transform: translate(-50%, -50%);';
        } else if (pos.transformX === 'center') {
          transformCSS = 'transform: translateX(-50%);';
        } else if (pos.transformY === 'center') {
          transformCSS = 'transform: translateY(-50%);';
        }
        
        // Solo aplicar top/left si no está en un contenedor flex/grid
        let positionValues = '';
        if (!c.parentId || positionCSS.includes('absolute')) {
          positionValues = `
            ${pos.top ? `top: ${pos.top};` : ''}
            ${pos.left ? `left: ${pos.left};` : ''}
            ${pos.right ? `right: ${pos.right};` : ''}
            ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
          `;
        }
        
        css += `
          @media (max-width: 768px) {
            ${selector} {
              ${positionCSS}
              ${positionValues}
              ${transformCSS}
            }
          }
        `;
      }
      
      // Estilos específicos por tipo de componente
      switch (c.type) {
        case 'button':
          css += `
            ${selector}.cmp-button {
              cursor: pointer;
              border-radius: 4px;
              white-space: nowrap;
              user-select: none;
            }
            ${selector}.cmp-button:focus {
              outline: 2px solid rgba(0, 0, 0, 0.2);
              outline-offset: 2px;
            }
          `;
          break;
        case 'language-button':
          css += `
            ${selector}.cmp-language-button {
              cursor: pointer;
              border-radius: 6px;
              background: #ffffff;
              border: 1px solid #d1d5db;
              padding: 4px 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              user-select: none;
              transition: background-color 0.2s, border-color 0.2s;
            }
            ${selector}.cmp-language-button:hover {
              background-color: #f9fafb;
              border-color: #9ca3af;
            }
            ${selector}.cmp-language-button:focus {
              outline: 2px solid #7c3aed;
              outline-offset: 2px;
            }
            ${selector}.cmp-language-button .language-dropdown {
              display: none;
              position: absolute;
              top: 100%;
              left: 0;
              background: white;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              z-index: 1000;
              min-width: 150px;
              max-height: 200px;
              overflow-y: auto;
            }
            ${selector}.cmp-language-button.active .language-dropdown {
              display: block;
            }
            ${selector}.cmp-language-button .language-option {
              padding: 8px 12px;
              cursor: pointer;
              border-bottom: 1px solid #f3f4f6;
              transition: background-color 0.2s;
            }
            ${selector}.cmp-language-button .language-option:last-child {
              border-bottom: none;
            }
            ${selector}.cmp-language-button .language-option:hover {
              background-color: #f3f4f6;
            }
            ${selector}.cmp-language-button .language-option.selected {
              background-color: #ede9fe;
              color: #7c3aed;
              font-weight: 500;
            }
          `;
          break;
        case 'link':
          css += `
            ${selector}.cmp-link {
              cursor: pointer;
              text-decoration: underline;
            }
            ${selector}.cmp-link:focus {
              outline: 2px solid rgba(0, 0, 0, 0.2);
              outline-offset: 2px;
            }
          `;
          break;
        case 'image':
        case 'logo':
          css += `
            ${selector}.cmp-${c.type} {
              overflow: hidden;
            }
            ${selector}.cmp-${c.type} img {
              display: block;
              transition: opacity 0.3s ease, transform 0.3s ease;
              opacity: 1; /* CAMBIO: Hacer visible por defecto */
            }
          `;
          
          // NO aplicar max-width: 100% ni height: auto genéricamente
          // Los tamaños específicos ya vienen en los estilos inline
          break;
      }
      
      // Procesar estilos de hijos recursivamente
      if (c.children && c.children.length > 0) {
        css += this._generateComponentStyles(c.children, theme);
      }
    });
    
    // No aplicar ningún estilo forzado - respetar exactamente los estilos del editor
    
    return css;
  }


  /**
   * Convierte un objeto style en declaraciones CSS.
   */
  _styleObjToCSS(style) {
    if (!style) return '';

    let str = '';

    // Manejar propiedades CSS comunes
    // Colores
    if (style.backgroundColor) {
      str += `background-color: ${style.backgroundColor};`;
    }
    if (style.color) {
      str += `color: ${style.color};`;
    }
    if (style.borderColor) {
      str += `border-color: ${style.borderColor};`;
    }

    // Tipografía
    if (style.fontSize) {
      str += `font-size: ${style.fontSize};`;
    }
    if (style.fontFamily) {
      str += `font-family: ${style.fontFamily};`;
    }
    if (style.fontWeight) {
      str += `font-weight: ${style.fontWeight};`;
    }
    if (style.fontStyle) {
      str += `font-style: ${style.fontStyle};`;
    }
    if (style.lineHeight) {
      str += `line-height: ${style.lineHeight};`;
    }
    if (style.textAlign) {
      str += `text-align: ${style.textAlign};`;
    }
    
    // Bordes
    if (style.borderWidth) {
      str += `border-width: ${style.borderWidth};`;
    }
    if (style.borderStyle) {
      str += `border-style: ${style.borderStyle};`;
    }
    if (style.borderRadius) {
      str += `border-radius: ${style.borderRadius};`;
    }
    if (style.border) {
      // Si viene border como shorthand
      str += `border: ${style.border};`;
    }
    
    // Dimensiones
    if (style.width) {
      str += `width: ${style.width};`;
    }
    if (style.height) {
      str += `height: ${style.height};`;
    }
    if (style.maxWidth) {
      str += `max-width: ${style.maxWidth};`;
    }
    if (style.maxHeight) {
      str += `max-height: ${style.maxHeight};`;
    }
    if (style.minWidth) {
      str += `min-width: ${style.minWidth};`;
    }
    if (style.minHeight) {
      str += `min-height: ${style.minHeight};`;
    }
    
    // Margen y padding
    // Manejo simplificado de margen
    if (style.margin) {
      if (typeof style.margin === 'object') {
        // Si es un objeto con top/right/bottom/left
        const margin = style.margin;
        if (margin.top) str += `margin-top: ${margin.top};`;
        if (margin.right) str += `margin-right: ${margin.right};`;
        if (margin.bottom) str += `margin-bottom: ${margin.bottom};`;
        if (margin.left) str += `margin-left: ${margin.left};`;
      } else {
        // Si es un string (shorthand)
        str += `margin: ${style.margin};`;
      }
    }
    
    // Manejo simplificado de padding
    if (style.padding) {
      if (typeof style.padding === 'object') {
        // Si es un objeto con top/right/bottom/left
        const padding = style.padding;
        if (padding.top) str += `padding-top: ${padding.top};`;
        if (padding.right) str += `padding-right: ${padding.right};`;
        if (padding.bottom) str += `padding-bottom: ${padding.bottom};`;
        if (padding.left) str += `padding-left: ${padding.left};`;
      } else {
        // Si es un string (shorthand)
        str += `padding: ${style.padding};`;
      }
    }
    
    // Posición
    if (style.position) {
      str += `position: ${style.position};`;
    }
    if (style.top !== undefined) {
      str += `top: ${style.top};`;
    }
    if (style.left !== undefined) {
      str += `left: ${style.left};`;
    }
    if (style.right !== undefined) {
      str += `right: ${style.right};`;
    }
    if (style.bottom !== undefined) {
      str += `bottom: ${style.bottom};`;
    }
    
    // Sombras
    if (style.boxShadow) {
      str += `box-shadow: ${style.boxShadow};`;
    }
    if (style.textShadow) {
      str += `text-shadow: ${style.textShadow};`;
    }
    
    // Transiciones y transformaciones
    if (style.transition) {
      str += `transition: ${style.transition};`;
    }
    if (style.transform) {
      str += `transform: ${style.transform};`;
    }
    if (style.transformOrigin) {
      str += `transform-origin: ${style.transformOrigin};`;
    }
    
    // Filtros
    if (style.filter) {
      str += `filter: ${style.filter};`;
    }
    if (style.backdropFilter) {
      str += `backdrop-filter: ${style.backdropFilter};`;
    }
    
    // Propiedades específicas para imágenes
    if (style.objectFit) {
      str += `object-fit: ${style.objectFit};`;
    }
    if (style.objectPosition) {
      str += `object-position: ${style.objectPosition};`;
    }
    
    // Propiedades de desbordamiento
    if (style.overflow) {
      str += `overflow: ${style.overflow};`;
    }
    if (style.overflowX) {
      str += `overflow-x: ${style.overflowX};`;
    }
    if (style.overflowY) {
      str += `overflow-y: ${style.overflowY};`;
    }
    
    // Propiedades de interacción
    if (style.pointerEvents) {
      str += `pointer-events: ${style.pointerEvents};`;
    }
    if (style.userSelect) {
      str += `user-select: ${style.userSelect};`;
    }
    
    // Cursor
    if (style.cursor) {
      str += `cursor: ${style.cursor};`;
    }
    
    // Display
    if (style.display) {
      str += `display: ${style.display};`;
    }
    
    // Opacity - Solo aplicar si no es 0 o está explícitamente configurado
    if (style.opacity !== undefined && style.opacity !== 0) {
      str += `opacity: ${style.opacity};`;
    }
    
    // z-index
    if (style.zIndex !== undefined) {
      str += `z-index: ${style.zIndex};`;
    }
    
    // Añadir soporte para flexbox
    if (style.flexDirection) {
      str += `flex-direction: ${style.flexDirection};`;
    }
    if (style.justifyContent) {
      str += `justify-content: ${style.justifyContent};`;
    }
    if (style.alignItems) {
      str += `align-items: ${style.alignItems};`;
    }
    if (style.flexWrap) {
      str += `flex-wrap: ${style.flexWrap};`;
    }
    if (style.flex) {
      str += `flex: ${style.flex};`;
    }
    if (style.gap) {
      str += `gap: ${style.gap};`;
    }

    return str;
  }

  /**
   * Genera keyframes u otros estilos para animaciones fade/slide.
   */
  _generateAnimationStyles(anim) {
    if (!anim) return '';
    if (!['fade','slide','none'].includes(anim?.type)) return '';
    
    let keyframes = '';
    let animationClass = '';
    const duration = anim.duration || 300;
    
    if (anim.type === 'fade') {
      keyframes = `
        @keyframes cmpFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmpFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      
      animationClass = `
        .cmp-banner--fade {
          animation: cmpFadeIn ${duration}ms ease-out;
        }
        .cmp-banner--fade.cmp-banner--hiding {
          animation: cmpFadeOut ${duration}ms ease-in;
        }
      `;
    } else if (anim.type === 'slide') {
      keyframes = `
        @keyframes cmpSlideInBottom {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cmpSlideOutBottom {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes cmpSlideInTop {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cmpSlideOutTop {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes cmpSlideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cmpSlideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes cmpSlideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cmpSlideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
      `;
      
      animationClass = `
        .cmp-banner--slide[data-position="bottom"] {
          animation: cmpSlideInBottom ${duration}ms ease-out;
        }
        .cmp-banner--slide[data-position="bottom"].cmp-banner--hiding {
          animation: cmpSlideOutBottom ${duration}ms ease-in;
        }
        .cmp-banner--slide[data-position="top"] {
          animation: cmpSlideInTop ${duration}ms ease-out;
        }
        .cmp-banner--slide[data-position="top"].cmp-banner--hiding {
          animation: cmpSlideOutTop ${duration}ms ease-in;
        }
        .cmp-banner--slide[data-position="top-right"],
        .cmp-banner--slide[data-position="bottom-right"] {
          animation: cmpSlideInRight ${duration}ms ease-out;
        }
        .cmp-banner--slide[data-position="top-right"].cmp-banner--hiding,
        .cmp-banner--slide[data-position="bottom-right"].cmp-banner--hiding {
          animation: cmpSlideOutRight ${duration}ms ease-in;
        }
        .cmp-banner--slide[data-position="top-left"],
        .cmp-banner--slide[data-position="bottom-left"] {
          animation: cmpSlideInLeft ${duration}ms ease-out;
        }
        .cmp-banner--slide[data-position="top-left"].cmp-banner--hiding,
        .cmp-banner--slide[data-position="bottom-left"].cmp-banner--hiding {
          animation: cmpSlideOutLeft ${duration}ms ease-in;
        }
      `;
    }
    
    return keyframes + animationClass;
  }
  
  /**
   * Genera estilos para accesibilidad
   */
  _generateAccessibilityStyles() {
    return `
      /* Mejoras de accesibilidad */
      .cmp-banner:focus,
      .cmp-button:focus,
      .cmp-link:focus,
      .cmp-checkbox input:focus,
      .cmp-toggle input:focus + .cmp-toggle-slider {
        outline: 2px solid rgba(0, 120, 212, 0.6);
        outline-offset: 2px;
      }
      
      /* Soporte para alto contraste */
      @media (forced-colors: active) {
        .cmp-button {
          border: 2px solid ButtonText;
        }
        .cmp-checkbox input {
          border: 1px solid ButtonText;
        }
        .cmp-toggle-slider {
          border: 1px solid ButtonText;
        }
      }
      
      /* Ocultar elementos solo visualmente pero mantener para lectores de pantalla */
      .cmp-visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
  }
  
  /**
   * Genera helpers para responsive
   */
  _generateResponsiveHelpers() {
    return `
      /* Utilidades responsivas */
      @media (max-width: 768px) {
        .cmp-hide-mobile {
          display: none !important;
        }
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .cmp-hide-tablet {
          display: none !important;
        }
      }
      
      @media (min-width: 1025px) {
        .cmp-hide-desktop {
          display: none !important;
        }
      }
      
      /* Utilidades de flexbox para layouts rápidos */
      .cmp-flex {
        display: flex !important;
      }
      
      .cmp-flex-col {
        flex-direction: column !important;
      }
      
      .cmp-items-center {
        align-items: center !important;
      }
      
      .cmp-justify-between {
        justify-content: space-between !important;
      }
      
      .cmp-gap-2 {
        gap: 8px !important;
      }
      
      .cmp-gap-4 {
        gap: 16px !important;
      }
    `;
  }

  /**
   * Minifica el HTML básico (remueve espacios extra).
   */
  _minifyHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }
  
  /**
   * Procesa variables de cliente en el contenido de texto
   * @param {string} content - Contenido de texto que puede contener variables
   * @param {object} clientInfo - Información del cliente
   * @returns {string} - Contenido con variables reemplazadas
   */
  _processClientVariables(content, clientInfo) {
    if (!content || !clientInfo) return content;
    
    let processedContent = content;
    
    // Reemplazar variable de nombre de la empresa
    // Priorizar razón social sobre otros nombres
    const companyName = clientInfo.fiscalInfo?.razonSocial || 
                       clientInfo.companyName || 
                       clientInfo.businessName || 
                       clientInfo.name;
    
    if (companyName) {
      // Nueva variable para razón social (formato principal)
      processedContent = processedContent.replace(/\{razonSocial\}/g, companyName);
      
      // Variable alternativa para nombre de empresa
      processedContent = processedContent.replace(/\{nombreEmpresa\}/g, companyName);
      
      // Variables existentes para compatibilidad
      processedContent = processedContent.replace(/\{\{CompanyName\}\}/g, companyName);
      processedContent = processedContent.replace(/\{\{LegalName\}\}/g, companyName);
      processedContent = processedContent.replace(/\{\{clientCompanyName\}\}/g, companyName);
    }
    
    // Reemplazar CIF si está disponible
    const cif = clientInfo.fiscalInfo?.cif;
    if (cif) {
      processedContent = processedContent.replace(/\{cif\}/g, cif);
    }
    
    // Reemplazar dirección si está disponible
    const direccion = clientInfo.fiscalInfo?.direccion;
    if (direccion) {
      processedContent = processedContent.replace(/\{direccion\}/g, direccion);
    }
    
    // Reemplazar otras variables del cliente si están disponibles
    if (clientInfo.domain) {
      processedContent = processedContent.replace(/\{\{clientDomain\}\}/g, clientInfo.domain);
    }
    
    if (clientInfo.email) {
      processedContent = processedContent.replace(/\{\{clientEmail\}\}/g, clientInfo.email);
    }
    
    console.log('🔄 Variables procesadas en contenido:', {
      originalContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      hasCompanyName: !!companyName,
      hasCif: !!cif,
      hasDireccion: !!direccion,
      replacementsCount: (content.match(/\{[^}]+\}/g) || []).length
    });
    
    return processedContent;
  }

  /**
   * Encuentra un contenedor padre por su ID
   */
  _findParentContainer(parentId, components) {
    const findInComponents = (comps) => {
      for (const comp of comps) {
        if (comp.id === parentId) {
          return comp;
        }
        if (comp.children && comp.children.length > 0) {
          const found = findInComponents(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInComponents(components);
  }

  /**
   * Ajusta un color (aclarar/oscurecer)
   * @param {string} color - Color en formato hex (#RRGGBB)
   * @param {number} amount - Cantidad a ajustar (-255 a 255)
   * @returns {string} - Color ajustado en formato hex
   */
  _adjustColor(color, amount) {
    const clamp = (val) => Math.min(255, Math.max(0, val));
    
    // Si no es un color hex válido, devolver el color original
    if (!color || !color.startsWith('#') || color.length !== 7) {
      return color;
    }
    
    // Extraer componentes R, G, B
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);
    
    // Ajustar componentes
    const adjustedR = clamp(r + amount);
    const adjustedG = clamp(g + amount);
    const adjustedB = clamp(b + amount);
    
    // Convertir de nuevo a hex
    return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Genera estilos para el branding de Cookie21
   */
  _generateBrandingStyles(config, theme, layout = {}) {
    // Si showBranding es false, no generar estilos
    if (config.showBranding === false) {
      return '';
    }

    // Obtener altura base del banner desde el layout
    const desktop = layout.desktop || {};
    let heightAdjustment = '';
    
    if (desktop.height) {
      // TEMPORALMENTE DESACTIVADO: No aplicar branding automático para evitar conflictos con altura 100%
      // El usuario puede configurar manualmente el espacio para branding si lo necesita
      heightAdjustment = '';
      
      /* LÓGICA ORIGINAL DESACTIVADA:
      if (!desktop.height.includes('%') && !desktop.height.includes('vh') && !desktop.height.includes('auto')) {
        // Si hay una altura específica en px, añadir el branding SOLO si no es una configuración especial
        const heightValue = parseInt(desktop.height);
        if (!isNaN(heightValue) && heightValue !== 100) { // No aplicar branding para height: 100px que podría ser una configuración especial
          const brandingExtra = desktop.type === 'modal' ? 32 : (desktop.type === 'floating' ? 24 : 28);
          heightAdjustment = `
            .cmp-banner--${desktop.type || 'banner'} {
              height: ${heightValue + brandingExtra}px !important;
            }
          `;
        }
      } else if (desktop.height === '100%' || desktop.height === '100vh') {
        // Para altura completa, usar calc() para mantener la altura completa pero reservar espacio para branding si es necesario
        const brandingExtra = desktop.type === 'modal' ? 32 : (desktop.type === 'floating' ? 24 : 28);
        heightAdjustment = `
          .cmp-banner--${desktop.type || 'banner'} {
            height: calc(100vh - ${brandingExtra}px) !important;
            min-height: calc(100vh - ${brandingExtra}px) !important;
          }
        `;
      } else {
        // Para porcentajes, vh, auto, etc. - no modificar la altura original del layout
        heightAdjustment = '';
      }
      */
    } else if (false && desktop.minHeight && !desktop.minHeight.includes('%') && !desktop.minHeight.includes('vh')) {
      // TEMPORALMENTE DESACTIVADO: Si hay un min-height específico en px, añadir el branding
      const minHeightValue = parseInt(desktop.minHeight);
      if (!isNaN(minHeightValue)) {
        const brandingExtra = desktop.type === 'modal' ? 32 : (desktop.type === 'floating' ? 24 : 28);
        heightAdjustment = `
          .cmp-banner--${desktop.type || 'banner'} {
            min-height: ${minHeightValue + brandingExtra}px !important;
          }
        `;
      }
    }

    return `
      /* Ajustar altura del banner para incluir branding */
      .cmp-banner {
        position: relative !important;
      }
      
      ${heightAdjustment}

      /* Estilos para el branding de Cookie21 */
      .cmp-branding-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 6px 8px !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        color: #666666 !important;
        background-color: transparent !important;
        height: 28px !important;
        box-sizing: border-box !important;
        z-index: 1000 !important;
      }

      .cmp-branding-footer span {
        margin-right: 4px;
      }

      .cmp-branding-footer a {
        color: ${theme?.primaryColor || '#007bff'};
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s ease;
      }

      .cmp-branding-footer a:hover {
        color: ${this._adjustColor(theme?.primaryColor || '#007bff', -30)};
        text-decoration: underline;
      }

      /* Ajustes específicos para modal */
      .cmp-banner--modal .cmp-branding-footer {
        height: 32px !important;
        padding: 8px !important;
        font-size: 11px !important;
      }

      /* Ajustes específicos para floating */
      .cmp-banner--floating .cmp-branding-footer {
        height: 24px !important;
        padding: 4px 6px !important;
        font-size: 9px !important;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .cmp-branding-footer {
          font-size: 10px;
          padding: 6px 0;
        }

        .cmp-banner--floating .cmp-branding-footer {
          font-size: 9px;
        }
      }
    `;
  }
}

module.exports = new BannerGeneratorService();