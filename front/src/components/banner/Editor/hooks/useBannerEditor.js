// src/components/banner/Editor/hooks/useBannerEditor.js
import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '../../../../utils/apiClient';
import {createTemplate, updateTemplate} from '../../../../api/bannerTemplate';
import {getClients} from '../../../../api/client';
import { translateText } from '../../../../api/translation';
import { validateChildSize, validateChildPosition, validateContainerChildren } from '../../../../utils/containerBoundsValidator';
import { BannerConfigHelper } from '../../../../utils/bannerConfigHelper';
import imageMemoryManager from '../../../../utils/imageMemoryManager';
import { processImageStyles, imageAspectRatioCache } from '../../../../utils/imageProcessing';
import { getDimensionManager } from '../../../../services/DimensionManager.js';

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

// Función helper para buscar un componente por ID recursivamente
const findComponentById = (components, componentId) => {
  if (!components || !Array.isArray(components)) return null;
  
  for (const comp of components) {
    if (comp.id === componentId) {
      return comp;
    }
    
    // Buscar en hijos si es contenedor
    if (comp.children && Array.isArray(comp.children)) {
      const found = findComponentById(comp.children, componentId);
      if (found) return found;
    }
  }
  
  return null;
};

// Función helper para obtener contenido por defecto según el tipo
const getDefaultContent = (type, actionType = null) => {
  switch (type) {
    case 'text':
      return 'Nuevo texto';
    case 'button':
      // Para botones con acciones específicas, usar textos apropiados
      if (actionType === 'accept_all') return { texts: { en: 'Accept All' }, translatable: true };
      if (actionType === 'reject_all') return { texts: { en: 'Reject All' }, translatable: true };
      if (actionType === 'show_preferences') return { texts: { en: 'Preferences' }, translatable: true };
      return 'Nuevo botón';
    case 'language-button':
      return {
        displayMode: 'flag-dropdown',
        languages: ['es', 'en', 'fr', 'de', 'it', 'pt'],
        defaultLanguageMode: 'auto',
        defaultLanguage: 'es',
        showLabel: true,
        labelText: 'Idioma:',
        size: 'medium',
        style: 'modern',
        position: 'inline',
        required: true,
        autoDetectBrowserLanguage: true,
        fallbackLanguage: 'en',
        saveUserPreference: true
      };
    case 'image':
      return ''; // Las imágenes empiezan vacías
    case 'container':
      return null; // Los contenedores no tienen contenido
    default:
      return '';
  }
};

// Función helper para obtener estilos por defecto según el tipo
const getDefaultStylesForNewComponent = (type, actionType = null) => {
  const baseStyles = {
    desktop: {},
    tablet: {},
    mobile: {}
  };
  
  switch (type) {
    case 'text':
      return {
        desktop: { fontSize: '16px', color: '#333333', textAlign: 'left' },
        tablet: { fontSize: '14px', color: '#333333', textAlign: 'left' },
        mobile: { fontSize: '12px', color: '#333333', textAlign: 'left' }
      };
      
    case 'button':
      // Estilos específicos para botones con acciones
      if (actionType === 'accept_all') {
        return {
          desktop: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '16px', padding: '8px 16px', textAlign: 'center' },
          tablet: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '14px', padding: '6px 12px', textAlign: 'center' },
          mobile: { borderRadius: '4px', backgroundColor: '#4CAF50', color: '#fff', fontSize: '12px', padding: '4px 8px', textAlign: 'center' }
        };
      }
      if (actionType === 'reject_all') {
        return {
          desktop: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '16px', padding: '8px 16px', textAlign: 'center' },
          tablet: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '14px', padding: '6px 12px', textAlign: 'center' },
          mobile: { borderRadius: '4px', backgroundColor: '#f44336', color: '#fff', fontSize: '12px', padding: '4px 8px', textAlign: 'center' }
        };
      }
      if (actionType === 'show_preferences') {
        return {
          desktop: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '16px', padding: '8px 16px', textAlign: 'center' },
          tablet: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '14px', padding: '6px 12px', textAlign: 'center' },
          mobile: { borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff', fontSize: '12px', padding: '4px 8px', textAlign: 'center' }
        };
      }
      // Botón genérico
      return {
        desktop: { borderRadius: '4px', backgroundColor: '#007bff', color: '#fff', fontSize: '16px', padding: '8px 16px', textAlign: 'center' },
        tablet: { borderRadius: '4px', backgroundColor: '#007bff', color: '#fff', fontSize: '14px', padding: '6px 12px', textAlign: 'center' },
        mobile: { borderRadius: '4px', backgroundColor: '#007bff', color: '#fff', fontSize: '12px', padding: '4px 8px', textAlign: 'center' }
      };
      
    case 'language-button':
      return {
        desktop: { 
          width: '120px', 
          height: '35px',
          backgroundColor: '#ffffff', 
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          padding: '4px 8px'
        },
        tablet: { 
          width: '110px', 
          height: '32px',
          backgroundColor: '#ffffff', 
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '13px',
          padding: '4px 6px'
        },
        mobile: { 
          width: '100px', 
          height: '30px',
          backgroundColor: '#ffffff', 
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '12px',
          padding: '3px 6px'
        }
      };
      
    case 'image':
      // Para imágenes, empezar con dimensiones más pequeñas
      return {
        desktop: { width: '150px', height: '113px', objectFit: 'contain' },
        tablet: { width: '130px', height: '98px', objectFit: 'contain' },
        mobile: { width: '110px', height: '83px', objectFit: 'contain' }
      };
      
    case 'container':
      return {
        desktop: { 
          backgroundColor: 'transparent', 
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '10px',
          minWidth: '200px',
          minHeight: '100px'
        },
        tablet: { 
          backgroundColor: 'transparent', 
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '10px',
          minWidth: '150px',
          minHeight: '80px'
        },
        mobile: { 
          backgroundColor: 'transparent', 
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '8px',
          minWidth: '100px',
          minHeight: '60px'
        }
      };
      
      
    default:
      return baseStyles;
  }
};

