// src/components/banner/Editor/hooks/useBannerEditor.js
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {createTemplate,updateTemplate} from '../../../../api/bannerTemplate';

const deepCloneWithFiles = (obj) => {
  if (obj === null || typeof obj !== 'object' || obj instanceof File || obj instanceof Blob) {
    return obj;
  }
  
  const clone = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepCloneWithFiles(obj[key]);
    }
  }
  
  return clone;
};

export function useBannerEditor() {
  // Estado inicial con configuración específica para cada dispositivo
  const [bannerConfig, setBannerConfig] = useState({
    name: 'Nuevo Banner',
    layout: {
      desktop: { 
        type: 'banner', 
        position: 'bottom', 
        backgroundColor: '#ffffff', 
        width: '100%', 
        height: 'auto', 
        minHeight: '100px' 
      },
      tablet: { 
        type: 'banner', 
        position: 'bottom', 
        backgroundColor: '#ffffff', 
        width: '100%', 
        height: 'auto', 
        minHeight: '100px' 
      },
      mobile: { 
        type: 'banner', 
        position: 'bottom', 
        backgroundColor: '#ffffff', 
        width: '100%', 
        height: 'auto', 
        minHeight: '100px' 
      }
    },
    components: [
      {
        id: 'acceptAll',
        type: 'button',
        locked: true,
        content: {
          texts: { en: 'Accept All' },
          translatable: true
        },
        action: { type: 'accept_all' },
        style: {
          desktop: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '16px', padding: '8px 16px' },
          tablet: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '14px', padding: '6px 12px' },
          mobile: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '12px', padding: '4px 8px' }
        },
        position: {
          desktop: { top: '10%', left: '10%' },
          tablet: { top: '10%', left: '10%' },
          mobile: { top: '10%', left: '10%' }
        }
      },
      {
        id: 'rejectAll',
        type: 'button',
        locked: true,
        content: {
          texts: { en: 'Reject All' },
          translatable: true
        },
        action: { type: 'reject_all' },
        style: {
          desktop: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '16px', padding: '8px 16px' },
          tablet: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '14px', padding: '6px 12px' },
          mobile: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '12px', padding: '4px 8px' }
        },
        position: {
          desktop: { top: '10%', left: '30%' },
          tablet: { top: '10%', left: '30%' },
          mobile: { top: '10%', left: '30%' }
        }
      },
      {
        id: 'preferencesBtn',
        type: 'button',
        locked: true,
        content: {
          texts: { en: 'Preferences' },
          translatable: true
        },
        action: { type: 'show_preferences' },
        style: {
          desktop: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '16px', padding: '8px 16px' },
          tablet: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '14px', padding: '6px 12px' },
          mobile: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '12px', padding: '4px 8px' }
        },
        position: {
          desktop: { top: '10%', left: '50%' },
          tablet: { top: '10%', left: '50%' },
          mobile: { top: '10%', left: '50%' }
        }
      }
    ]
  });

  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isPreferencesMode, setIsPreferencesMode] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [deviceView, setDeviceView] = useState('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Función para obtener contenido por defecto
  const getDefaultContent = (type) => {
    switch (type) {
      case 'text':
        return {
          texts: { en: 'New Text' },
          translatable: true
        };
      case 'button':
        return {
          texts: { en: 'New Button' },
          translatable: true
        };
      case 'container':
        return {
          texts: { en: '' },
          translatable: false
        };
      case 'image':
        return '/placeholder.png';
      default:
        return {
          texts: { en: '' },
          translatable: true
        };
    }
  };

  // Estilos predefinidos para componentes nuevos - Ahora más consistentes entre dispositivos
  const getDefaultStylesForNewComponent = (type) => {
    // Estilos base comunes para todos los dispositivos
    let baseStyles = {};
    
    switch (type) {
      case 'button':
        baseStyles = {
          backgroundColor: '#4CAF50',
          color: '#ffffff',
          borderRadius: '4px',
          cursor: 'pointer',
          border: 'none',
          fontFamily: 'inherit'
        };
        
        return {
          desktop: { ...baseStyles, fontSize: '16px', padding: '8px 16px' },
          tablet: { ...baseStyles, fontSize: '14px', padding: '6px 12px' },
          mobile: { ...baseStyles, fontSize: '12px', padding: '4px 8px' }
        };
        
      case 'text':
        baseStyles = {
          color: '#333333',
          lineHeight: '1.5',
          fontFamily: 'inherit'
        };
        
        return {
          desktop: { ...baseStyles, fontSize: '14px', padding: '8px' },
          tablet: { ...baseStyles, fontSize: '12px', padding: '6px' },
          mobile: { ...baseStyles, fontSize: '10px', padding: '4px' }
        };
        
      case 'image':
        baseStyles = {
          objectFit: 'contain',
          borderRadius: '4px'
        };
        
        return {
          desktop: { ...baseStyles, width: '200px', height: 'auto' },
          tablet: { ...baseStyles, width: '150px', height: 'auto' },
          mobile: { ...baseStyles, width: '100px', height: 'auto' }
        };
        
      case 'container':
        baseStyles = {
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        };
        
        return {
          desktop: { ...baseStyles, padding: '16px', minHeight: '50px', minWidth: '100px' },
          tablet: { ...baseStyles, padding: '12px', minHeight: '40px', minWidth: '80px' },
          mobile: { ...baseStyles, padding: '8px', minHeight: '30px', minWidth: '60px' }
        };
        
      default:
        return {
          desktop: {},
          tablet: {},
          mobile: {}
        };
    }
  };

  // Asegurar que los valores de posición estén en porcentajes
  const ensurePercentage = useCallback((value) => {
    if (!value) return '0%';
    
    // Si ya es porcentaje, devolverlo
    if (typeof value === 'string' && value.endsWith('%')) {
      return value;
    }
    
    // Si es píxeles, convertir a porcentaje (asumiendo contenedor de 1000px)
    if (typeof value === 'string' && value.endsWith('px')) {
      const pixels = parseFloat(value);
      return `${(pixels / 10)}%`;
    }
    
    // Si es número, asumir porcentaje
    if (typeof value === 'number') {
      return `${value}%`;
    }
    
    // Si es string sin unidad, asumir porcentaje
    return `${value}%`;
  }, []);

  // Posición por defecto
  const defaultPosition = { top: '10%', left: '10%' };

  // Agregar un nuevo componente con soporte para datos iniciales
  const addComponent = useCallback((componentType, position, initialData = {}) => {
    // Crear un ID único para el nuevo componente
    const newId = `comp-${Date.now()}`;
    
    // Estilos predeterminados para el nuevo componente
    const newStyles = getDefaultStylesForNewComponent(componentType);
    
    // Asegurar que la posición esté en porcentajes
    const posWithPercentage = {
      top: ensurePercentage(position?.top || defaultPosition.top),
      left: ensurePercentage(position?.left || defaultPosition.left)
    };
    
    // Determinar el contenido inicial (puede venir preestablecido)
    let initialContent = initialData.content;
    
    // Si no hay contenido inicial, usar el contenido predeterminado para el tipo
    if (initialContent === undefined) {
      initialContent = getDefaultContent(componentType);
    }
    
    // Crear el nuevo componente
    const newComponent = {
      id: newId,
      type: componentType,
      content: initialContent,
      style: JSON.parse(JSON.stringify(newStyles)), // Copia profunda para evitar referencias compartidas
      locked: false,
      position: {
        desktop: { ...posWithPercentage },
        tablet: { ...posWithPercentage },
        mobile: { ...posWithPercentage }
      },
      // Añadir cualquier propiedad adicional del initialData
      ...Object.fromEntries(
        Object.entries(initialData).filter(([key]) => key !== 'content')
      )
    };
    
    console.log(`➕ Añadiendo nuevo componente ${componentType} con ID ${newId}`);
    
    setBannerConfig(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
    
    setSelectedComponent(newComponent);
    
    return newId; // Retornar el ID para uso futuro
  }, [ensurePercentage]);

  // Eliminar un componente
  const deleteComponent = useCallback((componentId) => {
    setBannerConfig(prev => ({
      ...prev,
      components: prev.components.filter(comp => comp.id !== componentId || comp.locked)
    }));
    
    setSelectedComponent(prev => prev?.id === componentId ? null : prev);
  }, []);

  // Actualizar contenido - optimizado para evitar renders innecesarios
  const updateComponentContent = useCallback((componentId, content) => {
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      const component = { ...updatedComponents[componentIndex] };
      
      // Actualizar el contenido basado en su tipo actual
      if (typeof content === 'string') {
        // Si recibimos un string pero el contenido actual es un objeto, actualizar texts.en
        if (typeof component.content === 'object' && component.content.texts) {
          component.content = {
            ...component.content,
            texts: {
              ...component.content.texts,
              en: content
            }
          };
          
          // Si también tiene propiedad text (para compatibilidad), actualizarla
          if ('text' in component.content) {
            component.content.text = content;
          }
        } else {
          // Si el contenido actual no es un objeto, reemplazar directamente
          component.content = content;
        }
      } else if (typeof content === 'object') {
        // Si recibimos un objeto, reemplazar directamente
        component.content = content;
      }
      
      updatedComponents[componentIndex] = component;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      // Crear una copia profunda para evitar referencias compartidas
      const updated = { ...prev };
      
      // Actualizar el contenido basado en su tipo actual
      if (typeof content === 'string') {
        if (typeof updated.content === 'object' && updated.content.texts) {
          updated.content = {
            ...updated.content,
            texts: {
              ...updated.content.texts,
              en: content
            }
          };
          
          // Si también tiene propiedad text, actualizarla
          if ('text' in updated.content) {
            updated.content.text = content;
          }
        } else {
          updated.content = content;
        }
      } else if (typeof content === 'object') {
        updated.content = content;
      }
      
      return updated;
    });
  }, []);

  // NUEVA FUNCIÓN: Actualizar componente con una imagen y archivo temporal
  const updateComponentImageWithFile = useCallback((componentId, imageRef, file) => {
    console.log(`🖼️ Actualizando componente ${componentId} con imagen temporal: ${imageRef}`);
    
    // Verificar que file es un objeto File válido
    if (!(file instanceof File || file instanceof Blob)) {
      console.error("⚠️ El archivo no es válido:", file);
      return;
    }
    
    // IMPORTANTE: Guardar en el almacenamiento global
    window._imageFiles = window._imageFiles || {};
    window._imageFiles[imageRef] = file;
    console.log(`💾 Imagen guardada en almacenamiento global: ${imageRef} => ${file.name}, ${file.size} bytes`);
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      // Hacer una copia superficial del componente
      const component = { ...updatedComponents[componentIndex] };
      
      // Actualizar el contenido con la referencia temporal
      component.content = imageRef;
      
      // Adjuntar el archivo para usarlo al enviar el formulario
      component._imageFile = file;
      component._tempFile = file;
      
      // Asegurar que también está disponible en estilos si los componentes buscan ahí
      if (component.style) {
        const updatedStyle = {};
        
        // Copiar los estilos para todos los dispositivos
        Object.keys(component.style).forEach(device => {
          updatedStyle[device] = {
            ...component.style[device],
            // Solo añadir referencias de archivo a desktop
            ...(device === 'desktop' ? {
              _tempFile: file,
              _previewUrl: URL.createObjectURL(file)
            } : {})
          };
        });
        
        component.style = updatedStyle;
      }
      
      updatedComponents[componentIndex] = component;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      const updated = { ...prev };
      updated.content = imageRef;
      updated._imageFile = file;
      updated._tempFile = file;
      
      // Asegurar que también está disponible en estilos
      if (updated.style) {
        // Solo modificar 'desktop' para evitar duplicación
        if (updated.style.desktop) {
          updated.style = {
            ...updated.style,
            desktop: {
              ...updated.style.desktop,
              _tempFile: file,
              _previewUrl: URL.createObjectURL(file)
            }
          };
        }
      }
      
      return updated;
    });
  }, []);

  // Actualizar estilos - refactorizado para mejor aislamiento de estilos por dispositivo
  const updateComponentStyleForDevice = useCallback((componentId, device, newStyle) => {
    console.log(`📝 Actualizando estilo del componente ${componentId} para ${device}:`, newStyle);
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(prev.components[componentIndex]));
      
      // Asegurar que existe la estructura de estilos para el dispositivo
      if (!updatedComponent.style) updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.style[device]) updatedComponent.style[device] = {};
      
      // Actualizar solo el estilo para el dispositivo específico
      updatedComponent.style[device] = {
        ...updatedComponent.style[device],
        ...newStyle
      };
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[componentIndex] = updatedComponent;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      // Crear una copia profunda de los estilos
      const updatedStyle = JSON.parse(JSON.stringify(prev.style || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedStyle[device]) updatedStyle[device] = {};
      
      // Actualizar solo el estilo para el dispositivo específico
      updatedStyle[device] = {
        ...updatedStyle[device],
        ...newStyle
      };
      
      return {
        ...prev,
        style: updatedStyle
      };
    });
  }, []);

  // Actualizar posición - CORREGIDO para manejar específicamente el dispositivo
  const updateComponentPositionForDevice = useCallback((componentId, device, newPosition) => {
    console.log(`📍 Actualizando posición del componente ${componentId} para ${device}:`, newPosition);
    
    // Asegurar que las posiciones estén en formato de porcentaje
    const processedPosition = {
      top: ensurePercentage(newPosition.top),
      left: ensurePercentage(newPosition.left)
    };
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(prev.components[componentIndex]));
      
      // Asegurar que existe la estructura de posiciones
      if (!updatedComponent.position) updatedComponent.position = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.position[device]) updatedComponent.position[device] = {};
      
      // Actualizar solo la posición para el dispositivo específico
      updatedComponent.position[device] = {
        ...updatedComponent.position[device],
        ...processedPosition
      };
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[componentIndex] = updatedComponent;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      // Crear una copia profunda de las posiciones
      const updatedPosition = JSON.parse(JSON.stringify(prev.position || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedPosition[device]) updatedPosition[device] = {};
      
      // Actualizar solo la posición para el dispositivo específico
      updatedPosition[device] = {
        ...updatedPosition[device],
        ...processedPosition
      };
      
      return {
        ...prev,
        position: updatedPosition
      };
    });
  }, [ensurePercentage]);

  // Actualizar layout - refactorizado para evitar problemas de estado
  const handleUpdateLayoutForDevice = useCallback((device, prop, value) => {
    console.log(`🔄 Actualizando layout para dispositivo ${device}, propiedad ${prop}:`, value);
    
    setBannerConfig(prev => {
      // Crear una copia profunda del layout
      const updatedLayout = JSON.parse(JSON.stringify(prev.layout || {}));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedLayout[device]) updatedLayout[device] = {};
      
      // Actualizar la propiedad
      updatedLayout[device][prop] = value;
      
      return {
        ...prev,
        layout: updatedLayout
      };
    });
  }, []);

  // Vista previa
  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      
      // Intentar hacer la vista previa a través de la API
      try {
        const response = await axios.post('/api/v1/banner-templates/preview', { 
          config: bannerConfig 
        });
        setPreviewData(response.data.data.preview);
      } catch (apiError) {
        console.log('⚠️ Error en API de vista previa, usando previsualización local');
        // Si falla la API, usar vista previa local
        setPreviewData(generateLocalPreview(bannerConfig));
      }
      
      setPreviewLoading(false);
    } catch (error) {
      console.error('❌ Error previsualizando:', error);
      setPreviewError(error.message || 'Error generando vista previa');
      setPreviewLoading(false);
    }
  };

  // Guardar banner

  // Función handleSave corregida con sintaxis correcta
