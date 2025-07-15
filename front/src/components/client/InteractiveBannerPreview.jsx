import React, { useState, useRef, useCallback, useMemo,useEffect  } from 'react';
import { ImageOff, Move, RotateCcw } from 'lucide-react';
import { getImageUrl, processImageStyles } from '../../utils/imageProcessing';
import { useDragAndDrop } from '../banner/Editor/hooks/useDragAndDrop';

function InteractiveBannerPreview({ 
  bannerConfig = { layout: { desktop: {} }, components: [] }, 
  deviceView = 'desktop',
  height = 'auto',
  onUpdateComponent = null
}) {
  const [imageErrors, setImageErrors] = useState({});
  const [localUpdates, setLocalUpdates] = useState({});
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const bannerContainerRef = useRef(null);
  
  // SIMPLIFICADO: Detectar Step 3 basado en props o contexto simple
  const [isInStep3Context, setIsInStep3Context] = useState(false);
  
  // Detectar si estamos en Step 3 de forma simple
  useEffect(() => {
    // Verificar una sola vez al montar el componente
    const step3Element = document.querySelector('.border-2.border-dashed.border-gray-300');
    setIsInStep3Context(!!step3Element);
  }, []); // Solo ejecutar una vez al montar
  
  // Memoizar handlers de hover para evitar re-renders infinitos
  const handleMouseEnter = useCallback((componentId) => {
    setHoveredComponent(componentId);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredComponent(null);
  }, []);
  
  // Usar el hook de drag and drop mejorado
  const {
    isDragging,
    setIsDragging,
    snapEnabled,
    setSnapEnabled,
    guidelines,
    setGuidelines,
    distanceGuidelines,
    setDistanceGuidelines,
    dragData,
    calculateSnapPoints,
    calculateDistanceGuidelines
  } = useDragAndDrop(true);
  
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  
  // Refs para persistir datos durante el ciclo de vida del drag
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const localUpdatesRef = useRef({});

  // Sincronizar localUpdates con su ref
  React.useEffect(() => {
    localUpdatesRef.current = localUpdates;
  }, [localUpdates]);

  // Este useEffect se moverá después de la declaración de validateMultipleContainers

  // Limpiar errores de imagen cuando cambia la configuración del banner - REMOVIDO para evitar re-renders
  // Este useEffect causaba re-renders cuando bannerConfig cambiaba constantemente
  // React.useEffect(() => {
  //   setImageErrors({});
  // }, [bannerConfig]);
  
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Función de adaptación inteligente de tamaños mejorada
  const convertPercentageToPixels = useCallback((styleObj, referenceContainer, isChildComponent = false) => {
    if (!referenceContainer || !styleObj) return styleObj;
    
    const converted = { ...styleObj };
    
    try {
      const containerRect = referenceContainer.getBoundingClientRect();
      
      // CRÍTICO: Para componentes hijos, usar las dimensiones internas del contenedor (descontando padding)
      let referenceWidth = containerRect.width;
      let referenceHeight = containerRect.height;
      
      if (isChildComponent) {
        // Obtener padding del contenedor padre para calcular área interna disponible
        const computedStyle = window.getComputedStyle(referenceContainer);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        
        // Área interna disponible para los hijos
        referenceWidth = containerRect.width - paddingLeft - paddingRight;
        referenceHeight = containerRect.height - paddingTop - paddingBottom;
      }
      
      // SIMPLIFICADO: Conversión directa de width
      if (converted.width && typeof converted.width === 'string' && converted.width.includes('%')) {
        let percentValue = parseFloat(converted.width);
        
        // Para hijos, limitar al 98% para evitar desbordamiento
        if (isChildComponent && percentValue > 98) {
          percentValue = 98;
        }
        
        const pixelValue = (percentValue * referenceWidth) / 100;
        converted.width = `${Math.round(pixelValue)}px`;
      }
      
      // SIMPLIFICADO: Conversión directa de height
      if (converted.height && typeof converted.height === 'string' && converted.height.includes('%')) {
        let percentValue = parseFloat(converted.height);
        
        // Para hijos, limitar al 95% para dejar espacio
        if (isChildComponent && percentValue > 95) {
          percentValue = 95;
        }
        
        const pixelValue = (percentValue * referenceHeight) / 100;
        converted.height = `${Math.round(pixelValue)}px`;
      }
      
      // ELIMINADO: Ya no necesitamos tamaños mínimos porque el template viene pre-procesado
      
      // Convertir propiedades de posición (left, right, top, bottom)
      ['left', 'right', 'top', 'bottom'].forEach(prop => {
        if (converted[prop] && typeof converted[prop] === 'string' && converted[prop].includes('%')) {
          let percentValue = parseFloat(converted[prop]);
          if (isChildComponent && percentValue > 95) percentValue = 95;
          const isHorizontalProp = prop === 'left' || prop === 'right';
          const pixelValue = (percentValue * (isHorizontalProp ? referenceWidth : referenceHeight)) / 100;
          converted[prop] = `${Math.round(pixelValue)}px`;
        }
      });
      
    } catch (error) {
      console.error('Error en convertPercentageToPixels:', error);
    }
    
    return converted;
  }, []);

  // Función para validar y corregir posiciones/tamaños de múltiples contenedores
  const validateMultipleContainers = useCallback((components, deviceView, applyCorrections = false) => {
    const containers = components.filter(comp => comp.type === 'container' && !comp.parentId);
    
    if (containers.length <= 1) {
      return components; // No hay múltiples contenedores, no necesita validación
    }

    console.log(`🏗️ InteractiveBannerPreview: Validando ${containers.length} contenedores múltiples (aplicar correcciones: ${applyCorrections})`);
    
    // Debug: Mostrar información de contenedores antes de validar
    containers.forEach((container, index) => {
      const position = container.position?.[deviceView] || {};
      const style = container.style?.[deviceView] || {};
      console.log(`📋 Contenedor ${index + 1} (${container.id}):`, {
        originalLeft: position.left,
        originalWidth: style.width,
        calculatedWidth: typeof style.width === 'string' && style.width.includes('%') ? parseFloat(style.width) : 'unknown'
      });
    });
    
    const correctedComponents = [...components];
    let totalWidthUsed = 0;
    let availableLeft = 0;
    const corrections = [];
    const minGap = 0; // CRÍTICO: Sin espacio entre contenedores para que estén perfectamente pegados
    
    // Ordenar contenedores por posición left para procesamiento secuencial
    const sortedContainers = containers
      .map(container => {
        const position = container.position?.[deviceView] || {};
        const style = container.style?.[deviceView] || {};
        const leftValue = parseFloat(position.left) || 0;
        return { container, leftValue, position, style };
      })
      .sort((a, b) => a.leftValue - b.leftValue);
    
    sortedContainers.forEach(({ container, leftValue, position, style }, index) => {
      const containerIndex = correctedComponents.findIndex(comp => comp.id === container.id);
      
      // Obtener ancho del contenedor
      let containerWidth = 100; // Default 100% si no está definido
      if (style.width) {
        if (typeof style.width === 'string' && style.width.includes('%')) {
          containerWidth = parseFloat(style.width);
        } else {
          // Convertir píxeles a porcentaje (asumiendo banner de 400px como base)
          const pixelWidth = parseFloat(style.width);
          containerWidth = (pixelWidth / 400) * 100;
        }
      }
      
      // Verificar si hay solapamiento o exceso
      // Agregar gap si no es el primer contenedor
      const proposedLeft = index > 0 ? availableLeft + minGap : availableLeft;
      const proposedRight = proposedLeft + containerWidth;
      
      if (proposedRight > 100) {
        // Si excede 100%, reducir el ancho proporcionalmente
        const maxPossibleWidth = Math.max(10, 100 - proposedLeft); // Mínimo 10% de ancho
        const scaleFactor = maxPossibleWidth / containerWidth;
        
        console.log(`⚠️ Contenedor ${container.id}: Reduciendo ancho de ${containerWidth}% a ${maxPossibleWidth}%`);
        
        // Registrar corrección para aplicar si es necesario
        corrections.push({
          id: container.id,
          type: 'style',
          style: { width: `${maxPossibleWidth.toFixed(1)}%` }
        });
        
        // Actualizar estilo con nuevo ancho
        correctedComponents[containerIndex] = {
          ...correctedComponents[containerIndex],
          style: {
            ...correctedComponents[containerIndex].style,
            [deviceView]: {
              ...correctedComponents[containerIndex].style?.[deviceView],
              width: `${maxPossibleWidth.toFixed(1)}%`
            }
          }
        };
        
        containerWidth = maxPossibleWidth;
      }
      
      // Actualizar posición para evitar solapamientos
      if (Math.abs(leftValue - proposedLeft) > 1) { // Solo si hay diferencia significativa
        console.log(`📍 Contenedor ${container.id}: Ajustando posición de ${leftValue}% a ${proposedLeft}%`);
        
        // Registrar corrección para aplicar si es necesario
        corrections.push({
          id: container.id,
          type: 'position',
          position: { left: `${proposedLeft.toFixed(1)}%` }
        });
        
        correctedComponents[containerIndex] = {
          ...correctedComponents[containerIndex],
          position: {
            ...correctedComponents[containerIndex].position,
            [deviceView]: {
              ...correctedComponents[containerIndex].position?.[deviceView],
              left: `${proposedLeft.toFixed(1)}%`
            }
          }
        };
      }
      
      // Actualizar disponibilidad para el siguiente contenedor
      availableLeft = proposedLeft + containerWidth;
      totalWidthUsed += containerWidth;
    });
    
    console.log(`🏗️ Validación completada: ${totalWidthUsed.toFixed(1)}% del ancho total utilizado`);
    
    // Aplicar correcciones a través del callback si se especifica
    if (applyCorrections && corrections.length > 0 && onUpdateComponent) {
      console.log(`🔧 Aplicando ${corrections.length} correcciones automáticas`);
      corrections.forEach(correction => {
        if (correction.type === 'style') {
          onUpdateComponent(correction.id, { style: { [deviceView]: correction.style } });
        } else if (correction.type === 'position') {
          onUpdateComponent(correction.id, { position: { [deviceView]: correction.position } });
        }
      });
    }
    
    return correctedComponents;
  }, []);

  // Auto-validar contenedores múltiples cuando cambian las configuraciones
  // DESHABILITADO TEMPORALMENTE para evitar loop infinito
  // React.useEffect(() => {
  //   if (!bannerConfig?.components || bannerConfig.components.length === 0) return;
  //   
  //   const containers = bannerConfig.components.filter(comp => comp.type === 'container' && !comp.parentId);
  //   if (containers.length > 1) {
  //     // Ejecutar validación con un pequeño delay para evitar múltiples ejecuciones
  //     const timeoutId = setTimeout(() => {
  //       validateMultipleContainers(bannerConfig.components, deviceView, false); // Solo validar, no aplicar correcciones
  //     }, 100);
  //     
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [bannerConfig?.components, deviceView, validateMultipleContainers, onUpdateComponent]);

  // Función simplificada para obtener URL de imagen
  const getImageUrlSimple = useCallback((component) => {
    try {
      // PRIORIDAD 1: Usar content directo (URL del servidor - más confiable)
      if (typeof component.content === 'string' && component.content.trim() !== '') {
        let contentUrl = component.content;
        
        // URLs del servidor (más estables)
        if (contentUrl.startsWith('http')) {
          console.log('✅ [InteractiveBannerPreview] Usando content URL del servidor:', contentUrl);
          return contentUrl;
        }
        
        // Construir URL completa para rutas del servidor
        if (contentUrl.startsWith('/templates/images/')) {
          const fullUrl = `http://localhost:3000${contentUrl}`;
          console.log('✅ [InteractiveBannerPreview] Construyendo URL desde content:', fullUrl);
          return fullUrl;
        }
        
        // Data URLs (base64) son estables
        if (contentUrl.startsWith('data:')) {
          return contentUrl;
        }
        
        // Para rutas relativas que contienen templates/images
        if (!contentUrl.startsWith('http') && !contentUrl.startsWith('blob:') && contentUrl.includes('templates/images')) {
          const fullUrl = `http://localhost:3000/${contentUrl}`;
          console.log('✅ [InteractiveBannerPreview] Construyendo URL relativa desde content:', fullUrl);
          return fullUrl;
        }
        
        // Si content no es __IMAGE_REF__ pero es una string válida
        if (!contentUrl.startsWith('__IMAGE_REF__') && contentUrl.length > 3) {
          console.log('⚠️ [InteractiveBannerPreview] Content no reconocido, intentando URL directa:', contentUrl);
          return contentUrl.startsWith('/') ? `http://localhost:3000${contentUrl}` : contentUrl;
        }
      }
      
      // PRIORIDAD 2: Usar _previewUrl como fallback
      if (component.style?.[deviceView]?._previewUrl) {
        const previewUrl = component.style[deviceView]._previewUrl;
        console.log('⚠️ [InteractiveBannerPreview] Usando _previewUrl como fallback:', previewUrl);
        return previewUrl;
      }
      
      // Placeholder por defecto
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlbjwvdGV4dD48L3N2Zz4=';
    } catch (error) {
      console.error('Error obteniendo URL de imagen:', error);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZjAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  }, [deviceView]);

  // Memoizar estilos del layout - USAR LAS MISMAS DIMENSIONES QUE BrowserSimulatorPreview
  const layoutStyles = useMemo(() => {
    const layout = bannerConfig.layout[deviceView] || {};
    
    // USAR LA MISMA FUNCIÓN QUE BrowserSimulatorPreview
    const getBrowserLayoutStyles = () => {
      const baseStyles = {
        backgroundColor: layout.backgroundColor || '#ffffff',
        width: layout.width || '100%',
        height: layout.height || 'auto'
        // ELIMINADO: minHeight - no usamos límites mínimos
      };
      
      if (layout.type === 'banner') {
        // Banner - USAR EXACTAMENTE LOS MISMOS ESTILOS QUE BrowserSimulatorPreview
        const style = {
          ...baseStyles,
          position: 'relative' // Solo cambiar position para el editor
        };
        // Aplicar las mismas dimensiones que BrowserSimulatorPreview
        if (layout.position === 'top') {
          style.width = '100%'; // Mismo que right: 0, left: 0
          style.height = baseStyles.height;
        } else if (layout.position === 'bottom') {
          style.width = '100%'; // Mismo que right: 0, left: 0
          style.height = baseStyles.height;
        } else if (layout.position === 'center') {
          style.width = '100%'; // Mismo que right: 0, left: 0
          style.height = baseStyles.height;
        }
        return style;
      } else if (layout.type === 'floating') {
        // Flotante - EXACTAMENTE COMO BrowserSimulatorPreview
        return {
          ...baseStyles,
          position: 'relative', // Solo cambiar position para el editor
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          padding: '16px'
          // No agregar zIndex en el editor
        };
      } else if (layout.type === 'modal') {
        // Modal - EXACTAMENTE COMO BrowserSimulatorPreview
        return {
          ...baseStyles,
          maxWidth: '600px',
          width: '90%',
          margin: '0 auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          padding: '24px',
          position: 'relative' // Solo cambiar position para el editor
          // No agregar zIndex en el editor
        };
      }
      return baseStyles;
    };
    
    const browserStyles = getBrowserLayoutStyles();
    
    // DEBUG: Verificar dimensiones del canvas interno
    console.log('📐 InteractiveBannerPreview layoutStyles:', {
      bannerType: layout.type,
      width: browserStyles.width,
      height: browserStyles.height,
      padding: browserStyles.padding,
      deviceView
      // ELIMINADO: minHeight, maxWidth - no usamos límites
    });
    
    // FORZAR LAS MISMAS DIMENSIONES QUE BrowserSimulatorPreview
    const finalStyles = {
      ...browserStyles,
      color: layout.color || '#000000',
      fontFamily: layout.fontFamily || 'system-ui, -apple-system, sans-serif',
      overflow: 'visible', // Permitir handles fuera del área
      boxSizing: 'border-box'
    };
    
    // SIMPLIFICADO: Solo dimensiones esenciales sin límites min/max
    if (layout.type === 'banner') {
      finalStyles.width = '100%';
      finalStyles.height = layout.height || 'auto';
      finalStyles.padding = '0'; // ELIMINADO: Sin padding para contenedores perfectamente alineados
    } else if (layout.type === 'modal') {
      finalStyles.width = '90%';
      finalStyles.height = layout.height || 'auto';
      finalStyles.padding = '24px';
    } else if (layout.type === 'floating') {
      finalStyles.width = layout.width || '350px';
      finalStyles.height = layout.height || 'auto';
      finalStyles.padding = '16px';
    }
    
    console.log('📐 InteractiveBannerPreview FINAL layoutStyles:', finalStyles);
    
    // ESCALADO ELIMINADO: Usar tamaños naturales igual que BrowserSimulatorPreview
    
    return finalStyles;
  }, [bannerConfig.layout, deviceView, isInStep3Context]);

  // Manejadores de mouse optimizados
  const handleMouseDown = useCallback((e, component, action) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onUpdateComponent) return;
    
    // Verificar si es hijo de contenedor y su modo
    const isChildOfContainer = component.parentId;
    
    if (isChildOfContainer) {
      const parentContainer = bannerConfig.components.find(c => c.id === component.parentId);
      const parentDisplayMode = parentContainer?.containerConfig?.[deviceView]?.displayMode || 'libre';
      
      // En flex/grid containers, solo permitir resize, no drag
      if (parentDisplayMode === 'flex' || parentDisplayMode === 'grid') {
        if (action === 'drag') {
          return; // No permitir dragging en contenedores flex/grid
        }
      }
    }

    const containerRect = bannerContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    
    if (action === 'drag') {
      // Obtener el elemento del componente
      const componentElement = e.currentTarget;
      const componentRect = componentElement.getBoundingClientRect();
      
      // Calcular el offset del mouse relativo al componente
      const offsetX = e.clientX - componentRect.left;
      const offsetY = e.clientY - componentRect.top;
      
      // Obtener la posición actual del componente relativa al contenedor
      const currentLeft = componentRect.left - containerRect.left;
      const currentTop = componentRect.top - containerRect.top;
      
      
      const newDragState = {
        id: component.id,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: offsetX,
        offsetY: offsetY,
        startLeft: currentLeft,
        startTop: currentTop
      };
      // console.log('🖱️ DRAG START:', newDragState);
      setDragState(newDragState);
      dragStateRef.current = newDragState; // Actualizar ref también
    } else if (action === 'resize') {
      const deviceStyle = component.style?.[deviceView] || {};
      const currentWidth = parseInt(deviceStyle.width || '200px');
      const currentHeight = parseInt(deviceStyle.height || '150px');
      
      const newResizeState = {
        id: component.id,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: currentWidth,
        startHeight: currentHeight
      };
      setResizeState(newResizeState);
      resizeStateRef.current = newResizeState; // Actualizar ref también
    }
  }, [onUpdateComponent, deviceView, bannerConfig.components]);

  // Usar mousemove global optimizado con requestAnimationFrame (como en el editor principal)
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  
  const handleGlobalMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !bannerContainerRef.current) return;
    
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    // Cancelar frame anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Usar requestAnimationFrame para optimización (como en el editor principal)
    animationFrameRef.current = requestAnimationFrame(() => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 16) return; // ~60fps
      lastUpdateTimeRef.current = now;
      
      const containerRect = bannerContainerRef.current.getBoundingClientRect();
      
      // Debug para ver las dimensiones reales del contenedor
      console.log('📏 Container actual dimensions:', {
        width: containerRect.width,
        height: containerRect.height,
        element: bannerContainerRef.current,
        computedHeight: window.getComputedStyle(bannerContainerRef.current).height,
        minHeight: window.getComputedStyle(bannerContainerRef.current).minHeight
      });
      
      if (dragState) {
        // Calcular la nueva posición usando el offset (como en el editor principal)
        const mouseRelativeX = e.clientX - containerRect.left;
        const mouseRelativeY = e.clientY - containerRect.top;
        
        let newLeft = mouseRelativeX - dragState.offsetX;
        let newTop = mouseRelativeY - dragState.offsetY;
      
        // Obtener el componente actual para conocer su tamaño
        const component = bannerConfig.components.find(c => c.id === dragState.id);
        if (!component) return;
        
        // Obtener el tamaño REAL del elemento DOM que se está arrastrando
        const draggedElement = document.querySelector(`[data-component-id="${dragState.id}"]`);
        let componentWidth, componentHeight;
        
        if (draggedElement) {
          const rect = draggedElement.getBoundingClientRect();
          componentWidth = rect.width;
          componentHeight = rect.height;
        
          // Aplicar snap si está habilitado
          if (snapEnabled) {
            // Obtener todos los componentes para snap
            const allElements = Array.from(bannerContainerRef.current.querySelectorAll('[data-component-id]'))
              .filter(el => el.dataset.componentId !== dragState.id);
            
            const snapResult = calculateSnapPoints(
              draggedElement,
              bannerContainerRef.current,
              allElements,
              { x: newLeft, y: newTop }
            );
            
            if (snapResult.snapped.x || snapResult.snapped.y) {
              console.log('🧲 Snap applied:', {
                original: { x: newLeft, y: newTop },
                snapped: snapResult.position,
                snapFlags: snapResult.snapped
              });
              newLeft = snapResult.position.x;
              newTop = snapResult.position.y;
              setGuidelines(snapResult.guidelines);
            } else {
              setGuidelines({ vertical: [], horizontal: [] });
            }
            
            // Calcular guías de distancia
            const draggedRect = {
              left: newLeft,
              top: newTop,
              right: newLeft + componentWidth,
              bottom: newTop + componentHeight,
              width: componentWidth,
              height: componentHeight,
              id: dragState.id
            };
            
            const distances = calculateDistanceGuidelines(draggedRect, containerRect, allElements);
            setDistanceGuidelines(distances);
          }
        } else {
          // Fallback al tamaño del estilo
          const componentStyle = component.style?.[deviceView] || {};
          componentWidth = parseInt(componentStyle.width || (component.type === 'image' ? '180px' : component.type === 'button' ? '130px' : '180px'));
          componentHeight = parseInt(componentStyle.height || (component.type === 'image' ? '135px' : component.type === 'button' ? '35px' : '90px'));
        }
        
        // USAR LA MISMA LÓGICA QUE RESIZE - containerRect directamente
        const safeMargin = 10; // Mismo margen que resize
        
        // Límites mínimos y máximos (igual que resize)
        const minX = safeMargin;
        const minY = safeMargin;
        const maxX = containerRect.width - componentWidth - safeMargin;
        const maxY = containerRect.height - componentHeight - safeMargin;
        
        // Aplicar límites directamente
        const finalLeft = Math.max(minX, Math.min(newLeft, maxX));
        const finalTop = Math.max(minY, Math.min(newTop, maxY));
        
        console.log('📐 Drag limits (like resize):', {
          containerSize: { width: containerRect.width, height: containerRect.height },
          componentSize: { width: componentWidth, height: componentHeight },
          limits: { minX, minY, maxX, maxY },
          newPosition: { left: newLeft, top: newTop },
          finalPosition: { left: finalLeft, top: finalTop }
        });
      
        // No necesitamos debug duplicado - ya está arriba
      
        // Actualización local inmediata para feedback visual
        const newLocalUpdate = {
          position: {
            [deviceView]: {
              left: `${finalLeft}px`,
              top: `${finalTop}px`
            }
          }
        };
        
        setLocalUpdates(prev => {
          const newUpdates = {
            ...prev,
            [dragState.id]: newLocalUpdate
          };
          localUpdatesRef.current = newUpdates; // Actualizar ref también
          return newUpdates;
        });
      }
    
    if (resizeState) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      // Obtener posición actual del componente
      const component = bannerConfig.components.find(c => c.id === resizeState.id);
      if (!component) return;
      
      const componentPos = component.position?.[deviceView] || {};
      const currentLeft = parseInt(componentPos.left || '0px');
      const currentTop = parseInt(componentPos.top || '0px');
      
      // SIMPLIFICADO: Solo límites del contenedor, sin límites mínimos artificiales
      const maxWidth = containerRect.width - currentLeft - 10;
      const maxHeight = containerRect.height - currentTop - 10;
      
      // Aplicar solo límites del contenedor
      const newWidth = Math.max(10, Math.min(maxWidth, resizeState.startWidth + deltaX)); // Mínimo absoluto de 10px
      const newHeight = Math.max(10, Math.min(maxHeight, resizeState.startHeight + deltaY)); // Mínimo absoluto de 10px
      
      // Debug para verificar que el resize funciona en ambas direcciones
      if (component.type === 'image') {
        console.log(`🔧 Resize imagen ${component.id}:`, {
          startSize: { w: resizeState.startWidth, h: resizeState.startHeight },
          delta: { x: deltaX, y: deltaY },
          limits: { maxWidth, maxHeight },
          newSize: { w: newWidth, h: newHeight },
          canShrink: newWidth < resizeState.startWidth || newHeight < resizeState.startHeight
        });
      }
      
      // Mantener aspect ratio para imágenes si es necesario
      let finalWidth = newWidth;
      let finalHeight = newHeight;
      
      if (component.type === 'image' && component.style?.[deviceView]?.aspectRatio) {
        const aspectRatio = parseFloat(component.style[deviceView].aspectRatio);
        // Ajustar basándose en el cambio más grande
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          finalHeight = finalWidth / aspectRatio;
        } else {
          finalWidth = finalHeight * aspectRatio;
        }
      }
      
      // Actualización local inmediata para feedback visual
      setLocalUpdates(prev => {
        const newUpdates = {
          ...prev,
          [resizeState.id]: {
            ...prev[resizeState.id],
            style: {
              [deviceView]: {
                width: `${Math.round(finalWidth)}px`,
                height: `${Math.round(finalHeight)}px`
              }
            }
          }
        };
        localUpdatesRef.current = newUpdates; // Actualizar ref también
        return newUpdates;
      });
      }
    });
  }, [dragState, resizeState, deviceView, bannerConfig.components]);

  const handleGlobalMouseUp = useCallback(() => {
    console.log('🖱️ MOUSE UP CALLED');
    if (!isDraggingRef.current) {
      console.log('❌ isDraggingRef.current is false, exiting');
      return;
    }
    
    console.log('✅ isDraggingRef is true, processing drag end');
    
    // Usar los refs en lugar del state para garantizar que tengamos los datos
    const currentDragState = dragStateRef.current;
    const currentResizeState = resizeStateRef.current;
    const currentLocalUpdates = localUpdatesRef.current;
    
    console.log('📊 Ref states:', {
      hasDragState: !!currentDragState,
      hasResizeState: !!currentResizeState,
      hasLocalUpdates: !!currentLocalUpdates,
      localUpdateKeys: currentLocalUpdates ? Object.keys(currentLocalUpdates) : []
    });
    
    // Enviar actualización final al componente padre
    if (currentDragState && onUpdateComponent) {
      console.log('✅ dragStateRef and onUpdateComponent exist');
      const localUpdate = currentLocalUpdates[currentDragState.id];
      console.log('🖱️ DRAG END:', { 
        dragState: currentDragState, 
        localUpdate, 
        allLocalUpdates: currentLocalUpdates 
      });
      if (localUpdate?.position) {
        console.log('📤 Enviando posición final:', {
          componentId: currentDragState.id,
          localPosition: localUpdate.position,
          pixelValues: localUpdate.position[deviceView]
        });
        console.log('🎯 ENVIANDO UPDATE DE POSICIÓN:', {
          componentId: currentDragState.id,
          position: localUpdate.position
        });
        onUpdateComponent(currentDragState.id, { position: localUpdate.position });
      } else {
        console.log('❌ NO hay posición local para enviar');
      }
    } else {
      console.log('❌ Missing dragStateRef or onUpdateComponent:', { 
        dragStateRef: !!currentDragState, 
        onUpdateComponent: !!onUpdateComponent 
      });
    }
    
    if (currentResizeState && onUpdateComponent) {
      const localUpdate = currentLocalUpdates[currentResizeState.id];
      if (localUpdate?.style) {
        onUpdateComponent(currentResizeState.id, { style: localUpdate.style });
      }
    }
    
    // Limpiar animationFrame pendiente
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Limpiar estados y refs
    setDragState(null);
    setResizeState(null);
    dragStateRef.current = null;
    resizeStateRef.current = null;
    
    // Limpiar localUpdates INMEDIATAMENTE después de enviar la actualización
    // Ya no necesitamos delay porque los refs permiten que la actualización se procese
    setLocalUpdates({});
    localUpdatesRef.current = {};
    
    setGuidelines({ vertical: [], horizontal: [] });
    setDistanceGuidelines([]);
    setIsDragging(false);
    isDraggingRef.current = false;
    
    // Limpiar flag de debug
    if (currentDragState) {
      const component = bannerConfig.components.find(c => c.id === currentDragState.id);
      if (component) {
        component._debugLogged = false;
      }
    }
  }, [onUpdateComponent, deviceView, bannerConfig.components]);

  // Eventos globales de mouse
  React.useEffect(() => {
    if (dragState || resizeState) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [dragState, resizeState, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Función para renderizar componentes optimizada
  const renderComponent = useCallback((component, parentContainerRef = null) => {
    if (!component) return null;
    
    const devicePos = component.position?.[deviceView] || {};
    const deviceStyle = component.style?.[deviceView] || {};
    
    // Procesar estilos de imagen si es necesario
    const processedStyle = component.type === 'image' ? 
      processImageStyles(component, deviceView) : 
      {...deviceStyle};

    // Aplicar actualizaciones locales SOLO durante drag/resize activo
    const isActivelyDragging = dragState?.id === component.id;
    const isActivelyResizing = resizeState?.id === component.id;
    const shouldUseLocalUpdates = isActivelyDragging || isActivelyResizing;
    
    const localUpdate = shouldUseLocalUpdates ? (localUpdates[component.id] || {}) : {};
    const localPosition = localUpdate.position?.[deviceView] || {};
    const localStyle = localUpdate.style?.[deviceView] || {};
    
    // Usar posición local SOLO si estamos arrastrando/redimensionando activamente
    const currentPosition = {
      left: localPosition.left || devicePos.left || '0px',
      top: localPosition.top || devicePos.top || '0px'
    };
    
    // Debug solo para ver posiciones de imágenes
    if (component.type === 'image' && !isActivelyDragging) {
      console.log(`🖼️ Image ${component.id} posición actual:`, {
        devicePos: devicePos,
        componentPosition: component.position?.[deviceView],
        shouldUseLocalUpdates,
        currentPosition
      });
    }
    
    // Debug para ver las posiciones de imágenes (comentado para reducir ruido)
    // if (component.type === 'image') {
    //   console.log(`🖼️ Image ${component.id} position:`, {
    //     localPosition,
    //     devicePos,
    //     currentPosition,
    //     hasLocalUpdates: !!localUpdate.position,
    //     componentPosition: component.position?.[deviceView]
    //   });
    // }
    
    // Debug para imágenes (solo una vez por drag)
    // if (component.type === 'image' && localPosition.left && !component._debugLogged) {
    //   console.log('🖼️ Image position update:', {
    //     componentId: component.id,
    //     localPosition,
    //     devicePos,
    //     currentPosition
    //   });
    //   component._debugLogged = true;
    // }

    // Convertir porcentajes a píxeles
    const isChildOfContainer = component.parentId;
    
    // Debug para verificar referencias de contenedor
    if (component.parentId) {
      const parentRect = parentContainerRef?.getBoundingClientRect();
      console.log(`🔍 Componente hijo ${component.id}:`, {
        parentId: component.parentId,
        parentContainerRef: !!parentContainerRef,
        parentRefElement: parentContainerRef?.tagName,
        parentDimensions: parentRect ? { width: parentRect.width, height: parentRect.height } : null,
        style: processedStyle
      });
    }
    
    // CRÍTICO: Si no tenemos parentContainerRef, buscar el contenedor padre en el DOM
    let effectiveParentRef = parentContainerRef;
    if (component.parentId && !effectiveParentRef) {
      effectiveParentRef = document.querySelector(`[data-component-id="${component.parentId}"]`);
      console.log(`🔍 Buscando contenedor padre ${component.parentId} en DOM:`, !!effectiveParentRef);
    }
    
    const convertedProcessedStyle = component.parentId && effectiveParentRef ? 
      convertPercentageToPixels(processedStyle, effectiveParentRef, true) : 
      bannerContainerRef.current ? 
        convertPercentageToPixels(processedStyle, bannerContainerRef.current, false) :
        processedStyle;
    
    // DEBUG: Mostrar estilos convertidos para ver de dónde vienen min-width/min-height
    if (component.id.includes('comp-') && convertedProcessedStyle) {
      console.log(`🔍 Estilos convertidos para ${component.id}:`, {
        original: processedStyle,
        converted: convertedProcessedStyle,
        hasMinWidth: 'minWidth' in convertedProcessedStyle,
        hasMinHeight: 'minHeight' in convertedProcessedStyle,
        minWidthValue: convertedProcessedStyle.minWidth,
        minHeightValue: convertedProcessedStyle.minHeight
      });
    }
    
    // Debug log para verificar tamaños finales aplicados (solo imágenes para no saturar)
    if (component.type === 'image' && convertedProcessedStyle.width && convertedProcessedStyle.height) {
      console.log(`📐 InteractiveBannerPreview: Tamaños finales para ${component.id}:`, {
        originalWidth: processedStyle.width,
        originalHeight: processedStyle.height,
        convertedWidth: convertedProcessedStyle.width,
        convertedHeight: convertedProcessedStyle.height,
        isChild: !!component.parentId
      });
    }

    // Determinar capacidades de interacción
    let parentDisplayMode = 'libre';
    if (isChildOfContainer) {
      const parentContainer = bannerConfig.components.find(c => c.id === component.parentId);
      parentDisplayMode = parentContainer?.containerConfig?.[deviceView]?.displayMode || 'libre';
    }

    const canDrag = onUpdateComponent && (!isChildOfContainer || parentDisplayMode === 'libre');
    const canResize = onUpdateComponent;
    const isInteractive = canDrag || canResize;

    // ELIMINADO: getAdaptiveSize ya no es necesario, usamos tamaños reales de los componentes

    // CRÍTICO: Limpiar min/max del estilo convertido
    const cleanedStyle = { ...convertedProcessedStyle };
    delete cleanedStyle.minWidth;
    delete cleanedStyle.maxWidth;
    delete cleanedStyle.minHeight;
    delete cleanedStyle.maxHeight;
    
    // SIMPLIFICADO: Usar la misma lógica que BrowserSimulatorPreview
    const baseStyles = isChildOfContainer ? {
      // HIJOS: Position static para flujo normal + eliminar márgenes
      ...cleanedStyle,
      ...(shouldUseLocalUpdates ? localStyle : {}),
      visibility: 'visible',
      opacity: hoveredComponent === component.id ? 0.95 : 1,
      position: 'static', // Explícitamente static
      top: undefined,
      left: undefined,
      right: undefined,
      bottom: undefined,
      transform: undefined,
      margin: 0, // CRÍTICO: Eliminar márgenes
      padding: 0, // CRÍTICO: Eliminar padding por defecto
      width: (shouldUseLocalUpdates ? localStyle.width : null) || convertedProcessedStyle.width || 'auto',
      height: (shouldUseLocalUpdates ? localStyle.height : null) || convertedProcessedStyle.height || 'auto',
      boxSizing: 'border-box',
      // Para componentes de texto, asegurar que se ajusten al contenedor
      ...(component.type === 'text' && {
        wordWrap: 'break-word',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      })
    } : {
      // RAÍZ: Position absolute para posicionamiento manual
      position: 'absolute',
      top: currentPosition.top,
      left: currentPosition.left,
      ...cleanedStyle,
      ...(shouldUseLocalUpdates ? localStyle : {}),
      transform: 'translate(0, 0)',
      willChange: 'transform',
      visibility: 'visible',
      opacity: isDragging && dragState?.id === component.id ? 0.9 : 1,
      boxSizing: 'border-box',
      margin: 0, // CRÍTICO: Eliminar márgenes de contenedores raíz
      padding: convertedProcessedStyle.padding || 0, // Mantener padding del estilo pero eliminar por defecto
      cursor: isDragging && dragState?.id === component.id ? 'grabbing' : (canDrag ? 'grab' : 'default')
    };

    // Contenido de texto
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

    // Renderizado por tipo de componente
    switch (component.type) {
      case 'text':
        return (
          <div 
            key={component.id}
            data-component-id={component.id}
            style={{
              ...baseStyles,
              cursor: isDragging && dragState?.id === component.id ? 'grabbing' : 
                      baseStyles.cursor || (canDrag ? 'grab' : 'default'),
              userSelect: 'none'
            }}
            onMouseDown={canDrag ? (e) => handleMouseDown(e, component, 'drag') : undefined}
            onMouseEnter={() => handleMouseEnter(component.id)}
            onMouseLeave={handleMouseLeave}
          >
            {displayContent}
            {/* Indicadores mejorados y resize handle para texto */}
            {isInteractive && (
              <>
                {/* Borde de selección con animación */}
                <div style={{
                  position: 'absolute',
                  inset: '-3px',
                  border: isDragging && dragState?.id === component.id ? 
                    '3px solid #3b82f6' : hoveredComponent === component.id ? 
                    '2px dashed #60a5fa' : '2px dashed #3b82f6',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isDragging && dragState?.id === component.id ? 
                    '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                }} />
                
                {/* Icono de movimiento */}
                {canDrag && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px',
                    fontSize: '10px',
                    opacity: hoveredComponent === component.id || isDragging ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}>
                    <Move size={8} />
                  </div>
                )}
                
                {canResize && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-8px',
                      right: '-8px',
                      width: isInStep3Context ? '18px' : '16px', // Ligeramente más grande en paso 3
                      height: isInStep3Context ? '18px' : '16px',
                      backgroundColor: '#3b82f6',
                      cursor: 'se-resize',
                      borderRadius: '3px',
                      border: `${isInStep3Context ? '3px' : '2px'} solid white`, // Borde más grueso en paso 3
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      zIndex: 15,
                      transition: 'all 0.2s ease',
                      transform: hoveredComponent === component.id ? 'scale(1.2)' : 'scale(1)' // Escala ligeramente mayor
                    }}
                    onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
                  />
                )}
              </>
            )}
          </div>
        );
        
      case 'button':
        return (
          <button
            key={component.id}
            data-component-id={component.id}
            onClick={(e) => e.preventDefault()}
            style={{ 
              ...baseStyles, 
              cursor: isDragging && dragState?.id === component.id ? 'grabbing' : 
                      baseStyles.cursor || (canDrag ? 'grab' : 'pointer'),
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
            onMouseDown={canDrag ? (e) => handleMouseDown(e, component, 'drag') : undefined}
            onMouseEnter={() => handleMouseEnter(component.id)}
            onMouseLeave={handleMouseLeave}
          >
            {displayContent}
            {/* Indicadores mejorados y resize handle para botón */}
            {isInteractive && (
              <>
                <div style={{
                  position: 'absolute',
                  inset: '-3px',
                  border: isDragging && dragState?.id === component.id ? 
                    '3px solid #3b82f6' : hoveredComponent === component.id ? 
                    '2px dashed #60a5fa' : '2px dashed #3b82f6',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isDragging && dragState?.id === component.id ? 
                    '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                }} />
                
                {canDrag && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px',
                    fontSize: '10px',
                    opacity: hoveredComponent === component.id || isDragging ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}>                        <Move size={8} />
                  </div>
                )}
                
                {canResize && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-8px',
                      right: '-8px',
                      width: isInStep3Context ? '18px' : '16px',
                      height: isInStep3Context ? '18px' : '16px',
                      backgroundColor: '#3b82f6',
                      cursor: 'se-resize',
                      borderRadius: '3px',
                      border: `${isInStep3Context ? '3px' : '2px'} solid white`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      zIndex: 15,
                      transition: 'all 0.2s ease',
                      transform: hoveredComponent === component.id ? 'scale(1.2)' : 'scale(1)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
                  />
                )}
              </>
            )}
          </button>
        );
        
      case 'image': {
        const imageUrl = getImageUrlSimple(component);
        const hasError = imageErrors[component.id];
        
        if (hasError) {
          return (
            <div 
              key={component.id}
              data-component-id={component.id}
              style={{
                ...baseStyles,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f8f8',
                border: '1px dashed #ccc',
                color: '#666',
                cursor: isDragging && dragState?.id === component.id ? 'grabbing' : 
                        baseStyles.cursor || (canDrag ? 'grab' : 'default'),
                userSelect: 'none',
                padding: '0',
                overflow: 'visible',
                pointerEvents: 'auto'
              }}
              onMouseDown={canDrag ? (e) => handleMouseDown(e, component, 'drag') : undefined}
              onMouseEnter={() => handleMouseEnter(component.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', pointerEvents: 'none' }}>
                <ImageOff size={24} style={{ color: '#999', marginBottom: '4px' }} />
                <span style={{ fontSize: '12px', textAlign: 'center' }}>Error al cargar imagen</span>
              </div>
              {/* Indicadores unificados para imagen con error */}
              {isInteractive && (
                <>
                  {/* Borde de selección con animación unificada */}
                  <div style={{
                    position: 'absolute',
                    inset: '-3px',
                    border: isDragging && dragState?.id === component.id ? 
                      '3px solid #ef4444' : hoveredComponent === component.id ? 
                      '2px dashed #f87171' : '2px dashed #ef4444',
                    borderRadius: '6px',
                    pointerEvents: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: isDragging && dragState?.id === component.id ? 
                      '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                  }} />
                  
                  {/* Icono de movimiento unificado */}
                  {canDrag && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '2px',
                      fontSize: '10px',
                      opacity: hoveredComponent === component.id || isDragging ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      pointerEvents: 'none',
                      zIndex: 20
                    }}>
                      <Move size={8} />
                    </div>
                  )}
                  
                  {/* Handle de resize unificado */}
                  {canResize && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        right: '-8px',
                        width: isInStep3Context ? '18px' : '16px',
                        height: isInStep3Context ? '18px' : '16px',
                        backgroundColor: '#ef4444',
                        cursor: 'se-resize',
                        borderRadius: '3px',
                        border: `${isInStep3Context ? '3px' : '2px'} solid white`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        zIndex: 15,
                        transition: 'all 0.2s ease',
                        transform: hoveredComponent === component.id ? 'scale(1.2)' : 'scale(1)'
                      }}
                      onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
                    />
                  )}
                </>
              )}
            </div>
          );
        }
        
        return (
          <div
            key={component.id}
            data-component-id={component.id}
            style={{
              ...baseStyles,
              cursor: isDragging && dragState?.id === component.id ? 'grabbing' : 
                      baseStyles.cursor || (canDrag ? 'grab' : 'default'),
              userSelect: 'none',
              padding: '0',
              overflow: 'visible',
              pointerEvents: 'auto'
            }}
            onMouseDown={canDrag ? (e) => handleMouseDown(e, component, 'drag') : undefined}
            onMouseEnter={() => handleMouseEnter(component.id)}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: convertedProcessedStyle.objectFit || 'contain',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
              onLoad={() => {
                // Limpiar error cuando la imagen carga exitosamente
                setImageErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors[component.id];
                  return newErrors;
                });
              }}
              onError={() => {
                // console.log('❌ Error al cargar imagen:', { componentId: component.id, imageUrl });
                setImageErrors(prev => ({
                  ...prev,
                  [component.id]: true
                }));
              }}
            />
            
            {/* Indicadores unificados de interacción para imagen */}
            {isInteractive && (
              <>
                {/* Borde de selección con animación unificada */}
                <div style={{
                  position: 'absolute',
                  inset: '-3px',
                  border: isDragging && dragState?.id === component.id ? 
                    '3px solid #10b981' : hoveredComponent === component.id ? 
                    '2px dashed #34d399' : '2px dashed #10b981',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isDragging && dragState?.id === component.id ? 
                    '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none'
                }} />
                
                {/* Icono de movimiento unificado */}
                {canDrag && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px',
                    fontSize: '10px',
                    opacity: hoveredComponent === component.id || isDragging ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}>
                    <Move size={8} />
                  </div>
                )}
                
                {/* Handle de resize unificado */}
                {canResize && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-8px',
                      right: '-8px',
                      width: isInStep3Context ? '18px' : '16px',
                      height: isInStep3Context ? '18px' : '16px',
                      backgroundColor: '#10b981',
                      cursor: 'se-resize',
                      borderRadius: '3px',
                      border: `${isInStep3Context ? '3px' : '2px'} solid white`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      zIndex: 15,
                      transition: 'all 0.2s ease',
                      transform: hoveredComponent === component.id ? 'scale(1.2)' : 'scale(1)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, component, 'resize')}
                  />
                )}
              </>
            )}
          </div>
        );
      }
      
      case 'container': {
        const containerChildren = component.children || [];
        const containerConfig = component.containerConfig?.[deviceView] || {};
        const displayMode = containerConfig.displayMode || 'libre';
        
        let containerLayoutStyles = {};
        
        if (displayMode === 'flex') {
          containerLayoutStyles = {
            display: 'flex',
            flexDirection: containerConfig.flexDirection || 'row',
            justifyContent: containerConfig.justifyContent || 'flex-start',
            alignItems: containerConfig.alignItems || 'stretch',
            gap: containerConfig.gap || '10px'
          };
        } else if (displayMode === 'grid') {
          containerLayoutStyles = {
            display: 'grid',
            gridTemplateColumns: containerConfig.gridTemplateColumns || 'repeat(2, 1fr)',
            gridTemplateRows: containerConfig.gridTemplateRows || 'auto',
            gap: containerConfig.gap || '10px',
            justifyItems: containerConfig.justifyItems || 'start',
            alignItems: containerConfig.alignItems || 'start'
          };
        }
        
        return (
          <div
            key={component.id}
            data-component-id={component.id}
            ref={(el) => {
              // Crear referencia dinámica para el contenedor
              component._containerRef = el;
              console.log(`📦 Container ${component.id} ref asignado:`, !!el);
            }}
            style={{
              ...baseStyles,
              ...containerLayoutStyles
              // CRÍTICO: No sobrescribir position - usar el que viene de baseStyles (absolute para raíz, undefined para hijos)
            }}
          >
            {containerChildren.map((child, index) => {
              if (typeof child === 'string') {
                const childComponent = bannerConfig.components.find(c => c.id === child);
                return childComponent ? renderComponent(childComponent, component._containerRef) : null;
              }
              return renderComponent(child, component._containerRef);
            })}
          </div>
        );
      }
      
      default:
        return null;
    }
  }, [
    deviceView, 
    localUpdates, 
    convertPercentageToPixels, 
    bannerConfig.components, 
    onUpdateComponent, 
    handleMouseDown, 
    imageErrors, 
    getImageUrlSimple,
    handleMouseEnter,
    handleMouseLeave,
    // Removido hoveredComponent de las dependencias para evitar re-renders infinitos
    dragState,
    resizeState,
    isDragging
  ]);

  return (
    <div style={{ height: 'auto', padding: '0', position: 'relative', overflow: 'visible' }}>
      {/* Toggle para snap - OCULTO para que coincida con vista real */}
      <div style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        zIndex: 30,
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        display: 'none' // OCULTO para coincidir con vista real
      }}>
        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapEnabled(e.target.checked)}
            style={{ margin: 0 }}
          />
          Guías inteligentes
        </label>
      </div>
      
      <div 
        ref={bannerContainerRef}
        data-banner-container="true"
        className="banner-container"
        style={{
          ...layoutStyles,
          userSelect: 'none',
          position: 'relative'
        }} 
      >
        {/* Guías de alineación */}
        {snapEnabled && (
          <>
            {/* Líneas verticales */}
            {guidelines.vertical.map((x, index) => (
              <div
                key={`v-${index}`}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: '0',
                  bottom: '0',
                  width: '1px',
                  backgroundColor: '#ef4444',
                  pointerEvents: 'none',
                  zIndex: 25,
                  opacity: 0.8
                }}
              />
            ))}
            
            {/* Líneas horizontales */}
            {guidelines.horizontal.map((y, index) => (
              <div
                key={`h-${index}`}
                style={{
                  position: 'absolute',
                  top: `${y}px`,
                  left: '0',
                  right: '0',
                  height: '1px',
                  backgroundColor: '#ef4444',
                  pointerEvents: 'none',
                  zIndex: 25,
                  opacity: 0.8
                }}
              />
            ))}
            
            {/* Etiquetas de distancia */}
            {distanceGuidelines.map((guide, index) => (
              <div
                key={`d-${index}`}
                style={{
                  position: 'absolute',
                  left: `${guide.x}px`,
                  top: `${guide.y}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  zIndex: 30,
                  whiteSpace: 'nowrap'
                }}
              >
                {guide.text}
              </div>
            ))}
          </>
        )}
        
        {(() => {
          // VALIDAR Y CORREGIR múltiples contenedores antes del filtrado
          const validatedComponents = validateMultipleContainers(bannerConfig.components || [], deviceView);
          const rootComponents = validatedComponents.filter(comp => !comp.parentId) || [];
          
          // ORDENAR POR POSICIÓN Y para mantener el orden visual correcto (como en BannerThumbnail)
          const sortedComponents = rootComponents.sort((a, b) => {
            const aTop = parseFloat(a.position?.[deviceView]?.top || '0');
            const bTop = parseFloat(b.position?.[deviceView]?.top || '0');
            return aTop - bTop;
          });
          
          return sortedComponents.map(comp => renderComponent(comp));
        })()}
      </div>
    </div>
  );
}

export default InteractiveBannerPreview;