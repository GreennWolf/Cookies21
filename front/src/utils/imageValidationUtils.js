// src/utils/imageValidationUtils.js

/**
 * Utilidades de validación para imágenes en contenedores
 * Proporciona validación robusta, detección de errores y recovery automático
 */

import imageMemoryManager from './imageMemoryManager';

/**
 * Configuración de validación
 */
const VALIDATION_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFileSizeContainer: 5 * 1024 * 1024, // 5MB para contenedores (menor para performance)
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  maxDimensions: {
    width: 4096,
    height: 4096
  },
  minDimensions: {
    width: 10,
    height: 10
  }
};

/**
 * Validar archivo de imagen
 * @param {File} file - Archivo a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateImageFile = (file, options = {}) => {
  const config = { ...VALIDATION_CONFIG, ...options };
  const errors = [];
  const warnings = [];
  
  console.log(`🔍 VALIDATION: Validando archivo: ${file?.name || 'sin nombre'}`);
  
  // Validar que sea un archivo válido
  if (!file || !(file instanceof File || file instanceof Blob)) {
    errors.push('El archivo no es válido');
    return { isValid: false, errors, warnings };
  }
  
  // Validar tipo MIME
  if (!config.allowedMimeTypes.includes(file.type)) {
    errors.push(`Tipo de archivo no permitido: ${file.type}. Tipos permitidos: ${config.allowedMimeTypes.join(', ')}`);
  }
  
  // Validar tamaño
  const maxSize = options.isInContainer ? config.maxFileSizeContainer : config.maxFileSize;
  if (file.size > maxSize) {
    errors.push(`Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: ${(maxSize / 1024 / 1024)}MB`);
  }
  
  if (file.size === 0) {
    errors.push('El archivo está vacío');
  }
  
  // Advertencias para archivos grandes en contenedores
  if (options.isInContainer && file.size > 1024 * 1024) {
    warnings.push(`Archivo grande para contenedor: ${(file.size / 1024 / 1024).toFixed(2)}MB. Considera optimizar la imagen`);
  }
  
  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
  
  if (result.isValid) {
    console.log(`✅ VALIDATION: Archivo válido: ${file.name}`);
  } else {
    console.warn(`❌ VALIDATION: Archivo inválido: ${file.name}`, errors);
  }
  
  return result;
};

/**
 * Validar dimensiones de imagen
 * @param {HTMLImageElement} img - Elemento imagen cargado
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateImageDimensions = (img, options = {}) => {
  const config = { ...VALIDATION_CONFIG, ...options };
  const errors = [];
  const warnings = [];
  
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    errors.push('No se pudieron obtener las dimensiones de la imagen');
    return { isValid: false, errors, warnings };
  }
  
  const { naturalWidth: width, naturalHeight: height } = img;
  
  console.log(`📏 VALIDATION: Validando dimensiones: ${width}x${height}px`);
  
  // Validar dimensiones mínimas
  if (width < config.minDimensions.width || height < config.minDimensions.height) {
    errors.push(`Imagen muy pequeña: ${width}x${height}px. Mínimo: ${config.minDimensions.width}x${config.minDimensions.height}px`);
  }
  
  // Validar dimensiones máximas
  if (width > config.maxDimensions.width || height > config.maxDimensions.height) {
    errors.push(`Imagen muy grande: ${width}x${height}px. Máximo: ${config.maxDimensions.width}x${config.maxDimensions.height}px`);
  }
  
  // Advertencias para contenedores
  if (options.isInContainer) {
    if (width > 1920 || height > 1080) {
      warnings.push(`Imagen de alta resolución en contenedor: ${width}x${height}px. Considera redimensionar para mejor performance`);
    }
  }
  
  const aspectRatio = width / height;
  
  // Advertencias para aspect ratios extremos
  if (aspectRatio > 5 || aspectRatio < 0.2) {
    warnings.push(`Aspect ratio extremo: ${aspectRatio.toFixed(2)}:1. Puede causar problemas de visualización`);
  }
  
  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    dimensions: {
      width,
      height,
      aspectRatio
    }
  };
  
  if (result.isValid) {
    console.log(`✅ VALIDATION: Dimensiones válidas: ${width}x${height}px`);
  } else {
    console.warn(`❌ VALIDATION: Dimensiones inválidas:`, errors);
  }
  
  return result;
};

/**
 * Validar imagen dentro de contenedor
 * @param {File} file - Archivo de imagen
 * @param {Object} containerInfo - Información del contenedor
 * @returns {Promise<Object>} Resultado de validación
 */
export const validateImageInContainer = async (file, containerInfo = {}) => {
  console.log(`🔍 VALIDATION: Validando imagen para contenedor: ${containerInfo.containerId || 'desconocido'}`);
  
  // Validar archivo básico
  const fileValidation = validateImageFile(file, { 
    isInContainer: true,
    ...containerInfo.validationOptions 
  });
  
  if (!fileValidation.isValid) {
    return {
      ...fileValidation,
      containerContext: containerInfo
    };
  }
  
  // Validar dimensiones si es posible
  try {
    const img = new Image();
    const dimensionValidation = await new Promise((resolve) => {
      img.onload = () => {
        const result = validateImageDimensions(img, { 
          isInContainer: true,
          ...containerInfo.validationOptions 
        });
        resolve(result);
      };
      img.onerror = () => {
        resolve({
          isValid: false,
          errors: ['No se pudo cargar la imagen para validar dimensiones'],
          warnings: []
        });
      };
      img.src = URL.createObjectURL(file);
    });
    
    // Limpiar ObjectURL
    URL.revokeObjectURL(img.src);
    
    return {
      isValid: fileValidation.isValid && dimensionValidation.isValid,
      errors: [...fileValidation.errors, ...dimensionValidation.errors],
      warnings: [...fileValidation.warnings, ...dimensionValidation.warnings],
      fileInfo: fileValidation.fileInfo,
      dimensions: dimensionValidation.dimensions,
      containerContext: containerInfo
    };
  } catch (error) {
    console.error('❌ VALIDATION: Error validando dimensiones:', error);
    return {
      ...fileValidation,
      errors: [...fileValidation.errors, 'Error validando dimensiones de la imagen'],
      containerContext: containerInfo
    };
  }
};

/**
 * Verificar integridad de imagen temporal
 * @param {string} imageRef - Referencia de imagen temporal
 * @returns {Object} Resultado de verificación
 */
export const verifyImageIntegrity = (imageRef) => {
  console.log(`🔍 VALIDATION: Verificando integridad: ${imageRef}`);
  
  const errors = [];
  const warnings = [];
  
  // Verificar en gestor optimizado
  const tempFileData = imageMemoryManager.getTempFile(imageRef);
  if (tempFileData && tempFileData.file) {
    console.log(`✅ VALIDATION: Archivo encontrado en gestor optimizado`);
    return {
      isValid: true,
      errors,
      warnings,
      source: 'optimized',
      fileData: tempFileData
    };
  }
  
  // Verificar en sistema legacy
  if (window._imageFiles && window._imageFiles[imageRef]) {
    console.log(`✅ VALIDATION: Archivo encontrado en sistema legacy`);
    warnings.push('Imagen encontrada en sistema legacy. Considera migrar al gestor optimizado');
    return {
      isValid: true,
      errors,
      warnings,
      source: 'legacy',
      file: window._imageFiles[imageRef]
    };
  }
  
  errors.push(`No se encontró el archivo temporal: ${imageRef}`);
  console.warn(`❌ VALIDATION: Archivo temporal no encontrado: ${imageRef}`);
  
  return {
    isValid: false,
    errors,
    warnings,
    source: 'none'
  };
};

/**
 * Recuperar automáticamente imagen perdida
 * @param {string} imageRef - Referencia de imagen temporal
 * @param {Object} fallbackOptions - Opciones de recuperación
 * @returns {Object} Resultado de recuperación
 */
