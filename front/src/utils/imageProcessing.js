// Utilidad centralizada para procesar imágenes en componentes
import imageMemoryManager from './imageMemoryManager';

/**
 * Caché global para aspect ratios de imágenes
 * Guarda las proporciones originales de cada imagen para asegurar
 * que siempre se mantenga la relación de aspecto correcta
 * @deprecated - Usar imageMemoryManager.cacheAspectRatio() en su lugar
 */
export const imageAspectRatioCache = new Map();

/**
 * Caché global para evitar recargar imágenes ya cargadas
 */
export const imageLoadCache = new Map();

/**
 * Placeholders para diferentes estados de las imágenes
 */
export const ImagePlaceholders = {
  loading: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzc3NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhcmdhbmRvPC90ZXh0Pjwvc3ZnPg==',
  default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4=',
  error: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmNjY2MiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
  blank: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=',
  editor: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxMDAiIHk9IjY1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TdWJlIG8gYXJyYXN0cmEgdW5hIGltYWdlbjwvdGV4dD48cGF0aCBkPSJNODUgODVsMTUgLTE1TTEwMCA3MHYzME0xMDAgMTAwaDMwIiBzdHJva2U9IiM2NjYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+',
  dragHandle: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTAgOWg0TTEwIDEyaDRNMTAgMTVoNCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
  resizeHandle: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQgMTB2NEgxMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg=='
};

/**
 * Verifica si una imagen es temporal (recién subida)
 * @param {Object} component - Componente de imagen
 * @param {string} deviceView - Vista del dispositivo
 * @returns {boolean} true si es temporal, false si es del servidor
 */
const isTemporaryImage = (component, deviceView = 'desktop') => {
  const deviceStyle = component.style?.[deviceView];
  
  // Si hay _previewUrl diferente a content, es temporal
  if (deviceStyle?._previewUrl && deviceStyle._previewUrl !== component.content) {
    return true;
  }
  
  // Si content es una referencia temporal
  if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
    return true;
  }
  
  return false;
};

/**
 * Obtiene URL para imagen temporal
 * @param {Object} component - Componente de imagen
 * @param {string} deviceView - Vista del dispositivo
 * @param {string} context - Contexto de uso
 * @returns {string|null} URL temporal o null si no se encuentra
 */
const getTemporaryImageUrl = (component, deviceView, context) => {
  const deviceStyle = component.style?.[deviceView];
  
  // 1. Usar _previewUrl si existe y es diferente de content
  if (deviceStyle?._previewUrl && deviceStyle._previewUrl !== component.content) {
    console.log(`✓ ${context}: Imagen temporal usando _previewUrl: ${deviceStyle._previewUrl}`);
    return deviceStyle._previewUrl;
  }
  
  // 2. Si content es referencia temporal, buscar archivo
  if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
    // Buscar en gestor optimizado
    const tempFileData = imageMemoryManager.getTempFile(component.content);
    console.log(`🔍 getTemporaryImageUrl: Buscando en imageMemoryManager para ${component.content}:`, {
      tempFileData: !!tempFileData,
      hasFile: !!(tempFileData && tempFileData.file),
      componentContent: component.content
    });
    
    if (tempFileData && tempFileData.file) {
      const objectUrl = imageMemoryManager.createObjectURL(tempFileData.file);
      if (objectUrl) {
        console.log(`✓ ${context}: Imagen temporal usando ObjectURL optimizado:`, objectUrl);
        return objectUrl;
      }
    }
    
    // Fallback sistema anterior
    console.log(`🔍 getTemporaryImageUrl: Buscando en window._imageFiles:`, {
      hasWindow_imageFiles: !!(window._imageFiles),
      hasReference: !!(window._imageFiles && window._imageFiles[component.content]),
      availableKeys: window._imageFiles ? Object.keys(window._imageFiles) : [],
      searchingFor: component.content
    });
    
    if (window._imageFiles && window._imageFiles[component.content]) {
      const file = window._imageFiles[component.content];
      const objectUrl = imageMemoryManager.createObjectURL(file);
      if (objectUrl) {
        console.log(`✓ ${context}: Imagen temporal usando ObjectURL (compatibilidad):`, objectUrl);
        return objectUrl;
      }
    }
    
    console.log(`⚠️ ${context}: Imagen temporal no encontrada, usando placeholder`);
    return ImagePlaceholders.loading;
  }
  
  return null;
};

