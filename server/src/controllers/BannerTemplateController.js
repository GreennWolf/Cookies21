// controllers/BannerTemplateController.js
const BannerTemplate = require('../models/BannerTemplate');
const Domain = require('../models/Domain');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const bannerValidator = require('../utils/bannerValidator');
const styleSanitizer = require('../utils/styleSanitizer');
const bannerGenerator = require('../services/bannerGenerator.service');
const Audit = require('../models/Audit'); // si usas auditoría
const logger = require('../utils/logger');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { bannerUpload, ensureDirectoryExists } = require('../utils/multerConfig');
const bannerExportService = require('../services/bannerExport.service');
const componentProcessor = require('../services/componentProcessor.service');
const { getBaseUrl } = require('../config/urls');

const moveFromTempToBannerFolder = async (tempFilePath, bannerId, filename) => {
  try {
    if (!tempFilePath || !bannerId || !filename) {
      throw new Error('Faltan parámetros para mover el archivo');
    }
    
    // Verificar que el archivo temporal existe
    try {
      const stats = await fs.stat(tempFilePath);
      if (stats.size === 0) {
        throw new Error(`Archivo temporal está vacío: ${tempFilePath}`);
      }
      console.log(`Archivo temporal verificado: ${tempFilePath}, tamaño: ${stats.size} bytes`);
    } catch (err) {
      throw new Error(`Archivo temporal no encontrado o no accesible: ${tempFilePath} - Error: ${err.message}`);
    }
    
    // Crear carpeta para el banner si no existe
    const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
    await ensureDirectoryExists(bannerDir);
    
    // Ruta final del archivo
    const finalPath = path.join(bannerDir, filename);
    
    // Copiar el archivo en lugar de moverlo para evitar problemas con sistemas de archivos diferentes
    // fs.rename puede fallar entre diferentes volúmenes o sistemas de archivos
    await fs.copyFile(tempFilePath, finalPath);
    console.log(`Archivo copiado de ${tempFilePath} a ${finalPath}`);
    
    // Verificar que se copió correctamente
    try {
      const stats = await fs.stat(finalPath);
      if (stats.size === 0) {
        throw new Error(`El archivo copiado está vacío: ${finalPath}`);
      }
      console.log(`Archivo copiado verificado: ${finalPath}, tamaño: ${stats.size} bytes`);
      
      // Intentar eliminar el archivo temporal ahora que sabemos que la copia fue exitosa
      try {
        await fs.unlink(tempFilePath);
        console.log(`Archivo temporal eliminado: ${tempFilePath}`);
      } catch (unlinkErr) {
        // No fallar si no se puede eliminar el temporal, solo loguear
        console.warn(`No se pudo eliminar el archivo temporal ${tempFilePath}: ${unlinkErr.message}`);
      }
    } catch (verifyErr) {
      throw new Error(`El archivo no se copió correctamente a ${finalPath}: ${verifyErr.message}`);
    }
    
    // Devolver ruta relativa para usar en el frontend
    return `/templates/images/${bannerId}/${filename}`;
  } catch (error) {
    console.error(`Error moviendo archivo: ${error.message}`);
    throw error;
  }
};

class BannerTemplateController {

 /**
 * Procesa imágenes en componentes de un banner (base64 → archivos)
 * @param {string} bannerId - ID del banner
 * @param {Array} components - Componentes del banner
 * @returns {Array} - Componentes actualizados con URLs de imágenes
 */
 async processImagesInBanner(bannerId, components) {
  try {
    if (!bannerId || !components || !Array.isArray(components)) {
      return components;
    }
    
    const path = require('path');
    const fs = require('fs').promises;
    
    // Usar ensureDirectoryExists del utils/multerConfig para garantizar creación
    const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
    try {
      await ensureDirectoryExists(bannerDir);
      console.log(`Directorio para imágenes creado/verificado: ${bannerDir}`);
    } catch (error) {
      console.error(`Error al crear directorio para imágenes: ${error.message}`);
      throw error;
    }
    
    // Función recursiva para procesar imágenes en componentes y subcomponentes
    const processComponentsImages = async (comps) => {
      if (!Array.isArray(comps)) return comps;
      
      const processedComps = [...comps];
      
      for (let i = 0; i < processedComps.length; i++) {
        const comp = processedComps[i];
        
        // Procesar imágenes en componentes tipo imagen
        if (comp.type === 'image' && typeof comp.content === 'string') {
          // Caso 1: Es una imagen base64
          if (comp.content.startsWith('data:image')) {
            try {
              // Extraer datos de la imagen base64
              const matches = comp.content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              
              if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
                
                // Crear nombre de archivo único
                const timestamp = Date.now();
                const fileName = `img_${comp.id}_${timestamp}.${extension}`;
                const filePath = path.join(bannerDir, fileName);
                
                try {
                  // Guardar archivo
                  const buffer = Buffer.from(base64Data, 'base64');
                  await fs.writeFile(filePath, buffer);
                  
                  // Verificar que el archivo se guardó correctamente
                  const stats = await fs.stat(filePath);
                  if (stats.size === 0) {
                    throw new Error('El archivo guardado está vacío');
                  }
                  
                  console.log(`Imagen base64 procesada y guardada para componente ${comp.id}: ${fileName} (${stats.size} bytes)`);
                  
                  // Actualizar el contenido del componente con la URL relativa
                  processedComps[i] = {
                    ...comp,
                    content: `/templates/images/${bannerId}/${fileName}`
                  };
                } catch (saveError) {
                  console.error(`Error al guardar imagen para componente ${comp.id}: ${saveError.message}`);
                  throw saveError;
                }
              }
            } catch (error) {
              console.error(`Error al procesar imagen base64 para componente ${comp.id}:`, error);
            }
          }
          // Caso 2: Es una referencia temporal a un archivo subido
          else if (comp.content.startsWith('__IMAGE_REF__')) {
            try {
              console.log(`⚙️ Procesando referencia de imagen para componente ${comp.id}: ${comp.content}`);
              
              // Extraer el ID del componente de la referencia
              const componentId = comp.content.replace('__IMAGE_REF__', '');
              console.log(`🔍 DEBUG - ID de componente extraído: ${componentId}`);
              
              // Verificar si hay configuraciones específicas para esta imagen
              if (comp._imageSettings) {
                console.log(`🔍 DEBUG - Encontradas configuraciones para imagen ${comp.id}:`, comp._imageSettings);
              } else {
                console.log(`🔍 DEBUG - No se encontraron configuraciones para imagen ${comp.id}`);
              }
              
              // Intentar encontrar el archivo correspondiente en req.files
              const matchingFile = req.files ? req.files.find(file => 
                file.originalname.includes(`IMAGE_REF_${componentId}_`)
              ) : null;
              
              if (!matchingFile) {
                console.error(`❌ No se encontró archivo para componente ${componentId}`);
                continue;
              }
              
              const tempPath = matchingFile.path;
              console.log(`✅ Archivo encontrado para componente ${componentId}: ${matchingFile.originalname} (${tempPath})`);
              
              // Verificar que el archivo temporal existe y tiene contenido
              try {
                const stats = await fs.stat(tempPath);
                if (stats.size === 0) {
                  console.error(`Archivo temporal está vacío: ${tempPath}`);
                  continue;
                }
                console.log(`Archivo temporal verificado para componente ${comp.id}: ${tempPath} (${stats.size} bytes)`);
              } catch (err) {
                console.error(`Archivo temporal no encontrado o inaccesible: ${tempPath} - ${err.message}`);
                continue;
              }
              
              // Obtener la extensión del archivo
              const extension = path.extname(matchingFile.originalname);
              
              // Crear nombre único para el archivo final
              const timestamp = Date.now();
              const fileName = `img_${comp.id}_${timestamp}${extension}`;
              const destPath = path.join(bannerDir, fileName);
              
              try {
                // Copiar el archivo a la carpeta final
                await fs.copyFile(tempPath, destPath);
                
                // Verificar que el archivo se copió correctamente
                const stats = await fs.stat(destPath);
                if (stats.size === 0) {
                  throw new Error(`El archivo copiado está vacío: ${destPath}`);
                }
                console.log(`Archivo copiado correctamente para componente ${comp.id}: ${destPath} (${stats.size} bytes)`);
                
                // Intentar eliminar el archivo temporal (no bloquear si hay error)
                try {
                  await fs.unlink(tempPath);
                  console.log(`Archivo temporal eliminado: ${tempPath}`);
                } catch (unlinkError) {
                  console.warn(`No se pudo eliminar archivo temporal ${tempPath}: ${unlinkError.message}`);
                }
                
                // Actualizar el componente con la URL relativa y aplicar configuración de estilo
                const updatedComp = {
                  ...comp,
                  content: `/templates/images/${bannerId}/${fileName}`,
                };
                
                // Si hay configuración de estilo para la imagen, aplicarla
                if (comp._imageSettings) {
                  console.log(`🎨 Aplicando configuración de estilo para imagen ${comp.id}:`, comp._imageSettings);
                  
                  // Procesar los ajustes a través de todos los dispositivos
                  ['desktop', 'tablet', 'mobile'].forEach(device => {
                    if (updatedComp.style && updatedComp.style[device]) {
                      // Copiar estilo base
                      updatedComp.style[device] = {
                        ...updatedComp.style[device]
                      };
                      
                      // Aplicar posición si existe
                      if (comp._imageSettings.position) {
                        // Aplicar left y top directamente al estilo - usando píxeles, no porcentajes
                        if (comp._imageSettings.position.left !== undefined) {
                          // Asegurar que tenemos un valor numérico
                          const left = parseFloat(comp._imageSettings.position.left);
                          // Usar directamente el valor en píxeles, no como porcentaje
                          updatedComp.style[device].left = `${left}px`;
                          console.log(`🔄 Estableciendo posición left: ${left}px`);
                        }
                        
                        if (comp._imageSettings.position.top !== undefined) {
                          // Asegurar que tenemos un valor numérico
                          const top = parseFloat(comp._imageSettings.position.top);
                          // Usar directamente el valor en píxeles, no como porcentaje
                          updatedComp.style[device].top = `${top}px`;
                          console.log(`🔄 Estableciendo posición top: ${top}px`);
                        }
                        
                        // Conservar la posición original sin convertirla
                        updatedComp.style[device]._customPosition = {
                          left: parseFloat(comp._imageSettings.position.left),
                          top: parseFloat(comp._imageSettings.position.top),
                          mode: 'pixels'
                        };
                        
                        console.log(`📍 Posición aplicada en ${device}: left=${updatedComp.style[device].left}, top=${updatedComp.style[device].top}`);
                      console.log(`🔍 DEBUG - Posición final para ${comp.id} en ${device}:`, {
                        left: updatedComp.style[device].left,
                        top: updatedComp.style[device].top,
                        customPosition: updatedComp.style[device]._customPosition
                      });
                      }
                      
                      // Aplicar tamaño si existe - VERSIÓN CORREGIDA
                      if (comp._imageSettings.width !== undefined || comp._imageSettings.height !== undefined) {
                        // En lugar de usar factores de escala, vamos a usar los valores directamente
                        // ya que estos ya representan el tamaño deseado
                        
                        // Inicializar objeto para almacenar dimensiones originales
                        updatedComp.style[device]._customDimensions = {
                          mode: 'pixels'
                        };
                        
                        // Preferir dimensiones exactas en píxeles si están disponibles
                        if (comp._imageSettings.widthRaw !== undefined) {
                          const width = parseInt(comp._imageSettings.widthRaw);
                          if (!isNaN(width) && width > 0) {
                            updatedComp.style[device].width = `${width}px`;
                            updatedComp.style[device]._customDimensions.width = width;
                            console.log(`🔄 Usando ancho en píxeles exacto: ${width}px`);
                          }
                        } else if (comp._imageSettings.width !== undefined) {
                          // Fallback a ancho porcentual si no hay dimensión exacta
                          const width = comp._imageSettings.width > 0 ? comp._imageSettings.width : 100;
                          updatedComp.style[device].width = `${width}px`;
                          updatedComp.style[device]._customDimensions.width = width;
                          console.log(`🔄 Usando ancho aproximado: ${width}px`);
                        }
                        
                        // Preferir dimensiones exactas en píxeles si están disponibles
                        if (comp._imageSettings.heightRaw !== undefined) {
                          const height = parseInt(comp._imageSettings.heightRaw);
                          if (!isNaN(height) && height > 0) {
                            updatedComp.style[device].height = `${height}px`;
                            updatedComp.style[device]._customDimensions.height = height;
                            console.log(`🔄 Usando alto en píxeles exacto: ${height}px`);
                          }
                        } else if (comp._imageSettings.height !== undefined) {
                          // Fallback a alto porcentual si no hay dimensión exacta
                          const height = comp._imageSettings.height > 0 ? comp._imageSettings.height : 100;
                          updatedComp.style[device].height = `${height}px`;
                          updatedComp.style[device]._customDimensions.height = height;
                          console.log(`🔄 Usando alto aproximado: ${height}px`);
                        }
                        
                        console.log(`📐 Tamaño aplicado en ${device}: width=${updatedComp.style[device].width}, height=${updatedComp.style[device].height}`);
                      console.log(`🔍 DEBUG - Dimensiones finales para ${comp.id} en ${device}:`, {
                        width: updatedComp.style[device].width,
                        height: updatedComp.style[device].height,
                        customDimensions: updatedComp.style[device]._customDimensions
                      });
                      }
                      
                      // Aplicar object-fit y object-position si existen
                      if (comp._imageSettings.objectFit) {
                        updatedComp.style[device].objectFit = comp._imageSettings.objectFit;
                        console.log(`🔍 DEBUG - Aplicando objectFit: ${comp._imageSettings.objectFit} para ${comp.id}`);
                      }
                      
                      if (comp._imageSettings.objectPosition) {
                        updatedComp.style[device].objectPosition = comp._imageSettings.objectPosition;
                        console.log(`🔍 DEBUG - Aplicando objectPosition: ${comp._imageSettings.objectPosition} para ${comp.id}`);
                      }
                    }
                  });
                }
                
                // Limpiar propiedades temporales
                console.log(`🔍 DEBUG - Limpiando propiedades temporales para ${comp.id}. Valores de _imageSettings antes de eliminar:`, updatedComp._imageSettings);
                delete updatedComp._pendingImageUpload;
                delete updatedComp._imageFileName;
                delete updatedComp._imageComponentId;
                delete updatedComp._imageSettings;
                delete updatedComp._tempPath;
                delete updatedComp._tempFile;
                
                // Actualizar el componente en el array
                processedComps[i] = updatedComp;
                
                console.log(`Imagen procesada para componente ${comp.id}: ${fileName}`);
              } catch (copyError) {
                console.error(`Error al copiar archivo para componente ${comp.id}: ${copyError.message}`);
                throw copyError;
              }
            } catch (error) {
              console.error(`Error al procesar referencia de imagen para componente ${comp.id}:`, error);
            }
          }
        }
        
        // Procesar subcomponentes recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          processedComps[i] = {
            ...comp,
            children: await processComponentsImages(comp.children)
          };
        }
      }
      
