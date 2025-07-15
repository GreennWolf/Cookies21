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
const bannerTranslationService = require('../services/bannerTranslation.service');
const BannerImageManager = require('../services/bannerImageManager.service');
const bannerImageManager = new BannerImageManager();
const emailService = require('../services/email.service');
const consentScriptGenerator = require('../services/consentScriptGenerator.service');
const User = require('../models/UserAccount');

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

// Helper function para determinar si es una plantilla del sistema
const isSystemTemplate = (data) => {
  return data?.type === 'system' || data?.isSystemTemplate === true;
};

class BannerTemplateController {

  /**
   * Convierte URLs de imágenes relativas a absolutas
   * @param {Array} components - Componentes del banner
   * @param {string} baseUrl - URL base del servidor
   * @returns {Array} - Componentes con URLs absolutas
   */
  processImageUrls(components, baseUrl) {
    if (!components || !Array.isArray(components)) return components;
    
    return components.map(comp => {
      const processedComp = { ...comp };
      
      // Si es un componente de imagen y tiene URL relativa
      if (processedComp.type === 'image' && processedComp.content) {
        // Procesar string directo
        if (typeof processedComp.content === 'string' && processedComp.content.startsWith('/templates/')) {
          processedComp.content = baseUrl + processedComp.content;
        }
        // Procesar objeto con texts
        else if (processedComp.content.texts) {
          Object.keys(processedComp.content.texts).forEach(lang => {
            if (typeof processedComp.content.texts[lang] === 'string' && 
                processedComp.content.texts[lang].startsWith('/templates/')) {
              processedComp.content.texts[lang] = baseUrl + processedComp.content.texts[lang];
            }
          });
        }
      }
      
      // Procesar hijos recursivamente
      if (processedComp.children && Array.isArray(processedComp.children)) {
        processedComp.children = this.processImageUrls(processedComp.children, baseUrl);
      }
      
      return processedComp;
    });
  }

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
    
    const activeSystemTemplates = systemTemplates.filter(t => t.status != 'archived');
    console.log(`✅ Plantillas de sistema activas: ${activeSystemTemplates.length}`);
    
    // Ya no necesitamos filtrar por isPublic, todos los templates de sistema son públicos
    console.log(`🌐 Plantillas de sistema activas (todas son públicas): ${activeSystemTemplates.length}`);
    
    // Consulta simplificada: buscar todos los templates del sistema activos
    let templates = await BannerTemplate.find({
      type: 'system',
      status: { $ne: 'archived' }
    });
    
    console.log(`📋 Plantillas del sistema encontradas: ${templates.length}`);
    
    // Si no hay plantillas del sistema, crear una automáticamente
    if (templates.length === 0) {
      console.log('🏗️ No hay plantillas del sistema, creando una automáticamente...');
      
      try {
        const defaultTemplate = await BannerTemplate.create({
          name: 'Banner Básico del Sistema',
          type: 'system',
          status: 'active',
          metadata: {
            category: 'basic',
            version: 1,
            tags: ['basic', 'cookie', 'consent'],
            createdBy: 'system-auto'
          },
          layout: {
            desktop: {
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            }
          },
          components: [
            {
              id: 'title',
              type: 'text',
              content: {
                texts: {
                  en: 'We use cookies',
                  es: 'Usamos cookies'
                }
              },
              position: {
                desktop: { top: '0%', left: '0%' }
              },
              style: {
                desktop: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px'
                }
              }
            },
            {
              id: 'description',
              type: 'text',
              content: {
                texts: {
                  en: 'This website uses cookies to ensure you get the best experience.',
                  es: 'Este sitio web utiliza cookies para garantizar la mejor experiencia.'
                }
              },
              position: {
                desktop: { top: '30%', left: '0%' }
              },
              style: {
                desktop: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }
              }
            },
            {
              id: 'rejectBtn',
              type: 'button',
              content: {
                texts: {
                  en: 'Reject',
                  es: 'Rechazar'
                }
              },
              action: {
                type: 'reject_all'
              },
              position: {
                desktop: { top: '70%', left: '0%' }
              },
              style: {
                desktop: {
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }
              }
            },
            {
              id: 'acceptBtn',
              type: 'button',
              content: {
                texts: {
                  en: 'Accept All',
                  es: 'Aceptar Todo'
                }
              },
              action: {
                type: 'accept_all'
              },
              position: {
                desktop: { top: '70%', left: '40%' }
              },
              style: {
                desktop: {
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }
              }
            }
          ]
        });
        
