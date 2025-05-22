import React, { useState } from 'react';
import { RefreshCw, X, ImageOff } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles, ImagePlaceholders } from '../../../utils/imageProcessing';

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

function BannerPreview({ bannerConfig = { layout: { desktop: {} }, components: [] }, profile = {} }) {
  const [currentDevice, setCurrentDevice] = useState('desktop');
  const [showBanner, setShowBanner] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  // Safe access to profile properties
  const safeProfileAccess = (path) => {
    try {
      if (!path) return null;
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
  
  // Extract image URL from component content
  const getImageUrl = (component) => {
    try {
      // CASO 0: Añadir cache-busting para evitar problemas de caché
      const cacheBuster = `?t=${Date.now()}`;
      
      // CASO 1: Si hay una URL de previsualización en el estilo, usar esa directamente
      const deviceStyle = component.style?.[currentDevice];
      if (deviceStyle?._previewUrl) {
        // Para blob URLs no añadir parámetros
        if (deviceStyle._previewUrl.startsWith('blob:')) {
          console.log(`✓ Preview: Usando URL de preview (blob): ${deviceStyle._previewUrl}`);
          return deviceStyle._previewUrl;
        }
        // Para otras URLs añadir cache busting
        const url = deviceStyle._previewUrl + (deviceStyle._previewUrl.includes('?') ? '&cb=' + Date.now() : cacheBuster);
        console.log(`✓ Preview: Usando URL de preview:`, url);
        return url;
      }
      
      // CASO 2: Si es una referencia temporal, usar URL temporal u ObjectURL
      if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
        // Verificar si hay una imagen temporal en memoria global
        if (window._imageFiles && window._imageFiles[component.content]) {
          const file = window._imageFiles[component.content];
          if (typeof URL !== 'undefined' && URL.createObjectURL) {
            try {
              // Para archivos, crear un nuevo ObjectURL cada vez para evitar problemas de caché
              const objectUrl = URL.createObjectURL(file);
              console.log(`✓ Preview: Creado ObjectURL para imagen temporal: ${objectUrl.substring(0, 30)}...`);
              
              // Almacenar el ObjectURL para liberarlo después
              if (!window._objectUrls) window._objectUrls = [];
              window._objectUrls.push(objectUrl);
              
              // Limpiar ObjectURLs anteriores para evitar memory leaks (máximo 20)
              if (window._objectUrls.length > 20) {
                const oldUrl = window._objectUrls.shift();
                try { URL.revokeObjectURL(oldUrl); } catch (e) {}
              }
              
              return objectUrl;
            } catch (err) {
              console.warn(`⚠️ Preview: Error creando ObjectURL:`, err);
            }
          }
        }
        // Imagen de carga mientras se procesa
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
        // Extraer el path relativo
        const parts = component.content.split('/direct-image/');
        if (parts.length === 2) {
          const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
          
          // Usar URL absoluta con servidor actual
          const baseUrl = window.location.origin;
          const fullUrl = `${baseUrl}/direct-image/${relativePath}${cacheBuster}`;
          return fullUrl;
        }
      }
      
      // CASO 6: Rutas /templates/images/
      if (typeof component.content === 'string' && component.content.includes('/templates/images/')) {
        // Extraer el path relativo
        const parts = component.content.split('/templates/images/');
        if (parts.length === 2) {
          const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
          
          // Usar URL absoluta con servidor actual
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
          // Intentar primero inglés
          if (component.content.texts.en) {
            const enText = component.content.texts.en;
            if (typeof enText === 'string') {
              // Si es una URL relativa, convertirla a absoluta
              if (enText.startsWith('/')) {
                const serverUrl = window.location.origin;
                return `${serverUrl}${enText}${cacheBuster}`;
              }
              // Si es URL http/https o data URI, usarla directo
              if (enText.startsWith('http') || enText.startsWith('data:') || enText.startsWith('blob:')) {
                return enText;
              }
            }
          }
          
          // Si no hay texto en inglés, usar el primer texto disponible
          for (const lang in component.content.texts) {
            if (lang === 'en') continue;
            
            const text = component.content.texts[lang];
            if (typeof text === 'string') {
              // Si es una URL relativa, convertirla a absoluta
              if (text.startsWith('/')) {
                const serverUrl = window.location.origin;
                return `${serverUrl}${text}${cacheBuster}`;
              }
              // Si es URL http/https o data URI, usarla directo
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
      console.error(`❌ Preview: Error al procesar URL de imagen:`, error);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  const renderComponent = (component) => {
    if (!component) return null;
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, currentDevice) : 
      {...deviceStyle};
    
    
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
            onClick={handleClick}
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
      case 'image': {
        const imageUrl = getImageUrl(component, currentDevice, 'preview');
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
              console.log(`✅ Preview: Imagen cargada correctamente para componente ${component.id}`);
              
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
                console.log('⚠️ Preview: Estrategia personalizada para imagen en', id);
                return false; // false indica que no se encontró una solución
              },
              // ESTRATEGIA 1: Intentar convertir /direct-image/ a /templates/images/
              (e, url, id) => {
                if (url && url.includes('/direct-image/')) {
                  console.log('🔄 Preview: Intentando convertir /direct-image/ a /templates/images/');
                  
                  try {
                    const urlParts = url.split('/direct-image/');
                    if (urlParts.length === 2) {
                      const idPath = urlParts[1].split('?')[0];
                      const serverUrl = window.location.origin;
                      const altUrl = `${serverUrl}/templates/images/${idPath}?t=${Date.now()}`;
                      
                      console.log(`⚠️ Preview: Reintentando con URL alternativa: ${altUrl}`);
                      
                      const imgRetry = new Image();
                      imgRetry.onload = () => {
                        console.log(`✅ Preview: Carga exitosa con ruta alternativa templates/images`);
                        setImageErrors(prev => ({
                          ...prev,
                          [id]: false
                        }));
                        e.target.src = altUrl;
                      };
                      imgRetry.onerror = () => {
                        console.warn(`⚠️ Preview: Primera estrategia falló, intentando siguiente`);
                      };
                      imgRetry.crossOrigin = "anonymous";
                      imgRetry.src = altUrl;
                      return true;
                    }
                  } catch (err) {
                    console.warn(`⚠️ Preview: Error en estrategia 1:`, err);
                  }
                  return false;
                }
                return false;
              },
              
              // ESTRATEGIA 2: Intentar convertir /templates/images/ a /direct-image/
              (e, url, id) => {
                if (url && url.includes('/templates/images/')) {
                  console.log('🔄 Preview: Intentando convertir /templates/images/ a /direct-image/');
                  
                  try {
                    const relativePath = url.split('/templates/images/')[1]?.split('?')[0];
                    if (relativePath) {
                      // Intentar con direct-image desde origin
                      const originUrl = window.location.origin;
                      const directImageUrl = `${originUrl}/direct-image/${relativePath}?t=${Date.now()}`;
                      
                      console.log(`⚠️ Preview: Reintentando con URL directa: ${directImageUrl}`);
                      
                      const imgRetry = new Image();
                      imgRetry.onload = () => {
                        console.log(`✅ Preview: Carga exitosa con ruta alternativa direct-image`);
                        setImageErrors(prev => ({
                          ...prev,
                          [id]: false
                        }));
                        e.target.src = directImageUrl;
                      };
                      imgRetry.onerror = () => {
                        // ESTRATEGIA 3: Intentar directo con el servidor de backend
                        console.warn(`⚠️ Preview: Segunda estrategia falló, intentando con servidor local`);
                        
                        const serverUrl = 'http://localhost:3000';
                        const backendUrl = `${serverUrl}/templates/images/${relativePath}?t=${Date.now()}`;
                        
                        console.log(`⚠️ Preview: Último intento con URL de backend: ${backendUrl}`);
                        
                        const lastRetry = new Image();
                        lastRetry.onload = () => {
                          console.log(`✅ Preview: Carga exitosa con servidor de backend`);
                          setImageErrors(prev => ({
                            ...prev,
                            [id]: false
                          }));
                          e.target.src = backendUrl;
                        };
                        lastRetry.onerror = () => {
                          console.error(`❌ Preview: Todas las estrategias fallaron. No se pudo cargar la imagen.`);
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
                    console.warn(`⚠️ Preview: Error en estrategia 2:`, err);
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
                  console.log('🔄 Preview: URL blob falló, intentando recuperar de _imageFiles');
                  
                  // Buscar el componente en _imageFiles por ID
                  try {
                    if (window._imageFiles) {
                      // Buscar primero por ID directo
                      if (window._imageFiles[id]) {
                        const file = window._imageFiles[id];
                        const newObjectUrl = URL.createObjectURL(file);
                        console.log(`⚠️ Preview: Creando nuevo ObjectURL para imagen: ${newObjectUrl}`);
                        
                        // Registrar para limpieza futura
                        if (!window._objectUrls) window._objectUrls = [];
                        window._objectUrls.push(newObjectUrl);
                        
                        // Usar el nuevo ObjectURL
                        e.target.src = newObjectUrl;
                        return true;
                      }
                      
                      // Si no se encuentra, buscar en todas las claves
                      console.log('⚠️ Preview: Buscando imagen en todas las referencias...');
                      for (const [key, file] of Object.entries(window._imageFiles)) {
                        if (key.startsWith('__IMAGE_REF__')) {
                          // Crear un nuevo ObjectURL y probarlo
                          const newUrl = URL.createObjectURL(file);
                          console.log(`⚠️ Preview: Probando con imagen alternativa: ${newUrl}`);
                          
                          // Registrar para limpieza
                          if (!window._objectUrls) window._objectUrls = [];
                          window._objectUrls.push(newUrl);
                          
                          e.target.src = newUrl;
                          return true;
                        }
                      }
                    }
                  } catch (err) {
                    console.warn(`⚠️ Preview: Error recuperando desde _imageFiles:`, err);
                  }
                  return false;
                }
                return false;
              }
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

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Preview toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-end">
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
            {showBanner && (
              <div style={getLayoutStyles()} className="relative">
                {bannerConfig.components?.map(renderComponent)}
              </div>
            )}

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