export const recoverLostImage = (imageRef, fallbackOptions = {}) => {
  console.log(`🔄 VALIDATION: Intentando recuperar imagen perdida: ${imageRef}`);
  
  const recovery = {
    success: false,
    method: null,
    imageUrl: null,
    errors: []
  };
  
  // Método 1: Buscar en caché de ObjectURLs activos
  const objectUrls = imageMemoryManager.objectUrls || new Set();
  for (const url of objectUrls) {
    if (url.includes(imageRef.split('_')[1])) { // Buscar por timestamp
      recovery.success = true;
      recovery.method = 'objectUrl';
      recovery.imageUrl = url;
      console.log(`✅ VALIDATION: Imagen recuperada via ObjectURL activo`);
      return recovery;
    }
  }
  
  // Método 2: Usar imagen placeholder con información del error
  if (fallbackOptions.usePlaceholder !== false) {
    const placeholderData = `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="150" fill="#f0f0f0"/>
        <text x="100" y="75" text-anchor="middle" dy=".3em" fill="#666" font-size="12" font-family="Arial">
          Imagen no disponible
        </text>
        <text x="100" y="95" text-anchor="middle" dy=".3em" fill="#999" font-size="10" font-family="Arial">
          ${imageRef.substring(0, 20)}...
        </text>
      </svg>
    `)}`;
    
    recovery.success = true;
    recovery.method = 'placeholder';
    recovery.imageUrl = placeholderData;
    console.log(`⚠️ VALIDATION: Usando imagen placeholder para ${imageRef}`);
    return recovery;
  }
  
  recovery.errors.push('No se pudo recuperar la imagen perdida');
  console.error(`❌ VALIDATION: No se pudo recuperar: ${imageRef}`);
  
  return recovery;
};

/**
 * Limpiar imágenes huérfanas en contenedores
 * @param {Array} components - Componentes a verificar
 * @returns {Object} Resultado de limpieza
 */
export const cleanupOrphanedImages = (components) => {
  console.log('🧹 VALIDATION: Iniciando limpieza de imágenes huérfanas...');
  
  const activeImageRefs = new Set();
  const cleanupResults = {
    scanned: 0,
    orphaned: 0,
    cleaned: 0,
    errors: []
  };
  
  // Recopilar todas las referencias activas
  const scanComponents = (comps) => {
    if (!Array.isArray(comps)) return;
    
    comps.forEach(comp => {
      cleanupResults.scanned++;
      
      if (comp.type === 'image' && typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__')) {
        activeImageRefs.add(comp.content);
      }
      
      if (comp.children && Array.isArray(comp.children)) {
        scanComponents(comp.children);
      }
    });
  };
  
  scanComponents(components);
  
  // Verificar archivos en memoria
  const tempFiles = imageMemoryManager.tempFiles || new Map();
  const legacyFiles = window._imageFiles || {};
  
  // Limpiar archivos huérfanos en gestor optimizado
  for (const [imageRef, fileData] of tempFiles.entries()) {
    if (!activeImageRefs.has(imageRef)) {
      cleanupResults.orphaned++;
      if (imageMemoryManager.removeTempFile(imageRef)) {
        cleanupResults.cleaned++;
      }
    }
  }
  
  // Limpiar archivos huérfanos en sistema legacy
  for (const imageRef in legacyFiles) {
    if (!activeImageRefs.has(imageRef)) {
      cleanupResults.orphaned++;
      try {
        delete legacyFiles[imageRef];
        cleanupResults.cleaned++;
      } catch (error) {
        cleanupResults.errors.push(`Error limpiando ${imageRef}: ${error.message}`);
      }
    }
  }
  
  console.log(`✅ VALIDATION: Limpieza completada - Escaneados: ${cleanupResults.scanned}, Huérfanos: ${cleanupResults.orphaned}, Limpiados: ${cleanupResults.cleaned}`);
  
  return cleanupResults;
};

/**
 * Validar y optimizar imagen para contenedor
 * @param {File} file - Archivo de imagen
 * @param {Object} containerConstraints - Restricciones del contenedor
 * @returns {Promise<Object>} Resultado con imagen optimizada
 */
export const validateAndOptimizeForContainer = async (file, containerConstraints = {}) => {
  console.log(`🔧 VALIDATION: Validando y optimizando para contenedor...`);
  
  // Validar primero
  const validation = await validateImageInContainer(file, containerConstraints);
  if (!validation.isValid) {
    return {
      ...validation,
      optimized: false
    };
  }
  
  // TODO: Implementar optimización automática
  // - Redimensionar si es muy grande
  // - Convertir formato si es necesario
  // - Comprimir si excede límites
  
  return {
    ...validation,
    optimized: false, // Por ahora no optimizamos
    optimizationSuggestions: generateOptimizationSuggestions(validation)
  };
};

/**
 * Generar sugerencias de optimización
 * @param {Object} validation - Resultado de validación
 * @returns {Array} Lista de sugerencias
 */
const generateOptimizationSuggestions = (validation) => {
  const suggestions = [];
  
  if (validation.dimensions) {
    const { width, height } = validation.dimensions;
    
    if (width > 1920 || height > 1080) {
      suggestions.push({
        type: 'resize',
        message: 'Redimensionar imagen para mejor performance en contenedores',
        suggestedSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
      });
    }
  }
  
  if (validation.fileInfo && validation.fileInfo.size > 1024 * 1024) {
    suggestions.push({
      type: 'compress',
      message: 'Comprimir imagen para reducir tiempo de carga',
      currentSize: validation.fileInfo.size,
      targetSize: validation.fileInfo.size * 0.7
    });
  }
  
  return suggestions;
};

export default {
  validateImageFile,
  validateImageDimensions,
  validateImageInContainer,
  verifyImageIntegrity,
  recoverLostImage,
  cleanupOrphanedImages,
  validateAndOptimizeForContainer,
  VALIDATION_CONFIG
};