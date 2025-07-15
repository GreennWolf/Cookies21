import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { Trash2, Move, Image as ImageIcon } from 'lucide-react';
import LanguageButton from '../LanguageButton';
import DropZoneIndicator from './DropZoneIndicator'; // FASE 4
import { getImageUrl as getImageUrlFromUtils } from '../../../utils/imageProcessing';
import { useImageManager } from '../../../hooks/useImageManager';
import { useDimensionSync } from '../../../hooks/useDimensionSync.js';
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
  onUpdateChildStyle,
  onAddChild, // NUEVA PROP - FASE 4: Para agregar componentes hijos a contenedores
  onSelectChild, // NUEVA PROP: Para seleccionar componentes hijos
  selectedComponent, // NUEVA PROP: Componente actualmente seleccionado
  onRemoveChild, // NUEVA PROP - FASE 4: Para quitar hijos del contenedor
  onUpdateChildPosition, // NUEVA PROP - FASE 4: Para actualizar posición de componentes hijos
  onUnattach, // NUEVA PROP: Para desadjuntar componentes de contenedores
  onReorderChildren, // NUEVA PROP: Para reordenar hijos de contenedores
  onMoveToContainer, // NUEVA PROP: Para mover componentes existentes a contenedores
  allComponents = [], // NUEVA PROP - FASE 4: Todos los componentes para validación de anidamiento
  resizeStep = 5,
  isChild = false, // NUEVA PROP: Indica si es un componente hijo
  parentId = null, // NUEVA PROP: ID del contenedor padre (para componentes hijos)
  isPreview = false, // NUEVA PROP: Indica si está en modo preview o editor
  clientInfo = null // NUEVA PROP: Información del cliente para reemplazo de variables
}) => {
  // Hook unificado para gestión de imágenes
  const imageManager = useImageManager();
  
  // Hook para sincronización de dimensiones con el sistema centralizado
  const { 
    updateDimension, 
    dimensions: syncedDimensions,
    isConnected: isDimensionSyncConnected 
  } = useDimensionSync(
    component.id, 
    deviceView, 
    { debug: process.env.NODE_ENV === 'development' }
  );
  
  // ELIMINADO: useEffect que causaba bucles infinitos
  
  // Log de debug para verificar props - SOLO EN DESARROLLO
  // React.useEffect(() => {
  //   if (['rejectAll', 'acceptAll', 'preferencesBtn'].includes(component.id)) {
  //       hasOnUnattach: !!onUnattach,
  //       hasOnDelete: !!onDelete,
  //       hasOnUpdateContent: !!onUpdateContent,
  //       hasOnUpdateStyle: !!onUpdateStyle,
  //       hasOnAddChild: !!onAddChild,
  //       hasOnSelectChild: !!onSelectChild,
  //       hasOnRemoveChild: !!onRemoveChild,
  //       hasOnUpdateChildPosition: !!onUpdateChildPosition,
  //       componentId: component.id,
  //       allPropsCount: 'N/A'
  //     });
  //   }
  // }, [onUnattach, onDelete, component.id, component.children]);
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  // Inicializamos imageLoaded en true si la URL ya está en caché
  const [imageLoaded, setImageLoaded] = useState(false);
  const previousImageUrlRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  
  // Effect para verificar estado inicial de imágenes
  useEffect(() => {
    if (component.type === 'image') {
      // IMPORTANTE: Usar el sistema unificado imageManager.getUnifiedImageUrl
      // Esto asegura que las imágenes dentro de contenedores se manejen correctamente
      const imageInfo = (() => {
        try {
          // Usar el sistema unificado para obtener la URL
          const imageSource = imageManager.getUnifiedImageUrl(component, deviceView, 'componentRenderer');
          
          const info = {
            isTemporaryRef: imageManager.isTemporaryImage(component, deviceView),
            isValidImageUrl: !!imageSource,
            imageSource,
            imageType: 'local'
          };
          
          if (imageSource) {
            // Verificar tipo de imagen con el nuevo sistema
            if (info.isTemporaryRef) {
              info.imageType = 'temp';
            } else if (imageSource.startsWith('http') || imageSource.startsWith('/templates/images/')) {
              info.imageType = 'server';
            } else if (imageSource.startsWith('data:image')) {
              info.imageType = 'local';
            } else if (imageSource.startsWith('blob:')) {
              info.imageType = 'blob';
            }
          }
          
          console.log('🖼️ ComponentRenderer useEffect: Imagen procesada con sistema unificado:', {
            componentId: component.id,
            imageSource,
            isTemporary: info.isTemporaryRef,
            imageType: info.imageType,
            content: component.content,
            contentType: typeof component.content,
            hasContent: !!component.content
          });
          
          return info;
        } catch (error) {
          console.error('❌ ComponentRenderer: Error al procesar imagen:', error);
          return {
            isTemporaryRef: false,
            isValidImageUrl: false,
            imageSource: null,
            imageType: 'local'
          };
        }
      })();
      
      // Si hay una imagen válida, verificar si ya está en caché
      if (imageInfo.imageSource) {
        const cachedResult = imageLoadCache.get(imageInfo.imageSource);
        if (cachedResult === true) {
          setImageLoaded(true);
          setImageError(false);
        } else if (cachedResult === false) {
          setImageError(true);
          setImageLoaded(true);
        } else {
          // Imagen nueva, resetear estados
          setImageLoaded(false);
          setImageError(false);
          
          // WORKAROUND: Para blob URLs y data URIs (placeholders), inicializar como cargada
          // ya que a veces no disparan onLoad correctamente
          if (imageInfo.imageSource && (imageInfo.imageSource.startsWith('blob:') || imageInfo.imageSource.startsWith('data:'))) {
            console.log('🔧 ComponentRenderer: Blob URL o Data URI detectada, inicializando como cargada:', imageInfo.imageSource);
            setImageLoaded(true);
          }
        }
        
        console.log('🖼️ ComponentRenderer: Estado inicial imagen:', {
          componentId: component.id,
          imageSource: imageInfo.imageSource,
          cached: cachedResult,
          imageLoaded: cachedResult === true,
          imageError: cachedResult === false
        });
      }
    }
  }, [component.type, component.content, component.styles, deviceView, component.id]);
  
  // FASE 4: Estados para drag over en contenedores
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropValidation, setDropValidation] = useState({ isValid: false, showError: false });
  const [dragOverPosition, setDragOverPosition] = useState({ x: 0, y: 0 });
  
  

  // NUEVAS FUNCIONES - DRAG PARA COMPONENTES HIJOS: Manejar drag de componentes hijos
  const handleChildDragStart = useCallback((e, child, displayMode) => {
    e.stopPropagation(); // Evitar que se propague al contenedor padre
    
    if (displayMode !== 'libre') {
      // En modos flex/grid no permitir drag individual
      e.preventDefault();
      return;
    }
    
    // DEBUG:(`🎯 Iniciando drag del componente hijo ${child.id}`);
    
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
    
    // DEBUG:(`🎯 Finalizando drag del componente hijo ${child.id}`);
    
    // Notificar fin del drag
    document.dispatchEvent(new CustomEvent('child-drag-end', {
      detail: { childId: child.id, parentId: component.id }
    }));
  }, [component.id]);

  // Determinar URL actual de la imagen usando el sistema unificado
  const getImageUrl = () => {
    return imageManager.getUnifiedImageUrl(component, deviceView, 'componentRenderer');
  };

  // Obtener aspect ratio de una imagen
  const getImageAspectRatio = (img) => {
    if (!img) return null;
    if (img.naturalWidth && img.naturalHeight && img.naturalHeight > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      return ratio;
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
        
        // Usar aspect ratio cacheado si existe y aplicar resize
        if (imageAspectRatioCache.has(currentImageUrl)) {
          const cachedAspectRatio = imageAspectRatioCache.get(currentImageUrl);
          setAspectRatio(cachedAspectRatio);
          
          // Aplicar resize inmediatamente con el aspect ratio cacheado
          if (containerRef.current && component.style?.[deviceView] && cachedAspectRatio > 0) {
            const currentWidth = containerRef.current.clientWidth;
            
            if (currentWidth > 0) {
              const newHeight = Math.round(currentWidth / cachedAspectRatio);
              const roundedHeight = Math.round(newHeight / resizeStep) * resizeStep;
              
              // Actualizar estilo visual
              containerRef.current.style.height = `${roundedHeight}px`;
              
              // TEMPORALMENTE DESHABILITADO - esto sobrescribe el resize
              // Notificar cambio
              // if (isChild && onUpdateChildStyle) {
              //   onUpdateChildStyle(component.id, deviceView, {
              //     height: `${roundedHeight}px`
              //   });
              // } else if (onUpdateStyle) {
              //   onUpdateStyle(component.id, {
              //     height: `${roundedHeight}px`
              //   });
              // }
              console.log(`⚠️ ASPECT_RATIO: Auto-ajuste de altura deshabilitado para ${component.id}`);
            }
          }
        }
      } else {
        // Solo resetear el estado si la URL realmente cambió
        setImageLoaded(false);
        setImageError(false);
        // No reseteamos aspect ratio aquí para evitar cambios bruscos
      }
    }
  }, [component, deviceView, resizeStep, isChild, onUpdateChildStyle, onUpdateStyle]);

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
    
    // Agregar al caché de carga exitosa
    const imageSource = img.src;
    if (imageSource) {
      imageLoadCache.set(imageSource, true);
      console.log('✅ ComponentRenderer: Imagen cargada exitosamente:', {
        componentId: component.id,
        imageSource,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    }
    
    // Calcular y guardar aspect ratio
    const imgUrl = getImageUrl();
    if (imgUrl) {
      const newAspectRatio = getImageAspectRatio(img);
      if (newAspectRatio) {
        setAspectRatio(newAspectRatio);
        imageAspectRatioCache.set(imgUrl, newAspectRatio);
        
        // Ajustar tamaño para mantener aspect ratio SIEMPRE al cargar
        // Aplicar a TODAS las imágenes, tanto independientes como en contenedores
        
        // Solo ajustar tamaño si tenemos container y estilo definido
        if (containerRef.current && component.style?.[deviceView]) {
            const style = component.style[deviceView];
            const currentWidth = containerRef.current.clientWidth;
            
            // Si tenemos un ancho definido, ajustar altura para mantener aspect ratio
            if (currentWidth > 0 && newAspectRatio > 0) {
              // Calcular nueva altura: height = width / aspectRatio
              // Por ejemplo: para 16:9 (1.777), si width=320 entonces height=320/1.777=180
              const newHeight = Math.round(currentWidth / newAspectRatio);
              
              // Redondear al paso de resize más cercano
              const roundedHeight = Math.round(newHeight / resizeStep) * resizeStep;
              
              // Si la imagen es muy pequeña comparada con el ancho actual, también ajustar el ancho
              const naturalImageWidth = img.naturalWidth;
              const naturalImageHeight = img.naturalHeight;
              
              // Calcular qué ancho tendría la imagen si la altura fuera la calculada
              const proportionalWidth = Math.round(roundedHeight * newAspectRatio);
              
              // Si el ancho proporcional es mucho menor que el ancho actual, ajustar el ancho también
              if (naturalImageWidth && naturalImageHeight && proportionalWidth < currentWidth * 0.8) {
                // Actualizar ambas dimensiones
                containerRef.current.style.width = `${proportionalWidth}px`;
                containerRef.current.style.height = `${roundedHeight}px`;
                
                // TEMPORALMENTE DESHABILITADO - esto sobrescribe el resize
                // Notificar cambio con ambas dimensiones
                // if (isChild && onUpdateChildStyle) {
                //   onUpdateChildStyle(component.id, deviceView, {
                //     width: `${proportionalWidth}px`,
                //     height: `${roundedHeight}px`
                //   });
                // } else if (onUpdateStyle) {
                //   onUpdateStyle(component.id, {
                //     width: `${proportionalWidth}px`,
                //     height: `${roundedHeight}px`
                //   });
                // }
                console.log(`⚠️ ASPECT_RATIO: Auto-ajuste de dimensiones deshabilitado para ${component.id}`);
              } else {
                // Solo actualizar altura
                containerRef.current.style.height = `${roundedHeight}px`;
                
                // TEMPORALMENTE DESHABILITADO - esto sobrescribe el resize
                // Notificar cambio - usar la función correcta según si es hijo o no
                // if (isChild && onUpdateChildStyle) {
                //   onUpdateChildStyle(component.id, deviceView, {
                //     height: `${roundedHeight}px`
                //   });
                // } else if (onUpdateStyle) {
                //   onUpdateStyle(component.id, {
                //     height: `${roundedHeight}px`
                //   });
                // }
                console.log(`⚠️ ASPECT_RATIO: Auto-ajuste de altura solo deshabilitado para ${component.id}`);
              }
            }
          }
      }
    }
  };
  
  // Verificación inicial de tamaño para componentes de imagen
  useEffect(() => {
    // Aplicar a TODAS las imágenes, tanto independientes como en contenedores
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
        
        // Usar la función correcta según si es hijo o no
        if (isChild && onUpdateChildStyle) {
          onUpdateChildStyle(component.id, deviceView, {
            width: `${newWidth}px`,
            height: `${newHeight}px`
          });
        } else if (onUpdateStyle) {
          onUpdateStyle(component.id, {
            width: `${newWidth}px`,
            height: `${newHeight}px`
          });
        }
      }
    }
  }, [component, deviceView, onUpdateStyle, onUpdateChildStyle, isChild, resizeStep, aspectRatio]);

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
      {!component.locked && (() => {
        // Verificar si es un componente obligatorio por action o por ID
        const isEssentialByAction = component.action && ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type);
        const isEssentialById = ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(component.id);
        const isEssential = isEssentialByAction || isEssentialById;
        const isInContainer = component.parentId || (allComponents && allComponents.some(c => c.children?.some(child => 
          (typeof child === 'object' ? child.id : child) === component.id
        )));
        
        // Solo mostrar el botón de eliminar si:
        // - No es un componente obligatorio, O
        // - Es un componente obligatorio dentro de un contenedor
        if (!isEssential || (isEssential && isInContainer)) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                
                if (isEssential && isInContainer) {
                  if (onUnattach) {
                    onUnattach(component.id);
                  } else {
                    onDelete(component.id);
                  }
                } else if (onDelete) {
                  onDelete(component.id);
                }
              }}
              className={`p-1 rounded text-white text-xs ${
                isEssential && isInContainer
                  ? 'bg-orange-500' 
                  : 'bg-red-500'
              }`}
              title={
                isEssential && isInContainer
                  ? 'Sacar del contenedor'
                  : 'Eliminar'
              }
            >
              <Trash2 size={12} />
            </button>
          );
        }
        return null;
      })()}
    </div>
  );

  // Usamos la propiedad keepAspectRatio del componente o defaulteamos a true para imágenes
  const keepAspectRatio = component.keepAspectRatio !== undefined ? component.keepAspectRatio : component.type === 'image';
  
  // RESIZE HANDLER - Mejorado para mantener aspect ratio, respetar tamaños mínimos
  // y reposicionar componentes que se saldrían del canvas
  // FASE 4: Con soporte mejorado para contenedores y recálculo automático de hijos
