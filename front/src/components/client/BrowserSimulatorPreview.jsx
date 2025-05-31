import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { processImageStyles } from '../../utils/imageProcessing';

const BrowserSimulatorPreview = ({ 
  bannerConfig, 
  deviceView = 'desktop',
  onUpdateComponent = null,
  height = '500px'
}) => {
  const [currentDevice, setCurrentDevice] = useState(deviceView);
  
  // Simulador de navegador con el banner en su posición correcta
  const getDeviceClass = () => {
    switch (currentDevice) {
      case 'mobile':
        return 'w-[375px] h-[600px]';
      case 'tablet':
        return 'w-[768px] h-[500px]';
      default:
        return 'w-full h-[500px] max-w-[1200px]';
    }
  };

  const getBannerPositionStyles = () => {
    const layout = bannerConfig?.layout?.[currentDevice] || {};
    const type = layout.type || 'banner';
    
    let positionStyles = {};
    
    switch (type) {
      case 'banner':
        // Banner fijo en top o bottom
        if (layout.position === 'bottom') {
          positionStyles = {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000
          };
        } else {
          positionStyles = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000
          };
        }
        break;
        
      case 'modal':
        // Modal centrado
        positionStyles = {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          maxWidth: layout.maxWidth || '600px',
          width: '90%'
        };
        break;
        
      case 'floating':
        // Floating en esquina
        const floatingPosition = layout.floatingPosition || 'bottom-right';
        const [vertical, horizontal] = floatingPosition.split('-');
        
        positionStyles = {
          position: 'absolute',
          zIndex: 1000,
          maxWidth: layout.maxWidth || '400px',
          [vertical]: '20px',
          [horizontal]: '20px'
        };
        break;
        
      default:
        positionStyles = {
          position: 'relative',
          zIndex: 1000
        };
    }
    
    return positionStyles;
  };

  // Renderizar componentes del banner (versión simplificada)
  const renderBannerComponents = () => {
    if (!bannerConfig?.components) return null;
    
    const rootComponents = bannerConfig.components.filter(comp => !comp.parentId);
    
    return rootComponents.map(component => {
      return renderComponent(component);
    });
  };

  const renderComponent = (component) => {
    if (!component) return null;
    
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, currentDevice) : 
      {...deviceStyle};
    
    // Base styles with positioning - igual que BannerPreview original
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: NO usar position absolute
      ...processedStyle,
      visibility: 'visible',
      opacity: 1,
      position: 'static',
      width: processedStyle.width || 'auto',
      height: processedStyle.height || 'auto'
    } : {
      // Para componentes raíz: usar position absolute normal
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...processedStyle,
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
            onClick={(e) => e.preventDefault()}
          >
            {displayContent}
          </button>
        );
        
      case 'image': {
        // Get image URL with proper fallback handling
        const getImageUrl = () => {
          console.log('🔍 BrowserSimulator getImageUrl:', { 
            componentId: component.id, 
            currentDevice,
            previewUrl: component.style?.[currentDevice]?._previewUrl,
            content: component.content,
            fullStyle: component.style
          });
          
          // Check for preview URL in styles
          if (component.style?.[currentDevice]?._previewUrl) {
            const previewUrl = component.style[currentDevice]._previewUrl;
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
              return `${window.location.origin}${component.content}`;
            }
            
            // Handle HTTP/HTTPS URLs
            if (component.content.startsWith('http://') || 
                component.content.startsWith('https://')) {
              return component.content;
            }
          }
          
          // Fallback placeholder
          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4=';
        };
        
        return (
          <img
            key={component.id}
            src={getImageUrl()}
            alt=""
            style={baseStyles}
            onError={(e) => {
              e.target.style.backgroundColor = '#f0f0f0';
              e.target.style.border = '1px dashed #ccc';
            }}
          />
        );
      }
        
      case 'container': {
        const containerChildren = component.children || [];
        const containerConfig = component.containerConfig?.[currentDevice] || {};
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

  const getBannerStyles = () => {
    const layout = bannerConfig?.layout?.[currentDevice] || {};
    
    return {
      backgroundColor: layout.backgroundColor || '#ffffff',
      color: layout.color || '#000000',
      fontFamily: layout.fontFamily || 'system-ui, -apple-system, sans-serif',
      padding: layout.padding || '20px',
      borderRadius: layout.borderRadius || '0px',
      boxShadow: layout.boxShadow || 'none',
      border: layout.border || 'none',
      minHeight: layout.minHeight || '100px',
      position: 'relative'
    };
  };

  return (
    <div className="space-y-4">
      {/* Device selector */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setCurrentDevice('desktop')}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
            currentDevice === 'desktop' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Monitor size={16} />
          Desktop
        </button>
        <button
          onClick={() => setCurrentDevice('tablet')}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
            currentDevice === 'tablet' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Tablet size={16} />
          Tablet
        </button>
        <button
          onClick={() => setCurrentDevice('mobile')}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
            currentDevice === 'mobile' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Smartphone size={16} />
          Mobile
        </button>
      </div>

      {/* Browser simulator */}
      <div className="mx-auto bg-gray-800 rounded-t-lg overflow-hidden" style={{ maxWidth: '1200px' }}>
        {/* Browser header */}
        <div className="bg-gray-700 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 bg-gray-600 rounded px-3 py-1 text-gray-300 text-sm ml-4">
            https://ejemplo.com
          </div>
        </div>
        
        {/* Browser content area */}
        <div className={`bg-white mx-auto relative overflow-hidden ${getDeviceClass()}`} style={{ minHeight: height }}>
          {/* Fake website content */}
          <div className="p-6 text-gray-600">
            <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              <div className="h-4 bg-gray-100 rounded w-4/6"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="h-24 bg-gray-100 rounded"></div>
              <div className="h-24 bg-gray-100 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            </div>
          </div>
          
          {/* Cookie banner positioned correctly */}
          <div style={getBannerPositionStyles()}>
            <div style={getBannerStyles()}>
              {renderBannerComponents()}
            </div>
          </div>
          
          {/* Modal overlay si es modal */}
          {bannerConfig?.layout?.[currentDevice]?.type === 'modal' && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none"
              style={{ zIndex: 999 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowserSimulatorPreview;