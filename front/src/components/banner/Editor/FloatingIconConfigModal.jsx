import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

const FloatingIconConfigModal = ({ 
  isOpen, 
  onClose, 
  position,
  onPositionChange,
  color,
  onColorChange,
  backgroundColor,
  onBackgroundColorChange,
  size,
  onSizeChange,
  onSave
}) => {
  // Estados locales para el modal
  const [localEnabled, setLocalEnabled] = useState(true);
  const [localPosition, setLocalPosition] = useState(position || 'bottom-right');
  const [localColor, setLocalColor] = useState(color || '#007bff');
  const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor || 'transparent');
  const [localSize, setLocalSize] = useState(size || 40);

  // Actualizar estados locales cuando cambian las props
  useEffect(() => {
    console.log('🎯 [FloatingIconModal] Props recibidas:', { position, color, backgroundColor, size });
    setLocalPosition(position || 'bottom-right');
    setLocalColor(color || '#007bff');
    setLocalBackgroundColor(backgroundColor || 'transparent');
    setLocalSize(size || 40);
  }, [position, color, backgroundColor, size]);

  // Log cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 [FloatingIconModal] Modal abierto con estados locales:', {
        localPosition,
        localColor,
        localBackgroundColor,
        localSize
      });
    }
  }, [isOpen, localPosition, localColor, localBackgroundColor, localSize]);

  if (!isOpen) return null;

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const iconUrl = `${baseUrl}/icon.ico`;

  const handleSave = () => {
    // Crear la configuración completa con los valores locales
    const newConfig = {
      position: localPosition,
      color: localColor,
      backgroundColor: localBackgroundColor,
      size: localSize
    };
    
    console.log('🎯 [FloatingIconModal] Guardando configuración:', newConfig);
    
    // Actualizar los valores en el padre primero
    onPositionChange(localPosition);
    onColorChange(localColor);
    onBackgroundColorChange(localBackgroundColor);
    onSizeChange(localSize);
    
    // Llamar a onSave con la configuración
    if (onSave) {
      console.log('🎯 [FloatingIconModal] Llamando onSave con:', newConfig);
      onSave(newConfig);
    }
    
    // Cerrar el modal
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Configuración del Icono Flotante</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Nota sobre el icono flotante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              El icono flotante aparece cuando el banner de cookies está cerrado, permitiendo a los usuarios reabrir las preferencias.
            </p>
          </div>

          {(
            <>
              {/* Posición */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Posición del icono
                </label>
                <select
                  value={localPosition}
                  onChange={(e) => setLocalPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom-right">Abajo Derecha</option>
                  <option value="bottom-left">Abajo Izquierda</option>
                  <option value="top-right">Arriba Derecha</option>
                  <option value="top-left">Arriba Izquierda</option>
                </select>
              </div>

              {/* Color del icono */}
              <div className="space-y-2">
                <label htmlFor="floating-icon-color" className="block text-sm font-medium text-gray-700">
                  Color del icono
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="floating-icon-color"
                    value={localColor}
                    onChange={(e) => setLocalColor(e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localColor}
                    onChange={(e) => setLocalColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#007bff"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El color solo se aplicará cuando el icono sea un SVG. Actualmente se usa un PNG.
                </p>
              </div>

              {/* Color de fondo */}
              <div className="space-y-2">
                <label htmlFor="floating-icon-bg-color" className="block text-sm font-medium text-gray-700">
                  Color de fondo del icono
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="floating-icon-bg-color"
                    value={localBackgroundColor === 'transparent' ? '#ffffff' : localBackgroundColor}
                    onChange={(e) => setLocalBackgroundColor(e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    disabled={localBackgroundColor === 'transparent'}
                  />
                  <input
                    type="text"
                    value={localBackgroundColor}
                    onChange={(e) => setLocalBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="transparent, #ffffff, rgba(255,0,0,0.5)"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="transparent-bg"
                    checked={localBackgroundColor === 'transparent'}
                    onChange={(e) => setLocalBackgroundColor(e.target.checked ? 'transparent' : '#ffffff')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="transparent-bg" className="text-sm text-gray-700">
                    Sin fondo (transparente)
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Usa 'transparent' para sin fondo, o cualquier color CSS válido.
                </p>
              </div>

              {/* Tamaño */}
              <div className="space-y-2">
                <label htmlFor="floating-icon-size" className="block text-sm font-medium text-gray-700">
                  Tamaño del icono (píxeles)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    id="floating-icon-size"
                    min="20"
                    max="150"
                    step="5"
                    value={localSize}
                    onChange={(e) => setLocalSize(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="20"
                    max="150"
                    step="5"
                    value={localSize}
                    onChange={(e) => setLocalSize(parseInt(e.target.value) || 40)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">px</span>
                </div>
                <p className="text-xs text-gray-500">
                  Tamaño recomendado: 30-60 píxeles.
                </p>
              </div>

              {/* Vista previa interactiva */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Vista previa con imagen real
                </label>
                <div className="relative h-40 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                  <div 
                    className="absolute flex items-center justify-center transition-all duration-300 border-2 border-blue-200"
                    style={{
                      ...(localPosition === 'bottom-right' && { bottom: '16px', right: '16px' }),
                      ...(localPosition === 'bottom-left' && { bottom: '16px', left: '16px' }),
                      ...(localPosition === 'top-right' && { top: '16px', right: '16px' }),
                      ...(localPosition === 'top-left' && { top: '16px', left: '16px' }),
                      width: `${localSize}px`,
                      height: `${localSize}px`,
                      backgroundColor: localBackgroundColor === 'transparent' ? 'transparent' : localBackgroundColor,
                      borderRadius: `${Math.round(localSize * 0.2)}px`,
                      boxShadow: localBackgroundColor === 'transparent' ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                      border: localBackgroundColor === 'transparent' ? '2px dashed #ccc' : 'none'
                    }}
                  >
                    <img 
                      src={iconUrl}
                      alt="Cookie Icon"
                      style={{
                        width: `${Math.round(localSize * 0.8)}px`,
                        height: `${Math.round(localSize * 0.8)}px`,
                        borderRadius: `${Math.round(localSize * 0.16)}px`
                      }}
                      onError={(e) => {
                        // Fallback si no se puede cargar la imagen
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '🍪';
                        e.target.parentNode.style.fontSize = `${Math.round(localSize * 0.4)}px`;
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                    Área de la página web
                  </div>
                  <div className="absolute top-2 left-2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
                    {localSize}px • {localPosition.replace('-', ' ')} • {localBackgroundColor === 'transparent' ? 'Sin fondo' : 'Con fondo'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingIconConfigModal;