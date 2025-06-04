// services/imageProcessor.service.js
const fs = require('fs').promises;
const fsSync = require('fs');
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
      console.log(`🔄 PROCESADOR BASE64: Iniciando procesamiento para componente ${componentId} en banner ${bannerId}`);
      
      // Validar que sea una imagen en base64
      if (!base64Data || typeof base64Data !== 'string') {
        console.error('❌ ERROR BASE64: Datos de imagen inválidos o vacíos');
        throw new Error('Datos de imagen inválidos o vacíos');
      }
      
      console.log(`✓ PROCESADOR BASE64: Validando formato de datos...`);
      
      // Buscar el patrón de imagen base64
      const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        console.error('❌ ERROR BASE64: Formato de imagen base64 inválido');
        console.log('Inicio de los datos: ' + base64Data.substring(0, 50) + '...');
        throw new Error('Formato de imagen base64 inválido');
      }
      
      // Obtener tipo MIME y datos
      const mimeType = matches[1];
      const imageData = matches[2];
      
      console.log(`✓ PROCESADOR BASE64: Datos validados, MIME: ${mimeType}, tamaño: ${imageData.length} caracteres`);
      
      // Determinar extensión basada en MIME
      const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
      
      // Crear nombre de archivo único con timestamp para evitar problemas de caché
      const timestamp = Date.now();
      const fileName = `img_${componentId}_${timestamp}.${extension}`;
      console.log(`📄 PROCESADOR BASE64: Nombre de archivo generado: ${fileName}`);
      
      // Crear directorio para las imágenes
      const uploadDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
      console.log(`📁 PROCESADOR BASE64: Creando directorio: ${uploadDir}`);
      
      // Crear directorio de forma simple, sin helpers
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`✅ PROCESADOR BASE64: Directorio creado: ${uploadDir}`);
      } catch (dirErr) {
        console.error(`❌ ERROR BASE64 al crear directorio: ${dirErr.message}`);
        // Continuar aunque haya error
      }
      
      // Ruta completa del archivo
      const filePath = path.join(uploadDir, fileName);
      console.log(`📄 PROCESADOR BASE64: Ruta del archivo: ${filePath}`);
      
      // Decodificar la cadena base64 y guardar archivo
      try {
        // Crear buffer desde la cadena base64
        const buffer = Buffer.from(imageData, 'base64');
        console.log(`✓ PROCESADOR BASE64: Buffer creado, tamaño: ${buffer.length} bytes`);
        
        // Guardar el archivo
        await fs.writeFile(filePath, buffer);
        console.log(`✅ PROCESADOR BASE64: Imagen guardada en: ${filePath}`);
        
        // Intentar verificar que el archivo se guardó (no bloqueante)
        try {
          const stats = await fs.stat(filePath);
          console.log(`✓ PROCESADOR BASE64: Archivo verificado, tamaño: ${stats.size} bytes`);
        } catch (verifyErr) {
          console.warn(`⚠️ PROCESADOR BASE64: No se pudo verificar el archivo: ${verifyErr.message}`);
          // Continuar aunque no se pueda verificar
        }
        
        // Construir URL relativa
        const imageUrl = `/templates/images/${bannerId}/${fileName}`;
        console.log(`🔗 PROCESADOR BASE64: URL generada: ${imageUrl}`);
        
        // Devolver información
        return {
          path: filePath,
          url: imageUrl,
          fileName,
          componentId,
          success: true
        };
      } catch (fileErr) {
        console.error(`❌ ERROR BASE64 al escribir archivo: ${fileErr.message}`);
        throw fileErr;
      }
    } catch (error) {
      console.error(`❌ ERROR GENERAL PROCESADOR BASE64: ${error.message}`);
      logger.error('Error procesando imagen base64:', error);
      
      // Devolver objeto con error en lugar de lanzar excepción
      return {
        error: error.message,
        success: false,
        componentId
      };
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
      
      // Verificar que el directorio realmente existe y tiene permisos correctos
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          throw new Error(`La ruta ${dirPath} existe pero no es un directorio`);
        }
        
        // Verificar permisos escribiendo un archivo de prueba temporal
        const testFilePath = path.join(dirPath, `.test_${Date.now()}`);
        await fs.writeFile(testFilePath, 'test');
        await fs.unlink(testFilePath);
        
        logger.info(`Directorio creado y verificado: ${dirPath}`);
        return true;
      } catch (verifyError) {
        logger.error(`Error al verificar directorio ${dirPath}:`, verifyError);
        throw new Error(`El directorio se creó pero no se pudo verificar o tiene problemas de permisos: ${verifyError.message}`);
      }
    } catch (error) {
      logger.error(`Error al crear directorio ${dirPath}:`, error);
      throw error;
    }
  }

  // FUNCIÓN ELIMINADA: cleanupUnusedImages
  // Se mantiene solo la limpieza de banners eliminados (cleanupDeletedBannersImages)

  /**
   * Limpia imágenes de banners que han sido eliminados de la base de datos
   * Solo elimina directorios completos de banners que ya no existen en la BD
   * @returns {Object} - Resultado de la operación
   */
  async cleanupDeletedBannersImages() {
    try {
      const BannerTemplate = require('../models/BannerTemplate');
      
      logger.info('Iniciando limpieza de imágenes de banners eliminados');
      
      // Ruta al directorio de imágenes de templates
      const imagesDir = path.join(process.cwd(), 'public', 'templates', 'images');
      
      // Verificar si el directorio existe
      try {
        await fs.access(imagesDir);
      } catch (error) {
        logger.info('No existe directorio de imágenes de templates');
        return { success: true, deletedBanners: 0, deletedFiles: 0 };
      }
      
      // Listar todos los directorios (cada uno representa un banner)
      const items = await fs.readdir(imagesDir, { withFileTypes: true });
      const bannerDirs = items.filter(item => item.isDirectory()).map(item => item.name);
      
      logger.info(`Encontrados ${bannerDirs.length} directorios de banners`);
      
      // Filtrar directorios temporales (no deben eliminarse)
      const validBannerDirs = bannerDirs.filter(dir => !dir.startsWith('temp_'));
      
      logger.info(`${validBannerDirs.length} directorios de banners válidos para verificar`);
      
      // Obtener todos los IDs de banners que existen en la BD
      const existingBanners = await BannerTemplate.find({}, { _id: 1 }).lean();
      const existingBannerIds = new Set(existingBanners.map(banner => banner._id.toString()));
      
      logger.info(`${existingBannerIds.size} banners existen en la base de datos`);
      
      let deletedBannersCount = 0;
      let deletedFilesCount = 0;
      
      // Verificar cada directorio de banner
      for (const bannerDir of validBannerDirs) {
        try {
          // Verificar si el banner existe en la BD
          const bannerExists = existingBannerIds.has(bannerDir);
          
          if (!bannerExists) {
            logger.info(`Banner ${bannerDir} no existe en BD, eliminando directorio...`);
            
            const bannerDirPath = path.join(imagesDir, bannerDir);
            
            // Contar archivos antes de eliminar
            try {
              const files = await fs.readdir(bannerDirPath);
              deletedFilesCount += files.length;
              
              // Eliminar todo el directorio recursivamente
              await fs.rmdir(bannerDirPath, { recursive: true });
              
              logger.info(`Eliminado directorio completo: ${bannerDirPath} (${files.length} archivos)`);
              deletedBannersCount++;
            } catch (error) {
              logger.error(`Error eliminando directorio ${bannerDirPath}:`, error);
            }
          } else {
            logger.debug(`Banner ${bannerDir} existe en BD, conservando directorio`);
          }
        } catch (error) {
          logger.error(`Error procesando directorio ${bannerDir}:`, error);
        }
      }
      
      logger.info(`Limpieza de banners eliminados completada: ${deletedBannersCount} directorios eliminados, ${deletedFilesCount} archivos eliminados`);
      
      return {
        success: true,
        deletedBanners: deletedBannersCount,
        deletedFiles: deletedFilesCount,
        checkedBanners: validBannerDirs.length
      };
    } catch (error) {
      logger.error('Error en limpieza de imágenes de banners eliminados:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ImageProcessorService();