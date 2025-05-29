const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Valida si una URL de imagen existe físicamente en el servidor
 * @param {string} imageUrl - URL de la imagen (ej: '/templates/images/domain/image.png')
 * @returns {boolean} - true si existe, false si no
 */
function validateImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  // Solo validar URLs de templates
  if (!imageUrl.startsWith('/templates/images/')) {
    return true; // Asumir que otras URLs (externas, placeholder, etc.) son válidas
  }

  try {
    const publicPath = process.env.PUBLIC_PATH || path.join(process.cwd(), 'public');
    const fullImagePath = path.join(publicPath, imageUrl);
    const exists = fs.existsSync(fullImagePath);
    
    if (!exists) {
      logger.warn(`Imagen no encontrada: ${imageUrl}`);
      logger.warn(`Ruta verificada: ${fullImagePath}`);
    }
    
    return exists;
  } catch (error) {
    logger.error(`Error validando imagen ${imageUrl}:`, error);
    return false;
  }
}

/**
 * Valida y limpia URLs de imágenes en un componente recursivamente
 * @param {object} component - Componente a validar
 * @returns {object} - Componente con URLs validadas
 */
function validateComponentImages(component) {
  if (!component) return component;

  const validatedComponent = { ...component };

  // Validar imagen del componente actual
  if ((component.type === 'image' || component.type === 'logo') && component.content) {
    if (!validateImageUrl(component.content)) {
      logger.warn(`Reemplazando imagen inexistente en componente ${component.id}: ${component.content}`);
      validatedComponent.content = '/images/placeholder.png';
    }
  }

  // Validar imágenes en componentes hijos
  if (component.children && Array.isArray(component.children)) {
    validatedComponent.children = component.children.map(child => validateComponentImages(child));
  }

  return validatedComponent;
}

/**
 * Valida y limpia URLs de imágenes en una estructura de template completa
 * @param {array} structure - Array de componentes del template
 * @returns {array} - Estructura validada
 */
function validateTemplateImages(structure) {
  if (!Array.isArray(structure)) {
    return structure;
  }

  return structure.map(component => validateComponentImages(component));
}

/**
 * Genera un reporte de imágenes faltantes en un template
 * @param {array} structure - Array de componentes del template
 * @returns {object} - Reporte con imágenes válidas e inválidas
 */
function generateImageReport(structure) {
  const report = {
    validImages: [],
    invalidImages: [],
    totalComponents: 0,
    imageComponents: 0
  };

  function analyzeComponent(component) {
    if (!component) return;
    
    report.totalComponents++;

    if (component.type === 'image' || component.type === 'logo') {
      report.imageComponents++;
      
      if (component.content) {
        if (validateImageUrl(component.content)) {
          report.validImages.push({
            componentId: component.id,
            url: component.content,
            type: component.type
          });
        } else {
          report.invalidImages.push({
            componentId: component.id,
            url: component.content,
            type: component.type
          });
        }
      }
    }

    // Analizar componentes hijos
    if (component.children && Array.isArray(component.children)) {
      component.children.forEach(child => analyzeComponent(child));
    }
  }

  if (Array.isArray(structure)) {
    structure.forEach(component => analyzeComponent(component));
  }

  return report;
}

module.exports = {
  validateImageUrl,
  validateComponentImages,
  validateTemplateImages,
  generateImageReport
};