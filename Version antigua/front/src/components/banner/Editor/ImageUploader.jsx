import React, { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';

const ImageUploader = ({ componentId, currentImage, onImageUpdate, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentImage || '');
  const fileInputRef = useRef(null);
  
  // Actualizar preview cuando cambia la imagen actual
  useEffect(() => {
    if (currentImage) {
      setPreview(currentImage);
    }
  }, [currentImage]);
  
  // Maneja la subida del archivo
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    // Crear un marcador único para este archivo
    const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageRef = `__IMAGE_REF__${imageId}`;
    
    // Crear vista previa para mostrar localmente
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setPreview(base64);
      setLoading(false);
      
      // Log para depuración
      console.log(`📸 Archivo seleccionado:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // IMPORTANTE: Guardar en almacenamiento global
      window._imageFiles = window._imageFiles || {};
      window._imageFiles[imageRef] = file;
      console.log(`✅ Archivo guardado globalmente como window._imageFiles['${imageRef}']`);
      
      // Notificar al padre
      if (onImageUpdate) {
        onImageUpdate(imageRef, file);
        
        // Limpiar el input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
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
          <div className="mt-2 border rounded p-2 bg-gray-50">
            <img 
              src={preview} 
              alt="Vista previa" 
              className="max-h-40 mx-auto object-contain" 
              onError={() => setError('Error al cargar la imagen')}
            />
          </div>
        )}
        
        {/* Información adicional */}
        <p className="text-xs text-gray-500 mt-1">
          Formatos soportados: JPG, PNG, GIF, SVG. Máximo 5MB.
        </p>
      </div>
    </div>
  );
};

export default ImageUploader;