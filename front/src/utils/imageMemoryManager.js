// src/utils/imageMemoryManager.js

/**
 * Gestor optimizado de memoria para imágenes
 * Maneja ObjectURLs, archivos temporales y caché de imágenes
 */

class ImageMemoryManager {
  constructor() {
    this.objectUrls = new Set();
    this.maxObjectUrls = 50; // Límite máximo de ObjectURLs activos
    this.cleanupInterval = null;
    this.tempFiles = new Map();
    this.aspectRatioCache = new Map();
    
    // Iniciar limpieza automática cada 5 minutos
    this.startAutoCleanup();
    
    // Limpiar al cerrar la página
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Crear ObjectURL y gestionar memoria automáticamente
   */
  createObjectURL(file) {
    if (!file || !(file instanceof File || file instanceof Blob)) {
      console.warn('⚠️ MEMORY: Archivo inválido para createObjectURL');
      return null;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      this.objectUrls.add(objectUrl);
      
      console.log(`✅ MEMORY: ObjectURL creado: ${objectUrl.substring(0, 30)}... (Total activos: ${this.objectUrls.size})`);
      
      // Si hay demasiados ObjectURLs, limpiar los más antiguos
      if (this.objectUrls.size > this.maxObjectUrls) {
        this.cleanupOldObjectUrls();
      }
      
      return objectUrl;
    } catch (error) {
      console.error('❌ MEMORY: Error creando ObjectURL:', error);
      return null;
    }
  }

  /**
   * Revocar ObjectURL específico
   */
  revokeObjectURL(objectUrl) {
    if (!objectUrl || !this.objectUrls.has(objectUrl)) return;
    
    try {
      URL.revokeObjectURL(objectUrl);
      this.objectUrls.delete(objectUrl);
      console.log(`🗑️ MEMORY: ObjectURL revocado: ${objectUrl.substring(0, 30)}...`);
    } catch (error) {
      console.warn('⚠️ MEMORY: Error revocando ObjectURL:', error);
    }
  }

  /**
   * Limpiar ObjectURLs antiguos (FIFO)
   */
  cleanupOldObjectUrls() {
    const urlsToCleanup = Math.min(10, this.objectUrls.size - this.maxObjectUrls + 10);
    const urlsArray = Array.from(this.objectUrls);
    
    for (let i = 0; i < urlsToCleanup; i++) {
      this.revokeObjectURL(urlsArray[i]);
    }
    
    console.log(`🧹 MEMORY: Limpiados ${urlsToCleanup} ObjectURLs antiguos`);
  }

  /**
   * Almacenar archivo temporal con metadatos
   */
  storeTempFile(imageRef, file, metadata = {}) {
    if (!imageRef || !file) {
      console.warn('⚠️ MEMORY: Parámetros inválidos para storeTempFile');
      return;
    }

    const fileData = {
      file,
      timestamp: Date.now(),
      metadata: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        componentId: metadata.componentId,
        aspectRatio: metadata.aspectRatio,
        ...metadata
      }
    };

    this.tempFiles.set(imageRef, fileData);
    
    // También almacenar en window._imageFiles para compatibilidad
    window._imageFiles = window._imageFiles || {};
    window._imageFiles[imageRef] = file;
    
    console.log(`💾 MEMORY: Archivo temporal almacenado: ${imageRef} (${file.name}, ${file.size} bytes)`);
  }

  /**
   * Recuperar archivo temporal
   */
  getTempFile(imageRef) {
    return this.tempFiles.get(imageRef) || null;
  }

  /**
   * Eliminar archivo temporal
   */
  removeTempFile(imageRef) {
    const fileData = this.tempFiles.get(imageRef);
    if (fileData) {
      this.tempFiles.delete(imageRef);
      
      // Limpiar también de window._imageFiles
      if (window._imageFiles && window._imageFiles[imageRef]) {
        delete window._imageFiles[imageRef];
      }
      
      console.log(`🗑️ MEMORY: Archivo temporal eliminado: ${imageRef}`);
      return true;
    }
    return false;
  }

