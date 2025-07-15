import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ComponentRenderer from './ComponentRenderer';
import { Box } from 'lucide-react';

// DIMENSIONES ESTÁNDAR PARA DISPOSITIVOS REALES (UX MEJORADA)
const DEVICE_REAL_DIMENSIONS = {
  mobile: {
    width: 375,   // iPhone estándar
    height: 667,  // iPhone estándar
    name: 'Móvil (iPhone)'
  },
  tablet: {
    width: 768,   // iPad estándar
    height: 1024, // iPad estándar  
    name: 'Tablet (iPad)'
  },
  desktop: {
    width: 1200,  // Desktop estándar
    height: 800,  // Desktop estándar
    name: 'Desktop'
  }
};

// Función de throttle para optimización
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

// Herramienta de profiling temporal
const profileFunction = (name, fn) => {
  return (...args) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    return result;
  };
};


function BannerCanvas({
  bannerConfig,
  deviceView,
  selectedComponent,
  setSelectedComponent,
  onAddComponent,
  onDeleteComponent,
  onUpdatePosition,
  onUpdateContent,
  onUpdateStyle,
  onUpdateChildStyle,
  onAddChild,
  onMoveToContainer,
  onRemoveChild,
  onUpdateChildPosition,
  onUpdateComponent,
  onUnattachFromContainer,
  onReorderChildren, // Añadimos el parámetro para reordenar componentes
  clientInfo = null
}) {
  // Verificar que las funciones están definidas
  useEffect(() => {
  }, [onUnattachFromContainer, onDeleteComponent, onAddChild, onRemoveChild]);

  // Event listener global - DESACTIVADO TEMPORALMENTE para debugging
  // useEffect(() => {
  //   const globalDropHandler = (e) => {
  //     if (window.__dragData && containerRef.current) {
  //       const rect = containerRef.current.getBoundingClientRect();
  //       const isOverCanvas = e.clientX >= rect.left && 
  //                           e.clientX <= rect.right && 
  //                           e.clientY >= rect.top && 
  //                           e.clientY <= rect.bottom;
        
  //       if (isOverCanvas) {
  //         handleDrop(e);
  //       }
  //     }
  //   };

  //   const globalDragOverHandler = (e) => {
  //     if (window.__dragData) {
  //       e.preventDefault();
  //     }
  //   };

  //   document.addEventListener('drop', globalDropHandler, true);
  //   document.addEventListener('dragover', globalDragOverHandler, true);
    
  //   return () => {
  //     document.removeEventListener('drop', globalDropHandler, true);
  //     document.removeEventListener('dragover', globalDragOverHandler, true);
  //   };
  // }, []);

  // Detectar si se está arrastrando un componente nuevo - ELIMINADO EL INTERVALO
  // Ahora se maneja directamente en los event handlers para mejor rendimiento
  const { components = [], layout = {} } = bannerConfig;
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [guidelines, setGuidelines] = useState({ vertical: [], horizontal: [] });
  const [distanceGuidelines, setDistanceGuidelines] = useState([]);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDraggingNewComponent, setIsDraggingNewComponent] = useState(false); // Nuevo estado
  const [arrowStep, setArrowStep] = useState(5);
  const [isArrowMoving, setIsArrowMoving] = useState(false);
  const arrowTimerRef = useRef(null);
  const componentRefs = useRef(new Map());
  
  // Estado para controlar el paso de resize
  const [resizeStep, setResizeStep] = useState(5);
  
  // Referencias para el sistema de snap con teclas de flecha
  const lastSnapPosition = useRef({ x: null, y: null });
  const lastDirection = useRef({ x: 0, y: 0 });

  // Debug temporal - DESACTIVADO para evitar spam

  // Log cuando cambia la configuración del banner o el dispositivo - solo en desarrollo
  useEffect(() => {
  }, [deviceView, components.length]);

  const getComponentRect = (id) => {
    const el = componentRefs.current.get(id);
    return el ? el.getBoundingClientRect() : null;
  };

  // Estilos del contenedor basados en el layout - memoizado con UX MEJORADA
  const containerStyle = useMemo(() => {
    const layoutConfig = layout[deviceView] || {};
    
    // NUEVA LÓGICA: Usar dimensiones reales para móvil/tablet cuando esté en 100%
    let calculatedWidth = layoutConfig.width || '100%';
    let calculatedHeight = layoutConfig.height || 'auto';
    let calculatedMinHeight = layoutConfig.minHeight || '400px';
    
    // Solo aplicar dimensiones reales para móvil y tablet con ESCALA para mejor visualización
    if (deviceView === 'mobile' || deviceView === 'tablet') {
      const deviceDimensions = DEVICE_REAL_DIMENSIONS[deviceView];
      
      // Si width está en 100%, usar dimensión real del dispositivo
      if (calculatedWidth === '100%') {
        calculatedWidth = `${deviceDimensions.width}px`;
      }
      
      // Si height está en 100%, usar dimensión real
      // Para 'auto', usar una altura razonable pero no la completa del dispositivo  
      if (calculatedHeight === '100%') {
        calculatedHeight = `${deviceDimensions.height}px`;
        calculatedMinHeight = `${deviceDimensions.height}px`;
      } else if (calculatedHeight === 'auto') {
        // Para auto, usar una altura mínima más cómoda para edición
        calculatedMinHeight = deviceView === 'mobile' ? '500px' : '600px';
      }
      
      console.log(`📱 UX Mejorada: Canvas ${deviceView} usando dimensiones reales`, {
        originalWidth: layoutConfig.width,
        originalHeight: layoutConfig.height,
        calculatedWidth,
        calculatedHeight,
        deviceDimensions
      });
    }
    
    const baseStyle = {
      position: 'relative',
      backgroundColor: layoutConfig.backgroundColor || '#ffffff',
      width: calculatedWidth,
      height: calculatedHeight,
      minHeight: calculatedMinHeight,
      border: isDragOver ? '3px solid #3b82f6' : '2px dashed #3b82f6',
      boxShadow: isDragOver ? '0 0 10px rgba(59, 130, 246, 0.5)' : '0 0 0 1px rgba(59, 130, 246, 0.3)',
      borderRadius: '8px',
      overflow: 'visible',
      transition: 'all 0.3s ease',
      // NUEVO: Máximo width para evitar que se salga de la pantalla
      maxWidth: '100vw'
    };
    
    return baseStyle;
  }, [layout, deviceView, isDragOver]);

  const getLayoutClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out shadow-xl';
    const deviceLayout = layout[deviceView] || {};
    
    switch (deviceLayout.type) {
      case 'modal':
        return `${baseClasses} rounded-lg mx-auto`;
      case 'floating':
        return `${baseClasses} rounded-lg`;
      default:
        return baseClasses;
    }
  };

  const handleDragStart = (e, component) => {
    if (!containerRef.current) return;
    
    // Evitamos que el drag and drop del navegador interfiera
    e.dataTransfer.effectAllowed = 'move';
    
    // Usar una imagen transparente como drag image para evitar la imagen predeterminada
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    
    const compRect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - compRect.left,
      y: e.clientY - compRect.top
    });
    
    // Almacenar el ID del componente
    e.dataTransfer.setData('component-id', component.id);
    e.currentTarget.style.opacity = '0.5';
    
    // IMPORTANTE: También almacenar en window.__dragData para los contenedores
    window.__dragData = {
      id: component.id,
      type: component.type,
      source: 'canvas',
      component: component // Incluir todo el componente
    };
    
    // Seleccionar el componente durante el arrastre si no está seleccionado
    if (!selectedComponent || selectedComponent.id !== component.id) {
      setSelectedComponent(component);
    }
    
    setIsDragging(true);
    // No es un componente nuevo, es un componente existente
    setIsDraggingNewComponent(false);
  };

  // Guías de distancia - OPTIMIZADAS
  const calculateDistanceGuidelines = useCallback((draggedRect, containerRect, compWidth, compHeight) => {
    const distances = [];
    const alignThreshold = 8; // Aumentar para menos sensibilidad
    const borderThreshold = 80; // Aumentar para menos spam
    
    const draggedCenterX = draggedRect.left + compWidth / 2;
    const draggedCenterY = draggedRect.top + compHeight / 2;
  
    // Solo mostrar distancias a componentes cercanos (optimización)
    components.forEach((other) => {
      if (!other.id || other.id === draggedRect.id) return;
      
      const otherRect = getComponentRect(other.id);
      if (!otherRect) return;
      
      const otherLeft = otherRect.left - containerRect.left;
      const otherTop = otherRect.top - containerRect.top;
      const otherWidth = otherRect.width;
      const otherHeight = otherRect.height;
      const otherCenterX = otherLeft + otherWidth / 2;
      const otherCenterY = otherTop + otherHeight / 2;
  
      // Solo mostrar si están relativamente alineados
      if (Math.abs(draggedCenterX - otherCenterX) < alignThreshold) {
        // Componente arriba del otro
        if (draggedRect.bottom <= otherTop) {
          const gap = otherTop - draggedRect.bottom;
          if (gap > 5 && gap < 200) { // Solo distancias útiles
            distances.push({
              x: draggedCenterX,
              y: draggedRect.bottom + gap / 2,
              text: `${Math.round(gap)}px`,
              orientation: 'vertical'
            });
          }
        }
        // Componente abajo del otro
        else if (draggedRect.top >= otherTop + otherHeight) {
          const gap = draggedRect.top - (otherTop + otherHeight);
          if (gap > 5 && gap < 200) {
            distances.push({
              x: draggedCenterX,
              y: otherTop + otherHeight + gap / 2,
              text: `${Math.round(gap)}px`,
              orientation: 'vertical'
            });
          }
        }
      }
      
      // Solo mostrar si están relativamente alineados
      if (Math.abs(draggedCenterY - otherCenterY) < alignThreshold) {
        // Componente a la izquierda del otro
        if (draggedRect.right <= otherLeft) {
          const gap = otherLeft - draggedRect.right;
          if (gap > 5 && gap < 200) {
            distances.push({
              x: draggedRect.right + gap / 2,
              y: draggedCenterY,
              text: `${Math.round(gap)}px`,
              orientation: 'horizontal'
            });
          }
        }
        // Componente a la derecha del otro
        else if (draggedRect.left >= otherLeft + otherWidth) {
          const gap = draggedRect.left - (otherLeft + otherWidth);
          if (gap > 5 && gap < 200) {
            distances.push({
              x: otherLeft + otherWidth + gap / 2,
              y: draggedCenterY,
              text: `${Math.round(gap)}px`,
              orientation: 'horizontal'
            });
          }
        }
      }
    });
  
    // Distancias a los bordes (solo si están cerca)
    const gapLeft = draggedRect.left;
    const gapTop = draggedRect.top;
    const gapRight = containerRect.width - draggedRect.right;
    const gapBottom = containerRect.height - draggedRect.bottom;
    
    if (gapLeft < borderThreshold && gapLeft > 5) {
      distances.push({
        x: gapLeft / 2,
        y: draggedCenterY,
        text: `${Math.round(gapLeft)}px`,
        orientation: 'horizontal'
      });
    }
    
    if (gapTop < borderThreshold && gapTop > 5) {
      distances.push({
        x: draggedCenterX,
        y: gapTop / 2,
        text: `${Math.round(gapTop)}px`,
        orientation: 'vertical'
      });
    }
    
    if (gapRight < borderThreshold && gapRight > 5) {
      distances.push({
        x: draggedRect.right + gapRight / 2,
        y: draggedCenterY,
        text: `${Math.round(gapRight)}px`,
        orientation: 'horizontal'
      });
    }
    
    if (gapBottom < borderThreshold && gapBottom > 5) {
      distances.push({
        x: draggedCenterX,
        y: draggedRect.bottom + gapBottom / 2,
        text: `${Math.round(gapBottom)}px`,
        orientation: 'vertical'
      });
    }
  
    return distances;
  }, [components]);

  // Manejo de arrastre - OPTIMIZADO con guidelines restauradas
  const handleDrag = useCallback(throttle((e, component) => {
    if (!containerRef.current || !e.clientX || !e.clientY) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const compEl = componentRefs.current.get(component.id);
    if (!compEl) return;
    
    const compRect = compEl.getBoundingClientRect();
    const compWidth = compRect.width;
    const compHeight = compRect.height;
    
    // Calcular nueva posición
    let newLeft = e.clientX - containerRect.left - dragOffset.x;
    let newTop = e.clientY - containerRect.top - dragOffset.y;
    
    // Mantener dentro del contenedor
    newLeft = Math.max(0, Math.min(newLeft, containerRect.width - compWidth));
    newTop = Math.max(0, Math.min(newTop, containerRect.height - compHeight));
    
    // RESTAURAR snap al centro (optimizado)
    const compCenterX = newLeft + compWidth / 2;
    const compCenterY = newTop + compHeight / 2;
    const contCenterX = containerRect.width / 2;
    const contCenterY = containerRect.height / 2;
    const threshold = 8;
    
    let verticals = [], horizontals = [];
    
    // Snap al centro del contenedor
    if (Math.abs(compCenterX - contCenterX) < threshold) {
      newLeft = contCenterX - compWidth / 2;
      verticals.push(contCenterX);
    }
    
    if (Math.abs(compCenterY - contCenterY) < threshold) {
      newTop = contCenterY - compHeight / 2;
      horizontals.push(contCenterY);
    }
    
    // Snap básico a otros componentes (solo centros)
    components.forEach(other => {
      if (other.id === component.id) return;
      
      const otherEl = componentRefs.current.get(other.id);
      if (!otherEl) return;
      
      const otherRect = otherEl.getBoundingClientRect();
      const otherLeft = otherRect.left - containerRect.left;
      const otherTop = otherRect.top - containerRect.top;
      const otherWidth = otherRect.width;
      const otherHeight = otherRect.height;
      const otherCenterX = otherLeft + otherWidth / 2;
      const otherCenterY = otherTop + otherHeight / 2;
      
      // Solo snap al centro (más rápido)
      if (Math.abs(compCenterX - otherCenterX) < threshold && verticals.length === 0) {
        newLeft = otherCenterX - compWidth / 2;
        verticals.push(otherCenterX);
      }
      
      if (Math.abs(compCenterY - otherCenterY) < threshold && horizontals.length === 0) {
        newTop = otherCenterY - compHeight / 2;
        horizontals.push(otherCenterY);
      }
    });
    
    // Actualizar guías
    setGuidelines({ vertical: verticals, horizontal: horizontals });
    
    // RESTAURAR guías de distancia (optimizadas)
    const draggedRect = {
      left: newLeft,
      top: newTop,
      right: newLeft + compWidth,
      bottom: newTop + compHeight,
      id: component.id
    };
    
    const distances = calculateDistanceGuidelines(draggedRect, containerRect, compWidth, compHeight);
    setDistanceGuidelines(distances);
    
    // Convertir a porcentajes
    const leftPercent = (newLeft / containerRect.width) * 100;
    const topPercent = (newTop / containerRect.height) * 100;
    
    // Actualizar posición
    onUpdatePosition(component.id, {
      top: `${topPercent.toFixed(2)}%`,
      left: `${leftPercent.toFixed(2)}%`
    });
  }, 16), [dragOffset, onUpdatePosition, components]); // 16ms = ~60fps

  const handleDragEnd = (e) => {
    
    // Restaurar la opacidad normal
    e.currentTarget.style.opacity = '1';
    
    // Limpiar dragData después de un pequeño delay
    setTimeout(() => {
      window.__dragData = null;
    }, 100);
    
    // Si no hay evento clientX/Y, es que se soltó fuera del canvas
    if (!e.clientX && !e.clientY) {
      // Limpiar guías y reset de estado
      setIsDragging(false);
      setGuidelines({ vertical: [], horizontal: [] });
      setDistanceGuidelines([]);
      return;
    }
    
    // No limpiamos las guías aquí para permitir que handleDrop
    // use la misma información de snap para la posición final
    setIsDragging(false);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // SIMPLIFICADO para mejor rendimiento
    const isNewComponent = window.__dragData && window.__dragData.source === 'sidebar';
    
    e.dataTransfer.dropEffect = isNewComponent ? 'copy' : 'move';
    
    // Solo actualizar estados si realmente cambiaron
    if (isNewComponent && !isDragOver) {
      setIsDragOver(true);
      setIsDraggingNewComponent(true);
    } else if (!isNewComponent && isDragOver) {
      setIsDragOver(false);
      setIsDraggingNewComponent(false);
    }
  }, [isDragOver]);
  
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo activar para componentes nuevos
    const isNewComponent = window.__dragData && window.__dragData.source === 'sidebar';
    if (isNewComponent) {
      setIsDragOver(true);
    }
    return false;
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo quitar el estado si realmente salimos del canvas y es un componente nuevo
    if (e.target === containerRef.current) {
      const isNewComponent = window.__dragData && window.__dragData.source === 'sidebar';
      if (isNewComponent) {
        setIsDragOver(false);
      }
    }
    
    return false;
  }, []);

  // Función para calcular posición con snap (utilizada por handleExistingComponentDrop)
  const calculatePositionWithSnap = (e, containerRect, compWidth, compHeight, ignoreId) => {
    let x = e.clientX - containerRect.left - dragOffset.x;
    let y = e.clientY - containerRect.top - dragOffset.y;
    
    // Mantener dentro del contenedor
    x = Math.max(0, Math.min(x, containerRect.width - compWidth));
    y = Math.max(0, Math.min(y, containerRect.height - compHeight));
    
    // Calcular posiciones centrales
    const compCenterX = x + compWidth / 2;
    const compCenterY = y + compHeight / 2;
    const contCenterX = containerRect.width / 2;
    const contCenterY = containerRect.height / 2;
    
    // Umbral para snap
    const threshold = 10;
    
    // Aplicar snap al centro del contenedor
    if (Math.abs(compCenterX - contCenterX) < threshold) {
      x = contCenterX - compWidth / 2;
    }
    
    if (Math.abs(compCenterY - contCenterY) < threshold) {
      y = contCenterY - compHeight / 2;
    }
    
    // Snap a otros componentes
    components.forEach(other => {
      if (other.id === ignoreId) return;
      
      const otherEl = componentRefs.current.get(other.id);
      if (!otherEl) return;
      
      const otherRect = otherEl.getBoundingClientRect();
      const otherLeft = otherRect.left - containerRect.left;
      const otherTop = otherRect.top - containerRect.top;
      const otherWidth = otherRect.width;
      const otherHeight = otherRect.height;
      const otherCenterX = otherLeft + otherWidth / 2;
      const otherCenterY = otherTop + otherHeight / 2;
      
      // Snap al centro horizontal de otro componente
      if (Math.abs(compCenterX - otherCenterX) < threshold) {
        x = otherCenterX - compWidth / 2;
      }
      
      // Snap al centro vertical de otro componente
      if (Math.abs(compCenterY - otherCenterY) < threshold) {
        y = otherCenterY - compHeight / 2;
      }
      
      // Snap a los bordes
      // Izquierda a derecha
      if (Math.abs((x + compWidth) - otherLeft) < threshold) {
        x = otherLeft - compWidth;
      }
      
      // Derecha a izquierda
      if (Math.abs(x - (otherLeft + otherWidth)) < threshold) {
        x = otherLeft + otherWidth;
      }
      
      // Arriba a abajo
      if (Math.abs((y + compHeight) - otherTop) < threshold) {
        y = otherTop - compHeight;
      }
      
      // Abajo a arriba
      if (Math.abs(y - (otherTop + otherHeight)) < threshold) {
        y = otherTop + otherHeight;
      }
    });
    
    return { x, y };
  };

  // Función para manejar archivo de imagen soltado
  const handleImageFileDrop = async (file, position) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    try {
      // Crear un ID único para la referencia de la imagen
      const imageId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const imageRef = `__IMAGE_REF__${imageId}`;
      
      // Crear una vista previa local
      const previewUrl = URL.createObjectURL(file);
      
      // Añadir un componente de imagen con la referencia temporal
      const newComponentId = onAddComponent('image', position, {
        content: imageRef, 
        style: {
          desktop: {
            _previewUrl: previewUrl,
            _tempFile: file
          },
          tablet: {
            _previewUrl: previewUrl,
            _tempFile: file
          },
          mobile: {
            _previewUrl: previewUrl,
            _tempFile: file
          }
        }
      });
      
    } catch (error) {
    }
  };

  // Función auxiliar para manejar drop de componentes existentes
  const handleExistingComponentDrop = (componentId, e, containerRect, position) => {
    // Obtener el componente
    const compEl = componentRefs.current.get(componentId);
    if (!compEl) return;
    
    // Obtener dimensiones
    const compRect = compEl.getBoundingClientRect();
    const compWidth = compRect.width;
    const compHeight = compRect.height;
    
    // Calcular posición con snap
    const { x, y } = calculatePositionWithSnap(
      e, containerRect, compWidth, compHeight, componentId
    );
    
    // Convertir a porcentajes con precisión
    const leftPercent = (x / containerRect.width) * 100;
    const topPercent = (y / containerRect.height) * 100;
    
    // Actualizar posición del componente
    onUpdatePosition(componentId, {
      top: `${topPercent.toFixed(2)}%`,
      left: `${leftPercent.toFixed(2)}%`
    });
    
    // Limpiar guías
    setGuidelines({ vertical: [], horizontal: [] });
    setDistanceGuidelines([]);
  };

  // Versión mejorada del manejo de drop para soportar imágenes
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    
    // Buscar si el drop es sobre algún componente
    const targetElement = e.target;
    let componentElement = targetElement;
    let foundComponent = null;
    
    // Buscar hacia arriba en el DOM hasta encontrar un componente
    while (componentElement && componentElement !== containerRef.current) {
      const componentId = componentElement.getAttribute('data-id');
      if (componentId) {
        foundComponent = components.find(c => c.id === componentId);
        if (foundComponent) {
          break;
        }
      }
      componentElement = componentElement.parentElement;
    }
    
    const dragData = window.__dragData;
    
    if (foundComponent && dragData) {
      if (foundComponent.type === 'container') {
        return;
      }
    }
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calcular posición base en porcentajes
    // Para componentes del sidebar, usar un offset centrado estimado
    const isSidebarDrag = window.__dragData && window.__dragData.source === 'sidebar';
    const offsetX = isSidebarDrag ? 50 : (dragOffset.x || 0); // 50px es aproximadamente la mitad del componente promedio
    const offsetY = isSidebarDrag ? 25 : (dragOffset.y || 0); // 25px para la altura
    
    const x = e.clientX - containerRect.left - offsetX;
    const y = e.clientY - containerRect.top - offsetY;
    const leftPercent = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
    const topPercent = Math.max(0, Math.min(100, (y / containerRect.height) * 100));
    
    const position = {
      top: `${topPercent.toFixed(2)}%`,
      left: `${leftPercent.toFixed(2)}%`
    };
    
    // CASO 1: Primero intentar con la variable global (más confiable)
    if (window.__dragData && window.__dragData.source === 'sidebar') {
      if (window.__dragData.type) {
        
        // Pasar todos los datos adicionales del componente (action, content, etc.)
        const componentData = {
          ...window.__dragData,
          position
        };
        
        // Llamar a onAddComponent con el tipo, posición y datos adicionales
        await onAddComponent(window.__dragData.type, position, componentData);
        
        // Limpiar la variable global y estados
        window.__dragData = null;
        setIsDragOver(false);
        setIsDraggingNewComponent(false);
        return;
      }
    } else if (window.__dragData === null) {
      return;
    } else {
    }
    
    // CASO 2: Si no hay datos globales, intentar con dataTransfer (respaldo)
    try {
      // Intentar múltiples formatos de datos
      let jsonData = e.dataTransfer.getData('application/json') ||
                    e.dataTransfer.getData('text/plain') ||
                    e.dataTransfer.getData('text');
      
      // Intentar con el tipo personalizado
      const componentType = e.dataTransfer.getData('component/sidebar');
      if (componentType) {
        await onAddComponent(componentType, position, {});
        setIsDragOver(false);
        setIsDraggingNewComponent(false);
        return;
      }
      
      if (jsonData) {
        const componentData = JSON.parse(jsonData);
        if (componentData.type) {
          // Pasar todos los datos del componente
          await onAddComponent(componentData.type, position, componentData);
          setIsDragOver(false);
          setIsDraggingNewComponent(false);
          return;
        }
      }
    } catch (error) {
    }
    
    // CASO 3: Componente existente arrastrado (dentro del canvas)
    const componentId = e.dataTransfer.getData('component-id');
    if (componentId) {
      
      // Verificar si se está soltando sobre un contenedor
      if (foundComponent && foundComponent.type === 'container') {
        // IMPORTANTE: Evitar que un contenedor se mueva dentro de sí mismo
        if (componentId === foundComponent.id) {
          handleExistingComponentDrop(componentId, e, containerRect, position);
          setIsDragOver(false);
          return;
        }
        
        // MOVER el componente al contenedor
        if (onMoveToContainer) {
          // Usar la función moveComponentToContainer que mueve sin duplicar
          onMoveToContainer(componentId, foundComponent.id, position);
          
          setIsDragOver(false);
          return;
        }
      } else {
        // Comportamiento normal: mover posición
        handleExistingComponentDrop(componentId, e, containerRect, position);
      }
      
      setIsDragOver(false);
      return;
    }
    
    // CASO 4: Archivo de imagen soltado directamente
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      
      // Verificar si es un archivo de imagen
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        handleImageFileDrop(item.getAsFile(), position);
        setIsDragOver(false);
        return;
      }
    }
    
    // Limpiar estado de drag over y variable global
    setIsDragOver(false);
    setIsDraggingNewComponent(false);
    window.__dragData = null;
  }, [onAddComponent, dragOffset]);

  // Movimiento con teclas de flecha - VERSIÓN CORREGIDA CON ESCAPE DE SNAP
  useEffect(() => {
    const handleArrowKey = (e) => {
      if (!selectedComponent) return;
      let dx = 0, dy = 0;
      
      switch (e.key) {
        case 'ArrowUp':
          dy = -arrowStep;
          lastDirection.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          dy = arrowStep;
          lastDirection.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          dx = -arrowStep;
          lastDirection.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          dx = arrowStep;
          lastDirection.current = { x: 1, y: 0 };
          break;
        default:
          return;
      }
      
      e.preventDefault();
      
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const compRect = getComponentRect(selectedComponent.id);
      if (!compRect) return;
      
      // Obtener las dimensiones reales del componente
      const compWidth = compRect.width;
      const compHeight = compRect.height;
      
      // Obtener la posición actual del componente
      const devicePosition = selectedComponent.position?.[deviceView] || {};
      const currentLeftPercent = parseFloat(devicePosition.left) || 0;
      const currentTopPercent = parseFloat(devicePosition.top) || 0;
      const currentLeftPx = (currentLeftPercent / 100) * containerRect.width;
      const currentTopPx = (currentTopPercent / 100) * containerRect.height;
      
      // Calcular la nueva posición en píxeles
      let newLeftPx = currentLeftPx + dx;
      let newTopPx = currentTopPx + dy;
      
      // Limitar la posición dentro del contenedor
      newLeftPx = Math.max(0, Math.min(newLeftPx, containerRect.width - compWidth));
      newTopPx = Math.max(0, Math.min(newTopPx, containerRect.height - compHeight));
      
      // Calcular centro del componente y contenedor
      const compCenterX = newLeftPx + compWidth / 2;
      const compCenterY = newTopPx + compHeight / 2;
      const contCenterX = containerRect.width / 2;
      const contCenterY = containerRect.height / 2;
      const threshold = 5;
      
      let didSnapX = false, didSnapY = false;
      let verticals = [], horizontals = [];
      
      // Comprobar si estamos intentando escapar de una posición de snap
      const isEscapingHorizontalSnap = 
        lastSnapPosition.current.x !== null && 
        lastDirection.current.x !== 0 && 
        (lastDirection.current.x > 0 ? compCenterX > lastSnapPosition.current.x : compCenterX < lastSnapPosition.current.x);
      
      const isEscapingVerticalSnap = 
        lastSnapPosition.current.y !== null && 
        lastDirection.current.y !== 0 && 
        (lastDirection.current.y > 0 ? compCenterY > lastSnapPosition.current.y : compCenterY < lastSnapPosition.current.y);
      
      // Snap al centro horizontal (solo si no estamos escapando)
      if (Math.abs(compCenterX - contCenterX) < threshold && !isEscapingHorizontalSnap) {
        newLeftPx = contCenterX - compWidth / 2;
        verticals.push(contCenterX);
        didSnapX = true;
        lastSnapPosition.current.x = contCenterX;
      }
      
      // Snap al centro vertical (solo si no estamos escapando)
      if (Math.abs(compCenterY - contCenterY) < threshold && !isEscapingVerticalSnap) {
        newTopPx = contCenterY - compHeight / 2;
        horizontals.push(contCenterY);
        didSnapY = true;
        lastSnapPosition.current.y = contCenterY;
      }
      
      // Si no hicimos snap en esta iteración, limpiar la posición de snap guardada
      if (!didSnapX && dx !== 0) {
        lastSnapPosition.current.x = null;
      }
      if (!didSnapY && dy !== 0) {
        lastSnapPosition.current.y = null;
      }
      
      // Snap a otros componentes (solo si no estamos escapando)
      components.forEach(other => {
        if (other.id === selectedComponent.id) return;
        
        const otherRect = getComponentRect(other.id);
        if (!otherRect) return;
        
        const otherLeft = otherRect.left - containerRect.left;
        const otherTop = otherRect.top - containerRect.top;
        const otherWidth = otherRect.width;
        const otherHeight = otherRect.height;
        const otherCenterX = otherLeft + otherWidth / 2;
        const otherCenterY = otherTop + otherHeight / 2;
        
        // Snap al centro horizontal de otro componente
        if (Math.abs(compCenterX - otherCenterX) < threshold && !isEscapingHorizontalSnap && !didSnapX) {
          newLeftPx = otherCenterX - compWidth / 2;
          verticals.push(otherCenterX);
          didSnapX = true;
          lastSnapPosition.current.x = otherCenterX;
        }
        
        // Snap al centro vertical de otro componente
        if (Math.abs(compCenterY - otherCenterY) < threshold && !isEscapingVerticalSnap && !didSnapY) {
          newTopPx = otherCenterY - compHeight / 2;
          horizontals.push(otherCenterY);
          didSnapY = true;
          lastSnapPosition.current.y = otherCenterY;
        }
      });
      
      // Actualizar guidelines
      setGuidelines({
        vertical: verticals,
        horizontal: horizontals
      });
      
      // Guías de distancia
      const draggedRect = {
        left: newLeftPx,
        top: newTopPx,
        right: newLeftPx + compWidth,
        bottom: newTopPx + compHeight,
        id: selectedComponent.id
      };
      
      const distances = calculateDistanceGuidelines(draggedRect, containerRect, compWidth, compHeight);
      setDistanceGuidelines(distances);
      
      // Convertir a porcentajes con alta precisión
      const newLeftPercent = (newLeftPx / containerRect.width) * 100;
      const newTopPercent = (newTopPx / containerRect.height) * 100;
      
      // Actualizar posición
      onUpdatePosition(selectedComponent.id, {
        top: `${newTopPercent.toFixed(2)}%`,
        left: `${newLeftPercent.toFixed(2)}%`
      });
      
      // Indicar movimiento con flechas
      setIsArrowMoving(true);
      if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
      arrowTimerRef.current = setTimeout(() => {
        setIsArrowMoving(false);
        setGuidelines({ vertical: [], horizontal: [] });
        setDistanceGuidelines([]);
      }, 800);
    };

    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
  }, [selectedComponent, arrowStep, deviceView, onUpdatePosition, components]);

  // Panel de control para configuración de pasos
  const ControlPanel = () => (
    <div className="bg-white p-2 mb-4 rounded shadow-sm flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="arrow-step" className="text-xs font-medium text-gray-700">
          Paso de movimiento:
        </label>
        <select 
          id="arrow-step"
          value={arrowStep}
          onChange={(e) => setArrowStep(parseInt(e.target.value))}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="1">1px</option>
          <option value="5">5px</option>
          <option value="10">10px</option>
          <option value="20">20px</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <label htmlFor="resize-step" className="text-xs font-medium text-gray-700">
          Paso de redimensionamiento:
        </label>
        <select 
          id="resize-step"
          value={resizeStep}
          onChange={(e) => setResizeStep(parseInt(e.target.value))}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="1">1px</option>
          <option value="5">5px</option>
          <option value="10">10px</option>
          <option value="20">20px</option>
        </select>
      </div>
    </div>
  );

  // Determinar si necesitamos contenedor con scroll para móvil/tablet
  const needsScrollContainer = deviceView === 'mobile' || deviceView === 'tablet';

  return (
    <div className={`flex flex-col flex-1 h-full device-${deviceView}`}>
      {/* Panel de control de pasos - SIEMPRE arriba */}
      <ControlPanel />
      
      {/* Indicador de dispositivo - FUERA del canvas, en header fijo */}
      {needsScrollContainer && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span>
              {deviceView === 'mobile' ? '📱' : '🖥️'}
            </span>
            <span className="font-medium text-blue-900">
              {DEVICE_REAL_DIMENSIONS[deviceView].name}
            </span>
            <span className="text-blue-600">
              {DEVICE_REAL_DIMENSIONS[deviceView].width}×{DEVICE_REAL_DIMENSIONS[deviceView].height}px
            </span>
            <span className="text-green-600 font-medium">
              (Tamaño real)
            </span>
          </div>
          <div className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
            Vista optimizada • Scroll habilitado
          </div>
        </div>
      )}
      
      <div 
        className={`relative flex-1 bg-gray-100 ${needsScrollContainer ? 'mobile-tablet-container p-5' : 'overflow-visible p-4'}`}
        style={{
          // NUEVA UX: Scrollbars cuando el canvas es muy grande para móvil/tablet
          ...(needsScrollContainer && {
            overflow: 'auto',
            height: 'calc(100vh - 250px)' // Altura fija para scroll
          })
        }}
        onClick={(e) => {
          // Si se hizo clic directamente en este contenedor (y no en sus hijos)
          if (e.target === e.currentTarget) {
            setSelectedComponent(null);
          }
        }}
      >
      
      
      <div
        ref={containerRef}
        className={`banner-container ${getLayoutClasses()}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={containerStyle}
        onClick={(e) => {
          // Mejorar detección de clics en áreas vacías
          // Verificar si el clic fue en el contenedor o en un elemento específico
          const isSpecificElement = e.target.closest('[data-component-id]') || 
                                   e.target.closest('[data-id]') ||
                                   e.target.closest('.banner-component') ||
                                   e.target.closest('.cursor-move') ||
                                   e.target.tagName === 'BUTTON';
          
          // Si no fue en ningún elemento específico, deseleccionar
          if (!isSpecificElement) {
            setSelectedComponent(null);
          }
        }}
      >
        {/* Mensaje cuando no hay componentes */}
        {components.length === 0 && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <Box size={48} className="mx-auto" />
              </div>
              <p className="text-gray-500 text-lg font-medium">
                Arrastra componentes aquí
              </p>
              <p className="text-gray-400 text-sm mt-1">
                desde el panel lateral
              </p>
            </div>
          </div>
        )}
        
        {/* Indicador visual cuando se está arrastrando un componente NUEVO desde el sidebar */}
        {isDragOver && isDraggingNewComponent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="text-center bg-blue-100 bg-opacity-90 p-8 rounded-lg">
              <div className="text-blue-600 mb-2">
                <Box size={48} className="mx-auto animate-pulse" />
              </div>
              <p className="text-blue-700 text-lg font-semibold">
                Suelta aquí para agregar
              </p>
            </div>
          </div>
        )}
        
        {components.filter(component => !component.parentId).map((component) => {
          // Obtener posición para el dispositivo actual  
          const devicePos = component.position?.[deviceView] || {};
          
          return (
            <div
              key={component.id}
              data-id={component.id}
              data-component-type={component.type}
              className="cursor-move"
              style={{ 
                position: 'absolute',
                top: devicePos.top !== undefined ? devicePos.top : '0%',
                left: devicePos.left !== undefined ? devicePos.left : '0%',
                overflow: 'visible',
                zIndex: 1000
              }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from bubbling to container
                setSelectedComponent(component);
              }}
              ref={(el) => {
                if (el) {
                  componentRefs.current.set(component.id, el);
                }
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, component)}
              onDrag={(e) => handleDrag(e, component)}
              onDragEnd={handleDragEnd}
            >
              <ComponentRenderer
                component={component}
                deviceView={deviceView}
                isSelected={component.id === selectedComponent?.id}
                onDelete={onDeleteComponent}
                onUpdateContent={onUpdateContent}
                onUpdateStyle={(id, styleProps) => onUpdateStyle(id, styleProps)}
                onUpdateChildStyle={onUpdateChildStyle} // NUEVA PROP para hijos
                resizeStep={resizeStep}
                onSelect={setSelectedComponent}
                onUpdate={onUpdateContent}
                onAddChild={onAddChild}
                onSelectChild={setSelectedComponent}
                selectedComponent={selectedComponent}
                onRemoveChild={onRemoveChild}
                onUpdateChildPosition={onUpdateChildPosition}
                isPreview={false} // Modo editor
                onUnattach={onUnattachFromContainer}
                onReorderChildren={onReorderChildren} // CORREGIDO: Usar la prop pasada correctamente
                onMoveToContainer={onMoveToContainer} // Agregar la prop para mover a contenedores
                allComponents={components}
                clientInfo={clientInfo}
              />
            </div>
          );
        })}
        
        {/* Guías de alineación - RESTAURADAS */}
        {(isDragging || isArrowMoving) && guidelines.vertical.length > 0 &&
          guidelines.vertical.map((v, i) => (
            <div
              key={`vg-${i}`}
              className="absolute bg-blue-500 opacity-60"
              style={{
                left: `${v}px`,
                top: 0,
                bottom: 0,
                width: '2px',
                pointerEvents: 'none',
                zIndex: 9999,
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.8)'
              }}
            />
          ))}
          
        {(isDragging || isArrowMoving) && guidelines.horizontal.length > 0 &&
          guidelines.horizontal.map((h, i) => (
            <div
              key={`hg-${i}`}
              className="absolute bg-blue-500 opacity-60"
              style={{
                top: `${h}px`,
                left: 0,
                right: 0,
                height: '2px',
                pointerEvents: 'none',
                zIndex: 9999,
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.8)'
              }}
            />
          ))}
          
        {/* Guías de distancia - MEJORADAS */}
        {(isDragging || isArrowMoving) &&
          distanceGuidelines.map((d, i) => (
            <div
              key={`dg-${i}`}
              style={{
                position: 'absolute',
                left: `${d.x}px`,
                top: `${d.y}px`,
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                padding: '3px 6px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '4px',
                pointerEvents: 'none',
                zIndex: 10000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap'
              }}
            >
              {d.text}
            </div>
          ))}
      </div>
      </div>
      
      {/* Branding fuera del área editable */}
      {bannerConfig?.showBranding !== false && (
        <div className="bg-gray-50 border-t px-4 py-2 text-center text-xs text-gray-600">
          Desarrollado por{' '}
          <a 
            href="https://cookie21.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Cookie21
          </a>
        </div>
      )}
    </div>
  );
}

export default React.memo(BannerCanvas, (prevProps, nextProps) => {
  // Optimización: Solo re-renderizar si cambian propiedades importantes
  return (
    prevProps.deviceView === nextProps.deviceView &&
    prevProps.snapToGrid === nextProps.snapToGrid &&
    prevProps.gridSize === nextProps.gridSize &&
    prevProps.showGuides === nextProps.showGuides &&
    prevProps.hideGuidelines === nextProps.hideGuidelines &&
    prevProps.bannerConfig === nextProps.bannerConfig &&
    prevProps.components?.length === nextProps.components?.length &&
    JSON.stringify(prevProps.components) === JSON.stringify(nextProps.components) &&
    prevProps.selectedComponent?.id === nextProps.selectedComponent?.id
  );
});