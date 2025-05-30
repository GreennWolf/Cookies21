// /src/components/banner/Editor/hooks/useDragAndDrop.js
import { useState, useRef, useCallback } from 'react';

export function useDragAndDrop(initialSnapEnabled = true) {
  const [isDragging, setIsDragging] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(initialSnapEnabled);
  const [guidelines, setGuidelines] = useState({ vertical: [], horizontal: [] });
  const [distanceGuidelines, setDistanceGuidelines] = useState([]);
  const lastSnapPosition = useRef({ x: null, y: null });
  
  // Referencia para el componente arrastrado
  const dragData = useRef({
    component: null,
    element: null,
    offset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    lastDirection: { x: 0, y: 0 }
  });

  // Función mejorada para calcular puntos de snap y sus guías
  const calculateSnapPoints = useCallback((element, container, allComponents, position) => {
    if (!snapEnabled) return { position, guidelines: { vertical: [], horizontal: [] } };
    
    const snapThreshold = 10; // Umbral para snap en píxeles
    
    // Obtener dimensiones
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const compWidth = elementRect.width;
    const compHeight = elementRect.height;
    
    // Copia la posición para no modificar la original
    const newPosition = { ...position };
    
    // Puntos clave del componente (centro y bordes)
    const compCenterX = newPosition.x + compWidth / 2;
    const compCenterY = newPosition.y + compHeight / 2;
    const compRight = newPosition.x + compWidth;
    const compBottom = newPosition.y + compHeight;
    
    // Puntos clave del contenedor
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;
    
    const verticals = [];
    const horizontals = [];
    let snapX = false, snapY = false;
    
    // 1. ALINEACIÓN CON EL CONTENEDOR
    
    // Centro horizontal
    if (Math.abs(compCenterX - containerCenterX) < snapThreshold && !snapX) {
      newPosition.x = containerCenterX - compWidth / 2;
      verticals.push(containerCenterX);
      snapX = true;
    }
    
    // Centro vertical
    if (Math.abs(compCenterY - containerCenterY) < snapThreshold && !snapY) {
      newPosition.y = containerCenterY - compHeight / 2;
      horizontals.push(containerCenterY);
      snapY = true;
    }
    
    // Bordes del contenedor
    if (Math.abs(newPosition.x) < snapThreshold && !snapX) {
      newPosition.x = 0;
      verticals.push(0);
      snapX = true;
    }
    
    if (Math.abs(compRight - containerWidth) < snapThreshold && !snapX) {
      newPosition.x = containerWidth - compWidth;
      verticals.push(containerWidth);
      snapX = true;
    }
    
    if (Math.abs(newPosition.y) < snapThreshold && !snapY) {
      newPosition.y = 0;
      horizontals.push(0);
      snapY = true;
    }
    
    if (Math.abs(compBottom - containerHeight) < snapThreshold && !snapY) {
      newPosition.y = containerHeight - compHeight;
      horizontals.push(containerHeight);
      snapY = true;
    }
    
    // 2. ALINEACIÓN CON OTROS COMPONENTES
    if (allComponents && allComponents.length > 0) {
      allComponents.forEach(otherComp => {
        if (otherComp === element || !otherComp.getBoundingClientRect) return;
        
        const otherRect = otherComp.getBoundingClientRect();
        
        // Calcular posición relativa al contenedor
        const otherLeft = otherRect.left - containerRect.left;
        const otherTop = otherRect.top - containerRect.top;
        const otherWidth = otherRect.width;
        const otherHeight = otherRect.height;
        const otherRight = otherLeft + otherWidth;
        const otherBottom = otherTop + otherHeight;
        const otherCenterX = otherLeft + otherWidth / 2;
        const otherCenterY = otherTop + otherHeight / 2;
        
        // Centro a centro (prioridad alta)
        if (Math.abs(compCenterX - otherCenterX) < snapThreshold && !snapX) {
          newPosition.x = otherCenterX - compWidth / 2;
          verticals.push(otherCenterX);
          snapX = true;
        }
        
        if (Math.abs(compCenterY - otherCenterY) < snapThreshold && !snapY) {
          newPosition.y = otherCenterY - compHeight / 2;
          horizontals.push(otherCenterY);
          snapY = true;
        }
        
        // Alineación de bordes
        // Izquierda con izquierda
        if (Math.abs(newPosition.x - otherLeft) < snapThreshold && !snapX) {
          newPosition.x = otherLeft;
          verticals.push(otherLeft);
          snapX = true;
        }
        
        // Derecha con derecha
        if (Math.abs(compRight - otherRight) < snapThreshold && !snapX) {
          newPosition.x = otherRight - compWidth;
          verticals.push(otherRight);
          snapX = true;
        }
        
        // Superior con superior
        if (Math.abs(newPosition.y - otherTop) < snapThreshold && !snapY) {
          newPosition.y = otherTop;
          horizontals.push(otherTop);
          snapY = true;
        }
        
        // Inferior con inferior
        if (Math.abs(compBottom - otherBottom) < snapThreshold && !snapY) {
          newPosition.y = otherBottom - compHeight;
          horizontals.push(otherBottom);
          snapY = true;
        }
        
        // Derecha con izquierda (componentes adyacentes)
        if (Math.abs(compRight - otherLeft) < snapThreshold && !snapX) {
          newPosition.x = otherLeft - compWidth;
          verticals.push(otherLeft);
          snapX = true;
        }
        
        // Izquierda con derecha
        if (Math.abs(newPosition.x - otherRight) < snapThreshold && !snapX) {
          newPosition.x = otherRight;
          verticals.push(otherRight);
          snapX = true;
        }
        
        // Inferior con superior
        if (Math.abs(compBottom - otherTop) < snapThreshold && !snapY) {
          newPosition.y = otherTop - compHeight;
          horizontals.push(otherTop);
          snapY = true;
        }
        
        // Superior con inferior
        if (Math.abs(newPosition.y - otherBottom) < snapThreshold && !snapY) {
          newPosition.y = otherBottom;
          horizontals.push(otherBottom);
          snapY = true;
        }
      });
    }
    
    // Guardar las posiciones donde se aplicó snap
    if (snapX) lastSnapPosition.current.x = newPosition.x;
    if (snapY) lastSnapPosition.current.y = newPosition.y;
    
    return {
      position: newPosition,
      guidelines: { vertical: verticals, horizontal: horizontals },
      snapped: { x: snapX, y: snapY }
    };
  }, [snapEnabled]);

  // Función mejorada para calcular distancias entre componentes
  const calculateDistanceGuidelines = useCallback((draggedRect, containerRect, allComponents) => {
    if (!snapEnabled) return [];
    
    const distances = [];
    const alignThreshold = 5;
    const borderThreshold = 50;
    
    const draggedCenterX = draggedRect.left + draggedRect.width / 2;
    const draggedCenterY = draggedRect.top + draggedRect.height / 2;
  
    // Distancias entre componentes
    if (allComponents && allComponents.length > 0) {
      allComponents.forEach((otherComp) => {
        if (!otherComp || otherComp === draggedRect.id) return;
        
        try {
          const otherRect = otherComp.getBoundingClientRect();
          
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
        } catch (e) {
          console.error("Error calculando distancias:", e);
        }
      });
    }
    
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
  }, [snapEnabled]);

  return {
    isDragging,
    setIsDragging,
    snapEnabled,
    setSnapEnabled,
    guidelines,
    setGuidelines,
    distanceGuidelines,
    setDistanceGuidelines,
    dragData,
    lastSnapPosition,
    calculateSnapPoints,
    calculateDistanceGuidelines
  };
}