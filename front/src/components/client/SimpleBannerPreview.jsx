import React, { useState, useRef, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../utils/imageProcessing';

function SimpleBannerPreview({ 
  bannerConfig = { layout: { desktop: {} }, components: [] }, 
  deviceView = 'desktop',
  height = 'auto'
}) {
  const [imageErrors, setImageErrors] = useState({});
  const bannerContainerRef = useRef(null);

  // Función de estilos para vista previa (sin posicionamiento fijo)
  const getLayoutStyles = () => {
    const layout = bannerConfig.layout[deviceView] || {};
    const type = layout.type || 'banner';
    
    let baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      color: layout.color || '#000000',
      fontFamily: layout.fontFamily || 'system-ui, -apple-system, sans-serif',
      position: 'relative', // SIEMPRE relativo para la vista previa
      minHeight: layout.minHeight || '100px',
      width: '100%',
      padding: layout.padding || '20px',
      overflow: 'visible'
    };

    // Aplicar estilos específicos según el tipo pero sin posicionamiento fijo
    if (type === 'banner') {
      baseStyles = {
        ...baseStyles,
        borderTop: layout.borderTop,
        borderBottom: layout.borderBottom
      };
    } else if (type === 'modal') {
      baseStyles = {
        ...baseStyles,
        borderRadius: layout.borderRadius || '8px',
        boxShadow: layout.boxShadow || '0 4px 20px rgba(0, 0, 0, 0.15)',
        maxWidth: layout.maxWidth || '600px',
        margin: '0 auto',
        border: layout.border
      };
    } else if (type === 'floating') {
      baseStyles = {
        ...baseStyles,
        borderRadius: layout.borderRadius || '8px',
        boxShadow: layout.boxShadow || '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: layout.maxWidth || '400px',
        border: layout.border
      };
    }

    return baseStyles;
  };


  // Get image URL with proper fallback handling
  const getImageUrl = (component) => {
    try {
      const cacheBuster = `?cb=${Date.now()}`;
      
      // PRIORIDAD 1: Usar content directo (URL del servidor - más confiable)
      if (typeof component.content === 'string' && component.content.trim() !== '') {
        const contentUrl = component.content;
        
        // Handle data URIs and blob URLs
        if (contentUrl.startsWith('data:') || contentUrl.startsWith('blob:')) {
          return contentUrl;
        }
        
        // Handle HTTP/HTTPS URLs
        if (contentUrl.startsWith('http://') || contentUrl.startsWith('https://')) {
          console.log('✅ [SimpleBannerPreview] Usando content URL del servidor:', contentUrl);
          return contentUrl;
        }
        
        // Handle relative URLs del servidor
        if (contentUrl.startsWith('/templates/images/')) {
          const fullUrl = `${window.location.origin}${contentUrl}${cacheBuster}`;
          console.log('✅ [SimpleBannerPreview] Construyendo URL desde content:', fullUrl);
          return fullUrl;
        }
        
        // Handle otras rutas relativas
        if (contentUrl.startsWith('/')) {
          return `${window.location.origin}${contentUrl}${cacheBuster}`;
        }
        
        // Si content no es __IMAGE_REF__ pero es una string válida
        if (!contentUrl.startsWith('__IMAGE_REF__') && contentUrl.length > 3) {
          console.log('⚠️ [SimpleBannerPreview] Content no reconocido, intentando URL directa:', contentUrl);
          return contentUrl;
        }
      }
      
      // PRIORIDAD 2: Usar _previewUrl como fallback
      if (component.style?.desktop?._previewUrl) {
        console.log('⚠️ [SimpleBannerPreview] Usando _previewUrl como fallback:', component.style.desktop._previewUrl);
        return component.style.desktop._previewUrl;
      }
      
      // Fallback placeholder
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4=';
    } catch (error) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  const renderComponent = (component) => {
    if (!component) return null;
    
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...deviceStyle};

    // Base styles with positioning - igual que en BannerPreview
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: NO usar position absolute
      ...processedStyle,
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1,
      // Para hijos, usamos el wrapper para el posicionamiento
      position: 'static',
      width: processedStyle.width || 'auto',
      height: processedStyle.height || 'auto'
    } : {
      // Para componentes raíz: usar position absolute normal
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...processedStyle,
      // Force transform to ensure precise positioning
      transform: 'translate(0, 0)',
      willChange: 'transform',
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1
    };

    // Extract content text for display
    let displayContent = '';
    if (typeof component.content === 'string') {
      displayContent = component.content;
    } else if (component.content && typeof component.content === 'object') {
      if (component.content.texts && typeof component.content.texts === 'object') {
        displayContent = component.content.texts.en || Object.values(component.content.texts)[0] || '';
      } else if (component.content.text) {
        displayContent = component.content.text;
      }
    }

    // Render based on component type
    switch (component.type) {
      case 'text':
        return (
          <div key={component.id} style={baseStyles}>
            {displayContent}
          </div>
        );
        
      case 'button':
        return (
          <button
            key={component.id}
            onClick={(e) => e.preventDefault()}
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
        
      case 'image': {
        const imageUrl = getImageUrl(component);
        const hasError = imageErrors[component.id];
        
        // Show error placeholder if image failed to load
        if (hasError) {
          return (
            <div 
              key={component.id} 
              style={{
                ...baseStyles,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f8f8',
                border: '1px dashed #ccc',
                color: '#666'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px' }}>
                <ImageOff size={24} style={{ color: '#999', marginBottom: '4px' }} />
                <span style={{ fontSize: '12px', textAlign: 'center' }}>Error al cargar imagen</span>
              </div>
            </div>
          );
        }
        
        // Render the image with border for preview
        return (
          <img
            key={component.id}
            src={imageUrl}
            alt=""
            style={{
              ...baseStyles,
              transition: 'opacity 0.2s, transform 0.2s',
              opacity: 1,
              transform: 'translateZ(0)',
              willChange: 'opacity, transform',
              border: '2px dashed #3b82f6', // Border azul para marcar imágenes en preview
              borderRadius: '4px'
            }}
            onError={(e) => {
              setImageErrors(prev => ({
                ...prev,
                [component.id]: true
              }));
            }}
          />
        );
      }
      
      case 'container': {
        const containerChildren = component.children || [];
        const containerConfig = component.containerConfig?.[deviceView] || {};
        const displayMode = containerConfig.displayMode || 'libre';
        
        let containerLayoutStyles = {};
        
        if (displayMode === 'flex') {
          containerLayoutStyles = {
            display: 'flex',
            flexDirection: containerConfig.flexDirection || 'row',
            justifyContent: containerConfig.justifyContent || 'flex-start',
            alignItems: containerConfig.alignItems || 'stretch',
            gap: containerConfig.gap || '10px'
          };
        } else if (displayMode === 'grid') {
          containerLayoutStyles = {
            display: 'grid',
            gridTemplateColumns: containerConfig.gridTemplateColumns || 'repeat(2, 1fr)',
            gridTemplateRows: containerConfig.gridTemplateRows || 'auto',
            gap: containerConfig.gap || '10px',
            justifyItems: containerConfig.justifyItems || 'start',
            alignItems: containerConfig.alignItems || 'start'
          };
        }
        
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              ...containerLayoutStyles,
              // En modo libre, los hijos usan position absolute
              position: displayMode === 'libre' ? baseStyles.position : 'relative'
            }}
          >
            {containerChildren.map(child => {
              if (typeof child === 'string') {
                const childComponent = bannerConfig.components.find(c => c.id === child);
                return childComponent ? renderComponent(childComponent) : null;
              }
              return renderComponent(child);
            })}
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <div className="relative" style={{ minHeight: height, padding: '20px' }}>
      {/* Banner con la misma lógica que BannerPreview */}
      <div 
        ref={bannerContainerRef} 
        style={{
          ...getLayoutStyles(),
          minHeight: height === 'auto' ? 'auto' : `calc(${height} - 40px)` // Restar padding
        }} 
        className="relative"
      >
        {bannerConfig.components
          ?.filter(comp => !comp.parentId)
          .map(comp => renderComponent(comp))}
      </div>
    </div>
  );
}

export default SimpleBannerPreview;