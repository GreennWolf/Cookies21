import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, X, ImageOff, Globe } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles, ImagePlaceholders } from '../../../utils/imageProcessing';
import LanguageSelector from '../LanguageSelector';
import LanguageButton from '../LanguageButton';
import { useTranslations } from '../../../hooks/useTranslations';

function PreferencesModal({ onClose, backgroundColor }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100]">
      <div 
        className="w-full max-w-lg rounded-lg shadow-xl p-6"
        style={{ backgroundColor: backgroundColor || '#ffffff' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Preferencias de Cookies</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies Necesarias</h4>
              <p className="text-sm text-gray-500">Requeridas para el funcionamiento del sitio</p>
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded text-sm">Siempre activas</div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies Analíticas</h4>
              <p className="text-sm text-gray-500">Nos ayudan a mejorar el sitio</p>
            </div>
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 mr-2" />
              <span className="text-sm">Permitir</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies de Marketing</h4>
              <p className="text-sm text-gray-500">Usadas para publicidad personalizada</p>
            </div>
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 mr-2" />
              <span className="text-sm">Permitir</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={() => onClose(false)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Volver
          </button>
          <button 
            onClick={() => onClose(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerPreview({ 
  bannerConfig = { layout: { desktop: {} }, components: [] }, 
  profile = {}, 
  deviceView = 'desktop',
  previewData = null,
  showPreview = true,
  onRendered = () => {},
  currentLanguage: propCurrentLanguage = 'en',
  availableLanguages: propAvailableLanguages = ['en']
}) {
  const [currentDevice, setCurrentDevice] = useState(deviceView);
  const [showBanner, setShowBanner] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const bannerContainerRef = useRef(null);
  
  // Hook de traducciones
  const {
    currentLanguage: hookCurrentLanguage,
    availableLanguages: hookAvailableLanguages,
    setCurrentLanguage,
    translateToLanguage,
    getTranslatedComponents,
    isTranslating
  } = useTranslations(bannerConfig?._id, bannerConfig?.components);
  
  // Usar props si se proporcionan, sino usar valores del hook
  const currentLanguage = propCurrentLanguage || hookCurrentLanguage;
  const availableLanguages = propAvailableLanguages?.length > 0 ? propAvailableLanguages : hookAvailableLanguages;

  // Safe access to profile properties
  const safeProfileAccess = (path) => {
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
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error accessing profile path ${path}:`, err);
      }
      return null;
    }
  };
  
  // Sincronizar currentDevice cuando cambia deviceView prop
  useEffect(() => {
    if (deviceView) {
      setCurrentDevice(deviceView);
    }
  }, [deviceView]);

  const getPreviewContainerStyles = () => {
    switch (currentDevice) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      default:
        return 'w-full max-w-[1200px]';
    }
  };

  const getLayoutStyles = () => {
    const layout = bannerConfig.layout[currentDevice] || {};
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
        style.bottom = 'auto'; // Asegurar que bottom no esté definido
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.left = 0;
        style.right = 0;
        style.top = 'auto'; // Asegurar que top no esté definido
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.left = 0;
        style.right = 0;
        style.bottom = 'auto'; // Asegurar que bottom no esté definido
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
  
  // Extract image URL from component content - usando función centralizada
  // Nota: Esta función se mantiene para compatibilidad, pero usa la función centralizada

  // Función para convertir porcentajes a píxeles en vista previa
  const convertPercentageToPixels = (styleObj, referenceContainer, isChildComponent = false) => {
    if (!referenceContainer || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = referenceContainer.getBoundingClientRect();
      
      // CORRECCIÓN: Aplicar límites para componentes hijos
      const applyChildLimits = (value, isWidth = true) => {
        if (!isChildComponent) return value;
        // Límite del 95% del contenedor para hijos
        const maxLimit = isWidth ? containerRect.width * 0.95 : containerRect.height * 0.95;
        const limited = Math.min(value, maxLimit);
        
        // DEBUG: Log cuando se aplican límites
        if (limited !== value && process.env.NODE_ENV === 'development') {
          console.log(`⚠️ Preview: ${isWidth ? 'Ancho' : 'Alto'} limitado: ${value}px → ${limited}px (contenedor: ${isWidth ? containerRect.width : containerRect.height}px)`);
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

  const renderComponent = (component, parentContainerRef = null) => {
    if (!component) return null;
    
    // Log solo para componentes específicos o en modo debug
    if (process.env.NODE_ENV === 'development' && component.type === 'language-button') {
      console.log('🔍 BannerPreview - Rendering language-button:', {
        id: component.id,
        type: component.type,
        content: component.content,
        position: component.position?.[currentDevice],
        style: component.style?.[currentDevice]
      });
    }
    
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, currentDevice) : 
      {...deviceStyle};
    
    
    // Para componentes hijos, convertir porcentajes usando el contenedor padre como referencia
    const convertedProcessedStyle = component.parentId && parentContainerRef ? 
      convertPercentageToPixels(processedStyle, parentContainerRef.current, true) : // Hijos usan contenedor padre con límites
      convertPercentageToPixels(processedStyle, bannerContainerRef.current, false); // Componentes raíz usan banner container
    
    // DEBUG: Verificar si se está usando el contenedor correcto
    if (component.parentId && process.env.NODE_ENV === 'development') {
      console.log(`📐 Preview: Usando ${parentContainerRef ? 'contenedor padre' : 'banner container'} para ${component.id}`, {
        hasParentRef: !!parentContainerRef,
        parentRefCurrent: parentContainerRef?.current,
        isChild: !!component.parentId
      });
    }
    
    // Base styles with positioning - CORREGIDO para hijos de contenedores
    const baseStyles = component.parentId ? {
      // Para hijos de contenedores: mantener todos los estilos pero sin posicionamiento
      ...convertedProcessedStyle,
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1,
      // Los hijos no deben tener posición, eso lo maneja el wrapper
      position: undefined,
      top: undefined,
      left: undefined,
      right: undefined,
      bottom: undefined,
      transform: undefined,
      // Dimensiones con límites aplicados
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
        // DEBUG: Verificar estado del componente de texto
        console.log(`🔍 TEXT DEBUG - ID: ${component.id}`, {
          parentId: component.parentId,
          hasParentRef: !!parentContainerRef,
          parentRefCurrent: !!parentContainerRef?.current,
          isChild: !!component.parentId,
          width: convertedProcessedStyle.width,
          height: convertedProcessedStyle.height
        });
        
        // APLICAR LÍMITES MANUALMENTE - ENFOQUE MÁS SIMPLE
        let finalTextStyle = { ...convertedProcessedStyle };
        
        // FORZAR LÍMITES SIN IMPORTAR SI ES HIJO O NO - PARA DEBUG
        if (parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          console.log(`🔍 CONTAINER RECT:`, containerRect);
          
          if (containerRect.width > 0 && containerRect.height > 0) {
            const maxWidth = containerRect.width * 0.95;
            const maxHeight = containerRect.height * 0.95;
            
            // Obtener dimensiones actuales
            const currentWidth = parseFloat(finalTextStyle.width) || 150;
            const currentHeight = parseFloat(finalTextStyle.height) || 40;
            
            console.log(`🔍 CURRENT DIMENSIONS:`, { currentWidth, currentHeight, maxWidth, maxHeight });
            
            // Aplicar límites SIEMPRE (no solo si es hijo)
            if (currentWidth > maxWidth) {
              console.log(`🔥 PREVIEW TEXT LIMIT: ${currentWidth}px → ${Math.round(maxWidth)}px`);
              finalTextStyle.width = `${Math.round(maxWidth)}px`;
            }
            if (currentHeight > maxHeight) {
              console.log(`🔥 PREVIEW TEXT HEIGHT LIMIT: ${currentHeight}px → ${Math.round(maxHeight)}px`);
              finalTextStyle.height = `${Math.round(maxHeight)}px`;
            }
          }
        } else {
          console.log(`⚠️ NO HAY PARENT CONTAINER REF PARA:`, component.id);
        }
        
        // CORRECCIÓN: Usar EXACTAMENTE la misma lógica que ComponentRenderer
        const textStyle = {
          ...finalTextStyle,
          // IMPORTANTE: Usar las dimensiones con límites aplicados
          width: finalTextStyle.width || '150px',
          height: finalTextStyle.height || '40px',
          // Establecer mínimos razonables
          minWidth: '50px',
          minHeight: '20px',
          // CRÍTICO: Forzar que no se salga del contenedor
          maxWidth: finalTextStyle.width,
          maxHeight: finalTextStyle.height,
          // Asegurar que el contenedor sea de tamaño fijo (box-sizing)
          boxSizing: 'border-box',
          // Permitir bordes personalizados si se configuran
          borderWidth: finalTextStyle.borderWidth || '0px',
          borderStyle: finalTextStyle.borderStyle || 'solid',
          borderColor: finalTextStyle.borderColor || 'transparent',
          padding: finalTextStyle.padding || '10px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          position: 'relative', // Importante para posicionar el control de resize
          display: 'flex',
          alignItems: finalTextStyle.textAlign === 'center' ? 'center' : 'flex-start',
          justifyContent: finalTextStyle.textAlign === 'center' ? 'center' : 
                         finalTextStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
          // CRÍTICO: Evitar que flex lo estire
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
        
        // Si es hijo y tenemos referencia del contenedor, aplicar límite del 95%
        if (component.parentId && parentContainerRef?.current) {
          const containerRect = parentContainerRef.current.getBoundingClientRect();
          const maxWidth = containerRect.width * 0.95;
          const maxHeight = containerRect.height * 0.95;
          
          // Convertir a número si es string
          const currentWidth = typeof finalWidth === 'string' ? parseFloat(finalWidth) : finalWidth;
          const currentHeight = typeof finalHeight === 'string' ? parseFloat(finalHeight) : finalHeight;
          
          // Aplicar límites
          if (currentWidth > maxWidth) {
            console.log(`⚠️ Preview Button: Ancho limitado ${currentWidth}px → ${Math.round(maxWidth)}px (contenedor: ${containerRect.width}px)`);
            finalWidth = `${Math.round(maxWidth)}px`;
          }
          if (currentHeight > maxHeight) {
            console.log(`⚠️ Preview Button: Alto limitado ${currentHeight}px → ${Math.round(maxHeight)}px (contenedor: ${containerRect.height}px)`);
            finalHeight = `${Math.round(maxHeight)}px`;
          }
        }
        
        return (
          <div
            key={component.id}
            style={{
              ...baseStyles,
              // CORRECCIÓN: Contenedor con dimensiones exactas y límites aplicados
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
              onClick={handleClick}
              style={{ 
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                // Copiar estilos visuales relevantes
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
      case 'language-button': {
        console.log('🌐 LANGUAGE-BUTTON DEBUG:', {
          id: component.id,
          content: component.content,
          currentLanguage,
          availableLanguages,
          baseStyles
        });
        
        // Calcular dimensiones finales
        let finalWidth = baseStyles.width || '120px';
        let finalHeight = baseStyles.height || '35px';
        
        // Si es hijo y tenemos referencia del contenedor, aplicar límite del 95%
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
      case 'image': {
        const imageUrl = getImageUrl(component, currentDevice, 'preview');
        const hasError = imageErrors[component.id];
        
        console.log(`🖼️ Preview: Procesando imagen ${component.id}:`, {
          imageUrl,
          hasError,
          contentType: typeof component.content,
          content: component.content,
          hasPreviewUrl: !!component.style?.[currentDevice]?._previewUrl
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
              willChange: 'opacity, transform',
              // CRÍTICO: Asegurar que la imagen se ajuste al contenedor
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
              
              // Almacenar URL en _loadedImageUrls global para depuración
              if (!window._loadedImageUrls) window._loadedImageUrls = {};
              window._loadedImageUrls[component.id] = imageUrl;
            }}
            onError={(e) => handleImageError(
              e, 
              imageUrl, 
              component.id, 
              (id, hasError) => setImageErrors(prev => ({ ...prev, [id]: hasError })),
              // Custom callback para manejo específico en este componente
              (e, url, id) => {
                return false; // false indica que no se encontró una solución
              },
              // ESTRATEGIA 1: Intentar convertir /direct-image/ a /templates/images/
              (e, url, id) => {
                if (url && url.includes('/direct-image/')) {
                  
                  try {
                    const urlParts = url.split('/direct-image/');
                    if (urlParts.length === 2) {
                      const idPath = urlParts[1].split('?')[0];
                      const serverUrl = window.location.origin;
                      const altUrl = `${serverUrl}/templates/images/${idPath}?t=${Date.now()}`;
                      
                      
                      const imgRetry = new Image();
                      imgRetry.onload = () => {
                        setImageErrors(prev => ({
                          ...prev,
                          [id]: false
                        }));
                        e.target.src = altUrl;
                      };
                      imgRetry.onerror = () => {
                      };
                      imgRetry.crossOrigin = "anonymous";
                      imgRetry.src = altUrl;
                      return true;
                    }
                  } catch (err) {
                  }
                  return false;
                }
                return false;
              },
              
              // ESTRATEGIA 2: Intentar convertir /templates/images/ a /direct-image/
              (e, url, id) => {
                if (url && url.includes('/templates/images/')) {
                  
                  try {
                    const relativePath = url.split('/templates/images/')[1]?.split('?')[0];
                    if (relativePath) {
                      // Intentar con direct-image desde origin
                      const originUrl = window.location.origin;
                      const directImageUrl = `${originUrl}/direct-image/${relativePath}?t=${Date.now()}`;
                      
                      
                      const imgRetry = new Image();
                      imgRetry.onload = () => {
                        setImageErrors(prev => ({
                          ...prev,
                          [id]: false
                        }));
                        e.target.src = directImageUrl;
                      };
                      imgRetry.onerror = () => {
                        // ESTRATEGIA 3: Intentar directo con el servidor de backend
                        
                        const serverUrl = 'http://localhost:3000';
                        const backendUrl = `${serverUrl}/templates/images/${relativePath}?t=${Date.now()}`;
                        
                        
                        const lastRetry = new Image();
                        lastRetry.onload = () => {
                          setImageErrors(prev => ({
                            ...prev,
                            [id]: false
                          }));
                          e.target.src = backendUrl;
                        };
                        lastRetry.onerror = () => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error(`❌ Preview: Todas las estrategias fallaron. No se pudo cargar la imagen.`);
                          }
                          // Marcar como error si todas las estrategias fallan
                          setImageErrors(prev => ({
                            ...prev,
                            [id]: true
                          }));
                        };
                        lastRetry.crossOrigin = "anonymous";
                        lastRetry.src = backendUrl;
                      };
                      imgRetry.crossOrigin = "anonymous";
                      imgRetry.src = directImageUrl;
                      return true;
                    }
                  } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                      console.warn(`⚠️ Preview: Error en estrategia 2:`, err);
                    }
                    // Marcar como error
                    setImageErrors(prev => ({
                      ...prev,
                      [id]: true
                    }));
                  }
                  return false;
                }
              },
              
              // ESTRATEGIA 4: Para URLs blob, intentar recuperar desde _imageFiles
              (e, url, id) => {
                if (url && url.startsWith('blob:')) {
                  
                  // Buscar el componente en _imageFiles por ID
                  try {
                    if (window._imageFiles) {
                      // Buscar primero por ID directo
                      if (window._imageFiles[id]) {
                        const file = window._imageFiles[id];
                        const newObjectUrl = URL.createObjectURL(file);
                        
                        // Registrar para limpieza futura
                        if (!window._objectUrls) window._objectUrls = [];
                        window._objectUrls.push(newObjectUrl);
                        
                        // Usar el nuevo ObjectURL
                        e.target.src = newObjectUrl;
                        return true;
                      }
                      
                      // Si no se encuentra, buscar en todas las claves
                      for (const [key, file] of Object.entries(window._imageFiles)) {
                        if (key.startsWith('__IMAGE_REF__')) {
                          // Crear un nuevo ObjectURL y probarlo
                          const newUrl = URL.createObjectURL(file);
                          
                          // Registrar para limpieza
                          if (!window._objectUrls) window._objectUrls = [];
                          window._objectUrls.push(newUrl);
                          
                          e.target.src = newUrl;
                          return true;
                        }
                      }
                    }
                  } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                      console.warn(`⚠️ Preview: Error recuperando desde _imageFiles:`, err);
                    }
                  }
                  return false;
                }
                return false;
              }
            )}
          />
        );
      }
      case 'container': {
        // DEBUG: Log container rendering
        
        // Renderizar contenedor con sus hijos
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
          // CRÍTICO: position relative para que los hijos absolutos se posicionen dentro
          position: 'relative',
          width: '100%',
          height: '100%',
          // Estilos visuales del contenedor
          backgroundColor: processedStyle.backgroundColor || 'rgba(59, 130, 246, 0.05)',
          border: processedStyle.border || '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: processedStyle.borderRadius || '4px',
          padding: processedStyle.padding || '10px',
          // IMPORTANTE: Para contener a los hijos
          overflow: 'hidden', // Mantener hidden pero asegurar que las imágenes se ajusten
          boxSizing: 'border-box',
          // Layout del contenedor
          display: displayMode === 'flex' ? 'flex' : displayMode === 'grid' ? 'grid' : 'block',
          // Propiedades específicas del modo
          ...(displayMode === 'flex' && {
            flexDirection: containerConfig.flexDirection || 'row',
            justifyContent: containerConfig.justifyContent || 'flex-start',
            alignItems: containerConfig.alignItems || 'stretch',
            gap: containerConfig.gap || '10px',
            flexWrap: 'nowrap' // Evitar que los elementos se envuelvan
          }),
          ...(displayMode === 'grid' && {
            gridTemplateColumns: containerConfig.gridTemplateColumns || 'repeat(2, 1fr)',
            gridTemplateRows: containerConfig.gridTemplateRows || 'auto',
            justifyItems: containerConfig.justifyItems || 'flex-start',
            alignItems: containerConfig.alignItems || 'flex-start',
            gap: containerConfig.gap || '10px'
          })
        };
        
        // DEBUG: Log container styles - VALORES EXACTOS
        
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
                const childStyle = child.style?.[currentDevice] || {};
                
                // Para modo libre, el wrapper maneja la posición
                childWrapperStyle = {
                  position: 'absolute',
                  top: childPos.top || '0px',
                  left: childPos.left || '0px',
                  // El tamaño se maneja en el componente hijo
                  width: 'auto',
                  height: 'auto',
                  // Limitar el contenido al tamaño del contenedor
                  maxWidth: '95%',
                  maxHeight: '95%',
                  overflow: 'visible', // Permitir que el hijo maneje su overflow
                  boxSizing: 'border-box'
                };
              } else {
                // En modo flex/grid: posición relativa con dimensiones del contenedor
                const childStyle = child.style?.[currentDevice] || {};
                
                // Para flex/grid, los hijos también deben respetar límites
                const convertedChildStyle = convertPercentageToPixels(
                  childStyle,
                  containerInnerElement,
                  true // Es componente hijo, aplicar límites del 95%
                );
                
                childWrapperStyle = {
                  position: 'relative',
                  // Para flex/grid, usar dimensiones convertidas si están definidas
                  width: convertedChildStyle.width || 'auto',
                  height: convertedChildStyle.height || 'auto',
                  // CRÍTICO: Para imágenes, permitir que se ajusten sin recortar
                  overflow: child.type === 'image' ? 'visible' : 'hidden',
                  boxSizing: 'border-box',
                  // Aplicar límites máximos
                  maxWidth: convertedChildStyle.maxWidth || '95%',
                  maxHeight: convertedChildStyle.maxHeight || '95%',
                  // IMPORTANTE: Para modo flex, evitar que se estire
                  ...(displayMode === 'flex' && {
                    flex: '0 0 auto', // No crecer, no encoger, tamaño automático
                    alignSelf: child.type === 'text' ? 'flex-start' : 'auto' // Los textos no se estiran
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
              
              // DEBUG: Log child wrapper styles
              
              // Crear un wrapper con el callback ref para obtener el contenedor
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
        console.warn('❌ UNKNOWN COMPONENT TYPE:', component.type, component);
        return null;
    }
  };

  // Simulated webpage background
  const previewBackground = () => {
    return (
      <>
        <div className="space-y-4 mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-4/6"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="h-40 bg-gray-100 rounded-lg"></div>
          <div className="h-40 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-2/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
      </>
    );
  };

  // Preferences modal handlers
  const handleClosePreferences = (shouldClose) => {
    setShowPreferences(false);
    if (shouldClose) {
      setShowBanner(false);
    }
  };

  // Reset banner state
  const handleRefresh = () => {
    setShowBanner(true);
    setShowPreferences(false);
    setImageErrors({});
  };
  
  // Generate HTML/CSS for preview and call onRendered
  useEffect(() => {
    if (typeof onRendered === 'function' && showPreview) {
      // Si tenemos datos de vista previa de la API, usarlos directamente
      if (previewData && previewData.html && previewData.css) {
        onRendered(previewData.html, previewData.css);
        return;
      }
      
      // Si no hay datos de API, generar HTML/CSS local
      try {
        // Obtener el estilo del layout actual
        const layoutStyle = getLayoutStyles();
        const layoutClasses = bannerConfig.layout[currentDevice]?.type || 'banner';
        
        // Generar HTML para los componentes
        const componentsHtml = bannerConfig.components
          ?.filter(comp => !comp.parentId)
          .map(comp => {
            const renderedComponent = renderComponent(comp);
            if (!renderedComponent) return '';
            
            // Convertir el componente React a HTML (simulación simple)
            // En producción se necesitaría un enfoque más robusto como ReactDOMServer
            const componentHtml = `<div id="component-${comp.id}" class="banner-component">${renderedComponent}</div>`;
            return componentHtml;
          })
          .join('\n') || '';
          
        // Generar HTML completo
        const html = `
          <div id="banner-preview" class="banner-preview banner-type-${layoutClasses}" style="${Object.entries(layoutStyle).map(([key, value]) => `${key}: ${value};`).join(' ')}">
            ${componentsHtml}
          </div>
        `;
        
        // Generar CSS básico
        const css = `
          .banner-preview {
            position: fixed;
            z-index: 9999;
            font-family: sans-serif;
          }
          
          .banner-type-banner {
            left: 0;
            right: 0;
            width: 100%;
          }
          
          .banner-type-modal {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .banner-type-floating {
            max-width: 400px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }
          
          .banner-component {
            position: relative;
          }
        `;
        
        // Llamar al callback con el HTML y CSS generados
        onRendered(html, css);
      } catch (error) {
        console.error("Error al generar vista previa:", error);
        // Proporcionar una vista previa básica en caso de error
        const fallbackHtml = `<div id="banner-preview" style="background-color: #f8f9fa; padding: 20px; text-align: center;">Vista previa no disponible</div>`;
        const fallbackCss = `.banner-preview { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; }`;
        onRendered(fallbackHtml, fallbackCss);
      }
    }
  }, [bannerConfig, currentDevice, showPreview, previewData]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      
      {/* Preview toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Idioma:</span>
          </div>
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={async (lang) => {
              if (lang !== currentLanguage) {
                console.log(`🌐 Cambiando idioma a: ${lang}`);
                try {
                  await translateToLanguage(lang);
                  setCurrentLanguage(lang);
                  console.log(`✅ Idioma cambiado exitosamente a: ${lang}`);
                } catch (error) {
                  console.error(`❌ Error cambiando idioma:`, error);
                }
              }
            }}
            availableLanguages={availableLanguages}
            isLoading={isTranslating}
            position="bottom-left"
            size="medium"
            showFlags={true}
            showNames={true}
            variant="dropdown"
          />
          {isTranslating && (
            <div className="flex items-center gap-2 ml-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Traduciendo...</span>
            </div>
          )}
        </div>
        <button 
          className="p-2 rounded hover:bg-gray-100"
          title="Actualizar vista previa"
          onClick={handleRefresh}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto p-4">
        <div className={`mx-auto ${getPreviewContainerStyles()} bg-white rounded-lg shadow-lg overflow-hidden`}>
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

          {/* Content container */}
          <div className="relative" style={{ height: '600px' }}>
            <div className="p-6">
              {previewBackground()}
            </div>

            {/* Banner */}
            {showBanner && (() => {
              // Get translated components if translation is enabled
              const componentsToRender = getTranslatedComponents ? getTranslatedComponents(currentLanguage) : bannerConfig.components;
              const rootComponents = componentsToRender?.filter(comp => !comp.parentId) || [];
              
              console.log('🎯 BannerPreview - Root components to render:', {
                totalComponents: componentsToRender?.length || 0,
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
                bannerConfigId: bannerConfig?._id,
                currentLanguage,
                availableLanguages,
                hasTranslationHook: !!getTranslatedComponents
              });
              
              return (
                <div ref={bannerContainerRef} style={getLayoutStyles()} className="relative">
                  {rootComponents.map(renderComponent)}
                </div>
              );
            })()}

            {/* Preferences modal */}
            {showPreferences && (
              <PreferencesModal 
                onClose={handleClosePreferences}
                backgroundColor={bannerConfig.layout[currentDevice]?.backgroundColor}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BannerPreview;