const handleSave = useCallback(async (customConfig = null) => {
  try {
    console.log('💾 Guardando banner...');
    
    // Recopilar información de imágenes temporales
    const imageFiles = new Map();
    const configToSave = customConfig || bannerConfig;
    
    console.log('🔍 Analizando componentes para buscar imágenes...');
    
    // Función mejorada para buscar referencias temporales
    const collectImageRefs = (components) => {
      if (!components || !Array.isArray(components)) return;
      
      console.log(`🔍 Verificando ${components.length} componentes`);
      
      components.forEach(comp => {
        if (comp.type === 'image' && typeof comp.content === 'string') {
          if (comp.content.startsWith('__IMAGE_REF__')) {
            console.log(`🖼️ Encontrada referencia de imagen en componente ${comp.id}: ${comp.content}`);
            
            // Buscar archivo en todas las posibles ubicaciones
            let file = null;
            
            // Buscar en todas las propiedades posibles
            if (comp._tempFile instanceof File || comp._tempFile instanceof Blob) {
              file = comp._tempFile;
              console.log(`📂 Archivo encontrado en _tempFile`);
            } else if (comp._imageFile instanceof File || comp._imageFile instanceof Blob) {
              file = comp._imageFile;
              console.log(`📂 Archivo encontrado en _imageFile`);
            } else if (comp.style?.desktop?._tempFile instanceof File || comp.style?.desktop?._tempFile instanceof Blob) {
              file = comp.style.desktop._tempFile;
              console.log(`📂 Archivo encontrado en style.desktop._tempFile`);
            }
            
            // También buscar en el DOM como último recurso
            if (!file) {
              try {
                const compEl = document.querySelector(`[data-id="${comp.id}"]`);
                if (compEl && compEl.parentNode) {
                  if (compEl.parentNode._tempFile instanceof File || compEl.parentNode._tempFile instanceof Blob) {
                    file = compEl.parentNode._tempFile;
                    console.log(`📂 Archivo encontrado en el DOM`);
                  }
                }
              } catch (error) {
                console.error("Error al buscar archivo en DOM:", error);
              }
            }
            
            // Verificar si encontramos el archivo
            if (file) {
              imageFiles.set(comp.content, file);
              console.log(`✅ Guardando archivo: ${file.name}, ${file.size} bytes, tipo: ${file.type}`);
            } else {
              console.warn(`⚠️ No se encontró archivo para referencia ${comp.content}`);
              console.log('Estructura del componente:', JSON.stringify({
                id: comp.id,
                hasTempFile: comp._tempFile !== undefined,
                hasImageFile: comp._imageFile !== undefined,
                hasStyleDesktop: comp.style?.desktop !== undefined,
                hasStyleDesktopTempFile: comp.style?.desktop?._tempFile !== undefined
              }));
            }
          }
        }
        
        // Revisar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          collectImageRefs(comp.children);
        }
      });
    };
    
    // Recopilar todas las referencias de imagen
    collectImageRefs(configToSave.components);
    
    console.log(`🔢 Imágenes encontradas: ${imageFiles.size}`);
    
    // Si hay imágenes, usar FormData, de lo contrario, JSON simple
    if (imageFiles.size > 0) {
      console.log(`🖼️ Creando FormData con ${imageFiles.size} imágenes`);
      
      // Crear FormData NUEVO para evitar problemas
      const formData = new FormData();
      
      // Crear copia limpia del config sin referencias circulares
      const cleanConfig = JSON.parse(JSON.stringify(configToSave));
      
      // Limpiar propiedades temporales que no deberían ir al servidor
      const cleanComponents = (components) => {
        if (!components || !Array.isArray(components)) return;
        
        components.forEach(comp => {
          // Eliminar propiedades temporales
          delete comp._tempFile;
          delete comp._imageFile;
          
          // Limpiar también en estilos
          if (comp.style) {
            Object.keys(comp.style).forEach(device => {
              if (comp.style[device]) {
                delete comp.style[device]._tempFile;
                delete comp.style[device]._previewUrl;
              }
            });
          }
          
          // Procesar hijos
          if (comp.children) {
            cleanComponents(comp.children);
          }
        });
      };
      
      cleanComponents(cleanConfig.components);
      
      // Añadir configuración JSON al FormData
      formData.append('template', JSON.stringify(cleanConfig));
      
      // Añadir archivos de imagen uno por uno
      let counter = 0;
      imageFiles.forEach((file, imageRef) => {
        const imageId = imageRef.replace('__IMAGE_REF__', '');
        const fileName = `IMAGE_REF_${imageId}_${file.name || 'image.png'}`;
        
        // Agregar con nombre explícito para mejor tracking
        formData.append('bannerImages', file, fileName);
        counter++;
        console.log(`📦 [${counter}/${imageFiles.size}] Añadido archivo: ${fileName}, ${file.size} bytes`);
      });
      
      // Comprobar si el FormData tiene los datos correctos
      try {
        console.log('✅ Verificando FormData creado:');
        for (let [key, value] of formData.entries()) {
          if (key === 'template') {
            console.log(`  - ${key}: [JSON data, longitud: ${value.length} caracteres]`);
          } else {
            console.log(`  - ${key}: ${value instanceof File ? `Archivo: ${value.name}, ${value.size} bytes` : value}`);
          }
        }
      } catch (error) {
        console.error('Error al verificar FormData:', error);
      }
      
      console.log('📤 Enviando banner con imágenes...');
      const response = await createTemplate(formData);
      
      console.log('✅ Banner guardado con éxito:', response);
      return response.data.template;
    } else {
      console.log('📤 Enviando banner sin imágenes (JSON simple)...');
      const response = await createTemplate(configToSave);
      console.log('✅ Banner guardado con éxito:', response);
      return response.data.template;
    }
  } catch (err) {
    console.error('❌ Error guardando la plantilla:', err);
    throw err;
  }
}, [bannerConfig]);
// Función handleUpdate corregida con sintaxis correcta
const handleUpdate = useCallback(async (bannerId, customConfig = null) => {
  try {
    console.log(`💾 Actualizando banner ${bannerId}...`);
    
    const configToUpdate = customConfig || bannerConfig;
    
    // SIEMPRE usar FormData, no importa qué
    console.log('📤 Preparando FormData para envío...');
    
    // Crear FormData
    const formData = new FormData();
    
    // Crear copia limpia del config
    const cleanConfig = JSON.parse(JSON.stringify(configToUpdate));
    
    // Limpiar propiedades temporales
    const cleanComponents = (components) => {
      if (!components || !Array.isArray(components)) return;
      
      components.forEach(comp => {
        delete comp._tempFile;
        delete comp._imageFile;
        
        if (comp.style) {
          Object.keys(comp.style).forEach(device => {
            if (comp.style[device]) {
              delete comp.style[device]._tempFile;
              delete comp.style[device]._previewUrl;
            }
          });
        }
        
        if (comp.children) {
          cleanComponents(comp.children);
        }
      });
    };
    
    cleanComponents(cleanConfig.components);
    
    // ¡IMPORTANTE! Usar strings para claves y valores del FormData
    formData.append("template", JSON.stringify(cleanConfig));
    
    // Buscar imágenes en el almacenamiento global
    if (window._imageFiles) {
      const keys = Object.keys(window._imageFiles);
      if (keys.length > 0) {
        const imageRef = keys[0]; // Usar la primera imagen disponible
        const file = window._imageFiles[imageRef];
        
        if (file instanceof File || file instanceof Blob) {
          // Añadir archivo al FormData con nombre específico
          formData.append("bannerImages", file, file.name);
          console.log(`📦 Añadido archivo: ${file.name}, ${file.size} bytes al FormData`);
        }
      }
    }
    
    // Si no hay imágenes en el almacenamiento global, crear un archivo placeholder
    if (!formData.has("bannerImages")) {
      // Crear un archivo placeholder mínimo
      const placeholderData = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]); // Cabecera JPEG mínima
      const placeholderFile = new File([placeholderData], "placeholder.jpg", { type: "image/jpeg" });
      
      formData.append("bannerImages", placeholderFile, "placeholder.jpg");
      console.log(`📦 Añadido archivo placeholder al FormData`);
    }
    
    // Verificar si el FormData se creó correctamente
    console.log(`📦 FormData creado con éxito, contiene:`);
    for (const pair of formData.entries()) {
      console.log(`- ${pair[0]}: ${pair[0] === 'template' ? 'JSON String' : pair[1].name}`);
    }
    
    // IMPORTANTE: Usar updateTemplate que ya usa apiClient con autenticación
    console.log(`📤 Enviando FormData al servidor a través de apiClient...`);
    
    // Llama a la función del archivo bannerTemplate.js que ya tiene la autenticación configurada
    const response = await updateTemplate(bannerId, formData);
    
    console.log('✅ Banner actualizado con éxito:', response);
    return response.data.template;

  } catch (err) {
    console.error('❌ Error actualizando la plantilla:', err);
    throw err;
  }
}, [bannerConfig]);

  

  // Procesar imágenes en componentes
  const processImages = useCallback(async (bannerId) => {
    try {
      console.log(`🖼️ Procesando imágenes para banner ${bannerId}...`);
      const componentsWithImages = bannerConfig.components.filter(
        comp => comp.type === 'image' && 
               typeof comp.content === 'string' && 
               comp.content.startsWith('data:image')
      );
      
      if (componentsWithImages.length === 0) {
        console.log('ℹ️ No hay imágenes para procesar');
        return;
      }
      
      // Procesar cada imagen usando apiClient
      for (const component of componentsWithImages) {
        try {
          const response = await axios.post(`/api/v1/banner-templates/${bannerId}/images`, {
            imageData: component.content,
            componentId: component.id
          });
          
          // Actualizar el contenido con la URL
          updateComponentContent(component.id, response.data.data.url);
          console.log(`✅ Imagen procesada para componente ${component.id}`);
        } catch (error) {
          console.error(`❌ Error procesando imagen para componente ${component.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error procesando imágenes:', error);
    }
  }, [bannerConfig, updateComponentContent]);

  // Inicializar configuración - simplificada al trabajar con un solo formato
  const setInitialConfig = useCallback((config, autoSelect = false) => {
    if (!config) {
      console.log('❌ No se proporcionó configuración inicial');
      return;
    }
    
    console.log('📥 Recibida configuración inicial:', config);
    
    // Hacer copia profunda para evitar referencias compartidas
    const processedConfig = JSON.parse(JSON.stringify(config));
    
    // Asegurar estructura completa del banner
    const normalizedConfig = {
      ...processedConfig,
      name: processedConfig.name || 'Nuevo Banner',
      layout: {
        desktop: processedConfig.layout?.desktop || { 
          type: 'banner', 
          position: 'bottom', 
          backgroundColor: '#ffffff',
          width: '100%',
          height: 'auto'
        },
        tablet: processedConfig.layout?.tablet || {},
        mobile: processedConfig.layout?.mobile || {}
      }
    };
    
    // Si no hay layout para tablet o mobile, copiar de desktop
    if (Object.keys(normalizedConfig.layout.tablet).length === 0) {
      normalizedConfig.layout.tablet = { ...normalizedConfig.layout.desktop };
    }
    
    if (Object.keys(normalizedConfig.layout.mobile).length === 0) {
      normalizedConfig.layout.mobile = { ...normalizedConfig.layout.desktop };
    }
    
    // Normalizar componentes
    if (Array.isArray(processedConfig.components)) {
      normalizedConfig.components = processedConfig.components.map(comp => {
        // Copia profunda
        const component = JSON.parse(JSON.stringify(comp));
        
        // Asegurar ID único
        if (!component.id) {
          component.id = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Normalizar contenido
        if (component.content === undefined || component.content === null) {
          component.content = getDefaultContent(component.type);
        } else if (typeof component.content === 'string') {
          // Si es imagen y es una URL, mantenerla como string
          if (component.type !== 'image') {
            // Convertir strings a objeto de contenido con soporte multilingüe
            component.content = {
              texts: { en: component.content },
              translatable: true
            };
          }
        } else if (typeof component.content === 'object' && !component.content.texts && component.content.text) {
          // Convertir formato { text: "texto" } a { texts: { en: "texto" }}
          component.content = {
            texts: { en: component.content.text },
            translatable: component.content.translatable || true
          };
        }
        
        // Normalizar estilos
        if (!component.style) {
          component.style = getDefaultStylesForNewComponent(component.type);
        } else {
          // Asegurar que existen estilos para cada dispositivo
          if (!component.style.desktop) component.style.desktop = {};
          if (!component.style.tablet) component.style.tablet = { ...component.style.desktop };
          if (!component.style.mobile) component.style.mobile = { ...component.style.desktop };
        }
        
        // Normalizar posiciones
        if (!component.position) {
          component.position = {
            desktop: { ...defaultPosition },
            tablet: { ...defaultPosition },
            mobile: { ...defaultPosition }
          };
        } else {
          // Asegurar que existen posiciones para cada dispositivo
          if (!component.position.desktop) component.position.desktop = { ...defaultPosition };
          
          // Asegurar formato de porcentaje
          component.position.desktop.top = ensurePercentage(component.position.desktop.top);
          component.position.desktop.left = ensurePercentage(component.position.desktop.left);
          
          // Tablet hereda de desktop si no tiene posición propia
          if (!component.position.tablet) {
            component.position.tablet = { ...component.position.desktop };
          } else {
            component.position.tablet.top = ensurePercentage(component.position.tablet.top);
            component.position.tablet.left = ensurePercentage(component.position.tablet.left);
          }
          
          // Mobile hereda de desktop si no tiene posición propia
          if (!component.position.mobile) {
            component.position.mobile = { ...component.position.desktop };
          } else {
            component.position.mobile.top = ensurePercentage(component.position.mobile.top);
            component.position.mobile.left = ensurePercentage(component.position.mobile.left);
          }
        }
        
        return component;
      });
    }
    
    console.log('✅ Configuración normalizada lista:', normalizedConfig);
    setBannerConfig(normalizedConfig);
    
    // Seleccionar el primer componente solo si se solicita
    if (autoSelect && normalizedConfig.components && normalizedConfig.components.length > 0) {
      setSelectedComponent(normalizedConfig.components[0]);
    } else {
      setSelectedComponent(null);
    }
  }, [ensurePercentage]);

  const generateLocalPreview = (config) => {
    return {
      html: generateSimpleHTML(config),
      css: generateSimpleCSS(config),
      config
    };
  };

  const generateSimpleHTML = (config) => {
    const { components = [], layout = {} } = config;
    const deviceLayout = layout.desktop || {};
    
    const componentHTMLs = components.map(comp => {
      // Extraer contenido de texto
      let content = '';
      
      if (typeof comp.content === 'string') {
        content = comp.content;
      } else if (comp.content && typeof comp.content === 'object') {
        if (comp.content.texts && comp.content.texts.en) {
          content = comp.content.texts.en;
        } else if (comp.content.text) {
          content = comp.content.text;
        }
      }
      
      const position = comp.position?.desktop || { top: '0%', left: '0%' };
      const styles = comp.style?.desktop || {};
      
      const inlineStyle = Object.entries(styles)
        .map(([key, value]) => `${key}:${value}`)
        .join(';');
      
      const positionStyle = `position:absolute;top:${position.top};left:${position.left};`;
      
      switch (comp.type) {
        case 'text':
          return `
            <div 
              class="cmp-text${comp.locked ? ' cmp-locked' : ''}" 
              data-component-id="${comp.id}"
              ${comp.id === 'cmp-description' ? 'id="cmp-description"' : ''}
              style="${positionStyle}${inlineStyle}"
            >
              ${content}
            </div>
          `;
        case 'button':
          return `
            <button 
              class="cmp-button${comp.locked ? ' cmp-locked' : ''}"
              data-component-id="${comp.id}"
              data-cmp-action="${comp.action?.type || 'none'}"
              style="${positionStyle}${inlineStyle}"
            >
              ${content}
            </button>
          `;
        case 'image':
          return `
            <img 
              class="cmp-image${comp.locked ? ' cmp-locked' : ''}"
              data-component-id="${comp.id}"
              src="${content || '/placeholder.png'}"
              alt=""
              style="${positionStyle}${inlineStyle}"
            />
          `;
        default:
          return '';
      }
    }).join('\n');
    
    return `
      <div 
        id="banner-preview" 
        class="banner-preview banner-preview--${deviceLayout.type || 'banner'}" 
        data-position="${deviceLayout.position || 'bottom'}"
      >
        ${componentHTMLs}
      </div>
    `;
  };

  const generateSimpleCSS = (config) => {
    const { theme = {}, layout = {} } = config;
    const deviceLayout = layout.desktop || {};
    
    return `
      .banner-preview {
        font-family: ${theme.fonts?.primary || 'sans-serif'};
        color: ${theme.colors?.text || '#000'};
        background-color: ${deviceLayout.backgroundColor || theme.colors?.background || '#fff'};
        position: relative;
        width: ${deviceLayout.width || '100%'};
        height: ${deviceLayout.height || 'auto'};
        min-height: ${deviceLayout.minHeight || '100px'};
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .banner-preview button {
        cursor: pointer;
      }
      
      .cmp-image {
        object-fit: contain;
        max-width: 100%;
      }
    `;
  };
  
  // Función para manejar upload de imágenes
// Solución completa (implementar después de arreglar el error actual)
const handleImageUpload = async (componentId, file) => {
  try {
    if (!file || !bannerConfig._id) return null;
    
    console.log(`🖼️ Subiendo imagen para componente ${componentId}...`);
    
    // 1. Crear un FormData específico para esta imagen
    const formData = new FormData();
    formData.append('image', file);
    formData.append('componentId', componentId);
    
    // 2. Usar un endpoint específico para subir imágenes
    const url = `/api/v1/banner-templates/${bannerConfig._id}/images`;
    
    // 3. Hacer una petición POST independiente para esta imagen
    const response = await axios.post(url, formData, {
      headers: {
        // No establecer Content-Type, axios lo hará automáticamente
      }
    });
    
    // 4. Actualizar el componente con la URL devuelta por el servidor
    if (response.data && response.data.data && response.data.data.url) {
      const imageUrl = response.data.data.url;
      updateComponentContent(componentId, imageUrl);
      console.log(`✅ Imagen subida y componente actualizado con URL: ${imageUrl}`);
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    return null;
  }
};
  
  // Función para manejar subida de imagen base64
  const handleImageBase64Upload = useCallback(async (componentId, base64Data) => {
    try {
      if (!base64Data || !componentId || !bannerConfig._id) {
        console.error('❌ Faltan datos para subir imagen base64');
        return null;
      }
      
      console.log(`🖼️ Subiendo imagen base64 para componente ${componentId}`);
      
      // Enviar al servidor usando axios
      const response = await axios.post(
        `/api/v1/banner-templates/${bannerConfig._id}/images`,
        {
          imageData: base64Data,
          componentId
        }
      );
      
      const imageUrl = response.data.data.url;
      
      // Actualizar el contenido del componente
      updateComponentContent(componentId, imageUrl);
      
      return imageUrl;
    } catch (error) {
      console.error('❌ Error subiendo imagen base64:', error);
      return null;
    }
  }, [bannerConfig._id, updateComponentContent]);
  
  // Función para recopilar todos los archivos temporales del banner
  const collectImageFiles = useCallback(() => {
    const imageFiles = new Map();
    
    // Función recursiva para buscar referencias temporales
    const collectImageRefs = (components) => {
      if (!components || !Array.isArray(components)) return;
      
      for (const comp of components) {
        if (comp.type === 'image' && typeof comp.content === 'string') {
          // Si hay una referencia temporal asociada a un archivo
          if (comp.content.startsWith('__IMAGE_REF__') && comp._imageFile) {
            imageFiles.set(comp.content, comp._imageFile);
          }
        }
        
        // Revisar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          collectImageRefs(comp.children);
        }
      }
    };
    
    // Recopilar todas las referencias de imagen
    collectImageRefs(bannerConfig.components);
    
    return imageFiles;
  }, [bannerConfig.components]);
  
  return {
    bannerConfig,
    setBannerConfig,
    setInitialConfig,
    selectedComponent,
    setSelectedComponent,
    addComponent,
    deleteComponent,
    updateComponentContent,
    updateComponentImageWithFile, // Nueva función para manejar imágenes temporales
    updateComponentStyleForDevice,
    updateComponentPositionForDevice,
    handleUpdateLayoutForDevice,
    isPreferencesMode,
    setIsPreferencesMode,
    previewData,
    previewLoading,
    previewError,
    handlePreview,
    handleSave,
    handleUpdate,
    deviceView,
    setDeviceView,
    showPreview,
    setShowPreview,
    generateLocalPreview,
    processImages,
    handleImageUpload,
    handleImageBase64Upload,
    collectImageFiles // Nueva función para recopilar archivos de imágenes
  };
}