/**
 * Obtiene URL para imagen del servidor
 * @param {Object} component - Componente de imagen
 * @param {string} context - Contexto de uso
 * @returns {string} URL del servidor
 */
const getServerImageUrl = (component, context) => {
  const cacheBuster = `?t=${Date.now()}`;
  
  // Debug específico para componentes hijos
  if (component.parentId && component.type === 'image') {
    console.log(`🌐 getServerImageUrl (HIJO ${component.id}):`, {
      content: component.content,
      contentType: typeof component.content,
      context,
      hasContent: !!component.content
    });
  }
  
  if (typeof component.content === 'string') {
    // Data URI
    if (component.content.startsWith('data:')) {
      console.log(`✓ ${context}: Imagen servidor usando data URI`);
      return component.content;
    }
    
    // Blob URL
    if (component.content.startsWith('blob:')) {
      console.log(`✓ ${context}: Imagen servidor usando blob URL`);
      return component.content;
    }
    
    // URLs http/https
    if (component.content.startsWith('http://') || component.content.startsWith('https://')) {
      console.log(`✓ ${context}: Imagen servidor usando HTTP URL`);
      return component.content;
    }
    
    // Rutas /templates/images/
    if (component.content.includes('/templates/images/')) {
      const parts = component.content.split('/templates/images/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0];
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/templates/images/${relativePath}${cacheBuster}`;
        console.log(`✓ ${context}: Imagen servidor usando template: ${fullUrl}`);
        return fullUrl;
      }
    }
    
    // Rutas /direct-image/
    if (component.content.includes('/direct-image/')) {
      const parts = component.content.split('/direct-image/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0];
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/direct-image/${relativePath}${cacheBuster}`;
        console.log(`✓ ${context}: Imagen servidor usando direct-image: ${fullUrl}`);
        return fullUrl;
      }
    }
    
    // Otras rutas relativas
    if (component.content.startsWith('/')) {
      const fullUrl = `${window.location.origin}${component.content}${component.content.includes('?') ? '&cb=' + Date.now() : cacheBuster}`;
      console.log(`✓ ${context}: Imagen servidor usando ruta relativa: ${fullUrl}`);
      return fullUrl;
    }
  }
  
  // Objeto con URL
  if (component.content && typeof component.content === 'object') {
    if (component.content.url) {
      if (component.content.url.startsWith('/')) {
        const serverUrl = window.location.origin;
        return `${serverUrl}${component.content.url}${cacheBuster}`;
      }
      return component.content.url;
    }
    
    // Textos multilingual
    if (component.content.texts && typeof component.content.texts === 'object') {
      // Intentar inglés primero
      if (component.content.texts.en) {
        const enText = component.content.texts.en;
        if (typeof enText === 'string') {
          if (enText.startsWith('/')) {
            const serverUrl = window.location.origin;
            return `${serverUrl}${enText}${cacheBuster}`;
          }
          if (enText.startsWith('http') || enText.startsWith('data:') || enText.startsWith('blob:')) {
            return enText;
          }
        }
      }
      
      // Usar primer idioma disponible
      for (const lang in component.content.texts) {
        if (lang === 'en') continue;
        const text = component.content.texts[lang];
        if (typeof text === 'string') {
          if (text.startsWith('/')) {
            const serverUrl = window.location.origin;
            return `${serverUrl}${text}${cacheBuster}`;
          }
          if (text.startsWith('http') || text.startsWith('data:') || text.startsWith('blob:')) {
            return text;
          }
        }
      }
    }
  }
  
  console.log(`⚠️ ${context}: No se pudo procesar imagen del servidor, usando placeholder`);
  return ImagePlaceholders.default;
};

/**
 * Función centralizada para obtener URL de imagen con separación clara temporal vs servidor
 * @param {Object} component - Componente que contiene la imagen
 * @param {string} deviceView - Vista actual (desktop, tablet, mobile)
 * @param {string} context - Contexto de uso (preview, thumbnail, config)
 * @returns {string} URL de la imagen
 */
