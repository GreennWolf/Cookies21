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
 * Función centralizada para obtener URL de imagen con múltiples estrategias de fallback
 * @param {Object} component - Componente que contiene la imagen
 * @param {string} deviceView - Vista actual (desktop, tablet, mobile)
 * @param {string} context - Contexto de uso (preview, thumbnail, config)
 * @returns {string} URL de la imagen
 */
export const getImageUrl = (component, deviceView = 'desktop', context = 'preview') => {
  try {
    // CASO 0: Añadir cache-busting para evitar problemas de caché
    const cacheBuster = `?t=${Date.now()}`;
    
    // CASO 1: Si hay una URL de previsualización en el estilo, usar esa directamente
    const deviceStyle = component.style?.[deviceView];
    if (deviceStyle?._previewUrl) {
      // Para blob URLs no añadir parámetros
      if (deviceStyle._previewUrl.startsWith('blob:')) {
        console.log(`✓ ${context}: Usando URL de preview (blob): ${deviceStyle._previewUrl}`);
        return deviceStyle._previewUrl;
      }
      // Para otras URLs añadir cache busting
      const url = deviceStyle._previewUrl + (deviceStyle._previewUrl.includes('?') ? '&cb=' + Date.now() : cacheBuster);
      console.log(`✓ ${context}: Usando URL de preview:`, url);
      return url;
    }
    
    // CASO 2: Si es una referencia temporal, usar URL temporal u ObjectURL
    if (typeof component.content === 'string' && component.content.startsWith('__IMAGE_REF__')) {
      // Verificar si hay una imagen temporal en memoria global
      const tempFileData = imageMemoryManager.getTempFile(component.content);
      if (tempFileData && tempFileData.file) {
        const objectUrl = imageMemoryManager.createObjectURL(tempFileData.file);
        if (objectUrl) {
          console.log(`✓ ${context}: ObjectURL creado con gestión optimizada de memoria`);
          return objectUrl;
        }
      }
      
      // Fallback al sistema anterior por compatibilidad
      if (window._imageFiles && window._imageFiles[component.content]) {
        const file = window._imageFiles[component.content];
        const objectUrl = imageMemoryManager.createObjectURL(file);
        if (objectUrl) {
          console.log(`✓ ${context}: ObjectURL creado (compatibilidad) para imagen temporal`);
          return objectUrl;
        }
      }
      // Imagen de carga mientras se procesa
      return ImagePlaceholders.loading;
    }
    
    // CASO 3: Imágenes Data URI
    if (typeof component.content === 'string' && component.content.startsWith('data:')) {
      return component.content;
    }
    
    // CASO 4: Imágenes Blob URL
    if (typeof component.content === 'string' && component.content.startsWith('blob:')) {
      return component.content;
    }
    
    // CASO 5: Rutas /direct-image/
    if (typeof component.content === 'string' && component.content.includes('/direct-image/')) {
      // Extraer el path relativo
      const parts = component.content.split('/direct-image/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
        
        // Usar URL absoluta con servidor actual
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/direct-image/${relativePath}${cacheBuster}`;
        return fullUrl;
      }
    }
    
    // CASO 6: Rutas /templates/images/
    if (typeof component.content === 'string' && component.content.includes('/templates/images/')) {
      // Extraer el path relativo
      const parts = component.content.split('/templates/images/');
      if (parts.length === 2) {
        const relativePath = parts[1].split('?')[0]; // Eliminar parámetros de consulta
        
        // Usar URL absoluta con servidor actual
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/templates/images/${relativePath}${cacheBuster}`;
        return fullUrl;
      }
    }
    
    // CASO 7: Otras rutas relativas
    if (typeof component.content === 'string' && component.content.startsWith('/')) {
      const fullUrl = `${window.location.origin}${component.content}${component.content.includes('?') ? '&cb=' + Date.now() : cacheBuster}`;
      return fullUrl;
    }
    
    // CASO 8: URLs http/https
    if (typeof component.content === 'string' && 
        (component.content.startsWith('http://') || component.content.startsWith('https://'))) {
      return component.content;
    }
    
    // CASO 9: Objeto con URL o texto
    if (component.content && typeof component.content === 'object') {
      // Objeto con propiedad URL
      if (component.content.url) {
        if (component.content.url.startsWith('/')) {
          const serverUrl = window.location.origin;
          return `${serverUrl}${component.content.url}${cacheBuster}`;
        }
        return component.content.url;
      }
      
      // Objeto con textos multilingual
      if (component.content.texts && typeof component.content.texts === 'object') {
        // Intentar primero inglés
        if (component.content.texts.en) {
          const enText = component.content.texts.en;
          if (typeof enText === 'string') {
            // Si es una URL relativa, convertirla a absoluta
            if (enText.startsWith('/')) {
              const serverUrl = window.location.origin;
              return `${serverUrl}${enText}${cacheBuster}`;
            }
            // Si es URL http/https o data URI, usarla directo
            if (enText.startsWith('http') || enText.startsWith('data:') || enText.startsWith('blob:')) {
              return enText;
            }
          }
        }
        
        // Si no hay texto en inglés, usar el primer texto disponible
        for (const lang in component.content.texts) {
          if (lang === 'en') continue;
          
          const text = component.content.texts[lang];
          if (typeof text === 'string') {
            // Si es una URL relativa, convertirla a absoluta
            if (text.startsWith('/')) {
              const serverUrl = window.location.origin;
              return `${serverUrl}${text}${cacheBuster}`;
            }
            // Si es URL http/https o data URI, usarla directo
            if (text.startsWith('http') || text.startsWith('data:') || text.startsWith('blob:')) {
              return text;
            }
          }
        }
      }
    }
    
    // CASO 10: Fallback - usar placeholder
    return ImagePlaceholders.default;
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
  
  // Definir dimensiones que funcionarán
  // Extraer valores originales para asegurar dimensiones mínimas
  if (!processedStyle.width && !processedStyle.height) {
    processedStyle.width = '200px';  // Aumentamos el ancho predeterminado
    processedStyle.height = '150px'; // Aumentamos la altura predeterminada
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