export function useBannerEditor() {
  // Estado para guardar información del cliente
  const [clientInfo, setClientInfo] = useState(null);
  
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
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);
  
  // Configuración de traducción
  const [translationConfig, setTranslationConfig] = useState(() => {
    const initialConfig = {
      sourceLanguage: 'en', // Idioma origen seleccionable
      targetLanguages: ['es', 'fr', 'de', 'it', 'pt'], // Idiomas destino
      autoTranslateOnSave: true // Si auto-traducir al guardar
    };
    console.log('🌐 Estado inicial de translationConfig:', initialConfig);
    return initialConfig;
  });

  // Instancia del DimensionManager para sincronización bidireccional
  const dimensionManagerRef = useRef(null);
  
  // 🔄 INTEGRACIÓN: Método directo para actualizar desde DimensionManager (Fase 2.2.4)
  const updateDimensionFromManager = useCallback((componentId, property, value, device) => {
    console.log(`🔄 useBannerEditor: updateDimensionFromManager(${componentId}, ${property}, ${value}, ${device})`);
    
    if (!componentId || !property || !device) {
      console.error('❌ updateDimensionFromManager: Parámetros requeridos faltantes');
      return;
    }
    
    // Actualizar estado global SIN triggear eventos adicionales
    setBannerConfig(prev => {
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) {
        console.warn(`🔄 updateDimensionFromManager: Componente no encontrado: ${componentId}`);
        return prev;
      }
      
      // Crear copia profunda del componente
      const updatedComponent = JSON.parse(JSON.stringify(prev.components[componentIndex]));
      
      // Asegurar estructura de estilos
      if (!updatedComponent.style) updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.style[device]) updatedComponent.style[device] = {};
      
      // Actualizar solo la propiedad específica
      updatedComponent.style[device][property] = value;
      
      console.log(`✅ updateDimensionFromManager: ${componentId}.${property} = ${value} (${device})`);
      
      // Crear copia del array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[componentIndex] = updatedComponent;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
  }, []);
  
  // Inicializar DimensionManager al montar el hook
  useEffect(() => {
    if (!dimensionManagerRef.current) {
      dimensionManagerRef.current = getDimensionManager({
        debug: process.env.NODE_ENV === 'development',
        enableValidation: true,
        enableLogging: true
      });
      
      console.log('🔧 useBannerEditor: DimensionManager inicializado', {
        instance: !!dimensionManagerRef.current,
        config: dimensionManagerRef.current?.config
      });
    }
    
    // 🔄 SUSCRIPTOR BIDIRECCIONAL: Escuchar eventos del DimensionManager para sincronización
    const unsubscribe = dimensionManagerRef.current?.subscribe((event) => {
      // Prevenir bucles infinitos: No procesar eventos que vienen del propio hook
      if (event.source === 'state-update') {
        console.log('🔄 useBannerEditor: Ignorando evento de origen state-update para evitar bucle', event);
        return;
      }
      
      // Solo procesar eventos de cambio de dimensión que vienen de fuentes externas (ej: drag-resize)
      if (event.type === 'dimension-changed' && event.componentId && event.property && event.value && event.device) {
        console.log('🔄 useBannerEditor: Recibiendo cambio de dimensión desde DimensionManager', {
          componentId: event.componentId,
          property: event.property,
          value: event.value,
          device: event.device,
          source: event.source
        });
        
        // Crear el objeto de estilo para actualizar
        const styleUpdate = {
          [event.property]: event.value
        };
        
        // Usar el método directo que NO genera eventos adicionales
        updateDimensionFromManager(event.componentId, event.property, event.value, event.device);
      }
    });
    
    // Cleanup al desmontar
    return () => {
      if (dimensionManagerRef.current) {
        console.log('🧹 useBannerEditor: Limpiando DimensionManager y suscriptor');
        unsubscribe?.();
      }
    };
  }, [updateDimensionFromManager]);

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
  const getDefaultContent = (type, actionType = null) => {
    switch (type) {
      case 'text':
        return {
          texts: { en: 'New Text' },
          translatable: true
        };
      case 'button':
        // Si es un botón obligatorio, usar texto específico
        if (actionType) {
          switch (actionType) {
            case 'accept_all':
              return {
                texts: { en: 'Accept All' },
                translatable: true
              };
            case 'reject_all':
              return {
                texts: { en: 'Reject All' },
                translatable: true
              };
            case 'show_preferences':
              return {
                texts: { en: 'Preferences' },
                translatable: true
              };
            default:
              return {
                texts: { en: 'New Button' },
                translatable: true
              };
          }
        } else {
          return {
            texts: { en: 'New Button' },
            translatable: true
          };
        }
      case 'language-button':
        return {
          displayMode: 'flag-dropdown',
          languages: ['es', 'en', 'fr', 'de'],
          defaultLanguage: 'es',
          showLabel: true,
          required: true
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
  const getDefaultStylesForNewComponent = (type, actionType = null) => {
    // Estilos base comunes para todos los dispositivos
    let baseStyles = {};
    
    switch (type) {
      case 'button':
        // Si es un botón obligatorio, usar estilos específicos
        if (actionType) {
          switch (actionType) {
            case 'accept_all':
              baseStyles = {
                backgroundColor: '#4CAF50',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit'
              };
              break;
            case 'reject_all':
              baseStyles = {
                backgroundColor: '#f44336',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit'
              };
              break;
            case 'show_preferences':
              baseStyles = {
                backgroundColor: '#2196F3',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit'
              };
              break;
            default:
              baseStyles = {
                backgroundColor: '#4CAF50',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit'
              };
          }
        } else {
          // Botón genérico
          baseStyles = {
            backgroundColor: '#4CAF50',
            color: '#ffffff',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
            fontFamily: 'inherit'
          };
        }
        
        return {
          desktop: { ...baseStyles, fontSize: '16px', padding: '8px 16px', textAlign: 'center' },
          tablet: { ...baseStyles, fontSize: '14px', padding: '6px 12px', textAlign: 'center' },
          mobile: { ...baseStyles, fontSize: '12px', padding: '4px 8px', textAlign: 'center' }
        };
        
      case 'text':
        baseStyles = {
          color: '#333333',
          lineHeight: '1.5',
          fontFamily: 'inherit'
        };
        
        return {
          desktop: { ...baseStyles, fontSize: '14px', padding: '8px', textAlign: 'left' },
          tablet: { ...baseStyles, fontSize: '12px', padding: '6px', textAlign: 'left' },
          mobile: { ...baseStyles, fontSize: '10px', padding: '4px', textAlign: 'left' }
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
        
      case 'language-button':
        baseStyles = {
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        };
        
        return {
          desktop: { ...baseStyles, width: '120px', height: '35px', fontSize: '14px', padding: '4px 8px' },
          tablet: { ...baseStyles, width: '110px', height: '32px', fontSize: '13px', padding: '4px 6px' },
          mobile: { ...baseStyles, width: '100px', height: '30px', fontSize: '12px', padding: '3px 6px' }
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
    if (value === undefined || value === null) return undefined;
    if (!value && value !== 0) return '0%';
    
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

  // Posición por defecto - cambié a 0,0 para debuggear
  const defaultPosition = { top: '0%', left: '0%' };

  // Función para validar y centrar posición si está fuera del canvas
  const validateAndCenterPosition = useCallback((position, componentType) => {
    const topPercent = parseFloat(position.top) || 0;
    const leftPercent = parseFloat(position.left) || 0;
    
    // Verificar si la posición está fuera del área visible (0-100%)
    // También considerar un margen para evitar componentes muy pegados al borde
    const margin = 0; // Sin margen - permitir hasta 100%
    const isOutOfBounds = topPercent < 0 || topPercent > (100 - margin) || 
                         leftPercent < 0 || leftPercent > (100 - margin);
    
    if (isOutOfBounds) {
      
      // Centrar el componente con variación para evitar solapamientos
      const randomOffset = Math.random() * 10 - 5; // Entre -5% y +5%
      return {
        top: `${45 + randomOffset}%`, // Centro con variación
        left: `${45 + randomOffset}%`  // Centro con variación
      };
    }
    
    return position;
  }, []);

  // Función para calcular posición automática de botones obligatorios
  const calculateAutoPosition = (actionType, existingComponents) => {
    const buttonPositions = {
      'reject_all': { left: '10%', top: '80%' },    // Izquierda
      'show_preferences': { left: '45%', top: '80%' }, // Centro
      'accept_all': { left: '80%', top: '80%' }     // Derecha
    };
    
    return buttonPositions[actionType] || { left: '50%', top: '50%' };
  };

  // NUEVA FUNCIÓN: Validar límites de componente dentro de su contenedor padre
  const validateComponentBounds = useCallback((componentId, newPosition, newSize = {}) => {
    // Buscar el componente y su contenedor padre
    const findComponentWithParent = (components, targetId, currentParentId = null) => {
      for (const comp of components) {
        if (comp.id === targetId) {
          return { component: comp, parentId: currentParentId };
        }
        if (comp.children && comp.children.length > 0) {
          const found = findComponentWithParent(comp.children, targetId, comp.id);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findComponentWithParent(bannerConfig.components, componentId);
    if (!result) return { isValid: true, adjustedPosition: newPosition, adjustedSize: newSize };

    const { component, parentId } = result;

    // Si no tiene padre (es componente raíz), solo validar contra los límites del banner
    if (!parentId) {
      return { isValid: true, adjustedPosition: newPosition, adjustedSize: newSize };
    }

    // Buscar el contenedor padre completo (incluyendo hijos)
    const findParentContainer = (components, targetId) => {
      for (const comp of components) {
        if (comp.id === targetId) return comp;
        if (comp.children && comp.children.length > 0) {
          const found = findParentContainer(comp.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const parentContainer = findParentContainer(bannerConfig.components, parentId);
    if (!parentContainer || parentContainer.type !== 'container') {
      return { isValid: true, adjustedPosition: newPosition, adjustedSize: newSize };
    }

    // Usar las nuevas funciones de validación del containerBoundsValidator
    const currentStyle = component.style?.[deviceView] || {};
    const currentPosition = component.position?.[deviceView] || {};
    
    // Combinar las propiedades actuales con las nuevas
    const fullComponent = {
      ...component,
      style: {
        ...component.style,
        [deviceView]: {
          ...currentStyle,
          ...(newSize.width !== undefined && { width: newSize.width }),
          ...(newSize.height !== undefined && { height: newSize.height })
        }
      },
      position: {
        ...component.position,
        [deviceView]: {
          ...currentPosition,
          ...(newPosition.left !== undefined && { left: newPosition.left }),
          ...(newPosition.top !== undefined && { top: newPosition.top })
        }
      }
    };

    // Validar tamaño
    const validatedSize = validateChildSize(fullComponent, parentContainer, deviceView);
    
    // Validar posición
    const validatedPosition = validateChildPosition(fullComponent, parentContainer, deviceView);

    // Devolver los valores ajustados
    return {
      isValid: true,
      adjustedPosition: {
        left: validatedPosition.left !== undefined ? `${validatedPosition.left}%` : newPosition.left,
        top: validatedPosition.top !== undefined ? `${validatedPosition.top}%` : newPosition.top
      },
      adjustedSize: {
        width: validatedSize.width !== undefined ? `${validatedSize.width}%` : newSize.width,
        height: validatedSize.height !== undefined ? `${validatedSize.height}%` : newSize.height
      }
    };
  }, [bannerConfig.components, deviceView]);

  // Agregar un nuevo componente con soporte para datos iniciales
  // Función para crear presets de componentes
  const createPreset = useCallback(async (presetType, position, clientInfo = null) => {
    console.log('🎨 createPreset called:', { presetType, position, clientInfo });
    console.log('🎨 DEBUG - bannerConfig en createPreset:', bannerConfig);
    
    if (presetType === 'texto-legal') {
      // Crear un contenedor con 4 textos para información legal
      const containerId = `container-${Date.now()}`;
      
      // Posición del contenedor (centrado por defecto)
      const containerPosition = position || { top: '10%', left: '10%' };
      
      // Obtener razón social del cliente propietario del banner
      let companyName = '{razonSocial}'; // Variable template que se reemplazará
      
      try {
        // MÉTODO 1: Usar clientId pasado como parámetro (más específico)
        let targetClientId = clientInfo?.clientId;
        
        // MÉTODO 2: Intentar obtener clientId del bannerConfig (para banners existentes)
        if (!targetClientId) {
          targetClientId = bannerConfig?.clientId;
        }
        
        // MÉTODO 3: Si no hay clientId en bannerConfig, usar el del usuario autenticado 
        // (para banners nuevos que se están creando por primera vez)
        if (!targetClientId) {
          const authUser = JSON.parse(localStorage.getItem('user') || '{}');
          targetClientId = authUser.clientId;
          console.log('📝 Banner nuevo: usando clientId del usuario autenticado:', targetClientId);
          console.log('👤 Datos del usuario autenticado:', {
            role: authUser.role,
            clientId: authUser.clientId,
            name: authUser.name,
            email: authUser.email
          });
        } else {
          console.log('📋 Banner existente: usando clientId específico:', targetClientId);
        }
        
        if (targetClientId) {
          console.log('🔍 Intentando obtener datos del cliente con ID:', targetClientId);
          
          // SOLUCIÓN: Usar la nueva API de sesión que incluye información del cliente
          const authUser = JSON.parse(localStorage.getItem('user') || '{}');
          
          // MÉTODO 1: Usar información del cliente guardada en el estado (la más rápida)
          if (clientInfo && clientInfo.fiscalInfo?.razonSocial) {
            companyName = clientInfo.fiscalInfo.razonSocial;
            console.log('✅ Nombre empresa desde clientInfo guardado:', companyName);
          }
          
          // MÉTODO 2: Si no tenemos la info guardada, obtenerla de la API de sesión
          if (!companyName || companyName === '{razonSocial}') {
            try {
              const { getSessionInfo } = await import('../../../../api/auth');
              const sessionData = await getSessionInfo();
              const sessionUser = sessionData.data.user;
              
              if (sessionUser.clientInfo?.fiscalInfo?.razonSocial) {
                companyName = sessionUser.clientInfo.fiscalInfo.razonSocial;
                console.log('✅ Nombre empresa desde API de sesión:', companyName);
                
                // Guardar la información para uso futuro
                setClientInfo(sessionUser.clientInfo);
              } else if (sessionUser.clientInfo?.company) {
                companyName = sessionUser.clientInfo.company;
                console.log('✅ Nombre empresa (company) desde API de sesión:', companyName);
              } else if (sessionUser.clientInfo?.name) {
                companyName = sessionUser.clientInfo.name;
                console.log('✅ Nombre empresa (name) desde API de sesión:', companyName);
              }
            } catch (error) {
              console.warn('⚠️ Error obteniendo información de sesión:', error);
            }
          }
          
          // MÉTODO 3 (FALLBACK): Para owners, usar la API de clientes directamente
          if ((!companyName || companyName === '{razonSocial}') && authUser.role === 'owner') {
            try {
              const { getClient } = await import('../../../../api/client');
              const clientData = await getClient(targetClientId);
              
              companyName = clientData.fiscalInfo?.razonSocial || 
                           clientData.company || 
                           clientData.name || 
                           '{razonSocial}';
              console.log('✅ Nombre empresa desde API de cliente (owner):', companyName);
            } catch (error) {
              console.warn('⚠️ Error al obtener cliente (owner):', error);
            }
          }
          
          // MÉTODO 4 (ÚLTIMO RECURSO): Usar nombre del usuario
          if (!companyName || companyName === '{razonSocial}') {
            companyName = authUser.name || 'Empresa';
            console.log('✅ Usando nombre del usuario como empresa (último recurso):', companyName);
          }
          
          console.log('🏢 Información del cliente obtenida:', {
            sourceMethod: clientInfo?.clientId ? 'clientInfo.clientId' : 
                         bannerConfig?.clientId ? 'bannerConfig.clientId' : 'authUser.clientId',
            clientId: targetClientId,
            userRole: authUser.role,
            companyNameUsed: companyName
          });
          console.log('✅ COMPANY NAME FINAL PARA TEXTO 4:', companyName);
        } else {
          console.warn('⚠️ No se encontró clientId en bannerConfig ni en usuario autenticado');
        }
      } catch (error) {
        console.error('❌ ERROR COMPLETO al obtener cliente:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error response:', error.response);
        console.error('❌ Error response data:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        console.warn('⚠️ No se pudo obtener información del cliente, usando valor por defecto:', error.message);
      }
      
      // Crear el contenedor padre con flexbox
      const containerComponent = {
        id: containerId,
        type: 'container',
        content: '',
        style: {
          desktop: { 
            backgroundColor: 'transparent',
            border: 'none',
            width: '100%',
            height: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          },
          tablet: { 
            backgroundColor: 'transparent',
            border: 'none',
            width: '100%',
            height: '100%',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          },
          mobile: { 
            backgroundColor: 'transparent',
            border: 'none',
            width: '100%',
            height: '100%',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }
        },
        position: {
          desktop: { ...containerPosition },
          tablet: { ...containerPosition },
          mobile: { ...containerPosition }
        },
        children: [
          // Texto 1 - Título: Información de cookies
          {
            id: `text-${Date.now()}-1`,
            type: 'text',
            content: 'Información de cookies',
            parentId: containerId,
            style: {
              desktop: { 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#212529',
                width: '100%',
                height: '10%',
                margin: '0',
                textAlign: 'center'
              },
              tablet: { 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#212529',
                width: '100%',
                height: '10%',
                margin: '0',
                textAlign: 'center'
              },
              mobile: { 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: '#212529',
                width: '100%',
                height: '10%',
                margin: '0',
                textAlign: 'center'
              }
            },
            position: {
              desktop: { top: '0%', left: '0%' },
              tablet: { top: '0%', left: '0%' },
              mobile: { top: '0%', left: '0%' }
            }
          },
          // Texto 2 - Descripción general
          {
            id: `text-${Date.now()}-2`,
            type: 'text',
            content: 'Utilizamos cookies propias y de terceros para analizar nuestros servicios y mostrarte publicidad relacionada con tus preferencias en base a un perfil elaborado a partir de tus hábitos de navegación (por ejemplo, páginas visitadas).',
            parentId: containerId,
            style: {
              desktop: { 
                fontSize: '14px', 
                color: '#495057', 
                lineHeight: '1.5',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              tablet: { 
                fontSize: '13px', 
                color: '#495057', 
                lineHeight: '1.4',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              mobile: { 
                fontSize: '12px', 
                color: '#495057', 
                lineHeight: '1.3',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              }
            },
            position: {
              desktop: { top: '15%', left: '0%' },
              tablet: { top: '15%', left: '0%' },
              mobile: { top: '15%', left: '0%' }
            }
          },
          // Texto 3 - Opciones de configuración
          {
            id: `text-${Date.now()}-3`,
            type: 'text',
            content: 'Puedes aceptar todas las cookies pulsando el botón "Aceptar todas" o rechazarlas en el botón "Rechazar todas", y configurarlas en todo momento desde el "panel de configuración", donde encontrarás una explicación y descripción de cada tipo de cookie. En todo momento aceptas las "cookies técnicas/necesarias" para el buen funcionamiento de la web.',
            parentId: containerId,
            style: {
              desktop: { 
                fontSize: '14px', 
                color: '#495057', 
                lineHeight: '1.5',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              tablet: { 
                fontSize: '13px', 
                color: '#495057', 
                lineHeight: '1.4',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              mobile: { 
                fontSize: '12px', 
                color: '#495057', 
                lineHeight: '1.3',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              }
            },
            position: {
              desktop: { top: '40%', left: '0%' },
              tablet: { top: '40%', left: '0%' },
              mobile: { top: '40%', left: '0%' }
            }
          },
          // Texto 4 - Definición de cookies con razón social dinámica
          (() => {
            const texto4Content = `Una cookie es un pequeño archivo de información que se guarda en tu ordenador, smartphone o tableta cada vez que visitas nuestra página web. Algunas pueden ser nuestras de {razonSocial}, y otras pertenecen a empresas externas que prestan servicios para nuestra página web.`;
            console.log('📝 CREANDO TEXTO 4 CON CONTENIDO:', texto4Content);
            console.log('📝 COMPANY NAME USADO EN TEXTO 4:', companyName);
            
            return {
              id: `text-${Date.now()}-4`,
              type: 'text',
              content: texto4Content,
              parentId: containerId,
            style: {
              desktop: { 
                fontSize: '14px', 
                color: '#495057', 
                lineHeight: '1.5',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              tablet: { 
                fontSize: '13px', 
                color: '#495057', 
                lineHeight: '1.4',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              },
              mobile: { 
                fontSize: '12px', 
                color: '#495057', 
                lineHeight: '1.3',
                width: '100%',
                height: '20%',
                margin: '0',
                textAlign: 'justify'
              }
            },
            position: {
              desktop: { top: '65%', left: '0%' },
              tablet: { top: '65%', left: '0%' },
              mobile: { top: '65%', left: '0%' }
            }
            };
          })()
        ],
        containerConfig: {
          desktop: {
            displayMode: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '10px'
          },
          tablet: {
            displayMode: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '8px'
          },
          mobile: {
            displayMode: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '6px'
          }
        }
      };
      
      // Agregar el contenedor con todos sus hijos al banner
      console.log('💾 AGREGANDO CONTENEDOR AL BANNER:', containerComponent);
      console.log('💾 TEXTO 4 CONTENT EN CONTENEDOR:', containerComponent.children[3]?.content);
      
      setBannerConfig(prev => {
        const newConfig = {
          ...prev,
          components: [...prev.components, containerComponent]
        };
        console.log('💾 NUEVO BANNER CONFIG:', newConfig);
        return newConfig;
      });
      
      console.log('✅ PRESET TEXTO LEGAL CREADO CON ID:', containerId);
      return containerId;
    }
    
    return null;
  }, [bannerConfig, clientInfo]);

  const addComponent = useCallback(async (componentType, position, initialData = {}) => {
    console.log('🆕 useBannerEditor: addComponent called', {
      componentType,
      position,
      initialData,
      timestamp: Date.now()
    });
    
    // Verificar si es un preset
    if (componentType.startsWith('preset-')) {
      // Obtener información del cliente actual (si está disponible)
      // Priorizar clientId de initialData, luego de bannerConfig, luego de clientInfo
      const clientInfo = {
        clientId: initialData?.clientId || bannerConfig?.clientId || bannerConfig?.clientInfo?.clientId,
        ...bannerConfig?.clientInfo,
        ...initialData?.clientInfo
      };
      
      console.log('🎯 PRESET DETECTADO:', {
        componentType,
        presetType: componentType.replace('preset-', ''),
        position,
        clientInfo,
        bannerConfigClientId: bannerConfig?.clientId,
        initialDataClientId: initialData?.clientId
      });
      
      return await createPreset(componentType.replace('preset-', ''), position, clientInfo);
    }
    
    // Verificación de parámetros
    if (!componentType) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ addComponent: componentType is required!');
      }
      return null;
    }
    
    const finalComponentType = componentType;
    
    // Crear un ID único para el nuevo componente (o usar el predefinido para botones obligatorios)
    const newId = initialData.id || `comp-${Date.now()}`;
    
    // Estilos predeterminados para el nuevo componente
    const newStyles = getDefaultStylesForNewComponent(finalComponentType, initialData.action?.type);
    
    // Determiner si el componente debe estar bloqueado (botones obligatorios)
    const shouldBeLocked = finalComponentType === 'button' && initialData.action && 
      ['accept_all', 'reject_all', 'show_preferences'].includes(initialData.action.type);
    
    
    console.log('TIPO RECIBIDO:', componentType, 'TIPO FINAL:', finalComponentType);
    // Para botones obligatorios, usar posición automática si no se especifica una posición precisa
    let finalPosition = position;
    if (shouldBeLocked && initialData.action) {
      const autoPos = calculateAutoPosition(initialData.action.type, []);
      finalPosition = {
        top: autoPos.top,
        left: autoPos.left
      };
    } else if (!finalPosition || (finalPosition.top === undefined && finalPosition.left === undefined)) {
      // Si no hay posición definida en absoluto, usar posición por defecto con ligera variación
      const randomOffset = Math.random() * 20 + 10; // Entre 10% y 30%
      finalPosition = {
        top: `${randomOffset}%`,
        left: `${randomOffset}%`
      };
    } else {
      // Si se pasó una posición, usarla tal cual
    }
    
    // Asegurar que la posición esté en porcentajes
    const posWithPercentage = {
      top: ensurePercentage(finalPosition?.top),
      left: ensurePercentage(finalPosition?.left)
    };
    
    // Si ensurePercentage devuelve undefined, usar la posición final directamente
    if (posWithPercentage.top === undefined) {
      posWithPercentage.top = finalPosition?.top || '10%';
    }
    if (posWithPercentage.left === undefined) {
      posWithPercentage.left = finalPosition?.left || '10%';
    }
    
    
    // Validar y centrar posición si está fuera del canvas (excepto para botones obligatorios)
    const validatedPosition = shouldBeLocked ? posWithPercentage : validateAndCenterPosition(posWithPercentage, finalComponentType);
    
    // Determinar el contenido inicial (puede venir preestablecido)
    let initialContent = initialData.content;
    
    // Si no hay contenido inicial, usar el contenido predeterminado para el tipo
    if (initialContent === undefined) {
      initialContent = getDefaultContent(finalComponentType, initialData.action?.type);
    }
    
    // Aplicar estilos específicos para botones obligatorios
    if (shouldBeLocked && initialData.style) {
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (!newStyles[device]) newStyles[device] = {};
        Object.assign(newStyles[device], initialData.style);
      });
    }
    
    // Crear el nuevo componente
    const newComponent = {
      id: newId,
      type: finalComponentType,
      content: initialContent,
      style: JSON.parse(JSON.stringify(newStyles)), // Copia profunda para evitar referencias compartidas
      locked: shouldBeLocked,
      position: {
        desktop: { ...validatedPosition },
        tablet: { ...validatedPosition },
        mobile: { ...validatedPosition }
      },
      // Preservar action si existe
      ...(initialData.action && { action: initialData.action }),
      // NUEVO: Configuración inicial para contenedores
      ...(finalComponentType === 'container' && {
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
            justifyItems: 'flex-start',
            alignItems: 'flex-start'
          },
          tablet: {
            displayMode: 'libre',
            gap: '8px',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'auto',
            justifyItems: 'flex-start',
            alignItems: 'flex-start'
          },
          mobile: {
            displayMode: 'libre',
            gap: '6px',
            flexDirection: 'column', // En mobile por defecto columna
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            gridTemplateColumns: '1fr', // En mobile una sola columna
            gridTemplateRows: 'auto',
            justifyItems: 'flex-start',
            alignItems: 'flex-start'
          }
        }
      }),
      // Añadir cualquier propiedad adicional del initialData (incluyendo action)
      ...Object.fromEntries(
        Object.entries(initialData).filter(([key]) => key !== 'content' && key !== 'position')
      )
    };
    
    
    setBannerConfig(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
    
    setSelectedComponent(newComponent);
    
    // Verificar la posición después de agregar
    setTimeout(() => {
      setBannerConfig(prevConfig => {
        const addedComponent = prevConfig.components.find(c => c.id === newId);
        return prevConfig; // No modificar, solo leer
      });
    }, 100);
    
    return newId; // Retornar el ID para uso futuro
  }, [ensurePercentage, getDefaultContent, getDefaultStylesForNewComponent, bannerConfig]);

  // Función para validar que existen todos los botones obligatorios
  const validateRequiredButtons = useCallback(() => {
    const requiredActions = ['accept_all', 'reject_all', 'show_preferences'];
    const existingActions = new Set();
    
    // Buscar en componentes principales
    bannerConfig.components?.forEach(component => {
      if (component.type === 'button' && component.action?.type) {
        existingActions.add(component.action.type);
      }
      
      // Buscar también en hijos de contenedores
      if (component.children && component.children.length > 0) {
        component.children.forEach(child => {
          if (child.type === 'button' && child.action?.type) {
            existingActions.add(child.action.type);
          }
        });
      }
    });
    
    const missingActions = requiredActions.filter(action => !existingActions.has(action));
    
    return {
      isValid: missingActions.length === 0,
      missingActions,
      existingActions: Array.from(existingActions)
    };
  }, [bannerConfig.components]);

  // Función para obtener nombres legibles de las acciones
  const getActionDisplayName = (actionType) => {
    const names = {
      'accept_all': 'Aceptar Todo',
      'reject_all': 'Rechazar Todo',
      'show_preferences': 'Preferencias'
    };
    return names[actionType] || actionType;
  };

  // Eliminar un componente
  const deleteComponent = useCallback((componentId) => {
    setBannerConfig(prev => {
      const componentToDelete = prev.components.find(comp => comp.id === componentId);
      
      // Si el componente no existe, no hacer nada
      if (!componentToDelete) return prev;
      
      // Verificar si es un componente esencial que no se puede eliminar
      const isEssentialComponent = componentToDelete.locked && 
        componentToDelete.action && 
        ['accept_all', 'reject_all', 'show_preferences'].includes(componentToDelete.action.type);
      
      
      if (isEssentialComponent) {
        return prev;
      }
      
      // Si es un contenedor que se va a eliminar, extraer componentes obligatorios
      let newComponents = [...prev.components];
      let extractedComponents = [];
      
      if (componentToDelete.type === 'container' && componentToDelete.children) {
        // Buscar componentes obligatorios en los hijos
        const essentialChildren = componentToDelete.children.filter(child => 
          child.locked && child.action && 
          ['accept_all', 'reject_all', 'show_preferences'].includes(child.action.type)
        );
        
        if (essentialChildren.length > 0) {
          
          // Convertir hijos obligatorios en componentes principales con posiciones calculadas
          extractedComponents = essentialChildren.map((child, index) => {
            // Calcular posiciones escalonadas para cada componente extraído
            const offsetX = 10 + (index * 5); // Incremento horizontal para cada componente
            const offsetY = 10 + (index * 5); // Incremento vertical para cada componente
            
            
            return {
              ...child,
              // Posición calculada para el canvas cuando se extraen
              position: {
                desktop: { 
                  top: `${offsetY}%`, 
                  left: `${offsetX}%`,
                  percentX: offsetX,
                  percentY: offsetY
                },
                tablet: { 
                  top: `${offsetY}%`, 
                  left: `${offsetX}%`,
                  percentX: offsetX,
                  percentY: offsetY
                },
                mobile: { 
                  top: `${offsetY}%`, 
                  left: `${offsetX}%`,
                  percentX: offsetX,
                  percentY: offsetY
                }
              }
            };
          });
          
          // Agregar los componentes extraídos a la lista principal
          newComponents = [...newComponents, ...extractedComponents];
        }
      }
      
      // Eliminar el componente original
      newComponents = newComponents.filter(comp => comp.id !== componentId);
      
      return {
        ...prev,
        components: newComponents
      };
    });
    
    setSelectedComponent(prev => prev?.id === componentId ? null : prev);
  }, []);

  // Actualizar contenido - optimizado para evitar renders innecesarios
  const updateComponentContent = useCallback((componentId, content) => {
    console.log(`📝 updateComponentContent llamado para ${componentId}:`, content);
    
    // DEBUG: Log detallado para rastrear el problema de imágenes
    if (typeof content === 'string' && content.startsWith('__IMAGE_REF__')) {
      console.log(`🖼️ DEBUG: Actualizando imagen con referencia: ${content}`);
      console.log(`🖼️ DEBUG: Estado actual de window._imageFiles:`, window._imageFiles);
      if (window._imageFiles && window._imageFiles[content]) {
        console.log(`✅ DEBUG: Archivo encontrado en window._imageFiles:`, window._imageFiles[content]);
      } else {
        console.log(`❌ DEBUG: Archivo NO encontrado en window._imageFiles para ${content}`);
      }
    }
    
    setBannerConfig(prev => {
      // Función recursiva para actualizar componente en cualquier nivel
      const updateComponentRecursively = (components) => {
        return components.map(comp => {
          if (comp.id === componentId) {
            // Componente encontrado - actualizar contenido
            const updatedComp = { ...comp };
            
            // Actualizar el contenido basado en su tipo actual
            if (typeof content === 'string') {
              // Si recibimos un string pero el contenido actual es un objeto, actualizar texts.en
              if (typeof updatedComp.content === 'object' && updatedComp.content.texts) {
                updatedComp.content = {
                  ...updatedComp.content,
                  texts: {
                    ...updatedComp.content.texts,
                    en: content
                  }
                };
                
                // Si también tiene propiedad text (para compatibilidad), actualizarla
                if ('text' in updatedComp.content) {
                  updatedComp.content.text = content;
                }
              } else {
                // Si el contenido actual no es un objeto, reemplazar directamente
                updatedComp.content = content;
                
                // IMPORTANTE: Si es una imagen con referencia temporal, buscar y preservar el archivo
                if (updatedComp.type === 'image' && content.startsWith('__IMAGE_REF__')) {
                  console.log(`🔍 DEBUG: Procesando imagen en componente ${componentId}`);
                  
                  // Buscar el archivo en el almacenamiento global
                  if (window._imageFiles && window._imageFiles[content]) {
                    updatedComp._tempFile = window._imageFiles[content];
                    updatedComp._imageFile = window._imageFiles[content];
                    console.log(`✅ DEBUG: Archivo asignado al componente desde window._imageFiles`);
                  }
                  
                  // También buscar en el gestor de memoria de imágenes
                  if (imageMemoryManager && typeof imageMemoryManager.getTempFile === 'function') {
                    const fileData = imageMemoryManager.getTempFile(content);
                    if (fileData && fileData.file) {
                      updatedComp._tempFile = fileData.file;
                      updatedComp._imageFile = fileData.file;
                      console.log(`✅ DEBUG: Archivo asignado al componente desde imageMemoryManager`);
                    }
                  }
                  
                  // Log final del estado del componente
                  console.log(`📊 DEBUG: Estado final del componente imagen:`, {
                    id: updatedComp.id,
                    content: updatedComp.content,
                    hasImageFile: !!updatedComp._imageFile,
                    hasTempFile: !!updatedComp._tempFile
                  });
                }
              }
            } else if (typeof content === 'object') {
              // Si recibimos un objeto, reemplazar directamente
              updatedComp.content = content;
            }
            
            return updatedComp;
          }
          
          // Si es un contenedor, buscar recursivamente en sus hijos
          if (comp.type === 'container' && comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: updateComponentRecursively(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      const updatedComponents = updateComponentRecursively(prev.components);
      
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
    
    // Verificar que file es un objeto File válido
    if (!(file instanceof File || file instanceof Blob)) {
      console.error("⚠️ El archivo no es válido:", file);
      return;
    }
    
    // IMPORTANTE: Guardar en el almacenamiento global
    window._imageFiles = window._imageFiles || {};
    window._imageFiles[imageRef] = file;
    
    setBannerConfig(prev => {
      // Función recursiva para buscar y actualizar el componente en cualquier nivel
      const updateComponentRecursively = (components) => {
        return components.map(comp => {
          // Si es el componente que buscamos, actualizarlo
          if (comp.id === componentId) {
            const updatedComp = { ...comp };
            
            // Actualizar el contenido con la referencia temporal
            updatedComp.content = imageRef;
            
            // Adjuntar el archivo para usarlo al enviar el formulario
            updatedComp._imageFile = file;
            updatedComp._tempFile = file;
            
            // Asegurar que también está disponible en estilos si los componentes buscan ahí
            if (updatedComp.style) {
              const updatedStyle = {};
              
              // Copiar los estilos para todos los dispositivos
              Object.keys(updatedComp.style).forEach(device => {
                updatedStyle[device] = {
                  ...updatedComp.style[device],
                  // Solo añadir referencias de archivo a desktop
                  ...(device === 'desktop' ? {
                    _tempFile: file,
                    _previewUrl: URL.createObjectURL(file)
                  } : {})
                };
              });
              
              updatedComp.style = updatedStyle;
            }
            
            return updatedComp;
          }
          
          // Si es un contenedor, buscar recursivamente en sus hijos
          if (comp.children && Array.isArray(comp.children)) {
            const updatedChildren = updateComponentRecursively(comp.children);
            // Solo crear una nueva instancia si realmente hubo cambios en los hijos
            if (updatedChildren !== comp.children) {
              return {
                ...comp,
                children: updatedChildren
              };
            }
          }
          
          return comp;
        });
      };
      
      // Aplicar actualización recursiva
      const updatedComponents = updateComponentRecursively(prev.components);
      
      // Verificar si realmente hubo cambios
      if (updatedComponents === prev.components) {
        console.warn(`⚠️ No se encontró componente ${componentId} para actualizar imagen`);
        return prev;
      }
      
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
  const addChildToContainer = useCallback((parentId, childComponentOrType, position = null) => {
    
    try {
      // Si es un string, crear el componente completo
      let childComponent;
      if (typeof childComponentOrType === 'string') {
        const componentType = childComponentOrType;
        childComponent = {
          id: `${componentType}_${Date.now()}_${Math.floor(Math.random() * 10000)}`, // ID único más robusto
          type: componentType,
          content: getDefaultContent(componentType),
          style: getDefaultStylesForNewComponent(componentType),
          locked: false,
          ...(position && {
            position: {
              [deviceView]: position,
              desktop: position,
              tablet: position,
              mobile: position
            }
          })
        };
      } else {
        // Es un objeto completo (puede incluir datos de botones obligatorios)
        childComponent = {
          // Asegurar que el componente tenga un ID único
          id: childComponentOrType.id || `${childComponentOrType.type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          type: childComponentOrType.type,
          content: childComponentOrType.content || getDefaultContent(childComponentOrType.type, childComponentOrType.action?.type),
          style: childComponentOrType.style || getDefaultStylesForNewComponent(childComponentOrType.type, childComponentOrType.action?.type),
          locked: childComponentOrType.locked || false,
          ...(childComponentOrType.action && { action: childComponentOrType.action }),
          ...(position && {
            position: {
              [deviceView]: position,
              desktop: position,
              tablet: position,
              mobile: position
            }
          })
        };
      }
      
      // Verificar que tenemos los datos mínimos necesarios
      if (!childComponent.type) {
        console.error('❌ ERROR: Intento de agregar componente hijo sin tipo');
        return;
      }
      
    
    
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
            
            // Para imágenes en contenedores, establecer tamaño inicial basado en aspect ratio
            if (newChild.type === 'image') {
              // Calcular tamaño inicial para mantener aspect ratio - usar tamaño más pequeño por defecto
              const initialWidth = 150; // Ancho inicial más pequeño en píxeles
              const defaultAspectRatio = 1.33; // 4:3 por defecto
              
              // Si ya tenemos aspect ratio de la imagen, usarlo
              let aspectRatio = defaultAspectRatio;
              if (newChild.content && typeof newChild.content === 'string') {
                // Intentar obtener aspect ratio del caché si existe
                const cachedRatio = imageAspectRatioCache.get(newChild.content);
                if (cachedRatio) {
                  aspectRatio = cachedRatio;
                }
              }
              
              const initialHeight = Math.round(initialWidth / aspectRatio);
              
              // Aplicar dimensiones iniciales a todos los dispositivos
              // Usar la misma lógica que las imágenes independientes
              ['desktop', 'tablet', 'mobile'].forEach(device => {
                newChild.style[device] = {
                  ...newChild.style[device],
                  width: `${initialWidth}px`,
                  height: `${initialHeight}px`,
                  objectFit: 'contain'
                };
              });
              
            }
            
            updatedParent.children = [...updatedParent.children, newChild];
            
            
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
      
      // 🔄 ACTUALIZAR selectedComponent para reflejar los cambios inmediatamente
      // Forzar una re-selección del contenedor para que el panel se actualice
      setTimeout(() => {
        setBannerConfig(currentConfig => {
          // Buscar el contenedor actualizado
          const findUpdatedContainer = (components) => {
            for (const comp of components) {
              if (comp.id === parentId && comp.type === 'container') {
                return comp;
              }
              if (comp.children && comp.children.length > 0) {
                const found = findUpdatedContainer(comp.children);
                if (found) return found;
              }
            }
            return null;
          };
          
          const updatedContainer = findUpdatedContainer(currentConfig.components);
          if (updatedContainer) {
            setSelectedComponent(updatedContainer);
          }
          
          return currentConfig; // No modificar la configuración
        });
      }, 0);
    } catch (error) {
      console.error('❌ ERROR al agregar componente hijo:', error);
    }
  }, []);

  // 🎯 NUEVA FUNCIÓN: Adjuntar componente a contenedor de forma simple
  const attachToContainer = useCallback((componentId, containerId, position) => {
    // 🛡️ VALIDACIÓN: Prevenir auto-contenimiento
    if (componentId === containerId) {
      return;
    }


    setBannerConfig(prev => {
      const newConfig = { ...prev };
      let componentToAttach = null;

      // 1. BUSCAR Y REMOVER el componente de su ubicación actual
      const removeFromComponents = (componentsList) => {
        return componentsList.filter(comp => {
          if (comp.id === componentId) {
            componentToAttach = { ...comp };
            return false; // Remover de la lista
          }
          // Si tiene hijos, buscar recursivamente
          if (comp.children && comp.children.length > 0) {
            comp.children = removeFromComponents(comp.children);
          }
          return true;
        });
      };

      // Remover de la lista principal de componentes
      newConfig.components = removeFromComponents(newConfig.components);

      if (!componentToAttach) {
        return prev;
      }

      // 2. AÑADIR al contenedor destino
      const addToContainer = (componentsList) => {
        return componentsList.map(comp => {
          if (comp.id === containerId) {
            // Calcular posición por defecto si no se proporciona
            let defaultPosition = position;
            if (!defaultPosition) {
              // Calcular posición basada en el número de hijos existentes
              const childrenCount = comp.children?.length || 0;
              const offsetX = (childrenCount * 15) % 60; // Escalonar horizontalmente
              const offsetY = Math.floor(childrenCount / 4) * 15; // Nueva fila cada 4 elementos
              
              defaultPosition = {
                top: `${10 + offsetY}%`,
                left: `${10 + offsetX}%`,
                percentX: 10 + offsetX,
                percentY: 10 + offsetY
              };
            }
            
            // Configurar el componente como hijo
            const childComponent = {
              ...componentToAttach,
              parentId: containerId,
              position: {
                ...componentToAttach.position,
                [deviceView]: defaultPosition
              }
            };

            return {
              ...comp,
              children: [...(comp.children || []), childComponent]
            };
          }
          // Buscar recursivamente en hijos
          if (comp.children && comp.children.length > 0) {
            comp.children = addToContainer(comp.children);
          }
          return comp;
        });
      };

      newConfig.components = addToContainer(newConfig.components);

      return newConfig;
    });
    
    // 🔄 ACTUALIZAR selectedComponent para reflejar los cambios inmediatamente
    setTimeout(() => {
      setBannerConfig(currentConfig => {
        // Buscar el contenedor actualizado
        const findUpdatedContainer = (components) => {
          for (const comp of components) {
            if (comp.id === containerId && comp.type === 'container') {
              return comp;
            }
            if (comp.children && comp.children.length > 0) {
              const found = findUpdatedContainer(comp.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const updatedContainer = findUpdatedContainer(currentConfig.components);
        if (updatedContainer) {
          setSelectedComponent(updatedContainer);
        }
        
        return currentConfig; // No modificar la configuración
      });
    }, 0);
  }, [deviceView]);

  // NUEVO: Mover componente existente a contenedor (LEGACY - mantener por compatibilidad)
  const moveComponentToContainer = useCallback((componentId, parentId, position) => {
    // 🛡️ VALIDACIÓN: Prevenir que un componente se mueva dentro de sí mismo
    if (componentId === parentId) {
      return;
    }
    
    // Usar la nueva función attachToContainer
    return attachToContainer(componentId, parentId, position);
  }, [attachToContainer]);

  // NUEVA FUNCIÓN: Sacar componente de contenedor y convertirlo en independiente
  const moveComponentOutOfContainer = useCallback((componentId, parentId) => {
    
    setBannerConfig(prev => {
      let componentToMove = null;
      
      // Función recursiva para buscar y remover el componente del contenedor
      const removeFromContainer = (components) => {
        return components.map(comp => {
          if (comp.id === parentId && comp.type === 'container' && comp.children) {
            // Encontramos el contenedor padre
            const childIndex = comp.children.findIndex(child => child.id === componentId);
            
            if (childIndex !== -1) {
              // Extraer el componente hijo
              componentToMove = { ...comp.children[childIndex] };
              
              // Remover el hijo del contenedor
              const updatedChildren = comp.children.filter(child => child.id !== componentId);
              
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
              children: removeFromContainer(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      // Remover del contenedor
      const updatedComponents = removeFromContainer(prev.components);
      
      if (!componentToMove) {
        console.warn(`Componente ${componentId} no encontrado en contenedor ${parentId}`);
        return prev;
      }
      
      // Calcular posición global aproximada
      const parentContainer = prev.components.find(comp => comp.id === parentId);
      const parentPos = parentContainer?.position?.[deviceView] || { top: '0%', left: '0%' };
      const childPos = componentToMove.position?.[deviceView] || { top: '10%', left: '10%' };
      
      // Convertir posiciones relativas a absolutas (aproximación)
      const parentLeft = parseFloat(parentPos.left) || 0;
      const parentTop = parseFloat(parentPos.top) || 0;
      const childLeft = parseFloat(childPos.left) || 0;
      const childTop = parseFloat(childPos.top) || 0;
      
      // Calcular posición global (sumar posiciones)
      const globalLeft = Math.max(0, Math.min(90, parentLeft + (childLeft * 0.3)));
      const globalTop = Math.max(0, Math.min(90, parentTop + (childTop * 0.3)));
      
      // Preparar el componente como independiente
      const independentComponent = {
        ...componentToMove,
        parentId: undefined, // Remover referencia al padre
        position: {
          ...componentToMove.position,
          [deviceView]: {
            top: `${globalTop}%`,
            left: `${globalLeft}%`,
            percentX: globalLeft,
            percentY: globalTop
          }
        }
      };
      
      // Agregar como componente independiente
      return {
        ...prev,
        components: [...updatedComponents, independentComponent]
      };
    });
    
    // Seleccionar el componente que se acaba de sacar del contenedor
    setTimeout(() => {
      setBannerConfig(currentConfig => {
        const extractedComponent = currentConfig.components.find(comp => comp.id === componentId);
        if (extractedComponent) {
          setSelectedComponent(extractedComponent);
        }
        return currentConfig;
      });
    }, 0);
  }, [deviceView]);

  // NUEVA FUNCIÓN: Validar si un componente puede ser movido a un contenedor
  const validateContainerMove = useCallback((sourceId, targetId) => {
    // Prevenir auto-contenimiento
    if (sourceId === targetId) {
      return { valid: false, reason: 'No se puede mover un componente dentro de sí mismo' };
    }

    // Buscar componentes
    const findComponent = (components, id) => {
      for (const comp of components) {
        if (comp.id === id) return comp;
        if (comp.children) {
          const found = findComponent(comp.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const sourceComponent = findComponent(bannerConfig.components, sourceId);
    const targetComponent = findComponent(bannerConfig.components, targetId);

    if (!sourceComponent) {
      return { valid: false, reason: 'Componente origen no encontrado' };
    }

    if (!targetComponent) {
      return { valid: false, reason: 'Contenedor destino no encontrado' };
    }

    if (targetComponent.type !== 'container') {
      return { valid: false, reason: 'El destino debe ser un contenedor' };
    }

    // Prevenir anidamiento circular: verificar si el target es hijo del source
    const isChildOfSource = (parentComp, childId) => {
      if (!parentComp.children) return false;
      return parentComp.children.some(child => 
        child.id === childId || isChildOfSource(child, childId)
      );
    };

    if (sourceComponent.type === 'container' && isChildOfSource(sourceComponent, targetId)) {
      return { valid: false, reason: 'No se puede crear anidamiento circular' };
    }

    // Verificar límites de anidamiento
    const getContainerDepth = (components, targetId, currentDepth = 0) => {
      for (const comp of components) {
        if (comp.id === targetId) {
          return currentDepth;
        }
        if (comp.children) {
          const depth = getContainerDepth(comp.children, targetId, currentDepth + 1);
          if (depth !== -1) return depth;
        }
      }
      return -1;
    };

    const targetDepth = getContainerDepth(bannerConfig.components, targetId);
    const maxDepth = 5; // Límite máximo de anidamiento

    if (targetDepth >= maxDepth - 1) {
      return { valid: false, reason: `Límite de anidamiento alcanzado (máximo ${maxDepth} niveles)` };
    }

    // Verificar límite de hijos
    const maxChildren = targetComponent.containerConfig?.desktop?.maxChildren || 50;
    const currentChildren = targetComponent.children?.length || 0;

    if (currentChildren >= maxChildren) {
      return { valid: false, reason: `El contenedor ha alcanzado su límite de ${maxChildren} hijos` };
    }

    return { valid: true };
  }, [bannerConfig.components]);

  // NUEVA FUNCIÓN: Reordenar componentes dentro de contenedores
  const reorderContainerChildren = useCallback((containerId, sourceIndex, targetIndex) => {
    
    setBannerConfig(prev => {
      const reorderChildren = (components) => {
        return components.map(comp => {
          if (comp.id === containerId && comp.type === 'container' && comp.children) {
            const children = [...comp.children];
            const [movedChild] = children.splice(sourceIndex, 1);
            children.splice(targetIndex, 0, movedChild);
            
            return {
              ...comp,
              children
            };
          }
          
          if (comp.children) {
            return {
              ...comp,
              children: reorderChildren(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      return {
        ...prev,
        components: reorderChildren(prev.components)
      };
    });
  }, []);

  const moveComponentToContainerOLD = useCallback((componentId, parentId, position) => {
    
    setBannerConfig(prev => {
      let componentToMove = null;
      
      // Función para buscar y remover el componente de su ubicación actual
      const removeComponent = (components) => {
        const filtered = [];
        for (const comp of components) {
          if (comp.id === componentId) {
            // Encontramos el componente a mover
            componentToMove = { ...comp };
          } else if (comp.children && comp.children.length > 0) {
            // Buscar recursivamente en hijos
            const updatedChildren = removeComponent(comp.children);
            filtered.push({
              ...comp,
              children: updatedChildren
            });
          } else {
            filtered.push(comp);
          }
        }
        return filtered;
      };
      
      // Función para agregar el componente al contenedor destino
      const addToContainer = (components) => {
        return components.map(comp => {
          if (comp.id === parentId && comp.type === 'container') {
            // Preparar el componente para ser hijo
            const childComponent = {
              ...componentToMove,
              parentId: parentId,
              position: {
                ...componentToMove.position,
                [deviceView]: position
              }
            };
            
            return {
              ...comp,
              children: [...(comp.children || []), childComponent]
            };
          } else if (comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: addToContainer(comp.children)
            };
          }
          return comp;
        });
      };
      
      if (!componentToMove) {
        console.warn(`Componente ${componentId} no encontrado`);
        return prev;
      }
      
      // Primero remover, luego agregar
      const componentsWithoutMoved = removeComponent(prev.components);
      const finalComponents = addToContainer(componentsWithoutMoved);
      
      return {
        ...prev,
        components: finalComponents
      };
    });
  }, [deviceView]);

  // NUEVO: Función para encontrar y actualizar un componente hijo
  const findAndUpdateChild = useCallback((componentId, updateFn) => {
    console.log(`🔍 FIND_UPDATE: Buscando componente hijo ${componentId}`);
    
    setBannerConfig(prev => {
      let componentFound = false;
      
      // Función recursiva para buscar y actualizar el hijo
      const updateComponents = (components) => {
        return components.map(comp => {
          // Si es el componente que buscamos, actualizarlo
          if (comp.id === componentId) {
            componentFound = true;
            const updatedComp = updateFn(comp);
            console.log(`✅ FIND_UPDATE: Componente ${componentId} actualizado:`, {
              before: comp.style,
              after: updatedComp.style
            });
            return updatedComp;
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
      
      const newComponents = updateComponents(prev.components);
      
      if (!componentFound) {
        console.warn(`⚠️ FIND_UPDATE: Componente ${componentId} no encontrado`);
        return prev;
      }
      
      console.log(`🔄 FIND_UPDATE: Estado del banner actualizado para ${componentId}`);
      
      return {
        ...prev,
        components: newComponents
      };
    });
  }, []);

  // FUNCIÓN MEJORADA: Desadjuntar componente de contenedor con mejor posicionamiento
  const unattachFromContainer = useCallback((componentId, containerId = null) => {
    
    setBannerConfig(prev => {
      let extractedComponent = null;
      let containerComponent = null;
      
      // Función para extraer el componente y agregarlo al nivel principal
      const extractAndMoveToRoot = (components) => {
        // Primero, buscar y extraer el componente
        const updatedComponents = components.map(comp => {
          if (comp.children && comp.children.length > 0) {
            // Si es el contenedor buscado (o buscamos en todos si containerId es null)
            if (!containerId || comp.id === containerId) {
              const childIndex = comp.children.findIndex(child => 
                child.id === componentId || 
                (typeof child === 'object' && child.id === componentId)
              );
              
              if (childIndex !== -1) {
                // Guardar referencias para cálculos posteriores
                containerComponent = { ...comp };
                
                // Extraer el componente - manejo tanto si es objeto completo como si es referencia
                const childItem = comp.children[childIndex];
                extractedComponent = typeof childItem === 'object' ? { ...childItem } : { id: childItem };
                
                // Calcular posición relativa para colocarlo en el canvas
                // Usar una posición más visible y centrada
                const randomOffsetX = Math.floor(Math.random() * 20) + 20; // Entre 20% y 40%
                const randomOffsetY = Math.floor(Math.random() * 20) + 20; // Entre 20% y 40%
                
                
                // Asignar posición para todos los dispositivos
                if (!extractedComponent.position) {
                  extractedComponent.position = {};
                }
                
                extractedComponent.position = {
                  desktop: { 
                    top: `${randomOffsetY}%`, 
                    left: `${randomOffsetX}%`,
                    percentX: randomOffsetX,
                    percentY: randomOffsetY
                  },
                  tablet: { 
                    top: `${randomOffsetY}%`, 
                    left: `${randomOffsetX}%`,
                    percentX: randomOffsetX,
                    percentY: randomOffsetY
                  },
                  mobile: { 
                    top: `${randomOffsetY}%`, 
                    left: `${randomOffsetX}%`,
                    percentX: randomOffsetX,
                    percentY: randomOffsetY
                  }
                };
                
                // Si el componente extraído no tiene dimensiones, asignarle valores por defecto
                if (!extractedComponent.style) {
                  extractedComponent.style = {};
                }
                
                if (!extractedComponent.style.desktop) {
                  extractedComponent.style.desktop = {};
                }
                
                if (!extractedComponent.style.desktop.width) {
                  // Asignar un ancho por defecto basado en el tipo de componente
                  if (extractedComponent.type === 'button') {
                    extractedComponent.style.desktop.width = '120px';
                  } else if (extractedComponent.type === 'text') {
                    extractedComponent.style.desktop.width = '200px';
                  } else {
                    extractedComponent.style.desktop.width = '150px';
                  }
                }
                
                if (!extractedComponent.style.desktop.height) {
                  // Asignar una altura por defecto basada en el tipo de componente
                  if (extractedComponent.type === 'button') {
                    extractedComponent.style.desktop.height = '40px';
                  } else if (extractedComponent.type === 'text') {
                    extractedComponent.style.desktop.height = 'auto';
                  } else {
                    extractedComponent.style.desktop.height = '40px';
                  }
                }
                
                // Obtener posición actual del componente y del contenedor
                const childPos = extractedComponent.position || {};
                const containerPos = containerComponent.position || {};
                
                // Función mejorada para calcular posición absoluta
                const calculateAbsolutePosition = (device) => {
                  // Obtener dimensiones del contenedor
                  const containerWidth = parseFloat(containerComponent.style?.[device]?.width || '300px');
                  const containerHeight = parseFloat(containerComponent.style?.[device]?.height || '200px');
                  const hasContainerWidth = !isNaN(containerWidth);
                  const hasContainerHeight = !isNaN(containerHeight);
                  
                  // Posición del contenedor (absoluta en el canvas)
                  const contTop = parseFloat(containerPos[device]?.top || '0%');
                  const contLeft = parseFloat(containerPos[device]?.left || '0%');
                  
                  // Posición del hijo (relativa al contenedor)
                  const childTop = parseFloat(childPos[device]?.top || '50%');
                  const childLeft = parseFloat(childPos[device]?.left || '50%');
                  
                  // Factor de escala para convertir % dentro del contenedor a % en el canvas
                  // Estimamos que el contenedor ocupa aproximadamente un 30% del ancho/alto del canvas
                  const widthFactor = hasContainerWidth ? containerWidth / 1000 : 0.3;
                  const heightFactor = hasContainerHeight ? containerHeight / 600 : 0.3;
                  
                  // Convertir a posición absoluta con factores de escala más precisos
                  const absoluteTop = Math.min(95, Math.max(5, contTop + (childTop * heightFactor)));
                  const absoluteLeft = Math.min(95, Math.max(5, contLeft + (childLeft * widthFactor)));
                  
                  return { 
                    top: `${absoluteTop}%`, 
                    left: `${absoluteLeft}%`,
                    percentX: absoluteLeft,
                    percentY: absoluteTop
                  };
                };
                
                // Calcular nuevas posiciones para todos los dispositivos
                extractedComponent.position = {
                  desktop: calculateAbsolutePosition('desktop'),
                  tablet: calculateAbsolutePosition('tablet'),
                  mobile: calculateAbsolutePosition('mobile')
                };
                
                
                // Eliminar referencia al padre
                delete extractedComponent.parentId;
                
                // Retornar el contenedor sin el hijo
                return {
                  ...comp,
                  children: comp.children.filter((child, idx) => idx !== childIndex)
                };
              }
            }
            
            // Buscar recursivamente en contenedores anidados
            return {
              ...comp,
              children: extractAndMoveToRoot(comp.children)
            };
          }
          return comp;
        });
        
        // Si se extrajo el componente, agregarlo al nivel principal
        if (extractedComponent) {
          return [...updatedComponents, extractedComponent];
        }
        
        return updatedComponents;
      };
      
      return {
        ...prev,
        components: extractAndMoveToRoot(prev.components)
      };
    });
    
    // Seleccionar el componente recién extraído
    setTimeout(() => {
      setSelectedComponent(prev => prev?.id === componentId ? prev : { id: componentId });
    }, 50);
  }, []);

  // NUEVO: Eliminar componente hijo
  const deleteChildComponent = useCallback((componentId) => {
    
    setBannerConfig(prev => {
      let componentToHandle = null;
      
      // Función para buscar el componente
      const findComponent = (components) => {
        for (const comp of components) {
          if (comp.children && comp.children.length > 0) {
            const child = comp.children.find(c => c.id === componentId);
            if (child) {
              componentToHandle = child;
              return true;
            }
            // Buscar recursivamente
            if (findComponent(comp.children)) return true;
          }
        }
        return false;
      };
      
      findComponent(prev.components);
      
      if (!componentToHandle) {
        return prev;
      }
      
      // Verificar si es un componente obligatorio
      const isEssentialComponent = componentToHandle.action && 
        ['accept_all', 'reject_all', 'show_preferences'].includes(componentToHandle.action.type);
      
      if (isEssentialComponent) {
        // Si es obligatorio, NO eliminarlo - esto no debería suceder porque el botón está oculto
        
        // ¡CAMBIO IMPORTANTE! En lugar de no hacer nada, llamamos directamente a unattachFromContainer
        // Esto asegura que los componentes obligatorios SIEMPRE sean extraídos, nunca eliminados
        
        // Encontrar el ID del contenedor padre
        let containerId = null;
        const findParentContainer = (components) => {
          for (const comp of components) {
            if (comp.type === 'container' && comp.children && comp.children.length > 0) {
              if (comp.children.some(child => 
                child.id === componentId || 
                (typeof child === 'object' && child.id === componentId)
              )) {
                containerId = comp.id;
                return true;
              }
              
              if (findParentContainer(comp.children)) {
                return true;
              }
            }
          }
          return false;
        };
        
        findParentContainer(prev.components);
        
        // Luego procesamos la extracción en el siguiente ciclo para evitar problemas de estado
        setTimeout(() => {
          unattachFromContainer(componentId, containerId);
        }, 0);
        
        // Mantenemos el estado actual por ahora
        return prev;
      } else {
        // Si no es obligatorio, eliminarlo normalmente
        
        // Función recursiva para buscar y eliminar el hijo
        const removeFromComponents = (components) => {
          return components.map(comp => {
            // Si tiene hijos, filtrar el que queremos eliminar
            if (comp.children && comp.children.length > 0) {
              const filteredChildren = comp.children.filter(child => child.id !== componentId);
              
              // Si se eliminó algún hijo, devolver componente actualizado
              if (filteredChildren.length !== comp.children.length) {
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
      }
    });
    
    // Si el componente eliminado era el seleccionado, deseleccionar
    setSelectedComponent(prev => prev?.id === componentId ? null : prev);
  }, []);

  // NUEVO: Remover hijo de contenedor (diferente a eliminar - lo hace independiente)
  const removeChildFromContainer = useCallback((childId, parentId) => {
    
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
    
    // 🔄 ACTUALIZAR selectedComponent para reflejar los cambios inmediatamente
    setTimeout(() => {
      setBannerConfig(currentConfig => {
        // Buscar el contenedor actualizado
        const findUpdatedContainer = (components) => {
          for (const comp of components) {
            if (comp.id === parentId && comp.type === 'container') {
              return comp;
            }
            if (comp.children && comp.children.length > 0) {
              const found = findUpdatedContainer(comp.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const updatedContainer = findUpdatedContainer(currentConfig.components);
        if (updatedContainer) {
          setSelectedComponent(updatedContainer);
        }
        
        return currentConfig; // No modificar la configuración
      });
    }, 0);
  }, []);

  // NUEVA FUNCIÓN: Actualizar componente hijo con una imagen y archivo temporal
  const updateChildImageWithFile = useCallback((componentId, imageRef, file) => {
    
    // Verificar que file es un objeto File válido
    if (!(file instanceof File || file instanceof Blob)) {
      console.error("⚠️ El archivo no es válido:", file);
      return;
    }
    
    // IMPORTANTE: Guardar en el almacenamiento global
    window._imageFiles = window._imageFiles || {};
    window._imageFiles[imageRef] = file;
    
    findAndUpdateChild(componentId, (component) => {
      // Crear una copia del componente hijo
      const updatedComponent = { ...component };
      
      // Actualizar el contenido con la referencia temporal
      updatedComponent.content = imageRef;
      
      // IMPORTANTE: Adjuntar el archivo para usarlo al enviar el formulario
      updatedComponent._imageFile = file;
      updatedComponent._tempFile = file;
      
      // Asegurar que también está disponible en estilos si los componentes buscan ahí
      if (!updatedComponent.style) {
        updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      }
      
      const updatedStyle = {};
      
      // Copiar los estilos para todos los dispositivos
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        updatedStyle[device] = {
          ...updatedComponent.style[device],
          // Añadir referencias de archivo a todos los dispositivos para mayor compatibilidad
          _tempFile: file,
          _imageFile: file
        };
        
        // Solo añadir preview URL a desktop para evitar memory leaks
        if (device === 'desktop') {
          updatedStyle[device]._previewUrl = URL.createObjectURL(file);
        }
      });
      
      updatedComponent.style = updatedStyle;
      
      // También guardar en el componente directamente para mayor seguridad
      updatedComponent._imageRef = imageRef;
      updatedComponent._fileName = file.name;
      updatedComponent._fileSize = file.size;
      updatedComponent._fileType = file.type;
      
      
      return updatedComponent;
    });
    
    // Actualizar también el componente seleccionado si es el mismo hijo
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

  // NUEVO: Actualizar contenido de componente hijo
  const updateChildContent = useCallback((componentId, content) => {
    console.log(`📝 CHILD: updateChildContent llamado para ${componentId}:`, content);
    console.log(`📝 CHILD: Tipo de contenido:`, typeof content);
    
    // DEBUG: Log detallado para rastrear el problema de imágenes
    if (typeof content === 'string' && content.startsWith('__IMAGE_REF__')) {
      console.log(`🖼️ CHILD DEBUG: Actualizando imagen con referencia: ${content}`);
      console.log(`🖼️ CHILD DEBUG: Estado actual de window._imageFiles:`, window._imageFiles);
      if (window._imageFiles && window._imageFiles[content]) {
        console.log(`✅ CHILD DEBUG: Archivo encontrado en window._imageFiles:`, window._imageFiles[content]);
      } else {
        console.log(`❌ CHILD DEBUG: Archivo NO encontrado en window._imageFiles para ${content}`);
      }
    }
    
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
          
          // IMPORTANTE: Si es una imagen con referencia temporal, buscar y preservar el archivo
          if (updatedComponent.type === 'image' && content.startsWith('__IMAGE_REF__')) {
            console.log(`🔍 CHILD DEBUG: Procesando imagen en componente hijo ${componentId}`);
            
            // Buscar el archivo en el almacenamiento global
            if (window._imageFiles && window._imageFiles[content]) {
              updatedComponent._tempFile = window._imageFiles[content];
              updatedComponent._imageFile = window._imageFiles[content];
              console.log(`✅ CHILD DEBUG: Archivo asignado al componente hijo desde window._imageFiles`);
            }
            
            // También buscar en el gestor de memoria de imágenes
            if (imageMemoryManager && typeof imageMemoryManager.getTempFile === 'function') {
              const fileData = imageMemoryManager.getTempFile(content);
              if (fileData && fileData.file) {
                updatedComponent._tempFile = fileData.file;
                updatedComponent._imageFile = fileData.file;
                console.log(`✅ CHILD DEBUG: Archivo asignado al componente hijo desde imageMemoryManager`);
              }
            }
            
            // Log final del estado del componente
            console.log(`📊 CHILD DEBUG: Estado final del componente imagen hijo:`, {
              id: updatedComponent.id,
              content: updatedComponent.content,
              hasImageFile: !!updatedComponent._imageFile,
              hasTempFile: !!updatedComponent._tempFile
            });
          }
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
    console.log(`📝 CHILD: updateChildStyleForDevice llamado para ${componentId}:`, {
      device,
      newStyle
    });
    
    // NUEVA VALIDACIÓN: Si se están actualizando dimensiones, verificar límites
    let finalStyle = { ...newStyle };
    if (newStyle.width || newStyle.height) {
      // Obtener la posición actual del componente para validación correcta
      const findCurrentComponent = (components, targetId) => {
        for (const comp of components) {
          if (comp.id === targetId) return comp;
          if (comp.children && comp.children.length > 0) {
            const found = findCurrentComponent(comp.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      const currentComponent = findCurrentComponent(bannerConfig.components, componentId);
      if (currentComponent) {
        const currentPosition = currentComponent.position?.[device] || {};
        const newSize = {};
        if (newStyle.width) newSize.width = newStyle.width;
        if (newStyle.height) newSize.height = newStyle.height;
        
        // TEMPORALMENTE DESHABILITADO para depuración
        // const validationResult = validateComponentBounds(componentId, currentPosition, newSize);
        // if (!validationResult.isValid && validationResult.adjustedSize) {
        //   if (validationResult.adjustedSize.width) {
        //     finalStyle.width = validationResult.adjustedSize.width;
        //   }
        //   if (validationResult.adjustedSize.height) {
        //     finalStyle.height = validationResult.adjustedSize.height;
        //   }
        // }
        console.log(`🔍 CHILD: Validación de límites DESHABILITADA temporalmente`);
        console.log(`📏 CHILD: Dimensiones finales sin validación:`, { width: finalStyle.width, height: finalStyle.height });
      }
    }
    
    findAndUpdateChild(componentId, (component) => {
      // Crear una copia profunda del componente para evitar mutaciones
      const updatedComponent = JSON.parse(JSON.stringify(component));
      
      // Detectar si es componente de imagen
      const isChildImageComponent = updatedComponent.type === 'image';
      
      // Asegurar que existe la estructura de estilos para el dispositivo
      if (!updatedComponent.style) updatedComponent.style = { desktop: {}, tablet: {}, mobile: {} };
      if (!updatedComponent.style[device]) updatedComponent.style[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedComponent.style[device] };
      
      // Procesar las dimensiones para componentes de imagen si se están actualizando
      let processedStyle = { ...finalStyle };
      
      // Para componentes de imagen, validar las dimensiones
      if (isChildImageComponent && ('width' in finalStyle || 'height' in finalStyle)) {
        console.log(`🔄 CHILD: Actualizando dimensiones de imagen ${componentId}:`, {
          width: finalStyle.width,
          height: finalStyle.height
        });
        
        // Asegurar que objectFit está configurado para imágenes
        if (!currentDeviceStyle.objectFit && !processedStyle.objectFit) {
          processedStyle.objectFit = 'contain';
        }
      }
      
      // Actualizar solo el estilo para el dispositivo específico con los valores procesados
      updatedComponent.style[device] = {
        ...currentDeviceStyle,
        ...processedStyle
      };
      
      // IMPORTANTE: Si es componente de imagen hijo y se actualizaron dimensiones, actualizar _imageSettings
      if (isChildImageComponent && (finalStyle.width || finalStyle.height || finalStyle.objectFit || finalStyle.objectPosition)) {
          // Inicializar _imageSettings si no existe
          if (!updatedComponent._imageSettings) {
            updatedComponent._imageSettings = {};
          }
          
          // Extraer valores numéricos de las dimensiones
          const parseSize = (size) => {
            if (!size) return null;
            const match = size.toString().match(/^(\d+)(px|%)?$/);
            return match ? parseInt(match[1], 10) : null;
          };
          
          // Actualizar dimensiones en _imageSettings
          if (finalStyle.width) {
            const widthPx = parseSize(finalStyle.width);
            if (widthPx) {
              updatedComponent._imageSettings.width = finalStyle.width;
              updatedComponent._imageSettings.widthRaw = widthPx;
              console.log(`💾 CHILD: Guardando width en _imageSettings: ${finalStyle.width} (${widthPx}px)`);
            }
          }
          
          if (finalStyle.height) {
            const heightPx = parseSize(finalStyle.height);
            if (heightPx) {
              updatedComponent._imageSettings.height = finalStyle.height;
              updatedComponent._imageSettings.heightRaw = heightPx;
              console.log(`💾 CHILD: Guardando height en _imageSettings: ${finalStyle.height} (${heightPx}px)`);
            }
          }
          
          // Actualizar objectFit y objectPosition si se proporcionan
          if (finalStyle.objectFit) {
            updatedComponent._imageSettings.objectFit = finalStyle.objectFit;
            console.log(`💾 CHILD: Guardando objectFit en _imageSettings: ${finalStyle.objectFit}`);
          }
          
          if (finalStyle.objectPosition) {
            updatedComponent._imageSettings.objectPosition = finalStyle.objectPosition;
            console.log(`💾 CHILD: Guardando objectPosition en _imageSettings: ${finalStyle.objectPosition}`);
          }
          
          console.log(`📊 CHILD: _imageSettings actualizado para ${componentId}:`, updatedComponent._imageSettings);
      }
      
      console.log(`✅ CHILD: Componente actualizado:`, {
        id: updatedComponent.id,
        style: updatedComponent.style[device],
        _imageSettings: updatedComponent._imageSettings
      });
      
      return updatedComponent;
    });
    
    // Actualizar también el componente seleccionado si es el mismo
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      const isSelectedImageComponent = prev.type === 'image';
      
      // Crear una copia profunda de los estilos
      const updatedStyle = JSON.parse(JSON.stringify(prev.style || { desktop: {}, tablet: {}, mobile: {} }));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedStyle[device]) updatedStyle[device] = {};
      
      // Hacer una copia del estilo actual para ese dispositivo
      const currentDeviceStyle = { ...updatedStyle[device] };
      
      // Actualizar solo el estilo para el dispositivo específico
      updatedStyle[device] = {
        ...currentDeviceStyle,
        ...finalStyle
      };
      
      // Crear copia actualizada del componente seleccionado
      let updatedSelectedComponent = {
        ...prev,
        style: updatedStyle
      };
      
      // IMPORTANTE: Si es componente de imagen, actualizar también _imageSettings
      if (isSelectedImageComponent && (finalStyle.width || finalStyle.height || finalStyle.objectFit || finalStyle.objectPosition)) {
        // Inicializar _imageSettings si no existe
        if (!updatedSelectedComponent._imageSettings) {
          updatedSelectedComponent._imageSettings = {};
        }
        
        // Extraer valores numéricos de las dimensiones
        const parseSize = (size) => {
          if (!size) return null;
          const match = size.toString().match(/^(\d+)(px|%)?$/);
          return match ? parseInt(match[1], 10) : null;
        };
        
        // Actualizar dimensiones en _imageSettings
        if (finalStyle.width) {
          const widthPx = parseSize(finalStyle.width);
          if (widthPx) {
            updatedSelectedComponent._imageSettings.width = finalStyle.width;
            updatedSelectedComponent._imageSettings.widthRaw = widthPx;
            console.log(`💾 SELECTED_CHILD: Guardando width en _imageSettings: ${finalStyle.width} (${widthPx}px)`);
          }
        }
        
        if (finalStyle.height) {
          const heightPx = parseSize(finalStyle.height);
          if (heightPx) {
            updatedSelectedComponent._imageSettings.height = finalStyle.height;
            updatedSelectedComponent._imageSettings.heightRaw = heightPx;
            console.log(`💾 SELECTED_CHILD: Guardando height en _imageSettings: ${finalStyle.height} (${heightPx}px)`);
          }
        }
        
        // Actualizar objectFit y objectPosition si se proporcionan
        if (finalStyle.objectFit) {
          updatedSelectedComponent._imageSettings.objectFit = finalStyle.objectFit;
          console.log(`💾 SELECTED_CHILD: Guardando objectFit en _imageSettings: ${finalStyle.objectFit}`);
        }
        
        if (finalStyle.objectPosition) {
          updatedSelectedComponent._imageSettings.objectPosition = finalStyle.objectPosition;
          console.log(`💾 SELECTED_CHILD: Guardando objectPosition en _imageSettings: ${finalStyle.objectPosition}`);
        }
        
        console.log(`📊 SELECTED: _imageSettings actualizado para selectedComponent ${componentId}:`, updatedSelectedComponent._imageSettings);
      }
      
      return updatedSelectedComponent;
    });
  }, [findAndUpdateChild]); // Solo dependencias estables para evitar re-creaciones

  // NUEVO: Actualizar posición de componente hijo
  const updateChildPositionForDevice = useCallback((componentId, device, newPosition) => {
    
    // Asegurar que las posiciones estén en formato de porcentaje
    let processedPosition = {};
    
    if (newPosition.top !== undefined) {
      processedPosition.top = ensurePercentage(newPosition.top);
    }
    
    if (newPosition.left !== undefined) {
      processedPosition.left = ensurePercentage(newPosition.left);
    }

    // NUEVA VALIDACIÓN: Verificar límites del contenedor padre
    const validationResult = validateComponentBounds(componentId, processedPosition);
    const finalPosition = validationResult.adjustedPosition;

    if (!validationResult.isValid) {
      processedPosition = validationResult.adjustedPosition;
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
        ...finalPosition
      };
      
      
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
      
      // Actualizar la configuración del contenedor - Fusionar con configuración existente en vez de reemplazarla
      updatedComponent.containerConfig = {
        ...updatedComponent.containerConfig || {},
        ...newContainerConfig
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
      
      return {
        ...prev,
        containerConfig: {
          ...prev.containerConfig || {},
          ...newContainerConfig
        }
      };
    });
  }, []);

  // NOTA: reorderContainerChildren ya está definido arriba (línea 1665)

  // Actualizar estilos - versión mejorada con validación de dimensiones para imágenes
  const updateComponentStyleForDevice = useCallback((componentId, device, newStyle) => {
    console.log(`🚨 useBannerEditor RECIBE: ${componentId} ${device}`, newStyle);
    
    if (!newStyle || typeof newStyle !== 'object') {
      console.error('❌ newStyle inválido:', newStyle);
      return;
    }
    
    // TEMPORALMENTE DESACTIVADO: Validación que sobrescribe valores del usuario
    // if (newStyle.width !== undefined || newStyle.height !== undefined) {
    //   const validationResult = validateComponentBounds(componentId, {}, newStyle);
    //   if (!validationResult.isValid) {
    //     console.warn('⚠️ Dimensiones fuera de límites (no aplicando corrección):', validationResult.warnings);
    //     // newStyle = { ...newStyle, ...validationResult.adjustedSize }; // NO OVERRIDE
    //   }
    // }
    
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
          
          
          // DESACTIVADO: Defaults forzados que interfieren con configuración del usuario
          // Solo aplicar defaults en componentes NUEVOS, no en actualizaciones
          // const needsDefaultWidth = width === null || isNaN(width) || width <= 0;
          // const needsDefaultHeight = height === null || isNaN(height) || height <= 0;
          
          // Permitir que el usuario configure libremente las dimensiones
          // Los valores por defecto solo se aplicarán en la creación inicial del componente
        }
      }
      
      // Actualizar solo el estilo para el dispositivo específico con los valores procesados
      updatedComponent.style[device] = {
        ...currentDeviceStyle,
        ...processedNewStyle
      };
      
      if (processedNewStyle.width) {
        console.log(`🚨 FINAL APLICADO: width=${updatedComponent.style[device].width} en ${device}`);
      }
      
      // IMPORTANTE: Si es componente de imagen y se actualizaron dimensiones, actualizar _imageSettings
      if (isImageComponent && (newStyle.width || newStyle.height || newStyle.objectFit || newStyle.objectPosition)) {
        // Inicializar _imageSettings si no existe
        if (!updatedComponent._imageSettings) {
          updatedComponent._imageSettings = {};
        }
        
        // Extraer valores numéricos de las dimensiones
        const parseSize = (size) => {
          if (!size) return null;
          const match = size.toString().match(/^(\d+)(px|%)?$/);
          return match ? parseInt(match[1], 10) : null;
        };
        
        // Actualizar dimensiones en _imageSettings
        if (newStyle.width) {
          const widthPx = parseSize(newStyle.width);
          if (widthPx) {
            updatedComponent._imageSettings.width = newStyle.width;
            updatedComponent._imageSettings.widthRaw = widthPx;
            console.log(`💾 EDITOR: Guardando width en _imageSettings: ${newStyle.width} (${widthPx}px)`);
          }
        }
        
        if (newStyle.height) {
          const heightPx = parseSize(newStyle.height);
          if (heightPx) {
            updatedComponent._imageSettings.height = newStyle.height;
            updatedComponent._imageSettings.heightRaw = heightPx;
            console.log(`💾 EDITOR: Guardando height en _imageSettings: ${newStyle.height} (${heightPx}px)`);
          }
        }
        
        // Actualizar objectFit y objectPosition si se proporcionan
        if (newStyle.objectFit) {
          updatedComponent._imageSettings.objectFit = newStyle.objectFit;
          console.log(`💾 EDITOR: Guardando objectFit en _imageSettings: ${newStyle.objectFit}`);
        }
        
        if (newStyle.objectPosition) {
          updatedComponent._imageSettings.objectPosition = newStyle.objectPosition;
          console.log(`💾 EDITOR: Guardando objectPosition en _imageSettings: ${newStyle.objectPosition}`);
        }
        
        console.log(`📊 EDITOR: _imageSettings actualizado para ${componentId}:`, updatedComponent._imageSettings);
      }
      
      // Crear una copia del array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[componentIndex] = updatedComponent;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });

    // 🔄 INTEGRACIÓN: Emitir eventos del DimensionManager para sincronización bidireccional
    if (dimensionManagerRef.current) {
      // Filtrar cambios relacionados con dimensiones para emitir eventos apropiados
      const dimensionProperties = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'];
      const changedDimensions = Object.keys(newStyle).filter(prop => 
        dimensionProperties.includes(prop)
      );
      
      if (changedDimensions.length > 0) {
        console.log(`🔄 useBannerEditor: Emitiendo eventos de dimensión para ${componentId} (${device})`, {
          properties: changedDimensions,
          values: changedDimensions.reduce((acc, prop) => {
            acc[prop] = newStyle[prop];
            return acc;
          }, {})
        });
        
        // Emitir evento por cada propiedad de dimensión cambiada
        changedDimensions.forEach(property => {
          try {
            const value = newStyle[property];
            
            // Usar updateDimension que incluye parsing, validación y eventos
            dimensionManagerRef.current.updateDimension(
              componentId,
              property,
              value,
              device,
              'state-update' // Source indica que viene del estado del hook
            );
            
          } catch (error) {
            console.error(`🚫 useBannerEditor: Error al emitir evento para ${componentId}.${property}:`, error);
          }
        });
      }
    }
    
    // DESACTIVADO: Actualización de selectedComponent que causaba bucle infinito
    // Solo actualizar selectedComponent si es estrictamente necesario
    if (false) { // Temporalmente desactivado para evitar bucle infinito
      setSelectedComponent(prev => {
        if (!prev || prev.id !== componentId) return prev;
        
        console.log(`🔄 EDITOR: Actualizando selectedComponent para ${componentId}`);
        
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
    } // Cerrar el bloque if (false) desactivado
    
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
  }, [validateComponentBounds]);

  // 🛡️ VALIDACIÓN: Función para validar que una posición esté dentro de los límites
  const validateComponentPosition = useCallback((component, device, newPosition) => {
    // No validar si no hay posición nueva
    if (!newPosition || (!newPosition.top && !newPosition.left)) {
      return newPosition;
    }
    
    const isChildComponent = !!component.parentId;
    let validatedPosition = { ...newPosition };
    
    // Para componentes hijos, necesitamos validar contra su contenedor padre
    if (isChildComponent) {
      
      // Por ahora, permitir cualquier posición para componentes hijos
      // La validación real se hará en el ComponentRenderer usando getBoundingClientRect
      // porque necesitamos las dimensiones reales del DOM
      return validatedPosition;
    }
    
    // Para componentes principales, validar contra el banner (100%)
    if (validatedPosition.left) {
      const leftPercent = parseFloat(validatedPosition.left);
      if (!isNaN(leftPercent)) {
        validatedPosition.left = `${Math.max(0, Math.min(90, leftPercent))}%`;
      }
    }
    
    if (validatedPosition.top) {
      const topPercent = parseFloat(validatedPosition.top);
      if (!isNaN(topPercent)) {
        validatedPosition.top = `${Math.max(0, Math.min(90, topPercent))}%`;
      }
    }
    
    if (validatedPosition.left !== newPosition.left || validatedPosition.top !== newPosition.top) {
      // Position was adjusted for bounds
    }
    
    return validatedPosition;
  }, []);

  // Actualizar posición - OPTIMIZADO para mejor rendimiento
  const updateComponentPositionForDevice = useCallback((componentId, device, newPosition) => {
    // Procesar posiciones rápidamente
    const processedPosition = {};
    
    if (newPosition.top !== undefined) {
      processedPosition.top = ensurePercentage(newPosition.top);
    }
    
    if (newPosition.left !== undefined) {
      processedPosition.left = ensurePercentage(newPosition.left);
    }
    
    setBannerConfig(prev => {
      // Buscar índice del componente
      const componentIndex = prev.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return prev;
      
      // Copiar solo lo necesario, no hacer JSON parse/stringify
      const component = prev.components[componentIndex];
      const updatedComponent = {
        ...component,
        position: {
          ...component.position,
          [device]: {
            ...component.position?.[device],
            ...processedPosition
          }
        }
      };
      
      // Crear nuevo array de componentes
      const updatedComponents = [...prev.components];
      updatedComponents[componentIndex] = updatedComponent;
      
      return {
        ...prev,
        components: updatedComponents
      };
    });
    
    // SIMPLIFICAR: Solo actualizar el componente seleccionado si es necesario
    setSelectedComponent(prev => {
      if (!prev || prev.id !== componentId) return prev;
      
      return {
        ...prev,
        position: {
          ...prev.position,
          [device]: {
            ...prev.position?.[device],
            ...processedPosition
          }
        }
      };
    });
    
  }, [ensurePercentage]);

  // Actualizar layout - refactorizado para evitar problemas de estado
  const handleUpdateLayoutForDevice = useCallback((device, prop, value) => {
    
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

  // Función batch para múltiples actualizaciones de layout simultáneas
  const handleBatchUpdateLayoutForDevice = useCallback((device, updates) => {
    setBannerConfig(prev => {
      // Crear una copia profunda del layout
      const updatedLayout = JSON.parse(JSON.stringify(prev.layout || {}));
      
      // Asegurar que existe el objeto para el dispositivo
      if (!updatedLayout[device]) updatedLayout[device] = {};
      
      // Aplicar todas las actualizaciones de una vez
      Object.entries(updates).forEach(([prop, value]) => {
        updatedLayout[device][prop] = value;
      });
      
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
        const response = await apiClient.post('/api/v1/banner-templates/preview', { 
          config: bannerConfig 
        });
        setPreviewData(response.data.data.preview);
      } catch (apiError) {
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

  // Auto-traducción de componentes con configuración personalizada
  const autoTranslateComponentsWithConfig = async (components, config) => {
    const { sourceLanguage, targetLanguages, autoTranslateOnSave } = config;
    
    console.log('🔍 autoTranslateComponents - Configuración recibida:', {
      sourceLanguage,
      targetLanguages, 
      autoTranslateOnSave,
      translationConfig
    });
    
    console.log('🔍 autoTranslateComponents - Componentes a procesar:', components?.length || 0);
    components?.forEach((comp, index) => {
      console.log(`  [${index}] ${comp.type} (${comp.id}):`, comp.content);
    });
    
    // Si la auto-traducción está desactivada, devolver componentes sin cambios
    if (!autoTranslateOnSave) {
      console.log('⏭️ Auto-traducción desactivada, saltando...');
      return components;
    }
    
    console.log('🌍 Iniciando auto-traducción de componentes...');
    
    const translateComponentsRecursively = async (componentsArray) => {
      const translatedComponents = [];
      
      for (const component of componentsArray) {
        const translatedComponent = { ...component };
        
        // Procesar componentes de texto y botón con contenido traducible
        const isTextOrButton = component.type === 'text' || component.type === 'button';
        const hasTranslatableContent = component.content && (
          (typeof component.content === 'object' && component.content.translatable) ||
          (typeof component.content === 'object' && component.content.texts) ||
          (typeof component.content === 'string' && isTextOrButton)
        );
        
        console.log(`🔍 Analizando componente ${component.id}:`, {
          type: component.type,
          isTextOrButton,
          contentType: typeof component.content,
          content: component.content,
          hasTranslatableContent
        });
        
        if (hasTranslatableContent && isTextOrButton) {
          console.log(`🔄 Procesando componente traducible: ${component.id} (tipo: ${component.type})`);
          
          // Obtener el texto en el idioma origen configurado
          let sourceText = '';
          if (typeof component.content === 'string') {
            sourceText = component.content;
          } else if (typeof component.content === 'object') {
            sourceText = component.content.texts?.[sourceLanguage] || 
                        component.content.text || 
                        component.content.texts?.en || // Fallback a inglés
                        '';
          }
          
          if (sourceText && sourceText.trim()) {
            // Verificar qué idiomas necesitan traducción
            const existingTexts = (typeof component.content === 'object' && component.content.texts) 
              ? component.content.texts 
              : {};
            const textsToTranslate = [];
            
            for (const targetLang of targetLanguages) {
              // No traducir al mismo idioma origen
              if (targetLang === sourceLanguage) {
                continue;
              }
              
              // Solo traducir si no existe o está vacío
              if (!existingTexts[targetLang] || existingTexts[targetLang].trim() === '') {
                textsToTranslate.push(targetLang);
              } else {
                console.log(`⏭️ Saltando ${targetLang} para "${sourceText}" - ya existe: "${existingTexts[targetLang]}"`);
              }
            }
            
            if (textsToTranslate.length > 0) {
              console.log(`📝 Traduciendo "${sourceText}" desde ${sourceLanguage} a: [${textsToTranslate.join(', ')}]`);
              
              // Traducir a cada idioma necesario
              const translations = {};
              
              for (const targetLang of textsToTranslate) {
                try {
                  console.log(`🌐 Traduciendo "${sourceText}" de ${sourceLanguage} a ${targetLang}...`);
                  const translationResponse = await translateText(sourceText, targetLang, sourceLanguage);
                  
                  console.log(`🔍 Respuesta de traducción ${sourceLanguage} → ${targetLang}:`, translationResponse);
                  
                  if (translationResponse.success && translationResponse.data.translatedText) {
                    translations[targetLang] = translationResponse.data.translatedText;
                    console.log(`✅ ${sourceLanguage} → ${targetLang}: "${sourceText}" → "${translations[targetLang]}"`);
                  } else {
                    console.warn(`⚠️ Error en traducción ${sourceLanguage} → ${targetLang}:`, translationResponse);
                    translations[targetLang] = sourceText; // Fallback al texto original
                  }
                } catch (error) {
                  console.error(`❌ Error traduciendo a ${targetLang}:`, error);
                  console.error(`❌ Error details:`, error.message, error.response?.data);
                  translations[targetLang] = sourceText; // Fallback al texto original
                }
              }
              
              // Actualizar el contenido con las nuevas traducciones
              if (typeof component.content === 'string') {
                // Convertir string simple a formato de traducción
                translatedComponent.content = {
                  texts: {
                    [sourceLanguage]: sourceText, // Guardar el texto original
                    ...existingTexts, // Mantener traducciones existentes
                    ...translations   // Agregar nuevas traducciones
                  },
                  translatable: true
                };
              } else {
                // Actualizar objeto existente
                translatedComponent.content = {
                  ...component.content,
                  texts: {
                    [sourceLanguage]: sourceText, // Asegurar que el idioma origen esté incluido
                    ...existingTexts, // Mantener traducciones existentes
                    ...translations   // Agregar nuevas traducciones
                  }
                };
              }
              
              console.log(`✅ Componente ${component.id} traducido:`, translatedComponent.content.texts);
            }
          } else {
            console.log(`⏭️ Saltando componente ${component.id} - sin texto en ${sourceLanguage}`);
          }
        }
        
        // Procesar componentes hijos recursivamente
        if (component.children && Array.isArray(component.children)) {
          translatedComponent.children = await translateComponentsRecursively(component.children);
        }
        
        translatedComponents.push(translatedComponent);
      }
      
      return translatedComponents;
    };
    
    const result = await translateComponentsRecursively(components);
    console.log('🎉 Auto-traducción completada');
    return result;
  };

  // Auto-traducción de componentes (versión original que usa el estado actual)
  const autoTranslateComponents = async (components) => {
    return await autoTranslateComponentsWithConfig(components, translationConfig);
  };

  // Funciones para gestionar configuración de traducción
  const updateTranslationConfig = useCallback((newConfig) => {
    console.log('🔄 Actualizando translationConfig:', newConfig);
    setTranslationConfig(prev => {
      const updated = {
        ...prev,
        ...newConfig
      };
      console.log('🔄 Nueva translationConfig:', updated);
      return updated;
    });
  }, []);

  const setSourceLanguage = useCallback((language) => {
    console.log('🔄 setSourceLanguage llamado con:', language);
    setTranslationConfig(prev => {
      const newConfig = {
        ...prev,
        sourceLanguage: language
      };
      console.log('🔄 setSourceLanguage - nueva config:', newConfig);
      
      // Guardar también en localStorage para asegurar persistencia
      localStorage.setItem('pendingTranslationConfig', JSON.stringify(newConfig));
      console.log('💾 Guardando sourceLanguage en localStorage:', newConfig);
      
      return newConfig;
    });
  }, []);

  const setTargetLanguages = useCallback((languages) => {
    console.log('🔄 setTargetLanguages llamado con:', languages);
    console.log('🔄 Es array?:', Array.isArray(languages));
    console.log('🔄 Número de idiomas:', languages?.length);
    
    setTranslationConfig(prev => {
      const newConfig = {
        ...prev,
        targetLanguages: languages
      };
      console.log('🔄 setTargetLanguages - nueva config:', newConfig);
      
      // Guardar también en localStorage para asegurar persistencia
      localStorage.setItem('pendingTranslationConfig', JSON.stringify(newConfig));
      console.log('💾 Guardando targetLanguages en localStorage:', newConfig);
      
      return newConfig;
    });
  }, []);

  const toggleAutoTranslate = useCallback(() => {
    console.log('🔄 toggleAutoTranslate llamado');
    setTranslationConfig(prev => {
      const newConfig = {
        ...prev,
        autoTranslateOnSave: !prev.autoTranslateOnSave
      };
      console.log('🔄 toggleAutoTranslate - nueva config:', newConfig);
      
      // IMPORTANTE: Guardar en localStorage para persistir el cambio inmediatamente
      localStorage.setItem('pendingTranslationConfig', JSON.stringify(newConfig));
      
      return newConfig;
    });
  }, []);

  // Guardar banner

  // Función handleSave corregida con sintaxis correcta y soporte para plantillas del sistema
const handleSave = useCallback(async (customConfig = null, isSystemTemplate = false) => {
  try {
    
    const configToSave = customConfig || bannerConfig;
    
    // VALIDACIÓN DE COMPONENTE OBLIGATORIO LANGUAGE-BUTTON SEGÚN EL PLAN
    const hasLanguageButton = (components) => {
      if (!components || !Array.isArray(components)) return false;
      
      for (const comp of components) {
        // Verificar si es un language-button
        if (comp.type === 'language-button') {
          return true;
        }
        
        // Buscar recursivamente en componentes hijos (contenedores)
        if (comp.children && Array.isArray(comp.children)) {
          if (hasLanguageButton(comp.children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    // TEMPORALMENTE DESHABILITADO: Verificar que exista al menos un language-button en el banner
    if (false && !hasLanguageButton(configToSave.components)) {
      const errorMessage = 'Este banner debe incluir un componente "Selector de Idioma" para cumplir con los requisitos de traducción. Por favor, agregue uno antes de guardar.';
      
      // Mostrar advertencia al usuario
      if (window.confirm(`⚠️ ${errorMessage}\n\n¿Desea agregar automáticamente un selector de idioma?`)) {
        // Auto-agregar un language-button por defecto
        const defaultLanguageButton = {
          id: `language-button-${Date.now()}`,
          type: 'language-button',
          content: {
            displayMode: 'flag-dropdown',
            languages: ['es', 'en', 'fr', 'de', 'it', 'pt'],
            defaultLanguageMode: 'auto',
            defaultLanguage: 'es',
            showLabel: true,
            labelText: 'Idioma:',
            size: 'medium',
            style: 'modern',
            position: 'inline',
            required: true,
            autoDetectBrowserLanguage: true,
            fallbackLanguage: 'en',
            saveUserPreference: true
          },
          style: {
            desktop: { 
              width: '120px', 
              height: '40px',
              fontSize: '14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#374151'
            },
            tablet: { 
              width: '110px', 
              height: '36px',
              fontSize: '13px'
            },
            mobile: { 
              width: '100px', 
              height: '32px',
              fontSize: '12px'
            }
          },
          position: {
            desktop: { top: '10%', left: '80%' },
            tablet: { top: '10%', left: '75%' },
            mobile: { top: '10%', left: '70%' }
          },
          locked: false,
          required: true
        };
        
        // Agregar el componente al banner
        configToSave.components = [...(configToSave.components || []), defaultLanguageButton];
        
        // Actualizar también el estado local del banner
        setBannerConfig(prev => ({
          ...prev,
          components: [...(prev.components || []), defaultLanguageButton]
        }));
        
        console.log('✅ Language-button agregado automáticamente al banner');
      } else {
        // Usuario canceló, no guardar
        throw new Error(errorMessage);
      }
    }
    
    // TEMPORALMENTE DESHABILITADO: Validación de botones (no existía en versión anterior)
    // const requiredButtonTypes = ['accept_all', 'reject_all', 'show_preferences'];
    // const missingButtons = [];
    
    // Crear copia limpia de la configuración
    const cleanConfig = JSON.parse(JSON.stringify(configToSave));
    
    // IMPORTANTE: Obtener la configuración más actualizada
    // Primero intentar desde localStorage (si hay cambios pendientes)
    let currentTranslationConfig = translationConfig;
    try {
      const pendingConfig = localStorage.getItem('pendingTranslationConfig');
      if (pendingConfig) {
        currentTranslationConfig = JSON.parse(pendingConfig);
        console.log('🔄 Usando configuración pendiente desde localStorage:', currentTranslationConfig);
        localStorage.removeItem('pendingTranslationConfig');
      }
    } catch (error) {
      console.warn('Error leyendo configuración pendiente:', error);
    }
    
    // Incluir la configuración de traducción
    cleanConfig.translationConfig = currentTranslationConfig;
    console.log('🌐 Configuración de traducción a guardar:', currentTranslationConfig);
    console.log('🔍 translationConfig detallado:', {
      sourceLanguage: currentTranslationConfig.sourceLanguage,
      targetLanguages: currentTranslationConfig.targetLanguages,
      autoTranslateOnSave: currentTranslationConfig.autoTranslateOnSave,
      tipo_sourceLanguage: typeof currentTranslationConfig.sourceLanguage,
      tipo_targetLanguages: typeof currentTranslationConfig.targetLanguages,
      es_array_targetLanguages: Array.isArray(currentTranslationConfig.targetLanguages)
    });
    
    // NUEVA FUNCIONALIDAD: Auto-traducir componentes antes de guardar
    try {
      setIsAutoTranslating(true);
      console.log('🌍 Iniciando auto-traducción antes de guardar...');
      // Usar currentTranslationConfig en lugar de translationConfig
      cleanConfig.components = await autoTranslateComponentsWithConfig(cleanConfig.components, currentTranslationConfig);
      console.log('✅ Auto-traducción completada antes de guardar');
    } catch (error) {
      console.error('❌ Error en auto-traducción (continuando con guardado):', error);
      // No interrumpir el guardado si hay error en traducción
    } finally {
      setIsAutoTranslating(false);
    }
    
    // DEBUG: Verificar si los componentes hijos tienen parentId
    const verifyParentIds = (components, parentId = null) => {
      if (!components) return;
      components.forEach(comp => {
        if (comp.type === 'image' && parentId) {
          console.log(`🔍 SAVE DEBUG: Imagen hijo ${comp.id} con parentId: ${comp.parentId || 'NO_PARENT_ID'}, esperado: ${parentId}`);
          // Asegurar que tiene parentId
          if (!comp.parentId) {
            comp.parentId = parentId;
            console.log(`✅ SAVE DEBUG: Asignado parentId ${parentId} a imagen ${comp.id}`);
          }
        }
        if (comp.children) {
          verifyParentIds(comp.children, comp.id);
        }
      });
    };
    
    verifyParentIds(cleanConfig.components);
    
    // Crear FormData para el envío
    const formData = new FormData();
    
    // Obtener archivos de imagen del almacenamiento global
    const imageFiles = collectImageFiles();
    
    console.log('🔍 CREATE SAVE: Archivos de imagen recolectados:', imageFiles.size);
    if (imageFiles.size > 0) {
      console.log('📋 CREATE SAVE: Referencias de imagen:');
      imageFiles.forEach((file, ref) => {
        console.log(`  - ${ref}: ${file.name} (${file.size} bytes)`);
      });
    }
    
    // Función para limpiar componentes de referencias temporales
    const cleanComponents = (components) => {
      if (!components) return;
      components.forEach(comp => {
        if (comp.type === 'image' && comp.content) {
          // Aquí se procesarían las imágenes si fuera necesario
        }
        if (comp.children) {
          cleanComponents(comp.children);
        }
      });
    };
      
    cleanComponents(cleanConfig.components);
      
      // Añadir configuración JSON al FormData (SIN TRANSFORMACIÓN)
      console.log('🔍 CREATE DEBUG - cleanConfig antes de enviar:', {
        hasTranslationConfig: !!cleanConfig.translationConfig,
        translationConfig: cleanConfig.translationConfig,
        cleanConfigKeys: Object.keys(cleanConfig)
      });
      formData.append('template', JSON.stringify(cleanConfig));
      
      // Si es plantilla del sistema, agregar el flag
      if (isSystemTemplate) {
        formData.append('isSystemTemplate', 'true');
      }
      
      // Añadir archivos de imagen uno por uno
      let counter = 0;
      imageFiles.forEach((file, imageRef) => {
        console.log(`🔍 FORMDATA DEBUG: Procesando archivo:`, {
          imageRef,
          file,
          fileType: typeof file,
          isFile: file instanceof File,
          isBlob: file instanceof Blob,
          fileName: file?.name,
          fileSize: file?.size
        });
        
        // Verificar que el archivo es válido antes de agregarlo
        if (!(file instanceof File) && !(file instanceof Blob)) {
          console.error(`❌ FORMDATA ERROR: El archivo no es un File ni Blob:`, file);
          return; // Saltar este archivo
        }
        
        // Usar directamente el nombre original del archivo
        const fileName = file.name || 'image.png';
        
        console.log(`✅ FORMDATA: Agregando archivo válido al FormData:`, {
          fieldName: 'bannerImages',
          fileName,
          fileSize: file.size
        });
        
        // Agregar con nombre explícito para mejor tracking
        formData.append('bannerImages', file, fileName);
        counter++;
      });
      
      // Comprobar si el FormData tiene los datos correctos
      try {
        for (let [key, value] of formData.entries()) {
          if (key === 'template') {
          } else {
          }
        }
      } catch (error) {
        console.error('Error al verificar FormData:', error);
      }
      
      // Si hay imágenes, usar FormData
      if (imageFiles.size > 0) {
        const response = await createTemplate(formData, isSystemTemplate);
        
        // IMPORTANTE: Actualizar el estado del banner con la respuesta del servidor
        if (response.data && response.data.template) {
          // Limpiar _previewUrl y _tempFile de todos los componentes antes de actualizar
          const cleanTemporaryImageData = (components) => {
            return components.map(comp => {
              if (comp.type === 'image' && comp.style) {
                const cleanedStyle = { ...comp.style };
                ['desktop', 'tablet', 'mobile'].forEach(device => {
                  if (cleanedStyle[device]) {
                    const { _previewUrl, _tempFile, ...restStyle } = cleanedStyle[device];
                    cleanedStyle[device] = restStyle;
                  }
                });
                return { ...comp, style: cleanedStyle };
              }
              
              // Limpiar recursivamente en hijos
              if (comp.children && Array.isArray(comp.children)) {
                return { ...comp, children: cleanTemporaryImageData(comp.children) };
              }
              
              return comp;
            });
          };
          
          const cleanedTemplate = {
            ...response.data.template,
            components: cleanTemporaryImageData(response.data.template.components)
          };
          
          setBannerConfig(cleanedTemplate);
          
          // Si hay un componente seleccionado, actualizarlo también
          if (selectedComponent) {
            const updatedComponent = findComponentById(cleanedTemplate.components, selectedComponent.id);
            if (updatedComponent) {
              setSelectedComponent(updatedComponent);
            }
          }
        }
        
        // Limpiar archivos temporales después de guardar exitosamente
        if (window._imageFiles) {
          window._imageFiles = {};
        }
        if (imageMemoryManager && typeof imageMemoryManager.clearTempFiles === 'function') {
          imageMemoryManager.clearTempFiles();
        }
        
        return response.data.template;
      } else {
        const response = await createTemplate(configToSave, isSystemTemplate);
        
        // IMPORTANTE: Actualizar el estado del banner con la respuesta del servidor
        if (response.data && response.data.template) {
          setBannerConfig(response.data.template);
          
          // Si hay un componente seleccionado, actualizarlo también
          if (selectedComponent) {
            const updatedComponent = findComponentById(response.data.template.components, selectedComponent.id);
            if (updatedComponent) {
              setSelectedComponent(updatedComponent);
            }
          }
        }
        
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
          comp.children.forEach(processComponent);
        }
      };
      
      if (components && Array.isArray(components)) {
        components.forEach(processComponent);
      }
      
      return imageRefs;
    };
    
    // Recopilar todas las referencias de imagen
    const existingImageRefs = trackImagesBeforeUpdate(configToUpdate.components);
    
    // Recopilar archivos de imagen temporales
    const imageFiles = collectImageFiles();
    
    console.log('🔍 UPDATE SAVE: Archivos de imagen recolectados:', imageFiles.size);
    if (imageFiles.size > 0) {
      console.log('📋 UPDATE SAVE: Referencias de imagen:');
      imageFiles.forEach((file, ref) => {
        console.log(`  - ${ref}: ${file.name} (${file.size} bytes)`);
      });
    }
    
    // SIEMPRE usar FormData, no importa qué
    
    // Crear FormData
    const formData = new FormData();
    
    // Crear copia limpia del config (VERSIÓN ANTERIOR QUE FUNCIONABA)
    const cleanConfig = JSON.parse(JSON.stringify(configToUpdate));
    
    // IMPORTANTE: Obtener la configuración más actualizada
    // Primero intentar desde localStorage (si hay cambios pendientes)
    let currentTranslationConfig = translationConfig;
    try {
      const pendingConfig = localStorage.getItem('pendingTranslationConfig');
      if (pendingConfig) {
        currentTranslationConfig = JSON.parse(pendingConfig);
        console.log('🔄 UPDATE: Usando configuración pendiente desde localStorage:', currentTranslationConfig);
        localStorage.removeItem('pendingTranslationConfig');
      }
    } catch (error) {
      console.warn('Error leyendo configuración pendiente:', error);
    }
    
    // Incluir la configuración de traducción
    cleanConfig.translationConfig = currentTranslationConfig;
    console.log('🌐 UPDATE: Configuración de traducción a guardar:', currentTranslationConfig);
    
    // Verificar configuración antes de traducir
    console.log('🔍 UPDATE: Estado actual de translationConfig:', translationConfig);
    console.log('🔍 UPDATE: autoTranslateOnSave:', translationConfig.autoTranslateOnSave);
    
    // NUEVA FUNCIONALIDAD: Auto-traducir componentes antes de actualizar
    try {
      setIsAutoTranslating(true);
      console.log('🌍 UPDATE: Iniciando auto-traducción antes de actualizar...');
      // Usar currentTranslationConfig en lugar de translationConfig
      cleanConfig.components = await autoTranslateComponentsWithConfig(cleanConfig.components, currentTranslationConfig);
      console.log('✅ UPDATE: Auto-traducción completada antes de actualizar');
    } catch (error) {
      console.error('❌ UPDATE: Error en auto-traducción (continuando con actualización):', error);
      // No interrumpir la actualización si hay error en traducción
    } finally {
      setIsAutoTranslating(false);
    }
    
    // DEBUG: Verificar si los componentes hijos tienen parentId (también para UPDATE)
    const verifyParentIdsUpdate = (components, parentId = null) => {
      if (!components) return;
      components.forEach(comp => {
        if (comp.type === 'image' && parentId) {
          console.log(`🔍 UPDATE DEBUG: Imagen hijo ${comp.id} con parentId: ${comp.parentId || 'NO_PARENT_ID'}, esperado: ${parentId}`);
          // Asegurar que tiene parentId
          if (!comp.parentId) {
            comp.parentId = parentId;
            console.log(`✅ UPDATE DEBUG: Asignado parentId ${parentId} a imagen ${comp.id}`);
          }
        }
        if (comp.children) {
          verifyParentIdsUpdate(comp.children, comp.id);
        }
      });
    };
    
    verifyParentIdsUpdate(cleanConfig.components);
    
    // Ya no necesitamos workarounds especiales para plantillas del sistema
    // El backend ahora maneja correctamente ambos tipos de plantillas para usuarios owner
    
    // Limpiar propiedades temporales
    const cleanComponents = (components) => {
      if (!components || !Array.isArray(components)) return;
      
      components.forEach(comp => {
        // Limpiar referencias temporales de imágenes si las hay
        if (comp.type === 'image' && comp.content) {
          // Procesar imagen si es necesario
        }
        
        if (comp.children) {
          cleanComponents(comp.children);
        }
      });
    };
    
    cleanComponents(cleanConfig.components);
    
    
    // ¡IMPORTANTE! Usar strings para claves y valores del FormData (SIN TRANSFORMACIÓN)
    console.log('🔍 UPDATE DEBUG - cleanConfig antes de enviar:', {
      hasTranslationConfig: !!cleanConfig.translationConfig,
      translationConfig: cleanConfig.translationConfig,
      cleanConfigKeys: Object.keys(cleanConfig)
    });
    formData.append("template", JSON.stringify(cleanConfig));
    
    // Añadir archivos de imagen del Map recopilado
    if (imageFiles.size > 0) {
      
      let counter = 0;
      imageFiles.forEach((file, imageRef) => {
        console.log(`🔍 UPDATE FORMDATA DEBUG: Procesando archivo:`, {
          imageRef,
          file,
          fileType: typeof file,
          isFile: file instanceof File,
          isBlob: file instanceof Blob,
          fileName: file?.name,
          fileSize: file?.size
        });
        
        // Verificar que el archivo es válido antes de agregarlo
        if (!(file instanceof File) && !(file instanceof Blob)) {
          console.error(`❌ UPDATE FORMDATA ERROR: El archivo no es un File ni Blob:`, file);
          return; // Saltar este archivo
        }
        
        // Usar directamente el nombre original del archivo
        const fileName = file.name || 'image.png';
        
        console.log(`✅ UPDATE FORMDATA: Agregando archivo válido al FormData:`, {
          fieldName: 'bannerImages',
          fileName,
          fileSize: file.size
        });
        
        // Agregar con nombre explícito para mejor tracking
        formData.append('bannerImages', file, fileName);
        counter++;
      });
    } else {
      // Si no hay imágenes del Map, buscar en el almacenamiento global como fallback
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
            }
          });
        }
      }
    }
    
    // Si no hay imágenes en absoluto, crear un archivo placeholder
    if (!formData.has("bannerImages")) {
      // Crear un archivo placeholder mínimo
      const placeholderData = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]); // Cabecera JPEG mínima
      const placeholderFile = new File([placeholderData], "placeholder.jpg", { type: "image/jpeg" });
      
      formData.append("bannerImages", placeholderFile, "placeholder.jpg");
    }
    
    // Verificar si el FormData se creó correctamente
    // FormData validation completed
    
    // IMPORTANTE: Usar updateTemplate que ya usa apiClient con autenticación
    
    // Llama a la función del archivo bannerTemplate.js que ya tiene la autenticación configurada
    let response;
    
    // Siempre usar el endpoint estándar (workaround para sistema)
    response = await updateTemplate(bannerId, formData);
    
    // IMPORTANTE: Actualizar el estado del banner con la respuesta del servidor
    // Esto incluye las URLs de imagen actualizadas
    if (response.data && response.data.template) {
      // Limpiar _previewUrl y _tempFile de todos los componentes antes de actualizar
      const cleanTemporaryImageData = (components) => {
        return components.map(comp => {
          if (comp.type === 'image' && comp.style) {
            const cleanedStyle = { ...comp.style };
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (cleanedStyle[device]) {
                const { _previewUrl, _tempFile, ...restStyle } = cleanedStyle[device];
                cleanedStyle[device] = restStyle;
              }
            });
            return { ...comp, style: cleanedStyle };
          }
          
          // Limpiar recursivamente en hijos
          if (comp.children && Array.isArray(comp.children)) {
            return { ...comp, children: cleanTemporaryImageData(comp.children) };
          }
          
          return comp;
        });
      };
      
      const cleanedTemplate = {
        ...response.data.template,
        components: cleanTemporaryImageData(response.data.template.components)
      };
      
      setBannerConfig(cleanedTemplate);
      
      // Si hay un componente seleccionado, actualizarlo también
      if (selectedComponent) {
        const updatedComponent = findComponentById(cleanedTemplate.components, selectedComponent.id);
        if (updatedComponent) {
          setSelectedComponent(updatedComponent);
        }
      }
    } else {
      console.warn('⚠️ No se encontró template en la respuesta del servidor');
    }
    
    // Limpiar todas las imágenes temporales del almacenamiento global después de guardar
    if (window._imageFiles) {
      window._imageFiles = {};
    }
    
    // También limpiar del imageMemoryManager
    if (imageMemoryManager && typeof imageMemoryManager.clearTempFiles === 'function') {
      imageMemoryManager.clearTempFiles();
    }
    
    return response.data.template;

  } catch (err) {
    console.error('❌ Error actualizando la plantilla:', err);
    throw err;
  }
}, [bannerConfig]);

  

  // Procesar imágenes en componentes (principales y dentro de contenedores)
  const processImages = useCallback(async (bannerId) => {
    try {
      
      // Buscar imágenes en componentes principales
      const componentsWithImages = bannerConfig.components.filter(
        comp => comp.type === 'image' && 
               typeof comp.content === 'string' && 
               comp.content.startsWith('data:image')
      );
      
      // Buscar imágenes dentro de contenedores (componentes hijos)
      const childImagesWithContainer = [];
      
      bannerConfig.components.forEach(comp => {
        if (comp.type === 'container' && comp.children && Array.isArray(comp.children)) {
          comp.children.forEach(child => {
            if (child.type === 'image' && 
                typeof child.content === 'string' && 
                child.content.startsWith('data:image')) {
              childImagesWithContainer.push({ child, parentId: comp.id });
            }
          });
        }
      });
      
      
      if (componentsWithImages.length === 0 && childImagesWithContainer.length === 0) {
        return;
      }
      
      // Procesar imágenes principales
      for (const component of componentsWithImages) {
        try {
          const response = await axios.post(`/api/v1/banner-templates/${bannerId}/images`, {
            imageData: component.content,
            componentId: component.id
          });
          
          // Actualizar el contenido con la URL
          updateComponentContent(component.id, response.data.data.url);
        } catch (error) {
          console.error(`❌ Error procesando imagen principal para componente ${component.id}:`, error);
        }
      }
      
      // Procesar imágenes dentro de contenedores
      for (const { child, parentId } of childImagesWithContainer) {
        try {
          const response = await axios.post(`/api/v1/banner-templates/${bannerId}/images`, {
            imageData: child.content,
            componentId: child.id,
            parentId: parentId // Incluir el ID del contenedor padre
          });
          
          // Actualizar el contenido del hijo con la URL
          updateChildContent(child.id, response.data.data.url);
        } catch (error) {
          console.error(`❌ Error procesando imagen de hijo para componente ${child.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error procesando imágenes:', error);
    }
  }, [bannerConfig, updateComponentContent]);

  // Inicializar configuración - simplificada al trabajar con un solo formato
const setInitialConfig = useCallback((config, autoSelect = false) => {
  if (!config) {
    return;
  }
  
  
  // Hacer copia profunda para evitar referencias compartidas
  const processedConfig = JSON.parse(JSON.stringify(config));
  
  // Extraer y guardar información del cliente si está disponible
  if (processedConfig.clientId) {
    console.log('🏢 Cliente ID encontrado en config:', processedConfig.clientId);
    
    // Si viene con datos del cliente populated (solo para owners)
    if (processedConfig.clientId._id) {
      setClientInfo({
        clientId: processedConfig.clientId._id,
        name: processedConfig.clientId.name,
        company: processedConfig.clientId.company,
        fiscalInfo: processedConfig.clientId.fiscalInfo
      });
      console.log('✅ Información del cliente guardada desde populate:', processedConfig.clientId);
    } else {
      // Solo tenemos el ID
      setClientInfo({
        clientId: processedConfig.clientId
      });
      console.log('📝 Solo ClientId guardado:', processedConfig.clientId);
    }
  }
  
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
  
  // Cargar la configuración de traducción del banner si existe
  if (processedConfig.translationConfig) {
    console.log('🌐 ANTES de cargar - translationConfig actual:', translationConfig);
    console.log('🌐 Configuración del banner a cargar:', processedConfig.translationConfig);
    setTranslationConfig(processedConfig.translationConfig);
    console.log('🌐 Configuración de traducción cargada del banner:', processedConfig.translationConfig);
  } else {
    console.log('🌐 Banner no tiene translationConfig, usando valores por defecto');
  }
  
  
  // DESACTIVADO: Lógica que sobrescribe width del usuario según tipo de banner
  // Esta lógica estaba causando que se reseteen los width configurados por el usuario
  /*
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (normalizedConfig.layout[device]) {
      const bannerType = normalizedConfig.layout[device].type;
      
      // Solo aplicar defaults si NO hay width configurado por el usuario
      if (!normalizedConfig.layout[device].width) {
        if (bannerType === 'modal') {
          normalizedConfig.layout[device].width = '60%';
        } else if (bannerType === 'floating') {
          normalizedConfig.layout[device].width = '50%';
        } else {
          normalizedConfig.layout[device].width = '100%';
        }
      }
      
      // Solo aplicar esquina y margen para floating si no existen
      if (bannerType === 'floating') {
        if (!normalizedConfig.layout[device].floatingCorner) {
          normalizedConfig.layout[device].floatingCorner = 'bottom-right';
        }
        if (!normalizedConfig.layout[device].floatingMargin) {
          normalizedConfig.layout[device].floatingMargin = 20;
        }
      }
    }
  });
  */
  
  // Si no hay layout para tablet o mobile, copiar de desktop
  if (Object.keys(normalizedConfig.layout.tablet).length === 0) {
    normalizedConfig.layout.tablet = { ...normalizedConfig.layout.desktop };
  }
  
  if (Object.keys(normalizedConfig.layout.mobile).length === 0) {
    normalizedConfig.layout.mobile = { ...normalizedConfig.layout.desktop };
  }
  
  // NUEVA FUNCIÓN RECURSIVA para procesar componentes y sus hijos
  const processComponent = (comp, parentId = null) => {
    // Copia profunda
    const component = JSON.parse(JSON.stringify(comp));
    
    // Asegurar ID único
    if (!component.id) {
      component.id = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // IMPORTANTE: Si tiene un parentId, asegurarse de que se mantenga
    if (parentId) {
      component.parentId = parentId;
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
      
      // NOTA: Eliminada la "corrección especial" que estaba reseteando posiciones 
      // del botón de preferencias a 0,0 cuando tenía valores entre 30-60px
      
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
    
    // IMPORTANTE: Procesar hijos recursivamente si es un contenedor
    if (component.type === 'container' && component.children && component.children.length > 0) {
      
      component.children = component.children.map(child => {
        // Procesar cada hijo recursivamente, pasando el ID del padre
        const processedChild = processComponent(child, component.id);
        
        // Asegurar que el hijo tiene el parentId correcto
        processedChild.parentId = component.id;
        
        return processedChild;
      });
    }
    
    // Migrar valores antiguos de 'start' a 'flex-start' en containerConfig
    if (component.type === 'container' && component.containerConfig) {
      const migratedConfig = { ...component.containerConfig };
      
      // Migrar para cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (migratedConfig[device]) {
          const deviceConfig = { ...migratedConfig[device] };
          
          // Convertir valores antiguos a los nuevos valores válidos
          if (deviceConfig.alignItems === 'start') {
            deviceConfig.alignItems = 'flex-start';
          }
          if (deviceConfig.alignItems === 'end') {
            deviceConfig.alignItems = 'flex-end';
          }
          if (deviceConfig.justifyItems === 'start') {
            deviceConfig.justifyItems = 'flex-start';
          }
          if (deviceConfig.justifyItems === 'end') {
            deviceConfig.justifyItems = 'flex-end';
          }
          
          migratedConfig[device] = deviceConfig;
        }
      });
      
      component.containerConfig = migratedConfig;
    }
    
    return component;
  };
  
  // Normalizar componentes usando la nueva función recursiva
  if (Array.isArray(processedConfig.components)) {
    normalizedConfig.components = processedConfig.components.map(comp => processComponent(comp));
  }
  
  setBannerConfig(normalizedConfig);
  
  // NUEVO: Procesar estilos de imágenes inmediatamente después de cargar la configuración
  setTimeout(() => {
    const processImageStylesOnLoad = () => {
      let hasChanges = false;
      const updatedConfig = { ...normalizedConfig };
      
      // Procesar imágenes en componentes principales
      updatedConfig.components.forEach(comp => {
        if (comp.type === 'image') {
          // Process image styles if needed
        }
        
        // Procesar imágenes dentro de contenedores
        if (comp.type === 'container' && comp.children) {
          comp.children.forEach(child => {
            if (child.type === 'image') {
              // Process child image styles if needed
            }
          });
        }
      });
      
      // Si hubo cambios, actualizar la configuración
      if (hasChanges) {
        setBannerConfig(updatedConfig);
      }
    };
    
    processImageStylesOnLoad();
  }, 150); // Delay ligeramente mayor para asegurar que el DOM esté listo
  
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
      
      // 🔧 ARREGLO: Detectar si es componente hijo y usar la función correcta
      const allComponents = getAllComponentsFlattened();
      const component = allComponents.find(comp => comp.id === componentId);
      const isChild = component && !!component.parentId;
      
      if (isChild) {
        updateChildContent(componentId, imageUrl);
      } else {
        updateComponentContent(componentId, imageUrl);
      }
      
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
      
      
      // Enviar al servidor usando axios
      const response = await axios.post(
        `/api/v1/banner-templates/${bannerConfig._id}/images`,
        {
          imageData: base64Data,
          componentId
        }
      );
      
      const imageUrl = response.data.data.url;
      
      // 🔧 ARREGLO: Detectar si es componente hijo y usar la función correcta
      const allComponents = getAllComponentsFlattened();
      const component = allComponents.find(comp => comp.id === componentId);
      const isChild = component && !!component.parentId;
      
      if (isChild) {
        updateChildContent(componentId, imageUrl);
      } else {
        updateComponentContent(componentId, imageUrl);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('❌ Error subiendo imagen base64:', error);
      return null;
    }
  }, [bannerConfig._id, updateComponentContent]);
  
  // Función para recopilar todos los archivos temporales del banner
  const collectImageFiles = useCallback(() => {
    const imageFiles = new Map();
    
    console.log('🔍 COLLECT: Iniciando recolección de archivos de imagen...');
    console.log('🔍 COLLECT: Estado actual de bannerConfig.components:', bannerConfig.components);
    
    // Función recursiva para buscar referencias temporales
    const collectImageRefs = (components, level = 0) => {
      if (!components || !Array.isArray(components)) {
        console.log(`⚠️ COLLECT: Componentes no válidos en nivel ${level}:`, components);
        return;
      }
      
      console.log(`🔍 COLLECT: Procesando ${components.length} componentes en nivel ${level}`);
      
      for (const comp of components) {
        console.log(`📋 COLLECT: Revisando componente ${comp.id} de tipo ${comp.type} en nivel ${level}`);
        
        if (comp.type === 'image') {
          console.log(`🖼️ COLLECT: Componente imagen encontrado con contenido: ${comp.content}`);
          
          // MÉTODO MEJORADO: Buscar imágenes temporales de múltiples formas
          let hasTemporaryImage = false;
          let imageRef = null;
          
          // Opción 1: Content es una referencia temporal
          if (typeof comp.content === 'string' && comp.content.startsWith('__IMAGE_REF__')) {
            hasTemporaryImage = true;
            imageRef = comp.content;
            console.log(`📂 COLLECT: Imagen temporal detectada por content: ${imageRef}`);
          }
          
          // Opción 2: Componente tiene _previewUrl en algún dispositivo (imagen recién subida)
          if (!hasTemporaryImage && comp.style) {
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (!hasTemporaryImage && comp.style[device]?._previewUrl) {
                // Si _previewUrl es diferente de content Y content no es una ruta del servidor, es temporal
                const isServerPath = typeof comp.content === 'string' && comp.content.startsWith('/templates/images/');
                if (comp.style[device]._previewUrl !== comp.content && !isServerPath) {
                  hasTemporaryImage = true;
                  // Buscar el imageRef asociado en window._imageFiles
                  if (window._imageFiles) {
                    for (const [ref, file] of Object.entries(window._imageFiles)) {
                      if (ref.includes(comp.id)) {
                        imageRef = ref;
                        console.log(`📂 COLLECT: Imagen temporal detectada por _previewUrl en ${device}, ref encontrado: ${imageRef}`);
                        break;
                      }
                    }
                  }
                  // Si no encontramos ref pero tenemos el archivo en _tempFile, usarlo
                  if (!imageRef && comp.style[device]._tempFile) {
                    // Buscar cualquier clave que contenga el componentId
                    if (window._imageFiles) {
                      for (const [ref, file] of Object.entries(window._imageFiles)) {
                        if (ref.includes(comp.id) && file === comp.style[device]._tempFile) {
                          imageRef = ref;
                          console.log(`📂 COLLECT: Ref encontrado por matching de archivo: ${imageRef}`);
                          break;
                        }
                      }
                    }
                  }
                  
                  // Si aún no encontramos ref, crear uno basado en el componente
                  if (!imageRef) {
                    imageRef = `__IMAGE_REF__${comp.id}_${Date.now()}`;
                    console.log(`📂 COLLECT: Imagen temporal detectada por _previewUrl en ${device}, ref generado: ${imageRef}`);
                    // Registrar el archivo en window._imageFiles para poder encontrarlo
                    if (comp.style[device]._tempFile && window._imageFiles) {
                      window._imageFiles[imageRef] = comp.style[device]._tempFile;
                      console.log(`📂 COLLECT: Archivo registrado en window._imageFiles: ${imageRef}`);
                    }
                  }
                }
              }
            });
          }
          
          if (hasTemporaryImage && imageRef) {
            console.log(`📂 COLLECT: Procesando imagen temporal con ref: ${imageRef}`);
            console.log(`📂 COLLECT: Estado del componente:`, {
              id: comp.id,
              content: comp.content,
              imageRef: imageRef,
              hasImageFile: !!comp._imageFile,
              hasTempFile: !!comp._tempFile
            });
            
            // MÉTODO 1: Buscar en window._imageFiles usando imageRef
            console.log(`🔍 COLLECT: Buscando en window._imageFiles con clave: "${imageRef}"`);
            console.log(`🔍 COLLECT: window._imageFiles disponible:`, window._imageFiles);
            console.log(`🔍 COLLECT: Claves en window._imageFiles:`, window._imageFiles ? Object.keys(window._imageFiles) : 'no existe');
            
            if (window._imageFiles && window._imageFiles[imageRef]) {
              console.log(`✅ COLLECT: Archivo encontrado en window._imageFiles para ${imageRef}`);
              imageFiles.set(imageRef, window._imageFiles[imageRef]);
              continue;
            } else {
              console.log(`❌ COLLECT: No encontrado en window._imageFiles con ${imageRef}`);
              
              // BÚSQUEDA ALTERNATIVA: Buscar claves que contengan el componentId
              if (window._imageFiles) {
                const availableKeys = Object.keys(window._imageFiles);
                const similarKeys = availableKeys.filter(key => 
                  key.includes(comp.id) || key.includes(imageRef.replace('__IMAGE_REF__', ''))
                );
                console.log(`🔍 COLLECT: Claves similares encontradas:`, similarKeys);
                
                // Si encontramos una clave similar, usarla
                if (similarKeys.length > 0) {
                  const matchedKey = similarKeys[0];
                  console.log(`✅ COLLECT: Usando clave similar: ${matchedKey} para imageRef: ${imageRef}`);
                  imageFiles.set(imageRef, window._imageFiles[matchedKey]);
                  continue;
                }
              }
            }
            
            // MÉTODO 2: Buscar en imageMemoryManager (respaldo)
            try {
              const fileData = imageMemoryManager.getTempFile(imageRef);
              if (fileData && fileData.file) {
                console.log(`✅ COLLECT: Archivo encontrado en imageMemoryManager para ${imageRef}`);
                imageFiles.set(imageRef, fileData.file);
                continue;
              } else {
                console.log(`❌ COLLECT: No encontrado en imageMemoryManager`);
              }
            } catch (error) {
              console.warn(`⚠️ COLLECT: Error accediendo imageMemoryManager para ${imageRef}:`, error);
            }
            
            // MÉTODO 3: Buscar en el componente mismo
            if (comp._imageFile && (comp._imageFile instanceof File || comp._imageFile instanceof Blob)) {
              console.log(`✅ COLLECT: Archivo encontrado en comp._imageFile para ${imageRef}`);
              imageFiles.set(imageRef, comp._imageFile);
              continue;
            }
            
            // MÉTODO 4: Buscar en estilos del componente (NUEVA LÓGICA)
            if (comp.style) {
              let foundInStyle = false;
              ['desktop', 'tablet', 'mobile'].forEach(device => {
                if (!foundInStyle && comp.style[device]?._tempFile) {
                  const styleFile = comp.style[device]._tempFile;
                  if (styleFile instanceof File || styleFile instanceof Blob) {
                    console.log(`✅ COLLECT: Archivo encontrado en style.${device}._tempFile para ${imageRef}`);
                    imageFiles.set(imageRef, styleFile);
                    foundInStyle = true;
                  }
                }
              });
              if (foundInStyle) continue;
            }
            
            console.warn(`❌ COLLECT: No se encontró archivo para ${imageRef}`);
          }
        }
        
        // Revisar hijos recursivamente
        if (comp.children && Array.isArray(comp.children)) {
          console.log(`📁 COLLECT: Componente ${comp.id} tiene ${comp.children.length} hijos`);
          // DEBUG ESPECÍFICO: Log detallado para imágenes en contenedores
          const imageChildren = comp.children.filter(child => child.type === 'image');
          if (imageChildren.length > 0) {
            console.log(`🔍 COLLECT: Encontradas ${imageChildren.length} imágenes dentro del contenedor ${comp.id}:`, 
              imageChildren.map(child => ({
                id: child.id,
                content: child.content,
                hasParentId: !!child.parentId,
                parentId: child.parentId || 'NO_PARENT_ID'
              }))
            );
          }
          collectImageRefs(comp.children, level + 1);
        }
      }
    };
    
    // Recopilar todas las referencias de imagen
    collectImageRefs(bannerConfig.components);
    
    console.log(`📊 COLLECT: Total de archivos recolectados: ${imageFiles.size}`);
    imageFiles.forEach((file, ref) => {
      console.log(`  - ${ref}: ${file.name} (${file.size} bytes)`);
    });
    
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
  
  // FUNCIONES PARA EL PANEL DE CAPAS
  
  // Toggle visibilidad de componente
  const handleToggleComponentVisibility = useCallback((componentId) => {
    setBannerConfig(prev => {
      // Función recursiva para actualizar el componente donde sea que esté
      const updateComponentRecursively = (components) => {
        return components.map(comp => {
          if (comp.id === componentId) {
            return {
              ...comp,
              visible: comp.visible === false ? true : false
            };
          }
          // Si es un contenedor, buscar en sus hijos
          if (comp.type === 'container' && comp.children) {
            return {
              ...comp,
              children: updateComponentRecursively(comp.children)
            };
          }
          return comp;
        });
      };
      
      const newComponents = updateComponentRecursively(prev.components);
      
      return {
        ...prev,
        components: newComponents
      };
    });
  }, []);
  
  // Toggle bloqueo de componente
  const handleToggleComponentLock = useCallback((componentId) => {
    setBannerConfig(prev => {
      // Función recursiva para actualizar el componente donde sea que esté
      const updateComponentRecursively = (components) => {
        return components.map(comp => {
          if (comp.id === componentId) {
            return {
              ...comp,
              locked: comp.locked === true ? false : true
            };
          }
          // Si es un contenedor, buscar en sus hijos
          if (comp.type === 'container' && comp.children) {
            return {
              ...comp,
              children: updateComponentRecursively(comp.children)
            };
          }
          return comp;
        });
      };
      
      const newComponents = updateComponentRecursively(prev.components);
      
      return {
        ...prev,
        components: newComponents
      };
    });
  }, []);
  
  // Renombrar componente
  const handleRenameComponent = useCallback((componentId, newName) => {
    setBannerConfig(prev => {
      // Función recursiva para actualizar el componente donde sea que esté
      const updateComponentRecursively = (components) => {
        return components.map(comp => {
          if (comp.id === componentId) {
            return {
              ...comp,
              name: newName
            };
          }
          // Si es un contenedor, buscar en sus hijos
          if (comp.type === 'container' && comp.children) {
            return {
              ...comp,
              children: updateComponentRecursively(comp.children)
            };
          }
          return comp;
        });
      };
      
      const newComponents = updateComponentRecursively(prev.components);
      
      return {
        ...prev,
        components: newComponents
      };
    });
  }, []);
  
  // Reordenar componentes (cambiar z-index)
  const handleReorderComponents = useCallback((sourceIndex, targetIndex) => {
    setBannerConfig(prev => {
      const newComponents = [...prev.components];
      
      // Validar índices
      if (sourceIndex < 0 || sourceIndex >= newComponents.length ||
          targetIndex < 0 || targetIndex > newComponents.length) {
        console.error('❌ Indices inválidos para reordenamiento');
        return prev;
      }
      
      // Extraer el componente del índice fuente
      const [movedComponent] = newComponents.splice(sourceIndex, 1);
      
      // Ajustar el índice target si es necesario
      let adjustedTargetIndex = targetIndex;
      if (sourceIndex < targetIndex) {
        adjustedTargetIndex = targetIndex - 1;
      }
      
      // Insertar en la nueva posición
      newComponents.splice(adjustedTargetIndex, 0, movedComponent);
      
      return {
        ...prev,
        components: newComponents
      };
    });
  }, []);

  // Eliminar componente desde el panel de capas - lógica inteligente
  const handleDeleteComponent = useCallback((componentId) => {
    // Buscar el componente recursivamente
    const findComponent = (components, id, parentId = null) => {
      for (const comp of components) {
        if (comp.id === id) {
          return { component: comp, parentId };
        }
        if (comp.children) {
          const found = findComponent(comp.children, id, comp.id);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findComponent(bannerConfig.components, componentId);
    if (!result) {
      console.warn(`Componente ${componentId} no encontrado`);
      return;
    }

    const { component, parentId } = result;

    // Si es un componente esencial, moverlo fuera del contenedor en lugar de eliminarlo
    const isEssential = component.locked && component.action && 
      ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type);

    if (isEssential && parentId) {
      moveComponentOutOfContainer(componentId, parentId);
    } else if (parentId) {
      // Si está en un contenedor y no es esencial, eliminar del contenedor
      deleteChildComponent(componentId);
    } else {
      // Si es un componente raíz y no es esencial, eliminar completamente
      deleteComponent(componentId);
    }
  }, [bannerConfig.components, moveComponentOutOfContainer, deleteChildComponent, deleteComponent]);

  // Función mejorada para mover entre contenedores con validación
  const handleMoveToContainer = useCallback((sourceId, targetId) => {
    
    // Validar el movimiento
    const validation = validateContainerMove(sourceId, targetId);
    if (!validation.valid) {
      console.error('❌ Movimiento inválido:', validation.reason);
      // Aquí podrías mostrar un toast o notificación al usuario
      return false;
    }

    // Realizar el movimiento
    moveComponentToContainer(sourceId, targetId);
    return true;
  }, [validateContainerMove, moveComponentToContainer]);

  // Función para obtener información del componente para el panel de capas
  const getComponentInfo = useCallback((componentId) => {
    const findComponent = (components, id, parentId = null, depth = 0) => {
      for (const comp of components) {
        if (comp.id === id) {
          return {
            component: comp,
            parentId,
            depth,
            isEssential: comp.locked && comp.action && 
              ['accept_all', 'reject_all', 'show_preferences'].includes(comp.action.type)
          };
        }
        if (comp.children) {
          const found = findComponent(comp.children, id, comp.id, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };

    return findComponent(bannerConfig.components, componentId);
  }, [bannerConfig.components]);

  // Función auxiliar para obtener la jerarquía completa
  const getComponentHierarchy = useCallback(() => {
    const buildHierarchy = (components, depth = 0) => {
      return components.map(comp => ({
        ...comp,
        depth,
        hasChildren: comp.children && comp.children.length > 0,
        isEssential: comp.locked && comp.action && 
          ['accept_all', 'reject_all', 'show_preferences'].includes(comp.action.type),
        children: comp.children ? buildHierarchy(comp.children, depth + 1) : []
      }));
    };

    return buildHierarchy(bannerConfig.components);
  }, [bannerConfig.components]);
  
  // Función para actualizar dinámicamente la razón social en componentes de texto legal
  const updateCompanyName = useCallback((newCompanyName) => {
    setBannerConfig(prev => {
      const updateComponentsRecursively = (components) => {
        return components.map(comp => {
          // Si el componente es de tipo text y tiene contenido
          if (comp.type === 'text' && comp.content) {
            let updatedContent = comp.content;
            let hasCompanyReference = false;
            
            // Caso 1: Contenido es string simple
            if (typeof comp.content === 'string') {
              const originalText = comp.content;
              // Buscar referencias a empresa en español: "de NAT21, S.L." o similares
              const companyPattern = /\bde\s+[A-Z][A-Za-z0-9\s,\.]+(?:S\.?L\.?|S\.?A\.?|Inc\.?|Ltd\.?|LLC|Corp\.?)\b/gi;
              
              if (companyPattern.test(originalText)) {
                hasCompanyReference = true;
                updatedContent = originalText.replace(
                  /\bde\s+[A-Z][A-Za-z0-9\s,\.]+(?:S\.?L\.?|S\.?A\.?|Inc\.?|Ltd\.?|LLC|Corp\.?)\b/gi,
                  `de ${newCompanyName || '{razonSocial}'}`
                );
              }
            }
            // Caso 2: Contenido es objeto con texts
            else if (typeof comp.content === 'object' && comp.content.texts) {
              const updatedTexts = {};
              
              Object.keys(comp.content.texts).forEach(lang => {
                const originalText = comp.content.texts[lang];
                const companyPattern = /\bde\s+[A-Z][A-Za-z0-9\s,\.]+(?:S\.?L\.?|S\.?A\.?|Inc\.?|Ltd\.?|LLC|Corp\.?)\b/gi;
                
                if (companyPattern.test(originalText)) {
                  hasCompanyReference = true;
                  updatedTexts[lang] = originalText.replace(
                    /\bde\s+[A-Z][A-Za-z0-9\s,\.]+(?:S\.?L\.?|S\.?A\.?|Inc\.?|Ltd\.?|LLC|Corp\.?)\b/gi,
                    `de ${newCompanyName || '{razonSocial}'}`
                  );
                }
              });
              
              if (hasCompanyReference) {
                updatedContent = {
                  ...comp.content,
                  texts: {
                    ...comp.content.texts,
                    ...updatedTexts
                  }
                };
              }
            }
            
            // Si encontramos referencias a empresa, actualizar el componente
            if (hasCompanyReference) {
              return {
                ...comp,
                content: updatedContent
              };
            }
          }
          
          // Si es un contenedor, procesar recursivamente sus hijos
          if (comp.type === 'container' && comp.children && comp.children.length > 0) {
            return {
              ...comp,
              children: updateComponentsRecursively(comp.children)
            };
          }
          
          return comp;
        });
      };
      
      return {
        ...prev,
        components: updateComponentsRecursively(prev.components),
        clientInfo: {
          ...prev.clientInfo,
          companyName: newCompanyName
        }
      };
    });
  }, []);

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
    moveComponentToContainer, // NUEVA FUNCIÓN - FASE 4: Mover componente existente a contenedor
    moveComponentOutOfContainer, // NUEVA FUNCIÓN: Sacar componente de contenedor
    attachToContainer, // 🎯 NUEVA FUNCIÓN: Adjuntar componente a contenedor de forma simple
    reorderContainerChildren, // NUEVA FUNCIÓN - FASE 4: Reordenar hijos de contenedor
    // NUEVAS FUNCIONES para componentes hijos
    deleteChildComponent, // Eliminar componente hijo
    removeChildFromContainer, // NUEVA: Remover hijo de contenedor (hacerlo independiente)
    unattachFromContainer, // NUEVA: Desadjuntar componente de contenedor
    updateChildContent, // Actualizar contenido de componente hijo
    updateChildStyleForDevice, // Actualizar estilo de componente hijo
    updateChildPositionForDevice, // Actualizar posición de componente hijo
    updateChildPosition, // NUEVA FUNCIÓN - FASE 4: Actualizar posición de componente hijo
    handleUpdateLayoutForDevice,
    handleBatchUpdateLayoutForDevice, // NUEVA FUNCIÓN: Actualizar múltiples componentes para un dispositivo específico
    isPreferencesMode,
    setIsPreferencesMode,
    previewData,
    previewLoading,
    previewError,
    isAutoTranslating,
    // Configuración de traducción
    translationConfig,
    updateTranslationConfig,
    setSourceLanguage,
    setTargetLanguages,
    toggleAutoTranslate,
    handlePreview,
    handleSave,
    handleUpdate,
    deviceView,
    setDeviceView,
    showPreview,
    setShowPreview,
    // Nuevas funciones de validación
    validateRequiredButtons,
    validateComponentBounds, // NUEVA: Validar límites de componentes en contenedores
    getActionDisplayName,
    generateLocalPreview,
    processImages,
    handleImageUpload,
    handleImageBase64Upload,
    collectImageFiles, // Nueva función para recopilar archivos de imágenes
    updateCompanyName, // Nueva función para actualizar razón social dinámicamente
    getAllComponentsFlattened, // NUEVA FUNCIÓN - FASE 4: Para validación de anidamiento
    // Funciones para el panel de capas
    handleToggleComponentVisibility,
    handleToggleComponentLock,
    handleRenameComponent,
    handleReorderComponents,
    handleDeleteComponent,
    handleMoveToContainer,
    validateContainerMove,
    getComponentInfo,
    getComponentHierarchy,
    // 🔄 INTEGRACIÓN: Función para actualizaciones directas desde DimensionManager
    updateDimensionFromManager
  };
}