export const getImageUrl = (component, deviceView = 'desktop', context = 'preview') => {
  try {
    // Debug específico para componentes hijos O cuando hay problemas
    const shouldDebug = (component.parentId && component.type === 'image') || 
                       (component.content && component.content.startsWith('__IMAGE_REF__'));
    
    if (shouldDebug) {
      console.log(`🔍 getImageUrl: ${component.id}`, {
        content: component.content,
        deviceStyle: component.style?.[deviceView],
        isTemporary: isTemporaryImage(component, deviceView),
        context,
        isChild: !!component.parentId
      });
    }
    
    // SEPARACIÓN CLARA: ¿Es imagen temporal o del servidor?
    if (isTemporaryImage(component, deviceView)) {
      const tempUrl = getTemporaryImageUrl(component, deviceView, context);
      // Para thumbnails, si la imagen temporal falla, usar placeholder en lugar de servidor
      if (!tempUrl || tempUrl === ImagePlaceholders.loading) {
        return context === 'thumbnail' ? ImagePlaceholders.editor : ImagePlaceholders.loading;
      }
      
      // Debug log para componentes hijos que obtuvieron URL temporal
      if (component.parentId && component.type === 'image') {
        console.log(`✅ getImageUrl (HIJO): URL temporal obtenida: ${tempUrl}`);
      }
      
      return tempUrl;
    } else {
      const serverUrl = getServerImageUrl(component, context);
      
      // Debug log para componentes hijos usando servidor
      if (component.parentId && component.type === 'image') {
        console.log(`🌐 getImageUrl (HIJO): URL servidor: ${serverUrl}`);
      }
      
      return serverUrl;
    }
  } catch (error) {
    console.error(`❌ ${context}: Error al procesar URL de imagen:`, error);
    return ImagePlaceholders.error;
  }
};

/**
 * Maneja errores de carga de imágenes con múltiples estrategias de fallback
 * @param {Event} e - Evento de error
 * @param {string} originalUrl - URL original que falló
 * @param {string} componentId - ID del componente
 * @param {Function} setErrorCallback - Función para actualizar estado de error
 * @param {Function} customStrategy - Estrategia personalizada opcional
 * @returns {boolean} true si se aplicó una solución
 */
