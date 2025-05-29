import React, { useState, useCallback, useEffect } from 'react';
import { Upload, RotateCcw, Maximize2, AlignCenter, AlignLeft, AlignRight, Lock, Unlock, RotateCw, AlertTriangle } from 'lucide-react';
import ImageUploader from './ImageUploader';
import imageValidationUtils from '../../../utils/imageValidationUtils';

/**
 * Panel de propiedades especializado para imágenes dentro de contenedores
 */
const ImagePropertyPanel = ({
  component,
  deviceView,
  onUpdateStyle,
  onUpdateContent,
  onUpdatePosition,
  parentContainer,
  containerRef,
  rotationStep = 15 // Prop para el paso de rotación
}) => {
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0, aspectRatio: 1 });
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [imageIntegrity, setImageIntegrity] = useState({ isValid: true, errors: [] });

  // Obtener configuración actual
  const getCurrentStyle = useCallback(() => {
    return component.style?.[deviceView] || component.style?.desktop || {};
  }, [component.style, deviceView]);

  const getCurrentPosition = useCallback(() => {
    return component.position?.[deviceView] || component.position?.desktop || {};
  }, [component.position, deviceView]);

  // Obtener URL de imagen actual
  const getImageUrl = useCallback(() => {
    if (typeof component.content === 'string') {
      return component.content;
    }
    if (component.content?.texts?.en) {
      return component.content.texts.en;
    }
    if (component.content?.url) {
      return component.content.url;
    }
    return '';
  }, [component.content]);

  // Cargar información de la imagen, rotación actual y verificar integridad
  useEffect(() => {
    const url = getImageUrl();
    if (!url) {
      setImageIntegrity({ isValid: false, errors: ['No hay imagen configurada'] });
      return;
    }

    // Verificar integridad si es una referencia temporal
    if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
      const integrity = imageValidationUtils.verifyImageIntegrity(component.content);
      setImageIntegrity(integrity);
      
      if (!integrity.isValid) {
        console.warn(`⚠️ CONTAINER: Problema de integridad detectado:`, integrity.errors);
        
        // Intentar recuperación automática
        const recovery = imageValidationUtils.recoverLostImage(component.content, {
          usePlaceholder: true
        });
        
        if (recovery.success) {
          console.log(`🔄 CONTAINER: Imagen recuperada usando método: ${recovery.method}`);
          // Podrías actualizar la imagen aquí si es necesario
        }
      }
    } else {
      setImageIntegrity({ isValid: true, errors: [] });
    }

    const img = new Image();
    img.onload = () => {
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };
    img.onerror = () => {
      console.error(`❌ CONTAINER: Error cargando imagen: ${url}`);
      setImageIntegrity({ isValid: false, errors: ['Error cargando la imagen'] });
    };
    img.src = url;

    // Cargar rotación actual desde el estilo
    const currentStyle = getCurrentStyle();
    if (currentStyle.transform) {
      const rotateMatch = currentStyle.transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
      if (rotateMatch) {
        setRotation(parseFloat(rotateMatch[1]));
      }
    } else {
      setRotation(0);
    }
  }, [getImageUrl, component, deviceView, getCurrentStyle]);

  // Handlers para actualización de estilo
  const updateStyle = useCallback((updates) => {
    const currentStyle = getCurrentStyle();
    onUpdateStyle(component.id, {
      [deviceView]: { ...currentStyle, ...updates }
    });
  }, [component.id, deviceView, getCurrentStyle, onUpdateStyle]);

  const updatePosition = useCallback((updates) => {
    const currentPosition = getCurrentPosition();
    onUpdatePosition(component.id, { ...currentPosition, ...updates });
  }, [component.id, getCurrentPosition, onUpdatePosition]);

  // Funciones para manejar rotación
  const updateRotation = useCallback((degrees) => {
    const normalizedDegrees = degrees % 360;
    setRotation(normalizedDegrees);
    
    const currentStyle = getCurrentStyle();
    let transform = currentStyle.transform || '';
    
    // Remover rotación existente si hay una
    transform = transform.replace(/rotate\([^)]*\)/g, '').trim();
    
    // Agregar nueva rotación
    const newTransform = transform 
      ? `${transform} rotate(${normalizedDegrees}deg)` 
      : `rotate(${normalizedDegrees}deg)`;
    
    updateStyle({ transform: newTransform });
  }, [getCurrentStyle, updateStyle]);

  const rotateLeft = useCallback(() => {
    updateRotation(rotation - rotationStep);
  }, [rotation, rotationStep, updateRotation]);

  const rotateRight = useCallback(() => {
    updateRotation(rotation + rotationStep);
  }, [rotation, rotationStep, updateRotation]);

  const handleRotationInputChange = useCallback((value) => {
    const degrees = parseFloat(value) || 0;
    updateRotation(degrees);
  }, [updateRotation]);

  const resetRotation = useCallback(() => {
    updateRotation(0);
  }, [updateRotation]);

  // Conversión de unidades
  const convertToPixels = useCallback((value, dimension) => {
    if (!containerRef?.current) return parseFloat(value) || 0;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = dimension === 'width' ? containerRect.width : containerRect.height;
    
    if (typeof value === 'string' && value.endsWith('%')) {
      return (parseFloat(value) / 100) * containerSize;
    }
    return parseFloat(value) || 0;
  }, [containerRef]);

  // Manejar cambio de imagen con archivo, metadatos y validación
  const handleImageUpdate = useCallback(async (imageRef, file, aspectRatio) => {
    console.log(`🖼️ CONTAINER: Actualizando imagen en contenedor para componente ${component.id}:`, {
      imageRef,
      fileName: file?.name,
      fileSize: file?.size,
      aspectRatio
    });

    // Limpiar errores y warnings anteriores
    setValidationErrors([]);
    setValidationWarnings([]);

    // Validar imagen para contenedor
    if (file) {
      try {
        const containerInfo = {
          containerId: parentContainer?.id,
          componentId: component.id,
          validationOptions: {
            isInContainer: true
          }
        };

        const validation = await imageValidationUtils.validateImageInContainer(file, containerInfo);
        
        if (!validation.isValid) {
          console.warn(`⚠️ CONTAINER: Imagen inválida:`, validation.errors);
          setValidationErrors(validation.errors);
          setValidationWarnings(validation.warnings || []);
          return; // No continuar si la imagen es inválida
        }

        if (validation.warnings && validation.warnings.length > 0) {
          console.warn(`⚠️ CONTAINER: Advertencias de validación:`, validation.warnings);
          setValidationWarnings(validation.warnings);
        }

        console.log(`✅ CONTAINER: Imagen validada correctamente para contenedor`);
      } catch (error) {
        console.error(`❌ CONTAINER: Error validando imagen:`, error);
        setValidationErrors(['Error validando la imagen']);
        return;
      }
    }

    // Guardar archivo en almacenamiento global para persistencia
    if (file && imageRef) {
      window._imageFiles = window._imageFiles || {};
      window._imageFiles[imageRef] = file;
      console.log(`💾 CONTAINER: Archivo guardado en almacenamiento global: ${imageRef}`);
    }

    // Actualizar el aspect ratio en el estado si está disponible
    if (aspectRatio && aspectRatio > 0) {
      setImageInfo(prev => ({
        ...prev,
        aspectRatio
      }));
      console.log(`📏 CONTAINER: Aspect ratio actualizado: ${aspectRatio.toFixed(2)}:1`);
    }

    // Actualizar contenido con la referencia temporal
    onUpdateContent(component.id, imageRef);
    
    // Llamar al callback de actualización de imagen del editor si existe
    if (window.bannerEditor?.updateChildImageWithFile) {
      window.bannerEditor.updateChildImageWithFile(component.id, imageRef, file);
    }
  }, [component.id, onUpdateContent, parentContainer?.id]);

  // Manejar cambio de dimensiones
  const handleDimensionChange = useCallback((dimension, value) => {
    const currentStyle = getCurrentStyle();
    const updates = { [dimension]: value };

    // Mantener aspecto si está habilitado
    if (keepAspectRatio && imageInfo.aspectRatio) {
      if (dimension === 'width') {
        const widthPx = convertToPixels(value, 'width');
        const heightPx = widthPx / imageInfo.aspectRatio;
        updates.height = `${heightPx}px`;
      } else if (dimension === 'height') {
        const heightPx = convertToPixels(value, 'height');
        const widthPx = heightPx * imageInfo.aspectRatio;
        updates.width = `${widthPx}px`;
      }
    }

    updateStyle(updates);
  }, [keepAspectRatio, imageInfo.aspectRatio, convertToPixels, updateStyle]);

  // Toggle mantener aspect ratio
  const handleKeepAspectRatioChange = useCallback((checked) => {
    setKeepAspectRatio(checked);
    
    // Si se activa, ajustar automáticamente las dimensiones al aspect ratio actual
    if (checked && imageInfo.aspectRatio) {
      const currentStyle = getCurrentStyle();
      if (currentStyle.width) {
        const widthPx = convertToPixels(currentStyle.width, 'width');
        const heightPx = widthPx / imageInfo.aspectRatio;
        updateStyle({ height: `${heightPx}px` });
      }
    }
  }, [imageInfo.aspectRatio, getCurrentStyle, convertToPixels, updateStyle]);

  // Funciones de ajuste rápido
  const resetToOriginalSize = useCallback(() => {
    if (imageInfo.width && imageInfo.height) {
      updateStyle({
        width: `${imageInfo.width}px`,
        height: `${imageInfo.height}px`
      });
    }
  }, [imageInfo, updateStyle]);

  const fitToContainer = useCallback(() => {
    if (!containerRef?.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const maxWidth = containerRect.width * 0.8;
    const maxHeight = containerRect.height * 0.8;

    let newWidth = maxWidth;
    let newHeight = maxHeight;

    if (imageInfo.aspectRatio) {
      if (maxWidth / imageInfo.aspectRatio <= maxHeight) {
        newHeight = maxWidth / imageInfo.aspectRatio;
      } else {
        newWidth = maxHeight * imageInfo.aspectRatio;
      }
    }

    updateStyle({
      width: `${newWidth}px`,
      height: `${newHeight}px`
    });
  }, [containerRef, imageInfo.aspectRatio, updateStyle]);

  // Funciones de alineación
  const alignImage = useCallback((alignment) => {
    if (!containerRef?.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const currentStyle = getCurrentStyle();
    const imageWidth = convertToPixels(currentStyle.width || '100px', 'width');
    
    let left;
    switch (alignment) {
      case 'left':
        left = '5%';
        break;
      case 'center':
        left = `${((containerRect.width - imageWidth) / 2 / containerRect.width) * 100}%`;
        break;
      case 'right':
        left = `${((containerRect.width - imageWidth - (containerRect.width * 0.05)) / containerRect.width) * 100}%`;
        break;
      default:
        return;
    }

    updatePosition({ left });
  }, [containerRef, getCurrentStyle, convertToPixels, updatePosition]);

  const currentStyle = getCurrentStyle();
  const currentPosition = getCurrentPosition();

  return (
    <div className="space-y-4">
      {/* Header del panel */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Propiedades de Imagen
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateStyle({ locked: !component.locked })}
            className={`p-2 rounded-md transition-colors ${
              component.locked 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={component.locked ? 'Desbloquear' : 'Bloquear'}
          >
            {component.locked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </div>
      </div>

      {/* Errores de validación */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">Errores de validación</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Advertencias de validación */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Advertencias</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Problemas de integridad */}
      {!imageIntegrity.isValid && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-orange-800 mb-1">Problemas de integridad</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {imageIntegrity.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Información de la imagen */}
      {imageInfo.width > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-700">
            <strong>Imagen original:</strong> {imageInfo.width} × {imageInfo.height}px
            <br />
            <strong>Proporción:</strong> {imageInfo.aspectRatio.toFixed(2)}:1
            <br />
            <strong>En contenedor:</strong> {parentContainer?.id ? `Sí (${parentContainer.id})` : 'No'}
          </div>
        </div>
      )}

      {/* Subir nueva imagen */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Upload size={16} />
          Cambiar Imagen
        </h4>
        <ImageUploader
          componentId={component.id}
          currentImage={getImageUrl()}
          onImageUpdate={handleImageUpdate}
          className="w-full"
        />
      </div>

      {/* Rotación */}
      <div className="border rounded-lg p-4">
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
      <div className="border rounded-lg p-4">
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
          {keepAspectRatio && imageInfo.aspectRatio && (
            <span className="text-xs text-blue-600 ml-2">
              ({imageInfo.aspectRatio.toFixed(2)}:1)
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
              type="text"
              value={currentStyle.width || '100px'}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="100px"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto
            </label>
            <input
              type="text"
              value={currentStyle.height || '100px'}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="100px"
            />
          </div>
        </div>

        {/* Botones de ajuste rápido */}
        <div className="flex gap-2">
          <button
            onClick={resetToOriginalSize}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            title="Tamaño original"
          >
            <RotateCcw size={14} />
            Original
          </button>
          <button
            onClick={fitToContainer}
            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
            title="Ajustar al contenedor"
          >
            <Maximize2 size={14} />
            Ajustar
          </button>
        </div>
      </div>

      {/* Posición y alineación */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Posición</h4>
        
        {/* Alineación rápida */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alineación horizontal
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => alignImage('left')}
              className="flex-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center"
              title="Alinear a la izquierda"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => alignImage('center')}
              className="flex-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center"
              title="Centrar"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => alignImage('right')}
              className="flex-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center"
              title="Alinear a la derecha"
            >
              <AlignRight size={16} />
            </button>
          </div>
        </div>

        {/* Posición manual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Izquierda
            </label>
            <input
              type="text"
              value={currentPosition.left || '0%'}
              onChange={(e) => updatePosition({ left: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0%"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arriba
            </label>
            <input
              type="text"
              value={currentPosition.top || '0%'}
              onChange={(e) => updatePosition({ top: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0%"
            />
          </div>
        </div>
      </div>

      {/* Ajuste de imagen */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Ajuste de Imagen</h4>
        <select
          value={currentStyle.objectFit || 'contain'}
          onChange={(e) => updateStyle({ objectFit: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="contain">Ajustar (contain)</option>
          <option value="cover">Cubrir (cover)</option>
          <option value="fill">Rellenar (fill)</option>
          <option value="none">Sin ajuste (none)</option>
          <option value="scale-down">Reducir (scale-down)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Determina cómo la imagen se ajusta dentro del contenedor
        </p>
      </div>

      {/* Bordes y efectos */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Bordes y Efectos</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radio del borde
            </label>
            <input
              type="text"
              value={currentStyle.borderRadius || '0px'}
              onChange={(e) => updateStyle({ borderRadius: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0px"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sombra (box-shadow)
            </label>
            <input
              type="text"
              value={currentStyle.boxShadow || ''}
              onChange={(e) => updateStyle({ boxShadow: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0 2px 4px rgba(0,0,0,0.1)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opacidad
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentStyle.opacity || 1}
              onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {Math.round((currentStyle.opacity || 1) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Z-Index */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Capa (Z-Index)</h4>
        <input
          type="number"
          value={currentStyle.zIndex || 1}
          onChange={(e) => updateStyle({ zIndex: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          min="1"
          max="1000"
        />
        <p className="text-xs text-gray-500 mt-1">
          Orden de superposición dentro del contenedor
        </p>
      </div>
    </div>
  );
};

export default ImagePropertyPanel;