        templates = [defaultTemplate];
        console.log('✅ Plantilla del sistema creada automáticamente:', defaultTemplate._id);
        
      } catch (error) {
        console.error('❌ Error creando plantilla automática:', error);
        // Continuar sin plantilla si hay error
      }
    }
    
    if (templates.length > 0) {
      console.log('📝 Primeras plantillas:', templates.slice(0, 2).map(t => ({ 
        id: t._id, 
        name: t.name, 
        type: t.type, 
        status: t.status
      })));
    }

    // Procesar URLs de imágenes para hacerlas absolutas
    const baseUrl = getBaseUrl();
    const templatesWithAbsoluteUrls = templates.map(template => {
      const templateObj = template.toObject();
      if (templateObj.components) {
        templateObj.components = this.processImageUrls(templateObj.components, baseUrl);
      }
      return templateObj;
    });

    res.status(200).json({
      status: 'success',
      data: { templates: templatesWithAbsoluteUrls }
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
    
    // 5. NUEVO FLUJO: Procesar imágenes primero guardándolas en temporal
    let tempImageData = null;
    if (uploadedFiles.length > 0) {
      console.log('🖼️ NUEVO FLUJO: Guardando archivos en temporal...');
      tempImageData = await bannerImageManager.saveFilesToTemp(uploadedFiles);
      console.log(`💾 ${tempImageData.savedFiles.length} archivos guardados en temp/${tempImageData.timestamp}`);
    }
    
    // Procesar componentes
    if (templateData.components && Array.isArray(templateData.components)) {
      // Normalizar posiciones a porcentajes
      templateData.components = bannerValidator.normalizePositions(templateData.components);
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
    
    // 8. NUEVO FLUJO: Mover archivos de temp a carpeta final y actualizar URLs
    if (tempImageData && tempImageData.savedFiles.length > 0) {
      console.log('🔄 NUEVO FLUJO: Moviendo archivos de temporal a carpeta final...');
      try {
        const movedFiles = await bannerImageManager.moveFilesFromTempToFinal(
          tempImageData, 
          createdTemplate._id.toString()
        );
        
        // Actualizar URLs en los componentes
        templateWithMetadata.components = await bannerImageManager.updateComponentUrlsAfterMove(
          templateWithMetadata.components, 
          movedFiles
        );
        
        // Guardar template actualizado con URLs finales
        await BannerTemplate.findByIdAndUpdate(
          createdTemplate._id, 
          { components: templateWithMetadata.components }
        );
        
        console.log(`✅ ${movedFiles.length} archivos movidos y URLs actualizadas para banner ${createdTemplate._id}`);
      } catch (finalizeError) {
        console.error('❌ Error finalizando imágenes:', finalizeError);
      }
    }
    
    // 9. Limpiar archivos temporales
    if (uploadedFiles.length > 0) {
      await bannerImageManager.cleanupTempFiles(uploadedFiles);
    }
    
    // 10. Procesar URLs de imágenes y responder con éxito
    const baseUrl = getBaseUrl();
    const createdTemplateObj = createdTemplate.toObject();
    if (createdTemplateObj.components) {
      createdTemplateObj.components = this.processImageUrls(createdTemplateObj.components, baseUrl);
    }
    
    res.status(201).json({
      status: 'success',
      message: 'System template created successfully',
      data: { template: createdTemplateObj }
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
  // NUEVO: Subir imagen temporal para edición en step 3
  uploadTempImage = async (req, res) => {
    try {
      const { clientId, userId } = req;
      
      // Verificar que se subió un archivo
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se subió ningún archivo de imagen'
        });
      }
      
      const file = req.files[0];
      const { componentId } = req.body;
      
      if (!componentId) {
        return res.status(400).json({
          status: 'error',
          message: 'componentId es requerido'
        });
      }
      
      console.log(`📷 [TempImage] Subiendo imagen temporal para componente ${componentId}:`, file.originalname);
      
      // Crear nombre único para la imagen temporal
      const timestamp = Date.now();
      const extension = path.extname(file.originalname) || '.jpg';
      const fileName = `temp-${componentId}-${timestamp}${extension}`;
      
      // Crear directorio temporal si no existe
      const tempDir = path.join(process.cwd(), 'public', 'templates', 'temp');
      await ensureDirectoryExists(tempDir);
      
      // Mover archivo a directorio temporal
      const tempPath = path.join(tempDir, fileName);
      await fs.copyFile(file.path, tempPath);
      
      // Limpiar archivo original de multer
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.warn('No se pudo eliminar archivo temporal de multer:', err.message);
      }
      
      // Construir URL temporal
      const tempUrl = `/templates/temp/${fileName}`;
      
      console.log(`✅ [TempImage] Imagen temporal guardada: ${tempUrl}`);
      
      res.status(200).json({
        status: 'success',
        data: {
          componentId,
          tempUrl,
          fileName,
          originalName: file.originalname
        }
      });
      
    } catch (error) {
      console.error('❌ Error subiendo imagen temporal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
        details: error.message
      });
    }
  };

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
          console.log('🔍 DEBUG - Contenido de updates:', {
            hasTranslationConfig: !!updates.translationConfig,
            translationConfig: updates.translationConfig,
            updateKeys: Object.keys(updates)
          });
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
        
        // Procesar imágenes usando el servicio unificado (IGUAL QUE updateTemplate)
        if (isMultipart && uploadedFiles.length > 0) {
          console.log('🖼️ SISTEMA: Procesando imágenes con servicio unificado...');
          
          const imageResult = await bannerImageManager.processImagesUnified({
            bannerId: id,
            uploadedFiles,
            components: updates.components,
            isUpdate: true,
            metadata: { operation: 'update_system', timestamp: Date.now() }
          });
          
          updates.components = imageResult.components;
          console.log(`✅ Procesadas ${imageResult.stats.successful} imágenes de ${imageResult.stats.total}`);
        }
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
      
      // NOTA: No se requiere finalización en updates porque los archivos se procesan directamente en la carpeta del banner
      
      // 8. Limpiar archivos temporales usando el manager
      if (uploadedFiles.length > 0) {
        await bannerImageManager.cleanupTempFiles(uploadedFiles);
      }
      
      // 9. Procesar URLs de imágenes y responder con éxito
      const baseUrl = getBaseUrl();
      const updatedTemplateObj = updatedTemplate.toObject();
      if (updatedTemplateObj.components) {
        updatedTemplateObj.components = this.processImageUrls(updatedTemplateObj.components, baseUrl);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'System template updated successfully',
        data: { template: updatedTemplateObj }
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
    const { status, search, clientId: queryClientId, type } = req.query;

    console.log('🔍 BannerTemplateController.getClientTemplates:', { 
      clientId, 
      status, 
      search, 
      queryClientId, 
      type,
      isOwner: req.isOwner 
    });

    let query = {};
    let clientInfo;
    
    // Si se especifica un tipo específico, filtrar solo por ese tipo
    if (type) {
      if (type === 'system') {
        // Solo plantillas del sistema
        query = { type: 'system' };
        console.log('📋 Filtrando solo plantillas del sistema');
      } else if (type === 'custom') {
        // Solo plantillas personalizadas
        if (req.isOwner && queryClientId) {
          query = { clientId: queryClientId, type: 'custom' };
        } else if (req.isOwner && !queryClientId) {
          query = { type: 'custom' };
        } else {
          query = { clientId, type: 'custom' };
        }
        console.log('📋 Filtrando solo plantillas personalizadas');
      }
    } else {
      // Comportamiento original: mostrar ambos tipos
      // Si es owner y se proporcionó un clientId en la consulta
      if (req.isOwner && queryClientId) {
        // Buscar plantillas del cliente específico + plantillas del sistema
        query = {
          $or: [
            { clientId: queryClientId, type: 'custom' },
            { type: 'system' }
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
            { type: 'system' }
          ]
        };
      } 
      // Usuarios normales solo ven sus propias plantillas + las del sistema
      else {
        query = {
          $or: [
            { clientId, type: 'custom' },
            { type: 'system' }
          ]
        };
      }
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
          type: -1,  // system primero, custom después
          updatedAt: -1
        });
    } else {
      templates = await BannerTemplate.find(query).sort({
        type: -1,  // system primero, custom después
        updatedAt: -1
      });
    }

    // Procesar URLs de imágenes para hacerlas absolutas
    const baseUrl = getBaseUrl();
    const templatesWithAbsoluteUrls = templates.map(template => {
      const templateObj = template.toObject();
      if (templateObj.components) {
        templateObj.components = this.processImageUrls(templateObj.components, baseUrl);
      }
      return templateObj;
    });

    res.status(200).json({
      status: 'success',
      data: { 
        templates: templatesWithAbsoluteUrls,
        client: clientInfo
      },
      subscriptionStatus: req.subscriptionStatus,
      subscriptionInactive: req.subscriptionInactive || false,
      subscriptionMessage: req.subscriptionMessage
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
        { type: 'system' }
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

    // Convertir a objeto para poder modificar
    const templateObj = template.toObject();
    
    // Procesar URLs de imágenes para hacerlas absolutas
    const baseUrl = getBaseUrl();
    if (templateObj.components) {
      templateObj.components = this.processImageUrls(templateObj.components, baseUrl);
    }

    res.status(200).json({
      status: 'success',
      data: { template: templateObj }
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
          mimetype: file.mimetype,
          fieldname: file.fieldname
        });
      });
      
      // Debug: Mostrar referencias de imagen en componentes
      if (templateData.components) {
        const imageRefs = [];
        const findImageRefs = (components) => {
          components.forEach(comp => {
            if (comp.type === 'image' && comp.content?.startsWith('__IMAGE_REF__')) {
              imageRefs.push({
                componentId: comp.id,
                imageRef: comp.content
              });
            }
            if (comp.children) findImageRefs(comp.children);
          });
        };
        findImageRefs(templateData.components);
        if (imageRefs.length > 0) {
          console.log('🔍 Referencias de imagen encontradas:', imageRefs);
        }
      }
      
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
        
        // Usar el servicio unificado para procesar imágenes
        let tempBannerId = null;
        if (uploadedFiles.length > 0) {
          console.log('🖼️ Procesando imágenes con servicio unificado...');
          tempBannerId = `temp_${Date.now()}`;
          const imageResult = await bannerImageManager.processImagesUnified({
            bannerId: tempBannerId, // Temporal hasta obtener el ID real
            uploadedFiles,
            components: templateData.components,
            isUpdate: false,
            metadata: { operation: 'create', timestamp: Date.now() }
          });
          
          templateData.components = imageResult.components;
          console.log(`✅ Procesadas ${imageResult.stats.successful} imágenes de ${imageResult.stats.total}`);
        }
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
      if (req.isOwner && isSystemTemplate(templateData)) {
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
      // metadata.isPublic ya no es necesario, todos los banners system son públicos
      console.log('- metadata.category:', templateWithMetadata.metadata.category);
      
      // Logs para traducción
      if (templateWithMetadata.translationConfig) {
        console.log('🌐 === CONFIGURACIÓN DE TRADUCCIÓN (CREACIÓN) ===');
        console.log(`🌐 Idioma origen: ${templateWithMetadata.translationConfig.sourceLanguage}`);
        console.log(`🌐 Idiomas destino:`, templateWithMetadata.translationConfig.targetLanguages);
        console.log(`🌐 Es array targetLanguages:`, Array.isArray(templateWithMetadata.translationConfig.targetLanguages));
        console.log(`🌐 Número de idiomas destino:`, templateWithMetadata.translationConfig.targetLanguages?.length);
        console.log(`🌐 Auto-traducir al guardar: ${templateWithMetadata.translationConfig.autoTranslateOnSave}`);
        console.log('🌐 Configuración completa:', JSON.stringify(templateWithMetadata.translationConfig, null, 2));
      }
      
      // Log de textos traducidos en componentes
      if (templateWithMetadata.components) {
        console.log('📝 === TEXTOS TRADUCIDOS EN COMPONENTES (CREACIÓN) ===');
        const logTranslatedTexts = (components, path = '') => {
          components.forEach((comp, index) => {
            const currentPath = `${path}[${index}](${comp.id})`;
            
            if (comp.type === 'text' || comp.type === 'button') {
              if (typeof comp.content === 'object' && comp.content.texts) {
                console.log(`📝 Componente ${currentPath} - Tipo: ${comp.type}`);
                console.log(`   Traducciones disponibles: ${Object.keys(comp.content.texts).join(', ')}`);
                Object.entries(comp.content.texts).forEach(([lang, text]) => {
                  console.log(`   ${lang}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                });
              } else if (typeof comp.content === 'string') {
                console.log(`⚠️  Componente ${currentPath} - Tipo: ${comp.type} - Sin traducciones (string simple)`);
              }
            }
            
            if (comp.children && comp.children.length > 0) {
              logTranslatedTexts(comp.children, `${currentPath}.children`);
            }
          });
        };
        
        logTranslatedTexts(templateWithMetadata.components);
      }
      
      const createdTemplate = await BannerTemplate.create(templateWithMetadata);
      console.log(`✅ Template creado con ID: ${createdTemplate._id}`);
      
      // 7.5. Finalizar procesamiento de imágenes con el ID real del banner
      if (uploadedFiles.length > 0 && tempBannerId) {
        console.log('🔄 Finalizando procesamiento de imágenes con ID real del banner...');
        try {
          const finalResult = await bannerImageManager.finalizeImages({
            tempBannerId: tempBannerId,
            realBannerId: createdTemplate._id.toString(),
            components: createdTemplate.components
          });
          
          if (finalResult.components) {
            // Actualizar el template con las URLs corregidas
            const templateToUpdate = await BannerTemplate.findById(createdTemplate._id);
            templateToUpdate.components = finalResult.components;
            templateToUpdate.markModified('components');
            await templateToUpdate.save();
            console.log('💾 Template actualizado con URLs definitivas');
          }
        } catch (err) {
          console.warn(`⚠️ Error finalizando imágenes: ${err.message}`);
        }
      }
      
      // 8. Limpiar archivos temporales
      if (uploadedFiles.length > 0) {
        await bannerImageManager.cleanupTempFiles(uploadedFiles);
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
    const { clientId, userId } = req;
    
    console.log('🚀 Iniciando clonación de template');
    console.log('📦 Content-Type:', req.headers['content-type']);
    console.log(`🔍 DEBUG - Clonado: Iniciando clonación de template ${id} para cliente ${clientId}`);
    
    // 1. Detectar si tenemos un formulario multipart
    const isMultipart = req.headers['content-type'] && 
                        req.headers['content-type'].startsWith('multipart/form-data');
    
    console.log(`📄 Tipo de solicitud: ${isMultipart ? 'Multipart con archivos' : 'JSON simple'}`);
    
    // 2. Extraer datos
    let name, customizations;
    
    let cloneDataFromForm = null;
    
    if (isMultipart) {
      // Para solicitudes multipart/form-data
      name = req.body.name;
      
      // Procesar cloneData si existe (contiene componentes con referencias __IMAGE_REF__)
      if (req.body.cloneData) {
        try {
          cloneDataFromForm = JSON.parse(req.body.cloneData);
          console.log('📄 CloneData parseado desde FormData');
          console.log('📊 Componentes con referencias de imagen:', cloneDataFromForm.components?.length);
        } catch (error) {
          console.error('❌ Error parseando cloneData:', error.message);
        }
      }
      
      if (req.body.customizations) {
        try {
          customizations = JSON.parse(req.body.customizations);
          console.log('📄 Customizations parseadas desde FormData');
        } catch (error) {
          console.warn('⚠️ No se pudieron parsear customizations:', error.message);
          customizations = null;
        }
      }
    } else {
      // Para solicitudes JSON normales
      name = req.body.name;
      customizations = req.body.customizations;
    }
    
    console.log(`🔍 DEBUG - Clonado: Customizaciones recibidas:`, customizations ? 'Sí' : 'No');
    
    // 3. Verificar archivos subidos si es multipart
    const uploadedFiles = isMultipart ? (req.files || []) : [];
    console.log(`🖼️ Archivos recibidos: ${uploadedFiles.length}`);

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
        { type: 'system' }
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
    console.log(`✅ Template clonado creado con ID: ${cloned._id}`);
    
    // 4. PROCESAR IMÁGENES SI HAY ARCHIVOS (copiado de createTemplate)
    if (isMultipart && uploadedFiles.length > 0) {
      console.log('🖼️ Procesando imágenes para el template clonado...');
      
      // Si tenemos componentes del frontend con referencias __IMAGE_REF__, usarlos
      if (cloneDataFromForm && cloneDataFromForm.components) {
        console.log('🔄 Usando componentes con referencias del frontend');
        cloned.components = cloneDataFromForm.components;
      }
      
      if (!cloned.components || !Array.isArray(cloned.components)) {
        console.warn('⚠️ No hay componentes para procesar imágenes');
        return res.status(201).json({
          status: 'success',
          data: { template: cloned }
        });
      }
      
      // Mostrar detalles de cada archivo
      uploadedFiles.forEach((file, i) => {
        console.log(`📄 Archivo ${i+1}:`, {
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
      
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
              const bannerId = cloned._id.toString();
              const fileName = `img_${component.id}_${Date.now()}${path.extname(file.originalname)}`;
              
              // Crear directorio si no existe
              const bannerDir = path.join(process.cwd(), 'public', 'templates', 'images', bannerId);
              
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
                  
                  // Procesar estilos para todos los dispositivos
                  ['desktop', 'tablet', 'mobile'].forEach(device => {
                    if (component.style && component.style[device]) {
                      // Aplicar posición si existe
                      if (component._imageSettings.position) {
                        // Aplicar left y top directamente al estilo - usando píxeles
                        if (component._imageSettings.position.left !== undefined) {
                          const left = parseFloat(component._imageSettings.position.left);
                          component.style[device].left = `${left}px`;
                          console.log(`🔄 Estableciendo posición left: ${left}px para ${component.id}`);
                        }
                        
                        if (component._imageSettings.position.top !== undefined) {
                          const top = parseFloat(component._imageSettings.position.top);
                          component.style[device].top = `${top}px`;
                          console.log(`🔄 Estableciendo posición top: ${top}px para ${component.id}`);
                        }
                        
                        // Conservar la posición original
                        component.style[device]._customPosition = {
                          left: parseFloat(component._imageSettings.position.left),
                          top: parseFloat(component._imageSettings.position.top),
                          mode: 'pixels'
                        };
                      }
                      
                      // Aplicar tamaño si existe
                      if (component._imageSettings.widthRaw !== undefined || component._imageSettings.heightRaw !== undefined) {
                        component.style[device]._customDimensions = {
                          mode: 'pixels'
                        };
                        
                        if (component._imageSettings.widthRaw !== undefined) {
                          const width = parseInt(component._imageSettings.widthRaw);
                          if (!isNaN(width) && width > 0) {
                            component.style[device].width = `${width}px`;
                            component.style[device]._customDimensions.width = width;
                            console.log(`🔄 Usando ancho en píxeles: ${width}px para ${component.id}`);
                          }
                        }
                        
                        if (component._imageSettings.heightRaw !== undefined) {
                          const height = parseInt(component._imageSettings.heightRaw);
                          if (!isNaN(height) && height > 0) {
                            component.style[device].height = `${height}px`;
                            component.style[device]._customDimensions.height = height;
                            console.log(`🔄 Usando alto en píxeles: ${height}px para ${component.id}`);
                          }
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
      cloned.components = processComponents(cloned.components);
      
      // Guardar cambios si hubo actualizaciones
      await cloned.save();
      console.log('✅ Template clonado actualizado con nuevas imágenes');
    }

    // Procesar URLs de imágenes antes de enviar respuesta
    const baseUrl = getBaseUrl();
    const clonedObj = cloned.toObject();
    if (clonedObj.components) {
      clonedObj.components = this.processImageUrls(clonedObj.components, baseUrl);
    }
    
    res.status(201).json({
      status: 'success',
      data: { template: clonedObj }
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
          console.log('🔍 DEBUG - Contenido de updates:', {
            hasTranslationConfig: !!updates.translationConfig,
            translationConfig: updates.translationConfig,
            updateKeys: Object.keys(updates)
          });
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
        console.log('🔍 DEBUG - Contenido de updates (JSON):', {
          hasTranslationConfig: !!updates.translationConfig,
          translationConfig: updates.translationConfig,
          updateKeys: Object.keys(updates)
        });
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
        
        // Procesar imágenes usando el servicio unificado
        if (isMultipart && validFiles.length > 0) {
          console.log('🖼️ SERVIDOR: Procesando imágenes con servicio unificado...');
          
          // DEBUG: Mostrar archivos que van a ser procesados
          console.log('📁 SERVIDOR: Archivos subidos para procesamiento:', validFiles.map(f => ({
            originalname: f.originalname,
            size: f.size,
            mimetype: f.mimetype,
            filename: f.filename,
            path: f.path
          })));
          
          const imageResult = await bannerImageManager.processImagesUnified({
            bannerId: id,
            uploadedFiles: validFiles,
            components: updates.components,
            isUpdate: true,
            metadata: { operation: 'update', timestamp: Date.now() }
          });
          
          updates.components = imageResult.components;
          console.log(`✅ Procesadas ${imageResult.stats.successful} imágenes de ${imageResult.stats.total}`);
          
          // DEBUG: Mostrar componentes después del procesamiento
          const imageCompsAfter = [];
          const findImageComps = (comps) => {
            comps.forEach(comp => {
              if (comp.type === 'image') {
                imageCompsAfter.push({
                  id: comp.id,
                  content: comp.content,
                  esImageRef: typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__'),
                  esRutaServidor: typeof comp.content === 'string' && comp.content.startsWith('/templates/')
                });
              }
              if (comp.children) findImageComps(comp.children);
            });
          };
          findImageComps(updates.components);
          console.log('🔍 SERVIDOR: Componentes imagen después del procesamiento:', imageCompsAfter);
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
        if (isSystemTemplate(updates)) {
          console.log('✅ CONVIRTIENDO A BANNER DE SISTEMA');
          updateData.type = 'system';
          updateData.clientId = null;
          
          // Manejar metadata según cómo se construyó updateData
          if ('metadata' in updates) {
            updateData.metadata.category = updateData.metadata.category || 'basic';
          } else {
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
      
      // Agregar logs para traducción
      if (updateData.translationConfig) {
        console.log('🌐 === CONFIGURACIÓN DE TRADUCCIÓN ===');
        console.log(`🌐 Idioma origen: ${updateData.translationConfig.sourceLanguage}`);
        console.log(`🌐 Idiomas destino:`, updateData.translationConfig.targetLanguages);
        console.log(`🌐 Es array targetLanguages:`, Array.isArray(updateData.translationConfig.targetLanguages));
        console.log(`🌐 Número de idiomas destino:`, updateData.translationConfig.targetLanguages?.length);
        console.log(`🌐 Auto-traducir al guardar: ${updateData.translationConfig.autoTranslateOnSave}`);
        console.log('🌐 Configuración completa:', JSON.stringify(updateData.translationConfig, null, 2));
      }
      
      // Log de textos traducidos en componentes
      if (updateData.components) {
        console.log('📝 === TEXTOS TRADUCIDOS EN COMPONENTES ===');
        const logTranslatedTexts = (components, path = '') => {
          components.forEach((comp, index) => {
            const currentPath = `${path}[${index}](${comp.id})`;
            
            if (comp.type === 'text' || comp.type === 'button') {
              if (typeof comp.content === 'object' && comp.content.texts) {
                console.log(`📝 Componente ${currentPath} - Tipo: ${comp.type}`);
                console.log(`   Traducciones disponibles: ${Object.keys(comp.content.texts).join(', ')}`);
                Object.entries(comp.content.texts).forEach(([lang, text]) => {
                  console.log(`   ${lang}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                });
              } else if (typeof comp.content === 'string') {
                console.log(`⚠️  Componente ${currentPath} - Tipo: ${comp.type} - Sin traducciones (string simple)`);
              }
            }
            
            if (comp.children && comp.children.length > 0) {
              logTranslatedTexts(comp.children, `${currentPath}.children`);
            }
          });
        };
        
        logTranslatedTexts(updateData.components);
      }
      
      const updatedTemplate = await BannerTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      console.log(`✅ Template actualizado: ${updatedTemplate._id}`);
      
      // Verificar qué se guardó realmente en la DB
      if (updateData.translationConfig) {
        console.log('🔍 === VERIFICACIÓN POST-GUARDADO ===');
        console.log('🔍 translationConfig enviado:', updateData.translationConfig);
        console.log('🔍 translationConfig guardado en DB:', updatedTemplate.translationConfig);
        console.log('🔍 targetLanguages guardado:', updatedTemplate.translationConfig?.targetLanguages);
      }
      
      // NOTA: No se requiere finalización en updates porque los archivos se procesan directamente en la carpeta del banner
      
      // 8. Limpiar archivos temporales
      if (uploadedFiles.length > 0) {
        await bannerImageManager.cleanupTempFiles(uploadedFiles);
      }
      
      // 9. Procesar URLs de imágenes y responder con éxito
      const baseUrl = getBaseUrl();
      const templateObj = updatedTemplate.toObject();
      
      // DEBUG: Verificar que las URLs estén correctas ANTES de processImageUrls
      const imageCompsDB = [];
      const findImageCompsDB = (comps) => {
        comps.forEach(comp => {
          if (comp.type === 'image') {
            imageCompsDB.push({
              id: comp.id,
              content: comp.content,
              esImageRef: typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__'),
              esRutaServidor: typeof comp.content === 'string' && comp.content.startsWith('/templates/')
            });
          }
          if (comp.children) findImageCompsDB(comp.children);
        });
      };
      findImageCompsDB(templateObj.components);
      console.log('🔍 SERVIDOR: Componentes imagen DESDE LA BD:', imageCompsDB);
      
      if (templateObj.components) {
        templateObj.components = this.processImageUrls(templateObj.components, baseUrl);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Template updated successfully',
        data: { template: templateObj }
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
        { type: 'system' }
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
        { type: 'system' }
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
        { type: 'system' }
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
        { type: 'system' }
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
      
      // Función de limpieza de imágenes ELIMINADA
      // Ya no se permite limpiar imágenes manualmente
      
      res.status(410).json({
        status: 'error',
        message: 'Manual image cleanup has been disabled. Images are automatically cleaned when banners are deleted.',
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

  // Endpoint para limpiar imágenes de banners que han sido eliminados de la BD
  cleanupDeletedBannersImages = catchAsync(async (req, res) => {
    console.log('🧹 Solicitada limpieza de imágenes de banners eliminados');
    
    // Solo owners pueden ejecutar esta operación
    if (!req.isOwner) {
      throw new AppError('Solo los administradores pueden ejecutar esta operación', 403);
    }
    
    try {
      const imageProcessorService = require('../services/imageProcessor.service');
      const result = await imageProcessorService.cleanupDeletedBannersImages();
      
      console.log(`✅ Limpieza completada: ${result.deletedBanners} banners eliminados, ${result.deletedFiles} archivos eliminados`);
      
      res.status(200).json({
        status: 'success',
        message: 'Limpieza de imágenes de banners eliminados completada exitosamente',
        data: {
          deletedBanners: result.deletedBanners,
          deletedFiles: result.deletedFiles,
          checkedBanners: result.checkedBanners,
          success: result.success
        }
      });
    } catch (error) {
      console.error(`❌ Error en limpieza de banners eliminados: ${error.message}`);
      throw new AppError(`Error en limpieza de banners eliminados: ${error.message}`, 500);
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
      
      // Las imágenes se limpiarán automáticamente con el cron job cuando se elimine el banner
      // No es necesario limpiar manualmente aquí
      
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

  /**
   * Detecta el idioma de los textos en un banner
   */
  detectLanguages = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const template = await BannerTemplate.findOne({
      _id: id,
      $or: [
        { clientId: req.clientId },
        { type: 'system' }
      ]
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Extraer todos los textos del banner
    const texts = [];
    const extractTexts = (components) => {
      components.forEach(comp => {
        if (comp.content) {
          if (typeof comp.content === 'string') {
            texts.push(comp.content);
          } else if (comp.content.texts?.en) {
            texts.push(comp.content.texts.en);
          }
        }
        if (comp.children) {
          extractTexts(comp.children);
        }
      });
    };

    extractTexts(template.components);

    // Detectar idioma
    let detectedLanguage = 'en';
    if (texts.length > 0) {
      const translationService = require('../services/translation.service');
      const service = new translationService();
      detectedLanguage = await service.detectLanguage(texts.join(' '));
    }

    // Actualizar el banner
    template.translationStats.autoDetectedLanguage = detectedLanguage;
    await template.save();

    res.status(200).json({
      status: 'success',
      data: {
        detectedLanguage,
        textsAnalyzed: texts.length,
        supportedLanguages: template.translationStats.supportedLanguages
      }
    });
  });

  /**
   * Traduce un banner a un idioma específico
   */
  translateBanner = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      throw new AppError('Target language is required', 400);
    }

    const result = await bannerTranslationService.translateBannerComponents(
      id,
      targetLanguage,
      { clientId: req.clientId }
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  /**
   * Obtiene todas las traducciones de un banner
   */
  getBannerTranslations = catchAsync(async (req, res) => {
    const { id } = req.params;

    const translations = await bannerTranslationService.getBannerTranslations(id);

    res.status(200).json({
      status: 'success',
      data: translations
    });
  });

  /**
   * Actualiza una traducción específica
   */
  updateTranslation = catchAsync(async (req, res) => {
    const { id, lang } = req.params;
    const { componentId, text } = req.body;

    const template = await BannerTemplate.findOne({
      _id: id,
      clientId: req.clientId
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Buscar y actualizar el componente
    let updated = false;
    const updateComponent = (components) => {
      for (const comp of components) {
        if (comp.id === componentId) {
          if (!comp.content.texts) {
            comp.content = {
              texts: { en: comp.content },
              originalLanguage: 'en'
            };
          }
          comp.content.texts[lang] = text;
          updated = true;
          return;
        }
        if (comp.children) {
          updateComponent(comp.children);
        }
      }
    };

    updateComponent(template.components);

    if (!updated) {
      throw new AppError('Component not found', 404);
    }

    // Añadir idioma si no existe
    if (!template.translationStats.supportedLanguages.includes(lang)) {
      template.translationStats.supportedLanguages.push(lang);
    }

    await template.save();

    res.status(200).json({
      status: 'success',
      message: 'Translation updated successfully'
    });
  });

  /**
   * Obtiene estadísticas de uso de traducciones
   */
  getTranslationUsage = catchAsync(async (req, res) => {
    const stats = bannerTranslationService.getUsageStats();

    res.status(200).json({
      status: 'success',
      data: stats
    });
  });

  /**
   * Asigna un banner a un cliente específico (solo para owners)
   */
  assignBannerToClient = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const { isOwner } = req;

    // Solo los owners pueden asignar banners a clientes
    if (!isOwner) {
      throw new AppError('No tienes permisos para asignar banners a clientes', 403);
    }

    // Verificar que el banner existe
    const banner = await BannerTemplate.findById(id);
    if (!banner) {
      throw new AppError('Banner no encontrado', 404);
    }

    // Verificar que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError('Cliente no encontrado', 404);
    }

    // Actualizar el banner para asignarlo al cliente
    banner.clientId = clientId;
    banner.type = 'custom'; // Convertir a plantilla personalizada
    await banner.save();

    res.status(200).json({
      status: 'success',
      message: `Banner "${banner.name}" asignado exitosamente al cliente "${client.name}"`,
      data: {
        banner: {
          id: banner._id,
          name: banner.name,
          type: banner.type,
          clientId: banner.clientId
        },
        client: {
          id: client._id,
          name: client.name,
          email: client.email
        }
      }
    });
  });

  /**
   * Desasigna un banner de un cliente (lo convierte en plantilla del sistema)
   */
  unassignBannerFromClient = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isOwner } = req;

    // Solo los owners pueden desasignar banners
    if (!isOwner) {
      throw new AppError('No tienes permisos para desasignar banners', 403);
    }

    // Verificar que el banner existe
    const banner = await BannerTemplate.findById(id);
    if (!banner) {
      throw new AppError('Banner no encontrado', 404);
    }

    // Guardar información del cliente anterior para el mensaje
    const previousClient = banner.clientId ? await Client.findById(banner.clientId) : null;

    // Desasignar el banner (convertirlo en plantilla del sistema)
    banner.clientId = null;
    banner.type = 'system';
    await banner.save();

    res.status(200).json({
      status: 'success',
      message: previousClient 
        ? `Banner "${banner.name}" desasignado del cliente "${previousClient.name}" y convertido en plantilla del sistema`
        : `Banner "${banner.name}" convertido en plantilla del sistema`,
      data: {
        banner: {
          id: banner._id,
          name: banner.name,
          type: banner.type,
          clientId: banner.clientId
        }
      }
    });
  });

  /**
   * Obtiene banners disponibles para asignación a clientes
   */
  getAvailableBannersForAssignment = catchAsync(async (req, res) => {
    const { isOwner } = req;
    const { search, type, status = 'active' } = req.query;

    // Solo los owners pueden ver banners disponibles para asignación
    if (!isOwner) {
      throw new AppError('No tienes permisos para ver banners disponibles para asignación', 403);
    }

    // Construir query
    const query = {
      status: status !== 'all' ? status : { $ne: 'archived' }
    };

    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
      query.type = type;
    }

    // Búsqueda por nombre si se especifica
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Obtener banners con información del cliente asignado
    const banners = await BannerTemplate.find(query)
      .populate('clientId', 'name email status')
      .select('name type status clientId createdAt updatedAt metadata')
      .sort({ updatedAt: -1 });

    // Organizar banners por categorías
    const categorizedBanners = {
      system: banners.filter(b => b.type === 'system'),
      assigned: banners.filter(b => b.type === 'custom' && b.clientId),
      unassigned: banners.filter(b => b.type === 'custom' && !b.clientId)
    };

    res.status(200).json({
      status: 'success',
      data: {
        total: banners.length,
        categories: {
          system: {
            count: categorizedBanners.system.length,
            banners: categorizedBanners.system
          },
          assigned: {
            count: categorizedBanners.assigned.length,
            banners: categorizedBanners.assigned
          },
          unassigned: {
            count: categorizedBanners.unassigned.length,
            banners: categorizedBanners.unassigned
          }
        }
      }
    });
  });

  /**
   * Envía el script del banner por email a usuarios seleccionados
   */
  sendScriptByEmail = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { recipients, domainData } = req.body;
    const { isOwner, clientId: userClientId, user } = req;

    // Validar que hay destinatarios
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('Debe seleccionar al menos un destinatario', 400);
    }

    // Obtener el banner
    const banner = await BannerTemplate.findById(id).populate('clientId');
    if (!banner) {
      throw new AppError('Banner no encontrado', 404);
    }

    // Verificar permisos
    if (!isOwner && banner.clientId?._id.toString() !== userClientId) {
      throw new AppError('No tienes permisos para enviar este banner', 403);
    }

    // Agrupar recipients por dominio y actualizar defaultTemplateId si es necesario
    const domainScripts = {};

    for (const recipient of recipients) {
      const domainId = recipient.domainId;
      
      if (!domainScripts[domainId]) {
        // Obtener el dominio
        const domain = await Domain.findById(domainId);
        if (!domain) {
          throw new AppError(`Dominio no encontrado: ${domainId}`, 404);
        }

        // Actualizar defaultTemplateId si es necesario
        const clientDomainData = Object.values(domainData || {}).find(d => d.domainId === domainId);
        if (clientDomainData && clientDomainData.needsUpdate) {
          if (!domain.settings) {
            domain.settings = {};
          }
          domain.settings.defaultTemplateId = banner._id;
          await domain.save();
          
          logger.info(`✅ DefaultTemplateId actualizado para dominio ${domain.domain}: ${banner._id}`);
        }

        // Generar el script embed de instalación (el script corto que va en el <head>)
        const { getBaseUrl } = require('../config/urls');
        const devMode = process.env.NODE_ENV !== 'production';
        const baseUrl = getBaseUrl();
        const scriptUrl = `${baseUrl}/api/v1/consent/script/${domain._id}/embed.js${devMode ? '?dev=true' : ''}`;
        
        const installCode = `
<!-- Consent Management Platform -->
<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','${scriptUrl}');
</script>
<!-- End Consent Management Platform -->
        `.trim();

        domainScripts[domainId] = {
          domain: domain,
          script: installCode,
          recipients: []
        };
      }

      // Agregar recipient a este dominio
      domainScripts[domainId].recipients.push(recipient);
    }

    // Enviar emails agrupados por dominio
    const allResults = [];
    
    console.log('📧 Iniciando envío de emails...');
    console.log('📊 Resumen de dominios a procesar:', Object.keys(domainScripts).length);
    
    for (const [domainId, domainInfo] of Object.entries(domainScripts)) {
      console.log(`📧 Procesando dominio: ${domainInfo.domain.domain} (${domainInfo.recipients.length} recipients)`);
      
      const emailPromises = domainInfo.recipients.map(async (recipient) => {
        try {
          console.log(`📧 Enviando email a: ${recipient.email} para dominio: ${domainInfo.domain.domain}`);
          
          const emailOptions = {
            email: recipient.email,
            name: recipient.name,
            domain: domainInfo.domain.domain,
            script: domainInfo.script,
            clientName: banner.clientId?.name || 'Cookie21'
          };
          
          console.log('📧 Opciones del email:', {
            email: emailOptions.email,
            name: emailOptions.name,
            domain: emailOptions.domain,
            scriptLength: emailOptions.script?.length || 0,
            clientName: emailOptions.clientName
          });
          
          const result = await emailService.sendEmbedScriptEmail(emailOptions);
          
          console.log(`📧 Resultado para ${recipient.email}:`, result);
          
          return {
            email: recipient.email,
            domain: domainInfo.domain.domain,
            success: result.success,
            error: result.error
          };
        } catch (error) {
          logger.error(`Error enviando email a ${recipient.email}:`, error);
          return {
            email: recipient.email,
            domain: domainInfo.domain.domain,
            success: false,
            error: error.message
          };
        }
      });

      const domainResults = await Promise.all(emailPromises);
      allResults.push(...domainResults);
    }

    const results = allResults;
    
    // Contar éxitos y errores
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    // Registrar en auditoría
    if (Audit) {
      // Determinar clientId para auditoría
      let auditClientId = banner.clientId?._id || userClientId;
      
      // Si no hay clientId válido, usar el primer cliente de los recipients o crear un ID especial
      if (!auditClientId) {
        const firstRecipientClientId = recipients[0]?.clientId;
        if (firstRecipientClientId) {
          auditClientId = firstRecipientClientId;
        } else {
          // Para banners del sistema sin cliente específico, necesitamos un clientId válido
          // Buscar el primer cliente disponible o crear uno temporal
          const Client = require('../models/Client');
          const firstClient = await Client.findOne().select('_id');
          auditClientId = firstClient?._id;
        }
      }
      
      // Solo crear auditoría si tenemos un clientId válido
      if (auditClientId) {
        await Audit.create({
          action: 'generate', // Usar 'generate' como acción más apropiada del enum
          resourceType: 'banner_template',
          resourceId: banner._id,
          userId: user?._id,
          clientId: auditClientId,
          metadata: {
            operation: 'send_script_email',
            bannerName: banner.name,
            bannerType: banner.type,
            recipientCount: recipients.length,
            successCount,
            errorCount,
            results
          }
        });
      } else {
        console.warn('⚠️ No se pudo crear auditoría: no hay clientId válido disponible');
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Script enviado a ${successCount} usuario(s)${errorCount > 0 ? `, ${errorCount} fallo(s)` : ''}`,
      data: {
        sent: successCount,
        failed: errorCount,
        details: results
      }
    });
  });
}

module.exports = new BannerTemplateController();