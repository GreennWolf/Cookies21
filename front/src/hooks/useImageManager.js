// hooks/useImageManager.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { getImageUrl, saveAspectRatioToCache, getAspectRatioFromCache } from '../utils/imageProcessing';
import imageMemoryManager from '../utils/imageMemoryManager';

/**
 * Hook unificado para gestión de imágenes en el editor de banners
 * Maneja tanto imágenes temporales como del servidor, con soporte completo para contenedores
 */
export const useImageManager = () => {
  const [imageCache, setImageCache] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [errorStates, setErrorStates] = useState(new Map());
  const observerRef = useRef(null);
  
  // Referencias estables para evitar dependencias circulares
  const imageCacheRef = useRef(imageCache);
  const loadingStatesRef = useRef(loadingStates);
  const errorStatesRef = useRef(errorStates);
  
  // Mantener refs actualizadas
  useEffect(() => {
    imageCacheRef.current = imageCache;
  }, [imageCache]);
  
  useEffect(() => {
    loadingStatesRef.current = loadingStates;
  }, [loadingStates]);
  
  useEffect(() => {
    errorStatesRef.current = errorStates;
  }, [errorStates]);

  // Inicializar intersection observer para lazy loading
  useEffect(() => {
    if (!window.IntersectionObserver) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src && !img.src) {
              img.src = src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  /**
   * Crea una nueva imagen temporal desde un archivo
   * @param {File} file - Archivo de imagen
   * @param {string} componentId - ID del componente
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la operación
   */
  const createTemporaryImage = useCallback(async (file, componentId, options = {}) => {
    try {
      console.log(`🆕 useImageManager: Creando imagen temporal para ${componentId}`);
      
      // Validaciones
      if (!file || !(file instanceof File || file instanceof Blob)) {
        throw new Error('Archivo inválido');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('La imagen debe ser menor a 10MB');
      }

      // Generar referencia temporal única
      const timestamp = Date.now();
      const imageRef = `__IMAGE_REF__${componentId}_${timestamp}`;

      // Establecer estado de carga
      setLoadingStates(prev => new Map(prev.set(componentId, true)));
      setErrorStates(prev => new Map(prev.set(componentId, null)));

      // Procesar imagen para obtener dimensiones
      const imageData = await processImageFile(file);
      
      // Crear ObjectURL para vista previa
      const objectUrl = imageMemoryManager.createObjectURL(file);
      if (!objectUrl) {
        throw new Error('No se pudo crear URL de vista previa');
      }

      // Generar archivo con nombre descriptivo
      const renamedFile = new File(
        [file], 
        `IMAGE_REF_${componentId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        { type: file.type, lastModified: file.lastModified }
      );

      // Almacenar en gestor de memoria
      imageMemoryManager.storeTempFile(imageRef, renamedFile, {
        componentId,
        timestamp,
        originalName: file.name,
        aspectRatio: imageData.aspectRatio,
        width: imageData.width,
        height: imageData.height,
        objectUrl
      });

      // Mantener compatibilidad con sistema anterior
      window._imageFiles = window._imageFiles || {};
      window._imageFiles[imageRef] = renamedFile;

      // Guardar aspect ratio en caché
      if (imageData.aspectRatio) {
        saveAspectRatioToCache(imageRef, imageData.aspectRatio);
        saveAspectRatioToCache(objectUrl, imageData.aspectRatio);
      }

      // Actualizar caché local
      setImageCache(prev => new Map(prev.set(componentId, {
        imageRef,
        objectUrl,
        file: renamedFile,
        metadata: imageData,
        isTemporary: true,
        timestamp
      })));

      setLoadingStates(prev => new Map(prev.set(componentId, false)));

      console.log(`✅ useImageManager: Imagen temporal creada - ${imageRef}`);

      return {
        success: true,
        imageRef,
        objectUrl,
        file: renamedFile,
        metadata: imageData
      };

    } catch (error) {
      console.error(`❌ useImageManager: Error creando imagen temporal:`, error);
      setLoadingStates(prev => new Map(prev.set(componentId, false)));
      setErrorStates(prev => new Map(prev.set(componentId, error.message)));
      
      return {
        success: false,
        error: error.message
      };
    }
  }, []);

  /**
   * Obtiene URL de imagen de manera unificada
   * @param {Object} component - Componente de imagen
   * @param {string} deviceView - Vista del dispositivo
   * @param {string} context - Contexto de uso
   * @returns {string} URL de la imagen
   */
  const getUnifiedImageUrl = useCallback((component, deviceView = 'desktop', context = 'preview') => {
    try {
      // Debug específico para componentes hijos
      if (component.parentId && component.type === 'image') {
        console.log(`🔍 useImageManager.getUnifiedImageUrl (HIJO ${component.id}):`, {
          content: component.content,
          deviceView,
          context,
          contentType: typeof component.content
        });
      }
      
      // Usar el sistema centralizado
      const imageUrl = getImageUrl(component, deviceView, context);
      
      // Debug solo en desarrollo para componentes en contenedores
      if (process.env.NODE_ENV === 'development' && component.parentId && component.type === 'image') {
        console.log(`🔍 useImageManager (HIJO): ${component.id} -> ${imageUrl || 'NO_URL'}`, {
          content: component.content,
          deviceStyle: component.style?.[deviceView],
          context
        });
      }
      
      return imageUrl;
    } catch (error) {
      console.error(`❌ useImageManager: Error obteniendo URL:`, error);
      return '/placeholder-image.svg';
    }
  }, []);

  /**
   * Verifica si una imagen es temporal
   * @param {Object} component - Componente de imagen
   * @param {string} deviceView - Vista del dispositivo
   * @returns {boolean} true si es temporal
   */
  const isTemporaryImage = useCallback((component, deviceView = 'desktop') => {
    if (!component || component.type !== 'image') return false;

    const deviceStyle = component.style?.[deviceView];
    
    // Verificar _previewUrl diferente de content
    if (deviceStyle?._previewUrl && deviceStyle._previewUrl !== component.content) {
      return true;
    }
    
    // Verificar referencia temporal en content
    if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Obtiene información cached de una imagen
   * @param {string} componentId - ID del componente
   * @returns {Object|null} Información de la imagen
   */
  const getImageInfo = useCallback((componentId) => {
    return imageCacheRef.current.get(componentId) || null;
  }, []); // Sin dependencias para evitar loops

  /**
   * Actualiza imagen de un componente
   * @param {string} componentId - ID del componente
   * @param {File} file - Archivo de imagen
   * @param {Function} onUpdate - Callback de actualización
   * @returns {Promise<Object>} Resultado de la operación
   */
  const updateComponentImage = useCallback(async (componentId, file, onUpdate) => {
    try {
      console.log(`🔄 useImageManager: updateComponentImage llamado para ${componentId}`);
      
      // Crear imagen temporal
      const result = await createTemporaryImage(file, componentId);
      
      if (result.success && onUpdate) {
        console.log(`✅ useImageManager: Imagen temporal creada, llamando onUpdate callback`);
        // Notificar actualización al componente padre
        onUpdate(result.imageRef, result.file, result.metadata.aspectRatio);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ useImageManager: Error actualizando imagen:`, error);
      return { success: false, error: error.message };
    }
  }, [createTemporaryImage]);

  /**
   * Limpia imagen temporal de un componente
   * @param {string} componentId - ID del componente
   */
  const clearComponentImage = useCallback((componentId) => {
    const imageInfo = imageCacheRef.current.get(componentId);
    if (imageInfo && imageInfo.isTemporary) {
      // Revocar ObjectURL
      if (imageInfo.objectUrl) {
        imageMemoryManager.revokeObjectURL(imageInfo.objectUrl);
      }
      
      // Limpiar del gestor de memoria
      if (imageInfo.imageRef) {
        imageMemoryManager.removeTempFile(imageInfo.imageRef);
      }
      
      // Limpiar caché local
      setImageCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(componentId);
        return newCache;
      });
      
      console.log(`🗑️ useImageManager: Imagen temporal limpiada para ${componentId}`);
    }
  }, []); // Sin dependencias para evitar loops

  /**
   * Configura lazy loading para una imagen
   * @param {HTMLImageElement} imgElement - Elemento imagen
   * @param {string} src - URL de la imagen
   */
  const setupLazyLoading = useCallback((imgElement, src) => {
    if (!imgElement || !observerRef.current) return;

    imgElement.dataset.src = src;
    observerRef.current.observe(imgElement);
  }, []);

  /**
   * Maneja errores de carga de imagen
   * @param {string} componentId - ID del componente
   * @param {string} error - Mensaje de error
   */
  const handleImageError = useCallback((componentId, error) => {
    setErrorStates(prev => new Map(prev.set(componentId, error)));
    console.error(`❌ useImageManager: Error de imagen para ${componentId}:`, error);
  }, []);

  /**
   * Obtiene aspect ratio de una imagen
   * @param {Object} component - Componente de imagen
   * @param {string} deviceView - Vista del dispositivo
   * @returns {number|null} Aspect ratio
   */
  const getImageAspectRatio = useCallback((component, deviceView = 'desktop') => {
    try {
      const imageUrl = getImageUrl(component, deviceView, 'aspectRatio');
      return getAspectRatioFromCache(imageUrl);
    } catch (error) {
      console.error('❌ useImageManager: Error obteniendo aspect ratio:', error);
      return null;
    }
  }, []); // Sin dependencias para evitar loops

  /**
   * Verifica si una imagen está cargando
   * @param {string} componentId - ID del componente
   * @returns {boolean} true si está cargando
   */
  const isImageLoading = useCallback((componentId) => {
    return loadingStatesRef.current.get(componentId) || false;
  }, []); // Sin dependencias para evitar loops

  /**
   * Obtiene error de imagen si existe
   * @param {string} componentId - ID del componente
   * @returns {string|null} Mensaje de error o null
   */
  const getImageError = useCallback((componentId) => {
    return errorStatesRef.current.get(componentId) || null;
  }, []); // Sin dependencias para evitar loops

  /**
   * Limpia todos los estados y cachés
   */
  const cleanup = useCallback(() => {
    console.log('🧹 useImageManager: Ejecutando limpieza...');
    
    // Limpiar ObjectURLs usando referencias estables
    imageCacheRef.current.forEach((imageInfo, componentId) => {
      if (imageInfo.isTemporary && imageInfo.objectUrl) {
        imageMemoryManager.revokeObjectURL(imageInfo.objectUrl);
      }
    });

    // Limpiar estados
    setImageCache(new Map());
    setLoadingStates(new Map());
    setErrorStates(new Map());

    console.log('✅ useImageManager: Limpieza completa realizada');
  }, []); // Sin dependencias para evitar loops

  // Limpieza en desmontaje - SIN DEPENDENCIAS
  useEffect(() => {
    return () => {
      console.log('🧹 useImageManager: Limpieza en desmontaje');
      // Usar ref para acceder al estado sin dependencias
      if (imageCacheRef.current) {
        imageCacheRef.current.forEach((imageInfo, componentId) => {
          if (imageInfo.isTemporary && imageInfo.objectUrl) {
            imageMemoryManager.revokeObjectURL(imageInfo.objectUrl);
          }
        });
      }
    };
  }, []); // Array vacío para que solo se ejecute al desmontar

  return {
    // Operaciones principales
    createTemporaryImage,
    updateComponentImage,
    clearComponentImage,
    
    // Obtención de datos
    getUnifiedImageUrl,
    getImageInfo,
    getImageAspectRatio,
    
    // Estados
    isImageLoading,
    getImageError,
    isTemporaryImage,
    
    // Utilidades
    setupLazyLoading,
    handleImageError,
    cleanup
  };
};

/**
 * Procesa un archivo de imagen para obtener sus metadatos
 * @param {File} file - Archivo de imagen
 * @returns {Promise<Object>} Metadatos de la imagen
 */
const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio,
        size: file.size,
        type: file.type,
        name: file.name
      });
    };
    
    img.onerror = () => {
      reject(new Error('No se pudo procesar la imagen'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export default useImageManager;