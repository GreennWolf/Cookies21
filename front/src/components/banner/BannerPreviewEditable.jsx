// src/components/banner/BannerPreviewEditable.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles, ImagePlaceholders } from '../../utils/imageProcessing';

/**
 * Una versión editable de BannerPreview para editar directamente las imágenes en el preview
 * con funcionalidades de drag-and-drop y resize similares a BannerCanvas
 */
function BannerPreviewEditable({ 
  bannerConfig, 
  deviceView = 'desktop', 
  className, 
  onUpdateImageSettings 
}) {
  // Asegurarse de que bannerConfig tenga una estructura válida
  const safeConfig = bannerConfig || { layout: { desktop: {} }, components: [] };
  const [imageErrors, setImageErrors] = useState({});
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState(null);
  const [componentOriginalSize, setComponentOriginalSize] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentSize, setCurrentSize] = useState(null); // Para mostrar tamaño durante resize
  const [lastAppliedSize, setLastAppliedSize] = useState(null); // Para evitar cambios pequeños
  const [primaryAxis, setPrimaryAxis] = useState(null); // 'width' o 'height' - para mantener consistencia
  
  // Referencias para los componentes
  const containerRef = useRef(null);
  const componentRefs = useRef(new Map());

  const getLayoutStyles = () => {
    // Verificar que safeConfig y safeConfig.layout existan
    const layoutConfig = safeConfig?.layout || {};
    const layout = layoutConfig[deviceView] || {};
    
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '100px',
      // Mejor visualización
      maxWidth: '95%',
      maxHeight: '95%',
      position: 'relative'
    };

    if (layout.type === 'banner') {
      // Banner
      const style = {
        ...baseStyles,
        position: 'absolute'
      };
      if (layout.position === 'top') {
        style.top = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.left = 0;
        style.right = 0;
        style.transform = 'translateY(-50%)';
      }
      return style;
    } else if (layout.type === 'floating') {
      // Flotante
      return {
        ...baseStyles,
        position: 'absolute',
        right: '20px',
        bottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000
      };
    } else if (layout.type === 'modal') {
      // Modal
      return {
        ...baseStyles,
        maxWidth: '600px',
        width: '90%',
        margin: '0 auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '24px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        display: 'flex',            // Añadir flex para mejorar centrado 
        flexDirection: 'column',     // Organizar contenido en columnas
        justifyContent: 'center',    // Centrar contenido verticalmente
        alignItems: 'center'         // Centrar contenido horizontalmente
      };
    }
    return baseStyles;
  };

  // Iniciar drag de componente
  const handleDragStart = (e, component) => {
    e.preventDefault();
    e.stopPropagation();

    if (component.type !== 'image') return;
    
    // Seleccionar el componente
    setSelectedComponent(component);
    setIsDragging(true);
    
    // Guardar la posición inicial del mouse
    const componentEl = componentRefs.current.get(component.id);
    if (!componentEl) return;

    const rect = componentEl.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Manejar movimiento durante drag con restricciones para no salir del contenedor
  const handleDragMove = (e) => {
    if (!isDragging || !selectedComponent || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const componentEl = componentRefs.current.get(selectedComponent.id);
    if (!componentEl) return;

    // Obtener las dimensiones del componente
    const componentRect = componentEl.getBoundingClientRect();
    const componentWidth = componentRect.width;
    const componentHeight = componentRect.height;
    
    // Calcular nueva posición relativa al contenedor
    let newLeft = e.clientX - containerRect.left - dragOffset.x;
    let newTop = e.clientY - containerRect.top - dragOffset.y;
    
    // Restringir la posición para que no salga del contenedor
    // Permitimos un pequeño margen negativo para facilitar el posicionamiento en bordes
    const minMargin = -10; // Permitir que solo 10px salgan del borde
    newLeft = Math.max(minMargin, Math.min(newLeft, containerRect.width - componentWidth + minMargin));
    newTop = Math.max(minMargin, Math.min(newTop, containerRect.height - componentHeight + minMargin));
    
    // Actualizar la posición visual del componente con suavizado para evitar vibraciones
    componentEl.style.left = `${Math.round(newLeft)}px`;
    componentEl.style.top = `${Math.round(newTop)}px`;
  };

  // Finalizar drag
  const handleDragEnd = () => {
    if (!isDragging || !selectedComponent || !containerRef.current) return;
    
    const compId = selectedComponent.id;
    const componentEl = componentRefs.current.get(compId);
    if (!componentEl) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const compRect = componentEl.getBoundingClientRect();
    
    // Calcular posición final en porcentajes
    const leftPercent = ((compRect.left - containerRect.left) / containerRect.width) * 100;
    const topPercent = ((compRect.top - containerRect.top) / containerRect.height) * 100;
    
    // Información de depuración detallada
    console.log(`🔍 DEBUG - handleDragEnd - ID: ${compId}`);
    console.log(`🔍 DEBUG - Posiciones en píxeles:`);
    console.log(`🔍 DEBUG - Componente: left=${compRect.left}px, top=${compRect.top}px, size=${compRect.width}x${compRect.height}px`);
    console.log(`🔍 DEBUG - Contenedor: left=${containerRect.left}px, top=${containerRect.top}px, size=${containerRect.width}x${containerRect.height}px`);
    console.log(`🔍 DEBUG - Posición relativa (px): left=${compRect.left - containerRect.left}px, top=${compRect.top - containerRect.top}px`);
    console.log(`🔍 DEBUG - Posición enviada (%): left=${leftPercent.toFixed(4)}%, top=${topPercent.toFixed(4)}%`);
    
    // Notificar al componente padre sobre el cambio
    if (onUpdateImageSettings) {
      onUpdateImageSettings(compId, {
        position: {
          left: leftPercent,
          top: topPercent
        }
      });
    }
    
    setIsDragging(false);
    setSelectedComponent(null);
  };

  // Iniciar redimensionamiento
  const handleResizeStart = (e, component) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (component.type !== 'image') return;
    
    // Seleccionar el componente
    setSelectedComponent(component);
    setIsResizing(true);
    
    // Guardar posición inicial del mouse
    setResizeStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Guardar tamaño original del componente
    const componentEl = componentRefs.current.get(component.id);
    if (!componentEl) return;
    
    const originalWidth = componentEl.offsetWidth;
    const originalHeight = componentEl.offsetHeight;
    
    setComponentOriginalSize({
      width: originalWidth,
      height: originalHeight
    });
    
    // Determinar el eje principal basado en la posición inicial de clic
    // Esto nos ayuda a mantener consistencia durante toda la operación de resize
    const handleBounds = componentEl.getBoundingClientRect();
    const handleCenterX = handleBounds.right;
    const handleCenterY = handleBounds.bottom;
    
    // Calcular la dirección del mouse respecto al control de resize
    const mouseDirectionX = e.clientX - handleCenterX;
    const mouseDirectionY = e.clientY - handleCenterY;
    
    // Dependiendo de la dirección, determinar el eje principal
    if (Math.abs(mouseDirectionX) >= Math.abs(mouseDirectionY)) {
      setPrimaryAxis('width'); // El usuario parece querer ajustar el ancho
    } else {
      setPrimaryAxis('height'); // El usuario parece querer ajustar la altura
    }
    
    // Establecer el tamaño actual para mostrar en el indicador
    setCurrentSize({
      width: originalWidth,
      height: originalHeight
    });
  };
  
  // Manejar movimiento durante resize con enfoque mejorado para tamaños pequeños
  const handleResizeMove = (e) => {
    if (!isResizing || !selectedComponent || !resizeStart || !componentOriginalSize) return;
    
    const componentEl = componentRefs.current.get(selectedComponent.id);
    if (!componentEl) return;

    // Calcular deltas con el punto de inicio del resize
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    // Obtener configuraciones del componente
    const imgSettings = safeConfig.imageSettings?.[selectedComponent.id] || {};
    const maintainRatio = imgSettings.maintainAspectRatio !== false; // true por defecto
    const aspectRatio = componentOriginalSize.width / componentOriginalSize.height;

    // -------------------- ENFOQUE ESPECIAL PARA TAMAÑOS PEQUEÑOS --------------------
    // Detectar si estamos trabajando con una imagen pequeña
    const isSmallImage = componentOriginalSize.width < 50 || componentOriginalSize.height < 50;
    
    // Variables para las nuevas dimensiones
    let newWidth, newHeight;
    
    if (isSmallImage) {
      // Para imágenes pequeñas, usamos un enfoque incremental suavizado
      // que reduce la sensibilidad y funciona mejor para tamaños pequeños
      
      // Umbral mínimo de movimiento para considerarlo intencional (píxeles)
      const movementThreshold = 1;
      
      // Reducimos la sensibilidad para movimientos pequeños
      const scaleFactor = 0.5; // Mitad de sensibilidad para imágenes pequeñas
      
      // Solo considerar el eje X para mayor estabilidad en tamaños pequeños
      let scaledDelta = deltaX * scaleFactor;
      
      // Ignorar movimientos muy pequeños para evitar vibraciones
      if (Math.abs(scaledDelta) < movementThreshold) {
        scaledDelta = 0;
      }
      
      // Aplicar incremento suavizado
      newWidth = componentOriginalSize.width + scaledDelta;
      
      // Siempre mantener proporción con el ancho como base para imágenes pequeñas
      newHeight = newWidth / aspectRatio;
    } else {
      // Para imágenes normales usamos nuestro enfoque basado en escala
      
      // 1. Calculamos la escala en cada eje (cuánto ha crecido o disminuido)
      let scaleX = 1 + (deltaX / componentOriginalSize.width);
      let scaleY = 1 + (deltaY / componentOriginalSize.height);
      
      // 2. Si hay que mantener proporciones, usamos el mismo valor de escala
      if (maintainRatio) {
        if (primaryAxis === 'height') {
          // Si el eje principal es altura, usamos scaleY para ambos
          scaleX = scaleY;
        } else {
          // Por defecto, usamos el ancho como principal
          scaleY = scaleX;
        }
      }
      
      // 3. Aplicamos la escala al tamaño original
      newWidth = componentOriginalSize.width * scaleX;
      newHeight = componentOriginalSize.height * scaleY;
    }
    
    // Aseguramos un tamaño mínimo absoluto
    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(5, newHeight);
    
    // Estabilizador de frecuencia - limitar a un máximo de actualizaciones por segundo
    const currentTime = Date.now();
    // Para imágenes pequeñas, reducimos la frecuencia aún más (15fps) para mayor estabilidad
    const updateInterval = isSmallImage ? 66 : 33; // ~15fps o ~30fps
    
    if (lastAppliedSize && lastAppliedSize.timestamp && 
        currentTime - lastAppliedSize.timestamp < updateInterval) {
      return; // Saltamos esta actualización para mantener una frecuencia controlada
    }
    
    // Cuantizar los valores para imágenes pequeñas (redondear a múltiplos de 2)
    // Esto reduce drásticamente los microajustes que pueden causar saltos
    if (isSmallImage) {
      newWidth = Math.round(newWidth / 2) * 2;
      newHeight = Math.round(newHeight / 2) * 2;
    } else {
      // Para imágenes normales, redondeo normal
      newWidth = Math.round(newWidth);
      newHeight = Math.round(newHeight);
    }
    
    // 7. Actualizar tamaño visual con suavizado CSS
    componentEl.style.width = `${newWidth}px`;
    componentEl.style.height = `${newHeight}px`;
    
    // Guardar el último tamaño aplicado con timestamp para controlar la frecuencia
    setLastAppliedSize({ 
      width: newWidth, 
      height: newHeight,
      timestamp: currentTime
    });
    
    // Actualizar el estado para mostrar el tamaño actual en la UI
    setCurrentSize({ width: newWidth, height: newHeight });
    
    // Agregar feedback visual durante el resize
    componentEl.style.transition = 'none'; // Desactivar transiciones durante resize
    componentEl.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.5)'; // Añadir borde azul
  };

  // Finalizar resize
  const handleResizeEnd = () => {
    if (!isResizing || !selectedComponent || !componentOriginalSize) return;
    
    const compId = selectedComponent.id;
    const componentEl = componentRefs.current.get(compId);
    if (!componentEl) return;
    
    // Limpiar los estilos visuales temporales
    componentEl.style.transition = ''; // Restaurar transiciones
    componentEl.style.boxShadow = ''; // Quitar borde visual
    
    // Obtener el ancho y alto final en píxeles
    const finalWidth = componentEl.offsetWidth;
    const finalHeight = componentEl.offsetHeight;
    
    // Calcular cambio de tamaño en porcentaje respecto al tamaño original
    // Limitamos a 2 decimales para mayor precisión pero evitando números extraños
    const widthPercent = Math.round((finalWidth / componentOriginalSize.width) * 10000) / 100;
    const heightPercent = Math.round((finalHeight / componentOriginalSize.height) * 10000) / 100;
    
    // Información de depuración detallada
    console.log(`🔍 DEBUG - handleResizeEnd - ID: ${compId}`);
    console.log(`🔍 DEBUG - Tamaño original: ${componentOriginalSize.width}x${componentOriginalSize.height}px`);
    console.log(`🔍 DEBUG - Tamaño final: ${finalWidth}x${finalHeight}px`);
    console.log(`🔍 DEBUG - Factor de escala (calculado): ancho=${(finalWidth / componentOriginalSize.width).toFixed(6)}, alto=${(finalHeight / componentOriginalSize.height).toFixed(6)}`);
    console.log(`🔍 DEBUG - Factor de escala (redondeado): ancho=${widthPercent}%, alto=${heightPercent}%`);
    console.log(`🔍 DEBUG - Valores enviados: width=${widthPercent}%, height=${heightPercent}%, widthPx=${finalWidth}, heightPx=${finalHeight}`);
    console.log(`🔍 DEBUG - Eje principal usado para mantener proporción: ${primaryAxis || 'ninguno'}`);  
    
    // Notificar al componente padre sobre el cambio con valores más precisos
    if (onUpdateImageSettings) {
      onUpdateImageSettings(compId, {
        width: widthPercent,
        height: heightPercent,
        // Incluir también dimensiones en px para mayor precisión en futuros cálculos
        widthPx: finalWidth,
        heightPx: finalHeight
      });
    }
    
    // Limpiar estados
    setIsResizing(false);
    setResizeStart(null);
    setComponentOriginalSize(null);
    setLastAppliedSize(null);
    setCurrentSize(null);
    setPrimaryAxis(null); // Limpiar el eje principal
    setSelectedComponent(null);
  };

  // Manejar eventos de mouse para dragging y resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        handleDragMove(e);
      } else if (isResizing) {
        handleResizeMove(e);
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      } else if (isResizing) {
        handleResizeEnd();
      }
    };
    
    // Agregar listeners globales
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Limpiar listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, selectedComponent, dragOffset, resizeStart, componentOriginalSize]);

  const renderComponent = (component) => {
    if (!component) return null;
    
    // Obtener posición según dispositivo
    const devicePos = component.position?.[deviceView] || {};
    
    // Usar la función centralizada para procesar estilos de imagen
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...component.style?.[deviceView] || {}};
    
    // Base styles with positioning
    const baseStyles = {
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...processedStyle,
      // Force transform to ensure precise positioning
      transform: 'translate(0, 0)',
      willChange: 'transform',
      // Properties for better visibility
      visibility: 'visible',
      opacity: 1
    };
  
    // Extract content for display
    let displayContent = '';
    if (typeof component.content === 'string') {
      displayContent = component.content;
    } else if (component.content && typeof component.content === 'object') {
      if (component.content.texts && typeof component.content.texts === 'object') {
        displayContent = component.content.texts.en || Object.values(component.content.texts)[0] || '';
      } else if (component.content.text) {
        displayContent = component.content.text;
      }
    }
  
    // Render based on component type
    switch (component.type) {
      case 'text':
        return (
          <div key={component.id} style={baseStyles}>
            {displayContent}
          </div>
        );
      case 'button':
        return (
          <button
            key={component.id}
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
      case 'image': {
        const imageUrl = getImageUrl(component, deviceView, 'preview');
        const hasError = imageErrors[component.id];
        
        // Show error placeholder if image failed to load
        if (hasError) {
          return (
            <div 
              key={component.id} 
              style={{
                ...baseStyles,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f8f8',
                border: '1px dashed #ccc',
                color: '#666'
              }}
            >
              <div className="flex flex-col items-center p-2">
                <ImageOff size={24} className="text-gray-400 mb-1" />
                <span className="text-xs text-center">Error al cargar imagen</span>
              </div>
            </div>
          );
        }
        
        // Render the image with editing capabilities
        return (
          <div
            key={component.id}
            ref={(el) => componentRefs.current.set(component.id, el)}
            className="image-component relative group"
            style={{
              ...baseStyles,
              cursor: 'move'
            }}
            onMouseDown={(e) => handleDragStart(e, component)}
          >
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: processedStyle.objectFit || 'contain',
                objectPosition: processedStyle.objectPosition || 'center',
                transition: 'opacity 0.2s',
                pointerEvents: 'none' // para que el drag funcione en el contenedor
              }}
              crossOrigin="anonymous"
              onError={(e) => handleImageError(
                e, 
                imageUrl, 
                component.id, 
                (id, hasError) => setImageErrors(prev => ({ ...prev, [id]: hasError }))
              )}
            />
            
            {/* Control de redimensionamiento más pequeño */}
            <div
              className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-tl-md cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              onMouseDown={(e) => handleResizeStart(e, component)}
              title="Arrastrar para redimensionar (mantiene proporción)"
            >
              <Maximize2 size={12} className="text-white" />
            </div>
            {/* Área ampliada de captura reducida */}
            <div
              className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize opacity-0"
              onMouseDown={(e) => handleResizeStart(e, component)}
              style={{ pointerEvents: 'auto' }}
            ></div>
            
            {/* Indicador visual de selección */}
            {selectedComponent?.id === component.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none"></div>
                {/* Indicadores de esquinas para mejor visibilidad */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-br-sm pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-bl-sm pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 rounded-tr-sm pointer-events-none"></div>
              </>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Simulated webpage background
  const previewBackground = () => {
    return (
      <>
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="space-y-1">
            <div className="h-2 bg-gray-100 rounded w-full"></div>
            <div className="h-2 bg-gray-100 rounded w-5/6"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-14 bg-gray-100 rounded"></div>
          <div className="h-14 bg-gray-100 rounded"></div>
        </div>
      </>
    );
  };

  // Estado para controlar la visibilidad de las instrucciones
  const [showInstructions, setShowInstructions] = useState(true);

  // Función para alternar instrucciones
  const toggleInstructions = (e) => {
    e.stopPropagation(); // Evitar que el click propague
    setShowInstructions(!showInstructions);
  };

  return (
    <div 
      className={`preview-editable relative ${className || ''}`} 
      style={{ height: '100%', width: '100%' }}
      onClick={() => setSelectedComponent(null)}
    >
      {/* Contenedor para simulación de página web */}
      <div className="relative h-full bg-white rounded overflow-hidden shadow-sm">
        {/* Barra navegador simulada */}
        <div className="bg-gray-700 p-1 flex items-center justify-between gap-1 text-xs">
          <div className="flex gap-1 items-center">
            <div className="flex gap-1 mr-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-gray-600 rounded text-gray-400 px-2 py-0.5 text-xs">
              example.com
            </div>
          </div>
          
          {/* Indicador de tamaño durante redimensionamiento */}
          {isResizing && currentSize && (
            <div className={`${currentSize.width < 50 || currentSize.height < 50 ? 'bg-yellow-500' : 'bg-blue-600'} text-white px-1.5 py-0.5 rounded text-[10px] font-mono animate-pulse`}>
              {currentSize.width}×{currentSize.height}px
              {(currentSize.width < 50 || currentSize.height < 50) && ' (modo precisión)'}
            </div>
          )}
        </div>
        
        {/* Contenido simulado */}
        <div className="relative" style={{ height: 'calc(100% - 24px)' }}>
          <div className="p-3 text-xs">
            {previewBackground()}
          </div>
          
          {/* Banner */}
          <div 
            ref={containerRef}
            style={getLayoutStyles()} 
            className="relative"
          >
            {Array.isArray(safeConfig?.components) ? 
              safeConfig.components.map(renderComponent) : 
              <div className="p-3 text-xs text-gray-500">No hay componentes para mostrar</div>
            }
          </div>
        </div>
      </div>
      
      {/* Instrucciones de edición con botón para cerrar */}
      {showInstructions && (
        <div className="absolute bottom-1 left-1 right-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 p-1 opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-1 p-0.5 relative">
            {/* Botón para cerrar instrucciones */}
            <button 
              className="absolute -top-1 -right-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-1 transition-colors"
              onClick={toggleInstructions}
              title="Ocultar instrucciones"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            <div className="flex items-center">
              <span className="font-bold mr-1">👆</span>
              <span>Haz clic y arrastra en las imágenes para moverlas</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold mr-1">🔄</span>
              <span>Usa el control azul en la esquina para ajustar el tamaño</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Botón para mostrar instrucciones si están ocultas */}
      {!showInstructions && (
        <button 
          className="absolute bottom-1 right-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-1 opacity-70 hover:opacity-100 transition-opacity shadow-sm"
          onClick={toggleInstructions}
          title="Mostrar instrucciones"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
}

export default BannerPreviewEditable;