  /**
   * Guardar aspect ratio en caché
   */
  cacheAspectRatio(imageUrl, aspectRatio) {
    if (!imageUrl || !aspectRatio || aspectRatio <= 0) return;
    
    this.aspectRatioCache.set(imageUrl, {
      ratio: aspectRatio,
      timestamp: Date.now()
    });
    
    console.log(`📏 MEMORY: Aspect ratio cacheado: ${imageUrl} => ${aspectRatio.toFixed(2)}:1`);
  }

  /**
   * Recuperar aspect ratio del caché
   */
  getCachedAspectRatio(imageUrl) {
    const cached = this.aspectRatioCache.get(imageUrl);
    if (!cached) return null;
    
    // Caché válido por 1 hora
    const isValid = (Date.now() - cached.timestamp) < (60 * 60 * 1000);
    if (!isValid) {
      this.aspectRatioCache.delete(imageUrl);
      return null;
    }
    
    return cached.ratio;
  }

  /**
   * Limpiar archivos temporales antiguos (más de 1 hora)
   */
  cleanupOldTempFiles() {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hora
    let cleaned = 0;
    
    for (const [imageRef, fileData] of this.tempFiles.entries()) {
      if (fileData.timestamp < cutoff) {
        this.removeTempFile(imageRef);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 MEMORY: Limpiados ${cleaned} archivos temporales antiguos`);
    }
  }

  /**
   * Limpiar caché de aspect ratios antiguos
   */
  cleanupOldAspectRatios() {
    const cutoff = Date.now() - (2 * 60 * 60 * 1000); // 2 horas
    let cleaned = 0;
    
    for (const [imageUrl, data] of this.aspectRatioCache.entries()) {
      if (data.timestamp < cutoff) {
        this.aspectRatioCache.delete(imageUrl);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 MEMORY: Limpiados ${cleaned} aspect ratios antiguos del caché`);
    }
  }

  /**
   * Iniciar limpieza automática
   */
  startAutoCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      console.log('🔄 MEMORY: Ejecutando limpieza automática...');
      this.cleanupOldTempFiles();
      this.cleanupOldAspectRatios();
      
      // Limpiar ObjectURLs si hay demasiados
      if (this.objectUrls.size > this.maxObjectUrls) {
        this.cleanupOldObjectUrls();
      }
      
      console.log(`📊 MEMORY: Estado actual - ObjectURLs: ${this.objectUrls.size}, TempFiles: ${this.tempFiles.size}, AspectRatios: ${this.aspectRatioCache.size}`);
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    console.log('⏰ MEMORY: Limpieza automática iniciada (cada 5 minutos)');
  }

  /**
   * Detener limpieza automática
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ MEMORY: Limpieza automática detenida');
    }
  }

  /**
   * Limpieza completa
   */
  cleanup() {
    console.log('🧹 MEMORY: Iniciando limpieza completa...');
    
    // Revocar todos los ObjectURLs
    for (const objectUrl of this.objectUrls) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        // Ignorar errores de revocación
      }
    }
    this.objectUrls.clear();
    
    // Limpiar archivos temporales
    this.tempFiles.clear();
    
    // Limpiar caché de aspect ratios
    this.aspectRatioCache.clear();
    
    // Detener limpieza automática
    this.stopAutoCleanup();
    
    // Limpiar window._imageFiles
    if (window._imageFiles) {
      window._imageFiles = {};
    }
    
    console.log('✅ MEMORY: Limpieza completa terminada');
  }

  /**
   * Obtener estadísticas de memoria
   */
  getStats() {
    return {
      objectUrls: this.objectUrls.size,
      tempFiles: this.tempFiles.size,
      aspectRatios: this.aspectRatioCache.size,
      windowImageFiles: Object.keys(window._imageFiles || {}).length
    };
  }
}

// Crear instancia global
const imageMemoryManager = new ImageMemoryManager();

// Exportar instancia y clase
export default imageMemoryManager;
export { ImageMemoryManager };

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
  window.imageMemoryManager = imageMemoryManager;
}