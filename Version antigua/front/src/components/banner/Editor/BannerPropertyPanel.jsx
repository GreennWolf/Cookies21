import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Type, Box, Move, X, RefreshCw } from 'lucide-react';
import ComponentSizeInfo from './ComponentSizeInfo';
import PositionUtils from '../../../utils/positionUtils';
import ImageUploader from './ImageUploader';

// Estilos para el scrollbar
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
  }
`;

function BannerPropertyPanel({ 
  component, 
  deviceView, 
  updateStyle, 
  onUpdateContent, 
  onUpdatePosition, 
  onClose, 
  onAlignElements,
  embedded = false // Prop para indicar si está integrado en el sidebar
}) {
  // Estado para estilos
  const [localStyle, setLocalStyle] = useState({});
  // Estado para el contenido
  const [localContent, setLocalContent] = useState('');
  // Estado dedicado para la posición (siempre en %)
  const [localPosition, setLocalPosition] = useState({ top: '0%', left: '0%' });
  const [activeTab, setActiveTab] = useState('content');
  // Estados para controlar imágenes
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Función centralizada para obtener dimensiones reales
  const getDimensions = useCallback(() => {
    try {
      const componentEl = document.querySelector(`[data-id="${component.id}"]`);
      if (!componentEl) {
        console.warn(`No se encontró elemento con ID ${component.id}`);
        return null;
      }
      
      const containerEl = componentEl.closest('.banner-container');
      if (!containerEl) {
        console.warn('No se encontró el contenedor .banner-container');
        return null;
      }
      
      // Guardar estilos originales
      const originalStyles = {
        width: componentEl.style.width,
        height: componentEl.style.height,
        maxWidth: componentEl.style.maxWidth,
        minWidth: componentEl.style.minWidth
      };
      
      // Obtener dimensiones reales
      const compRect = componentEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      
      // Calcular dimensiones con precisión
      const widthPx = compRect.width;
      const heightPx = compRect.height;
      const widthPercent = PositionUtils.pixelsToPercent(widthPx, containerRect.width);
      const heightPercent = PositionUtils.pixelsToPercent(heightPx, containerRect.height);
      
      // Restaurar estilos originales
      Object.entries(originalStyles).forEach(([prop, value]) => {
        if (value) componentEl.style[prop] = value;
      });
      
      return {
        componentEl,
        containerEl,
        compRect,
        containerRect,
        widthPx,
        heightPx,
        widthPercent,
        heightPercent,
        originalStyles
      };
    } catch (error) {
      console.error("Error al obtener dimensiones:", error);
      return null;
    }
  }, [component.id]);

  // Actualizar estados locales cuando cambia el componente o dispositivo
  useEffect(() => {
    // Obtener estilo actual para el dispositivo seleccionado
    const currentStyle = component.style?.[deviceView] || {};
    setLocalStyle(currentStyle);
    
    // Extraer y establecer contenido textual
    let textContent = '';
    if (typeof component.content === 'string') {
      textContent = component.content;
    } else if (component.content?.texts?.en) {
      textContent = component.content.texts.en;
    } else if (component.content?.text) {
      textContent = component.content.text;
    }
    setLocalContent(textContent);
    
    // Procesar posición para el dispositivo actual
    const position = component.position?.[deviceView] || {};
    const processedPosition = {
      top: ensurePercentage(position.top || '0%'),
      left: ensurePercentage(position.left || '0%')
    };
    
    setLocalPosition(processedPosition);
    
    // Reset de estados de imagen
    setImageError(false);
    setImageLoaded(false);
  }, [component, deviceView]);

  // Función para asegurar que los valores están en porcentajes
  const ensurePercentage = (value) => {
    if (!value) return '0%';
    
    // Si ya es porcentaje, devolverlo tal cual
    if (value.endsWith('%')) return value;
    
    // Si es píxeles, convertir (asumiendo un contenedor de 1000px para simplificar)
    if (value.endsWith('px')) {
      const pixels = parseFloat(value);
      return `${(pixels / 10)}%`;
    }
    
    // Cualquier otro valor, asumimos que es un número y lo convertimos a porcentaje
    return `${parseFloat(value) || 0}%`;
  };

  // Manejador de cambios de estilo optimizado
  const handleStyleChange = (property, value) => {
    // Actualizar estado local
    const newStyle = { ...localStyle, [property]: value };
    setLocalStyle(newStyle);
    
    // Enviar cambios al componente padre - solamente para el dispositivo actual
    updateStyle(newStyle);
  };

  // Manejador de cambios de contenido
  const handleContentChange = (value) => {
    setLocalContent(value);
    
    // Actualizar contenido manteniendo la estructura
    let updatedContent;
    if (typeof component.content === 'string') {
      updatedContent = value;
    } else if (component.content && typeof component.content === 'object') {
      // Mantener estructura pero actualizar el texto en inglés
      updatedContent = {
        ...component.content,
        texts: {
          ...(component.content.texts || {}),
          en: value
        }
      };
      
      // Si también tiene propiedad text, actualizarla
      if ('text' in component.content) {
        updatedContent.text = value;
      }
    } else {
      // Si no tiene estructura definida, crear una nueva
      updatedContent = {
        texts: { en: value },
        translatable: true
      };
    }
    
    onUpdateContent(updatedContent);
  };

  // Manejador mejorado de cambios de posición (siempre en %)
  const handlePositionChange = (property, value, unit = '%') => {
    // Evitar procesamiento si no hay valor
    if (value === null || value === undefined) return;
    
    // Obtener dimensiones
    const dims = getDimensions();
    if (!dims) return;
    
    // Parsear el valor numérico
    let numValue = parseFloat(value);
    
    // Si no es un número válido, usar 0
    if (isNaN(numValue)) {
      numValue = 0;
    }
    
    // Determinar si es posición horizontal o vertical
    const isHorizontal = property === 'left';
    
    // Calcular posición segura según la propiedad
    const containerSize = isHorizontal ? dims.containerRect.width : dims.containerRect.height;
    const componentSize = isHorizontal ? dims.widthPx : dims.heightPx;
    
    // Si es porcentaje, convertir a píxeles para cálculos precisos
    let pixelValue = unit === '%' 
      ? PositionUtils.percentToPixels(numValue, containerSize) 
      : numValue;
    
    // Calcular valor seguro en píxeles (evita desbordamiento)
    const safePixelValue = PositionUtils.calculateSafePosition({
      value: pixelValue,
      componentSize,
      containerSize,
      isRightOrBottom: false // Siempre usamos left/top
    });
    
    // Convertir de vuelta a la unidad solicitada
    let safeValue = unit === '%' 
      ? PositionUtils.pixelsToPercent(safePixelValue, containerSize) 
      : safePixelValue;
    
    // Formatear valor con la unidad
    const formattedValue = PositionUtils.formatWithUnit(safeValue, unit);
    
    // Actualizar estado local
    const newPos = { ...localPosition, [property]: formattedValue };
    setLocalPosition(newPos);
    
    // Limpiar propiedades que pueden interferir
    const cleanupProps = PositionUtils.getCleanupProps();
    Object.entries(cleanupProps).forEach(([prop, value]) => {
      handleStyleChange(prop, value);
    });
    
    // Enviar cambios al componente padre
    if (typeof onUpdatePosition === 'function') {
      onUpdatePosition(newPos);
    } else {
      console.warn('No hay función onUpdatePosition disponible');
    }
  };

  // Función mejorada para cambiar entre unidades
  const handleUnitChange = (property, value, oldUnit, newUnit) => {
    try {
      // Parsear el valor con precisión
      const numValue = parseFloat(value) || 0;
      
      // Obtener dimensiones reales
      const dims = getDimensions();
      if (!dims) return;
      
      // Si cambiamos de px a %, convertir con precisión
      if (oldUnit === 'px' && newUnit === '%') {
        let percentValue;
        
        // Conversión precisa basada en el tamaño real del contenedor
        if (property === 'left') {
          percentValue = (numValue / dims.containerRect.width) * 100;
          console.log(`Convirtiendo ${property} de ${numValue}px a ${percentValue.toFixed(2)}%`);
        } else if (property === 'top') {
          percentValue = (numValue / dims.containerRect.height) * 100;
          console.log(`Convirtiendo ${property} de ${numValue}px a ${percentValue.toFixed(2)}%`);
        }
        
        handlePositionChange(property, percentValue.toFixed(2), '%');
      }
      // Si cambiamos de % a px, convertir con precisión
      else if (oldUnit === '%' && newUnit === 'px') {
        let pxValue;
        
        // Conversión precisa basada en el tamaño real del contenedor
        if (property === 'left') {
          pxValue = (numValue * dims.containerRect.width) / 100;
          console.log(`Convirtiendo ${property} de ${numValue}% a ${pxValue.toFixed(0)}px`);
        } else if (property === 'top') {
          pxValue = (numValue * dims.containerRect.height) / 100;
          console.log(`Convirtiendo ${property} de ${numValue}% a ${pxValue.toFixed(0)}px`);
        }
        
        handlePositionChange(property, pxValue.toFixed(0), 'px');
      }
      // Si no cambia la unidad, simplemente actualizar el valor con precisión
      else {
        console.log(`Manteniendo ${property} en ${numValue}${newUnit}`);
        handlePositionChange(property, numValue, newUnit);
      }
    } catch (error) {
      console.error(`Error al cambiar unidad: ${error.message}`);
      // Si hay error, al menos actualizar con el valor actual
      handlePositionChange(property, numValue, newUnit);
    }
  };

  // Versión corregida para posiciones rápidas
  const handleQuickPosition = (positionCode) => {
    try {
      // Usar la función getDimensions
      const dims = getDimensions();
      if (!dims) return;
      
      console.log(`Dimensiones reales - Ancho: ${dims.widthPercent.toFixed(2)}%, Alto: ${dims.heightPercent.toFixed(2)}%`);
      
      // Calcular posición usando el utilitario centralizado
      const position = PositionUtils.calculatePositionByCode(positionCode, dims);
      
      console.log(`Aplicando posición ${positionCode}: top=${position.top}%, left=${position.left}%`);
      
      // Limpiar propiedades que pueden interferir
      const cleanupProps = PositionUtils.getCleanupProps();
      Object.entries(cleanupProps).forEach(([prop, value]) => {
        handleStyleChange(prop, value);
      });
      
      // Actualizar posición
      onUpdatePosition({
        top: PositionUtils.formatWithUnit(position.top),
        left: PositionUtils.formatWithUnit(position.left)
      });
      
      // Actualizar estado local
      setLocalPosition({
        top: PositionUtils.formatWithUnit(position.top),
        left: PositionUtils.formatWithUnit(position.left)
      });
    } catch (error) {
      console.error(`Error en handleQuickPosition: ${error.message}`);
    }
  };
  
  // Función mejorada para alineaciones
  const handleAlign = (alignment) => {
    try {
      // Usar la función getDimensions
      const dims = getDimensions();
      if (!dims) return;
      
      console.log(`Dimensiones reales - Ancho: ${dims.widthPercent.toFixed(2)}%, Alto: ${dims.heightPercent.toFixed(2)}%`);
      
      // Aplicar alineación según el tipo con cálculos precisos
      switch (alignment) {
        case 'center-h':
          // Centrar horizontalmente con precisión
          handlePositionChange('left', (50 - (dims.widthPercent / 2)).toFixed(2), '%');
          console.log(`Alineación horizontal al centro: left=${(50 - (dims.widthPercent / 2)).toFixed(2)}%`);
          break;
        case 'center-v':
          // Centrar verticalmente con precisión
          handlePositionChange('top', (50 - (dims.heightPercent / 2)).toFixed(2), '%');
          console.log(`Alineación vertical al centro: top=${(50 - (dims.heightPercent / 2)).toFixed(2)}%`);
          break;
        case 'center-both':
          // Solución: actualización conjunta de ambos valores
          const centerTop = (50 - (dims.heightPercent / 2)).toFixed(2);
          const centerLeft = (50 - (dims.widthPercent / 2)).toFixed(2);
          
          // Actualizamos ambas propiedades a la vez
          onUpdatePosition({
            top: `${centerTop}%`,
            left: `${centerLeft}%`
          });
          
          // También actualizamos el estado local para sincronía
          setLocalPosition({
            top: `${centerTop}%`,
            left: `${centerLeft}%`
          });
          
          console.log(`Alineación a centro completo: top=${centerTop}%, left=${centerLeft}%`);
          break;
        case 'left':
          // Alinear a la izquierda
          handlePositionChange('left', '0', '%');
          console.log('Alineación a la izquierda: left=0%');
          break;
        case 'right':
          // Alinear a la derecha con precisión
          handlePositionChange('left', (100 - dims.widthPercent).toFixed(2), '%');
          console.log(`Alineación a la derecha: left=${(100 - dims.widthPercent).toFixed(2)}%`);
          break;
        case 'top':
          // Alinear arriba
          handlePositionChange('top', '0', '%');
          console.log('Alineación arriba: top=0%');
          break;
        case 'bottom':
          // Alinear abajo con precisión
          handlePositionChange('top', (100 - dims.heightPercent).toFixed(2), '%');
          console.log(`Alineación abajo: top=${(100 - dims.heightPercent).toFixed(2)}%`);
          break;
        default:
          console.warn(`Tipo de alineación desconocido: ${alignment}`);
      }
      
      // Eliminar cualquier transformación existente para evitar conflictos
      handleStyleChange('transform', 'none');
    } catch (error) {
      console.error(`Error en handleAlign: ${error.message}`);
    }
  };

  // Analizar un valor de posición para extraer el valor numérico y la unidad
  const parsePositionValue = (value) => {
    if (!value) return { value: '0', unit: '%' };
    
    if (value.endsWith('px')) {
      return { value: value.slice(0, -2), unit: 'px' };
    } else if (value.endsWith('%')) {
      return { value: value.slice(0, -1), unit: '%' };
    } else {
      // Si no tiene unidad, asumimos %
      return { value, unit: '%' };
    }
  };

  // Extraer valores y unidades para los inputs de posición
  const topParsed = parsePositionValue(localPosition.top);
  const leftParsed = parsePositionValue(localPosition.left);

  // Manejador para subida de imágenes
  const handleImageUpdate = (imageRef, file) => {
    // Verificar que file es un objeto File válido
    if (!(file instanceof File || file instanceof Blob)) {
      console.error("⚠️ El archivo no es válido:", file);
      return;
    }
    
    // Log para verificar archivo
    console.log(`📎 Actualizando imagen: ${imageRef}, Archivo:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Actualizar el contenido con la referencia temporal
    handleContentChange(imageRef);
    
    // Si hay un archivo, actualizar propiedades temporales para vista previa
    if (file) {
      // Crear URL de vista previa
      const previewUrl = URL.createObjectURL(file);
      
      // Guardar referencia al archivo y URL de vista previa en el estilo
      // Esto es temporal y se usa solo para mostrar la imagen localmente
      const updatedStyle = {
        ...localStyle,
        _previewUrl: previewUrl,
        _tempFile: file  // Asegurar que se guarda el objeto File, no un objeto vacío
      };
      
      // Actualizar estilo local
      setLocalStyle(updatedStyle);
      
      // Enviar actualización al componente padre
      updateStyle(updatedStyle);
      
      // También actualizar referencia directa en el componente para mayor seguridad
      setTimeout(() => {
        try {
          const compEl = document.querySelector(`[data-id="${component.id}"]`);
          if (compEl && compEl.parentNode) {
            console.log(`✅ Guardando referencia en el DOM para ${component.id}`);
            compEl.parentNode._tempFile = file;
            compEl.parentNode._imageFile = file;
          }
        } catch (e) {
          console.error("Error guardando referencia en DOM:", e);
        }
      }, 100);
    }
  };

  // Si está integrado, renderizamos la versión compacta
  if (embedded) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Estilos del scrollbar inline si es necesario */}
        <style>{scrollbarStyles}</style>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-3 py-1.5 text-xs font-medium ${
              activeTab === 'content'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Contenido
          </button>
          <button
            className={`flex-1 px-3 py-1.5 text-xs font-medium ${
              activeTab === 'style'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('style')}
          >
            Estilo
          </button>
          <button
            className={`flex-1 px-3 py-1.5 text-xs font-medium ${
              activeTab === 'position'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('position')}
          >
            Posición
          </button>
        </div>

        {/* Contenido de pestañas */}
        <div>
          {/* Pestaña de Contenido */}
          {activeTab === 'content' && (
            <div className="p-4 space-y-4">
              {component.type === 'image' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Imagen del componente
                    </label>
                    
                    {/* Componente ImageUploader */}
                    <ImageUploader 
                      componentId={component.id}
                      currentImage={
                        // Si es una imagen válida o hay vista previa, mostrarla
                        typeof component.content === 'string' && (
                          component.content.startsWith('data:image') || 
                          component.content.startsWith('/') || 
                          component.content.match(/^https?:\/\//)
                        ) ? component.content : 
                        // Si hay vista previa en el estilo, usarla
                        localStyle._previewUrl || null
                      }
                      onImageUpdate={handleImageUpdate}
                      disabled={component.locked}
                    />
                    
                    {/* Input para URL externa */}
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1">
                        O ingresa una URL de imagen externa:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={
                            // Mostrar URL externa, no referencias temporales
                            typeof component.content === 'string' && 
                            !component.content.startsWith('__IMAGE_REF__') 
                              ? component.content 
                              : ''
                          }
                          onChange={(e) => handleContentChange(e.target.value)}
                          className="w-full p-2 text-sm border rounded"
                          disabled={component.locked}
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                        <button 
                          className="p-1 text-sm border rounded hover:bg-gray-50"
                          onClick={() => handleContentChange(localContent)}
                          disabled={!localContent || component.locked}
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vista previa si hay imagen */}
                  {(localStyle._previewUrl || 
                    (typeof component.content === 'string' && (
                      component.content.startsWith('data:image') || 
                      component.content.startsWith('/') || 
                      component.content.match(/^https?:\/\//)
                    ))) && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">
                        Vista previa:
                      </label>
                      <div className="border rounded p-2 bg-gray-50">
                        <img 
                          src={
                            localStyle._previewUrl || 
                            component.content
                          } 
                          alt="Preview" 
                          className="mx-auto max-h-32 object-contain" 
                          onError={() => setImageError(true)}
                          onLoad={() => {
                            setImageError(false);
                            setImageLoaded(true);
                          }}
                        />
                        {imageError && (
                          <p className="text-xs text-red-500 text-center mt-1">
                            Error al cargar la imagen
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mensaje para referencias temporales */}
                  {component.content && 
                   typeof component.content === 'string' && 
                   component.content.startsWith('__IMAGE_REF__') && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      Imagen seleccionada. Se guardará permanentemente cuando guardes el banner.
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Texto del componente
                  </label>
                  <input
                    type="text"
                    value={localContent || ''}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={component.locked}
                  />
                  
                  {/* Mostrar info para traducción */}
                  {component.content && typeof component.content === 'object' && component.content.translatable && (
                    <div className="mt-2 text-xs text-blue-600 italic">
                      Este texto es traducible. Actualmente editando versión en inglés.
                    </div>
                  )}
                </div>
              )}
              {component.action && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de acción
                  </label>
                  <div className="p-2 bg-gray-50 rounded text-sm">
                    {component.action.type}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pestaña de Estilo */}
          {activeTab === 'style' && (
            <div className="p-3 space-y-4 ">
              {/* Sección de Colores */}
              <div className="space-y-3">
                <h4 className="font-medium text-xs flex items-center gap-1">
                  <Palette size={14} />
                  Colores
                </h4>
                <div className="space-y-2">
                  <label className="block text-xs">Color de fondo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localStyle.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localStyle.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="flex-1 p-1 text-xs border rounded"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs">Color de texto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localStyle.color || '#000000'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localStyle.color || '#000000'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="flex-1 p-1 text-xs border rounded"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sección de Tipografía */}
              <div className="space-y-3">
                <h4 className="font-medium text-xs flex items-center gap-1">
                  <Type size={14} />
                  Tipografía
                </h4>
                <div className="space-y-2">
                  <label className="block text-xs">Tamaño de fuente</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="8"
                      max="72"
                      value={parseInt(localStyle.fontSize) || 16}
                      onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)}
                      className="flex-1"
                    />
                    <span className="w-10 text-center text-xs">
                      {parseInt(localStyle.fontSize) || 16}px
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => handleStyleChange('fontWeight', 'normal')}
                    className={`p-1 border rounded text-xs ${localStyle.fontWeight === 'normal' ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handleStyleChange('fontWeight', 'bold')}
                    className={`p-1 border rounded text-xs ${localStyle.fontWeight === 'bold' ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    Negrita
                  </button>
                </div>
              </div>
              
              {/* Sección de Espaciado */}
              <div className="space-y-3">
                <h4 className="font-medium text-xs flex items-center gap-1">
                  <Box size={14} />
                  Espaciado
                </h4>
                <div className="space-y-1">
                  <label className="block text-xs">Padding</label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={parseInt(localStyle.padding) || 0}
                    onChange={(e) => handleStyleChange('padding', `${e.target.value}px`)}
                    className="w-full"
                  />
                  <div className="text-center text-xs text-gray-500">
                    {parseInt(localStyle.padding) || 0}px
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs">Border Radius</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={parseInt(localStyle.borderRadius) || 0}
                    onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
                    className="w-full"
                  />
                  <div className="text-center text-xs text-gray-500">
                    {parseInt(localStyle.borderRadius) || 0}px
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pestaña de Posición */}
          {activeTab === 'position' && (
            <div className="p-3 space-y-4 ">
              <div className="space-y-3">
                <h4 className="font-medium text-xs flex items-center gap-1 mb-2">
                  <Move size={14} />
                  Posición
                </h4>
                
                {/* Top position */}
                <div className="space-y-1">
                  <label className="block text-xs">Posición Vertical (Top)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={topParsed.value}
                      onChange={(e) => handlePositionChange('top', e.target.value, topParsed.unit)}
                      className="flex-1 p-1 text-xs border rounded"
                    />
                    <select
                      value={topParsed.unit}
                      onChange={(e) => handleUnitChange('top', topParsed.value, topParsed.unit, e.target.value)}
                      className="p-1 text-xs border rounded"
                    >
                      <option value="%">%</option>
                      <option value="px">px</option>
                    </select>
                  </div>
                </div>
                
                {/* Left position */}
                <div className="space-y-1">
                  <label className="block text-xs">Posición Horizontal (Left)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={leftParsed.value}
                      onChange={(e) => handlePositionChange('left', e.target.value, leftParsed.unit)}
                      className="flex-1 p-1 text-xs border rounded"
                    />
                    <select
                      value={leftParsed.unit}
                      onChange={(e) => handleUnitChange('left', leftParsed.value, leftParsed.unit, e.target.value)}
                      className="p-1 text-xs border rounded"
                    >
                      <option value="%">%</option>
                      <option value="px">px</option>
                    </select>
                  </div>
                </div>
                
                {/* Posiciones predefinidas - VERSIÓN MEJORADA */}
                <div className="mt-2">
                  <div className="text-xs font-medium mb-1">Posiciones Rápidas</div>
                  <div className="grid grid-cols-3 gap-1">
                    {/* Grid 3x3 de botones para posiciones rápidas con tooltips */}
                    <button 
                      onClick={() => handleQuickPosition('tl')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Esquina Superior Izquierda"
                    >
                      <span>↖</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                        Sup. Izquierda
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('tc')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Superior Centro"
                    >
                      <span>↑</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                        Sup. Centro
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('tr')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Esquina Superior Derecha"
                    >
                      <span>↗</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 right-0 whitespace-nowrap z-10">
                        Sup. Derecha
                      </span>
                    </button>
                    
                    <button 
                      onClick={() => handleQuickPosition('cl')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Centro Izquierda"
                    >
                      <span>←</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                        Centro Izq.
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('cc')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Centro Absoluto"
                    >
                      <span>•</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                        Centro
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('cr')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Centro Derecha"
                    >
                      <span>→</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -bottom-8 right-0 whitespace-nowrap z-10">
                        Centro Der.
                      </span>
                    </button>
                    
                    <button 
                      onClick={() => handleQuickPosition('bl')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Esquina Inferior Izquierda"
                    >
                      <span>↙</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                        Inf. Izquierda
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('bc')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Inferior Centro"
                    >
                      <span>↓</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                        Inf. Centro
                      </span>
                    </button>
                    <button 
                      onClick={() => handleQuickPosition('br')} 
                      className="p-1 text-xs border bg-gray-50 hover:bg-blue-50 relative group"
                      title="Esquina Inferior Derecha"
                    >
                      <span>↘</span>
                      <span className="absolute hidden group-hover:block text-[10px] bg-gray-800 text-white p-1 rounded -top-8 right-0 whitespace-nowrap z-10">
                        Inf. Derecha
                      </span>
                    </button>
                  </div>
                </div>

                {/* Alineaciones */}
                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Alineaciones</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => handleAlign('center-h')}
                      className="p-1 text-xs border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1"
                      title="Centrar horizontalmente"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Centrar H</span>
                    </button>
                    <button 
                      onClick={() => handleAlign('center-v')}
                      className="p-1 text-xs border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1"
                      title="Centrar verticalmente"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Centrar V</span>
                    </button>
                    <button 
                      onClick={() => handleAlign('center-both')}
                      className="p-1 text-xs border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 col-span-2"
                      title="Centrar en ambos ejes"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Centrar HV</span>
                    </button>
                  </div>
                </div>
                
                {/* Componente de tamaño real */}
                <ComponentSizeInfo componentId={component.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Versión original del panel (no integrado) con todas las mejoras
  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      {/* Estilos del scrollbar inline si es necesario */}
      <style>{scrollbarStyles}</style>
      
      {/* Header con botón de cierre */}
      <div className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {component.type}
          </span>
          <h3 className="font-medium">
            {component.locked ? '🔒 ' : ''}{component.id}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" title="Cerrar panel">
          <X size={16} />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'content'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('content')}
        >
          Contenido
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'style'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('style')}
        >
          Estilo
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'position'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('position')}
        >
          Posición
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Pestaña de Contenido */}
        {activeTab === 'content' && (
          <div className="p-4 space-y-4">
            {component.type === 'image' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Imagen del componente
                  </label>
                  
                  {/* Componente ImageUploader */}
                  <ImageUploader 
                    componentId={component.id}
                    currentImage={
                      // Si es una imagen válida o hay vista previa, mostrarla
                      typeof component.content === 'string' && (
                        component.content.startsWith('data:image') || 
                        component.content.startsWith('/') || 
                        component.content.match(/^https?:\/\//)
                      ) ? component.content : 
                      // Si hay vista previa en el estilo, usarla
                      localStyle._previewUrl || null
                    }
                    onImageUpdate={handleImageUpdate}
                    disabled={component.locked}
                  />
                  
                  {/* Input para URL externa */}
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">
                      O ingresa una URL de imagen externa:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={
                          // Mostrar URL externa, no referencias temporales
                          typeof component.content === 'string' && 
                          !component.content.startsWith('__IMAGE_REF__') 
                            ? component.content 
                            : ''
                        }
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="w-full p-2 text-sm border rounded"
                        disabled={component.locked}
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                      <button 
                        className="p-1 text-sm border rounded hover:bg-gray-50"
                        onClick={() => handleContentChange(localContent)}
                        disabled={!localContent || component.locked}
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Vista previa si hay imagen */}
                {(localStyle._previewUrl || 
                  (typeof component.content === 'string' && (
                    component.content.startsWith('data:image') || 
                    component.content.startsWith('/') || 
                    component.content.match(/^https?:\/\//)
                  ))) && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-1">
                      Vista previa:
                    </label>
                    <div className="border rounded p-2 bg-gray-50">
                      <img 
                        src={
                          localStyle._previewUrl || 
                          component.content
                        } 
                        alt="Preview" 
                        className="mx-auto max-h-32 object-contain" 
                        onError={() => setImageError(true)}
                        onLoad={() => {
                          setImageError(false);
                          setImageLoaded(true);
                        }}
                      />
                      {imageError && (
                        <p className="text-xs text-red-500 text-center mt-1">
                          Error al cargar la imagen
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mensaje para referencias temporales */}
                {component.content && 
                 typeof component.content === 'string' && 
                 component.content.startsWith('__IMAGE_REF__') && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    Imagen seleccionada. Se guardará permanentemente cuando guardes el banner.
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Texto del componente
                </label>
                <input
                  type="text"
                  value={localContent || ''}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={component.locked}
                />
                
                {/* Mostrar info para traducción */}
                {component.content && typeof component.content === 'object' && component.content.translatable && (
                  <div className="mt-2 text-xs text-blue-600 italic">
                    Este texto es traducible. Actualmente editando versión en inglés.
                  </div>
                )}
              </div>
            )}
            {component.action && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de acción
                </label>
                <div className="p-2 bg-gray-50 rounded text-sm">
                  {component.action.type}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Pestaña de Estilo */}
        {activeTab === 'style' && (
          <div className="p-4 space-y-6 ">
            {/* Sección de Colores */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Palette size={16} />
                Colores
              </h4>
              <div className="space-y-2">
                <label className="block text-sm">Color de fondo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localStyle.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localStyle.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="flex-1 p-2 border rounded"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm">Color de texto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localStyle.color || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localStyle.color || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="flex-1 p-2 border rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Sección de Tipografía */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Type size={16} />
                Tipografía
              </h4>
              <div className="space-y-2">
                <label className="block text-sm">Tamaño de fuente</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={parseInt(localStyle.fontSize) || 16}
                    onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">
                    {parseInt(localStyle.fontSize) || 16}px
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStyleChange('fontWeight', 'normal')}
                  className={`p-2 border rounded ${localStyle.fontWeight === 'normal' ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => handleStyleChange('fontWeight', 'bold')}
                  className={`p-2 border rounded ${localStyle.fontWeight === 'bold' ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  Negrita
                </button>
              </div>
            </div>
            
            {/* Sección de Espaciado */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Box size={16} />
                Espaciado
              </h4>
              <div className="space-y-2">
                <label className="block text-sm">Padding</label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={parseInt(localStyle.padding) || 0}
                  onChange={(e) => handleStyleChange('padding', `${e.target.value}px`)}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-500">
                  {parseInt(localStyle.padding) || 0}px
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm">Border Radius</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={parseInt(localStyle.borderRadius) || 0}
                  onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-500">
                  {parseInt(localStyle.borderRadius) || 0}px
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Pestaña de Posición */}
        {activeTab === 'position' && (
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Move size={16} />
                Posición
              </h4>
              
              {/* Top position */}
              <div className="space-y-2">
                <label className="block text-sm">Posición Vertical (Top)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={topParsed.value}
                    onChange={(e) => handlePositionChange('top', e.target.value, topParsed.unit)}
                    className="flex-1 p-2 border rounded"
                  />
                  <select
                    value={topParsed.unit}
                    onChange={(e) => handleUnitChange('top', topParsed.value, topParsed.unit, e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="%">%</option>
                    <option value="px">px</option>
                  </select>
                </div>
              </div>
              
              {/* Left position */}
              <div className="space-y-2">
                <label className="block text-sm">Posición Horizontal (Left)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={leftParsed.value}
                    onChange={(e) => handlePositionChange('left', e.target.value, leftParsed.unit)}
                    className="flex-1 p-2 border rounded"
                  />
                  <select
                    value={leftParsed.unit}
                    onChange={(e) => handleUnitChange('left', leftParsed.value, leftParsed.unit, e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="%">%</option>
                    <option value="px">px</option>
                  </select>
                </div>
              </div>
              
              {/* Posiciones predefinidas - VERSIÓN MEJORADA */}
              <div className="mt-4">
                <h5 className="font-medium text-sm mb-2">Posiciones Rápidas</h5>
                <div className="grid grid-cols-3 gap-2">
                  {/* Grid 3x3 de botones para posiciones rápidas con tooltips */}
                  <button 
                    onClick={() => handleQuickPosition('tl')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Esquina Superior Izquierda"
                  >
                    <span>↖</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                      Sup. Izquierda
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('tc')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Superior Centro"
                  >
                    <span>↑</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                      Sup. Centro
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('tr')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Esquina Superior Derecha"
                  >
                    <span>↗</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 right-0 whitespace-nowrap z-10">
                      Sup. Derecha
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => handleQuickPosition('cl')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Centro Izquierda"
                  >
                    <span>←</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 left-0 whitespace-nowrap z-10">
                      Centro Izq.
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('cc')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Centro Absoluto"
                  >
                    <span>•</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                      Centro
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('cr')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Centro Derecha"
                  >
                    <span>→</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -bottom-8 right-0 whitespace-nowrap z-10">
                      Centro Der.
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => handleQuickPosition('bl')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Esquina Inferior Izquierda"
                  >
                    <span>↙</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                      Inf. Izquierda
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('bc')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Inferior Centro"
                  >
                    <span>↓</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                      Inf. Centro
                    </span>
                  </button>
                  <button 
                    onClick={() => handleQuickPosition('br')} 
                    className="p-2 text-sm border bg-gray-50 hover:bg-blue-50 relative group rounded"
                    title="Esquina Inferior Derecha"
                  >
                    <span>↘</span>
                    <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded -top-8 right-0 whitespace-nowrap z-10">
                      Inf. Derecha
                    </span>
                  </button>
                </div>
              </div>

              {/* Alineaciones */}
              <div className="mt-4">  
                <h5 className="font-medium text-sm mb-2">Alineaciones</h5>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAlign('center-h')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Centrar horizontalmente"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V20M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Centrar H</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('center-v')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Centrar verticalmente"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V20M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Centrar V</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('center-both')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 col-span-2 rounded"
                    title="Centrar en ambos ejes"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Centrar HV</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('left')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Alinear a la izquierda"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4V20M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Izquierda</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('right')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Alinear a la derecha"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 4V20M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Derecha</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('top')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Alinear arriba"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V12M4 4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Arriba</span>
                  </button>
                  <button 
                    onClick={() => handleAlign('bottom')}
                    className="p-2 text-sm border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-center gap-1 rounded"
                    title="Alinear abajo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12V20M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Abajo</span>
                  </button>
                </div>
              </div>
              
              {/* Componente de tamaño real */}
              <ComponentSizeInfo componentId={component.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BannerPropertyPanel;