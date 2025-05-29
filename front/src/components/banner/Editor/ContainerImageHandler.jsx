import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * ContainerImageHandler - Renderiza imágenes dentro de contenedores
 * Usa exactamente la misma lógica que ComponentRenderer para imágenes normales
 */
const ContainerImageHandler = ({
  component,
  deviceView,
  parentContainer,
  onUpdatePosition,
  onUpdateStyle,
  onUpdateContent,
  onSelectChild,
  isSelected,
  containerRef
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const imageRef = useRef(null);
  
  // Obtener configuración de estilo para el dispositivo actual  
  const getDeviceStyle = useCallback(() => {
    if (!component.style) return {};
    return component.style[deviceView] || component.style.desktop || {};
  }, [component.style, deviceView]);

  // Obtener posición para el dispositivo actual
  const getDevicePosition = useCallback(() => {
    if (!component.position) return { top: '0%', left: '0%' };
    return component.position[deviceView] || component.position.desktop || { top: '0%', left: '0%' };
  }, [component.position, deviceView]);

  // Función para obtener información de imagen (igual que ComponentRenderer)
  const getImageInfo = useCallback(() => {
    try {
      const info = {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'local'
      };
      
      let contentUrl = '';
      
      if (typeof component.content === 'string') {
        contentUrl = component.content;
      } else if (component.content?.texts?.en && typeof component.content.texts.en === 'string') {
        contentUrl = component.content.texts.en;
      }
      
      if (contentUrl) {
        info.imageSource = contentUrl;
        info.isValidImageUrl = true;
      }
      
      return info;
    } catch (error) {
      console.error('Error en getImageInfo:', error);
      return { imageSource: null, isValidImageUrl: false };
    }
  }, [component.content]);

  // Manejar carga de imagen (igual que ComponentRenderer)
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ratio);
      setImageLoaded(true);
      setImageError(false);
    }
  }, []);

  const handleImageError = useCallback((e) => {
    console.error(`❌ Error al cargar imagen`, e);
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const style = getDeviceStyle();
  const position = getDevicePosition();
  const imageInfo = getImageInfo();

  return (
    <div
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        width: style.width || '200px',
        height: style.height || '150px',
        cursor: component.locked ? 'default' : 'move',
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        zIndex: isSelected ? 1000 : 1
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectChild?.(component.id);
      }}
    >
      {/* Imagen si es válida */}
      {imageInfo.imageSource && (
        <img
          ref={imageRef}
          src={imageInfo.imageSource}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: imageLoaded && !imageError ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      
      {/* Estado de carga */}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ccc',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ marginTop: '8px', fontSize: '12px' }}>Cargando imagen...</span>
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
          <ImageIcon size={24} style={{ marginBottom: '8px', color: '#ccc' }} />
          <span style={{ fontSize: '12px', textAlign: 'center' }}>
            {imageError ? 'Error cargando imagen' : 'Sin imagen'}
          </span>
        </div>
      )}

      {/* Indicador de aspect ratio */}
      {aspectRatio && imageLoaded && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '1px 3px',
          fontSize: '9px',
          borderRadius: '0 0 0 3px',
          zIndex: 10
        }}>
          {Math.round(aspectRatio * 100) / 100}:1
        </div>
      )}

      {/* Error de carga */}
      {imageError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ef4444',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Error cargando imagen
        </div>
      )}
    </div>
  );
};

export default ContainerImageHandler;