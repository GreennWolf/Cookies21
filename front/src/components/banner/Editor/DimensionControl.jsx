import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styleUtils from '../../../utils/styleUtils';
import handleAutocompleteSize from './handleAutocompleteSize';
import { useDimensionSync } from '../../../hooks/useDimensionSync.js';

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
  componentId = null, // ID del componente para obtener dimensiones reales
  device = 'desktop' // Device view ('desktop', 'tablet', 'mobile')
}) => {
  // Valores mínimos específicos para botones y otros elementos (en píxeles)
  const MIN_SIZES = {
    'button': { width: 80, height: 30 },
    'text': { width: 40, height: 20 },
    'image': { width: 50, height: 50 },
    'default': { width: 30, height: 30 }
  };
  
  // Integrar con el nuevo sistema de sincronización de dimensiones
  const {
    dimensions,
    updateDimension,
    convertToUnit,
    isConnected
  } = useDimensionSync(componentId, device, { 
    debug: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' 
  });
  
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
  
  // Calcular el máximo basado en el contexto real - MEJORADO con límites del canvas
  const getMaxForCurrentUnit = (currentUnit) => {
    if (currentUnit === '%') {
      return 100; // Máximo lógico para porcentajes - NUNCA más de 100%
    }
    
    // Para px, usar las dimensiones reales del canvas/contenedor
    if (updateDimension && typeof updateDimension === 'function') {
      try {
        // Obtener el tamaño real del canvas usando DimensionManager
        const canvasElement = document.querySelector('.banner-container');
        if (canvasElement) {
          const canvasSize = property === 'width' || property.includes('width') 
            ? canvasElement.clientWidth 
            : canvasElement.clientHeight;
          
          if (canvasSize > 0) {
            console.log(`📏 Límite máximo para ${property}: ${canvasSize}px (tamaño real del canvas)`);
            return canvasSize; // Máximo es el tamaño REAL del canvas
          }
        }
      } catch (error) {
        console.warn('Error obteniendo tamaño del canvas:', error);
      }
    }
    
    // Fallback: usar tamaño del contenedor padre si está disponible
    if (containerSize > 0) {
      return containerSize;
    }
    
    // Último fallback con límites razonables por dispositivo
    const deviceLimits = {
      'mobile': property.includes('width') ? 375 : 667,
      'tablet': property.includes('width') ? 768 : 1024,
      'desktop': property.includes('width') ? 1200 : 800
    };
    
    return deviceLimits[device] || 1920;
  };
  
  // Parseamos el valor inicial
  const parsed = styleUtils.parseStyleValue(value || '');
  
  // Estados locales - CON MENSAJE DE ERROR Y VALOR APLICADO
  const [numValue, setNumValue] = useState(parsed.value || '');
  const [unit, setUnit] = useState(parsed.unit || 'px');
  const [isInvalid, setIsInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastAppliedValue, setLastAppliedValue] = useState(parsed.value || '');
  
  // NUEVO: Referencia para trackear la fuente del cambio
  const changeSourceRef = useRef(null);
  
  // SIMPLIFICADO: Actualizar cuando el value prop cambia (desde drag o externo)
  useEffect(() => {
    // Si el cambio viene de nosotros mismos, ignorar
    if (changeSourceRef.current === 'input') {
      changeSourceRef.current = null;
      return;
    }
    
    const newParsed = styleUtils.parseStyleValue(value || '');
    const newParsedValue = newParsed.value || '';
    
    setNumValue(newParsedValue);
    setUnit(newParsed.unit || 'px');
    setLastAppliedValue(newParsedValue); // Actualizar valor aplicado
    
    // Limpiar errores cuando el valor viene de fuera (drag, etc.)
    setIsInvalid(false);
    setErrorMessage('');
  }, [value]);
  
  // NUEVO: Aplicar cambio SOLO si el valor es válido - CON AUTO-AJUSTE 100%
  const applyChange = useCallback(() => {
    // NO aplicar si el valor es inválido o está vacío
    if (!numValue || isInvalid || !componentId) {
      if (isInvalid) {
        console.log(`❌ No se puede aplicar valor inválido: ${numValue}${unit} para ${property}`);
      }
      return;
    }
    
    let finalValue = numValue;
    
    // AUTO-AJUSTE: Si se configura exactamente 100%, asegurar que quede dentro del canvas
    if (unit === '%' && parseFloat(numValue) === 100) {
      console.log(`🎯 Auto-ajuste activado: ${property} configurado al 100% - ajustando para que quepa perfectamente`);
      
      // Para 100%, usar 99.9% para evitar scroll y que quede perfectamente dentro
      finalValue = '99.9';
      setNumValue('99.9');
    }
    
    const formattedValue = styleUtils.formatStyleValue(finalValue, unit);
    
    // Marcar que el cambio viene de nosotros
    changeSourceRef.current = 'input';
    
    console.log(`✅ Aplicando valor válido: ${finalValue}${unit} para ${property}`);
    
    // Actualizar via DimensionManager
    updateDimension(property, formattedValue, 'input');
    
    // También notificar via onChange
    onChange?.(property, formattedValue);
    
    // Actualizar el último valor aplicado para las conversiones
    setLastAppliedValue(finalValue);
  }, [numValue, unit, isInvalid, componentId, property, updateDimension, onChange]);

  // Listener global para aplicar cambios al hacer click fuera del canvas
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // Verificar si el click es fuera del canvas/editor
      const isOutsideCanvas = !event.target.closest('.banner-container') && 
                             !event.target.closest('.banner-editor') &&
                             !event.target.closest('.banner-property-panel');
      
      if (isOutsideCanvas) {
        console.log(`🌍 Click fuera del canvas detectado, aplicando cambios pendientes`);
        applyChange();
      }
    };
    
    // Agregar listener
    document.addEventListener('click', handleGlobalClick);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [applyChange]); // Dependencias completas
  
  // DESACTIVADO: Efecto que causaba bucles infinitos al obtener dimensiones constantemente
  // useEffect(() => {
  //   // Solo ejecutar cuando cambia el componente o en el primer render
  //   if (componentId !== previousComponentId.current || isFirstRender.current) {
  //     // Actualizar referencia
  //     previousComponentId.current = componentId;
  //     isFirstRender.current = false;
  //     
  //     // Obtener dimensiones reales y actualizar los inputs
  //     if (componentId) {
  //       setTimeout(() => {
  //         const dimensions = getComponentDimensions();
  //         if (dimensions && dimensions.compRect) {
  //           // Guardar dimensión actual según propiedad
  //           let actualValue;
  //           if (property === 'width' || property === 'maxWidth') {
  //             actualValue = dimensions.compRect.width;
  //             setActualDimension(actualValue);
  //           } else if (property === 'height' || property === 'maxHeight') {
  //             actualValue = dimensions.compRect.height;
  //             setActualDimension(actualValue);
  //           }
  //           
  //           if (actualValue) {
  //             
  //             // Si la unidad actual es porcentaje, convertir
  //             if (unit === '%' && dimensions.containerRect) {
  //               const containerDimension = property.includes('width') 
  //                 ? dimensions.containerRect.width 
  //                 : dimensions.containerRect.height;
  //               
  //               if (containerDimension > 0) {
  //                 const percentValue = (actualValue / containerDimension) * 100;
  //                 setNumValue(percentValue.toFixed(1));
  //               }
  //             } else {
  //               // Si es px, usar directamente
  //               setNumValue(Math.round(actualValue));
  //             }
  //           }
  //         }
  //       }, 100); // Pequeño retraso para asegurar que el DOM está actualizado
  //     }
  //   }
  // }, [componentId, property, unit]);
  
  // ELIMINADO: validateValue y tryRepositionComponent - funcionalidad manejada por DimensionManager
  
  // Manejar cambio de valor numérico - PERMITIR CUALQUIER VALOR, VALIDAR SIN CAMBIAR
  const handleValueChange = useCallback((e) => {
    const newValue = e.target.value;
    
    // PERMITIR cualquier valor en el input, incluso inválidos
    setNumValue(newValue);
    
    // Validar si el valor está en el rango válido
    let isValidValue = true;
    let currentErrorMessage = '';
    
    if (newValue === '' || isNaN(parseFloat(newValue))) {
      isValidValue = false;
      currentErrorMessage = 'Valor numérico requerido';
    } else {
      const numericValue = parseFloat(newValue);
      const maxLimit = getMaxForCurrentUnit(unit);
      const minLimit = getMinForCurrentUnit(unit);
      
      if (numericValue < minLimit) {
        isValidValue = false;
        currentErrorMessage = `Mínimo permitido: ${minLimit.toFixed(1)}${unit}`;
      } else if (numericValue > maxLimit) {
        isValidValue = false;
        currentErrorMessage = `Máximo permitido: ${maxLimit.toFixed(1)}${unit}`;
      }
    }
    
    // Actualizar estado de validación y mensaje
    setIsInvalid(!isValidValue);
    setErrorMessage(currentErrorMessage);
    
    // Log para debugging
    if (!isValidValue) {
      console.log(`❌ Valor inválido en ${property}: ${newValue}${unit} - ${currentErrorMessage}`);
    }
    
  }, [unit, getMaxForCurrentUnit, getMinForCurrentUnit, property]);
  
  // Manejar cambio de unidad - MEJORADO CON PRECISIÓN
  const handleUnitChange = useCallback((e) => {
    const newUnit = e.target.value;
    const oldUnit = unit;
    
    if (!numValue || oldUnit === newUnit) {
      setUnit(newUnit);
      // Limpiar errores al cambiar unidad sin valor
      setIsInvalid(false);
      setErrorMessage('');
      return;
    }
    
    // No convertir si el valor actual es inválido
    if (isInvalid) {
      console.log(`⚠️ No se puede convertir valor inválido: ${numValue}${oldUnit} → ${newUnit}`);
      setUnit(newUnit);
      return;
    }
    
    try {
      const numericValue = parseFloat(numValue);
      const convertedValue = convertToUnit(numericValue, oldUnit, newUnit, property);
      
      if (convertedValue !== null && convertedValue !== undefined && !isNaN(convertedValue)) {
        const roundedValue = newUnit === '%' ? convertedValue.toFixed(1) : Math.round(convertedValue);
        
        console.log(`🔄 Conversión de unidad: ${numericValue}${oldUnit} → ${roundedValue}${newUnit}`);
        
        // Actualizar estados
        setUnit(newUnit);
        setNumValue(roundedValue.toString());
        setLastAppliedValue(roundedValue.toString()); // Actualizar valor aplicado
        
        // Limpiar errores ya que la conversión fue exitosa
        setIsInvalid(false);
        setErrorMessage('');
        
        // Aplicar cambio inmediatamente si es válido
        const formattedValue = styleUtils.formatStyleValue(roundedValue, newUnit);
        changeSourceRef.current = 'input';
        updateDimension(property, formattedValue, 'unit-change');
        onChange?.(property, formattedValue);
      } else {
        console.warn(`❌ Error en conversión: ${numericValue}${oldUnit} → ${newUnit}`);
        setUnit(newUnit);
      }
    } catch (error) {
      console.warn('Error en conversión de unidad:', error);
      setUnit(newUnit);
    }
  }, [unit, numValue, property, convertToUnit, updateDimension, onChange, isInvalid]);
  
  // Handlers simples para eventos
  const handleBlur = useCallback(() => {
    applyChange();
  }, [applyChange]);
  
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      applyChange();
    }
  }, [applyChange]);
  
  // ELIMINADO: getComponentDimensions - ahora se maneja via DimensionManager/ReferenceResolver
  
  // Función para autocompletar - SIMPLIFICADA
  const handleAutoComplete = useCallback(() => {
    const idealValue = handleAutocompleteSize(componentType, device, property, unit, null);
    
    if (idealValue !== null && idealValue !== undefined) {
      setNumValue(idealValue);
      setLastAppliedValue(idealValue); // Actualizar valor aplicado
      setIsInvalid(false);
      setErrorMessage(''); // Limpiar errores
      
      // Aplicar cambio inmediatamente
      const formattedValue = styleUtils.formatStyleValue(idealValue, unit);
      changeSourceRef.current = 'input';
      updateDimension(property, formattedValue, 'autocomplete');
      onChange?.(property, formattedValue);
    }
  }, [device, componentType, property, unit, updateDimension, onChange]);
  
  // Calcular y mostrar límites para mejor UX - OPTIMIZADO con useMemo
  const currentMinLimit = useMemo(() => getMinForCurrentUnit(unit), [unit, containerSize, componentType, property]);
  const currentMaxLimit = useMemo(() => getMaxForCurrentUnit(unit), [unit]);
  
  // NUEVO: Memoizar equivalencias usando el ÚLTIMO VALOR APLICADO
  const equivalentValue = useMemo(() => {
    // Usar lastAppliedValue para conversiones, que es el valor realmente aplicado al componente
    const valueToConvert = isInvalid ? lastAppliedValue : numValue;
    
    // No mostrar equivalencia si no hay valor aplicado válido
    if (!valueToConvert || isNaN(parseFloat(valueToConvert)) || !componentId) {
      return null;
    }
    
    try {
      const numericValue = parseFloat(valueToConvert);
      
      if (unit === '%') {
        const pxEquivalent = convertToUnit(numericValue, '%', 'px', property);
        if (pxEquivalent && !isNaN(pxEquivalent)) {
          console.log(`🔄 Conversión %→px: ${numericValue}% = ${pxEquivalent}px (usando valor ${isInvalid ? 'aplicado' : 'actual'})`);
          return `≈ ${Math.round(pxEquivalent)}px`;
        }
      } else if (unit === 'px') {
        const percentEquivalent = convertToUnit(numericValue, 'px', '%', property);
        if (percentEquivalent && !isNaN(percentEquivalent)) {
          console.log(`🔄 Conversión px→%: ${numericValue}px = ${percentEquivalent.toFixed(1)}% (usando valor ${isInvalid ? 'aplicado' : 'actual'})`);
          return `≈ ${percentEquivalent.toFixed(1)}%`;
        }
      }
    } catch (error) {
      console.warn('Error en conversión de equivalencia:', error);
    }
    
    return null;
  }, [numValue, lastAppliedValue, unit, property, componentId, convertToUnit, isInvalid]);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-medium flex items-center gap-1">
          {label}
          {/* Indicadores visuales mejorados */}
          {componentId && (
            <div className="flex items-center gap-1">
              {/* Indicador de conexión */}
              <div 
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  isConnected 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-red-400'
                }`} 
                title={isConnected ? "Sincronizado con DimensionManager" : "Desconectado del sistema"}
              />
              {/* Indicador de estado de validación */}
              {isInvalid && (
                <div 
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" 
                  title="Valor fuera del rango recomendado"
                />
              )}
              {/* Indicador de device específico */}
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                {device}
              </span>
            </div>
          )}
        </label>
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
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          className={`flex-1 p-1 text-xs border rounded transition-all duration-200 ${
            isInvalid 
              ? 'border-red-400 bg-red-50 shadow-red-100 shadow-sm' 
              : isConnected 
                ? 'border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-200' 
                : 'border-gray-300 focus:border-gray-500'
          }`}
          min={currentMinLimit}
          max={currentMaxLimit}
          step={unit === '%' ? 0.1 : 1}
        />
        <select
          value={unit}
          onChange={handleUnitChange}
          className={`p-1 text-xs border rounded transition-all duration-200 ${
            isConnected 
              ? 'border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-200' 
              : 'border-gray-300 focus:border-gray-500'
          }`}
        >
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
        
        {/* Botón para autocompletar tamaño - con indicadores visuales */}
        <button
          type="button"
          onClick={handleAutoComplete}
          className={`p-1 border rounded text-xs flex-shrink-0 transition-all duration-200 ${
            isConnected 
              ? 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-600 hover:scale-105' 
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-600'
          }`}
          title={`Autocompletar con tamaño ideal${isConnected ? ' (Sincronizado)' : ' (Desconectado)'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5v14m0-9-9-5v10l9-5Z"/>
          </svg>
        </button>
      </div>
      
      {/* Mensajes informativos */}
      <div className="text-[10px] space-y-1">
        {/* Mensaje de error para valores inválidos */}
        {isInvalid && errorMessage && (
          <div className="flex items-center gap-1 text-red-600 font-medium animate-fadeIn bg-red-50 px-2 py-1 rounded border border-red-200">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
        
        {/* ELIMINADO: actualDimension - información manejada por DimensionManager */}
        
        {/* Mostrar equivalencia memoizada si existe - MEJORADO */}
        {equivalentValue && !isInvalid && (
          <div className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-1 rounded border">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span className="font-medium">{equivalentValue}</span>
            <span className="text-xs text-gray-400">
              {unit === '%' ? '(píxeles reales)' : '(porcentaje del canvas)'}
            </span>
          </div>
        )}
        
        {/* Información de canvas para conversiones */}
        {isConnected && !isInvalid && (
          <div className="text-xs text-blue-500">
            Canvas: {unit === '%' ? 'Base para conversión' : 'Referencia actual'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionControl;