import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Move, Image as ImageIcon } from 'lucide-react';
import DropZoneIndicator from './DropZoneIndicator'; // FASE 4
import { 
  validateContainerDrop, 
  validateRealtimeDrag,
  calculateOptimalPosition, 
  generateChildId 
} from './containerDropValidation'; // FASE 4
import { 
  validateContainerResize, 
  recalculateChildrenPositions 
} from '../../../utils/containerResizeUtils'; // FASE 4 - Funciones de resize

// FASE 4 - Funciones básicas de validación (versión integrada temporalmente)
const calculateNestingDepth = (component, allComponents = [], currentDepth = 0) => {
  if (currentDepth > 10) return currentDepth; // Evitar loops infinitos
  
  if (!component.parentId) return currentDepth;
  
  const parent = allComponents.find(comp => comp.id === component.parentId);
  if (!parent) return currentDepth;
  
  return calculateNestingDepth(parent, allComponents, currentDepth + 1);
};

const getNestingLevelIndicator = (depth) => {
  const indicators = ['🔵', '🟢', '🟡', '🔴', '🟣'];
  const colors = ['blue', 'green', 'yellow', 'red', 'purple'];
  
  if (depth >= 5) return { icon: '⚠️', color: 'red', style: 'danger' };
  
  return {
    icon: indicators[depth] || '⬜',
    color: colors[depth] || 'gray',
    style: depth >= 4 ? 'warning' : 'normal'
  };
};

const formatNestingErrorMessage = (validationResult) => {
  if (validationResult.isValid) return '';
  return validationResult.reason || 'Error de anidamiento';
};

// Caché global para evitar recargar imágenes ya cargadas
const imageLoadCache = new Map();
// Caché de aspect ratios para mantener coherencia
const imageAspectRatioCache = new Map();

