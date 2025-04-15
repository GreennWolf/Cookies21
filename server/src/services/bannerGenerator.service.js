// services/bannerGenerator.service.js

const cleanCSS = require('clean-css');
const logger = require('../utils/logger');

class BannerGeneratorService {
  /**
   * Genera el HTML del banner a partir de config.
   */
  async generateHTML(config) {
    try {
      const { layout = {}, components = [] } = config;
      
      // Usar configuración desktop por defecto
      const layoutConfig = layout.desktop || {
        type: 'banner',
        position: 'bottom'
      };
      
      
      
      
      if (components.length === 0) {
        console.warn("⚠️ No hay componentes en el template, usando banner básico");
        // Proporcionar un banner básico cuando no hay componentes
        return `
          <div 
            id="cmp-banner" 
            class="cmp-banner cmp-banner--${layoutConfig.type}" 
            data-position="${layoutConfig.position}"
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
      const componentsHTML = this._generateComponentsHTML(components);
      
      
      const baseHtml = `
        <div 
          id="cmp-banner" 
          class="cmp-banner cmp-banner--${layoutConfig.type}" 
          data-position="${layoutConfig.position}"
          role="dialog"
          aria-labelledby="cmp-title"
          aria-describedby="cmp-description"
        >
          ${componentsHTML}
        </div>
      `;
      
      const minifiedHtml = this._minifyHTML(baseHtml);
      
      
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
      const componentStyles = this._generateComponentStyles(components);
      const animationStyles = this._generateAnimationStyles(config.settings?.animation);
      const accessibilityStyles = this._generateAccessibilityStyles();
      const responsiveHelpers = this._generateResponsiveHelpers();

      const css = [
        baseStyles,
        layoutStyles,
        componentStyles,
        animationStyles,
        accessibilityStyles,
        responsiveHelpers
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
  _generateComponentsHTML(components) {
    if (!components || !Array.isArray(components)) {
      return '';
    }
    
    return components.map(c => {
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
          return `
            <div 
              class="cmp-${c.type}${lockedClass}"
              data-component-id="${c.id}"
            >
              <img src="${imgSrc}" alt="${altText}" loading="lazy" />
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
          return `
            <div 
              class="cmp-container${lockedClass}"
              data-component-id="${c.id}"
            >
              ${c.children ? this._generateComponentsHTML(c.children) : ''}
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
                ${c.children ? this._generateComponentsHTML(c.children) : ''}
              </div>
            </div>
          `;
        default:
          return '';
      }
    }).join('\n');
  }

  /**
   * Genera estilos base (colores, tipografías) basados en el theme.
   */
  _generateBaseStyles(theme) {
    if (!theme) {
      theme = {
        colors: {
          primary: '#4CAF50',
          background: '#fff',
          text: '#000'
        },
        fonts: {
          primary: 'sans-serif'
        }
      };
    }
    
    return `
      .cmp-banner {
        font-family: ${theme?.fonts?.primary || 'sans-serif'};
        color: ${theme?.colors?.text || '#000'};
        background-color: ${theme?.colors?.background || '#fff'};
        display: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 999999;
        padding: 15px;
        box-sizing: border-box;
      }
      .cmp-banner *, .cmp-banner *::before, .cmp-banner *::after {
        box-sizing: border-box;
      }
      .cmp-banner--visible {
        display: block;
      }
      .cmp-button {
        padding: 8px 16px;
        border: 1px solid ${theme?.colors?.border || '#ccc'};
        background-color: ${theme?.colors?.primary || '#4CAF50'};
        color: white;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 500;
        text-align: center;
        transition: background-color 0.2s, transform 0.1s;
      }
      .cmp-button:hover {
        filter: brightness(1.1);
      }
      .cmp-button:active {
        transform: scale(0.98);
      }
      .cmp-text {
        margin-bottom: 10px;
        line-height: 1.5;
      }
      .cmp-link {
        color: ${theme?.colors?.primary || '#4CAF50'};
        text-decoration: underline;
        cursor: pointer;
        display: inline-block;
        transition: color 0.2s;
      }
      .cmp-link:hover {
        color: ${theme?.colors?.primary ? this._adjustColor(theme.colors.primary, -20) : '#3a8a3a'};
      }
      .cmp-checkbox {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        cursor: pointer;
        user-select: none;
      }
      .cmp-checkbox input {
        margin-right: 8px;
        position: relative;
        width: 16px;
        height: 16px;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        border: 1px solid ${theme?.colors?.border || '#ccc'};
        border-radius: 3px;
        outline: none;
        transition: background-color 0.2s, border-color 0.2s;
        cursor: pointer;
      }
      .cmp-checkbox input:checked {
        background-color: ${theme?.colors?.primary || '#4CAF50'};
        border-color: ${theme?.colors?.primary || '#4CAF50'};
      }
      .cmp-checkbox input:checked::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .cmp-checkbox-label {
        font-size: 14px;
      }
      .cmp-toggle {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        cursor: pointer;
        user-select: none;
      }
      .cmp-toggle-slider {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
        background-color: #ccc;
        border-radius: 20px;
        margin-right: 8px;
        transition: background-color 0.2s;
      }
      .cmp-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }
      .cmp-toggle input:checked + .cmp-toggle-slider {
        background-color: ${theme?.colors?.primary || '#4CAF50'};
      }
      .cmp-toggle-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: 0.3s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .cmp-toggle input:checked + .cmp-toggle-slider:before {
        transform: translateX(20px);
      }
      .cmp-toggle input:focus + .cmp-toggle-slider {
        box-shadow: 0 0 1px ${theme?.colors?.primary || '#4CAF50'};
      }
      .cmp-toggle-text {
        font-size: 14px;
      }
      .cmp-panel {
        border: 1px solid ${theme?.colors?.border || '#ccc'};
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
        background-color: white;
      }
      .cmp-panel-header {
        padding: 10px;
        background-color: #f5f5f5;
        font-weight: bold;
        border-bottom: 1px solid ${theme?.colors?.border || '#ccc'};
      }
      .cmp-panel-body {
        padding: 10px;
      }
      .cmp-image img, .cmp-logo img {
        max-width: 100%;
        height: auto;
        display: block;
        opacity: 1;
        transition: opacity 0.3s ease;
      }
      .cmp-image {
        overflow: hidden;
        position: relative;
        min-height: 30px;
      }
      .cmp-image:not(.cmp-image-loaded)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #f0f0f0;
        z-index: -1;
      }
      .cmp-container {
        position: relative;
      }
      .cmp-locked {
        /* Estilos para elementos bloqueados */
        outline: none;
      }
      
      /* Overlay para modales */
      .cmp-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
    `;
  }

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

      css += `
        .cmp-banner--${desktop.type} {
          position: fixed;
          ${desktopPosCSS}
          width: ${desktop.width || '100%'};
          height: ${desktop.height || 'auto'};
          background-color: ${desktop.backgroundColor || '#ffffff'};
          ${desktop.minHeight ? `min-height: ${desktop.minHeight};` : ''}
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
      `;
      
      // Añadir sombras específicas según tipo
      if (desktop.type === 'modal') {
        css += `
          .cmp-banner--modal {
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            margin: auto;
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
      const tabletPosCSS = posMap[tablet.position] || '';

      css += `
        @media (max-width: 1024px) and (min-width: 769px) {
          .cmp-banner--${tablet.type || layout.desktop.type} {
            ${tabletPosCSS ? `position: fixed; ${tabletPosCSS}` : ''}
            ${tablet.width ? `width: ${tablet.width};` : ''}
            ${tablet.height ? `height: ${tablet.height};` : ''}
            ${tablet.backgroundColor ? `background-color: ${tablet.backgroundColor};` : ''}
            ${tablet.minHeight ? `min-height: ${tablet.minHeight};` : ''}
          }
          
          /* Ajustes específicos para tablet */
          .cmp-banner--floating {
            max-width: 350px;
          }
        }
      `;
    }

    // Estilos MOBILE - Media query para móviles
    if (layout.mobile) {
      const mobile = layout.mobile;
      const mobilePosCSS = posMap[mobile.position] || '';

      css += `
        @media (max-width: 768px) {
          .cmp-banner--${mobile.type || layout.desktop.type} {
            ${mobilePosCSS ? `position: fixed; ${mobilePosCSS}` : ''}
            ${mobile.width ? `width: ${mobile.width};` : ''}
            ${mobile.height ? `height: ${mobile.height};` : ''}
            ${mobile.backgroundColor ? `background-color: ${mobile.backgroundColor};` : ''}
            ${mobile.minHeight ? `min-height: ${mobile.minHeight};` : ''}
          }
          
          /* Ajustes específicos para móvil */
          .cmp-banner--modal {
            width: 95%;
            max-height: 80vh;
          }
          
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
  _generateComponentStyles(components) {
    if (!components || !Array.isArray(components)) {
      return '';
    }
    
    let css = '';
    
    components.forEach(c => {
      if (!c || !c.id) return;
      
      const selector = `[data-component-id="${c.id}"]`;
      
      // DESKTOP STYLES (base)
      if (c.style?.desktop) {
        css += `${selector} {
          ${this._styleObjToCSS(c.style.desktop)}
        }`;
      }
      
      // Añadir la posición del componente (desde position)
      if (c.position?.desktop) {
        css += `${selector} {
          position: absolute;
          ${c.position.desktop.top ? `top: ${c.position.desktop.top};` : ''}
          ${c.position.desktop.left ? `left: ${c.position.desktop.left};` : ''}
          ${c.position.desktop.right ? `right: ${c.position.desktop.right};` : ''}
          ${c.position.desktop.bottom ? `bottom: ${c.position.desktop.bottom};` : ''}
          transition: top 0.3s ease, left 0.3s ease, right 0.3s ease, bottom 0.3s ease;
        }`;
      }
      
      // TABLET STYLES (media query)
      if (c.style?.tablet || c.position?.tablet) {
        css += `
          @media (max-width: 1024px) and (min-width: 769px) {
            ${selector} {
              ${c.style?.tablet ? this._styleObjToCSS(c.style.tablet) : ''}
              ${c.position?.tablet?.top ? `top: ${c.position.tablet.top};` : ''}
              ${c.position?.tablet?.left ? `left: ${c.position.tablet.left};` : ''}
              ${c.position?.tablet?.right ? `right: ${c.position.tablet.right};` : ''}
              ${c.position?.tablet?.bottom ? `bottom: ${c.position.tablet.bottom};` : ''}
            }
          }
        `;
      }
      
      // MOBILE STYLES (media query)
      if (c.style?.mobile || c.position?.mobile) {
        css += `
          @media (max-width: 768px) {
            ${selector} {
              ${c.style?.mobile ? this._styleObjToCSS(c.style.mobile) : ''}
              ${c.position?.mobile?.top ? `top: ${c.position.mobile.top};` : ''}
              ${c.position?.mobile?.left ? `left: ${c.position.mobile.left};` : ''}
              ${c.position?.mobile?.right ? `right: ${c.position.mobile.right};` : ''}
              ${c.position?.mobile?.bottom ? `bottom: ${c.position.mobile.bottom};` : ''}
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
              max-width: 100%;
              height: auto;
              display: block;
              transition: opacity 0.3s ease, transform 0.3s ease;
            }
            ${selector}.cmp-${c.type}:not(.cmp-image-loaded) img {
              opacity: 0;
            }
            ${selector}.cmp-image-loaded img {
              opacity: 1;
            }
          `;
          break;
      }
      
      // Procesar estilos de hijos recursivamente
      if (c.children && c.children.length > 0) {
        css += this._generateComponentStyles(c.children);
      }
    });
    
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
    
    // Cursor
    if (style.cursor) {
      str += `cursor: ${style.cursor};`;
    }
    
    // Display
    if (style.display) {
      str += `display: ${style.display};`;
    }
    
    // Opacity
    if (style.opacity !== undefined) {
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
}

module.exports = new BannerGeneratorService();