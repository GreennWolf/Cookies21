// controllers/BannerTemplateController.js
const BannerTemplate = require('../models/BannerTemplate');
const Domain = require('../models/Domain');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const bannerValidator = require('../utils/bannerValidator');
const styleSanitizer = require('../utils/styleSanitizer');
const { generateHTML, generateCSS } = require('../services/bannerGenerator.service');
const Audit = require('../models/Audit'); // si usas auditoría
const logger = require('../utils/logger');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { bannerUpload, ensureDirectoryExists } = require('../utils/multerConfig');
const bannerExportService = require('../services/bannerExport.service');

const moveFromTempToBannerFolder = async (tempFilePath, bannerId, filename) => {
  try {
    if (!tempFilePath || !bannerId || !filename) {
      throw new Error('Faltan parámetros para mover el archivo');
    }
    
    // Verificar que el archivo temporal existe
    try {
      await fs.access(tempFilePath);
    } catch (err) {
      throw new Error(`Archivo temporal no encontrado: ${tempFilePath}`);
    }
    
    // Crear carpeta para el banner si no existe
    const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
    await ensureDirectoryExists(bannerDir);
    
    // Ruta final del archivo
    const finalPath = path.join(bannerDir, filename);
    
    // Mover el archivo
    await fs.rename(tempFilePath, finalPath);
    console.log(`Archivo movido de ${tempFilePath} a ${finalPath}`);
    
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
 * @param {Object} bannerConfig - Configuración del banner
 * @param {string} bannerId - ID del banner
 * @returns {Object} - Configuración actualizada del banner
 */
 async processImagesInBanner(bannerId, components) {
  try {
    if (!bannerId || !components || !Array.isArray(components)) {
      return components;
    }
    
    const path = require('path');
    const fs = require('fs').promises;
    
    // Asegurarse de que existe el directorio para las imágenes
    const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
    try {
      await fs.mkdir(bannerDir, { recursive: true });
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
                const fileName = `img_${comp.id}_${Date.now()}.${extension}`;
                const filePath = path.join(bannerDir, fileName);
                
                // Guardar archivo
                const buffer = Buffer.from(base64Data, 'base64');
                await fs.writeFile(filePath, buffer);
                
                // Actualizar el contenido del componente con la URL relativa
                processedComps[i] = {
                  ...comp,
                  content: `/templates/images/${bannerId}/${fileName}`
                };
                
                console.log(`Imagen base64 procesada y guardada para componente ${comp.id}: ${fileName}`);
              }
            } catch (error) {
              console.error(`Error al procesar imagen base64 para componente ${comp.id}:`, error);
            }
          }
          // Caso 2: Es una referencia temporal a un archivo subido
          else if (comp.content.startsWith('__IMAGE_REF__') && comp._tempPath) {
            try {
              // Verificar que el archivo temporal existe
              try {
                await fs.access(comp._tempPath);
              } catch (err) {
                console.error(`Archivo temporal no encontrado: ${comp._tempPath}`);
                continue;
              }
              
              // Obtener la extensión del archivo
              const extension = path.extname(comp._tempPath);
              
              // Crear nombre único para el archivo final
              const fileName = `img_${comp.id}_${Date.now()}${extension}`;
              const destPath = path.join(bannerDir, fileName);
              
              // Mover el archivo a la carpeta final
              await fs.copyFile(comp._tempPath, destPath);
              
              // Intentar eliminar el archivo temporal (no bloquear si hay error)
              try {
                await fs.unlink(comp._tempPath);
              } catch (error) {
                console.warn(`No se pudo eliminar archivo temporal ${comp._tempPath}: ${error.message}`);
              }
              
              // Actualizar el componente con la URL relativa
              processedComps[i] = {
                ...comp,
                content: `/templates/images/${bannerId}/${fileName}`,
                _tempPath: undefined, // Eliminar referencia temporal
                _tempFile: undefined  // Eliminar referencia al archivo
              };
              
              console.log(`Archivo temporal movido a carpeta final para componente ${comp.id}: ${fileName}`);
            } catch (error) {
              console.error(`Error al procesar archivo temporal para componente ${comp.id}:`, error);
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
    const templates = await BannerTemplate.find({
      type: 'system',
      status: 'active',
      'metadata.isPublic': true
    });

    res.status(200).json({
      status: 'success',
      data: { templates }
    });
  });

  // Obtener plantillas del cliente
  getClientTemplates = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { status, search } = req.query;

    console.log('buscando template ', clientId, status, search);

    const query = {
      $or: [
        { clientId, type: 'custom' },
        { type: 'system', 'metadata.isPublic': true }
      ]
    };

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'archived' };
    }

    if (search) {
      // Filtrado por nombre o tags
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'metadata.tags': { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await BannerTemplate.find(query).sort({
      'metadata.isPublic': -1,
      updatedAt: -1
    });

    res.status(200).json({
      status: 'success',
      data: { templates }
    });
  });

  // Obtener una plantilla específica
  getTemplate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const { language = 'en' } = req.query;

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
              
              // Buscar archivo correspondiente por nombre que contiene el ID
              const file = uploadedFiles.find(f => 
                f.originalname.includes(`IMAGE_REF_${imageId}`) || 
                f.originalname.includes(imageId));
              
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
      
      // 6. Guardar la plantilla en la base de datos
      console.log('💾 Guardando template en la base de datos');
      
      // Establecer metadata
      const templateWithMetadata = {
        ...templateData,
        clientId,
        type: 'custom',
        metadata: {
          ...(templateData.metadata || {}),
          createdBy: userId,
          lastModifiedBy: userId,
          version: 1,
          isPublic: false
        }
      };
      
      const createdTemplate = await BannerTemplate.create(templateWithMetadata);
      console.log(`✅ Template creado con ID: ${createdTemplate._id}`);
      
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
      res.status(201).json({
        status: 'success',
        message: 'Template created successfully',
        data: { template: createdTemplate }
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
      category: 'custom'
    };

    if (customizations) {
      cloneData.components = this._applyCustomizations(
        cloneData.components,
        customizations
      );
    }

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
      
      // 3. Buscar el template existente
      const existingTemplate = await BannerTemplate.findOne({
        _id: id,
        clientId,
        type: 'custom'
      });
      
      if (!existingTemplate) {
        return res.status(404).json({
          status: 'error',
          message: 'Template not found or you don\'t have permission to edit it'
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
        
        // IMPORTANTE: Procesar imágenes en los componentes
        // Esta es la función clave que hemos visto que no está funcionando correctamente
        if (isMultipart && uploadedFiles.length > 0) {
          console.log("🖼️ Procesando imágenes para componentes...");
          
          // NUEVO: Asociar explícitamente los archivos subidos con componentes de imagen
          for (const comp of updates.components) {
            if (comp.type === 'image') {
              console.log(`🔍 Procesando componente imagen: ${comp.id}`);
              
              // Si hay algún archivo subido, asociarlo con este componente
              if (uploadedFiles.length > 0) {
                const file = uploadedFiles[0]; // Tomar el primer archivo disponible
                
                // Crear directorio para imágenes si no existe
                const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', id);
                await fs.mkdir(bannerDir, { recursive: true });
                
                // Generar nombre único para el archivo
                const extension = path.extname(file.originalname);
                const fileName = `img_${comp.id}_${Date.now()}${extension}`;
                const destPath = path.join(bannerDir, fileName);
                
                // Mover el archivo de temp a la carpeta final
                await fs.copyFile(file.path, destPath);
                console.log(`✅ Archivo movido de ${file.path} a ${destPath}`);
                
                // Actualizar el contenido del componente con la URL relativa
                comp.content = `/templates/images/${id}/${fileName}`;
                console.log(`✅ Actualizado componente ${comp.id} con URL: ${comp.content}`);
                
                // No eliminar el archivo temporal aún, lo haremos después de guardar
                break; // Solo procesamos un archivo por ahora
              }
            }
          }
        }
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
      
      // Eliminar campos que no deben actualizarse
      delete updateData._id;
      delete updateData.clientId;
      delete updateData.type;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      const updatedTemplate = await BannerTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      console.log(`✅ Template actualizado: ${updatedTemplate._id}`);
      
      // 7. Eliminar archivos temporales DESPUÉS de guardar
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
    const html = await generateHTML(config);
    const css = await generateCSS(config);

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
        exportData = await generateHTML(template.toObject());
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

    const html = await generateHTML(merged);
    const css = await generateCSS(merged);

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

    const template = await BannerTemplate.findOne({
      _id: id,
      clientId,
      type: 'custom'
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    template.status = 'archived';
    template.metadata.lastModifiedBy = userId;
    await template.save();

    res.status(200).json({
      status: 'success',
      message: 'Template deleted (archived) successfully'
    });
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
  _applyCustomizations(components, customizations) {
    return components.map(comp => {
      const cust = customizations[comp.id];
      if (cust) {
        const result = {
          ...comp,
          ...cust
        };
        
        // Aplicar customizaciones de estilo
        if (cust.style) {
          result.style = { ...comp.style };
          
          // Para cada dispositivo
          ['desktop', 'tablet', 'mobile'].forEach(device => {
            if (cust.style[device]) {
              result.style[device] = {
                ...(comp.style[device] || {}),
                ...(cust.style[device] || {})
              };
              
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
    const baseUrl = process.env.BASE_URL || 
                   `${req.protocol}://${req.get('host')}`;
  
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
}

module.exports = new BannerTemplateController();