      return processedComps;
    };
    
    // Procesar todos los componentes
    return await processComponentsImages(components);
    
  } catch (error) {
    console.error('Error procesando imágenes en componentes:', error);
    return components; // Devolver componentes originales si hay error
  }
}




/**
 * Maneja la carga de imágenes de banner mediante formulario multipart
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
uploadBannerImage = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { componentId } = req.body;
    
    // Verificar si se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No se ha proporcionado ninguna imagen'
      });
    }
    
    // Buscar el banner en la base de datos
    const template = await BannerTemplate.findOne({
      _id: bannerId,
      clientId: req.clientId
    });
    
    if (!template) {
      // Eliminar el archivo subido
      await fs.unlink(req.file.path).catch(err => 
        console.error('Error al eliminar archivo:', err)
      );
      
      return res.status(404).json({
        status: 'error',
        message: 'Banner no encontrado'
      });
    }
    
    // Construir URL de la imagen
    const imageUrl = `/templates/images/${bannerId}/${req.file.filename}`;
    
    // Si se proporcionó un componentId, actualizar ese componente
    if (componentId) {
      const imageProcessorService = require('../services/imageProcessor.service');
      
      // Actualizar el contenido del componente con la URL de la imagen
      template.components = imageProcessorService.updateComponentImageUrl(
        template.components,
        componentId,
        imageUrl
      );
      
      // Guardar el template actualizado
      await template.save();
    }
    
    // Responder con éxito
    res.status(200).json({
      status: 'success',
      data: {
        imageUrl,
        file: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      }
    });
  } catch (error) {
    console.error('Error en uploadBannerImage:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al procesar la imagen',
      details: error.message
    });
  }
};

/**
 * Maneja la carga de imágenes en formato base64
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
uploadBase64Image = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { imageData, componentId } = req.body;
    
    // Verificar si hay datos de imagen procesados o en el body
    if (!req.processedImage && !imageData) {
      return res.status(400).json({
        status: 'error',
        message: 'No se ha proporcionado ninguna imagen en formato base64'
      });
    }
    
    // Si no se procesó la imagen en el middleware, procesarla aquí
    let processedImage = req.processedImage;
    if (!processedImage && imageData) {
      const imageProcessorService = require('../services/imageProcessor.service');
      processedImage = await imageProcessorService.processBase64Image({
        bannerId,
        componentId,
        base64Data: imageData
      });
    }
    
    // Buscar el banner en la base de datos
    const template = await BannerTemplate.findOne({
      _id: bannerId,
      clientId: req.clientId
    });
    
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Banner no encontrado'
      });
    }
    
    // Si se proporcionó un componentId, actualizar ese componente
    if (componentId) {
      const imageProcessorService = require('../services/imageProcessor.service');
      
      // Actualizar el contenido del componente con la URL de la imagen
      template.components = imageProcessorService.updateComponentImageUrl(
        template.components,
        componentId,
        processedImage.url
      );
      
      // Guardar el template actualizado
      await template.save();
    }
    
    // Responder con éxito
    res.status(200).json({
      status: 'success',
      data: {
        url: processedImage.url,
        componentId
      }
    });
  } catch (error) {
    console.error('Error en uploadBase64Image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al procesar la imagen base64',
      details: error.message
    });
  }
};
  // Obtener plantillas del sistema
  getSystemTemplates = catchAsync(async (req, res) => {
    const { language = 'en' } = req.query;
    
    console.log('🔍 BannerTemplateController.getSystemTemplates: Iniciando búsqueda');
    console.log('📝 Query language:', language);
    
    // Primero verificar todas las plantillas para debugging
    const allTemplates = await BannerTemplate.find({});
    console.log(`📊 Total de plantillas en BD: ${allTemplates.length}`);
    
    const systemTemplates = allTemplates.filter(t => t.type === 'system');
    console.log(`🔧 Plantillas de sistema: ${systemTemplates.length}`);
    
    const activeSystemTemplates = systemTemplates.filter(t => t.status === 'active');
    console.log(`✅ Plantillas de sistema activas: ${activeSystemTemplates.length}`);
    
    const publicActiveSystemTemplates = activeSystemTemplates.filter(t => t.metadata?.isPublic === true);
    console.log(`🌐 Plantillas de sistema activas y públicas: ${publicActiveSystemTemplates.length}`);
    
    // Consulta original
    const templates = await BannerTemplate.find({
      type: 'system',
      status: 'active',
      'metadata.isPublic': true
    });
    
    console.log(`📋 Plantillas finales encontradas: ${templates.length}`);
    if (templates.length > 0) {
      console.log('📝 Primeras plantillas:', templates.slice(0, 2).map(t => ({ 
        id: t._id, 
        name: t.name, 
        type: t.type, 
        status: t.status, 
        isPublic: t.metadata?.isPublic 
      })));
    }

    res.status(200).json({
      status: 'success',
      data: { templates }
    });
  });
  
  // Crear una plantilla del sistema (solo para administradores)
createSystemTemplate = async (req, res) => {
  try {
    const { userId } = req;
    
    // Verificar que el usuario sea owner (administrador)
    if (!req.isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los administradores pueden crear plantillas del sistema'
      });
    }
    
    console.log('🚀 Iniciando creación de plantilla del sistema');
    console.log('📦 Content-Type:', req.headers['content-type']);
    
    // 1. Detectar si tenemos un formulario multipart
    const isMultipart = req.headers['content-type'] && 
                      req.headers['content-type'].startsWith('multipart/form-data');
    
    console.log(`📄 Tipo de solicitud: ${isMultipart ? 'Multipart con archivos' : 'JSON simple'}`);
    
    // 2. Extraer datos del template
    let templateData;
    
    if (isMultipart) {
      // Para solicitudes multipart/form-data
      if (!req.body.template) {
        return res.status(400).json({
          status: 'error',
          message: 'Falta el campo "template" en el formulario'
        });
      }
      
      // Convertir string JSON a objeto
      try {
        templateData = JSON.parse(req.body.template);
        console.log('📄 Template parseado desde FormData');
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Error al parsear datos del template',
          details: error.message
        });
      }
    } else {
      // Para solicitudes JSON normales
      templateData = req.body;
    }
    
    // 3. Verificar archivos subidos por multer
    const uploadedFiles = req.files || [];
    console.log(`🖼️ Archivos recibidos: ${uploadedFiles.length}`);
    
    // Mostrar detalles de cada archivo
    uploadedFiles.forEach((file, i) => {
      console.log(`📄 Archivo ${i+1}:`, {
        name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });
    });
    
    // 4. Validaciones básicas
    if (!templateData.name || !templateData.name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Template name is required'
      });
    }
    
    // 5. Procesar componentes y archivos (COPIADO DE createTemplate normal)
    if (templateData.components && Array.isArray(templateData.components)) {
      // Normalizar posiciones a porcentajes
      templateData.components = bannerValidator.normalizePositions(templateData.components);
      
      // Generar un ID temporal para el banner
      const temporaryBannerId = `temp_${Date.now()}`;
      
      // Función recursiva para procesar componentes (igual que en createTemplate)
      const processComponents = (components) => {
        return components.map(comp => {
          const component = { ...comp };
          
          // Si es componente de imagen con marcador temporal
          if (component.type === 'image' && 
              typeof component.content === 'string' && 
              component.content.startsWith('__IMAGE_REF__')) {
            
            const imageId = component.content.replace('__IMAGE_REF__', '');
            const file = uploadedFiles.find(f => 
              f.originalname.includes(`IMAGE_REF_${imageId}_`));
            
            if (file) {
              console.log(`✅ Encontrado archivo ${file.originalname} para componente ${component.id}`);
              
              const fileName = `img_${component.id}_${Date.now()}${path.extname(file.originalname)}`;
              const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', temporaryBannerId);
              
              try {
                // Crear directorio si no existe
                fsSync.mkdirSync(bannerDir, { recursive: true });
                console.log(`📁 Creado directorio: ${bannerDir}`);
                
                const destPath = path.join(bannerDir, fileName);
                
                // Copiar archivo
                fsSync.copyFileSync(file.path, destPath);
                console.log(`📋 Archivo copiado a: ${destPath}`);
                
                // Generar URL relativa
                const relativeUrl = `/templates/images/${temporaryBannerId}/${fileName}`;
                
                // Actualizar contenido del componente
                component.content = relativeUrl;
                console.log(`🔗 Actualizando componente con URL: ${relativeUrl}`);
                
                // Aplicar configuración de estilo si existe
                if (component._imageSettings) {
                  console.log(`🎨 Aplicando configuración de estilo para componente ${component.id}`);
                  
                  ['desktop', 'tablet', 'mobile'].forEach(device => {
                    if (component.style && component.style[device]) {
                      // Aplicar posición si existe
                      if (component._imageSettings.position) {
                        if (component._imageSettings.position.left !== undefined) {
                          const left = parseFloat(component._imageSettings.position.left);
                          component.style[device].left = `${left}px`;
                        }
                        
                        if (component._imageSettings.position.top !== undefined) {
                          const top = parseFloat(component._imageSettings.position.top);
                          component.style[device].top = `${top}px`;
                        }
                        
                        component.style[device]._customPosition = {
                          left: parseFloat(component._imageSettings.position.left),
                          top: parseFloat(component._imageSettings.position.top),
                          mode: 'pixels'
                        };
                      }
                      
                      // Aplicar tamaño si existe
                      if (component._imageSettings.width !== undefined || component._imageSettings.height !== undefined) {
                        component.style[device]._customDimensions = {
                          mode: 'pixels'
                        };
                        
                        if (component._imageSettings.widthRaw !== undefined) {
                          const width = parseInt(component._imageSettings.widthRaw);
                          if (!isNaN(width) && width > 0) {
                            component.style[device].width = `${width}px`;
                            component.style[device]._customDimensions.width = width;
                          }
                        } else if (component._imageSettings.width !== undefined) {
                          const width = component._imageSettings.width > 0 ? component._imageSettings.width : 100;
                          component.style[device].width = `${width}px`;
                          component.style[device]._customDimensions.width = width;
                        }
                        
                        if (component._imageSettings.heightRaw !== undefined) {
                          const height = parseInt(component._imageSettings.heightRaw);
                          if (!isNaN(height) && height > 0) {
                            component.style[device].height = `${height}px`;
                            component.style[device]._customDimensions.height = height;
                          }
                        } else if (component._imageSettings.height !== undefined) {
                          const height = component._imageSettings.height > 0 ? component._imageSettings.height : 100;
                          component.style[device].height = `${height}px`;
                          component.style[device]._customDimensions.height = height;
                        }
                      }
                      
                      // Aplicar object-fit y object-position si existen
                      if (component._imageSettings.objectFit) {
                        component.style[device].objectFit = component._imageSettings.objectFit;
                      }
                      if (component._imageSettings.objectPosition) {
                        component.style[device].objectPosition = component._imageSettings.objectPosition;
                      }
                    }
                  });
                }
              } catch (dirError) {
                console.error(`❌ Error al crear directorio o copiar archivo: ${dirError.message}`);
              }
            } else {
              console.warn(`⚠️ No se encontró archivo para componente ${component.id} con referencia ${imageId}`);
            }
          }
          
          // Limpiar propiedades temporales
          delete component._tempFile;
          delete component._imageFile;
          delete component._imageSettings;
          
          // Limpiar también en estilos
          if (component.style) {
            Object.keys(component.style).forEach(device => {
              if (component.style[device]) {
                delete component.style[device]._tempFile;
                delete component.style[device]._previewUrl;
              }
            });
          }
          
          // Procesar hijos recursivamente
          if (component.children && Array.isArray(component.children)) {
            component.children = processComponents(component.children);
          }
          
          return component;
        });
      };
      
      // Procesar componentes recursivamente
      templateData.components = processComponents(templateData.components);
    }
    
    // 6. Procesar y validar componentes
    console.log('🔧 Procesando componentes del template');
    
    // Validar estructura del banner
    const validationResult = componentProcessor.validateBannerStructure(templateData);
    if (!validationResult.isValid) {
      console.error('❌ Errores de validación:', validationResult.errors);
      return res.status(400).json({
        status: 'error',
        message: 'Banner structure validation failed',
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });
    }
    
    // Procesar componentes
    if (templateData.components && Array.isArray(templateData.components)) {
      const processedComponents = componentProcessor.processComponents(templateData.components);
      templateData.components = processedComponents;
      console.log(`✅ Procesados ${processedComponents.length} componentes`);
    }
    
    // 7. Guardar la plantilla en la base de datos
    console.log('💾 Guardando template del sistema en la base de datos');
    
    // Establecer metadata
    const templateWithMetadata = {
      ...templateData,
      type: 'system',
      metadata: {
        ...(templateData.metadata || {}),
        createdBy: userId,
        lastModifiedBy: userId,
        version: 1,
        isPublic: templateData.metadata?.isPublic !== false,
        category: templateData.metadata?.category || 'basic'
      },
      status: 'active'
    };
    
    // IMPORTANTE: Eliminar _id si existe para evitar duplicate key error
    // MongoDB debe generar el _id automáticamente
    if (templateWithMetadata._id) {
      console.log(`⚠️ Removiendo _id existente del template: ${templateWithMetadata._id}`);
      delete templateWithMetadata._id;
    }
    
    const createdTemplate = await BannerTemplate.create(templateWithMetadata);
    console.log(`✅ Plantilla del sistema creada con ID: ${createdTemplate._id}`);
    
    // 8. Si se creó con ID temporal, mover las imágenes al directorio correcto
    if (uploadedFiles.length > 0) {
      const tempDir = path.join(process.cwd(), 'public', 'templates', 'images', `temp_${Date.now()}`);
      const finalDir = path.join(process.cwd(), 'public', 'templates', 'images', createdTemplate._id.toString());
      
      try {
        // Renombrar el directorio temporal al ID final
        if (fsSync.existsSync(tempDir)) {
          fsSync.renameSync(tempDir, finalDir);
          console.log(`📁 Directorio renombrado de temporal a ${createdTemplate._id}`);
        }
      } catch (err) {
        console.warn(`⚠️ No se pudo renombrar directorio: ${err.message}`);
      }
    }
    
    // 9. Eliminar archivos temporales
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          await fs.unlink(file.path);
          console.log(`🗑️ Eliminado archivo temporal: ${file.path}`);
        } catch (error) {
          console.warn(`⚠️ No se pudo eliminar archivo temporal ${file.path}: ${error.message}`);
        }
      }
    }
    
    // 10. Responder con éxito
    res.status(201).json({
      status: 'success',
      message: 'System template created successfully',
      data: { template: createdTemplate }
    });
    
  } catch (error) {
    console.error('❌ Error creating system template:', error);
    
    // Intentar limpiar archivos temporales en caso de error
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (err) { /* ignorar errores de limpieza */ }
      }
    }
    
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Error creating system template',
      errors: error.errors || []
    });
  }
};
  
  // Actualizar una plantilla del sistema (solo para administradores)
  updateSystemTemplate = async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req;
      
      // Verificar que el usuario sea owner (administrador)
      if (!req.isOwner) {
        return res.status(403).json({
          status: 'error',
          message: 'Solo los administradores pueden actualizar plantillas del sistema'
        });
      }
      
      console.log(`🔄 Actualizando plantilla del sistema con ID: ${id}`);
      console.log('📦 Content-Type:', req.headers['content-type']);
      
      // 1. Detectar si tenemos un formulario multipart
      const isMultipart = req.headers['content-type'] && 
                        req.headers['content-type'].startsWith('multipart/form-data');
      
      console.log(`📄 Tipo de solicitud: ${isMultipart ? 'Multipart con archivos' : 'JSON simple'}`);
      
      // 2. Extraer datos del template
      let updates;
      
      if (isMultipart) {
        // Para solicitudes multipart/form-data
        if (!req.body.template) {
          return res.status(400).json({
            status: 'error',
            message: 'Falta el campo "template" en el formulario'
          });
        }
        
        // Convertir string JSON a objeto
        try {
          updates = JSON.parse(req.body.template);
          console.log('📄 Updates parseados desde FormData');
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: 'Error al parsear datos del template',
            details: error.message
          });
        }
      } else {
        // Para solicitudes JSON normales
        updates = req.body;
      }
      
      // 3. Buscar la plantilla del sistema existente
      const existingTemplate = await BannerTemplate.findOne({
        _id: id,
        type: 'system'
      });
      
      if (!existingTemplate) {
        return res.status(404).json({
          status: 'error',
          message: 'System template not found'
        });
      }
      
      // 4. Verificar archivos subidos por multer
      const uploadedFiles = req.files || [];
      console.log(`🖼️ Archivos recibidos: ${uploadedFiles.length}`);
      
      // Mostrar detalles de cada archivo
      uploadedFiles.forEach((file, i) => {
        console.log(`📄 Archivo ${i+1}:`, {
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
      
      // 5. Procesar componentes y archivos
      if (updates.components && Array.isArray(updates.components)) {
        // Normalizar posiciones a porcentajes
        updates.components = bannerValidator.normalizePositions(updates.components);
        
        // Procesar imágenes en componentes
        const processedComponents = await this.processImagesInBanner(id, updates.components);
        updates.components = processedComponents;
      }
      
      // 6. Actualizar la plantilla en la base de datos
      console.log('💾 Actualizando plantilla del sistema en la base de datos');
      
      // Preparar actualización
      let updateData;
    
      if ('metadata' in updates) {
        // Se está actualizando el objeto metadata completo
        updates.metadata = {
          ...updates.metadata,
          lastModifiedBy: userId,
          version: (existingTemplate.metadata.version || 0) + 1
        };
        updateData = { ...updates };
      } else {
        // No se está actualizando metadata, usar dot notation
        updateData = {
          ...updates,
          'metadata.lastModifiedBy': userId,
          'metadata.version': (existingTemplate.metadata.version || 0) + 1
        };
      }
      
      // Asegurarse de que el tipo siga siendo 'system'
      updateData.type = 'system';
      
      // Eliminar campos que no deben actualizarse
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      const updatedTemplate = await BannerTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      console.log(`✅ Plantilla del sistema actualizada: ${updatedTemplate._id}`);
      
      // 7. Eliminar archivos temporales
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            await fs.unlink(file.path);
            console.log(`🗑️ Eliminado archivo temporal: ${file.path}`);
          } catch (error) {
            console.warn(`⚠️ No se pudo eliminar archivo temporal ${file.path}: ${error.message}`);
          }
        }
      }
      
      // 8. Responder con éxito
      res.status(200).json({
        status: 'success',
        message: 'System template updated successfully',
        data: { template: updatedTemplate }
      });
      
    } catch (error) {
      console.error('❌ Error updating system template:', error);
      
      // Intentar limpiar archivos temporales en caso de error
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (err) { /* ignorar errores de limpieza */ }
        }
      }
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Error updating system template',
        errors: error.errors || []
      });
    }
  };

  // Obtener plantillas del cliente
  getClientTemplates = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { status, search, clientId: queryClientId } = req.query;

    console.log('buscando template ', clientId, status, search, queryClientId);

    let query = {};
    let clientInfo;
    
    // Si es owner y se proporcionó un clientId en la consulta
    if (req.isOwner && queryClientId) {
      // Buscar plantillas del cliente específico + plantillas del sistema
      query = {
        $or: [
          { clientId: queryClientId, type: 'custom' },
          { type: 'system', 'metadata.isPublic': true }
        ]
      };
      
      // Obtener información del cliente para incluir en la respuesta
      clientInfo = await Client.findById(queryClientId).select('name email status');
    } 
    // Si es owner sin especificar cliente, mostrar todas las plantillas personalizadas
    else if (req.isOwner && !queryClientId) {
      query = {
        $or: [
          { type: 'custom' },  // Todas las plantillas personalizadas de todos los clientes
          { type: 'system', 'metadata.isPublic': true }
        ]
      };
    } 
    // Usuarios normales solo ven sus propias plantillas + las del sistema
    else {
      query = {
        $or: [
          { clientId, type: 'custom' },
          { type: 'system', 'metadata.isPublic': true }
        ]
      };
    }

    // Aplicar filtros adicionales
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'archived' };
    }

    if (search) {
      // Filtrado por nombre o tags - Reestructurar query para mantener la condición OR original
      const searchConditions = [
        { name: { $regex: search, $options: 'i' } },
        { 'metadata.tags': { $regex: search, $options: 'i' } }
      ];
      
      // Combinar con la consulta original
      query = {
        $and: [
          query,
          { $or: searchConditions }
        ]
      };
    }

    // Obtener templates con información del cliente (para owners)
    let templates;
    if (req.isOwner) {
      templates = await BannerTemplate.find(query)
        .populate('clientId', 'name email status')
        .sort({
          'metadata.isPublic': -1,
          updatedAt: -1
        });
    } else {
      templates = await BannerTemplate.find(query).sort({
        'metadata.isPublic': -1,
        updatedAt: -1
      });
    }

    res.status(200).json({
      status: 'success',
      data: { 
        templates,
        client: clientInfo
      }
    });
  });

  // Obtener una plantilla específica
  getTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { language = 'en' } = req.query;

    // Modificar query para owners
    let query = { _id: id };
    
    if (!req.isOwner) {
      // Para usuarios normales, deben ser del cliente o plantillas del sistema
      query.$or = [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ];
    }
    
    // Buscar el template con o sin información de cliente según el rol
    let template;
    if (req.isOwner) {
      template = await BannerTemplate.findOne(query)
        .populate('clientId', 'name email status');
    } else {
      template = await BannerTemplate.findOne(query);
    }

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Log para ver qué se está devolviendo
    console.log('📥 GET Template - Verificando contenedores:');
    if (template.components) {
      template.components.forEach(comp => {
        if (comp.type === 'container') {
          console.log(`  Contenedor ${comp.id}:`, {
            hasContainerConfig: !!comp.containerConfig,
            containerConfig: comp.containerConfig,
            childrenCount: comp.children?.length || 0,
            children: comp.children?.map(child => ({
              id: child.id,
              type: child.type,
              parentId: child.parentId
            }))
          });
        }
      });
    }
    
    // Asegurarse de que el contenido multilenguaje respete la preferencia de idioma
    if (template.components && Array.isArray(template.components)) {
      template.components = this._applyLanguagePreference(template.components, language);
    }

    res.status(200).json({
      status: 'success',
      data: { template }
    });
  });

  // Crear una nueva plantilla
  createTemplate = async (req, res) => {
    const { clientId, userId } = req;
    
    try {
      console.log('🚀 Iniciando creación de template');
      console.log('📦 Content-Type:', req.headers['content-type']);
      console.log('👤 User ID:', userId);
      console.log('🔑 Is Owner:', req.isOwner);
      console.log('🏢 Client ID:', clientId);
      console.log('🔍 DEBUG - Iniciando procesamiento de datos para creación de template');
      
      // 1. Detectar si tenemos un formulario multipart
      const isMultipart = req.headers['content-type'] && 
                          req.headers['content-type'].startsWith('multipart/form-data');
      
      console.log(`📄 Tipo de solicitud: ${isMultipart ? 'Multipart con archivos' : 'JSON simple'}`);
      
      // 2. Extraer datos del template
      let templateData;
      
      if (isMultipart) {
        // Para solicitudes multipart/form-data
        if (!req.body.template) {
          return res.status(400).json({
            status: 'error',
            message: 'Falta el campo "template" en el formulario'
          });
        }
        
        // Convertir string JSON a objeto
        try {
          templateData = JSON.parse(req.body.template);
          console.log('📄 Template parseado desde FormData');
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: 'Error al parsear datos del template',
            details: error.message
          });
        }
      } else {
        // Para solicitudes JSON normales
        templateData = req.body;
      }
      
      // DEBUG: Mostrar datos recibidos
      console.log('📊 DEBUG - Datos recibidos:');
      console.log('- templateData.type:', templateData.type);
      console.log('- templateData.isSystemTemplate:', templateData.isSystemTemplate);
      console.log('- templateData.name:', templateData.name);
      
      // Determinar para qué cliente se creará el template
      let targetClientId = clientId;
      
      // Si es owner y se especifica un clientId en la solicitud, usar ese
      if (req.isOwner && templateData.clientId) {
        // Verificar que el cliente existe
        const client = await Client.findById(templateData.clientId);
        if (!client) {
          return res.status(404).json({
            status: 'error',
            message: 'Cliente especificado no encontrado'
          });
        }
        targetClientId = templateData.clientId;
      }
      
      // 3. Verificar archivos subidos por multer
      const uploadedFiles = req.files || [];
      console.log(`🖼️ Archivos recibidos: ${uploadedFiles.length}`);
      
      // Mostrar detalles de cada archivo
      uploadedFiles.forEach((file, i) => {
        console.log(`📄 Archivo ${i+1}:`, {
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
      
      // 4. Validaciones básicas
      if (!templateData.name || !templateData.name.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Template name is required'
        });
      }
      
      // 5. Procesar componentes y archivos
      if (templateData.components && Array.isArray(templateData.components)) {
        // Normalizar posiciones a porcentajes
        templateData.components = bannerValidator.normalizePositions(templateData.components);
        
        // Función recursiva para encontrar referencias de imágenes y asociarlas con archivos
        const processComponents = (components) => {
          return components.map(comp => {
            // Hacer una copia limpia del componente
            const component = { ...comp };
            
            // Si es componente de imagen con marcador temporal
            if (component.type === 'image' && 
                typeof component.content === 'string' && 
                component.content.startsWith('__IMAGE_REF__')) {
              
              // Extraer ID del marcador
              const imageId = component.content.replace('__IMAGE_REF__', '');
              
              // Buscar archivo correspondiente por nombre usando el formato consistente
              // Formato esperado: IMAGE_REF_{componentId}_filename
              const file = uploadedFiles.find(f => 
                f.originalname.includes(`IMAGE_REF_${imageId}_`));
              
              if (file) {
                console.log(`✅ Encontrado archivo ${file.originalname} para componente ${component.id}`);
                
                // Construir ruta relativa para el banner
                const bannerId = templateData._id || `temp_${Date.now()}`;
                const fileName = `img_${component.id}_${Date.now()}${path.extname(file.originalname)}`;
                
                // Crear directorio si no existe - FIXED: Use async instead of sync
                const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
                
                // Use ensureDirectoryExists function instead of direct fs calls
                try {
                  // Create directory if it doesn't exist
                  fsSync.mkdirSync(bannerDir, { recursive: true });
                  console.log(`📁 Creado directorio: ${bannerDir}`);
                  
                  // Ruta destino del archivo
                  const destPath = path.join(bannerDir, fileName);
                  
                  // Copiar archivo desde la carpeta temporal
                  fsSync.copyFileSync(file.path, destPath);
                  console.log(`📋 Archivo copiado a: ${destPath}`);
                  
                  // Generar URL relativa para el frontend
                  const relativeUrl = `/templates/images/${bannerId}/${fileName}`;
                  
                  // Actualizar contenido del componente
                  component.content = relativeUrl;
                  console.log(`🔗 Actualizando componente con URL: ${relativeUrl}`);
                  
                  // Aplicar configuración de estilo si existe
                  if (component._imageSettings) {
                    console.log(`🎨 Aplicando configuración de estilo para componente ${component.id}:`, component._imageSettings);
                    console.log(`🔍 DEBUG - Configuración de imagen original para ${component.id}:`, {
                      position: component._imageSettings.position,
                      width: component._imageSettings.width,
                      height: component._imageSettings.height,
                      widthRaw: component._imageSettings.widthRaw,
                      heightRaw: component._imageSettings.heightRaw,
                      objectFit: component._imageSettings.objectFit,
                      objectPosition: component._imageSettings.objectPosition
                    });
                    
                    // Procesar estilos para todos los dispositivos
                    ['desktop', 'tablet', 'mobile'].forEach(device => {
                      if (component.style && component.style[device]) {
                        // Aplicar posición si existe
                        if (component._imageSettings.position) {
                          // Aplicar left y top directamente al estilo - usando píxeles, no porcentajes
                          if (component._imageSettings.position.left !== undefined) {
                            // Asegurar que tenemos un valor numérico
                            const left = parseFloat(component._imageSettings.position.left);
                            // Usar directamente el valor en píxeles, no como porcentaje
                            component.style[device].left = `${left}px`;
                            console.log(`🔄 Estableciendo posición left: ${left}px para ${component.id}`);
                            console.log(`🔍 DEBUG - Valor left original: ${component._imageSettings.position.left}, convertido a: ${left}px para ${component.id}`);
                          }
                          
                          if (component._imageSettings.position.top !== undefined) {
                            // Asegurar que tenemos un valor numérico
                            const top = parseFloat(component._imageSettings.position.top);
                            // Usar directamente el valor en píxeles, no como porcentaje
                            component.style[device].top = `${top}px`;
                            console.log(`🔄 Estableciendo posición top: ${top}px para ${component.id}`);
                            console.log(`🔍 DEBUG - Valor top original: ${component._imageSettings.position.top}, convertido a: ${top}px para ${component.id}`);
                          }
                          
                          // Conservar la posición original sin convertirla
                          component.style[device]._customPosition = {
                            left: parseFloat(component._imageSettings.position.left),
                            top: parseFloat(component._imageSettings.position.top),
                            mode: 'pixels'
                          };
                          console.log(`🔍 DEBUG - Guardando _customPosition para ${component.id}:`, component.style[device]._customPosition);
                        }
                        
                        // Aplicar tamaño si existe - VERSIÓN CORREGIDA
                        if (component._imageSettings.width !== undefined || component._imageSettings.height !== undefined) {
                          // En lugar de usar factores de escala, vamos a usar los valores directamente
                          
                          // Inicializar objeto para almacenar dimensiones originales
                          component.style[device]._customDimensions = {
                            mode: 'pixels'
                          };
                          
                          // Preferir dimensiones exactas en píxeles si están disponibles
                          if (component._imageSettings.widthRaw !== undefined) {
                            const width = parseInt(component._imageSettings.widthRaw);
                            if (!isNaN(width) && width > 0) {
                              component.style[device].width = `${width}px`;
                              component.style[device]._customDimensions.width = width;
                              console.log(`🔄 Usando ancho en píxeles exacto: ${width}px para ${component.id}`);
                              console.log(`🔍 DEBUG - Valor widthRaw original: ${component._imageSettings.widthRaw}, convertido a: ${width}px para ${component.id}`);
                            } else {
                              console.log(`🔍 DEBUG - Valor de widthRaw inválido para ${component.id}: ${component._imageSettings.widthRaw}`);
                            }
                          } else if (component._imageSettings.width !== undefined) {
                            // Fallback a ancho porcentual si no hay dimensión exacta
                            const width = component._imageSettings.width > 0 ? component._imageSettings.width : 100;
                            component.style[device].width = `${width}px`;
                            component.style[device]._customDimensions.width = width;
                            console.log(`🔄 Usando ancho aproximado: ${width}px para ${component.id}`);
                            console.log(`🔍 DEBUG - Valor width original: ${component._imageSettings.width}, convertido a: ${width}px para ${component.id}`);
                          }
                          
                          // Preferir dimensiones exactas en píxeles si están disponibles
                          if (component._imageSettings.heightRaw !== undefined) {
                            const height = parseInt(component._imageSettings.heightRaw);
                            if (!isNaN(height) && height > 0) {
                              component.style[device].height = `${height}px`;
                              component.style[device]._customDimensions.height = height;
                              console.log(`🔄 Usando alto en píxeles exacto: ${height}px para ${component.id}`);
                              console.log(`🔍 DEBUG - Valor heightRaw original: ${component._imageSettings.heightRaw}, convertido a: ${height}px para ${component.id}`);
                            } else {
                              console.log(`🔍 DEBUG - Valor de heightRaw inválido para ${component.id}: ${component._imageSettings.heightRaw}`);
                            }
                          } else if (component._imageSettings.height !== undefined) {
                            // Fallback a alto porcentual si no hay dimensión exacta
                            const height = component._imageSettings.height > 0 ? component._imageSettings.height : 100;
                            component.style[device].height = `${height}px`;
                            component.style[device]._customDimensions.height = height;
                            console.log(`🔄 Usando alto aproximado: ${height}px para ${component.id}`);
                            console.log(`🔍 DEBUG - Valor height original: ${component._imageSettings.height}, convertido a: ${height}px para ${component.id}`);
                          }
                        }
                        
                        // Aplicar object-fit y object-position si existen
                        if (component._imageSettings.objectFit) {
                          component.style[device].objectFit = component._imageSettings.objectFit;
                        }
                        if (component._imageSettings.objectPosition) {
                          component.style[device].objectPosition = component._imageSettings.objectPosition;
                        }
                      }
                    });
                  }
                } catch (dirError) {
                  console.error(`❌ Error al crear directorio o copiar archivo: ${dirError.message}`);
                }
              } else {
                console.warn(`⚠️ No se encontró archivo para componente ${component.id} con referencia ${imageId}`);
              }
            }
            
            // Limpiar propiedades temporales
            delete component._tempFile;
            delete component._imageFile;
            
            // Limpiar también en estilos
            if (component.style) {
              Object.keys(component.style).forEach(device => {
                if (component.style[device]) {
                  delete component.style[device]._tempFile;
                  delete component.style[device]._previewUrl;
                }
              });
            }
            
            // Procesar hijos recursivamente
            if (component.children && Array.isArray(component.children)) {
              component.children = processComponents(component.children);
            }
            
            return component;
          });
        };
        
        // Procesar componentes recursivamente
        templateData.components = processComponents(templateData.components);
      }
      
      // 6. Procesar y validar componentes
      console.log('🔧 Procesando componentes del template');
      
      // Validar estructura del banner antes de procesarlo
      const validationResult = componentProcessor.validateBannerStructure(templateData);
      if (!validationResult.isValid) {
        console.error('❌ Errores de validación:', validationResult.errors);
        return res.status(400).json({
          status: 'error',
          message: 'Banner structure validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }
      
      // Log antes del procesamiento en CREATE
      console.log('🔍 ANTES de componentProcessor.processComponents en CREATE:');
      if (templateData.components) {
        templateData.components.forEach(comp => {
          if (comp.type === 'container') {
            console.log(`  Contenedor ${comp.id}:`, {
              hasContainerConfig: !!comp.containerConfig,
              containerConfig: comp.containerConfig,
              childrenCount: comp.children?.length || 0
            });
          }
        });
      }
      
      // Procesar componentes para optimizar estructura y anidamiento
      if (templateData.components && Array.isArray(templateData.components)) {
        const processedComponents = componentProcessor.processComponents(templateData.components);
        
        // Log después del procesamiento en CREATE
        console.log('🔍 DESPUÉS de componentProcessor.processComponents en CREATE:');
        processedComponents.forEach(comp => {
          if (comp.type === 'container') {
            console.log(`  Contenedor ${comp.id}:`, {
              hasContainerConfig: !!comp.containerConfig,
              containerConfig: comp.containerConfig,
              childrenCount: comp.children?.length || 0
            });
          }
        });
        
        templateData.components = processedComponents;
        console.log(`✅ Procesados ${processedComponents.length} componentes`);
      }
      
      // 7. Guardar la plantilla en la base de datos
      console.log('💾 Guardando template en la base de datos');
      
      // Determinar el tipo de plantilla basado en permisos y solicitud del usuario
      let templateType = 'custom';
      let templateMetadata = {
        ...(templateData.metadata || {}),
        createdBy: userId,
        lastModifiedBy: userId,
        version: 1,
        isPublic: false
      };
      
      // Si es owner y solicita crear plantilla del sistema
      if (req.isOwner && (templateData.type === 'system' || templateData.isSystemTemplate)) {
        console.log('✅ CREANDO BANNER DE SISTEMA');
        console.log('- templateData.type:', templateData.type);
        console.log('- templateData.isSystemTemplate:', templateData.isSystemTemplate);
        templateType = 'system';
        templateMetadata.isPublic = true; // Siempre público para system templates
        templateMetadata.category = templateData.metadata?.category || 'basic';
        targetClientId = null; // No clientId para plantillas del sistema
        console.log('- templateType final:', templateType);
        console.log('- targetClientId final:', targetClientId);
      } else {
        console.log('❌ NO es banner de sistema:');
        console.log('- req.isOwner:', req.isOwner);
        console.log('- templateData.type:', templateData.type);
        console.log('- templateData.isSystemTemplate:', templateData.isSystemTemplate);
      }
      
      // Establecer metadata y asegurar que no hay _id duplicado
      const templateWithMetadata = {
        ...templateData,
        type: templateType,
        metadata: templateMetadata
      };
      
      // IMPORTANTE: Eliminar _id si existe para evitar duplicate key error
      // MongoDB debe generar el _id automáticamente
      if (templateWithMetadata._id) {
        console.log(`⚠️ Removiendo _id existente del template: ${templateWithMetadata._id}`);
        delete templateWithMetadata._id;
      }
      
      // Solo agregar clientId si no es plantilla del sistema
      if (targetClientId) {
        templateWithMetadata.clientId = targetClientId;
      }
      
      // DEBUG: Ver qué se va a guardar
      console.log('💾 DATOS A GUARDAR:');
      console.log('- type:', templateWithMetadata.type);
      console.log('- clientId:', templateWithMetadata.clientId);
      console.log('- metadata.isPublic:', templateWithMetadata.metadata.isPublic);
      console.log('- metadata.category:', templateWithMetadata.metadata.category);
      
      const createdTemplate = await BannerTemplate.create(templateWithMetadata);
      console.log(`✅ Template creado con ID: ${createdTemplate._id}`);
      
      // 8. Eliminar archivos temporales
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            await fs.unlink(file.path);
            console.log(`🗑️ Eliminado archivo temporal: ${file.path}`);
          } catch (error) {
            console.warn(`⚠️ No se pudo eliminar archivo temporal ${file.path}: ${error.message}`);
          }
        }
      }
      
      // 8. Poblar información del cliente para owners
      let result;
      if (req.isOwner) {
        result = await BannerTemplate.findById(createdTemplate._id)
          .populate('clientId', 'name email status');
      } else {
        result = createdTemplate;
      }
      
      // 9. Responder con éxito
      res.status(201).json({
        status: 'success',
        message: 'Template created successfully',
        data: { template: result }
      });
      
    } catch (error) {
      console.error('❌ Error creating template:', error);
      
      // Intentar limpiar archivos temporales en caso de error
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (err) { /* ignorar errores de limpieza */ }
        }
      }
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Error creating template',
        errors: error.errors || []
      });
    }
  };
  

  // Clonar plantilla
  cloneTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, customizations } = req.body;
    const { clientId, userId } = req;

    console.log(`🔍 DEBUG - Clonado: Iniciando clonación de template ${id} para cliente ${clientId}`);
    console.log(`🔍 DEBUG - Clonado: Customizaciones recibidas:`, customizations ? 'Sí' : 'No');

    const count = await BannerTemplate.countDocuments({
      clientId,
      type: 'custom',
      status: { $ne: 'archived' }
    });
    const maxTemplates = 10;
    if (count >= maxTemplates) {
      throw new AppError('Maximum number of templates reached', 400);
    }

    const sourceTemplate = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });

    if (!sourceTemplate) {
      throw new AppError('Template not found', 404);
    }

    console.log(`🔍 DEBUG - Clonado: Template fuente encontrado: ${sourceTemplate._id}, tiene ${sourceTemplate.components?.length || 0} componentes`);
    
    // Contar componentes de imagen
    const imageComponents = sourceTemplate.components?.filter(c => c.type === 'image') || [];
    console.log(`🔍 DEBUG - Clonado: Template tiene ${imageComponents.length} componentes de imagen`);
    
    // Imprimir detalles de componentes de imagen
    imageComponents.forEach((comp, index) => {
      console.log(`🔍 DEBUG - Clonado: Imagen ${index+1} - ID: ${comp.id}, content: ${typeof comp.content === 'string' ? (comp.content.substring(0, 30) + '...') : 'objeto'}`);
      
      // Verificar si tiene configuraciones de imagen
      if (comp._imageSettings) {
        console.log(`🔍 DEBUG - Clonado: Imagen ${index+1} tiene configuraciones de imagen:`, comp._imageSettings);
      }
      
      // Verificar estilos por dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (comp.style && comp.style[device]) {
          console.log(`🔍 DEBUG - Clonado: Imagen ${index+1} estilo ${device}:`, 
            `width=${comp.style[device].width}, height=${comp.style[device].height}, ` +
            `left=${comp.style[device].left}, top=${comp.style[device].top}`);
        }
      });
    });

    const cloneData = sourceTemplate.toObject();
    delete cloneData._id;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;

    cloneData.name = name || 'Clon de plantilla';
    cloneData.clientId = clientId;
    cloneData.type = 'custom';
    cloneData.metadata = {
      createdBy: userId,
      lastModifiedBy: userId,
      version: 1,
      isPublic: false,
      category: 'custom',
      clonedFrom: id // Guardar referencia al template original
    };

    // Procesar y asegurar que todas las configuraciones de imagen se preserven
    if (cloneData.components) {
      // Preservar explícitamente configuraciones de imagen para todos los componentes
      cloneData.components = this._preserveImageSettings(cloneData.components);
      console.log(`🔍 DEBUG - Clonado: Se preservaron configuraciones de imagen en ${cloneData.components.length} componentes`);
    }

    // Aplicar customizaciones adicionales si se proporcionaron
    if (customizations) {
      console.log(`🔍 DEBUG - Clonado: Aplicando customizaciones a los componentes`);
      cloneData.components = this._applyCustomizations(
        cloneData.components,
        customizations
      );
    }

    // IMPORTANTE: Eliminar _id si existe para evitar duplicate key error
    // MongoDB debe generar el _id automáticamente
    if (cloneData._id) {
      console.log(`⚠️ Removiendo _id existente del template clonado: ${cloneData._id}`);
      delete cloneData._id;
    }
    
    console.log(`🔍 DEBUG - Clonado: Creando nuevo template basado en ${id}`);
    const cloned = await BannerTemplate.create(cloneData);

    res.status(201).json({
      status: 'success',
      data: { template: cloned }
    });
  });

  // Actualizar plantilla
  // Actualizar plantilla
  updateTemplate = async (req, res) => {
    try {
      const { id } = req.params;
      const { clientId, userId } = req;
      
      console.log(`🔄 Actualizando template con ID: ${id}`);
      console.log('📦 Content-Type:', req.headers['content-type']);
      
      // 1. Detectar si tenemos un formulario multipart
      const isMultipart = req.headers['content-type'] && 
                          req.headers['content-type'].startsWith('multipart/form-data');
      
      console.log(`📄 Tipo de solicitud: ${isMultipart ? 'Multipart con archivos' : 'JSON simple'}`);
      
      // 2. Extraer datos del template
      let updates;
      
      if (isMultipart) {
        // Para solicitudes multipart/form-data
        if (!req.body.template) {
          return res.status(400).json({
            status: 'error',
            message: 'Falta el campo "template" en el formulario'
          });
        }
        
        // Convertir string JSON a objeto
        try {
          updates = JSON.parse(req.body.template);
          console.log('📄 Updates parseados desde FormData');
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: 'Error al parsear datos del template',
            details: error.message
          });
        }
      } else {
        // Para solicitudes JSON normales
        updates = req.body;
      }
      
      // 3. Buscar el template existente (permitir que owners editen plantillas del sistema)
      let query;
      if (req.isOwner) {
        // Para owners, permitir editar cualquier plantilla (custom o system)
        console.log('🔑 Usuario owner editando plantilla: puede editar cualquier tipo');
        query = { _id: id };
      } else {
        // Para usuarios regulares, solo permitir editar plantillas custom de su cliente
        console.log('👤 Usuario regular editando plantilla: solo puede editar tipo custom de su cliente');
        query = {
          _id: id,
          clientId,
          type: 'custom'
        };
      }
      
      const existingTemplate = await BannerTemplate.findOne(query);
      
      if (!existingTemplate) {
        return res.status(404).json({
          status: 'error',
          message: 'Template not found or you don\'t have permission to edit it'
        });
      }
      
      // 4. Verificar archivos subidos por multer
      const uploadedFiles = req.files || [];
      console.log(`🖼️ Archivos recibidos: ${uploadedFiles.length}`);
      
      // NUEVO: Verificar si alguno de los archivos subidos es un placeholder vacío y eliminarlo
      const validFiles = uploadedFiles.filter(file => {
        if (file.size < 50 && file.originalname === 'placeholder.jpg') {
          console.log(`⚠️ Detectado archivo placeholder, ignorando: ${file.originalname}`);
          return false;
        }
        return true;
      });
      
      if (validFiles.length < uploadedFiles.length) {
        console.log(`🧹 Filtrados ${uploadedFiles.length - validFiles.length} archivos placeholder`);
      }
      
      // Mostrar detalles de cada archivo válido
      validFiles.forEach((file, i) => {
        console.log(`📄 Archivo ${i+1}:`, {
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
      
      // 5. Procesar y validar componentes
      console.log('🔧 Procesando componentes del template para actualización');
      
      if (updates.components && Array.isArray(updates.components)) {
        // Validar estructura del banner antes de procesarlo
        const validationResult = componentProcessor.validateBannerStructure(updates);
        if (!validationResult.isValid) {
          console.error('❌ Errores de validación:', validationResult.errors);
          return res.status(400).json({
            status: 'error',
            message: 'Banner structure validation failed',
            errors: validationResult.errors,
            warnings: validationResult.warnings
          });
        }
        
        // Normalizar posiciones a porcentajes
        updates.components = bannerValidator.normalizePositions(updates.components);
        
        // IMPORTANTE: Procesar imágenes en los componentes
        if (isMultipart && validFiles.length > 0) {
          console.log("🖼️ SERVIDOR: Procesando imágenes para componentes...");
          
          // Función recursiva para contar componentes de imagen (incluye hijos)
          const countImageComponents = (components) => {
            let count = 0;
            if (!components || !Array.isArray(components)) return count;
            
            components.forEach(comp => {
              if (comp.type === 'image') {
                count++;
              }
              // Buscar también en hijos si es contenedor
              if (comp.children && Array.isArray(comp.children)) {
                count += countImageComponents(comp.children);
              }
            });
            
            return count;
          };
          
          const imageCount = countImageComponents(updates.components);
          console.log(`📊 SERVIDOR: Encontrados ${imageCount} componentes de tipo imagen (incluyendo hijos en contenedores)`);
          
          // NUEVO: Intentar asociar cada archivo con un componente de imagen
          // Fase 1: Crear un mapa de archivos para cada componente
          const componentFileMap = new Map();
          
          // Extraer patrones de ID de cada archivo
          validFiles.forEach(file => {
            // Intentar diferentes patrones para asociar archivos a componentes
            const patterns = [];
            
            // Patrón 1: IMAGE_REF_componentId_ (patrón más explícito desde el cliente)
            // Busca tanto comp-XXX como image_XXX
            const imageRefMatch = file.originalname.match(/IMAGE_REF_((comp-[^_]+)|(image_[^_]+))_/);
            if (imageRefMatch && imageRefMatch[1]) {
              patterns.push({
                type: 'exact',
                componentId: imageRefMatch[1],
                confidence: 0.9
              });
            }
            
            // Patrón 2: Cualquier parte del nombre incluye el ID del componente
            // Busca comp-XXX o image_XXX
            const compIdMatch = file.originalname.match(/(comp-[0-9]+)|(image_[0-9]+)/);
            if (compIdMatch) {
              patterns.push({
                type: 'partial',
                componentId: compIdMatch[0],
                confidence: 0.7
              });
            }
            
            // Patrón 3: Si no hay patrones claros, valor nulo para asignar manualmente después
            if (patterns.length === 0) {
              patterns.push({
                type: 'unknown',
                componentId: null,
                confidence: 0.1
              });
            }
            
            // Ordenar patrones por confianza (mayor primero)
            patterns.sort((a, b) => b.confidence - a.confidence);
            
            // Guardar en el mapa de archivos
            if (patterns[0].componentId) {
              // Si ya existe una entrada para este componente, agregar este archivo
              if (componentFileMap.has(patterns[0].componentId)) {
                componentFileMap.get(patterns[0].componentId).push({
                  file,
                  confidence: patterns[0].confidence,
                  patternType: patterns[0].type
                });
              } else {
                // Si no existe, crear nueva entrada
                componentFileMap.set(patterns[0].componentId, [{
                  file,
                  confidence: patterns[0].confidence,
                  patternType: patterns[0].type
                }]);
              }
              
              console.log(`📎 SERVIDOR: Archivo ${file.originalname} asociado a componente ${patterns[0].componentId} (confianza: ${patterns[0].confidence})`);
            } else {
              console.log(`⚠️ SERVIDOR: No se pudo asociar archivo ${file.originalname} a ningún componente`);
            }
          });
          
          console.log(`🗂️ SERVIDOR: Mapa de archivos creado para ${componentFileMap.size} componentes`);
          
          // Fase 2: Procesar cada componente de imagen (función recursiva)
          const processImageComponents = async (components, parentPath = '') => {
            if (!components || !Array.isArray(components)) return;
            
            for (const comp of components) {
              if (comp.type === 'image') {
              console.log(`\n🔍 SERVIDOR: Procesando componente imagen SIMPLE: ${comp.id}`);
              
              // ARREGLADO: Buscar archivo usando el mapa de componentes creado anteriormente
              let fileToUse = null;
              
              // Buscar archivo para este componente en el mapa
              if (componentFileMap.has(comp.id)) {
                const filesForComponent = componentFileMap.get(comp.id);
                if (filesForComponent && filesForComponent.length > 0) {
                  // Usar el archivo con mayor confianza
                  const bestFile = filesForComponent.sort((a, b) => b.confidence - a.confidence)[0];
                  fileToUse = bestFile.file;
                  console.log(`✅ SERVIDOR: Archivo encontrado para componente ${comp.id}: ${fileToUse.originalname} (confianza: ${bestFile.confidence})`);
                }
              }
              
              // RESPALDO: Si no se encuentra en el mapa, buscar por inclusión simple del ID
              if (!fileToUse) {
                const fileIndex = validFiles.findIndex(file => file.originalname.includes(comp.id));
                if (fileIndex >= 0) {
                  fileToUse = validFiles.splice(fileIndex, 1)[0];
                  console.log(`✅ SERVIDOR: Archivo encontrado por búsqueda simple para ${comp.id}: ${fileToUse.originalname}`);
                }
              }
              
              // ÚLTIMO RESPALDO: Si el componente tiene referencia temporal, buscar por esa referencia
              if (!fileToUse && comp.content && typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__')) {
                const imageId = comp.content.replace('__IMAGE_REF__', '');
                const fileIndex = validFiles.findIndex(file => 
                  file.originalname.includes(`IMAGE_REF_${imageId}_`) || 
                  file.originalname.includes(imageId)
                );
                if (fileIndex >= 0) {
                  fileToUse = validFiles.splice(fileIndex, 1)[0];
                  console.log(`✅ SERVIDOR: Archivo encontrado por referencia temporal para ${comp.id}: ${fileToUse.originalname}`);
                }
              }
              
              if (!fileToUse) {
                console.log(`⚠️ SERVIDOR: No se encontró archivo para componente ${comp.id}`);
                continue;
              }
              
              try {
                // Crear directorio y guardar el archivo
                  const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', id);
                  await fs.mkdir(bannerDir, { recursive: true });
                  
                  // Generar nombre único y guardar archivo
                  const timestamp = Date.now();
                  const extension = path.extname(fileToUse.originalname) || '.jpg';
                  const fileName = `img_${comp.id}_${timestamp}${extension}`;
                  const destPath = path.join(bannerDir, fileName);
                  
                  // Verificar que el archivo temporal existe y tiene tamaño
                  try {
                    const stats = await fs.stat(fileToUse.path);
                    console.log(`📊 SERVIDOR: Archivo a procesar: ${fileToUse.path} (${stats.size} bytes)`);
                    
                    if (stats.size === 0) {
                      console.error(`❌ SERVIDOR: El archivo está vacío: ${fileToUse.path}`);
                      continue;
                    }
                  } catch (statErr) {
                    console.error(`❌ SERVIDOR: No se puede acceder al archivo: ${statErr.message}`);
                    continue;
                  }
                  
                  // Leer y escribir el archivo de forma segura
                  const data = await fs.readFile(fileToUse.path);
                  await fs.writeFile(destPath, data);
                  
                  // Verificar que se guardó correctamente
                  try {
                    const stats = await fs.stat(destPath);
                    console.log(`✅ SERVIDOR: Archivo guardado: ${destPath} (${stats.size} bytes)`);
                    
                    if (stats.size === 0) {
                      throw new Error('El archivo guardado está vacío');
                    }
                  } catch (statErr) {
                    console.error(`❌ SERVIDOR: Error verificando archivo guardado: ${statErr.message}`);
                    continue;
                  }
                  
                  // Usar ambas URLs para diagnóstico
                  const templateUrl = `/templates/images/${id}/${fileName}`;
                  const directUrl = `/direct-image/${id}/${fileName}`;
                  
                  // AHORA USAMOS LA URL DE TEMPLATE - esto debería funcionar si express.static está configurado correctamente
                  comp.content = templateUrl;
                  
                  console.log(`✅ SERVIDOR: Componente ${comp.id} actualizado con URL: ${templateUrl}`);
                  console.log(`🔍 DEBUG - Componente de imagen actualizado ${comp.id}:`, {
                    content: templateUrl,
                    imageSettings: comp._imageSettings ? {
                      position: comp._imageSettings.position,
                      width: comp._imageSettings.width,
                      height: comp._imageSettings.height,
                      widthRaw: comp._imageSettings.widthRaw,
                      heightRaw: comp._imageSettings.heightRaw
                    } : 'no hay imageSettings'
                  });
                  console.log(`ℹ️ SERVIDOR: URL alternativa (no usada): ${directUrl}`);
                  
                  // Limpiar propiedades temporales
                  delete comp._tempFile;
                  delete comp._imageFile;
                  delete comp._tempPath;
                  
                  // Intentar eliminar el archivo temporal
                  try {
                    await fs.unlink(fileToUse.path);
                    console.log(`🗑️ SERVIDOR: Archivo temporal eliminado: ${fileToUse.path}`);
                  } catch (err) {
                    console.warn(`⚠️ SERVIDOR: No se pudo eliminar archivo temporal: ${err.message}`);
                  }
                } catch (error) {
                  console.error(`❌ SERVIDOR: Error procesando imagen: ${error.message}`);
                }
            }
            
            // Procesar hijos recursivamente si es contenedor
            if (comp.type === 'container' && comp.children && Array.isArray(comp.children)) {
              console.log(`📦 SERVIDOR: Procesando ${comp.children.length} hijos del contenedor ${comp.id}`);
              await processImageComponents(comp.children, `${parentPath}${comp.id}/`);
            }
          }
        };
        
        // Iniciar el procesamiento recursivo
        await processImageComponents(updates.components);
      }
        
        // Log antes del procesamiento
        console.log('🔍 ANTES de componentProcessor.processComponents:');
        updates.components.forEach(comp => {
          if (comp.type === 'container') {
            console.log(`  Contenedor ${comp.id}:`, {
              hasContainerConfig: !!comp.containerConfig,
              containerConfig: comp.containerConfig,
              childrenCount: comp.children?.length || 0
            });
          }
        });
        
        // Log ESPECÍFICO para verificar tamaños en píxeles RECIBIDOS
        console.log('🔍 SERVIDOR: VERIFICACIÓN DE TAMAÑOS EN PÍXELES RECIBIDOS:');
        const findAllComponentsServer = (components, parentPath = '') => {
          components.forEach(comp => {
            if (comp.style?.desktop) {
              const style = comp.style.desktop;
              if (style.width || style.height) {
                console.log(`  ${parentPath}${comp.id} (${comp.type}):`, {
                  width: style.width,
                  height: style.height,
                  widthType: typeof style.width,
                  heightType: typeof style.height,
                  hasPixels: (style.width && style.width.includes('px')) || (style.height && style.height.includes('px'))
                });
              }
            }
            if (comp.children?.length > 0) {
              findAllComponentsServer(comp.children, `${parentPath}${comp.id}/`);
            }
          });
        };
        findAllComponentsServer(updates.components);
        
        // Procesar componentes para optimizar estructura y anidamiento
        const processedComponents = componentProcessor.processComponents(updates.components);
        
        // Log después del procesamiento
        console.log('🔍 DESPUÉS de componentProcessor.processComponents:');
        processedComponents.forEach(comp => {
          if (comp.type === 'container') {
            console.log(`  Contenedor ${comp.id}:`, {
              hasContainerConfig: !!comp.containerConfig,
              containerConfig: comp.containerConfig,
              childrenCount: comp.children?.length || 0
            });
          }
        });
        
        // Log ESPECÍFICO para verificar tamaños en píxeles DESPUÉS DEL PROCESAMIENTO
        console.log('🔍 SERVIDOR: VERIFICACIÓN DE TAMAÑOS EN PÍXELES DESPUÉS DEL PROCESAMIENTO:');
        findAllComponentsServer(processedComponents);
        
        updates.components = processedComponents;
        console.log(`✅ Procesados ${processedComponents.length} componentes`);
      }
      
      // 6. Actualizar la plantilla en la base de datos
      console.log('💾 Actualizando template en la base de datos');
      
      // Preparar actualización
      let updateData;
  
      if ('metadata' in updates) {
        // Client is trying to update the entire metadata object
        updates.metadata = {
          ...updates.metadata,
          lastModifiedBy: userId,
          version: (existingTemplate.metadata.version || 0) + 1
        };
        updateData = { ...updates };
      } else {
        // Client is not updating metadata, use dot notation
        updateData = {
          ...updates,
          'metadata.lastModifiedBy': userId,
          'metadata.version': (existingTemplate.metadata.version || 0) + 1
        };
      }
      
      // Eliminar campos que no deben actualizarse (PERO NO clientId todavía)
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      // DEBUG: Logs para entender qué está pasando
      console.log('🔍 DEBUG - Estado antes de manejar tipos:');
      console.log('- req.isOwner:', req.isOwner);
      console.log('- updates.type:', updates.type);
      console.log('- updates.isSystemTemplate:', updates.isSystemTemplate);
      console.log('- existingTemplate.type:', existingTemplate.type);
      console.log('- existingTemplate.clientId:', existingTemplate.clientId);
      console.log('- updateData keys:', Object.keys(updateData));
      
      // IMPORTANTE: Manejar cambios de tipo solo para owners
      if (req.isOwner) {
        // Los owners pueden cambiar el tipo de plantilla
        if (updates.type === 'system' || updates.isSystemTemplate) {
          console.log('✅ CONVIRTIENDO A BANNER DE SISTEMA');
          updateData.type = 'system';
          updateData.clientId = null;
          
          // Manejar metadata según cómo se construyó updateData
          if ('metadata' in updates) {
            updateData.metadata.isPublic = true;
            updateData.metadata.category = updateData.metadata.category || 'basic';
          } else {
            updateData['metadata.isPublic'] = true;
            updateData['metadata.category'] = existingTemplate.metadata?.category || 'basic';
          }
        } else if (updates.type === 'custom') {
          console.log('✅ CONVIRTIENDO A BANNER PERSONALIZADO');
          updateData.type = 'custom';
          updateData.clientId = clientId; // Asignar clientId del owner
        } else {
          // No hay cambio de tipo, mantener como está
          delete updateData.type;
          delete updateData.clientId;
        }
      } else {
        // Usuarios normales no pueden cambiar tipos
        delete updateData.type;
        delete updateData.clientId;
      }
      
      // DEBUG: Ver estado final de updateData
      console.log('🔍 DEBUG - Estado final de updateData:');
      console.log('- updateData.type:', updateData.type);
      console.log('- updateData.clientId:', updateData.clientId);
      console.log('- updateData keys:', Object.keys(updateData));
      if (updateData.metadata) {
        console.log('- updateData.metadata:', updateData.metadata);
      }
      
      // NOTA: Los componentes ya fueron procesados anteriormente, no procesarlos de nuevo
      
      const updatedTemplate = await BannerTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      console.log(`✅ Template actualizado: ${updatedTemplate._id}`);
      
      // 7. Eliminar archivos temporales DESPUÉS de guardar (mejorado)
      if (uploadedFiles.length > 0) {
        console.log(`🧹 CLEANUP: Iniciando limpieza de ${uploadedFiles.length} archivos temporales...`);
        
        for (const file of uploadedFiles) {
          try {
            // Mostrar información del archivo antes de intentar borrarlo
            try {
              const stats = await fs.stat(file.path);
              console.log(`📄 CLEANUP: Archivo temporal a eliminar: ${file.path} (${stats.size} bytes)`);
            } catch (statErr) {
              console.warn(`⚠️ CLEANUP: No se pudo verificar archivo temporal: ${file.path}`);
            }
            
            // Intentar eliminar el archivo
            await fs.unlink(file.path);
            console.log(`✅ CLEANUP: Eliminado archivo temporal: ${file.path}`);
          } catch (error) {
            console.warn(`⚠️ CLEANUP: No se pudo eliminar archivo temporal ${file.path}: ${error.message}`);
            
            // Intentar con fs normal como backup
            try {
              require('fs').unlinkSync(file.path);
              console.log(`✅ CLEANUP: Eliminado archivo temporal (sync): ${file.path}`);
            } catch (syncErr) {
              console.error(`❌ CLEANUP: Fallo permanente al eliminar archivo: ${syncErr.message}`);
            }
          }
        }
        
        console.log(`🧹 CLEANUP: Limpieza de archivos temporales completada`);
      } else {
        console.log(`ℹ️ CLEANUP: No hay archivos temporales para limpiar`);
      }
      
      // 8. Limpiar imágenes no utilizadas SOLO si no se han subido imágenes nuevas
      if (validFiles.length === 0 && req.query.cleanup === 'true') {
        try {
          const imageProcessorService = require('../services/imageProcessor.service');
          console.log('🧹 Iniciando limpieza de imágenes no utilizadas...');
          
          const cleanupResult = await imageProcessorService.cleanupUnusedImages(
            id, 
            updatedTemplate.components,
            { type: updatedTemplate.type, status: updatedTemplate.status }
          );
          
          if (cleanupResult.success) {
            console.log(`✅ Limpieza de imágenes completada: ${cleanupResult.deleted} eliminadas, ${cleanupResult.kept} mantenidas`);
          } else {
            console.error('❌ Error en limpieza de imágenes:', cleanupResult.error);
          }
        } catch (cleanupError) {
          console.error('❌ Error ejecutando limpieza de imágenes:', cleanupError);
          // No interrumpir el flujo principal si falla la limpieza
        }
      } else {
        console.log('ℹ️ Omitiendo limpieza automática de imágenes porque se subieron nuevas imágenes');
      }
      
      // 8. Responder con éxito
      res.status(200).json({
        status: 'success',
        message: 'Template updated successfully',
        data: { template: updatedTemplate }
      });
      
    } catch (error) {
      console.error('❌ Error updating template:', error);
      
      // Intentar limpiar archivos temporales en caso de error
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (err) { /* ignorar errores de limpieza */ }
        }
      }
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Error updating template',
        errors: error.errors || []
      });
    }
  };
  // Previsualizar plantilla
  previewTemplate = catchAsync(async (req, res) => {
    const { config } = req.body;
    const { domainId } = req.query;

    // Normalizar posiciones a porcentajes
    if (config.components && Array.isArray(config.components)) {
      config.components = bannerValidator.normalizePositions(config.components);
    }

    // Validar config
    const validation = bannerValidator.validateBannerConfig(config);
    if (!validation.isValid) {
      throw new AppError(
        `Invalid banner configuration: ${validation.errors.join(', ')}`,
        400
      );
    }

    // Si hay domainId, buscar settings en Domain
    let domainConfig = {};
    if (domainId) {
      const domain = await Domain.findById(domainId);
      if (domain) {
        domainConfig = domain.settings || {};
      }
    }

    // Generar HTML y CSS
    const html = await bannerGenerator.generateHTML(config);
    const css = await bannerGenerator.generateCSS(config);

    const preview = {
      html,
      css,
      config: {
        ...config,
        domain: domainConfig
      }
    };

    res.status(200).json({
      status: 'success',
      data: { preview }
    });
  });

  // Archivar plantilla
  archiveTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId, userId } = req;

    const templ = await BannerTemplate.findOneAndUpdate(
      {
        _id: id,
        clientId,
        type: 'custom'
      },
      {
        status: 'archived',
        'metadata.lastModifiedBy': userId
      },
      { new: true }
    );

    if (!templ) {
      throw new AppError('Template not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Template archived successfully'
    });
  });

  // Exportar configuración
  exportConfig = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const { clientId } = req;

    const template = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    let exportData;
    switch (format) {
      case 'json':
        exportData = template.exportConfig();
        break;
      case 'html':
        exportData = await bannerGenerator.generateHTML(template.toObject());
        break;
      default:
        throw new AppError('Unsupported export format', 400);
    }

    res.status(200).json({
      status: 'success',
      data: {
        config: exportData,
        format
      }
    });
  });

  // Obtener versiones de la plantilla
  getTemplateVersions = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { limit = 10 } = req.query;

    const template = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const versions = await Audit.find({
      resourceType: 'template',
      resourceId: id
    })
      .sort({ 'metadata.version': -1 })
      .limit(parseInt(limit, 10))
      .select('changes metadata timestamp');

    res.status(200).json({
      status: 'success',
      data: {
        currentVersion: template.metadata.version,
        versions
      }
    });
  });

  // Restaurar versión
  restoreVersion = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { version } = req.body;
    const { clientId, userId } = req;

    const template = await BannerTemplate.findOne({
      _id: id,
      clientId,
      type: 'custom'
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Buscar en la colección Audit la versión solicitada
    const versionData = await Audit.findOne({
      resourceType: 'template',
      resourceId: id,
      'metadata.version': version
    });

    if (!versionData) {
      throw new AppError('Version not found', 404);
    }

    const restored = {
      ...versionData.changes.reduce((acc, change) => {
        if (change.oldValue) {
          acc[change.field] = change.oldValue;
        }
        return acc;
      }, {}),
      metadata: {
        ...template.metadata,
        lastModifiedBy: userId,
        version: template.metadata.version + 1,
        restoredFrom: version
      }
    };

    const updated = await BannerTemplate.findByIdAndUpdate(id, restored, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      data: { template: updated }
    });
  });

  // Probar plantilla
  testTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { testConfig } = req.body;
    const { clientId } = req;

    const template = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Normalizar posiciones en el config de prueba
    if (testConfig.components && Array.isArray(testConfig.components)) {
      testConfig.components = bannerValidator.normalizePositions(testConfig.components);
    }

    const merged = {
      ...template.toObject(),
      ...testConfig
    };

    const validation = bannerValidator.validateBannerConfig(merged);
    if (!validation.isValid) {
      throw new AppError(
        `Invalid test configuration: ${validation.errors.join(', ')}`,
        400
      );
    }

    const html = await bannerGenerator.generateHTML(merged);
    const css = await bannerGenerator.generateCSS(merged);

    res.status(200).json({
      status: 'success',
      data: {
        preview: {
          html,
          css,
          config: merged
        }
      }
    });
  });

  // Eliminar plantilla (archivarla)
  deleteTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId, userId } = req;
    const { permanentDelete } = req.query;

    const template = await BannerTemplate.findOne({
      _id: id,
      clientId,
      type: 'custom'
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Si permanentDelete es true, eliminar permanentemente
    if (permanentDelete === 'true') {
      console.log(`🗑️ Eliminando permanentemente la plantilla: ${id}`);
      
      // Eliminar la plantilla de la base de datos
      await BannerTemplate.findByIdAndDelete(id);
      
      res.status(200).json({
        status: 'success',
        message: 'Template permanently deleted successfully'
      });
    } 
    // De lo contrario, archivar (comportamiento original)
    else {
      template.status = 'archived';
      template.metadata.lastModifiedBy = userId;
      await template.save();

      res.status(200).json({
        status: 'success',
        message: 'Template deleted (archived) successfully'
      });
    }
  });

  uploadBannerImage = catchAsync(async (req, res) => {
    const { bannerId } = req.params;
    const { componentId } = req.body;
    
    if (!req.file) {
      throw new AppError('No se subió ninguna imagen', 400);
    }
  
    // Buscar el banner
    const template = await BannerTemplate.findOne({
      _id: bannerId,
      clientId: req.clientId
    });
  
    if (!template) {
      // Eliminar el archivo subido
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error al eliminar archivo:', err);
      });
      throw new AppError('Banner no encontrado', 404);
    }
  
    // Crear la URL relativa
    const imageUrl = `/templates/data/${bannerId}/${req.file.filename}`;
  
    // Si se proporcionó un componentId, actualizar ese componente específico
    if (componentId) {
      // Encuentra el componente que necesita actualizarse
      let componentUpdated = false;
  
      // Función recursiva para buscar y actualizar el componente
      const updateComponentImage = (components) => {
        return components.map(comp => {
          if (comp.id === componentId) {
            componentUpdated = true;
            return {
              ...comp,
              content: imageUrl
            };
          }
          // Si tiene hijos, buscar también allí
          if (comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: updateComponentImage(comp.children)
            };
          }
          return comp;
        });
      };
  
      template.components = updateComponentImage(template.components);
  
      if (!componentUpdated) {
        // Si no se encontró el componente, eliminar la imagen
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error al eliminar archivo:', err);
        });
        throw new AppError('Componente no encontrado', 404);
      }
  
      // Guardar el template actualizado
      await template.save();
    }
  
    // Responder con la URL de la imagen
    res.status(200).json({
      status: 'success',
      data: {
        imageUrl: imageUrl,
        file: req.file
      }
    });
  });

  // MÉTODOS AUXILIARES

  /**
   * Validar componentes requeridos (ej: accept_all)
   */
  _validateRequiredComponents(components) {
    // Puedes expandir el array si necesitas más acciones obligatorias
    const requiredTypes = ['accept_all']; 
    const found = components
      .filter(c => c.action?.type)
      .map(c => c.action.type);

    const missing = requiredTypes.filter(t => !found.includes(t));
    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Aplica customizaciones durante el clonado
   */
  /**
   * Preserva explícitamente las configuraciones de imagen en los componentes
   * para asegurar que se transfieran correctamente durante el clonado
   */
  _preserveImageSettings(components) {
    return components.map(comp => {
      // Crear una copia profunda del componente
      const preservedComp = JSON.parse(JSON.stringify(comp));
      
      // Si es un componente de imagen, verificar y preservar configuraciones
      if (preservedComp.type === 'image') {
        console.log(`🔍 DEBUG - Clonado: Preservando configuraciones para imagen ${preservedComp.id}`);
        
        // Asegurarse de que _imageSettings se preserve
        if (!preservedComp._imageSettings) {
          preservedComp._imageSettings = {};
          console.log(`🔍 DEBUG - Clonado: Creando objeto _imageSettings para ${preservedComp.id}`);
          
          // Intentar recuperar información de estilo
          ['desktop', 'tablet', 'mobile'].forEach(device => {
            if (preservedComp.style?.[device]) {
              const style = preservedComp.style[device];
              
              // Recuperar posición de _customPosition o del estilo
              if (style._customPosition) {
                console.log(`🔍 DEBUG - Clonado: Usando _customPosition para ${preservedComp.id}`);
                preservedComp._imageSettings.position = {
                  left: style._customPosition.left,
                  top: style._customPosition.top,
                  mode: style._customPosition.mode || 'pixels'
                };
              } else if (style.left && style.top) {
                console.log(`🔍 DEBUG - Clonado: Extrayendo posición de style para ${preservedComp.id}`);
                // Extraer valores numéricos de left y top (quitar 'px', '%', etc.)
                const leftMatch = style.left.match(/^([\\d\\.]+)(px|%|rem|em)?$/);
                const topMatch = style.top.match(/^([\\d\\.]+)(px|%|rem|em)?$/);
                
                if (leftMatch && topMatch) {
                  preservedComp._imageSettings.position = {
                    left: parseFloat(leftMatch[1]),
                    top: parseFloat(topMatch[1]),
                    mode: (leftMatch[2] === 'px' || topMatch[2] === 'px') ? 'pixels' : 'percent'
                  };
                }
              }
              
              // Recuperar dimensiones de _customDimensions o del estilo
              if (style._customDimensions) {
                console.log(`🔍 DEBUG - Clonado: Usando _customDimensions para ${preservedComp.id}`);
                preservedComp._imageSettings.width = style._customDimensions.width;
                preservedComp._imageSettings.height = style._customDimensions.height;
                preservedComp._imageSettings.widthRaw = style._customDimensions.widthRaw;
                preservedComp._imageSettings.heightRaw = style._customDimensions.heightRaw;
              } else if (style.width && style.height) {
                console.log(`🔍 DEBUG - Clonado: Extrayendo dimensiones de style para ${preservedComp.id}`);
                // Extraer valores numéricos de width y height
                const widthMatch = style.width.match(/^([\\d\\.]+)(px|%|rem|em)?$/);
                const heightMatch = style.height.match(/^([\\d\\.]+)(px|%|rem|em)?$/);
                
                if (widthMatch && heightMatch) {
                  const width = parseFloat(widthMatch[1]);
                  const height = parseFloat(heightMatch[1]);
                  
                  preservedComp._imageSettings.width = width;
                  preservedComp._imageSettings.height = height;
                  
                  // Si son píxeles, guardar como raw también
                  if (widthMatch[2] === 'px') {
                    preservedComp._imageSettings.widthRaw = width;
                  }
                  
                  if (heightMatch[2] === 'px') {
                    preservedComp._imageSettings.heightRaw = height;
                  }
                }
              }
              
              // Preservar otras propiedades importantes
              if (style.objectFit) {
                preservedComp._imageSettings.objectFit = style.objectFit;
              }
              
              if (style.objectPosition) {
                preservedComp._imageSettings.objectPosition = style.objectPosition;
              }
              
              // Solo necesitamos procesar un dispositivo así que
              // terminamos el procesamiento de este dispositivo
              return true; // Termina este callback y permite continuar con el forEach
            }
          });
        } else {
          console.log(`🔍 DEBUG - Clonado: Ya existe _imageSettings para ${preservedComp.id}:`, preservedComp._imageSettings);
        }
      }
      
      // Procesar hijos recursivamente si existen
      if (preservedComp.children && Array.isArray(preservedComp.children)) {
        preservedComp.children = this._preserveImageSettings(preservedComp.children);
      }
      
      return preservedComp;
    });
  }

  /**
   * Aplica customizaciones durante el clonado asegurando mantener configuraciones
   * críticas como _imageSettings
   */
  _applyCustomizations(components, customizations) {
    return components.map(comp => {
      const cust = customizations[comp.id];
      if (cust) {
        console.log(`🔍 DEBUG - Clonado: Aplicando customizaciones a componente ${comp.id}`);
        
        // Crear resultado con propiedades del componente original y customizaciones
        const result = {
          ...comp,
          ...cust
        };
        
        // Preservar _imageSettings especialmente para componentes de imagen
        if (comp.type === 'image' && comp._imageSettings) {
          // Asegurarse de que _imageSettings se preserve correctamente
          result._imageSettings = {
            ...comp._imageSettings,
            ...(cust._imageSettings || {}) // Combinar con customizaciones si existen
          };
          
          console.log(`🔍 DEBUG - Clonado: _imageSettings preservado para ${comp.id}:`, result._imageSettings);
        }
        
        // Aplicar customizaciones de estilo
        if (cust.style) {
          result.style = { ...comp.style };
          
          // Para cada dispositivo
          ['desktop', 'tablet', 'mobile'].forEach(device => {
            if (cust.style[device]) {
              // Combinar estilos originales con customizaciones
              result.style[device] = {
                ...(comp.style[device] || {}),
                ...(cust.style[device] || {})
              };
              
              // Preservar posición y dimensiones personalizadas
              if (comp.style[device]?._customPosition) {
                result.style[device]._customPosition = comp.style[device]._customPosition;
                console.log(`🔍 DEBUG - Clonado: _customPosition preservado para ${comp.id} en ${device}`);
              }
              
              if (comp.style[device]?._customDimensions) {
                result.style[device]._customDimensions = comp.style[device]._customDimensions;
                console.log(`🔍 DEBUG - Clonado: _customDimensions preservado para ${comp.id} en ${device}`);
              }
              
              // Sanitizar el estilo resultante
              if (Object.keys(result.style[device]).length > 0) {
                result.style[device] = styleSanitizer.sanitizeStyles(result.style[device]);
              }
            }
          });
        }
        
        return result;
      }
      return comp;
    });
  }

  /**
   * Sanitiza estilos para todos los componentes y sus hijos
   */
  _sanitizeComponentStyles(components) {
    return components.map(comp => {
      const sanitizedComp = { ...comp };
      
      // Sanitizar estilo para cada dispositivo
      if (sanitizedComp.style) {
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (sanitizedComp.style[device]) {
            sanitizedComp.style[device] = styleSanitizer.sanitizeStyles(
              sanitizedComp.style[device]
            );
          }
        });
      }
      
      // Sanitizar estilos en hijos recursivamente
      if (sanitizedComp.children && Array.isArray(sanitizedComp.children)) {
        sanitizedComp.children = this._sanitizeComponentStyles(sanitizedComp.children);
      }
      
      return sanitizedComp;
    });
  }

  unarchiveTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId, userId } = req;
  
    const templ = await BannerTemplate.findOneAndUpdate(
      {
        _id: id,
        clientId,
        type: 'custom',
        status: 'archived'
      },
      {
        status: 'active',
        'metadata.lastModifiedBy': userId
      },
      { new: true }
    );
  
    if (!templ) {
      throw new AppError('Template not found or is not archived', 404);
    }
  
    res.status(200).json({
      status: 'success',
      message: 'Template unarchived successfully',
      data: { template: templ }
    });
  });

  /**
   * Aplica la preferencia de idioma para contenido multilingüe
   */
  _applyLanguagePreference(components, language = 'en') {
    return components.map(comp => {
      const processedComp = { ...comp };
      
      // Procesar contenido multilingüe
      if (processedComp.content && typeof processedComp.content === 'object' && processedComp.content.texts) {
        // Mantener estructura pero añadir text simple para el frontend
        if (processedComp.content.texts[language]) {
          processedComp.content = {
            ...processedComp.content,
            text: processedComp.content.texts[language]
          };
        } else if (processedComp.content.texts.en) {
          processedComp.content = {
            ...processedComp.content,
            text: processedComp.content.texts.en
          };
        } else if (Object.values(processedComp.content.texts).length > 0) {
          processedComp.content = {
            ...processedComp.content,
            text: Object.values(processedComp.content.texts)[0]
          };
        }
      }
      
      // Procesar hijos recursivamente
      if (processedComp.children && Array.isArray(processedComp.children)) {
        processedComp.children = this._applyLanguagePreference(processedComp.children, language);
      }
      
      return processedComp;
    });
  }

  exportEmbeddableScript = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { 
      minify = true, 
      includeGoogleConsentMode = true,
      forceGDPR = false,
      cookieExpiry = 365,
      format = 'javascript' // Permitir formato 'javascript' o 'html'
    } = req.query;
  
    // Buscar la plantilla
    const template = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId },
        { type: 'system', 'metadata.isPublic': true }
      ]
    });
  
    if (!template) {
      throw new AppError('Template not found', 404);
    }
  
    // Obtener la URL base del servidor
    const baseUrl = getBaseUrl();
  
    try {
      // Generar script embebible usando el servicio
      const script = await bannerExportService.generateEmbeddableScript(
        template.toObject(),
        {
          minify: minify === 'true' || minify === true,
          includeGoogleConsentMode: includeGoogleConsentMode === 'true' || includeGoogleConsentMode === true,
          forceGDPR: forceGDPR === 'true' || forceGDPR === true,
          cookieExpiry: parseInt(cookieExpiry, 10) || 365,
          baseUrl
        }
      );
      
      // Registrar evento en auditoría si está disponible
      if (typeof auditService !== 'undefined' && auditService.logAction) {
        await auditService.logAction({
          clientId,
          userId: req.userId,
          action: 'export',
          resourceType: 'script',
          resourceId: template._id,
          metadata: {
            templateId: template._id,
            format: format,
            minify: minify
          }
        }).catch(err => logger.error('Error registrando auditoría:', err));
      }
  
      // Responder según el formato solicitado
      if (format === 'html') {
        // Si se solicita HTML, devolvemos un snippet HTML para inclusión en la página
        const htmlSnippet = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Cookie Consent Script</title>
  </head>
  <body>
    <!-- Cookie Consent Script -->
    <script>
      ${script}
    </script>
  </body>
  </html>`;
        
        res.set('Content-Type', 'text/html');
        res.set('Content-Disposition', `attachment; filename="cookie-consent-${id}.html"`);
        return res.send(htmlSnippet);
      } else {
        // Por defecto, devolvemos el script JavaScript
        res.set('Content-Type', 'application/javascript');
        
        // Activar descarga si se solicita
        if (req.query.download === 'true') {
          res.set('Content-Disposition', `attachment; filename="cookie-consent-${id}.js"`);
        }
        
        return res.send(script);
      }
    } catch (error) {
      logger.error('Error generando script embebible:', error);
      throw new AppError('Error generating embeddable script: ' + error.message, 500);
    }
  });

  // Endpoint to clean up unused banner images
  cleanupBannerImages = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { force = false } = req.query;
    
    console.log(`🧹 Solicitada limpieza manual de imágenes para banner ${id}`);
    
    try {
      // Find the template
      let template;
      if (req.isOwner) {
        // Owners can clean up any template
        template = await BannerTemplate.findById(id);
      } else {
        // Regular users can only clean up their own templates
        template = await BannerTemplate.findOne({
          _id: id,
          clientId,
          type: 'custom'
        });
      }
      
      if (!template) {
        throw new AppError('Template not found or you dont have permission', 404);
      }
      
      // Verify template has components
      if (!template.components || !Array.isArray(template.components)) {
        return res.status(400).json({
          status: 'error',
          message: 'El banner no tiene componentes válidos para procesar',
          data: {
            deleted: 0,
            kept: 0,
            success: false
          }
        });
      }
      
      // Solo limpiar si force=true o si no ha habido cambios recientes
      const lastModifiedTime = new Date(template.updatedAt).getTime();
      const currentTime = Date.now();
      const timeSinceUpdate = currentTime - lastModifiedTime;
      const isSafeToClean = force === 'true' || timeSinceUpdate > 30000; // 30 segundos
      
      if (!isSafeToClean) {
        return res.status(200).json({
          status: 'warning',
          message: 'Banner actualizado recientemente, omitiendo limpieza para evitar eliminar imágenes nuevas',
          data: {
            deleted: 0,
            kept: 0,
            success: true,
            timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + ' segundos',
            safeAfter: '30 segundos'
          }
        });
      }
      
      // Process the cleanup
      const imageProcessorService = require('../services/imageProcessor.service');
      console.log(`🔍 Iniciando limpieza de imágenes para banner ${id} con ${template.components.length} componentes`);
      
      const result = await imageProcessorService.cleanupUnusedImages(id, template.components, { type: template.type, status: template.status });
      
      console.log(`✅ Limpieza completada: ${result.deleted} imágenes eliminadas, ${result.kept} imágenes conservadas`);
      
      // Return cleanup result
      res.status(200).json({
        status: 'success',
        message: 'Image cleanup completed',
        data: {
          deleted: result.deleted,
          kept: result.kept,
          success: result.success
        }
      });
    } catch (error) {
      console.error(`❌ Error en limpieza de imágenes: ${error.message}`);
      throw new AppError(`Error en limpieza de imágenes: ${error.message}`, 500);
    }
  });

  // Eliminar una plantilla (owners pueden eliminar cualquier plantilla, usuarios normales solo las suyas)
  deleteTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    
    console.log(`🗑️ Solicitada eliminación de banner ${id}`);
    
    try {
      // Buscar la plantilla con diferentes permisos según el rol
      let template;
      let query;
      
      if (req.isOwner) {
        // Owners pueden eliminar cualquier plantilla (custom o system)
        console.log('🔑 Usuario owner: puede eliminar cualquier plantilla');
        query = { _id: id };
        template = await BannerTemplate.findOne(query);
      } else {
        // Usuarios normales solo pueden eliminar plantillas custom de su cliente
        console.log('👤 Usuario regular: solo puede eliminar plantillas custom propias');
        query = {
          _id: id,
          clientId,
          type: 'custom'
        };
        template = await BannerTemplate.findOne(query);
      }
      
      if (!template) {
        throw new AppError('Template not found or you don\'t have permission to delete it', 404);
      }
      
      // Verificar si la plantilla está asociada a algún dominio
      const associatedDomains = await Domain.find({
        'settings.defaultTemplateId': id
      }).select('name _id');
      
      if (associatedDomains.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Cannot delete template: it is currently associated with one or more domains',
          data: {
            associatedDomains: associatedDomains.map(domain => ({
              id: domain._id,
              name: domain.name
            }))
          }
        });
      }
      
      // Log información sobre la plantilla a eliminar
      console.log(`📋 Eliminando plantilla: ${template.name} (tipo: ${template.type})`);
      
      // Cleanup images before deleting the template
      if (template.components && Array.isArray(template.components)) {
        try {
          const imageProcessorService = require('../services/imageProcessor.service');
          const cleanupResult = await imageProcessorService.cleanupUnusedImages(
            id, 
            template.components, 
            { type: template.type, status: template.status }
          );
          console.log(`🧹 Limpieza de imágenes: ${cleanupResult.deleted} eliminadas, ${cleanupResult.kept} conservadas`);
        } catch (cleanupError) {
          console.warn(`⚠️ Error durante limpieza de imágenes: ${cleanupError.message}`);
          // No fallar la eliminación si hay problemas con la limpieza de imágenes
        }
      }
      
      // Eliminar la plantilla de la base de datos
      await BannerTemplate.findByIdAndDelete(id);
      
      console.log(`✅ Plantilla ${id} eliminada exitosamente`);
      
      // Registrar evento en auditoría si está disponible
      try {
        await Audit.create({
          clientId: req.isOwner ? (template.clientId || null) : clientId,
          userId: req.userId,
          action: 'delete',
          resourceType: 'template',
          resourceId: id,
          metadata: {
            templateName: template.name,
            templateType: template.type,
            deletedBy: req.isOwner ? 'owner' : 'client'
          }
        });
      } catch (auditError) {
        console.warn(`⚠️ Error registrando auditoría: ${auditError.message}`);
        // No fallar la eliminación si hay problemas con la auditoría
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Template deleted successfully',
        data: {
          deletedTemplate: {
            id: template._id,
            name: template.name,
            type: template.type
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error eliminando plantilla: ${error.message}`);
      throw new AppError(`Error deleting template: ${error.message}`, 500);
    }
  });
}

module.exports = new BannerTemplateController();