/**
 * @fileoverview Conversor de unidades para dimensiones del Banner Editor
 * @module UnitConverter
 * @author Banner Editor Team
 * @version 1.0.0
 */

import { parseStyleValue } from '../utils/dimensionUtils.js';

/**
 * Clase que maneja conversiones entre diferentes unidades CSS (px, %, em, rem)
 * Utiliza ReferenceResolver para obtener dimensiones de referencia
 * 
 * @class UnitConverter
 */
export class UnitConverter {
  /**
   * Constructor de UnitConverter
   * 
   * @param {ReferenceResolver} referenceResolver - Instancia de ReferenceResolver para obtener dimensiones de referencia
   */
  constructor(referenceResolver) {
    if (!referenceResolver) {
      throw new Error('UnitConverter requiere una instancia de ReferenceResolver');
    }
    
    this.referenceResolver = referenceResolver;
    
    // Configuración de conversiones
    this.config = {
      decimalPlaces: {
        percent: 1,    // 50.5%
        pixels: 0      // 100px (enteros)
      },
      fallbackSize: 800  // Tamaño por defecto si no se puede obtener referencia
    };
  }

  /**
   * Parsea un valor de estilo para uso interno del converter
   * 
   * @param {string|number} value - Valor a parsear
   * @returns {Object} Objeto con value y unit parseados
   * 
   * @example
   * converter.parseValue("100px") // { value: 100, unit: "px" }
   */
  parseValue(value) {
    // Usar la utilidad centralizada de dimensionUtils
    const parsed = parseStyleValue(value);
    
    // Manejar casos especiales en el contexto del converter
    if (parsed.unit === 'auto') {
      // En contexto de conversiones, auto se trata como 0px
      return { value: 0, unit: 'px' };
    }
    
    // Validar que el valor numérico es válido
    if (parsed.value === '' || isNaN(parsed.value)) {
      console.warn(`UnitConverter: Valor inválido "${value}", usando 0px por defecto`);
      return { value: 0, unit: 'px' };
    }
    
    // Retornar valor parseado y validado
    return {
      value: Number(parsed.value),
      unit: parsed.unit
    };
  }

  /**
   * Convierte valor de píxeles a porcentaje
   * 
   * @param {number} pxValue - Valor en píxeles
   * @param {number} referenceSize - Tamaño de referencia en píxeles
   * @returns {number} Valor convertido a porcentaje
   */
  convertPxToPercent(pxValue, referenceSize) {
    console.log(`🔍 UnitConverter.convertPxToPercent: ENTRADA`, {
      pxValue,
      pxValueType: typeof pxValue,
      referenceSize,
      referenceSizeType: typeof referenceSize
    });
    
    // Validar inputs
    if (typeof pxValue !== 'number' || isNaN(pxValue)) {
      console.warn(`UnitConverter: pxValue inválido "${pxValue}", usando 0`);
      return 0;
    }
    
    if (typeof referenceSize !== 'number' || isNaN(referenceSize)) {
      console.warn(`UnitConverter: referenceSize inválido "${referenceSize}", usando fallback`);
      referenceSize = this.config.fallbackSize;
    }
    
    // Validar que referenceSize > 0 para evitar división por cero
    if (referenceSize <= 0) {
      console.error('UnitConverter: referenceSize debe ser mayor que 0 para conversión px->%');
      return 0;
    }
    
    // Realizar conversión: (píxeles / tamaño_referencia) * 100
    const percentValue = (pxValue / referenceSize) * 100;
    
    // Redondear a decimales configurados
    const rounded = Number(percentValue.toFixed(this.config.decimalPlaces.percent));
    
    console.log(`🔍 UnitConverter.convertPxToPercent: RESULTADO`, {
      pxValue,
      referenceSize,
      calculation: `(${pxValue} / ${referenceSize}) * 100`,
      percentValue,
      rounded
    });
    
    return rounded;
  }

