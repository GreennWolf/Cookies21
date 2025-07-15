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
  
  // Simulador de navegador con el banner en su posición correcta - mejorado para mejor adaptabilidad
  const getDeviceClass = () => {
    switch (currentDevice) {
      case 'mobile':
        return 'w-[375px] h-[667px]'; // iPhone SE/8 más realista
      case 'tablet':
        return 'w-[768px] h-[600px]'; // iPad más realista
      default:
        return 'w-full h-[500px] max-w-[1200px]';
    }
  };

  const getLayoutStyles = () => {
    const layout = bannerConfig?.layout?.[currentDevice] || {};
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto'
      // ELIMINADO: minHeight - no usamos límites mínimos
    };
    
    // DEBUG: Verificar dimensiones en BrowserSimulatorPreview
    console.log('🖥️ BrowserSimulatorPreview getLayoutStyles:', {
      bannerType: layout.type,
      width: baseStyles.width,
      height: baseStyles.height,
      minHeight: baseStyles.minHeight,
      deviceView: currentDevice
    });
    
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

  // Función simplificada para elementos mock (sin getComputedStyle)
  const convertPercentageToPixelsMock = (styleObj, referenceWidth, referenceHeight, isChildComponent = false) => {
    if (!styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      // SIMPLIFICADO: Conversión directa de width
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        let percentValue = parseFloat(converted.width);
        
        // Para hijos, limitar al 98% para evitar desbordamiento
        if (isChildComponent && percentValue > 98) {
          percentValue = 98;
        }
        
        const pixelValue = (percentValue * referenceWidth) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // SIMPLIFICADO: Conversión directa de height
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        let percentValue = parseFloat(converted.height);
        
        // Para hijos, limitar al 95% para dejar espacio
        if (isChildComponent && percentValue > 95) {
          percentValue = 95;
        }
        
        const pixelValue = (percentValue * referenceHeight) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir propiedades de posición (left, right, top, bottom)
      ['left', 'right', 'top', 'bottom'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          let percentValue = parseFloat(converted[prop]);
          if (isChildComponent && percentValue > 95) percentValue = 95;
          const isHorizontalProp = prop === 'left' || prop === 'right';
          const pixelValue = (percentValue * (isHorizontalProp ? referenceWidth : referenceHeight)) / 100;
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      console.error('Error en convertPercentageToPixelsMock:', error);
    }
    
    return converted;
  };

  // Función de adaptación inteligente de tamaños mejorada (BrowserSimulatorPreview)
  const convertPercentageToPixels = (styleObj, referenceContainer, isChildComponent = false) => {
    if (!referenceContainer || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = referenceContainer.getBoundingClientRect();
      
      // CRÍTICO: Para componentes hijos, usar las dimensiones internas del contenedor (descontando padding)
      let referenceWidth = containerRect.width;
      let referenceHeight = containerRect.height;
      
      if (isChildComponent) {
        // Solo obtener padding si no es un elemento mock
        if (!referenceContainer.__isMockElement) {
          // Obtener padding del contenedor padre para calcular área interna disponible
          const computedStyle = window.getComputedStyle(referenceContainer);
          const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
          const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
          const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
          
          // Área interna disponible para los hijos
          referenceWidth = containerRect.width - paddingLeft - paddingRight;
          referenceHeight = containerRect.height - paddingTop - paddingBottom;
        }
        // Para elementos mock, usar dimensiones directas (ya no tiene padding real)
      }
      
      // SIMPLIFICADO: Conversión directa de width
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        let percentValue = parseFloat(converted.width);
        
        // Para hijos, limitar al 98% para evitar desbordamiento
        if (isChildComponent && percentValue > 98) {
          percentValue = 98;
        }
        
        const pixelValue = (percentValue * referenceWidth) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      } else if (converted.width && typeof converted.width === 'string' && converted.width.includes('px')) {
        const pixelValue = parseFloat(converted.width);
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // SIMPLIFICADO: Conversión directa de height
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        let percentValue = parseFloat(converted.height);
        
        // Para hijos, limitar al 95% para dejar espacio
        if (isChildComponent && percentValue > 95) {
          percentValue = 95;
        }
        
        const pixelValue = (percentValue * referenceHeight) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      } else if (converted.height && typeof converted.height === 'string' && converted.height.includes('px')) {
        const pixelValue = parseFloat(converted.height);
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // ELIMINADO: Ya no necesitamos tamaños mínimos porque el template viene pre-procesado
      
      // Convertir propiedades de posición (left, right, top, bottom)
      ['left', 'right', 'top', 'bottom'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          let percentValue = parseFloat(converted[prop]);
          if (isChildComponent && percentValue > 95) percentValue = 95;
          const isHorizontalProp = prop === 'left' || prop === 'right';
          const pixelValue = (percentValue * (isHorizontalProp ? referenceWidth : referenceHeight)) / 100;
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
    
    // CRÍTICO: Para componentes hijos, usar una estrategia de fallback más inteligente
    let convertedProcessedStyle;
    
    if (component.parentId) {
      // 1. Intentar buscar el contenedor padre en el DOM
      let effectiveParentRef = parentContainerRef?.current;
      if (!effectiveParentRef) {
        effectiveParentRef = document.querySelector(`[data-component-id="${component.parentId}"]`);
      }
      
      // 2. Si encontramos el padre, usarlo para cálculos
      if (effectiveParentRef) {
        console.log(`✅ BrowserSim: Contenedor padre ${component.parentId} encontrado`);
        convertedProcessedStyle = convertPercentageToPixels(processedStyle, effectiveParentRef, true);
      } else {
        // 3. FALLBACK: Buscar el padre en los datos del banner para obtener sus dimensiones
        const parentComponent = bannerConfig.components?.find(c => c.id === component.parentId);
        if (parentComponent && bannerContainerRef.current) {
          const parentStyle = parentComponent.style?.[currentDevice] || {};
          const bannerRect = bannerContainerRef.current.getBoundingClientRect();
          
          // Calcular dimensiones estimadas del contenedor padre
          let parentWidth = bannerRect.width;
          let parentHeight = bannerRect.height;
          
          if (parentStyle.width && typeof parentStyle.width === 'string' && parentStyle.width.includes('%')) {
            parentWidth = (parseFloat(parentStyle.width) * bannerRect.width) / 100;
          } else if (parentStyle.width && typeof parentStyle.width === 'string' && parentStyle.width.includes('px')) {
            parentWidth = parseFloat(parentStyle.width);
          }
          
          if (parentStyle.height && typeof parentStyle.height === 'string' && parentStyle.height.includes('%')) {
            parentHeight = (parseFloat(parentStyle.height) * bannerRect.height) / 100;
          } else if (parentStyle.height && typeof parentStyle.height === 'string' && parentStyle.height.includes('px')) {
            parentHeight = parseFloat(parentStyle.height);
          }
          
          console.log(`🔧 BrowserSim: Usando dimensiones estimadas del padre ${component.parentId}:`, {
            parentWidth, parentHeight, 
            parentStyle: parentStyle
          });
          
          // Crear objeto mock con las dimensiones calculadas + getComputedStyle mock
          const mockParentRef = {
            getBoundingClientRect: () => ({
              width: parentWidth,
              height: parentHeight
            }),
            // Mock de getComputedStyle para evitar el error
            __isMockElement: true
          };
          
          // Usar conversión simplificada sin getComputedStyle para el mock
          convertedProcessedStyle = convertPercentageToPixelsMock(processedStyle, parentWidth, parentHeight, true);
        } else {
          console.log(`❌ BrowserSim: No se pudo encontrar padre ${component.parentId}, usando banner como referencia`);
          convertedProcessedStyle = bannerContainerRef.current ? 
            convertPercentageToPixels(processedStyle, bannerContainerRef.current, false) :
            processedStyle;
        }
      }
    } else {
      // Componente raíz: usar banner como referencia
      convertedProcessedStyle = bannerContainerRef.current ? 
        convertPercentageToPixels(processedStyle, bannerContainerRef.current, false) :
        processedStyle;
    }
        
    console.log(`📊 BrowserSim: Procesando ${component.id} - Style DESPUÉS convert:`, {
      width: convertedProcessedStyle.width,
      height: convertedProcessedStyle.height
    });
    
    // CRÍTICO: Limpiar min/max del estilo convertido (igual que InteractiveBannerPreview)
    const cleanedStyle = { ...convertedProcessedStyle };
    delete cleanedStyle.minWidth;
    delete cleanedStyle.maxWidth;
    delete cleanedStyle.minHeight;
    delete cleanedStyle.maxHeight;
    
    // Base styles with positioning - igual que BannerPreview original
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: mantener todos los estilos pero sin posicionamiento
      ...cleanedStyle,
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
      ...cleanedStyle,
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
        // Aplicar límites manualmente si es hijo de contenedor - mejorado para diferentes dispositivos
        let finalTextStyle = { ...convertedProcessedStyle };
        
        if (parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          
          if (containerRect.width > 0 && containerRect.height > 0) {
            // Ajustar porcentajes según dispositivo para mejor legibilidad
            const widthPercentage = currentDevice === 'mobile' ? 0.90 : 0.95;
            const heightPercentage = currentDevice === 'mobile' ? 0.85 : 0.95;
            
            const maxWidth = containerRect.width * widthPercentage;
            const maxHeight = containerRect.height * heightPercentage;
            
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
          width: finalTextStyle.width || (currentDevice === 'mobile' ? '120px' : '150px'),
          height: finalTextStyle.height || 'auto', // Permitir altura automática
          minHeight: finalTextStyle.height || (currentDevice === 'mobile' ? '32px' : '40px'), // Altura mínima adaptada
          boxSizing: 'border-box',
          borderWidth: finalTextStyle.borderWidth || '0px',
          borderStyle: finalTextStyle.borderStyle || 'solid',
          borderColor: finalTextStyle.borderColor || 'transparent',
          padding: finalTextStyle.padding || (currentDevice === 'mobile' ? '6px' : '8px'), // Padding adaptado
          overflow: 'visible', // Permitir que el contenido sea visible
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          position: 'relative',
          display: 'flex',
          alignItems: finalTextStyle.textAlign === 'center' ? 'center' : 'flex-start',
          justifyContent: finalTextStyle.textAlign === 'center' ? 'center' : 
                         finalTextStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
          flexShrink: 0,
          flexGrow: 0,
          // NUEVO: Ajustar tamaño de fuente según dispositivo para mejor legibilidad
          fontSize: currentDevice === 'mobile' && !finalTextStyle.fontSize ? '13px' : finalTextStyle.fontSize
        };
        
        return (
          <div 
            key={component.id} 
            style={textStyle}
          >
            <div style={{
              width: '100%',
              height: 'auto', // Altura automática para el contenido
              textAlign: finalTextStyle.textAlign || 'left',
              wordBreak: 'break-word',
              overflow: 'visible', // Permitir contenido visible
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
              lineHeight: currentDevice === 'mobile' ? '1.3' : '1.4', // Espaciado adaptado por dispositivo
              fontSize: 'inherit' // Heredar del contenedor padre
            }}>
              {displayContent || 'Texto'}
            </div>
          </div>
        );
      }
      
      case 'button': {
        // Calcular dimensiones con límites si es hijo - adaptado por dispositivo
        let finalWidth = baseStyles.width || (currentDevice === 'mobile' ? '120px' : '150px');
        let finalHeight = baseStyles.height || (currentDevice === 'mobile' ? '32px' : '40px');
        
        if (component.parentId && parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          const widthPercentage = currentDevice === 'mobile' ? 0.90 : 0.95;
          const heightPercentage = currentDevice === 'mobile' ? 0.85 : 0.95;
          
          const maxWidth = containerRect.width * widthPercentage;
          const maxHeight = containerRect.height * heightPercentage;
          
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
                fontSize: baseStyles.fontSize || (currentDevice === 'mobile' ? '13px' : baseStyles.fontSize),
                fontWeight: baseStyles.fontWeight,
                padding: baseStyles.padding || (currentDevice === 'mobile' ? '6px 12px' : baseStyles.padding),
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
                <ImageOff size={currentDevice === 'mobile' ? 16 : 24} className="text-gray-400 mb-1" />
                <span className={`text-center ${
                  currentDevice === 'mobile' ? 'text-xs' : 'text-xs'
                }`}>Error al cargar imagen</span>
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
              // CRÍTICO: Asegurar que la imagen se ajuste al contenedor en BrowserSimulator - mejorado por dispositivo
              maxWidth: '100%',
              maxHeight: '100%',
              width: currentDevice === 'mobile' ? baseStyles.width || 'auto' : 'auto',
              height: currentDevice === 'mobile' ? baseStyles.height || 'auto' : 'auto',
              objectFit: currentDevice === 'mobile' ? 'cover' : 'contain',
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
        
        // NUEVO: Ajustar dimensiones del contenedor según dispositivo para mejor adaptabilidad
        if (convertedProcessedStyle.width) {
          const currentWidth = parseFloat(convertedProcessedStyle.width);
          if (currentDevice === 'mobile' && currentWidth > 350) {
            convertedProcessedStyle.width = '350px';
          } else if (currentDevice === 'tablet' && currentWidth > 720) {
            convertedProcessedStyle.width = '720px';
          }
        }
        
        if (convertedProcessedStyle.height) {
          const currentHeight = parseFloat(convertedProcessedStyle.height);
          if (currentDevice === 'mobile' && currentHeight > 600) {
            convertedProcessedStyle.height = '600px';
          } else if (currentDevice === 'tablet' && currentHeight > 550) {
            convertedProcessedStyle.height = '550px';
          }
        }
        
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
                      minHeight: currentDevice === 'mobile' ? '60px' : '80px' // Mínimo adaptado por dispositivo
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
                  fontSize: currentDevice === 'mobile' ? '12px' : '14px',
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

      {/* Browser simulator - mejorado para mejor adaptabilidad */}
      <div className="mx-auto bg-gray-800 rounded-t-lg overflow-hidden" style={{ 
        maxWidth: currentDevice === 'mobile' ? '375px' : 
                   currentDevice === 'tablet' ? '768px' : '1200px'
      }}>
        {/* Browser header - adaptado por dispositivo */}
        <div className={`bg-gray-700 flex items-center gap-2 ${
          currentDevice === 'mobile' ? 'px-2 py-1.5' : 'px-4 py-2'
        }`}>
          <div className="flex gap-1">
            <div className={`bg-red-500 rounded-full ${
              currentDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
            }`}></div>
            <div className={`bg-yellow-500 rounded-full ${
              currentDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
            }`}></div>
            <div className={`bg-green-500 rounded-full ${
              currentDevice === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'
            }`}></div>
          </div>
          <div className={`flex-1 bg-gray-600 rounded text-gray-300 ${
            currentDevice === 'mobile' ? 
              'px-2 py-0.5 text-xs ml-2' : 
              'px-3 py-1 text-sm ml-4'
          }`}>
            {currentDevice === 'mobile' ? 'ejemplo.com' : 'https://ejemplo.com'}
          </div>
        </div>
        
        {/* Browser content area */}
        <div className={`bg-white mx-auto relative overflow-hidden ${getDeviceClass()}`} style={{ minHeight: height }}>
          {/* Fake website content - adaptado por dispositivo */}
          <div className={`text-gray-600 ${
            currentDevice === 'mobile' ? 'p-3' : 
            currentDevice === 'tablet' ? 'p-4' : 'p-6'
          }`}>
            <div className={`bg-gray-200 rounded mb-4 ${
              currentDevice === 'mobile' ? 'h-6 w-1/2' : 
              currentDevice === 'tablet' ? 'h-7 w-2/5' : 'h-8 w-1/3'
            }`}></div>
            <div className={`space-y-2 mb-4 ${
              currentDevice === 'mobile' ? 'mb-3' : 'mb-6'
            }`}>
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              {currentDevice !== 'mobile' && (
                <div className="h-4 bg-gray-100 rounded w-4/6"></div>
              )}
            </div>
            {currentDevice !== 'mobile' && (
              <div className={`grid gap-4 mb-6 ${
                currentDevice === 'tablet' ? 'grid-cols-1' : 'grid-cols-2'
              }`}>
                <div className="h-24 bg-gray-100 rounded"></div>
                {currentDevice === 'desktop' && (
                  <div className="h-24 bg-gray-100 rounded"></div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              {currentDevice === 'desktop' && (
                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
              )}
            </div>
          </div>
          
          {/* Cookie banner positioned correctly */}
          <div ref={bannerContainerRef} style={getLayoutStyles()}>
            {renderBannerComponents()}
          </div>
          
          {/* Modal overlay si es modal - mejorado para diferentes dispositivos */}
          {bannerConfig?.layout?.[currentDevice]?.type === 'modal' && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                zIndex: 999,
                backgroundColor: currentDevice === 'mobile' ? 
                  'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowserSimulatorPreview;