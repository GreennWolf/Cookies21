import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Type, Box, Move, X, RefreshCw } from 'lucide-react';
import ComponentSizeInfo from './ComponentSizeInfo';
import PositionUtils from '../../../utils/positionUtils';
import ImageUploader from './ImageUploader';
import DimensionControl from './DimensionControl';
import BorderControl from './BorderControl';
import handleAutocompleteSize from './handleAutocompleteSize';
import ContainerPropertyPanel from './ContainerPropertyPanel'; // NUEVO - FASE 3
import ContainerContentPanel from './ContainerContentPanel'; // NUEVO - FASE 4 EDICIÓN

// Estilos para el scrollbar y el indicador - Versión optimizada
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(99, 102, 241, 0.6) rgba(243, 244, 246, 0.3);
    padding-bottom: 40px; /* Espacio adicional al final para evitar que el contenido se oculte */
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 10px; /* Más ancho para mejor visibilidad y usabilidad */
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(243, 244, 246, 0.4);
    border-radius: 5px;
    margin: 4px 0; /* Espacio en los extremos del track */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(99, 102, 241, 0.6);
    border-radius: 5px;
    border: 2px solid rgba(243, 244, 246, 0.3);
    transition: background-color 0.3s ease;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(79, 82, 221, 0.8);
  }
  
  /* Añadir padding al contenido para evitar que se oculte detrás del scrollbar */
  .custom-scrollbar-content {
    padding-right: 4px;
    padding-bottom: 50px; /* Espacio adicional al final */
  }
  
  /* Estilos para el indicador de scroll con animación mejorada */
  .scroll-indicator {
    animation: pulse 1.5s infinite alternate;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
    transform-origin: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.2);
      opacity: 1;
    }
  }
  
  .scroll-indicator:hover {
    animation-play-state: paused;
    transform: scale(1.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  /* Asegurar que el contenido tenga suficiente espacio al final */
  .tab-content {
    padding-bottom: 40px;
  }
`;

function BannerPropertyPanel({ 
  component, 
  deviceView, 
  updateStyle, // COMPATIBILIDAD: Mantenemos este nombre
  onUpdateStyle, // NUEVO: Aceptamos ambos nombres
  onUpdateContent, 
  onUpdatePosition, 
  onUpdateContainer, // NUEVO - FASE 2: Función para actualizar configuración de contenedor
  onAddChild, // NUEVO - FASE 4 EDICIÓN: Función para agregar hijo a contenedor
  onRemoveChild, // NUEVO - Función para quitar hijo de contenedor (para componentes obligatorios)
  onReorderChildren, // NUEVO: Para reordenar componentes dentro de contenedores
  onSelectComponent, // NUEVO: Para seleccionar componentes
  onUnattach, // NUEVO: Para desadjuntar componentes de contenedores
  selectedComponent, // NUEVO: Componente seleccionado actualmente
  onClose, 
  onAlignElements,
  embedded = true // Ahora por defecto está integrado en el sidebar
}) {
  // Usar la versión correcta de la función de actualización de estilos
  const updateStyleFn = onUpdateStyle || updateStyle;
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
  // Estado para controlar la visibilidad del indicador de scroll
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  
  // Estados para advertencias de posición
  const [positionWarnings, setPositionWarnings] = useState({
    top: null,
    left: null
  });
  
  // Estado para notificación de ajuste automático
  const [autoAdjustNotification, setAutoAdjustNotification] = useState(null);

  // Función centralizada para obtener dimensiones reales
  const getDimensions = useCallback(() => {
    try {
      const componentEl = document.querySelector(`[data-component-id="${component.id}"]`);
      if (!componentEl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`No se encontró elemento con ID ${component.id}`);
        }
        return null;
      }
      
      const containerEl = componentEl.closest('.banner-container');
      if (!containerEl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No se encontró el contenedor .banner-container');
        }
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
        width: widthPx,       // Renombrado para compatibilidad con handleAutocompleteSize
        height: heightPx,     // Renombrado para compatibilidad con handleAutocompleteSize
        widthPx,
        heightPx,
        widthPercent,
        heightPercent,
        originalStyles
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error al obtener dimensiones:", error);
      }
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
  
  // Efecto mejorado para controlar el indicador de scroll
  useEffect(() => {
    // Función para verificar si hay contenido scrollable y actualizar el estado
    const checkScrollStatus = () => {
      // Encontrar el elemento scrollable actual (según la pestaña activa)
      const scrollElements = document.querySelectorAll('.custom-scrollbar');
      let needsIndicator = false;
      
      scrollElements.forEach(element => {
        // Calcular con precisión cuánto scroll queda disponible
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const scrollTop = element.scrollTop;
        const scrollRemaining = scrollHeight - scrollTop - clientHeight;
        
        // Umbral más generoso (50px) para determinar si hay contenido significativo debajo
        const isScrollable = scrollHeight > clientHeight + 30; // Contenido mínimo scrollable
        const hasMoreContent = scrollRemaining > 50; // Al menos 50px de contenido por debajo
        
        // Mostrar indicador si hay suficiente contenido y queda más por mostrar
        if (isScrollable && hasMoreContent) {
          needsIndicator = true;
          // Para debugging
        }
      });
      
      setShowScrollIndicator(needsIndicator);
    };
    
    // Función throttled para manejar eventos de scroll (evita llamadas excesivas)
    let scrollTimer;
    const handleScroll = (e) => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        checkScrollStatus();
      }, 100); // Throttle de 100ms
    };
    
    // Buscar los elementos con scroll y agregar listeners
    const scrollElements = document.querySelectorAll('.custom-scrollbar');
    scrollElements.forEach(element => {
      element.addEventListener('scroll', handleScroll);
    });
    
    // Verificar inicialmente si es necesario mostrar el indicador
    // Retrasar un poco más para asegurar que todo el contenido esté renderizado
    setTimeout(checkScrollStatus, 300);
    
    // Agregar detector de mutaciones para detectar cambios en el DOM
    // Esto es útil cuando se cambia entre pestañas o se carga contenido dinámicamente
    const observer = new MutationObserver(checkScrollStatus);
    scrollElements.forEach(element => {
      observer.observe(element, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });
    
    // Agregar detector de redimensión para recalcular cuando cambia el tamaño del panel
    window.addEventListener('resize', checkScrollStatus);
    
    // Limpiar event listeners y observer
    return () => {
      scrollElements.forEach(element => {
        element.removeEventListener('scroll', handleScroll);
      });
      window.removeEventListener('resize', checkScrollStatus);
      observer.disconnect();
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [activeTab]); // Dependencia de activeTab para que se reactive al cambiar de pestaña

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

  // Función para validar límites de posición (solo advertencias, no auto-corrección)
  const validatePositionBounds = (property, value, unit, dims) => {
    if (unit !== '%') return { isValid: true }; // Solo validamos porcentajes
    
    const isHorizontal = property === 'left';
    const componentSize = isHorizontal ? dims.widthPx : dims.heightPx;
    const containerSize = isHorizontal ? dims.containerRect.width : dims.containerRect.height;
    
    // Calcular posición en píxeles
    const pixelPosition = PositionUtils.percentToPixels(value, containerSize);
    
    // Verificar si se sale del contenedor
    const maxAllowedPosition = containerSize - componentSize;
    
    const isValid = pixelPosition >= 0 && pixelPosition <= maxAllowedPosition;
    
    return {
      isValid,
      value: pixelPosition,
      maxAllowed: maxAllowedPosition,
      warning: !isValid ? `Posición fuera del contenedor (máx: ${PositionUtils.pixelsToPercent(maxAllowedPosition, containerSize).toFixed(1)}%)` : null
    };
  };

  // Función para ajustar automáticamente la posición cuando el tamaño cause desbordamiento
  const adjustPositionIfOverflowing = (dimensionProperty, dimensionValue) => {
    try {
      // Obtener dimensiones actuales
      const dims = getDimensions();
      if (!dims) return;

      const { containerRect, widthPx, heightPx } = dims;

      // Parsear las posiciones actuales
      const currentTop = parseFloat(localPosition.top) || 0;
      const currentLeft = parseFloat(localPosition.left) || 0;

      // Convertir posiciones a píxeles para cálculos
      const topPx = PositionUtils.percentToPixels(currentTop, containerRect.height);
      const leftPx = PositionUtils.percentToPixels(currentLeft, containerRect.width);

      // Determinar nuevas dimensiones del componente
      let newWidthPx = widthPx;
      let newHeightPx = heightPx;

      if (dimensionProperty === 'width') {
        // Parsear el nuevo ancho
        const numValue = parseFloat(dimensionValue);
        if (!isNaN(numValue)) {
          if (dimensionValue.includes('%')) {
            newWidthPx = PositionUtils.percentToPixels(numValue, containerRect.width);
          } else {
            newWidthPx = numValue;
          }
        }
      } else if (dimensionProperty === 'height') {
        // Parsear la nueva altura
        const numValue = parseFloat(dimensionValue);
        if (!isNaN(numValue)) {
          if (dimensionValue.includes('%')) {
            newHeightPx = PositionUtils.percentToPixels(numValue, containerRect.height);
          } else {
            newHeightPx = numValue;
          }
        }
      }

      // Calcular límites máximos de posición
      const maxLeftPx = containerRect.width - newWidthPx;
      const maxTopPx = containerRect.height - newHeightPx;

      // Verificar si necesita ajuste y aplicarlo
      let needsUpdate = false;
      let newTopPx = topPx;
      let newLeftPx = leftPx;

      // Ajustar horizontalmente si se sale por la derecha
      if (leftPx + newWidthPx > containerRect.width) {
        newLeftPx = Math.max(0, maxLeftPx);
        needsUpdate = true;
      }

      // Ajustar verticalmente si se sale por abajo
      if (topPx + newHeightPx > containerRect.height) {
        newTopPx = Math.max(0, maxTopPx);
        needsUpdate = true;
      }

      // Aplicar ajustes si es necesario
      if (needsUpdate) {
        const newTopPercent = PositionUtils.pixelsToPercent(newTopPx, containerRect.height);
        const newLeftPercent = PositionUtils.pixelsToPercent(newLeftPx, containerRect.width);

        const adjustedPosition = {
          top: `${newTopPercent.toFixed(2)}%`,
          left: `${newLeftPercent.toFixed(2)}%`
        };


        // Actualizar estado local
        setLocalPosition(adjustedPosition);

        // Actualizar el componente
        if (typeof onUpdatePosition === 'function') {
          onUpdatePosition(component.id, adjustedPosition);
        }

        // Limpiar advertencias ya que la posición ahora es válida
        setPositionWarnings({ top: null, left: null });

        // Mostrar notificación de ajuste automático
        setAutoAdjustNotification('Posición ajustada automáticamente para evitar desbordamiento');
        setTimeout(() => {
          setAutoAdjustNotification(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error al ajustar posición automáticamente:', error);
    }
  };

  // Manejador de cambios de estilo optimizado
  const handleStyleChange = (property, value) => {
    // Actualizar estado local
    const newStyle = { ...localStyle, [property]: value };
    setLocalStyle(newStyle);
    
    // Enviar cambios al componente padre - solamente para el dispositivo actual
    updateStyleFn(component.id, newStyle);
    
    // Si el cambio es de dimensiones (width/height), verificar y ajustar posición automáticamente
    if (property === 'width' || property === 'height') {
      setTimeout(() => {
        adjustPositionIfOverflowing(property, value);
      }, 100); // Pequeño delay para que se aplique el estilo primero
    }
  };

  // NUEVO: Manejador de cambios de configuración de contenedor - FASE 2
  const handleContainerConfigChange = (property, value) => {
    
    try {
      // Obtener configuración actual del contenedor para este dispositivo
      const currentContainerConfig = component.containerConfig || {};
      const currentDeviceConfig = currentContainerConfig[deviceView] || {};
      
      // Crear nueva configuración para el dispositivo actual
      const newDeviceConfig = {
        ...currentDeviceConfig,
        [property]: value
      };
      
      // Crear objeto completo de configuración del contenedor (mantener otros dispositivos)
      const newContainerConfig = {
        ...currentContainerConfig,
        [deviceView]: newDeviceConfig
      };
      
      
      // Llamar función de actualización del contenedor
      if (typeof onUpdateContainer === 'function') {
        onUpdateContainer(component.id, newContainerConfig);
      } else {
        console.warn('No se proporcionó función onUpdateContainer para actualizar configuración de contenedor');
        
        // Fallback: disparar evento personalizado para que el editor actualice el componente
        if (typeof window !== 'undefined') {
          // Usamos window.dispatchEvent para que coincida con el listener en BannerEditor
          window.dispatchEvent(new CustomEvent('container:config:update', {
            detail: {
              componentId: component.id,
              containerConfig: newContainerConfig
            }
          }));
        }
      }
      
    } catch (error) {
      console.error('Error al actualizar configuración de contenedor:', error);
    }
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
    const containerSize = isHorizontal ? dims.containerRect.width : dims.containerRect.height;
    const componentSize = isHorizontal ? dims.widthPx : dims.heightPx;
    
    let finalValue = numValue;
    let finalUnit = unit;
    
    // NUEVA LÓGICA: Si viene en píxeles, convertir automáticamente a porcentajes
    if (unit === 'px') {
      finalValue = PositionUtils.pixelsToPercent(numValue, containerSize);
      finalUnit = '%';
    }
    
    // Formatear valor con la unidad final
    const formattedValue = PositionUtils.formatWithUnit(finalValue, finalUnit);
    
    // Validar si la posición está fuera de los límites (solo para mostrar advertencia)
    const validation = validatePositionBounds(property, finalValue, finalUnit, dims);
    
    // Actualizar advertencias
    setPositionWarnings(prev => ({
      ...prev,
      [property]: validation.warning
    }));
    
    // Actualizar estado local (sin auto-corrección)
    const newPos = { ...localPosition, [property]: formattedValue };
    setLocalPosition(newPos);
    
    // Limpiar propiedades que pueden interferir
    const cleanupProps = PositionUtils.getCleanupProps();
    Object.entries(cleanupProps).forEach(([prop, value]) => {
      handleStyleChange(prop, value);
    });
    
    // Enviar cambios al componente padre
    if (typeof onUpdatePosition === 'function') {
      onUpdatePosition(component.id, newPos);
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
        } else if (property === 'top') {
          percentValue = (numValue / dims.containerRect.height) * 100;
        }
        
        handlePositionChange(property, percentValue.toFixed(2), '%');
      }
      // Si cambiamos de % a px, convertir con precisión
      else if (oldUnit === '%' && newUnit === 'px') {
        let pxValue;
        
        // Conversión precisa basada en el tamaño real del contenedor
        if (property === 'left') {
          pxValue = (numValue * dims.containerRect.width) / 100;
        } else if (property === 'top') {
          pxValue = (numValue * dims.containerRect.height) / 100;
        }
        
        handlePositionChange(property, pxValue.toFixed(0), 'px');
      }
      // Si no cambia la unidad, simplemente actualizar el valor con precisión
      else {
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
      
      
      // Calcular posición usando el utilitario centralizado
      const position = PositionUtils.calculatePositionByCode(positionCode, dims);
      
      
      // Asegurar que tenemos función de actualización
      if (!onUpdatePosition) {
        console.error('❌ ERROR: onUpdatePosition no está definida');
        return;
      }
      
      // Formatear posiciones como porcentajes
      const topValue = `${position.top}%`;
      const leftValue = `${position.left}%`;
      
      // Definir posición con tipo seguro
      const newPosition = {
        top: topValue,
        left: leftValue
      };
      
      // Actualizar también los valores de porcentaje para calidad de vida
      if (typeof position.top === 'number') {
        newPosition.percentY = position.top;
      }
      
      if (typeof position.left === 'number') {
        newPosition.percentX = position.left;
      }
      
      // Actualizar posición directamente - usando try/catch para manejo de errores
      try {
        onUpdatePosition(component.id, newPosition);
      } catch (error) {
        console.error('❌ Error al llamar onUpdatePosition:', error);
        // Intento alternativo con solo top y left para evitar errores
        try {
          onUpdatePosition(component.id, { 
            top: topValue, 
            left: leftValue 
          });
        } catch (fallbackError) {
          console.error('❌ También falló el fallback de posicionamiento:', fallbackError);
        }
      }
      
      // Actualizar estado local
      setLocalPosition({
        top: topValue,
        left: leftValue,
        percentX: position.left,
        percentY: position.top
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
      
      
      // Asegurar que tenemos función de actualización
      if (!onUpdatePosition) {
        console.error('❌ ERROR: onUpdatePosition no está definida');
        return;
      }
      
      // Aplicar alineación según el tipo con cálculos precisos
      switch (alignment) {
        case 'center-h': {
          // Centrar horizontalmente con precisión
          const centerLeft = (50 - (dims.widthPercent / 2)).toFixed(2);
          
          // Usar método directo con manejo de errores
          try {
            onUpdatePosition(component.id, {
              left: `${centerLeft}%`,
              percentX: parseFloat(centerLeft)
            });
          } catch (error) {
            console.error('❌ Error en center-h:', error);
            // Intento alternativo sin percentX
            try {
              onUpdatePosition(component.id, { left: `${centerLeft}%` });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            left: `${centerLeft}%`,
            percentX: parseFloat(centerLeft)
          }));
          
          break;
        }
        case 'center-v': {
          // Centrar verticalmente con precisión
          const centerTop = (50 - (dims.heightPercent / 2)).toFixed(2);
          
          try {
            onUpdatePosition(component.id, {
              top: `${centerTop}%`,
              percentY: parseFloat(centerTop)
            });
          } catch (error) {
            console.error('❌ Error en center-v:', error);
            // Intento alternativo sin percentY
            try {
              onUpdatePosition(component.id, { top: `${centerTop}%` });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            top: `${centerTop}%`,
            percentY: parseFloat(centerTop)
          }));
          
          break;
        }
        case 'center-both': {
          // Calcular centrado en ambos ejes
          const centerTop = (50 - (dims.heightPercent / 2)).toFixed(2);
          const centerLeft = (50 - (dims.widthPercent / 2)).toFixed(2);
          
          // Actualizamos ambas propiedades a la vez con manejo de errores
          try {
            onUpdatePosition(component.id, {
              top: `${centerTop}%`,
              left: `${centerLeft}%`,
              percentX: parseFloat(centerLeft),
              percentY: parseFloat(centerTop)
            });
          } catch (error) {
            console.error('❌ Error en center-both:', error);
            // Intento alternativo sin percentX/percentY
            try {
              onUpdatePosition(component.id, { 
                top: `${centerTop}%`, 
                left: `${centerLeft}%` 
              });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizamos el estado local también
          setLocalPosition({
            top: `${centerTop}%`,
            left: `${centerLeft}%`,
            percentX: parseFloat(centerLeft),
            percentY: parseFloat(centerTop)
          });
          
          break;
        }
        case 'left': {
          // Alinear a la izquierda
          try {
            onUpdatePosition(component.id, {
              left: '0%',
              percentX: 0
            });
          } catch (error) {
            console.error('❌ Error en left:', error);
            // Intento alternativo sin percentX
            try {
              onUpdatePosition(component.id, { left: '0%' });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            left: '0%',
            percentX: 0
          }));
          
          break;
        }
        case 'right': {
          // Alinear a la derecha con precisión
          const rightPos = (100 - dims.widthPercent).toFixed(2);
          
          try {
            onUpdatePosition(component.id, {
              left: `${rightPos}%`,
              percentX: parseFloat(rightPos)
            });
          } catch (error) {
            console.error('❌ Error en right:', error);
            // Intento alternativo sin percentX
            try {
              onUpdatePosition(component.id, { left: `${rightPos}%` });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            left: `${rightPos}%`,
            percentX: parseFloat(rightPos)
          }));
          
          break;
        }
        case 'top': {
          // Alinear arriba
          try {
            onUpdatePosition(component.id, {
              top: '0%',
              percentY: 0
            });
          } catch (error) {
            console.error('❌ Error en top:', error);
            // Intento alternativo sin percentY
            try {
              onUpdatePosition(component.id, { top: '0%' });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            top: '0%',
            percentY: 0
          }));
          
          break;
        }
        case 'bottom': {
          // Alinear abajo con precisión
          const bottomPos = (100 - dims.heightPercent).toFixed(2);
          
          try {
            onUpdatePosition(component.id, {
              top: `${bottomPos}%`,
              percentY: parseFloat(bottomPos)
            });
          } catch (error) {
            console.error('❌ Error en bottom:', error);
            // Intento alternativo sin percentY
            try {
              onUpdatePosition(component.id, { top: `${bottomPos}%` });
            } catch (fallbackError) {
              console.error('❌ Falló también el fallback:', fallbackError);
            }
          }
          
          // Actualizar estado local
          setLocalPosition(prev => ({
            ...prev,
            top: `${bottomPos}%`,
            percentY: parseFloat(bottomPos)
          }));
          
          break;
        }
        default:
          console.warn(`⚠️ Tipo de alineación desconocido: ${alignment}`);
      }
      
      // Eliminar cualquier transformación existente para evitar conflictos
      if (updateStyleFn) {
        updateStyleFn({ transform: 'none' });
      }
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
        _tempFile: file,  // Asegurar que se guarda el objeto File, no un objeto vacío
        // NUEVO: Establecer dimensiones por defecto si no existen para evitar contenedores gigantes
        // IMPORTANTE: Solo para imágenes independientes, NO para imágenes dentro de contenedores
        ...((!localStyle.width || !localStyle.height) && !component.parentId && {
          width: '200px',
          height: '150px',
          objectFit: 'contain'
        })
      };
      
      // Actualizar estilo local
      setLocalStyle(updatedStyle);
      
      
      // Enviar actualización al componente padre
      updateStyleFn(component.id, updatedStyle);
      
      // También actualizar referencia directa en el componente para mayor seguridad
      setTimeout(() => {
        try {
          const compEl = document.querySelector(`[data-component-id="${component.id}"]`);
          if (compEl && compEl.parentNode) {
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
      <div className="flex-1 flex flex-col h-full">
        {/* Estilos del scrollbar inline si es necesario */}
        <style>{scrollbarStyles}</style>
        
        {/* Notificación de ajuste automático */}
        {autoAdjustNotification && (
          <div className="bg-green-50 border-l-4 border-green-400 p-2 mx-2 my-1 rounded">
            <div className="flex items-center">
              <div className="text-green-600 text-xs">
                ✅ {autoAdjustNotification}
              </div>
            </div>
          </div>
        )}
        
        {/* Tabs - Fijados en la parte superior */}
        <div className="flex border-b sticky top-0 bg-white z-10">
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

        {/* Área con scroll para el contenido */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative max-h-[calc(100vh-140px)]">
          {/* Indicador de scroll mejorado - mostrar solo cuando es necesario */}
          {showScrollIndicator && (
            <div 
              className="absolute right-2 bottom-4 z-20 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg scroll-indicator cursor-pointer"
              title="Desplazar hacia abajo para ver más opciones"
              onClick={() => {
                // Función para scroll suave al hacer clic en el indicador
                const scrollElement = document.querySelector('.custom-scrollbar');
                if (scrollElement) {
                  const currentPos = scrollElement.scrollTop;
                  scrollElement.scrollTo({
                    top: currentPos + 300, // Desplazar 300px adicionales (aumentado)
                    behavior: 'smooth'
                  });
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 13l5 5 5-5"/>
                <path d="M7 6l5 5 5-5"/>
              </svg>
            </div>
          )}
          {/* Pestaña de Contenido */}
          {activeTab === 'content' && (
            <div className="p-4 space-y-5 pb-16">
              {component.type === 'container' ? (
                <ContainerContentPanel 
                  component={component}
                  deviceView={deviceView}
                  onAddChild={onAddChild} // FASE 4 EDICIÓN: Función para agregar hijo
                  onRemoveChild={onRemoveChild} // NUEVO: Función para quitar hijo (componentes obligatorios)
                  onSelectChild={onSelectComponent} // Agregamos función para selección
                  onReorderChildren={onReorderChildren} // Agregamos función para reordenar
                  selectedComponent={selectedComponent} // Agregamos componente seleccionado
                  onUnattach={onUnattach} // Agregamos función para extraer componentes obligatorios
                />
              ) : component.type === 'image' ? (
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
            <div className="p-3 space-y-4 pb-16">
              {/* Sección de Dimensiones */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-xs flex items-center gap-1">
                    <Box size={14} />
                    Dimensiones
                  </h4>
                  
                  {/* Botón para autocompletar todas las dimensiones */}
                  <button
                    onClick={() => {
                      const dims = getDimensions();
                      if (!dims || !dims.containerRect) return;
                      
                      // Determinar dimensiones ideales según tipo de componente
                      const deviceView = 'desktop'; // Usar vista actual
                      
                      // Obtener dimensiones para ancho
                      const idealWidth = handleAutocompleteSize(
                        component.type,
                        deviceView,
                        'width',
                        'px',
                        getDimensions
                      );
                      
                      // Obtener dimensiones para alto
                      const idealHeight = handleAutocompleteSize(
                        component.type,
                        deviceView,
                        'height',
                        'px',
                        getDimensions
                      );
                      
                      // Obtener dimensiones para ancho máximo
                      const idealMaxWidth = handleAutocompleteSize(
                        component.type,
                        deviceView,
                        'maxWidth',
                        'px',
                        getDimensions
                      );
                      
                      // Aplicar cambios si tenemos valores válidos - ORDEN IMPORTANTE
                      // Primero maxWidth, luego width, y finalmente height para evitar conflictos
                      
                      // Obtener dimensiones originales antes de aplicar cambios
                      const originalDims = getDimensions();
                      const originalRect = originalDims?.compRect;
                      
                      // Guardar posición original para reposicionar si es necesario
                      let needsRepositioning = false;
                      
                      if (idealMaxWidth) {
                        handleStyleChange('maxWidth', `${Math.round(idealMaxWidth)}px`);
                      }
                      
                      if (idealWidth) {
                        // Si el nuevo ancho es mayor que el contenedor, marcar para reposicionamiento
                        if (originalRect && idealWidth > originalDims.containerRect.width) {
                          needsRepositioning = true;
                        }
                        handleStyleChange('width', `${Math.round(idealWidth)}px`);
                      }
                      
                      if (idealHeight) {
                        // Si la nueva altura es mayor que el contenedor, marcar para reposicionamiento
                        if (originalRect && idealHeight > originalDims.containerRect.height) {
                          needsRepositioning = true;
                        }
                        handleStyleChange('height', `${Math.round(idealHeight)}px`);
                      }
                      
                      // Si necesitamos reposicionar, verificar que no se desborda del canvas
                      if (needsRepositioning && originalRect) {
                        setTimeout(() => {
                          const newDims = getDimensions();
                          if (!newDims || !newDims.compRect) return;
                          
                          const canvasRect = newDims.containerRect;
                          const compRect = newDims.compRect;
                          
                          // Comprobar desbordamiento horizontal
                          const rightEdge = compRect.left - canvasRect.left + compRect.width;
                          if (rightEdge > canvasRect.width) {
                            // Calcular nueva posición left
                            const overflow = rightEdge - canvasRect.width;
                            const currentLeft = parseFloat(component.position?.[deviceView]?.left) || 0;
                            const newLeft = Math.max(0, (currentLeft - overflow / canvasRect.width * 100));
                            
                            // Aplicar nueva posición
                            handlePositionChange('left', newLeft, '%');
                          }
                          
                          // Comprobar desbordamiento vertical
                          const bottomEdge = compRect.top - canvasRect.top + compRect.height;
                          if (bottomEdge > canvasRect.height) {
                            // Calcular nueva posición top
                            const overflow = bottomEdge - canvasRect.height;
                            const currentTop = parseFloat(component.position?.[deviceView]?.top) || 0;
                            const newTop = Math.max(0, (currentTop - overflow / canvasRect.height * 100));
                            
                            // Aplicar nueva posición
                            handlePositionChange('top', newTop, '%');
                          }
                        }, 50);
                      }
                      
                    }}
                    className="text-xs px-1 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 flex items-center gap-1 transition-colors"
                    title="Auto-dimensionar según canvas"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="M13 17H7v-6h6V4h6v6h-6v7z"/>
                    </svg>
                    <span>Auto</span>
                  </button>
                </div>
                
                {/* Usar DimensionControl */}
                <DimensionControl
                  label="Ancho"
                  property="width"
                  value={localStyle.width}
                  onChange={handleStyleChange}
                  containerSize={getDimensions()?.containerRect?.width || 0}
                  min={0}
                  max={2000}
                  componentType={component.type}
                  componentId={component.id} // Pasar el ID para obtener dimensiones reales
                />
                
                <DimensionControl
                  label="Alto"
                  property="height"
                  value={localStyle.height}
                  onChange={handleStyleChange}
                  containerSize={getDimensions()?.containerRect?.height || 0}
                  min={0}
                  max={2000}
                  componentType={component.type}
                  componentId={component.id} // Pasar el ID para obtener dimensiones reales
                />
                
                <DimensionControl
                  label="Ancho Máximo"
                  property="maxWidth"
                  value={localStyle.maxWidth}
                  onChange={handleStyleChange}
                  containerSize={getDimensions()?.containerRect?.width || 0}
                  min={0}
                  max={2000}
                  componentType={component.type}
                  componentId={component.id} // Pasar el ID para obtener dimensiones reales
                />
              </div>

              {/* Sección específica para Contenedores - FASE 3: Componente especializado */}
              {component.type === 'container' && (
                <ContainerPropertyPanel
                  component={component}
                  deviceView={deviceView}
                  onContainerConfigChange={handleContainerConfigChange}
                />
              )}

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
                      value={localStyle.backgroundColor === 'transparent' ? '#ffffff' : (localStyle.backgroundColor || '#ffffff')}
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
                      value={localStyle.color === 'transparent' ? '#000000' : (localStyle.color || '#000000')}
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
              
              {/* Sección de Bordes */}
              <div className="space-y-3">
                <h4 className="font-medium text-xs flex items-center gap-1">
                  <Box size={14} />
                  Bordes
                </h4>
                <div className="space-y-2">
                  <label className="block text-xs">Color de borde</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localStyle.borderColor === 'transparent' ? '#000000' : (localStyle.borderColor || '#000000')}
                      onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localStyle.borderColor || '#000000'}
                      onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                      className="flex-1 p-1 text-xs border rounded"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs">Ancho de borde</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={parseInt(localStyle.borderWidth) || 0}
                      onChange={(e) => handleStyleChange('borderWidth', `${e.target.value}px`)}
                      className="flex-1"
                    />
                    <span className="w-8 text-center text-xs">
                      {parseInt(localStyle.borderWidth) || 0}px
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs">Estilo de borde</label>
                  <select
                    value={localStyle.borderStyle || 'none'}
                    onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
                    className="w-full p-1 text-xs border rounded"
                  >
                    <option value="none">Ninguno</option>
                    <option value="solid">Sólido</option>
                    <option value="dashed">Guiones</option>
                    <option value="dotted">Punteado</option>
                    <option value="double">Doble</option>
                  </select>
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
              </div>
            </div>
          )}
          
          {/* Pestaña de Posición */}
          {activeTab === 'position' && (
            <div className="p-3 space-y-4 pb-16">
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
                      className={`flex-1 p-1 text-xs border rounded ${positionWarnings.top ? 'border-orange-400 bg-orange-50' : ''}`}
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
                  {positionWarnings.top && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-1 rounded">
                      ⚠️ {positionWarnings.top}
                    </div>
                  )}
                </div>
                
                {/* Left position */}
                <div className="space-y-1">
                  <label className="block text-xs">Posición Horizontal (Left)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={leftParsed.value}
                      onChange={(e) => handlePositionChange('left', e.target.value, leftParsed.unit)}
                      className={`flex-1 p-1 text-xs border rounded ${positionWarnings.left ? 'border-orange-400 bg-orange-50' : ''}`}
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
                  {positionWarnings.left && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-1 rounded">
                      ⚠️ {positionWarnings.left}
                    </div>
                  )}
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
      
      {/* Notificación de ajuste automático */}
      {autoAdjustNotification && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 mx-4 my-2 rounded">
          <div className="flex items-center">
            <div className="text-green-600 text-sm">
              ✅ {autoAdjustNotification}
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b sticky top-0 bg-white z-10">
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
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative max-h-[calc(100vh-180px)]">
        {/* Indicador de scroll mejorado - mostrar solo cuando es necesario */}
        {showScrollIndicator && (
          <div 
            className="absolute right-2 bottom-4 z-20 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg scroll-indicator cursor-pointer"
            title="Desplazar hacia abajo para ver más opciones"
            onClick={() => {
              // Función para scroll suave al hacer clic en el indicador
              const scrollElement = document.querySelector('.custom-scrollbar');
              if (scrollElement) {
                const currentPos = scrollElement.scrollTop;
                scrollElement.scrollTo({
                  top: currentPos + 300, // Desplazar 300px adicionales (aumentado)
                  behavior: 'smooth'
                });
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5"/>
              <path d="M7 6l5 5 5-5"/>
            </svg>
          </div>
        )}
        {/* Pestaña de Contenido */}
        {activeTab === 'content' && (
          <div className="p-4 space-y-5 pb-16">
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
          <div className="p-4 space-y-6 pb-16">
            {/* Sección de Dimensiones */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Box size={16} />
                  Dimensiones
                </h4>
                
                {/* Botón para ajustar automáticamente todas las dimensiones */}
                <button
                  onClick={() => {
                    // Usar nuestra función handleAutocompleteSize para dimensiones precisas
                    const deviceView = 'desktop'; // Usar vista actual
                    
                    // Obtener dimensiones para ancho
                    const idealWidth = handleAutocompleteSize(
                      component.type,
                      deviceView,
                      'width',
                      'px',
                      getDimensions
                    );
                    
                    // Obtener dimensiones para alto
                    const idealHeight = handleAutocompleteSize(
                      component.type,
                      deviceView,
                      'height',
                      'px',
                      getDimensions
                    );
                    
                    // Obtener dimensiones para ancho máximo
                    const idealMaxWidth = handleAutocompleteSize(
                      component.type,
                      deviceView,
                      'maxWidth',
                      'px',
                      getDimensions
                    );
                    
                    // Aplicar cambios si tenemos valores válidos
                    if (idealWidth) {
                      handleStyleChange('width', `${Math.round(idealWidth)}px`);
                    }
                    
                    if (idealHeight) {
                      handleStyleChange('height', `${Math.round(idealHeight)}px`);
                    }
                    
                    if (idealMaxWidth) {
                      handleStyleChange('maxWidth', `${Math.round(idealMaxWidth)}px`);
                    }
                    
                    // Notificar al usuario
                  }}
                  className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 flex items-center gap-1 transition-colors"
                  title="Ajustar automáticamente a dimensiones ideales para el canvas"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="M13 17H7v-6h6V4h6v6h-6v7z"/>
                  </svg>
                  <span>Auto-ajustar</span>
                </button>
              </div>
              {/* Usar el componente DimensionControl para las propiedades de dimensión */}
              <DimensionControl
                label="Ancho"
                property="width"
                value={localStyle.width}
                onChange={handleStyleChange}
                containerSize={getDimensions()?.containerRect?.width || 0}
                min={0}
                max={2000}
                componentType={component.type} // Pasar el tipo de componente
                componentId={component.id} // Pasar el ID para obtener dimensiones reales
              />
              
              {/* Control de relación de aspecto - solo para imágenes */}
              {component.type === 'image' && (
                <div className="flex items-center gap-2 py-1 mt-2">
                  <div className="flex-1 text-xs font-medium">Mantener proporción</div>
                  <div 
                    className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer flex items-center ${
                      component.keepAspectRatio !== false ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                    onClick={() => {
                      // Invertir estado actual (true por defecto)
                      const newValue = component.keepAspectRatio !== false ? false : true;
                      
                      // Actualizar estilo
                      onUpdateStyle(component.id, {
                        keepAspectRatio: newValue
                      });
                      
                    }}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full bg-white absolute transition-all ${
                        component.keepAspectRatio !== false ? 'right-1' : 'left-1'
                      }`} 
                    />
                    <div className="absolute left-0 right-0 flex justify-center">
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-white opacity-80"
                      >
                        <path 
                          d={component.keepAspectRatio !== false 
                            ? "M8 14v-4a4 4 0 0 1 8 0v4M8 14h8M12 4v16" 
                            : "M15 7h2a4 4 0 0 1 0 8h-2M9 7H7a4 4 0 0 0 0 8h2M8 12h8"
                          } 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              
              <DimensionControl
                label="Alto"
                property="height"
                value={localStyle.height}
                onChange={handleStyleChange}
                containerSize={getDimensions()?.containerRect?.height || 0}
                min={0}
                max={2000}
                componentType={component.type} // Pasar el tipo de componente
                componentId={component.id} // Pasar el ID para obtener dimensiones reales
              />
              
              <DimensionControl
                label="Ancho Máximo"
                property="maxWidth"
                value={localStyle.maxWidth}
                onChange={handleStyleChange}
                containerSize={getDimensions()?.containerRect?.width || 0}
                min={0}
                max={2000}
                componentType={component.type} // Pasar el tipo de componente
                componentId={component.id} // Pasar el ID para obtener dimensiones reales
              />
              
              <DimensionControl
                label="Alto Máximo"
                property="maxHeight"
                value={localStyle.maxHeight}
                onChange={handleStyleChange}
                containerSize={getDimensions()?.containerRect?.height || 0}
                min={0}
                max={2000}
                componentType={component.type} // Pasar el tipo de componente
                componentId={component.id} // Pasar el ID para obtener dimensiones reales
              />
              
              <DimensionControl
                label="Ancho Mínimo"
                property="minWidth"
                value={localStyle.minWidth}
                onChange={handleStyleChange}
                containerSize={getDimensions()?.containerRect?.width || 0}
                min={0}
                max={2000}
                componentType={component.type} // Pasar el tipo de componente
                componentId={component.id} // Pasar el ID para obtener dimensiones reales
              />
            </div>

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
                    value={localStyle.backgroundColor === 'transparent' ? '#ffffff' : (localStyle.backgroundColor || '#ffffff')}
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
                    value={localStyle.color === 'transparent' ? '#000000' : (localStyle.color || '#000000')}
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
            
            {/* Sección de Bordes */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Box size={16} />
                Bordes
              </h4>
              
              {/* Usar el componente BorderControl */}
              <BorderControl
                borderWidth={localStyle.borderWidth}
                borderStyle={localStyle.borderStyle}
                borderColor={localStyle.borderColor}
                onBorderChange={handleStyleChange}
              />
              
              <div className="space-y-2">
                <label className="block text-sm">Border Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={parseInt(localStyle.borderRadius) || 0}
                    onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">
                    {parseInt(localStyle.borderRadius) || 0}px
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm">Estilos de Bordes Específicos</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => {
                      // Aplicar borde completo
                      const borderWidth = parseInt(localStyle.borderWidth) || 1;
                      handleStyleChange('borderStyle', 'solid');
                      handleStyleChange('borderWidth', `${borderWidth}px`);
                    }}
                    className="p-1 text-xs border rounded"
                  >
                    Borde Completo
                  </button>
                  <button
                    onClick={() => {
                      // Aplicar borde solo abajo
                      const borderWidth = parseInt(localStyle.borderWidth) || 1;
                      handleStyleChange('borderStyle', 'none');
                      handleStyleChange('borderWidth', '0px');
                      handleStyleChange('borderBottomStyle', 'solid');
                      handleStyleChange('borderBottomWidth', `${borderWidth}px`);
                    }}
                    className="p-1 text-xs border rounded"
                  >
                    Solo Inferior
                  </button>
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
            </div>
          </div>
        )}
        
        {/* Pestaña de Posición */}
        {activeTab === 'position' && (
          <div className="p-4 space-y-6 pb-16">
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
                    className={`flex-1 p-2 border rounded ${positionWarnings.top ? 'border-orange-400 bg-orange-50' : ''}`}
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
                {positionWarnings.top && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                    ⚠️ {positionWarnings.top}
                  </div>
                )}
              </div>
              
              {/* Left position */}
              <div className="space-y-2">
                <label className="block text-sm">Posición Horizontal (Left)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={leftParsed.value}
                    onChange={(e) => handlePositionChange('left', e.target.value, leftParsed.unit)}
                    className={`flex-1 p-2 border rounded ${positionWarnings.left ? 'border-orange-400 bg-orange-50' : ''}`}
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
                {positionWarnings.left && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                    ⚠️ {positionWarnings.left}
                  </div>
                )}
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