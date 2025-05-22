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
  // Estado para seguir el factor de escala calculado
  const [scaleFactor, setScaleFactor] = useState(1);
  // Referencias para medir el contenedor y los componentes
  const containerRef = useRef(null);
  const componentsRef = useRef(new Map());
  
  // Verificar si es una plantilla del sistema
  const isSystemTemplate = bannerConfig?.type === 'system' || bannerConfig?.isSystemTemplate;

  // Calcular el factor de escala cuando cambia la configuración o el tamaño del contenedor
  useEffect(() => {
    if (!containerRef.current || !bannerConfig || !bannerConfig.layout) return;
    
    // Función para calcular el factor de escala basado en el tamaño del contenedor
    const calculateScaleFactor = () => {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Tamaño original del banner según su tipo
      let originalWidth, originalHeight;
      const layout = bannerConfig.layout[deviceView] || {};
      
      if (layout.type === 'floating') {
        originalWidth = 300; // Ancho de referencia para banners flotantes
        originalHeight = 200; // Alto de referencia para banners flotantes
      } else if (layout.type === 'modal') {
        originalWidth = 400; // Ancho de referencia para modales
        originalHeight = 300; // Alto de referencia para modales
      } else {
        originalWidth = containerWidth; // Ancho de referencia para banners estándar
        originalHeight = 150; // Alto de referencia para banners estándar
      }
      
      // Calcular escalas horizontal y vertical
      const scaleX = (containerWidth * 0.9) / originalWidth;
      const scaleY = (containerHeight * 0.9) / originalHeight;
      
      // Usar la escala más pequeña para mantener proporciones
      const newScale = Math.min(scaleX, scaleY, 1); // Limitar a máximo 1 (sin agrandar)
      setScaleFactor(newScale);
      
      return newScale;
    };
    
    // Calcular escala inicial
    calculateScaleFactor();
    
    // Configurar observador de tamaño para recalcular cuando cambie el tamaño
    const resizeObserver = new ResizeObserver(() => {
      calculateScaleFactor();
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [bannerConfig, deviceView]);

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
  
  // Función mejorada para obtener estilos de layout con mejor posicionamiento
  const getLayoutStyles = () => {
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '50px',
      position: 'relative',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      transition: 'transform 0.3s ease',
      transform: `scale(${scaleFactor})`,
      transformOrigin: 'center center'
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
        style.transform = `translateY(-50%) scale(${scaleFactor})`;
      }
      return style;
    } else if (layout.type === 'floating') {
      // Banner flotante con soporte mejorado para posicionamiento
      const style = {
        ...baseStyles,
        position: 'absolute',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
        borderRadius: '6px',
        padding: '10px',
        zIndex: 1000,
        maxWidth: '80%'
      };
      
      // Determinar posición basada en múltiples fuentes de datos
      let position = layout.position || layout['data-floating-corner'] || layout.floatingCorner || 'bottom-right';
      
      // Asegurar compatibilidad con diferentes formatos de posición
      if (position === 'bottomRight' || position === 'bottom-right' || position.includes('bottom') && position.includes('right')) {
        style.bottom = '10%';
        style.right = '10%';
      } else if (position === 'bottomLeft' || position === 'bottom-left' || position.includes('bottom') && position.includes('left')) {
        style.bottom = '10%';
        style.left = '10%';
      } else if (position === 'topRight' || position === 'top-right' || position.includes('top') && position.includes('right')) {
        style.top = '10%';
        style.right = '10%';
      } else if (position === 'topLeft' || position === 'top-left' || position.includes('top') && position.includes('left')) {
        style.top = '10%';
        style.left = '10%';
      } else {
        // Posición por defecto
        style.bottom = '10%';
        style.right = '10%';
      }
      
      return style;
    } else if (layout.type === 'modal') {
      // Modal con mejor centrado
      return {
        ...baseStyles,
        maxWidth: '80%',
        width: '80%',
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '15px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scaleFactor})`,
        zIndex: 1000
      };
    }
    
    return baseStyles;
  };

  // Renderizar componente con escalado optimizado
  const renderComponent = (component) => {
    if (!component) return null;
    
    // Posición y estilo específicos del dispositivo
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Factor de escala para componentes (proporcional al thumbnail)
    const compScale = 0.9; // Ligera reducción de escala para mejor ajuste
    
    // Estilos base de posicionamiento
    const baseStyles = {
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      // Aplicar transform para escalar y mantener posición
      transform: `scale(${compScale})`,
      transformOrigin: 'top left'
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
      case 'text': {
        // Optimizar presentación de texto en thumbnails
        const textStyles = {
          ...baseStyles,
          ...deviceStyle,
          fontSize: deviceStyle.fontSize || '12px', // Tamaño predeterminado para legibilidad
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', // Evitar desbordamiento
          padding: deviceStyle.padding || '2px',
          lineHeight: deviceStyle.lineHeight || '1.2',
          textShadow: '0 0 1px rgba(0,0,0,0.05)' // Mejorar legibilidad
        };
        
        return (
          <div 
            key={component.id} 
            style={textStyles}
            ref={el => el && componentsRef.current.set(component.id, el)}
          >
            {displayContent}
          </div>
        );
      }
        
      case 'button': {
        // Estilos optimizados para botones en vistas previas
        let buttonBackground = deviceStyle.backgroundColor;
        let buttonColor = deviceStyle.color;
        
        // Colores predeterminados según el tipo de acción
        if (!buttonBackground && component.action) {
          if (component.action.type === 'accept_all') {
            buttonBackground = '#4CAF50'; // Verde para aceptar
            buttonColor = 'white';
          } else if (component.action.type === 'reject_all') {
            buttonBackground = '#f44336'; // Rojo para rechazar
            buttonColor = 'white';
          } else if (component.action.type === 'show_preferences') {
            buttonBackground = '#2196F3'; // Azul para preferencias
            buttonColor = 'white';
          }
        }
        
        const buttonStyles = {
          ...baseStyles,
          ...deviceStyle,
          backgroundColor: buttonBackground || deviceStyle.backgroundColor || '#757575',
          color: buttonColor || deviceStyle.color || 'white',
          borderRadius: deviceStyle.borderRadius || '3px',
          padding: deviceStyle.padding || '2px 5px',
          fontSize: deviceStyle.fontSize || '8px',
          fontWeight: 'bold',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          cursor: 'default',
          border: 'none',
          maxWidth: '80px', // Limitar ancho máximo
          minWidth: '30px' // Menor ancho mínimo
        };
        
        return (
          <div
            key={component.id}
            style={buttonStyles}
            ref={el => el && componentsRef.current.set(component.id, el)}
          >
            {displayContent}
          </div>
        );
      }
        
      case 'image': {
        // Gestión mejorada de imágenes en thumbnails
        const imageUrl = getImageUrl(component, deviceView, 'thumbnail');
        const hasError = imageErrors[component.id];
        const isCustomized = deviceStyle?._imageCustomized;
        
        // Procesamiento de estilos para imágenes
        const processedStyle = processImageStyles(component, deviceView);
        
        // Si hay error, mostrar placeholder
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
                width: processedStyle?.width || '80px',
                height: processedStyle?.height || '60px',
                minWidth: '40px',
                minHeight: '30px'
              }}
            >
              <ImageOff size={14} className="text-gray-400" />
            </div>
          );
        }
        
        // Estilos optimizados para imágenes en thumbnails
        const imageStyles = {
          ...baseStyles,
          width: processedStyle?.width || '80px',
          height: processedStyle?.height || '60px',
          minWidth: '40px',
          minHeight: '30px',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: processedStyle?.objectFit || 'contain',
          objectPosition: processedStyle?.objectPosition || 'center',
          boxSizing: 'border-box',
          display: 'block',
          border: isCustomized ? '1px solid rgba(25, 118, 210, 0.4)' : 'none',
          imageRendering: 'auto',
          borderRadius: processedStyle?.borderRadius || '2px'
        };
        
        return (
          <div className="relative" key={component.id} style={baseStyles}>
            <img
              src={imageUrl}
              alt=""
              className="banner-thumbnail-image"
              style={imageStyles}
              crossOrigin="anonymous"
              ref={el => el && componentsRef.current.set(component.id, el)}
              onLoad={() => {
                // Limpiar errores si la imagen carga correctamente
                if (imageErrors[component.id]) {
                  setImageErrors(prev => {
                    const newErrors = {...prev};
                    delete newErrors[component.id];
                    return newErrors;
                  });
                }
              }}
              onError={(e) => {
                // Usar el manejador de errores centralizado
                handleImageError(
                  e, 
                  imageUrl, 
                  component.id, 
                  (id, hasError) => setImageErrors(prev => ({ ...prev, [id]: hasError }))
                );
              }}
            />
            {isCustomized && (
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                color: 'white',
                fontSize: '7px',
                padding: '1px 2px',
                borderRadius: '2px',
                zIndex: 10,
                transform: 'scale(0.9)'
              }}>
                P
              </div>
            )}
          </div>
        );
      }
        
      default:
        return null;
    }
  };
  
  // Fondo simulado para banners (opcional)
  const renderBackgroundPlaceholder = () => {
    if (layout.type !== 'floating') return null;
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
        <div className="w-3/4 h-3 bg-gray-300 rounded mb-2"></div>
        <div className="w-2/3 h-2 bg-gray-300 rounded mb-2"></div>
        <div className="w-3/4 h-2 bg-gray-300 rounded"></div>
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
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        boxSizing: 'border-box',
        borderRadius: '6px'
      }}
      ref={containerRef}
    >
      {/* Etiqueta de plantilla del sistema */}
      {isSystemTemplate && (
        <div className="absolute top-1 right-1 z-10 bg-blue-600 text-white px-1 py-0.5 rounded-sm text-[9px] font-medium">
          S
        </div>
      )}
      
      {/* Contenedor del banner con fondo simulado */}
      <div 
        className="relative flex items-center justify-center" 
        style={{ 
          ...getLayoutStyles(),
          width: layout.type === 'floating' ? '90%' : '95%',
          height: layout.type === 'floating' ? '80%' : '90%',
          margin: 'auto'
        }}
      >
        {renderBackgroundPlaceholder()}
        {components.map(renderComponent)}
      </div>
      
      {/* Estilos adicionales para mejorar la presentación */}
      <style>{`
        .banner-thumbnail-image {
          transition: opacity 0.2s ease;
        }
        .banner-thumbnail-image:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default BannerThumbnail;