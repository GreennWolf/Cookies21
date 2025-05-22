// Utilidad para procesar imágenes en componentes
export const processComponentImages = (components) => {
    // 1. Recopila todas las referencias a imágenes temporales
    const imageFiles = new Map();
    
    // Función recursiva para buscar imágenes en componentes
    const findImageReferences = (comps) => {
      if (!comps || !Array.isArray(comps)) return;
      
      comps.forEach(comp => {
        if (comp.type === 'image' && typeof comp.content === 'string') {
          // Si es una referencia temporal
          if (comp.content.startsWith('__IMAGE_REF__')) {
            console.log(`🔍 Analizando imagen en componente ${comp.id}: ${comp.content}`);
            
            // Buscar el archivo en múltiples ubicaciones posibles
            let file = null;
            
            // Opción 1: En _tempFile o _imageFile directamente
            if (comp._tempFile instanceof File || comp._tempFile instanceof Blob) {
              file = comp._tempFile;
            } else if (comp._imageFile instanceof File || comp._imageFile instanceof Blob) {
              file = comp._imageFile;
            }
            // Opción 2: En style.desktop._tempFile
            else if (comp.style?.desktop?._tempFile instanceof File || 
                     comp.style?.desktop?._tempFile instanceof Blob) {
              file = comp.style.desktop._tempFile;
            }
            // Opción 3: En style.tablet._tempFile
            else if (comp.style?.tablet?._tempFile instanceof File || 
                     comp.style?.tablet?._tempFile instanceof Blob) {
              file = comp.style.tablet._tempFile;
            }
            // Opción 4: En style.mobile._tempFile
            else if (comp.style?.mobile?._tempFile instanceof File || 
                     comp.style?.mobile?._tempFile instanceof Blob) {
              file = comp.style.mobile._tempFile;
            }
            
            // Si encontramos un archivo válido
            if (file) {
              imageFiles.set(comp.content, file);
              console.log(`✅ Archivo encontrado para ${comp.content}: ${file.name}, ${file.size} bytes`);
            }
          }
        }
        
        // Buscar también en componentes hijos
        if (comp.children && Array.isArray(comp.children)) {
          findImageReferences(comp.children);
        }
      });
    };
    
    // Ejecutamos la búsqueda
    findImageReferences(components);
    
    // 2. Creamos un FormData si encontramos imágenes
    if (imageFiles.size > 0) {
      console.log(`🖼️ Encontradas ${imageFiles.size} imágenes temporales`);
      
      // Creamos un FormData fresco
      const formData = new FormData();
      
      // Agregamos los archivos con nombres que ayuden a identificarlos
      let fileCounter = 0;
      imageFiles.forEach((file, imageRef) => {
        const imageId = imageRef.replace('__IMAGE_REF__', '');
        const fileName = `IMAGE_REF_${imageId}_${file.name || `image${fileCounter}.jpg`}`;
        
        // Asegurarnos de que el archivo tenga un nombre válido
        formData.append('bannerImages', file, fileName);
        fileCounter++;
        
        console.log(`📎 [${fileCounter}/${imageFiles.size}] Añadido: ${fileName}, ${file.size} bytes`);
      });
      
      // Devolvemos la información procesada
      return {
        hasImages: true,
        formData: formData,
        imageCount: imageFiles.size,
        imageFiles: imageFiles
      };
    }
    
    // Si no hay imágenes, simplemente devolvemos que no las hay
    return {
      hasImages: false,
      formData: null,
      imageCount: 0,
      imageFiles: null
    };
  };