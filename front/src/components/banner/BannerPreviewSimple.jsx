// src/components/banner/BannerPreviewSimple.jsx
import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../utils/imageProcessing';

/**
 * Una versión simplificada de BannerPreview para mostrar previsualizaciones más fidedignas
 * en modales de cliente, manteniendo la lógica de renderizado de BannerPreview
 */
function BannerPreviewSimple({ bannerConfig, deviceView = 'desktop', className }) {
  // Asegurarse de que bannerConfig tenga una estructura válida
  const safeConfig = bannerConfig || { layout: { desktop: {} }, components: [] };
  const [imageErrors, setImageErrors] = useState({});

  const getLayoutStyles = () => {
    // Verificar que safeConfig y safeConfig.layout existan
    const layoutConfig = safeConfig?.layout || {};
    const layout = layoutConfig[deviceView] || {};
    
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '100px',
      // Mejor visualización
      maxWidth: '95%',
      maxHeight: '95%'
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
        right: '20px',
        bottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000
      };
    } else if (layout.type === 'modal') {
      // Modal - Implementación mejorada para garantizar centrado
      return {
        ...baseStyles,
        maxWidth: '600px',
        width: '90%',
        margin: '0 auto',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '24px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        display: 'flex',  
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      };
    }
    return baseStyles;
  };

  const renderComponent = (component) => {
    if (!component) return null;
    const devicePos = component.position?.[deviceView] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...component.style?.[deviceView] || {}};
    
    // Base styles with positioning
    const baseStyles = {
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
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
      case 'image': {
        const imageUrl = getImageUrl(component, deviceView, 'preview');
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
              <div className="flex flex-col items-center p-2">
                <ImageOff size={24} className="text-gray-400 mb-1" />
                <span className="text-xs text-center">Error al cargar imagen</span>
              </div>
            </div>
          );
        }
        
        // Render the image with cache busting
        return (
          <img
            key={component.id}
            src={imageUrl}
            alt=""
            style={{
              ...baseStyles,
              transition: 'opacity 0.2s, transform 0.2s',
              opacity: 1,
              transform: 'translateZ(0)', // Hardware acceleration para mejor rendimiento
              willChange: 'opacity, transform'
            }}
            crossOrigin="anonymous"
            onLoad={(e) => {
              // Limpiar estado de error previo si la imagen carga bien
              if (imageErrors[component.id]) {
                setImageErrors(prev => {
                  const newErrors = {...prev};
                  delete newErrors[component.id];
                  return newErrors;
                });
              }
              
              // Forzar dimensiones para garantizar visualización correcta
              const img = e.target;
              if (img && baseStyles) {
                // Aplicar dimensiones explícitas para garantizar consistencia
                if (baseStyles.width) {
                  img.style.width = baseStyles.width;
                }
                if (baseStyles.height) {
                  img.style.height = baseStyles.height;
                }
                if (baseStyles.objectFit) {
                  img.style.objectFit = baseStyles.objectFit;
                }
                if (baseStyles.position) {
                  img.style.position = baseStyles.position;
                }
              }
            }}
            onError={(e) => handleImageError(
              e, 
              imageUrl, 
              component.id, 
              (id, hasError) => setImageErrors(prev => ({ ...prev, [id]: hasError }))
            )}
          />
        );
      }
      default:
        return null;
    }
  };

  // Simulated webpage background
  const previewBackground = () => {
    return (
      <>
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="space-y-1">
            <div className="h-2 bg-gray-100 rounded w-full"></div>
            <div className="h-2 bg-gray-100 rounded w-5/6"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-14 bg-gray-100 rounded"></div>
          <div className="h-14 bg-gray-100 rounded"></div>
        </div>
      </>
    );
  };

  return (
    <div className={`preview-simple relative ${className || ''}`} style={{ height: '100%', width: '100%' }}>
      {/* Contenedor para simulación de página web */}
      <div className="relative h-full bg-white rounded overflow-hidden shadow-sm">
        {/* Barra navegador simulada */}
        <div className="bg-gray-700 p-1 flex items-center gap-1 text-xs">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 bg-gray-600 rounded text-gray-400 px-2 py-0.5 text-xs ml-1">
            example.com
          </div>
        </div>
        
        {/* Contenido simulado */}
        <div className="relative" style={{ height: 'calc(100% - 24px)' }}>
          <div className="p-3 text-xs">
            {previewBackground()}
          </div>
          
          {/* Banner */}
          {safeConfig?.layout?.[deviceView]?.type === 'modal' ? (
            // Modal con overlay
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999
            }}>
              <div style={getLayoutStyles()} className="relative">
                {Array.isArray(safeConfig?.components) ? 
                  safeConfig.components.map(renderComponent) : 
                  <div className="p-3 text-xs text-gray-500">No hay componentes para mostrar</div>
                }
              </div>
            </div>
          ) : (
            // Banner normal o flotante
            <div style={getLayoutStyles()} className="relative">
              {Array.isArray(safeConfig?.components) ? 
                safeConfig.components.map(renderComponent) : 
                <div className="p-3 text-xs text-gray-500">No hay componentes para mostrar</div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BannerPreviewSimple;