export const handleImageError = (e, originalUrl, componentId, setErrorCallback, customStrategy) => {
  console.error(`❌ Error al cargar imagen para componente ${componentId}:`, originalUrl);
  
  // Mostrar datos del problema 
  console.group('📷 ERROR DE IMAGEN');
  console.log('URL con error:', originalUrl);
  console.log('ID del componente:', componentId);
  console.log('Elemento:', e.target);
  console.groupEnd();
  
  // Si hay una estrategia personalizada, intentarla primero
  if (typeof customStrategy === 'function') {
    const result = customStrategy(e, originalUrl, componentId);
    if (result === true) {
      console.log(`✅ Estrategia personalizada solucionó el problema para ${componentId}`);
      return true;
    }
  }
  
  let solved = false;
  
  // ESTRATEGIA 1: Intentar conversión de URL /direct-image/ a /templates/images/
  if (originalUrl && originalUrl.includes('/direct-image/')) {
    console.log('🔄 Intentando convertir /direct-image/ a /templates/images/');
    
    try {
      const parts = originalUrl.split('/direct-image/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
        const baseUrl = window.location.origin;
        const templateUrl = `${baseUrl}/templates/images/${relativePath}`;
        
        console.log(`⚠️ Reintentando con URL template: ${templateUrl}`);
        const cacheBuster = `?t=${Date.now()}`;
        e.target.src = templateUrl + cacheBuster;
        solved = true;
        return true; // Salir para dar oportunidad al nuevo intento
      }
    } catch (err) {
      console.warn(`⚠️ Error convirtiendo URL direct-image:`, err);
    }
  }
  
  // ESTRATEGIA 2: Intentar conversión de URL /templates/images/ a /direct-image/
  if (!solved && originalUrl && originalUrl.includes('/templates/images/')) {
    console.log('🔄 Intentando convertir /templates/images/ a /direct-image/');
    
    try {
      const parts = originalUrl.split('/templates/images/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
        const baseUrl = window.location.origin;
        const directUrl = `${baseUrl}/direct-image/${relativePath}`;
        
        console.log(`⚠️ Reintentando con URL direct-image: ${directUrl}`);
        const cacheBuster = `?t=${Date.now()}`;
        e.target.src = directUrl + cacheBuster;
        solved = true;
        return true; // Salir para dar oportunidad al nuevo intento
      }
    } catch (err) {
      console.warn(`⚠️ Error convirtiendo URL template:`, err);
    }
  }
  
  // ESTRATEGIA 3: Intentar con URL local (para desarrollo)
  if (!solved && ((originalUrl && originalUrl.includes('/templates/images/')) || 
                 (originalUrl && originalUrl.includes('/direct-image/')))) {
    console.log('🔄 Intentando con servidor local');
    
    try {
      // Determinar ruta relativa según formato
      let relativePath;
      let prefix = '/templates/images/';
      
      if (originalUrl.includes('/templates/images/')) {
        relativePath = originalUrl.split('/templates/images/')[1]?.split('?')[0];
      } else if (originalUrl.includes('/direct-image/')) {
        relativePath = originalUrl.split('/direct-image/')[1]?.split('?')[0];
        prefix = '/direct-image/';
      }
      
      if (relativePath) {
        // Intentar con servidor local
        const localUrl = `http://localhost:3000${prefix}${relativePath}`;
        console.log(`⚠️ Reintentando con URL local: ${localUrl}`);
        const cacheBuster = `?t=${Date.now()}`;
        e.target.src = localUrl + cacheBuster;
        solved = true;
        return true; // Salir para dar oportunidad al nuevo intento
      }
    } catch (err) {
      console.warn(`⚠️ Error con URL local:`, err);
    }
  }
  
  // Si todas las estrategias fallaron, marcar como error
  if (!solved) {
    console.error(`❌ Todas las estrategias fallaron: ${originalUrl}`);
    if (typeof setErrorCallback === 'function') {
      setErrorCallback(componentId, true);
    }
  }
  
  return solved;
};

/**
 * Calcula el aspect ratio de una imagen
 * @param {HTMLImageElement} img - Elemento de imagen
 * @returns {number|null} Ratio de aspecto o null si no se puede calcular
 */
export const calculateImageAspectRatio = (img) => {
  if (!img) return null;
  if (img.naturalWidth && img.naturalHeight && img.naturalHeight > 0) {
    return img.naturalWidth / img.naturalHeight;
  }
  return null;
};

/**
 * Guardar el aspect ratio de una imagen en la caché global
 * @param {string} imageUrl - URL de la imagen
 * @param {number} aspectRatio - Ratio de aspecto a guardar
 */
export const saveAspectRatioToCache = (imageUrl, aspectRatio) => {
  if (!imageUrl || !aspectRatio) return;
  try {
    // Usar el nuevo gestor de memoria
    imageMemoryManager.cacheAspectRatio(imageUrl, aspectRatio);
    
    // Mantener compatibilidad con el sistema anterior
    imageAspectRatioCache.set(imageUrl, aspectRatio);
    console.log(`✅ Aspect ratio guardado en caché optimizado para ${imageUrl}: ${aspectRatio.toFixed(2)}`);
  } catch (error) {
    console.error('Error al guardar aspect ratio en caché:', error);
  }
};

/**
 * Recuperar el aspect ratio de una imagen desde la caché global
 * @param {string} imageUrl - URL de la imagen
 * @returns {number|null} Ratio de aspecto o null si no está en la caché
 */
export const getAspectRatioFromCache = (imageUrl) => {
  if (!imageUrl) return null;
  try {
    // Intentar primero con el gestor optimizado
    const cachedRatio = imageMemoryManager.getCachedAspectRatio(imageUrl);
    if (cachedRatio) return cachedRatio;
    
    // Fallback al sistema anterior
    return imageAspectRatioCache.has(imageUrl) 
      ? imageAspectRatioCache.get(imageUrl) 
      : null;
  } catch (error) {
    console.error('Error al recuperar aspect ratio de caché:', error);
    return null;
  }
};

