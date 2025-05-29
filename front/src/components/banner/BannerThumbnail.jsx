// src/components/BannerThumbnail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../utils/imageProcessing';

/**
 * Componente mejorado para mostrar una vista previa en miniatura de un banner
 * con mejor escala, renderizado y optimizaciones visuales
 */
const BannerThumbnail = ({ bannerConfig, className = '', deviceView = 'desktop' }) => {
  // Estado para rastrear errores de carga de imágenes
  const [imageErrors, setImageErrors] = useState({});
  // Estado para dimensiones del contenedor del thumbnail
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  // Referencias para medir el contenedor y los componentes
  const containerRef = useRef(null);
  const bannerRef = useRef(null);
  const componentsRef = useRef(new Map());
  
  // Verificar si es una plantilla del sistema
  const isSystemTemplate = bannerConfig?.type === 'system' || bannerConfig?.isSystemTemplate;

  // Actualizar dimensiones del contenedor
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    // Actualizar dimensiones iniciales
    updateDimensions();
    
    // Observar cambios de tamaño
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (!bannerConfig || !bannerConfig.layout) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-100 text-gray-400 text-xs ${className}`}>
        No hay vista previa disponible
      </div>
    );
  }

  // Obtener configuración layout para el dispositivo seleccionado
  const layout = bannerConfig.layout[deviceView] || {};
  const components = bannerConfig.components || [];
  
  // Función para calcular dimensiones del banner thumbnail manteniendo proporciones reales
  const getThumbnailDimensions = () => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return { width: '100%', height: '100%' };
    }
    
    // Dimensiones del contenedor del thumbnail (reducidas para mostrar banners más pequeños)
    const thumbWidth = containerDimensions.width * 0.85; // 85% del contenedor (reducido de 95%)
    const thumbHeight = containerDimensions.height * 0.80; // 80% para aprovechar más altura (reducido de 90%)
    
    // Factor de escala adicional para reducir el tamaño general
    const scaleFactor = 0.8; // Reducir a un 80% del tamaño original
    
    // Proporciones del banner real según su tipo con mejores ratios para visualización
    let aspectRatio = 16/9; // Default
    let minHeight = 80; // Altura mínima en píxeles (reducida de 100)
    
    if (layout.type === 'floating') {
      aspectRatio = 4/3; // Más alto para mejor visualización
      minHeight = 90; // Reducido de 120
    } else if (layout.type === 'modal') {
      aspectRatio = 3/2; // Proporción más alta para modales
      minHeight = 100; // Reducido de 140
    } else if (layout.type === 'banner') {
      aspectRatio = 3.5/1; // Proporción para banners
      minHeight = 70; // Reducido de 100
    }
    
    // Calcular dimensiones manteniendo aspect ratio (con factor de escala aplicado)
    let finalWidth = thumbWidth * scaleFactor;
    let finalHeight = (thumbWidth / aspectRatio) * scaleFactor;
    
    // Asegurar altura mínima para mejor visualización
    if (finalHeight < minHeight) {
      finalHeight = minHeight;
      finalWidth = finalHeight * aspectRatio;
    }
    
    // Si excede la altura disponible, ajustar por altura
    if (finalHeight > thumbHeight) {
      finalHeight = thumbHeight;
      finalWidth = thumbHeight * aspectRatio;
    }
    
    // Si excede el ancho disponible, ajustar por ancho
    if (finalWidth > thumbWidth) {
      finalWidth = thumbWidth;
      finalHeight = thumbWidth / aspectRatio;
    }
    
    return {
      width: `${finalWidth}px`,
      height: `${finalHeight}px`
    };
  };

  // Función para convertir porcentajes a píxeles adaptada para thumbnails
  const convertPercentageToPixels = (styleObj, bannerRef) => {
    if (!styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      // Usar las dimensiones del thumbnail calculadas
      const thumbDimensions = getThumbnailDimensions();
      const thumbWidth = parseFloat(thumbDimensions.width) || containerDimensions.width || 200;
      const thumbHeight = parseFloat(thumbDimensions.height) || containerDimensions.height || 100;
      
      // Convertir width si es porcentaje
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        const percentValue = parseFloat(converted.width);
        const pixelValue = (percentValue * thumbWidth) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir height si es porcentaje
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        const percentValue = parseFloat(converted.height);
        const pixelValue = (percentValue * thumbHeight) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir otras propiedades
      ['maxWidth', 'minWidth', 'maxHeight', 'minHeight', 'top', 'left', 'right', 'bottom'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          const percentValue = parseFloat(converted[prop]);
          const isWidthProp = prop.includes('Width') || prop === 'left' || prop === 'right';
          const reference = isWidthProp ? thumbWidth : thumbHeight;
          const pixelValue = (percentValue * reference) / 100;
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      // Silently handle errors
    }
    
    return converted;
  };

  // Debug temporal - eliminar después
  if (process.env.NODE_ENV === 'development' && components.length > 0) {
    const containers = components.filter(c => c.type === 'container');
    const containerDetails = containers.map(c => ({
      id: c.id,
      childrenCount: c.children?.length || 0,
      childrenTypes: c.children?.map(child => 
        typeof child === 'string' ? 
          components.find(comp => comp.id === child)?.type || 'unknown' :
          child.type || 'unknown'
      ) || []
    }));
    
    console.log('🔍 Thumbnail Debug:', {
      totalComponents: components.length,
      rootComponents: components.filter(c => !c.parentId).length,
      containers: containers.length,
      containerDetails,
      images: components.filter(c => c.type === 'image').length,
      allComponentTypes: components.map(c => ({ id: c.id, type: c.type, parentId: c.parentId })),
      dimensions: containerDimensions,
      thumbDims: containerDimensions.width ? getThumbnailDimensions() : 'not ready'
    });
  }
  
  // Función mejorada para obtener estilos de layout sin escalado distorsionador
  const getLayoutStyles = () => {
    const dimensions = getThumbnailDimensions();
    
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: dimensions.width,
      height: dimensions.height,
      position: 'relative',
      borderRadius: layout.borderRadius || '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.05)'
    };

    if (layout.type === 'banner') {
      // Banner estándar (arriba, abajo o centro)
      const style = {
        ...baseStyles,
        position: 'absolute'
      };
      
      if (layout.position === 'top') {
        style.top = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.left = 0;
        style.right = 0;
        style.transform = 'translateY(-50%)';
      }
      return style;
    } else if (layout.type === 'floating') {
      // Banner flotante con soporte mejorado para posicionamiento
      const style = {
        ...baseStyles,
        position: 'absolute',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 1000,
        maxWidth: '90%'
      };
      
      // Determinar posición basada en múltiples fuentes de datos
      let position = layout.position || layout['data-floating-corner'] || layout.floatingCorner || 'bottom-right';
      
      // Asegurar compatibilidad con diferentes formatos de posición
      if (position === 'bottomRight' || position === 'bottom-right' || position.includes('bottom') && position.includes('right')) {
        style.bottom = '8%';
        style.right = '8%';
      } else if (position === 'bottomLeft' || position === 'bottom-left' || position.includes('bottom') && position.includes('left')) {
        style.bottom = '8%';
        style.left = '8%';
      } else if (position === 'topRight' || position === 'top-right' || position.includes('top') && position.includes('right')) {
        style.top = '8%';
        style.right = '8%';
      } else if (position === 'topLeft' || position === 'top-left' || position.includes('top') && position.includes('left')) {
        style.top = '8%';
        style.left = '8%';
      } else {
        // Posición por defecto
        style.bottom = '8%';
        style.right = '8%';
      }
      
      return style;
    } else if (layout.type === 'modal') {
      // Modal con mejor centrado
      return {
        ...baseStyles,
        maxWidth: '90%',
        width: '85%',
        margin: '0 auto',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: '10px',
        padding: '16px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      };
    }
    
    return baseStyles;
  };

  // Renderizar componente respetando proporciones reales (como el editor preview)
  const renderComponent = (component, isChild = false) => {
    if (!component) return null;
    
    // Posición y estilo específicos del dispositivo
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...deviceStyle};
    
    // Convertir estilos con porcentajes a píxeles
    const convertedProcessedStyle = convertPercentageToPixels(processedStyle, bannerRef.current);
    
    // Calcular dimensiones mínimas para mejor visibilidad en thumbnail (reducidas)
    const getMinDimensions = (type) => {
      switch (type) {
        case 'image':
          return { minWidth: '30px', minHeight: '24px' }; // Reducido de 40px/30px
        case 'button':
          return { minWidth: '35px', minHeight: '16px' }; // Reducido de 50px/20px
        case 'text':
          return { minWidth: '25px', minHeight: '14px' }; // Reducido de 30px/16px
        default:
          return { minWidth: '16px', minHeight: '14px' }; // Reducido de 20px/16px
      }
    };
    
    const minDims = getMinDimensions(component.type);
    
    // Base styles con posicionamiento - mejorado para hijos de contenedores
    const baseStyles = isChild || component.parentId ? {
      // Para hijos de contenedores: usar position static y aplicar todos los estilos
      ...convertedProcessedStyle,
      position: 'static',
      // Asegurar dimensiones mínimas para visibilidad
      width: convertedProcessedStyle.width || minDims.minWidth,
      height: convertedProcessedStyle.height || minDims.minHeight,
      minWidth: minDims.minWidth,
      minHeight: minDims.minHeight,
      // Mejorar visibilidad
      visibility: 'visible',
      opacity: convertedProcessedStyle.opacity || 1,
      // Para imágenes, asegurar object-fit
      ...(component.type === 'image' && {
        objectFit: convertedProcessedStyle.objectFit || 'contain',
        objectPosition: convertedProcessedStyle.objectPosition || 'center',
        display: 'block'
      }),
      // Para texto, mejorar legibilidad
      ...(component.type === 'text' && {
        fontSize: Math.max(8, parseFloat(convertedProcessedStyle.fontSize) * 0.8 || 10) + 'px',
        lineHeight: '1.1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxHeight: '2.2em'
      }),
      // Para botones, mejorar apariencia
      ...(component.type === 'button' && {
        fontSize: Math.max(7, parseFloat(convertedProcessedStyle.fontSize) * 0.75 || 9) + 'px',
        padding: convertedProcessedStyle.padding || '3px 6px',
        textAlign: 'center',
        cursor: 'default',
        whiteSpace: 'nowrap'
      })
    } : {
      // Para componentes raíz: usar position absolute con conversión de posición
      position: 'absolute',
      top: convertPercentageToPixels({ top: devicePos.top }, bannerRef.current).top || '0px',
      left: convertPercentageToPixels({ left: devicePos.left }, bannerRef.current).left || '0px',
      ...convertedProcessedStyle,
      // Asegurar dimensiones mínimas
      minWidth: minDims.minWidth,
      minHeight: minDims.minHeight,
      // Force transform to ensure precise positioning
      transform: 'translate(0, 0)',
      willChange: 'transform',
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1
    };
    
    // Extraer contenido para mostrar
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
    
    // Lógica específica según el tipo de componente
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
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
        
      case 'image': {
        const imageUrl = getImageUrl(component, deviceView, 'thumbnail');
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
                color: '#666',
                fontSize: '10px'
              }}
            >
              <ImageOff size={16} className="text-gray-400" />
            </div>
          );
        }
        
        // Render the image with proper styles
        return (
          <img
            key={component.id}
            src={imageUrl}
            alt=""
            style={{
              ...baseStyles,
              // Asegurar que la imagen se muestre correctamente
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: baseStyles.objectFit || 'contain',
              objectPosition: baseStyles.objectPosition || 'center',
              display: 'block'
            }}
            crossOrigin="anonymous"
            onLoad={() => {
              // Clear error state if image loads successfully
              if (imageErrors[component.id]) {
                setImageErrors(prev => {
                  const newErrors = {...prev};
                  delete newErrors[component.id];
                  return newErrors;
                });
              }
            }}
            onError={(e) => {
              // Usar el manejador de errores centralizado con callback simple
              setImageErrors(prev => ({ ...prev, [component.id]: true }));
            }}
          />
        );
      }

      case 'container': {
        // Renderizar contenedor con sus hijos
        const containerConfig = component.containerConfig?.[deviceView] || {};
        const displayMode = containerConfig.displayMode || 'libre';
        
        // Convertir estilos con porcentajes a píxeles
        const convertedProcessedStyle = convertPercentageToPixels(processedStyle, bannerRef.current);
        
        // Estilos del contenedor EXTERNO (posicionamiento en canvas)
        const containerOuterStyles = {
          position: 'absolute',
          top: devicePos.top || '0px',
          left: devicePos.left || '0px',
          width: convertedProcessedStyle.width || 'auto',
          height: convertedProcessedStyle.height || 'auto',
          minWidth: convertedProcessedStyle.minWidth || '40px',
          minHeight: convertedProcessedStyle.minHeight || '40px',
          visibility: 'visible',
          opacity: 1,
          zIndex: 1,
        };

        // Estilos del contenedor INTERNO (layout de hijos)
        const containerInnerStyles = {
          // CRÍTICO: position relative para que los hijos absolutos se posicionen dentro
          position: 'relative',
          width: '100%',
          height: '100%',
          // Estilos visuales del contenedor
          backgroundColor: processedStyle.backgroundColor || 'rgba(59, 130, 246, 0.05)',
          border: processedStyle.border || '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: processedStyle.borderRadius || '4px',
          padding: processedStyle.padding || '10px',
          // Layout del contenedor
          display: displayMode === 'flex' ? 'flex' : displayMode === 'grid' ? 'grid' : 'block',
          // Propiedades específicas del modo
          ...(displayMode === 'flex' && {
            flexDirection: containerConfig.flexDirection || 'row',
            justifyContent: containerConfig.justifyContent || 'flex-start',
            alignItems: containerConfig.alignItems || 'stretch',
            gap: containerConfig.gap || '10px'
          }),
          ...(displayMode === 'grid' && {
            gridTemplateColumns: containerConfig.gridTemplateColumns || 'repeat(2, 1fr)',
            gridTemplateRows: containerConfig.gridTemplateRows || 'auto',
            justifyItems: containerConfig.justifyItems || 'flex-start',
            alignItems: containerConfig.alignItems || 'flex-start',
            gap: containerConfig.gap || '10px'
          })
        };
        
        return (
          <div 
            key={component.id} 
            style={containerOuterStyles}
          >
            <div style={containerInnerStyles}>
              {/* Renderizar hijos del contenedor */}
              {component.children && component.children.map(child => {
                let childWrapperStyle = {};
                
                if (displayMode === 'libre') {
                  // En modo libre: posición absoluta
                  const childPos = child.position?.[deviceView] || {};
                  // Convertir posiciones porcentuales del hijo respecto al contenedor
                  const convertedChildStyle = convertPercentageToPixels({
                    top: childPos.top,
                    left: childPos.left
                  }, bannerRef.current);
                  
                  childWrapperStyle = {
                    position: 'absolute',
                    top: convertedChildStyle.top || '0px',
                    left: convertedChildStyle.left || '0px'
                  };
                } else {
                  // En modo flex/grid: posición relativa
                  childWrapperStyle = {
                    position: 'relative'
                  };
                }
                
                return (
                  <div key={child.id} style={childWrapperStyle}>
                    {renderComponent(child, true)}
                  </div>
                );
              })}
              
              {/* Placeholder más sutil cuando está vacío */}
              {(!component.children || component.children.length === 0) && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'rgba(153, 153, 153, 0.3)',
                  fontSize: '8px',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  padding: '1px 4px',
                  backgroundColor: 'rgba(240, 240, 240, 0.2)',
                  borderRadius: '3px'
                }}>
                  <span style={{ opacity: 0.5 }}>•••</span>
                </div>
              )}
            </div>
          </div>
        );
      }
        
      default:
        return null;
    }
  };
  
  // Fondo simulado para mejor contexto visual
  const renderBackgroundPlaceholder = () => {
    // Mostrar placeholder sutil para todos los tipos
    return (
      <div className="absolute inset-0 opacity-5" style={{ zIndex: 0 }}>
        <div className="h-full w-full bg-gradient-to-b from-gray-200 to-gray-100"></div>
      </div>
    );
  };

  return (
    <div 
      className={`banner-thumbnail relative ${className}`}
      style={{ 
        height: '100%', 
        width: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        boxSizing: 'border-box',
        borderRadius: '6px',
        position: 'relative'
      }}
      ref={containerRef}
    >
      {/* Etiqueta de plantilla del sistema */}
      {isSystemTemplate && (
        <div className="absolute top-1 right-1 z-10 bg-blue-600 text-white px-1 py-0.5 rounded-sm text-[9px] font-medium">
          S
        </div>
      )}
      
      {/* Contenedor del banner centrado con mejor visualización */}
      <div 
        ref={bannerRef}
        className="relative" 
        style={{
          ...getLayoutStyles(),
          margin: 'auto',
          position: 'relative'
        }}
      >
        {renderBackgroundPlaceholder()}
        {/* Renderizar todos los componentes raíz ordenados por posición Y */}
        {components
          .filter(comp => !comp.parentId)
          .sort((a, b) => {
            // Ordenar por posición Y para mantener el orden visual correcto
            const aTop = parseFloat(a.position?.[deviceView]?.top || '0');
            const bTop = parseFloat(b.position?.[deviceView]?.top || '0');
            return aTop - bTop;
          })
          .map(component => {
            // Si es un contenedor, asegurarse de que tiene sus hijos correctamente enlazados
            if (component.type === 'container') {
              // Mejorar la detección de hijos de contenedores
              let childComponents = [];
              
              // Caso 1: children es array de objetos completos
              if (component.children && Array.isArray(component.children) && 
                  component.children.length > 0 && typeof component.children[0] === 'object') {
                childComponents = component.children;
              }
              // Caso 2: children es array de IDs
              else if (component.children && Array.isArray(component.children)) {
                childComponents = components.filter(c => 
                  component.children.some(childId => 
                    (typeof childId === 'string' ? childId : childId?.id) === c.id
                  )
                );
              }
              // Caso 3: buscar componentes que tengan este contenedor como parentId
              if (childComponents.length === 0) {
                childComponents = components.filter(c => c.parentId === component.id);
              }
              
              return renderComponent({
                ...component,
                children: childComponents
              }, false);
            }
            return renderComponent(component, false);
          })}
      </div>
    </div>
  );
};

export default BannerThumbnail;