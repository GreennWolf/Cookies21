// services/imageProcessor.service.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Servicio para procesar imágenes en banners
 */
class ImageProcessorService {
  /**
   * Procesa imágenes base64 dentro de los componentes de un banner
   * @param {Array} components - Array de componentes del banner
   * @param {string} bannerId - ID del banner para crear la carpeta
   * @returns {Object} - Objeto con los componentes actualizados
   */
  async processComponentImages(components, bannerId) {
    try {
      if (!Array.isArray(components) || !bannerId) {
        return { components };
      }
      
      logger.info(`Procesando imágenes para banner ID: ${bannerId}`);
      
      // Clonar para no mutar el original
      const processedComponents = [...components];
      const processedImages = [];
      
      // Procesar componentes recursivamente
      const processComponents = async (comps) => {
        const result = [];
        
        for (const comp of comps) {
          // Clonar el componente
          const newComp = { ...comp };
          
          // Procesar si es tipo imagen y tiene contenido base64
          if (comp.type === 'image' && 
              typeof comp.content === 'string' && 
              comp.content.startsWith('data:image')) {
            
            try {
              // Procesar la imagen
              const imageData = await this.processBase64Image({
                bannerId,
                componentId: comp.id,
                base64Data: comp.content
              });
              
              // Actualizar el contenido con la URL
              newComp.content = imageData.url;
              
              // Agregar a la lista de imágenes procesadas
              processedImages.push({
                componentId: comp.id,
                url: imageData.url,
                path: imageData.path
              });
              
              logger.info(`Imagen procesada para componente ${comp.id}`);
            } catch (error) {
              logger.error(`Error procesando imagen para componente ${comp.id}:`, error);
              // Mantener el contenido original si falla
            }
          }
          
          // Procesar recursivamente los hijos
          if (newComp.children && Array.isArray(newComp.children)) {
            newComp.children = await processComponents(newComp.children);
          }
          
          result.push(newComp);
        }
        
        return result;
      };
      
      // Comenzar procesamiento recursivo
      const updatedComponents = await processComponents(processedComponents);
      
      return {
        components: updatedComponents,
        processedImages
      };
    } catch (error) {
      logger.error('Error procesando imágenes de componentes:', error);
      return { components };
    }
  }
  
  /**
   * Procesa una imagen base64 y la guarda en disco
   * @param {Object} params - Parámetros
   * @param {string} params.bannerId - ID del banner
   * @param {string} params.componentId - ID del componente
   * @param {string} params.base64Data - Datos de imagen en base64
   * @returns {Object} - Datos de la imagen procesada
   */
  async processBase64Image({ bannerId, componentId, base64Data }) {
    try {
      // Validar que sea una imagen en base64
      const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Formato de imagen base64 inválido');
      }
      
      // Obtener tipo MIME y datos
      const mimeType = matches[1];
      const imageData = matches[2];
      
      // Determinar extensión basada en MIME
      const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
      
      // Crear nombre de archivo único
      const fileName = `img_${componentId}_${Date.now()}.${extension}`;
      
      // Crear directorio para las imágenes
      const uploadDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
      await this.createDirs(uploadDir);
      
      // Ruta completa del archivo
      const filePath = path.join(uploadDir, fileName);
      
      // Guardar el archivo
      const buffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(filePath, buffer);
      
      // Devolver información sobre la imagen guardada
      return {
        path: filePath,
        url: `/templates/images/${bannerId}/${fileName}`,
        fileName,
        componentId
      };
    } catch (error) {
      logger.error('Error procesando imagen base64:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza la URL de imagen en un componente específico
   * @param {Array} components - Array de componentes
   * @param {string} componentId - ID del componente a actualizar
   * @param {string} imageUrl - Nueva URL de la imagen
   * @returns {Array} - Componentes actualizados
   */
  updateComponentImageUrl(components, componentId, imageUrl) {
    if (!Array.isArray(components) || !componentId || !imageUrl) {
      return components;
    }
    
    return components.map(comp => {
      // Si es el componente buscado, actualizar su contenido
      if (comp.id === componentId) {
        return {
          ...comp,
          content: imageUrl
        };
      }
      
      // Procesar hijos recursivamente
      if (comp.children && Array.isArray(comp.children)) {
        return {
          ...comp,
          children: this.updateComponentImageUrl(comp.children, componentId, imageUrl)
        };
      }
      
      return comp;
    });
  }
  
  /**
   * Crea directorios recursivamente si no existen
   * @param {string} dirPath - Ruta del directorio a crear
   * @returns {boolean} - Éxito de la operación
   */
  async createDirs(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Directorio creado: ${dirPath}`);
      return true;
    } catch (error) {
      logger.error(`Error al crear directorio ${dirPath}:`, error);
      throw error;
    }
  }
}

module.exports = new ImageProcessorService();