import React, { useState } from 'react';
import { Upload, ChevronLeft, ChevronRight, X } from 'lucide-react';

const ImageEditor = ({ 
  images = [], 
  onUpdateImage, 
  onRemoveImage, 
  onAddImage 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const currentImage = images[currentImageIndex];

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (currentImage) {
          onUpdateImage(currentImageIndex, {
            ...currentImage,
            src: e.target.result,
            file: file // Pass the file object
          });
        } else {
          onAddImage({
            src: e.target.result,
            position: 'center',
            size: 'auto',
            file: file
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePositionChange = (position) => {
    if (currentImage) {
      onUpdateImage(currentImageIndex, {
        ...currentImage,
        position
      });
    }
  };

  const handleSizeChange = (size) => {
    if (currentImage) {
      onUpdateImage(currentImageIndex, {
        ...currentImage,
        size
      });
    }
  };

  const handleRemoveCurrentImage = () => {
    if (images.length > 0) {
      onRemoveImage(currentImageIndex);
      if (currentImageIndex >= images.length - 1) {
        setCurrentImageIndex(Math.max(0, images.length - 2));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Imágenes</h3>
        
        {images.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevImage}
              className="p-1 rounded hover:bg-gray-100"
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs text-gray-500">
              {currentImageIndex + 1} de {images.length}
            </span>
            
            <button
              onClick={handleNextImage}
              className="p-1 rounded hover:bg-gray-100"
              type="button"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview de imagen actual */}
      {currentImage && (
        <div className="relative bg-gray-50 rounded-lg p-4 border-2 border-dashed border-blue-300">
          <button
            onClick={handleRemoveCurrentImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
          
          <img
            src={currentImage.src}
            alt="Preview"
            className="w-full h-32 object-cover rounded"
          />
        </div>
      )}

      {/* Upload de imagen */}
      <div className="space-y-3">
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center">
            <Upload className="w-6 h-6 mb-1 text-gray-500" />
            <p className="text-xs text-gray-500">
              {currentImage ? 'Cambiar imagen' : 'Subir imagen'}
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {/* Controles de imagen */}
      {currentImage && (
        <div className="space-y-3">
          {/* Posición */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Posición
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'left', label: 'Izq' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Der' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handlePositionChange(value)}
                  className={`px-2 py-1 text-xs rounded ${
                    currentImage.position === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Tamaño
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'small', label: 'Pequeño' },
                { value: 'auto', label: 'Auto' },
                { value: 'large', label: 'Grande' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSizeChange(value)}
                  className={`px-2 py-1 text-xs rounded ${
                    currentImage.size === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botón para agregar nueva imagen */}
      <button
        onClick={() => onAddImage({
          src: '',
          position: 'center',
          size: 'auto'
        })}
        className="w-full px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        type="button"
      >
        + Agregar otra imagen
      </button>
    </div>
  );
};

export default ImageEditor;