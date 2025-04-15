// src/components/BannerThumbnail.jsx
import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Componente para mostrar una vista previa en miniatura de un banner
 * siguiendo exactamente el mismo enfoque que BannerPreview pero con tamaños ajustados
 */
const BannerThumbnail = ({ bannerConfig, className = '', deviceView = 'desktop' }) => {
  // Estado para rastrear errores de carga de imágenes
  const [imageErrors, setImageErrors] = useState({});

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
  
  const getLayoutStyles = () => {
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '50px',
      position: 'relative'
    };

    if (layout.type === 'banner') {
      // Banner
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
      // Flotante
      return {
        ...baseStyles,
        position: 'absolute',
        right: '10px',
        bottom: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        padding: '8px',
        zIndex: 1000
      };
    } else if (layout.type === 'modal') {
      // Modal
      return {
        ...baseStyles,
        maxWidth: '300px',
        width: '80%',
        margin: '0 auto',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        padding: '12px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      };
    }
    return baseStyles;
  };
  
  // Función para extraer la URL de imagen
  const getImageUrl = (component) => {
    // Si hay un estilo con vista previa, usarlo con prioridad
    const deviceStyle = component.style?.[deviceView];
    if (deviceStyle?._previewUrl) {
      return deviceStyle._previewUrl;
    }
    
    // Si el contenido es un string, verificar si es una URL directa
    if (typeof component.content === 'string') {
      // Si es una referencia temporal, mostrar placeholder
      if (component.content.startsWith('__IMAGE_REF__')) {
        return '/placeholder.png';
      }
      // Si es una URL directa, usarla
      return component.content;
    }
    
    // Si el contenido es un objeto con textos, buscar en textos
    if (component.content && typeof component.content === 'object') {
      if (component.content.texts?.en) {
        return component.content.texts.en;
      }
      
      // Buscar en cualquier texto disponible
      if (component.content.texts) {
        const firstTextKey = Object.keys(component.content.texts)[0];
        if (firstTextKey) {
          return component.content.texts[firstTextKey];
        }
      }
    }
    
    // Si no se encuentra ninguna URL, devolver imagen predeterminada
    return '/placeholder.png';
  };

  // Renderizar componente con ajustes de tamaño adecuados
  const renderComponent = (component) => {
    if (!component) return null;
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Ajustar posición exacta
    const baseStyles = {
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px'
    };
  
    // Extraer el contenido textual correctamente
    let displayContent = '';
    if (typeof component.content === 'string') {
      displayContent = component.content;
    } else if (component.content && typeof component.content === 'object') {
      // Intentar obtener el texto en inglés o el primer texto disponible
      if (component.content.texts && typeof component.content.texts === 'object') {
        displayContent = component.content.texts.en || Object.values(component.content.texts)[0] || '';
      } else if (component.content.text) {
        displayContent = component.content.text;
      }
    }
  
    switch (component.type) {
      case 'text': {
        // Mantener el estilo original pero ajustar tamaño de fuente
        const textStyles = {
          ...baseStyles,
          ...deviceStyle,
          // No sobrescribir fontSize si ya está definido
          fontSize: deviceStyle.fontSize || '10px'
        };
        
        return (
          <div key={component.id} style={textStyles}>
            {displayContent}
          </div>
        );
      }
        
      case 'button': {
        // Determinar color del botón según acción o usar estilo existente
        let buttonBackground = deviceStyle.backgroundColor;
        let buttonColor = deviceStyle.color;
        
        // Si no hay color definido, usar colores por defecto según acción
        if (!buttonBackground && component.action) {
          if (component.action.type === 'accept_all') {
            buttonBackground = '#4CAF50'; // Verde
            buttonColor = 'white';
          } else if (component.action.type === 'reject_all') {
            buttonBackground = '#f44336'; // Rojo
            buttonColor = 'white';
          } else if (component.action.type === 'show_preferences') {
            buttonBackground = '#2196F3'; // Azul
            buttonColor = 'white';
          }
        }
        
        // Estilos específicos para botones, manteniendo posición original
        const buttonStyles = {
          ...baseStyles,
          ...deviceStyle,
          backgroundColor: buttonBackground || deviceStyle.backgroundColor || '#757575',
          color: buttonColor || deviceStyle.color || 'white',
          borderRadius: deviceStyle.borderRadius || '4px',
          padding: deviceStyle.padding || '3px 6px',
          fontSize: deviceStyle.fontSize || '7px',
          fontWeight: 'bold',
          minWidth: '45px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          cursor: 'default',
          border: 'none',
          transform: 'scale(0.50)'
        };
        
        return (
          <div
            key={component.id}
            style={buttonStyles}
          >
            {displayContent}
          </div>
        );
      }
        
      case 'image': {
        const imageUrl = getImageUrl(component);
        const hasError = imageErrors[component.id];
        
        // Si hay error en la carga, mostrar marcador de error
        if (hasError) {
          return (
            <div 
              key={component.id} 
              style={{
                ...baseStyles,
                ...deviceStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f8f8',
                border: '1px dashed #ccc',
                color: '#666',
                width: deviceStyle.width || '30px',
                height: deviceStyle.height || '20px'
              }}
            >
              <ImageOff size={10} className="text-gray-400" />
            </div>
          );
        }
        
        return (
          <img
            key={component.id}
            src={imageUrl}
            alt=""
            style={{
              ...baseStyles,
              ...deviceStyle,
              maxWidth: deviceStyle.width || '40px',
              maxHeight: deviceStyle.height || '30px',
              objectFit: 'contain',
              transform: 'scale(0.60)'
            }}
            onError={() => {
              setImageErrors(prev => ({
                ...prev,
                [component.id]: true
              }));
            }}
          />
        );
      }
        
      default:
        return null;
    }
  };

  return (
    <div className={`banner-thumbnail relative ${className}`}
         style={{ height: '100%', overflow: 'hidden', backgroundColor: '#fff' }}>
      <div style={getLayoutStyles()}>
        {bannerConfig.components?.map(renderComponent)}
      </div>
    </div>
  );
};

export default BannerThumbnail;