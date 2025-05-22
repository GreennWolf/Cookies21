// src/components/banner/Editor/hooks/useBannerEditor.js
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {createTemplate, updateTemplate} from '../../../../api/bannerTemplate';
import {getClients} from '../../../../api/client';

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
        minHeight: '100px',
        maxWidth: '100%',
        // Valores por defecto para floating
        floatingCorner: 'bottom-right',
        floatingMargin: 20
      },
      tablet: { 
        type: 'banner', 
        position: 'bottom', 
        backgroundColor: '#ffffff', 
        width: '100%', 
        height: 'auto', 
        minHeight: '100px',
        maxWidth: '100%',
        // Valores por defecto para floating
        floatingCorner: 'bottom-right',
        floatingMargin: 20
      },
      mobile: { 
        type: 'banner', 
        position: 'bottom', 
        backgroundColor: '#ffffff', 
        width: '100%', 
        height: 'auto', 
        minHeight: '100px',
        maxWidth: '100%',
        // Valores por defecto para floating
        floatingCorner: 'bottom-right',
        floatingMargin: 20
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
          desktop: { bottom: '10px', right: '10px' },
          tablet: { bottom: '10px', right: '10px' },
          mobile: { bottom: '10px', right: '10px' }
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

  // Función para generar posición del botón de preferencias según configuración del banner
  const getPreferencesButtonPosition = useCallback((layout, device = 'desktop') => {
    const deviceLayout = layout[device] || layout.desktop;
    
    // Si es banner floating, usar posicionamiento basado en floatingCorner
    if (deviceLayout.type === 'floating' || deviceLayout.floatingCorner) {
      const corner = deviceLayout.floatingCorner || 'bottom-right';
      const margin = deviceLayout.floatingMargin || 20;
      
      switch (corner) {
        case 'bottom-right':
          return { bottom: `${margin}px`, right: `${margin}px` };
        case 'bottom-left':
          return { bottom: `${margin}px`, left: `${margin}px` };
        case 'top-right':
          return { top: `${margin}px`, right: `${margin}px` };
        case 'top-left':
          return { top: `${margin}px`, left: `${margin}px` };
        default:
          return { bottom: `${margin}px`, right: `${margin}px` };
      }
    }
    
    // Para banner normal (top/bottom), usar posicionamiento relativo
    return { top: '10%', right: '10px' };
  }, []);

  // Función para actualizar las posiciones de botones basándose en el layout actual
  const updateButtonPositions = useCallback((newBannerConfig) => {
    const updatedComponents = newBannerConfig.components.map(component => {
      // Solo actualizar el botón de preferencias
      if (component.id === 'preferencesBtn' || component.action?.type === 'show_preferences') {
        const newPosition = {};
        
        // Generar posiciones para cada dispositivo
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          newPosition[device] = getPreferencesButtonPosition(newBannerConfig.layout, device);
        });
        
        return {
          ...component,
          position: newPosition
        };
      }
      
      return component;
    });
    
    return {
      ...newBannerConfig,
      components: updatedComponents
    };
  }, [getPreferencesButtonPosition]);

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
          backgroundColor: 'transparent',
          borderRadius: '4px',
          // Sin border por defecto - solo se mostrará cuando esté seleccionado
          border: 'none'
        };
        
        return {
          desktop: { ...baseStyles, padding: '10px', minHeight: '100px', minWidth: '200px', width: '200px', height: '100px' },
          tablet: { ...baseStyles, padding: '8px', minHeight: '90px', minWidth: '180px', width: '180px', height: '90px' },
          mobile: { ...baseStyles, padding: '6px', minHeight: '80px', minWidth: '160px', width: '160px', height: '80px' }
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
    
    // Si es píxeles, convertir a porcentaje usando las dimensiones reales del canvas
    if (typeof value === 'string' && value.endsWith('px')) {
      const pixels = parseFloat(value);
      
      // Obtener las dimensiones reales del canvas del editor
      // Buscar el elemento canvas del editor para obtener sus dimensiones reales
      const canvasElement = document.querySelector('.banner-canvas, #banner-canvas, [data-testid="banner-canvas"]') ||
                           document.querySelector('.flex-1.overflow-auto') ||
                           document.querySelector('[style*="flex: 1"]');
      
      let containerWidth = 1000; // Valor por defecto
      
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        containerWidth = rect.width > 0 ? rect.width : 1000;
      }
      
      // IMPORTANTE: Para valores pequeños (0-100px), probablemente son valores correctos de posición
      // Para valores más grandes, podrían ser errores de cálculo previos
      if (pixels <= 100) {
        // Conversión normal usando el ancho real del contenedor
        const percentage = (pixels / containerWidth) * 100;
        return `${Math.max(0, Math.min(100, percentage))}%`;
      } else {
        // Para valores grandes, asumir que es un error y convertir más conservadoramente
        // o mantener como está si parece ser una medida real
        if (pixels > containerWidth) {
          // Si el valor en píxeles es mayor que el contenedor, probablemente es un error
          return '0%';
        } else {
          const percentage = (pixels / containerWidth) * 100;
          return `${Math.max(0, Math.min(100, percentage))}%`;
        }
      }
    }
    
    // Si es número, asumir porcentaje
    if (typeof value === 'number') {
      return `${Math.max(0, Math.min(100, value))}%`;
    }
    
    // Si es string sin unidad, asumir porcentaje
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return `${Math.max(0, Math.min(100, numValue))}%`;
    }
    
    return '0%';
  }, []);

  // Posición por defecto
  const defaultPosition = { top: '10%', left: '10%' };

  // Agregar un nuevo componente con soporte para datos iniciales
  const addComponent = useCallback((componentType, position, initialData = {}) => {
    console.log('🎯 addComponent called!', { componentType, position, initialData });
    
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
      // NUEVO: Configuración inicial para contenedores
      ...(componentType === 'container' && {
        children: [], // Array de componentes hijos
        containerConfig: {
          desktop: {
            displayMode: 'libre', // libre | flex | grid
            gap: '10px',
            // Configuración flex por defecto
            flexDirection: 'row',
            justifyContent: 'flex-start', 
            alignItems: 'stretch',
            // Configuración grid por defecto
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'auto',
            justifyItems: 'start',
            alignItems: 'start'
          },
          tablet: {
            displayMode: 'libre',
            gap: '8px',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'auto',
            justifyItems: 'start',
            alignItems: 'start'
          },
          mobile: {
            displayMode: 'libre',
            gap: '6px',
            flexDirection: 'column', // En mobile por defecto columna
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            gridTemplateColumns: '1fr', // En mobile una sola columna
            gridTemplateRows: 'auto',
            justifyItems: 'start',
            alignItems: 'start'
          }
        }
      }),
      // Añadir cualquier propiedad adicional del initialData
      ...Object.fromEntries(
        Object.entries(initialData).filter(([key]) => key !== 'content')
      )
    };
    
    // console.log(`➕ Añadiendo nuevo componente ${componentType} con ID ${newId}`);
    
    setBannerConfig(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
    
    setSelectedComponent(newComponent);
    
    return newId; // Retornar el ID para uso futuro
  }, [ensurePercentage]);

  // Eliminar un componente
  const deleteComponent = useCallback((componentId) => {
    // Verificar si el componente existe y si está bloqueado antes de intentar eliminarlo
    setBannerConfig(prev => {
      const componentToDelete = prev.components.find(comp => comp.id === componentId);
      
      // Si el componente no existe o está bloqueado y tiene acción de tipo accept_all, reject_all o show_preferences, no eliminarlo
      if (!componentToDelete) return prev;
      
      const isEssentialComponent = componentToDelete.locked && 
        componentToDelete.action && 
        ['accept_all', 'reject_all', 'show_preferences'].includes(componentToDelete.action.type);
      
      if (isEssentialComponent) {
        console.log(`⚠️ No se puede eliminar el componente esencial ${componentId}`);
        return prev;
      }
      
      return {
        ...prev,
        components: prev.components.filter(comp => comp.id !== componentId)
      };
    });
    
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
    // console.log(`🖼️ Actualizando componente ${componentId} con imagen temporal: ${imageRef}`);
    
    // Verificar que file es un objeto File válido
    if (!(file instanceof File || file instanceof Blob)) {
      console.error("⚠️ El archivo no es válido:", file);
      return;
    }
    
    // IMPORTANTE: Guardar en el almacenamiento global
    window._imageFiles = window._imageFiles || {};
    window._imageFiles[imageRef] = file;
    // console.log(`💾 Imagen guardada en almacenamiento global: ${imageRef} => ${file.name}, ${file.size} bytes`);
    
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

  // NUEVO: Agregar hijo a contenedor - FASE 4 con validación robusta
  const addChildToContainer = useCallback((parentId, childComponent) => {
    console.log(`🎯 EDITOR: Agregando hijo a contenedor ${parentId}:`, childComponent);
    
    setBannerConfig(prev => {
      // Función recursiva para buscar contenedores en toda la estructura
      const findContainer = (components) => {
        for (const comp of components) {
          if (comp.id === parentId && comp.type === 'container') {
            return comp;
          }
          if (comp.children && comp.children.length > 0) {
            const found = findContainer(comp.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Función recursiva para actualizar contenedores en toda la estructura
      const updateComponentsRecursively = (components) => {
        return components.map(comp => {
          if (comp.id === parentId && comp.type === 'container') {
            // Encontramos el contenedor padre
            const updatedParent = { ...comp };
            
            // Inicializar children si no existe
            if (!updatedParent.children) {
              updatedParent.children = [];
            }
            
            // Agregar el componente hijo
            const newChild = {
              ...childComponent,
              parentId: parentId,
              // Asegurar que tiene la estructura correcta de estilos
              style: childComponent.style || {
                desktop: {},
                tablet: {},
                mobile: {}
              }
            };
            
            updatedParent.children = [...updatedParent.children, newChild];
            
            console.log(`✅ EDITOR: Hijo agregado al contenedor ${parentId}. Total hijos: ${updatedParent.children.length}`);
            
            return updatedParent;
          } else if (comp.children && comp.children.length > 0) {
            // Buscar recursivamente en hijos
            return {
              ...comp,
              children: updateComponentsRecursively(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      // Verificar que el contenedor padre existe
      const parentContainer = findContainer(prev.components);
      if (!parentContainer) {
        console.warn(`Contenedor padre ${parentId} no encontrado`);
        return prev;
      }
      
      // Actualizar la estructura completa
      const updatedComponents = updateComponentsRecursively(prev.components);
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
  }, []);

  // NUEVO: Función para encontrar y actualizar un componente hijo
  const findAndUpdateChild = useCallback((componentId, updateFn) => {
    setBannerConfig(prev => {
      // Función recursiva para buscar y actualizar el hijo
      const updateComponents = (components) => {
        return components.map(comp => {
          // Si es el componente que buscamos, actualizarlo
          if (comp.id === componentId) {
            return updateFn(comp);
          }
          
          // Si tiene hijos, buscar recursivamente
          if (comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: updateComponents(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      return {
        ...prev,
        components: updateComponents(prev.components)
      };
    });
  }, []);

  // NUEVO: Eliminar componente hijo
  const deleteChildComponent = useCallback((componentId) => {
    console.log(`🗑️ EDITOR: Eliminando componente hijo ${componentId}`);
    
    setBannerConfig(prev => {
      // Función recursiva para buscar y eliminar el hijo
      const removeFromComponents = (components) => {
        return components.map(comp => {
          // Si tiene hijos, filtrar el que queremos eliminar
          if (comp.children && comp.children.length > 0) {
            const filteredChildren = comp.children.filter(child => child.id !== componentId);
            
            // Si se eliminó algún hijo, devolver componente actualizado
            if (filteredChildren.length !== comp.children.length) {
              console.log(`✅ EDITOR: Hijo ${componentId} eliminado del contenedor ${comp.id}`);
              return {
                ...comp,
                children: filteredChildren
              };
            }
            
            // Si no se eliminó nada, continuar buscando recursivamente
            return {
              ...comp,
              children: removeFromComponents(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      return {
        ...prev,
        components: removeFromComponents(prev.components)
      };
    });
    
    // Si el componente eliminado era el seleccionado, deseleccionar
    setSelectedComponent(prev => prev?.id === componentId ? null : prev);
  }, []);

  // NUEVO: Remover hijo de contenedor (diferente a eliminar - lo hace independiente)
  const removeChildFromContainer = useCallback((childId, parentId) => {
    console.log(`🔄 EDITOR: Removiendo hijo ${childId} del contenedor ${parentId} para hacerlo independiente`);
    
    setBannerConfig(prev => {
      let childComponent = null;
      let parentContainer = null;
      
      // Encontrar el hijo y el contenedor padre
      const findAndRemoveChild = (componentsList) => {
        return componentsList.map(comp => {
          if (comp.id === parentId && comp.type === 'container') {
            // Es el contenedor padre
            parentContainer = comp;
            const childIndex = comp.children.findIndex(child => child.id === childId);
            
            if (childIndex !== -1) {
              childComponent = comp.children[childIndex];
              
              // Remover el hijo del contenedor
              const updatedChildren = comp.children.filter(child => child.id !== childId);
              
              return {
                ...comp,
                children: updatedChildren
              };
            }
          }
          
          // Buscar recursivamente en otros contenedores
          if (comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: findAndRemoveChild(comp.children)
            };
          }
          
          return comp;
        });
      };

      const updatedComponents = findAndRemoveChild(prev.components);
      
      // Si encontramos el hijo, convertirlo en componente independiente
      if (childComponent && parentContainer) {
        // Calcular la posición global del hijo
        const parentPos = parentContainer.position?.desktop || { top: '0%', left: '0%' };
        const childPos = childComponent.position?.desktop || { top: '0%', left: '0%' };
        
        // Convertir posiciones relativas a absolutas (aproximación)
        const parentLeft = parseFloat(parentPos.left) || 0;
        const parentTop = parseFloat(parentPos.top) || 0;
        const childLeft = parseFloat(childPos.left) || 0;
        const childTop = parseFloat(childPos.top) || 0;
        
        const globalLeft = parentLeft + (childLeft * 0.01 * 50); // Aproximación
        const globalTop = parentTop + (childTop * 0.01 * 50);
        
        // Preparar el componente hijo como independiente
        const independentChild = {
          ...childComponent,
          parentId: undefined, // Remover referencia al padre
          position: {
            ...childComponent.position,
            desktop: {
              top: `${Math.max(0, Math.min(100, globalTop))}%`,
              left: `${Math.max(0, Math.min(100, globalLeft))}%`,
              percentX: Math.max(0, Math.min(100, globalLeft)),
              percentY: Math.max(0, Math.min(100, globalTop))
            },
            tablet: {
              top: `${Math.max(0, Math.min(100, globalTop))}%`,
              left: `${Math.max(0, Math.min(100, globalLeft))}%`,
              percentX: Math.max(0, Math.min(100, globalLeft)),
              percentY: Math.max(0, Math.min(100, globalTop))
            },
            mobile: {
              top: `${Math.max(0, Math.min(100, globalTop))}%`,
              left: `${Math.max(0, Math.min(100, globalLeft))}%`,
              percentX: Math.max(0, Math.min(100, globalLeft)),
              percentY: Math.max(0, Math.min(100, globalTop))
            }
          }
        };
        
        // Agregar como componente independiente
        return {
          ...prev,
          components: [...updatedComponents, independentChild]
        };
      }
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
  }, []);

  // NUEVO: Actualizar contenido de componente hijo
  const updateChildContent = useCallback((componentId, content) => {
    console.log(`📝 EDITOR: Actualizando contenido del componente hijo ${componentId}:`, content);
    
    findAndUpdateChild(componentId, (component) => {
      // Crear una copia del componente
      const updatedComponent = { ...component };
      
      // Actualizar el contenido basado en su tipo actual
      if (typeof content === 'string') {
        // Si recibimos un string pero el contenido actual es un objeto, actualizar texts.en
        if (typeof component.content === 'object' && component.content.texts) {
          updatedComponent.content = {
            ...component.content,
            texts: {
              ...component.content.texts,
              en: content
            }
          };
          
          // Si también tiene propiedad text (para compatibilidad), actualizarla
          if ('text' in component.content) {
            updatedComponent.content.text = content;
          }
        } else {
          // Si el contenido actual no es un objeto, reemplazar directamente
          updatedComponent.content = content;
        }
      } else if (typeof content === 'object') {
        // Si recibimos un objeto, reemplazar directamente
        updatedComponent.content = content;
      }
      
      return updatedComponent;
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
  }, [findAndUpdateChild]);

  // NUEVO: Actualizar estilo de componente hijo
  const updateChildStyleForDevice = useCallback((componentId, device, newStyle) => {
    console.log(`🎨 EDITOR: Actualizando estilo del componente hijo ${componentId} para ${device}:`, newStyle);
    
    findAndUpdateChild(componentId, (component) => {
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(component));
      
      // Asegurar que existe la estructura de estilos para el dispositivo
      if (!updatedComponent.style) updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.style[device]) updatedComponent.style[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedComponent.style[device] };
      
      // Actualizar solo el estilo para el dispositivo específico
      updatedComponent.style[device] = {
        ...currentDeviceStyle,
        ...newStyle
      };
      
      console.log(`✅ EDITOR: Estilo hijo actualizado para ${componentId} (${device}):`, updatedComponent.style[device]);
      
      return updatedComponent;
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      // Crear una copia profunda de los estilos
      const updatedStyle = JSON.parse(JSON.stringify(prev.style || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedStyle[device]) updatedStyle[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedStyle[device] };
      
      // Actualizar solo el estilo para el dispositivo específico
      updatedStyle[device] = {
        ...currentDeviceStyle,
        ...newStyle
      };
      
      return {
        ...prev,
        style: updatedStyle
      };
    });
  }, [findAndUpdateChild]);

  // NUEVO: Actualizar posición de componente hijo
  const updateChildPositionForDevice = useCallback((componentId, device, newPosition) => {
    console.log(`📍 EDITOR: Actualizando posición del componente hijo ${componentId} para ${device}:`, newPosition);
    
    // Asegurar que las posiciones estén en formato de porcentaje
    const processedPosition = {};
    
    if (newPosition.top !== undefined) {
      processedPosition.top = ensurePercentage(newPosition.top);
    }
    
    if (newPosition.left !== undefined) {
      processedPosition.left = ensurePercentage(newPosition.left);
    }
    
    findAndUpdateChild(componentId, (component) => {
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(component));
      
      // Asegurar que existe la estructura de posiciones
      if (!updatedComponent.position) updatedComponent.position = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.position[device]) updatedComponent.position[device] = {};
      
      // Actualizar solo las propiedades proporcionadas para el dispositivo específico
      updatedComponent.position[device] = {
        ...updatedComponent.position[device],
        ...processedPosition
      };
      
      console.log(`✅ EDITOR: Posición hijo actualizada para ${componentId} (${device}):`, updatedComponent.position[device]);
      
      return updatedComponent;
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      // Crear una copia profunda de las posiciones
      const updatedPosition = JSON.parse(JSON.stringify(prev.position || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedPosition[device]) updatedPosition[device] = {};
      
      // Actualizar solo las propiedades proporcionadas manteniendo valores existentes
      updatedPosition[device] = {
        ...updatedPosition[device],
        ...processedPosition
      };
      
      return {
        ...prev,
        position: updatedPosition
      };
    });
  }, [findAndUpdateChild, ensurePercentage]);

  // NUEVO: Actualizar configuración de contenedor - FASE 2
  const updateContainerConfig = useCallback((componentId, newContainerConfig) => {
    console.log(`🔧 EDITOR: Actualizando configuración de contenedor ${componentId}:`, newContainerConfig);
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) {
        console.warn(`Componente ${componentId} no encontrado para actualizar configuración de contenedor`);
        return prev;
      }
      
      // Verificar que es un contenedor
      if (prev.components[componentIndex].type !== 'container') {
        console.warn(`El componente ${componentId} no es un contenedor`);
        return prev;
      }
      
      // Crear una copia del componente
      const updatedComponent = { ...prev.components[componentIndex] };
      
      // Actualizar la configuración del contenedor
      updatedComponent.containerConfig = newContainerConfig;
      
      console.log(`✅ EDITOR: Configuración de contenedor actualizada para ${componentId}:`, newContainerConfig);
      
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
      
      return {
        ...prev,
        containerConfig: newContainerConfig
      };
    });
  }, []);

  // NUEVO: Reordenar hijos de contenedor - FASE 4
  const reorderContainerChildren = useCallback((containerId, newChildrenOrder) => {
    console.log(`🔄 EDITOR: Reordenando hijos del contenedor ${containerId}`);
    
    setBannerConfig(prev => {
      // Encontrar el componente contenedor
      const containerIndex = prev.components.findIndex(comp => comp.id === containerId);
      if (containerIndex === -1) {
        console.warn(`Contenedor ${containerId} no encontrado`);
        return prev;
      }
      
      // Verificar que es un contenedor
      if (prev.components[containerIndex].type !== 'container') {
        console.warn(`El componente ${containerId} no es un contenedor`);
        return prev;
      }
      
      // Crear una copia del componente contenedor
      const updatedContainer = { ...prev.components[containerIndex] };
      
      // Actualizar el orden de los hijos
      updatedContainer.children = [...newChildrenOrder];
      
      console.log(`✅ EDITOR: Hijos reordenados para contenedor ${containerId}. Nuevo orden:`, newChildrenOrder.map(c => c.id));
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[containerIndex] = updatedContainer;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // Actualizar también el componente seleccionado si es el contenedor
    setSelectedComponent(prev => {
      if (!prev || prev.id !== containerId) return prev;
      
      return {
        ...prev,
        children: [...newChildrenOrder]
      };
    });
  }, []);

  // Actualizar estilos - versión mejorada con validación de dimensiones para imágenes
  const updateComponentStyleForDevice = useCallback((componentId, device, newStyle) => {
    console.log(`📝 EDITOR: Actualizando estilo del componente ${componentId} para ${device}:`, newStyle);
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Verificar si estamos actualizando un componente de imagen
      const isImageComponent = prev.components[componentIndex].type === 'image';
      
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(prev.components[componentIndex]));
      
      // Asegurar que existe la estructura de estilos para el dispositivo
      if (!updatedComponent.style) updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.style[device]) updatedComponent.style[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedComponent.style[device] };
      
      // Procesar las dimensiones para componentes de imagen si se están actualizando
      let processedNewStyle = { ...newStyle };
      
      if (isImageComponent) {
        // IMPORTANTE: Validación de dimensiones para componentes de imagen
        // Si estamos actualizando la altura, deben validarse las dimensiones
        if ('height' in newStyle || 'width' in newStyle) {
          console.log(`🖼️ EDITOR: Validando dimensiones para imagen: ${componentId}`);
          
          // Extraer valores actuales y nuevos
          let widthValue = newStyle.width !== undefined ? newStyle.width : currentDeviceStyle.width;
          let heightValue = newStyle.height !== undefined ? newStyle.height : currentDeviceStyle.height;
          
          // Parsear valores numéricos de las dimensiones
          const parseSize = (size) => {
            if (!size) return null;
            const match = size.toString().match(/^(\d+)(px|%)?$/);
            return match ? parseInt(match[1], 10) : null;
          };
          
          // Obtener valores numéricos
          let width = parseSize(widthValue);
          let height = parseSize(heightValue);
          
          console.log(`📊 EDITOR: Dimensiones actuales: width=${width}, height=${height}`);
          
          // Verificar si alguna dimensión no es válida
          const needsDefaultWidth = width === null || isNaN(width) || width <= 0;
          const needsDefaultHeight = height === null || isNaN(height) || height <= 0;
          
          // Si alguna dimensión no es válida, aplicar valores predeterminados
          if (needsDefaultWidth || needsDefaultHeight) {
            console.log(`⚠️ EDITOR: Se requiere corrección de dimensiones: width=${needsDefaultWidth}, height=${needsDefaultHeight}`);
            
            // Establecer valores predeterminados seguros
            const DEFAULT_WIDTH = 200;
            const DEFAULT_HEIGHT = 150;
            
            // Si necesitamos ambas dimensiones o solo width
            if (needsDefaultWidth) {
              width = DEFAULT_WIDTH;
              processedNewStyle.width = `${width}px`;
              console.log(`✓ EDITOR: Estableciendo ancho predeterminado: ${width}px`);
            }
            
            // Si necesitamos ambas dimensiones o solo height
            if (needsDefaultHeight) {
              height = DEFAULT_HEIGHT;
              processedNewStyle.height = `${height}px`;
              console.log(`✓ EDITOR: Estableciendo alto predeterminado: ${height}px`);
            }
            
            // Si no hay objectFit, establecerlo
            if (!currentDeviceStyle.objectFit && !processedNewStyle.objectFit) {
              processedNewStyle.objectFit = 'contain';
              console.log(`✓ EDITOR: Estableciendo objectFit predeterminado: contain`);
            }
          }
        }
      }
      
      // Actualizar solo el estilo para el dispositivo específico con los valores procesados
      updatedComponent.style[device] = {
        ...currentDeviceStyle,
        ...processedNewStyle
      };
      
      // Debug: Si estamos actualizando dimensiones de imagen, mostrar información más específica
      if (isImageComponent && (newStyle.width || newStyle.height)) {
        console.log(`🔍 EDITOR: Actualización imagen ${componentId} - Dimensiones: `, {
          final: updatedComponent.style[device],
          anterior: currentDeviceStyle,
          nuevo: processedNewStyle
        });
      }
      
      console.log(`✅ EDITOR: Estilo actualizado para ${componentId} (${device}):`, updatedComponent.style[device]);
      
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
      
      // Determinar si es un componente de imagen
      const isImageComponent = prev.type === 'image';
      
      // Crear una copia profunda de los estilos
      const updatedStyle = JSON.parse(JSON.stringify(prev.style || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedStyle[device]) updatedStyle[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedStyle[device] };
      
      // Procesar las nuevas propiedades de estilo
      let processedNewStyle = { ...newStyle };
      
      if (isImageComponent) {
        // IMPORTANTE: Validación de dimensiones para componentes de imagen
        // Similar a la lógica anterior para el bannerConfig
        if ('height' in newStyle || 'width' in newStyle) {
          // Extraer valores actuales y nuevos
          let widthValue = newStyle.width !== undefined ? newStyle.width : currentDeviceStyle.width;
          let heightValue = newStyle.height !== undefined ? newStyle.height : currentDeviceStyle.height;
          
          // Parsear valores numéricos
          const parseSize = (size) => {
            if (!size) return null;
            const match = size.toString().match(/^(\d+)(px|%)?$/);
            return match ? parseInt(match[1], 10) : null;
          };
          
          // Obtener valores numéricos
          let width = parseSize(widthValue);
          let height = parseSize(heightValue);
          
          // Verificar si alguna dimensión no es válida
          const needsDefaultWidth = width === null || isNaN(width) || width <= 0;
          const needsDefaultHeight = height === null || isNaN(height) || height <= 0;
          
          // Si alguna dimensión no es válida, aplicar valores predeterminados
          if (needsDefaultWidth || needsDefaultHeight) {
            const DEFAULT_WIDTH = 200;
            const DEFAULT_HEIGHT = 150;
            
            if (needsDefaultWidth) {
              processedNewStyle.width = `${DEFAULT_WIDTH}px`;
            }
            
            if (needsDefaultHeight) {
              processedNewStyle.height = `${DEFAULT_HEIGHT}px`;
            }
            
            // Si no hay objectFit, establecerlo
            if (!currentDeviceStyle.objectFit && !processedNewStyle.objectFit) {
              processedNewStyle.objectFit = 'contain';
            }
          }
        }
      }
      
      // Actualizar solo el estilo para el dispositivo específico con los valores procesados
      updatedStyle[device] = {
        ...currentDeviceStyle,
        ...processedNewStyle
      };
      
      return {
        ...prev,
        style: updatedStyle
      };
    });
    
    // Importante: Al actualizar dimensiones, también actualizar los estilos para otros dispositivos
    // si es un componente de imagen, para mantener consistencia en el aspecto visual
    if (newStyle.width || newStyle.height) {
      setTimeout(() => {
        // Forzar sincronización para otros dispositivos después de que el cambio principal ocurra
        setBannerConfig(prev => {
          const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
          if (componentIndex === -1) return prev;
          
          const component = prev.components[componentIndex];
          const isImageComponent = component.type === 'image';
          
          if (!isImageComponent || !component.style?.[device]) return prev;
          
          // Dispositivos a sincronizar (diferentes al que se está editando)
          const otherDevices = ['desktop', 'tablet', 'mobile'].filter(d => d !== device);
          if (otherDevices.length === 0) return prev;
          
          // Solo sincronizar dimensiones y objectFit
          const dimensionsToSync = {};
          if (component.style[device].width) dimensionsToSync.width = component.style[device].width;
          if (component.style[device].height) dimensionsToSync.height = component.style[device].height;
          if (component.style[device].objectFit) dimensionsToSync.objectFit = component.style[device].objectFit;
          
          if (Object.keys(dimensionsToSync).length === 0) return prev;
          
          // Crear copia del componente
          const updatedComponent = JSON.parse(JSON.stringify(component));
          
          // Actualizar dimensiones para otros dispositivos
          otherDevices.forEach(otherDevice => {
            if (!updatedComponent.style[otherDevice]) {
              updatedComponent.style[otherDevice] = {};
            }
            
            updatedComponent.style[otherDevice] = {
              ...updatedComponent.style[otherDevice],
              ...dimensionsToSync
            };
          });
          
          // Crear una copia del array de componentes
          const updatedComponents = [...prev.components];
          updatedComponents[componentIndex] = updatedComponent;
          
          return {
            ...prev,
            components: updatedComponents
          };
        });
      }, 100); // Pequeño retraso para asegurar que el cambio principal ya ocurrió
    }
  }, []);

  // Actualizar posición - Mejorado para manejar actualizaciones parciales correctamente
  const updateComponentPositionForDevice = useCallback((componentId, device, newPosition) => {
    console.log(`📍 Actualizando posición del componente ${componentId} para ${device}:`, newPosition);
    
    // Asegurar que las posiciones estén en formato de porcentaje
    // Solo procesar las propiedades que realmente están en newPosition
    const processedPosition = {};
    
    if (newPosition.top !== undefined) {
      processedPosition.top = ensurePercentage(newPosition.top);
    }
    
    if (newPosition.left !== undefined) {
      processedPosition.left = ensurePercentage(newPosition.left);
    }
    
    setBannerConfig(prev => {
      // Encontrar el componente a actualizar
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev; // No encontrado
      
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(prev.components[componentIndex]));
      
      // Asegurar que existe la estructura de posiciones
      if (!updatedComponent.position) updatedComponent.position = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.position[device]) updatedComponent.position[device] = {};
      
      // Actualizar solo las propiedades proporcionadas para el dispositivo específico
      // manteniendo los valores existentes para propiedades no especificadas
      updatedComponent.position[device] = {
        ...updatedComponent.position[device],
        ...processedPosition
      };
      
      // Log para debugging de posiciones
      console.log(`🔍 Posición FINAL de ${componentId} en ${device}:`, updatedComponent.position[device]);
      
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
      
      // Actualizar solo las propiedades proporcionadas manteniendo valores existentes
      // Esto es crucial para evitar que se pierdan valores cuando solo se actualiza una propiedad
      updatedPosition[device] = {
        ...updatedPosition[device],
        ...processedPosition
      };
      
      return {
        ...prev,
        position: updatedPosition
      };
    });
    
    // IMPORTANTE: Forzar una actualización definitiva después de un corto retraso
    // Esto asegura que la posición se guarde correctamente incluso si hay algún problema con la actualización inicial
    setTimeout(() => {
      // Asegurarse una vez más de que la posición está correctamente establecida
      setBannerConfig(prev => {
        const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
        if (componentIndex === -1) return prev; // No encontrado
        
        // Obtener el componente actual
        const component = prev.components[componentIndex];
        
        // Verificar si el componente ya tiene la posición procesada correcta
        if (component.position?.[device]?.top === processedPosition.top && 
            component.position?.[device]?.left === processedPosition.left) {
          // Ya tiene las posiciones correctas, no necesitamos actualizarlo
          return prev;
        }
        
        // Necesitamos forzar la actualización
        console.log(`🔄 Forzando actualización de posición para ${componentId} en ${device}:`, processedPosition);
        
        // Crear una copia profunda del componente
        const updatedComponent = JSON.parse(JSON.stringify(component));
        
        // Asegurar que existe la estructura de posiciones
        if (!updatedComponent.position) updatedComponent.position = { desktop: {}, tablet: {}, mobile: {} };
        if (!updatedComponent.position[device]) updatedComponent.position[device] = {};
        
        // Establecer la posición forzada
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
    }, 100); // Un pequeño retraso para asegurarse de que la primera actualización ya se completó
  }, [ensurePercentage]);

  // Actualizar layout - refactorizado para evitar problemas de estado
  const handleUpdateLayoutForDevice = useCallback((device, prop, value) => {
    // console.log(`🔄 Actualizando layout para dispositivo ${device}, propiedad ${prop}:`, value);
    
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
        // console.log('⚠️ Error en API de vista previa, usando previsualización local');
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

  // Función handleSave corregida con sintaxis correcta y soporte para plantillas del sistema
const handleSave = useCallback(async (customConfig = null, isSystemTemplate = false) => {
  try {
    // console.log('💾 Guardando banner...');
    
    // Recopilar información de imágenes temporales
    const imageFiles = new Map();
    const configToSave = customConfig || bannerConfig;
    
    // console.log('🔍 Analizando componentes para buscar imágenes...');
    
    // Función mejorada para buscar referencias temporales
    const collectImageRefs = (components) => {
      if (!components || !Array.isArray(components)) return;
      
      // console.log(`🔍 Verificando ${components.length} componentes`);
      
      components.forEach(comp => {
        if (comp.type === 'image' && typeof comp.content === 'string') {
          if (comp.content.startsWith('__IMAGE_REF__')) {
            // console.log(`🖼️ Encontrada referencia de imagen en componente ${comp.id}: ${comp.content}`);
            
            // Buscar archivo en todas las posibles ubicaciones
            let file = null;
            
            // Buscar en todas las propiedades posibles
            if (comp._tempFile instanceof File || comp._tempFile instanceof Blob) {
              file = comp._tempFile;
              // console.log(`📂 Archivo encontrado en _tempFile`);
            } else if (comp._imageFile instanceof File || comp._imageFile instanceof Blob) {
              file = comp._imageFile;
              // console.log(`📂 Archivo encontrado en _imageFile`);
            } else if (comp.style?.desktop?._tempFile instanceof File || comp.style?.desktop?._tempFile instanceof Blob) {
              file = comp.style.desktop._tempFile;
              // console.log(`📂 Archivo encontrado en style.desktop._tempFile`);
            }
            
            // También buscar en el DOM como último recurso
            if (!file) {
              try {
                const compEl = document.querySelector(`[data-id="${comp.id}"]`);
                if (compEl && compEl.parentNode) {
                  if (compEl.parentNode._tempFile instanceof File || compEl.parentNode._tempFile instanceof Blob) {
                    file = compEl.parentNode._tempFile;
                    // console.log(`📂 Archivo encontrado en el DOM`);
                  }
                }
              } catch (error) {
                console.error("Error al buscar archivo en DOM:", error);
              }
            }
            
            // Verificar si encontramos el archivo
            if (file) {
              imageFiles.set(comp.content, file);
              // console.log(`✅ Guardando archivo: ${file.name}, ${file.size} bytes, tipo: ${file.type}`);
            } else {
              console.warn(`⚠️ No se encontró archivo para referencia ${comp.content}`);
              // console.log('Estructura del componente:', JSON.stringify({
              //   id: comp.id,
              //   hasTempFile: comp._tempFile !== undefined,
              //   hasImageFile: comp._imageFile !== undefined,
              //   hasStyleDesktop: comp.style?.desktop !== undefined,
              //   hasStyleDesktopTempFile: comp.style?.desktop?._tempFile !== undefined
              // }));
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
    
    // console.log(`🔢 Imágenes encontradas: ${imageFiles.size}`);
    
    // Si hay imágenes, usar FormData, de lo contrario, JSON simple
    if (imageFiles.size > 0) {
      // console.log(`🖼️ Creando FormData con ${imageFiles.size} imágenes`);
      
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
      
      // Si es plantilla del sistema, agregar el flag
      if (isSystemTemplate) {
        formData.append('isSystemTemplate', 'true');
      }
      
      // Añadir archivos de imagen uno por uno
      let counter = 0;
      imageFiles.forEach((file, imageRef) => {
        const imageId = imageRef.replace('__IMAGE_REF__', '');
        const fileName = `IMAGE_REF_${imageId}_${file.name || 'image.png'}`;
        
        // Agregar con nombre explícito para mejor tracking
        formData.append('bannerImages', file, fileName);
        counter++;
        // console.log(`📦 [${counter}/${imageFiles.size}] Añadido archivo: ${fileName}, ${file.size} bytes`);
      });
      
      // Comprobar si el FormData tiene los datos correctos
      try {
        // console.log('✅ Verificando FormData creado:');
        for (let [key, value] of formData.entries()) {
          if (key === 'template') {
            // console.log(`  - ${key}: [JSON data, longitud: ${value.length} caracteres]`);
          } else {
            // console.log(`  - ${key}: ${value instanceof File ? `Archivo: ${value.name}, ${value.size} bytes` : value}`);
          }
        }
      } catch (error) {
        console.error('Error al verificar FormData:', error);
      }
      
      // console.log('📤 Enviando banner con imágenes...');
      const response = await createTemplate(formData, isSystemTemplate);
      
      // console.log('✅ Banner guardado con éxito:', response);
      return response.data.template;
    } else {
      // console.log('📤 Enviando banner sin imágenes (JSON simple)...');
      const response = await createTemplate(configToSave, isSystemTemplate);
      // console.log('✅ Banner guardado con éxito:', response);
      return response.data.template;
    }
  } catch (err) {
    console.error('❌ Error guardando la plantilla:', err);
    throw err;
  }
}, [bannerConfig]);
// Función handleUpdate mejorada con tracking de imágenes
const handleUpdate = useCallback(async (bannerId, customConfig = null) => {
  try {
    console.log(`💾 Actualizando banner ${bannerId}...`);
    
    const configToUpdate = customConfig || bannerConfig;
    
    // Verificar si es plantilla del sistema
    const isSystemTemplate = configToUpdate.type === 'system';
    
    // IMPORTANTE: Guardar referencias a imágenes antes de la actualización
    // Esta función ayuda a identificar qué imágenes se están usando actualmente
    const trackImagesBeforeUpdate = (components) => {
      const imageRefs = new Set();
      
      const processComponent = (comp) => {
        if (!comp) return;
        
        // Si es componente de imagen, registrar su URL
        if (comp.type === 'image' && typeof comp.content === 'string') {
          // Solo registrar URLs que apuntan a imágenes en el servidor
          if (comp.content.includes(`/templates/images/${bannerId}/`)) {
            imageRefs.add(comp.content);
          }
        }
        
        // Procesar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          comp.children.forEach(child => processComponent(child));
        }
      };
      
      if (Array.isArray(components)) {
        components.forEach(comp => processComponent(comp));
      }
      
      return imageRefs;
    };
    
    // Capturar imágenes en uso antes de la actualización
    const beforeImages = trackImagesBeforeUpdate(configToUpdate.components);
    console.log(`🔍 Imágenes en uso antes de actualizar: ${beforeImages.size}`);
    
    // Workaround: Guardar el tipo original para restaurarlo después
    let originalType = configToUpdate.type;
    
    // SIEMPRE usar FormData, no importa qué
    console.log('📤 Preparando FormData para envío...');
    
    // Crear FormData
    const formData = new FormData();
    
    // Crear copia limpia del config
    const cleanConfig = JSON.parse(JSON.stringify(configToUpdate));
    
    // Ya no necesitamos workarounds especiales para plantillas del sistema
    // El backend ahora maneja correctamente ambos tipos de plantillas para usuarios owner
    
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
        // Añadir todas las imágenes nuevas al FormData
        keys.forEach(imageRef => {
          const file = window._imageFiles[imageRef];
          
          if (file instanceof File || file instanceof Blob) {
            // Añadir archivo al FormData con nombre específico
            const fileName = file.name || `image_${Date.now()}.jpg`;
            formData.append("bannerImages", file, fileName);
            console.log(`📦 Añadido archivo: ${fileName}, ${file.size} bytes al FormData`);
          }
        });
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
    let response;
    
    // Siempre usar el endpoint estándar (workaround para sistema)
    console.log(`Enviando actualización para banner ${bannerId} con tipo ${isSystemTemplate ? 'system (modificado)' : 'custom'}`);
    response = await updateTemplate(bannerId, formData);
    
    console.log('✅ Banner actualizado con éxito:', response);
    
    // Limpiar todas las imágenes temporales del almacenamiento global después de guardar
    if (window._imageFiles) {
      console.log('🧹 Limpiando referencias a imágenes del almacenamiento global...');
      window._imageFiles = {};
    }
    
    return response.data.template;

  } catch (err) {
    console.error('❌ Error actualizando la plantilla:', err);
    throw err;
  }
}, [bannerConfig]);

  

  // Procesar imágenes en componentes
  const processImages = useCallback(async (bannerId) => {
    try {
      // console.log(`🖼️ Procesando imágenes para banner ${bannerId}...`);
      const componentsWithImages = bannerConfig.components.filter(
        comp => comp.type === 'image' && 
               typeof comp.content === 'string' && 
               comp.content.startsWith('data:image')
      );
      
      if (componentsWithImages.length === 0) {
        // console.log('ℹ️ No hay imágenes para procesar');
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
          // console.log(`✅ Imagen procesada para componente ${component.id}`);
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
      // console.log('❌ No se proporcionó configuración inicial');
      return;
    }
    
    // console.log('📥 Recibida configuración inicial:', config);
    
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
          height: 'auto',
          maxWidth: '100%',
          // Valores por defecto para floating
          floatingCorner: 'bottom-right',
          floatingMargin: 20
        },
        tablet: processedConfig.layout?.tablet || {},
        mobile: processedConfig.layout?.mobile || {}
      }
    };
    
    
    // Asegurar valores correctos según tipo de banner para todos los dispositivos
    ['desktop', 'tablet', 'mobile'].forEach(device => {
      if (normalizedConfig.layout[device]) {
        const bannerType = normalizedConfig.layout[device].type;
        
        // Ajustar ancho según tipo
        if (bannerType === 'modal') {
          normalizedConfig.layout[device].width = '60%';
          normalizedConfig.layout[device].minWidth = '40%';
          normalizedConfig.layout[device].maxWidth = '90%';
          normalizedConfig.layout[device]['data-width'] = '60';
        } else if (bannerType === 'floating') {
          normalizedConfig.layout[device].width = '50%';
          normalizedConfig.layout[device].minWidth = '40%';
          normalizedConfig.layout[device].maxWidth = '70%';
          normalizedConfig.layout[device]['data-width'] = '50';
          // Asegurar que tenga configuración de esquina y margen
          if (!normalizedConfig.layout[device].floatingCorner) {
            normalizedConfig.layout[device].floatingCorner = 'bottom-right';
          }
          if (!normalizedConfig.layout[device].floatingMargin) {
            normalizedConfig.layout[device].floatingMargin = 20;
          }
        } else { // banner estándar
          normalizedConfig.layout[device].width = '100%';
        }
      }
    });
    
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
          
          // CORRECCIÓN ESPECIAL: Detectar y corregir el bug de offset de 30-60px en botones de preferencias
          if (component.id === 'preferencesBtn' || component.action?.type === 'show_preferences') {
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (component.position[device]) {
                const pos = component.position[device];
                
                // Corregir valores problemáticos en left y right
                if (pos.left && typeof pos.left === 'string') {
                  // Si tiene formato píxeles con valores entre 30-60px, probablemente es el bug
                  if (pos.left.endsWith('px')) {
                    const leftPx = parseFloat(pos.left);
                    if (leftPx >= 30 && leftPx <= 60) {
                      console.log(`🔧 Corrigiendo offset problemático en ${device}: left ${pos.left} -> 0px`);
                      pos.left = '0px';
                    }
                  }
                }
                
                if (pos.right && typeof pos.right === 'string') {
                  // Si tiene formato píxeles con valores entre 30-60px, probablemente es el bug
                  if (pos.right.endsWith('px')) {
                    const rightPx = parseFloat(pos.right);
                    if (rightPx >= 30 && rightPx <= 60) {
                      console.log(`🔧 Corrigiendo offset problemático en ${device}: right ${pos.right} -> 0px`);
                      pos.right = '0px';
                    }
                  }
                }
                
                // También corregir transformaciones innecesarias en botones laterales
                if ((pos.left === '0px' || pos.right === '0px') && pos.transformX) {
                  console.log(`🔧 Eliminando transformX innecesaria para botón lateral en ${device}`);
                  delete pos.transformX;
                  delete pos.transform;
                }
              }
            });
          }
          
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
    
    // console.log('✅ Configuración normalizada lista:', normalizedConfig);
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
    
    // console.log(`🖼️ Subiendo imagen para componente ${componentId}...`);
    
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
      // console.log(`✅ Imagen subida y componente actualizado con URL: ${imageUrl}`);
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
      
      // console.log(`🖼️ Subiendo imagen base64 para componente ${componentId}`);
      
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

  // NUEVA FUNCIÓN - FASE 4: Obtener todos los componentes aplanados para validación
  const getAllComponentsFlattened = useCallback(() => {
    const flattenComponents = (components) => {
      let result = [];
      
      for (const comp of components) {
        result.push(comp);
        if (comp.children && comp.children.length > 0) {
          result.push(...flattenComponents(comp.children));
        }
      }
      
      return result;
    };
    
    return flattenComponents(bannerConfig.components || []);
  }, [bannerConfig.components]);

  // NUEVO: Listener para eventos de actualización de hijos de contenedor - FASE 4
  useEffect(() => {
    const handleContainerChildrenUpdate = (event) => {
      const { containerId, children, deviceView } = event.detail;
      console.log(`📡 Recibido evento de actualización de hijos para contenedor ${containerId}`);
      
      setBannerConfig(prev => {
        const containerIndex = prev.components.findIndex(comp => comp.id === containerId);
        if (containerIndex === -1) return prev;
        
        const updatedContainer = { ...prev.components[containerIndex] };
        updatedContainer.children = children;
        
        const updatedComponents = [...prev.components];
        updatedComponents[containerIndex] = updatedContainer;
        
        return {
          ...prev,
          components: updatedComponents
        };
      });
      
      // Actualizar componente seleccionado si es el contenedor
      setSelectedComponent(prev => {
        if (!prev || prev.id !== containerId) return prev;
        return {
          ...prev,
          children: children
        };
      });
    };
    
    document.addEventListener('container:children-updated', handleContainerChildrenUpdate);
    
    return () => {
      document.removeEventListener('container:children-updated', handleContainerChildrenUpdate);
    };
  }, []);

  // NUEVO: Actualizar posición de componente hijo - FASE 4
  const updateChildPosition = useCallback((childId, parentId, newPosition) => {
    console.log(`📍 useBannerEditor: Actualizando posición del hijo ${childId} en contenedor ${parentId}:`, newPosition);
    
    setBannerConfig(prev => {
      const updateComponents = (componentsList) => {
        return componentsList.map(comp => {
          if (comp.id === parentId && comp.type === 'container') {
            // Es el contenedor padre, actualizar el hijo
            const updatedChildren = comp.children.map(child => {
              if (child.id === childId) {
                return {
                  ...child,
                  position: {
                    ...child.position,
                    [deviceView]: {
                      ...child.position?.[deviceView],
                      ...newPosition
                    }
                  }
                };
              }
              return child;
            });
            
            return {
              ...comp,
              children: updatedChildren
            };
          }
          
          // Buscar recursivamente en otros contenedores
          if (comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: updateComponents(comp.children)
            };
          }
          
          return comp;
        });
      };

      return {
        ...prev,
        components: updateComponents(prev.components)
      };
    });

    // También actualizar selectedComponent si es el hijo que se está moviendo
    setSelectedComponent(prev => {
      if (prev && prev.id === childId) {
        return {
          ...prev,
          position: {
            ...prev.position,
            [deviceView]: {
              ...prev.position?.[deviceView],
              ...newPosition
            }
          }
        };
      }
      return prev;
    });
  }, [deviceView]);
  
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
    updateContainerConfig, // NUEVA FUNCIÓN - FASE 2: Actualizar configuración de contenedor
    addChildToContainer, // NUEVA FUNCIÓN - FASE 4: Agregar hijo a contenedor
    reorderContainerChildren, // NUEVA FUNCIÓN - FASE 4: Reordenar hijos de contenedor
    // NUEVAS FUNCIONES para componentes hijos
    deleteChildComponent, // Eliminar componente hijo
    removeChildFromContainer, // NUEVA: Remover hijo de contenedor (hacerlo independiente)
    updateChildContent, // Actualizar contenido de componente hijo
    updateChildStyleForDevice, // Actualizar estilo de componente hijo
    updateChildPositionForDevice, // Actualizar posición de componente hijo
    updateChildPosition, // NUEVA FUNCIÓN - FASE 4: Actualizar posición de componente hijo
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
    collectImageFiles, // Nueva función para recopilar archivos de imágenes
    getAllComponentsFlattened // NUEVA FUNCIÓN - FASE 4: Para validación de anidamiento
  };
}