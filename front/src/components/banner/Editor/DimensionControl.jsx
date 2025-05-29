import React, { useState, useEffect, useRef } from 'react';
import styleUtils from '../../../utils/styleUtils';
import handleAutocompleteSize from './handleAutocompleteSize';

/**
 * Componente para controlar las dimensiones (ancho, alto, etc.)
 * con soporte para diferentes unidades (px, %) y límites específicos según el tipo de componente
 */
const DimensionControl = ({
  label,
  property,
  value,
  onChange,
  containerSize = 0,
  min = 0,
  max = 1000,
  componentType = 'default', // Tipo de componente
  componentId = null // ID opcional del componente para obtener dimensiones reales
}) => {
  // Valores mínimos específicos para botones y otros elementos (en píxeles)
  const MIN_SIZES = {
    'button': { width: 80, height: 30 },
    'text': { width: 40, height: 20 },
    'image': { width: 50, height: 50 },
    'default': { width: 30, height: 30 }
  };
  
  // Referencias para detectar cambios iniciales
  const isFirstRender = useRef(true);
  const previousComponentId = useRef(null);
  
  // Obtener mínimos según propiedad y tipo de componente
  const getMinSize = () => {
    const minSizes = MIN_SIZES[componentType] || MIN_SIZES.default;
    
    if (property === 'width' || property === 'minWidth' || property === 'maxWidth') {
      return minSizes.width;
    } else if (property === 'height' || property === 'minHeight' || property === 'maxHeight') {
      return minSizes.height;
    }
    return min;
  };
  
  // Calcular el mínimo en la unidad actual
  const getMinForCurrentUnit = (currentUnit) => {
    const minPx = getMinSize();
    if (currentUnit === 'px') return minPx;
    if (currentUnit === '%' && containerSize > 0) {
      // Convertir mínimo de px a % basado en tamaño del canvas
      return (minPx / containerSize) * 100;
    }
    return min;
  };
  
  // Calcular el máximo en la unidad actual
  const getMaxForCurrentUnit = (currentUnit) => {
    if (currentUnit === 'px') return containerSize || max;
    if (currentUnit === '%') return 100; // Máximo de 100% para ocupar todo el canvas
    return max;
  };
  
  // Parseamos el valor inicial para obtener el valor numérico y la unidad
  const initialParsed = styleUtils.parseStyleValue(value || '');
  
  // Estados locales
  const [numValue, setNumValue] = useState(initialParsed.value || '');
  const [unit, setUnit] = useState(initialParsed.unit || 'px');
  const [isInvalid, setIsInvalid] = useState(false);
  const [actualDimension, setActualDimension] = useState(null);
  
  // Actualizar estado local cuando cambia el prop value
  useEffect(() => {
    const parsed = styleUtils.parseStyleValue(value || '');
    setNumValue(parsed.value || '');
    setUnit(parsed.unit || 'px');
  }, [value]);
  
  // Efecto para detectar cambio de componente y actualizar automáticamente
  useEffect(() => {
    // Solo ejecutar cuando cambia el componente o en el primer render
    if (componentId !== previousComponentId.current || isFirstRender.current) {
      // Actualizar referencia
      previousComponentId.current = componentId;
      isFirstRender.current = false;
      
      // Obtener dimensiones reales y actualizar los inputs
      if (componentId) {
        setTimeout(() => {
          const dimensions = getComponentDimensions();
          if (dimensions && dimensions.compRect) {
            // Guardar dimensión actual según propiedad
            let actualValue;
            if (property === 'width' || property === 'maxWidth') {
              actualValue = dimensions.compRect.width;
              setActualDimension(actualValue);
            } else if (property === 'height' || property === 'maxHeight') {
              actualValue = dimensions.compRect.height;
              setActualDimension(actualValue);
            }
            
            if (actualValue) {
              console.log(`Autocompletando ${property} con dimensión actual: ${actualValue}px`);
              
              // Si la unidad actual es porcentaje, convertir
              if (unit === '%' && dimensions.containerRect) {
                const containerDimension = property.includes('width') 
                  ? dimensions.containerRect.width 
                  : dimensions.containerRect.height;
                
                if (containerDimension > 0) {
                  const percentValue = (actualValue / containerDimension) * 100;
                  setNumValue(percentValue.toFixed(1));
                  console.log(`Convertido a porcentaje: ${percentValue.toFixed(1)}%`);
                }
              } else {
                // Si es px, usar directamente
                setNumValue(Math.round(actualValue));
              }
            }
          }
        }, 100); // Pequeño retraso para asegurar que el DOM está actualizado
      }
    }
  }, [componentId, property, unit]);
  
  // Validar y aplicar límites al valor (versión mejorada - ahora muestra advertencia pero permite valores menores)
  const validateValue = (value, valueUnit) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) return '';
    
    // Aplicar límites específicos según unidad
    const minLimit = getMinForCurrentUnit(valueUnit);
    const maxLimit = getMaxForCurrentUnit(valueUnit);
    
    // Marcamos el campo como inválido si es menor que el mínimo
    setIsInvalid(numVal < minLimit);
    
    // Si es mayor que el máximo, limitarlo
    if (numVal > maxLimit) {
      numVal = maxLimit;
      console.log(`Ajustando al valor máximo: ${maxLimit}${valueUnit}`);
      
      // Para valores que exceden el máximo, intentar reposicionar el componente
      if (componentId && valueUnit === 'px') {
        tryRepositionComponent(numVal, property);
      }
    }
    
    return numVal;
  };
  
  // Intentar reposicionar componente si excede los límites
  const tryRepositionComponent = (newSize, sizeProp) => {
    try {
      if (!componentId) return;
      
      const componentEl = document.querySelector(`[data-id="${componentId}"]`);
      if (!componentEl) return;
      
      const containerEl = componentEl.closest('.banner-container');
      if (!containerEl) return;
      
      // Obtener la posición actual
      const compRect = componentEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      
      const isWidthProperty = sizeProp.includes('width');
      
      // Calcular si se sale del canvas
      if (isWidthProperty) {
        const right = compRect.left - containerRect.left + newSize;
        if (right > containerRect.width) {
          // Calcular nueva posición left
          const currentLeft = parseFloat(componentEl.style.left) || 0;
          const overflow = right - containerRect.width;
          const newLeft = Math.max(0, currentLeft - overflow);
          
          // Convertir a porcentaje
          const leftPercent = (newLeft / containerRect.width) * 100;
          
          // Aplicar nueva posición
          componentEl.style.left = `${leftPercent}%`;
          
          // Disparar evento de posición actualizada
          setTimeout(() => {
            const event = new CustomEvent('component:position', {
              detail: {
                id: componentId,
                position: { left: `${leftPercent}%` }
              }
            });
            containerEl.dispatchEvent(event);
          }, 50);
          
          console.log(`Reposicionando componente para evitar desbordamiento horizontal`);
        }
      } else {
        // Para propiedad de altura
        const bottom = compRect.top - containerRect.top + newSize;
        if (bottom > containerRect.height) {
          // Calcular nueva posición top
          const currentTop = parseFloat(componentEl.style.top) || 0;
          const overflow = bottom - containerRect.height;
          const newTop = Math.max(0, currentTop - overflow);
          
          // Convertir a porcentaje
          const topPercent = (newTop / containerRect.height) * 100;
          
          // Aplicar nueva posición
          componentEl.style.top = `${topPercent}%`;
          
          // Disparar evento de posición actualizada
          setTimeout(() => {
            const event = new CustomEvent('component:position', {
              detail: {
                id: componentId,
                position: { top: `${topPercent}%` }
              }
            });
            containerEl.dispatchEvent(event);
          }, 50);
          
          console.log(`Reposicionando componente para evitar desbordamiento vertical`);
        }
      }
    } catch (error) {
      console.error('Error al reposicionar componente:', error);
    }
  };
  
  // Manejar cambio de valor numérico
  const handleValueChange = (e) => {
    const newRawValue = e.target.value;
    setNumValue(newRawValue); // Actualizar el input para UX fluida
    
    // Solo notificar cambio si es un número válido
    if (!isNaN(parseFloat(newRawValue)) || newRawValue === '') {
      // Si el campo está vacío, mantenerlo así para UX
      if (newRawValue === '') {
        onChange(property, '');
        setIsInvalid(false);
        return;
      }
      
      // Validar y aplicar límites, pero PERMITIR valores inválidos con advertencia
      const validatedValue = validateValue(newRawValue, unit);
      
      // Formatear y notificar el cambio
      const formattedValue = styleUtils.formatStyleValue(validatedValue, unit);
      onChange(property, formattedValue);
    }
  };
  
  // Manejar cambio de unidad - versión mejorada
  const handleUnitChange = (e) => {
    console.group('🔄 DimensionControl.handleUnitChange');
    const newUnit = e.target.value;
    const oldUnit = unit;
    
    console.log('📊 Datos de entrada:', {
      property,
      numValue,
      oldUnit,
      newUnit,
      containerSize,
      componentId
    });
    
    // Convertir valor solo si es un número válido
    if (numValue === '' || isNaN(parseFloat(numValue))) {
      console.log('⚠️ Valor vacío o inválido, solo cambiando unidad');
      setUnit(newUnit);
      console.groupEnd();
      return;
    }
    
    // Realizar la conversión entre unidades SIEMPRE usando el tamaño del canvas como referencia
    let convertedValue;
    if (containerSize > 0) {
      // De px a %
      if (oldUnit === 'px' && newUnit === '%') {
        // Porcentaje relativo al canvas completo
        convertedValue = (parseFloat(numValue) / containerSize) * 100;
        console.log(`🔄 Convirtiendo ${numValue}px a ${convertedValue.toFixed(2)}% (${containerSize}px = 100%)`);
      } 
      // De % a px
      else if (oldUnit === '%' && newUnit === 'px') {
        // Píxeles basados en % del canvas
        convertedValue = (parseFloat(numValue) * containerSize) / 100;
        console.log(`🔄 Convirtiendo ${numValue}% a ${convertedValue.toFixed(0)}px (${containerSize}px = 100%)`);
      }
      else {
        convertedValue = parseFloat(numValue);
        console.log(`➡️ Sin conversión necesaria: ${convertedValue}`);
      }
    } else {
      convertedValue = parseFloat(numValue);
      console.warn('⚠️ No se pudo convertir correctamente: tamaño del contenedor desconocido');
    }
    
    console.log('🎯 Valor convertido:', convertedValue);
    
    // Validar y aplicar límites a la conversión
    const validatedValue = validateValue(convertedValue, newUnit);
    console.log('✅ Valor validado:', validatedValue);
    
    // Actualizar estado local
    setUnit(newUnit);
    setNumValue(validatedValue);
    
    // Notificar cambio
    const formattedValue = styleUtils.formatStyleValue(validatedValue, newUnit);
    console.log('📤 Enviando valor formateado:', formattedValue);
    
    onChange(property, formattedValue);
    console.groupEnd();
  };
  
  // Función mejorada para obtener dimensiones del componente
  const getComponentDimensions = () => {
    try {
      // Si no tenemos ID de componente, devolver información básica
      if (!componentId) {
        return {
          containerRect: { width: containerSize, height: containerSize * 0.75 }
        };
      }
      
      // Buscar el elemento del componente
      const componentEl = document.querySelector(`[data-id="${componentId}"]`);
      if (!componentEl) {
        return {
          containerRect: { width: containerSize, height: containerSize * 0.75 }
        };
      }
      
      // Buscar el contenedor (canvas)
      const containerEl = componentEl.closest('.banner-container');
      if (!containerEl) {
        return {
          containerRect: { width: containerSize, height: containerSize * 0.75 }
        };
      }
      
      // Obtener dimensiones reales
      const compRect = componentEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      
      return {
        compRect,
        containerRect,
        componentEl,
        width: compRect.width,
        height: compRect.height,
        // Calcular porcentajes
        widthPercent: (compRect.width / containerRect.width) * 100,
        heightPercent: (compRect.height / containerRect.height) * 100
      };
    } catch (error) {
      console.error('Error al obtener dimensiones:', error);
      return {
        containerRect: { width: containerSize, height: containerSize * 0.75 }
      };
    }
  };
  
  // Función mejorada para autocompletar según el tipo de componente
  const handleAutoComplete = () => {
    // Obtener dimensiones reales usando la nueva función
    const dimensions = getComponentDimensions();
    
    // Usar nuestra función mejorada para autocompletar
    const deviceView = 'desktop'; // Vista actual por defecto
    const idealValue = handleAutocompleteSize(
      componentType,
      deviceView,
      property,
      unit,
      () => dimensions
    );
    
    // Aplicar si tenemos un valor válido
    if (idealValue !== null && idealValue !== undefined) {
      // Actualizar estado local
      setNumValue(idealValue);
      
      // Comprobar si es menor que el mínimo (solo para mostrar advertencia)
      const minLimit = getMinForCurrentUnit(unit);
      setIsInvalid(idealValue < minLimit);
      
      // Formatear y notificar cambio
      const formattedValue = styleUtils.formatStyleValue(idealValue, unit);
      onChange(property, formattedValue);
      
      console.log(`✅ ${property} autocompletado para ${componentType}: ${formattedValue}`);
    }
  };
  
  // Calcular y mostrar límites para mejor UX
  const currentMinLimit = getMinForCurrentUnit(unit);
  const currentMaxLimit = getMaxForCurrentUnit(unit);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-medium">{label}</label>
        {/* Mostrar límites actuales */}
        <span className="text-[10px] text-gray-500">
          {currentMinLimit.toFixed(1)} - {currentMaxLimit.toFixed(1)} {unit}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={numValue}
          onChange={handleValueChange}
          className={`flex-1 p-1 text-xs border rounded ${
            isInvalid ? 'border-red-400 bg-red-50' : ''
          }`}
          min={0} // Permitir cualquier valor para flexibilidad
          max={unit === '%' ? 100 : 9999} // Máximos razonables
          step={unit === '%' ? 0.1 : 1} // Paso más fino para porcentajes
        />
        <select
          value={unit}
          onChange={handleUnitChange}
          className="p-1 text-xs border rounded"
        >
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
        
        {/* Botón para autocompletar tamaño */}
        <button
          type="button"
          onClick={handleAutoComplete}
          className="p-1 border rounded text-xs bg-gray-50 hover:bg-blue-50 flex-shrink-0"
          title="Autocompletar con tamaño ideal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5v14m0-9-9-5v10l9-5Z"/>
          </svg>
        </button>
      </div>
      
      {/* Mensajes informativos */}
      <div className="text-[10px] space-y-1">
        {/* Mensaje de aviso si el valor está por debajo del mínimo */}
        {isInvalid && (
          <p className="text-red-600 font-medium">
            Valor menor que el mínimo recomendado de {currentMinLimit.toFixed(0)}{unit}
          </p>
        )}
        
        {/* Mostrar dimensión actual si tenemos el dato */}
        {actualDimension && !numValue && (
          <div className="text-blue-500 font-medium">
            Dimensión actual: {Math.round(actualDimension)}px
          </div>
        )}
        
        {/* En caso de porcentaje, mostrar equivalente en px para mejor contexto */}
        {unit === '%' && numValue !== '' && !isNaN(parseFloat(numValue)) && containerSize > 0 && (
          <div className="text-gray-500">
            ≈ {Math.round((parseFloat(numValue) * containerSize) / 100)}px de {containerSize}px
          </div>
        )}
        
        {/* En caso de píxeles, mostrar equivalente en % */}
        {unit === 'px' && numValue !== '' && !isNaN(parseFloat(numValue)) && containerSize > 0 && (
          <div className="text-gray-500">
            ≈ {((parseFloat(numValue) / containerSize) * 100).toFixed(1)}% del canvas
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionControl;