import React, { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { imageAspectRatioCache, saveAspectRatioToCache } from '../../../utils/imageProcessing';
import imageMemoryManager from '../../../utils/imageMemoryManager';

const ImageUploader = ({ componentId, currentImage, onImageUpdate, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentImage || '');
  const [aspectRatio, setAspectRatio] = useState(null);
  const fileInputRef = useRef(null);
  
  // Actualizar preview cuando cambia la imagen actual
  useEffect(() => {
    if (currentImage) {
      setPreview(currentImage);
    }
  }, [currentImage]);
  
  // Detectar y calcular el aspect ratio de la imagen al cargar
  const handleImageLoad = (e) => {
    if (!e.target) return;
    
    const img = e.target;
    if (img.naturalWidth && img.naturalHeight && img.naturalHeight > 0) {
      // Calcular aspect ratio
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ratio);
      
      // Guardar en caché global para facilitar uso posterior
      saveAspectRatioToCache(img.src, ratio);
      
    }
  };
  
  // Maneja la subida del archivo
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }
    
    // Validar tamaño del archivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    // Crear un identificador único y más simple para este archivo
    const timestamp = Date.now();
    
    // Nombre explícito para facilitar la asociación
    // IMPORTANTE: El ID del componente al inicio para búsqueda directa
    const imageRef = `__IMAGE_REF__${componentId}_${timestamp}`;
    
    // Crear vista previa para mostrar localmente
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setPreview(base64);
      setLoading(false);
      
      // Pre-cargar imagen para obtener sus dimensiones reales
      const img = new Image();
      img.onload = () => {
        // Calcular y guardar el aspect ratio
        if (img.width > 0 && img.height > 0) {
          const ratio = img.width / img.height;
          setAspectRatio(ratio);
          
          // Guardar en caché global usando la URL final y también la referencia temporal
          saveAspectRatioToCache(base64, ratio);
          saveAspectRatioToCache(imageRef, ratio);
          
        }
      };
      img.src = base64;
      
      // Renombrar el archivo para hacer más clara la asociación con el componente
      // NOTA: Ponemos el ID del componente al principio para facilitar la búsqueda por startsWith
      // Usar un formato de nombre predecible y simplificado para mejor identificación
      const renamedFile = new File([file], `IMAGE_REF_${componentId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, {
        type: file.type,
        lastModified: file.lastModified
      });
      
      
      // IMPORTANTE: Usar el gestor optimizado de memoria
      imageMemoryManager.storeTempFile(imageRef, renamedFile, {
        componentId,
        aspectRatio,
        timestamp: Date.now(),
        originalName: file.name
      });
      
      // Mantener compatibilidad con sistema anterior
      window._imageFiles = window._imageFiles || {};
      window._imageFiles[imageRef] = renamedFile;
      
      // También guardamos en dataTransfer para mayor compatibilidad
      if (window.DataTransfer && window.Blob) {
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(renamedFile);
          if (fileInputRef.current) {
            fileInputRef.current._tempFile = renamedFile;
            fileInputRef.current._imageFile = renamedFile;
            fileInputRef.current._tempFileRef = imageRef;
            // Guardar el aspect ratio en el input para fácil acceso
            fileInputRef.current._aspectRatio = aspectRatio;
          }
        } catch (err) {
          console.warn("No se pudo guardar en dataTransfer:", err);
        }
      }
      
      // Notificar al padre con el archivo real y el aspect ratio
      if (onImageUpdate) {
        // Enviar el archivo renombrado para asegurar la asociación correcta
        onImageUpdate(imageRef, renamedFile, aspectRatio);
        
        // Limpiar el input pero mantener referencia
        if (fileInputRef.current) {
          const fileRef = fileInputRef.current;
          fileRef.value = '';
          fileRef._tempFileRef = imageRef;
          fileRef._tempFile = renamedFile;
          fileRef._componentId = componentId; // Agregar ID de componente explícitamente
          fileRef._aspectRatio = aspectRatio; // Guardar aspect ratio
        }
        
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };
  
  // Función para pegar una imagen desde el portapapeles
  const handlePaste = (e) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        
        // Crear un objeto que emule el evento de carga de archivo
        const dummyEvent = {
          target: {
            files: [file]
          }
        };
        
        handleFileUpload(dummyEvent);
        break;
      }
    }
  };
  
  return (
    <div 
      className="w-full"
      onPaste={handlePaste}
      tabIndex="0"
    >
      {/* Input de archivo oculto */}
      <input
        type="file"
        id={`file-upload-${componentId}`}
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={disabled || loading}
      />
      
      {/* Botón para subir y vista previa */}
      <div className="space-y-2">
        <label 
          htmlFor={`file-upload-${componentId}`}
          className={`flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded 
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 border-blue-300'}`}
        >
          {loading ? (
            <RefreshCw className="animate-spin w-5 h-5 text-blue-500" />
          ) : (
            <Upload className="w-5 h-5 text-blue-500" />
          )}
          <span className="text-sm text-gray-600">
            {loading ? 'Procesando...' : 'Seleccionar imagen o pegar desde portapapeles'}
          </span>
        </label>
        
        {/* Mostrar error si existe */}
        {error && (
          <div className="text-xs text-red-500 p-1">
            {error}
          </div>
        )}
        
        {/* Vista previa de la imagen */}
        {preview && (
          <div className="mt-2 border rounded p-2 bg-gray-50 relative">
            <img 
              src={preview} 
              alt="Vista previa" 
              className="max-h-40 mx-auto object-contain" 
              onError={() => setError('Error al cargar la imagen')}
              onLoad={handleImageLoad}
            />
            
            {/* Indicador de aspect ratio */}
            {aspectRatio && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white py-0.5 px-1 text-xs font-mono rounded-bl">
                {aspectRatio.toFixed(2)}:1
              </div>
            )}
          </div>
        )}
        
        {/* Información adicional */}
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 mt-1">
            Formatos soportados: JPG, PNG, GIF, SVG. Máximo 5MB.
          </p>
          
          {/* Mostrar aspect ratio detectado */}
          {aspectRatio && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Relación de aspecto: {aspectRatio.toFixed(2)}:1
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;