  /**
   * Convierte valor de porcentaje a píxeles
   * 
   * @param {number} percentValue - Valor en porcentaje
   * @param {number} referenceSize - Tamaño de referencia en píxeles
   * @returns {number} Valor convertido a píxeles
   */
  convertPercentToPx(percentValue, referenceSize) {
    // Validar inputs
    if (typeof percentValue !== 'number' || isNaN(percentValue)) {
      console.warn(`UnitConverter: percentValue inválido "${percentValue}", usando 0`);
      return 0;
    }
    
    if (typeof referenceSize !== 'number' || isNaN(referenceSize)) {
      console.warn(`UnitConverter: referenceSize inválido "${referenceSize}", usando fallback`);
      referenceSize = this.config.fallbackSize;
    }
    
    // Validar que referenceSize > 0
    if (referenceSize <= 0) {
      console.error('UnitConverter: referenceSize debe ser mayor que 0 para conversión %->px');
      return 0;
    }
    
    // Realizar conversión: (porcentaje * tamaño_referencia) / 100
    const pxValue = (percentValue * referenceSize) / 100;
    
    // Redondear a entero para píxeles
    const rounded = Math.round(pxValue);
    
    console.debug(`UnitConverter: ${percentValue}% → ${rounded}px (ref: ${referenceSize}px)`);
    
    return rounded;
  }

  /**
   * Método principal de conversión entre unidades
   * 
   * @param {string|number} value - Valor a convertir
   * @param {string} fromUnit - Unidad origen ('px', '%', etc.)
   * @param {string} toUnit - Unidad destino ('px', '%', etc.)
   * @param {Object} reference - Objeto de referencia con element, size, type
   * @returns {number} Valor convertido
   * 
   * @example
   * converter.convert(100, 'px', '%', reference) // 12.5 (si reference.size = 800)
   */
  convert(value, fromUnit, toUnit, reference) {
    console.log(`🔍 UnitConverter.convert: ENTRADA`, {
      value,
      fromUnit,
      toUnit,
      reference
    });
    
    // Si las unidades son iguales, no hay conversión necesaria
    if (fromUnit === toUnit) {
      const parsed = this.parseValue(value);
      console.log(`🔍 UnitConverter.convert: Unidades iguales, retornando valor parseado`, parsed.value);
      return parsed.value;
    }
    
    // Extraer valor numérico
    const parsed = this.parseValue(value);
    const numValue = parsed.value;
    
    console.log(`🔍 UnitConverter.convert: Valor parseado`, {
      original: value,
      parsed: numValue,
      parsedUnit: parsed.unit
    });
    
    // Si el valor es 0, no importa la conversión
    if (numValue === 0) {
      console.log(`🔍 UnitConverter.convert: Valor es 0, retornando 0`);
      return 0;
    }
    
    // Validar referencia
    if (!reference || !reference.size) {
      console.error('UnitConverter: Referencia inválida para conversión', { value, fromUnit, toUnit, reference });
      return numValue; // Retornar valor original sin conversión
    }
    
    const referenceSize = reference.size;
    
    console.log(`🔍 UnitConverter.convert: Preparando conversión`, {
      numValue,
      referenceSize,
      conversionKey: `${fromUnit}->${toUnit}`
    });
    
    // Realizar conversión según unidades
    const conversionKey = `${fromUnit}->${toUnit}`;
    
    switch (conversionKey) {
      case 'px->%':
        const percentResult = this.convertPxToPercent(numValue, referenceSize);
        console.log(`🔍 UnitConverter.convert: Conversión px->% completada`, percentResult);
        return percentResult;
      
      case '%->px':
        const pxResult = this.convertPercentToPx(numValue, referenceSize);
        console.log(`🔍 UnitConverter.convert: Conversión %->px completada`, pxResult);
        return pxResult;
      
      default:
        console.warn(`UnitConverter: Conversión no soportada "${conversionKey}", retornando valor original`);
        return numValue;
    }
  }
}

// Export por defecto
export default UnitConverter;