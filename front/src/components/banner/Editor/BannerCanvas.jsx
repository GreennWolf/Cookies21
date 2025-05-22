import React, { useState, useRef, useEffect } from 'react';
import ComponentRenderer from './ComponentRenderer';

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
  onAddChild
}) {
  const { components = [], layout = {} } = bannerConfig;
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [guidelines, setGuidelines] = useState({ vertical: [], horizontal: [] });
  const [distanceGuidelines, setDistanceGuidelines] = useState([]);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [arrowStep, setArrowStep] = useState(5);
  const [isArrowMoving, setIsArrowMoving] = useState(false);
  const arrowTimerRef = useRef(null);
  const componentRefs = useRef(new Map());
  
  // Estado para controlar el paso de resize
  const [resizeStep, setResizeStep] = useState(5);
  
  // Referencias para el sistema de snap con teclas de flecha
  const lastSnapPosition = useRef({ x: null, y: null });
  const lastDirection = useRef({ x: 0, y: 0 });

  // Log cuando cambia la configuración del banner o el dispositivo
  useEffect(() => {
    console.log(`🖼️ Renderizando canvas para dispositivo ${deviceView}`);
    console.log(`   Layout:`, layout[deviceView]);
    console.log(`   ${components.length} componentes disponibles`);
  }, [bannerConfig, deviceView, layout, components.length]);

  const getComponentRect = (id) => {
    const el = componentRefs.current.get(id);
    return el ? el.getBoundingClientRect() : null;
  };

  // Estilos del contenedor basados en el layout
  const getContainerStyle = () => {
    const layoutConfig = layout[deviceView] || {};
    
    return {
      position: 'relative',
      backgroundColor: layoutConfig.backgroundColor || '#ffffff',
      width: layoutConfig.width || '100%',
      height: layoutConfig.height || 'auto',
      minHeight: layoutConfig.minHeight || '200px',
      border: '2px solid #3b82f6', // Cambiar a un borde azul más visible
      boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3)', // Añadir un efecto de sombra
      borderRadius: '4px', // Añadir un radio de borde suave
      overflow: 'visible',
    };
  };

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
    
    // Seleccionar el componente durante el arrastre si no está seleccionado
    if (!selectedComponent || selectedComponent.id !== component.id) {
      setSelectedComponent(component);
    }
    
    setIsDragging(true);
  };

  // Guías de distancia
  const calculateDistanceGuidelines = (draggedRect, containerRect, compWidth, compHeight) => {
    const distances = [];
    const alignThreshold = 5;
    const borderThreshold = 50;
    
    const draggedCenterX = draggedRect.left + compWidth / 2;
    const draggedCenterY = draggedRect.top + compHeight / 2;
  
    // Distancias entre componentes
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
  
      // Vertical (si centros X alineados)
      if (Math.abs(draggedCenterX - otherCenterX) < alignThreshold) {
        // Mostrar distancia entre componentes
        if (draggedRect.bottom < otherTop) {
          const gap = otherTop - draggedRect.bottom;
          distances.push({
            x: draggedCenterX,
            y: draggedRect.bottom + gap / 2,
            text: `${Math.round(gap)}px`,
            orientation: 'vertical'
          });
        }
        else if (draggedRect.top > otherTop + otherHeight) {
          const gap = draggedRect.top - (otherTop + otherHeight);
          distances.push({
            x: draggedCenterX,
            y: otherTop + otherHeight + gap / 2,
            text: `${Math.round(gap)}px`,
            orientation: 'vertical'
          });
        }
      }
      
      // Horizontal (si centros Y alineados)
      if (Math.abs(draggedCenterY - otherCenterY) < alignThreshold) {
        // Mostrar distancia entre componentes
        if (draggedRect.right < otherLeft) {
          const gap = otherLeft - draggedRect.right;
          distances.push({
            x: draggedRect.right + gap / 2,
            y: draggedCenterY,
            text: `${Math.round(gap)}px`,
            orientation: 'horizontal'
          });
        }
        else if (draggedRect.left > otherLeft + otherWidth) {
          const gap = draggedRect.left - (otherLeft + otherWidth);
          distances.push({
            x: otherLeft + otherWidth + gap / 2,
            y: draggedCenterY,
            text: `${Math.round(gap)}px`,
            orientation: 'horizontal'
          });
        }
      }
    });
  
    // Distancias a los bordes
    const gapLeft = draggedRect.left;
    const gapTop = draggedRect.top;
    const gapRight = containerRect.width - draggedRect.right;
    const gapBottom = containerRect.height - draggedRect.bottom;
    
    if (gapLeft < borderThreshold) {
      distances.push({
        x: gapLeft / 2,
        y: draggedCenterY,
        text: `${Math.round(gapLeft)}px`,
        orientation: 'horizontal'
      });
    }
    
    if (gapTop < borderThreshold) {
      distances.push({
        x: draggedCenterX,
        y: gapTop / 2,
        text: `${Math.round(gapTop)}px`,
        orientation: 'vertical'
      });
    }
    
    if (gapRight < borderThreshold) {
      distances.push({
        x: draggedRect.right + gapRight / 2,
        y: draggedCenterY,
        text: `${Math.round(gapRight)}px`,
        orientation: 'horizontal'
      });
    }
    
    if (gapBottom < borderThreshold) {
      distances.push({
        x: draggedCenterX,
        y: draggedRect.bottom + gapBottom / 2,
        text: `${Math.round(gapBottom)}px`,
        orientation: 'vertical'
      });
    }
  
    return distances;
  };

  // Manejo de arrastre
  const handleDrag = (e, component) => {
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
    
    // Calcular centro del componente
    const compCenterX = newLeft + compWidth / 2;
    const compCenterY = newTop + compHeight / 2;
    
    // Calcular centro del contenedor
    const contCenterX = containerRect.width / 2;
    const contCenterY = containerRect.height / 2;
    
    // Umbral para snap
    const threshold = 8;
    
    let snapX = false, snapY = false;
    let verticals = [], horizontals = [];
    
    // Snap al centro del contenedor horizontal
    if (Math.abs(compCenterX - contCenterX) < threshold) {
      newLeft = contCenterX - compWidth / 2;
      snapX = true;
      verticals.push(contCenterX);
    }
    
    // Snap al centro del contenedor vertical
    if (Math.abs(compCenterY - contCenterY) < threshold) {
      newTop = contCenterY - compHeight / 2;
      snapY = true;
      horizontals.push(contCenterY);
    }
    
    // Snap a otros componentes
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
      
      // Snap al centro horizontal de otro componente
      if (Math.abs(compCenterX - otherCenterX) < threshold && !snapX) {
        newLeft = otherCenterX - compWidth / 2;
        snapX = true;
        verticals.push(otherCenterX);
      }
      
      // Snap al centro vertical de otro componente
      if (Math.abs(compCenterY - otherCenterY) < threshold && !snapY) {
        newTop = otherCenterY - compHeight / 2;
        snapY = true;
        horizontals.push(otherCenterY);
      }
      
      // Snap a los bordes
      // Izquierda a derecha
      if (Math.abs((newLeft + compWidth) - otherLeft) < threshold && !snapX) {
        newLeft = otherLeft - compWidth;
        snapX = true;
        verticals.push(otherLeft);
      }
      
      // Derecha a izquierda
      if (Math.abs(newLeft - (otherLeft + otherWidth)) < threshold && !snapX) {
        newLeft = otherLeft + otherWidth;
        snapX = true;
        verticals.push(otherLeft + otherWidth);
      }
      
      // Arriba a abajo
      if (Math.abs((newTop + compHeight) - otherTop) < threshold && !snapY) {
        newTop = otherTop - compHeight;
        snapY = true;
        horizontals.push(otherTop);
      }
      
      // Abajo a arriba
      if (Math.abs(newTop - (otherTop + otherHeight)) < threshold && !snapY) {
        newTop = otherTop + otherHeight;
        snapY = true;
        horizontals.push(otherTop + otherHeight);
      }
    });
    
    // Actualizar guías visuales
    setGuidelines({
      vertical: verticals,
      horizontal: horizontals
    });
    
    // Guías de distancia
    const draggedRect = {
      left: newLeft,
      top: newTop,
      right: newLeft + compWidth,
      bottom: newTop + compHeight,
      id: component.id
    };
    
    const distances = calculateDistanceGuidelines(draggedRect, containerRect, compWidth, compHeight);
    setDistanceGuidelines(distances);
    
    // Convertir a porcentajes para posicionamiento con precisión
    const leftPercent = (newLeft / containerRect.width) * 100;
    const topPercent = (newTop / containerRect.height) * 100;
    
    // Actualizar posición en el componente con 2 decimales de precisión
    onUpdatePosition(component.id, {
      top: `${topPercent.toFixed(2)}%`,
      left: `${leftPercent.toFixed(2)}%`
    });
  };

  const handleDragEnd = (e) => {
    // Restaurar la opacidad normal
    e.currentTarget.style.opacity = '1';
    
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

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
      
      console.log(`✅ Componente de imagen creado con ID: ${newComponentId}`);
    } catch (error) {
      console.error("Error al procesar la imagen:", error);
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
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calcular posición base en porcentajes (se ajustará después si es necesario)
    const x = e.clientX - containerRect.left - (dragOffset.x || 0);
    const y = e.clientY - containerRect.top - (dragOffset.y || 0);
    const leftPercent = (x / containerRect.width) * 100;
    const topPercent = (y / containerRect.height) * 100;
    const position = {
      top: `${topPercent.toFixed(2)}%`,
      left: `${leftPercent.toFixed(2)}%`
    };
    
    // CASO 1: Intentar obtener datos JSON (componentes arrastrados desde el sidebar)
    try {
      let jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const componentData = JSON.parse(jsonData);
        if (componentData.type) {
          onAddComponent(componentData.type, position);
          return;
        }
      }
    } catch (error) {
      console.error("Error al procesar JSON:", error);
    }
    
    // CASO 2: Componente existente arrastrado (dentro del canvas)
    const componentId = e.dataTransfer.getData('component-id');
    if (componentId) {
      handleExistingComponentDrop(componentId, e, containerRect, position);
      return;
    }
    
    // CASO 3: Archivo de imagen soltado directamente
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      
      // Verificar si es un archivo de imagen
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        handleImageFileDrop(item.getAsFile(), position);
        return;
      }
    }
  };

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

  return (
    <div className="relative flex-1 bg-gray-100 overflow-visible p-4">
      {/* Panel de control de pasos */}
      <ControlPanel />
      
      <div
        ref={containerRef}
        className={`banner-container ${getLayoutClasses()}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={getContainerStyle()}
        onClick={() => setSelectedComponent(null)}
      >
        {components.map((component) => {
          // Obtener posición para el dispositivo actual
          const devicePos = component.position?.[deviceView] || {};
          
          return (
            <div
              key={component.id}
              data-id={component.id}
              className="cursor-move"
              style={{ 
                position: 'absolute',
                top: devicePos.top || '0%',
                left: devicePos.left || '0%',
                overflow: 'visible',
                zIndex: 1000
              }}
              onClick={(e) => {
                e.stopPropagation();
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
                onUpdateStyle={(id, styleProps) => onUpdateStyle(component.id, styleProps)}
                resizeStep={resizeStep}
              />
            </div>
          );
        })}
        
        {/* Guías de alineación */}
        {(isDragging || isArrowMoving) &&
          guidelines.vertical.map((v, i) => (
            <div
              key={`vg-${i}`}
              className="absolute bg-blue-500 opacity-50"
              style={{
                left: `${v}px`,
                top: 0,
                bottom: 0,
                width: '1px',
                pointerEvents: 'none',
                zIndex: 9999
              }}
            />
          ))}
          
        {(isDragging || isArrowMoving) &&
          guidelines.horizontal.map((h, i) => (
            <div
              key={`hg-${i}`}
              className="absolute bg-blue-500 opacity-50"
              style={{
                top: `${h}px`,
                left: 0,
                right: 0,
                height: '1px',
                pointerEvents: 'none',
                zIndex: 9999
              }}
            />
          ))}
          
        {/* Guías de distancia */}
        {(isDragging || isArrowMoving) &&
          distanceGuidelines.map((d, i) => (
            <div
              key={`dg-${i}`}
              style={{
                position: 'absolute',
                left: `${d.x}px`,
                top: `${d.y}px`,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '2px 4px',
                fontSize: '10px',
                borderRadius: '3px',
                pointerEvents: 'none',
                zIndex: 10000
              }}
            >
              {d.text}
            </div>
          ))}
      </div>
    </div>
  );
}

export default BannerCanvas;