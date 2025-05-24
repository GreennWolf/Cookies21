import React, { useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

// Componente de prueba para verificar las nuevas funcionalidades
const ImagePropertyPanelTest = () => {
  const [rotation, setRotation] = useState(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [rotationStep, setRotationStep] = useState(15);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(200);
  const aspectRatio = 1.5; // 300/200

  const updateRotation = (degrees) => {
    const normalizedDegrees = degrees % 360;
    setRotation(normalizedDegrees);
  };

  const rotateLeft = () => {
    updateRotation(rotation - rotationStep);
  };

  const rotateRight = () => {
    updateRotation(rotation + rotationStep);
  };

  const handleRotationInputChange = (value) => {
    const degrees = parseFloat(value) || 0;
    updateRotation(degrees);
  };

  const resetRotation = () => {
    updateRotation(0);
  };

  const handleKeepAspectRatioChange = (checked) => {
    setKeepAspectRatio(checked);
  };

  const handleWidthChange = (newWidth) => {
    setWidth(newWidth);
    if (keepAspectRatio) {
      setHeight(newWidth / aspectRatio);
    }
  };

  const handleHeightChange = (newHeight) => {
    setHeight(newHeight);
    if (keepAspectRatio) {
      setWidth(newHeight * aspectRatio);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">🧪 Test - ImagePropertyPanel</h2>
      
      {/* Rotación */}
      <div className="border rounded-lg p-4 mb-4">
        <h4 className="font-medium mb-3">Rotación</h4>
        
        {/* Control manual de grados */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grados
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rotation}
              onChange={(e) => handleRotationInputChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0"
              min="-360"
              max="360"
              step="1"
            />
            <span className="text-sm text-gray-500">°</span>
          </div>
        </div>

        {/* Botones de rotación */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={rotateLeft}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            title={`Rotar ${rotationStep}° a la izquierda`}
          >
            <RotateCcw size={14} />
            -{rotationStep}°
          </button>
          <button
            onClick={rotateRight}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            title={`Rotar ${rotationStep}° a la derecha`}
          >
            <RotateCw size={14} />
            +{rotationStep}°
          </button>
        </div>

        {/* Paso de rotación */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paso de rotación
          </label>
          <select 
            value={rotationStep}
            onChange={(e) => setRotationStep(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1">1°</option>
            <option value="5">5°</option>
            <option value="15">15°</option>
            <option value="30">30°</option>
            <option value="45">45°</option>
            <option value="90">90°</option>
          </select>
        </div>

        {/* Botón de reset */}
        <button
          onClick={resetRotation}
          className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
          title="Resetear rotación a 0°"
        >
          <RotateCcw size={14} />
          Resetear Rotación
        </button>
      </div>

      {/* Dimensiones */}
      <div className="border rounded-lg p-4 mb-4">
        <h4 className="font-medium mb-3">Dimensiones</h4>
        
        {/* Mantener proporción */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="keepAspectRatio"
            checked={keepAspectRatio}
            onChange={(e) => handleKeepAspectRatioChange(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="keepAspectRatio" className="text-sm text-gray-700">
            Mantener aspect ratio
          </label>
          {keepAspectRatio && (
            <span className="text-xs text-blue-600 ml-2">
              ({aspectRatio.toFixed(2)}:1)
            </span>
          )}
        </div>

        {/* Controles de ancho y alto */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho
            </label>
            <input
              type="number"
              value={Math.round(width)}
              onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto
            </label>
            <input
              type="number"
              value={Math.round(height)}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="200"
            />
          </div>
        </div>
      </div>

      {/* Vista previa */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Vista Previa</h4>
        <div className="flex justify-center items-center h-32 bg-gray-50 rounded">
          <div 
            className="bg-blue-500 flex items-center justify-center text-white text-xs"
            style={{
              width: Math.min(width / 3, 80) + 'px',
              height: Math.min(height / 3, 80) + 'px',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease'
            }}
          >
            Imagen
            <br />
            {rotation}°
          </div>
        </div>
        <div className="text-xs text-gray-500 text-center mt-2">
          Dimensiones: {Math.round(width)} × {Math.round(height)}px
          <br />
          Rotación: {rotation}°
          <br />
          Aspect Ratio: {keepAspectRatio ? 'Activado' : 'Desactivado'}
        </div>
      </div>
    </div>
  );
};

export default ImagePropertyPanelTest;