const ComponentRenderer = ({
  component,
  deviceView,
  isSelected,
  onDelete,
  onUpdateContent,
  onUpdateStyle,
  onAddChild, // NUEVA PROP - FASE 4: Para agregar componentes hijos a contenedores
  onSelectChild, // NUEVA PROP: Para seleccionar componentes hijos
  selectedComponent, // NUEVA PROP: Componente actualmente seleccionado
  onRemoveChild, // NUEVA PROP - FASE 4: Para quitar hijos del contenedor
  onUpdateChildPosition, // NUEVA PROP - FASE 4: Para actualizar posición de componentes hijos
  allComponents = [], // NUEVA PROP - FASE 4: Todos los componentes para validación de anidamiento
  resizeStep = 5
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  // Inicializamos imageLoaded en true si la URL ya está en caché
  const [imageLoaded, setImageLoaded] = useState(false);
  const previousImageUrlRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  

  // NUEVAS FUNCIONES - DRAG PARA COMPONENTES HIJOS: Manejar drag de componentes hijos
  const handleChildDragStart = useCallback((e, child, displayMode) => {
    e.stopPropagation(); // Evitar que se propague al contenedor padre
    
    if (displayMode !== 'libre') {
      // En modos flex/grid no permitir drag individual
      e.preventDefault();
      return;
    }
    
    console.log(`🎯 Iniciando drag del componente hijo ${child.id}`);
    
    // Configurar datos del drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('child-component-id', child.id);
    e.dataTransfer.setData('parent-container-id', component.id);
    
    // Usar imagen transparente
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    
    // Estilo visual durante drag
    e.currentTarget.style.opacity = '0.5';
    
    // Notificar que se está dragging un hijo
    document.dispatchEvent(new CustomEvent('child-drag-start', {
      detail: { childId: child.id, parentId: component.id }
    }));
  }, [component.id]);

  const handleChildDrag = useCallback((e, child) => {
    // Durante el drag, el canvas principal manejará la lógica de posicionamiento
    e.stopPropagation();
  }, []);

  const handleChildDragEnd = useCallback((e, child) => {
    e.stopPropagation();
    
    // Restaurar opacidad
    e.currentTarget.style.opacity = '1';
    
    console.log(`🎯 Finalizando drag del componente hijo ${child.id}`);
    
    // Notificar fin del drag
    document.dispatchEvent(new CustomEvent('child-drag-end', {
      detail: { childId: child.id, parentId: component.id }
    }));
  }, [component.id]);

  // Determinar URL actual de la imagen
  const getImageUrl = () => {
    // Si hay vista previa, usarla primero (usar deviceStyle original para metadatos)
    if (deviceStyle._previewUrl) {
      return deviceStyle._previewUrl;
    }
    
    // Si el contenido es string, verificar si es URL
    if (typeof component.content === 'string') {
      if (component.content.startsWith('data:image') || 
          component.content.startsWith('/') || 
          component.content.match(/^https?:\/\//)) {
        return component.content;
      }
    }
    
    // Si el contenido está en texts.en, verificar si es URL
    if (component.content?.texts?.en && typeof component.content.texts.en === 'string') {
      const enText = component.content.texts.en;
      if (enText.startsWith('data:image') || 
          enText.startsWith('/') || 
          enText.match(/^https?:\/\//)) {
        return enText;
      }
    }
    
    return null;
  };

  // Obtener aspect ratio de una imagen
  const getImageAspectRatio = (img) => {
    if (!img) return null;
    if (img.naturalWidth && img.naturalHeight && img.naturalHeight > 0) {
      return img.naturalWidth / img.naturalHeight;
    }
    return null;
  };

  // Verificar si la URL de la imagen ha cambiado realmente
  useEffect(() => {
    if (component.type === 'image') {
      const currentImageUrl = getImageUrl();
      
      // Si la URL es la misma, mantener el estado anterior
      if (previousImageUrlRef.current === currentImageUrl) {
        return;
      }
      
      // Si la URL es nueva, actualizar la referencia
      previousImageUrlRef.current = currentImageUrl;
      
      // Si la URL existe y está en caché, usar el estado de la caché
      if (currentImageUrl && imageLoadCache.has(currentImageUrl)) {
        setImageLoaded(true);
        setImageError(false);
        
        // Usar aspect ratio cacheado si existe
        if (imageAspectRatioCache.has(currentImageUrl)) {
          setAspectRatio(imageAspectRatioCache.get(currentImageUrl));
        }
      } else {
        // Solo resetear el estado si la URL realmente cambió
        setImageLoaded(false);
        setImageError(false);
        // No reseteamos aspect ratio aquí para evitar cambios bruscos
      }
    }
  }, [component, deviceView]);

  // Extract text from component based on its structure
  useEffect(() => {
    let displayText = '';
    
    if (typeof component.content === 'string') {
      displayText = component.content;
    } else if (component.content?.texts?.en) {
      displayText = component.content.texts.en;
    } else if (component.content?.text) {
      displayText = component.content.text;
    }
    
    setTempContent(displayText);
  }, [component.content, component.id]);

  // Gestión de carga de imagen y mantenimiento de aspect ratio
  const handleImageLoad = (e) => {
    if (!e.target) return;
    
    const img = e.target;
    setImageLoaded(true);
    setImageError(false);
    
    // Calcular y guardar aspect ratio
    const imgUrl = getImageUrl();
    if (imgUrl) {
      const newAspectRatio = getImageAspectRatio(img);
      if (newAspectRatio) {
        setAspectRatio(newAspectRatio);
        imageAspectRatioCache.set(imgUrl, newAspectRatio);
        
        // Si es una imagen nueva (no en caché), ajustar tamaño para mantener aspect ratio
        if (!imageLoadCache.has(imgUrl)) {
          imageLoadCache.set(imgUrl, true);
          
          // Solo ajustar tamaño si tenemos container y estilo definido
          if (containerRef.current && component.style?.[deviceView]) {
            const style = component.style[deviceView];
            const currentWidth = containerRef.current.clientWidth;
            
            // Si tenemos un ancho definido, ajustar altura para mantener aspect ratio
            if (currentWidth > 0) {
              const newHeight = Math.round(currentWidth / newAspectRatio);
              
              // Redondear al paso de resize más cercano
              const roundedHeight = Math.round(newHeight / resizeStep) * resizeStep;
              
              // Actualizar estilo
              containerRef.current.style.height = `${roundedHeight}px`;
              
              // Notificar cambio
              onUpdateStyle(component.id, {
                height: `${roundedHeight}px`
              });
            }
          }
        }
      }
    }
  };
  
  // Verificación inicial de tamaño para componentes de imagen
  useEffect(() => {
    if (component.type === 'image' && containerRef.current) {
      // Encontramos el banner container
      const bannerElement = containerRef.current.closest('.banner-container');
      if (!bannerElement) return;
      
      const maxWidth = bannerElement.clientWidth;
      const maxHeight = bannerElement.clientHeight;
      
      // Obtenemos dimensiones actuales o definimos valores predeterminados
      const style = component.style?.[deviceView] || {};
      let currentWidth = containerRef.current.clientWidth;
      let currentHeight = containerRef.current.clientHeight;
      
      // Si no hay dimensiones definidas, usamos los valores predeterminados
      if (!style.width || !style.height) {
        return; // Solo ajustamos si ya tiene dimensiones definidas
      }
      
      // Usar aspect ratio cacheado o calcularlo
      let currentAspectRatio = aspectRatio;
      const imgUrl = getImageUrl();
      
      // Si tenemos un aspect ratio cacheado para esta imagen, usarlo
      if (!currentAspectRatio && imgUrl && imageAspectRatioCache.has(imgUrl)) {
        currentAspectRatio = imageAspectRatioCache.get(imgUrl);
      }
      
      // Si no tenemos aspect ratio, usar el actual
      if (!currentAspectRatio && currentHeight > 0) {
        currentAspectRatio = currentWidth / currentHeight;
      }
      
      // Verificamos si excede los límites
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        // Mantener aspect ratio si está disponible
        if (currentAspectRatio) {
          newHeight = newWidth / currentAspectRatio;
        }
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        // Mantener aspect ratio si está disponible
        if (currentAspectRatio) {
          newWidth = newHeight * currentAspectRatio;
        }
      }
      
      // Solo actualizamos si las dimensiones cambiaron
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        // Redondear al paso de resize más cercano
        newWidth = Math.round(newWidth / resizeStep) * resizeStep;
        newHeight = Math.round(newHeight / resizeStep) * resizeStep;
        
        containerRef.current.style.width = `${newWidth}px`;
        containerRef.current.style.height = `${newHeight}px`;
        
        onUpdateStyle(component.id, {
          width: `${newWidth}px`,
          height: `${newHeight}px`
        });
      }
    }
  }, [component, deviceView, onUpdateStyle, resizeStep, aspectRatio]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (component.locked) return;
    
    if (component.type === 'text') {
      setIsEditing(true);
    }
  };

  const handleContentSave = () => {
    // Update content based on its current structure
    let updatedContent;
    
    if (typeof component.content === 'string') {
      updatedContent = tempContent;
    } else if (component.content && typeof component.content === 'object') {
      // Maintain structure but update English text
      updatedContent = {
        ...component.content,
        texts: {
          ...(component.content.texts || {}),
          en: tempContent
        }
      };
      
      // If it also has the text property (for compatibility), update it
      if ('text' in component.content) {
        updatedContent.text = tempContent;
      }
    }
    
    onUpdateContent(component.id, updatedContent);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleContentSave();
    }
    if (e.key === 'Escape') {
      // Restore original content
      let originalText = '';
      if (typeof component.content === 'string') {
        originalText = component.content;
      } else if (component.content?.texts?.en) {
        originalText = component.content.texts.en;
      } else if (component.content?.text) {
        originalText = component.content.text;
      }
      
      setTempContent(originalText);
      setIsEditing(false);
    }
  };



  const Controls = () => (
    <div
      className="absolute flex gap-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{
        zIndex: 9999,
        pointerEvents: 'auto',
        top: '-10px',
        right: '10px',
        transform: 'translate(50%, -50%)'
      }}
    >
      <button className="p-1 rounded bg-blue-500 text-white text-xs" title="Mover">
        <Move size={12} />
      </button>
      {!component.locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(component.id);
          }}
          className="p-1 rounded bg-red-500 text-white text-xs"
          title="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  // Usamos la propiedad keepAspectRatio del componente o defaulteamos a true para imágenes
  const keepAspectRatio = component.keepAspectRatio !== undefined ? component.keepAspectRatio : component.type === 'image';
  
  // RESIZE HANDLER - Mejorado para mantener aspect ratio, respetar tamaños mínimos
  // y reposicionar componentes que se saldrían del canvas
  // FASE 4: Con soporte mejorado para contenedores y recálculo automático de hijos
  const handleResizeStart = (e, forceKeepAspectRatio = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const startWidth = containerRef.current.clientWidth;
    const startHeight = containerRef.current.clientHeight;
    
    // FASE 4: Capturar información inicial para contenedores
    const isContainer = component.type === 'container';
    const originalContainerSize = isContainer ? { width: startWidth, height: startHeight } : null;
    
    // Determinar si mantener aspect ratio (basado en prop o estado)
    const shouldKeepAspectRatio = forceKeepAspectRatio !== null 
      ? forceKeepAspectRatio 
      : component.type === 'image' && keepAspectRatio;
    
    // Usamos el aspect ratio actual o lo calculamos
    const currentAspectRatio = shouldKeepAspectRatio 
      ? (aspectRatio || (startHeight > 0 ? startWidth / startHeight : null))
      : null;
    
    const startX = e.clientX;
    const startY = e.clientY; // También necesitamos la posición Y inicial

    // Obtenemos las dimensiones máximas del banner (contenedor padre)
    const bannerElement = containerRef.current.closest('.banner-container');
    if (!bannerElement) return;
    
    const maxWidth = bannerElement.clientWidth;
    const maxHeight = bannerElement.clientHeight;
    
    // Obtener la posición actual del componente
    const componentRect = containerRef.current.getBoundingClientRect();
    const bannerRect = bannerElement.getBoundingClientRect();
    
    // Calcular posición relativa al banner
    const componentLeft = componentRect.left - bannerRect.left;
    const componentTop = componentRect.top - bannerRect.top;

    // Paso de resize (usando el prop)
    const step = resizeStep || 5;

    // Definimos los tamaños mínimos según el tipo de componente
    let minWidth, minHeight;
    if (component.type === 'button') {
      minWidth = 80; // Mínimo para botones 
      minHeight = 30; // Altura mínima para botones
    } else if (component.type === 'text') {
      minWidth = 50; // Mínimo para textos
      minHeight = 20; // Altura mínima para textos
    } else if (component.type === 'container') {
      minWidth = 100; // Mínimo para contenedores
      minHeight = 50; // Altura mínima para contenedores
    } else if (component.type === 'image') {
      minWidth = 50; // Mínimo para imágenes
      minHeight = 50; // Altura mínima para imágenes
    } else {
      minWidth = 40; // Para otros componentes
      minHeight = 40;
    }

    // CORRECCIÓN: Obtener información de transformaciones para cálculos correctos
    const currentPosition = component.position?.[deviceView] || {};
    let leftOffset = 0;
    let topOffset = 0;
    
    if (currentPosition.transformX === 'center' || 
        (component.id === 'preferencesBtn' && currentPosition.left === '50%')) {
      leftOffset = startWidth / 2;
    } else if (currentPosition.transformX === 'right') {
      leftOffset = startWidth;
    }
    
    if (currentPosition.transformY === 'center' || 
        (component.id === 'preferencesBtn' && currentPosition.top === '50%')) {
      topOffset = startHeight / 2;
    } else if (currentPosition.transformY === 'bottom') {
      topOffset = startHeight;
    }

    function onMouseMove(moveEvent) {
      // Calculamos desplazamiento en ambos ejes para permitir redimensionar en cualquier dirección
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Determinamos si el redimensionamiento principal está basado en ancho o alto
      // El usuario puede estar moviendo más verticalmente que horizontalmente
      const useWidthAsPrimary = Math.abs(deltaX) >= Math.abs(deltaY);
      
      // Calculamos los nuevos valores candidatos para ancho y alto
      let candidateWidth, candidateHeight;
      
      if (useWidthAsPrimary) {
        // Redimensionamiento principalmente horizontal
        candidateWidth = Math.round((startWidth + deltaX) / step) * step;
        
        // Si tenemos aspect ratio, calculamos altura proporcionalmente
        if (currentAspectRatio && shouldKeepAspectRatio) {
          candidateHeight = Math.round((candidateWidth / currentAspectRatio) / step) * step;
        } else {
          // Sin aspect ratio, permitir cambio libre
          candidateHeight = Math.round((startHeight + deltaY) / step) * step;
        }
      } else {
        // Redimensionamiento principalmente vertical
        candidateHeight = Math.round((startHeight + deltaY) / step) * step;
        
        // Si tenemos aspect ratio, calculamos ancho proporcionalmente
        if (currentAspectRatio && shouldKeepAspectRatio) {
          candidateWidth = Math.round((candidateHeight * currentAspectRatio) / step) * step;
        } else {
          // Sin aspect ratio, permitir cambio libre
          candidateWidth = Math.round((startWidth + deltaX) / step) * step;
        }
      }
      
      // Aplicamos restricciones de tamaño mínimo
      candidateWidth = Math.max(minWidth, candidateWidth);
      candidateHeight = Math.max(minHeight, candidateHeight);

      // CORRECCIÓN: Calcular límites máximos considerando transformaciones y posición actual
      
      // Recalcular offsets con las nuevas dimensiones
      let newLeftOffset = leftOffset;
      let newTopOffset = topOffset;
      
      if (currentPosition.transformX === 'center') {
        newLeftOffset = candidateWidth / 2;
      } else if (currentPosition.transformX === 'right') {
        newLeftOffset = candidateWidth;
      }
      
      if (currentPosition.transformY === 'center') {
        newTopOffset = candidateHeight / 2;
      } else if (currentPosition.transformY === 'bottom') {
        newTopOffset = candidateHeight;
      }
      
      // Calcular la posición visual real
      const visualLeft = componentLeft - newLeftOffset;
      const visualTop = componentTop - newTopOffset;
      const visualRight = visualLeft + candidateWidth;
      const visualBottom = visualTop + candidateHeight;
      
      // Verificar límites visuales y ajustar tamaño si es necesario
      let adjustedWidth = candidateWidth;
      let adjustedHeight = candidateHeight;
      let needsRepositioning = false;
      let repositionInfo = {};
      
      // Limitar ancho si se sale visualmente por la derecha
      if (visualRight > maxWidth) {
        const maxAllowedWidth = maxWidth - visualLeft;
        if (maxAllowedWidth >= minWidth) {
          adjustedWidth = Math.max(minWidth, Math.round(maxAllowedWidth / step) * step);
          if (currentAspectRatio && shouldKeepAspectRatio) {
            adjustedHeight = Math.round((adjustedWidth / currentAspectRatio) / step) * step;
          }
          console.log(`🔧 Limitando ancho por derecha: ${candidateWidth}px → ${adjustedWidth}px`);
        } else {
          // Si no cabe, reposicionar
          needsRepositioning = true;
          const newComponentLeft = Math.max(0, maxWidth - candidateWidth + newLeftOffset);
          repositionInfo.left = `${Math.min(100, (newComponentLeft / maxWidth) * 100)}%`;
          repositionInfo.percentX = Math.min(100, (newComponentLeft / maxWidth) * 100);
        }
      }
      
      // Limitar ancho si se sale visualmente por la izquierda
      if (visualLeft < 0) {
        needsRepositioning = true;
        const newComponentLeft = Math.max(0, newLeftOffset);
        repositionInfo.left = `${(newComponentLeft / maxWidth) * 100}%`;
        repositionInfo.percentX = (newComponentLeft / maxWidth) * 100;
        console.log(`🔧 Reposicionando por izquierda: left=${repositionInfo.left}`);
      }
      
      // Limitar altura si se sale visualmente por abajo
      if (visualBottom > maxHeight) {
        const maxAllowedHeight = maxHeight - visualTop;
        if (maxAllowedHeight >= minHeight) {
          adjustedHeight = Math.max(minHeight, Math.round(maxAllowedHeight / step) * step);
          if (currentAspectRatio && shouldKeepAspectRatio) {
            adjustedWidth = Math.round((adjustedHeight * currentAspectRatio) / step) * step;
          }
          console.log(`🔧 Limitando altura por abajo: ${candidateHeight}px → ${adjustedHeight}px`);
        } else {
          // Si no cabe, reposicionar
          needsRepositioning = true;
          const newComponentTop = Math.max(0, maxHeight - candidateHeight + newTopOffset);
          repositionInfo.top = `${Math.min(100, (newComponentTop / maxHeight) * 100)}%`;
          repositionInfo.percentY = Math.min(100, (newComponentTop / maxHeight) * 100);
        }
      }
      
      // Limitar altura si se sale visualmente por arriba
      if (visualTop < 0) {
        needsRepositioning = true;
        const newComponentTop = Math.max(0, newTopOffset);
        repositionInfo.top = `${(newComponentTop / maxHeight) * 100}%`;
        repositionInfo.percentY = (newComponentTop / maxHeight) * 100;
        console.log(`🔧 Reposicionando por arriba: top=${repositionInfo.top}`);
      }
      
      // Aplicar reposicionamiento si es necesario
      if (needsRepositioning && Object.keys(repositionInfo).length > 0) {
        console.log(`🔧 Reposicionando ${component.type} ${component.id} durante resize:`, repositionInfo);
        // Usar requestAnimationFrame para evitar problemas de sincronización
        requestAnimationFrame(() => {
          bannerElement.dispatchEvent(new CustomEvent('component:position', {
            detail: {
              id: component.id,
              position: repositionInfo
            }
          }));
        });
      }
      
      // Usar las dimensiones ajustadas
      candidateWidth = adjustedWidth;
      candidateHeight = adjustedHeight;

      // FASE 4: Validación especial para contenedores
      if (isContainer && originalContainerSize) {
        const newContainerSize = { width: candidateWidth, height: candidateHeight };
        const validation = validateContainerResize(component, newContainerSize, deviceView);
        
        if (!validation.isValid && validation.adjustedSize) {
          // Usar tamaño ajustado si es necesario
          candidateWidth = validation.adjustedSize.width;
          candidateHeight = validation.adjustedSize.height;
          console.log(`🔧 Tamaño de contenedor ajustado: ${validation.reason}`);
        }
      }

      // Aplicamos los cambios de tamaño
      containerRef.current.style.width = `${candidateWidth}px`;
      containerRef.current.style.height = `${candidateHeight}px`;

      // Actualizamos el estilo en el estado del componente
      onUpdateStyle(component.id, {
        width: `${candidateWidth}px`,
        height: `${candidateHeight}px`
      });
    }

    function onMouseUp() {
      // FASE 4: Recalcular posiciones de hijos para contenedores después del resize
      if (isContainer && originalContainerSize && containerRef.current) {
        const finalWidth = containerRef.current.clientWidth;
        const finalHeight = containerRef.current.clientHeight;
        const finalSize = { width: finalWidth, height: finalHeight };
        
        // Solo recalcular si realmente cambió el tamaño
        if (finalWidth !== originalContainerSize.width || finalHeight !== originalContainerSize.height) {
          console.log(`🔄 Recalculando posiciones de hijos para contenedor ${component.id}`);
          console.log(`Tamaño original: ${originalContainerSize.width}x${originalContainerSize.height}`);
          console.log(`Tamaño final: ${finalWidth}x${finalHeight}`);
          
          // Recalcular posiciones de los hijos
          const updatedChildren = recalculateChildrenPositions(
            component, 
            originalContainerSize, 
            finalSize, 
            deviceView
          );
          
          // Si hay cambios en las posiciones de los hijos, notificar
          if (updatedChildren.length > 0 && updatedChildren !== component.children) {
            // Usar el mecanismo existente para actualizar el contenedor con nuevos hijos
            if (typeof onUpdateStyle === 'function') {
              // Enviar evento personalizado para actualizar hijos
              setTimeout(() => {
                const event = new CustomEvent('container:children-updated', {
                  detail: {
                    containerId: component.id,
                    children: updatedChildren,
                    deviceView: deviceView
                  }
                });
                document.dispatchEvent(event);
              }, 100);
            }
          }
        }
      }
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Get device-specific styles 
  const deviceStyle = component.style?.[deviceView] || {};
  
  // CORRECCIÓN: Convertir porcentajes a píxeles usando el canvas como referencia
  const convertedDeviceStyle = { ...deviceStyle };
  
  // Obtener dimensiones del canvas
  const getCanvasSize = () => {
    try {
      const componentEl = containerRef.current;
      if (!componentEl) return null;
      
      const bannerContainer = componentEl.closest('.banner-container');
      if (!bannerContainer) return null;
      
      const containerRect = bannerContainer.getBoundingClientRect();
      return {
        width: containerRect.width,
        height: containerRect.height
      };
    } catch (error) {
      return null;
    }
  };
  
  // Función para verificar y reposicionar componente si se sale del canvas
  const checkAndRepositionComponent = (dimension, newSize, canvasSize) => {
    try {
      if (!containerRef.current || !component.id) return;
      
      const componentEl = containerRef.current;
      const bannerContainer = componentEl.closest('.banner-container');
      if (!bannerContainer) return;
      
      // Obtener posición actual del componente
      const componentRect = componentEl.getBoundingClientRect();
      const containerRect = bannerContainer.getBoundingClientRect();
      
      // Obtener información de posición y transformaciones del componente
      const currentPosition = component.position?.[deviceView] || {};
      
      // Calcular offsets por transformaciones CSS
      let leftOffset = 0;
      let topOffset = 0;
      
      if (currentPosition.transformX === 'center' || 
          (component.id === 'preferencesBtn' && currentPosition.left === '50%')) {
        leftOffset = newSize / 2;
      } else if (currentPosition.transformX === 'right') {
        leftOffset = newSize;
      }
      
      if (currentPosition.transformY === 'center' || 
          (component.id === 'preferencesBtn' && currentPosition.top === '50%')) {
        topOffset = newSize / 2;
      } else if (currentPosition.transformY === 'bottom') {
        topOffset = newSize;
      }
      
      // Calcular posición relativa actual
      const currentLeft = componentRect.left - containerRect.left;
      const currentTop = componentRect.top - containerRect.top;
      
      let needsRepositioning = false;
      let newPosition = {};
      
      if (dimension === 'width') {
        // Calcular posición visual (considerando transforms)
        const visualLeft = currentLeft - leftOffset;
        const visualRight = visualLeft + newSize;
        
        // Verificar si se sale por la derecha o izquierda
        if (visualRight > canvasSize || visualLeft < 0) {
          // Para componentes centrados, mantener centrado si cabe
          if (currentPosition.transformX === 'center') {
            // Si el componente centrado cabe en el canvas, mantenerlo centrado
            if (newSize <= canvasSize) {
              newPosition.left = '50%';
              newPosition.percentX = 50;
            } else {
              // Si no cabe centrado, posicionar al inicio
              newPosition.left = '0%';
              newPosition.percentX = 0;
              // También quitar la transformación center porque no sirve
              newPosition.transformX = 'none';
            }
          } else {
            // Para componentes normales, calcular nueva posición
            let newLeft = currentLeft;
            
            // Si se sale por la derecha, ajustar
            if (visualRight > canvasSize) {
              newLeft = canvasSize - newSize + leftOffset;
            }
            // Si se sale por la izquierda, ajustar
            if (visualLeft < 0) {
              newLeft = leftOffset;
            }
            
            const leftPercent = (newLeft / canvasSize) * 100;
            newPosition.left = `${leftPercent.toFixed(2)}%`;
            newPosition.percentX = parseFloat(leftPercent.toFixed(2));
          }
          needsRepositioning = true;
          console.log(`📐 Reposicionando por ancho: visual(${visualLeft}-${visualRight})px → dentro del canvas`);
        }
      } else if (dimension === 'height') {
        // Calcular posición visual (considerando transforms)  
        const visualTop = currentTop - topOffset;
        const visualBottom = visualTop + newSize;
        
        // Verificar si se sale por arriba o abajo
        if (visualBottom > canvasSize || visualTop < 0) {
          // Para componentes centrados, mantener centrado si cabe
          if (currentPosition.transformY === 'center') {
            // Si el componente centrado cabe en el canvas, mantenerlo centrado
            if (newSize <= canvasSize) {
              newPosition.top = '50%';
              newPosition.percentY = 50;
            } else {
              // Si no cabe centrado, posicionar al inicio
              newPosition.top = '0%';
              newPosition.percentY = 0;
              // También quitar la transformación center porque no sirve
              newPosition.transformY = 'none';
            }
          } else {
            // Para componentes normales, calcular nueva posición
            let newTop = currentTop;
            
            // Si se sale por abajo, ajustar
            if (visualBottom > canvasSize) {
              newTop = canvasSize - newSize + topOffset;
            }
            // Si se sale por arriba, ajustar
            if (visualTop < 0) {
              newTop = topOffset;
            }
            
            const topPercent = (newTop / canvasSize) * 100;
            newPosition.top = `${topPercent.toFixed(2)}%`;
            newPosition.percentY = parseFloat(topPercent.toFixed(2));
          }
          needsRepositioning = true;
          console.log(`📐 Reposicionando por alto: visual(${visualTop}-${visualBottom})px → dentro del canvas`);
        }
      }
      
      // Si necesita reposicionamiento, disparar evento
      if (needsRepositioning && Object.keys(newPosition).length > 0) {
        console.log(`🔧 Reposicionando componente ${component.id} automáticamente:`, newPosition);
        
        // Disparar evento para actualizar posición
        const event = new CustomEvent('component:position', {
          detail: {
            id: component.id,
            position: newPosition
          }
        });
        bannerContainer.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error al verificar reposicionamiento:', error);
    }
  };
  
  // Convertir width si es porcentaje y verificar reposicionamiento
  if (deviceStyle.width && typeof deviceStyle.width === 'string' && deviceStyle.width.includes('%')) {
    const canvasSize = getCanvasSize();
    if (canvasSize) {
      const percentValue = parseFloat(deviceStyle.width);
      const pixelValue = (percentValue * canvasSize.width) / 100;
      convertedDeviceStyle.width = `${Math.round(pixelValue)}px`;
      console.log(`🔄 Convertido width: ${deviceStyle.width} → ${convertedDeviceStyle.width} (canvas: ${canvasSize.width}px)`);
      
      // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
      setTimeout(() => {
        checkAndRepositionComponent('width', pixelValue, canvasSize.width);
      }, 50);
    }
  }
  
  // Convertir height si es porcentaje y verificar reposicionamiento
  if (deviceStyle.height && typeof deviceStyle.height === 'string' && deviceStyle.height.includes('%')) {
    const canvasSize = getCanvasSize();
    if (canvasSize) {
      const percentValue = parseFloat(deviceStyle.height);
      const pixelValue = (percentValue * canvasSize.height) / 100;
      convertedDeviceStyle.height = `${Math.round(pixelValue)}px`;
      console.log(`🔄 Convertido height: ${deviceStyle.height} → ${convertedDeviceStyle.height} (canvas: ${canvasSize.height}px)`);
      
      // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
      setTimeout(() => {
        checkAndRepositionComponent('height', pixelValue, canvasSize.height);
      }, 50);
    }
  }
  
  // Convertir otras propiedades de dimensión si son porcentajes
  ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
    if (convertedDeviceStyle[prop] && typeof convertedDeviceStyle[prop] === 'string' && convertedDeviceStyle[prop].includes('%')) {
      const canvasSize = getCanvasSize();
      if (canvasSize) {
        const percentValue = parseFloat(convertedDeviceStyle[prop]);
        const isWidthProp = prop.includes('Width');
        const pixelValue = (percentValue * (isWidthProp ? canvasSize.width : canvasSize.height)) / 100;
        convertedDeviceStyle[prop] = `${Math.round(pixelValue)}px`;
        console.log(`🔄 Convertido ${prop}: ${deviceStyle[prop]} → ${convertedDeviceStyle[prop]}`);
        
        // REPOSICIONAMIENTO para maxWidth y maxHeight también pueden causar desbordamiento
        if (prop === 'maxWidth' || prop === 'maxHeight') {
          setTimeout(() => {
            const dimension = prop === 'maxWidth' ? 'width' : 'height'; 
            const maxCanvasSize = isWidthProp ? canvasSize.width : canvasSize.height;
            checkAndRepositionComponent(dimension, pixelValue, maxCanvasSize);
          }, 50);
        }
      }
    }
  });
  
  // DEBUG: Log para entender problema de porcentajes
  if (component.type === 'button' && (deviceStyle.width?.includes('%') || deviceStyle.height?.includes('%'))) {
    console.log(`🎯 ComponentRenderer - Botón ${component.id}:`, {
      originalWidth: deviceStyle.width,
      convertedWidth: convertedDeviceStyle.width,
      originalHeight: deviceStyle.height,
      convertedHeight: convertedDeviceStyle.height,
      deviceView
    });
  }
  
  // Extract content as text for display
  let displayContent = '';
  if (typeof component.content === 'string') {
    displayContent = component.content;
  } else if (component.content?.texts?.en) {
    displayContent = component.content.texts.en;
  } else if (component.content?.text) {
    displayContent = component.content.text;
  }

  // FUNCIONES HELPER PARA CONTENEDOR
  
  // Obtener modo de display del contenedor
  const getContainerDisplayMode = (component, deviceView) => {
    const containerConfig = component.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    
    switch (displayMode) {
      case 'flex':
        return 'flex';
      case 'grid':
        return 'grid';
      case 'libre':
      default:
        return 'block'; // Para modo libre usamos block
    }
  };
  
  // Obtener estilos específicos del modo del contenedor
  const getContainerModeStyles = (component, deviceView) => {
    const containerConfig = component.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    const styles = {};
    
    switch (displayMode) {
      case 'flex':
        styles.flexDirection = containerConfig.flexDirection || 'row';
        styles.justifyContent = containerConfig.justifyContent || 'flex-start';
        styles.alignItems = containerConfig.alignItems || 'stretch';
        styles.gap = containerConfig.gap || '10px';
        break;
        
      case 'grid':
        styles.gridTemplateColumns = containerConfig.gridTemplateColumns || 'repeat(2, 1fr)';
        styles.gridTemplateRows = containerConfig.gridTemplateRows || 'auto';
        styles.justifyItems = containerConfig.justifyItems || 'start';
        styles.alignItems = containerConfig.alignItems || 'start';
        styles.gap = containerConfig.gap || '10px';
        break;
        
      case 'libre':
      default:
        // En modo libre, los hijos usan posición absoluta
        styles.position = 'relative';
        break;
    }
    
    return styles;
  };
  
  // FASE 4: Estados para drag de componentes hijos (NUEVO ENFOQUE - Mouse Events)
  const [isChildDragging, setIsChildDragging] = useState(false);
  const [childDragOffset, setChildDragOffset] = useState({ x: 0, y: 0 });
  const [draggedChild, setDraggedChild] = useState(null);
  const childDragRef = useRef(null);
  const isDraggingChildRef = useRef(false);

  // FASE 4: ENFOQUE SIMPLIFICADO - Handle específico para drag de hijos
  const handleChildMouseDown = (e, child, displayMode) => {
    // Solo procesar en modo libre y si el componente no está bloqueado
    if (displayMode !== 'libre' || child.locked) return;
    
    console.log(`🎯 Drag iniciado desde handle específico para child ${child.id}`);
    
    // Encontrar el contenedor del hijo (el div padre con position relative)
    const childContainer = e.target.closest('.child-component');
    const containerElement = containerRef.current;
    
    if (!childContainer || !containerElement) {
      console.log('❌ No se encontró child container o container element');
      return;
    }
    
    // Calcular posiciones iniciales
    const childRect = childContainer.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    // CORRECCIÓN: Offset más preciso considerando el nuevo handle compacto
    const handleSize = 18; // Tamaño del handle (18px)
    const handlePosition = 6; // Offset del handle (top: -6px, left: -6px)
    const initialOffset = {
      x: handlePosition + (handleSize / 2), // Centro del handle considerando su offset
      y: handlePosition + (handleSize / 2)  // Centro del handle considerando su offset
    };
    
    // Estados para el drag
    setIsChildDragging(true);
    setDraggedChild(child);
    isDraggingChildRef.current = true;
    
    // Seleccionar el hijo
    if (onSelectChild) {
      onSelectChild(child);
    }
    
    // Efecto visual mejorado
    childContainer.style.opacity = '0.8';
    childContainer.style.zIndex = '1001';
    childContainer.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
    document.body.style.cursor = 'grabbing';
    
    // Mostrar outline del contenedor durante drag
    containerElement.style.outline = '2px dashed #3b82f6';
    containerElement.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    
    console.log(`📏 Container rect:`, {
      width: containerRect.width,
      height: containerRect.height,
      left: containerRect.left,
      top: containerRect.top
    });
    console.log(`📏 Child rect:`, {
      width: childRect.width,
      height: childRect.height,
      left: childRect.left,
      top: childRect.top
    });
    
    // Variables para throttling optimizado
    let lastUpdateTime = 0;
    const updateThrottle = 16; // ~60fps
    let animationFrameId = null;
    
    // Función para manejar el movimiento con throttling optimizado
    const handleMouseMove = (moveEvent) => {
      if (!isDraggingChildRef.current) return;
      
      // Cancelar frame anterior si existe
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const now = Date.now();
        if (now - lastUpdateTime < updateThrottle) return;
        lastUpdateTime = now;
        
        // CORRECCIÓN: Calcular nueva posición más precisa y fluida
        const mouseRelativeX = moveEvent.clientX - containerRect.left;
        const mouseRelativeY = moveEvent.clientY - containerRect.top;
        
        // Posición del hijo considerando el offset del handle
        const childLeft = mouseRelativeX - initialOffset.x;
        const childTop = mouseRelativeY - initialOffset.y;
        
        // Obtener padding del contenedor para calcular límites correctos
        const containerPadding = 10; // Del CSS del contenedor
        const availableWidth = containerRect.width - (containerPadding * 2);
        const availableHeight = containerRect.height - (containerPadding * 2);
        
        // Límites considerando padding y tamaño del hijo
        const maxX = availableWidth - childRect.width;
        const maxY = availableHeight - childRect.height;
        
        // Constrain within container bounds con margen de seguridad
        const safeMargin = 5; // píxeles de margen
        const constrainedX = Math.max(
          containerPadding + safeMargin, 
          Math.min(childLeft + containerPadding, maxX + containerPadding - safeMargin)
        );
        const constrainedY = Math.max(
          containerPadding + safeMargin, 
          Math.min(childTop + containerPadding, maxY + containerPadding - safeMargin)
        );
        
        // Convertir a porcentajes relativos al área disponible (sin padding)
        const leftPercent = ((constrainedX - containerPadding) / availableWidth) * 100;
        const topPercent = ((constrainedY - containerPadding) / availableHeight) * 100;
        
        // Redondear para mejor precisión visual
        const finalLeft = Math.max(0, Math.min(92, Math.round(leftPercent * 10) / 10));
        const finalTop = Math.max(0, Math.min(92, Math.round(topPercent * 10) / 10));
        
        // Actualizar posición con mayor precisión
        if (onUpdateChildPosition) {
          onUpdateChildPosition(child.id, component.id, {
            top: `${finalTop}%`,
            left: `${finalLeft}%`,
            percentX: finalLeft,
            percentY: finalTop
          });
        }
      });
    };
    
    // Función para finalizar el drag
    const handleMouseUp = () => {
      console.log(`🎯 Finalizando drag child ${child.id}`);
      
      // Cancelar cualquier animación pendiente
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // Limpiar estados
      setIsChildDragging(false);
      setDraggedChild(null);
      isDraggingChildRef.current = false;
      
      // Restaurar estilos del handle
      const handle = document.querySelector(`.child-drag-handle`);
      if (handle) {
        handle.style.cursor = 'grab';
        handle.style.backgroundColor = '#1976d2';
      }
      
      // Restaurar estilos del hijo
      childContainer.style.opacity = '';
      childContainer.style.zIndex = '';
      childContainer.style.boxShadow = '';
      document.body.style.cursor = '';
      
      // Quitar outline del contenedor con suave transición
      containerElement.style.transition = 'outline 0.2s ease, background-color 0.2s ease';
      containerElement.style.outline = '';
      containerElement.style.backgroundColor = '';
      
      // Limpiar transición después de completarla
      setTimeout(() => {
        if (containerElement) {
          containerElement.style.transition = '';
        }
      }, 200);
      
      // Remover listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Agregar listeners globales
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Renderizar contenido interno del contenedor
  const renderContainerContent = (component, deviceView) => {
    if (!component.children || component.children.length === 0) {
      console.log(`📦 Contenedor ${component.id} no tiene hijos`);
      return null;
    }
    
    const containerConfig = component.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    
    console.log(`📦 Renderizando ${component.children.length} hijos en contenedor ${component.id}, modo: ${displayMode}`);
    
    return component.children.map((child, index) => {
      // Verificar si este hijo está seleccionado
      const isChildSelected = selectedComponent && selectedComponent.id === child.id;
      
      // CORRECCIÓN: Estilo consistente sin duplicación
      let childWrapperStyle;
      
      if (displayMode === 'libre') {
        // En modo libre: posición absoluta con coordenadas del hijo
        childWrapperStyle = {
          position: 'absolute',
          top: child.position?.[deviceView]?.top || '0%',
          left: child.position?.[deviceView]?.left || '0%',
          // Aplicar transforms si existen
          ...(child.position?.[deviceView]?.transform && {
            transform: child.position[deviceView].transform
          }),
          // Efecto visual durante drag
          ...(isChildDragging && draggedChild?.id === child.id && {
            opacity: 0.8,
            zIndex: 1000
          })
        };
      } else {
        // En modo flex/grid: sin posición absoluta
        childWrapperStyle = {
          position: 'relative',
          // Efecto visual durante drag
          ...(isChildDragging && draggedChild?.id === child.id && {
            opacity: 0.8,
            zIndex: 1000
          })
        };
      }
      
      return (
        <div 
          key={child.id || index} 
          style={childWrapperStyle}
          className={`child-component ${isChildSelected ? 'selected' : ''}`}
          data-child-id={child.id}
          onClick={(e) => {
            e.stopPropagation();
            // Solo seleccionar si no estamos arrastrando
            if (!isChildDragging && onSelectChild) {
              onSelectChild(child);
            }
          }}
          // FASE 4: Menú contextual para hijos
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Crear menú contextual dinámico
            const contextMenu = document.createElement('div');
            contextMenu.style.cssText = `
              position: fixed;
              top: ${e.clientY}px;
              left: ${e.clientX}px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              z-index: 9999;
              min-width: 160px;
              padding: 4px;
            `;
            
            const removeOption = document.createElement('button');
            removeOption.textContent = 'Quitar del contenedor';
            removeOption.style.cssText = `
              width: 100%;
              text-align: left;
              padding: 8px 12px;
              border: none;
              background: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
              color: #dc2626;
            `;
            removeOption.onmouseover = () => {
              removeOption.style.backgroundColor = '#fef2f2';
            };
            removeOption.onmouseout = () => {
              removeOption.style.backgroundColor = 'transparent';
            };
            removeOption.onclick = () => {
              if (onRemoveChild) {
                onRemoveChild(child.id);
              }
              document.body.removeChild(contextMenu);
            };
            
            contextMenu.appendChild(removeOption);
            document.body.appendChild(contextMenu);
            
            // Cerrar menú al hacer clic fuera
            const closeMenu = (e) => {
              if (!contextMenu.contains(e.target)) {
                if (document.body.contains(contextMenu)) {
                  document.body.removeChild(contextMenu);
                }
                document.removeEventListener('click', closeMenu);
              }
            };
            
            setTimeout(() => {
              document.addEventListener('click', closeMenu);
            }, 100);
          }}
        >
          <ComponentRenderer
            component={child}
            deviceView={deviceView}
            isSelected={isChildSelected}
            onDelete={onDelete} // Propagar función de eliminar
            onUpdateContent={onUpdateContent} // Propagar función de actualizar contenido
            onUpdateStyle={onUpdateStyle} // Propagar función de actualizar estilo
            onAddChild={onAddChild} // FASE 4: Propagar función de agregar hijos para anidamiento
            onSelectChild={onSelectChild} // Propagar función de selección para hijos anidados
            selectedComponent={selectedComponent} // Propagar componente seleccionado
            onRemoveChild={onRemoveChild} // FASE 4: Propagar función de quitar del contenedor
            onUpdateChildPosition={onUpdateChildPosition} // FASE 4: Propagar función de actualizar posición de hijos
            allComponents={allComponents} // FASE 4: Propagar todos los componentes para validación
            resizeStep={resizeStep}
          />
          
          {/* FASE 4: Handle específico para drag de hijos en modo libre */}
          {displayMode === 'libre' && !child.locked && (
            <div
              className="child-drag-handle"
              style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                width: '18px',
                height: '18px',
                backgroundColor: '#1976d2',
                cursor: 'grab',
                borderRadius: '3px',
                zIndex: 1002,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isChildSelected ? 1 : 0.8,
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.15s ease'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.target.style.cursor = 'grabbing';
                e.target.style.backgroundColor = '#1565c0';
                console.log(`🎯 Handle click for child ${child.id}`);
                handleChildMouseDown(e, child, displayMode);
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.opacity = '1';
                e.target.style.backgroundColor = '#1e88e5';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.opacity = isChildSelected ? '1' : '0.8';
                e.target.style.backgroundColor = '#1976d2';
                e.target.style.cursor = 'grab';
              }}
              title="↕↔ Arrastra para mover"
            >
              {/* Ícono de flechas direccionales */}
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ fill: 'white' }}>
                {/* Flecha hacia arriba */}
                <polygon points="5,1 3,3 7,3" />
                {/* Flecha hacia abajo */}
                <polygon points="5,9 3,7 7,7" />
                {/* Flecha hacia izquierda */}
                <polygon points="1,5 3,3 3,7" />
                {/* Flecha hacia derecha */}
                <polygon points="9,5 7,3 7,7" />
              </svg>
            </div>
          )}
        </div>
      );
    });
  };

  // Verificar y determinar información de imagen de forma segura
  const getImageInfo = () => {
    try {
      // Valores predeterminados
      const info = {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'local'
      };
      
      // Obtener la URL real (puede estar en component.content o en component.content.texts.en)
      let contentUrl = '';
      
      if (typeof component.content === 'string') {
        // Si el contenido es directamente un string, usarlo como URL
        contentUrl = component.content;
      } else if (component.content?.texts?.en && typeof component.content.texts.en === 'string') {
        // Si el contenido está en texts.en, usarlo como URL
        contentUrl = component.content.texts.en;
      }
      
      // Verificar si hay una URL válida
      if (contentUrl) {
        // Verificar si es referencia temporal
        if (contentUrl.startsWith('__IMAGE_REF__')) {
          info.isTemporaryRef = true;
          info.imageType = 'temp';
        }
        
        // Verificar si es URL válida
        if (contentUrl.startsWith('data:image') || 
            contentUrl.startsWith('/') || 
            contentUrl.match(/^https?:\/\//)) {
          info.isValidImageUrl = true;
          info.imageSource = contentUrl;
          info.imageType = contentUrl.startsWith('http') || 
                         contentUrl.startsWith('/') ? 'server' : 'local';
        }
      }
      
      // Si hay vista previa en el estilo, usarla con prioridad (usar deviceStyle original para metadatos)
      if (deviceStyle._previewUrl) {
        info.imageSource = deviceStyle._previewUrl;
      }
      
      return info;
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      return {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'unknown'
      };
    }
  };

  // Render component based on its type
  let content;
  switch (component.type) {
    case 'container':
      // FASE 4: Calcular información de anidamiento para indicadores visuales
      const nestingDepth = calculateNestingDepth(component, allComponents);
      const levelIndicator = getNestingLevelIndicator(nestingDepth);
      
      // NUEVO: Componente contenedor con modos libre/flex/grid y indicadores de anidamiento
      const containerStyle = {
        ...convertedDeviceStyle,
        minWidth: convertedDeviceStyle.minWidth || '200px',
        minHeight: convertedDeviceStyle.minHeight || '100px',
        width: convertedDeviceStyle.width || '200px',
        height: convertedDeviceStyle.height || '100px',
        // Estilos por defecto del contenedor
        backgroundColor: convertedDeviceStyle.backgroundColor || 'transparent',
        // FASE 4: Borde que indica nivel de anidamiento
        border: convertedDeviceStyle.border || (isSelected 
          ? `2px dashed ${levelIndicator.color}` 
          : nestingDepth > 0 
            ? `1px solid ${levelIndicator.color}40` 
            : 'none'),
        borderColor: convertedDeviceStyle.borderColor || (isSelected ? levelIndicator.color : 'transparent'),
        borderStyle: convertedDeviceStyle.borderStyle || (isSelected ? 'dashed' : 'solid'),
        borderWidth: convertedDeviceStyle.borderWidth || (isSelected ? '2px' : nestingDepth > 0 ? '1px' : '0'),
        padding: convertedDeviceStyle.padding || '10px',
        position: 'relative',
        overflow: 'visible',
        // Modo de display basado en displayMode
        display: getContainerDisplayMode(component, deviceView),
        // Aplicar propiedades específicas según el modo
        ...getContainerModeStyles(component, deviceView)
      };
      
      
      content = (
        <div 
          ref={containerRef}
          style={containerStyle}
          onDoubleClick={handleDoubleClick}
        >
          {/* FASE 4: Indicador de nivel de anidamiento */}
          {nestingDepth > 0 && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              backgroundColor: levelIndicator.color,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              zIndex: 1000,
              pointerEvents: 'none',
              userSelect: 'none'
            }}>
              {levelIndicator.icon} {levelIndicator.name}
            </div>
          )}

          {/* Contenido interno del contenedor */}
          {renderContainerContent(component, deviceView)}
          
          {/* Placeholder cuando está vacío */}
          {(!component.children || component.children.length === 0) && !isDragOver && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#999',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none',
              userSelect: 'none'
            }}>
              Contenedor vacío<br/>
              <span style={{ fontSize: '12px' }}>Arrastra componentes aquí</span>
            </div>
          )}

          {/* FASE 4: Indicador visual mejorado de drop */}
          {isDragOver && dropValidation.isValid && (
            <DropZoneIndicator
              displayMode={component.containerConfig?.[deviceView]?.displayMode || 'libre'}
              position={dragOverPosition}
              showPosition={component.containerConfig?.[deviceView]?.displayMode === 'libre'}
              size="normal"
            />
          )}

          {/* FASE 4: Indicador de error de validación mejorado */}
          {isDragOver && dropValidation.showError && dropValidation.errorMessage && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 1001,
              maxWidth: '85%',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                {dropValidation.errorMessage.title}
              </div>
              <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.95 }}>
                {dropValidation.errorMessage.description}
              </div>
              {dropValidation.errorMessage.suggestion && (
                <div style={{ 
                  fontSize: '11px', 
                  fontStyle: 'italic', 
                  opacity: 0.9,
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  💡 {dropValidation.errorMessage.suggestion}
                </div>
              )}
            </div>
          )}
          
          {/* FASE 4: Indicador simple para errores básicos (fallback) */}
          {isDragOver && !dropValidation.isValid && !dropValidation.showError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 1001,
              maxWidth: '80%',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}>
              <div style={{ marginBottom: '4px' }}>❌ No se puede soltar aquí</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.9 }}>
                {dropValidation.reason || 'Operación no válida'}
              </div>
            </div>
          )}
          
          {/* Control de resize para contenedor */}
          {!component.locked && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '20px',
                height: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                cursor: 'nwse-resize',
                borderTopLeftRadius: '3px',
                zIndex: 10000
              }}
              className="resize-handle"
              data-resize-handle="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Resize handle clicked for container');
                handleResizeStart(e);
              }}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Redimensionar contenedor"
              draggable={false}
            >
              <div style={{
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '0 0 8px 8px',
                borderColor: 'transparent transparent #ffffff transparent'
              }}/>
            </div>
          )}
        </div>
      );
      break;
    case 'button':
      // Asegurar que el botón tenga estilos mínimos para ser visible
      const buttonStyle = {
        ...convertedDeviceStyle,
        minWidth: convertedDeviceStyle.minWidth || '100px',
        minHeight: convertedDeviceStyle.minHeight || '30px',
        width: convertedDeviceStyle.width || 'auto',
        height: convertedDeviceStyle.height || 'auto',
        // Asegurar que los bordes sean visibles si se han configurado
        borderWidth: convertedDeviceStyle.borderWidth || '2px',
        borderStyle: convertedDeviceStyle.borderStyle || 'solid',
        borderColor: convertedDeviceStyle.borderColor || '#2563eb',
        position: 'relative', // Importante para el control de resize
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer' // Simular apariencia de botón
      };
      
      content = (
        <div 
          ref={containerRef}
          style={{
            position: 'relative', 
            width: convertedDeviceStyle.width || '150px',
            height: convertedDeviceStyle.height || '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <button 
            style={{
              ...buttonStyle,
              width: '100%',
              height: '100%'
            }}
            onDoubleClick={handleDoubleClick}
          >
            {displayContent || 'Botón'}
          </button>
          
          {/* Control de resize para botón */}
          {!component.locked && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '20px',
                height: '20px',
                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                cursor: 'nwse-resize',
                borderTopLeftRadius: '3px',
                zIndex: 10000
              }}
              className="resize-handle"
              data-resize-handle="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Resize handle clicked for button');
                handleResizeStart(e);
              }}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Redimensionar botón"
              draggable={false}
            >
              <div style={{
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '0 0 8px 8px',
                borderColor: 'transparent transparent #ffffff transparent'
              }}/>
            </div>
          )}
        </div>
      );
      break;
    case 'image':
      // Obtener información de imagen de forma segura
      const imageInfo = getImageInfo();
      
      content = (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: convertedDeviceStyle.width || '200px',
            height: convertedDeviceStyle.height || '150px',
            cursor: component.locked ? 'default' : 'move',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden' // Evitar desbordamiento durante la carga/redimensión
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* Imagen si es válida o hay vista previa */}
          {imageInfo.imageSource && (
            <img
              ref={imageRef}
              src={imageInfo.imageSource}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: imageLoaded && !imageError ? 1 : 0,
                transition: 'opacity 0.2s'
              }}
              onLoad={handleImageLoad}
              onError={(e) => {
                console.error(`❌ Error al cargar imagen`, e);
                setImageError(true);
                setImageLoaded(true);
                // Guardar en caché que esta imagen dio error
                if (imageInfo.imageSource) {
                  imageLoadCache.set(imageInfo.imageSource, false);
                }
              }}
            />
          )}
          
          {/* Mostrar estado de carga solo si la imagen realmente está cargando */}
          {imageInfo.imageSource && !imageLoaded && !imageError && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              color: '#666'
            }}>
              <div className="animate-pulse flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="mt-2 text-sm">Cargando imagen...</span>
              </div>
            </div>
          )}
          
          {/* Placeholder cuando no hay imagen o hay error */}
          {(!imageInfo.imageSource || imageError) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f5f5f5',
              border: '1px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              <ImageIcon size={24} className="mb-2 text-gray-400" />
              <span style={{ fontSize: '13px', textAlign: 'center', padding: '0 10px' }}>
                {imageError 
                  ? 'Error al cargar la imagen' 
                  : imageInfo.isTemporaryRef
                    ? 'Imagen seleccionada (vista en panel)'
                    : 'Haga doble clic para seleccionar'}
              </span>
              {imageError && imageInfo.imageSource && (
                <span style={{ fontSize: '10px', textAlign: 'center', padding: '5px 10px 0', color: '#999' }}>
                  URL: {typeof imageInfo.imageSource === 'string' 
                    ? (imageInfo.imageSource.length > 30 
                      ? imageInfo.imageSource.substring(0, 30) + '...' 
                      : imageInfo.imageSource)
                    : 'Formato no válido'}
                </span>
              )}
            </div>
          )}
          
          {/* Resize handle with aspect ratio indicator */}
          {!component.locked && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 10 }}>
              {/* El botón de aspect ratio se movió al panel de estilo */}
              
              {/* Resize handle */}
              <div
                style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  cursor: 'nwse-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔧 Resize handle clicked for image');
                  handleResizeStart(e);
                }}
                onDragStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                draggable={false}
                className="resize-handle"
              >
                <div style={{
                  width: '0',
                  height: '0',
                  borderStyle: 'solid',
                  borderWidth: '0 0 8px 8px',
                  borderColor: 'transparent transparent #ffffff transparent'
                }}/>
              </div>
            </div>
          )}
          
          {/* Indicador de aspect ratio */}
          {aspectRatio && imageLoaded && (
            <div style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '1px 3px',
              fontSize: '9px',
              borderRadius: '0 0 0 3px',
              zIndex: 10
            }}>
              {Math.round(aspectRatio * 100) / 100}:1
            </div>
          )}
          
          {/* Indicador de tipo de imagen */}
          {imageInfo.imageSource && (
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              backgroundColor: imageInfo.imageType === 'temp' 
                ? 'rgba(59, 130, 246, 0.7)' 
                : imageInfo.imageType === 'server' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(99, 102, 241, 0.7)',
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '0 0 4px 0'
            }}>
              {imageInfo.imageType === 'temp' 
                ? 'Temporal' 
                : imageInfo.imageType === 'server' ? 'Servidor' : 'Imagen'}
            </div>
          )}
          
          {/* Indicador de paso de resize */}
          {resizeStep > 1 && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '0',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '3px 0 0 3px',
              zIndex: 10
            }}>
              {resizeStep}px
            </div>
          )}
        </div>
      );
      break;
    case 'text':
    default:
      // Asegurar que el contenedor de texto tenga estilos mínimos para ser visible
      const textStyle = {
        ...convertedDeviceStyle,
        minWidth: convertedDeviceStyle.minWidth || '50px',
        minHeight: convertedDeviceStyle.minHeight || '20px',
        width: convertedDeviceStyle.width || 'auto',
        height: convertedDeviceStyle.height || 'auto',
        // Permitir bordes personalizados si se configuran
        borderWidth: convertedDeviceStyle.borderWidth || '0px',
        borderStyle: convertedDeviceStyle.borderStyle || 'solid',
        borderColor: convertedDeviceStyle.borderColor || 'transparent',
        padding: convertedDeviceStyle.padding || '10px',
        overflow: 'hidden',
        wordWrap: 'break-word',
        position: 'relative', // Importante para posicionar el control de resize
      };
      
      content = (
        <div 
          ref={containerRef}
          style={textStyle}
          onDoubleClick={handleDoubleClick}
        >
          {displayContent || 'Texto'}
          
          {/* Control de resize para texto */}
          {!component.locked && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '14px',
                height: '14px',
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                cursor: 'nwse-resize',
                borderTopLeftRadius: '3px',
                zIndex: 10000
              }}
              className="resize-handle"
              data-resize-handle="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Resize handle clicked for text');
                handleResizeStart(e);
              }}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Redimensionar texto"
              draggable={false}
            >
              <div style={{
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '0 0 6px 6px',
                borderColor: 'transparent transparent #ffffff transparent'
              }}/>
            </div>
          )}
        </div>
      );
      break;
  }

  return (
    <div
      className={`relative group inline-block ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ overflow: 'visible' }}
    >
      {isEditing && component.type === 'text' ? (
        <div className="relative group inline-block" onDoubleClick={handleDoubleClick}>
          <textarea
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            onBlur={handleContentSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
          <Controls />
        </div>
      ) : (
        <>
          {content}
          <Controls />
        </>
      )}
    </div>
  );
};

export default ComponentRenderer;