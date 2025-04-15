import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Move, Image as ImageIcon } from 'lucide-react';

// Caché global para evitar recargar imágenes ya cargadas
const imageLoadCache = new Map();

const ComponentRenderer = ({
  component,
  deviceView,
  isSelected,
  onDelete,
  onUpdateContent,
  onUpdateStyle,
  resizeStep = 5
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const containerRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  // Inicializamos imageLoaded en true si la URL ya está en caché
  const [imageLoaded, setImageLoaded] = useState(false);
  const previousImageUrlRef = useRef(null);

  // Determinar URL actual de la imagen
  const getImageUrl = () => {
    // Si hay vista previa, usarla primero
    if (deviceStyle._previewUrl) {
      return deviceStyle._previewUrl;
    }
    
    // Si el contenido es string, verificar si es URL
    if (typeof component.content === 'string') {
      if (component.content.startsWith('data:image') || 
          component.content.startsWith('/') || 
          component.content.match(/^https?:\/\//)) {
        return component.content;
      }
    }
    
    // Si el contenido está en texts.en, verificar si es URL
    if (component.content?.texts?.en && typeof component.content.texts.en === 'string') {
      const enText = component.content.texts.en;
      if (enText.startsWith('data:image') || 
          enText.startsWith('/') || 
          enText.match(/^https?:\/\//)) {
        return enText;
      }
    }
    
    return null;
  };

  // Verificar si la URL de la imagen ha cambiado realmente
  useEffect(() => {
    if (component.type === 'image') {
      const currentImageUrl = getImageUrl();
      
      // Si la URL es la misma, mantener el estado anterior
      if (previousImageUrlRef.current === currentImageUrl) {
        return;
      }
      
      // Si la URL es nueva, actualizar la referencia
      previousImageUrlRef.current = currentImageUrl;
      
      // Si la URL existe y está en caché, usar el estado de la caché
      if (currentImageUrl && imageLoadCache.has(currentImageUrl)) {
        setImageLoaded(true);
        setImageError(false);
      } else {
        // Solo resetear el estado si la URL realmente cambió
        setImageLoaded(false);
        setImageError(false);
      }
    }
  }, [component, deviceView]);

  // Extract text from component based on its structure
  useEffect(() => {
    let displayText = '';
    
    if (typeof component.content === 'string') {
      displayText = component.content;
    } else if (component.content?.texts?.en) {
      displayText = component.content.texts.en;
    } else if (component.content?.text) {
      displayText = component.content.text;
    }
    
    setTempContent(displayText);
  }, [component.content, component.id]);

  // Verificación inicial de tamaño para componentes de imagen
  useEffect(() => {
    if (component.type === 'image' && containerRef.current) {
      // Encontramos el banner container
      const bannerElement = containerRef.current.closest('.banner-container');
      if (!bannerElement) return;
      
      const maxWidth = bannerElement.clientWidth;
      const maxHeight = bannerElement.clientHeight;
      
      // Obtenemos dimensiones actuales o definimos valores predeterminados
      const style = component.style?.[deviceView] || {};
      let currentWidth = containerRef.current.clientWidth;
      let currentHeight = containerRef.current.clientHeight;
      
      // Si no hay dimensiones definidas, usamos los valores predeterminados
      if (!style.width || !style.height) {
        return; // Solo ajustamos si ya tiene dimensiones definidas
      }
      
      const aspectRatio = currentWidth / currentHeight;
      
      // Verificamos si excede los límites
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
      }
      
      // Solo actualizamos si las dimensiones cambiaron
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        // Redondear al paso de resize más cercano
        newWidth = Math.round(newWidth / resizeStep) * resizeStep;
        newHeight = Math.round(newHeight / resizeStep) * resizeStep;
        
        containerRef.current.style.width = `${newWidth}px`;
        containerRef.current.style.height = `${newHeight}px`;
        
        onUpdateStyle(component.id, {
          width: `${newWidth}px`,
          height: `${newHeight}px`
        });
      }
    }
  }, [component, deviceView, onUpdateStyle, resizeStep]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (component.locked) return;
    
    if (component.type === 'text') {
      setIsEditing(true);
    }
  };

  const handleContentSave = () => {
    // Update content based on its current structure
    let updatedContent;
    
    if (typeof component.content === 'string') {
      updatedContent = tempContent;
    } else if (component.content && typeof component.content === 'object') {
      // Maintain structure but update English text
      updatedContent = {
        ...component.content,
        texts: {
          ...(component.content.texts || {}),
          en: tempContent
        }
      };
      
      // If it also has the text property (for compatibility), update it
      if ('text' in component.content) {
        updatedContent.text = tempContent;
      }
    }
    
    onUpdateContent(component.id, updatedContent);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleContentSave();
    }
    if (e.key === 'Escape') {
      // Restore original content
      let originalText = '';
      if (typeof component.content === 'string') {
        originalText = component.content;
      } else if (component.content?.texts?.en) {
        originalText = component.content.texts.en;
      } else if (component.content?.text) {
        originalText = component.content.text;
      }
      
      setTempContent(originalText);
      setIsEditing(false);
    }
  };

  const Controls = () => (
    <div
      className="absolute flex gap-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{
        zIndex: 9999,
        pointerEvents: 'auto',
        top: '-10px',
        right: '10px',
        transform: 'translate(50%, -50%)'
      }}
    >
      <button className="p-1 rounded bg-blue-500 text-white text-xs" title="Mover">
        <Move size={12} />
      </button>
      {!component.locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(component.id);
          }}
          className="p-1 rounded bg-red-500 text-white text-xs"
          title="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  // RESIZE HANDLER - Reescrito para funcionar con pasos y respetando límites
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const startWidth = containerRef.current.clientWidth;
    const startHeight = containerRef.current.clientHeight;
    const aspectRatio = startWidth / startHeight;
    const startX = e.clientX;

    // Obtenemos las dimensiones máximas del banner (contenedor padre)
    const bannerElement = containerRef.current.closest('.banner-container');
    const maxWidth = bannerElement ? bannerElement.clientWidth : Infinity;
    const maxHeight = bannerElement ? bannerElement.clientHeight : Infinity;

    // Paso de resize (usando el prop)
    const step = resizeStep || 5;

    function onMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      
      // Calculamos el cambio en ancho base
      let rawWidthChange = startWidth + deltaX;
      
      // Redondeamos al múltiplo más cercano del paso
      let candidateWidth = Math.round(rawWidthChange / step) * step;
      
      // Nos aseguramos de tener un mínimo de tamaño
      candidateWidth = Math.max(40, candidateWidth);
      
      // Calculamos la altura manteniendo la relación de aspecto
      let candidateHeight = candidateWidth / aspectRatio;

      // Verificamos que no exceda los límites del banner
      // Primero verificamos si excede el ancho
      if (candidateWidth > maxWidth) {
        candidateWidth = maxWidth;
        candidateHeight = candidateWidth / aspectRatio;
      }
      
      // Luego verificamos si excede el alto
      if (candidateHeight > maxHeight) {
        candidateHeight = maxHeight;
        candidateWidth = candidateHeight * aspectRatio;
      }

      // Redondeamos nuevamente al paso más cercano después de los ajustes de límites
      candidateWidth = Math.round(candidateWidth / step) * step;
      candidateHeight = candidateWidth / aspectRatio;

      // Aplicamos los cambios
      containerRef.current.style.width = `${candidateWidth}px`;
      containerRef.current.style.height = `${candidateHeight}px`;

      // Actualizamos el estilo en el estado del componente
      onUpdateStyle(component.id, {
        width: `${candidateWidth}px`,
        height: `${candidateHeight}px`
      });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Get device-specific styles 
  const deviceStyle = component.style?.[deviceView] || {};
  
  // Extract content as text for display
  let displayContent = '';
  if (typeof component.content === 'string') {
    displayContent = component.content;
  } else if (component.content?.texts?.en) {
    displayContent = component.content.texts.en;
  } else if (component.content?.text) {
    displayContent = component.content.text;
  }

  // Verificar y determinar información de imagen de forma segura
  const getImageInfo = () => {
    try {
      // Valores predeterminados
      const info = {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'local'
      };
      
      // Obtener la URL real (puede estar en component.content o en component.content.texts.en)
      let contentUrl = '';
      
      if (typeof component.content === 'string') {
        // Si el contenido es directamente un string, usarlo como URL
        contentUrl = component.content;
      } else if (component.content?.texts?.en && typeof component.content.texts.en === 'string') {
        // Si el contenido está en texts.en, usarlo como URL
        contentUrl = component.content.texts.en;
      }
      
      // Verificar si hay una URL válida
      if (contentUrl) {
        // Verificar si es referencia temporal
        if (contentUrl.startsWith('__IMAGE_REF__')) {
          info.isTemporaryRef = true;
          info.imageType = 'temp';
        }
        
        // Verificar si es URL válida
        if (contentUrl.startsWith('data:image') || 
            contentUrl.startsWith('/') || 
            contentUrl.match(/^https?:\/\//)) {
          info.isValidImageUrl = true;
          info.imageSource = contentUrl;
          info.imageType = contentUrl.startsWith('http') || 
                         contentUrl.startsWith('/') ? 'server' : 'local';
        }
      }
      
      // Si hay vista previa en el estilo, usarla con prioridad
      if (deviceStyle._previewUrl) {
        info.imageSource = deviceStyle._previewUrl;
      }
      
      return info;
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      return {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'unknown'
      };
    }
  };

  // Render component based on its type
  let content;
  switch (component.type) {
    case 'button':
      content = (
        <button 
          style={deviceStyle}
          onDoubleClick={handleDoubleClick}
        >
          {displayContent || 'Botón'}
        </button>
      );
      break;
    case 'image':
      // Obtener información de imagen de forma segura
      const imageInfo = getImageInfo();
      
      content = (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: deviceStyle.width || '200px',
            height: deviceStyle.height || '150px',
            cursor: component.locked ? 'default' : 'move',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden' // Evitar desbordamiento durante la carga/redimensión
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* Imagen si es válida o hay vista previa */}
          {imageInfo.imageSource && (
            <img
              src={imageInfo.imageSource}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: imageLoaded && !imageError ? 1 : 0,
                transition: 'opacity 0.2s'
              }}
              onLoad={() => {
                setImageLoaded(true);
                setImageError(false);
                // Guardar en caché que esta imagen se cargó correctamente
                if (imageInfo.imageSource) {
                  imageLoadCache.set(imageInfo.imageSource, true);
                }
              }}
              onError={(e) => {
                console.error(`❌ Error al cargar imagen`, e);
                setImageError(true);
                setImageLoaded(true);
                // Guardar en caché que esta imagen dio error
                if (imageInfo.imageSource) {
                  imageLoadCache.set(imageInfo.imageSource, false);
                }
              }}
            />
          )}
          
          {/* Mostrar estado de carga solo si la imagen realmente está cargando */}
          {imageInfo.imageSource && !imageLoaded && !imageError && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              color: '#666'
            }}>
              <div className="animate-pulse flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="mt-2 text-sm">Cargando imagen...</span>
              </div>
            </div>
          )}
          
          {/* Placeholder cuando no hay imagen o hay error */}
          {(!imageInfo.imageSource || imageError) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f5f5f5',
              border: '1px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              <ImageIcon size={24} className="mb-2 text-gray-400" />
              <span style={{ fontSize: '13px', textAlign: 'center', padding: '0 10px' }}>
                {imageError 
                  ? 'Error al cargar la imagen' 
                  : imageInfo.isTemporaryRef
                    ? 'Imagen seleccionada (vista en panel)'
                    : 'Haga doble clic para seleccionar'}
              </span>
              {imageError && imageInfo.imageSource && (
                <span style={{ fontSize: '10px', textAlign: 'center', padding: '5px 10px 0', color: '#999' }}>
                  URL: {typeof imageInfo.imageSource === 'string' 
                    ? (imageInfo.imageSource.length > 30 
                      ? imageInfo.imageSource.substring(0, 30) + '...' 
                      : imageInfo.imageSource)
                    : 'Formato no válido'}
                </span>
              )}
            </div>
          )}
          
          {/* Resize handle */}
          {!component.locked && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '20px',
                height: '20px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                cursor: 'nwse-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              onMouseDown={handleResizeStart}
            >
              <div style={{
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '0 0 8px 8px',
                borderColor: 'transparent transparent #ffffff transparent'
              }}/>
            </div>
          )}
          
          {/* Indicador de tipo de imagen */}
          {imageInfo.imageSource && (
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              backgroundColor: imageInfo.imageType === 'temp' 
                ? 'rgba(59, 130, 246, 0.7)' 
                : imageInfo.imageType === 'server' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(99, 102, 241, 0.7)',
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '0 0 4px 0'
            }}>
              {imageInfo.imageType === 'temp' 
                ? 'Temporal' 
                : imageInfo.imageType === 'server' ? 'Servidor' : 'Imagen'}
            </div>
          )}
          
          {/* Indicador de paso de resize */}
          {resizeStep > 1 && (
            <div style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '0 0 0 4px',
              zIndex: 10
            }}>
              {resizeStep}px
            </div>
          )}
        </div>
      );
      break;
    case 'text':
    default:
      content = (
        <div 
          style={deviceStyle}
          onDoubleClick={handleDoubleClick}
        >
          {displayContent || 'Texto'}
        </div>
      );
      break;
  }

  return (
    <div
      className={`relative group inline-block ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ overflow: 'visible' }}
    >
      {isEditing && component.type === 'text' ? (
        <div className="relative group inline-block" onDoubleClick={handleDoubleClick}>
          <textarea
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            onBlur={handleContentSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
          <Controls />
        </div>
      ) : (
        <>
          {content}
          <Controls />
        </>
      )}
    </div>
  );
};

export default ComponentRenderer;