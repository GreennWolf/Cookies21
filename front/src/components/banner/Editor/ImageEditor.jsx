import React, { useState, useRef, useEffect } from 'react';
import { Upload, Check, Maximize2, Move, Square } from 'lucide-react';
import { 
  ImagePlaceholders, 
  imageAspectRatioCache, 
  calculateImageAspectRatio,
  saveAspectRatioToCache,
  getAspectRatioFromCache 
} from '../../../utils/imageProcessing';

/**
 * Componente avanzado para editar imágenes con posicionamiento y redimensionamiento precisos
 */
const ImageEditor = ({ 
  imageUrl, 
  onImageChange, 
  onPositionChange, 
  onSizeChange,
  initialPosition = { top: '0px', left: '0px' },
  initialSize = { width: '200px', height: '150px' },
  maintainRatio = true,
  objectFit = 'contain'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl || ImagePlaceholders.editor);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({
    top: initialPosition.top || '0px',
    left: initialPosition.left || '0px'
  });
  const [size, setSize] = useState({
    width: initialSize.width || '200px',
    height: initialSize.height || '150px'
  });
  const [aspectRatio, setAspectRatio] = useState(1.33); // Default 4:3
  const [keepAspectRatio, setKeepAspectRatio] = useState(maintainRatio);

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Convertir valores de posición y tamaño a números
  const parseSize = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    const match = value.match(/^(\d+)(px|%|rem|em)?$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  // Actualizar aspect ratio cuando se carga la imagen
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      const img = imageRef.current;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const newRatio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(newRatio);
        
        // Guardar en caché global para reutilización
        if (previewUrl) {
          saveAspectRatioToCache(previewUrl, newRatio);
        }
      }
    }
  }, [previewUrl]);

  // Actualizar preview cuando cambia la imageUrl externa
  useEffect(() => {
    if (imageUrl && imageUrl !== previewUrl) {
      setPreviewUrl(imageUrl);
      
      // Intentar recuperar aspect ratio de caché
      const cachedRatio = getAspectRatioFromCache(imageUrl);
      if (cachedRatio) {
        setAspectRatio(cachedRatio);
      }
    }
  }, [imageUrl]);

  // Agregar soporte para teclado para ajuste fino
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Solo procesar si el contenedor o la imagen están enfocados
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement !== imageRef.current) {
        return;
      }
      
      const step = e.shiftKey ? 10 : 1; // Paso más grande con Shift
      const currentTop = parseSize(position.top);
      const currentLeft = parseSize(position.left);
      
      let newTop = currentTop;
      let newLeft = currentLeft;
      
      switch (e.key) {
        case 'ArrowUp':
          newTop = Math.max(0, currentTop - step);
          e.preventDefault();
          break;
        case 'ArrowDown':
          newTop = currentTop + step;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          newLeft = Math.max(0, currentLeft - step);
          e.preventDefault();
          break;
        case 'ArrowRight':
          newLeft = currentLeft + step;
          e.preventDefault();
          break;
        default:
          return; // Salir si no es una tecla de flecha
      }
      
      // Actualizar posición solo si cambió
      if (newTop !== currentTop || newLeft !== currentLeft) {
        const newPosition = {
          top: `${newTop}px`,
          left: `${newLeft}px`
        };
        
        setPosition(newPosition);
        
        // Notificar al componente padre
        if (onPositionChange) {
          onPositionChange(newPosition);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [position, onPositionChange]);

  // Manejar carga de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    // Crear URL temporal para vista previa
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Cargar la imagen para obtener dimensiones reales
    const img = new Image();
    img.onload = () => {
      // Calcular aspect ratio
      if (img.width > 0 && img.height > 0) {
        const newRatio = img.width / img.height;
        setAspectRatio(newRatio);
        
        // Guardar en caché global para reutilización en otros componentes
        saveAspectRatioToCache(objectUrl, newRatio);
        
        
        // Si mantenemos la relación de aspecto, ajustar altura en base al ancho actual
        if (keepAspectRatio) {
          const currentWidth = parseSize(size.width);
          const newHeight = Math.round(currentWidth / newRatio);
          setSize({
            ...size,
            height: `${newHeight}px`
          });
        }
      }
      
      setIsUploading(false);
      
      // Notificar al componente padre
      if (onImageChange) {
        // Enviar también el aspect ratio detectado
        onImageChange(file, objectUrl, newRatio);
      }
    };
    
    img.onerror = () => {
      console.error('Error al cargar la imagen');
      setIsUploading(false);
      setPreviewUrl(ImagePlaceholders.error);
    };
    
    img.src = objectUrl;
  };

  // Iniciar arrastre
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Guardar posición inicial del mouse
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Capturar eventos de movimiento y finalización
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Mover durante arrastre
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    // Calcular desplazamiento
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Actualizar posición inicial para el próximo movimiento
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Actualizar posición
    const currentTop = parseSize(position.top);
    const currentLeft = parseSize(position.left);
    
    const newPosition = {
      top: `${currentTop + deltaY}px`,
      left: `${currentLeft + deltaX}px`
    };
    
    setPosition(newPosition);
    
    // Notificar al componente padre
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  // Finalizar arrastre
  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Eliminar event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // Iniciar redimensionamiento
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    
    // Guardar posición inicial del mouse
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Capturar eventos de movimiento y finalización
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Redimensionar durante el arrastre
  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    // Calcular desplazamiento
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Actualizar posición inicial para el próximo movimiento
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Calcular nuevas dimensiones
    const currentWidth = parseSize(size.width);
    const currentHeight = parseSize(size.height);
    
    let newWidth = Math.max(20, currentWidth + deltaX); // Mínimo 20px
    let newHeight = Math.max(20, currentHeight + deltaY); // Mínimo 20px
    
    // Si mantenemos la relación de aspecto
    if (keepAspectRatio && aspectRatio) {
      // Determinar si el desplazamiento principal es horizontal o vertical
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Priorizar el cambio horizontal
        newHeight = Math.round(newWidth / aspectRatio);
      } else {
        // Priorizar el cambio vertical
        newWidth = Math.round(newHeight * aspectRatio);
      }
      
      // Asegurar tamaños mínimos
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
    }
    
    // Redondear a múltiplos de 2 para valores más limpios
    newWidth = Math.round(newWidth / 2) * 2;
    newHeight = Math.round(newHeight / 2) * 2;
    
    const newSize = {
      width: `${newWidth}px`,
      height: `${newHeight}px`
    };
    
    setSize(newSize);
    
    // Notificar al componente padre
    if (onSizeChange) {
      onSizeChange(newSize);
    }
  };

  // Finalizar redimensionamiento
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Eliminar event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Toggle mantener relación de aspecto
  const toggleAspectRatio = () => {
    setKeepAspectRatio(!keepAspectRatio);
    
    // Si activamos la relación de aspecto, ajustar la altura
    if (!keepAspectRatio) {
      const currentWidth = parseSize(size.width);
      const newHeight = Math.round(currentWidth / aspectRatio);
      
      const newSize = {
        ...size,
        height: `${newHeight}px`
      };
      
      setSize(newSize);
      
      // Notificar al componente padre
      if (onSizeChange) {
        onSizeChange(newSize);
      }
    }
  };

  return (
    <div className="image-editor">
      <div 
        className="relative focus-within:ring-2 focus-within:ring-blue-500" 
        ref={containerRef}
        tabIndex="0"
        style={{
          width: '100%',
          height: '250px',
          backgroundColor: '#f0f0f0',
          border: '1px dashed #ccc',
          borderRadius: '4px',
          overflow: 'hidden',
          outline: 'none' // Eliminar borde de enfoque predeterminado
        }}
      >
        {/* Imagen con controles */}
        <div 
          className="absolute"
          style={{
            ...position,
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 10
          }}
        >
          <div className={`relative ${isUploading ? 'opacity-50' : ''}`}>
            {/* Imagen */}
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Preview"
              style={{
                width: size.width,
                height: size.height,
                objectFit,
                display: 'block',
                userSelect: 'none'
              }}
              onMouseDown={handleDragStart}
              crossOrigin="anonymous"
            />
            
            {/* Manija de redimensionamiento */}
            <div 
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-tl-md cursor-nwse-resize flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
              onMouseDown={handleResizeStart}
              title="Redimensionar (mantener shift para conservar proporción)"
            >
              <Maximize2 size={16} className="text-white" />
            </div>
            
            {/* Indicador de aspect ratio */}
            {aspectRatio && (
              <div 
                className="absolute top-0 right-0 bg-blue-600 text-white py-0.5 px-2 text-xs font-mono rounded-bl"
                title="Relación de aspecto (ancho:alto)"
              >
                {aspectRatio.toFixed(2)}:1
              </div>
            )}
            
            {/* Indicador de tamaño actual */}
            <div 
              className="absolute top-0 left-0 bg-gray-800 bg-opacity-75 text-white py-0.5 px-2 text-xs font-mono rounded-br"
              title="Dimensiones actuales (ancho × alto)"
            >
              {parseSize(size.width)} × {parseSize(size.height)}
            </div>
          </div>
        </div>
        
        {/* Superposición para carga inicial */}
        {!imageUrl && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
            style={{ zIndex: 5, cursor: 'pointer' }}
          >
            <Upload size={24} className="text-gray-500 mb-2" />
            <span className="text-sm text-gray-500">Haz clic para subir imagen</span>
          </div>
        )}
        
        {/* Indicador de carga */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20" style={{ zIndex: 20 }}>
            <div className="p-3 bg-white rounded-lg shadow-lg">
              <div className="h-5 w-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Controles */}
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center gap-3 border-t pt-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            <Upload size={14} />
            <span>Subir imagen</span>
          </button>
          
          <button 
            type="button"
            onClick={toggleAspectRatio}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
              keepAspectRatio ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <Square size={14} />
            <span>Mantener proporción</span>
            {keepAspectRatio && <Check size={14} className="ml-1" />}
          </button>
          
          <div className="flex-1 text-right text-xs text-gray-500 hidden sm:block">
            {size.width} × {size.height}
          </div>
        </div>
        
        {/* Instrucciones de uso */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p><strong>Posicionamiento preciso:</strong></p>
          <ul className="list-disc list-inside ml-2 mt-1">
            <li><span className="font-medium">Arrastrar:</span> Mueve la imagen libremente</li>
            <li><span className="font-medium">Redimensionar:</span> Usa el control azul en la esquina</li>
            <li><span className="font-medium">Teclado:</span> Haz clic en la imagen y usa las flechas (con Shift para movimiento rápido)</li>
          </ul>
        </div>
      </div>
      
      {/* Input de archivo oculto */}
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageEditor;