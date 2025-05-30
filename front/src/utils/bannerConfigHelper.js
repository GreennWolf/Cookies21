// src/utils/bannerConfigHelper.js

/**
 * Clase auxiliar mejorada para la conversión de formatos entre frontend y backend
 * Soluciona problemas de sincronización de estilos y posiciones entre dispositivos
 */
export class BannerConfigHelper {
  /**
   * Función auxiliar para transformar hijos al formato frontend
   * @private
   */
  static _transformChildrenToFrontend(children, language = 'en') {
    if (!children || !Array.isArray(children)) return [];
    
    return children.map(child => {
      // Extraer el contenido de forma consistente
      const content = BannerConfigHelper._transformContentToFrontend(child.content, language);
      
      // Separar estilos y posiciones por dispositivo
      const style = {
        desktop: {},
        tablet: {},
        mobile: {}
      };
      
      const position = {
        desktop: { top: '0%', left: '0%' },
        tablet: { top: '0%', left: '0%' },
        mobile: { top: '0%', left: '0%' }
      };
      
      // Extraer posiciones del estilo base
      if (child.style) {
        // Copiar estilos base a desktop, excluyendo posiciones
        Object.entries(child.style).forEach(([key, value]) => {
          if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
            style.desktop[key] = value;
          }
        });
        
        // Extraer posiciones del estilo base para desktop
        if (child.style.position === 'absolute') {
          position.desktop.top = child.style.top || '0%';
          position.desktop.left = child.style.left || '0%';
        }
      }
      
      // Extraer estilos y posiciones para tablet
      if (child.responsive?.tablet?.style) {
        Object.entries(child.responsive.tablet.style).forEach(([key, value]) => {
          if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
            style.tablet[key] = value;
          }
        });
        
        if (child.responsive.tablet.style.position === 'absolute') {
          position.tablet.top = child.responsive.tablet.style.top || position.desktop.top;
          position.tablet.left = child.responsive.tablet.style.left || position.desktop.left;
        }
      } else {
        style.tablet = { ...style.desktop };
        position.tablet = { ...position.desktop };
      }
      
      // Extraer estilos y posiciones para mobile
      if (child.responsive?.mobile?.style) {
        Object.entries(child.responsive.mobile.style).forEach(([key, value]) => {
          if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
            style.mobile[key] = value;
          }
        });
        
        if (child.responsive.mobile.style.position === 'absolute') {
          position.mobile.top = child.responsive.mobile.style.top || position.desktop.top;
          position.mobile.left = child.responsive.mobile.style.left || position.desktop.left;
        }
      } else {
        style.mobile = { ...style.desktop };
        position.mobile = { ...position.desktop };
      }
      
      // Asegurar que las posiciones siempre sean porcentajes
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        position[device].top = BannerConfigHelper._ensurePercentage(position[device].top);
        position[device].left = BannerConfigHelper._ensurePercentage(position[device].left);
      });
      
      // Construir el componente transformado
      const transformedChild = {
        id: child.id,
        type: child.type,
        content: content,
        locked: child.locked || false,
        style: style,
        position: position,
        action: child.action
      };
      
      // Procesar recursivamente si el hijo también es un contenedor
      if (child.type === 'container' && child.children && Array.isArray(child.children)) {
        transformedChild.children = BannerConfigHelper._transformChildrenToFrontend(child.children, language);
      }
      
      return transformedChild;
    });
  }

  /**
   * Función auxiliar para transformar hijos recursivamente al backend
   * @private
   */
  static _transformChildrenToBackend(children) {
    if (!children || !Array.isArray(children)) return [];
    
    return children.map(child => {
      const childComp = {
        id: child.id,
        type: child.type,
        content: BannerConfigHelper._transformContentToBackend(child.content),
        locked: child.locked || false,
        action: child.action
      };
      
      // IMPORTANTE: Preservar propiedades especiales de archivos de imagen
      if (child.type === 'image') {
        if (child._imageFile) childComp._imageFile = child._imageFile;
        if (child._tempFile) childComp._tempFile = child._tempFile;
        if (child._imageRef) childComp._imageRef = child._imageRef;
        if (child._fileName) childComp._fileName = child._fileName;
        if (child._fileSize) childComp._fileSize = child._fileSize;
        if (child._fileType) childComp._fileType = child._fileType;
      }
      
      // Usar los estilos de desktop como estilos base
      childComp.style = child.style?.desktop || {};
      
      // Incorporar las posiciones desktop al estilo base
      if (child.position?.desktop) {
        childComp.style.position = 'absolute';
        childComp.style.top = child.position.desktop.top;
        childComp.style.left = child.position.desktop.left;
      }
      
      // Crear la estructura responsive solo si hay estilos específicos
      childComp.responsive = {};
      
      // Tablet
      if (child.style?.tablet || child.position?.tablet) {
        childComp.responsive.tablet = { style: {} };
        
        if (child.style?.tablet) {
          childComp.responsive.tablet.style = { ...child.style.tablet };
        }
        
        if (child.position?.tablet) {
          childComp.responsive.tablet.style.position = 'absolute';
          childComp.responsive.tablet.style.top = child.position.tablet.top;
          childComp.responsive.tablet.style.left = child.position.tablet.left;
        }
      }
      
      // Mobile
      if (child.style?.mobile || child.position?.mobile) {
        childComp.responsive.mobile = { style: {} };
        
        if (child.style?.mobile) {
          childComp.responsive.mobile.style = { ...child.style.mobile };
        }
        
        if (child.position?.mobile) {
          childComp.responsive.mobile.style.position = 'absolute';
          childComp.responsive.mobile.style.top = child.position.mobile.top;
          childComp.responsive.mobile.style.left = child.position.mobile.left;
        }
      }
      
      // Si no hay estilos responsive, eliminar la propiedad
      if (Object.keys(childComp.responsive).length === 0) {
        delete childComp.responsive;
      }
      
      // Procesar recursivamente si el hijo también es un contenedor
      if (child.type === 'container' && child.children && Array.isArray(child.children)) {
        childComp.children = BannerConfigHelper._transformChildrenToBackend(child.children);
      }
      
      return childComp;
    });
  }

  /**
   * Transforma un objeto de configuración del frontend al formato esperado por el backend
   * 
   * @param {Object} frontConfig - Configuración del banner en formato frontend
   * @returns {Object} - Configuración adaptada para el backend
   */
  static toBackendFormat(frontConfig) {
    if (!frontConfig) return null;
    
    console.log('🔄 BannerConfigHelper: Transformando configuración frontend → backend');
    console.log('📥 INPUT:', { 
      hasLayout: !!frontConfig.layout,
      layoutKeys: frontConfig.layout ? Object.keys(frontConfig.layout) : [],
      componentsCount: frontConfig.components?.length || 0,
      componentTypes: frontConfig.components?.map(c => c.type) || [],
      otherProps: Object.keys(frontConfig).filter(k => k !== 'layout' && k !== 'components')
    });
    
    const { layout = {}, components = [], ...rest } = frontConfig;
    const result = { ...rest };
    
    // Transformar el layout
    result.layout = {
      default: layout.desktop || {},
      responsive: {}
    };
    
    // Agregar configuraciones responsive solo si son diferentes a desktop
    if (layout.tablet && Object.keys(layout.tablet).length > 0) {
      result.layout.responsive.tablet = layout.tablet;
    }
    
    if (layout.mobile && Object.keys(layout.mobile).length > 0) {
      result.layout.responsive.mobile = layout.mobile;
    }
    
    // Transformar los componentes
    if (Array.isArray(components)) {
      result.components = components.map(comp => {
        // Crear una copia profunda para evitar mutaciones accidentales
        const component = JSON.parse(JSON.stringify(comp));
        
        // Preparar el resultado con propiedades básicas
        const transformedComp = {
          id: component.id,
          type: component.type,
          content: BannerConfigHelper._transformContentToBackend(component.content),
          locked: component.locked || false,
          action: component.action
        };
        
        // IMPORTANTE: Preservar propiedades especiales de archivos de imagen
        if (component.type === 'image') {
          if (component._imageFile) transformedComp._imageFile = component._imageFile;
          if (component._tempFile) transformedComp._tempFile = component._tempFile;
          if (component._imageRef) transformedComp._imageRef = component._imageRef;
          if (component._fileName) transformedComp._fileName = component._fileName;
          if (component._fileSize) transformedComp._fileSize = component._fileSize;
          if (component._fileType) transformedComp._fileType = component._fileType;
        }
        
        // Usar los estilos de desktop como estilos base
        transformedComp.style = component.style?.desktop || {};
        
        // Incorporar las posiciones desktop al estilo base
        if (component.position?.desktop) {
          // Siempre convertir posiciones a valores absolutos para el backend
          transformedComp.style.position = 'absolute';
          transformedComp.style.top = component.position.desktop.top;
          transformedComp.style.left = component.position.desktop.left;
        }
        
        // Crear la estructura responsive solo si hay estilos específicos
        transformedComp.responsive = {};
        
        // Tablet: solo incluir si hay diferencias con desktop
        if (component.style?.tablet || component.position?.tablet) {
          transformedComp.responsive.tablet = { style: {} };
          
          // Incluir estilos específicos de tablet
          if (component.style?.tablet) {
            transformedComp.responsive.tablet.style = { ...component.style.tablet };
          }
          
          // Incluir posiciones específicas de tablet
          if (component.position?.tablet) {
            transformedComp.responsive.tablet.style.position = 'absolute';
            transformedComp.responsive.tablet.style.top = component.position.tablet.top;
            transformedComp.responsive.tablet.style.left = component.position.tablet.left;
          }
        }
        
        // Mobile: solo incluir si hay diferencias con desktop
        if (component.style?.mobile || component.position?.mobile) {
          transformedComp.responsive.mobile = { style: {} };
          
          // Incluir estilos específicos de mobile
          if (component.style?.mobile) {
            transformedComp.responsive.mobile.style = { ...component.style.mobile };
          }
          
          // Incluir posiciones específicas de mobile
          if (component.position?.mobile) {
            transformedComp.responsive.mobile.style.position = 'absolute';
            transformedComp.responsive.mobile.style.top = component.position.mobile.top;
            transformedComp.responsive.mobile.style.left = component.position.mobile.left;
          }
        }
        
        // Si no hay estilos responsive, eliminar la propiedad
        if (Object.keys(transformedComp.responsive).length === 0) {
          delete transformedComp.responsive;
        }
        
        // IMPORTANTE: Procesar recursivamente los hijos de los contenedores
        if (component.type === 'container' && component.children && Array.isArray(component.children)) {
          transformedComp.children = component.children.map(child => {
            // Aplicar la misma transformación a cada hijo
            const childComp = {
              id: child.id,
              type: child.type,
              content: BannerConfigHelper._transformContentToBackend(child.content),
              locked: child.locked || false,
              action: child.action
            };
            
            // IMPORTANTE: Preservar propiedades especiales de archivos de imagen
            if (child.type === 'image') {
              if (child._imageFile) childComp._imageFile = child._imageFile;
              if (child._tempFile) childComp._tempFile = child._tempFile;
              if (child._imageRef) childComp._imageRef = child._imageRef;
              if (child._fileName) childComp._fileName = child._fileName;
              if (child._fileSize) childComp._fileSize = child._fileSize;
              if (child._fileType) childComp._fileType = child._fileType;
            }
            
            // Usar los estilos de desktop como estilos base
            childComp.style = child.style?.desktop || {};
            
            // Incorporar las posiciones desktop al estilo base
            if (child.position?.desktop) {
              childComp.style.position = 'absolute';
              childComp.style.top = child.position.desktop.top;
              childComp.style.left = child.position.desktop.left;
            }
            
            // Crear la estructura responsive solo si hay estilos específicos
            childComp.responsive = {};
            
            // Tablet: solo incluir si hay diferencias con desktop
            if (child.style?.tablet || child.position?.tablet) {
              childComp.responsive.tablet = { style: {} };
              
              if (child.style?.tablet) {
                childComp.responsive.tablet.style = { ...child.style.tablet };
              }
              
              if (child.position?.tablet) {
                childComp.responsive.tablet.style.position = 'absolute';
                childComp.responsive.tablet.style.top = child.position.tablet.top;
                childComp.responsive.tablet.style.left = child.position.tablet.left;
              }
            }
            
            // Mobile: solo incluir si hay diferencias con desktop
            if (child.style?.mobile || child.position?.mobile) {
              childComp.responsive.mobile = { style: {} };
              
              if (child.style?.mobile) {
                childComp.responsive.mobile.style = { ...child.style.mobile };
              }
              
              if (child.position?.mobile) {
                childComp.responsive.mobile.style.position = 'absolute';
                childComp.responsive.mobile.style.top = child.position.mobile.top;
                childComp.responsive.mobile.style.left = child.position.mobile.left;
              }
            }
            
            // Si no hay estilos responsive, eliminar la propiedad
            if (Object.keys(childComp.responsive).length === 0) {
              delete childComp.responsive;
            }
            
            // IMPORTANTE: Procesar recursivamente si el hijo también es un contenedor
            if (child.type === 'container' && child.children && Array.isArray(child.children)) {
              childComp.children = BannerConfigHelper._transformChildrenToBackend(child.children);
            }
            
            return childComp;
          });
        }
        
        return transformedComp;
      });
    }
    
    console.log('📤 OUTPUT:', { 
      hasLayout: !!result.layout,
      layoutDefault: !!result.layout?.default,
      layoutResponsive: !!result.layout?.responsive,
      componentsCount: result.components?.length || 0,
      componentTypes: result.components?.map(c => c.type) || [],
      otherProps: Object.keys(result).filter(k => k !== 'layout' && k !== 'components')
    });
    console.log('✅ BannerConfigHelper: Configuración transformada al formato backend');
    return result;
  }
  
  /**
   * Transforma un objeto de configuración del backend al formato usado por el frontend
   * 
   * @param {Object} backendConfig - Configuración del banner en formato backend
   * @param {string} language - Idioma para traducir el contenido (por defecto 'en')
   * @returns {Object} - Configuración adaptada para el frontend
   */
  static toFrontendFormat(backendConfig, language = 'en') {
    if (!backendConfig) return null;
    
    // console.log('🔄 Transformando configuración backend → frontend:', backendConfig);
    
    const { layout = {}, components = [], ...rest } = backendConfig;
    const result = { ...rest };
    
    // Transformar el layout
    result.layout = {
      desktop: layout.default || {},
      tablet: layout.responsive?.tablet || {},
      mobile: layout.responsive?.mobile || {}
    };
    
    // Transformar componentes
    if (Array.isArray(components)) {
      result.components = components.map(comp => {
        // Crear copia profunda para evitar mutaciones
        const component = JSON.parse(JSON.stringify(comp));
        
        // Extraer el contenido de forma consistente
        const content = BannerConfigHelper._transformContentToFrontend(component.content, language);
        
        // Separar estilos y posiciones por dispositivo
        const style = {
          desktop: {},
          tablet: {},
          mobile: {}
        };
        
        const position = {
          desktop: { top: '0%', left: '0%' },
          tablet: { top: '0%', left: '0%' },
          mobile: { top: '0%', left: '0%' }
        };
        
        // Extraer posiciones del estilo base
        if (component.style) {
          // Copiar estilos base a desktop, excluyendo posiciones
          Object.entries(component.style).forEach(([key, value]) => {
            if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
              style.desktop[key] = value;
            }
          });
          
          // Extraer posiciones del estilo base para desktop
          if (component.style.position === 'absolute') {
            position.desktop.top = component.style.top || '0%';
            position.desktop.left = component.style.left || '0%';
          }
        }
        
        // Extraer estilos y posiciones para tablet
        if (component.responsive?.tablet?.style) {
          // Copiar estilos específicos a tablet, excluyendo posiciones
          Object.entries(component.responsive.tablet.style).forEach(([key, value]) => {
            if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
              style.tablet[key] = value;
            }
          });
          
          // Extraer posiciones para tablet
          if (component.responsive.tablet.style.position === 'absolute') {
            position.tablet.top = component.responsive.tablet.style.top || position.desktop.top;
            position.tablet.left = component.responsive.tablet.style.left || position.desktop.left;
          }
        } else {
          // Si no hay estilos específicos, heredar de desktop
          style.tablet = { ...style.desktop };
          position.tablet = { ...position.desktop };
        }
        
        // Extraer estilos y posiciones para mobile
        if (component.responsive?.mobile?.style) {
          // Copiar estilos específicos a mobile, excluyendo posiciones
          Object.entries(component.responsive.mobile.style).forEach(([key, value]) => {
            if (!['position', 'top', 'left', 'right', 'bottom'].includes(key)) {
              style.mobile[key] = value;
            }
          });
          
          // Extraer posiciones para mobile
          if (component.responsive.mobile.style.position === 'absolute') {
            position.mobile.top = component.responsive.mobile.style.top || position.desktop.top;
            position.mobile.left = component.responsive.mobile.style.left || position.desktop.left;
          }
        } else {
          // Si no hay estilos específicos, heredar de desktop
          style.mobile = { ...style.desktop };
          position.mobile = { ...position.desktop };
        }
        
        // Asegurar que las posiciones siempre sean porcentajes
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          position[device].top = BannerConfigHelper._ensurePercentage(position[device].top);
          position[device].left = BannerConfigHelper._ensurePercentage(position[device].left);
        });
        
        // Construir el componente transformado
        const transformedComp = {
          id: component.id,
          type: component.type,
          content: content,
          locked: component.locked || false,
          style: style,
          position: position,
          action: component.action
        };
        
        // IMPORTANTE: Procesar recursivamente los hijos de los contenedores
        if (component.type === 'container' && component.children && Array.isArray(component.children)) {
          transformedComp.children = BannerConfigHelper._transformChildrenToFrontend(component.children, language);
        }
        
        return transformedComp;
      });
    }
    
    // console.log('✅ Configuración transformada al formato frontend:', result);
    return result;
  }
  
  /**
   * Transforma el contenido de un componente al formato de backend
   * 
   * @param {any} content - Contenido en formato frontend
   * @returns {any} - Contenido en formato backend
   * @private
   */
  static _transformContentToBackend(content) {
    // Si es null o undefined, devolver string vacío
    if (content === null || content === undefined) {
      return '';
    }
    
    // Si ya es string, devolverlo directamente (incluye referencias temporales de imagen)
    if (typeof content === 'string') {
      return content;
    }
    
    // Si es un objeto con propiedad text, extraer el texto
    if (typeof content === 'object' && content.text) {
      if (typeof content.text === 'string') {
        return content.text;
      }
      
      // Si text es un objeto (traducciones), usar 'en' o el primer valor
      if (typeof content.text === 'object') {
        return content.text.en || Object.values(content.text)[0] || '';
      }
    }
    
    // Cualquier otro caso, convertir a string
    return String(content);
  }
  
  /**
   * Transforma el contenido de un componente al formato de frontend
   * 
   * @param {any} content - Contenido en formato backend
   * @param {string} language - Idioma preferido
   * @returns {string} - Contenido en formato frontend (siempre string)
   * @private
   */
  static _transformContentToFrontend(content, language = 'en') {
    // Si es null o undefined, devolver string vacío
    if (content === null || content === undefined) {
      return '';
    }
    
    // Si ya es string, devolverlo directamente
    if (typeof content === 'string') {
      return content;
    }
    
    // Si es un objeto con propiedad text, extraer el texto
    if (typeof content === 'object') {
      if (content.text) {
        if (typeof content.text === 'string') {
          return content.text;
        }
        
        // Manejar diferentes formatos de traducciones
        if (content.text instanceof Map) {
          return content.text.get(language) || '';
        }
        
        if (typeof content.text === 'object') {
          return content.text[language] || Object.values(content.text)[0] || '';
        }
      }
    }
    
    // Cualquier otro caso, convertir a string
    return String(content);
  }
  
  /**
   * Asegura que un valor de posición esté en formato de porcentaje
   * 
   * @param {string|number} value - Valor a convertir
   * @returns {string} - Valor en formato de porcentaje
   * @private
   */
  static _ensurePercentage(value) {
    if (!value) return '0%';
    
    // Si ya es porcentaje, devolverlo
    if (typeof value === 'string' && value.endsWith('%')) {
      return value;
    }
    
    // Si es píxeles, convertir (asumiendo contenedor de 1000px)
    if (typeof value === 'string' && value.endsWith('px')) {
      const pixels = parseFloat(value);
      return `${(pixels / 1000) * 100}%`;
    }
    
    // Si es número, asumir que es un porcentaje
    if (typeof value === 'number') {
      return `${value}%`;
    }
    
    // Si es string sin unidad, asumir que es un porcentaje
    if (typeof value === 'string') {
      return value.includes('%') ? value : `${value}%`;
    }
    
    // Fallback
    return '0%';
  }

  /**
 * Extrae y procesa las imágenes en base64 del objeto de configuración
 * @param {Object} config - Configuración del banner
 * @returns {Object} - Objeto con las imágenes extraídas y la config actualizada
 */
static extractBase64Images(config) {
  // Clonar la configuración para no modificar el original
  const newConfig = JSON.parse(JSON.stringify(config));
  const extractedImages = [];
  
  // Procesar componentes para encontrar imágenes en base64
  if (newConfig.components && Array.isArray(newConfig.components)) {
    newConfig.components = newConfig.components.map(comp => {
      // Solo procesar componentes de tipo imagen
      if (comp.type === 'image' && typeof comp.content === 'string') {
        // Verificar si es una imagen en base64
        if (comp.content.startsWith('data:image')) {
          // Extraer información de la imagen
          const matches = comp.content.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            const imageType = matches[1];
            const base64Data = matches[2];
            const extension = imageType.split('/')[1].replace('jpeg', 'jpg');
            
            // Generar nombre único para la imagen
            const imageName = `img_${comp.id}_${Date.now()}.${extension}`;
            
            // Añadir a la lista de imágenes extraídas
            extractedImages.push({
              id: comp.id,
              name: imageName,
              type: imageType,
              data: base64Data
            });
            
            // Reemplazar contenido con placeholder (se actualizará después con la URL real)
            comp.content = `__IMAGE_PLACEHOLDER__${imageName}`;
          }
        }
      }
      
      // Procesar componentes anidados recursivamente
      if (comp.children && Array.isArray(comp.children)) {
        const result = BannerConfigHelper.extractBase64Images({ components: comp.children });
        comp.children = result.config.components;
        extractedImages.push(...result.images);
      }
      
      return comp;
    });
  }
  
  return {
    config: newConfig,
    images: extractedImages
  };
}

   
  /**
   * Función principal para convertir la config de FRONT al formato que necesita
   * el BACK en el update. Se basa en `toBackendFormat`, pero limpia campos
   * internos como `_id`, timestamps, etc. para no sobrescribirlos.
   */
  static toUpdateBackend(frontConfig) {
    // 1. Generamos la estructura base igual que en la creación
    const transformed = BannerConfigHelper.toBackendFormat(frontConfig);
    if (!transformed) return null;

    // 2. Eliminamos campos que no queremos sobrescribir en el update
    delete transformed._id;
    delete transformed.createdAt;
    delete transformed.updatedAt;
    delete transformed.__v;

    // 3. Ajustamos metadata si no queremos cambiar ciertos campos
    if (transformed.metadata) {
      // Ejemplo: no permitir sobreescritura de createdBy
      delete transformed.metadata.createdBy;
      // Si no deseas cambiar isPublic, category, etc., elimínalos también:
      // delete transformed.metadata.isPublic;
      // delete transformed.metadata.category;
      // ...
    }

    // 4. En cada componente, eliminamos también _id si existiera
    if (Array.isArray(transformed.components)) {
      transformed.components = transformed.components.map((comp) => {
        delete comp._id; // por si en la base se guardó un _id interno
        return comp;
      });
    }

    return transformed;
  }
}

/**
 * Transforma una configuración completa de banner del frontend al backend
 */
export const transformConfigToBackend = (frontendConfig) => {
  return BannerConfigHelper.toBackendFormat(frontendConfig);
};

/**
 * Transforma una configuración completa de banner del backend al frontend
 */
export const transformConfigToFrontend = (backendConfig, language = 'en') => {
  return BannerConfigHelper.toFrontendFormat(backendConfig, language);
};

export default BannerConfigHelper;