/**
 * Calcular las dimensiones manteniendo el aspect ratio
 * @param {number} originalWidth - Ancho original en píxeles
 * @param {number} originalHeight - Alto original en píxeles
 * @param {number} targetWidth - Ancho objetivo en píxeles
 * @param {number|null} aspectRatio - Ratio de aspecto a mantener (opcional)
 * @param {number} resizeStep - Paso de redimensionamiento (opcional)
 * @returns {Object} Dimensiones ajustadas 
 */
export const calculateDimensionsWithAspectRatio = (
  originalWidth, 
  originalHeight, 
  targetWidth, 
  aspectRatio = null,
  resizeStep = 1
) => {
  // Si no tenemos aspect ratio, calcularlo
  if (!aspectRatio && originalHeight > 0) {
    aspectRatio = originalWidth / originalHeight;
  }
  
  // Si no tenemos aspect ratio válido, mantener proporciones originales
  if (!aspectRatio || aspectRatio <= 0) {
    return { width: originalWidth, height: originalHeight };
  }
  
  // Calcular nueva altura basada en el ancho objetivo y el aspect ratio
  let newHeight = Math.round(targetWidth / aspectRatio);
  
  // Si hay un paso de redimensionamiento, redondear al paso más cercano
  if (resizeStep > 1) {
    newHeight = Math.round(newHeight / resizeStep) * resizeStep;
  }
  
  return {
    width: targetWidth,
    height: newHeight
  };
};

/**
 * Procesa los estilos de la imagen para asegurar dimensiones correctas
 * y mantener la relación de aspecto
 * @param {Object} component - Componente que contiene la imagen
 * @param {string} deviceView - Vista actual (desktop, tablet, mobile)
 * @returns {Object} Estilos procesados para la imagen
 */
export const processImageStyles = (component, deviceView = 'desktop') => {
  const deviceStyle = component.style?.[deviceView] || {};
  const processedStyle = { ...deviceStyle };
  
  // Garantizar que maxWidth y maxHeight estén configurados
  if (!processedStyle.maxWidth) {
    processedStyle.maxWidth = '100%';
  }
  
  if (!processedStyle.maxHeight) {
    processedStyle.maxHeight = '100%';
  }
  
  // Asegurar que las dimensiones tengan unidades
  ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'].forEach(prop => {
    if (processedStyle[prop] !== undefined && typeof processedStyle[prop] === 'number') {
      processedStyle[prop] = `${processedStyle[prop]}px`;
    }
  });
  
  // Definir dimensiones que funcionarán RESPETANDO LOS CONTENEDORES
  // Extraer valores originales para asegurar dimensiones mínimas
  if (!processedStyle.width && !processedStyle.height) {
    // IMPORTANTE: Usar auto para que la imagen se ajuste al contenedor
    processedStyle.width = 'auto';
    processedStyle.height = 'auto';
    // Establecer máximos para evitar desbordamiento
    processedStyle.maxWidth = '100%';
    processedStyle.maxHeight = '100%';
  }
  
  // Si las dimensiones son muy pequeñas en porcentajes, convertir a píxeles mínimos
  if (processedStyle.width && typeof processedStyle.width === 'string' && processedStyle.width.includes('%')) {
    const percentValue = parseFloat(processedStyle.width);
    if (percentValue < 10) { // Si es menos del 10%, usar píxeles
      processedStyle.width = '200px';
    }
  }
  
  if (processedStyle.height && typeof processedStyle.height === 'string' && processedStyle.height.includes('%')) {
    const percentValue = parseFloat(processedStyle.height);
    if (percentValue < 10) { // Si es menos del 10%, usar píxeles
      processedStyle.height = '150px';
    }
  }
  
  // Si el estilo tiene dimensiones, intentar usarlas con seguridad
  if (processedStyle.width && typeof processedStyle.width === 'string') {
    if (!processedStyle.width.includes('px') && !processedStyle.width.includes('%')) {
      // Si no tiene unidades, asumir px
      processedStyle.width = `${processedStyle.width}px`;
    }
  }
  
  if (processedStyle.height && typeof processedStyle.height === 'string') {
    if (!processedStyle.height.includes('px') && !processedStyle.height.includes('%')) {
      // Si no tiene unidades, asumir px
      processedStyle.height = `${processedStyle.height}px`;
    }
  }
  
  // Intentar mantener el aspect ratio si está disponible
  const imageUrl = getImageUrl(component, deviceView, 'processStyles');
  if (imageUrl && imageAspectRatioCache.has(imageUrl)) {
    const aspectRatio = imageAspectRatioCache.get(imageUrl);
    
    // Si tenemos ancho pero no altura y hay aspect ratio, calcular altura
    if (
      processedStyle.width && 
      (!processedStyle.height || processedStyle.height === 'auto') && 
      aspectRatio
    ) {
      // Extraer el valor numérico del ancho
      const widthMatch = processedStyle.width.match(/^(\d+)(px|%|rem|em)?$/);
      if (widthMatch) {
        const widthValue = parseInt(widthMatch[1], 10);
        const widthUnit = widthMatch[2] || 'px';
        
        // Calcular la altura basada en el aspect ratio
        const heightValue = Math.round(widthValue / aspectRatio);
        processedStyle.height = `${heightValue}${widthUnit}`;
      }
    }
  }
  
  // Agregar propiedades críticas para comportamiento correcto
  processedStyle.boxSizing = 'border-box';
  processedStyle.objectFit = processedStyle.objectFit || 'contain';
  processedStyle.objectPosition = processedStyle.objectPosition || 'center';
  
  // CRÍTICO: Asegurar que la imagen NUNCA se desborde del contenedor
  if (!processedStyle.maxWidth) {
    processedStyle.maxWidth = '100%';
  }
  if (!processedStyle.maxHeight) {
    processedStyle.maxHeight = '100%';
  }
  
  return processedStyle;
};

