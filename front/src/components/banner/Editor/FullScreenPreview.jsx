import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Monitor, Smartphone, Tablet, ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles } from '../../../utils/imageProcessing';
import LanguageButton from '../LanguageButton';

/**
 * Componente de vista previa a pantalla completa
 * Muestra el banner como se vería en un sitio web real, a pantalla completa
 * Implementa la lógica de renderización de BannerPreview pero mantiene su propia interfaz
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.bannerConfig - Configuración del banner
 * @param {Function} props.onClose - Función para cerrar la vista previa
 * @param {string} props.deviceView - Dispositivo actual (desktop, tablet, mobile)
 * @param {Function} props.onDeviceChange - Función para cambiar el dispositivo
 */
const FullScreenPreview = ({ 
  bannerConfig, 
  onClose, 
  deviceView = 'desktop', 
  onDeviceChange
}) => {
  const [currentDevice, setCurrentDevice] = useState(deviceView);
  const [showBanner, setShowBanner] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const bannerContainerRef = useRef(null);
  
  // Manejar cambio de dispositivo
  const handleDeviceChange = (device) => {
    setCurrentDevice(device);
    if (onDeviceChange) {
      onDeviceChange(device);
    }
  };
  
  // Safe access to profile properties (copied from BannerPreview)
  const safeProfileAccess = (path, profile = {}) => {
    try {
      if (!path) return null;
      if (!profile) return null;
      
      const parts = path.split('.');
      let current = profile;
      for (const part of parts) {
        if (current === undefined || current === null) return null;
        current = current[part];
      }
      return current;
    } catch (err) {
      console.error(`Error accessing profile path ${path}:`, err);
      return null;
    }
  };
  
  // Function to get layout styles with better positioning
  const getLayoutStyles = () => {
    const layout = bannerConfig.layout[currentDevice] || {};
    
    // Gestionar altura en porcentaje
    let heightStyle = layout.height || 'auto';
    let minHeightStyle = layout.minHeight || '30px';
    
    // Si la altura está definida como un porcentaje
    if (typeof heightStyle === 'string' && heightStyle.includes('%')) {
      // Calcular altura en función del viewport height para cualquier tipo de banner
      const percentValue = parseFloat(heightStyle);
      if (!isNaN(percentValue)) {
        // Usar vh (viewport height) directamente para que sea responsive
        heightStyle = `${percentValue}vh`;
        
        // También establecer una altura mínima razonable
        if (percentValue < 10) {
          minHeightStyle = '50px';
        }
      }
    }
    
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: heightStyle,
      minHeight: minHeightStyle,
      zIndex: 1000 // Asegurar que el banner esté por encima del contenido de la página
    };
    
    if (layout.type === 'banner') {
      // Banner estándar (top/bottom/center)
      // Ajustar el ancho al contenedor del dispositivo actual
      let width = '100%';
      if (currentDevice === 'mobile') {
        width = '375px';
      } else if (currentDevice === 'tablet') {
        width = '768px';
      }
      
      const style = {
        ...baseStyles,
        position: 'fixed', // Usar fixed para que se mantenga visible al hacer scroll
        // Para dispositivos móvil y tablet, centrar el banner
        left: currentDevice !== 'desktop' ? '50%' : 0,
        right: currentDevice !== 'desktop' ? 'auto' : 0,
        transform: currentDevice !== 'desktop' ? 'translateX(-50%)' : 'none',
        width: width
      };
      
      if (layout.position === 'top') {
        style.top = 0;
        style.bottom = 'auto';
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.top = 'auto';
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.bottom = 'auto';
        // Asegurar que se aplique el transform correcto según el dispositivo
        style.transform = currentDevice !== 'desktop' ? 'translate(-50%, -50%)' : 'translateY(-50%)';
      } else {
        // Posición por defecto si no está especificada
        style.bottom = 0;
        style.top = 'auto';
      }
      
      return style;
    } else if (layout.type === 'floating') {
      // Banner flotante (en alguna esquina)
      const margin = layout.floatingMargin || layout['data-floating-margin'] || '20';
      const corner = layout.floatingCorner || layout['data-floating-corner'] || layout.position || 'bottom-right';
      
      // Ajustar ancho para dispositivos más pequeños
      let adjustedWidth = baseStyles.width;
      if (currentDevice === 'mobile' && adjustedWidth.includes('%')) {
        // En móvil, limitar el porcentaje máximo a 85%
        const percentValue = parseInt(adjustedWidth);
        if (percentValue > 85) {
          adjustedWidth = '85%';
        }
      }
      
      const style = {
        ...baseStyles,
        width: adjustedWidth,
        position: 'fixed', // Usar fixed para que se mantenga visible al hacer scroll
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '16px'
      };
      
      // Aplicar esquina
      if (corner.includes('top')) {
        style.top = margin + 'px';
        style.bottom = 'auto';
      } else {
        style.bottom = margin + 'px';
        style.top = 'auto';
      }
      
      if (corner.includes('left')) {
        style.left = margin + 'px';
        style.right = 'auto';
      } else {
        style.right = margin + 'px';
        style.left = 'auto';
      }
      
      return style;
    } else if (layout.type === 'modal') {
      // Modal (centrado)
      // Ajustar el ancho máximo según el dispositivo
      let maxWidth = layout.maxWidth || '600px';
      let modalWidth = layout.width || '90%';
      
      if (currentDevice === 'mobile') {
        maxWidth = '320px';
        modalWidth = '95%';
      } else if (currentDevice === 'tablet') {
        maxWidth = '500px';
      }
      
      return {
        ...baseStyles,
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: currentDevice === 'mobile' ? '16px' : '24px',
        maxWidth: maxWidth,
        width: modalWidth,
        zIndex: 1000,
        maxHeight: currentDevice === 'mobile' ? '80vh' : '90vh',
        overflowY: 'auto'
      };
    }
    
    return baseStyles;
  };

  // Extract image URL from component content (copied from BannerPreview)
  const extractImageUrl = (component) => {
    try {
      const cacheBuster = `?t=${Date.now()}`;
      
      // CASO 1: Si hay una URL de previsualización en el estilo, usar esa directamente
      const deviceStyle = component.style?.[currentDevice];
      if (deviceStyle?._previewUrl) {
        if (deviceStyle._previewUrl.startsWith('blob:')) {
          return deviceStyle._previewUrl;
        }
        const url = deviceStyle._previewUrl + (deviceStyle._previewUrl.includes('?') ? '&cb=' + Date.now() : cacheBuster);
        return url;
      }
      
      // CASO 2: Si es una referencia temporal
      if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
        if (window._imageFiles && window._imageFiles[component.content]) {
          const file = window._imageFiles[component.content];
          if (typeof URL !== 'undefined' && URL.createObjectURL) {
            try {
              const objectUrl = URL.createObjectURL(file);
              if (!window._objectUrls) window._objectUrls = [];
              window._objectUrls.push(objectUrl);
              if (window._objectUrls.length > 20) {
                const oldUrl = window._objectUrls.shift();
                try { URL.revokeObjectURL(oldUrl); } catch (e) {}
              }
              return objectUrl;
            } catch (err) {}
          }
        }
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzc3NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhcmdhbmRvPC90ZXh0Pjwvc3ZnPg==';
      }
      
      // CASO 3: Imágenes Data URI
      if (typeof component.content === 'string' && component.content.startsWith('data:')) {
        return component.content;
      }
      
      // CASO 4: Imágenes Blob URL
      if (typeof component.content === 'string' && component.content.startsWith('blob:')) {
        return component.content;
      }
      
      // CASO 5: Rutas /direct-image/
      if (typeof component.content === 'string' && component.content.includes('/direct-image/')) {
        const parts = component.content.split('/direct-image/');
        if (parts.length === 2) {
          const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
          const baseUrl = window.location.origin;
          const fullUrl = `${baseUrl}/direct-image/${relativePath}${cacheBuster}`;
          return fullUrl;
        }
      }
      
      // CASO 6: Rutas /templates/images/
      if (typeof component.content === 'string' && component.content.includes('/templates/images/')) {
        const parts = component.content.split('/templates/images/');
        if (parts.length === 2) {
          const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
          const baseUrl = window.location.origin;
          const fullUrl = `${baseUrl}/templates/images/${relativePath}${cacheBuster}`;
          return fullUrl;
        }
      }
      
      // CASO 7: Otras rutas relativas
      if (typeof component.content === 'string' && component.content.startsWith('/')) {
        const fullUrl = `${window.location.origin}${component.content}${component.content.includes('?') ? '&cb=' + Date.now() : cacheBuster}`;
        return fullUrl;
      }
      
      // CASO 8: URLs http/https
      if (typeof component.content === 'string' && 
          (component.content.startsWith('http://') || component.content.startsWith('https://'))) {
        return component.content;
      }
      
      // CASO 9: Objeto con URL o texto
      if (component.content && typeof component.content === 'object') {
        // Objeto con propiedad URL
        if (component.content.url) {
          if (component.content.url.startsWith('/')) {
            const serverUrl = window.location.origin;
            return `${serverUrl}${component.content.url}${cacheBuster}`;
          }
          return component.content.url;
        }
        
        // Objeto con textos multilingual
        if (component.content.texts && typeof component.content.texts === 'object') {
          if (component.content.texts.en) {
            const enText = component.content.texts.en;
            if (typeof enText === 'string') {
              if (enText.startsWith('/')) {
                const serverUrl = window.location.origin;
                return `${serverUrl}${enText}${cacheBuster}`;
              }
              if (enText.startsWith('http') || enText.startsWith('data:') || enText.startsWith('blob:')) {
                return enText;
              }
            }
          }
          
          for (const lang in component.content.texts) {
            if (lang === 'en') continue;
            
            const text = component.content.texts[lang];
            if (typeof text === 'string') {
              if (text.startsWith('/')) {
                const serverUrl = window.location.origin;
                return `${serverUrl}${text}${cacheBuster}`;
              }
              if (text.startsWith('http') || text.startsWith('data:') || text.startsWith('blob:')) {
                return text;
              }
            }
          }
        }
      }
      
      // CASO 10: Fallback - usar placeholder
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4=';
    } catch (error) {
      console.error(`❌ Error al procesar URL de imagen:`, error);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  // Función para convertir porcentajes a píxeles en vista previa
  const convertPercentageToPixels = (styleObj, bannerContainerRef, isChild = false, parentComponent = null) => {
    if (!bannerContainerRef || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      let containerRect = bannerContainerRef.getBoundingClientRect();
      
      // Si es hijo y tenemos el componente padre, intentar usar las dimensiones del contenedor padre
      if (isChild && parentComponent) {
        // Buscar el elemento del contenedor padre en el DOM
        const parentElement = document.querySelector(`[data-component-id="${parentComponent.id}"]`);
        if (parentElement) {
          const parentInnerElement = parentElement.querySelector('div:nth-child(1)'); // El div interno del contenedor
          if (parentInnerElement) {
            containerRect = parentInnerElement.getBoundingClientRect();
            console.log(`🔍 Usando contenedor padre para ${parentComponent.id}:`, { width: containerRect.width, height: containerRect.height });
          }
        }
      }
      
      // CORRECCIÓN: Aplicar límites para componentes hijos
      const applyChildLimits = (value, isWidth = true) => {
        if (!isChild) return value;
        // Límite del 95% del contenedor para hijos
        const maxLimit = isWidth ? containerRect.width * 0.95 : containerRect.height * 0.95;
        const limited = Math.min(value, maxLimit);
        
        // DEBUG: Log cuando se aplican límites
        if (limited !== value) {
          console.log(`⚠️ FullScreen Preview: ${isWidth ? 'Ancho' : 'Alto'} limitado: ${value}px → ${limited}px (contenedor: ${isWidth ? containerRect.width : containerRect.height}px)`);
        }
        
        return limited;
      };
      
      // Convertir width - aplicar límites tanto para porcentajes como píxeles
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
        
        // Aplicar límites si es hijo (tanto para % como px)
        pixelValue = applyChildLimits(pixelValue, true);
        
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir height - aplicar límites tanto para porcentajes como píxeles
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
        
        // Aplicar límites si es hijo (tanto para % como px)
        pixelValue = applyChildLimits(pixelValue, false);
        
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // Convertir otras propiedades
      ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          const percentValue = parseFloat(converted[prop]);
          const isWidthProp = prop.includes('Width');
          let pixelValue = (percentValue * (isWidthProp ? containerRect.width : containerRect.height)) / 100;
          
          // Aplicar límites para max properties si es hijo
          if ((prop === 'maxWidth' || prop === 'maxHeight') && isChild) {
            pixelValue = applyChildLimits(pixelValue, isWidthProp);
          }
          
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      console.error("Error converting percentage to pixels:", error);
    }
    
    return converted;
  };

  // Render component function (copied from BannerPreview)
  const renderComponent = (component, parentComponent = null) => {
    if (!component) return null;
    
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, currentDevice) : 
      {...deviceStyle};
    
    // Convertir estilos con porcentajes a píxeles para todos los componentes
    // Pasar información del padre si es un componente hijo
    const isChild = !!parentComponent;
    const convertedProcessedStyle = convertPercentageToPixels(
      processedStyle, 
      bannerContainerRef.current, 
      isChild, 
      parentComponent
    );
    
    // Base styles with positioning - CORREGIDO para hijos de contenedores
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: NO usar position absolute
      ...convertedProcessedStyle,
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1,
      // Para hijos, usamos el wrapper para el posicionamiento
      position: 'static',
      width: convertedProcessedStyle.width || 'auto',
      height: convertedProcessedStyle.height || 'auto'
    } : {
      // Para componentes raíz: usar position absolute normal
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...convertedProcessedStyle,
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
  
    // Handle component interaction
    const handleClick = () => {
      if (component.action?.type === 'show_preferences') {
        setShowPreferences(true);
      } else if (['accept_all', 'reject_all'].includes(component.action?.type)) {
        setShowBanner(false);
      }
    };
  
    // Render based on component type
    switch (component.type) {
      case 'text': {
        // CORRECCIÓN: Aplicar mismo estilo que ComponentRenderer pero sin límites complejos por ahora
        const textStyle = {
          ...baseStyles,
          // IMPORTANTE: Usar las dimensiones convertidas directamente
          width: baseStyles.width || '150px',
          height: baseStyles.height || '40px',
          // Establecer mínimos razonables
          minWidth: '50px',
          minHeight: '20px',
          // CRÍTICO: Forzar que no se salga del contenedor
          maxWidth: baseStyles.width || '150px',
          maxHeight: baseStyles.height || '40px',
          // Asegurar que el contenedor sea de tamaño fijo
          boxSizing: 'border-box',
          // Permitir bordes personalizados si se configuran
          borderWidth: baseStyles.borderWidth || '0px',
          borderStyle: baseStyles.borderStyle || 'solid',
          borderColor: baseStyles.borderColor || 'transparent',
          padding: baseStyles.padding || '10px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          position: 'relative',
          display: 'flex',
          alignItems: baseStyles.textAlign === 'center' ? 'center' : 'flex-start',
          justifyContent: baseStyles.textAlign === 'center' ? 'center' : 
                         baseStyles.textAlign === 'right' ? 'flex-end' : 'flex-start',
          // CRÍTICO: Evitar que flex lo estire
          flexShrink: 0,
          flexGrow: 0
        };
        
        return (
          <div key={component.id} style={textStyle}>
            <div style={{
              width: '100%',
              maxWidth: '100%',
              textAlign: baseStyles.textAlign || 'left',
              wordBreak: 'break-word',
              overflow: 'hidden',
              whiteSpace: 'normal',
              overflowWrap: 'break-word'
            }}>
              {displayContent}
            </div>
          </div>
        );
      }
      case 'button':
        return (
          <button
            key={component.id}
            onClick={handleClick}
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
      case 'image': {
        const imageUrl = extractImageUrl(component);
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
            onError={(e) => {
              // Marcar imagen como con error
              setImageErrors(prev => ({ ...prev, [component.id]: true }));
            }}
          />
        );
      }
      case 'container': {
        // Renderizar contenedor con sus hijos
        const containerConfig = component.containerConfig?.[currentDevice] || {};
        const displayMode = containerConfig.displayMode || 'libre';
        
        // Convertir estilos con porcentajes a píxeles
        // Para contenedores, usar la misma lógica que para otros componentes
        const convertedProcessedStyle = convertPercentageToPixels(
          processedStyle, 
          bannerContainerRef.current, 
          isChild, 
          parentComponent
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
            data-component-id={component.id}
          >
            <div style={containerInnerStyles}>
              {/* Renderizar hijos del contenedor */}
            {component.children && component.children.map(child => {
              let childWrapperStyle = {};
              
              if (displayMode === 'libre') {
                // En modo libre: posición absoluta
                const childPos = child.position?.[currentDevice] || {};
                childWrapperStyle = {
                  position: 'absolute',
                  top: childPos.top || '0px',
                  left: childPos.left || '0px'
                };
              } else {
                // En modo flex/grid: posición relativa
                childWrapperStyle = {
                  position: 'relative'
                };
              }
              
              return (
                <div key={child.id} style={childWrapperStyle}>
                  {renderComponent(child, component)}
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
      case 'language-button': {
        console.log('🌐 FullScreenPreview - Rendering language-button:', {
          id: component.id,
          content: component.content,
          baseStyles
        });
        
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              width: baseStyles.width || '120px',
              height: baseStyles.height || '35px',
              minWidth: '80px',
              minHeight: '30px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: 0,
              overflow: 'visible'
            }}
          >
            <LanguageButton
              config={component.content || {}}
              isPreview={true}
              style={{
                [currentDevice]: {
                  width: '100%',
                  height: '100%'
                }
              }}
              deviceView={currentDevice}
            />
          </div>
        );
      }
      default:
        console.warn('❌ FullScreenPreview: Unknown component type:', component.type, component);
        return null;
    }
  };

  // Simulated webpage background
  const previewBackground = () => {
    return (
      <>
        {/* Header with navigation */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <div className="h-10 bg-blue-500 rounded-lg w-40"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          <div className="h-60 bg-gray-100 rounded-lg w-full flex items-center justify-center">
            <div className="w-3/4 text-center">
              <div className="h-12 bg-gray-300 rounded-lg w-2/3 mx-auto mb-4"></div>
              <div className="space-y-2 mb-6">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
              </div>
              <div className="flex gap-4 justify-center">
                <div className="h-10 bg-blue-500 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Featured content */}
        <div className="mb-12">
          <div className="h-10 bg-gray-300 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 bg-white rounded-b-lg">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 bg-white rounded-b-lg">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 bg-white rounded-b-lg">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content section */}
        <div className="mb-12">
          <div className="h-10 bg-gray-300 rounded-lg w-1/4 mb-6"></div>
          <div className="flex gap-8">
            <div className="w-2/3">
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
              <div className="h-60 bg-gray-100 rounded-lg w-full mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>
            <div className="w-1/3">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="h-8 bg-gray-300 rounded w-2/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-10 bg-blue-500 rounded-lg w-full mt-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };
  
  // Función para obtener los estilos del contenedor según el dispositivo
  const getPreviewContainerStyles = () => {
    switch (currentDevice) {
      case 'mobile':
        return 'w-[375px] mx-auto';
      case 'tablet':
        return 'w-[768px] mx-auto';
      default:
        return 'w-full max-w-[100%]';
    }
  };
  
  // Efecto para actualizar el estado cuando cambia el dispositivo
  useEffect(() => {
    // Forzar renderizado cuando cambia el dispositivo
    setTimeout(() => {
      if (bannerContainerRef.current) {
        // Limpiar errores de imágenes al cambiar de dispositivo
        setImageErrors({});
        
        // Trigger resize para que los componentes se adapten
        window.dispatchEvent(new Event('resize'));
      }
    }, 50);
  }, [currentDevice]);
  
  // Efecto para responder a cambios de tamaño de ventana
  useEffect(() => {
    // Función para actualizar dimensiones cuando cambia el tamaño de ventana
    const handleResize = () => {
      // Forzar rerenderizado
      setImageErrors({...imageErrors});
    };
    
    // Añadir event listener
    window.addEventListener('resize', handleResize);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [imageErrors]);
  
  return (
    <div className="fullscreen-preview" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, backgroundColor: '#1e1e2e', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de herramientas superior simplificada */}
      <div className="preview-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', height: '60px', flexShrink: 0 }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={onClose} 
            className="back-button"
            title="Volver al editor"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #e0e0e0', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem' }}
          >
            <ArrowLeft size={18} />
            <span>Volver al editor</span>
          </button>
        </div>

        <div className="toolbar-center" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="device-selector" style={{ display: 'flex', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              className={`device-button ${currentDevice === 'desktop' ? 'active' : ''}`}
              onClick={() => handleDeviceChange('desktop')}
              title="Vista Escritorio"
              style={{ padding: '0.5rem', backgroundColor: currentDevice === 'desktop' ? '#f0f0f0' : '#ffffff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', color: currentDevice === 'desktop' ? '#4a6cf7' : 'inherit' }}
            >
              <Monitor size={18} />
            </button>
            <button 
              className={`device-button ${currentDevice === 'tablet' ? 'active' : ''}`}
              onClick={() => handleDeviceChange('tablet')}
              title="Vista Tablet"
              style={{ padding: '0.5rem', backgroundColor: currentDevice === 'tablet' ? '#f0f0f0' : '#ffffff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', color: currentDevice === 'tablet' ? '#4a6cf7' : 'inherit' }}
            >
              <Tablet size={18} />
            </button>
            <button 
              className={`device-button ${currentDevice === 'mobile' ? 'active' : ''}`}
              onClick={() => handleDeviceChange('mobile')}
              title="Vista Móvil"
              style={{ padding: '0.5rem', backgroundColor: currentDevice === 'mobile' ? '#f0f0f0' : '#ffffff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', color: currentDevice === 'mobile' ? '#4a6cf7' : 'inherit' }}
            >
              <Smartphone size={18} />
            </button>
          </div>
        </div>

        {/* Espacio vacío a la derecha */}
        <div className="toolbar-right" style={{ width: '120px' }}></div>
      </div>

      {/* Contenedor principal de la vista previa */}
      <div className="preview-content" style={{ flex: 1, overflow: 'hidden', padding: '0' }}>
        <div className={`mx-auto ${getPreviewContainerStyles()} bg-white shadow-lg overflow-hidden h-full`} style={{ height: 'calc(100vh - 60px)', maxHeight: 'calc(100vh - 60px)' }}>
          {/* Simulated browser bar */}
          <div className="bg-gray-800 p-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-gray-400 text-sm">
              www.example.com
            </div>
          </div>

          {/* Content container - sin scroll vertical */}
          <div className="web-page-container relative" style={{ height: 'calc(100% - 42px)', overflow: 'hidden', position: 'relative' }}>
            {/* Contenido web con scroll solo horizontal si es necesario */}
            <div className="p-6" style={{ overflowX: 'auto', overflowY: 'hidden', height: '100%' }}>
              {previewBackground()}
            </div>

            {/* Banner - con posición fixed para que se mantenga visible al hacer scroll */}
            {showBanner && (() => {
              const rootComponents = bannerConfig.components?.filter(comp => !comp.parentId) || [];
              const layout = bannerConfig.layout[currentDevice] || {};
              
              console.log('🎯 FullScreenPreview - Root components to render:', {
                totalComponents: bannerConfig.components?.length || 0,
                rootComponents: rootComponents.length,
                components: rootComponents.map(comp => ({
                  id: comp.id,
                  type: comp.type,
                  hasPosition: !!comp.position,
                  hasStyle: !!comp.style,
                  position: comp.position?.[currentDevice],
                  style: comp.style?.[currentDevice]
                })),
                languageButtons: rootComponents.filter(comp => comp.type === 'language-button'),
                currentDevice
              });
              
              return (
                <>
                  {/* Overlay para modales */}
                  {layout.type === 'modal' && (
                    <div 
                      className="modal-overlay"
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999
                      }}
                      onClick={() => setShowBanner(false)}
                    />
                  )}
                  
                  {/* Contenedor del banner */}
                  <div 
                    ref={bannerContainerRef} 
                    style={getLayoutStyles()} 
                    className="banner-container"
                  >
                    {rootComponents.map(renderComponent)}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      
      <style>{`
        .fullscreen-preview {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 2000;
          background-color: #f5f5f7;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .preview-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #ffffff;
          border-bottom: 1px solid #e0e0e0;
          height: 60px;
          flex-shrink: 0;
        }
        
        .toolbar-left,
        .toolbar-center,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          background-color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        
        .back-button:hover {
          background-color: #f5f5f7;
        }
        
        .device-selector {
          display: flex;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .device-button {
          padding: 0.5rem;
          background-color: #ffffff;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .device-button.active {
          background-color: #f0f0f0;
          color: #4a6cf7;
        }
        
        .preview-content {
          flex: 1;
          overflow: auto;
          display: flex;
          height: calc(100vh - 60px);
        }

        /* Estilos para simular diferentes dispositivos */
        .w-\\[375px\\] {
          width: 375px;
        }
        
        .w-\\[768px\\] {
          width: 768px;
        }
        
        .max-w-\\[1200px\\] {
          max-width: 1200px;
        }
        
        .bg-gray-100 {
          background-color: #f3f4f6;
        }
        
        .bg-gray-200 {
          background-color: #e5e7eb;
        }
        
        .rounded {
          border-radius: 0.25rem;
        }
        
        .rounded-lg {
          border-radius: 0.5rem;
        }
        
        .h-4 {
          height: 1rem;
        }
        
        .h-8 {
          height: 2rem;
        }
        
        .h-40 {
          height: 10rem;
        }
        
        .h-48 {
          height: 12rem;
        }
        
        .h-60 {
          height: 15rem;
        }
        
        .h-6 {
          height: 1.5rem;
        }
        
        .h-8 {
          height: 2rem;
        }
        
        .h-10 {
          height: 2.5rem;
        }
        
        .h-12 {
          height: 3rem;
        }
        
        .w-full {
          width: 100%;
        }
        
        .w-2\\/4 {
          width: 50%;
        }
        
        .w-3\\/4 {
          width: 75%;
        }
        
        .w-4\\/5 {
          width: 80%;
        }
        
        .w-4\\/6 {
          width: 66.666667%;
        }
        
        .w-5\\/6 {
          width: 83.333333%;
        }
        
        .w-2\\/3 {
          width: 66.666667%;
        }
        
        .w-1\\/3 {
          width: 33.333333%;
        }
        
        .w-1\\/4 {
          width: 25%;
        }
        
        .w-16 {
          width: 4rem;
        }
        
        .w-32 {
          width: 8rem;
        }
        
        .w-40 {
          width: 10rem;
        }
        
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        
        .space-y-2 > * + * {
          margin-top: 0.5rem;
        }
        
        .space-y-4 > * + * {
          margin-top: 1rem;
        }
        
        .mb-8 {
          margin-bottom: 2rem;
        }
        
        .grid {
          display: grid;
        }
        
        .grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        
        .grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        
        .gap-4 {
          gap: 1rem;
        }
        
        .gap-6 {
          gap: 1.5rem;
        }
        
        .gap-8 {
          gap: 2rem;
        }
        
        .justify-between {
          justify-content: space-between;
        }
        
        .justify-center {
          justify-content: center;
        }
        
        .items-center {
          align-items: center;
        }
        
        .text-center {
          text-align: center;
        }
        
        .p-4 {
          padding: 1rem;
        }
        
        .p-6 {
          padding: 1.5rem;
        }
        
        .mb-1 {
          margin-bottom: 0.25rem;
        }
        
        .mb-2 {
          margin-bottom: 0.5rem;
        }
        
        .mb-4 {
          margin-bottom: 1rem;
        }
        
        .mb-6 {
          margin-bottom: 1.5rem;
        }
        
        .mb-8 {
          margin-bottom: 2rem;
        }
        
        .mb-10 {
          margin-bottom: 2.5rem;
        }
        
        .mb-12 {
          margin-bottom: 3rem;
        }
        
        .mt-4 {
          margin-top: 1rem;
        }
        
        .bg-white {
          background-color: #ffffff;
        }
        
        .shadow-lg {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .overflow-hidden {
          overflow: hidden;
        }
        
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        
        .bg-gray-700 {
          background-color: #374151;
        }
        
        .bg-gray-50 {
          background-color: #f9fafb;
        }
        
        .bg-gray-800 {
          background-color: #1f2937;
        }
        
        .bg-red-500 {
          background-color: #ef4444;
        }
        
        .bg-yellow-500 {
          background-color: #f59e0b;
        }
        
        .bg-green-500 {
          background-color: #10b981;
        }
        
        .bg-blue-500 {
          background-color: #3b82f6;
        }
        
        .text-gray-400 {
          color: #9ca3af;
        }
        
        .text-sm {
          font-size: 0.875rem;
        }
        
        .flex {
          display: flex;
        }
        
        .items-center {
          align-items: center;
        }
        
        .gap-1\\.5 {
          gap: 0.375rem;
        }
        
        .gap-2 {
          gap: 0.5rem;
        }
        
        .flex-1 {
          flex: 1 1 0%;
        }
        
        .p-2 {
          padding: 0.5rem;
        }
        
        .p-6 {
          padding: 1.5rem;
        }
        
        .px-3 {
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }
        
        .py-1 {
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }
        
        .rounded {
          border-radius: 0.25rem;
        }
        
        .relative {
          position: relative;
        }
        
        .w-3 {
          width: 0.75rem;
        }
        
        .h-3 {
          height: 0.75rem;
        }
        
        .rounded-full {
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

export default FullScreenPreview;