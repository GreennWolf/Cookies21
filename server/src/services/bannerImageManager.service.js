// services/bannerImageManager.service.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class BannerImageManager {
  constructor() {
    this.tempPrefix = 'temp_';
    // Ruta correcta: usar ruta absoluta desde la ubicación del servicio
    this.baseImagesPath = path.join(__dirname, '../../public', 'templates', 'images');
    // Nueva ruta para archivos temporales
    this.baseTempPath = path.join(__dirname, '../../public', 'templates', 'temp');
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * MÉTODO ORIGINAL RESTAURADO: Para que el editor funcione exactamente igual
   */
  async processImagesUnified({ bannerId, uploadedFiles = [], components = [], isUpdate = false, metadata = {} }) {
    try {
      logger.info(`🔄 [BannerImageManager] PROCESAMIENTO - Banner: ${bannerId}, Archivos: ${uploadedFiles.length}, Update: ${isUpdate}`);
      
      // Validaciones iniciales
      if (!bannerId) {
        throw new Error('BannerId es requerido');
      }

      if (!Array.isArray(uploadedFiles) || !Array.isArray(components)) {
        throw new Error('uploadedFiles y components deben ser arrays');
      }

      // 1. Crear directorio del banner
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      await this.ensureDirectory(bannerDir);

      // NUEVO: Detectar si son archivos IMAGE_REF de creación de clientes
      const hasImageRefFiles = uploadedFiles.some(file => 
        file.originalname && file.originalname.startsWith('IMAGE_REF_')
      );

      if (hasImageRefFiles) {
        // FLUJO ESPECIAL: Para creación de clientes
        logger.info(`🎯 [BannerImageManager] DETECTADO: Creación de clientes con IMAGE_REF`);
        return await this.processClientCreationImages(bannerId, uploadedFiles, components, bannerDir);
      }

      // FLUJO ORIGINAL: Para editor (mantener exactamente igual)
      logger.info(`🎯 [BannerImageManager] DETECTADO: Editor (flujo original)`);

      // 2. Analizar archivos subidos para identificar componentes por ID
      const fileAnalysis = this.analyzeUploadedFiles(uploadedFiles);
      
      logger.info(`📊 [BannerImageManager] Análisis de archivos:`);
      logger.info(`   - Referencias válidas: ${fileAnalysis.validReferences.length}`);
      logger.info(`   - Archivos huérfanos: ${fileAnalysis.orphanedFiles.length}`);
      logger.info(`   - Componentes identificados: ${Array.from(fileAnalysis.componentFileMap.keys())}`);

      // 3. Procesar componentes usando análisis por ID
      const processedComponents = await this.processComponentsUnified(
        JSON.parse(JSON.stringify(components)), 
        fileAnalysis, 
        bannerId, 
        isUpdate
      );

      // 4. DEBUG: Verificar componentes después del procesamiento
      const imageRefsAfterProcessing = [];
      const findImageRefsAfter = (comps, parentPath = '') => {
        comps.forEach((comp, index) => {
          const currentPath = parentPath ? `${parentPath}[${index}]` : `components[${index}]`;
          if (comp.type === 'image') {
            imageRefsAfterProcessing.push({
              path: currentPath,
              id: comp.id,
              content: comp.content,
              contentType: typeof comp.content,
              esImageRef: typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__'),
              esRutaServidor: typeof comp.content === 'string' && comp.content.startsWith('/templates/'),
              parentId: comp.parentId || 'none',
              previewUrl: comp.style?.desktop?._previewUrl || 'no-preview'
            });
          }
          if (comp.children && Array.isArray(comp.children)) {
            findImageRefsAfter(comp.children, `${currentPath}.children`);
          }
        });
      };
      findImageRefsAfter(processedComponents);
      
      logger.info(`🔍 [BannerImageManager] COMPONENTES IMAGEN DESPUÉS DEL PROCESAMIENTO:`, JSON.stringify(imageRefsAfterProcessing, null, 2));

      // 5. Calcular estadísticas reales basadas en archivos procesados
      const processedFiles = uploadedFiles.filter(file => file._processed);
      const stats = {
        total: uploadedFiles.length,
        successful: processedFiles.length,
        failed: uploadedFiles.length - processedFiles.length,
        validReferences: fileAnalysis.validReferences.length,
        orphanedFiles: fileAnalysis.orphanedFiles.length
      };
      logger.info(`📈 [BannerImageManager] ESTADÍSTICAS FINALES:`, stats);

      return {
        success: true,
        components: processedComponents,
        stats,
        bannerDir,
        fileAnalysis
      };

    } catch (error) {
      logger.error(`❌ [BannerImageManager] Error en procesamiento unificado:`, error);
      throw error;
    }
  }

  /**
   * SOLUCIÓN CORRECTA: Actualizar componentes directamente en BD
   */
  async processClientCreationImages(bannerId, uploadedFiles, components, bannerDir) {
    logger.info(`🔄 [BannerImageManager] PROCESAMIENTO DIRECTO EN BD`);
    
    // Importar el modelo BannerTemplate
    const BannerTemplate = require('../models/BannerTemplate');
    
    // 1. Obtener el banner de la BD
    const bannerInDB = await BannerTemplate.findById(bannerId);
    if (!bannerInDB) {
      throw new Error(`Banner ${bannerId} no encontrado en BD`);
    }
    
    logger.info(`🔍 [BannerImageManager] Banner obtenido de BD: ${bannerInDB._id}`);
    
    // 2. Buscar TODOS los componentes imagen recursivamente en BD
    const findAllImageComponents = (comps, path = '') => {
      const imageComponents = [];
      
      comps.forEach((comp, index) => {
        const currentPath = path ? `${path}[${index}]` : `[${index}]`;
        
        if (comp.type === 'image') {
          imageComponents.push({
            component: comp, // Referencia directa al componente en BD
            path: currentPath,
            parentId: comp.parentId || 'root'
          });
        }
        
        // Buscar recursivamente en hijos
        if (comp.children && Array.isArray(comp.children)) {
          const childImages = findAllImageComponents(comp.children, `${currentPath}.children`);
          imageComponents.push(...childImages);
        }
      });
      
      return imageComponents;
    };

    // 3. Encontrar todos los componentes imagen en BD
    const allImageComponents = findAllImageComponents(bannerInDB.components);
    
    logger.info(`🔍 [BannerImageManager] Componentes imagen encontrados en BD: ${allImageComponents.length}`);
    allImageComponents.forEach((imgComp, index) => {
      logger.info(`   ${index}: ${imgComp.component.id} en ${imgComp.path} (parent: ${imgComp.parentId})`);
    });

    // 4. Mapear archivos por orden: archivo[0] → componente[0], archivo[1] → componente[1], etc.
    let processedCount = 0;
    for (let i = 0; i < Math.min(uploadedFiles.length, allImageComponents.length); i++) {
      const file = uploadedFiles[i];
      const imageComp = allImageComponents[i];
      const component = imageComp.component; // Componente directo de BD
      
      // Extraer nombre original del archivo
      const fileName = file.originalname || `file_${Date.now()}`;
      const originalFilename = fileName.replace(/^IMAGE_REF_[^_]+_/, ''); // Quitar prefijo
      
      logger.info(`🎯 [BannerImageManager] Mapeando archivo[${i}] → componente BD[${i}]:`);
      logger.info(`   Archivo: ${originalFilename}`);
      logger.info(`   Componente BD: ${component.id} en ${imageComp.path}`);
      
      try {
        // Guardar imagen
        const result = await this.saveImageSimple(file, component.id, bannerId, originalFilename);
        
        // Actualizar el componente DIRECTAMENTE en BD
        logger.info(`🔄 [BannerImageManager] ANTES de actualizar componente BD ${component.id}:`);
        logger.info(`   content: ${component.content}`);
        logger.info(`   _previewUrl desktop: ${component.style?.desktop?._previewUrl}`);
        
        component.content = result.imageUrl;
        
        // Actualizar _previewUrl para todos los dispositivos
        if (!component.style) component.style = {};
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (!component.style[device]) component.style[device] = {};
          component.style[device]._previewUrl = result.imageUrl;
        });
        
        // CRÍTICO: Marcar el array components como modificado para Mongoose
        bannerInDB.markModified('components');
        
        logger.info(`✅ [BannerImageManager] DESPUÉS de actualizar componente BD ${component.id}:`);
        logger.info(`   content: ${component.content}`);
        logger.info(`   _previewUrl desktop: ${component.style?.desktop?._previewUrl}`);
        logger.info(`   _previewUrl tablet: ${component.style?.tablet?._previewUrl}`);
        logger.info(`   _previewUrl mobile: ${component.style?.mobile?._previewUrl}`);
        logger.info(`🔧 [BannerImageManager] Array components marcado como modificado para Mongoose`);
        processedCount++;
        
      } catch (error) {
        logger.error(`❌ [BannerImageManager] Error procesando ${component.id}:`, error.message);
      }
    }
    
    // 5. Guardar el banner actualizado en BD
    logger.info(`💾 [BannerImageManager] Guardando banner actualizado en BD...`);
    await bannerInDB.save();
    logger.info(`✅ [BannerImageManager] Banner guardado en BD con componentes actualizados`);

    // Estadísticas simples
    const stats = {
      total: uploadedFiles.length,
      successful: processedCount,
      failed: uploadedFiles.length - processedCount
    };
    
    logger.info(`📈 [BannerImageManager] ESTADÍSTICAS IMAGE_REF: ${processedCount}/${uploadedFiles.length} imágenes procesadas`);

    return {
      success: true,
      components: bannerInDB.components, // Devolver los componentes actualizados de BD
      stats,
      bannerDir
    };
  }

  /**
   * FLUJO ORIGINAL: Procesar archivos del editor (mantener lógica existente)
   */
  async processEditorFiles(bannerId, uploadedFiles, components, isUpdate, bannerDir) {
    logger.info(`🔄 [BannerImageManager] PROCESANDO ARCHIVOS EDITOR`);
    
    // 2. Analizar archivos subidos para identificar componentes por ID
    const fileAnalysis = this.analyzeUploadedFiles(uploadedFiles);
    
    logger.info(`📊 [BannerImageManager] Análisis de archivos:`);
    logger.info(`   - Referencias válidas: ${fileAnalysis.validReferences.length}`);
    logger.info(`   - Archivos huérfanos: ${fileAnalysis.orphanedFiles.length}`);
    logger.info(`   - Componentes identificados: ${Array.from(fileAnalysis.componentFileMap.keys())}`);

    // 3. Procesar componentes usando análisis por ID
    const processedComponents = await this.processComponentsUnified(
      JSON.parse(JSON.stringify(components)), 
      fileAnalysis, 
      bannerId, 
      isUpdate
    );

    // 4. DEBUG: Verificar componentes después del procesamiento
    const imageRefsAfterProcessing = [];
    const findImageRefsAfter = (comps, parentPath = '') => {
      comps.forEach((comp, index) => {
        const currentPath = parentPath ? `${parentPath}[${index}]` : `components[${index}]`;
        if (comp.type === 'image') {
          imageRefsAfterProcessing.push({
            path: currentPath,
            id: comp.id,
            content: comp.content,
            contentType: typeof comp.content,
            esImageRef: typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__'),
            esRutaServidor: typeof comp.content === 'string' && comp.content.startsWith('/templates/'),
            parentId: comp.parentId || 'none',
            previewUrl: comp.style?.desktop?._previewUrl || 'no-preview'
          });
        }
        if (comp.children && Array.isArray(comp.children)) {
          findImageRefsAfter(comp.children, `${currentPath}.children`);
        }
      });
    };
    findImageRefsAfter(processedComponents);
    
    logger.info(`🔍 [BannerImageManager] COMPONENTES IMAGEN DESPUÉS DEL PROCESAMIENTO:`, JSON.stringify(imageRefsAfterProcessing, null, 2));

    // 5. Calcular estadísticas reales basadas en archivos procesados
    const processedFiles = uploadedFiles.filter(file => file._processed);
    const stats = {
      total: uploadedFiles.length,
      successful: processedFiles.length,
      failed: uploadedFiles.length - processedFiles.length,
      validReferences: fileAnalysis.validReferences.length,
      orphanedFiles: fileAnalysis.orphanedFiles.length
    };
    logger.info(`📈 [BannerImageManager] ESTADÍSTICAS FINALES:`, stats);

    return {
      success: true,
      components: processedComponents,
      stats,
      bannerDir,
      fileAnalysis
    };
  }

  /**
   * NUEVO: Analiza archivos subidos con mejor algoritmo de detección
   */
  analyzeUploadedFiles(uploadedFiles) {
    const analysis = {
      validReferences: [],
      orphanedFiles: [],
      componentFileMap: new Map(),
      totalSize: 0,
      filesByType: new Map()
    };

    logger.info(`🔍 [BannerImageManager] Analizando ${uploadedFiles.length} archivos...`);

    uploadedFiles.forEach((file, index) => {
      const fileName = file.originalname || `file_${index}`;
      analysis.totalSize += file.size || 0;

      // Detectar tipo de archivo
      const fileExt = path.extname(fileName).toLowerCase();
      if (!analysis.filesByType.has(fileExt)) {
        analysis.filesByType.set(fileExt, 0);
      }
      analysis.filesByType.set(fileExt, analysis.filesByType.get(fileExt) + 1);

      // Validar formato
      if (!this.supportedFormats.includes(fileExt)) {
        logger.warn(`⚠️ [BannerImageManager] Formato no soportado: ${fileName} (${fileExt})`);
        return;
      }

      // PATRÓN CORREGIDO: IMAGE_REF_componentId_originalFilename
      // Como el componentId puede contener underscores, buscamos desde el final
      const imageRefMatch = fileName.match(/^IMAGE_REF_(.+)$/);
      if (imageRefMatch) {
        const remainder = imageRefMatch[1]; // todo después de IMAGE_REF_
        const lastUnderscoreIndex = remainder.lastIndexOf('_');
        
        if (lastUnderscoreIndex > 0) {
          const componentId = remainder.substring(0, lastUnderscoreIndex);
          const originalFilename = remainder.substring(lastUnderscoreIndex + 1);
          
          const reference = {
            file,
            componentId,
            timestamp: Date.now(), // No tenemos timestamp separado, usar actual
            fileName,
            originalFilename,
            confidence: 0.95,
            pattern: 'corrected_ref',
            index
          };

          analysis.validReferences.push(reference);
          
          // Agregar al mapa de componentes
          if (!analysis.componentFileMap.has(componentId)) {
            analysis.componentFileMap.set(componentId, []);
          }
          analysis.componentFileMap.get(componentId).push(reference);

          logger.info(`✅ [BannerImageManager] Referencia CORREGIDA detectada - Componente: ${componentId}, Archivo: ${fileName}`);
          return;
        }
      }

      // PATRÓN LEGACY: Compatibilidad con formato anterior
      const legacyMatch = fileName.match(/IMAGE_REF_([^_]+_[^_]+_[^_]+)_/);
      if (legacyMatch) {
        const componentId = legacyMatch[1];
        
        const reference = {
          file,
          componentId,
          fileName,
          confidence: 0.8,
          pattern: 'legacy_ref',
          index
        };

        analysis.validReferences.push(reference);
        
        if (!analysis.componentFileMap.has(componentId)) {
          analysis.componentFileMap.set(componentId, []);
        }
        analysis.componentFileMap.get(componentId).push(reference);

        logger.info(`✅ [BannerImageManager] Referencia legacy detectada - Componente: ${componentId}, Archivo: ${fileName}`);
        return;
      }

      // Si no coincide con ningún patrón
      analysis.orphanedFiles.push({
        file,
        fileName,
        reason: 'no_pattern_match'
      });
      logger.warn(`🚫 [BannerImageManager] Archivo sin patrón: ${fileName}`);
    });

    // Log resumen
    logger.info(`📋 [BannerImageManager] ANÁLISIS COMPLETADO:`);
    logger.info(`   - Referencias válidas: ${analysis.validReferences.length}`);
    logger.info(`   - Archivos huérfanos: ${analysis.orphanedFiles.length}`);
    logger.info(`   - Componentes con archivos: ${analysis.componentFileMap.size}`);
    logger.info(`   - Tamaño total: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);

    return analysis;
  }

  /**
   * NUEVO: Procesa componentes con algoritmo unificado
   */
  async processComponentsUnified(components, fileAnalysis, bannerId, isUpdate, parentPath = '') {
    if (!Array.isArray(components)) return components;

    const processed = [];

    for (const comp of components) {
      const processedComp = { ...comp };
      const currentPath = parentPath ? `${parentPath} > ${comp.type}(${comp.id})` : `${comp.type}(${comp.id})`;

      // Procesar componente de imagen
      if (processedComp.type === 'image') {
        logger.info(`🖼️ [BannerImageManager] Procesando imagen: ${currentPath}`);
        await this.processImageComponentUnified(processedComp, fileAnalysis, bannerId, isUpdate);
      }

      // Procesar hijos recursivamente (soporte para contenedores)
      if (processedComp.children && Array.isArray(processedComp.children)) {
        logger.info(`📦 [BannerImageManager] Procesando contenedor con ${processedComp.children.length} hijos: ${currentPath}`);
        processedComp.children = await this.processComponentsUnified(
          processedComp.children,
          fileAnalysis,
          bannerId,
          isUpdate,
          currentPath
        );
      }

      processed.push(processedComp);
    }

    return processed;
  }

  /**
   * NUEVO: Procesa un componente de imagen individual con mejor lógica
   */
  async processImageComponentUnified(component, fileAnalysis, bannerId, isUpdate) {
    const componentId = component.id;
    logger.info(`🎯 [BannerImageManager] Procesando componente imagen: ${componentId}`, {
      content: component.content,
      type: component.type,
      tieneReferenciaTemporal: typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')
    });
    
    // DEBUG ESPECÍFICO: Para componentes hijos
    if (component.parentId) {
      logger.info(`👶 [BannerImageManager] COMPONENTE HIJO detectado:`, {
        id: componentId,
        parentId: component.parentId,
        content: component.content,
        tieneReferenciaTemporal: component.content?.startsWith('__IMAGE_REF__')
      });
      
      // Mostrar todos los archivos disponibles
      logger.info(`📁 [BannerImageManager] Archivos disponibles en análisis:`, 
        Array.from(fileAnalysis.componentFileMap.keys())
      );
    }

    // Buscar archivo asociado
    const associatedFiles = fileAnalysis.componentFileMap.get(componentId) || [];
    
    if (associatedFiles.length > 0) {
      // Tomar el archivo con mayor confianza
      const bestMatch = associatedFiles.sort((a, b) => b.confidence - a.confidence)[0];
      
      logger.info(`📁 [BannerImageManager] Archivo encontrado para ${componentId}: ${bestMatch.fileName} (confianza: ${bestMatch.confidence})`);
      
      try {
        await this.saveImageFileUnified(bestMatch.file, component, bannerId);
        bestMatch.file._processed = true;
        logger.info(`✅ [BannerImageManager] Imagen procesada exitosamente para ${componentId}`, {
          nuevoContent: component.content,
          esRutaServidor: typeof component.content === 'string' && component.content.startsWith('/templates/')
        });
      } catch (error) {
        logger.error(`❌ [BannerImageManager] Error guardando imagen para ${componentId}:`, error);
        throw error;
      }
    } else {
      // No hay archivo nuevo
      if (isUpdate) {
        logger.info(`🔄 [BannerImageManager] Update sin archivo nuevo para ${componentId}, manteniendo contenido existente`);
        this.validateExistingImageContent(component);
      } else {
        if (component.parentId) {
          logger.error(`❌ [BannerImageManager] COMPONENTE HIJO SIN ARCHIVO: ${componentId}`, {
            parentId: component.parentId,
            content: component.content,
            archivosBuscados: Array.from(fileAnalysis.componentFileMap.keys()),
            totalArchivos: fileAnalysis.componentFileMap.size
          });
        } else {
          logger.warn(`⚠️ [BannerImageManager] CREATE sin archivo para ${componentId}`);
        }
      }
    }

    // Aplicar configuraciones adicionales
    this.applyImageSettingsUnified(component);
  }

  /**
   * NUEVO: Método simple para guardar imagen
   */
  async saveImageSimple(file, componentId, bannerId, originalFilename) {
    try {
      // Validaciones básicas
      if (!file.path || !fsSync.existsSync(file.path)) {
        throw new Error(`Archivo temporal no encontrado: ${file.path}`);
      }

      const stats = await fs.stat(file.path);
      if (stats.size === 0) {
        throw new Error('Archivo temporal está vacío');
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(`Archivo demasiado grande: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      }

      logger.info(`💾 [BannerImageManager] Guardando imagen para ${componentId}: ${originalFilename}`);

      // Nombre simple: mantener extension, limpiar nombre, agregar timestamp
      const extension = path.extname(originalFilename) || '.jpg';
      let baseName = path.basename(originalFilename, extension);
      
      // Limpiar caracteres especiales pero mantener el nombre recognizable
      baseName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      if (baseName.length > 30) {
        baseName = baseName.substring(0, 30);
      }
      
      const timestamp = Date.now();
      const fileName = `${baseName}_${timestamp}${extension}`;
      
      // Rutas
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      const destPath = path.join(bannerDir, fileName);
      
      // Asegurar directorio existe
      await this.ensureDirectory(bannerDir);
      
      // Copiar archivo
      await fs.copyFile(file.path, destPath);
      
      // Verificar copia
      if (!fsSync.existsSync(destPath)) {
        throw new Error(`Error copiando archivo a: ${destPath}`);
      }
      
      // URL final con dominio completo
      const { getBaseUrl } = require('../config/urls');
      const baseUrl = getBaseUrl();
      const imageUrl = `${baseUrl}/templates/images/${bannerId}/${fileName}`;
      
      logger.info(`✅ [BannerImageManager] Imagen guardada: ${imageUrl}`);
      
      return {
        success: true,
        imageUrl,
        fileName,
        filePath: destPath
      };
      
    } catch (error) {
      logger.error(`❌ [BannerImageManager] Error guardando imagen:`, error);
      throw error;
    }
  }

  /**
   * SIMPLIFICADO: Guarda archivo con nombre original
   */
  async saveImageFileSimplified(file, component, bannerId) {
    try {
      // Validaciones del archivo
      if (!file.path || !fsSync.existsSync(file.path)) {
        throw new Error(`Archivo temporal no encontrado: ${file.path}`);
      }

      const stats = await fs.stat(file.path);
      if (stats.size === 0) {
        throw new Error('Archivo temporal está vacío');
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(`Archivo demasiado grande: ${(stats.size / 1024 / 1024).toFixed(2)}MB (máximo: ${this.maxFileSize / 1024 / 1024}MB)`);
      }

      logger.info(`💾 [BannerImageManager] Guardando archivo para ${component.id}: ${file.originalname} (${(stats.size / 1024).toFixed(2)} KB)`);

      // Sanitización robusta para producción Linux/Windows
      const originalName = file.originalname || 'image.jpg';
      const extension = path.extname(originalName) || '.jpg';
      let baseName = path.basename(originalName, extension);
      
      // PASO 1: Remover prefijos problemáticos completamente
      baseName = baseName.replace(/^__IMAGE_REF__/g, '');
      baseName = baseName.replace(/IMAGE_REF/g, '');
      baseName = baseName.replace(/^comp-/g, '');
      
      // PASO 2: Limpiar caracteres no permitidos (solo alfanuméricos y guiones)
      baseName = baseName.replace(/[^a-zA-Z0-9-]/g, '');
      
      // PASO 3: Limpiar múltiples guiones consecutivos
      baseName = baseName.replace(/-+/g, '-');
      baseName = baseName.replace(/^-+|-+$/g, '');
      
      // PASO 4: Si está vacío o muy corto, usar nombre basado en componente
      if (!baseName || baseName.length < 3) {
        baseName = `img-comp-${component.id}`;
      }
      
      // PASO 5: Truncar si es muy largo (máximo 30 caracteres para compatibilidad)
      if (baseName.length > 30) {
        baseName = baseName.substring(0, 30);
      }
      
      const timestamp = Date.now();
      const fileName = `${baseName}-${timestamp}${extension}`;

      // Log del proceso de sanitización
      logger.info(`🧹 [BannerImageManager] Sanitización de nombre:`);
      logger.info(`  - Original: ${file.originalname}`);
      logger.info(`  - Sanitizado: ${fileName}`);
      logger.info(`  - ComponentId: ${component.id}`);
      logger.info(`  - Extension: ${extension}`);

      // Rutas
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      const destPath = path.join(bannerDir, fileName);

      // Asegurar directorio
      logger.info(`📂 [BannerImageManager] Directorio base: ${this.baseImagesPath}`);
      logger.info(`📂 [BannerImageManager] Directorio banner: ${bannerDir}`);
      
      const baseExists = fsSync.existsSync(this.baseImagesPath);
      logger.info(`📂 [BannerImageManager] Directorio base existe: ${baseExists}`);
      
      await this.ensureDirectory(bannerDir);
      
      const bannerDirExists = fsSync.existsSync(bannerDir);
      logger.info(`📂 [BannerImageManager] Directorio banner creado/existe: ${bannerDirExists}`);

      // Copiar archivo
      logger.info(`📁 [BannerImageManager] Copiando desde: ${file.path}`);
      logger.info(`📁 [BannerImageManager] Copiando hacia: ${destPath}`);
      logger.info(`📁 [BannerImageManager] Directorio destino existe: ${fsSync.existsSync(bannerDir)}`);
      
      await fs.copyFile(file.path, destPath);
      logger.info(`✅ [BannerImageManager] Copia completada`);

      // Verificar copia
      const fileExists = fsSync.existsSync(destPath);
      logger.info(`🔍 [BannerImageManager] Archivo existe después de copia: ${fileExists}`);
      
      if (!fileExists) {
        throw new Error(`Archivo no se creó en destino: ${destPath}`);
      }
      
      const savedStats = await fs.stat(destPath);
      logger.info(`📊 [BannerImageManager] Tamaño archivo guardado: ${savedStats.size} bytes`);
      
      if (savedStats.size !== stats.size) {
        throw new Error(`Copia corrupta: original ${stats.size} bytes, copia ${savedStats.size} bytes`);
      }

      // Construir URL
      const imageUrl = `/templates/images/${bannerId}/${fileName}`;

      // Actualizar contenido del componente
      this.updateComponentContent(component, imageUrl);

      logger.info(`✅ [BannerImageManager] Imagen guardada: ${imageUrl}`);
      logger.info(`🔄 [BannerImageManager] Componente actualizado:`, {
        id: component.id,
        contentAntes: component.content?.startsWith?.('__IMAGE_REF__') ? 'IMAGE_REF' : component.content,
        contentDespues: imageUrl
      });

      return {
        success: true,
        imageUrl,
        fileName
      };

    } catch (error) {
      logger.error(`❌ [BannerImageManager] Error guardando imagen:`, error);
      throw error;
    }
  }

  /**
   * NUEVO: Guarda archivo con validaciones mejoradas
   */
  async saveImageFileUnified(file, component, bannerId) {
    // Redirigir al método simplificado
    return this.saveImageFileSimplified(file, component, bannerId);
  }

  /**
   * NUEVO: Actualiza el contenido del componente de manera robusta
   */
  updateComponentContent(component, imageUrl) {
    // Manejar diferentes formatos de contenido
    if (typeof component.content === 'string') {
      component.content = imageUrl;
    } else if (component.content && typeof component.content === 'object') {
      if (component.content.texts) {
        // Formato multiidioma
        component.content.texts.en = imageUrl;
      } else {
        // Convertir a string simple
        component.content = imageUrl;
      }
    } else {
      // Crear contenido nuevo
      component.content = imageUrl;
    }

    // IMPORTANTE: Actualizar _previewUrl en todos los dispositivos con la URL final
    if (!component.style) {
      component.style = {};
    }
    
    ['desktop', 'tablet', 'mobile'].forEach(device => {
      if (!component.style[device]) {
        component.style[device] = {};
      }
      
      // Establecer _previewUrl con la URL final de la imagen
      component.style[device]._previewUrl = imageUrl;
      
      // Limpiar referencias temporales
      delete component.style[device]._tempFile;
      delete component.style[device]._tempFileRef;
    });
    
    logger.info(`🔄 [BannerImageManager] Actualizado content y _previewUrl para ${component.id}: ${imageUrl}`);
  }

  /**
   * NUEVO: Valida contenido de imagen existente
   */
  validateExistingImageContent(component) {
    const content = component.content;
    
    if (!content) {
      logger.warn(`⚠️ [BannerImageManager] Componente ${component.id} sin contenido`);
      return false;
    }

    if (typeof content === 'string') {
      if (content.startsWith('/templates/images/')) {
        logger.info(`✅ [BannerImageManager] Contenido válido para ${component.id}: ${content}`);
        return true;
      } else if (content.startsWith('__IMAGE_REF__')) {
        logger.warn(`⚠️ [BannerImageManager] Referencia temporal sin resolver para ${component.id}: ${content}`);
        return false;
      }
    }

    logger.info(`🔍 [BannerImageManager] Contenido de formato especial para ${component.id}`);
    return true;
  }

  /**
   * NUEVO: Aplica configuraciones de imagen de manera unificada
   */
  applyImageSettingsUnified(component) {
    if (!component._imageSettings) return;

    logger.info(`🎨 [BannerImageManager] Aplicando configuraciones a ${component.id}`);

    // Aplicar configuraciones por dispositivo
    ['desktop', 'tablet', 'mobile'].forEach(device => {
      if (!component.style) component.style = {};
      if (!component.style[device]) component.style[device] = {};

      const settings = component._imageSettings;
      const deviceStyle = component.style[device];

      // Aplicar dimensiones
      if (settings.widthRaw !== undefined) {
        const width = parseInt(settings.widthRaw);
        if (!isNaN(width) && width > 0) {
          deviceStyle.width = `${width}px`;
        }
      }

      if (settings.heightRaw !== undefined) {
        const height = parseInt(settings.heightRaw);
        if (!isNaN(height) && height > 0) {
          deviceStyle.height = `${height}px`;
        }
      }

      // Aplicar posición
      if (settings.position) {
        if (settings.position.left !== undefined) {
          deviceStyle.left = `${parseFloat(settings.position.left)}px`;
        }
        if (settings.position.top !== undefined) {
          deviceStyle.top = `${parseFloat(settings.position.top)}px`;
        }
      }

      // Aplicar propiedades de objeto
      if (settings.objectFit) {
        deviceStyle.objectFit = settings.objectFit;
      }
      if (settings.objectPosition) {
        deviceStyle.objectPosition = settings.objectPosition;
      }
    });

    // Limpiar configuración temporal
    delete component._imageSettings;
  }

  /**
   * NUEVO: Genera estadísticas del procesamiento
   */
  generateProcessingStats(fileAnalysis, components) {
    const stats = {
      totalFiles: fileAnalysis.validReferences.length + fileAnalysis.orphanedFiles.length,
      successful: 0,
      failed: fileAnalysis.orphanedFiles.length,
      imageComponents: 0,
      containersWithImages: 0
    };

    // Contar componentes procesados
    const countComponents = (comps) => {
      comps.forEach(comp => {
        if (comp.type === 'image') {
          stats.imageComponents++;
          if (comp.content && typeof comp.content === 'string' && comp.content.startsWith('/templates/images/')) {
            stats.successful++;
          }
        } else if (comp.type === 'container' && comp.children) {
          const hasImages = comp.children.some(child => child.type === 'image');
          if (hasImages) {
            stats.containersWithImages++;
          }
          countComponents(comp.children);
        }
      });
    };

    countComponents(components);

    return stats;
  }

  /**
   * Procesa imágenes para un banner (create o update)
   * @param {Object} options - Opciones de procesamiento
   * @param {string} options.bannerId - ID del banner (real o temporal)
   * @param {Array} options.uploadedFiles - Archivos subidos por multer
   * @param {Array} options.components - Componentes del banner
   * @param {boolean} options.isUpdate - Si es una actualización (true) o creación (false)
   * @returns {Object} - Resultado del procesamiento
   */
  async processImages({ bannerId, uploadedFiles, components, isUpdate = false }) {
    try {
      logger.info(`[ImageManager] Procesando ${uploadedFiles.length} imágenes para banner ${bannerId} (${isUpdate ? 'UPDATE' : 'CREATE'})`);
      
      // 1. Crear directorio del banner si no existe
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      await this.ensureDirectory(bannerDir);
      
      // 2. Procesar cada archivo y asociarlo con componentes
      const processedImages = [];
      const componentFileMap = this.createComponentFileMap(uploadedFiles);
      
      // 3. Procesar componentes recursivamente
      const processedComponents = await this.processComponentsRecursive(
        components, 
        componentFileMap, 
        bannerId, 
        isUpdate
      );
      
      // 4. Mover archivos no asociados (si los hay)
      for (const file of uploadedFiles) {
        if (!file._processed) {
          logger.warn(`[ImageManager] Archivo no asociado a ningún componente: ${file.originalname}`);
        }
      }
      
      // Debug: verificar resultado final
      logger.info(`[ImageManager] === RESULTADO FINAL DEL PROCESAMIENTO ===`);
      this.logComponentsWithImages(processedComponents);
      
      return {
        success: true,
        components: processedComponents,
        processedImages: processedImages.length,
        bannerDir
      };
      
    } catch (error) {
      logger.error(`[ImageManager] Error procesando imágenes:`, error);
      throw error;
    }
  }

  /**
   * Crea un mapa de archivos por componente ID
   */
  createComponentFileMap(uploadedFiles) {
    const componentFileMap = new Map();
    
    logger.info(`[ImageManager] Creando mapa de archivos. Total archivos: ${uploadedFiles.length}`);
    
    uploadedFiles.forEach(file => {
      logger.info(`[ImageManager] Analizando archivo: ${file.originalname}`);
      
      // Patrón 1: IMAGE_REF_componentId_ (captura IDs hasta el siguiente underscore)
      const imageRefMatch = file.originalname.match(/IMAGE_REF_([^_]+_[^_]+_[^_]+)_/);
      if (imageRefMatch && imageRefMatch[1]) {
        const componentId = imageRefMatch[1];
        logger.info(`[ImageManager] Match IMAGE_REF encontrado. ComponentId extraído: "${componentId}"`);
        logger.info(`[ImageManager] Archivo completo: "${file.originalname}"`);
        logger.info(`[ImageManager] Tipo de componentId: ${typeof componentId}, longitud: ${componentId.length}`);
        
        if (!componentFileMap.has(componentId)) {
          componentFileMap.set(componentId, []);
        }
        componentFileMap.get(componentId).push({
          file,
          confidence: 0.9,
          pattern: 'image_ref'
        });
        logger.info(`[ImageManager] Archivo ${file.originalname} asociado a componente ${componentId} (IMAGE_REF)`);
        return;
      }
      
      // Patrón 2: Incluye componentId en el nombre
      const compIdMatch = file.originalname.match(/(comp-[^_]+)|(image_[^_]+)/);
      if (compIdMatch) {
        const componentId = compIdMatch[0];
        if (!componentFileMap.has(componentId)) {
          componentFileMap.set(componentId, []);
        }
        componentFileMap.get(componentId).push({
          file,
          confidence: 0.7,
          pattern: 'comp_id'
        });
        logger.info(`[ImageManager] Archivo ${file.originalname} asociado a componente ${componentId} (COMP_ID)`);
        return;
      }
      
      logger.warn(`[ImageManager] No se pudo asociar archivo: ${file.originalname}`);
    });
    
    // Debug: mostrar resumen del mapa
    logger.info(`[ImageManager] Mapa de componentes creado. Total entradas: ${componentFileMap.size}`);
    componentFileMap.forEach((files, componentId) => {
      logger.info(`[ImageManager]   - ${componentId}: ${files.length} archivo(s)`);
    });
    
    return componentFileMap;
  }

  /**
   * Procesa componentes recursivamente para manejar imágenes
   */
  async processComponentsRecursive(components, componentFileMap, bannerId, isUpdate, parentPath = '') {
    if (!Array.isArray(components)) return components;
    
    const processedComponents = [];
    
    for (const comp of components) {
      const processedComp = { ...comp };
      const currentPath = parentPath ? `${parentPath} > ${comp.type}(${comp.id})` : `${comp.type}(${comp.id})`;
      
      // Procesar componente de imagen
      if (processedComp.type === 'image') {
        logger.info(`[ImageManager] Procesando imagen en path: ${currentPath}`);
        await this.processImageComponent(processedComp, componentFileMap, bannerId, isUpdate);
      }
      
      // Procesar hijos recursivamente
      if (processedComp.children && Array.isArray(processedComp.children)) {
        logger.info(`[ImageManager] Procesando ${processedComp.children.length} hijos de ${currentPath}`);
        processedComp.children = await this.processComponentsRecursive(
          processedComp.children, 
          componentFileMap, 
          bannerId, 
          isUpdate,
          currentPath
        );
      }
      
      processedComponents.push(processedComp);
    }
    
    return processedComponents;
  }

  /**
   * Procesa un componente de imagen individual
   */
  async processImageComponent(component, componentFileMap, bannerId, isUpdate) {
    const componentId = component.id;
    logger.info(`[ImageManager] Procesando componente imagen: ${componentId}`);
    logger.info(`[ImageManager] Content actual: ${component.content}`);
    logger.info(`[ImageManager] Es update: ${isUpdate}`);
    
    // Buscar archivo para este componente
    let fileToProcess = null;
    
    // 1. Buscar en el mapa de componentes
    logger.info(`[ImageManager] Buscando archivo para componentId: "${componentId}" en mapa con ${componentFileMap.size} entradas`);
    
    if (componentFileMap.has(componentId)) {
      const filesForComponent = componentFileMap.get(componentId);
      logger.info(`[ImageManager] Encontrados ${filesForComponent.length} archivos para ${componentId}`);
      
      if (filesForComponent.length > 0) {
        // Usar el archivo con mayor confianza
        const bestMatch = filesForComponent.sort((a, b) => b.confidence - a.confidence)[0];
        fileToProcess = bestMatch.file;
        fileToProcess._processed = true; // Marcar como procesado
        logger.info(`[ImageManager] Archivo seleccionado para ${componentId}: ${fileToProcess.originalname}`);
      }
    } else {
      logger.warn(`[ImageManager] No se encontró entrada en el mapa para componentId: "${componentId}"`);
      
      // Debug: mostrar todas las claves del mapa
      logger.info(`[ImageManager] Claves disponibles en el mapa:`);
      componentFileMap.forEach((files, key) => {
        logger.info(`[ImageManager]   - "${key}"`);
      });
    }
    
    // 2. Si hay archivo, procesarlo
    if (fileToProcess) {
      await this.saveImageFile(fileToProcess, component, bannerId);
    } else {
      // 3. Si no hay archivo nuevo y es update, mantener URL existente
      if (isUpdate && component.content && typeof component.content === 'string') {
        if (component.content.startsWith('/templates/images/')) {
          logger.info(`[ImageManager] Manteniendo imagen existente para ${componentId}: ${component.content}`);
        } else if (component.content.startsWith('__IMAGE_REF__')) {
          logger.warn(`[ImageManager] Componente ${componentId} tiene referencia temporal pero no se encontró archivo`);
        }
      } else if (!isUpdate) {
        logger.warn(`[ImageManager] No se encontró archivo para componente ${componentId} en CREATE`);
      }
    }
    
    // 4. Aplicar configuración de estilo si existe
    this.applyImageSettings(component);
  }

  /**
   * Guarda un archivo de imagen y actualiza el componente
   */
  async saveImageFile(file, component, bannerId) {
    try {
      // Verificar que el archivo temporal existe
      const stats = await fs.stat(file.path);
      if (stats.size === 0) {
        throw new Error(`Archivo temporal vacío: ${file.path}`);
      }
      
      logger.info(`[ImageManager] Guardando archivo: ${file.originalname} (${stats.size} bytes)`);
      
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = path.extname(file.originalname) || '.jpg';
      const fileName = `img_${component.id}_${timestamp}${extension}`;
      
      // Rutas de origen y destino
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      const destPath = path.join(bannerDir, fileName);
      
      // Asegurar que existe el directorio
      await this.ensureDirectory(bannerDir);
      
      // Copiar archivo
      await fs.copyFile(file.path, destPath);
      
      // Verificar que se copió correctamente
      const savedStats = await fs.stat(destPath);
      if (savedStats.size === 0) {
        throw new Error(`Archivo guardado está vacío: ${destPath}`);
      }
      
      // Actualizar URL del componente
      const imageUrl = `/templates/images/${bannerId}/${fileName}`;
      
      // Manejar diferentes formatos de content
      if (typeof component.content === 'string') {
        component.content = imageUrl;
      } else if (component.content && typeof component.content === 'object' && component.content.texts) {
        component.content.texts.en = imageUrl;
      } else {
        component.content = imageUrl;
      }
      
      logger.info(`[ImageManager] Imagen guardada exitosamente: ${imageUrl}`);
      
    } catch (error) {
      logger.error(`[ImageManager] Error guardando imagen para ${component.id}:`, error);
      throw error;
    }
  }

  /**
   * Aplica configuración de estilo a un componente de imagen
   */
  applyImageSettings(component) {
    if (!component._imageSettings) return;
    
    logger.info(`[ImageManager] Aplicando configuración de estilo a ${component.id}`);
    
    ['desktop', 'tablet', 'mobile'].forEach(device => {
      if (!component.style || !component.style[device]) return;
      
      const settings = component._imageSettings;
      
      // Aplicar posición
      if (settings.position) {
        if (settings.position.left !== undefined) {
          const left = parseFloat(settings.position.left);
          component.style[device].left = `${left}px`;
        }
        if (settings.position.top !== undefined) {
          const top = parseFloat(settings.position.top);
          component.style[device].top = `${top}px`;
        }
        
        // Guardar posición personalizada
        component.style[device]._customPosition = {
          left: parseFloat(settings.position.left),
          top: parseFloat(settings.position.top),
          mode: 'pixels'
        };
      }
      
      // Aplicar dimensiones
      if (settings.width !== undefined || settings.height !== undefined) {
        component.style[device]._customDimensions = { mode: 'pixels' };
        
        if (settings.widthRaw !== undefined) {
          const width = parseInt(settings.widthRaw);
          if (!isNaN(width) && width > 0) {
            component.style[device].width = `${width}px`;
            component.style[device]._customDimensions.width = width;
          }
        }
        
        if (settings.heightRaw !== undefined) {
          const height = parseInt(settings.heightRaw);
          if (!isNaN(height) && height > 0) {
            component.style[device].height = `${height}px`;
            component.style[device]._customDimensions.height = height;
          }
        }
      }
      
      // Aplicar propiedades de objeto
      if (settings.objectFit) {
        component.style[device].objectFit = settings.objectFit;
      }
      if (settings.objectPosition) {
        component.style[device].objectPosition = settings.objectPosition;
      }
    });
    
    // Limpiar configuración temporal
    delete component._imageSettings;
  }

  /**
   * Finaliza el procesamiento después de guardar en BD (alias)
   */
  async finalizeImages({ tempBannerId, realBannerId, components }) {
    return this.finalizeImageProcessing({ 
      tempBannerId, 
      finalBannerId: realBannerId, 
      components 
    });
  }

  /**
   * Finaliza el procesamiento después de guardar en BD
   */
  async finalizeImageProcessing({ tempBannerId, finalBannerId, components }) {
    if (!tempBannerId || tempBannerId === finalBannerId) {
      logger.info(`[ImageManager] No se requiere finalización (bannerId: ${finalBannerId})`);
      return { components, updated: false };
    }
    
    try {
      logger.info(`[ImageManager] Finalizando: moviendo de ${tempBannerId} a ${finalBannerId}`);
      
      const tempDir = path.join(this.baseImagesPath, tempBannerId);
      const finalDir = path.join(this.baseImagesPath, finalBannerId);
      
      // Verificar que existe el directorio temporal
      if (!fsSync.existsSync(tempDir)) {
        logger.warn(`[ImageManager] Directorio temporal no existe: ${tempDir}`);
        return { components, updated: false };
      }
      
      // Crear directorio final si no existe
      await this.ensureDirectory(finalDir);
      
      // Mover archivos
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        const srcPath = path.join(tempDir, file);
        const destPath = path.join(finalDir, file);
        await fs.copyFile(srcPath, destPath);
        logger.info(`[ImageManager] Archivo movido: ${file}`);
      }
      
      // Eliminar directorio temporal
      await fs.rmdir(tempDir, { recursive: true });
      logger.info(`[ImageManager] Directorio temporal eliminado: ${tempDir}`);
      
      // Actualizar URLs en componentes
      const updatedComponents = this.updateImageUrls(components, tempBannerId, finalBannerId);
      
      return { components: updatedComponents, updated: true };
      
    } catch (error) {
      logger.error(`[ImageManager] Error en finalización:`, error);
      throw error;
    }
  }

  /**
   * Actualiza URLs de imágenes en componentes
   */
  updateImageUrls(components, oldBannerId, newBannerId) {
    const updateComponent = (comp) => {
      if (comp.type === 'image') {
        const oldPattern = `/templates/images/${oldBannerId}/`;
        const newPattern = `/templates/images/${newBannerId}/`;
        
        // Actualizar content
        if (comp.content) {
          if (typeof comp.content === 'string' && comp.content.includes(oldPattern)) {
            const oldUrl = comp.content;
            comp.content = comp.content.replace(oldPattern, newPattern);
            logger.info(`[ImageManager] Content URL actualizada: ${oldUrl} -> ${comp.content}`);
          } else if (comp.content.texts && comp.content.texts.en && comp.content.texts.en.includes(oldPattern)) {
            const oldUrl = comp.content.texts.en;
            comp.content.texts.en = comp.content.texts.en.replace(oldPattern, newPattern);
            logger.info(`[ImageManager] Content URL actualizada (texts.en): ${oldUrl} -> ${comp.content.texts.en}`);
          }
        }
        
        // IMPORTANTE: También actualizar _previewUrl en todos los dispositivos
        if (comp.style) {
          ['desktop', 'tablet', 'mobile'].forEach(device => {
            if (comp.style[device] && comp.style[device]._previewUrl) {
              if (comp.style[device]._previewUrl.includes(oldPattern)) {
                const oldPreviewUrl = comp.style[device]._previewUrl;
                comp.style[device]._previewUrl = comp.style[device]._previewUrl.replace(oldPattern, newPattern);
                logger.info(`[ImageManager] _previewUrl actualizada (${device}): ${oldPreviewUrl} -> ${comp.style[device]._previewUrl}`);
              }
            }
          });
        }
      }
      
      // Procesar hijos recursivamente
      if (comp.children && Array.isArray(comp.children)) {
        comp.children = comp.children.map(updateComponent);
      }
      
      return comp;
    };
    
    return components.map(updateComponent);
  }

  /**
   * Limpia archivos temporales de multer
   */
  async cleanupTempFiles(uploadedFiles) {
    for (const file of uploadedFiles) {
      try {
        await fs.unlink(file.path);
        logger.info(`[ImageManager] Archivo temporal eliminado: ${file.path}`);
      } catch (error) {
        logger.warn(`[ImageManager] No se pudo eliminar archivo temporal ${file.path}: ${error.message}`);
      }
    }
  }

  /**
   * Elimina archivos huérfanos de un banner
   */
  async cleanupOrphanedFiles(bannerId, usedImagePaths) {
    try {
      const bannerDir = path.join(this.baseImagesPath, bannerId);
      
      if (!fsSync.existsSync(bannerDir)) {
        return;
      }
      
      const files = await fs.readdir(bannerDir);
      const usedFiles = usedImagePaths.map(url => path.basename(url));
      
      for (const file of files) {
        if (!usedFiles.includes(file)) {
          const filePath = path.join(bannerDir, file);
          await fs.unlink(filePath);
          logger.info(`[ImageManager] Archivo huérfano eliminado: ${file}`);
        }
      }
      
    } catch (error) {
      logger.warn(`[ImageManager] Error limpiando archivos huérfanos:`, error);
    }
  }

  /**
   * Asegura que existe un directorio
   */
  /**
   * Log recursivo de componentes con imágenes
   */
  logComponentsWithImages(components, indent = '') {
    if (!Array.isArray(components)) return;
    
    components.forEach(comp => {
      if (comp.type === 'image') {
        logger.info(`${indent}Imagen ${comp.id}: content = ${comp.content}`);
      } else if (comp.type === 'container' && comp.children) {
        logger.info(`${indent}Container ${comp.id} (${comp.children.length} hijos)`);
        this.logComponentsWithImages(comp.children, indent + '  ');
      }
    });
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      logger.error(`[ImageManager] Error creando directorio ${dirPath}:`, error);
      return false;
    }
  }

  /**
   * Genera un ID temporal único
   */
  generateTempId() {
    return `${this.tempPrefix}${Date.now()}`;
  }

  /**
   * NUEVO FLUJO: Guarda archivos en temp/TIMESTAMP/ y luego los mueve a images/BANNER_ID/
   * Paso 1: Guardar en temporal
   */
  async saveFilesToTemp(uploadedFiles) {
    const timestamp = Date.now();
    const tempDir = path.join(this.baseTempPath, timestamp.toString());
    
    try {
      // Crear carpeta temporal
      await this.ensureDirectory(tempDir);
      logger.info(`📁 Carpeta temporal creada: ${tempDir}`);
      
      const savedFiles = [];
      
      for (const file of uploadedFiles) {
        try {
          // Guardar archivo con su nombre original
          const tempFilePath = path.join(tempDir, file.originalname);
          await fs.copyFile(file.path, tempFilePath);
          
          savedFiles.push({
            originalFile: file,
            tempPath: tempFilePath,
            fileName: file.originalname,
            componentId: this.extractComponentIdFromFilename(file.originalname)
          });
          
          logger.info(`💾 Archivo guardado en temporal: ${file.originalname}`);
        } catch (error) {
          logger.error(`❌ Error guardando archivo ${file.originalname}:`, error);
        }
      }
      
      return {
        timestamp,
        tempDir,
        savedFiles
      };
    } catch (error) {
      logger.error(`❌ Error creando carpeta temporal:`, error);
      throw error;
    }
  }

  /**
   * NUEVO FLUJO: Paso 2 - Mover archivos de temp/TIMESTAMP/ a images/BANNER_ID/
   */
  async moveFilesFromTempToFinal(tempData, finalBannerId) {
    try {
      const finalDir = path.join(this.baseImagesPath, finalBannerId);
      await this.ensureDirectory(finalDir);
      
      logger.info(`📁 Moviendo archivos de ${tempData.tempDir} a ${finalDir}`);
      
      const movedFiles = [];
      
      for (const fileData of tempData.savedFiles) {
        try {
          const finalPath = path.join(finalDir, fileData.fileName);
          await fs.copyFile(fileData.tempPath, finalPath);
          
          movedFiles.push({
            ...fileData,
            finalPath,
            finalUrl: `/templates/images/${finalBannerId}/${fileData.fileName}`
          });
          
          logger.info(`✅ Archivo movido: ${fileData.fileName}`);
        } catch (error) {
          logger.error(`❌ Error moviendo archivo ${fileData.fileName}:`, error);
        }
      }
      
      // Eliminar carpeta temporal
      await this.cleanupTempDirectory(tempData.tempDir);
      
      return movedFiles;
    } catch (error) {
      logger.error(`❌ Error moviendo archivos a carpeta final:`, error);
      throw error;
    }
  }

  /**
   * Eliminar carpeta temporal específica
   */
  async cleanupTempDirectory(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.info(`🗑️ Carpeta temporal eliminada: ${tempDir}`);
    } catch (error) {
      logger.error(`❌ Error eliminando carpeta temporal ${tempDir}:`, error);
    }
  }

  /**
   * Extraer componentId del nombre de archivo (formato: IMAGE_REF_componentId_filename)
   */
  extractComponentIdFromFilename(filename) {
    const match = filename.match(/^IMAGE_REF_([^_]+)_/);
    return match ? match[1] : null;
  }

  /**
   * Actualizar URLs de componentes después de mover archivos
   */
  async updateComponentUrlsAfterMove(components, movedFiles) {
    const updateComponents = (comps) => {
      comps.forEach(comp => {
        if (comp.type === 'image' && comp.content && comp.content.startsWith('__IMAGE_REF__')) {
          // Buscar el archivo correspondiente
          const componentId = comp.id;
          const movedFile = movedFiles.find(f => f.componentId === componentId);
          
          if (movedFile) {
            comp.content = movedFile.finalUrl;
            if (comp.style) {
              Object.keys(comp.style).forEach(device => {
                if (comp.style[device]) {
                  comp.style[device]._previewUrl = movedFile.finalUrl;
                }
              });
            }
            logger.info(`🔗 URL actualizada para ${componentId}: ${movedFile.finalUrl}`);
          }
        }
        
        // Procesar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          updateComponents(comp.children);
        }
      });
    };
    
    updateComponents(components);
    return components;
  }
}

module.exports = BannerImageManager;