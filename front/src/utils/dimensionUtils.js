/**
 * @fileoverview Utilidades centralizadas para manejo de dimensiones en el Banner Editor
 * @module dimensionUtils
 * @author Banner Editor Team
 * @version 1.0.0
 */

/**
 * Parsea un valor de estilo CSS para extraer el valor numérico y la unidad
 * 
 * @param {string|number|null|undefined} value - Valor a parsear (ej: "100px", "50%", 100, null)
 * @returns {Object} Objeto con propiedades value (número) y unit (string)
 * 
 * @example
 * parseStyleValue("100px") // { value: 100, unit: "px" }
 * parseStyleValue("50%")   // { value: 50, unit: "%" }
 * parseStyleValue(100)     // { value: 100, unit: "px" }
 * parseStyleValue("auto")  // { value: "", unit: "auto" }
 * parseStyleValue(null)    // { value: "", unit: "auto" }
 */
export function parseStyleValue(value) {
  // Caso 1: valor es número → retornar con unidad px por defecto
  if (typeof value === 'number') {
    return { value: value, unit: 'px' };
  }
  
  // Caso 2: valor vacío, null o undefined → retornar auto
  if (!value || value === '' || value === null || value === undefined) {
    return { value: '', unit: 'auto' };
  }
  
  // Caso 3: convertir a string para procesamiento
  const stringValue = String(value).trim();
  
  // Caso 4: valor "auto" → retornar auto
  if (stringValue === 'auto') {
    return { value: '', unit: 'auto' };
  }
  
  // Caso 5: regex para extraer número y unidad
  const regex = /^(\d*\.?\d+)(px|%|em|rem)?$/;
  const match = stringValue.match(regex);
  
  if (match) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2] || 'px'; // default a px si no hay unidad
    return { value: numericValue, unit: unit };
  }
  
  // Caso 6: valor inválido → retornar vacío con px
  return { value: '', unit: 'px' };
}

/**
 * Formatea un valor numérico y unidad en un string CSS válido
 * 
 * @param {number|string} value - Valor numérico
 * @param {string} unit - Unidad CSS ('px', '%', 'em', etc.)
 * @returns {string} String CSS formateado
 * 
 * @example
 * formatStyleValue(100, "px") // "100px"
 * formatStyleValue(50, "%")   // "50%"
 * formatStyleValue("", "auto") // "auto"
 */
export function formatStyleValue(value, unit) {
  if (value === '' || value === null || value === undefined) {
    return unit === 'auto' ? 'auto' : '';
  }
  
  if (unit === 'auto') {
    return 'auto';
  }
  
  return `${value}${unit}`;
}

// Export por defecto para compatibilidad
export default {
  parseStyleValue,
  formatStyleValue
};