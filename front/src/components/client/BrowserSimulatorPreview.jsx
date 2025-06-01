import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../utils/imageProcessing';

const BrowserSimulatorPreview = ({ 
  bannerConfig, 
  deviceView = 'desktop',
  onUpdateComponent = null,
  height = '500px'
}) => {
  const [currentDevice, setCurrentDevice] = useState(deviceView);
  const [imageErrors, setImageErrors] = useState({});
  const bannerContainerRef = useRef(null);
  
  // Sincronizar currentDevice cuando cambia deviceView prop
  useEffect(() => {
    if (deviceView) {
      setCurrentDevice(deviceView);
    }
  }, [deviceView]);
  
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

  const getLayoutStyles = () => {
    const layout = bannerConfig?.layout?.[currentDevice] || {};
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '100px'
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
        style.bottom = 'auto';
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.left = 0;
        style.right = 0;
        style.top = 'auto';
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.left = 0;
        style.right = 0;
        style.bottom = 'auto';
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
      // Modal
      return {
        ...baseStyles,
        maxWidth: '600px',
        width: '90%',
        margin: '0 auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '24px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      };
    }
    return baseStyles;
  };

  // Función para convertir porcentajes a píxeles en vista previa
  const convertPercentageToPixels = (styleObj, referenceContainer, isChildComponent = false) => {
    if (!referenceContainer || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = referenceContainer.getBoundingClientRect();
      
      // Aplicar límites para componentes hijos
      const applyChildLimits = (value, isWidth = true) => {
        if (!isChildComponent) return value;
        // Límite del 95% del contenedor para hijos
        const maxLimit = isWidth ? containerRect.width * 0.95 : containerRect.height * 0.95;
        const limited = Math.min(value, maxLimit);
        return limited;
      };
      
      // Convertir width
      if (converted.width && typeof converted.width === 'string') {
        let pixelValue;
        
        if (converted.width.includes('%')) {
          const percentValue = parseFloat(converted.width);
          pixelValue = (percentValue * containerRect.width) / 100;
        } else if (converted.width.includes('px')) {
          pixelValue = parseFloat(converted.width);
        } else {
          pixelValue = parseFloat(converted.width) || 0;
        }
        
        pixelValue = applyChildLimits(pixelValue, true);
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir height
      if (converted.height && typeof converted.height === 'string') {
        let pixelValue;
        
        if (converted.height.includes('%')) {
          const percentValue = parseFloat(converted.height);
          pixelValue = (percentValue * containerRect.height) / 100;
        } else if (converted.height.includes('px')) {
          pixelValue = parseFloat(converted.height);
        } else {
          pixelValue = parseFloat(converted.height) || 0;
        }
        
        pixelValue = applyChildLimits(pixelValue, false);
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir otras propiedades
      ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          const percentValue = parseFloat(converted[prop]);
          const isWidthProp = prop.includes('Width');
          let pixelValue = (percentValue * (isWidthProp ? containerRect.width : containerRect.height)) / 100;
          
          if ((prop === 'maxWidth' || prop === 'maxHeight') && isChildComponent) {
            pixelValue = applyChildLimits(pixelValue, isWidthProp);
          }
          
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      console.error('Error convirtiendo porcentajes:', error);
    }
    
    return converted;
  };

  // Renderizar componentes del banner (versión simplificada)
  const renderBannerComponents = () => {
    if (!bannerConfig?.components) return null;
    
    // DEBUG: Verificar que bannerConfig es el customizedTemplate correcto
    console.log('🔄 BrowserSimulator: bannerConfig completo:', {
      hasComponents: !!bannerConfig.components,
      componentCount: bannerConfig.components?.length || 0,
      templateId: bannerConfig._id,
      isCustomized: bannerConfig !== null
    });
    
    const rootComponents = bannerConfig.components.filter(comp => !comp.parentId);
    
    // ORDENAR POR POSICIÓN Y para mantener el orden visual correcto (como en BannerThumbnail)
    const sortedComponents = rootComponents.sort((a, b) => {
      const aTop = parseFloat(a.position?.[currentDevice]?.top || '0');
      const bTop = parseFloat(b.position?.[currentDevice]?.top || '0');
      return aTop - bTop;
    });
    
    // DEBUG: Verificar orden de componentes Y DIMENSIONES en BrowserSimulator
    console.log('🔄 BrowserSimulator: Componentes RECIBIDOS:', rootComponents.map(c => ({
      id: c.id,
      type: c.type,
      position: c.position?.[currentDevice],
      style: {
        width: c.style?.[currentDevice]?.width,
        height: c.style?.[currentDevice]?.height,
        backgroundColor: c.style?.[currentDevice]?.backgroundColor
      },
      content: typeof c.content === 'string' ? c.content.substring(0, 30) + '...' : 'object'
    })));
    
    console.log('🔄 BrowserSimulator: Orden de componentes (DESPUÉS ordenar):', sortedComponents.map(c => ({
      id: c.id,
      type: c.type,
      top: c.position?.[currentDevice]?.top || '0%',
      content: typeof c.content === 'string' ? c.content.substring(0, 30) + '...' : 'object'
    })));
    
    return sortedComponents.map(component => {
      return renderComponent(component);
    });
  };

  const renderComponent = (component, parentContainerRef = null) => {
    if (!component) return null;
    
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, currentDevice) : 
      {...deviceStyle};
    
    // Convertir porcentajes a píxeles
    console.log(`📊 BrowserSim: Procesando ${component.id} - Style ANTES convert:`, {
      width: processedStyle.width,
      height: processedStyle.height,
      top: component.position?.[currentDevice]?.top,
      left: component.position?.[currentDevice]?.left
    });
    
    const convertedProcessedStyle = component.parentId && parentContainerRef?.current ? 
      convertPercentageToPixels(processedStyle, parentContainerRef.current, true) : 
      bannerContainerRef.current ? 
        convertPercentageToPixels(processedStyle, bannerContainerRef.current, false) :
        processedStyle;
        
    console.log(`📊 BrowserSim: Procesando ${component.id} - Style DESPUÉS convert:`, {
      width: convertedProcessedStyle.width,
      height: convertedProcessedStyle.height
    });
    
    // Base styles with positioning - igual que BannerPreview original
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: mantener todos los estilos pero sin posicionamiento
      ...convertedProcessedStyle,
      visibility: 'visible',
      opacity: 1,
      position: undefined,
      top: undefined,
      left: undefined,
      right: undefined,
      bottom: undefined,
      transform: undefined,
      width: convertedProcessedStyle.width || 'auto',
      height: convertedProcessedStyle.height || 'auto',
      // Para componentes de texto, asegurar que se ajusten al contenedor
      ...(component.type === 'text' && {
        wordWrap: 'break-word',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box'
      })
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

    switch (component.type) {
      case 'text': {
        // Aplicar límites manualmente si es hijo de contenedor
        let finalTextStyle = { ...convertedProcessedStyle };
        
        if (parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          
          if (containerRect.width > 0 && containerRect.height > 0) {
            const maxWidth = containerRect.width * 0.95;
            const maxHeight = containerRect.height * 0.95;
            
            const currentWidth = parseFloat(finalTextStyle.width) || 150;
            const currentHeight = parseFloat(finalTextStyle.height) || 40;
            
            if (currentWidth > maxWidth) {
              finalTextStyle.width = `${Math.round(maxWidth)}px`;
            }
            if (currentHeight > maxHeight) {
              finalTextStyle.height = `${Math.round(maxHeight)}px`;
            }
          }
        }
        
        const textStyle = {
          ...finalTextStyle,
          width: finalTextStyle.width || '150px',
          height: finalTextStyle.height || '40px',
          minWidth: '50px',
          minHeight: '20px',
          maxWidth: finalTextStyle.width,
          maxHeight: finalTextStyle.height,
          boxSizing: 'border-box',
          borderWidth: finalTextStyle.borderWidth || '0px',
          borderStyle: finalTextStyle.borderStyle || 'solid',
          borderColor: finalTextStyle.borderColor || 'transparent',
          padding: finalTextStyle.padding || '10px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          position: 'relative',
          display: 'flex',
          alignItems: finalTextStyle.textAlign === 'center' ? 'center' : 'flex-start',
          justifyContent: finalTextStyle.textAlign === 'center' ? 'center' : 
                         finalTextStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
          flexShrink: 0,
          flexGrow: 0
        };
        
        return (
          <div 
            key={component.id} 
            style={textStyle}
          >
            <div style={{
              width: '100%',
              maxWidth: '100%',
              textAlign: finalTextStyle.textAlign || 'left',
              wordBreak: 'break-word',
              overflow: 'hidden',
              whiteSpace: 'normal',
              overflowWrap: 'break-word'
            }}>
              {displayContent || 'Texto'}
            </div>
          </div>
        );
      }
      
      case 'button': {
        // Calcular dimensiones con límites si es hijo
        let finalWidth = baseStyles.width || '150px';
        let finalHeight = baseStyles.height || '40px';
        
        if (component.parentId && parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          const maxWidth = containerRect.width * 0.95;
          const maxHeight = containerRect.height * 0.95;
          
          const currentWidth = typeof finalWidth === 'string' ? parseFloat(finalWidth) : finalWidth;
          const currentHeight = typeof finalHeight === 'string' ? parseFloat(finalHeight) : finalHeight;
          
          if (currentWidth > maxWidth) {
            finalWidth = `${Math.round(maxWidth)}px`;
          }
          if (currentHeight > maxHeight) {
            finalHeight = `${Math.round(maxHeight)}px`;
          }
        }
        
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              width: finalWidth,
              height: finalHeight,
              minWidth: '80px',
              minHeight: '30px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <button
              onClick={(e) => e.preventDefault()}
              style={{ 
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                backgroundColor: baseStyles.backgroundColor,
                color: baseStyles.color,
                border: baseStyles.border || 'none',
                borderRadius: baseStyles.borderRadius,
                fontSize: baseStyles.fontSize,
                fontWeight: baseStyles.fontWeight,
                padding: baseStyles.padding,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {displayContent}
            </button>
          </div>
        );
      }
        
      case 'image': {
        const imageUrl = getImageUrl(component, currentDevice, 'browser-simulator');
        const hasError = imageErrors[component.id];
        
        console.log(`🖼️ BrowserSimulator: Procesando imagen ${component.id}:`, {
          imageUrl,
          hasError,
          contentType: typeof component.content,
          content: component.content,
          hasPreviewUrl: !!component.style?.[currentDevice]?._previewUrl,
          baseStyles
        });
        
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
              // CRÍTICO: Asegurar que la imagen se ajuste al contenedor en BrowserSimulator
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              objectPosition: 'center'
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
              
              // Forzar dimensiones para garantizar visualizaci\u00f3n correcta
              const img = e.target;
              if (img && baseStyles) {
                if (baseStyles.width) img.style.width = baseStyles.width;
                if (baseStyles.height) img.style.height = baseStyles.height;
                if (baseStyles.objectFit) img.style.objectFit = baseStyles.objectFit;
                if (baseStyles.position) img.style.position = baseStyles.position;
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
        
      case 'container': {
        const containerConfig = component.containerConfig?.[currentDevice] || {};
        const displayMode = containerConfig.displayMode || 'libre';
        
        // Variable para almacenar la referencia del contenedor interno
        let containerInnerElement = null;
        
        // Convertir estilos con porcentajes a píxeles para el contenedor
        const convertedProcessedStyle = convertPercentageToPixels(
          processedStyle, 
          bannerContainerRef.current,
          false // Los contenedores no son hijos, no aplicar límites del 95%
        );
        
        // Estilos del contenedor EXTERNO (posicionamiento en canvas)
        const containerOuterStyles = {
          position: 'absolute',
          top: devicePos.top || '0px',
          left: devicePos.left || '0px',
          width: convertedProcessedStyle.width || 'auto',
          height: convertedProcessedStyle.height || 'auto',
          minWidth: convertedProcessedStyle.minWidth || '50px',
          minHeight: convertedProcessedStyle.minHeight || '50px',
          visibility: 'visible',
          opacity: 1,
          zIndex: 1,
        };

        // Estilos del contenedor INTERNO (layout de hijos)
        const containerInnerStyles = {
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: processedStyle.backgroundColor || 'rgba(59, 130, 246, 0.05)',
          border: processedStyle.border || '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: processedStyle.borderRadius || '4px',
          padding: processedStyle.padding || '10px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: displayMode === 'flex' ? 'flex' : displayMode === 'grid' ? 'grid' : 'block',
          ...(displayMode === 'flex' && {
            flexDirection: containerConfig.flexDirection || 'row',
            justifyContent: containerConfig.justifyContent || 'flex-start',
            alignItems: containerConfig.alignItems || 'stretch',
            gap: containerConfig.gap || '10px',
            flexWrap: 'nowrap'
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
            <div 
              ref={(el) => { containerInnerElement = el; }} 
              style={containerInnerStyles}
            >
              {/* Renderizar hijos del contenedor */}
              {component.children && component.children.map(child => {
                let childWrapperStyle = {};
                
                if (displayMode === 'libre') {
                  // En modo libre: posición absoluta
                  const childPos = child.position?.[currentDevice] || {};
                  
                  childWrapperStyle = {
                    position: 'absolute',
                    top: childPos.top || '0px',
                    left: childPos.left || '0px',
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '95%',
                    maxHeight: '95%',
                    overflow: 'visible',
                    boxSizing: 'border-box'
                  };
                } else {
                  // En modo flex/grid: posición relativa con dimensiones del contenedor
                  const childStyle = child.style?.[currentDevice] || {};
                  
                  const convertedChildStyle = convertPercentageToPixels(
                    childStyle,
                    containerInnerElement,
                    true // Es componente hijo, aplicar límites del 95%
                  );
                  
                  childWrapperStyle = {
                    position: 'relative',
                    width: convertedChildStyle.width || 'auto',
                    height: convertedChildStyle.height || 'auto',
                    // CRÍTICO: Para imágenes, permitir que se ajusten sin recortar
                    overflow: child.type === 'image' ? 'visible' : 'hidden',
                    boxSizing: 'border-box',
                    maxWidth: convertedChildStyle.maxWidth || '95%',
                    maxHeight: convertedChildStyle.maxHeight || '95%',
                    ...(displayMode === 'flex' && {
                      flex: '0 0 auto',
                      alignSelf: child.type === 'text' ? 'flex-start' : 'auto'
                    }),
                    // ESPECIAL PARA IMÁGENES: Asegurar que se vean correctamente
                    ...(child.type === 'image' && {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '80px' // Mínimo para que las imágenes se vean
                    })
                  };
                }
                
                return (
                  <div key={child.id} style={childWrapperStyle}>
                    {renderComponent(child, { current: containerInnerElement })}
                  </div>
                );
              })}
              
              {/* Placeholder cuando está vacío */}
              {(!component.children || component.children.length === 0) && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#999',
                  fontSize: '14px',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  Contenedor vacío
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
          <div ref={bannerContainerRef} style={getLayoutStyles()}>
            {renderBannerComponents()}
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