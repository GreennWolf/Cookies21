import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../utils/imageProcessing';

function InteractiveBannerPreview({ 
  bannerConfig = { layout: { desktop: {} }, components: [] }, 
  deviceView = 'desktop',
  height = 'auto',
  onUpdateComponent = null
}) {
  const [imageErrors, setImageErrors] = useState({});
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const bannerContainerRef = useRef(null);

  // Función de estilos para vista previa (sin posicionamiento fijo)
  const getLayoutStyles = () => {
    const layout = bannerConfig.layout[deviceView] || {};
    const type = layout.type || 'banner';
    
    let baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      color: layout.color || '#000000',
      fontFamily: layout.fontFamily || 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      minHeight: layout.minHeight || '100px',
      width: '100%',
      padding: layout.padding || '20px',
      overflow: 'visible'
    };

    // Aplicar estilos específicos según el tipo
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
  // Función para convertir porcentajes a píxeles (copiada del BannerPreview original)
  const convertPercentageToPixels = (styleObj, bannerContainerRef) => {
    if (!bannerContainerRef || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = bannerContainerRef.getBoundingClientRect();
      
      // Convertir width si es porcentaje
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        const percentValue = parseFloat(converted.width);
        const pixelValue = (percentValue * containerRect.width) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir height si es porcentaje
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        const percentValue = parseFloat(converted.height);
        const pixelValue = (percentValue * containerRect.height) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir otras propiedades
      ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          const percentValue = parseFloat(converted[prop]);
          const isWidthProp = prop.includes('Width');
          const pixelValue = (percentValue * (isWidthProp ? containerRect.width : containerRect.height)) / 100;
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      // Silently handle errors
    }
    
    return converted;
  };

  const getImageUrl = (component) => {
    try {
      console.log('🔍 InteractiveBanner getImageUrl:', { 
        componentId: component.id, 
        previewUrl: component.style?.desktop?._previewUrl,
        content: component.content,
        deviceView: deviceView
      });
      
      const cacheBuster = `?cb=${Date.now()}`;
      
      // Check for preview URL in styles (usando deviceView en lugar de desktop)
      if (component.style?.[deviceView]?._previewUrl) {
        const previewUrl = component.style[deviceView]._previewUrl;
        console.log('✅ Usando _previewUrl:', previewUrl, 'type:', typeof previewUrl);
        
        // Asegurar que _previewUrl es un string
        if (typeof previewUrl === 'string') {
          return previewUrl;
        } else {
          console.warn('⚠️ _previewUrl no es string, es:', typeof previewUrl, previewUrl);
          // Intentar extraer URL si es un objeto
          if (previewUrl && typeof previewUrl === 'object') {
            if (previewUrl.url) return previewUrl.url;
            if (previewUrl.src) return previewUrl.src;
            if (previewUrl.href) return previewUrl.href;
          }
        }
      }
      
      // Handle data URIs and blob URLs
      if (typeof component.content === 'string') {
        if (component.content.startsWith('data:') || 
            component.content.startsWith('blob:')) {
          return component.content;
        }
        
        // Handle relative URLs
        if (component.content.startsWith('/')) {
          return `${window.location.origin}${component.content}${cacheBuster}`;
        }
        
        // Handle HTTP/HTTPS URLs
        if (component.content.startsWith('http://') || 
            component.content.startsWith('https://')) {
          return component.content;
        }
      }
      
      // Fallback placeholder
      console.log('⚠️ Usando placeholder para imagen:', component.id);
      const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4=';
      return placeholder;
    } catch (error) {
      console.error('❌ Error en getImageUrl:', error);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmMDAwMCIgdGV4dC1hbancho3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  // Handle mouse events for dragging and resizing
  const handleMouseDown = useCallback((e, component, action) => {
    console.log('handleMouseDown called:', { componentId: component.id, action, hasUpdateComponent: !!onUpdateComponent });
    
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar si es hijo de contenedor (igual que BannerPreview original)
    const isChildOfContainer = component.parentId;
    
    console.log('isChildOfContainer:', isChildOfContainer);
    
    if (!onUpdateComponent || isChildOfContainer) {
      console.log('Returning early - no update component or is child of container');
      return; // Solo para componentes libres
    }
    
    const rect = bannerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    if (action === 'drag') {
      const devicePos = component.position?.[deviceView] || {};
      const currentLeft = parseInt(devicePos.left || '0px');
      const currentTop = parseInt(devicePos.top || '0px');
      
      setDragging({
        id: component.id,
        startX,
        startY,
        startLeft: currentLeft,
        startTop: currentTop
      });
    } else if (action === 'resize') {
      const deviceStyle = component.style?.[deviceView] || {};
      const currentWidth = parseInt(deviceStyle.width || '100px');
      const currentHeight = parseInt(deviceStyle.height || '100px');
      
      setResizing({
        id: component.id,
        startX,
        startY,
        startWidth: currentWidth,
        startHeight: currentHeight
      });
    }
  }, [onUpdateComponent, deviceView]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        const deltaX = e.clientX - dragging.startX;
        const deltaY = e.clientY - dragging.startY;
        
        const newLeft = Math.max(0, dragging.startLeft + deltaX);
        const newTop = Math.max(0, dragging.startTop + deltaY);
        
        
        // Update component position
        if (onUpdateComponent) {
          onUpdateComponent(dragging.id, {
            position: {
              [deviceView]: {
                left: `${newLeft}px`,
                top: `${newTop}px`
              }
            }
          });
        }
      }
      
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const deltaY = e.clientY - resizing.startY;
        
        const newWidth = Math.max(50, resizing.startWidth + deltaX);
        const newHeight = Math.max(50, resizing.startHeight + deltaY);
        
        
        // Update component size
        if (onUpdateComponent) {
          onUpdateComponent(resizing.id, {
            style: {
              [deviceView]: {
                width: `${newWidth}px`,
                height: `${newHeight}px`
              }
            }
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
    };

    if (dragging || resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, onUpdateComponent, deviceView]);

  const renderComponent = (component) => {
    if (!component) return null;
    
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...deviceStyle};

    // Convertir estilos con porcentajes a píxeles (igual que en BannerPreview original)
    const convertedProcessedStyle = convertPercentageToPixels(processedStyle, bannerContainerRef.current);

    // Determinar si es hijo de contenedor basándose en la estructura real (igual que original)
    const isChildOfContainer = component.parentId;

    // Base styles with positioning (igual que BannerPreview original)
    const baseStyles = isChildOfContainer ? {
      // Para hijos de contenedores: NO usar position absolute
      ...convertedProcessedStyle,
      visibility: 'visible',
      opacity: 1,
      position: 'static',
      width: convertedProcessedStyle.width || 'auto',
      height: convertedProcessedStyle.height || 'auto'
    } : {
      // Para componentes raíz: usar position absolute normal
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...convertedProcessedStyle,
      transform: 'translate(0, 0)',
      willChange: 'transform',
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

    const isInteractive = onUpdateComponent && !isChildOfContainer;

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
        console.log('🔍 InteractiveBanner renderComponent image:', { 
          componentId: component.id, 
          deviceView,
          previewUrl: component.style?.[deviceView]?._previewUrl,
          content: component.content,
          fullStyle: component.style
        });
        
        const imageUrl = getImageUrl(component);
        console.log('🖼️ ImageUrl obtenida:', { componentId: component.id, imageUrl });
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
        
        // Render the image with interactive controls if available
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              border: isInteractive ? '2px dashed #3b82f6' : 'none',
              borderRadius: '4px',
              position: baseStyles.position,
              cursor: isInteractive ? 'move' : 'default',
              userSelect: 'none'
            }}
            onMouseDown={isInteractive ? (e) => handleMouseDown(e, component, 'drag') : undefined}
          >
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                pointerEvents: 'none', // Prevent image drag
                userSelect: 'none'
              }}
              onError={(e) => {
                setImageErrors(prev => ({
                  ...prev,
                  [component.id]: true
                }));
              }}
            />
            
            {/* Resize handle para imágenes libres */}
            {isInteractive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#3b82f6',
                  cursor: 'se-resize',
                  borderRadius: '0 0 4px 0',
                  border: '2px solid white'
                }}
                onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
              />
            )}
            
            {/* Debug info para imágenes interactivas */}
            {isInteractive && (
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '0',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  pointerEvents: 'none'
                }}
              >
                Arrastrable
              </div>
            )}
          </div>
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
          minHeight: height === 'auto' ? 'auto' : `calc(${height} - 40px)`,
          userSelect: 'none' // Prevent text selection during drag
        }} 
        className="relative"
      >
        {bannerConfig.components
          ?.filter(comp => !comp.parentId)
          .map(comp => renderComponent(comp))}
      </div>
      
      {/* Cursor styles */}
      <style jsx>{`
        .dragging {
          cursor: grabbing !important;
        }
        .resizing {
          cursor: se-resize !important;
        }
      `}</style>
    </div>
  );
}

export default InteractiveBannerPreview;