/**
 * Utilidad optimizada para procesar imágenes en componentes para FormData
 * Incluye soporte mejorado para contenedores y gestión de memoria
 * @param {Array} components - Lista de componentes
 * @returns {Object} Resultado del procesamiento
 */
export const processComponentImages = (components) => {
    console.log('🔄 PROCESS: Iniciando procesamiento optimizado de imágenes...');
    
    // 1. Recopila todas las referencias a imágenes temporales
    const imageFiles = new Map();
    const imageMetadata = new Map();
    
    // Función recursiva para buscar imágenes en componentes
    const findImageReferences = (comps, parentPath = '') => {
      if (!comps || !Array.isArray(comps)) return;
      
      comps.forEach((comp, index) => {
        const componentPath = parentPath ? `${parentPath}.children[${index}]` : `components[${index}]`;
        
        if (comp.type === 'image' && typeof comp.content === 'string') {
          // Si es una referencia temporal
          if (comp.content.startsWith('__IMAGE_REF__')) {
            console.log(`🔍 PROCESS: Analizando imagen en ${componentPath}: ${comp.content}`);
            
            let file = null;
            let metadata = {};
            
            // Opción 1: Usar el gestor optimizado de memoria
            const tempFileData = imageMemoryManager.getTempFile(comp.content);
            if (tempFileData && tempFileData.file) {
              file = tempFileData.file;
              metadata = tempFileData.metadata || {};
              console.log(`✅ PROCESS: Archivo encontrado en gestor optimizado: ${file.name}`);
            }
            // Opción 2: Buscar en ubicaciones tradicionales
            else {
              // En _tempFile o _imageFile directamente
              if (comp._tempFile instanceof File || comp._tempFile instanceof Blob) {
                file = comp._tempFile;
              } else if (comp._imageFile instanceof File || comp._imageFile instanceof Blob) {
                file = comp._imageFile;
              }
              // En style.desktop._tempFile
              else if (comp.style?.desktop?._tempFile instanceof File || 
                       comp.style?.desktop?._tempFile instanceof Blob) {
                file = comp.style.desktop._tempFile;
              }
              // En style.tablet._tempFile
              else if (comp.style?.tablet?._tempFile instanceof File || 
                       comp.style?.tablet?._tempFile instanceof Blob) {
                file = comp.style.tablet._tempFile;
              }
              // En style.mobile._tempFile
              else if (comp.style?.mobile?._tempFile instanceof File || 
                       comp.style?.mobile?._tempFile instanceof Blob) {
                file = comp.style.mobile._tempFile;
              }
              // Fallback: window._imageFiles
              else if (window._imageFiles && window._imageFiles[comp.content]) {
                file = window._imageFiles[comp.content];
              }
              
              if (file) {
                console.log(`✅ PROCESS: Archivo encontrado (compatibilidad): ${file.name}`);
              }
            }
            
            // Si encontramos un archivo válido
            if (file) {
              imageFiles.set(comp.content, file);
              imageMetadata.set(comp.content, {
                ...metadata,
                componentId: comp.id,
                componentPath,
                isInContainer: parentPath.includes('children'),
                aspectRatio: metadata.aspectRatio || imageMemoryManager.getCachedAspectRatio(comp.content)
              });
              
              console.log(`💾 PROCESS: Archivo registrado: ${comp.content} => ${file.name} (${file.size} bytes)`);
            } else {
              console.warn(`⚠️ PROCESS: No se encontró archivo para ${comp.content} en ${componentPath}`);
            }
          }
        }
        
        // Buscar también en componentes hijos (soporte para contenedores)
        if (comp.children && Array.isArray(comp.children)) {
          findImageReferences(comp.children, componentPath);
        }
      });
    };
    
    // Ejecutamos la búsqueda
    findImageReferences(components);
    
    // 2. Creamos un FormData si encontramos imágenes
    if (imageFiles.size > 0) {
      console.log(`🖼️ PROCESS: Encontradas ${imageFiles.size} imágenes temporales (incluye contenedores)`);
      
      // Creamos un FormData fresco
      const formData = new FormData();
      
      // Agregamos los archivos con nombres que ayuden a identificarlos
      let fileCounter = 0;
      const processedFiles = [];
      
      imageFiles.forEach((file, imageRef) => {
        const metadata = imageMetadata.get(imageRef) || {};
        const imageId = imageRef.replace('__IMAGE_REF__', '');
        const fileName = `IMAGE_REF_${imageId}_${file.name || `image${fileCounter}.jpg`}`;
        
        // Asegurarnos de que el archivo tenga un nombre válido
        formData.append('bannerImages', file, fileName);
        fileCounter++;
        
        processedFiles.push({
          imageRef,
          fileName,
          originalName: file.name,
          size: file.size,
          componentId: metadata.componentId,
          componentPath: metadata.componentPath,
          isInContainer: metadata.isInContainer,
          aspectRatio: metadata.aspectRatio
        });
        
        console.log(`📎 PROCESS: [${fileCounter}/${imageFiles.size}] Añadido: ${fileName} ${metadata.isInContainer ? '(en contenedor)' : '(directo)'}`);
      });
      
      // Estadísticas
      const containerImages = processedFiles.filter(f => f.isInContainer).length;
      const directImages = processedFiles.filter(f => !f.isInContainer).length;
      
      console.log(`📊 PROCESS: Estadísticas - Total: ${fileCounter}, Contenedores: ${containerImages}, Directas: ${directImages}`);
      
      // Devolvemos la información procesada mejorada
      return {
        hasImages: true,
        formData: formData,
        imageCount: imageFiles.size,
        imageFiles: imageFiles,
        imageMetadata: imageMetadata,
        processedFiles: processedFiles,
        stats: {
          total: fileCounter,
          inContainers: containerImages,
          direct: directImages
        }
      };
    }
    
    console.log('📝 PROCESS: No se encontraron imágenes temporales');
    
    // Si no hay imágenes, simplemente devolvemos que no las hay
    return {
      hasImages: false,
      formData: null,
      imageCount: 0,
      imageFiles: null,
      imageMetadata: null,
      processedFiles: [],
      stats: {
        total: 0,
        inContainers: 0,
        direct: 0
      }
    };
  };