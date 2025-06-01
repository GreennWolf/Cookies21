import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl, processImageStyles } from '../../utils/imageProcessing';

function InteractiveBannerPreview({ 
  bannerConfig = { layout: { desktop: {} }, components: [] }, 
  deviceView = 'desktop',
  height = 'auto',
  onUpdateComponent = null
}) {
  const [imageErrors, setImageErrors] = useState({});
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [localUpdates, setLocalUpdates] = useState({});
  const bannerContainerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Memoizar la conversión de porcentajes
  const convertPercentageToPixels = useCallback((styleObj, referenceContainer, isChildComponent = false) => {
    if (!referenceContainer || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = referenceContainer.getBoundingClientRect();
      
      // Convertir width si es porcentaje
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        let percentValue = parseFloat(converted.width);
        if (isChildComponent && percentValue > 95) percentValue = 95;
        const pixelValue = (percentValue * containerRect.width) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir height si es porcentaje
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        let percentValue = parseFloat(converted.height);
        if (isChildComponent && percentValue > 95) percentValue = 95;
        const pixelValue = (percentValue * containerRect.height) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir otras propiedades
      ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          let percentValue = parseFloat(converted[prop]);
          if (isChildComponent && percentValue > 95) percentValue = 95;
          const isWidthProp = prop.includes('Width');
          const pixelValue = (percentValue * (isWidthProp ? containerRect.width : containerRect.height)) / 100;
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      // Silently handle errors
    }
    
    return converted;
  }, []);

  // Función simplificada para obtener URL de imagen
  const getImageUrlSimple = useCallback((component) => {
    try {
      // Usar _previewUrl del style si existe
      if (component.style?.[deviceView]?._previewUrl) {
        return component.style[deviceView]._previewUrl;
      }
      
      // Usar content directo
      if (typeof component.content === 'string') {
        if (component.content.startsWith('data:') || 
            component.content.startsWith('blob:') ||
            component.content.startsWith('http')) {
          return component.content;
        }
        
        if (component.content.startsWith('/')) {
          return `${window.location.origin}${component.content}`;
        }
      }
      
      // Placeholder por defecto
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlbjwvdGV4dD48L3N2Zz4=';
    } catch (error) {
      console.error('Error obteniendo URL de imagen:', error);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZjAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  }, [deviceView]);

  // Memoizar estilos del layout
  const layoutStyles = useMemo(() => {
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
  }, [bannerConfig.layout, deviceView]);

  // Manejadores de mouse optimizados
  const handleMouseDown = useCallback((e, component, action) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onUpdateComponent) return;
    
    // Verificar si es hijo de contenedor y su modo
    const isChildOfContainer = component.parentId;
    
    if (isChildOfContainer) {
      const parentContainer = bannerConfig.components.find(c => c.id === component.parentId);
      const parentDisplayMode = parentContainer?.containerConfig?.[deviceView]?.displayMode || 'libre';
      
      // En flex/grid containers, solo permitir resize, no drag
      if (parentDisplayMode === 'flex' || parentDisplayMode === 'grid') {
        if (action === 'drag') {
          return; // No permitir dragging en contenedores flex/grid
        }
      }
    }

    const rect = bannerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    isDraggingRef.current = true;
    
    if (action === 'drag') {
      const devicePos = component.position?.[deviceView] || {};
      const currentLeft = parseInt(devicePos.left || '0px');
      const currentTop = parseInt(devicePos.top || '0px');
      
      setDragState({
        id: component.id,
        startX,
        startY,
        startLeft: currentLeft,
        startTop: currentTop
      });
    } else if (action === 'resize') {
      const deviceStyle = component.style?.[deviceView] || {};
      const currentWidth = parseInt(deviceStyle.width || '200px');
      const currentHeight = parseInt(deviceStyle.height || '150px');
      
      setResizeState({
        id: component.id,
        startX,
        startY,
        startWidth: currentWidth,
        startHeight: currentHeight
      });
    }
  }, [onUpdateComponent, deviceView, bannerConfig.components]);

  // Usar mousemove global
  const handleGlobalMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    
    if (dragState) {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      
      const newLeft = Math.max(0, dragState.startLeft + deltaX);
      const newTop = Math.max(0, dragState.startTop + deltaY);
      
      // Actualización local inmediata para feedback visual
      setLocalUpdates(prev => ({
        ...prev,
        [dragState.id]: {
          position: {
            [deviceView]: {
              left: `${newLeft}px`,
              top: `${newTop}px`
            }
          }
        }
      }));
    }
    
    if (resizeState) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      const newWidth = Math.max(100, resizeState.startWidth + deltaX);
      const newHeight = Math.max(80, resizeState.startHeight + deltaY);
      
      // Actualización local inmediata para feedback visual
      setLocalUpdates(prev => ({
        ...prev,
        [resizeState.id]: {
          ...prev[resizeState.id],
          style: {
            [deviceView]: {
              width: `${newWidth}px`,
              height: `${newHeight}px`
            }
          }
        }
      }));
    }
  }, [dragState, resizeState, deviceView]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    // Enviar actualización final al componente padre
    if (dragState && onUpdateComponent) {
      const localUpdate = localUpdates[dragState.id];
      if (localUpdate?.position) {
        onUpdateComponent(dragState.id, { position: localUpdate.position });
      }
    }
    
    if (resizeState && onUpdateComponent) {
      const localUpdate = localUpdates[resizeState.id];
      if (localUpdate?.style) {
        onUpdateComponent(resizeState.id, { style: localUpdate.style });
      }
    }
    
    // Limpiar estados
    setDragState(null);
    setResizeState(null);
    setLocalUpdates({});
    isDraggingRef.current = false;
  }, [dragState, resizeState, localUpdates, onUpdateComponent]);

  // Eventos globales de mouse
  React.useEffect(() => {
    if (dragState || resizeState) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [dragState, resizeState, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Función para renderizar componentes optimizada
  const renderComponent = useCallback((component, parentContainerRef = null) => {
    if (!component) return null;
    
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Procesar estilos de imagen si es necesario
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...deviceStyle};

    // Aplicar actualizaciones locales
    const localUpdate = localUpdates[component.id] || {};
    const localPosition = localUpdate.position?.[deviceView] || {};
    const localStyle = localUpdate.style?.[deviceView] || {};

    // Convertir porcentajes a píxeles
    const isChildOfContainer = component.parentId;
    const convertedProcessedStyle = component.parentId && parentContainerRef ? 
      convertPercentageToPixels(processedStyle, parentContainerRef, true) : 
      bannerContainerRef.current ? 
        convertPercentageToPixels(processedStyle, bannerContainerRef.current, false) :
        processedStyle;

    // Determinar capacidades de interacción
    let parentDisplayMode = 'libre';
    if (isChildOfContainer) {
      const parentContainer = bannerConfig.components.find(c => c.id === component.parentId);
      parentDisplayMode = parentContainer?.containerConfig?.[deviceView]?.displayMode || 'libre';
    }

    const canDrag = onUpdateComponent && (!isChildOfContainer || parentDisplayMode === 'libre');
    const canResize = onUpdateComponent;
    const isInteractive = canDrag || canResize;

    // Estilos base con mejoras de tamaño para imágenes
    const baseStyles = isChildOfContainer ? {
      ...convertedProcessedStyle,
      ...localStyle,
      visibility: 'visible',
      opacity: 1,
      position: 'static',
      width: localStyle.width || convertedProcessedStyle.width || (component.type === 'image' ? '200px' : 'auto'),
      height: localStyle.height || convertedProcessedStyle.height || (component.type === 'image' ? '150px' : 'auto'),
      minWidth: component.type === 'image' ? '100px' : undefined,
      minHeight: component.type === 'image' ? '80px' : undefined,
      maxWidth: component.type === 'image' ? '100%' : undefined,
      maxHeight: component.type === 'image' ? '100%' : undefined
    } : {
      position: 'absolute',
      top: localPosition.top || devicePos.top || '0px',
      left: localPosition.left || devicePos.left || '0px',
      ...convertedProcessedStyle,
      ...localStyle,
      transform: 'translate(0, 0)',
      willChange: 'transform',
      visibility: 'visible',
      opacity: 1,
      width: localStyle.width || convertedProcessedStyle.width || (component.type === 'image' ? '200px' : undefined),
      height: localStyle.height || convertedProcessedStyle.height || (component.type === 'image' ? '150px' : undefined),
      minWidth: component.type === 'image' ? '100px' : undefined,
      minHeight: component.type === 'image' ? '80px' : undefined
    };

    // Contenido de texto
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

    // Renderizado por tipo de componente
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
        const imageUrl = getImageUrlSimple(component);
        const hasError = imageErrors[component.id];
        
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
        
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              position: baseStyles.position,
              cursor: canDrag ? 'move' : 'default',
              userSelect: 'none',
              padding: '0'
            }}
            onMouseDown={canDrag ? (e) => handleMouseDown(e, component, 'drag') : undefined}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              border: isInteractive ? '2px dashed #3b82f6' : 'none',
              borderRadius: '4px',
              overflow: 'visible'
            }}>
              <img
                src={imageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: convertedProcessedStyle.objectFit || 'contain',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
                onError={() => {
                  setImageErrors(prev => ({
                    ...prev,
                    [component.id]: true
                  }));
                }}
              />
              
              {/* Resize handle */}
              {canResize && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    right: '-8px',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#3b82f6',
                    cursor: 'se-resize',
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
                />
              )}
            </div>
            
            {/* Debug info */}
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
                {canDrag && canResize ? 'Arrastrable y redimensionable' : 
                 canResize ? 'Solo redimensionable' : 
                 'No editable'}
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
            ref={(el) => {
              // Crear referencia dinámica para el contenedor
              component._containerRef = el;
            }}
            style={{
              ...baseStyles,
              ...containerLayoutStyles,
              position: displayMode === 'libre' ? baseStyles.position : 'relative'
            }}
          >
            {containerChildren.map((child, index) => {
              if (typeof child === 'string') {
                const childComponent = bannerConfig.components.find(c => c.id === child);
                return childComponent ? renderComponent(childComponent, component._containerRef) : null;
              }
              return renderComponent(child, component._containerRef);
            })}
          </div>
        );
      }
      
      default:
        return null;
    }
  }, [
    deviceView, 
    localUpdates, 
    convertPercentageToPixels, 
    bannerConfig.components, 
    onUpdateComponent, 
    handleMouseDown, 
    imageErrors, 
    getImageUrlSimple
  ]);

  return (
    <div className="relative" style={{ minHeight: height, padding: '20px' }}>
      <div 
        ref={bannerContainerRef} 
        style={{
          ...layoutStyles,
          minHeight: height === 'auto' ? 'auto' : `calc(${height} - 40px)`,
          userSelect: 'none'
        }} 
        className="relative"
      >
        {(() => {
          const rootComponents = bannerConfig.components?.filter(comp => !comp.parentId) || [];
          
          // ORDENAR POR POSICIÓN Y para mantener el orden visual correcto (como en BannerThumbnail)
          const sortedComponents = rootComponents.sort((a, b) => {
            const aTop = parseFloat(a.position?.[deviceView]?.top || '0');
            const bTop = parseFloat(b.position?.[deviceView]?.top || '0');
            return aTop - bTop;
          });
          
          // DEBUG: Verificar orden de componentes en InteractiveBannerPreview
          console.log('🔄 InteractiveBanner: Orden de componentes (ANTES ordenar):', rootComponents.map(c => ({
            id: c.id,
            type: c.type,
            top: c.position?.[deviceView]?.top || '0%',
            content: typeof c.content === 'string' ? c.content.substring(0, 30) + '...' : 'object'
          })));
          
          console.log('🔄 InteractiveBanner: Orden de componentes (DESPUÉS ordenar):', sortedComponents.map(c => ({
            id: c.id,
            type: c.type,
            top: c.position?.[deviceView]?.top || '0%',
            content: typeof c.content === 'string' ? c.content.substring(0, 30) + '...' : 'object'
          })));
          
          return sortedComponents.map(comp => renderComponent(comp));
        })()}
      </div>
    </div>
  );
}

export default InteractiveBannerPreview;