// RESIZE HANDLER - Mejorado para mantener aspect ratio, respetar tamaños mínimos
// y reposicionar componentes que se saldrían del canvas
// FASE 4: Con soporte mejorado para contenedores y recálculo automático de hijos
const handleResizeStart = (e, forceKeepAspectRatio = null) => {
  console.log(`🚨 ComponentRenderer handleResizeStart: ${component.id} - ¿Quién está disparando esto?`, e.target.className, e.target.tagName);
  
  // VERIFICACIÓN ESTRICTA: Solo permitir resize desde el resize handle específico
  const isValidResizeHandle = e.target.classList.contains('resize-handle') || 
                             e.target.classList.contains('bg-blue-500') ||
                             e.target.classList.contains('bg-blue-600') ||
                             e.target.hasAttribute('data-resize-handle');
  
  if (!isValidResizeHandle) {
    console.log(`❌ ComponentRenderer: Resize bloqueado - no proviene de resize handle válido`);
    return; // BLOQUEAR resize si no viene del handle correcto
  }
  
  console.log(`✅ ComponentRenderer: Resize permitido desde handle válido`);
  e.preventDefault();
  e.stopPropagation();
  if (!containerRef.current) return;

  const startWidth = containerRef.current.clientWidth;
  const startHeight = containerRef.current.clientHeight;
  
  // FASE 4: Capturar información inicial para contenedores
  const isContainer = component.type === 'container';
  const originalContainerSize = isContainer ? { width: startWidth, height: startHeight } : null;
  
  // Capturar dimensiones originales del contenedor padre para evitar que se altere
  let originalParentWidth, originalParentHeight;
  let parentOriginalStyle = null;
  
  // Para imágenes SIEMPRE mantener aspect ratio
  const shouldKeepAspectRatio = component.type === 'image' || 
    (forceKeepAspectRatio !== null ? forceKeepAspectRatio : keepAspectRatio);
  
  // Usamos el aspect ratio actual o lo calculamos
  const currentAspectRatio = shouldKeepAspectRatio 
    ? (aspectRatio || (startHeight > 0 ? startWidth / startHeight : null))
    : null;
  
  if (component.type === 'image' && currentAspectRatio) {
  }
  
  const startX = e.clientX;
  const startY = e.clientY; // También necesitamos la posición Y inicial

  // Determinar el contenedor padre para establecer límites
  let parentElement, maxWidth, maxHeight, componentLeft, componentTop;
  // Usar el parentId pasado como prop para componentes hijos
  const containerParentId = parentId || component.parentId;
  
  if (isChild && containerParentId) {
    // Si es un componente hijo, buscar el contenedor padre
    const parentContainer = containerRef.current.closest(`[data-component-id="${containerParentId}"]`);
    if (parentContainer) {
      parentElement = parentContainer;
      
      // Capturar las dimensiones originales del contenedor padre
      originalParentWidth = parentContainer.clientWidth;
      originalParentHeight = parentContainer.clientHeight;
      maxWidth = originalParentWidth;
      maxHeight = originalParentHeight;
      
      // CRÍTICO: Congelar completamente el estilo del contenedor padre
      parentOriginalStyle = {
        width: parentContainer.style.width,
        height: parentContainer.style.height,
        minWidth: parentContainer.style.minWidth,
        minHeight: parentContainer.style.minHeight,
        maxWidth: parentContainer.style.maxWidth,
        maxHeight: parentContainer.style.maxHeight
      };
      
      
      // Obtener posición relativa al contenedor padre
      const componentRect = containerRef.current.getBoundingClientRect();
      const parentRect = parentContainer.getBoundingClientRect();
      
      componentLeft = componentRect.left - parentRect.left;
      componentTop = componentRect.top - parentRect.top;
      
    } else {
      return;
    }
  } else {
    // Si es un componente raíz, usar límites del banner
    const bannerElement = containerRef.current.closest('.banner-container');
    if (!bannerElement) return;
    
    parentElement = bannerElement;
    maxWidth = bannerElement.clientWidth;
    maxHeight = bannerElement.clientHeight;
    
    // Obtener posición relativa al banner
    const componentRect = containerRef.current.getBoundingClientRect();
    const bannerRect = bannerElement.getBoundingClientRect();
    
    componentLeft = componentRect.left - bannerRect.left;
    componentTop = componentRect.top - bannerRect.top;
    
  }

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
    // Validar que el containerRef sigue siendo válido
    if (!containerRef.current) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      return;
    }
    
    // Calcular cambios simples
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    
    let newWidth = Math.round((startWidth + deltaX) / step) * step;
    let newHeight = Math.round((startHeight + deltaY) / step) * step;
    
    // Mantener aspect ratio para imágenes
    if (currentAspectRatio && shouldKeepAspectRatio) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = Math.round((newWidth / currentAspectRatio) / step) * step;
      } else {
        newWidth = Math.round((newHeight * currentAspectRatio) / step) * step;
      }
    }
    
    // Aplicar límites mínimos
    newWidth = Math.max(minWidth, newWidth);
    newHeight = Math.max(minHeight, newHeight);
    
    // Límites máximos ESTRICTOS - NUNCA permitir más del 100% del canvas
    let referenceWidth, referenceHeight;
    
    if (isChild && containerParentId && parentElement) {
      // Para hijos de contenedores, usar el tamaño del contenedor padre
      referenceWidth = originalParentWidth;
      referenceHeight = originalParentHeight;
      
      // LÍMITE ESTRICTO: Calcular límites considerando la posición del componente dentro del contenedor
      const maxChildWidth = Math.min(referenceWidth - componentLeft, referenceWidth); // Nunca más del 100%
      const maxChildHeight = Math.min(referenceHeight - componentTop, referenceHeight); // Nunca más del 100%
      
      newWidth = Math.min(newWidth, maxChildWidth);
      newHeight = Math.min(newHeight, maxChildHeight);
      
      console.log(`🔒 Límites hijo aplicados: ${maxChildWidth}px × ${maxChildHeight}px (contenedor: ${referenceWidth}px × ${referenceHeight}px)`);
    } else {
      // Para componentes raíz, usar el tamaño del banner - LÍMITE ESTRICTO
      const bannerElement = containerRef.current.closest('.banner-container');
      if (bannerElement) {
        referenceWidth = bannerElement.clientWidth;
        referenceHeight = bannerElement.clientHeight;
        
        // Obtener posición actual del componente respecto al banner
        const componentRect = containerRef.current.getBoundingClientRect();
        const bannerRect = bannerElement.getBoundingClientRect();
        
        const componentLeftInBanner = componentRect.left - bannerRect.left;
        const componentTopInBanner = componentRect.top - bannerRect.top;
        
        // LÍMITE ABSOLUTO: Nunca más grande que el canvas completo
        const maxComponentWidth = Math.min(referenceWidth - componentLeftInBanner, referenceWidth);
        const maxComponentHeight = Math.min(referenceHeight - componentTopInBanner, referenceHeight);
        
        newWidth = Math.min(newWidth, maxComponentWidth);
        newHeight = Math.min(newHeight, maxComponentHeight);
        
        console.log(`🔒 Límites canvas aplicados: ${maxComponentWidth}px × ${maxComponentHeight}px (canvas: ${referenceWidth}px × ${referenceHeight}px)`);
      }
    }
    
    // Re-aplicar aspect ratio después de aplicar límites
    if (currentAspectRatio && shouldKeepAspectRatio) {
      const aspectFromWidth = newWidth / currentAspectRatio;
      const aspectFromHeight = newHeight * currentAspectRatio;
      
      if (aspectFromWidth <= newHeight) {
        newHeight = aspectFromWidth;
      } else {
        newWidth = aspectFromHeight;
      }
    }
    
    // Aplicar al DOM solo visualmente
    if (containerRef.current) {
      containerRef.current.style.width = `${newWidth}px`;
      containerRef.current.style.height = `${newHeight}px`;
      
      // Para imágenes, configurar correctamente
      if (component.type === 'image') {
        const imgElement = containerRef.current.querySelector('img');
        if (imgElement) {
          imgElement.style.width = '100%';
          imgElement.style.height = '100%';
          imgElement.style.objectFit = 'contain';
        }
      }
    }
    
    // NUEVO: Actualizar DimensionManager DURANTE el drag para sincronización en tiempo real
    if (updateDimension && typeof updateDimension === 'function') {
      // Calcular porcentajes para actualizar el sistema
      let tempReferenceWidth, tempReferenceHeight;
      
      if (isChild && parentElement) {
        tempReferenceWidth = originalParentWidth || parentElement.clientWidth;
        tempReferenceHeight = originalParentHeight || parentElement.clientHeight;
      } else {
        const bannerElement = containerRef.current ? containerRef.current.closest('.banner-container') : null;
        tempReferenceWidth = bannerElement ? bannerElement.clientWidth : 1000;
        tempReferenceHeight = bannerElement ? bannerElement.clientHeight : 600;
      }
      
      const tempWidthPercent = (newWidth / tempReferenceWidth) * 100;
      const tempHeightPercent = (newHeight / tempReferenceHeight) * 100;
      
      // Actualizar dimensiones durante el drag
      updateDimension('width', `${tempWidthPercent.toFixed(1)}%`, 'drag-move');
      updateDimension('height', `${tempHeightPercent.toFixed(1)}%`, 'drag-move');
    }

    // CORRECCIÓN PRINCIPAL: Calcular porcentajes correctamente
    // Para componentes hijos, usar las dimensiones del contenedor padre
    let calculationReferenceWidth, calculationReferenceHeight;
    
    if (isChild && parentElement) {
      // IMPORTANTE: Usar las dimensiones del contenedor padre, no del banner
      calculationReferenceWidth = originalParentWidth || parentElement.clientWidth;
      calculationReferenceHeight = originalParentHeight || parentElement.clientHeight;
      
    } else {
      // Para componentes raíz, usar las dimensiones del banner
      const bannerElement = containerRef.current ? containerRef.current.closest('.banner-container') : null;
      calculationReferenceWidth = bannerElement ? bannerElement.clientWidth : 1000;
      calculationReferenceHeight = bannerElement ? bannerElement.clientHeight : 600;
      
    }
    
    let widthPercent = (newWidth / calculationReferenceWidth) * 100;
    let heightPercent = (newHeight / calculationReferenceHeight) * 100;
    
    // APLICAR LÍMITES: 10% mínimo, 100% máximo durante el resize visual
    widthPercent = Math.max(10, Math.min(100, widthPercent));
    heightPercent = Math.max(10, Math.min(100, heightPercent));
    
    // Recalcular newWidth y newHeight basándose en los porcentajes limitados
    newWidth = (widthPercent * calculationReferenceWidth) / 100;
    newHeight = (heightPercent * calculationReferenceHeight) / 100;
    

    // IMPORTANTE: Restaurar dimensiones del contenedor padre si cambió
    if (isChild && parentElement && parentOriginalStyle) {
      // Verificar si el contenedor cambió de tamaño
      const currentParentWidth = parentElement.clientWidth;
      const currentParentHeight = parentElement.clientHeight;
      
      if (currentParentWidth !== originalParentWidth || currentParentHeight !== originalParentHeight) {
        
        // Restaurar estilos originales
        Object.assign(parentElement.style, parentOriginalStyle);
      }
    }

    // Determinar si es un componente hijo
    const isChildComponent = isChild || !!component.parentId || !!parentId;

    // DESACTIVADO: NO actualizar state durante onMouseMove para evitar bucles infinitos
    // Solo actualizar el estilo visual del DOM, el state se actualiza en onMouseUp
    // if (isChildComponent && onUpdateChildStyle) {
    //   // Para componentes hijos, usar la función específica de hijos
    //   onUpdateChildStyle(component.id, deviceView, {
    //     width: `${widthPercent}%`,
    //     height: `${heightPercent}%`
    //   });
    // } else if (onUpdateStyle) {
    //   // Para componentes raíz, usar la función normal
    //   onUpdateStyle(component.id, {
    //     [deviceView]: {
    //       width: `${widthPercent}%`,
    //       height: `${heightPercent}%`
    //     }
    //   });
    // }
  }

  function onMouseUp() {
    console.log(`🚨 ComponentRenderer onMouseUp: ${component.id} - Terminando resize`);
    // Limpiar event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // CRÍTICO: Asegurar que el estado final coincide con la visualización
    if (containerRef.current) {
      const finalWidth = containerRef.current.clientWidth;
      const finalHeight = containerRef.current.clientHeight;
      
      // Calcular referencia correcta para porcentajes
      let calculationReferenceWidth, calculationReferenceHeight;
      
      if (isChild && parentElement) {
        calculationReferenceWidth = originalParentWidth || parentElement.clientWidth;
        calculationReferenceHeight = originalParentHeight || parentElement.clientHeight;
      } else {
        const bannerElement = containerRef.current.closest('.banner-container');
        calculationReferenceWidth = bannerElement ? bannerElement.clientWidth : 1000;
        calculationReferenceHeight = bannerElement ? bannerElement.clientHeight : 600;
      }
      
      // REACTIVADO: Actualizar state al finalizar resize (UNA SOLA VEZ en onMouseUp)
      let finalWidthPercent = (finalWidth / calculationReferenceWidth) * 100;
      let finalHeightPercent = (finalHeight / calculationReferenceHeight) * 100;
      
      // APLICAR LÍMITES ESTRICTOS: 10% mínimo, 100% máximo - NUNCA exceder
      finalWidthPercent = Math.max(10, Math.min(100, finalWidthPercent));
      finalHeightPercent = Math.max(10, Math.min(100, finalHeightPercent));
      
      console.log(`🎯 Límites aplicados en resize final: ${finalWidthPercent.toFixed(1)}% × ${finalHeightPercent.toFixed(1)}%`, {
        finalWidth,
        finalHeight,
        calculationReferenceWidth,
        calculationReferenceHeight,
        componentId: component.id
      });
      
      console.log(`🔧 ComponentRenderer onMouseUp: Actualizando state final ${component.id}: ${finalWidthPercent.toFixed(1)}% x ${finalHeightPercent.toFixed(1)}% (limitado 10%-100%)`);
      
      // Actualizar el estado del componente al finalizar el resize
      const isChildComponent = isChild || !!component.parentId || !!parentId;
      
      if (isChildComponent && onUpdateChildStyle) {
        onUpdateChildStyle(component.id, deviceView, {
          width: `${finalWidthPercent}%`,
          height: `${finalHeightPercent}%`
        });
      } else if (onUpdateStyle) {
        onUpdateStyle(component.id, {
          [deviceView]: {
            width: `${finalWidthPercent}%`,
            height: `${finalHeightPercent}%`
          }
        });
      }
      
      // INTEGRACIÓN MEJORADA: Notificar inmediatamente al DimensionManager
      if (updateDimension && typeof updateDimension === 'function') {
        console.log(`🔄 ComponentRenderer: Actualizando dimensiones - ${component.id}: ${finalWidthPercent.toFixed(1)}% x ${finalHeightPercent.toFixed(1)}%`);
        
        // Actualizar dimensiones de manera síncrona
        updateDimension('width', `${finalWidthPercent}%`, 'drag-resize');
        updateDimension('height', `${finalHeightPercent}%`, 'drag-resize');
      }
      
      // DESACTIVADO: Actualización automática de _imageSettings que dependía de cálculos automáticos
      // if (component.type === 'image' && onUpdateStyle) {
      //   const updatedImageSettings = {
      //     ...component._imageSettings,
      //     width: `${finalWidthPercent}%`,
      //     height: `${finalHeightPercent}%`,
      //     widthRaw: finalWidth,
      //     heightRaw: finalHeight
      //   };
      //   
      //   console.log('🖼️ ComponentRenderer: Actualizando _imageSettings:', updatedImageSettings);
      //   
      //   if (isChildComponent && onUpdateChildStyle) {
      //     // Para componentes hijo, necesitamos una forma de actualizar _imageSettings
      //     // Por ahora usamos onUpdateStyle si está disponible
      //     if (onUpdateStyle) {
      //       onUpdateStyle(component.id, {
      //         _imageSettings: updatedImageSettings
      //       });
      //     }
      //   } else {
      //     onUpdateStyle(component.id, {
      //       _imageSettings: updatedImageSettings
      //     });
      //   }
      // }
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

  // Get device-specific styles 
  const deviceStyle = component.style?.[deviceView] || {};
  
  
  // Debug para componentes de imagen (solo primera vez)
  if (component.type === 'image' && !component._loggedOnce) {
    console.log(`🖼️ ComponentRenderer: Renderizando imagen ${component.id}:`, {
      deviceView,
      deviceStyle,
      componentStyle: component.style,
      _imageSettings: component._imageSettings
    });
    component._loggedOnce = true;
  }
  
  // Force re-render when style changes for image components
  useEffect(() => {
    if (component.type === 'image' && process.env.NODE_ENV === 'development') {
      // Solo log si hay cambios importantes
      if (deviceStyle._previewUrl || deviceStyle._tempFile) {
        console.log(`🔄 IMAGE_EFFECT: Re-render para imagen ${component.id}:`, {
          width: deviceStyle.width,
          height: deviceStyle.height,
          hasPreviewUrl: !!deviceStyle._previewUrl,
          hasTempFile: !!deviceStyle._tempFile
        });
      }
    }
  }, [component.id, component.type, component._imageSettings, deviceStyle._previewUrl, deviceStyle._tempFile, deviceStyle.width, deviceStyle.height]);

  // Efecto para aplicar estilos inmediatamente en la primera carga - SOLO PARA CONTENEDORES
  useEffect(() => {
    // Solo aplicar a contenedores para evitar romper otros componentes
    if (component.type !== 'container') return;
    
    const applyInitialContainerStyles = () => {
      if (!containerRef.current) return;
      
      const element = containerRef.current;
      const style = component.style?.[deviceView] || {};
      const containerConfig = component.containerConfig?.[deviceView] || {};
      
      // Aplicar display mode del contenedor
      if (containerConfig.displayMode) {
        switch (containerConfig.displayMode) {
          case 'flex':
            element.style.display = 'flex';
            element.style.flexDirection = containerConfig.flexDirection || 'row';
            element.style.flexWrap = containerConfig.flexWrap || 'nowrap';
            element.style.justifyContent = containerConfig.justifyContent || 'flex-start';
            element.style.alignItems = containerConfig.alignItems || 'stretch';
            break;
          case 'grid':
            element.style.display = 'grid';
            element.style.gridTemplateColumns = containerConfig.gridTemplateColumns || 'repeat(auto-fit, minmax(100px, 1fr))';
            element.style.gridTemplateRows = containerConfig.gridTemplateRows || 'auto';
            element.style.gap = containerConfig.gap || '10px';
            break;
          case 'libre':
          default:
            element.style.display = 'block';
            element.style.position = 'relative';
            break;
        }
      }
      
      // Solo aplicar dimensiones críticas para contenedores
      if (style.width && typeof style.width === 'string' && style.width.includes('%')) {
        const referenceSize = getReferenceSize();
        if (referenceSize) {
          const percentValue = parseFloat(style.width);
          const pixelValue = (percentValue * referenceSize.width) / 100;
          element.style.width = `${Math.round(pixelValue)}px`;
        }
      }
      
      if (style.height && typeof style.height === 'string' && style.height.includes('%')) {
        const referenceSize = getReferenceSize();
        if (referenceSize) {
          const percentValue = parseFloat(style.height);
          const pixelValue = (percentValue * referenceSize.height) / 100;
          element.style.height = `${Math.round(pixelValue)}px`;
        }
      }

      // Solo aplicar propiedades básicas del contenedor
      ['backgroundColor', 'borderColor', 'borderStyle', 'borderWidth', 'padding'].forEach(prop => {
        if (style[prop] !== undefined) {
          element.style[prop] = style[prop];
        }
      });
    };

    // Aplicar inmediatamente si el elemento ya está disponible
    if (containerRef.current) {
      applyInitialContainerStyles();
    } else {
      // Si no está disponible, intentar en el siguiente ciclo
      const timeoutId = setTimeout(applyInitialContainerStyles, 0);
      return () => clearTimeout(timeoutId);
    }

    // También aplicar cuando el elemento se conecta al DOM
    const observer = new MutationObserver(() => {
      if (containerRef.current && containerRef.current.isConnected) {
        applyInitialContainerStyles();
      }
    });

    if (containerRef.current?.parentNode) {
      observer.observe(containerRef.current.parentNode, { childList: true });
    }

    return () => observer.disconnect();
  }, [component.id, deviceView, component.style, component.containerConfig]);

  // Función auxiliar para obtener dimensiones de referencia (mover antes del useEffect)
  const getReferenceSize = () => {
    try {
      const componentEl = containerRef.current;
      if (!componentEl) return null;
      
      // CORRECCIÓN: Para componentes hijos, buscar el contenedor padre más cercano
      if (isChild || component.parentId) {
        // Buscar el contenedor padre inmediato
        let parentContainer = componentEl.parentElement;
        
        // Subir en el DOM hasta encontrar un contenedor con data-component-type="container"
        while (parentContainer && parentContainer.getAttribute('data-component-type') !== 'container') {
          parentContainer = parentContainer.parentElement;
        }
        
        if (parentContainer) {
          const parentRect = parentContainer.getBoundingClientRect();
          // Debug solo una vez por componente
          if (process.env.NODE_ENV === 'development' && !component._debugLogged) {
            console.log(`📏 Contenedor padre para ${component.id}: ${Math.round(parentRect.width)}x${Math.round(parentRect.height)}`);
            component._debugLogged = true;
          }
          return {
            width: parentRect.width,
            height: parentRect.height,
            isParentContainer: true
          };
        }
        
        // Si no encontramos contenedor pero es hijo, intentar con parentId
        if (parentId || component.parentId) {
          const parentByIdSelector = `[data-id="${parentId || component.parentId}"]`;
          const parentById = document.querySelector(parentByIdSelector);
          if (parentById) {
            const parentRect = parentById.getBoundingClientRect();
            console.log(`📏 Usando contenedor padre por ID para ${component.id}:`, {
              width: parentRect.width,
              height: parentRect.height,
              parentId: parentId || component.parentId
            });
            return {
              width: parentRect.width,
              height: parentRect.height,
              isParentContainer: true
            };
          }
        }
      }
      
      // Para componentes principales, usar el banner container
      const bannerContainer = componentEl.closest('.banner-container');
      if (bannerContainer) {
        const rect = bannerContainer.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          isParentContainer: false
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo dimensiones de referencia:', error);
      return null;
    }
  };
  
  // CORRECCIÓN: Convertir porcentajes a píxeles usando el canvas como referencia
  const convertedDeviceStyle = { ...deviceStyle };
  
  // Obtener dimensiones del canvas (usar función ya definida arriba)

// CORRECCIÓN: Aplicar validación de límites para componentes hijos
const applyBoundsValidation = (value, isWidth = true) => {
  const referenceSize = getReferenceSize();
  if (!referenceSize || !referenceSize.isParentContainer) {
    return value; // Solo aplicar límites si es hijo de contenedor
  }
  
  // LIMITACIÓN MEJORADA: Límites del 98% del contenedor padre para dar más espacio
  const maxLimit = isWidth ? referenceSize.width * 0.98 : referenceSize.height * 0.98;
  return Math.min(value, maxLimit);
};

// Convertir width si es porcentaje y verificar reposicionamiento
if (deviceStyle.width && typeof deviceStyle.width === 'string' && deviceStyle.width.includes('%')) {
  const referenceSize = getReferenceSize();
  if (referenceSize) {
    const percentValue = parseFloat(deviceStyle.width);
    const pixelValue = (percentValue * referenceSize.width) / 100;
    
    // CORRECCIÓN: Aplicar límites si es componente hijo
    const validatedPixelValue = applyBoundsValidation(pixelValue, true);
    convertedDeviceStyle.width = `${Math.round(validatedPixelValue)}px`;
    
    if (validatedPixelValue !== pixelValue) {
      // Debug solo si hay cambio significativo y es primera vez
      if (process.env.NODE_ENV === 'development' && !component._widthLimitLogged && Math.abs(pixelValue - validatedPixelValue) > 10) {
        console.log(`⚠️ Ancho limitado para ${component.id}: ${Math.round(pixelValue)}px → ${Math.round(validatedPixelValue)}px`);
        component._widthLimitLogged = true;
      }
    }
    
    // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
    setTimeout(() => {
      checkAndRepositionComponent('width', validatedPixelValue, referenceSize.width);
    }, 50);
  }
}

// Convertir height si es porcentaje y verificar reposicionamiento
if (deviceStyle.height && typeof deviceStyle.height === 'string' && deviceStyle.height.includes('%')) {
  const referenceSize = getReferenceSize();
  if (referenceSize) {
    const percentValue = parseFloat(deviceStyle.height);
    const pixelValue = (percentValue * referenceSize.height) / 100;
    
    // CORRECCIÓN: Aplicar límites si es componente hijo
    const validatedPixelValue = applyBoundsValidation(pixelValue, false);
    convertedDeviceStyle.height = `${Math.round(validatedPixelValue)}px`;
    
    if (validatedPixelValue !== pixelValue) {
      console.log(`⚠️ Alto limitado para ${component.id}: ${Math.round(pixelValue)}px → ${Math.round(validatedPixelValue)}px`);
    }
    
    // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
    setTimeout(() => {
      checkAndRepositionComponent('height', validatedPixelValue, referenceSize.height);
    }, 50);
  }
}

// Convertir otras propiedades de dimensión si son porcentajes
['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
  if (convertedDeviceStyle[prop] && typeof convertedDeviceStyle[prop] === 'string' && convertedDeviceStyle[prop].includes('%')) {
    const referenceSize = getReferenceSize();
    if (referenceSize) {
      const percentValue = parseFloat(convertedDeviceStyle[prop]);
      const isWidthProp = prop.includes('Width');
      const pixelValue = (percentValue * (isWidthProp ? referenceSize.width : referenceSize.height)) / 100;
      
      // CORRECCIÓN: Aplicar límites para max properties si es hijo
      let validatedPixelValue = pixelValue;
      if ((prop === 'maxWidth' || prop === 'maxHeight') && referenceSize.isParentContainer) {
        validatedPixelValue = applyBoundsValidation(pixelValue, isWidthProp);
      }
      
      convertedDeviceStyle[prop] = `${Math.round(validatedPixelValue)}px`;
      
      // REPOSICIONAMIENTO para maxWidth y maxHeight también pueden causar desbordamiento
      if (prop === 'maxWidth' || prop === 'maxHeight') {
        setTimeout(() => {
          const dimension = prop === 'maxWidth' ? 'width' : 'height'; 
          const maxReferenceSize = isWidthProp ? referenceSize.width : referenceSize.height;
          checkAndRepositionComponent(dimension, validatedPixelValue, maxReferenceSize);
        }, 50);
      }
    }
  }
});
  
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
          // DEBUG:(`📐 Reposicionando por ancho: visual(${visualLeft}-${visualRight})px → dentro del canvas`);
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
          // DEBUG:(`📐 Reposicionando por alto: visual(${visualTop}-${visualBottom})px → dentro del canvas`);
        }
      }
      
      // Si necesita reposicionamiento, disparar evento
      if (needsRepositioning && Object.keys(newPosition).length > 0) {
        // DEBUG:(`🔧 Reposicionando componente ${component.id} automáticamente:`, newPosition);
        
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al verificar reposicionamiento:', error);
      }
    }
  };
  
  // Convertir width si es porcentaje y verificar reposicionamiento
  if (deviceStyle.width && typeof deviceStyle.width === 'string' && deviceStyle.width.includes('%')) {
    const canvasSize = getReferenceSize();
    if (canvasSize) {
      const percentValue = parseFloat(deviceStyle.width);
      const pixelValue = (percentValue * canvasSize.width) / 100;
      convertedDeviceStyle.width = `${Math.round(pixelValue)}px`;
      // DEBUG:(`🔄 Convertido width: ${deviceStyle.width} → ${convertedDeviceStyle.width} (canvas: ${canvasSize.width}px)`);
      
      // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
      setTimeout(() => {
        checkAndRepositionComponent('width', pixelValue, canvasSize.width);
      }, 50);
    }
  }
  
  // Convertir height si es porcentaje y verificar reposicionamiento
  if (deviceStyle.height && typeof deviceStyle.height === 'string' && deviceStyle.height.includes('%')) {
    const canvasSize = getReferenceSize();
    if (canvasSize) {
      const percentValue = parseFloat(deviceStyle.height);
      const pixelValue = (percentValue * canvasSize.height) / 100;
      convertedDeviceStyle.height = `${Math.round(pixelValue)}px`;
      // DEBUG:(`🔄 Convertido height: ${deviceStyle.height} → ${convertedDeviceStyle.height} (canvas: ${canvasSize.height}px)`);
      
      // REPOSICIONAMIENTO: Verificar si el componente se sale con el nuevo tamaño
      setTimeout(() => {
        checkAndRepositionComponent('height', pixelValue, canvasSize.height);
      }, 50);
    }
  }
  
  // Convertir otras propiedades de dimensión si son porcentajes
  ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'].forEach(prop => {
    if (convertedDeviceStyle[prop] && typeof convertedDeviceStyle[prop] === 'string' && convertedDeviceStyle[prop].includes('%')) {
      const canvasSize = getReferenceSize();
      if (canvasSize) {
        const percentValue = parseFloat(convertedDeviceStyle[prop]);
        const isWidthProp = prop.includes('Width');
        const pixelValue = (percentValue * (isWidthProp ? canvasSize.width : canvasSize.height)) / 100;
        convertedDeviceStyle[prop] = `${Math.round(pixelValue)}px`;
        // DEBUG:(`🔄 Convertido ${prop}: ${deviceStyle[prop]} → ${convertedDeviceStyle[prop]}`);
        
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
    // DEBUG:(`🎯 ComponentRenderer - Botón ${component.id}:`, {
    //   originalWidth: deviceStyle.width,
    //   convertedWidth: convertedDeviceStyle.width,
    //   originalHeight: deviceStyle.height,
    //   convertedHeight: convertedDeviceStyle.height,
    //   deviceView
    // });
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

  // Función para procesar variables del cliente en el contenido
  const processClientVariables = (content, clientInfo) => {
    if (!content || !clientInfo) return content;
    
    let processedContent = content;
    
    // Reemplazar variable de nombre de la empresa
    // Priorizar razón social sobre otros nombres
    const companyName = clientInfo.fiscalInfo?.razonSocial || 
                       clientInfo.companyName || 
                       clientInfo.businessName || 
                       clientInfo.name;
    
    if (companyName) {
      // Variable principal para razón social
      processedContent = processedContent.replace(/\{razonSocial\}/g, companyName);
      
      // Variable alternativa para nombre de empresa
      processedContent = processedContent.replace(/\{nombreEmpresa\}/g, companyName);
    }
    
    // Reemplazar CIF si está disponible
    const cif = clientInfo.fiscalInfo?.cif;
    if (cif) {
      processedContent = processedContent.replace(/\{cif\}/g, cif);
    }
    
    // Reemplazar dirección si está disponible
    const direccion = clientInfo.fiscalInfo?.direccion;
    if (direccion) {
      processedContent = processedContent.replace(/\{direccion\}/g, direccion);
    }
    
    return processedContent;
  };
  
  // Procesar variables del cliente en el contenido
  displayContent = processClientVariables(displayContent, clientInfo);

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
        styles.justifyItems = containerConfig.justifyItems || 'flex-start';
        styles.alignItems = containerConfig.alignItems || 'flex-start';
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
  
  // FASE 4: Handlers para drag over en contenedores
  const handleContainerDragOver = useCallback((e) => {
    e.preventDefault();
    // NO stopPropagation para permitir que el canvas también lo detecte
    
    // DEBUG:(`🔵 DRAG OVER en ComponentRenderer: ${component.type} (${component.id})`);
    
    // Solo validar si es un contenedor
    if (component.type !== 'container') {
      // DEBUG:('  - No es contenedor, ignorando');
      return;
    }
    
    // Verificar si es un componente existente siendo arrastrado
    const existingComponentId = e.dataTransfer.types.includes('component-id');
    if (existingComponentId) {
      // Mostrar indicadores de drop para componentes existentes
      setIsDragOver(true);
      setDropValidation({ isValid: true, showError: false });
      return;
    }
    
    // Obtener datos del drag
    const dragData = window.__dragData;
    // DEBUG:('  - DragData:', dragData);
    // DEBUG:('  - window.__dragData existe?', window.__dragData !== undefined && window.__dragData !== null);
    
    if (!dragData) {
      // DEBUG:('  - No hay dragData en window.__dragData');
      // Intentar obtener del dataTransfer como respaldo
      try {
        const jsonData = e.dataTransfer.getData('application/json') || 
                        e.dataTransfer.getData('text/plain');
        if (jsonData) {
          // DEBUG:('  - Encontrado en dataTransfer:', jsonData);
        }
      } catch (err) {
        // DEBUG:('  - Error leyendo dataTransfer:', err.message);
      }
      return;
    }
    
    // Validar si se puede hacer drop
    const validation = validateContainerDrop(component, dragData, deviceView, allComponents);
    // DEBUG:('  - Validación:', validation);
    
    // Calcular posición del mouse relativa al contenedor
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragOverPosition({ x, y });
    }
    
    // Actualizar estados
    setIsDragOver(true);
    setDropValidation(validation);
  }, [component, allComponents]);
  
  const handleContainerDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo limpiar si realmente salimos del contenedor
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDropValidation({ isValid: false, showError: false });
    }
  }, []);
  
  const handleContainerDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // CRUCIAL: Evitar que el evento llegue al canvas
    
    
    if (component.type !== 'container') {
      return;
    }
    
    // Verificar si es un componente existente siendo arrastrado
    const existingComponentId = e.dataTransfer.getData('component-id');
    if (existingComponentId) {
      // Mover el componente existente al contenedor
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      const position = {
        top: `${(y / containerRect.height) * 100}%`,
        left: `${(x / containerRect.width) * 100}%`
      };
      
      // Llamar a la función para mover al contenedor
      if (onMoveToContainer) {
        onMoveToContainer(existingComponentId, component.id, position);
      }
      
      setIsDragOver(false);
      return;
    }
    
    const dragData = window.__dragData;
    
    if (!dragData || !dropValidation.isValid) {
      setIsDragOver(false);
      return;
    }
    
    // Calcular posición óptima para el drop
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    const dropPosition = {
      x: x,
      y: y,
      leftPercent: (x / containerRect.width) * 100,
      topPercent: (y / containerRect.height) * 100
    };
    const position = calculateOptimalPosition(component, dropPosition, deviceView);
    
    // Agregar el componente al contenedor (solo para nuevos componentes del sidebar)
    if (onAddChild) {
      const childData = {
        ...dragData,
        id: dragData.id || generateChildId(dragData.type, component.id),
        position: {
          [deviceView]: position
        }
      };
      
      onAddChild(component.id, childData);
    }
    
    // Limpiar estados
    setIsDragOver(false);
    setDropValidation({ isValid: false, showError: false });
    window.__dragData = null;
  }, [component, deviceView, dropValidation, onAddChild]);

  // FASE 4: ENFOQUE SIMPLIFICADO - Handle específico para drag de hijos
  const handleChildMouseDown = (e, child, displayMode) => {
    // Solo procesar en modo libre y si el componente no está bloqueado
    if (displayMode !== 'libre' || child.locked) {
      return;
    }
    
    // DEBUG:(`🎯 Drag iniciado desde handle específico para child ${child.id}`);
    
    // Encontrar el contenedor del hijo (el div padre con position relative)
    const childContainer = e.target.closest('.child-component');
    const containerElement = containerRef.current;
    
    if (!childContainer || !containerElement) {
      // DEBUG:('❌ No se encontró child container o container element');
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
    
    // DEBUG:(`📏 Container rect:`, {
    //   width: containerRect.width,
    //   height: containerRect.height,
    //   left: containerRect.left,
    //   top: containerRect.top
    // });
    // DEBUG:(`📏 Child rect:`, {
    //   width: childRect.width,
    //   height: childRect.height,
    //   left: childRect.left,
    //   top: childRect.top
    // });
    
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
      // DEBUG:(`🎯 Finalizando drag child ${child.id}`);
      
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
      // DEBUG:(`📦 Contenedor ${component.id} no tiene hijos`);
      return null;
    }
    
    const containerConfig = component.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    // Container display mode logged
    
    // DEBUG:(`📦 Renderizando ${component.children.length} hijos en contenedor ${component.id}, modo: ${displayMode}`);
    
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
          // Para imágenes, usar width/height fit-content para mantener aspect ratio
          ...(child.type === 'image' ? {
            width: 'fit-content',
            height: 'fit-content'
          } : {}),
          // Limitar tamaño máximo al contenedor para evitar desbordamiento
          maxWidth: '100%',
          maxHeight: '100%',
          overflow: 'visible', // Permitir que se vea el contenido
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
          // Para imágenes en flex/grid, usar tamaño automático
          ...(child.type === 'image' ? {
            width: 'auto',
            height: 'auto',
            flex: '0 0 auto' // No crecer ni encoger, mantener tamaño natural
          } : {}),
          // Limitar tamaño máximo al contenedor para evitar desbordamiento
          maxWidth: '100%',
          maxHeight: '100%',
          overflow: 'visible', // Permitir que se vea el contenido
          // Efecto visual durante drag
          ...(isChildDragging && draggedChild?.id === child.id && {
            opacity: 0.8,
            zIndex: 1000
          })
        };
      }
      
      // Log para imágenes hijas para confirmar restricciones
      if (child.type === 'image') {
        // Image child restrictions applied
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
            
            // Verificar si es un componente obligatorio por action o por ID
            const isEssentialByAction = child.action && ['accept_all', 'reject_all', 'show_preferences'].includes(child.action.type);
            const isEssentialById = ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(child.id);
            const isEssential = isEssentialByAction || isEssentialById;
            
            const removeOption = document.createElement('button');
            
            // Cambiar texto según si es esencial o no
            removeOption.textContent = isEssential 
              ? 'Quitar del contenedor (volver al canvas)' 
              : 'Quitar del contenedor';
              
            removeOption.style.cssText = `
              width: 100%;
              text-align: left;
              padding: 8px 12px;
              border: none;
              background: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
              color: ${isEssential ? '#2563eb' : '#dc2626'};
              display: flex;
              align-items: center;
            `;
            
            // Agregar ícono para componentes esenciales
            if (isEssential) {
              const iconSpan = document.createElement('span');
              iconSpan.innerHTML = 'ℹ️';
              iconSpan.style.marginRight = '8px';
              removeOption.prepend(iconSpan);
            }
            removeOption.onmouseover = () => {
              removeOption.style.backgroundColor = '#fef2f2';
            };
            removeOption.onmouseout = () => {
              removeOption.style.backgroundColor = 'transparent';
            };
            removeOption.onclick = () => {
              // Verificar si es un componente obligatorio por action o por ID
              const isEssentialByAction = child.action && ['accept_all', 'reject_all', 'show_preferences'].includes(child.action.type);
              const isEssentialById = ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(child.id);
              const isEssential = isEssentialByAction || isEssentialById;
              
              // Lógica mejorada: usar siempre onUnattach para componentes esenciales
              // Esto los devolverá al canvas principal en lugar de eliminarlos
              if (isEssential) {
                if (onUnattach) {
                  // Pasar también el ID del contenedor padre para mejor posicionamiento
                  onUnattach(child.id, component.id);
                } else if (onRemoveChild) {
                  onRemoveChild(child.id);
                }
              } else if (onRemoveChild) {
                // Para componentes no esenciales, usar la función normal
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
            onUpdateStyle={(childId, newStyle) => {
              onUpdateStyle(childId, newStyle); // Usar el childId correcto, no el del contenedor
            }}
            onUpdateChildStyle={onUpdateChildStyle} // Función wrapper para actualizar estilo del hijo
            onAddChild={onAddChild} // FASE 4: Propagar función de agregar hijos para anidamiento
            onSelectChild={onSelectChild} // Propagar función de selección para hijos anidados
            selectedComponent={selectedComponent} // Propagar componente seleccionado
            onRemoveChild={onRemoveChild} // FASE 4: Propagar función de quitar del contenedor
            onUpdateChildPosition={onUpdateChildPosition} // FASE 4: Propagar función de actualizar posición de hijos
            onUnattach={onUnattach} // Propagar función de desadjuntar
            onReorderChildren={onReorderChildren} // NUEVO: Propagar función de reordenar
            allComponents={allComponents} // FASE 4: Propagar todos los componentes para validación
            resizeStep={resizeStep}
            isChild={true} // MARK: Child component flag
            parentId={component.id} // Pass parent container ID
            isPreview={isPreview} // CRÍTICO: Propagar el modo preview
            clientInfo={clientInfo} // NUEVA PROP: Propagar información del cliente
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
                // DEBUG:(`🎯 Handle click for child ${child.id}`);
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

  // Verificar y determinar información de imagen usando el sistema unificado
  // IMPORTANTE: Esta función DEBE usar el sistema unificado imageManager para manejar correctamente
  // las imágenes dentro de contenedores
  const getImageInfo = useCallback(() => {
    try {
      // Usar el sistema unificado para obtener la URL
      const imageSource = imageManager.getUnifiedImageUrl(component, deviceView, 'componentRenderer');
      
      const info = {
        isTemporaryRef: imageManager.isTemporaryImage(component, deviceView),
        isValidImageUrl: !!imageSource,
        imageSource,
        imageType: 'local'
      };
      
      if (imageSource) {
        // Verificar tipo de imagen con el nuevo sistema
        if (info.isTemporaryRef) {
          info.imageType = 'temp';
        } else if (imageSource.startsWith('http') || imageSource.startsWith('/templates/images/')) {
          info.imageType = 'server';
        } else if (imageSource.startsWith('data:image')) {
          info.imageType = 'local';
        } else if (imageSource.startsWith('blob:')) {
          info.imageType = 'blob';
        }
      }
      
      // Debug log para imágenes (solo si hay problemas)
      if (!info.isValidImageUrl && component.type === 'image') {
        console.log('🖼️ ComponentRenderer: Sin imagen válida:', {
          componentId: component.id,
          content: component.content,
          isTemporary: info.isTemporaryRef,
          isChild: !!component.parentId,
          finalImageSource: info.imageSource,
          imageType: info.imageType
        });
      }
      
      return info;
    } catch (error) {
      console.error('❌ ComponentRenderer: Error al procesar imagen:', error);
      return {
        isTemporaryRef: false,
        isValidImageUrl: false,
        imageSource: null,
        imageType: 'local'
      };
    }
  }, [component, deviceView, imageManager]);

  // Handlers genéricos para cualquier componente
  const handleGenericDragOver = (e) => {
    e.preventDefault();
    // DEBUG:(`🟢 DRAG OVER genérico en: ${component.type} (${component.id})`);
  };
  
  const handleGenericDrop = (e) => {
    e.preventDefault();
    
    const dragData = window.__dragData;
    
    // Si es un contenedor, NO hacer nada aquí porque ya se maneja en handleContainerDrop
    if (component.type === 'container') {
      return; // No delegar, ya se maneja específicamente
    } else {
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
        // Para contenedores hijos, adaptarse al contenedor padre
        width: isChild ? '100%' : (convertedDeviceStyle.width || '200px'),
        height: isChild ? '100%' : (convertedDeviceStyle.height || '100px'),
        // Estilos por defecto del contenedor
        backgroundColor: convertedDeviceStyle.backgroundColor || 'transparent',
        // FASE 4: Borde que indica nivel de anidamiento - usar propiedades específicas para evitar conflictos
        borderColor: convertedDeviceStyle.borderColor || (
          isSelected ? levelIndicator.color : 
          nestingDepth > 0 ? `${levelIndicator.color}40` : 
          '#e5e7eb' // Borde gris para contenedores no seleccionados
        ),
        borderStyle: convertedDeviceStyle.borderStyle || (isSelected ? 'dashed' : 'solid'),
        borderWidth: convertedDeviceStyle.borderWidth || (isSelected ? '2px' : '1px'),
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
          data-component-type="container"
          data-component-id={component.id}
          onDoubleClick={handleDoubleClick}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
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
          
          {/* FASE 4: Indicador simple para errores básicos (fallback) - DESHABILITADO POR SOLICITUD DEL USUARIO */}
          {/* {isDragOver && !dropValidation.isValid && !dropValidation.showError && (
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
          )} */}
          
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
                // DEBUG:('🔧 Resize handle clicked for container');
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
      // CORRECCIÓN: Respetar las dimensiones definidas para botones
      const buttonStyle = {
        ...convertedDeviceStyle,
        // Eliminar propiedades que interfieren con el tamaño del contenedor
        width: '100%',
        height: '100%',
        // Mantener estilos visuales pero no dimensiones
        minWidth: 'unset',
        minHeight: 'unset',
        boxSizing: 'border-box',
        // Asegurar que los bordes sean visibles si se han configurado
        borderWidth: convertedDeviceStyle.borderWidth || '2px',
        borderStyle: convertedDeviceStyle.borderStyle || 'solid',
        borderColor: convertedDeviceStyle.borderColor || '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: convertedDeviceStyle.textAlign === 'left' ? 'flex-start' :
                       convertedDeviceStyle.textAlign === 'right' ? 'flex-end' : 'center',
        textAlign: convertedDeviceStyle.textAlign || 'center',
        cursor: 'pointer', // Simular apariencia de botón
        transition: 'background-color 0.2s ease, color 0.2s ease'
      };

      // Crear clase CSS única para hover si hay estilos de hover definidos
      const buttonId = `btn-${component.id}`;
      const hasHoverStyles = convertedDeviceStyle.hoverBackgroundColor || convertedDeviceStyle.hoverColor;
      
      // Crear estilos de hover dinámicos
      let hoverStyles = '';
      if (hasHoverStyles) {
        hoverStyles = `
          .${buttonId}:hover {
            ${convertedDeviceStyle.hoverBackgroundColor ? `background-color: ${convertedDeviceStyle.hoverBackgroundColor} !important;` : ''}
            ${convertedDeviceStyle.hoverColor ? `color: ${convertedDeviceStyle.hoverColor} !important;` : ''}
          }
        `;
      }
      
      content = (
        <div 
          ref={containerRef}
          style={{
            position: 'relative',
            // IMPORTANTE: Usar las dimensiones convertidas directamente
            width: convertedDeviceStyle.width || '150px',
            height: convertedDeviceStyle.height || '40px',
            minWidth: '80px',
            minHeight: '30px',
            boxSizing: 'border-box'
          }}
        >
          {/* Inyectar estilos de hover dinámicos */}
          {hasHoverStyles && (
            <style>{hoverStyles}</style>
          )}
          
          <button 
            className={hasHoverStyles ? buttonId : ''}
            style={buttonStyle}
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
                // DEBUG:('🔧 Resize handle clicked for button');
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
      
      if (isChild) {
        // Debug info para imágenes dentro de contenedores
        if (process.env.NODE_ENV === 'development') {
          console.log(`🖼️ ComponentRenderer (HIJO): Imagen en contenedor ${component.id}`, {
            imageSource: imageInfo.imageSource,
            isTemporary: imageInfo.isTemporaryRef
          });
        }
      }
      
      content = (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            // Todas las imágenes usan las dimensiones del estilo
            width: convertedDeviceStyle.width || '150px',
            height: convertedDeviceStyle.height || '113px',
            cursor: component.locked ? 'default' : 'move',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            lineHeight: 0,
            fontSize: 0,
            boxSizing: 'border-box'
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
                // Todas las imágenes usan la misma lógica: llenar el contenedor manteniendo aspect ratio
                width: '100%',
                height: '100%',
                objectFit: convertedDeviceStyle.objectFit || 'contain',
                // WORKAROUND: Mostrar blob URLs y data URIs (placeholders) inmediatamente, otras esperar a que carguen
                opacity: (imageLoaded && !imageError) || (imageInfo.imageSource && (imageInfo.imageSource.startsWith('blob:') || imageInfo.imageSource.startsWith('data:'))) ? 1 : 0,
                transition: 'opacity 0.2s',
                display: 'block',
                margin: 0,
                padding: 0,
                verticalAlign: 'top',
                border: 'none',
                outline: 'none'
              }}
              onLoad={handleImageLoad}
              onError={(e) => {
                console.log('🚨 ComponentRenderer: Error cargando imagen:', {
                  componentId: component.id,
                  imageSource: imageInfo.imageSource,
                  error: e.target.error
                });
                
                // Solo reportar error real si no es blob URL o data URI que debería funcionar
                if (!imageInfo.imageSource.startsWith('blob:') && !imageInfo.imageSource.startsWith('data:')) {
                  // Usar el hook para manejar el error
                  imageManager.handleImageError(component.id, `Error cargando imagen: ${imageInfo.imageSource}`);
                }
                
                setImageError(true);
                setImageLoaded(true);
                // Guardar en caché que esta imagen dio error
                if (imageInfo.imageSource) {
                  imageLoadCache.set(imageInfo.imageSource, false);
                }
              }}
            />
          )}
          
          {/* Mostrar estado de carga usando el hook unificado */}
          {imageInfo.imageSource && (imageManager.isImageLoading(component.id) || (!imageLoaded && !imageError)) && (
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
          
          {/* Placeholder cuando no hay imagen o hay error usando el hook unificado */}
          {(!imageInfo.imageSource || (imageError && !imageInfo.imageSource.startsWith('blob:') && !imageInfo.imageSource.startsWith('data:'))) && (
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
                {imageError || imageManager.getImageError(component.id)
                  ? 'Error al cargar la imagen' 
                  : imageInfo.isTemporaryRef
                    ? 'Imagen seleccionada (vista en panel)'
                    : 'Haga doble clic para seleccionar'}
              </span>
              {(imageError || imageManager.getImageError(component.id)) && imageInfo.imageSource && (
                <span style={{ fontSize: '10px', textAlign: 'center', padding: '5px 10px 0', color: '#999' }}>
                  URL: {typeof imageInfo.imageSource === 'string' 
                    ? (imageInfo.imageSource.length > 30 
                      ? imageInfo.imageSource.substring(0, 30) + '...' 
                      : imageInfo.imageSource)
                    : 'Formato no válido'}
                </span>
              )}
              {imageManager.getImageError(component.id) && (
                <span style={{ fontSize: '10px', textAlign: 'center', padding: '5px 10px 0', color: '#d32f2f' }}>
                  {imageManager.getImageError(component.id)}
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
                  // DEBUG:('🔧 Resize handle clicked for image');
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
              {(() => {
                // Convertir el aspect ratio decimal a formato W:H
                const tolerance = 0.01;
                
                // Ratios comunes
                if (Math.abs(aspectRatio - 16/9) < tolerance) return '16:9';
                if (Math.abs(aspectRatio - 4/3) < tolerance) return '4:3';
                if (Math.abs(aspectRatio - 1) < tolerance) return '1:1';
                if (Math.abs(aspectRatio - 3/2) < tolerance) return '3:2';
                if (Math.abs(aspectRatio - 21/9) < tolerance) return '21:9';
                if (Math.abs(aspectRatio - 9/16) < tolerance) return '9:16';
                
                // Para otros ratios, intentar simplificar
                const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                const width = Math.round(aspectRatio * 100);
                const height = 100;
                const divisor = gcd(width, height);
                const simplifiedWidth = width / divisor;
                const simplifiedHeight = height / divisor;
                
                // Si la simplificación resulta en números razonables, usarla
                if (simplifiedWidth < 100 && simplifiedHeight < 100) {
                  return `${simplifiedWidth}:${simplifiedHeight}`;
                }
                
                // De lo contrario, mostrar el decimal
                return `${Math.round(aspectRatio * 100) / 100}:1`;
              })()}
            </div>
          )}
          
          {/* Indicador de tipo de imagen mejorado */}
          {imageInfo.imageSource && (
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              backgroundColor: 
                imageInfo.imageType === 'temp' ? 'rgba(59, 130, 246, 0.8)' :     // Azul para temporal
                imageInfo.imageType === 'server' ? 'rgba(16, 185, 129, 0.8)' :   // Verde para servidor
                imageInfo.imageType === 'blob' ? 'rgba(245, 158, 11, 0.8)' :     // Amarillo para blob
                imageInfo.imageType === 'local' ? 'rgba(139, 69, 19, 0.8)' :     // Marrón para local
                'rgba(99, 102, 241, 0.8)',                                        // Púrpura por defecto
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '0 0 4px 0',
              fontWeight: 'bold'
            }}>
              {imageInfo.imageType === 'temp' ? '📷 Temp' :
               imageInfo.imageType === 'server' ? '☁️ Server' :
               imageInfo.imageType === 'blob' ? '🔗 Blob' :
               imageInfo.imageType === 'local' ? '💾 Local' :
               '🖼️ Image'}
            </div>
          )}
          
          {/* Indicador de paso de resize - solo mostrar cuando se está redimensionando */}
          {false && resizeStep > 1 && (
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
    case 'language-button':
      // Usar el componente LanguageButton
      content = (
        <div 
          ref={containerRef}
          style={{
            position: 'relative',
            width: convertedDeviceStyle.width || '120px',
            height: convertedDeviceStyle.height || '35px',
            minWidth: '80px',
            minHeight: '30px',
            boxSizing: 'border-box'
          }}
        >
          <LanguageButton
            config={component.content || {}}
            isPreview={isPreview}
            isSelected={isSelected}
            style={{
              [deviceView]: {
                ...convertedDeviceStyle,
                width: '100%',
                height: '100%'
              }
            }}
            onStyleChange={onUpdateStyle}
            onConfigChange={(newConfig) => {
              if (onUpdateContent) {
                onUpdateContent(component.id, newConfig);
              }
            }}
            deviceView={deviceView}
          />
          
          {/* Badge de "Obligatorio" - SOLO en modo editor */}
          {!isPreview && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#7c3aed',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                zIndex: 1000,
                fontWeight: 'bold'
              }}
            >
              Obligatorio
            </div>
          )}
          
          {/* Control de resize */}
          {!component.locked && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '20px',
                height: '20px',
                backgroundColor: 'rgba(124, 58, 237, 0.7)',
                cursor: 'nwse-resize',
                borderTopLeftRadius: '3px',
                zIndex: 10000
              }}
              className="resize-handle"
              data-resize-handle="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResizeStart(e);
              }}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Redimensionar selector de idioma"
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
    case 'text':
    default:
      // CORRECCIÓN: Respetar las dimensiones definidas para textos
      const textStyle = {
        ...convertedDeviceStyle,
        // IMPORTANTE: Usar las dimensiones convertidas directamente
        width: convertedDeviceStyle.width || '150px',
        height: convertedDeviceStyle.height || '40px',
        // Establecer mínimos razonables
        minWidth: '50px',
        minHeight: '20px',
        // Asegurar que el contenedor sea de tamaño fijo (box-sizing)
        boxSizing: 'border-box',
        // Permitir bordes personalizados si se configuran
        borderWidth: convertedDeviceStyle.borderWidth || '0px',
        borderStyle: convertedDeviceStyle.borderStyle || 'solid',
        borderColor: convertedDeviceStyle.borderColor || 'transparent',
        padding: convertedDeviceStyle.padding || '10px',
        overflow: 'hidden',
        wordWrap: 'break-word',
        position: 'relative', // Importante para posicionar el control de resize
        display: 'block', // Usar display block para texto
        textAlign: convertedDeviceStyle.textAlign || 'left', // Aplicar alineación de texto directamente
      };
      
      content = (
        <div 
          ref={containerRef}
          style={textStyle}
          onDoubleClick={handleDoubleClick}
        >
          <div style={{
            width: '100%',
            textAlign: convertedDeviceStyle.textAlign || 'left',
            wordBreak: 'break-word',
            overflow: 'hidden'
          }}>
            {displayContent || 'Texto'}
          </div>
          
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
                // DEBUG:('🔧 Resize handle clicked for text');
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
      onDragOver={handleGenericDragOver}
      onDrop={handleGenericDrop}
      data-component-id={component.id}
      data-component-type={component.type}
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

export default memo(ComponentRenderer, (prevProps, nextProps) => {
  // Optimización: Solo re-renderizar si cambian propiedades importantes
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.type === nextProps.component.type &&
    prevProps.component.content === nextProps.component.content &&
    prevProps.component.style === nextProps.component.style &&
    prevProps.component.locked === nextProps.component.locked &&
    prevProps.component.visible === nextProps.component.visible &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.deviceView === nextProps.deviceView &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onAddChild === nextProps.onAddChild &&
    // Para contenedores, verificar cambios en hijos
    (prevProps.component.type !== 'container' || 
     (prevProps.component.children?.length === nextProps.component.children?.length &&
      JSON.stringify(prevProps.component.children) === JSON.stringify(nextProps.component.children)))
  );
});